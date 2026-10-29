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
  assert(h.external.length===0,"external notifications remain intentionally disabled in the current chat flow");
  h.processChatNotifications([{id:"new-1",user:"Lohan",type:"text",mentions:[]}]);
  assert(h.toasts.length===1&&h.external.length===0,"duplicate realtime events must not create duplicate in-page notifications");
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
assert(source.includes("var b=m.__upstatusEmojiButton;if(!m.contains(ev.target)&&(!b||!b.contains(ev.target)))"),"emoji picker outside-click handler must use each menu and its owning button");
assert(source.includes("document.body.appendChild(box)"),"image lightbox must be mounted at page level");
assert(serverTemplate.includes('.in("state_key",["remote-status"])'),"health state query must use the correct Supabase in-filter arguments");


assert(source.includes("chatUserScrollInterruptedUntil=0"),"opening scroll must track user upward-scroll interruption");
assert(source.includes("list.addEventListener('wheel',function(e){if(e.deltaY<0)markUserScrollIntent();}"),"upward wheel input must interrupt forced bottom scrolling");
assert(source.includes("list.addEventListener('touchmove'"),"touch scrolling must be able to interrupt forced bottom scrolling");
assert(source.includes("chatPendingInitialScroll=false;")&&source.includes("chatForceScrollBottom=false;"),"manual upward scroll must cancel pending initial forced scrolling");
assert(source.includes("!list._upstatusUserScrolling&&(chatPendingInitialScroll||(Date.now()<chatOpenScrollUntil&&Date.now()>=chatUserScrollInterruptedUntil))"),"DOM/resize retries must respect user scroll intent");
assert(source.includes("if(Date.now()<chatUserScrollInterruptedUntil&&!chatForceScrollBottom)"),"non-forced scrolling must respect the user-scroll interruption window");
assert(source.includes("function openChat(){")&&source.includes("chatUserScrollInterruptedUntil=0;"),"opening the chat must reset an older scroll-interruption window");

assert(source.includes("(member==='Ricardo'?'<button class=\"up-chat-clear\" type=\"button\" title=\"Limpar chat\">'+iconSvg('trash')+'</button>':'')+'<button class=\"up-chat-library\""),"Ricardo must see the clear-chat action before the media library; other members must not see the clear action");
assert(source.includes(".up-chat-photo{display:block;box-sizing:border-box;min-width:0;max-width:min(260px,100%);max-height:210px;width:auto;height:auto;"),"chat images must shrink to fit narrow bubbles without forcing horizontal overflow");
assert(source.includes(".up-chat-media{display:block;box-sizing:border-box;min-width:0;width:auto;height:auto;max-width:min(220px,100%);max-height:150px;"),"chat media must stay within the available bubble width while preserving intrinsic proportions");
assert(source.includes(".up-chat-media-video{width:min(220px,100%);height:auto;aspect-ratio:4/3;max-height:150px}"),"chat videos must use responsive width and preserve a stable aspect ratio");
assert(source.includes("pdf:'application/pdf'")&&source.includes("csv:'text/csv'")&&source.includes("docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'"),"document extensions must resolve to supported MIME types");
assert(source.includes("function positionReadTooltip(e)"),"read tooltip position helper must exist before event handlers use it");
assert(source.includes("up-chat-library-tabs")&&source.includes("Mídias ('+items.length+')")&&source.includes("Documentos ('+documents.length+')"),"library must use a top-level media/documents tab layout");
assert(source.includes("up-chat-library-search")&&source.includes("up-chat-library-filter"),"library must include search and media type filters");
assert(source.includes("function renderDocs()")&&source.includes("function renderMedia()"),"library tabs must render independent document and media collections");
assert(source.includes("up-chat-library-doc-blue")&&source.includes("up-chat-library-doc-red")&&source.includes("up-chat-library-doc-green"),"library document cards must use distinct color families");
assert(source.includes("up-chat-document-blue")&&source.includes("up-chat-document-red")&&source.includes("up-chat-document-green"),"document cards must use distinct color families by file type");
assert(source.includes("docKind=")&&source.includes("'blue'")&&source.includes("'green'")&&source.includes("'red'"),"document extension-to-color mapping must cover blue, green and red groups");
assert(source.includes("documents=allItems.filter(function(m){return m.type==='document';})"),"library must separate documents from image/video media");
assert(source.includes("up-chat-library-tabs")&&source.includes("up-chat-library-documents"),"library must keep its document tab and dedicated document list container");
assert(source.includes("function callPublishPresence()")&&source.includes("function callReceivePresence(p)"),"active calls must be announced and discovered through realtime presence");
assert(source.includes("async function callJoinActiveCall(callId)"),"team members must be able to join an existing active call");
assert(source.includes("joinExisting:true")&&source.includes("callSendTo(n,'join'"),"joining a call must notify current participants so the WebRTC mesh can be established");
assert(source.includes("async function callJoinActiveCall(callId)")&&source.includes("callSendTo(n,\'join\'"),"active call join signaling remains available");
assert(source.includes("if(p.type==='presence'){callReceivePresence(p);return;}"),"call presence must be handled before normal call-session signal filtering");

