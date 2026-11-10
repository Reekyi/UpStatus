import assert from "node:assert/strict";
import { cleanupAuthFixtures } from "./auth-fixture-cleanup.mjs";

const cases = [{ name: "__auth_test_one" }, { name: "__auth_test_two" }, { name: "__auth_test_three" }];

{
  const attempted = [];
  let postflightCalled = false;
  await assert.rejects(
    cleanupAuthFixtures({
      cases,
      deleteFixture: async item => {
        attempted.push(item.name);
        if (item.name === "__auth_test_one") throw new Error("simulated DELETE failure");
      },
      listRemaining: async () => {
        postflightCalled = true;
        return [{ name: "__auth_test_one" }];
      },
    }),
    error => error instanceof AggregateError && error.errors.length === 2,
    "cleanup must report both the failed DELETE and the remaining fixture",
  );
  assert.deepEqual(attempted, cases.map(item => item.name), "one failed DELETE must not stop later fixture deletions");
  assert.equal(postflightCalled, true, "postflight must run even after a DELETE failure");
}

{
  const attempted = [];
  const result = await cleanupAuthFixtures({
    cases,
    deleteFixture: async item => { attempted.push(item.name); },
    listRemaining: async () => [],
  });
  assert.deepEqual(attempted, cases.map(item => item.name));
  assert.deepEqual(result, { deleteAttempts: 3, remaining: 0 });
}

{
  const attempted = [];
  await assert.rejects(
    cleanupAuthFixtures({
      cases,
      deleteFixture: async item => { attempted.push(item.name); },
      listRemaining: async () => { throw new Error("simulated postflight failure"); },
    }),
    error => error instanceof AggregateError && error.errors.length === 1,
    "a failed postflight must keep cleanup unverified",
  );
  assert.deepEqual(attempted, cases.map(item => item.name), "all deletions must be attempted before postflight");
}

console.log("PASS AUTH-03 fixture cleanup attempts every deletion and always verifies postflight.");
