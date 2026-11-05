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

for (const name of ["20261104152847_atomic_chat_read_receipts_and_visual_config_grants_test.sql","20261104154623_distributed_signaling_rate_limit_test.sql"]) {
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

console.log("Test migration layout guard passed.");
