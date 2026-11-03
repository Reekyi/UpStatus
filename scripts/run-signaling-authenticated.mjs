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
async function cleanupStaleFixtures() {
  // This runner is hard-pinned to the isolated project. The reserved prefix is
  // used only for temporary CI identities, so clean interrupted prior attempts
  // before provisioning a new set of fixtures.
  const [rooms, users, sessions] = await Promise.all([
    rest("/upstatus_signal_rooms?select=room_id,created_by&created_by=like.__signal_test_%"),
    rest("/users?select=name&name=like.__signal_test_%"),
    rest("/upstatus_sessions?select=user_name&user_name=like.__signal_test_%"),
  ]);
  const roomIds = (rooms || []).filter(row => String(row.created_by || "").startsWith("__signal_test_"))
    .map(row => String(row.room_id || "")).filter(Boolean);
  for (const roomId of roomIds) {
    await rest("/upstatus_signal_rooms?room_id=eq." + encodeURIComponent(roomId), { method: "DELETE" });
  }
  const names = [...new Set([
    ...(users || []).map(row => row.name),
    ...(sessions || []).map(row => row.user_name),
    ...(rooms || []).map(row => row.created_by),
  ].filter(name => typeof name === "string" && name.startsWith("__signal_test_")))];
  for (const name of names) {
    const identity = encodeURIComponent("eq." + name);
    await rest("/upstatus_sessions?user_name=" + identity, { method: "DELETE" });
    await rest("/users?name=" + identity, { method: "DELETE" });
  }
  const [remainingRooms, remainingUsers, remainingSessions] = await Promise.all([
    rest("/upstatus_signal_rooms?select=room_id,created_by&created_by=like.__signal_test_%"),
    rest("/users?select=name&name=like.__signal_test_%"),
    rest("/upstatus_sessions?select=user_name&user_name=like.__signal_test_%"),
  ]);
  const leftovers = [
    ...(remainingRooms || []).filter(row => String(row.created_by || "").startsWith("__signal_test_")),
    ...(remainingUsers || []).filter(row => String(row.name || "").startsWith("__signal_test_")),
    ...(remainingSessions || []).filter(row => String(row.user_name || "").startsWith("__signal_test_")),
  ];
  if (leftovers.length) throw new Error("Stale isolated signaling fixtures could not be fully removed.");
  if (roomIds.length || names.length) console.log("Interrupted isolated test fixtures cleaned and verified.");
}

function token() { return randomBytes(32).toString("base64url"); }
function tokenHash(value) { return createHash("sha256").update(value).digest("hex"); }
const suffix = randomBytes(6).toString("hex");
const users = ["A", "B", "C"].map(letter => ({
  letter, name: "__signal_test_" + letter.toLowerCase() + "_" + suffix, token: token(),
}));
let fixturesMayExist = false;
let testExitCode = 1;
let cleanupFailed = false;

try {
  await cleanupStaleFixtures();
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
  if (testExitCode === 0) {
    console.log("Starting authenticated real-browser WebRTC integration checks.");
    const browserRun = spawnSync(process.execPath, ["scripts/test-signaling-browser.mjs"], { env, stdio: "inherit" });
    testExitCode = browserRun.status === null ? 1 : browserRun.status;
    if (browserRun.error) throw new Error("Could not start browser E2E harness: " + browserRun.error.message);
  }
} catch (error) {
  console.error("Authenticated test setup/runner failed: " + String(error?.message || error));
  testExitCode = 1;
} finally {
  if (fixturesMayExist) {
    // Delete by exact fixture identity instead of a multi-value PostgREST "in" filter.
    // This makes cleanup deterministic and prevents a successful no-op from being
    // reported as complete when a filter is malformed or unexpectedly unmatched.
    for (const user of users) {
      const identity = encodeURIComponent("eq." + user.name);
      const cleanupTasks = [
        () => rest("/upstatus_signal_rooms?created_by=" + identity, { method: "DELETE" }),
        () => rest("/upstatus_sessions?user_name=" + identity, { method: "DELETE" }),
        () => rest("/users?name=" + identity, { method: "DELETE" }),
      ];
      for (const cleanup of cleanupTasks) {
        try { await cleanup(); }
        catch (error) { cleanupFailed = true; console.error("Fixture cleanup failed; inspect only the isolated test project: " + String(error?.message || error)); }
      }
    }
    // Verify that every temporary identity and creator-owned room is gone.
    for (const user of users) {
      const identity = encodeURIComponent("eq." + user.name);
      for (const path of [
        "/upstatus_signal_rooms?select=room_id&created_by=" + identity,
        "/upstatus_sessions?select=token_hash&user_name=" + identity,
        "/users?select=name&name=" + identity,
      ]) {
        try {
          const remaining = await rest(path);
          if (Array.isArray(remaining) && remaining.length) {
            cleanupFailed = true;
            console.error("Fixture cleanup verification failed; temporary records remain in the isolated test project.");
          }
        } catch (error) {
          cleanupFailed = true;
          console.error("Fixture cleanup verification failed; inspect only the isolated test project: " + String(error?.message || error));
        }
      }
    }
    if (!cleanupFailed) console.log("Temporary users, sessions, rooms, memberships, and events cleanup verified.");
  }
}
if (cleanupFailed) process.exit(1);
process.exit(testExitCode);