assert(serverTemplate.includes("const isAdmin=await admin(name);"),"server delete is authorized by the authenticated admin role");
assert(!serverTemplate.includes('const isAdmin=name==="Ricardo"'),"no name-only administrator bypass");
assert(source.includes("var canDelete=m.user===member||role==='implementation_admin';"),"admin UI uses stored role");
assert(source.includes("(role==='implementation_admin'?'<button class=\"up-chat-clear\""),"clear-chat control must be role-gated in the UI");
assert(source.includes("function setPendingAttachment(file)"),"files are staged instead of uploaded immediately");
assert(source.includes("input.value='';\n    updateLinkPreview('');"),"sending a text message must clear its draft link preview");
assert(source.includes("if(input)updateLinkPreview(input.value||'');else box.classList.add('hidden')"),"removing an attachment must preserve any link preview for the remaining draft");
assert(source.includes("function updateLinkPreview(text)"),"links get a removable preview");
assert(source.includes("chatLinkPreviewDismissedUrl=url.href"),"dismissed link preview must be scoped to the URL the user dismissed");
assert(source.includes("if(chatLinkPreviewDismissed&&url.href===chatLinkPreviewDismissedUrl)"),"a different URL must be allowed to show a new preview");
assert(source.includes("catch(e){if(!chatPendingAttachment)box.classList.add('hidden');return;}"),"invalid URL drafts must not leave an empty visible preview container");
assert(source.includes("e.preventDefault();setPendingAttachment(file)"),"pasted images stay pending");
assert(source.includes("fileName:String(record.file_name"),"filename is separate from caption");
assert(source.includes("fileName:isDocument?String(file.name||'Documento'):''"),"document uploads must send the original filename separately from the caption");
assert(source.includes("message:isDocument?(String(caption||'').trim()||String(file.name||'Documento')):String(caption||'').trim(),type:isDocument?'document'"),"attachment captions must remain visible during upload and on document fallback");
assert(source.includes("sendChatMedia(pending,text,reply)"),"pending attachment sends must preserve the selected reply target");
assert(source.includes("reply=replyOverride!==undefined?replyOverride:chatReplyTo"),"attachment upload must use the reply target captured before clearing the composer");
assert(source.includes("setPendingAttachment(file);if(input)updateLinkPreview(input.value||'');setChatReply(reply)"),"failed attachment uploads must restore the file, caption preview, and reply target");
assert(serverTemplate.includes('file_name:type==="document"&&fileName?fileName:null'),"file name is saved to separate database column");
assert(source.includes("var incomingTime=!own?"),"received messages show per-message timestamps");
assert(source.includes("up-chat-own-meta")&&source.includes("up-chat-own-time"),"sent time appears with ticks");
assert(source.includes("function screenShareStart()"),"screen-sharing start handler missing");
assert(source.includes("function screenShareReceive(p)"),"screen-sharing signal handler missing");
assert(source.includes("SCREEN_ROOM_EVENT"),"screen-sharing realtime event missing");
assert(source.includes("function voiceRoomToggleSpeakers()"),"speaker output mute handler missing");
assert(source.includes("function chatSenderColors(name)"),"per-sender chat color palette missing");
assert(source.includes("data-sender-color"),"per-sender chat color rendering missing");
assert(source.includes("function requestPublicChatLinkTitle(url,callback)"),"stable Google Docs link-title hydration helper missing");
assert(source.includes('class="up-chat-link-card"'),"stable chat link-card renderer missing");
assert(source.includes("hydrateChatLinkTitles(list);"),"chat link-card hydration hook missing");
assert(source.includes(".up-chat-link-card{display:flex")&&source.includes('class="up-chat-link-card"'),"chat link-card renderer and styles must exist");
console.log("Chat regression tests passed: composer, link cards, screen sharing, speaker mute, sender colors, notifications, and unread indicators.");
