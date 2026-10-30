#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const rootArtifactPath=path.join(ROOT,"UpStatus.user.js");
const rootArtifactBefore=fs.readFileSync(rootArtifactPath,"utf8");
execFileSync(process.execPath,[path.join(ROOT,"scripts/build.mjs")],{stdio:"inherit"});
if(fs.readFileSync(rootArtifactPath,"utf8")!==rootArtifactBefore)throw new Error("Validation must not modify the tracked UpStatus.user.js artifact without an explicit release sync.");
const release=JSON.parse(fs.readFileSync(path.join(ROOT,"release.json"),"utf8"));
const buildSource=fs.readFileSync(path.join(ROOT,"scripts/build.mjs"),"utf8");
assert(!buildSource.includes("fs.rmSync"),"build must not recursively delete function or dist directories");
for(const sidecar of ["supabase/functions/upstatus/index_v25_loader.ts","supabase/functions/upstatus/backend_v25_bundle.ts"]){
  assert(fs.existsSync(path.join(ROOT,sidecar)),"build must preserve tracked function sidecar: "+sidecar);
}
const baseVersion=String(release.version).trim();
const preRelease=String(release.preRelease||"").trim();
const testVersion=preRelease?baseVersion+"-"+preRelease:baseVersion;
const prodFn=fs.readFileSync(path.join(ROOT,"supabase/functions/upstatus/index.ts"),"utf8");
const testFn=fs.readFileSync(path.join(ROOT,"supabase/functions/upstatus-test/index.ts"),"utf8");
const triggerGrantMigration=fs.readFileSync(path.join(ROOT,"supabase/migrations/20261029170500_restrict_trigger_function_execute.sql"),"utf8");
const publicTableGrantMigration=fs.readFileSync(path.join(ROOT,"supabase/migrations/20261029183000_revoke_unused_public_table_grants.sql"),"utf8");
const prodUser=fs.readFileSync(path.join(ROOT,"dist/upstatus.user.js"),"utf8");
const testUser=fs.readFileSync(path.join(ROOT,"dist/upstatus-test.user.js"),"utf8");
function assert(ok,msg){if(!ok)throw new Error("VALIDATION FAILED: "+msg);}
function headerValue(text,name){const m=text.match(new RegExp("^// @"+name+"\\s+(.+)$","m"));return m?m[1].trim():"";}
function compareVersions(a,b){const left=String(a||"").split(".").map(Number),right=String(b||"").split(".").map(Number);for(let i=0;i<3;i++){const x=left[i]||0,y=right[i]||0;if(x!==y)return x>y?1:-1;}return 0;}
function decodeHex(code){const m=code.match(/const USERSCRIPT_HEX = "([0-9a-f]+)";/i);assert(m,"USERSCRIPT_HEX missing");return Buffer.from(m[1],"hex").toString("utf8");}
function checkSyntax(text,label){new vm.Script(text,{filename:label});}
assert(buildSource.includes('process.argv.includes("--sync-root-artifact")'),"root artifact sync must remain opt-in");
assert(buildSource.includes("compareVersions(baseVersion,currentVersion)<=0"),"root artifact sync must require a strictly newer release version");
assert(buildSource.indexOf("let rootArtifactPath=null")<buildSource.indexOf("writeFunction(PROD_FUNCTION"),"root artifact release guard must run before destructive build writes");
assert(buildSource.includes('fs.writeFileSync(rootArtifactPath,prodUser,"utf8")'),"root artifact sync must write the built production userscript");
const rootArtifactVersion=(rootArtifactBefore.match(/^\/\/ @version\s+(\d+\.\d+\.\d+)$/m)||[])[1]||"";
if(rootArtifactBefore!==prodUser&&(!rootArtifactVersion||compareVersions(baseVersion,rootArtifactVersion)<=0)){
  let sameVersionSyncBlocked=false;
  try{execFileSync(process.execPath,[path.join(ROOT,"scripts/build.mjs"),"--sync-root-artifact"],{stdio:"pipe"});}
  catch(error){sameVersionSyncBlocked=String(error&&error.stderr||error&&error.message||"").includes("unless release.json.version is greater");}
  assert(sameVersionSyncBlocked,"root artifact sync must be rejected unless the release version is strictly newer");
  assert(fs.readFileSync(rootArtifactPath,"utf8")===rootArtifactBefore,"rejected root artifact sync must leave the tracked artifact unchanged");
}
assert(prodUser.includes("function createSignalingTransport"),"production build must include the default-off signaling adapter");
assert(testUser.includes("function createSignalingTransport"),"TEST build must include the default-off signaling adapter");
assert(headerValue(prodUser,"version")===baseVersion,"production userscript version mismatch");
assert(headerValue(testUser,"version")===testVersion,"test userscript version mismatch");
assert(headerValue(prodUser,"namespace")==="upseller","production namespace mismatch");
assert(headerValue(testUser,"namespace")==="upseller-test","test namespace mismatch");
const expectedProductionUpdateUrl=String(release.scriptUrl||"https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus/upstatus.user.js").trim();
assert(headerValue(prodUser,"updateURL")===expectedProductionUpdateUrl,"production updateURL must match the configured stable endpoint");
assert(headerValue(prodUser,"downloadURL")===expectedProductionUpdateUrl,"production downloadURL must match the configured stable endpoint");
assert(headerValue(testUser,"updateURL")==="https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus-test/upstatus.user.js","test updateURL mismatch");
assert(headerValue(testUser,"downloadURL")==="https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus-test/upstatus.user.js","test downloadURL mismatch");
assert(headerValue(testUser,"updateURL")!=="https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus/upstatus.user.js","test updateURL must not target production");
assert(headerValue(testUser,"downloadURL")!=="https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus/upstatus.user.js","test downloadURL must not target production");
assert(prodUser.includes("var key='upstatus_screen_share_beta8_';"),"production storage prefix mismatch");
assert(testUser.includes("var key='upstatus_test_';"),"test storage prefix mismatch");
assert(prodUser.includes("var UP_REALTIME_TOPIC='upstatus-screen-share-live-3-1-1-beta10';"),"production realtime topic compatibility check");
assert(testUser.includes("var UP_REALTIME_TOPIC='upstatus-test-live-"),"test realtime topic missing");
assert(prodUser.includes("var UP_RINGTONE_CHANNEL='upstatus-screen-share-3-1-1-beta9-2-ringtone-stop-v1';"),"production ringtone channel mismatch");
assert(testUser.includes("var UP_RINGTONE_CHANNEL='upstatus-test-call-ringtone-stop-v1';"),"test ringtone channel mismatch");
assert(prodUser.includes("var upRingtoneStorageKey='upstatus_screen_share_beta8_ringtone_stop_bus';"),"production ringtone storage mismatch");
assert(testUser.includes("var upRingtoneStorageKey='upstatus_test_call_ringtone_stop_bus';"),"test ringtone storage mismatch");
assert(prodFn.includes('const VERSION = "'+baseVersion+'";'),"production backend version mismatch");
assert(testFn.includes('const VERSION = "'+testVersion+'";'),"test backend version mismatch");
assert(prodFn.includes('const marker="/upstatus";'),"production path marker mismatch");
assert(prodFn.includes('const officialTeam=new Set(["Ricardo","Guilherme","Lohan"]);'),"member list must be restricted to official team members");
assert(prodFn.includes('async function signedUploadRoute(req:Request,kind:"chat"|"avatar")'),"signed upload handler missing from production backend");
assert(prodFn.includes('if(path==="/api/profile/avatar-upload-url"&&req.method==="POST")return await signedUploadRoute(req,"avatar");'),"avatar signed-upload route missing");
assert(prodFn.includes('if(path==="/api/chat/upload-url"&&req.method==="POST")return await signedUploadRoute(req,"chat");'),"chat signed-upload route missing");
assert(prodFn.includes('if(!allowed.has(mime))return response({error:"Tipo de arquivo não suportado."},400);'),"signed uploads must enforce a MIME allowlist");
assert(prodFn.includes('if(!Number.isFinite(size)||size<1||size>max)return response({error:"O arquivo deve ter no máximo 20 MB."},400);'),"signed uploads must reject invalid or oversized declared sizes");
assert(prodFn.includes('if(!uploadToken||!signedUrl||signedPath!==path)throw new Error("O Storage não retornou uma URL assinada válida.");'),"signed upload URLs must be validated before returning them");
assert(prodFn.includes('if(!uploadUrl.searchParams.has("token"))uploadUrl.searchParams.set("token",uploadToken);'),"signed upload URL must include its upload token");
assert(prodFn.includes('const bucket=kind==="avatar"?"profile-images":"chat-images";'),"signed upload must use only the intended storage buckets");
assert(prodFn.includes("async function chatRoute(req:Request,name:string,sessionStartedAt=0)"),"guest session history filter parameter missing");
assert(prodFn.includes('if(sessionStartedAt&&Number.isFinite(sessionStartedAt)&&sessionStartedAt>0)'),"guest chat history must be filtered by server-side session start");
assert(prodFn.includes('if(path==="/api/chat")return await chatRoute(req,name,ctx.guest?ctx.joinedAt:0);'),"guest chat requests must pass their session start time");
assert(prodFn.includes('if(sessionStartedAt&&Number.isFinite(sessionStartedAt)&&sessionStartedAt>0)unreadQuery=unreadQuery.gte("created_at",new Date(Math.max(sessionStartedAt,Date.parse(cutoff))).toISOString());'),"guest unread counts must be scoped to the current session");
assert(prodFn.includes('if(path==="/api/chat/read"&&req.method==="POST")return await readRoute(req,name,ctx.guest?ctx.joinedAt:0);'),"guest read receipts must receive the current session start time");
assert(prodFn.includes('x.user_name!==name&&(!sessionStartedAt||!Number.isFinite(sessionStartedAt)||sessionStartedAt<=0||Date.parse(x.created_at)>=sessionStartedAt)'),"guest read receipts must not mark messages from prior sessions");
assert(prodFn.includes('file_name:type==="document"&&fileName?fileName:null'),"document filename persistence missing from chat messages");
assert(prodFn.includes('fileName:m.file_name||""'),"document filename hydration missing from chat history");
assert(prodFn.includes("const isAdmin=await admin(name);"),"message deletion must require the authenticated admin role");
assert(prodFn.includes('if(name!=="Ricardo"||!(await admin(name)))return response({error:"Somente o administrador responsável pode limpar o chat."},403);'),"clearing shared chat must require both the owner identity and stored admin role");
assert(prodFn.includes('if(!(await admin(name)))return response({error:"Seu perfil não possui acesso à saúde do sistema."},403);'),"health diagnostics must require the stored admin role");
assert(!prodFn.includes('if(!["Ricardo","Lohan","Guilherme"].includes(name))'),"health diagnostics must not use a name-only access check");
assert(prodFn.includes('message:"🧹 "+name+" limpou o chat."'),"chat clear audit message must identify the acting admin");
assert(!prodFn.includes('if(name!=="Ricardo")return response({error:"Somente Ricardo pode limpar o chat."}'),"chat clearing must not use a name-only admin check");
assert(prodFn.includes('const role=a.role||"implementation_user";'),"account setup must preserve only explicit database roles");
assert(triggerGrantMigration.includes("FROM PUBLIC, anon, authenticated"),"trigger broadcast migration must revoke direct execution from public client roles");
for(const fn of ["upstatus_broadcast_messages","upstatus_broadcast_remote_state","upstatus_broadcast_users"]){
  assert(triggerGrantMigration.includes("public."+fn+"()"),"trigger broadcast execution migration missing "+fn);
}
assert(triggerGrantMigration.includes("IF fn IS NOT NULL THEN"),"trigger execution migration must tolerate environments without every legacy function");
assert(publicTableGrantMigration.includes("REVOKE ALL PRIVILEGES ON TABLE"),"public table grant migration must revoke unnecessary client grants");
for(const table of ["chat_reads","messages","reactions","status_history","upstatus_profiles","upstatus_sessions","upstatus_state","upstatus_typing","users"]){
  assert(publicTableGrantMigration.includes("public."+table),"public table grant migration missing "+table);
}
assert(publicTableGrantMigration.includes("FROM PUBLIC, anon, authenticated"),"public table grant migration must cover public client roles");


