#!/usr/bin/env node
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(path, "utf8");
const manifest = JSON.parse(read("team-lite/release.json"));
const script = read("team-lite/upstatus-team-lite.user.js");
const openVoiceMigration = read("supabase/migrations/20261105190000_open_voice_room_membership.sql");
const signalingAdapterSource = read("src/userscript/signaling-transport.mjs").replace(/^export\s+/gm, "");
const luccaSite = read("lucca-site/index.html");
const luccaStandalone = read("lucca.html");
const ycaro = read("ycaro.html");
const backend = read("src/server/team-lite-index.template.ts");
const normalBackend = read("src/server/index.template.ts");
function extractSessionContract(source,start,end){
  const from=source.indexOf(start),to=source.indexOf(end,from);
  assert.ok(from>=0&&to>from,"missing shared session contract block: "+start);
  return source.slice(from,to);
}
// Compare shared auth semantics while checking the five-second cache policy independently below.
function normalizedSessionLookup(source){
  return extractSessionContract(source,"function token(req:Request)","async function account(")
    .replace(/if\(now-cached\.checkedAt<[^)]+\)return cached\.name;/,"if(now-cached.checkedAt<SESSION_CACHE_TTL_MS)return cached.name;");
}
assert.equal(normalizedSessionLookup(backend),normalizedSessionLookup(normalBackend),"normal and Team Lite must share token hashing and session lookup semantics");
assert.ok(backend.includes("const SESSION_CACHE_TTL_MS=5000;")&&backend.includes("now-cached.checkedAt<SESSION_CACHE_TTL_MS"),"Team Lite session revocation cache must remain bounded to five seconds");
assert.equal(extractSessionContract(backend,"async function createSession(","async function login("),extractSessionContract(normalBackend,"async function createSession(","async function login("),"normal and Team Lite must issue compatible shared session tokens");

const build = read("scripts/build.mjs");

function header(name) {
  const match = script.match(new RegExp("^// @" + name + "\\s+([^\\r\\n]+)$", "m"));
  return match ? match[1].trim() : "";
}
function assertInlineScriptsParse(html, file) {
  let count = 0;
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const code = match[1].trim();
    if (!code) continue;
    new vm.Script(code, { filename: file + "#inline-" + (++count) });
  }
  assert.ok(count > 0, file + " must contain at least one inline script");
  return count;
}

assert.equal(manifest.product, "UpStatus Team Lite");
assert.equal(manifest.buildVersion, header("version"), "manifest buildVersion must match userscript @version");
assert.ok(script.includes("var CURRENT_VERSION='" + manifest.buildVersion + "'"), "internal CURRENT_VERSION must match release version");
assert.equal(header("updateURL"), manifest.scriptUrl, "@updateURL must match manifest scriptUrl");
assert.equal(header("downloadURL"), manifest.scriptUrl, "@downloadURL must match manifest scriptUrl");
assert.ok(script.includes("var UPDATE_URL='" + manifest.scriptUrl + "'"), "internal UPDATE_URL must match manifest scriptUrl");
new vm.Script(script, { filename: "team-lite/upstatus-team-lite.user.js" });
assert.ok(script.includes("if(served!==remote)throw new Error"), "manifest/script version mismatch must block updates");
assert.ok(script.includes("if(cmp>0){setUpdateAvailable(true,served)"), "only a newer remote version may show the update prompt");
assert.ok(script.includes("try{checkUpdate();}catch(_){}"), "updater must be invoked");
assert.ok(luccaSite.includes("/api/lucca/login"), "Lucca portal must use the Lucca login route");
assert.ok(luccaStandalone.includes("/api/lucca/login"), "standalone Lucca page must use the Lucca login route");
assert.ok(ycaro.includes("/api/ycaro/login"), "Ycaro portal must use its separate login route");
assert.ok(ycaro.includes("/api/ycaro/heartbeat") && ycaro.includes("/api/ycaro/logout"), "Ycaro portal must use separate session lifecycle routes");
assert.ok(!/(?:password|senha)\s*[:=]\s*['"][^'"]{8,}['"]/i.test(ycaro), "Ycaro page must not contain an obvious hardcoded password literal");

assert.ok(backend.includes('const VERSION = "__UPSTATUS_VERSION__";'), "Team Lite backend version placeholder missing");
assert.ok(backend.includes('const USERSCRIPT_BASE64 = "__UPSTATUS_USERSCRIPT_BASE64__";'), "Team Lite embedded userscript placeholder missing");
assert.ok(backend.includes("async function chatRows(name:string,since?:string,guestJoinedAt=0)"), "guest chat history must be scoped to session start");
assert.ok(backend.includes('query=query.gte("created_at",new Date(Math.max(guestJoinedAt,Date.parse(cutoff))).toISOString())'), "guest chat history cutoff missing");
assert.ok(backend.includes("return await readRoute(req,name,ctx?.guest?ctx.joinedAt:0)"), "guest read route must receive session start");
assert.ok(backend.includes('db.rpc("merge_chat_read_receipts"') && backend.includes("p_messages:map"), "chat receipts must merge atomically in Postgres");
assert.ok(!backend.includes('db.from("chat_reads").upsert('), "chat reads must not use isolate-local read-modify-upsert");
assert.ok(backend.includes("const readAt=Math.max(previousReadAt,latestReadAt);"), "read cursor must stop at the newest message actually marked read");
assert.ok(backend.includes("async function readRoute(req:Request,name:string,guestJoinedAt=0)") && backend.includes("Date.parse(String(x.created_at))>=guestJoinedAt"), "guest read receipts must respect the current session start");
assert.ok(backend.includes('return a?.role==="implementation_admin"'), "admin access must use stored role");
assert.ok(!backend.includes('const isAdmin=name==="Ricardo"||await admin(name);'), "backend must not grant admin by name alone");
assert.ok(backend.includes('const role=a.role||"implementation_user";'), "initial account setup must not grant admin privileges by matching a name");
assert.ok(!backend.includes('const role=a.role||(["Ricardo","Lohan","Guilherme"].includes(name)? "implementation_admin"'), "legacy name-based admin setup must not return");
assert.ok(backend.includes('if(!(await admin(name)))return response({error:"Seu perfil não possui acesso à saúde do sistema."},403);'), "health endpoint must authorize by stored admin role");
assert.ok(!backend.includes('if(!["Ricardo","Lohan","Guilherme"].includes(name))return response({error:"Seu perfil não possui acesso à saúde do sistema."},403);'), "health endpoint must not authorize by name alone");
assert.ok(!backend.includes('db.from("messages").delete().eq("user_name","Lucca")') && !backend.includes('db.from("messages").delete().eq("user_name","Ycaro")'), "guest login must not delete shared chat history");
assert.ok(backend.includes("async function luccaRoute(req:Request)") && backend.includes("async function ycaroRoute(req:Request)"), "Lucca and Ycaro must have separate auth handlers");
assert.ok(script.includes(".on('broadcast',{event:'remote_command'},function(){") && script.includes("scheduleRemoteStatusPoll();"), "Team Lite remote command events must use a coalesced poll scheduler");
assert.ok(script.includes("if(remotePollHintTimer||!isAuthenticated())return;") && script.includes("if(isAuthenticated()&&expectedGeneration===authGeneration&&expectedMember===member)pollRemoteStatus();"), "Team Lite remote command hint timers must coalesce and remain session-bound");
assert.ok(script.includes("sendRealtimeEvent('remote_command',{op:'hint'})"), "Team Lite client remote command broadcasts must contain only a generic hint");
assert.ok(!script.includes("sendRealtimeEvent('remote_result'"), "Team Lite must not broadcast remote result metadata publicly");
assert.ok(script.includes("if(upCall&&upCall.active)callCleanup(true,'hangup');"), "Team Lite logout and idle session end must clean up active call media");
assert.ok(script.includes("teamLiteSessionEnded=true;teamLiteClearIdleTimer();") && script.includes("authenticated=false;authGeneration++;"), "Team Lite session cleanup must run before auth generation invalidation");
assert.ok(!script.includes("if(c&&c.target===member)executeRemoteCommand(c);"), "client must not execute untrusted remote command broadcast payloads");
assert.ok(build.includes('writeFunction("upstatus-team-lite",renderTeamLiteFunction())'), "build must generate the Team Lite Edge Function");
assert.ok(!build.includes("fs.rmSync"), "build must not recursively delete function or dist directories");

