export function createAuthRoutes({ response, account, db, token, tokenHash, sessionCache }) {
  async function accountRoute(req) {
    const name = new URL(req.url).searchParams.get("name") || "";
    const a = await account(name);
    return response({ needsSetup: !a || !a.password_hash });
  }

  async function meRoute(name) {
    const a = name ? await account(name) : null;
    return response({
      authenticated: !!name,
      name: name || null,
      role: a?.role || null,
      canViewHistory: a?.role === "implementation_admin",
      needsSetup: !!a && !a.password_hash
    });
  }

  async function logoutRoute(req) {
    const t = token(req);
    if (t) {
      await db.from("upstatus_sessions").delete().eq("token_hash", tokenHash(t));
      sessionCache.delete(t);
    }
    return response({ ok: true });
  }

  return { accountRoute, meRoute, logoutRoute };
}
