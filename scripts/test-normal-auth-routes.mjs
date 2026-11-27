import assert from "node:assert/strict";
import { createAuthRoutes } from "../src/server/normal-3.4.7/modules/auth-routes.js";

function harness() {
  const accounts = new Map([
    ["Ricardo", { name: "Ricardo", password_hash: "hash", role: "implementation_admin" }],
    ["Matheus", { name: "Matheus", password_hash: null, role: "implementation_user" }]
  ]);
  const sessions = [{ token_hash: "hashed-token", user_name: "Ricardo" }];
  const cache = new Map([["raw-token", { name: "Ricardo" }]]);
  const calls = [];
  const db = { from(table) {
    const call = { table, action: "select", filters: [] }; calls.push(call);
    return {
      delete() { call.action = "delete"; return this; },
      eq(column, value) { call.filters.push([column, value]); return this; },
      then(resolve, reject) {
        if (table === "upstatus_sessions" && call.action === "delete") {
          const index = sessions.findIndex(x => x.token_hash === call.filters[0]?.[1]);
          if (index >= 0) sessions.splice(index, 1);
        }
        return Promise.resolve({ error: null }).then(resolve, reject);
      }
    };
  } };
  const response = (body, status = 200) => new Response(JSON.stringify(body), { status });
  const routes = createAuthRoutes({
    response,
    account: async name => accounts.get(name) || null,
    db,
    token: req => req.headers.get("x-upstatus-token") || "",
    tokenHash: value => value === "raw-token" ? "hashed-token" : "hash:" + value,
    sessionCache: cache
  });
  return { ...routes, calls, sessions, cache };
}

{
  const h = harness();
  const res = await h.accountRoute(new Request("https://example.test/api/account?name=Matheus"));
  assert.deepEqual(await res.json(), { needsSetup: true });
  const missing = await h.accountRoute(new Request("https://example.test/api/account?name=missing"));
  assert.deepEqual(await missing.json(), { needsSetup: true });
  const configured = await h.accountRoute(new Request("https://example.test/api/account?name=Ricardo"));
  assert.deepEqual(await configured.json(), { needsSetup: false });
}

{
  const h = harness();
  assert.deepEqual(await (await h.meRoute(null)).json(), {
    authenticated: false, name: null, role: null, canViewHistory: false, needsSetup: false
  });
  assert.deepEqual(await (await h.meRoute("Ricardo")).json(), {
    authenticated: true, name: "Ricardo", role: "implementation_admin", canViewHistory: true, needsSetup: false
  });
  assert.deepEqual(await (await h.meRoute("Matheus")).json(), {
    authenticated: true, name: "Matheus", role: "implementation_user", canViewHistory: false, needsSetup: true
  });
}

{
  const h = harness();
  const res = await h.logoutRoute(new Request("https://example.test", { headers: { "x-upstatus-token": "raw-token" } }));
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(h.sessions.length, 0);
  assert.equal(h.cache.has("raw-token"), false);
  assert.equal(h.calls[0].table, "upstatus_sessions");
  assert.equal(h.calls[0].action, "delete");
  assert.deepEqual(h.calls[0].filters, [["token_hash", "hashed-token"]]);
}

{
  const h = harness();
  const res = await h.logoutRoute(new Request("https://example.test"));
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(h.calls.length, 0);
}

console.log("PASS: authentication endpoint routes");
