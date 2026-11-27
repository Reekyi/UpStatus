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
const stableVersion="3.5.0";
const stagingProject="akbgmmpnnpwcwgcfrltw";
assert(baseVersion==="3.5.1"&&preRelease==="beta.1"&&testVersion==="3.5.1-beta.1","TEST manifest must identify 3.5.1-beta.1");
assert(release.scriptUrl==="https://"+stagingProject+".supabase.co/functions/v1/upstatus-test/upstatus.user.js","Beta manifest must point only to the Staging TEST userscript URL");
const productionWorkflow=fs.readFileSync(path.join(ROOT,".github/workflows/deploy-production.yml"),"utf8");
assert(productionWorkflow.includes("r.version !== '3.5.0'")&&!productionWorkflow.includes("r.version !== '3.4.7'"),"Production workflow guard must allow only the approved stable 3.5.0 release");

const prodFn=fs.readFileSync(path.join(ROOT,"supabase/functions/upstatus/index.ts"),"utf8");
const testFn=fs.readFileSync(path.join(ROOT,"supabase/functions/upstatus-test/index.ts"),"utf8");
const prodUser=fs.readFileSync(path.join(ROOT,"dist/upstatus.user.js"),"utf8");
const testUser=fs.readFileSync(path.join(ROOT,"dist/upstatus-test.user.js"),"utf8");
function assert(ok,msg){if(!ok)throw new Error("VALIDATION FAILED: "+msg);}
function headerValue(text,name){const m=text.match(new RegExp("^// @"+name+"\\s+(.+)$","m"));return m?m[1].trim():"";}
function decodeHex(code){const m=code.match(/const USERSCRIPT_HEX = "([0-9a-f]+)";/i);assert(m,"USERSCRIPT_HEX missing");return Buffer.from(m[1],"hex").toString("utf8");}
function checkSyntax(text,label){new vm.Script(text,{filename:label});}
assert(headerValue(prodUser,"version")===stableVersion,"production userscript must remain on official 3.5.0");
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
assert(testUser.includes("var key='upstatus_staging_351_beta1_';"),"staging beta storage prefix mismatch");
assert(prodUser.includes("var UP_REALTIME_TOPIC='upstatus-screen-share-live-3-1-1-beta10';"),"production realtime topic compatibility check");
assert(testUser.includes("var UP_REALTIME_TOPIC='upstatus-screen-share-staging-3-5-1-beta1';"),"TEST must use its isolated Staging Realtime topic");
assert(prodUser.includes("var UP_REALTIME_URL='https://mvjqunhjxkbfcrxkjtgf.supabase.co';"),"Production Realtime must point to the active Supabase project");
assert(testUser.includes("var UP_REALTIME_URL='https://akbgmmpnnpwcwgcfrltw.supabase.co';"),"TEST Realtime must point to the Staging project");
assert(!prodUser.includes("dlfvkawaiqduhlazsszm.supabase.co")&&!testUser.includes("dlfvkawaiqduhlazsszm.supabase.co"),"Obsolete Supabase host must not remain in generated clients");
assert(testUser.includes("var UP_REALTIME_KEY='sb_publishable_YZKmAyA19mkOfByJ5Y-Cmg_VbNnNkbA';"),"TEST Realtime must use the Staging project publishable key");
assert(prodUser.includes("var UP_REALTIME_KEY='sb_publishable_4_dLUWGGqyPP0prupYq8Jw_DTLJ2FlQ';"),"Production build must retain the active project's enabled publishable key");

