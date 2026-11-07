#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { verifyIsolatedSupabaseMutationTarget } from "./assert-isolated-supabase.mjs";

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const projectUrl = await verifyIsolatedSupabaseMutationTarget({
  baseUrl: process.env.SUPABASE_URL,
  serviceKey,
  allowMutation: process.env.UPSTATUS_AUTH_ALLOW_MUTATION,
});
const restUrl = projectUrl + "/rest/v1";
const headers = {
  apikey: serviceKey,
  authorization: "Bearer " + serviceKey,
  "content-type": "application/json",
};
async function rest(path, options = {}) {
  const response = await fetch(restUrl + path, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error("Isolated auth test request failed: HTTP " + response.status + " on " + path.split("?")[0]);
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}
function hash(value) { return createHash("sha256").update(value).digest("hex"); }
function randomToken() { return randomBytes(32).toString("hex"); }

const suffix = randomBytes(8).toString("hex");
const cases = [
  { name: "__auth_test_concurrent_" + suffix, token: randomToken(), expires: new Date(Date.now() + 10 * 60 * 1000).toISOString() },
  { name: "__auth_test_expired_" + suffix, token: randomToken(), expires: new Date(Date.now() - 60 * 1000).toISOString() },
];
const passwordHash = "isolated-test-only:" + randomBytes(32).toString("hex");
let fixturesMayExist = false;

try {
  fixturesMayExist = true;
  await rest("/users", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify(cases.map(item => ({
      name: item.name,
      role: null,
      status: "offline",
      password_hash: null,
      setup_token_hash: hash(item.token),
      setup_token_expires_at: item.expires,
      setup_token_issued_by: "__auth_test_admin",
      setup_token_issued_at: new Date().toISOString(),
      reason: "isolated auth enrollment regression",
      sync: "not_configured",
    }))),
  });

  const concurrent = cases[0];
  const invoke = () => rest("/rpc/consume_upstatus_setup_invite", {
    method: "POST",
    body: JSON.stringify({
      p_user_name: concurrent.name,
      p_setup_token_hash: hash(concurrent.token),
      p_password_hash: passwordHash,
    }),
  });
  const results = await Promise.all([invoke(), invoke()]);
  const winners = results.filter(result => Array.isArray(result) && result.length === 1);
  assert.equal(winners.length, 1, "exactly one concurrent setup attempt must consume the invite");
  assert.equal(winners[0][0].name, concurrent.name);
  assert.equal(winners[0][0].role, "implementation_user", "missing roles must default to a non-admin role");

  const row = await rest("/users?select=name,password_hash,role,setup_token_hash,setup_token_expires_at&name=eq." + encodeURIComponent(concurrent.name));
  assert.equal(row.length, 1);
  assert.equal(row[0].password_hash, passwordHash);
  assert.equal(row[0].role, "implementation_user");
  assert.equal(row[0].setup_token_hash, null);
  assert.equal(row[0].setup_token_expires_at, null);

  const expired = cases[1];
  const expiredResult = await rest("/rpc/consume_upstatus_setup_invite", {
    method: "POST",
    body: JSON.stringify({
      p_user_name: expired.name,
      p_setup_token_hash: hash(expired.token),
      p_password_hash: passwordHash,
    }),
  });
  assert.deepEqual(expiredResult, [], "expired enrollment tokens must not set a password");
  const expiredRow = await rest("/users?select=password_hash,setup_token_hash&name=eq." + encodeURIComponent(expired.name));
  assert.equal(expiredRow[0].password_hash, null);
  assert.equal(expiredRow[0].setup_token_hash, hash(expired.token));

  console.log("Isolated setup enrollment RPC passed: one-time concurrency, role fallback, token consumption, and expiry.");
} finally {
  if (fixturesMayExist) {
    for (const item of cases) {
      await rest("/users?name=eq." + encodeURIComponent(item.name), { method: "DELETE" });
    }
    const remaining = await rest("/users?select=name&name=like.__auth_test_" + suffix + "*");
    assert.deepEqual(remaining, [], "isolated auth enrollment fixtures must be removed");
  }
}
