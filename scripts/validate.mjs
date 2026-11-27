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
assert(headerValue(prodUser,"run-at")==="document-end"&&headerValue(testUser,"run-at")==="document-end","userscript must wait until the page DOM is ready");
for(const artifact of [prodUser,testUser]){
  assert(artifact.includes("function requestUpdateText(url){"),"updater must use the Tampermonkey request helper");
  assert(artifact.includes("GM_xmlhttpRequest({"),"updater must use GM_xmlhttpRequest to avoid page fetch/CORS failures");
  assert(artifact.includes("timeout:20000"),"updater requests must have a bounded timeout");
  assert(artifact.includes("function openUpdate(url)"),"updater must open the URL verified from the release manifest");
  assert(artifact.includes("mvjqunhjxkbfcrxkjtgf")&&artifact.includes("(?:upstatus|upstatus-test)"),"updater must allow the stable and beta routes on the live Supabase project");
  assert(artifact.includes("showUpdatePrompt(served,url)"),"update prompt must preserve the verified script URL");
  assert(artifact.includes("function(){openUpdate(url)}"),"manual update button must use the verified script URL");
  assert(!artifact.includes("fetch('https://raw.githubusercontent.com/Reekyi/UpStatus/master/release.json"),"updater must not use page-context fetch for its manifest");
}

assert(!testUser.includes("/functions/v1/upstatus/upstatus.user.js"),"test userscript contains production updateURL");
assert(prodUser.includes("var key='upstatus_screen_share_beta8_';"),"production storage prefix mismatch");
assert(testUser.includes("var key='upstatus_test_';"),"test storage prefix mismatch");
assert(prodUser.includes("var UP_REALTIME_TOPIC='upstatus-screen-share-live-3-1-1-beta10';"),"production realtime topic compatibility check");
assert(testUser.includes("var UP_REALTIME_TOPIC='upstatus-screen-share-live-3-1-1-beta10';"),"TEST must share the live realtime topic with production");
assert(prodUser.includes("var UP_RINGTONE_CHANNEL='upstatus-screen-share-3-1-1-beta9-2-ringtone-stop-v1';"),"production ringtone channel mismatch");
assert(testUser.includes("var UP_RINGTONE_CHANNEL='upstatus-screen-share-3-1-1-beta9-2-ringtone-stop-v1';"),"TEST must share the live ringtone channel");
assert(prodUser.includes("var upRingtoneStorageKey='upstatus_screen_share_beta8_ringtone_stop_bus';"),"production ringtone storage mismatch");
assert(testUser.includes("var upRingtoneStorageKey='upstatus_screen_share_beta8_ringtone_stop_bus';"),"TEST must share the live ringtone storage bus");
assert(prodFn.includes('const VERSION = "'+baseVersion+'";'),"production backend version mismatch");
assert(testFn.includes('const VERSION = "'+testVersion+'";'),"test backend version mismatch");
assert(prodFn.includes('const marker="/upstatus";'),"production path marker mismatch");
assert(testFn.includes('const marker="/upstatus-test";'),"test path marker mismatch");
assert(decodeHex(prodFn)===prodUser,"production embedded userscript does not match build output");
assert(decodeHex(testFn)===testUser,"test embedded userscript does not match build output");
checkSyntax(prodUser,"dist/upstatus.user.js");
checkSyntax(testUser,"dist/upstatus-test.user.js");
const bridgeMarker="s.textContent=`";
const bridgeStart=testUser.indexOf(bridgeMarker);
assert(bridgeStart>=0,"Sale Smartly page bridge must be present");
const bridgeBodyStart=bridgeStart+bridgeMarker.length;
const bridgeEnd=testUser.indexOf("`;",bridgeBodyStart);
assert(bridgeEnd>bridgeBodyStart,"Sale Smartly page bridge must close");
const pageBridge=new Function("return `"+testUser.slice(bridgeBodyStart,bridgeEnd)+"`;")();
checkSyntax(pageBridge,"inline Sale Smartly page bridge");
const visualStart=pageBridge.indexOf("function applySaleSmartlyStatusVisual(");
const visualEnd=pageBridge.indexOf("\\n      document.addEventListener('UPSTATUS_SET'",visualStart);
assert(visualStart>=0&&visualEnd>visualStart,"Reactive Sale Smartly status updater must be present");
const visualHelper=pageBridge.slice(visualStart,visualEnd);
const mockUser={name:"Ricardo",online_status:"1",status:"online"};
const mockTeam=[{name:"Ricardo",online_status:"1",status:"online"},{name:"Lohan",online_status:"2",status:"busy"},{name:"Guilherme",online_status:"0",status:"offline"}];
const mockPinia={_s:new Map([["user",{$state:{userInfo:mockUser}}],["team",{$state:{members:mockTeam}}],["orders",{$state:{order:{status:"open"}}}]])};
const mockApp={__vue_app__:{config:{globalProperties:{$pinia:mockPinia}},_instance:null}};
const mockDocument={querySelector(selector){return selector==="#app"?mockApp:null;}};
const mockWindow={dispatchEvent(){}};
function MockCustomEvent(type,options){this.type=type;this.detail=options&&options.detail;}
const applyStatus=new Function("document","window","CustomEvent",visualHelper+";return applySaleSmartlyStatusVisual;")(mockDocument,mockWindow,MockCustomEvent);
const visualResult=applyStatus("2","Ricardo");
assert(visualResult.updated&&visualResult.updatedFields>=2,"Status change must mutate the current user's reactive state and matching team row");
assert(mockUser.online_status==="2"&&mockUser.status==="busy","Current user visual status must reflect busy");
assert(mockTeam[0].online_status==="2"&&mockTeam[0].status==="busy","Matching team row must reflect the new status");
assert(mockTeam[1].online_status==="2"&&mockTeam[1].status==="busy","Unrelated team rows must remain unchanged");
assert(mockTeam[2].online_status==="0"&&mockTeam[2].status==="offline","Other team members must keep their status");
assert(mockPinia._s.get("orders").$state.order.status==="open","Non-user statuses must not be modified");
assert(testUser.includes("applySaleSmartlyStatusVisual(onlineStatus,detail.member||'')"),"Native UI update must run after a successful Sale Smartly status API response");
assert(testUser.includes("status:map[status],member:member"),"Current UpStatus member identity must be passed to the native UI updater");
assert(testUser.includes("visualUpdated:!!visual.updated"),"UI synchronization result must be returned to UpStatus");
assert(!testUser.includes("if(location.hostname==='app.salesmartly.com')setTimeout(function(){location.reload()},250)"),"Status updates must not reload the Sale Smartly page");
assert((testUser.match(/location\\.reload\\(\\)/g)||[]).length===1,"Only the explicit userscript update flow may reload the page");

