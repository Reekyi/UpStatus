import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { createHttpHelpers } from "../src/server/normal-3.4.7/modules/http.js";
import { createStateStore } from "../src/server/normal-3.4.7/modules/state.js";
import { createAuthCrypto } from "../src/server/normal-3.4.7/modules/auth-crypto.js";
import { createGuestSessionStore } from "../src/server/normal-3.4.7/modules/guest-sessions.js";
import { createAuthContext } from "../src/server/normal-3.4.7/modules/auth-context.js";
import { createAuthCore } from "../src/server/normal-3.4.7/modules/auth-core.js";
import { createAuthRoutes } from "../src/server/normal-3.4.7/modules/auth-routes.js";

function createMemoryDb() {
  const users = new Map([
    ["Ricardo", { name: "Ricardo", password_hash: null, role: null, status: "offline", reason: "", sync: null }]
  ]);
  const sessions = [];
  const states = new Map();
  const messages = [];

  function from(table) {
    const query = { table, action: "select", filters: [], payload: null, cutoff: null };
    const builder = {
      select(columns) { query.columns = columns; return this; },
      eq(column, value) { query.filters.push(["eq", column, value]); return this; },
      lt(column, value) { query.filters.push(["lt", column, value]); query.cutoff = value; return this; },
      maybeSingle() {
        const get = (key) => query.filters.find(([op, field]) => op === "eq" && field === key)?.[2];
        if (table === "users") return Promise.resolve({ data: users.get(get("name")) || null, error: null });
        if (table === "upstatus_sessions") return Promise.resolve({ data: sessions.find(x => x.token_hash === get("token_hash")) || null, error: null });
        if (table === "upstatus_state") return Promise.resolve({ data: states.has(get("state_key")) ? { value: states.get(get("state_key")) } : null, error: null });
        return Promise.resolve({ data: null, error: null });
      },
      insert(payload) {
        query.action = "insert"; query.payload = payload;
        if (table === "upstatus_sessions") sessions.push(structuredClone(payload));
        if (table === "messages") messages.push(structuredClone(payload));
        return Promise.resolve({ error: null });
      },
      update(payload) { query.action = "update"; query.payload = payload; return this; },
      delete() { query.action = "delete"; return this; },
      upsert(payload) {
        if (table === "upstatus_state") states.set(payload.state_key, structuredClone(payload.value));
        return Promise.resolve({ error: null });
      },
      then(resolve, reject) {
        const get = (key) => query.filters.find(([op, field]) => op === "eq" && field === key)?.[2];
        if (table === "users" && query.action === "update") {
          const user = users.get(get("name"));
          if (user) Object.assign(user, query.payload);
        }
        if (table === "upstatus_sessions" && query.action === "delete") {
          for (let i = sessions.length - 1; i >= 0; i--) {
            const byToken = get("token_hash");
            const expired = query.cutoff && sessions[i].expires_at < query.cutoff;
            if ((byToken && sessions[i].token_hash === byToken) || expired) sessions.splice(i, 1);
          }
        }
        return Promise.resolve({ error: null }).then(resolve, reject);
      }
    };
    return builder;
  }
  return { from, users, sessions, states, messages };
}

const db = createMemoryDb();
const sessionCache = new Map();
const { response, readBody } = createHttpHelpers({ "Access-Control-Allow-Origin": "*" });
const crypto = createAuthCrypto({ Buffer, createHash, randomBytes, scryptSync, timingSafeEqual });
const { stateValue, setState } = createStateStore(db);
const guests = createGuestSessionStore({ stateValue, setState, db, randomBytes });
const auth = createAuthCore({
  db, sessionCache,
  token: req => req.headers.get("x-upstatus-token") || "",
  tokenHash: crypto.tokenHash,
  randomBytes, response, readBody,
  passwordHash: crypto.passwordHash,
  checkPassword: crypto.checkPassword
});
const context = createAuthContext({
  userFromToken: auth.userFromToken,
  expireLucca: guests.expireLucca,
  luccaToken: guests.luccaToken,
  expireYcaro: guests.expireYcaro,
  ycaroToken: guests.ycaroToken
});
const authRoutes = createAuthRoutes({
  response, account: auth.account, db,
  token: req => req.headers.get("x-upstatus-token") || "",
  tokenHash: crypto.tokenHash, sessionCache
});

const postJson = (url, body, headers = {}) => new Request(url, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify(body)
});

{
  const setupResponse = await auth.login(postJson("https://upstatus.test/api/setup", {
    name: "Ricardo", password: "safe-password-123"
  }), true);
  assert.equal(setupResponse.status, 200);
  const setup = await setupResponse.json();
  assert.equal(setup.role, "implementation_admin");
  assert.equal(setup.canViewHistory, true);
  assert.equal(db.sessions.length, 1);

  const authenticatedRequest = new Request("https://upstatus.test/api/me", {
    headers: { "x-upstatus-token": setup.token }
  });
  const resolved = await context.contextName(authenticatedRequest);
  assert.deepEqual(resolved && { name: resolved.name, guest: resolved.guest }, {
    name: "Ricardo", guest: false
  });
  const me = await authRoutes.meRoute(resolved.name);
  assert.deepEqual(await me.json(), {
    authenticated: true, name: "Ricardo", role: "implementation_admin",
    canViewHistory: true, needsSetup: false
  });

  const logout = await authRoutes.logoutRoute(new Request("https://upstatus.test/api/logout", {
    method: "POST", headers: { "x-upstatus-token": setup.token }
  }));
  assert.deepEqual(await logout.json(), { ok: true });
  assert.equal(sessionCache.has(setup.token), false);
  assert.equal(await auth.userFromToken(authenticatedRequest), null);
  assert.equal(await context.contextName(authenticatedRequest), null);
}

{
  const joinedAt = new Date().toISOString();
  await setState("lucca", {
    online: true, session: "guest-session-123", joinedAt, lastSeen: joinedAt
  });
  const guestRequest = new Request("https://upstatus.test/api/chat", {
    headers: { cookie: "lucca_session=guest-session-123" }
  });
  const resolved = await context.contextName(guestRequest);
  assert.deepEqual(resolved && { name: resolved.name, guest: resolved.guest }, {
    name: "Lucca", guest: true
  });
  const guestState = await stateValue("lucca", null);
  assert.equal(guestState.session, "guest-session-123");
  assert.equal(guestState.online, true);
}

console.log("PASS: integrated HTTP, auth, shared state, guest session and context composition");
