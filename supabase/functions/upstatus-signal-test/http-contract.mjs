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

const ROOM_MEMBER_INVITE_ERROR_STATUS = new Map([
  ["INVALID_ARGUMENT", 400],
  ["ROOM_UNAVAILABLE", 404],
  ["UNKNOWN_USER", 404],
  ["ROOM_MEMBER_FORBIDDEN", 403],
  ["ROOM_FULL", 409],
  ["MEMBER_EXISTS", 409],
]);

const ROOM_MEMBER_ACCEPT_ERROR_STATUS = new Map([
  ["INVALID_ARGUMENT", 400],
  ["ROOM_UNAVAILABLE", 404],
  ["INVITATION_NOT_FOUND", 404],
  ["INVITATION_ALREADY_HANDLED", 409],
  ["ROOM_FULL", 409],
]);

function ownErrorCode(result) {
  if (!result || typeof result !== "object" || Array.isArray(result) ||
      !Object.hasOwn(result, "error") ||
      typeof result.error !== "string" ||
      result.error.length === 0) return null;
  return result.error;
}

/**
 * Map the server-owned voice-room open RPC result to its HTTP status.
 * Unknown and malformed results fail closed as internal errors.
 */
export function voiceRoomOpenResultStatus(result) {
  const code = ownErrorCode(result);
  return code ? VOICE_ROOM_OPEN_ERROR_STATUS.get(code) ?? 500 : 500;
}

/** Map transactional generic-room invitation RPC errors to HTTP status. */
export function roomMemberInviteResultStatus(result) {
  const code = ownErrorCode(result);
  return code ? ROOM_MEMBER_INVITE_ERROR_STATUS.get(code) ?? 500 : 500;
}

/** Map transactional generic-room acceptance RPC errors to HTTP status. */
export function roomMemberAcceptResultStatus(result) {
  const code = ownErrorCode(result);
  return code ? ROOM_MEMBER_ACCEPT_ERROR_STATUS.get(code) ?? 500 : 500;
}
