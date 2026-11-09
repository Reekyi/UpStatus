#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  signalDatabaseReadinessStatus as productionStatus,
  createSignalReadinessProbe,
} from "../supabase/functions/upstatus-signal/readiness.mjs";
import { signalDatabaseReadinessStatus as isolatedStatus } from "../supabase/functions/upstatus-signal-test/readiness.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => fs.readFileSync(path.join(ROOT, relative), "utf8");
const production = read("supabase/functions/upstatus-signal/index.ts");
const isolated = read("supabase/functions/upstatus-signal-test/index.ts");
const previousMigration = read("supabase/migrations/20261109040000_signal_database_readiness.sql");
const migration = read("supabase/migrations/20261109050000_signal_database_readiness_integrity.sql");
const testMigration = read("supabase/test-migrations/20261109050000_signal_database_readiness_integrity_test.sql");
const harness = read("scripts/test-signal-room-capacity.mjs");

assert.equal(
  read("supabase/functions/upstatus-signal/readiness.mjs"),
  read("supabase/functions/upstatus-signal-test/readiness.mjs"),
  "production and isolated readiness helpers must remain byte-identical"
);

const cases = [
  [{ ready: true, schemaVersion: "signal-v2", missing: [] }, null, 200],
  [{ ready: false, schemaVersion: "signal-v2", missing: ["constraint:public.upstatus_signal_event_idempotency:p:room_id,sender,idempotency_key"] }, null, 503],
  [{ ready: true, schemaVersion: "signal-v1", missing: [] }, null, 503],
  [{ ready: true, schemaVersion: "signal-v2", missing: ["index:upstatus_signal_events_recipient_expiry_idx"] }, null, 503],
  [null, null, 503],
  [[], null, 503],
  [{ ready: true, schemaVersion: "signal-v2" }, null, 503],
  [{ ready: true, schemaVersion: "signal-v2", missing: [] }, { message: "database unavailable" }, 503],
];
for (const [data, error, expected] of cases) {
  assert.equal(productionStatus(data, error), expected, "production readiness status");
  assert.equal(isolatedStatus(data, error), expected, "isolated readiness status");
}

for (const [label, source] of [["production", production], ["isolated", isolated]]) {
  const start = source.indexOf('if (req.method === "GET" && path.endsWith("/ready")) {');
  const end = source.indexOf('  try {\n    if (req.method !== "POST")', start);
  assert(start >= 0 && end > start, label + " handler must expose GET /ready before POST-only dispatch");
  const route = source.slice(start, end);
  assert(route.includes("getSignalReadinessStatus()"), label + " /ready must use the bounded readiness probe");
  assert(route.includes('"X-UpStatus-Signal-Readiness": "database-v2"'), label + " /ready must expose the v2 readiness marker only when ready");
  assert(!route.includes("missing:"), label + " /ready must not expose internal missing-dependency details");
  assert(source.includes("createSignalReadinessProbe") && source.includes("ttlMs: 5000"),
    label + " handler must use the reviewed five-second per-isolate cache");
  const healthStart = source.indexOf('if (req.method === "GET" && path.endsWith("/health"))');
  assert(healthStart >= 0 && healthStart < start, label + " liveness /health must remain separate");
  const healthRoute = source.slice(healthStart, start);
  assert(!healthRoute.includes("getSignalReadinessStatus"), label + " liveness /health must not claim database readiness");
}

for (const [fragment, label] of [
  ["CREATE OR REPLACE FUNCTION public.upstatus_signal_readiness()", "readiness RPC"],
  ["STABLE", "stable read-only function"],
  ["SECURITY INVOKER", "invoker security"],
  ["SET search_path = ''", "empty search_path"],
  ["pg_catalog.to_regclass", "required table checks"],
  ["pg_catalog.to_regprocedure", "required RPC checks"],
  ["pg_catalog.has_table_privilege", "service-role table grants"],
  ["pg_catalog.has_schema_privilege('service_role', 'public', 'USAGE')", "service-role public schema usage"],
  ["pg_catalog.has_function_privilege", "service-role RPC grants"],
  ["required_constraints", "constraint inventory"],
  ["pg_catalog.pg_constraint", "constraint catalog inspection"],
  ["pg_catalog.pg_get_indexdef", "exact index-definition checks"],
  ["indisvalid", "valid index check"],
  ["indisready", "ready index check"],
  ["confdeltype", "foreign-key delete action check"],
  ["upstatus_signal_event_idempotency", "idempotency dependency"],
  ["enqueue_upstatus_signal_events", "idempotent enqueue dependency"],
  ["'schemaVersion', 'signal-v2'", "readiness schema version"],
  ["FROM PUBLIC, anon, authenticated", "client execution revocation"],
  ["TO service_role", "service-role-only execution"],
]) {
  assert(migration.includes(fragment), "integrity readiness migration missing " + label);
}
assert(previousMigration.includes("pg_catalog.has_schema_privilege('service_role', 'public', 'USAGE')"),
  "previous schema-usage guard must remain in migration history");
assert(testMigration.includes("upstatus_signal_event_idempotency") &&
  testMigration.includes("room_id','sender','idempotency_key") &&
  testMigration.includes("upstatus_signal_events_recipient_expiry_idx") &&
  testMigration.includes("upstatus_signal_events_room_idx") &&
  testMigration.includes("v_result ->> 'schemaVersion' IS DISTINCT FROM 'signal-v2'"),
  "isolated readiness test must assert the idempotency key, event indexes and v2 readiness result");

assert(harness.includes(' + "/ready"') &&
  harness.includes('"X-UpStatus-Signal-Readiness"') &&
  harness.includes('"database-v2"') &&
  harness.indexOf(' + "/ready"') < harness.indexOf("const suffix = randomBytes"),
  "fixture harness must require database readiness before creating any fixtures");
assert(harness.includes("Promise.allSettled") && harness.includes("AggregateError"),
  "fixture cleanup must continue after individual failures and aggregate cleanup errors");

let clock = 1000;
let calls = 0;
let nextResult = { data: { ready: true, schemaVersion: "signal-v2", missing: [] }, error: null };
const probe = createSignalReadinessProbe({
  ttlMs: 5000,
  now: () => clock,
  rpc: async () => {
    calls++;
    if (calls === 3) throw new Error("database unavailable");
    return nextResult;
  },
});
const concurrent = await Promise.all([probe(), probe()]);
assert.deepEqual(concurrent, [200, 200], "concurrent readiness calls must share one in-flight RPC");
assert.equal(calls, 1, "concurrent readiness calls must not fan out to the database");
clock = 5999;
assert.equal(await probe(), 200, "readiness result must be cached inside the five-second window");
assert.equal(calls, 1);
nextResult = { data: { ready: false, schemaVersion: "signal-v2", missing: ["index:missing"] }, error: null };
clock = 6000;
assert.equal(await probe(), 503, "expired cache must refresh and fail closed");
assert.equal(calls, 2);
clock = 10999;
assert.equal(await probe(), 503, "negative readiness result must also be briefly cached");
assert.equal(calls, 2);
clock = 11000;
assert.equal(await probe(), 503, "RPC exceptions must fail closed");
assert.equal(calls, 3);

console.log("Signal database readiness integrity contract tests passed.");
