#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateProductionCutover, hasAuthEnrollmentTestInvocation, inspectAuthenticatedMediaSignaling, isStableReleaseVersion, parseDeployedFunctions, REQUIRED_PRODUCTION_MIGRATIONS, REQUIRED_SIGNALING_FUNCTION } from "./verify-production-cutover.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const secureMediaSource = [
  "var signalTransportFlag=true;",
  "var signalTransportEndpoint=server.replace(/\\/functions\\/v1\\/[^/]+$/,'/functions/v1/upstatus-signal');",
  "export function isAllowedPublicCallDiscoverySignal(signal){\n  return !!signal&&typeof signal==='object'&&!Array.isArray(signal)&&Object.prototype.hasOwnProperty.call(signal,'type')&&Object.prototype.hasOwnProperty.call(signal,'discoveryOnly')&&(signal.type==='presence'||signal.type==='ended')&&signal.discoveryOnly===true;\n}",
  "function callSendTo(){if(signalTransportFlag)return signalTransport.sendSignal({});}",
  "function callSendAll(){if(signalTransportFlag)return signalTransport.sendToRoom({});}",
  "function voiceRoomSend(){if(signalTransportFlag){signalTransport.sendSignal({});return signalTransport.sendToRoom({});}}",
  "function screenShareSend(){if(signalTransportFlag){signalTransport.sendSignal({});return signalTransport.sendToRoom({});}}",
  "async function receiveCallSignal(p,authenticatedSource){if(signalTransportFlag&&!authenticatedSource&&!isAllowedPublicCallDiscoverySignal(p))return;if(p.type==='presence'){callReceivePresence(p);return;}if(p.type==='ended'){delete upCallDirectory[p.callId];return;}}",
  "async function signalStartCallPolling(){await receiveCallSignal(p,true);}",
  "async function signalPollInvitations(){await receiveCallSignal({type:'invite',callId:'c',from:'admin',to:'member'},true);}",
  "function callPublishPresence(){sendRealtimeEvent('call_signal',{type:'presence',discoveryOnly:true});}",
  "function callPublishEnded(){sendRealtimeEvent('call_signal',{type:'ended',discoveryOnly:true});}",
  "function publicCallSignalListener(){realtimeChannel.on('broadcast',{event:'call_signal'},function(payload){receiveCallSignal(payload&&payload.payload||{},false);});}",
  "realtimeChannel.on('broadcast',{event:VOICE_ROOM_EVENT},function(payload){if(!signalTransportFlag)voiceRoomReceive(payload&&payload.payload||{});});",
  "realtimeChannel.on('broadcast',{event:SCREEN_ROOM_EVENT},function(payload){if(!signalTransportFlag)screenShareReceive(payload&&payload.payload||{});});",
  "signalTransport.startPolling(roomId,handler);",
].join("\n");
function evaluateWithNextVersion(options) {
  return evaluateProductionCutover({
    releaseVersion: "3.4.8",
    releasePreRelease: "",
    userscriptSource: secureMediaSource,
    ...options,
  });
}


const apiFunction = "upstatus-screen-share-3-1-1-beta10";
const distributionFunction = "upstatus";
const signalFunction = REQUIRED_SIGNALING_FUNCTION;
const availableProductionSources = [distributionFunction, apiFunction, signalFunction];
const signalDeploy = '          supabase functions deploy ' + signalFunction + ' --project-ref "$SUPABASE_PROJECT_ID" --use-api';
const apiDeploy = "          supabase functions deploy " + apiFunction + ' --project-ref "$SUPABASE_PROJECT_ID" --use-api';
const distributionDeploy = '          supabase functions deploy upstatus --project-ref "$SUPABASE_PROJECT_ID" --use-api';
const workflow = [
  "      - name: Deploy authenticated signaling, production API, then userscript distribution",
  "        run: |",
  signalDeploy,
  apiDeploy,
  distributionDeploy,
].join("\n");
const manifest = {
  productionFunction: distributionFunction,
  productionApiFunction: apiFunction,
  productionApiBase: "https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/" + apiFunction,
};
const secureServerSource = [
  "async function account(name:string){return {role:'implementation_admin'};}",
  "async function admin(name:string|null){",
  "if(!name)return false;",
  "const a=await account(name);",
  'return a?.role==="implementation_admin";',
  "}",
  "async function issueSetupInvite(req:Request,adminName:string){",
  "if(!await admin(adminName))return response({},403);",
  'randomBytes(32).toString("hex")',
  "setup_token_hash:tokenHash(raw)",
  "consume_upstatus_setup_invite",
  "p_setup_token_hash:tokenHash(setupToken)",
  'const enrolledRole=String(enrolled.role||"");',
  'const sessionRole=enrolledRole.trim()?enrolledRole:"implementation_user";',
  'if(path==="/api/chat/clear"&&req.method==="POST"){',
  'if(name!=="Ricardo"||!(await admin(name)))return response({},403);',
  "async function deleteRoute(name:string,id:string){",
  "const {data}=await db.from('messages').select('id,user_name').eq('id',id).maybeSingle();",
  "if(!data)return response({},404);",
  "const isAdmin=await admin(name);",
  "if(data.user_name!==name&&!isAdmin)return response({},403);",
  "}",
].join("\\n");

