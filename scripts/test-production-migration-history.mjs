#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  assertRequiredSetupMigrationsApplied,
  verifyProductionMigrationHistory,
} from "./verify-production-migrations.mjs";

const PRODUCTION_REF = "dlfvkawaiqduhlazsszm";
const ISOLATED_REF = "bfpjtfqlnypisxljoxkb";
const TOKEN = "offline-test-token";

const required = [
  { version: "20261107010000", name: "setup_invites" },
  { version: "20261107060000", name: "normalize_setup_invite_role" },
  { version: "20261107062000", name: "preserve_setup_invite_roles_verbatim" },
];
const applied = [
  { version: "20261005160000", name: "upstatus_cloud" },
  ...required,
];

function fakeResponse({ status = 200, payload = applied, jsonError = null } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      if (jsonError) throw jsonError;
      return payload;
    },
  };
}

function options(overrides = {}) {
  return {
    projectRef: PRODUCTION_REF,
    expectedProductionRef: PRODUCTION_REF,
    isolatedProjectRef: ISOLATED_REF,
    accessToken: TOKEN,
    fetchImpl: async () => fakeResponse(),
    ...overrides,
  };
}

async function rejects(promise, pattern, label) {
  await assert.rejects(promise, pattern, label);
}

// The ledger contract is exact on migration version and name, while allowing
// unrelated previously-applied migrations to remain in production history.
assert.deepEqual(
  assertRequiredSetupMigrationsApplied(applied),
  required.map(item => item.version),
  "all required AUTH-03 versions and names must match",
);

assert.throws(
  () => assertRequiredSetupMigrationsApplied(applied.filter(item => item.version !== required[1].version)),
  /missing: 20261107060000_normalize_setup_invite_role/,
  "a missing required migration must fail closed",
);

assert.throws(
  () => assertRequiredSetupMigrationsApplied(applied.map(item =>
    item.version === required[0].version ? { ...item, name: "unexpected_name" } : item
  )),
  /name mismatch: 20261107010000 expected setup_invites but found unexpected_name/,
  "a migration name mismatch must fail closed",
);

assert.throws(
  () => assertRequiredSetupMigrationsApplied([...applied, { ...applied[0] }]),
  /duplicate migration version 20261005160000/,
  "duplicate migration versions must fail closed",
);

assert.throws(
  () => assertRequiredSetupMigrationsApplied([{ version: "not-a-version", name: "bad" }, ...required]),
  /malformed migration-history entry/,
  "malformed ledger entries must fail closed",
);

assert.throws(
  () => assertRequiredSetupMigrationsApplied(null),
  /invalid migration-history response/,
  "a non-array ledger response must fail closed",
);

// Successful preflight must use exactly one read-only Management API GET.
{
  const calls = [];
  const result = await verifyProductionMigrationHistory(options({
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return fakeResponse();
    },
  }));

  assert.deepEqual(result, {
    projectRef: PRODUCTION_REF,
    verifiedVersions: required.map(item => item.version),
  });
  assert.equal(calls.length, 1, "preflight must make one request");
  assert.equal(
    calls[0].url,
    "https://api.supabase.com/v1/projects/" + PRODUCTION_REF + "/database/migrations",
  );
  assert.equal(calls[0].init.method, "GET", "preflight must remain read-only");
  assert.equal(calls[0].init.headers.Authorization, "Bearer " + TOKEN);
  assert.equal(calls[0].init.headers.Accept, "application/json");
  assert.equal(calls[0].init.redirect, "error");
  assert.equal(Object.hasOwn(calls[0].init, "body"), false, "preflight must not send a request body");
}

// Never call the API when project identity or token prerequisites are invalid.
{
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return fakeResponse(); };

  await rejects(
    verifyProductionMigrationHistory(options({ projectRef: ISOLATED_REF, fetchImpl })),
    /does not match the approved production project/,
    "isolated project must never be accepted as production",
  );
  await rejects(
    verifyProductionMigrationHistory(options({ accessToken: " ", fetchImpl })),
    /SUPABASE_ACCESS_TOKEN is required/,
    "missing Management API token must fail before network access",
  );
  await rejects(
    verifyProductionMigrationHistory(options({ projectRef: "bad-ref", fetchImpl })),
    /references are missing or malformed/,
    "malformed project references must fail before network access",
  );
  assert.equal(calls, 0, "invalid preflight inputs must not call the Management API");
}

// Permission, HTTP, transport, and JSON failures must all block the cutover.
await rejects(
  verifyProductionMigrationHistory(options({
    fetchImpl: async () => fakeResponse({ status: 403 }),
  })),
  /HTTP 403.*database_migrations_read/,
  "403 must explain the required read scope",
);

await rejects(
  verifyProductionMigrationHistory(options({
    fetchImpl: async () => fakeResponse({ status: 401 }),
  })),
  /HTTP 401; refusing deployment/,
  "401 must fail closed",
);

await rejects(
  verifyProductionMigrationHistory(options({
    fetchImpl: async () => { throw new Error("simulated network failure"); },
  })),
  /request failed; refusing deployment/,
  "network failure must fail closed",
);

await rejects(
  verifyProductionMigrationHistory(options({
    fetchImpl: async () => fakeResponse({ jsonError: new Error("invalid JSON") }),
  })),
  /invalid migration-history JSON; refusing deployment/,
  "invalid JSON must fail closed",
);

await rejects(
  verifyProductionMigrationHistory(options({
    fetchImpl: async () => fakeResponse({ payload: { migrations: applied } }),
  })),
  /invalid migration-history response/,
  "unexpected response shape must fail closed",
);

await rejects(
  verifyProductionMigrationHistory(options({
    fetchImpl: async () => fakeResponse({
      payload: applied.filter(item => item.version !== required[2].version),
    }),
  })),
  /not applied to production.*missing: 20261107062000_preserve_setup_invite_roles_verbatim/,
  "missing AUTH-03 migration must block the preflight",
);

console.log("PASS production migration-history preflight: exact version/name checks, project isolation, read-only GET, token/scope, HTTP, transport, JSON and malformed-ledger failures.");
