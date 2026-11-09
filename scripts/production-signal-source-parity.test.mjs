#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { voiceRoomOpenResultStatus as productionVoiceRoomOpenResultStatus } from "../supabase/functions/upstatus-signal/http-contract.mjs";
import { voiceRoomOpenResultStatus as isolatedVoiceRoomOpenResultStatus } from "../supabase/functions/upstatus-signal-test/http-contract.mjs";
import { signalDatabaseReadinessStatus as productionReadinessStatus } from "../supabase/functions/upstatus-signal/readiness.mjs";
import { signalDatabaseReadinessStatus as isolatedReadinessStatus } from "../supabase/functions/upstatus-signal-test/readiness.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => fs.readFileSync(path.join(ROOT, relative), "utf8");
const prodDir = "supabase/functions/upstatus-signal";
const testDir = "supabase/functions/upstatus-signal-test";
const production = read(prodDir + "/index.ts");
const isolated = read(testDir + "/index.ts");

assert.equal(
  production.replaceAll('service: "upstatus-signal"', 'service: "upstatus-signal-test"'),
  isolated,
  "production signaling handler must remain byte-identical to the reviewed isolated handler apart from its health label"
);
assert.equal((production.match(/service: "upstatus-signal"/g) || []).length, (isolated.match(/service: "upstatus-signal-test"/g) || []).length, "production and isolated service labels must have matching counts");
assert(!production.includes("upstatus-signal-test"), "production handler must not identify itself as the test function");
assert.equal(read(prodDir + "/body.mjs"), read(testDir + "/body.mjs"), "bounded JSON body parser drifted");
assert.equal(read(prodDir + "/legacy-envelope.mjs"), read(testDir + "/legacy-envelope.mjs"), "legacy envelope allowlist drifted");
assert.equal(read(prodDir + "/http-contract.mjs"), read(testDir + "/http-contract.mjs"), "voice-room HTTP status mapper drifted");
assert.equal(read(prodDir + "/idempotency.mjs"), read(testDir + "/idempotency.mjs"), "signal idempotency helper drifted");
assert.equal(read(prodDir + "/readiness.mjs"), read(testDir + "/readiness.mjs"), "database readiness helper drifted");
assert.equal(productionReadinessStatus({ ready: true, schemaVersion: "signal-v1", missing: [] }, null), 200, "production readiness helper must accept a complete database result");
assert.equal(isolatedReadinessStatus({ ready: false, schemaVersion: "signal-v1", missing: ["table:public.upstatus_signal_rooms"] }, null), 503, "isolated readiness helper must reject missing dependencies");

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
  "20261108190000_distributed_signaling_rate_limit.sql",
  "20261109010000_enforce_signal_room_member_capacity.sql",
  "20261109030000_signal_event_idempotency.sql",
  "20261109040000_signal_database_readiness.sql"
];
for (const file of requiredMigrations) {
  assert(fs.existsSync(path.join(ROOT, "supabase/migrations", file)), "missing production signaling migration: " + file);
}

const idempotencyMigration = read("supabase/migrations/20261109030000_signal_event_idempotency.sql");
for (const [fragment, label] of [
  ["CREATE TABLE IF NOT EXISTS public.upstatus_signal_event_idempotency", "idempotency ledger"],
  ["PRIMARY KEY (room_id, sender, idempotency_key)", "room-scoped sender key"],
  ["ON DELETE CASCADE", "room-lifetime replay retention"],
  ["SECURITY INVOKER", "invoker security"],
  ["SET search_path = ''", "empty search_path"],
  ["ON CONFLICT (room_id, sender, idempotency_key) DO NOTHING", "atomic deduplication"],
  ["IDEMPOTENCY_KEY_REUSED", "key/payload conflict"],
  ["FOR SHARE", "membership authorization lock"],
  ["TO service_role", "service-role-only execution"]
]) assert(idempotencyMigration.includes(fragment), "idempotency migration missing " + label);
assert(!idempotencyMigration.includes("DO $test$"), "production idempotency migration must not contain test assertions");
assert(production.includes('db.rpc("enqueue_upstatus_signal_events"'), "signal routes must enqueue through the idempotency RPC");
assert(production.includes('db.rpc("upstatus_signal_readiness"'), "GET /ready must call the database readiness RPC");
assert(!production.includes('db.from("upstatus_signal_events").insert('), "signal events must not bypass the idempotency RPC");

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
for (const [label, route] of [
  ["production", productionOpenRoute],
  ["isolated", isolatedOpenRoute],
]) {
  assert(route.includes('db.rpc("open_upstatus_signal_voice_room_attempt"'), label + " /room/open route must call the attempt RPC when an attempt ID is supplied");
  assert(route.includes('if (Object.hasOwn(result, "error")) {'), label + " /room/open route must detect only an own RPC error field");
  assert(route.includes('typeof result.error === "string" && result.error.length > 0'), label + " /room/open route must not coerce malformed error values");
  assert(!route.includes("String(result.error)"), label + " /room/open route must avoid unsafe error coercion");
  assert(route.includes("const status = voiceRoomOpenResultStatus(result);"), label + " /room/open route must use the executable HTTP status mapper");
  assert(route.includes('return response({ error: code, memberCount: result.memberCount }, status);'), label + " /room/open route must use the checked status mapping in its HTTP response");
}

const voiceRoomOpenStatusCases = [
  ["INVALID_LOGICAL_ID", 400],
  ["INVALID_ARGUMENT", 400],
  ["INVALID_ATTEMPT_ID", 400],
  ["UNKNOWN_USER", 404],
  ["VOICE_ROOM_OPEN_CANCELLED", 410],
  ["VOICE_ROOM_UNAVAILABLE", 410],
  ["VOICE_ROOM_MEMBERSHIP_ENDED", 410],
  ["VOICE_ATTEMPT_CONFLICT", 409],
  ["VOICE_ATTEMPT_ALREADY_ACTIVE", 409],
  ["ROOM_FULL", 409],
  ["UNEXPECTED_RPC_ERROR", 500],
  ["constructor", 500],
  ["toString", 500],
  ["__proto__", 500],
];
for (const [code, expected] of voiceRoomOpenStatusCases) {
  assert.equal(productionVoiceRoomOpenResultStatus({ error: code }), expected, "production mapper status for " + code);
  assert.equal(isolatedVoiceRoomOpenResultStatus({ error: code }), expected, "isolated mapper status for " + code);
}
const inheritedError = Object.create({ error: "ROOM_FULL" });
const malformedResults = [
  null,
  undefined,
  [],
  "VOICE_ATTEMPT_ALREADY_ACTIVE",
  {},
  { error: "" },
  { error: 409 },
  { error: true },
  { error: ["ROOM_FULL"] },
  { error: { toString: "ROOM_FULL" } },
  inheritedError,
];
for (const malformed of malformedResults) {
  assert.equal(productionVoiceRoomOpenResultStatus(malformed), 500, "production mapper must fail closed for malformed results");
  assert.equal(isolatedVoiceRoomOpenResultStatus(malformed), 500, "isolated mapper must fail closed for malformed results");
}

console.log("PASS production signaling source parity, database readiness, executable voice-room HTTP status mapping, custom-token config, migration prerequisites, bounded rate limit, and server-derived membership guards");
