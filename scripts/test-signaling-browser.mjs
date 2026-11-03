import assert from "node:assert/strict";
import { chromium } from "playwright";

const origin = "https://bfpjtfqlnypisxljoxkb.supabase.co";
const endpoint = origin + "/functions/v1/upstatus-signal-test";
const users = {
  A: { name: process.env.UPSTATUS_SIGNAL_USER_A_NAME, token: process.env.UPSTATUS_SIGNAL_USER_A_TOKEN },
  B: { name: process.env.UPSTATUS_SIGNAL_USER_B_NAME, token: process.env.UPSTATUS_SIGNAL_USER_B_TOKEN },
  C: { name: process.env.UPSTATUS_SIGNAL_USER_C_NAME, token: process.env.UPSTATUS_SIGNAL_USER_C_TOKEN },
};
for (const [label, user] of Object.entries(users)) {
  if (!user.name || !user.token) throw new Error("Missing isolated browser test identity " + label);
}

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
});
let roomId = "", groupRoomId = "";
let pcA, pcB, streamA, streamB;
let pageA, pageB, pageC;

async function api(page, user, route, body = {}) {
  return page.evaluate(async ({ endpoint, token, route, body }) => {
    const response = await fetch(endpoint + route, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-UpStatus-Token": token, "Cache-Control": "no-store" },
      body: JSON.stringify(body),
    });
    const json = await response.json().catch(() => ({}));
    return { status: response.status, json };
  }, { endpoint, token: user.token, route, body });
}

async function waitForGathering(page) {
  return page.evaluate(async () => {
    const pc = window.__upPc;
    if (!pc) throw new Error("Peer connection was not initialized");
    if (pc.iceGatheringState === "complete") return pc.localDescription.sdp;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("ICE gathering timed out")), 12000);
      pc.addEventListener("icegatheringstatechange", () => {
        if (pc.iceGatheringState === "complete") { clearTimeout(timer); resolve(); }
      });
    });
    return pc.localDescription.sdp;
  });
}

async function waitForEvent(page, user, expectedType, eventType = "call_signal", timeoutMs = 20000, callId = null, expectedSender = null) {
  return page.evaluate(async ({ endpoint, token, roomId, expectedType, eventType, timeoutMs, callId, expectedSender }) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const response = await fetch(endpoint + "/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-UpStatus-Token": token, "Cache-Control": "no-store" },
        body: JSON.stringify({ roomId }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error("Polling failed: HTTP " + response.status);
      const event = (json.events || []).find(item => item.event_type === eventType && item.payload?.type === expectedType &&
        (!callId || item.payload?.callId === callId) && (!expectedSender || item.sender === expectedSender));
      if (event) {
        await fetch(endpoint + "/ack", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-UpStatus-Token": token },
          body: JSON.stringify({ roomId, eventIds: [event.event_id] }),
        });
        return event;
      }
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    throw new Error("Timed out waiting for " + expectedType);
  }, { endpoint, token: user.token, roomId, expectedType, eventType, timeoutMs, callId, expectedSender });
}

async function teardownPeerConnections() {
  const results = await Promise.all([pageA, pageB].map(page => page.evaluate(() => {
    const pc = window.__upPc;
    const stream = window.__upStream;
    try { pc?.close(); } catch {}
    try { stream?.getTracks().forEach(track => track.stop()); } catch {}
    return {
      connectionState: pc?.connectionState || "missing",
      localTrackStates: stream?.getTracks().map(track => track.readyState) || [],
    };
  })));
  for (const result of results) {
    assert.equal(result.connectionState, "closed", "peer connection must close during teardown");
    assert.ok(result.localTrackStates.every(state => state === "ended"), "local media tracks must stop during teardown");
  }
  console.log("PASS browser peer and local media teardown.");
}

async function prepareMeshPeer(page, remoteName) {
  await page.evaluate(async remote => {
    if (!window.__meshStream) window.__meshStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    window.__meshPeers = window.__meshPeers || {};
    window.__meshRemoteTracks = window.__meshRemoteTracks || {};
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.ontrack = event => {
      if (event.track?.kind) {
        window.__meshRemoteTracks[remote] = window.__meshRemoteTracks[remote] || [];
        window.__meshRemoteTracks[remote].push(event.track.kind);
      }
    };
    window.__meshStream.getTracks().forEach(track => pc.addTrack(track, window.__meshStream));
    window.__meshPeers[remote] = pc;
    window.__upPc = pc;
    window.__upStream = window.__meshStream;
  }, remoteName);
}

