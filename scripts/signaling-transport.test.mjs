import assert from "node:assert/strict";
import { createSignalingTransport, isAllowedPublicCallDiscoverySignal } from "../src/userscript/signaling-transport.mjs";

const calls = [];
const request = async (path, body, options) => {
  calls.push({ path, body, options });
  if (path === "/poll") return { status: 200, body: { events: [] } };
  if (path === "/room/open") return { status: 201, body: { ok: true, roomId: "sig_open_voice", created: true, joined: true } };
  if (path === "/room/invitations") return { status: 200, body: { invitations: [] } };
  return { status: 200, body: { ok: true } };
};

const disabled = createSignalingTransport({ request });
await assert.rejects(() => disabled.invitations(), error => error.code === "SIGNALING_TRANSPORT_DISABLED");
assert.equal(calls.length, 0, "disabled transport must not send requests");

const client = createSignalingTransport({ request, enabled: true });
await client.createRoom(["mari", "mari"]);
assert.deepEqual(calls.at(-1).body, { participants: ["mari"] });
const openVoice = await client.openVoiceRoom("upstatus-team-room-v1");
assert.equal(calls.at(-1).path, "/room/open");
assert.deepEqual(calls.at(-1).body, { logicalId: "upstatus-team-room-v1" });
assert.equal(openVoice.roomId, "sig_open_voice");
await assert.rejects(() => client.openVoiceRoom("call:forbidden"), /Invalid voice room logical ID/);
await client.bindRoom({ roomId: "sig_123", bindingType: "call", logicalId: "call:abc" });
assert.equal(calls.at(-1).path, "/room/bind");
await client.resolveRoom({ bindingType: "voice", logicalId: "voice-room-v1" });
await client.invite("sig_123", "mari");
const requestInviteKey = "a".repeat(32);
await client.requestInvite("call:abc", { idempotencyKey: requestInviteKey });
assert.equal(calls.at(-1).path, "/room/request-invite");
assert.equal(calls.at(-1).body.idempotencyKey, requestInviteKey);
await client.roomMembers("sig_123");
assert.equal(calls.at(-1).path, "/room/members");
await client.roomStatus("sig_123");
assert.equal(calls.at(-1).path, "/room/status");
await client.accept("sig_123");
await client.decline("sig_123");
await client.sendSignal({ roomId: "sig_123", recipient: "mari", eventType: "call_signal", payload: { type: "invite" } });
assert.match(calls.at(-1).body.idempotencyKey, /^[0-9a-f]{32}$/);
const retrySignalKey = "b".repeat(32);
await client.sendSignal({ roomId: "sig_123", recipient: "mari", eventType: "call_signal", payload: { type: "invite" }, idempotencyKey: retrySignalKey });
assert.equal(calls.at(-1).body.idempotencyKey, retrySignalKey);
await assert.rejects(() => client.sendSignal({ roomId: "sig_123", recipient: "mari", eventType: "call_signal", payload: { type: "invite" }, idempotencyKey: "invalid" }), /Invalid signaling idempotency key/);
await client.poll("sig_123");
await client.ack("sig_123", [1, 1, 2]);
assert.deepEqual(calls.at(-1).body.eventIds, [1, 2]);
await client.leave("sig_123");
assert.equal(calls.at(-1).path, "/room/leave");

for (const code of ["ROOM_UNAVAILABLE", "ROOM_MEMBERSHIP_ENDED"]) {
  const expiredRoomClient = createSignalingTransport({
    enabled: true,
    request: async () => ({ status: 200, body: { error: code } }),
  });
  assert.deepEqual(await expiredRoomClient.leave("sig_expired"), {
    ok: true, alreadyGone: true, code,
  }, `2xx ${code} must be treated as an idempotent completed leave`);

  const missingMembershipClient = createSignalingTransport({
    enabled: true,
    request: async () => ({ status: 404, body: { error: code } }),
  });
  assert.deepEqual(await missingMembershipClient.leave("sig_missing"), {
    ok: true, alreadyGone: true, code,
  }, `non-2xx ${code} must be treated as an idempotent completed leave`);
}
const activeMembershipClient = createSignalingTransport({
  enabled: true,
  request: async () => ({ status: 403, body: { error: "ROOM_MEMBERSHIP_REQUIRED" } }),
});
await assert.rejects(
  () => activeMembershipClient.leave("sig_forbidden"),
  error => error.status === 403 && error.code === "ROOM_MEMBERSHIP_REQUIRED",
  "non-terminal membership errors must remain failures",
);
console.log("signaling leave terminal-state normalization: 5 assertions passed");
await client.close("sig_123");

