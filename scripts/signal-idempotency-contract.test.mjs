#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  canonicalSignalRequestJson,
  isValidSignalIdempotencyKey,
  isValidSignalRequestHash,
  signalEventErrorStatus,
} from "../supabase/functions/upstatus-signal/idempotency.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => fs.readFileSync(path.join(ROOT, relative), "utf8");
const prodDir = "supabase/functions/upstatus-signal";
const testDir = "supabase/functions/upstatus-signal-test";
const production = read(prodDir + "/index.ts");
const isolated = read(testDir + "/index.ts");
const migration = read("supabase/migrations/20261109030000_signal_event_idempotency.sql");
const testMigration = read("supabase/test-migrations/20261109030000_signal_event_idempotency_test.sql");
const adapter = read("src/userscript/signaling-transport.mjs");
const adapterTests = read("scripts/signaling-transport.test.mjs");
const capacityHarness = read("scripts/test-signal-room-capacity.mjs");

assert.equal(
  production.replaceAll('service: "upstatus-signal"', 'service: "upstatus-signal-test"'),
  isolated,
  "production and isolated signaling handlers must remain byte-identical apart from the health label"
);
assert.equal(read(prodDir + "/idempotency.mjs"), read(testDir + "/idempotency.mjs"),
  "production and isolated idempotency helpers must remain byte-identical");

assert.equal(isValidSignalIdempotencyKey("a".repeat(32)), true);
assert.equal(isValidSignalIdempotencyKey("A".repeat(32)), false);
assert.equal(isValidSignalIdempotencyKey("a".repeat(31)), false);
assert.equal(isValidSignalIdempotencyKey("a".repeat(33)), false);
assert.equal(isValidSignalIdempotencyKey(["a".repeat(32)]), false);
assert.equal(isValidSignalRequestHash("b".repeat(64)), true);
assert.equal(isValidSignalRequestHash("b".repeat(63)), false);

const firstOrder = { roomId: "sig_1", sender: "ricardo", eventType: "call_signal", payload: { type: "offer", sdp: { type: "offer", sdp: "v=0" } } };
const secondOrder = { payload: { sdp: { sdp: "v=0", type: "offer" }, type: "offer" }, eventType: "call_signal", sender: "ricardo", roomId: "sig_1" };
assert.equal(canonicalSignalRequestJson(firstOrder), canonicalSignalRequestJson(secondOrder),
  "canonical request hashing must ignore object property insertion order");
assert.notEqual(canonicalSignalRequestJson({ items: [1, 2] }), canonicalSignalRequestJson({ items: [2, 1] }),
  "canonical request hashing must preserve array order");

for (const [result, expected] of [
  [{ error: "INVALID_ARGUMENT" }, 400],
  [{ error: "ROOM_UNAVAILABLE" }, 404],
  [{ error: "ROOM_MEMBERSHIP_ENDED" }, 403],
  [{ error: "ROOM_MEMBER_FORBIDDEN" }, 403],
  [{ error: "IDEMPOTENCY_KEY_REUSED" }, 409],
  [{ error: "UNKNOWN_RPC_ERROR" }, 500],
  [null, 500],
  [{ error: 409 }, 500],
  [Object.create({ error: "IDEMPOTENCY_KEY_REUSED" }), 500],
]) {
  assert.equal(signalEventErrorStatus(result), expected, "signal event HTTP error mapping mismatch");
}

function route(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert(start >= 0 && end > start, label + " route block is missing");
  return source.slice(start, end);
}
const requestInviteRoute = route(
  production,
  'if (path.endsWith("/room/request-invite")) {',
  'if (path.endsWith("/room/invitations")) {',
  "request-invite"
);
const signalRoute = route(
  production,
  'if (path.endsWith("/signal")) {',
  'if (path.endsWith("/broadcast")) {',
  "unicast signal"
);
const broadcastRoute = route(
  production,
  'if (path.endsWith("/broadcast")) {',
  'if (path.endsWith("/poll")) {',
  "room broadcast"
);
for (const [label, block] of [
  ["request-invite", requestInviteRoute],
  ["unicast signal", signalRoute],
  ["room broadcast", broadcastRoute],
]) {
  assert(block.includes('db.rpc("enqueue_upstatus_signal_events"'), label + " must use the atomic idempotency RPC");
  assert(block.includes("p_idempotency_key: idempotencyKey"), label + " must persist the client/server idempotency key");
  assert(block.includes("p_request_hash: requestHash"), label + " must bind the key to a canonical request hash");
  assert(!block.includes('db.from("upstatus_signal_events").insert('), label + " must not bypass the idempotency RPC");
}
assert(requestInviteRoute.includes("p_allow_join_request: true"),
  "the non-member join-request exception must be explicitly enabled only on request-invite");
