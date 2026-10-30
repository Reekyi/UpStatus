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
const results = [];
let roomId = "";
let declineRoomId = "";
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

    const accepted = await request(users.B, "/room/accept", { roomId });
    check("invited user can explicitly accept the room", accepted.status === 200 &&
      accepted.json?.ok === true && accepted.json?.status === "accepted", `HTTP ${accepted.status}`);

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

    const closed = await request(users.A, "/room/close", { roomId });
    check("room creator can close the room", closed.status === 200 && closed.json?.ok === true,
      `HTTP ${closed.status}`);
    const pollClosed = await request(users.B, "/poll", { roomId });
    check("closed room no longer delivers events", pollClosed.status === 404,
      `HTTP ${pollClosed.status}`);

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
    } else {
      check("invitee can explicitly decline their invitation", false, "second room creation failed");
      check("declined invitee cannot poll the room", false, "second room creation failed");
      check("declined invitation cannot be accepted afterward", false, "second room creation failed");
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
}
const passed = results.filter(r => r.ok).length;
const failed = results.length - passed;
console.log(`\n${passed}/${results.length} authenticated integration checks passed.`);
if (failed) process.exit(1);