await assert.rejects(() => client.bindRoom({ roomId: "sig_123", bindingType: "bad", logicalId: "x" }), /Invalid binding type/);
await assert.rejects(() => client.sendSignal({ roomId: "sig_123", recipient: "mari", eventType: "x", payload: [] }), /Invalid signaling payload/);
await assert.rejects(() => client.ack("sig_123", []), /Invalid event IDs/);

const failing = createSignalingTransport({
  enabled: true,
  request: async () => ({ status: 403, body: { error: "Room membership required" } }),
});
await assert.rejects(() => failing.poll("sig_123"), error => error.status === 403 && error.message === "Room membership required");

console.log("signaling transport adapter: 17 assertions passed");

const pollCalls = [];
let handled = 0;
const pollClient = createSignalingTransport({
  enabled: true,
  pollIntervalMs: 5,
  maxBackoffMs: 10,
  request: async (path, body, options) => {
    pollCalls.push({ path, body, options });
    if (path === "/poll") return { status: 200, body: { events: [{ event_id: 7, payload: { type: "invite" } }] } };
    return { status: 200, body: { ok: true } };
  },
});
const stop = pollClient.startPolling("sig_poll", async event => {
  assert.equal(event.event_id, 7);
  handled++;
});
await new Promise(resolve => setTimeout(resolve, 35));
stop();
await new Promise(resolve => setTimeout(resolve, 5));
assert.equal(handled, 1, "duplicate event must be delivered only once");
assert.ok(pollCalls.some(call => call.path === "/ack" && call.body.eventIds.includes(7)), "handled event must be acknowledged");
assert.ok(pollCalls.filter(call => call.path === "/poll").every(call => call.options.signal instanceof AbortSignal), "poll request must receive an abort signal");
console.log("signaling transport polling: 3 assertions passed");

let statusReads = 0;
const waitingClient = createSignalingTransport({
  enabled: true,
  request: async path => {
    if (path === "/room/status") {
      statusReads++;
      return { status: 200, body: { participants: [{ name: "mari", status: statusReads < 2 ? "pending" : "accepted" }] } };
    }
    return { status: 200, body: { ok: true } };
  },
});
const acceptedParticipant = await waitingClient.waitForAcceptance("sig_wait", "mari", { intervalMs: 1, timeoutMs: 100 });
assert.equal(acceptedParticipant.status, "accepted", "caller must wait for explicit recipient acceptance");
assert.equal(statusReads, 2, "pending membership must be rechecked before proceeding");

const declinedClient = createSignalingTransport({
  enabled: true,
  request: async () => ({ status: 200, body: { participants: [{ name: "mari", status: "declined" }] } }),
});
await assert.rejects(
  () => declinedClient.waitForAcceptance("sig_declined", "mari", { intervalMs: 1, timeoutMs: 100 }),
  error => error.code === "SIGNALING_INVITATION_DECLINED",
);
console.log("signaling invitation gate: 3 assertions passed");

const timeoutClient = createSignalingTransport({
  enabled: true,
  now: (() => { let value = 0; return () => value++; })(),
  request: async path => {
    if (path === "/room/status") return { status: 200, body: { participants: [{ name: "mari", status: "pending" }] } };
    return { status: 200, body: { ok: true } };
  },
});
await assert.rejects(
  () => timeoutClient.waitForAcceptance("sig_timeout", "mari", { intervalMs: 0, timeoutMs: 0 }),
  error => error.code === "SIGNALING_INVITATION_TIMEOUT",
);
console.log("signaling invitation timeout: 1 assertion passed");

let releaseDelayedPoll;
let staleHandlerCalls = 0;
const delayedClient = createSignalingTransport({
  enabled: true,
  request: async path => {
    if (path === "/poll") return new Promise(resolve => {
      releaseDelayedPoll = () => resolve({ status: 200, body: { events: [{ event_id: 99 }] } });
    });
    return { status: 200, body: { ok: true } };
  },
});
const stopDelayed = delayedClient.startPolling("sig_cancel", async () => { staleHandlerCalls++; });
stopDelayed();
releaseDelayedPoll();
await new Promise(resolve => setTimeout(resolve, 10));
assert.equal(staleHandlerCalls, 0, "a response arriving after cancellation must not dispatch stale events");
console.log("signaling polling cancellation: 1 assertion passed");

