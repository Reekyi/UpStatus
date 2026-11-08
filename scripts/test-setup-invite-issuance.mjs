#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.resolve(ROOT, "src/server/index.template.ts");
if (!sourcePath.startsWith(ROOT + path.sep)) throw new Error("Server template path must remain inside the repository.");
const source = fs.readFileSync(sourcePath, "utf8");

assert.match(source, /"Cache-Control":\s*"no-store"/, "API responses, including setup-invite tokens, must be non-cacheable.");

const start = source.indexOf("async function issueSetupInvite(req:Request,adminName:string){");
const end = source.indexOf("\nasync function members(", start);
assert.ok(start >= 0 && end > start, "admin setup-invite handler must exist before members().");

let handlerSource = source.slice(start, end).trim();
handlerSource = handlerSource
  .replace("async function issueSetupInvite(req:Request,adminName:string){", "async function issueSetupInvite(req,adminName){")
  .replace("const p:any=await readBody(req);", "const p=await readBody(req);");
assert.doesNotMatch(handlerSource, /\b(?:Request|string|any)\b\s*[,)=;]/, "the extracted handler must be executable JavaScript after removing only its two TypeScript annotations.");

function harness({ adminAllowed = true, body = {}, data = { name: "Lucca" }, error = null } = {}) {
  const calls = {
    admin: [],
    readBody: 0,
    randomByteLengths: [],
    from: [],
    update: null,
    eq: null,
    or: null,
    select: null,
    maybeSingle: 0
  };

  const builder = {
    update(value) { calls.update = { ...value }; return this; },
    eq(column, value) { calls.eq = [column, value]; return this; },
    or(filter) { calls.or = filter; return this; },
    select(columns) { calls.select = columns; return this; },
    async maybeSingle() { calls.maybeSingle += 1; return { data, error }; }
  };

  const sandbox = {
    admin: async name => { calls.admin.push(name); return adminAllowed; },
    readBody: async req => { calls.readBody += 1; return req.body; },
    randomBytes: size => { calls.randomByteLengths.push(size); return randomBytes(size); },
    tokenHash: value => createHash("sha256").update(value).digest("hex"),
    db: {
      from(table) { calls.from.push(table); return builder; }
    },
    response: (payload, status = 200, extra = {}) => new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra }
    })
  };

  vm.runInNewContext(handlerSource + "\nthis.__issueSetupInvite = issueSetupInvite;", sandbox, { timeout: 1000 });
  return { issue: sandbox.__issueSetupInvite, calls };
}

// Unauthorized administrators must be rejected before reading the body, generating a token, or touching the database.
{
  const h = harness({ adminAllowed: false, body: { name: "Lucca" } });
  const response = await h.issue({ body: { name: "Lucca" } }, "Ricardo");
  assert.equal(response.status, 403);
  assert.deepEqual(h.calls.admin, ["Ricardo"]);
  assert.equal(h.calls.readBody, 0);
  assert.equal(h.calls.randomByteLengths.length, 0);
  assert.equal(h.calls.from.length, 0);
}

// Invalid targets must be rejected before token generation or database access.
for (const name of ["", "   ", "L".repeat(121)]) {
  const h = harness({ body: { name } });
  const response = await h.issue({ body: { name } }, "Ricardo");
  assert.equal(response.status, 400);
  assert.equal(h.calls.readBody, 1);
  assert.equal(h.calls.randomByteLengths.length, 0);
  assert.equal(h.calls.from.length, 0);
}

// A successful issuance stores only the SHA-256 hash and returns a short-lived token with no-store response headers.
{
  const h = harness({ body: { name: "  Lucca  " }, data: { name: "Lucca" } });
  const response = await h.issue({ body: { name: "  Lucca  " } }, "Ricardo");
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(payload.name, "Lucca");
  assert.match(payload.setupToken, /^[0-9a-f]{64}$/);
  assert.equal(h.calls.randomByteLengths[0], 32);
  assert.deepEqual(h.calls.from, ["users"]);
  assert.deepEqual(h.calls.eq, ["name", "Lucca"]);
  assert.equal(h.calls.or, 'password_hash.is.null,password_hash.eq.""');
  assert.equal(h.calls.select, "name");
  assert.equal(h.calls.maybeSingle, 1);
  assert.equal(h.calls.update.setup_token_hash, createHash("sha256").update(payload.setupToken).digest("hex"));
  assert.notEqual(h.calls.update.setup_token_hash, payload.setupToken);
  assert.match(h.calls.update.setup_token_hash, /^[0-9a-f]{64}$/);
  assert.equal(h.calls.update.setup_token_issued_by, "Ricardo");
  assert.equal(payload.expiresAt, h.calls.update.setup_token_expires_at);

  const issuedAt = Date.parse(h.calls.update.setup_token_issued_at);
  const expiresAt = Date.parse(h.calls.update.setup_token_expires_at);
  assert.ok(Number.isFinite(issuedAt) && Number.isFinite(expiresAt), "issued/expiry timestamps must be valid ISO timestamps");
  assert.ok(Math.abs((expiresAt - issuedAt) - 15 * 60 * 1000) <= 1000, "setup invite must expire after 15 minutes");
  assert.ok(!JSON.stringify(h.calls.update).includes(payload.setupToken), "raw token must never be persisted");
}

// Missing, already-configured, and otherwise unavailable accounts share one generic 409 response.
{
  const h = harness({ body: { name: "Lucca" }, data: null });
  const response = await h.issue({ body: { name: "Lucca" } }, "Ricardo");
  const payload = await response.json();
  assert.equal(response.status, 409);
  assert.equal(payload.error, "Conta indisponível para primeiro acesso.");
  assert.equal(Object.prototype.hasOwnProperty.call(payload, "setupToken"), false);
}

// Database failures must propagate to the outer handler rather than being reported as a successful invitation.
{
  const h = harness({ body: { name: "Lucca" }, data: null, error: new Error("mock database failure") });
  await assert.rejects(() => h.issue({ body: { name: "Lucca" } }, "Ricardo"), /mock database failure/);
}

console.log("PASS setup-invite issuance handler: stored-admin gate, preflight rejection, 256-bit token, hash-only persistence, 15-minute expiry, generic 409, no-store, and database-error propagation.");