// The public Realtime topic is not an authenticated trust boundary. These assertions
// ensure broadcasts only invalidate/refetch canonical chat state and never become
// authoritative remote-command or remote-result data.
for(const artifact of [prodUser,testUser]){
  assert(artifact.includes("function scheduleRealtimeChatRefresh(){"),"Realtime chat invalidation scheduler missing");
  assert(artifact.includes("var wait=Math.max(0,1000-(Date.now()-realtimeChatRefreshLastAt));"),"Realtime chat invalidation must be throttled");
  assert(artifact.includes("function handleRealtimeChatFast(){scheduleRealtimeChatRefresh();}"),"chat_fast payload must be treated as an invalidation hint");
  assert(artifact.includes(".on('broadcast',{event:'db_change'},function(){scheduleRealtimeChatRefresh();})"),"db_change payload rows must not be applied directly");
  assert(artifact.includes(".on('broadcast',{event:'chat_fast'},function(){handleRealtimeChatFast();})"),"chat_fast listener must not trust broadcast payloads");
  assert(artifact.includes(".on('broadcast',{event:'chat_read'},function(){scheduleRealtimeChatRefresh();})"),"public read receipts must be reconciled through canonical chat state");
  assert(artifact.includes("if(c&&c.target===member)pollRemoteStatus();"),"remote_command broadcasts must trigger authenticated polling only");
  assert(artifact.includes(".on('broadcast',{event:'remote_result'},function(){ /* Public Realtime is an untrusted hint; waitRemoteResult polls the authenticated result endpoint. */ })"),"remote_result broadcasts must not be authoritative");
}

