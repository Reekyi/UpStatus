#!/usr/bin/env node
import assert from "node:assert/strict";
import { isAllowedLegacyEnvelope } from "../supabase/functions/upstatus-signal-test/legacy-envelope.mjs";

const allowed = {
  call_signal: [
    "presence", "ended", "join_request", "join_approved", "join_declined", "offer", "answer",
    "ice", "invite", "join", "ringtone_stop", "reject", "busy", "hangup", "leave",
  ],
  voice_room_signal: ["presence", "join", "leave", "offer", "answer", "ice"],
  screen_signal: ["presence", "leave", "offer", "answer", "ice"],
};

for (const [eventType, subtypes] of Object.entries(allowed)) {
  for (const type of subtypes) {
    assert.equal(isAllowedLegacyEnvelope(eventType, { type }), true, `${eventType}/${type} should be allowed`);
  }
  assert.equal(isAllowedLegacyEnvelope(eventType, { type: "arbitrary_admin_action" }), false,
    `${eventType} must reject unknown inner subtypes`);
  assert.equal(isAllowedLegacyEnvelope(eventType, {}), false, `${eventType} must require payload.type`);
  assert.equal(isAllowedLegacyEnvelope(eventType, { type: 42 }), false, `${eventType} must require string subtype`);
}

assert.equal(isAllowedLegacyEnvelope("offer", { sdp: "synthetic" }), true,
  "legacy non-envelope event types should retain their existing payload contract");
assert.equal(isAllowedLegacyEnvelope("screen_signal", { type: "voice_mute" }), false,
  "screen envelope must not accept voice-only event types");
assert.equal(isAllowedLegacyEnvelope("voice_room_signal", { type: "join_request" }), false,
  "voice envelope must not accept call-only event types");

console.log("PASS call, voice, and screen subtype allowlists");
console.log("PASS malformed and cross-channel subtype rejection");
console.log("PASS non-envelope compatibility");
console.log("3/3 signaling envelope unit test groups passed.");
