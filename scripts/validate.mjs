#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
execFileSync(process.execPath,[path.join(ROOT,"scripts/build.mjs")],{stdio:"inherit"});
const release=JSON.parse(fs.readFileSync(path.join(ROOT,"release.json"),"utf8"));
const baseVersion=String(release.version).trim();
const preRelease=String(release.preRelease||"").trim();
const testVersion=preRelease?baseVersion+"-"+preRelease:baseVersion;
const prodFn=fs.readFileSync(path.join(ROOT,"supabase/functions/upstatus/index.ts"),"utf8");
const testFn=fs.readFileSync(path.join(ROOT,"supabase/functions/upstatus-test/index.ts"),"utf8");
const prodUser=fs.readFileSync(path.join(ROOT,"dist/upstatus.user.js"),"utf8");
const testUser=fs.readFileSync(path.join(ROOT,"dist/upstatus-test.user.js"),"utf8");
const teamLiteRelease=JSON.parse(fs.readFileSync(path.join(ROOT,"team-lite/release.json"),"utf8"));
const teamLiteVersion=String(teamLiteRelease.buildVersion||"").trim();
const teamLiteUser=fs.readFileSync(path.join(ROOT,"team-lite/upstatus-team-lite.user.js"),"utf8");
const teamLiteFn=fs.readFileSync(path.join(ROOT,"supabase/functions/upstatus-team-lite/index.ts"),"utf8");
const luccaHtml=fs.readFileSync(path.join(ROOT,"lucca.html"),"utf8");
const ycaroHtml=fs.readFileSync(path.join(ROOT,"ycaro.html"),"utf8");

