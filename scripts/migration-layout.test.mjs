#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsRoot = path.join(ROOT, "supabase/migrations");
const testMigrationsRoot = path.join(ROOT, "supabase/test-migrations");

function listFiles(directory) {
  if (!existsSync(directory)) return [];
  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...listFiles(fullPath));
    else if (entry.isFile()) found.push(fullPath);
  }
  return found;
}

const misplaced = listFiles(migrationsRoot)
  .filter(file => /(?:^|[_-])test\.sql$/i.test(file))
  .map(file => path.relative(ROOT, file).replaceAll(path.sep, "/"));

assert.deepEqual(misplaced, [], "test-only SQL must stay outside supabase/migrations (the Supabase CLI discovery path)");

for (const name of [
  "20261104152847_atomic_chat_read_receipts_and_visual_config_grants_test.sql",
  "20261104154623_distributed_signaling_rate_limit_test.sql",
  "20261106191000_bounded_rate_limit_cleanup_test.sql",
  "20261105150000_postgres_public_default_privileges_test.sql",
  "20261105170000_postgres_global_function_default_scope_test.sql",
  "20261106080200_call_room_attempt_recovery_test.sql",
  "20261106111000_call_attempt_foreign_key_indexes_test.sql",
  "20261106120500_voice_room_attempt_recovery_test.sql",
]) {
  const testPath = path.join(testMigrationsRoot, name);
  const migrationPath = path.join(migrationsRoot, name);
  assert.equal(existsSync(testPath), true, "isolated test migration missing: " + name);
  assert.equal(existsSync(migrationPath), false, "test migration must not be in supabase/migrations: " + name);
  assert.ok(readFileSync(testPath, "utf8").trim().length > 0, "isolated test migration must not be empty: " + name);
}

const readmePath = path.join(testMigrationsRoot, "README.md");
assert.equal(existsSync(readmePath), true, "isolated test migration safety README missing");
const readmeText = readFileSync(readmePath, "utf8");
assert.ok(readmeText.includes("bfpjtfqlnypisxljoxkb"), "test migration allowlist project ref missing");
assert.ok(readmeText.includes("Never apply these files"), "test migration production exclusion warning missing");


const callAttemptIndexMigration = readFileSync(
  path.join(migrationsRoot, "20261106111000_call_attempt_foreign_key_indexes.sql"), "utf8"
);
const callAttemptIndexTest = readFileSync(
  path.join(testMigrationsRoot, "20261106111000_call_attempt_foreign_key_indexes_test.sql"), "utf8"
);
for (const column of ["created_by", "recipient", "room_id"]) {
  const indexName = "upstatus_signal_call_attempts_" + column + "_idx";
  assert.ok(callAttemptIndexMigration.includes("CREATE INDEX IF NOT EXISTS " + indexName),
    "production migration must add the call-attempt foreign-key index: " + column);
  assert.ok(callAttemptIndexMigration.includes("(" + column + ")"),
    "call-attempt index must lead with the foreign-key column: " + column);
}
assert.ok(callAttemptIndexTest.includes("indisvalid") && callAttemptIndexTest.includes("indisready") && callAttemptIndexTest.includes("indkey[0]"),
  "isolated call-attempt index test must verify valid leading-key indexes");

const boundedRateLimitCleanupTest = readFileSync(
  path.join(testMigrationsRoot, "20261106191000_bounded_rate_limit_cleanup_test.sql"), "utf8"
);
assert.ok(boundedRateLimitCleanupTest.includes("LIMIT 100"),
  "rate-limit cleanup must delete at most 100 stale buckets per request");
assert.match(boundedRateLimitCleanupTest, /FOR UPDATE SKIP LOCKED/i,
  "bounded cleanup must skip rows already locked by concurrent cleanup");
assert.match(boundedRateLimitCleanupTest, /v_remaining <> 50/i,
  "isolated SQL regression must prove that 150 stale buckets leave exactly 50 after cleanup");
assert.ok(
  boundedRateLimitCleanupTest.includes("v_preexisting_stale <> 0") &&
  boundedRateLimitCleanupTest.includes("zero pre-existing stale buckets"),
  "isolated SQL regression must reject pre-existing stale rows so its 150-to-50 assertion is deterministic"
);

console.log("Test migration layout guard passed.");
