const IDEMPOTENCY_KEY_PATTERN = /^[0-9a-f]{32}$/;
const REQUEST_HASH_PATTERN = /^[0-9a-f]{64}$/;

export function isValidSignalIdempotencyKey(value) {
  return typeof value === "string" && IDEMPOTENCY_KEY_PATTERN.test(value);
}

export function isValidSignalRequestHash(value) {
  return typeof value === "string" && REQUEST_HASH_PATTERN.test(value);
}

export function canonicalSignalRequestJson(value) {
  function normalize(item) {
    if (item === null || typeof item !== "object") return item;
    if (Array.isArray(item)) return item.map(normalize);
    const result = Object.create(null);
    for (const key of Object.keys(item).sort()) result[key] = normalize(item[key]);
    return result;
  }
  return JSON.stringify(normalize(value));
}

export function signalEventErrorStatus(result) {
  if (!result || typeof result !== "object" || Array.isArray(result) ||
      !Object.hasOwn(result, "error") || typeof result.error !== "string" || !result.error) return 500;
  const statuses = new Map([
    ["INVALID_ARGUMENT", 400],
    ["ROOM_UNAVAILABLE", 404],
    ["UNKNOWN_USER", 404],
    ["ROOM_MEMBERSHIP_ENDED", 403],
    ["ROOM_MEMBER_FORBIDDEN", 403],
    ["IDEMPOTENCY_KEY_REUSED", 409],
    ["INVITATION_ALREADY_PENDING", 409],
  ]);
  return statuses.get(result.error) ?? 500;
}
