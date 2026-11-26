import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { createAuthCrypto } from "../src/server/normal-3.4.7/modules/auth-crypto.js";

const authCrypto = createAuthCrypto({ Buffer, createHash, randomBytes, scryptSync, timingSafeEqual });

assert.equal(
  authCrypto.tokenHash("sample-token"),
  createHash("sha256").update("sample-token").digest("hex")
);

const fixedHash = authCrypto.passwordHash("correct horse", "fixed-salt");
assert.match(fixedHash, /^fixed-salt:[a-f0-9]{128}$/);
assert.equal(authCrypto.checkPassword("correct horse", fixedHash), true);
assert.equal(authCrypto.checkPassword("wrong password", fixedHash), false);
assert.equal(authCrypto.checkPassword("correct horse", ""), false);
assert.equal(authCrypto.checkPassword("correct horse", "malformed"), false);
assert.equal(authCrypto.checkPassword("correct horse", "salt:not-hex"), false);

const randomHash = authCrypto.passwordHash("another password");
assert.equal(authCrypto.checkPassword("another password", randomHash), true);

console.log("PASS: authentication crypto helpers");
