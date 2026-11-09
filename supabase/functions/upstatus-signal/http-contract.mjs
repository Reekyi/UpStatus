const VOICE_ROOM_OPEN_ERROR_STATUS = new Map([
  ["INVALID_LOGICAL_ID", 400],
  ["INVALID_ARGUMENT", 400],
  ["INVALID_ATTEMPT_ID", 400],
  ["UNKNOWN_USER", 404],
  ["VOICE_ROOM_OPEN_CANCELLED", 410],
  ["VOICE_ROOM_UNAVAILABLE", 410],
  ["VOICE_ROOM_MEMBERSHIP_ENDED", 410],
  ["VOICE_ATTEMPT_CONFLICT", 409],
  ["VOICE_ATTEMPT_ALREADY_ACTIVE", 409],
  ["ROOM_FULL", 409],
]);

/**
 * Map the server-owned voice-room open RPC result to its HTTP status.
 * Unknown and malformed results fail closed as internal errors.
 */
export function voiceRoomOpenResultStatus(result) {
  if (!result || typeof result !== "object" || Array.isArray(result) ||
      !Object.hasOwn(result, "error") ||
      typeof result.error !== "string" ||
      result.error.length === 0) return 500;
  return VOICE_ROOM_OPEN_ERROR_STATUS.get(result.error) ?? 500;
}
