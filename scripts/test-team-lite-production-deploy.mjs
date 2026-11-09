#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertTeamLiteProductionMainBranch,
  assertTeamLiteProductionProject,
  verifyTeamLiteProductionProject,
} from "./verify-team-lite-production-project.mjs";
import {
  REQUIRED_TEAM_LITE_MIGRATIONS,
  assertRemoteMigrationsHaveLocalFiles,
  assertRemoteMigrationsHaveVerifiedProvenance,
  assertRequiredTeamLiteMigrationsApplied,
  computeGitBlobSha,
  verifyTeamLiteProductionMigrationHistory,
} from "./verify-team-lite-production-migrations.mjs";
import { assertTeamLiteRelease, compareStableVersions } from "./verify-team-lite-release.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");
const workflow = read(".github/workflows/deploy-production.yml");
const config = read("supabase/config.toml");
const release = JSON.parse(read("team-lite/release.json"));
const script = read("team-lite/upstatus-team-lite.user.js");
const backend = read("src/server/team-lite-index.template.ts");
const build = read("scripts/build.mjs");
const productionMigration = read("supabase/migrations/20261109090000_atomic_chat_read_receipts_and_visual_config_grants.sql");
const isolatedMigration = read("supabase/test-migrations/20261104152847_atomic_chat_read_receipts_and_visual_config_grants_test.sql");

assert.match(workflow, /^on:\n  workflow_dispatch:/m,
  "Team Lite production deployment must remain manual-only");
assert.doesNotMatch(workflow, /^  (?:push|pull_request|schedule|workflow_run):/m,
  "Team Lite production deployment must not run automatically");
assert.match(workflow, /confirm_production_deploy:[\s\S]*?required: true[\s\S]*?default: false/,
  "production dispatch must require an explicit confirmation that defaults to false");
assert.match(workflow, /release_version:[\s\S]*?required: true/,
  "production dispatch must require the exact Team Lite release version");
assert.match(workflow, /ref: \$\{\{ github\.sha \}\}/,
  "deployment must check out the exact dispatch SHA");
assert.match(workflow, /refs\/heads\/team-lite-official/,
  "deployment must be restricted to team-lite-official");
assert.match(workflow, /git rev-parse HEAD[\s\S]*?GITHUB_SHA/,
  "deployment must verify the checked-out SHA");
assert.match(workflow, /node scripts\/verify-team-lite-release\.mjs "\$RELEASE_VERSION"/,
  "deployment must verify the manually supplied release version");
assert.match(workflow, /EXPECTED_PRODUCTION_PROJECT_ID: dlfvkawaiqduhlazsszm/,
  "production project reference must be pinned");
assert.match(workflow, /EXPECTED_ISOLATED_SIGNALING_PROJECT_ID: bfpjtfqlnypisxljoxkb/,
  "isolated signaling project must be explicitly rejected");
assert.match(workflow, /EXPECTED_SUPABASE_ORGANIZATION_ID: bcjtvojfkfoxvsitzmkl/,
  "production organization must be pinned");
assert.match(workflow, /node scripts\/verify-team-lite-production-project\.mjs/,
  "read-only Management API project preflight must run");
assert.match(workflow, /node scripts\/verify-team-lite-production-migrations\.mjs/,
  "read-only migration-history preflight must run");
assert.match(workflow, /node scripts\/test-team-lite-production-deploy\.mjs/,
  "offline deploy contract tests must run before deployment");
assert.match(workflow, /node scripts\/team-lite-candidate-check\.mjs/,
  "the Team Lite candidate contract suite must run before deployment");

const projectPreflightIndex = workflow.indexOf("node scripts/verify-team-lite-production-project.mjs");
const migrationPreflightIndex = workflow.indexOf("node scripts/verify-team-lite-production-migrations.mjs");
const cliSetupIndex = workflow.indexOf("name: Setup pinned Supabase CLI");
const deployIndex = workflow.indexOf("supabase functions deploy");
assert.ok(projectPreflightIndex >= 0 && migrationPreflightIndex > projectPreflightIndex &&
  cliSetupIndex > migrationPreflightIndex && deployIndex > cliSetupIndex,
  "project and migration preflights must complete before CLI setup and deploy");

