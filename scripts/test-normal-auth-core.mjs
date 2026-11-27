import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { createAuthCrypto } from "../src/server/normal-3.4.7/modules/auth-crypto.js";
import { createAuthCore } from "../src/server/normal-3.4.7/modules/auth-core.js";

const crypto = createAuthCrypto({ Buffer, createHash, randomBytes, scryptSync, timingSafeEqual });
const adminAccount = { name: "Ricardo", password_hash: crypto.passwordHash("correct-password", "salt-admin"), role: "implementation_admin", status: "online", reason: null, updated_at: null, sync: null };
const userAccount = { name: "Matheus", password_hash: crypto.passwordHash("correct-password", "salt-user"), role: "implementation_user", status: "offline", reason: null, updated_at: null, sync: null };

function makeHarness(accounts = [adminAccount, userAccount]) {
  const users = new Map(accounts.map(a => [a.name, structuredClone(a)]));
  const sessions = [];
  const cache = new Map();
  const calls = [];
  let tokenCounter = 0;
  const db = {
    from(table) {
      const call = { table, action: "select", filters: [], payload: null };
      calls.push(call);
      const builder = {
        select(columns) { call.columns = columns; return this; },
        eq(column, value) { call.filters.push(["eq", column, value]); call.lookup = value; return this; },
        lt(column, value) { call.filters.push(["lt", column, value]); call.cutoff = value; return this; },
        maybeSingle() {
          if (table === "users") return Promise.resolve({ data: users.get(call.lookup) || null, error: null });
          if (table === "upstatus_sessions") return Promise.resolve({ data: sessions.find(s => s.token_hash === call.lookup) || null, error: null });
          return Promise.resolve({ data: null, error: null });
        },
        update(payload) { call.action = "update"; call.payload = payload; return this; },
        insert(payload) {
          call.action = "insert"; call.payload = payload;
          if (table === "upstatus_sessions") sessions.push(structuredClone(payload));
          return Promise.resolve({ error: null });
        },
        delete() {
          call.action = "delete";
          return this;
        },
        then(resolve, reject) {
          if (table === "upstatus_sessions" && call.action === "delete") {
            for (let i = sessions.length - 1; i >= 0; i--) {
              const expired = call.cutoff ? sessions[i].expires_at < call.cutoff : sessions[i].token_hash === call.lookup;
              if (expired) sessions.splice(i, 1);
            }
          }
          if (table === "users" && call.action === "update") {
            const account = users.get(call.lookup);
            if (account) Object.assign(account, call.payload);
          }
          return Promise.resolve({ error: null }).then(resolve, reject);
        }
      };
      return builder;
    }
  };
  const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const readBody = async req => req.json();
  const auth = createAuthCore({
    db, sessionCache: cache,
    token: req => req.headers.get("x-upstatus-token") || "",
    tokenHash: crypto.tokenHash,
    randomBytes: size => Buffer.from((String(++tokenCounter).padStart(size * 2, "0")).slice(-size * 2), "hex"),
    response, readBody, passwordHash: crypto.passwordHash, checkPassword: crypto.checkPassword
  });
  return { ...auth, users, sessions, cache, calls };
}
const request = (body, tokenValue) => new Request("https://example.test/api/login", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...(tokenValue ? { "x-upstatus-token": tokenValue } : {}) },
  body: JSON.stringify(body)
});

{
  const h = makeHarness();
  assert.equal(await h.account("missing"), null);
  assert.equal(await h.admin(null), false);
  assert.equal(await h.admin("Matheus"), false);
  assert.equal(await h.admin("Ricardo"), true);
  assert.equal(h.calls[0].columns, "name,password_hash,role,status,reason,updated_at,sync");
}