assert.ok(script.includes("function scheduleRealtimeChatRefresh()"), "Team Lite public chat broadcasts must use a canonical refresh scheduler");
assert.ok(script.includes("var wait=Math.max(0,1000-(Date.now()-realtimeChatRefreshLastAt));"), "Team Lite public broadcast refreshes must be throttled");
assert.ok(script.includes("function handleRealtimeChatFast(){scheduleRealtimeChatRefresh();}"), "Team Lite must not trust chat_fast payloads as canonical message data");
assert.ok(script.includes("sendRealtimeEvent('chat_fast')")&&!script.includes("sendRealtimeEvent('chat_fast',{message:created})")&&!script.includes("sendRealtimeEvent('chat_fast',{message:r.message})"), "Team Lite chat_fast must publish only an empty refresh hint, never a message row");
assert.ok(script.includes(".on('broadcast',{event:'db_change'},function(){if(isAuthenticated()&&realtimeGeneration===authGeneration&&realtimeMember===member)scheduleRealtimeChatRefresh();})"), "Team Lite database-change broadcasts must not apply supplied rows");
assert.ok(script.includes(".on('broadcast',{event:'chat_fast'},function(){if(isAuthenticated()&&realtimeGeneration===authGeneration&&realtimeMember===member)handleRealtimeChatFast();})"), "Team Lite chat_fast listener must ignore attacker-controlled payloads");
assert.ok(script.includes(".on('broadcast',{event:'chat_read'},function(){if(isAuthenticated()&&realtimeGeneration===authGeneration&&realtimeMember===member)scheduleRealtimeChatRefresh();})"), "Team Lite read receipts must be reconciled from the authenticated API");
assert.ok(script.includes(".on('broadcast',{event:'user_status'},function(){if(isAuthenticated()&&realtimeGeneration===authGeneration&&realtimeMember===member)scheduleRealtimeStatusRefresh();})"), "Team Lite user_status broadcasts must be session-scoped refresh-only hints");
assert.ok(script.includes("var wait=Math.max(0,1000-(Date.now()-realtimeStatusRefreshLastAt));"), "Team Lite public user_status hints must be throttled");
assert.ok(script.includes("if(!isAuthenticated()||expectedGeneration!==authGeneration||expectedMember!==member)return;"), "Team Lite delayed status refresh must not cross auth generations");
assert.ok(!script.includes(".on('broadcast',{event:'db_change'},function(payload){"), "Team Lite must not apply public database-change payload rows");
assert.ok(script.includes("if(!isAuthenticated()||generation!==authGeneration||requestedMember!==member)return;") && script.includes("loadChat(true);"), "Team Lite canonical refresh must be scoped to the active authenticated session");

assert.ok(script.includes("p.type!=='presence'&&p.type!=='ended'&&p.to!==member"), "Team Lite call signaling must be addressed to the current member except public presence/end events");
assert.ok(script.includes("p.callId.length>160") && script.includes("p.from.length>80"), "Team Lite call signaling identifiers must be bounded");
assert.ok(script.includes("p.sdp.sdp.length>100000"), "Team Lite must reject oversized call SDP");
assert.ok(script.includes("JSON.stringify(p.candidate).length>4096"), "Team Lite must reject oversized ICE candidates");
assert.ok(script.includes("(p.type==='offer'||p.type==='answer'||p.type==='ice')&&p.to!==member"), "Team Lite voice and screen-share negotiation must be directly targeted");


assert.equal((script.match(/callSendTo\(p\.from,'busy',\{connectionId:String\(p\.callId\)\+'::busy'\}\);return;/g)||[]).length,2,
  "busy responses for authenticated call offers/invites must use the transport-aware sender");
