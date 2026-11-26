import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createGuestSessionStore } from "../src/server/normal-3.4.7/modules/guest-sessions.js";

function createHarness(initial = {}) {
  const states = { ...initial };
  const writes = [];
  const messages = [];
  const store = createGuestSessionStore({
    stateValue: async (key, fallback) => states[key] ?? fallback,
    setState: async (key, value) => { states[key] = value; writes.push({ key, value }); },
    db: {
      from(table) {
        assert.equal(table, "messages");
        return { insert: async (row) => { messages.push(row); return { error: null }; } };
      }
    },
    randomBytes: () => Buffer.from([0xde, 0xad, 0xbe, 0xef])
  });
  return { store, states, writes, messages };
}

{
  const { store } = createHarness();
  const req = new Request("https://example.test", {
    headers: { cookie: "other=1; lucca_session=abc%20123; ycaro_session=y%2Bz" }
  });
  assert.equal(store.cookie(req, "lucca_session"), "abc 123");
  assert.equal(store.luccaToken(req), "abc 123");
  assert.equal(store.ycaroToken(req), "y+z");
}

{
  const { store } = createHarness();
  const req = new Request("https://example.test", {
    headers: { authorization: "Bearer  token-value  ", cookie: "lucca_session=cookie-token" }
  });
  assert.equal(store.luccaToken(req), "token-value");
  assert.equal(store.ycaroToken(req), "token-value");
}

{
  const { store, writes, messages } = createHarness({
    lucca: { online: true, session: "s1", joinedAt: "2026-01-01T00:00:00.000Z", lastSeen: new Date(Date.now() - 13000).toISOString() }
  });
  const next = await store.expireLucca();
  assert.equal(next.online, false);
  assert.equal(next.session, null);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].key, "lucca");
  assert.equal(messages.length, 1);
  assert.equal(messages[0].id, "deadbeef");
  assert.equal(messages[0].system_type, "lucca_leave");
  assert.equal(messages[0].message, "🔴 Lucca Maluco saiu do chat.");
}

{
  const { store, writes, messages } = createHarness({
    ycaro: { online: true, session: "s2", joinedAt: null, lastSeen: new Date(Date.now() - 13000).toISOString() }
  });
  const next = await store.expireYcaro();
  assert.equal(next.online, false);
  assert.equal(next.session, null);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].key, "ycaro");
  assert.equal(messages.length, 1);
  assert.equal(messages[0].id, "deadbeef");
  assert.equal(messages[0].system_type, "ycaro_leave");
  assert.equal(messages[0].message, "🟠 Ycaro saiu do chat.");
}

{
  const active = { online: true, session: "s3", lastSeen: new Date().toISOString() };
  const { store, writes, messages } = createHarness({ lucca: active });
  assert.equal(await store.expireLucca(), active);
  assert.equal(writes.length, 0);
  assert.equal(messages.length, 0);
}

console.log("PASS: guest session helpers");
