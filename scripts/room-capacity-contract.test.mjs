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
  production.replaceAll('service: "upstatus-signal"', 'service: "upstatus-signal-test"'),
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
function indexAfter(source, needle, start, label) {
  const position = source.indexOf(needle, start);
  assert(position >= 0, label + " is missing");
  return position;
}

const capacityInviteStart = migration.indexOf("CREATE OR REPLACE FUNCTION public.invite_upstatus_signal_room_member");
const capacityInviteEnd = migration.indexOf("REVOKE ALL ON FUNCTION public.invite_upstatus_signal_room_member", capacityInviteStart);
assert(capacityInviteStart >= 0 && capacityInviteEnd > capacityInviteStart, "transactional invite RPC definition missing");
const capacityInviteSql = migration.slice(capacityInviteStart, capacityInviteEnd);
const capacityInviteRoom = indexAfter(capacityInviteSql, "FROM public.upstatus_signal_rooms AS r", 0, "invite room query");
const capacityInviteRoomLock = indexAfter(capacityInviteSql, "FOR UPDATE", capacityInviteRoom, "invite room lock");
const capacityInviteInviter = indexAfter(capacityInviteSql, "FROM public.upstatus_signal_room_members AS m", capacityInviteRoomLock, "inviter membership query");
const capacityInviteInviterLock = indexAfter(capacityInviteSql, "FOR UPDATE", capacityInviteInviter, "inviter membership lock");
const capacityInviteRecipient = indexAfter(capacityInviteSql, "FROM public.upstatus_signal_room_members AS m", capacityInviteInviter + 1, "recipient membership query");
const capacityInviteRecipientLock = indexAfter(capacityInviteSql, "FOR UPDATE", capacityInviteRecipient, "recipient membership lock");
const capacityInviteCount = indexAfter(capacityInviteSql, "SELECT pg_catalog.count(*)", capacityInviteRecipientLock, "invite accepted-member count");
const capacityInviteWrites = [
  capacityInviteSql.indexOf("UPDATE public.upstatus_signal_room_members AS m", capacityInviteCount),
  capacityInviteSql.indexOf("INSERT INTO public.upstatus_signal_room_members", capacityInviteCount),
].filter(position => position >= 0);
assert.equal(capacityInviteWrites.length, 2, "invite RPC must retain both declined-member reissue and new-member insert paths");
const capacityInviteFirstWrite = Math.min(...capacityInviteWrites);
const capacityInviteOrder = [capacityInviteRoom, capacityInviteRoomLock, capacityInviteInviter, capacityInviteInviterLock, capacityInviteRecipient, capacityInviteRecipientLock, capacityInviteCount, capacityInviteFirstWrite];
assert(capacityInviteOrder.every((position, index) => index === 0 || position > capacityInviteOrder[index - 1]),
  "invite RPC must lock room -> inviter -> recipient, count accepted members, then write");

const capacityAcceptStart = migration.indexOf("CREATE OR REPLACE FUNCTION public.accept_upstatus_signal_room_invitation");
const capacityAcceptEnd = migration.indexOf("REVOKE ALL ON FUNCTION public.accept_upstatus_signal_room_invitation", capacityAcceptStart);
assert(capacityAcceptStart >= 0 && capacityAcceptEnd > capacityAcceptStart, "transactional accept RPC definition missing");
const capacityAcceptSql = migration.slice(capacityAcceptStart, capacityAcceptEnd);
const capacityAcceptRoom = indexAfter(capacityAcceptSql, "FROM public.upstatus_signal_rooms AS r", 0, "accept room query");
const capacityAcceptRoomLock = indexAfter(capacityAcceptSql, "FOR UPDATE", capacityAcceptRoom, "accept room lock");
const capacityAcceptMember = indexAfter(capacityAcceptSql, "FROM public.upstatus_signal_room_members AS m", capacityAcceptRoomLock, "accept membership query");
const capacityAcceptMemberLock = indexAfter(capacityAcceptSql, "FOR UPDATE", capacityAcceptMember, "accept membership lock");
const capacityAcceptCount = indexAfter(capacityAcceptSql, "SELECT pg_catalog.count(*)", capacityAcceptMemberLock, "accept accepted-member count");
const capacityAcceptUpdate = indexAfter(capacityAcceptSql, "UPDATE public.upstatus_signal_room_members AS m", capacityAcceptCount, "accept membership update");
const capacityAcceptOrder = [capacityAcceptRoom, capacityAcceptRoomLock, capacityAcceptMember, capacityAcceptMemberLock, capacityAcceptCount, capacityAcceptUpdate];
assert(capacityAcceptOrder.every((position, index) => index === 0 || position > capacityAcceptOrder[index - 1]),
  "accept RPC must lock room -> invitation, count accepted members, then update");

assert(testMigration.includes("has_function_privilege") && testMigration.includes("pg_get_functiondef") &&
  testMigration.includes("v_inviter_lock_pos") && testMigration.includes("v_recipient_lock_pos") &&
  testMigration.includes("v_member_lock_pos") && testMigration.includes("ROOM_FULL") &&
  testMigration.includes(">= 32"),
  "isolated catalog test must verify every row lock, count ordering, capacity, and service-role-only execution");

const liveHarness = read("scripts/test-signal-room-capacity.mjs");
assert(liveHarness.includes("verifyIsolatedSupabaseMutationTarget") &&
  liveHarness.includes("UPSTATUS_SIGNAL_ALLOW_MUTATION") &&
  liveHarness.includes("X-UpStatus-Signal-Capacity") &&
  liveHarness.includes("X-UpStatus-Signal-Idempotency") &&
  liveHarness.includes(' + "/ready"') &&
  liveHarness.includes('"X-UpStatus-Signal-Readiness"') &&
  liveHarness.includes('"database-v2"') &&
  liveHarness.includes("upstatus_signal_voice_room_attempts") &&
  liveHarness.includes("Promise.all") &&
  liveHarness.includes("Promise.allSettled") &&
  liveHarness.includes("AggregateError") &&
  liveHarness.includes("deleteIn(") &&
  liveHarness.includes("assertTableEmpty("),
  "live capacity harness must require DB readiness, guard the isolated target, race accepts, attempt all cleanup steps, and assert empty postconditions");
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
  "upstatus_signal_event_idempotency",
]) {
  assert(liveHarness.includes(`"${table}"`), "cleanup/preflight table missing: " + table);
}
assert(liveHarness.includes("tables.map(assertTableEmpty)") && liveHarness.includes("postflight.forEach"), "cleanup must verify every preflight table even after individual DELETE failures");
console.log("Generic signaling room capacity contract tests passed.");