assert(prodUser.includes("var UP_RINGTONE_CHANNEL='upstatus-screen-share-3-1-1-beta9-2-ringtone-stop-v1';"),"production ringtone channel mismatch");
assert(testUser.includes("var UP_RINGTONE_CHANNEL='upstatus-3-5-1-beta1-ringtone-stop';"),"TEST must use an isolated beta ringtone channel");
assert(prodUser.includes("var upRingtoneStorageKey='upstatus_screen_share_beta8_ringtone_stop_bus';"),"production ringtone storage mismatch");
assert(testUser.includes("var upRingtoneStorageKey='upstatus_staging_3_5_1_beta1_ringtone_stop';"),"TEST must use an isolated beta ringtone storage bus");
assert(prodFn.includes('const VERSION = "'+stableVersion+'";'),"production backend must remain on official 3.5.0");
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
assert(testUser.includes("statusMessageTimer=setTimeout(function(){")&&testUser.includes("},3000);"),"Inline messages must auto-dismiss after three seconds");
assert(testUser.includes(".up-message.up-message-visible")&&testUser.includes(".up-message.up-message-leaving"),"Inline messages must use visible and exit animation states");
assert(testUser.includes("chatErrorToastTimer=setTimeout(function(){")&&testUser.includes("},3000);"),"Chat error notices must auto-dismiss after three seconds");
assert(testUser.includes("toast.style.opacity='0'")&&testUser.includes("toast.style.transform='translateY(-5px)'"),"Chat error notices must fade and slide away");
assert(testUser.includes("setTimeout(function(){removeToast(m.id)},3000)"),"Chat notification toasts must use the same three-second lifetime");

const messageStart=testUser.indexOf("var statusMessageTimer=null,statusMessageRemoveTimer=null;");
const messageEnd=testUser.indexOf("var chatErrorToastTimer=null,chatErrorToastRemoveTimer=null;",messageStart);
assert(messageStart>=0&&messageEnd>messageStart,"Auto-dismiss message helper must be extractable for unit testing");
const messageUnitSource=testUser.slice(messageStart,messageEnd);
assert(!messageUnitSource.includes("up-notice"),"Persistent Sale Smartly connection indicator must not be auto-dismissed with transient messages");
const fakeTimers=[];
let fakeTimerId=0;
function fakeSetTimeout(fn,delay){const item={id:++fakeTimerId,fn,delay};fakeTimers.push(item);return item.id;}
function fakeClearTimeout(id){const index=fakeTimers.findIndex(x=>x.id===id);if(index>=0)fakeTimers.splice(index,1);}
const messageClasses=new Set();
const messageNode={textContent:"",style:{},classList:{add(name){messageClasses.add(name);},remove(name){messageClasses.delete(name);},contains(name){return messageClasses.has(name);}}};
const messageCard={querySelector(selector){return selector===".up-message"?messageNode:null;}};
const messageFn=new Function("card","setTimeout","clearTimeout",messageUnitSource+";return message;")(messageCard,fakeSetTimeout,fakeClearTimeout);
messageFn("Status atualizado no Sale Smartly, sem recarregar a página.",false);
assert(messageNode.textContent==="Status atualizado no Sale Smartly, sem recarregar a página."&&messageClasses.has("up-message-visible"),"Inline success notice must appear immediately");
const messageTimer=fakeTimers.find(x=>x.delay===3000);
assert(!!messageTimer,"Inline notice timer must be exactly three seconds");
messageTimer.fn();
assert(messageClasses.has("up-message-leaving")&&!messageClasses.has("up-message-visible"),"Inline notice must enter its exit animation after three seconds");
const removeTimer=fakeTimers.find(x=>x.delay===220);
assert(!!removeTimer,"Inline notice should use a short exit animation");
removeTimer.fn();
assert(messageNode.textContent===""&&!messageClasses.has("up-message-leaving"),"Inline notice must clear after the exit animation");