{
  const h = makeHarness();
  const now = Date.now();
  h.cache.set("expired-cache", { name: "Ricardo", expiresAt: now - 1, checkedAt: now });
  assert.equal(await h.userFromToken(new Request("https://example.test", { headers: { "x-upstatus-token": "expired-cache" } })), null);
  assert.equal(h.cache.has("expired-cache"), false);
  h.cache.set("warm-cache", { name: "Matheus", expiresAt: now + 60000, checkedAt: now });
  assert.equal(await h.userFromToken(new Request("https://example.test", { headers: { "x-upstatus-token": "warm-cache" } })), "Matheus");
  assert.equal(h.calls.length, 0);
}

{
  const h = makeHarness();
  assert.equal(await h.userFromToken(new Request("https://example.test")), null);
  const raw = "db-backed-token";
  h.sessions.push({ token_hash: crypto.tokenHash(raw), user_name: "Matheus", expires_at: new Date(Date.now() + 60000).toISOString() });
  const req = new Request("https://example.test", { headers: { "x-upstatus-token": raw } });
  assert.equal(await h.userFromToken(req), "Matheus");
  assert.equal(h.cache.get(raw).name, "Matheus");
}

{
  const h = makeHarness();
  const raw = "expired-db-token";
  h.sessions.push({ token_hash: crypto.tokenHash(raw), user_name: "Matheus", expires_at: new Date(Date.now() - 60000).toISOString() });
  const req = new Request("https://example.test", { headers: { "x-upstatus-token": raw } });
  assert.equal(await h.userFromToken(req), null);
  assert.equal(h.sessions.length, 0);
}

{
  const h = makeHarness();
  const login = await h.login(request({ name: "Matheus", password: "bad-password" }), false);
  assert.equal(login.status, 401);
  assert.deepEqual(await login.json(), { error: "Nome ou senha incorretos." });
  const short = await h.login(request({ name: "Matheus", password: "123" }), false);
  assert.equal(short.status, 400);
  const unknown = await h.login(request({ name: "missing", password: "long-enough" }), false);
  assert.equal(unknown.status, 400);
  const valid = await h.login(request({ name: "Matheus", password: "correct-password" }), false);
  assert.equal(valid.status, 200);
  const body = await valid.json();
  assert.equal(body.name, "Matheus");
  assert.equal(body.role, "implementation_user");
  assert.equal(body.canViewHistory, false);
  assert.equal(body.token.length, 64);
  assert.equal(h.sessions.length, 1);
  assert.equal(h.sessions[0].token_hash, crypto.tokenHash(body.token));
  assert.equal(h.cache.get(body.token).name, "Matheus");
}

{
  const h = makeHarness();
  const setup = await h.login(request({ name: "Ricardo", password: "new-password" }), true);
  assert.equal(setup.status, 409);
  assert.deepEqual(await setup.json(), { error: "Esta conta já foi configurada." });
}

{
  const h = makeHarness([{ name: "Guilherme", password_hash: null, role: null }]);
  const setup = await h.login(request({ name: "Guilherme", password: "new-password" }), true);
  assert.equal(setup.status, 200);
  const body = await setup.json();
  assert.equal(body.name, "Guilherme");
  assert.equal(body.role, "implementation_admin");
  assert.equal(body.canViewHistory, true);
  assert.equal(h.users.get("Guilherme").role, "implementation_admin");
  assert.equal(crypto.checkPassword("new-password", h.users.get("Guilherme").password_hash), true);
  assert.equal(h.sessions.length, 1);
}

{
  const h = makeHarness([{ name: "Cliente", password_hash: null, role: null }]);
  const setup = await h.login(request({ name: "Cliente", password: "new-password" }), true);
  assert.equal((await setup.json()).role, "implementation_user");
}

{
  const h = makeHarness();
  const result = await h.createSession("Matheus", userAccount);
  const body = await result.json();
  assert.equal(result.status, 200);
  assert.equal(body.role, "implementation_user");
  assert.equal(body.canViewHistory, false);
  assert.equal(h.sessions.length, 1);
}

console.log("PASS: authentication core and session lifecycle");
