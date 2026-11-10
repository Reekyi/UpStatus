#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { verifyIsolatedSupabaseMutationTarget } from "./assert-isolated-supabase.mjs";
import { cleanupAuthFixtures } from "./auth-fixture-cleanup.mjs";

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
    redirect: "error",
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
  { name: "__auth_test_concurrent_" + suffix, passwordHash: null, role: null, token: randomToken(), expires: new Date(Date.now() + 10 * 60 * 1000).toISOString() },
  { name: "__auth_test_expired_" + suffix, passwordHash: null, role: null, token: randomToken(), expires: new Date(Date.now() + 10 * 60 * 1000).toISOString() },
  { name: "__auth_test_empty_password_" + suffix, passwordHash: "", role: "", token: randomToken(), expires: new Date(Date.now() + 10 * 60 * 1000).toISOString() },
  { name: "__auth_test_whitespace_role_" + suffix, passwordHash: null, role: " \t\n ", token: randomToken(), expires: new Date(Date.now() + 10 * 60 * 1000).toISOString() },
  { name: "__auth_test_admin_role_" + suffix, passwordHash: null, role: "implementation_admin", token: randomToken(), expires: new Date(Date.now() + 10 * 60 * 1000).toISOString() },
  { name: "__auth_test_padded_admin_role_" + suffix, passwordHash: null, role: " implementation_admin ", token: randomToken(), expires: new Date(Date.now() + 10 * 60 * 1000).toISOString() },
  { name: "__auth_test_configured_" + suffix, passwordHash: "already-configured", role: "implementation_user", token: randomToken(), expires: new Date(Date.now() + 10 * 60 * 1000).toISOString() },
];
const newPasswordHash = "isolated-test-only:" + randomBytes(32).toString("hex");
let fixturesMayExist = false;

async function issueInvite(item) {
  const filters = new URLSearchParams();
  filters.set("name", "eq." + item.name);
  filters.set("or", '(password_hash.is.null,password_hash.eq."")');
  const rows = await rest("/users?" + filters.toString(), {
    method: "PATCH",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({
      setup_token_hash: hash(item.token),
      setup_token_expires_at: item.expires,
      setup_token_issued_by: "__auth_test_admin",
      setup_token_issued_at: new Date().toISOString(),
    }),
  });
  return Array.isArray(rows) ? rows : [];
}
async function consume(item, suppliedHash = hash(item.token)) {
  return await rest("/rpc/consume_upstatus_setup_invite", {
    method: "POST",
    body: JSON.stringify({
      p_user_name: item.name,
      p_setup_token_hash: suppliedHash,
      p_password_hash: newPasswordHash,
    }),
  });
}
async function getUser(name) {
  const rows = await rest("/users?select=name,password_hash,role,setup_token_hash,setup_token_expires_at,setup_token_issued_by,setup_token_issued_at&name=eq." + encodeURIComponent(name));
  return Array.isArray(rows) ? rows[0] : null;
}