const visualStart=pageBridge.indexOf("function getSaleSmartlyCurrentUserStore(");
const visualEnd=pageBridge.indexOf("\n      document.addEventListener('UPSTATUS_APPLY_VISUAL'",visualStart);
assert(visualStart>=0&&visualEnd>visualStart,"Native Sale Smartly status integration helpers must be present");
const visualHelper=pageBridge.slice(visualStart,visualEnd);
const mockRicardoState={nickname:"Ricardo Implementação",onlineStatus:"1",canSelectOnlineStatuses:["0","1","2"]};
const mockRicardoStore={
  $state:mockRicardoState,
  lastSwitch:null,
  setOnlineStatus(code){this.$state.onlineStatus=String(code);},
  async switchOnlineStatus(payload){
    this.lastSwitch=payload;
    this.setOnlineStatus(payload.online_status);
    return {code:0};
  }
};
const mockOrders={ $state:{order:{status:"open"}} };
const mockPinia={_s:new Map([["user",mockRicardoStore],["orders",mockOrders]])};
const mockApp={__vue_app__:{config:{globalProperties:{$pinia:mockPinia}}}};
const mockDocument={querySelector(selector){return selector==="#app"?mockApp:null;}};
const nativeStatus=new Function("document",visualHelper+";return {applySaleSmartlyStatusVisual,switchSaleSmartlyStatusNative};")(mockDocument);
const ownResult=await nativeStatus.switchSaleSmartlyStatusNative("2","Ricardo");
assert(ownResult.updated&&ownResult.updatedFields===1,"Native status action must confirm the local user's reactive status");
assert(mockRicardoStore.lastSwitch.online_status==="2"&&mockRicardoStore.lastSwitch.event_type==="0","UpStatus must call the official Sale Smartly Pinia switchOnlineStatus action");
assert(mockRicardoState.onlineStatus==="2","Ricardo's native onlineStatus state must reflect the selected status");
const wrongMember=nativeStatus.applySaleSmartlyStatusVisual("0","Lohan");
assert(!wrongMember.updated&&mockRicardoState.onlineStatus==="2","A remote colleague event must never overwrite the current user's own status");
const mockLohanState={nickname:"Lohan",onlineStatus:"1",canSelectOnlineStatuses:["0","1","2"]};
const mockLohanStore={
  $state:mockLohanState,
  lastSwitch:null,
  setOnlineStatus(code){this.$state.onlineStatus=String(code);},
  async switchOnlineStatus(payload){
    this.lastSwitch=payload;
    this.setOnlineStatus(payload.online_status);
    return {code:0};
  }
};
mockPinia._s.set("user",mockLohanStore);
const remoteTargetResult=await nativeStatus.switchSaleSmartlyStatusNative("0","Lohan");
assert(remoteTargetResult.updated&&mockLohanState.onlineStatus==="0","Remote command must update the target member's own Sale Smartly Pinia store");
assert(mockRicardoState.onlineStatus==="2","Updating Lohan must not mutate Ricardo's store");
assert(mockOrders.$state.order.status==="open","Sale Smartly order statuses must remain untouched");
const blockedState={nickname:"Guilherme",onlineStatus:"1",canSelectOnlineStatuses:["1","2"]};
const blockedStore={ $state:blockedState, async switchOnlineStatus(){throw new Error("must not execute a disabled status");} };
mockPinia._s.set("user",blockedStore);
let blockedStatus=false;
try{await nativeStatus.switchSaleSmartlyStatusNative("0","Guilherme");}catch(e){blockedStatus=true;}
assert(blockedStatus&&blockedState.onlineStatus==="1","Native allowed-status restrictions must be respected");
assert(testUser.includes(".on('broadcast',{event:'user_status'},function(payload)"),"Realtime user_status broadcasts must update each connected native Sales Smartly page");
assert(testUser.includes("sendRealtimeEvent('user_status',{name:member,status:status})"),"Own status changes must broadcast a native visual update");
assert(testUser.includes("sendRealtimeEvent('user_status',{name:member,status:c.status})"),"Remote status commands must broadcast a native visual update");
assert(mockPinia._s.get("orders").$state.order.status==="open","Non-user statuses must not be modified");
assert(testUser.includes("switchSaleSmartlyStatusNative(detail.status,detail.member||'')"),"Status changes must use Sale Smartly native Pinia action");
assert(testUser.includes("state&&state.nickname")&&testUser.includes("state.onlineStatus"),"Native update must validate the active account and update only its confirmed onlineStatus field");
assert(testUser.includes("visualUpdated:!!visual.updated"),"Native Pinia synchronization result must be returned to UpStatus");
assert(!testUser.includes("if(location.hostname==='app.salesmartly.com')setTimeout(function(){location.reload()},250)"),"Status updates must not reload the Sale Smartly page");
assert((testUser.match(/location\.reload\(\)/g)||[]).length===1,"Only the explicit userscript update flow may reload the page");

