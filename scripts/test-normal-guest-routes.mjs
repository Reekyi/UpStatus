import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createGuestRoutes } from "../src/server/normal-3.4.7/modules/guest-routes.js";

function harness() {
  const states = {
    lucca: { online: false, session: null, joinedAt: null, lastSeen: null },
    ycaro: { online: false, session: null, joinedAt: null, lastSeen: null }
  };
  const writes = [];
  const messages = [];
  const tasks = [];
  let id = 0;
  const routeDeps = {
    response: (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8", ...extra }
    }),
    readBody: async (req) => req.json(),
    expireLucca: async () => states.lucca,
    luccaToken: (req) => req.headers.get("authorization")?.replace(/^Bearer\\s+/i, "").trim() || req.headers.get("cookie")?.match(/(?:^|;\\s*)lucca_session=([^;]+)/)?.[1] || "",
    expireYcaro: async () => states.ycaro,
    ycaroToken: (req) => req.headers.get("authorization")?.replace(/^Bearer\\s+/i, "").trim() || req.headers.get("cookie")?.match(/(?:^|;\\s*)ycaro_session=([^;]+)/)?.[1] || "",
    setState: async (key, value) => { states[key] = value; writes.push({ key, value }); },
    db: { from(table) { assert.equal(table, "messages"); return { insert: async (row) => { messages.push(row); return { error: null }; } }; } },
    randomBytes: (size) => Buffer.from((String(++id).padStart(size * 2, "0")).slice(-size * 2), "hex"),
    getPassword: (key) => ({ LUCCA_PASSWORD: "lucca-secret", YCARO_PASSWORD: "ycaro-secret" })[key] || "",
    edgeRuntime: { waitUntil: (promise) => tasks.push(promise) }
  };
  return { ...createGuestRoutes(routeDeps), states, writes, messages, tasks };
}

async function call(route, path, { method = "GET", body, headers = {} } = {}) {
  return route(new Request("https://example.test/upstatus" + path, {
    method,
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  }));
}

for (const guest of [
  { name: "Lucca", key: "lucca", route: "luccaRoute", password: "lucca-secret", cookie: "lucca_session", emoji: "🔴", prefix: "lucca" },
  { name: "Ycaro", key: "ycaro", route: "ycaroRoute", password: "ycaro-secret", cookie: "ycaro_session", emoji: "🟠", prefix: "ycaro" }
]) {
  const h = harness();
  const route = h[guest.route];
  const bad = await call(route, `/api/${guest.prefix}/login`, { method: "POST", body: { password: "wrong" } });
  assert.equal(bad.status, 401);
  assert.deepEqual(await bad.json(), { error: "Senha incorreta." });

  const login = await call(route, `/api/${guest.prefix}/login/`, { method: "POST", body: { password: guest.password } });
  assert.equal(login.status, 200);
  const loginBody = await login.json();
  assert.equal(loginBody.ok, true);
  assert.equal(loginBody.name, guest.name);
  assert.equal(loginBody.token.length, 64);
  assert.match(login.headers.get("set-cookie"), new RegExp(`^${guest.cookie}=.*HttpOnly.*Max-Age=86400`));
  assert.equal(h.states[guest.key].online, true);
  assert.equal(h.states[guest.key].session, loginBody.token);
  assert.equal(h.tasks.length, 1);
  await Promise.all(h.tasks);
  assert.equal(h.messages.length, 1);
  assert.equal(h.messages[0].system_type, guest.prefix + "_join");
  assert.equal(h.messages[0].message, guest.emoji + " " + guest.name + " Maluco entrou no chat.");

  const me = await call(route, `/api/${guest.prefix}/me`, { headers: { authorization: "Bearer " + loginBody.token } });
  assert.deepEqual(await me.json(), { authenticated: true, name: guest.name, joinedAt: loginBody.joinedAt, online: true });

  const heartbeat = await call(route, `/api/${guest.prefix}/heartbeat`, { method: "POST", headers: { cookie: guest.cookie + "=" + loginBody.token } });
  assert.deepEqual(await heartbeat.json(), { ok: true, online: true });

  const unauthorized = await call(route, `/api/${guest.prefix}/heartbeat`, { method: "POST" });
  assert.equal(unauthorized.status, 401);

  const logout = await call(route, `/api/${guest.prefix}/logout`, { method: "POST", headers: { authorization: "Bearer " + loginBody.token } });
  assert.deepEqual(await logout.json(), { ok: true });
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal(h.states[guest.key].online, false);
  assert.equal(h.states[guest.key].session, null);
  assert.equal(h.messages.at(-1).system_type, guest.prefix + "_leave");

  const missing = await call(route, "/api/not-found");
  assert.equal(missing.status, 404);
}

{
  const h = harness();
  const me = await call(h.luccaRoute, "/api/lucca/me");
  assert.deepEqual(await me.json(), { authenticated: false, name: null, online: false });
  const response = await call(h.ycaroRoute, "/not-found");
  assert.equal(response.status, 404);
}

console.log("PASS: guest HTTP routes");
