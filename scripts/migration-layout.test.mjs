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
  "20261107010000_setup_invites_test.sql",
  "20261107170000_pin_empty_search_path_trigger_broadcasts_test.sql",
  "20261108010000_voice_attempt_singleton_test.sql",
  "20261108050802_voice_attempt_account_scoped_lock_test.sql",
  "20261109230000_setup_invite_rate_limit_test.sql",
]) {
  const testPath = path.join(testMigrationsRoot, name);
  const migrationPath = path.join(migrationsRoot, name);
  assert.equal(existsSync(testPath), true, "isolated test migration missing: " + name);
  assert.equal(existsSync(migrationPath), false, "test migration must not be in supabase/migrations: " + name);
  assert.ok(readFileSync(testPath, "utf8").trim().length > 0, "isolated test migration must not be empty: " + name);
}

const setupInviteRateLimitMigrationPath = path.join(migrationsRoot, "20261109230000_setup_invite_rate_limit.sql");
assert.equal(existsSync(setupInviteRateLimitMigrationPath), true, "production setup-invite rate-limit migration missing");
const setupInviteRateLimitMigration = readFileSync(setupInviteRateLimitMigrationPath, "utf8");
assert.ok(setupInviteRateLimitMigration.includes("consume_upstatus_setup_invite_rate_limit"), "production setup-invite rate-limit RPC missing");

const setupInviteRateLimitTestMigrationPath = path.join(testMigrationsRoot, "20261109230000_setup_invite_rate_limit_test.sql");
assert.equal(existsSync(setupInviteRateLimitTestMigrationPath), true, "isolated setup-invite rate-limit migration missing");
const setupInviteRateLimitTestMigration = readFileSync(setupInviteRateLimitTestMigrationPath, "utf8");

function assertCommentOnlyPrefix(sql, start, label) {
  const unexpected = sql.slice(0, start)
    .split(/\r?\n/)
    .filter(line => line.trim() && !line.trim().startsWith("--"));
  assert.deepEqual(unexpected, [], label + ": unexpected executable SQL before the shared migration block");
}

function normalizeSharedSetupInviteSql(sql) {
  return sql
    .split(/\r?\n/)
    .filter(line => !line.trim().startsWith("--"))
    .map(line => line.trim())
    .filter(Boolean)
    .join("\n");
}

function sharedSetupInviteRateLimitParts(sql, endMarker, label) {
  const startMarker = "CREATE TABLE IF NOT EXISTS public.upstatus_setup_invite_rate_limits";
  const start = sql.indexOf(startMarker);
  assert.notEqual(start, -1, label + ": shared setup-invite DDL/RPC block missing");
  assertCommentOnlyPrefix(sql, start, label);

  const end = sql.indexOf(endMarker, start);
  assert.notEqual(end, -1, label + ": shared setup-invite block terminator missing");
  return {
    block: normalizeSharedSetupInviteSql(sql.slice(start, end)),
    suffix: sql.slice(end),
  };
}

function assertProductionMetadataSuffix(suffix, label) {
  assert.match(
    suffix,
    /^\s*COMMENT ON TABLE public\.upstatus_setup_invite_rate_limits IS\s*'[^']*';\s*COMMENT ON FUNCTION public\.consume_upstatus_setup_invite_rate_limit\(text,\s*integer,\s*integer\) IS\s*'[^']*';\s*$/s,
    label + ": only the expected table/function COMMENT metadata may follow the shared SQL"
  );
}