assert(!prodFn.includes('["Ricardo","Lohan","Guilherme"].includes(name)?"implementation_admin"'),"account setup must not grant admin by name");
assert(testFn.includes('const marker="/upstatus-test";'),"test path marker mismatch");
assert(decodeHex(prodFn)===prodUser,"production embedded userscript does not match build output");
assert(decodeHex(testFn)===testUser,"test embedded userscript does not match build output");
checkSyntax(prodUser,"dist/upstatus.user.js");
checkSyntax(testUser,"dist/upstatus-test.user.js");

const luccaHtml=fs.readFileSync(path.join(ROOT,"lucca-site/index.html"),"utf8");
const ycaroHtml=fs.readFileSync(path.join(ROOT,"ycaro.html"),"utf8");
for(const guestHtml of [luccaHtml,ycaroHtml]){
  assert(guestHtml.includes(".up-chat-item.lucca .up-chat-bubble{background:#273247;border:1px solid #a855f7"),"guest portals must use a neutral fill with Lucca's purple border");
  assert(guestHtml.includes(".up-chat-item.ycaro .up-chat-bubble{background:#273247;border:1px solid #f97316"),"guest portals must use a neutral fill with Ycaro's orange border");
  assert(guestHtml.includes(".up-chat-system-event span{display:inline-block;padding:0;border:0;border-radius:0;background:transparent"),"guest join/leave notices must be plain centered text without a pill or colored fill");
  assert(guestHtml.includes("m.user==='Lucca'")&&guestHtml.includes("m.user==='Ycaro'"),"guest portals must style both Lucca and Ycaro messages consistently");
}
for(const notice of ['message:"Lucca entrou no chat"','message:"Lucca saiu do chat"','message:"Ycaro entrou no chat"','message:"Ycaro saiu do chat"']){
  assert(prodFn.includes(notice),"backend must emit the exact plain-text guest presence notice: "+notice);
}
assert(!/message:"[🔴🟠] (?:Lucca|Ycaro)(?: Maluco)? (?:entrou|saiu) do chat\."/u.test(prodFn),"guest presence notices must not contain emojis, nicknames, or trailing punctuation");