const callSequence = [];
let callStatusReads = 0;
const callSetupClient = createSignalingTransport({
  enabled: true,
  request: async (path, body, options) => {
    callSequence.push({ path, body, options });
    if (path === "/room/prepare-call") return { status: 201, body: { ok: true, created: true, roomId: "sig_call_1" } };
    if (path === "/room/status") {
      callStatusReads++;
      return { status: 200, body: { participants: [{ name: "mari", status: callStatusReads === 1 ? "pending" : "accepted" }] } };
    }
    if (path === "/room/cancel-call") return { status: 200, body: { ok: true, cancelled: true } };
    return { status: 200, body: { ok: true } };
  },
});
const prepared = await callSetupClient.prepareCallRoom("ricardo-call:logical-1", "mari", { intervalMs: 1, timeoutMs: 100 });
assert.equal(prepared.roomId, "sig_call_1");
assert.deepEqual(callSequence.slice(0, 3).map(call => call.path),
  ["/room/prepare-call", "/room/status", "/room/status"]);
assert.equal(callSequence[0].body.logicalId, "ricardo-call:logical-1");
assert.equal(callSequence[0].body.recipient, "mari");
assert.equal(callStatusReads, 2, "call setup must observe accepted state before returning to offer creation");
await callSetupClient.cancelCallRoom("ricardo-call:logical-1");
assert.equal(callSequence.at(-1).path, "/room/cancel-call");
assert.deepEqual(callSequence.at(-1).body, { logicalId: "ricardo-call:logical-1" });
console.log("signaling call setup and logical-id cancellation: 6 assertions passed");

const declineSequence = [];
const declinedSetupClient = createSignalingTransport({
  enabled: true,
  request: async path => {
    declineSequence.push(path);
    if (path === "/room/prepare-call") return { status: 201, body: { roomId: "sig_call_declined" } };
    if (path === "/room/status") return { status: 200, body: { participants: [{ name: "mari", status: "declined" }] } };
    return { status: 200, body: { ok: true, cancelled: true } };
  },
});
await assert.rejects(
  () => declinedSetupClient.prepareCallRoom("ricardo-call:logical-2", "mari", { intervalMs: 1, timeoutMs: 100 }),
  error => error.code === "SIGNALING_INVITATION_DECLINED",
);
assert.ok(declineSequence.includes("/room/cancel-call"), "declined calls must cancel by logical call ID");
assert.equal(declineSequence.includes("/room/close"), false, "call cleanup must not depend on a room ID");
console.log("signaling declined call cleanup: 3 assertions passed");

const abortSetupCalls = [];
const abortSetupClient = createSignalingTransport({
  enabled: true,
  request: async (path, body, options) => {
    abortSetupCalls.push({ path, body, options });
    if (path === "/room/prepare-call") return { status: 201, body: { roomId: "sig_call_abort" } };
    if (path === "/room/status") return { status: 200, body: { participants: [{ name: "mari", status: "pending" }] } };
    return { status: 200, body: { ok: true, cancelled: true } };
  },
});
const setupAbort = new AbortController();
const abortedSetup = abortSetupClient.prepareCallRoom("ricardo-call:logical-abort", "mari", {
  intervalMs: 100,
  timeoutMs: 1000,
  signal: setupAbort.signal,
});
setTimeout(() => setupAbort.abort(), 5);
await assert.rejects(() => abortedSetup, error => error.name === "AbortError");
assert.ok(abortSetupCalls.some(call => call.path === "/room/cancel-call"),
  "aborting an unaccepted call must cancel by logical call ID");
assert.equal(abortSetupCalls.some(call => call.path === "/signal"), false,
  "cancelling before acceptance must never send media signaling");
console.log("signaling call setup cancellation: 2 assertions passed");

const abortClient = createSignalingTransport({
  enabled: true,
  request: async () => ({ status: 200, body: { participants: [{ name: "mari", status: "pending" }] } }),
});
const waitController = new AbortController();
const waiting = abortClient.waitForAcceptance("sig_abort", "mari", {
  intervalMs: 100,
  timeoutMs: 1000,
  signal: waitController.signal,
});
setTimeout(() => waitController.abort(), 5);
await assert.rejects(() => waiting, error => error.name === "AbortError");
console.log("signaling invitation abort: 1 assertion passed");

