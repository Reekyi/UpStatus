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
const liveProject="mvjqunhjxkbfcrxkjtgf";
const betaFunction="upstatus-351-test";
assert(baseVersion==="3.5.1"&&preRelease==="beta.2"&&testVersion==="3.5.1-beta.2","TEST manifest must identify 3.5.1-beta.2");
assert(release.scriptUrl==="https://"+liveProject+".supabase.co/functions/v1/"+betaFunction+"/upstatus.user.js","Beta manifest must point only to the isolated live-integration TEST installer");
const productionWorkflow=fs.readFileSync(path.join(ROOT,".github/workflows/deploy-production.yml"),"utf8");
assert(productionWorkflow.includes("r.version !== '3.5.0'")&&!productionWorkflow.includes("r.version !== '3.4.7'"),"Production workflow guard must allow only the approved stable 3.5.0 release");

const prodFn=fs.readFileSync(path.join(ROOT,"supabase/functions/upstatus/index.ts"),"utf8");
const testFn=fs.readFileSync(path.join(ROOT,"supabase/functions/upstatus-351-test/index.ts"),"utf8");
const prodUser=fs.readFileSync(path.join(ROOT,"dist/upstatus.user.js"),"utf8");
const testUser=fs.readFileSync(path.join(ROOT,"dist/upstatus-351-test.user.js"),"utf8");
function assert(ok,msg){if(!ok)throw new Error("VALIDATION FAILED: "+msg);}
function headerValue(text,name){const m=text.match(new RegExp("^// @"+name+"\\s+(.+)$","m"));return m?m[1].trim():"";}
function decodeHex(code){const m=code.match(/const USERSCRIPT_HEX = "([0-9a-f]+)";/i);assert(m,"USERSCRIPT_HEX missing");return Buffer.from(m[1],"hex").toString("utf8");}
function checkSyntax(text,label){new vm.Script(text,{filename:label});}
assert(headerValue(prodUser,"version")===stableVersion,"production userscript must remain on official 3.5.0");
assert(headerValue(testUser,"version")===testVersion,"test userscript version mismatch");
assert(headerValue(prodUser,"namespace")==="upseller","production namespace mismatch");
assert(headerValue(testUser,"namespace")==="upseller-test","test namespace mismatch");
assert(headerValue(prodUser,"updateURL").includes("/upstatus/upstatus.user.js"),"production updateURL mismatch");
assert(headerValue(testUser,"updateURL").includes("/upstatus-351-test/upstatus.user.js"),"test updateURL mismatch");
assert(headerValue(prodUser,"run-at")==="document-end"&&headerValue(testUser,"run-at")==="document-end","userscript must wait until the page DOM is ready");
for(const artifact of [prodUser,testUser]){
  assert(artifact.includes("function requestUpdateText(url){"),"updater must use the Tampermonkey request helper");
  assert(artifact.includes("GM_xmlhttpRequest({"),"updater must use GM_xmlhttpRequest to avoid page fetch/CORS failures");
  assert(artifact.includes("timeout:20000"),"updater requests must have a bounded timeout");
  assert(artifact.includes("function openUpdate(url)"),"updater must open the URL verified from the release manifest");
  assert(artifact.includes("mvjqunhjxkbfcrxkjtgf")&&artifact.includes("(?:upstatus|upstatus-test|upstatus-351-test)"),"updater must allow stable, Beta 5 and isolated Beta 2 routes on the live Supabase project");
  assert(artifact.includes("showUpdatePrompt(served,url)"),"update prompt must preserve the verified script URL");
  assert(artifact.includes("function(){openUpdate(url)}"),"manual update button must use the verified script URL");
  assert(!artifact.includes("fetch('https://raw.githubusercontent.com/Reekyi/UpStatus/master/release.json"),"updater must not use page-context fetch for its manifest");
}

assert(!testUser.includes("/functions/v1/upstatus/upstatus.user.js"),"test userscript contains production updateURL");
assert(prodUser.includes("var key='upstatus_screen_share_beta8_';"),"production storage prefix mismatch");
assert(testUser.includes("var key='upstatus_351_beta2_';"),"Beta 2 local storage prefix mismatch");
assert(prodUser.includes("var UP_REALTIME_TOPIC='upstatus-screen-share-live-3-1-1-beta10';"),"production realtime topic compatibility check");
assert(testUser.includes("var UP_REALTIME_TOPIC='upstatus-screen-share-live-3-1-1-beta10';"),"Beta 2 must share the live-team Realtime topic");
assert(prodUser.includes("var UP_REALTIME_URL='https://mvjqunhjxkbfcrxkjtgf.supabase.co';"),"Production Realtime must point to the active Supabase project");
assert(testUser.includes("var UP_REALTIME_URL='https://mvjqunhjxkbfcrxkjtgf.supabase.co';"),"Beta 2 Realtime must point to the live project");
assert(!prodUser.includes("dlfvkawaiqduhlazsszm.supabase.co")&&!testUser.includes("dlfvkawaiqduhlazsszm.supabase.co"),"Obsolete Supabase host must not remain in generated clients");
assert(testUser.includes("var UP_REALTIME_KEY='sb_publishable_4_dLUWGGqyPP0prupYq8Jw_DTLJ2FlQ';"),"Beta 2 Realtime must use the live project's publishable key");
assert(prodUser.includes("var UP_REALTIME_KEY='sb_publishable_4_dLUWGGqyPP0prupYq8Jw_DTLJ2FlQ';"),"Production build must retain the active project's enabled publishable key");

