import { Buffer } from "node:buffer";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const ADMIN_KEY = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const db = createClient(PROJECT_URL, ADMIN_KEY, { auth: { persistSession: false } });
const sessionCache = new Map<string,{name:string,expiresAt:number,checkedAt:number}>();
let membersCache:{at:number,data:Array<{name:string}>}|null=null;

const VERSION = "2.7.25";
const USERSCRIPT_RAW = String.raw`// ==UserScript==
// @name         UpStatus - Sale Smartly
// @namespace    upseller
// @version      2.7.25
// @description  UpStatus com status, histórico, chat interno, fotos, menções, atualização e alertas.
// @match        *://*.salesmartly.com/*
// @match        *://salesmartly.com/*
// @run-at       document-start
// @require      https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_openInTab
// @updateURL    https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus/upstatus.user.js
// @downloadURL  https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus/upstatus.user.js
// @connect      *
// ==/UserScript==
(function () {
  'use strict';

  var key='upstatus_';
  var faviconState={link:null,originalHref:'',originalData:'',blinkTimer:null,on:false};
  var CLOUD_SERVER='https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus';
  var server=CLOUD_SERVER;
  var UP_REALTIME_URL='https://dlfvkawaiqduhlazsszm.supabase.co';
  var UP_REALTIME_KEY='sb_publishable_qoML52WUyBQRMB6DLP1yjw_J0Pbaae_';
  var UP_REALTIME_TOPIC='upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0';
  var realtimeClient=null,realtimeChannel=null,realtimeActive=false,realtimeRetryTimer=null;
  var chatPresence={};
  function setupFaviconBadge(){
    try{
      var links=[].slice.call(document.querySelectorAll('link[rel~="icon"]'));var link=links[0]||null;
      if(!link&&document.head){link=document.createElement('link');link.rel='icon';document.head.appendChild(link);}
      if(link&&!faviconState.link){faviconState.link=link;faviconState.originalHref=link.href||'';
        try{fetch(faviconState.originalHref,{credentials:'same-origin'}).then(function(r){return r.blob()}).then(function(blob){return new Promise(function(resolve){var fr=new FileReader();fr.onload=function(){resolve(fr.result)};fr.readAsDataURL(blob);});}).then(function(data){faviconState.originalData=String(data||'');}).catch(function(){});}catch(e){}
      }
    }catch(e){}
  }
  function faviconBadgeHref(){var src=faviconState.originalData||faviconState.originalHref||location.origin+'/favicon.ico';var svg='<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><image href="'+String(src).replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'" width="32" height="32" preserveAspectRatio="xMidYMid meet"/><circle cx="25" cy="7" r="6" fill="#ff334f" stroke="white" stroke-width="2"/></svg>';return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);}
  function setFaviconBadge(show){try{if(faviconState.link)faviconState.link.href=show?faviconBadgeHref():faviconState.originalHref;}catch(e){}}
  function updateFaviconNotification(count){var show=Number(count)>0;if(!show){if(faviconState.blinkTimer){clearInterval(faviconState.blinkTimer);faviconState.blinkTimer=null;}faviconState.on=false;setFaviconBadge(false);return;}if(faviconState.blinkTimer)return;faviconState.on=true;setFaviconBadge(true);faviconState.blinkTimer=setInterval(function(){faviconState.on=!faviconState.on;setFaviconBadge(faviconState.on);},700);}
  function initFaviconWatcher(){setupFaviconBadge();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initFaviconWatcher,{once:true});else initFaviconWatcher();

  // Backend cloud: substitui qualquer endereço antigo salvo no Tampermonkey.
  GM_setValue(key+'server',CLOUD_SERVER);
  var token=GM_getValue(key+'token','');
  var member=GM_getValue(key+'member','');
  var role=GM_getValue(key+'role','implementation_user');
  var chatLoading=false,typingPolling=false,baruiPolling=false,remotePolling=false,refreshing=false,readSentKey='',chatFastSince='';
  var remoteResultCache={},remoteResultWaiters={};
  var UpNativeNotification=(typeof Notification!=='undefined')?Notification:null;

  function installPageBridge(){
    if(document.documentElement && document.getElementById('upstatus-page-bridge')) return;
    var s=document.createElement('script');
    s.id='upstatus-page-bridge';
    s.textContent=\`(function(){
      if(window.__upstatusBridgeInstalled)return;
      window.__upstatusBridgeInstalled=true;
      // Silencia SOMENTE as notificações nativas do próprio Sale Smartly.
      // O UpStatus cria suas notificações pelo evento UPSTATUS_EXTERNAL_NOTIFICATION,
      // usando a Notification nativa salva aqui, então elas continuam aparecendo.
      try{
        var NativeNotification=window.Notification;
        if(NativeNotification && !window.__upstatusNativeNotification){
          window.__upstatusNativeNotification=NativeNotification;
          function SilentSaleSmartlyNotification(title,options){
            var chatOpen=false;
            try{var chatEl=document.getElementById('upstatus-chat');chatOpen=!!(chatEl&&!chatEl.classList.contains('hidden'));}catch(e){}
            this.title=String(title||'');
            this.body=options&&options.body||'';
            this.tag=options&&options.tag||'';
            this.data=options&&options.data;
            this.onclick=null; this.onclose=null; this.onshow=null;
            this.close=function(){try{if(this.onclose)this.onclose();}catch(e){}};
            this.__upstatusSuppressed=chatOpen;
          }
          try{Object.defineProperty(SilentSaleSmartlyNotification,'permission',{configurable:true,get:function(){return NativeNotification.permission;}})}catch(e){}
          SilentSaleSmartlyNotification.requestPermission=function(){return NativeNotification.requestPermission.apply(NativeNotification,arguments);};
          SilentSaleSmartlyNotification.__upstatusSilent=true;
          window.Notification=SilentSaleSmartlyNotification;
        }
        try{
          if(window.ServiceWorkerRegistration && ServiceWorkerRegistration.prototype && ServiceWorkerRegistration.prototype.showNotification){
            ServiceWorkerRegistration.prototype.showNotification=function(){return Promise.resolve();};
          }
        }catch(e){}
        document.addEventListener('UPSTATUS_EXTERNAL_NOTIFICATION',function(ev){
          try{
            var d=ev.detail||{};
            if(!window.__upstatusNativeNotification || window.__upstatusNativeNotification.permission!=='granted')return;
            var n=new window.__upstatusNativeNotification(d.title||'UpStatus',d.options||{});
            n.onclick=function(){
              try{window.focus();}catch(e){}
              try{document.dispatchEvent(new CustomEvent('UPSTATUS_EXTERNAL_NOTIFICATION_CLICK',{detail:{type:d.type||'',id:d.id||''}}));}catch(e){}
              try{n.close();}catch(e){}
            };
          }catch(e){}
        });
      }catch(e){}
      // Silencia SOMENTE o áudio de notificação do Sale Smartly.
      // Não mexer em outros <audio>/<video> nem em Web Audio, pois o UpStatus
      // usa Web Audio para seus próprios alertas (menção e BARUI).
      try{
        var mediaPlay=HTMLMediaElement.prototype.play;
        function isSaleNoticeAudio(el){
          try{
            if(!el || el.tagName!=='AUDIO') return false;
            if(el.id==='SoundNoticeAudio') return true;
            var src=el.currentSrc||el.src||'';
            return /\\/ling_2\\.mp3(?:$|[?#])/i.test(src);
          }catch(e){ return false; }
        }
        HTMLMediaElement.prototype.play=function(){
          if(isSaleNoticeAudio(this)){
            try{this.pause();this.muted=true;this.volume=0;}catch(e){}
            return Promise.resolve();
          }
          return mediaPlay.apply(this,arguments);
        };
      }catch(e){}
      var hya=null,projectId='184300',cpl=null,clientType='pc';
      function capture(raw,init){
        try{
          var u=new URL(typeof raw==='string'?raw:raw.url,location.href);
          if(u.hostname!=='api.salesmartly.com')return;
          var hp=u.searchParams.get('_hya_');
          var pp=u.searchParams.get('project_id')||u.searchParams.get('_xma_');
          if(pp)projectId=pp;
          if(init&&init.headers){
            try{
              var hs=init.headers;
              if(typeof Headers!=='undefined' && hs instanceof Headers){
                var c=hs.get('Cpl')||hs.get('cpl');
                var ct=hs.get('Client-Type')||hs.get('client-type');
                if(c)cpl=c;
                if(ct)clientType=ct;
              }else if(Array.isArray(hs)){
                hs.forEach(function(pair){
                  if(!pair||pair.length<2)return;
                  var n=String(pair[0]).toLowerCase(),v=String(pair[1]);
                  if(n==='cpl'&&v)cpl=v;
                  if(n==='client-type'&&v)clientType=v;
                });
              }else{
                Object.keys(hs).forEach(function(k){
                  var n=k.toLowerCase(),v=String(hs[k]||'');
                  if(n==='cpl'&&v)cpl=v;
                  if(n==='client-type'&&v)clientType=v;
                });
              }
            }catch(e){}
          }
          if(hp){
            hya=hp;
            document.dispatchEvent(new CustomEvent('UPSTATUS_HYA',{detail:{hya:hya,projectId:projectId}}));
          }
        }catch(e){}
      }
      var oldFetch=window.fetch;
      window.fetch=function(input,init){
        try{capture(input,init)}catch(e){}
        return oldFetch.apply(this,arguments);
      };
      var oldOpen=XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open=function(method,url){
        try{capture(url)}catch(e){}
        return oldOpen.apply(this,arguments);
      };
      var oldSetRequestHeader=XMLHttpRequest.prototype.setRequestHeader;
      XMLHttpRequest.prototype.setRequestHeader=function(name,value){
        try{
          var n=String(name||'').toLowerCase(),v=String(value||'');
          if(n==='cpl'&&v)cpl=v;
          if(n==='client-type'&&v)clientType=v;
        }catch(e){}
        return oldSetRequestHeader.apply(this,arguments);
      };
      try{
        performance.getEntriesByType('resource').forEach(function(x){capture(x.name)});
      }catch(e){}
      function rescan(){
        try{performance.getEntriesByType('resource').forEach(function(x){capture(x.name)});}catch(e){}
      }
      setTimeout(rescan,500);
      setTimeout(rescan,1500);
      setTimeout(rescan,3000);
      setTimeout(rescan,5000);
      document.addEventListener('UPSTATUS_SET',async function(e){
        var detail=e.detail||{};
        if(!hya){
          rescan();
          var started=Date.now();
          while(!hya && Date.now()-started<8000){
            await new Promise(function(resolve){setTimeout(resolve,250)});
            rescan();
          }
        }
        if(!hya){
          document.dispatchEvent(new CustomEvent('UPSTATUS_RESULT',{detail:{ok:false,error:'A sessão do Sale Smartly ainda não forneceu o identificador da API (_hya_). Aguarde a página carregar e tente novamente.'}}));
          return;
        }
        try{
          var onlineStatus=String(detail.status);
          var url='https://api.salesmartly.com/sys/project/user-list/online-switch'
            +'?_xma_='+encodeURIComponent(projectId)
            +'&project_id='+encodeURIComponent(projectId)
            +'&_hya_='+encodeURIComponent(hya)
            +'&_ta_='+Date.now();
          var body=new URLSearchParams();
          body.set('online_status',onlineStatus);
          body.set('event_type','0');
          body.set('project_id',projectId);
          var requestHeaders={'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'};
          if(clientType)requestHeaders['Client-Type']=clientType;
          if(cpl)requestHeaders['Cpl']=cpl;
          var r=await fetch(url,{
            method:'POST',
            credentials:'include',
            headers:requestHeaders,
            body:body.toString()
          });
          var x=await r.json().catch(function(){return null});
          if(!r.ok || !x || x.code!==0){
            document.dispatchEvent(new CustomEvent('UPSTATUS_RESULT',{detail:{ok:false,error:(x&&x.msg)||('Sale Smartly retornou HTTP '+r.status+'.')}}));
            return;
          }
          document.dispatchEvent(new CustomEvent('UPSTATUS_RESULT',{detail:{ok:true}}));
        }catch(err){
          document.dispatchEvent(new CustomEvent('UPSTATUS_RESULT',{detail:{ok:false,error:err.message||'Falha ao sincronizar com Sale Smartly.'}}));
        }
      });
    })();\`;
    (document.documentElement||document.head||document.body).appendChild(s);
    s.remove();
  }

  installPageBridge();

  var labels={online:'Online',busy:'Ocupado',away:'Ausente',offline:'Sem status'};
  var reasons=[{value:'Em treinamento',label:'Em treinamento',icon:'training'},{value:'Em aula aberta',label:'Em aula aberta',icon:'book'},{value:'Ocupado com tarefa',label:'Ocupado com tarefa',icon:'tools'},{value:'Em reunião',label:'Em reunião',icon:'meeting'},{value:'Almoçando',label:'Almoçando',icon:'lunch'},{value:'Outro',label:'Outro',icon:'edit'}];
  var historyCache=[];
  var chatCache=[];
  var profileCache={};
  var mediaBlobCache={};
  var resizeObserver=null;
  var chatUnread=0;
  var chatInitialized=false;
  var seenMentionIds={};
  var audioCtx=null;
  var audioUnlocked=false;
  var mediaRecorder=null;
  var recordingChunks=[];
  var recordingTimer=null;
  var recordingStartedAt=0;
  var chatReplyTo=null;
  var chatContextMessageId=null;
  var luccaOnline=false;
  var lastLuccaJoinEventId='';
  var baruiState={active:false,sequence:0,target:'',sender:'',startedAt:0};
  var baruiOutgoing={active:false,target:''};
  var baruiLastBeep=0;
  var baruiExternalNotifiedSequence=0;
  var originalTitle=document.title;
  var currentStatus='offline';
  var CURRENT_VERSION='2.7.25';
  var UPDATE_URL=server+'/upstatus.user.js';
  var externalNotifPermission='default';
  var externalNotifSeen={};
  function iconSvg(name,cls){var p={
    online:'<circle cx="12" cy="12" r="8" fill="currentColor"/>',
    busy:'<circle cx="12" cy="12" r="8" fill="currentColor"/>',
    away:'<circle cx="12" cy="12" r="8" fill="currentColor"/>',
    clock:'<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    download:'<path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    sound:'<path d="M5 10v4h3l4 3V7l-4 3H5Z" fill="currentColor"/><path d="M15 9.5a4 4 0 0 1 0 5M17.5 7a7.5 7.5 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    chat:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H10l-5 4v-4.5A2.5 2.5 0 0 1 2.5 12V6A2.5 2.5 0 0 1 4 5.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7 8h10M7 11h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    training:'<path d="M3 9 12 5l9 4-9 4-9-4Z" fill="currentColor"/><path d="M6 11v4c2 2 10 2 12 0v-4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M21 9v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    book:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v16h5.5A2.5 2.5 0 0 1 20 21V5.5Z" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    tools:'<path d="m14.5 6.5 3-3a4 4 0 0 0 5 5l-3 3-3-3-7 7a2 2 0 1 1-3-3l7-7Z" fill="currentColor"/>',
    meeting:'<path d="M4 5h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3.5A2 2 0 0 1 3 12V7a2 2 0 0 1 1-2Z" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M18 8h1a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2v2l-3-2h-2" fill="none" stroke="currentColor" stroke-width="1.7"/>',
    lunch:'<path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-2Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6 12c.5-3 3-5 6-5s5.5 2 6 5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M20 5v7m-2-7v3m4-3v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    edit:'<path d="m5 19 1-4L16 5a2 2 0 0 1 3 3L9 18l-4 1Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m14 7 3 3" stroke="currentColor" stroke-width="1.8"/>',
    skull:'<path d="M8 16h8v3H8z" fill="currentColor"/><path d="M5 10a7 7 0 0 1 14 0c0 3-2 5-4 6H9c-2-1-4-3-4-6Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10" r="1.2" fill="currentColor"/><circle cx="15" cy="10" r="1.2" fill="currentColor"/>',
    bell:'<path d="M6 17h12l-1.5-2v-4a4.5 4.5 0 0 0-9 0v4L6 17Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 20h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    emoji:'<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/><path d="M8.5 14c1 1.35 2.17 2 3.5 2s2.5-.65 3.5-2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    photo:'<rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10" r="1.5" fill="currentColor"/><path d="m5 17 4-4 3 3 2-2 5 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    update:'<path d="M19 8a7 7 0 1 0 1 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M19 4v4h-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' ,
    sun:'<circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    moon:'<path d="M20 15.5A8.5 8.5 0 0 1 8.5 4a8.5 8.5 0 1 0 11.5 11.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    power:'<path d="M12 3v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7.1 6.1a7 7 0 1 0 9.8 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' ,
    pulse:'<path d="M3 12h4l2-5 4 10 2-5h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    gear:'<path d="M19.43 12.98c.04-.32.07-.65.07-.98s-.02-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.37-.31-.6-.22l-2.49 1a7.18 7.18 0 0 0-1.69-.98L14.5 2.42A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.49.42l-.38 2.65c-.61.25-1.18.58-1.69.98l-2.49-1a.49.49 0 0 0-.6.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.08.65-.08.98s.03.66.08.98l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46c.12.22.37.31.6.22l2.49-1c.51.4 1.08.73 1.69.98l.38 2.65c.04.24.24.42.49.42h4c.25 0 .45-.18.49-.42l.38-2.65c.61-.25 1.18-.58 1.69-.98l2.49 1c.23.09.48 0 .6-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z" fill="currentColor"/>',
    plugoff:'<path d="M9 3v5m6-5v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M6.5 8h11v2.5a5.5 5.5 0 0 1-11 0V8Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 16v3m-3 2h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="m4 4 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  }; return '<svg class="up-icon '+(cls||'')+'" viewBox="0 0 24 24" aria-hidden="true">'+(p[name]||p.edit)+'</svg>'}
  function reasonIcon(reason){var r=reasons.find(function(x){return x.value===reason});return '<span class="up-icon-wrap">'+iconSvg(r?r.icon:'edit')+'</span>'}
  function reasonLabel(reason){var r=reasons.find(function(x){return x.value===reason});return r?r.label:reason}
  function reasonEmoji(reason){return reasonIcon(reason)}

  function api(method,route,data){
    return new Promise(function(resolve,reject){
      GM_xmlhttpRequest({
        method:method,
        url:(function(){
          var u=server+route;
          if(/^https:\\/\\/[^/]+\\.supabase\\.co\\/functions\\/v1\\/upstatus$/i.test(server)){
            u+=(u.indexOf('?')>=0?'&':'?')+'forceFunctionRegion=us-west-2';
          }
          return u;
        })(),
        headers:Object.assign({'Content-Type':'application/json'},token?{'X-UpStatus-Token':token}:{}),
        data:data?JSON.stringify(data):undefined,
        onload:function(r){
          var x;
          try{x=JSON.parse(r.responseText)}catch(e){reject(new Error('Resposta inválida do servidor.'));return}
          if(r.status>=400||x.error){reject(new Error(x.error||'Erro de comunicação.'));return}
          resolve(x);
        },
        onerror:function(){reject(new Error('Não foi possível conectar ao servidor UpStatus.'))}
      });
    });
  }

  function node(tag,props){var x=document.createElement(tag);Object.assign(x,props||{});return x}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]})}
  function fmtTime(x){return x?new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date(x)):''}
  function fmtDay(x){return x?new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(x)):''}
  function statusIcon(s){return '<span class="up-icon-wrap status-icon '+(s||'')+'">'+iconSvg(s==='online'?'online':s==='busy'?'busy':'away')+'</span>'}
  function message(txt,bad){
    var x=card.querySelector('.up-message');
    if(x){x.textContent=txt||'';x.style.color=bad?'#ff8499':'#75dba0'}
  }

  var style=node('style',{textContent:
    '#upstatus-root{position:fixed;right:24px;bottom:24px;z-index:2147483647;font:14px Segoe UI,Arial,sans-serif;color:#edf2fb}'+
        '.up-main-alert{animation:upAlertShake .45s ease-in-out 1}'+
    '.up-main-alert.up-barui-alert{animation:upAlertShake .35s ease-in-out infinite}'+
    '@keyframes upAlertShake{0%,100%{transform:translateX(0) rotate(0)}20%{transform:translateX(-4px) rotate(-3deg)}40%{transform:translateX(4px) rotate(3deg)}60%{transform:translateX(-3px) rotate(-2deg)}80%{transform:translateX(3px) rotate(2deg)}}'+
'#upstatus-bubble{position:relative;width:42px;height:42px;border:3px solid #6b7688;border-radius:50%;background:#5b6574;overflow:visible;padding:0;box-shadow:0 5px 16px #0009;cursor:grab;display:flex;align-items:center;justify-content:center;user-select:none;-webkit-user-select:none;touch-action:none;line-height:1;transition:background .18s,border-color .18s}'+
    '#upstatus-bubble .up-bubble-avatar{display:block;width:100%;height:100%;border-radius:50%;object-fit:cover;box-sizing:border-box;pointer-events:none}'+
    '#upstatus-bubble .up-bubble-icon{width:22px;height:22px;color:#fff}'+
    '.up-notify-dot{position:absolute;right:-10px;top:-10px;min-width:18px;height:18px;padding:0 4px;border-radius:999px;background:#ff334f;border:2px solid #19212e;display:none;align-items:center;justify-content:center;box-sizing:border-box;color:#fff;font:800 10px/1 Segoe UI,Arial,sans-serif}.up-notify-dot.show{display:block}.up-quick-chat-bubble{position:absolute;left:-7px;top:-7px;width:22px;height:22px;border:2px solid #19212e;border-radius:50%;background:#687384;color:#fff;box-sizing:border-box;padding:0;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px #0008;cursor:pointer;z-index:5;transition:background .18s,border-color .18s,transform .18s}.up-quick-chat-bubble:hover{background:#7a8799;border-color:#253149;transform:scale(1.08)}.up-quick-chat-bubble.lucca-active{background:#c52f48;border-color:#ff667b;animation:upLuccaPulse .8s infinite alternate}.up-quick-chat-bubble.lucca-active:hover{background:#d63b52;border-color:#ff8292}@keyframes upLuccaPulse{from{box-shadow:0 4px 10px #0008,0 0 0 0 #ff334f66}to{box-shadow:0 4px 10px #0008,0 0 0 7px #ff334f33}}.up-quick-chat-icon{width:12px;height:12px}.up-update-dot{position:absolute;right:-8px;top:-8px;width:22px;height:22px;border-radius:50%;background:#4f7dff;border:2px solid #19212e;display:none;align-items:center;justify-content:center;font-size:12px;line-height:1;box-sizing:border-box;cursor:pointer;pointer-events:auto}.up-update-dot.show{display:flex}.up-update-dot:hover{background:#6b93ff;transform:scale(1.08)}'+
    '.up-barui-incoming{position:absolute;right:52px;bottom:0;width:315px;z-index:90;pointer-events:auto}.up-barui-incoming.hidden{display:none}.up-barui-incoming-card{position:relative;box-sizing:border-box;padding:13px 12px 11px;border:2px solid #ff3d58;border-radius:14px;background:rgba(75,12,25,.94);color:#fff;box-shadow:0 0 0 3px rgba(255,45,72,.14),0 10px 30px rgba(0,0,0,.35);animation:upbaruiAlert .62s infinite alternate}.up-barui-incoming-title{font-size:13px;font-weight:900;letter-spacing:.2px;line-height:1.2;text-transform:uppercase}.up-barui-incoming-sub{font-size:11px;color:#ffd6dc;margin-top:4px}.up-barui-incoming-actions{display:flex;gap:7px;margin-top:10px}.up-barui-incoming-actions button{flex:1;border:0;border-radius:8px;padding:8px 9px;font:800 12px Segoe UI,Arial,sans-serif;cursor:pointer}.up-barui-attend{background:#fff;color:#b51f39}.up-barui-stop{background:#8d1f32;color:#fff}.up-barui-incoming.shake{animation:upbaruiAlert .62s infinite alternate}.up-toast-stack{position:absolute;right:52px;bottom:0;width:300px;display:flex;flex-direction:column-reverse;gap:7px;pointer-events:none}.up-toast{position:relative;pointer-events:auto;box-sizing:border-box;width:100%;padding:9px 28px 9px 11px;border:1px solid rgba(90,105,130,.45);border-radius:12px;background:rgba(25,33,46,.82);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 8px 24px rgba(0,0,0,.22);color:#e7edf7;animation:uptoastIn .16s ease-out}.up-toast-name{font-size:11px;font-weight:750;color:#aebbd0;line-height:1.15;margin-bottom:3px}.up-toast-text{font-size:12px;line-height:1.35;white-space:pre-wrap;word-break:break-word}.up-toast-close{position:absolute;right:7px;top:6px;width:18px;height:18px;border:0;border-radius:50%;background:transparent;color:#9aa8bc;font-size:14px;line-height:18px;padding:0;cursor:pointer}.up-toast-close:hover{background:rgba(127,145,170,.16);color:#edf2fb}@keyframes uptoastIn{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}@media(prefers-color-scheme:light){.up-toast{background:rgba(255,255,255,.82);border-color:rgba(60,75,95,.22);color:#1d2735;box-shadow:0 8px 24px rgba(0,0,0,.14)}.up-toast-name{color:#526176}.up-toast-close{color:#718096}.up-toast-close:hover{background:rgba(80,95,115,.1);color:#263345}}'+
    '.up-bubble-icon{width:24px;height:24px}'+
    '#upstatus-card{position:absolute;bottom:55px;right:0;width:365px;max-width:calc(100vw - 32px);background:#19212e;border:1px solid #354258;border-radius:16px;padding:18px;box-shadow:0 16px 42px #000b}'+
    '#upstatus-history{position:absolute;bottom:55px;right:0;width:365px;max-width:calc(100vw - 32px);height:520px;box-sizing:border-box;background:#19212e;border:1px solid #354258;border-radius:16px;padding:18px;box-shadow:0 16px 42px #000b;overflow:hidden;display:flex;flex-direction:column}'+
    '#upstatus-chat{position:absolute;bottom:55px;right:0;width:365px;max-width:calc(100vw - 32px);height:520px;box-sizing:border-box;background:#19212e;border:1px solid #354258;border-radius:16px;padding:18px;box-shadow:0 16px 42px #000b;overflow:hidden;display:flex;flex-direction:column}'+
    '#upstatus-card,#upstatus-history,#upstatus-chat{resize:none;min-width:320px;min-height:420px;max-width:calc(100vw - 32px);max-height:calc(100vh - 32px)}'+
    '#upstatus-card.hidden,#upstatus-history.hidden,#upstatus-chat.hidden,.up-reasons.hidden,.up-select.hidden,.up-input.hidden,.up-confirm.hidden,.up-history-btn.hidden{display:none}'+
    '.up-head,.up-member-top,.up-history-head{display:flex;justify-content:space-between;align-items:center}'+
    '.up-title,.up-history-title{font-size:18px;font-weight:750}'+
    '.up-you,.up-reason{color:#aab6c9;font-size:12px;margin-top:4px}'+
    '.up-actions{display:flex;gap:6px;align-items:center;position:relative}.up-chat-btn,.up-logout,.up-history-btn,.up-close,.up-settings-btn{border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer;box-sizing:border-box;height:34px;min-width:34px}.up-logout{background:#3a2730;color:#ffb0bc}.up-logout:hover{background:#54313c}.up-settings-btn{display:inline-flex;align-items:center;justify-content:center}.up-settings-btn .up-icon{width:17px;height:17px}.up-settings-menu{position:absolute;right:0;top:42px;width:210px;padding:8px;background:#111722;border:1px solid #3a475b;border-radius:10px;box-shadow:0 12px 30px #0009;z-index:70}.up-settings-menu.hidden{display:none}.up-settings-menu button{width:100%;display:flex;align-items:center;gap:8px;border:0;border-radius:7px;padding:9px;background:transparent;color:#dbe5f5;text-align:left;cursor:pointer;font:inherit;font-size:12px}.up-settings-menu button:hover{background:#273247}.up-settings-menu button .up-icon{width:16px;height:16px}.up-settings-menu .up-settings-notifications.enabled{color:#7ef0b6}.up-settings-menu .up-settings-notifications.denied{color:#ff9aaa}'+
    '.up-chat-btn{position:relative;border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer}.up-chat-btn.lucca-active{background:#c52f48;color:#fff;animation:upLuccaPulse .8s infinite alternate}.up-notification-btn{border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer;box-sizing:border-box;height:34px;min-width:34px;font-size:15px;line-height:1}.up-notification-btn.enabled{background:#184f3a;color:#7ef0b6}.up-notification-btn.denied{background:#3a2730;color:#ff9aaa}.up-chat-btn .up-chat-notify-dot{position:absolute;right:-3px;top:-3px;width:10px;height:10px;border-radius:50%;background:#ff4d67;border:2px solid #19212e;display:none}.up-chat-btn .up-chat-notify-dot.show{display:block}.up-barui-main{position:relative;width:34px;height:34px;padding:0;border:0;border-radius:50%;background:#273247;color:#c6d1e1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.up-barui-main .up-icon{width:17px;height:17px}.up-barui-main.active,.up-barui-main.incoming{background:#c52f48;color:#fff;animation:upbaruibtn .55s infinite alternate}.up-barui-popup{position:absolute;right:0;top:42px;width:230px;padding:10px;background:#111722;border:1px solid #3a475b;border-radius:10px;box-shadow:0 12px 30px #0009;z-index:60}.up-barui-popup.hidden{display:none}.up-barui-popup-title{font-size:12px;font-weight:750;color:#cbd5e4;margin-bottom:7px}.up-barui-popup-row{display:flex;gap:6px}.up-barui-popup select{flex:1;min-width:0;border:1px solid #3a475b;border-radius:7px;background:#19212e;color:#edf2fb;padding:7px;font-size:12px}.up-barui-popup button{border:0;border-radius:7px;background:#c52f48;color:#fff;font-weight:750;padding:7px 9px;cursor:pointer}.up-barui-popup button:disabled{opacity:.6;cursor:wait}.up-barui-row{display:flex;gap:7px;margin-top:8px}.up-barui-select{flex:1;min-width:0;border:1px solid #3a475b;border-radius:8px;background:#111722;color:#edf2fb;padding:8px}.up-barui-btn{border:0;border-radius:8px;padding:8px 11px;background:#a52a3c;color:#fff;font-weight:800;cursor:pointer}.up-barui-btn.active{background:#d66b1f}.up-barui-hint{font-size:11px;color:#8f9db2;margin-top:5px}.up-barui-active{animation:upbarui .55s infinite alternate}@keyframes upbaruibtn{from{transform:scale(1);box-shadow:0 0 0 0 #ff334f55}to{transform:scale(1.08);box-shadow:0 0 0 7px #ff334f55}}@keyframes upbarui{from{box-shadow:0 7px 22px #0009}to{box-shadow:0 0 0 7px #ff334f55,0 7px 22px #0009}}.up-icon{display:inline-block;width:16px;height:16px;vertical-align:-3px;flex:0 0 auto}.up-icon-wrap{display:inline-flex;align-items:center;justify-content:center;vertical-align:middle}.up-history-btn{font-size:17px;padding:5px 8px;line-height:1}.up-history-btn .up-icon{width:18px;height:18px}.up-select,.up-history-list,.up-history-head{font-family:"Segoe UI",Arial,sans-serif}.up-reason-picker{position:relative}.up-reason-trigger{width:100%;display:flex;align-items:center;gap:8px;padding:10px;border-radius:8px;border:1px solid #3a475b;background:#111722;color:#edf2fb;cursor:pointer;text-align:left}.up-reason-menu{position:absolute;z-index:30;left:0;right:0;margin-top:4px;background:#111722;border:1px solid #3a475b;border-radius:8px;padding:4px;box-shadow:0 12px 30px #0008}.up-reason-menu.hidden{display:none}.up-reason-option{width:100%;display:flex;align-items:center;gap:8px;border:0;background:transparent;color:#edf2fb;padding:9px 8px;border-radius:6px;cursor:pointer;text-align:left}.up-reason-option:hover{background:#273247}.up-reason-text{flex:1}.up-status-icon.online{color:#7be1a7}.up-status-icon.busy{color:#ff6b7a}.up-status-icon.away{color:#c7d0df}.up-export{height:34px;min-width:34px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:5px;border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer;font-size:12px;font-weight:700}.up-statuses{display:flex;gap:7px;margin:16px 0 12px}'+

    '.up-status{border:0;border-radius:8px;padding:9px;font-weight:700;cursor:pointer}.online{background:#173f2b;color:#7be1a7}.busy{background:#4d1b25;color:#ff6b7a}.away{background:#303949;color:#c7d0df}'+
    '.up-label{display:block;margin-bottom:6px;font-weight:650}.up-select,.up-input{width:100%;padding:10px;border-radius:8px;border:1px solid #3a475b;background:#111722;color:#edf2fb}.up-input{margin-top:7px}'+
    '.up-confirm{margin-top:7px;width:100%;border:0;border-radius:8px;padding:9px;background:#4f7dff;color:#fff;font-weight:700;cursor:pointer}'+
    '.up-message{min-height:20px;font-size:12px;color:#ff8499;margin-top:8px}.up-notice{margin:10px 0;padding:9px;border-radius:8px;background:#173f2b;color:#9ce5b8;font-size:12px}'+
    '.up-team-title{font-weight:750;margin:13px 0 7px}.up-member{padding:9px 0;border-bottom:1px solid #303b4d}.up-member:last-child{border:0}.up-badge{font-size:11px;font-weight:700;border-radius:12px;padding:3px 6px}.b-online{background:#173f2b;color:#7be1a7}.b-busy{background:#4d1b25;color:#ff6b7a}.b-away,.b-offline{background:#303949;color:#c7d0df}.up-time{font-size:11px;color:#8390a4;margin-top:4px}'+
    '.up-chat-lucca-alert{flex:0 0 auto;position:relative;z-index:20;margin-top:8px;padding:9px 12px;border:1px solid #a92e43;border-radius:9px;background:#351724;color:#ff9aaa;font-size:11px;font-weight:850;letter-spacing:.2px;box-shadow:0 4px 14px #0005}.up-chat-lucca-alert.hidden{display:none}.up-chat-system-event{display:flex;justify-content:center;padding:8px 0 6px}.up-chat-system-event span{padding:6px 10px;border-radius:999px;background:#252e3c;border:1px solid #3a475b;color:#aebbd0;font-size:10px;font-weight:800;text-align:center}.up-chat-system-event.join span{background:#351724;border-color:#7c2a3e;color:#ff9aaa}.up-chat-list{height:auto;flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;margin-top:12px;margin-right:-18px;margin-left:-5px;padding-right:18px;padding-left:5px;scrollbar-width:thin;scrollbar-color:rgba(139,149,164,.35) transparent}.up-chat-list::-webkit-scrollbar{width:6px}.up-chat-list::-webkit-scrollbar-track{background:transparent}.up-chat-list::-webkit-scrollbar-thumb{background:rgba(139,149,164,.30);border-radius:999px}.up-chat-list::-webkit-scrollbar-thumb:hover{background:rgba(139,149,164,.50)}.up-chat-item{position:relative;display:flex;align-items:flex-end;gap:7px;padding:6px 0}.up-chat-item.own{flex-direction:row-reverse;cursor:context-menu}.up-chat-avatar{width:28px;height:28px;flex:0 0 28px;border-radius:50%;object-fit:cover;background:#273247;border:2px solid transparent;box-sizing:border-box}.up-chat-avatar.up-chat-presence-idle{border-color:#62a7ff;box-shadow:0 0 7px rgba(83,155,255,.6)}.up-chat-avatar.up-chat-presence-active{border-color:#55e58b;animation:upChatPresencePulse 1.9s ease-in-out infinite}@keyframes upChatPresencePulse{0%,100%{box-shadow:0 0 0 0 rgba(82,224,137,.12),0 0 7px rgba(82,224,137,.62)}50%{box-shadow:0 0 0 1px rgba(82,224,137,.28),0 0 10px rgba(82,224,137,.72)}}.up-chat-bubble{position:relative;max-width:78%;min-width:52px;padding:7px 9px;border-radius:12px 12px 12px 3px;background:#273247;color:#e7edf7;box-sizing:border-box;box-shadow:0 3px 10px #0003}.up-chat-item.own .up-chat-bubble{border-radius:12px 12px 3px 12px;background:#3159bd}.up-chat-item.lucca .up-chat-bubble{background:rgba(106,18,39,.48);border:1px solid rgba(255,76,108,.48);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 4px 18px rgba(255,45,82,.12),inset 0 1px 0 rgba(255,255,255,.07)}.up-chat-item.lucca .up-chat-meta b{color:#ff91a7}.up-chat-item.lucca .up-chat-text{color:#ffe9ee}.up-chat-system-event.clear span{background:#273247;border-color:#4f7dff;color:#a9c2ff}.up-chat-photo{cursor:zoom-in}.up-chat-lightbox{position:fixed;inset:0;z-index:2147483647;background:rgba(5,8,13,.88);display:flex;align-items:center;justify-content:center;padding:28px;box-sizing:border-box;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}.up-chat-lightbox.hidden{display:none}.up-chat-lightbox img{max-width:92vw;max-height:90vh;width:auto;height:auto;object-fit:contain;border-radius:12px;box-shadow:0 20px 70px #000b;border:1px solid #52627b}.up-chat-lightbox-close{position:absolute;right:22px;top:18px;width:38px;height:38px;border:0;border-radius:50%;background:rgba(39,50,71,.9);color:#fff;font-size:25px;line-height:38px;cursor:pointer}.up-chat-lightbox-close:hover{background:#4f5e75}.up-chat-meta{display:flex;align-items:center;gap:7px;font-size:10px;color:#9eabc0}.up-chat-meta b{font-weight:750;color:#cbd5e4}.up-chat-item.own .up-chat-meta{justify-content:flex-end}.up-chat-read{font-size:11px;color:#aebbd0;margin-left:4px;cursor:help;user-select:none}.up-chat-read.read{color:#63a2ff}.up-chat-own-meta{text-align:right;min-height:13px}.up-chat-profile-btn{width:34px;height:34px;padding:0;border:0;border-radius:50%;background:#273247;cursor:pointer;overflow:hidden}.up-chat-profile-btn img{width:100%;height:100%;object-fit:cover;display:block}.up-chat-title-wrap{display:flex;align-items:center;gap:8px}.up-chat-profile-modal{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}.up-chat-profile-modal.hidden{display:none}.up-chat-profile-dialog{width:min(330px,calc(100vw - 40px));padding:18px;border:1px solid #40506a;border-radius:14px;background:#182130;box-shadow:0 18px 45px #000b}.up-chat-profile-preview{width:84px;height:84px;margin:0 auto 12px;border-radius:50%;object-fit:cover;background:#273247;border:2px solid #40506a;display:block}.up-chat-profile-file{width:100%;margin:8px 0;color:#cbd5e4;font-size:12px}.up-chat-profile-actions{display:flex;gap:7px}.up-chat-profile-actions button{flex:1;border:0;border-radius:8px;padding:9px;cursor:pointer;font-weight:750}.up-chat-profile-save{background:#4f7dff;color:#fff}.up-chat-profile-cancel{background:#273247;color:#cbd5e4}.up-chat-profile-message{min-height:18px;font-size:11px;color:#ff9aaa;margin:7px 0}.up-delete-action{position:absolute;right:4px;top:28px;border:1px solid #4a566b;border-radius:6px;background:#273247;color:#ff9aaa;padding:4px 7px;font:700 11px Segoe UI,Arial,sans-serif;cursor:pointer;box-shadow:0 5px 14px #0006;z-index:5}.up-delete-action:hover{background:#3a2530;color:#ffb5c1}.up-delete-action.hidden{display:none}.up-chat-meta{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:#8fa0b8}.up-chat-text{font-size:13px;color:#e7edf7;white-space:pre-wrap;word-break:break-word;margin-top:4px}.up-chat-typing{display:flex;align-items:center;gap:7px;min-height:28px;margin:2px 0 3px 35px;color:#9eabc0;font-size:10px}.up-chat-typing.hidden{display:none}.up-chat-typing-avatar{width:22px;height:22px;border-radius:50%;object-fit:cover;border:1px solid #3a475b;background:#273247}.up-chat-typing-dots{display:inline-flex;align-items:center;gap:3px;padding:5px 7px;border-radius:10px 10px 10px 3px;background:#273247}.up-chat-typing-dots i{width:4px;height:4px;border-radius:50%;background:#aebbd0;animation:upTyping 1s infinite ease-in-out}.up-chat-typing-dots i:nth-child(2){animation-delay:.15s}.up-chat-typing-dots i:nth-child(3){animation-delay:.3s}@keyframes upTyping{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-3px);opacity:1}}.up-member-top{display:flex;align-items:center;gap:7px}.up-member-identity{display:flex;align-items:center;gap:6px;flex:1;min-width:0}.up-member-identity b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.up-member-version{font-size:10px;font-weight:700;color:#8fa0b8;background:#222d3d;border:1px solid #344158;border-radius:999px;padding:2px 5px;white-space:nowrap}.up-member-presence{width:8px;height:8px;border-radius:50%;flex:0 0 8px;background:#46505f;box-shadow:0 0 0 2px rgba(70,80,95,.12)}.up-member-presence.online{background:#579cff;box-shadow:0 0 7px rgba(87,156,255,.55)}.up-member-presence.chat{background:#51df88;box-shadow:0 0 7px rgba(81,223,136,.58)}.up-member-presence.offline{background:#46505f;box-shadow:none}.up-member-barui{width:28px;height:28px;padding:0;border:0;border-radius:50%;background:#273247;color:#c6d1e1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}.up-member-barui .up-icon{width:15px;height:15px}.up-member-barui:hover{background:#36445b}.up-member-barui.active{background:#c52f48;color:#fff;animation:upbaruibtn .55s infinite alternate}.up-member-barui:disabled{opacity:.55;cursor:wait}.up-member-power{width:28px;height:28px;padding:0;border:0;border-radius:50%;background:#273247;color:#c6d1e1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}.up-member-power .up-icon{width:15px;height:15px}.up-member-power:hover{background:#3b465b;color:#fff}.up-member-power:disabled{opacity:.55;cursor:wait}.up-remote-overlay{position:absolute;inset:0;z-index:100;background:rgba(10,15,24,.68);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;border-radius:16px}.up-remote-overlay.hidden{display:none}.up-remote-dialog{width:100%;max-width:315px;background:#182130;border:1px solid #40506a;border-radius:14px;padding:14px;box-sizing:border-box;box-shadow:0 18px 45px #000b}.up-remote-title{font-size:15px;font-weight:800}.up-remote-sub{font-size:11px;color:#9aa8bc;margin-top:3px}.up-remote-statuses{display:flex;gap:6px;margin-top:12px}.up-remote-status{flex:1;border:1px solid #3a475b;border-radius:8px;padding:9px 6px;background:#111722;color:#dce5f2;cursor:pointer;font:700 12px Segoe UI,Arial,sans-serif}.up-remote-status:hover,.up-remote-status.active{background:#30405b;border-color:#5b7fc8}.up-remote-reason{margin-top:9px}.up-remote-reason.hidden{display:none}.up-remote-reason-menu{display:flex;flex-direction:column;gap:3px}.up-remote-reason-option{border:0;background:#111722;color:#dce5f2;border-radius:7px;padding:8px;text-align:left;cursor:pointer;font:12px Segoe UI,Arial,sans-serif}.up-remote-reason-option:hover,.up-remote-reason-option.active{background:#30405b}.up-remote-actions{display:flex;gap:7px;margin-top:12px}.up-remote-actions button{flex:1;border:0;border-radius:8px;padding:9px;font:800 12px Segoe UI,Arial,sans-serif;cursor:pointer}.up-remote-cancel{background:#273247;color:#cbd5e4}.up-remote-confirm{background:#4f7dff;color:#fff}.up-remote-confirm:disabled{opacity:.55;cursor:wait}.up-remote-message{min-height:18px;margin-top:7px;font-size:11px;color:#ff9aaa}.up-chat-text{font-size:13px;color:#e7edf7;white-space:pre-wrap;word-break:break-word;margin-top:4px}.up-chat-photo{display:block;max-width:260px;max-height:210px;width:auto;height:auto;margin-top:6px;border:1px solid #3a475b;border-radius:9px;background:#111722;cursor:zoom-in;object-fit:contain;box-shadow:0 4px 14px #0004}.up-chat-media{display:block;max-width:220px;max-height:150px;margin-top:6px;border:1px solid #3a475b;border-radius:9px;background:#111722;object-fit:contain;box-shadow:0 4px 14px #0004}.up-chat-media-video{width:220px;height:150px}.up-chat-profile-hover{position:fixed;z-index:2147483647;display:none;width:148px;padding:10px;box-sizing:border-box;border:1px solid #52627b;border-radius:12px;background:#182130;box-shadow:0 14px 40px #000b;pointer-events:none;text-align:center}.up-chat-profile-hover.show{display:block}.up-chat-profile-hover img{display:block;width:96px;height:96px;margin:0 auto 7px;border-radius:50%;object-fit:cover;border:2px solid transparent;background:#273247}.up-chat-profile-hover img.up-chat-presence-idle{border-color:#62a7ff;box-shadow:0 0 8px rgba(83,155,255,.62)}.up-chat-profile-hover img.up-chat-presence-active{border-color:#55e58b;animation:upProfilePresencePulse 1.9s ease-in-out infinite}@keyframes upProfilePresencePulse{0%,100%{box-shadow:0 0 0 0 rgba(82,224,137,.12),0 0 7px rgba(82,224,137,.62)}50%{box-shadow:0 0 0 1px rgba(82,224,137,.28),0 0 10px rgba(82,224,137,.72)}}.up-chat-profile-hover-name{font-size:12px;font-weight:750;color:#e7edf7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.up-chat-profile-hover-role{font-size:10px;color:#9eabc0;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.up-chat-compose{position:relative;display:flex;align-items:stretch;gap:6px}.up-chat-compose .up-chat-input{display:block;flex:1 1 auto;width:auto;box-sizing:border-box;min-width:0}.up-chat-tools{display:flex;align-items:stretch;gap:6px;flex:0 0 auto;margin-top:0}.up-mention-menu{position:absolute;left:0;bottom:calc(100% + 8px);z-index:20;display:flex;flex-wrap:wrap;gap:6px;width:100%;padding:7px;box-sizing:border-box;background:#182130;border:1px solid #3a475b;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.32)}.up-mention-menu.hidden{display:none}.up-mention-option{flex:0 0 auto;border:1px solid #344158;background:#243149;color:#dbe5f5;border-radius:8px;padding:6px 9px;cursor:pointer;font:12px Segoe UI,Arial,sans-serif}.up-mention-option:hover{background:#30405b;border-color:#4f7dff}.up-mention-option.up-mention-all{background:#3b315f;border-color:#8065c7;color:#fff}.up-chat-tools{display:flex;gap:6px;flex:0 0 auto}.up-chat-emoji-btn{width:38px;height:42px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;padding:0;border:1px solid #3a475b;border-radius:8px;background:#273247;color:#dbe5f5;cursor:pointer}.up-chat-emoji-btn .up-icon{width:17px;height:17px}.up-chat-emoji-btn:hover{background:#35425a}.up-chat-attach{width:38px;height:42px;padding:0;border:1px solid #3a475b;border-radius:8px;background:#273247;color:#dbe5f5;cursor:pointer;font-size:17px;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box}.up-chat-attach:hover{background:#35425a}.up-chat-clear{border:0;border-radius:7px;padding:7px 9px;background:#3a2730;color:#ff9aaa;cursor:pointer;font:700 14px Segoe UI,Arial,sans-serif}.up-chat-clear:hover{background:#552d3a}.up-chat-back{border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer;font:700 12px Segoe UI,Arial,sans-serif}.up-chat-back:hover{background:#35425a}.up-chat-mention{color:#7fb1ff;font-weight:750}.up-chat-input{flex:1 1 auto;width:auto;min-width:0;min-height:42px;height:42px;max-height:90px;resize:vertical;padding:8px;border-radius:8px;border:1px solid #3a475b;background:#111722;color:#edf2fb;font:13px Segoe UI,Arial,sans-serif}.up-chat-send{margin-top:7px;width:100%;border:0;border-radius:8px;padding:9px;background:#4f7dff;color:#fff;font-weight:700;cursor:pointer}.up-update{font-size:11px;color:#9caac0;margin-top:10px}.up-update button{margin-left:6px;border:0;background:#273247;color:#c6d1e1;border-radius:6px;padding:4px 7px;cursor:pointer}.up-update button:hover{background:#35425a}.up-update .up-update-now:disabled{opacity:.45;cursor:not-allowed;background:#202938;color:#7f8ca0}.up-update .up-update-now:disabled:hover{background:#202938}.up-history-list{overflow:auto;flex:1;min-height:0;margin-top:12px}.up-history-day{font-size:12px;font-weight:750;color:#8fa0b8;margin:14px 0 7px}.up-history-item{padding:9px 0;border-bottom:1px solid #303b4d}.up-history-meta{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.up-history-reason{font-size:12px;color:#b7c2d2;margin-top:3px}.up-history-empty{font-size:12px;color:#9aa8bc;padding:14px 0}'+
    '.up-login label{display:block;margin:12px 0 5px;font-weight:650}.up-login button{width:100%;margin-top:15px;border:0;border-radius:8px;padding:10px;background:#4f7dff;color:#fff;font-weight:700;cursor:pointer}'+
    '.up-remote-overlay{position:fixed!important;inset:0!important;width:100vw;height:100vh;z-index:2147483646;background:rgba(5,9,16,.64);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;border-radius:0;overflow:auto}'+
    '.up-remote-dialog{width:min(360px,calc(100vw - 40px));max-height:calc(100vh - 40px);overflow:auto}'+
    '.up-chat-read-tooltip{position:fixed;z-index:2147483647;display:none;max-width:280px;padding:7px 9px;border:1px solid #40506a;border-radius:8px;background:#182130;color:#edf2fb;font:11px Segoe UI,Arial,sans-serif;box-shadow:0 10px 25px #0008;pointer-events:none;white-space:nowrap}'+
    '.up-chat-read-tooltip.show{display:block}'+
    '.up-chat-emoji-menu{position:absolute;right:0;bottom:calc(100% + 8px);z-index:25;width:260px;max-height:190px;overflow:auto;padding:8px;box-sizing:border-box;display:flex;flex-wrap:wrap;gap:4px;background:#182130;border:1px solid #3a475b;border-radius:10px;box-shadow:0 10px 30px #0008}.up-chat-emoji-menu.hidden{display:none}.up-chat-emoji{width:32px;height:32px;border:0;border-radius:7px;background:transparent;color:#fff;font-size:20px;cursor:pointer}.up-chat-emoji:hover{background:#273247}.up-chat-context-menu{position:fixed;z-index:2147483647;display:none;min-width:170px;padding:6px;background:#182130;border:1px solid #40506a;border-radius:10px;box-shadow:0 12px 32px #0009}.up-chat-context-menu.show{display:block}.up-chat-context-action{display:flex;align-items:center;gap:7px;width:100%;border:0;background:transparent;color:#edf2fb;border-radius:7px;padding:8px;text-align:left;cursor:pointer;font:12px Segoe UI,Arial,sans-serif}.up-chat-context-action:hover{background:#273247}.up-chat-context-reaction-row{display:flex;gap:3px;padding:4px 2px 2px;border-top:1px solid #334158;margin-top:4px}.up-chat-quoted{margin-bottom:6px;padding:5px 7px;border-left:3px solid #7aa2ff;background:#202b3d;border-radius:6px;font-size:10px;color:#b8c6d9}.up-chat-quoted b{display:block;color:#8eb2ff;margin-bottom:2px}.up-chat-reactions{display:flex;gap:4px;flex-wrap:wrap;margin-top:5px}.up-chat-reaction{border:0;border-radius:10px;background:#202c40;color:#fff;padding:2px 6px;font-size:12px;cursor:pointer}.up-chat-reaction.mine{background:#39558a}.up-chat-reply-bar{display:flex;align-items:center;gap:7px;margin-bottom:6px;padding:7px 9px;border-left:3px solid #4f7dff;background:#202b3d;border-radius:7px;color:#dce5f2}.up-chat-reply-bar.hidden{display:none}.up-chat-reply-copy{flex:1;min-width:0;font-size:11px}.up-chat-reply-copy b{display:block;color:#7fb1ff}.up-chat-reply-close{border:0;background:transparent;color:#aebbd0;cursor:pointer;font-size:17px}'+
    '.up-chat-record{width:38px;height:42px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;padding:0;border:1px solid #3a475b;border-radius:8px;background:#273247;color:#dbe5f5;cursor:pointer;font-size:17px}.up-chat-record.recording{background:#c52f48;color:#fff;animation:uprecord .7s infinite alternate}.up-chat-record:disabled{opacity:.55;cursor:wait}@keyframes uprecord{from{box-shadow:0 0 0 0 #ff334f55}to{box-shadow:0 0 0 7px #ff334f55}}.up-chat-recording-label{position:absolute;left:0;bottom:calc(100% + 8px);padding:6px 9px;border-radius:8px;background:#c52f48;color:#fff;font-size:11px;font-weight:800;display:none}.up-chat-recording-label.show{display:block}.up-chat-audio{display:block;width:240px;max-width:100%;margin-top:6px}'+
        '.up-health{position:absolute;right:0;bottom:55px;width:365px;height:520px;max-width:calc(100vw - 32px);max-height:calc(100vh - 79px);min-width:320px;min-height:420px;z-index:110;background:#182130;color:#edf2fb;padding:14px;box-sizing:border-box;border-radius:16px;border:1px solid #354258;box-shadow:0 16px 42px #000b;display:flex;flex-direction:column;overflow:hidden;resize:none}.up-health.hidden{display:none}.up-health-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.up-health-title{font-size:15px;font-weight:850}.up-health-sub{font-size:10px;color:#8fa0b8;margin-top:2px}.up-health-close{border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer}.up-health-list{overflow:auto;flex:1;min-height:0;margin-top:12px;display:flex;flex-direction:column;gap:7px}.up-health-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;border:1px solid #344158;border-radius:9px;background:#111722}.up-health-left{display:flex;align-items:center;gap:8px;min-width:0}.up-health-led{width:8px;height:8px;border-radius:50%;background:#667085;flex:0 0 8px}.up-health-led.ok{background:#3bd17d;box-shadow:0 0 0 3px #3bd17d22}.up-health-led.warn{background:#e7b84b;box-shadow:0 0 0 3px #e7b84b22}.up-health-led.bad{background:#ff5b72;box-shadow:0 0 0 3px #ff5b7222}.up-health-name{font-size:12px;font-weight:750;white-space:nowrap}.up-health-detail{font-size:10px;color:#9eabc0;white-space:nowrap;text-align:right}.up-health-footer{font-size:10px;color:#7f8ca0;margin-top:8px;line-height:1.35}.up-health-members{margin-top:3px;padding-top:6px;border-top:1px solid #303b4d}.up-health-member{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 0}.up-health-member b{font-size:11px}.up-health-member span{font-size:10px;color:#9eabc0}.up-health-refresh{margin-top:8px;width:100%;border:0;border-radius:8px;padding:8px;background:#273247;color:#dbe5f5;cursor:pointer;font-weight:700}.up-health-refresh:hover{background:#35425a}'+
    '#upstatus-root.up-theme-light{color:#1b2430}'+
    '#upstatus-root.up-theme-light #upstatus-card,#upstatus-root.up-theme-light #upstatus-history,#upstatus-root.up-theme-light #upstatus-chat{background:#f7f9fc;border-color:#d7dee9;color:#1b2430;box-shadow:0 16px 42px rgba(0,0,0,.18)}'+
    '#upstatus-root.up-theme-light .up-you,#upstatus-root.up-theme-light .up-reason,#upstatus-root.up-theme-light .up-time,#upstatus-root.up-theme-light .up-history-day,#upstatus-root.up-theme-light .up-history-reason,#upstatus-root.up-theme-light .up-history-empty{color:#64748b}'+
    '#upstatus-root.up-theme-light .up-chat-btn,#upstatus-root.up-theme-light .up-logout,#upstatus-root.up-theme-light .up-history-btn,#upstatus-root.up-theme-light .up-close,#upstatus-root.up-theme-light .up-notification-btn,#upstatus-root.up-theme-light .up-export{background:#e8edf4;color:#334155}'+
    '#upstatus-root.up-theme-light .up-notification-btn.enabled{background:#d7f4e5;color:#147044}'+
    '#upstatus-root.up-theme-light .up-member{border-color:#dbe2ec}'+
    '#upstatus-root.up-theme-light .up-member-version{background:#f1f5f9;border-color:#cbd5e1;color:#64748b}'+
    '#upstatus-root.up-theme-light .up-member-barui,#upstatus-root.up-theme-light .up-member-power{background:#e8edf4;color:#334155}'+
    '#upstatus-root.up-theme-light .up-chat-context-menu,#upstatus-root.up-theme-light .up-chat-reply-bar{background:#fff;color:#1e293b;border-color:#cbd5e1}#upstatus-root.up-theme-light .up-chat-context-action{color:#1e293b}#upstatus-root.up-theme-light .up-chat-context-action:hover{background:#eef2f7}#upstatus-root.up-theme-light .up-chat-reaction{background:#eef2f7;color:#1e293b}#upstatus-root.up-theme-light .up-chat-reply-copy b{color:#3567c8}#upstatus-root.up-theme-light .up-chat-reply-close{color:#64748b}#upstatus-root.up-theme-light .up-chat-quoted{background:#eef2f7;color:#475569}#upstatus-root.up-theme-light .up-chat-quoted b{color:#3567c8}#upstatus-root.up-theme-light .up-chat-attach,#upstatus-root.up-theme-light .up-chat-record,#upstatus-root.up-theme-light .up-chat-emoji-btn{background:#e8edf4;color:#334155;border-color:#cbd5e1}#upstatus-root.up-theme-light .up-reason-trigger,#upstatus-root.up-theme-light .up-reason-menu,#upstatus-root.up-theme-light .up-select,#upstatus-root.up-theme-light .up-input,#upstatus-root.up-theme-light .up-chat-input,#upstatus-root.up-theme-light .up-chat-photo,#upstatus-root.up-theme-light .up-mention-menu{background:#fff;border-color:#cbd5e1;color:#1e293b}'+
    '#upstatus-root.up-theme-light .up-reason-option,#upstatus-root.up-theme-light .up-mention-option{color:#1e293b;background:#f8fafc;border-color:#cbd5e1}'+
    '#upstatus-root.up-theme-light .up-mention-option.up-mention-all{background:#ede9fe;border-color:#a78bfa;color:#4c1d95}'+
    '#upstatus-root.up-theme-light .up-chat-mention{color:#2563eb;background:#dbeafe;border-radius:4px;padding:0 2px}'+
    '#upstatus-root.up-theme-light .up-status-icon.online{color:#168a4d}#upstatus-root.up-theme-light .up-status-icon.busy{color:#c52f48}#upstatus-root.up-theme-light .up-status-icon.away{color:#475569}'+
    '#upstatus-root.up-theme-light .up-login label,#upstatus-root.up-theme-light .up-label,#upstatus-root.up-theme-light .up-team-title{color:#172033}'+
    '#upstatus-root.up-theme-light .up-login input:-webkit-autofill,#upstatus-root.up-theme-light .up-login input:-webkit-autofill:hover,#upstatus-root.up-theme-light .up-login input:-webkit-autofill:focus{-webkit-text-fill-color:#1e293b;-webkit-box-shadow:0 0 0 1000px #fff inset;box-shadow:0 0 0 1000px #fff inset;border-color:#cbd5e1}'+
    '#upstatus-root.up-theme-light .up-login input:-moz-autofill{box-shadow:0 0 0 1000px #fff inset;color:#1e293b}'+
    '#upstatus-root.up-theme-light .up-reason-option:hover,#upstatus-root.up-theme-light .up-mention-option:hover{background:#eef2f7}'+
    '#upstatus-root.up-theme-light .up-chat-item{border-color:#dbe2ec}'+
    '#upstatus-root.up-theme-light .up-chat-text{color:#1e293b}'+
    '#upstatus-root.up-theme-light .up-chat-bubble{background:#e7edf5;color:#1e293b;box-shadow:0 3px 10px rgba(15,23,42,.12)}'+
    '#upstatus-root.up-theme-light .up-chat-item.own .up-chat-bubble{background:#dbeafe;color:#1e293b}'+
    '#upstatus-root.up-theme-light .up-chat-meta,#upstatus-root.up-theme-light .up-chat-meta b{color:#526176}'+
    '#upstatus-root.up-theme-light .up-chat-read{color:#64748b}'+
    '#upstatus-root.up-theme-light .up-chat-read.read{color:#1677ff}'+
    '#upstatus-root.up-theme-light .up-chat-emoji-menu{background:#fff;border-color:#cbd5e1;box-shadow:0 10px 30px rgba(0,0,0,.16)}'+
    '#upstatus-root.up-theme-light .up-chat-emoji:hover{background:#eef2f7}'+
    '#upstatus-root.up-theme-light .up-chat-record,#upstatus-root.up-theme-light .up-chat-photo,#upstatus-root.up-theme-light .up-chat-emoji-btn{background:#fff;color:#334155;border-color:#cbd5e1}'+
        '#upstatus-root.up-theme-light .up-update{color:#64748b}'+
    '#upstatus-root.up-theme-light .up-update button{background:#e8edf4;color:#334155}'+
    '#upstatus-root.up-theme-light .up-toast{background:rgba(255,255,255,.94);border-color:#d4dce7;color:#1e293b}'+
    '#upstatus-root.up-theme-light .up-toast-name{color:#526176}'+
    '#upstatus-root.up-theme-light .up-barui-incoming-card{background:rgba(255,245,247,.98);color:#8f1730}'+
    '#upstatus-root.up-theme-light .up-barui-incoming-sub{color:#a83a4d}'+
    '#upstatus-root.up-theme-light .up-barui-stop{background:#f1d5da;color:#8f1730}'+
    '#upstatus-root.up-theme-light .up-remote-dialog{background:#fff;border-color:#cbd5e1;color:#1e293b}'+
    '#upstatus-root.up-theme-light .up-remote-sub{color:#64748b}'+
    '#upstatus-root.up-theme-light .up-remote-status{background:#f1f5f9;border-color:#cbd5e1;color:#334155}'+
    '#upstatus-root.up-theme-light .up-remote-status:hover,#upstatus-root.up-theme-light .up-remote-status.active{background:#dbeafe;border-color:#7aa2e8;color:#1e3a8a}'+
    '#upstatus-root.up-theme-light .up-remote-reason-option{background:#f1f5f9;color:#334155}'+
    '#upstatus-root.up-theme-light .up-remote-reason-option:hover,#upstatus-root.up-theme-light .up-remote-reason-option.active{background:#dbeafe}'+
    '#upstatus-root.up-theme-light .up-remote-cancel{background:#e8edf4;color:#334155}'+
    '#upstatus-root.up-theme-light .up-chat-notify-dot{border-color:#f7f9fc}'+
    '#upstatus-root.up-theme-light .up-health{background:#f7f9fc;color:#1b2430}#upstatus-root.up-theme-light .up-health-sub,#upstatus-root.up-theme-light .up-health-detail,#upstatus-root.up-theme-light .up-health-footer,#upstatus-root.up-theme-light .up-health-member span{color:#64748b}#upstatus-root.up-theme-light .up-health-close,#upstatus-root.up-theme-light .up-health-refresh{background:#e8edf4;color:#334155}#upstatus-root.up-theme-light .up-health-row{background:#fff;border-color:#dbe2ec}#upstatus-root.up-theme-light .up-health-members{border-color:#dbe2ec}'+
    '#upstatus-root.up-theme-light .up-notify-dot,#upstatus-root.up-theme-light .up-update-dot,#upstatus-root.up-theme-light .up-quick-chat-bubble{border-color:#f7f9fc}'+
    '.up-theme-btn{border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer;box-sizing:border-box;height:34px;min-width:34px;display:inline-flex;align-items:center;justify-content:center}'+
    '.up-theme-btn .up-icon{width:16px;height:16px}'+
    '.up-health-btn{border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer;box-sizing:border-box;height:34px;min-width:34px;display:inline-flex;align-items:center;justify-content:center}.up-health-btn:hover{background:#35425a}.up-health-btn .up-icon{width:16px;height:16px}'+
    '#upstatus-root.up-theme-light .up-settings-menu{background:#fff;border-color:#d7dee9;box-shadow:0 12px 30px rgba(0,0,0,.16)}'+
    '#upstatus-root.up-theme-light .up-settings-menu button:hover{background:#e8edf4}'+
    '#upstatus-root.up-theme-light .up-settings-btn{background:#e8edf4;color:#334155}'+
    '.up-resize-handle{position:absolute;z-index:200;touch-action:none}.up-resize-n{left:10px;right:10px;top:-5px;height:10px;cursor:ns-resize}.up-resize-s{left:10px;right:10px;bottom:-5px;height:10px;cursor:ns-resize}.up-resize-e{top:10px;bottom:10px;right:-5px;width:10px;cursor:ew-resize}.up-resize-w{top:10px;bottom:10px;left:-5px;width:10px;cursor:ew-resize}.up-resize-ne{right:-5px;top:-5px;width:14px;height:14px;cursor:nesw-resize}.up-resize-nw{left:-5px;top:-5px;width:14px;height:14px;cursor:nwse-resize}.up-resize-se{right:-5px;bottom:-5px;width:14px;height:14px;cursor:nwse-resize}.up-resize-sw{left:-5px;bottom:-5px;width:14px;height:14px;cursor:nesw-resize}'+
    '#upstatus-card{background:linear-gradient(145deg,#1b2535 0%,#151d2a 100%);border-color:#34445c;box-shadow:0 20px 50px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.035)}'+
    '.up-head-identity{display:flex;align-items:center;gap:9px;min-width:0}.up-head-avatar{width:34px;height:34px;border-radius:50%;padding:2px;box-sizing:border-box;background:#273247;border:1px solid #3b4a62;flex:0 0 34px}.up-head-avatar-img{display:block;width:100%;height:100%;border-radius:50%;object-fit:cover}'+
    '.up-statuses{gap:8px;margin:16px 0 13px}.up-status{flex:1;min-width:0;border:1px solid transparent;border-radius:10px;padding:10px 9px;display:flex;align-items:center;justify-content:center;gap:6px;transition:transform .15s,border-color .15s,box-shadow .15s,background .15s}.up-status:hover{transform:translateY(-1px)}.up-status.active{transform:translateY(-1px);box-shadow:0 0 0 1px currentColor inset,0 6px 18px rgba(0,0,0,.12)}.up-status.active.online{box-shadow:0 0 0 1px #55e58b inset,0 0 16px rgba(85,229,139,.16)}.up-status.active.busy{box-shadow:0 0 0 1px #ff6b7a inset,0 0 16px rgba(255,107,122,.13)}.up-status.active.away{box-shadow:0 0 0 1px #8090a8 inset,0 0 16px rgba(128,144,168,.12)}'+
    '.up-notice{display:flex;align-items:center;gap:8px;margin:11px 0 12px;padding:10px 11px;border:1px solid #236b49;border-radius:10px;background:linear-gradient(90deg,#143b2b,#174732);color:#a9edc5}.up-notice .up-icon{width:15px;height:15px}.up-notice-ok{margin-left:auto;width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#35c77a;color:#0e2b1e;font-weight:900;font-size:12px}'+
    '.up-team-title-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:14px 0 8px}.up-team-title{margin:0}.up-team-count{font-size:10px;color:#6f819b;font-weight:700}.up-team{display:flex;flex-direction:column;gap:7px}.up-member{display:flex;align-items:center;gap:9px;padding:9px 9px;margin:0;border:1px solid #2d3a4e;border-radius:12px;background:linear-gradient(145deg,#182332,#141d29);box-shadow:0 5px 16px rgba(0,0,0,.12);transition:border-color .15s,transform .15s,background .15s}.up-member:hover{transform:translateY(-1px);border-color:#40536e;background:#1b2636}.up-member-main{display:flex;align-items:center;gap:9px;min-width:0;flex:1}.up-member-avatar{width:38px;height:38px;flex:0 0 38px;border-radius:50%;object-fit:cover;background:#273247;border:2px solid #4a566b;box-sizing:border-box}.up-member-avatar.status-online{border-color:#55e58b;box-shadow:0 0 8px rgba(85,229,139,.34)}.up-member-avatar.status-busy{border-color:#ff6b7a;box-shadow:0 0 8px rgba(255,107,122,.24)}.up-member-avatar.status-away,.up-member-avatar.status-offline{border-color:#59677c;box-shadow:none}.up-member-info{min-width:0;flex:1}.up-member-sub{font-size:10.5px;color:#8d9bb0;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.up-member-separator{color:#52627a}.up-member-actions{display:flex;align-items:center;gap:5px;flex:0 0 auto}.up-member-actions .up-member-barui,.up-member-actions .up-member-power{width:30px;height:30px}.up-badge{min-width:52px;text-align:center}.up-member-version{background:#223047;border-color:#3a4b63}.up-update{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;padding:10px 10px;border:1px solid #2c3b52;border-radius:12px;background:linear-gradient(145deg,#151f2e,#121a26);box-sizing:border-box}.up-update-version{display:flex;align-items:center;gap:8px;min-width:0}.up-update-version>.up-icon{width:22px;height:22px;color:#7aa7ff;padding:5px;border-radius:50%;box-sizing:content-box;background:#20304a}.up-update-version b{display:block;font-size:11px;color:#dbe5f5}.up-update-status{display:block;font-size:10px;color:#7f8ea4;margin-top:2px}.up-update-actions{display:flex;align-items:center;gap:5px;flex:0 0 auto}.up-update button{margin:0;padding:6px 8px;border:1px solid #33445c;border-radius:7px;background:#1e2b3f;color:#cbd7e7}.up-update .up-update-check{border-color:#4165a0;color:#a9c7ff}.up-update .up-update-now{background:#4f7dff;border-color:#4f7dff;color:#fff}.up-update .up-update-now:disabled{background:#1b2534;border-color:#2a374a;color:#69788d}'+
    '#upstatus-root.up-theme-light #upstatus-card{background:linear-gradient(145deg,#ffffff 0%,#f5f8fc 100%);border-color:#d3dce8;box-shadow:0 20px 50px rgba(15,23,42,.15),inset 0 1px 0 rgba(255,255,255,.9)}'+
    '#upstatus-root.up-theme-light .up-head-avatar{background:#e8edf4;border-color:#d0d9e6}#upstatus-root.up-theme-light .up-team-count{color:#718096}'+
    '#upstatus-root.up-theme-light .up-status{box-shadow:none}.up-theme-light .up-status.active.online{box-shadow:0 0 0 1px #39bd76 inset,0 5px 14px rgba(16,185,129,.10)}.up-theme-light .up-status.active.busy{box-shadow:0 0 0 1px #e25568 inset,0 5px 14px rgba(225,29,72,.08)}.up-theme-light .up-status.active.away{box-shadow:0 0 0 1px #64748b inset,0 5px 14px rgba(100,116,139,.08)}'+
    '#upstatus-root.up-theme-light .up-notice{border-color:#a9dfc3;background:linear-gradient(90deg,#ecfbf3,#e5f8ee);color:#17633f}.up-theme-light .up-notice-ok{background:#35b974;color:#fff}'+
    '#upstatus-root.up-theme-light .up-team-title-row{border-color:#dbe3ed}#upstatus-root.up-theme-light .up-member{background:linear-gradient(145deg,#ffffff,#f7f9fc);border-color:#dce4ee;box-shadow:0 5px 16px rgba(15,23,42,.06)}#upstatus-root.up-theme-light .up-member:hover{background:#fff;border-color:#c5d2e2}'+
    '#upstatus-root.up-theme-light .up-member-sub{color:#64748b}.up-theme-light .up-member-separator{color:#94a3b8}.up-theme-light .up-member-avatar.status-away,.up-theme-light .up-member-avatar.status-offline{border-color:#aab6c5}.up-theme-light .up-member-version{background:#f1f5f9;border-color:#cbd5e1;color:#64748b}'+
    '#upstatus-root.up-theme-light .up-update{background:linear-gradient(145deg,#ffffff,#f3f6fa);border-color:#dbe3ed}.up-theme-light .up-update-version>.up-icon{background:#eaf1ff;color:#356fe8}.up-theme-light .up-update-version b{color:#1e293b}.up-theme-light .up-update-status{color:#64748b}.up-theme-light .up-update button{background:#eef2f7;border-color:#d5deea;color:#334155}.up-theme-light .up-update .up-update-check{background:#edf4ff;border-color:#a9c5f5;color:#245fc4}.up-theme-light .up-update .up-update-now{background:#4f7dff;border-color:#4f7dff;color:#fff}.up-theme-light .up-update .up-update-now:disabled{background:#edf1f6;border-color:#e0e6ee;color:#9aa7b8}'+
    '#upstatus-root.up-theme-light .up-member-actions .up-member-barui,#upstatus-root.up-theme-light .up-member-actions .up-member-power{background:#edf2f7;color:#334155;border:1px solid #d6dfe9}'+
    '#upstatus-root.up-theme-light .up-member-actions .up-badge.b-online{background:#dff7ea;color:#137044}.up-theme-light .up-member-actions .up-badge.b-busy{background:#ffe5e9;color:#b4233c}.up-theme-light .up-member-actions .up-badge.b-away{background:#e9eef5;color:#475569}'
  });

  var root=node('div',{id:'upstatus-root'});
  var bubble=node('button',{id:'upstatus-bubble',title:'Abrir UpStatus'});
  var quickChatBubble=node('button',{className:'up-quick-chat-bubble',title:'Abrir Chat da equipe',type:'button','aria-label':'Abrir Chat da equipe'});
  var card=node('section',{id:'upstatus-card',className:'hidden'});
  var history=node('section',{id:'upstatus-history',className:'hidden'});
  var chat=node('section',{id:'upstatus-chat',className:'hidden'});
  var toastStack=node('div',{className:'up-toast-stack'});
  var baruiIncoming=node('div',{className:'up-barui-incoming hidden'});
  var remoteOverlay=node('div',{className:'up-remote-overlay hidden'});
  var chatProfileHover=node('div',{className:'up-chat-profile-hover'});
  var readTooltip=node('div',{className:'up-chat-read-tooltip'});
  var profileModal=node('div',{className:'up-chat-profile-modal hidden'});
  var health=node('section',{id:'upstatus-health',className:'up-health hidden'});
  profileModal.innerHTML='<div class="up-chat-profile-dialog"><img class="up-chat-profile-preview" alt="Sua foto"><div class="up-label">Foto de perfil</div><input class="up-chat-profile-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><div class="up-chat-profile-message"></div><div class="up-chat-profile-actions"><button type="button" class="up-chat-profile-cancel">Cancelar</button><button type="button" class="up-chat-profile-save">Salvar foto</button></div></div>';
  root.appendChild(profileModal);
  var img=node('img',{className:'up-bubble-avatar',src:'',alt:'Foto de perfil'});
  img.src=profileFallback();
  root.style.right=GM_getValue(key+'right','24px');
  root.style.bottom=GM_getValue(key+'bottom','24px');
  bubble.innerHTML='<span class="up-notify-dot"></span><span class="up-update-dot" role="button" tabindex="0" aria-label="Instalar atualização"></span>';
  quickChatBubble.innerHTML=iconSvg('chat','up-quick-chat-icon');
  bubble.appendChild(img);
  root.append(style,bubble,quickChatBubble,card,history,chat,toastStack,baruiIncoming,remoteOverlay,chatProfileHover,health);
  setBubbleStatus('offline');
  root.appendChild(readTooltip);
  document.documentElement.appendChild(root);
  var updateDot=bubble.querySelector('.up-update-dot');
  if(updateDot){updateDot.addEventListener('pointerdown',function(e){e.stopPropagation();});updateDot.addEventListener('pointerup',function(e){e.preventDefault();e.stopPropagation();openUpdate();});updateDot.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openUpdate();}});}
  function panelBounds(panel){
    var availableW=Math.max(1,window.innerWidth-32),availableH=Math.max(1,window.innerHeight-79);
    var minW=Math.min(320,availableW),minH=Math.min(420,availableH);
    var maxW=Math.max(minW,Math.min(620,availableW));
    var maxH=Math.max(minH,Math.min(680,availableH));
    return {minW:minW,minH:minH,maxW:maxW,maxH:maxH};
  }
  function clampPanelSize(panel,w,h){
    var b=panelBounds(panel);
    w=Math.max(b.minW,Math.min(b.maxW,Math.round(w)));
    h=Math.max(b.minH,Math.min(b.maxH,Math.round(h)));
    panel.style.minWidth=b.minW+'px';panel.style.minHeight=b.minH+'px';
    panel.style.maxWidth=b.maxW+'px';panel.style.maxHeight=b.maxH+'px';
    panel.style.width=w+'px';panel.style.height=h+'px';
  }
  function setupPanelResize(panel,storageKey,defaultW,defaultH){
    var savedW=parseInt(GM_getValue(key+'width_'+storageKey,''),10),savedH=parseInt(GM_getValue(key+'height_'+storageKey,''),10);
    var w=(savedW>=320?savedW:Math.min(defaultW,Math.max(1,window.innerWidth-32)));
    var h=(savedH>=420?savedH:Math.min(defaultH,Math.max(1,window.innerHeight-79)));
    clampPanelSize(panel,w,h);
    var resizing=null;
    function edgeAt(e){
      var r=panel.getBoundingClientRect(),edge=9;
      var left=e.clientX-r.left<=edge,right=r.right-e.clientX<=edge,top=e.clientY-r.top<=edge,bottom=r.bottom-e.clientY<=edge;
      if(top&&left)return 'nw';if(top&&right)return 'ne';if(bottom&&left)return 'sw';if(bottom&&right)return 'se';
      if(top)return 'n';if(bottom)return 's';if(left)return 'w';if(right)return 'e';return '';
    }
    panel.addEventListener('pointermove',function(e){
      if(resizing)return;
      var dir=edgeAt(e),cursor={n:'ns-resize',s:'ns-resize',e:'ew-resize',w:'ew-resize',ne:'nesw-resize',sw:'nesw-resize',nw:'nwse-resize',se:'nwse-resize'}[dir]||'';
      panel.style.cursor=cursor;
    },true);
    panel.addEventListener('pointerleave',function(){if(!resizing)panel.style.cursor='';},true);
    panel.addEventListener('pointerdown',function(e){
      if(e.button!==undefined&&e.button!==0)return;
      var dir=edgeAt(e);if(!dir)return;
      e.preventDefault();e.stopPropagation();
      resizing={dir:dir,startW:panel.offsetWidth,startH:panel.offsetHeight,startX:e.clientX,startY:e.clientY};
      panel.style.cursor={n:'ns-resize',s:'ns-resize',e:'ew-resize',w:'ew-resize',ne:'nesw-resize',sw:'nesw-resize',nw:'nwse-resize',se:'nwse-resize'}[dir]||'';
      function move(ev){
        if(!resizing)return;
        var dx=ev.clientX-resizing.startX,dy=ev.clientY-resizing.startY,nextW=resizing.startW,nextH=resizing.startH;
        if(dir.indexOf('e')>=0)nextW=resizing.startW+dx;
        if(dir.indexOf('w')>=0)nextW=resizing.startW-dx;
        if(dir.indexOf('s')>=0)nextH=resizing.startH+dy;
        if(dir.indexOf('n')>=0)nextH=resizing.startH-dy;
        clampPanelSize(panel,nextW,nextH);
        ev.preventDefault();
      }
      function done(){
        document.removeEventListener('pointermove',move,true);
        document.removeEventListener('pointerup',done,true);
        document.removeEventListener('pointercancel',done,true);
        if(resizing){
          GM_setValue(key+'width_'+storageKey,panel.offsetWidth);
          GM_setValue(key+'height_'+storageKey,panel.offsetHeight);
        }
        resizing=null;panel.style.cursor='';
      }
      document.addEventListener('pointermove',move,true);
      document.addEventListener('pointerup',done,true);
      document.addEventListener('pointercancel',done,true);
    },true);
  }
  function setupResizePersistence(){
    setupPanelResize(card,'card',365,520);
    setupPanelResize(history,'history',365,520);
    setupPanelResize(chat,'chat',365,520);
    setupPanelResize(health,'health',365,520);
    window.addEventListener('resize',function(){
      [card,history,chat,health].forEach(function(panel){
        var w=panel.offsetWidth||365,h=panel.offsetHeight||520;
        clampPanelSize(panel,w,h);
      });
    });
  }
  setupResizePersistence();

  function setBubbleStatus(status){
    currentStatus=status||'offline';
    var colors={online:'#2e9b62',busy:'#b4233c',away:'#667085',offline:'#5b6574'};
    var borders={online:'#79e3a8',busy:'#ff6b7a',away:'#aeb8c7',offline:'#8b95a4'};
    bubble.style.background=colors[currentStatus]||colors.offline;
    bubble.style.borderColor=borders[currentStatus]||borders.offline;
    card.querySelectorAll('.up-status').forEach(function(btn){btn.classList.toggle('active',btn.classList.contains(currentStatus));});
  }
  function unlockAudio(){
    try{
      if(audioUnlocked)return;
      var AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return;
      audioCtx=audioCtx||new AC();
      if(audioCtx.state==='suspended')audioCtx.resume();
      var osc=audioCtx.createOscillator();
      var gain=audioCtx.createGain();
      osc.frequency.value=1;
      gain.gain.value=0.0001;
      osc.connect(gain);gain.connect(audioCtx.destination);
      osc.start();osc.stop(audioCtx.currentTime+0.01);
      audioUnlocked=true;
    }catch(e){}
  }
  function playMentionAlert(){
    try{
      var AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return;
      audioCtx=audioCtx||new AC();
      if(audioCtx.state==='suspended')audioCtx.resume();
      var now=audioCtx.currentTime;
      var gain=audioCtx.createGain();
      gain.gain.setValueAtTime(0.0001,now);
      gain.gain.exponentialRampToValueAtTime(0.5,now+0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001,now+0.48);
      gain.connect(audioCtx.destination);
      [880,1174,1568].forEach(function(freq,i){
        var osc=audioCtx.createOscillator();
        osc.type='square';
        osc.frequency.setValueAtTime(freq,now+i*0.045);
        osc.connect(gain);
        osc.start(now+i*0.045);
        osc.stop(now+0.5);
      });
    }catch(e){}
  }
  ['pointerdown','keydown','touchstart'].forEach(function(ev){document.addEventListener(ev,unlockAudio,{passive:true,capture:true});});

  function setUnread(n){
    chatUnread=Number(n)||0;
    updateFaviconNotification(chatUnread);
    var chatDot=card.querySelector('.up-chat-btn .up-chat-notify-dot');
    if(chatDot){chatDot.classList.toggle('show',chatUnread>0);chatDot.textContent=chatUnread>99?'99+':String(chatUnread||'');}
    var bubbleDot=bubble.querySelector('.up-notify-dot');
    if(bubbleDot){bubbleDot.classList.toggle('show',chatUnread>0);bubbleDot.textContent=chatUnread>99?'99+':String(chatUnread||'');bubbleDot.title=chatUnread>0?(chatUnread+' mensagem(ns) não lida(s) no chat'):'Sem mensagens não lidas';}
  }
  function setUpdateAvailable(show,version){
    var dot=bubble.querySelector('.up-update-dot');
    if(!dot)return;
    dot.textContent='';dot.innerHTML=show?iconSvg('update'):'';
    dot.title=show?('Nova versão disponível: v'+version):'Sem atualização';
    dot.classList.toggle('show',!!show);
  }
  function openUpdate(){
    try{
      if(typeof GM_openInTab==='function'){
        var updateTab=GM_openInTab(UPDATE_URL,{active:true,insert:true,setParent:true});
        if(updateTab){
          updateTab.onclose=function(){
            setTimeout(function(){try{location.reload()}catch(e){}},250);
          };
        }
        return;
      }
    }catch(e){}
    window.open(UPDATE_URL,'_blank','noopener');
  }
  function versionParts(v){
    return String(v||'0').replace(/^v/i,'').split('.').map(function(n){
      var x=parseInt(n,10);
      return isNaN(x)?0:x;
    });
  }
  function compareVersions(a,b){
    var A=versionParts(a),B=versionParts(b),i;
    for(i=0;i<Math.max(A.length,B.length);i++){
      var av=A[i]||0,bv=B[i]||0;
      if(av>bv)return 1;
      if(av<bv)return -1;
    }
    return 0;
  }
  function checkUpdate(){
    api('GET','/api/update-info').then(function(d){
      var statuses=card.querySelectorAll('.up-update-status');
      var manuals=card.querySelectorAll('.up-update-now');
      var remote=d&&d.version?String(d.version):'';
      var cmp=compareVersions(remote,CURRENT_VERSION);

      manuals.forEach(function(manual){manual.onclick=openUpdate;manual.disabled=cmp<=0;manual.title=cmp>0?'Atualizar para v'+remote:'Você já está na versão mais recente';});
      if(remote&&cmp>0){
        setUpdateAvailable(true,remote);
        statuses.forEach(function(status){status.innerHTML=' • Nova versão: <b>v'+esc(remote)+'</b>';});
      }else if(remote&&cmp<0){
        setUpdateAvailable(false,'');
        statuses.forEach(function(status){status.textContent=' • Servidor está em v'+esc(remote)+'; você está em v'+CURRENT_VERSION+'.';});
      }else{
        setUpdateAvailable(false,'');
        statuses.forEach(function(status){status.textContent=' • Você está atualizado.';});
      }
    }).catch(function(){}).finally(function(){remotePolling=false;});
  }
  function mentionNames(text){
    var found=[];
    (text.match(/@[\\p{L}\\p{N}_-]+/gu)||[]).forEach(function(tag){
      var raw=tag.slice(1).toLowerCase();
      var name=(window.__upstatusMembers||[]).find(function(n){return n.toLowerCase()===raw});
      if(name&&found.indexOf(name)<0)found.push(name);
    });
    return found;
  }
  function renderChatText(text){
    var safe=esc(text);
    (window.__upstatusMembers||[]).forEach(function(name){
      var re=new RegExp('(^|[^\\\\w])(@'+name.replace(/[.*+?^\${}()|[\\]\\\\/]/g,'\\\\const USERSCRIPT_B64 = "Ly8gPT1Vc2VyU2NyaXB0PT0KLy8gQG5hbWUgICAgICAgICBVcFN0YXR1cyAtIFNhbGUgU21hcnRseQovLyBAbmFtZXNwYWNlICAgIHVwc2VsbGVyCi8vIEB2ZXJzaW9uICAgICAgMi43LjI0Ci8vIEBkZXNjcmlwdGlvbiAgVXBTdGF0dXMgY29tIHN0YXR1cywgaGlzdMOzcmljbywgY2hhdCBpbnRlcm5vLCBmb3RvcywgbWVuw6fDtWVzLCBhdHVhbGl6YcOnw6NvIGUgYWxlcnRhcy4KLy8gQG1hdGNoICAgICAgICAqOi8vKi5zYWxlc21hcnRseS5jb20vKgovLyBAbWF0Y2ggICAgICAgICo6Ly9zYWxlc21hcnRseS5jb20vKgovLyBAcnVuLWF0ICAgICAgIGRvY3VtZW50LXN0YXJ0Ci8vIEByZXF1aXJlICAgICAgaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9Ac3VwYWJhc2Uvc3VwYWJhc2UtanNAMi9kaXN0L3VtZC9zdXBhYmFzZS5taW4uanMKLy8gQGdyYW50ICAgICAgICBHTV94bWxodHRwUmVxdWVzdAovLyBAZ3JhbnQgICAgICAgIEdNX2dldFZhbHVlCi8vIEBncmFudCAgICAgICAgR01fc2V0VmFsdWUKLy8gQGdyYW50ICAgICAgICBHTV9vcGVuSW5UYWIKLy8gQHVwZGF0ZVVSTCAgICBodHRwczovL2RsZnZrYXdhaXFkdWhsYXpzc3ptLnN1cGFiYXNlLmNvL2Z1bmN0aW9ucy92MS91cHN0YXR1cy91cHN0YXR1cy51c2VyLmpzCi8vIEBkb3dubG9hZFVSTCAgaHR0cHM6Ly9kbGZ2a2F3YWlxZHVobGF6c3N6bS5zdXBhYmFzZS5jby9mdW5jdGlvbnMvdjEvdXBzdGF0dXMvdXBzdGF0dXMudXNlci5qcwovLyBAY29ubmVjdCAgICAgICoKLy8gPT0vVXNlclNjcmlwdD09CihmdW5jdGlvbiAoKSB7CiAgJ3VzZSBzdHJpY3QnOwoKICB2YXIga2V5PSd1cHN0YXR1c18nOwogIHZhciBmYXZpY29uU3RhdGU9e2xpbms6bnVsbCxvcmlnaW5hbEhyZWY6Jycsb3JpZ2luYWxEYXRhOicnLGJsaW5rVGltZXI6bnVsbCxvbjpmYWxzZX07CiAgdmFyIENMT1VEX1NFUlZFUj0naHR0cHM6Ly9kbGZ2a2F3YWlxZHVobGF6c3N6bS5zdXBhYmFzZS5jby9mdW5jdGlvbnMvdjEvdXBzdGF0dXMnOwogIHZhciBzZXJ2ZXI9Q0xPVURfU0VSVkVSOwogIHZhciBVUF9SRUFMVElNRV9VUkw9J2h0dHBzOi8vZGxmdmthd2FpcWR1aGxhenNzem0uc3VwYWJhc2UuY28nOwogIHZhciBVUF9SRUFMVElNRV9LRVk9J3NiX3B1Ymxpc2hhYmxlX3FvTUw1MldVeUJRUk1CNkRMUDF5andfSjBQYmFhZV8nOwogIHZhciBVUF9SRUFMVElNRV9UT1BJQz0ndXBzdGF0dXMtbGl2ZS02ZjVlN2IzMS0zZjhjLTRkOGYtYWU1YS05MWM3YjJkNmU0ZjAnOwogIHZhciByZWFsdGltZUNsaWVudD1udWxsLHJlYWx0aW1lQ2hhbm5lbD1udWxsLHJlYWx0aW1lQWN0aXZlPWZhbHNlLHJlYWx0aW1lUmV0cnlUaW1lcj1udWxsOwogIHZhciBjaGF0UHJlc2VuY2U9e307CiAgZnVuY3Rpb24gc2V0dXBGYXZpY29uQmFkZ2UoKXsKICAgIHRyeXsKICAgICAgdmFyIGxpbmtzPVtdLnNsaWNlLmNhbGwoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnbGlua1tyZWx+PSJpY29uIl0nKSk7dmFyIGxpbms9bGlua3NbMF18fG51bGw7CiAgICAgIGlmKCFsaW5rJiZkb2N1bWVudC5oZWFkKXtsaW5rPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpbmsnKTtsaW5rLnJlbD0naWNvbic7ZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChsaW5rKTt9CiAgICAgIGlmKGxpbmsmJiFmYXZpY29uU3RhdGUubGluayl7ZmF2aWNvblN0YXRlLmxpbms9bGluaztmYXZpY29uU3RhdGUub3JpZ2luYWxIcmVmPWxpbmsuaHJlZnx8Jyc7CiAgICAgICAgdHJ5e2ZldGNoKGZhdmljb25TdGF0ZS5vcmlnaW5hbEhyZWYse2NyZWRlbnRpYWxzOidzYW1lLW9yaWdpbid9KS50aGVuKGZ1bmN0aW9uKHIpe3JldHVybiByLmJsb2IoKX0pLnRoZW4oZnVuY3Rpb24oYmxvYil7cmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUpe3ZhciBmcj1uZXcgRmlsZVJlYWRlcigpO2ZyLm9ubG9hZD1mdW5jdGlvbigpe3Jlc29sdmUoZnIucmVzdWx0KX07ZnIucmVhZEFzRGF0YVVSTChibG9iKTt9KTt9KS50aGVuKGZ1bmN0aW9uKGRhdGEpe2Zhdmljb25TdGF0ZS5vcmlnaW5hbERhdGE9U3RyaW5nKGRhdGF8fCcnKTt9KS5jYXRjaChmdW5jdGlvbigpe30pO31jYXRjaChlKXt9CiAgICAgIH0KICAgIH1jYXRjaChlKXt9CiAgfQogIGZ1bmN0aW9uIGZhdmljb25CYWRnZUhyZWYoKXt2YXIgc3JjPWZhdmljb25TdGF0ZS5vcmlnaW5hbERhdGF8fGZhdmljb25TdGF0ZS5vcmlnaW5hbEhyZWZ8fGxvY2F0aW9uLm9yaWdpbisnL2Zhdmljb24uaWNvJzt2YXIgc3ZnPSc8c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiB2aWV3Qm94PSIwIDAgMzIgMzIiPjxpbWFnZSBocmVmPSInK1N0cmluZyhzcmMpLnJlcGxhY2UoLyYvZywnJmFtcDsnKS5yZXBsYWNlKC8iL2csJyZxdW90OycpKyciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgcHJlc2VydmVBc3BlY3RSYXRpbz0ieE1pZFlNaWQgbWVldCIvPjxjaXJjbGUgY3g9IjI1IiBjeT0iNyIgcj0iNiIgZmlsbD0iI2ZmMzM0ZiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+JztyZXR1cm4gJ2RhdGE6aW1hZ2Uvc3ZnK3htbDtjaGFyc2V0PXV0Zi04LCcrZW5jb2RlVVJJQ29tcG9uZW50KHN2Zyk7fQogIGZ1bmN0aW9uIHNldEZhdmljb25CYWRnZShzaG93KXt0cnl7aWYoZmF2aWNvblN0YXRlLmxpbmspZmF2aWNvblN0YXRlLmxpbmsuaHJlZj1zaG93P2Zhdmljb25CYWRnZUhyZWYoKTpmYXZpY29uU3RhdGUub3JpZ2luYWxIcmVmO31jYXRjaChlKXt9fQogIGZ1bmN0aW9uIHVwZGF0ZUZhdmljb25Ob3RpZmljYXRpb24oY291bnQpe3ZhciBzaG93PU51bWJlcihjb3VudCk+MDtpZighc2hvdyl7aWYoZmF2aWNvblN0YXRlLmJsaW5rVGltZXIpe2NsZWFySW50ZXJ2YWwoZmF2aWNvblN0YXRlLmJsaW5rVGltZXIpO2Zhdmljb25TdGF0ZS5ibGlua1RpbWVyPW51bGw7fWZhdmljb25TdGF0ZS5vbj1mYWxzZTtzZXRGYXZpY29uQmFkZ2UoZmFsc2UpO3JldHVybjt9aWYoZmF2aWNvblN0YXRlLmJsaW5rVGltZXIpcmV0dXJuO2Zhdmljb25TdGF0ZS5vbj10cnVlO3NldEZhdmljb25CYWRnZSh0cnVlKTtmYXZpY29uU3RhdGUuYmxpbmtUaW1lcj1zZXRJbnRlcnZhbChmdW5jdGlvbigpe2Zhdmljb25TdGF0ZS5vbj0hZmF2aWNvblN0YXRlLm9uO3NldEZhdmljb25CYWRnZShmYXZpY29uU3RhdGUub24pO30sNzAwKTt9CiAgZnVuY3Rpb24gaW5pdEZhdmljb25XYXRjaGVyKCl7c2V0dXBGYXZpY29uQmFkZ2UoKTt9CiAgaWYoZG9jdW1lbnQucmVhZHlTdGF0ZT09PSdsb2FkaW5nJylkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJyxpbml0RmF2aWNvbldhdGNoZXIse29uY2U6dHJ1ZX0pO2Vsc2UgaW5pdEZhdmljb25XYXRjaGVyKCk7CgogIC8vIEJhY2tlbmQgY2xvdWQ6IHN1YnN0aXR1aSBxdWFscXVlciBlbmRlcmXDp28gYW50aWdvIHNhbHZvIG5vIFRhbXBlcm1vbmtleS4KICBHTV9zZXRWYWx1ZShrZXkrJ3NlcnZlcicsQ0xPVURfU0VSVkVSKTsKICB2YXIgdG9rZW49R01fZ2V0VmFsdWUoa2V5Kyd0b2tlbicsJycpOwogIHZhciBtZW1iZXI9R01fZ2V0VmFsdWUoa2V5KydtZW1iZXInLCcnKTsKICB2YXIgcm9sZT1HTV9nZXRWYWx1ZShrZXkrJ3JvbGUnLCdpbXBsZW1lbnRhdGlvbl91c2VyJyk7CiAgdmFyIGNoYXRMb2FkaW5nPWZhbHNlLHR5cGluZ1BvbGxpbmc9ZmFsc2UsYmFydWlQb2xsaW5nPWZhbHNlLHJlbW90ZVBvbGxpbmc9ZmFsc2UscmVmcmVzaGluZz1mYWxzZSxyZWFkU2VudEtleT0nJyxjaGF0RmFzdFNpbmNlPScnOwogIHZhciByZW1vdGVSZXN1bHRDYWNoZT17fSxyZW1vdGVSZXN1bHRXYWl0ZXJzPXt9OwogIHZhciBVcE5hdGl2ZU5vdGlmaWNhdGlvbj0odHlwZW9mIE5vdGlmaWNhdGlvbiE9PSd1bmRlZmluZWQnKT9Ob3RpZmljYXRpb246bnVsbDsKCiAgZnVuY3Rpb24gaW5zdGFsbFBhZ2VCcmlkZ2UoKXsKICAgIGlmKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCAmJiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndXBzdGF0dXMtcGFnZS1icmlkZ2UnKSkgcmV0dXJuOwogICAgdmFyIHM9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7CiAgICBzLmlkPSd1cHN0YXR1cy1wYWdlLWJyaWRnZSc7CiAgICBzLnRleHRDb250ZW50PWAoZnVuY3Rpb24oKXsKICAgICAgaWYod2luZG93Ll9fdXBzdGF0dXNCcmlkZ2VJbnN0YWxsZWQpcmV0dXJuOwogICAgICB3aW5kb3cuX191cHN0YXR1c0JyaWRnZUluc3RhbGxlZD10cnVlOwogICAgICAvLyBTaWxlbmNpYSBTT01FTlRFIGFzIG5vdGlmaWNhw6fDtWVzIG5hdGl2YXMgZG8gcHLDs3ByaW8gU2FsZSBTbWFydGx5LgogICAgICAvLyBPIFVwU3RhdHVzIGNyaWEgc3VhcyBub3RpZmljYcOnw7VlcyBwZWxvIGV2ZW50byBVUFNUQVRVU19FWFRFUk5BTF9OT1RJRklDQVRJT04sCiAgICAgIC8vIHVzYW5kbyBhIE5vdGlmaWNhdGlvbiBuYXRpdmEgc2FsdmEgYXF1aSwgZW50w6NvIGVsYXMgY29udGludWFtIGFwYXJlY2VuZG8uCiAgICAgIHRyeXsKICAgICAgICB2YXIgTmF0aXZlTm90aWZpY2F0aW9uPXdpbmRvdy5Ob3RpZmljYXRpb247CiAgICAgICAgaWYoTmF0aXZlTm90aWZpY2F0aW9uICYmICF3aW5kb3cuX191cHN0YXR1c05hdGl2ZU5vdGlmaWNhdGlvbil7CiAgICAgICAgICB3aW5kb3cuX191cHN0YXR1c05hdGl2ZU5vdGlmaWNhdGlvbj1OYXRpdmVOb3RpZmljYXRpb247CiAgICAgICAgICBmdW5jdGlvbiBTaWxlbnRTYWxlU21hcnRseU5vdGlmaWNhdGlvbih0aXRsZSxvcHRpb25zKXsKICAgICAgICAgICAgdmFyIGNoYXRPcGVuPWZhbHNlOwogICAgICAgICAgICB0cnl7dmFyIGNoYXRFbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndXBzdGF0dXMtY2hhdCcpO2NoYXRPcGVuPSEhKGNoYXRFbCYmIWNoYXRFbC5jbGFzc0xpc3QuY29udGFpbnMoJ2hpZGRlbicpKTt9Y2F0Y2goZSl7fQogICAgICAgICAgICB0aGlzLnRpdGxlPVN0cmluZyh0aXRsZXx8JycpOwogICAgICAgICAgICB0aGlzLmJvZHk9b3B0aW9ucyYmb3B0aW9ucy5ib2R5fHwnJzsKICAgICAgICAgICAgdGhpcy50YWc9b3B0aW9ucyYmb3B0aW9ucy50YWd8fCcnOwogICAgICAgICAgICB0aGlzLmRhdGE9b3B0aW9ucyYmb3B0aW9ucy5kYXRhOwogICAgICAgICAgICB0aGlzLm9uY2xpY2s9bnVsbDsgdGhpcy5vbmNsb3NlPW51bGw7IHRoaXMub25zaG93PW51bGw7CiAgICAgICAgICAgIHRoaXMuY2xvc2U9ZnVuY3Rpb24oKXt0cnl7aWYodGhpcy5vbmNsb3NlKXRoaXMub25jbG9zZSgpO31jYXRjaChlKXt9fTsKICAgICAgICAgICAgdGhpcy5fX3Vwc3RhdHVzU3VwcHJlc3NlZD1jaGF0T3BlbjsKICAgICAgICAgIH0KICAgICAgICAgIHRyeXtPYmplY3QuZGVmaW5lUHJvcGVydHkoU2lsZW50U2FsZVNtYXJ0bHlOb3RpZmljYXRpb24sJ3Blcm1pc3Npb24nLHtjb25maWd1cmFibGU6dHJ1ZSxnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gTmF0aXZlTm90aWZpY2F0aW9uLnBlcm1pc3Npb247fX0pfWNhdGNoKGUpe30KICAgICAgICAgIFNpbGVudFNhbGVTbWFydGx5Tm90aWZpY2F0aW9uLnJlcXVlc3RQZXJtaXNzaW9uPWZ1bmN0aW9uKCl7cmV0dXJuIE5hdGl2ZU5vdGlmaWNhdGlvbi5yZXF1ZXN0UGVybWlzc2lvbi5hcHBseShOYXRpdmVOb3RpZmljYXRpb24sYXJndW1lbnRzKTt9OwogICAgICAgICAgU2lsZW50U2FsZVNtYXJ0bHlOb3RpZmljYXRpb24uX191cHN0YXR1c1NpbGVudD10cnVlOwogICAgICAgICAgd2luZG93Lk5vdGlmaWNhdGlvbj1TaWxlbnRTYWxlU21hcnRseU5vdGlmaWNhdGlvbjsKICAgICAgICB9CiAgICAgICAgdHJ5ewogICAgICAgICAgaWYod2luZG93LlNlcnZpY2VXb3JrZXJSZWdpc3RyYXRpb24gJiYgU2VydmljZVdvcmtlclJlZ2lzdHJhdGlvbi5wcm90b3R5cGUgJiYgU2VydmljZVdvcmtlclJlZ2lzdHJhdGlvbi5wcm90b3R5cGUuc2hvd05vdGlmaWNhdGlvbil7CiAgICAgICAgICAgIFNlcnZpY2VXb3JrZXJSZWdpc3RyYXRpb24ucHJvdG90eXBlLnNob3dOb3RpZmljYXRpb249ZnVuY3Rpb24oKXtyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7fTsKICAgICAgICAgIH0KICAgICAgICB9Y2F0Y2goZSl7fQogICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ1VQU1RBVFVTX0VYVEVSTkFMX05PVElGSUNBVElPTicsZnVuY3Rpb24oZXYpewogICAgICAgICAgdHJ5ewogICAgICAgICAgICB2YXIgZD1ldi5kZXRhaWx8fHt9OwogICAgICAgICAgICBpZighd2luZG93Ll9fdXBzdGF0dXNOYXRpdmVOb3RpZmljYXRpb24gfHwgd2luZG93Ll9fdXBzdGF0dXNOYXRpdmVOb3RpZmljYXRpb24ucGVybWlzc2lvbiE9PSdncmFudGVkJylyZXR1cm47CiAgICAgICAgICAgIHZhciBuPW5ldyB3aW5kb3cuX191cHN0YXR1c05hdGl2ZU5vdGlmaWNhdGlvbihkLnRpdGxlfHwnVXBTdGF0dXMnLGQub3B0aW9uc3x8e30pOwogICAgICAgICAgICBuLm9uY2xpY2s9ZnVuY3Rpb24oKXsKICAgICAgICAgICAgICB0cnl7d2luZG93LmZvY3VzKCk7fWNhdGNoKGUpe30KICAgICAgICAgICAgICB0cnl7ZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ1VQU1RBVFVTX0VYVEVSTkFMX05PVElGSUNBVElPTl9DTElDSycse2RldGFpbDp7dHlwZTpkLnR5cGV8fCcnLGlkOmQuaWR8fCcnfX0pKTt9Y2F0Y2goZSl7fQogICAgICAgICAgICAgIHRyeXtuLmNsb3NlKCk7fWNhdGNoKGUpe30KICAgICAgICAgICAgfTsKICAgICAgICAgIH1jYXRjaChlKXt9CiAgICAgICAgfSk7CiAgICAgIH1jYXRjaChlKXt9CiAgICAgIC8vIFNpbGVuY2lhIFNPTUVOVEUgbyDDoXVkaW8gZGUgbm90aWZpY2HDp8OjbyBkbyBTYWxlIFNtYXJ0bHkuCiAgICAgIC8vIE7Do28gbWV4ZXIgZW0gb3V0cm9zIDxhdWRpbz4vPHZpZGVvPiBuZW0gZW0gV2ViIEF1ZGlvLCBwb2lzIG8gVXBTdGF0dXMKICAgICAgLy8gdXNhIFdlYiBBdWRpbyBwYXJhIHNldXMgcHLDs3ByaW9zIGFsZXJ0YXMgKG1lbsOnw6NvIGUgQkFSVUkpLgogICAgICB0cnl7CiAgICAgICAgdmFyIG1lZGlhUGxheT1IVE1MTWVkaWFFbGVtZW50LnByb3RvdHlwZS5wbGF5OwogICAgICAgIGZ1bmN0aW9uIGlzU2FsZU5vdGljZUF1ZGlvKGVsKXsKICAgICAgICAgIHRyeXsKICAgICAgICAgICAgaWYoIWVsIHx8IGVsLnRhZ05hbWUhPT0nQVVESU8nKSByZXR1cm4gZmFsc2U7CiAgICAgICAgICAgIGlmKGVsLmlkPT09J1NvdW5kTm90aWNlQXVkaW8nKSByZXR1cm4gdHJ1ZTsKICAgICAgICAgICAgdmFyIHNyYz1lbC5jdXJyZW50U3JjfHxlbC5zcmN8fCcnOwogICAgICAgICAgICByZXR1cm4gL1wvbGluZ18yXC5tcDMoPzokfFs/I10pL2kudGVzdChzcmMpOwogICAgICAgICAgfWNhdGNoKGUpeyByZXR1cm4gZmFsc2U7IH0KICAgICAgICB9CiAgICAgICAgSFRNTE1lZGlhRWxlbWVudC5wcm90b3R5cGUucGxheT1mdW5jdGlvbigpewogICAgICAgICAgaWYoaXNTYWxlTm90aWNlQXVkaW8odGhpcykpewogICAgICAgICAgICB0cnl7dGhpcy5wYXVzZSgpO3RoaXMubXV0ZWQ9dHJ1ZTt0aGlzLnZvbHVtZT0wO31jYXRjaChlKXt9CiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTsKICAgICAgICAgIH0KICAgICAgICAgIHJldHVybiBtZWRpYVBsYXkuYXBwbHkodGhpcyxhcmd1bWVudHMpOwogICAgICAgIH07CiAgICAgIH1jYXRjaChlKXt9CiAgICAgIHZhciBoeWE9bnVsbCxwcm9qZWN0SWQ9JzE4NDMwMCcsY3BsPW51bGwsY2xpZW50VHlwZT0ncGMnOwogICAgICBmdW5jdGlvbiBjYXB0dXJlKHJhdyxpbml0KXsKICAgICAgICB0cnl7CiAgICAgICAgICB2YXIgdT1uZXcgVVJMKHR5cGVvZiByYXc9PT0nc3RyaW5nJz9yYXc6cmF3LnVybCxsb2NhdGlvbi5ocmVmKTsKICAgICAgICAgIGlmKHUuaG9zdG5hbWUhPT0nYXBpLnNhbGVzbWFydGx5LmNvbScpcmV0dXJuOwogICAgICAgICAgdmFyIGhwPXUuc2VhcmNoUGFyYW1zLmdldCgnX2h5YV8nKTsKICAgICAgICAgIHZhciBwcD11LnNlYXJjaFBhcmFtcy5nZXQoJ3Byb2plY3RfaWQnKXx8dS5zZWFyY2hQYXJhbXMuZ2V0KCdfeG1hXycpOwogICAgICAgICAgaWYocHApcHJvamVjdElkPXBwOwogICAgICAgICAgaWYoaW5pdCYmaW5pdC5oZWFkZXJzKXsKICAgICAgICAgICAgdHJ5ewogICAgICAgICAgICAgIHZhciBocz1pbml0LmhlYWRlcnM7CiAgICAgICAgICAgICAgaWYodHlwZW9mIEhlYWRlcnMhPT0ndW5kZWZpbmVkJyAmJiBocyBpbnN0YW5jZW9mIEhlYWRlcnMpewogICAgICAgICAgICAgICAgdmFyIGM9aHMuZ2V0KCdDcGwnKXx8aHMuZ2V0KCdjcGwnKTsKICAgICAgICAgICAgICAgIHZhciBjdD1ocy5nZXQoJ0NsaWVudC1UeXBlJyl8fGhzLmdldCgnY2xpZW50LXR5cGUnKTsKICAgICAgICAgICAgICAgIGlmKGMpY3BsPWM7CiAgICAgICAgICAgICAgICBpZihjdCljbGllbnRUeXBlPWN0OwogICAgICAgICAgICAgIH1lbHNlIGlmKEFycmF5LmlzQXJyYXkoaHMpKXsKICAgICAgICAgICAgICAgIGhzLmZvckVhY2goZnVuY3Rpb24ocGFpcil7CiAgICAgICAgICAgICAgICAgIGlmKCFwYWlyfHxwYWlyLmxlbmd0aDwyKXJldHVybjsKICAgICAgICAgICAgICAgICAgdmFyIG49U3RyaW5nKHBhaXJbMF0pLnRvTG93ZXJDYXNlKCksdj1TdHJpbmcocGFpclsxXSk7CiAgICAgICAgICAgICAgICAgIGlmKG49PT0nY3BsJyYmdiljcGw9djsKICAgICAgICAgICAgICAgICAgaWYobj09PSdjbGllbnQtdHlwZScmJnYpY2xpZW50VHlwZT12OwogICAgICAgICAgICAgICAgfSk7CiAgICAgICAgICAgICAgfWVsc2V7CiAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyhocykuZm9yRWFjaChmdW5jdGlvbihrKXsKICAgICAgICAgICAgICAgICAgdmFyIG49ay50b0xvd2VyQ2FzZSgpLHY9U3RyaW5nKGhzW2tdfHwnJyk7CiAgICAgICAgICAgICAgICAgIGlmKG49PT0nY3BsJyYmdiljcGw9djsKICAgICAgICAgICAgICAgICAgaWYobj09PSdjbGllbnQtdHlwZScmJnYpY2xpZW50VHlwZT12OwogICAgICAgICAgICAgICAgfSk7CiAgICAgICAgICAgICAgfQogICAgICAgICAgICB9Y2F0Y2goZSl7fQogICAgICAgICAgfQogICAgICAgICAgaWYoaHApewogICAgICAgICAgICBoeWE9aHA7CiAgICAgICAgICAgIGRvY3VtZW50LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdVUFNUQVRVU19IWUEnLHtkZXRhaWw6e2h5YTpoeWEscHJvamVjdElkOnByb2plY3RJZH19KSk7CiAgICAgICAgICB9CiAgICAgICAgfWNhdGNoKGUpe30KICAgICAgfQogICAgICB2YXIgb2xkRmV0Y2g9d2luZG93LmZldGNoOwogICAgICB3aW5kb3cuZmV0Y2g9ZnVuY3Rpb24oaW5wdXQsaW5pdCl7CiAgICAgICAgdHJ5e2NhcHR1cmUoaW5wdXQsaW5pdCl9Y2F0Y2goZSl7fQogICAgICAgIHJldHVybiBvbGRGZXRjaC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7CiAgICAgIH07CiAgICAgIHZhciBvbGRPcGVuPVhNTEh0dHBSZXF1ZXN0LnByb3RvdHlwZS5vcGVuOwogICAgICBYTUxIdHRwUmVxdWVzdC5wcm90b3R5cGUub3Blbj1mdW5jdGlvbihtZXRob2QsdXJsKXsKICAgICAgICB0cnl7Y2FwdHVyZSh1cmwpfWNhdGNoKGUpe30KICAgICAgICByZXR1cm4gb2xkT3Blbi5hcHBseSh0aGlzLGFyZ3VtZW50cyk7CiAgICAgIH07CiAgICAgIHZhciBvbGRTZXRSZXF1ZXN0SGVhZGVyPVhNTEh0dHBSZXF1ZXN0LnByb3RvdHlwZS5zZXRSZXF1ZXN0SGVhZGVyOwogICAgICBYTUxIdHRwUmVxdWVzdC5wcm90b3R5cGUuc2V0UmVxdWVzdEhlYWRlcj1mdW5jdGlvbihuYW1lLHZhbHVlKXsKICAgICAgICB0cnl7CiAgICAgICAgICB2YXIgbj1TdHJpbmcobmFtZXx8JycpLnRvTG93ZXJDYXNlKCksdj1TdHJpbmcodmFsdWV8fCcnKTsKICAgICAgICAgIGlmKG49PT0nY3BsJyYmdiljcGw9djsKICAgICAgICAgIGlmKG49PT0nY2xpZW50LXR5cGUnJiZ2KWNsaWVudFR5cGU9djsKICAgICAgICB9Y2F0Y2goZSl7fQogICAgICAgIHJldHVybiBvbGRTZXRSZXF1ZXN0SGVhZGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTsKICAgICAgfTsKICAgICAgdHJ5ewogICAgICAgIHBlcmZvcm1hbmNlLmdldEVudHJpZXNCeVR5cGUoJ3Jlc291cmNlJykuZm9yRWFjaChmdW5jdGlvbih4KXtjYXB0dXJlKHgubmFtZSl9KTsKICAgICAgfWNhdGNoKGUpe30KICAgICAgZnVuY3Rpb24gcmVzY2FuKCl7CiAgICAgICAgdHJ5e3BlcmZvcm1hbmNlLmdldEVudHJpZXNCeVR5cGUoJ3Jlc291cmNlJykuZm9yRWFjaChmdW5jdGlvbih4KXtjYXB0dXJlKHgubmFtZSl9KTt9Y2F0Y2goZSl7fQogICAgICB9CiAgICAgIHNldFRpbWVvdXQocmVzY2FuLDUwMCk7CiAgICAgIHNldFRpbWVvdXQocmVzY2FuLDE1MDApOwogICAgICBzZXRUaW1lb3V0KHJlc2NhbiwzMDAwKTsKICAgICAgc2V0VGltZW91dChyZXNjYW4sNTAwMCk7CiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ1VQU1RBVFVTX1NFVCcsYXN5bmMgZnVuY3Rpb24oZSl7CiAgICAgICAgdmFyIGRldGFpbD1lLmRldGFpbHx8e307CiAgICAgICAgaWYoIWh5YSl7CiAgICAgICAgICByZXNjYW4oKTsKICAgICAgICAgIHZhciBzdGFydGVkPURhdGUubm93KCk7CiAgICAgICAgICB3aGlsZSghaHlhICYmIERhdGUubm93KCktc3RhcnRlZDw4MDAwKXsKICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSl7c2V0VGltZW91dChyZXNvbHZlLDI1MCl9KTsKICAgICAgICAgICAgcmVzY2FuKCk7CiAgICAgICAgICB9CiAgICAgICAgfQogICAgICAgIGlmKCFoeWEpewogICAgICAgICAgZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ1VQU1RBVFVTX1JFU1VMVCcse2RldGFpbDp7b2s6ZmFsc2UsZXJyb3I6J0Egc2Vzc8OjbyBkbyBTYWxlIFNtYXJ0bHkgYWluZGEgbsOjbyBmb3JuZWNldSBvIGlkZW50aWZpY2Fkb3IgZGEgQVBJIChfaHlhXykuIEFndWFyZGUgYSBww6FnaW5hIGNhcnJlZ2FyIGUgdGVudGUgbm92YW1lbnRlLid9fSkpOwogICAgICAgICAgcmV0dXJuOwogICAgICAgIH0KICAgICAgICB0cnl7CiAgICAgICAgICB2YXIgb25saW5lU3RhdHVzPVN0cmluZyhkZXRhaWwuc3RhdHVzKTsKICAgICAgICAgIHZhciB1cmw9J2h0dHBzOi8vYXBpLnNhbGVzbWFydGx5LmNvbS9zeXMvcHJvamVjdC91c2VyLWxpc3Qvb25saW5lLXN3aXRjaCcKICAgICAgICAgICAgKyc/X3htYV89JytlbmNvZGVVUklDb21wb25lbnQocHJvamVjdElkKQogICAgICAgICAgICArJyZwcm9qZWN0X2lkPScrZW5jb2RlVVJJQ29tcG9uZW50KHByb2plY3RJZCkKICAgICAgICAgICAgKycmX2h5YV89JytlbmNvZGVVUklDb21wb25lbnQoaHlhKQogICAgICAgICAgICArJyZfdGFfPScrRGF0ZS5ub3coKTsKICAgICAgICAgIHZhciBib2R5PW5ldyBVUkxTZWFyY2hQYXJhbXMoKTsKICAgICAgICAgIGJvZHkuc2V0KCdvbmxpbmVfc3RhdHVzJyxvbmxpbmVTdGF0dXMpOwogICAgICAgICAgYm9keS5zZXQoJ2V2ZW50X3R5cGUnLCcwJyk7CiAgICAgICAgICBib2R5LnNldCgncHJvamVjdF9pZCcscHJvamVjdElkKTsKICAgICAgICAgIHZhciByZXF1ZXN0SGVhZGVycz17J0NvbnRlbnQtVHlwZSc6J2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDtjaGFyc2V0PVVURi04J307CiAgICAgICAgICBpZihjbGllbnRUeXBlKXJlcXVlc3RIZWFkZXJzWydDbGllbnQtVHlwZSddPWNsaWVudFR5cGU7CiAgICAgICAgICBpZihjcGwpcmVxdWVzdEhlYWRlcnNbJ0NwbCddPWNwbDsKICAgICAgICAgIHZhciByPWF3YWl0IGZldGNoKHVybCx7CiAgICAgICAgICAgIG1ldGhvZDonUE9TVCcsCiAgICAgICAgICAgIGNyZWRlbnRpYWxzOidpbmNsdWRlJywKICAgICAgICAgICAgaGVhZGVyczpyZXF1ZXN0SGVhZGVycywKICAgICAgICAgICAgYm9keTpib2R5LnRvU3RyaW5nKCkKICAgICAgICAgIH0pOwogICAgICAgICAgdmFyIHg9YXdhaXQgci5qc29uKCkuY2F0Y2goZnVuY3Rpb24oKXtyZXR1cm4gbnVsbH0pOwogICAgICAgICAgaWYoIXIub2sgfHwgIXggfHwgeC5jb2RlIT09MCl7CiAgICAgICAgICAgIGRvY3VtZW50LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdVUFNUQVRVU19SRVNVTFQnLHtkZXRhaWw6e29rOmZhbHNlLGVycm9yOih4JiZ4Lm1zZyl8fCgnU2FsZSBTbWFydGx5IHJldG9ybm91IEhUVFAgJytyLnN0YXR1cysnLicpfX0pKTsKICAgICAgICAgICAgcmV0dXJuOwogICAgICAgICAgfQogICAgICAgICAgZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ1VQU1RBVFVTX1JFU1VMVCcse2RldGFpbDp7b2s6dHJ1ZX19KSk7CiAgICAgICAgfWNhdGNoKGVycil7CiAgICAgICAgICBkb2N1bWVudC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnVVBTVEFUVVNfUkVTVUxUJyx7ZGV0YWlsOntvazpmYWxzZSxlcnJvcjplcnIubWVzc2FnZXx8J0ZhbGhhIGFvIHNpbmNyb25pemFyIGNvbSBTYWxlIFNtYXJ0bHkuJ319KSk7CiAgICAgICAgfQogICAgICB9KTsKICAgIH0pKCk7YDsKICAgIChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnR8fGRvY3VtZW50LmhlYWR8fGRvY3VtZW50LmJvZHkpLmFwcGVuZENoaWxkKHMpOwogICAgcy5yZW1vdmUoKTsKICB9CgogIGluc3RhbGxQYWdlQnJpZGdlKCk7CgogIHZhciBsYWJlbHM9e29ubGluZTonT25saW5lJyxidXN5OidPY3VwYWRvJyxhd2F5OidBdXNlbnRlJyxvZmZsaW5lOidTZW0gc3RhdHVzJ307CiAgdmFyIHJlYXNvbnM9W3t2YWx1ZTonRW0gdHJlaW5hbWVudG8nLGxhYmVsOidFbSB0cmVpbmFtZW50bycsaWNvbjondHJhaW5pbmcnfSx7dmFsdWU6J0VtIGF1bGEgYWJlcnRhJyxsYWJlbDonRW0gYXVsYSBhYmVydGEnLGljb246J2Jvb2snfSx7dmFsdWU6J09jdXBhZG8gY29tIHRhcmVmYScsbGFiZWw6J09jdXBhZG8gY29tIHRhcmVmYScsaWNvbjondG9vbHMnfSx7dmFsdWU6J0VtIHJldW5pw6NvJyxsYWJlbDonRW0gcmV1bmnDo28nLGljb246J21lZXRpbmcnfSx7dmFsdWU6J0FsbW/Dp2FuZG8nLGxhYmVsOidBbG1vw6dhbmRvJyxpY29uOidsdW5jaCd9LHt2YWx1ZTonT3V0cm8nLGxhYmVsOidPdXRybycsaWNvbjonZWRpdCd9XTsKICB2YXIgaGlzdG9yeUNhY2hlPVtdOwogIHZhciBjaGF0Q2FjaGU9W107CiAgdmFyIHByb2ZpbGVDYWNoZT17fTsKICB2YXIgbWVkaWFCbG9iQ2FjaGU9e307CiAgdmFyIHJlc2l6ZU9ic2VydmVyPW51bGw7CiAgdmFyIGNoYXRVbnJlYWQ9MDsKICB2YXIgY2hhdEluaXRpYWxpemVkPWZhbHNlOwogIHZhciBzZWVuTWVudGlvbklkcz17fTsKICB2YXIgYXVkaW9DdHg9bnVsbDsKICB2YXIgYXVkaW9VbmxvY2tlZD1mYWxzZTsKICB2YXIgbWVkaWFSZWNvcmRlcj1udWxsOwogIHZhciByZWNvcmRpbmdDaHVua3M9W107CiAgdmFyIHJlY29yZGluZ1RpbWVyPW51bGw7CiAgdmFyIHJlY29yZGluZ1N0YXJ0ZWRBdD0wOwogIHZhciBjaGF0UmVwbHlUbz1udWxsOwogIHZhciBjaGF0Q29udGV4dE1lc3NhZ2VJZD1udWxsOwogIHZhciBsdWNjYU9ubGluZT1mYWxzZTsKICB2YXIgbGFzdEx1Y2NhSm9pbkV2ZW50SWQ9Jyc7CiAgdmFyIGJhcnVpU3RhdGU9e2FjdGl2ZTpmYWxzZSxzZXF1ZW5jZTowLHRhcmdldDonJyxzZW5kZXI6Jycsc3RhcnRlZEF0OjB9OwogIHZhciBiYXJ1aU91dGdvaW5nPXthY3RpdmU6ZmFsc2UsdGFyZ2V0OicnfTsKICB2YXIgYmFydWlMYXN0QmVlcD0wOwogIHZhciBiYXJ1aUV4dGVybmFsTm90aWZpZWRTZXF1ZW5jZT0wOwogIHZhciBvcmlnaW5hbFRpdGxlPWRvY3VtZW50LnRpdGxlOwogIHZhciBjdXJyZW50U3RhdHVzPSdvZmZsaW5lJzsKICB2YXIgQ1VSUkVOVF9WRVJTSU9OPScyLjcuMjQnOwogIHZhciBVUERBVEVfVVJMPXNlcnZlcisnL3Vwc3RhdHVzLnVzZXIuanMnOwogIHZhciBleHRlcm5hbE5vdGlmUGVybWlzc2lvbj0nZGVmYXVsdCc7CiAgdmFyIGV4dGVybmFsTm90aWZTZWVuPXt9OwogIGZ1bmN0aW9uIGljb25TdmcobmFtZSxjbHMpe3ZhciBwPXsKICAgIG9ubGluZTonPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOCIgZmlsbD0iY3VycmVudENvbG9yIi8+JywKICAgIGJ1c3k6JzxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjgiIGZpbGw9ImN1cnJlbnRDb2xvciIvPicsCiAgICBhd2F5Oic8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4IiBmaWxsPSJjdXJyZW50Q29sb3IiLz4nLAogICAgY2xvY2s6JzxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjguNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik0xMiA3djVsMyAyIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4nLAogICAgZG93bmxvYWQ6JzxwYXRoIGQ9Ik0xMiA0djEwbTAgMCA0LTRtLTQgNC00LTRNNSAxOWgxNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+JywKICAgIHNvdW5kOic8cGF0aCBkPSJNNSAxMHY0aDNsNCAzVjdsLTQgM0g1WiIgZmlsbD0iY3VycmVudENvbG9yIi8+PHBhdGggZD0iTTE1IDkuNWE0IDQgMCAwIDEgMCA1TTE3LjUgN2E3LjUgNy41IDAgMCAxIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuNyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+JywKICAgIGNoYXQ6JzxwYXRoIGQ9Ik00IDUuNUEyLjUgMi41IDAgMCAxIDYuNSAzaDExQTIuNSAyLjUgMCAwIDEgMjAgNS41djdBMi41IDIuNSAwIDAgMSAxNy41IDE1SDEwbC01IDR2LTQuNUEyLjUgMi41IDAgMCAxIDIuNSAxMlY2QTIuNSAyLjUgMCAwIDEgNCA1LjVaIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjgiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cGF0aCBkPSJNNyA4aDEwTTcgMTFoNiIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS43IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4nLAogICAgdHJhaW5pbmc6JzxwYXRoIGQ9Ik0zIDkgMTIgNWw5IDQtOSA0LTktNFoiIGZpbGw9ImN1cnJlbnRDb2xvciIvPjxwYXRoIGQ9Ik02IDExdjRjMiAyIDEwIDIgMTIgMHYtNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS44Ii8+PHBhdGggZD0iTTIxIDl2NSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4nLAogICAgYm9vazonPHBhdGggZD0iTTQgNS41QTIuNSAyLjUgMCAwIDEgNi41IDNIMTJ2MTZINi41QTIuNSAyLjUgMCAwIDAgNCAyMVY1LjVaIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjgiLz48cGF0aCBkPSJNMjAgNS41QTIuNSAyLjUgMCAwIDAgMTcuNSAzSDEydjE2aDUuNUEyLjUgMi41IDAgMCAxIDIwIDIxVjUuNVoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuOCIvPicsCiAgICB0b29sczonPHBhdGggZD0ibTE0LjUgNi41IDMtM2E0IDQgMCAwIDAgNSA1bC0zIDMtMy0zLTcgN2EyIDIgMCAxIDEtMy0zbDctN1oiIGZpbGw9ImN1cnJlbnRDb2xvciIvPicsCiAgICBtZWV0aW5nOic8cGF0aCBkPSJNNCA1aDEyYTIgMiAwIDAgMSAyIDJ2NmEyIDIgMCAwIDEtMiAySDlsLTQgM3YtMy41QTIgMiAwIDAgMSAzIDEyVjdhMiAyIDAgMCAxIDEtMloiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuNyIvPjxwYXRoIGQ9Ik0xOCA4aDFhMiAyIDAgMCAxIDIgMnY1YTIgMiAwIDAgMS0yIDJ2MmwtMy0yaC0yIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjciLz4nLAogICAgbHVuY2g6JzxwYXRoIGQ9Ik00IDEyaDE2djJhNSA1IDAgMCAxLTUgNUg5YTUgNSAwIDAgMS01LTV2LTJaIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjgiLz48cGF0aCBkPSJNNiAxMmMuNS0zIDMtNSA2LTVzNS41IDIgNiA1IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjgiLz48cGF0aCBkPSJNMjAgNXY3bS0yLTd2M200LTN2MyIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS42IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4nLAogICAgZWRpdDonPHBhdGggZD0ibTUgMTkgMS00TDE2IDVhMiAyIDAgMCAxIDMgM0w5IDE4bC00IDFaIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjgiLz48cGF0aCBkPSJtMTQgNyAzIDMiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuOCIvPicsCiAgICBza3VsbDonPHBhdGggZD0iTTggMTZoOHYzSDh6IiBmaWxsPSJjdXJyZW50Q29sb3IiLz48cGF0aCBkPSJNNSAxMGE3IDcgMCAwIDEgMTQgMGMwIDMtMiA1LTQgNkg5Yy0yLTEtNC0zLTQtNloiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuOCIvPjxjaXJjbGUgY3g9IjkiIGN5PSIxMCIgcj0iMS4yIiBmaWxsPSJjdXJyZW50Q29sb3IiLz48Y2lyY2xlIGN4PSIxNSIgY3k9IjEwIiByPSIxLjIiIGZpbGw9ImN1cnJlbnRDb2xvciIvPicsCiAgICBiZWxsOic8cGF0aCBkPSJNNiAxN2gxMmwtMS41LTJ2LTRhNC41IDQuNSAwIDAgMC05IDB2NEw2IDE3WiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTEwIDIwaDQiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+JywKICAgIGVtb2ppOic8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4LjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuOCIvPjxjaXJjbGUgY3g9IjkiIGN5PSIxMCIgcj0iMSIgZmlsbD0iY3VycmVudENvbG9yIi8+PGNpcmNsZSBjeD0iMTUiIGN5PSIxMCIgcj0iMSIgZmlsbD0iY3VycmVudENvbG9yIi8+PHBhdGggZD0iTTguNSAxNGMxIDEuMzUgMi4xNyAyIDMuNSAyczIuNS0uNjUgMy41LTIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuNyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+JywKICAgIHBob3RvOic8cmVjdCB4PSI0IiB5PSI1IiB3aWR0aD0iMTYiIGhlaWdodD0iMTQiIHJ4PSIyIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjgiLz48Y2lyY2xlIGN4PSI5IiBjeT0iMTAiIHI9IjEuNSIgZmlsbD0iY3VycmVudENvbG9yIi8+PHBhdGggZD0ibTUgMTcgNC00IDMgMyAyLTIgNSA0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjgiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4nLAogICAgdXBkYXRlOic8cGF0aCBkPSJNMTkgOGE3IDcgMCAxIDAgMSA2IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxwYXRoIGQ9Ik0xOSA0djRoLTQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+JyAsCiAgICBzdW46JzxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuOCIvPjxwYXRoIGQ9Ik0xMiAydjNNMTIgMTl2M00yIDEyaDNNMTkgMTJoM000LjkgNC45bDIuMSAyLjFNMTcgMTdsMi4xIDIuMU0xOS4xIDQuOSAxNyA3TTcgMTdsLTIuMSAyLjEiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuNyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+JywKICAgIG1vb246JzxwYXRoIGQ9Ik0yMCAxNS41QTguNSA4LjUgMCAwIDEgOC41IDRhOC41IDguNSAwIDEgMCAxMS41IDExLjVaIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjgiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4nLAogICAgcG93ZXI6JzxwYXRoIGQ9Ik0xMiAzdjgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxwYXRoIGQ9Ik03LjEgNi4xYTcgNyAwIDEgMCA5LjggMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+JyAsCiAgICBwdWxzZTonPHBhdGggZD0iTTMgMTJoNGwyLTUgNCAxMCAyLTVoNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4nLAogICAgZ2VhcjonPHBhdGggZD0iTTE5LjQzIDEyLjk4Yy4wNC0uMzIuMDctLjY1LjA3LS45OHMtLjAyLS42Ni0uMDctLjk4bDIuMTEtMS42NWMuMTktLjE1LjI0LS40Mi4xMi0uNjRsLTItMy40NmMtLjEyLS4yMi0uMzctLjMxLS42LS4yMmwtMi40OSAxYTcuMTggNy4xOCAwIDAgMC0xLjY5LS45OEwxNC41IDIuNDJBLjQ5LjQ5IDAgMCAwIDE0IDJoLTRhLjQ5LjQ5IDAgMCAwLS40OS40MmwtLjM4IDIuNjVjLS42MS4yNS0xLjE4LjU4LTEuNjkuOThsLTIuNDktMWEuNDkuNDkgMCAwIDAtLjYuMjJsLTIgMy40NmMtLjEzLjIyLS4wNy40OS4xMi42NGwyLjExIDEuNjVjLS4wNC4zMi0uMDguNjUtLjA4Ljk4cy4wMy42Ni4wOC45OGwtMi4xMSAxLjY1YS41LjUgMCAwIDAtLjEyLjY0bDIgMy40NmMuMTIuMjIuMzcuMzEuNi4yMmwyLjQ5LTFjLjUxLjQgMS4wOC43MyAxLjY5Ljk4bC4zOCAyLjY1Yy4wNC4yNC4yNC40Mi40OS40Mmg0Yy4yNSAwIC40NS0uMTguNDktLjQybC4zOC0yLjY1Yy42MS0uMjUgMS4xOC0uNTggMS42OS0uOThsMi40OSAxYy4yMy4wOS40OCAwIC42LS4yMmwyLTMuNDZjLjEyLS4yMi4wNy0uNDktLjEyLS42NGwtMi4xMS0xLjY1Wk0xMiAxNS41QTMuNSAzLjUgMCAxIDEgMTIgOGEzLjUgMy41IDAgMCAxIDAgNy41WiIgZmlsbD0iY3VycmVudENvbG9yIi8+JywKICAgIHBsdWdvZmY6JzxwYXRoIGQ9Ik05IDN2NW02LTV2NSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNNi41IDhoMTF2Mi41YTUuNSA1LjUgMCAwIDEtMTEgMFY4WiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS44Ii8+PHBhdGggZD0iTTEyIDE2djNtLTMgMmg2IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxwYXRoIGQ9Im00IDQgMTYgMTYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+JywKICB9OyByZXR1cm4gJzxzdmcgY2xhc3M9InVwLWljb24gJysoY2xzfHwnJykrJyIgdmlld0JveD0iMCAwIDI0IDI0IiBhcmlhLWhpZGRlbj0idHJ1ZSI+JysocFtuYW1lXXx8cC5lZGl0KSsnPC9zdmc+J30KICBmdW5jdGlvbiByZWFzb25JY29uKHJlYXNvbil7dmFyIHI9cmVhc29ucy5maW5kKGZ1bmN0aW9uKHgpe3JldHVybiB4LnZhbHVlPT09cmVhc29ufSk7cmV0dXJuICc8c3BhbiBjbGFzcz0idXAtaWNvbi13cmFwIj4nK2ljb25Tdmcocj9yLmljb246J2VkaXQnKSsnPC9zcGFuPid9CiAgZnVuY3Rpb24gcmVhc29uTGFiZWwocmVhc29uKXt2YXIgcj1yZWFzb25zLmZpbmQoZnVuY3Rpb24oeCl7cmV0dXJuIHgudmFsdWU9PT1yZWFzb259KTtyZXR1cm4gcj9yLmxhYmVsOnJlYXNvbn0KICBmdW5jdGlvbiByZWFzb25FbW9qaShyZWFzb24pe3JldHVybiByZWFzb25JY29uKHJlYXNvbil9CgogIGZ1bmN0aW9uIGFwaShtZXRob2Qscm91dGUsZGF0YSl7CiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3QpewogICAgICBHTV94bWxodHRwUmVxdWVzdCh7CiAgICAgICAgbWV0aG9kOm1ldGhvZCwKICAgICAgICB1cmw6KGZ1bmN0aW9uKCl7CiAgICAgICAgICB2YXIgdT1zZXJ2ZXIrcm91dGU7CiAgICAgICAgICBpZigvXmh0dHBzOlwvXC9bXi9dK1wuc3VwYWJhc2VcLmNvXC9mdW5jdGlvbnNcL3YxXC91cHN0YXR1cyQvaS50ZXN0KHNlcnZlcikpewogICAgICAgICAgICB1Kz0odS5pbmRleE9mKCc/Jyk+PTA/JyYnOic/JykrJ2ZvcmNlRnVuY3Rpb25SZWdpb249dXMtd2VzdC0yJzsKICAgICAgICAgIH0KICAgICAgICAgIHJldHVybiB1OwogICAgICAgIH0pKCksCiAgICAgICAgaGVhZGVyczpPYmplY3QuYXNzaWduKHsnQ29udGVudC1UeXBlJzonYXBwbGljYXRpb24vanNvbid9LHRva2VuP3snWC1VcFN0YXR1cy1Ub2tlbic6dG9rZW59Ont9KSwKICAgICAgICBkYXRhOmRhdGE/SlNPTi5zdHJpbmdpZnkoZGF0YSk6dW5kZWZpbmVkLAogICAgICAgIG9ubG9hZDpmdW5jdGlvbihyKXsKICAgICAgICAgIHZhciB4OwogICAgICAgICAgdHJ5e3g9SlNPTi5wYXJzZShyLnJlc3BvbnNlVGV4dCl9Y2F0Y2goZSl7cmVqZWN0KG5ldyBFcnJvcignUmVzcG9zdGEgaW52w6FsaWRhIGRvIHNlcnZpZG9yLicpKTtyZXR1cm59CiAgICAgICAgICBpZihyLnN0YXR1cz49NDAwfHx4LmVycm9yKXtyZWplY3QobmV3IEVycm9yKHguZXJyb3J8fCdFcnJvIGRlIGNvbXVuaWNhw6fDo28uJykpO3JldHVybn0KICAgICAgICAgIHJlc29sdmUoeCk7CiAgICAgICAgfSwKICAgICAgICBvbmVycm9yOmZ1bmN0aW9uKCl7cmVqZWN0KG5ldyBFcnJvcignTsOjbyBmb2kgcG9zc8OtdmVsIGNvbmVjdGFyIGFvIHNlcnZpZG9yIFVwU3RhdHVzLicpKX0KICAgICAgfSk7CiAgICB9KTsKICB9CgogIGZ1bmN0aW9uIG5vZGUodGFnLHByb3BzKXt2YXIgeD1kb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZyk7T2JqZWN0LmFzc2lnbih4LHByb3BzfHx7fSk7cmV0dXJuIHh9CiAgZnVuY3Rpb24gZXNjKHMpe3JldHVybiBTdHJpbmcocz09bnVsbD8nJzpzKS5yZXBsYWNlKC9bJjw+IiddL2csZnVuY3Rpb24oYyl7cmV0dXJuIHsnJic6JyZhbXA7JywnPCc6JyZsdDsnLCc+JzonJmd0OycsJyInOicmcXVvdDsnLCInIjonJiMwMzk7J31bY119KX0KICBmdW5jdGlvbiBmbXRUaW1lKHgpe3JldHVybiB4P25ldyBJbnRsLkRhdGVUaW1lRm9ybWF0KCdwdC1CUicse2hvdXI6JzItZGlnaXQnLG1pbnV0ZTonMi1kaWdpdCd9KS5mb3JtYXQobmV3IERhdGUoeCkpOicnfQogIGZ1bmN0aW9uIGZtdERheSh4KXtyZXR1cm4geD9uZXcgSW50bC5EYXRlVGltZUZvcm1hdCgncHQtQlInLHtkYXk6JzItZGlnaXQnLG1vbnRoOicyLWRpZ2l0Jyx5ZWFyOidudW1lcmljJ30pLmZvcm1hdChuZXcgRGF0ZSh4KSk6Jyd9CiAgZnVuY3Rpb24gc3RhdHVzSWNvbihzKXtyZXR1cm4gJzxzcGFuIGNsYXNzPSJ1cC1pY29uLXdyYXAgc3RhdHVzLWljb24gJysoc3x8JycpKyciPicraWNvblN2ZyhzPT09J29ubGluZSc/J29ubGluZSc6cz09PSdidXN5Jz8nYnVzeSc6J2F3YXknKSsnPC9zcGFuPid9CiAgZnVuY3Rpb24gbWVzc2FnZSh0eHQsYmFkKXsKICAgIHZhciB4PWNhcmQucXVlcnlTZWxlY3RvcignLnVwLW1lc3NhZ2UnKTsKICAgIGlmKHgpe3gudGV4dENvbnRlbnQ9dHh0fHwnJzt4LnN0eWxlLmNvbG9yPWJhZD8nI2ZmODQ5OSc6JyM3NWRiYTAnfQogIH0KCiAgdmFyIHN0eWxlPW5vZGUoJ3N0eWxlJyx7dGV4dENvbnRlbnQ6CiAgICAnI3Vwc3RhdHVzLXJvb3R7cG9zaXRpb246Zml4ZWQ7cmlnaHQ6MjRweDtib3R0b206MjRweDt6LWluZGV4OjIxNDc0ODM2NDc7Zm9udDoxNHB4IFNlZ29lIFVJLEFyaWFsLHNhbnMtc2VyaWY7Y29sb3I6I2VkZjJmYn0nKwogICAgICAgICcudXAtbWFpbi1hbGVydHthbmltYXRpb246dXBBbGVydFNoYWtlIC40NXMgZWFzZS1pbi1vdXQgMX0nKwogICAgJy51cC1tYWluLWFsZXJ0LnVwLWJhcnVpLWFsZXJ0e2FuaW1hdGlvbjp1cEFsZXJ0U2hha2UgLjM1cyBlYXNlLWluLW91dCBpbmZpbml0ZX0nKwogICAgJ0BrZXlmcmFtZXMgdXBBbGVydFNoYWtlezAlLDEwMCV7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoMCkgcm90YXRlKDApfTIwJXt0cmFuc2Zvcm06dHJhbnNsYXRlWCgtNHB4KSByb3RhdGUoLTNkZWcpfTQwJXt0cmFuc2Zvcm06dHJhbnNsYXRlWCg0cHgpIHJvdGF0ZSgzZGVnKX02MCV7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoLTNweCkgcm90YXRlKC0yZGVnKX04MCV7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoM3B4KSByb3RhdGUoMmRlZyl9fScrCicjdXBzdGF0dXMtYnViYmxle3Bvc2l0aW9uOnJlbGF0aXZlO3dpZHRoOjQycHg7aGVpZ2h0OjQycHg7Ym9yZGVyOjNweCBzb2xpZCAjNmI3Njg4O2JvcmRlci1yYWRpdXM6NTAlO2JhY2tncm91bmQ6IzViNjU3NDtvdmVyZmxvdzp2aXNpYmxlO3BhZGRpbmc6MDtib3gtc2hhZG93OjAgNXB4IDE2cHggIzAwMDk7Y3Vyc29yOmdyYWI7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO3VzZXItc2VsZWN0Om5vbmU7LXdlYmtpdC11c2VyLXNlbGVjdDpub25lO3RvdWNoLWFjdGlvbjpub25lO2xpbmUtaGVpZ2h0OjE7dHJhbnNpdGlvbjpiYWNrZ3JvdW5kIC4xOHMsYm9yZGVyLWNvbG9yIC4xOHN9JysKICAgICcjdXBzdGF0dXMtYnViYmxlIC51cC1idWJibGUtYXZhdGFye2Rpc3BsYXk6YmxvY2s7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJTtib3JkZXItcmFkaXVzOjUwJTtvYmplY3QtZml0OmNvdmVyO2JveC1zaXppbmc6Ym9yZGVyLWJveDtwb2ludGVyLWV2ZW50czpub25lfScrCiAgICAnI3Vwc3RhdHVzLWJ1YmJsZSAudXAtYnViYmxlLWljb257d2lkdGg6MjJweDtoZWlnaHQ6MjJweDtjb2xvcjojZmZmfScrCiAgICAnLnVwLW5vdGlmeS1kb3R7cG9zaXRpb246YWJzb2x1dGU7cmlnaHQ6LTEwcHg7dG9wOi0xMHB4O21pbi13aWR0aDoxOHB4O2hlaWdodDoxOHB4O3BhZGRpbmc6MCA0cHg7Ym9yZGVyLXJhZGl1czo5OTlweDtiYWNrZ3JvdW5kOiNmZjMzNGY7Ym9yZGVyOjJweCBzb2xpZCAjMTkyMTJlO2Rpc3BsYXk6bm9uZTthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtib3gtc2l6aW5nOmJvcmRlci1ib3g7Y29sb3I6I2ZmZjtmb250OjgwMCAxMHB4LzEgU2Vnb2UgVUksQXJpYWwsc2Fucy1zZXJpZn0udXAtbm90aWZ5LWRvdC5zaG93e2Rpc3BsYXk6YmxvY2t9LnVwLXF1aWNrLWNoYXQtYnViYmxle3Bvc2l0aW9uOmFic29sdXRlO2xlZnQ6LTdweDt0b3A6LTdweDt3aWR0aDoyMnB4O2hlaWdodDoyMnB4O2JvcmRlcjoycHggc29saWQgIzE5MjEyZTtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOiM2ODczODQ7Y29sb3I6I2ZmZjtib3gtc2l6aW5nOmJvcmRlci1ib3g7cGFkZGluZzowO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtib3gtc2hhZG93OjAgNHB4IDEwcHggIzAwMDg7Y3Vyc29yOnBvaW50ZXI7ei1pbmRleDo1O3RyYW5zaXRpb246YmFja2dyb3VuZCAuMThzLGJvcmRlci1jb2xvciAuMThzLHRyYW5zZm9ybSAuMThzfS51cC1xdWljay1jaGF0LWJ1YmJsZTpob3ZlcntiYWNrZ3JvdW5kOiM3YTg3OTk7Ym9yZGVyLWNvbG9yOiMyNTMxNDk7dHJhbnNmb3JtOnNjYWxlKDEuMDgpfS51cC1xdWljay1jaGF0LWJ1YmJsZS5sdWNjYS1hY3RpdmV7YmFja2dyb3VuZDojYzUyZjQ4O2JvcmRlci1jb2xvcjojZmY2NjdiO2FuaW1hdGlvbjp1cEx1Y2NhUHVsc2UgLjhzIGluZmluaXRlIGFsdGVybmF0ZX0udXAtcXVpY2stY2hhdC1idWJibGUubHVjY2EtYWN0aXZlOmhvdmVye2JhY2tncm91bmQ6I2Q2M2I1Mjtib3JkZXItY29sb3I6I2ZmODI5Mn1Aa2V5ZnJhbWVzIHVwTHVjY2FQdWxzZXtmcm9te2JveC1zaGFkb3c6MCA0cHggMTBweCAjMDAwOCwwIDAgMCAwICNmZjMzNGY2Nn10b3tib3gtc2hhZG93OjAgNHB4IDEwcHggIzAwMDgsMCAwIDAgN3B4ICNmZjMzNGYzM319LnVwLXF1aWNrLWNoYXQtaWNvbnt3aWR0aDoxMnB4O2hlaWdodDoxMnB4fS51cC11cGRhdGUtZG90e3Bvc2l0aW9uOmFic29sdXRlO3JpZ2h0Oi04cHg7dG9wOi04cHg7d2lkdGg6MjJweDtoZWlnaHQ6MjJweDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOiM0ZjdkZmY7Ym9yZGVyOjJweCBzb2xpZCAjMTkyMTJlO2Rpc3BsYXk6bm9uZTthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmb250LXNpemU6MTJweDtsaW5lLWhlaWdodDoxO2JveC1zaXppbmc6Ym9yZGVyLWJveDtjdXJzb3I6cG9pbnRlcjtwb2ludGVyLWV2ZW50czphdXRvfS51cC11cGRhdGUtZG90LnNob3d7ZGlzcGxheTpmbGV4fS51cC11cGRhdGUtZG90OmhvdmVye2JhY2tncm91bmQ6IzZiOTNmZjt0cmFuc2Zvcm06c2NhbGUoMS4wOCl9JysKICAgICcudXAtYmFydWktaW5jb21pbmd7cG9zaXRpb246YWJzb2x1dGU7cmlnaHQ6NTJweDtib3R0b206MDt3aWR0aDozMTVweDt6LWluZGV4OjkwO3BvaW50ZXItZXZlbnRzOmF1dG99LnVwLWJhcnVpLWluY29taW5nLmhpZGRlbntkaXNwbGF5Om5vbmV9LnVwLWJhcnVpLWluY29taW5nLWNhcmR7cG9zaXRpb246cmVsYXRpdmU7Ym94LXNpemluZzpib3JkZXItYm94O3BhZGRpbmc6MTNweCAxMnB4IDExcHg7Ym9yZGVyOjJweCBzb2xpZCAjZmYzZDU4O2JvcmRlci1yYWRpdXM6MTRweDtiYWNrZ3JvdW5kOnJnYmEoNzUsMTIsMjUsLjk0KTtjb2xvcjojZmZmO2JveC1zaGFkb3c6MCAwIDAgM3B4IHJnYmEoMjU1LDQ1LDcyLC4xNCksMCAxMHB4IDMwcHggcmdiYSgwLDAsMCwuMzUpO2FuaW1hdGlvbjp1cGJhcnVpQWxlcnQgLjYycyBpbmZpbml0ZSBhbHRlcm5hdGV9LnVwLWJhcnVpLWluY29taW5nLXRpdGxle2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjkwMDtsZXR0ZXItc3BhY2luZzouMnB4O2xpbmUtaGVpZ2h0OjEuMjt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2V9LnVwLWJhcnVpLWluY29taW5nLXN1Yntmb250LXNpemU6MTFweDtjb2xvcjojZmZkNmRjO21hcmdpbi10b3A6NHB4fS51cC1iYXJ1aS1pbmNvbWluZy1hY3Rpb25ze2Rpc3BsYXk6ZmxleDtnYXA6N3B4O21hcmdpbi10b3A6MTBweH0udXAtYmFydWktaW5jb21pbmctYWN0aW9ucyBidXR0b257ZmxleDoxO2JvcmRlcjowO2JvcmRlci1yYWRpdXM6OHB4O3BhZGRpbmc6OHB4IDlweDtmb250OjgwMCAxMnB4IFNlZ29lIFVJLEFyaWFsLHNhbnMtc2VyaWY7Y3Vyc29yOnBvaW50ZXJ9LnVwLWJhcnVpLWF0dGVuZHtiYWNrZ3JvdW5kOiNmZmY7Y29sb3I6I2I1MWYzOX0udXAtYmFydWktc3RvcHtiYWNrZ3JvdW5kOiM4ZDFmMzI7Y29sb3I6I2ZmZn0udXAtYmFydWktaW5jb21pbmcuc2hha2V7YW5pbWF0aW9uOnVwYmFydWlBbGVydCAuNjJzIGluZmluaXRlIGFsdGVybmF0ZX0udXAtdG9hc3Qtc3RhY2t7cG9zaXRpb246YWJzb2x1dGU7cmlnaHQ6NTJweDtib3R0b206MDt3aWR0aDozMDBweDtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uLXJldmVyc2U7Z2FwOjdweDtwb2ludGVyLWV2ZW50czpub25lfS51cC10b2FzdHtwb3NpdGlvbjpyZWxhdGl2ZTtwb2ludGVyLWV2ZW50czphdXRvO2JveC1zaXppbmc6Ym9yZGVyLWJveDt3aWR0aDoxMDAlO3BhZGRpbmc6OXB4IDI4cHggOXB4IDExcHg7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDkwLDEwNSwxMzAsLjQ1KTtib3JkZXItcmFkaXVzOjEycHg7YmFja2dyb3VuZDpyZ2JhKDI1LDMzLDQ2LC44Mik7YmFja2Ryb3AtZmlsdGVyOmJsdXIoMTBweCk7LXdlYmtpdC1iYWNrZHJvcC1maWx0ZXI6Ymx1cigxMHB4KTtib3gtc2hhZG93OjAgOHB4IDI0cHggcmdiYSgwLDAsMCwuMjIpO2NvbG9yOiNlN2VkZjc7YW5pbWF0aW9uOnVwdG9hc3RJbiAuMTZzIGVhc2Utb3V0fS51cC10b2FzdC1uYW1le2ZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0Ojc1MDtjb2xvcjojYWViYmQwO2xpbmUtaGVpZ2h0OjEuMTU7bWFyZ2luLWJvdHRvbTozcHh9LnVwLXRvYXN0LXRleHR7Zm9udC1zaXplOjEycHg7bGluZS1oZWlnaHQ6MS4zNTt3aGl0ZS1zcGFjZTpwcmUtd3JhcDt3b3JkLWJyZWFrOmJyZWFrLXdvcmR9LnVwLXRvYXN0LWNsb3Nle3Bvc2l0aW9uOmFic29sdXRlO3JpZ2h0OjdweDt0b3A6NnB4O3dpZHRoOjE4cHg7aGVpZ2h0OjE4cHg7Ym9yZGVyOjA7Ym9yZGVyLXJhZGl1czo1MCU7YmFja2dyb3VuZDp0cmFuc3BhcmVudDtjb2xvcjojOWFhOGJjO2ZvbnQtc2l6ZToxNHB4O2xpbmUtaGVpZ2h0OjE4cHg7cGFkZGluZzowO2N1cnNvcjpwb2ludGVyfS51cC10b2FzdC1jbG9zZTpob3ZlcntiYWNrZ3JvdW5kOnJnYmEoMTI3LDE0NSwxNzAsLjE2KTtjb2xvcjojZWRmMmZifUBrZXlmcmFtZXMgdXB0b2FzdElue2Zyb217b3BhY2l0eTowO3RyYW5zZm9ybTp0cmFuc2xhdGVYKDhweCl9dG97b3BhY2l0eToxO3RyYW5zZm9ybTp0cmFuc2xhdGVYKDApfX1AbWVkaWEocHJlZmVycy1jb2xvci1zY2hlbWU6bGlnaHQpey51cC10b2FzdHtiYWNrZ3JvdW5kOnJnYmEoMjU1LDI1NSwyNTUsLjgyKTtib3JkZXItY29sb3I6cmdiYSg2MCw3NSw5NSwuMjIpO2NvbG9yOiMxZDI3MzU7Ym94LXNoYWRvdzowIDhweCAyNHB4IHJnYmEoMCwwLDAsLjE0KX0udXAtdG9hc3QtbmFtZXtjb2xvcjojNTI2MTc2fS51cC10b2FzdC1jbG9zZXtjb2xvcjojNzE4MDk2fS51cC10b2FzdC1jbG9zZTpob3ZlcntiYWNrZ3JvdW5kOnJnYmEoODAsOTUsMTE1LC4xKTtjb2xvcjojMjYzMzQ1fX0nKwogICAgJy51cC1idWJibGUtaWNvbnt3aWR0aDoyNHB4O2hlaWdodDoyNHB4fScrCiAgICAnI3Vwc3RhdHVzLWNhcmR7cG9zaXRpb246YWJzb2x1dGU7Ym90dG9tOjU1cHg7cmlnaHQ6MDt3aWR0aDozNjVweDttYXgtd2lkdGg6Y2FsYygxMDB2dyAtIDMycHgpO2JhY2tncm91bmQ6IzE5MjEyZTtib3JkZXI6MXB4IHNvbGlkICMzNTQyNTg7Ym9yZGVyLXJhZGl1czoxNnB4O3BhZGRpbmc6MThweDtib3gtc2hhZG93OjAgMTZweCA0MnB4ICMwMDBifScrCiAgICAnI3Vwc3RhdHVzLWhpc3Rvcnl7cG9zaXRpb246YWJzb2x1dGU7Ym90dG9tOjU1cHg7cmlnaHQ6MDt3aWR0aDozNjVweDttYXgtd2lkdGg6Y2FsYygxMDB2dyAtIDMycHgpO2hlaWdodDo1MjBweDtib3gtc2l6aW5nOmJvcmRlci1ib3g7YmFja2dyb3VuZDojMTkyMTJlO2JvcmRlcjoxcHggc29saWQgIzM1NDI1ODtib3JkZXItcmFkaXVzOjE2cHg7cGFkZGluZzoxOHB4O2JveC1zaGFkb3c6MCAxNnB4IDQycHggIzAwMGI7b3ZlcmZsb3c6aGlkZGVuO2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW59JysKICAgICcjdXBzdGF0dXMtY2hhdHtwb3NpdGlvbjphYnNvbHV0ZTtib3R0b206NTVweDtyaWdodDowO3dpZHRoOjM2NXB4O21heC13aWR0aDpjYWxjKDEwMHZ3IC0gMzJweCk7aGVpZ2h0OjUyMHB4O2JveC1zaXppbmc6Ym9yZGVyLWJveDtiYWNrZ3JvdW5kOiMxOTIxMmU7Ym9yZGVyOjFweCBzb2xpZCAjMzU0MjU4O2JvcmRlci1yYWRpdXM6MTZweDtwYWRkaW5nOjE4cHg7Ym94LXNoYWRvdzowIDE2cHggNDJweCAjMDAwYjtvdmVyZmxvdzpoaWRkZW47ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbn0nKwogICAgJyN1cHN0YXR1cy1jYXJkLCN1cHN0YXR1cy1oaXN0b3J5LCN1cHN0YXR1cy1jaGF0e3Jlc2l6ZTpub25lO21pbi13aWR0aDozMjBweDttaW4taGVpZ2h0OjQyMHB4O21heC13aWR0aDpjYWxjKDEwMHZ3IC0gMzJweCk7bWF4LWhlaWdodDpjYWxjKDEwMHZoIC0gMzJweCl9JysKICAgICcjdXBzdGF0dXMtY2FyZC5oaWRkZW4sI3Vwc3RhdHVzLWhpc3RvcnkuaGlkZGVuLCN1cHN0YXR1cy1jaGF0LmhpZGRlbiwudXAtcmVhc29ucy5oaWRkZW4sLnVwLXNlbGVjdC5oaWRkZW4sLnVwLWlucHV0LmhpZGRlbiwudXAtY29uZmlybS5oaWRkZW4sLnVwLWhpc3RvcnktYnRuLmhpZGRlbntkaXNwbGF5Om5vbmV9JysKICAgICcudXAtaGVhZCwudXAtbWVtYmVyLXRvcCwudXAtaGlzdG9yeS1oZWFke2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjthbGlnbi1pdGVtczpjZW50ZXJ9JysKICAgICcudXAtdGl0bGUsLnVwLWhpc3RvcnktdGl0bGV7Zm9udC1zaXplOjE4cHg7Zm9udC13ZWlnaHQ6NzUwfScrCiAgICAnLnVwLXlvdSwudXAtcmVhc29ue2NvbG9yOiNhYWI2Yzk7Zm9udC1zaXplOjEycHg7bWFyZ2luLXRvcDo0cHh9JysKICAgICcudXAtYWN0aW9uc3tkaXNwbGF5OmZsZXg7Z2FwOjZweDthbGlnbi1pdGVtczpjZW50ZXI7cG9zaXRpb246cmVsYXRpdmV9LnVwLWNoYXQtYnRuLC51cC1sb2dvdXQsLnVwLWhpc3RvcnktYnRuLC51cC1jbG9zZSwudXAtc2V0dGluZ3MtYnRue2JvcmRlcjowO2JvcmRlci1yYWRpdXM6N3B4O3BhZGRpbmc6N3B4IDlweDtiYWNrZ3JvdW5kOiMyNzMyNDc7Y29sb3I6I2M2ZDFlMTtjdXJzb3I6cG9pbnRlcjtib3gtc2l6aW5nOmJvcmRlci1ib3g7aGVpZ2h0OjM0cHg7bWluLXdpZHRoOjM0cHh9LnVwLWxvZ291dHtiYWNrZ3JvdW5kOiMzYTI3MzA7Y29sb3I6I2ZmYjBiY30udXAtbG9nb3V0OmhvdmVye2JhY2tncm91bmQ6IzU0MzEzY30udXAtc2V0dGluZ3MtYnRue2Rpc3BsYXk6aW5saW5lLWZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXJ9LnVwLXNldHRpbmdzLWJ0biAudXAtaWNvbnt3aWR0aDoxN3B4O2hlaWdodDoxN3B4fS51cC1zZXR0aW5ncy1tZW51e3Bvc2l0aW9uOmFic29sdXRlO3JpZ2h0OjA7dG9wOjQycHg7d2lkdGg6MjEwcHg7cGFkZGluZzo4cHg7YmFja2dyb3VuZDojMTExNzIyO2JvcmRlcjoxcHggc29saWQgIzNhNDc1Yjtib3JkZXItcmFkaXVzOjEwcHg7Ym94LXNoYWRvdzowIDEycHggMzBweCAjMDAwOTt6LWluZGV4OjcwfS51cC1zZXR0aW5ncy1tZW51LmhpZGRlbntkaXNwbGF5Om5vbmV9LnVwLXNldHRpbmdzLW1lbnUgYnV0dG9ue3dpZHRoOjEwMCU7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O2JvcmRlcjowO2JvcmRlci1yYWRpdXM6N3B4O3BhZGRpbmc6OXB4O2JhY2tncm91bmQ6dHJhbnNwYXJlbnQ7Y29sb3I6I2RiZTVmNTt0ZXh0LWFsaWduOmxlZnQ7Y3Vyc29yOnBvaW50ZXI7Zm9udDppbmhlcml0O2ZvbnQtc2l6ZToxMnB4fS51cC1zZXR0aW5ncy1tZW51IGJ1dHRvbjpob3ZlcntiYWNrZ3JvdW5kOiMyNzMyNDd9LnVwLXNldHRpbmdzLW1lbnUgYnV0dG9uIC51cC1pY29ue3dpZHRoOjE2cHg7aGVpZ2h0OjE2cHh9LnVwLXNldHRpbmdzLW1lbnUgLnVwLXNldHRpbmdzLW5vdGlmaWNhdGlvbnMuZW5hYmxlZHtjb2xvcjojN2VmMGI2fS51cC1zZXR0aW5ncy1tZW51IC51cC1zZXR0aW5ncy1ub3RpZmljYXRpb25zLmRlbmllZHtjb2xvcjojZmY5YWFhfScrCiAgICAnLnVwLWNoYXQtYnRue3Bvc2l0aW9uOnJlbGF0aXZlO2JvcmRlcjowO2JvcmRlci1yYWRpdXM6N3B4O3BhZGRpbmc6N3B4IDlweDtiYWNrZ3JvdW5kOiMyNzMyNDc7Y29sb3I6I2M2ZDFlMTtjdXJzb3I6cG9pbnRlcn0udXAtY2hhdC1idG4ubHVjY2EtYWN0aXZle2JhY2tncm91bmQ6I2M1MmY0ODtjb2xvcjojZmZmO2FuaW1hdGlvbjp1cEx1Y2NhUHVsc2UgLjhzIGluZmluaXRlIGFsdGVybmF0ZX0udXAtbm90aWZpY2F0aW9uLWJ0bntib3JkZXI6MDtib3JkZXItcmFkaXVzOjdweDtwYWRkaW5nOjdweCA5cHg7YmFja2dyb3VuZDojMjczMjQ3O2NvbG9yOiNjNmQxZTE7Y3Vyc29yOnBvaW50ZXI7Ym94LXNpemluZzpib3JkZXItYm94O2hlaWdodDozNHB4O21pbi13aWR0aDozNHB4O2ZvbnQtc2l6ZToxNXB4O2xpbmUtaGVpZ2h0OjF9LnVwLW5vdGlmaWNhdGlvbi1idG4uZW5hYmxlZHtiYWNrZ3JvdW5kOiMxODRmM2E7Y29sb3I6IzdlZjBiNn0udXAtbm90aWZpY2F0aW9uLWJ0bi5kZW5pZWR7YmFja2dyb3VuZDojM2EyNzMwO2NvbG9yOiNmZjlhYWF9LnVwLWNoYXQtYnRuIC51cC1jaGF0LW5vdGlmeS1kb3R7cG9zaXRpb246YWJzb2x1dGU7cmlnaHQ6LTNweDt0b3A6LTNweDt3aWR0aDoxMHB4O2hlaWdodDoxMHB4O2JvcmRlci1yYWRpdXM6NTAlO2JhY2tncm91bmQ6I2ZmNGQ2Nztib3JkZXI6MnB4IHNvbGlkICMxOTIxMmU7ZGlzcGxheTpub25lfS51cC1jaGF0LWJ0biAudXAtY2hhdC1ub3RpZnktZG90LnNob3d7ZGlzcGxheTpibG9ja30udXAtYmFydWktbWFpbntwb3NpdGlvbjpyZWxhdGl2ZTt3aWR0aDozNHB4O2hlaWdodDozNHB4O3BhZGRpbmc6MDtib3JkZXI6MDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOiMyNzMyNDc7Y29sb3I6I2M2ZDFlMTtjdXJzb3I6cG9pbnRlcjtkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyfS51cC1iYXJ1aS1tYWluIC51cC1pY29ue3dpZHRoOjE3cHg7aGVpZ2h0OjE3cHh9LnVwLWJhcnVpLW1haW4uYWN0aXZlLC51cC1iYXJ1aS1tYWluLmluY29taW5ne2JhY2tncm91bmQ6I2M1MmY0ODtjb2xvcjojZmZmO2FuaW1hdGlvbjp1cGJhcnVpYnRuIC41NXMgaW5maW5pdGUgYWx0ZXJuYXRlfS51cC1iYXJ1aS1wb3B1cHtwb3NpdGlvbjphYnNvbHV0ZTtyaWdodDowO3RvcDo0MnB4O3dpZHRoOjIzMHB4O3BhZGRpbmc6MTBweDtiYWNrZ3JvdW5kOiMxMTE3MjI7Ym9yZGVyOjFweCBzb2xpZCAjM2E0NzViO2JvcmRlci1yYWRpdXM6MTBweDtib3gtc2hhZG93OjAgMTJweCAzMHB4ICMwMDA5O3otaW5kZXg6NjB9LnVwLWJhcnVpLXBvcHVwLmhpZGRlbntkaXNwbGF5Om5vbmV9LnVwLWJhcnVpLXBvcHVwLXRpdGxle2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0Ojc1MDtjb2xvcjojY2JkNWU0O21hcmdpbi1ib3R0b206N3B4fS51cC1iYXJ1aS1wb3B1cC1yb3d7ZGlzcGxheTpmbGV4O2dhcDo2cHh9LnVwLWJhcnVpLXBvcHVwIHNlbGVjdHtmbGV4OjE7bWluLXdpZHRoOjA7Ym9yZGVyOjFweCBzb2xpZCAjM2E0NzViO2JvcmRlci1yYWRpdXM6N3B4O2JhY2tncm91bmQ6IzE5MjEyZTtjb2xvcjojZWRmMmZiO3BhZGRpbmc6N3B4O2ZvbnQtc2l6ZToxMnB4fS51cC1iYXJ1aS1wb3B1cCBidXR0b257Ym9yZGVyOjA7Ym9yZGVyLXJhZGl1czo3cHg7YmFja2dyb3VuZDojYzUyZjQ4O2NvbG9yOiNmZmY7Zm9udC13ZWlnaHQ6NzUwO3BhZGRpbmc6N3B4IDlweDtjdXJzb3I6cG9pbnRlcn0udXAtYmFydWktcG9wdXAgYnV0dG9uOmRpc2FibGVke29wYWNpdHk6LjY7Y3Vyc29yOndhaXR9LnVwLWJhcnVpLXJvd3tkaXNwbGF5OmZsZXg7Z2FwOjdweDttYXJnaW4tdG9wOjhweH0udXAtYmFydWktc2VsZWN0e2ZsZXg6MTttaW4td2lkdGg6MDtib3JkZXI6MXB4IHNvbGlkICMzYTQ3NWI7Ym9yZGVyLXJhZGl1czo4cHg7YmFja2dyb3VuZDojMTExNzIyO2NvbG9yOiNlZGYyZmI7cGFkZGluZzo4cHh9LnVwLWJhcnVpLWJ0bntib3JkZXI6MDtib3JkZXItcmFkaXVzOjhweDtwYWRkaW5nOjhweCAxMXB4O2JhY2tncm91bmQ6I2E1MmEzYztjb2xvcjojZmZmO2ZvbnQtd2VpZ2h0OjgwMDtjdXJzb3I6cG9pbnRlcn0udXAtYmFydWktYnRuLmFjdGl2ZXtiYWNrZ3JvdW5kOiNkNjZiMWZ9LnVwLWJhcnVpLWhpbnR7Zm9udC1zaXplOjExcHg7Y29sb3I6IzhmOWRiMjttYXJnaW4tdG9wOjVweH0udXAtYmFydWktYWN0aXZle2FuaW1hdGlvbjp1cGJhcnVpIC41NXMgaW5maW5pdGUgYWx0ZXJuYXRlfUBrZXlmcmFtZXMgdXBiYXJ1aWJ0bntmcm9te3RyYW5zZm9ybTpzY2FsZSgxKTtib3gtc2hhZG93OjAgMCAwIDAgI2ZmMzM0ZjU1fXRve3RyYW5zZm9ybTpzY2FsZSgxLjA4KTtib3gtc2hhZG93OjAgMCAwIDdweCAjZmYzMzRmNTV9fUBrZXlmcmFtZXMgdXBiYXJ1aXtmcm9te2JveC1zaGFkb3c6MCA3cHggMjJweCAjMDAwOX10b3tib3gtc2hhZG93OjAgMCAwIDdweCAjZmYzMzRmNTUsMCA3cHggMjJweCAjMDAwOX19LnVwLWljb257ZGlzcGxheTppbmxpbmUtYmxvY2s7d2lkdGg6MTZweDtoZWlnaHQ6MTZweDt2ZXJ0aWNhbC1hbGlnbjotM3B4O2ZsZXg6MCAwIGF1dG99LnVwLWljb24td3JhcHtkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO3ZlcnRpY2FsLWFsaWduOm1pZGRsZX0udXAtaGlzdG9yeS1idG57Zm9udC1zaXplOjE3cHg7cGFkZGluZzo1cHggOHB4O2xpbmUtaGVpZ2h0OjF9LnVwLWhpc3RvcnktYnRuIC51cC1pY29ue3dpZHRoOjE4cHg7aGVpZ2h0OjE4cHh9LnVwLXNlbGVjdCwudXAtaGlzdG9yeS1saXN0LC51cC1oaXN0b3J5LWhlYWR7Zm9udC1mYW1pbHk6IlNlZ29lIFVJIixBcmlhbCxzYW5zLXNlcmlmfS51cC1yZWFzb24tcGlja2Vye3Bvc2l0aW9uOnJlbGF0aXZlfS51cC1yZWFzb24tdHJpZ2dlcnt3aWR0aDoxMDAlO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweDtwYWRkaW5nOjEwcHg7Ym9yZGVyLXJhZGl1czo4cHg7Ym9yZGVyOjFweCBzb2xpZCAjM2E0NzViO2JhY2tncm91bmQ6IzExMTcyMjtjb2xvcjojZWRmMmZiO2N1cnNvcjpwb2ludGVyO3RleHQtYWxpZ246bGVmdH0udXAtcmVhc29uLW1lbnV7cG9zaXRpb246YWJzb2x1dGU7ei1pbmRleDozMDtsZWZ0OjA7cmlnaHQ6MDttYXJnaW4tdG9wOjRweDtiYWNrZ3JvdW5kOiMxMTE3MjI7Ym9yZGVyOjFweCBzb2xpZCAjM2E0NzViO2JvcmRlci1yYWRpdXM6OHB4O3BhZGRpbmc6NHB4O2JveC1zaGFkb3c6MCAxMnB4IDMwcHggIzAwMDh9LnVwLXJlYXNvbi1tZW51LmhpZGRlbntkaXNwbGF5Om5vbmV9LnVwLXJlYXNvbi1vcHRpb257d2lkdGg6MTAwJTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHg7Ym9yZGVyOjA7YmFja2dyb3VuZDp0cmFuc3BhcmVudDtjb2xvcjojZWRmMmZiO3BhZGRpbmc6OXB4IDhweDtib3JkZXItcmFkaXVzOjZweDtjdXJzb3I6cG9pbnRlcjt0ZXh0LWFsaWduOmxlZnR9LnVwLXJlYXNvbi1vcHRpb246aG92ZXJ7YmFja2dyb3VuZDojMjczMjQ3fS51cC1yZWFzb24tdGV4dHtmbGV4OjF9LnVwLXN0YXR1cy1pY29uLm9ubGluZXtjb2xvcjojN2JlMWE3fS51cC1zdGF0dXMtaWNvbi5idXN5e2NvbG9yOiNmZjZiN2F9LnVwLXN0YXR1cy1pY29uLmF3YXl7Y29sb3I6I2M3ZDBkZn0udXAtZXhwb3J0e2hlaWdodDozNHB4O21pbi13aWR0aDozNHB4O2JveC1zaXppbmc6Ym9yZGVyLWJveDtkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2dhcDo1cHg7Ym9yZGVyOjA7Ym9yZGVyLXJhZGl1czo3cHg7cGFkZGluZzo3cHggOXB4O2JhY2tncm91bmQ6IzI3MzI0Nztjb2xvcjojYzZkMWUxO2N1cnNvcjpwb2ludGVyO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjcwMH0udXAtc3RhdHVzZXN7ZGlzcGxheTpmbGV4O2dhcDo3cHg7bWFyZ2luOjE2cHggMCAxMnB4fScrCgogICAgJy51cC1zdGF0dXN7Ym9yZGVyOjA7Ym9yZGVyLXJhZGl1czo4cHg7cGFkZGluZzo5cHg7Zm9udC13ZWlnaHQ6NzAwO2N1cnNvcjpwb2ludGVyfS5vbmxpbmV7YmFja2dyb3VuZDojMTczZjJiO2NvbG9yOiM3YmUxYTd9LmJ1c3l7YmFja2dyb3VuZDojNGQxYjI1O2NvbG9yOiNmZjZiN2F9LmF3YXl7YmFja2dyb3VuZDojMzAzOTQ5O2NvbG9yOiNjN2QwZGZ9JysKICAgICcudXAtbGFiZWx7ZGlzcGxheTpibG9jazttYXJnaW4tYm90dG9tOjZweDtmb250LXdlaWdodDo2NTB9LnVwLXNlbGVjdCwudXAtaW5wdXR7d2lkdGg6MTAwJTtwYWRkaW5nOjEwcHg7Ym9yZGVyLXJhZGl1czo4cHg7Ym9yZGVyOjFweCBzb2xpZCAjM2E0NzViO2JhY2tncm91bmQ6IzExMTcyMjtjb2xvcjojZWRmMmZifS51cC1pbnB1dHttYXJnaW4tdG9wOjdweH0nKwogICAgJy51cC1jb25maXJte21hcmdpbi10b3A6N3B4O3dpZHRoOjEwMCU7Ym9yZGVyOjA7Ym9yZGVyLXJhZGl1czo4cHg7cGFkZGluZzo5cHg7YmFja2dyb3VuZDojNGY3ZGZmO2NvbG9yOiNmZmY7Zm9udC13ZWlnaHQ6NzAwO2N1cnNvcjpwb2ludGVyfScrCiAgICAnLnVwLW1lc3NhZ2V7bWluLWhlaWdodDoyMHB4O2ZvbnQtc2l6ZToxMnB4O2NvbG9yOiNmZjg0OTk7bWFyZ2luLXRvcDo4cHh9LnVwLW5vdGljZXttYXJnaW46MTBweCAwO3BhZGRpbmc6OXB4O2JvcmRlci1yYWRpdXM6OHB4O2JhY2tncm91bmQ6IzE3M2YyYjtjb2xvcjojOWNlNWI4O2ZvbnQtc2l6ZToxMnB4fScrCiAgICAnLnVwLXRlYW0tdGl0bGV7Zm9udC13ZWlnaHQ6NzUwO21hcmdpbjoxM3B4IDAgN3B4fS51cC1tZW1iZXJ7cGFkZGluZzo5cHggMDtib3JkZXItYm90dG9tOjFweCBzb2xpZCAjMzAzYjRkfS51cC1tZW1iZXI6bGFzdC1jaGlsZHtib3JkZXI6MH0udXAtYmFkZ2V7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NzAwO2JvcmRlci1yYWRpdXM6MTJweDtwYWRkaW5nOjNweCA2cHh9LmItb25saW5le2JhY2tncm91bmQ6IzE3M2YyYjtjb2xvcjojN2JlMWE3fS5iLWJ1c3l7YmFja2dyb3VuZDojNGQxYjI1O2NvbG9yOiNmZjZiN2F9LmItYXdheSwuYi1vZmZsaW5le2JhY2tncm91bmQ6IzMwMzk0OTtjb2xvcjojYzdkMGRmfS51cC10aW1le2ZvbnQtc2l6ZToxMXB4O2NvbG9yOiM4MzkwYTQ7bWFyZ2luLXRvcDo0cHh9JysKICAgICcudXAtY2hhdC1sdWNjYS1hbGVydHtmbGV4OjAgMCBhdXRvO3Bvc2l0aW9uOnJlbGF0aXZlO3otaW5kZXg6MjA7bWFyZ2luLXRvcDo4cHg7cGFkZGluZzo5cHggMTJweDtib3JkZXI6MXB4IHNvbGlkICNhOTJlNDM7Ym9yZGVyLXJhZGl1czo5cHg7YmFja2dyb3VuZDojMzUxNzI0O2NvbG9yOiNmZjlhYWE7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6ODUwO2xldHRlci1zcGFjaW5nOi4ycHg7Ym94LXNoYWRvdzowIDRweCAxNHB4ICMwMDA1fS51cC1jaGF0LWx1Y2NhLWFsZXJ0LmhpZGRlbntkaXNwbGF5Om5vbmV9LnVwLWNoYXQtc3lzdGVtLWV2ZW50e2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO3BhZGRpbmc6OHB4IDAgNnB4fS51cC1jaGF0LXN5c3RlbS1ldmVudCBzcGFue3BhZGRpbmc6NnB4IDEwcHg7Ym9yZGVyLXJhZGl1czo5OTlweDtiYWNrZ3JvdW5kOiMyNTJlM2M7Ym9yZGVyOjFweCBzb2xpZCAjM2E0NzViO2NvbG9yOiNhZWJiZDA7Zm9udC1zaXplOjEwcHg7Zm9udC13ZWlnaHQ6ODAwO3RleHQtYWxpZ246Y2VudGVyfS51cC1jaGF0LXN5c3RlbS1ldmVudC5qb2luIHNwYW57YmFja2dyb3VuZDojMzUxNzI0O2JvcmRlci1jb2xvcjojN2MyYTNlO2NvbG9yOiNmZjlhYWF9LnVwLWNoYXQtbGlzdHtoZWlnaHQ6YXV0bztmbGV4OjE7bWluLWhlaWdodDowO292ZXJmbG93LXk6YXV0bztvdmVyZmxvdy14OmhpZGRlbjttYXJnaW4tdG9wOjEycHg7bWFyZ2luLXJpZ2h0Oi0xOHB4O21hcmdpbi1sZWZ0Oi01cHg7cGFkZGluZy1yaWdodDoxOHB4O3BhZGRpbmctbGVmdDo1cHg7c2Nyb2xsYmFyLXdpZHRoOnRoaW47c2Nyb2xsYmFyLWNvbG9yOnJnYmEoMTM5LDE0OSwxNjQsLjM1KSB0cmFuc3BhcmVudH0udXAtY2hhdC1saXN0Ojotd2Via2l0LXNjcm9sbGJhcnt3aWR0aDo2cHh9LnVwLWNoYXQtbGlzdDo6LXdlYmtpdC1zY3JvbGxiYXItdHJhY2t7YmFja2dyb3VuZDp0cmFuc3BhcmVudH0udXAtY2hhdC1saXN0Ojotd2Via2l0LXNjcm9sbGJhci10aHVtYntiYWNrZ3JvdW5kOnJnYmEoMTM5LDE0OSwxNjQsLjMwKTtib3JkZXItcmFkaXVzOjk5OXB4fS51cC1jaGF0LWxpc3Q6Oi13ZWJraXQtc2Nyb2xsYmFyLXRodW1iOmhvdmVye2JhY2tncm91bmQ6cmdiYSgxMzksMTQ5LDE2NCwuNTApfS51cC1jaGF0LWl0ZW17cG9zaXRpb246cmVsYXRpdmU7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmZsZXgtZW5kO2dhcDo3cHg7cGFkZGluZzo2cHggMH0udXAtY2hhdC1pdGVtLm93bntmbGV4LWRpcmVjdGlvbjpyb3ctcmV2ZXJzZTtjdXJzb3I6Y29udGV4dC1tZW51fS51cC1jaGF0LWF2YXRhcnt3aWR0aDoyOHB4O2hlaWdodDoyOHB4O2ZsZXg6MCAwIDI4cHg7Ym9yZGVyLXJhZGl1czo1MCU7b2JqZWN0LWZpdDpjb3ZlcjtiYWNrZ3JvdW5kOiMyNzMyNDc7Ym9yZGVyOjJweCBzb2xpZCB0cmFuc3BhcmVudDtib3gtc2l6aW5nOmJvcmRlci1ib3h9LnVwLWNoYXQtYXZhdGFyLnVwLWNoYXQtcHJlc2VuY2UtaWRsZXtib3JkZXItY29sb3I6IzYyYTdmZjtib3gtc2hhZG93OjAgMCA3cHggcmdiYSg4MywxNTUsMjU1LC42KX0udXAtY2hhdC1hdmF0YXIudXAtY2hhdC1wcmVzZW5jZS1hY3RpdmV7Ym9yZGVyLWNvbG9yOiM1NWU1OGI7YW5pbWF0aW9uOnVwQ2hhdFByZXNlbmNlUHVsc2UgMS45cyBlYXNlLWluLW91dCBpbmZpbml0ZX1Aa2V5ZnJhbWVzIHVwQ2hhdFByZXNlbmNlUHVsc2V7MCUsMTAwJXtib3gtc2hhZG93OjAgMCAwIDAgcmdiYSg4MiwyMjQsMTM3LC4xMiksMCAwIDdweCByZ2JhKDgyLDIyNCwxMzcsLjYyKX01MCV7Ym94LXNoYWRvdzowIDAgMCAxcHggcmdiYSg4MiwyMjQsMTM3LC4yOCksMCAwIDEwcHggcmdiYSg4MiwyMjQsMTM3LC43Mil9fS51cC1jaGF0LWJ1YmJsZXtwb3NpdGlvbjpyZWxhdGl2ZTttYXgtd2lkdGg6NzglO21pbi13aWR0aDo1MnB4O3BhZGRpbmc6N3B4IDlweDtib3JkZXItcmFkaXVzOjEycHggMTJweCAxMnB4IDNweDtiYWNrZ3JvdW5kOiMyNzMyNDc7Y29sb3I6I2U3ZWRmNztib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNoYWRvdzowIDNweCAxMHB4ICMwMDAzfS51cC1jaGF0LWl0ZW0ub3duIC51cC1jaGF0LWJ1YmJsZXtib3JkZXItcmFkaXVzOjEycHggMTJweCAzcHggMTJweDtiYWNrZ3JvdW5kOiMzMTU5YmR9LnVwLWNoYXQtaXRlbS5sdWNjYSAudXAtY2hhdC1idWJibGV7YmFja2dyb3VuZDpyZ2JhKDEwNiwxOCwzOSwuNDgpO2JvcmRlcjoxcHggc29saWQgcmdiYSgyNTUsNzYsMTA4LC40OCk7YmFja2Ryb3AtZmlsdGVyOmJsdXIoMTJweCk7LXdlYmtpdC1iYWNrZHJvcC1maWx0ZXI6Ymx1cigxMnB4KTtib3gtc2hhZG93OjAgNHB4IDE4cHggcmdiYSgyNTUsNDUsODIsLjEyKSxpbnNldCAwIDFweCAwIHJnYmEoMjU1LDI1NSwyNTUsLjA3KX0udXAtY2hhdC1pdGVtLmx1Y2NhIC51cC1jaGF0LW1ldGEgYntjb2xvcjojZmY5MWE3fS51cC1jaGF0LWl0ZW0ubHVjY2EgLnVwLWNoYXQtdGV4dHtjb2xvcjojZmZlOWVlfS51cC1jaGF0LXN5c3RlbS1ldmVudC5jbGVhciBzcGFue2JhY2tncm91bmQ6IzI3MzI0Nztib3JkZXItY29sb3I6IzRmN2RmZjtjb2xvcjojYTljMmZmfS51cC1jaGF0LXBob3Rve2N1cnNvcjp6b29tLWlufS51cC1jaGF0LWxpZ2h0Ym94e3Bvc2l0aW9uOmZpeGVkO2luc2V0OjA7ei1pbmRleDoyMTQ3NDgzNjQ3O2JhY2tncm91bmQ6cmdiYSg1LDgsMTMsLjg4KTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7cGFkZGluZzoyOHB4O2JveC1zaXppbmc6Ym9yZGVyLWJveDtiYWNrZHJvcC1maWx0ZXI6Ymx1cig4cHgpOy13ZWJraXQtYmFja2Ryb3AtZmlsdGVyOmJsdXIoOHB4KX0udXAtY2hhdC1saWdodGJveC5oaWRkZW57ZGlzcGxheTpub25lfS51cC1jaGF0LWxpZ2h0Ym94IGltZ3ttYXgtd2lkdGg6OTJ2dzttYXgtaGVpZ2h0Ojkwdmg7d2lkdGg6YXV0bztoZWlnaHQ6YXV0bztvYmplY3QtZml0OmNvbnRhaW47Ym9yZGVyLXJhZGl1czoxMnB4O2JveC1zaGFkb3c6MCAyMHB4IDcwcHggIzAwMGI7Ym9yZGVyOjFweCBzb2xpZCAjNTI2MjdifS51cC1jaGF0LWxpZ2h0Ym94LWNsb3Nle3Bvc2l0aW9uOmFic29sdXRlO3JpZ2h0OjIycHg7dG9wOjE4cHg7d2lkdGg6MzhweDtoZWlnaHQ6MzhweDtib3JkZXI6MDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOnJnYmEoMzksNTAsNzEsLjkpO2NvbG9yOiNmZmY7Zm9udC1zaXplOjI1cHg7bGluZS1oZWlnaHQ6MzhweDtjdXJzb3I6cG9pbnRlcn0udXAtY2hhdC1saWdodGJveC1jbG9zZTpob3ZlcntiYWNrZ3JvdW5kOiM0ZjVlNzV9LnVwLWNoYXQtbWV0YXtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo3cHg7Zm9udC1zaXplOjEwcHg7Y29sb3I6IzllYWJjMH0udXAtY2hhdC1tZXRhIGJ7Zm9udC13ZWlnaHQ6NzUwO2NvbG9yOiNjYmQ1ZTR9LnVwLWNoYXQtaXRlbS5vd24gLnVwLWNoYXQtbWV0YXtqdXN0aWZ5LWNvbnRlbnQ6ZmxleC1lbmR9LnVwLWNoYXQtcmVhZHtmb250LXNpemU6MTFweDtjb2xvcjojYWViYmQwO21hcmdpbi1sZWZ0OjRweDtjdXJzb3I6aGVscDt1c2VyLXNlbGVjdDpub25lfS51cC1jaGF0LXJlYWQucmVhZHtjb2xvcjojNjNhMmZmfS51cC1jaGF0LW93bi1tZXRhe3RleHQtYWxpZ246cmlnaHQ7bWluLWhlaWdodDoxM3B4fS51cC1jaGF0LXByb2ZpbGUtYnRue3dpZHRoOjM0cHg7aGVpZ2h0OjM0cHg7cGFkZGluZzowO2JvcmRlcjowO2JvcmRlci1yYWRpdXM6NTAlO2JhY2tncm91bmQ6IzI3MzI0NztjdXJzb3I6cG9pbnRlcjtvdmVyZmxvdzpoaWRkZW59LnVwLWNoYXQtcHJvZmlsZS1idG4gaW1ne3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCU7b2JqZWN0LWZpdDpjb3ZlcjtkaXNwbGF5OmJsb2NrfS51cC1jaGF0LXRpdGxlLXdyYXB7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4fS51cC1jaGF0LXByb2ZpbGUtbW9kYWx7cG9zaXRpb246Zml4ZWQ7aW5zZXQ6MDt6LWluZGV4OjIxNDc0ODM2NDc7YmFja2dyb3VuZDpyZ2JhKDAsMCwwLC42Mik7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO3BhZGRpbmc6MjBweDtib3gtc2l6aW5nOmJvcmRlci1ib3h9LnVwLWNoYXQtcHJvZmlsZS1tb2RhbC5oaWRkZW57ZGlzcGxheTpub25lfS51cC1jaGF0LXByb2ZpbGUtZGlhbG9ne3dpZHRoOm1pbigzMzBweCxjYWxjKDEwMHZ3IC0gNDBweCkpO3BhZGRpbmc6MThweDtib3JkZXI6MXB4IHNvbGlkICM0MDUwNmE7Ym9yZGVyLXJhZGl1czoxNHB4O2JhY2tncm91bmQ6IzE4MjEzMDtib3gtc2hhZG93OjAgMThweCA0NXB4ICMwMDBifS51cC1jaGF0LXByb2ZpbGUtcHJldmlld3t3aWR0aDo4NHB4O2hlaWdodDo4NHB4O21hcmdpbjowIGF1dG8gMTJweDtib3JkZXItcmFkaXVzOjUwJTtvYmplY3QtZml0OmNvdmVyO2JhY2tncm91bmQ6IzI3MzI0Nztib3JkZXI6MnB4IHNvbGlkICM0MDUwNmE7ZGlzcGxheTpibG9ja30udXAtY2hhdC1wcm9maWxlLWZpbGV7d2lkdGg6MTAwJTttYXJnaW46OHB4IDA7Y29sb3I6I2NiZDVlNDtmb250LXNpemU6MTJweH0udXAtY2hhdC1wcm9maWxlLWFjdGlvbnN7ZGlzcGxheTpmbGV4O2dhcDo3cHh9LnVwLWNoYXQtcHJvZmlsZS1hY3Rpb25zIGJ1dHRvbntmbGV4OjE7Ym9yZGVyOjA7Ym9yZGVyLXJhZGl1czo4cHg7cGFkZGluZzo5cHg7Y3Vyc29yOnBvaW50ZXI7Zm9udC13ZWlnaHQ6NzUwfS51cC1jaGF0LXByb2ZpbGUtc2F2ZXtiYWNrZ3JvdW5kOiM0ZjdkZmY7Y29sb3I6I2ZmZn0udXAtY2hhdC1wcm9maWxlLWNhbmNlbHtiYWNrZ3JvdW5kOiMyNzMyNDc7Y29sb3I6I2NiZDVlNH0udXAtY2hhdC1wcm9maWxlLW1lc3NhZ2V7bWluLWhlaWdodDoxOHB4O2ZvbnQtc2l6ZToxMXB4O2NvbG9yOiNmZjlhYWE7bWFyZ2luOjdweCAwfS51cC1kZWxldGUtYWN0aW9ue3Bvc2l0aW9uOmFic29sdXRlO3JpZ2h0OjRweDt0b3A6MjhweDtib3JkZXI6MXB4IHNvbGlkICM0YTU2NmI7Ym9yZGVyLXJhZGl1czo2cHg7YmFja2dyb3VuZDojMjczMjQ3O2NvbG9yOiNmZjlhYWE7cGFkZGluZzo0cHggN3B4O2ZvbnQ6NzAwIDExcHggU2Vnb2UgVUksQXJpYWwsc2Fucy1zZXJpZjtjdXJzb3I6cG9pbnRlcjtib3gtc2hhZG93OjAgNXB4IDE0cHggIzAwMDY7ei1pbmRleDo1fS51cC1kZWxldGUtYWN0aW9uOmhvdmVye2JhY2tncm91bmQ6IzNhMjUzMDtjb2xvcjojZmZiNWMxfS51cC1kZWxldGUtYWN0aW9uLmhpZGRlbntkaXNwbGF5Om5vbmV9LnVwLWNoYXQtbWV0YXtkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47Z2FwOjhweDtmb250LXNpemU6MTFweDtjb2xvcjojOGZhMGI4fS51cC1jaGF0LXRleHR7Zm9udC1zaXplOjEzcHg7Y29sb3I6I2U3ZWRmNzt3aGl0ZS1zcGFjZTpwcmUtd3JhcDt3b3JkLWJyZWFrOmJyZWFrLXdvcmQ7bWFyZ2luLXRvcDo0cHh9LnVwLWNoYXQtdHlwaW5ne2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjdweDttaW4taGVpZ2h0OjI4cHg7bWFyZ2luOjJweCAwIDNweCAzNXB4O2NvbG9yOiM5ZWFiYzA7Zm9udC1zaXplOjEwcHh9LnVwLWNoYXQtdHlwaW5nLmhpZGRlbntkaXNwbGF5Om5vbmV9LnVwLWNoYXQtdHlwaW5nLWF2YXRhcnt3aWR0aDoyMnB4O2hlaWdodDoyMnB4O2JvcmRlci1yYWRpdXM6NTAlO29iamVjdC1maXQ6Y292ZXI7Ym9yZGVyOjFweCBzb2xpZCAjM2E0NzViO2JhY2tncm91bmQ6IzI3MzI0N30udXAtY2hhdC10eXBpbmctZG90c3tkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6M3B4O3BhZGRpbmc6NXB4IDdweDtib3JkZXItcmFkaXVzOjEwcHggMTBweCAxMHB4IDNweDtiYWNrZ3JvdW5kOiMyNzMyNDd9LnVwLWNoYXQtdHlwaW5nLWRvdHMgaXt3aWR0aDo0cHg7aGVpZ2h0OjRweDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOiNhZWJiZDA7YW5pbWF0aW9uOnVwVHlwaW5nIDFzIGluZmluaXRlIGVhc2UtaW4tb3V0fS51cC1jaGF0LXR5cGluZy1kb3RzIGk6bnRoLWNoaWxkKDIpe2FuaW1hdGlvbi1kZWxheTouMTVzfS51cC1jaGF0LXR5cGluZy1kb3RzIGk6bnRoLWNoaWxkKDMpe2FuaW1hdGlvbi1kZWxheTouM3N9QGtleWZyYW1lcyB1cFR5cGluZ3swJSw2MCUsMTAwJXt0cmFuc2Zvcm06dHJhbnNsYXRlWSgwKTtvcGFjaXR5Oi40NX0zMCV7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoLTNweCk7b3BhY2l0eToxfX0udXAtbWVtYmVyLXRvcHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo3cHh9LnVwLW1lbWJlci1pZGVudGl0eXtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo2cHg7ZmxleDoxO21pbi13aWR0aDowfS51cC1tZW1iZXItaWRlbnRpdHkgYnttaW4td2lkdGg6MDtvdmVyZmxvdzpoaWRkZW47dGV4dC1vdmVyZmxvdzplbGxpcHNpczt3aGl0ZS1zcGFjZTpub3dyYXB9LnVwLW1lbWJlci12ZXJzaW9ue2ZvbnQtc2l6ZToxMHB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjojOGZhMGI4O2JhY2tncm91bmQ6IzIyMmQzZDtib3JkZXI6MXB4IHNvbGlkICMzNDQxNTg7Ym9yZGVyLXJhZGl1czo5OTlweDtwYWRkaW5nOjJweCA1cHg7d2hpdGUtc3BhY2U6bm93cmFwfS51cC1tZW1iZXItcHJlc2VuY2V7d2lkdGg6OHB4O2hlaWdodDo4cHg7Ym9yZGVyLXJhZGl1czo1MCU7ZmxleDowIDAgOHB4O2JhY2tncm91bmQ6IzQ2NTA1Zjtib3gtc2hhZG93OjAgMCAwIDJweCByZ2JhKDcwLDgwLDk1LC4xMil9LnVwLW1lbWJlci1wcmVzZW5jZS5vbmxpbmV7YmFja2dyb3VuZDojNTc5Y2ZmO2JveC1zaGFkb3c6MCAwIDdweCByZ2JhKDg3LDE1NiwyNTUsLjU1KX0udXAtbWVtYmVyLXByZXNlbmNlLmNoYXR7YmFja2dyb3VuZDojNTFkZjg4O2JveC1zaGFkb3c6MCAwIDdweCByZ2JhKDgxLDIyMywxMzYsLjU4KX0udXAtbWVtYmVyLXByZXNlbmNlLm9mZmxpbmV7YmFja2dyb3VuZDojNDY1MDVmO2JveC1zaGFkb3c6bm9uZX0udXAtbWVtYmVyLWJhcnVpe3dpZHRoOjI4cHg7aGVpZ2h0OjI4cHg7cGFkZGluZzowO2JvcmRlcjowO2JvcmRlci1yYWRpdXM6NTAlO2JhY2tncm91bmQ6IzI3MzI0Nztjb2xvcjojYzZkMWUxO2N1cnNvcjpwb2ludGVyO2Rpc3BsYXk6aW5saW5lLWZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7ZmxleDowIDAgYXV0b30udXAtbWVtYmVyLWJhcnVpIC51cC1pY29ue3dpZHRoOjE1cHg7aGVpZ2h0OjE1cHh9LnVwLW1lbWJlci1iYXJ1aTpob3ZlcntiYWNrZ3JvdW5kOiMzNjQ0NWJ9LnVwLW1lbWJlci1iYXJ1aS5hY3RpdmV7YmFja2dyb3VuZDojYzUyZjQ4O2NvbG9yOiNmZmY7YW5pbWF0aW9uOnVwYmFydWlidG4gLjU1cyBpbmZpbml0ZSBhbHRlcm5hdGV9LnVwLW1lbWJlci1iYXJ1aTpkaXNhYmxlZHtvcGFjaXR5Oi41NTtjdXJzb3I6d2FpdH0udXAtbWVtYmVyLXBvd2Vye3dpZHRoOjI4cHg7aGVpZ2h0OjI4cHg7cGFkZGluZzowO2JvcmRlcjowO2JvcmRlci1yYWRpdXM6NTAlO2JhY2tncm91bmQ6IzI3MzI0Nztjb2xvcjojYzZkMWUxO2N1cnNvcjpwb2ludGVyO2Rpc3BsYXk6aW5saW5lLWZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7ZmxleDowIDAgYXV0b30udXAtbWVtYmVyLXBvd2VyIC51cC1pY29ue3dpZHRoOjE1cHg7aGVpZ2h0OjE1cHh9LnVwLW1lbWJlci1wb3dlcjpob3ZlcntiYWNrZ3JvdW5kOiMzYjQ2NWI7Y29sb3I6I2ZmZn0udXAtbWVtYmVyLXBvd2VyOmRpc2FibGVke29wYWNpdHk6LjU1O2N1cnNvcjp3YWl0fS51cC1yZW1vdGUtb3ZlcmxheXtwb3NpdGlvbjphYnNvbHV0ZTtpbnNldDowO3otaW5kZXg6MTAwO2JhY2tncm91bmQ6cmdiYSgxMCwxNSwyNCwuNjgpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtwYWRkaW5nOjE4cHg7Ym94LXNpemluZzpib3JkZXItYm94O2JvcmRlci1yYWRpdXM6MTZweH0udXAtcmVtb3RlLW92ZXJsYXkuaGlkZGVue2Rpc3BsYXk6bm9uZX0udXAtcmVtb3RlLWRpYWxvZ3t3aWR0aDoxMDAlO21heC13aWR0aDozMTVweDtiYWNrZ3JvdW5kOiMxODIxMzA7Ym9yZGVyOjFweCBzb2xpZCAjNDA1MDZhO2JvcmRlci1yYWRpdXM6MTRweDtwYWRkaW5nOjE0cHg7Ym94LXNpemluZzpib3JkZXItYm94O2JveC1zaGFkb3c6MCAxOHB4IDQ1cHggIzAwMGJ9LnVwLXJlbW90ZS10aXRsZXtmb250LXNpemU6MTVweDtmb250LXdlaWdodDo4MDB9LnVwLXJlbW90ZS1zdWJ7Zm9udC1zaXplOjExcHg7Y29sb3I6IzlhYThiYzttYXJnaW4tdG9wOjNweH0udXAtcmVtb3RlLXN0YXR1c2Vze2Rpc3BsYXk6ZmxleDtnYXA6NnB4O21hcmdpbi10b3A6MTJweH0udXAtcmVtb3RlLXN0YXR1c3tmbGV4OjE7Ym9yZGVyOjFweCBzb2xpZCAjM2E0NzViO2JvcmRlci1yYWRpdXM6OHB4O3BhZGRpbmc6OXB4IDZweDtiYWNrZ3JvdW5kOiMxMTE3MjI7Y29sb3I6I2RjZTVmMjtjdXJzb3I6cG9pbnRlcjtmb250OjcwMCAxMnB4IFNlZ29lIFVJLEFyaWFsLHNhbnMtc2VyaWZ9LnVwLXJlbW90ZS1zdGF0dXM6aG92ZXIsLnVwLXJlbW90ZS1zdGF0dXMuYWN0aXZle2JhY2tncm91bmQ6IzMwNDA1Yjtib3JkZXItY29sb3I6IzViN2ZjOH0udXAtcmVtb3RlLXJlYXNvbnttYXJnaW4tdG9wOjlweH0udXAtcmVtb3RlLXJlYXNvbi5oaWRkZW57ZGlzcGxheTpub25lfS51cC1yZW1vdGUtcmVhc29uLW1lbnV7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjtnYXA6M3B4fS51cC1yZW1vdGUtcmVhc29uLW9wdGlvbntib3JkZXI6MDtiYWNrZ3JvdW5kOiMxMTE3MjI7Y29sb3I6I2RjZTVmMjtib3JkZXItcmFkaXVzOjdweDtwYWRkaW5nOjhweDt0ZXh0LWFsaWduOmxlZnQ7Y3Vyc29yOnBvaW50ZXI7Zm9udDoxMnB4IFNlZ29lIFVJLEFyaWFsLHNhbnMtc2VyaWZ9LnVwLXJlbW90ZS1yZWFzb24tb3B0aW9uOmhvdmVyLC51cC1yZW1vdGUtcmVhc29uLW9wdGlvbi5hY3RpdmV7YmFja2dyb3VuZDojMzA0MDVifS51cC1yZW1vdGUtYWN0aW9uc3tkaXNwbGF5OmZsZXg7Z2FwOjdweDttYXJnaW4tdG9wOjEycHh9LnVwLXJlbW90ZS1hY3Rpb25zIGJ1dHRvbntmbGV4OjE7Ym9yZGVyOjA7Ym9yZGVyLXJhZGl1czo4cHg7cGFkZGluZzo5cHg7Zm9udDo4MDAgMTJweCBTZWdvZSBVSSxBcmlhbCxzYW5zLXNlcmlmO2N1cnNvcjpwb2ludGVyfS51cC1yZW1vdGUtY2FuY2Vse2JhY2tncm91bmQ6IzI3MzI0Nztjb2xvcjojY2JkNWU0fS51cC1yZW1vdGUtY29uZmlybXtiYWNrZ3JvdW5kOiM0ZjdkZmY7Y29sb3I6I2ZmZn0udXAtcmVtb3RlLWNvbmZpcm06ZGlzYWJsZWR7b3BhY2l0eTouNTU7Y3Vyc29yOndhaXR9LnVwLXJlbW90ZS1tZXNzYWdle21pbi1oZWlnaHQ6MThweDttYXJnaW4tdG9wOjdweDtmb250LXNpemU6MTFweDtjb2xvcjojZmY5YWFhfS51cC1jaGF0LXRleHR7Zm9udC1zaXplOjEzcHg7Y29sb3I6I2U3ZWRmNzt3aGl0ZS1zcGFjZTpwcmUtd3JhcDt3b3JkLWJyZWFrOmJyZWFrLXdvcmQ7bWFyZ2luLXRvcDo0cHh9LnVwLWNoYXQtcGhvdG97ZGlzcGxheTpibG9jazttYXgtd2lkdGg6MjYwcHg7bWF4LWhlaWdodDoyMTBweDt3aWR0aDphdXRvO2hlaWdodDphdXRvO21hcmdpbi10b3A6NnB4O2JvcmRlcjoxcHggc29saWQgIzNhNDc1Yjtib3JkZXItcmFkaXVzOjlweDtiYWNrZ3JvdW5kOiMxMTE3MjI7Y3Vyc29yOnpvb20taW47b2JqZWN0LWZpdDpjb250YWluO2JveC1zaGFkb3c6MCA0cHggMTRweCAjMDAwNH0udXAtY2hhdC1tZWRpYXtkaXNwbGF5OmJsb2NrO21heC13aWR0aDoyMjBweDttYXgtaGVpZ2h0OjE1MHB4O21hcmdpbi10b3A6NnB4O2JvcmRlcjoxcHggc29saWQgIzNhNDc1Yjtib3JkZXItcmFkaXVzOjlweDtiYWNrZ3JvdW5kOiMxMTE3MjI7b2JqZWN0LWZpdDpjb250YWluO2JveC1zaGFkb3c6MCA0cHggMTRweCAjMDAwNH0udXAtY2hhdC1tZWRpYS12aWRlb3t3aWR0aDoyMjBweDtoZWlnaHQ6MTUwcHh9LnVwLWNoYXQtcHJvZmlsZS1ob3Zlcntwb3NpdGlvbjpmaXhlZDt6LWluZGV4OjIxNDc0ODM2NDc7ZGlzcGxheTpub25lO3dpZHRoOjE0OHB4O3BhZGRpbmc6MTBweDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyOjFweCBzb2xpZCAjNTI2MjdiO2JvcmRlci1yYWRpdXM6MTJweDtiYWNrZ3JvdW5kOiMxODIxMzA7Ym94LXNoYWRvdzowIDE0cHggNDBweCAjMDAwYjtwb2ludGVyLWV2ZW50czpub25lO3RleHQtYWxpZ246Y2VudGVyfS51cC1jaGF0LXByb2ZpbGUtaG92ZXIuc2hvd3tkaXNwbGF5OmJsb2NrfS51cC1jaGF0LXByb2ZpbGUtaG92ZXIgaW1ne2Rpc3BsYXk6YmxvY2s7d2lkdGg6OTZweDtoZWlnaHQ6OTZweDttYXJnaW46MCBhdXRvIDdweDtib3JkZXItcmFkaXVzOjUwJTtvYmplY3QtZml0OmNvdmVyO2JvcmRlcjoycHggc29saWQgdHJhbnNwYXJlbnQ7YmFja2dyb3VuZDojMjczMjQ3fS51cC1jaGF0LXByb2ZpbGUtaG92ZXIgaW1nLnVwLWNoYXQtcHJlc2VuY2UtaWRsZXtib3JkZXItY29sb3I6IzYyYTdmZjtib3gtc2hhZG93OjAgMCA4cHggcmdiYSg4MywxNTUsMjU1LC42Mil9LnVwLWNoYXQtcHJvZmlsZS1ob3ZlciBpbWcudXAtY2hhdC1wcmVzZW5jZS1hY3RpdmV7Ym9yZGVyLWNvbG9yOiM1NWU1OGI7YW5pbWF0aW9uOnVwUHJvZmlsZVByZXNlbmNlUHVsc2UgMS45cyBlYXNlLWluLW91dCBpbmZpbml0ZX1Aa2V5ZnJhbWVzIHVwUHJvZmlsZVByZXNlbmNlUHVsc2V7MCUsMTAwJXtib3gtc2hhZG93OjAgMCAwIDAgcmdiYSg4MiwyMjQsMTM3LC4xMiksMCAwIDdweCByZ2JhKDgyLDIyNCwxMzcsLjYyKX01MCV7Ym94LXNoYWRvdzowIDAgMCAxcHggcmdiYSg4MiwyMjQsMTM3LC4yOCksMCAwIDEwcHggcmdiYSg4MiwyMjQsMTM3LC43Mil9fS51cC1jaGF0LXByb2ZpbGUtaG92ZXItbmFtZXtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3NTA7Y29sb3I6I2U3ZWRmNzt3aGl0ZS1zcGFjZTpub3dyYXA7b3ZlcmZsb3c6aGlkZGVuO3RleHQtb3ZlcmZsb3c6ZWxsaXBzaXN9LnVwLWNoYXQtcHJvZmlsZS1ob3Zlci1yb2xle2ZvbnQtc2l6ZToxMHB4O2NvbG9yOiM5ZWFiYzA7bWFyZ2luLXRvcDoycHg7d2hpdGUtc3BhY2U6bm93cmFwO292ZXJmbG93OmhpZGRlbjt0ZXh0LW92ZXJmbG93OmVsbGlwc2lzfS51cC1jaGF0LWNvbXBvc2V7cG9zaXRpb246cmVsYXRpdmU7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOnN0cmV0Y2g7Z2FwOjZweH0udXAtY2hhdC1jb21wb3NlIC51cC1jaGF0LWlucHV0e2Rpc3BsYXk6YmxvY2s7ZmxleDoxIDEgYXV0bzt3aWR0aDphdXRvO2JveC1zaXppbmc6Ym9yZGVyLWJveDttaW4td2lkdGg6MH0udXAtY2hhdC10b29sc3tkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6c3RyZXRjaDtnYXA6NnB4O2ZsZXg6MCAwIGF1dG87bWFyZ2luLXRvcDowfS51cC1tZW50aW9uLW1lbnV7cG9zaXRpb246YWJzb2x1dGU7bGVmdDowO2JvdHRvbTpjYWxjKDEwMCUgKyA4cHgpO3otaW5kZXg6MjA7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2dhcDo2cHg7d2lkdGg6MTAwJTtwYWRkaW5nOjdweDtib3gtc2l6aW5nOmJvcmRlci1ib3g7YmFja2dyb3VuZDojMTgyMTMwO2JvcmRlcjoxcHggc29saWQgIzNhNDc1Yjtib3JkZXItcmFkaXVzOjEwcHg7Ym94LXNoYWRvdzowIDhweCAyNHB4IHJnYmEoMCwwLDAsLjMyKX0udXAtbWVudGlvbi1tZW51LmhpZGRlbntkaXNwbGF5Om5vbmV9LnVwLW1lbnRpb24tb3B0aW9ue2ZsZXg6MCAwIGF1dG87Ym9yZGVyOjFweCBzb2xpZCAjMzQ0MTU4O2JhY2tncm91bmQ6IzI0MzE0OTtjb2xvcjojZGJlNWY1O2JvcmRlci1yYWRpdXM6OHB4O3BhZGRpbmc6NnB4IDlweDtjdXJzb3I6cG9pbnRlcjtmb250OjEycHggU2Vnb2UgVUksQXJpYWwsc2Fucy1zZXJpZn0udXAtbWVudGlvbi1vcHRpb246aG92ZXJ7YmFja2dyb3VuZDojMzA0MDViO2JvcmRlci1jb2xvcjojNGY3ZGZmfS51cC1tZW50aW9uLW9wdGlvbi51cC1tZW50aW9uLWFsbHtiYWNrZ3JvdW5kOiMzYjMxNWY7Ym9yZGVyLWNvbG9yOiM4MDY1Yzc7Y29sb3I6I2ZmZn0udXAtY2hhdC10b29sc3tkaXNwbGF5OmZsZXg7Z2FwOjZweDtmbGV4OjAgMCBhdXRvfS51cC1jaGF0LWVtb2ppLWJ0bnt3aWR0aDozOHB4O2hlaWdodDo0MnB4O2JveC1zaXppbmc6Ym9yZGVyLWJveDtkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO3BhZGRpbmc6MDtib3JkZXI6MXB4IHNvbGlkICMzYTQ3NWI7Ym9yZGVyLXJhZGl1czo4cHg7YmFja2dyb3VuZDojMjczMjQ3O2NvbG9yOiNkYmU1ZjU7Y3Vyc29yOnBvaW50ZXJ9LnVwLWNoYXQtZW1vamktYnRuIC51cC1pY29ue3dpZHRoOjE3cHg7aGVpZ2h0OjE3cHh9LnVwLWNoYXQtZW1vamktYnRuOmhvdmVye2JhY2tncm91bmQ6IzM1NDI1YX0udXAtY2hhdC1hdHRhY2h7d2lkdGg6MzhweDtoZWlnaHQ6NDJweDtwYWRkaW5nOjA7Ym9yZGVyOjFweCBzb2xpZCAjM2E0NzViO2JvcmRlci1yYWRpdXM6OHB4O2JhY2tncm91bmQ6IzI3MzI0Nztjb2xvcjojZGJlNWY1O2N1cnNvcjpwb2ludGVyO2ZvbnQtc2l6ZToxN3B4O2Rpc3BsYXk6aW5saW5lLWZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Ym94LXNpemluZzpib3JkZXItYm94fS51cC1jaGF0LWF0dGFjaDpob3ZlcntiYWNrZ3JvdW5kOiMzNTQyNWF9LnVwLWNoYXQtY2xlYXJ7Ym9yZGVyOjA7Ym9yZGVyLXJhZGl1czo3cHg7cGFkZGluZzo3cHggOXB4O2JhY2tncm91bmQ6IzNhMjczMDtjb2xvcjojZmY5YWFhO2N1cnNvcjpwb2ludGVyO2ZvbnQ6NzAwIDE0cHggU2Vnb2UgVUksQXJpYWwsc2Fucy1zZXJpZn0udXAtY2hhdC1jbGVhcjpob3ZlcntiYWNrZ3JvdW5kOiM1NTJkM2F9LnVwLWNoYXQtYmFja3tib3JkZXI6MDtib3JkZXItcmFkaXVzOjdweDtwYWRkaW5nOjdweCA5cHg7YmFja2dyb3VuZDojMjczMjQ3O2NvbG9yOiNjNmQxZTE7Y3Vyc29yOnBvaW50ZXI7Zm9udDo3MDAgMTJweCBTZWdvZSBVSSxBcmlhbCxzYW5zLXNlcmlmfS51cC1jaGF0LWJhY2s6aG92ZXJ7YmFja2dyb3VuZDojMzU0MjVhfS51cC1jaGF0LW1lbnRpb257Y29sb3I6IzdmYjFmZjtmb250LXdlaWdodDo3NTB9LnVwLWNoYXQtaW5wdXR7ZmxleDoxIDEgYXV0bzt3aWR0aDphdXRvO21pbi13aWR0aDowO21pbi1oZWlnaHQ6NDJweDtoZWlnaHQ6NDJweDttYXgtaGVpZ2h0OjkwcHg7cmVzaXplOnZlcnRpY2FsO3BhZGRpbmc6OHB4O2JvcmRlci1yYWRpdXM6OHB4O2JvcmRlcjoxcHggc29saWQgIzNhNDc1YjtiYWNrZ3JvdW5kOiMxMTE3MjI7Y29sb3I6I2VkZjJmYjtmb250OjEzcHggU2Vnb2UgVUksQXJpYWwsc2Fucy1zZXJpZn0udXAtY2hhdC1zZW5ke21hcmdpbi10b3A6N3B4O3dpZHRoOjEwMCU7Ym9yZGVyOjA7Ym9yZGVyLXJhZGl1czo4cHg7cGFkZGluZzo5cHg7YmFja2dyb3VuZDojNGY3ZGZmO2NvbG9yOiNmZmY7Zm9udC13ZWlnaHQ6NzAwO2N1cnNvcjpwb2ludGVyfS51cC11cGRhdGV7Zm9udC1zaXplOjExcHg7Y29sb3I6IzljYWFjMDttYXJnaW4tdG9wOjEwcHh9LnVwLXVwZGF0ZSBidXR0b257bWFyZ2luLWxlZnQ6NnB4O2JvcmRlcjowO2JhY2tncm91bmQ6IzI3MzI0Nztjb2xvcjojYzZkMWUxO2JvcmRlci1yYWRpdXM6NnB4O3BhZGRpbmc6NHB4IDdweDtjdXJzb3I6cG9pbnRlcn0udXAtdXBkYXRlIGJ1dHRvbjpob3ZlcntiYWNrZ3JvdW5kOiMzNTQyNWF9LnVwLXVwZGF0ZSAudXAtdXBkYXRlLW5vdzpkaXNhYmxlZHtvcGFjaXR5Oi40NTtjdXJzb3I6bm90LWFsbG93ZWQ7YmFja2dyb3VuZDojMjAyOTM4O2NvbG9yOiM3ZjhjYTB9LnVwLXVwZGF0ZSAudXAtdXBkYXRlLW5vdzpkaXNhYmxlZDpob3ZlcntiYWNrZ3JvdW5kOiMyMDI5Mzh9LnVwLWhpc3RvcnktbGlzdHtvdmVyZmxvdzphdXRvO2ZsZXg6MTttaW4taGVpZ2h0OjA7bWFyZ2luLXRvcDoxMnB4fS51cC1oaXN0b3J5LWRheXtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3NTA7Y29sb3I6IzhmYTBiODttYXJnaW46MTRweCAwIDdweH0udXAtaGlzdG9yeS1pdGVte3BhZGRpbmc6OXB4IDA7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgIzMwM2I0ZH0udXAtaGlzdG9yeS1tZXRhe2Rpc3BsYXk6ZmxleDtnYXA6N3B4O2FsaWduLWl0ZW1zOmNlbnRlcjtmbGV4LXdyYXA6d3JhcH0udXAtaGlzdG9yeS1yZWFzb257Zm9udC1zaXplOjEycHg7Y29sb3I6I2I3YzJkMjttYXJnaW4tdG9wOjNweH0udXAtaGlzdG9yeS1lbXB0eXtmb250LXNpemU6MTJweDtjb2xvcjojOWFhOGJjO3BhZGRpbmc6MTRweCAwfScrCiAgICAnLnVwLWxvZ2luIGxhYmVse2Rpc3BsYXk6YmxvY2s7bWFyZ2luOjEycHggMCA1cHg7Zm9udC13ZWlnaHQ6NjUwfS51cC1sb2dpbiBidXR0b257d2lkdGg6MTAwJTttYXJnaW4tdG9wOjE1cHg7Ym9yZGVyOjA7Ym9yZGVyLXJhZGl1czo4cHg7cGFkZGluZzoxMHB4O2JhY2tncm91bmQ6IzRmN2RmZjtjb2xvcjojZmZmO2ZvbnQtd2VpZ2h0OjcwMDtjdXJzb3I6cG9pbnRlcn0nKwogICAgJy51cC1yZW1vdGUtb3ZlcmxheXtwb3NpdGlvbjpmaXhlZCFpbXBvcnRhbnQ7aW5zZXQ6MCFpbXBvcnRhbnQ7d2lkdGg6MTAwdnc7aGVpZ2h0OjEwMHZoO3otaW5kZXg6MjE0NzQ4MzY0NjtiYWNrZ3JvdW5kOnJnYmEoNSw5LDE2LC42NCk7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO3BhZGRpbmc6MjBweDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyLXJhZGl1czowO292ZXJmbG93OmF1dG99JysKICAgICcudXAtcmVtb3RlLWRpYWxvZ3t3aWR0aDptaW4oMzYwcHgsY2FsYygxMDB2dyAtIDQwcHgpKTttYXgtaGVpZ2h0OmNhbGMoMTAwdmggLSA0MHB4KTtvdmVyZmxvdzphdXRvfScrCiAgICAnLnVwLWNoYXQtcmVhZC10b29sdGlwe3Bvc2l0aW9uOmZpeGVkO3otaW5kZXg6MjE0NzQ4MzY0NztkaXNwbGF5Om5vbmU7bWF4LXdpZHRoOjI4MHB4O3BhZGRpbmc6N3B4IDlweDtib3JkZXI6MXB4IHNvbGlkICM0MDUwNmE7Ym9yZGVyLXJhZGl1czo4cHg7YmFja2dyb3VuZDojMTgyMTMwO2NvbG9yOiNlZGYyZmI7Zm9udDoxMXB4IFNlZ29lIFVJLEFyaWFsLHNhbnMtc2VyaWY7Ym94LXNoYWRvdzowIDEwcHggMjVweCAjMDAwODtwb2ludGVyLWV2ZW50czpub25lO3doaXRlLXNwYWNlOm5vd3JhcH0nKwogICAgJy51cC1jaGF0LXJlYWQtdG9vbHRpcC5zaG93e2Rpc3BsYXk6YmxvY2t9JysKICAgICcudXAtY2hhdC1lbW9qaS1tZW51e3Bvc2l0aW9uOmFic29sdXRlO3JpZ2h0OjA7Ym90dG9tOmNhbGMoMTAwJSArIDhweCk7ei1pbmRleDoyNTt3aWR0aDoyNjBweDttYXgtaGVpZ2h0OjE5MHB4O292ZXJmbG93OmF1dG87cGFkZGluZzo4cHg7Ym94LXNpemluZzpib3JkZXItYm94O2Rpc3BsYXk6ZmxleDtmbGV4LXdyYXA6d3JhcDtnYXA6NHB4O2JhY2tncm91bmQ6IzE4MjEzMDtib3JkZXI6MXB4IHNvbGlkICMzYTQ3NWI7Ym9yZGVyLXJhZGl1czoxMHB4O2JveC1zaGFkb3c6MCAxMHB4IDMwcHggIzAwMDh9LnVwLWNoYXQtZW1vamktbWVudS5oaWRkZW57ZGlzcGxheTpub25lfS51cC1jaGF0LWVtb2ppe3dpZHRoOjMycHg7aGVpZ2h0OjMycHg7Ym9yZGVyOjA7Ym9yZGVyLXJhZGl1czo3cHg7YmFja2dyb3VuZDp0cmFuc3BhcmVudDtjb2xvcjojZmZmO2ZvbnQtc2l6ZToyMHB4O2N1cnNvcjpwb2ludGVyfS51cC1jaGF0LWVtb2ppOmhvdmVye2JhY2tncm91bmQ6IzI3MzI0N30udXAtY2hhdC1jb250ZXh0LW1lbnV7cG9zaXRpb246Zml4ZWQ7ei1pbmRleDoyMTQ3NDgzNjQ3O2Rpc3BsYXk6bm9uZTttaW4td2lkdGg6MTcwcHg7cGFkZGluZzo2cHg7YmFja2dyb3VuZDojMTgyMTMwO2JvcmRlcjoxcHggc29saWQgIzQwNTA2YTtib3JkZXItcmFkaXVzOjEwcHg7Ym94LXNoYWRvdzowIDEycHggMzJweCAjMDAwOX0udXAtY2hhdC1jb250ZXh0LW1lbnUuc2hvd3tkaXNwbGF5OmJsb2NrfS51cC1jaGF0LWNvbnRleHQtYWN0aW9ue2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjdweDt3aWR0aDoxMDAlO2JvcmRlcjowO2JhY2tncm91bmQ6dHJhbnNwYXJlbnQ7Y29sb3I6I2VkZjJmYjtib3JkZXItcmFkaXVzOjdweDtwYWRkaW5nOjhweDt0ZXh0LWFsaWduOmxlZnQ7Y3Vyc29yOnBvaW50ZXI7Zm9udDoxMnB4IFNlZ29lIFVJLEFyaWFsLHNhbnMtc2VyaWZ9LnVwLWNoYXQtY29udGV4dC1hY3Rpb246aG92ZXJ7YmFja2dyb3VuZDojMjczMjQ3fS51cC1jaGF0LWNvbnRleHQtcmVhY3Rpb24tcm93e2Rpc3BsYXk6ZmxleDtnYXA6M3B4O3BhZGRpbmc6NHB4IDJweCAycHg7Ym9yZGVyLXRvcDoxcHggc29saWQgIzMzNDE1ODttYXJnaW4tdG9wOjRweH0udXAtY2hhdC1xdW90ZWR7bWFyZ2luLWJvdHRvbTo2cHg7cGFkZGluZzo1cHggN3B4O2JvcmRlci1sZWZ0OjNweCBzb2xpZCAjN2FhMmZmO2JhY2tncm91bmQ6IzIwMmIzZDtib3JkZXItcmFkaXVzOjZweDtmb250LXNpemU6MTBweDtjb2xvcjojYjhjNmQ5fS51cC1jaGF0LXF1b3RlZCBie2Rpc3BsYXk6YmxvY2s7Y29sb3I6IzhlYjJmZjttYXJnaW4tYm90dG9tOjJweH0udXAtY2hhdC1yZWFjdGlvbnN7ZGlzcGxheTpmbGV4O2dhcDo0cHg7ZmxleC13cmFwOndyYXA7bWFyZ2luLXRvcDo1cHh9LnVwLWNoYXQtcmVhY3Rpb257Ym9yZGVyOjA7Ym9yZGVyLXJhZGl1czoxMHB4O2JhY2tncm91bmQ6IzIwMmM0MDtjb2xvcjojZmZmO3BhZGRpbmc6MnB4IDZweDtmb250LXNpemU6MTJweDtjdXJzb3I6cG9pbnRlcn0udXAtY2hhdC1yZWFjdGlvbi5taW5le2JhY2tncm91bmQ6IzM5NTU4YX0udXAtY2hhdC1yZXBseS1iYXJ7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6N3B4O21hcmdpbi1ib3R0b206NnB4O3BhZGRpbmc6N3B4IDlweDtib3JkZXItbGVmdDozcHggc29saWQgIzRmN2RmZjtiYWNrZ3JvdW5kOiMyMDJiM2Q7Ym9yZGVyLXJhZGl1czo3cHg7Y29sb3I6I2RjZTVmMn0udXAtY2hhdC1yZXBseS1iYXIuaGlkZGVue2Rpc3BsYXk6bm9uZX0udXAtY2hhdC1yZXBseS1jb3B5e2ZsZXg6MTttaW4td2lkdGg6MDtmb250LXNpemU6MTFweH0udXAtY2hhdC1yZXBseS1jb3B5IGJ7ZGlzcGxheTpibG9jaztjb2xvcjojN2ZiMWZmfS51cC1jaGF0LXJlcGx5LWNsb3Nle2JvcmRlcjowO2JhY2tncm91bmQ6dHJhbnNwYXJlbnQ7Y29sb3I6I2FlYmJkMDtjdXJzb3I6cG9pbnRlcjtmb250LXNpemU6MTdweH0nKwogICAgJy51cC1jaGF0LXJlY29yZHt3aWR0aDozOHB4O2hlaWdodDo0MnB4O2JveC1zaXppbmc6Ym9yZGVyLWJveDtkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO3BhZGRpbmc6MDtib3JkZXI6MXB4IHNvbGlkICMzYTQ3NWI7Ym9yZGVyLXJhZGl1czo4cHg7YmFja2dyb3VuZDojMjczMjQ3O2NvbG9yOiNkYmU1ZjU7Y3Vyc29yOnBvaW50ZXI7Zm9udC1zaXplOjE3cHh9LnVwLWNoYXQtcmVjb3JkLnJlY29yZGluZ3tiYWNrZ3JvdW5kOiNjNTJmNDg7Y29sb3I6I2ZmZjthbmltYXRpb246dXByZWNvcmQgLjdzIGluZmluaXRlIGFsdGVybmF0ZX0udXAtY2hhdC1yZWNvcmQ6ZGlzYWJsZWR7b3BhY2l0eTouNTU7Y3Vyc29yOndhaXR9QGtleWZyYW1lcyB1cHJlY29yZHtmcm9te2JveC1zaGFkb3c6MCAwIDAgMCAjZmYzMzRmNTV9dG97Ym94LXNoYWRvdzowIDAgMCA3cHggI2ZmMzM0ZjU1fX0udXAtY2hhdC1yZWNvcmRpbmctbGFiZWx7cG9zaXRpb246YWJzb2x1dGU7bGVmdDowO2JvdHRvbTpjYWxjKDEwMCUgKyA4cHgpO3BhZGRpbmc6NnB4IDlweDtib3JkZXItcmFkaXVzOjhweDtiYWNrZ3JvdW5kOiNjNTJmNDg7Y29sb3I6I2ZmZjtmb250LXNpemU6MTFweDtmb250LXdlaWdodDo4MDA7ZGlzcGxheTpub25lfS51cC1jaGF0LXJlY29yZGluZy1sYWJlbC5zaG93e2Rpc3BsYXk6YmxvY2t9LnVwLWNoYXQtYXVkaW97ZGlzcGxheTpibG9jazt3aWR0aDoyNDBweDttYXgtd2lkdGg6MTAwJTttYXJnaW4tdG9wOjZweH0nKwogICAgICAgICcudXAtaGVhbHRoe3Bvc2l0aW9uOmFic29sdXRlO3JpZ2h0OjA7Ym90dG9tOjU1cHg7d2lkdGg6MzY1cHg7aGVpZ2h0OjUyMHB4O21heC13aWR0aDpjYWxjKDEwMHZ3IC0gMzJweCk7bWF4LWhlaWdodDpjYWxjKDEwMHZoIC0gNzlweCk7bWluLXdpZHRoOjMyMHB4O21pbi1oZWlnaHQ6NDIwcHg7ei1pbmRleDoxMTA7YmFja2dyb3VuZDojMTgyMTMwO2NvbG9yOiNlZGYyZmI7cGFkZGluZzoxNHB4O2JveC1zaXppbmc6Ym9yZGVyLWJveDtib3JkZXItcmFkaXVzOjE2cHg7Ym9yZGVyOjFweCBzb2xpZCAjMzU0MjU4O2JveC1zaGFkb3c6MCAxNnB4IDQycHggIzAwMGI7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjtvdmVyZmxvdzpoaWRkZW47cmVzaXplOm5vbmV9LnVwLWhlYWx0aC5oaWRkZW57ZGlzcGxheTpub25lfS51cC1oZWFsdGgtaGVhZHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2dhcDoxMHB4fS51cC1oZWFsdGgtdGl0bGV7Zm9udC1zaXplOjE1cHg7Zm9udC13ZWlnaHQ6ODUwfS51cC1oZWFsdGgtc3Vie2ZvbnQtc2l6ZToxMHB4O2NvbG9yOiM4ZmEwYjg7bWFyZ2luLXRvcDoycHh9LnVwLWhlYWx0aC1jbG9zZXtib3JkZXI6MDtib3JkZXItcmFkaXVzOjdweDtwYWRkaW5nOjdweCA5cHg7YmFja2dyb3VuZDojMjczMjQ3O2NvbG9yOiNjNmQxZTE7Y3Vyc29yOnBvaW50ZXJ9LnVwLWhlYWx0aC1saXN0e292ZXJmbG93OmF1dG87ZmxleDoxO21pbi1oZWlnaHQ6MDttYXJnaW4tdG9wOjEycHg7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjtnYXA6N3B4fS51cC1oZWFsdGgtcm93e2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47Z2FwOjEwcHg7cGFkZGluZzo5cHggMTBweDtib3JkZXI6MXB4IHNvbGlkICMzNDQxNTg7Ym9yZGVyLXJhZGl1czo5cHg7YmFja2dyb3VuZDojMTExNzIyfS51cC1oZWFsdGgtbGVmdHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHg7bWluLXdpZHRoOjB9LnVwLWhlYWx0aC1sZWR7d2lkdGg6OHB4O2hlaWdodDo4cHg7Ym9yZGVyLXJhZGl1czo1MCU7YmFja2dyb3VuZDojNjY3MDg1O2ZsZXg6MCAwIDhweH0udXAtaGVhbHRoLWxlZC5va3tiYWNrZ3JvdW5kOiMzYmQxN2Q7Ym94LXNoYWRvdzowIDAgMCAzcHggIzNiZDE3ZDIyfS51cC1oZWFsdGgtbGVkLndhcm57YmFja2dyb3VuZDojZTdiODRiO2JveC1zaGFkb3c6MCAwIDAgM3B4ICNlN2I4NGIyMn0udXAtaGVhbHRoLWxlZC5iYWR7YmFja2dyb3VuZDojZmY1YjcyO2JveC1zaGFkb3c6MCAwIDAgM3B4ICNmZjViNzIyMn0udXAtaGVhbHRoLW5hbWV7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzUwO3doaXRlLXNwYWNlOm5vd3JhcH0udXAtaGVhbHRoLWRldGFpbHtmb250LXNpemU6MTBweDtjb2xvcjojOWVhYmMwO3doaXRlLXNwYWNlOm5vd3JhcDt0ZXh0LWFsaWduOnJpZ2h0fS51cC1oZWFsdGgtZm9vdGVye2ZvbnQtc2l6ZToxMHB4O2NvbG9yOiM3ZjhjYTA7bWFyZ2luLXRvcDo4cHg7bGluZS1oZWlnaHQ6MS4zNX0udXAtaGVhbHRoLW1lbWJlcnN7bWFyZ2luLXRvcDozcHg7cGFkZGluZy10b3A6NnB4O2JvcmRlci10b3A6MXB4IHNvbGlkICMzMDNiNGR9LnVwLWhlYWx0aC1tZW1iZXJ7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjtnYXA6OHB4O3BhZGRpbmc6NXB4IDB9LnVwLWhlYWx0aC1tZW1iZXIgYntmb250LXNpemU6MTFweH0udXAtaGVhbHRoLW1lbWJlciBzcGFue2ZvbnQtc2l6ZToxMHB4O2NvbG9yOiM5ZWFiYzB9LnVwLWhlYWx0aC1yZWZyZXNoe21hcmdpbi10b3A6OHB4O3dpZHRoOjEwMCU7Ym9yZGVyOjA7Ym9yZGVyLXJhZGl1czo4cHg7cGFkZGluZzo4cHg7YmFja2dyb3VuZDojMjczMjQ3O2NvbG9yOiNkYmU1ZjU7Y3Vyc29yOnBvaW50ZXI7Zm9udC13ZWlnaHQ6NzAwfS51cC1oZWFsdGgtcmVmcmVzaDpob3ZlcntiYWNrZ3JvdW5kOiMzNTQyNWF9JysKICAgICcjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodHtjb2xvcjojMWIyNDMwfScrCiAgICAnI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgI3Vwc3RhdHVzLWNhcmQsI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgI3Vwc3RhdHVzLWhpc3RvcnksI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgI3Vwc3RhdHVzLWNoYXR7YmFja2dyb3VuZDojZjdmOWZjO2JvcmRlci1jb2xvcjojZDdkZWU5O2NvbG9yOiMxYjI0MzA7Ym94LXNoYWRvdzowIDE2cHggNDJweCByZ2JhKDAsMCwwLC4xOCl9JysKICAgICcjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAteW91LCN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1yZWFzb24sI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLXRpbWUsI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLWhpc3RvcnktZGF5LCN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1oaXN0b3J5LXJlYXNvbiwjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtaGlzdG9yeS1lbXB0eXtjb2xvcjojNjQ3NDhifScrCiAgICAnI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLWNoYXQtYnRuLCN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1sb2dvdXQsI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLWhpc3RvcnktYnRuLCN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1jbG9zZSwjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtbm90aWZpY2F0aW9uLWJ0biwjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtZXhwb3J0e2JhY2tncm91bmQ6I2U4ZWRmNDtjb2xvcjojMzM0MTU1fScrCiAgICAnI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLW5vdGlmaWNhdGlvbi1idG4uZW5hYmxlZHtiYWNrZ3JvdW5kOiNkN2Y0ZTU7Y29sb3I6IzE0NzA0NH0nKwogICAgJyN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1tZW1iZXJ7Ym9yZGVyLWNvbG9yOiNkYmUyZWN9JysKICAgICcjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtbWVtYmVyLXZlcnNpb257YmFja2dyb3VuZDojZjFmNWY5O2JvcmRlci1jb2xvcjojY2JkNWUxO2NvbG9yOiM2NDc0OGJ9JysKICAgICcjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtbWVtYmVyLWJhcnVpLCN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1tZW1iZXItcG93ZXJ7YmFja2dyb3VuZDojZThlZGY0O2NvbG9yOiMzMzQxNTV9JysKICAgICcjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtY2hhdC1jb250ZXh0LW1lbnUsI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLWNoYXQtcmVwbHktYmFye2JhY2tncm91bmQ6I2ZmZjtjb2xvcjojMWUyOTNiO2JvcmRlci1jb2xvcjojY2JkNWUxfSN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1jaGF0LWNvbnRleHQtYWN0aW9ue2NvbG9yOiMxZTI5M2J9I3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLWNoYXQtY29udGV4dC1hY3Rpb246aG92ZXJ7YmFja2dyb3VuZDojZWVmMmY3fSN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1jaGF0LXJlYWN0aW9ue2JhY2tncm91bmQ6I2VlZjJmNztjb2xvcjojMWUyOTNifSN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1jaGF0LXJlcGx5LWNvcHkgYntjb2xvcjojMzU2N2M4fSN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1jaGF0LXJlcGx5LWNsb3Nle2NvbG9yOiM2NDc0OGJ9I3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLWNoYXQtcXVvdGVke2JhY2tncm91bmQ6I2VlZjJmNztjb2xvcjojNDc1NTY5fSN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1jaGF0LXF1b3RlZCBie2NvbG9yOiMzNTY3Yzh9I3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLWNoYXQtYXR0YWNoLCN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1jaGF0LXJlY29yZCwjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtY2hhdC1lbW9qaS1idG57YmFja2dyb3VuZDojZThlZGY0O2NvbG9yOiMzMzQxNTU7Ym9yZGVyLWNvbG9yOiNjYmQ1ZTF9I3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLXJlYXNvbi10cmlnZ2VyLCN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1yZWFzb24tbWVudSwjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtc2VsZWN0LCN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1pbnB1dCwjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtY2hhdC1pbnB1dCwjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtY2hhdC1waG90bywjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtbWVudGlvbi1tZW51e2JhY2tncm91bmQ6I2ZmZjtib3JkZXItY29sb3I6I2NiZDVlMTtjb2xvcjojMWUyOTNifScrCiAgICAnI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLXJlYXNvbi1vcHRpb24sI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLW1lbnRpb24tb3B0aW9ue2NvbG9yOiMxZTI5M2I7YmFja2dyb3VuZDojZjhmYWZjO2JvcmRlci1jb2xvcjojY2JkNWUxfScrCiAgICAnI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLW1lbnRpb24tb3B0aW9uLnVwLW1lbnRpb24tYWxse2JhY2tncm91bmQ6I2VkZTlmZTtib3JkZXItY29sb3I6I2E3OGJmYTtjb2xvcjojNGMxZDk1fScrCiAgICAnI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLWNoYXQtbWVudGlvbntjb2xvcjojMjU2M2ViO2JhY2tncm91bmQ6I2RiZWFmZTtib3JkZXItcmFkaXVzOjRweDtwYWRkaW5nOjAgMnB4fScrCiAgICAnI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLXN0YXR1cy1pY29uLm9ubGluZXtjb2xvcjojMTY4YTRkfSN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1zdGF0dXMtaWNvbi5idXN5e2NvbG9yOiNjNTJmNDh9I3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLXN0YXR1cy1pY29uLmF3YXl7Y29sb3I6IzQ3NTU2OX0nKwogICAgJyN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1sb2dpbiBsYWJlbCwjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtbGFiZWwsI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLXRlYW0tdGl0bGV7Y29sb3I6IzE3MjAzM30nKwogICAgJyN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1sb2dpbiBpbnB1dDotd2Via2l0LWF1dG9maWxsLCN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1sb2dpbiBpbnB1dDotd2Via2l0LWF1dG9maWxsOmhvdmVyLCN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1sb2dpbiBpbnB1dDotd2Via2l0LWF1dG9maWxsOmZvY3Vzey13ZWJraXQtdGV4dC1maWxsLWNvbG9yOiMxZTI5M2I7LXdlYmtpdC1ib3gtc2hhZG93OjAgMCAwIDEwMDBweCAjZmZmIGluc2V0O2JveC1zaGFkb3c6MCAwIDAgMTAwMHB4ICNmZmYgaW5zZXQ7Ym9yZGVyLWNvbG9yOiNjYmQ1ZTF9JysKICAgICcjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtbG9naW4gaW5wdXQ6LW1vei1hdXRvZmlsbHtib3gtc2hhZG93OjAgMCAwIDEwMDBweCAjZmZmIGluc2V0O2NvbG9yOiMxZTI5M2J9JysKICAgICcjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtcmVhc29uLW9wdGlvbjpob3ZlciwjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtbWVudGlvbi1vcHRpb246aG92ZXJ7YmFja2dyb3VuZDojZWVmMmY3fScrCiAgICAnI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLWNoYXQtaXRlbXtib3JkZXItY29sb3I6I2RiZTJlY30nKwogICAgJyN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1jaGF0LXRleHR7Y29sb3I6IzFlMjkzYn0nKwogICAgJyN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1jaGF0LWJ1YmJsZXtiYWNrZ3JvdW5kOiNlN2VkZjU7Y29sb3I6IzFlMjkzYjtib3gtc2hhZG93OjAgM3B4IDEwcHggcmdiYSgxNSwyMyw0MiwuMTIpfScrCiAgICAnI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLWNoYXQtaXRlbS5vd24gLnVwLWNoYXQtYnViYmxle2JhY2tncm91bmQ6I2RiZWFmZTtjb2xvcjojMWUyOTNifScrCiAgICAnI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLWNoYXQtbWV0YSwjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtY2hhdC1tZXRhIGJ7Y29sb3I6IzUyNjE3Nn0nKwogICAgJyN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1jaGF0LXJlYWR7Y29sb3I6IzY0NzQ4Yn0nKwogICAgJyN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1jaGF0LXJlYWQucmVhZHtjb2xvcjojMTY3N2ZmfScrCiAgICAnI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLWNoYXQtZW1vamktbWVudXtiYWNrZ3JvdW5kOiNmZmY7Ym9yZGVyLWNvbG9yOiNjYmQ1ZTE7Ym94LXNoYWRvdzowIDEwcHggMzBweCByZ2JhKDAsMCwwLC4xNil9JysKICAgICcjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtY2hhdC1lbW9qaTpob3ZlcntiYWNrZ3JvdW5kOiNlZWYyZjd9JysKICAgICcjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtY2hhdC1yZWNvcmQsI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLWNoYXQtcGhvdG8sI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLWNoYXQtZW1vamktYnRue2JhY2tncm91bmQ6I2ZmZjtjb2xvcjojMzM0MTU1O2JvcmRlci1jb2xvcjojY2JkNWUxfScrCiAgICAgICAgJyN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC11cGRhdGV7Y29sb3I6IzY0NzQ4Yn0nKwogICAgJyN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC11cGRhdGUgYnV0dG9ue2JhY2tncm91bmQ6I2U4ZWRmNDtjb2xvcjojMzM0MTU1fScrCiAgICAnI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLXRvYXN0e2JhY2tncm91bmQ6cmdiYSgyNTUsMjU1LDI1NSwuOTQpO2JvcmRlci1jb2xvcjojZDRkY2U3O2NvbG9yOiMxZTI5M2J9JysKICAgICcjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtdG9hc3QtbmFtZXtjb2xvcjojNTI2MTc2fScrCiAgICAnI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLWJhcnVpLWluY29taW5nLWNhcmR7YmFja2dyb3VuZDpyZ2JhKDI1NSwyNDUsMjQ3LC45OCk7Y29sb3I6IzhmMTczMH0nKwogICAgJyN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1iYXJ1aS1pbmNvbWluZy1zdWJ7Y29sb3I6I2E4M2E0ZH0nKwogICAgJyN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1iYXJ1aS1zdG9we2JhY2tncm91bmQ6I2YxZDVkYTtjb2xvcjojOGYxNzMwfScrCiAgICAnI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLXJlbW90ZS1kaWFsb2d7YmFja2dyb3VuZDojZmZmO2JvcmRlci1jb2xvcjojY2JkNWUxO2NvbG9yOiMxZTI5M2J9JysKICAgICcjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtcmVtb3RlLXN1Yntjb2xvcjojNjQ3NDhifScrCiAgICAnI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLXJlbW90ZS1zdGF0dXN7YmFja2dyb3VuZDojZjFmNWY5O2JvcmRlci1jb2xvcjojY2JkNWUxO2NvbG9yOiMzMzQxNTV9JysKICAgICcjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtcmVtb3RlLXN0YXR1czpob3ZlciwjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtcmVtb3RlLXN0YXR1cy5hY3RpdmV7YmFja2dyb3VuZDojZGJlYWZlO2JvcmRlci1jb2xvcjojN2FhMmU4O2NvbG9yOiMxZTNhOGF9JysKICAgICcjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtcmVtb3RlLXJlYXNvbi1vcHRpb257YmFja2dyb3VuZDojZjFmNWY5O2NvbG9yOiMzMzQxNTV9JysKICAgICcjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtcmVtb3RlLXJlYXNvbi1vcHRpb246aG92ZXIsI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLXJlbW90ZS1yZWFzb24tb3B0aW9uLmFjdGl2ZXtiYWNrZ3JvdW5kOiNkYmVhZmV9JysKICAgICcjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtcmVtb3RlLWNhbmNlbHtiYWNrZ3JvdW5kOiNlOGVkZjQ7Y29sb3I6IzMzNDE1NX0nKwogICAgJyN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1jaGF0LW5vdGlmeS1kb3R7Ym9yZGVyLWNvbG9yOiNmN2Y5ZmN9JysKICAgICcjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtaGVhbHRoe2JhY2tncm91bmQ6I2Y3ZjlmYztjb2xvcjojMWIyNDMwfSN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1oZWFsdGgtc3ViLCN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1oZWFsdGgtZGV0YWlsLCN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1oZWFsdGgtZm9vdGVyLCN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1oZWFsdGgtbWVtYmVyIHNwYW57Y29sb3I6IzY0NzQ4Yn0jdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtaGVhbHRoLWNsb3NlLCN1cHN0YXR1cy1yb290LnVwLXRoZW1lLWxpZ2h0IC51cC1oZWFsdGgtcmVmcmVzaHtiYWNrZ3JvdW5kOiNlOGVkZjQ7Y29sb3I6IzMzNDE1NX0jdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtaGVhbHRoLXJvd3tiYWNrZ3JvdW5kOiNmZmY7Ym9yZGVyLWNvbG9yOiNkYmUyZWN9I3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLWhlYWx0aC1tZW1iZXJze2JvcmRlci1jb2xvcjojZGJlMmVjfScrCiAgICAnI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLW5vdGlmeS1kb3QsI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLXVwZGF0ZS1kb3QsI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLXF1aWNrLWNoYXQtYnViYmxle2JvcmRlci1jb2xvcjojZjdmOWZjfScrCiAgICAnLnVwLXRoZW1lLWJ0bntib3JkZXI6MDtib3JkZXItcmFkaXVzOjdweDtwYWRkaW5nOjdweCA5cHg7YmFja2dyb3VuZDojMjczMjQ3O2NvbG9yOiNjNmQxZTE7Y3Vyc29yOnBvaW50ZXI7Ym94LXNpemluZzpib3JkZXItYm94O2hlaWdodDozNHB4O21pbi13aWR0aDozNHB4O2Rpc3BsYXk6aW5saW5lLWZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXJ9JysKICAgICcudXAtdGhlbWUtYnRuIC51cC1pY29ue3dpZHRoOjE2cHg7aGVpZ2h0OjE2cHh9JysKICAgICcudXAtaGVhbHRoLWJ0bntib3JkZXI6MDtib3JkZXItcmFkaXVzOjdweDtwYWRkaW5nOjdweCA5cHg7YmFja2dyb3VuZDojMjczMjQ3O2NvbG9yOiNjNmQxZTE7Y3Vyc29yOnBvaW50ZXI7Ym94LXNpemluZzpib3JkZXItYm94O2hlaWdodDozNHB4O21pbi13aWR0aDozNHB4O2Rpc3BsYXk6aW5saW5lLWZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXJ9LnVwLWhlYWx0aC1idG46aG92ZXJ7YmFja2dyb3VuZDojMzU0MjVhfS51cC1oZWFsdGgtYnRuIC51cC1pY29ue3dpZHRoOjE2cHg7aGVpZ2h0OjE2cHh9JysKICAgICcjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtc2V0dGluZ3MtbWVudXtiYWNrZ3JvdW5kOiNmZmY7Ym9yZGVyLWNvbG9yOiNkN2RlZTk7Ym94LXNoYWRvdzowIDEycHggMzBweCByZ2JhKDAsMCwwLC4xNil9JysKICAgICcjdXBzdGF0dXMtcm9vdC51cC10aGVtZS1saWdodCAudXAtc2V0dGluZ3MtbWVudSBidXR0b246aG92ZXJ7YmFja2dyb3VuZDojZThlZGY0fScrCiAgICAnI3Vwc3RhdHVzLXJvb3QudXAtdGhlbWUtbGlnaHQgLnVwLXNldHRpbmdzLWJ0bntiYWNrZ3JvdW5kOiNlOGVkZjQ7Y29sb3I6IzMzNDE1NX0nKwogICAgJy51cC1yZXNpemUtaGFuZGxle3Bvc2l0aW9uOmFic29sdXRlO3otaW5kZXg6MjAwO3RvdWNoLWFjdGlvbjpub25lfS51cC1yZXNpemUtbntsZWZ0OjEwcHg7cmlnaHQ6MTBweDt0b3A6LTVweDtoZWlnaHQ6MTBweDtjdXJzb3I6bnMtcmVzaXplfS51cC1yZXNpemUtc3tsZWZ0OjEwcHg7cmlnaHQ6MTBweDtib3R0b206LTVweDtoZWlnaHQ6MTBweDtjdXJzb3I6bnMtcmVzaXplfS51cC1yZXNpemUtZXt0b3A6MTBweDtib3R0b206MTBweDtyaWdodDotNXB4O3dpZHRoOjEwcHg7Y3Vyc29yOmV3LXJlc2l6ZX0udXAtcmVzaXplLXd7dG9wOjEwcHg7Ym90dG9tOjEwcHg7bGVmdDotNXB4O3dpZHRoOjEwcHg7Y3Vyc29yOmV3LXJlc2l6ZX0udXAtcmVzaXplLW5le3JpZ2h0Oi01cHg7dG9wOi01cHg7d2lkdGg6MTRweDtoZWlnaHQ6MTRweDtjdXJzb3I6bmVzdy1yZXNpemV9LnVwLXJlc2l6ZS1ud3tsZWZ0Oi01cHg7dG9wOi01cHg7d2lkdGg6MTRweDtoZWlnaHQ6MTRweDtjdXJzb3I6bndzZS1yZXNpemV9LnVwLXJlc2l6ZS1zZXtyaWdodDotNXB4O2JvdHRvbTotNXB4O3dpZHRoOjE0cHg7aGVpZ2h0OjE0cHg7Y3Vyc29yOm53c2UtcmVzaXplfS51cC1yZXNpemUtc3d7bGVmdDotNXB4O2JvdHRvbTotNXB4O3dpZHRoOjE0cHg7aGVpZ2h0OjE0cHg7Y3Vyc29yOm5lc3ctcmVzaXplfScKICB9KTsKCiAgdmFyIHJvb3Q9bm9kZSgnZGl2Jyx7aWQ6J3Vwc3RhdHVzLXJvb3QnfSk7CiAgdmFyIGJ1YmJsZT1ub2RlKCdidXR0b24nLHtpZDondXBzdGF0dXMtYnViYmxlJyx0aXRsZTonQWJyaXIgVXBTdGF0dXMnfSk7CiAgdmFyIHF1aWNrQ2hhdEJ1YmJsZT1ub2RlKCdidXR0b24nLHtjbGFzc05hbWU6J3VwLXF1aWNrLWNoYXQtYnViYmxlJyx0aXRsZTonQWJyaXIgQ2hhdCBkYSBlcXVpcGUnLHR5cGU6J2J1dHRvbicsJ2FyaWEtbGFiZWwnOidBYnJpciBDaGF0IGRhIGVxdWlwZSd9KTsKICB2YXIgY2FyZD1ub2RlKCdzZWN0aW9uJyx7aWQ6J3Vwc3RhdHVzLWNhcmQnLGNsYXNzTmFtZTonaGlkZGVuJ30pOwogIHZhciBoaXN0b3J5PW5vZGUoJ3NlY3Rpb24nLHtpZDondXBzdGF0dXMtaGlzdG9yeScsY2xhc3NOYW1lOidoaWRkZW4nfSk7CiAgdmFyIGNoYXQ9bm9kZSgnc2VjdGlvbicse2lkOid1cHN0YXR1cy1jaGF0JyxjbGFzc05hbWU6J2hpZGRlbid9KTsKICB2YXIgdG9hc3RTdGFjaz1ub2RlKCdkaXYnLHtjbGFzc05hbWU6J3VwLXRvYXN0LXN0YWNrJ30pOwogIHZhciBiYXJ1aUluY29taW5nPW5vZGUoJ2Rpdicse2NsYXNzTmFtZTondXAtYmFydWktaW5jb21pbmcgaGlkZGVuJ30pOwogIHZhciByZW1vdGVPdmVybGF5PW5vZGUoJ2Rpdicse2NsYXNzTmFtZTondXAtcmVtb3RlLW92ZXJsYXkgaGlkZGVuJ30pOwogIHZhciBjaGF0UHJvZmlsZUhvdmVyPW5vZGUoJ2Rpdicse2NsYXNzTmFtZTondXAtY2hhdC1wcm9maWxlLWhvdmVyJ30pOwogIHZhciByZWFkVG9vbHRpcD1ub2RlKCdkaXYnLHtjbGFzc05hbWU6J3VwLWNoYXQtcmVhZC10b29sdGlwJ30pOwogIHZhciBwcm9maWxlTW9kYWw9bm9kZSgnZGl2Jyx7Y2xhc3NOYW1lOid1cC1jaGF0LXByb2ZpbGUtbW9kYWwgaGlkZGVuJ30pOwogIHZhciBoZWFsdGg9bm9kZSgnc2VjdGlvbicse2lkOid1cHN0YXR1cy1oZWFsdGgnLGNsYXNzTmFtZTondXAtaGVhbHRoIGhpZGRlbid9KTsKICBwcm9maWxlTW9kYWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJ1cC1jaGF0LXByb2ZpbGUtZGlhbG9nIj48aW1nIGNsYXNzPSJ1cC1jaGF0LXByb2ZpbGUtcHJldmlldyIgYWx0PSJTdWEgZm90byI+PGRpdiBjbGFzcz0idXAtbGFiZWwiPkZvdG8gZGUgcGVyZmlsPC9kaXY+PGlucHV0IGNsYXNzPSJ1cC1jaGF0LXByb2ZpbGUtZmlsZSIgdHlwZT0iZmlsZSIgYWNjZXB0PSJpbWFnZS9wbmcsaW1hZ2UvanBlZyxpbWFnZS93ZWJwLGltYWdlL2dpZiI+PGRpdiBjbGFzcz0idXAtY2hhdC1wcm9maWxlLW1lc3NhZ2UiPjwvZGl2PjxkaXYgY2xhc3M9InVwLWNoYXQtcHJvZmlsZS1hY3Rpb25zIj48YnV0dG9uIHR5cGU9ImJ1dHRvbiIgY2xhc3M9InVwLWNoYXQtcHJvZmlsZS1jYW5jZWwiPkNhbmNlbGFyPC9idXR0b24+PGJ1dHRvbiB0eXBlPSJidXR0b24iIGNsYXNzPSJ1cC1jaGF0LXByb2ZpbGUtc2F2ZSI+U2FsdmFyIGZvdG88L2J1dHRvbj48L2Rpdj48L2Rpdj4nOwogIHJvb3QuYXBwZW5kQ2hpbGQocHJvZmlsZU1vZGFsKTsKICB2YXIgaW1nPW5vZGUoJ2ltZycse2NsYXNzTmFtZTondXAtYnViYmxlLWF2YXRhcicsc3JjOicnLGFsdDonRm90byBkZSBwZXJmaWwnfSk7CiAgaW1nLnNyYz1wcm9maWxlRmFsbGJhY2soKTsKICByb290LnN0eWxlLnJpZ2h0PUdNX2dldFZhbHVlKGtleSsncmlnaHQnLCcyNHB4Jyk7CiAgcm9vdC5zdHlsZS5ib3R0b209R01fZ2V0VmFsdWUoa2V5Kydib3R0b20nLCcyNHB4Jyk7CiAgYnViYmxlLmlubmVySFRNTD0nPHNwYW4gY2xhc3M9InVwLW5vdGlmeS1kb3QiPjwvc3Bhbj48c3BhbiBjbGFzcz0idXAtdXBkYXRlLWRvdCIgcm9sZT0iYnV0dG9uIiB0YWJpbmRleD0iMCIgYXJpYS1sYWJlbD0iSW5zdGFsYXIgYXR1YWxpemHDp8OjbyI+PC9zcGFuPic7CiAgcXVpY2tDaGF0QnViYmxlLmlubmVySFRNTD1pY29uU3ZnKCdjaGF0JywndXAtcXVpY2stY2hhdC1pY29uJyk7CiAgYnViYmxlLmFwcGVuZENoaWxkKGltZyk7CiAgcm9vdC5hcHBlbmQoc3R5bGUsYnViYmxlLHF1aWNrQ2hhdEJ1YmJsZSxjYXJkLGhpc3RvcnksY2hhdCx0b2FzdFN0YWNrLGJhcnVpSW5jb21pbmcscmVtb3RlT3ZlcmxheSxjaGF0UHJvZmlsZUhvdmVyLGhlYWx0aCk7CiAgc2V0QnViYmxlU3RhdHVzKCdvZmZsaW5lJyk7CiAgcm9vdC5hcHBlbmRDaGlsZChyZWFkVG9vbHRpcCk7CiAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmFwcGVuZENoaWxkKHJvb3QpOwogIHZhciB1cGRhdGVEb3Q9YnViYmxlLnF1ZXJ5U2VsZWN0b3IoJy51cC11cGRhdGUtZG90Jyk7CiAgaWYodXBkYXRlRG90KXt1cGRhdGVEb3QuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcmRvd24nLGZ1bmN0aW9uKGUpe2Uuc3RvcFByb3BhZ2F0aW9uKCk7fSk7dXBkYXRlRG90LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJ1cCcsZnVuY3Rpb24oZSl7ZS5wcmV2ZW50RGVmYXVsdCgpO2Uuc3RvcFByb3BhZ2F0aW9uKCk7b3BlblVwZGF0ZSgpO30pO3VwZGF0ZURvdC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJyxmdW5jdGlvbihlKXtpZihlLmtleT09PSdFbnRlcid8fGUua2V5PT09JyAnKXtlLnByZXZlbnREZWZhdWx0KCk7b3BlblVwZGF0ZSgpO319KTt9CiAgZnVuY3Rpb24gcGFuZWxCb3VuZHMocGFuZWwpewogICAgdmFyIGF2YWlsYWJsZVc9TWF0aC5tYXgoMSx3aW5kb3cuaW5uZXJXaWR0aC0zMiksYXZhaWxhYmxlSD1NYXRoLm1heCgxLHdpbmRvdy5pbm5lckhlaWdodC03OSk7CiAgICB2YXIgbWluVz1NYXRoLm1pbigzMjAsYXZhaWxhYmxlVyksbWluSD1NYXRoLm1pbig0MjAsYXZhaWxhYmxlSCk7CiAgICB2YXIgbWF4Vz1NYXRoLm1heChtaW5XLE1hdGgubWluKDYyMCxhdmFpbGFibGVXKSk7CiAgICB2YXIgbWF4SD1NYXRoLm1heChtaW5ILE1hdGgubWluKDY4MCxhdmFpbGFibGVIKSk7CiAgICByZXR1cm4ge21pblc6bWluVyxtaW5IOm1pbkgsbWF4VzptYXhXLG1heEg6bWF4SH07CiAgfQogIGZ1bmN0aW9uIGNsYW1wUGFuZWxTaXplKHBhbmVsLHcsaCl7CiAgICB2YXIgYj1wYW5lbEJvdW5kcyhwYW5lbCk7CiAgICB3PU1hdGgubWF4KGIubWluVyxNYXRoLm1pbihiLm1heFcsTWF0aC5yb3VuZCh3KSkpOwogICAgaD1NYXRoLm1heChiLm1pbkgsTWF0aC5taW4oYi5tYXhILE1hdGgucm91bmQoaCkpKTsKICAgIHBhbmVsLnN0eWxlLm1pbldpZHRoPWIubWluVysncHgnO3BhbmVsLnN0eWxlLm1pbkhlaWdodD1iLm1pbkgrJ3B4JzsKICAgIHBhbmVsLnN0eWxlLm1heFdpZHRoPWIubWF4VysncHgnO3BhbmVsLnN0eWxlLm1heEhlaWdodD1iLm1heEgrJ3B4JzsKICAgIHBhbmVsLnN0eWxlLndpZHRoPXcrJ3B4JztwYW5lbC5zdHlsZS5oZWlnaHQ9aCsncHgnOwogIH0KICBmdW5jdGlvbiBzZXR1cFBhbmVsUmVzaXplKHBhbmVsLHN0b3JhZ2VLZXksZGVmYXVsdFcsZGVmYXVsdEgpewogICAgdmFyIHNhdmVkVz1wYXJzZUludChHTV9nZXRWYWx1ZShrZXkrJ3dpZHRoXycrc3RvcmFnZUtleSwnJyksMTApLHNhdmVkSD1wYXJzZUludChHTV9nZXRWYWx1ZShrZXkrJ2hlaWdodF8nK3N0b3JhZ2VLZXksJycpLDEwKTsKICAgIHZhciB3PShzYXZlZFc+PTMyMD9zYXZlZFc6TWF0aC5taW4oZGVmYXVsdFcsTWF0aC5tYXgoMSx3aW5kb3cuaW5uZXJXaWR0aC0zMikpKTsKICAgIHZhciBoPShzYXZlZEg+PTQyMD9zYXZlZEg6TWF0aC5taW4oZGVmYXVsdEgsTWF0aC5tYXgoMSx3aW5kb3cuaW5uZXJIZWlnaHQtNzkpKSk7CiAgICBjbGFtcFBhbmVsU2l6ZShwYW5lbCx3LGgpOwogICAgdmFyIHJlc2l6aW5nPW51bGw7CiAgICBmdW5jdGlvbiBlZGdlQXQoZSl7CiAgICAgIHZhciByPXBhbmVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLGVkZ2U9OTsKICAgICAgdmFyIGxlZnQ9ZS5jbGllbnRYLXIubGVmdDw9ZWRnZSxyaWdodD1yLnJpZ2h0LWUuY2xpZW50WDw9ZWRnZSx0b3A9ZS5jbGllbnRZLXIudG9wPD1lZGdlLGJvdHRvbT1yLmJvdHRvbS1lLmNsaWVudFk8PWVkZ2U7CiAgICAgIGlmKHRvcCYmbGVmdClyZXR1cm4gJ253JztpZih0b3AmJnJpZ2h0KXJldHVybiAnbmUnO2lmKGJvdHRvbSYmbGVmdClyZXR1cm4gJ3N3JztpZihib3R0b20mJnJpZ2h0KXJldHVybiAnc2UnOwogICAgICBpZih0b3ApcmV0dXJuICduJztpZihib3R0b20pcmV0dXJuICdzJztpZihsZWZ0KXJldHVybiAndyc7aWYocmlnaHQpcmV0dXJuICdlJztyZXR1cm4gJyc7CiAgICB9CiAgICBwYW5lbC5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVybW92ZScsZnVuY3Rpb24oZSl7CiAgICAgIGlmKHJlc2l6aW5nKXJldHVybjsKICAgICAgdmFyIGRpcj1lZGdlQXQoZSksY3Vyc29yPXtuOiducy1yZXNpemUnLHM6J25zLXJlc2l6ZScsZTonZXctcmVzaXplJyx3Oidldy1yZXNpemUnLG5lOiduZXN3LXJlc2l6ZScsc3c6J25lc3ctcmVzaXplJyxudzonbndzZS1yZXNpemUnLHNlOidud3NlLXJlc2l6ZSd9W2Rpcl18fCcnOwogICAgICBwYW5lbC5zdHlsZS5jdXJzb3I9Y3Vyc29yOwogICAgfSx0cnVlKTsKICAgIHBhbmVsLmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJsZWF2ZScsZnVuY3Rpb24oKXtpZighcmVzaXppbmcpcGFuZWwuc3R5bGUuY3Vyc29yPScnO30sdHJ1ZSk7CiAgICBwYW5lbC5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVyZG93bicsZnVuY3Rpb24oZSl7CiAgICAgIGlmKGUuYnV0dG9uIT09dW5kZWZpbmVkJiZlLmJ1dHRvbiE9PTApcmV0dXJuOwogICAgICB2YXIgZGlyPWVkZ2VBdChlKTtpZighZGlyKXJldHVybjsKICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO2Uuc3RvcFByb3BhZ2F0aW9uKCk7CiAgICAgIHJlc2l6aW5nPXtkaXI6ZGlyLHN0YXJ0VzpwYW5lbC5vZmZzZXRXaWR0aCxzdGFydEg6cGFuZWwub2Zmc2V0SGVpZ2h0LHN0YXJ0WDplLmNsaWVudFgsc3RhcnRZOmUuY2xpZW50WX07CiAgICAgIHBhbmVsLnN0eWxlLmN1cnNvcj17bjonbnMtcmVzaXplJyxzOiducy1yZXNpemUnLGU6J2V3LXJlc2l6ZScsdzonZXctcmVzaXplJyxuZTonbmVzdy1yZXNpemUnLHN3OiduZXN3LXJlc2l6ZScsbnc6J253c2UtcmVzaXplJyxzZTonbndzZS1yZXNpemUnfVtkaXJdfHwnJzsKICAgICAgZnVuY3Rpb24gbW92ZShldil7CiAgICAgICAgaWYoIXJlc2l6aW5nKXJldHVybjsKICAgICAgICB2YXIgZHg9ZXYuY2xpZW50WC1yZXNpemluZy5zdGFydFgsZHk9ZXYuY2xpZW50WS1yZXNpemluZy5zdGFydFksbmV4dFc9cmVzaXppbmcuc3RhcnRXLG5leHRIPXJlc2l6aW5nLnN0YXJ0SDsKICAgICAgICBpZihkaXIuaW5kZXhPZignZScpPj0wKW5leHRXPXJlc2l6aW5nLnN0YXJ0VytkeDsKICAgICAgICBpZihkaXIuaW5kZXhPZigndycpPj0wKW5leHRXPXJlc2l6aW5nLnN0YXJ0Vy1keDsKICAgICAgICBpZihkaXIuaW5kZXhPZigncycpPj0wKW5leHRIPXJlc2l6aW5nLnN0YXJ0SCtkeTsKICAgICAgICBpZihkaXIuaW5kZXhPZignbicpPj0wKW5leHRIPXJlc2l6aW5nLnN0YXJ0SC1keTsKICAgICAgICBjbGFtcFBhbmVsU2l6ZShwYW5lbCxuZXh0VyxuZXh0SCk7CiAgICAgICAgZXYucHJldmVudERlZmF1bHQoKTsKICAgICAgfQogICAgICBmdW5jdGlvbiBkb25lKCl7CiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9pbnRlcm1vdmUnLG1vdmUsdHJ1ZSk7CiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9pbnRlcnVwJyxkb25lLHRydWUpOwogICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJjYW5jZWwnLGRvbmUsdHJ1ZSk7CiAgICAgICAgaWYocmVzaXppbmcpewogICAgICAgICAgR01fc2V0VmFsdWUoa2V5Kyd3aWR0aF8nK3N0b3JhZ2VLZXkscGFuZWwub2Zmc2V0V2lkdGgpOwogICAgICAgICAgR01fc2V0VmFsdWUoa2V5KydoZWlnaHRfJytzdG9yYWdlS2V5LHBhbmVsLm9mZnNldEhlaWdodCk7CiAgICAgICAgfQogICAgICAgIHJlc2l6aW5nPW51bGw7cGFuZWwuc3R5bGUuY3Vyc29yPScnOwogICAgICB9CiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJtb3ZlJyxtb3ZlLHRydWUpOwogICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVydXAnLGRvbmUsdHJ1ZSk7CiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJjYW5jZWwnLGRvbmUsdHJ1ZSk7CiAgICB9LHRydWUpOwogIH0KICBmdW5jdGlvbiBzZXR1cFJlc2l6ZVBlcnNpc3RlbmNlKCl7CiAgICBzZXR1cFBhbmVsUmVzaXplKGNhcmQsJ2NhcmQnLDM2NSw1MjApOwogICAgc2V0dXBQYW5lbFJlc2l6ZShoaXN0b3J5LCdoaXN0b3J5JywzNjUsNTIwKTsKICAgIHNldHVwUGFuZWxSZXNpemUoY2hhdCwnY2hhdCcsMzY1LDUyMCk7CiAgICBzZXR1cFBhbmVsUmVzaXplKGhlYWx0aCwnaGVhbHRoJywzNjUsNTIwKTsKICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLGZ1bmN0aW9uKCl7CiAgICAgIFtjYXJkLGhpc3RvcnksY2hhdCxoZWFsdGhdLmZvckVhY2goZnVuY3Rpb24ocGFuZWwpewogICAgICAgIHZhciB3PXBhbmVsLm9mZnNldFdpZHRofHwzNjUsaD1wYW5lbC5vZmZzZXRIZWlnaHR8fDUyMDsKICAgICAgICBjbGFtcFBhbmVsU2l6ZShwYW5lbCx3LGgpOwogICAgICB9KTsKICAgIH0pOwogIH0KICBzZXR1cFJlc2l6ZVBlcnNpc3RlbmNlKCk7CgogIGZ1bmN0aW9uIHNldEJ1YmJsZVN0YXR1cyhzdGF0dXMpewogICAgY3VycmVudFN0YXR1cz1zdGF0dXN8fCdvZmZsaW5lJzsKICAgIHZhciBjb2xvcnM9e29ubGluZTonIzJlOWI2MicsYnVzeTonI2I0MjMzYycsYXdheTonIzY2NzA4NScsb2ZmbGluZTonIzViNjU3NCd9OwogICAgdmFyIGJvcmRlcnM9e29ubGluZTonIzc5ZTNhOCcsYnVzeTonI2ZmNmI3YScsYXdheTonI2FlYjhjNycsb2ZmbGluZTonIzhiOTVhNCd9OwogICAgYnViYmxlLnN0eWxlLmJhY2tncm91bmQ9Y29sb3JzW2N1cnJlbnRTdGF0dXNdfHxjb2xvcnMub2ZmbGluZTsKICAgIGJ1YmJsZS5zdHlsZS5ib3JkZXJDb2xvcj1ib3JkZXJzW2N1cnJlbnRTdGF0dXNdfHxib3JkZXJzLm9mZmxpbmU7CiAgfQogIGZ1bmN0aW9uIHVubG9ja0F1ZGlvKCl7CiAgICB0cnl7CiAgICAgIGlmKGF1ZGlvVW5sb2NrZWQpcmV0dXJuOwogICAgICB2YXIgQUM9d2luZG93LkF1ZGlvQ29udGV4dHx8d2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDsKICAgICAgaWYoIUFDKXJldHVybjsKICAgICAgYXVkaW9DdHg9YXVkaW9DdHh8fG5ldyBBQygpOwogICAgICBpZihhdWRpb0N0eC5zdGF0ZT09PSdzdXNwZW5kZWQnKWF1ZGlvQ3R4LnJlc3VtZSgpOwogICAgICB2YXIgb3NjPWF1ZGlvQ3R4LmNyZWF0ZU9zY2lsbGF0b3IoKTsKICAgICAgdmFyIGdhaW49YXVkaW9DdHguY3JlYXRlR2FpbigpOwogICAgICBvc2MuZnJlcXVlbmN5LnZhbHVlPTE7CiAgICAgIGdhaW4uZ2Fpbi52YWx1ZT0wLjAwMDE7CiAgICAgIG9zYy5jb25uZWN0KGdhaW4pO2dhaW4uY29ubmVjdChhdWRpb0N0eC5kZXN0aW5hdGlvbik7CiAgICAgIG9zYy5zdGFydCgpO29zYy5zdG9wKGF1ZGlvQ3R4LmN1cnJlbnRUaW1lKzAuMDEpOwogICAgICBhdWRpb1VubG9ja2VkPXRydWU7CiAgICB9Y2F0Y2goZSl7fQogIH0KICBmdW5jdGlvbiBwbGF5TWVudGlvbkFsZXJ0KCl7CiAgICB0cnl7CiAgICAgIHZhciBBQz13aW5kb3cuQXVkaW9Db250ZXh0fHx3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0OwogICAgICBpZighQUMpcmV0dXJuOwogICAgICBhdWRpb0N0eD1hdWRpb0N0eHx8bmV3IEFDKCk7CiAgICAgIGlmKGF1ZGlvQ3R4LnN0YXRlPT09J3N1c3BlbmRlZCcpYXVkaW9DdHgucmVzdW1lKCk7CiAgICAgIHZhciBub3c9YXVkaW9DdHguY3VycmVudFRpbWU7CiAgICAgIHZhciBnYWluPWF1ZGlvQ3R4LmNyZWF0ZUdhaW4oKTsKICAgICAgZ2Fpbi5nYWluLnNldFZhbHVlQXRUaW1lKDAuMDAwMSxub3cpOwogICAgICBnYWluLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSgwLjUsbm93KzAuMDE1KTsKICAgICAgZ2Fpbi5nYWluLmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoMC4wMDAxLG5vdyswLjQ4KTsKICAgICAgZ2Fpbi5jb25uZWN0KGF1ZGlvQ3R4LmRlc3RpbmF0aW9uKTsKICAgICAgWzg4MCwxMTc0LDE1NjhdLmZvckVhY2goZnVuY3Rpb24oZnJlcSxpKXsKICAgICAgICB2YXIgb3NjPWF1ZGlvQ3R4LmNyZWF0ZU9zY2lsbGF0b3IoKTsKICAgICAgICBvc2MudHlwZT0nc3F1YXJlJzsKICAgICAgICBvc2MuZnJlcXVlbmN5LnNldFZhbHVlQXRUaW1lKGZyZXEsbm93K2kqMC4wNDUpOwogICAgICAgIG9zYy5jb25uZWN0KGdhaW4pOwogICAgICAgIG9zYy5zdGFydChub3craSowLjA0NSk7CiAgICAgICAgb3NjLnN0b3Aobm93KzAuNSk7CiAgICAgIH0pOwogICAgfWNhdGNoKGUpe30KICB9CiAgWydwb2ludGVyZG93bicsJ2tleWRvd24nLCd0b3VjaHN0YXJ0J10uZm9yRWFjaChmdW5jdGlvbihldil7ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldix1bmxvY2tBdWRpbyx7cGFzc2l2ZTp0cnVlLGNhcHR1cmU6dHJ1ZX0pO30pOwoKICBmdW5jdGlvbiBzZXRVbnJlYWQobil7CiAgICBjaGF0VW5yZWFkPU51bWJlcihuKXx8MDsKICAgIHVwZGF0ZUZhdmljb25Ob3RpZmljYXRpb24oY2hhdFVucmVhZCk7CiAgICB2YXIgY2hhdERvdD1jYXJkLnF1ZXJ5U2VsZWN0b3IoJy51cC1jaGF0LWJ0biAudXAtY2hhdC1ub3RpZnktZG90Jyk7CiAgICBpZihjaGF0RG90KXtjaGF0RG90LmNsYXNzTGlzdC50b2dnbGUoJ3Nob3cnLGNoYXRVbnJlYWQ+MCk7Y2hhdERvdC50ZXh0Q29udGVudD1jaGF0VW5yZWFkPjk5Pyc5OSsnOlN0cmluZyhjaGF0VW5yZWFkfHwnJyk7fQogICAgdmFyIGJ1YmJsZURvdD1idWJibGUucXVlcnlTZWxlY3RvcignLnVwLW5vdGlmeS1kb3QnKTsKICAgIGlmKGJ1YmJsZURvdCl7YnViYmxlRG90LmNsYXNzTGlzdC50b2dnbGUoJ3Nob3cnLGNoYXRVbnJlYWQ+MCk7YnViYmxlRG90LnRleHRDb250ZW50PWNoYXRVbnJlYWQ+OTk/Jzk5Kyc6U3RyaW5nKGNoYXRVbnJlYWR8fCcnKTtidWJibGVEb3QudGl0bGU9Y2hhdFVucmVhZD4wPyhjaGF0VW5yZWFkKycgbWVuc2FnZW0obnMpIG7Do28gbGlkYShzKSBubyBjaGF0Jyk6J1NlbSBtZW5zYWdlbnMgbsOjbyBsaWRhcyc7fQogIH0KICBmdW5jdGlvbiBzZXRVcGRhdGVBdmFpbGFibGUoc2hvdyx2ZXJzaW9uKXsKICAgIHZhciBkb3Q9YnViYmxlLnF1ZXJ5U2VsZWN0b3IoJy51cC11cGRhdGUtZG90Jyk7CiAgICBpZighZG90KXJldHVybjsKICAgIGRvdC50ZXh0Q29udGVudD0nJztkb3QuaW5uZXJIVE1MPXNob3c/aWNvblN2ZygndXBkYXRlJyk6Jyc7CiAgICBkb3QudGl0bGU9c2hvdz8oJ05vdmEgdmVyc8OjbyBkaXNwb27DrXZlbDogdicrdmVyc2lvbik6J1NlbSBhdHVhbGl6YcOnw6NvJzsKICAgIGRvdC5jbGFzc0xpc3QudG9nZ2xlKCdzaG93JywhIXNob3cpOwogIH0KICBmdW5jdGlvbiBvcGVuVXBkYXRlKCl7CiAgICB0cnl7CiAgICAgIGlmKHR5cGVvZiBHTV9vcGVuSW5UYWI9PT0nZnVuY3Rpb24nKXsKICAgICAgICB2YXIgdXBkYXRlVGFiPUdNX29wZW5JblRhYihVUERBVEVfVVJMLHthY3RpdmU6dHJ1ZSxpbnNlcnQ6dHJ1ZSxzZXRQYXJlbnQ6dHJ1ZX0pOwogICAgICAgIGlmKHVwZGF0ZVRhYil7CiAgICAgICAgICB1cGRhdGVUYWIub25jbG9zZT1mdW5jdGlvbigpewogICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7dHJ5e2xvY2F0aW9uLnJlbG9hZCgpfWNhdGNoKGUpe319LDI1MCk7CiAgICAgICAgICB9OwogICAgICAgIH0KICAgICAgICByZXR1cm47CiAgICAgIH0KICAgIH1jYXRjaChlKXt9CiAgICB3aW5kb3cub3BlbihVUERBVEVfVVJMLCdfYmxhbmsnLCdub29wZW5lcicpOwogIH0KICBmdW5jdGlvbiB2ZXJzaW9uUGFydHModil7CiAgICByZXR1cm4gU3RyaW5nKHZ8fCcwJykucmVwbGFjZSgvXnYvaSwnJykuc3BsaXQoJy4nKS5tYXAoZnVuY3Rpb24obil7CiAgICAgIHZhciB4PXBhcnNlSW50KG4sMTApOwogICAgICByZXR1cm4gaXNOYU4oeCk/MDp4OwogICAgfSk7CiAgfQogIGZ1bmN0aW9uIGNvbXBhcmVWZXJzaW9ucyhhLGIpewogICAgdmFyIEE9dmVyc2lvblBhcnRzKGEpLEI9dmVyc2lvblBhcnRzKGIpLGk7CiAgICBmb3IoaT0wO2k8TWF0aC5tYXgoQS5sZW5ndGgsQi5sZW5ndGgpO2krKyl7CiAgICAgIHZhciBhdj1BW2ldfHwwLGJ2PUJbaV18fDA7CiAgICAgIGlmKGF2PmJ2KXJldHVybiAxOwogICAgICBpZihhdjxidilyZXR1cm4gLTE7CiAgICB9CiAgICByZXR1cm4gMDsKICB9CiAgZnVuY3Rpb24gY2hlY2tVcGRhdGUoKXsKICAgIGFwaSgnR0VUJywnL2FwaS91cGRhdGUtaW5mbycpLnRoZW4oZnVuY3Rpb24oZCl7CiAgICAgIHZhciBzdGF0dXNlcz1jYXJkLnF1ZXJ5U2VsZWN0b3JBbGwoJy51cC11cGRhdGUtc3RhdHVzJyk7CiAgICAgIHZhciBtYW51YWxzPWNhcmQucXVlcnlTZWxlY3RvckFsbCgnLnVwLXVwZGF0ZS1ub3cnKTsKICAgICAgdmFyIHJlbW90ZT1kJiZkLnZlcnNpb24/U3RyaW5nKGQudmVyc2lvbik6Jyc7CiAgICAgIHZhciBjbXA9Y29tcGFyZVZlcnNpb25zKHJlbW90ZSxDVVJSRU5UX1ZFUlNJT04pOwoKICAgICAgbWFudWFscy5mb3JFYWNoKGZ1bmN0aW9uKG1hbnVhbCl7bWFudWFsLm9uY2xpY2s9b3BlblVwZGF0ZTttYW51YWwuZGlzYWJsZWQ9Y21wPD0wO21hbnVhbC50aXRsZT1jbXA+MD8nQXR1YWxpemFyIHBhcmEgdicrcmVtb3RlOidWb2PDqiBqw6EgZXN0w6EgbmEgdmVyc8OjbyBtYWlzIHJlY2VudGUnO30pOwogICAgICBpZihyZW1vdGUmJmNtcD4wKXsKICAgICAgICBzZXRVcGRhdGVBdmFpbGFibGUodHJ1ZSxyZW1vdGUpOwogICAgICAgIHN0YXR1c2VzLmZvckVhY2goZnVuY3Rpb24oc3RhdHVzKXtzdGF0dXMuaW5uZXJIVE1MPScg4oCiIE5vdmEgdmVyc8OjbzogPGI+dicrZXNjKHJlbW90ZSkrJzwvYj4nO30pOwogICAgICB9ZWxzZSBpZihyZW1vdGUmJmNtcDwwKXsKICAgICAgICBzZXRVcGRhdGVBdmFpbGFibGUoZmFsc2UsJycpOwogICAgICAgIHN0YXR1c2VzLmZvckVhY2goZnVuY3Rpb24oc3RhdHVzKXtzdGF0dXMudGV4dENvbnRlbnQ9JyDigKIgU2Vydmlkb3IgZXN0w6EgZW0gdicrZXNjKHJlbW90ZSkrJzsgdm9jw6ogZXN0w6EgZW0gdicrQ1VSUkVOVF9WRVJTSU9OKycuJzt9KTsKICAgICAgfWVsc2V7CiAgICAgICAgc2V0VXBkYXRlQXZhaWxhYmxlKGZhbHNlLCcnKTsKICAgICAgICBzdGF0dXNlcy5mb3JFYWNoKGZ1bmN0aW9uKHN0YXR1cyl7c3RhdHVzLnRleHRDb250ZW50PScg4oCiIFZvY8OqIGVzdMOhIGF0dWFsaXphZG8uJzt9KTsKICAgICAgfQogICAgfSkuY2F0Y2goZnVuY3Rpb24oKXt9KS5maW5hbGx5KGZ1bmN0aW9uKCl7cmVtb3RlUG9sbGluZz1mYWxzZTt9KTsKICB9CiAgZnVuY3Rpb24gbWVudGlvbk5hbWVzKHRleHQpewogICAgdmFyIGZvdW5kPVtdOwogICAgKHRleHQubWF0Y2goL0BbXHB7TH1ccHtOfV8tXSsvZ3UpfHxbXSkuZm9yRWFjaChmdW5jdGlvbih0YWcpewogICAgICB2YXIgcmF3PXRhZy5zbGljZSgxKS50b0xvd2VyQ2FzZSgpOwogICAgICB2YXIgbmFtZT0od2luZG93Ll9fdXBzdGF0dXNNZW1iZXJzfHxbXSkuZmluZChmdW5jdGlvbihuKXtyZXR1cm4gbi50b0xvd2VyQ2FzZSgpPT09cmF3fSk7CiAgICAgIGlmKG5hbWUmJmZvdW5kLmluZGV4T2YobmFtZSk8MClmb3VuZC5wdXNoKG5hbWUpOwogICAgfSk7CiAgICByZXR1cm4gZm91bmQ7CiAgfQogIGZ1bmN0aW9uIHJlbmRlckNoYXRUZXh0KHRleHQpewogICAgdmFyIHNhZmU9ZXNjKHRleHQpOwogICAgKHdpbmRvdy5fX3Vwc3RhdHVzTWVtYmVyc3x8W10pLmZvckVhY2goZnVuY3Rpb24obmFtZSl7CiAgICAgIHZhciByZT1uZXcgUmVnRXhwKCcoXnxbXlxcd10pKEAnK25hbWUucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xdXFwvXS9nLCdcXCQmJykrJykoPyFbXFx3XSknLCdnaScpOwogICAgICBzYWZlPXNhZmUucmVwbGFjZShyZSwnJDE8c3BhbiBjbGFzcz1cInVwLWNoYXQtbWVudGlvblwiPiQyPC9zcGFuPicpOwogICAgfSk7CiAgICByZXR1cm4gc2FmZTsKICB9CiAgdmFyIHRvYXN0SXRlbXM9W107CiAgdmFyIHR5cGluZ0hlYXJ0YmVhdD1udWxsOwogIHZhciB0eXBpbmdTdG9wVGltZXI9bnVsbDsKICB2YXIgY2hhdExhc3RSZW5kZXJLZXk9IiI7CiAgZnVuY3Rpb24gcmVtb3ZlVG9hc3QoaWQpewogICAgdmFyIGl0ZW09dG9hc3RJdGVtcy5maW5kKGZ1bmN0aW9uKHgpe3JldHVybiB4LmlkPT09aWR9KTsKICAgIGlmKCFpdGVtKXJldHVybjsKICAgIGNsZWFyVGltZW91dChpdGVtLnRpbWVyKTsKICAgIGlmKGl0ZW0uZWwmJml0ZW0uZWwucGFyZW50Tm9kZSlpdGVtLmVsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoaXRlbS5lbCk7CiAgICB0b2FzdEl0ZW1zPXRvYXN0SXRlbXMuZmlsdGVyKGZ1bmN0aW9uKHgpe3JldHVybiB4LmlkIT09aWR9KTsKICB9CiAgZnVuY3Rpb24gc2hvd0NoYXRUb2FzdChtKXsKICAgIGlmKCFtfHwhbS5pZHx8bS50eXBlPT09J3N5c3RlbSd8fG0udXNlcj09PW1lbWJlcnx8IXNob3VsZE5vdGlmeUZvckNoYXQoKSlyZXR1cm47CiAgICBpZighc2hvdWxkTm90aWZ5Rm9yQ2hhdCgpKXJldHVybjsKICAgIGlmKGJ1YmJsZSl7YnViYmxlLmNsYXNzTGlzdC5yZW1vdmUoJ3VwLW1haW4tYWxlcnQnKTt2b2lkIGJ1YmJsZS5vZmZzZXRXaWR0aDtidWJibGUuY2xhc3NMaXN0LmFkZCgndXAtbWFpbi1hbGVydCcpO3NldFRpbWVvdXQoZnVuY3Rpb24oKXtidWJibGUuY2xhc3NMaXN0LnJlbW92ZSgndXAtbWFpbi1hbGVydCcpfSw3MDApO30KCiAgICBpZih0b2FzdEl0ZW1zLmZpbmQoZnVuY3Rpb24oeCl7cmV0dXJuIHguaWQ9PT1tLmlkfSkpcmV0dXJuOwogICAgd2hpbGUodG9hc3RJdGVtcy5sZW5ndGg+PTMpcmVtb3ZlVG9hc3QodG9hc3RJdGVtc1swXS5pZCk7CiAgICB2YXIgZWw9bm9kZSgnZGl2Jyx7Y2xhc3NOYW1lOid1cC10b2FzdCd9KTsKICAgIHZhciB0b2FzdFRleHQ9KG0udHlwZT09PSdpbWFnZSd8fG0uaW1hZ2VVcmwpPydmb3RvJzoobS5tZXNzYWdlfHwnJyk7CiAgICBlbC5pbm5lckhUTUw9JzxidXR0b24gdHlwZT0iYnV0dG9uIiBjbGFzcz0idXAtdG9hc3QtY2xvc2UiIGFyaWEtbGFiZWw9IkZlY2hhciI+w5c8L2J1dHRvbj48ZGl2IGNsYXNzPSJ1cC10b2FzdC1uYW1lIj4nK2VzYyhtLnVzZXIpKyc8L2Rpdj48ZGl2IGNsYXNzPSJ1cC10b2FzdC10ZXh0Ij4nK2VzYyh0b2FzdFRleHQpKyc8L2Rpdj4nOwogICAgZWwucXVlcnlTZWxlY3RvcignLnVwLXRvYXN0LWNsb3NlJykub25jbGljaz1mdW5jdGlvbihlKXtlLnN0b3BQcm9wYWdhdGlvbigpO3JlbW92ZVRvYXN0KG0uaWQpfTsKICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbihlKXsKICAgICAgaWYoZS50YXJnZXQmJmUudGFyZ2V0LmNsb3Nlc3QmJmUudGFyZ2V0LmNsb3Nlc3QoJy51cC10b2FzdC1jbG9zZScpKXJldHVybjsKICAgICAgb3BlbkNoYXQoKTsKICAgIH0pOwogICAgdG9hc3RTdGFjay5hcHBlbmRDaGlsZChlbCk7CiAgICB2YXIgaXRlbT17aWQ6bS5pZCxlbDplbCx0aW1lcjpudWxsfTsKICAgIGl0ZW0udGltZXI9c2V0VGltZW91dChmdW5jdGlvbigpe3JlbW92ZVRvYXN0KG0uaWQpfSw1MDAwKTsKICAgIHRvYXN0SXRlbXMucHVzaChpdGVtKTsKICB9CgogIGZ1bmN0aW9uIGV4dGVybmFsTm90aWZpY2F0aW9uc1N1cHBvcnRlZCgpewogICAgcmV0dXJuICEhVXBOYXRpdmVOb3RpZmljYXRpb247CiAgfQogIHZhciBub3RpZmljYXRpb25zRW5hYmxlZD1HTV9nZXRWYWx1ZShrZXkrJ25vdGlmaWNhdGlvbnNfZW5hYmxlZCcsdHJ1ZSkhPT1mYWxzZTsKICBmdW5jdGlvbiB1cGRhdGVOb3RpZmljYXRpb25QZXJtaXNzaW9uVUkoKXsKICAgIHZhciBidG49Y2FyZC5xdWVyeVNlbGVjdG9yKCcudXAtc2V0dGluZ3Mtbm90aWZpY2F0aW9ucycpOwogICAgaWYoIWJ0bilyZXR1cm47CiAgICB2YXIgcD1leHRlcm5hbE5vdGlmaWNhdGlvbnNTdXBwb3J0ZWQoKT9VcE5hdGl2ZU5vdGlmaWNhdGlvbi5wZXJtaXNzaW9uOid1bnN1cHBvcnRlZCc7CiAgICBleHRlcm5hbE5vdGlmUGVybWlzc2lvbj1wO2J0bi5jbGFzc0xpc3QucmVtb3ZlKCdlbmFibGVkJywnZGVuaWVkJyk7CiAgICBpZighbm90aWZpY2F0aW9uc0VuYWJsZWQpe2J0bi5jbGFzc0xpc3QuYWRkKCdkZW5pZWQnKTtidG4uaW5uZXJIVE1MPWljb25TdmcoJ2JlbGwnKSsnPHNwYW4+Tm90aWZpY2HDp8O1ZXMgZGVzbGlnYWRhczwvc3Bhbj4nO3JldHVybjt9CiAgICBpZihwPT09J2dyYW50ZWQnKXtidG4uY2xhc3NMaXN0LmFkZCgnZW5hYmxlZCcpO2J0bi5pbm5lckhUTUw9aWNvblN2ZygnYmVsbCcpKyc8c3Bhbj5Ob3RpZmljYcOnw7VlcyBsaWdhZGFzPC9zcGFuPic7fQogICAgZWxzZSBpZihwPT09J2RlbmllZCcpe2J0bi5jbGFzc0xpc3QuYWRkKCdkZW5pZWQnKTtidG4uaW5uZXJIVE1MPWljb25TdmcoJ2JlbGwnKSsnPHNwYW4+Tm90aWZpY2HDp8O1ZXMgYmxvcXVlYWRhczwvc3Bhbj4nO30KICAgIGVsc2UgYnRuLmlubmVySFRNTD1pY29uU3ZnKCdiZWxsJykrJzxzcGFuPkxpZ2FyIG5vdGlmaWNhw6fDtWVzPC9zcGFuPic7CiAgfQogIGZ1bmN0aW9uIHRvZ2dsZU5vdGlmaWNhdGlvbnMoKXsKICAgIGlmKG5vdGlmaWNhdGlvbnNFbmFibGVkKXtub3RpZmljYXRpb25zRW5hYmxlZD1mYWxzZTtHTV9zZXRWYWx1ZShrZXkrJ25vdGlmaWNhdGlvbnNfZW5hYmxlZCcsZmFsc2UpO3VwZGF0ZU5vdGlmaWNhdGlvblBlcm1pc3Npb25VSSgpO21lc3NhZ2UoJ05vdGlmaWNhw6fDtWVzIGRlc2xpZ2FkYXMuJyk7cmV0dXJuO30KICAgIG5vdGlmaWNhdGlvbnNFbmFibGVkPXRydWU7R01fc2V0VmFsdWUoa2V5Kydub3RpZmljYXRpb25zX2VuYWJsZWQnLHRydWUpOwogICAgaWYoZXh0ZXJuYWxOb3RpZmljYXRpb25zU3VwcG9ydGVkKCkmJlVwTmF0aXZlTm90aWZpY2F0aW9uLnBlcm1pc3Npb249PT0nZGVmYXVsdCcpe3JlcXVlc3RFeHRlcm5hbE5vdGlmaWNhdGlvbnMoKTtyZXR1cm47fQogICAgdXBkYXRlTm90aWZpY2F0aW9uUGVybWlzc2lvblVJKCk7CiAgfQogIGFzeW5jIGZ1bmN0aW9uIHJlcXVlc3RFeHRlcm5hbE5vdGlmaWNhdGlvbnMoKXsKICAgIGlmKCFleHRlcm5hbE5vdGlmaWNhdGlvbnNTdXBwb3J0ZWQoKSl7CiAgICAgIG1lc3NhZ2UoJ0VzdGUgbmF2ZWdhZG9yIG7Do28gb2ZlcmVjZSBub3RpZmljYcOnw7VlcyBleHRlcm5hcy4nLHRydWUpOwogICAgICByZXR1cm47CiAgICB9CiAgICB0cnl7CiAgICAgIHZhciBwPVVwTmF0aXZlTm90aWZpY2F0aW9uLnBlcm1pc3Npb247CiAgICAgIGlmKHA9PT0nZGVmYXVsdCcpcD1hd2FpdCBVcE5hdGl2ZU5vdGlmaWNhdGlvbi5yZXF1ZXN0UGVybWlzc2lvbigpOwogICAgICBleHRlcm5hbE5vdGlmUGVybWlzc2lvbj1wOwogICAgICB1cGRhdGVOb3RpZmljYXRpb25QZXJtaXNzaW9uVUkoKTsKICAgICAgaWYocD09PSdncmFudGVkJyltZXNzYWdlKCdOb3RpZmljYcOnw7VlcyBleHRlcm5hcyBhdGl2YWRhcy4nKTsKICAgICAgZWxzZSBpZihwPT09J2RlbmllZCcpbWVzc2FnZSgnTm90aWZpY2HDp8O1ZXMgZm9yYW0gYmxvcXVlYWRhcyBwZWxvIG5hdmVnYWRvci4nLHRydWUpOwogICAgfWNhdGNoKGUpe21lc3NhZ2UoJ07Do28gZm9pIHBvc3PDrXZlbCBhdGl2YXIgYXMgbm90aWZpY2HDp8O1ZXMuJyx0cnVlKX0KICB9CiAgZnVuY3Rpb24gc2hvdWxkTm90aWZ5Rm9yQ2hhdCgpewogICAgcmV0dXJuIGNoYXQuY2xhc3NMaXN0LmNvbnRhaW5zKCdoaWRkZW4nKSB8fCBkb2N1bWVudC5oaWRkZW47CiAgfQogIGZ1bmN0aW9uIHNob3VsZFNob3dFeHRlcm5hbE5vdGlmaWNhdGlvbigpewogICAgcmV0dXJuIG5vdGlmaWNhdGlvbnNFbmFibGVkICYmICEhVXBOYXRpdmVOb3RpZmljYXRpb24gJiYgVXBOYXRpdmVOb3RpZmljYXRpb24ucGVybWlzc2lvbj09PSdncmFudGVkJzsKICB9CiAgZnVuY3Rpb24gZXh0ZXJuYWxOb3RpZmljYXRpb25LZXkodHlwZSxpZCl7CiAgICByZXR1cm4gJ3Vwc3RhdHVzX2V4dGVybmFsXycrdHlwZSsnXycrU3RyaW5nKGlkfHwnJyk7CiAgfQogIGZ1bmN0aW9uIHdhc0V4dGVybmFsTm90aWZpY2F0aW9uU2hvd24odHlwZSxpZCl7CiAgICB2YXIgaz1leHRlcm5hbE5vdGlmaWNhdGlvbktleSh0eXBlLGlkKTsKICAgIGlmKGV4dGVybmFsTm90aWZTZWVuW2tdKXJldHVybiB0cnVlOwogICAgdHJ5e2lmKEdNX2dldFZhbHVlKGssZmFsc2UpKXJldHVybiB0cnVlfWNhdGNoKGUpe30KICAgIHJldHVybiBmYWxzZTsKICB9CiAgZnVuY3Rpb24gbWFya0V4dGVybmFsTm90aWZpY2F0aW9uU2hvd24odHlwZSxpZCl7CiAgICB2YXIgaz1leHRlcm5hbE5vdGlmaWNhdGlvbktleSh0eXBlLGlkKTsKICAgIGV4dGVybmFsTm90aWZTZWVuW2tdPXRydWU7CiAgICB0cnl7R01fc2V0VmFsdWUoayx0cnVlKX1jYXRjaChlKXt9CiAgfQogIGZ1bmN0aW9uIGlzVGVhbUNoYXRNZXNzYWdlKGRhdGEpewogICAgaWYoIWRhdGF8fCFkYXRhLnVzZXJ8fGRhdGEudHlwZT09PSdzeXN0ZW0nKXJldHVybiBmYWxzZTsKICAgIHZhciBuYW1lcz13aW5kb3cuX191cHN0YXR1c01lbWJlcnN8fFtdOwogICAgaWYoIW5hbWVzLmxlbmd0aCluYW1lcz1bJ1JpY2FyZG8nLCdMb2hhbicsJ0d1aWxoZXJtZSddOwogICAgaWYobHVjY2FPbmxpbmUmJiFuYW1lcy5pbmNsdWRlcygnTHVjY2EnKSluYW1lcz1uYW1lcy5jb25jYXQoWydMdWNjYSddKTsKICAgIHZhciBzZW5kZXI9U3RyaW5nKGRhdGEudXNlcikudHJpbSgpLnRvTG93ZXJDYXNlKCk7CiAgICByZXR1cm4gbmFtZXMuc29tZShmdW5jdGlvbihuYW1lKXtyZXR1cm4gU3RyaW5nKG5hbWUpLnRyaW0oKS50b0xvd2VyQ2FzZSgpPT09c2VuZGVyO30pOwogIH0KICBmdW5jdGlvbiB1cFN0YXR1c05vdGlmaWNhdGlvbkljb24oKXsKICAgIHJldHVybiBzZXJ2ZXIrJy91cHN0YXR1cy1pY29uLnN2Zyc7CiAgfQogIGZ1bmN0aW9uIHNob3dFeHRlcm5hbE5vdGlmaWNhdGlvbih0eXBlLGRhdGEpewogICAgaWYodHlwZT09PSdjaGF0JyAmJiAhc2hvdWxkTm90aWZ5Rm9yQ2hhdCgpKXJldHVybjsKICAgIGlmKHR5cGU9PT0nY2hhdCcmJighaXNUZWFtQ2hhdE1lc3NhZ2UoZGF0YSl8fCFzaG91bGROb3RpZnlGb3JDaGF0KCkpKXJldHVybjsKICAgIGlmKCFzaG91bGRTaG93RXh0ZXJuYWxOb3RpZmljYXRpb24oKSlyZXR1cm47CiAgICB2YXIgaWQ9ZGF0YSYmZGF0YS5pZHx8ZGF0YSYmZGF0YS5zZXF1ZW5jZXx8RGF0ZS5ub3coKTsKICAgIGlmKHdhc0V4dGVybmFsTm90aWZpY2F0aW9uU2hvd24odHlwZSxpZCkpcmV0dXJuOwogICAgbWFya0V4dGVybmFsTm90aWZpY2F0aW9uU2hvd24odHlwZSxpZCk7CiAgICB0cnl7CiAgICAgIHZhciBpc0JhcnVpPXR5cGU9PT0nYmFydWknOwogICAgICB2YXIgdGl0bGU9aXNCYXJ1aT8nQkFSVUkgLSBVcFN0YXR1cyc6J1VwU3RhdHVzIC0gQ2hhdCBkYSBlcXVpcGUnOwogICAgICB2YXIgYm9keT1pc0JhcnVpCiAgICAgICAgP1N0cmluZyhkYXRhLnNlbmRlcnx8J0FsZ3XDqW0nKSsnIGVzdMOhIGNoYW1hbmRvIHZvY8OqLicKICAgICAgICA6U3RyaW5nKGRhdGEudXNlcnx8J0FsZ3XDqW0nKSsnIGVudmlvdSB1bWEgbWVuc2FnZW0gbm8gY2hhdC4nOwogICAgICB2YXIgbj1uZXcgVXBOYXRpdmVOb3RpZmljYXRpb24odGl0bGUse2JvZHk6Ym9keSxpY29uOnVwU3RhdHVzTm90aWZpY2F0aW9uSWNvbigpLGJhZGdlOnVwU3RhdHVzTm90aWZpY2F0aW9uSWNvbigpLHRhZzondXBzdGF0dXMtJyt0eXBlKyctJytTdHJpbmcoaWQpLHJlbm90aWZ5OnRydWUscmVxdWlyZUludGVyYWN0aW9uOmlzQmFydWl9KTsKICAgICAgbi5vbmNsaWNrPWZ1bmN0aW9uKCl7CiAgICAgICAgdHJ5e3dpbmRvdy5mb2N1cygpfWNhdGNoKGUpe30KICAgICAgICB0cnl7aWYodHlwZT09PSdjaGF0JylvcGVuQ2hhdCgpO31jYXRjaChlKXt9CiAgICAgICAgdHJ5e24uY2xvc2UoKTt9Y2F0Y2goZSl7fQogICAgICB9OwogICAgfWNhdGNoKGUpewogICAgICAvLyBTZSBvIG5hdmVnYWRvciByZWN1c2FyIG8gw61jb25lIGV4dGVybm8sIHRlbnRhIG5vdmFtZW50ZSBzZW0gbyDDrWNvbmUuCiAgICAgIHRyeXsKICAgICAgICB2YXIgaXNCYXJ1aTI9dHlwZT09PSdiYXJ1aSc7CiAgICAgICAgdmFyIHRpdGxlMj1pc0JhcnVpMj8nQkFSVUkgLSBVcFN0YXR1cyc6J1VwU3RhdHVzIC0gQ2hhdCBkYSBlcXVpcGUnOwogICAgICAgIHZhciBib2R5Mj1pc0JhcnVpMj9TdHJpbmcoZGF0YS5zZW5kZXJ8fCdBbGd1w6ltJykrJyBlc3TDoSBjaGFtYW5kbyB2b2PDqi4nOlN0cmluZyhkYXRhLnVzZXJ8fCdBbGd1w6ltJykrJyBlbnZpb3UgdW1hIG1lbnNhZ2VtIG5vIGNoYXQuJzsKICAgICAgICB2YXIgbjI9bmV3IFVwTmF0aXZlTm90aWZpY2F0aW9uKHRpdGxlMix7Ym9keTpib2R5Mix0YWc6J3Vwc3RhdHVzLScrdHlwZSsnLScrU3RyaW5nKGlkKSxyZW5vdGlmeTp0cnVlLHJlcXVpcmVJbnRlcmFjdGlvbjppc0JhcnVpMn0pOwogICAgICAgIG4yLm9uY2xpY2s9ZnVuY3Rpb24oKXt0cnl7d2luZG93LmZvY3VzKCl9Y2F0Y2goZSl7fTt0cnl7aWYodHlwZT09PSdjaGF0JylvcGVuQ2hhdCgpfWNhdGNoKGUpe307dHJ5e24yLmNsb3NlKCl9Y2F0Y2goZSl7fX07CiAgICAgIH1jYXRjaChpZ25vcmUpe30KICAgIH0KICB9CgogIGZ1bmN0aW9uIHByb2Nlc3NDaGF0Tm90aWZpY2F0aW9ucyhtZXNzYWdlcyl7CiAgICB2YXIgbWVudGlvbnM9KG1lc3NhZ2VzfHxbXSkuZmlsdGVyKGZ1bmN0aW9uKG0pe3JldHVybiBtLnVzZXIhPT1tZW1iZXImJm0ubWVudGlvbnMmJm0ubWVudGlvbnMuaW5kZXhPZihtZW1iZXIpPj0wO30pOwogICAgaWYoIWNoYXRJbml0aWFsaXplZCl7CiAgICAgIChtZXNzYWdlc3x8W10pLmZvckVhY2goZnVuY3Rpb24obSl7c2Vlbk1lbnRpb25JZHNbbS5pZF09dHJ1ZTt9KTsKICAgICAgbWVudGlvbnMuZm9yRWFjaChmdW5jdGlvbihtKXtzZWVuTWVudGlvbklkc1snbWVudGlvbjonK20uaWRdPXRydWU7fSk7CiAgICAgIGNoYXRJbml0aWFsaXplZD10cnVlOwogICAgICByZXR1cm47CiAgICB9CiAgICB2YXIgbmV3TWVudGlvbj1mYWxzZTsKICAgIChtZXNzYWdlc3x8W10pLmZvckVhY2goZnVuY3Rpb24obSl7CiAgICAgIGlmKG0udHlwZT09PSdzeXN0ZW0nKXJldHVybjsKICAgICAgaWYoIXNlZW5NZW50aW9uSWRzW20uaWRdKXsKICAgICAgICBzZWVuTWVudGlvbklkc1ttLmlkXT10cnVlOwogICAgICAgIGlmKG0udXNlciE9PW1lbWJlciYmc2hvdWxkTm90aWZ5Rm9yQ2hhdCgpKXsKICAgICAgICAgIHNob3dDaGF0VG9hc3QobSk7CiAgICAgICAgICBpZihpc1RlYW1DaGF0TWVzc2FnZShtKSlzaG93RXh0ZXJuYWxOb3RpZmljYXRpb24oJ2NoYXQnLG0pOwogICAgICAgIH0KICAgICAgfQogICAgfSk7CiAgICBtZW50aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKG0pewogICAgICBpZighc2Vlbk1lbnRpb25JZHNbJ21lbnRpb246JyttLmlkXSl7CiAgICAgICAgc2Vlbk1lbnRpb25JZHNbJ21lbnRpb246JyttLmlkXT10cnVlOwogICAgICAgIG5ld01lbnRpb249dHJ1ZTsKICAgICAgfQogICAgfSk7CiAgICBpZihuZXdNZW50aW9uKXBsYXlNZW50aW9uQWxlcnQoKTsKICB9CgogIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ1VQU1RBVFVTX0VYVEVSTkFMX05PVElGSUNBVElPTl9DTElDSycsZnVuY3Rpb24oZSl7CiAgICB0cnl7d2luZG93LmZvY3VzKCl9Y2F0Y2goZXJyKXt9CiAgICB0cnl7dmFyIGQ9ZS5kZXRhaWx8fHt9O2lmKGQudHlwZT09PSdiYXJ1aScpe2J1YmJsZS5jbGFzc0xpc3QuYWRkKCd1cC1iYXJ1aS1hY3RpdmUnKTt9ZWxzZXtvcGVuQ2hhdCgpO319Y2F0Y2goZXJyKXt9CiAgfSk7CgogIGZ1bmN0aW9uIGFic29sdXRlU2VydmVyVXJsKHJvdXRlKXtyZXR1cm4gL15odHRwcz86XC9cLy9pLnRlc3Qocm91dGV8fCcnKT9yb3V0ZTpzZXJ2ZXIrU3RyaW5nKHJvdXRlfHwnJyk7fQogIGZ1bmN0aW9uIGxvYWRCbG9iVXJsKHJvdXRlLGNhY2hlS2V5KXsKICAgIHZhciBrZXk9Y2FjaGVLZXl8fHJvdXRlO2lmKG1lZGlhQmxvYkNhY2hlW2tleV0pcmV0dXJuIFByb21pc2UucmVzb2x2ZShtZWRpYUJsb2JDYWNoZVtrZXldKTsKICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7R01feG1saHR0cFJlcXVlc3Qoe21ldGhvZDonR0VUJyx1cmw6YWJzb2x1dGVTZXJ2ZXJVcmwocm91dGUpLHJlc3BvbnNlVHlwZTonYmxvYicsb25sb2FkOmZ1bmN0aW9uKHIpe2lmKHIuc3RhdHVzPj00MDApe3JlamVjdChuZXcgRXJyb3IoJ0FycXVpdm8gbsOjbyBlbmNvbnRyYWRvLicpKTtyZXR1cm47fXRyeXt2YXIgdT1VUkwuY3JlYXRlT2JqZWN0VVJMKHIucmVzcG9uc2UpO21lZGlhQmxvYkNhY2hlW2tleV09dTtyZXNvbHZlKHUpO31jYXRjaChlKXtyZWplY3QoZSk7fX0sb25lcnJvcjpmdW5jdGlvbigpe3JlamVjdChuZXcgRXJyb3IoJ07Do28gZm9pIHBvc3PDrXZlbCBjYXJyZWdhciBvIGFycXVpdm8uJykpO319KTt9KTsKICB9CiAgdmFyIHByb2ZpbGVzTG9hZGVkQXQ9MDsKICBmdW5jdGlvbiBsb2FkUHJvZmlsZXMoZm9yY2UpewogICAgaWYoIXRva2VuKXJldHVybiBQcm9taXNlLnJlc29sdmUoKTsKICAgIGlmKCFmb3JjZSAmJiBEYXRlLm5vdygpLXByb2ZpbGVzTG9hZGVkQXQ8MzAwMDApcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpOwogICAgcmV0dXJuIGFwaSgnR0VUJywnL2FwaS9wcm9maWxlcycpLnRoZW4oZnVuY3Rpb24oZCl7cHJvZmlsZUNhY2hlPWQucHJvZmlsZXN8fHt9O3Byb2ZpbGVzTG9hZGVkQXQ9RGF0ZS5ub3coKTt9KS5jYXRjaChmdW5jdGlvbigpe30pOwogIH0KICBmdW5jdGlvbiB1cGRhdGVCdWJibGVBdmF0YXIoZm9yY2UpewogICAgaWYoIWltZylyZXR1cm47CiAgICBpZighbWVtYmVyKXtpbWcuc3JjPXByb2ZpbGVGYWxsYmFjaygpO3JldHVybjt9CiAgICBoeWRyYXRlQXZhdGFyKGltZyxtZW1iZXIpOwogICAgaWYodG9rZW4pbG9hZFByb2ZpbGVzKCEhZm9yY2UpLnRoZW4oZnVuY3Rpb24oKXtoeWRyYXRlQXZhdGFyKGltZyxtZW1iZXIpO30pOwogIH0KICBmdW5jdGlvbiBwcm9maWxlRmFsbGJhY2soKXtyZXR1cm4gJ2RhdGE6aW1hZ2Uvc3ZnK3htbDtjaGFyc2V0PXV0Zi04LCcrZW5jb2RlVVJJQ29tcG9uZW50KCc8c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0Ij48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHJ4PSIzMiIgZmlsbD0iIzI3MzI0NyIvPjxjaXJjbGUgY3g9IjMyIiBjeT0iMjQiIHI9IjExIiBmaWxsPSIjOWFhOGJjIi8+PHBhdGggZD0iTTEyIDU2YzMtMTMgMTEtMTkgMjAtMTlzMTcgNiAyMCAxOSIgZmlsbD0iIzlhYThiYyIvPjwvc3ZnPicpO30KICBmdW5jdGlvbiBoeWRyYXRlQXZhdGFyKGltZyxuYW1lKXt2YXIgY2FjaGVLZXk9J3Byb2ZpbGU6JytuYW1lO3ZhciByb3V0ZT1wcm9maWxlQ2FjaGVbbmFtZV18fEdNX2dldFZhbHVlKGtleStjYWNoZUtleSwnJyk7aWYoIXJvdXRlKXtpbWcuc3JjPXByb2ZpbGVGYWxsYmFjaygpO3JldHVybjt9dmFyIGNhY2hlZFJvdXRlPUdNX2dldFZhbHVlKGtleStjYWNoZUtleSwnJyk7aWYoY2FjaGVkUm91dGUhPT1yb3V0ZSl7aWYobWVkaWFCbG9iQ2FjaGVbY2FjaGVLZXldKXt0cnl7VVJMLnJldm9rZU9iamVjdFVSTChtZWRpYUJsb2JDYWNoZVtjYWNoZUtleV0pO31jYXRjaChlKXt9ZGVsZXRlIG1lZGlhQmxvYkNhY2hlW2NhY2hlS2V5XTt9R01fc2V0VmFsdWUoa2V5K2NhY2hlS2V5LHJvdXRlKTt9bG9hZEJsb2JVcmwocm91dGUsY2FjaGVLZXkpLnRoZW4oZnVuY3Rpb24odXJsKXtpbWcuc3JjPXVybDt9KS5jYXRjaChmdW5jdGlvbigpe2ltZy5zcmM9cHJvZmlsZUZhbGxiYWNrKCk7fSk7fQoKICBmdW5jdGlvbiBjaGF0RGF0YUtleShtZXNzYWdlcyl7cmV0dXJuIChtZXNzYWdlc3x8W10pLm1hcChmdW5jdGlvbihtKXtyZXR1cm4gW20uaWQsbS5jcmVhdGVkQXQsbS5tZXNzYWdlLG0udHlwZSxtLnN5c3RlbVR5cGV8fCcnLG0uaW1hZ2VVcmwsSlNPTi5zdHJpbmdpZnkobS5yZXBseVRvfHxudWxsKSxKU09OLnN0cmluZ2lmeShtLnJlYWN0aW9uc3x8e30pLEpTT04uc3RyaW5naWZ5KG0ucmVhZEJ5fHxbXSldLmpvaW4oJ34nKTt9KS5qb2luKCd8Jyk7fQogIGZ1bmN0aW9uIHJlYWx0aW1lTWVzc2FnZShyZWNvcmQpewogICAgaWYoIXJlY29yZHx8IXJlY29yZC5pZClyZXR1cm4gbnVsbDsKICAgIHJldHVybiB7CiAgICAgIGlkOlN0cmluZyhyZWNvcmQuaWQpLHVzZXI6U3RyaW5nKHJlY29yZC51c2VyX25hbWV8fCcnKSxtZXNzYWdlOlN0cmluZyhyZWNvcmQubWVzc2FnZXx8JycpLHR5cGU6U3RyaW5nKHJlY29yZC50eXBlfHwndGV4dCcpLAogICAgICBzeXN0ZW1UeXBlOlN0cmluZyhyZWNvcmQuc3lzdGVtX3R5cGV8fCcnKSxjcmVhdGVkQXQ6cmVjb3JkLmNyZWF0ZWRfYXR8fG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxpbWFnZVVybDpTdHJpbmcocmVjb3JkLmltYWdlX3VybHx8JycpLAogICAgICBtZW50aW9uczpBcnJheS5pc0FycmF5KHJlY29yZC5tZW50aW9ucyk/cmVjb3JkLm1lbnRpb25zOltdLHJlcGx5VG86cmVjb3JkLnJlcGx5X3RvfHxudWxsLHJlYWN0aW9uczpyZWNvcmQucmVhY3Rpb25zfHx7fSxyZWFkQnk6W10KICAgIH07CiAgfQogIGZ1bmN0aW9uIHVwc2VydFJlYWx0aW1lTWVzc2FnZShyZWNvcmQpewogICAgdmFyIG09cmVhbHRpbWVNZXNzYWdlKHJlY29yZCk7aWYoIW0pcmV0dXJuOwogICAgdmFyIGlkeD1jaGF0Q2FjaGUuZmluZEluZGV4KGZ1bmN0aW9uKHgpe3JldHVybiBTdHJpbmcoeC5pZCk9PT1tLmlkO30pOwogICAgaWYoaWR4PDApewogICAgICBpZHg9Y2hhdENhY2hlLmZpbmRJbmRleChmdW5jdGlvbih4KXsKICAgICAgICBpZigheC5vcHRpbWlzdGljfHx4LnVzZXIhPT1tLnVzZXJ8fHgubWVzc2FnZSE9PW0ubWVzc2FnZXx8eC50eXBlIT09bS50eXBlKXJldHVybiBmYWxzZTsKICAgICAgICBpZihKU09OLnN0cmluZ2lmeSh4LnJlcGx5VG98fG51bGwpIT09SlNPTi5zdHJpbmdpZnkobS5yZXBseVRvfHxudWxsKSlyZXR1cm4gZmFsc2U7CiAgICAgICAgaWYoU3RyaW5nKHguaW1hZ2VVcmx8fCcnKSE9PVN0cmluZyhtLmltYWdlVXJsfHwnJykpcmV0dXJuIGZhbHNlOwogICAgICAgIHZhciB0MT1EYXRlLnBhcnNlKHguY3JlYXRlZEF0KXx8MCx0Mj1EYXRlLnBhcnNlKG0uY3JlYXRlZEF0KXx8MDsKICAgICAgICByZXR1cm4gTWF0aC5hYnModDItdDEpPDE1MDAwOwogICAgICB9KTsKICAgICAgaWYoaWR4Pj0wKXtjaGF0Q2FjaGVbaWR4XT1PYmplY3QuYXNzaWduKHt9LGNoYXRDYWNoZVtpZHhdLG0pO2RlbGV0ZSBjaGF0Q2FjaGVbaWR4XS5vcHRpbWlzdGljO30KICAgIH1lbHNlewogICAgICBjaGF0Q2FjaGVbaWR4XT1PYmplY3QuYXNzaWduKHt9LGNoYXRDYWNoZVtpZHhdLG0pOwogICAgfQogICAgaWYoaWR4PDApe2NoYXRDYWNoZS5wdXNoKG0pO2NoYXRDYWNoZS5zb3J0KGZ1bmN0aW9uKGEsYil7cmV0dXJuIERhdGUucGFyc2UoYS5jcmVhdGVkQXQpLURhdGUucGFyc2UoYi5jcmVhdGVkQXQpO30pO30KICAgIGlmKG0uc3lzdGVtVHlwZT09PSdsdWNjYV9qb2luJyl1cGRhdGVMdWNjYVByZXNlbmNlKHRydWUpOwogICAgaWYobS5zeXN0ZW1UeXBlPT09J2x1Y2NhX2xlYXZlJyl1cGRhdGVMdWNjYVByZXNlbmNlKGZhbHNlKTsKICAgIGlmKGlkeDwwKXByb2Nlc3NDaGF0Tm90aWZpY2F0aW9ucyhbbV0pOwogICAgaWYoIWNoYXQuY2xhc3NMaXN0LmNvbnRhaW5zKCdoaWRkZW4nKSl7cmVuZGVyQ2hhdCgpO21hcmtWaXNpYmxlQ2hhdFJlYWQoKTt9CiAgICBlbHNlIGlmKGlkeDwwJiZtLnVzZXIhPT1tZW1iZXImJm0udHlwZSE9PSdzeXN0ZW0nKXNldFVucmVhZChjaGF0VW5yZWFkKzEpOwogICAgdmFyIG5ld2VzdD1jaGF0Q2FjaGVbY2hhdENhY2hlLmxlbmd0aC0xXTtpZihuZXdlc3QmJm5ld2VzdC5jcmVhdGVkQXQpY2hhdEZhc3RTaW5jZT1uZXdlc3QuY3JlYXRlZEF0OwogIH0KICBmdW5jdGlvbiBoYW5kbGVSZWFsdGltZURlbGV0ZShyZWNvcmQpewogICAgdmFyIGlkPXJlY29yZCYmcmVjb3JkLmlkIT1udWxsP1N0cmluZyhyZWNvcmQuaWQpOicnO2lmKCFpZClyZXR1cm47CiAgICB2YXIgYmVmb3JlPWNoYXRDYWNoZS5sZW5ndGg7Y2hhdENhY2hlPWNoYXRDYWNoZS5maWx0ZXIoZnVuY3Rpb24obSl7cmV0dXJuIFN0cmluZyhtLmlkKSE9PWlkO30pOwogICAgaWYoY2hhdENhY2hlLmxlbmd0aCE9PWJlZm9yZSYmIWNoYXQuY2xhc3NMaXN0LmNvbnRhaW5zKCdoaWRkZW4nKSlyZW5kZXJDaGF0KCk7CiAgfQogIGZ1bmN0aW9uIHN0YXJ0UmVhbHRpbWUoKXsKICAgIGlmKCF0b2tlbnx8cmVhbHRpbWVDbGllbnR8fHR5cGVvZiBzdXBhYmFzZT09PSd1bmRlZmluZWQnfHwhc3VwYWJhc2UuY3JlYXRlQ2xpZW50KXJldHVybjsKICAgIHRyeXsKICAgICAgcmVhbHRpbWVDbGllbnQ9c3VwYWJhc2UuY3JlYXRlQ2xpZW50KFVQX1JFQUxUSU1FX1VSTCxVUF9SRUFMVElNRV9LRVkse2F1dGg6e3BlcnNpc3RTZXNzaW9uOmZhbHNlfX0pOwogICAgICByZWFsdGltZUNoYW5uZWw9cmVhbHRpbWVDbGllbnQuY2hhbm5lbChVUF9SRUFMVElNRV9UT1BJQyk7CiAgICAgIHJlYWx0aW1lQ2hhbm5lbAogICAgICAgIC5vbignYnJvYWRjYXN0Jyx7ZXZlbnQ6J2RiX2NoYW5nZSd9LGZ1bmN0aW9uKHBheWxvYWQpewogICAgICAgICAgdmFyIHA9cGF5bG9hZCYmcGF5bG9hZC5wYXlsb2FkfHx7fTsKICAgICAgICAgIHZhciByZWNvcmQ9cC5yZWNvcmQ7CiAgICAgICAgICBpZighcmVjb3JkKXJldHVybjsKICAgICAgICAgIGlmKHAub3A9PT0nREVMRVRFJyloYW5kbGVSZWFsdGltZURlbGV0ZShyZWNvcmQpOwogICAgICAgICAgZWxzZSB1cHNlcnRSZWFsdGltZU1lc3NhZ2UocmVjb3JkKTsKICAgICAgICB9KQogICAgICAgIC5vbignYnJvYWRjYXN0Jyx7ZXZlbnQ6J3VzZXJfc3RhdHVzJ30sZnVuY3Rpb24oKXtyZWZyZXNoKCk7fSkKICAgICAgICAub24oJ2Jyb2FkY2FzdCcse2V2ZW50OidjaGF0X3ByZXNlbmNlJ30sZnVuY3Rpb24ocGF5bG9hZCl7dmFyIHA9cGF5bG9hZCYmcGF5bG9hZC5wYXlsb2FkfHx7fTtpZighcC5uYW1lKXJldHVybjtjaGF0UHJlc2VuY2VbcC5uYW1lXT1wLm9wZW4/RGF0ZS5ub3coKSsyNTAwMDowO2lmKCFjaGF0LmNsYXNzTGlzdC5jb250YWlucygnaGlkZGVuJykpcmVuZGVyQ2hhdCgpO30pCiAgICAgICAgLm9uKCdicm9hZGNhc3QnLHtldmVudDoncmVtb3RlX2NvbW1hbmQnfSxmdW5jdGlvbihwYXlsb2FkKXsKICAgICAgICAgIHZhciBjPXBheWxvYWQmJnBheWxvYWQucGF5bG9hZCYmcGF5bG9hZC5wYXlsb2FkLmNvbW1hbmQ7CiAgICAgICAgICBpZihjJiZjLnRhcmdldD09PW1lbWJlcilleGVjdXRlUmVtb3RlQ29tbWFuZChjKTsKICAgICAgICB9KQogICAgICAgIC5vbignYnJvYWRjYXN0Jyx7ZXZlbnQ6J3JlbW90ZV9yZXN1bHQnfSxmdW5jdGlvbihwYXlsb2FkKXsKICAgICAgICAgIHZhciByPXBheWxvYWQmJnBheWxvYWQucGF5bG9hZCYmcGF5bG9hZC5wYXlsb2FkLnJlc3VsdDsKICAgICAgICAgIGlmKHImJnIuY29tbWFuZElkJiZyLnNlbmRlcj09PW1lbWJlcil7CiAgICAgICAgICAgIHJlbW90ZVJlc3VsdENhY2hlW1N0cmluZyhyLmNvbW1hbmRJZCldPXI7CiAgICAgICAgICAgIHZhciB3YWl0ZXI9cmVtb3RlUmVzdWx0V2FpdGVyc1tTdHJpbmcoci5jb21tYW5kSWQpXTsKICAgICAgICAgICAgaWYod2FpdGVyKXdhaXRlcihyKTsKICAgICAgICAgIH0KICAgICAgICB9KQogICAgICAgIC5zdWJzY3JpYmUoZnVuY3Rpb24oc3RhdHVzKXsKICAgICAgICAgIGlmKHN0YXR1cz09PSdTVUJTQ1JJQkVEJyl7cmVhbHRpbWVBY3RpdmU9dHJ1ZTtpZihyZWFsdGltZVJldHJ5VGltZXIpe2NsZWFyVGltZW91dChyZWFsdGltZVJldHJ5VGltZXIpO3JlYWx0aW1lUmV0cnlUaW1lcj1udWxsO31icm9hZGNhc3RDaGF0UHJlc2VuY2UoIWNoYXQuY2xhc3NMaXN0LmNvbnRhaW5zKCdoaWRkZW4nKSk7cmV0dXJuO30KICAgICAgICAgIGlmKHN0YXR1cz09PSdDSEFOTkVMX0VSUk9SJ3x8c3RhdHVzPT09J1RJTUVEX09VVCd8fHN0YXR1cz09PSdDTE9TRUQnKXsKICAgICAgICAgICAgcmVhbHRpbWVBY3RpdmU9ZmFsc2U7CiAgICAgICAgICAgIHRyeXtpZihyZWFsdGltZUNoYW5uZWwpcmVhbHRpbWVDaGFubmVsLnVuc3Vic2NyaWJlKCk7fWNhdGNoKGUpe30KICAgICAgICAgICAgcmVhbHRpbWVDaGFubmVsPW51bGw7cmVhbHRpbWVDbGllbnQ9bnVsbDsKICAgICAgICAgICAgaWYoIXJlYWx0aW1lUmV0cnlUaW1lcilyZWFsdGltZVJldHJ5VGltZXI9c2V0VGltZW91dChmdW5jdGlvbigpe3JlYWx0aW1lUmV0cnlUaW1lcj1udWxsO3N0YXJ0UmVhbHRpbWUoKTt9LDMwMDApOwogICAgICAgICAgfQogICAgICAgIH0pOwogICAgfWNhdGNoKGUpewogICAgICByZWFsdGltZUFjdGl2ZT1mYWxzZTtyZWFsdGltZUNoYW5uZWw9bnVsbDtyZWFsdGltZUNsaWVudD1udWxsOwogICAgICBpZighcmVhbHRpbWVSZXRyeVRpbWVyKXJlYWx0aW1lUmV0cnlUaW1lcj1zZXRUaW1lb3V0KGZ1bmN0aW9uKCl7cmVhbHRpbWVSZXRyeVRpbWVyPW51bGw7c3RhcnRSZWFsdGltZSgpO30sNTAwMCk7CiAgICB9CiAgfQogIGZ1bmN0aW9uIGJyb2FkY2FzdENoYXRQcmVzZW5jZShvcGVuKXsKICAgIGlmKCFtZW1iZXIpcmV0dXJuOwogICAgY2hhdFByZXNlbmNlW21lbWJlcl09b3Blbj9EYXRlLm5vdygpKzI1MDAwOjA7CiAgICBpZighcmVhbHRpbWVBY3RpdmV8fCFyZWFsdGltZUNoYW5uZWwpcmV0dXJuOwogICAgdHJ5e3JlYWx0aW1lQ2hhbm5lbC5zZW5kKHt0eXBlOidicm9hZGNhc3QnLGV2ZW50OidjaGF0X3ByZXNlbmNlJyxwYXlsb2FkOntuYW1lOm1lbWJlcixvcGVuOiEhb3Blbn19KTt9Y2F0Y2goZSl7fQogIH0KICBmdW5jdGlvbiBzdG9wUmVhbHRpbWUoKXsKICAgIHJlYWx0aW1lQWN0aXZlPWZhbHNlOwogICAgaWYocmVhbHRpbWVSZXRyeVRpbWVyKXtjbGVhclRpbWVvdXQocmVhbHRpbWVSZXRyeVRpbWVyKTtyZWFsdGltZVJldHJ5VGltZXI9bnVsbDt9CiAgICB0cnl7aWYocmVhbHRpbWVDaGFubmVsKXJlYWx0aW1lQ2hhbm5lbC51bnN1YnNjcmliZSgpO31jYXRjaChlKXt9CiAgICB0cnl7aWYocmVhbHRpbWVDbGllbnQpcmVhbHRpbWVDbGllbnQucmVtb3ZlQWxsQ2hhbm5lbHMoKTt9Y2F0Y2goZSl7fQogICAgcmVhbHRpbWVDaGFubmVsPW51bGw7cmVhbHRpbWVDbGllbnQ9bnVsbDsKICB9CiAgZnVuY3Rpb24gdXBkYXRlTHVjY2FQcmVzZW5jZShhY3RpdmUpewogICAgbHVjY2FPbmxpbmU9ISFhY3RpdmU7CiAgICBpZihxdWlja0NoYXRCdWJibGUpcXVpY2tDaGF0QnViYmxlLmNsYXNzTGlzdC50b2dnbGUoJ2x1Y2NhLWFjdGl2ZScsbHVjY2FPbmxpbmUpOwogICAgdmFyIG1haW5DaGF0QnRuPWNhcmQucXVlcnlTZWxlY3RvcignLnVwLWNoYXQtYnRuJyk7CiAgICBpZihtYWluQ2hhdEJ0biltYWluQ2hhdEJ0bi5jbGFzc0xpc3QudG9nZ2xlKCdsdWNjYS1hY3RpdmUnLGx1Y2NhT25saW5lKTsKICAgIHZhciBhbGVydD1jaGF0LnF1ZXJ5U2VsZWN0b3IoJy51cC1jaGF0LWx1Y2NhLWFsZXJ0Jyk7CiAgICBpZihhbGVydClhbGVydC5jbGFzc0xpc3QudG9nZ2xlKCdoaWRkZW4nLCFsdWNjYU9ubGluZSk7CiAgICB2YXIgbmFtZXM9QXJyYXkuaXNBcnJheSh3aW5kb3cuX191cHN0YXR1c01lbWJlcnMpP3dpbmRvdy5fX3Vwc3RhdHVzTWVtYmVycy5zbGljZSgpOlsnUmljYXJkbycsJ0xvaGFuJywnR3VpbGhlcm1lJ107CiAgICBuYW1lcz1uYW1lcy5maWx0ZXIoZnVuY3Rpb24obil7cmV0dXJuIG4hPT0nTHVjY2EnO30pOwogICAgaWYobHVjY2FPbmxpbmUpbmFtZXMucHVzaCgnTHVjY2EnKTsKICAgIHdpbmRvdy5fX3Vwc3RhdHVzTWVtYmVycz1uYW1lczsKICB9CiAgZnVuY3Rpb24gcGxheUx1Y2NhRW50cnlTb3VuZCgpe3RyeXt2YXIgYT1uZXcgQXVkaW8oc2VydmVyKycvbHVjY2EtZGV2aWwtbGF1Z2gud2F2PycrRGF0ZS5ub3coKSk7YS52b2x1bWU9Ljc7dmFyIHA9YS5wbGF5KCk7aWYocCYmcC5jYXRjaClwLmNhdGNoKGZ1bmN0aW9uKCl7fSk7fWNhdGNoKGUpe319CiAgZnVuY3Rpb24gbG9hZENoYXQoZm9yY2VGdWxsKXsKICAgIGlmKCF0b2tlbnx8Y2hhdExvYWRpbmcpcmV0dXJuOwogICAgaWYocmVhbHRpbWVBY3RpdmUmJiFmb3JjZUZ1bGwpcmV0dXJuOwogICAgY2hhdExvYWRpbmc9dHJ1ZTsKICAgIHZhciB1c2VGYXN0PSFmb3JjZUZ1bGwmJmNoYXRDYWNoZS5sZW5ndGg+MCYmY2hhdEZhc3RTaW5jZTsKICAgIHZhciByb3V0ZT0nL2FwaS9jaGF0JzsKICAgIGlmKHVzZUZhc3Qpcm91dGU9Jy9hcGkvY2hhdD9mYXN0PTEmc2luY2U9JytlbmNvZGVVUklDb21wb25lbnQobmV3IERhdGUobmV3IERhdGUoY2hhdEZhc3RTaW5jZSkuZ2V0VGltZSgpLTIwMDApLnRvSVNPU3RyaW5nKCkpOwogICAgYXBpKCdHRVQnLHJvdXRlKS50aGVuKGZ1bmN0aW9uKGQpewogICAgICB2YXIgaW5jb21pbmc9ZC5tZXNzYWdlc3x8W10sbmV4dE1lc3NhZ2VzOwogICAgICBpZih1c2VGYXN0KXsKICAgICAgICB2YXIgYnlJZD17fTsKICAgICAgICBjaGF0Q2FjaGUuZm9yRWFjaChmdW5jdGlvbihtKXtieUlkW20uaWRdPW07fSk7CiAgICAgICAgaW5jb21pbmcuZm9yRWFjaChmdW5jdGlvbihtKXtieUlkW20uaWRdPW07fSk7CiAgICAgICAgbmV4dE1lc3NhZ2VzPU9iamVjdC5rZXlzKGJ5SWQpLm1hcChmdW5jdGlvbihrKXtyZXR1cm4gYnlJZFtrXTt9KS5zb3J0KGZ1bmN0aW9uKGEsYil7cmV0dXJuIERhdGUucGFyc2UoYS5jcmVhdGVkQXQpLURhdGUucGFyc2UoYi5jcmVhdGVkQXQpO30pOwogICAgICB9ZWxzZXsKICAgICAgICBuZXh0TWVzc2FnZXM9aW5jb21pbmc7CiAgICAgIH0KICAgICAgdXBkYXRlTHVjY2FQcmVzZW5jZSghIWQubHVjY2FPbmxpbmUpOwogICAgICB2YXIgbGF0ZXN0THVjY2FKb2luPW51bGw7CiAgICAgIGZvcih2YXIgbGk9bmV4dE1lc3NhZ2VzLmxlbmd0aC0xO2xpPj0wO2xpLS0pe2lmKG5leHRNZXNzYWdlc1tsaV0udHlwZT09PSdzeXN0ZW0nJiZuZXh0TWVzc2FnZXNbbGldLnN5c3RlbVR5cGU9PT0nbHVjY2Ffam9pbicpe2xhdGVzdEx1Y2NhSm9pbj1uZXh0TWVzc2FnZXNbbGldO2JyZWFrO319CiAgICAgIGlmKGxhdGVzdEx1Y2NhSm9pbil7aWYobGFzdEx1Y2NhSm9pbkV2ZW50SWQmJmxhdGVzdEx1Y2NhSm9pbi5pZCE9PWxhc3RMdWNjYUpvaW5FdmVudElkKXBsYXlMdWNjYUVudHJ5U291bmQoKTtsYXN0THVjY2FKb2luRXZlbnRJZD1sYXRlc3RMdWNjYUpvaW4uaWQ7fQogICAgICB2YXIgYmVmb3JlS2V5PWNoYXREYXRhS2V5KGNoYXRDYWNoZSk7CiAgICAgIGNoYXRDYWNoZT1uZXh0TWVzc2FnZXM7CiAgICAgIGlmKGQucHJvZmlsZXMpcHJvZmlsZUNhY2hlPWQucHJvZmlsZXM7CiAgICAgIHByb2Nlc3NDaGF0Tm90aWZpY2F0aW9ucyhpbmNvbWluZyk7CiAgICAgIHZhciBuZXdlc3Q9Y2hhdENhY2hlW2NoYXRDYWNoZS5sZW5ndGgtMV07CiAgICAgIGlmKG5ld2VzdCYmbmV3ZXN0LmNyZWF0ZWRBdCljaGF0RmFzdFNpbmNlPW5ld2VzdC5jcmVhdGVkQXQ7CiAgICAgIHZhciBjaGF0VmlzaWJsZT0hY2hhdC5jbGFzc0xpc3QuY29udGFpbnMoJ2hpZGRlbicpJiYhZG9jdW1lbnQuaGlkZGVuOwogICAgICBpZighdXNlRmFzdClzZXRVbnJlYWQoY2hhdFZpc2libGU/MDooZC51bnJlYWRDb3VudHx8MCkpOwogICAgICBlbHNlIGlmKGNoYXRWaXNpYmxlKXNldFVucmVhZCgwKTsKICAgICAgaWYoIWNoYXQuY2xhc3NMaXN0LmNvbnRhaW5zKCdoaWRkZW4nKSl7CiAgICAgICAgdmFyIG5leHRLZXk9Y2hhdERhdGFLZXkoY2hhdENhY2hlKTsKICAgICAgICBpZihuZXh0S2V5IT09YmVmb3JlS2V5KXsKICAgICAgICAgIHJlbmRlckNoYXQoKTsKICAgICAgICAgIG1hcmtWaXNpYmxlQ2hhdFJlYWQoKTsKICAgICAgICB9CiAgICAgICAgdXBkYXRlVHlwaW5nSW5kaWNhdG9yKGQudHlwaW5nfHxbXSk7CiAgICAgIH0KICAgIH0pLmNhdGNoKGZ1bmN0aW9uKCl7fSkuZmluYWxseShmdW5jdGlvbigpe2NoYXRMb2FkaW5nPWZhbHNlO30pOwogIH0KICBmdW5jdGlvbiB1cGRhdGVUeXBpbmdJbmRpY2F0b3IobmFtZXMpewogICAgdmFyIGJveD1jaGF0LnF1ZXJ5U2VsZWN0b3IoJy51cC1jaGF0LXR5cGluZycpO2lmKCFib3gpcmV0dXJuOwogICAgdmFyIGFjdGl2ZT0oQXJyYXkuaXNBcnJheShuYW1lcyk/bmFtZXM6W10pLmZpbHRlcihmdW5jdGlvbihuKXtyZXR1cm4gbiYmbiE9PW1lbWJlcjt9KTsKICAgIGlmKCFhY3RpdmUubGVuZ3RoKXtib3guY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7Ym94LmlubmVySFRNTD0nJztyZXR1cm47fQogICAgdmFyIHNob3duPWFjdGl2ZS5zbGljZSgwLDIpLGxhYmVsPXNob3duLmpvaW4oJyBlICcpKyhhY3RpdmUubGVuZ3RoPjI/JyBlIG1haXMgYWxndcOpbSc6JycpOwogICAgdmFyIGZpcnN0PXNob3duWzBdOwogICAgYm94LmlubmVySFRNTD0nPGltZyBjbGFzcz0idXAtY2hhdC10eXBpbmctYXZhdGFyIiBkYXRhLXR5cGluZy1hdmF0YXI9IicrZXNjKGZpcnN0KSsnIiBhbHQ9IicrZXNjKGZpcnN0KSsnIj48ZGl2IGNsYXNzPSJ1cC1jaGF0LXR5cGluZy1kb3RzIj48aT48L2k+PGk+PC9pPjxpPjwvaT48L2Rpdj48c3Bhbj4nK2VzYyhsYWJlbCkrJyBkaWdpdGFuZG88L3NwYW4+JzsKICAgIGJveC5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTsKICAgIHZhciBpbWc9Ym94LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLXR5cGluZy1hdmF0YXJdJyk7aWYoaW1nKWh5ZHJhdGVBdmF0YXIoaW1nLGZpcnN0KTsKICB9CiAgZnVuY3Rpb24gc2VuZFR5cGluZ1N0YXRlKGFjdGl2ZSl7aWYoIXRva2VufHwhbWVtYmVyKXJldHVybiBQcm9taXNlLnJlc29sdmUoKTtyZXR1cm4gYXBpKCdQT1NUJywnL2FwaS9jaGF0L3R5cGluZycse3R5cGluZzohIWFjdGl2ZX0pLmNhdGNoKGZ1bmN0aW9uKCl7fSk7fQogIGZ1bmN0aW9uIHBvbGxDaGF0VHlwaW5nKCl7aWYoIXRva2VufHxjaGF0LmNsYXNzTGlzdC5jb250YWlucygnaGlkZGVuJyl8fHR5cGluZ1BvbGxpbmcpcmV0dXJuO3R5cGluZ1BvbGxpbmc9dHJ1ZTthcGkoJ0dFVCcsJy9hcGkvY2hhdC90eXBpbmcnKS50aGVuKGZ1bmN0aW9uKGQpe3VwZGF0ZVR5cGluZ0luZGljYXRvcihkLnR5cGluZ3x8W10pO30pLmNhdGNoKGZ1bmN0aW9uKCl7fSkuZmluYWxseShmdW5jdGlvbigpe3R5cGluZ1BvbGxpbmc9ZmFsc2U7fSk7fQogIGZ1bmN0aW9uIHN0b3BUeXBpbmdIZWFydGJlYXQoKXtpZih0eXBpbmdIZWFydGJlYXQpe2NsZWFySW50ZXJ2YWwodHlwaW5nSGVhcnRiZWF0KTt0eXBpbmdIZWFydGJlYXQ9bnVsbDt9aWYodHlwaW5nU3RvcFRpbWVyKXtjbGVhclRpbWVvdXQodHlwaW5nU3RvcFRpbWVyKTt0eXBpbmdTdG9wVGltZXI9bnVsbDt9c2VuZFR5cGluZ1N0YXRlKGZhbHNlKTt9CiAgZnVuY3Rpb24gc3RhcnRUeXBpbmdIZWFydGJlYXQoKXtpZih0eXBpbmdIZWFydGJlYXQpcmV0dXJuO3NlbmRUeXBpbmdTdGF0ZSh0cnVlKTt0eXBpbmdIZWFydGJlYXQ9c2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXt2YXIgaW5wdXQ9Y2hhdC5xdWVyeVNlbGVjdG9yKCcudXAtY2hhdC1pbnB1dCcpO2lmKCFpbnB1dHx8Y2hhdC5jbGFzc0xpc3QuY29udGFpbnMoJ2hpZGRlbicpfHwhU3RyaW5nKGlucHV0LnZhbHVlfHwnJykudHJpbSgpKXtzdG9wVHlwaW5nSGVhcnRiZWF0KCk7cmV0dXJuO31zZW5kVHlwaW5nU3RhdGUodHJ1ZSk7fSwxNTAwKTt9CiAgZnVuY3Rpb24gaGFuZGxlVHlwaW5nSW5wdXQoKXt2YXIgaW5wdXQ9Y2hhdC5xdWVyeVNlbGVjdG9yKCcudXAtY2hhdC1pbnB1dCcpO2lmKCFpbnB1dClyZXR1cm47aWYoU3RyaW5nKGlucHV0LnZhbHVlfHwnJykudHJpbSgpKXtzdGFydFR5cGluZ0hlYXJ0YmVhdCgpO2lmKHR5cGluZ1N0b3BUaW1lciljbGVhclRpbWVvdXQodHlwaW5nU3RvcFRpbWVyKTt0eXBpbmdTdG9wVGltZXI9c2V0VGltZW91dChmdW5jdGlvbigpe3N0b3BUeXBpbmdIZWFydGJlYXQoKTt9LDQ1MDApO31lbHNlIHN0b3BUeXBpbmdIZWFydGJlYXQoKTt9CiAgZnVuY3Rpb24gbWFya1Zpc2libGVDaGF0UmVhZCgpe2lmKCF0b2tlbnx8Y2hhdC5jbGFzc0xpc3QuY29udGFpbnMoJ2hpZGRlbicpKXJldHVybjt2YXIgaWRzPWNoYXRDYWNoZS5maWx0ZXIoZnVuY3Rpb24obSl7cmV0dXJuIG0udXNlciE9PW1lbWJlcjt9KS5tYXAoZnVuY3Rpb24obSl7cmV0dXJuIG0uaWQ7fSk7aWYoIWlkcy5sZW5ndGgpcmV0dXJuO3ZhciBrPWlkcy5qb2luKCcsJyk7aWYoaz09PXJlYWRTZW50S2V5KXJldHVybjthcGkoJ1BPU1QnLCcvYXBpL2NoYXQvcmVhZCcse21lc3NhZ2VJZHM6aWRzfSkudGhlbihmdW5jdGlvbigpe3JlYWRTZW50S2V5PWs7c2V0VW5yZWFkKDApO30pLmNhdGNoKGZ1bmN0aW9uKCl7fSk7fQoKCiAgZnVuY3Rpb24gcmVwbHlQcmV2aWV3KG0pewogICAgaWYoIW18fCFtLnJlcGx5VG8pcmV0dXJuICcnOwogICAgdmFyIHI9bS5yZXBseVRvOwogICAgdmFyIHRleHQ9ci5tZXNzYWdlfHwoKHIudHlwZT09PSdpbWFnZSd8fHIudHlwZT09PSd2aWRlbyd8fHIudHlwZT09PSdhdWRpbycpPydBbmV4byc6JycpOwogICAgcmV0dXJuICc8ZGl2IGNsYXNzPSJ1cC1jaGF0LXF1b3RlZCI+PGI+Jytlc2Moci51c2VyfHwnJykrJzwvYj48c3Bhbj4nK2VzYyh0ZXh0LnNsaWNlKDAsMTIwKSkrJzwvc3Bhbj48L2Rpdj4nOwogIH0KICBmdW5jdGlvbiByZW5kZXJSZWFjdGlvbnMobSl7CiAgICB2YXIgcmVhY3Rpb25zPW0mJm0ucmVhY3Rpb25zJiZ0eXBlb2YgbS5yZWFjdGlvbnM9PT0nb2JqZWN0Jz9tLnJlYWN0aW9uczp7fTsKICAgIHJldHVybiBPYmplY3Qua2V5cyhyZWFjdGlvbnMpLm1hcChmdW5jdGlvbihlbSl7dmFyIHVzZXJzPUFycmF5LmlzQXJyYXkocmVhY3Rpb25zW2VtXSk/cmVhY3Rpb25zW2VtXTpbXTtpZighdXNlcnMubGVuZ3RoKXJldHVybiAnJzt2YXIgbWluZT11c2Vycy5pbmRleE9mKG1lbWJlcik+PTA7cmV0dXJuICc8YnV0dG9uIHR5cGU9ImJ1dHRvbiIgY2xhc3M9InVwLWNoYXQtcmVhY3Rpb24gJysobWluZT8nbWluZSc6JycpKyciIGRhdGEtcmVhY3Rpb249IicrZXNjKGVtKSsnIiB0aXRsZT0iJytlc2ModXNlcnMuam9pbignLCAnKSkrJyI+JytlbSsnICcrdXNlcnMubGVuZ3RoKyc8L2J1dHRvbj4nO30pLmpvaW4oJycpOwogIH0KICBmdW5jdGlvbiBzaG93Q2hhdFByb2ZpbGVIb3ZlcihpbWcsbmFtZSxlKXsKICAgIHZhciByb3V0ZT1wcm9maWxlQ2FjaGVbbmFtZV18fCcnOwogICAgdmFyIHNyYz1yb3V0ZT9tZWRpYUJsb2JDYWNoZVsncHJvZmlsZTonK25hbWVdOicnOwogICAgY2hhdFByb2ZpbGVIb3Zlci5pbm5lckhUTUw9JzxpbWcgYWx0PSIiPjxkaXYgY2xhc3M9InVwLWNoYXQtcHJvZmlsZS1ob3Zlci1uYW1lIj4nK2VzYyhuYW1lKSsnPC9kaXY+PGRpdiBjbGFzcz0idXAtY2hhdC1wcm9maWxlLWhvdmVyLXJvbGUiPk1lbWJybyBkYSBlcXVpcGU8L2Rpdj4nOwogICAgdmFyIHByZXZpZXdJbWc9Y2hhdFByb2ZpbGVIb3Zlci5xdWVyeVNlbGVjdG9yKCdpbWcnKTsKICAgIHByZXZpZXdJbWcuY2xhc3NOYW1lPWNoYXRBdmF0YXJQcmVzZW5jZShuYW1lKTsKICAgIHByZXZpZXdJbWcuc3JjPXNyY3x8cHJvZmlsZUZhbGxiYWNrKCk7CiAgICBjaGF0UHJvZmlsZUhvdmVyLmNsYXNzTGlzdC5hZGQoJ3Nob3cnKTsKICAgIHBvc2l0aW9uQ2hhdFByb2ZpbGVIb3ZlcihlKTsKICAgIGlmKHJvdXRlJiYhc3JjKXtsb2FkQmxvYlVybChyb3V0ZSwncHJvZmlsZTonK25hbWUpLnRoZW4oZnVuY3Rpb24odXJsKXtpZihjaGF0UHJvZmlsZUhvdmVyLmNsYXNzTGlzdC5jb250YWlucygnc2hvdycpKXByZXZpZXdJbWcuc3JjPXVybDt9KS5jYXRjaChmdW5jdGlvbigpe30pO30KICB9CiAgZnVuY3Rpb24gcG9zaXRpb25DaGF0UHJvZmlsZUhvdmVyKGUpewogICAgaWYoIWNoYXRQcm9maWxlSG92ZXIuY2xhc3NMaXN0LmNvbnRhaW5zKCdzaG93JykpcmV0dXJuOwogICAgdmFyIHBhZD0xMix3PWNoYXRQcm9maWxlSG92ZXIub2Zmc2V0V2lkdGh8fDE0OCxoPWNoYXRQcm9maWxlSG92ZXIub2Zmc2V0SGVpZ2h0fHwxMzA7CiAgICB2YXIgeD0oZS5jbGllbnRYfHwwKSsxNCx5PShlLmNsaWVudFl8fDApKzE0OwogICAgaWYoeCt3PndpbmRvdy5pbm5lcldpZHRoLXBhZCl4PShlLmNsaWVudFh8fDApLXctMTQ7CiAgICBpZih5K2g+d2luZG93LmlubmVySGVpZ2h0LXBhZCl5PShlLmNsaWVudFl8fDApLWgtMTQ7CiAgICB4PU1hdGgubWF4KHBhZCxNYXRoLm1pbih3aW5kb3cuaW5uZXJXaWR0aC13LXBhZCx4KSk7CiAgICB5PU1hdGgubWF4KHBhZCxNYXRoLm1pbih3aW5kb3cuaW5uZXJIZWlnaHQtaC1wYWQseSkpOwogICAgY2hhdFByb2ZpbGVIb3Zlci5zdHlsZS5sZWZ0PXgrJ3B4JztjaGF0UHJvZmlsZUhvdmVyLnN0eWxlLnRvcD15KydweCc7CiAgfQogIGZ1bmN0aW9uIGhpZGVDaGF0UHJvZmlsZUhvdmVyKCl7Y2hhdFByb2ZpbGVIb3Zlci5jbGFzc0xpc3QucmVtb3ZlKCdzaG93Jyk7Y2hhdFByb2ZpbGVIb3Zlci5pbm5lckhUTUw9Jyc7fQoKICBmdW5jdGlvbiBjaGF0QXZhdGFyUHJlc2VuY2UobmFtZSl7CiAgICB2YXIgdGVhbT13aW5kb3cuX191cHN0YXR1c1RlYW18fHt9LHBlcnNvbj10ZWFtW25hbWVdfHxPYmplY3Qua2V5cyh0ZWFtKS5tYXAoZnVuY3Rpb24oayl7cmV0dXJuIHRlYW1ba107fSkuZmluZChmdW5jdGlvbih4KXtyZXR1cm4geCYmeC5uYW1lPT09bmFtZTt9KTsKICAgIGlmKCFwZXJzb258fHBlcnNvbi5jb25uZWN0ZWQ9PT1mYWxzZSlyZXR1cm4gJ3VwLWNoYXQtcHJlc2VuY2Utb2ZmbGluZSc7CiAgICByZXR1cm4gY2hhdFByZXNlbmNlW25hbWVdJiZjaGF0UHJlc2VuY2VbbmFtZV0+RGF0ZS5ub3coKT8ndXAtY2hhdC1wcmVzZW5jZS1hY3RpdmUnOid1cC1jaGF0LXByZXNlbmNlLWlkbGUnOwogIH0KICBmdW5jdGlvbiByZW5kZXJDaGF0KCl7CiAgICB2YXIgbGlzdD1jaGF0LnF1ZXJ5U2VsZWN0b3IoJy51cC1jaGF0LWxpc3QnKTtpZighbGlzdClyZXR1cm47CiAgICB2YXIgd2FzQXRCb3R0b209KGxpc3Quc2Nyb2xsSGVpZ2h0LWxpc3Quc2Nyb2xsVG9wLWxpc3QuY2xpZW50SGVpZ2h0KTwyODt2YXIgcHJldmlvdXNTY3JvbGxUb3A9bGlzdC5zY3JvbGxUb3A7CiAgICBpZighY2hhdENhY2hlLmxlbmd0aCl7bGlzdC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9InVwLWhpc3RvcnktZW1wdHkiPk5lbmh1bWEgbWVuc2FnZW0gbmFzIMO6bHRpbWFzIDQ4IGhvcmFzLjwvZGl2Pic7cmV0dXJuO30KICAgIGxpc3QuaW5uZXJIVE1MPWNoYXRDYWNoZS5tYXAoZnVuY3Rpb24obSl7CiAgICAgIGlmKG0udHlwZT09PSdzeXN0ZW0nKXJldHVybiAnPGRpdiBjbGFzcz0idXAtY2hhdC1zeXN0ZW0tZXZlbnQgJysobS5zeXN0ZW1UeXBlPT09J2x1Y2NhX2pvaW4nPydqb2luJzoobS5zeXN0ZW1UeXBlPT09J2NoYXRfY2xlYXInPydjbGVhcic6J2xlYXZlJykpKyciPjxzcGFuPicrZXNjKG0ubWVzc2FnZSkrJzwvc3Bhbj48L2Rpdj4nOwogICAgICB2YXIgb3duPW0udXNlcj09PW1lbWJlciwgYXZhdGFyPSc8aW1nIGNsYXNzPSJ1cC1jaGF0LWF2YXRhciAnK2NoYXRBdmF0YXJQcmVzZW5jZShtLnVzZXIpKyciIGRhdGEtYXZhdGFyLW5hbWU9IicrZXNjKG0udXNlcikrJyIgYWx0PSInK2VzYyhtLnVzZXIpKyciPicsYm9keT0nJzsKICAgICAgaWYobS5pbWFnZVVybCl7aWYobS50eXBlPT09J3ZpZGVvJylib2R5PSc8dmlkZW8gY2xhc3M9InVwLWNoYXQtbWVkaWEgdXAtY2hhdC1tZWRpYS12aWRlbyIgZGF0YS1tZWRpYS1yb3V0ZT0iJytlc2MobS5pbWFnZVVybCkrJyIgY29udHJvbHMgcHJlbG9hZD0ibWV0YWRhdGEiPjwvdmlkZW8+JztlbHNlIGlmKG0udHlwZT09PSdhdWRpbycpYm9keT0nPGF1ZGlvIGNsYXNzPSJ1cC1jaGF0LWF1ZGlvIiBkYXRhLW1lZGlhLXJvdXRlPSInK2VzYyhtLmltYWdlVXJsKSsnIiBjb250cm9scyBwcmVsb2FkPSJtZXRhZGF0YSI+PC9hdWRpbz4nO2Vsc2UgYm9keT0nPGltZyBjbGFzcz0idXAtY2hhdC1waG90byIgZGF0YS1tZWRpYS1yb3V0ZT0iJytlc2MobS5pbWFnZVVybCkrJyIgYWx0PSJJbWFnZW0gZW52aWFkYSBwb3IgJytlc2MobS51c2VyKSsnIiBsb2FkaW5nPSJsYXp5Ij4nO30KICAgICAgZWxzZSBpZihtLm1lc3NhZ2UpYm9keT0nPGRpdiBjbGFzcz0idXAtY2hhdC10ZXh0Ij4nK3JlbmRlckNoYXRUZXh0KG0ubWVzc2FnZSkrJzwvZGl2Pic7CiAgICAgIHZhciByZWFkZXJzPUFycmF5LmlzQXJyYXkobS5yZWFkQnkpP20ucmVhZEJ5LmZpbHRlcihmdW5jdGlvbihuKXtyZXR1cm4gbiE9PW1lbWJlcjt9KTpbXTsKICAgICAgdmFyIHRpdGxlPXJlYWRlcnMubGVuZ3RoPydMaWRvIHBvcjogJytyZWFkZXJzLmpvaW4oJywgJyk6J07Do28gbGlkbyBhaW5kYSc7CiAgICAgIHZhciB0aWNrPW93bj8nPHNwYW4gY2xhc3M9InVwLWNoYXQtcmVhZCAnKyhyZWFkZXJzLmxlbmd0aD8ncmVhZCc6JycpKyciIGRhdGEtcmVhZGVycz0iJytlc2ModGl0bGUpKyciPuKck+Kckzwvc3Bhbj4nOicnOwogICAgICB2YXIgYnViYmxlPSc8ZGl2IGNsYXNzPSJ1cC1jaGF0LWJ1YmJsZSI+JytyZXBseVByZXZpZXcobSkrJzxkaXYgY2xhc3M9InVwLWNoYXQtbWV0YSI+PGI+Jytlc2MobS51c2VyKSsnPC9iPjxzcGFuPicrZm10VGltZShtLmNyZWF0ZWRBdCkrJzwvc3Bhbj48L2Rpdj4nK2JvZHkrKG93bj8nPGRpdiBjbGFzcz0idXAtY2hhdC1vd24tbWV0YSI+Jyt0aWNrKyc8L2Rpdj4nOicnKSsnPGRpdiBjbGFzcz0idXAtY2hhdC1yZWFjdGlvbnMiPicrcmVuZGVyUmVhY3Rpb25zKG0pKyc8L2Rpdj48L2Rpdj4nOwogICAgICByZXR1cm4gJzxkaXYgY2xhc3M9InVwLWNoYXQtaXRlbSAnKyhvd24/J293biAnOicnKSsobS51c2VyPT09J0x1Y2NhJz8nbHVjY2EnOicnKSsnIiBkYXRhLW1lc3NhZ2UtaWQ9IicrZXNjKG0uaWQpKyciPicrYXZhdGFyK2J1YmJsZSsob3duPyc8YnV0dG9uIHR5cGU9ImJ1dHRvbiIgY2xhc3M9InVwLWRlbGV0ZS1hY3Rpb24gaGlkZGVuIj5FeGNsdWlyPC9idXR0b24+JzonJykrJzwvZGl2Pic7CiAgICB9KS5qb2luKCcnKTsKICAgIGxpc3QucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtYXZhdGFyLW5hbWVdJykuZm9yRWFjaChmdW5jdGlvbihpbWcpe2h5ZHJhdGVBdmF0YXIoaW1nLGltZy5nZXRBdHRyaWJ1dGUoJ2RhdGEtYXZhdGFyLW5hbWUnKSk7fSk7CiAgICBsaXN0LnF1ZXJ5U2VsZWN0b3JBbGwoJ1tkYXRhLWF2YXRhci1uYW1lXScpLmZvckVhY2goZnVuY3Rpb24oaW1nKXt2YXIgbmFtZT1pbWcuZ2V0QXR0cmlidXRlKCdkYXRhLWF2YXRhci1uYW1lJyl8fCcnO2ltZy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWVudGVyJyxmdW5jdGlvbihlKXtzaG93Q2hhdFByb2ZpbGVIb3ZlcihpbWcsbmFtZSxlKTt9KTtpbWcuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJyxwb3NpdGlvbkNoYXRQcm9maWxlSG92ZXIpO2ltZy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWxlYXZlJyxoaWRlQ2hhdFByb2ZpbGVIb3Zlcik7fSk7CiAgICBsaXN0LnF1ZXJ5U2VsZWN0b3JBbGwoJ1tkYXRhLW1lZGlhLXJvdXRlXScpLmZvckVhY2goZnVuY3Rpb24oZWwpe3ZhciByb3V0ZT1lbC5nZXRBdHRyaWJ1dGUoJ2RhdGEtbWVkaWEtcm91dGUnKXx8Jycsa2V5PSdjaGF0Oicrcm91dGU7bG9hZEJsb2JVcmwocm91dGUsa2V5KS50aGVuKGZ1bmN0aW9uKHVybCl7ZWwuc3JjPXVybDt9KS5jYXRjaChmdW5jdGlvbigpe30pO2VsLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLGZ1bmN0aW9uKCl7aWYod2FzQXRCb3R0b20pcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCl7bGlzdC5zY3JvbGxUb3A9bGlzdC5zY3JvbGxIZWlnaHQ7fSk7fSk7fSk7CiAgICBsaXN0LnF1ZXJ5U2VsZWN0b3JBbGwoJy51cC1jaGF0LXBob3RvJykuZm9yRWFjaChmdW5jdGlvbihpbWcpe2ltZy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oKXtvcGVuQ2hhdExpZ2h0Ym94KGltZy5zcmMpO30pO30pOwogICAgbGlzdC5xdWVyeVNlbGVjdG9yQWxsKCcudXAtY2hhdC1yZWFkJykuZm9yRWFjaChmdW5jdGlvbih0aWNrKXt0aWNrLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZW50ZXInLGZ1bmN0aW9uKGUpe3JlYWRUb29sdGlwLnRleHRDb250ZW50PXRpY2suZ2V0QXR0cmlidXRlKCdkYXRhLXJlYWRlcnMnKXx8J07Do28gbGlkbyBhaW5kYSc7cmVhZFRvb2x0aXAuY2xhc3NMaXN0LmFkZCgnc2hvdycpO3Bvc2l0aW9uUmVhZFRvb2x0aXAoZSk7fSk7dGljay5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLHBvc2l0aW9uUmVhZFRvb2x0aXApO3RpY2suYWRkRXZlbnRMaXN0ZW5lcignbW91c2VsZWF2ZScsZnVuY3Rpb24oKXtyZWFkVG9vbHRpcC5jbGFzc0xpc3QucmVtb3ZlKCdzaG93Jyk7fSk7fSk7CiAgICBsaXN0LnF1ZXJ5U2VsZWN0b3JBbGwoJy51cC1jaGF0LWl0ZW0nKS5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pe2l0ZW0uYWRkRXZlbnRMaXN0ZW5lcignY29udGV4dG1lbnUnLGZ1bmN0aW9uKGUpe2UucHJldmVudERlZmF1bHQoKTtlLnN0b3BQcm9wYWdhdGlvbigpO3ZhciBpZD1pdGVtLmdldEF0dHJpYnV0ZSgnZGF0YS1tZXNzYWdlLWlkJyk7dmFyIG1zZz1jaGF0Q2FjaGUuZmluZChmdW5jdGlvbih4KXtyZXR1cm4geC5pZD09PWlkO30pO2lmKG1zZylvcGVuQ2hhdENvbnRleHRNZW51KGUsbXNnKTt9KTt9KTsKICAgIGxpc3QucXVlcnlTZWxlY3RvckFsbCgnLnVwLWNoYXQtcmVhY3Rpb24nKS5mb3JFYWNoKGZ1bmN0aW9uKGJ0bil7YnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbihlKXtlLnByZXZlbnREZWZhdWx0KCk7ZS5zdG9wUHJvcGFnYXRpb24oKTt2YXIgaXRlbT1idG4uY2xvc2VzdCgnLnVwLWNoYXQtaXRlbScpLGlkPWl0ZW0mJml0ZW0uZ2V0QXR0cmlidXRlKCdkYXRhLW1lc3NhZ2UtaWQnKSxlbT1idG4uZ2V0QXR0cmlidXRlKCdkYXRhLXJlYWN0aW9uJyk7aWYoaWQmJmVtKXRvZ2dsZUNoYXRSZWFjdGlvbihpZCxlbSk7fSk7fSk7CiAgICBsaXN0LnF1ZXJ5U2VsZWN0b3JBbGwoJy51cC1jaGF0LWl0ZW0ub3duJykuZm9yRWFjaChmdW5jdGlvbihpdGVtKXt2YXIgZGVsPWl0ZW0ucXVlcnlTZWxlY3RvcignLnVwLWRlbGV0ZS1hY3Rpb24nKTtpZihkZWwpZGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbihlKXtlLnByZXZlbnREZWZhdWx0KCk7ZS5zdG9wUHJvcGFnYXRpb24oKTt2YXIgaWQ9aXRlbS5nZXRBdHRyaWJ1dGUoJ2RhdGEtbWVzc2FnZS1pZCcpO2lmKCFpZClyZXR1cm47ZGVsLmRpc2FibGVkPXRydWU7YXBpKCdERUxFVEUnLCcvYXBpL2NoYXQvJytlbmNvZGVVUklDb21wb25lbnQoaWQpKS50aGVuKGZ1bmN0aW9uKCl7Y2hhdENhY2hlPWNoYXRDYWNoZS5maWx0ZXIoZnVuY3Rpb24obSl7cmV0dXJuIG0uaWQhPT1pZDt9KTtyZW5kZXJDaGF0KCk7fSkuY2F0Y2goZnVuY3Rpb24oZXJyKXtkZWwuZGlzYWJsZWQ9ZmFsc2U7bWVzc2FnZShlcnIubWVzc2FnZSx0cnVlKTt9KTt9KTt9KTsKICAgIGxpc3Qub25jbGljaz1mdW5jdGlvbihlKXtpZihlLnRhcmdldC5jbG9zZXN0JiZlLnRhcmdldC5jbG9zZXN0KCcudXAtZGVsZXRlLWFjdGlvbicpKXJldHVybjtsaXN0LnF1ZXJ5U2VsZWN0b3JBbGwoJy51cC1kZWxldGUtYWN0aW9uJykuZm9yRWFjaChmdW5jdGlvbihiKXtiLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpfSk7fTsKICAgIGNoYXRMYXN0UmVuZGVyS2V5PWNoYXREYXRhS2V5KGNoYXRDYWNoZSk7CiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24oKXtsaXN0LnNjcm9sbFRvcD1saXN0LnNjcm9sbEhlaWdodDt9KTsKICB9CiAgZnVuY3Rpb24gb3BlbkNoYXRMaWdodGJveChzcmMpe3ZhciBib3g9Y2hhdC5xdWVyeVNlbGVjdG9yKCcudXAtY2hhdC1saWdodGJveCcpLGltZz1ib3gmJmJveC5xdWVyeVNlbGVjdG9yKCdpbWcnKTtpZighYm94fHwhaW1nKXJldHVybjtpbWcuc3JjPXNyYztib3guY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7fQogIGZ1bmN0aW9uIGNsb3NlQ2hhdExpZ2h0Ym94KCl7dmFyIGJveD1jaGF0LnF1ZXJ5U2VsZWN0b3IoJy51cC1jaGF0LWxpZ2h0Ym94Jyk7aWYoYm94KWJveC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTt9CiAgZnVuY3Rpb24gb3BlbkNoYXRDb250ZXh0TWVudShlLG0pewogICAgdmFyIG1lbnU9Y2hhdC5xdWVyeVNlbGVjdG9yKCcudXAtY2hhdC1jb250ZXh0LW1lbnUnKTtpZighbWVudSlyZXR1cm47CiAgICBjaGF0Q29udGV4dE1lc3NhZ2VJZD1tLmlkOwogICAgdmFyIGNhblJlcGx5PW0udXNlciE9PW1lbWJlcjsKICAgIHZhciBxdWljaz1bJ/CfmIInLCfinaTvuI8nLCfwn5GNJywn8J+YoScsJ/CfmK4nLCfwn5GPJ107CiAgICB2YXIgY2FuRGVsZXRlPW0udXNlcj09PW1lbWJlcjsKICAgIG1lbnUuaW5uZXJIVE1MPShjYW5SZXBseT8nPGJ1dHRvbiB0eXBlPSJidXR0b24iIGNsYXNzPSJ1cC1jaGF0LWNvbnRleHQtYWN0aW9uIiBkYXRhLWFjdGlvbj0icmVwbHkiPuKGqSBSZXNwb25kZXI8L2J1dHRvbj4nOicnKSsoY2FuRGVsZXRlPyc8YnV0dG9uIHR5cGU9ImJ1dHRvbiIgY2xhc3M9InVwLWNoYXQtY29udGV4dC1hY3Rpb24gdXAtY2hhdC1jb250ZXh0LWRlbGV0ZSIgZGF0YS1hY3Rpb249ImRlbGV0ZSI+8J+XkSBFeGNsdWlyIG1lbnNhZ2VtPC9idXR0b24+JzonJykrJzxkaXYgY2xhc3M9InVwLWNoYXQtY29udGV4dC1yZWFjdGlvbi1yb3ciPicrcXVpY2subWFwKGZ1bmN0aW9uKGVtKXtyZXR1cm4gJzxidXR0b24gdHlwZT0iYnV0dG9uIiBjbGFzcz0idXAtY2hhdC1yZWFjdGlvbiIgZGF0YS1jb250ZXh0LXJlYWN0aW9uPSInK2VzYyhlbSkrJyI+JytlbSsnPC9idXR0b24+Jzt9KS5qb2luKCcnKSsnPC9kaXY+JzsKICAgIG1lbnUuY2xhc3NMaXN0LmFkZCgnc2hvdycpOwogICAgdmFyIHg9TWF0aC5taW4od2luZG93LmlubmVyV2lkdGgtbWVudS5vZmZzZXRXaWR0aC04LE1hdGgubWF4KDgsZS5jbGllbnRYfHw4KSkseT1NYXRoLm1pbih3aW5kb3cuaW5uZXJIZWlnaHQtbWVudS5vZmZzZXRIZWlnaHQtOCxNYXRoLm1heCg4LGUuY2xpZW50WXx8OCkpO21lbnUuc3R5bGUubGVmdD14KydweCc7bWVudS5zdHlsZS50b3A9eSsncHgnOwogICAgdmFyIHJlcGx5PW1lbnUucXVlcnlTZWxlY3RvcignW2RhdGEtYWN0aW9uPSJyZXBseSJdJyk7aWYocmVwbHkpcmVwbHkub25jbGljaz1mdW5jdGlvbigpe3NldENoYXRSZXBseShtKTtoaWRlQ2hhdENvbnRleHRNZW51KCk7fTsKICAgIHZhciBkZWw9bWVudS5xdWVyeVNlbGVjdG9yKCdbZGF0YS1hY3Rpb249ImRlbGV0ZSJdJyk7aWYoZGVsKWRlbC5vbmNsaWNrPWZ1bmN0aW9uKCl7aGlkZUNoYXRDb250ZXh0TWVudSgpO2lmKCFjb25maXJtKCdFeGNsdWlyIGVzdGEgbWVuc2FnZW0/JykpcmV0dXJuO2RlbC5kaXNhYmxlZD10cnVlO2FwaSgnREVMRVRFJywnL2FwaS9jaGF0LycrZW5jb2RlVVJJQ29tcG9uZW50KG0uaWQpKS50aGVuKGZ1bmN0aW9uKCl7Y2hhdENhY2hlPWNoYXRDYWNoZS5maWx0ZXIoZnVuY3Rpb24oeCl7cmV0dXJuIHguaWQhPT1tLmlkO30pO3JlbmRlckNoYXQoKTt9KS5jYXRjaChmdW5jdGlvbihlcnIpe21lc3NhZ2UoZXJyLm1lc3NhZ2UsdHJ1ZSk7fSk7fTsKICAgIG1lbnUucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtY29udGV4dC1yZWFjdGlvbl0nKS5mb3JFYWNoKGZ1bmN0aW9uKGJ0bil7YnRuLm9uY2xpY2s9ZnVuY3Rpb24oKXt0b2dnbGVDaGF0UmVhY3Rpb24obS5pZCxidG4uZ2V0QXR0cmlidXRlKCdkYXRhLWNvbnRleHQtcmVhY3Rpb24nKSk7aGlkZUNoYXRDb250ZXh0TWVudSgpO307fSk7CiAgfQogIGZ1bmN0aW9uIGhpZGVDaGF0Q29udGV4dE1lbnUoKXt2YXIgbWVudT1jaGF0LnF1ZXJ5U2VsZWN0b3IoJy51cC1jaGF0LWNvbnRleHQtbWVudScpO2lmKG1lbnUpbWVudS5jbGFzc0xpc3QucmVtb3ZlKCdzaG93Jyk7Y2hhdENvbnRleHRNZXNzYWdlSWQ9bnVsbDt9CiAgZnVuY3Rpb24gdG9nZ2xlQ2hhdFJlYWN0aW9uKGlkLGVtb2ppKXthcGkoJ1BPU1QnLCcvYXBpL2NoYXQvcmVhY3Rpb24nLHttZXNzYWdlSWQ6aWQsZW1vamk6ZW1vaml9KS50aGVuKGZ1bmN0aW9uKCl7cmV0dXJuIGFwaSgnR0VUJywnL2FwaS9jaGF0Jyl9KS50aGVuKGZ1bmN0aW9uKGQpe2NoYXRDYWNoZT1kLm1lc3NhZ2VzfHxbXTtyZW5kZXJDaGF0KCk7fSkuY2F0Y2goZnVuY3Rpb24oZSl7bWVzc2FnZShlLm1lc3NhZ2UsdHJ1ZSk7fSk7fQogIGZ1bmN0aW9uIHNldENoYXRSZXBseShtKXtjaGF0UmVwbHlUbz1tP3tpZDptLmlkLHVzZXI6bS51c2VyLG1lc3NhZ2U6bS5tZXNzYWdlfHwoKG0udHlwZT09PSdpbWFnZSd8fG0udHlwZT09PSd2aWRlbyd8fG0udHlwZT09PSdhdWRpbycpPydBbmV4byc6JycpfSA6IG51bGw7dmFyIGJhcj1jaGF0LnF1ZXJ5U2VsZWN0b3IoJy51cC1jaGF0LXJlcGx5LWJhcicpLGNvcHk9YmFyJiZiYXIucXVlcnlTZWxlY3RvcignLnVwLWNoYXQtcmVwbHktY29weScpO2lmKGJhciYmY29weSl7aWYoY2hhdFJlcGx5VG8pe2NvcHkuaW5uZXJIVE1MPSc8Yj5SZXNwb25kZW5kbyBhICcrZXNjKGNoYXRSZXBseVRvLnVzZXIpKyc8L2I+Jytlc2MoY2hhdFJlcGx5VG8ubWVzc2FnZS5zbGljZSgwLDEyMCkpO2Jhci5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTt9ZWxzZXtiYXIuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7Y29weS50ZXh0Q29udGVudD0nJzt9fXZhciBpbnB1dD1jaGF0LnF1ZXJ5U2VsZWN0b3IoJy51cC1jaGF0LWlucHV0Jyk7aWYoaW5wdXQpaW5wdXQuZm9jdXMoKTt9CiAgZnVuY3Rpb24gbWVudGlvblN0YXRlKGlucHV0KXsKICAgIGlmKCFpbnB1dClyZXR1cm4gbnVsbDsKICAgIHZhciB2YWx1ZT1pbnB1dC52YWx1ZXx8JycsIGNhcmV0PWlucHV0LnNlbGVjdGlvblN0YXJ0PT1udWxsP3ZhbHVlLmxlbmd0aDppbnB1dC5zZWxlY3Rpb25TdGFydDsKICAgIHZhciBiZWZvcmU9dmFsdWUuc2xpY2UoMCxjYXJldCk7CiAgICB2YXIgbWF0Y2g9YmVmb3JlLm1hdGNoKC8oPzpefFxzKUAoW1xwe0x9XHB7Tn1fLV0qKSQvdSk7CiAgICBpZighbWF0Y2gpcmV0dXJuIG51bGw7CiAgICB2YXIgcXVlcnk9KG1hdGNoWzFdfHwnJykudG9Mb3dlckNhc2UoKTsKICAgIHZhciBuYW1lcz1BcnJheS5pc0FycmF5KHdpbmRvdy5fX3Vwc3RhdHVzTWVtYmVycykmJndpbmRvdy5fX3Vwc3RhdHVzTWVtYmVycy5sZW5ndGg/d2luZG93Ll9fdXBzdGF0dXNNZW1iZXJzLnNsaWNlKCk6WydSaWNhcmRvJywnTG9oYW4nLCdHdWlsaGVybWUnXTsKICAgIHZhciBmaWx0ZXJlZD1uYW1lcy5maWx0ZXIoZnVuY3Rpb24obmFtZSl7cmV0dXJuIFN0cmluZyhuYW1lKS50b0xvd2VyQ2FzZSgpLmluZGV4T2YocXVlcnkpPT09MDt9KTsKICAgIGlmKCd0b2RvcycuaW5kZXhPZihxdWVyeSk9PT0wKWZpbHRlcmVkLnVuc2hpZnQoJ19fQUxMX18nKTsKICAgIHJldHVybiB7cXVlcnk6cXVlcnksbmFtZXM6ZmlsdGVyZWR9OwogIH0KICBmdW5jdGlvbiBhcHBseU1lbnRpb24obmFtZSl7CiAgICB2YXIgaW5wdXQ9Y2hhdC5xdWVyeVNlbGVjdG9yKCcudXAtY2hhdC1pbnB1dCcpOwogICAgaWYoIWlucHV0KXJldHVybjsKICAgIHZhciB2YWx1ZT1pbnB1dC52YWx1ZXx8Jyc7CiAgICB2YXIgY2FyZXQ9aW5wdXQuc2VsZWN0aW9uU3RhcnQ9PW51bGw/dmFsdWUubGVuZ3RoOmlucHV0LnNlbGVjdGlvblN0YXJ0OwogICAgdmFyIGJlZm9yZT12YWx1ZS5zbGljZSgwLGNhcmV0KSxhZnRlcj12YWx1ZS5zbGljZShjYXJldCk7CiAgICB2YXIgbWF0Y2g9YmVmb3JlLm1hdGNoKC8oPzpefFxzKUAoW1xwe0x9XHB7Tn1fLV0qKSQvdSk7CiAgICBpZighbWF0Y2gpcmV0dXJuOwogICAgdmFyIG1lbnRpb249bmFtZT09PSdfX0FMTF9fJz8ndG9kb3MnOm5hbWU7CiAgICB2YXIgcHJlZml4PWJlZm9yZS5zbGljZSgwLGJlZm9yZS5sZW5ndGgtKG1hdGNoWzFdfHwnJykubGVuZ3RoLTEpOwogICAgaW5wdXQudmFsdWU9cHJlZml4KydAJyttZW50aW9uKycgJythZnRlcjsKICAgIHZhciBwb3M9KHByZWZpeCsnQCcrbWVudGlvbisnICcpLmxlbmd0aDsKICAgIGlucHV0LmZvY3VzKCk7aW5wdXQuc2V0U2VsZWN0aW9uUmFuZ2UocG9zLHBvcyk7CiAgICB2YXIgbWVudT1jaGF0LnF1ZXJ5U2VsZWN0b3IoJy51cC1tZW50aW9uLW1lbnUnKTtpZihtZW51KW1lbnUuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7CiAgfQogIGZ1bmN0aW9uIHJlbmRlck1lbnRpb25NZW51KCl7CiAgICB2YXIgaW5wdXQ9Y2hhdC5xdWVyeVNlbGVjdG9yKCcudXAtY2hhdC1pbnB1dCcpLG1lbnU9Y2hhdC5xdWVyeVNlbGVjdG9yKCcudXAtbWVudGlvbi1tZW51Jyk7CiAgICBpZighaW5wdXR8fCFtZW51KXJldHVybjsKICAgIHZhciBzdGF0ZT1tZW50aW9uU3RhdGUoaW5wdXQpOwogICAgaWYoIXN0YXRlKXttZW51LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO21lbnUuaW5uZXJIVE1MPScnO3JldHVybjt9CiAgICBtZW51LmlubmVySFRNTD1zdGF0ZS5uYW1lcy5tYXAoZnVuY3Rpb24obmFtZSl7CiAgICAgIGlmKG5hbWU9PT0nX19BTExfXycpewogICAgICAgIHJldHVybiAnPGJ1dHRvbiB0eXBlPSJidXR0b24iIGNsYXNzPSJ1cC1tZW50aW9uLW9wdGlvbiB1cC1tZW50aW9uLWFsbCIgZGF0YS1uYW1lPSJfX0FMTF9fIj4nK2ljb25TdmcoJ2NoYXQnKSsnPHNwYW4+QHRvZG9zPC9zcGFuPjwvYnV0dG9uPic7CiAgICAgIH0KICAgICAgcmV0dXJuICc8YnV0dG9uIHR5cGU9ImJ1dHRvbiIgY2xhc3M9InVwLW1lbnRpb24tb3B0aW9uIiBkYXRhLW5hbWU9IicrZXNjKG5hbWUpKyciPicraWNvblN2ZygnY2hhdCcpKyc8c3Bhbj5AJytlc2MobmFtZSkrJzwvc3Bhbj48L2J1dHRvbj4nOwogICAgfSkuam9pbignJyk7CiAgICBtZW51LmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpOwogICAgbWVudS5xdWVyeVNlbGVjdG9yQWxsKCcudXAtbWVudGlvbi1vcHRpb24nKS5mb3JFYWNoKGZ1bmN0aW9uKGJ0bil7CiAgICAgIGJ0bi5vbmNsaWNrPWZ1bmN0aW9uKGUpe2UucHJldmVudERlZmF1bHQoKTtlLnN0b3BQcm9wYWdhdGlvbigpO2FwcGx5TWVudGlvbihidG4uZ2V0QXR0cmlidXRlKCdkYXRhLW5hbWUnKSk7fTsKICAgIH0pOwogIH0KICBmdW5jdGlvbiBoaWRlSW5jb21pbmdCYXJ1aSgpewogICAgYmFydWlJbmNvbWluZy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTsKICAgIGJhcnVpSW5jb21pbmcuaW5uZXJIVE1MPScnOwogIH0KICBmdW5jdGlvbiBzdG9wSW5jb21pbmdCYXJ1aSgpewogICAgaWYoIWJhcnVpU3RhdGUuYWN0aXZlKXJldHVybjsKICAgIGFwaSgnUE9TVCcsJy9hcGkvYmFydWkvc3RvcC1pbmNvbWluZycse30pLnRoZW4oZnVuY3Rpb24oKXtzdG9wTG9jYWxCYXJ1aSgpO30pLmNhdGNoKGZ1bmN0aW9uKGUpe21lc3NhZ2UoZS5tZXNzYWdlLHRydWUpfSk7CiAgfQogIGZ1bmN0aW9uIHNob3dJbmNvbWluZ0JhcnVpKHNlbmRlcil7CiAgICB2YXIgbmFtZT1TdHJpbmcoc2VuZGVyfHwnQWxndcOpbScpOwogICAgYmFydWlJbmNvbWluZy5pbm5lckhUTUw9JzxkaXYgY2xhc3M9InVwLWJhcnVpLWluY29taW5nLWNhcmQiPjxkaXYgY2xhc3M9InVwLWJhcnVpLWluY29taW5nLXRpdGxlIj4nK2VzYyhuYW1lKSsnIGVzdMOhIHRlIGNoYW1hbmRvITwvZGl2PjxkaXYgY2xhc3M9InVwLWJhcnVpLWluY29taW5nLXN1YiI+QkFSVUkgZGEgZXF1aXBlPC9kaXY+PGRpdiBjbGFzcz0idXAtYmFydWktaW5jb21pbmctYWN0aW9ucyI+PGJ1dHRvbiB0eXBlPSJidXR0b24iIGNsYXNzPSJ1cC1iYXJ1aS1hdHRlbmQiPkF0ZW5kZXI8L2J1dHRvbj48YnV0dG9uIHR5cGU9ImJ1dHRvbiIgY2xhc3M9InVwLWJhcnVpLXN0b3AiPlBhcmFyPC9idXR0b24+PC9kaXY+PC9kaXY+JzsKICAgIGJhcnVpSW5jb21pbmcuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7CiAgICBiYXJ1aUluY29taW5nLmNsYXNzTGlzdC5yZW1vdmUoJ3NoYWtlJyk7dm9pZCBiYXJ1aUluY29taW5nLm9mZnNldFdpZHRoO2JhcnVpSW5jb21pbmcuY2xhc3NMaXN0LmFkZCgnc2hha2UnKTsKICAgIHZhciBhdHRlbmQ9YmFydWlJbmNvbWluZy5xdWVyeVNlbGVjdG9yKCcudXAtYmFydWktYXR0ZW5kJyk7CiAgICB2YXIgc3RvcD1iYXJ1aUluY29taW5nLnF1ZXJ5U2VsZWN0b3IoJy51cC1iYXJ1aS1zdG9wJyk7CiAgICBpZihhdHRlbmQpYXR0ZW5kLm9uY2xpY2s9ZnVuY3Rpb24oZSl7ZS5zdG9wUHJvcGFnYXRpb24oKTtvcGVuQ2hhdCgpO307CiAgICBpZihzdG9wKXN0b3Aub25jbGljaz1mdW5jdGlvbihlKXtlLnN0b3BQcm9wYWdhdGlvbigpO3N0b3BJbmNvbWluZ0JhcnVpKCk7fTsKICB9CgogIGZ1bmN0aW9uIHVwZGF0ZUJhcnVpVGl0bGUoYWN0aXZlKXsKICAgIGlmKGFjdGl2ZSl7aWYoIWRvY3VtZW50LnRpdGxlLnN0YXJ0c1dpdGgoJ0JBUlVJJykpZG9jdW1lbnQudGl0bGU9J0JBUlVJIOKAoiAnK29yaWdpbmFsVGl0bGU7YnViYmxlLmNsYXNzTGlzdC5hZGQoJ3VwLWJhcnVpLWFjdGl2ZScpO30KICAgIGVsc2V7aWYoZG9jdW1lbnQudGl0bGUuc3RhcnRzV2l0aCgnQkFSVUknKSlkb2N1bWVudC50aXRsZT1vcmlnaW5hbFRpdGxlO2J1YmJsZS5jbGFzc0xpc3QucmVtb3ZlKCd1cC1iYXJ1aS1hY3RpdmUnKTt9CiAgfQogIGZ1bmN0aW9uIHVwZGF0ZU91dGdvaW5nQmFydWlVSSgpewogICAgY2FyZC5xdWVyeVNlbGVjdG9yQWxsKCcudXAtbWVtYmVyLWJhcnVpJykuZm9yRWFjaChmdW5jdGlvbihidG4pewogICAgICB2YXIgdGFyZ2V0PWJ0bi5nZXRBdHRyaWJ1dGUoJ2RhdGEtdGFyZ2V0Jyk7CiAgICAgIHZhciBhY3RpdmU9ISFiYXJ1aU91dGdvaW5nLmFjdGl2ZSYmYmFydWlPdXRnb2luZy50YXJnZXQ9PT10YXJnZXQ7CiAgICAgIGJ0bi5jbGFzc0xpc3QudG9nZ2xlKCdhY3RpdmUnLGFjdGl2ZSk7CiAgICAgIGJ0bi50aXRsZT1hY3RpdmU/J1BhcmFyIEJBUlVJIHBhcmEgJyt0YXJnZXQ6J0VudmlhciBCQVJVSSBwYXJhICcrdGFyZ2V0OwogICAgICBidG4uc2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJyxidG4udGl0bGUpOwogICAgfSk7CiAgfQogIGZ1bmN0aW9uIHBsYXlCYXJ1aUFsZXJ0KCl7cGxheU1lbnRpb25BbGVydCgpO30KICBmdW5jdGlvbiBzdG9wTG9jYWxCYXJ1aSgpewogICAgYmFydWlTdGF0ZT17YWN0aXZlOmZhbHNlLHNlcXVlbmNlOjAsdGFyZ2V0OicnLHNlbmRlcjonJyxzdGFydGVkQXQ6MH07CiAgICBoaWRlSW5jb21pbmdCYXJ1aSgpOwogICAgdXBkYXRlQmFydWlUaXRsZShmYWxzZSk7CiAgfQogIGZ1bmN0aW9uIHBvbGxCYXJ1aSgpewogICAgaWYoIXRva2VufHxiYXJ1aVBvbGxpbmcpcmV0dXJuOwogICAgYmFydWlQb2xsaW5nPXRydWU7CiAgICBhcGkoJ0dFVCcsJy9hcGkvYmFydWknKS50aGVuKGZ1bmN0aW9uKGQpewogICAgICB2YXIgYWN0aXZlPSEhZC5hY3RpdmU7CiAgICAgIGlmKGFjdGl2ZSl7CiAgICAgICAgaWYoIWJhcnVpU3RhdGUuYWN0aXZlfHxiYXJ1aVN0YXRlLnNlcXVlbmNlIT09ZC5zZXF1ZW5jZSl7CiAgICAgICAgICBiYXJ1aVN0YXRlPXthY3RpdmU6dHJ1ZSxzZXF1ZW5jZTpkLnNlcXVlbmNlLHRhcmdldDptZW1iZXIsc2VuZGVyOmQuc2VuZGVyLHN0YXJ0ZWRBdDpEYXRlLnBhcnNlKGQuc3RhcnRlZEF0KXx8RGF0ZS5ub3coKX07CiAgICAgICAgICBwbGF5QmFydWlBbGVydCgpO2JhcnVpTGFzdEJlZXA9RGF0ZS5ub3coKTsKICAgICAgICAgIHNob3dJbmNvbWluZ0JhcnVpKGQuc2VuZGVyfHwnQWxndcOpbScpOwogICAgICAgICAgaWYoYmFydWlFeHRlcm5hbE5vdGlmaWVkU2VxdWVuY2UhPT1kLnNlcXVlbmNlKXsKICAgICAgICAgICAgYmFydWlFeHRlcm5hbE5vdGlmaWVkU2VxdWVuY2U9ZC5zZXF1ZW5jZTsKICAgICAgICAgICAgc2hvd0V4dGVybmFsTm90aWZpY2F0aW9uKCdiYXJ1aScse3NlcXVlbmNlOmQuc2VxdWVuY2Usc2VuZGVyOmQuc2VuZGVyfHwnQWxndcOpbSd9KTsKICAgICAgICAgIH0KICAgICAgICB9CiAgICAgICAgZWxzZSB7CiAgICAgICAgICBzaG93SW5jb21pbmdCYXJ1aShkLnNlbmRlcnx8YmFydWlTdGF0ZS5zZW5kZXJ8fCdBbGd1w6ltJyk7CiAgICAgICAgICBpZihEYXRlLm5vdygpLWJhcnVpTGFzdEJlZXA+PTEyMDApe3BsYXlCYXJ1aUFsZXJ0KCk7YmFydWlMYXN0QmVlcD1EYXRlLm5vdygpO30KICAgICAgICB9CiAgICAgIH1lbHNlIGlmKGJhcnVpU3RhdGUuYWN0aXZlKXtzdG9wTG9jYWxCYXJ1aSgpO30KICAgICAgaWYoYWN0aXZlJiZEYXRlLm5vdygpLWJhcnVpU3RhdGUuc3RhcnRlZEF0Pj0zMDAwMCl7c3RvcExvY2FsQmFydWkoKTtyZXR1cm47fQogICAgICB1cGRhdGVCYXJ1aVRpdGxlKGFjdGl2ZSk7CiAgICAgIGJhcnVpT3V0Z29pbmc9ZC5vdXRnb2luZ0FjdGl2ZT97YWN0aXZlOnRydWUsdGFyZ2V0OmQub3V0Z29pbmdUYXJnZXR8fCcnfTp7YWN0aXZlOmZhbHNlLHRhcmdldDonJ307CiAgICAgIHVwZGF0ZU91dGdvaW5nQmFydWlVSSgpOwogICAgfSkuY2F0Y2goZnVuY3Rpb24oKXt9KS5maW5hbGx5KGZ1bmN0aW9uKCl7YmFydWlQb2xsaW5nPWZhbHNlO30pOwogIH0KICBmdW5jdGlvbiBzZW5kQmFydWlUbyh0YXJnZXQpewogICAgaWYoIXRhcmdldHx8dGFyZ2V0PT09bWVtYmVyKXJldHVybjsKICAgIHZhciBidG49Y2FyZC5xdWVyeVNlbGVjdG9yKCcudXAtbWVtYmVyLWJhcnVpW2RhdGEtdGFyZ2V0PVwiJytDU1MuZXNjYXBlKHRhcmdldCkrJ1wiXScpOwogICAgaWYoYnRuKWJ0bi5kaXNhYmxlZD10cnVlOwogICAgdmFyIHN0b3BPbGQ9YmFydWlPdXRnb2luZy5hY3RpdmUmJmJhcnVpT3V0Z29pbmcudGFyZ2V0JiZiYXJ1aU91dGdvaW5nLnRhcmdldCE9PXRhcmdldAogICAgICA/IGFwaSgnUE9TVCcsJy9hcGkvYmFydWknLHt0YXJnZXQ6YmFydWlPdXRnb2luZy50YXJnZXQsYWN0aXZlOmZhbHNlfSkKICAgICAgOiBQcm9taXNlLnJlc29sdmUoKTsKICAgIHN0b3BPbGQudGhlbihmdW5jdGlvbigpewogICAgICByZXR1cm4gYXBpKCdQT1NUJywnL2FwaS9iYXJ1aScse3RhcmdldDp0YXJnZXQsYWN0aXZlOnRydWV9KTsKICAgIH0pLnRoZW4oZnVuY3Rpb24oKXsKICAgICAgYmFydWlPdXRnb2luZz17YWN0aXZlOnRydWUsdGFyZ2V0OnRhcmdldH07CiAgICAgIHVwZGF0ZU91dGdvaW5nQmFydWlVSSgpOwogICAgfSkuY2F0Y2goZnVuY3Rpb24oZSl7bWVzc2FnZShlLm1lc3NhZ2UsdHJ1ZSl9KS5maW5hbGx5KGZ1bmN0aW9uKCl7aWYoYnRuKWJ0bi5kaXNhYmxlZD1mYWxzZX0pOwogIH0KICBmdW5jdGlvbiBzdG9wT3V0Z29pbmdCYXJ1aSgpewogICAgdmFyIHRhcmdldD1iYXJ1aU91dGdvaW5nLnRhcmdldDtpZighdGFyZ2V0KXJldHVybjsKICAgIHZhciBidG49Y2FyZC5xdWVyeVNlbGVjdG9yKCcudXAtbWVtYmVyLWJhcnVpW2RhdGEtdGFyZ2V0PVwiJytDU1MuZXNjYXBlKHRhcmdldCkrJ1wiXScpOwogICAgaWYoYnRuKWJ0bi5kaXNhYmxlZD10cnVlOwogICAgYXBpKCdQT1NUJywnL2FwaS9iYXJ1aScse3RhcmdldDp0YXJnZXQsYWN0aXZlOmZhbHNlfSkudGhlbihmdW5jdGlvbigpewogICAgICBiYXJ1aU91dGdvaW5nPXthY3RpdmU6ZmFsc2UsdGFyZ2V0OicnfTt1cGRhdGVPdXRnb2luZ0JhcnVpVUkoKTsKICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGUpe21lc3NhZ2UoZS5tZXNzYWdlLHRydWUpfSkuZmluYWxseShmdW5jdGlvbigpe2lmKGJ0bilidG4uZGlzYWJsZWQ9ZmFsc2V9KTsKICB9CiAgZnVuY3Rpb24gcG9zaXRpb25SZWFkVG9vbHRpcChlKXt2YXIgeD0oZS5jbGllbnRYfHwwKSsxMix5PShlLmNsaWVudFl8fDApKzEyO3ZhciB3PXJlYWRUb29sdGlwLm9mZnNldFdpZHRoLGg9cmVhZFRvb2x0aXAub2Zmc2V0SGVpZ2h0O2lmKHgrdz53aW5kb3cuaW5uZXJXaWR0aC04KXg9TWF0aC5tYXgoOCwoZS5jbGllbnRYfHwwKS13LTEyKTtpZih5K2g+d2luZG93LmlubmVySGVpZ2h0LTgpeT1NYXRoLm1heCg4LChlLmNsaWVudFl8fDApLWgtMTIpO3JlYWRUb29sdGlwLnN0eWxlLmxlZnQ9eCsncHgnO3JlYWRUb29sdGlwLnN0eWxlLnRvcD15KydweCc7fQogIGZ1bmN0aW9uIHRvZ2dsZUJhcnVpKHRhcmdldCl7CiAgICBpZihiYXJ1aU91dGdvaW5nLmFjdGl2ZSYmYmFydWlPdXRnb2luZy50YXJnZXQ9PT10YXJnZXQpe3N0b3BPdXRnb2luZ0JhcnVpKCk7cmV0dXJuO30KICAgIHNlbmRCYXJ1aVRvKHRhcmdldCk7CiAgfQoKICBmdW5jdGlvbiBvcGVuQ2hhdCgpewogICAgaWYoIXRva2VuKXJldHVybjsKICAgIGNoYXRSZXBseVRvPW51bGw7Y2hhdENvbnRleHRNZXNzYWdlSWQ9bnVsbDsKICAgIGNoYXQuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7Y2FyZC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtoaXN0b3J5LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO2Jyb2FkY2FzdENoYXRQcmVzZW5jZSh0cnVlKTtyZWZyZXNoKCk7CiAgICBjaGF0LmlubmVySFRNTD0nPGRpdiBjbGFzcz0idXAtaGlzdG9yeS1oZWFkIj48ZGl2IGNsYXNzPSJ1cC1jaGF0LXRpdGxlLXdyYXAiPjxidXR0b24gdHlwZT0iYnV0dG9uIiBjbGFzcz0idXAtY2hhdC1wcm9maWxlLWJ0biIgdGl0bGU9IkFsdGVyYXIgZm90byBkZSBwZXJmaWwiPjxpbWcgYWx0PSJNaW5oYSBmb3RvIj48L2J1dHRvbj48ZGl2IGNsYXNzPSJ1cC1oaXN0b3J5LXRpdGxlIj5DaGF0IGRhIGVxdWlwZTwvZGl2PjwvZGl2PjxkaXYgc3R5bGU9ImRpc3BsYXk6ZmxleDtnYXA6NnB4O2FsaWduLWl0ZW1zOmNlbnRlciI+JysobWVtYmVyPT09J1JpY2FyZG8nPyc8YnV0dG9uIGNsYXNzPSJ1cC1jaGF0LWNsZWFyIiB0eXBlPSJidXR0b24iIHRpdGxlPSJMaW1wYXIgY2hhdCI+8J+nuTwvYnV0dG9uPic6JycpKyc8YnV0dG9uIGNsYXNzPSJ1cC1jaGF0LWJhY2siIHR5cGU9ImJ1dHRvbiI+4oaQIFZvbHRhcjwvYnV0dG9uPjwvZGl2PjwvZGl2PjxkaXYgY2xhc3M9InVwLWNoYXQtbHVjY2EtYWxlcnQgaGlkZGVuIj7wn5S0IEFMRVJUQSBERSBMVUNDQSBNQUxVQ088L2Rpdj48ZGl2IGNsYXNzPSJ1cC1jaGF0LWxpc3QiPkNhcnJlZ2FuZG/igKY8L2Rpdj48ZGl2IGNsYXNzPSJ1cC1jaGF0LXR5cGluZyBoaWRkZW4iPjwvZGl2PjxkaXYgY2xhc3M9InVwLWNoYXQtY29udGV4dC1tZW51Ij48L2Rpdj48ZGl2IGNsYXNzPSJ1cC1jaGF0LWNvbXBvc2UiPjxkaXYgY2xhc3M9InVwLWNoYXQtcmVwbHktYmFyIGhpZGRlbiI+PGRpdiBjbGFzcz0idXAtY2hhdC1yZXBseS1jb3B5Ij48L2Rpdj48YnV0dG9uIHR5cGU9ImJ1dHRvbiIgY2xhc3M9InVwLWNoYXQtcmVwbHktY2xvc2UiPsOXPC9idXR0b24+PC9kaXY+PGRpdiBjbGFzcz0idXAtbWVudGlvbi1tZW51IGhpZGRlbiI+PC9kaXY+PGRpdiBjbGFzcz0idXAtY2hhdC1lbW9qaS1tZW51IGhpZGRlbiI+PC9kaXY+PGRpdiBjbGFzcz0idXAtY2hhdC1yZWNvcmRpbmctbGFiZWwiPkdyYXZhbmRvIDxzcGFuIGNsYXNzPSJ1cC1jaGF0LXJlY29yZGluZy10aW1lIj4wOjAwPC9zcGFuPiDigKIgY2xpcXVlIG5vdmFtZW50ZSBwYXJhIGVudmlhcjwvZGl2Pjx0ZXh0YXJlYSBjbGFzcz0idXAtY2hhdC1pbnB1dCIgbWF4bGVuZ3RoPSIxMDAwIiBwbGFjZWhvbGRlcj0iRGlnaXRlIHVtYSBtZW5zYWdlbSI+PC90ZXh0YXJlYT48ZGl2IGNsYXNzPSJ1cC1jaGF0LXRvb2xzIj48YnV0dG9uIHR5cGU9ImJ1dHRvbiIgY2xhc3M9InVwLWNoYXQtZW1vamktYnRuIiB0aXRsZT0iRW1vamlzIiBhcmlhLWxhYmVsPSJFbW9qaXMiPicraWNvblN2ZygnZW1vamknKSsnPC9idXR0b24+PGJ1dHRvbiB0eXBlPSJidXR0b24iIGNsYXNzPSJ1cC1jaGF0LWF0dGFjaCIgdGl0bGU9IkVudmlhciBmb3RvLCBHSUYgb3UgdsOtZGVvIiBhcmlhLWxhYmVsPSJFbnZpYXIgZm90bywgR0lGIG91IHbDrWRlbyI+JytpY29uU3ZnKCdwaG90bycpKyc8L2J1dHRvbj48YnV0dG9uIHR5cGU9ImJ1dHRvbiIgY2xhc3M9InVwLWNoYXQtcmVjb3JkIiB0aXRsZT0iR3JhdmFyIMOhdWRpbyAoYXTDqSAzMCBzZWd1bmRvcykiIGFyaWEtbGFiZWw9IkdyYXZhciDDoXVkaW8iPvCfjpk8L2J1dHRvbj48aW5wdXQgY2xhc3M9InVwLWNoYXQtZmlsZSIgdHlwZT0iZmlsZSIgYWNjZXB0PSJpbWFnZS9wbmcsaW1hZ2UvanBlZyxpbWFnZS93ZWJwLGltYWdlL2dpZix2aWRlby9tcDQsdmlkZW8vd2VibSIgaGlkZGVuPjwvZGl2PjwvZGl2PjxidXR0b24gY2xhc3M9InVwLWNoYXQtc2VuZCI+RW52aWFyPC9idXR0b24+PGRpdiBjbGFzcz0idXAtY2hhdC1saWdodGJveCBoaWRkZW4iPjxidXR0b24gdHlwZT0iYnV0dG9uIiBjbGFzcz0idXAtY2hhdC1saWdodGJveC1jbG9zZSIgYXJpYS1sYWJlbD0iRmVjaGFyIj7DlzwvYnV0dG9uPjxpbWcgYWx0PSJJbWFnZW0gYW1wbGlhZGEiPjwvZGl2Pic7CiAgICB2YXIgcHJvZmlsZUJ0bj1jaGF0LnF1ZXJ5U2VsZWN0b3IoJy51cC1jaGF0LXByb2ZpbGUtYnRuJyk7aWYocHJvZmlsZUJ0bil7aHlkcmF0ZUF2YXRhcihwcm9maWxlQnRuLnF1ZXJ5U2VsZWN0b3IoJ2ltZycpLG1lbWJlcik7cHJvZmlsZUJ0bi5vbmNsaWNrPWZ1bmN0aW9uKGUpe2Uuc3RvcFByb3BhZ2F0aW9uKCk7b3BlblByb2ZpbGVNb2RhbCgpO307cHJvZmlsZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWVudGVyJyxmdW5jdGlvbihlKXtzaG93Q2hhdFByb2ZpbGVIb3Zlcihwcm9maWxlQnRuLnF1ZXJ5U2VsZWN0b3IoJ2ltZycpLG1lbWJlcixlKTt9KTtwcm9maWxlQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScscG9zaXRpb25DaGF0UHJvZmlsZUhvdmVyKTtwcm9maWxlQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbGVhdmUnLGhpZGVDaGF0UHJvZmlsZUhvdmVyKTt9CiAgICB2YXIgaW5wdXQ9Y2hhdC5xdWVyeVNlbGVjdG9yKCcudXAtY2hhdC1pbnB1dCcpLHBob3RvQnRuPWNoYXQucXVlcnlTZWxlY3RvcignLnVwLWNoYXQtYXR0YWNoJykscGhvdG9GaWxlPWNoYXQucXVlcnlTZWxlY3RvcignLnVwLWNoYXQtZmlsZScpLGVtb2ppQnRuPWNoYXQucXVlcnlTZWxlY3RvcignLnVwLWNoYXQtZW1vamktYnRuJyksZW1vamlNZW51PWNoYXQucXVlcnlTZWxlY3RvcignLnVwLWNoYXQtZW1vamktbWVudScpLHJlY29yZEJ0bj1jaGF0LnF1ZXJ5U2VsZWN0b3IoJy51cC1jaGF0LXJlY29yZCcpOwogICAgcGhvdG9CdG4ub25jbGljaz1mdW5jdGlvbihlKXtlLnN0b3BQcm9wYWdhdGlvbigpO3Bob3RvRmlsZS5jbGljaygpfTsKICAgIHBob3RvRmlsZS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLGZ1bmN0aW9uKCl7aWYocGhvdG9GaWxlLmZpbGVzJiZwaG90b0ZpbGUuZmlsZXNbMF0pc2VuZENoYXRNZWRpYShwaG90b0ZpbGUuZmlsZXNbMF0pfSk7CiAgICBzZXR1cEVtb2ppUGlja2VyKGVtb2ppQnRuLGVtb2ppTWVudSxpbnB1dCk7CiAgICBpZihyZWNvcmRCdG4pcmVjb3JkQnRuLm9uY2xpY2s9ZnVuY3Rpb24oZSl7ZS5zdG9wUHJvcGFnYXRpb24oKTt0b2dnbGVBdWRpb1JlY29yZGluZyhyZWNvcmRCdG4pO307CiAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKCdwYXN0ZScsZnVuY3Rpb24oZSl7dmFyIGl0ZW1zPWUuY2xpcGJvYXJkRGF0YSYmZS5jbGlwYm9hcmREYXRhLml0ZW1zP0FycmF5LmZyb20oZS5jbGlwYm9hcmREYXRhLml0ZW1zKTpbXTt2YXIgaXRlbT1pdGVtcy5maW5kKGZ1bmN0aW9uKHgpe3JldHVybiB4LmtpbmQ9PT0nZmlsZScmJi9eaW1hZ2VcLy9pLnRlc3QoeC50eXBlKX0pO2lmKGl0ZW0pe3ZhciBmaWxlPWl0ZW0uZ2V0QXNGaWxlKCk7aWYoZmlsZSl7ZS5wcmV2ZW50RGVmYXVsdCgpO3NlbmRDaGF0TWVkaWEoZmlsZSk7fX19KTsKICAgIGNoYXQucXVlcnlTZWxlY3RvcignLnVwLWNoYXQtcmVwbHktY2xvc2UnKS5vbmNsaWNrPWZ1bmN0aW9uKGUpe2Uuc3RvcFByb3BhZ2F0aW9uKCk7c2V0Q2hhdFJlcGx5KG51bGwpO307ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKGUpe3ZhciBtZW51PWNoYXQucXVlcnlTZWxlY3RvcignLnVwLWNoYXQtY29udGV4dC1tZW51Jyk7aWYobWVudSYmbWVudS5jbGFzc0xpc3QuY29udGFpbnMoJ3Nob3cnKSYmIW1lbnUuY29udGFpbnMoZS50YXJnZXQpKWhpZGVDaGF0Q29udGV4dE1lbnUoKTt9KTtjaGF0LnF1ZXJ5U2VsZWN0b3IoJy51cC1jaGF0LWJhY2snKS5vbmNsaWNrPWZ1bmN0aW9uKGUpe2Uuc3RvcFByb3BhZ2F0aW9uKCk7aGlkZUNoYXRDb250ZXh0TWVudSgpO3N0b3BUeXBpbmdIZWFydGJlYXQoKTtjaGF0LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO2NhcmQuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7YnJvYWRjYXN0Q2hhdFByZXNlbmNlKGZhbHNlKTtyZWZyZXNoKCk7fTsKICAgIHZhciBjbGVhckJ0bj1jaGF0LnF1ZXJ5U2VsZWN0b3IoJy51cC1jaGF0LWNsZWFyJyk7aWYoY2xlYXJCdG4pY2xlYXJCdG4ub25jbGljaz1jbGVhckNoYXRSaWNhcmRvOwogICAgdmFyIGxpZ2h0Ym94PWNoYXQucXVlcnlTZWxlY3RvcignLnVwLWNoYXQtbGlnaHRib3gnKTtpZihsaWdodGJveCl7bGlnaHRib3gucXVlcnlTZWxlY3RvcignLnVwLWNoYXQtbGlnaHRib3gtY2xvc2UnKS5vbmNsaWNrPWNsb3NlQ2hhdExpZ2h0Ym94O2xpZ2h0Ym94Lm9uY2xpY2s9ZnVuY3Rpb24oZSl7aWYoZS50YXJnZXQ9PT1saWdodGJveCljbG9zZUNoYXRMaWdodGJveCgpO319CiAgICBjaGF0LnF1ZXJ5U2VsZWN0b3IoJy51cC1jaGF0LXNlbmQnKS5vbmNsaWNrPWZ1bmN0aW9uKGUpe2Uuc3RvcFByb3BhZ2F0aW9uKCk7c2VuZENoYXQoKX07CiAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsZnVuY3Rpb24oKXtyZW5kZXJNZW50aW9uTWVudSgpO2hhbmRsZVR5cGluZ0lucHV0KCk7fSk7aW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLHJlbmRlck1lbnRpb25NZW51KTtpbnB1dC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcscmVuZGVyTWVudGlvbk1lbnUpO2lucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLGZ1bmN0aW9uKGUpe2lmKGUua2V5Lmxlbmd0aD09PTF8fGUua2V5PT09J0JhY2tzcGFjZSd8fGUua2V5PT09J0RlbGV0ZScpc3RhcnRUeXBpbmdIZWFydGJlYXQoKTt9KTtpbnB1dC5hZGRFdmVudExpc3RlbmVyKCdmb2N1cycsZnVuY3Rpb24oKXtpZihTdHJpbmcoaW5wdXQudmFsdWV8fCcnKS50cmltKCkpc3RhcnRUeXBpbmdIZWFydGJlYXQoKTt9KTtpbnB1dC5hZGRFdmVudExpc3RlbmVyKCdibHVyJyxmdW5jdGlvbigpe2lmKHR5cGluZ1N0b3BUaW1lciljbGVhclRpbWVvdXQodHlwaW5nU3RvcFRpbWVyKTt0eXBpbmdTdG9wVGltZXI9c2V0VGltZW91dChmdW5jdGlvbigpe3N0b3BUeXBpbmdIZWFydGJlYXQoKTt9LDEyMDApO30pOwogICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsZnVuY3Rpb24oZSl7aWYoZS5rZXk9PT0nRXNjYXBlJyl7dmFyIG1lbnU9Y2hhdC5xdWVyeVNlbGVjdG9yKCcudXAtbWVudGlvbi1tZW51Jyk7aWYobWVudSltZW51LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO3JldHVybjt9aWYoZS5rZXk9PT0nRW50ZXInJiYhZS5zaGlmdEtleSl7dmFyIG1lbnU9Y2hhdC5xdWVyeVNlbGVjdG9yKCcudXAtbWVudGlvbi1tZW51Jyk7aWYobWVudSYmIW1lbnUuY2xhc3NMaXN0LmNvbnRhaW5zKCdoaWRkZW4nKSl7dmFyIGZpcnN0PW1lbnUucXVlcnlTZWxlY3RvcignLnVwLW1lbnRpb24tb3B0aW9uJyk7aWYoZmlyc3Qpe2UucHJldmVudERlZmF1bHQoKTthcHBseU1lbnRpb24oZmlyc3QuZ2V0QXR0cmlidXRlKCdkYXRhLW5hbWUnKSk7cmV0dXJuO319ZS5wcmV2ZW50RGVmYXVsdCgpO3NlbmRDaGF0KCk7fX0pOwogICAgaWYoY2hhdENhY2hlLmxlbmd0aClyZW5kZXJDaGF0KCk7CiAgICBzdG9wTG9jYWxCYXJ1aSgpOwogICAgdXBkYXRlTHVjY2FQcmVzZW5jZShsdWNjYU9ubGluZSk7CiAgICBsb2FkQ2hhdCgpOwogICAgcG9sbENoYXRUeXBpbmcoKTsKICAgIGFwaSgnUE9TVCcsJy9hcGkvY2hhdC9yZWFkJyx7bWVzc2FnZUlkczpjaGF0Q2FjaGUuZmlsdGVyKGZ1bmN0aW9uKG0pe3JldHVybiBtLnVzZXIhPT1tZW1iZXI7fSkubWFwKGZ1bmN0aW9uKG0pe3JldHVybiBtLmlkO30pfSkudGhlbihmdW5jdGlvbigpe3NldFVucmVhZCgwKTt9KS5jYXRjaChmdW5jdGlvbigpe30pOwogIH0KICBmdW5jdGlvbiByZWZyZXNoQ2hhdEFmdGVyU2VuZChpbnB1dCxidG4pe2lmKGlucHV0KWlucHV0LnZhbHVlPScnO2lmKGJ0bilidG4uZGlzYWJsZWQ9ZmFsc2U7bG9hZENoYXQoKTtyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7fQogIGZ1bmN0aW9uIHNldHVwRW1vamlQaWNrZXIoYnRuLG1lbnUsaW5wdXQpewogICAgaWYoIWJ0bnx8IW1lbnV8fCFpbnB1dClyZXR1cm47CiAgICB2YXIgZW1vamlzPSfwn5iAIPCfmIMg8J+YhCDwn5iBIPCfmIYg8J+YhSDwn5iCIPCfmYIg8J+ZgyDwn5iJIPCfmIog8J+YjSDwn6WwIPCfmJgg8J+YjiDwn6SUIPCfmJAg8J+YkSDwn5i2IPCfmYQg8J+YjyDwn5i0IPCfpKMg8J+YrSDwn5ihIPCfpK8g8J+YsSDwn6SdIPCfkY0g8J+RjiDwn5GMIOKcjO+4jyDwn5mPIPCfkY8g8J+SqiDinaTvuI8g8J+noSDwn5KbIPCfkpog8J+SmSDwn5KcIPCflqQg8J+kjSDwn5KvIPCflKUg8J+OiSDwn5qAIOKchSDinYwg4q2QIPCfpKEg8J+kliDwn5GAIPCfq6EnLnNwbGl0KCcgJyk7CiAgICBtZW51LmlubmVySFRNTD1lbW9qaXMubWFwKGZ1bmN0aW9uKGUpe3JldHVybiAnPGJ1dHRvbiB0eXBlPSJidXR0b24iIGNsYXNzPSJ1cC1jaGF0LWVtb2ppIiBkYXRhLWVtb2ppPSInK2VzYyhlKSsnIj4nK2UrJzwvYnV0dG9uPic7fSkuam9pbignJyk7CiAgICBidG4ub25jbGljaz1mdW5jdGlvbihlKXtlLnN0b3BQcm9wYWdhdGlvbigpO21lbnUuY2xhc3NMaXN0LnRvZ2dsZSgnaGlkZGVuJyk7fTsKICAgIG1lbnUucXVlcnlTZWxlY3RvckFsbCgnLnVwLWNoYXQtZW1vamknKS5mb3JFYWNoKGZ1bmN0aW9uKGIpe2Iub25jbGljaz1mdW5jdGlvbihlKXtlLnByZXZlbnREZWZhdWx0KCk7ZS5zdG9wUHJvcGFnYXRpb24oKTt2YXIgdmFsdWU9aW5wdXQudmFsdWV8fCcnLHBvcz1pbnB1dC5zZWxlY3Rpb25TdGFydD09bnVsbD92YWx1ZS5sZW5ndGg6aW5wdXQuc2VsZWN0aW9uU3RhcnQsZW09Yi5nZXRBdHRyaWJ1dGUoJ2RhdGEtZW1vamknKXx8Jyc7aW5wdXQudmFsdWU9dmFsdWUuc2xpY2UoMCxwb3MpK2VtK3ZhbHVlLnNsaWNlKHBvcyk7cG9zKz1lbS5sZW5ndGg7aW5wdXQuZm9jdXMoKTtpbnB1dC5zZXRTZWxlY3Rpb25SYW5nZShwb3MscG9zKTt9O30pOwogICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKGUpe2lmKCFtZW51LmNvbnRhaW5zKGUudGFyZ2V0KSYmZS50YXJnZXQhPT1idG4pbWVudS5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTt9KTsKICB9CiAgZnVuY3Rpb24gdXBkYXRlUmVjb3JkaW5nVWkoYnRuLGFjdGl2ZSl7dmFyIGxhYmVsPWNoYXQucXVlcnlTZWxlY3RvcignLnVwLWNoYXQtcmVjb3JkaW5nLWxhYmVsJyk7dmFyIHRpbWU9Y2hhdC5xdWVyeVNlbGVjdG9yKCcudXAtY2hhdC1yZWNvcmRpbmctdGltZScpO2lmKGJ0bilidG4uY2xhc3NMaXN0LnRvZ2dsZSgncmVjb3JkaW5nJyxhY3RpdmUpO2lmKGxhYmVsKWxhYmVsLmNsYXNzTGlzdC50b2dnbGUoJ3Nob3cnLGFjdGl2ZSk7aWYoIWFjdGl2ZSYmdGltZSl0aW1lLnRleHRDb250ZW50PScwOjAwJzt9CiAgZnVuY3Rpb24gc3RvcEF1ZGlvUmVjb3JkaW5nKHNlbmQpe3ZhciByZWM9bWVkaWFSZWNvcmRlcjtpZighcmVjKXJldHVybjtyZWMuX19zZW5kT25TdG9wPSEhc2VuZDt0cnl7aWYocmVjLnN0YXRlPT09J3JlY29yZGluZycpe3RyeXtyZWMucmVxdWVzdERhdGEoKTt9Y2F0Y2goZSl7fXJlYy5zdG9wKCk7fX1jYXRjaChlKXtmaW5pc2hBdWRpb1JlY29yZGluZyhyZWMpO319CiAgZnVuY3Rpb24gZmluaXNoQXVkaW9SZWNvcmRpbmcocmVjKXt0cnl7aWYocmVjJiZyZWMuc3RyZWFtKXJlYy5zdHJlYW0uZ2V0VHJhY2tzKCkuZm9yRWFjaChmdW5jdGlvbih0KXt0LnN0b3AoKTt9KTt9Y2F0Y2goZSl7fWNsZWFySW50ZXJ2YWwocmVjb3JkaW5nVGltZXIpO3JlY29yZGluZ1RpbWVyPW51bGw7dXBkYXRlUmVjb3JkaW5nVWkoY2hhdC5xdWVyeVNlbGVjdG9yKCcudXAtY2hhdC1yZWNvcmQnKSxmYWxzZSk7bWVkaWFSZWNvcmRlcj1udWxsO30KICBmdW5jdGlvbiB0b2dnbGVBdWRpb1JlY29yZGluZyhidG4pewogICAgaWYobWVkaWFSZWNvcmRlciYmbWVkaWFSZWNvcmRlci5zdGF0ZT09PSdyZWNvcmRpbmcnKXtzdG9wQXVkaW9SZWNvcmRpbmcodHJ1ZSk7cmV0dXJuO30KICAgIGlmKCFuYXZpZ2F0b3IubWVkaWFEZXZpY2VzfHwhbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWF8fHR5cGVvZiBNZWRpYVJlY29yZGVyPT09J3VuZGVmaW5lZCcpe21lc3NhZ2UoJ1NldSBuYXZlZ2Fkb3IgbsOjbyBzdXBvcnRhIGdyYXZhw6fDo28gZGUgw6F1ZGlvLicsdHJ1ZSk7cmV0dXJuO30KICAgIG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKHthdWRpbzp7Y2hhbm5lbENvdW50OjEsZWNob0NhbmNlbGxhdGlvbjp0cnVlLG5vaXNlU3VwcHJlc3Npb246dHJ1ZSxhdXRvR2FpbkNvbnRyb2w6dHJ1ZX19KS50aGVuKGZ1bmN0aW9uKHN0cmVhbSl7CiAgICAgIHJlY29yZGluZ0NodW5rcz1bXTtyZWNvcmRpbmdTdGFydGVkQXQ9RGF0ZS5ub3coKTt2YXIgbWltZT0nJzsKICAgICAgWydhdWRpby93ZWJtO2NvZGVjcz1vcHVzJywnYXVkaW8vd2VibScsJ2F1ZGlvL21wNCcsJ2F1ZGlvL21wZWcnXS5zb21lKGZ1bmN0aW9uKHgpe2lmKE1lZGlhUmVjb3JkZXIuaXNUeXBlU3VwcG9ydGVkJiZNZWRpYVJlY29yZGVyLmlzVHlwZVN1cHBvcnRlZCh4KSl7bWltZT14O3JldHVybiB0cnVlO31yZXR1cm4gZmFsc2U7fSk7CiAgICAgIHZhciBvcHRpb25zPW1pbWU/e21pbWVUeXBlOm1pbWUsYXVkaW9CaXRzUGVyU2Vjb25kOjEyODAwMH06e307CiAgICAgIHZhciByZWM9bmV3IE1lZGlhUmVjb3JkZXIoc3RyZWFtLG9wdGlvbnMpO21lZGlhUmVjb3JkZXI9cmVjO3JlYy5fX3NlbmRPblN0b3A9dHJ1ZTtyZWMuX19taW1lPW1pbWU7CiAgICAgIHJlYy5vbmRhdGFhdmFpbGFibGU9ZnVuY3Rpb24oZSl7aWYoZS5kYXRhJiZlLmRhdGEuc2l6ZSlyZWNvcmRpbmdDaHVua3MucHVzaChlLmRhdGEpO307CiAgICAgIHJlYy5vbmVycm9yPWZ1bmN0aW9uKCl7ZmluaXNoQXVkaW9SZWNvcmRpbmcocmVjKTtyZWNvcmRpbmdDaHVua3M9W107bWVzc2FnZSgnTsOjbyBmb2kgcG9zc8OtdmVsIGdyYXZhciBvIMOhdWRpby4nLHRydWUpO307CiAgICAgIHJlYy5vbnN0b3A9ZnVuY3Rpb24oKXt2YXIgc2hvdWxkU2VuZD0hIXJlYy5fX3NlbmRPblN0b3A7dmFyIG1pbWVUeXBlPXJlYy5taW1lVHlwZXx8bWltZXx8J2F1ZGlvL3dlYm0nO3ZhciBjaHVua3M9cmVjb3JkaW5nQ2h1bmtzLnNsaWNlKCk7cmVjb3JkaW5nQ2h1bmtzPVtdO2ZpbmlzaEF1ZGlvUmVjb3JkaW5nKHJlYyk7aWYoIXNob3VsZFNlbmR8fCFjaHVua3MubGVuZ3RoKXJldHVybjt2YXIgYmxvYj1uZXcgQmxvYihjaHVua3Mse3R5cGU6bWltZVR5cGV9KTtpZihibG9iLnNpemU+NSoxMDI0KjEwMjQpe21lc3NhZ2UoJ08gw6F1ZGlvIGZpY291IG1haW9yIHF1ZSA1IE1CLicsdHJ1ZSk7cmV0dXJuO312YXIgcmVhZGVyPW5ldyBGaWxlUmVhZGVyKCk7cmVhZGVyLm9ubG9hZD1mdW5jdGlvbigpe3NlbmRDaGF0QXVkaW9EYXRhKFN0cmluZyhyZWFkZXIucmVzdWx0KSk7fTtyZWFkZXIub25lcnJvcj1mdW5jdGlvbigpe21lc3NhZ2UoJ07Do28gZm9pIHBvc3PDrXZlbCBwcmVwYXJhciBvIMOhdWRpby4nLHRydWUpO307cmVhZGVyLnJlYWRBc0RhdGFVUkwoYmxvYik7fTsKICAgICAgcmVjLnN0YXJ0KDI1MCk7dXBkYXRlUmVjb3JkaW5nVWkoYnRuLHRydWUpO3JlY29yZGluZ1RpbWVyPXNldEludGVydmFsKGZ1bmN0aW9uKCl7dmFyIGVsYXBzZWQ9TWF0aC5mbG9vcigoRGF0ZS5ub3coKS1yZWNvcmRpbmdTdGFydGVkQXQpLzEwMDApLHRpbWU9Y2hhdC5xdWVyeVNlbGVjdG9yKCcudXAtY2hhdC1yZWNvcmRpbmctdGltZScpO2lmKHRpbWUpdGltZS50ZXh0Q29udGVudD0nMDonK1N0cmluZyhNYXRoLm1pbihlbGFwc2VkLDMwKSkucGFkU3RhcnQoMiwnMCcpO2lmKGVsYXBzZWQ+PTMwKXN0b3BBdWRpb1JlY29yZGluZyh0cnVlKTt9LDI1MCk7CiAgICB9KS5jYXRjaChmdW5jdGlvbihlKXttZXNzYWdlKGUubmFtZT09PSdOb3RBbGxvd2VkRXJyb3InPydQZXJtaXRhIG8gdXNvIGRvIG1pY3JvZm9uZSBwYXJhIGdyYXZhciDDoXVkaW8uJzonTsOjbyBmb2kgcG9zc8OtdmVsIGFjZXNzYXIgbyBtaWNyb2ZvbmUuJyx0cnVlKTt9KTsKICB9CiAgZnVuY3Rpb24gc2VuZENoYXRBdWRpb0RhdGEoZGF0YVVybCl7dmFyIHNlbmQ9Y2hhdC5xdWVyeVNlbGVjdG9yKCcudXAtY2hhdC1zZW5kJykscmVjb3JkPWNoYXQucXVlcnlTZWxlY3RvcignLnVwLWNoYXQtcmVjb3JkJyk7aWYoc2VuZClzZW5kLmRpc2FibGVkPXRydWU7aWYocmVjb3JkKXJlY29yZC5kaXNhYmxlZD10cnVlO3ZhciByYXc9U3RyaW5nKGRhdGFVcmx8fCcnKTt2YXIgbWF0Y2g9cmF3Lm1hdGNoKC9eZGF0YTooYXVkaW9cL1teOyxdKykoPzo7W14sXSopPztiYXNlNjQsL2kpO2lmKCFtYXRjaCl7aWYoc2VuZClzZW5kLmRpc2FibGVkPWZhbHNlO2lmKHJlY29yZClyZWNvcmQuZGlzYWJsZWQ9ZmFsc2U7bWVzc2FnZSgnw4F1ZGlvIGludsOhbGlkby4nLHRydWUpO3JldHVybjt9YXBpKCdQT1NUJywnL2FwaS9jaGF0L2F1ZGlvJyx7ZGF0YVVybDpyYXd9KS50aGVuKGZ1bmN0aW9uKHIpe3JldHVybiBhcGkoJ1BPU1QnLCcvYXBpL2NoYXQnLHttZXNzYWdlOicnLGltYWdlVXJsOnIuaW1hZ2VVcmwsdHlwZTonYXVkaW8nLHJlcGx5VG86Y2hhdFJlcGx5VG99KTt9KS50aGVuKGZ1bmN0aW9uKCl7Y2hhdFJlcGx5VG89bnVsbDtzZXRDaGF0UmVwbHkobnVsbCk7c3RvcFR5cGluZ0hlYXJ0YmVhdCgpO3JldHVybiByZWZyZXNoQ2hhdEFmdGVyU2VuZChudWxsLHNlbmQpO30pLmNhdGNoKGZ1bmN0aW9uKGUpe2lmKHNlbmQpc2VuZC5kaXNhYmxlZD1mYWxzZTttZXNzYWdlKGUubWVzc2FnZSx0cnVlKTt9KS5maW5hbGx5KGZ1bmN0aW9uKCl7aWYocmVjb3JkKXJlY29yZC5kaXNhYmxlZD1mYWxzZTt9KTsKICB9CiAgZnVuY3Rpb24gY2xlYXJDaGF0UmljYXJkbygpe2lmKG1lbWJlciE9PSdSaWNhcmRvJylyZXR1cm47aWYoIWNvbmZpcm0oJ0xpbXBhciB0b2RvIG8gY2hhdCBwYXJhIGEgZXF1aXBlPycpKXJldHVybjthcGkoJ1BPU1QnLCcvYXBpL2NoYXQvY2xlYXInLHt9KS50aGVuKGZ1bmN0aW9uKCl7Y2hhdENhY2hlPVtdO2NoYXRMYXN0UmVuZGVyS2V5PScnO3JldHVybiBhcGkoJ0dFVCcsJy9hcGkvY2hhdCcpO30pLnRoZW4oZnVuY3Rpb24oZCl7Y2hhdENhY2hlPWQubWVzc2FnZXN8fFtdO2lmKGQucHJvZmlsZXMpcHJvZmlsZUNhY2hlPWQucHJvZmlsZXM7cmVuZGVyQ2hhdCgpO30pLmNhdGNoKGZ1bmN0aW9uKGUpe21lc3NhZ2UoZS5tZXNzYWdlLHRydWUpO30pO30KICBmdW5jdGlvbiBzZW5kQ2hhdCgpewogICAgdmFyIGlucHV0PWNoYXQucXVlcnlTZWxlY3RvcignLnVwLWNoYXQtaW5wdXQnKSx0ZXh0PShpbnB1dC52YWx1ZXx8JycpLnRyaW0oKTsKICAgIGlmKCF0ZXh0KXJldHVybjsKICAgIHZhciBidG49Y2hhdC5xdWVyeVNlbGVjdG9yKCcudXAtY2hhdC1zZW5kJyk7YnRuLmRpc2FibGVkPXRydWU7CiAgICB2YXIgdGVtcElkPSdsb2NhbC0nK0RhdGUubm93KCkrJy0nK01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIsOCk7CiAgICB2YXIgdGVtcFJlcGx5PWNoYXRSZXBseVRvOwogICAgdmFyIG9wdGltaXN0aWM9e2lkOnRlbXBJZCx1c2VyOm1lbWJlcixtZXNzYWdlOnRleHQsdHlwZTondGV4dCcsc3lzdGVtVHlwZTonJyxjcmVhdGVkQXQ6bmV3IERhdGUoKS50b0lTT1N0cmluZygpLGltYWdlVXJsOicnLG1lbnRpb25zOltdLHJlcGx5VG86dGVtcFJlcGx5LHJlYWN0aW9uczp7fSxyZWFkQnk6W10sb3B0aW1pc3RpYzp0cnVlfTsKICAgIGNoYXRDYWNoZS5wdXNoKG9wdGltaXN0aWMpOwogICAgcmVuZGVyQ2hhdCgpOwogICAgaW5wdXQudmFsdWU9Jyc7CiAgICBjaGF0UmVwbHlUbz1udWxsO3NldENoYXRSZXBseShudWxsKTsKICAgIGFwaSgnUE9TVCcsJy9hcGkvY2hhdCcse21lc3NhZ2U6dGV4dCxyZXBseVRvOnRlbXBSZXBseX0pLnRoZW4oZnVuY3Rpb24ocil7CiAgICAgIHZhciBjcmVhdGVkPXImJnIubWVzc2FnZTsKICAgICAgaWYoY3JlYXRlZCl7CiAgICAgICAgY2hhdENhY2hlPWNoYXRDYWNoZS5tYXAoZnVuY3Rpb24obSl7cmV0dXJuIG0uaWQ9PT10ZW1wSWQ/Y3JlYXRlZDptO30pOwogICAgICAgIHJlbmRlckNoYXQoKTsKICAgICAgfWVsc2V7CiAgICAgICAgY2hhdENhY2hlPWNoYXRDYWNoZS5maWx0ZXIoZnVuY3Rpb24obSl7cmV0dXJuIG0uaWQhPT10ZW1wSWQ7fSk7CiAgICAgICAgbG9hZENoYXQoKTsKICAgICAgfQogICAgfSkuY2F0Y2goZnVuY3Rpb24oZSl7CiAgICAgIGNoYXRDYWNoZT1jaGF0Q2FjaGUuZmlsdGVyKGZ1bmN0aW9uKG0pe3JldHVybiBtLmlkIT09dGVtcElkO30pOwogICAgICByZW5kZXJDaGF0KCk7CiAgICAgIGlmKGlucHV0KWlucHV0LnZhbHVlPXRleHQ7CiAgICAgIG1lc3NhZ2UoZS5tZXNzYWdlfHwnTsOjbyBmb2kgcG9zc8OtdmVsIGVudmlhciBhIG1lbnNhZ2VtLicsdHJ1ZSk7CiAgICB9KS5maW5hbGx5KGZ1bmN0aW9uKCl7aWYoYnRuKWJ0bi5kaXNhYmxlZD1mYWxzZTt9KTsKICB9CiAgZnVuY3Rpb24gZmlsZU1pbWVGcm9tRXh0KGV4dCl7cmV0dXJuICh7cG5nOidpbWFnZS9wbmcnLGpwZzonaW1hZ2UvanBlZycsanBlZzonaW1hZ2UvanBlZycsd2VicDonaW1hZ2Uvd2VicCcsZ2lmOidpbWFnZS9naWYnLG1wNDondmlkZW8vbXA0Jyx3ZWJtOid2aWRlby93ZWJtJ30pW2V4dF18fCcnO30KICBmdW5jdGlvbiByZXNvbHZlRmlsZU1pbWUoZmlsZSxhbGxvd1ZpZGVvKXsKICAgIHZhciB0eXBlPVN0cmluZyhmaWxlJiZmaWxlLnR5cGV8fCcnKS50b0xvd2VyQ2FzZSgpLGV4dD1TdHJpbmcoZmlsZSYmZmlsZS5uYW1lfHwnJykuc3BsaXQoJy4nKS5wb3AoKS50b0xvd2VyQ2FzZSgpOwogICAgdmFyIGV4dE1pbWU9ZmlsZU1pbWVGcm9tRXh0KGV4dCk7CiAgICB2YXIgdHlwZU9rPWFsbG93VmlkZW8/L14oaW1hZ2VcLyhwbmd8anBlP2d8d2VicHxnaWYpfHZpZGVvXC8obXA0fHdlYm0pKSQvaS50ZXN0KHR5cGUpOi9eaW1hZ2VcLyhwbmd8anBlP2d8d2VicHxnaWYpJC9pLnRlc3QodHlwZSk7CiAgICB2YXIgbWltZT10eXBlT2s/dHlwZTpleHRNaW1lOwogICAgdmFyIG9rPWFsbG93VmlkZW8/L14oaW1hZ2VcLyhwbmd8anBlP2d8d2VicHxnaWYpfHZpZGVvXC8obXA0fHdlYm0pKSQvaS50ZXN0KG1pbWUpOi9eaW1hZ2VcLyhwbmd8anBlP2d8d2VicHxnaWYpJC9pLnRlc3QobWltZSk7CiAgICByZXR1cm4ge21pbWU6bWltZSxleHQ6ZXh0LG9rOm9rfTsKICB9CiAgZnVuY3Rpb24gZmlsZVRvRGF0YVVybChmaWxlKXtyZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe2lmKCFmaWxlKXtyZWplY3QobmV3IEVycm9yKCdOZW5odW0gYXJxdWl2byBzZWxlY2lvbmFkby4nKSk7cmV0dXJuO312YXIgaW5mbz1yZXNvbHZlRmlsZU1pbWUoZmlsZSx0cnVlKTtpZighaW5mby5vayl7cmVqZWN0KG5ldyBFcnJvcignVXNlIFBORywgSlBHLCBXRUJQLCBHSUYsIE1QNCBvdSBXRUJNLicpKTtyZXR1cm47fXZhciBtYXg9L152aWRlb1wvL2kudGVzdChpbmZvLm1pbWUpPzI1KjEwMjQqMTAyNDo1KjEwMjQqMTAyNDtpZihmaWxlLnNpemU+bWF4KXtyZWplY3QobmV3IEVycm9yKCdPIGFycXVpdm8gZGV2ZSB0ZXIgbm8gbcOheGltbyAnKyhtYXgvMTAyNC8xMDI0KSsnIE1CLicpKTtyZXR1cm47fXZhciByZWFkZXI9bmV3IEZpbGVSZWFkZXIoKTtyZWFkZXIub25sb2FkPWZ1bmN0aW9uKCl7dmFyIGRhdGE9cmVhZGVyLnJlc3VsdDtpZighKGRhdGEgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikpe3Jlc29sdmUoU3RyaW5nKGRhdGEpKTtyZXR1cm47fXZhciBieXRlcz1uZXcgVWludDhBcnJheShkYXRhKSxiaW49Jyc7Zm9yKHZhciBpPTA7aTxieXRlcy5sZW5ndGg7aSs9MHg4MDAwKWJpbis9U3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShudWxsLGJ5dGVzLnN1YmFycmF5KGksaSsweDgwMDApKTtyZXNvbHZlKCdkYXRhOicraW5mby5taW1lKyc7YmFzZTY0LCcrYnRvYShiaW4pKTt9O3JlYWRlci5vbmVycm9yPWZ1bmN0aW9uKCl7cmVqZWN0KG5ldyBFcnJvcignTsOjbyBmb2kgcG9zc8OtdmVsIGxlciBvIGFycXVpdm8uJykpO307cmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGZpbGUpO30pO30KICBmdW5jdGlvbiBmaWxlVG9EYXRhVXJsRm9yUHJvZmlsZShmaWxlLHR5cGUsZXh0KXt2YXIgaW5mbz1yZXNvbHZlRmlsZU1pbWUoZmlsZSxmYWxzZSksbWltZT1pbmZvLm9rP2luZm8ubWltZTpmaWxlTWltZUZyb21FeHQoZXh0KTtpZighL15pbWFnZVwvL2kudGVzdChtaW1lKSl7cmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcignVXNlIFBORywgSlBHLCBXRUJQIG91IEdJRi4nKSk7fXJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7dmFyIHJlYWRlcj1uZXcgRmlsZVJlYWRlcigpO3JlYWRlci5vbmxvYWQ9ZnVuY3Rpb24oKXt0cnl7dmFyIGJ5dGVzPW5ldyBVaW50OEFycmF5KHJlYWRlci5yZXN1bHQpLGJpbj0nJztmb3IodmFyIGk9MDtpPGJ5dGVzLmxlbmd0aDtpKz0weDgwMDApYmluKz1TdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KG51bGwsYnl0ZXMuc3ViYXJyYXkoaSxpKzB4ODAwMCkpO3Jlc29sdmUoJ2RhdGE6JyttaW1lKyc7YmFzZTY0LCcrYnRvYShiaW4pKTt9Y2F0Y2goZSl7cmVqZWN0KG5ldyBFcnJvcignTsOjbyBmb2kgcG9zc8OtdmVsIHByZXBhcmFyIGEgZm90by4nKSk7fX07cmVhZGVyLm9uZXJyb3I9ZnVuY3Rpb24oKXtyZWplY3QobmV3IEVycm9yKCdOw6NvIGZvaSBwb3Nzw612ZWwgbGVyIGEgZm90by4nKSk7fTtyZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoZmlsZSk7fSk7fQogIGZ1bmN0aW9uIHNlbmRDaGF0TWVkaWEoZmlsZSl7dmFyIGJ0bj1jaGF0LnF1ZXJ5U2VsZWN0b3IoJy51cC1jaGF0LXNlbmQnKSxwaG90b0J0bj1jaGF0LnF1ZXJ5U2VsZWN0b3IoJy51cC1jaGF0LWF0dGFjaCcpO2lmKGJ0bilidG4uZGlzYWJsZWQ9dHJ1ZTtpZihwaG90b0J0bilwaG90b0J0bi5kaXNhYmxlZD10cnVlO2ZpbGVUb0RhdGFVcmwoZmlsZSkudGhlbihmdW5jdGlvbihkYXRhVXJsKXtyZXR1cm4gYXBpKCdQT1NUJywnL2FwaS9jaGF0L2ltYWdlJyx7ZGF0YVVybDpkYXRhVXJsfSl9KS50aGVuKGZ1bmN0aW9uKHIpe3JldHVybiBhcGkoJ1BPU1QnLCcvYXBpL2NoYXQnLHttZXNzYWdlOicnLGltYWdlVXJsOnIuaW1hZ2VVcmwsdHlwZTpyLnR5cGUscmVwbHlUbzpjaGF0UmVwbHlUb30pfSkudGhlbihmdW5jdGlvbigpe3JldHVybiByZWZyZXNoQ2hhdEFmdGVyU2VuZChudWxsLGJ0bil9KS5jYXRjaChmdW5jdGlvbihlKXtpZihidG4pYnRuLmRpc2FibGVkPWZhbHNlO21lc3NhZ2UoZS5tZXNzYWdlLHRydWUpfSkuZmluYWxseShmdW5jdGlvbigpe2lmKHBob3RvQnRuKXBob3RvQnRuLmRpc2FibGVkPWZhbHNlfSk7fQoKICBmdW5jdGlvbiBvcGVuUHJvZmlsZU1vZGFsKCl7dmFyIGZpbGU9cHJvZmlsZU1vZGFsLnF1ZXJ5U2VsZWN0b3IoJy51cC1jaGF0LXByb2ZpbGUtZmlsZScpLHByZXZpZXc9cHJvZmlsZU1vZGFsLnF1ZXJ5U2VsZWN0b3IoJy51cC1jaGF0LXByb2ZpbGUtcHJldmlldycpLG1zZz1wcm9maWxlTW9kYWwucXVlcnlTZWxlY3RvcignLnVwLWNoYXQtcHJvZmlsZS1tZXNzYWdlJyk7bXNnLnRleHRDb250ZW50PScnO2ZpbGUudmFsdWU9Jyc7aHlkcmF0ZUF2YXRhcihwcmV2aWV3LG1lbWJlcik7cHJvZmlsZU1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO30KICBmdW5jdGlvbiBjbG9zZVByb2ZpbGVNb2RhbCgpe3Byb2ZpbGVNb2RhbC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTt9CiAgcHJvZmlsZU1vZGFsLnF1ZXJ5U2VsZWN0b3IoJy51cC1jaGF0LXByb2ZpbGUtY2FuY2VsJykub25jbGljaz1mdW5jdGlvbigpe2Nsb3NlUHJvZmlsZU1vZGFsKCk7fTtwcm9maWxlTW9kYWwub25jbGljaz1mdW5jdGlvbihlKXtpZihlLnRhcmdldD09PXByb2ZpbGVNb2RhbCljbG9zZVByb2ZpbGVNb2RhbCgpO307CiAgcHJvZmlsZU1vZGFsLnF1ZXJ5U2VsZWN0b3IoJy51cC1jaGF0LXByb2ZpbGUtZmlsZScpLm9uY2hhbmdlPWZ1bmN0aW9uKCl7dmFyIGY9dGhpcy5maWxlcyYmdGhpcy5maWxlc1swXSxtc2c9cHJvZmlsZU1vZGFsLnF1ZXJ5U2VsZWN0b3IoJy51cC1jaGF0LXByb2ZpbGUtbWVzc2FnZScpO2lmKCFmKXJldHVybjt2YXIgdHlwZT1TdHJpbmcoZi50eXBlfHwnJykudG9Mb3dlckNhc2UoKSxleHQ9U3RyaW5nKGYubmFtZXx8JycpLnNwbGl0KCcuJykucG9wKCkudG9Mb3dlckNhc2UoKTt2YXIgb2tUeXBlPS9eaW1hZ2VcLyhwbmd8anBlP2d8d2VicHxnaWYpJC9pLnRlc3QodHlwZSl8fFsncG5nJywnanBnJywnanBlZycsJ3dlYnAnLCdnaWYnXS5pbmRleE9mKGV4dCk+PTA7aWYoIW9rVHlwZSl7bXNnLnRleHRDb250ZW50PSdVc2UgUE5HLCBKUEcsIFdFQlAgb3UgR0lGLic7cmV0dXJuO31pZihmLnNpemU+MioxMDI0KjEwMjQpe21zZy50ZXh0Q29udGVudD0nQSBmb3RvIGRldmUgdGVyIG5vIG3DoXhpbW8gMiBNQi4nO3JldHVybjt9ZmlsZVRvRGF0YVVybEZvclByb2ZpbGUoZix0eXBlLGV4dCkudGhlbihmdW5jdGlvbihkYXRhKXtwcm9maWxlTW9kYWwucXVlcnlTZWxlY3RvcignLnVwLWNoYXQtcHJvZmlsZS1wcmV2aWV3Jykuc3JjPWRhdGE7bXNnLnRleHRDb250ZW50PScnO30pLmNhdGNoKGZ1bmN0aW9uKGUpe21zZy50ZXh0Q29udGVudD1lLm1lc3NhZ2U7fSk7fTsKICBwcm9maWxlTW9kYWwucXVlcnlTZWxlY3RvcignLnVwLWNoYXQtcHJvZmlsZS1zYXZlJykub25jbGljaz1mdW5jdGlvbigpe3ZhciBmaWxlPXByb2ZpbGVNb2RhbC5xdWVyeVNlbGVjdG9yKCcudXAtY2hhdC1wcm9maWxlLWZpbGUnKS5maWxlcyYmcHJvZmlsZU1vZGFsLnF1ZXJ5U2VsZWN0b3IoJy51cC1jaGF0LXByb2ZpbGUtZmlsZScpLmZpbGVzWzBdLG1zZz1wcm9maWxlTW9kYWwucXVlcnlTZWxlY3RvcignLnVwLWNoYXQtcHJvZmlsZS1tZXNzYWdlJyksYnRuPXRoaXM7aWYoIWZpbGUpe21zZy50ZXh0Q29udGVudD0nRXNjb2xoYSB1bWEgZm90by4nO3JldHVybjt9YnRuLmRpc2FibGVkPXRydWU7bXNnLnRleHRDb250ZW50PSdTYWx2YW5kb+KApic7ZmlsZVRvRGF0YVVybChmaWxlKS50aGVuKGZ1bmN0aW9uKGRhdGEpe3JldHVybiBhcGkoJ1BPU1QnLCcvYXBpL3Byb2ZpbGUvYXZhdGFyJyx7ZGF0YVVybDpkYXRhfSk7fSkudGhlbihmdW5jdGlvbihyKXt2YXIgY2s9J3Byb2ZpbGU6JyttZW1iZXI7aWYobWVkaWFCbG9iQ2FjaGVbY2tdKXt0cnl7VVJMLnJldm9rZU9iamVjdFVSTChtZWRpYUJsb2JDYWNoZVtja10pO31jYXRjaChlKXt9ZGVsZXRlIG1lZGlhQmxvYkNhY2hlW2NrXTt9R01fc2V0VmFsdWUoa2V5K2NrLHIuYXZhdGFyVXJsKTtwcm9maWxlQ2FjaGVbbWVtYmVyXT1yLmF2YXRhclVybDtoeWRyYXRlQXZhdGFyKHByb2ZpbGVNb2RhbC5xdWVyeVNlbGVjdG9yKCcudXAtY2hhdC1wcm9maWxlLXByZXZpZXcnKSxtZW1iZXIpO3VwZGF0ZUJ1YmJsZUF2YXRhcihmYWxzZSk7Y2xvc2VQcm9maWxlTW9kYWwoKTtsb2FkQ2hhdCgpO30pLmNhdGNoKGZ1bmN0aW9uKGUpe21zZy50ZXh0Q29udGVudD1lLm1lc3NhZ2U7fSkuZmluYWxseShmdW5jdGlvbigpe2J0bi5kaXNhYmxlZD1mYWxzZTt9KTt9OwoKICBmdW5jdGlvbiBoZWFsdGhMZWQob2ssa2luZCl7cmV0dXJuICc8c3BhbiBjbGFzcz0idXAtaGVhbHRoLWxlZCAnKyhvaz8nb2snOmtpbmR8fCdiYWQnKSsnIj48L3NwYW4+Jzt9CiAgZnVuY3Rpb24gb3BlbkhlYWx0aCgpewogICAgaWYobWVtYmVyIT09J1JpY2FyZG8nKXJldHVybjsKICAgIGNhcmQuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7CiAgICBoaXN0b3J5LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpOwogICAgY2hhdC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTsKICAgIGhlYWx0aC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9InVwLWhlYWx0aC1oZWFkIj48ZGl2PjxkaXYgY2xhc3M9InVwLWhlYWx0aC10aXRsZSI+U2HDumRlIGRvIHNpc3RlbWE8L2Rpdj48ZGl2IGNsYXNzPSJ1cC1oZWFsdGgtc3ViIj5WaXPDo28gYWRtaW5pc3RyYXRpdmEg4oCiIFJpY2FyZG88L2Rpdj48L2Rpdj48YnV0dG9uIHR5cGU9ImJ1dHRvbiIgY2xhc3M9InVwLWhlYWx0aC1jbG9zZSI+RmVjaGFyPC9idXR0b24+PC9kaXY+PGRpdiBjbGFzcz0idXAtaGVhbHRoLWxpc3QiPjxkaXYgY2xhc3M9InVwLWhlYWx0aC1yb3ciPjxkaXYgY2xhc3M9InVwLWhlYWx0aC1sZWZ0Ij4nK2hlYWx0aExlZCh0cnVlKSsnPHNwYW4gY2xhc3M9InVwLWhlYWx0aC1uYW1lIj5WZXJpZmljYW5kbyBvIHNpc3RlbWE8L3NwYW4+PC9kaXY+PHNwYW4gY2xhc3M9InVwLWhlYWx0aC1kZXRhaWwiPkFndWFyZGXigKY8L3NwYW4+PC9kaXY+PC9kaXY+PGRpdiBjbGFzcz0idXAtaGVhbHRoLWZvb3RlciI+VmVyZGU6IGZ1bmNpb25hbmRvLiBBbWFyZWxvOiByZWNvbmVjdGFuZG8uIFZlcm1lbGhvOiBwcmVjaXNhIGRlIGF0ZW7Dp8Ojby48L2Rpdj48YnV0dG9uIHR5cGU9ImJ1dHRvbiIgY2xhc3M9InVwLWhlYWx0aC1yZWZyZXNoIj5BdHVhbGl6YXIgYWdvcmE8L2J1dHRvbj4nOwogICAgaGVhbHRoLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpOwogICAgaGVhbHRoLnF1ZXJ5U2VsZWN0b3IoJy51cC1oZWFsdGgtY2xvc2UnKS5vbmNsaWNrPWZ1bmN0aW9uKCl7aGVhbHRoLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO2NhcmQuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7fTsKICAgIGhlYWx0aC5xdWVyeVNlbGVjdG9yKCcudXAtaGVhbHRoLXJlZnJlc2gnKS5vbmNsaWNrPWZ1bmN0aW9uKCl7bG9hZEhlYWx0aCgpO307CiAgICBsb2FkSGVhbHRoKCk7CiAgfQogIGZ1bmN0aW9uIGxvYWRIZWFsdGgoKXsKICAgIGlmKG1lbWJlciE9PSdSaWNhcmRvJ3x8aGVhbHRoLmNsYXNzTGlzdC5jb250YWlucygnaGlkZGVuJykpcmV0dXJuOwogICAgdmFyIGxpc3Q9aGVhbHRoLnF1ZXJ5U2VsZWN0b3IoJy51cC1oZWFsdGgtbGlzdCcpOwogICAgaWYoIWxpc3QpcmV0dXJuOwogICAgbGlzdC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9InVwLWhlYWx0aC1yb3ciPjxkaXYgY2xhc3M9InVwLWhlYWx0aC1sZWZ0Ij4nK2hlYWx0aExlZCh0cnVlKSsnPHNwYW4gY2xhc3M9InVwLWhlYWx0aC1uYW1lIj5Db25zdWx0YW5kbyBkaWFnbsOzc3RpY288L3NwYW4+PC9kaXY+PHNwYW4gY2xhc3M9InVwLWhlYWx0aC1kZXRhaWwiPkFndWFyZGXigKY8L3NwYW4+PC9kaXY+JzsKICAgIHZhciBzdGFydGVkPURhdGUubm93KCk7CiAgICBhcGkoJ0dFVCcsJy9hcGkvaGVhbHRoJykudGhlbihmdW5jdGlvbihkKXsKICAgICAgdmFyIGFwaU1zPURhdGUubm93KCktc3RhcnRlZDsKICAgICAgdmFyIGRiPWQmJmQuZGJ8fHt9OwogICAgICB2YXIgY2hhdENoZWNrPWQmJmQuY2hhdHx8e307CiAgICAgIHZhciBzdGF0ZT1kJiZkLnN0YXRlfHx7fTsKICAgICAgdmFyIHVzZXJzPWQmJmQubWVtYmVyc3x8W107CiAgICAgIHZhciBydD1yZWFsdGltZUFjdGl2ZTsKICAgICAgdmFyIHJvd3M9WwogICAgICAgIHtuYW1lOidTaXN0ZW1hIFVwU3RhdHVzJyxvazohIShkJiZkLm9rKSxkZXRhaWw6KGQmJmQudmVyc2lvbj8nRnVuY2lvbmFuZG8g4oCiICcrYXBpTXMrJyBtcyc6J0luZGlzcG9uw612ZWwnKX0sCiAgICAgICAge25hbWU6J0JhbmNvIGRlIGRhZG9zJyxvazohIWRiLm9rLGRldGFpbDpkYi5vaz8oJ1Jlc3BvbmRlbmRvIOKAoiAnK2RiLm1zKycgbXMnKTonU2VtIHJlc3Bvc3RhJ30sCiAgICAgICAge25hbWU6J0NoYXQgZGEgZXF1aXBlJyxvazohIWNoYXRDaGVjay5vayxkZXRhaWw6Y2hhdENoZWNrLm9rPygnUHJvbnRvIOKAoiAnK2NoYXRDaGVjay5tcysnIG1zJyk6J0NvbSBlcnJvJ30sCiAgICAgICAge25hbWU6J0FsZXJ0YXMgZSBjb21hbmRvcycsb2s6ISFzdGF0ZS5vayxkZXRhaWw6c3RhdGUub2s/J0Z1bmNpb25hbmRvJzonQ29tIGVycm8nfSwKICAgICAgICB7bmFtZTonQXR1YWxpemHDp8OjbyBlbSB0ZW1wbyByZWFsJyxvazpydCxraW5kOnJ0PycnOid3YXJuJyxkZXRhaWw6cnQ/J0F0aXZhJzonUmVjb25lY3RhbmRvJ30sCiAgICAgICAge25hbWU6J1N1YSB2ZXJzw6NvJyxvazp0cnVlLGRldGFpbDondicrQ1VSUkVOVF9WRVJTSU9OfQogICAgICBdOwogICAgICBsaXN0LmlubmVySFRNTD1yb3dzLm1hcChmdW5jdGlvbihyKXtyZXR1cm4gJzxkaXYgY2xhc3M9InVwLWhlYWx0aC1yb3ciPjxkaXYgY2xhc3M9InVwLWhlYWx0aC1sZWZ0Ij4nK2hlYWx0aExlZChyLm9rLHIua2luZCkrJzxzcGFuIGNsYXNzPSJ1cC1oZWFsdGgtbmFtZSI+JytyLm5hbWUrJzwvc3Bhbj48L2Rpdj48c3BhbiBjbGFzcz0idXAtaGVhbHRoLWRldGFpbCI+JytyLmRldGFpbCsnPC9zcGFuPjwvZGl2Pic7fSkuam9pbignJykrCiAgICAgICAgJzxkaXYgY2xhc3M9InVwLWhlYWx0aC1tZW1iZXJzIj48ZGl2IGNsYXNzPSJ1cC1oZWFsdGgtc3ViIj5FcXVpcGUgY29uZWN0YWRhPC9kaXY+Jyt1c2Vycy5tYXAoZnVuY3Rpb24obSl7dmFyIGNvbm5lY3RlZD1tLmNvbm5lY3RlZCE9PWZhbHNlO3ZhciB2ZXI9bS52ZXJzaW9uPyd2Jytlc2MobS52ZXJzaW9uKTondj8nO3JldHVybiAnPGRpdiBjbGFzcz0idXAtaGVhbHRoLW1lbWJlciI+PGI+Jytlc2MobS5uYW1lKSsnPC9iPjxzcGFuPicrdmVyKycg4oCiICcrKGNvbm5lY3RlZD8nY29uZWN0YWRvJzonZGVzY29uZWN0YWRvJykrJzwvc3Bhbj48L2Rpdj4nO30pLmpvaW4oJycpKyc8L2Rpdj4nOwogICAgfSkuY2F0Y2goZnVuY3Rpb24oZSl7CiAgICAgIGxpc3QuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJ1cC1oZWFsdGgtcm93Ij48ZGl2IGNsYXNzPSJ1cC1oZWFsdGgtbGVmdCI+JytoZWFsdGhMZWQoZmFsc2UpKyc8c3BhbiBjbGFzcz0idXAtaGVhbHRoLW5hbWUiPkRpYWduw7NzdGljbyBpbmRpc3BvbsOtdmVsPC9zcGFuPjwvZGl2PjxzcGFuIGNsYXNzPSJ1cC1oZWFsdGgtZGV0YWlsIj4nK2VzYyhlLm1lc3NhZ2V8fCdFcnJvJykrJzwvc3Bhbj48L2Rpdj4nOwogICAgfSk7CiAgfQoKICBmdW5jdGlvbiBsb2dpbigpewogICAgaGVhbHRoLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpOwogICAgaW1nLnNyYz1wcm9maWxlRmFsbGJhY2soKTsKICAgIGNhcmQuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJ1cC10aXRsZSI+VXBTdGF0dXM8L2Rpdj48ZGl2IGNsYXNzPSJ1cC15b3UiPkVudHJlIHBhcmEgY29udHJvbGFyIG8gc2V1IHN0YXR1cy48L2Rpdj48ZGl2IGNsYXNzPSJ1cC1sb2dpbiI+PGxhYmVsPlNlcnZpZG9yPC9sYWJlbD48aW5wdXQgY2xhc3M9InVwLWlucHV0IiBpZD0idXAtc2VydmVyIj48bGFiZWw+U2V1IG5vbWU8L2xhYmVsPjxzZWxlY3QgY2xhc3M9InVwLXNlbGVjdCIgaWQ9InVwLW5hbWUiPjwvc2VsZWN0PjxsYWJlbD5TZW5oYTwvbGFiZWw+PGlucHV0IGNsYXNzPSJ1cC1pbnB1dCIgaWQ9InVwLXBhc3N3b3JkIiB0eXBlPSJwYXNzd29yZCIgcGxhY2Vob2xkZXI9IlN1YSBzZW5oYSI+PGJ1dHRvbiBpZD0idXAtZW50ZXIiPkVudHJhcjwvYnV0dG9uPjwvZGl2PjxkaXYgY2xhc3M9InVwLXVwZGF0ZSB1cC1sb2dpbi11cGRhdGUiPlZlcnPDo28gdicrQ1VSUkVOVF9WRVJTSU9OKycgPGJ1dHRvbiB0eXBlPSJidXR0b24iIGNsYXNzPSJ1cC11cGRhdGUtY2hlY2siPlZlcmlmaWNhciBhdHVhbGl6YcOnw6NvPC9idXR0b24+PGJ1dHRvbiB0eXBlPSJidXR0b24iIGNsYXNzPSJ1cC11cGRhdGUtbm93Ij5BdHVhbGl6YXI8L2J1dHRvbj48c3BhbiBjbGFzcz0idXAtdXBkYXRlLXN0YXR1cyI+PC9zcGFuPjwvZGl2PjxkaXYgY2xhc3M9InVwLW1lc3NhZ2UiPjwvZGl2Pic7CiAgICBjYXJkLnF1ZXJ5U2VsZWN0b3IoJyN1cC1zZXJ2ZXInKS52YWx1ZT1zZXJ2ZXI7CiAgICB2YXIgbmFtZVNlbGVjdD1jYXJkLnF1ZXJ5U2VsZWN0b3IoJyN1cC1uYW1lJyk7CiAgICBuYW1lU2VsZWN0LmlubmVySFRNTD0nPG9wdGlvbj5SaWNhcmRvPC9vcHRpb24+PG9wdGlvbj5Mb2hhbjwvb3B0aW9uPjxvcHRpb24+R3VpbGhlcm1lPC9vcHRpb24+JzsKICAgIGlmKG1lbWJlciluYW1lU2VsZWN0LnZhbHVlPW1lbWJlcjsKICAgIGFwaSgnR0VUJywnL2FwaS9tZW1iZXJzJykudGhlbihmdW5jdGlvbihyKXsKICAgICAgdmFyIG5hbWVzPShyLm1lbWJlcnN8fFtdKS5tYXAoZnVuY3Rpb24oeCl7cmV0dXJuICc8b3B0aW9uPicrZXNjKHgubmFtZSkrJzwvb3B0aW9uPid9KS5qb2luKCcnKTsKICAgICAgaWYobmFtZXMpbmFtZVNlbGVjdC5pbm5lckhUTUw9bmFtZXM7CiAgICAgIGlmKG1lbWJlciluYW1lU2VsZWN0LnZhbHVlPW1lbWJlcjsKICAgIH0pLmNhdGNoKGZ1bmN0aW9uKCl7fSk7CiAgICBjYXJkLnF1ZXJ5U2VsZWN0b3IoJyN1cC1lbnRlcicpLm9uY2xpY2s9YXN5bmMgZnVuY3Rpb24oKXsKICAgICAgdHJ5ewogICAgICAgIHNlcnZlcj1jYXJkLnF1ZXJ5U2VsZWN0b3IoJyN1cC1zZXJ2ZXInKS52YWx1ZS50cmltKCkucmVwbGFjZSgvXC8kLywnJyk7CiAgICAgICAgdmFyIG5hbWU9Y2FyZC5xdWVyeVNlbGVjdG9yKCcjdXAtbmFtZScpLnZhbHVlOwogICAgICAgIHZhciBwYXNzd29yZD1jYXJkLnF1ZXJ5U2VsZWN0b3IoJyN1cC1wYXNzd29yZCcpLnZhbHVlOwogICAgICAgIHZhciBhY2NvdW50PWF3YWl0IGFwaSgnR0VUJywnL2FwaS9hY2NvdW50P25hbWU9JytlbmNvZGVVUklDb21wb25lbnQobmFtZSkpOwogICAgICAgIHZhciByPWF3YWl0IGFwaSgnUE9TVCcsYWNjb3VudC5uZWVkc1NldHVwPycvYXBpL3NldHVwJzonL2FwaS9sb2dpbicse25hbWU6bmFtZSxwYXNzd29yZDpwYXNzd29yZH0pOwogICAgICAgIHRva2VuPXIudG9rZW47bWVtYmVyPXIubmFtZTtyb2xlPXIucm9sZXx8J2ltcGxlbWVudGF0aW9uX3VzZXInOwogICAgICAgIEdNX3NldFZhbHVlKGtleSsnc2VydmVyJyxzZXJ2ZXIpO0dNX3NldFZhbHVlKGtleSsndG9rZW4nLHRva2VuKTtHTV9zZXRWYWx1ZShrZXkrJ21lbWJlcicsbWVtYmVyKTtHTV9zZXRWYWx1ZShrZXkrJ3JvbGUnLHJvbGUpOwogICAgICAgIGltZy5zcmM9cHJvZmlsZUZhbGxiYWNrKCk7YXBwKCk7cmVmcmVzaCgpO3N0YXJ0UmVhbHRpbWUoKTt1cGRhdGVCdWJibGVBdmF0YXIodHJ1ZSk7CiAgICAgIH1jYXRjaChlKXttZXNzYWdlKGUubWVzc2FnZSx0cnVlKX0KICAgIH07CiAgICBjYXJkLnF1ZXJ5U2VsZWN0b3IoJyN1cC1wYXNzd29yZCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLGZ1bmN0aW9uKGUpe2lmKGUua2V5PT09J0VudGVyJyl7ZS5wcmV2ZW50RGVmYXVsdCgpO2NhcmQucXVlcnlTZWxlY3RvcignI3VwLWVudGVyJykuY2xpY2soKTt9fSk7CiAgICBjYXJkLnF1ZXJ5U2VsZWN0b3IoJy51cC11cGRhdGUtY2hlY2snKS5vbmNsaWNrPWNoZWNrVXBkYXRlOwogICAgY2hlY2tVcGRhdGUoKTsKICB9CgogIHZhciB0aGVtZT1HTV9nZXRWYWx1ZShrZXkrJ3RoZW1lJywnZGFyaycpPT09J2xpZ2h0Jz8nbGlnaHQnOidkYXJrJzsKICBmdW5jdGlvbiBhcHBseVRoZW1lKCl7CiAgICByb290LmNsYXNzTGlzdC50b2dnbGUoJ3VwLXRoZW1lLWxpZ2h0Jyx0aGVtZT09PSdsaWdodCcpOwogICAgdmFyIGJ0bj1jYXJkLnF1ZXJ5U2VsZWN0b3IoJy51cC1zZXR0aW5ncy10aGVtZScpOwogICAgaWYoYnRuKXt2YXIgbmV4dFRoZW1lPXRoZW1lPT09J2RhcmsnPydjbGFybyc6J2VzY3Vybyc7YnRuLmlubmVySFRNTD1pY29uU3ZnKHRoZW1lPT09J2RhcmsnPydzdW4nOidtb29uJykrJzxzcGFuPk1vZG8gJytuZXh0VGhlbWUrJzwvc3Bhbj4nO2J0bi50aXRsZT0nTXVkYXIgcGFyYSBtb2RvICcrbmV4dFRoZW1lO2J0bi5zZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnLGJ0bi50aXRsZSk7fQogIH0KICBmdW5jdGlvbiB0b2dnbGVUaGVtZSgpewogICAgdGhlbWU9dGhlbWU9PT0nZGFyayc/J2xpZ2h0JzonZGFyayc7CiAgICBHTV9zZXRWYWx1ZShrZXkrJ3RoZW1lJyx0aGVtZSk7CiAgICBhcHBseVRoZW1lKCk7CiAgfQoKICBmdW5jdGlvbiBhcHAoKXsKICAgIGFwaSgnR0VUJywnL2FwaS9tZW1iZXJzJykudGhlbihmdW5jdGlvbihyKXt3aW5kb3cuX191cHN0YXR1c01lbWJlcnM9KHIubWVtYmVyc3x8W10pLm1hcChmdW5jdGlvbih4KXtyZXR1cm4geC5uYW1lfSk7fSkuY2F0Y2goZnVuY3Rpb24oKXt9KTsKICAgIGNhcmQuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJ1cC1oZWFkIj48ZGl2PjxkaXYgY2xhc3M9InVwLXRpdGxlIj5VcFN0YXR1czwvZGl2PjxkaXYgY2xhc3M9InVwLXlvdSI+Q29uZWN0YWRvIGNvbW8gJytlc2MobWVtYmVyKSsnPC9kaXY+PC9kaXY+PGRpdiBjbGFzcz0idXAtYWN0aW9ucyI+PGJ1dHRvbiBjbGFzcz0idXAtY2hhdC1idG4iIHRpdGxlPSJDaGF0IGRhIGVxdWlwZSIgYXJpYS1sYWJlbD0iQ2hhdCBkYSBlcXVpcGUiPicraWNvblN2ZygnY2hhdCcpKyc8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJ1cC1oaXN0b3J5LWJ0biBoaWRkZW4iIHRpdGxlPSJWZXIgaGlzdMOzcmljbyIgYXJpYS1sYWJlbD0iVmVyIGhpc3TDs3JpY28iPicraWNvblN2ZygnY2xvY2snKSsnPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0idXAtc2V0dGluZ3MtYnRuIiB0aXRsZT0iQ29uZmlndXJhw6fDtWVzIiBhcmlhLWxhYmVsPSJDb25maWd1cmHDp8O1ZXMiPicraWNvblN2ZygnZ2VhcicpKyc8L2J1dHRvbj48ZGl2IGNsYXNzPSJ1cC1zZXR0aW5ncy1tZW51IGhpZGRlbiI+PGJ1dHRvbiB0eXBlPSJidXR0b24iIGNsYXNzPSJ1cC1zZXR0aW5ncy1ub3RpZmljYXRpb25zIj48L2J1dHRvbj48YnV0dG9uIHR5cGU9ImJ1dHRvbiIgY2xhc3M9InVwLXNldHRpbmdzLXRoZW1lIj48L2J1dHRvbj4nKyhtZW1iZXI9PT0nUmljYXJkbyc/JzxidXR0b24gdHlwZT0iYnV0dG9uIiBjbGFzcz0idXAtc2V0dGluZ3MtaGVhbHRoIj4nK2ljb25TdmcoJ3B1bHNlJykrJzxzcGFuPlNhw7pkZSBkbyBzaXN0ZW1hPC9zcGFuPjwvYnV0dG9uPic6JycpKyc8L2Rpdj48YnV0dG9uIGNsYXNzPSJ1cC1sb2dvdXQiPlNhaXI8L2J1dHRvbj48L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPSJ1cC1zdGF0dXNlcyI+PGJ1dHRvbiBjbGFzcz0idXAtc3RhdHVzIG9ubGluZSI+JytpY29uU3ZnKCdvbmxpbmUnKSsnIE9ubGluZTwvYnV0dG9uPjxidXR0b24gY2xhc3M9InVwLXN0YXR1cyBidXN5Ij4nK2ljb25TdmcoJ2J1c3knKSsnIE9jdXBhZG88L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJ1cC1zdGF0dXMgYXdheSI+JytpY29uU3ZnKCdhd2F5JykrJyBBdXNlbnRlPC9idXR0b24+PC9kaXY+PGRpdiBjbGFzcz0idXAtcmVhc29ucyBoaWRkZW4iPjxsYWJlbCBjbGFzcz0idXAtbGFiZWwiPk1vdGl2byBkZSBvY3VwYWRvPC9sYWJlbD48ZGl2IGNsYXNzPSJ1cC1yZWFzb24tcGlja2VyIj48YnV0dG9uIHR5cGU9ImJ1dHRvbiIgY2xhc3M9InVwLXJlYXNvbi10cmlnZ2VyIj48c3BhbiBjbGFzcz0idXAtcmVhc29uLXRyaWdnZXItaWNvbiI+JytpY29uU3ZnKCdlZGl0JykrJzwvc3Bhbj48c3BhbiBjbGFzcz0idXAtcmVhc29uLXRyaWdnZXItdGV4dCI+U2VsZWNpb25lIHVtIG1vdGl2bzwvc3Bhbj48L2J1dHRvbj48ZGl2IGNsYXNzPSJ1cC1yZWFzb24tbWVudSBoaWRkZW4iPicrcmVhc29ucy5tYXAoZnVuY3Rpb24oeCl7cmV0dXJuICc8YnV0dG9uIHR5cGU9ImJ1dHRvbiIgY2xhc3M9InVwLXJlYXNvbi1vcHRpb24iIGRhdGEtdmFsdWU9IicrZXNjKHgudmFsdWUpKyciPicraWNvblN2Zyh4Lmljb24pKyc8c3BhbiBjbGFzcz0idXAtcmVhc29uLXRleHQiPicrZXNjKHgubGFiZWwpKyc8L3NwYW4+PC9idXR0b24+J30pLmpvaW4oJycpKyc8L2Rpdj48L2Rpdj48c2VsZWN0IGNsYXNzPSJ1cC1zZWxlY3QgaGlkZGVuIj48L3NlbGVjdD48aW5wdXQgY2xhc3M9InVwLWlucHV0IGhpZGRlbiIgcGxhY2Vob2xkZXI9IkVzY3JldmEgbyBtb3Rpdm8iPjxidXR0b24gY2xhc3M9InVwLWNvbmZpcm0gaGlkZGVuIj5Db25maXJtYXIgb2N1cGFkbzwvYnV0dG9uPjwvZGl2PjxkaXYgY2xhc3M9InVwLW1lc3NhZ2UiPjwvZGl2PjxkaXYgY2xhc3M9InVwLW5vdGljZSI+U2luY3Jvbml6YcOnw6NvIGNvbSBvIFNhbGUgU21hcnRseSBhdGl2YS48L2Rpdj48ZGl2IGNsYXNzPSJ1cC10ZWFtLXRpdGxlIj5FcXVpcGU8L2Rpdj48ZGl2IGNsYXNzPSJ1cC10ZWFtIj5DYXJyZWdhbmRv4oCmPC9kaXY+JzsKICAgIGhpc3RvcnkuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJ1cC1oaXN0b3J5LWhlYWQiPjxkaXYgY2xhc3M9InVwLWhpc3RvcnktdGl0bGUiPkhpc3TDs3JpY288L2Rpdj48ZGl2IGNsYXNzPSJ1cC1hY3Rpb25zIj48YnV0dG9uIGNsYXNzPSJ1cC1leHBvcnQiIHRpdGxlPSJFeHBvcnRhciBoaXN0w7NyaWNvIj4nK2ljb25TdmcoJ2Rvd25sb2FkJykrJyBUWFQ8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJ1cC1jbG9zZSI+RmVjaGFyPC9idXR0b24+PC9kaXY+PC9kaXY+PGRpdiBjbGFzcz0idXAtaGlzdG9yeS1saXN0Ij5DYXJyZWdhbmRv4oCmPC9kaXY+JzsKCiAgICB2YXIgYm94PWNhcmQucXVlcnlTZWxlY3RvcignLnVwLXJlYXNvbnMnKSxzZWxlY3Q9Ym94LnF1ZXJ5U2VsZWN0b3IoJ3NlbGVjdCcpLGN1c3RvbT1ib3gucXVlcnlTZWxlY3RvcignaW5wdXQnKSxjb25maXJtPWJveC5xdWVyeVNlbGVjdG9yKCdidXR0b24udXAtY29uZmlybScpLHRyaWdnZXI9Ym94LnF1ZXJ5U2VsZWN0b3IoJy51cC1yZWFzb24tdHJpZ2dlcicpLG1lbnU9Ym94LnF1ZXJ5U2VsZWN0b3IoJy51cC1yZWFzb24tbWVudScpOwogICAgdmFyIGhpc3RvcnlCdG49Y2FyZC5xdWVyeVNlbGVjdG9yKCcudXAtaGlzdG9yeS1idG4nKTsKICAgIHZhciBzZXR0aW5nc0J0bj1jYXJkLnF1ZXJ5U2VsZWN0b3IoJy51cC1zZXR0aW5ncy1idG4nKSxzZXR0aW5nc01lbnU9Y2FyZC5xdWVyeVNlbGVjdG9yKCcudXAtc2V0dGluZ3MtbWVudScpOwogICAgaWYocm9sZT09PSdpbXBsZW1lbnRhdGlvbl9hZG1pbicpewogICAgICBoaXN0b3J5QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpOwogICAgICBoaXN0b3J5QnRuLm9uY2xpY2s9ZnVuY3Rpb24oZSl7ZS5zdG9wUHJvcGFnYXRpb24oKTtvcGVuSGlzdG9yeSgpfTsKICAgIH0KCiAgICBjYXJkLnF1ZXJ5U2VsZWN0b3IoJy5vbmxpbmUnKS5vbmNsaWNrPWZ1bmN0aW9uKCl7c2F2ZSgnb25saW5lJywnJyl9OwogICAgY2FyZC5xdWVyeVNlbGVjdG9yKCcuYXdheScpLm9uY2xpY2s9ZnVuY3Rpb24oKXtzYXZlKCdhd2F5JywnQXVzZW50ZScpfTsKICAgIGNhcmQucXVlcnlTZWxlY3RvcignLmJ1c3knKS5vbmNsaWNrPWZ1bmN0aW9uKCl7Ym94LmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO21lbnUuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7bWVzc2FnZSgnRXNjb2xoYSBvIG1vdGl2byBkZSBvY3VwYWRvLicsdHJ1ZSl9OwogICAgdHJpZ2dlci5vbmNsaWNrPWZ1bmN0aW9uKCl7bWVudS5jbGFzc0xpc3QudG9nZ2xlKCdoaWRkZW4nKX07CiAgICBib3gucXVlcnlTZWxlY3RvckFsbCgnLnVwLXJlYXNvbi1vcHRpb24nKS5mb3JFYWNoKGZ1bmN0aW9uKG9wdCl7b3B0Lm9uY2xpY2s9ZnVuY3Rpb24oKXt2YXIgdmFsdWU9b3B0LmdldEF0dHJpYnV0ZSgnZGF0YS12YWx1ZScpO3ZhciByPXJlYXNvbnMuZmluZChmdW5jdGlvbih4KXtyZXR1cm4geC52YWx1ZT09PXZhbHVlfSk7dHJpZ2dlci5pbm5lckhUTUw9aWNvblN2ZyhyP3IuaWNvbjonZWRpdCcpKyc8c3BhbiBjbGFzcz0idXAtcmVhc29uLXRyaWdnZXItdGV4dCI+Jytlc2Mocj9yLmxhYmVsOnZhbHVlKSsnPC9zcGFuPic7bWVudS5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtjdXN0b20uY2xhc3NMaXN0LnRvZ2dsZSgnaGlkZGVuJyx2YWx1ZSE9PSdPdXRybycpO2NvbmZpcm0uY2xhc3NMaXN0LnRvZ2dsZSgnaGlkZGVuJyx2YWx1ZSE9PSdPdXRybycpO2lmKHZhbHVlJiZ2YWx1ZSE9PSdPdXRybycpc2F2ZSgnYnVzeScsdmFsdWUpO2Vsc2UgaWYodmFsdWU9PT0nT3V0cm8nKWN1c3RvbS5mb2N1cygpO319KTsKICAgIGNvbmZpcm0ub25jbGljaz1mdW5jdGlvbigpe3NhdmUoJ2J1c3knLGN1c3RvbS52YWx1ZSl9OwogICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKGUpe2lmKGJveCYmIWJveC5jb250YWlucyhlLnRhcmdldCkpbWVudS5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKX0pOwogICAgY2FyZC5xdWVyeVNlbGVjdG9yKCcudXAtbG9nb3V0Jykub25jbGljaz1mdW5jdGlvbigpe2Jyb2FkY2FzdENoYXRQcmVzZW5jZShmYWxzZSk7c3RvcFJlYWx0aW1lKCk7dG9rZW49Jyc7bWVtYmVyPScnO3JvbGU9J2ltcGxlbWVudGF0aW9uX3VzZXInO0dNX3NldFZhbHVlKGtleSsndG9rZW4nLCcnKTtHTV9zZXRWYWx1ZShrZXkrJ21lbWJlcicsJycpO0dNX3NldFZhbHVlKGtleSsncm9sZScsJycpO2hpc3RvcnkuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7aGVhbHRoLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO2ltZy5zcmM9cHJvZmlsZUZhbGxiYWNrKCk7bG9naW4oKX07CiAgICBoaXN0b3J5LnF1ZXJ5U2VsZWN0b3IoJy51cC1jbG9zZScpLm9uY2xpY2s9ZnVuY3Rpb24oKXtoaXN0b3J5LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpfTsKICAgIGhpc3RvcnkucXVlcnlTZWxlY3RvcignLnVwLWV4cG9ydCcpLm9uY2xpY2s9ZnVuY3Rpb24oKXtleHBvcnRIaXN0b3J5VHh0KCl9OwogICAgaWYoc2V0dGluZ3NCdG4pc2V0dGluZ3NCdG4ub25jbGljaz1mdW5jdGlvbihlKXtlLnN0b3BQcm9wYWdhdGlvbigpO3NldHRpbmdzTWVudS5jbGFzc0xpc3QudG9nZ2xlKCdoaWRkZW4nKTt9OwogICAgaWYoc2V0dGluZ3NNZW51KXtzZXR0aW5nc01lbnUub25jbGljaz1mdW5jdGlvbihlKXtlLnN0b3BQcm9wYWdhdGlvbigpO307dmFyIHNldHRpbmdzSGVhbHRoPXNldHRpbmdzTWVudS5xdWVyeVNlbGVjdG9yKCcudXAtc2V0dGluZ3MtaGVhbHRoJyk7aWYoc2V0dGluZ3NIZWFsdGgpc2V0dGluZ3NIZWFsdGgub25jbGljaz1mdW5jdGlvbigpe3NldHRpbmdzTWVudS5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtvcGVuSGVhbHRoKCk7fTtzZXR0aW5nc01lbnUucXVlcnlTZWxlY3RvcignLnVwLXNldHRpbmdzLW5vdGlmaWNhdGlvbnMnKS5vbmNsaWNrPWZ1bmN0aW9uKCl7dG9nZ2xlTm90aWZpY2F0aW9ucygpO307c2V0dGluZ3NNZW51LnF1ZXJ5U2VsZWN0b3IoJy51cC1zZXR0aW5ncy10aGVtZScpLm9uY2xpY2s9ZnVuY3Rpb24oKXt0b2dnbGVUaGVtZSgpO307ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKGUpe2lmKCFzZXR0aW5nc01lbnUuY29udGFpbnMoZS50YXJnZXQpJiZlLnRhcmdldCE9PXNldHRpbmdzQnRuKXNldHRpbmdzTWVudS5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTt9KTt9CiAgICBjYXJkLnF1ZXJ5U2VsZWN0b3IoJy51cC1jaGF0LWJ0bicpLm9uY2xpY2s9ZnVuY3Rpb24oZSl7ZS5zdG9wUHJvcGFnYXRpb24oKTtvcGVuQ2hhdCgpfTsKICAgIHF1aWNrQ2hhdEJ1YmJsZS5vbmNsaWNrPWZ1bmN0aW9uKGUpe2Uuc3RvcFByb3BhZ2F0aW9uKCk7b3BlbkNoYXQoKX07CiAgICB1cGRhdGVOb3RpZmljYXRpb25QZXJtaXNzaW9uVUkoKTsKICAgIGFwcGx5VGhlbWUoKTsKICAgIHVwZGF0ZU91dGdvaW5nQmFydWlVSSgpOwogICAgY2FyZC5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsJzxkaXYgY2xhc3M9InVwLXVwZGF0ZSI+VmVyc8OjbyB2JytDVVJSRU5UX1ZFUlNJT04rJyA8YnV0dG9uIHR5cGU9ImJ1dHRvbiIgY2xhc3M9InVwLXVwZGF0ZS1jaGVjayI+VmVyaWZpY2FyIGF0dWFsaXphw6fDo288L2J1dHRvbj48YnV0dG9uIHR5cGU9ImJ1dHRvbiIgY2xhc3M9InVwLXVwZGF0ZS1ub3ciPkF0dWFsaXphcjwvYnV0dG9uPjxzcGFuIGNsYXNzPSJ1cC11cGRhdGUtc3RhdHVzIj48L3NwYW4+PC9kaXY+Jyk7CiAgICBjYXJkLnF1ZXJ5U2VsZWN0b3IoJy51cC11cGRhdGUtY2hlY2snKS5vbmNsaWNrPWNoZWNrVXBkYXRlOwogICAgY2hlY2tVcGRhdGUoKTsKICB9CgoKICB2YXIgcmVtb3RlUGVuZGluZz17fTsKICBmdW5jdGlvbiBjbG9zZVJlbW90ZUNvbnRyb2woKXtyZW1vdGVPdmVybGF5LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO3JlbW90ZU92ZXJsYXkub25jbGljaz1udWxsO3JlbW90ZU92ZXJsYXkuaW5uZXJIVE1MPScnO30KICBmdW5jdGlvbiBvcGVuUmVtb3RlQ29udHJvbCh0YXJnZXQpewogICAgaWYocm9sZSE9PSdpbXBsZW1lbnRhdGlvbl9hZG1pbid8fCF0YXJnZXR8fHRhcmdldD09PW1lbWJlcilyZXR1cm47CiAgICB2YXIgZFN0YXR1cz1jYXJkLnF1ZXJ5U2VsZWN0b3IoJy51cC1tZW1iZXItcG93ZXJbZGF0YS10YXJnZXQ9IicrQ1NTLmVzY2FwZSh0YXJnZXQpKyciXScpOwogICAgaWYoZFN0YXR1cylkU3RhdHVzLmRpc2FibGVkPXRydWU7CiAgICB2YXIgY3VycmVudD0od2luZG93Ll9fdXBzdGF0dXNUZWFtfHx7fSlbdGFyZ2V0XXx8e307CiAgICB2YXIgc2VsZWN0ZWQ9Y3VycmVudC5zdGF0dXM9PT0nYnVzeSc/J2J1c3knOmN1cnJlbnQuc3RhdHVzPT09J2F3YXknPydhd2F5Jzonb25saW5lJzsKICAgIHZhciBzZWxlY3RlZFJlYXNvbj1jdXJyZW50LnJlYXNvbnx8Jyc7CiAgICByZW1vdGVPdmVybGF5LmlubmVySFRNTD0nPGRpdiBjbGFzcz0idXAtcmVtb3RlLWRpYWxvZyI+PGRpdiBjbGFzcz0idXAtcmVtb3RlLXRpdGxlIj5Db250cm9sYXIgZmlsYSBkZSAnK2VzYyh0YXJnZXQpKyc8L2Rpdj48ZGl2IGNsYXNzPSJ1cC1yZW1vdGUtc3ViIj5BIGFsdGVyYcOnw6NvIHNlcsOhIGV4ZWN1dGFkYSBwZWxhIHNlc3PDo28gZG8gcHLDs3ByaW8gdXN1w6FyaW8uPC9kaXY+PGRpdiBjbGFzcz0idXAtcmVtb3RlLXN0YXR1c2VzIj48YnV0dG9uIHR5cGU9ImJ1dHRvbiIgY2xhc3M9InVwLXJlbW90ZS1zdGF0dXMgJysoc2VsZWN0ZWQ9PT0nb25saW5lJz8nYWN0aXZlJzonJykrJyIgZGF0YS1zdGF0dXM9Im9ubGluZSI+T25saW5lPC9idXR0b24+PGJ1dHRvbiB0eXBlPSJidXR0b24iIGNsYXNzPSJ1cC1yZW1vdGUtc3RhdHVzICcrKHNlbGVjdGVkPT09J2J1c3knPydhY3RpdmUnOicnKSsnIiBkYXRhLXN0YXR1cz0iYnVzeSI+T2N1cGFkbzwvYnV0dG9uPjxidXR0b24gdHlwZT0iYnV0dG9uIiBjbGFzcz0idXAtcmVtb3RlLXN0YXR1cyAnKyhzZWxlY3RlZD09PSdhd2F5Jz8nYWN0aXZlJzonJykrJyIgZGF0YS1zdGF0dXM9ImF3YXkiPkF1c2VudGU8L2J1dHRvbj48L2Rpdj48ZGl2IGNsYXNzPSJ1cC1yZW1vdGUtcmVhc29uICcrKHNlbGVjdGVkPT09J2J1c3knPycnOidoaWRkZW4nKSsnIj48ZGl2IGNsYXNzPSJ1cC1sYWJlbCI+TW90aXZvIGRlIG9jdXBhZG88L2Rpdj48ZGl2IGNsYXNzPSJ1cC1yZW1vdGUtcmVhc29uLW1lbnUiPicrcmVhc29ucy5tYXAoZnVuY3Rpb24ocil7cmV0dXJuICc8YnV0dG9uIHR5cGU9ImJ1dHRvbiIgY2xhc3M9InVwLXJlbW90ZS1yZWFzb24tb3B0aW9uICcrKHNlbGVjdGVkUmVhc29uPT09ci52YWx1ZT8nYWN0aXZlJzonJykrJyIgZGF0YS1yZWFzb249IicrZXNjKHIudmFsdWUpKyciPicraWNvblN2ZyhyLmljb24pKyc8c3BhbiBjbGFzcz0idXAtcmVhc29uLXRleHQiPicrZXNjKHIubGFiZWwpKyc8L3NwYW4+PC9idXR0b24+Jzt9KS5qb2luKCcnKSsnPC9kaXY+PC9kaXY+PGRpdiBjbGFzcz0idXAtcmVtb3RlLW1lc3NhZ2UiPjwvZGl2PjxkaXYgY2xhc3M9InVwLXJlbW90ZS1hY3Rpb25zIj48YnV0dG9uIHR5cGU9ImJ1dHRvbiIgY2xhc3M9InVwLXJlbW90ZS1jYW5jZWwiPkNhbmNlbGFyPC9idXR0b24+PGJ1dHRvbiB0eXBlPSJidXR0b24iIGNsYXNzPSJ1cC1yZW1vdGUtY29uZmlybSI+QXBsaWNhcjwvYnV0dG9uPjwvZGl2PjwvZGl2Pic7CiAgICByZW1vdGVPdmVybGF5LmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpOwogICAgcmVtb3RlT3ZlcmxheS5vbmNsaWNrPWZ1bmN0aW9uKGUpe2lmKGUudGFyZ2V0PT09cmVtb3RlT3ZlcmxheSljbG9zZVJlbW90ZUNvbnRyb2woKTt9OwogICAgdmFyIGRpYWxvZz1yZW1vdGVPdmVybGF5LnF1ZXJ5U2VsZWN0b3IoJy51cC1yZW1vdGUtZGlhbG9nJyksIHJlYXNvbkJveD1yZW1vdGVPdmVybGF5LnF1ZXJ5U2VsZWN0b3IoJy51cC1yZW1vdGUtcmVhc29uJyksIG1zZz1yZW1vdGVPdmVybGF5LnF1ZXJ5U2VsZWN0b3IoJy51cC1yZW1vdGUtbWVzc2FnZScpOwogICAgZGlhbG9nLnF1ZXJ5U2VsZWN0b3JBbGwoJy51cC1yZW1vdGUtc3RhdHVzJykuZm9yRWFjaChmdW5jdGlvbihidG4pe2J0bi5vbmNsaWNrPWZ1bmN0aW9uKCl7c2VsZWN0ZWQ9YnRuLmdldEF0dHJpYnV0ZSgnZGF0YS1zdGF0dXMnKTtkaWFsb2cucXVlcnlTZWxlY3RvckFsbCgnLnVwLXJlbW90ZS1zdGF0dXMnKS5mb3JFYWNoKGZ1bmN0aW9uKHgpe3guY2xhc3NMaXN0LnRvZ2dsZSgnYWN0aXZlJyx4PT09YnRuKX0pO3JlYXNvbkJveC5jbGFzc0xpc3QudG9nZ2xlKCdoaWRkZW4nLHNlbGVjdGVkIT09J2J1c3knKTtpZihzZWxlY3RlZCE9PSdidXN5JylzZWxlY3RlZFJlYXNvbj0nJzt9O30pOwogICAgZGlhbG9nLnF1ZXJ5U2VsZWN0b3JBbGwoJy51cC1yZW1vdGUtcmVhc29uLW9wdGlvbicpLmZvckVhY2goZnVuY3Rpb24oYnRuKXtidG4ub25jbGljaz1mdW5jdGlvbigpe3NlbGVjdGVkUmVhc29uPWJ0bi5nZXRBdHRyaWJ1dGUoJ2RhdGEtcmVhc29uJyl8fCcnO2RpYWxvZy5xdWVyeVNlbGVjdG9yQWxsKCcudXAtcmVtb3RlLXJlYXNvbi1vcHRpb24nKS5mb3JFYWNoKGZ1bmN0aW9uKHgpe3guY2xhc3NMaXN0LnRvZ2dsZSgnYWN0aXZlJyx4PT09YnRuKX0pO307fSk7CiAgICBkaWFsb2cucXVlcnlTZWxlY3RvcignLnVwLXJlbW90ZS1jYW5jZWwnKS5vbmNsaWNrPWNsb3NlUmVtb3RlQ29udHJvbDsKICAgIGRpYWxvZy5xdWVyeVNlbGVjdG9yKCcudXAtcmVtb3RlLWNvbmZpcm0nKS5vbmNsaWNrPWZ1bmN0aW9uKCl7CiAgICAgIGlmKHNlbGVjdGVkPT09J2J1c3knJiYhc2VsZWN0ZWRSZWFzb24pe21zZy50ZXh0Q29udGVudD0nRXNjb2xoYSBvIG1vdGl2byBkZSBvY3VwYWRvLic7cmV0dXJuO30KICAgICAgdmFyIGNvbmZpcm09ZGlhbG9nLnF1ZXJ5U2VsZWN0b3IoJy51cC1yZW1vdGUtY29uZmlybScpO2NvbmZpcm0uZGlzYWJsZWQ9dHJ1ZTttc2cudGV4dENvbnRlbnQ9J0VudmlhbmRvIGNvbWFuZG/igKYnOwogICAgICBhcGkoJ1BPU1QnLCcvYXBpL3JlbW90ZS1zdGF0dXMnLHt0YXJnZXQ6dGFyZ2V0LHN0YXR1czpzZWxlY3RlZCxyZWFzb246c2VsZWN0ZWQ9PT0nYnVzeSc/c2VsZWN0ZWRSZWFzb246c2VsZWN0ZWQ9PT0nYXdheSc/J0F1c2VudGUnOicnfSkudGhlbihmdW5jdGlvbihyKXsKICAgICAgICBpZighci5jb21tYW5kSWQpdGhyb3cgbmV3IEVycm9yKCdPIHNlcnZpZG9yIG7Do28gY29uZmlybW91IG8gY29tYW5kby4nKTsKICAgICAgICBtc2cudGV4dENvbnRlbnQ9J0FndWFyZGFuZG8gJyt0YXJnZXQrJyBleGVjdXRhcuKApic7CiAgICAgICAgd2FpdFJlbW90ZVJlc3VsdChyLmNvbW1hbmRJZCx0YXJnZXQsbXNnLGNvbmZpcm0pOwogICAgICB9KS5jYXRjaChmdW5jdGlvbihlKXttc2cudGV4dENvbnRlbnQ9ZS5tZXNzYWdlfHwnTsOjbyBmb2kgcG9zc8OtdmVsIGVudmlhciBvIGNvbWFuZG8uJztjb25maXJtLmRpc2FibGVkPWZhbHNlO30pOwogICAgfTsKICAgIGlmKGRTdGF0dXMpZFN0YXR1cy5kaXNhYmxlZD1mYWxzZTsKICB9CiAgZnVuY3Rpb24gYXBwbHlSZW1vdGVSZXN1bHQoY29tbWFuZElkLHRhcmdldCxtc2csY29uZmlybSxyZXN1bHQpewogICAgaWYocmVzdWx0JiZyZXN1bHQub2spewogICAgICBtc2cuc3R5bGUuY29sb3I9JyM5Y2U1YjgnO21zZy50ZXh0Q29udGVudD0nRmlsYSBkZSAnK3RhcmdldCsnIGF0dWFsaXphZGEgY29tIHN1Y2Vzc28uJzsKICAgICAgZGVsZXRlIHJlbW90ZVJlc3VsdENhY2hlW2NvbW1hbmRJZF07CiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtjbG9zZVJlbW90ZUNvbnRyb2woKTtyZWZyZXNoKCk7fSw3MDApOwogICAgfWVsc2V7CiAgICAgIG1zZy5zdHlsZS5jb2xvcj0nI2ZmOWFhYSc7bXNnLnRleHRDb250ZW50PSdGYWxoYTogJysoKHJlc3VsdCYmcmVzdWx0LmVycm9yKXx8J27Do28gZm9pIHBvc3PDrXZlbCBhbHRlcmFyIGEgZmlsYS4nKTsKICAgICAgaWYoY29uZmlybSljb25maXJtLmRpc2FibGVkPWZhbHNlOwogICAgICBkZWxldGUgcmVtb3RlUmVzdWx0Q2FjaGVbY29tbWFuZElkXTsKICAgIH0KICB9CiAgZnVuY3Rpb24gd2FpdFJlbW90ZVJlc3VsdChjb21tYW5kSWQsdGFyZ2V0LG1zZyxjb25maXJtLHN0YXJ0ZWQpewogICAgdmFyIHQ9c3RhcnRlZHx8RGF0ZS5ub3coKSxpZD1TdHJpbmcoY29tbWFuZElkKTsKICAgIHZhciBjYWNoZWQ9cmVtb3RlUmVzdWx0Q2FjaGVbaWRdOwogICAgaWYoY2FjaGVkKXthcHBseVJlbW90ZVJlc3VsdChpZCx0YXJnZXQsbXNnLGNvbmZpcm0sY2FjaGVkKTtyZXR1cm47fQogICAgdmFyIHNldHRsZWQ9ZmFsc2U7CiAgICBmdW5jdGlvbiBmaW5pc2gocmVzdWx0KXsKICAgICAgaWYoc2V0dGxlZClyZXR1cm47CiAgICAgIHNldHRsZWQ9dHJ1ZTsKICAgICAgaWYocmVtb3RlUmVzdWx0V2FpdGVyc1tpZF09PT1maW5pc2gpZGVsZXRlIHJlbW90ZVJlc3VsdFdhaXRlcnNbaWRdOwogICAgICBhcHBseVJlbW90ZVJlc3VsdChpZCx0YXJnZXQsbXNnLGNvbmZpcm0scmVzdWx0KTsKICAgIH0KICAgIHJlbW90ZVJlc3VsdFdhaXRlcnNbaWRdPWZpbmlzaDsKICAgIGZ1bmN0aW9uIHBvbGwoKXsKICAgICAgaWYoc2V0dGxlZClyZXR1cm47CiAgICAgIGFwaSgnR0VUJywnL2FwaS9yZW1vdGUtc3RhdHVzL3Jlc3VsdD9pZD0nK2VuY29kZVVSSUNvbXBvbmVudChpZCkpLnRoZW4oZnVuY3Rpb24oZCl7CiAgICAgICAgaWYoZCYmZC5yZWFkeSYmZC5yZXN1bHQpe2ZpbmlzaChkLnJlc3VsdCk7cmV0dXJuO30KICAgICAgICBpZihEYXRlLm5vdygpLXQ+PTI1MDAwKXsKICAgICAgICAgIGlmKHJlbW90ZVJlc3VsdFdhaXRlcnNbaWRdPT09ZmluaXNoKWRlbGV0ZSByZW1vdGVSZXN1bHRXYWl0ZXJzW2lkXTsKICAgICAgICAgIHNldHRsZWQ9dHJ1ZTsKICAgICAgICAgIG1zZy5zdHlsZS5jb2xvcj0nI2ZmOWFhYSc7bXNnLnRleHRDb250ZW50PSdUZW1wbyBlc2dvdGFkby4gJyt0YXJnZXQrJyBuw6NvIGNvbmZpcm1vdSBhIGFsdGVyYcOnw6NvLic7aWYoY29uZmlybSljb25maXJtLmRpc2FibGVkPWZhbHNlOwogICAgICAgICAgcmV0dXJuOwogICAgICAgIH0KICAgICAgICBzZXRUaW1lb3V0KHBvbGwsNzAwKTsKICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oKXsKICAgICAgICBpZihEYXRlLm5vdygpLXQ+PTI1MDAwKXsKICAgICAgICAgIGlmKHJlbW90ZVJlc3VsdFdhaXRlcnNbaWRdPT09ZmluaXNoKWRlbGV0ZSByZW1vdGVSZXN1bHRXYWl0ZXJzW2lkXTsKICAgICAgICAgIHNldHRsZWQ9dHJ1ZTsKICAgICAgICAgIG1zZy5zdHlsZS5jb2xvcj0nI2ZmOWFhYSc7bXNnLnRleHRDb250ZW50PSdUZW1wbyBlc2dvdGFkby4gTsOjbyBmb2kgcG9zc8OtdmVsIGNvbmZpcm1hciBhIGFsdGVyYcOnw6NvLic7aWYoY29uZmlybSljb25maXJtLmRpc2FibGVkPWZhbHNlOwogICAgICAgICAgcmV0dXJuOwogICAgICAgIH0KICAgICAgICBzZXRUaW1lb3V0KHBvbGwsNzAwKTsKICAgICAgfSk7CiAgICB9CiAgICBwb2xsKCk7CiAgfQogIGZ1bmN0aW9uIGV4ZWN1dGVSZW1vdGVDb21tYW5kKGMpewogICAgaWYoIWN8fCFjLmlkfHxjLnRhcmdldCE9PW1lbWJlcnx8cmVtb3RlUGVuZGluZ1tjLmlkXSlyZXR1cm47CiAgICByZW1vdGVQZW5kaW5nW2MuaWRdPXRydWU7CiAgICAoYXN5bmMgZnVuY3Rpb24oKXsKICAgICAgdmFyIG9rPWZhbHNlLGVycm9yPScnOwogICAgICB0cnl7CiAgICAgICAgYXdhaXQgc3luY1NhbGVTbWFydGx5KGMuc3RhdHVzKTsKICAgICAgICBhd2FpdCBhcGkoJ1BPU1QnLCcvYXBpL3N0YXR1cycse3N0YXR1czpjLnN0YXR1cyxyZWFzb246Yy5yZWFzb258fCcnLGFjdG9yOmMuc2VuZGVyfHwnJyx0YXJnZXQ6bWVtYmVyfSk7CiAgICAgICAgb2s9dHJ1ZTsKICAgICAgICBpZihsb2NhdGlvbi5ob3N0bmFtZT09PSdhcHAuc2FsZXNtYXJ0bHkuY29tJylzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7bG9jYXRpb24ucmVsb2FkKCl9LDI1MCk7CiAgICAgIH1jYXRjaChlKXtlcnJvcj1lLm1lc3NhZ2V8fCdGYWxoYSBhbyBzaW5jcm9uaXphciBvIFNhbGUgU21hcnRseS4nO30KICAgICAgdHJ5e2F3YWl0IGFwaSgnUE9TVCcsJy9hcGkvcmVtb3RlLXN0YXR1cy9yZXN1bHQnLHtjb21tYW5kSWQ6Yy5pZCxvazpvayxlcnJvcjplcnJvcn0pO31jYXRjaChfKXsgfQogICAgICBkZWxldGUgcmVtb3RlUGVuZGluZ1tjLmlkXTsKICAgICAgaWYoIW9rKW1lc3NhZ2UoJ0NvbWFuZG8gcmVtb3RvIGRlICcrYy5zZW5kZXIrJyBmYWxob3U6ICcrZXJyb3IsdHJ1ZSk7ZWxzZSByZWZyZXNoKCk7CiAgICB9KSgpOwogIH0KCiAgZnVuY3Rpb24gcG9sbFJlbW90ZVN0YXR1cygpewogICAgaWYoIXRva2VufHxyZW1vdGVQb2xsaW5nKXJldHVybjsKICAgIHJlbW90ZVBvbGxpbmc9dHJ1ZTsKICAgIGFwaSgnR0VUJywnL2FwaS9yZW1vdGUtc3RhdHVzJykudGhlbihmdW5jdGlvbihkKXsKICAgICAgaWYoIWQucGVuZGluZ3x8IWQuY29tbWFuZClyZXR1cm47CiAgICAgIGV4ZWN1dGVSZW1vdGVDb21tYW5kKGQuY29tbWFuZCk7CiAgICB9KS5jYXRjaChmdW5jdGlvbigpe30pLmZpbmFsbHkoZnVuY3Rpb24oKXtyZW1vdGVQb2xsaW5nPWZhbHNlfSk7CiAgfQogIGZ1bmN0aW9uIHJlZnJlc2goKXsKICAgIGlmKCF0b2tlbnx8IW1lbWJlcnx8cmVmcmVzaGluZylyZXR1cm47CiAgICByZWZyZXNoaW5nPXRydWU7CiAgICBhcGkoJ0dFVCcsJy9hcGkvc3RhdHVzJykudGhlbihmdW5jdGlvbihkKXsKICAgICAgdmFyIHRlYW09Y2FyZC5xdWVyeVNlbGVjdG9yKCcudXAtdGVhbScpO2lmKCF0ZWFtKXJldHVybjsKICAgICAgd2luZG93Ll9fdXBzdGF0dXNUZWFtPWQubWVtYmVyc3x8e307CiAgICAgIHRlYW0uaW5uZXJIVE1MPU9iamVjdC5rZXlzKGQubWVtYmVycykubWFwKGZ1bmN0aW9uKGspewogICAgICAgIHZhciBtPWQubWVtYmVyc1trXTsKICAgICAgICBpZihtLm5hbWU9PT1tZW1iZXIpY3VycmVudFN0YXR1cz1tLnN0YXR1czsKICAgICAgICB2YXIgY29udHJvbHM9KHJvbGU9PT0naW1wbGVtZW50YXRpb25fYWRtaW4nJiZtLm5hbWUhPT1tZW1iZXIpCiAgICAgICAgICA/ICc8YnV0dG9uIHR5cGU9ImJ1dHRvbiIgY2xhc3M9InVwLW1lbWJlci1iYXJ1aSIgZGF0YS10YXJnZXQ9IicrZXNjKG0ubmFtZSkrJyIgdGl0bGU9IkVudmlhciBCQVJVSSBwYXJhICcrZXNjKG0ubmFtZSkrJyIgYXJpYS1sYWJlbD0iRW52aWFyIEJBUlVJIHBhcmEgJytlc2MobS5uYW1lKSsnIj4nK2ljb25TdmcoJ3NvdW5kJykrJzwvYnV0dG9uPjxidXR0b24gdHlwZT0iYnV0dG9uIiBjbGFzcz0idXAtbWVtYmVyLXBvd2VyIiBkYXRhLXRhcmdldD0iJytlc2MobS5uYW1lKSsnIiB0aXRsZT0iQ29udHJvbGFyIGZpbGEgZGUgJytlc2MobS5uYW1lKSsnIiBhcmlhLWxhYmVsPSJDb250cm9sYXIgZmlsYSBkZSAnK2VzYyhtLm5hbWUpKyciPicraWNvblN2ZygncG93ZXInKSsnPC9idXR0b24+JwogICAgICAgICAgOiAnJzsKICAgICAgICB2YXIgdmVyc2lvbj1tLnZlcnNpb24/JzxzcGFuIGNsYXNzPSJ1cC1tZW1iZXItdmVyc2lvbiI+dicrZXNjKG0udmVyc2lvbikrJzwvc3Bhbj4nOic8c3BhbiBjbGFzcz0idXAtbWVtYmVyLXZlcnNpb24iPnY/PC9zcGFuPic7CiAgICAgICAgdmFyIHByZXNlbmNlPW0uY29ubmVjdGVkPT09ZmFsc2U/J29mZmxpbmUnOihjaGF0UHJlc2VuY2VbbS5uYW1lXSYmY2hhdFByZXNlbmNlW20ubmFtZV0+RGF0ZS5ub3coKT8nY2hhdCc6J29ubGluZScpOwogICAgICAgIHZhciBwcmVzZW5jZVRpdGxlPXByZXNlbmNlPT09J2NoYXQnPydDaGF0IGFiZXJ0byc6KHByZXNlbmNlPT09J29ubGluZSc/J0NvbmVjdGFkbyc6J0Rlc2NvbmVjdGFkbycpOwogICAgICAgIHJldHVybiAnPGRpdiBjbGFzcz0idXAtbWVtYmVyIj48ZGl2IGNsYXNzPSJ1cC1tZW1iZXItdG9wIj48ZGl2IGNsYXNzPSJ1cC1tZW1iZXItaWRlbnRpdHkiPjxzcGFuIGNsYXNzPSJ1cC1tZW1iZXItcHJlc2VuY2UgJytwcmVzZW5jZSsnIiB0aXRsZT0iJytwcmVzZW5jZVRpdGxlKyciPjwvc3Bhbj48Yj4nK2VzYyhtLm5hbWUpKyc8L2I+Jyt2ZXJzaW9uKyc8L2Rpdj4nK2NvbnRyb2xzKyc8c3BhbiBjbGFzcz0idXAtYmFkZ2UgYi0nK20uc3RhdHVzKyciPicrbGFiZWxzW20uc3RhdHVzXSsnPC9zcGFuPjwvZGl2PicrCiAgICAgICAgICAobS5yZWFzb24/JzxkaXYgY2xhc3M9InVwLXJlYXNvbiI+JytyZWFzb25JY29uKG0ucmVhc29uKSsnICcrZXNjKHJlYXNvbkxhYmVsKG0ucmVhc29uKSkrJzwvZGl2Pic6JycpKwogICAgICAgICAgKG0udXBkYXRlZEF0Pyc8ZGl2IGNsYXNzPSJ1cC10aW1lIj5EZXNkZSAnK2ZtdFRpbWUobS51cGRhdGVkQXQpKyc8L2Rpdj4nOicnKSsKICAgICAgICAgICc8L2Rpdj4nOwogICAgICB9KS5qb2luKCcnKTsKICAgICAgdGVhbS5xdWVyeVNlbGVjdG9yQWxsKCcudXAtbWVtYmVyLWJhcnVpJykuZm9yRWFjaChmdW5jdGlvbihidG4pe2J0bi5vbmNsaWNrPWZ1bmN0aW9uKGUpe2UucHJldmVudERlZmF1bHQoKTtlLnN0b3BQcm9wYWdhdGlvbigpO3RvZ2dsZUJhcnVpKGJ0bi5nZXRBdHRyaWJ1dGUoJ2RhdGEtdGFyZ2V0JykpO307fSk7CiAgICAgIHRlYW0ucXVlcnlTZWxlY3RvckFsbCgnLnVwLW1lbWJlci1wb3dlcicpLmZvckVhY2goZnVuY3Rpb24oYnRuKXtidG4ub25jbGljaz1mdW5jdGlvbihlKXtlLnByZXZlbnREZWZhdWx0KCk7ZS5zdG9wUHJvcGFnYXRpb24oKTtvcGVuUmVtb3RlQ29udHJvbChidG4uZ2V0QXR0cmlidXRlKCdkYXRhLXRhcmdldCcpKTt9O30pOwogICAgICB1cGRhdGVPdXRnb2luZ0JhcnVpVUkoKTsKICAgICAgc2V0QnViYmxlU3RhdHVzKGN1cnJlbnRTdGF0dXMpOwogICAgfSkuY2F0Y2goZnVuY3Rpb24oZSl7bWVzc2FnZShlLm1lc3NhZ2UsdHJ1ZSl9KS5maW5hbGx5KGZ1bmN0aW9uKCl7cmVmcmVzaGluZz1mYWxzZX0pOwogICAgbG9hZENoYXQoKTsKICB9CgogIGZ1bmN0aW9uIG9wZW5IaXN0b3J5KCl7CiAgICBpZihyb2xlIT09J2ltcGxlbWVudGF0aW9uX2FkbWluJylyZXR1cm47CiAgICBoZWFsdGguY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7CiAgICBoaXN0b3J5LmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpOwogICAgaGlzdG9yeS5xdWVyeVNlbGVjdG9yKCcudXAtaGlzdG9yeS1saXN0JykudGV4dENvbnRlbnQ9J0NhcnJlZ2FuZG/igKYnOwogICAgYXBpKCdHRVQnLCcvYXBpL2hpc3Rvcnk/bGltaXQ9MjAwJykudGhlbihmdW5jdGlvbihkKXsKICAgICAgaGlzdG9yeUNhY2hlPWQuaGlzdG9yeXx8W107CiAgICAgIGlmKCFoaXN0b3J5Q2FjaGUubGVuZ3RoKXsKICAgICAgICBoaXN0b3J5LnF1ZXJ5U2VsZWN0b3IoJy51cC1oaXN0b3J5LWxpc3QnKS5pbm5lckhUTUw9JzxkaXYgY2xhc3M9InVwLWhpc3RvcnktZW1wdHkiPk5lbmh1bWEgbW92aW1lbnRhw6fDo28gcmVnaXN0cmFkYSBhaW5kYS48L2Rpdj4nOwogICAgICAgIHJldHVybjsKICAgICAgfQogICAgICB2YXIgbGFzdERheT0nJzsKICAgICAgaGlzdG9yeS5xdWVyeVNlbGVjdG9yKCcudXAtaGlzdG9yeS1saXN0JykuaW5uZXJIVE1MPWhpc3RvcnlDYWNoZS5tYXAoZnVuY3Rpb24oaXRlbSl7CiAgICAgICAgdmFyIGRheT1mbXREYXkoaXRlbS5jcmVhdGVkQXQpLGhlYWRlcj0nJzsKICAgICAgICBpZihkYXkhPT1sYXN0RGF5KXtoZWFkZXI9JzxkaXYgY2xhc3M9InVwLWhpc3RvcnktZGF5Ij4nK2RheSsnPC9kaXY+JztsYXN0RGF5PWRheX0KICAgICAgICB2YXIgd2hvPShpdGVtLmFjdG9yJiZpdGVtLnRhcmdldCYmaXRlbS5hY3RvciE9PWl0ZW0udGFyZ2V0KT8nPGI+Jytlc2MoaXRlbS5hY3RvcikrJzwvYj48c3Bhbj7ihpI8L3NwYW4+PGI+Jytlc2MoaXRlbS50YXJnZXQpKyc8L2I+JzonPGI+Jytlc2MoaXRlbS51c2VyfHxpdGVtLnRhcmdldHx8aXRlbS5hY3Rvcnx8JycpKyc8L2I+JztyZXR1cm4gaGVhZGVyKyc8ZGl2IGNsYXNzPSJ1cC1oaXN0b3J5LWl0ZW0iPjxkaXYgY2xhc3M9InVwLWhpc3RvcnktbWV0YSI+PHNwYW4+JytmbXRUaW1lKGl0ZW0uY3JlYXRlZEF0KSsnPC9zcGFuPicrd2hvKyc8c3Bhbj4nK3N0YXR1c0ljb24oaXRlbS5zdGF0dXMpKycgJytsYWJlbHNbaXRlbS5zdGF0dXNdKyc8L3NwYW4+PC9kaXY+JysKICAgICAgICAgIChpdGVtLnJlYXNvbj8nPGRpdiBjbGFzcz0idXAtaGlzdG9yeS1yZWFzb24iPicrcmVhc29uSWNvbihpdGVtLnJlYXNvbikrJyAnK2VzYyhyZWFzb25MYWJlbChpdGVtLnJlYXNvbikpKyc8L2Rpdj4nOicnKSsnPC9kaXY+JzsKICAgICAgfSkuam9pbignJyk7CiAgICB9KS5jYXRjaChmdW5jdGlvbihlKXtoaXN0b3J5Q2FjaGU9W107aGlzdG9yeS5xdWVyeVNlbGVjdG9yKCcudXAtaGlzdG9yeS1saXN0JykudGV4dENvbnRlbnQ9ZS5tZXNzYWdlfSk7CiAgfQoKICBmdW5jdGlvbiBleHBvcnRIaXN0b3J5VHh0KCl7CiAgICBpZihyb2xlIT09J2ltcGxlbWVudGF0aW9uX2FkbWluJ3x8IWhpc3RvcnlDYWNoZS5sZW5ndGgpewogICAgICBtZXNzYWdlKCdBYnJhIG8gaGlzdMOzcmljbyBlIGNhcnJlZ3VlIGFzIG1vdmltZW50YcOnw7VlcyBhbnRlcyBkZSBleHBvcnRhci4nLHRydWUpOwogICAgICByZXR1cm47CiAgICB9CiAgICB2YXIgbGluZXM9WydVUFNUQVRVUyAtIEhJU1TDk1JJQ08gREUgTU9WSU1FTlRBw4fDlUVTJywnRXhwb3J0YWRvIGVtOiAnK25ldyBJbnRsLkRhdGVUaW1lRm9ybWF0KCdwdC1CUicse2RhdGVTdHlsZTonc2hvcnQnLHRpbWVTdHlsZTonbWVkaXVtJ30pLmZvcm1hdChuZXcgRGF0ZSgpKSwnJ107CiAgICB2YXIgbGFzdERheT0nJzsKICAgIGhpc3RvcnlDYWNoZS5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pewogICAgICB2YXIgZGF5PWZtdERheShpdGVtLmNyZWF0ZWRBdCk7CiAgICAgIGlmKGRheSE9PWxhc3REYXkpe2xpbmVzLnB1c2goJz09PSAnK2RheSsnID09PScpO2xhc3REYXk9ZGF5fQogICAgICB2YXIgYWN0b3I9aXRlbS5hY3Rvcnx8aXRlbS51c2VyfHwnJzt2YXIgdGFyZ2V0PWl0ZW0udGFyZ2V0fHxpdGVtLnVzZXJ8fCcnO3ZhciBsaW5lPWZtdFRpbWUoaXRlbS5jcmVhdGVkQXQpKycgfCAnKyhhY3RvciE9PXRhcmdldD9hY3RvcisnIC0+ICcrdGFyZ2V0OnRhcmdldCkrJyB8ICcrbGFiZWxzW2l0ZW0uc3RhdHVzXTsKICAgICAgaWYoaXRlbS5yZWFzb24pbGluZSs9JyB8IE1vdGl2bzogJytyZWFzb25MYWJlbChpdGVtLnJlYXNvbik7CiAgICAgIGxpbmVzLnB1c2gobGluZSk7CiAgICB9KTsKICAgIHZhciBibG9iPW5ldyBCbG9iKFtsaW5lcy5qb2luKCdcclxuJykrJ1xyXG4nXSx7dHlwZTondGV4dC9wbGFpbjtjaGFyc2V0PXV0Zi04J30pOwogICAgdmFyIHVybD1VUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpLGE9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpOwogICAgYS5ocmVmPXVybDsKICAgIGEuZG93bmxvYWQ9J1VwU3RhdHVzLUhpc3Rvcmljby0nK25ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zbGljZSgwLDEwKSsnLnR4dCc7CiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGEpO2EuY2xpY2soKTthLnJlbW92ZSgpOwogICAgc2V0VGltZW91dChmdW5jdGlvbigpe1VSTC5yZXZva2VPYmplY3RVUkwodXJsKX0sMTAwMCk7CiAgfQoKICBmdW5jdGlvbiBpc1RyYW5zaWVudFNhbGVTdGF0dXNFcnJvcihlcnIpewogICAgdmFyIHQ9U3RyaW5nKGVyciYmZXJyLm1lc3NhZ2V8fGVycnx8JycpLnRvTG93ZXJDYXNlKCk7CiAgICByZXR1cm4gdC5pbmRleE9mKCdzd2l0Y2hpbmcgc3RhdHVzJyk+PTAgfHwgdC5pbmRleE9mKCdwbGVhc2UgdHJ5IGxhdGVyJyk+PTAgfHwgdC5pbmRleE9mKCfor7fnqI3lkI7lho3or5UnKT49MCB8fCB0LmluZGV4T2YoJ+ato+WcqOWIh+aNoueKtuaAgScpPj0wIHx8IHQuaW5kZXhPZign55So5oi35q2j5Zyo5YiH5o2i54q25oCBJyk+PTA7CiAgfQoKICBmdW5jdGlvbiBzeW5jU2FsZVNtYXJ0bHlPbmNlKHN0YXR1cyx0aW1lb3V0TXMpewogICAgdmFyIG1hcD17b25saW5lOicxJyxidXN5OicyJyxhd2F5OicwJ307CiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3QpewogICAgICB2YXIgc2V0dGxlZD1mYWxzZTsKICAgICAgZnVuY3Rpb24gZG9uZShlKXsKICAgICAgICBpZihzZXR0bGVkKXJldHVybjsKICAgICAgICBzZXR0bGVkPXRydWU7CiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignVVBTVEFUVVNfUkVTVUxUJyxkb25lKTsKICAgICAgICBjbGVhclRpbWVvdXQodGltZXIpOwogICAgICAgIHZhciBkPWUuZGV0YWlsfHx7fTsKICAgICAgICBpZihkLm9rKXJlc29sdmUoKTtlbHNlIHJlamVjdChuZXcgRXJyb3IoZC5lcnJvcnx8J07Do28gZm9pIHBvc3PDrXZlbCBzaW5jcm9uaXphciBvIFNhbGUgU21hcnRseS4nKSk7CiAgICAgIH0KICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignVVBTVEFUVVNfUkVTVUxUJyxkb25lKTsKICAgICAgZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ1VQU1RBVFVTX1NFVCcse2RldGFpbDp7c3RhdHVzOm1hcFtzdGF0dXNdfX0pKTsKICAgICAgdmFyIHRpbWVyPXNldFRpbWVvdXQoZnVuY3Rpb24oKXsKICAgICAgICBpZihzZXR0bGVkKXJldHVybjsKICAgICAgICBzZXR0bGVkPXRydWU7CiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignVVBTVEFUVVNfUkVTVUxUJyxkb25lKTsKICAgICAgICByZWplY3QobmV3IEVycm9yKCdUZW1wbyBlc2dvdGFkbyBhbyBzaW5jcm9uaXphciBjb20gbyBTYWxlIFNtYXJ0bHkuJykpOwogICAgICB9LHRpbWVvdXRNc3x8MzUwMCk7CiAgICB9KTsKICB9CgogIGFzeW5jIGZ1bmN0aW9uIHN5bmNTYWxlU21hcnRseShzdGF0dXMpewogICAgdmFyIGxhc3RFcnJvcj1udWxsOwogICAgdmFyIGRlbGF5cz1bMCw3MDAsMTQwMCwyMjAwXTsKICAgIGZvcih2YXIgYXR0ZW1wdD0wO2F0dGVtcHQ8ZGVsYXlzLmxlbmd0aDthdHRlbXB0KyspewogICAgICBpZihkZWxheXNbYXR0ZW1wdF0pYXdhaXQgbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSl7c2V0VGltZW91dChyZXNvbHZlLGRlbGF5c1thdHRlbXB0XSl9KTsKICAgICAgdHJ5ewogICAgICAgIGF3YWl0IHN5bmNTYWxlU21hcnRseU9uY2Uoc3RhdHVzLDM1MDApOwogICAgICAgIHJldHVybjsKICAgICAgfWNhdGNoKGUpewogICAgICAgIGxhc3RFcnJvcj1lOwogICAgICAgIGlmKCFpc1RyYW5zaWVudFNhbGVTdGF0dXNFcnJvcihlKSB8fCBhdHRlbXB0PT09ZGVsYXlzLmxlbmd0aC0xKXRocm93IGU7CiAgICAgIH0KICAgIH0KICAgIHRocm93IGxhc3RFcnJvcnx8bmV3IEVycm9yKCdOw6NvIGZvaSBwb3Nzw612ZWwgc2luY3Jvbml6YXIgbyBTYWxlIFNtYXJ0bHkuJyk7CiAgfQoKICBhc3luYyBmdW5jdGlvbiBzYXZlKHN0YXR1cyx3aHkpewogICAgdHJ5ewogICAgICBpZihzdGF0dXM9PT0nYnVzeScmJiF3aHkudHJpbSgpKXRocm93IG5ldyBFcnJvcignRXNjcmV2YSBvIG1vdGl2by4nKTsKICAgICAgbWVzc2FnZSgnU2luY3Jvbml6YW5kbyBjb20gU2FsZSBTbWFydGx54oCmJyk7CiAgICAgIGF3YWl0IHN5bmNTYWxlU21hcnRseShzdGF0dXMpOwogICAgICBhd2FpdCBhcGkoJ1BPU1QnLCcvYXBpL3N0YXR1cycse3N0YXR1czpzdGF0dXMscmVhc29uOndoeX0pOwogICAgICBtZXNzYWdlKCdTdGF0dXMgYXR1YWxpemFkby4nKTsKICAgICAgY2FyZC5xdWVyeVNlbGVjdG9yKCcudXAtcmVhc29ucycpLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpOwogICAgICByZWZyZXNoKCk7CiAgICAgIGlmKGxvY2F0aW9uLmhvc3RuYW1lPT09J2FwcC5zYWxlc21hcnRseS5jb20nKXNldFRpbWVvdXQoZnVuY3Rpb24oKXtsb2NhdGlvbi5yZWxvYWQoKX0sMjUwKTsKICAgIH1jYXRjaChlKXttZXNzYWdlKGUubWVzc2FnZSx0cnVlKX0KICB9CgogIHZhciBkcmFnPW51bGw7CiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcmRvd24nLGZ1bmN0aW9uKGUpewogICAgaWYoIXJvb3QuY29udGFpbnMoZS50YXJnZXQpKXsKICAgICAgY2FyZC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTsKICAgICAgaGlzdG9yeS5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTsKICAgICAgY2hhdC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTsKICAgICAgaGVhbHRoLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpOwogICAgfQogIH0sdHJ1ZSk7CiAgYnViYmxlLmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJkb3duJyxmdW5jdGlvbihlKXsKICAgIGlmKGUuYnV0dG9uIT09dW5kZWZpbmVkJiZlLmJ1dHRvbiE9PTApcmV0dXJuOwogICAgdmFyIHI9cm9vdC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTsKICAgIGRyYWc9e2lkOmUucG9pbnRlcklkLHN0YXJ0WDplLmNsaWVudFgsc3RhcnRZOmUuY2xpZW50WSxzdGFydFJpZ2h0OndpbmRvdy5pbm5lcldpZHRoLXIucmlnaHQsc3RhcnRCb3R0b206d2luZG93LmlubmVySGVpZ2h0LXIuYm90dG9tLG1vdmVkOmZhbHNlfTsKICAgIGJ1YmJsZS5zZXRQb2ludGVyQ2FwdHVyZShlLnBvaW50ZXJJZCk7ZS5wcmV2ZW50RGVmYXVsdCgpOwogIH0pOwogIGJ1YmJsZS5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVybW92ZScsZnVuY3Rpb24oZSl7CiAgICBpZighZHJhZ3x8ZS5wb2ludGVySWQhPT1kcmFnLmlkKXJldHVybjsKICAgIHZhciBkeD1lLmNsaWVudFgtZHJhZy5zdGFydFgsZHk9ZS5jbGllbnRZLWRyYWcuc3RhcnRZOwogICAgaWYoTWF0aC5hYnMoZHgpPjR8fE1hdGguYWJzKGR5KT40KWRyYWcubW92ZWQ9dHJ1ZTsKICAgIHJvb3Quc3R5bGUucmlnaHQ9TWF0aC5tYXgoMCxNYXRoLm1pbih3aW5kb3cuaW5uZXJXaWR0aC00MixkcmFnLnN0YXJ0UmlnaHQtZHgpKSsncHgnOwogICAgcm9vdC5zdHlsZS5ib3R0b209TWF0aC5tYXgoMCxNYXRoLm1pbih3aW5kb3cuaW5uZXJIZWlnaHQtNDIsZHJhZy5zdGFydEJvdHRvbS1keSkpKydweCc7CiAgICBlLnByZXZlbnREZWZhdWx0KCk7CiAgfSk7CiAgYnViYmxlLmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJ1cCcsZnVuY3Rpb24oZSl7CiAgICBpZighZHJhZ3x8ZS5wb2ludGVySWQhPT1kcmFnLmlkKXJldHVybjsKICAgIHZhciBtb3ZlZD1kcmFnLm1vdmVkO3RyeXtidWJibGUucmVsZWFzZVBvaW50ZXJDYXB0dXJlKGUucG9pbnRlcklkKX1jYXRjaChfKXt9CiAgICBkcmFnPW51bGw7R01fc2V0VmFsdWUoa2V5KydyaWdodCcscm9vdC5zdHlsZS5yaWdodCk7R01fc2V0VmFsdWUoa2V5Kydib3R0b20nLHJvb3Quc3R5bGUuYm90dG9tKTsKICAgIGlmKCFtb3ZlZCl7aGVhbHRoLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO2lmKCFoaXN0b3J5LmNsYXNzTGlzdC5jb250YWlucygnaGlkZGVuJykpaGlzdG9yeS5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtpZighY2hhdC5jbGFzc0xpc3QuY29udGFpbnMoJ2hpZGRlbicpKXtjaGF0LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO2Jyb2FkY2FzdENoYXRQcmVzZW5jZShmYWxzZSk7fWNhcmQuY2xhc3NMaXN0LnRvZ2dsZSgnaGlkZGVuJyl9CiAgfSk7CiAgYnViYmxlLmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJjYW5jZWwnLGZ1bmN0aW9uKCl7ZHJhZz1udWxsfSk7CgogIGlmKHRva2VuJiZtZW1iZXIpewogICAgYXBpKCdHRVQnLCcvYXBpL21lJykudGhlbihmdW5jdGlvbihyKXsKICAgICAgaWYoci5hdXRoZW50aWNhdGVkKXtyb2xlPXIucm9sZXx8cm9sZTtHTV9zZXRWYWx1ZShrZXkrJ3JvbGUnLHJvbGUpO2FwcCgpO3JlZnJlc2goKTtzdGFydFJlYWx0aW1lKCk7dXBkYXRlQnViYmxlQXZhdGFyKHRydWUpfQogICAgICBlbHNlIGxvZ2luKCk7CiAgICB9KS5jYXRjaChsb2dpbik7CiAgfWVsc2UgbG9naW4oKTsKCiAgc2V0SW50ZXJ2YWwocmVmcmVzaCw1MDAwKTsKICBzZXRJbnRlcnZhbChmdW5jdGlvbigpe2lmKG1lbWJlcil7YnJvYWRjYXN0Q2hhdFByZXNlbmNlKCFjaGF0LmNsYXNzTGlzdC5jb250YWlucygnaGlkZGVuJykpO09iamVjdC5rZXlzKGNoYXRQcmVzZW5jZSkuZm9yRWFjaChmdW5jdGlvbihuYW1lKXtpZihjaGF0UHJlc2VuY2VbbmFtZV0mJmNoYXRQcmVzZW5jZVtuYW1lXTxEYXRlLm5vdygpKWRlbGV0ZSBjaGF0UHJlc2VuY2VbbmFtZV07fSk7aWYoIWNoYXQuY2xhc3NMaXN0LmNvbnRhaW5zKCdoaWRkZW4nKSlyZW5kZXJDaGF0KCk7fX0sMTAwMDApOwogIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLGZ1bmN0aW9uKGUpe2lmKGUua2V5PT09J0VzY2FwZScpY2xvc2VDaGF0TGlnaHRib3goKTt9KTsKICBzZXRJbnRlcnZhbChmdW5jdGlvbigpe2xvYWRDaGF0KCk7fSwxMDAwKTsKICBzZXRJbnRlcnZhbChwb2xsQ2hhdFR5cGluZywxMDAwKTsKICBzZXRJbnRlcnZhbChwb2xsQmFydWksMTAwMCk7CiAgc2V0SW50ZXJ2YWwocG9sbFJlbW90ZVN0YXR1cywxMDAwKTsKICBzZXRJbnRlcnZhbChjaGVja1VwZGF0ZSw2MDAwMCk7Cn0pKCk7Cg==";')+')(?![\\\\w])','gi');
      safe=safe.replace(re,'$1<span class=\\"up-chat-mention\\">$2</span>');
    });
    return safe;
  }
  var toastItems=[];
  var typingHeartbeat=null;
  var typingStopTimer=null;
  var chatLastRenderKey="";
  function removeToast(id){
    var item=toastItems.find(function(x){return x.id===id});
    if(!item)return;
    clearTimeout(item.timer);
    if(item.el&&item.el.parentNode)item.el.parentNode.removeChild(item.el);
    toastItems=toastItems.filter(function(x){return x.id!==id});
  }
  function showChatToast(m){
    if(!m||!m.id||m.type==='system'||m.user===member||!shouldNotifyForChat())return;
    if(!shouldNotifyForChat())return;
    if(bubble){bubble.classList.remove('up-main-alert');void bubble.offsetWidth;bubble.classList.add('up-main-alert');setTimeout(function(){bubble.classList.remove('up-main-alert')},700);}

    if(toastItems.find(function(x){return x.id===m.id}))return;
    while(toastItems.length>=3)removeToast(toastItems[0].id);
    var el=node('div',{className:'up-toast'});
    var toastText=(m.type==='image'||m.imageUrl)?'foto':(m.message||'');
    el.innerHTML='<button type="button" class="up-toast-close" aria-label="Fechar">×</button><div class="up-toast-name">'+esc(m.user)+'</div><div class="up-toast-text">'+esc(toastText)+'</div>';
    el.querySelector('.up-toast-close').onclick=function(e){e.stopPropagation();removeToast(m.id)};
    el.addEventListener('click',function(e){
      if(e.target&&e.target.closest&&e.target.closest('.up-toast-close'))return;
      openChat();
    });
    toastStack.appendChild(el);
    var item={id:m.id,el:el,timer:null};
    item.timer=setTimeout(function(){removeToast(m.id)},5000);
    toastItems.push(item);
  }

  function externalNotificationsSupported(){
    return !!UpNativeNotification;
  }
  var notificationsEnabled=GM_getValue(key+'notifications_enabled',true)!==false;
  function updateNotificationPermissionUI(){
    var btn=card.querySelector('.up-settings-notifications');
    if(!btn)return;
    var p=externalNotificationsSupported()?UpNativeNotification.permission:'unsupported';
    externalNotifPermission=p;btn.classList.remove('enabled','denied');
    if(!notificationsEnabled){btn.classList.add('denied');btn.innerHTML=iconSvg('bell')+'<span>Notificações desligadas</span>';return;}
    if(p==='granted'){btn.classList.add('enabled');btn.innerHTML=iconSvg('bell')+'<span>Notificações ligadas</span>';}
    else if(p==='denied'){btn.classList.add('denied');btn.innerHTML=iconSvg('bell')+'<span>Notificações bloqueadas</span>';}
    else btn.innerHTML=iconSvg('bell')+'<span>Ligar notificações</span>';
  }
  function toggleNotifications(){
    if(notificationsEnabled){notificationsEnabled=false;GM_setValue(key+'notifications_enabled',false);updateNotificationPermissionUI();message('Notificações desligadas.');return;}
    notificationsEnabled=true;GM_setValue(key+'notifications_enabled',true);
    if(externalNotificationsSupported()&&UpNativeNotification.permission==='default'){requestExternalNotifications();return;}
    updateNotificationPermissionUI();
  }
  async function requestExternalNotifications(){
    if(!externalNotificationsSupported()){
      message('Este navegador não oferece notificações externas.',true);
      return;
    }
    try{
      var p=UpNativeNotification.permission;
      if(p==='default')p=await UpNativeNotification.requestPermission();
      externalNotifPermission=p;
      updateNotificationPermissionUI();
      if(p==='granted')message('Notificações externas ativadas.');
      else if(p==='denied')message('Notificações foram bloqueadas pelo navegador.',true);
    }catch(e){message('Não foi possível ativar as notificações.',true)}
  }
  function shouldNotifyForChat(){
    return chat.classList.contains('hidden') || document.hidden;
  }
  function shouldShowExternalNotification(){
    return notificationsEnabled && !!UpNativeNotification && UpNativeNotification.permission==='granted';
  }
  function externalNotificationKey(type,id){
    return 'upstatus_external_'+type+'_'+String(id||'');
  }
  function wasExternalNotificationShown(type,id){
    var k=externalNotificationKey(type,id);
    if(externalNotifSeen[k])return true;
    try{if(GM_getValue(k,false))return true}catch(e){}
    return false;
  }
  function markExternalNotificationShown(type,id){
    var k=externalNotificationKey(type,id);
    externalNotifSeen[k]=true;
    try{GM_setValue(k,true)}catch(e){}
  }
  function isTeamChatMessage(data){
    if(!data||!data.user||data.type==='system')return false;
    var names=window.__upstatusMembers||[];
    if(!names.length)names=['Ricardo','Lohan','Guilherme'];
    if(luccaOnline&&!names.includes('Lucca'))names=names.concat(['Lucca']);
    var sender=String(data.user).trim().toLowerCase();
    return names.some(function(name){return String(name).trim().toLowerCase()===sender;});
  }
  function upStatusNotificationIcon(){
    return server+'/upstatus-icon.svg';
  }
  function showExternalNotification(type,data){
    if(type==='chat' && !shouldNotifyForChat())return;
    if(type==='chat'&&(!isTeamChatMessage(data)||!shouldNotifyForChat()))return;
    if(!shouldShowExternalNotification())return;
    var id=data&&data.id||data&&data.sequence||Date.now();
    if(wasExternalNotificationShown(type,id))return;
    markExternalNotificationShown(type,id);
    try{
      var isBarui=type==='barui';
      var title=isBarui?'BARUI - UpStatus':'UpStatus - Chat da equipe';
      var body=isBarui
        ?String(data.sender||'Alguém')+' está chamando você.'
        :String(data.user||'Alguém')+' enviou uma mensagem no chat.';
      var n=new UpNativeNotification(title,{body:body,icon:upStatusNotificationIcon(),badge:upStatusNotificationIcon(),tag:'upstatus-'+type+'-'+String(id),renotify:true,requireInteraction:isBarui});
      n.onclick=function(){
        try{window.focus()}catch(e){}
        try{if(type==='chat')openChat();}catch(e){}
        try{n.close();}catch(e){}
      };
    }catch(e){
      // Se o navegador recusar o ícone externo, tenta novamente sem o ícone.
      try{
        var isBarui2=type==='barui';
        var title2=isBarui2?'BARUI - UpStatus':'UpStatus - Chat da equipe';
        var body2=isBarui2?String(data.sender||'Alguém')+' está chamando você.':String(data.user||'Alguém')+' enviou uma mensagem no chat.';
        var n2=new UpNativeNotification(title2,{body:body2,tag:'upstatus-'+type+'-'+String(id),renotify:true,requireInteraction:isBarui2});
        n2.onclick=function(){try{window.focus()}catch(e){};try{if(type==='chat')openChat()}catch(e){};try{n2.close()}catch(e){}};
      }catch(ignore){}
    }
  }

  function processChatNotifications(messages){
    var mentions=(messages||[]).filter(function(m){return m.user!==member&&m.mentions&&m.mentions.indexOf(member)>=0;});
    if(!chatInitialized){
      (messages||[]).forEach(function(m){seenMentionIds[m.id]=true;});
      mentions.forEach(function(m){seenMentionIds['mention:'+m.id]=true;});
      chatInitialized=true;
      return;
    }
    var newMention=false;
    (messages||[]).forEach(function(m){
      if(m.type==='system')return;
      if(!seenMentionIds[m.id]){
        seenMentionIds[m.id]=true;
        if(m.user!==member&&shouldNotifyForChat()){
          showChatToast(m);
          if(isTeamChatMessage(m))showExternalNotification('chat',m);
        }
      }
    });
    mentions.forEach(function(m){
      if(!seenMentionIds['mention:'+m.id]){
        seenMentionIds['mention:'+m.id]=true;
        newMention=true;
      }
    });
    if(newMention)playMentionAlert();
  }

  document.addEventListener('UPSTATUS_EXTERNAL_NOTIFICATION_CLICK',function(e){
    try{window.focus()}catch(err){}
    try{var d=e.detail||{};if(d.type==='barui'){bubble.classList.add('up-barui-active');}else{openChat();}}catch(err){}
  });

  function absoluteServerUrl(route){return /^https?:\\/\\//i.test(route||'')?route:server+String(route||'');}
  function loadBlobUrl(route,cacheKey){
    var key=cacheKey||route;if(mediaBlobCache[key])return Promise.resolve(mediaBlobCache[key]);
    return new Promise(function(resolve,reject){GM_xmlhttpRequest({method:'GET',url:absoluteServerUrl(route),responseType:'blob',onload:function(r){if(r.status>=400){reject(new Error('Arquivo não encontrado.'));return;}try{var u=URL.createObjectURL(r.response);mediaBlobCache[key]=u;resolve(u);}catch(e){reject(e);}},onerror:function(){reject(new Error('Não foi possível carregar o arquivo.'));}});});
  }
  var profilesLoadedAt=0;
  function loadProfiles(force){
    if(!token)return Promise.resolve();
    if(!force && Date.now()-profilesLoadedAt<30000)return Promise.resolve();
    return api('GET','/api/profiles').then(function(d){profileCache=d.profiles||{};profilesLoadedAt=Date.now();}).catch(function(){});
  }
  function updateBubbleAvatar(force){
    if(!img)return;
    if(!member){img.src=profileFallback();return;}
    hydrateAvatar(img,member);
    if(token)loadProfiles(!!force).then(function(){hydrateAvatar(img,member);});
  }
  function profileFallback(){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="32" fill="#273247"/><circle cx="32" cy="24" r="11" fill="#9aa8bc"/><path d="M12 56c3-13 11-19 20-19s17 6 20 19" fill="#9aa8bc"/></svg>');}
  function hydrateAvatar(img,name){var cacheKey='profile:'+name;var route=profileCache[name]||GM_getValue(key+cacheKey,'');if(!route){img.src=profileFallback();return;}var cachedRoute=GM_getValue(key+cacheKey,'');if(cachedRoute!==route){if(mediaBlobCache[cacheKey]){try{URL.revokeObjectURL(mediaBlobCache[cacheKey]);}catch(e){}delete mediaBlobCache[cacheKey];}GM_setValue(key+cacheKey,route);}loadBlobUrl(route,cacheKey).then(function(url){img.src=url;}).catch(function(){img.src=profileFallback();});}

  function chatDataKey(messages){return (messages||[]).map(function(m){return [m.id,m.createdAt,m.message,m.type,m.systemType||'',m.imageUrl,JSON.stringify(m.replyTo||null),JSON.stringify(m.reactions||{}),JSON.stringify(m.readBy||[])].join('~');}).join('|');}
  function realtimeMessage(record){
    if(!record||!record.id)return null;
    return {
      id:String(record.id),user:String(record.user_name||''),message:String(record.message||''),type:String(record.type||'text'),
      systemType:String(record.system_type||''),createdAt:record.created_at||new Date().toISOString(),imageUrl:String(record.image_url||''),
      mentions:Array.isArray(record.mentions)?record.mentions:[],replyTo:record.reply_to||null,reactions:record.reactions||{},readBy:[]
    };
  }
  function upsertRealtimeMessage(record){
    var m=realtimeMessage(record);if(!m)return;
    var idx=chatCache.findIndex(function(x){return String(x.id)===m.id;});
    if(idx<0){
      idx=chatCache.findIndex(function(x){
        if(!x.optimistic||x.user!==m.user||x.message!==m.message||x.type!==m.type)return false;
        if(JSON.stringify(x.replyTo||null)!==JSON.stringify(m.replyTo||null))return false;
        if(String(x.imageUrl||'')!==String(m.imageUrl||''))return false;
        var t1=Date.parse(x.createdAt)||0,t2=Date.parse(m.createdAt)||0;
        return Math.abs(t2-t1)<15000;
      });
      if(idx>=0){chatCache[idx]=Object.assign({},chatCache[idx],m);delete chatCache[idx].optimistic;}
    }else{
      chatCache[idx]=Object.assign({},chatCache[idx],m);
    }
    if(idx<0){chatCache.push(m);chatCache.sort(function(a,b){return Date.parse(a.createdAt)-Date.parse(b.createdAt);});}
    if(m.systemType==='lucca_join')updateLuccaPresence(true);
    if(m.systemType==='lucca_leave')updateLuccaPresence(false);
    if(idx<0)processChatNotifications([m]);
    if(!chat.classList.contains('hidden')){renderChat();markVisibleChatRead();}
    else if(idx<0&&m.user!==member&&m.type!=='system')setUnread(chatUnread+1);
    var newest=chatCache[chatCache.length-1];if(newest&&newest.createdAt)chatFastSince=newest.createdAt;
  }
  function handleRealtimeDelete(record){
    var id=record&&record.id!=null?String(record.id):'';if(!id)return;
    var before=chatCache.length;chatCache=chatCache.filter(function(m){return String(m.id)!==id;});
    if(chatCache.length!==before&&!chat.classList.contains('hidden'))renderChat();
  }
  function startRealtime(){
    if(!token||realtimeClient||typeof supabase==='undefined'||!supabase.createClient)return;
    try{
      realtimeClient=supabase.createClient(UP_REALTIME_URL,UP_REALTIME_KEY,{auth:{persistSession:false}});
      realtimeChannel=realtimeClient.channel(UP_REALTIME_TOPIC);
      realtimeChannel
        .on('broadcast',{event:'db_change'},function(payload){
          var p=payload&&payload.payload||{};
          var record=p.record;
          if(!record)return;
          if(p.op==='DELETE')handleRealtimeDelete(record);
          else upsertRealtimeMessage(record);
        })
        .on('broadcast',{event:'user_status'},function(){refresh();})
        .on('broadcast',{event:'chat_presence'},function(payload){var p=payload&&payload.payload||{};if(!p.name)return;chatPresence[p.name]=p.open?Date.now()+25000:0;if(!chat.classList.contains('hidden'))renderChat();})
        .on('broadcast',{event:'remote_command'},function(payload){
          var c=payload&&payload.payload&&payload.payload.command;
          if(c&&c.target===member)executeRemoteCommand(c);
        })
        .on('broadcast',{event:'remote_result'},function(payload){
          var r=payload&&payload.payload&&payload.payload.result;
          if(r&&r.commandId&&r.sender===member){
            remoteResultCache[String(r.commandId)]=r;
            var waiter=remoteResultWaiters[String(r.commandId)];
            if(waiter)waiter(r);
          }
        })
        .subscribe(function(status){
          if(status==='SUBSCRIBED'){realtimeActive=true;if(realtimeRetryTimer){clearTimeout(realtimeRetryTimer);realtimeRetryTimer=null;}broadcastChatPresence(!chat.classList.contains('hidden'));return;}
          if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
            realtimeActive=false;
            try{if(realtimeChannel)realtimeChannel.unsubscribe();}catch(e){}
            realtimeChannel=null;realtimeClient=null;
            if(!realtimeRetryTimer)realtimeRetryTimer=setTimeout(function(){realtimeRetryTimer=null;startRealtime();},3000);
          }
        });
    }catch(e){
      realtimeActive=false;realtimeChannel=null;realtimeClient=null;
      if(!realtimeRetryTimer)realtimeRetryTimer=setTimeout(function(){realtimeRetryTimer=null;startRealtime();},5000);
    }
  }
  function broadcastChatPresence(open){
    if(!member)return;
    chatPresence[member]=open?Date.now()+25000:0;
    if(!realtimeActive||!realtimeChannel)return;
    try{realtimeChannel.send({type:'broadcast',event:'chat_presence',payload:{name:member,open:!!open}});}catch(e){}
  }
  function stopRealtime(){
    realtimeActive=false;
    if(realtimeRetryTimer){clearTimeout(realtimeRetryTimer);realtimeRetryTimer=null;}
    try{if(realtimeChannel)realtimeChannel.unsubscribe();}catch(e){}
    try{if(realtimeClient)realtimeClient.removeAllChannels();}catch(e){}
    realtimeChannel=null;realtimeClient=null;
  }
  function updateLuccaPresence(active){
    luccaOnline=!!active;
    if(quickChatBubble)quickChatBubble.classList.toggle('lucca-active',luccaOnline);
    var mainChatBtn=card.querySelector('.up-chat-btn');
    if(mainChatBtn)mainChatBtn.classList.toggle('lucca-active',luccaOnline);
    var alert=chat.querySelector('.up-chat-lucca-alert');
    if(alert)alert.classList.toggle('hidden',!luccaOnline);
    var names=Array.isArray(window.__upstatusMembers)?window.__upstatusMembers.slice():['Ricardo','Lohan','Guilherme'];
    names=names.filter(function(n){return n!=='Lucca';});
    if(luccaOnline)names.push('Lucca');
    window.__upstatusMembers=names;
  }
  function playLuccaEntrySound(){try{var a=new Audio(server+'/lucca-devil-laugh.wav?'+Date.now());a.volume=.7;var p=a.play();if(p&&p.catch)p.catch(function(){});}catch(e){}}
  function loadChat(forceFull){
    if(!token||chatLoading)return;
    if(realtimeActive&&!forceFull)return;
    chatLoading=true;
    var useFast=!forceFull&&chatCache.length>0&&chatFastSince;
    var route='/api/chat';
    if(useFast)route='/api/chat?fast=1&since='+encodeURIComponent(new Date(new Date(chatFastSince).getTime()-2000).toISOString());
    api('GET',route).then(function(d){
      var incoming=d.messages||[],nextMessages;
      if(useFast){
        var byId={};
        chatCache.forEach(function(m){byId[m.id]=m;});
        incoming.forEach(function(m){byId[m.id]=m;});
        nextMessages=Object.keys(byId).map(function(k){return byId[k];}).sort(function(a,b){return Date.parse(a.createdAt)-Date.parse(b.createdAt);});
      }else{
        nextMessages=incoming;
      }
      updateLuccaPresence(!!d.luccaOnline);
      var latestLuccaJoin=null;
      for(var li=nextMessages.length-1;li>=0;li--){if(nextMessages[li].type==='system'&&nextMessages[li].systemType==='lucca_join'){latestLuccaJoin=nextMessages[li];break;}}
      if(latestLuccaJoin){if(lastLuccaJoinEventId&&latestLuccaJoin.id!==lastLuccaJoinEventId)playLuccaEntrySound();lastLuccaJoinEventId=latestLuccaJoin.id;}
      var beforeKey=chatDataKey(chatCache);
      chatCache=nextMessages;
      if(d.profiles)profileCache=d.profiles;
      processChatNotifications(incoming);
      var newest=chatCache[chatCache.length-1];
      if(newest&&newest.createdAt)chatFastSince=newest.createdAt;
      var chatVisible=!chat.classList.contains('hidden')&&!document.hidden;
      if(!useFast)setUnread(chatVisible?0:(d.unreadCount||0));
      else if(chatVisible)setUnread(0);
      if(!chat.classList.contains('hidden')){
        var nextKey=chatDataKey(chatCache);
        if(nextKey!==beforeKey){
          renderChat();
          markVisibleChatRead();
        }
        updateTypingIndicator(d.typing||[]);
      }
    }).catch(function(){}).finally(function(){chatLoading=false;});
  }
  function updateTypingIndicator(names){
    var box=chat.querySelector('.up-chat-typing');if(!box)return;
    var active=(Array.isArray(names)?names:[]).filter(function(n){return n&&n!==member;});
    if(!active.length){box.classList.add('hidden');box.innerHTML='';return;}
    var shown=active.slice(0,2),label=shown.join(' e ')+(active.length>2?' e mais alguém':'');
    var first=shown[0];
    box.innerHTML='<img class="up-chat-typing-avatar" data-typing-avatar="'+esc(first)+'" alt="'+esc(first)+'"><div class="up-chat-typing-dots"><i></i><i></i><i></i></div><span>'+esc(label)+' digitando</span>';
    box.classList.remove('hidden');
    var img=box.querySelector('[data-typing-avatar]');if(img)hydrateAvatar(img,first);
  }
  function sendTypingState(active){if(!token||!member)return Promise.resolve();return api('POST','/api/chat/typing',{typing:!!active}).catch(function(){});}
  function pollChatTyping(){if(!token||chat.classList.contains('hidden')||typingPolling)return;typingPolling=true;api('GET','/api/chat/typing').then(function(d){updateTypingIndicator(d.typing||[]);}).catch(function(){}).finally(function(){typingPolling=false;});}
  function stopTypingHeartbeat(){if(typingHeartbeat){clearInterval(typingHeartbeat);typingHeartbeat=null;}if(typingStopTimer){clearTimeout(typingStopTimer);typingStopTimer=null;}sendTypingState(false);}
  function startTypingHeartbeat(){if(typingHeartbeat)return;sendTypingState(true);typingHeartbeat=setInterval(function(){var input=chat.querySelector('.up-chat-input');if(!input||chat.classList.contains('hidden')||!String(input.value||'').trim()){stopTypingHeartbeat();return;}sendTypingState(true);},1500);}
  function handleTypingInput(){var input=chat.querySelector('.up-chat-input');if(!input)return;if(String(input.value||'').trim()){startTypingHeartbeat();if(typingStopTimer)clearTimeout(typingStopTimer);typingStopTimer=setTimeout(function(){stopTypingHeartbeat();},4500);}else stopTypingHeartbeat();}
  function markVisibleChatRead(){if(!token||chat.classList.contains('hidden'))return;var ids=chatCache.filter(function(m){return m.user!==member;}).map(function(m){return m.id;});if(!ids.length)return;var k=ids.join(',');if(k===readSentKey)return;api('POST','/api/chat/read',{messageIds:ids}).then(function(){readSentKey=k;setUnread(0);}).catch(function(){});}


  function replyPreview(m){
    if(!m||!m.replyTo)return '';
    var r=m.replyTo;
    var text=r.message||((r.type==='image'||r.type==='video'||r.type==='audio')?'Anexo':'');
    return '<div class="up-chat-quoted"><b>'+esc(r.user||'')+'</b><span>'+esc(text.slice(0,120))+'</span></div>';
  }
  function renderReactions(m){
    var reactions=m&&m.reactions&&typeof m.reactions==='object'?m.reactions:{};
    return Object.keys(reactions).map(function(em){var users=Array.isArray(reactions[em])?reactions[em]:[];if(!users.length)return '';var mine=users.indexOf(member)>=0;return '<button type="button" class="up-chat-reaction '+(mine?'mine':'')+'" data-reaction="'+esc(em)+'" title="'+esc(users.join(', '))+'">'+em+' '+users.length+'</button>';}).join('');
  }
  function showChatProfileHover(img,name,e){
    var route=profileCache[name]||'';
    var src=route?mediaBlobCache['profile:'+name]:'';
    chatProfileHover.innerHTML='<img alt=""><div class="up-chat-profile-hover-name">'+esc(name)+'</div><div class="up-chat-profile-hover-role">Membro da equipe</div>';
    var previewImg=chatProfileHover.querySelector('img');
    previewImg.className=chatAvatarPresence(name);
    previewImg.src=src||profileFallback();
    chatProfileHover.classList.add('show');
    positionChatProfileHover(e);
    if(route&&!src){loadBlobUrl(route,'profile:'+name).then(function(url){if(chatProfileHover.classList.contains('show'))previewImg.src=url;}).catch(function(){});}
  }
  function positionChatProfileHover(e){
    if(!chatProfileHover.classList.contains('show'))return;
    var pad=12,w=chatProfileHover.offsetWidth||148,h=chatProfileHover.offsetHeight||130;
    var x=(e.clientX||0)+14,y=(e.clientY||0)+14;
    if(x+w>window.innerWidth-pad)x=(e.clientX||0)-w-14;
    if(y+h>window.innerHeight-pad)y=(e.clientY||0)-h-14;
    x=Math.max(pad,Math.min(window.innerWidth-w-pad,x));
    y=Math.max(pad,Math.min(window.innerHeight-h-pad,y));
    chatProfileHover.style.left=x+'px';chatProfileHover.style.top=y+'px';
  }
  function hideChatProfileHover(){chatProfileHover.classList.remove('show');chatProfileHover.innerHTML='';}

  function chatAvatarPresence(name){
    var team=window.__upstatusTeam||{},person=team[name]||Object.keys(team).map(function(k){return team[k];}).find(function(x){return x&&x.name===name;});
    if(!person||person.connected===false)return 'up-chat-presence-offline';
    return chatPresence[name]&&chatPresence[name]>Date.now()?'up-chat-presence-active':'up-chat-presence-idle';
  }
  function renderChat(){
    var list=chat.querySelector('.up-chat-list');if(!list)return;
    var wasAtBottom=(list.scrollHeight-list.scrollTop-list.clientHeight)<28;var previousScrollTop=list.scrollTop;
    if(!chatCache.length){list.innerHTML='<div class="up-history-empty">Nenhuma mensagem nas últimas 48 horas.</div>';return;}
    list.innerHTML=chatCache.map(function(m){
      if(m.type==='system')return '<div class="up-chat-system-event '+(m.systemType==='lucca_join'?'join':(m.systemType==='chat_clear'?'clear':'leave'))+'"><span>'+esc(m.message)+'</span></div>';
      var own=m.user===member, avatar='<img class="up-chat-avatar '+chatAvatarPresence(m.user)+'" data-avatar-name="'+esc(m.user)+'" alt="'+esc(m.user)+'">',body='';
      if(m.imageUrl){if(m.type==='video')body='<video class="up-chat-media up-chat-media-video" data-media-route="'+esc(m.imageUrl)+'" controls preload="metadata"></video>';else if(m.type==='audio')body='<audio class="up-chat-audio" data-media-route="'+esc(m.imageUrl)+'" controls preload="metadata"></audio>';else body='<img class="up-chat-photo" data-media-route="'+esc(m.imageUrl)+'" alt="Imagem enviada por '+esc(m.user)+'" loading="lazy">';}
      else if(m.message)body='<div class="up-chat-text">'+renderChatText(m.message)+'</div>';
      var readers=Array.isArray(m.readBy)?m.readBy.filter(function(n){return n!==member;}):[];
      var title=readers.length?'Lido por: '+readers.join(', '):'Não lido ainda';
      var tick=own?'<span class="up-chat-read '+(readers.length?'read':'')+'" data-readers="'+esc(title)+'">✓✓</span>':'';
      var bubble='<div class="up-chat-bubble">'+replyPreview(m)+'<div class="up-chat-meta"><b>'+esc(m.user)+'</b><span>'+fmtTime(m.createdAt)+'</span></div>'+body+(own?'<div class="up-chat-own-meta">'+tick+'</div>':'')+'<div class="up-chat-reactions">'+renderReactions(m)+'</div></div>';
      return '<div class="up-chat-item '+(own?'own ':'')+(m.user==='Lucca'?'lucca':'')+'" data-message-id="'+esc(m.id)+'">'+avatar+bubble+(own?'<button type="button" class="up-delete-action hidden">Excluir</button>':'')+'</div>';
    }).join('');
    list.querySelectorAll('[data-avatar-name]').forEach(function(img){hydrateAvatar(img,img.getAttribute('data-avatar-name'));});
    list.querySelectorAll('[data-avatar-name]').forEach(function(img){var name=img.getAttribute('data-avatar-name')||'';img.addEventListener('mouseenter',function(e){showChatProfileHover(img,name,e);});img.addEventListener('mousemove',positionChatProfileHover);img.addEventListener('mouseleave',hideChatProfileHover);});
    list.querySelectorAll('[data-media-route]').forEach(function(el){var route=el.getAttribute('data-media-route')||'',key='chat:'+route;loadBlobUrl(route,key).then(function(url){el.src=url;}).catch(function(){});el.addEventListener('load',function(){if(wasAtBottom)requestAnimationFrame(function(){list.scrollTop=list.scrollHeight;});});});
    list.querySelectorAll('.up-chat-photo').forEach(function(img){img.addEventListener('click',function(){openChatLightbox(img.src);});});
    list.querySelectorAll('.up-chat-read').forEach(function(tick){tick.addEventListener('mouseenter',function(e){readTooltip.textContent=tick.getAttribute('data-readers')||'Não lido ainda';readTooltip.classList.add('show');positionReadTooltip(e);});tick.addEventListener('mousemove',positionReadTooltip);tick.addEventListener('mouseleave',function(){readTooltip.classList.remove('show');});});
    list.querySelectorAll('.up-chat-item').forEach(function(item){item.addEventListener('contextmenu',function(e){e.preventDefault();e.stopPropagation();var id=item.getAttribute('data-message-id');var msg=chatCache.find(function(x){return x.id===id;});if(msg)openChatContextMenu(e,msg);});});
    list.querySelectorAll('.up-chat-reaction').forEach(function(btn){btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var item=btn.closest('.up-chat-item'),id=item&&item.getAttribute('data-message-id'),em=btn.getAttribute('data-reaction');if(id&&em)toggleChatReaction(id,em);});});
    list.querySelectorAll('.up-chat-item.own').forEach(function(item){var del=item.querySelector('.up-delete-action');if(del)del.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var id=item.getAttribute('data-message-id');if(!id)return;del.disabled=true;api('DELETE','/api/chat/'+encodeURIComponent(id)).then(function(){chatCache=chatCache.filter(function(m){return m.id!==id;});renderChat();}).catch(function(err){del.disabled=false;message(err.message,true);});});});
    list.onclick=function(e){if(e.target.closest&&e.target.closest('.up-delete-action'))return;list.querySelectorAll('.up-delete-action').forEach(function(b){b.classList.add('hidden')});};
    chatLastRenderKey=chatDataKey(chatCache);
    requestAnimationFrame(function(){list.scrollTop=list.scrollHeight;});
  }
  function openChatLightbox(src){var box=chat.querySelector('.up-chat-lightbox'),img=box&&box.querySelector('img');if(!box||!img)return;img.src=src;box.classList.remove('hidden');}
  function closeChatLightbox(){var box=chat.querySelector('.up-chat-lightbox');if(box)box.classList.add('hidden');}
  function openChatContextMenu(e,m){
    var menu=chat.querySelector('.up-chat-context-menu');if(!menu)return;
    chatContextMessageId=m.id;
    var canReply=m.user!==member;
    var quick=['😂','❤️','👍','😡','😮','👏'];
    var canDelete=m.user===member;
    menu.innerHTML=(canReply?'<button type="button" class="up-chat-context-action" data-action="reply">↩ Responder</button>':'')+(canDelete?'<button type="button" class="up-chat-context-action up-chat-context-delete" data-action="delete">🗑 Excluir mensagem</button>':'')+'<div class="up-chat-context-reaction-row">'+quick.map(function(em){return '<button type="button" class="up-chat-reaction" data-context-reaction="'+esc(em)+'">'+em+'</button>';}).join('')+'</div>';
    menu.classList.add('show');
    var x=Math.min(window.innerWidth-menu.offsetWidth-8,Math.max(8,e.clientX||8)),y=Math.min(window.innerHeight-menu.offsetHeight-8,Math.max(8,e.clientY||8));menu.style.left=x+'px';menu.style.top=y+'px';
    var reply=menu.querySelector('[data-action="reply"]');if(reply)reply.onclick=function(){setChatReply(m);hideChatContextMenu();};
    var del=menu.querySelector('[data-action="delete"]');if(del)del.onclick=function(){hideChatContextMenu();if(!confirm('Excluir esta mensagem?'))return;del.disabled=true;api('DELETE','/api/chat/'+encodeURIComponent(m.id)).then(function(){chatCache=chatCache.filter(function(x){return x.id!==m.id;});renderChat();}).catch(function(err){message(err.message,true);});};
    menu.querySelectorAll('[data-context-reaction]').forEach(function(btn){btn.onclick=function(){toggleChatReaction(m.id,btn.getAttribute('data-context-reaction'));hideChatContextMenu();};});
  }
  function hideChatContextMenu(){var menu=chat.querySelector('.up-chat-context-menu');if(menu)menu.classList.remove('show');chatContextMessageId=null;}
  function toggleChatReaction(id,emoji){api('POST','/api/chat/reaction',{messageId:id,emoji:emoji}).then(function(){return api('GET','/api/chat')}).then(function(d){chatCache=d.messages||[];renderChat();}).catch(function(e){message(e.message,true);});}
  function setChatReply(m){chatReplyTo=m?{id:m.id,user:m.user,message:m.message||((m.type==='image'||m.type==='video'||m.type==='audio')?'Anexo':'')} : null;var bar=chat.querySelector('.up-chat-reply-bar'),copy=bar&&bar.querySelector('.up-chat-reply-copy');if(bar&&copy){if(chatReplyTo){copy.innerHTML='<b>Respondendo a '+esc(chatReplyTo.user)+'</b>'+esc(chatReplyTo.message.slice(0,120));bar.classList.remove('hidden');}else{bar.classList.add('hidden');copy.textContent='';}}var input=chat.querySelector('.up-chat-input');if(input)input.focus();}
  function mentionState(input){
    if(!input)return null;
    var value=input.value||'', caret=input.selectionStart==null?value.length:input.selectionStart;
    var before=value.slice(0,caret);
    var match=before.match(/(?:^|\\s)@([\\p{L}\\p{N}_-]*)$/u);
    if(!match)return null;
    var query=(match[1]||'').toLowerCase();
    var names=Array.isArray(window.__upstatusMembers)&&window.__upstatusMembers.length?window.__upstatusMembers.slice():['Ricardo','Lohan','Guilherme'];
    var filtered=names.filter(function(name){return String(name).toLowerCase().indexOf(query)===0;});
    if('todos'.indexOf(query)===0)filtered.unshift('__ALL__');
    return {query:query,names:filtered};
  }
  function applyMention(name){
    var input=chat.querySelector('.up-chat-input');
    if(!input)return;
    var value=input.value||'';
    var caret=input.selectionStart==null?value.length:input.selectionStart;
    var before=value.slice(0,caret),after=value.slice(caret);
    var match=before.match(/(?:^|\\s)@([\\p{L}\\p{N}_-]*)$/u);
    if(!match)return;
    var mention=name==='__ALL__'?'todos':name;
    var prefix=before.slice(0,before.length-(match[1]||'').length-1);
    input.value=prefix+'@'+mention+' '+after;
    var pos=(prefix+'@'+mention+' ').length;
    input.focus();input.setSelectionRange(pos,pos);
    var menu=chat.querySelector('.up-mention-menu');if(menu)menu.classList.add('hidden');
  }
  function renderMentionMenu(){
    var input=chat.querySelector('.up-chat-input'),menu=chat.querySelector('.up-mention-menu');
    if(!input||!menu)return;
    var state=mentionState(input);
    if(!state){menu.classList.add('hidden');menu.innerHTML='';return;}
    menu.innerHTML=state.names.map(function(name){
      if(name==='__ALL__'){
        return '<button type="button" class="up-mention-option up-mention-all" data-name="__ALL__">'+iconSvg('chat')+'<span>@todos</span></button>';
      }
      return '<button type="button" class="up-mention-option" data-name="'+esc(name)+'">'+iconSvg('chat')+'<span>@'+esc(name)+'</span></button>';
    }).join('');
    menu.classList.remove('hidden');
    menu.querySelectorAll('.up-mention-option').forEach(function(btn){
      btn.onclick=function(e){e.preventDefault();e.stopPropagation();applyMention(btn.getAttribute('data-name'));};
    });
  }
  function hideIncomingBarui(){
    baruiIncoming.classList.add('hidden');
    baruiIncoming.innerHTML='';
  }
  function stopIncomingBarui(){
    if(!baruiState.active)return;
    api('POST','/api/barui/stop-incoming',{}).then(function(){stopLocalBarui();}).catch(function(e){message(e.message,true)});
  }
  function showIncomingBarui(sender){
    var name=String(sender||'Alguém');
    baruiIncoming.innerHTML='<div class="up-barui-incoming-card"><div class="up-barui-incoming-title">'+esc(name)+' está te chamando!</div><div class="up-barui-incoming-sub">BARUI da equipe</div><div class="up-barui-incoming-actions"><button type="button" class="up-barui-attend">Atender</button><button type="button" class="up-barui-stop">Parar</button></div></div>';
    baruiIncoming.classList.remove('hidden');
    baruiIncoming.classList.remove('shake');void baruiIncoming.offsetWidth;baruiIncoming.classList.add('shake');
    var attend=baruiIncoming.querySelector('.up-barui-attend');
    var stop=baruiIncoming.querySelector('.up-barui-stop');
    if(attend)attend.onclick=function(e){e.stopPropagation();openChat();};
    if(stop)stop.onclick=function(e){e.stopPropagation();stopIncomingBarui();};
  }

  function updateBaruiTitle(active){
    if(active){if(!document.title.startsWith('BARUI'))document.title='BARUI • '+originalTitle;bubble.classList.add('up-barui-active');}
    else{if(document.title.startsWith('BARUI'))document.title=originalTitle;bubble.classList.remove('up-barui-active');}
  }
  function updateOutgoingBaruiUI(){
    card.querySelectorAll('.up-member-barui').forEach(function(btn){
      var target=btn.getAttribute('data-target');
      var active=!!baruiOutgoing.active&&baruiOutgoing.target===target;
      btn.classList.toggle('active',active);
      btn.title=active?'Parar BARUI para '+target:'Enviar BARUI para '+target;
      btn.setAttribute('aria-label',btn.title);
    });
  }
  function playBaruiAlert(){playMentionAlert();}
  function stopLocalBarui(){
    baruiState={active:false,sequence:0,target:'',sender:'',startedAt:0};
    hideIncomingBarui();
    updateBaruiTitle(false);
  }
  function pollBarui(){
    if(!token||baruiPolling)return;
    baruiPolling=true;
    api('GET','/api/barui').then(function(d){
      var active=!!d.active;
      if(active){
        if(!baruiState.active||baruiState.sequence!==d.sequence){
          baruiState={active:true,sequence:d.sequence,target:member,sender:d.sender,startedAt:Date.parse(d.startedAt)||Date.now()};
          playBaruiAlert();baruiLastBeep=Date.now();
          showIncomingBarui(d.sender||'Alguém');
          if(baruiExternalNotifiedSequence!==d.sequence){
            baruiExternalNotifiedSequence=d.sequence;
            showExternalNotification('barui',{sequence:d.sequence,sender:d.sender||'Alguém'});
          }
        }
        else {
          showIncomingBarui(d.sender||baruiState.sender||'Alguém');
          if(Date.now()-baruiLastBeep>=1200){playBaruiAlert();baruiLastBeep=Date.now();}
        }
      }else if(baruiState.active){stopLocalBarui();}
      if(active&&Date.now()-baruiState.startedAt>=30000){stopLocalBarui();return;}
      updateBaruiTitle(active);
      baruiOutgoing=d.outgoingActive?{active:true,target:d.outgoingTarget||''}:{active:false,target:''};
      updateOutgoingBaruiUI();
    }).catch(function(){}).finally(function(){baruiPolling=false;});
  }
  function sendBaruiTo(target){
    if(!target||target===member)return;
    var btn=card.querySelector('.up-member-barui[data-target=\\"'+CSS.escape(target)+'\\"]');
    if(btn)btn.disabled=true;
    var stopOld=baruiOutgoing.active&&baruiOutgoing.target&&baruiOutgoing.target!==target
      ? api('POST','/api/barui',{target:baruiOutgoing.target,active:false})
      : Promise.resolve();
    stopOld.then(function(){
      return api('POST','/api/barui',{target:target,active:true});
    }).then(function(){
      baruiOutgoing={active:true,target:target};
      updateOutgoingBaruiUI();
    }).catch(function(e){message(e.message,true)}).finally(function(){if(btn)btn.disabled=false});
  }
  function stopOutgoingBarui(){
    var target=baruiOutgoing.target;if(!target)return;
    var btn=card.querySelector('.up-member-barui[data-target=\\"'+CSS.escape(target)+'\\"]');
    if(btn)btn.disabled=true;
    api('POST','/api/barui',{target:target,active:false}).then(function(){
      baruiOutgoing={active:false,target:''};updateOutgoingBaruiUI();
    }).catch(function(e){message(e.message,true)}).finally(function(){if(btn)btn.disabled=false});
  }
  function positionReadTooltip(e){var x=(e.clientX||0)+12,y=(e.clientY||0)+12;var w=readTooltip.offsetWidth,h=readTooltip.offsetHeight;if(x+w>window.innerWidth-8)x=Math.max(8,(e.clientX||0)-w-12);if(y+h>window.innerHeight-8)y=Math.max(8,(e.clientY||0)-h-12);readTooltip.style.left=x+'px';readTooltip.style.top=y+'px';}
  function toggleBarui(target){
    if(baruiOutgoing.active&&baruiOutgoing.target===target){stopOutgoingBarui();return;}
    sendBaruiTo(target);
  }

  function openChat(){
    if(!token)return;
    chatReplyTo=null;chatContextMessageId=null;
    chat.classList.remove('hidden');card.classList.add('hidden');history.classList.add('hidden');broadcastChatPresence(true);refresh();
    chat.innerHTML='<div class="up-history-head"><div class="up-chat-title-wrap"><button type="button" class="up-chat-profile-btn" title="Alterar foto de perfil"><img alt="Minha foto"></button><div class="up-history-title">Chat da equipe</div></div><div style="display:flex;gap:6px;align-items:center">'+(member==='Ricardo'?'<button class="up-chat-clear" type="button" title="Limpar chat">🧹</button>':'')+'<button class="up-chat-back" type="button">← Voltar</button></div></div><div class="up-chat-lucca-alert hidden">🔴 ALERTA DE LUCCA MALUCO</div><div class="up-chat-list">Carregando…</div><div class="up-chat-typing hidden"></div><div class="up-chat-context-menu"></div><div class="up-chat-compose"><div class="up-chat-reply-bar hidden"><div class="up-chat-reply-copy"></div><button type="button" class="up-chat-reply-close">×</button></div><div class="up-mention-menu hidden"></div><div class="up-chat-emoji-menu hidden"></div><div class="up-chat-recording-label">Gravando <span class="up-chat-recording-time">0:00</span> • clique novamente para enviar</div><textarea class="up-chat-input" maxlength="1000" placeholder="Digite uma mensagem"></textarea><div class="up-chat-tools"><button type="button" class="up-chat-emoji-btn" title="Emojis" aria-label="Emojis">'+iconSvg('emoji')+'</button><button type="button" class="up-chat-attach" title="Enviar foto, GIF ou vídeo" aria-label="Enviar foto, GIF ou vídeo">'+iconSvg('photo')+'</button><button type="button" class="up-chat-record" title="Gravar áudio (até 30 segundos)" aria-label="Gravar áudio">🎙</button><input class="up-chat-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" hidden></div></div><button class="up-chat-send">Enviar</button><div class="up-chat-lightbox hidden"><button type="button" class="up-chat-lightbox-close" aria-label="Fechar">×</button><img alt="Imagem ampliada"></div>';
    var profileBtn=chat.querySelector('.up-chat-profile-btn');if(profileBtn){hydrateAvatar(profileBtn.querySelector('img'),member);profileBtn.onclick=function(e){e.stopPropagation();openProfileModal();};profileBtn.addEventListener('mouseenter',function(e){showChatProfileHover(profileBtn.querySelector('img'),member,e);});profileBtn.addEventListener('mousemove',positionChatProfileHover);profileBtn.addEventListener('mouseleave',hideChatProfileHover);}
    var input=chat.querySelector('.up-chat-input'),photoBtn=chat.querySelector('.up-chat-attach'),photoFile=chat.querySelector('.up-chat-file'),emojiBtn=chat.querySelector('.up-chat-emoji-btn'),emojiMenu=chat.querySelector('.up-chat-emoji-menu'),recordBtn=chat.querySelector('.up-chat-record');
    photoBtn.onclick=function(e){e.stopPropagation();photoFile.click()};
    photoFile.addEventListener('change',function(){if(photoFile.files&&photoFile.files[0])sendChatMedia(photoFile.files[0])});
    setupEmojiPicker(emojiBtn,emojiMenu,input);
    if(recordBtn)recordBtn.onclick=function(e){e.stopPropagation();toggleAudioRecording(recordBtn);};
    input.addEventListener('paste',function(e){var items=e.clipboardData&&e.clipboardData.items?Array.from(e.clipboardData.items):[];var item=items.find(function(x){return x.kind==='file'&&/^image\\//i.test(x.type)});if(item){var file=item.getAsFile();if(file){e.preventDefault();sendChatMedia(file);}}});
    chat.querySelector('.up-chat-reply-close').onclick=function(e){e.stopPropagation();setChatReply(null);};document.addEventListener('click',function(e){var menu=chat.querySelector('.up-chat-context-menu');if(menu&&menu.classList.contains('show')&&!menu.contains(e.target))hideChatContextMenu();});chat.querySelector('.up-chat-back').onclick=function(e){e.stopPropagation();hideChatContextMenu();stopTypingHeartbeat();chat.classList.add('hidden');card.classList.remove('hidden');broadcastChatPresence(false);refresh();};
    var clearBtn=chat.querySelector('.up-chat-clear');if(clearBtn)clearBtn.onclick=clearChatRicardo;
    var lightbox=chat.querySelector('.up-chat-lightbox');if(lightbox){lightbox.querySelector('.up-chat-lightbox-close').onclick=closeChatLightbox;lightbox.onclick=function(e){if(e.target===lightbox)closeChatLightbox();}}
    chat.querySelector('.up-chat-send').onclick=function(e){e.stopPropagation();sendChat()};
    input.addEventListener('input',function(){renderMentionMenu();handleTypingInput();});input.addEventListener('click',renderMentionMenu);input.addEventListener('keyup',renderMentionMenu);input.addEventListener('keydown',function(e){if(e.key.length===1||e.key==='Backspace'||e.key==='Delete')startTypingHeartbeat();});input.addEventListener('focus',function(){if(String(input.value||'').trim())startTypingHeartbeat();});input.addEventListener('blur',function(){if(typingStopTimer)clearTimeout(typingStopTimer);typingStopTimer=setTimeout(function(){stopTypingHeartbeat();},1200);});
    input.addEventListener('keydown',function(e){if(e.key==='Escape'){var menu=chat.querySelector('.up-mention-menu');if(menu)menu.classList.add('hidden');return;}if(e.key==='Enter'&&!e.shiftKey){var menu=chat.querySelector('.up-mention-menu');if(menu&&!menu.classList.contains('hidden')){var first=menu.querySelector('.up-mention-option');if(first){e.preventDefault();applyMention(first.getAttribute('data-name'));return;}}e.preventDefault();sendChat();}});
    if(chatCache.length)renderChat();
    stopLocalBarui();
    updateLuccaPresence(luccaOnline);
    loadChat();
    pollChatTyping();
    api('POST','/api/chat/read',{messageIds:chatCache.filter(function(m){return m.user!==member;}).map(function(m){return m.id;})}).then(function(){setUnread(0);}).catch(function(){});
  }
  function refreshChatAfterSend(input,btn){if(input)input.value='';if(btn)btn.disabled=false;loadChat();return Promise.resolve();}
  function setupEmojiPicker(btn,menu,input){
    if(!btn||!menu||!input)return;
    var emojis='😀 😃 😄 😁 😆 😅 😂 🙂 🙃 😉 😊 😍 🥰 😘 😎 🤔 😐 😑 😶 🙄 😏 😴 🤣 😭 😡 🤯 😱 🤝 👍 👎 👌 ✌️ 🙏 👏 💪 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💯 🔥 🎉 🚀 ✅ ❌ ⭐ 🤡 🤖 👀 🫡'.split(' ');
    menu.innerHTML=emojis.map(function(e){return '<button type="button" class="up-chat-emoji" data-emoji="'+esc(e)+'">'+e+'</button>';}).join('');
    btn.onclick=function(e){e.stopPropagation();menu.classList.toggle('hidden');};
    menu.querySelectorAll('.up-chat-emoji').forEach(function(b){b.onclick=function(e){e.preventDefault();e.stopPropagation();var value=input.value||'',pos=input.selectionStart==null?value.length:input.selectionStart,em=b.getAttribute('data-emoji')||'';input.value=value.slice(0,pos)+em+value.slice(pos);pos+=em.length;input.focus();input.setSelectionRange(pos,pos);};});
    document.addEventListener('click',function(e){if(!menu.contains(e.target)&&e.target!==btn)menu.classList.add('hidden');});
  }
  function updateRecordingUi(btn,active){var label=chat.querySelector('.up-chat-recording-label');var time=chat.querySelector('.up-chat-recording-time');if(btn)btn.classList.toggle('recording',active);if(label)label.classList.toggle('show',active);if(!active&&time)time.textContent='0:00';}
  function stopAudioRecording(send){var rec=mediaRecorder;if(!rec)return;rec.__sendOnStop=!!send;try{if(rec.state==='recording'){try{rec.requestData();}catch(e){}rec.stop();}}catch(e){finishAudioRecording(rec);}}
  function finishAudioRecording(rec){try{if(rec&&rec.stream)rec.stream.getTracks().forEach(function(t){t.stop();});}catch(e){}clearInterval(recordingTimer);recordingTimer=null;updateRecordingUi(chat.querySelector('.up-chat-record'),false);mediaRecorder=null;}
  function toggleAudioRecording(btn){
    if(mediaRecorder&&mediaRecorder.state==='recording'){stopAudioRecording(true);return;}
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||typeof MediaRecorder==='undefined'){message('Seu navegador não suporta gravação de áudio.',true);return;}
    navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}}).then(function(stream){
      recordingChunks=[];recordingStartedAt=Date.now();var mime='';
      ['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/mpeg'].some(function(x){if(MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(x)){mime=x;return true;}return false;});
      var options=mime?{mimeType:mime,audioBitsPerSecond:128000}:{};
      var rec=new MediaRecorder(stream,options);mediaRecorder=rec;rec.__sendOnStop=true;rec.__mime=mime;
      rec.ondataavailable=function(e){if(e.data&&e.data.size)recordingChunks.push(e.data);};
      rec.onerror=function(){finishAudioRecording(rec);recordingChunks=[];message('Não foi possível gravar o áudio.',true);};
      rec.onstop=function(){var shouldSend=!!rec.__sendOnStop;var mimeType=rec.mimeType||mime||'audio/webm';var chunks=recordingChunks.slice();recordingChunks=[];finishAudioRecording(rec);if(!shouldSend||!chunks.length)return;var blob=new Blob(chunks,{type:mimeType});if(blob.size>5*1024*1024){message('O áudio ficou maior que 5 MB.',true);return;}var reader=new FileReader();reader.onload=function(){sendChatAudioData(String(reader.result));};reader.onerror=function(){message('Não foi possível preparar o áudio.',true);};reader.readAsDataURL(blob);};
      rec.start(250);updateRecordingUi(btn,true);recordingTimer=setInterval(function(){var elapsed=Math.floor((Date.now()-recordingStartedAt)/1000),time=chat.querySelector('.up-chat-recording-time');if(time)time.textContent='0:'+String(Math.min(elapsed,30)).padStart(2,'0');if(elapsed>=30)stopAudioRecording(true);},250);
    }).catch(function(e){message(e.name==='NotAllowedError'?'Permita o uso do microfone para gravar áudio.':'Não foi possível acessar o microfone.',true);});
  }
  function sendChatAudioData(dataUrl){var send=chat.querySelector('.up-chat-send'),record=chat.querySelector('.up-chat-record');if(send)send.disabled=true;if(record)record.disabled=true;var raw=String(dataUrl||'');var match=raw.match(/^data:(audio\\/[^;,]+)(?:;[^,]*)?;base64,/i);if(!match){if(send)send.disabled=false;if(record)record.disabled=false;message('Áudio inválido.',true);return;}api('POST','/api/chat/audio',{dataUrl:raw}).then(function(r){return api('POST','/api/chat',{message:'',imageUrl:r.imageUrl,type:'audio',replyTo:chatReplyTo});}).then(function(){chatReplyTo=null;setChatReply(null);stopTypingHeartbeat();return refreshChatAfterSend(null,send);}).catch(function(e){if(send)send.disabled=false;message(e.message,true);}).finally(function(){if(record)record.disabled=false;});
  }
  function clearChatRicardo(){if(member!=='Ricardo')return;if(!confirm('Limpar todo o chat para a equipe?'))return;api('POST','/api/chat/clear',{}).then(function(){chatCache=[];chatLastRenderKey='';return api('GET','/api/chat');}).then(function(d){chatCache=d.messages||[];if(d.profiles)profileCache=d.profiles;renderChat();}).catch(function(e){message(e.message,true);});}
  function sendChat(){
    var input=chat.querySelector('.up-chat-input'),text=(input.value||'').trim();
    if(!text)return;
    var btn=chat.querySelector('.up-chat-send');btn.disabled=true;
    var tempId='local-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
    var tempReply=chatReplyTo;
    var optimistic={id:tempId,user:member,message:text,type:'text',systemType:'',createdAt:new Date().toISOString(),imageUrl:'',mentions:[],replyTo:tempReply,reactions:{},readBy:[],optimistic:true};
    chatCache.push(optimistic);
    renderChat();
    input.value='';
    chatReplyTo=null;setChatReply(null);
    api('POST','/api/chat',{message:text,replyTo:tempReply}).then(function(r){
      var created=r&&r.message;
      if(created){
        chatCache=chatCache.map(function(m){return m.id===tempId?created:m;});
        renderChat();
      }else{
        chatCache=chatCache.filter(function(m){return m.id!==tempId;});
        loadChat();
      }
    }).catch(function(e){
      chatCache=chatCache.filter(function(m){return m.id!==tempId;});
      renderChat();
      if(input)input.value=text;
      message(e.message||'Não foi possível enviar a mensagem.',true);
    }).finally(function(){if(btn)btn.disabled=false;});
  }
  function fileMimeFromExt(ext){return ({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',mp4:'video/mp4',webm:'video/webm'})[ext]||'';}
  function resolveFileMime(file,allowVideo){
    var type=String(file&&file.type||'').toLowerCase(),ext=String(file&&file.name||'').split('.').pop().toLowerCase();
    var extMime=fileMimeFromExt(ext);
    var typeOk=allowVideo?/^(image\\/(png|jpe?g|webp|gif)|video\\/(mp4|webm))$/i.test(type):/^image\\/(png|jpe?g|webp|gif)$/i.test(type);
    var mime=typeOk?type:extMime;
    var ok=allowVideo?/^(image\\/(png|jpe?g|webp|gif)|video\\/(mp4|webm))$/i.test(mime):/^image\\/(png|jpe?g|webp|gif)$/i.test(mime);
    return {mime:mime,ext:ext,ok:ok};
  }
  function fileToDataUrl(file){return new Promise(function(resolve,reject){if(!file){reject(new Error('Nenhum arquivo selecionado.'));return;}var info=resolveFileMime(file,true);if(!info.ok){reject(new Error('Use PNG, JPG, WEBP, GIF, MP4 ou WEBM.'));return;}var max=/^video\\//i.test(info.mime)?25*1024*1024:5*1024*1024;if(file.size>max){reject(new Error('O arquivo deve ter no máximo '+(max/1024/1024)+' MB.'));return;}var reader=new FileReader();reader.onload=function(){var data=reader.result;if(!(data instanceof ArrayBuffer)){resolve(String(data));return;}var bytes=new Uint8Array(data),bin='';for(var i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));resolve('data:'+info.mime+';base64,'+btoa(bin));};reader.onerror=function(){reject(new Error('Não foi possível ler o arquivo.'));};reader.readAsArrayBuffer(file);});}
  function fileToDataUrlForProfile(file,type,ext){var info=resolveFileMime(file,false),mime=info.ok?info.mime:fileMimeFromExt(ext);if(!/^image\\//i.test(mime)){return Promise.reject(new Error('Use PNG, JPG, WEBP ou GIF.'));}return new Promise(function(resolve,reject){var reader=new FileReader();reader.onload=function(){try{var bytes=new Uint8Array(reader.result),bin='';for(var i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));resolve('data:'+mime+';base64,'+btoa(bin));}catch(e){reject(new Error('Não foi possível preparar a foto.'));}};reader.onerror=function(){reject(new Error('Não foi possível ler a foto.'));};reader.readAsArrayBuffer(file);});}
  function sendChatMedia(file){var btn=chat.querySelector('.up-chat-send'),photoBtn=chat.querySelector('.up-chat-attach');if(btn)btn.disabled=true;if(photoBtn)photoBtn.disabled=true;fileToDataUrl(file).then(function(dataUrl){return api('POST','/api/chat/image',{dataUrl:dataUrl})}).then(function(r){return api('POST','/api/chat',{message:'',imageUrl:r.imageUrl,type:r.type,replyTo:chatReplyTo})}).then(function(){return refreshChatAfterSend(null,btn)}).catch(function(e){if(btn)btn.disabled=false;message(e.message,true)}).finally(function(){if(photoBtn)photoBtn.disabled=false});}

  function openProfileModal(){var file=profileModal.querySelector('.up-chat-profile-file'),preview=profileModal.querySelector('.up-chat-profile-preview'),msg=profileModal.querySelector('.up-chat-profile-message');msg.textContent='';file.value='';hydrateAvatar(preview,member);profileModal.classList.remove('hidden');}
  function closeProfileModal(){profileModal.classList.add('hidden');}
  profileModal.querySelector('.up-chat-profile-cancel').onclick=function(){closeProfileModal();};profileModal.onclick=function(e){if(e.target===profileModal)closeProfileModal();};
  profileModal.querySelector('.up-chat-profile-file').onchange=function(){var f=this.files&&this.files[0],msg=profileModal.querySelector('.up-chat-profile-message');if(!f)return;var type=String(f.type||'').toLowerCase(),ext=String(f.name||'').split('.').pop().toLowerCase();var okType=/^image\\/(png|jpe?g|webp|gif)$/i.test(type)||['png','jpg','jpeg','webp','gif'].indexOf(ext)>=0;if(!okType){msg.textContent='Use PNG, JPG, WEBP ou GIF.';return;}if(f.size>2*1024*1024){msg.textContent='A foto deve ter no máximo 2 MB.';return;}fileToDataUrlForProfile(f,type,ext).then(function(data){profileModal.querySelector('.up-chat-profile-preview').src=data;msg.textContent='';}).catch(function(e){msg.textContent=e.message;});};
  profileModal.querySelector('.up-chat-profile-save').onclick=function(){var file=profileModal.querySelector('.up-chat-profile-file').files&&profileModal.querySelector('.up-chat-profile-file').files[0],msg=profileModal.querySelector('.up-chat-profile-message'),btn=this;if(!file){msg.textContent='Escolha uma foto.';return;}btn.disabled=true;msg.textContent='Salvando…';fileToDataUrl(file).then(function(data){return api('POST','/api/profile/avatar',{dataUrl:data});}).then(function(r){var ck='profile:'+member;if(mediaBlobCache[ck]){try{URL.revokeObjectURL(mediaBlobCache[ck]);}catch(e){}delete mediaBlobCache[ck];}GM_setValue(key+ck,r.avatarUrl);profileCache[member]=r.avatarUrl;hydrateAvatar(profileModal.querySelector('.up-chat-profile-preview'),member);updateBubbleAvatar(false);closeProfileModal();loadChat();}).catch(function(e){msg.textContent=e.message;}).finally(function(){btn.disabled=false;});};

  function healthLed(ok,kind){return '<span class="up-health-led '+(ok?'ok':kind||'bad')+'"></span>';}
  function openHealth(){
    if(member!=='Ricardo')return;
    card.classList.add('hidden');
    history.classList.add('hidden');
    chat.classList.add('hidden');
    health.innerHTML='<div class="up-health-head"><div><div class="up-health-title">Saúde do sistema</div><div class="up-health-sub">Visão administrativa • Ricardo</div></div><button type="button" class="up-health-close">Fechar</button></div><div class="up-health-list"><div class="up-health-row"><div class="up-health-left">'+healthLed(true)+'<span class="up-health-name">Verificando o sistema</span></div><span class="up-health-detail">Aguarde…</span></div></div><div class="up-health-footer">Verde: funcionando. Amarelo: reconectando. Vermelho: precisa de atenção.</div><button type="button" class="up-health-refresh">Atualizar agora</button>';
    health.classList.remove('hidden');
    health.querySelector('.up-health-close').onclick=function(){health.classList.add('hidden');card.classList.remove('hidden');};
    health.querySelector('.up-health-refresh').onclick=function(){loadHealth();};
    loadHealth();
  }
  function loadHealth(){
    if(member!=='Ricardo'||health.classList.contains('hidden'))return;
    var list=health.querySelector('.up-health-list');
    if(!list)return;
    list.innerHTML='<div class="up-health-row"><div class="up-health-left">'+healthLed(true)+'<span class="up-health-name">Consultando diagnóstico</span></div><span class="up-health-detail">Aguarde…</span></div>';
    var started=Date.now();
    api('GET','/api/health').then(function(d){
      var apiMs=Date.now()-started;
      var db=d&&d.db||{};
      var chatCheck=d&&d.chat||{};
      var state=d&&d.state||{};
      var users=d&&d.members||[];
      var rt=realtimeActive;
      var rows=[
        {name:'Sistema UpStatus',ok:!!(d&&d.ok),detail:(d&&d.version?'Funcionando • '+apiMs+' ms':'Indisponível')},
        {name:'Banco de dados',ok:!!db.ok,detail:db.ok?('Respondendo • '+db.ms+' ms'):'Sem resposta'},
        {name:'Chat da equipe',ok:!!chatCheck.ok,detail:chatCheck.ok?('Pronto • '+chatCheck.ms+' ms'):'Com erro'},
        {name:'Alertas e comandos',ok:!!state.ok,detail:state.ok?'Funcionando':'Com erro'},
        {name:'Atualização em tempo real',ok:rt,kind:rt?'':'warn',detail:rt?'Ativa':'Reconectando'},
        {name:'Sua versão',ok:true,detail:'v'+CURRENT_VERSION}
      ];
      list.innerHTML=rows.map(function(r){return '<div class="up-health-row"><div class="up-health-left">'+healthLed(r.ok,r.kind)+'<span class="up-health-name">'+r.name+'</span></div><span class="up-health-detail">'+r.detail+'</span></div>';}).join('')+
        '<div class="up-health-members"><div class="up-health-sub">Equipe conectada</div>'+users.map(function(m){var connected=m.connected!==false;var ver=m.version?'v'+esc(m.version):'v?';return '<div class="up-health-member"><b>'+esc(m.name)+'</b><span>'+ver+' • '+(connected?'conectado':'desconectado')+'</span></div>';}).join('')+'</div>';
    }).catch(function(e){
      list.innerHTML='<div class="up-health-row"><div class="up-health-left">'+healthLed(false)+'<span class="up-health-name">Diagnóstico indisponível</span></div><span class="up-health-detail">'+esc(e.message||'Erro')+'</span></div>';
    });
  }

  function login(){
    health.classList.add('hidden');
    img.src=profileFallback();
    card.innerHTML='<div class="up-title">UpStatus</div><div class="up-you">Entre para controlar o seu status.</div><div class="up-login"><label>Servidor</label><input class="up-input" id="up-server"><label>Seu nome</label><select class="up-select" id="up-name"></select><label>Senha</label><input class="up-input" id="up-password" type="password" placeholder="Sua senha"><button id="up-enter">Entrar</button></div><div class="up-update up-login-update">Versão v'+CURRENT_VERSION+' <button type="button" class="up-update-check">Verificar atualização</button><button type="button" class="up-update-now">Atualizar</button><span class="up-update-status"></span></div><div class="up-message"></div>';
    card.querySelector('#up-server').value=server;
    var nameSelect=card.querySelector('#up-name');
    nameSelect.innerHTML='<option>Ricardo</option><option>Lohan</option><option>Guilherme</option>';
    if(member)nameSelect.value=member;
    api('GET','/api/members').then(function(r){
      var names=(r.members||[]).map(function(x){return '<option>'+esc(x.name)+'</option>'}).join('');
      if(names)nameSelect.innerHTML=names;
      if(member)nameSelect.value=member;
    }).catch(function(){});
    card.querySelector('#up-enter').onclick=async function(){
      try{
        server=card.querySelector('#up-server').value.trim().replace(/\\/$/,'');
        var name=card.querySelector('#up-name').value;
        var password=card.querySelector('#up-password').value;
        var account=await api('GET','/api/account?name='+encodeURIComponent(name));
        var r=await api('POST',account.needsSetup?'/api/setup':'/api/login',{name:name,password:password});
        token=r.token;member=r.name;role=r.role||'implementation_user';
        GM_setValue(key+'server',server);GM_setValue(key+'token',token);GM_setValue(key+'member',member);GM_setValue(key+'role',role);
        img.src=profileFallback();app();refresh();startRealtime();updateBubbleAvatar(true);
      }catch(e){message(e.message,true)}
    };
    card.querySelector('#up-password').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();card.querySelector('#up-enter').click();}});
    card.querySelector('.up-update-check').onclick=checkUpdate;
    checkUpdate();
  }

  var theme=GM_getValue(key+'theme','dark')==='light'?'light':'dark';
  function applyTheme(){
    root.classList.toggle('up-theme-light',theme==='light');
    var btn=card.querySelector('.up-settings-theme');
    if(btn){var nextTheme=theme==='dark'?'claro':'escuro';btn.innerHTML=iconSvg(theme==='dark'?'sun':'moon')+'<span>Modo '+nextTheme+'</span>';btn.title='Mudar para modo '+nextTheme;btn.setAttribute('aria-label',btn.title);}
  }
  function toggleTheme(){
    theme=theme==='dark'?'light':'dark';
    GM_setValue(key+'theme',theme);
    applyTheme();
  }

  function app(){
    api('GET','/api/members').then(function(r){window.__upstatusMembers=(r.members||[]).map(function(x){return x.name});}).catch(function(){});
    card.innerHTML='<div class="up-head"><div class="up-head-identity"><div class="up-head-avatar"><img class="up-head-avatar-img" alt=""></div><div><div class="up-title">UpStatus</div><div class="up-you">Conectado como '+esc(member)+'</div></div></div><div class="up-actions"><button class="up-chat-btn" title="Chat da equipe" aria-label="Chat da equipe">'+iconSvg('chat')+'</button><button class="up-history-btn hidden" title="Ver histórico" aria-label="Ver histórico">'+iconSvg('clock')+'</button><button class="up-settings-btn" title="Configurações" aria-label="Configurações">'+iconSvg('gear')+'</button><div class="up-settings-menu hidden"><button type="button" class="up-settings-notifications"></button><button type="button" class="up-settings-theme"></button>'+(member==='Ricardo'?'<button type="button" class="up-settings-health">'+iconSvg('pulse')+'<span>Saúde do sistema</span></button>':'')+'</div><button class="up-logout">Sair</button></div></div><div class="up-statuses"><button class="up-status online">'+iconSvg('online')+' Online</button><button class="up-status busy">'+iconSvg('busy')+' Ocupado</button><button class="up-status away">'+iconSvg('away')+' Ausente</button></div><div class="up-reasons hidden"><label class="up-label">Motivo de ocupado</label><div class="up-reason-picker"><button type="button" class="up-reason-trigger"><span class="up-reason-trigger-icon">'+iconSvg('edit')+'</span><span class="up-reason-trigger-text">Selecione um motivo</span></button><div class="up-reason-menu hidden">'+reasons.map(function(x){return '<button type="button" class="up-reason-option" data-value="'+esc(x.value)+'">'+iconSvg(x.icon)+'<span class="up-reason-text">'+esc(x.label)+'</span></button>'}).join('')+'</div></div><select class="up-select hidden"></select><input class="up-input hidden" placeholder="Escreva o motivo"><button class="up-confirm hidden">Confirmar ocupado</button></div><div class="up-message"></div><div class="up-notice">'+iconSvg('pulse')+'<span>Sincronização com o Sale Smartly ativa.</span><span class="up-notice-ok">✓</span></div><div class="up-team-title-row"><div class="up-team-title">Equipe</div><span class="up-team-count"></span></div><div class="up-team">Carregando…</div>';
    history.innerHTML='<div class="up-history-head"><div class="up-history-title">Histórico</div><div class="up-actions"><button class="up-export" title="Exportar histórico">'+iconSvg('download')+' TXT</button><button class="up-close">Fechar</button></div></div><div class="up-history-list">Carregando…</div>';

    var box=card.querySelector('.up-reasons'),select=box.querySelector('select'),custom=box.querySelector('input'),confirm=box.querySelector('button.up-confirm'),trigger=box.querySelector('.up-reason-trigger'),menu=box.querySelector('.up-reason-menu');
    var historyBtn=card.querySelector('.up-history-btn');
    var settingsBtn=card.querySelector('.up-settings-btn'),settingsMenu=card.querySelector('.up-settings-menu');
    var headAvatar=card.querySelector('.up-head-avatar-img');if(headAvatar)hydrateAvatar(headAvatar,member);
    if(role==='implementation_admin'){
      historyBtn.classList.remove('hidden');
      historyBtn.onclick=function(e){e.stopPropagation();openHistory()};
    }

    card.querySelector('.online').onclick=function(){save('online','')};
    card.querySelector('.away').onclick=function(){save('away','Ausente')};
    card.querySelector('.busy').onclick=function(){box.classList.remove('hidden');menu.classList.remove('hidden');message('Escolha o motivo de ocupado.',true)};
    trigger.onclick=function(){menu.classList.toggle('hidden')};
    box.querySelectorAll('.up-reason-option').forEach(function(opt){opt.onclick=function(){var value=opt.getAttribute('data-value');var r=reasons.find(function(x){return x.value===value});trigger.innerHTML=iconSvg(r?r.icon:'edit')+'<span class="up-reason-trigger-text">'+esc(r?r.label:value)+'</span>';menu.classList.add('hidden');custom.classList.toggle('hidden',value!=='Outro');confirm.classList.toggle('hidden',value!=='Outro');if(value&&value!=='Outro')save('busy',value);else if(value==='Outro')custom.focus();}});
    confirm.onclick=function(){save('busy',custom.value)};
    document.addEventListener('click',function(e){if(box&&!box.contains(e.target))menu.classList.add('hidden')});
    card.querySelector('.up-logout').onclick=function(){broadcastChatPresence(false);stopRealtime();token='';member='';role='implementation_user';GM_setValue(key+'token','');GM_setValue(key+'member','');GM_setValue(key+'role','');history.classList.add('hidden');health.classList.add('hidden');img.src=profileFallback();login()};
    history.querySelector('.up-close').onclick=function(){history.classList.add('hidden')};
    history.querySelector('.up-export').onclick=function(){exportHistoryTxt()};
    if(settingsBtn)settingsBtn.onclick=function(e){e.stopPropagation();settingsMenu.classList.toggle('hidden');};
    if(settingsMenu){settingsMenu.onclick=function(e){e.stopPropagation();};var settingsHealth=settingsMenu.querySelector('.up-settings-health');if(settingsHealth)settingsHealth.onclick=function(){settingsMenu.classList.add('hidden');openHealth();};settingsMenu.querySelector('.up-settings-notifications').onclick=function(){toggleNotifications();};settingsMenu.querySelector('.up-settings-theme').onclick=function(){toggleTheme();};document.addEventListener('click',function(e){if(!settingsMenu.contains(e.target)&&e.target!==settingsBtn)settingsMenu.classList.add('hidden');});}
    card.querySelector('.up-chat-btn').onclick=function(e){e.stopPropagation();openChat()};
    quickChatBubble.onclick=function(e){e.stopPropagation();openChat()};
    updateNotificationPermissionUI();
    applyTheme();
    updateOutgoingBaruiUI();
    card.insertAdjacentHTML('beforeend','<div class="up-update"><div class="up-update-version">'+iconSvg('update')+'<div><b>Versão v'+CURRENT_VERSION+'</b><span class="up-update-status"></span></div></div><div class="up-update-actions"><button type="button" class="up-update-check">Verificar atualização</button><button type="button" class="up-update-now">Atualizar</button></div></div>');
    card.querySelector('.up-update-check').onclick=checkUpdate;
    checkUpdate();
  }


  var remotePending={};
  function closeRemoteControl(){remoteOverlay.classList.add('hidden');remoteOverlay.onclick=null;remoteOverlay.innerHTML='';}
  function openRemoteControl(target){
    if(role!=='implementation_admin'||!target||target===member)return;
    var dStatus=card.querySelector('.up-member-power[data-target="'+CSS.escape(target)+'"]');
    if(dStatus)dStatus.disabled=true;
    var current=(window.__upstatusTeam||{})[target]||{};
    var selected=current.status==='busy'?'busy':current.status==='away'?'away':'online';
    var selectedReason=current.reason||'';
    remoteOverlay.innerHTML='<div class="up-remote-dialog"><div class="up-remote-title">Controlar fila de '+esc(target)+'</div><div class="up-remote-sub">A alteração será executada pela sessão do próprio usuário.</div><div class="up-remote-statuses"><button type="button" class="up-remote-status '+(selected==='online'?'active':'')+'" data-status="online">Online</button><button type="button" class="up-remote-status '+(selected==='busy'?'active':'')+'" data-status="busy">Ocupado</button><button type="button" class="up-remote-status '+(selected==='away'?'active':'')+'" data-status="away">Ausente</button></div><div class="up-remote-reason '+(selected==='busy'?'':'hidden')+'"><div class="up-label">Motivo de ocupado</div><div class="up-remote-reason-menu">'+reasons.map(function(r){return '<button type="button" class="up-remote-reason-option '+(selectedReason===r.value?'active':'')+'" data-reason="'+esc(r.value)+'">'+iconSvg(r.icon)+'<span class="up-reason-text">'+esc(r.label)+'</span></button>';}).join('')+'</div></div><div class="up-remote-message"></div><div class="up-remote-actions"><button type="button" class="up-remote-cancel">Cancelar</button><button type="button" class="up-remote-confirm">Aplicar</button></div></div>';
    remoteOverlay.classList.remove('hidden');
    remoteOverlay.onclick=function(e){if(e.target===remoteOverlay)closeRemoteControl();};
    var dialog=remoteOverlay.querySelector('.up-remote-dialog'), reasonBox=remoteOverlay.querySelector('.up-remote-reason'), msg=remoteOverlay.querySelector('.up-remote-message');
    dialog.querySelectorAll('.up-remote-status').forEach(function(btn){btn.onclick=function(){selected=btn.getAttribute('data-status');dialog.querySelectorAll('.up-remote-status').forEach(function(x){x.classList.toggle('active',x===btn)});reasonBox.classList.toggle('hidden',selected!=='busy');if(selected!=='busy')selectedReason='';};});
    dialog.querySelectorAll('.up-remote-reason-option').forEach(function(btn){btn.onclick=function(){selectedReason=btn.getAttribute('data-reason')||'';dialog.querySelectorAll('.up-remote-reason-option').forEach(function(x){x.classList.toggle('active',x===btn)});};});
    dialog.querySelector('.up-remote-cancel').onclick=closeRemoteControl;
    dialog.querySelector('.up-remote-confirm').onclick=function(){
      if(selected==='busy'&&!selectedReason){msg.textContent='Escolha o motivo de ocupado.';return;}
      var confirm=dialog.querySelector('.up-remote-confirm');confirm.disabled=true;msg.textContent='Enviando comando…';
      api('POST','/api/remote-status',{target:target,status:selected,reason:selected==='busy'?selectedReason:selected==='away'?'Ausente':''}).then(function(r){
        if(!r.commandId)throw new Error('O servidor não confirmou o comando.');
        msg.textContent='Aguardando '+target+' executar…';
        waitRemoteResult(r.commandId,target,msg,confirm);
      }).catch(function(e){msg.textContent=e.message||'Não foi possível enviar o comando.';confirm.disabled=false;});
    };
    if(dStatus)dStatus.disabled=false;
  }
  function applyRemoteResult(commandId,target,msg,confirm,result){
    if(result&&result.ok){
      msg.style.color='#9ce5b8';msg.textContent='Fila de '+target+' atualizada com sucesso.';
      delete remoteResultCache[commandId];
      setTimeout(function(){closeRemoteControl();refresh();},700);
    }else{
      msg.style.color='#ff9aaa';msg.textContent='Falha: '+((result&&result.error)||'não foi possível alterar a fila.');
      if(confirm)confirm.disabled=false;
      delete remoteResultCache[commandId];
    }
  }
  function waitRemoteResult(commandId,target,msg,confirm,started){
    var t=started||Date.now(),id=String(commandId);
    var cached=remoteResultCache[id];
    if(cached){applyRemoteResult(id,target,msg,confirm,cached);return;}
    var settled=false;
    function finish(result){
      if(settled)return;
      settled=true;
      if(remoteResultWaiters[id]===finish)delete remoteResultWaiters[id];
      applyRemoteResult(id,target,msg,confirm,result);
    }
    remoteResultWaiters[id]=finish;
    function poll(){
      if(settled)return;
      api('GET','/api/remote-status/result?id='+encodeURIComponent(id)).then(function(d){
        if(d&&d.ready&&d.result){finish(d.result);return;}
        if(Date.now()-t>=25000){
          if(remoteResultWaiters[id]===finish)delete remoteResultWaiters[id];
          settled=true;
          msg.style.color='#ff9aaa';msg.textContent='Tempo esgotado. '+target+' não confirmou a alteração.';if(confirm)confirm.disabled=false;
          return;
        }
        setTimeout(poll,700);
      }).catch(function(){
        if(Date.now()-t>=25000){
          if(remoteResultWaiters[id]===finish)delete remoteResultWaiters[id];
          settled=true;
          msg.style.color='#ff9aaa';msg.textContent='Tempo esgotado. Não foi possível confirmar a alteração.';if(confirm)confirm.disabled=false;
          return;
        }
        setTimeout(poll,700);
      });
    }
    poll();
  }
  function executeRemoteCommand(c){
    if(!c||!c.id||c.target!==member||remotePending[c.id])return;
    remotePending[c.id]=true;
    (async function(){
      var ok=false,error='';
      try{
        await syncSaleSmartly(c.status);
        await api('POST','/api/status',{status:c.status,reason:c.reason||'',actor:c.sender||'',target:member});
        ok=true;
        if(location.hostname==='app.salesmartly.com')setTimeout(function(){location.reload()},250);
      }catch(e){error=e.message||'Falha ao sincronizar o Sale Smartly.';}
      try{await api('POST','/api/remote-status/result',{commandId:c.id,ok:ok,error:error});}catch(_){ }
      delete remotePending[c.id];
      if(!ok)message('Comando remoto de '+c.sender+' falhou: '+error,true);else refresh();
    })();
  }

  function pollRemoteStatus(){
    if(!token||remotePolling)return;
    remotePolling=true;
    api('GET','/api/remote-status').then(function(d){
      if(!d.pending||!d.command)return;
      executeRemoteCommand(d.command);
    }).catch(function(){}).finally(function(){remotePolling=false});
  }
  function refresh(){
    if(!token||!member||refreshing)return;
    refreshing=true;
    api('GET','/api/status').then(function(d){
      var team=card.querySelector('.up-team');if(!team)return;
      window.__upstatusTeam=d.members||{};
      var memberNames=Object.keys(d.members);
      var teamCount=card.querySelector('.up-team-count');if(teamCount)teamCount.textContent=memberNames.length+' '+(memberNames.length===1?'membro':'membros');
      team.innerHTML=memberNames.map(function(k){
        var m=d.members[k];
        if(m.name===member)currentStatus=m.status;
        var controls=(role==='implementation_admin'&&m.name!==member)
          ? '<button type="button" class="up-member-barui" data-target="'+esc(m.name)+'" title="Enviar BARUI para '+esc(m.name)+'" aria-label="Enviar BARUI para '+esc(m.name)+'">'+iconSvg('sound')+'</button><button type="button" class="up-member-power" data-target="'+esc(m.name)+'" title="Controlar fila de '+esc(m.name)+'" aria-label="Controlar fila de '+esc(m.name)+'">'+iconSvg('power')+'</button>'
          : '';
        var version=m.version?'<span class="up-member-version">v'+esc(m.version)+'</span>':'<span class="up-member-version">v?</span>';
        var sub=[];
        if(m.reason)sub.push(reasonIcon(m.reason)+' '+esc(reasonLabel(m.reason)));
        if(m.updatedAt)sub.push('Desde '+fmtTime(m.updatedAt));
        return '<div class="up-member"><div class="up-member-main"><img class="up-member-avatar status-'+esc(m.status||'offline')+'" data-member-avatar="'+esc(m.name)+'" alt=""><div class="up-member-info"><div class="up-member-top"><b>'+esc(m.name)+'</b>'+version+'</div><div class="up-member-sub">'+(sub.length?sub.join(' <span class="up-member-separator">•</span> '):'Sem atualização registrada')+'</div></div></div><div class="up-member-actions">'+controls+'<span class="up-badge b-'+m.status+'">'+labels[m.status]+'</span></div></div>';
      }).join('');
      team.querySelectorAll('.up-member-avatar').forEach(function(a){hydrateAvatar(a,a.getAttribute('data-member-avatar')||'');});
      team.querySelectorAll('.up-member-barui').forEach(function(btn){btn.onclick=function(e){e.preventDefault();e.stopPropagation();toggleBarui(btn.getAttribute('data-target'));};});
      team.querySelectorAll('.up-member-power').forEach(function(btn){btn.onclick=function(e){e.preventDefault();e.stopPropagation();openRemoteControl(btn.getAttribute('data-target'));};});
      updateOutgoingBaruiUI();
      setBubbleStatus(currentStatus);
    }).catch(function(e){message(e.message,true)}).finally(function(){refreshing=false});
    loadChat();
  }

  function openHistory(){
    if(role!=='implementation_admin')return;
    health.classList.add('hidden');
    history.classList.remove('hidden');
    history.querySelector('.up-history-list').textContent='Carregando…';
    api('GET','/api/history?limit=200').then(function(d){
      historyCache=d.history||[];
      if(!historyCache.length){
        history.querySelector('.up-history-list').innerHTML='<div class="up-history-empty">Nenhuma movimentação registrada ainda.</div>';
        return;
      }
      var lastDay='';
      history.querySelector('.up-history-list').innerHTML=historyCache.map(function(item){
        var day=fmtDay(item.createdAt),header='';
        if(day!==lastDay){header='<div class="up-history-day">'+day+'</div>';lastDay=day}
        var who=(item.actor&&item.target&&item.actor!==item.target)?'<b>'+esc(item.actor)+'</b><span>→</span><b>'+esc(item.target)+'</b>':'<b>'+esc(item.user||item.target||item.actor||'')+'</b>';return header+'<div class="up-history-item"><div class="up-history-meta"><span>'+fmtTime(item.createdAt)+'</span>'+who+'<span>'+statusIcon(item.status)+' '+labels[item.status]+'</span></div>'+
          (item.reason?'<div class="up-history-reason">'+reasonIcon(item.reason)+' '+esc(reasonLabel(item.reason))+'</div>':'')+'</div>';
      }).join('');
    }).catch(function(e){historyCache=[];history.querySelector('.up-history-list').textContent=e.message});
  }

  function exportHistoryTxt(){
    if(role!=='implementation_admin'||!historyCache.length){
      message('Abra o histórico e carregue as movimentações antes de exportar.',true);
      return;
    }
    var lines=['UPSTATUS - HISTÓRICO DE MOVIMENTAÇÕES','Exportado em: '+new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'medium'}).format(new Date()),''];
    var lastDay='';
    historyCache.forEach(function(item){
      var day=fmtDay(item.createdAt);
      if(day!==lastDay){lines.push('=== '+day+' ===');lastDay=day}
      var actor=item.actor||item.user||'';var target=item.target||item.user||'';var line=fmtTime(item.createdAt)+' | '+(actor!==target?actor+' -> '+target:target)+' | '+labels[item.status];
      if(item.reason)line+=' | Motivo: '+reasonLabel(item.reason);
      lines.push(line);
    });
    var blob=new Blob([lines.join('\\r\\n')+'\\r\\n'],{type:'text/plain;charset=utf-8'});
    var url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;
    a.download='UpStatus-Historico-'+new Date().toISOString().slice(0,10)+'.txt';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(url)},1000);
  }

  function isTransientSaleStatusError(err){
    var t=String(err&&err.message||err||'').toLowerCase();
    return t.indexOf('switching status')>=0 || t.indexOf('please try later')>=0 || t.indexOf('请稍后再试')>=0 || t.indexOf('正在切换状态')>=0 || t.indexOf('用户正在切换状态')>=0;
  }

  function syncSaleSmartlyOnce(status,timeoutMs){
    var map={online:'1',busy:'2',away:'0'};
    return new Promise(function(resolve,reject){
      var settled=false;
      function done(e){
        if(settled)return;
        settled=true;
        document.removeEventListener('UPSTATUS_RESULT',done);
        clearTimeout(timer);
        var d=e.detail||{};
        if(d.ok)resolve();else reject(new Error(d.error||'Não foi possível sincronizar o Sale Smartly.'));
      }
      document.addEventListener('UPSTATUS_RESULT',done);
      document.dispatchEvent(new CustomEvent('UPSTATUS_SET',{detail:{status:map[status]}}));
      var timer=setTimeout(function(){
        if(settled)return;
        settled=true;
        document.removeEventListener('UPSTATUS_RESULT',done);
        reject(new Error('Tempo esgotado ao sincronizar com o Sale Smartly.'));
      },timeoutMs||3500);
    });
  }

  async function syncSaleSmartly(status){
    var lastError=null;
    var delays=[0,700,1400,2200];
    for(var attempt=0;attempt<delays.length;attempt++){
      if(delays[attempt])await new Promise(function(resolve){setTimeout(resolve,delays[attempt])});
      try{
        await syncSaleSmartlyOnce(status,3500);
        return;
      }catch(e){
        lastError=e;
        if(!isTransientSaleStatusError(e) || attempt===delays.length-1)throw e;
      }
    }
    throw lastError||new Error('Não foi possível sincronizar o Sale Smartly.');
  }

  async function save(status,why){
    try{
      if(status==='busy'&&!why.trim())throw new Error('Escreva o motivo.');
      message('Sincronizando com Sale Smartly…');
      await syncSaleSmartly(status);
      await api('POST','/api/status',{status:status,reason:why});
      message('Status atualizado.');
      card.querySelector('.up-reasons').classList.add('hidden');
      refresh();
      if(location.hostname==='app.salesmartly.com')setTimeout(function(){location.reload()},250);
    }catch(e){message(e.message,true)}
  }

  var drag=null;
  document.addEventListener('pointerdown',function(e){
    if(!root.contains(e.target)){
      card.classList.add('hidden');
      history.classList.add('hidden');
      chat.classList.add('hidden');
      health.classList.add('hidden');
    }
  },true);
  bubble.addEventListener('pointerdown',function(e){
    if(e.button!==undefined&&e.button!==0)return;
    var r=root.getBoundingClientRect();
    drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,startRight:window.innerWidth-r.right,startBottom:window.innerHeight-r.bottom,moved:false};
    bubble.setPointerCapture(e.pointerId);e.preventDefault();
  });
  bubble.addEventListener('pointermove',function(e){
    if(!drag||e.pointerId!==drag.id)return;
    var dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
    if(Math.abs(dx)>4||Math.abs(dy)>4)drag.moved=true;
    root.style.right=Math.max(0,Math.min(window.innerWidth-42,drag.startRight-dx))+'px';
    root.style.bottom=Math.max(0,Math.min(window.innerHeight-42,drag.startBottom-dy))+'px';
    e.preventDefault();
  });
  bubble.addEventListener('pointerup',function(e){
    if(!drag||e.pointerId!==drag.id)return;
    var moved=drag.moved;try{bubble.releasePointerCapture(e.pointerId)}catch(_){}
    drag=null;GM_setValue(key+'right',root.style.right);GM_setValue(key+'bottom',root.style.bottom);
    if(!moved){health.classList.add('hidden');if(!history.classList.contains('hidden'))history.classList.add('hidden');if(!chat.classList.contains('hidden')){chat.classList.add('hidden');broadcastChatPresence(false);}card.classList.toggle('hidden')}
  });
  bubble.addEventListener('pointercancel',function(){drag=null});

  if(token&&member){
    api('GET','/api/me').then(function(r){
      if(r.authenticated){role=r.role||role;GM_setValue(key+'role',role);app();refresh();startRealtime();updateBubbleAvatar(true)}
      else login();
    }).catch(login);
  }else login();

  setInterval(refresh,5000);
  setInterval(function(){if(member){broadcastChatPresence(!chat.classList.contains('hidden'));Object.keys(chatPresence).forEach(function(name){if(chatPresence[name]&&chatPresence[name]<Date.now())delete chatPresence[name];});if(!chat.classList.contains('hidden'))renderChat();}},10000);
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeChatLightbox();});
  setInterval(function(){loadChat();},1000);
  setInterval(pollChatTyping,1000);
  setInterval(pollBarui,1000);
  setInterval(pollRemoteStatus,1000);
  setInterval(checkUpdate,60000);
})();
`;
function userscriptText(){ return USERSCRIPT_RAW; }
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-upstatus-token, authorization, apikey",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Cache-Control": "no-store"
};

function response(body:unknown,status=200,extra:Record<string,string>={}) {
  return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8",...CORS,...extra}});
}
async function readBody(req:Request) {
  const raw=await req.text();
  if(!raw)return {};
  try{return JSON.parse(raw)}catch{throw new Error("Pedido inválido.")}
}
function token(req:Request){return req.headers.get("x-upstatus-token")||""}
function tokenHash(t:string){return createHash("sha256").update(t).digest("hex")}
function passwordHash(password:string,salt=randomBytes(16).toString("hex")){
  return salt+":"+Buffer.from(scryptSync(password,salt,64)).toString("hex");
}
function checkPassword(password:string,saved:string){
  try{
    const parts=String(saved||"").split(":");
    if(parts.length!==2)return false;
    const actual=scryptSync(password,parts[0],64);
    const old=Buffer.from(parts[1],"hex");
    return actual.length===old.length && timingSafeEqual(actual,old);
  }catch{return false}
}
async function userFromToken(req:Request){
  const t=token(req);
  if(!t)return null;
  const now=Date.now();
  const cached=sessionCache.get(t);
  if(cached){
    if(cached.expiresAt<=now){sessionCache.delete(t);return null;}
    if(now-cached.checkedAt<30000)return cached.name;
  }
  const {data}=await db.from("upstatus_sessions").select("user_name,expires_at").eq("token_hash",tokenHash(t)).maybeSingle();
  if(!data)return null;
  if(Date.parse(data.expires_at)<=Date.now()){
    await db.from("upstatus_sessions").delete().eq("token_hash",tokenHash(t));
    return null;
  }
  const name=String(data.user_name);
  sessionCache.set(t,{name,expiresAt:Date.parse(data.expires_at),checkedAt:now});
  return name;
}
async function account(name:string){
  const {data,error}=await db.from("users").select("name,password_hash,role,status,reason,updated_at,sync").eq("name",name).maybeSingle();
  if(error)throw error;
  return data;
}
async function admin(name:string|null){
  if(!name)return false;
  const a=await account(name);
  return a?.role==="implementation_admin";
}
async function createSession(name:string,knownAccount?:any){
  const raw=randomBytes(32).toString("hex");
  await db.from("upstatus_sessions").delete().lt("expires_at",new Date().toISOString());
  const {error}=await db.from("upstatus_sessions").insert({
    token_hash:tokenHash(raw),
    user_name:name,
    expires_at:new Date(Date.now()+30*86400000).toISOString()
  });
  if(error)throw error;
  const a=knownAccount||await account(name);
  sessionCache.set(raw,{name,expiresAt:Date.now()+30*86400000,checkedAt:Date.now()});
  return response({name,role:a?.role||"implementation_user",canViewHistory:a?.role==="implementation_admin",token:raw});
}
async function login(req:Request,setup:boolean){
  const p:any=await readBody(req);
  const name=String(p.name||"");
  const password=String(p.password||"");
  if(!name||password.length<6)return response({error:"Use um usuário válido e uma senha de pelo menos 6 caracteres."},400);
  const a=await account(name);
  if(!a)return response({error:"Use um usuário válido e uma senha de pelo menos 6 caracteres."},400);
  if(setup){
    if(a.password_hash)return response({error:"Esta conta já foi configurada."},409);
    const role=a.role||(["Ricardo","Lohan","Guilherme"].includes(name)?"implementation_admin":"implementation_user");
    const {error}=await db.from("users").update({password_hash:passwordHash(password),role}).eq("name",name);
    if(error)throw error;
    return createSession(name,{...a,password_hash:undefined,role});
  }
  if(!a.password_hash||!checkPassword(password,String(a.password_hash)))return response({error:"Nome ou senha incorretos."},401);
  return createSession(name,a);
}
async function members(){
  const now=Date.now();
  if(membersCache&&now-membersCache.at<10000)return membersCache.data;
  const {data,error}=await db.from("users").select("name").order("name");
  if(error)throw error;
  const out=(data||[]).map((x:any)=>({name:String(x.name)}));
  membersCache={at:now,data:out};
  return out;
}
async function healthRoute(req:Request,name:string){
  if(req.method!=="GET")return response({error:"Método não permitido."},405);
  if(name!=="Ricardo")return response({error:"Somente Ricardo pode consultar a saúde do sistema."},403);
  const started=Date.now();
  const dbStarted=Date.now();
  const usersQ=await db.from("users").select("name,status,reason,client_version,client_seen_at").order("name");
  const dbOk=!usersQ.error;
  const dbMs=Date.now()-dbStarted;

  const chatStarted=Date.now();
  const chatQ=await db.from("messages").select("id").limit(1);
  const chatOk=!chatQ.error;
  const chatMs=Date.now()-chatStarted;

  const stateStarted=Date.now();
  const stateQ=await db.from("upstatus_state").select("state_key").in("state_key",["barui","remote-status"]);
  const stateOk=!stateQ.error;
  const stateMs=Date.now()-stateStarted;

  const nowMs=Date.now();
  const members=(usersQ.data||[]).map((x:any)=>({
    name:String(x.name),
    status:x.status||"offline",
    version:x.client_version||"",
    connected:!!x.client_seen_at&&(nowMs-Date.parse(x.client_seen_at)<15000)
  }));

  return response({
    ok:dbOk&&chatOk&&stateOk,
    service:"UpStatus",
    version:VERSION,
    checkedAt:new Date().toISOString(),
    elapsedMs:Date.now()-started,
    db:{ok:dbOk,ms:dbMs,error:usersQ.error?.message||""},
    chat:{ok:chatOk,ms:chatMs,error:chatQ.error?.message||""},
    state:{ok:stateOk,ms:stateMs,error:stateQ.error?.message||""},
    members
  });
}
async function statusRoute(req:Request,name:string){
  if(req.method==="GET"){
    const now=new Date().toISOString();
    await db.from("users").update({client_seen_at:now,client_version:VERSION}).eq("name",name);
    const {data,error}=await db.from("users").select("name,status,reason,updated_at,sync,client_version,client_seen_at").order("name");
    if(error)throw error;
    const members:Record<string,unknown>={};
    const nowMs=Date.now();
    for(const x of data||[]){
      const seen=x.client_seen_at?Date.parse(x.client_seen_at):0;
      members[x.name]={
        name:x.name,
        status:x.status||"offline",
        reason:x.reason||"",
        updatedAt:x.updated_at||null,
        sync:x.sync||"not_configured",
        version:x.client_version||"",
        connected:!!seen&&nowMs-seen<15000
      };
    }
    return response({members});
  }
  const p:any=await readBody(req);
  const status=String(p.status||"");
  const reason=status==="online"?"":String(p.reason||"").trim();
  if(!["online","busy","away"].includes(status))return response({error:"Status inválido."},400);
  if(status!=="online"&&!reason)return response({error:"Informe um motivo."},400);
  const old=await account(name);
  if(!old)return response({error:"Usuário não encontrado."},404);
  const changed=(old.status||"offline")!==status||(old.reason||"")!==reason;
  const now=new Date().toISOString();
  if(changed){
    const {error}=await db.from("users").update({status,reason,updated_at:now}).eq("name",name);
    if(error)throw error;
    const requestedActor=String(p.actor||name);
    const requestedTarget=String(p.target||name);
    const actor=requestedActor===name||((await admin(name))&&requestedTarget===name)?requestedActor:name;
    await db.from("status_history").insert({user_name:name,actor,target:name,status,reason,created_at:now});
  }
  await db.from("users").update({client_seen_at:now,client_version:VERSION}).eq("name",name);
  return response({name,status,reason,updatedAt:now,sync:old.sync||"not_configured",version:VERSION});
}

async function historyRoute(req:Request,name:string){
  if(!(await admin(name)))return response({error:"Seu perfil não possui acesso ao histórico."},403);
  const limit=Math.min(Math.max(Number(new URL(req.url).searchParams.get("limit")||100),1),500);
  const {data,error}=await db.from("status_history").select("user_name,actor,target,status,reason,created_at").order("created_at",{ascending:false}).limit(limit);
  if(error)throw error;
  return response({history:(data||[]).map((x:any)=>({user:x.user_name,actor:x.actor,target:x.target,status:x.status,reason:x.reason||"",createdAt:x.created_at}))});
}
async function mentions(text:string){
  const names=(await members()).map(x=>x.name);
  const found:string[]=[];
  for(const m of String(text).matchAll(/@([\p{L}\p{N}_-]+)/gu)){
    const raw=m[1].toLowerCase();
    if(raw==="todos"){for(const n of names)if(!found.includes(n))found.push(n);continue}
    const hit=names.find(n=>n.toLowerCase()===raw);
    if(hit&&!found.includes(hit))found.push(hit);
  }
  return found;
}
async function chatRows(name:string,since?:string){
  const cutoff=new Date(Date.now()-48*60*60*1000).toISOString();
  let query=db.from("messages").select("id,user_name,message,type,system_type,created_at,image_url,mentions,reply_to,reactions").gte("created_at",cutoff);
  if(since)query=query.gt("created_at",since);
  const {data,error}=await query.order("created_at",{ascending:true}).limit(since?200:1000);
  if(error)throw error;
  return (data||[]).map((m:any)=>({
    id:String(m.id),user:m.user_name,message:m.message||"",type:m.type||"text",systemType:m.system_type||"",
    createdAt:m.created_at,imageUrl:m.image_url||"",mentions:Array.isArray(m.mentions)?m.mentions:[],
    replyTo:m.reply_to||null,reactions:m.reactions||{},readBy:[]
  }));
}
async function stateValue(key:string, fallback:any) {
  const {data,error}=await db.from("upstatus_state").select("value").eq("state_key",key).maybeSingle();
  if(error)throw error;
  return data?.value ?? fallback;
}
async function setState(key:string,value:any) {
  const {error}=await db.from("upstatus_state").upsert({state_key:key,value,updated_at:new Date().toISOString()},{onConflict:"state_key"});
  if(error)throw error;
}
function cookie(req:Request,name:string) {
  const raw=req.headers.get("cookie")||"";
  const item=raw.split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="));
  return item?decodeURIComponent(item.slice(name.length+1)):"";
}
async function luccaState() {
  return await stateValue("lucca",{online:false,session:null,joinedAt:null,lastSeen:null});
}
async function expireLucca() {
  const s:any=await luccaState();
  if(!s.online||!s.lastSeen||Date.now()-Date.parse(String(s.lastSeen))<12000)return s;
  const next={...s,online:false,session:null,lastSeen:new Date().toISOString()};
  await setState("lucca",next);
  await db.from("messages").insert({id:randomBytes(8).toString("hex"),user_name:"Sistema",message:"🔴 Lucca Maluco saiu do chat.",type:"system",system_type:"lucca_leave",created_at:new Date().toISOString(),image_url:"",mentions:[],reply_to:null,reactions:{}});
  return next;
}
async function profileMap() {
  const {data,error}=await db.from("upstatus_profiles").select("user_name,avatar_url");
  if(error)throw error;
  const out:Record<string,string>={};
  for(const x of data||[])if(x.avatar_url)out[x.user_name]=x.avatar_url;
  return out;
}
function decodeDataUrl(raw:string) {
  const value=String(raw||"");
  const comma=value.indexOf(",");
  if(!value.toLowerCase().startsWith("data:")||comma<0)throw new Error("Arquivo inválido.");
  const head=value.slice(5,comma);
  const semi=head.indexOf(";");
  const mime=(semi>=0?head.slice(0,semi):head).toLowerCase().trim();
  const meta=head.slice(Math.max(0,semi));
  if(!/;base64/i.test(meta))throw new Error("Arquivo inválido.");
  const bin=atob(value.slice(comma+1).replace(/\s/g,""));
  const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  return {mime,bytes};
}
function sniffMime(bytes:Uint8Array,declared:string) {
  if(bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return "image/jpeg";
  if(bytes.length>=8&&bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47&&bytes[4]===0x0d&&bytes[5]===0x0a&&bytes[6]===0x1a&&bytes[7]===0x0a)return "image/png";
  if(bytes.length>=6&&bytes[0]===0x47&&bytes[1]===0x49&&bytes[2]===0x46&&bytes[3]===0x38)return "image/gif";
  if(bytes.length>=12&&bytes[0]===0x52&&bytes[1]===0x49&&bytes[2]===0x46&&bytes[3]===0x46&&bytes[8]===0x57&&bytes[9]===0x45&&bytes[10]===0x42&&bytes[11]===0x50)return "image/webp";
  if(bytes.length>=4&&bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3)return declared.startsWith("audio/")?"audio/webm":"video/webm";
  if(bytes.length>=4&&bytes[0]===0x4f&&bytes[1]===0x67&&bytes[2]===0x67&&bytes[3]===0x53)return "audio/ogg";
  if(bytes.length>=3&&bytes[0]===0x49&&bytes[1]===0x44&&bytes[2]===0x33)return "audio/mpeg";
  if(bytes.length>=12&&bytes[4]===0x66&&bytes[5]===0x74&&bytes[6]===0x79&&bytes[7]===0x70)return declared==="video/mp4"?"video/mp4":declared.startsWith("audio/")?"audio/mp4":"image/jpeg";
  if(bytes.length>=12&&bytes[0]===0x52&&bytes[1]===0x49&&bytes[2]===0x46&&bytes[3]===0x46&&bytes[8]===0x57&&bytes[9]===0x41&&bytes[10]===0x56&&bytes[11]===0x45)return "audio/wav";
  return declared;
}
function ext(mime:string) {
  return ({ "image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif","video/mp4":"mp4","video/webm":"webm","audio/webm":"webm","audio/ogg":"ogg","audio/mp4":"m4a","audio/mpeg":"mp3","audio/wav":"wav","audio/x-wav":"wav","audio/x-m4a":"m4a" } as Record<string,string>)[mime]||"";
}
async function uploadFile(bucket:string,dataUrl:string,max:number,allowed:Set<string>) {
  const d=decodeDataUrl(dataUrl);
  const mime=sniffMime(d.bytes,d.mime);
  if(!allowed.has(mime))throw new Error("Tipo de arquivo não suportado.");
  if(d.bytes.length>max)throw new Error("Arquivo acima do limite permitido.");
  const e=ext(mime);if(!e)throw new Error("Tipo de arquivo não suportado.");
  const path=Date.now()+"-"+randomBytes(6).toString("hex")+"."+e;
  const body=d.bytes.buffer.slice(d.bytes.byteOffset,d.bytes.byteOffset+d.bytes.byteLength);
  const {error}=await db.storage.from(bucket).upload(path,body,{contentType:mime,cacheControl:"31536000",upsert:false});
  if(error)throw error;
  return {url:db.storage.from(bucket).getPublicUrl(path).data.publicUrl,mime};
}
async function contextName(req:Request) {
  const normal=await userFromToken(req);
  if(normal)return {name:normal,guest:false,joinedAt:0};
  const s:any=await expireLucca();
  const c=cookie(req,"lucca_session");
  if(c&&s.online&&s.session===c)return {name:"Lucca",guest:true,joinedAt:Date.parse(String(s.joinedAt))||Date.now()};
  return null;
}
async function chatRoute(req:Request,name:string){
  if(req.method==="GET"){
    const url=new URL(req.url);
    const fast=url.searchParams.get("fast")==="1";
    const sinceRaw=url.searchParams.get("since")||"";
    const since=sinceRaw?new Date(sinceRaw):null;
    if(fast){
      const effectiveSince=since&&!Number.isNaN(since.getTime())?new Date(since.getTime()-2000).toISOString():"";
      const cutoffTyping=new Date(Date.now()-4500).toISOString();
      const [messages,typingRes,luccaStateNow]=await Promise.all([
        chatRows(name,effectiveSince),
        db.from("upstatus_typing").select("user_name").gt("last_seen_at",cutoffTyping).neq("user_name",name),
        expireLucca()
      ]);
      return response({messages,typing:(typingRes.data||[]).map((x:any)=>x.user_name),luccaOnline:(luccaStateNow as any).online===true});
    }
    const cutoffTyping=new Date(Date.now()-4500).toISOString();
    const [messages,readRes,profileRes,typingRes,luccaStateNow]=await Promise.all([
      chatRows(name),
      db.from("chat_reads").select("user_name,last_read_at,messages"),
      db.from("upstatus_profiles").select("user_name,avatar_url"),
      db.from("upstatus_typing").select("user_name").gt("last_seen_at",cutoffTyping).neq("user_name",name),
      expireLucca()
    ]);
    const read=readRes.data;
    const readBy:Record<string,string[]>={};
    for(const row of read||[]){
      const map=row.messages&&typeof row.messages==="object"?row.messages:{};
      for(const [id,names] of Object.entries(map))for(const n of Array.isArray(names)?names as string[]:[]){
        if(!readBy[id])readBy[id]=[];
        if(!readBy[id].includes(n))readBy[id].push(n);
      }
    }
    for(const m of messages)m.readBy=readBy[m.id]||[];
    const me=(read||[]).find((x:any)=>x.user_name===name);
    const lastRead=me?.last_read_at?Date.parse(me.last_read_at):0;
    const unreadCount=messages.filter((m:any)=>m.type!=="system"&&m.user!==name&&Date.parse(m.createdAt)>lastRead).length;
    const profileMap:Record<string,string>={};
    for(const p of profileRes.data||[])if(p.avatar_url)profileMap[p.user_name]=p.avatar_url;
    return response({messages,unreadCount,profiles:profileMap,typing:(typingRes.data||[]).map((x:any)=>x.user_name),luccaOnline:(luccaStateNow as any).online===true});
  }
  const p:any=await readBody(req);
  const message=String(p.message||"").trim();
  const imageUrl=String(p.imageUrl||"").trim();
  const type=p.type==="video"?"video":p.type==="audio"?"audio":imageUrl?"image":"text";
  if(!message&&!imageUrl)return response({error:"Digite uma mensagem ou envie um arquivo."},400);
  if(message.length>1000)return response({error:"A mensagem deve ter no máximo 1000 caracteres."},400);
  let replyTo:any=null;
  if(p.replyTo?.id){
    const rows=await chatRows(name);
    const hit=rows.find((x:any)=>x.id===String(p.replyTo.id));
    if(hit)replyTo={id:hit.id,user:hit.user,message:hit.message,type:hit.type,imageUrl:hit.imageUrl};
  }
  const id=randomBytes(8).toString("hex");
  const createdAt=new Date().toISOString();
  const mentionList=await mentions(message);
  const {error}=await db.from("messages").insert({
    id,user_name:name,message,type,system_type:"",
    created_at:createdAt,image_url:imageUrl,mentions:mentionList,reply_to:replyTo,reactions:{}
  });
  if(error)throw error;
  return response({ok:true,message:{id,user:name,message,type,systemType:"",createdAt,imageUrl,mentions:mentionList,replyTo,reactions:{},readBy:[]}});
}
async function readRoute(req:Request,name:string){
  const p:any=await readBody(req);
  const ids=Array.isArray(p.messageIds)?p.messageIds.map(String).filter(Boolean).slice(0,1000):[];
  const {data:current}=await db.from("chat_reads").select("messages").eq("user_name",name).maybeSingle();
  const map=current?.messages&&typeof current.messages==="object"?{...current.messages}:{};
  if(ids.length){
    const {data:valid}=await db.from("messages").select("id,user_name").in("id",ids);
    const validIds=new Set((valid||[]).filter((x:any)=>x.user_name!==name).map((x:any)=>String(x.id)));
    for(const id of ids)if(validIds.has(id)){
      const list=Array.isArray(map[id])?[...map[id]]:[];
      if(!list.includes(name))list.push(name);
      map[id]=list;
    }
  }
  const {error}=await db.from("chat_reads").upsert({user_name:name,last_read_at:new Date().toISOString(),messages:map},{onConflict:"user_name"});
  if(error)throw error;
  return response({ok:true});
}
async function typingRoute(req:Request,name:string){
  if(req.method==="GET"){
    const cutoff=new Date(Date.now()-4500).toISOString();
    const {data}=await db.from("upstatus_typing").select("user_name").gt("last_seen_at",cutoff).neq("user_name",name);
    return response({typing:(data||[]).map((x:any)=>x.user_name)});
  }
  const p:any=await readBody(req);
  if(p.typing===true)await db.from("upstatus_typing").upsert({user_name:name,last_seen_at:new Date().toISOString()},{onConflict:"user_name"});
  else await db.from("upstatus_typing").delete().eq("user_name",name);
  return response({ok:true});
}
async function reactionRoute(req:Request,name:string){
  const p:any=await readBody(req),id=String(p.messageId||""),emoji=String(p.emoji||"");
  const allowed=new Set(["😂","❤️","👍","😡","😮","😢","👏","🔥","🤣","😍"]);
  if(!id||!allowed.has(emoji))return response({error:"Reação inválida."},400);
  const {data}=await db.from("messages").select("id,user_name,type,reactions").eq("id",id).maybeSingle();
  if(!data||data.type==="system")return response({error:"Mensagem não encontrada."},404);
  const reactions:any=data.reactions&&typeof data.reactions==="object"?{...data.reactions}:{};
  const list:Array<string>=Array.isArray(reactions[emoji])?[...reactions[emoji]]:[];
  const i=list.indexOf(name);if(i>=0)list.splice(i,1);else list.push(name);
  if(list.length)reactions[emoji]=list;else delete reactions[emoji];
  const {error}=await db.from("messages").update({reactions}).eq("id",id);
  if(error)throw error;
  return response({ok:true,reactions});
}
async function deleteRoute(name:string,id:string){
  const {data}=await db.from("messages").select("id,user_name").eq("id",id).maybeSingle();
  if(!data)return response({error:"Mensagem não encontrada."},404);
  if(data.user_name!==name)return response({error:"Você só pode excluir suas próprias mensagens."},403);
  const {error}=await db.from("messages").delete().eq("id",id);if(error)throw error;
  return response({ok:true,id});
}

async function profileRoute(req:Request,name:string) {
  if(req.method==="GET") return response({profiles:await profileMap()});
  const p:any=await readBody(req);
  const saved=await uploadFile("profile-images",String(p.dataUrl||""),2*1024*1024,new Set(["image/png","image/jpeg","image/webp","image/gif"]));
  await db.from("upstatus_profiles").upsert({user_name:name,avatar_url:saved.url,updated_at:new Date().toISOString()},{onConflict:"user_name"});
  return response({ok:true,avatarUrl:saved.url});
}
async function mediaRoute(req:Request,kind:"image"|"audio") {
  const p:any=await readBody(req);
  const max=kind==="audio"?5*1024*1024:25*1024*1024;
  const allowed=kind==="audio"?new Set(["audio/webm","audio/ogg","audio/mp4","audio/mpeg","audio/wav","audio/x-wav","audio/x-m4a"]):new Set(["image/png","image/jpeg","image/webp","image/gif","video/mp4","video/webm"]);
  const saved=await uploadFile("chat-images",String(p.dataUrl||""),max,allowed);
  return response({ok:true,imageUrl:saved.url,type:saved.mime.startsWith("video/")?"video":kind});
}
async function baruiRoute(req:Request,name:string) {
  const state:any=await stateValue("barui",{});
  const path=new URL(req.url).pathname;
  if(req.method==="GET"){
    const incoming=state[name]||null;
    const outgoing=Object.entries(state).find(([target,item]:any[])=>item?.sender===name);
    return response(incoming?{active:true,sender:incoming.sender,startedAt:incoming.startedAt,sequence:incoming.sequence,outgoingActive:!!outgoing,outgoingTarget:outgoing?.[0]||""}:{active:false,outgoingActive:!!outgoing,outgoingTarget:outgoing?.[0]||""});
  }
  if(path.endsWith("/stop-incoming")) {
    delete state[name]; await setState("barui",state); return response({ok:true});
  }
  if(!(await admin(name)))return response({error:"Somente administradores podem controlar o BARUI da equipe."},403);
  const p:any=await readBody(req),target=String(p.target||"");
  if(target===name||!(await members()).some((x:any)=>x.name===target))return response({error:"Usuário do BARUI inválido."},400);
  if(p.active)state[target]={sender:name,startedAt:new Date().toISOString(),sequence:Date.now()};
  else {if(state[target]&&state[target].sender!==name)return response({error:"Somente quem iniciou o BARUI pode pará-lo."},403);delete state[target];}
  await setState("barui",state); return response({ok:true});
}
async function remoteRoute(req:Request,name:string) {
  const state:any=await stateValue("remote-status",{commands:{},results:{}});
  state.commands=state.commands||{};state.results=state.results||{};
  const path=new URL(req.url).pathname;
  if(req.method==="GET") {
    if(path.endsWith("/result")) {
      if(!(await admin(name)))return response({error:"Somente administradores podem consultar resultados."},403);
      const id=new URL(req.url).searchParams.get("id")||"";
      const result=state.results[id];
      if(!result)return response({error:"Resultado ainda não disponível."},404);
      return response({ready:true,result});
    }
    return response({pending:!!state.commands[name],command:state.commands[name]||null});
  }
  if(path.endsWith("/result")) {
    const p:any=await readBody(req),cmd=state.commands[name],id=String(p.commandId||"");
    if(!cmd||cmd.id!==id)return response({error:"Comando não encontrado ou já processado."},404);
    state.results[id]={commandId:id,sender:cmd.sender,target:name,status:cmd.status,reason:cmd.reason||"",ok:p.ok===true,error:p.ok===true?"":String(p.error||"Falha ao executar o comando."),createdAt:new Date().toISOString()};
    delete state.commands[name];await setState("remote-status",state);return response({ok:true});
  }
  if(!(await admin(name)))return response({error:"Somente administradores podem controlar a fila de outro usuário."},403);
  const p:any=await readBody(req),target=String(p.target||""),status=String(p.status||""),reason=String(p.reason||"");
  if(!(await members()).some((x:any)=>x.name===target)||target===name)return response({error:"Usuário alvo inválido."},400);
  if(!["online","busy","away"].includes(status))return response({error:"Status inválido."},400);
  if(status!=="online"&&!reason)return response({error:"Informe um motivo."},400);
  const id=randomBytes(10).toString("hex");
  state.commands[target]={id,sender:name,target,status,reason:status==="online"?"":reason,createdAt:new Date().toISOString()};
  await setState("remote-status",state);return response({ok:true,commandId:id});
}
async function luccaRoute(req:Request) {
  const path=new URL(req.url).pathname;
  if(path==="/api/lucca/login") {
    const p:any=await readBody(req);
    const pass=Deno.env.get("LUCCA_PASSWORD")||"";
    if(!pass||String(p.password||"")!==pass)return response({error:"Senha incorreta."},401);
    const old:any=await expireLucca();
    if(old.online)await db.from("messages").insert({id:randomBytes(8).toString("hex"),user_name:"Sistema",message:"🔴 Lucca Maluco saiu do chat.",type:"system",system_type:"lucca_leave",created_at:new Date().toISOString(),image_url:"",mentions:[],reply_to:null,reactions:{}});
    const session=randomBytes(32).toString("hex"),joinedAt=new Date().toISOString();
    await setState("lucca",{online:true,session,joinedAt,lastSeen:joinedAt});
    await db.from("messages").insert({id:randomBytes(8).toString("hex"),user_name:"Sistema",message:"🔴 Lucca Maluco entrou no chat.",type:"system",system_type:"lucca_join",created_at:new Date().toISOString(),image_url:"",mentions:[],reply_to:null,reactions:{}});
    return response({ok:true,name:"Lucca",joinedAt},200,{"Set-Cookie":"lucca_session="+encodeURIComponent(session)+"; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400"});
  }
  if(path==="/api/lucca/me") {
    const s:any=await expireLucca(),c=cookie(req,"lucca_session");
    return response(c&&s.online&&s.session===c?{authenticated:true,name:"Lucca",joinedAt:s.joinedAt,online:true}:{authenticated:false,name:null,online:!!s.online});
  }
  if(path==="/api/lucca/heartbeat") {
    const s:any=await expireLucca(),c=cookie(req,"lucca_session");
    if(!c||!s.online||s.session!==c)return response({error:"Sessão do Lucca encerrada."},401);
    await setState("lucca",{...s,lastSeen:new Date().toISOString()});return response({ok:true,online:true});
  }
  if(path==="/api/lucca/logout") {
    const s:any=await expireLucca(),c=cookie(req,"lucca_session");
    if(c&&s.online&&s.session===c){await setState("lucca",{...s,online:false,session:null,lastSeen:new Date().toISOString()});await db.from("messages").insert({id:randomBytes(8).toString("hex"),user_name:"Sistema",message:"🔴 Lucca Maluco saiu do chat.",type:"system",system_type:"lucca_leave",created_at:new Date().toISOString(),image_url:"",mentions:[],reply_to:null,reactions:{}});}
    return response({ok:true},200,{"Set-Cookie":"lucca_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"});
  }
  return response({error:"Não encontrado."},404);
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
  try{
    const requestUrl=new URL(req.url);
    if(req.method==="GET" && requestUrl.pathname.endsWith("/upstatus.user.js")){
      return new Response(userscriptText(),{status:200,headers:{"Content-Type":"text/javascript; charset=utf-8",...CORS,"Cache-Control":"no-cache, no-store, must-revalidate","Content-Disposition":"inline; filename=\"UpStatus.user.js\""}});
    }
    const rawPath=new URL(req.url).pathname;
    let path=rawPath;
    const marker="/upstatus";
    const markerAt=path.lastIndexOf(marker);
    if(markerAt>=0)path=path.slice(markerAt+marker.length);
    if(!path)path="/";
    if(path.length>1)path=path.replace(/\/$/, "");

    if(path==="/upstatus.user.js"&&req.method==="GET")return new Response(userscriptText(),{status:200,headers:{"Content-Type":"text/javascript; charset=utf-8",...CORS,"Cache-Control":"no-store"}});
    if(path==="/health"&&req.method==="GET")return response({ok:true,service:"UpStatus",version:VERSION});
    if(path==="/api/members"&&req.method==="GET")return response({members:await members()});
    if(path==="/api/update-info"&&req.method==="GET")return response({version:VERSION,updateUrl:"/upstatus.user.js"});
    if(path==="/api/account"&&req.method==="GET"){
      const name=new URL(req.url).searchParams.get("name")||"";
      const a=await account(name);
      return response({needsSetup:!a||!a.password_hash});
    }
    if(path==="/api/setup"&&req.method==="POST")return await login(req,true);
    if(path==="/api/login"&&req.method==="POST")return await login(req,false);

    const ctx=await contextName(req);
    const name=ctx?.name||null;
    if(path==="/api/me"&&req.method==="GET"){
      const a=name?await account(name):null;
      return response({authenticated:!!name,name:name||null,role:a?.role||null,canViewHistory:a?.role==="implementation_admin",needsSetup:!!a&&!a.password_hash});
    }
    if(!ctx)return response({error:"Faça login para continuar."},401);

    if(path==="/api/logout"&&req.method==="POST"){
      const t=token(req);if(t){await db.from("upstatus_sessions").delete().eq("token_hash",tokenHash(t));sessionCache.delete(t);}
      return response({ok:true});
    }
    if(path==="/api/health"&&req.method==="GET")return await healthRoute(req,name);
    if(path==="/api/status")return await statusRoute(req,name);
    if(path==="/api/history")return await historyRoute(req,name);
    if(path==="/api/chat")return await chatRoute(req,name);
    if(path==="/api/chat/read"&&req.method==="POST")return await readRoute(req,name);
    if(path==="/api/chat/typing")return await typingRoute(req,name);
    if(path==="/api/chat/reaction"&&req.method==="POST")return await reactionRoute(req,name);
    if(path.startsWith("/api/chat/")&&req.method==="DELETE")return await deleteRoute(name,path.slice("/api/chat/".length));
    if(path==="/api/profiles")return await profileRoute(req,name);
    if(path==="/api/profile/avatar"&&req.method==="POST")return await profileRoute(req,name);
    if(path==="/api/chat/image"&&req.method==="POST")return await mediaRoute(req,"image");
    if(path==="/api/chat/audio"&&req.method==="POST")return await mediaRoute(req,"audio");
    if(path.startsWith("/api/barui"))return await baruiRoute(req,name);
    if(path.startsWith("/api/remote-status"))return await remoteRoute(req,name);
    if(path==="/api/chat/clear"&&req.method==="POST"){
      if(name!=="Ricardo")return response({error:"Somente Ricardo pode limpar o chat."},403);
      const {error}=await db.from("messages").delete().gte("created_at","1970-01-01");
      if(error)throw error;
      await db.from("messages").insert({id:randomBytes(8).toString("hex"),user_name:"Sistema",message:"🧹 Ricardo limpou o chat.",type:"system",system_type:"chat_clear",created_at:new Date().toISOString(),image_url:"",mentions:[],reply_to:null,reactions:{}});
      return response({ok:true});
    }
    return response({error:"Não encontrado."},404);
  }catch(e){
    console.error(e);
    return response({error:e instanceof Error?e.message:"Erro interno."},500);
  }
});
