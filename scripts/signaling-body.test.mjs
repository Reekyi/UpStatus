#!/usr/bin/env node
import assert from "node:assert/strict";
import { readJsonObject } from "../supabase/functions/upstatus-signal-test/body.mjs";

const valid = await readJsonObject(new Request("https://unit.test", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ roomId: "sig_test" }),
}));
assert.deepEqual(valid, { roomId: "sig_test" }, "valid object JSON should parse");
assert.deepEqual(await readJsonObject(new Request("https://unit.test", { method: "POST" })), {},
  "empty body should remain compatible with endpoints that accept no fields");

await assert.rejects(
  readJsonObject(new Request("https://unit.test", { method: "POST", body: "{" })),
  error => error.message === "INVALID_JSON", "malformed JSON should be rejected",
);
for (const value of ["null", "false", "42", '"text"', "[]"]) {
  await assert.rejects(
    readJsonObject(new Request("https://unit.test", { method: "POST", body: value })),
    error => error.message === "INVALID_BODY",
    "non-object JSON should be rejected",
  );
}
await assert.rejects(
  readJsonObject(new Request("https://unit.test", { method: "POST", headers: { "content-length": "2049" }, body: "{}" }), 2048),
  error => error.message === "PAYLOAD_TOO_LARGE", "declared oversized body should be rejected before reading",
);

let cancelled = false;
const stream = new ReadableStream({
  start(controller) {
    controller.enqueue(new TextEncoder().encode("x".repeat(1200)));
    controller.enqueue(new TextEncoder().encode("y".repeat(1200)));
  },
  cancel() { cancelled = true; },
});
const streamingRequest = new Request("https://unit.test", { method: "POST", body: stream, duplex: "half" });
await assert.rejects(
  readJsonObject(streamingRequest, 2048),
  error => error.message === "PAYLOAD_TOO_LARGE", "streaming body should stop when byte limit is crossed",
);
assert.equal(cancelled, true, "oversized stream should be cancelled rather than fully consumed");

console.log("PASS valid and empty JSON object bodies");
console.log("PASS malformed and non-object JSON rejection");
console.log("PASS declared and streaming payload limits");
console.log("3/3 signaling body parser unit test groups passed.");
