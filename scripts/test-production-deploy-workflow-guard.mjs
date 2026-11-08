#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertProductionProject } from "./verify-production-project.mjs";
import { isStableReleaseVersion } from "./verify-production-cutover.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflow = fs.readFileSync(path.join(ROOT, ".github/workflows/deploy-production.yml"), "utf8");
const release = JSON.parse(fs.readFileSync(path.join(ROOT, "release.json"), "utf8"));
const verifier = fs.readFileSync(path.join(ROOT, "scripts/verify-production-project.mjs"), "utf8");
const build = fs.readFileSync(path.join(ROOT, "scripts/build.mjs"), "utf8");

assert.match(workflow, /^on:\n  workflow_dispatch:\s*$/m,
  "production deployment must remain manual-only");
assert.doesNotMatch(workflow, /^  (push|pull_request):/m,
  "production deployment must not run automatically on pushes or pull requests");
assert.match(workflow,
  /name: Checkout exact release commit\n\s+uses: actions\/checkout@[0-9a-f]{40}\n\s+with:\n\s+ref: \$\{\{ github\.sha \}\}\n\s+persist-credentials: false/,
  "production deployment must check out the exact dispatch SHA without persisting credentials");
assert.match(workflow,
  /name: Require master ref and exact checkout SHA[\s\S]*?refs\/heads\/master[\s\S]*?git rev-parse HEAD[\s\S]*?GITHUB_SHA/,
  "production deployment must require master and verify the checked-out SHA");
assert.match(workflow, /EXPECTED_PRODUCTION_PROJECT_ID: dlfvkawaiqduhlazsszm/,
  "production project reference must be explicit and pinned");
assert.match(workflow, /EXPECTED_ISOLATED_SIGNALING_PROJECT_ID: bfpjtfqlnypisxljoxkb/,
  "isolated signaling project reference must be explicitly rejected");
assert.match(workflow, /EXPECTED_SUPABASE_ORGANIZATION_ID: bcjtvojfkfoxvsitzmkl/,
  "production project must be verified against the UpStatus organization");
assert.match(workflow, /node scripts\/verify-production-project\.mjs/,
  "read-only Management API project preflight must run before deployment");
assert.match(workflow,
  /name: Require coordinated production API cutover\n\s+run: node scripts\/verify-production-cutover\.mjs --enforce[\s\S]*?name: Verify production project with Supabase Management API/,
  "production deployment must fail closed until the API runtime and distribution runtime are deployed together");
assert.match(workflow, /version: 2\.122\.1/,
  "Supabase CLI must be pinned to the validated version");
assert.doesNotMatch(workflow, /version:\s*latest/,
  "production deployment must not float to an unreviewed CLI version");
const apiDeployCommand = 'supabase functions deploy upstatus-screen-share-3-1-1-beta10 --project-ref "$SUPABASE_PROJECT_ID" --use-api';
const distributionDeployCommand = 'supabase functions deploy upstatus --project-ref "$SUPABASE_PROJECT_ID" --use-api';
const apiDeployIndex = workflow.indexOf(apiDeployCommand);
const distributionDeployIndex = workflow.indexOf(distributionDeployCommand);
assert(apiDeployIndex >= 0, "workflow must deploy the production API runtime");
assert(distributionDeployIndex > apiDeployIndex, "workflow must deploy the API runtime before the userscript distribution function");
assert.equal((workflow.match(/supabase functions deploy [a-z0-9-]+/g) || []).length, 2,
  "production workflow must deploy exactly the API and distribution runtimes");
assert.match(build, /const PROD_API_FUNCTION="upstatus-screen-share-3-1-1-beta10"/,
  "build must generate the same production API runtime that the workflow deploys");
assert.doesNotMatch(workflow, /supabase functions deploy upstatus-test/,
  "production workflow must never deploy the TEST function");
assert.doesNotMatch(workflow, /supabase\s+(?:db\s+push|migration\s+up)/,
  "production workflow must never apply database migrations automatically");