function assert(ok,msg){if(!ok)throw new Error("VALIDATION FAILED: "+msg);}
function headerValue(text,name){const m=text.match(new RegExp("^// @"+name+"\\s+(.+)$","m"));return m?m[1].trim():"";}
function decodeHex(code){const m=code.match(/const USERSCRIPT_HEX = "([0-9a-f]+)";/i);assert(m,"USERSCRIPT_HEX missing");return Buffer.from(m[1],"hex").toString("utf8");}
function decodeBase64(code){const m=code.match(/const USERSCRIPT_BASE64 = "([A-Za-z0-9+/=]+)";/);assert(m,"Team Lite USERSCRIPT_BASE64 missing");return Buffer.from(m[1],"base64").toString("utf8");}
function checkSyntax(text,label){new vm.Script(text,{filename:label});}
assert(headerValue(prodUser,"version")===baseVersion,"production userscript version mismatch");
assert(headerValue(testUser,"version")===testVersion,"test userscript version mismatch");
assert(headerValue(prodUser,"namespace")==="upseller","production namespace mismatch");
assert(headerValue(testUser,"namespace")==="upseller-test","test namespace mismatch");
assert(headerValue(prodUser,"updateURL").includes("/upstatus/upstatus.user.js"),"production updateURL mismatch");
assert(headerValue(testUser,"updateURL").includes("/upstatus-test/upstatus.user.js"),"test updateURL mismatch");
assert(!testUser.includes("/functions/v1/upstatus/upstatus.user.js"),"test userscript contains production updateURL");
assert(prodUser.includes("var key='upstatus_';"),"production storage prefix mismatch");
assert(testUser.includes("var key='upstatus_test_';"),"test storage prefix mismatch");
assert(prodUser.includes("var UP_REALTIME_TOPIC='upstatus-live-"),"production realtime topic missing");
assert(testUser.includes("var UP_REALTIME_TOPIC='upstatus-test-live-"),"test realtime topic missing");
assert(prodUser.includes("var UP_RINGTONE_CHANNEL='upstatus-call-ringtone-stop-v1';"),"production ringtone channel mismatch");
assert(testUser.includes("var UP_RINGTONE_CHANNEL='upstatus-test-call-ringtone-stop-v1';"),"test ringtone channel mismatch");
assert(prodUser.includes("var upRingtoneStorageKey='upstatus_call_ringtone_stop_bus';"),"production ringtone storage mismatch");
assert(testUser.includes("var upRingtoneStorageKey='upstatus_test_call_ringtone_stop_bus';"),"test ringtone storage mismatch");
assert(prodFn.includes('const VERSION = "'+baseVersion+'";'),"production backend version mismatch");
assert(testFn.includes('const VERSION = "'+testVersion+'";'),"test backend version mismatch");
assert(prodFn.includes('const marker="/upstatus";'),"production path marker mismatch");
assert(testFn.includes('const marker="/upstatus-test";'),"test path marker mismatch");
assert(decodeHex(prodFn)===prodUser,"production embedded userscript does not match build output");
assert(decodeHex(testFn)===testUser,"test embedded userscript does not match build output");
checkSyntax(prodUser,"dist/upstatus.user.js");
checkSyntax(testUser,"dist/upstatus-test.user.js");
assert(/^\\d+\\.\\d+\\.\\d+$/.test(teamLiteVersion),"Team Lite buildVersion must use X.Y.Z");
assert(headerValue(teamLiteUser,"version")===teamLiteVersion,"Team Lite script version mismatch");
assert(teamLiteUser.includes("var CURRENT_VERSION='"+teamLiteVersion+"'"),"Team Lite updater CURRENT_VERSION mismatch");
assert(teamLiteRelease.scriptUrl===headerValue(teamLiteUser,"updateURL"),"Team Lite updateURL must match release manifest");
assert(teamLiteRelease.scriptUrl===headerValue(teamLiteUser,"downloadURL"),"Team Lite downloadURL must match release manifest");
assert(teamLiteFn.includes('const VERSION = "'+teamLiteVersion+'";'),"Team Lite backend version mismatch");
assert(teamLiteFn.includes('const marker="/upstatus-team-lite";'),"Team Lite path marker missing");
assert(decodeBase64(teamLiteFn)===teamLiteUser,"Team Lite embedded userscript does not match source");
assert(!teamLiteFn.includes("__UPSTATUS_"),"Team Lite backend has unresolved build placeholders");
checkSyntax(teamLiteUser,"team-lite/upstatus-team-lite.user.js");
assert(teamLiteFn.includes("async function chatRows(name:string,since?:string,guestJoinedAt=0)"),"Team Lite backend must scope chat history by guest session");
assert(teamLiteFn.includes("guestJoinedAt<=0||Date.parse(String(x.created_at))>=guestJoinedAt"),"Team Lite read receipts must respect guest session start");
assert(teamLiteFn.includes('return await readRoute(req,name,ctx?.guest?ctx.joinedAt:0)'),"Team Lite read route must receive guest session start");
assert(!teamLiteFn.includes('db.from("messages").delete().eq("user_name","Lucca")')&&!teamLiteFn.includes('db.from("messages").delete().eq("user_name","Ycaro")'),"Team Lite guest login must never delete shared messages");
assert(!teamLiteFn.includes('const isAdmin=name==="Ricardo"||await admin(name);'),"Team Lite backend must not grant admin by name alone");
for(const notice of ['message:"Lucca entrou no chat"','message:"Lucca saiu do chat"','message:"Ycaro entrou no chat"','message:"Ycaro saiu do chat"'])assert(teamLiteFn.includes(notice),"Team Lite backend exact presence notice missing: "+notice);
assert(!/message:"[🔴🟠] (?:Lucca|Ycaro)(?: Maluco)? (?:entrou|saiu) do chat\\."/u.test(teamLiteFn),"Team Lite presence notices must not include emoji/nickname/punctuation");
assert(teamLiteFn.includes("file_name:fileName"),"Team Lite chat must persist document filenames");
assert(teamLiteUser.includes("if(c&&c.target===member)pollRemoteStatus();"),"Team Lite realtime remote commands must be verified by authenticated server polling");
assert(!teamLiteUser.includes("if(c&&c.target===member)executeRemoteCommand(c);"),"Team Lite must not execute untrusted remote command broadcasts directly");
assert(teamLiteUser.includes("background:var(--up-chat-neutral-fill)!important;border:1px solid #a855f7!important"),"Team Lite Lucca messages need neutral fill and purple border");
assert(teamLiteUser.includes("background:var(--up-chat-neutral-fill)!important;border:1px solid #f97316!important"),"Team Lite Ycaro messages need neutral fill and orange border");
assert(teamLiteUser.includes("justify-content:center!important")&&teamLiteUser.includes("text-align:center!important"),"Team Lite presence notices must be centered");
assert(luccaHtml.includes("border:1px solid #a855f7")&&luccaHtml.includes("border:1px solid #f97316"),"Lucca portal must style both guest senders");
assert(ycaroHtml.includes("border:1px solid #a855f7")&&ycaroHtml.includes("border:1px solid #f97316"),"Ycaro portal must style both guest senders");

assert(prodUser.includes("upStatusSaleChatClose"),"Sale Smartly close integration missing from production artifact");
assert(testUser.includes("upStatusSaleChatClose"),"Sale Smartly close integration missing from test artifact");

