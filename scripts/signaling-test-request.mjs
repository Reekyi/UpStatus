const TRANSIENT_HTTP_STATUSES = new Set([502, 503, 504]);

function isTransientTransportError(error) {
  const name = String(error?.name || "");
  const code = String(error?.code || "");
  return name === "TimeoutError" || name === "AbortError" || code === "UND_ERR_CONNECT_TIMEOUT";
}

export async function requestWithTransientRetry(run, options = {}) {
  if (typeof run !== "function") throw new TypeError("run must be a function");
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 750;
  const sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const onRetry = options.onRetry ?? (() => {});
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 3) {
    throw new RangeError("attempts must be an integer between 1 and 3");
  }
  if (!Number.isFinite(baseDelayMs) || baseDelayMs < 0) {
    throw new RangeError("baseDelayMs must be a non-negative number");
  }
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await run();
      if (TRANSIENT_HTTP_STATUSES.has(response?.status) && attempt < attempts) {
        onRetry({ kind: "http", status: response.status, attempt });
        await sleep(baseDelayMs * attempt);
        continue;
      }
      return response;
    } catch (error) {
      if (!isTransientTransportError(error) || attempt === attempts) throw error;
      onRetry({ kind: "transport", error, attempt });
      await sleep(baseDelayMs * attempt);
    }
  }
  throw new Error("Transient request retry loop ended unexpectedly");
}