assert(prodUser.includes("var UP_RINGTONE_CHANNEL='upstatus-screen-share-3-1-1-beta9-2-ringtone-stop-v1';"),"production ringtone channel mismatch");
assert(testUser.includes("var UP_RINGTONE_CHANNEL='upstatus-screen-share-3-1-1-beta9-2-ringtone-stop-v1';"),"Beta 2 must share live-team ringtone coordination");
assert(prodUser.includes("var upRingtoneStorageKey='upstatus_screen_share_beta8_ringtone_stop_bus';"),"production ringtone storage mismatch");
assert(testUser.includes("var upRingtoneStorageKey='upstatus_screen_share_beta8_ringtone_stop_bus';"),"Beta 2 must share live-team ringtone storage coordination");
assert(prodFn.includes('const VERSION = "'+stableVersion+'";'),"production backend must remain on official 3.5.0");
assert(testFn.includes('const VERSION = "'+testVersion+'";'),"test backend version mismatch");
assert(prodFn.includes('const marker="/upstatus";'),"production path marker mismatch");
assert(testFn.includes('const marker="/upstatus-351-test";'),"Beta 2 backend path marker mismatch");
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
const mockDocument={querySelector(selector){return selector==="#app"?mockApp:null;},addEventListener(){}};
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
assert(!testUser.replace("https://raw.githubusercontent.com/Reekyi/UpStatus/beta/3.5.1-beta.2-agenda-status-mirror/release.json","").match(/lucca|ycaro|icaro|luca/i),"Beta 2 userscript contains removed guest UI outside its beta manifest branch URL");
assert(testFn.includes('if(!["Ricardo","Lohan","Guilherme"].includes(name))return null;'),"TEST account lookup must allow only the three current members");
assert(testFn.includes("needsSetup:!!a&&!a.password_hash"),"Removed accounts must not be offered password setup");
assert(prodFn.includes("async function contextName(req:Request)")&&prodFn.includes("const ctx=await contextName(req);"),"production backend must resolve authenticated session context");
assert(testFn.includes("async function contextName(req:Request)")&&testFn.includes("const ctx=await contextName(req);"),"TEST backend must resolve authenticated session context");
assert(testFn.includes("if(!name||![\"Ricardo\",\"Lohan\",\"Guilherme\"].includes(name))return null;"),"TEST session context must reject non-allowlisted accounts");
assert(testFn.includes('.in("name",["Ricardo","Lohan","Guilherme"])'),"TEST status and health payloads must expose only the active team");
assert(testFn.includes('filter((m:any)=>["Ricardo","Lohan","Guilherme","Sistema"].includes(String(m.user_name)))'),"TEST chat history must exclude removed identities");
assert(testUser.includes("var CLOUD_SERVER='https://mvjqunhjxkbfcrxkjtgf.supabase.co/functions/v1/upstatus-351-test';"),"Beta 2 API must use the dedicated live integration function");
assert(testUser.includes("raw.githubusercontent.com/Reekyi/UpStatus/beta/3.5.1-beta.2-agenda-status-mirror/release.json"),"Beta 2 updater must read the Beta 2 branch manifest");
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
assert(testUser.includes("upStatusBeta2EmptyArtworkLayout")&&testUser.includes("upstatus-351-empty-art-wrap")&&testUser.includes("position:relative!important")&&testUser.includes("pointer-events:none!important"),"Waiting artwork must stay constrained in normal flow and not intercept clicks");
assert(testUser.includes(".up-login-update{display:flex!important;flex-wrap:nowrap!important"),"Login update footer must remain on one line");
assert(testUser.includes("up-chat-record-cancel-icon")&&testUser.includes("width:34px!important;height:34px!important"),"Audio cancel control must use a larger centered SVG button");
assert(testUser.includes("#upstatus-root.up-theme-light .up-voice-actions .up-voice-mute")&&testUser.includes("#upstatus-root.up-theme-light .up-voice-actions .up-voice-speakers")&&testUser.includes("#upstatus-root.up-theme-light .up-voice-actions .up-screen-share-toggle"),"Light-mode room controls must style mic, speaker and screen share individually");
assert(testUser.includes("#upstatus-root.up-theme-light .up-voice-control-bubble .up-voice-control-mute")&&testUser.includes("#upstatus-root.up-theme-light .up-voice-control-bubble .up-voice-control-speakers")&&testUser.includes("#upstatus-root.up-theme-light .up-voice-control-bubble .up-voice-control-screen"),"Light-mode mini controls must style mic, speaker and screen share individually");
assert(testUser.includes(".up-voice-actions .up-voice-leave")&&testUser.includes(".up-voice-control-bubble .up-voice-control-leave"),"Leave control must be explicitly styled on both surfaces");


