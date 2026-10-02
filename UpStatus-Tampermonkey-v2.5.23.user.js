// ==UserScript==
// @name         UpStatus - Sale Smartly
// @namespace    upseller
// @version      2.5.22
// @description  UpStatus com status, histórico, chat interno, fotos, menções, atualização e alertas.
// @match        *://*.salesmartly.com/*
// @match        *://salesmartly.com/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_openInTab
// @updateURL    http://UpSeller21:3030/upstatus.user.js
// @downloadURL  http://UpSeller21:3030/upstatus.user.js
// @connect      *
// ==/UserScript==
(function () {
  'use strict';

  var key='upstatus_';
  var faviconState={link:null,originalHref:'',originalData:'',blinkTimer:null,on:false};
  var server=GM_getValue(key+'server','http://UpSeller21:3030').replace(/\/$/,'');
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

  // Migração: versões anteriores salvaram o IP antigo no armazenamento do Tampermonkey.
  // O servidor agora é acessado pelo hostname fixo, que continua válido mesmo se o DHCP mudar o IP.
  if(/^https?:\/\/(?:192\.168\.15\.(?:31|42)|localhost|127\.0\.0\.1)(?::3030)?$/i.test(server)){
    server='http://UpSeller21:3030';
    GM_setValue(key+'server',server);
  }
  var token=GM_getValue(key+'token','');
  var member=GM_getValue(key+'member','');
  var role=GM_getValue(key+'role','implementation_user');
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
            this.title=String(title||'');
            this.body=options&&options.body||'';
            this.tag=options&&options.tag||'';
            this.data=options&&options.data;
            this.onclick=null; this.onclose=null; this.onshow=null;
            this.close=function(){try{if(this.onclose)this.onclose();}catch(e){}};
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
      var hya=null,projectId='184300';
      function capture(raw){
        try{
          var u=new URL(typeof raw==='string'?raw:raw.url,location.href);
          if(u.hostname!=='api.salesmartly.com')return;
          var hp=u.searchParams.get('_hya_');
          var pp=u.searchParams.get('project_id')||u.searchParams.get('_xma_');
          if(pp)projectId=pp;
          if(hp){
            hya=hp;
            document.dispatchEvent(new CustomEvent('UPSTATUS_HYA',{detail:{hya:hya,projectId:projectId}}));
          }
        }catch(e){}
      }
      var oldFetch=window.fetch;
      window.fetch=function(input,init){
        try{capture(input)}catch(e){}
        return oldFetch.apply(this,arguments);
      };
      var oldOpen=XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open=function(method,url){
        try{capture(url)}catch(e){}
        return oldOpen.apply(this,arguments);
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
          var r=await fetch(url,{
            method:'POST',
            credentials:'include',
            headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
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
  var chatUnread=0;
  var chatInitialized=false;
  var seenMentionIds={};
  var audioCtx=null;
  var audioUnlocked=false;
  var baruiState={active:false,sequence:0,target:'',sender:'',startedAt:0};
  var baruiOutgoing={active:false,target:''};
  var baruiLastBeep=0;
  var baruiExternalNotifiedSequence=0;
  var originalTitle=document.title;
  var currentStatus='offline';
  var CURRENT_VERSION='2.5.23';
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
    photo:'<rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10" r="1.5" fill="currentColor"/><path d="m5 17 4-4 3 3 2-2 5 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    update:'<path d="M19 8a7 7 0 1 0 1 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M19 4v4h-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' ,
    sun:'<circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    moon:'<path d="M20 15.5A8.5 8.5 0 0 1 8.5 4a8.5 8.5 0 1 0 11.5 11.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    power:'<path d="M12 3v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7.1 6.1a7 7 0 1 0 9.8 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' ,
  }; return '<svg class="up-icon '+(cls||'')+'" viewBox="0 0 24 24" aria-hidden="true">'+(p[name]||p.edit)+'</svg>'}
  function reasonIcon(reason){var r=reasons.find(function(x){return x.value===reason});return '<span class="up-icon-wrap">'+iconSvg(r?r.icon:'edit')+'</span>'}
  function reasonLabel(reason){var r=reasons.find(function(x){return x.value===reason});return r?r.label:reason}
  function reasonEmoji(reason){return reasonIcon(reason)}

  function api(method,route,data){
    return new Promise(function(resolve,reject){
      GM_xmlhttpRequest({
        method:method,
        url:server+route,
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
'#upstatus-bubble{position:relative;width:42px;height:42px;border:2px solid #6b7688;border-radius:50%;background:#5b6574;overflow:visible;padding:0;box-shadow:0 5px 16px #0009;cursor:grab;display:flex;align-items:center;justify-content:center;user-select:none;-webkit-user-select:none;touch-action:none;line-height:1;transition:background .18s,border-color .18s}'+
    '#upstatus-bubble img{display:none}'+
    '#upstatus-bubble .up-bubble-icon{width:22px;height:22px;color:#fff}'+
    '.up-notify-dot{position:absolute;right:-10px;top:-10px;min-width:18px;height:18px;padding:0 4px;border-radius:999px;background:#ff334f;border:2px solid #19212e;display:none;align-items:center;justify-content:center;box-sizing:border-box;color:#fff;font:800 10px/1 Segoe UI,Arial,sans-serif}.up-notify-dot.show{display:block}.up-update-dot{position:absolute;right:-8px;top:-8px;width:22px;height:22px;border-radius:50%;background:#4f7dff;border:2px solid #19212e;display:none;align-items:center;justify-content:center;font-size:12px;line-height:1;box-sizing:border-box}.up-update-dot.show{display:flex}'+
    '.up-barui-incoming{position:absolute;right:52px;bottom:0;width:315px;z-index:90;pointer-events:auto}.up-barui-incoming.hidden{display:none}.up-barui-incoming-card{position:relative;box-sizing:border-box;padding:13px 12px 11px;border:2px solid #ff3d58;border-radius:14px;background:rgba(75,12,25,.94);color:#fff;box-shadow:0 0 0 3px rgba(255,45,72,.14),0 10px 30px rgba(0,0,0,.35);animation:upbaruiAlert .62s infinite alternate}.up-barui-incoming-title{font-size:13px;font-weight:900;letter-spacing:.2px;line-height:1.2;text-transform:uppercase}.up-barui-incoming-sub{font-size:11px;color:#ffd6dc;margin-top:4px}.up-barui-incoming-actions{display:flex;gap:7px;margin-top:10px}.up-barui-incoming-actions button{flex:1;border:0;border-radius:8px;padding:8px 9px;font:800 12px Segoe UI,Arial,sans-serif;cursor:pointer}.up-barui-attend{background:#fff;color:#b51f39}.up-barui-stop{background:#8d1f32;color:#fff}.up-barui-incoming.shake{animation:upbaruiAlert .62s infinite alternate}.up-toast-stack{position:absolute;right:52px;bottom:0;width:300px;display:flex;flex-direction:column-reverse;gap:7px;pointer-events:none}.up-toast{position:relative;pointer-events:auto;box-sizing:border-box;width:100%;padding:9px 28px 9px 11px;border:1px solid rgba(90,105,130,.45);border-radius:12px;background:rgba(25,33,46,.82);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 8px 24px rgba(0,0,0,.22);color:#e7edf7;animation:uptoastIn .16s ease-out}.up-toast-name{font-size:11px;font-weight:750;color:#aebbd0;line-height:1.15;margin-bottom:3px}.up-toast-text{font-size:12px;line-height:1.35;white-space:pre-wrap;word-break:break-word}.up-toast-close{position:absolute;right:7px;top:6px;width:18px;height:18px;border:0;border-radius:50%;background:transparent;color:#9aa8bc;font-size:14px;line-height:18px;padding:0;cursor:pointer}.up-toast-close:hover{background:rgba(127,145,170,.16);color:#edf2fb}@keyframes uptoastIn{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}@media(prefers-color-scheme:light){.up-toast{background:rgba(255,255,255,.82);border-color:rgba(60,75,95,.22);color:#1d2735;box-shadow:0 8px 24px rgba(0,0,0,.14)}.up-toast-name{color:#526176}.up-toast-close{color:#718096}.up-toast-close:hover{background:rgba(80,95,115,.1);color:#263345}}'+
    '.up-bubble-icon{width:24px;height:24px}'+
    '#upstatus-card{position:absolute;bottom:55px;right:0;width:365px;max-width:calc(100vw - 32px);background:#19212e;border:1px solid #354258;border-radius:16px;padding:18px;box-shadow:0 16px 42px #000b}'+
    '#upstatus-history{position:absolute;bottom:55px;right:0;width:365px;max-width:calc(100vw - 32px);height:520px;box-sizing:border-box;background:#19212e;border:1px solid #354258;border-radius:16px;padding:18px;box-shadow:0 16px 42px #000b;overflow:hidden;display:flex;flex-direction:column}'+
    '#upstatus-chat{position:absolute;bottom:55px;right:0;width:365px;max-width:calc(100vw - 32px);height:520px;box-sizing:border-box;background:#19212e;border:1px solid #354258;border-radius:16px;padding:18px;box-shadow:0 16px 42px #000b;overflow:hidden;display:flex;flex-direction:column}'+
    '#upstatus-card.hidden,#upstatus-history.hidden,#upstatus-chat.hidden,.up-reasons.hidden,.up-select.hidden,.up-input.hidden,.up-confirm.hidden,.up-history-btn.hidden{display:none}'+
    '.up-head,.up-member-top,.up-history-head{display:flex;justify-content:space-between;align-items:center}'+
    '.up-title,.up-history-title{font-size:18px;font-weight:750}'+
    '.up-you,.up-reason{color:#aab6c9;font-size:12px;margin-top:4px}'+
    '.up-actions{display:flex;gap:6px;align-items:center;position:relative}.up-chat-btn,.up-logout,.up-history-btn,.up-close{border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer;box-sizing:border-box;height:34px;min-width:34px}'+
    '.up-chat-btn{position:relative;border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer}.up-notification-btn{border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer;box-sizing:border-box;height:34px;min-width:34px;font-size:15px;line-height:1}.up-notification-btn.enabled{background:#184f3a;color:#7ef0b6}.up-notification-btn.denied{background:#3a2730;color:#ff9aaa}.up-chat-btn .up-chat-notify-dot{position:absolute;right:-3px;top:-3px;width:10px;height:10px;border-radius:50%;background:#ff4d67;border:2px solid #19212e;display:none}.up-chat-btn .up-chat-notify-dot.show{display:block}.up-barui-main{position:relative;width:34px;height:34px;padding:0;border:0;border-radius:50%;background:#273247;color:#c6d1e1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.up-barui-main .up-icon{width:17px;height:17px}.up-barui-main.active,.up-barui-main.incoming{background:#c52f48;color:#fff;animation:upbaruibtn .55s infinite alternate}.up-barui-popup{position:absolute;right:0;top:42px;width:230px;padding:10px;background:#111722;border:1px solid #3a475b;border-radius:10px;box-shadow:0 12px 30px #0009;z-index:60}.up-barui-popup.hidden{display:none}.up-barui-popup-title{font-size:12px;font-weight:750;color:#cbd5e4;margin-bottom:7px}.up-barui-popup-row{display:flex;gap:6px}.up-barui-popup select{flex:1;min-width:0;border:1px solid #3a475b;border-radius:7px;background:#19212e;color:#edf2fb;padding:7px;font-size:12px}.up-barui-popup button{border:0;border-radius:7px;background:#c52f48;color:#fff;font-weight:750;padding:7px 9px;cursor:pointer}.up-barui-popup button:disabled{opacity:.6;cursor:wait}.up-barui-row{display:flex;gap:7px;margin-top:8px}.up-barui-select{flex:1;min-width:0;border:1px solid #3a475b;border-radius:8px;background:#111722;color:#edf2fb;padding:8px}.up-barui-btn{border:0;border-radius:8px;padding:8px 11px;background:#a52a3c;color:#fff;font-weight:800;cursor:pointer}.up-barui-btn.active{background:#d66b1f}.up-barui-hint{font-size:11px;color:#8f9db2;margin-top:5px}.up-barui-active{animation:upbarui .55s infinite alternate}@keyframes upbaruibtn{from{transform:scale(1);box-shadow:0 0 0 0 #ff334f55}to{transform:scale(1.08);box-shadow:0 0 0 7px #ff334f55}}@keyframes upbarui{from{box-shadow:0 7px 22px #0009}to{box-shadow:0 0 0 7px #ff334f55,0 7px 22px #0009}}.up-icon{display:inline-block;width:16px;height:16px;vertical-align:-3px;flex:0 0 auto}.up-icon-wrap{display:inline-flex;align-items:center;justify-content:center;vertical-align:middle}.up-history-btn{font-size:17px;padding:5px 8px;line-height:1}.up-history-btn .up-icon{width:18px;height:18px}.up-select,.up-history-list,.up-history-head{font-family:"Segoe UI",Arial,sans-serif}.up-reason-picker{position:relative}.up-reason-trigger{width:100%;display:flex;align-items:center;gap:8px;padding:10px;border-radius:8px;border:1px solid #3a475b;background:#111722;color:#edf2fb;cursor:pointer;text-align:left}.up-reason-menu{position:absolute;z-index:30;left:0;right:0;margin-top:4px;background:#111722;border:1px solid #3a475b;border-radius:8px;padding:4px;box-shadow:0 12px 30px #0008}.up-reason-menu.hidden{display:none}.up-reason-option{width:100%;display:flex;align-items:center;gap:8px;border:0;background:transparent;color:#edf2fb;padding:9px 8px;border-radius:6px;cursor:pointer;text-align:left}.up-reason-option:hover{background:#273247}.up-reason-text{flex:1}.up-status-icon.online{color:#7be1a7}.up-status-icon.busy{color:#ffcf61}.up-status-icon.away{color:#c7d0df}.up-export{border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer;font-size:12px;font-weight:700}.up-statuses{display:flex;gap:7px;margin:16px 0 12px}'+

    '.up-status{border:0;border-radius:8px;padding:9px;font-weight:700;cursor:pointer}.online{background:#173f2b;color:#7be1a7}.busy{background:#4d3a13;color:#ffcf61}.away{background:#303949;color:#c7d0df}'+
    '.up-label{display:block;margin-bottom:6px;font-weight:650}.up-select,.up-input{width:100%;padding:10px;border-radius:8px;border:1px solid #3a475b;background:#111722;color:#edf2fb}.up-input{margin-top:7px}'+
    '.up-confirm{margin-top:7px;width:100%;border:0;border-radius:8px;padding:9px;background:#4f7dff;color:#fff;font-weight:700;cursor:pointer}'+
    '.up-message{min-height:20px;font-size:12px;color:#ff8499;margin-top:8px}.up-notice{margin:10px 0;padding:9px;border-radius:8px;background:#173f2b;color:#9ce5b8;font-size:12px}'+
    '.up-team-title{font-weight:750;margin:13px 0 7px}.up-member{padding:9px 0;border-bottom:1px solid #303b4d}.up-member:last-child{border:0}.up-badge{font-size:11px;font-weight:700;border-radius:12px;padding:3px 6px}.b-online{background:#173f2b;color:#7be1a7}.b-busy{background:#4d3a13;color:#ffcf61}.b-away,.b-offline{background:#303949;color:#c7d0df}.up-time{font-size:11px;color:#8390a4;margin-top:4px}'+
    '.up-chat-list{height:auto;flex:1;min-height:0;overflow:auto;margin-top:12px;padding-right:3px}.up-chat-item{position:relative;padding:9px 0;border-bottom:1px solid #303b4d}.up-chat-item.own{cursor:context-menu}.up-delete-action{position:absolute;right:4px;top:28px;border:1px solid #4a566b;border-radius:6px;background:#273247;color:#ff9aaa;padding:4px 7px;font:700 11px Segoe UI,Arial,sans-serif;cursor:pointer;box-shadow:0 5px 14px #0006;z-index:5}.up-delete-action:hover{background:#3a2530;color:#ffb5c1}.up-delete-action.hidden{display:none}.up-chat-meta{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:#8fa0b8}.up-chat-text{font-size:13px;color:#e7edf7;white-space:pre-wrap;word-break:break-word;margin-top:4px}.up-member-top{display:flex;align-items:center;gap:7px}.up-member-top b{flex:1;min-width:0}.up-member-barui{width:28px;height:28px;padding:0;border:0;border-radius:50%;background:#273247;color:#c6d1e1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}.up-member-barui .up-icon{width:15px;height:15px}.up-member-barui:hover{background:#36445b}.up-member-barui.active{background:#c52f48;color:#fff;animation:upbaruibtn .55s infinite alternate}.up-member-barui:disabled{opacity:.55;cursor:wait}.up-member-power{width:28px;height:28px;padding:0;border:0;border-radius:50%;background:#273247;color:#c6d1e1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}.up-member-power .up-icon{width:15px;height:15px}.up-member-power:hover{background:#3b465b;color:#fff}.up-member-power:disabled{opacity:.55;cursor:wait}.up-remote-overlay{position:absolute;inset:0;z-index:100;background:rgba(10,15,24,.68);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;border-radius:16px}.up-remote-overlay.hidden{display:none}.up-remote-dialog{width:100%;max-width:315px;background:#182130;border:1px solid #40506a;border-radius:14px;padding:14px;box-sizing:border-box;box-shadow:0 18px 45px #000b}.up-remote-title{font-size:15px;font-weight:800}.up-remote-sub{font-size:11px;color:#9aa8bc;margin-top:3px}.up-remote-statuses{display:flex;gap:6px;margin-top:12px}.up-remote-status{flex:1;border:1px solid #3a475b;border-radius:8px;padding:9px 6px;background:#111722;color:#dce5f2;cursor:pointer;font:700 12px Segoe UI,Arial,sans-serif}.up-remote-status:hover,.up-remote-status.active{background:#30405b;border-color:#5b7fc8}.up-remote-reason{margin-top:9px}.up-remote-reason.hidden{display:none}.up-remote-reason-menu{display:flex;flex-direction:column;gap:3px}.up-remote-reason-option{border:0;background:#111722;color:#dce5f2;border-radius:7px;padding:8px;text-align:left;cursor:pointer;font:12px Segoe UI,Arial,sans-serif}.up-remote-reason-option:hover,.up-remote-reason-option.active{background:#30405b}.up-remote-actions{display:flex;gap:7px;margin-top:12px}.up-remote-actions button{flex:1;border:0;border-radius:8px;padding:9px;font:800 12px Segoe UI,Arial,sans-serif;cursor:pointer}.up-remote-cancel{background:#273247;color:#cbd5e4}.up-remote-confirm{background:#4f7dff;color:#fff}.up-remote-confirm:disabled{opacity:.55;cursor:wait}.up-remote-message{min-height:18px;margin-top:7px;font-size:11px;color:#ff9aaa}.up-chat-text{font-size:13px;color:#e7edf7;white-space:pre-wrap;word-break:break-word;margin-top:4px}.up-chat-photo{display:block;max-width:180px;max-height:140px;width:auto;height:auto;margin-top:6px;border:1px solid #3a475b;border-radius:9px;background:#111722;cursor:zoom-in;object-fit:contain;box-shadow:0 4px 14px #0004}.up-chat-photo:hover{filter:brightness(1.06)}.up-photo-overlay{position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;cursor:zoom-out}.up-photo-overlay.hidden{display:none}.up-photo-overlay img{max-width:94vw;max-height:92vh;object-fit:contain;border-radius:8px;box-shadow:0 14px 50px #000b;cursor:default}.up-photo-overlay-close{position:absolute;right:18px;top:14px;width:38px;height:38px;border:0;border-radius:50%;background:#273247;color:#fff;font-size:24px;line-height:38px;padding:0;cursor:pointer}.up-photo-overlay-close:hover{background:#39465d}.up-chat-compose{position:relative;display:flex;align-items:flex-end;gap:7px}.up-mention-menu{position:absolute;left:0;bottom:calc(100% + 8px);z-index:20;display:flex;flex-wrap:wrap;gap:6px;width:100%;padding:7px;box-sizing:border-box;background:#182130;border:1px solid #3a475b;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.32)}.up-mention-menu.hidden{display:none}.up-mention-option{flex:0 0 auto;border:1px solid #344158;background:#243149;color:#dbe5f5;border-radius:8px;padding:6px 9px;cursor:pointer;font:12px Segoe UI,Arial,sans-serif}.up-mention-option:hover{background:#30405b;border-color:#4f7dff}.up-mention-option.up-mention-all{background:#3b315f;border-color:#8065c7;color:#fff}.up-chat-tools{display:flex;gap:7px;flex:0 0 38px}.up-chat-photo{width:38px;height:42px;padding:0;border:1px solid #3a475b;border-radius:8px;background:#273247;color:#dbe5f5;cursor:pointer;font-size:17px}.up-chat-mention{color:#7fb1ff;font-weight:750}.up-chat-input{flex:1;width:auto;min-height:42px;height:42px;max-height:90px;resize:vertical;padding:8px;border-radius:8px;border:1px solid #3a475b;background:#111722;color:#edf2fb;font:13px Segoe UI,Arial,sans-serif}.up-chat-send{margin-top:7px;width:100%;border:0;border-radius:8px;padding:9px;background:#4f7dff;color:#fff;font-weight:700;cursor:pointer}.up-update{font-size:11px;color:#9caac0;margin-top:10px}.up-update button{margin-left:6px;border:0;background:#273247;color:#c6d1e1;border-radius:6px;padding:4px 7px;cursor:pointer}.up-update button:hover{background:#35425a}.up-update .up-update-now:disabled{opacity:.45;cursor:not-allowed;background:#202938;color:#7f8ca0}.up-update .up-update-now:disabled:hover{background:#202938}.up-history-list{overflow:auto;flex:1;min-height:0;margin-top:12px}.up-history-day{font-size:12px;font-weight:750;color:#8fa0b8;margin:14px 0 7px}.up-history-item{padding:9px 0;border-bottom:1px solid #303b4d}.up-history-meta{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.up-history-reason{font-size:12px;color:#b7c2d2;margin-top:3px}.up-history-empty{font-size:12px;color:#9aa8bc;padding:14px 0}'+
    '.up-login label{display:block;margin:12px 0 5px;font-weight:650}.up-login button{width:100%;margin-top:15px;border:0;border-radius:8px;padding:10px;background:#4f7dff;color:#fff;font-weight:700;cursor:pointer}'+
    '.up-remote-overlay{position:fixed!important;inset:0!important;width:100vw;height:100vh;z-index:2147483646;background:rgba(5,9,16,.64);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;border-radius:0;overflow:auto}'+
    '.up-remote-dialog{width:min(360px,calc(100vw - 40px));max-height:calc(100vh - 40px);overflow:auto}'+
    '#upstatus-root.up-theme-light{color:#1b2430}'+
    '#upstatus-root.up-theme-light #upstatus-card,#upstatus-root.up-theme-light #upstatus-history,#upstatus-root.up-theme-light #upstatus-chat{background:#f7f9fc;border-color:#d7dee9;color:#1b2430;box-shadow:0 16px 42px rgba(0,0,0,.18)}'+
    '#upstatus-root.up-theme-light .up-you,#upstatus-root.up-theme-light .up-reason,#upstatus-root.up-theme-light .up-time,#upstatus-root.up-theme-light .up-history-day,#upstatus-root.up-theme-light .up-history-reason,#upstatus-root.up-theme-light .up-history-empty{color:#64748b}'+
    '#upstatus-root.up-theme-light .up-chat-btn,#upstatus-root.up-theme-light .up-logout,#upstatus-root.up-theme-light .up-history-btn,#upstatus-root.up-theme-light .up-close,#upstatus-root.up-theme-light .up-notification-btn,#upstatus-root.up-theme-light .up-export{background:#e8edf4;color:#334155}'+
    '#upstatus-root.up-theme-light .up-notification-btn.enabled{background:#d7f4e5;color:#147044}'+
    '#upstatus-root.up-theme-light .up-member{border-color:#dbe2ec}'+
    '#upstatus-root.up-theme-light .up-member-barui,#upstatus-root.up-theme-light .up-member-power{background:#e8edf4;color:#334155}'+
    '#upstatus-root.up-theme-light .up-reason-trigger,#upstatus-root.up-theme-light .up-reason-menu,#upstatus-root.up-theme-light .up-select,#upstatus-root.up-theme-light .up-input,#upstatus-root.up-theme-light .up-chat-input,#upstatus-root.up-theme-light .up-chat-photo,#upstatus-root.up-theme-light .up-mention-menu{background:#fff;border-color:#cbd5e1;color:#1e293b}'+
    '#upstatus-root.up-theme-light .up-reason-option,#upstatus-root.up-theme-light .up-mention-option{color:#1e293b}'+
    '#upstatus-root.up-theme-light .up-reason-option:hover,#upstatus-root.up-theme-light .up-mention-option:hover{background:#eef2f7}'+
    '#upstatus-root.up-theme-light .up-chat-item{border-color:#dbe2ec}'+
    '#upstatus-root.up-theme-light .up-chat-text{color:#1e293b}'+
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
    '#upstatus-root.up-theme-light .up-notify-dot,#upstatus-root.up-theme-light .up-update-dot{border-color:#f7f9fc}'+
    '.up-theme-btn{border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer;box-sizing:border-box;height:34px;min-width:34px;display:inline-flex;align-items:center;justify-content:center}'+
    '.up-theme-btn .up-icon{width:16px;height:16px}'+
    '#upstatus-root.up-theme-light .up-theme-btn{background:#e8edf4;color:#334155}'
  });

  var root=node('div',{id:'upstatus-root'});
  var bubble=node('button',{id:'upstatus-bubble',title:'Abrir UpStatus'});
  var card=node('section',{id:'upstatus-card',className:'hidden'});
  var history=node('section',{id:'upstatus-history',className:'hidden'});
  var chat=node('section',{id:'upstatus-chat',className:'hidden'});
  var toastStack=node('div',{className:'up-toast-stack'});
  var baruiIncoming=node('div',{className:'up-barui-incoming hidden'});
  var remoteOverlay=node('div',{className:'up-remote-overlay hidden'});
  var photoOverlay=node('div',{className:'up-photo-overlay hidden'});
  photoOverlay.innerHTML='<button type="button" class="up-photo-overlay-close" aria-label="Fechar imagem">×</button><img alt="Imagem">';
  var img=node('img',{src:server+'/skeleton.gif',alt:'UpStatus'});
  root.style.right=GM_getValue(key+'right','24px');
  root.style.bottom=GM_getValue(key+'bottom','24px');
  bubble.innerHTML=iconSvg('online','up-bubble-icon')+'<span class="up-notify-dot"></span><span class="up-update-dot"></span>';
  bubble.appendChild(img);
  root.append(style,bubble,card,history,chat,toastStack,baruiIncoming,remoteOverlay,photoOverlay);
  setBubbleStatus('offline');
  document.documentElement.appendChild(root);

  function setBubbleStatus(status){
    currentStatus=status||'offline';
    var colors={online:'#2e9b62',busy:'#c18a18',away:'#667085',offline:'#5b6574'};
    var borders={online:'#79e3a8',busy:'#ffd36a',away:'#aeb8c7',offline:'#8b95a4'};
    bubble.style.background=colors[currentStatus]||colors.offline;
    bubble.style.borderColor=borders[currentStatus]||borders.offline;
    var bi=bubble.querySelector('.up-bubble-icon');
    if(bi)bi.outerHTML=iconSvg(currentStatus==='online'?'online':currentStatus==='busy'?'busy':'away','up-bubble-icon');
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
    try{if(typeof GM_openInTab==='function'){GM_openInTab(UPDATE_URL,{active:true,insert:true,setParent:true});return}}catch(e){}
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
      var u=card.querySelector('.up-update-status');
      var manual=card.querySelector('.up-update-now');
      var remote=d&&d.version?String(d.version):'';
      var cmp=compareVersions(remote,CURRENT_VERSION);

      if(manual){
        manual.onclick=openUpdate;
        manual.disabled=cmp<=0;
        manual.title=cmp>0?'Atualizar para v'+remote:'Você já está na versão mais recente';
      }

      if(remote&&cmp>0){
        setUpdateAvailable(true,remote);
        if(u)u.innerHTML=' • Nova versão: <b>v'+esc(remote)+'</b>';
      }else if(remote&&cmp<0){
        setUpdateAvailable(false,'');
        if(u)u.textContent=' • Servidor está em v'+esc(remote)+'; você está em v'+CURRENT_VERSION+'.';
      }else{
        setUpdateAvailable(false,'');
        if(u)u.textContent=' • Você está atualizado.';
      }
    }).catch(function(){});
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
  function removeToast(id){
    var item=toastItems.find(function(x){return x.id===id});
    if(!item)return;
    clearTimeout(item.timer);
    if(item.el&&item.el.parentNode)item.el.parentNode.removeChild(item.el);
    toastItems=toastItems.filter(function(x){return x.id!==id});
  }
  function showChatToast(m){
    if(bubble){bubble.classList.remove('up-main-alert');void bubble.offsetWidth;bubble.classList.add('up-main-alert');setTimeout(function(){bubble.classList.remove('up-main-alert')},700);}
    if(!m||!m.id||m.user===member)return;
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
  function updateNotificationPermissionUI(){
    var btn=document.querySelector('.up-notification-btn');
    if(!btn)return;
    var p=externalNotificationsSupported()?UpNativeNotification.permission:'unsupported';
    externalNotifPermission=p;
    if(p==='granted'){
      btn.classList.add('enabled');
      btn.classList.remove('denied');
      btn.textContent='';
      btn.innerHTML=iconSvg('bell');
      btn.title='Notificações externas ativadas';
      btn.setAttribute('aria-label','Notificações externas ativadas');
    }else if(p==='denied'){
      btn.classList.remove('enabled');
      btn.classList.add('denied');
      btn.textContent='';
      btn.innerHTML=iconSvg('bell');
      btn.title='Notificações bloqueadas pelo navegador';
      btn.setAttribute('aria-label','Notificações bloqueadas pelo navegador');
    }else{
      btn.classList.remove('enabled','denied');
      btn.textContent='';
      btn.innerHTML=iconSvg('bell');
      btn.title='Ativar notificações externas';
      btn.setAttribute('aria-label','Ativar notificações externas');
    }
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
  function shouldShowExternalNotification(){
    // Mensagens da equipe e BARUI devem sempre gerar notificacao externa
    // quando o usuario concedeu permissao, mesmo com o UpStatus aberto.
    return !!UpNativeNotification && UpNativeNotification.permission==='granted';
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
    if(!data||!data.user)return false;
    var names=window.__upstatusMembers||[];
    if(!names.length)names=['Ricardo','Lohan','Guilherme'];
    var sender=String(data.user).trim().toLowerCase();
    return names.some(function(name){return String(name).trim().toLowerCase()===sender;});
  }
  function upStatusNotificationIcon(){
    return server+'/upstatus-icon.svg';
  }
  function showExternalNotification(type,data){
    if(type==='chat'&&!isTeamChatMessage(data))return;
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
      if(!seenMentionIds[m.id]){
        seenMentionIds[m.id]=true;
        if(m.user!==member){
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

  function loadChat(){
    if(!token)return;
    api('GET','/api/chat').then(function(d){
      chatCache=d.messages||[];
      processChatNotifications(chatCache);
      setUnread(d.unreadCount||0);
      if(!chat.classList.contains('hidden'))renderChat();
    }).catch(function(){});
  }
  function openPhotoOverlay(src){var im=photoOverlay.querySelector('img');if(!im)return;im.src=src;photoOverlay.classList.remove('hidden');}
  function closePhotoOverlay(){photoOverlay.classList.add('hidden');var im=photoOverlay.querySelector('img');if(im)im.removeAttribute('src');}
  photoOverlay.querySelector('.up-photo-overlay-close').onclick=function(e){e.stopPropagation();closePhotoOverlay()};
  photoOverlay.onclick=function(e){if(e.target===photoOverlay)closePhotoOverlay()};
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!photoOverlay.classList.contains('hidden'))closePhotoOverlay()});

  function renderChat(){
    var list=chat.querySelector('.up-chat-list');if(!list)return;
    if(!chatCache.length){list.innerHTML='<div class="up-history-empty">Nenhuma mensagem nas últimas 48 horas.</div>';return;}
    list.innerHTML=chatCache.map(function(m){var body=m.imageUrl?'<img class="up-chat-photo" src="'+esc(server+m.imageUrl)+'" alt="Foto enviada por '+esc(m.user)+'" loading="lazy">':(m.message?'<div class="up-chat-text">'+renderChatText(m.message)+'</div>':'');return '<div class="up-chat-item '+(m.user===member?'own':'')+'" data-message-id="'+esc(m.id)+'"><div class="up-chat-meta"><b>'+esc(m.user)+'</b><span>'+fmtTime(m.createdAt)+'</span></div>'+body+(m.user===member?'<button type="button" class="up-delete-action hidden">Excluir</button>':'')+'</div>';}).join('');
    list.querySelectorAll('.up-chat-item.own').forEach(function(item){item.addEventListener('contextmenu',function(e){e.preventDefault();e.stopPropagation();list.querySelectorAll('.up-delete-action').forEach(function(b){b.classList.add('hidden')});var btn=item.querySelector('.up-delete-action');if(btn)btn.classList.remove('hidden');});var del=item.querySelector('.up-delete-action');if(del){del.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var id=item.getAttribute('data-message-id');if(!id)return;del.disabled=true;api('DELETE','/api/chat/'+encodeURIComponent(id)).then(function(){chatCache=chatCache.filter(function(m){return m.id!==id;});renderChat();}).catch(function(err){del.disabled=false;message(err.message,true)});});}});
    list.onclick=function(e){if(e.target.closest&&e.target.closest('.up-delete-action'))return;list.querySelectorAll('.up-delete-action').forEach(function(b){b.classList.add('hidden')});};
    list.querySelectorAll('.up-chat-photo').forEach(function(img){
      var original=img.getAttribute('src')||'';
      img.setAttribute('data-original-url',original);
      img.onclick=function(e){
        e.preventDefault();e.stopPropagation();
        var url=img.getAttribute('data-original-url')||original;
        try{if(typeof GM_openInTab==='function'){GM_openInTab(url,{active:true,insert:true,setParent:true});return;}}catch(err){}
        window.open(url,'_blank','noopener');
      };
      try{
        if(typeof GM_xmlhttpRequest==='function' && /^https?:\/\//i.test(original)){
          GM_xmlhttpRequest({method:'GET',url:original,responseType:'blob',onload:function(r){
            try{
              if(!r.response)return;
              var fr=new FileReader();
              fr.onload=function(){if(fr.result)img.src=String(fr.result);};
              fr.readAsDataURL(r.response);
            }catch(err){}
          },onerror:function(){}});
        }
      }catch(err){}
    });
    list.scrollTop=list.scrollHeight;
  }
  function mentionState(input){
    var value=input.value||'';
    var caret=input.selectionStart==null?value.length:input.selectionStart;
    var before=value.slice(0,caret);
    var match=before.match(/(?:^|\s)@([\p{L}\p{N}_-]*)$/u);
    if(!match)return null;
    var query=(match[1]||'').toLowerCase();
    var names=window.__upstatusMembers||[];
    var filtered=names.filter(function(n){return n.toLowerCase().indexOf(query)===0;});
    var options=[];
    if('todos'.indexOf(query)===0)options.push('__ALL__');
    filtered.forEach(function(n){if(!options.includes(n))options.push(n);});
    if(!options.length)return null;
    return {names:options,start:caret-(match[1]||'').length-1,end:caret};
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
    if(!token)return;
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
    }).catch(function(){});
  }
  function sendBaruiTo(target){
    if(!target||target===member)return;
    var btn=card.querySelector('.up-member-barui[data-target=\"'+CSS.escape(target)+'\"]');
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
    var btn=card.querySelector('.up-member-barui[data-target=\"'+CSS.escape(target)+'\"]');
    if(btn)btn.disabled=true;
    api('POST','/api/barui',{target:target,active:false}).then(function(){
      baruiOutgoing={active:false,target:''};updateOutgoingBaruiUI();
    }).catch(function(e){message(e.message,true)}).finally(function(){if(btn)btn.disabled=false});
  }
  function toggleBarui(target){
    if(baruiOutgoing.active&&baruiOutgoing.target===target){stopOutgoingBarui();return;}
    sendBaruiTo(target);
  }

  function openChat(){
    if(!token)return;
    chat.classList.remove('hidden');card.classList.add('hidden');history.classList.add('hidden');
    chat.innerHTML='<div class="up-history-head"><div class="up-history-title">Chat da equipe</div><button class="up-close">Fechar</button></div><div class="up-chat-list">Carregando…</div><div class="up-chat-compose"><div class="up-mention-menu hidden"></div><textarea class="up-chat-input" maxlength="1000" placeholder="Digite uma mensagem. Use @nome para marcar alguém."></textarea><div class="up-chat-tools"><button type="button" class="up-chat-photo" title="Enviar foto" aria-label="Enviar foto">'+iconSvg('photo')+'</button><input class="up-chat-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden></div></div><button class="up-chat-send">Enviar</button>';
    var input=chat.querySelector('.up-chat-input'),photoBtn=chat.querySelector('.up-chat-photo'),photoFile=chat.querySelector('.up-chat-file');
    photoBtn.onclick=function(e){e.stopPropagation();photoFile.click()};
    photoFile.addEventListener('change',function(){if(photoFile.files&&photoFile.files[0])sendChatImage(photoFile.files[0])});
    input.addEventListener('paste',function(e){var items=e.clipboardData&&e.clipboardData.items?Array.from(e.clipboardData.items):[];var item=items.find(function(x){return x.kind==='file'&&/^image\//i.test(x.type)});if(item){var file=item.getAsFile();if(file){e.preventDefault();sendChatImage(file);}}});
    chat.querySelector('.up-close').onclick=function(e){e.stopPropagation();chat.classList.add('hidden')};
    chat.querySelector('.up-chat-send').onclick=function(e){e.stopPropagation();sendChat()};
    input.addEventListener('input',renderMentionMenu);input.addEventListener('click',renderMentionMenu);input.addEventListener('keyup',renderMentionMenu);
    input.addEventListener('keydown',function(e){if(e.key==='Escape'){var menu=chat.querySelector('.up-mention-menu');if(menu)menu.classList.add('hidden');return;}if(e.key==='Enter'&&!e.shiftKey){var menu=chat.querySelector('.up-mention-menu');if(menu&&!menu.classList.contains('hidden')){var first=menu.querySelector('.up-mention-option');if(first){e.preventDefault();applyMention(first.getAttribute('data-name'));return;}}e.preventDefault();sendChat();}});
    api('POST','/api/chat/read',{}).then(function(){setUnread(0);stopLocalBarui();loadChat()}).catch(loadChat);
  }
  function refreshChatAfterSend(input,btn){if(input)input.value='';return api('POST','/api/chat/read',{}).then(function(){setUnread(0);return api('GET','/api/chat')}).then(function(d){chatCache=d.messages||[];renderChat();if(btn)btn.disabled=false;});}
  function sendChat(){var input=chat.querySelector('.up-chat-input');var text=(input.value||'').trim();if(!text)return;var btn=chat.querySelector('.up-chat-send');btn.disabled=true;api('POST','/api/chat',{message:text}).then(function(){return refreshChatAfterSend(input,btn)}).catch(function(e){btn.disabled=false;var box=chat.querySelector('.up-chat-list');if(box)box.insertAdjacentHTML('afterbegin','<div class="up-history-empty">'+esc(e.message)+'</div>');});}
  function imageToDataUrl(file){return new Promise(function(resolve,reject){if(!file||!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)){reject(new Error('Escolha uma imagem PNG, JPG, WEBP ou GIF.'));return;}if(file.size>5*1024*1024){reject(new Error('A imagem deve ter no máximo 5 MB.'));return;}var reader=new FileReader();reader.onload=function(){try{var imgEl=new Image();imgEl.onload=function(){var max=1600,scale=Math.min(1,max/Math.max(imgEl.naturalWidth||imgEl.width,imgEl.naturalHeight||imgEl.height));var w=Math.max(1,Math.round((imgEl.naturalWidth||imgEl.width)*scale)),h=Math.max(1,Math.round((imgEl.naturalHeight||imgEl.height)*scale));var c=document.createElement('canvas');c.width=w;c.height=h;var ctx=c.getContext('2d');ctx.drawImage(imgEl,0,0,w,h);resolve(c.toDataURL('image/webp',0.82));};imgEl.onerror=function(){resolve(String(reader.result));};imgEl.src=String(reader.result);}catch(e){resolve(String(reader.result));}};reader.onerror=function(){reject(new Error('Não foi possível ler a imagem.'));};reader.readAsDataURL(file);});}
  function sendChatImage(file){var btn=chat.querySelector('.up-chat-send'),photoBtn=chat.querySelector('.up-chat-photo');if(btn)btn.disabled=true;if(photoBtn)photoBtn.disabled=true;imageToDataUrl(file).then(function(dataUrl){return api('POST','/api/chat/image',{dataUrl:dataUrl})}).then(function(r){return api('POST','/api/chat',{message:'',imageUrl:r.imageUrl})}).then(function(){return refreshChatAfterSend(null,btn)}).catch(function(e){if(btn)btn.disabled=false;message(e.message,true)}).finally(function(){if(photoBtn)photoBtn.disabled=false});}

  function login(){
    card.innerHTML='<div class="up-title">UpStatus</div><div class="up-you">Entre para controlar o seu status.</div><div class="up-login"><label>Servidor</label><input class="up-input" id="up-server"><label>Seu nome</label><select class="up-select" id="up-name"></select><label>Senha</label><input class="up-input" id="up-password" type="password" placeholder="Sua senha"><button id="up-enter">Entrar</button></div><div class="up-message"></div>';
    card.querySelector('#up-server').value=server;
    api('GET','/api/members').then(function(r){
      card.querySelector('#up-name').innerHTML=(r.members||[]).map(function(x){return '<option>'+esc(x.name)+'</option>'}).join('');
      if(member)card.querySelector('#up-name').value=member;
    }).catch(function(){card.querySelector('#up-name').innerHTML='<option>Ricardo</option><option>Lohan</option><option>Guilherme</option>'});
    card.querySelector('#up-enter').onclick=async function(){
      try{
        server=card.querySelector('#up-server').value.trim().replace(/\/$/,'');
        var name=card.querySelector('#up-name').value;
        var password=card.querySelector('#up-password').value;
        var account=await api('GET','/api/account?name='+encodeURIComponent(name));
        var r=await api('POST',account.needsSetup?'/api/setup':'/api/login',{name:name,password:password});
        token=r.token;member=r.name;role=r.role||'implementation_user';
        GM_setValue(key+'server',server);GM_setValue(key+'token',token);GM_setValue(key+'member',member);GM_setValue(key+'role',role);
        img.src=server+'/skeleton.gif';app();refresh();
      }catch(e){message(e.message,true)}
    };
    card.querySelector('#up-password').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();card.querySelector('#up-enter').click();}});
  }

  var theme=GM_getValue(key+'theme','dark')==='light'?'light':'dark';
  function applyTheme(){
    root.classList.toggle('up-theme-light',theme==='light');
    var btn=card.querySelector('.up-theme-btn');
    if(btn){btn.innerHTML=iconSvg(theme==='dark'?'sun':'moon');btn.title=theme==='dark'?'Mudar para tema branco':'Mudar para tema preto';btn.setAttribute('aria-label',btn.title);}
  }
  function toggleTheme(){
    theme=theme==='dark'?'light':'dark';
    GM_setValue(key+'theme',theme);
    applyTheme();
  }

  function app(){
    api('GET','/api/members').then(function(r){window.__upstatusMembers=(r.members||[]).map(function(x){return x.name});}).catch(function(){});
    card.innerHTML='<div class="up-head"><div><div class="up-title">UpStatus</div><div class="up-you">Conectado como '+esc(member)+'</div></div><div class="up-actions"><button class="up-chat-btn" title="Chat da equipe" aria-label="Chat da equipe">'+iconSvg('chat')+'</button><button class="up-notification-btn" title="Ativar notificações externas" aria-label="Ativar notificações externas">'+iconSvg('bell')+'</button><button class="up-theme-btn" title="Trocar tema" aria-label="Trocar tema">'+iconSvg(theme==='dark'?'sun':'moon')+'</button><button class="up-history-btn hidden" title="Ver histórico" aria-label="Ver histórico">'+iconSvg('clock')+'</button><button class="up-logout">Sair</button></div></div><div class="up-statuses"><button class="up-status online">'+iconSvg('online')+' Online</button><button class="up-status busy">'+iconSvg('busy')+' Ocupado</button><button class="up-status away">'+iconSvg('away')+' Ausente</button></div><div class="up-reasons hidden"><label class="up-label">Motivo de ocupado</label><div class="up-reason-picker"><button type="button" class="up-reason-trigger"><span class="up-reason-trigger-icon">'+iconSvg('edit')+'</span><span class="up-reason-trigger-text">Selecione um motivo</span></button><div class="up-reason-menu hidden">'+reasons.map(function(x){return '<button type="button" class="up-reason-option" data-value="'+esc(x.value)+'">'+iconSvg(x.icon)+'<span class="up-reason-text">'+esc(x.label)+'</span></button>'}).join('')+'</div></div><select class="up-select hidden"></select><input class="up-input hidden" placeholder="Escreva o motivo"><button class="up-confirm hidden">Confirmar ocupado</button></div><div class="up-message"></div><div class="up-notice">Sincronização com o Sale Smartly ativa.</div><div class="up-team-title">Equipe</div><div class="up-team">Carregando…</div>';
    history.innerHTML='<div class="up-history-head"><div class="up-history-title">Histórico</div><div class="up-actions"><button class="up-export" title="Exportar histórico">'+iconSvg('download')+' TXT</button><button class="up-close">Fechar</button></div></div><div class="up-history-list">Carregando…</div>';

    var box=card.querySelector('.up-reasons'),select=box.querySelector('select'),custom=box.querySelector('input'),confirm=box.querySelector('button.up-confirm'),trigger=box.querySelector('.up-reason-trigger'),menu=box.querySelector('.up-reason-menu');
    var historyBtn=card.querySelector('.up-history-btn');
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
    card.querySelector('.up-logout').onclick=function(){token='';member='';role='implementation_user';GM_setValue(key+'token','');GM_setValue(key+'member','');GM_setValue(key+'role','');history.classList.add('hidden');login()};
    history.querySelector('.up-close').onclick=function(){history.classList.add('hidden')};
    history.querySelector('.up-export').onclick=function(){exportHistoryTxt()};
    card.querySelector('.up-chat-btn').onclick=function(e){e.stopPropagation();openChat()};
    card.querySelector('.up-notification-btn').onclick=function(e){e.stopPropagation();requestExternalNotifications()};
    card.querySelector('.up-theme-btn').onclick=function(e){e.stopPropagation();toggleTheme()};
    updateNotificationPermissionUI();
    applyTheme();
    updateOutgoingBaruiUI();
    card.insertAdjacentHTML('beforeend','<div class="up-update">Versão v'+CURRENT_VERSION+' <button type="button" class="up-update-check">Verificar atualização</button><button type="button" class="up-update-now">Atualizar</button><span class="up-update-status"></span></div>');
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
  function waitRemoteResult(commandId,target,msg,confirm,started){
    var t=started||Date.now();
    api('GET','/api/remote-status/result?id='+encodeURIComponent(commandId)).then(function(d){
      if(d&&d.ready&&d.result){
        if(d.result.ok){msg.style.color='#9ce5b8';msg.textContent='Fila de '+target+' atualizada com sucesso.';setTimeout(function(){closeRemoteControl();refresh();},700);}
        else{msg.style.color='#ff9aaa';msg.textContent='Falha: '+(d.result.error||'não foi possível alterar a fila.');if(confirm)confirm.disabled=false;}
        return;
      }
      if(Date.now()-t>=15000){msg.style.color='#ff9aaa';msg.textContent='Tempo esgotado. '+target+' não confirmou a alteração.';if(confirm)confirm.disabled=false;return;}
      setTimeout(function(){waitRemoteResult(commandId,target,msg,confirm,t);},1000);
    }).catch(function(){
      if(Date.now()-t>=15000){msg.style.color='#ff9aaa';msg.textContent='Tempo esgotado. Não foi possível confirmar a alteração.';if(confirm)confirm.disabled=false;return;}
      setTimeout(function(){waitRemoteResult(commandId,target,msg,confirm,t);},1000);
    });
  }
  function pollRemoteStatus(){
    if(!token)return;
    api('GET','/api/remote-status').then(function(d){
      if(!d.pending||!d.command)return;
      var c=d.command;
      if(remotePending[c.id])return;
      remotePending[c.id]=true;
      (async function(){
        var ok=false,error='';
        try{
          await syncSaleSmartly(c.status);
          await api('POST','/api/status',{status:c.status,reason:c.reason||''});
          ok=true;
          if(location.hostname==='app.salesmartly.com')setTimeout(function(){location.reload()},250);
        }catch(e){error=e.message||'Falha ao sincronizar o Sale Smartly.';}
        try{await api('POST','/api/remote-status/result',{commandId:c.id,ok:ok,error:error});}catch(_){ }
        delete remotePending[c.id];
        if(!ok)message('Comando remoto de '+c.sender+' falhou: '+error,true);else refresh();
      })();
    }).catch(function(){});
  }

  function refresh(){
    if(!token||!member)return;
    api('GET','/api/status').then(function(d){
      var team=card.querySelector('.up-team');if(!team)return;
      window.__upstatusTeam=d.members||{};
      team.innerHTML=Object.keys(d.members).map(function(k){
        var m=d.members[k];
        if(m.name===member)currentStatus=m.status;
        var controls=(role==='implementation_admin'&&m.name!==member)
          ? '<button type="button" class="up-member-barui" data-target="'+esc(m.name)+'" title="Enviar BARUI para '+esc(m.name)+'" aria-label="Enviar BARUI para '+esc(m.name)+'">'+iconSvg('sound')+'</button><button type="button" class="up-member-power" data-target="'+esc(m.name)+'" title="Controlar fila de '+esc(m.name)+'" aria-label="Controlar fila de '+esc(m.name)+'">'+iconSvg('power')+'</button>'
          : '';
        return '<div class="up-member"><div class="up-member-top"><b>'+esc(m.name)+'</b>'+controls+'<span class="up-badge b-'+m.status+'">'+labels[m.status]+'</span></div>'+
          (m.reason?'<div class="up-reason">'+reasonIcon(m.reason)+' '+esc(reasonLabel(m.reason))+'</div>':'')+
          (m.updatedAt?'<div class="up-time">Desde '+fmtTime(m.updatedAt)+'</div>':'')+
          '</div>';
      }).join('');
      team.querySelectorAll('.up-member-barui').forEach(function(btn){btn.onclick=function(e){e.preventDefault();e.stopPropagation();toggleBarui(btn.getAttribute('data-target'));};});
      team.querySelectorAll('.up-member-power').forEach(function(btn){btn.onclick=function(e){e.preventDefault();e.stopPropagation();openRemoteControl(btn.getAttribute('data-target'));};});
      updateOutgoingBaruiUI();
      setBubbleStatus(currentStatus);
    }).catch(function(e){message(e.message,true)});
    loadChat();
  }

  function openHistory(){
    if(role!=='implementation_admin')return;
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
        return header+'<div class="up-history-item"><div class="up-history-meta"><span>'+fmtTime(item.createdAt)+'</span><b>'+esc(item.user)+'</b><span>'+statusIcon(item.status)+' '+labels[item.status]+'</span></div>'+
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
      var line=fmtTime(item.createdAt)+' | '+item.user+' | '+labels[item.status];
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
  document.addEventListener('pointerdown',function(e){
    if(!root.contains(e.target)){
      card.classList.add('hidden');
      history.classList.add('hidden');
      chat.classList.add('hidden');
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
    if(!moved){if(!history.classList.contains('hidden'))history.classList.add('hidden');if(!chat.classList.contains('hidden'))chat.classList.add('hidden');card.classList.toggle('hidden')}
  });
  bubble.addEventListener('pointercancel',function(){drag=null});

  if(token&&member){
    api('GET','/api/me').then(function(r){
      if(r.authenticated){role=r.role||role;GM_setValue(key+'role',role);app();refresh()}
      else login();
    }).catch(login);
  }else login();

  setInterval(refresh,5000);
  setInterval(loadChat,5000);
  setInterval(pollBarui,1000);
  setInterval(pollRemoteStatus,1000);
  setInterval(checkUpdate,60000);
})();
