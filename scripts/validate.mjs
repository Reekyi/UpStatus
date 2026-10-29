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
function assert(ok,msg){if(!ok)throw new Error("VALIDATION FAILED: "+msg);}
function headerValue(text,name){const m=text.match(new RegExp("^// @"+name+"\\s+(.+)$","m"));return m?m[1].trim():"";}
function decodeHex(code){const m=code.match(/const USERSCRIPT_HEX = "([0-9a-f]+)";/i);assert(m,"USERSCRIPT_HEX missing");return Buffer.from(m[1],"hex").toString("utf8");}
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
