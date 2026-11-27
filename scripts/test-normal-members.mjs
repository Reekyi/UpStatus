import assert from "node:assert/strict";
import { createMembersStore } from "../src/server/normal-3.4.7/modules/members.js";

function createDb({ data, error = null }) {
  const calls = [];
  return {
    calls,
    from(table) {
      calls.push({ method: "from", table });
      return {
        select(columns) {
          calls.push({ method: "select", columns });
          return {
            order(column) {
              calls.push({ method: "order", column });
              return Promise.resolve({ data, error });
            }
          };
        }
      };
    }
  };
}

const originalNow = Date.now;
let now = 1_000_000;
Date.now = () => now;
try {
  const db = createDb({
    data: [
      { name: "Guilherme" },
      { name: "Lohan" },
      { name: "Not official" },
      { name: "Ricardo" }
    ]
  });
  const { members } = createMembersStore(db);
  const first = await members();
  assert.deepEqual(first, [
    { name: "Guilherme" },
    { name: "Lohan" },
    { name: "Ricardo" }
  ]);
  assert.equal(db.calls.length, 3);

  const second = await members();
  assert.equal(second, first);
  assert.equal(db.calls.length, 3);

  now += 10001;
  const third = await members();
  assert.deepEqual(third, first);
  assert.equal(db.calls.length, 6);
} finally {
  Date.now = originalNow;
}

{
  const db = createDb({ data: null, error: new Error("members read failed") });
  const { members } = createMembersStore(db);
  await assert.rejects(members(), /members read failed/);
}

console.log("PASS: members cache and official roster");
