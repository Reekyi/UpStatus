#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  assertAuthorizedReleaseApproval,
  assertMergedReleasePullRequest,
  assertNormalProductionMainBranch,
  assertNormalProductionProject,
  assertNormalReleaseManifest,
  assertReleaseGateAttestations,
  MAX_RELEASE_ATTESTATION_AGE_MS,
  assertRequiredNormalProductionMigrations,
  assertSuccessfulReleaseChecks,
  REQUIRED_PRODUCTION_MIGRATIONS,
  REQUIRED_RELEASE_CHECKS,
} from "./normal-production-dispatcher.mjs";

const workflow = fs.readFileSync(".github/workflows/deploy-production.yml", "utf8");
const helperSource = fs.readFileSync("scripts/normal-production-dispatcher.mjs", "utf8");
assert.match(workflow, /^name: UpStatus Normal Production Dispatcher$/m);
assert.match(workflow, /^  workflow_dispatch:/m);
assert.match(workflow, /operation:[\s\S]*?options:[\s\S]*?- release[\s\S]*?- rollback/);
assert.match(workflow, /release_sha:[\s\S]*?required: true[\s\S]*?type: string/);
assert.match(workflow, /approved_pr_number:[\s\S]*?required: true[\s\S]*?type: number/);
assert.match(workflow, /release_version:[\s\S]*?required: true[\s\S]*?type: string/);
assert.match(workflow, /confirm_production_action:[\s\S]*?required: true[\s\S]*?default: false/);
assert.match(workflow, /branches:[\s\S]*?- master[\s\S]*?- fix\/master-normal-dual-runtime-dispatcher-20261111/);
assert.match(helperSource, /REQUIRED_RELEASE_CHECKS = Object\.freeze\(\["offline_guard", "validate"\]\)/);
assert.match(workflow, /commits\/\$RELEASE_SHA\/check-runs\?per_page=100/);
assert.doesNotMatch(workflow, /commits\/\$pr_head_sha\/check-runs/);
assert.match(helperSource, /assertSuccessfulReleaseChecks\(checks, \{ releaseSha \}\)/);
assert.match(workflow, /permissions:[\s\S]*?contents: read[\s\S]*?pull-requests: read[\s\S]*?checks: read/);
assert.match(workflow, /offline_guard:[\s\S]*?if: github\.event_name != 'workflow_dispatch'/);
assert.match(workflow, /deploy:[\s\S]*?if: github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/master' && inputs\.confirm_production_action == true/);
assert.match(workflow, /environment: production/);
assert.match(workflow, /UPSTATUS_RELEASE_REVIEWERS:[\s\S]*?vars\.UPSTATUS_RELEASE_REVIEWERS/);
assert.match(workflow, /UPSTATUS_CURRENT_NORMAL_VERSION:[\s\S]*?vars\.UPSTATUS_CURRENT_NORMAL_VERSION/);
assert.match(workflow, /UPSTATUS_NORMAL_ROLLBACK_SHAS:[\s\S]*?vars\.UPSTATUS_NORMAL_ROLLBACK_SHAS/);
assert.match(workflow, /UPSTATUS_NORMAL_RELEASE_GATES_ACKNOWLEDGED_SHA:[\s\S]*?vars\.UPSTATUS_NORMAL_RELEASE_GATES_ACKNOWLEDGED_SHA/);
assert.match(workflow, /UPSTATUS_NORMAL_RELEASE_GATES_ACKNOWLEDGED_AT:[\s\S]*?vars\.UPSTATUS_NORMAL_RELEASE_GATES_ACKNOWLEDGED_AT/);
assert.match(workflow, /UPSTATUS_NORMAL_PHYSICAL_ACCEPTANCE_SHA:[\s\S]*?vars\.UPSTATUS_NORMAL_PHYSICAL_ACCEPTANCE_SHA/);
assert.match(workflow, /UPSTATUS_NORMAL_PHYSICAL_ACCEPTANCE_AT:[\s\S]*?vars\.UPSTATUS_NORMAL_PHYSICAL_ACCEPTANCE_AT/);
assert.match(workflow, /verify-attestations/);
assert.doesNotMatch(workflow, /UPSTATUS_NORMAL_RELEASE_GATES_ACKNOWLEDGED:/);
assert.doesNotMatch(workflow, /UPSTATUS_NORMAL_PHYSICAL_ACCEPTANCE:/);
assert.match(workflow, /EXPECTED_PRODUCTION_PROJECT_ID: dlfvkawaiqduhlazsszm/);
assert.match(helperSource, /api\.supabase\.com\/v1\/projects/);
assert.match(helperSource, /\/branches/);
assert.match(helperSource, /\/database\/migrations/);
assert.match(helperSource, /ACTIVE_HEALTHY/);
assert.match(workflow, /version: 2\.122\.1/);
assert.doesNotMatch(workflow, /version:\s*latest/);
assert.match(workflow, /verify-review/);
assert.match(workflow, /verify-release/);
assert.match(workflow, /preflight/);
assert.match(workflow, /git merge-base --is-ancestor/);
assert.match(workflow, /Recheck master HEAD immediately before deployment/);
assert.doesNotMatch(workflow, /supabase\s+(?:db\s+push|migration\s+up|db\s+reset)/);
assert.doesNotMatch(workflow, /^  (?:schedule|workflow_run):/m);

const deployCommands = workflow.match(/^\s*run: supabase functions deploy .+$/gm) || [];
assert.equal(deployCommands.length, 2, "Normal dispatcher must deploy exactly the API and distribution functions.");
assert.match(deployCommands[0], /upstatus-screen-share-3-1-1-beta10/);
assert.match(deployCommands[1], /upstatus --project-ref/);
assert.doesNotMatch(workflow, /supabase functions deploy (?:--no-verify-jwt )?upstatus-team-lite/);
assert.doesNotMatch(workflow, /supabase functions deploy .*upstatus-test|upstatus-signal/);
assert.ok(workflow.indexOf("Deploy Normal API runtime first") < workflow.indexOf("Deploy Normal userscript distribution second"));

const buildSource = [
  'const PROJECT="dlfvkawaiqduhlazsszm";',
  'const PROD_FUNCTION="upstatus";',
  'const PROD_API_FUNCTION="upstatus-screen-share-3-1-1-beta10";',
  "writeFunction(PROD_FUNCTION,renderFunction",
  "writeFunction(PROD_API_FUNCTION,renderFunction",
].join("\n");
const configText = ["[functions.upstatus]", "verify_jwt = false", "", "[functions.upstatus-screen-share-3-1-1-beta10]", "verify_jwt = false", ""].join("\n");
const baseRelease = {
  version: "3.4.8",
  preRelease: "",
  scriptUrl: "https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus/upstatus.user.js",
};
assert.deepEqual(
  assertNormalReleaseManifest({
    release: baseRelease, buildSource, configText, requestedVersion: "3.4.8",
    operation: "release", currentVersion: "3.4.7", releaseSha: "a".repeat(40), rollbackShas: "",
  }),
  { version: "3.4.8", operation: "release" },
);
assert.throws(() => assertNormalReleaseManifest({
  release: { ...baseRelease, version: "3.4.7" }, buildSource, configText, requestedVersion: "3.4.7",
  operation: "release", currentVersion: "3.4.7", releaseSha: "a".repeat(40), rollbackShas: "",
}), /must be newer/);
assert.throws(() => assertNormalReleaseManifest({
  release: { ...baseRelease, preRelease: "rc1" }, buildSource, configText, requestedVersion: "3.4.8",
  operation: "release", currentVersion: "3.4.7", releaseSha: "a".repeat(40), rollbackShas: "",
}), /stable Normal release/);
assert.throws(() => assertNormalReleaseManifest({
  release: { ...baseRelease, scriptUrl: "https://example.invalid/upstatus.user.js" }, buildSource, configText, requestedVersion: "3.4.8",
  operation: "release", currentVersion: "3.4.7", releaseSha: "a".repeat(40), rollbackShas: "",
}), /scriptUrl/);
assert.deepEqual(
  assertNormalReleaseManifest({
    release: { ...baseRelease, version: "3.4.7" }, buildSource, configText, requestedVersion: "3.4.7",
    operation: "rollback", currentVersion: "3.4.8", releaseSha: "b".repeat(40), rollbackShas: "b".repeat(40),
  }),
  { version: "3.4.7", operation: "rollback" },
);
assert.throws(() => assertNormalReleaseManifest({
  release: { ...baseRelease, version: "3.4.7" }, buildSource, configText, requestedVersion: "3.4.7",
  operation: "rollback", currentVersion: "3.4.8", releaseSha: "b".repeat(40), rollbackShas: "",
}), /UPSTATUS_NORMAL_ROLLBACK_SHAS/);

const project = {
  id: "dlfvkawaiqduhlazsszm",
  organization_id: "bcjtvojfkfoxvsitzmkl",
  status: "ACTIVE_HEALTHY",
  database: { host: "db.dlfvkawaiqduhlazsszm.supabase.co" },
};
assert.equal(assertNormalProductionProject(project, "dlfvkawaiqduhlazsszm", "bcjtvojfkfoxvsitzmkl", "bfpjtfqlnypisxljoxkb").projectRef, "dlfvkawaiqduhlazsszm");
assert.throws(() => assertNormalProductionProject(project, "bfpjtfqlnypisxljoxkb", "bcjtvojfkfoxvsitzmkl", "bfpjtfqlnypisxljoxkb"), /approved production project/);
assert.deepEqual(
  assertNormalProductionMainBranch({ branches: [{ name: "main", is_default: true, git_branch: "master", status: "ACTIVE_HEALTHY" }] }),
  { name: "main", status: "ACTIVE_HEALTHY" },
);
assert.throws(() => assertNormalProductionMainBranch({ branches: [{ name: "main", is_default: true, git_branch: "master", status: "MIGRATIONS_FAILED" }] }), /not ACTIVE_HEALTHY/);
const migrations = REQUIRED_PRODUCTION_MIGRATIONS.map(item => ({ ...item }));
assert.equal(assertRequiredNormalProductionMigrations({ migrations }).length, 7);
assert.throws(() => assertRequiredNormalProductionMigrations({ migrations: migrations.slice(1) }), /missing or mismatched/);
assert.throws(() => assertRequiredNormalProductionMigrations({ migrations: [...migrations, migrations[0]] }), /duplicate version/);

const headSha = "c".repeat(40);
const releaseSha = "d".repeat(40);
const pr = {
  number: 143,
  state: "closed",
  merged_at: "2026-11-11T00:00:00Z",
  merge_commit_sha: releaseSha,
  base: { ref: "master" },
  head: { sha: headSha, repo: { full_name: "Reekyi/UpStatus" } },
  user: { login: "release-author" },
};
assert.deepEqual(assertMergedReleasePullRequest(pr, releaseSha), { headSha, authorLogin: "release-author" });
assert.throws(() => assertMergedReleasePullRequest({ ...pr, merge_commit_sha: "e".repeat(40) }, releaseSha), /exact approved release SHA/);

const approval = {
  id: 1, state: "APPROVED", commit_id: headSha, submitted_at: "2026-11-11T00:00:00Z",
  user: { login: "release-reviewer", type: "User" },
};
const approvalOptions = { headSha, authorLogin: "release-author", authorizedReviewers: "release-reviewer,backup-reviewer" };
assert.equal(assertAuthorizedReleaseApproval([approval], approvalOptions).reviewer, "release-reviewer");
assert.throws(() => assertAuthorizedReleaseApproval([{ ...approval, commit_id: "e".repeat(40) }], approvalOptions), /no latest APPROVED/);
assert.throws(() => assertAuthorizedReleaseApproval([{ ...approval, user: { login: "reviewer-bot", type: "Bot" } }], approvalOptions), /human GitHub user/);
assert.throws(() => assertAuthorizedReleaseApproval([{ ...approval, user: { login: "release-author", type: "User" } }], approvalOptions), /cannot approve/);
assert.throws(() => assertAuthorizedReleaseApproval([{ ...approval, user: { login: "unlisted", type: "User" } }], approvalOptions), /not in UPSTATUS_RELEASE_REVIEWERS/);
assert.throws(() => assertAuthorizedReleaseApproval([
  approval,
  { ...approval, id: 2, state: "CHANGES_REQUESTED", submitted_at: "2026-11-11T00:01:00Z" },
], approvalOptions), /no latest APPROVED/);
assert.throws(() => assertAuthorizedReleaseApproval([approval], { ...approvalOptions, authorizedReviewers: "" }), /UPSTATUS_RELEASE_REVIEWERS/);

assert.deepEqual(REQUIRED_RELEASE_CHECKS, ["offline_guard", "validate"]);
const releaseCheck = (name, conclusion = "success", headSha = releaseSha, appSlug = "github-actions") => ({
  name, status: "completed", conclusion, head_sha: headSha, app: { slug: appSlug },
});
const validReleaseChecks = {
  total_count: 4,
  check_runs: [
    releaseCheck("offline_guard"),
    releaseCheck("validate"),
    releaseCheck("deploy", "skipped"),
    releaseCheck("Supabase Preview", "skipped", releaseSha, "supabase"),
  ],
};
assert.equal(assertSuccessfulReleaseChecks(validReleaseChecks, { releaseSha }), 4);
assert.throws(() => assertSuccessfulReleaseChecks({
  total_count: 3,
  check_runs: [releaseCheck("offline_guard"), releaseCheck("deploy", "skipped"), releaseCheck("Optional", "skipped")],
}, { releaseSha }), /only deploy and Supabase Preview may be skipped/);
assert.throws(() => assertSuccessfulReleaseChecks({
  total_count: 2,
  check_runs: [releaseCheck("offline_guard"), releaseCheck("validate", "skipped")],
}, { releaseSha }), /only deploy and Supabase Preview may be skipped/);
assert.throws(() => assertSuccessfulReleaseChecks({
  total_count: 2,
  check_runs: [releaseCheck("offline_guard"), releaseCheck("deploy", "skipped")],
}, { releaseSha }), /Required release check validate is missing/);
assert.throws(() => assertSuccessfulReleaseChecks({
  total_count: 2,
  check_runs: [releaseCheck("offline_guard"), releaseCheck("validate", "success", "e".repeat(40))],
}, { releaseSha }), /not bound to the exact merged release SHA/);
assert.throws(() => assertSuccessfulReleaseChecks({
  total_count: 2,
  check_runs: [releaseCheck("offline_guard"), releaseCheck("validate", "failure")],
}, { releaseSha }), /must succeed/);
assert.throws(() => assertSuccessfulReleaseChecks({
  total_count: 2,
  check_runs: [releaseCheck("offline_guard"), { ...releaseCheck("validate"), status: "in_progress", conclusion: null }],
}, { releaseSha }), /not completed/);
assert.throws(() => assertSuccessfulReleaseChecks({ total_count: 100, check_runs: [] }, { releaseSha }), /truncated or invalid/);
assert.throws(() => assertSuccessfulReleaseChecks(validReleaseChecks), /Exact merged release SHA is required/);

const attestationNow = Date.parse("2026-11-11T05:00:00Z");
const validAttestations = {
  releaseSha,
  releaseGatesAcknowledgedSha: releaseSha,
  releaseGatesAcknowledgedAt: "2026-11-11T04:00:00Z",
  physicalAcceptanceSha: releaseSha,
  physicalAcceptanceAt: "2026-11-11T04:30:00Z",
  nowMs: attestationNow,
};
assert.equal(MAX_RELEASE_ATTESTATION_AGE_MS, 7 * 24 * 60 * 60 * 1000);
assert.deepEqual(assertReleaseGateAttestations(validAttestations), {
  releaseSha,
  releaseGatesAcknowledgedAt: "2026-11-11T04:00:00.000Z",
  physicalAcceptanceAt: "2026-11-11T04:30:00.000Z",
});
assert.throws(() => assertReleaseGateAttestations({ ...validAttestations, releaseGatesAcknowledgedSha: "e".repeat(40) }), /must match the exact release SHA/);
assert.throws(() => assertReleaseGateAttestations({ ...validAttestations, physicalAcceptanceSha: "" }), /must match the exact release SHA/);
assert.throws(() => assertReleaseGateAttestations({ ...validAttestations, releaseGatesAcknowledgedAt: "yesterday" }), /ISO-8601 UTC timestamp/);
assert.throws(() => assertReleaseGateAttestations({ ...validAttestations, physicalAcceptanceAt: "2026-11-12T00:00:00Z" }), /cannot be in the future/);
assert.throws(() => assertReleaseGateAttestations({ ...validAttestations, physicalAcceptanceAt: "2026-11-01T00:00:00Z" }), /seven-day release-attestation window/);

console.log("PASS Normal production dispatcher contract, release/rollback provenance, project/migration preflight and exact-head human approval.");
