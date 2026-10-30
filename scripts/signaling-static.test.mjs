#!/usr/bin/env node
/**
 * Static regression checks for the isolated server-mediated signaling prototype.
 * These assertions do not require credentials or mutate any Supabase project.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const functionSource = readFileSync("supabase/functions/upstatus-signal-test/index.ts", "utf8");
const userTemplate = readFileSync("src/userscript/upstatus.user.template.js", "utf8");
const bodyModule = readFileSync("supabase/functions/upstatus-signal-test/body.mjs", "utf8");
const envelopeModule = readFileSync("supabase/functions/upstatus-signal-test/legacy-envelope.mjs", "utf8");
const envelopeTest = readFileSync("scripts/signaling-envelope.test.mjs", "utf8");
const invitationMigration = readFileSync(
  "supabase/migrations/20261030120000_signal_room_invitation_consent.sql", "utf8",
);
const legacyDefaultMigration = readFileSync(
  "supabase/migrations/20261030150000_signal_membership_legacy_default.sql", "utf8",
);
const envelopeMigration = readFileSync(
  "supabase/migrations/20261030190000_allow_legacy_signaling_envelopes.sql", "utf8",
);
const bindingMigration = readFileSync(
  "supabase/migrations/20261030192000_signal_room_bindings.sql", "utf8",
);
const authenticatedHarness = readFileSync("scripts/test-signaling-authenticated.mjs", "utf8");
const authenticatedRunner = readFileSync("scripts/run-signaling-authenticated.mjs", "utf8");
const signalingWorkflow = readFileSync(".github/workflows/signaling-smoke.yml", "utf8");

assert.match(invitationMigration, /ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'accepted'/,
  "legacy membership status default must preserve accepted behavior");
assert.doesNotMatch(invitationMigration,
  /UPDATE\s+public\.upstatus_signal_room_members\s+SET\s+status\s*=\s*'accepted'\s+WHERE\s+status\s*=\s*'pending'/i,
  "migration must not silently accept pending invitations when re-run");
assert.match(legacyDefaultMigration, /ALTER COLUMN status SET DEFAULT 'accepted'/,
  "follow-up migration must align the isolated schema with the compatibility default");
assert.match(envelopeMigration, /'call_signal','voice_room_signal','screen_signal'/,
  "database event-type constraint must permit the three legacy transport envelopes");
assert.ok(bindingMigration.includes("PRIMARY KEY (binding_type, logical_id)"),
  "logical room bindings must have a unique server-owned type/id key");
assert.ok(bindingMigration.includes("ENABLE ROW LEVEL SECURITY") &&
  bindingMigration.includes("REVOKE ALL PRIVILEGES") && bindingMigration.includes("GRANT ALL PRIVILEGES") &&
  bindingMigration.includes("service_role"),
  "logical room binding table must remain service-role-only");
assert.ok(functionSource.includes('path.endsWith("/room/bind")'),
  "endpoint must expose authorized logical room binding");
assert.ok(functionSource.includes('path.endsWith("/room/resolve")'),
  "endpoint must resolve bindings only for accepted room members");
assert.ok(functionSource.includes('from("upstatus_signal_room_bindings").delete().eq("room_id", roomId)'),
  "closing a room must remove its logical bindings");
assert.ok(authenticatedHarness.includes("closed room binding is removed and cannot be resolved"),
  "authenticated harness must cover binding cleanup on room close");
assert.ok(functionSource.includes('path.endsWith("/room/members")') &&
  functionSource.includes('eq("status", "accepted")') &&
  authenticatedHarness.includes("accepted member can list accepted room participants") &&
  authenticatedHarness.includes("pending invitee cannot list accepted room participants"),
  "room member fanout must reveal only accepted members to accepted users");
assert.ok(functionSource.includes('path.endsWith("/room/status")') &&
  functionSource.includes("Only the room creator can inspect invitation status"),
  "only the room creator may inspect invitation acceptance state");
assert.ok(authenticatedHarness.includes("room creator can see pending invitation status") &&
  authenticatedHarness.includes("room creator sees accepted membership before signaling") &&
  authenticatedHarness.includes("non-creator cannot inspect room invitation status"),
  "authenticated harness must cover invitation acceptance state and authorization");
assert.ok(functionSource.includes('path.endsWith("/room/invite")'),
  "endpoint must support explicit dynamic invitations");
assert.ok(authenticatedHarness.includes("unsupported logical binding type is rejected") &&
  authenticatedHarness.includes("non-member cannot invite participants into a room") &&
  authenticatedHarness.includes("self-invitation is rejected as invalid input"),
  "authenticated harness must cover invalid binding and invitation authorization inputs");
assert.ok(authenticatedHarness.includes("accepted member can resolve the logical call ID") &&
  authenticatedHarness.includes("newly accepted user can resolve the logical room") &&
  authenticatedHarness.includes("duplicate room invitation is rejected"),
  "authenticated harness must cover bindings and dynamic invitation transitions");


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
assert.ok(authenticatedHarness.includes('legacyEnvelopeTypes = ["call_signal", "voice_room_signal", "screen_signal"]'),
  "authenticated harness must exercise all three legacy signaling envelope types");
assert.ok(authenticatedHarness.includes("all legacy envelope smoke events can be acknowledged"),
  "authenticated harness must cover delivery and acknowledgement for legacy envelopes");
assert.ok(signalingWorkflow.includes("secrets.UPSTATUS_SIGNAL_TEST_SERVICE_ROLE_KEY") &&
  signalingWorkflow.includes("node scripts/run-signaling-authenticated.mjs"),
  "CI must run the authenticated harness when the isolated-only secret is configured");
assert.ok(signalingWorkflow.includes("UPSTATUS_SIGNAL_TEST_SERVICE_ROLE_KEY is not configured"),
  "CI must clearly skip authenticated E2E when no isolated test secret is available");
assert.ok(signalingWorkflow.includes("scripts/signaling-envelope.test.mjs") &&
  signalingWorkflow.includes("node scripts/signaling-envelope.test.mjs"),
  "CI must run dedicated legacy envelope unit tests");
assert.ok(signalingWorkflow.includes("src/userscript/upstatus.user.template.js"),
  "client transport edits must trigger signaling CI");

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
assert.match(functionSource, /isAllowedLegacyEnvelope\(eventType, payload\)/,
  "endpoint must use the dedicated legacy inner-event validator");
assert.match(functionSource, /Invalid legacy signaling subtype/,
  "legacy envelopes must reject unknown inner event types");
assert.ok(envelopeModule.includes("export function isAllowedLegacyEnvelope") &&
  envelopeTest.includes("cross-channel subtype rejection"),
  "dedicated validator must have direct unit-test coverage");
assert.ok(authenticatedHarness.includes("legacy envelope rejects an unsupported inner event type"),
  "authenticated harness must exercise invalid legacy subtype rejection");

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

assert(readFileSync("scripts/build.mjs","utf8").includes("signalingTransportTemplate") &&
  readFileSync("scripts/build.mjs","utf8").includes("__UPSTATUS_SIGNALING_TRANSPORT_CODE__") &&
  readFileSync("src/userscript/signaling-transport.mjs","utf8").includes("enabled = false"),
  "the shared build must bundle the adapter while keeping it disabled by default");
assert.ok(userTemplate.includes("signaling_transport_enabled',false)===true") &&
  userTemplate.includes("endpoint.origin!==sessionServer.origin") &&
  userTemplate.includes("signalTransport.prepareCallRoom") &&
  userTemplate.includes("signalTransport.startPolling") &&
  userTemplate.includes("return sendRealtimeEvent('call_signal',p)"),
  "the opt-in call transport must be same-project guarded, acceptance-gated, and preserve legacy fallback");
assert.ok(userTemplate.includes("startOutgoingCallWithTransport(target)") &&
  userTemplate.includes("signalStartInvitationPolling()") &&
  userTemplate.includes("signalTransport.sendToRoom({") &&
  userTemplate.includes("signalTransport.close(signalRoomId)"),
  "opt-in one-to-one call setup, invitation polling, fanout, and room cleanup must be connected");
assert.ok(userTemplate.includes("signalTransport.accept(signalRoomId)") &&
  userTemplate.includes("signalTransport.decline(roomId)") &&
  userTemplate.includes("signalTransport.sendSignal({roomId:signalRoomId,recipient:to,eventType:'call_signal',payload:p})"),
  "the call client must accept/decline explicit invitations and route mapped signals through the server transport");
console.log("PASS signaling migration idempotency and compatibility defaults");
console.log("PASS atomic invitation transitions and accepted-member authorization");
console.log("PASS authenticated harness is mutation-gated and test-project scoped");
console.log("PASS bounded streaming body reads and JSON body shape validation");
console.log("PASS recursive case-insensitive identity payload sanitization");
console.log("PASS payload nesting and traversal bounds");
console.log("PASS bounded per-isolate rate-limit state");
console.log("PASS legacy call/voice/screen envelope types are explicitly allowlisted");
console.log("PASS authenticated negative cases cover JSON/body/payload limits");
console.log("PASS legacy envelope validator and client-change CI trigger");
console.log("PASS logical room binding and dynamic invitation contracts");
console.log("11/11 signaling static regression groups passed.");

