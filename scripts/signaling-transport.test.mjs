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