assert.doesNotMatch(script,/sendRealtimeEvent\('call_signal',\{type:'busy',callId:p\.callId/,
  "busy call-control responses must never bypass the authenticated transport");
assert.ok(script.includes("else callSendTo(requester,'join_declined',{updatedAt:Date.now()});"),
  "authenticated group invitation declines must be delivered through the authenticated transport");
assert.ok(script.includes("p.participants.length>32"), "Team Lite call roster broadcasts must be capped to 32 participants");
assert.ok(script.includes("p.callId.length>160") && script.includes("p.from.length>80"), "Team Lite call roster identifiers must be bounded");
assert.ok(script.includes("list.slice(0,32)") && script.includes("out.length<32"), "Team Lite merged call participants must be bounded and deduplicated");

const inlineCounts = {
  luccaSite: assertInlineScriptsParse(luccaSite, "lucca-site/index.html"),
  luccaStandalone: assertInlineScriptsParse(luccaStandalone, "lucca.html"),
  ycaro: assertInlineScriptsParse(ycaro, "ycaro.html")
};
console.log("Team Lite candidate checks passed:", JSON.stringify({
  version: manifest.buildVersion,
  updaterManifestConsistency: true,
  userscriptSyntax: true,
  guestPortalSyntax: inlineCounts,
  guestSessionIsolationChecks: true,
  separateLuccaYcaroAuthRoutes: true
}));


// Execute the candidate's actual updater logic with mocked network/DOM dependencies.
// This catches behavior regressions that static string checks cannot detect.
const versionStart = script.indexOf("  function versionParts(");
const updaterStart = script.indexOf("  var updatePromptShown", versionStart);
const checkStart = script.indexOf("  function checkUpdate(){", updaterStart);
const versionEnd = script.indexOf("  function mentionNames", checkStart);
assert.ok(versionStart >= 0 && updaterStart > versionStart && checkStart > updaterStart && versionEnd > checkStart, "updater runtime test boundaries not found");
const updaterCode = script.slice(versionStart, versionEnd) + "\nthis.__candidateCheckUpdate = checkUpdate;";
async function runUpdaterScenario({ installed, manifest, servedVersion, fetchFailureAt = 0 }) {
  const calls = { prompts: [], availability: [], fetches: 0, opened: 0 };
  const status = { textContent: "", innerHTML: "" };
  const manual = { disabled: false, title: "", onclick: null };
  const card = { querySelectorAll(selector) { return selector === ".up-update-status" ? [status] : [manual]; } };
  const mockFetch = async function (url) {
    calls.fetches++;
    if (fetchFailureAt === calls.fetches) throw new Error("network unavailable");
    if (calls.fetches === 1) return { ok: true, json: async () => manifest };
    return { ok: true, text: async () => "// ==UserScript==\n// @version      " + servedVersion + "\n// ==/UserScript==" };
  };
  const root = {
    children: [],
    querySelector(selector) { return this.children.find(child => (" " + child.className + " ").includes(" " + selector.slice(1) + " ")) || null; },
    appendChild(child) {
      this.children.push(child);
      child.parentElement = this;
      if (child.className && child.className.split(/\\s+/).includes("up-update-prompt")) calls.prompts.push(child);
    },
  };
  const document = {
    createElement(tag) {
      const handlers = {};
      const classes = new Set();
      return {
        tagName: tag.toUpperCase(), className: "", style: { setProperty() {} },
        children: [], parentElement: null, innerHTML: "",
        classList: {
          add(name) { classes.add(name); },
          remove(name) { classes.delete(name); },
          contains(name) { return classes.has(name); },
        },
        querySelector(selector) {
          if (selector === ".up-update-prompt-later") return { onclick: null };
          if (selector === ".up-update-prompt-now") return { onclick: null };
          return null;
        },
        remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(item => item !== this); },
      };
    }
  };
  const context = {
    CURRENT_VERSION: installed, card, fetch: mockFetch, esc: String,
    root, document,
    node: (tag, attrs) => Object.assign(document.createElement(tag), attrs || {}),
    closePopupAnimated: (element, finish) => finish && finish(),
    setUpdateAvailable: (show, version) => calls.availability.push({ show, version }),
    openUpdate: () => { calls.opened++; }
  };
  vm.runInNewContext(updaterCode, context, { timeout: 1000 });
  context.__candidateCheckUpdate();
  await new Promise(resolve => setTimeout(resolve, 0));
  return { calls, status, manual };
}
const candidateManifest = version => ({ product: "UpStatus Team Lite", buildVersion: version, scriptUrl: manifest.scriptUrl });
const candidateNewer = await runUpdaterScenario({ installed: manifest.buildVersion.replace(/\d+$/, n => String(Number(n) - 1)), manifest: candidateManifest(manifest.buildVersion), servedVersion: manifest.buildVersion });
assert.equal(candidateNewer.calls.prompts.length, 1, "newer matching candidate release must show exactly one prompt");
assert.equal(candidateNewer.calls.prompts.length, 1, "actual modal was created by the extracted prompt implementation");
assert.ok(String(candidateNewer.calls.prompts[0].innerHTML).includes("v" + manifest.buildVersion), "prompt modal must name the newer version");
assert.equal(candidateNewer.manual.disabled, false, "manual update must be enabled for a newer matching release");
candidateNewer.manual.onclick();
assert.equal(candidateNewer.calls.opened, 1, "manual update must open the official update URL");
const candidateCurrent = await runUpdaterScenario({ installed: manifest.buildVersion, manifest: candidateManifest(manifest.buildVersion), servedVersion: manifest.buildVersion });
assert.equal(candidateCurrent.calls.prompts.length, 0, "current version must not show an update prompt");
assert.equal(candidateCurrent.manual.disabled, true, "manual update must be disabled when current");
const candidateMismatch = await runUpdaterScenario({ installed: "3.4.30", manifest: candidateManifest(manifest.buildVersion), servedVersion: "99.0.0" });
assert.equal(candidateMismatch.calls.prompts.length, 0, "manifest/script mismatch must block prompt");
assert.match(String(candidateMismatch.status.textContent), /Versões divergentes/, "mismatch should be visible in updater status");
const candidateDowngrade = await runUpdaterScenario({ installed: "99.0.0", manifest: candidateManifest(manifest.buildVersion), servedVersion: manifest.buildVersion });
assert.equal(candidateDowngrade.calls.prompts.length, 0, "older candidate must not trigger a downgrade prompt");
const candidateManifestOffline = await runUpdaterScenario({ installed: "3.4.30", manifest: candidateManifest(manifest.buildVersion), servedVersion: manifest.buildVersion, fetchFailureAt: 1 });
assert.equal(candidateManifestOffline.calls.prompts.length, 0, "manifest network failure must not show a prompt");
assert.match(String(candidateManifestOffline.status.textContent), /Atualizador bloqueado/, "manifest network failure should be visible");
const candidateScriptOffline = await runUpdaterScenario({ installed: "3.4.30", manifest: candidateManifest(manifest.buildVersion), servedVersion: manifest.buildVersion, fetchFailureAt: 2 });
assert.equal(candidateScriptOffline.calls.prompts.length, 0, "script network failure must not show a prompt");
assert.match(String(candidateScriptOffline.status.textContent), /Atualizador bloqueado/, "script network failure should be visible");
const candidateInvalidManifest = await runUpdaterScenario({ installed: "3.4.30", manifest: { product: "Wrong product", buildVersion: manifest.buildVersion, scriptUrl: manifest.scriptUrl }, servedVersion: manifest.buildVersion });
assert.equal(candidateInvalidManifest.calls.prompts.length, 0, "invalid manifest must not show a prompt");
assert.ok(script.includes(".on('broadcast',{event:'remote_result'},function(){ if(!isAuthenticated()||realtimeGeneration!==authGeneration||realtimeMember!==member)return; /* Public Realtime is an untrusted hint; waitRemoteResult polls the authenticated result endpoint. */ })"), "public remote_result broadcasts must not be treated as authoritative command results");
assert.ok(script.includes("api('GET','/api/remote-status/result?id='+encodeURIComponent(id))"), "remote command completion must continue polling the authenticated result endpoint");
assert.ok(script.includes("payload.sender!==p.name"), "health pong sender must match the member being measured");
assert.ok(script.includes("payload.id.length>160")&&script.includes("payload.sender.length>80"), "health ping identifiers and sender labels must be bounded");
// Security assertions for the opt-in authenticated media transport.
assert.ok(script.includes("function createSignalingTransport("), "Team Lite candidate must bundle the authenticated signaling adapter");
assert.ok(script.includes(signalingAdapterSource), "Team Lite bundled adapter must match the shared tested source module");
assert.ok(script.includes("var signalTransportFlag=GM_getValue(key+'signaling_transport_enabled',false)===true"), "authenticated signaling must remain disabled by default");
assert.ok(script.includes("endpoint.protocol!=='https:'") && script.includes("endpoint.origin!==sessionServer.origin"), "signaling endpoint must be HTTPS and same-origin");
assert.ok(script.includes("eventType:'voice_room_signal'") && script.includes("eventType:'screen_signal'"), "voice and screen media events must use authenticated transport when enabled");
assert.ok(script.includes("signalTransport.startPolling(roomId") && script.includes("from:event.sender"), "authenticated media events must use server-derived sender identity");
assert.ok(script.includes("signalTransport.leave(room)") && script.includes("signalTransport.stopAll()"), "authenticated room membership and pollers must be cleaned up");
assert.ok(script.includes("if(signalTransportFlag){if(!signalTransport){message(") && script.includes("startOutgoingCallWithTransport(target);return;}"), "one-to-one calls must fail closed and use authenticated transport when explicitly enabled");
assert.ok(script.includes("signalTransport.prepareCallRoom(upCall.callId,target"), "outgoing calls must wait for server-authorized room preparation");
assert.ok(script.includes("signalTransport.waitForAcceptance"), "call invites must require explicit recipient acceptance");
assert.ok(script.includes("eventType:'call_signal'") && script.includes("signalTransport.sendSignal"), "call media signaling must use authenticated recipient-scoped events when enabled");
assert.ok(script.includes("discoveryOnly:true"), "public call broadcasts must be limited to non-authoritative discovery hints");
assert.ok(script.includes("signalTransportFlag&&!p._authenticatedTransport"), "public call-control events must be ignored when authenticated transport is enabled");
assert.ok(script.includes("to:member,_authenticatedTransport:true"), "server-issued call invitations must be accepted by the authenticated receive gate");
assert.ok(script.includes("!signalTransportFlag&&isAuthenticated()") && script.includes("voiceRoomReceive(payload&&payload.payload||{})") && script.includes("screenShareReceive(payload&&payload.payload||{})"), "public voice and screen events must be ignored when authenticated transport is enabled");
assert.ok(script.includes("if(!signalTransport||!signalRoomId)return false"), "call send paths must fail closed instead of falling back to public broadcasts");
const voicePrepareStart=script.indexOf("async function signalPrepareVoiceRoom(){");
const voicePrepareEnd=script.indexOf("function signalReleaseVoiceRoom(){",voicePrepareStart);
const voicePrepareSource=script.slice(voicePrepareStart,voicePrepareEnd);
assert.ok(voicePrepareStart>=0&&voicePrepareEnd>voicePrepareStart&&voicePrepareSource.includes("signalTransport.openVoiceRoom(voiceRoom.id)")&&!voicePrepareSource.includes("invitations")&&!voicePrepareSource.includes("accept(")&&!voicePrepareSource.includes("createRoom(")&&!voicePrepareSource.includes("bindRoom("),
  "Team Lite voice room must use open authenticated membership, not invitation/acceptance");
assert.ok(script.includes("function signalReleaseVoiceRoom()")&&script.includes("await signalReleaseVoiceRoom()")&&script.includes("signalTransport.leave(room)"),
  "Team Lite must release a pending or failed open voice membership and stop its poller");
assert.ok(openVoiceMigration.includes("pg_advisory_xact_lock")&&openVoiceMigration.includes("FOR UPDATE")&&openVoiceMigration.includes("ROOM_FULL")&&openVoiceMigration.includes("SECURITY INVOKER")&&openVoiceMigration.includes("SET search_path = ''")&&openVoiceMigration.includes("GRANT EXECUTE ON FUNCTION public.open_upstatus_signal_voice_room"),
  "Team Lite open voice migration must be atomic, bounded, and service-role-only");
assert.ok(script.includes("if(!signalTransport||!signalVoiceRoomRoomId){voiceRoomMessage") && script.includes("if(!signalTransport||!signalVoiceRoomRoomId){screenShareMessage"), "voice and screen send paths must fail closed when authenticated room binding is missing");
assert.ok(script.includes("return sendRealtimeEvent('call_signal',p)"), "legacy fallback must remain available only while the opt-in transport is disabled");
assert.ok(script.includes("signalTransport.requestInvite(callId).then(function(){"), "authenticated group join requests must use the server invitation route");
assert.ok(script.includes("signalTransport.invite(signalRoomId,to).then(function(){") && script.includes("signalTransport.waitForAcceptance(signalRoomId,to"), "group invite fanout must wait for each invitee acceptance before offering media");
assert.ok(script.includes("return signalTransport.sendToRoom({") && script.includes("eventType:'call_signal'"), "authenticated group call control must fan out through the authorized room transport");
assert.ok(script.includes("await signalTransport.accept(signalRoomId);") && script.includes("signalStartCallPolling(signalRoomId,upCall.callId)"), "group invite acceptance must join the authenticated room and start its poller");
assert.ok(script.includes("else callSendTo(requester,'join_declined',{updatedAt:Date.now()});") && script.includes("}else sendRealtimeEvent('call_signal',{type:accepted?'join_approved':'join_declined',callId:p.callId,from:member,to:requester,participants:upCall.participants.slice(),updatedAt:Date.now()});") && script.includes("(p.type==='presence'||p.type==='ended'||p.type==='join_declined')&&p.discoveryOnly===true"), "authenticated group declines must use private transport; legacy public declines remain disabled whenever authenticated transport is enabled");
assert.ok(script.includes("if(signalTransportFlag){\n        if(signalTransport&&signalRoomByCallId[p.callId])") && script.includes("A sinalização autenticada da chamada não está disponível. O pedido não foi processado.") && script.includes("}else sendRealtimeEvent('call_signal',{type:accepted?'join_approved':'join_declined'"), "group join approvals must fail closed when authenticated transport is enabled but the room mapping is missing");
assert.ok(script.includes("if(signalTransportFlag&&!p._authenticatedTransport") && script.includes("if(!signalTransport||!signalRoomId)return false"), "group call events must reject public control messages and fail closed without a room");
assert.ok(script.includes("pendingSignals.map(function(p){return Promise.resolve(p);})") && script.includes("return signalTransport.leave(signalRoomId)"), "call teardown must wait for pending signals before leaving its authenticated room");
const browserHarness = read("scripts/test-signaling-browser.mjs");
assert.ok(browserHarness.includes('"/room/open"') && browserHarness.includes('"upstatus-team-lite-room-v1"') && browserHarness.includes("late Team Lite member must join without invitation") && browserHarness.includes('roomId: voiceRoomId, bindingType: "screen"'), "browser E2E must cover open late join, cross-client aliases, and shared voice/screen room");
assert.ok(browserHarness.includes("async function runGroupMesh()") && browserHarness.includes("async function negotiateMeshPair("), "authenticated browser E2E must include a three-member group mesh");
assert.ok(browserHarness.includes('"/room/invite"') && browserHarness.includes('"/room/members"') && browserHarness.includes('"/broadcast"'), "group browser E2E must cover dynamic invitation, accepted roster, and authenticated fanout");
assert.ok(browserHarness.includes("await negotiateMeshPair(pageA, users.A, pageB, users.B, callId)") && browserHarness.includes("await negotiateMeshPair(pageA, users.A, pageC, users.C, callId)") && browserHarness.includes("await negotiateMeshPair(pageB, users.B, pageC, users.C, callId)"), "group browser E2E must establish every peer-to-peer mesh link");
assert.ok(script.includes("var teamLiteNetworkOffline=false") && script.includes("window.addEventListener('offline'") && script.includes("window.addEventListener('online'"), "Team Lite candidate must reset local media state offline and reconnect Realtime online");
const teamLiteRealtimeStart=script.match(/function startRealtime\(\)\s*\{([\s\S]*?)\n  \}/);
const teamLiteOnlineHandler=script.match(/window.addEventListener\('online',function\(\)\{([\s\S]*?)\n  \}\);/);
assert.ok(teamLiteRealtimeStart && teamLiteRealtimeStart[1].includes("initSignalingTransport();") && teamLiteOnlineHandler && teamLiteOnlineHandler[1].includes("startRealtime();"), "Team Lite reconnect must recreate authenticated signaling transport when Realtime restarts");
assert.ok(script.includes("voiceRoom.joinGeneration!==joinGeneration") && script.includes("navigator.onLine===false"), "Team Lite voice-room join must reject offline entry and stale getUserMedia completion");
const teamLiteStartCallStart=script.indexOf("async function startOutgoingCall(target){");
const teamLiteStartCallEnd=script.indexOf("async function callAcceptIncomingOffer",teamLiteStartCallStart);
const teamLiteStartCallSource=script.slice(teamLiteStartCallStart,teamLiteStartCallEnd);
assert.ok(teamLiteStartCallStart>=0&&teamLiteStartCallEnd>teamLiteStartCallStart&&teamLiteStartCallSource.indexOf("await waitForRealtimeReady(10000)")>=0&&teamLiteStartCallSource.indexOf("await waitForRealtimeReady(10000)")<teamLiteStartCallSource.indexOf("upCall.callId=callNewId()"),"Team Lite legacy outgoing calls must wait for Realtime before allocating a call");
assert.ok(script.includes("async function callRequestToJoin(callId,target)")&&script.includes("await waitForRealtimeReady(10000)"),"Team Lite legacy group-call join requests must wait for Realtime after reconnect");
assert.ok(script.includes("if(upCall.starting){") && script.includes("upCall.startAttempt=(upCall.startAttempt||0)+1;upCall.starting=false;"), "outgoing-call recovery must serialize duplicate clicks and invalidate pending attempts on cleanup");
const outgoingStartStart=script.indexOf("async function startOutgoingCall(target){");
const outgoingStartEnd=script.indexOf("async function callAcceptIncomingOffer",outgoingStartStart);
assert.ok(outgoingStartStart>=0&&outgoingStartEnd>outgoingStartStart,"outgoing-call recovery source boundaries not found");
const outgoingStartSource=script.slice(outgoingStartStart,outgoingStartEnd)+"\nthis.__candidateStartOutgoingCall=startOutgoingCall;";
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

assert.ok(script.includes("voiceRoomLeave({skipServerLeave:true})") && script.includes("async function waitForRealtimeReady(") && script.includes("await waitForRealtimeReady(10000)"), "offline recovery must tear down locally without waiting for network leave and wait for Realtime readiness before legacy voice rejoin");
console.log("Candidate updater runtime scenarios passed: newer/current/mismatch/downgrade/manifest-offline/script-offline/invalid-manifest.");


// Team Lite voice-room leave must await the authenticated server membership cleanup.
// The active UI path sends the final leave signal and its promise includes the /room/leave RPC.
const voiceLeaveStart = script.indexOf("var voiceRoomLeavePromise=null;");
const voiceLeaveEnd = script.indexOf("\nwindow.addEventListener('pagehide'", voiceLeaveStart);
assert.ok(voiceLeaveStart >= 0 && voiceLeaveEnd > voiceLeaveStart, "voice leave promise boundaries not found");
const voiceLeaveSource = script.slice(voiceLeaveStart, voiceLeaveEnd) + "\nthis.__candidateVoiceRoomLeave=voiceRoomLeave;";
const leaveEvents = [];
let finishVoiceLeave;
const pendingVoiceLeave = new Promise(resolve => {
  finishVoiceLeave = () => {
    leaveEvents.push("server-leave-complete");
    voiceLeaveContext.signalVoiceRoomRoomId = "";
    resolve(true);
  };
});
const voiceLeaveContext = {
  voiceRoom: {
    joinGeneration: 0, active: true, joining: false, recoveryTimers: {}, recoveryAttempts: {},
    timer: null, levelTimer: null, pingTimer: null, pingMs: null, peers: {}, stream: null,
    muted: false, participants: {}
  },
  signalVoiceRoomRoomId: "team-lite-voice-room",
  screenShareStop: () => leaveEvents.push("screen-stop"),
  signalStopCallPolling: room => leaveEvents.push("poll-stop:" + room),
  voiceRoomPlayCue: () => {},
  voiceRoomSend: () => { leaveEvents.push("leave-signal-start"); return pendingVoiceLeave; },
  signalReleaseVoiceRoom: async () => { leaveEvents.push("release-fallback"); },
  clearTimeout: () => {},
  clearInterval: () => {},
  voiceRoomDrop: () => {},
  voiceRoomRender: () => {},
  voiceRoomMessage: () => {},
  member: "Team Lite Tester"
};
vm.runInNewContext(voiceLeaveSource, voiceLeaveContext, { timeout: 1000 });
const firstVoiceLeave = voiceLeaveContext.__candidateVoiceRoomLeave();
const duplicateVoiceLeave = voiceLeaveContext.__candidateVoiceRoomLeave();
assert.equal(firstVoiceLeave, duplicateVoiceLeave, "concurrent leave/logout callers must share one in-flight voice cleanup");
await new Promise(resolve => setTimeout(resolve, 0));
assert.ok(leaveEvents.includes("leave-signal-start") && leaveEvents.includes("poll-stop:team-lite-voice-room"), "active voice leave must stop its poller and begin the final leave signal");
let voiceLeaveSettled = false;
firstVoiceLeave.then(() => { voiceLeaveSettled = true; });
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(voiceLeaveSettled, false, "voiceRoomLeave must remain pending until the authenticated leave request settles");
finishVoiceLeave();
await firstVoiceLeave;
assert.equal(voiceLeaveSettled, true, "voiceRoomLeave must settle after the server leave request");

const releaseGateStart = script.indexOf("  async function teamLiteReleaseVoiceRoomBeforeLogout(){");
const releaseGateEnd = script.indexOf("  async function teamLiteEndSession(){", releaseGateStart);
assert.ok(releaseGateStart >= 0 && releaseGateEnd > releaseGateStart, "logout voice-release gate boundaries not found");
const releaseGateSource = script.slice(releaseGateStart, releaseGateEnd) + "\nthis.__candidateReleaseVoiceBeforeLogout=teamLiteReleaseVoiceRoomBeforeLogout;";
const logoutEvents = [];
let finishLogoutVoiceLeave;
const pendingLogoutVoiceLeave = new Promise(resolve => {
  finishLogoutVoiceLeave = () => { logoutEvents.push("voice-leave-complete"); resolve(true); };
});
const logoutGateContext = {
  voiceRoomLeavePromise: pendingLogoutVoiceLeave,
  voiceRoom: { active: false, joining: false },
  signalVoiceRoomRoomId: "",
  voiceRoomLeave: () => { logoutEvents.push("await-inflight-voice-leave"); return pendingLogoutVoiceLeave; }
};
vm.runInNewContext(releaseGateSource, logoutGateContext, { timeout: 1000 });
const logoutGate = logoutGateContext.__candidateReleaseVoiceBeforeLogout();
let logoutGateSettled = false;
logoutGate.then(() => { logoutGateSettled = true; });
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(logoutGateSettled, false, "logout must await an in-flight voice leave even after local active state was cleared");
finishLogoutVoiceLeave();
await logoutGate;
assert.equal(logoutGateSettled, true, "logout voice-release gate must settle after server leave");

const endSessionStart = script.indexOf("async function teamLiteEndSession(){");
const endSessionEnd = script.indexOf("\n  function teamLiteStartIdleTimer", endSessionStart);
const endSessionSource = script.slice(endSessionStart, endSessionEnd);
assert.ok(
  endSessionSource.includes("await teamLiteReleaseVoiceRoomBeforeLogout()") &&
  endSessionSource.indexOf("await teamLiteReleaseVoiceRoomBeforeLogout()") < endSessionSource.indexOf("await api('POST','/api/logout',{})"),
  "Team Lite logout must await voice membership release before invalidating the session"
);
assert.ok(
  script.includes("logout.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();menuPanel.classList.add('hidden');menuToggle.setAttribute('aria-expanded','false');broadcastChatPresence(false);teamLiteEndSession();});") &&
  !script.includes("voiceRoomLeave();broadcastChatPresence(false);teamLiteEndSession();"),
  "menu logout must delegate to the awaited session teardown instead of fire-and-forget voice leave"
);
assert.ok(
  script.includes("card.querySelector('.up-voice-leave').onclick=async function(e){") &&
  script.includes("try{await voiceRoomLeave();}finally{button.disabled=false;}"),
  "voice leave UI must keep its control disabled until asynchronous membership cleanup settles"
);
console.log("Team Lite voice leave sequencing tests passed: active leave awaits transport, duplicate leave coalesces, logout waits for in-flight leave.");


const voiceSendStart = script.indexOf("function voiceRoomSend(");
const voiceSendEnd = script.indexOf("\nfunction voiceRoomMessage", voiceSendStart);
assert.ok(voiceSendStart >= 0 && voiceSendEnd > voiceSendStart, "voice send implementation boundaries not found");
const voiceSendSource = script.slice(voiceSendStart, voiceSendEnd);
const leaveRpcPosition = voiceSendSource.indexOf("signalTransport.leave(room)");
const clearRoomPosition = voiceSendSource.indexOf("signalVoiceRoomRoomId='';");
assert.ok(leaveRpcPosition >= 0 && clearRoomPosition > leaveRpcPosition,
  "Team Lite must retain the room binding until the authenticated leave RPC succeeds");

// The release helper must retain its retry context when the network fails, and clear it only after server confirmation.
const signalReleaseStart = script.indexOf("function signalReleaseVoiceRoom(){");
const signalReleaseEnd = script.indexOf("\n\n  var lastMember=", signalReleaseStart);
assert.ok(signalReleaseStart >= 0 && signalReleaseEnd > signalReleaseStart, "signal release boundaries not found");
const signalReleaseSource = script.slice(signalReleaseStart, signalReleaseEnd) + "\nthis.__candidateSignalReleaseVoiceRoom=signalReleaseVoiceRoom;";
const releaseEvents = [];
let releaseAttempts = 0;
const releaseContext = {
  signalVoiceRoomRoomId: "team-lite-room-retry",
  signalVoiceRoomPrepared: true,
  signalVoiceRoomCreator: true,
  signalTransport: {
    leave: async room => {
      releaseEvents.push("leave:" + room);
      releaseAttempts++;
      if (releaseAttempts === 1) throw new Error("simulated network outage");
      return { ok: true };
    }
  },
  signalStopCallPolling: room => releaseEvents.push("poll-stop:" + room),
  voiceRoomMessage: message => releaseEvents.push("message:" + message)
};
vm.runInNewContext(signalReleaseSource, releaseContext, { timeout: 1000 });
const failedRelease = await releaseContext.__candidateSignalReleaseVoiceRoom();
assert.equal(failedRelease, false, "failed membership release must report failure");
assert.equal(releaseContext.signalVoiceRoomRoomId, "team-lite-room-retry", "failed release must retain the room ID for retry");
assert.equal(releaseContext.signalVoiceRoomPrepared, true, "failed release must retain prepared state");
assert.equal(releaseContext.signalVoiceRoomCreator, true, "failed release must retain owner context");
const successfulRelease = await releaseContext.__candidateSignalReleaseVoiceRoom();
assert.equal(successfulRelease.ok, true, "retry must return the server leave result");
assert.equal(releaseContext.signalVoiceRoomRoomId, "", "successful retry must clear the room ID");
assert.equal(releaseContext.signalVoiceRoomPrepared, false, "successful retry must clear prepared state");
assert.equal(releaseContext.signalVoiceRoomCreator, false, "successful retry must clear owner context");
console.log("Team Lite voice-room release retry-context tests passed.");

const fallbackEvents = [];
let finishFallbackLeave;
const pendingFallbackLeave = new Promise(resolve => {
  finishFallbackLeave = () => {
    fallbackEvents.push("fallback-complete");
    fallbackLeaveContext.signalVoiceRoomRoomId = "";
    resolve(true);
  };
});
const fallbackLeaveContext = {
  voiceRoom: {
    joinGeneration: 0, active: true, joining: false, recoveryTimers: {}, recoveryAttempts: {},
    timer: null, levelTimer: null, pingTimer: null, pingMs: null, peers: {}, stream: null,
    muted: false, participants: {}
  },
  signalVoiceRoomRoomId: "team-lite-voice-room-fallback",
  screenShareStop: () => {},
  signalStopCallPolling: () => {},
  voiceRoomPlayCue: () => {},
  voiceRoomSend: () => { fallbackEvents.push("first-leave-failed"); return Promise.resolve(false); },
  signalReleaseVoiceRoom: () => { fallbackEvents.push("fallback-start"); return pendingFallbackLeave; },
  clearTimeout: () => {},
  clearInterval: () => {},
  voiceRoomDrop: () => {},
  voiceRoomRender: () => {},
  voiceRoomMessage: () => {},
  member: "Team Lite Tester"
};
vm.runInNewContext(voiceLeaveSource, fallbackLeaveContext, { timeout: 1000 });
const fallbackPromise = fallbackLeaveContext.__candidateVoiceRoomLeave();
let fallbackSettled = false;
fallbackPromise.then(() => { fallbackSettled = true; });
// The extracted async function runs in a separate VM context; yield one event-loop turn
// so its cross-context Promise continuation reaches the fallback before asserting.
await new Promise(resolve => setTimeout(resolve, 0));
assert.ok(fallbackEvents.includes("fallback-start"), "failed active leave must retry through signalReleaseVoiceRoom while the room binding remains");
assert.equal(fallbackSettled, false, "voice leave must await the fallback membership release");
finishFallbackLeave();
await fallbackPromise;
assert.equal(fallbackSettled, true, "voice leave must settle after fallback membership release");
console.log("Team Lite voice leave fallback retry test passed.");


const voiceSendRuntimeStart = script.indexOf("function voiceRoomSend(");
const voiceSendRuntimeEnd = script.indexOf("\nfunction voiceRoomMessage", voiceSendStart);
assert.ok(voiceSendStart >= 0 && voiceSendRuntimeEnd > voiceSendStart, "voice send boundaries not found");
const voiceSendRuntimeSource = script.slice(voiceSendStart, voiceSendRuntimeEnd) + "\nthis.__candidateVoiceRoomSend=voiceRoomSend;";
const sendEvents = [];
let finishLeaveRpc;
const pendingLeaveRpc = new Promise(resolve => {
  finishLeaveRpc = () => { sendEvents.push("leave-rpc-complete"); resolve({ ok: true }); };
});
const voiceSendContext = {
  voiceRoom: { id: "upstatus-team-lite-room-v1", active: false, muted: false, speakersMuted: false, sessionId: "session-test", sessionStartedAt: 0 },
  signalTransportFlag: true,
  signalTransport: {
    sendToRoom: () => { sendEvents.push("final-leave-signal"); return Promise.resolve({ ok: true }); },
    leave: room => { sendEvents.push("leave-rpc-start:" + room); return pendingLeaveRpc; }
  },
  signalVoiceRoomRoomId: "team-lite-room-send-test",
  signalVoiceRoomPrepared: true,
  signalVoiceRoomCreator: true,
  signalStopCallPolling: room => sendEvents.push("poll-stop:" + room),
  voiceRoomMessage: () => {},
  CURRENT_VERSION: "3.4.31",
  member: "Team Lite Tester"
};
vm.runInNewContext(voiceSendRuntimeSource, voiceSendContext, { timeout: 1000 });
const voiceSendPromise = voiceSendContext.__candidateVoiceRoomSend("leave", "", { active: false });
// voiceRoomSend chains the final broadcast promise before starting the membership RPC.
// A macrotask turn lets that full Promise chain settle without relying on a brittle
// fixed number of microtask flushes.
await new Promise(resolve => setTimeout(resolve, 0));
const finalLeaveSignalIndex = sendEvents.indexOf("final-leave-signal");
const leaveRpcStartIndex = sendEvents.indexOf("leave-rpc-start:team-lite-room-send-test");
assert.ok(finalLeaveSignalIndex >= 0 && leaveRpcStartIndex > finalLeaveSignalIndex,
  "voiceRoomSend must deliver the final leave signal before invoking the membership RPC");
assert.equal(voiceSendContext.signalVoiceRoomRoomId, "team-lite-room-send-test",
  "voiceRoomSend must retain the room ID while the membership RPC is pending");
assert.equal(voiceSendContext.signalVoiceRoomPrepared, true,
  "voiceRoomSend must retain prepared state until membership RPC succeeds");
let voiceSendSettled = false;
voiceSendPromise.then(() => { voiceSendSettled = true; });
await Promise.resolve();
assert.equal(voiceSendSettled, false, "voiceRoomSend must await the membership RPC");
finishLeaveRpc();
await voiceSendPromise;
assert.equal(voiceSendContext.signalVoiceRoomRoomId, "", "successful membership RPC must clear the room ID");
assert.equal(voiceSendContext.signalVoiceRoomPrepared, false, "successful membership RPC must clear prepared state");
assert.equal(voiceSendContext.signalVoiceRoomCreator, false, "successful membership RPC must clear creator state");
console.log("Team Lite voice send/leave RPC ordering test passed.");


const voiceJoinStart = script.indexOf("async function voiceRoomJoin(){");
const voiceJoinEnd = script.indexOf("\nfunction voiceRoomToggleSpeakers", voiceJoinStart);
assert.ok(voiceJoinStart >= 0 && voiceJoinEnd > voiceJoinStart, "voice join boundaries not found");
const voiceJoinSource = script.slice(voiceJoinStart, voiceJoinEnd) + "\nthis.__candidateVoiceRoomJoin=voiceRoomJoin;";
assert.ok(
  script.includes("j.disabled=voiceRoom.joining||!!voiceRoomLeavePromise;") &&
  script.includes("voiceRoomLeavePromise?'Saindo...':voiceRoom.joining?") &&
  script.includes("voiceRoomLeavePromise=leavePromise.finally(function(){voiceRoomLeavePromise=null;voiceRoomRender();});"),
  "voice UI must remain disabled and refresh when leave is in flight"
);
const joinEvents = [];
let finishJoinWait;
const pendingJoinWait = new Promise(resolve => {
  finishJoinWait = () => {
    joinEvents.push("leave-finished");
    joinContext.voiceRoomLeavePromise = null;
    resolve(true);
  };
});
const joinContext = {
  voiceRoomLeavePromise: pendingJoinWait,
  voiceRoom: { active: false, joining: false },
  navigator: { onLine: false },
  voiceRoomMessage: message => joinEvents.push("message:" + message)
};
vm.runInNewContext(voiceJoinSource, joinContext, { timeout: 1000 });
const joinAfterLeave = joinContext.__candidateVoiceRoomJoin();
let joinSettled = false;
joinAfterLeave.then(() => { joinSettled = true; });
await Promise.resolve();
assert.equal(joinEvents.length, 0, "a new voice join must wait while leave membership cleanup is pending");
assert.equal(joinSettled, false, "voice join must remain pending until the previous leave finishes");
finishJoinWait();
await joinAfterLeave;
assert.ok(joinEvents.some(x => x.startsWith("message:Sem conexão")), "voice join must continue only after leave settles");
console.log("Team Lite rejoin serialization test passed.");
const realtimeReadyStart = script.indexOf("async function waitForRealtimeReady(");
const realtimeReadyEnd = script.indexOf("\nasync function voiceRoomJoin", realtimeReadyStart);
assert.ok(realtimeReadyStart >= 0 && realtimeReadyEnd > realtimeReadyStart, "voice Realtime readiness helper boundaries not found");
const realtimeReadySource = script.slice(realtimeReadyStart, realtimeReadyEnd) + "\nthis.__candidateWaitForVoiceRealtimeReady=waitForRealtimeReady;";
let realtimeStartCalls = 0;
const readyContext = {
  navigator: { onLine: true },
  isAuthenticated: () => true,
  realtimeActive: false,
  realtimeChannel: null,
  realtimeClient: null,
  startRealtime: () => {
    realtimeStartCalls++;
    readyContext.realtimeClient = {};
    readyContext.realtimeChannel = {};
    readyContext.realtimeActive = true;
  },
  Date,
  Promise,
  setTimeout
};
vm.runInNewContext(realtimeReadySource, readyContext, { timeout: 1000 });
assert.equal(await readyContext.__candidateWaitForVoiceRealtimeReady(1000), true, "voice join must wait until the Realtime subscription is ready");
assert.equal(realtimeStartCalls, 1, "voice join must restart Realtime when no client exists");
const offlineReadyContext = {
  navigator: { onLine: false },
  isAuthenticated: () => true,
  realtimeActive: false,
  realtimeChannel: null,
  realtimeClient: null,
  startRealtime: () => { throw new Error("must not start Realtime while offline"); },
  Date,
  Promise,
  setTimeout
};
vm.runInNewContext(realtimeReadySource, offlineReadyContext, { timeout: 1000 });
assert.equal(await offlineReadyContext.__candidateWaitForVoiceRealtimeReady(1000), false, "voice join readiness wait must stop immediately while offline");
console.log("Team Lite Realtime recovery readiness tests passed.");

const offlineLeaveEvents = [];
const offlineLeaveContext = {
  voiceRoom: {
    joinGeneration: 0, active: true, joining: false, recoveryTimers: {}, recoveryAttempts: {},
    timer: null, levelTimer: null, pingTimer: null, pingMs: null, peers: {}, stream: null,
    muted: false, participants: {}
  },
  voiceRoomLeavePromise: null,
  signalVoiceRoomRoomId: "team-lite-offline-room",
  signalVoiceRoomPrepared: true,
  signalVoiceRoomCreator: true,
  screenShareStop: send => offlineLeaveEvents.push("screen-stop:" + send),
  signalStopCallPolling: room => offlineLeaveEvents.push("poll-stop:" + room),
  voiceRoomPlayCue: () => offlineLeaveEvents.push("leave-cue"),
  voiceRoomSend: () => { offlineLeaveEvents.push("network-leave-signal"); return Promise.resolve(true); },
  signalReleaseVoiceRoom: () => { offlineLeaveEvents.push("network-leave-rpc"); return Promise.resolve(true); },
  clearTimeout: () => {},
  clearInterval: () => {},
  voiceRoomDrop: () => {},
  voiceRoomRender: () => {},
  voiceRoomMessage: () => {},
  member: "Team Lite Tester",
  Promise
};
vm.runInNewContext(voiceLeaveSource, offlineLeaveContext, { timeout: 1000 });
await offlineLeaveContext.__candidateVoiceRoomLeave({ skipServerLeave: true });
assert.ok(offlineLeaveEvents.includes("screen-stop:false"), "offline cleanup must stop screen capture without sending a network signal");
assert.equal(offlineLeaveEvents.some(event => event.startsWith("network-")), false, "offline cleanup must not wait on an unreachable signaling endpoint");
assert.equal(offlineLeaveContext.voiceRoom.active, false, "offline cleanup must clear local voice state");
assert.equal(offlineLeaveContext.signalVoiceRoomRoomId, "team-lite-offline-room", "local leave cleanup must leave transport-owned room clearing to stopRealtime");
console.log("Team Lite offline local-only voice teardown tests passed.");

