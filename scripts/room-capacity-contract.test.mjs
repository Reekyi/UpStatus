#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  roomMemberInviteResultStatus,
  roomMemberAcceptResultStatus,
} from "../supabase/functions/upstatus-signal/http-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => fs.readFileSync(path.join(ROOT, relative), "utf8");
const prodDir = "supabase/functions/upstatus-signal";
const testDir = "supabase/functions/upstatus-signal-test";
const production = read(prodDir + "/index.ts");
const isolated = read(testDir + "/index.ts");
const productionContract = read(prodDir + "/http-contract.mjs");
const isolatedContract = read(testDir + "/http-contract.mjs");
const migration = read("supabase/migrations/20261109010000_enforce_signal_room_member_capacity.sql");
const testMigration = read("supabase/test-migrations/20261109010000_enforce_signal_room_member_capacity_test.sql");

assert.equal(
  production.replace('service: "upstatus-signal"', 'service: "upstatus-signal-test"'),
  isolated,
  "production and isolated signaling handlers must remain identical apart from the health label"
);
assert.equal(productionContract, isolatedContract, "production and isolated HTTP contracts must remain byte-identical");

for (const [result, expected] of [
  [{ error: "INVALID_ARGUMENT" }, 400],
  [{ error: "ROOM_UNAVAILABLE" }, 404],
  [{ error: "UNKNOWN_USER" }, 404],
  [{ error: "ROOM_MEMBER_FORBIDDEN" }, 403],
  [{ error: "ROOM_FULL" }, 409],
  [{ error: "MEMBER_EXISTS" }, 409],
  [Object.create({ error: "ROOM_FULL" }), 500],
  [{ error: { toString: "ROOM_FULL" } }, 500],
  [null, 500],
]) {
  assert.equal(roomMemberInviteResultStatus(result), expected, "invite error mapping mismatch");
}
for (const [result, expected] of [
  [{ error: "INVALID_ARGUMENT" }, 400],
  [{ error: "ROOM_UNAVAILABLE" }, 404],
  [{ error: "INVITATION_NOT_FOUND" }, 404],
  [{ error: "INVITATION_ALREADY_HANDLED" }, 409],
  [{ error: "ROOM_FULL" }, 409],
  [Object.create({ error: "ROOM_FULL" }), 500],
  [{ error: ["ROOM_FULL"] }, 500],
  [null, 500],
]) {
  assert.equal(roomMemberAcceptResultStatus(result), expected, "accept error mapping mismatch");
}

const inviteStart = production.indexOf('if (path.endsWith("/room/invite")) {');
const inviteEnd = production.indexOf('if (path.endsWith("/room/members")) {', inviteStart);
assert(inviteStart >= 0 && inviteEnd > inviteStart, "bounded room invite route missing");
const inviteRoute = production.slice(inviteStart, inviteEnd);
assert(inviteRoute.includes('db.rpc("invite_upstatus_signal_room_member"'), "room invite route must use the transactional invite RPC");
assert(!inviteRoute.includes('db.from("upstatus_signal_room_members")'), "room invite route must not write memberships outside the RPC");

const acceptStart = production.indexOf('if (path.endsWith("/room/accept")) {');
const acceptEnd = production.indexOf('if (path.endsWith("/room/decline")) {', acceptStart);
assert(acceptStart >= 0 && acceptEnd > acceptStart, "bounded room accept route missing");
const acceptRoute = production.slice(acceptStart, acceptEnd);
assert(acceptRoute.includes('db.rpc("accept_upstatus_signal_room_invitation"'), "room accept route must use the transactional accept RPC");
assert(!acceptRoute.includes('db.from("upstatus_signal_room_members")'), "room accept route must not update memberships outside the RPC");

assert(inviteRoute.includes("roomMemberInviteResultStatus"), "invite route must use the shared 409 error mapper");
assert(acceptRoute.includes("roomMemberAcceptResultStatus"), "accept route must use the shared 409 error mapper");
assert(migration.includes("FOR UPDATE") && migration.includes(">= 32") &&
  migration.includes("ROOM_FULL") && migration.includes("SECURITY INVOKER") &&
  migration.includes("SET search_path = ''"), "production migration must lock room-first, cap membership, and use invoker security");
assert(!migration.includes("'reissued', false") && !migration.includes("'memberCount'"),
  "RPC success responses must preserve the existing invite/accept response shape");
assert(testMigration.includes("has_function_privilege") && testMigration.includes("pg_get_functiondef") &&
  testMigration.includes("ROOM_FULL") && testMigration.includes(">= 32"),
  "isolated test migration must verify capacity, lock order, and service-role-only execution");
assert(production.includes('X-UpStatus-Signal-Capacity') && isolated.includes('X-UpStatus-Signal-Capacity'),
  "both handlers must advertise the guarded capacity test contract");
const liveHarness = read("scripts/test-signal-room-capacity.mjs");
assert(liveHarness.includes("verifyIsolatedSupabaseMutationTarget") &&
  liveHarness.includes("UPSTATUS_SIGNAL_ALLOW_MUTATION") &&
  liveHarness.includes("X-UpStatus-Signal-Capacity") &&
  liveHarness.includes("upstatus_signal_voice_room_attempts") &&
  liveHarness.includes("Promise.all") &&
  liveHarness.includes("deleteIn("),
  "live capacity harness must guard the isolated target, preflight the lab, test concurrent accepts, and clean exact fixtures");
console.log("Generic signaling room capacity contract tests passed.");
