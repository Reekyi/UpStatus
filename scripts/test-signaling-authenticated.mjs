#!/usr/bin/env node
/**
 * Opt-in authenticated integration test for the isolated UpStatus signaling prototype.
 *
 * Required environment:
 *   UPSTATUS_SIGNAL_URL=https://bfpjtfqlnypisxljoxkb.supabase.co/functions/v1/upstatus-signal-test
 *   UPSTATUS_SIGNAL_ALLOW_MUTATION=1
 *   UPSTATUS_SIGNAL_USER_A_NAME=...
 *   UPSTATUS_SIGNAL_USER_A_TOKEN=...
 *   UPSTATUS_SIGNAL_USER_B_NAME=...
 *   UPSTATUS_SIGNAL_USER_B_TOKEN=...
 *   UPSTATUS_SIGNAL_USER_C_NAME=...       # valid user who is NOT in the test room
 *   UPSTATUS_SIGNAL_USER_C_TOKEN=...
 *
 * Tokens are read only from environment variables and never printed.
 * This script intentionally refuses non-test project URLs.
 */
const base = (process.env.UPSTATUS_SIGNAL_URL || "").replace(/\/$/, "");
const required = [
  "UPSTATUS_SIGNAL_USER_A_NAME", "UPSTATUS_SIGNAL_USER_A_TOKEN",
  "UPSTATUS_SIGNAL_USER_B_NAME", "UPSTATUS_SIGNAL_USER_B_TOKEN",
  "UPSTATUS_SIGNAL_USER_C_NAME", "UPSTATUS_SIGNAL_USER_C_TOKEN",
];
if (!base || required.some(k => !process.env[k])) {
  console.error("Missing test URL or one of the three test-user name/token pairs.");
  process.exit(2);
}
if (process.env.UPSTATUS_SIGNAL_ALLOW_MUTATION !== "1") {
  console.error("Refusing to create test data. Set UPSTATUS_SIGNAL_ALLOW_MUTATION=1 to opt in.");
  process.exit(2);
}
const parsed = new URL(base);
if (parsed.protocol !== "https:" || parsed.hostname !== "bfpjtfqlnypisxljoxkb.supabase.co" ||
    !parsed.pathname.endsWith("/functions/v1/upstatus-signal-test")) {
  console.error("Refusing to run: URL must target the isolated upstatus-security-test project.");
  process.exit(2);
}
const projectUrlRaw = process.env.SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!projectUrlRaw || !serviceKey) { console.error("Missing isolated Supabase URL or service-role key for database contract probes."); process.exit(2); }
const projectUrl = new URL(projectUrlRaw);
if (projectUrl.protocol !== "https:" || projectUrl.hostname !== "bfpjtfqlnypisxljoxkb.supabase.co" || projectUrl.pathname !== "/") {
  console.error("Refusing database contract probes outside the isolated signaling project."); process.exit(2);
}
const users = {
  A: { name: process.env.UPSTATUS_SIGNAL_USER_A_NAME, token: process.env.UPSTATUS_SIGNAL_USER_A_TOKEN },
  B: { name: process.env.UPSTATUS_SIGNAL_USER_B_NAME, token: process.env.UPSTATUS_SIGNAL_USER_B_TOKEN },
  C: { name: process.env.UPSTATUS_SIGNAL_USER_C_NAME, token: process.env.UPSTATUS_SIGNAL_USER_C_TOKEN },
};
if (new Set(Object.values(users).map(u => u.name)).size !== 3) {
  console.error("The three test-user names must be distinct.");
  process.exit(2);
}
async function request(user, route, body) {
  const res = await fetch(base + route, {
    method: "POST",
    headers: { "content-type": "application/json", "x-upstatus-token": user.token },
    body: JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}
async function requestRaw(user, route, rawBody) {
  const res = await fetch(base + route, {
    method: "POST",
    headers: { "content-type": "application/json", "x-upstatus-token": user.token },
    body: rawBody,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}
async function serviceRpc(name, payload) {
  if (!["open_upstatus_signal_voice_room", "open_upstatus_signal_voice_room_attempt", "cancel_upstatus_signal_voice_room_attempt"].includes(name)) throw new Error("Unexpected isolated RPC probe");
  const res = await fetch(projectUrl.origin + "/rest/v1/rpc/" + name, {
    method: "POST",
    headers: { apikey: serviceKey, authorization: "Bearer " + serviceKey, "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}
function makeVoiceAttemptIdFor(user, label) {
  const prefix = user.name.replace(/[^A-Za-z0-9._:-]/g, "_").slice(0, 80) + "-voice-";
  return prefix + label + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}
function makeVoiceAttemptId(label) { return makeVoiceAttemptIdFor(users.A, label); }
const results = [];
let roomId = "";
let declineRoomId = "";
let conflictRoomId = "";
let leaveRoomId = "";
let parallelRoomOneId = "";
let parallelRoomTwoId = "";
let voiceRoomId = "";
let raceRoomId = "";
let capacityRoomId = "";
let crossAccountRoomId = "";
const voiceAttemptCleanup = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " (" + detail + ")" : ""}`);
}
try {
  const created = await request(users.A, "/room/create", { participants: [users.B.name] });
  roomId = created.json?.roomId || "";
  check("user A can create a room with user B", created.status === 201 && created.json?.ok === true &&
    Array.isArray(created.json?.participants) && created.json.participants.includes(users.A.name) &&
    created.json.participants.includes(users.B.name) && !created.json.participants.includes(users.C.name),
    `HTTP ${created.status}`);

  if (roomId) {
    const malformedBody = await requestRaw(users.A, "/signal", "{");
    check("authenticated malformed JSON is rejected as a client error", malformedBody.status === 400,
      `HTTP ${malformedBody.status}`);

    const oversizedBody = await requestRaw(users.A, "/signal", JSON.stringify({
      roomId, recipient: users.B.name, eventType: "offer", payload: { sdp: "x".repeat(21 * 1024) },
    }));
    check("authenticated oversized body is rejected before processing", oversizedBody.status === 413,
      `HTTP ${oversizedBody.status}`);

    let deepPayload = { keep: true };
    for (let i = 0; i < 66; i++) deepPayload = { child: deepPayload };
    const tooDeep = await request(users.A, "/signal", {
      roomId, recipient: users.B.name, eventType: "offer", payload: deepPayload,
    });
    check("excessively nested signaling payload is rejected", tooDeep.status === 400,
      `HTTP ${tooDeep.status}`);

    const tooWide = await request(users.A, "/signal", {
      roomId, recipient: users.B.name, eventType: "offer", payload: { items: Array(4100).fill(0) },
    });
    check("excessively wide signaling payload is rejected", tooWide.status === 400,
      `HTTP ${tooWide.status}`);

    const bInvitations = await request(users.B, "/room/invitations", {});
    const bInviteList = Array.isArray(bInvitations.json?.invitations) ? bInvitations.json.invitations : [];
    check("invited user can discover their pending room invitation",
      bInvitations.status === 200 && bInviteList.some(invite => invite.roomId === roomId),
      `HTTP ${bInvitations.status}`);

    const cInvitations = await request(users.C, "/room/invitations", {});
    const cInviteList = Array.isArray(cInvitations.json?.invitations) ? cInvitations.json.invitations : [];
    check("uninvited user cannot discover another room invitation",
      cInvitations.status === 200 && !cInviteList.some(invite => invite.roomId === roomId),
      `HTTP ${cInvitations.status}`);

    const pendingPoll = await request(users.B, "/poll", { roomId });
    check("invited user cannot poll before accepting the room", pendingPoll.status === 403,
      `HTTP ${pendingPoll.status}`);

    const uninvitedAccept = await request(users.C, "/room/accept", { roomId });
    check("user without an invitation cannot accept a room", uninvitedAccept.status === 404,
      `HTTP ${uninvitedAccept.status}`);

    const pendingStatus = await request(users.A, "/room/status", { roomId });
    check("room creator can see pending invitation status", pendingStatus.status === 200 &&
      pendingStatus.json?.participants?.some(p => p.name === users.B.name && p.status === "pending"),
      "HTTP " + pendingStatus.status);
    const nonCreatorStatus = await request(users.B, "/room/status", { roomId });
    check("non-creator cannot inspect room invitation status", nonCreatorStatus.status === 403,
      "HTTP " + nonCreatorStatus.status);

    const accepted = await request(users.B, "/room/accept", { roomId });
    check("invited user can explicitly accept the room", accepted.status === 200 &&
      accepted.json?.ok === true && accepted.json?.status === "accepted", `HTTP ${accepted.status}`);

    const acceptedStatus = await request(users.A, "/room/status", { roomId });
    check("room creator sees accepted membership before signaling", acceptedStatus.status === 200 &&
      acceptedStatus.json?.participants?.some(p => p.name === users.B.name && p.status === "accepted"),
      "HTTP " + acceptedStatus.status);

    const acceptedMembers = await request(users.B, "/room/members", { roomId });
    check("accepted member can list accepted room participants", acceptedMembers.status === 200 &&
      acceptedMembers.json?.members?.includes(users.A.name) && acceptedMembers.json?.members?.includes(users.B.name),
      "HTTP " + acceptedMembers.status);
    const pendingMembers = await request(users.C, "/room/members", { roomId });
    check("non-member cannot list accepted room participants", pendingMembers.status === 404,
      "HTTP " + pendingMembers.status);

    const logicalCallId = "call-" + roomId;
    const bound = await request(users.A, "/room/bind", { roomId, bindingType: "call", logicalId: logicalCallId });
    check("room creator can bind a logical call ID", bound.status === 201 && bound.json?.roomId === roomId,
      `HTTP ${bound.status}`);
    const boundAgain = await request(users.A, "/room/bind", { roomId, bindingType: "call", logicalId: logicalCallId });
    check("binding the same logical call ID is idempotent", boundAgain.status === 200 &&
      boundAgain.json?.existing === true, `HTTP ${boundAgain.status}`);
    const resolved = await request(users.B, "/room/resolve", { bindingType: "call", logicalId: logicalCallId });
    check("accepted member can resolve the logical call ID", resolved.status === 200 &&
      resolved.json?.roomId === roomId, `HTTP ${resolved.status}`);
    const joinRequest = await request(users.C, "/room/request-invite", { bindingType: "call", logicalId: logicalCallId });
    check("non-member can request invitation to a discoverable active call", joinRequest.status === 202 &&
      joinRequest.json?.status === "pending", `HTTP ${joinRequest.status}`);
    const duplicateJoinRequest = await request(users.C, "/room/request-invite", { bindingType: "call", logicalId: logicalCallId });
    check("duplicate join request is rejected", duplicateJoinRequest.status === 409, `HTTP ${duplicateJoinRequest.status}`);
    const creatorRequests = await request(users.A, "/poll", { roomId });
    const joinRequestEvent = (creatorRequests.json?.events || []).find(e =>
      e.event_type === "call_signal" && e.sender === users.C.name && e.payload?.type === "join_request");
    check("room creator receives the authenticated join request", creatorRequests.status === 200 && !!joinRequestEvent &&
      joinRequestEvent.payload?.callId === logicalCallId, `HTTP ${creatorRequests.status}`);
    if (joinRequestEvent) await request(users.A, "/ack", { roomId, eventIds: [joinRequestEvent.event_id] });

    const unauthorizedBind = await request(users.B, "/room/bind", { roomId, bindingType: "call", logicalId: "spoofed-" + roomId });
    check("non-creator cannot bind a logical room", unauthorizedBind.status === 403, `HTTP ${unauthorizedBind.status}`);
    const invalidBindingType = await request(users.A, "/room/bind", { roomId, bindingType: "admin", logicalId: logicalCallId });
    check("unsupported logical binding type is rejected", invalidBindingType.status === 400, `HTTP ${invalidBindingType.status}`);
    const missingResolve = await request(users.B, "/room/resolve", { bindingType: "call", logicalId: "missing-" + roomId });
    check("unknown logical binding is not resolved", missingResolve.status === 404, `HTTP ${missingResolve.status}`);
    const conflictRoom = await request(users.A, "/room/create", { participants: [users.B.name] });
    conflictRoomId = conflictRoom.json?.roomId || "";
    check("creator can create a second room for binding conflict coverage",
      conflictRoom.status === 201 && !!conflictRoomId, `HTTP ${conflictRoom.status}`);
    if (conflictRoomId) {
      const conflictBind = await request(users.A, "/room/bind", {
        roomId: conflictRoomId, bindingType: "call", logicalId: logicalCallId,
      });
      check("active logical call binding cannot be hijacked by another room",
        conflictBind.status === 409, `HTTP ${conflictBind.status}`);
      const closeConflict = await request(users.A, "/room/close", { roomId: conflictRoomId });
      check("temporary conflict room can be closed", closeConflict.status === 200, `HTTP ${closeConflict.status}`);
    } else {
      check("active logical call binding cannot be hijacked by another room", false, "second room creation failed");
      check("temporary conflict room can be closed", false, "second room creation failed");
    }

    const broadcast = await request(users.A, "/broadcast", {
      roomId, eventType: "call_signal", payload: { type: "presence", from: users.C.name, participants: [users.C.name] },
    });
    check("server broadcast fans out only to accepted members", broadcast.status === 202 && broadcast.json?.delivered === 1,
      "HTTP " + broadcast.status + ", delivered=" + broadcast.json?.delivered);
    const broadcastPoll = await request(users.B, "/poll", { roomId });
    const presenceEvent = (broadcastPoll.json?.events || []).find(e => e.event_type === "call_signal" && e.payload?.type === "presence");
    check("broadcast payload identity claims are stripped", broadcastPoll.status === 200 && !!presenceEvent &&
      presenceEvent.sender === users.A.name && !("from" in presenceEvent.payload) && !("participants" in presenceEvent.payload),
      "HTTP " + broadcastPoll.status);
    if (presenceEvent) await request(users.B, "/ack", { roomId, eventIds: [presenceEvent.event_id] });

    const sent = await request(users.A, "/signal", {
      roomId, recipient: users.B.name, eventType: "offer",
      payload: { sdp: "synthetic-test-offer", from: "spoofed-name", sender: "spoofed-name",
        user: "spoofed-name", user_name: "spoofed-name", to: users.C.name,
        target: users.C.name, roomId: "forged-room", room_id: "forged-room",
        participants: [users.C.name], identity: "spoofed-name", created_by: "spoofed-name",
        metadata: { Sender: "nested-spoof", nested: { userId: users.C.name, sdpVersion: 1 } },
        recipient: users.C.name, sender_id: "spoofed-name", userId: users.C.name, user_id: users.C.name },
    });
    check("room member can submit a recipient-scoped signal", sent.status === 202 && sent.json?.ok === true,
      `HTTP ${sent.status}`);

    const delivered = await request(users.B, "/poll", { roomId });
    const events = Array.isArray(delivered.json?.events) ? delivered.json.events : [];
    const event = events.find(e => e.event_type === "offer" && e.sender === users.A.name);
    const payload = event?.payload || {};
    const stripped = ["from", "sender", "user", "user_name", "to", "target", "roomId",
      "room_id", "participants", "identity", "created_by", "recipient", "sender_id",
      "userId", "user_id"].every(k => !(k in payload));
    const nestedPayload = payload.metadata || {};
    const nestedStripped = !("Sender" in nestedPayload) && !("userId" in (nestedPayload.nested || {})) && nestedPayload.nested?.sdpVersion === 1;
    check("user B receives the event with server-derived sender and stripped identity claims",
      delivered.status === 200 && !!event && payload.sdp === "synthetic-test-offer" && stripped && nestedStripped,
      `HTTP ${delivered.status}`);

    const nonmemberSend = await request(users.A, "/signal", {
      roomId, recipient: users.C.name, eventType: "offer", payload: { sdp: "must-not-deliver" },
    });
    check("sender cannot signal to a user outside the room", nonmemberSend.status === 403,
      `HTTP ${nonmemberSend.status}`);

    const nonmemberPoll = await request(users.C, "/poll", { roomId });
    check("non-member cannot poll another room", nonmemberPoll.status === 403,
      `HTTP ${nonmemberPoll.status}`);

    const nonmemberInvite = await request(users.C, "/room/invite", { roomId, recipient: users.B.name });
    check("non-member cannot invite participants into a room", nonmemberInvite.status === 403,
      `HTTP ${nonmemberInvite.status}`);
    const selfInvite = await request(users.A, "/room/invite", { roomId, recipient: users.A.name });
    check("self-invitation is rejected as invalid input", selfInvite.status === 400, `HTTP ${selfInvite.status}`);
    const nonmemberResolve = await request(users.C, "/room/resolve", { bindingType: "call", logicalId: logicalCallId });
    check("non-member cannot resolve a logical room", nonmemberResolve.status === 404, `HTTP ${nonmemberResolve.status}`);
    const dynamicInvite = await request(users.A, "/room/invite", { roomId, recipient: users.C.name });
    check("accepted room member can invite a new participant", dynamicInvite.status === 201 &&
      dynamicInvite.json?.status === "pending", `HTTP ${dynamicInvite.status}`);
    const duplicateInvite = await request(users.A, "/room/invite", { roomId, recipient: users.C.name });
    check("duplicate room invitation is rejected", duplicateInvite.status === 409, `HTTP ${duplicateInvite.status}`);
    const pendingResolve = await request(users.C, "/room/resolve", { bindingType: "call", logicalId: logicalCallId });
    check("pending invitee cannot resolve a logical room", pendingResolve.status === 404, `HTTP ${pendingResolve.status}`);
    const invitationsC = await request(users.C, "/room/invitations", {});
    const invitationC = (invitationsC.json?.invitations || []).find(x => x.roomId === roomId);
    check("invitation lists include server-owned logical binding metadata",
      invitationsC.status === 200 && invitationC?.bindings?.some(b =>
        b.bindingType === "call" && b.logicalId === logicalCallId), `HTTP ${invitationsC.status}`);
    const pendingMemberList = await request(users.C, "/room/members", { roomId });
    check("pending invitee cannot list accepted room participants", pendingMemberList.status === 404,
      "HTTP " + pendingMemberList.status);
    const acceptC = await request(users.C, "/room/accept", { roomId });
    check("dynamically invited user can accept", acceptC.status === 200 &&
      acceptC.json?.status === "accepted", `HTTP ${acceptC.status}`);
    const cMembers = await request(users.C, "/room/members", { roomId });
    check("newly accepted member sees accepted roster", cMembers.status === 200 &&
      cMembers.json?.members?.includes(users.C.name), "HTTP " + cMembers.status);
    const resolveC = await request(users.C, "/room/resolve", { bindingType: "call", logicalId: logicalCallId });
    check("newly accepted user can resolve the logical room", resolveC.status === 200 &&
      resolveC.json?.roomId === roomId, `HTTP ${resolveC.status}`);
    const sendC = await request(users.A, "/signal", {
      roomId, recipient: users.C.name, eventType: "offer", payload: { sdp: "synthetic-test-offer-for-C" },
    });
    check("newly accepted member can receive signaling", sendC.status === 202, `HTTP ${sendC.status}`);

    if (event?.event_id) {
      // Mix one real event with a safe, nonexistent ID to ensure the API reports
      // rows actually deleted, not merely the number of IDs submitted.
      const ack = await request(users.B, "/ack", {
        roomId, eventIds: [event.event_id, 9007199254740000],
      });
      check("recipient acknowledgement count reflects only existing owned events", ack.status === 200 &&
        ack.json?.ok === true && ack.json?.acknowledged === 1, `HTTP ${ack.status}`);
      const afterAck = await request(users.B, "/poll", { roomId });
      const stillPresent = (afterAck.json?.events || []).some(e => e.event_id === event.event_id);
      check("acknowledged event is no longer returned", afterAck.status === 200 && !stillPresent,
        `HTTP ${afterAck.status}`);
    } else {
      check("recipient can acknowledge a handled event", false, "no delivered event ID");
      check("acknowledged event is no longer returned", false, "no delivered event ID");
    }

    // Contract smoke for the three legacy channels. This verifies transport envelopes only;
    // it does not claim that the userscript has been migrated to this endpoint.
    const legacyEnvelopeTypes = ["call_signal", "voice_room_signal", "screen_signal"];
    for (const eventType of legacyEnvelopeTypes) {
      const envelopeSent = await request(users.A, "/signal", {
        roomId, recipient: users.B.name, eventType,
        payload: { type: "presence", logicalSession: "synthetic-test-session" },
      });
      check(`legacy ${eventType} envelope is accepted by the isolated transport`,
        envelopeSent.status === 202 && envelopeSent.json?.ok === true, `HTTP ${envelopeSent.status}`);
    }
    const invalidLegacySubtype = await request(users.A, "/signal", {
      roomId, recipient: users.B.name, eventType: "call_signal",
      payload: { type: "arbitrary_admin_action", value: "must-not-be-queued" },
    });
    check("legacy envelope rejects an unsupported inner event type",
      invalidLegacySubtype.status === 400, `HTTP ${invalidLegacySubtype.status}`);

    const legacyDelivery = await request(users.B, "/poll", { roomId });
    const legacyEvents = Array.isArray(legacyDelivery.json?.events) ? legacyDelivery.json.events : [];
    for (const eventType of legacyEnvelopeTypes) {
      check(`legacy ${eventType} envelope is delivered with server-owned routing metadata`,
        legacyDelivery.status === 200 && legacyEvents.some(e =>
          e.event_type === eventType && e.sender === users.A.name && e.recipient === users.B.name &&
          e.payload?.type === "presence" && !("from" in e.payload) && !("to" in e.payload) &&
          !("roomId" in e.payload)),
        `HTTP ${legacyDelivery.status}`);
    }
    const legacyIds = legacyEvents.filter(e => legacyEnvelopeTypes.includes(e.event_type)).map(e => e.event_id);
    const legacyAck = await request(users.B, "/ack", { roomId, eventIds: legacyIds });
    check("all legacy envelope smoke events can be acknowledged",
      legacyAck.status === 200 && legacyAck.json?.acknowledged === legacyEnvelopeTypes.length,
      `HTTP ${legacyAck.status}`);

    const closed = await request(users.A, "/room/close", { roomId });
    check("room creator can close the room", closed.status === 200 && closed.json?.ok === true,
      `HTTP ${closed.status}`);
    const pollClosed = await request(users.B, "/poll", { roomId });
    check("closed room no longer delivers events", pollClosed.status === 404,
      `HTTP ${pollClosed.status}`);
    const resolveClosed = await request(users.B, "/room/resolve", { bindingType: "call", logicalId: "call-" + roomId });
    check("closed room binding is removed and cannot be resolved", resolveClosed.status === 404,
      `HTTP ${resolveClosed.status}`);

    const repeatedAccept = await request(users.B, "/room/accept", { roomId });
    check("already accepted invitation cannot be accepted a second time",
      repeatedAccept.status === 404 || repeatedAccept.status === 409, `HTTP ${repeatedAccept.status}`);

    const declineRoom = await request(users.A, "/room/create", { participants: [users.C.name] });
    declineRoomId = declineRoom.json?.roomId || "";
    check("creator can invite a second test user for decline coverage",
      declineRoom.status === 201 && !!declineRoomId, `HTTP ${declineRoom.status}`);
    if (declineRoomId) {
      const declined = await request(users.C, "/room/decline", { roomId: declineRoomId });
      check("invitee can explicitly decline their invitation",
        declined.status === 200 && declined.json?.status === "declined", `HTTP ${declined.status}`);
      const pollDeclined = await request(users.C, "/poll", { roomId: declineRoomId });
      check("declined invitee cannot poll the room", pollDeclined.status === 403,
        `HTTP ${pollDeclined.status}`);
      const acceptDeclined = await request(users.C, "/room/accept", { roomId: declineRoomId });
      check("declined invitation cannot be accepted afterward",
        acceptDeclined.status === 404 || acceptDeclined.status === 409, `HTTP ${acceptDeclined.status}`);
      const reissued = await request(users.A, "/room/invite", { roomId: declineRoomId, recipient: users.C.name });
      check("creator can reissue a declined invitation", reissued.status === 201 &&
        reissued.json?.status === "pending" && reissued.json?.reissued === true, `HTTP ${reissued.status}`);
      const reaccepted = await request(users.C, "/room/accept", { roomId: declineRoomId });
      check("invitee can accept a reissued invitation", reaccepted.status === 200 &&
        reaccepted.json?.status === "accepted", `HTTP ${reaccepted.status}`);
    } else {
      check("invitee can explicitly decline their invitation", false, "second room creation failed");
      check("declined invitee cannot poll the room", false, "second room creation failed");
      check("declined invitation cannot be accepted afterward", false, "second room creation failed");
      check("creator can reissue a declined invitation", false, "second room creation failed");
      check("invitee can accept a reissued invitation", false, "second room creation failed");
    }
  } else {
    for (const name of [
      "room member can submit a recipient-scoped signal",
      "user B receives the event with server-derived sender and stripped identity claims",
      "sender cannot signal to a user outside the room",
      "non-member cannot poll another room",
      "recipient can acknowledge a handled event",
      "acknowledged event is no longer returned",
      "room creator can close the room",
      "closed room no longer delivers events",
    ]) check(name, false, "room creation failed; dependent test skipped");
  }

  // Two independent active rooms for the same pair must not cross-deliver signals.
  const parallelOne = await request(users.A, "/room/create", { participants: [users.B.name] });
  parallelRoomOneId = parallelOne.json?.roomId || "";
  const parallelTwo = await request(users.A, "/room/create", { participants: [users.B.name] });
  parallelRoomTwoId = parallelTwo.json?.roomId || "";
  check("same caller can create two concurrent independent rooms",
    parallelOne.status === 201 && parallelTwo.status === 201 &&
    !!parallelRoomOneId && !!parallelRoomTwoId && parallelRoomOneId !== parallelRoomTwoId,
    "one=" + parallelOne.status + ", two=" + parallelTwo.status);
  if (parallelRoomOneId && parallelRoomTwoId) {
    const [acceptOne, acceptTwo] = await Promise.all([
      request(users.B, "/room/accept", { roomId: parallelRoomOneId }),
      request(users.B, "/room/accept", { roomId: parallelRoomTwoId }),
    ]);
    check("callee can accept both concurrent rooms independently",
      acceptOne.status === 200 && acceptTwo.status === 200,
      "one=" + acceptOne.status + ", two=" + acceptTwo.status);
    const logicalOne = "parallel-call-one-" + parallelRoomOneId;
    const logicalTwo = "parallel-call-two-" + parallelRoomTwoId;
    const [bindOne, bindTwo] = await Promise.all([
      request(users.A, "/room/bind", { roomId: parallelRoomOneId, bindingType: "call", logicalId: logicalOne }),
      request(users.A, "/room/bind", { roomId: parallelRoomTwoId, bindingType: "call", logicalId: logicalTwo }),
    ]);
    check("parallel calls retain distinct server-owned logical bindings",
      bindOne.status === 201 && bindTwo.status === 201 &&
      bindOne.json?.roomId !== bindTwo.json?.roomId,
      "one=" + bindOne.status + ", two=" + bindTwo.status);
    const [sendOne, sendTwo] = await Promise.all([
      request(users.A, "/signal", { roomId: parallelRoomOneId, recipient: users.B.name,
        eventType: "call_signal", payload: { type: "presence", callId: logicalOne, marker: "parallel-room-one" } }),
      request(users.A, "/signal", { roomId: parallelRoomTwoId, recipient: users.B.name,
        eventType: "call_signal", payload: { type: "presence", callId: logicalTwo, marker: "parallel-room-two" } }),
    ]);
    check("two concurrent calls accept their signals independently",
      sendOne.status === 202 && sendTwo.status === 202,
      "one=" + sendOne.status + ", two=" + sendTwo.status);
    const [pollOne, pollTwo] = await Promise.all([
      request(users.B, "/poll", { roomId: parallelRoomOneId }),
      request(users.B, "/poll", { roomId: parallelRoomTwoId }),
    ]);
    const eventsOne = pollOne.json?.events || [];
    const eventsTwo = pollTwo.json?.events || [];
    const eventOne = eventsOne.find(event => event.payload?.marker === "parallel-room-one");
    const eventTwo = eventsTwo.find(event => event.payload?.marker === "parallel-room-two");
    check("parallel room one receives only its own call signal",
      pollOne.status === 200 && !!eventOne &&
      !eventsOne.some(event => event.payload?.marker === "parallel-room-two"),
      "HTTP " + pollOne.status);
    check("parallel room two receives only its own call signal",
      pollTwo.status === 200 && !!eventTwo &&
      !eventsTwo.some(event => event.payload?.marker === "parallel-room-one"),
      "HTTP " + pollTwo.status);
    const idsOne = eventsOne.map(event => event.event_id);
    const idsTwo = eventsTwo.map(event => event.event_id);
    await Promise.all([
      request(users.B, "/ack", { roomId: parallelRoomOneId, eventIds: idsOne }),
      request(users.B, "/ack", { roomId: parallelRoomTwoId, eventIds: idsTwo }),
    ]);
    const [closeOne, closeTwo] = await Promise.all([
      request(users.A, "/room/close", { roomId: parallelRoomOneId }),
      request(users.A, "/room/close", { roomId: parallelRoomTwoId }),
    ]);
    check("both concurrent rooms close without affecting one another",
      closeOne.status === 200 && closeTwo.status === 200,
      "one=" + closeOne.status + ", two=" + closeTwo.status);
    parallelRoomOneId = "";
    parallelRoomTwoId = "";
  } else {
    for (const name of [
      "callee can accept both concurrent rooms independently",
      "parallel calls retain distinct server-owned logical bindings",
      "two concurrent calls accept their signals independently",
      "parallel room one receives only its own call signal",
      "parallel room two receives only its own call signal",
      "both concurrent rooms close without affecting one another",
    ]) check(name, false, "one or both concurrent room creations failed");
  }

  const invalidVoiceOpen = await request(users.A, "/room/open", { logicalId: "call:forbidden" });
  check("open voice route rejects non-team logical IDs", invalidVoiceOpen.status === 400, "HTTP " + invalidVoiceOpen.status);
  const voiceOpenedA = await request(users.A, "/room/open", { logicalId: "upstatus-team-room-v1" });
  voiceRoomId = voiceOpenedA.json?.roomId || "";
  check("first authenticated team member creates an open voice room",
    voiceOpenedA.status === 201 && voiceOpenedA.json?.created === true && voiceOpenedA.json?.joined === true && !!voiceRoomId,
    "HTTP " + voiceOpenedA.status);
  if (voiceRoomId) {
    const voiceOpenedB = await request(users.B, "/room/open", { logicalId: "upstatus-team-lite-room-v1" });
    await new Promise(resolve => setTimeout(resolve, 20));
    const voiceOpenedC = await request(users.C, "/room/open", { logicalId: "upstatus-team-room-v1" });
    check("late members join the same voice room through Normal and Team Lite aliases",
      voiceOpenedB.status === 200 && voiceOpenedC.status === 200 && voiceOpenedB.json?.roomId === voiceRoomId &&
      voiceOpenedC.json?.roomId === voiceRoomId && voiceOpenedB.json?.joined === true && voiceOpenedC.json?.joined === true,
      "B=" + voiceOpenedB.status + ", C=" + voiceOpenedC.status);
    const repeatB = await request(users.B, "/room/open", { logicalId: "upstatus-team-lite-room-v1" });
    check("repeated open voice join is idempotent", repeatB.status === 200 && repeatB.json?.roomId === voiceRoomId && repeatB.json?.joined === false, "HTTP " + repeatB.status);
    const voiceMembers = await request(users.A, "/room/members", { roomId: voiceRoomId });
    check("open voice room roster contains only accepted members",
      voiceMembers.status === 200 && [users.A.name, users.B.name, users.C.name].every(name => (voiceMembers.json?.members || []).includes(name)),
      "HTTP " + voiceMembers.status);
    const bInvitations = await request(users.B, "/room/invitations", {});
    check("open voice join creates no pending invitation",
      bInvitations.status === 200 && !(bInvitations.json?.invitations || []).some(item => item.roomId === voiceRoomId), "HTTP " + bInvitations.status);
    const screenAlias = await request(users.B, "/room/resolve", { bindingType: "screen", logicalId: "upstatus-team-lite-room-v1" });
    check("open voice operation atomically binds voice and screen aliases", screenAlias.status === 200 && screenAlias.json?.roomId === voiceRoomId, "HTTP " + screenAlias.status);
    const ownerLeave = await request(users.A, "/room/leave", { roomId: voiceRoomId });
    check("voice room owner can leave without closing a room with other members",
      ownerLeave.status === 200 && ownerLeave.json?.roomClosed === false && ownerLeave.json?.ownerTransferred === true, "HTTP " + ownerLeave.status);
    const statusB = await request(users.B, "/room/status", { roomId: voiceRoomId });
    const statusA = await request(users.A, "/room/status", { roomId: voiceRoomId });
    check("earliest voice joiner receives owner control and departed owner loses it",
      statusB.status === 200 && statusA.status === 403 && !(statusB.json?.participants || []).some(item => item.name === users.A.name),
      "B=" + statusB.status + ", A=" + statusA.status);
    const rejoinA = await request(users.A, "/room/open", { logicalId: "upstatus-team-lite-room-v1" });
    check("departed member can rejoin the open voice room without invitation", rejoinA.status === 200 && rejoinA.json?.roomId === voiceRoomId && rejoinA.json?.joined === true, "HTTP " + rejoinA.status);
    await request(users.C, "/room/leave", { roomId: voiceRoomId });
    await request(users.A, "/room/leave", { roomId: voiceRoomId });
    const lastVoiceLeave = await request(users.B, "/room/leave", { roomId: voiceRoomId });
    const voiceGone = await request(users.B, "/room/resolve", { bindingType: "voice", logicalId: "upstatus-team-room-v1" });
    const screenGone = await request(users.B, "/room/resolve", { bindingType: "screen", logicalId: "upstatus-team-lite-room-v1" });
    check("last open voice member closes the room and removes both aliases",
      lastVoiceLeave.status === 200 && lastVoiceLeave.json?.roomClosed === true && voiceGone.status === 404 && screenGone.status === 404,
      "leave=" + lastVoiceLeave.status + ", voice=" + voiceGone.status + ", screen=" + screenGone.status);
    voiceRoomId = "";
  } else {
    for (const name of ["late members join the same voice room through Normal and Team Lite aliases","repeated open voice join is idempotent","open voice room roster contains only accepted members","open voice join creates no pending invitation","open voice operation atomically binds voice and screen aliases","voice room owner can leave without closing a room with other members","earliest voice joiner receives owner control and departed owner loses it","departed member can rejoin the open voice room without invitation","last open voice member closes the room and removes both aliases"]) check(name, false, "open voice room creation failed");
  }
  const raceCreated = await request(users.A, "/room/open", { logicalId: "upstatus-team-room-v1" });
  raceRoomId = raceCreated.json?.roomId || "";
  check("race fixture creates an open voice room", raceCreated.status === 201 && !!raceRoomId, "HTTP " + raceCreated.status);
  if (raceRoomId) {
    const [raceOwnerLeave, raceLateJoin] = await Promise.all([
      request(users.A, "/room/leave", { roomId: raceRoomId }),
      request(users.B, "/room/open", { logicalId: "upstatus-team-lite-room-v1" }),
    ]);
    const finalRaceRoomId = raceLateJoin.json?.roomId || raceRoomId;
    raceRoomId = finalRaceRoomId;
    check("owner departure and late open join serialize without losing the room",
      raceOwnerLeave.status === 200 && [200, 201].includes(raceLateJoin.status) && !!finalRaceRoomId,
      "leave=" + raceOwnerLeave.status + ", join=" + raceLateJoin.status);
    const raceMembers = await request(users.B, "/room/members", { roomId: finalRaceRoomId });
    const raceStatus = await request(users.B, "/room/status", { roomId: finalRaceRoomId });
    check("concurrent owner departure leaves a valid room owned by the surviving joiner",
      raceMembers.status === 200 && (raceMembers.json?.members || []).includes(users.B.name) && raceStatus.status === 200,
      "members=" + raceMembers.status + ", status=" + raceStatus.status);
    const raceLastLeave = await request(users.B, "/room/leave", { roomId: finalRaceRoomId });
    const raceResolve = await request(users.B, "/room/resolve", { bindingType: "voice", logicalId: "upstatus-team-room-v1" });
    check("concurrent open room closes cleanly after the final member leaves",
      raceLastLeave.status === 200 && raceLastLeave.json?.roomClosed === true && raceResolve.status === 404,
      "leave=" + raceLastLeave.status + ", resolve=" + raceResolve.status);
    raceRoomId = "";
  } else {
    check("owner departure and late open join serialize without losing the room", false, "race room creation failed");
    check("concurrent owner departure leaves a valid room owned by the surviving joiner", false, "race room creation failed");
    check("concurrent open room closes cleanly after the final member leaves", false, "race room creation failed");
  }
  const capacityA = await serviceRpc("open_upstatus_signal_voice_room", { p_logical_id: "upstatus-team-room-v1", p_user_name: users.A.name, p_max_members: 2 });
  capacityRoomId = capacityA.json?.roomId || "";
  const capacityB = await serviceRpc("open_upstatus_signal_voice_room", { p_logical_id: "upstatus-team-lite-room-v1", p_user_name: users.B.name, p_max_members: 2 });
  const capacityC = await serviceRpc("open_upstatus_signal_voice_room", { p_logical_id: "upstatus-team-room-v1", p_user_name: users.C.name, p_max_members: 2 });
  check("open voice RPC enforces its server-side member capacity",
    capacityA.status === 200 && capacityA.json?.created === true && capacityB.status === 200 && capacityB.json?.joined === true &&
    capacityC.status === 200 && capacityC.json?.error === "ROOM_FULL",
    "A=" + capacityA.status + ", B=" + capacityB.status + ", C=" + capacityC.status);
  if (capacityRoomId) {
    await request(users.A, "/room/leave", { roomId: capacityRoomId });
    const capacityLastLeave = await request(users.B, "/room/leave", { roomId: capacityRoomId });
    check("capacity probe room closes after accepted members leave", capacityLastLeave.status === 200 && capacityLastLeave.json?.roomClosed === true, "HTTP " + capacityLastLeave.status);
    capacityRoomId = "";
  } else check("capacity probe room closes after accepted members leave", false, "capacity fixture creation failed");

  const leaveRoom = await request(users.A, "/room/create", { participants: [users.B.name, users.C.name] });
  leaveRoomId = leaveRoom.json?.roomId || "";
  check("creator can create a room for membership leave and owner handoff",
    leaveRoom.status === 201 && !!leaveRoomId, "HTTP " + leaveRoom.status);
  if (leaveRoomId) {
    await new Promise(resolve => setTimeout(resolve, 20));
    const acceptBForLeave = await request(users.B, "/room/accept", { roomId: leaveRoomId });
    await new Promise(resolve => setTimeout(resolve, 20));
    const acceptCForLeave = await request(users.C, "/room/accept", { roomId: leaveRoomId });
    check("two invitees can accept before the creator leaves",
      acceptBForLeave.status === 200 && acceptCForLeave.status === 200,
      "B=" + acceptBForLeave.status + ", C=" + acceptCForLeave.status);
    const bindVoiceForLeave = await request(users.A, "/room/bind", {
      roomId: leaveRoomId, bindingType: "voice", logicalId: "leave-voice-" + leaveRoomId,
    });
    check("creator can bind voice room before leaving", bindVoiceForLeave.status === 201,
      "HTTP " + bindVoiceForLeave.status);
    const outgoingBeforeLeave = await request(users.A, "/signal", {
      roomId: leaveRoomId, recipient: users.B.name, eventType: "call_signal",
      payload: { type: "ended", callId: "leave-handoff-test" },
    });
    check("departing member can queue a final signal before leaving",
      outgoingBeforeLeave.status === 202, "HTTP " + outgoingBeforeLeave.status);

    const leaveA = await request(users.A, "/room/leave", { roomId: leaveRoomId });
    check("creator can leave while other accepted members keep the room active",
      leaveA.status === 200 && leaveA.json?.roomClosed === false && leaveA.json?.ownerTransferred === true,
      "HTTP " + leaveA.status);
    const statusBAfterOwnerLeave = await request(users.B, "/room/status", { roomId: leaveRoomId });
    check("room ownership transfers to the earliest remaining accepted member",
      statusBAfterOwnerLeave.status === 200 && statusBAfterOwnerLeave.json?.participants?.some(p => p.name === users.A.name) === false,
      "HTTP " + statusBAfterOwnerLeave.status);
    const statusAAfterLeave = await request(users.A, "/room/status", { roomId: leaveRoomId });
    check("departed creator loses room-owner privileges", statusAAfterLeave.status === 403,
      "HTTP " + statusAAfterLeave.status);
    const pollAAfterLeave = await request(users.A, "/poll", { roomId: leaveRoomId });
    check("departed creator can no longer poll the room", pollAAfterLeave.status === 403,
      "HTTP " + pollAAfterLeave.status);
    const preservedSignal = await request(users.B, "/poll", { roomId: leaveRoomId });
    check("final signal from departing member remains deliverable",
      preservedSignal.status === 200 && preservedSignal.json?.events?.some(e =>
        e.sender === users.A.name && e.payload?.type === "ended"),
      "HTTP " + preservedSignal.status);
    const bindAfterTransfer = await request(users.B, "/room/bind", {
      roomId: leaveRoomId, bindingType: "screen", logicalId: "leave-screen-" + leaveRoomId,
    });
    check("new room owner can manage existing logical bindings", bindAfterTransfer.status === 201,
      "HTTP " + bindAfterTransfer.status);

    const leaveB = await request(users.B, "/room/leave", { roomId: leaveRoomId });
    check("new owner can leave and transfer ownership to the remaining member",
      leaveB.status === 200 && leaveB.json?.roomClosed === false && leaveB.json?.ownerTransferred === true,
      "HTTP " + leaveB.status);
    const statusCAfterTransfer = await request(users.C, "/room/status", { roomId: leaveRoomId });
    check("second ownership transfer is visible to the remaining member",
      statusCAfterTransfer.status === 200, "HTTP " + statusCAfterTransfer.status);
    const leaveCLast = await request(users.C, "/room/leave", { roomId: leaveRoomId });
    check("last accepted member leaving automatically closes the room",
      leaveCLast.status === 200 && leaveCLast.json?.roomClosed === true,
      "HTTP " + leaveCLast.status);
    const resolveAfterLastLeave = await request(users.C, "/room/resolve", {
      bindingType: "voice", logicalId: "leave-voice-" + leaveRoomId,
    });
    check("last-member departure removes all logical room bindings",
      resolveAfterLastLeave.status === 404, "HTTP " + resolveAfterLastLeave.status);
  } else {
    for (const name of [
      "two invitees can accept before the creator leaves",
      "creator can bind voice room before leaving",
      "departing member can queue a final signal before leaving",
      "creator can leave while other accepted members keep the room active",
      "room ownership transfers to the earliest remaining accepted member",
      "departed creator loses room-owner privileges",
      "departed creator can no longer poll the room",
      "final signal from departing member remains deliverable",
      "new room owner can manage existing logical bindings",
      "new owner can leave and transfer ownership to the remaining member",
      "second ownership transfer is visible to the remaining member",
      "last accepted member leaving automatically closes the room",
      "last-member departure removes all logical room bindings",
    ]) check(name, false, "leave room creation failed");
  }
  const singletonAttempts = [
    { attemptId: makeVoiceAttemptId("singleton-normal"), logicalId: "upstatus-team-room-v1" },
    { attemptId: makeVoiceAttemptId("singleton-team-lite"), logicalId: "upstatus-team-lite-room-v1" },
  ];
  voiceAttemptCleanup.push(...singletonAttempts);
  const singletonResults = await Promise.all(singletonAttempts.map(attempt =>
    serviceRpc("open_upstatus_signal_voice_room_attempt", {
      p_attempt_id: attempt.attemptId, p_logical_id: attempt.logicalId,
      p_user_name: users.A.name, p_max_members: 32,
    })
  ));
  const singletonWinnerIndex = singletonResults.findIndex(result => result.json?.ok === true);
  const singletonLoserIndex = singletonWinnerIndex === 0 ? 1 : 0;
  const singletonLoserError = singletonResults[singletonLoserIndex]?.json?.error;
  check("same user cannot create concurrent voice attempts across Normal and Team Lite aliases",
    singletonWinnerIndex >= 0 && singletonLoserError === "VOICE_ATTEMPT_ALREADY_ACTIVE",
    "first=" + JSON.stringify(singletonResults[0].json) + ", second=" + JSON.stringify(singletonResults[1].json));
  if (singletonWinnerIndex >= 0 && singletonLoserError === "VOICE_ATTEMPT_ALREADY_ACTIVE") {
    const winner = singletonAttempts[singletonWinnerIndex];
    const loser = singletonAttempts[singletonLoserIndex];
    const blockedRetry = await serviceRpc("open_upstatus_signal_voice_room_attempt", {
      p_attempt_id: loser.attemptId, p_logical_id: loser.logicalId,
      p_user_name: users.A.name, p_max_members: 32,
    });
    check("second tab remains blocked while the account has an active voice attempt",
      blockedRetry.json?.error === "VOICE_ATTEMPT_ALREADY_ACTIVE", JSON.stringify(blockedRetry.json));
    const released = await serviceRpc("cancel_upstatus_signal_voice_room_attempt", {
      p_attempt_id: winner.attemptId, p_logical_id: winner.logicalId, p_user_name: users.A.name,
    });
    check("cancelling the active voice attempt releases the account singleton",
      released.json?.cancelled === true, JSON.stringify(released.json));
    const retryAfterRelease = await serviceRpc("open_upstatus_signal_voice_room_attempt", {
      p_attempt_id: loser.attemptId, p_logical_id: loser.logicalId,
      p_user_name: users.A.name, p_max_members: 32,
    });
    check("a rejected tab-local attempt can retry after the active attempt ends",
      retryAfterRelease.json?.ok === true, JSON.stringify(retryAfterRelease.json));
    if (retryAfterRelease.json?.ok === true) {
      const retryCancelled = await serviceRpc("cancel_upstatus_signal_voice_room_attempt", {
        p_attempt_id: loser.attemptId, p_logical_id: loser.logicalId, p_user_name: users.A.name,
      });
      check("retried tab-local voice attempt cancels cleanly",
        retryCancelled.json?.cancelled === true, JSON.stringify(retryCancelled.json));
    }
  }
  const crossAccountAttempts = [
    { user: users.B, attemptId: makeVoiceAttemptIdFor(users.B, "parallel-b"), logicalId: "upstatus-team-room-v1" },
    { user: users.C, attemptId: makeVoiceAttemptIdFor(users.C, "parallel-c"), logicalId: "upstatus-team-lite-room-v1" },
  ];
  const crossAccountOpens = await Promise.all(crossAccountAttempts.map(attempt =>
    serviceRpc("open_upstatus_signal_voice_room_attempt", {
      p_attempt_id: attempt.attemptId, p_logical_id: attempt.logicalId,
      p_user_name: attempt.user.name, p_max_members: 32,
    })
  ));
  crossAccountOpens.forEach((result, index) => {
    if (result.json?.ok === true) voiceAttemptCleanup.push({
      attemptId: crossAccountAttempts[index].attemptId,
      logicalId: crossAccountAttempts[index].logicalId,
      userName: crossAccountAttempts[index].user.name,
    });
  });
  crossAccountRoomId = crossAccountOpens.find(result => result.json?.ok === true)?.json?.roomId || "";
  check("different accounts can open voice attempts concurrently while sharing the logical room",
    crossAccountOpens.every(result => result.status === 200 && result.json?.ok === true) &&
      crossAccountOpens[0].json?.roomId === crossAccountOpens[1].json?.roomId,
    "B=" + JSON.stringify(crossAccountOpens[0].json) + ", C=" + JSON.stringify(crossAccountOpens[1].json));
  if (crossAccountOpens.every(result => result.json?.ok === true)) {
    const crossAccountCancels = await Promise.all(crossAccountAttempts.map(attempt =>
      serviceRpc("cancel_upstatus_signal_voice_room_attempt", {
        p_attempt_id: attempt.attemptId, p_logical_id: attempt.logicalId, p_user_name: attempt.user.name,
      })
    ));
    check("different accounts can cancel concurrent voice attempts without deadlock",
      crossAccountCancels.every(result => result.status === 200 && result.json?.cancelled === true),
      "B=" + JSON.stringify(crossAccountCancels[0].json) + ", C=" + JSON.stringify(crossAccountCancels[1].json));
  }



} catch (error) {
  console.error("Integration request failed:", String(error));
  results.push({ name: "test runner completed without transport error", ok: false });
} finally {
  for (const attempt of voiceAttemptCleanup) {
    try {
      await serviceRpc("cancel_upstatus_signal_voice_room_attempt", {
        p_attempt_id: attempt.attemptId, p_logical_id: attempt.logicalId, p_user_name: attempt.userName || users.A.name,
      });
    } catch {}
  }
  if (roomId) {
    // Best-effort cleanup, without printing response payloads or credentials.
    try { await request(users.A, "/room/close", { roomId }); } catch {}
  }
  if (declineRoomId) {
    try { await request(users.A, "/room/close", { roomId: declineRoomId }); } catch {}
  }
  if (conflictRoomId) {
    try { await request(users.A, "/room/close", { roomId: conflictRoomId }); } catch {}
  }
  if (leaveRoomId) {
    try { await request(users.A, "/room/close", { roomId: leaveRoomId }); } catch {}
  }
  if (parallelRoomOneId) {
    try { await request(users.A, "/room/close", { roomId: parallelRoomOneId }); } catch {}
  }
  if (parallelRoomTwoId) {
    try { await request(users.A, "/room/close", { roomId: parallelRoomTwoId }); } catch {}
  }
  for (const id of [voiceRoomId, raceRoomId, capacityRoomId, crossAccountRoomId].filter(Boolean)) {
    for (const user of [users.A, users.B, users.C]) { try { await request(user, "/room/leave", { roomId: id }); } catch {} }
  }
}
const passed = results.filter(r => r.ok).length;
const failed = results.length - passed;
console.log(`\n${passed}/${results.length} authenticated integration checks passed.`);
if (failed) process.exit(1);
