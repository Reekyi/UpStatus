import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHttpHelpers } from "../src/server/normal-3.4.7/modules/http.js";
import { createMembersStore } from "../src/server/normal-3.4.7/modules/members.js";
import { createChatDataStore } from "../src/server/normal-3.4.7/modules/chat-data.js";
import { createChatRouteHandler } from "../src/server/normal-3.4.7/modules/chat-route.js";
import { createChatInteractionRoutes } from "../src/server/normal-3.4.7/modules/chat-interaction-routes.js";

function createMemoryDb() {
  const now = Date.now();
  const tables = {
    users: [
      { name: "Ricardo" }, { name: "Guilherme" }, { name: "Lohan" },
      { name: "Matheus" }
    ],
    messages: [],
    upstatus_profiles: [
      { user_name: "Guilherme", avatar_url: "https://cdn.test/guilherme.png" }
    ],
    upstatus_typing: [],
    chat_reads: []
  };

  function matches(row, filters) {
    return filters.every(([op, field, value]) => {
      const actual = row[field];
      if (op === "eq") return actual === value;
      if (op === "neq") return actual !== value;
      if (op === "gt") return actual > value;
      if (op === "gte") return actual >= value;
      if (op === "in") return value.includes(actual);
      return true;
    });
  }

  const db = {
    tables,
    from(table) {
      const query = { table, action: "select", filters: [], payload: null, options: null, columns: null };
      const rows = () => tables[table] || [];
      const selected = () => rows().filter(row => matches(row, query.filters));
      const result = () => {
        if (query.action === "select") {
          const data = selected().map(row => ({ ...row }));
          if (query.options?.head && query.options?.count === "exact") {
            return { data: null, count: data.length, error: null };
          }
          return { data, error: null };
        }
        if (query.action === "update") {
          for (const row of selected()) Object.assign(row, structuredClone(query.payload));
          return { error: null };
        }
        if (query.action === "delete") {
          const keep = rows().filter(row => !matches(row, query.filters));
          tables[table] = keep;
          return { error: null };
        }
        return { data: null, error: null };
      };
      const builder = {
        select(columns, options) { query.columns = columns; query.options = options || null; return this; },
        eq(field, value) { query.filters.push(["eq", field, value]); return this; },
        neq(field, value) { query.filters.push(["neq", field, value]); return this; },
        gt(field, value) { query.filters.push(["gt", field, value]); return this; },
        gte(field, value) { query.filters.push(["gte", field, value]); return this; },
        in(field, value) { query.filters.push(["in", field, value]); return this; },
        order(field, options = {}) {
          query.order = [field, options];
          return this;
        },
        limit(value) { query.limit = value; return this; },
        maybeSingle() {
          const data = selected()[0] || null;
          return Promise.resolve({ data: data ? { ...data } : null, error: null });
        },
        insert(payload) {
          const values = Array.isArray(payload) ? payload : [payload];
          for (const value of values) rows().push(structuredClone(value));
          return Promise.resolve({ error: null });
        },
        upsert(payload, options = {}) {
          const conflict = options.onConflict || "id";
          const existing = rows().find(row => row[conflict] === payload[conflict]);
          if (existing) Object.assign(existing, structuredClone(payload));
          else rows().push(structuredClone(payload));
          return Promise.resolve({ error: null });
        },
        update(payload) { query.action = "update"; query.payload = payload; return this; },
        delete() { query.action = "delete"; return this; },
        then(resolve, reject) {
          try {
            let value = result();
            if (query.action === "select" && query.order) {
              const [field, options] = query.order;
              value.data.sort((a, b) => String(a[field]).localeCompare(String(b[field])) * (options.ascending === false ? -1 : 1));
            }
            if (query.action === "select" && query.limit != null) value.data = value.data.slice(0, query.limit);
            return Promise.resolve(value).then(resolve, reject);
          } catch (error) {
            return Promise.reject(error).then(resolve, reject);
          }
        }
      };
      return builder;
    }
  };
  return db;
}

const db = createMemoryDb();
const { response, readBody } = createHttpHelpers({});
const { members } = createMembersStore(db);
const chatData = createChatDataStore({ db, members });
const chat = createChatRouteHandler({
  db, response, readBody,
  chatRows: chatData.chatRows,
  mentions: chatData.mentions,
  expireLucca: async () => ({ online: false }),
  randomBytes: () => Buffer.from("chat-msg1")
});
const interactions = createChatInteractionRoutes({
  db, response, readBody,
  admin: async name => name === "Ricardo"
});
const post = (body) => new Request("https://upstatus.test/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});

{
  const team = await members();
  assert.deepEqual(team.map(x => x.name), ["Guilherme", "Lohan", "Ricardo"]);
  const created = await chat.chatRoute(post({ message: "Bom dia @Guilherme e @todos" }), "Ricardo");
  assert.equal(created.status, 200);
  const body = await created.json();
  assert.equal(body.message.id, Buffer.from("chat-msg1").toString("hex"));
  assert.deepEqual(body.message.mentions, ["Guilherme", "Lohan", "Ricardo"]);
  assert.equal(db.tables.messages.length, 1);
}

{
  const full = await chat.chatRoute(new Request("https://upstatus.test/api/chat"), "Guilherme");
  const body = await full.json();
  assert.equal(body.messages.length, 1);
  assert.deepEqual(body.messages[0].mentions, ["Guilherme", "Lohan", "Ricardo"]);
  assert.deepEqual(body.profiles, { Guilherme: "https://cdn.test/guilherme.png" });
  assert.equal(body.unreadCount, 1);
  assert.equal(body.luccaOnline, false);
}

{
  const read = await interactions.readRoute(new Request("https://upstatus.test/api/chat/read", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageIds: [db.tables.messages[0].id] })
  }), "Guilherme");
  assert.deepEqual(await read.json(), { ok: true });
  assert.deepEqual(db.tables.chat_reads[0].messages[db.tables.messages[0].id], ["Guilherme"]);

  const fast = await chat.chatRoute(new Request("https://upstatus.test/api/chat?fast=1"), "Ricardo");
  assert.equal((await fast.json()).unreadCount, 0);
}

{
  const id = db.tables.messages[0].id;
  const reaction = await interactions.reactionRoute(new Request("https://upstatus.test/api/chat/reaction", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageId: id, emoji: "👍" })
  }), "Guilherme");
  assert.deepEqual((await reaction.json()).reactions, { "👍": ["Guilherme"] });

  const edit = await interactions.editRoute(new Request("https://upstatus.test/api/chat/" + id, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Mensagem revisada" })
  }), "Ricardo", id);
  assert.equal(edit.status, 200);
  assert.equal(db.tables.messages[0].message, "Mensagem revisada");

  const denied = await interactions.deleteRoute("Guilherme", id);
  assert.equal(denied.status, 403);
  const removed = await interactions.deleteRoute("Ricardo", id);
  assert.deepEqual(await removed.json(), { ok: true, id, deletedByAdmin: false });
  assert.equal(db.tables.messages.length, 0);
}

console.log("PASS: integrated members, chat data, message flow, read receipts, reactions, edit and delete");
