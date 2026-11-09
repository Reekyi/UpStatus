import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REQUIRED_TEAM_LITE_MIGRATIONS = Object.freeze([
  { version: "20261107010000", name: "setup_invites" },
  { version: "20261107060000", name: "normalize_setup_invite_role" },
  { version: "20261107062000", name: "preserve_setup_invite_roles_verbatim" },
  { version: "20261109090000", name: "atomic_chat_read_receipts_and_visual_config_grants" },
]);

export function assertRequiredTeamLiteMigrationsApplied(appliedMigrations) {
  if (!Array.isArray(appliedMigrations)) {
    throw new Error("Supabase Management API returned an invalid migration-history response.");
  }

  const byVersion = new Map();
  for (const migration of appliedMigrations) {
    const version = String(migration?.version || "").trim();
    const name = String(migration?.name || "").trim();
    if (!/^\d{14}$/.test(version) || !name) {
      throw new Error("Supabase Management API returned a malformed migration-history entry.");
    }
    if (byVersion.has(version)) {
      throw new Error("Supabase Management API returned duplicate migration version " + version + ".");
    }
    byVersion.set(version, name);
  }

  const missing = [];
  const mismatched = [];
  for (const expected of REQUIRED_TEAM_LITE_MIGRATIONS) {
    const actualName = byVersion.get(expected.version);
    if (actualName === undefined) missing.push(expected.version + "_" + expected.name);
    else if (actualName !== expected.name) {
      mismatched.push(expected.version + " expected " + expected.name + " but found " + actualName);
    }
  }

  if (missing.length || mismatched.length) {
    const details = [];
    if (missing.length) details.push("missing: " + missing.join(", "));
    if (mismatched.length) details.push("name mismatch: " + mismatched.join(", "));
    throw new Error("Required Team Lite production migrations are not applied (" + details.join("; ") + ").");
  }
  return REQUIRED_TEAM_LITE_MIGRATIONS.map(item => item.version);
}

export function computeGitBlobSha(content) {
  if (typeof content !== "string") {
    throw new Error("Migration content must be UTF-8 text before its Git blob SHA-1 can be verified.");
  }
  const bytes = Buffer.from(content, "utf8");
  const header = Buffer.from("blob " + bytes.length + "\0", "utf8");
  return createHash("sha1").update(Buffer.concat([header, bytes])).digest("hex");
}

export function assertRemoteMigrationsHaveVerifiedProvenance(appliedMigrations, localMigrationContents, manifest) {
  if (!Array.isArray(appliedMigrations) || !manifest || manifest.schemaVersion !== 1 || !Array.isArray(manifest.entries)) {
    throw new Error("Migration provenance manifest or remote history is invalid; refusing deployment.");
  }
  const localEntries = localMigrationContents instanceof Map
    ? [...localMigrationContents.entries()]
    : Object.entries(localMigrationContents || {});
  const localByFilename = new Map();
  for (const [rawFilename, rawContent] of localEntries) {
    const filename = String(rawFilename || "");
    if (!/^[0-9]{14}_[A-Za-z0-9_-]+\\.sql$/.test(filename) || typeof rawContent !== "string") {
      throw new Error("Local migration content map contains a malformed filename or non-text value.");
    }
    if (localByFilename.has(filename)) {
      throw new Error("Local migration content map contains a duplicate filename: " + filename + ".");
    }
    localByFilename.set(filename, rawContent);
  }

  const manifestByVersion = new Map();
  for (const entry of manifest.entries) {
    const version = String(entry?.version || "");
    const name = String(entry?.name || "");
    const filename = String(entry?.filename || "");
    const blobSha = String(entry?.gitBlobSha || "").toLowerCase();
    const sourceCommit = String(entry?.sourceCommit || "").toLowerCase();
    const sourceRef = String(entry?.sourceRef || "");
    if (!/^\\d{14}$/.test(version) || !/^[A-Za-z0-9_-]+$/.test(name) ||
        filename !== version + "_" + name + ".sql" ||
        !/^[0-9a-f]{40}$/.test(blobSha) ||
        !/^[0-9a-f]{40}$/.test(sourceCommit) || !sourceRef) {
      throw new Error("Migration provenance entry is malformed for version " + (version || "(empty)") + ".");
    }
    if (manifestByVersion.has(version)) {
      throw new Error("Migration provenance manifest contains duplicate version " + version + ".");
    }
    manifestByVersion.set(version, { version, name, filename, blobSha, sourceCommit, sourceRef });
  }

  const missing = [];
  const mismatched = [];
  const hashMismatches = [];
  const remoteVersions = new Set();
  for (const migration of appliedMigrations) {
    const version = String(migration?.version || "").trim();
    const name = String(migration?.name || "").trim();
    if (!/^\\d{14}$/.test(version) || !name) {
      throw new Error("Supabase Management API returned a malformed remote migration entry for provenance verification.");
    }
    if (remoteVersions.has(version)) {
      throw new Error("Supabase Management API returned duplicate remote migration version " + version + ".");
    }
    remoteVersions.add(version);
    const entry = manifestByVersion.get(version);
    if (!entry) {
      missing.push(version + "_" + name + ".sql");
      continue;
    }
    if (entry.name !== name) {
      mismatched.push(version + " remote " + name + " but manifest " + entry.name);
      continue;
    }
    const localContent = localByFilename.get(entry.filename);
    if (localContent === undefined) {
      missing.push(entry.filename + " (local content)");
      continue;
    }
    const actualBlobSha = computeGitBlobSha(localContent);
    if (actualBlobSha !== entry.blobSha) {
      hashMismatches.push(entry.filename + " expected " + entry.blobSha + " but found " + actualBlobSha);
    }
  }

  if (missing.length || mismatched.length || hashMismatches.length) {
    const details = [];
    if (missing.length) details.push("missing provenance/source: " + missing.join(", "));
    if (mismatched.length) details.push("name mismatch: " + mismatched.join(", "));
    if (hashMismatches.length) details.push("Git blob SHA-1 mismatch: " + hashMismatches.join(", "));
    throw new Error("Remote production migrations do not have complete, content-verified provenance (" + details.join("; ") + ").");
  }
  return {
    remoteCount: remoteVersions.size,
    verifiedCount: remoteVersions.size,
    manifestCount: manifestByVersion.size,
  };
}

