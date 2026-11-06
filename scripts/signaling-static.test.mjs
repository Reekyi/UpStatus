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
assert.ok(functionSource.includes('path.endsWith("/room/bind")'),
  "endpoint must expose authorized logical room binding");
assert.ok(functionSource.includes('path.endsWith("/room/resolve")'),
  "endpoint must resolve bindings only for accepted room members");
assert.ok(functionSource.includes('from("upstatus_signal_room_bindings").delete().eq("room_id", roomId)'),
  "closing a room must remove its logical bindings");
assert.ok(authenticatedHarness.includes("closed room binding is removed and cannot be resolved"),
  "authenticated harness must cover binding cleanup on room close");
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
  userTemplate.includes("signalTransport.leave(signalRoomId)"),
  "opt-in one-to-one call setup, invitation polling, fanout, and room cleanup must be connected");
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
  userTemplate.includes("signalTransport.leave(signalRoomId)") &&
  userTemplate.includes("signalTransport.leave(failedRoom)"),
  "voice and call teardown paths must release authenticated room membership without using a replacement transport after reconnect");
const normalStartCallStart=userTemplate.indexOf("async function startOutgoingCall(target){");
const normalStartCallEnd=userTemplate.indexOf("async function callAcceptIncomingOffer",normalStartCallStart);
const normalStartCallSource=userTemplate.slice(normalStartCallStart,normalStartCallEnd);
assert.ok(normalStartCallStart>=0&&normalStartCallEnd>normalStartCallStart&&normalStartCallSource.indexOf("await waitForRealtimeReady(10000)")>=0&&normalStartCallSource.indexOf("await waitForRealtimeReady(10000)")<normalStartCallSource.indexOf("upCall.callId=callNewId()"),"Normal legacy outgoing calls must wait for Realtime before allocating a call");
assert.ok(userTemplate.includes("async function callRequestToJoin(callId,target)")&&userTemplate.includes("await waitForRealtimeReady(10000)"),"Normal legacy group-call join requests must wait for Realtime after reconnect");
assert.ok(userTemplate.includes("voiceRoomLeave({skipServerLeave:true})") &&
  userTemplate.includes("screenShareStop(!skipServerLeave)") &&
  userTemplate.includes("signalVoiceRoomPrepared=false") &&
  userTemplate.includes("async function waitForRealtimeReady(") &&
  userTemplate.includes("await waitForRealtimeReady(10000)"),
  "Normal offline recovery must tear down locally without network leave and wait for Realtime readiness before legacy voice rejoin");
assert.ok(userTemplate.includes("var leavingTransport=signalTransport") &&
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
const voiceLeaveSource = userTemplate.slice(voiceLeaveStart, voiceLeaveEnd) + "\nthis.__candidateVoiceRoomLeave=voiceRoomLeave;";
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

const offlineLeave = makeVoiceLeaveContext();
await offlineLeave.context.__candidateVoiceRoomLeave({ skipServerLeave: true });
assert.ok(offlineLeave.events.includes("screen-stop:false"), "offline teardown must stop screen capture without sending a signal");
assert.equal(offlineLeave.events.some(event => event.startsWith("network-")), false, "offline teardown must not call signaling or membership RPCs");
assert.equal(offlineLeave.context.signalVoiceRoomRoomId, "", "offline teardown must clear stale local room context");
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

console.log("16/16 signaling static regression groups passed.");
