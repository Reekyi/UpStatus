// ==UserScript==
// @name         UpStatus - Sale Smartly
// @namespace    upseller
// @version      2.9.2
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
  var lastMember=GM_getValue(key+'last_member','Ricardo')||'Ricardo';
  var role=GM_getValue(key+'role','implementation_user');
  var chatLoading=false,typingPolling=false,baruiPolling=false,remotePolling=false,refreshing=false,readSentKey='',chatFastSince='';
  var remoteResultCache={},remoteResultWaiters={};
  var UpNativeNotification=(typeof Notification!=='undefined')?Notification:null;

  function installPageBridge(){
    if(document.documentElement && document.getElementById('upstatus-page-bridge')) return;
    var s=document.createElement('script');
    s.id='upstatus-page-bridge';
    s.textContent=`(function(){
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
            return /\/ling_2\.mp3(?:$|[?#])/i.test(src);
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
    })();`;
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
  var baruiCall={active:false,role:'',target:'',sequence:0,pc:null,localStream:null,remoteStream:null,audio:null,connectedAt:0,timer:null,muted:false,answered:false,pendingIce:[]};
  var originalTitle=document.title;
  var currentStatus='offline';
  var CURRENT_VERSION='2.9.3';
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
    phone:'<path d="M7.1 4.2 9.4 3.5a1.8 1.8 0 0 1 2 1l1.1 3a1.8 1.8 0 0 1-.6 2l-1.4 1.1a12.6 12.6 0 0 0 3.9 3.9l1.1-1.4a1.8 1.8 0 0 1 2-.6l3 1.1a1.8 1.8 0 0 1 1 2l-.7 2.3a2.3 2.3 0 0 1-2.4 1.6C11.3 19.7 4.3 12.7 3.5 5.9a2.3 2.3 0 0 1-1.6-2.4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
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
    send:'<path d="M3 11.5 21 3l-6.5 18-3.1-7.4L3 11.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m11.4 13.6 4.8-4.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' ,
    trash:'<path d="M5 7h14M9 7V4h6v3m-8 0 1 13h8l1-13M10 10v7m4-7v7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
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
          if(/^https:\/\/[^/]+\.supabase\.co\/functions\/v1\/upstatus$/i.test(server)){
            u+=(u.indexOf('?')>=0?'&':'?')+'forceFunctionRegion=us-west-2';
          }
          return u;
        })(),
        headers:Object.assign({'Content-Type':'application/json','X-UpStatus-Version':CURRENT_VERSION},token?{'X-UpStatus-Token':token}:{}),
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
    '#upstatus-card{position:absolute;bottom:55px;right:0;width:365px;max-width:calc(100vw - 32px);overflow:auto;box-sizing:border-box;scrollbar-width:thin;scrollbar-color:rgba(139,149,164,.35) transparent;background:#19212e;border:1px solid #354258;border-radius:16px;padding:18px;box-shadow:0 16px 42px #000b}'+
    '#upstatus-history{position:absolute;bottom:55px;right:0;width:365px;max-width:calc(100vw - 32px);height:520px;box-sizing:border-box;background:#19212e;border:1px solid #354258;border-radius:16px;padding:18px;box-shadow:0 16px 42px #000b;overflow:hidden;display:flex;flex-direction:column}'+
    '#upstatus-chat{position:absolute;bottom:55px;right:0;width:365px;max-width:calc(100vw - 32px);height:520px;box-sizing:border-box;background:#19212e;border:1px solid #354258;border-radius:16px;padding:18px;box-shadow:0 16px 42px #000b;overflow:hidden;display:flex;flex-direction:column}'+
    '#upstatus-card,#upstatus-history,#upstatus-chat{resize:none;min-width:320px;min-height:420px;max-width:calc(100vw - 32px);max-height:calc(100vh - 32px)}'+
    '#upstatus-card.hidden,#upstatus-history.hidden,#upstatus-chat.hidden,.up-reasons.hidden,.up-select.hidden,.up-input.hidden,.up-confirm.hidden,.up-history-btn.hidden{display:none}'+
    '.up-head,.up-member-top,.up-history-head{display:flex;justify-content:space-between;align-items:center}'+
    '.up-title,.up-history-title{font-size:18px;font-weight:750}'+
    '.up-you,.up-reason{color:#aab6c9;font-size:12px;margin-top:4px}'+
    '.up-actions{display:flex;gap:6px;align-items:center;position:relative}.up-chat-btn,.up-logout,.up-history-btn,.up-close,.up-settings-btn{border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer;box-sizing:border-box;height:34px;min-width:34px}.up-logout{background:#3a2730;color:#ffb0bc}.up-logout:hover{background:#54313c}.up-settings-btn{display:inline-flex;align-items:center;justify-content:center}.up-settings-btn .up-icon{width:17px;height:17px}.up-settings-menu{position:absolute;right:0;top:42px;width:210px;padding:8px;background:#111722;border:1px solid #3a475b;border-radius:10px;box-shadow:0 12px 30px #0009;z-index:70}.up-settings-menu.hidden{display:none}.up-settings-menu button{width:100%;display:flex;align-items:center;gap:8px;border:0;border-radius:7px;padding:9px;background:transparent;color:#dbe5f5;text-align:left;cursor:pointer;font:inherit;font-size:12px}.up-settings-menu button:hover{background:#273247}.up-settings-menu button .up-icon{width:16px;height:16px}.up-settings-menu .up-settings-notifications.enabled{color:#7ef0b6}.up-settings-menu .up-settings-notifications.denied{color:#ff9aaa}'+
    '.up-chat-btn{position:relative;border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer}.up-chat-btn.lucca-active{background:#c52f48;color:#fff;animation:upLuccaPulse .8s infinite alternate}.up-notification-btn{border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer;box-sizing:border-box;height:34px;min-width:34px;font-size:15px;line-height:1}.up-notification-btn.enabled{background:#184f3a;color:#7ef0b6}.up-notification-btn.denied{background:#3a2730;color:#ff9aaa}.up-chat-btn .up-chat-notify-dot{position:absolute;right:-3px;top:-3px;width:10px;height:10px;border-radius:50%;background:#ff4d67;border:2px solid #19212e;display:none}.up-chat-btn .up-chat-notify-dot.show{display:block}.up-barui-main{position:relative;width:34px;height:34px;padding:0;border:0;border-radius:50%;background:#273247;color:#c6d1e1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.up-barui-main .up-icon{width:17px;height:17px}.up-barui-main.active,.up-barui-main.incoming{background:#c52f48;color:#fff;animation:upbaruibtn .55s infinite alternate}.up-barui-popup{position:absolute;right:0;top:42px;width:230px;padding:10px;background:#111722;border:1px solid #3a475b;border-radius:10px;box-shadow:0 12px 30px #0009;z-index:60}.up-barui-popup.hidden{display:none}.up-barui-popup-title{font-size:12px;font-weight:750;color:#cbd5e4;margin-bottom:7px}.up-barui-popup-row{display:flex;gap:6px}.up-barui-popup select{flex:1;min-width:0;border:1px solid #3a475b;border-radius:7px;background:#19212e;color:#edf2fb;padding:7px;font-size:12px}.up-barui-popup button{border:0;border-radius:7px;background:#c52f48;color:#fff;font-weight:750;padding:7px 9px;cursor:pointer}.up-barui-popup button:disabled{opacity:.6;cursor:wait}.up-barui-row{display:flex;gap:7px;margin-top:8px}.up-barui-select{flex:1;min-width:0;border:1px solid #3a475b;border-radius:8px;background:#111722;color:#edf2fb;padding:8px}.up-barui-btn{border:0;border-radius:8px;padding:8px 11px;background:#a52a3c;color:#fff;font-weight:800;cursor:pointer}.up-barui-btn.active{background:#d66b1f}.up-barui-hint{font-size:11px;color:#8f9db2;margin-top:5px}.up-barui-active{animation:upbarui .55s infinite alternate}@keyframes upbaruibtn{from{transform:scale(1);box-shadow:0 0 0 0 #ff334f55}to{transform:scale(1.08);box-shadow:0 0 0 7px #ff334f55}}@keyframes upbarui{from{box-shadow:0 7px 22px #0009}to{box-shadow:0 0 0 7px #ff334f55,0 7px 22px #0009}}.up-icon{display:inline-block;width:16px;height:16px;vertical-align:-3px;flex:0 0 auto}.up-icon-wrap{display:inline-flex;align-items:center;justify-content:center;vertical-align:middle}.up-history-btn{font-size:17px;padding:5px 8px;line-height:1}.up-history-btn .up-icon{width:18px;height:18px}.up-select,.up-history-list,.up-history-head{font-family:"Segoe UI",Arial,sans-serif}.up-reason-picker{position:relative}.up-reason-trigger{width:100%;display:flex;align-items:center;gap:8px;padding:10px;border-radius:8px;border:1px solid #3a475b;background:#111722;color:#edf2fb;cursor:pointer;text-align:left}.up-reason-menu{position:absolute;z-index:30;left:0;right:0;margin-top:4px;background:#111722;border:1px solid #3a475b;border-radius:8px;padding:4px;box-shadow:0 12px 30px #0008}.up-reason-menu.hidden{display:none}.up-reason-option{width:100%;display:flex;align-items:center;gap:8px;border:0;background:transparent;color:#edf2fb;padding:9px 8px;border-radius:6px;cursor:pointer;text-align:left}.up-reason-option:hover{background:#273247}.up-reason-text{flex:1}.up-status-icon.online{color:#7be1a7}.up-status-icon.busy{color:#ff6b7a}.up-status-icon.away{color:#c7d0df}.up-export{height:34px;min-width:34px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:5px;border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer;font-size:12px;font-weight:700}.up-statuses{display:flex;gap:7px;margin:16px 0 8px}'+

    '.up-status{border:0;border-radius:8px;padding:9px;font-weight:700;cursor:pointer}.online{background:#173f2b;color:#7be1a7}.busy{background:#4d1b25;color:#ff6b7a}.away{background:#303949;color:#c7d0df}'+
    '.up-label{display:block;margin-bottom:6px;font-weight:650}.up-select,.up-input{width:100%;padding:10px;border-radius:8px;border:1px solid #3a475b;background:#111722;color:#edf2fb}.up-input{margin-top:7px}'+
    '.up-confirm{margin-top:7px;width:100%;border:0;border-radius:8px;padding:9px;background:#4f7dff;color:#fff;font-weight:700;cursor:pointer}'+
    '.up-message{min-height:20px;font-size:12px;color:#ff8499;margin-top:8px}.up-notice{margin:10px 0;padding:9px;border-radius:8px;background:#173f2b;color:#9ce5b8;font-size:12px}'+
    '.up-team-title{font-weight:750;margin:13px 0 7px}.up-member{padding:9px 0;border-bottom:1px solid #303b4d}.up-member:last-child{border:0}.up-badge{font-size:11px;font-weight:700;border-radius:12px;padding:3px 6px}.b-online{background:#173f2b;color:#7be1a7}.b-busy{background:#4d1b25;color:#ff6b7a}.b-away,.b-offline{background:#303949;color:#c7d0df}.up-time{font-size:11px;color:#8390a4;margin-top:4px}'+
    '.up-chat-lucca-alert{flex:0 0 auto;position:relative;z-index:20;margin-top:8px;padding:9px 12px;border:1px solid #a92e43;border-radius:9px;background:#351724;color:#ff9aaa;font-size:11px;font-weight:850;letter-spacing:.2px;box-shadow:0 4px 14px #0005}.up-chat-lucca-alert.hidden{display:none}.up-chat-system-event{display:flex;justify-content:center;padding:8px 0 6px}.up-chat-system-event span{padding:6px 10px;border-radius:999px;background:#252e3c;border:1px solid #3a475b;color:#aebbd0;font-size:10px;font-weight:800;text-align:center}.up-chat-system-event.join span{background:#351724;border-color:#7c2a3e;color:#ff9aaa}.up-chat-list{height:auto;flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;margin-top:12px;margin-right:-18px;margin-left:-5px;padding-right:18px;padding-left:5px;scrollbar-width:thin;.up-chat-date-divider{display:flex;align-items:center;gap:9px;margin:14px 0 8px;color:#8fa0b8;font-size:10px;font-weight:800;letter-spacing:.15px}.up-chat-date-divider:before,.up-chat-date-divider:after{content:"";height:1px;flex:1;background:#334158}.up-chat-date-divider span{padding:5px 10px;border:1px solid #334158;border-radius:999px;background:#182130;white-space:nowrap}.up-chat-item.group-middle .up-chat-bubble{border-radius:4px 12px 12px 4px;padding-top:5px;padding-bottom:5px}.up-chat-item.own.group-middle .up-chat-bubble{border-radius:12px 4px 4px 12px}.up-chat-item.group-end .up-chat-bubble{margin-bottom:2px}.up-chat-item.group-start{padding-top:7px}.up-chat-item.group-end{padding-bottom:7px}.up-chat-item.group-middle{padding-top:1px;padding-bottom:1px}.up-chat-avatar.avatar-hidden{visibility:hidden}.up-chat-audio-player{display:flex;align-items:center;gap:8px;min-width:220px;max-width:100%;margin-top:6px;padding:7px 8px;border-radius:10px;background:rgba(8,14,24,.28);border:1px solid rgba(255,255,255,.08);box-sizing:border-box}.up-chat-audio-play{width:30px;height:30px;flex:0 0 30px;border:0;border-radius:50%;background:#fff;color:#3159bd;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:12px}.up-chat-audio-wave{height:22px;flex:1;display:flex;align-items:center;gap:2px;overflow:hidden}.up-chat-audio-wave span{width:3px;min-height:4px;border-radius:3px;background:#a9c2ff;opacity:.75}.up-chat-audio-time{font-size:10px;color:#dbe5f5;font-variant-numeric:tabular-nums;min-width:30px;text-align:right}.up-chat-audio-volume{border:0;background:transparent;color:#dbe5f5;cursor:pointer;padding:2px}.up-chat-header-info{font-size:10px;color:#8fa0b8;margin-top:2px}.up-chat-header-info .chat-online-dot{color:#55e58b}.up-chat-send{position:absolute;right:7px;bottom:7px;margin:0;width:28px;height:28px;border:0;border-radius:50%;padding:0;background:#4f7dff;color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;z-index:2}.up-chat-send:hover{background:#6b92ff;transform:translateY(-1px)}.up-chat-send .up-icon{width:15px;height:15px}scrollbar-color:rgba(139,149,164,.35) transparent}.up-chat-list::-webkit-scrollbar{width:6px}.up-chat-list::-webkit-scrollbar-track{background:transparent}.up-chat-list::-webkit-scrollbar-thumb{background:rgba(139,149,164,.30);border-radius:999px}.up-chat-list::-webkit-scrollbar-thumb:hover{background:rgba(139,149,164,.50)}.up-chat-item{position:relative;display:flex;align-items:flex-end;gap:7px;padding:6px 0}.up-chat-item.own{flex-direction:row-reverse;cursor:context-menu}.up-chat-avatar{width:28px;height:28px;flex:0 0 28px;border-radius:50%;object-fit:cover;background:#273247;border:2px solid transparent;box-sizing:border-box}.up-chat-avatar.up-chat-presence-idle{border-color:#62a7ff;box-shadow:0 0 7px rgba(83,155,255,.6)}.up-chat-avatar.up-chat-presence-active{border-color:#55e58b;animation:upChatPresencePulse 1.9s ease-in-out infinite}@keyframes upChatPresencePulse{0%,100%{box-shadow:0 0 0 0 rgba(82,224,137,.12),0 0 7px rgba(82,224,137,.62)}50%{box-shadow:0 0 0 1px rgba(82,224,137,.28),0 0 10px rgba(82,224,137,.72)}}.up-chat-bubble{position:relative;max-width:78%;min-width:52px;padding:7px 9px;border-radius:12px 12px 12px 3px;background:#273247;color:#e7edf7;box-sizing:border-box;box-shadow:0 3px 10px #0003}.up-chat-item.own .up-chat-bubble{border-radius:12px 12px 3px 12px;background:#3159bd}.up-chat-item.lucca .up-chat-bubble{background:rgba(106,18,39,.48);border:1px solid rgba(255,76,108,.48);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 4px 18px rgba(255,45,82,.12),inset 0 1px 0 rgba(255,255,255,.07)}.up-chat-item.lucca .up-chat-meta b{color:#ff91a7}.up-chat-item.lucca .up-chat-text{color:#ffe9ee}.up-chat-system-event.clear span{background:#273247;border-color:#4f7dff;color:#a9c2ff}.up-chat-photo{cursor:zoom-in}.up-chat-lightbox{position:fixed;inset:0;z-index:2147483647;background:rgba(5,8,13,.88);display:flex;align-items:center;justify-content:center;padding:28px;box-sizing:border-box;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}.up-chat-lightbox.hidden{display:none}.up-chat-lightbox img{max-width:92vw;max-height:90vh;width:auto;height:auto;object-fit:contain;border-radius:12px;box-shadow:0 20px 70px #000b;border:1px solid #52627b}.up-chat-lightbox-close{position:absolute;right:22px;top:18px;width:38px;height:38px;border:0;border-radius:50%;background:rgba(39,50,71,.9);color:#fff;font-size:25px;line-height:38px;cursor:pointer}.up-chat-lightbox-close:hover{background:#4f5e75}.up-chat-meta{display:flex;align-items:center;gap:7px;font-size:10px;color:#9eabc0}.up-chat-meta b{font-weight:750;color:#cbd5e4}.up-chat-item.own .up-chat-meta{justify-content:flex-end}.up-chat-read{font-size:11px;color:#aebbd0;margin-left:4px;cursor:help;user-select:none}.up-chat-read.read{color:#63a2ff}.up-chat-own-meta{text-align:right;min-height:13px}.up-chat-profile-btn{width:34px;height:34px;padding:0;border:0;border-radius:50%;background:#273247;cursor:pointer;overflow:hidden}.up-chat-profile-btn img{width:100%;height:100%;object-fit:cover;display:block}.up-chat-title-wrap{display:flex;align-items:center;gap:8px}.up-chat-profile-modal{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}.up-chat-profile-modal.hidden{display:none}.up-chat-profile-dialog{width:min(330px,calc(100vw - 40px));padding:18px;border:1px solid #40506a;border-radius:14px;background:#182130;box-shadow:0 18px 45px #000b}.up-chat-profile-preview{width:84px;height:84px;margin:0 auto 12px;border-radius:50%;object-fit:cover;background:#273247;border:2px solid #40506a;display:block}.up-chat-profile-file{width:100%;margin:8px 0;color:#cbd5e4;font-size:12px}.up-chat-profile-actions{display:flex;gap:7px}.up-chat-profile-actions button{flex:1;border:0;border-radius:8px;padding:9px;cursor:pointer;font-weight:750}.up-chat-profile-save{background:#4f7dff;color:#fff}.up-chat-profile-cancel{background:#273247;color:#cbd5e4}.up-chat-profile-message{min-height:18px;font-size:11px;color:#ff9aaa;margin:7px 0}.up-delete-action{position:absolute;right:4px;top:28px;border:1px solid #4a566b;border-radius:6px;background:#273247;color:#ff9aaa;padding:4px 7px;font:700 11px Segoe UI,Arial,sans-serif;cursor:pointer;box-shadow:0 5px 14px #0006;z-index:5}.up-delete-action:hover{background:#3a2530;color:#ffb5c1}.up-delete-action.hidden{display:none}.up-chat-meta{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:#8fa0b8}.up-chat-text{font-size:13px;color:#e7edf7;white-space:pre-wrap;word-break:break-word;margin-top:4px}.up-chat-typing{display:flex;align-items:center;gap:7px;min-height:28px;margin:2px 0 3px 35px;color:#9eabc0;font-size:10px}.up-chat-typing.hidden{display:none}.up-chat-typing-avatar{width:22px;height:22px;border-radius:50%;object-fit:cover;border:1px solid #3a475b;background:#273247}.up-chat-typing-dots{display:inline-flex;align-items:center;gap:3px;padding:5px 7px;border-radius:10px 10px 10px 3px;background:#273247}.up-chat-typing-dots i{width:4px;height:4px;border-radius:50%;background:#aebbd0;animation:upTyping 1s infinite ease-in-out}.up-chat-typing-dots i:nth-child(2){animation-delay:.15s}.up-chat-typing-dots i:nth-child(3){animation-delay:.3s}@keyframes upTyping{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-3px);opacity:1}}.up-member-top{display:flex;align-items:center;gap:7px}.up-member-identity{display:flex;align-items:center;gap:6px;flex:1;min-width:0}.up-member-identity b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.up-member-version{font-size:10px;font-weight:700;color:#8fa0b8;background:#222d3d;border:1px solid #344158;border-radius:999px;padding:2px 5px;white-space:nowrap}.up-member-presence{width:8px;height:8px;border-radius:50%;flex:0 0 8px;background:#46505f;box-shadow:0 0 0 2px rgba(70,80,95,.12)}.up-member-presence.online{background:#579cff;box-shadow:0 0 7px rgba(87,156,255,.55)}.up-member-presence.chat{background:#51df88;box-shadow:0 0 7px rgba(81,223,136,.58)}.up-member-presence.offline{background:#46505f;box-shadow:none}.up-member-barui{width:28px;height:28px;padding:0;border:0;border-radius:50%;background:#273247;color:#c6d1e1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}.up-member-barui .up-icon{width:15px;height:15px}.up-member-barui:hover{background:#36445b}.up-member-barui.active{background:#c52f48;color:#fff;animation:upbaruibtn .55s infinite alternate}.up-member-barui:disabled{opacity:.55;cursor:wait}.up-member-power{width:28px;height:28px;padding:0;border:0;border-radius:50%;background:#273247;color:#c6d1e1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}.up-member-power .up-icon{width:15px;height:15px}.up-member-power:hover{background:#3b465b;color:#fff}.up-member-power:disabled{opacity:.55;cursor:wait}.up-remote-overlay{position:absolute;inset:0;z-index:100;background:rgba(10,15,24,.68);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;border-radius:16px}.up-remote-overlay.hidden{display:none}.up-remote-dialog{width:100%;max-width:315px;background:#182130;border:1px solid #40506a;border-radius:14px;padding:14px;box-sizing:border-box;box-shadow:0 18px 45px #000b}.up-remote-title{font-size:15px;font-weight:800}.up-remote-sub{font-size:11px;color:#9aa8bc;margin-top:3px}.up-remote-statuses{display:flex;gap:6px;margin-top:12px}.up-remote-status{flex:1;border:1px solid #3a475b;border-radius:8px;padding:9px 6px;background:#111722;color:#dce5f2;cursor:pointer;font:700 12px Segoe UI,Arial,sans-serif}.up-remote-status:hover,.up-remote-status.active{background:#30405b;border-color:#5b7fc8}.up-remote-reason{margin-top:9px}.up-remote-reason.hidden{display:none}.up-remote-reason-menu{display:flex;flex-direction:column;gap:3px}.up-remote-reason-option{border:0;background:#111722;color:#dce5f2;border-radius:7px;padding:8px;text-align:left;cursor:pointer;font:12px Segoe UI,Arial,sans-serif}.up-remote-reason-option:hover,.up-remote-reason-option.active{background:#30405b}.up-remote-actions{display:flex;gap:7px;margin-top:12px}.up-remote-actions button{flex:1;border:0;border-radius:8px;padding:9px;font:800 12px Segoe UI,Arial,sans-serif;cursor:pointer}.up-remote-cancel{background:#273247;color:#cbd5e4}.up-remote-confirm{background:#4f7dff;color:#fff}.up-remote-confirm:disabled{opacity:.55;cursor:wait}.up-remote-message{min-height:18px;margin-top:7px;font-size:11px;color:#ff9aaa}.up-chat-text{font-size:13px;color:#e7edf7;white-space:pre-wrap;word-break:break-word;margin-top:4px}.up-chat-photo{display:block;max-width:260px;max-height:210px;width:auto;height:auto;margin-top:6px;border:1px solid #3a475b;border-radius:9px;background:#111722;cursor:zoom-in;object-fit:contain;box-shadow:0 4px 14px #0004}.up-chat-media{display:block;max-width:220px;max-height:150px;margin-top:6px;border:1px solid #3a475b;border-radius:9px;background:#111722;object-fit:contain;box-shadow:0 4px 14px #0004}.up-chat-media-video{width:220px;height:150px}.up-chat-profile-hover{position:fixed;z-index:2147483647;display:none;width:148px;padding:10px;box-sizing:border-box;border:1px solid #52627b;border-radius:12px;background:#182130;box-shadow:0 14px 40px #000b;pointer-events:none;text-align:center}.up-chat-profile-hover.show{display:block}.up-chat-profile-hover img{display:block;width:96px;height:96px;margin:0 auto 7px;border-radius:50%;object-fit:cover;border:2px solid transparent;background:#273247}.up-chat-profile-hover img.up-chat-presence-idle{border-color:#62a7ff;box-shadow:0 0 8px rgba(83,155,255,.62)}.up-chat-profile-hover img.up-chat-presence-active{border-color:#55e58b;animation:upProfilePresencePulse 1.9s ease-in-out infinite}@keyframes upProfilePresencePulse{0%,100%{box-shadow:0 0 0 0 rgba(82,224,137,.12),0 0 7px rgba(82,224,137,.62)}50%{box-shadow:0 0 0 1px rgba(82,224,137,.28),0 0 10px rgba(82,224,137,.72)}}.up-chat-profile-hover-name{font-size:12px;font-weight:750;color:#e7edf7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.up-chat-profile-hover-role{font-size:10px;color:#9eabc0;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.up-chat-compose{position:relative;display:flex;align-items:stretch;gap:6px}.up-chat-input-wrap{position:relative;flex:1 1 auto;min-width:0}.up-chat-compose .up-chat-input{display:block;width:100%;box-sizing:border-box;min-width:0;padding-right:48px}.up-chat-tools{display:flex;align-items:stretch;gap:6px;flex:0 0 auto;margin-top:0}.up-chat-send{position:absolute;right:7px;bottom:7px;margin:0;width:28px;height:28px;border:0;border-radius:50%;padding:0;background:#4f7dff;color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;z-index:2}.up-chat-send:hover{background:#6b92ff;transform:translateY(-1px)}.up-chat-send .up-icon{width:15px;height:15px}.up-mention-menu{position:absolute;left:0;bottom:calc(100% + 8px);z-index:20;display:flex;flex-wrap:wrap;gap:6px;width:100%;padding:7px;box-sizing:border-box;background:#182130;border:1px solid #3a475b;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.32)}.up-mention-menu.hidden{display:none}.up-mention-option{flex:0 0 auto;border:1px solid #344158;background:#243149;color:#dbe5f5;border-radius:8px;padding:6px 9px;cursor:pointer;font:12px Segoe UI,Arial,sans-serif}.up-mention-option:hover{background:#30405b;border-color:#4f7dff}.up-mention-option.up-mention-all{background:#3b315f;border-color:#8065c7;color:#fff}.up-chat-tools{display:flex;gap:6px;flex:0 0 auto}.up-chat-emoji-btn{width:38px;height:42px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;padding:0;border:1px solid #3a475b;border-radius:8px;background:#273247;color:#dbe5f5;cursor:pointer}.up-chat-emoji-btn .up-icon{width:17px;height:17px}.up-chat-emoji-btn:hover{background:#35425a}.up-chat-attach{width:38px;height:42px;padding:0;border:1px solid #3a475b;border-radius:8px;background:#273247;color:#dbe5f5;cursor:pointer;font-size:17px;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box}.up-chat-attach:hover{background:#35425a}.up-chat-clear{width:38px;height:34px;border:0;border-radius:8px;background:#3a2730;color:#ff9aaa;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.up-chat-clear .up-icon{width:16px;height:16px}.up-chat-clear:hover{background:#552d3a}.up-chat-back{border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer;font:700 12px Segoe UI,Arial,sans-serif}.up-chat-back:hover{background:#35425a}.up-chat-mention{color:#7fb1ff;font-weight:750}.up-chat-input{flex:1 1 auto;width:auto;min-width:0;min-height:42px;height:42px;max-height:90px;resize:vertical;padding:8px;border-radius:8px;border:1px solid #3a475b;background:#111722;color:#edf2fb;font:13px Segoe UI,Arial,sans-serif}.up-update{font-size:11px;color:#9caac0;margin-top:10px}.up-update button{margin-left:6px;border:0;background:#273247;color:#c6d1e1;border-radius:6px;padding:4px 7px;cursor:pointer}.up-update button:hover{background:#35425a}.up-update .up-update-now:disabled{opacity:.45;cursor:not-allowed;background:#202938;color:#7f8ca0}.up-update .up-update-now:disabled:hover{background:#202938}.up-history-list{overflow:auto;flex:1;min-height:0;margin-top:12px}.up-history-day{font-size:11px;font-weight:800;letter-spacing:.2px;color:#8fa0b8;margin:12px 0 7px;padding:0 2px}.up-history-item{padding:10px 11px;margin-bottom:6px;border:1px solid #2f3d52;border-radius:10px;background:linear-gradient(145deg,#1b2535,#161f2c);box-sizing:border-box}.up-history-meta{display:flex;gap:7px;align-items:center;flex-wrap:wrap;font-size:11px}.up-history-meta>b{font-size:12px;color:#e4ebf5}.up-history-meta>span:first-child{color:#7f8ea4;font-variant-numeric:tabular-nums}.up-history-reason{font-size:11px;color:#aebbd0;margin-top:5px;padding-left:1px}.up-history-status{display:inline-flex;align-items:center;gap:5px;font-weight:750}.up-history-status-dot{width:8px;height:8px;border-radius:50%;display:inline-block;background:currentColor;box-shadow:0 0 7px currentColor}.up-history-status.online{color:#67dda0}.up-history-status.busy{color:#ff7180}.up-history-status.away{color:#b9c4d5}.up-history-empty{font-size:12px;color:#9aa8bc;padding:14px 0}'+
    '.up-login label{display:block;margin:12px 0 5px;font-weight:650}.up-login-fixed{padding:10px;border:1px solid #3a475b;border-radius:8px;background:#111722;color:#edf2fb;font-size:13px}.up-login button{width:100%;margin-top:15px;border:0;border-radius:8px;padding:10px;background:#4f7dff;color:#fff;font-weight:700;cursor:pointer}'+
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
    '#upstatus-root.up-theme-light .up-status-icon.online{color:#168a4d}#upstatus-root.up-theme-light .up-status-icon.busy{color:#c52f48}#upstatus-root.up-theme-light .up-status-icon.away{color:#475569}#upstatus-root.up-theme-light .up-statuses-title{color:#64748b}#upstatus-root.up-theme-light .up-status.online{background:#d9f3e4;color:#168a4d}#upstatus-root.up-theme-light .up-status.busy{background:#f6dce1;color:#b4233d}#upstatus-root.up-theme-light .up-status.away{background:#e4e8ee;color:#475569}'+
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
    '#upstatus-root.up-theme-light .up-settings-menu button{color:#1e293b}#upstatus-root.up-theme-light .up-settings-menu button .up-icon{color:#1e293b}#upstatus-root.up-theme-light .up-settings-menu button:hover{background:#e8edf4}#upstatus-root.up-theme-light .up-login-fixed{background:#fff;border-color:#cbd5e1;color:#1e293b}#upstatus-root.up-theme-light .up-settings-menu .up-settings-notifications.enabled{color:#168a4d}#upstatus-root.up-theme-light .up-settings-menu .up-settings-notifications.denied{color:#c52f48}'+
    '#upstatus-root.up-theme-light .up-settings-btn{background:#e8edf4;color:#334155}'+
    '.up-resize-handle{position:absolute;z-index:200;touch-action:none}.up-resize-n{left:10px;right:10px;top:-5px;height:10px;cursor:ns-resize}.up-resize-s{left:10px;right:10px;bottom:-5px;height:10px;cursor:ns-resize}.up-resize-e{top:10px;bottom:10px;right:-5px;width:10px;cursor:ew-resize}.up-resize-w{top:10px;bottom:10px;left:-5px;width:10px;cursor:ew-resize}.up-resize-ne{right:-5px;top:-5px;width:14px;height:14px;cursor:nesw-resize}.up-resize-nw{left:-5px;top:-5px;width:14px;height:14px;cursor:nwse-resize}.up-resize-se{right:-5px;bottom:-5px;width:14px;height:14px;cursor:nwse-resize}.up-resize-sw{left:-5px;bottom:-5px;width:14px;height:14px;cursor:nesw-resize}'+
    '#upstatus-card{background:linear-gradient(145deg,#1b2535 0%,#151d2a 100%);border-color:#34445c;box-shadow:0 20px 50px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.035)}'+
    '.up-head-identity{display:flex;align-items:center;gap:10px;min-width:0}.up-head-identity>div:last-child{min-width:0}.up-you{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;position:relative;top:-2px}.up-head-avatar{width:34px;height:34px;border-radius:50%;padding:2px;box-sizing:border-box;background:#273247;border:1px solid #3b4a62;flex:0 0 34px}.up-head-avatar-btn{cursor:pointer}.up-head-avatar-img{display:block;width:100%;height:100%;border-radius:50%;object-fit:cover}'+
    '.up-statuses{gap:8px;margin:10px 0 8px}.up-status{flex:1;min-width:0;border:1px solid transparent;border-radius:10px;padding:10px 9px;display:flex;align-items:center;justify-content:center;gap:6px;transition:transform .15s,border-color .15s,box-shadow .15s,background .15s}.up-status:hover{transform:translateY(-1px)}.up-status.active{transform:translateY(-1px);box-shadow:0 0 0 1px currentColor inset,0 6px 18px rgba(0,0,0,.12)}.up-status.active.online{box-shadow:0 0 0 1px #55e58b inset,0 0 16px rgba(85,229,139,.16)}.up-status.active.busy{box-shadow:0 0 0 1px #ff6b7a inset,0 0 16px rgba(255,107,122,.13)}.up-status.active.away{box-shadow:0 0 0 1px #8090a8 inset,0 0 16px rgba(128,144,168,.12)}'+
    '.up-notice{display:flex;align-items:center;gap:8px;margin:0 0 10px;padding:10px 11px;border:1px solid #236b49;border-radius:10px;background:linear-gradient(90deg,#143b2b,#174732);color:#a9edc5}.up-notice .up-icon{width:15px;height:15px}.up-notice-ok{margin-left:auto;width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#35c77a;color:#0e2b1e;font-weight:900;font-size:12px}'+
    '.up-team-title-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:14px 0 8px}.up-team-title{margin:0}.up-team-count{font-size:10px;color:#6f819b;font-weight:700}.up-team{display:flex;flex-direction:column;gap:7px}.up-member{display:flex;align-items:center;gap:9px;padding:9px 9px;margin:0;border:1px solid #2d3a4e;border-radius:12px;background:linear-gradient(145deg,#182332,#141d29);box-shadow:0 5px 16px rgba(0,0,0,.12);transition:border-color .15s,transform .15s,background .15s}.up-member:hover{transform:translateY(-1px);border-color:#40536e;background:#1b2636}.up-member-main{display:flex;align-items:center;gap:9px;min-width:0;flex:1}.up-member-avatar{width:38px;height:38px;flex:0 0 38px;border-radius:50%;object-fit:cover;background:#273247;border:2px solid #59677c;box-sizing:border-box;transition:border-color .18s,box-shadow .18s}.up-member-avatar.presence-active{border-color:#62a7ff;box-shadow:0 0 8px rgba(83,155,255,.58)}.up-member-avatar.presence-chat{border-color:#55e58b;box-shadow:0 0 8px rgba(85,229,139,.42)}.up-member-avatar.presence-offline{border-color:#59677c;box-shadow:none}.up-member-info{min-width:0;flex:1}.up-member-sub{font-size:10.5px;color:#8d9bb0;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.up-member-separator{color:#52627a}.up-member-actions{display:flex;align-items:center;gap:5px;flex:0 0 auto}.up-member-actions .up-member-barui,.up-member-actions .up-member-power{width:30px;height:30px}.up-badge{min-width:52px;text-align:center}.up-member-version{background:#223047;border-color:#3a4b63}.up-update{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;padding:10px 10px;border:1px solid #2c3b52;border-radius:12px;background:linear-gradient(145deg,#151f2e,#121a26);box-sizing:border-box}.up-update-version{display:flex;align-items:center;gap:8px;min-width:0}.up-update-version>.up-icon{width:22px;height:22px;color:#7aa7ff;padding:5px;border-radius:50%;box-sizing:content-box;background:#20304a}.up-update-version b{display:block;font-size:11px;color:#dbe5f5}.up-update-status{display:block;font-size:10px;color:#7f8ea4;margin-top:2px}.up-update-actions{display:flex;align-items:center;gap:5px;flex:0 0 auto}.up-update button{margin:0;padding:6px 8px;border:1px solid #33445c;border-radius:7px;background:#1e2b3f;color:#cbd7e7}.up-update .up-update-check{border-color:#4165a0;color:#a9c7ff}.up-update .up-update-now{background:#4f7dff;border-color:#4f7dff;color:#fff}.up-update .up-update-now:disabled{background:#1b2534;border-color:#2a374a;color:#69788d}'+
    '#upstatus-root.up-theme-light #upstatus-card{background:linear-gradient(145deg,#ffffff 0%,#f5f8fc 100%);border-color:#d3dce8;box-shadow:0 20px 50px rgba(15,23,42,.15),inset 0 1px 0 rgba(255,255,255,.9)}'+
    '#upstatus-root.up-theme-light .up-head-avatar{background:#e8edf4;border-color:#d0d9e6}#upstatus-root.up-theme-light .up-team-count{color:#718096}'+
    '#upstatus-root.up-theme-light .up-status{box-shadow:none}.up-theme-light .up-status.active.online{box-shadow:0 0 0 1px #39bd76 inset,0 5px 14px rgba(16,185,129,.10)}.up-theme-light .up-status.active.busy{box-shadow:0 0 0 1px #e25568 inset,0 5px 14px rgba(225,29,72,.08)}.up-theme-light .up-status.active.away{box-shadow:0 0 0 1px #64748b inset,0 5px 14px rgba(100,116,139,.08)}'+
    '#upstatus-root.up-theme-light .up-notice{border-color:#a9dfc3;background:linear-gradient(90deg,#ecfbf3,#e5f8ee);color:#17633f}.up-theme-light .up-notice-ok{background:#35b974;color:#fff}'+
    '#upstatus-root.up-theme-light .up-team-title-row{border-color:#dbe3ed}#upstatus-root.up-theme-light .up-member{background:linear-gradient(145deg,#ffffff,#f7f9fc);border-color:#dce4ee;box-shadow:0 5px 16px rgba(15,23,42,.06)}#upstatus-root.up-theme-light .up-member:hover{background:#fff;border-color:#c5d2e2}'+
    '#upstatus-root.up-theme-light .up-member-sub{color:#64748b}.up-theme-light .up-member-separator{color:#94a3b8} .up-theme-light .up-member-avatar.presence-offline{border-color:#aab6c5}.up-theme-light .up-member-avatar.presence-active{border-color:#4f8fff}.up-theme-light .up-member-avatar.presence-chat{border-color:#32b96b}.up-theme-light .up-member-version{background:#f1f5f9;border-color:#cbd5e1;color:#64748b}'+
    '#upstatus-root.up-theme-light .up-update{background:linear-gradient(145deg,#ffffff,#f3f6fa);border-color:#dbe3ed}.up-theme-light .up-update-version>.up-icon{background:#eaf1ff;color:#356fe8}.up-theme-light .up-update-version b{color:#1e293b}.up-theme-light .up-update-status{color:#64748b}.up-theme-light .up-update button{background:#eef2f7;border-color:#d5deea;color:#334155}.up-theme-light .up-update .up-update-check{background:#edf4ff;border-color:#a9c5f5;color:#245fc4}.up-theme-light .up-update .up-update-now{background:#4f7dff;border-color:#4f7dff;color:#fff}.up-theme-light .up-update .up-update-now:disabled{background:#edf1f6;border-color:#e0e6ee;color:#9aa7b8}'+
    '#upstatus-root.up-theme-light .up-member-actions .up-member-barui,#upstatus-root.up-theme-light .up-member-actions .up-member-power{background:#edf2f7;color:#334155;border:1px solid #d6dfe9}'+
    '#upstatus-root.up-theme-light .up-member-actions .up-badge.b-online{background:#dff7ea;color:#137044}.up-theme-light .up-member-actions .up-badge.b-busy{background:#ffe5e9;color:#b4233c}.up-theme-light .up-member-actions .up-badge.b-away{background:#e9eef5;color:#475569}'
  });
  style.textContent += '.up-barui-call{position:absolute;right:12px;bottom:12px;width:292px;z-index:95;pointer-events:auto}.up-barui-call.hidden{display:none}.up-barui-call-card{box-sizing:border-box;min-height:62px;padding:7px 8px;border:1px solid #3f5270;border-radius:16px;background:linear-gradient(145deg,rgba(21,30,44,.98),rgba(12,18,29,.98));color:#fff;box-shadow:0 10px 28px rgba(0,0,0,.38),0 0 0 1px rgba(79,125,255,.1);display:flex;align-items:center;gap:8px}.up-barui-call-top{display:flex;align-items:center;gap:7px;min-width:0;flex:1}.up-barui-call-avatar{width:34px;height:34px;flex:0 0 34px;border-radius:50%;object-fit:cover;border:1px solid #4f7dff;box-shadow:0 0 0 3px rgba(79,125,255,.1)}.up-barui-call-person{min-width:0;flex:1}.up-barui-call-name{font-size:11px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.up-barui-call-state{font-size:9px;color:#8fa2bd;margin-top:2px;white-space:nowrap}.up-barui-call-state.connected{color:#69d69a}.up-barui-call-time{min-width:39px;text-align:center;font:800 12px/1 Segoe UI,Arial,sans-serif;font-variant-numeric:tabular-nums;color:#edf3ff}.up-barui-call-actions{display:flex;justify-content:flex-end;align-items:center;gap:5px;flex:0 0 auto}.up-barui-call-btn{width:29px;height:29px;border:0;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:13px;box-shadow:0 3px 8px rgba(0,0,0,.22);transition:transform .15s,filter .15s,background .15s}.up-barui-call-btn:hover{transform:translateY(-1px);filter:brightness(1.08)}.up-barui-call-mic{background:#27364d;color:#e8eef8}.up-barui-call-mic.active{background:#7a2940;color:#fff}.up-barui-call-end{background:#ef4050;color:#fff;width:32px;height:32px}.up-barui-call-incoming{display:flex;gap:4px;flex:0 0 auto}.up-barui-call-incoming button{border:0;border-radius:999px;padding:6px 9px;font:800 9px Segoe UI,Arial,sans-serif;cursor:pointer;white-space:nowrap}.up-barui-call-answer{background:#27c979;color:#071b12}.up-barui-call-reject{background:#3b2630;color:#ffb8c1}.up-barui-call-ringing{display:none}.up-barui-call-card.ringing{animation:upbaruiCallPulse 1.15s infinite alternate}@keyframes upbaruiCallPulse{from{box-shadow:0 10px 28px rgba(0,0,0,.38),0 0 0 1px rgba(255,61,88,.1)}to{box-shadow:0 10px 28px rgba(0,0,0,.38),0 0 0 3px rgba(255,61,88,.16)}}';
  style.textContent += '.up-chat-bubble{position:relative;padding-bottom:8px}.up-chat-own-meta{display:inline-flex;align-items:center;gap:2px;margin-left:6px;vertical-align:baseline;line-height:10px;font-size:10px;float:right;position:relative;top:2px}.up-chat-read{font-size:10px;line-height:10px;letter-spacing:-1px}.up-chat-reactions{clear:both}.up-chat-profile-hover-since{font-size:9px;color:#718096;margin-top:1px}.up-health-ping{font-variant-numeric:tabular-nums;font-weight:700;color:#8fa0b8}.up-health-ping.good{color:#75dba0}.up-health-ping.warn{color:#e7c56a}.up-health-ping.bad{color:#ff8499}.up-health-ping.pending{color:#7f8ea4}.up-health-member{display:flex;align-items:center;justify-content:space-between;gap:8px}.up-health-member .up-health-ping{margin-left:auto}';
  var root=node('div',{id:'upstatus-root'});
  var bubble=node('button',{id:'upstatus-bubble',title:'Abrir UpStatus'});
  var quickChatBubble=node('button',{className:'up-quick-chat-bubble',title:'Abrir Chat da equipe',type:'button','aria-label':'Abrir Chat da equipe'});
  var card=node('section',{id:'upstatus-card',className:'hidden'});
  var history=node('section',{id:'upstatus-history',className:'hidden'});
  var chat=node('section',{id:'upstatus-chat',className:'hidden'});
  var toastStack=node('div',{className:'up-toast-stack'});
  var baruiIncoming=node('div',{className:'up-barui-incoming hidden'});
  var baruiCallOverlay=node('div',{className:'up-barui-call hidden'});
  var baruiCallAudio=document.createElement('audio');baruiCallAudio.autoplay=true;baruiCallAudio.playsInline=true;baruiCallAudio.setAttribute('aria-hidden','true');baruiCallAudio.style.display='none';baruiCallOverlay.appendChild(baruiCallAudio);
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
  root.append(style,bubble,quickChatBubble,card,history,chat,toastStack,baruiIncoming,baruiCallOverlay,remoteOverlay,chatProfileHover,health);
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
    (text.match(/@[\p{L}\p{N}_-]+/gu)||[]).forEach(function(tag){
      var raw=tag.slice(1).toLowerCase();
      var name=(window.__upstatusMembers||[]).find(function(n){return n.toLowerCase()===raw});
      if(name&&found.indexOf(name)<0)found.push(name);
    });
    return found;
  }
  function renderChatText(text){
    var safe=esc(text);
    (window.__upstatusMembers||[]).forEach(function(name){
      var re=new RegExp('(^|[^\\w])(@'+name.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&')+')(?![\\w])','gi');
      safe=safe.replace(re,'$1<span class=\"up-chat-mention\">$2</span>');
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

  function absoluteServerUrl(route){return /^https?:\/\//i.test(route||'')?route:server+String(route||'');}
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
  function sendRealtimeEvent(event,payload){
    if(!realtimeActive||!realtimeChannel)return false;
    try{realtimeChannel.send({type:'broadcast',event:event,payload:payload||{}});return true;}catch(e){return false;}
  }
  function handleRealtimeChatFast(payload){
    var m=payload&&payload.message;
    if(!m||!m.id)return;
    upsertRealtimeMessage(m);
  }
  function handleRealtimeBarui(payload){
    if(!payload||payload.target!==member)return;
    var seq=Number(payload.sequence)||0;
    if(payload.active){
      var startedAt=Date.parse(payload.startedAt)||Date.now();
      if(!baruiState.active||baruiState.sequence!==seq){
        baruiState={active:true,sequence:seq,target:member,sender:payload.sender||'Alguém',startedAt:startedAt};
        playBaruiAlert();baruiLastBeep=Date.now();
        showIncomingBarui(payload.sender||'Alguém');
        if(baruiExternalNotifiedSequence!==seq){
          baruiExternalNotifiedSequence=seq;
          showExternalNotification('barui',{sequence:seq,sender:payload.sender||'Alguém'});
        }
      }
      updateBaruiTitle(true);
    }else if(baruiState.active&&(!seq||seq===baruiState.sequence)&&!(baruiCall.active&&baruiCall.answered)){
      stopLocalBarui();
    }
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
        .on('broadcast',{event:'chat_fast'},function(payload){handleRealtimeChatFast(payload&&payload.payload||{});})
        .on('broadcast',{event:'barui_event'},function(payload){handleRealtimeBarui(payload&&payload.payload||{});})
        .on('broadcast',{event:'barui_call'},function(payload){handleBaruiCallSignal(payload&&payload.payload||{});})
        .on('broadcast',{event:'user_status'},function(){refresh();})
        .on('broadcast',{event:'chat_presence'},function(payload){var p=payload&&payload.payload||{};if(!p.name)return;chatPresence[p.name]=p.open?Date.now()+25000:0;updateChatHeaderPresence();if(!chat.classList.contains('hidden'))renderChat();})
        .on('broadcast',{event:'health_ping'},function(payload){handleHealthPing(payload&&payload.payload||{});})
        .on('broadcast',{event:'health_pong'},function(payload){handleHealthPong(payload&&payload.payload||{});})
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
  function chatDraftKey(){return key+'chat_draft_'+String(member||'').toLowerCase();}
  function saveChatDraft(input){input=input||chat.querySelector('.up-chat-input');if(!input||!member)return;try{GM_setValue(chatDraftKey(),String(input.value||''));}catch(e){}}
  function restoreChatDraft(input){if(!input||!member)return;try{var draft=String(GM_getValue(chatDraftKey(),'')||'');if(draft&&!String(input.value||'')){input.value=draft;input.setSelectionRange(input.value.length,input.value.length);}}catch(e){}}
  function clearChatDraft(){if(!member)return;try{GM_setValue(chatDraftKey(),'');}catch(e){}}
  function handleTypingInput(){var input=chat.querySelector('.up-chat-input');if(!input)return;saveChatDraft(input);if(String(input.value||'').trim()){startTypingHeartbeat();if(typingStopTimer)clearTimeout(typingStopTimer);typingStopTimer=setTimeout(function(){stopTypingHeartbeat();},4500);}else stopTypingHeartbeat();}
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
     var person=profilePresencePerson(name);
     var presence=profilePresenceState(name,person);
     var presenceLabel=presence==='chat'?'No bate-papo':presence==='active'?'UpStatus Ativo':'Offline';
     var offlineSince=presence==='offline'&&person&&person.seenAt?fmtTime(person.seenAt):'';
     chatProfileHover.innerHTML='<img alt=""><div class="up-chat-profile-hover-name">'+esc(name)+'</div><div class="up-chat-profile-hover-role">'+presenceLabel+'</div>'+(offlineSince?'<div class="up-chat-profile-hover-since">desde '+esc(offlineSince)+'</div>':'');
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

   function profilePresenceState(name,person){
     var team=window.__upstatusTeam||{};
     person=person||team[name]||Object.keys(team).map(function(k){return team[k];}).find(function(x){return x&&x.name===name;});
     if(chatPresence[name]&&chatPresence[name]>Date.now())return 'chat';
     if(person&&person.connected!==false)return 'active';
     return 'offline';
   }
   function profilePresencePerson(name){
     var team=window.__upstatusTeam||{};
     return team[name]||Object.keys(team).map(function(k){return team[k];}).find(function(x){return x&&x.name===name;})||null;
   }
   function chatAvatarPresence(name){
     var state=profilePresenceState(name);
     return state==='chat'?'up-chat-presence-active':state==='active'?'up-chat-presence-idle':'up-chat-presence-offline';
   }
  function chatDateKey(iso){var d=new Date(iso);return isNaN(d.getTime())?'':d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate();}
  function chatDateLabel(iso){var d=new Date(iso);if(isNaN(d.getTime()))return '';var now=new Date();var yesterday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1);if(d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()&&d.getDate()===now.getDate())return 'Hoje, '+d.toLocaleDateString('pt-BR',{day:'2-digit',month:'long'});if(d.getFullYear()===yesterday.getFullYear()&&d.getMonth()===yesterday.getMonth()&&d.getDate()===yesterday.getDate())return 'Ontem, '+d.toLocaleDateString('pt-BR',{day:'2-digit',month:'long'});return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});}
  function updateChatHeaderPresence(){var el=chat.querySelector('.up-chat-header-info');if(!el)return;var team=window.__upstatusTeam||{};var names=Object.keys(team);var online=names.filter(function(n){return team[n]&&team[n].connected!==false;}).length;var inChat=names.filter(function(n){return chatPresence[n]&&chatPresence[n]>Date.now();}).length;el.innerHTML='<span class="chat-online-dot">●</span> '+online+' online · '+inChat+' no bate-papo';}
  function setupChatAudioPlayer(el,url){if(!el||!url)return;var audio=new Audio(url);audio.preload='metadata';audio.volume=.85;var play=el.querySelector('.up-chat-audio-play'),time=el.querySelector('.up-chat-audio-time'),wave=el.querySelector('.up-chat-audio-wave'),vol=el.querySelector('.up-chat-audio-volume'),duration=0;function fmt(s){s=Number(s);if(!isFinite(s)||s<0)return'--:--';s=Math.floor(s);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}function setDuration(v){v=Number(v);if(isFinite(v)&&v>0){duration=v;time.textContent=fmt(audio.currentTime)+' / '+fmt(duration);return true}return false}function resolveDuration(){if(setDuration(audio.duration))return;try{var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;fetch(url).then(function(r){return r.arrayBuffer()}).then(function(buf){var ctx=new AC();return ctx.decodeAudioData(buf).then(function(decoded){setDuration(decoded.duration);try{ctx.close()}catch(e){}})}).catch(function(){})}catch(e){}}function draw(){if(!wave)return;wave.innerHTML='';for(var i=0;i<34;i++){var h=5+((i*17)%17);var s=document.createElement('span');s.style.height=h+'px';wave.appendChild(s);}}draw();play.onclick=function(e){e.preventDefault();if(audio.paused){audio.play().then(function(){play.textContent='❚❚';}).catch(function(){})}else{audio.pause();play.textContent='▶'}};audio.addEventListener('loadedmetadata',resolveDuration);audio.addEventListener('durationchange',resolveDuration);audio.addEventListener('timeupdate',function(){var d=duration||audio.duration;time.textContent=fmt(audio.currentTime)+(isFinite(d)&&d>0?' / '+fmt(d):'');var spans=wave?wave.querySelectorAll('span'):[];var pct=isFinite(d)&&d>0?Math.min(1,audio.currentTime/d):0;spans.forEach(function(s,i){s.style.opacity=i/spans.length<=pct?'1':'.35';});});audio.addEventListener('ended',function(){play.textContent='▶';time.textContent=fmt(duration||audio.duration);});if(vol)vol.onclick=function(){audio.muted=!audio.muted;vol.innerHTML=iconSvg('sound');vol.style.opacity=audio.muted?'.45':'1';};el._upAudio=audio;resolveDuration();}
  function renderChat(){
    var list=chat.querySelector('.up-chat-list');if(!list)return;
    var wasAtBottom=(list.scrollHeight-list.scrollTop-list.clientHeight)<28;var previousScrollTop=list.scrollTop;
    updateChatHeaderPresence();
    if(!chatCache.length){list.innerHTML='<div class="up-history-empty">Nenhuma mensagem nas últimas 48 horas.</div>';return;}
    var html='',lastDate='';
    chatCache.forEach(function(m,idx){
      var day=chatDateKey(m.createdAt);if(day&&day!==lastDate){html+='<div class="up-chat-date-divider"><span>'+esc(chatDateLabel(m.createdAt))+'</span></div>';lastDate=day;}
      if(m.type==='system'){html+='<div class="up-chat-system-event '+(m.systemType==='lucca_join'?'join':(m.systemType==='chat_clear'?'clear':'leave'))+'"><span>'+esc(m.message)+'</span></div>';return;}
      var own=m.user===member,prev=idx>0?chatCache[idx-1]:null,next=idx<chatCache.length-1?chatCache[idx+1]:null;
      var samePrev=!!prev&&prev.type!=='system'&&prev.user===m.user&&chatDateKey(prev.createdAt)===day,sameNext=!!next&&next.type!=='system'&&next.user===m.user&&chatDateKey(next.createdAt)===day;
      var groupStart=!samePrev,groupEnd=!sameNext;
      var avatar='<img class="up-chat-avatar '+chatAvatarPresence(m.user)+(groupEnd?'':' avatar-hidden')+'" data-avatar-name="'+esc(m.user)+'" alt="'+esc(m.user)+'">',body='';
      if(m.imageUrl){if(m.type==='video')body='<video class="up-chat-media up-chat-media-video" data-media-route="'+esc(m.imageUrl)+'" controls preload="metadata"></video>';else if(m.type==='audio')body='<div class="up-chat-audio-player" data-media-route="'+esc(m.imageUrl)+'"><button type="button" class="up-chat-audio-play" aria-label="Reproduzir áudio">▶</button><div class="up-chat-audio-wave"></div><span class="up-chat-audio-time">0:00</span><button type="button" class="up-chat-audio-volume" aria-label="Volume">'+iconSvg('sound')+'</button></div>';else body='<img class="up-chat-photo" data-media-route="'+esc(m.imageUrl)+'" alt="Imagem enviada por '+esc(m.user)+'" loading="lazy">';}
      else if(m.message)body='<div class="up-chat-text">'+renderChatText(m.message)+'</div>';
      var readers=Array.isArray(m.readBy)?m.readBy.filter(function(n){return n!==member;}):[],title=readers.length?'Lido por: '+readers.join(', '):'Não lido ainda',tick=own?'<span class="up-chat-read '+(readers.length?'read':'')+'" data-readers="'+esc(title)+'">✓✓</span>':'';
      var meta=groupStart?'<div class="up-chat-meta"><b>'+esc(m.user)+'</b><span>'+fmtTime(m.createdAt)+'</span></div>':'';
      var bubble='<div class="up-chat-bubble">'+replyPreview(m)+meta+body+(own?'<span class="up-chat-own-meta">'+tick+'</span>':'')+'<div class="up-chat-reactions">'+renderReactions(m)+'</div></div>';
      html+='<div class="up-chat-item '+(own?'own ':'')+(m.user==='Lucca'?'lucca ':'')+(groupStart?'group-start ':'')+(groupEnd?'group-end ':'')+(!groupStart&&!groupEnd?'group-middle ':'')+'" data-message-id="'+esc(m.id)+'">'+avatar+bubble+(own?'<button type="button" class="up-delete-action hidden">'+iconSvg('trash')+'</button>':'')+'</div>';
    });
    list.innerHTML=html;
    list.querySelectorAll('[data-avatar-name]').forEach(function(img){hydrateAvatar(img,img.getAttribute('data-avatar-name'));});
    list.querySelectorAll('[data-avatar-name]').forEach(function(img){var name=img.getAttribute('data-avatar-name')||'';img.addEventListener('mouseenter',function(e){showChatProfileHover(img,name,e);});img.addEventListener('mousemove',positionChatProfileHover);img.addEventListener('mouseleave',hideChatProfileHover);});
    list.querySelectorAll('[data-media-route]').forEach(function(el){var route=el.getAttribute('data-media-route')||'',key='chat:'+route;loadBlobUrl(route,key).then(function(url){if(el.classList.contains('up-chat-audio-player'))setupChatAudioPlayer(el,url);else el.src=url;}).catch(function(){});if(!el.classList.contains('up-chat-audio-player'))el.addEventListener('load',function(){if(wasAtBottom)requestAnimationFrame(function(){list.scrollTop=list.scrollHeight;});});});
    list.querySelectorAll('.up-chat-photo').forEach(function(img){img.addEventListener('click',function(){openChatLightbox(img.src);});});
    list.querySelectorAll('.up-chat-read').forEach(function(tick){tick.addEventListener('mouseenter',function(e){readTooltip.textContent=tick.getAttribute('data-readers')||'Não lido ainda';readTooltip.classList.add('show');positionReadTooltip(e);});tick.addEventListener('mousemove',positionReadTooltip);tick.addEventListener('mouseleave',function(){readTooltip.classList.remove('show');});});
    list.querySelectorAll('.up-chat-item').forEach(function(item){item.addEventListener('contextmenu',function(e){e.preventDefault();e.stopPropagation();var id=item.getAttribute('data-message-id');var msg=chatCache.find(function(x){return x.id===id;});if(msg)openChatContextMenu(e,msg);});});
    list.querySelectorAll('.up-chat-reaction').forEach(function(btn){btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var item=btn.closest('.up-chat-item'),id=item&&item.getAttribute('data-message-id'),em=btn.getAttribute('data-reaction');if(id&&em)toggleChatReaction(id,em);});});
    list.querySelectorAll('.up-chat-item.own').forEach(function(item){var del=item.querySelector('.up-delete-action');if(del)del.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var id=item.getAttribute('data-message-id');if(!id)return;del.disabled=true;api('DELETE','/api/chat/'+encodeURIComponent(id)).then(function(){chatCache=chatCache.filter(function(m){return m.id!==id;});renderChat();}).catch(function(err){del.disabled=false;message(err.message,true);});});});
    list.onclick=function(e){if(e.target.closest&&e.target.closest('.up-delete-action'))return;list.querySelectorAll('.up-delete-action').forEach(function(b){b.classList.add('hidden')});};
    chatLastRenderKey=chatDataKey(chatCache);
    requestAnimationFrame(function(){list.scrollTop=wasAtBottom?list.scrollHeight:previousScrollTop;});
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
    var match=before.match(/(?:^|\s)@([\p{L}\p{N}_-]*)$/u);
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
    var match=before.match(/(?:^|\s)@([\p{L}\p{N}_-]*)$/u);
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
  function baruiCallElapsed(){if(!baruiCall.connectedAt)return '00:00';var sec=Math.max(0,Math.floor((Date.now()-baruiCall.connectedAt)/1000)),m=Math.floor(sec/60),ss=sec%60;return String(m).padStart(2,'0')+':'+String(ss).padStart(2,'0');}
  function updateBaruiCallUI(state){var cardEl=baruiCallOverlay.querySelector('.up-barui-call-card');if(!cardEl)return;var stateEl=baruiCallOverlay.querySelector('.up-barui-call-state'),timeEl=baruiCallOverlay.querySelector('.up-barui-call-time'),mic=baruiCallOverlay.querySelector('.up-barui-call-mic'),end=baruiCallOverlay.querySelector('.up-barui-call-end'),incoming=baruiCallOverlay.querySelector('.up-barui-call-incoming');if(stateEl){stateEl.textContent=state==='ringing'?'Chamada recebida':state==='calling'?'Chamando…':state==='connecting'?'Conectando…':state==='connected'?'Conectado':'Chamada encerrada';stateEl.classList.toggle('connected',state==='connected');}if(timeEl)timeEl.textContent=state==='connected'?baruiCallElapsed():'00:00';if(mic){mic.textContent=baruiCall.muted?'🔇':'🎙️';mic.title=baruiCall.muted?'Ativar microfone':'Mutar microfone';mic.classList.toggle('active',baruiCall.muted);mic.style.display=(state==='connected'||state==='connecting')?'flex':'none';}if(end)end.style.display=state==='ringing'?'none':'flex';if(incoming)incoming.style.display=state==='ringing'?'flex':'none';cardEl.classList.toggle('ringing',state==='ringing');}
  function showBaruiCallUI(state,target,sequence){
    var old=baruiCall;
    var role=state==='ringing'?'receiver':'caller';
    var sameCall=!!(old&&old.active&&old.target===String(target||'')&&old.role===role);
    var keepStream=sameCall?old.localStream:null;
    var keepPc=sameCall?old.pc:null;
    var keepRemote=sameCall?old.remoteStream:null;
    var keepConnected=sameCall?old.connectedAt:0;
    var keepTimer=sameCall?old.timer:null;
    var keepMuted=sameCall?old.muted:false;
    var keepAnswered=sameCall?old.answered:false;
    var keepIce=sameCall?(old.pendingIce||[]):[];
    baruiCallOverlay.classList.remove('hidden');
    baruiCallOverlay.innerHTML='<div class="up-barui-call-card '+(state==='ringing'?'ringing':'')+'"><div class="up-barui-call-top"><img class="up-barui-call-avatar" alt="Foto"><div class="up-barui-call-person"><div class="up-barui-call-name">'+esc(target||'Alguém')+'</div><div class="up-barui-call-state"></div></div></div><div class="up-barui-call-time">00:00</div><div class="up-barui-call-actions"><button type="button" class="up-barui-call-btn up-barui-call-mic" title="Mutar microfone">🎙️</button><button type="button" class="up-barui-call-btn up-barui-call-end" title="Desligar">☎</button></div><div class="up-barui-call-incoming"><button type="button" class="up-barui-call-answer">Atender</button><button type="button" class="up-barui-call-reject">Recusar</button></div><div class="up-barui-call-ringing">Ligação rápida do UpStatus</div></div>';
    baruiCall={active:true,role:role,target:target||'',sequence:Number(sequence)||0,pc:keepPc,localStream:keepStream,remoteStream:keepRemote,audio:baruiCallAudio,connectedAt:keepConnected,timer:keepTimer,muted:keepMuted,answered:keepAnswered,pendingIce:keepIce};
    var img=baruiCallOverlay.querySelector('.up-barui-call-avatar');if(img)hydrateAvatar(img,target||'');
    var mic=baruiCallOverlay.querySelector('.up-barui-call-mic');if(mic)mic.onclick=function(e){e.stopPropagation();toggleBaruiCallMute();};
    var end=baruiCallOverlay.querySelector('.up-barui-call-end');if(end)end.onclick=function(e){e.stopPropagation();endBaruiCall(true,'ended');};
    var answer=baruiCallOverlay.querySelector('.up-barui-call-answer');if(answer)answer.onclick=function(e){e.stopPropagation();acceptBaruiCall();};
    var reject=baruiCallOverlay.querySelector('.up-barui-call-reject');if(reject)reject.onclick=function(e){e.stopPropagation();rejectBaruiCall();};
    updateBaruiCallUI(state);
  }
    function clearBaruiCallTimer(){if(baruiCall.timer){clearInterval(baruiCall.timer);baruiCall.timer=null;}}
  function closeBaruiCall(notify,reason){var c=baruiCall;if(notify&&c.active&&c.target&&c.sequence)sendRealtimeEvent('barui_call',{type:'end',target:c.target,sender:member,sequence:c.sequence,reason:reason||'ended'});clearBaruiCallTimer();try{if(c.localStream)c.localStream.getTracks().forEach(function(t){try{t.stop()}catch(e){}});}catch(e){}try{if(c.pc)c.pc.close();}catch(e){}try{if(c.audio){c.audio.pause();c.audio.srcObject=null;}}catch(e){}baruiCall={active:false,role:'',target:'',sequence:0,pc:null,localStream:null,remoteStream:null,audio:baruiCallAudio,connectedAt:0,timer:null,muted:false,answered:false,pendingIce:[]};baruiCallOverlay.classList.add('hidden');baruiCallOverlay.innerHTML='';baruiCallOverlay.appendChild(baruiCallAudio);}
  function endBaruiCall(notify,reason){var c=baruiCall;closeBaruiCall(notify,reason||'ended');if(c.active&&c.target){if(c.role==='caller')api('POST','/api/barui',{target:c.target,active:false}).catch(function(){});else api('POST','/api/barui/stop-incoming',{}).catch(function(){})}}
  function rejectBaruiCall(){if(!baruiCall.active)return;var c=baruiCall;sendRealtimeEvent('barui_call',{type:'reject',target:c.target,sender:member,sequence:c.sequence});stopIncomingBarui();closeBaruiCall(false,'rejected');}
  function toggleBaruiCallMute(){if(!baruiCall.localStream)return;var track=baruiCall.localStream.getAudioTracks()[0];if(!track)return;baruiCall.muted=!track.enabled;track.enabled=!baruiCall.muted;updateBaruiCallUI(baruiCall.connectedAt?'connected':'connecting');}
  function createBaruiPeer(){if(typeof RTCPeerConnection==='undefined'){message('Seu navegador não suporta chamadas de voz.',true);return null;}var pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}]});pc.onicecandidate=function(e){if(e.candidate)sendRealtimeEvent('barui_call',{type:'ice',target:baruiCall.target,sender:member,sequence:baruiCall.sequence,candidate:e.candidate.toJSON?e.candidate.toJSON():e.candidate});};pc.ontrack=function(e){var stream=e.streams&&e.streams[0]?e.streams[0]:null;if(!stream)return;baruiCall.remoteStream=stream;baruiCall.audio.srcObject=stream;var p=baruiCall.audio.play();if(p&&p.catch)p.catch(function(){});};pc.onconnectionstatechange=function(){var st=pc.connectionState;if(st==='connected'){if(!baruiCall.connectedAt)baruiCall.connectedAt=Date.now();clearBaruiCallTimer();baruiCall.timer=setInterval(function(){if(baruiCall.active)updateBaruiCallUI('connected');},500);updateBaruiCallUI('connected');}else if(st==='failed'&&baruiCall.active){endBaruiCall(true,'connection_failed');}};return pc;}
  function addBaruiLocalStream(pc,stream){stream.getTracks().forEach(function(track){pc.addTrack(track,stream);});baruiCall.localStream=stream;}
  function flushBaruiIce(){var pc=baruiCall.pc;if(!pc||!pc.remoteDescription)return;baruiCall.pendingIce.splice(0).forEach(function(c){pc.addIceCandidate(c).catch(function(){});});}
  async function prepareBaruiMedia(){if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error('Microfone indisponível neste contexto do navegador.');return await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});}
  async function acceptBaruiCall(){if(!baruiCall.active||baruiCall.role!=='receiver')return;var c=baruiCall;try{baruiCall.answered=true;baruiLastBeep=Date.now();updateBaruiCallUI('connecting');c.pc=createBaruiPeer();if(!c.pc)throw new Error('Não foi possível criar a conexão.');var stream=await prepareBaruiMedia();if(!baruiCall.active){stream.getTracks().forEach(function(t){t.stop()});return;}addBaruiLocalStream(c.pc,stream);sendRealtimeEvent('barui_call',{type:'accept',target:c.target,sender:member,sequence:c.sequence});baruiIncoming.classList.add('hidden');}catch(e){message(e&&e.message?e.message:'Não foi possível acessar o microfone.',true);sendRealtimeEvent('barui_call',{type:'reject',target:c.target,sender:member,sequence:c.sequence});stopIncomingBarui();closeBaruiCall(false,'microphone_error');}}
  async function startBaruiCaller(target,sequence){
    if(!baruiCall.active||baruiCall.role!=='caller')return;
    try{
      baruiCall.answered=true;
      updateBaruiCallUI('connecting');
      var c=baruiCall;
      c.pc=createBaruiPeer();
      if(!c.pc)throw new Error('Não foi possível criar a conexão.');
      var stream=c.localStream;
      if(!stream)stream=await prepareBaruiMedia();
      if(!baruiCall.active){
        if(!c.localStream&&stream)stream.getTracks().forEach(function(t){t.stop()});
        return;
      }
      if(!c.localStream)addBaruiLocalStream(c.pc,stream);
      else stream.getTracks().forEach(function(track){c.pc.addTrack(track,stream);});
      var offer=await c.pc.createOffer();
      await c.pc.setLocalDescription(offer);
      sendRealtimeEvent('barui_call',{type:'offer',target:target,sender:member,sequence:sequence,sdp:c.pc.localDescription});
    }catch(e){
      message(e&&e.message?e.message:'Não foi possível iniciar a chamada.',true);
      endBaruiCall(true,'negotiation_error');
      api('POST','/api/barui',{target:target,active:false}).catch(function(){});
    }
  }
    async function handleBaruiCallSignal(payload){if(!payload||payload.target!==member)return;if(!baruiCall.active&&payload.type!=='end'&&payload.type!=='reject')return;if(payload.sequence&&baruiCall.sequence&&Number(payload.sequence)!==Number(baruiCall.sequence))return;if(payload.type==='accept'&&baruiCall.role==='caller'){startBaruiCaller(payload.sender,Number(payload.sequence)||baruiCall.sequence);return;}if(payload.type==='offer'&&baruiCall.role==='receiver'){try{if(!baruiCall.pc){baruiCall.pc=createBaruiPeer();if(!baruiCall.pc)throw new Error('Conexão indisponível.');}await baruiCall.pc.setRemoteDescription(payload.sdp);flushBaruiIce();var answer=await baruiCall.pc.createAnswer();await baruiCall.pc.setLocalDescription(answer);sendRealtimeEvent('barui_call',{type:'answer',target:payload.sender,sender:member,sequence:baruiCall.sequence,sdp:baruiCall.pc.localDescription});}catch(e){endBaruiCall(true,'negotiation_error');}return;}if(payload.type==='answer'&&baruiCall.role==='caller'&&baruiCall.pc){try{await baruiCall.pc.setRemoteDescription(payload.sdp);flushBaruiIce();}catch(e){endBaruiCall(true,'negotiation_error');}return;}if(payload.type==='ice'){if(!baruiCall.pc)return;if(baruiCall.pc.remoteDescription)baruiCall.pc.addIceCandidate(payload.candidate).catch(function(){});else baruiCall.pendingIce.push(payload.candidate);return;}if(payload.type==='reject'||payload.type==='end'){closeBaruiCall(false,payload.reason||payload.type);if(baruiState.active)stopLocalBarui();}}
  function hideIncomingBarui(){
    baruiIncoming.classList.add('hidden');
    baruiIncoming.innerHTML='';
  }
  function stopIncomingBarui(){
    if(!baruiState.active)return;
    api('POST','/api/barui/stop-incoming',{}).then(function(r){sendRealtimeEvent('barui_event',{target:member,active:false,sender:member,sequence:r&&r.sequence||baruiState.sequence});stopLocalBarui();}).catch(function(e){message(e.message,true)});
  }
  function showIncomingBarui(sender){
    var name=String(sender||'Alguém'),seq=Number(baruiState.sequence)||Date.now();
    if(baruiCall.active&&baruiCall.sequence===seq)return;
    baruiIncoming.classList.add('hidden');showBaruiCallUI('ringing',name,seq);
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
      btn.title=active?'Desligar ligação para '+target:'Ligar para '+target;
      btn.setAttribute('aria-label',btn.title);
    });
  }
  function playBaruiAlert(){playMentionAlert();}
  function stopLocalBarui(){
    if(baruiCall.active)closeBaruiCall(false,'barui_stopped');
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
          if(!baruiCall.active||!baruiCall.answered){if(Date.now()-baruiLastBeep>=1200){playBaruiAlert();baruiLastBeep=Date.now();}}
        }
      }else if(baruiState.active){stopLocalBarui();}
      if(active&&Date.now()-baruiState.startedAt>=30000&&baruiCall.role==='receiver'&&!baruiCall.answered){stopLocalBarui();return;}
      updateBaruiTitle(active);
      baruiOutgoing=d.outgoingActive?{active:true,target:d.outgoingTarget||''}:{active:false,target:''};
      updateOutgoingBaruiUI();
    }).catch(function(){}).finally(function(){baruiPolling=false;});
  }
  async function sendBaruiTo(target){
    if(!target||target===member)return;
    var btn=card.querySelector('.up-member-barui[data-target="'+CSS.escape(target)+'"]');
    if(btn)btn.disabled=true;
    try{
      showBaruiCallUI('calling',target,Date.now());
      var stream=await prepareBaruiMedia();
      if(!baruiCall.active){
        stream.getTracks().forEach(function(t){t.stop()});
        return;
      }
      baruiCall.localStream=stream;
      var stopOld=baruiOutgoing.active&&baruiOutgoing.target&&baruiOutgoing.target!==target
        ?api('POST','/api/barui',{target:baruiOutgoing.target,active:false})
        :Promise.resolve();
      var r=await stopOld.then(function(){return api('POST','/api/barui',{target:target,active:true});});
      baruiCall.sequence=Number(r&&r.sequence)||baruiCall.sequence;
      sendRealtimeEvent('barui_event',{target:target,active:true,sender:member,startedAt:r&&r.startedAt,sequence:r&&r.sequence});
      baruiOutgoing={active:true,target:target};
      updateOutgoingBaruiUI();
    }catch(e){
      if(baruiCall.active)closeBaruiCall(false,'microphone_error');
      message(e&&e.message?e.message:'Não foi possível iniciar a chamada. Verifique o acesso ao microfone.',true);
    }finally{
      if(btn)btn.disabled=false;
    }
  }
    function stopOutgoingBarui(){
    var target=baruiOutgoing.target;if(!target)return;
    if(baruiCall.active&&baruiCall.role==='caller'&&baruiCall.target===target)endBaruiCall(true,'ended');
    var btn=card.querySelector('.up-member-barui[data-target=\"'+CSS.escape(target)+'\"]');
    if(btn)btn.disabled=true;
    api('POST','/api/barui',{target:target,active:false}).then(function(r){
      sendRealtimeEvent('barui_event',{target:target,active:false,sender:member,sequence:r&&r.sequence||0});
      baruiOutgoing={active:false,target:''};updateOutgoingBaruiUI();
    }).catch(function(e){message(e.message,true)}).finally(function(){if(btn)btn.disabled=false});
  }
  function positionReadTooltip(e){var x=(e.clientX||0)+12,y=(e.clientY||0)+12;var w=readTooltip.offsetWidth,h=readTooltip.offsetHeight;if(x+w>window.innerWidth-8)x=Math.max(8,(e.clientX||0)-w-12);if(y+h>window.innerHeight-8)y=Math.max(8,(e.clientY||0)-h-12);readTooltip.style.left=x+'px';readTooltip.style.top=y+'px';}
  function toggleBarui(target){
    if(baruiOutgoing.active&&baruiOutgoing.target===target){stopOutgoingBarui();return;}
    sendBaruiTo(target);
  }

  function closeChat(){
    if(!chat.classList.contains('hidden')){
      saveChatDraft();
      hideChatContextMenu();
      stopTypingHeartbeat();
      broadcastChatPresence(false);
    }
    chat.classList.add('hidden');
    card.classList.add('hidden');
    history.classList.add('hidden');
    health.classList.add('hidden');
    remoteOverlay.classList.add('hidden');
    stopHealthMonitor();
  }

  function openChat(){
    if(!token)return;
    chatReplyTo=null;chatContextMessageId=null;
    chat.classList.remove('hidden');card.classList.add('hidden');history.classList.add('hidden');broadcastChatPresence(true);refresh();
    chat.innerHTML='<div class="up-history-head"><div class="up-chat-title-wrap"><button type="button" class="up-chat-profile-btn" title="Alterar foto de perfil"><img alt="Minha foto"></button><div><div class="up-history-title">Chat da equipe</div><div class="up-chat-header-info"><span class="chat-online-dot">●</span> 0 online · 0 no bate-papo</div></div></div><div style="display:flex;gap:6px;align-items:center">'+(member==='Ricardo'?'<button class="up-chat-clear" type="button" title="Limpar chat">'+iconSvg('trash')+'</button>':'')+'<button class="up-chat-back" type="button">← Voltar</button></div></div><div class="up-chat-lucca-alert hidden">🔴 ALERTA DE LUCCA MALUCO</div><div class="up-chat-list">Carregando…</div><div class="up-chat-typing hidden"></div><div class="up-chat-context-menu"></div><div class="up-chat-compose"><div class="up-chat-reply-bar hidden"><div class="up-chat-reply-copy"></div><button type="button" class="up-chat-reply-close">×</button></div><div class="up-mention-menu hidden"></div><div class="up-chat-emoji-menu hidden"></div><div class="up-chat-recording-label">Gravando <span class="up-chat-recording-time">0:00</span> • clique novamente para enviar</div><div class="up-chat-input-wrap"><textarea class="up-chat-input" maxlength="1000" placeholder="Digite uma mensagem"></textarea><button type="button" class="up-chat-send" title="Enviar mensagem" aria-label="Enviar mensagem">'+iconSvg('send')+'</button></div><div class="up-chat-tools"><button type="button" class="up-chat-emoji-btn" title="Emojis" aria-label="Emojis">'+iconSvg('emoji')+'</button><button type="button" class="up-chat-attach" title="Enviar foto, GIF ou vídeo" aria-label="Enviar foto, GIF ou vídeo">'+iconSvg('photo')+'</button><button type="button" class="up-chat-record" title="Gravar áudio (até 30 segundos)" aria-label="Gravar áudio">🎙</button><input class="up-chat-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" hidden></div></div><div class="up-chat-lightbox hidden"><button type="button" class="up-chat-lightbox-close" aria-label="Fechar">×</button><img alt="Imagem ampliada"></div>';
    var profileBtn=chat.querySelector('.up-chat-profile-btn');if(profileBtn){hydrateAvatar(profileBtn.querySelector('img'),member);profileBtn.onclick=function(e){e.stopPropagation();openProfileModal();};profileBtn.addEventListener('mouseenter',function(e){showChatProfileHover(profileBtn.querySelector('img'),member,e);});profileBtn.addEventListener('mousemove',positionChatProfileHover);profileBtn.addEventListener('mouseleave',hideChatProfileHover);}
    var input=chat.querySelector('.up-chat-input'),photoBtn=chat.querySelector('.up-chat-attach'),photoFile=chat.querySelector('.up-chat-file'),emojiBtn=chat.querySelector('.up-chat-emoji-btn'),emojiMenu=chat.querySelector('.up-chat-emoji-menu'),recordBtn=chat.querySelector('.up-chat-record');
    restoreChatDraft(input);
    photoBtn.onclick=function(e){e.stopPropagation();photoFile.click()};
    photoFile.addEventListener('change',function(){if(photoFile.files&&photoFile.files[0])sendChatMedia(photoFile.files[0])});
    setupEmojiPicker(emojiBtn,emojiMenu,input);
    if(recordBtn)recordBtn.onclick=function(e){e.stopPropagation();toggleAudioRecording(recordBtn);};
    input.addEventListener('paste',function(e){var items=e.clipboardData&&e.clipboardData.items?Array.from(e.clipboardData.items):[];var item=items.find(function(x){return x.kind==='file'&&/^image\//i.test(x.type)});if(item){var file=item.getAsFile();if(file){e.preventDefault();sendChatMedia(file);}}});
    chat.querySelector('.up-chat-reply-close').onclick=function(e){e.stopPropagation();setChatReply(null);};document.addEventListener('click',function(e){var menu=chat.querySelector('.up-chat-context-menu');if(menu&&menu.classList.contains('show')&&!menu.contains(e.target))hideChatContextMenu();});chat.querySelector('.up-chat-back').onclick=function(e){e.stopPropagation();closeChat();};
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
  function sendChatAudioData(dataUrl){var send=chat.querySelector('.up-chat-send'),record=chat.querySelector('.up-chat-record');if(send)send.disabled=true;if(record)record.disabled=true;var raw=String(dataUrl||'');var match=raw.match(/^data:(audio\/[^;,]+)(?:;[^,]*)?;base64,/i);if(!match){if(send)send.disabled=false;if(record)record.disabled=false;message('Áudio inválido.',true);return;}api('POST','/api/chat/audio',{dataUrl:raw}).then(function(r){return api('POST','/api/chat',{message:'',imageUrl:r.imageUrl,type:'audio',replyTo:chatReplyTo});}).then(function(){chatReplyTo=null;setChatReply(null);stopTypingHeartbeat();return refreshChatAfterSend(null,send);}).catch(function(e){if(send)send.disabled=false;message(e.message,true);}).finally(function(){if(record)record.disabled=false;});
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
        clearChatDraft();
        sendRealtimeEvent('chat_fast',{message:created});
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
    var typeOk=allowVideo?/^(image\/(png|jpe?g|webp|gif)|video\/(mp4|webm))$/i.test(type):/^image\/(png|jpe?g|webp|gif)$/i.test(type);
    var mime=typeOk?type:extMime;
    var ok=allowVideo?/^(image\/(png|jpe?g|webp|gif)|video\/(mp4|webm))$/i.test(mime):/^image\/(png|jpe?g|webp|gif)$/i.test(mime);
    return {mime:mime,ext:ext,ok:ok};
  }
  function fileToDataUrl(file){return new Promise(function(resolve,reject){if(!file){reject(new Error('Nenhum arquivo selecionado.'));return;}var info=resolveFileMime(file,true);if(!info.ok){reject(new Error('Use PNG, JPG, WEBP, GIF, MP4 ou WEBM.'));return;}var max=/^video\//i.test(info.mime)?25*1024*1024:5*1024*1024;if(file.size>max){reject(new Error('O arquivo deve ter no máximo '+(max/1024/1024)+' MB.'));return;}var reader=new FileReader();reader.onload=function(){var data=reader.result;if(!(data instanceof ArrayBuffer)){resolve(String(data));return;}var bytes=new Uint8Array(data),bin='';for(var i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));resolve('data:'+info.mime+';base64,'+btoa(bin));};reader.onerror=function(){reject(new Error('Não foi possível ler o arquivo.'));};reader.readAsArrayBuffer(file);});}
  function fileToDataUrlForProfile(file,type,ext){var info=resolveFileMime(file,false),mime=info.ok?info.mime:fileMimeFromExt(ext);if(!/^image\//i.test(mime)){return Promise.reject(new Error('Use PNG, JPG, WEBP ou GIF.'));}return new Promise(function(resolve,reject){var reader=new FileReader();reader.onload=function(){try{var bytes=new Uint8Array(reader.result),bin='';for(var i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));resolve('data:'+mime+';base64,'+btoa(bin));}catch(e){reject(new Error('Não foi possível preparar a foto.'));}};reader.onerror=function(){reject(new Error('Não foi possível ler a foto.'));};reader.readAsArrayBuffer(file);});}
  function sendChatMedia(file){var btn=chat.querySelector('.up-chat-send'),photoBtn=chat.querySelector('.up-chat-attach');if(btn)btn.disabled=true;if(photoBtn)photoBtn.disabled=true;fileToDataUrl(file).then(function(dataUrl){return api('POST','/api/chat/image',{dataUrl:dataUrl})}).then(function(r){return api('POST','/api/chat',{message:'',imageUrl:r.imageUrl,type:r.type,replyTo:chatReplyTo})}).then(function(r){if(r&&r.message)sendRealtimeEvent('chat_fast',{message:r.message});return refreshChatAfterSend(null,btn)}).catch(function(e){if(btn)btn.disabled=false;message(e.message,true)}).finally(function(){if(photoBtn)photoBtn.disabled=false});}

  function openProfileModal(){var file=profileModal.querySelector('.up-chat-profile-file'),preview=profileModal.querySelector('.up-chat-profile-preview'),msg=profileModal.querySelector('.up-chat-profile-message');msg.textContent='';file.value='';hydrateAvatar(preview,member);profileModal.classList.remove('hidden');}
  function closeProfileModal(){profileModal.classList.add('hidden');}
  profileModal.querySelector('.up-chat-profile-cancel').onclick=function(){closeProfileModal();};profileModal.onclick=function(e){if(e.target===profileModal)closeProfileModal();};
  profileModal.querySelector('.up-chat-profile-file').onchange=function(){var f=this.files&&this.files[0],msg=profileModal.querySelector('.up-chat-profile-message');if(!f)return;var type=String(f.type||'').toLowerCase(),ext=String(f.name||'').split('.').pop().toLowerCase();var okType=/^image\/(png|jpe?g|webp|gif)$/i.test(type)||['png','jpg','jpeg','webp','gif'].indexOf(ext)>=0;if(!okType){msg.textContent='Use PNG, JPG, WEBP ou GIF.';return;}if(f.size>2*1024*1024){msg.textContent='A foto deve ter no máximo 2 MB.';return;}fileToDataUrlForProfile(f,type,ext).then(function(data){profileModal.querySelector('.up-chat-profile-preview').src=data;msg.textContent='';}).catch(function(e){msg.textContent=e.message;});};
  profileModal.querySelector('.up-chat-profile-save').onclick=function(){var file=profileModal.querySelector('.up-chat-profile-file').files&&profileModal.querySelector('.up-chat-profile-file').files[0],msg=profileModal.querySelector('.up-chat-profile-message'),btn=this;if(!file){msg.textContent='Escolha uma foto.';return;}btn.disabled=true;msg.textContent='Salvando…';fileToDataUrl(file).then(function(data){return api('POST','/api/profile/avatar',{dataUrl:data});}).then(function(r){var ck='profile:'+member;if(mediaBlobCache[ck]){try{URL.revokeObjectURL(mediaBlobCache[ck]);}catch(e){}delete mediaBlobCache[ck];}GM_setValue(key+ck,r.avatarUrl);profileCache[member]=r.avatarUrl;hydrateAvatar(profileModal.querySelector('.up-chat-profile-preview'),member);updateBubbleAvatar(false);closeProfileModal();loadChat();}).catch(function(e){msg.textContent=e.message;}).finally(function(){btn.disabled=false;});};

  var healthPingPending={},healthPingResults={},healthRefreshTimer=null,healthLoading=false;
  function canViewHealth(){return ['Ricardo','Lohan','Guilherme'].indexOf(member)>=0;}
  function healthLed(ok,kind){return '<span class="up-health-led '+(ok?'ok':kind||'bad')+'"></span>';}
  function healthPingLabel(name){
    if(name===member)return '<span class="up-health-ping good">local</span>';
    var p=healthPingResults[name];
    if(p==null)return '<span class="up-health-ping pending">testando…</span>';
    if(p<120)return '<span class="up-health-ping good">'+Math.round(p)+' ms</span>';
    if(p<250)return '<span class="up-health-ping warn">'+Math.round(p)+' ms</span>';
    return '<span class="up-health-ping bad">'+Math.round(p)+' ms</span>';
  }
  function requestHealthPings(users){
    if(!realtimeActive||!realtimeChannel)return;
    (users||[]).filter(function(m){return m&&m.connected!==false;}).forEach(function(m){
      if(m.name===member){healthPingResults[m.name]=0;return;}
      var id=member+'|'+m.name+'|'+Date.now()+'|'+Math.random().toString(36).slice(2);
      healthPingPending[id]={name:m.name,startedAt:performance.now()};
      try{realtimeChannel.send({type:'broadcast',event:'health_ping',payload:{id:id,target:m.name,sender:member,createdAt:Date.now()}});}catch(e){delete healthPingPending[id];}
      setTimeout(function(){
        var p=healthPingPending[id];if(!p)return;delete healthPingPending[id];
        if(health.classList.contains('hidden'))return;
        healthPingResults[p.name]=null;
        var el=health.querySelector('[data-health-ping="'+CSS.escape(p.name)+'"]');if(el)el.innerHTML=healthPingLabel(p.name);
      },2500);
    });
  }
  function handleHealthPing(payload){
    if(!payload||payload.target!==member||!realtimeActive||!realtimeChannel)return;
    try{realtimeChannel.send({type:'broadcast',event:'health_pong',payload:{id:payload.id,target:payload.sender,sender:member,createdAt:Date.now()}});}catch(e){}
  }
  function handleHealthPong(payload){
    if(!payload||payload.target!==member||!payload.id)return;
    var p=healthPingPending[payload.id];if(!p)return;delete healthPingPending[payload.id];
    healthPingResults[p.name]=Math.max(0,performance.now()-p.startedAt);
    if(health.classList.contains('hidden'))return;
    var el=health.querySelector('[data-health-ping="'+CSS.escape(p.name)+'"]');if(el)el.innerHTML=healthPingLabel(p.name);
  }
  function openHealth(){
    if(!canViewHealth())return;
    card.classList.add('hidden');
    history.classList.add('hidden');
    chat.classList.add('hidden');
    health.innerHTML='<div class="up-health-head"><div><div class="up-health-title">Saúde do sistema</div><div class="up-health-sub">Equipe de Implementação • '+esc(member)+'</div></div><button type="button" class="up-health-close">Fechar</button></div><div class="up-health-list"><div class="up-health-row"><div class="up-health-left">'+healthLed(true)+'<span class="up-health-name">Verificando o sistema</span></div><span class="up-health-detail">Aguarde…</span></div></div><div class="up-health-footer">Verde: funcionando. Amarelo: reconectando. Vermelho: precisa de atenção.</div><button type="button" class="up-health-refresh">Atualizar agora</button>';
    health.classList.remove('hidden');
    health.querySelector('.up-health-close').onclick=function(){stopHealthMonitor();health.classList.add('hidden');card.classList.remove('hidden');};
    health.querySelector('.up-health-refresh').onclick=function(){loadHealth(true);};
    startHealthMonitor();
    loadHealth(true);
  }
  function startHealthMonitor(){
    if(healthRefreshTimer)return;
    healthRefreshTimer=setInterval(function(){if(!health.classList.contains('hidden'))loadHealth(false);},3000);
  }
  function stopHealthMonitor(){
    if(healthRefreshTimer){clearInterval(healthRefreshTimer);healthRefreshTimer=null;}
    healthLoading=false;
  }
  function loadHealth(initial){
    if(!canViewHealth()||health.classList.contains('hidden')||healthLoading)return;
    healthLoading=true;
    var list=health.querySelector('.up-health-list');if(!list){healthLoading=false;return;}
    if(initial||!list.querySelector('.up-health-row'))list.innerHTML='<div class="up-health-row"><div class="up-health-left">'+healthLed(true)+'<span class="up-health-name">Consultando diagnóstico</span></div><span class="up-health-detail">Aguarde…</span></div>';
    var started=Date.now();
    api('GET','/api/health').then(function(d){
      var apiMs=Date.now()-started,db=d&&d.db||{},chatCheck=d&&d.chat||{},state=d&&d.state||{},users=d&&d.members||[],rt=realtimeActive;
      var rows=[
        {name:'Sistema UpStatus',ok:!!(d&&d.ok),detail:(d&&d.version?'Funcionando • '+apiMs+' ms':'Indisponível')},
        {name:'Banco de dados',ok:!!db.ok,detail:db.ok?('Respondendo • '+db.ms+' ms'):'Sem resposta'},
        {name:'Chat da equipe',ok:!!chatCheck.ok,detail:chatCheck.ok?('Pronto • '+chatCheck.ms+' ms'):'Com erro'},
        {name:'Alertas e comandos',ok:!!state.ok,detail:state.ok?'Funcionando':'Com erro'},
        {name:'Atualização em tempo real',ok:rt,kind:rt?'':'warn',detail:rt?'Ativa':'Reconectando'},
        {name:'Sua versão',ok:true,detail:'v'+CURRENT_VERSION}
      ];
      healthPingResults={};
      list.innerHTML=rows.map(function(r){return '<div class="up-health-row" data-health-key="'+esc(r.name)+'"><div class="up-health-left">'+healthLed(r.ok,r.kind)+'<span class="up-health-name">'+r.name+'</span></div><span class="up-health-detail">'+r.detail+'</span></div>';}).join('')+
        '<div class="up-health-members"><div class="up-health-sub">Equipe conectada</div>'+users.map(function(m){
          var connected=m.connected!==false,ver=m.version?'v'+esc(m.version):'v?',seen=m.seenAt?' • visto '+fmtTime(m.seenAt):'';
          return '<div class="up-health-member"><b>'+esc(m.name)+'</b><span>'+ver+' • '+(connected?'conectado':'desconectado')+seen+' <span data-health-ping="'+esc(m.name)+'">'+healthPingLabel(m.name)+'</span></span></div>';
        }).join('')+'</div>';
      requestHealthPings(users);
    }).catch(function(e){
      list.innerHTML='<div class="up-health-row"><div class="up-health-left">'+healthLed(false)+'<span class="up-health-name">Diagnóstico indisponível</span></div><span class="up-health-detail">'+esc(e.message||'Erro')+'</span></div>';
    }).finally(function(){healthLoading=false;});
  }

  function login(){
    health.classList.add('hidden');
    img.src=profileFallback();
    var loginMember=GM_getValue(key+'last_member','Ricardo')||'Ricardo';lastMember=loginMember;card.innerHTML='<div class="up-title">UpStatus</div><div class="up-you">Entre para controlar o seu status.</div><div class="up-login"><label>Seu nome</label><select class="up-select" id="up-name"></select><label>Senha</label><input class="up-input" id="up-password" type="password" placeholder="Sua senha"><button id="up-enter">Entrar</button></div><div class="up-update up-login-update">Versão v'+CURRENT_VERSION+' <button type="button" class="up-update-check">Verificar atualização</button><button type="button" class="up-update-now">Atualizar</button><span class="up-update-status"></span></div><div class="up-message"></div>';
    var nameSelect=card.querySelector('#up-name');
    function setLoginMembers(names){
      var list=(names||[]).filter(Boolean);
      if(!list.length)list=['Ricardo','Lohan','Guilherme'];
      nameSelect.innerHTML=list.map(function(n){return '<option value="'+esc(n)+'">'+esc(n)+'</option>';}).join('');
      if(list.indexOf(loginMember)<0)loginMember=list[0];
      nameSelect.value=loginMember;
    }
    function passwordKey(name){return key+'password_'+String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,'_');}
    function loadSavedPassword(){var saved=GM_getValue(passwordKey(loginMember),'');var input=card.querySelector('#up-password');if(input)input.value=saved||'';}
    setLoginMembers(['Ricardo','Lohan','Guilherme']);
    nameSelect.onchange=function(){loginMember=nameSelect.value;lastMember=loginMember;GM_setValue(key+'last_member',loginMember);loadSavedPassword();};
    loadSavedPassword();
    api('GET','/api/members').then(function(r){setLoginMembers((r.members||[]).map(function(x){return x.name;}));}).catch(function(){});
    card.querySelector('#up-enter').onclick=async function(){
      try{
        server=CLOUD_SERVER;
        var name=loginMember;
        var password=card.querySelector('#up-password').value;
        var account=await api('GET','/api/account?name='+encodeURIComponent(name));
        var r=await api('POST',account.needsSetup?'/api/setup':'/api/login',{name:name,password:password});
        token=r.token;member=r.name;role=r.role||'implementation_user';lastMember=member;
        GM_setValue(key+'server',CLOUD_SERVER);GM_setValue(key+'token',token);GM_setValue(key+'member',member);GM_setValue(key+'last_member',member);GM_setValue(key+'role',role);GM_setValue(passwordKey(name),password);
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
    card.innerHTML='<div class="up-head"><div class="up-head-identity"><button type="button" class="up-head-avatar up-head-avatar-btn" title="Alterar foto de perfil" aria-label="Alterar foto de perfil"><img class="up-head-avatar-img" alt=""></button><div><div class="up-title">UpStatus</div><div class="up-you">Conectado como '+esc(member)+'</div></div></div><div class="up-actions"><button class="up-chat-btn" title="Chat da equipe" aria-label="Chat da equipe">'+iconSvg('chat')+'</button><button class="up-history-btn hidden" title="Ver histórico" aria-label="Ver histórico">'+iconSvg('clock')+'</button><button class="up-settings-btn" title="Configurações" aria-label="Configurações">'+iconSvg('gear')+'</button><div class="up-settings-menu hidden"><button type="button" class="up-settings-notifications"></button><button type="button" class="up-settings-theme"></button>'+'<button type="button" class="up-settings-health">'+iconSvg('pulse')+'<span>Saúde do sistema</span></button>'+'</div><button class="up-logout">Sair</button></div></div><div class="up-statuses"><button class="up-status online">'+iconSvg('online')+' Online</button><button class="up-status busy">'+iconSvg('busy')+' Ocupado</button><button class="up-status away">'+iconSvg('away')+' Ausente</button></div><div class="up-reasons hidden"><label class="up-label">Motivo de ocupado</label><div class="up-reason-picker"><button type="button" class="up-reason-trigger"><span class="up-reason-trigger-icon">'+iconSvg('edit')+'</span><span class="up-reason-trigger-text">Selecione um motivo</span></button><div class="up-reason-menu hidden">'+reasons.map(function(x){return '<button type="button" class="up-reason-option" data-value="'+esc(x.value)+'">'+iconSvg(x.icon)+'<span class="up-reason-text">'+esc(x.label)+'</span></button>'}).join('')+'</div></div><select class="up-select hidden"></select><input class="up-input hidden" placeholder="Escreva o motivo"><button class="up-confirm hidden">Confirmar ocupado</button></div><div class="up-message"></div><div class="up-notice">'+iconSvg('pulse')+'<span>Sincronização com o Sale Smartly ativa.</span><span class="up-notice-ok">✓</span></div><div class="up-team-title-row"><div class="up-team-title">Equipe</div><span class="up-team-count"></span></div><div class="up-team">Carregando…</div>';
    history.innerHTML='<div class="up-history-head"><div class="up-history-title">Histórico</div><div class="up-actions"><button class="up-export" title="Exportar histórico">'+iconSvg('download')+' TXT</button><button class="up-close">Fechar</button></div></div><div class="up-history-list">Carregando…</div>';

    var box=card.querySelector('.up-reasons'),select=box.querySelector('select'),custom=box.querySelector('input'),confirm=box.querySelector('button.up-confirm'),trigger=box.querySelector('.up-reason-trigger'),menu=box.querySelector('.up-reason-menu');
    var historyBtn=card.querySelector('.up-history-btn');
    var settingsBtn=card.querySelector('.up-settings-btn'),settingsMenu=card.querySelector('.up-settings-menu');
    var headAvatar=card.querySelector('.up-head-avatar-img');var headAvatarBtn=card.querySelector('.up-head-avatar-btn');if(headAvatar)hydrateAvatar(headAvatar,member);if(headAvatarBtn){headAvatarBtn.onclick=function(e){e.stopPropagation();openProfileModal();};}
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
        if(r.command)sendRealtimeEvent('remote_command',{command:r.command});
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
        setTimeout(poll,1500);
      }).catch(function(){
        if(Date.now()-t>=25000){
          if(remoteResultWaiters[id]===finish)delete remoteResultWaiters[id];
          settled=true;
          msg.style.color='#ff9aaa';msg.textContent='Tempo esgotado. Não foi possível confirmar a alteração.';if(confirm)confirm.disabled=false;
          return;
        }
        setTimeout(poll,1500);
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
      var resultPayload={commandId:c.id,sender:c.sender||'',target:member,status:c.status,reason:c.reason||'',ok:ok,error:error,createdAt:new Date().toISOString()};
      try{await api('POST','/api/remote-status/result',{commandId:c.id,ok:ok,error:error});}catch(_){ }
      sendRealtimeEvent('remote_result',{result:resultPayload});
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
      updateChatHeaderPresence();
      var memberNames=Object.keys(d.members);memberNames.sort(function(a,b){if(a===member)return 1;if(b===member)return -1;return a.localeCompare(b,'pt-BR');});
      var teamCount=card.querySelector('.up-team-count');if(teamCount)teamCount.textContent=memberNames.length+' '+(memberNames.length===1?'membro':'membros');
      team.innerHTML=memberNames.map(function(k){
        var m=d.members[k],presence=profilePresenceState(m.name,m);
        if(m.name===member)currentStatus=m.status;
        var controls=(role==='implementation_admin'&&m.name!==member)
          ? '<button type="button" class="up-member-barui" data-target="'+esc(m.name)+'" title="Enviar BARUI para '+esc(m.name)+'" aria-label="Enviar BARUI para '+esc(m.name)+'">'+iconSvg('phone')+'</button><button type="button" class="up-member-power" data-target="'+esc(m.name)+'" title="Controlar fila de '+esc(m.name)+'" aria-label="Controlar fila de '+esc(m.name)+'">'+iconSvg('power')+'</button>'
          : '';
        var version=m.version?'<span class="up-member-version">v'+esc(m.version)+'</span>':'<span class="up-member-version">v?</span>';
        var sub=[];
        if(m.reason)sub.push(reasonIcon(m.reason)+' '+esc(reasonLabel(m.reason)));
        if(m.updatedAt)sub.push('Desde '+fmtTime(m.updatedAt));
        var presenceTitle=presence==='chat'?'No bate-papo':presence==='active'?'UpStatus Ativo':'Offline';
        return '<div class="up-member"><div class="up-member-main"><img class="up-member-avatar presence-'+presence+'" data-member-avatar="'+esc(m.name)+'" data-presence-name="'+esc(m.name)+'" title="'+presenceTitle+'" alt=""><div class="up-member-info"><div class="up-member-top"><b>'+esc(m.name)+'</b>'+version+'</div><div class="up-member-sub">'+(sub.length?sub.join(' <span class="up-member-separator">•</span> '):'Sem atualização registrada')+'</div></div></div><div class="up-member-actions">'+controls+'<span class="up-badge b-'+m.status+'" title="Status da fila do Sale Smartly">'+labels[m.status]+'</span></div></div>';
      }).join('');
      team.querySelectorAll('.up-member-avatar').forEach(function(a){
        hydrateAvatar(a,a.getAttribute('data-member-avatar')||'');
        var name=a.getAttribute('data-presence-name')||'';
        a.addEventListener('mouseenter',function(e){showChatProfileHover(a,name,e);});
        a.addEventListener('mousemove',positionChatProfileHover);
        a.addEventListener('mouseleave',hideChatProfileHover);
      });
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
        var who=(item.actor&&item.target&&item.actor!==item.target)?'<b>'+esc(item.actor)+'</b><span>→</span><b>'+esc(item.target)+'</b>':'<b>'+esc(item.user||item.target||item.actor||'')+'</b>';return header+'<div class="up-history-item"><div class="up-history-meta"><span>'+fmtTime(item.createdAt)+'</span>'+who+'<span class="up-history-status '+(item.status==='online'?'online':item.status==='busy'?'busy':'away')+'"><i class="up-history-status-dot"></i>'+labels[item.status]+'</span></div>'+
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
    var blob=new Blob([lines.join('\r\n')+'\r\n'],{type:'text/plain;charset=utf-8'});
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
  function closeUpStatusPanel(){
    if(!chat.classList.contains('hidden')){saveChatDraft();stopTypingHeartbeat();}
    stopHealthMonitor();
    card.classList.add('hidden');
    history.classList.add('hidden');
    chat.classList.add('hidden');
    health.classList.add('hidden');
    remoteOverlay.classList.add('hidden');
    broadcastChatPresence(false);
  }
  function openUpStatusPanel(){
    history.classList.add('hidden');
    chat.classList.add('hidden');
    health.classList.add('hidden');
    remoteOverlay.classList.add('hidden');
    card.classList.remove('hidden');
    refresh();
  }
  document.addEventListener('pointerdown',function(e){
    if(!root.contains(e.target)){
      if(!chat.classList.contains('hidden'))saveChatDraft();
      card.classList.add('hidden');
      history.classList.add('hidden');
      chat.classList.add('hidden');
      stopHealthMonitor();
      health.classList.add('hidden');
      broadcastChatPresence(false);
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
    if(!moved){stopHealthMonitor();health.classList.add('hidden');if(!history.classList.contains('hidden'))history.classList.add('hidden');if(!chat.classList.contains('hidden')){chat.classList.add('hidden');broadcastChatPresence(false);}card.classList.toggle('hidden')}
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
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){e.preventDefault();closeChat();}
    if(e.shiftKey&&(e.key==='c'||e.key==='C')){
      var t=e.target,tag=t&&t.tagName?String(t.tagName).toLowerCase():'';
      var editable=!!(t&&(t.isContentEditable||tag==='input'||tag==='textarea'||tag==='select'));
      if(!editable&&token&&member){
        e.preventDefault();
        if(chat.classList.contains('hidden'))openChat();
        else closeChat();
      }
    }
  });
  setInterval(function(){loadChat();},3000);
  setInterval(pollChatTyping,1000);
  setInterval(pollBarui,5000);
  setInterval(pollRemoteStatus,5000);
  setInterval(checkUpdate,60000);
})();