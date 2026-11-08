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

assert(source.includes("(member==='Ricardo'&&role==='implementation_admin'?'<button class=\"up-chat-clear\" type=\"button\" title=\"Limpar chat\">'+iconSvg('trash')+'</button>':'')+'<button class=\"up-chat-library\""),"only Ricardo with the stored admin role sees the clear-chat action before the media library");
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
assert(source.includes("function clearChatRicardo(){if(member!=='Ricardo'||role!=='implementation_admin')return;"),"clear-chat handler requires the stored admin role");
assert(serverTemplate.includes("const enrolledRole=String(enrolled.role||\"\");\n    const sessionRole=enrolledRole.trim()?enrolledRole:\"implementation_user\";\n    return createSession(name,{name,role:sessionRole});"),"blank first-access roles default to user and non-empty roles remain verbatim");
assert(!serverTemplate.includes('["Ricardo","Lohan","Guilherme"].includes(name)'),"first access never grants administrator by account name");
assert(serverTemplate.includes('if(!await admin(name))return response({error:"Seu perfil não possui acesso à saúde do sistema."},403);'),"health endpoint requires the stored admin role");
assert(serverTemplate.includes('if(name!=="Ricardo"||!await admin(name))return response({error:"Somente Ricardo, com papel de administrador, pode limpar o chat."},403);'),"chat clear requires Ricardo and the stored admin role");
assert(source.includes("function setPendingAttachment(file)"),"files are staged instead of uploaded immediately");
assert(source.includes("function updateLinkPreview(text)"),"links get a removable preview");
assert(source.includes("e.preventDefault();setPendingAttachment(file)"),"pasted images stay pending");
assert(source.includes("fileName:String(record.file_name"),"filename is separate from caption");
assert(serverTemplate.includes('file_name:type==="document"&&fileName?fileName:null'),"file name is saved to separate database column");
assert(source.includes("var incomingTime=!own?"),"received messages show per-message timestamps");
assert(source.includes("var ownMeta=own?'<div class=\"up-chat-own-meta\"><span class=\"up-chat-own-time\">"),"sent time appears with ticks");
assert(source.includes("function screenShareStart()"),"screen-sharing start handler missing");
assert(source.includes("function screenShareReceive(p)"),"screen-sharing signal handler missing");
assert(source.includes("SCREEN_ROOM_EVENT"),"screen-sharing realtime event missing");
assert(source.includes("function voiceRoomToggleSpeakers()"),"speaker output mute handler missing");
assert(source.includes("function chatSenderColors(name)"),"per-sender chat color palette missing");
assert(source.includes("data-sender-color"),"per-sender chat color rendering missing");
assert(source.includes("function requestPublicChatLinkTitle(url,callback)"),"stable Google Docs link-title hydration helper missing");
assert(source.includes('class="up-chat-link-card"'),"stable chat link-card renderer missing");
assert(source.includes("hydrateChatLinkTitles(list);"),"chat link-card hydration hook missing");
assert(source.includes("'.up-chat-bubble:has(.up-chat-link-card){padding:4px!important;border-width:1px!important;box-shadow:none!important}'"),"chat link-card bubble compatibility styles missing");
assert(source.includes("'.up-chat-link-card{padding:7px!important;gap:8px!important;border-width:1px!important;border-radius:9px!important}'"),"chat link-card compact styles missing");

assert(source.includes("var chatPendingAttachment=null;"),"chat attachment state must be transient and explicit");
assert(source.includes("var chatLinkPreviewDismissed=false,chatLinkPreviewDismissedUrl='';"),"link preview dismissal state must be explicit");
assert(source.includes("photoFile.addEventListener('change',function(){if(photoFile.files&&photoFile.files[0])setPendingAttachment(photoFile.files[0]);photoFile.value='';});"),"selected files must remain staged and the input must reset");
assert(source.includes("updateLinkPreview(input.value||'')"),"typing must update the removable link preview");
assert(source.includes("if(!input||(!text&&!chatPendingAttachment))return;"),"send action must accept either text or a staged attachment");
assert(source.includes("sendChatMedia(pending,text,reply)"),"staged attachments must preserve caption and reply context");
assert(source.includes("function sendChatMedia(file,caption,replyOverride){"),"attachment send must support caption and reply context");
assert(source.includes("fileName:isDocument?String(file.name||'Documento'):'',"),"document filename must be stored separately from the caption");
assert(source.includes("var expectedBucket=route==='/api/chat/upload-url'?'chat-images':route==='/api/profile/avatar-upload-url'?'profile-images':'';"),"signed uploads must bind each API route to one bucket");
assert(source.includes("credentials:'omit',redirect:'error'"),"signed Storage PUT must omit credentials and reject redirects");
assert(source.includes("function canViewHealth(){return role==='implementation_admin';}"),"health UI must use the stored administrator role");
assert(!source.includes("sendRealtimeEvent('chat_fast',{message:created})"),"chat refresh broadcasts must not include full message rows");
assert(serverTemplate.includes("async function signedUploadRoute(req:Request,kind:\"chat\"|\"avatar\")"),"server signed-upload route is missing");
assert(serverTemplate.includes('const uploadPrefix="/storage/v1/object/upload/sign/"+bucket+"/";'),"server must validate signed upload bucket and path");
assert(serverTemplate.includes('const publicPrefix="/storage/v1/object/public/"+bucket+"/";'),"server must validate public object bucket and path");
assert(serverTemplate.includes('if(path==="/api/chat/upload-url"&&req.method==="POST")return await signedUploadRoute(req,"chat");'),"chat upload-url route must be authenticated and wired");
assert(serverTemplate.includes('if(path==="/api/profile/avatar-upload-url"&&req.method==="POST")return await signedUploadRoute(req,"avatar");'),"avatar upload-url route must be authenticated and wired");
assert(serverTemplate.includes("const avatarUrl=String(p.avatarUrl||\"\").trim();"),"profile route must accept the signed-upload result");
assert(serverTemplate.includes("Backward compatibility for already-installed clients"),"legacy base64 avatar clients must remain compatible");

assert(source.includes('<div class="up-chat-pending-preview hidden" aria-live="polite"></div>'),"composer must render a valid pending-attachment preview node");
assert(source.includes("restoreChatDraft(input);updateLinkPreview(input.value||'');"),"restored drafts must rebuild their link preview");
assert(source.includes("if(base.protocol!=='https:')throw new Error('URL de upload inválida.');"),"client must reject non-HTTPS Storage origins");
assert(serverTemplate.includes('if(uploadUrl.origin!==projectOrigin||uploadUrl.username||uploadUrl.password||uploadUrl.hash||!uploadUrl.pathname.startsWith(uploadPrefix))'),"server must reject signed URLs with fragments or foreign origins");
assert(source.includes("fileName:String(record.file_name!=null?record.file_name:(record.fileName||''))"),"filename must survive chat normalization separately from the caption");
assert(source.includes("var docName=String(m.fileName||m.message||'Documento')"),"document cards must display the actual filename");
assert(source.includes("up-chat-document-caption"),"document captions must render separately from filenames");
assert(source.includes("var name=String(item.fileName||item.message||'Documento')"),"shared library search and download must use the actual filename");
console.log("Chat regression tests passed: staged attachments, signed uploads, filename/caption separation, role gates, link previews, screen sharing, notifications, and unread indicators.");
