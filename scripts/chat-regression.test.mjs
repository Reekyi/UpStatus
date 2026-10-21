#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const source=fs.readFileSync(path.join(ROOT,"src/userscript/upstatus.user.template.js"),"utf8");
const start=source.indexOf("function processChatNotifications(messages){");
const end=source.indexOf("\n\n  document.addEventListener('UPSTATUS_EXTERNAL_NOTIFICATION_CLICK'",start);
if(start<0||end<0)throw new Error("Could not isolate processChatNotifications for regression tests");
const fn=source.slice(start,end);
function assert(ok,msg){if(!ok)throw new Error("CHAT REGRESSION FAILED: "+msg);}
function makeHarness(){
  const context={
    chatInitialized:false,
    seenMentionIds:{},
    member:"Ricardo",
    toasts:[],
    external:[],
    mentionAlerts:0,
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
  h.processChatNotifications(oldMessages);
  assert(h.chatInitialized,"initial history must establish a notification baseline");
  assert(h.toasts.length===0,"initial history must not notify for old messages");
  h.processChatNotifications(oldMessages);
  assert(h.toasts.length===0,"repeated messages must not notify twice");
  h.processChatNotifications([{id:"new-1",user:"Lohan",type:"text",mentions:[]}]);
  assert(h.toasts.length===1&&h.toasts[0]==="new-1","new incoming messages must trigger one in-page notification");
  assert(h.external.length===1&&h.external[0]==="chat:new-1","new incoming messages must be passed to desktop-notification gating");
  h.processChatNotifications([{id:"new-1",user:"Lohan",type:"text",mentions:[]}]);
  assert(h.toasts.length===1&&h.external.length===1,"duplicate realtime events must not notify twice");
}
{
  const h=makeHarness();
  h.processChatNotifications(oldMessages);
  h.processChatNotifications([{id:"mention-1",user:"Lohan",type:"text",mentions:["Ricardo"]}]);
  assert(h.mentionAlerts===1,"a new mention must still trigger the mention alert");
}
assert(source.includes("if(chatLoading){if(forceFull)chatForceFullQueued=true;return;}"),"full retry requests must queue behind an in-flight chat load");
assert(source.includes("renderChat();setUnread(0);broadcastChatPresence(true);refresh();scrollChatToBottom(true);"),"reopening chat must render cached incoming messages immediately");
assert(source.includes("if(!isTeamChatMessage(data)||!shouldShowDesktopNotification())return;"),"desktop notifications must be limited to hidden or unfocused tabs");
assert(source.includes("document.visibilityState!=='visible'||!document.hasFocus()"),"desktop notification focus check must consider page visibility and browser focus");
assert(source.includes("chatDot.textContent='';"),"unread indicator must not display a numeric counter");
assert(!source.includes("chatDot.textContent=chatUnread>99"),"numeric unread badge must remain removed");
assert(source.includes("countBadge.textContent='';"),"toast stack must not show a numeric notification counter");
const serverTemplate=fs.readFileSync(path.join(ROOT,"src/server/index.template.ts"),"utf8");
assert(serverTemplate.includes("const cutoff=new Date(Date.now()-48*60*60*1000).toISOString();"),"fast chat route must define its unread cutoff");

assert(source.includes("function setChatNewMessageIndicator(show)"),"chat must expose the new-message indicator state");
assert(source.includes("btn.appendChild(dot)"),"new-message indicator must create a visible dot element on the latest-message arrow");
assert(source.includes("hasNewExternalMessage=nextMessages.some"),"polling must detect incoming messages when realtime events are missed");
assert(source.includes("chatPendingInitialScroll=true;chatOpenScrollUntil=Date.now()+2400;chatForceScrollBottom=true;"),"reopening chat must request scrolling to the latest message");
assert(source.includes("var currentMenu=document.querySelector('.up-chat-emoji-menu'),currentBtn=document.querySelector('.up-chat-emoji-btn')"),"emoji picker outside-click handler must use the current menu and button");
assert(source.includes("document.body.appendChild(box)"),"image lightbox must be mounted at page level");
assert(serverTemplate.includes('.in("state_key",["remote-status"])'),"health state query must use the correct Supabase in-filter arguments");

assert(source.includes("var chatUserScrollInterruptedUntil=0"),"opening scroll must track user upward-scroll interruption");
assert(source.includes("list.addEventListener('wheel',function(e){if(e.deltaY<0)markUserScrollIntent();}"),"upward wheel input must interrupt forced bottom scrolling");
assert(source.includes("list.addEventListener('touchmove'"),"touch scrolling must be able to interrupt forced bottom scrolling");
assert(source.includes("chatPendingInitialScroll=false;\n        chatForceScrollBottom=false;"),"manual upward scroll must cancel pending initial forced scrolling");
assert(source.includes("!list._upstatusUserScrolling&&(chatPendingInitialScroll||(Date.now()<chatOpenScrollUntil&&Date.now()>=chatUserScrollInterruptedUntil))"),"DOM/resize retries must respect user scroll intent");
\nconsole.log("Chat regression tests passed: baseline notifications, duplicate suppression, mentions, retry, immediate reopen rendering, desktop notification focus, and unread indicators.");
