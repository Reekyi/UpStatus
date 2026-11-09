export function signalDatabaseReadinessStatus(data, error) {
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return 503;
  if (data.ready !== true || data.schemaVersion !== "signal-v2") return 503;
  if (!Array.isArray(data.missing) || data.missing.length !== 0) return 503;
  return 200;
}

/**
 * Coalesce concurrent readiness requests and cache each result briefly per warm
 * Edge Function isolate. This bounds repeated unauthenticated probe work locally;
 * it is not a global rate limiter or a substitute for gateway-level controls.
 */
export function createSignalReadinessProbe({ rpc, ttlMs = 5000, now = Date.now } = {}) {
  if (typeof rpc !== "function") throw new TypeError("readiness rpc must be a function");
  const cacheTtl = Number.isFinite(ttlMs) && ttlMs >= 0 ? ttlMs : 5000;
  let cachedStatus = 503;
  let cacheExpiresAt = 0;
  let inFlight = null;

  return async function getSignalReadinessStatus() {
    if (cacheExpiresAt > now()) return cachedStatus;
    if (inFlight) return inFlight;

    inFlight = (async () => {
      let status = 503;
      try {
        const result = await rpc();
        status = signalDatabaseReadinessStatus(result?.data, result?.error);
      } catch {
        status = 503;
      }
      cachedStatus = status;
      cacheExpiresAt = now() + cacheTtl;
      return status;
    })();

    try {
      return await inFlight;
    } finally {
      inFlight = null;
    }
  };
}