const fanoutCalls = [];
const fanoutClient = createSignalingTransport({
  enabled: true,
  request: async (path, body) => {
    fanoutCalls.push({ path, body });
    if (path === "/broadcast") return { status: 202, body: { ok: true, attempted: 2, delivered: 2 } };
    return { status: 200, body: { ok: true } };
  },
});
const fanoutKey = "c".repeat(32);
const fanout = await fanoutClient.sendToRoom({
  roomId: "sig_fanout", eventType: "voice_room_signal", payload: { type: "presence" }, senderName: "ricardo", idempotencyKey: fanoutKey,
});
assert.deepEqual(fanout, { attempted: 2, delivered: 2, failed: 0, duplicate: false });
assert.deepEqual(fanoutCalls.filter(call => call.path === "/broadcast").map(call => call.body.eventType), ["voice_room_signal"]);
assert.equal(fanoutCalls.find(call => call.path === "/broadcast").body.idempotencyKey, fanoutKey);
const retryClient = createSignalingTransport({
  enabled: true,
  request: async () => { throw new Error("temporary network failure"); },
});
const preservedRetryKey = "d".repeat(32);
await assert.rejects(
  () => retryClient.sendSignal({
    roomId: "sig_retry", recipient: "mari", eventType: "call_signal",
    payload: { type: "offer" }, idempotencyKey: preservedRetryKey,
  }),
  error => error.message === "temporary network failure" && error.idempotencyKey === preservedRetryKey
);
console.log("signaling recipient fanout: 2 assertions passed");


let recoveryPolls = 0;
let recoveryHandled = 0;
let recoveryAcknowledged = false;
const recoveryClient = createSignalingTransport({
  enabled: true,
  pollIntervalMs: 2,
  maxBackoffMs: 8,
  request: async (path) => {
    if (path === "/poll") {
      recoveryPolls++;
      if (recoveryPolls === 1) return { status: 503, body: { error: "temporary outage" } };
      if (recoveryPolls === 2) return { status: 200, body: { events: [{ event_id: 301 }] } };
      return { status: 200, body: { events: [] } };
    }
    if (path === "/ack") recoveryAcknowledged = true;
    return { status: 200, body: { ok: true } };
  },
});
const stopRecovery = recoveryClient.startPolling("sig_recovery", async event => {
  assert.equal(event.event_id, 301);
  recoveryHandled++;
});
for (let i = 0; i < 100 && !recoveryAcknowledged; i++) {
  await new Promise(resolve => setTimeout(resolve, 2));
}
stopRecovery();
assert.ok(recoveryPolls >= 2, "polling must retry after a transient endpoint failure");
assert.equal(recoveryHandled, 1, "recovered event must be dispatched exactly once");
assert.equal(recoveryAcknowledged, true, "recovered event must be acknowledged after handling");
console.log("signaling transient recovery: 3 assertions passed");

const concurrentRoomEvents = [];
const concurrentPollCounts = new Map();
const concurrentClient = createSignalingTransport({
  enabled: true,
  pollIntervalMs: 2,
  request: async (path, body) => {
    if (path === "/poll") {
      const count = (concurrentPollCounts.get(body.roomId) || 0) + 1;
      concurrentPollCounts.set(body.roomId, count);
      if (count === 1) {
        const eventId = body.roomId === "sig_parallel_a" ? 401 : 402;
        return { status: 200, body: { events: [{ event_id: eventId, roomId: body.roomId }] } };
      }
      return { status: 200, body: { events: [] } };
    }
    return { status: 200, body: { ok: true } };
  },
});
const stopParallelA = concurrentClient.startPolling("sig_parallel_a", async event => {
  concurrentRoomEvents.push(["sig_parallel_a", event.event_id]);
});
const stopParallelB = concurrentClient.startPolling("sig_parallel_b", async event => {
  concurrentRoomEvents.push(["sig_parallel_b", event.event_id]);
});
for (let i = 0; i < 100 && concurrentRoomEvents.length < 2; i++) {
  await new Promise(resolve => setTimeout(resolve, 2));
}
stopParallelA();
stopParallelB();
assert.deepEqual(concurrentRoomEvents.sort((a, b) => a[0].localeCompare(b[0])),
  [["sig_parallel_a", 401], ["sig_parallel_b", 402]],
  "parallel room pollers must dispatch only their own room events");
assert.equal(concurrentClient.activePollCount, 0, "stopping parallel pollers must release both active poll slots");
console.log("signaling parallel room polling: 2 assertions passed");


let stopAllAbortObserved = false;
let stopAllHandlerCalls = 0;
let resolveStopAllAbort;
const stopAllAbort = new Promise(resolve => { resolveStopAllAbort = resolve; });
const stopAllClient = createSignalingTransport({
  enabled: true,
  request: async (path, body, options = {}) => {
    if (path !== "/poll") return { status: 200, body: { ok: true } };
    return new Promise((resolve, reject) => {
      const signal = options.signal;
      if (!signal) return reject(new Error("poll signal missing"));
      const onAbort = () => {
        stopAllAbortObserved = true;
        resolveStopAllAbort();
        const error = new Error("poll aborted by stopAll");
        error.name = "AbortError";
        reject(error);
      };
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    });
  },
});
stopAllClient.startPolling("sig_stop_all", async () => { stopAllHandlerCalls++; });
stopAllClient.stopAll();
await Promise.race([
  stopAllAbort,
  new Promise((_, reject) => setTimeout(() => reject(new Error("stopAll did not abort in-flight poll")), 100)),
]);
await new Promise(resolve => setTimeout(resolve, 5));
assert.equal(stopAllAbortObserved, true, "stopAll must abort every in-flight poll request");
assert.equal(stopAllHandlerCalls, 0, "events from an aborted poll must not be dispatched");
assert.equal(stopAllClient.activePollCount, 0, "stopAll must release all active poll slots");
assert.throws(
  () => stopAllClient.startPolling("sig_after_stop", async () => {}),
  error => error.code === "SIGNALING_TRANSPORT_STOPPED",
  "a stopped transport instance must reject new pollers; callers must create a fresh instance after reconnect",
);
console.log("signaling stopAll reconnect lifecycle: 4 assertions passed");

