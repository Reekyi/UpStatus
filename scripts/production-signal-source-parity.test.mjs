#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => fs.readFileSync(path.join(ROOT, relative), "utf8");
const prodDir = "supabase/functions/upstatus-signal";
const testDir = "supabase/functions/upstatus-signal-test";
const production = read(prodDir + "/index.ts");
const isolated = read(testDir + "/index.ts");

assert.equal(
  production.replace('service: "upstatus-signal"', 'service: "upstatus-signal-test"'),
  isolated,
  "production signaling handler must remain byte-identical to the reviewed isolated handler apart from its health label"
);
assert.equal((production.match(/service: "upstatus-signal"/g) || []).length, 1, "production health label must be unique");
assert(!production.includes("upstatus-signal-test"), "production handler must not identify itself as the test function");
assert.equal(read(prodDir + "/body.mjs"), read(testDir + "/body.mjs"), "bounded JSON body parser drifted");
assert.equal(read(prodDir + "/legacy-envelope.mjs"), read(testDir + "/legacy-envelope.mjs"), "legacy envelope allowlist drifted");

const config = read("supabase/config.toml");
const configBlock = config.match(/^\[functions\.upstatus-signal\]\nverify_jwt = false$/m);
assert(configBlock, "upstatus-signal must explicitly preserve custom x-upstatus-token authentication");
assert.equal((config.match(/^\[functions\.upstatus-signal\]$/gm) || []).length, 1, "upstatus-signal config section must not be duplicated");

const requiredMigrations = [
  "20261029205000_server_mediated_signaling.sql",
  "20261030120000_signal_room_invitation_consent.sql",
  "20261030150000_signal_membership_legacy_default.sql",
  "20261030190000_allow_legacy_signaling_envelopes.sql",
  "20261030192000_signal_room_bindings.sql",
  "20261103171000_index_signal_room_bindings_created_by.sql",
  "20261105190000_open_voice_room_membership.sql",
  "20261106080200_call_room_attempt_recovery.sql",
  "20261106111000_call_attempt_foreign_key_indexes.sql",
  "20261106120500_voice_room_attempt_recovery.sql",
  "20261108010000_voice_attempt_singleton.sql",
  "20261108050751_voice_attempt_account_scoped_lock.sql",
  "20261108190000_distributed_signaling_rate_limit.sql"
];
for (const file of requiredMigrations) {
  assert(fs.existsSync(path.join(ROOT, "supabase/migrations", file)), "missing production signaling migration: " + file);
}

const rateLimitMigration = read("supabase/migrations/20261108190000_distributed_signaling_rate_limit.sql");
for (const [fragment, label] of [
  ["CREATE TABLE IF NOT EXISTS public.upstatus_signal_rate_limits", "rate-limit table"],
  ["SECURITY INVOKER", "invoker security"],
  ["SET search_path = ''", "empty search_path"],
  ["LIMIT 100", "bounded cleanup"],
  ["FOR UPDATE SKIP LOCKED", "concurrent cleanup safety"],
  ["FROM PUBLIC, anon, authenticated", "client privilege revocation"],
  ["TO service_role", "service-role-only grants"]
]) assert(rateLimitMigration.includes(fragment), "rate-limit migration missing " + label);
assert(!rateLimitMigration.includes("DO $test$"), "production migration must not contain test fixtures");

assert(production.includes('req.headers.get("x-upstatus-token")'), "signaling handler must authenticate the UpStatus session token");
assert(production.includes("consume_upstatus_signal_rate_limit"), "signaling handler must use the distributed rate limiter");
assert(production.includes("isMember(roomId, sender)") && production.includes("isMember(roomId, recipient)"), "unicast signaling must verify both room memberships");
function extractVoiceRoomOpenRoute(source, label) {
  const start = source.indexOf('if (path.endsWith("/room/open")) {');
  const end = source.indexOf('if (path.endsWith("/room/cancel-open")) {', start);
  assert(start >= 0 && end > start, label + " must contain a bounded /room/open route block");
  return source.slice(start, end);
}

const productionOpenRoute = extractVoiceRoomOpenRoute(production, "production signaling handler");
const isolatedOpenRoute = extractVoiceRoomOpenRoute(isolated, "isolated signaling handler");
const voiceAttemptConflictMapping = /code === "VOICE_ATTEMPT_CONFLICT"\\s*\\|\\|\\s*code === "VOICE_ATTEMPT_ALREADY_ACTIVE"\\s*\\|\\|\\s*code === "ROOM_FULL"\\s*\\?\\s*409\\s*:\\s*500/;
for (const [label, route] of [
  ["production", productionOpenRoute],
  ["isolated", isolatedOpenRoute],
]) {
  assert(route.includes('db.rpc("open_upstatus_signal_voice_room_attempt"'), label + " /room/open route must call the attempt RPC when an attempt ID is supplied");
  assert(voiceAttemptConflictMapping.test(route), label + " /room/open route must map VOICE_ATTEMPT_ALREADY_ACTIVE to HTTP 409");
  assert(route.includes('return response({ error: code, memberCount: result.memberCount }, status);'), label + " /room/open route must use the checked status mapping in its HTTP response");
}

console.log("PASS production signaling source parity, custom-token config, migration prerequisites, bounded rate limit, and server-derived membership guards");
