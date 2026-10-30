import assert from "node:assert/strict";
import { createSignalingTransport } from "../src/userscript/signaling-transport.mjs";

const calls = [];
const request = async (path, body, options) => {
  calls.push({ path, body, options });
  if (path === "/poll") return { status: 200, body: { events: [] } };
  if (path === "/room/invitations") return { status: 200, body: { invitations: [] } };
  return { status: 200, body: { ok: true } };
};

const disabled = createSignalingTransport({ request });
await assert.rejects(() => disabled.invitations(), error => error.code === "SIGNALING_TRANSPORT_DISABLED");
assert.equal(calls.length, 0, "disabled transport must not send requests");

const client = createSignalingTransport({ request, enabled: true });
await client.createRoom(["mari", "mari"]);
assert.deepEqual(calls.at(-1).body, { participants: ["mari"] });
await client.bindRoom({ roomId: "sig_123", bindingType: "call", logicalId: "call:abc" });
assert.equal(calls.at(-1).path, "/room/bind");
await client.resolveRoom({ bindingType: "voice", logicalId: "voice-room-v1" });
await client.invite("sig_123", "mari");
await client.roomMembers("sig_123");
assert.equal(calls.at(-1).path, "/room/members");
await client.roomStatus("sig_123");
assert.equal(calls.at(-1).path, "/room/status");
await client.accept("sig_123");
await client.decline("sig_123");
await client.sendSignal({ roomId: "sig_123", recipient: "mari", eventType: "call_signal", payload: { type: "invite" } });
await client.poll("sig_123");
await client.ack("sig_123", [1, 1, 2]);
assert.deepEqual(calls.at(-1).body.eventIds, [1, 2]);
await client.close("sig_123");

await assert.rejects(() => client.bindRoom({ roomId: "sig_123", bindingType: "bad", logicalId: "x" }), /Invalid binding type/);
await assert.rejects(() => client.sendSignal({ roomId: "sig_123", recipient: "mari", eventType: "x", payload: [] }), /Invalid signaling payload/);
await assert.rejects(() => client.ack("sig_123", []), /Invalid event IDs/);

const failing = createSignalingTransport({
  enabled: true,
  request: async () => ({ status: 403, body: { error: "Room membership required" } }),
});
await assert.rejects(() => failing.poll("sig_123"), error => error.status === 403 && error.message === "Room membership required");

console.log("signaling transport adapter: 11 assertions passed");

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
  request: async (path, body) => {
    callSequence.push(path);
    if (path === "/room/create") return { status: 201, body: { ok: true, roomId: "sig_call_1" } };
    if (path === "/room/status") {
      callStatusReads++;
      return { status: 200, body: { participants: [{ name: "mari", status: callStatusReads === 1 ? "pending" : "accepted" }] } };
    }
    return { status: 200, body: { ok: true } };
  },
});
const prepared = await callSetupClient.prepareCallRoom("call:logical-1", "mari", { intervalMs: 1, timeoutMs: 100 });
assert.equal(prepared.roomId, "sig_call_1");
assert.deepEqual(callSequence.slice(0, 3), ["/room/create", "/room/bind", "/room/status"]);
assert.equal(callSequence[3], "/room/status", "call setup must observe accepted state before returning to offer creation");

const declineSequence = [];
const declinedSetupClient = createSignalingTransport({
  enabled: true,
  request: async path => {
    declineSequence.push(path);
    if (path === "/room/create") return { status: 201, body: { roomId: "sig_call_declined" } };
    if (path === "/room/status") return { status: 200, body: { participants: [{ name: "mari", status: "declined" }] } };
    return { status: 200, body: { ok: true } };
  },
});
await assert.rejects(
  () => declinedSetupClient.prepareCallRoom("call:logical-2", "mari", { intervalMs: 1, timeoutMs: 100 }),
  error => error.code === "SIGNALING_INVITATION_DECLINED",
);
assert.ok(declineSequence.includes("/room/close"), "declined calls must clean up the temporary room");
console.log("signaling call setup gate: 4 assertions passed");

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
