import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHttpHelpers } from "../src/server/normal-3.4.7/modules/http.js";
import { createChatRouteHandler } from "../src/server/normal-3.4.7/modules/chat-route.js";

const { response } = createHttpHelpers({});
function makeDb(dataByTable = {}, unreadCount = 0) {
  const calls = [];
  const db = {
    calls,
    from(table) {
      calls.push(["from", table]);
      const query = {
        select(columns, options) { calls.push(["select", table, columns, options]); return query; },
        gt(column, value) { calls.push(["gt", table, column, value]); return query; },
        gte(column, value) { calls.push(["gte", table, column, value]); return query; },
        neq(column, value) { calls.push(["neq", table, column, value]); return query; },
        eq(column, value) { calls.push(["eq", table, column, value]); return query; },
        maybeSingle() { return Promise.resolve({ data: dataByTable[table]?.single ?? null, error: null }); },
        then(resolve, reject) {
          const value = table === "messages" && calls.some((x) => x[0] === "select" && x[1] === "messages" && x[3]?.head)
            ? { count: unreadCount, error: null }
            : { data: dataByTable[table]?.rows ?? [], error: null };
          return Promise.resolve(value).then(resolve, reject);
        },
        insert(payload) { calls.push(["insert", table, payload]); return Promise.resolve({ error: null }); }
      };
      return query;
    }
  };
  return db;
}

{
  const db = makeDb({
    upstatus_profiles: { rows: [{ user_name: "Ricardo", avatar_url: "https://img/r" }] },
    upstatus_typing: { rows: [{ user_name: "Guilherme" }] },
    chat_reads: { single: { last_read_at: "2026-11-26T10:00:00.000Z" } }
  }, 4);
  const calls = [];
  const handler = createChatRouteHandler({
    db, response, readBody: async () => ({}),
    chatRows: async (name, since) => { calls.push(["chatRows", name, since]); return [{ id: "m1" }]; },
    mentions: async () => [],
    expireLucca: async () => ({ online: true }),
    randomBytes: () => Buffer.from("12345678")
  });
  const result = await handler.chatRoute(new Request("https://example.test/api/chat?fast=1&since=2026-11-26T10:00:00.000Z", { method: "GET" }), "Ricardo");
  const body = await result.json();
  assert.equal(body.unreadCount, 4);
  assert.deepEqual(body.profiles, { Ricardo: "https://img/r" });
  assert.deepEqual(body.typing, ["Guilherme"]);
  assert.equal(body.luccaOnline, true);
  assert.equal(calls[0][0], "chatRows");
  assert.equal(calls[0][1], "Ricardo");
  assert.equal(Date.parse(calls[0][2]), Date.parse("2026-11-26T10:00:00.000Z") - 2000);
}

{
  const db = makeDb({
    chat_reads: { rows: [
      { user_name: "Guilherme", last_read_at: "2026-11-26T10:00:00.000Z", messages: { m1: ["Guilherme", "Ricardo"], m2: ["Ricardo"] } },
      { user_name: "Ricardo", last_read_at: "2026-11-26T10:00:00.000Z", messages: {} }
    ] },
    upstatus_profiles: { rows: [{ user_name: "Guilherme", avatar_url: "https://img/g" }] },
    upstatus_typing: { rows: [] }
  });
  const handler = createChatRouteHandler({
    db, response, readBody: async () => ({}),
    chatRows: async () => [
      { id: "m1", user: "Guilherme", type: "text", createdAt: "2026-11-26T10:01:00.000Z" },
      { id: "m2", user: "Ricardo", type: "text", createdAt: "2026-11-26T10:02:00.000Z" },
      { id: "m3", user: "Sistema", type: "system", createdAt: "2026-11-26T10:03:00.000Z" }
    ],
    mentions: async () => [],
    expireLucca: async () => ({ online: false }),
    randomBytes: () => Buffer.from("12345678")
  });
  const result = await handler.chatRoute(new Request("https://example.test/api/chat", { method: "GET" }), "Ricardo");
  const body = await result.json();
  assert.deepEqual(body.messages[0].readBy, ["Guilherme", "Ricardo"]);
  assert.deepEqual(body.messages[1].readBy, ["Ricardo"]);
  assert.equal(body.unreadCount, 1);
  assert.deepEqual(body.profiles, { Guilherme: "https://img/g" });
}

