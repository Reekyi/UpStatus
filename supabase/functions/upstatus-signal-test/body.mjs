const DEFAULT_MAX_BODY = 20 * 1024;

/**
 * Read a JSON object from a request while enforcing the byte limit during streaming.
 * Throws PAYLOAD_TOO_LARGE, INVALID_JSON, or INVALID_BODY for caller-safe handling.
 */
export async function readJsonObject(req, maxBody = DEFAULT_MAX_BODY) {
  const declaredLength = Number(req.headers.get("content-length") || "0");
  if (declaredLength > maxBody) throw new Error("PAYLOAD_TOO_LARGE");
  if (!req.body) return {};
  const reader = req.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBody) {
        await reader.cancel();
        throw new Error("PAYLOAD_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!total) return {};
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let parsed;
  try { parsed = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new Error("INVALID_JSON"); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("INVALID_BODY");
  return parsed;
}