const voiceAttemptCalls = [];
const voiceAttemptClient = createSignalingTransport({
  enabled: true,
  request: async (path, body, options) => {
    voiceAttemptCalls.push({ path, body, options });
    if (path === "/room/open") return { status: 201, body: { ok: true, created: true, roomId: "sig_voice_attempt_1", attemptId: body.attemptId } };
    if (path === "/room/cancel-open") return { status: 200, body: { ok: true, cancelled: true } };
    return { status: 200, body: { ok: true } };
  },
});
const attemptOpened = await voiceAttemptClient.openVoiceRoom("upstatus-team-room-v1", "ricardo-voice-attempt-1");
assert.equal(attemptOpened.roomId, "sig_voice_attempt_1");
assert.deepEqual(voiceAttemptCalls[0], {
  path: "/room/open",
  body: { logicalId: "upstatus-team-room-v1", attemptId: "ricardo-voice-attempt-1" },
  options: {},
});
const attemptCancelled = await voiceAttemptClient.cancelVoiceRoomOpen("upstatus-team-room-v1", "ricardo-voice-attempt-1");
assert.equal(attemptCancelled.cancelled, true);
assert.deepEqual(voiceAttemptCalls[1], {
  path: "/room/cancel-open",
  body: { logicalId: "upstatus-team-room-v1", attemptId: "ricardo-voice-attempt-1" },
  options: {},
});
await assert.rejects(
  () => voiceAttemptClient.cancelVoiceRoomOpen("upstatus-team-room-v1", "invalid attempt id"),
  error => error instanceof TypeError,
);
await assert.rejects(
  () => voiceAttemptClient.openVoiceRoom("upstatus-team-room-v1", "invalid attempt id"),
  error => error instanceof TypeError,
);
const legacyVoiceClient = createSignalingTransport({
  enabled: true,
  request: async (path, body) => {
    assert.equal(path, "/room/open");
    assert.deepEqual(body, { logicalId: "upstatus-team-room-v1" }, "legacy callers must remain backward compatible");
    return { status: 201, body: { ok: true, created: true, roomId: "sig_voice_legacy" } };
  },
});
assert.equal((await legacyVoiceClient.openVoiceRoom("upstatus-team-room-v1")).roomId, "sig_voice_legacy");
console.log("signaling voice attempt transport: 9 assertions passed");

const duplicateVoiceAttemptClient = createSignalingTransport({
  enabled: true,
  request: async () => ({ status: 409, body: { error: "VOICE_ATTEMPT_ALREADY_ACTIVE" } }),
});
await assert.rejects(
  () => duplicateVoiceAttemptClient.openVoiceRoom("upstatus-team-room-v1", "ricardo-voice-duplicate"),
  error => error.status === 409 &&
    error.code === "VOICE_ATTEMPT_ALREADY_ACTIVE" &&
    error.message.includes("outra aba"),
  "a second tab must receive a clear conflict instead of silently sharing one account membership",
);
console.log("voice attempt singleton conflict message test passed");

// Retry-After must survive the GM bridge contract and be exposed on rate-limit errors.
const retryAfterClient = createSignalingTransport({
  enabled: true,
  now: () => 100_000,
  request: async () => ({
    status: 429,
    body: { error: "Rate limit exceeded" },
    headers: "content-type: application/json\r\nReTrY-AfTeR: 60\r\n",
  }),
});
await assert.rejects(
  () => retryAfterClient.poll("sig_retry_after"),
  error => error.status === 429 && error.retryAfterMs === 60_000 && error.retryAfterSeconds === 60,
  "delta-seconds Retry-After must be preserved on the transport error",
);
const retryAfterDateClient = createSignalingTransport({
  enabled: true,
  now: () => 100_000,
  request: async () => ({
    status: 429,
    body: { error: "Rate limit exceeded" },
    headers: { "Retry-After": new Date(160_000).toUTCString() },
  }),
});
await assert.rejects(
  () => retryAfterDateClient.poll("sig_retry_after_date"),
  error => error.retryAfterMs === 60_000,
  "HTTP-date Retry-After must be converted relative to the injected clock",
);