const expectedIsolatedAssertionSuffix = "DO $test$\nDECLARE\n  v_function oid;\n  v_security_definer boolean;\n  v_search_path text;\n  v_rls boolean;\nBEGIN\n  SELECT p.oid, p.prosecdef,\n         (\n           SELECT pg_catalog.replace(pg_catalog.split_part(setting, '=', 2), '\"', '')\n           FROM pg_catalog.unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS config(setting)\n           WHERE setting LIKE 'search_path=%'\n           LIMIT 1\n         )\n    INTO v_function, v_security_definer, v_search_path\n  FROM pg_catalog.pg_proc p\n  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace\n  WHERE n.nspname = 'public'\n    AND p.proname = 'consume_upstatus_setup_invite_rate_limit'\n    AND pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_bucket_key text, p_limit integer, p_window_seconds integer';\n\n  IF v_function IS NULL THEN RAISE EXCEPTION 'setup invite rate-limit RPC is missing'; END IF;\n  IF v_security_definer THEN RAISE EXCEPTION 'setup invite rate-limit RPC must remain SECURITY INVOKER'; END IF;\n  IF v_search_path IS DISTINCT FROM '' THEN RAISE EXCEPTION 'setup invite rate-limit RPC must pin an empty search_path (got %)', v_search_path; END IF;\n  IF NOT pg_catalog.has_function_privilege('service_role', v_function, 'EXECUTE') THEN RAISE EXCEPTION 'service_role must execute setup invite rate-limit RPC'; END IF;\n  IF pg_catalog.has_function_privilege('anon', v_function, 'EXECUTE') OR pg_catalog.has_function_privilege('authenticated', v_function, 'EXECUTE') THEN\n    RAISE EXCEPTION 'client roles must not execute setup invite rate-limit RPC';\n  END IF;\n\n  SELECT c.relrowsecurity INTO v_rls\n  FROM pg_catalog.pg_class c\n  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace\n  WHERE n.nspname = 'public' AND c.relname = 'upstatus_setup_invite_rate_limits';\n\n  IF NOT COALESCE(v_rls, false) THEN RAISE EXCEPTION 'setup invite rate-limit table must have RLS enabled'; END IF;\n  IF NOT pg_catalog.has_table_privilege('service_role', 'public.upstatus_setup_invite_rate_limits', 'SELECT') OR\n     NOT pg_catalog.has_table_privilege('service_role', 'public.upstatus_setup_invite_rate_limits', 'INSERT') OR\n     NOT pg_catalog.has_table_privilege('service_role', 'public.upstatus_setup_invite_rate_limits', 'UPDATE') OR\n     NOT pg_catalog.has_table_privilege('service_role', 'public.upstatus_setup_invite_rate_limits', 'DELETE') THEN\n    RAISE EXCEPTION 'service_role must retain rate-limit table access';\n  END IF;\n  IF pg_catalog.has_table_privilege('anon', 'public.upstatus_setup_invite_rate_limits', 'SELECT') OR\n     pg_catalog.has_table_privilege('anon', 'public.upstatus_setup_invite_rate_limits', 'INSERT') OR\n     pg_catalog.has_table_privilege('anon', 'public.upstatus_setup_invite_rate_limits', 'UPDATE') OR\n     pg_catalog.has_table_privilege('anon', 'public.upstatus_setup_invite_rate_limits', 'DELETE') OR\n     pg_catalog.has_table_privilege('authenticated', 'public.upstatus_setup_invite_rate_limits', 'SELECT') OR\n     pg_catalog.has_table_privilege('authenticated', 'public.upstatus_setup_invite_rate_limits', 'INSERT') OR\n     pg_catalog.has_table_privilege('authenticated', 'public.upstatus_setup_invite_rate_limits', 'UPDATE') OR\n     pg_catalog.has_table_privilege('authenticated', 'public.upstatus_setup_invite_rate_limits', 'DELETE') THEN\n    RAISE EXCEPTION 'client roles must not access setup invite rate-limit buckets';\n  END IF;\n  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='upstatus_setup_invite_rate_limits') THEN\n    RAISE EXCEPTION 'setup invite rate-limit table must not expose client policies';\n  END IF;\nEND;\n$test$;";

function normalizeIsolatedAssertionSuffix(sql) {
  return sql
    .split(/\r?\n/)
    .filter(line => !line.trim().startsWith("--"))
    .map(line => line.trim())
    .filter(Boolean)
    .join("\n");
}

