#!/usr/bin/env node
/**
 * Static regression checks for the isolated server-mediated signaling prototype.
 * These assertions do not require credentials or mutate any Supabase project.
 */
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const functionSource = readFileSync("supabase/functions/upstatus-signal-test/index.ts", "utf8");
const userTemplate = readFileSync("src/userscript/upstatus.user.template.js", "utf8");
const transportSource = readFileSync("src/userscript/signaling-transport.mjs", "utf8");
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
const triggerGrantMigration = readFileSync(
  "supabase/migrations/20261029170500_restrict_trigger_function_execute.sql", "utf8",
);
const tableGrantMigration = readFileSync(
  "supabase/migrations/20261029183000_revoke_unused_public_table_grants.sql", "utf8",
);
const defaultPrivilegesMigration = readFileSync(
  "supabase/migrations/20261105150000_revoke_public_default_privileges_postgres.sql", "utf8",
);
const defaultPrivilegesTest = readFileSync(
  "supabase/test-migrations/20261105150000_postgres_public_default_privileges_test.sql", "utf8",
);
const readReceiptsProductionMigration = readFileSync(
  "supabase/migrations/20261105160000_merge_chat_read_receipts.sql", "utf8",
);
const openVoiceMigration = readFileSync("supabase/migrations/20261105190000_open_voice_room_membership.sql", "utf8");
const callAttemptMigration = readFileSync("supabase/migrations/20261106080200_call_room_attempt_recovery.sql", "utf8");
const rateLimitMigration = readFileSync(
  "supabase/test-migrations/20261104154623_distributed_signaling_rate_limit_test.sql", "utf8",
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
const backendOwnedTables = [
  "public.chat_reads", "public.messages", "public.reactions", "public.status_history",
  "public.upstatus_profiles", "public.upstatus_sessions", "public.upstatus_state",
  "public.upstatus_typing", "public.users",
];
assert.ok(
  triggerGrantMigration.includes("REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated") &&
  ["upstatus_broadcast_messages", "upstatus_broadcast_remote_state", "upstatus_broadcast_users"]
    .every(name => triggerGrantMigration.includes("public." + name + "()")),
  "trigger-only SECURITY DEFINER broadcasts must not be directly executable by client roles");
assert.ok(
  tableGrantMigration.includes("REVOKE ALL PRIVILEGES ON TABLE %s FROM PUBLIC, anon, authenticated") &&
  backendOwnedTables.every(name => tableGrantMigration.includes("to_regclass(\'" + name + "\')")),
  "all privileges, including TRUNCATE/TRIGGER/REFERENCES, must be revoked from client roles on backend-owned tables");
assert.ok(
  defaultPrivilegesMigration.includes("ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public") &&
  defaultPrivilegesMigration.includes("REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated") &&
  defaultPrivilegesMigration.includes("REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated") &&
  defaultPrivilegesMigration.includes("REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated") &&
  defaultPrivilegesMigration.includes("REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC") &&
  !/ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin/i.test(defaultPrivilegesMigration) &&
  !/REVOKE[^;]*\bservice_role\b/i.test(defaultPrivilegesMigration.replace(/--.*$/gm, "")),
  "postgres default ACL migration must remove client defaults while preserving service_role and leaving supabase_admin to its separate admin path");
assert.ok(
  defaultPrivilegesTest.includes("has_table_privilege") &&
  defaultPrivilegesTest.includes("has_sequence_privilege") &&
  defaultPrivilegesTest.includes("has_function_privilege") &&
  defaultPrivilegesTest.includes("'MAINTAIN'") &&
  defaultPrivilegesTest.includes("service_role") &&
  defaultPrivilegesTest.includes("DROP TABLE"),
  "isolated default-ACL test must cover table/sequence/function grants, PostgreSQL 17 MAINTAIN, service_role preservation, and probe cleanup");
assert.ok(
  readReceiptsProductionMigration.includes("SECURITY INVOKER") &&
  readReceiptsProductionMigration.includes("SET search_path = ''") &&
  readReceiptsProductionMigration.includes("ON CONFLICT (user_name) DO UPDATE") &&
  readReceiptsProductionMigration.includes("greatest(public.chat_reads.last_read_at, excluded.last_read_at)") &&
  /REVOKE ALL ON FUNCTION public\.merge_chat_read_receipts\(text, jsonb, timestamptz\)[\s\S]*FROM PUBLIC, anon, authenticated/.test(readReceiptsProductionMigration) &&
  /GRANT EXECUTE ON FUNCTION public\.merge_chat_read_receipts\(text, jsonb, timestamptz\)[\s\S]*TO service_role/.test(readReceiptsProductionMigration) &&
  !/SECURITY DEFINER/i.test(readReceiptsProductionMigration),
  "production read-receipt RPC must merge atomically/monotonically, use an empty search_path, and remain service-role-only");
assert.ok(bindingMigration.includes("ENABLE ROW LEVEL SECURITY") &&
  bindingMigration.includes("REVOKE ALL PRIVILEGES") && bindingMigration.includes("GRANT ALL PRIVILEGES") &&
  bindingMigration.includes("service_role"),
  "logical room binding table must remain service-role-only");
assert.ok(callAttemptMigration.includes("CREATE TABLE IF NOT EXISTS public.upstatus_signal_call_attempts") &&
  callAttemptMigration.includes("ENABLE ROW LEVEL SECURITY") &&
  callAttemptMigration.includes("REVOKE ALL PRIVILEGES ON TABLE public.upstatus_signal_call_attempts FROM PUBLIC, anon, authenticated") &&
  callAttemptMigration.includes("pg_advisory_xact_lock") &&
  callAttemptMigration.includes("CALL_CANCELLED") &&
  callAttemptMigration.includes("interval '7 days'") &&
  callAttemptMigration.includes("SECURITY INVOKER") &&
  callAttemptMigration.includes("SET search_path = ''") &&
  callAttemptMigration.includes("GRANT EXECUTE ON FUNCTION public.prepare_upstatus_signal_call_room(text, text, text) TO service_role") &&
  callAttemptMigration.includes("GRANT EXECUTE ON FUNCTION public.cancel_upstatus_signal_call_room(text, text) TO service_role"),
  "call attempt table and RPCs must be RLS-protected, service-role-only, idempotent and tombstone-aware");
assert.ok(functionSource.includes('path.endsWith("/room/prepare-call")') &&
  functionSource.includes('path.endsWith("/room/cancel-call")') &&
  functionSource.includes('db.rpc("prepare_upstatus_signal_call_room"') &&
  functionSource.includes('db.rpc("cancel_upstatus_signal_call_room"') &&
  functionSource.includes('from("upstatus_signal_call_attempts")'),
  "signaling endpoint must expose the authenticated call prepare/cancel protocol and expire old attempt records");
assert.ok(transportSource.includes('post("/room/prepare-call"') &&
  transportSource.includes('post("/room/cancel-call"') &&
  transportSource.includes("async function cancelCallRoom(logicalId"),
  "client transport must prepare and cancel call rooms using the logical call ID");
assert.ok(functionSource.includes('path.endsWith("/room/bind")'),
  "endpoint must expose authorized logical room binding");
assert.ok(functionSource.includes('path.endsWith("/room/resolve")'),
  "endpoint must resolve bindings only for accepted room members");
assert.ok(functionSource.includes('from("upstatus_signal_room_bindings").delete().eq("room_id", roomId)'),
  "closing a room must remove its logical bindings");
assert.ok(authenticatedHarness.includes("closed room binding is removed and cannot be resolved"),
  "authenticated harness must cover binding cleanup on room close");
assert.ok(authenticatedHarness.includes("concurrent prepare and cancel serialize to at most one call room") &&
  authenticatedHarness.includes("a late prepare cannot pass a cancel-before-prepare tombstone") &&
  authenticatedRunner.includes("upstatus_signal_call_attempts?created_by=") &&
  authenticatedRunner.includes("upstatus_signal_call_attempts?select=call_id&created_by="),
  "authenticated call-attempt tests and cleanup must cover prepare/cancel races without leaving fixtures");
assert.ok(functionSource.includes('path.endsWith("/broadcast")') &&
  functionSource.includes("filter(name => name !== sender)") &&
  authenticatedHarness.includes("server broadcast fans out only to accepted members") &&
  authenticatedHarness.includes("broadcast payload identity claims are stripped"),
  "broadcast delivery must be server-derived, accepted-member-only, and identity-sanitized");
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
assert.ok(signalingWorkflow.includes("UPSTATUS_SIGNAL_TEST_SERVICE_ROLE_KEY is required; refusing to skip isolated fixture tests."),
  "CI must fail closed when the isolated test secret is unavailable");
assert.ok(signalingWorkflow.includes('UPSTATUS_SIGNAL_ALLOW_MUTATION: "1"'),
  "CI must explicitly opt in before mutating isolated fixtures");
assert.ok(signalingWorkflow.includes("scripts/signaling-envelope.test.mjs") &&
  signalingWorkflow.includes("node scripts/signaling-envelope.test.mjs"),
  "CI must run dedicated legacy envelope unit tests");

assert.match(signalingWorkflow, /uses: actions\/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd/,
  "signaling CI must pin actions/checkout to the reviewed v4 commit");
assert.match(signalingWorkflow, /persist-credentials: false/,
  "signaling CI must not persist the GitHub token in the checkout workspace");
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
assert.ok(
  functionSource.includes('db.rpc("consume_upstatus_signal_rate_limit"') &&
  functionSource.includes("p_bucket_key: name") &&
  functionSource.includes("p_limit: limit") &&
  functionSource.includes("p_window_seconds: 60") &&
  functionSource.includes("if (error) throw error") &&
  functionSource.includes("return data === true"),
  "rate limits must use the atomic database RPC and fail closed when the RPC errors");
assert.ok(
  functionSource.includes('const bucket = sender + (readRoute ? ":read" : ":write")') &&
  functionSource.includes('return response({ error: "Rate limit exceeded" }, 429)'),
  "per-user read/write quotas must reject exhausted buckets with HTTP 429");
assert.ok(
  rateLimitMigration.includes("on conflict(bucket_key) do update set") &&
  rateLimitMigration.includes("return v_count <= p_limit") &&
  rateLimitMigration.includes("security invoker set search_path = ''") &&
  rateLimitMigration.includes("revoke all on function public.consume_upstatus_signal_rate_limit") &&
  rateLimitMigration.includes("grant execute on function public.consume_upstatus_signal_rate_limit") &&
  rateLimitMigration.includes("to service_role"),
  "distributed rate-limit RPC must atomically count requests and remain service-role-only");
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
assert.equal((userTemplate.match(/callSendTo\(p\.from,'busy',\{connectionId:String\(p\.callId\)\+'::busy'\}\);return;/g)||[]).length,2,
  "busy responses for authenticated call offers/invites must use the transport-aware sender");
assert.doesNotMatch(userTemplate,/sendRealtimeEvent\('call_signal',\{type:'busy',callId:p\.callId/,
  "busy call-control responses must never bypass the authenticated transport");
assert.ok(userTemplate.includes("else callSendTo(requester,'join_declined',{updatedAt:Date.now()});"),
  "authenticated group invitation declines must be delivered through the authenticated transport");
assert.ok(userTemplate.includes("}else sendRealtimeEvent('call_signal',{type:accepted?'join_approved':'join_declined',callId:p.callId,from:member,to:requester,participants:upCall.participants.slice(),updatedAt:Date.now()});") &&
  userTemplate.includes("(p.type==='presence'||p.type==='ended'||p.type==='join_declined')&&p.discoveryOnly===true"),
  "legacy public group decisions remain isolated behind the disabled-by-default transport flag");
assert.ok(userTemplate.includes("startOutgoingCallWithTransport(target)") &&
  userTemplate.includes("signalStartInvitationPolling()") &&
  userTemplate.includes("signalTransport.sendToRoom({") &&
  userTemplate.includes("function signalAttemptPendingCallLeave(roomId,expectedTransport,requireExpectedTransport)") &&
  userTemplate.includes("transportForAttempt.leave(roomId)") &&
  userTemplate.includes("signalPendingCallLeaves[signalRoomId]={"),
  "opt-in one-to-one call setup, invitation polling, fanout, and retryable room cleanup must be connected");
assert.ok(userTemplate.includes("signalTransport.accept(signalRoomId)") &&
  userTemplate.includes("signalTransport.decline(roomId)") &&
  userTemplate.includes("signalTransport.sendSignal({roomId:signalRoomId,recipient:to,eventType:'call_signal',payload:p})"),
  "the call client must accept/decline explicit invitations and route mapped signals through the server transport");
const voicePrepareStart = userTemplate.indexOf("async function signalPrepareVoiceRoom(){");
const voicePrepareEnd = userTemplate.indexOf("\nasync function voiceRoomJoin(){", voicePrepareStart);
const voicePrepareSource = userTemplate.slice(voicePrepareStart, voicePrepareEnd);
assert.ok(voicePrepareStart >= 0 && voicePrepareEnd > voicePrepareStart && voicePrepareSource.includes("signalTransport.openVoiceRoom(voiceRoom.id)") && !voicePrepareSource.includes("invitations") && !voicePrepareSource.includes("accept(") && !voicePrepareSource.includes("createRoom(") && !voicePrepareSource.includes("bindRoom(") && userTemplate.includes("eventType:'voice_room_signal'") && userTemplate.includes("eventType:'screen_signal'") && userTemplate.includes("await voiceRoomReceive(voicePayload)") && userTemplate.includes("await screenShareReceive(screenPayload)"),
  "voice rooms must use authenticated open membership without invite/accept; voice and screen media share the room poller");
assert.ok(functionSource.includes("MAX_EVENTS_PER_MINUTE = 90") &&
  functionSource.includes("MAX_READS_PER_MINUTE = 240") &&
  functionSource.includes("readRoute ? MAX_READS_PER_MINUTE : MAX_EVENTS_PER_MINUTE"),
  "signaling polling reads must have a separate bounded quota from writes");
assert.ok(functionSource.includes('path.endsWith("/room/request-invite")') &&
  functionSource.includes('type: "join_request"') &&
  authenticatedHarness.includes("non-member can request invitation to a discoverable active call") &&
  authenticatedHarness.includes("room creator receives the authenticated join request"),
  "active call join requests must be delivered to the room creator without granting membership");
assert.ok(userTemplate.includes("signalTransport.requestInvite(callId)") &&
  userTemplate.includes("discoveryOnly:true") &&
  userTemplate.includes("callSendTo(requester,'invite'"),
  "call discovery hints must not replace authenticated invitations or signal delivery");
console.log("PASS signaling migration idempotency and compatibility defaults");
console.log("PASS atomic invitation transitions and accepted-member authorization");
console.log("PASS authenticated harness is mutation-gated and test-project scoped");
console.log("PASS bounded streaming body reads and JSON body shape validation");
console.log("PASS recursive case-insensitive identity payload sanitization");
console.log("PASS payload nesting and traversal bounds");
console.log("PASS distributed database-backed rate-limit contract");
console.log("PASS legacy call/voice/screen envelope types are explicitly allowlisted");
console.log("PASS authenticated negative cases cover JSON/body/payload limits");
console.log("PASS legacy envelope validator and client-change CI trigger");
console.log("PASS logical room binding and dynamic invitation contracts");
assert.ok(readFileSync("scripts/test-signaling-browser.mjs","utf8").includes('bindingType: "voice"') &&
  readFileSync("scripts/test-signaling-browser.mjs","utf8").includes('bindingType: "screen"') &&
  readFileSync("scripts/test-signaling-browser.mjs","utf8").includes('trackKind: "video"'),
  "authenticated browser E2E must exercise distinct voice and screen WebRTC paths");
assert.ok(readFileSync("scripts/test-signaling-browser.mjs","utf8").includes("async function teardownPeerConnections()") &&
  readFileSync("scripts/test-signaling-browser.mjs","utf8").includes('connectionState, "closed"') &&
  readFileSync("scripts/test-signaling-browser.mjs","utf8").includes('state === "ended"'),
  "browser E2E must assert peer closure and local media track teardown");
const browserHarness = readFileSync("scripts/test-signaling-browser.mjs", "utf8");
assert.ok(functionSource.includes('path.endsWith("/room/open")') && functionSource.includes('db.rpc("open_upstatus_signal_voice_room"') && functionSource.includes('p_max_members: 32') && openVoiceMigration.includes("pg_advisory_xact_lock") && openVoiceMigration.includes("FOR UPDATE") && openVoiceMigration.includes("p_max_members") && openVoiceMigration.includes("ROOM_FULL") && openVoiceMigration.includes("SECURITY INVOKER") && openVoiceMigration.includes("SET search_path = ''") && openVoiceMigration.includes("REVOKE ALL ON FUNCTION public.open_upstatus_signal_voice_room") && openVoiceMigration.includes("GRANT EXECUTE ON FUNCTION public.open_upstatus_signal_voice_room") && authenticatedHarness.includes("late members join the same voice room") && authenticatedHarness.includes("owner departure and late open join serialize") && authenticatedHarness.includes("ROOM_FULL"), "open voice join must be authenticated, transactional, idempotent, capacity-bounded, and serialized with leave");
assert.ok(browserHarness.includes("async function runGroupMesh()") && browserHarness.includes("async function negotiateMeshPair("),
  "authenticated browser E2E must include a three-member group mesh");
assert.ok(browserHarness.includes('"/room/invite"') && browserHarness.includes('"/room/members"') && browserHarness.includes('"/broadcast"'),
  "group browser E2E must cover dynamic invitation, accepted roster, and authenticated fanout");
assert.ok(browserHarness.includes("await negotiateMeshPair(pageA, users.A, pageB, users.B, callId)") &&
  browserHarness.includes("await negotiateMeshPair(pageA, users.A, pageC, users.C, callId)") &&
  browserHarness.includes("await negotiateMeshPair(pageB, users.B, pageC, users.C, callId)"),
  "group browser E2E must establish every peer-to-peer mesh link");
assert.ok(functionSource.includes('path.endsWith("/room/leave")') && functionSource.includes('db.rpc("leave_upstatus_signal_room"') && openVoiceMigration.includes("DELETE FROM public.upstatus_signal_events AS e") && openVoiceMigration.includes("e.recipient = p_user_name") && openVoiceMigration.includes("SET created_by = v_next_owner"),
  "room leave must use one transaction to remove inbox events, transfer ownership, and preserve outgoing signals");
assert.ok(userTemplate.includes("leavingTransport.leave(leavingRoomId)") &&
  userTemplate.includes("signalTransport!==leavingTransport") &&
  userTemplate.includes("signalVoiceRoomRoomId!==leavingRoomId") &&
  userTemplate.includes("function signalAttemptPendingCallLeave(roomId,expectedTransport,requireExpectedTransport)") &&
  userTemplate.includes("transportForAttempt.leave(roomId)") &&
  userTemplate.includes("function signalAttemptPendingCallAttempt(callId,expectedTransport,requireExpectedTransport)") &&
  userTemplate.includes("transportForAttempt.cancelCallRoom(callId)") &&
  userTemplate.includes("signalTrackPendingCallAttempt(transportCallId)") &&
  userTemplate.includes("await voiceRoomLeave()"),
  "voice and call teardown paths must release authenticated room membership without using a replacement transport after reconnect");
const normalInitStart=userTemplate.indexOf("function initSignalingTransport(){");
const normalInitEnd=userTemplate.indexOf("var lastMember=",normalInitStart);
const normalInitSource=userTemplate.slice(normalInitStart,normalInitEnd);
assert.ok(normalInitStart>=0&&normalInitEnd>normalInitStart&&normalInitSource.includes("signalRetryPendingCallLeaves();") &&
  normalInitSource.indexOf("signalRestorePendingCallAttempts()")>=0 &&
  normalInitSource.indexOf("signalRestorePendingCallAttempts()")<normalInitSource.indexOf("signalRetryPendingCallAttempts()"),
  "Normal signaling transport initialization must restore call-ID recovery handles before retrying them after reconnect");
const normalStartCallStart=userTemplate.indexOf("async function startOutgoingCall(target){");
const normalStartCallEnd=userTemplate.indexOf("async function callAcceptIncomingOffer",normalStartCallStart);
const normalStartCallSource=userTemplate.slice(normalStartCallStart,normalStartCallEnd);
assert.ok(normalStartCallStart>=0&&normalStartCallEnd>normalStartCallStart&&normalStartCallSource.indexOf("await waitForRealtimeReady(10000)")>=0&&normalStartCallSource.indexOf("await waitForRealtimeReady(10000)")<normalStartCallSource.indexOf("upCall.callId=callNewId()"),"Normal legacy outgoing calls must wait for Realtime before allocating a call");
assert.ok(userTemplate.includes("async function callRequestToJoin(callId,target)")&&userTemplate.includes("await waitForRealtimeReady(10000)"),"Normal legacy group-call join requests must wait for Realtime after reconnect");
assert.ok(userTemplate.includes("if(upCall.starting){") && userTemplate.includes("upCall.startAttempt=(upCall.startAttempt||0)+1;upCall.starting=false;"), "outgoing-call recovery must serialize duplicate clicks and invalidate pending attempts on cleanup");
const outgoingStartStart=userTemplate.indexOf("async function startOutgoingCall(target){");
const outgoingStartEnd=userTemplate.indexOf("async function callAcceptIncomingOffer",outgoingStartStart);
assert.ok(outgoingStartStart>=0&&outgoingStartEnd>outgoingStartStart,"outgoing-call recovery source boundaries not found");
const outgoingStartSource=userTemplate.slice(outgoingStartStart,outgoingStartEnd)+"\nthis.__candidateStartOutgoingCall=startOutgoingCall;";
let finishRealtimeWait;
const pendingRealtimeWait=new Promise(resolve=>{finishRealtimeWait=resolve;});
let realtimeWaitCalls=0,callIdsCreated=0;
const outgoingContext={
  upCall:{active:false,starting:false,startAttempt:0},
  member:"Reconnect Tester",signalTransportFlag:false,realtimeActive:false,realtimeChannel:null,
  waitForRealtimeReady:()=>{realtimeWaitCalls++;return pendingRealtimeWait;},
  message:()=>{},callNewId:()=>{callIdsCreated++;return "should-not-start";}
};
vm.runInNewContext(outgoingStartSource,outgoingContext,{timeout:1000});
const firstOutgoingAttempt=outgoingContext.__candidateStartOutgoingCall("Peer");
assert.equal(outgoingContext.upCall.starting,true,"first outgoing call must reserve the start slot while Realtime reconnects");
await outgoingContext.__candidateStartOutgoingCall("Peer");
assert.equal(realtimeWaitCalls,1,"a duplicate click must not start a second Realtime readiness wait");
outgoingContext.upCall.startAttempt++;
outgoingContext.upCall.starting=false;
finishRealtimeWait(true);
await firstOutgoingAttempt;
assert.equal(outgoingContext.upCall.active,false,"a call attempt invalidated by cleanup must not start after reconnect");
assert.equal(callIdsCreated,0,"a stale outgoing call must not allocate a call ID after cleanup");

assert.ok(userTemplate.includes("var voiceRoomLeavePromise=null;") &&
  userTemplate.includes("if(voiceRoomLeavePromise)return voiceRoomLeavePromise;") &&
  userTemplate.includes("voiceRoomLeavePromise=leavePromise.finally") &&
  userTemplate.includes("while(voiceRoomLeavePromise){try{await voiceRoomLeavePromise;}catch(e){}}"),
  "Normal voice rejoin must serialize behind the prior leave promise");
assert.ok(userTemplate.includes("voiceRoomLeave({skipServerLeave:true})") &&
  userTemplate.includes("screenShareStop(!skipServerLeave)") &&
  userTemplate.includes("signalVoiceRoomPrepared=false") &&
  userTemplate.includes("async function waitForRealtimeReady(") &&
  userTemplate.includes("await waitForRealtimeReady(10000)"),
  "Normal offline recovery must tear down locally without network leave and wait for Realtime readiness before legacy voice rejoin");
assert.ok(userTemplate.includes("leavingTransport=signalTransport") &&
  userTemplate.includes("if(signalTransport!==leavingTransport||signalVoiceRoomRoomId!==leavingRoomId)return false") &&
  userTemplate.includes("signalVoiceRoomPrepared=false;return false"),
  "Normal leave retry must retain room context on failure and must not issue a stale leave through a replacement transport");
console.log("PASS authenticated room leave and owner handoff are wired into client cleanup");
console.log("PASS browser E2E asserts peer and media teardown");
console.log("PASS authenticated browser E2E covers call, voice, and screen media paths");
console.log("PASS authenticated browser E2E covers dynamic group invitations, three-member fanout, and all peer mesh links");




const productionDeployWorkflow = readFileSync(".github/workflows/deploy-production.yml", "utf8");
const productionGuardPosition = productionDeployWorkflow.indexOf("Require approved release ref and production project");
const productionReleasePosition = productionDeployWorkflow.indexOf("Require explicitly approved stable release");
const productionCliPosition = productionDeployWorkflow.indexOf("Setup Supabase CLI");
const productionDeployPosition = productionDeployWorkflow.indexOf("Deploy PRODUCTION only");
assert.ok(
  productionDeployWorkflow.includes("workflow_dispatch:") &&
  productionDeployWorkflow.includes('if [ "$GITHUB_REF" != "refs/heads/master" ]') &&
  productionDeployWorkflow.includes('if [ "$(git rev-parse HEAD)" != "$GITHUB_SHA" ]') &&
  productionDeployWorkflow.includes("EXPECTED_SUPABASE_PROJECT_ID: dlfvkawaiqduhlazsszm") &&
  productionDeployWorkflow.includes('if [ -z "$SUPABASE_PROJECT_ID" ]') &&
  productionDeployWorkflow.includes('if [ -z "$SUPABASE_ACCESS_TOKEN" ]') &&
  productionDeployWorkflow.includes("version: 2.122.1") &&
  !productionDeployWorkflow.includes("version: latest") &&
  productionDeployWorkflow.includes("r.version !== '3.4.7'") &&
  productionGuardPosition >= 0 && productionGuardPosition < productionReleasePosition &&
  productionReleasePosition < productionCliPosition && productionCliPosition < productionDeployPosition,
  "production deploy must be master-only, exact-SHA checked, project-ID guarded, credential-checked, release-locked, and use a pinned Supabase CLI before deploy");
console.log("PASS production deploy ref, project, credential, release, and CLI-version guards");

const voiceLeaveStart = userTemplate.indexOf("function voiceRoomLeave(options){");
const voiceLeaveEnd = userTemplate.indexOf("window.addEventListener('pagehide'", voiceLeaveStart);
const realtimeReadyStart = userTemplate.indexOf("async function waitForRealtimeReady(");
const realtimeReadyEnd = userTemplate.indexOf("\nasync function voiceRoomJoin", realtimeReadyStart);
assert.ok(voiceLeaveStart >= 0 && voiceLeaveEnd > voiceLeaveStart, "Normal voice leave source boundaries not found");
assert.ok(realtimeReadyStart >= 0 && realtimeReadyEnd > realtimeReadyStart, "Normal Realtime readiness source boundaries not found");
const voiceLeaveSource = "var voiceRoomLeavePromise=null;\n" + userTemplate.slice(voiceLeaveStart, voiceLeaveEnd) + "\nthis.__candidateVoiceRoomLeave=voiceRoomLeave;";
const realtimeReadySource = userTemplate.slice(realtimeReadyStart, realtimeReadyEnd) + "\nthis.__candidateWaitForVoiceRealtimeReady=waitForRealtimeReady;";
const readyContext = {
  navigator: { onLine: true }, token: "session-token", realtimeActive: false, realtimeChannel: null,
  realtimeClient: null, realtimeRetryTimer: null, Date, Promise, setTimeout,
  startRealtime: () => { readyContext.realtimeClient = {}; readyContext.realtimeChannel = {}; readyContext.realtimeActive = true; }
};
vm.runInNewContext(realtimeReadySource, readyContext, { timeout: 1000 });
assert.equal(await readyContext.__candidateWaitForVoiceRealtimeReady(1000), true, "Normal voice join must wait until Realtime is subscribed");
const offlineReadyContext = {
  navigator: { onLine: false }, token: "session-token", realtimeActive: false, realtimeChannel: null,
  realtimeClient: null, realtimeRetryTimer: null, Date, Promise, setTimeout,
  startRealtime: () => { throw new Error("Normal must not start Realtime while offline"); }
};
vm.runInNewContext(realtimeReadySource, offlineReadyContext, { timeout: 1000 });
assert.equal(await offlineReadyContext.__candidateWaitForVoiceRealtimeReady(1000), false, "Normal voice join readiness must stop while offline");

function makeVoiceLeaveContext({ transport, roomId = "normal-offline-room", screenShareStop } = {}) {
  const events = [];
  const context = {
    voiceRoom: {
      joinGeneration: 0, active: true, joining: false, recoveryTimers: {}, recoveryAttempts: {},
      timer: null, levelTimer: null, pingTimer: null, pingMs: null, peers: {}, stream: null,
      muted: false, participants: {}
    },
    signalVoiceRoomRoomId: roomId, signalVoiceRoomCreator: true, signalVoiceRoomPrepared: true,
    signalTransport: transport || { leave: async () => ({ ok: true }) },
    signalRosterCache: { [roomId]: {} }, member: "Normal Tester", Promise,
    screenShareStop: send => { events.push("screen-stop:" + send); return screenShareStop ? screenShareStop() : Promise.resolve(); },
    voiceRoomPlayCue: () => events.push("leave-cue"),
    voiceRoomSend: () => { events.push("network-leave-signal"); return Promise.resolve(true); },
    signalStopCallPolling: id => events.push("poll-stop:" + id),
    voiceRoomDrop: () => {}, voiceRoomRender: () => {}, voiceRoomMessage: () => {},
    clearTimeout: () => {}, clearInterval: () => {}
  };
  vm.runInNewContext(voiceLeaveSource, context, { timeout: 1000 });
  return { context, events };
}

let releaseCoalescedLeave;
const coalescedScreenLeave = new Promise(resolve => { releaseCoalescedLeave = resolve; });
const coalescedLeave = makeVoiceLeaveContext({ screenShareStop: () => coalescedScreenLeave });
const firstCoalescedLeave = coalescedLeave.context.__candidateVoiceRoomLeave();
const secondCoalescedLeave = coalescedLeave.context.__candidateVoiceRoomLeave();
assert.equal(firstCoalescedLeave, secondCoalescedLeave, "duplicate Normal leave calls must share one in-flight promise");
assert.equal(coalescedLeave.events.filter(event => event === "screen-stop:true").length, 1, "duplicate Normal leave calls must not repeat screen teardown");
releaseCoalescedLeave();
await firstCoalescedLeave;
const offlineLeave = makeVoiceLeaveContext();
const offlineLeaveResult = await offlineLeave.context.__candidateVoiceRoomLeave({ skipServerLeave: true });
assert.equal(offlineLeaveResult, false, "offline teardown must report that server-owned membership was not released");
assert.ok(offlineLeave.events.includes("screen-stop:false"), "offline teardown must stop screen capture without sending a signal");
assert.equal(offlineLeave.events.some(event => event.startsWith("network-")), false, "offline teardown must not call signaling or membership RPCs");
assert.equal(offlineLeave.context.signalVoiceRoomRoomId, "normal-offline-room", "offline teardown must retain server room context for logout retry");
assert.equal(offlineLeave.context.signalVoiceRoomCreator, false, "offline teardown must clear stale local ownership");
assert.equal(offlineLeave.context.signalVoiceRoomPrepared, false, "offline teardown must require a fresh open-room handshake");

let leaveAttempts = 0;
const retryTransport = { leave: async () => { leaveAttempts++; if (leaveAttempts === 1) throw new Error("transient network failure"); return { ok: true }; } };
const retryLeave = makeVoiceLeaveContext({ transport: retryTransport });
await retryLeave.context.__candidateVoiceRoomLeave();
assert.equal(leaveAttempts, 1, "first Normal leave attempt must reach the captured transport");
assert.equal(retryLeave.context.signalVoiceRoomRoomId, "normal-offline-room", "failed Normal leave must retain the room ID for retry");
assert.equal(retryLeave.context.signalVoiceRoomPrepared, false, "failed Normal leave must force an idempotent open-room refresh before rejoin");
await retryLeave.context.__candidateVoiceRoomLeave();
assert.equal(leaveAttempts, 2, "a second Normal leave must retry the same membership");
assert.equal(retryLeave.context.signalVoiceRoomRoomId, "", "successful retry must clear the room ID");
assert.equal(retryLeave.context.signalVoiceRoomPrepared, false, "successful leave must clear prepared state");

let releaseScreen;
const pendingScreen = new Promise(resolve => { releaseScreen = resolve; });
let oldTransportLeaves = 0, newTransportLeaves = 0;
const oldTransport = { leave: async () => { oldTransportLeaves++; return { ok: true }; } };
const staleTransportLeave = makeVoiceLeaveContext({ transport: oldTransport, screenShareStop: () => pendingScreen });
const replacementTransport = { leave: async () => { newTransportLeaves++; return { ok: true }; } };
const staleLeavePromise = staleTransportLeave.context.__candidateVoiceRoomLeave();
staleTransportLeave.context.signalTransport = replacementTransport;
releaseScreen();
await staleLeavePromise;
assert.equal(oldTransportLeaves, 0, "leave must not use a transport instance that was stopped during reconnect");
assert.equal(newTransportLeaves, 0, "an old leave promise must never release membership through the replacement transport");
console.log("Normal offline voice recovery, Realtime readiness, leave retry, and stale-transport tests passed.");

console.log("Signaling static regression groups passed.");


// An HTTP-success response that explicitly denies membership removal must not clear the room binding.
const deniedLeave = makeVoiceLeaveContext({ transport: { leave: async () => ({ ok: false, error: "membership remains" }) } });
const deniedLeaveResult = await deniedLeave.context.__candidateVoiceRoomLeave();
assert.equal(deniedLeaveResult, false, "Normal leave must reject an explicit unsuccessful RPC response");
assert.equal(deniedLeave.context.signalVoiceRoomRoomId, "normal-offline-room", "an unsuccessful leave response must preserve the room ID");
assert.equal(deniedLeave.context.signalVoiceRoomPrepared, false, "an unsuccessful leave response must force a fresh room handshake before rejoin");
console.log("Normal unconfirmed membership leave response tests passed.");

// Logout is blocked while the authenticated room ID remains; the session is kept for a retry.
const logoutReleaseStart = userTemplate.indexOf("async function normalReleaseVoiceRoomBeforeLogout(){");
const logoutReleaseEnd = userTemplate.indexOf("\nwindow.addEventListener('pagehide'", logoutReleaseStart);
assert.ok(logoutReleaseStart >= 0 && logoutReleaseEnd > logoutReleaseStart, "Normal logout voice-release gate source boundaries not found");
const logoutReleaseSource = userTemplate.slice(logoutReleaseStart, logoutReleaseEnd) + "\nthis.__candidateNormalLogoutRelease=normalReleaseVoiceRoomBeforeLogout;";
const logoutReleaseEvents = [];
const logoutReleaseContext = {
  signalVoiceRoomRoomId: "normal-pending-logout-room",
  voiceRoomLeave: async () => false,
  voiceRoomMessage: message => logoutReleaseEvents.push("message:" + message),
  card: { classList: { remove: value => logoutReleaseEvents.push("show-card:" + value) } },
  voiceRoomRender: () => logoutReleaseEvents.push("render")
};
vm.runInNewContext(logoutReleaseSource, logoutReleaseContext, { timeout: 1000 });
assert.equal(await logoutReleaseContext.__candidateNormalLogoutRelease(), false, "Normal logout must abort when membership remains on the server");
assert.equal(logoutReleaseContext.signalVoiceRoomRoomId, "normal-pending-logout-room", "failed Normal logout must preserve the room ID");
assert.ok(logoutReleaseEvents.some(event => event.startsWith("message:")) && logoutReleaseEvents.includes("show-card:hidden"),
  "failed Normal logout must show a retry message and restore the card");
logoutReleaseContext.voiceRoomLeave = async () => { logoutReleaseContext.signalVoiceRoomRoomId = ""; return true; };
assert.equal(await logoutReleaseContext.__candidateNormalLogoutRelease(), true, "Normal logout may proceed after a confirmed leave retry");

const logoutHandlerStart = userTemplate.indexOf("card.querySelector('.up-logout').onclick=async function(){");
const logoutHandlerEnd = userTemplate.indexOf("\n    history.querySelector", logoutHandlerStart);
assert.ok(logoutHandlerStart >= 0 && logoutHandlerEnd > logoutHandlerStart, "Normal logout handler source boundaries not found");
const logoutHandler = userTemplate.slice(logoutHandlerStart, logoutHandlerEnd);
assert.ok(logoutHandler.includes("var callsReleased=false;") &&
  logoutHandler.includes("await callCleanup(true,'hangup')") &&
  logoutHandler.includes("if(!callsReleased){") &&
  logoutHandler.indexOf("if(!callsReleased)") < logoutHandler.indexOf("await api('POST','/api/logout',{})") &&
  logoutHandler.indexOf("if(!callsReleased)") < logoutHandler.indexOf("token='';") &&
  logoutHandler.includes("await signalRetryPendingCallAttempts()") &&
  logoutHandler.includes("await signalRetryPendingCallLeaves()"),
  "Normal logout must confirm every authenticated call-room leave before voice leave, API logout and credential invalidation");
assert.ok(logoutHandler.indexOf("await signalRetryPendingCallAttempts()")>=0 && logoutHandler.indexOf("await signalRetryPendingCallAttempts()")<logoutHandler.indexOf("await signalRetryPendingCallLeaves()"), "Normal idle logout must cancel logical call attempts before retrying room leaves");
const normalAcceptGroupStart=userTemplate.indexOf("async function callAcceptGroupInvite(){");
const normalAcceptGroupEnd=userTemplate.indexOf("async function callAcceptIncomingCall(){",normalAcceptGroupStart);
const normalAcceptGroupSource=userTemplate.slice(normalAcceptGroupStart,normalAcceptGroupEnd);
assert.ok(normalAcceptGroupStart>=0 && normalAcceptGroupEnd>normalAcceptGroupStart && normalAcceptGroupSource.indexOf("signalTrackPendingCallLeave(signalRoomId,upCall.callId,signalTransport)")>=0 && normalAcceptGroupSource.indexOf("signalTrackPendingCallLeave(signalRoomId,upCall.callId,signalTransport)")<normalAcceptGroupSource.indexOf("signalTransport.accept(signalRoomId)"), "Normal must persist the recipient leave handle before accepting an authenticated call");
const offlineHandlerStart = userTemplate.indexOf("window.addEventListener('offline'");
const onlineHandlerStart = userTemplate.indexOf("window.addEventListener('online'", offlineHandlerStart);
assert.ok(offlineHandlerStart >= 0 && onlineHandlerStart > offlineHandlerStart, "Normal offline handler source boundaries not found");
const offlineHandler = userTemplate.slice(offlineHandlerStart, onlineHandlerStart);
assert.ok(offlineHandler.includes("voiceRoomLeave({skipServerLeave:true})") &&
  !offlineHandler.includes("signalVoiceRoomRoomId=''"),
  "Normal offline teardown must preserve the server-owned room ID for a later logout retry");
console.log("Normal logout confirmation and session-retention tests passed.");

const normalVoiceJoinStart = userTemplate.indexOf("async function voiceRoomJoin()");
const normalVoiceJoinEnd = userTemplate.indexOf("function voiceRoomToggleSpeakers", normalVoiceJoinStart);
assert.ok(normalVoiceJoinStart >= 0 && normalVoiceJoinEnd > normalVoiceJoinStart, "Normal voice join source boundaries not found");
const normalVoiceJoinSource = userTemplate.slice(normalVoiceJoinStart, normalVoiceJoinEnd);
const normalVoiceJoinCatchStart = normalVoiceJoinSource.lastIndexOf("}catch(e){");
const normalVoiceJoinCatchEnd = normalVoiceJoinSource.indexOf("}finally", normalVoiceJoinCatchStart);
const normalVoiceJoinCatch = normalVoiceJoinSource.slice(normalVoiceJoinCatchStart, normalVoiceJoinCatchEnd);
assert.ok(normalVoiceJoinCatch.includes("await voiceRoomLeave()") &&
  !normalVoiceJoinCatch.includes("signalVoiceRoomRoomId=''") &&
  !normalVoiceJoinCatch.includes("signalTransport.leave(failedRoom)"),
  "Normal microphone/setup failure must use confirmed leave and preserve room context when release fails");
console.log("Normal voice join failure membership-retention test passed.");

const callLeaveHelperStart = userTemplate.indexOf("function signalPendingCallLeavesStorageKey(");
const callLeaveHelperEnd = userTemplate.indexOf("function initSignalingTransport(", callLeaveHelperStart);
const callCleanupStart = userTemplate.indexOf("function callCleanup(sendSignal,signalType){");
const callCleanupEnd = userTemplate.indexOf("  function callFail(", callCleanupStart);
assert.ok(callLeaveHelperStart >= 0 && callLeaveHelperEnd > callLeaveHelperStart &&
  callCleanupStart >= 0 && callCleanupEnd > callCleanupStart,
  "Normal call-membership cleanup source boundaries not found");
const callRuntimeSource = userTemplate.slice(callLeaveHelperStart, callLeaveHelperEnd) +
  userTemplate.slice(callCleanupStart, callCleanupEnd) +
  "\nthis.__candidateCallCleanup=callCleanup;this.__candidateRetryPendingCallLeaves=signalRetryPendingCallLeaves;this.__candidatePersistPendingCallLeaves=signalPersistPendingCallLeaves;this.__candidateRestorePendingCallLeaves=signalRestorePendingCallLeaves;this.__candidateStorageKey=signalPendingCallLeavesStorageKey;this.__candidateTrackPendingCallAttempt=signalTrackPendingCallAttempt;this.__candidateRestorePendingCallAttempts=signalRestorePendingCallAttempts;this.__candidateRetryPendingCallAttempts=signalRetryPendingCallAttempts;this.__candidateAttemptPendingCallAttempt=signalAttemptPendingCallAttempt;this.__candidateAttemptStorageKey=signalPendingCallAttemptsStorageKey;this.__candidateTrackPendingCallLeave=signalTrackPendingCallLeave;";
function makeCallCleanupContext({ transport, callSendAll, storage = new Map(), member = "Normal Tester" } = {}) {
  const roomId = "normal-call-room";
  const callId = "normal-call-1";
  const context = {
    upCall: {
      startAttempt: 0, starting: false, callId, active: true, peer: "", role: "", initiator: "",
      participants: ["Normal Tester", "Peer"], pendingInvites: {}, pendingOffers: {}, pendingInvite: null,
      peers: {}, localStream: null, remoteStream: null, audio: null, connected: true, muted: false,
      startedAt: 0, waitingForConnection: false, notice: "", presenceTimer: null, timer: null,
      counterTimer: null, signalAbortController: null
    },
    signalRoomByCallId: { [callId]: roomId },
    signalCallIdByRoom: { [roomId]: callId },
    signalCreatorCallIds: { [callId]: false },
    signalRosterCache: { [roomId]: { members: [] } },
    signalPendingCallLeaves: Object.create(null),
    signalPendingCallAttempts: Object.create(null),
    signalPollStops: {},
    signalTransport: transport || null,
    signalTransportFlag: true,
    member,
    token: "normal-session-token",
    key: "upstatus_normal_",
    GM_getValue: (name, fallback) => storage.has(name) ? storage.get(name) : fallback,
    GM_setValue: (name, value) => storage.set(name, value),
    signalStopCallPolling: () => {},
    callSendAll: callSendAll || (() => Promise.resolve(true)),
    callSend: () => Promise.resolve(true),
    sendRealtimeEvent: () => {},
    callStopRingtone: () => {},
    callRemovePeer: () => {},
    callStopStream: () => {},
    callHideOverlay: () => {},
    clearInterval: () => {},
    clearTimeout: () => {},
    Promise, Object, Error
  };
  vm.runInNewContext(callRuntimeSource, context, { timeout: 1000 });
  return context;
}
let normalLeaveAttempts = 0;
const normalRetryContext = makeCallCleanupContext({
  transport: { leave: async () => { normalLeaveAttempts++; if (normalLeaveAttempts === 1) throw new Error("temporary network failure"); return { ok: true }; } }
});
const normalFirstCallCleanup = await normalRetryContext.__candidateCallCleanup(false);
assert.equal(normalFirstCallCleanup, false, "Normal call cleanup must report an unconfirmed server leave");
assert.ok(normalRetryContext.signalPendingCallLeaves["normal-call-room"], "Normal call cleanup must preserve a retry handle after leave failure");
assert.equal(normalRetryContext.upCall.callId, "", "Normal call media/UI cleanup must finish even while server leave remains pending");
assert.equal(await normalRetryContext.__candidateRetryPendingCallLeaves(), true, "Normal reconnect retry must confirm the pending call-room leave");
assert.equal(normalLeaveAttempts, 2, "Normal retry must repeat the same idempotent room leave");
assert.equal(normalRetryContext.signalPendingCallLeaves["normal-call-room"], undefined, "Normal confirmed retry must clear the pending handle");

let normalOldTransportLeaves = 0, normalNewTransportLeaves = 0, finishNormalSignal;
const pendingNormalSignal = new Promise(resolve => { finishNormalSignal = resolve; });
const normalOldTransport = { leave: async () => { normalOldTransportLeaves++; return { ok: true }; } };
const normalNewTransport = { leave: async () => { normalNewTransportLeaves++; return { ok: true }; } };
const normalTransportSwapContext = makeCallCleanupContext({
  transport: normalOldTransport,
  callSendAll: () => pendingNormalSignal
});
const normalSwapCleanup = normalTransportSwapContext.__candidateCallCleanup(false);
normalTransportSwapContext.signalTransport = normalNewTransport;
finishNormalSignal(true);
assert.equal(await normalSwapCleanup, false, "Normal in-flight cleanup must not silently switch to a replacement transport");
assert.equal(normalOldTransportLeaves, 0, "Normal cleanup must not use a stopped transport");
assert.equal(normalNewTransportLeaves, 0, "Normal cleanup must not use a replacement transport before explicit retry");
assert.ok(normalTransportSwapContext.signalPendingCallLeaves["normal-call-room"], "Normal transport replacement must retain the room retry handle");
assert.equal(await normalTransportSwapContext.__candidateRetryPendingCallLeaves(), true, "Normal explicit retry must use the current authenticated transport");
assert.equal(normalNewTransportLeaves, 1, "Normal retry must use the replacement transport exactly once");

const normalNoTransportContext = makeCallCleanupContext({ transport: null });
assert.equal(await normalNoTransportContext.__candidateCallCleanup(false), false, "Normal offline call cleanup must report pending server membership");
assert.ok(normalNoTransportContext.signalPendingCallLeaves["normal-call-room"], "Normal offline call cleanup must retain the room ID");
let normalRecoveredLeaveCalls = 0;
normalNoTransportContext.signalTransport = { leave: async () => { normalRecoveredLeaveCalls++; return { ok: true }; } };
assert.equal(await normalNoTransportContext.__candidateRetryPendingCallLeaves(), true, "Normal reconnect must retry a leave after transport recreation");
assert.equal(normalRecoveredLeaveCalls, 1, "Normal reconnect must release the retained call room once");

let normalPersistentAttempts = 0;
const normalPersistentContext = makeCallCleanupContext({
  transport: { leave: async () => { normalPersistentAttempts++; return { ok: false, error: "server unavailable" }; } }
});
assert.equal(await normalPersistentContext.__candidateCallCleanup(false), false, "Normal persistent leave failure must remain unconfirmed");
assert.equal(await normalPersistentContext.__candidateRetryPendingCallLeaves(), false, "Normal persistent leave failure must remain retryable");
assert.ok(normalPersistentContext.signalPendingCallLeaves["normal-call-room"], "Normal persistent failure must not discard the retry handle");
const attemptsBeforeOtherMember = normalPersistentAttempts;
normalPersistentContext.member = "Different User";
assert.equal(await normalPersistentContext.__candidateRetryPendingCallLeaves(), true, "A different member must not be blocked by another member's pending call cleanup");
assert.equal(normalPersistentAttempts, attemptsBeforeOtherMember, "A pending room must never be released under another member identity");

const normalLogoutMatch = userTemplate.match(/card\.querySelector\('\.up-logout'\)\.onclick=async function\(\)\{([\s\S]*?)\};/);
assert.ok(normalLogoutMatch, "Normal logout handler source not found");
const normalLogoutEvents = [];
const normalLogoutContext = {
  upCall: { active: true }, callCleanup: async () => false, signalRetryPendingCallLeaves: async () => true,
  voiceRoomMessage: message => normalLogoutEvents.push("message:" + message),
  voiceRoomRender: () => normalLogoutEvents.push("render"),
  normalReleaseVoiceRoomBeforeLogout: async () => { normalLogoutEvents.push("voice-release"); return true; },
  broadcastChatPresence: () => normalLogoutEvents.push("chat-presence"),
  api: async () => { normalLogoutEvents.push("api-logout"); },
  stopRealtime: () => normalLogoutEvents.push("stop-realtime"),
  GM_setValue: () => normalLogoutEvents.push("storage-clear"),
  token: "normal-session-token", member: "Normal Tester", role: "implementation_user",
  history: { classList: { add: () => {} } }, health: { classList: { add: () => {} } },
  img: { src: "" }, profileFallback: () => "", login: () => normalLogoutEvents.push("login")
};
vm.runInNewContext("async function __candidateLogout(){" + normalLogoutMatch[1] + "} this.__candidateLogout=__candidateLogout;", normalLogoutContext, { timeout: 1000 });
await normalLogoutContext.__candidateLogout();
assert.equal(normalLogoutContext.token, "normal-session-token", "Normal failed call leave must retain the session token");
assert.equal(normalLogoutEvents.some(event => event === "api-logout" || event === "stop-realtime" || event === "storage-clear" || event === "login" || event === "voice-release"), false,
  "Normal logout must abort before voice leave, API logout, Realtime stop or credential clearing when call membership remains");
const normalPendingAttemptLogoutEvents = [];
const normalPendingAttemptLogoutContext = {
  ...normalLogoutContext,
  upCall: { active: false },
  callCleanup: async () => { normalPendingAttemptLogoutEvents.push("call-cleanup"); return true; },
  signalRetryPendingCallAttempts: async () => { normalPendingAttemptLogoutEvents.push("retry-attempts"); return false; },
  signalRetryPendingCallLeaves: async () => { normalPendingAttemptLogoutEvents.push("retry-leaves"); return true; },
  voiceRoomMessage: message => normalPendingAttemptLogoutEvents.push("message:" + message),
  voiceRoomRender: () => normalPendingAttemptLogoutEvents.push("render"),
  normalReleaseVoiceRoomBeforeLogout: async () => { normalPendingAttemptLogoutEvents.push("voice-release"); return true; },
  broadcastChatPresence: () => normalPendingAttemptLogoutEvents.push("chat-presence"),
  api: async () => { normalPendingAttemptLogoutEvents.push("api-logout"); },
  stopRealtime: () => normalPendingAttemptLogoutEvents.push("stop-realtime"),
  GM_setValue: () => normalPendingAttemptLogoutEvents.push("storage-clear")
};
vm.runInNewContext("async function __candidateLogout(){" + normalLogoutMatch[1] + "} this.__candidateLogout=__candidateLogout;", normalPendingAttemptLogoutContext, { timeout: 1000 });
await normalPendingAttemptLogoutContext.__candidateLogout();
assert.equal(normalPendingAttemptLogoutContext.token, "normal-session-token", "Normal failed logical call cancellation must preserve the session token");
assert.ok(normalPendingAttemptLogoutEvents.includes("retry-attempts"), "Normal idle logout must retry restored logical call attempts");
assert.equal(normalPendingAttemptLogoutEvents.includes("retry-leaves"), false, "Normal must not proceed to room leaves while logical call cancellation is unconfirmed");
assert.equal(normalPendingAttemptLogoutEvents.some(event => event === "voice-release" || event === "api-logout" || event === "stop-realtime" || event === "storage-clear" || event === "login"), false,
  "Normal must not leave voice, logout, stop Realtime or clear credentials while a logical call attempt remains");
console.log("Normal idle logout blocks on unconfirmed logical call-attempt cancellation.");
console.log("Normal authenticated call-room cleanup retry and logout-gate tests passed.");


// Durable call-room leave recovery is token-free, member-bound and restored only after authentication.
assert.ok(userTemplate.includes("window.addEventListener('pagehide',function(){try{callCleanup(false,'pagehide')"),
  "Normal pagehide must initiate call-room cleanup before the document is discarded");
const normalInitForPersistenceStart=userTemplate.indexOf("function initSignalingTransport(){");
const normalInitForPersistenceEnd=userTemplate.indexOf("var lastMember=",normalInitForPersistenceStart);
const normalInitForPersistence=userTemplate.slice(normalInitForPersistenceStart,normalInitForPersistenceEnd);
assert.ok(normalInitForPersistence.indexOf("signalRestorePendingCallLeaves()")>=0 &&
  normalInitForPersistence.indexOf("signalRestorePendingCallLeaves()")<normalInitForPersistence.indexOf("signalRetryPendingCallLeaves()") &&
  normalInitForPersistence.indexOf("signalRestorePendingCallAttempts()")>=0 &&
  normalInitForPersistence.indexOf("signalRestorePendingCallAttempts()")<normalInitForPersistence.indexOf("signalRetryPendingCallAttempts()"),
  "Normal must restore durable room and call-ID handles before retrying them on authenticated transport initialization");

const normalPendingLeaveStorage=new Map();
let normalPagehideSignalCalls=0;
const normalPagehideContext=makeCallCleanupContext({
  transport:null,
  storage:normalPendingLeaveStorage,
  callSendAll:()=>{normalPagehideSignalCalls++;return Promise.resolve(true);}
});
assert.equal(await normalPagehideContext.__candidateCallCleanup(false,"pagehide"),false,
  "Normal pagehide cleanup without a transport must retain an unconfirmed leave");
assert.equal(normalPagehideSignalCalls,0,
  "Normal authenticated pagehide cleanup must not wait for a final broadcast before persisting/releasing membership");
const normalPendingStorageKey=normalPagehideContext.__candidateStorageKey("Normal Tester");
const normalPendingEnvelope=normalPendingLeaveStorage.get(normalPendingStorageKey);
assert.equal(normalPendingEnvelope.version,1,"Normal pending leave storage must use an explicit schema version");
assert.equal(normalPendingEnvelope.entries.length,1,"Normal pagehide must persist its pending call room");
assert.deepEqual(Object.keys(normalPendingEnvelope.entries[0]).sort(),["callId","createdAt","member","roomId"],
  "Normal pending leave storage must contain only room ID, member, call ID and timestamp");
assert.equal(Object.prototype.hasOwnProperty.call(normalPendingEnvelope.entries[0],"token"),false,
  "Normal pending leave storage must never persist a session token");

const normalOtherMemberReload=makeCallCleanupContext({transport:null,storage:normalPendingLeaveStorage,member:"Other Member"});
assert.equal(normalOtherMemberReload.__candidateRestorePendingCallLeaves(),0,
  "Normal pending call-room recovery must not cross member identities");
assert.equal(Object.keys(normalOtherMemberReload.signalPendingCallLeaves).length,0,
  "Normal other-member session must not receive another member's pending leave");

let normalReloadLeaveCalls=0;
const normalReloadContext=makeCallCleanupContext({
  transport:{leave:async roomId=>{normalReloadLeaveCalls++;assert.equal(roomId,"normal-call-room");return {ok:true};}},
  storage:normalPendingLeaveStorage
});
normalReloadContext.upCall.callId="";
normalReloadContext.upCall.active=false;
normalReloadContext.signalRoomByCallId=Object.create(null);
normalReloadContext.signalCallIdByRoom=Object.create(null);
assert.equal(normalReloadContext.__candidateRestorePendingCallLeaves(),1,
  "Normal reload must restore a pending leave after the same member authenticates");
assert.equal(await normalReloadContext.__candidateRetryPendingCallLeaves(),true,
  "Normal authenticated reload must retry and confirm the persisted leave");
assert.equal(normalReloadLeaveCalls,1,"Normal reload must retry the persisted room exactly once");
assert.equal(normalPendingLeaveStorage.get(normalPendingStorageKey).entries.length,0,
  "Normal confirmed reload retry must clear the persisted pending leave");

const normalValidationStorage=new Map();
normalValidationStorage.set(normalReloadContext.__candidateStorageKey("Normal Tester"),{
  version:1,
  entries:[
    {roomId:"normal-call-room",member:"Normal Tester",callId:"normal-call-1",createdAt:Date.now()},
    {roomId:"bad room",member:"Normal Tester",callId:"bad",createdAt:Date.now()},
    {roomId:"other-member-room",member:"Different User",callId:"other",createdAt:Date.now()},
    {roomId:"stale-room",member:"Normal Tester",callId:"stale",createdAt:Date.now()-8*24*60*60*1000},
    {roomId:"future-room",member:"Normal Tester",callId:"future",createdAt:Date.now()+120000}
  ]
});
const normalValidationContext=makeCallCleanupContext({transport:null,storage:normalValidationStorage});
assert.ok(userTemplate.includes("if(!/^[A-Za-z0-9._:-]{1,128}$/.test(roomId))return null;"),
  "Normal persisted room IDs must use bounded opaque identifier syntax");
assert.equal(normalValidationContext.__candidateRestorePendingCallLeaves(),1,
  "Normal restore must reject malformed, cross-member, stale and future-dated records");
assert.deepEqual(Object.keys(normalValidationContext.signalPendingCallLeaves),["normal-call-room"],
  "Normal restore must retain only the validated pending room");
console.log("Normal durable pagehide/reload call-room leave recovery tests passed.");

// A call ID is durably recorded before the first prepare request; storage failure blocks call creation.
const normalAttemptStorage=new Map();
const normalAttemptContext=makeCallCleanupContext({
  transport:{cancelCallRoom:async callId=>({ok:true,cancelled:true})},
  storage:normalAttemptStorage
});
const normalAttemptId="Normal_Tester-call-attempt-1";
assert.equal(normalAttemptContext.__candidateTrackPendingCallAttempt(normalAttemptId),true,
  "Normal must persist a call ID before sending the room-prepare request");
const normalAttemptStorageKey=normalAttemptContext.__candidateAttemptStorageKey("Normal Tester");
const normalAttemptEnvelope=normalAttemptStorage.get(normalAttemptStorageKey);
assert.equal(normalAttemptEnvelope.version,1,"call-attempt persistence must use a versioned envelope");
assert.deepEqual(Object.keys(normalAttemptEnvelope.entries[0]).sort(),["callId","createdAt","member"],
  "call-attempt persistence must contain only call ID, member and timestamp");
assert.equal(JSON.stringify(normalAttemptEnvelope).includes("normal-session-token"),false,
  "call-attempt persistence must never contain a session token");
const normalAttemptReload=makeCallCleanupContext({transport:null,storage:normalAttemptStorage});
assert.equal(normalAttemptReload.__candidateRestorePendingCallAttempts(),1,
  "the same member must restore a pending call attempt after reload");
const normalAttemptOtherMember=makeCallCleanupContext({transport:null,storage:normalAttemptStorage,member:"Other Member"});
assert.equal(normalAttemptOtherMember.__candidateRestorePendingCallAttempts(),0,
  "call-attempt recovery must remain scoped to the authenticated member");

// Realtime reconnect must not interpret the current live call as an abandoned attempt.
let activeCallCancelCount=0;
const activeCallAttemptContext=makeCallCleanupContext({
  transport:{cancelCallRoom:async()=>{activeCallCancelCount++;return {ok:true,cancelled:true};}}
});
activeCallAttemptContext.signalPendingCallAttempts["normal-call-1"]={
  callId:"normal-call-1",member:"Normal Tester",createdAt:Date.now(),roomId:"normal-call-room",transport:null,promise:null
};
assert.equal(await activeCallAttemptContext.__candidateRetryPendingCallAttempts(),true,
  "reconnect retry must skip the call that is still active in this page");
assert.equal(activeCallCancelCount,0,"active calls must not be cancelled by Realtime reconnect");
activeCallAttemptContext.upCall.active=false;
activeCallAttemptContext.upCall.callId="";
assert.equal(await activeCallAttemptContext.__candidateRetryPendingCallAttempts(),true,
  "the pending call ID must be cancelled after the call is no longer active");
assert.equal(activeCallCancelCount,1,"the abandoned call must be cancelled exactly once after cleanup");

const failingAttemptStorage={has:()=>false,get:()=>null,set:()=>{throw new Error("userscript storage unavailable");}};
const normalAttemptStorageFailure=makeCallCleanupContext({transport:null,storage:failingAttemptStorage});
assert.equal(normalAttemptStorageFailure.__candidateTrackPendingCallAttempt("Normal_Tester-call-storage-failure"),false,
  "Normal must not start a call when its durable recovery handle cannot be stored");
assert.equal(Object.keys(normalAttemptStorageFailure.signalPendingCallAttempts).length,0,
  "failed call-attempt persistence must not leave a false in-memory durable handle");

const normalOutgoingStartStart=userTemplate.indexOf("async function startOutgoingCallWithTransport(target){");
const normalOutgoingStartEnd=userTemplate.indexOf("\n  function callNewId()",normalOutgoingStartStart);
assert.ok(normalOutgoingStartStart>=0&&normalOutgoingStartEnd>normalOutgoingStartStart,"Normal outgoing-call start source boundaries not found");
const normalOutgoingStartSource=userTemplate.slice(normalOutgoingStartStart,normalOutgoingStartEnd)+"\nthis.__candidateStartOutgoingCall=startOutgoingCallWithTransport;";
const outgoingStartMessages=[];
let outgoingPrepareCalls=0;
const outgoingStartContext={
  member:"Normal Tester",upCall:{active:false},
  callNewId:()=>"Normal Tester-call-storage-failure",
  signalSafeCallId:value=>value,
  signalTrackPendingCallAttempt:()=>false,
  message:value=>outgoingStartMessages.push(String(value)),
  signalTransport:{prepareCallRoom:async()=>{outgoingPrepareCalls++;return {roomId:"must-not-exist"};}},
  Promise,Object,Error
};
vm.runInNewContext(normalOutgoingStartSource,outgoingStartContext,{timeout:1000});
await outgoingStartContext.__candidateStartOutgoingCall("Peer");
assert.equal(outgoingPrepareCalls,0,"call preparation must not reach the server when durable storage fails");
assert.ok(outgoingStartMessages.some(value=>value.includes("armazenamento do userscript")),
  "storage failure must explain why call creation was blocked");

// pagehide before prepareCallRoom returns has no room ID, so cancellation must use the persisted logical call ID.
let normalUnknownRoomCancels=0;
const normalUnknownRoomContext=makeCallCleanupContext({
  transport:{cancelCallRoom:async callId=>{normalUnknownRoomCancels++;assert.equal(callId,"Normal_Tester-preparing-1");return {ok:true,cancelled:true};}},
  storage:new Map()
});
normalUnknownRoomContext.upCall.callId="Normal_Tester-preparing-1";
normalUnknownRoomContext.signalRoomByCallId=Object.create(null);
normalUnknownRoomContext.signalCallIdByRoom=Object.create(null);
normalUnknownRoomContext.signalCreatorCallIds[normalUnknownRoomContext.upCall.callId]=true;
normalUnknownRoomContext.signalPendingCallAttempts[normalUnknownRoomContext.upCall.callId]={
  callId:normalUnknownRoomContext.upCall.callId,member:"Normal Tester",createdAt:Date.now(),roomId:"",transport:null,promise:null
};
assert.equal(await normalUnknownRoomContext.__candidateCallCleanup(false,"pagehide"),true,
  "Normal pagehide must cancel a call by logical ID even before a room ID is known");
assert.equal(normalUnknownRoomCancels,1,"Normal unknown-room pagehide must issue one server-side call cancellation");
assert.equal(Object.keys(normalUnknownRoomContext.signalPendingCallAttempts).length,0,
  "confirmed logical-ID cancellation must clear the pending attempt");

let normalUnknownRoomRetries=0;
const normalOfflineAttemptContext=makeCallCleanupContext({transport:null,storage:new Map()});
normalOfflineAttemptContext.upCall.callId="Normal_Tester-preparing-offline";
normalOfflineAttemptContext.signalRoomByCallId=Object.create(null);
normalOfflineAttemptContext.signalCallIdByRoom=Object.create(null);
normalOfflineAttemptContext.signalCreatorCallIds[normalOfflineAttemptContext.upCall.callId]=true;
normalOfflineAttemptContext.signalPendingCallAttempts[normalOfflineAttemptContext.upCall.callId]={
  callId:normalOfflineAttemptContext.upCall.callId,member:"Normal Tester",createdAt:Date.now(),roomId:"",transport:null,promise:null
};
assert.equal(await normalOfflineAttemptContext.__candidateCallCleanup(false,"pagehide"),false,
  "offline pagehide before room creation must retain the call-ID retry handle");
normalOfflineAttemptContext.signalTransport={cancelCallRoom:async callId=>{normalUnknownRoomRetries++;assert.equal(callId,"Normal_Tester-preparing-offline");return {ok:true,cancelled:true};}};
assert.equal(await normalOfflineAttemptContext.__candidateRetryPendingCallAttempts(),true,
  "the same member must cancel a pending call by logical ID after transport recovery");
assert.equal(normalUnknownRoomRetries,1,"call-ID recovery must retry exactly once after transport recreation");
assert.equal(Object.keys(normalOfflineAttemptContext.signalPendingCallAttempts).length,0,
  "confirmed retry must clear the durable call-attempt handle");
console.log("Normal pre-prepare call-ID persistence, storage-failure gate, active-call reconnect guard and unknown-room recovery tests passed.");

const normalRecipientLeaveStorage = new Map();
const normalRecipientLeaveContext = makeCallCleanupContext({ transport: null, storage: normalRecipientLeaveStorage });
const normalRecipientRoomId = "normal-recipient-room";
const normalRecipientCallId = "Normal_Tester-recipient-call";
assert.equal(normalRecipientLeaveContext.__candidateTrackPendingCallLeave(normalRecipientRoomId,normalRecipientCallId,null),true,
  "Normal must persist a recipient room-ID leave handle before accepting an authenticated call");
const normalRecipientLeaveEnvelope = normalRecipientLeaveStorage.get(normalRecipientLeaveContext.__candidateStorageKey("Normal Tester"));
assert.equal(normalRecipientLeaveEnvelope.version,1,"Normal recipient leave storage must be versioned");
assert.equal(normalRecipientLeaveEnvelope.entries.length,1,"Normal recipient leave storage must contain the pending room");
assert.deepEqual(Object.keys(normalRecipientLeaveEnvelope.entries[0]).sort(),["callId","createdAt","member","roomId"],
  "Normal recipient leave storage may contain only room ID, call ID, member and timestamp");
assert.equal(Object.prototype.hasOwnProperty.call(normalRecipientLeaveEnvelope.entries[0],"token"),false,
  "Normal recipient leave storage must not persist a session token");
const normalRecipientLeaveStorageFailure = makeCallCleanupContext({
  transport:null,
  storage:{has:()=>false,get:()=>null,set:()=>{throw new Error("userscript storage unavailable");}}
});
assert.equal(normalRecipientLeaveStorageFailure.__candidateTrackPendingCallLeave(normalRecipientRoomId,normalRecipientCallId,null),false,
  "Normal must fail closed when recipient leave storage is unavailable");
assert.equal(Object.keys(normalRecipientLeaveStorageFailure.signalPendingCallLeaves).length,0,
  "failed Normal recipient leave persistence must not create a false durable handle");
const normalAcceptEvents=[];
const normalAcceptSource=normalAcceptGroupSource+"\nthis.__candidateAcceptGroupInvite=callAcceptGroupInvite;";
const normalAcceptContext={
  upCall:{pendingInvite:{from:"Caller",participants:["Caller"]},active:true,callId:normalRecipientCallId},
  signalRoomByCallId:{[normalRecipientCallId]:normalRecipientRoomId},
  signalTransportFlag:true,
  signalTransport:{accept:async()=>{normalAcceptEvents.push("accept");}},
  signalTrackPendingCallLeave:()=>{normalAcceptEvents.push("persist");return false;},
  message:value=>normalAcceptEvents.push("message:"+value),
  callCleanup:()=>normalAcceptEvents.push("cleanup"),
  Promise,Object,Error
};
vm.runInNewContext(normalAcceptSource,normalAcceptContext,{timeout:1000});
await normalAcceptContext.__candidateAcceptGroupInvite();
assert.deepEqual(normalAcceptEvents.filter(x=>x==="persist"||x==="accept"||x==="cleanup"),["persist"],
  "Normal must not accept into an active membership when pre-accept persistence fails");
assert.ok(normalAcceptEvents.some(x=>x.includes("armazenamento do userscript")),
  "Normal must explain that recipient call acceptance was blocked by storage failure");
console.log("Normal recipient call acceptance now fails closed without durable leave storage.");