export function assertRemoteMigrationsHaveLocalFiles(appliedMigrations, localMigrationFiles) {
  if (!Array.isArray(appliedMigrations) || !Array.isArray(localMigrationFiles)) {
    throw new Error("Local/remote migration reconciliation received invalid input; refusing deployment.");
  }

  const localByVersion = new Map();
  for (const filename of localMigrationFiles) {
    const match = /^(\d{14})_(.+)\.sql$/.exec(String(filename || ""));
    if (!match) {
      throw new Error("Local production migration filename is malformed: " + String(filename || "(empty)") + ".");
    }
    if (localByVersion.has(match[1])) {
      throw new Error("Local production migration directory contains duplicate version " + match[1] + ".");
    }
    localByVersion.set(match[1], match[2]);
  }

  const missing = [];
  const mismatched = [];
  const remoteVersions = new Set();
  for (const migration of appliedMigrations) {
    const version = String(migration?.version || "").trim();
    const name = String(migration?.name || "").trim();
    if (!/^\d{14}$/.test(version) || !name) {
      throw new Error("Supabase Management API returned a malformed remote migration entry.");
    }
    if (remoteVersions.has(version)) {
      throw new Error("Supabase Management API returned duplicate remote migration version " + version + ".");
    }
    remoteVersions.add(version);
    const localName = localByVersion.get(version);
    if (localName === undefined) missing.push(version + "_" + name + ".sql");
    else if (localName !== name) mismatched.push(version + " remote " + name + " but local " + localName);
  }

  if (missing.length || mismatched.length) {
    const details = [];
    if (missing.length) details.push("missing local source files: " + missing.join(", "));
    if (mismatched.length) details.push("filename mismatch: " + mismatched.join(", "));
    throw new Error("Remote production migration history is not fully represented locally (" + details.join("; ") + ").");
  }
  return { remoteCount: remoteVersions.size, localCount: localByVersion.size };
}

export async function verifyTeamLiteProductionMigrationHistory({
  projectRef,
  expectedProductionRef,
  isolatedProjectRef,
  accessToken,
  fetchImpl = fetch,
  localMigrationFiles = fs.readdirSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "supabase", "migrations")
  ).filter(filename => filename.endsWith(".sql")),
  localMigrationContents = null,
  provenanceManifest = null,
}) {
  const actualRef = String(projectRef || "").trim();
  const expectedRef = String(expectedProductionRef || "").trim();
  const isolatedRef = String(isolatedProjectRef || "").trim();
  const token = String(accessToken || "").trim();

  if (!/^[a-z0-9]{20}$/.test(actualRef) || !/^[a-z0-9]{20}$/.test(expectedRef)) {
    throw new Error("Team Lite migration preflight project references are missing or malformed.");
  }
  if (actualRef !== expectedRef || actualRef === isolatedRef) {
    throw new Error("SUPABASE_PROJECT_ID does not match the approved production project; refusing migration verification.");
  }
  if (!token) {
    throw new Error("SUPABASE_ACCESS_TOKEN is required for read-only migration-history verification.");
  }

  const endpoint = "https://api.supabase.com/v1/projects/" + encodeURIComponent(actualRef) + "/database/migrations";
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
      },
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("Supabase Management API migration-history request failed; refusing deployment.");
  }
  if (!response.ok) {
    const permissionHint = response.status === 403
      ? " The access token must include database_migrations_read."
      : "";
    throw new Error("Supabase Management API migration-history preflight failed with HTTP " + response.status + "; refusing deployment." + permissionHint);
  }

  let migrations;
  try {
    migrations = await response.json();
  } catch {
    throw new Error("Supabase Management API returned invalid migration-history JSON; refusing deployment.");
  }
  const localHistory = assertRemoteMigrationsHaveLocalFiles(migrations, localMigrationFiles);
  const migrationDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "supabase", "migrations");
  const contents = localMigrationContents ?? new Map(localMigrationFiles.map(filename => [
    filename,
    fs.readFileSync(path.join(migrationDirectory, filename), "utf8"),
  ]));
  const manifest = provenanceManifest ?? JSON.parse(
    fs.readFileSync(path.join(migrationDirectory, "provenance.json"), "utf8")
  );
  const provenance = assertRemoteMigrationsHaveVerifiedProvenance(migrations, contents, manifest);
  return {
    projectRef: actualRef,
    verifiedVersions: assertRequiredTeamLiteMigrationsApplied(migrations),
    localHistory,
    provenance,
  };
}

async function main() {
  const result = await verifyTeamLiteProductionMigrationHistory({
    projectRef: process.env.SUPABASE_PROJECT_ID,
    expectedProductionRef: process.env.EXPECTED_PRODUCTION_PROJECT_ID,
    isolatedProjectRef: process.env.EXPECTED_ISOLATED_SIGNALING_PROJECT_ID,
    accessToken: process.env.SUPABASE_ACCESS_TOKEN,
  });
  console.log("Verified required Team Lite migrations and complete local representation of " +
    result.localHistory.remoteCount + " remote production migrations on " + result.projectRef + ".");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error("Team Lite production migration preflight failed: " + error.message);
    process.exitCode = 1;
  });
}