async function negotiateMeshPair(fromPage, fromUser, toPage, toUser, callId) {
  await Promise.all([
    prepareMeshPeer(fromPage, toUser.name),
    prepareMeshPeer(toPage, fromUser.name),
  ]);
  await fromPage.evaluate(async remote => {
    const pc = window.__meshPeers[remote];
    window.__upPc = pc;
    await pc.setLocalDescription(await pc.createOffer());
  }, toUser.name);
  await waitForGathering(fromPage);
  const offer = await fromPage.evaluate(remote => window.__meshPeers[remote].localDescription.toJSON(), toUser.name);
  assert.match(offer.sdp, /a=candidate:/, "group mesh offer must include gathered ICE candidates");
  const sent = await api(fromPage, fromUser, "/signal", {
    roomId: groupRoomId, recipient: toUser.name, eventType: "call_signal",
    payload: { type: "offer", callId, phase: "mesh", sdp: offer },
  });
  assert.equal(sent.status, 202, "group mesh offer must be accepted by authenticated transport");
  const offerEvent = await waitForEvent(toPage, toUser, "offer", "call_signal", 20000, callId, fromUser.name);
  await toPage.evaluate(async ({ remote, sdp }) => {
    const pc = window.__meshPeers[remote];
    window.__upPc = pc;
    await pc.setRemoteDescription(sdp);
    await pc.setLocalDescription(await pc.createAnswer());
  }, { remote: fromUser.name, sdp: offerEvent.payload.sdp });
  await waitForGathering(toPage);
  const answer = await toPage.evaluate(remote => window.__meshPeers[remote].localDescription.toJSON(), fromUser.name);
  assert.match(answer.sdp, /a=candidate:/, "group mesh answer must include gathered ICE candidates");
  const answerSent = await api(toPage, toUser, "/signal", {
    roomId: groupRoomId, recipient: fromUser.name, eventType: "call_signal",
    payload: { type: "answer", callId, phase: "mesh", sdp: answer },
  });
  assert.equal(answerSent.status, 202, "group mesh answer must be accepted by authenticated transport");
  const answerEvent = await waitForEvent(fromPage, fromUser, "answer", "call_signal", 20000, callId, toUser.name);
  await fromPage.evaluate(({ remote, sdp }) => window.__meshPeers[remote].setRemoteDescription(sdp),
    { remote: toUser.name, sdp: answerEvent.payload.sdp });
  await Promise.all([
    fromPage.waitForFunction(remote => window.__meshPeers[remote].connectionState === "connected", toUser.name, { timeout: 20000 }),
    toPage.waitForFunction(remote => window.__meshPeers[remote].connectionState === "connected", fromUser.name, { timeout: 20000 }),
    fromPage.waitForFunction(remote => (window.__meshRemoteTracks[remote] || []).includes("audio"), toUser.name, { timeout: 10000 }),
    toPage.waitForFunction(remote => (window.__meshRemoteTracks[remote] || []).includes("audio"), fromUser.name, { timeout: 10000 }),
  ]);
  console.log("PASS authenticated group mesh link " + fromUser.name + " ↔ " + toUser.name + ".");
}

async function teardownGroupMesh() {
  const results = await Promise.all([pageA, pageB, pageC].map(page => page.evaluate(() => {
    const peers = Object.values(window.__meshPeers || {});
    peers.forEach(pc => { try { pc.close(); } catch {} });
    const states = peers.map(pc => pc.connectionState);
    const tracks = window.__meshStream?.getTracks() || [];
    tracks.forEach(track => { try { track.stop(); } catch {} });
    return { states, trackStates: tracks.map(track => track.readyState) };
  })));
  for (const result of results) {
    assert.equal(result.states.length, 2, "each group member must have two mesh peer connections");
    assert.ok(result.states.every(state => state === "closed"), "all group mesh peer connections must close");
    assert.ok(result.trackStates.every(state => state === "ended"), "group local media tracks must stop");
  }
  console.log("PASS authenticated three-member group mesh teardown.");
}

