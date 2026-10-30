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
const results = [];
let roomId = "";
let declineRoomId = "";
let conflictRoomId = "";
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
} catch (error) {
  console.error("Integration request failed:", String(error));
  results.push({ name: "test runner completed without transport error", ok: false });
} finally {
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
}
const passed = results.filter(r => r.ok).length;
const failed = results.length - passed;
console.log(`\n${passed}/${results.length} authenticated integration checks passed.`);
if (failed) process.exit(1);
