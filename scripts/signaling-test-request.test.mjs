import assert from "node:assert/strict";
import { requestWithTransientRetry } from "./signaling-test-request.mjs";

const response = status => ({ status });
const timeout = name => Object.assign(new Error("simulated transport interruption"), { name });
const immediate = async () => {};

let calls = 0;
let retries = [];
let delays = [];
let result = await requestWithTransientRetry(async () => {
  calls++;
  if (calls === 1) throw timeout("TimeoutError");
  return response(401);
}, { sleep: async ms => delays.push(ms), onRetry: event => retries.push(event) });
assert.equal(result.status, 401);
assert.equal(calls, 2);
assert.equal(retries[0].kind, "transport");
assert.deepEqual(delays, [750]);

calls = 0;
retries = [];
result = await requestWithTransientRetry(async () => {
  calls++;
  if (calls === 1) return response(503);
  return response(401);
}, { sleep: immediate, onRetry: event => retries.push(event) });
assert.equal(result.status, 401);
assert.equal(calls, 2);
assert.deepEqual(retries.map(event => event.kind), ["http"]);

calls = 0;
result = await requestWithTransientRetry(async () => {
  calls++;
  return response(401);
}, { sleep: immediate });
assert.equal(result.status, 401);
assert.equal(calls, 1, "401 must not be retried");

calls = 0;
await assert.rejects(() => requestWithTransientRetry(async () => {
  calls++;
  throw timeout("TimeoutError");
}, { sleep: immediate }));
assert.equal(calls, 3, "transport retries must be bounded to three attempts");

calls = 0;
await assert.rejects(() => requestWithTransientRetry(async () => {
  calls++;
  throw Object.assign(new Error("permanent"), { name: "TypeError" });
}, { sleep: immediate }));
assert.equal(calls, 1, "non-transient errors must not be retried");

calls = 0;
result = await requestWithTransientRetry(async () => {
  calls++;
  return response(504);
}, { sleep: immediate });
assert.equal(result.status, 504, "last transient HTTP response must be returned for the caller to fail explicitly");
assert.equal(calls, 3);

await assert.rejects(() => requestWithTransientRetry(async () => response(200), { attempts: 4 }), RangeError);
await assert.rejects(() => requestWithTransientRetry(async () => response(200), { baseDelayMs: -1 }), RangeError);

console.log("signaling endpoint transient retry: 8 regression groups passed");