assert.deepEqual(parseDeployedFunctions(workflow), [signalFunction, apiFunction, distributionFunction]);

const validateInvocation = 'execFileSync(process.execPath,[path.join(ROOT,"scripts/auth-enrollment.test.mjs"),"normal"],{stdio:"inherit"});';
const validateInvocationSplit = 'execFileSync(process.execPath,[path.join(ROOT,"scripts","auth-enrollment.test.mjs"),"normal"],{stdio:"inherit"});';
assert.equal(hasAuthEnrollmentTestInvocation(validateInvocation), true, "the normal enrollment test must be invoked by Validate");
assert.equal(hasAuthEnrollmentTestInvocation(validateInvocationSplit), true, "split path.join arguments must also be recognized");
assert.equal(hasAuthEnrollmentTestInvocation("// " + validateInvocation), false, "a comment mentioning the test must not satisfy the release gate");
assert.equal(hasAuthEnrollmentTestInvocation("const marker = 1; // " + validateInvocation), false, "an inline comment mentioning the test must not satisfy the release gate");
assert.equal(hasAuthEnrollmentTestInvocation(validateInvocation.replace('"normal"', '"team-lite"')), false, "Team Lite-only execution must not satisfy the Normal release gate");

const actualServerSource = fs.readFileSync(path.join(ROOT, "src/server/index.template.ts"), "utf8");
const actualUserscriptSource = fs.readFileSync(path.join(ROOT, "src/userscript/upstatus.user.template.js"), "utf8");
const actualSignalingAdapterPath = path.join(ROOT, "src/userscript/signaling-transport.mjs");
const actualSignalingAdapterSource = fs.existsSync(actualSignalingAdapterPath) ? fs.readFileSync(actualSignalingAdapterPath, "utf8") : "";
const actualSourceResult = evaluateWithNextVersion({
  manifest,
  workflow,
  availableSources: availableProductionSources,
  serverSource: actualServerSource,
  userscriptSource: actualUserscriptSource + "\n" + actualSignalingAdapterSource,
  availableMigrations: REQUIRED_PRODUCTION_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(actualSourceResult.ready, false, "the current Normal release source must remain blocked until authenticated media signaling is mandatory");
assert(actualSourceResult.issues.some(issue => issue.includes("RT-01 is not release-ready")), "the current Normal source must be blocked by the public media signaling gate");
assert(!actualSourceResult.issues.some(issue => issue.includes("Administrative authorization must derive only from the persisted")), "the current production candidate admin helper must be backed by the stored role");
assert(!actualSourceResult.issues.some(issue => issue.includes("Message deletion must allow the owner")), "the current production candidate deleteRoute must use stored-role admin authorization");
assert(!actualSourceResult.issues.some(issue => issue.includes("Chat clear must require Ricardo")), "the current production candidate chat clear must use stored-role authorization");

const aligned = evaluateWithNextVersion({
  manifest,
  workflow,
  availableSources: availableProductionSources,
  serverSource: secureServerSource,
  availableMigrations: REQUIRED_PRODUCTION_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(aligned.ready, true);
assert.deepEqual(aligned.issues, []);

assert.equal(isStableReleaseVersion("3.4.8", ""), true, "a stable patch version above the deployed version may proceed");
assert.equal(isStableReleaseVersion("3.5.0", ""), true, "a stable minor version above the deployed version may proceed");
assert.equal(isStableReleaseVersion("3.4.7", ""), false, "the currently deployed userscript version must not be reused");
assert.equal(isStableReleaseVersion("3.4.8", "rc.1"), false, "prereleases must remain blocked");
assert.equal(isStableReleaseVersion("3.4", ""), false, "incomplete semantic versions must remain blocked");
const sameVersion = evaluateProductionCutover({
  manifest,
  workflow,
  availableSources: availableProductionSources,
  serverSource: secureServerSource,
  availableMigrations: REQUIRED_PRODUCTION_MIGRATIONS,
  authEnrollmentTestPresent: true,
  releaseVersion: "3.4.7",
  releasePreRelease: "",
});
assert.equal(sameVersion.ready, false, "release guard must block republishing code under the currently deployed userscript version");
assert(sameVersion.issues.some(issue => issue.includes("greater than deployed 3.4.7")));


const apiNotDeployed = evaluateWithNextVersion({
  manifest,
  workflow: workflow.replace(apiDeploy, "# API deployment omitted"),
  availableSources: availableProductionSources,
  serverSource: secureServerSource,
  availableMigrations: REQUIRED_PRODUCTION_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(apiNotDeployed.ready, false);
assert(apiNotDeployed.issues.some(issue => issue.includes('runtime "' + apiFunction + '" is not deployed')));

const apiSourceMissing = evaluateWithNextVersion({
  manifest,
  workflow,
  availableSources: [distributionFunction, signalFunction],
  serverSource: secureServerSource,
  availableMigrations: REQUIRED_PRODUCTION_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(apiSourceMissing.ready, false);
assert(apiSourceMissing.issues.some(issue => issue.includes("source \"supabase/functions/" + apiFunction + "/index.ts\" is not versioned/generated")));

const reversed = evaluateWithNextVersion({
  manifest,
  workflow: workflow.replace(apiDeploy + "\n" + distributionDeploy, distributionDeploy + "\n" + apiDeploy),
  availableSources: availableProductionSources,
  serverSource: secureServerSource,
  availableMigrations: REQUIRED_PRODUCTION_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(reversed.ready, false);
assert(reversed.issues.some(issue => issue.includes("API runtime must be deployed before the userscript distribution")));

const unexpected = evaluateWithNextVersion({
  manifest,
  workflow: workflow.replace(distributionDeploy, distributionDeploy + "\n          supabase functions deploy upstatus-test --project-ref \"$SUPABASE_PROJECT_ID\" --use-api"),
  availableSources: [...availableProductionSources, "upstatus-test"],
  serverSource: secureServerSource,
  availableMigrations: REQUIRED_PRODUCTION_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(unexpected.ready, false);
assert(unexpected.issues.some(issue => issue.includes('Unexpected production runtime "upstatus-test"')));

const noInvite = evaluateWithNextVersion({
  manifest,
  workflow,
  availableSources: availableProductionSources,
  serverSource: 'if(path==="/api/chat/clear"&&req.method==="POST"){if(name!=="Ricardo"||!await admin(name))return response({},403);}',
  availableMigrations: REQUIRED_PRODUCTION_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(noInvite.ready, false);
assert(noInvite.issues.some(issue => issue.includes("AUTH-03 is not release-ready")));

const missingAuthTest = evaluateWithNextVersion({
  manifest,
  workflow,
  availableSources: availableProductionSources,
  serverSource: secureServerSource,
  availableMigrations: REQUIRED_PRODUCTION_MIGRATIONS,
  authEnrollmentTestPresent: false,
});
assert.equal(missingAuthTest.ready, false);
assert(missingAuthTest.issues.some(issue => issue.includes("AUTH-03 regression test is missing")));

const missingMigration = evaluateWithNextVersion({
  manifest,
  workflow,
  availableSources: availableProductionSources,
  serverSource: secureServerSource,
  availableMigrations: REQUIRED_PRODUCTION_MIGRATIONS.filter(file => file !== "20261107060000_normalize_setup_invite_role.sql"),
  authEnrollmentTestPresent: true,
});
assert.equal(missingMigration.ready, false);
assert(missingMigration.issues.some(issue => issue.includes("Required production security/signaling migration source is missing")));

const missingSignalRateLimitMigration = evaluateWithNextVersion({
  manifest,
  workflow,
  availableSources: availableProductionSources,
  serverSource: secureServerSource,
  availableMigrations: REQUIRED_PRODUCTION_MIGRATIONS.filter(file => file !== "20261108190000_distributed_signaling_rate_limit.sql"),
  authEnrollmentTestPresent: true,
});
assert.equal(missingSignalRateLimitMigration.ready, false);
assert(missingSignalRateLimitMigration.issues.some(issue => issue.includes("Required production security/signaling migration source is missing: supabase/migrations/20261108190000_distributed_signaling_rate_limit.sql")));


const nameFallback = evaluateWithNextVersion({
  manifest,
  workflow,
  availableSources: availableProductionSources,
  serverSource: secureServerSource + '\nconst role=["Ricardo","Lohan","Guilherme"].includes(name)?"implementation_admin":"implementation_user";',
  availableMigrations: REQUIRED_PRODUCTION_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(nameFallback.ready, false);
assert(nameFallback.issues.some(issue => issue.includes("must not grant implementation_admin by hard-coded account name")));

const nameOnlyChatClear = evaluateWithNextVersion({
  manifest,
  workflow,
  availableSources: availableProductionSources,
  serverSource: secureServerSource.replace('if(name!=="Ricardo"||!(await admin(name)))', 'if(name!=="Ricardo")'),
  availableMigrations: REQUIRED_PRODUCTION_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(nameOnlyChatClear.ready, false);
assert(nameOnlyChatClear.issues.some(issue => issue.includes("Chat clear must require Ricardo")));

const nameOnlyMessageDelete = evaluateWithNextVersion({
  manifest,
  workflow,
  availableSources: availableProductionSources,
  serverSource: secureServerSource.replace("const isAdmin=await admin(name);", 'const isAdmin=name==="Ricardo";'),
  availableMigrations: REQUIRED_PRODUCTION_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(nameOnlyMessageDelete.ready, false);
assert(nameOnlyMessageDelete.issues.some(issue => issue.includes("Message deletion must allow the owner")));

const nameFallbackAdmin = evaluateWithNextVersion({
  manifest,
  workflow,
  availableSources: availableProductionSources,
  serverSource: secureServerSource.replace('return a?.role==="implementation_admin";', 'return name==="Ricardo";'),
  availableMigrations: REQUIRED_PRODUCTION_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(nameFallbackAdmin.ready, false);
assert(nameFallbackAdmin.issues.some(issue => issue.includes("Administrative authorization must derive only from the persisted")));

const unsafeWorkflow = evaluateWithNextVersion({
  manifest,
  workflow: workflow + "\nsupabase db push",
  availableSources: availableProductionSources,
  serverSource: secureServerSource,
  availableMigrations: REQUIRED_PRODUCTION_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(unsafeWorkflow.ready, false);
assert(unsafeWorkflow.issues.some(issue => issue.includes("must not apply database migrations automatically")));

const wrongTarget = evaluateWithNextVersion({
  manifest: {
    ...manifest,
    productionApiBase: "https://bfpjtfqlnypisxljoxkb.supabase.co/functions/v1/" + apiFunction,
  },
  workflow,
  availableSources: availableProductionSources,
  serverSource: secureServerSource,
  availableMigrations: REQUIRED_PRODUCTION_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(wrongTarget.ready, false);
assert(wrongTarget.issues.some(issue => issue.includes("approved production API function")));

const missingManifestField = evaluateWithNextVersion({
  manifest: { productionFunction: distributionFunction },
  workflow,
  availableSources: [distributionFunction, signalFunction],
  serverSource: secureServerSource,
  availableMigrations: REQUIRED_PRODUCTION_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(missingManifestField.ready, false);
assert(missingManifestField.issues.some(issue => issue.includes("productionApiFunction is missing or invalid")));

const missingSignalDeploy = evaluateWithNextVersion({
  manifest,
  workflow: workflow.replace(signalDeploy, "# signaling deployment omitted"),
  availableSources: availableProductionSources,
  serverSource: secureServerSource,
  availableMigrations: REQUIRED_PRODUCTION_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(missingSignalDeploy.ready, false);
assert(missingSignalDeploy.issues.some(issue => issue.includes('runtime "' + signalFunction + '" is not deployed')));

const missingSignalSource = evaluateWithNextVersion({
  manifest,
  workflow,
  availableSources: [distributionFunction, apiFunction],
  serverSource: secureServerSource,
  availableMigrations: REQUIRED_PRODUCTION_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(missingSignalSource.ready, false);
assert(missingSignalSource.issues.some(issue => issue.includes('source "supabase/functions/' + signalFunction + '/index.ts" is not versioned/generated')));

const signalAfterApi = evaluateWithNextVersion({
  manifest,
  workflow: workflow.replace(signalDeploy + "\n" + apiDeploy, apiDeploy + "\n" + signalDeploy),
  availableSources: availableProductionSources,
  serverSource: secureServerSource,
  availableMigrations: REQUIRED_PRODUCTION_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(signalAfterApi.ready, false);
assert(signalAfterApi.issues.some(issue => issue.includes("Authenticated signaling runtime must be deployed before the product API runtime")));

assert.equal(inspectAuthenticatedMediaSignaling(secureMediaSource).ready, true);
const optInMedia = secureMediaSource.replace("var signalTransportFlag=true;", "var signalTransportFlag=GM_getValue(key+'signaling_transport_enabled',false)===true;");
assert.equal(inspectAuthenticatedMediaSignaling(optInMedia).ready, false, "user-controlled opt-in must not satisfy RT-01");
const publicVoiceMedia = secureMediaSource.replace("if(!signalTransportFlag)voiceRoomReceive(", "voiceRoomReceive(");
assert.equal(inspectAuthenticatedMediaSignaling(publicVoiceMedia).ready, false, "public voice payloads must remain rejected");
const publicScreenMedia = secureMediaSource.replace("if(!signalTransportFlag)screenShareReceive(", "screenShareReceive(");
assert.equal(inspectAuthenticatedMediaSignaling(publicScreenMedia).ready, false, "public screen-share payloads must remain rejected");
const payloadControlledProvenance = secureMediaSource.replace("signalTransportFlag&&!authenticatedSource", "signalTransportFlag&&!p._authenticatedTransport");
assert.equal(inspectAuthenticatedMediaSignaling(payloadControlledProvenance).ready, false, "payload-controlled provenance must never satisfy authenticated signaling");
const joinDeclinedDiscovery = secureMediaSource.replace("signal.type==='presence'||signal.type==='ended'", "signal.type==='presence'||signal.type==='ended'||signal.type==='join_declined'");
assert.equal(inspectAuthenticatedMediaSignaling(joinDeclinedDiscovery).ready, false, "join_declined must not be accepted as a public discovery hint");
const publicListenerTrusted = secureMediaSource.replace("receiveCallSignal(payload&&payload.payload||{},false)", "receiveCallSignal(payload&&payload.payload||{},true)");
assert.equal(inspectAuthenticatedMediaSignaling(publicListenerTrusted).ready, false, "public Realtime must always pass untrusted provenance");
const unauthenticatedPoll = secureMediaSource.replace("await receiveCallSignal(p,true);", "await receiveCallSignal(p,false);");
assert.equal(inspectAuthenticatedMediaSignaling(unauthenticatedPoll).ready, false, "authenticated polling must pass trusted provenance out-of-band");
const publicEndedControl = secureMediaSource.replace("delete upCallDirectory[p.callId];return;", "delete upCallDirectory[p.callId];callCleanup();return;");
assert.equal(inspectAuthenticatedMediaSignaling(publicEndedControl).ready, false, "public ended hints must not control an active call");
const unpinnedMedia = secureMediaSource.replace("/functions/v1/upstatus-signal", "/functions/v1/upstatus-signal-test");
assert.equal(inspectAuthenticatedMediaSignaling(unpinnedMedia).ready, false, "the production signaling endpoint must be pinned");
console.log("PASS production cutover guard: authenticated signaling first, API/distribution order, mandatory media transport, AUTH-03, stored-role chat authorization, required production migrations and no automatic db push; missing source/deploy/test, public media fallback, opt-in transport, wrong order, TEST deploy, name-based authorization and invalid project/manifest blocked.");
