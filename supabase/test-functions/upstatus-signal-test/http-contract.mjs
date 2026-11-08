/**
 * HTTP response mapping shared by the isolated signaling test Edge Function
 * and its Node contract tests. Keep product/runtime deployment code separate.
 */
export function mapOpenVoiceRoomResult(result, respond) {
  if (typeof respond !== "function") {
    throw new TypeError("A response factory is required");
  }
  if (!result || typeof result !== "object") {
    return respond({ error: "Open voice room failed" }, 500);
  }
  if (result.error) {
    const code = String(result.error);
    const status =
      code === "INVALID_LOGICAL_ID" ||
      code === "INVALID_ARGUMENT" ||
      code === "INVALID_ATTEMPT_ID" ? 400 :
      code === "UNKNOWN_USER" ? 404 :
      code === "VOICE_ROOM_OPEN_CANCELLED" ||
      code === "VOICE_ROOM_UNAVAILABLE" ||
      code === "VOICE_ROOM_MEMBERSHIP_ENDED" ? 410 :
      code === "VOICE_ATTEMPT_CONFLICT" ||
      code === "VOICE_ATTEMPT_ALREADY_ACTIVE" ||
      code === "ROOM_FULL" ? 409 : 500;
    return respond({ error: code, memberCount: result.memberCount }, status);
  }
  return respond(result, result.created === true ? 201 : 200);
}
