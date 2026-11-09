export function signalDatabaseReadinessStatus(data, error) {
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return 503;
  if (data.ready !== true || data.schemaVersion !== "signal-v1") return 503;
  if (!Array.isArray(data.missing) || data.missing.length !== 0) return 503;
  return 200;
}