{
  const db = makeDb();
  const rows = [{ id: "reply1", user: "Guilherme", message: "Original", type: "text", imageUrl: "" }];
  const handler = createChatRouteHandler({
    db, response,
    readBody: async () => ({ message: "  Olá @Guilherme  ", replyTo: { id: "reply1" } }),
    chatRows: async () => rows,
    mentions: async (message) => message.includes("@Guilherme") ? ["Guilherme"] : [],
    expireLucca: async () => ({ online: false }),
    randomBytes: () => Buffer.from("12345678")
  });
  const result = await handler.chatRoute(new Request("https://example.test/api/chat", { method: "POST" }), "Ricardo");
  const body = await result.json();
  assert.equal(result.status, 200);
  assert.equal(body.message.id, "3132333435363738");
  assert.equal(body.message.message, "Olá @Guilherme");
  assert.deepEqual(body.message.mentions, ["Guilherme"]);
  assert.deepEqual(body.message.replyTo, { id: "reply1", user: "Guilherme", message: "Original", type: "text", imageUrl: "" });
  const insert = db.calls.find((x) => x[0] === "insert");
  assert.equal(insert[2].user_name, "Ricardo");
  assert.equal(insert[2].type, "text");
}

{
  const handler = createChatRouteHandler({
    db: makeDb(), response, readBody: async () => ({ message: "" }),
    chatRows: async () => [], mentions: async () => [], expireLucca: async () => ({ online: false }),
    randomBytes: () => Buffer.from("12345678")
  });
  const result = await handler.chatRoute(new Request("https://example.test/api/chat", { method: "POST" }), "Ricardo");
  assert.equal(result.status, 400);
}



{
  const db = makeDb({ chat_reads: { single: { last_read_at: "2026-11-26T10:00:00.000Z" } } });
  const handler = createChatRouteHandler({
    db, response, readBody: async () => ({}), chatRows: async () => [], mentions: async () => [],
    expireLucca: async () => ({ online: false }), randomBytes: () => Buffer.from("12345678")
  });
  const result = await handler.chatRoute(new Request("https://example.test/api/chat?fast=1&since=invalid", { method: "GET" }), "Ricardo");
  assert.equal(result.status, 200);
  const chatRead = db.calls.filter((x) => x[0] === "from" && x[1] === "messages").length;
  assert.equal(chatRead, 2);
  assert.ok(db.calls.some((x) => x[0] === "gte" && x[1] === "messages" && x[2] === "created_at"));
}

{
  const db = makeDb();
  const handler = createChatRouteHandler({
    db, response,
    readBody: async () => ({ message: "", imageUrl: "https://cdn.example.test/file.png", type: "document" }),
    chatRows: async () => [], mentions: async () => [],
    expireLucca: async () => ({ online: false }), randomBytes: () => Buffer.from("12345678")
  });
  const result = await handler.chatRoute(new Request("https://example.test/api/chat", { method: "POST" }), "Ricardo");
  const body = await result.json();
  assert.equal(result.status, 200);
  assert.equal(body.message.type, "document");
  assert.equal(body.message.imageUrl, "https://cdn.example.test/file.png");
}

{
  const db = makeDb();
  const handler = createChatRouteHandler({
    db, response, readBody: async () => ({ message: "x".repeat(1001) }),
    chatRows: async () => [], mentions: async () => [],
    expireLucca: async () => ({ online: false }), randomBytes: () => Buffer.from("12345678")
  });
  const result = await handler.chatRoute(new Request("https://example.test/api/chat", { method: "POST" }), "Ricardo");
  assert.equal(result.status, 400);
  assert.deepEqual(await result.json(), { error: "A mensagem deve ter no máximo 1000 caracteres." });
}

console.log("PASS: chat route read, fast sync, and message creation");
