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

const luccaHtml=fs.readFileSync(path.join(ROOT,"lucca-site/index.html"),"utf8");
const ycaroHtml=fs.readFileSync(path.join(ROOT,"ycaro.html"),"utf8");
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
console.log("Validation OK: PROD "+baseVersion+" / TEST "+testVersion);
