import assert from "node:assert/strict";
import { createHttpHelpers } from "../src/server/normal-3.4.7/modules/http.js";
import { createStatusHandlers } from "../src/server/normal-3.4.7/modules/status.js";

const { response } = createHttpHelpers({ "Access-Control-Allow-Origin": "*" });

function createDb({ users = [], history = [], errors = {} } = {}) {
  const calls = [];
  const db = {
    calls,
    from(table) {
      calls.push({ op: "from", table });
      return {
        select(columns) {
          calls.push({ op: "select", table, columns });
          return {
            order(column, options) {
              calls.push({ op: "order", table, column, options });
              return {
                limit: async (limit) => {
                  calls.push({ op: "limit", table, limit });
                  return { data: history, error: errors[table] || null };
                },
                then: (resolve, reject) => Promise.resolve({ data: table === "users" ? users : [], error: errors[table] || null }).then(resolve, reject)
              };
            },
            limit: async (limit) => {
              calls.push({ op: "limit", table, limit });
              return { data: [], error: errors[table] || null };
            },
            in: async (column, values) => {
              calls.push({ op: "in", table, column, values });
              return { data: [], error: errors[table] || null };
            }
          };
        },
        update(payload) {
          calls.push({ op: "update", table, payload });
          return { eq: async (column, value) => { calls.push({ op: "eq", table, column, value }); return { error: null }; } };
        },
        insert(payload) {
          calls.push({ op: "insert", table, payload });
          return Promise.resolve({ error: null });
        }
      };
    }
  };
  return db;
}

{
  const db = createDb();
  const handlers = createStatusHandlers({ db, response, readBody: async () => ({}), account: async () => null, admin: async () => false, version: "3.4.7" });
  const result = await handlers.healthRoute(new Request("https://example.test", { method: "GET" }), "Other");
  assert.equal(result.status, 403);
  assert.equal(db.calls.length, 0);
}

{
  const seenAt = new Date().toISOString();
  const db = createDb({ users: [{ name: "Guilherme", status: "online", reason: "", updated_at: seenAt, sync: "ok", client_version: "3.4.7", client_seen_at: seenAt }] });
  const handlers = createStatusHandlers({ db, response, readBody: async () => ({}), account: async () => null, admin: async () => false, version: "3.4.7" });
  const result = await handlers.statusRoute(new Request("https://example.test/api/status", { method: "GET", headers: { "x-upstatus-version": "3.4.7" } }), "Ricardo");
  const body = await result.json();
  assert.equal(result.status, 200);
  assert.equal(body.members.Guilherme.connected, true);
  assert.equal(body.members.Guilherme.version, "3.4.7");
  const presence = db.calls.find((x) => x.op === "update");
  assert.equal(presence.payload.client_version, "3.4.7");
}

{
  const db = createDb();
  const handlers = createStatusHandlers({ db, response, readBody: async () => ({ status: "invalid" }), account: async () => ({ status: "offline" }), admin: async () => false, version: "3.4.7" });
  const result = await handlers.statusRoute(new Request("https://example.test/api/status", { method: "POST" }), "Ricardo");
  assert.equal(result.status, 400);
}

{
  const db = createDb();
  const handlers = createStatusHandlers({ db, response, readBody: async () => ({ status: "busy", reason: "Almoço", actor: "Other", target: "Other" }), account: async () => ({ status: "offline", reason: "", sync: "ok" }), admin: async () => false, version: "3.4.7" });
  const result = await handlers.statusRoute(new Request("https://example.test/api/status", { method: "POST" }), "Ricardo");
  const body = await result.json();
  assert.equal(result.status, 200);
  assert.equal(body.status, "busy");
  const history = db.calls.find((x) => x.op === "insert" && x.table === "status_history");
  assert.equal(history.payload.actor, "Ricardo");
  assert.equal(history.payload.target, "Ricardo");
}

{
  const db = createDb({ history: [{ user_name: "Ricardo", actor: "Ricardo", target: "Ricardo", status: "busy", reason: null, created_at: "2026-11-26T10:00:00.000Z" }] });
  const handlers = createStatusHandlers({ db, response, readBody: async () => ({}), account: async () => null, admin: async () => true, version: "3.4.7" });
  const result = await handlers.historyRoute(new Request("https://example.test/api/history?limit=999"), "Ricardo");
  const body = await result.json();
  assert.equal(result.status, 200);
  assert.equal(body.history[0].reason, "");
  assert.equal(db.calls.find((x) => x.op === "limit").limit, 500);
}

console.log("PASS: status, health, and history handlers");