const scheduledRetryTimers = [];
const retryPollingClient = createSignalingTransport({
  enabled: true,
  pollIntervalMs: 900,
  maxBackoffMs: 8_000,
  setTimeoutFn: (callback, delay) => {
    scheduledRetryTimers.push({ callback, delay });
    return scheduledRetryTimers.length;
  },
  clearTimeoutFn: () => {},
  request: async () => ({
    status: 429,
    body: { error: "Rate limit exceeded" },
    headers: "Retry-After: 60\r\n",
  }),
});
const stopRetryPolling = retryPollingClient.startPolling("sig_retry_after_poll", async () => {});
for (let i = 0; i < 12 && !scheduledRetryTimers.length; i++) await Promise.resolve();
assert.equal(scheduledRetryTimers.length, 1, "one failed poll must schedule one retry");
assert.equal(scheduledRetryTimers[0].delay, 60_000,
  "polling must wait at least the server's 60-second Retry-After instead of the shorter exponential backoff");
stopRetryPolling();

const inheritedDiscovery = Object.create({ type: "presence", discoveryOnly: true });
const publicDiscoveryCases = [
  [{ type: "presence", discoveryOnly: true }, true, "explicit public presence hint is allowed"],
  [{ type: "presence", discoveryOnly: false }, false, "presence without the discovery marker is rejected"],
  [{ type: "presence" }, false, "ordinary presence is not implicitly public"],
  [{ type: "ended", discoveryOnly: true }, true, "public ended is accepted only as a directory-discovery hint"],
  [{ type: "join_declined", discoveryOnly: true }, false, "public join_declined cannot spoof a refusal"],
  [{ type: "offer", discoveryOnly: true }, false, "public offers are never discovery hints"],
  [{ type: "answer", discoveryOnly: true }, false, "public answers are never discovery hints"],
  [{ type: "ice", discoveryOnly: true }, false, "public ICE is never a discovery hint"],
  [null, false, "null payload is rejected"],
  [[], false, "array payload is rejected"],
  [inheritedDiscovery, false, "inherited marker properties are not trusted"],
];
for (const [signal, expected, label] of publicDiscoveryCases) {
  assert.equal(isAllowedPublicCallDiscoverySignal(signal), expected, label);
}

console.log("Retry-After polling and public call-discovery policy tests passed");


// Idempotent sends retry with the exact same key and request body after ambiguous failures.
const automaticRetryCalls = [];
let automaticRetryAttempt = 0;
const automaticRetryClient = createSignalingTransport({
  enabled: true,
  retryBaseDelayMs: 0,
  request: async (path, body) => {
    automaticRetryCalls.push({ path, body });
    automaticRetryAttempt++;
    if (automaticRetryAttempt === 1) throw new Error("temporary network failure");
    return { status: 202, body: { ok: true } };
  },
});
await automaticRetryClient.sendSignal({
  roomId: "sig_retry_auto",
  recipient: "mari",
  eventType: "call_signal",
  payload: { type: "offer", sdp: "v=0", at: 100 },
});
assert.equal(automaticRetryCalls.length, 2, "a transient send failure must receive one bounded retry");
assert.equal(automaticRetryCalls[0].body.idempotencyKey, automaticRetryCalls[1].body.idempotencyKey,
  "automatic retry must reuse the first idempotency key");
assert.deepEqual(automaticRetryCalls[0].body, automaticRetryCalls[1].body,
  "automatic retry must resend the exact original request body");
console.log("signaling transient send retry and key reuse: 3 assertions passed");

// A later caller retry reuses the key and original payload even when only transport timestamps changed.
const manualRetryCalls = [];
let allowManualRetry = false;
const manualRetryClient = createSignalingTransport({
  enabled: true,
  maxIdempotentRetries: 0,
  request: async (path, body) => {
    manualRetryCalls.push({ path, body });
    if (!allowManualRetry) throw new Error("connection lost after request");
    return { status: 202, body: { ok: true } };
  },
});
await assert.rejects(
  () => manualRetryClient.sendSignal({
    roomId: "sig_retry_manual",
    recipient: "mari",
    eventType: "call_signal",
    payload: { type: "offer", sdp: { type: "offer", sdp: "v=0" }, at: 100 },
  }),
  error => {
    assert.match(error.idempotencyKey, /^[0-9a-f]{32}$/);
    return true;
  },
);
const manualRetryKey = manualRetryCalls[0].body.idempotencyKey;
allowManualRetry = true;
await manualRetryClient.sendSignal({
  roomId: "sig_retry_manual",
  recipient: "mari",
  eventType: "call_signal",
  payload: { sdp: { sdp: "v=0", type: "offer" }, at: 200, type: "offer" },
});
assert.equal(manualRetryCalls[1].body.idempotencyKey, manualRetryKey,
  "the next attempt for the same logical payload must reuse the failed request key");