assert(testUser.includes("function upStatusBindStatusWatcher(name)")&&testUser.includes("store.$subscribe("),"Sale Smartly Pinia watcher must be installed");
assert(testUser.includes("UPSTATUS_SALE_STATUS_SNAPSHOT")&&testUser.includes("UPSTATUS_SALE_STATUS_CHANGED"),"Initial Sale Smartly status and direct changes must be mirrored separately");
assert(testUser.includes("upStatusMarkExpected(code)"),"Programmatic writes must be suppressed in the native watcher");
const statusPosts=[...testUser.matchAll(/api\('POST','\/api\/status',\{([^}]*)\}\)/g)];
assert(statusPosts.length>=4&&statusPosts.every(m=>m[1].includes("confirmedBySaleSmartly:true")),"Every status write must require Sale Smartly confirmation");
assert(testFn.includes('if(p.confirmedBySaleSmartly!==true)'),"Server must reject status writes without Sale Smartly confirmation");
assert(testFn.includes('if(path==="/api/agenda")')&&testFn.includes('if(path==="/api/agenda/reconcile"')&&testFn.includes('if(path==="/api/agenda/reconcile/fail"'),"Agenda endpoints must exist");
assert(testFn.includes('name!=="Ricardo"')&&testFn.includes("AGENDA_TRAINING_SLOTS"),"Only Ricardo may define daily training slots");
assert(testFn.includes('config.weeks[weekStart]=owner')&&testFn.includes('name!=="Ricardo"'),"Only Ricardo may define the weekly workshop owner");
assert(testFn.includes('canEditTeam:name==="Ricardo"'),"Agenda edit permission must be restricted to Ricardo");
assert(testFn.includes('timeZone:"America/Sao_Paulo"')&&testFn.includes('minute>=18*60'),"Schedule must use Sao Paulo time and the 18:00 end-of-day rule");
assert(testFn.includes('minute>=12*60&&minute<13*60')&&testFn.includes('minute>=13*60&&minute<14*60'),"Lunch schedule must support noon and 13:00 options");
assert(testFn.includes('minute>=15*60&&minute<17*60'),"Weekly workshop must pause 15:00-17:00");
assert(testUser.includes("data-agenda-lunch")&&testUser.includes("data-agenda-training")&&testUser.includes("data-agenda-aulao"),"Agenda UI must render lunch, daily training and weekly workshop controls");
assert(testUser.includes("var own=n===member,editable=own")&&testUser.includes("(canEdit?'':'disabled')"),"Only each member's own lunch is editable; training/workshop controls are read-only for Lohan and Guilherme");
assert(testUser.includes("var boundaries=[10*60,11*60,12*60,13*60,14*60,15*60,16*60,17*60,18*60]"),"Local scheduler must reconcile at schedule boundaries");
assert(testUser.includes("function openAgenda()")&&testUser.includes("up-settings-agenda"),"Agenda must open from the settings menu");
assert(testUser.includes("up-agenda-week-chip")&&testUser.includes("up-agenda-section-aulao")&&testUser.includes("A escolha permanece salva até o fim desta semana."),"Agenda must make the weekly Aulão persistence visible to team members");
assert(testUser.includes("up-agenda-title-mark")&&testUser.includes("up-agenda-section-head")&&testUser.includes("up-agenda-section-tag"),"Agenda must use the polished title, section icon and cadence-badge layout");
assert(testUser.includes("up-agenda-section-aulao")&&testUser.includes("up-agenda-weekly-note"),"Aulão must have a distinct weekly visual section");
assert(testUser.includes("up-settings-history")&&!testUser.includes('class="up-history-btn hidden"'),"History must move into settings instead of the main header");
assert(testUser.includes("agendaReconcileQueued")&&testUser.includes("setTimeout(function(){agendaReconcile();},0)"),"Concurrent agenda reconciliations must be serialized");


