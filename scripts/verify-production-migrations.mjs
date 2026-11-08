#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REQUIRED_PRODUCTION_MIGRATIONS } from "./verify-production-cutover.mjs";

function expectedMigrationEntries() {
  return REQUIRED_PRODUCTION_MIGRATIONS.map(file => {
    const match = /^(\d{14})_(.+)\.sql$/.exec(file);
    if (!match) throw new Error("Required setup migration filename is invalid: " + file);
    return { version: match[1], name: match[2] };
  });
}

export function assertRequiredProductionMigrationsApplied(appliedMigrations) {
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
  for (const expected of expectedMigrationEntries()) {
    const actualName = byVersion.get(expected.version);
    if (actualName === undefined) missing.push(expected.version + "_" + expected.name);
    else if (actualName !== expected.name) mismatched.push(expected.version + " expected " + expected.name + " but found " + actualName);
  }

  if (missing.length || mismatched.length) {
    const details = [];
    if (missing.length) details.push("missing: " + missing.join(", "));
    if (mismatched.length) details.push("name mismatch: " + mismatched.join(", "));
    throw new Error("Required production security/signaling migrations are not applied to production (" + details.join("; ") + ").");
  }

  return expectedMigrationEntries().map(item => item.version);
}

export async function verifyProductionMigrationHistory({
  projectRef,
  expectedProductionRef,
  isolatedProjectRef,
  accessToken,
  fetchImpl = fetch,
}) {
  const actualRef = String(projectRef || "").trim();
  const expectedRef = String(expectedProductionRef || "").trim();
  const isolatedRef = String(isolatedProjectRef || "").trim();
  const token = String(accessToken || "").trim();

  if (!/^[a-z0-9]{20}$/.test(actualRef) || !/^[a-z0-9]{20}$/.test(expectedRef)) {
    throw new Error("Production migration preflight project references are missing or malformed.");
  }
  if (actualRef !== expectedRef || actualRef === isolatedRef) {
    throw new Error("SUPABASE_PROJECT_ID does not match the approved production project; refusing migration verification.");
  }
  if (!token) {
    throw new Error("SUPABASE_ACCESS_TOKEN is required for read-only production migration verification.");
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

  let appliedMigrations;
  try {
    appliedMigrations = await response.json();
  } catch {
    throw new Error("Supabase Management API returned invalid migration-history JSON; refusing deployment.");
  }

  return {
    projectRef: actualRef,
    verifiedVersions: assertRequiredProductionMigrationsApplied(appliedMigrations),
  };
}

async function main() {
  const result = await verifyProductionMigrationHistory({
    projectRef: process.env.SUPABASE_PROJECT_ID,
    expectedProductionRef: process.env.EXPECTED_PRODUCTION_PROJECT_ID,
    isolatedProjectRef: process.env.EXPECTED_ISOLATED_SIGNALING_PROJECT_ID,
    accessToken: process.env.SUPABASE_ACCESS_TOKEN,
  });
  console.log("Verified required production security/signaling migration history on approved project " + result.projectRef + ": " + result.verifiedVersions.join(", ") + ".");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error("Production migration-history preflight failed: " + error.message);
    process.exitCode = 1;
  });
}
