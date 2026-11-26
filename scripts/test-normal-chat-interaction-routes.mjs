import assert from "node:assert/strict";
import { createChatInteractionRoutes } from "../src/server/normal-3.4.7/modules/chat-interaction-routes.js";

function makeDb(results = []) {
  const calls = [];
  return {
    calls,
    from(table) {
      const call = { table, action: "select", filters: [], payload: null };
      calls.push(call);
      const result = results.shift() || { data: null, error: null };
      const query = {
        select(columns) { call.columns = columns; return this; },
        maybeSingle() { return this; },
        eq(column, value) { call.filters.push(["eq", column, value]); return this; },
        in(column, value) { call.filters.push(["in", column, value]); return this; },
        gt(column, value) { call.filters.push(["gt", column, value]); return this; },
        neq(column, value) { call.filters.push(["neq", column, value]); return this; },
        update(value) { call.action = "update"; call.payload = value; return this; },
        upsert(value, options) { call.action = "upsert"; call.payload = value; call.options = options; return this; },
        delete() { call.action = "delete"; return this; },
        then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); }
      };
      return query;
    }
  };
}
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const readBody = async (req) => req.json();
const req = (method = "POST", body = {}) => new Request("https://example.test", {
  method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
});

{
  const db = makeDb([
    { data: { messages: { m1: ["Lohan"] } } },
    { data: [{ id: "m1", user_name: "Guilherme" }, { id: "m2", user_name: "Ricardo" }, { id: "m3", user_name: "Lohan" }] },
    { error: null }
  ]);
  const { readRoute } = createChatInteractionRoutes({ db, response, readBody, admin: async () => false });
  const res = await readRoute(req("POST", { messageIds: ["m1", "m2", "m3", "", "m1"] }), "Ricardo");
  assert.deepEqual(await res.json(), { ok: true });
  assert.deepEqual(db.calls[2].payload.messages.m1, ["Lohan", "Ricardo"]);
  assert.deepEqual(db.calls[2].payload.messages.m3, ["Ricardo"]);
  assert.equal(db.calls[2].payload.messages.m2, undefined);
  assert.equal(db.calls[2].options.onConflict, "user_name");
}

{
  const db = makeDb([{ data: [{ user_name: "Lohan" }, { user_name: "Guilherme" }] }]);
  const { typingRoute } = createChatInteractionRoutes({ db, response, readBody, admin: async () => false });
  const res = await typingRoute(new Request("https://example.test", { method: "GET" }), "Ricardo");
  assert.deepEqual(await res.json(), { typing: ["Lohan", "Guilherme"] });
  assert.deepEqual(db.calls[0].filters.at(-1), ["neq", "user_name", "Ricardo"]);
}

{
  const db = makeDb([{ error: null }, { error: null }]);
  const { typingRoute } = createChatInteractionRoutes({ db, response, readBody, admin: async () => false });
  assert.deepEqual(await (await typingRoute(req("POST", { typing: true }), "Ricardo")).json(), { ok: true });
  assert.equal(db.calls[0].action, "upsert");
  assert.equal(db.calls[0].payload.user_name, "Ricardo");
  await typingRoute(req("POST", { typing: false }), "Ricardo");
  assert.equal(db.calls[1].action, "delete");
}

{
  const db = makeDb([
    { data: { id: "m1", user_name: "Lohan", type: "text", reactions: { "😂": ["Ricardo"] } } },
    { error: null }
  ]);
  const { reactionRoute } = createChatInteractionRoutes({ db, response, readBody, admin: async () => false });
  const res = await reactionRoute(req("POST", { messageId: "m1", emoji: "😂" }), "Ricardo");
  assert.deepEqual(await res.json(), { ok: true, reactions: {} });
  assert.deepEqual(db.calls[1].payload, { reactions: {} });
}

{
  const db = makeDb([{ data: { id: "m1", user_name: "Ricardo", message: "old", type: "text" } }, { error: null }]);
  const { editRoute } = createChatInteractionRoutes({ db, response, readBody, admin: async () => false });
  const res = await editRoute(req("POST", { message: "  updated  " }), "Ricardo", "m1");
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.message.message, "updated");
  assert.equal(db.calls[1].payload.message, "updated");
  assert.ok(db.calls[1].payload.edited_at);
}

{
  const db = makeDb([{ data: { id: "m1", user_name: "Lohan" } }]);
  const { deleteRoute } = createChatInteractionRoutes({ db, response, readBody, admin: async () => false });
  const res = await deleteRoute("Matheus", "m1");
  assert.equal(res.status, 403);
  assert.equal(db.calls.length, 1);
}

{
  const db = makeDb([{ data: { id: "m1", user_name: "Lohan" } }, { error: null }]);
  const { deleteRoute } = createChatInteractionRoutes({ db, response, readBody, admin: async () => true });
  const res = await deleteRoute("Ricardo", "m1");
  assert.deepEqual(await res.json(), { ok: true, id: "m1", deletedByAdmin: true });
  assert.equal(db.calls[1].action, "delete");
}

{
  const db = makeDb([{ data: null }]);
  const { reactionRoute } = createChatInteractionRoutes({ db, response, readBody, admin: async () => false });
  const res = await reactionRoute(req("POST", { messageId: "", emoji: "💩" }), "Ricardo");
  assert.equal(res.status, 400);
}

console.log("PASS: chat interaction routes");
