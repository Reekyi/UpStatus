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
    seenChatNotificationHadBaseline:false,
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
  assert(h.toasts.length===0,"events buffered before the initial history baseline must not replay old-message notifications");
  assert(h.pendingChatNotificationMessages.length===0,"the pending notification queue must be discarded after baseline");
  h.processChatNotifications([{id:"after-baseline",user:"Lohan",type:"text",mentions:[]}],false);
  assert(h.toasts.length===1&&h.toasts[0]==="after-baseline","events arriving after the baseline must still notify normally");
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
  const persisted={"upstatus_test_chat_seen_notifications_Ricardo":["old-1","old-2"]};
  const h=makeHarness();
  h.persisted=persisted;
  const missedWhileAway={id:"missed-while-away",user:"Lohan",type:"text",mentions:[]};
  h.processChatNotifications(oldMessages.concat([missedWhileAway]),true);
  assert(h.toasts.length===1&&h.toasts[0]==="missed-while-away","new messages since the previous session must notify on the first history snapshot");
  assert(h.external.length===1&&h.external[0]==="chat:missed-while-away","missed new messages must also raise external notifications");
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
assert(source.includes("if(ids.length&&k===readSentKey)return;"),"read receipt deduplication must not suppress the empty-cache watermark update");
assert(source.includes("api('POST','/api/chat/read',{messageIds:ids})"),"visible chat must persist its read watermark");
const serverTemplate=fs.readFileSync(path.join(ROOT,"src/server/index.template.ts"),"utf8");
assert(serverTemplate.includes("unreadCount:unreadCount||0"),"fast chat endpoint must return a current unread count");
assert(source.includes("if(nextKey!==beforeKey||!list||list.getAttribute('data-render-key')!==nextKey)renderChat();"),"loadChat must validate the current DOM render key");
assert(source.includes("if(renderKey===chatLastRenderKey&&list.getAttribute('data-render-key')===renderKey){"),"render cache must be tied to the current DOM list");
assert(source.includes("list.setAttribute('data-render-key',renderKey);"),"rendered DOM list must retain its render key");
assert(source.includes("chatPendingInitialScroll=true;"),"opening chat must request a forced initial scroll");
assert(source.includes("if(chatPendingInitialScroll){scrollChatToBottom(true);chatPendingInitialScroll=false;}"),"first history load must apply the pending bottom scroll");
assert(source.includes("new ResizeObserver(function(){"),"initial scroll must survive delayed layout changes");
assert(source.includes("[50,150,300,600,1000].forEach(function(delay){"),"initial bottom scroll must retry after delayed Chromium layout");
assert(source.includes("new MutationObserver(function(){"),"initial bottom scroll must react to delayed DOM content changes");
assert(source.includes("var visibleBottom=listRect.top+list.clientTop+list.clientHeight;")&&source.includes("var gap=lastRect.bottom-visibleBottom;"),"initial bottom scroll must verify the last message against the actual scrollport");
assert(source.includes("chatScrollObserver.observe(last)"),"initial scroll must react when the last message finishes resizing");
assert(source.includes("timeout:15000")&&source.includes("ontimeout:function()"),"chat requests must time out instead of leaving the loading state stuck forever");
assert(source.includes("Não foi possível carregar o chat.")&&source.includes("loadChat(true)"),"failed initial chat loads must show a retry action instead of an infinite loading label");
assert(source.includes("var baselineHadBeenSaved=seenChatNotificationHadBaseline;"),"initial history must distinguish an established notification baseline from first install");
assert(source.includes("var buffered=pendingChatNotificationMessages.slice();"),"realtime messages arriving during initial history load must be reconciled afterward");
assert(source.includes("else if(typeof d.unreadCount==='number')setUnread(d.unreadCount);"),"fast chat refresh must update unread count while chat is hidden");
assert(source.includes("if(chat.classList.contains('hidden'))openChat();else closeChat();"),"floating chat button must still toggle open and close");
console.log("Chat regression tests passed: notification persistence, read watermark, DOM render cache, initial bottom scroll, and open/close toggle.");