assert.match(workflow, /version: 2\.122\.1/,
  "Supabase CLI must be pinned to the validated version");
assert.doesNotMatch(workflow, /version:\s*latest/,
  "production deployment must not use a floating CLI version");
assert.match(workflow, /group: upstatus-team-lite-production-deploy[\s\S]*?queue: max[\s\S]*?cancel-in-progress: false/,
  "production deployments must be serialized without cancelling an active deployment");
assert.match(workflow, /timeout-minutes: 20/);
assert.match(workflow, /environment: production/);
assert.match(workflow, /EXPECTED_CURRENT_TEAM_LITE_VERSION: "3\.4\.30"/);

const deployCommands = workflow.match(/^\s*run: supabase functions deploy .+$/gm) || [];
assert.equal(deployCommands.length, 1, "production workflow must deploy exactly one Edge Function");
assert.match(deployCommands[0], /--no-verify-jwt upstatus-team-lite/,
  "deployment must target the Team Lite function and preserve custom handler authentication");
assert.match(deployCommands[0], /--project-ref "\$SUPABASE_PROJECT_ID" --use-api/,
  "deployment must use the verified project reference and Management API");
assert.doesNotMatch(workflow, /supabase functions deploy upstatus(?:\s|$)/,
  "Team Lite deployment must never overwrite the Normal upstatus function");
assert.doesNotMatch(workflow, /supabase functions deploy (?:--no-verify-jwt )?upstatus-test\b|supabase functions deploy .*upstatus-signal/,
  "Team Lite production deployment must never target TEST or signaling fixture functions");
assert.doesNotMatch(workflow, /supabase\s+(?:db\s+push|migration\s+up)/,
  "production workflow must never apply database migrations automatically");

const tokenBindings = workflow.match(/^\s{10}SUPABASE_ACCESS_TOKEN: \$\{\{ secrets\.SUPABASE_ACCESS_TOKEN \}\}$/gm) || [];
const projectBindings = workflow.match(/^\s{10}SUPABASE_PROJECT_ID: \$\{\{ secrets\.SUPABASE_PROJECT_ID \}\}$/gm) || [];
assert.equal(tokenBindings.length, 3, "Management API token must be scoped only to read-only preflights and the deploy step");
assert.equal(projectBindings.length, 3, "project secret must be scoped only to preflights and the deploy step");
assert.doesNotMatch(workflow, /^      SUPABASE_ACCESS_TOKEN:/m, "Management API token must not be exposed at job scope");
assert.doesNotMatch(workflow, /^      SUPABASE_PROJECT_ID:/m, "project secret must not be exposed at job scope");

