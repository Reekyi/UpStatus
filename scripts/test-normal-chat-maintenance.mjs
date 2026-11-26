import assert from "node:assert/strict";
import { createChatMaintenanceRoutes } from "../src/server/normal-3.4.7/modules/chat-maintenance.js";

function harness({ rows = [], removeErrorAt = -1, readError = null, deleteError = null } = {}) {
  const calls = [];
  const logs = [];
  const inserted = [];
  let removes = 0;
  const db = {
    from(table) {
      const call = { table, action: "select", filters: [] }; calls.push(call);
      return {
        select(columns) { call.columns = columns; return this; },
        delete() { call.action = "delete"; return this; },
        gte(column, value) {
          call.filters.push([column, value]);
          if (call.action === "select") return Promise.resolve({ data: rows, error: readError });
          return Promise.resolve({ error: deleteError });
        },
        insert(value) { inserted.push(value); return Promise.resolve({ error: null }); }
      };
    },
    storage: { from(bucket) {
      assert.equal(bucket, "chat-images");
      return { remove: async batch => {
        calls.push({ action: "remove", batch: [...batch] });
        const current = removes++;
        return { error: current === removeErrorAt ? new Error("storage unavailable") : null };
      } };
    } }
  };
  const response = (body, status = 200) => new Response(JSON.stringify(body), { status });
  const route = createChatMaintenanceRoutes({
    db, PROJECT_URL: "https://project.supabase.co",
    randomBytes: size => Buffer.from("ab".repeat(size), "hex"),
    response, logError: (...args) => logs.push(args)
  });
  return { ...route, calls, logs, inserted };
}

{
  const h = harness();
  const denied = await h.clearChatRoute("Matheus");
  assert.equal(denied.status, 403);
  assert.deepEqual(await denied.json(), { error: "Somente Ricardo pode limpar o chat." });
  assert.equal(h.calls.length, 0);
}

{
  const prefix = "https://project.supabase.co/storage/v1/object/public/chat-images/";
  const rows = Array.from({ length: 101 }, (_, i) => ({ image_url: prefix + "folder/file-" + i + ".png?download=1" }));
  rows.push({ image_url: prefix + "folder/file-0.png" });
  rows.push({ image_url: prefix + "../private.png" });
  rows.push({ image_url: prefix + "/absolute.png" });
  rows.push({ image_url: "https://elsewhere.test/file.png" });
  const h = harness({ rows, removeErrorAt: 1 });
  const result = await h.clearChatRoute("Ricardo");
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { ok: true, removedFiles: 100 });
  const batches = h.calls.filter(x => x.action === "remove");
  assert.deepEqual(batches.map(x => x.batch.length), [100, 1]);
  assert.equal(batches[0].batch[0], "folder/file-0.png");
  assert.equal(h.logs.length, 1);
  assert.equal(h.inserted.length, 1);
  assert.equal(h.inserted[0].user_name, "Sistema");
  assert.equal(h.inserted[0].system_type, "chat_clear");
  assert.equal(h.inserted[0].message, "🧹 Ricardo limpou o chat.");
  assert.equal(h.calls.filter(x => x.table === "messages" && x.action === "delete").length, 1);
}

{
  const h = harness({ readError: new Error("database read failed") });
  await assert.rejects(() => h.clearChatRoute("Ricardo"), /database read failed/);
  assert.equal(h.inserted.length, 0);
}

{
  const h = harness({ deleteError: new Error("database delete failed") });
  await assert.rejects(() => h.clearChatRoute("Ricardo"), /database delete failed/);
  assert.equal(h.inserted.length, 0);
}

console.log("PASS: chat maintenance route");
