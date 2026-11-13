const INVALID_CODES = new Set([
  "INVALID_LOGICAL_ID",
  "INVALID_ARGUMENT",
  "INVALID_ATTEMPT_ID",
]);
const NOT_FOUND_CODES = new Set(["UNKNOWN_USER"]);
const GONE_CODES = new Set([
  "VOICE_ROOM_OPEN_CANCELLED",
  "VOICE_ROOM_UNAVAILABLE",
  "VOICE_ROOM_MEMBERSHIP_ENDED",
]);
const CONFLICT_CODES = new Set([
  "VOICE_ATTEMPT_CONFLICT",
  "VOICE_ATTEMPT_ALREADY_ACTIVE",
  "ROOM_FULL",
]);

/**
 * Map voice-room open RPC errors to stable HTTP response statuses.
 * Keep this module runtime-neutral so the route contract can be tested with Node.
 */
export function voiceOpenErrorStatus(code) {
  const value = String(code ?? "");
  if (INVALID_CODES.has(value)) return 400;
  if (NOT_FOUND_CODES.has(value)) return 404;
  if (GONE_CODES.has(value)) return 410;
  if (CONFLICT_CODES.has(value)) return 409;
  return 500;
}
