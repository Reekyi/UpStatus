#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { verifyIsolatedSupabaseMutationTarget } from "./assert-isolated-supabase.mjs";

const baseUrl = process.env.SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const allowMutation = process.env.UPSTATUS_SIGNAL_ALLOW_MUTATION || "";
const origin = await verifyIsolatedSupabaseMutationTarget({ baseUrl, serviceKey, allowMutation });
const endpoint = new URL(process.env.UPSTATUS_SIGNAL_URL || origin + "/functions/v1/upstatus-signal-test");
if (endpoint.origin !== origin || endpoint.pathname !== "/functions/v1/upstatus-signal-test" ||
    endpoint.search || endpoint.hash || endpoint.username || endpoint.password) {
  throw new Error("Refusing room-capacity fixtures: only the allowlisted upstatus-signal-test endpoint is permitted.");
}

async function readRest(path) {
  const response = await fetch(origin + "/rest/v1/" + path.replace(/^\//, ""), {
    method: "GET",
    headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, Accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error("Read-only lab preflight failed with HTTP " + response.status + ": " + text.slice(0, 300));
  return text ? JSON.parse(text) : [];
}
async function rest(path, method, body) {
  const headers = { apikey: serviceKey, Authorization: "Bearer " + serviceKey, Accept: "application/json" };
  const options = { method, headers, redirect: "error", signal: AbortSignal.timeout(10000) };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    headers.Prefer = "return=minimal";
    options.body = JSON.stringify(body);
  } else if (method === "DELETE") {
    headers.Prefer = "return=minimal";
  }
  const response = await fetch(origin + "/rest/v1/" + path.replace(/^\//, ""), options);
  const text = await response.text();
  if (!response.ok) throw new Error("Lab fixture " + method + " failed with HTTP " + response.status + ": " + text.slice(0, 500));
  return text ? JSON.parse(text) : null;
}
async function call(name, token, route, body) {
  const response = await fetch(endpoint.toString().replace(/\/$/, "") + route, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upstatus-token": token },
    body: JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  let result = null;
  try { result = await response.json(); } catch {}
  return { status: response.status, body: result, name };
}
function inFilter(values) {
  return "in.(" + values.join(",") + ")";
}
async function deleteIn(table, column, values) {
  if (!values.length) return;
  await rest("/" + table + "?" + column + "=" + encodeURIComponent(inFilter(values)), "DELETE");
}
async function assertTableEmpty(table) {
  const rows = await readRest(table + "?select=*&limit=1");
  assert.equal(rows.length, 0, "fixture cleanup left rows in " + table);
}

const health = await fetch(endpoint.toString().replace(/\/$/, "") + "/health", {
  method: "GET", redirect: "error", signal: AbortSignal.timeout(10000),
});
if (!health.ok || health.headers.get("X-UpStatus-Signal-Capacity") !== "room-capacity-v1") {
  throw new Error("Refusing fixture writes: the isolated endpoint is not the reviewed room-capacity-v1 candidate.");
}
const emptyChecks = await Promise.all([
  readRest("upstatus_signal_rooms?select=room_id"),
  readRest("upstatus_signal_room_members?select=room_id"),
  readRest("upstatus_signal_room_bindings?select=*"),
  readRest("upstatus_signal_events?select=*"),
  readRest("upstatus_signal_call_attempts?select=*"),
  readRest("upstatus_signal_voice_room_attempts?select=*"),
  readRest("upstatus_signal_rate_limits?select=bucket_key"),
  readRest("upstatus_sessions?select=user_name"),
  readRest("users?select=name"),
]);
if (emptyChecks.some(rows => rows.length !== 0)) {
  throw new Error("Refusing room-capacity fixtures: the isolated lab is not empty; coordinate with the active QA run first.");
}

const suffix = randomBytes(8).toString("hex");
function label(index) {
  let n = index + 1, value = "";
  while (n > 0) { n--; value = String.fromCharCode(65 + (n % 26)) + value; n = Math.floor(n / 26); }
  return value;
}
const names = Array.from({ length: 35 }, (_, index) => "__signal_capacity_" + suffix + "_" + label(index));
const tokens = names.map(() => randomBytes(32).toString("base64url"));
const tokenByName = new Map(names.map((name, index) => [name, tokens[index]]));
const bucketKeys = names.flatMap(name => [name + ":read", name + ":write"]);
let roomId = "";
let fixturesCreated = false;
let failed = false;

try {
  fixturesCreated = true;
  const userRows = names.map(name => ({ name, role: "implementation_user", status: "offline" }));
  await rest("/users", "POST", userRows);
  const sessions = names.map((name, index) => ({
    user_name: name,
    token_hash: createHash("sha256").update(tokens[index]).digest("hex"),
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  }));
  await rest("/upstatus_sessions", "POST", sessions);

  const tooMany = await call(names[0], tokens[0], "/room/create", { participants: names.slice(1, 33) });
  assert.equal(tooMany.status, 400, "room/create must reject 33 total participants");

  const created = await call(names[0], tokens[0], "/room/create", { participants: names.slice(1, 31) });
  assert.equal(created.status, 201, "room/create with 31 total participants must succeed");
  roomId = created.body?.roomId;
  assert.equal(typeof roomId, "string", "room/create must return roomId");

  for (const name of names.slice(1, 31)) {
    const accepted = await call(name, tokenByName.get(name), "/room/accept", { roomId });
    assert.equal(accepted.status, 200, "initial room invitation should be accepted by " + name);
  }

  for (const name of names.slice(31, 34)) {
    const invited = await call(names[0], tokens[0], "/room/invite", { roomId, recipient: name });
    assert.equal(invited.status, 201, "invitation below capacity should succeed for " + name);
  }

  const raced = await Promise.all(
    names.slice(31, 33).map(name => call(name, tokenByName.get(name), "/room/accept", { roomId }))
  );
  assert.deepEqual(raced.map(item => item.status).sort((a, b) => a - b), [200, 409],
    "concurrent accepts at capacity must produce exactly one winner");
  const loser = raced.find(item => item.status === 409);
  assert.equal(loser?.body?.error, "ROOM_FULL", "the losing concurrent accept must report ROOM_FULL");

  const thirdAccept = await call(names[33], tokens[33], "/room/accept", { roomId });
  assert.equal(thirdAccept.status, 409, "remaining pending invitation must not exceed room capacity");
  assert.equal(thirdAccept.body?.error, "ROOM_FULL");

  const fullInvite = await call(names[0], tokens[0], "/room/invite", { roomId, recipient: names[34] });
  assert.equal(fullInvite.status, 409, "full room must reject a new invitation");
  assert.equal(fullInvite.body?.error, "ROOM_FULL");

  const members = await call(names[0], tokens[0], "/room/members", { roomId });
  assert.equal(members.status, 200);
  assert.equal(members.body?.members?.length, 32, "room/members must expose exactly the accepted capacity");

  const rows = await readRest("upstatus_signal_room_members?room_id=eq." + encodeURIComponent(roomId) + "&select=user_name,status");
  const acceptedCount = rows.filter(row => row.status === "accepted").length;
  const pendingCount = rows.filter(row => row.status === "pending").length;
  assert.equal(acceptedCount, 32, "database must contain exactly 32 accepted members");
  assert.equal(pendingCount, 2, "losing and third invitations must remain pending");
  assert.equal(rows.length, 34, "database must retain the two pending invitations without exceeding accepted capacity");

  console.log("Room-capacity integration passed: 32 accepted, concurrent accept had one winner, full-room invite/accept returned 409.");
} catch (error) {
  failed = true;
  throw error;
} finally {
  if (fixturesCreated) {
    // Remove only rows associated with the unique fixture names/room, in FK-safe order.
    await deleteIn("upstatus_signal_events", "room_id", roomId ? [roomId] : []);
    await deleteIn("upstatus_signal_events", "sender", names);
    await deleteIn("upstatus_signal_events", "recipient", names);
    await deleteIn("upstatus_signal_room_bindings", "room_id", roomId ? [roomId] : []);
    await deleteIn("upstatus_signal_room_bindings", "created_by", names);
    await deleteIn("upstatus_signal_call_attempts", "room_id", roomId ? [roomId] : []);
    await deleteIn("upstatus_signal_call_attempts", "created_by", names);
    await deleteIn("upstatus_signal_call_attempts", "recipient", names);
    await deleteIn("upstatus_signal_voice_room_attempts", "room_id", roomId ? [roomId] : []);
    await deleteIn("upstatus_signal_voice_room_attempts", "created_by", names);
    await deleteIn("upstatus_signal_room_members", "user_name", names);
    await deleteIn("upstatus_signal_rooms", "room_id", roomId ? [roomId] : []);
    await deleteIn("upstatus_signal_rooms", "created_by", names);
    await deleteIn("upstatus_sessions", "user_name", names);
    await deleteIn("upstatus_signal_rate_limits", "bucket_key", bucketKeys);
    await deleteIn("users", "name", names);

    for (const table of [
      "users",
      "upstatus_sessions",
      "upstatus_signal_rooms",
      "upstatus_signal_room_members",
      "upstatus_signal_room_bindings",
      "upstatus_signal_events",
      "upstatus_signal_call_attempts",
      "upstatus_signal_voice_room_attempts",
      "upstatus_signal_rate_limits",
    ]) {
      await assertTableEmpty(table);
    }
  }
  if (failed) console.error("Room-capacity fixture cleanup completed after a failed assertion; inspect the isolated test log.");
}