function extractFunction(source,startSignature,endSignature,replacements=[]){
  const start=source.indexOf(startSignature);
  const end=endSignature?source.indexOf(endSignature,start):-1;
  assert(start>=0&&(!endSignature||end>start),"Could not extract "+startSignature+" for agenda regression tests");
  let code=source.slice(start,end>=0?end:source.length);
  for(const [from,to] of replacements)code=code.replace(from,to);
  return code;
}
const weekStartCode=extractFunction(testFn,"function agendaWeekStart(","function agendaCurrentEvent(",[
  ["function agendaWeekStart(dateKey:string)","function agendaWeekStart(dateKey)"]
]);
const agendaEventCode=extractFunction(testFn,"function agendaCurrentEvent(","async function agendaView(",[
  ["function agendaCurrentEvent(name:string,config:any,now=new Date())","function agendaCurrentEvent(name,config,now=new Date())"]
]);
const agendaCurrentEventTest=new Function(
  "AGENDA_DAYS","AGENDA_TRAINING_SLOTS","saoPauloParts",
  weekStartCode+"\n"+agendaEventCode+"\nreturn agendaCurrentEvent;"
)(["Mon","Tue","Wed","Thu","Fri"],["10","11","15","16"],function(date){return date.parts;});
function agendaAt(date,weekday,hour,minute){
  return {parts:{date:date,weekday:weekday,hour:hour,minute:minute}};
}
const testDate="2026-11-30";
const agendaConfig={
  days:{[testDate]:{lunch:{Ricardo:"12",Guilherme:"13"},training:{"10":"Ricardo","11":"Guilherme","15":"Lohan","16":""}}},
  weeks:{[testDate]:"Lohan"}
};
const lunchNoon=agendaCurrentEventTest("Ricardo",agendaConfig,agendaAt(testDate,"Mon",12,30));
assert(lunchNoon&&lunchNoon.kind==="pause"&&lunchNoon.status==="busy"&&lunchNoon.reason==="Almoçando","Ricardo's 12h lunch must pause only within 12h-13h");
const lunchOne=agendaCurrentEventTest("Guilherme",agendaConfig,agendaAt(testDate,"Mon",13,30));
assert(lunchOne&&lunchOne.reason==="Almoçando"&&lunchOne.status==="busy","Guilherme's 13h lunch must pause within 13h-14h");
const trainingTen=agendaCurrentEventTest("Ricardo",agendaConfig,agendaAt(testDate,"Mon",10,30));
assert(trainingTen&&trainingTen.reason==="Em treinamento"&&trainingTen.status==="busy","10h training assignment must pause its selected owner");
const trainingEleven=agendaCurrentEventTest("Guilherme",agendaConfig,agendaAt(testDate,"Mon",11,30));
assert(trainingEleven&&trainingEleven.reason==="Em treinamento","11h training assignment must pause its selected owner");
const aulaoThree=agendaCurrentEventTest("Lohan",agendaConfig,agendaAt(testDate,"Mon",15,30));
const aulaoFour=agendaCurrentEventTest("Lohan",agendaConfig,agendaAt(testDate,"Mon",16,30));
assert(aulaoThree&&aulaoFour&&aulaoThree.reason==="Em treinamento"&&aulaoFour.reason==="Em treinamento","Weekly Aulão must keep its owner paused continuously from 15h to 17h");
const emptySlot=agendaCurrentEventTest("Guilherme",agendaConfig,agendaAt(testDate,"Mon",16,30));
assert(emptySlot===null,"An empty 16h training slot must not change anyone's status");
const noAutoStart=agendaCurrentEventTest("Ricardo",agendaConfig,agendaAt(testDate,"Mon",9,30));
assert(noAutoStart===null,"Agenda must not automatically activate a member at the start of the day");
const endOfDay=agendaCurrentEventTest("Guilherme",agendaConfig,agendaAt(testDate,"Mon",18,0));
assert(endOfDay&&endOfDay.status==="away"&&endOfDay.reason==="Fim do expediente","Weekday end-of-day must set Away at 18h");
const weekend=agendaCurrentEventTest("Ricardo",agendaConfig,agendaAt("2026-12-05","Sat",13,30));
assert(weekend===null,"Weekends must not trigger weekday agenda rules");
const agendaWeekStartTest=new Function(weekStartCode+"\nreturn agendaWeekStart;")();
assert(agendaWeekStartTest("2026-11-28")==="2026-11-23"&&agendaWeekStartTest("2026-11-27")==="2026-11-23","The selected Aulão owner must remain on the same week key throughout Friday and Saturday");
assert(agendaWeekStartTest("2026-11-29")==="2026-11-23","The weekly Aulão selection must remain associated with the same week through Sunday");
assert(agendaWeekStartTest("2026-11-30")==="2026-11-30"&&agendaWeekStartTest("2026-11-30")!=="2026-11-23","A new Aulão assignment window must begin with the next Monday");


console.log("Validation OK: PROD "+stableVersion+" / TEST "+testVersion+" (isolated live-data Beta 2)");
