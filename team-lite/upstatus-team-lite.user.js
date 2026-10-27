// ==UserScript==
// @name         UpStatus Team Lite
// @namespace    upseller-team-lite
// @version      3.4.0.2
// @description  Chat de texto e voz para Luca e Ícaro dentro do Sale Smartly.
// @match        *://*.salesmartly.com/*
// @match        *://salesmartly.com/*
// @run-at       document-idle
// @require      https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @connect      raw.githubusercontent.com
// @connect      dlfvkawaiqduhlazsszm.supabase.co
// @updateURL    https://raw.githubusercontent.com/Reekyi/UpStatus/feature/team-lite-shift-c/team-lite/upstatus-team-lite.user.js
// @downloadURL  https://raw.githubusercontent.com/Reekyi/UpStatus/feature/team-lite-shift-c/team-lite/upstatus-team-lite.user.js
// ==/UserScript==
(function () {
'use strict';
if (window.__UPSTATUS_TEAM_LITE__) return;
window.__UPSTATUS_TEAM_LITE__ = true;

const CORE_VERSION = '3.4.0';
const BUILD_VERSION = '3.4.0.2';
const API = 'https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus-test';
const RELEASE_URL = 'https://raw.githubusercontent.com/Reekyi/UpStatus/feature/team-lite-shift-c/team-lite/release.json';
const OFFICIAL_SCRIPT_URL = 'https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus/upstatus.user.js';
const SCRIPT_URL = 'https://raw.githubusercontent.com/Reekyi/UpStatus/feature/team-lite-shift-c/team-lite/upstatus-team-lite.user.js';
const STORE_KEY = 'upstatus_team_lite_session_v1';
const REALTIME_URL = 'https://dlfvkawaiqduhlazsszm.supabase.co';
const REALTIME_KEY = 'sb_publishable_qoML52WUyBQRMB6DLP1yjw_J0Pbaae_';
const REALTIME_TOPIC = 'upstatus-screen-share-live-3-1-1-beta10';
const VOICE_EVENT = 'voice_room_signal';
const VOICE_ROOM_ID = 'upstatus-team-room-v1';
const $ = (s) => root.querySelector(s);
let session = null, pollTimer = null, heartbeatTimer = null, realtimeClient = null, realtimeChannel = null;
let voiceActive = false, voiceMuted = false, localStream = null, voicePresenceTimer = null, peers = Object.create(null), participants = Object.create(null);
const root = document.createElement('section');
root.id = 'upstatus-team-lite';
root.style.cssText = 'position:fixed;right:22px;bottom:22px;width:min(390px,calc(100vw - 24px));height:min(600px,calc(100vh - 28px));z-index:2147483647;background:#182232;color:#edf3fc;border:1px solid #34445a;border-radius:15px;box-shadow:0 18px 50px #0009;font:13px Segoe UI,Arial,sans-serif;display:none;flex-direction:column;overflow:hidden';
root.innerHTML = `
<style>
#upstatus-team-lite *{box-sizing:border-box}#upstatus-team-lite button,#upstatus-team-lite input,#upstatus-team-lite textarea,#upstatus-team-lite select{font:inherit}#upstatus-team-lite button{cursor:pointer;border:1px solid #42546d;border-radius:8px;padding:7px 10px;background:#29394f;color:#f5f8ff}#upstatus-team-lite button:disabled{opacity:.5;cursor:wait}#upstatus-team-lite .utl-head{display:flex;align-items:center;gap:6px;padding:10px;background:#202d40;border-bottom:1px solid #35445a}#upstatus-team-lite .utl-title{font-weight:750;flex:1}#upstatus-team-lite .utl-sub{font-size:10px;color:#a9b8cd;margin-top:2px}#upstatus-team-lite .utl-tools{display:flex;gap:5px}#upstatus-team-lite .utl-tools button{padding:5px 7px}#upstatus-team-lite .utl-login{padding:16px;display:flex;flex-direction:column;gap:8px}#upstatus-team-lite input,#upstatus-team-lite select,#upstatus-team-lite textarea{background:#111a27;color:#f5f8ff;border:1px solid #42546d;border-radius:8px;padding:9px;min-width:0}#upstatus-team-lite .utl-error{color:#ff9b9b;min-height:16px;white-space:pre-wrap}#upstatus-team-lite .utl-chat{display:none;flex:1;min-height:0;flex-direction:column}#upstatus-team-lite .utl-status{padding:7px 10px;color:#b6c5d8;font-size:11px;border-bottom:1px solid #2e3d52}#upstatus-team-lite .utl-messages{flex:1;overflow:auto;padding:10px;min-height:0}#upstatus-team-lite .utl-msg{background:#26364b;border:1px solid #35465d;border-radius:10px;padding:7px 9px;margin:0 0 8px;overflow-wrap:anywhere}#upstatus-team-lite .utl-msg .meta{font-size:10px;color:#9fb0c7;margin-bottom:4px}#upstatus-team-lite .utl-compose{display:flex;gap:6px;padding:9px;border-top:1px solid #2e3d52}#upstatus-team-lite .utl-compose textarea{resize:none;flex:1;height:42px}#upstatus-team-lite .utl-foot{display:flex;align-items:center;gap:6px;padding:8px 9px;border-top:1px solid #2e3d52}#upstatus-team-lite .utl-foot .utl-spacer{flex:1}#upstatus-team-lite .utl-call{display:flex;align-items:center;gap:7px;flex:1;min-width:0;color:#b9c7da;font-size:11px}#upstatus-team-lite .utl-live{width:8px;height:8px;border-radius:50%;background:#738096;flex:0 0 8px}#upstatus-team-lite .utl-live.on{background:#40d6a3;box-shadow:0 0 0 3px #40d6a322}#upstatus-team-lite .utl-primary{background:#167b62!important;border-color:#1a9b7b!important}#upstatus-team-lite .utl-danger{background:#8c3446!important;border-color:#b84c62!important}#upstatus-team-lite .utl-muted{color:#9fadc0}
</style>
<header class="utl-head"><div class="utl-title">UpStatus · Team Lite<div class="utl-sub">Core ${CORE_VERSION} · build ${BUILD_VERSION}</div></div><div class="utl-tools"><button id="utl-update" title="Verificar atualização">↻</button><button id="utl-hide" title="Ocultar painel">×</button></div></header>
<div class="utl-login" id="utl-login"><label for="utl-name">Entrar como</label><select id="utl-name"><option value="Luca">Luca</option><option value="Ícaro">Ícaro</option></select><label for="utl-pass">Senha</label><input id="utl-pass" type="password" autocomplete="current-password" placeholder="Senha individual"><button class="utl-primary" id="utl-enter">Entrar no chat</button><div class="utl-error" id="utl-error"></div><small class="utl-muted">Somente chat de texto e voz. O painel não abre nenhum site externo.</small></div>
<div class="utl-chat" id="utl-chat"><div class="utl-status" id="utl-status">Conectando…</div><div class="utl-messages" id="utl-messages"></div><div class="utl-compose"><textarea id="utl-text" maxlength="4000" placeholder="Escreva uma mensagem"></textarea><button class="utl-primary" id="utl-send">Enviar</button></div><div class="utl-foot"><div class="utl-call"><span class="utl-live" id="utl-live"></span><span id="utl-voice-status">Voz desconectada</span></div><button id="utl-voice" class="utl-primary">Entrar na voz</button><button id="utl-mute" hidden>Mutar</button><button id="utl-leave" class="utl-danger" hidden>Sair da voz</button><button id="utl-logout" title="Encerrar sessão">Sair</button></div></div>
`;
document.documentElement.appendChild(root);

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function request(path, opts={}) {
  const headers = {'Content-Type':'application/json'};
  if (session && session.token) headers.Authorization = 'Bearer ' + session.token;
  const method = opts.method || 'GET';
  const url = API + path + (method === 'GET' ? (path.includes('?')?'&':'?')+'_tl='+Date.now() : '');
  return fetch(url,{method,headers,body:opts.body,cache:'no-store'}).then(async r=>{
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(d.error || ('Falha HTTP '+r.status));
    return d;
  });
}
function gmGet(url) {
  return new Promise((resolve,reject)=>{
    if(typeof GM_xmlhttpRequest!=='function'){fetch(url,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.text()}).then(resolve,reject);return;}
    GM_xmlhttpRequest({method:'GET',url,headers:{'Cache-Control':'no-cache'},onload:r=>r.status>=200&&r.status<300?resolve(r.responseText):reject(new Error('Falha ao consultar atualização (HTTP '+r.status+').')),onerror:()=>reject(new Error('Não foi possível consultar atualizações.')),ontimeout:()=>reject(new Error('Tempo esgotado ao consultar atualizações.')),timeout:12000});
  });
}
function say(text){$('#utl-error').textContent=text||'';if($('#utl-chat').style.display==='flex')setStatus(text||'');}
function showChat(){ $('#utl-login').style.display='none'; $('#utl-chat').style.display='flex'; say(''); }
function showLogin(){ $('#utl-login').style.display='flex'; $('#utl-chat').style.display='none'; }
function setStatus(text){$('#utl-status').textContent=text;}
function labelName(name){return name==='Lucca'?'Luca':name==='Ycaro'?'Ícaro':name;}
function drawMessages(messages){
  const box=$('#utl-messages'), oldBottom=box.scrollHeight-box.scrollTop-box.clientHeight<70;
  box.innerHTML=(messages||[]).map(m=>'<article class="utl-msg"><div class="meta">'+esc(labelName(m.user))+' · '+esc(new Date(m.createdAt||Date.now()).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}))+'</div><div>'+esc(m.message)+'</div></article>').join('')||'<div class="utl-muted" style="text-align:center;padding:22px 6px">Esta sessão ainda não tem mensagens.</div>';
  if(oldBottom)box.scrollTop=box.scrollHeight;
}
async function loadChat(){
  if(!session)return;
  const since=new Date(session.joinedAt).toISOString();
  const d=await request('/api/chat?since='+encodeURIComponent(since));
  drawMessages((d.messages||[]).filter(m=>m.type!=='system'));
}
async function sendMessage(){
  const input=$('#utl-text'),message=input.value.trim();if(!message||!session)return;
  $('#utl-send').disabled=true;
  try{await request('/api/chat',{method:'POST',body:JSON.stringify({message})});input.value='';await loadChat();}
  catch(e){setStatus('Falha ao enviar: '+e.message);}
  finally{$('#utl-send').disabled=false;input.focus();}
}
async function startSession(){
  const label=$('#utl-name').value, endpoint=label==='Luca'?'/api/lucca/login':'/api/ycaro/login';
  $('#utl-enter').disabled=true;say('Entrando…');
  try{
    const d=await request(endpoint,{method:'POST',body:JSON.stringify({password:$('#utl-pass').value})});
    if(!d.token||!d.joinedAt)throw new Error('O servidor não retornou uma sessão válida.');
    session={name:d.name,displayName:label,token:d.token,joinedAt:Date.parse(d.joinedAt)||Date.now()};
    sessionStorage.setItem(STORE_KEY,JSON.stringify(session));
    showChat();await ensureRealtime();startTimers();await loadChat();setStatus('Conectado como '+label+'. Histórico iniciado nesta sessão.');
  }catch(e){say(e.message);}
  finally{$('#utl-enter').disabled=false;}
}
function startTimers(){
  if(pollTimer)clearInterval(pollTimer);if(heartbeatTimer)clearInterval(heartbeatTimer);
  pollTimer=setInterval(()=>loadChat().catch(e=>setStatus('Chat: '+e.message)),2500);
  heartbeatTimer=setInterval(()=>request(session.name==='Lucca'?'/api/lucca/heartbeat':'/api/ycaro/heartbeat',{method:'POST',body:'{}'}).catch(e=>setStatus('Sessão: '+e.message)),5000);
}
async function restoreSession(){
  const raw=sessionStorage.getItem(STORE_KEY);if(!raw)return;
  try{
    const saved=JSON.parse(raw);if(!saved.token||!saved.name||!saved.joinedAt)return;
    session=saved;
    const endpoint=session.name==='Lucca'?'/api/lucca/me':'/api/ycaro/me';
    const d=await request(endpoint);
    if(!d.authenticated){session=null;sessionStorage.removeItem(STORE_KEY);return;}
    showChat();await ensureRealtime();startTimers();await loadChat();setStatus('Conectado como '+session.displayName+'.');
  }catch(e){session=null;sessionStorage.removeItem(STORE_KEY);showLogin();}
}
async function logout(){
  if(voiceActive)await leaveVoice();
  if(pollTimer)clearInterval(pollTimer);if(heartbeatTimer)clearInterval(heartbeatTimer);pollTimer=heartbeatTimer=null;
  if(session){try{await request(session.name==='Lucca'?'/api/lucca/logout':'/api/ycaro/logout',{method:'POST',body:'{}'});}catch(e){}}
  session=null;sessionStorage.removeItem(STORE_KEY);if(realtimeChannel){try{await realtimeChannel.unsubscribe();}catch(e){}realtimeChannel=null;}if(realtimeClient){try{await realtimeClient.removeAllChannels();}catch(e){}realtimeClient=null;}
  $('#utl-pass').value='';showLogin();setStatus('Sessão encerrada.');$('#utl-messages').replaceChildren();
}
async function checkUpdates(){
  const b=$('#utl-update');b.disabled=true;b.textContent='…';say('Verificando atualização…');
  try{
    const pair=await Promise.all([gmGet(RELEASE_URL),gmGet(OFFICIAL_SCRIPT_URL)]);
    const manifest=JSON.parse(pair[0]);
    const officialMatch=pair[1].match(/@version\s+([^\r\n]+)/i);
    const officialCore=officialMatch?officialMatch[1].trim():'';
    const remote=String(manifest.buildVersion||'');
    const core=String(manifest.coreVersion||'');
    if(!remote||!manifest.scriptUrl||!core)throw new Error('Manifesto de atualização incompleto.');
    if(!officialCore)throw new Error('Não consegui ler a versão do UpStatus oficial.');
    if(core!==officialCore){
      say('A versão oficial é '+officialCore+', mas o pacote Team Lite está sincronizado com '+core+'. A atualização compartilhada ainda precisa ser preparada; não instalei uma build incompatível.');
    }else if(remote===BUILD_VERSION){say('Tudo sincronizado. UpStatus core '+officialCore+' · Team Lite build '+BUILD_VERSION+'.');}
    else if(remote.localeCompare(BUILD_VERSION,undefined,{numeric:true,sensitivity:'base'})>0){
      if(!confirm('Há uma atualização sincronizada disponível: core '+core+' / build '+remote+'. Abrir o instalador do Team Lite?'))return;
      if(typeof GM_openInTab==='function')GM_openInTab(manifest.scriptUrl,{active:true,insert:true,setParent:true});
      else window.open(manifest.scriptUrl,'_blank','noopener');
      say('O instalador foi aberto. Confirme a atualização no Tampermonkey.');
    }else say('O servidor informa uma build anterior ('+remote+'). Nenhuma alteração foi feita.');
  }catch(e){say('Não foi possível verificar: '+e.message);}
  finally{b.disabled=false;b.textContent='↻';}
}
async function ensureRealtime(){
  if(realtimeChannel)return;
  const sb=(typeof supabase!=='undefined'?supabase:window.supabase);
  if(!sb||typeof sb.createClient!=='function'){setStatus('Chat conectado, mas o módulo de voz não carregou.');return;}
  realtimeClient=sb.createClient(REALTIME_URL,REALTIME_KEY,{auth:{persistSession:false}});
  realtimeChannel=realtimeClient.channel(REALTIME_TOPIC);
  realtimeChannel.on('broadcast',{event:VOICE_EVENT},ev=>handleVoiceSignal(ev&&ev.payload||{}));
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Tempo esgotado ao conectar a voz.')),10000);
    realtimeChannel.subscribe(status=>{if(status==='SUBSCRIBED'){clearTimeout(timer);resolve();}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){clearTimeout(timer);reject(new Error('Não foi possível conectar à sinalização de voz.'));}});
  }).catch(e=>{setStatus(e.message);const failed=realtimeChannel;realtimeChannel=null;if(realtimeClient&&failed)realtimeClient.removeChannel(failed).catch(()=>{});});
}
function voiceSend(type,to,data){
  if(!realtimeChannel||!session)return;
  try{realtimeChannel.send({type:'broadcast',event:VOICE_EVENT,payload:Object.assign({roomId:VOICE_ROOM_ID,type,from:session.name,to:to||'',active:voiceActive,muted:voiceMuted,speakersMuted:false,version:CORE_VERSION,sessionId:session.token.slice(0,12),at:Date.now(),sessionStartedAt:voiceStartedAt||0},data||{})});}catch(e){}
}
let voiceStartedAt=0;
function ensurePeer(name){
  let p=peers[name];if(p&&p.pc&&p.pc.signalingState!=='closed')return p;
  p=p||{pc:null,pending:[],stream:new MediaStream(),audio:null};p.pending=p.pending||[];p.stream=p.stream||new MediaStream();
  const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]});p.pc=pc;peers[name]=p;
  if(localStream)localStream.getAudioTracks().forEach(t=>{if(t.readyState==='live')pc.addTrack(t,localStream);});
  pc.onicecandidate=e=>{if(e.candidate&&voiceActive)voiceSend('ice',name,{candidate:e.candidate});};
  pc.ontrack=e=>{const stream=e.streams&&e.streams[0]?e.streams[0]:null;if(!stream)return;let audio=p.audio;if(!audio){audio=document.createElement('audio');audio.autoplay=true;audio.playsInline=true;audio.style.display='none';document.body.appendChild(audio);p.audio=audio;}audio.srcObject=stream;audio.play().catch(()=>{});participants[name]={at:Date.now(),muted:false};renderVoiceStatus();};
  pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed'||pc.connectionState==='disconnected')setStatus('Áudio com '+labelName(name)+': conexão instável.');};
  return p;
}
async function makeOffer(name){
  if(!voiceActive||!name||name===session.name||String(session.name).localeCompare(String(name),'pt-BR')>=0)return;
  const p=ensurePeer(name);if(p.pc.signalingState!=='stable'||p.pc.localDescription)return;
  const offer=await p.pc.createOffer();await p.pc.setLocalDescription(offer);voiceSend('offer',name,{sdp:p.pc.localDescription});
}
async function handleVoiceSignal(p){
  if(!p||p.roomId!==VOICE_ROOM_ID||!p.from||p.from===session?.name||(p.to&&p.to!==session?.name))return;
  if(p.type==='presence'||p.type==='join'){
    if(p.active){participants[p.from]={at:Date.now(),muted:!!p.muted};renderVoiceStatus();if(!p.to)voiceSend('presence',p.from,{});if(voiceActive&&String(session.name).localeCompare(String(p.from),'pt-BR')<0)makeOffer(p.from).catch(e=>setStatus('Falha ao iniciar áudio: '+e.message));}
    return;
  }
  if(p.type==='leave'){dropPeer(p.from);delete participants[p.from];renderVoiceStatus();return;}
  if(!voiceActive)return;
  if(p.type==='offer'&&p.sdp){
    try{const peer=ensurePeer(p.from);await peer.pc.setRemoteDescription(new RTCSessionDescription(p.sdp));while(peer.pending.length)await peer.pc.addIceCandidate(peer.pending.shift());const answer=await peer.pc.createAnswer();await peer.pc.setLocalDescription(answer);voiceSend('answer',p.from,{sdp:peer.pc.localDescription});}catch(e){setStatus('Falha ao aceitar áudio de '+labelName(p.from)+': '+e.message);}
    return;
  }
  if(p.type==='answer'&&p.sdp){const peer=peers[p.from];if(peer&&peer.pc&&!peer.pc.remoteDescription){try{await peer.pc.setRemoteDescription(new RTCSessionDescription(p.sdp));while(peer.pending.length)await peer.pc.addIceCandidate(peer.pending.shift());}catch(e){setStatus('Falha ao concluir áudio: '+e.message);}}return;}
  if(p.type==='ice'&&p.candidate){const peer=ensurePeer(p.from);if(peer.pc.remoteDescription){try{await peer.pc.addIceCandidate(new RTCIceCandidate(p.candidate));}catch(e){}}else if(peer.pending.length<128)peer.pending.push(p.candidate);}
}
function dropPeer(name){const p=peers[name];if(!p)return;try{if(p.pc)p.pc.close();}catch(e){}try{if(p.audio){p.audio.pause();p.audio.srcObject=null;p.audio.remove();}}catch(e){}delete peers[name];}
async function joinVoice(){
  if(voiceActive)return;if(!realtimeChannel){await ensureRealtime();if(!realtimeChannel){setStatus('Sinalização de voz indisponível.');return;}}
  $('#utl-voice').disabled=true;
  try{
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error('Este navegador não disponibiliza microfone.');
    localStream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    voiceStartedAt=Date.now();voiceMuted=false;voiceActive=true;participants[session.name]={at:Date.now(),muted:false};
    $('#utl-voice').hidden=true;$('#utl-mute').hidden=false;$('#utl-leave').hidden=false;renderVoiceStatus();
    voiceSend('join','',{});voiceSend('presence','',{});if(voicePresenceTimer)clearInterval(voicePresenceTimer);voicePresenceTimer=setInterval(()=>{if(voiceActive)voiceSend('presence','',{});},5000);
    Object.keys(participants).forEach(n=>{if(n!==session.name&&Date.now()-participants[n].at<16000)makeOffer(n).catch(()=>{});});
  }catch(e){setStatus('Não foi possível entrar na voz: '+e.message);if(localStream)localStream.getTracks().forEach(t=>t.stop());localStream=null;}
  finally{$('#utl-voice').disabled=false;}
}
function renderVoiceStatus(){
  const others=Object.keys(participants).filter(n=>n!==session?.name&&Date.now()-participants[n].at<16000);
  $('#utl-live').classList.toggle('on',voiceActive);
  $('#utl-voice-status').textContent=voiceActive?(others.length?'Na sala com '+others.map(labelName).join(', '):'Na sala de voz · aguardando'): 'Voz desconectada';
}
function toggleMute(){
  if(!localStream)return;voiceMuted=!voiceMuted;localStream.getAudioTracks().forEach(t=>t.enabled=!voiceMuted);$('#utl-mute').textContent=voiceMuted?'Ativar mic':'Mutar';voiceSend('presence','',{muted:voiceMuted});renderVoiceStatus();
}
async function leaveVoice(){
  if(!voiceActive&&!localStream)return;
  voiceSend('leave','',{});
  if(voicePresenceTimer)clearInterval(voicePresenceTimer);voicePresenceTimer=null;
  voiceActive=false;voiceMuted=false;
  Object.keys(peers).forEach(dropPeer);participants=Object.create(null);
  if(localStream)localStream.getTracks().forEach(t=>t.stop());localStream=null;voiceStartedAt=0;
  $('#utl-voice').hidden=false;$('#utl-mute').hidden=true;$('#utl-leave').hidden=true;$('#utl-mute').textContent='Mutar';renderVoiceStatus();
}
document.addEventListener('keydown',e=>{
  if(!(e.shiftKey&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&e.key.toLowerCase()==='c'))return;
  const t=e.target;if(t&&(t.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(t.tagName)))return;
  if(!location.hostname.endsWith('salesmartly.com'))return;
  e.preventDefault();e.stopPropagation();root.style.display=root.style.display==='flex'?'none':'flex';
},true);
$('#utl-hide').onclick=()=>{root.style.display='none';};
$('#utl-update').onclick=checkUpdates;
$('#utl-enter').onclick=startSession;
$('#utl-pass').addEventListener('keydown',e=>{if(e.key==='Enter')startSession();});
$('#utl-send').onclick=sendMessage;
$('#utl-text').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}});
$('#utl-voice').onclick=joinVoice;
$('#utl-mute').onclick=toggleMute;
$('#utl-leave').onclick=leaveVoice;
$('#utl-logout').onclick=logout;
restoreSession();
})();
