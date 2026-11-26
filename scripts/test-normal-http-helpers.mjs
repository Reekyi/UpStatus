import assert from "node:assert/strict";
import { createHttpHelpers } from "../src/server/normal-3.4.7/modules/http.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-upstatus-token, authorization, apikey",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Cache-Control": "no-store"
};

const { response, readBody } = createHttpHelpers(CORS);

const ok = response({ ok: true });
assert.equal(ok.status, 200);
assert.equal(ok.headers.get("content-type"), "application/json; charset=utf-8");
assert.equal(ok.headers.get("access-control-allow-origin"), "*");
assert.equal(ok.headers.get("cache-control"), "no-store");
assert.deepEqual(await ok.json(), { ok: true });

const denied = response({ error: "Negado." }, 403, { "Cache-Control": "private" });
assert.equal(denied.status, 403);
assert.equal(denied.headers.get("cache-control"), "private");
assert.deepEqual(await denied.json(), { error: "Negado." });

assert.deepEqual(await readBody(new Request("https://example.test", { method: "POST" })), {});
assert.deepEqual(
  await readBody(new Request("https://example.test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Ricardo", enabled: true })
  })),
  { name: "Ricardo", enabled: true }
);

await assert.rejects(
  readBody(new Request("https://example.test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{invalid"
  })),
  (error) => error instanceof Error && error.message === "Pedido inválido."
);

console.log("PASS: HTTP response and body helpers");
