#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { signalDatabaseReadinessStatus as productionStatus } from "../supabase/functions/upstatus-signal/readiness.mjs";
import { signalDatabaseReadinessStatus as isolatedStatus } from "../supabase/functions/upstatus-signal-test/readiness.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => fs.readFileSync(path.join(ROOT, relative), "utf8");
const production = read("supabase/functions/upstatus-signal/index.ts");
const isolated = read("supabase/functions/upstatus-signal-test/index.ts");
const migration = read("supabase/migrations/20261109040000_signal_database_readiness.sql");
const testMigration = read("supabase/test-migrations/20261109040000_signal_database_readiness_test.sql");

assert.equal(
  read("supabase/functions/upstatus-signal/readiness.mjs"),
  read("supabase/functions/upstatus-signal-test/readiness.mjs"),
  "production and isolated readiness helpers must remain byte-identical"
);

const cases = [
  [{ ready: true, schemaVersion: "signal-v1", missing: [] }, null, 200],
  [{ ready: false, schemaVersion: "signal-v1", missing: ["table:public.upstatus_signal_rooms"] }, null, 503],
  [{ ready: true, schemaVersion: "signal-v0", missing: [] }, null, 503],
  [{ ready: true, schemaVersion: "signal-v1", missing: ["routine:public.enqueue_upstatus_signal_events"] }, null, 503],
  [null, null, 503],
  [[], null, 503],
  [{ ready: true, schemaVersion: "signal-v1" }, null, 503],
  [{ ready: true, schemaVersion: "signal-v1", missing: [] }, { message: "database unavailable" }, 503],
];
for (const [data, error, expected] of cases) {
  assert.equal(productionStatus(data, error), expected, "production readiness status");
  assert.equal(isolatedStatus(data, error), expected, "isolated readiness status");
}

for (const [label, source] of [["production", production], ["isolated", isolated]]) {
  const start = source.indexOf('if (req.method === "GET" && path.endsWith("/ready")) {');
  const end = source.indexOf('if (req.method !== "POST")', start);
  assert(start >= 0 && end > start, label + " handler must expose a bounded GET /ready route before POST-only dispatch");
  const route = source.slice(start, end);
  assert(route.includes('db.rpc("upstatus_signal_readiness")'), label + " /ready must query the database readiness RPC");
  assert(route.includes("signalDatabaseReadinessStatus(data, error)"), label + " /ready must fail closed on database/RPC errors");
  assert(route.includes("}, 503)"), label + " /ready must return 503 while dependencies are missing");
  assert(route.includes('"X-UpStatus-Signal-Readiness": "database-v1"'), label + " /ready must expose the reviewed readiness marker only when ready");
  assert(!route.includes("missing:"), label + " /ready must not expose internal missing-dependency details");
  const healthStart = source.indexOf('if (req.method === "GET" && path.endsWith("/health"))');
  assert(healthStart >= 0 && healthStart < start, label + " liveness /health must remain separate from /ready");
  const healthRoute = source.slice(healthStart, start);
  assert(!healthRoute.includes("upstatus_signal_readiness"), label + " liveness /health must not claim database readiness");
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
  ["prosecdef", "no SECURITY DEFINER handler RPCs"],
  ["provolatile", "VOLATILE handler RPCs"],
  ["search_path=\"\"", "empty search_path on handler RPCs"],
  ["pg_catalog.has_function_privilege('anon'", "no anon RPC execution"],
  ["pg_catalog.has_function_privilege('authenticated'", "no authenticated RPC execution"],
  ["upstatus_signal_event_idempotency", "idempotency dependency"],
  ["enqueue_upstatus_signal_events", "idempotent enqueue dependency"],
  ["FROM PUBLIC, anon, authenticated", "client execution revocation"],
  ["TO service_role", "service-role-only execution"],
]) {
  assert(migration.includes(fragment), "production readiness migration missing " + label);
}
assert(testMigration.includes("pg_catalog.has_schema_privilege('service_role', 'public', 'USAGE')"),
  "isolated readiness migration must verify service_role schema usage");
assert(testMigration.includes("v_result ->> 'ready'") && testMigration.includes("pg_catalog.jsonb_array_length"),
  "isolated readiness migration must execute the readiness contract and require zero missing dependencies");

console.log("Signal database readiness contract tests passed.");
