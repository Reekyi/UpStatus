const LEGACY_ENVELOPE_TYPES = new Map([
  ["call_signal", new Set([
    "presence", "ended", "join_request", "join_approved", "join_declined", "offer", "answer",
    "ice", "invite", "join", "ringtone_stop", "reject", "busy", "hangup", "leave"
  ])],
  ["voice_room_signal", new Set(["presence", "join", "leave", "offer", "answer", "ice"])],
  ["screen_signal", new Set(["presence", "leave", "offer", "answer", "ice"])]
]);

/**
 * Legacy Realtime envelopes carry a nested subtype in payload.type.
 * Unknown envelopes remain governed by the endpoint's top-level event allowlist.
 */
export function isAllowedLegacyEnvelope(eventType, payload) {
  const allowed = LEGACY_ENVELOPE_TYPES.get(eventType);
  if (!allowed) return true;
  return !!payload && typeof payload.type === "string" && allowed.has(payload.type);
}