assert(signalRoute.includes("p_allow_join_request: false") && broadcastRoute.includes("p_allow_join_request: false"),
  "ordinary signal routes must require accepted membership");
assert(production.includes("X-UpStatus-Signal-Idempotency") && isolated.includes("X-UpStatus-Signal-Idempotency"),
  "isolated harness version marker must be present in both handlers");
assert(!production.includes('db.from("upstatus_signal_events").insert('),
  "no signal event route may write around the replay ledger");

for (const [fragment, label] of [
  ["CREATE TABLE IF NOT EXISTS public.upstatus_signal_event_idempotency", "ledger table"],
  ["PRIMARY KEY (room_id, sender, idempotency_key)", "scoped unique key"],
  ["ON DELETE CASCADE", "room lifetime cleanup"],
  ["ALTER TABLE public.upstatus_signal_event_idempotency ENABLE ROW LEVEL SECURITY", "RLS"],
  ["REVOKE ALL ON TABLE public.upstatus_signal_event_idempotency FROM PUBLIC, anon, authenticated", "client table revoke"],
  ["SECURITY INVOKER", "invoker security"],
  ["SET search_path = ''", "empty search_path"],
  ["ON CONFLICT (room_id, sender, idempotency_key) DO NOTHING", "atomic deduplication"],
  ["IDEMPOTENCY_KEY_REUSED", "payload conflict rejection"],
  ["FOR SHARE", "membership lock"],
  ["p_allow_join_request", "narrow join-request exception"],
  ["TO service_role", "service-role-only execution"],
]) assert(migration.includes(fragment), "idempotency migration missing " + label);
assert(!migration.includes("DO $test$"), "production migration must not contain test-only assertions");
assert(testMigration.includes("has_function_privilege") && testMigration.includes("pg_get_functiondef") &&
  testMigration.includes("relrowsecurity") && testMigration.includes("TRUNCATE") && testMigration.includes("IDEMPOTENCY_KEY_REUSED"),
  "isolated catalog test must verify table/RPC security and replay behavior");

assert(adapter.includes("createSignalIdempotencyKey") &&
  adapter.includes("resolveSignalIdempotencyKey") &&
  adapter.includes("postIdempotent") &&
  adapter.includes("error.idempotencyKey"),
  "client adapter must generate secure keys and expose the same key for a caller retry");
assert(adapterTests.includes("retrySignalKey") && adapterTests.includes("fanoutKey") &&
  adapterTests.includes("preservedRetryKey"),
  "client tests must cover generated, explicit, fanout and retry-reused keys");
assert(capacityHarness.includes("X-UpStatus-Signal-Idempotency") &&
  capacityHarness.includes("IDEMPOTENCY_KEY_REUSED") &&
  capacityHarness.includes("upstatus_signal_event_idempotency") &&
  capacityHarness.includes("replayedSignal") &&
  capacityHarness.includes("replayedBroadcast"),
  "guarded lab harness must test replay, key conflict, and ledger cleanup");

assert(adapter.includes("pendingRetryKeys") &&
  adapter.includes("inFlightIdempotentRequests") &&
  adapter.includes("retryKeyTtlMs") &&
  adapter.includes("maxIdempotentRetries") &&
  adapter.includes("operationId"),
  "client adapter must retain failed operation keys, coalesce concurrent retries, and bound the retry cache");
assert(adapterTests.includes("automaticRetryCalls") &&
  adapterTests.includes("manualRetryCalls") &&
  adapterTests.includes("concurrentRetryCalls") &&
  adapterTests.includes("expiryRetryCalls") &&
  adapterTests.includes("broadcastRetryCalls"),
  "client tests must cover bounded retry, later key reuse, concurrency, expiry, and room broadcast replay");

console.log("Signal event idempotency contract tests passed.");