async function runGroupMesh() {
  const created = await api(pageA, users.A, "/room/create", { participants: [users.B.name] });
  assert.equal(created.status, 201, "group caller must create a room and invite the first participant");
  groupRoomId = created.json.roomId;
  assert.ok(groupRoomId, "group room creation must return an ID");
  const callId = "group-browser-e2e-" + Date.now();
  const bound = await api(pageA, users.A, "/room/bind", { roomId: groupRoomId, bindingType: "call", logicalId: callId });
  assert.ok([200, 201].includes(bound.status), "group caller must bind the logical call ID");
  const inviteB = await api(pageB, users.B, "/room/invitations");
  assert.equal(inviteB.status, 200);
  assert.ok((inviteB.json.invitations || []).some(item => item.roomId === groupRoomId), "first participant must discover the invitation");
  assert.equal((await api(pageB, users.B, "/room/accept", { roomId: groupRoomId })).status, 200, "first participant must accept");
  const inviteC = await api(pageA, users.A, "/room/invite", { roomId: groupRoomId, recipient: users.C.name });
  assert.equal(inviteC.status, 201, "accepted member must be able to invite a third group participant");
  const invitationsC = await api(pageC, users.C, "/room/invitations");
  assert.equal(invitationsC.status, 200);
  assert.ok((invitationsC.json.invitations || []).some(item => item.roomId === groupRoomId), "third participant must discover the dynamic invitation");
  assert.equal((await api(pageC, users.C, "/room/accept", { roomId: groupRoomId })).status, 200, "third participant must accept");
  const members = await api(pageA, users.A, "/room/members", { roomId: groupRoomId });
  assert.equal(members.status, 200);
  assert.deepEqual((members.json.members || []).map(item => item.name).sort(), [users.A.name, users.B.name, users.C.name].sort(),
    "server roster must contain exactly the three accepted group members");
  const presence = await api(pageA, users.A, "/broadcast", {
    roomId: groupRoomId, eventType: "call_signal", payload: { type: "presence", callId },
  });
  assert.equal(presence.status, 202, "group discovery hint must fan out through authenticated room broadcast");
  const [presenceB, presenceC] = await Promise.all([
    waitForEvent(pageB, users.B, "presence", "call_signal", 20000, callId, users.A.name),
    waitForEvent(pageC, users.C, "presence", "call_signal", 20000, callId, users.A.name),
  ]);
  assert.equal(presenceB.sender, users.A.name);
  assert.equal(presenceC.sender, users.A.name);
  console.log("PASS authenticated dynamic group invitation, accepted roster, and fanout.");
  await Promise.all([
    negotiateMeshPair(pageA, users.A, pageB, users.B, callId),
    negotiateMeshPair(pageA, users.A, pageC, users.C, callId),
    negotiateMeshPair(pageB, users.B, pageC, users.C, callId),
  ]);
  await Promise.all([
    pageA.waitForFunction(() => Object.keys(window.__meshPeers || {}).length === 2),
    pageB.waitForFunction(() => Object.keys(window.__meshPeers || {}).length === 2),
    pageC.waitForFunction(() => Object.keys(window.__meshPeers || {}).length === 2),
  ]);
  await teardownGroupMesh();
}

