#!/usr/bin/env node
import assert from "node:assert/strict";
import { cleanupAuthFixtures } from "./auth-fixture-cleanup.mjs";

const fixtures = [
  { name: "__auth_test_cleanup_a" },
  { name: "__auth_test_cleanup_b" },
  { name: "__auth_test_cleanup_c" },
];

const attempted = [];
let verifiedAfterPartialFailure = false;
await assert.rejects(
  cleanupAuthFixtures({
    fixtures,
    deleteFixture: async fixture => {
      attempted.push(fixture.name);
      if (fixture.name === "__auth_test_cleanup_b") throw new Error("synthetic delete failure");
    },
    verifyNoFixtures: async () => {
      verifiedAfterPartialFailure = true;
      throw new Error("synthetic final verification failure");
    },
  }),
  error => {
    assert.ok(error instanceof AggregateError, "cleanup failures must be reported together");
    assert.equal(error.errors.length, 2, "delete and final-verification failures must both be retained");
    assert.match(error.errors[0].message, /__auth_test_cleanup_b/);
    assert.match(error.errors[1].message, /Final isolated auth fixture verification failed/);
    return true;
  },
);
assert.deepEqual(attempted, fixtures.map(fixture => fixture.name), "every fixture deletion must be attempted after a partial failure");
assert.equal(verifiedAfterPartialFailure, true, "final verification must run even after a deletion failure");

let successfulVerification = false;
await cleanupAuthFixtures({
  fixtures,
  deleteFixture: async () => {},
  verifyNoFixtures: async () => { successfulVerification = true; },
});
assert.equal(successfulVerification, true, "successful cleanup must still verify the final state");

console.log("PASS AUTH-03 cleanup attempts every fixture and always verifies final state, including aggregated failures.");
