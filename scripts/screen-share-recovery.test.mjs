import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const sourcePath = process.argv[2];
const allowedSources = new Set([
  "src/userscript/upstatus.user.template.js",
  "team-lite/upstatus-team-lite.user.js",
]);
assert.ok(allowedSources.has(sourcePath), "pass one explicitly allowlisted UpStatus userscript source path");

const source = readFileSync(sourcePath, "utf8");
const start = source.indexOf("function screenShareDrop(name){");
const end = source.indexOf("async function screenShareStart()", start);
assert.ok(start >= 0 && end > start, "screen-share peer/recovery function boundaries must exist");

const extracted = source.slice(start, end) + [
  "this.__screenShareDrop=screenShareDrop;",
  "this.__screenShareMakePeer=screenShareMakePeer;",
  "this.__screenShareOffer=screenShareOffer;",
  "this.__screenShareReceive=screenShareReceive;",
].join("\n");

function makeContext({ active = true } = {}) {
  const sent = [];
  const timers = new Map();
  const peers = [];
  let nextTimer = 1;

  class FakeMediaStream {
    constructor() { this.tracks = []; }
    getTracks() { return this.tracks.slice(); }
    getVideoTracks() { return this.tracks.filter(track => track.kind === "video"); }
    addTrack(track) { this.tracks.push(track); }
  }

  class FakePeerConnection {
    constructor() {
      this.signalingState = "stable";
      this.connectionState = "new";
      this.iceConnectionState = "new";
      this.localDescription = null;
      this.remoteDescription = null;
      this.createOfferCalls = 0;
      this.createAnswerCalls = 0;
      this.closed = false;
      this.ontrack = null;
      this.onicecandidate = null;
      this.onconnectionstatechange = null;
      peers.push(this);
    }
    async createOffer() {
      this.createOfferCalls++;
      return { type: "offer", sdp: "local-offer-" + this.createOfferCalls };
    }
    async createAnswer() {
      this.createAnswerCalls++;
      return { type: "answer", sdp: "local-answer-" + this.createAnswerCalls };
    }
    async setLocalDescription(description) {
      this.localDescription = { type: description.type, sdp: description.sdp };
      this.signalingState = description.type === "offer" ? "have-local-offer" : "stable";
    }
    async setRemoteDescription(description) {
      this.remoteDescription = { type: description.type, sdp: description.sdp };
      this.signalingState = description.type === "offer" ? "have-remote-offer" : "stable";
    }
    async addIceCandidate() {}
    addTrack() {}
    close() {
      this.closed = true;
      this.connectionState = "closed";
      this.signalingState = "closed";
    }
  }

  class FakeSessionDescription {
    constructor(description) {
      this.type = description.type;
      this.sdp = description.sdp;
    }
  }

  class FakeIceCandidate {
    constructor(candidate) { Object.assign(this, candidate); }
  }

  const context = {
    screenShare: {
      stream: null,
      peers: Object.create(null),
      active,
      starting: false,
      remoteVideos: Object.create(null),
    },
    voiceRoom: { id: "screen-room-1" },
    member: "Alice",
    MediaStream: FakeMediaStream,
    RTCPeerConnection: FakePeerConnection,
    RTCSessionDescription: FakeSessionDescription,
    RTCIceCandidate: FakeIceCandidate,
    screenShareSend(type, to, data) {
      sent.push({ type, to, data });
      return Promise.resolve(true);
    },
    screenShareMessage() {},
    screenShareRender() {},
    setTimeout(callback, delay) {
      const id = nextTimer++;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    Promise,
    Date,
    JSON,
    Array,
    Object,
    Math,
    Number,
    String,
    Error,
  };

  vm.runInNewContext(extracted, context, { timeout: 1000 });
  return {
    context,
    sent,
    timers,
    peers,
    fireNextTimer() {
      const next = timers.entries().next();
      assert.equal(next.done, false, "expected a scheduled screen-share recovery timer");
      const [id, timer] = next.value;
      timers.delete(id);
      timer.callback();
      return timer;
    },
  };
}

// A lost offer/answer must be recoverable by retransmitting the same local offer.
{
  const test = makeContext();
  await test.context.__screenShareOffer("Bob");
  const peer = test.context.screenShare.peers.Bob;
  assert.equal(peer.pc.createOfferCalls, 1);
  assert.equal(test.sent.filter(item => item.type === "offer").length, 1);
  const originalSdp = test.sent[0].data.sdp.sdp;

  await test.context.__screenShareOffer("Bob");
  assert.equal(peer.pc.createOfferCalls, 1, "presence retry must not create a second offer while the first is pending");
  const offers = test.sent.filter(item => item.type === "offer");
  assert.equal(offers.length, 2, "presence must retransmit the pending offer");
  assert.equal(offers[1].data.sdp.sdp, originalSdp, "presence retry must reuse the exact pending SDP");
  assert.equal(test.timers.size, 1, "retransmission must keep one bounded recovery timer");
}

// The recovery timer retries a pending offer at most three times.
{
  const test = makeContext();
  await test.context.__screenShareOffer("Bob");
  for (let attempt = 1; attempt <= 3; attempt++) {
    test.fireNextTimer();
    assert.equal(test.sent.filter(item => item.type === "offer").length, attempt + 1);
  }
  assert.equal(test.timers.size, 0, "screen-share offer retries must stop after the configured bound");
  assert.equal(test.context.screenShare.peers.Bob.offerRetries, 3);
}

// A timer that fires after the peer recovered must not retransmit or drop it.
{
  const test = makeContext();
  await test.context.__screenShareOffer("Bob");
  const peer = test.context.screenShare.peers.Bob;
  peer.pc.connectionState = "connected";
  peer.pc.iceConnectionState = "connected";
  test.fireNextTimer();
  assert.equal(test.sent.filter(item => item.type === "offer").length, 1);
  assert.equal(test.context.screenShare.peers.Bob, peer);
  assert.equal(peer.pc.closed, false);
  assert.equal(peer.localOffer, null);
  assert.equal(test.timers.size, 0);
}

// A duplicate remote offer must resend the cached answer without renegotiating.
{
  const test = makeContext({ active: false });
  const incoming = {
    roomId: "screen-room-1",
    from: "Bob",
    to: "Alice",
    type: "offer",
    sdp: { type: "offer", sdp: "remote-offer-1" },
  };
  await test.context.__screenShareReceive(incoming);
  const peer = test.context.screenShare.peers.Bob;
  assert.equal(peer.pc.createAnswerCalls, 1);
  const firstAnswer = test.sent.find(item => item.type === "answer");
  assert.ok(firstAnswer);
  await test.context.__screenShareReceive(incoming);
  const answers = test.sent.filter(item => item.type === "answer");
  assert.equal(peer.pc.createAnswerCalls, 1, "duplicate offer must not create a second answer");
  assert.equal(answers.length, 2, "duplicate offer must retransmit the cached answer");
  assert.equal(answers[1].data.sdp.sdp, firstAnswer.data.sdp.sdp);
}

// A disconnected peer is discarded before a fresh offer is created.
{
  const test = makeContext();
  await test.context.__screenShareOffer("Bob");
  const oldPeer = test.context.screenShare.peers.Bob;
  oldPeer.pc.connectionState = "disconnected";
  oldPeer.pc.iceConnectionState = "disconnected";
  await test.context.__screenShareOffer("Bob");
  const newPeer = test.context.screenShare.peers.Bob;
  assert.notEqual(newPeer, oldPeer);
  assert.equal(oldPeer.pc.closed, true);
  assert.equal(newPeer.pc.createOfferCalls, 1);
  assert.equal(test.sent.filter(item => item.type === "offer").length, 2);
}

// Applying the remote answer and dropping a peer both cancel pending recovery timers.
{
  const answered = makeContext();
  await answered.context.__screenShareOffer("Bob");
  const peer = answered.context.screenShare.peers.Bob;
  await answered.context.__screenShareReceive({
    roomId: "screen-room-1",
    from: "Bob",
    to: "Alice",
    type: "answer",
    sdp: { type: "answer", sdp: "remote-answer-1" },
  });
  assert.equal(peer.pc.remoteDescription.sdp, "remote-answer-1");
  assert.equal(peer.localOffer, null);
  assert.equal(answered.timers.size, 0);

  const dropped = makeContext();
  await dropped.context.__screenShareOffer("Bob");
  const droppedPeer = dropped.context.screenShare.peers.Bob;
  assert.equal(dropped.timers.size, 1);
  dropped.context.__screenShareDrop("Bob");
  assert.equal(dropped.timers.size, 0);
  assert.equal(droppedPeer.pc.closed, true);
}

console.log("Screen-share offer/answer retransmission, bounded recovery, stale-peer replacement and timer cleanup passed for " + sourcePath + ".");
