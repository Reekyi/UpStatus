import assert from "node:assert/strict";
import { chromium } from "playwright";

const origin = "https://bfpjtfqlnypisxljoxkb.supabase.co";
const endpoint = origin + "/functions/v1/upstatus-signal-test";
const users = {
  A: { name: process.env.UPSTATUS_SIGNAL_USER_A_NAME, token: process.env.UPSTATUS_SIGNAL_USER_A_TOKEN },
  B: { name: process.env.UPSTATUS_SIGNAL_USER_B_NAME, token: process.env.UPSTATUS_SIGNAL_USER_B_TOKEN },
};
for (const [label, user] of Object.entries(users)) {
  if (!user.name || !user.token) throw new Error("Missing isolated browser test identity " + label);
}

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
});
let roomId = "";
let pcA, pcB, streamA, streamB;
let pageA, pageB;

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

async function waitForEvent(page, user, expectedType, timeoutMs = 20000) {
  return page.evaluate(async ({ endpoint, token, roomId, expectedType, timeoutMs }) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const response = await fetch(endpoint + "/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-UpStatus-Token": token, "Cache-Control": "no-store" },
        body: JSON.stringify({ roomId }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error("Polling failed: HTTP " + response.status);
      const event = (json.events || []).find(item => item.event_type === "call_signal" && item.payload?.type === expectedType);
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
  }, { endpoint, token: user.token, roomId, expectedType, timeoutMs });
}

try {
  const contextA = await browser.newContext({ permissions: ["microphone"] });
  const contextB = await browser.newContext({ permissions: ["microphone"] });
  pageA = await contextA.newPage();
  pageB = await contextB.newPage();
  await Promise.all([pageA.goto(origin), pageB.goto(origin)]);

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
  streamA = true; streamB = true;
  pcA = true; pcB = true;

  const offer = await pageA.evaluate(async () => {
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
    pageA.waitForFunction(() => window.__upPc.connectionState === "connected", { timeout: 20000 }).then(() => true),
    pageB.waitForFunction(() => window.__upPc.connectionState === "connected", { timeout: 20000 }).then(() => true),
  ]);
  assert.deepEqual(connected, [true, true], "both real browser peer connections must reach connected state");
  const tracks = await Promise.all([
    pageA.evaluate(() => window.__upPc.getSenders().some(sender => sender.track?.kind === "audio")),
    pageB.evaluate(() => window.__upPc.getSenders().some(sender => sender.track?.kind === "audio")),
  ]);
  assert.deepEqual(tracks, [true, true], "both peers must publish audio tracks");
  await pageB.waitForFunction(() => (window.__upRemoteTracks || 0) > 0, { timeout: 10000 });
  const remoteAudioTrack = await pageB.evaluate(() => window.__upRemoteTracks > 0);
  assert.equal(remoteAudioTrack, true, "callee must receive the caller's remote audio track");

  console.log("PASS isolated authenticated browser E2E: invitation acceptance, SDP offer/answer, gathered ICE candidates, and bidirectional audio peer connection.");
} finally {
  if (roomId && pageA) {
    try { await api(pageA, users.A, "/room/close", { roomId }); } catch {}
  }
  for (const page of [pageA, pageB]) {
    if (page) {
      try { await page.evaluate(() => { window.__upPc?.close(); window.__upStream?.getTracks().forEach(track => track.stop()); }); } catch {}
    }
  }
  await browser.close();
}
