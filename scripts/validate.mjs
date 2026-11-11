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
const buildManifest=JSON.parse(fs.readFileSync(path.join(ROOT,"dist/build-manifest.json"),"utf8"));
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
const buildSource=fs.readFileSync(path.join(ROOT,"scripts/build.mjs"),"utf8");
const expectedProductionUpdateUrl=String(release.scriptUrl||"").trim();
const productionProject=buildSource.match(/const PROJECT="([^"]+)";/)?.[1];
const productionFunction=buildSource.match(/const PROD_FUNCTION="([^"]+)";/)?.[1];
const productionApiFunction=buildSource.match(/const PROD_API_FUNCTION="([^"]+)";/)?.[1];
const testFunction=buildSource.match(/const TEST_FUNCTION="([^"]+)";/)?.[1];
const prodApiFn=productionApiFunction?fs.readFileSync(path.join(ROOT,"supabase/functions",productionApiFunction,"index.ts"),"utf8"):"";
assert(buildManifest.productionApiFunction===productionApiFunction,"build manifest production API function mismatch");
assert(prodApiFn.includes('const VERSION = "'+baseVersion+'";'),"production API backend version mismatch");
assert(prodApiFn.includes('const marker="/'+productionApiFunction+'";'),"production API path marker mismatch");
assert(decodeHex(prodApiFn)===prodUser,"production API runtime embedded userscript does not match production distribution artifact");
assert(prodUser.includes("var CLOUD_SERVER='https://"+productionProject+".supabase.co/functions/v1/"+productionApiFunction+"';"),"production userscript must target the generated API runtime");
assert(prodApiFn.includes('file_name:type==="document"&&fileName?fileName:null'),"production API runtime must persist document file_name");
assert(prodApiFn.includes("const isAdmin=await admin(name);"),"production API runtime must authorize chat clear by stored admin role");
assert(!prodApiFn.includes('if(name!=="Ricardo")return response({error:"Somente Ricardo pode limpar o chat."},403);'),"production API runtime must not retain fixed-name chat-clear authorization");
assert(prodApiFn.includes('if(path==="/api/chat/upload-url"&&req.method==="POST")'),"production API runtime signed-upload route missing");
assert(prodApiFn.includes('async function signedUploadRoute(req:Request,kind:"chat"|"avatar")'),"production API signed-upload handler missing");
assert(prodApiFn.includes("createSignedUploadUrl(path,{upsert:true})"),"production API must create a signed Storage upload URL");
assert(prodApiFn.includes('if(path==="/api/profile/avatar-upload-url"&&req.method==="POST")'),"production API avatar signed-upload route missing");
assert(prodApiFn.includes("if(p.avatarUrl){"),"production API profile route must accept a completed signed avatar upload");
assert(prodApiFn.includes("new URL(PROJECT_URL).origin"),"production API must restrict avatar URLs to the current Supabase project");
assert(prodApiFn.includes("Number.isSafeInteger(size)"),"production API must reject fractional or unsafe upload sizes");

const apiAsDistribution=prodApiFn.replace('const marker="/'+productionApiFunction+'";','const marker="/'+productionFunction+'";');
assert(apiAsDistribution===prodFn,"production API runtime must match the reviewed distribution backend except for its function path marker");

assert(expectedProductionUpdateUrl,"release.json production scriptUrl missing");
assert(headerValue(prodUser,"updateURL")===expectedProductionUpdateUrl,"production updateURL must match release.json scriptUrl");
assert(headerValue(prodUser,"downloadURL")===expectedProductionUpdateUrl,"production downloadURL must match release.json scriptUrl");
assert(productionProject&&productionFunction&&productionApiFunction&&testFunction,"production release/API and TEST targets must be explicit in build configuration");
assert(expectedProductionUpdateUrl==="https://"+productionProject+".supabase.co/functions/v1/"+productionFunction+"/upstatus.user.js","release.json scriptUrl must point to the production userscript function");
assert(prodUser.includes("var CLOUD_SERVER='https://"+productionProject+".supabase.co/functions/v1/"+productionApiFunction+"';"),"production API cloud server must match its separately configured API function target");
assert(headerValue(testUser,"updateURL").includes("/upstatus-test/upstatus.user.js"),"test updateURL mismatch");
assert(!testUser.includes("/functions/v1/upstatus/upstatus.user.js"),"test userscript contains production updateURL");
assert(prodUser.includes("var UPDATE_URL='"+expectedProductionUpdateUrl+"';"),"production manual update URL must match release.json scriptUrl");
assert(testUser.includes("var UPDATE_URL='https://"+productionProject+".supabase.co/functions/v1/"+testFunction+"/upstatus.user.js';"),"TEST manual update URL must remain on the TEST function");
assert(prodUser.includes("var RELEASE_MANIFEST_URL='https://raw.githubusercontent.com/Reekyi/UpStatus/master/release.json';"),"production automatic updater must use the official release manifest");
assert(prodUser.includes("var RELEASE_SCRIPT_URL='"+expectedProductionUpdateUrl+"';"),"production automatic updater must use release.json scriptUrl");
assert(testUser.includes("var RELEASE_MANIFEST_URL='';")&&testUser.includes("var RELEASE_SCRIPT_URL='';"),"TEST automatic updater must not consume production release metadata");
assert(!testUser.includes("https://raw.githubusercontent.com/Reekyi/UpStatus/master/release.json"),"TEST artifact must not fetch the production release manifest");
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