assert.match(workflow, /group: upstatus-production-deploy[\s\S]*?cancel-in-progress: false/,
  "production deployments must be serialized without cancelling an active deployment");
assert.match(workflow, /timeout-minutes: 15/,
  "production deployment must have a bounded job timeout");
assert.equal(release.version, "3.4.7", "candidate must retain the currently deployed version until a release version is explicitly selected");
assert.equal(String(release.preRelease || ""), "", "production release candidate must not carry a prerelease label");
assert.equal(isStableReleaseVersion(release.version, release.preRelease), false, "the current release.json must remain blocked from production");
assert.equal(isStableReleaseVersion("3.4.8", ""), true, "a new stable patch version must be eligible");
assert.equal(isStableReleaseVersion("3.4.7", ""), false, "the deployed version must not be reused");
assert.equal(isStableReleaseVersion("3.4.8", "rc.1"), false, "a prerelease must not be eligible");
assert.equal(workflow.includes("version !== '3.4.7'"), false, "workflow must delegate version readiness to the cutover guard");

const accessTokenBindings = workflow.match(/^\s{10}SUPABASE_ACCESS_TOKEN: \$\{\{ secrets\.SUPABASE_ACCESS_TOKEN \}\}$/gm) || [];
const projectIdBindings = workflow.match(/^\s{10}SUPABASE_PROJECT_ID: \$\{\{ secrets\.SUPABASE_PROJECT_ID \}\}$/gm) || [];
assert.equal(accessTokenBindings.length, 2, "production access token must be scoped only to preflight and deploy steps");
assert.equal(projectIdBindings.length, 2, "production project secret must be scoped only to preflight and deploy steps");
assert.doesNotMatch(workflow, /^      SUPABASE_ACCESS_TOKEN:/m, "production access token must not be exposed at job scope");
assert.doesNotMatch(workflow, /^      SUPABASE_PROJECT_ID:/m, "production project secret must not be exposed at job scope");

assert.match(verifier, /method: "GET"/, "production metadata preflight must be read-only");
assert.match(verifier, /AbortSignal\.timeout\(15000\)/, "production metadata preflight must have a bounded timeout");
assert.match(verifier, /assertProductionProject\(project, expectedProductionRef, expectedOrganizationId\)/,
  "production metadata response must be checked before deployment");

const expectedRef = "dlfvkawaiqduhlazsszm";
const expectedOrganizationId = "bcjtvojfkfoxvsitzmkl";
const validProject = {
  id: expectedRef,
  organization_id: expectedOrganizationId,
  status: "ACTIVE_HEALTHY",
  database: { host: "db." + expectedRef + ".supabase.co" },
};
assert.doesNotThrow(() => assertProductionProject(validProject, expectedRef, expectedOrganizationId));
assert.throws(
  () => assertProductionProject({ ...validProject, id: "bfpjtfqlnypisxljoxkb" }, expectedRef, expectedOrganizationId),
  /reference does not match/,
);
assert.throws(
  () => assertProductionProject({ ...validProject, organization_id: "aaaaaaaaaaaaaaaaaaaa" }, expectedRef, expectedOrganizationId),
  /not owned by the expected/,
);
assert.throws(
  () => assertProductionProject({ ...validProject, status: "INACTIVE" }, expectedRef, expectedOrganizationId),
  /must be ACTIVE_HEALTHY/,
);
assert.throws(
  () => assertProductionProject({ ...validProject, database: { host: "db.bfpjtfqlnypisxljoxkb.supabase.co" } }, expectedRef, expectedOrganizationId),
  /database host does not match/,
);
assert.throws(
  () => assertProductionProject({ ...validProject, database: null }, expectedRef, expectedOrganizationId),
  /database host does not match/,
);

console.log("PASS production deploy is manual-only, master/SHA-pinned, organization/project-verified, CLI-pinned, serialized, limited to the two approved runtimes, and never applies migrations.");
