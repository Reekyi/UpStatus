import assert from "node:assert/strict";
import { createStateStore } from "../src/server/normal-3.4.7/modules/state.js";

function createMockDb({ readResult = { data: null, error: null }, writeError = null } = {}) {
  const calls = [];
  const db = {
    from(table) {
      calls.push({ operation: "from", table });
      return {
        select(columns) {
          calls.push({ operation: "select", columns });
          return {
            eq(column, value) {
              calls.push({ operation: "eq", column, value });
              return {
                maybeSingle: async () => {
                  calls.push({ operation: "maybeSingle" });
                  return readResult;
                }
              };
            }
          };
        },
        upsert(payload, options) {
          calls.push({ operation: "upsert", payload, options });
          return Promise.resolve({ error: writeError });
        }
      };
    }
  };
  return { db, calls };
}

{
  const { db, calls } = createMockDb({ readResult: { data: { value: { online: true } }, error: null } });
  const { stateValue } = createStateStore(db);
  assert.deepEqual(await stateValue("remote-status", {}), { online: true });
  assert.deepEqual(calls.map((call) => call.operation), ["from", "select", "eq", "maybeSingle"]);
  assert.equal(calls[0].table, "upstatus_state");
  assert.equal(calls[1].columns, "value");
  assert.equal(calls[2].column, "state_key");
  assert.equal(calls[2].value, "remote-status");
}

{
  const { db } = createMockDb({ readResult: { data: null, error: null } });
  const { stateValue } = createStateStore(db);
  assert.deepEqual(await stateValue("missing", { fallback: true }), { fallback: true });
}

{
  const { db } = createMockDb({ readResult: { data: { value: false }, error: null } });
  const { stateValue } = createStateStore(db);
  assert.equal(await stateValue("flag", true), false);
}

{
  const db = {
    from() {
      return {
        select() {
          return { eq() { return { maybeSingle: async () => ({ data: null, error: new Error("read failed") }) }; } };
        }
      };
    }
  };
  const { stateValue } = createStateStore(db);
  await assert.rejects(stateValue("x", {}), /read failed/);
}

{
  const { db, calls } = createMockDb();
  const { setState } = createStateStore(db);
  await setState("remote-status", { online: true });
  const write = calls.find((call) => call.operation === "upsert");
  assert.equal(write.payload.state_key, "remote-status");
  assert.deepEqual(write.payload.value, { online: true });
  assert.ok(!Number.isNaN(Date.parse(write.payload.updated_at)));
  assert.deepEqual(write.options, { onConflict: "state_key" });
}

{
  const { db } = createMockDb({ writeError: new Error("write failed") });
  const { setState } = createStateStore(db);
  await assert.rejects(setState("x", {}), /write failed/);
}

console.log("PASS: shared state store");