async function negotiateMedia({ bindingType, eventType, logicalId, trackKind }) {
  const bound = await api(pageA, users.A, "/room/bind", { roomId, bindingType, logicalId });
  assert.ok([200, 201].includes(bound.status), bindingType + " binding must be created");
  const resolved = await api(pageB, users.B, "/room/resolve", { bindingType, logicalId });
  assert.equal(resolved.status, 200, bindingType + " binding must resolve for accepted member");
  assert.equal(resolved.json.roomId, roomId, bindingType + " binding must resolve to the accepted room");

  await Promise.all([
    pageA.evaluate(async kind => {
      try { window.__upPc?.close(); } catch {}
      try { window.__upStream?.getTracks().forEach(track => track.stop()); } catch {}
      const pc = new RTCPeerConnection({ iceServers: [] });
      let stream;
      if (kind === "audio") {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else {
        const canvas = document.createElement("canvas");
        canvas.width = 32; canvas.height = 32;
        const ctx = canvas.getContext("2d");
        ctx.fillRect(0, 0, 32, 32);
        stream = canvas.captureStream(5);
      }
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      window.__upPc = pc; window.__upStream = stream;
    }, trackKind),
    pageB.evaluate(async kind => {
      try { window.__upPc?.close(); } catch {}
      try { window.__upStream?.getTracks().forEach(track => track.stop()); } catch {}
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.ontrack = event => {
        if (event.track?.kind) {
          window.__upRemoteTrackKinds = window.__upRemoteTrackKinds || [];
          window.__upRemoteTrackKinds.push(event.track.kind);
        }
      };
      if (kind === "audio") {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        window.__upStream = stream;
      }
      window.__upPc = pc; window.__upRemoteTrackKinds = [];
    }, trackKind),
  ]);

  await pageA.evaluate(async () => {
    const pc = window.__upPc;
    await pc.setLocalDescription(await pc.createOffer());
  });
  await waitForGathering(pageA);
  const offer = await pageA.evaluate(() => window.__upPc.localDescription.toJSON());
  assert.match(offer.sdp, /a=candidate:/, bindingType + " offer must contain gathered ICE candidates");
  const offerSent = await api(pageA, users.A, "/signal", {
    roomId, recipient: users.B.name, eventType,
    payload: { type: "offer", callId: logicalId, sdp: offer },
  });
  assert.equal(offerSent.status, 202, bindingType + " offer must be accepted by authenticated transport");

  const offerEvent = await waitForEvent(pageB, users.B, "offer", eventType);
  assert.equal(offerEvent.sender, users.A.name);
  await pageB.evaluate(async sdp => {
    const pc = window.__upPc;
    await pc.setRemoteDescription(sdp);
    await pc.setLocalDescription(await pc.createAnswer());
  }, offerEvent.payload.sdp);
  await waitForGathering(pageB);
  const answer = await pageB.evaluate(() => window.__upPc.localDescription.toJSON());
  assert.match(answer.sdp, /a=candidate:/, bindingType + " answer must contain gathered ICE candidates");
  const answerSent = await api(pageB, users.B, "/signal", {
    roomId, recipient: users.A.name, eventType,
    payload: { type: "answer", callId: logicalId, sdp: answer },
  });
  assert.equal(answerSent.status, 202, bindingType + " answer must be accepted by authenticated transport");

  const answerEvent = await waitForEvent(pageA, users.A, "answer", eventType);
  assert.equal(answerEvent.sender, users.B.name);
  await pageA.evaluate(async sdp => window.__upPc.setRemoteDescription(sdp), answerEvent.payload.sdp);
  await Promise.all([
    pageA.waitForFunction(() => window.__upPc.connectionState === "connected", undefined, { timeout: 20000 }),
    pageB.waitForFunction(() => window.__upPc.connectionState === "connected", undefined, { timeout: 20000 }),
  ]);
  await pageB.waitForFunction(kind => (window.__upRemoteTrackKinds || []).includes(kind), trackKind, { timeout: 10000 });
  console.log("PASS authenticated browser " + bindingType + " WebRTC negotiation and remote " + trackKind + " track delivery.");
  await teardownPeerConnections();
}

try {
  const contextA = await browser.newContext({ permissions: ["microphone"] });
  const contextB = await browser.newContext({ permissions: ["microphone"] });
  const contextC = await browser.newContext({ permissions: ["microphone"] });
  pageA = await contextA.newPage();
  pageB = await contextB.newPage();
  pageC = await contextC.newPage();
  await Promise.all([pageA.goto(origin), pageB.goto(origin), pageC.goto(origin)]);

  const created = await api(pageA, users.A, "/room/create", { participants: [users.B.name] });
  assert.equal(created.status, 201, "caller must create an authenticated room");
  roomId = created.json.roomId;
  assert.ok(roomId, "room creation must return an ID");
  const bound = await api(pageA, users.A, "/room/bind", { roomId, bindingType: "call", logicalId: "browser-e2e-" + Date.now() });
  assert.ok([200, 201].includes(bound.status), "caller must bind the logical call room");

  const invitations = await api(pageB, users.B, "/room/invitations");
  assert.equal(invitations.status, 200);
  assert.ok((invitations.json.invitations || []).some(item => item.roomId === roomId), "callee must discover the pending invitation");
  const accepted = await api(pageB, users.B, "/room/accept", { roomId });
  assert.equal(accepted.status, 200, "callee must explicitly accept before media negotiation");

  const status = await api(pageA, users.A, "/room/status", { roomId });
  assert.equal(status.status, 200);
  assert.ok(status.json.participants.some(item => item.name === users.B.name && item.status === "accepted"));

  await Promise.all([
    pageA.evaluate(async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const pc = new RTCPeerConnection({ iceServers: [] });
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      window.__upStream = stream; window.__upPc = pc;
    }),
    pageB.evaluate(async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.ontrack = event => { if (event.track?.kind === "audio") window.__upRemoteTracks = (window.__upRemoteTracks || 0) + 1; };
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      window.__upStream = stream; window.__upPc = pc;
    }),
  ]);

  await pageA.evaluate(async () => {
    const pc = window.__upPc;
    const description = await pc.createOffer();
    await pc.setLocalDescription(description);
    return pc.localDescription.toJSON();
  });
  await waitForGathering(pageA);
  const gatheredOffer = await pageA.evaluate(() => window.__upPc.localDescription.toJSON());
  assert.match(gatheredOffer.sdp, /a=candidate:/, "browser must gather at least one ICE candidate into the offer SDP");
  const offerSent = await api(pageA, users.A, "/signal", {
    roomId, recipient: users.B.name, eventType: "call_signal",
    payload: { type: "offer", callId: "browser-e2e", phase: "initial", sdp: gatheredOffer },
  });
  assert.equal(offerSent.status, 202, "authenticated caller must deliver SDP offer");

  const offerEvent = await waitForEvent(pageB, users.B, "offer");
  assert.equal(offerEvent.sender, users.A.name, "server must derive sender identity");
  await pageB.evaluate(async sdp => {
    const pc = window.__upPc;
    await pc.setRemoteDescription(sdp);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
  }, offerEvent.payload.sdp);
  await waitForGathering(pageB);
  const gatheredAnswer = await pageB.evaluate(() => window.__upPc.localDescription.toJSON());
  assert.match(gatheredAnswer.sdp, /a=candidate:/, "browser must gather at least one ICE candidate into the answer SDP");
  const answerSent = await api(pageB, users.B, "/signal", {
    roomId, recipient: users.A.name, eventType: "call_signal",
    payload: { type: "answer", callId: "browser-e2e", phase: "initial", sdp: gatheredAnswer },
  });
  assert.equal(answerSent.status, 202, "authenticated callee must deliver SDP answer");

  const answerEvent = await waitForEvent(pageA, users.A, "answer");
  assert.equal(answerEvent.sender, users.B.name);
  await pageA.evaluate(async sdp => window.__upPc.setRemoteDescription(sdp), answerEvent.payload.sdp);

  const connected = await Promise.all([
    pageA.waitForFunction(() => window.__upPc.connectionState === "connected", undefined, { timeout: 20000 }).then(() => true),
    pageB.waitForFunction(() => window.__upPc.connectionState === "connected", undefined, { timeout: 20000 }).then(() => true),
  ]);
  assert.deepEqual(connected, [true, true], "both real browser peer connections must reach connected state");
  const tracks = await Promise.all([
    pageA.evaluate(() => window.__upPc.getSenders().some(sender => sender.track?.kind === "audio")),
    pageB.evaluate(() => window.__upPc.getSenders().some(sender => sender.track?.kind === "audio")),
  ]);
  assert.deepEqual(tracks, [true, true], "both peers must publish audio tracks");
  await pageB.waitForFunction(() => (window.__upRemoteTracks || 0) > 0, undefined, { timeout: 10000 });
  const remoteAudioTrack = await pageB.evaluate(() => window.__upRemoteTracks > 0);
  assert.equal(remoteAudioTrack, true, "callee must receive the caller's remote audio track");
  console.log("PASS authenticated browser call WebRTC negotiation and remote audio track delivery.");
  await teardownPeerConnections();

  await negotiateMedia({
    bindingType: "voice", eventType: "voice_room_signal",
    logicalId: "browser-e2e-voice-" + Date.now(), trackKind: "audio",
  });
  await negotiateMedia({
    bindingType: "screen", eventType: "screen_signal",
    logicalId: "browser-e2e-screen-" + Date.now(), trackKind: "video",
  });

  await runGroupMesh();
} finally {
  if (roomId && pageA) {
    try { await api(pageA, users.A, "/room/close", { roomId }); } catch {}
  }
  if (groupRoomId && pageA) {
    try { await api(pageA, users.A, "/room/close", { roomId: groupRoomId }); } catch {}
  }
  for (const page of [pageA, pageB, pageC]) {
    if (page) {
      try { await page.evaluate(() => { window.__upPc?.close(); window.__upStream?.getTracks().forEach(track => track.stop()); Object.values(window.__meshPeers || {}).forEach(pc => pc.close()); window.__meshStream?.getTracks().forEach(track => track.stop()); }); } catch {}
    }
  }
  await browser.close();
}
