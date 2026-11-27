import assert from "node:assert/strict";
import { createChatDataStore } from "../src/server/normal-3.4.7/modules/chat-data.js";

{
  const { mentions } = createChatDataStore({
    db: {},
    members: async () => [{ name: "Ricardo" }, { name: "Guilherme" }, { name: "Lohan" }]
  });
  assert.deepEqual(await mentions("@ricardo @GUILHERME @ricardo"), ["Ricardo", "Guilherme"]);
  assert.deepEqual(await mentions("Aviso para @todos e @Lohan"), ["Ricardo", "Guilherme", "Lohan"]);
  assert.deepEqual(await mentions("@desconhecido @todos"), ["Ricardo", "Guilherme", "Lohan"]);
  assert.deepEqual(await mentions("sem menções"), []);
}

{
  const calls = [];
  const rows = [
    { id: 7, user_name: "Ricardo", message: null, type: null, system_type: null, created_at: "2026-11-26T10:00:00.000Z", image_url: null, mentions: "bad", reply_to: null, reactions: null },
    { id: "8", user_name: "Guilherme", message: "Oi", type: "text", system_type: "", created_at: "2026-11-26T10:01:00.000Z", image_url: "", mentions: ["Ricardo"], reply_to: { id: "7" }, reactions: { "👍": ["Guilherme"] } }
  ];
  const db = {
    from(table) {
      calls.push(["from", table]);
      return {
        select(columns) {
          calls.push(["select", columns]);
          return {
            gte(column, value) {
              calls.push(["gte", column, value]);
              return {
                gt(column2, value2) { calls.push(["gt", column2, value2]); return this; },
                order(column3, options) {
                  calls.push(["order", column3, options]);
                  return { limit: async (limit) => { calls.push(["limit", limit]); return { data: rows, error: null }; } };
                }
              };
            }
          };
        }
      };
    }
  };
  const { chatRows } = createChatDataStore({ db, members: async () => [] });
  const full = await chatRows("Ricardo");
  assert.equal(full.length, 2);
  assert.equal(full[0].id, "7");
  assert.equal(full[0].message, "");
  assert.equal(full[0].type, "text");
  assert.deepEqual(full[0].mentions, []);
  assert.deepEqual(full[0].readBy, []);
  assert.deepEqual(full[1].replyTo, { id: "7" });
  assert.deepEqual(calls.find((x) => x[0] === "limit"), ["limit", 1000]);

  calls.length = 0;
  await chatRows("Ricardo", "2026-11-26T09:00:00.000Z");
  assert.ok(calls.some((x) => x[0] === "gt" && x[1] === "created_at"));
  assert.deepEqual(calls.find((x) => x[0] === "limit"), ["limit", 200]);
}

{
  const db = {
    from() {
      return {
        select() {
          return { gte() { return { order() { return { limit: async () => ({ data: null, error: new Error("chat read failed") }) }; } }; } };
        }
      };
    }
  };
  const { chatRows } = createChatDataStore({ db, members: async () => [] });
  await assert.rejects(chatRows("Ricardo"), /chat read failed/);
}

console.log("PASS: chat mentions and row normalization");
