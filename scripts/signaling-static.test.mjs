#!/usr/bin/env node
/**
 * Static regression checks for the isolated server-mediated signaling prototype.
 * These assertions do not require credentials or mutate any Supabase project.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const functionSource = readFileSync("supabase/functions/upstatus-signal-test/index.ts", "utf8");
const bodyModule = readFileSync("supabase/functions/upstatus-signal-test/body.mjs", "utf8");
const invitationMigration = readFileSync(
  "supabase/migrations/20261030120000_signal_room_invitation_consent.sql", "utf8",
);
const legacyDefaultMigration = readFileSync(
  "supabase/migrations/20261030150000_signal_membership_legacy_default.sql", "utf8",
);
const authenticatedHarness = readFileSync("scripts/test-signaling-authenticated.mjs", "utf8");
const authenticatedRunner = readFileSync("scripts/run-signaling-authenticated.mjs", "utf8");

assert.match(invitationMigration, /ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'accepted'/,
  "legacy membership status default must preserve accepted behavior");
assert.doesNotMatch(invitationMigration,
  /UPDATE\s+public\.upstatus_signal_room_members\s+SET\s+status\s*=\s*'accepted'\s+WHERE\s+status\s*=\s*'pending'/i,
  "migration must not silently accept pending invitations when re-run");
assert.match(legacyDefaultMigration, /ALTER COLUMN status SET DEFAULT 'accepted'/,
  "follow-up migration must align the isolated schema with the compatibility default");

assert.match(functionSource,
  /\.update\(\{ status \}\)[\s\S]{0,220}\.eq\("status", "pending"\)[\s\S]{0,100}\.select\("status"\)\.maybeSingle\(\)/,
  "invitation transitions must use a conditional update and inspect the returned row");
assert.match(functionSource, /if \(!updatedInvitation\) return response\(\{ error: "Invitation already handled" \}, 409\)/,
  "a lost concurrent invitation transition must not report false success");
assert.match(functionSource,
  /\.select\("room_id"\)\.eq\("room_id", String\(p\.roomId \|\| ""\)\)\.eq\("user_name", sender\)\.eq\("status", "accepted"\)\.maybeSingle\(\)/,
  "acknowledgement must require accepted room membership");
assert.match(functionSource,
  /\.eq\("room_id", roomId\)\.eq\("user_name", name\)\.eq\("status", "accepted"\)/,
  "polling and signaling membership checks must require accepted status");

assert.match(authenticatedHarness, /UPSTATUS_SIGNAL_ALLOW_MUTATION !== "1"/,
  "authenticated integration tests must opt in before mutating test data");
assert.match(authenticatedHarness, /parsed\.hostname !== "bfpjtfqlnypisxljoxkb\.supabase\.co"/,
  "authenticated integration tests must refuse non-isolated projects");
assert.match(authenticatedHarness, /invitee can explicitly decline their invitation/,
  "authenticated harness must cover invitation decline");
assert.match(authenticatedHarness, /authenticated malformed JSON is rejected as a client error/,
  "authenticated harness must exercise malformed JSON rejection");
assert.match(authenticatedHarness, /authenticated oversized body is rejected before processing/,
  "authenticated harness must exercise request-size enforcement");
assert.match(authenticatedHarness, /excessively nested signaling payload is rejected/,
  "authenticated harness must exercise payload nesting limits");
assert.match(authenticatedHarness, /excessively wide signaling payload is rejected/,
  "authenticated harness must exercise payload traversal limits");
assert.match(authenticatedHarness, /declined invitee cannot poll the room/,
  "authenticated harness must cover declined-member access denial");

assert.ok(functionSource.includes('import { readJsonObject } from "./body.mjs"'),
  "Edge Function must use the separately tested streaming JSON reader");
assert.ok(bodyModule.includes("req.body.getReader()") && bodyModule.includes("await reader.cancel()"),
  "request bodies must be read incrementally and cancelled when oversized");
assert.ok(bodyModule.includes('typeof parsed !== "object" || Array.isArray(parsed)'),
  "JSON null, primitive, and array bodies must be rejected with a client error");
assert.ok(functionSource.includes('message === "INVALID_JSON" || message === "INVALID_BODY"'),
  "invalid JSON shapes must not surface as internal server errors");

assert.ok(functionSource.includes("IDENTITY_PAYLOAD_KEYS.has(key.toLowerCase())"),
  "identity/recipient payload keys must be stripped recursively and case-insensitively");
assert.match(functionSource, /"call_signal","voice_room_signal","screen_signal"/,
  "isolated endpoint must allow normalized envelopes for the legacy call, voice and screen channels");

assert.match(functionSource, /entry\.depth > 64/,
  "payload sanitizer must reject excessive nesting before serialization");
assert.match(functionSource, /visitedNodes > 4096/,
  "payload sanitizer must bound traversal work for very wide JSON");
assert.match(functionSource, /if \(!old && rate\.size >= 2000\)[\s\S]*if \(rate\.size >= 2000\) return false/,
  "rate-limit buckets must remain bounded without evicting active counters");
assert.match(functionSource, /try \{[\s\S]*JSON\.stringify\(p\)\.length[\s\S]*catch \{\s*return null;/,
  "payload serialization failures must be rejected as invalid payloads");

console.log("PASS signaling migration idempotency and compatibility defaults");
console.log("PASS atomic invitation transitions and accepted-member authorization");
console.log("PASS authenticated harness is mutation-gated and test-project scoped");
console.log("PASS bounded streaming body reads and JSON body shape validation");
console.log("PASS recursive case-insensitive identity payload sanitization");
console.log("PASS payload nesting and traversal bounds");
console.log("PASS bounded per-isolate rate-limit state");
console.log("PASS legacy call/voice/screen envelope types are explicitly allowlisted");
console.log("PASS authenticated negative cases cover JSON/body/payload limits");
console.log("9/9 signaling static regression groups passed.");