const luccaInline=[...luccaHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].find(m=>!/\bsrc\s*=/.test(m[1])&&m[2].trim());
assert(!!luccaInline,"Lucca inline script missing");
checkSyntax(luccaInline[2],"lucca-site/index.html inline script");
assert(luccaHtml.includes("sendMedia(file)"),"Lucca media upload flow missing");
assert(!prodFn.includes('db.from("messages").delete().eq("user_name","Lucca");'),"Lucca guest login/logout/expiry must preserve shared chat history");
assert(!prodFn.includes('db.from("messages").delete().eq("user_name","Ycaro")'),"Ycaro guest login/logout/expiry must preserve shared chat history");
assert(prodFn.includes("const html="+JSON.stringify(ycaroHtml)+";"),"Ycaro page embedding mismatch");
assert(prodFn.includes('if(path==="/ycaro"||path==="/ycaro.html")'),"Ycaro page route missing");
assert(prodFn.includes('Deno.env.get("YCARO_PASSWORD")'),"Ycaro password setting missing");
assert(prodFn.includes('cookie(req,"ycaro_session")'),"Ycaro session cookie missing");
assert(prodFn.includes('if(path.startsWith("/api/ycaro/"))return await ycaroRoute(req);'),"Ycaro API route missing");
assert(ycaroHtml.includes("localStorage.getItem('upstatus_ycaro_token')"),"Ycaro session token is not sent");
assert(ycaroHtml.includes("localStorage.setItem('upstatus_ycaro_token',d.token)"),"Ycaro login token is not persisted");
assert(ycaroHtml.includes("localStorage.removeItem('upstatus_ycaro_token')"),"Ycaro logout token is not cleared");
assert(ycaroHtml.includes("#d66b1f"),"Ycaro theme marker missing");
assert(!ycaroHtml.includes("api('/api/lucca/"),"Ycaro page must use separate API endpoints");
for(const artifact of [prodUser,testUser]){
  assert(artifact.includes("function closePopupAnimated(el,finish)"),"Popup exit animation helper missing");
  assert(artifact.includes("@keyframes upPopupExit"),"Popup exit keyframes missing");
  assert(artifact.includes("prefers-reduced-motion: reduce"),"Reduced-motion handling missing");
  assert(artifact.includes("decodeAudioData(buf)")&&artifact.includes("drawFromAudio(channel)"),"Audio-derived waveform missing");
  assert(!artifact.includes('class="up-chat-audio-volume"'),"Audio mute button should be removed");
  assert(artifact.includes("s.style.fontWeight='normal'"),"Waveform bar weight should remain normal");
}
assert(prodFn.includes("unreadCount:unreadCount||0"),"Fast chat endpoint must include unread count");