assert(testFn.includes("async function signedUploadRoute(req:Request,kind:\"chat\"|\"avatar\")"),"signed upload route missing from TEST backend");
assert(testFn.includes('if(path==="/api/chat/upload-url"&&req.method==="POST")return await signedUploadRoute(req,"chat");'),"chat signed-upload endpoint missing from TEST backend");
assert(testFn.includes('if(path==="/api/profile/avatar-upload-url"&&req.method==="POST")return await signedUploadRoute(req,"avatar");'),"avatar signed-upload endpoint missing from TEST backend");
assert(testFn.includes("createSignedUploadUrl(path,{upsert:true})"),"Storage signed URL must be generated with upsert enabled");
assert(testFn.includes('const max=20*1024*1024;'),"TEST signed upload limit must be 20 MiB");
assert(testFn.includes('if(!uploadToken||!signedUrl||signedPath!==path)'),"TEST backend must verify signed upload response fields");
assert(testFn.includes('if(p.dataUrl){'),"legacy avatar dataUrl compatibility missing from TEST backend");
assert(testUser.includes("function uploadFileDirect(file,route)"),"client signed upload helper missing");
assert(testUser.includes("headers:{'Content-Type':info.mime,'x-upsert':'true','authorization':'Bearer '+ticket.token}"),"client signed upload authorization headers missing");
assert(testUser.includes("uploadFileDirect(file,'/api/chat/upload-url')"),"client chat upload endpoint mismatch");
assert(testUser.includes("uploadFileDirect(file,'/api/profile/avatar-upload-url')"),"client avatar upload endpoint mismatch");

assert(prodUser.includes("UPSTATUS_SALE_DESELECT_CHAT"),"Sale Smartly deselect bridge missing from production artifact");
assert(testUser.includes("UPSTATUS_SALE_DESELECT_CHAT"),"Sale Smartly deselect bridge missing from test artifact");
assert(prodUser.includes("chatStore.setActiveUser('')"),"native active-chat deselection action missing from production artifact");
assert(testUser.includes("chatStore.setActiveUser('')"),"native active-chat deselection action missing from test artifact");
assert(prodUser.includes("function upStatusSaleDeselectActiveChat()"),"shared native deselection action missing from production artifact");
assert(testUser.includes("function upStatusSaleDeselectActiveChat()"),"shared native deselection action missing from test artifact");
assert(prodUser.includes("upStatusSaleChatClose.deselected=true"),"close button must disappear after native deselection in production artifact");
assert(testUser.includes("upStatusSaleChatClose.deselected=true"),"close button must disappear after native deselection in test artifact");
assert(prodUser.includes("upStatusSaleDeselectActiveChat();")&&testUser.includes("upStatusSaleDeselectActiveChat();"),"X/Escape must use shared native deselection action");
assert(!prodUser.includes("CHAT_REMOVE_SESSION"),"userscript must not use Sale Smartly session-removal event");
assert(!testUser.includes("CHAT_REMOVE_SESSION"),"test userscript must not use Sale Smartly session-removal event");
assert(prodUser.includes("function upStatusSaleFindEndButton(header)"),"native end-session button detection missing from production artifact");
assert(testUser.includes("function upStatusSaleFindEndButton(header)"),"native end-session button detection missing from test artifact");
assert(prodUser.includes("endButton.parentElement.insertBefore(button,endButton)"),"X must be placed immediately before native end-session control in production artifact");
assert(testUser.includes("endButton.parentElement.insertBefore(button,endButton)"),"X must be placed immediately before native end-session control in test artifact");
assert(prodUser.includes("Desmarcar conversa (Esc)"),"X tooltip must describe deselection in production artifact");
assert(testUser.includes("Desmarcar conversa (Esc)"),"X tooltip must describe deselection in test artifact");

for(const [artifactName,artifact] of [["production",prodUser],["test",testUser]]){
  const queueStart=artifact.indexOf('// UpStatus: independent "Minha fila"');
  const queueEnd=artifact.indexOf("setInterval(function(){loadChat();},3000);",queueStart);
  assert(queueStart>=0&&queueEnd>queueStart,artifactName+" independent queue block missing");
  const queue=artifact.slice(queueStart,queueEnd);
  assert(queue.includes("function upStatusMyQueueFilter(items)"),artifactName+" custom queue filter missing");
  assert(queue.includes("props.items"),artifactName+" must read the virtual scroller's session data");
  assert(queue.includes("store.setChangeSession(session)"),artifactName+" must open conversations with the native selection action");
  assert(queue.includes("GM_setValue(UPSTATUS_MY_QUEUE_CLEAR_KEY,upStatusMyQueueClearBefore"),artifactName+" cleanup persistence missing");
  assert(!queue.includes("upstatus-awaiting-queue-hidden"),artifactName+" custom queue must not hide native rows with CSS");
  assert(!queue.includes("items.splice(")&&!queue.includes("state.list.splice("),artifactName+" custom queue must not mutate the native session list");
  assert(!queue.includes("CHAT_REMOVE_SESSION")&&!queue.includes("end_session"),artifactName+" custom queue must not remove/end sessions");
}
console.log("Validation OK: PROD "+baseVersion+" / TEST "+testVersion);