function assertIsolatedAssertionSuffix(suffix, label) {
  assert.equal(
    normalizeIsolatedAssertionSuffix(suffix),
    normalizeIsolatedAssertionSuffix(expectedIsolatedAssertionSuffix),
    label + ": isolated assertion block must match the reviewed read-only catalog allowlist"
  );
}


// Every executable statement in each file must be accounted for: the common DDL/RPC/grants,
// production metadata comments, or the isolated-only catalog assertion block.
const productionSetupInviteParts = sharedSetupInviteRateLimitParts(
  setupInviteRateLimitMigration, "COMMENT ON TABLE", "production migration"
);
const isolatedSetupInviteParts = sharedSetupInviteRateLimitParts(
  setupInviteRateLimitTestMigration, "DO $test$", "isolated test migration"
);
assert.equal(
  productionSetupInviteParts.block,
  isolatedSetupInviteParts.block,
  "isolated setup-invite rate-limit DDL/RPC/grants must match the production candidate"
);
assertProductionMetadataSuffix(productionSetupInviteParts.suffix, "production migration");
assertIsolatedAssertionSuffix(isolatedSetupInviteParts.suffix, "isolated test migration");

// Guard the guard: unexpected executable statements outside the allowed suffixes must fail.
assert.throws(
  () => assertCommentOnlyPrefix("SELECT 1;\n-- comment\n", 17, "synthetic migration"),
  /unexpected executable SQL/
);
assert.throws(
  () => assertProductionMetadataSuffix("GRANT SELECT ON public.unexpected TO anon;", "synthetic migration"),
  /only the expected table\/function COMMENT metadata/
);
assert.throws(
  () => assertIsolatedAssertionSuffix("DO $test$ BEGIN NULL; END; $test$;\nSELECT 1;", "synthetic migration"),
  /reviewed read-only catalog allowlist/
);
assert.throws(
  () => assertIsolatedAssertionSuffix("DO $test$ BEGIN DROP TABLE public.users; END; $test$;", "synthetic migration"),
  /reviewed read-only catalog allowlist/
);
assert.throws(
  () => assertIsolatedAssertionSuffix("DO $test$ BEGIN EXECUTE 'DROP TABLE public.users'; END; $test$;", "synthetic migration"),
  /reviewed read-only catalog allowlist/
);
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


const broadcastSearchPathMigration = readFileSync(
  path.join(migrationsRoot, '20261107170000_pin_empty_search_path_trigger_broadcasts.sql'), "utf8"
);
const broadcastSearchPathTest = readFileSync(
  path.join(testMigrationsRoot, '20261107170000_pin_empty_search_path_trigger_broadcasts_test.sql'), "utf8"
);
for (const name of ["upstatus_broadcast_messages", "upstatus_broadcast_remote_state", "upstatus_broadcast_users"]) {
  const statement = "ALTER FUNCTION public." + name + "() SET search_path = '';";
  assert.ok(broadcastSearchPathMigration.includes(statement),
    "production migration must pin an empty search_path for " + name);
  assert.ok(broadcastSearchPathTest.includes(statement),
    "isolated test migration must exercise the empty search_path for " + name);
}
assert.ok(broadcastSearchPathTest.includes("has_function_privilege") &&
  broadcastSearchPathTest.includes("pg_get_functiondef") &&
  broadcastSearchPathTest.includes("pg_trigger"),
  "isolated broadcast test must preserve client-role denial, qualified realtime.send, and trigger bindings");

const voiceAttemptLockOrderTest = readFileSync(
  path.join(testMigrationsRoot, "20261108050802_voice_attempt_account_scoped_lock_test.sql"), "utf8"
);
assert.ok(
  voiceAttemptLockOrderTest.includes("upstatus-voice-account:") &&
  voiceAttemptLockOrderTest.includes("upstatus-open-voice:") &&
  voiceAttemptLockOrderTest.includes("FOR v_existing_attempt IN"),
  "isolated voice-attempt lock-order test must verify account scan and retained shared-room lock"
);

console.log("Test migration layout guard passed.");