assert.equal(manualRetryCalls[1].body.payload.at, 100,
  "a retry must replay the exact original payload, not a newly timestamped body");
assert.deepEqual(manualRetryCalls[1].body.payload.sdp, manualRetryCalls[0].body.payload.sdp,
  "canonical object-key ordering must not change the original SDP body");
console.log("signaling retry-key retention across caller retries: 3 assertions passed");

// Distinct payloads and explicit operation IDs must not share a pending retry key.
const distinctRetryCalls = [];
let distinctAttempt = 0;
const distinctRetryClient = createSignalingTransport({
  enabled: true,
  maxIdempotentRetries: 0,
  request: async (path, body) => {
    distinctRetryCalls.push({ path, body });
    distinctAttempt++;
    if (distinctAttempt === 1) throw new Error("temporary network failure");
    return { status: 202, body: { ok: true } };
  },
});
await assert.rejects(() => distinctRetryClient.sendSignal({
  roomId: "sig_retry_distinct",
  recipient: "mari",
  eventType: "call_signal",
  payload: { type: "ice", candidate: "candidate:one" },
  operationId: "negotiation-one",
}));
await distinctRetryClient.sendSignal({
  roomId: "sig_retry_distinct",
  recipient: "mari",
  eventType: "call_signal",
  payload: { type: "ice", candidate: "candidate:one" },
  operationId: "negotiation-two",
});
assert.notEqual(distinctRetryCalls[0].body.idempotencyKey, distinctRetryCalls[1].body.idempotencyKey,
  "different logical operation IDs must receive independent idempotency keys");
assert.equal(Object.prototype.hasOwnProperty.call(distinctRetryCalls[1].body, "operationId"), false,
  "local-only operation IDs must never be sent to the server");
console.log("signaling logical operation identity isolation: 2 assertions passed");

// Permanent authorization errors are not cached; a later authorized attempt starts a new operation.
const permanentRetryCalls = [];
let permanentRetryAttempt = 0;
const permanentRetryClient = createSignalingTransport({
  enabled: true,
  maxIdempotentRetries: 1,
  request: async (path, body) => {
    permanentRetryCalls.push({ path, body });
    permanentRetryAttempt++;
    if (permanentRetryAttempt === 1) return { status: 403, body: { error: "ROOM_MEMBERSHIP_REQUIRED" } };
    return { status: 202, body: { ok: true } };
  },
});
const permanentRetryPayload = {
  roomId: "sig_retry_forbidden",
  recipient: "mari",
  eventType: "call_signal",
  payload: { type: "offer", sdp: "v=0" },
};
await assert.rejects(() => permanentRetryClient.sendSignal(permanentRetryPayload),
  error => error.status === 403 && error.code === "ROOM_MEMBERSHIP_REQUIRED");
await permanentRetryClient.sendSignal(permanentRetryPayload);
assert.notEqual(permanentRetryCalls[0].body.idempotencyKey, permanentRetryCalls[1].body.idempotencyKey,
  "a permanent 4xx failure must not poison a future authorized operation");
assert.equal(permanentRetryCalls.length, 2, "permanent authorization failures must not be retried automatically");
console.log("signaling permanent-error retry policy: 2 assertions passed");

// Concurrent retries for one logical operation are coalesced into one HTTP request.
const concurrentRetryCalls = [];
let releaseConcurrentRetry;
const concurrentRetryClient = createSignalingTransport({
  enabled: true,
  maxIdempotentRetries: 0,
  request: (path, body) => {
    concurrentRetryCalls.push({ path, body });
    return new Promise(resolve => {
      releaseConcurrentRetry = () => resolve({ status: 202, body: { ok: true } });
    });
  },
});
const concurrentRetryPayload = {
  roomId: "sig_retry_concurrent",
  recipient: "mari",
  eventType: "call_signal",
  payload: { type: "answer", sdp: "v=0", at: 100 },
};
const concurrentRetryOne = concurrentRetryClient.sendSignal(concurrentRetryPayload);
const concurrentRetryTwo = concurrentRetryClient.sendSignal({
  ...concurrentRetryPayload,
  payload: { type: "answer", sdp: "v=0", at: 200 },
});
assert.equal(concurrentRetryCalls.length, 1, "concurrent duplicate operations must share one in-flight request");
releaseConcurrentRetry();
await Promise.all([concurrentRetryOne, concurrentRetryTwo]);
console.log("signaling concurrent retry coalescing: 1 assertion passed");

