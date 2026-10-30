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

console.log("signaling transport adapter: 18 assertions passed");