assert(!prodFn.match(/lucca|ycaro/i),"production backend contains removed guest identities");
assert(!testFn.match(/lucca|ycaro/i),"TEST backend contains removed guest identities");
assert(!prodUser.match(/lucca|ycaro|icaro|luca/i),"production userscript contains removed guest UI");
assert(!testUser.replace("https://raw.githubusercontent.com/Reekyi/UpStatus/beta/3.5.0-beta.1-remove-lucca-ycaro/release.json","").match(/lucca|ycaro|icaro|luca/i),"TEST userscript contains removed guest UI outside its beta manifest branch URL");
assert(testFn.includes('if(!["Ricardo","Lohan","Guilherme"].includes(name))return null;'),"TEST account lookup must allow only the three current members");
assert(testFn.includes("needsSetup:!!a&&!a.password_hash"),"Removed accounts must not be offered password setup");
assert(prodFn.includes("async function contextName(req:Request)")&&prodFn.includes("const ctx=await contextName(req);"),"production backend must resolve authenticated session context");
assert(testFn.includes("async function contextName(req:Request)")&&testFn.includes("const ctx=await contextName(req);"),"TEST backend must resolve authenticated session context");
assert(testFn.includes("if(!name||![\"Ricardo\",\"Lohan\",\"Guilherme\"].includes(name))return null;"),"TEST session context must reject non-allowlisted accounts");
assert(testFn.includes('.in("name",["Ricardo","Lohan","Guilherme"])'),"TEST status and health payloads must expose only the active team");
assert(testFn.includes('filter((m:any)=>["Ricardo","Lohan","Guilherme","Sistema"].includes(String(m.user_name)))'),"TEST chat history must exclude removed identities");
assert(testUser.includes("var CLOUD_SERVER='https://mvjqunhjxkbfcrxkjtgf.supabase.co/functions/v1/upstatus-test';"),"TEST API must share the production database project");
assert(testUser.includes("raw.githubusercontent.com/Reekyi/UpStatus/beta/3.5.0-beta.1-remove-lucca-ycaro/release.json"),"TEST updater must read the beta channel manifest");
assert(testUser.includes('var remotePreRelease=String(manifest.preRelease||\'\').trim();'),"updater must compare full prerelease versions");

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
execFileSync(process.execPath,[path.join(ROOT,"scripts/chat-upload-url.test.mjs")],{stdio:"inherit"});
console.log("Validation OK: PROD "+baseVersion+" / TEST "+testVersion);