assert(prodUser.includes("function upStatusSaleDeselectActiveChat()"),"native conversation deselection action missing from production artifact");
assert(testUser.includes("function upStatusSaleDeselectActiveChat()"),"native conversation deselection action missing from test artifact");
assert(prodUser.includes("UPSTATUS_SALE_DESELECT_CHAT"),"Sale Smartly deselection bridge missing from production artifact");
assert(testUser.includes("UPSTATUS_SALE_DESELECT_CHAT"),"Sale Smartly deselection bridge missing from test artifact");
assert(prodUser.includes("upStatusSaleChatClose.deselected=true"),"X must hide after successful deselection in production artifact");
assert(testUser.includes("upStatusSaleChatClose.deselected=true"),"X must hide after successful deselection in test artifact");
assert(prodUser.includes("if(e.key!=='Escape'||e.defaultPrevented)return"),"Escape handling missing from production artifact");
assert(testUser.includes("if(e.key!=='Escape'||e.defaultPrevented)return"),"Escape handling missing from test artifact");
assert(!prodUser.includes("CHAT_REMOVE_SESSION"),"production artifact must not remove Sale Smartly sessions");
assert(!testUser.includes("CHAT_REMOVE_SESSION"),"test artifact must not remove Sale Smartly sessions");
assert(prodUser.includes("function upStatusSaleFindEndButton(header)"),"native end-session control detection missing from production artifact");
assert(prodUser.includes("M19 12H5M12 19l-7-7 7-7"),"production button must use the back-arrow icon");
assert(prodUser.includes("button.style.background='#2563eb'"),"production back-arrow button must use the blue theme color");
assert(prodUser.includes("button.style.margin='0 8px 0 0'"),"production back-arrow button must have spacing before native end-session control");
assert(prodUser.includes("endButton.parentElement.insertBefore(button,endButton)"),"production back-arrow must sit immediately before native end-session control");
execFileSync(process.execPath,[path.join(ROOT,"scripts/chat-regression.test.mjs")],{stdio:"inherit"});
execFileSync(process.execPath,[path.join(ROOT,"scripts/team-lite-updater.test.mjs")],{stdio:"inherit"});
console.log("Validation OK: PROD "+baseVersion+" / TEST "+testVersion);
