#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export const REQUIRED_PRODUCTION_MIGRATIONS = Object.freeze([
  { version: "20261005160000", name: "upstatus_cloud" },
  { version: "20261005173000", name: "remote_realtime" },
  { version: "20261005180000", name: "client_presence" },
  { version: "20261023154754", name: "create_upstatus_visual_config" },
  { version: "20261026195855", name: "add_chat_message_file_name" },
  { version: "20261027154329", name: "allow_chat_document_mime_types" },
  { version: "20261027155438", name: "set_upstatus_upload_limits_20mb" },
]);
export const REQUIRED_PRODUCTION_MIGRATION_SOURCES = Object.freeze([
  Object.freeze({ version: "20261005160000", name: "upstatus_cloud", path: "20261005160000_upstatus_cloud.sql", provenance: "git-blob-verified", gitBlobSha: "636b255c6ba10fdade072183ce24dc5fdb8f4fac" }),
  Object.freeze({ version: "20261005173000", name: "remote_realtime", path: "20261005173000_remote_realtime.sql", provenance: "git-blob-verified", gitBlobSha: "4ce397d8679fbd0e3549a3ceeb0fe9a5f0f26e55" }),
  Object.freeze({ version: "20261005180000", name: "client_presence", path: "20261005180000_client_presence.sql", provenance: "git-blob-verified", gitBlobSha: "b29dac0c083d1054b08684cb4e22279d30fe44bd" }),
  Object.freeze({ version: "20261023154754", name: "create_upstatus_visual_config", path: "20261023154754_create_upstatus_visual_config.sql", provenance: "ledger-recovered-only", gitBlobSha: null }),
  Object.freeze({ version: "20261026195855", name: "add_chat_message_file_name", path: "20261026195855_add_chat_message_file_name.sql", provenance: "ledger-recovered-only", gitBlobSha: null }),
  Object.freeze({ version: "20261027154329", name: "allow_chat_document_mime_types", path: "20261027154329_allow_chat_document_mime_types.sql", provenance: "ledger-recovered-only", gitBlobSha: null }),
  Object.freeze({ version: "20261027155438", name: "set_upstatus_upload_limits_20mb", path: "20261027155438_set_upstatus_upload_limits_20mb.sql", provenance: "ledger-recovered-only", gitBlobSha: null }),
]);
const RELEVANT_REVIEW_STATES = new Set(["APPROVED", "CHANGES_REQUESTED", "DISMISSED"]);

