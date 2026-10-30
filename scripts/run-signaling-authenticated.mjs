#!/usr/bin/env node
/**
 * Provision temporary users/sessions in the isolated test project, run the authenticated
 * signaling integration harness, and remove fixtures in a finally block.
 *
 * Required local environment:
 *   SUPABASE_URL=https://bfpjtfqlnypisxljoxkb.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=<isolated test project service-role/secret key>
 *
 * This script refuses every project URL except the isolated test project. It never prints
 * session tokens or the service key. Run locally; do not commit secrets or paste them in chat.
 */
import { createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

const EXPECTED_ORIGIN = "https://bfpjtfqlnypisxljoxkb.supabase.co";
const projectUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (projectUrl !== EXPECTED_ORIGIN || !serviceKey) {
  console.error("Refusing to run: set SUPABASE_URL to the isolated test project and provide its service-role key locally.");
  process.exit(2);
}
const api = projectUrl + "/rest/v1";
const headers = { apikey: serviceKey, authorization: "Bearer " + serviceKey, "content-type": "application/json" };

async function rest(path, options = {}) {
  const res = await fetch(api + path, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error("Supabase REST request failed with HTTP " + res.status + " on " + path.split("?")[0]);
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}
function token() { return randomBytes(32).toString("base64url"); }
function tokenHash(value) { return createHash("sha256").update(value).digest("hex"); }
const suffix = randomBytes(6).toString("hex");
const users = ["A", "B", "C"].map(letter => ({
  letter, name: "__signal_test_" + letter.toLowerCase() + "_" + suffix, token: token(),
}));
const namesFilter = "in.(" + users.map(u => u.name).join(",") + ")";
let fixturesMayExist = false;
let testExitCode = 1;
let cleanupFailed = false;

try {
  const latest = await rest("/users?select=id&order=id.desc&limit=1");
  const firstId = Number(latest?.[0]?.id || 0) + 1;
  const now = Date.now();
  const expiresAt = new Date(now + 30 * 60 * 1000).toISOString();
  fixturesMayExist = true;
  await rest("/users", {
    method: "POST", headers: { prefer: "return=minimal" },
    body: JSON.stringify(users.map((u, index) => ({
      id: firstId + index, name: u.name, role: "implementation_user", status: "offline",
      reason: "", sync: "not_configured",
    }))),
  });
  await rest("/upstatus_sessions", {
    method: "POST", headers: { prefer: "return=minimal" },
    body: JSON.stringify(users.map(u => ({ token_hash: tokenHash(u.token), user_name: u.name, expires_at: expiresAt }))),
  });
  console.log("Temporary test fixtures created in the isolated project. Session tokens will not be printed.");
  const env = {
    ...process.env,
    UPSTATUS_SIGNAL_URL: EXPECTED_ORIGIN + "/functions/v1/upstatus-signal-test",
    UPSTATUS_SIGNAL_ALLOW_MUTATION: "1",
  };
  for (const user of users) {
    env["UPSTATUS_SIGNAL_USER_" + user.letter + "_NAME"] = user.name;
    env["UPSTATUS_SIGNAL_USER_" + user.letter + "_TOKEN"] = user.token;
  }
  const run = spawnSync(process.execPath, ["scripts/test-signaling-authenticated.mjs"], { env, stdio: "inherit" });
  testExitCode = run.status === null ? 1 : run.status;
  if (run.error) throw new Error("Could not start authenticated harness: " + run.error.message);
} catch (error) {
  console.error("Authenticated test setup/runner failed: " + String(error?.message || error));
  testExitCode = 1;
} finally {
  if (fixturesMayExist) {
    const cleanupTasks = [
      () => rest("/upstatus_signal_rooms?created_by=" + encodeURIComponent(namesFilter), { method: "DELETE" }),
      () => rest("/upstatus_sessions?user_name=" + encodeURIComponent(namesFilter), { method: "DELETE" }),
      () => rest("/users?name=" + encodeURIComponent(namesFilter), { method: "DELETE" }),
    ];
    for (const cleanup of cleanupTasks) {
      try { await cleanup(); }
      catch (error) { cleanupFailed = true; console.error("Fixture cleanup failed; inspect only the isolated test project: " + String(error?.message || error)); }
    }
    if (!cleanupFailed) console.log("Temporary users, sessions, rooms, memberships, and events cleanup completed.");
  }
}
if (cleanupFailed) process.exit(1);
process.exit(testExitCode);