// Expired retry keys are discarded instead of being reused indefinitely.
let retryCacheClock = 0;
let retryCacheAttempt = 0;
const expiryRetryCalls = [];
const expiryRetryClient = createSignalingTransport({
  enabled: true,
  now: () => retryCacheClock,
  retryKeyTtlMs: 100,
  maxIdempotentRetries: 0,
  request: async (path, body) => {
    expiryRetryCalls.push({ path, body });
    retryCacheAttempt++;
    if (retryCacheAttempt === 1) throw new Error("temporary network failure");
    return { status: 202, body: { ok: true } };
  },
});
const expiryRetryPayload = {
  roomId: "sig_retry_expiry",
  recipient: "mari",
  eventType: "call_signal",
  payload: { type: "offer", sdp: "v=0" },
};
await assert.rejects(() => expiryRetryClient.sendSignal(expiryRetryPayload));
retryCacheClock = 101;
await expiryRetryClient.sendSignal(expiryRetryPayload);
assert.notEqual(expiryRetryCalls[0].body.idempotencyKey, expiryRetryCalls[1].body.idempotencyKey,
  "expired retry keys must be replaced with a fresh key");
console.log("signaling retry-key TTL: 1 assertion passed");

// Long Retry-After values defer the retry but keep the original key/body for the next caller attempt.
const retryAfterCalls = [];
let retryAfterAttempt = 0;
const retryAfterClient = createSignalingTransport({
  enabled: true,
  maxIdempotentRetries: 1,
  maxRetryAfterMs: 1500,
  request: async (path, body) => {
    retryAfterCalls.push({ path, body });
    retryAfterAttempt++;
    if (retryAfterAttempt === 1) {
      return { status: 429, body: { error: "RATE_LIMITED" }, headers: "Retry-After: 10\\r\\n" };
    }
    return { status: 202, body: { ok: true } };
  },
});
await assert.rejects(() => retryAfterClient.sendSignal({
  roomId: "sig_retry_after",
  recipient: "mari",
  eventType: "call_signal",
  payload: { type: "offer", sdp: "v=0", at: 100 },
}), error => error.status === 429 && error.retryAfterMs === 10000);
assert.equal(retryAfterCalls.length, 1, "long Retry-After must not be shortened into an early retry");
await retryAfterClient.sendSignal({
  roomId: "sig_retry_after",
  recipient: "mari",
  eventType: "call_signal",
  payload: { type: "offer", sdp: "v=0", at: 200 },
});
assert.equal(retryAfterCalls[0].body.idempotencyKey, retryAfterCalls[1].body.idempotencyKey,
  "a deferred retry must retain the original idempotency key");
assert.equal(retryAfterCalls[1].body.payload.at, 100,
  "a deferred retry must replay the original request body");
console.log("signaling Retry-After deferred retry retention: 3 assertions passed");

// Room broadcasts use the same retry-key and exact-payload guarantees as unicast signaling.
const broadcastRetryCalls = [];
let allowBroadcastRetry = false;
const broadcastRetryClient = createSignalingTransport({
  enabled: true,
  maxIdempotentRetries: 0,
  request: async (path, body) => {
    if (path === "/broadcast") {
      broadcastRetryCalls.push({ path, body });
      if (!allowBroadcastRetry) throw new Error("broadcast response lost");
      return { status: 202, body: { ok: true, attempted: 1, delivered: 1 } };
    }
    return { status: 200, body: { ok: true } };
  },
});
const broadcastRetryArgs = {
  roomId: "sig_broadcast_retry",
  eventType: "voice_room_signal",
  senderName: "ricardo",
  payload: { type: "presence", from: "ricardo", at: 100 },
};
await assert.rejects(() => broadcastRetryClient.sendToRoom(broadcastRetryArgs));
allowBroadcastRetry = true;
await broadcastRetryClient.sendToRoom({
  ...broadcastRetryArgs,
  payload: { type: "presence", from: "ricardo", at: 200 },
});
assert.equal(broadcastRetryCalls[0].body.idempotencyKey, broadcastRetryCalls[1].body.idempotencyKey,
  "room broadcast retries must reuse the original idempotency key");
assert.equal(broadcastRetryCalls[1].body.payload.at, 100,
  "room broadcast retries must preserve the original request body");
console.log("signaling broadcast retry-key retention: 2 assertions passed");