let testFailure = null;
try {
  fixturesMayExist = true;
  await rest("/users", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify(cases.map(item => ({
      name: item.name,
      role: item.role,
      status: "offline",
      password_hash: item.passwordHash,
      setup_token_hash: null,
      setup_token_expires_at: null,
      setup_token_issued_by: null,
      setup_token_issued_at: null,
      reason: "isolated auth enrollment regression",
      sync: "not_configured",
    }))),
  });

  const [concurrent, expired, emptyPassword, whitespaceRole, adminRole, paddedAdminRole, configured] = cases;
  for (const item of [concurrent, expired, emptyPassword, whitespaceRole, adminRole, paddedAdminRole]) {
    const issued = await issueInvite(item);
    assert.equal(issued.length, 1, "NULL and empty-string password hashes must both be eligible for invite issuance");
    assert.equal(issued[0].name, item.name);
  }
  const configuredInvite = await issueInvite(configured);
  assert.deepEqual(configuredInvite, [], "configured accounts must not receive a first-access invite");

  const malformed = await consume(concurrent, "not-a-sha256-token");
  assert.deepEqual(malformed, [], "malformed token hashes must not consume an invite");
  const wrong = await consume(concurrent, hash(randomToken()));
  assert.deepEqual(wrong, [], "wrong token hashes must not consume an invite");
  const unchangedAfterWrong = await getUser(concurrent.name);
  assert.equal(unchangedAfterWrong.password_hash, null);
  assert.equal(unchangedAfterWrong.setup_token_hash, hash(concurrent.token));

  const results = await Promise.all([consume(concurrent), consume(concurrent)]);
  const winners = results.filter(result => Array.isArray(result) && result.length === 1);
  assert.equal(winners.length, 1, "exactly one concurrent setup attempt must consume the invite");
  assert.equal(winners[0][0].name, concurrent.name);
  assert.equal(winners[0][0].role, "implementation_user", "missing roles must default to a non-admin role");

  const replay = await consume(concurrent);
  assert.deepEqual(replay, [], "a consumed invite must not be replayable");
  const consumed = await getUser(concurrent.name);
  assert.equal(consumed.password_hash, newPasswordHash);
  assert.equal(consumed.role, "implementation_user");
  assert.equal(consumed.setup_token_hash, null);
  assert.equal(consumed.setup_token_expires_at, null);
  assert.equal(consumed.setup_token_issued_by, null);
  assert.equal(consumed.setup_token_issued_at, null);

  const expiredTime = new Date(Date.now() - 60 * 1000).toISOString();
  await rest("/users?name=eq." + encodeURIComponent(expired.name), {
    method: "PATCH",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({ setup_token_expires_at: expiredTime }),
  });
  const expiredResult = await consume(expired);
  assert.deepEqual(expiredResult, [], "expired enrollment tokens must not set a password");
  const expiredRow = await getUser(expired.name);
  assert.equal(expiredRow.password_hash, null);
  assert.equal(expiredRow.setup_token_hash, hash(expired.token));

  const emptyWrong = await consume(emptyPassword, hash(randomToken()));
  assert.deepEqual(emptyWrong, [], "wrong token must not initialize a legacy empty-string password row");
  const emptyResult = await consume(emptyPassword);
  assert.equal(Array.isArray(emptyResult) && emptyResult.length, 1, "legacy empty-string password rows must be consumable after a valid invite");
  assert.equal(emptyResult[0].role, "implementation_user");
  const emptyRow = await getUser(emptyPassword.name);
  assert.equal(emptyRow.password_hash, newPasswordHash);
  assert.equal(emptyRow.role, "implementation_user", "empty-string roles must default to a non-admin role");
  assert.equal(emptyRow.setup_token_hash, null);
  assert.equal(emptyRow.setup_token_expires_at, null);

  const whitespaceResult = await consume(whitespaceRole);
  assert.equal(Array.isArray(whitespaceResult) && whitespaceResult.length, 1, "whitespace-role accounts must consume a valid invite");
  assert.equal(whitespaceResult[0].role, "implementation_user", "whitespace-only roles must default to a non-admin role");
  const whitespaceRow = await getUser(whitespaceRole.name);
  assert.equal(whitespaceRow.role, "implementation_user");

  const adminResult = await consume(adminRole);
  assert.equal(Array.isArray(adminResult) && adminResult.length, 1, "explicitly provisioned admin role must remain valid");
  assert.equal(adminResult[0].role, "implementation_admin", "valid explicit admin roles must be preserved");

  const paddedAdminResult = await consume(paddedAdminRole);
  assert.equal(Array.isArray(paddedAdminResult) && paddedAdminResult.length, 1, "padded-role account must consume a valid invite");
  assert.equal(paddedAdminResult[0].role, " implementation_admin ", "non-empty role strings must be preserved verbatim");
  assert.notEqual(paddedAdminResult[0].role, "implementation_admin", "whitespace-padded admin text must not become an admin role");
  const paddedAdminRow = await getUser(paddedAdminRole.name);
  assert.equal(paddedAdminRow.role, " implementation_admin ");

} catch (error) {
  testFailure = error;
}

let cleanupFailure = null;
if (fixturesMayExist) {
  try {
    await cleanupAuthFixtures({
      fixtures: cases,
      deleteFixture: item => rest("/users?name=eq." + encodeURIComponent(item.name), { method: "DELETE" }),
      verifyNoFixtures: async () => {
        const pattern = encodeURIComponent("__auth_test_" + suffix + "*");
        const remaining = await rest("/users?select=name&name=like." + pattern);
        assert.deepEqual(remaining, [], "isolated auth enrollment fixtures must be removed");
      },
    });
  } catch (error) {
    cleanupFailure = error;
  }
}

if (testFailure && cleanupFailure) {
  throw new AggregateError([testFailure, cleanupFailure], "AUTH-03 integration and fixture cleanup both failed.");
}
if (testFailure) throw testFailure;
if (cleanupFailure) throw cleanupFailure;

console.log("Isolated setup enrollment passed: NULL/empty eligibility, configured-account denial, malformed/wrong/expired/replayed tokens, one-winner concurrency, NULL/empty/whitespace role fallback, explicit-role preservation, padded-admin non-escalation, and cleanup verified.");
