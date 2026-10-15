#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const source=fs.readFileSync(path.join(ROOT,"src/userscript/upstatus.user.template.js"),"utf8");
const start=source.indexOf("function loadSeenChatNotifications(){");
const end=source.indexOf("\n\n  document.addEventListener('UPSTATUS_EXTERNAL_NOTIFICATION_CLICK'",start);
if(start<0||end<0)throw new Error("Could not isolate processChatNotifications for regression tests");
const fn=source.slice(start,end);
function assert(ok,msg){if(!ok)throw new Error("CHAT REGRESSION FAILED: "+msg);}
function makeHarness(){
  const context={
    chatInitialized:false,
    seenMentionIds:{},
    seenChatNotificationMember:"",
    pendingChatNotificationMessages:[],
    chatCache:[],
    member:"Ricardo",
    key:"upstatus_test_",
    toasts:[],
    external:[],
    mentionAlerts:0,
    persisted:{},
    GM_getValue:(k,fallback)=>Object.prototype.hasOwnProperty.call(context.persisted,k)?context.persisted[k]:fallback,
    GM_setValue:(k,v)=>{context.persisted[k]=v;},
    shouldNotifyForChat:()=>true,
    showChatToast:m=>context.toasts.push(String(m.id)),
    isTeamChatMessage:()=>true,
    showExternalNotification:(type,m)=>context.external.push(type+":"+String(m.id)),
    playMentionAlert:()=>{context.mentionAlerts++;},
  };
  vm.createContext(context);
  vm.runInContext(fn+"\nthis.processChatNotifications=processChatNotifications;",context);
  return context;
}
const oldMessages=[
  {id:"old-1",user:"Lohan",type:"text",mentions:[]},
  {id:"old-2",user:"Guilherme",type:"text",mentions:[]},
];
{
  const h=makeHarness();
  h.chatCache=oldMessages;
  h.processChatNotifications(oldMessages,true);
  assert(h.chatInitialized,"a full history snapshot must initialize notification state");
  assert(h.toasts.length===0,"messages already in the initial snapshot must not notify");
  h.processChatNotifications(oldMessages,true);
  assert(h.toasts.length===0,"reloading the same full snapshot must not re-notify old messages");
  h.processChatNotifications([{id:"new-1",user:"Lohan",type:"text",mentions:[]}],false);
  assert(h.toasts.length===1&&h.toasts[0]==="new-1","a new incremental message must still notify");
}
{
  const h=makeHarness();
  const arrivingDuringLoad={id:"during-load",user:"Lohan",type:"text",mentions:[]};
  h.processChatNotifications([arrivingDuringLoad],false);
  assert(h.pendingChatNotificationMessages.length===1,"Realtime messages arriving before initial history must be queued");
  h.chatCache=oldMessages;
  h.processChatNotifications(oldMessages,true);
  assert(h.toasts.length===1&&h.toasts[0]==="during-load","queued messages absent from the baseline must notify once");
  assert(h.pendingChatNotificationMessages.length===0,"the pending notification queue must be drained after baseline");
}
{
  const h=makeHarness();
  h.chatCache=[];
  h.processChatNotifications(oldMessages,true);
  assert(h.chatInitialized,"the first full history response must initialize notification state");
  h.processChatNotifications(oldMessages,false);
  assert(h.toasts.length===0,"an empty cache must not mask the first full history snapshot and re-notify its messages");
}
{
  const persisted={};
  const h=makeHarness();
  h.persisted= persisted;
  h.chatCache=oldMessages;
  h.processChatNotifications(oldMessages,true);
  assert(Array.isArray(persisted["upstatus_test_chat_seen_notifications_Ricardo"]),"initial baseline must persist seen message IDs");
  const reloaded=makeHarness();
  reloaded.persisted=persisted;
  reloaded.processChatNotifications(oldMessages,false);
  reloaded.chatCache=oldMessages;
  reloaded.processChatNotifications(oldMessages,true);
  assert(reloaded.toasts.length===0,"messages already seen before a page reload must not notify again");
  reloaded.processChatNotifications([{id:"after-reload",user:"Lohan",type:"text",mentions:[]}],false);
  assert(reloaded.toasts.length===1&&reloaded.toasts[0]==="after-reload","new messages must still notify after a reload");
}
console.log("Chat regression tests passed: initial baseline, persistent deduplication, empty-cache regression, duplicate history, incremental event, and Realtime/history race.");
