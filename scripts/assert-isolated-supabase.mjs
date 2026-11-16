const EXPECTED_ORIGIN = "https://bfpjtfqlnypisxljoxkb.supabase.co";

export function assertIsolatedSupabaseMutationTarget({ baseUrl, serviceKey, allowMutation }) {
  if (allowMutation !== "1") {
    throw new Error("Refusing fixture mutation: set UPSTATUS_SIGNAL_ALLOW_MUTATION=1 explicitly.");
  }
  if (typeof serviceKey !== "string" || !serviceKey.trim()) {
    throw new Error("Refusing fixture mutation: SUPABASE_SERVICE_ROLE_KEY is required.");
  }

  let parsed;
  try {
    parsed = new URL(String(baseUrl || ""));
  } catch {
    throw new Error("Refusing fixture mutation: SUPABASE_URL must be the exact isolated test project origin.");
  }
  if (parsed.origin !== EXPECTED_ORIGIN || parsed.pathname !== "/" || parsed.search || parsed.hash ||
      parsed.username || parsed.password) {
    throw new Error("Refusing fixture mutation: only https://bfpjtfqlnypisxljoxkb.supabase.co is allowlisted.");
  }
  return EXPECTED_ORIGIN;
}

export async function verifyIsolatedSupabaseMutationTarget(options) {
  const origin = assertIsolatedSupabaseMutationTarget(options);
  let response;
  try {
    response = await fetch(origin + "/rest/v1/", {
      method: "GET",
      headers: {
        apikey: options.serviceKey,
        Authorization: "Bearer " + options.serviceKey,
        Accept: "application/openapi+json",
      },
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new Error("Refusing fixture mutation: isolated-project read-only preflight failed; no fixture writes were attempted.");
  }
  if (!response.ok) {
    try { await response.body?.cancel(); } catch {}
    throw new Error("Refusing fixture mutation: isolated-project service-key preflight returned HTTP " +
      response.status + "; no fixture writes were attempted.");
  }
  try { await response.body?.cancel(); } catch {}
  console.log("Verified isolated Supabase project and explicit mutation opt-in.");
  return origin;
}