function parseStableVersion(value, label) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(value || "").trim());
  if (!match) throw new Error(label + " must use stable X.Y.Z semantic versioning.");
  return match.slice(1).map(Number);
}
export function compareStableVersions(left, right) {
  const a = parseStableVersion(left, "left version");
  const b = parseStableVersion(right, "right version");
  for (let i = 0; i < 3; i += 1) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  return 0;
}
export function assertMergedReleasePullRequest(pr, releaseSha) {
  const expected = String(releaseSha || "").trim().toLowerCase();
  const headSha = String(pr?.head?.sha || "").trim().toLowerCase();
  const authorLogin = String(pr?.user?.login || "").trim();
  if (!/^[0-9a-f]{40}$/.test(expected) || !/^[0-9a-f]{40}$/.test(headSha) ||
      pr?.state !== "closed" || !pr?.merged_at || pr?.base?.ref !== "master" ||
      String(pr?.merge_commit_sha || "").toLowerCase() !== expected ||
      pr?.head?.repo?.full_name !== "Reekyi/UpStatus" || !authorLogin) {
    throw new Error("The supplied PR must be merged into master and produce the exact approved release SHA.");
  }
  return { headSha, authorLogin };
}
export function assertAuthorizedReleaseApproval(reviews, { headSha, authorLogin, authorizedReviewers }) {
  if (!Array.isArray(reviews)) throw new Error("GitHub returned an invalid PR review history.");
  const expectedHead = String(headSha || "").trim().toLowerCase();
  const author = String(authorLogin || "").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(expectedHead) || !author) throw new Error("Current PR head SHA or author is missing.");
  const allowlist = new Set(String(authorizedReviewers || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean));
  if (!allowlist.size) throw new Error("UPSTATUS_RELEASE_REVIEWERS must list authorized human release reviewers.");
  if (reviews.length >= 100) throw new Error("PR review history reached the one-page limit; refusing incomplete approval audit.");
  const relevant = reviews.filter(r =>
    RELEVANT_REVIEW_STATES.has(String(r?.state || "")) &&
    String(r?.commit_id || "").toLowerCase() === expectedHead
  );
  const invalidTimestamp = relevant.some(r => !Number.isFinite(Date.parse(String(r?.submitted_at || ""))));
  if (invalidTimestamp) throw new Error("A current-head review has an invalid timestamp.");
  relevant.sort((a, b) => Date.parse(a.submitted_at) - Date.parse(b.submitted_at) || Number(a.id || 0) - Number(b.id || 0));
  const latest = relevant.at(-1);
  if (!latest || latest.state !== "APPROVED") throw new Error("The exact current PR head has no latest APPROVED review.");
  const reviewer = String(latest.user?.login || "").trim();
  if (latest.user?.type !== "User") throw new Error("The current-head approval must come from a human GitHub user.");
  if (!reviewer || reviewer.toLowerCase() === author) throw new Error("The PR author cannot approve their own production release.");
  if (!allowlist.has(reviewer.toLowerCase())) throw new Error("The current-head approver is not in UPSTATUS_RELEASE_REVIEWERS.");
  return { reviewer, headSha: expectedHead, submittedAt: latest.submitted_at };
}
export const REQUIRED_RELEASE_CHECKS = Object.freeze(["offline_guard", "validate"]);
const ALLOWED_SKIPPED_RELEASE_CHECKS = new Set(["deploy", "Supabase Preview"]);
export function assertSuccessfulReleaseChecks(payload, { releaseSha } = {}) {
  const expectedSha = String(releaseSha || "").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(expectedSha)) throw new Error("Exact merged release SHA is required to verify checks.");
  const checks = payload?.check_runs;
  const total = Number(payload?.total_count);
  if (!Array.isArray(checks) || !Number.isInteger(total) || total < 1 || total >= 100 || checks.length !== total) {
    throw new Error("GitHub check-run history is empty, truncated or invalid.");
  }
  if (checks.some(c => String(c?.head_sha || "").toLowerCase() !== expectedSha)) {
    throw new Error("GitHub returned checks that are not bound to the exact merged release SHA.");
  }
  for (const check of checks) {
    const name = String(check?.name || "");
    const conclusion = String(check?.conclusion || "");
    if (check?.status !== "completed") throw new Error("Check " + (name || "<unnamed>") + " is not completed.");
    if (conclusion === "success") continue;
    if (conclusion === "skipped" && ALLOWED_SKIPPED_RELEASE_CHECKS.has(name)) continue;
    throw new Error("Check " + (name || "<unnamed>") + " must succeed; only deploy and Supabase Preview may be skipped.");
  }
  for (const requiredName of REQUIRED_RELEASE_CHECKS) {
    const matches = checks.filter(check =>
      check?.name === requiredName &&
      check?.app?.slug === "github-actions" &&
      String(check?.head_sha || "").toLowerCase() === expectedSha
    );
    if (!matches.some(check => check.status === "completed" && check.conclusion === "success")) {
      throw new Error("Required release check " + requiredName + " is missing or not successful on the exact release SHA.");
    }
  }
  return checks.length;
}
export function assertNormalReleaseManifest({ release, buildSource, configText, requestedVersion, operation, currentVersion, releaseSha, rollbackShas }) {
  const version = String(release?.version || "").trim();
  parseStableVersion(version, "release.json version");
  if (String(release?.preRelease || "").trim()) throw new Error("Only a stable Normal release may be deployed.");
  if (String(requestedVersion || "").trim() !== version) throw new Error("Requested release_version does not match release.json.");
  if (String(release?.scriptUrl || "").trim() !== "https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus/upstatus.user.js") {
    throw new Error("Normal release scriptUrl must point to the approved upstatus distribution function.");
  }
  const source = String(buildSource || "");
  for (const required of [
    'const PROJECT="dlfvkawaiqduhlazsszm";',
    'const PROD_FUNCTION="upstatus";',
    'const PROD_API_FUNCTION="upstatus-screen-share-3-1-1-beta10";',
    "writeFunction(PROD_FUNCTION,renderFunction",
    "writeFunction(PROD_API_FUNCTION,renderFunction",
  ]) if (!source.includes(required)) throw new Error("Release source does not generate both reviewed Normal runtimes: " + required);
  const config = String(configText || "");
  for (const section of [
    "[functions.upstatus]\nverify_jwt = false",
    "[functions.upstatus-screen-share-3-1-1-beta10]\nverify_jwt = false",
  ]) if (!config.includes(section)) throw new Error("supabase/config.toml must preserve custom authentication for both Normal functions.");
  const current = String(currentVersion || "").trim();
  parseStableVersion(current, "UPSTATUS_CURRENT_NORMAL_VERSION");
  const comparison = compareStableVersions(version, current);
  if (operation === "release") {
    if (comparison <= 0) throw new Error("A Normal release must be newer than UPSTATUS_CURRENT_NORMAL_VERSION " + current + ".");
  } else if (operation === "rollback") {
    const sha = String(releaseSha || "").trim().toLowerCase();
    const allowlist = new Set(String(rollbackShas || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean));
    if (!/^[0-9a-f]{40}$/.test(sha) || !allowlist.has(sha)) throw new Error("Rollback SHA must be listed in UPSTATUS_NORMAL_ROLLBACK_SHAS.");
    if (comparison >= 0) throw new Error("A rollback target must be older than the current Normal version.");
  } else {
    throw new Error("operation must be release or rollback.");
  }
  return { version, operation };
}
export function assertNormalProductionProject(project, expectedRef, expectedOrganizationId, isolatedRef) {
  const actualRef = String(project?.id || project?.ref || "");
  if (actualRef !== expectedRef || actualRef === isolatedRef) throw new Error("SUPABASE_PROJECT_ID does not match the approved production project.");
  if (String(project?.organization_id || "") !== expectedOrganizationId) throw new Error("Production project is not owned by the expected UpStatus organization.");
  if (project?.status !== "ACTIVE_HEALTHY") throw new Error("Production project must be ACTIVE_HEALTHY before deployment.");
  if (String(project?.database?.host || "") !== "db." + expectedRef + ".supabase.co") throw new Error("Production database host does not match the approved project reference.");
  return { projectRef: actualRef, organizationId: expectedOrganizationId };
}
function normalizeList(payload, key, label) {
  const list = Array.isArray(payload) ? payload : payload?.[key];
  if (!Array.isArray(list)) throw new Error("Supabase Management API returned an invalid " + label + " response.");
  return list;
}
export function assertNormalProductionMainBranch(payload) {
  const branches = normalizeList(payload, "branches", "branch-list");
  const main = branches.find(b => b?.name === "main" && b?.is_default === true);
  if (!main) throw new Error("Default Supabase production branch main was not found.");
  if (String(main.git_branch || "") !== "master") throw new Error("Supabase main must track GitHub master.");
  if (String(main.status || "") !== "ACTIVE_HEALTHY") {
    throw new Error("Supabase main branch is not ACTIVE_HEALTHY (current status: " + String(main.status || "unknown") + ").");
  }
  return { name: main.name, status: main.status };
}
export function assertRequiredNormalProductionMigrations(payload) {
  const migrations = normalizeList(payload, "migrations", "migration-history");
  const byVersion = new Map();
  for (const m of migrations) {
    const version = String(m?.version || "").trim();
    const name = String(m?.name || "").trim();
    if (!/^\d{14}$/.test(version) || !name) throw new Error("Production migration history contains a malformed entry.");
    if (byVersion.has(version)) throw new Error("Production migration history contains duplicate version " + version + ".");
    byVersion.set(version, name);
  }
  const missing = REQUIRED_PRODUCTION_MIGRATIONS.filter(x => byVersion.get(x.version) !== x.name);
  if (missing.length) throw new Error("Required Normal production migrations are missing or mismatched: " + missing.map(x => x.version + "_" + x.name).join(", ") + ".");
  return REQUIRED_PRODUCTION_MIGRATIONS.map(x => x.version);
}
export function computeGitBlobSha1(content) {
  const bytes = Buffer.isBuffer(content) ? content : Buffer.from(String(content), "utf8");
  return createHash("sha1").update("blob " + bytes.length + "\0").update(bytes).digest("hex");
}
export function assertRequiredNormalProductionMigrationFiles({
  migrationsDir,
  requiredMigrations = REQUIRED_PRODUCTION_MIGRATIONS,
  sources = REQUIRED_PRODUCTION_MIGRATION_SOURCES,
}) {
  const rawRoot = String(migrationsDir || "").trim();
  if (!rawRoot) throw new Error("Exact release-source migrations directory is required.");
  const root = path.resolve(rawRoot);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error("Exact release-source migrations directory does not exist.");
  }
  if (!Array.isArray(requiredMigrations) || !Array.isArray(sources)) {
    throw new Error("Migration source manifest is invalid.");
  }
  const byVersion = new Map();
  for (const source of sources) {
    const version = String(source?.version || "").trim();
    const name = String(source?.name || "").trim();
    const relativePath = String(source?.path || "").trim();
    if (!/^\d{14}$/.test(version) || !name || relativePath !== version + "_" + name + ".sql") {
      throw new Error("Migration source manifest contains an invalid version, name or source path.");
    }
    if (byVersion.has(version)) throw new Error("Migration source manifest contains duplicate version " + version + ".");
    byVersion.set(version, source);
  }
  const missing = requiredMigrations.filter(item => byVersion.get(item.version)?.name !== item.name);
  if (missing.length) {
    throw new Error("Migration source manifest is incomplete: " + missing.map(item => item.version + "_" + item.name).join(", ") + ".");
  }
  const unresolved = requiredMigrations.filter(item => {
    const source = byVersion.get(item.version);
    return source.provenance !== "git-blob-verified" || !/^[0-9a-f]{40}$/.test(String(source.gitBlobSha || ""));
  });
  if (unresolved.length) {
    throw new Error("Original Git-tracked migration files have unresolved provenance: " +
      unresolved.map(item => item.version + "_" + item.name).join(", ") +
      ". Recovered ledger statements are not release source files.");
  }
  for (const item of requiredMigrations) {
    const source = byVersion.get(item.version);
    const absolutePath = path.resolve(root, source.path);
    if (!absolutePath.startsWith(root + path.sep)) {
      throw new Error("Migration source path escapes the exact release-source migrations directory.");
    }
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      throw new Error("Original Git-tracked migration file is missing: " + source.path + ".");
    }
    const actualBlobSha = computeGitBlobSha1(fs.readFileSync(absolutePath));
    if (actualBlobSha !== source.gitBlobSha) {
      throw new Error("Git blob SHA mismatch for " + source.path + ": expected " + source.gitBlobSha + ", received " + actualBlobSha + ".");
    }
  }
  return requiredMigrations.map(item => item.version);
}
async function fetchManagementJson(url, token, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: { Authorization: "Bearer " + token, Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("Supabase Management API read-only preflight request failed.");
  }
  if (!response.ok) {
    const hint = response.status === 403 ? " Check Project Settings Read, Production Branches Read and Migrations Read permissions." : "";
    throw new Error("Supabase Management API preflight failed with HTTP " + response.status + "." + hint);
  }
  try { return await response.json(); }
  catch { throw new Error("Supabase Management API returned invalid JSON."); }
}
export async function verifyNormalProductionPreflight({ projectRef, expectedProductionRef, isolatedProjectRef, expectedOrganizationId, accessToken, migrationSourceDir, fetchImpl = fetch }) {
  const actualRef = String(projectRef || "").trim();
  const expectedRef = String(expectedProductionRef || "").trim();
  const isolatedRef = String(isolatedProjectRef || "").trim();
  const organizationId = String(expectedOrganizationId || "").trim();
  const token = String(accessToken || "").trim();
  if (!/^[a-z0-9]{20}$/.test(actualRef) || actualRef !== expectedRef || actualRef === isolatedRef) {
    throw new Error("SUPABASE_PROJECT_ID is missing, isolated or not the approved production project.");
  }
  if (!/^[a-z0-9]{20}$/.test(organizationId) || !token) throw new Error("Expected organization ID and SUPABASE_ACCESS_TOKEN are required.");
  const verifiedMigrationSources = assertRequiredNormalProductionMigrationFiles({ migrationsDir: migrationSourceDir });
  const base = "https://api.supabase.com/v1/projects/" + encodeURIComponent(actualRef);
  const project = await fetchManagementJson(base, token, fetchImpl);
  const branches = await fetchManagementJson(base + "/branches", token, fetchImpl);
  const migrations = await fetchManagementJson(base + "/database/migrations", token, fetchImpl);
  const verifiedProject = assertNormalProductionProject(project, expectedRef, organizationId, isolatedRef);
  const verifiedBranch = assertNormalProductionMainBranch(branches);
  const verifiedMigrations = assertRequiredNormalProductionMigrations(migrations);
  return { ...verifiedProject, branch: verifiedBranch, migrations: verifiedMigrations, migrationSources: verifiedMigrationSources };
}
export const MAX_RELEASE_ATTESTATION_AGE_MS = 7 * 24 * 60 * 60 * 1000;
function parseReleaseAttestationTimestamp(value, label) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(raw)) {
    throw new Error(label + " must be an ISO-8601 UTC timestamp.");
  }
  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) throw new Error(label + " must be a valid timestamp.");
  return timestamp;
}
export function assertReleaseGateAttestations({
  releaseSha,
  releaseGatesAcknowledgedSha,
  releaseGatesAcknowledgedAt,
  physicalAcceptanceSha,
  physicalAcceptanceAt,
  nowMs = Date.now(),
}) {
  const expectedSha = String(releaseSha || "").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(expectedSha)) throw new Error("Exact release SHA is required for release-gate attestations.");
  const gatesSha = String(releaseGatesAcknowledgedSha || "").trim().toLowerCase();
  const physicalSha = String(physicalAcceptanceSha || "").trim().toLowerCase();
  if (gatesSha !== expectedSha) throw new Error("UPSTATUS_NORMAL_RELEASE_GATES_ACKNOWLEDGED_SHA must match the exact release SHA.");
  if (physicalSha !== expectedSha) throw new Error("UPSTATUS_NORMAL_PHYSICAL_ACCEPTANCE_SHA must match the exact release SHA.");
  const now = Number(nowMs);
  if (!Number.isFinite(now)) throw new Error("A valid current timestamp is required.");
  const gatesAt = parseReleaseAttestationTimestamp(releaseGatesAcknowledgedAt, "UPSTATUS_NORMAL_RELEASE_GATES_ACKNOWLEDGED_AT");
  const physicalAt = parseReleaseAttestationTimestamp(physicalAcceptanceAt, "UPSTATUS_NORMAL_PHYSICAL_ACCEPTANCE_AT");
  for (const [label, timestamp] of [
    ["UPSTATUS_NORMAL_RELEASE_GATES_ACKNOWLEDGED_AT", gatesAt],
    ["UPSTATUS_NORMAL_PHYSICAL_ACCEPTANCE_AT", physicalAt],
  ]) {
    if (timestamp > now + 60_000) throw new Error(label + " cannot be in the future.");
    if (now - timestamp > MAX_RELEASE_ATTESTATION_AGE_MS) throw new Error(label + " is older than the seven-day release-attestation window.");
  }
  return {
    releaseSha: expectedSha,
    releaseGatesAcknowledgedAt: new Date(gatesAt).toISOString(),
    physicalAcceptanceAt: new Date(physicalAt).toISOString(),
  };
}
async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "verify-attestations") {
    const [releaseSha, releaseGatesAcknowledgedSha, releaseGatesAcknowledgedAt, physicalAcceptanceSha, physicalAcceptanceAt] = args;
    const result = assertReleaseGateAttestations({
      releaseSha,
      releaseGatesAcknowledgedSha,
      releaseGatesAcknowledgedAt,
      physicalAcceptanceSha,
      physicalAcceptanceAt,
    });
    console.log("Verified release-gate and physical-acceptance attestations for exact SHA " + result.releaseSha + ".");
    return;
  }
  if (command === "verify-review") {
    const [prPath, reviewsPath, checksPath, releaseSha, authorizedReviewers] = args;
    const pr = JSON.parse(fs.readFileSync(path.resolve(prPath), "utf8"));
    const reviews = JSON.parse(fs.readFileSync(path.resolve(reviewsPath), "utf8"));
    const checks = JSON.parse(fs.readFileSync(path.resolve(checksPath), "utf8"));
    const provenance = assertMergedReleasePullRequest(pr, releaseSha);
    const approval = assertAuthorizedReleaseApproval(reviews, { ...provenance, authorizedReviewers });
    const count = assertSuccessfulReleaseChecks(checks, { releaseSha });
    console.log("Verified merged master PR " + pr.number + ", exact-head approval by " + approval.reviewer + " and " + count + " checks on release SHA " + releaseSha + ".");
    return;
  }
  if (command === "verify-release") {
    const [releasePath, buildPath, configPath, requestedVersion, operation, currentVersion, releaseSha, rollbackShas] = args;
    const release = JSON.parse(fs.readFileSync(path.resolve(releasePath), "utf8"));
    const buildSource = fs.readFileSync(path.resolve(buildPath), "utf8");
    const configText = fs.readFileSync(path.resolve(configPath), "utf8");
    const result = assertNormalReleaseManifest({ release, buildSource, configText, requestedVersion, operation, currentVersion, releaseSha, rollbackShas });
    console.log("Verified Normal " + result.operation + " candidate " + result.version + " with both generated runtimes.");
    return;
  }
  if (command === "preflight") {
    const [migrationSourceDir] = args;
    if (!migrationSourceDir) throw new Error("preflight requires the exact release-source/supabase/migrations directory.");
    const result = await verifyNormalProductionPreflight({
      projectRef: process.env.SUPABASE_PROJECT_ID,
      expectedProductionRef: process.env.EXPECTED_PRODUCTION_PROJECT_ID,
      isolatedProjectRef: process.env.EXPECTED_ISOLATED_PROJECT_ID,
      expectedOrganizationId: process.env.EXPECTED_SUPABASE_ORGANIZATION_ID,
      accessToken: process.env.SUPABASE_ACCESS_TOKEN,
      migrationSourceDir,
    });
    console.log("Verified production project, healthy main branch, " + result.migrations.length + " required migrations and their exact Git blob provenance without applying SQL.");
    return;
  }
  throw new Error("Usage: normal-production-dispatcher.mjs <verify-attestations|verify-review|verify-release|preflight <release-source/supabase/migrations> ...");
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error("Normal production dispatcher guard failed: " + error.message);
    process.exitCode = 1;
  });
}