function readFunctionVerifyJwt(text, slug) {
  const sections = [];
  let current = "";
  for (const line of String(text).split(/\r?\n/)) {
    const header = /^\s*\[([^\]]+)\]\s*(?:#.*)?$/.exec(line);
    if (header) {
      current = header[1].trim();
      if (current === "functions." + slug) sections.push([]);
      continue;
    }
    if (current !== "functions." + slug || !/^\s*verify_jwt\b/.test(line)) continue;
    const setting = /^\s*verify_jwt\s*=\s*(true|false)\s*(?:#.*)?$/.exec(line);
    assert.ok(setting, "verify_jwt must be a valid boolean");
    sections[sections.length - 1].push(setting[1] === "true");
  }
  assert.equal(sections.length, 1, "config must contain exactly one function section for " + slug);
  assert.equal(sections[0].length, 1, "verify_jwt must be declared exactly once for " + slug);
  return sections[0][0];
}
assert.equal(readFunctionVerifyJwt(config, "upstatus-team-lite"), false,
  "Team Lite custom x-upstatus-token authentication requires verify_jwt=false");
assert.match(config, /\[storage\.buckets\.chat-images\][\s\S]*?public = true[\s\S]*?file_size_limit = "20MB"/,
  "candidate chat bucket config must match the observed 20 MiB production limit");
assert.match(config, /\[storage\.buckets\.profile-images\][\s\S]*?public = true[\s\S]*?file_size_limit = "20MB"/,
  "candidate profile bucket config must match the observed 20 MiB production limit");

const releaseResult = assertTeamLiteRelease({
  release,
  script,
  expectedCurrentVersion: "3.4.30",
  expectedCoreVersion: "3.4.7",
  requestedVersion: release.buildVersion,
});
assert.equal(releaseResult.buildVersion, "3.4.31");
assert.equal(compareStableVersions("3.4.31", "3.4.30"), 1);
assert.equal(compareStableVersions("3.4.30", "3.4.30"), 0);
assert.throws(() => assertTeamLiteRelease({
  release: { ...release, buildVersion: "3.4.30" },
  script,
  expectedCurrentVersion: "3.4.30",
  expectedCoreVersion: "3.4.7",
  requestedVersion: "3.4.30",
}), /must be newer/);
assert.throws(() => assertTeamLiteRelease({
  release,
  script,
  expectedCurrentVersion: "3.4.30",
  expectedCoreVersion: "3.4.7",
  requestedVersion: "3.4.32",
}), /does not match/);
assert.throws(() => assertTeamLiteRelease({
  release: { ...release, channel: "beta" },
  script,
  expectedCurrentVersion: "3.4.30",
  expectedCoreVersion: "3.4.7",
  requestedVersion: release.buildVersion,
}), /Only a stable/);

assert.ok(build.includes('writeFunction("upstatus-team-lite",renderTeamLiteFunction())'),
  "build must generate the exact Team Lite function deployed by the workflow");
assert.ok(backend.includes('db.rpc("consume_upstatus_setup_invite"'),
  "Team Lite backend depends on the AUTH-03 setup-invite RPC");
assert.ok(backend.includes('db.rpc("merge_chat_read_receipts"'),
  "Team Lite backend depends on the atomic chat-read receipt RPC");

assert.equal(productionMigration, isolatedMigration,
  "production chat-read receipt migration must match the already-reviewed isolated SQL counterpart");
assert.match(productionMigration, /create or replace function public\.merge_chat_read_receipts/i);
assert.match(productionMigration, /security invoker/i);
assert.match(productionMigration, /set search_path = ''/i);
assert.match(productionMigration, /revoke all on function public\.merge_chat_read_receipts[\s\S]*from public, anon, authenticated/i);
assert.match(productionMigration, /grant execute on function public\.merge_chat_read_receipts[\s\S]*to service_role/i);
assert.match(productionMigration, /on conflict \(user_name\) do update/i);

assert.deepEqual(REQUIRED_TEAM_LITE_MIGRATIONS, [
  { version: "20261107010000", name: "setup_invites" },
  { version: "20261107060000", name: "normalize_setup_invite_role" },
  { version: "20261107062000", name: "preserve_setup_invite_roles_verbatim" },
  { version: "20261109090000", name: "atomic_chat_read_receipts_and_visual_config_grants" },
]);
assert.deepEqual(
  assertRequiredTeamLiteMigrationsApplied(REQUIRED_TEAM_LITE_MIGRATIONS),
  REQUIRED_TEAM_LITE_MIGRATIONS.map(item => item.version),
);
assert.throws(() => assertRequiredTeamLiteMigrationsApplied(REQUIRED_TEAM_LITE_MIGRATIONS.slice(1)),
  /missing: 20261107010000_setup_invites/);
assert.throws(() => assertRequiredTeamLiteMigrationsApplied([
  { version: "20261107010000", name: "wrong_name" },
  ...REQUIRED_TEAM_LITE_MIGRATIONS.slice(1),
]), /name mismatch/);
assert.throws(() => assertRequiredTeamLiteMigrationsApplied([
  ...REQUIRED_TEAM_LITE_MIGRATIONS,
  REQUIRED_TEAM_LITE_MIGRATIONS[0],
]), /duplicate migration version/);

const productionRemoteHistory = [
  { version: "20261005160000", name: "upstatus_cloud" },
  { version: "20261005173000", name: "remote_realtime" },
  { version: "20261005180000", name: "client_presence" },
  { version: "20261023154754", name: "create_upstatus_visual_config" },
  { version: "20261026195855", name: "add_chat_message_file_name" },
  { version: "20261027154329", name: "allow_chat_document_mime_types" },
  { version: "20261027155438", name: "set_upstatus_upload_limits_20mb" },
];
const completeProductionMigrationFiles = [
  "20261005160000_upstatus_cloud.sql",
  "20261005173000_remote_realtime.sql",
  "20261005180000_client_presence.sql",
  "20261023154754_create_upstatus_visual_config.sql",
  "20261026195855_add_chat_message_file_name.sql",
  "20261027154329_allow_chat_document_mime_types.sql",
  "20261027155438_set_upstatus_upload_limits_20mb.sql",
];
assert.deepEqual(
  assertRemoteMigrationsHaveLocalFiles(productionRemoteHistory, completeProductionMigrationFiles),
  { remoteCount: 7, localCount: 7 },
);
assert.throws(() => assertRemoteMigrationsHaveLocalFiles(
  productionRemoteHistory,
  completeProductionMigrationFiles.filter(name => !name.startsWith("20261023154754_")),
), /20261023154754_create_upstatus_visual_config\.sql/);
assert.throws(() => assertRemoteMigrationsHaveLocalFiles(
  productionRemoteHistory,
  completeProductionMigrationFiles.map(name => name.startsWith("20261027155438_")
    ? "20261027155438_wrong_name.sql"
    : name),
), /filename mismatch/);
assert.throws(() => assertRemoteMigrationsHaveLocalFiles(
  productionRemoteHistory,
  [...completeProductionMigrationFiles, completeProductionMigrationFiles[0]],
), /duplicate version/);

const fixtureMigrationContents = new Map(completeProductionMigrationFiles.map(filename => [
  filename,
  "-- reviewed migration fixture: " + filename + "\n",
]));
const fixtureProvenanceManifest = {
  schemaVersion: 1,
  algorithm: "git-blob-sha1",
  entries: productionRemoteHistory.map(migration => {
    const filename = migration.version + "_" + migration.name + ".sql";
    return {
      version: migration.version,
      name: migration.name,
      filename,
      gitBlobSha: computeGitBlobSha(fixtureMigrationContents.get(filename)),
      sourceRef: "offline-fixture",
      sourceCommit: "a".repeat(40),
    };
  }),
};
assert.deepEqual(
  assertRemoteMigrationsHaveVerifiedProvenance(
    productionRemoteHistory,
    fixtureMigrationContents,
    fixtureProvenanceManifest,
  ),
  { remoteCount: 7, verifiedCount: 7, manifestCount: 7 },
);
const tamperedMigrationContents = new Map(fixtureMigrationContents);
tamperedMigrationContents.set(
  completeProductionMigrationFiles[0],
  fixtureMigrationContents.get(completeProductionMigrationFiles[0]) + "-- tampered\n",
);
assert.throws(() => assertRemoteMigrationsHaveVerifiedProvenance(
  productionRemoteHistory,
  tamperedMigrationContents,
  fixtureProvenanceManifest,
), /Git blob SHA-1 mismatch/);
assert.throws(() => assertRemoteMigrationsHaveVerifiedProvenance(
  productionRemoteHistory,
  fixtureMigrationContents,
  { ...fixtureProvenanceManifest, entries: fixtureProvenanceManifest.entries.slice(1) },
), /missing provenance\/source/);
assert.throws(() => assertRemoteMigrationsHaveVerifiedProvenance(
  productionRemoteHistory,
  fixtureMigrationContents,
  { ...fixtureProvenanceManifest, entries: [...fixtureProvenanceManifest.entries, fixtureProvenanceManifest.entries[0]] },
), /duplicate version/);
assert.throws(() => assertRemoteMigrationsHaveVerifiedProvenance(
  productionRemoteHistory,
  fixtureMigrationContents,
  { ...fixtureProvenanceManifest, entries: [{ ...fixtureProvenanceManifest.entries[0], sourceCommit: "not-a-commit" }, ...fixtureProvenanceManifest.entries.slice(1)] },
), /provenance entry is malformed/);

const actualMigrationDirectory = path.join(ROOT, "supabase", "migrations");
const actualMigrationFiles = fs.readdirSync(actualMigrationDirectory).filter(filename => filename.endsWith(".sql"));
const actualMigrationContents = new Map(actualMigrationFiles.map(filename => [
  filename,
  fs.readFileSync(path.join(actualMigrationDirectory, filename), "utf8"),
]));
const actualProvenanceManifest = JSON.parse(read("supabase/migrations/provenance.json"));
assert.equal(actualProvenanceManifest.entries.length, 3,
  "only the three source files present in the reviewed master tree may be recorded until the four originals are recovered");
assert.deepEqual(
  assertRemoteMigrationsHaveVerifiedProvenance(
    productionRemoteHistory.slice(0, 3),
    actualMigrationContents,
    actualProvenanceManifest,
  ),
  { remoteCount: 3, verifiedCount: 3, manifestCount: 3 },
  "the three available original migrations must match their recorded Git blob IDs",
);
const incompleteProvenanceError = assert.throws(() => assertRemoteMigrationsHaveVerifiedProvenance(
  productionRemoteHistory,
  actualMigrationContents,
  actualProvenanceManifest,
), /missing provenance\\/source/);
assert.doesNotMatch(incompleteProvenanceError.message, /Git blob SHA-1 mismatch/,
  "the known original migration blobs must match even though four other sources are missing");

const expectedProject = "dlfvkawaiqduhlazsszm";
const isolatedProject = "bfpjtfqlnypisxljoxkb";
const expectedOrganization = "bcjtvojfkfoxvsitzmkl";
const validProject = {
  id: expectedProject,
  organization_id: expectedOrganization,
  status: "ACTIVE_HEALTHY",
  database: { host: "db." + expectedProject + ".supabase.co" },
};
assert.doesNotThrow(() => assertTeamLiteProductionProject(validProject, expectedProject, expectedOrganization));
assert.throws(() => assertTeamLiteProductionProject(
  { ...validProject, id: isolatedProject }, expectedProject, expectedOrganization
), /reference does not match/);
assert.throws(() => assertTeamLiteProductionProject(
  { ...validProject, organization_id: "aaaaaaaaaaaaaaaaaaaa" }, expectedProject, expectedOrganization
), /expected UpStatus organization/);
assert.throws(() => assertTeamLiteProductionProject(
  { ...validProject, status: "INACTIVE" }, expectedProject, expectedOrganization
), /ACTIVE_HEALTHY/);

const validMainBranch = {
  id: "6b38aa94-2ef5-4bfe-bf33-f0793e1fe161",
  name: "main",
  is_default: true,
  git_branch: "master",
  status: "ACTIVE_HEALTHY",
  preview_project_status: "ACTIVE_HEALTHY",
};
assert.doesNotThrow(() => assertTeamLiteProductionMainBranch([validMainBranch]));
assert.doesNotThrow(() => assertTeamLiteProductionMainBranch({ branches: [validMainBranch] }));
assert.throws(() => assertTeamLiteProductionMainBranch([
  { ...validMainBranch, status: "MIGRATIONS_FAILED" },
]), /not ACTIVE_HEALTHY/);
assert.throws(() => assertTeamLiteProductionMainBranch([
  { ...validMainBranch, git_branch: "develop" },
]), /must track the approved master/);
assert.throws(() => assertTeamLiteProductionMainBranch([]), /exactly one default managed main branch/);
assert.throws(() => assertTeamLiteProductionMainBranch([
  validMainBranch,
  { ...validMainBranch, id: "another-main" },
]), /exactly one default managed main branch/);

const projectRequests = [];
await verifyTeamLiteProductionProject({
  projectRef: expectedProject,
  expectedProductionRef: expectedProject,
  isolatedProjectRef: isolatedProject,
  expectedOrganizationId: expectedOrganization,
  accessToken: "test-management-token",
  fetchImpl: async (url, options) => {
    projectRequests.push({ url, options });
    if (url.endsWith("/branches")) {
      return { ok: true, status: 200, json: async () => ({ branches: [validMainBranch] }) };
    }
    return { ok: true, status: 200, json: async () => validProject };
  },
});
assert.equal(projectRequests.length, 2, "project and managed-main branch must both be verified");
assert.equal(projectRequests[0].url, "https://api.supabase.com/v1/projects/" + expectedProject);
assert.equal(projectRequests[1].url, "https://api.supabase.com/v1/projects/" + expectedProject + "/branches");
for (const request of projectRequests) {
  assert.equal(request.options.method, "GET");
  assert.equal(request.options.redirect, "error");
  assert.equal(request.options.headers.Authorization, "Bearer test-management-token");
  assert.ok(request.options.signal, "project and branch preflights must have bounded timeouts");
}

await assert.rejects(verifyTeamLiteProductionProject({
  projectRef: expectedProject,
  expectedProductionRef: expectedProject,
  isolatedProjectRef: isolatedProject,
  expectedOrganizationId: expectedOrganization,
  accessToken: "test-management-token",
  fetchImpl: async url => url.endsWith("/branches")
    ? { ok: true, status: 200, json: async () => ({ branches: [{ ...validMainBranch, status: "MIGRATIONS_FAILED" }] }) }
    : { ok: true, status: 200, json: async () => validProject },
}), /not ACTIVE_HEALTHY/);

let isolatedProjectFetchCalled = false;
await assert.rejects(verifyTeamLiteProductionProject({
  projectRef: isolatedProject,
  expectedProductionRef: expectedProject,
  isolatedProjectRef: isolatedProject,
  expectedOrganizationId: expectedOrganization,
  accessToken: "test-management-token",
  fetchImpl: async () => {
    isolatedProjectFetchCalled = true;
    return { ok: true, status: 200, json: async () => validProject };
  },
}), /does not match the approved production project/);
assert.equal(isolatedProjectFetchCalled, false, "isolated project must be rejected before any Management API request");

const requiredMigrationContents = new Map(REQUIRED_TEAM_LITE_MIGRATIONS.map(migration => {
  const filename = migration.version + "_" + migration.name + ".sql";
  return [filename, "-- required migration fixture: " + filename + "\n"];
}));
const requiredProvenanceManifest = {
  schemaVersion: 1,
  algorithm: "git-blob-sha1",
  entries: REQUIRED_TEAM_LITE_MIGRATIONS.map(migration => {
    const filename = migration.version + "_" + migration.name + ".sql";
    return {
      version: migration.version,
      name: migration.name,
      filename,
      gitBlobSha: computeGitBlobSha(requiredMigrationContents.get(filename)),
      sourceRef: "offline-fixture",
      sourceCommit: "b".repeat(40),
    };
  }),
};

let migrationRequest = null;
const migrationResult = await verifyTeamLiteProductionMigrationHistory({
  projectRef: expectedProject,
  expectedProductionRef: expectedProject,
  isolatedProjectRef: isolatedProject,
  accessToken: "test-management-token",
  localMigrationFiles: [...requiredMigrationContents.keys()],
  localMigrationContents: requiredMigrationContents,
  provenanceManifest: requiredProvenanceManifest,
  fetchImpl: async (url, options) => {
    migrationRequest = { url, options };
    return { ok: true, status: 200, json: async () => REQUIRED_TEAM_LITE_MIGRATIONS };
  },
});
assert.deepEqual(migrationResult.verifiedVersions, REQUIRED_TEAM_LITE_MIGRATIONS.map(item => item.version));
assert.deepEqual(migrationResult.provenance, { remoteCount: 4, verifiedCount: 4, manifestCount: 4 });
assert.equal(migrationRequest.url, "https://api.supabase.com/v1/projects/" + expectedProject + "/database/migrations");
assert.equal(migrationRequest.options.method, "GET");
assert.equal(migrationRequest.options.redirect, "error");
assert.ok(migrationRequest.options.signal, "migration-history request must have a bounded timeout");

await assert.rejects(verifyTeamLiteProductionMigrationHistory({
  projectRef: expectedProject,
  expectedProductionRef: expectedProject,
  isolatedProjectRef: isolatedProject,
  accessToken: "test-management-token",
  fetchImpl: async () => ({ ok: false, status: 403 }),
}), /database_migrations_read/);

console.log("Team Lite production deploy guard passed: exact target, explicit approval, stable version, custom JWT, migration prerequisites, and read-only preflights.");
 
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // All checks above are offline and use injected fake Management API responses.
}