assert(!prodFn.match(/lucca|ycaro/i),"production backend contains removed guest identities");
assert(!testFn.match(/lucca|ycaro/i),"TEST backend contains removed guest identities");
assert(!prodUser.match(/lucca|ycaro|icaro|luca/i),"production userscript contains removed guest UI");
assert(!testUser.replace("https://raw.githubusercontent.com/Reekyi/UpStatus/beta/3.5.1-beta.1-ui-fixes/release.json","").match(/lucca|ycaro|icaro|luca/i),"TEST userscript contains removed guest UI outside its beta manifest branch URL");
assert(testFn.includes('if(!["Ricardo","Lohan","Guilherme"].includes(name))return null;'),"TEST account lookup must allow only the three current members");
assert(testFn.includes("needsSetup:!!a&&!a.password_hash"),"Removed accounts must not be offered password setup");
assert(prodFn.includes("async function contextName(req:Request)")&&prodFn.includes("const ctx=await contextName(req);"),"production backend must resolve authenticated session context");
assert(testFn.includes("async function contextName(req:Request)")&&testFn.includes("const ctx=await contextName(req);"),"TEST backend must resolve authenticated session context");
assert(testFn.includes("if(!name||![\"Ricardo\",\"Lohan\",\"Guilherme\"].includes(name))return null;"),"TEST session context must reject non-allowlisted accounts");
assert(testFn.includes('.in("name",["Ricardo","Lohan","Guilherme"])'),"TEST status and health payloads must expose only the active team");
assert(testFn.includes('filter((m:any)=>["Ricardo","Lohan","Guilherme","Sistema"].includes(String(m.user_name)))'),"TEST chat history must exclude removed identities");
assert(testUser.includes("var CLOUD_SERVER='https://akbgmmpnnpwcwgcfrltw.supabase.co/functions/v1/upstatus-test';"),"TEST API must use only the Staging project");
assert(testUser.includes("raw.githubusercontent.com/Reekyi/UpStatus/beta/3.5.1-beta.1-ui-fixes/release.json"),"TEST updater must read the 3.5.1-beta.1 branch manifest");
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

assert(testUser.includes("var UP_ALLOWED_MEMBERS=['Ricardo','Lohan','Guilherme'];"),"Client allowlist must contain only the three current team members");
assert(testUser.includes("function upFilterMembers(items)"),"Client must filter user lists at the boundary");
assert(testUser.includes("var names=upFilterMembers(window.__upstatusMembers)"),"Mention menu must filter stale API member names");
assert(testUser.includes("users=upFilterMembers(d&&d.members||[])"),"System health must filter stale API member names");
assert(testUser.includes("!upIsAllowedMember(p.from)"),"Call signals from removed identities must be ignored");
assert(testUser.includes("upstatus-351-empty-artwork")&&testUser.includes("pointer-events:none!important"),"Waiting-state illustration must not intercept clicks and must stay constrained");
assert(testUser.includes(".up-login-update{display:flex!important;flex-wrap:nowrap!important"),"Login update footer must remain on one line");
assert(testUser.includes("up-chat-record-cancel-icon")&&testUser.includes("width:34px!important;height:34px!important"),"Audio cancel control must use a larger centered SVG button");
assert(testUser.includes("#upstatus-root.up-theme-light .up-voice-actions button")&&testUser.includes("#upstatus-root.up-theme-light .up-voice-control-bubble>button"),"Light-mode call control styles must cover both call surfaces");

console.log("Validation OK: PROD "+stableVersion+" / TEST "+testVersion+" (Staging isolated)");
