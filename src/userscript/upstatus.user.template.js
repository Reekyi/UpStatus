// ==UserScript==
// @name         __UPSTATUS_NAME__
// @namespace    __UPSTATUS_NAMESPACE__
// @version      __UPSTATUS_VERSION__
// @match        *://*.salesmartly.com/*
// @match        *://salesmartly.com/*
// @match        *://*/*
// @noframes
// @run-at       document-start
// @require      https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_openInTab
// @updateURL    __UPSTATUS_UPDATE_URL__
// @downloadURL  __UPSTATUS_DOWNLOAD_URL__
// @connect      *
// ==/UserScript==
(function () {
  'use strict';

  // Arquitetura beta 1: uma única instância completa do UpStatus por vez.
  // O líder é preferencialmente uma aba do Sale Smartly. Outras abas carregam
  // somente um seguidor invisível, sem bolinha, painel, Realtime ou WebRTC.
  var isSalesSmartlyPage=/^([^.]+\.)*salesmartly\.com$/i.test(location.hostname);
  var upTabId='up-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
  var UP_LEADER_KEY='upstatus_leader_lock_beta1_v1';
  var UP_BUS_KEY='upstatus_cross_tab_bus_v1';
  var UP_LEADER_TTL=7000;
  var UP_LEADER_URL='https://app.salesmartly.com/next/chat';
  var UP_LEADER_WINDOW_NAME='upstatus_leader_window_v1';
  var UP_FOLLOWER_NOTICE_TTL=12000;
  var upIsLeader=false;
  var upLeaderHeartbeat=null;
  var upFollowerWatch=null;
  function upReadLeader(){
    try{return GM_getValue(UP_LEADER_KEY,null);}catch(e){return null;}
  }
  function upWriteBus(type,payload){
    try{GM_setValue(UP_BUS_KEY,JSON.stringify({id:upTabId,type:type,payload:payload||{},at:Date.now()}));}catch(e){}
  }
  var upFollowerNoticeItems=[];
  var upFollowerNoticeSeen={};
  function upEnsureFollowerNoticeRoot(){
    var root=document.getElementById('upstatus-follower-notices');
    if(root)return root;
    root=document.createElement('div');
    root.id='upstatus-follower-notices';
    root.style.cssText='position:fixed;right:18px;top:18px;z-index:2147483647;display:flex;flex-direction:column;gap:10px;width:min(360px,calc(100vw - 36px));font-family:Segoe UI,Arial,sans-serif;pointer-events:none;';
    (document.body||document.documentElement).appendChild(root);
    return root;
  }
  function upOpenLeaderFromFollower(){
    upWriteBus('open_upstatus');
    var w=null;
    try{w=window.open(UP_LEADER_URL,UP_LEADER_WINDOW_NAME);if(w&&typeof w.focus==='function')w.focus();}catch(e){}
    if(!w){try{GM_openInTab(UP_LEADER_URL,{active:true,insert:true,setParent:true});}catch(e){try{window.open(UP_LEADER_URL,'_blank');}catch(_){}}}
  }
  function upShowFollowerNotification(payload){
    if(!payload||!payload.type||!payload.id)return;
    if(Date.now()-Number(payload.at||0)>UP_FOLLOWER_NOTICE_TTL)return;
    var dedupe=String(payload.type)+':'+String(payload.id);
    if(upFollowerNoticeSeen[dedupe])return;
    upFollowerNoticeSeen[dedupe]=Date.now();
    var root=upEnsureFollowerNoticeRoot(),el=document.createElement('button');
    el.type='button';
    el.style.cssText='pointer-events:auto;display:flex;align-items:center;gap:11px;width:100%;padding:12px 14px;border:1px solid rgba(255,255,255,.14);border-radius:14px;background:linear-gradient(135deg,rgba(23,31,44,.97),rgba(12,18,28,.97));color:#edf3fb;box-shadow:0 14px 34px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.05);text-align:left;cursor:pointer;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);';
    var icon=payload.type==='call'?'☎':'●';
    var title=payload.type==='call'?String(payload.sender||'Alguém')+' está te ligando':String(payload.sender||'Alguém')+' enviou uma mensagem';
    var sub=payload.type==='call'?'Clique para atender no UpStatus':String(payload.preview||'Nova mensagem no chat');
    var safeTitle=String(title).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    var safeSub=String(sub).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    el.innerHTML='<span style="width:34px;height:34px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:rgba(95,211,139,.13);color:#7ee2a5;font-size:17px;flex:0 0 auto">'+icon+'</span><span style="min-width:0;flex:1"><b style="display:block;font-size:12px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+safeTitle+'</b><span style="display:block;margin-top:3px;color:#9eacc0;font-size:10px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+safeSub+'</span></span><span style="color:#708097;font-size:14px">›</span>';
    var item={el:el,timer:null};
    item.timer=setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);upFollowerNoticeItems=upFollowerNoticeItems.filter(function(x){return x!==item;});},payload.type==='call'?15000:9000);
    el.onclick=function(e){e.preventDefault();clearTimeout(item.timer);if(el.parentNode)el.parentNode.removeChild(el);upFollowerNoticeItems=upFollowerNoticeItems.filter(function(x){return x!==item;});upOpenLeaderFromFollower();};
    root.appendChild(el);upFollowerNoticeItems.push(item);
  }
  function upHandleFollowerBus(raw){
    if(!raw)return;
    try{
      var msg=typeof raw==='string'?JSON.parse(raw):raw;
      if(!msg||msg.id===upTabId||msg.type!=='follower_notification')return;
      upShowFollowerNotification(msg.payload||{});
    }catch(e){}
  }
  function upHandleBus(raw){
    if(!upIsLeader||!raw)return;
    try{
      var msg=typeof raw==='string'?JSON.parse(raw):raw;
      if(!msg||msg.id===upTabId||!msg.type)return;
      if(msg.type==='open_upstatus'){
        try{window.focus();}catch(e){}
        setTimeout(function(){try{openUpStatusPanel();}catch(e){}},0);
      }
    }catch(e){}
  }
  function upStartFollower(){
    try{GM_addValueChangeListener(UP_BUS_KEY,function(_,__,newValue){upHandleBus(newValue);upHandleFollowerBus(newValue);});}catch(e){}
    if(isSalesSmartlyPage){
      upFollowerWatch=setInterval(function(){
        var lock=upReadLeader();
        if(!lock||!lock.id||Date.now()-Number(lock.at||0)>UP_LEADER_TTL){
          try{location.reload();}catch(e){}
        }
      },2500);
    }
    document.addEventListener('keydown',function(e){
      if(e.shiftKey&&(e.key==='c'||e.key==='C')){
        var t=e.target,tag=t&&t.tagName?String(t.tagName).toLowerCase():'';
        var editable=!!(t&&(t.isContentEditable||tag==='input'||tag==='textarea'||tag==='select'));
        if(!editable){
          e.preventDefault();
          upWriteBus('open_upstatus');
          if(!isSalesSmartlyPage){
            var leader=upReadLeader();
            var leaderAlive=!!(leader&&leader.id&&Date.now()-Number(leader.at||0)<=UP_LEADER_TTL);
            if(!leaderAlive){
              try{
                GM_openInTab(UP_LEADER_URL,{active:true,insert:true,setParent:true});
              }catch(err){
                try{window.open(UP_LEADER_URL,'_blank');}catch(e2){}
              }
            }
          }
        }
      }
    },true);
  }
  function upTryBecomeLeader(){
    var current=upReadLeader();
    var currentIsSales=!!(current&&/([^.]+\.)*salesmartly\.com$/i.test(String(current.host||'')));
    if(current&&current.id&&current.id!==upTabId&&currentIsSales&&Date.now()-Number(current.at||0)<=UP_LEADER_TTL){
      upStartFollower();
      return false;
    }
    try{GM_setValue(UP_LEADER_KEY,{id:upTabId,at:Date.now(),host:location.hostname});}catch(e){upStartFollower();return false;}
    var verify=upReadLeader();
    if(!verify||verify.id!==upTabId){upStartFollower();return false;}
    upIsLeader=true;
    try{window.name=UP_LEADER_WINDOW_NAME;}catch(e){}
    upLeaderHeartbeat=setInterval(function(){
      try{GM_setValue(UP_LEADER_KEY,{id:upTabId,at:Date.now(),host:location.hostname});}catch(e){}
    },2000);
    try{GM_addValueChangeListener(UP_BUS_KEY,function(_,__,newValue){upHandleBus(newValue);});}catch(e){}
    window.addEventListener('beforeunload',function(){
      try{
        var lock=upReadLeader();
        if(lock&&lock.id===upTabId)GM_setValue(UP_LEADER_KEY,{id:'',at:0,host:''});
      }catch(e){}
      if(upLeaderHeartbeat)clearInterval(upLeaderHeartbeat);
    });
    return true;
  }
  if(!isSalesSmartlyPage){
    upStartFollower();
    return;
  }
  if(!upTryBecomeLeader())return;

  // Captura o botão direito do chat no início da página, antes de listeners do Sale Smartly.
  if(!window.__upstatusChatContextEarlyCapture){
    window.__upstatusChatContextEarlyCapture=true;
    document.addEventListener('contextmenu',function(e){
      try{
        var item=e.target&&e.target.closest?e.target.closest('.up-chat-item'):null;
        if(!item)return;
        var chatEl=document.getElementById('upstatus-chat');
        if(!chatEl||!chatEl.contains(item))return;
        var id=item.getAttribute('data-message-id');
        var msg=chatCache.find(function(x){return x.id===id;});
        if(!msg)return;
        e.preventDefault();
        e.stopImmediatePropagation();
        openChatContextMenu(e,msg);
      }catch(err){}
    },true);
  }

  var key='__UPSTATUS_STORAGE_PREFIX__';
  var faviconState={link:null,originalHref:'',originalData:'',blinkTimer:null,on:false};
  var CLOUD_SERVER='__UPSTATUS_CLOUD_SERVER__';
  var server=CLOUD_SERVER;
  var UP_REALTIME_URL='https://dlfvkawaiqduhlazsszm.supabase.co';
  var UP_REALTIME_KEY='sb_publishable_qoML52WUyBQRMB6DLP1yjw_J0Pbaae_';
  var UP_REALTIME_TOPIC='__UPSTATUS_REALTIME_TOPIC__';
  var realtimeClient=null,realtimeChannel=null,realtimeActive=false,realtimeRetryTimer=null;
  // Novo motor de chamadas: WebRTC para áudio + Supabase Realtime somente para sinalização.
  // Mantido isolado do chat, status e demais recursos do UpStatus.
  var upCall={
    pc:null,localStream:null,remoteStream:null,audio:null,audioCtx:null,audioSource:null,audioGain:null,
    overlay:null,callId:'',peer:'',role:'',initiator:'',participants:[],pendingInvites:{},pendingOffers:{},
    pendingInvite:null,peers:{},active:false,connected:false,muted:false,timer:null,counterTimer:null,startedAt:0,
    waitingForConnection:false,notice:'',ringtoneTimer:null,ringtoneCtx:null,ringtoneAllowed:false,
    ringtoneLoadId:0,ringtoneSource:null,ringtoneGain:null
  };
  // Controle global do ringtone: evita áudio órfão quando há mais de uma instância do userscript na página.
  var upRingtoneGlobal=window.__upstatusRingtoneGlobal||(window.__upstatusRingtoneGlobal={generation:0,sources:[],gains:[]});
  // Coordenação do ringtone entre instâncias/contextos do UpStatus.
  // A chamada real pode ser recebida por mais de um contexto da mesma página.
  var UP_RINGTONE_CHANNEL='__UPSTATUS_RINGTONE_CHANNEL__';
  var upCallInstanceId='up-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
  var upRingtoneChannel=null;
  var upRingtoneStorageKey='__UPSTATUS_RINGTONE_STORAGE_KEY__';
  function callHandleRemoteRingtoneStop(payload){
    try{
      var p=payload&&payload.detail?payload.detail:payload;
      if(!p||p.type!=='stop'||!p.callId)return;
      if(String(p.instanceId||'')===upCallInstanceId)return;
      if(!upCall.callId||String(p.callId)!==String(upCall.callId))return;
      callStopRingtone(false);
    }catch(e){}
  }
  function callInitRingtoneChannel(){
    if(upRingtoneChannel||typeof BroadcastChannel==='undefined')return;
    try{
      upRingtoneChannel=new BroadcastChannel(UP_RINGTONE_CHANNEL);
      upRingtoneChannel.onmessage=function(e){callHandleRemoteRingtoneStop(e&&e.data);};
    }catch(e){upRingtoneChannel=null;}
  }
  function callBroadcastRingtoneStop(callId,reason){
    if(!callId)return;
    var payload={type:'stop',callId:String(callId),reason:String(reason||'lifecycle'),instanceId:upCallInstanceId,at:Date.now()};
    try{
      document.dispatchEvent(new CustomEvent('UPSTATUS_RINGTONE_STOP',{detail:payload}));
    }catch(e){}
    try{
      if(!upRingtoneChannel)callInitRingtoneChannel();
      if(upRingtoneChannel)upRingtoneChannel.postMessage(payload);
    }catch(e){}
    try{
      localStorage.setItem(upRingtoneStorageKey,JSON.stringify(payload));
    }catch(e){}
  }
  document.addEventListener('UPSTATUS_RINGTONE_STOP',function(e){callHandleRemoteRingtoneStop(e);});
  window.addEventListener('storage',function(e){
    if(e.key!==upRingtoneStorageKey||!e.newValue)return;
    try{callHandleRemoteRingtoneStop(JSON.parse(e.newValue));}catch(err){}
  });
  callInitRingtoneChannel();
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
  var chatLoading=false,typingPolling=false,remotePolling=false,refreshing=false,readSentKey='',chatFastSince='';
  var chatForceScrollBottom=false;
  var remoteResultCache={},remoteResultWaiters={};
  var UpNativeNotification=null;

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
            if(d.type==='chat'){
              var chatEl=document.getElementById('upstatus-chat');
              if(chatEl&&!chatEl.classList.contains('hidden')&&document.visibilityState==='visible')return;
            }
            var n=new window.__upstatusNativeNotification(d.title||'UpStatus',d.options||{});
            if(d.type==='chat'){
              try{window.__upstatusActiveExternalNotifications=window.__upstatusActiveExternalNotifications||[];window.__upstatusActiveExternalNotifications.push(n);}catch(e){}
              n.onclose=function(){
                try{
                  var list=window.__upstatusActiveExternalNotifications||[];
                  var i=list.indexOf(n);
                  if(i>=0)list.splice(i,1);
                }catch(e){}
              };
            }
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
      // usa Web Audio para seus próprios alertas de menção.
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
  var chatSending=false;
  var profileCache={};
  var mediaBlobCache={};
  var audioWaveformCache={};
  var audioWaveformPending={};
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
  var originalTitle=document.title;
  var currentStatus='offline';
  var CURRENT_VERSION='__UPSTATUS_VERSION__';
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
    '@keyframes upAlertShake{0%,100%{transform:translateX(0) rotate(0)}20%{transform:translateX(-4px) rotate(-3deg)}40%{transform:translateX(4px) rotate(3deg)}60%{transform:translateX(-3px) rotate(-2deg)}80%{transform:translateX(3px) rotate(2deg)}}.up-toast-stack{position:absolute;right:52px;bottom:0;width:300px;display:flex;flex-direction:column;gap:7px;pointer-events:none}.up-toast{position:relative;pointer-events:auto;box-sizing:border-box;width:100%;padding:9px 28px 9px 11px;border:1px solid rgba(90,105,130,.45);border-radius:12px;background:rgba(25,33,46,.82);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 8px 24px rgba(0,0,0,.22);color:#e7edf7;animation:uptoastIn .16s ease-out}.up-toast-name{font-size:11px;font-weight:750;color:#aebbd0;line-height:1.15;margin-bottom:3px}.up-toast-text{font-size:12px;line-height:1.35;white-space:pre-wrap;word-break:break-word}.up-toast-close{position:absolute;right:7px;top:6px;width:18px;height:18px;border:0;border-radius:50%;background:transparent;color:#9aa8bc;font-size:14px;line-height:18px;padding:0;cursor:pointer}.up-toast-close:hover{background:rgba(127,145,170,.16);color:#edf2fb}@keyframes uptoastIn{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}'+
'#upstatus-bubble{position:relative;width:42px;height:42px;border:3px solid #6b7688;border-radius:50%;background:#5b6574;overflow:visible;padding:0;box-shadow:0 5px 16px #0009;cursor:grab;display:flex;align-items:center;justify-content:center;user-select:none;-webkit-user-select:none;touch-action:none;line-height:1;transition:background .18s,border-color .18s}'+
    '#upstatus-bubble .up-bubble-avatar{display:block;width:100%;height:100%;border-radius:50%;object-fit:cover;box-sizing:border-box;pointer-events:none}'+
    '#upstatus-bubble .up-bubble-icon{width:22px;height:22px;color:#fff}'+
    '.up-notify-dot{position:absolute;right:-10px;top:-10px;min-width:18px;height:18px;padding:0 4px;border-radius:999px;background:#ff334f;border:2px solid #19212e;display:none;align-items:center;justify-content:center;box-sizing:border-box;color:#fff;font:800 10px/1 Segoe UI,Arial,sans-serif}.up-notify-dot.show{display:block}.up-quick-chat-bubble{position:absolute;left:-7px;top:-7px;width:22px;height:22px;border:2px solid #19212e;border-radius:50%;background:#687384;color:#fff;box-sizing:border-box;padding:0;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px #0008;cursor:pointer;z-index:5;transition:background .18s,border-color .18s,transform .18s}.up-quick-chat-bubble:hover{background:#7a8799;border-color:#253149;transform:scale(1.08)}.up-quick-chat-bubble.lucca-active{background:#c52f48;border-color:#ff667b;animation:upLuccaPulse .8s infinite alternate}.up-quick-chat-bubble.lucca-active:hover{background:#d63b52;border-color:#ff8292}@keyframes upLuccaPulse{from{box-shadow:0 4px 10px #0008,0 0 0 0 #ff334f66}to{box-shadow:0 4px 10px #0008,0 0 0 7px #ff334f33}}.up-quick-chat-icon{width:12px;height:12px}.up-update-dot{position:absolute;right:-8px;top:-8px;width:22px;height:22px;border-radius:50%;background:#4f7dff;border:2px solid #19212e;display:none;align-items:center;justify-content:center;font-size:12px;line-height:1;box-sizing:border-box;cursor:pointer;pointer-events:auto}.up-update-dot.show{display:flex}.up-update-dot:hover{background:#6b93ff;transform:scale(1.08)}'+
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
    '.up-chat-lucca-alert{flex:0 0 auto;position:relative;z-index:20;margin-top:8px;padding:9px 12px;border:1px solid #a92e43;border-radius:9px;background:#351724;color:#ff9aaa;font-size:11px;font-weight:850;letter-spacing:.2px;box-shadow:0 4px 14px #0005}.up-chat-lucca-alert.hidden{display:none}.up-chat-system-event{display:flex;justify-content:center;padding:8px 0 6px}.up-chat-system-event span{padding:6px 10px;border-radius:999px;background:#252e3c;border:1px solid #3a475b;color:#aebbd0;font-size:10px;font-weight:800;text-align:center}.up-chat-system-event.join span{background:#351724;border-color:#7c2a3e;color:#ff9aaa}.up-chat-list{height:auto;flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;margin-top:12px;margin-right:-18px;margin-left:-5px;padding-right:18px;padding-left:5px;scrollbar-width:thin}.up-chat-date-divider{display:flex;align-items:center;gap:9px;margin:14px 0 8px;color:#8fa0b8;font-size:10px;font-weight:800;letter-spacing:.15px}.up-chat-date-divider:before,.up-chat-date-divider:after{content:"";height:1px;flex:1;background:#334158}.up-chat-date-divider span{padding:5px 10px;border:1px solid #334158;border-radius:999px;background:#182130;white-space:nowrap}.up-chat-item.group-middle .up-chat-bubble{border-radius:7px 14px 14px 7px;padding-top:5px;padding-bottom:5px}.up-chat-item.own.group-middle .up-chat-bubble{border-radius:14px 7px 7px 14px}.up-chat-item.group-end .up-chat-bubble{margin-bottom:2px}.up-chat-item.group-start{padding-top:7px}.up-chat-item.group-end{padding-bottom:7px}.up-chat-item.group-middle{padding-top:1px;padding-bottom:1px}.up-chat-avatar.avatar-hidden{visibility:hidden}.up-chat-audio-player{display:flex;align-items:center;gap:8px;min-width:220px;max-width:100%;margin-top:6px;padding:7px 8px;border-radius:10px;background:rgba(8,14,24,.28);border:1px solid rgba(255,255,255,.08);box-sizing:border-box}.up-chat-audio-play{width:30px;height:30px;flex:0 0 30px;border:0;border-radius:50%;background:#fff;color:#3159bd;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:12px}.up-chat-audio-wave{height:22px;flex:1;display:flex;align-items:center;gap:2px;overflow:hidden}.up-chat-audio-wave span{width:3px;min-height:4px;border-radius:3px;background:#a9c2ff;opacity:.75}.up-chat-audio-time{font-size:10px;color:#dbe5f5;font-variant-numeric:tabular-nums;min-width:30px;text-align:right}.up-chat-audio-volume{border:0;background:transparent;color:#dbe5f5;cursor:pointer;padding:2px}.up-chat-header-info{font-size:10px;color:#8fa0b8;margin-top:2px}.up-chat-header-info .chat-online-dot{color:#55e58b}.up-chat-send{position:absolute;right:7px;bottom:7px;margin:0;width:28px;height:28px;border:0;border-radius:50%;padding:0;background:#4f7dff;color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;z-index:2}.up-chat-send:hover{background:#6b92ff;transform:translateY(-1px)}.up-chat-send .up-icon{width:15px;height:15px}scrollbar-color:rgba(139,149,164,.35) transparent}.up-chat-list::-webkit-scrollbar{width:6px}.up-chat-list::-webkit-scrollbar-track{background:transparent}.up-chat-list::-webkit-scrollbar-thumb{background:rgba(139,149,164,.30);border-radius:999px}.up-chat-list::-webkit-scrollbar-thumb:hover{background:rgba(139,149,164,.50)}.up-chat-item{position:relative;display:flex;align-items:flex-end;gap:7px;padding:6px 0}.up-chat-item.own{flex-direction:row-reverse;cursor:context-menu}.up-chat-avatar{width:28px;height:28px;flex:0 0 28px;border-radius:50%;object-fit:cover;background:#273247;border:2px solid transparent;box-sizing:border-box}.up-chat-avatar.up-chat-presence-idle{border-color:#62a7ff;box-shadow:0 0 7px rgba(83,155,255,.6)}.up-chat-avatar.up-chat-presence-active{border-color:#55e58b;animation:upChatPresencePulse 1.9s ease-in-out infinite}@keyframes upChatPresencePulse{0%,100%{box-shadow:0 0 0 0 rgba(82,224,137,.12),0 0 7px rgba(82,224,137,.62)}50%{box-shadow:0 0 0 1px rgba(82,224,137,.28),0 0 10px rgba(82,224,137,.72)}}.up-chat-bubble{position:relative;max-width:78%;min-width:52px;padding:8px 11px;border-radius:16px 16px 16px 5px;background:linear-gradient(145deg,#2a3549,#252f41);color:#e7edf7;box-sizing:border-box;border:1px solid rgba(117,137,168,.16);box-shadow:0 4px 14px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.035);transition:transform .12s ease,box-shadow .12s ease}.up-chat-item.own .up-chat-bubble{border-radius:16px 16px 5px 16px;background:linear-gradient(145deg,#3967d1,#3159bd);border-color:rgba(122,157,255,.16);box-shadow:0 4px 14px rgba(23,67,160,.22),inset 0 1px 0 rgba(255,255,255,.07)}.up-chat-item.lucca .up-chat-bubble{background:rgba(106,18,39,.48);border:1px solid rgba(255,76,108,.48);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 4px 18px rgba(255,45,82,.12),inset 0 1px 0 rgba(255,255,255,.07)}.up-chat-item.lucca .up-chat-meta b{color:#ff91a7}.up-chat-item.lucca .up-chat-text{color:#ffe9ee}.up-chat-system-event.clear span{background:#273247;border-color:#4f7dff;color:#a9c2ff}.up-chat-photo{cursor:zoom-in}.up-chat-lightbox{position:fixed;inset:0;z-index:2147483647;background:rgba(5,8,13,.88);display:flex;align-items:center;justify-content:center;padding:28px;box-sizing:border-box;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}.up-chat-lightbox.hidden{display:none}.up-chat-lightbox img{max-width:92vw;max-height:90vh;width:auto;height:auto;object-fit:contain;border-radius:12px;box-shadow:0 20px 70px #000b;border:1px solid #52627b}.up-chat-lightbox-close{position:absolute;right:22px;top:18px;width:38px;height:38px;border:0;border-radius:50%;background:rgba(39,50,71,.9);color:#fff;font-size:25px;line-height:38px;cursor:pointer}.up-chat-lightbox-close:hover{background:#4f5e75}.up-chat-meta{display:flex;align-items:center;gap:7px;font-size:10px;color:#9eabc0}.up-chat-meta b{font-weight:750;color:#cbd5e4}.up-chat-item.own .up-chat-meta{justify-content:flex-end}.up-chat-read{font-size:11px;color:#aebbd0;margin-left:4px;cursor:help;user-select:none}.up-chat-read.read{color:#63a2ff}.up-chat-own-meta{text-align:right;min-height:13px}.up-chat-profile-btn{width:34px;height:34px;padding:0;border:0;border-radius:50%;background:#273247;cursor:pointer;overflow:hidden}.up-chat-profile-btn img{width:100%;height:100%;object-fit:cover;display:block}.up-chat-title-wrap{display:flex;align-items:center;gap:8px}.up-chat-profile-modal{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}.up-chat-profile-modal.hidden{display:none}.up-chat-profile-dialog{width:min(330px,calc(100vw - 40px));padding:18px;border:1px solid #40506a;border-radius:14px;background:#182130;box-shadow:0 18px 45px #000b}.up-chat-profile-preview{width:84px;height:84px;margin:0 auto 12px;border-radius:50%;object-fit:cover;background:#273247;border:2px solid #40506a;display:block}.up-chat-profile-file{width:100%;margin:8px 0;color:#cbd5e4;font-size:12px}.up-chat-profile-actions{display:flex;gap:7px}.up-chat-profile-actions button{flex:1;border:0;border-radius:8px;padding:9px;cursor:pointer;font-weight:750}.up-chat-profile-save{background:#4f7dff;color:#fff}.up-chat-profile-cancel{background:#273247;color:#cbd5e4}.up-chat-profile-message{min-height:18px;font-size:11px;color:#ff9aaa;margin:7px 0}.up-delete-action{position:absolute;right:4px;top:28px;border:1px solid #4a566b;border-radius:6px;background:#273247;color:#ff9aaa;padding:4px 7px;font:700 11px Segoe UI,Arial,sans-serif;cursor:pointer;box-shadow:0 5px 14px #0006;z-index:5}.up-delete-action:hover{background:#3a2530;color:#ffb5c1}.up-delete-action.hidden{display:none}.up-chat-meta{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:#8fa0b8}.up-chat-text{font-size:13px;color:#e7edf7;white-space:pre-wrap;word-break:break-word;margin-top:4px}.up-chat-typing{display:flex;align-items:center;gap:7px;min-height:28px;margin:2px 0 3px 35px;color:#9eabc0;font-size:10px}.up-chat-typing.hidden{display:none}.up-chat-typing-avatar{width:22px;height:22px;border-radius:50%;object-fit:cover;border:1px solid #3a475b;background:#273247}.up-chat-typing-dots{display:inline-flex;align-items:center;gap:3px;padding:5px 7px;border-radius:10px 10px 10px 3px;background:#273247}.up-chat-typing-dots i{width:4px;height:4px;border-radius:50%;background:#aebbd0;animation:upTyping 1s infinite ease-in-out}.up-chat-typing-dots i:nth-child(2){animation-delay:.15s}.up-chat-typing-dots i:nth-child(3){animation-delay:.3s}@keyframes upTyping{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-3px);opacity:1}}.up-member-top{display:flex;align-items:center;gap:7px}.up-member-identity{display:flex;align-items:center;gap:6px;flex:1;min-width:0}.up-member-identity b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.up-member-version{font-size:10px;font-weight:700;color:#8fa0b8;background:#222d3d;border:1px solid #344158;border-radius:999px;padding:2px 5px;white-space:nowrap}.up-member-presence{width:8px;height:8px;border-radius:50%;flex:0 0 8px;background:#46505f;box-shadow:0 0 0 2px rgba(70,80,95,.12)}.up-member-presence.online{background:#579cff;box-shadow:0 0 7px rgba(87,156,255,.55)}.up-member-presence.chat{background:#51df88;box-shadow:0 0 7px rgba(81,223,136,.58)}.up-member-presence.offline{background:#46505f;box-shadow:none}.up-member-barui{width:28px;height:28px;padding:0;border:0;border-radius:50%;background:#273247;color:#c6d1e1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}.up-member-barui .up-icon{width:15px;height:15px}.up-member-barui:hover{background:#36445b}.up-member-barui.active{background:#c52f48;color:#fff;animation:upbaruibtn .55s infinite alternate}.up-member-barui:disabled{opacity:.55;cursor:wait}.up-member-power{width:28px;height:28px;padding:0;border:0;border-radius:50%;background:#273247;color:#c6d1e1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}.up-member-power .up-icon{width:15px;height:15px}.up-member-power:hover{background:#3b465b;color:#fff}.up-member-power:disabled{opacity:.55;cursor:wait}.up-remote-overlay{position:absolute;inset:0;z-index:100;background:rgba(10,15,24,.68);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;border-radius:16px}.up-remote-overlay.hidden{display:none}.up-remote-dialog{width:100%;max-width:315px;background:#182130;border:1px solid #40506a;border-radius:14px;padding:14px;box-sizing:border-box;box-shadow:0 18px 45px #000b}.up-remote-title{font-size:15px;font-weight:800}.up-remote-sub{font-size:11px;color:#9aa8bc;margin-top:3px}.up-remote-statuses{display:flex;gap:6px;margin-top:12px}.up-remote-status{flex:1;border:1px solid #3a475b;border-radius:8px;padding:9px 6px;background:#111722;color:#dce5f2;cursor:pointer;font:700 12px Segoe UI,Arial,sans-serif}.up-remote-status:hover,.up-remote-status.active{background:#30405b;border-color:#5b7fc8}.up-remote-reason{margin-top:9px}.up-remote-reason.hidden{display:none}.up-remote-reason-menu{display:flex;flex-direction:column;gap:3px}.up-remote-reason-option{border:0;background:#111722;color:#dce5f2;border-radius:7px;padding:8px;text-align:left;cursor:pointer;font:12px Segoe UI,Arial,sans-serif}.up-remote-reason-option:hover,.up-remote-reason-option.active{background:#30405b}.up-remote-actions{display:flex;gap:7px;margin-top:12px}.up-remote-actions button{flex:1;border:0;border-radius:8px;padding:9px;font:800 12px Segoe UI,Arial,sans-serif;cursor:pointer}.up-remote-cancel{background:#273247;color:#cbd5e4}.up-remote-confirm{background:#4f7dff;color:#fff}.up-remote-confirm:disabled{opacity:.55;cursor:wait}.up-remote-message{min-height:18px;margin-top:7px;font-size:11px;color:#ff9aaa}.up-chat-text{font-size:13px;color:#e7edf7;white-space:pre-wrap;word-break:break-word;margin-top:4px}.up-chat-photo{display:block;max-width:260px;max-height:210px;width:auto;height:auto;margin-top:6px;border:1px solid #3a475b;border-radius:9px;background:#111722;cursor:zoom-in;object-fit:contain;box-shadow:0 4px 14px #0004}.up-chat-media{display:block;max-width:220px;max-height:150px;margin-top:6px;border:1px solid #3a475b;border-radius:9px;background:#111722;object-fit:contain;box-shadow:0 4px 14px #0004}.up-chat-media-video{width:220px;height:150px}.up-chat-profile-hover{position:fixed;z-index:2147483647;display:none;width:148px;padding:10px;box-sizing:border-box;border:1px solid #52627b;border-radius:12px;background:#182130;box-shadow:0 14px 40px #000b;pointer-events:none;text-align:center}.up-chat-profile-hover.show{display:block}.up-chat-profile-hover img{display:block;width:96px;height:96px;margin:0 auto 7px;border-radius:50%;object-fit:cover;border:2px solid transparent;background:#273247}.up-chat-profile-hover img.up-chat-presence-idle{border-color:#62a7ff;box-shadow:0 0 8px rgba(83,155,255,.62)}.up-chat-profile-hover img.up-chat-presence-active{border-color:#55e58b;animation:upProfilePresencePulse 1.9s ease-in-out infinite}@keyframes upProfilePresencePulse{0%,100%{box-shadow:0 0 0 0 rgba(82,224,137,.12),0 0 7px rgba(82,224,137,.62)}50%{box-shadow:0 0 0 1px rgba(82,224,137,.28),0 0 10px rgba(82,224,137,.72)}}.up-chat-profile-hover-name{font-size:12px;font-weight:750;color:#e7edf7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.up-chat-profile-hover-role{font-size:10px;color:#9eabc0;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.up-chat-compose{position:relative;display:flex;align-items:stretch;gap:6px}.up-chat-input-wrap{position:relative;flex:1 1 auto;min-width:0}.up-chat-compose .up-chat-input{display:block;width:100%;box-sizing:border-box;min-width:0;padding-right:48px}.up-chat-tools{display:flex;align-items:stretch;gap:6px;flex:0 0 auto;margin-top:0}.up-chat-send{position:absolute;right:7px;bottom:7px;margin:0;width:28px;height:28px;border:0;border-radius:50%;padding:0;background:#4f7dff;color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;z-index:2}.up-chat-send:hover{background:#6b92ff;transform:translateY(-1px)}.up-chat-send .up-icon{width:15px;height:15px}.up-mention-menu{position:absolute;left:0;bottom:calc(100% + 8px);z-index:20;display:flex;flex-wrap:wrap;gap:6px;width:100%;padding:7px;box-sizing:border-box;background:#182130;border:1px solid #3a475b;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.32)}.up-mention-menu.hidden{display:none}.up-mention-option{flex:0 0 auto;border:1px solid #344158;background:#243149;color:#dbe5f5;border-radius:8px;padding:6px 9px;cursor:pointer;font:12px Segoe UI,Arial,sans-serif}.up-mention-option:hover{background:#30405b;border-color:#4f7dff}.up-mention-option.up-mention-all{background:#3b315f;border-color:#8065c7;color:#fff}.up-chat-tools{display:flex;gap:6px;flex:0 0 auto}.up-chat-emoji-btn{width:38px;height:42px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;padding:0;border:1px solid #3a475b;border-radius:8px;background:#273247;color:#dbe5f5;cursor:pointer}.up-chat-emoji-btn .up-icon{width:17px;height:17px}.up-chat-emoji-btn:hover{background:#35425a}.up-chat-attach{width:38px;height:42px;padding:0;border:1px solid #3a475b;border-radius:8px;background:#273247;color:#dbe5f5;cursor:pointer;font-size:17px;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box}.up-chat-attach:hover{background:#35425a}.up-chat-clear{width:38px;height:34px;border:0;border-radius:8px;background:#3a2730;color:#ff9aaa;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.up-chat-clear .up-icon{width:16px;height:16px}.up-chat-clear:hover{background:#552d3a}.up-chat-back{border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer;font:700 12px Segoe UI,Arial,sans-serif}.up-chat-back:hover{background:#35425a}.up-chat-mention{color:#7fb1ff;font-weight:750}.up-chat-input{flex:1 1 auto;width:auto;min-width:0;min-height:42px;height:42px;max-height:90px;resize:vertical;padding:8px;border-radius:8px;border:1px solid #3a475b;background:#111722;color:#edf2fb;font:13px Segoe UI,Arial,sans-serif}.up-update{font-size:11px;color:#9caac0;margin-top:10px}.up-update button{margin-left:6px;border:0;background:#273247;color:#c6d1e1;border-radius:6px;padding:4px 7px;cursor:pointer}.up-update button:hover{background:#35425a}.up-update .up-update-now:disabled{opacity:.45;cursor:not-allowed;background:#202938;color:#7f8ca0}.up-update .up-update-now:disabled:hover{background:#202938}.up-history-list{overflow:auto;flex:1;min-height:0;margin-top:12px}.up-history-day{font-size:11px;font-weight:800;letter-spacing:.2px;color:#8fa0b8;margin:12px 0 7px;padding:0 2px}.up-history-item{padding:10px 11px;margin-bottom:6px;border:1px solid #2f3d52;border-radius:10px;background:linear-gradient(145deg,#1b2535,#161f2c);box-sizing:border-box}.up-history-meta{display:flex;gap:7px;align-items:center;flex-wrap:wrap;font-size:11px}.up-history-meta>b{font-size:12px;color:#e4ebf5}.up-history-meta>span:first-child{color:#7f8ea4;font-variant-numeric:tabular-nums}.up-history-reason{font-size:11px;color:#aebbd0;margin-top:5px;padding-left:1px}.up-history-status{display:inline-flex;align-items:center;gap:5px;font-weight:750}.up-history-status-dot{width:8px;height:8px;border-radius:50%;display:inline-block;background:currentColor;box-shadow:0 0 7px currentColor}.up-history-status.online{color:#67dda0}.up-history-status.busy{color:#ff7180}.up-history-status.away{color:#b9c4d5}.up-history-empty{font-size:12px;color:#9aa8bc;padding:14px 0}'+
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
  style.textContent += '.up-update-prompt{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;background:rgba(4,8,15,.58);backdrop-filter:blur(3px)}.up-update-prompt-box{width:min(360px,calc(100vw - 32px));box-sizing:border-box;background:#19212e;border:1px solid #3a4b66;border-radius:14px;padding:18px;box-shadow:0 20px 55px #000b;color:#edf2fb}.up-update-prompt-title{font-size:16px;font-weight:800;margin-bottom:7px}.up-update-prompt-text{font-size:12px;line-height:1.5;color:#aebbd0}.up-update-prompt-actions{display:flex;justify-content:flex-end;gap:7px;margin-top:16px}.up-update-prompt-actions button{border:1px solid #33445c;border-radius:7px;padding:7px 10px;background:#1e2b3f;color:#cbd7e7;cursor:pointer}.up-update-prompt-actions .up-update-prompt-now{background:#4f7dff;border-color:#4f7dff;color:#fff}.up-chat-list{flex:1 1 0;height:0;min-height:0;overflow-y:scroll;overflow-x:hidden;scroll-behavior:auto;overscroll-behavior:contain}.up-chat-compose{flex:0 0 auto;min-height:0}.up-chat-typing{flex:0 0 auto}';
  style.textContent += '.up-patch-link{display:block;margin-top:3px;font-size:10px;color:#7f9dca;text-decoration:none;cursor:pointer;width:max-content}.up-patch-link:hover{text-decoration:underline;color:#a9c7ff}.up-patch-modal{position:fixed;inset:0;z-index:2147483647;background:rgba(4,8,14,.62);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}.up-patch-dialog{width:min(430px,calc(100vw - 40px));max-height:min(560px,calc(100vh - 40px));overflow:auto;box-sizing:border-box;border:1px solid #33445c;border-radius:16px;background:linear-gradient(145deg,#172131,#101722);color:#edf2fb;box-shadow:0 18px 55px rgba(0,0,0,.5);padding:18px}.up-patch-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.up-patch-title{font-size:15px;font-weight:800}.up-patch-close{border:0;background:#273247;color:#c6d1e1;border-radius:8px;width:28px;height:28px;cursor:pointer;font-size:16px}.up-patch-close:hover{background:#35425a}.up-patch-version{margin-top:14px;padding-top:13px;border-top:1px solid #29374b}.up-patch-version:first-of-type{margin-top:0;padding-top:0;border-top:0}.up-patch-version-title{font-size:12px;font-weight:800;color:#dbe5f5}.up-patch-list{margin:7px 0 0;padding-left:17px;color:#9eacc0;font-size:11px;line-height:1.55}.up-patch-list li{margin:2px 0}.up-theme-light .up-patch-link{color:#356fe8}.up-theme-light .up-patch-link:hover{color:#245fc4}.up-theme-light .up-patch-modal{background:rgba(15,23,42,.35)}.up-theme-light .up-patch-dialog{background:#fff;border-color:#d7dee9;color:#1e293b;box-shadow:0 18px 55px rgba(0,0,0,.2)}.up-theme-light .up-patch-close{background:#eef2f7;color:#334155}.up-theme-light .up-patch-close:hover{background:#e2e8f0}.up-theme-light .up-patch-version{border-color:#e2e8f0}.up-theme-light .up-patch-version-title{color:#1e293b}.up-theme-light .up-patch-list{color:#64748b}';
  style.textContent += '.up-chat-bubble{position:relative;padding-bottom:8px}.up-chat-own-meta{display:inline-flex;align-items:center;gap:2px;margin-left:6px;vertical-align:baseline;line-height:10px;font-size:10px;float:right;position:relative;top:2px}.up-chat-read{font-size:10px;line-height:10px;letter-spacing:-1px}.up-chat-reactions{clear:both}.up-chat-profile-hover-since{font-size:9px;color:#718096;margin-top:1px}.up-health-ping{font-variant-numeric:tabular-nums;font-weight:700;color:#8fa0b8}.up-health-ping.good{color:#75dba0}.up-health-ping.warn{color:#e7c56a}.up-health-ping.bad{color:#ff8499}.up-health-ping.pending{color:#7f8ea4}.up-health-member{display:flex;align-items:center;justify-content:space-between;gap:8px}.up-health-member .up-health-ping{margin-left:auto}';
  var root=node('div',{id:'upstatus-root'});
  var bubble=node('button',{id:'upstatus-bubble',title:'Abrir UpStatus'});
  var quickChatBubble=node('button',{className:'up-quick-chat-bubble',title:'Abrir Chat da equipe',type:'button','aria-label':'Abrir Chat da equipe'});
  var card=node('section',{id:'upstatus-card',className:'hidden'});
  var history=node('section',{id:'upstatus-history',className:'hidden'});
  var chat=node('section',{id:'upstatus-chat',className:'hidden'});
  var toastStack=node('div',{className:'up-toast-stack'});  var remoteOverlay=node('div',{className:'up-remote-overlay hidden'});
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
  root.append(style,bubble,quickChatBubble,card,history,chat,toastStack,remoteOverlay,chatProfileHover,health);
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
  function openPatchNotes(){
    var existing=root.querySelector('.up-patch-modal');
    if(existing)existing.remove();
    var modal=node('div',{className:'up-patch-modal'});
    modal.innerHTML='<div class="up-patch-dialog" role="dialog" aria-modal="true" aria-label="O que há de novo?"><div class="up-patch-head"><div class="up-patch-title">O que há de novo?</div><button type="button" class="up-patch-close" aria-label="Fechar">×</button></div><div class="up-patch-version"><div class="up-patch-version-title">v3.0.26</div><ul class="up-patch-list"><li>Corrigida a compatibilidade dos áudios gravados no Firefox com a reprodução no Chrome.</li><li>O gravador agora prioriza Ogg/Opus quando disponível e mantém WebM/Opus como fallback.</li></ul></div><div class="up-patch-version"><div class="up-patch-version-title">v3.0.25</div><ul class="up-patch-list"><li>Corrigido o clique direito nas mensagens do chat, restaurando as opções de responder, reagir e excluir a própria mensagem.</li><li>Corrigida a captura do menu de contexto para impedir que o menu nativo do navegador seja aberto sobre as mensagens do UpStatus.</li><li>Emojis do chat corrigidos para manter a renderização correta mesmo em ambientes com problemas de codificação.</li><li>Botão de gravação de áudio restaurado com o ícone 🎙️.</li></ul></div><div class="up-patch-version"><div class="up-patch-version-title">v3.0.24</div><ul class="up-patch-list"><li>Correções de renderização dos emojis do chat.</li><li>Restaurado o ícone do botão de gravação de áudio.</li><li>Melhorias leves no menu de contexto do chat.</li></ul></div><div class="up-patch-version"><div class="up-patch-version-title">v3.0.21</div><ul class="up-patch-list"><li>Atualizados os toques padrão de chamada e renovado o cache do áudio antigo para garantir que todos os usuários recebam a nova versão.</li></ul></div><div class="up-patch-version"><div class="up-patch-version-title">v3.0.19</div><ul class="up-patch-list"><li>Corrigido o ringtone órfão em chamadas recebidas, incluindo instâncias duplicadas do userscript e carregamentos assíncronos pendentes.</li></ul></div><div class="up-patch-version"><div class="up-patch-version-title">v3.0.18</div><ul class="up-patch-list"><li>Corrigido o toque de chamada no usuário que recebe a ligação: o ringtone agora é encerrado de forma determinística ao atender.</li></ul></div><div class="up-patch-version"><div class="up-patch-version-title">v3.0.17</div><ul class="up-patch-list"><li>Chat mais fluido ao enviar mensagens, com redução do flicker causado por redesenhos completos.</li><li>Mensagens enviadas agora são reconciliadas com o servidor sem reconstruir o chat inteiro quando não é necessário.</li><li>Corrigido o envio duplicado ao manter a tecla Enter pressionada.</li><li>Corrigido o reaparecimento do texto na caixa de mensagem após um envio já aceito pelo servidor.</li><li>Permite enviar mensagens consecutivas sem bloquear o envio enquanto a anterior é processada.</li><li>Melhorada a estabilidade do chat, incluindo preservação da posição de leitura e comportamento do scroll durante novas mensagens.</li><li>O chat agora evita acumular listeners de menu de contexto e seletor de emojis ao ser reaberto.</li><li>Chamadas de áudio consolidadas com WebRTC e Supabase Realtime para sinalização entre os usuários.</li><li>Mini-player de chamadas com mute, cronômetro, estados de conexão, controles de áudio e encerramento da ligação.</li><li>Melhorias no áudio e nos toques de chamada, com distribuição automática dos toques padrão e preservação de toques personalizados.</li></ul></div><div class="up-patch-version"><div class="up-patch-version-title">v3.0.16</div><ul class="up-patch-list"><li>Toques padrão de chamada agora são distribuídos automaticamente pelo GitHub.</li><li>Toques são armazenados localmente e personalizados continuam preservados.</li></ul></div><div class="up-patch-version"><div class="up-patch-version-title">v3.0.15</div><ul class="up-patch-list"><li>Corrigido o redesenho excessivo do chat que causava flicker.</li><li>Melhorado o controle de mensagens não lidas.</li></ul></div><div class="up-patch-version"><div class="up-patch-version-title">v3.0.14</div><ul class="up-patch-list"><li>Adicionado o sistema de chamadas WebRTC com áudio.</li><li>Adicionado mini-player de chamadas, mute, timer e controles de ligação.</li><li>Melhorado o áudio e os toques de chamada.</li></ul></div><div class="up-patch-version"><div class="up-patch-version-title">v3.0.8</div><ul class="up-patch-list"><li>Notificações do chat agora respeitam o estado do chat e da aba.</li></ul></div><div class="up-patch-version"><div class="up-patch-version-title">v3.0.7</div><ul class="up-patch-list"><li>Corrigido o botão "← Voltar" do chat.</li></ul></div><div class="up-patch-version"><div class="up-patch-version-title">v3.0.6</div><ul class="up-patch-list"><li>Adicionado o Patch Notes do UpStatus.</li><li>Novidades das versões reunidas em um só lugar.</li></ul></div><div class="up-patch-version"><div class="up-patch-version-title">v3.0.5</div><ul class="up-patch-list"><li>Chat corrigido e mais estável.</li><li>Correção de mensagens duplicadas.</li></ul></div><div class="up-patch-version"><div class="up-patch-version-title">v3.0.4</div><ul class="up-patch-list"><li>Correção da identificação do autor das mensagens.</li><li>Melhorias na sincronização do chat.</li></ul></div></div>';
    root.appendChild(modal);
    var close=modal.querySelector('.up-patch-close');
    function closePatch(){modal.remove();}
    close.onclick=closePatch;
    modal.addEventListener('click',function(e){if(e.target===modal)closePatch();});
    document.addEventListener('keydown',function escPatch(e){if(e.key==='Escape'){closePatch();document.removeEventListener('keydown',escPatch);}});
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
  var updatePromptShown=false;
  function showUpdatePrompt(version){
    if(updatePromptShown||!version)return;
    updatePromptShown=true;
    var existing=root.querySelector('.up-update-prompt');
    if(existing)existing.remove();
    var modal=node('div',{className:'up-update-prompt'});
    modal.innerHTML='<div class="up-update-prompt-box"><div class="up-update-prompt-title">Nova versão disponível</div><div class="up-update-prompt-text">O UpStatus <b>v'+esc(version)+'</b> já está disponível.</div><div class="up-update-prompt-actions"><button type="button" class="up-update-prompt-later">Depois</button><button type="button" class="up-update-prompt-now">Atualizar agora</button></div></div>';
    root.appendChild(modal);
    modal.querySelector('.up-update-prompt-later').onclick=function(){modal.remove();};
    modal.querySelector('.up-update-prompt-now').onclick=function(){modal.remove();openUpdate();};
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
        showUpdatePrompt(remote);
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
  var pendingChatToast=null;
  var typingHeartbeat=null;
  var typingStopTimer=null;
  var chatLastRenderKey="";
  var chatDocumentClickBound=false;
  var chatEmojiDocumentClickBound=false;
  function removeToast(id){
    var item=toastItems.find(function(x){return x.id===id});
    if(!item)return;
    clearTimeout(item.timer);
    if(item.el&&item.el.parentNode)item.el.parentNode.removeChild(item.el);
    toastItems=toastItems.filter(function(x){return x.id!==id});
  }
  function showChatToast(m){
    if(!m||!m.id||m.type==='system'||m.user===member||!shouldNotifyForChat())return;
    if(upCall&&upCall.active){pendingChatToast=m;return;}
    if(!shouldNotifyForChat())return;
    pendingChatToast=null;
    toastItems.slice().forEach(function(x){removeToast(x.id);});
    if(bubble){bubble.classList.remove('up-main-alert');void bubble.offsetWidth;bubble.classList.add('up-main-alert');setTimeout(function(){bubble.classList.remove('up-main-alert')},700);}
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
  var notificationsEnabled=false;
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
    notificationsEnabled=false;
    try{GM_setValue(key+'notifications_enabled',false);}catch(e){}
    updateNotificationPermissionUI();
    message('Notificações do Windows estão desativadas.');
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
    return chat.classList.contains('hidden') || document.visibilityState!=='visible';
  }
  function closePendingChatExternalNotifications(){
    try{
      var list=window.__upstatusActiveExternalNotifications||[];
      for(var i=list.length-1;i>=0;i--){try{list[i].close();}catch(e){}}
    }catch(e){}
  }
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='visible'&&!chat.classList.contains('hidden')){
      closePendingChatExternalNotifications();
      setUnread(0);
    }
  });
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
  function showExternalNotification(){ return; }
  function broadcastFollowerNotification(type,data){
    if(!upIsLeader||!data)return;
    var payload={type:type,id:String(data.id||data.callId||Date.now()),sender:String(data.sender||data.user||'Alguém'),preview:String(data.preview||''),at:Date.now()};
    upWriteBus('follower_notification',payload);
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
        if(m.user!==member&&isTeamChatMessage(m))broadcastFollowerNotification('message',{id:m.id,user:m.user,preview:String(m.message||'Nova mensagem').slice(0,120)});
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
    try{var d=e.detail||{};if(d.type==='chat')openChat();}catch(err){}
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

  function chatDataKey(messages){return (messages||[]).map(function(m){return [m.id,m.user||'',m.createdAt,m.message,m.type,m.systemType||'',m.imageUrl,JSON.stringify(m.replyTo||null),JSON.stringify(m.reactions||{}),JSON.stringify(m.readBy||[])].join('~');}).join('|');}
  function normalizeChatMessage(record){
    if(!record||!record.id)return null;
    var rawUser=record.user_name!=null?record.user_name:record.user;
    return {
      id:String(record.id),user:String(rawUser||''),message:String(record.message||''),type:String(record.type||'text'),
      systemType:String(record.system_type!=null?record.system_type:(record.systemType||'')),createdAt:record.created_at||record.createdAt||new Date().toISOString(),
      imageUrl:String(record.image_url!=null?record.image_url:(record.imageUrl||'')),mentions:Array.isArray(record.mentions)?record.mentions:[],
      replyTo:record.reply_to!=null?record.reply_to:(record.replyTo||null),reactions:record.reactions||{},readBy:Array.isArray(record.readBy)?record.readBy:[]
    };
  }
  function mergeChatMessage(existing,incoming){
    if(!incoming)return existing||null;
    var merged=Object.assign({},existing||{},incoming);
    if(!incoming.user&&existing&&existing.user)merged.user=existing.user;
    if(existing&&existing.readBy&&(!incoming.readBy||!incoming.readBy.length))merged.readBy=existing.readBy;
    if(existing&&existing.optimistic&&!incoming.optimistic)delete merged.optimistic;
    return merged;
  }
  function realtimeMessage(record){return normalizeChatMessage(record);}
  function upsertRealtimeMessage(record){
    var m=realtimeMessage(record);if(!m)return;
    var idx=chatCache.findIndex(function(x){return String(x.id)===m.id;});
    if(idx<0){
      idx=chatCache.findIndex(function(x){
        if(!x.optimistic)return false;
        if(m.user&&x.user!==m.user)return false;
        if(x.message!==m.message||x.type!==m.type)return false;
        if(JSON.stringify(x.replyTo||null)!==JSON.stringify(m.replyTo||null))return false;
        if(String(x.imageUrl||'')!==String(m.imageUrl||''))return false;
        var t1=Date.parse(x.createdAt)||0,t2=Date.parse(m.createdAt)||0;
        return Math.abs(t2-t1)<15000;
      });
    }
    if(idx>=0){
      chatCache[idx]=mergeChatMessage(chatCache[idx],m);
      delete chatCache[idx].optimistic;
    }else{
      chatCache.push(m);
      chatCache.sort(function(a,b){return Date.parse(a.createdAt)-Date.parse(b.createdAt);});
    }
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
    if(!realtimeActive||!realtimeChannel){try{console.warn('[UpStatus Realtime] envio ignorado: canal não está SUBSCRIBED.',event);}catch(e){}return false;}
    try{
      var result=realtimeChannel.send({type:'broadcast',event:event,payload:payload||{}});
      if(result&&typeof result.then==='function')result.then(function(status){if(status==='error'){try{console.error('[UpStatus Realtime] broadcast rejeitado:',event);}catch(e){}}}).catch(function(err){try{console.error('[UpStatus Realtime] broadcast falhou:',event,err);}catch(e){}});
      return true;
    }catch(e){try{console.error('[UpStatus Realtime] broadcast exception:',event,e);}catch(_){}return false;}
  }
  function callEnsureOverlay(){
    if(upCall.overlay&&upCall.overlay.isConnected)return upCall.overlay;
    var o=document.createElement('div');
    o.id='upstatus-call-overlay';
    o.style.cssText='position:absolute;left:auto;right:48px;bottom:-2px;z-index:2147483647;width:270px;min-height:46px;box-sizing:border-box;background:linear-gradient(135deg,rgba(27,36,51,.98),rgba(18,25,37,.98));border:1px solid rgba(105,125,155,.32);border-radius:14px;padding:6px 8px 6px 10px;color:#edf2fb;font:12px Segoe UI,Arial,sans-serif;cursor:default;box-shadow:0 12px 30px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.04);display:none;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);overflow:visible;';
    o.innerHTML='<div style="display:flex;align-items:center;gap:8px;min-height:34px">'+
      '<span style="width:7px;height:7px;border-radius:50%;background:#5fd38b;box-shadow:0 0 8px rgba(95,211,139,.45);flex:0 0 auto;transition:transform .08s ease,box-shadow .08s ease" data-call-dot></span>'+
      '<div style="min-width:0;flex:1;overflow:hidden">'+
        '<div style="font-size:11px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" data-call-title>Chamada</div>'+
        '<div style="font-size:9px;color:#8797ae;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" data-call-status></div>'+
      '</div>'+
      '<div style="display:none;align-items:center;justify-content:center;min-width:54px;color:#f3f7fd;font:800 15px/1 Segoe UI,Arial,sans-serif;letter-spacing:.3px;text-shadow:0 1px 10px rgba(255,255,255,.08)" data-call-time></div>'+
      '<div style="display:flex;align-items:center;gap:6px;flex:0 0 auto" data-call-actions></div>'+
      '<div data-call-audios style="display:none"></div>'+
    '</div>';
    root.appendChild(o);
    upCall.overlay=o;
    return o;
  }
  function callSpeakerRms(analyser,data){
    if(!analyser)return 0;
    try{
      if(!data||data.length!==analyser.fftSize)data=new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(data);
      var sum=0;
      for(var i=0;i<data.length;i++){var v=(data[i]-128)/128;sum+=v*v;}
      return Math.sqrt(sum/data.length);
    }catch(e){return 0;}
  }
  function callSetupLocalSpeakerDetector(){
    if(!upCall.localStream)return;
    var ctx=callEnsureAudioContext();
    if(!ctx)return;
    try{
      if(upCall.localSpeakerSource){try{upCall.localSpeakerSource.disconnect();}catch(e){}}
      if(upCall.localSpeakerAnalyser){try{upCall.localSpeakerAnalyser.disconnect();}catch(e){}}
      upCall.localSpeakerSource=ctx.createMediaStreamSource(upCall.localStream);
      upCall.localSpeakerAnalyser=ctx.createAnalyser();
      upCall.localSpeakerAnalyser.fftSize=256;
      upCall.localSpeakerAnalyser.smoothingTimeConstant=.72;
      upCall.localSpeakerData=new Uint8Array(upCall.localSpeakerAnalyser.fftSize);
      upCall.localSpeakerSource.connect(upCall.localSpeakerAnalyser);
    }catch(e){
      upCall.localSpeakerSource=null;upCall.localSpeakerAnalyser=null;upCall.localSpeakerData=null;
    }
  }
  function callSetupPeerSpeakerDetector(peerName,stream){
    if(!peerName||!stream)return;
    var p=upCall.peers[peerName],ctx=callEnsureAudioContext();
    if(!p||!ctx)return;
    try{
      if(p.speakerAnalyser){try{p.speakerAnalyser.disconnect();}catch(e){}}
      p.speakerAnalyser=ctx.createAnalyser();
      p.speakerAnalyser.fftSize=256;
      p.speakerAnalyser.smoothingTimeConstant=.72;
      p.speakerData=new Uint8Array(p.speakerAnalyser.fftSize);
      if(p.audioSource)p.audioSource.connect(p.speakerAnalyser);
    }catch(e){
      p.speakerAnalyser=null;p.speakerData=null;
    }
  }
  function callApplySpeakerVisual(){
    var o=upCall.overlay;if(!o||!upCall.connected)return;
    var dot=o.querySelector('[data-call-dot]'),title=o.querySelector('[data-call-title]'),status=o.querySelector('[data-call-status]');
    if(!dot||!title||!status)return;
    var name=upCall.speakerName||member||'Chamada';
    title.textContent=name;
    var n=Array.isArray(upCall.participants)?upCall.participants.length:0;
    status.textContent=String(n||2)+' '+((n||2)===1?'participante':'participantes')+(upCall.notice?' • '+upCall.notice:'');
    var level=Math.max(0,Math.min(1,Number(upCall.speakerLevel)||0));
    var scale=1+Math.min(.075,level*.22);
    var glow=Math.round(18+level*24);
    dot.style.transform='scale('+scale.toFixed(3)+')';
    dot.style.boxShadow='0 0 '+glow+'px rgba(84,156,255,'+(0.28+level*.45).toFixed(2)+'),0 0 0 '+Math.max(1,Math.round(2+level*4))+'px rgba(84,156,255,'+(0.12+level*.2).toFixed(2)+')';
    dot.style.border='1px solid rgba(135,190,255,.72)';
    dot.style.background='rgba(24,34,50,.96)';
    var imgEl=dot.querySelector('[data-call-speaker-avatar]');
    if(!imgEl){
      dot.innerHTML='<img data-call-speaker-avatar alt="" style="display:block;width:100%;height:100%;border-radius:50%;object-fit:cover;pointer-events:none;">';
      imgEl=dot.querySelector('[data-call-speaker-avatar]');
    }
    if(imgEl.getAttribute('data-name')!==name){
      imgEl.setAttribute('data-name',name);
      try{hydrateAvatar(imgEl,name);}catch(e){imgEl.src=profileFallback();}
    }
  }
  function callSetActiveSpeaker(name,level){
    if(!name||!upCall.connected)return;
    var changed=upCall.speakerName!==name;
    upCall.speakerName=name;
    upCall.speakerLevel=Math.max(0,Math.min(1,Number(level)||0));
    if(changed)upCall.speakerLastSwitch=Date.now();
    callApplySpeakerVisual();
  }
  function callStartSpeakerDetection(){
    if(upCall.speakerTimer)return;
    if(!upCall.localSpeakerAnalyser)callSetupLocalSpeakerDetector();
    upCall.speakerTimer=setInterval(function(){
      if(!upCall.active||!upCall.connected)return;
      var candidates=[];
      if(!upCall.muted&&upCall.localSpeakerAnalyser){
        candidates.push({name:member,level:callSpeakerRms(upCall.localSpeakerAnalyser,upCall.localSpeakerData)});
      }
      Object.keys(upCall.peers).forEach(function(name){
        var p=upCall.peers[name];
        if(!p||!p.connected||!p.speakerAnalyser)return;
        candidates.push({name:name,level:callSpeakerRms(p.speakerAnalyser,p.speakerData)});
      });
      if(!candidates.length)return;
      candidates.sort(function(a,b){return b.level-a.level;});
      var best=candidates[0],now=Date.now(),threshold=.028;
      var current=candidates.find(function(x){return x.name===upCall.speakerName;});
      var currentLevel=current?current.level:0;
      if(best.level<threshold){
        upCall.speakerLevel=Math.max(0,currentLevel*.82);
        callApplySpeakerVisual();
        return;
      }
      if(best.name===upCall.speakerName){
        upCall.speakerCandidate='';
        upCall.speakerCandidateSince=0;
        upCall.speakerLevel=best.level;
        callApplySpeakerVisual();
        return;
      }
      if(best.name!==upCall.speakerCandidate){
        upCall.speakerCandidate=best.name;
        upCall.speakerCandidateSince=now;
        return;
      }
      var candidateAge=now-(upCall.speakerCandidateSince||now);
      if(candidateAge>=150 && (best.level>Math.max(threshold,currentLevel*1.12) || now-(upCall.speakerLastSwitch||0)>700)){
        upCall.speakerCandidate='';
        upCall.speakerCandidateSince=0;
        callSetActiveSpeaker(best.name,best.level);
      }
    },80);
  }
  function callStopSpeakerDetection(){
    if(upCall.speakerTimer){clearInterval(upCall.speakerTimer);upCall.speakerTimer=null;}
    upCall.speakerName='';upCall.speakerLevel=0;upCall.speakerCandidate='';upCall.speakerCandidateSince=0;upCall.speakerLastSwitch=0;
    if(upCall.localSpeakerSource){try{upCall.localSpeakerSource.disconnect();}catch(e){}}
    if(upCall.localSpeakerAnalyser){try{upCall.localSpeakerAnalyser.disconnect();}catch(e){}}
    upCall.localSpeakerSource=null;upCall.localSpeakerAnalyser=null;upCall.localSpeakerData=null;
  }
  function callEnsureAudioContext(){
    try{
      var C=window.AudioContext||window.webkitAudioContext;
      if(!C)return null;
      if(!upCall.audioCtx||upCall.audioCtx.state==='closed'){
        upCall.audioCtx=new C();
        upCall.audioGain=upCall.audioCtx.createGain();
        upCall.audioGain.gain.value=1;
        upCall.audioGain.connect(upCall.audioCtx.destination);
      }
      if(upCall.audioCtx.state==='suspended'){
        var p=upCall.audioCtx.resume();
        if(p&&p.catch)p.catch(function(){});
      }
      return upCall.audioCtx;
    }catch(e){return null;}
  }
  function callUnlockAudio(){
    var ctx=callEnsureAudioContext();
    if(ctx&&ctx.state==='suspended'){try{ctx.resume();}catch(e){}}
  }
  function callPrimeAudio(){
    var ctx=callEnsureAudioContext();
    if(ctx&&ctx.state==='suspended'){try{ctx.resume();}catch(e){}}
  }
  function callAttachRemoteAudio(peerName,stream){
    if(!stream||!peerName)return;
    var p=upCall.peers[peerName];
    if(!p)return;
    var ctx=callEnsureAudioContext();
    if(ctx){
      try{
        if(p.audioSource){try{p.audioSource.disconnect();}catch(e){}}
        if(p.audioGain){try{p.audioGain.disconnect();}catch(e){}}
        p.audioSource=ctx.createMediaStreamSource(stream);
        p.audioGain=ctx.createGain();
        p.audioGain.gain.value=1;
        p.audioSource.connect(p.audioGain);
        p.audioGain.connect(ctx.destination);
        callSetupPeerSpeakerDetector(peerName,stream);
        callStartSpeakerDetection();
        return;
      }catch(e){}
    }
    var o=callEnsureOverlay(),box=o.querySelector('[data-call-audios]');
    if(!box)return;
    if(p.audio){try{p.audio.pause();}catch(e){}try{p.audio.remove();}catch(e){}p.audio=null;}
    var audio=document.createElement('audio');
    audio.autoplay=true;audio.playsInline=true;audio.volume=1;audio.srcObject=stream;audio.style.display='none';
    box.appendChild(audio);p.audio=audio;
    try{var play=audio.play();if(play&&play.catch)play.catch(function(){});}catch(e){}
  }
  function callStopRingtone(broadcast){
    var callId=upCall.callId;
    upCall.ringtoneAllowed=false;
    if(upCall.ringtoneTimer){clearInterval(upCall.ringtoneTimer);upCall.ringtoneTimer=null;}
    upCall.ringtoneLoadId=(upCall.ringtoneLoadId||0)+1;
    try{upRingtoneGlobal.generation=(upRingtoneGlobal.generation||0)+1;}catch(e){}
    var source=upCall.ringtoneSource,gain=upCall.ringtoneGain;
    upCall.ringtoneSource=null;upCall.ringtoneGain=null;
    try{if(gain)gain.gain.setValueAtTime(0,gain.context.currentTime);}catch(e){}
    if(source){try{source.stop(0);}catch(e){}try{source.disconnect();}catch(e){}}
    if(gain){try{gain.disconnect();}catch(e){}}
    try{
      (upRingtoneGlobal.sources||[]).slice().forEach(function(src){try{src.stop(0);}catch(e){}try{src.disconnect();}catch(e){}});
      (upRingtoneGlobal.gains||[]).slice().forEach(function(g){try{g.gain.setValueAtTime(0,g.context.currentTime);}catch(e){}try{g.disconnect();}catch(e){}});
      upRingtoneGlobal.sources=[];upRingtoneGlobal.gains=[];
    }catch(e){}
    upCall.ringtoneCtx=null;
    if(broadcast!==false&&callId)callBroadcastRingtoneStop(callId,'local-stop');
  }
  function callConfigureRingtones(){
    var roles=[{key:'caller',label:'CHAMANDO: selecione chamando.mp3'},{key:'callee',label:'RECEBENDO: selecione recebendo.mp3'}];
    function pick(index){
      if(index>=roles.length){try{message('Toques de chamada configurados.');}catch(e){}return;}
      var item=roles[index],input=document.createElement('input');
      input.type='file';input.accept='audio/mpeg,audio/*';input.style.display='none';
      input.onchange=function(){
        var file=input.files&&input.files[0];
        if(!file){document.body.removeChild(input);pick(index);return;}
        var fr=new FileReader();
        fr.onload=function(){
          try{localStorage.setItem('upstatus_call_ringtone_'+item.key,String(fr.result||''));}catch(e){}
          try{document.body.removeChild(input);}catch(e){}
          pick(index+1);
        };
        fr.readAsDataURL(file);
      };
      document.body.appendChild(input);
      try{input.click();}catch(e){}
    }
    pick(0);
  }
  document.addEventListener('keydown',function(e){
    if(e.ctrlKey&&e.shiftKey&&(e.key==='R'||e.key==='r')){
      e.preventDefault();callConfigureRingtones();
    }
  });
  var CALL_RINGTONE_CACHE_VERSION='3.0.22';
  var CALL_RINGTONE_LEGACY_B64_LENGTHS={caller:351271,callee:419262};
  function callRefreshLegacyDefaultRingtoneCache(){
    try{
      var current=localStorage.getItem('upstatus_call_ringtone_cache_version')||'';
      if(current!==CALL_RINGTONE_CACHE_VERSION){
        ['caller','callee'].forEach(function(roleKey){try{localStorage.removeItem('upstatus_call_ringtone_'+roleKey);}catch(e){}});
        localStorage.setItem('upstatus_call_ringtone_cache_version',CALL_RINGTONE_CACHE_VERSION);
      }
    }catch(e){}
  }
  callRefreshLegacyDefaultRingtoneCache();
  var CALL_RINGTONE_URLS={caller:'https://raw.githubusercontent.com/Reekyi/UpStatus/master/assets/ringtones/chamando.mp3?v=3.0.22',callee:'https://raw.githubusercontent.com/Reekyi/UpStatus/master/assets/ringtones/recebendo.mp3?v=3.0.22'};
  var callRingtoneFetches={caller:null,callee:null};
  function callGetRingtoneData(roleKey){
    var storageKey='upstatus_call_ringtone_'+roleKey;
    try{var existing=localStorage.getItem(storageKey)||'';if(existing)return Promise.resolve(existing);}catch(e){}
    if(callRingtoneFetches[roleKey])return callRingtoneFetches[roleKey];
    var url=CALL_RINGTONE_URLS[roleKey];
    if(!url||typeof GM_xmlhttpRequest!=='function')return Promise.resolve('');
    callRingtoneFetches[roleKey]=new Promise(function(resolve,reject){
      GM_xmlhttpRequest({method:'GET',url:url,responseType:'blob',timeout:15000,
        onload:function(r){
          if(r.status<200||r.status>=300)return reject(new Error('Ringtone HTTP '+r.status));
          var fr=new FileReader();
          fr.onload=function(){
            var data=String(fr.result||'');
            if(data){try{localStorage.setItem(storageKey,data);}catch(e){}}
            resolve(data);
          };
          fr.onerror=reject;fr.readAsDataURL(r.response);
        },
        onerror:reject,onabort:reject,ontimeout:reject
      });
    }).catch(function(){callRingtoneFetches[roleKey]=null;return '';});
    return callRingtoneFetches[roleKey];
  }
  function callStartRingtone(){
    callStopRingtone(false);
    upCall.ringtoneAllowed=true;
    try{
      var ctx=callEnsureAudioContext();if(!ctx)return;
      var roleKey=upCall.role==='caller'?'caller':'callee',data=null;
      try{data=localStorage.getItem('upstatus_call_ringtone_'+roleKey)||'';}catch(e){}
      upCall.ringtoneCtx=ctx;
      var loadId=(upCall.ringtoneLoadId||0)+1;upCall.ringtoneLoadId=loadId;
      var globalGeneration=(upRingtoneGlobal.generation||0)+1;upRingtoneGlobal.generation=globalGeneration;
      var dataPromise=data?Promise.resolve(data):callGetRingtoneData(roleKey);
      dataPromise.then(function(value){
        if(upCall.ringtoneLoadId!==loadId||globalGeneration!==upRingtoneGlobal.generation||!upCall.active||upCall.connected||!upCall.ringtoneAllowed)return null;
        if(!value)return null;
        return fetch(value).then(function(r){return r.arrayBuffer();});
      }).then(function(buf){
        if(!buf)return null;return ctx.decodeAudioData(buf);
      }).then(function(decoded){
        if(!upCall.active||upCall.connected||upCall.ringtoneLoadId!==loadId||globalGeneration!==upRingtoneGlobal.generation||!upCall.ringtoneAllowed)return;
        var source=ctx.createBufferSource(),gain=ctx.createGain();
        source.buffer=decoded;source.loop=true;gain.gain.value=1;source.connect(gain);gain.connect(ctx.destination);
        upCall.ringtoneSource=source;upCall.ringtoneGain=gain;
        try{upRingtoneGlobal.sources.push(source);upRingtoneGlobal.gains.push(gain);}catch(e){}
        source.start(0);
      }).catch(function(){});
    }catch(e){}
  }
  function callPositionOverlay(){
    var o=callEnsureOverlay();o.style.left='auto';o.style.right='48px';o.style.bottom='-2px';
  }
  function callStartCounter(){
    if(upCall.counterTimer)clearInterval(upCall.counterTimer);
    upCall.startedAt=Date.now();
    function tick(){
      if(!upCall.startedAt)return;
      var s=Math.max(0,Math.floor((Date.now()-upCall.startedAt)/1000));
      var el=upCall.overlay&&upCall.overlay.querySelector('[data-call-time]');
      if(el)el.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
    }
    upCall.counterTimer=setInterval(tick,1000);tick();
  }
  function callIcon(type){
    var paths={
      phone:'<path d="M7.7 3.8l2.1 2.1c.45.45.45 1.18.02 1.64l-1.2 1.3c1.02 2.02 2.63 3.63 4.65 4.65l1.3-1.2c.46-.43 1.19-.43 1.64.02l2.1 2.1c.46.46.46 1.2-.01 1.66l-.92.92c-.64.64-1.56.91-2.45.71-5.98-1.35-10.8-6.17-12.15-12.15-.2-.89.07-1.81.71-2.45l.92-.92c.46-.47 1.2-.47 1.66-.01z"/>',
      hangup:'<path d="M3.6 11.2c2.22-2.02 4.9-3.04 8.4-3.04s6.18 1.02 8.4 3.04"/><path d="M7.1 10.15l-1.25 3.1"/><path d="M16.9 10.15l1.25 3.1"/><path d="M8.25 10.1l.45 3.35"/><path d="M15.75 10.1l-.45 3.35"/>',
      mic:'<rect x="8" y="3.5" width="8" height="10.5" rx="4"/><path d="M5.5 10.5a6.5 6.5 0 0 0 13 0"/><path d="M12 17v3.5M8.5 20.5h7"/>',
      micOff:'<path d="M8 4v7.5a4 4 0 0 0 6.35 3.23M16 10.5V4a4 4 0 0 0-7.22-2.4"/><path d="M5.5 10.5a6.5 6.5 0 0 0 11.07 4.6M12 17v3.5M8.5 20.5h7M4 4l16 16"/>',
      personAdd:'<path d="M9.2 11.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"/><path d="M3.8 19c.55-3.15 2.4-4.8 5.4-4.8s4.85 1.65 5.4 4.8"/><path d="M18 11v6M15 14h6"/>',
      close:'<path d="M6 6l12 12M18 6L6 18"/>'
    };
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[type]||paths.close)+'</svg>';
  }
  function callNames(separator){
    var list=Array.isArray(upCall.participants)?upCall.participants.filter(function(n){return n;}).slice():[];
    if(!list.length&&upCall.peer)list=[member,upCall.peer].filter(function(n){return n;});
    return list.join(separator||' + ');
  }
  function callConnectedLabel(){
    var n=Array.isArray(upCall.participants)?upCall.participants.length:0;
    var label=String(n||2)+' '+((n||2)===1?'participante':'participantes');
    if(upCall.notice)label+=' \u2022 '+upCall.notice;
    return label;
  }
  function callCloseParticipantPicker(){
    var o=upCall.overlay;if(!o)return;
    var box=o.querySelector('[data-call-picker]');if(box)box.remove();
  }
  function callAvailableParticipants(){
    var names=[],team=window.__upstatusTeam||{};
    Object.keys(team).forEach(function(n){if(n)names.push(n);});
    if(!names.length&&Array.isArray(window.__upstatusMembers))names=window.__upstatusMembers.slice();
    names=names.filter(function(n){return n&&n!==member&&upCall.participants.indexOf(n)<0&&!upCall.pendingInvites[n];});
    names.sort(function(a,b){return String(a).localeCompare(String(b),'pt-BR');});
    return names;
  }
  function callOpenParticipantPicker(){
    var o=callEnsureOverlay(),current=o.querySelector('[data-call-picker]');
    if(current){current.remove();return;}
    var box=document.createElement('div');
    box.setAttribute('data-call-picker','');
    box.style.cssText='position:absolute;right:8px;bottom:50px;width:228px;max-width:calc(100vw - 30px);box-sizing:border-box;padding:9px;border:1px solid #40506a;border-radius:12px;background:linear-gradient(145deg,#192435,#111925);box-shadow:0 16px 36px rgba(0,0,0,.44);';
    var title=document.createElement('div');
    title.textContent='Adicionar participante';
    title.style.cssText='font-size:11px;font-weight:800;color:#dbe5f5;margin-bottom:7px;';
    box.appendChild(title);
    var names=callAvailableParticipants();
    if(!names.length){
      var empty=document.createElement('div');
      empty.textContent='Todos os membros j\u00e1 est\u00e3o na chamada.';
      empty.style.cssText='font-size:10px;color:#8fa0b8;padding:6px 2px;';
      box.appendChild(empty);
    }else{
      names.forEach(function(name){
        var btn=document.createElement('button');
        btn.type='button';btn.textContent=name;
        btn.style.cssText='display:flex;width:100%;align-items:center;justify-content:space-between;gap:8px;padding:7px 8px;margin:3px 0;border:1px solid #33445c;border-radius:8px;background:#202d40;color:#dbe5f5;cursor:pointer;font:700 11px Segoe UI,Arial,sans-serif;text-align:left;';
        btn.onmouseenter=function(){btn.style.background='#2b3b55';};
        btn.onmouseleave=function(){btn.style.background='#202d40';};
        btn.onclick=function(e){e.preventDefault();e.stopPropagation();callInviteParticipant(name);};
        box.appendChild(btn);
      });
    }
    o.appendChild(box);
  }
  function callInviteParticipant(target){
    if(!upCall.active||!upCall.connected||!target||target===member||upCall.participants.indexOf(target)>=0||upCall.pendingInvites[target])return;
    upCall.pendingInvites[target]=Date.now();
    var sent=callSendTo(target,'invite',{participants:upCall.participants.slice(),initiator:upCall.initiator||member});
    callCloseParticipantPicker();
    if(!sent){delete upCall.pendingInvites[target];upCall.notice='N\u00e3o foi poss\u00edvel enviar o convite.';}
    else upCall.notice='Convidando '+target+'...';
    callRenderConnected();
    if(upCall.notice)setTimeout(function(){if(upCall.active){upCall.notice='';callRenderConnected();}},3500);
  }
  function callRender(title,status,buttons){
    if(toastStack)toastStack.style.display='none';
    var o=callEnsureOverlay();callCloseParticipantPicker();callPositionOverlay();
    var titleEl=o.querySelector('[data-call-title]'),statusEl=o.querySelector('[data-call-status]');
    var dot=o.querySelector('[data-call-dot]'),time=o.querySelector('[data-call-time]'),a=o.querySelector('[data-call-actions]');
    a.innerHTML='';
    o.style.width=upCall.connected?'270px':'310px';
    o.style.minHeight=upCall.connected?'48px':'46px';
    o.style.padding=upCall.connected?'5px 7px':'6px 8px 6px 10px';
    titleEl.textContent=upCall.connected?(upCall.speakerName||title||'Chamada'):(title||callNames(' + ')||'Chamada');
    statusEl.textContent=upCall.connected?callConnectedLabel():(status||'');
    time.style.cssText='display:'+(upCall.connected?'flex':'none')+';align-items:center;justify-content:center;min-width:54px;color:#f3f7fd;font:800 15px/1 Segoe UI,Arial,sans-serif;letter-spacing:.3px;text-shadow:0 1px 10px rgba(255,255,255,.08);';
    if(dot){
      if(upCall.connected){
        dot.style.width='30px';dot.style.height='30px';dot.style.borderRadius='50%';dot.style.flex='0 0 auto';
        dot.style.background='rgba(24,34,50,.96)';dot.style.border='1px solid rgba(135,190,255,.72)';
      }else{
        dot.innerHTML='';
        dot.style.width='7px';dot.style.height='7px';dot.style.border='0';dot.style.background=status==='Chamada recebida'?'#70a7ff':'#e7b75a';
        dot.style.boxShadow='0 0 8px rgba(95,211,139,.45)';dot.style.transform='scale(1)';
      }
    }
    var added=false;
    (buttons||[]).forEach(function(b){
      if(upCall.connected&&!upTestMode&&b.danger&&!added){
        var add=document.createElement('button');
        add.type='button';add.setAttribute('aria-label','Adicionar participante');add.title='Adicionar participante';add.innerHTML=callIcon('personAdd');
        add.onclick=function(e){e.preventDefault();e.stopPropagation();callOpenParticipantPicker();};
        add.style.cssText='width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(118,142,174,.28);border-radius:10px;padding:0;background:rgba(45,60,82,.9);color:#fff;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.22);transition:transform .12s ease,filter .12s ease,background .12s ease;';
        add.onmouseenter=function(){add.style.filter='brightness(1.12)';add.style.transform='translateY(-1px)';};
        add.onmouseleave=function(){add.style.filter='';add.style.transform='';};
        a.appendChild(add);added=true;
      }
      var x=document.createElement('button');
      x.type='button';x.setAttribute('aria-label',b.label||'A\u00e7\u00e3o');x.title=b.label||'A\u00e7\u00e3o';x.innerHTML=callIcon(b.icon||(b.danger?'hangup':'close'));x.onclick=b.onClick;
      x.style.cssText='width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:1px solid '+(b.danger?'rgba(255,103,124,.34)':'rgba(118,142,174,.28)')+';border-radius:10px;padding:0;background:'+(b.danger?'linear-gradient(145deg,#b33b52,#8f2e42)':'rgba(45,60,82,.9)')+';color:#fff;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.22);transition:transform .12s ease,filter .12s ease,background .12s ease;';
      if(b.icon==='phone')x.style.background='linear-gradient(145deg,#2fae6a,#238754)';
      if(b.muted)x.style.background='linear-gradient(145deg,#55677f,#3d4c61)';
      x.onmouseenter=function(){x.style.filter='brightness(1.12)';x.style.transform='translateY(-1px)';};
      x.onmouseleave=function(){x.style.filter='';x.style.transform='';};
      a.appendChild(x);
    });
    if(upCall.connected&&!upCall.startedAt)callStartCounter();
    o.style.display='block';
    if(upCall.connected)callApplySpeakerVisual();
  }
  function callHideOverlay(){
    if(upCall.overlay)upCall.overlay.style.display='none';
    if(upCall.overlay)callCloseParticipantPicker();
    if(toastStack)toastStack.style.display='';
    if(pendingChatToast){
      var pending=pendingChatToast;pendingChatToast=null;
      setTimeout(function(){if(!upCall.active)showChatToast(pending);},0);
    }
  }
  function callNewId(){return String(member||'user')+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);}
  function callConnectionId(remote){
    return String(upCall.callId)+'::'+[String(member||''),String(remote||'')].sort().join('::');
  }
  function callSendTo(to,type,extra){
    if(!to||!upCall.callId)return false;
    var p=Object.assign({type:type,callId:upCall.callId,from:member,to:to,connectionId:callConnectionId(to),participants:upCall.participants.slice()},extra||{});
    return sendRealtimeEvent('call_signal',p);
  }
  function callSend(type,extra){return callSendTo(upCall.peer,type,extra);}
  function callSendAll(type,extra){
    var sent=false;
    upCall.participants.forEach(function(name){if(name&&name!==member)sent=callSendTo(name,type,extra)||sent;});
    return sent;
  }
  function callStopStream(){
    if(upCall.localStream){try{upCall.localStream.getTracks().forEach(function(t){t.stop();});}catch(e){}upCall.localStream=null;}
  }
  function callRemovePeer(name,forgetParticipant){
    var p=upCall.peers[name];if(!p)return;
    if(p.disconnectTimer){clearTimeout(p.disconnectTimer);p.disconnectTimer=null;}
    if(p.pc){try{p.pc.onicecandidate=null;p.pc.ontrack=null;p.pc.onconnectionstatechange=null;p.pc.close();}catch(e){}p.pc=null;}
    if(p.audioSource){try{p.audioSource.disconnect();}catch(e){}p.audioSource=null;}
    if(p.audioGain){try{p.audioGain.disconnect();}catch(e){}p.audioGain=null;}
    if(p.speakerAnalyser){try{p.speakerAnalyser.disconnect();}catch(e){}p.speakerAnalyser=null;}
    p.speakerData=null;
    if(p.audio){try{p.audio.pause();}catch(e){}try{p.audio.srcObject=null;}catch(e){}try{p.audio.remove();}catch(e){}p.audio=null;}
    if(upCall.speakerName===name){upCall.speakerName=member||'';upCall.speakerLevel=0;}
    delete upCall.peers[name];
    if(forgetParticipant){
      upCall.participants=upCall.participants.filter(function(n){return n!==name;});
      if(upCall.pendingInvites)delete upCall.pendingInvites[name];
    }
    upCall.connected=Object.keys(upCall.peers).some(function(n){return !!(upCall.peers[n]&&upCall.peers[n].connected);});
    if(!upCall.connected&&upCall.startedAt){upCall.startedAt=0;if(upCall.counterTimer){clearInterval(upCall.counterTimer);upCall.counterTimer=null;}}
  }
  function callCleanup(sendSignal,signalType){
    var callId=upCall.callId;
    if(sendSignal&&callId){
      try{
        if(signalType==='hangup'&&upCall.peer)callSend('hangup');
        else if(signalType)callSendAll(signalType);
        else if(upCall.connected||upCall.participants.length>2)callSendAll('leave');
        else if(upCall.peer)callSend('hangup');
      }catch(e){}
    }
    if(upCall.timer){clearTimeout(upCall.timer);upCall.timer=null;}
    if(upCall.counterTimer){clearInterval(upCall.counterTimer);upCall.counterTimer=null;}
    callStopRingtone();
    callStopSpeakerDetection();
    Object.keys(upCall.peers).slice().forEach(function(name){callRemovePeer(name,false);});
    callStopStream();
    upCall.callId='';upCall.peer='';upCall.role='';upCall.initiator='';upCall.participants=[];upCall.pendingInvites={};upCall.pendingOffers={};upCall.pendingInvite=null;upCall.peers={};upCall.localStream=null;upCall.remoteStream=null;upCall.audio=null;upCall.active=false;upCall.connected=false;upCall.muted=false;upCall.startedAt=0;upCall.waitingForConnection=false;upCall.notice='';upCall.speakerName='';upCall.speakerLevel=0;
    callHideOverlay();
  }
  function callFail(msg){
    if(upCall.timer){clearTimeout(upCall.timer);upCall.timer=null;}
    if(upCall.counterTimer){clearInterval(upCall.counterTimer);upCall.counterTimer=null;}
    callStopRingtone();
    callRender('Chamada',msg,[{label:'Fechar',onClick:function(){callCleanup(false);}}]);
  }
  async function callGetMicrophone(){
    if(upCall.localStream)return upCall.localStream;
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error('O navegador n\u00e3o liberou acesso ao microfone.');
    upCall.localStream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    callSetupLocalSpeakerDetector();
    return upCall.localStream;
  }
  function callGetPeer(name){
    if(!name||name===member)return null;
    var p=upCall.peers[name];
    if(!p){p={name:name,pc:null,remoteStream:null,audio:null,audioSource:null,audioGain:null,speakerAnalyser:null,speakerData:null,pendingCandidates:[],connected:false,offerSent:false,disconnectTimer:null};upCall.peers[name]=p;}
    return p;
  }
  async function callCreatePeer(name){
    var p=callGetPeer(name);if(!p)return null;
    if(p.pc&&p.pc.signalingState!=='closed')return p;
    if(typeof RTCPeerConnection==='undefined')throw new Error('WebRTC n\u00e3o est\u00e1 dispon\u00edvel neste navegador.');
    await callGetMicrophone();
    var pc=new RTCPeerConnection();p.pc=pc;p.connected=false;p.offerSent=false;
    if(upCall.localStream)upCall.localStream.getTracks().forEach(function(t){pc.addTrack(t,upCall.localStream);});
    pc.onicecandidate=function(e){if(e.candidate&&upCall.active)callSendTo(name,'ice',{candidate:e.candidate,connectionId:callConnectionId(name)});};
    pc.ontrack=function(e){p.remoteStream=e.streams&&e.streams[0]?e.streams[0]:null;if(p.remoteStream)callAttachRemoteAudio(name,p.remoteStream);callPrimeAudio();};
    pc.onconnectionstatechange=function(){
      var st=pc.connectionState;
      if(st==='connected'){
        p.connected=true;upCall.connected=true;upCall.waitingForConnection=false;callStopRingtone();callPrimeAudio();
        if(!upCall.startedAt)callStartCounter();callRenderConnected();
      }else if(st==='failed'||st==='disconnected'){
        if(p.disconnectTimer)clearTimeout(p.disconnectTimer);
        p.disconnectTimer=setTimeout(function(){
          if(!upCall.active||p.pc!==pc)return;
          if(pc.connectionState==='failed'||pc.connectionState==='disconnected'||pc.connectionState==='closed'){
            callRemovePeer(name,true);
            if(upCall.participants.length<=1)callCleanup(false);
            else if(upCall.active)callRenderConnected();
          }
        },1200);
      }else if(st==='closed'){
        callRemovePeer(name,true);
        if(upCall.participants.length<=1&&upCall.active)callCleanup(false);
      }
    };
    return p;
  }
  async function callStartOffer(name){
    if(!upCall.active||!name||name===member)return;
    var p=await callCreatePeer(name);if(!p||!p.pc||p.offerSent)return;
    var offer=await p.pc.createOffer();await p.pc.setLocalDescription(offer);p.offerSent=true;
    callSendTo(name,'offer',{sdp:p.pc.localDescription,phase:'mesh'});
  }
  async function callAddQueuedCandidates(p){
    if(!p||!p.pc||!p.pc.remoteDescription)return;
    var q=p.pendingCandidates.splice(0);
    for(var i=0;i<q.length;i++){try{await p.pc.addIceCandidate(q[i]);}catch(e){}}
  }
  function callMergeParticipants(list){
    var next=Array.isArray(list)?list.slice():[];if(member)next.push(member);
    next=next.filter(function(n){return n;});
    var out=[];next.forEach(function(n){if(out.indexOf(n)<0)out.push(n);});
    if(member&&out.indexOf(member)<0)out.push(member);upCall.participants=out;
  }
  function callRenderConnected(){
    if(!upCall.active)return;
    if(!upCall.speakerName)upCall.speakerName=member||((upCall.participants||[])[0]||'Chamada');
    callRender('Chamada em grupo',callConnectedLabel(),[
      {label:upCall.muted?'Ativar mic':'Mutar',icon:upCall.muted?'micOff':'mic',muted:upCall.muted,onClick:toggleCallMute},
      {label:'Desligar',icon:'hangup',danger:true,onClick:function(){callCleanup(true);}}
    ]);
    callStartSpeakerDetection();
    callApplySpeakerVisual();
  }
  async function startOutgoingCall(target){
    if(!target||target===member)return;
    if(upCall.active){message('Voc\u00ea j\u00e1 est\u00e1 em uma chamada.',true);return;}
    upCall.callId=callNewId();upCall.peer=target;upCall.role='caller';upCall.initiator=member;upCall.participants=[member,target];
    upCall.pendingInvites={};upCall.pendingOffers={};upCall.active=true;upCall.connected=false;upCall.startedAt=0;upCall.waitingForConnection=true;
    callPrimeAudio();callStartRingtone();callRender(target,'Chamando\u2026',[{label:'Cancelar',danger:true,onClick:function(){callCleanup(true,'hangup');}}]);
    upCall.timer=setTimeout(function(){if(upCall.active&&!upCall.connected){callFail('Sem resposta.');try{callSend('hangup');}catch(e){}}},30000);
    try{
      await callGetMicrophone();var p=await callCreatePeer(target);var offer=await p.pc.createOffer();await p.pc.setLocalDescription(offer);p.offerSent=true;
      callSendTo(target,'offer',{sdp:p.pc.localDescription,phase:'initial'});
    }catch(e){callFail(e.message||'N\u00e3o foi poss\u00edvel iniciar a chamada.');}
  }
  async function callAcceptIncomingOffer(remoteName){
    var p=callGetPeer(remoteName),sdp=upCall.pendingOffers[remoteName];if(!p||!sdp)return;
    try{
      upCall.waitingForConnection=true;await callGetMicrophone();await callCreatePeer(remoteName);
      await p.pc.setRemoteDescription(new RTCSessionDescription(sdp));await callAddQueuedCandidates(p);
      var answer=await p.pc.createAnswer();await p.pc.setLocalDescription(answer);delete upCall.pendingOffers[remoteName];
      callSendTo(remoteName,'answer',{sdp:p.pc.localDescription,phase:'initial'});
      callRender(remoteName,'Conectando\u2026',[{label:upCall.muted?'Ativar mic':'Mutar',icon:upCall.muted?'micOff':'mic',muted:upCall.muted,onClick:toggleCallMute},{label:'Desligar',icon:'hangup',danger:true,onClick:function(){callCleanup(true);}}]);
    }catch(e){
      try{callSendTo(remoteName,'reject',{reason:'\u00c1udio n\u00e3o autorizado'});}catch(_){}
      callFail(e.message||'N\u00e3o foi poss\u00edvel atender a chamada.');
    }
  }
  async function callAcceptGroupInvite(){
    var invite=upCall.pendingInvite;if(!invite||!upCall.active)return;
    upCall.pendingInvite=null;upCall.role='member';callMergeParticipants(invite.participants||[invite.from]);
    try{
      await callGetMicrophone();upCall.waitingForConnection=true;
      upCall.participants.filter(function(n){return n!==member;}).forEach(function(n){callSendTo(n,'join',{phase:'mesh'});});
      callRender(callNames(' + '),'Conectando\u2026',[{label:upCall.muted?'Ativar mic':'Mutar',icon:upCall.muted?'micOff':'mic',muted:upCall.muted,onClick:toggleCallMute},{label:'Desligar',icon:'hangup',danger:true,onClick:function(){callCleanup(true);}}]);
    }catch(e){
      try{callSendTo(invite.from,'reject',{reason:'\u00c1udio n\u00e3o autorizado'});}catch(_){}
      callCleanup(false);message(e.message||'N\u00e3o foi poss\u00edvel entrar na chamada.',true);
    }
  }
  async function callAcceptIncomingCall(){
    if(upCall.pendingInvite)return callAcceptGroupInvite();
    var names=Object.keys(upCall.pendingOffers||{});if(names.length)return callAcceptIncomingOffer(names[0]);
  }
  async function receiveCallSignal(p){
    if(!p||!p.type||!p.callId||!p.from||p.from===member)return;
    if(p.to&&p.to!==member)return;
    if(p.type==='offer'){
      if(!upCall.active){
        upCall.callId=p.callId;upCall.peer=p.from;upCall.role='callee';upCall.initiator=p.from;
        upCall.participants=(Array.isArray(p.participants)&&p.participants.length?p.participants:[member,p.from]).slice();
        if(upCall.participants.indexOf(member)<0)upCall.participants.push(member);
        upCall.pendingOffers={};upCall.pendingOffers[p.from]=p.sdp;upCall.pendingInvite=null;upCall.peers={};
        upCall.active=true;upCall.connected=false;upCall.startedAt=0;upCall.waitingForConnection=false;
        broadcastFollowerNotification('call',{callId:p.callId,sender:p.from,preview:'Chamada recebida'});
        callStartRingtone();
        callRender(p.from,'Chamada recebida',[{label:'Atender',icon:'phone',onClick:function(){callAcceptIncomingCall();}},{label:'Recusar',icon:'hangup',danger:true,onClick:function(){callSendTo(p.from,'reject',{reason:'Recusado'});callCleanup(false);}}]);
        return;
      }
      if(p.callId!==upCall.callId){
        sendRealtimeEvent('call_signal',{type:'busy',callId:p.callId,from:member,to:p.from,connectionId:String(p.callId)+'::busy'});return;
      }
      callMergeParticipants(p.participants||[]);
      if(!upCall.peers[p.from]||!upCall.peers[p.from].pc){
        upCall.pendingOffers[p.from]=p.sdp;
        if(p.phase==='mesh'){try{await callAcceptIncomingOffer(p.from);}catch(e){}}
      }
      return;
    }
    if(p.type==='invite'){
      if(upCall.active){
        if(p.callId===upCall.callId)return;
        sendRealtimeEvent('call_signal',{type:'busy',callId:p.callId,from:member,to:p.from,connectionId:String(p.callId)+'::busy'});return;
      }
      upCall.callId=p.callId;upCall.peer=p.from;upCall.role='callee';upCall.initiator=p.initiator||p.from;
      callMergeParticipants(p.participants||[p.from]);
      upCall.pendingInvite={callId:p.callId,from:p.from,participants:upCall.participants.slice()};
      upCall.pendingOffers={};upCall.peers={};upCall.active=true;upCall.connected=false;upCall.startedAt=0;
      broadcastFollowerNotification('call',{callId:p.callId,sender:p.from,preview:'Convite para chamada em grupo'});
      callStartRingtone();
      var inviteNames=Array.isArray(p.participants)?p.participants.filter(function(n){return n&&n!==member;}).join(', '):p.from;
      callRender('Convite para chamada em grupo','Participantes: '+inviteNames,[
        {label:'Atender',icon:'phone',onClick:function(){callAcceptIncomingCall();}},
        {label:'Recusar',icon:'hangup',danger:true,onClick:function(){callSendTo(p.from,'reject',{reason:'Recusado'});callCleanup(false);}}
      ]);
      return;
    }
    if(!upCall.active||p.callId!==upCall.callId)return;
    if(p.from===member)return;
    if(p.type==='join'){
      callMergeParticipants(p.participants||[]);
      if(upCall.participants.indexOf(p.from)<0)upCall.participants.push(p.from);
      try{await callStartOffer(p.from);callRenderConnected();}
      catch(e){upCall.notice='Falha ao conectar '+p.from+'.';callRenderConnected();}
      return;
    }
    if(p.type==='answer'){
      var answerPeer=callGetPeer(p.from);
      if(answerPeer&&answerPeer.pc&&p.sdp){
        try{await answerPeer.pc.setRemoteDescription(new RTCSessionDescription(p.sdp));await callAddQueuedCandidates(answerPeer);}
        catch(e){callRemovePeer(p.from,false);upCall.notice='Resposta de '+p.from+' inv\u00e1lida.';callRenderConnected();}
      }
      return;
    }
    if(p.type==='ice'&&p.candidate){
      var icePeer=callGetPeer(p.from);if(!icePeer)return;
      if(icePeer.pc&&icePeer.pc.remoteDescription){try{await icePeer.pc.addIceCandidate(p.candidate);}catch(e){}}
      else icePeer.pendingCandidates.push(p.candidate);
      return;
    }
    if(p.type==='ringtone_stop'){callStopRingtone(false);return;}
    if(p.type==='reject'||p.type==='busy'){
      if(upCall.pendingInvites[p.from]){
        delete upCall.pendingInvites[p.from];upCall.notice=p.from+(p.type==='busy'?' est\u00e1 em outra chamada.':' recusou o convite.');callRenderConnected();return;
      }
      if(upCall.peer===p.from&&!upCall.connected){callFail(p.type==='busy'?'O usu\u00e1rio est\u00e1 em outra chamada.':'Chamada recusada.');return;}
      return;
    }
    if(p.type==='hangup'){
      if(upCall.peer===p.from&&!upCall.connected&&upCall.participants.length<=2){callCleanup(false);return;}
      callRemovePeer(p.from,true);
      if(upCall.active){if(upCall.participants.length<=1)callCleanup(false);else callRenderConnected();}
      return;
    }
    if(p.type==='leave'){
      callRemovePeer(p.from,true);
      if(upCall.active){if(upCall.participants.length<=1)callCleanup(false);else callRenderConnected();}
      return;
    }
  }
  function toggleCallMute(){
    if(!upCall.localStream)return;
    upCall.muted=!upCall.muted;upCall.localStream.getAudioTracks().forEach(function(t){t.enabled=!upCall.muted;});callRenderConnected();
  }

  function handleRealtimeChatRead(payload){
    var p=payload||{},reader=String(p.reader||''),ids=Array.isArray(p.messageIds)?p.messageIds.map(String):[];
    if(!reader||reader===member||!ids.length)return;
    var changed=false;
    ids.forEach(function(id){var m=chatCache.find(function(x){return String(x.id)===id;});if(!m||m.user!==member)return;m.readBy=Array.isArray(m.readBy)?m.readBy.slice():[];if(m.readBy.indexOf(reader)<0){m.readBy.push(reader);changed=true;}});
    if(changed&&!chat.classList.contains('hidden'))renderChat();
  }

  function handleRealtimeChatFast(payload){
    var m=payload&&payload.message;
    if(!m||!m.id)return;
    upsertRealtimeMessage(m);
  }
  function startRealtime(){
    if(!token||realtimeClient||typeof supabase==='undefined'||!supabase.createClient)return;
    try{
      realtimeClient=supabase.createClient(UP_REALTIME_URL,UP_REALTIME_KEY,{auth:{persistSession:false}});
      realtimeChannel=realtimeClient.channel(UP_REALTIME_TOPIC,{config:{broadcast:{ack:true}}});
      realtimeChannel
        .on('broadcast',{event:'db_change'},function(payload){
          var p=payload&&payload.payload||{};
          var record=p.record;
          if(!record)return;
          if(p.op==='DELETE')handleRealtimeDelete(record);
          else upsertRealtimeMessage(record);
        })
        .on('broadcast',{event:'chat_fast'},function(payload){handleRealtimeChatFast(payload&&payload.payload||{});})
        .on('broadcast',{event:'chat_read'},function(payload){handleRealtimeChatRead(payload&&payload.payload||{});})
        .on('broadcast',{event:'user_status'},function(){refresh();})
        .on('broadcast',{event:'chat_presence'},function(payload){var p=payload&&payload.payload||{};if(!p.name)return;chatPresence[p.name]=p.open?Date.now()+25000:0;updateChatHeaderPresence();})
        .on('broadcast',{event:'health_ping'},function(payload){handleHealthPing(payload&&payload.payload||{});})
        .on('broadcast',{event:'health_pong'},function(payload){handleHealthPong(payload&&payload.payload||{});})
        .on('broadcast',{event:'remote_command'},function(payload){
          var c=payload&&payload.payload&&payload.payload.command;
          if(c&&c.target===member)executeRemoteCommand(c);
        })
        .on('broadcast',{event:'call_signal'},function(payload){receiveCallSignal(payload&&payload.payload||{});})
        .on('broadcast',{event:'remote_result'},function(payload){
          var r=payload&&payload.payload&&payload.payload.result;
          if(r&&r.commandId&&r.sender===member){
            remoteResultCache[String(r.commandId)]=r;
            var waiter=remoteResultWaiters[String(r.commandId)];
            if(waiter)waiter(r);
          }
        })
        .subscribe(function(status,err){
          if(status==='SUBSCRIBED'){realtimeActive=true;if(realtimeRetryTimer){clearTimeout(realtimeRetryTimer);realtimeRetryTimer=null;}broadcastChatPresence(!chat.classList.contains('hidden'));return;}
          if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
            try{console.error('[UpStatus Realtime]',status,err||'');}catch(e){}
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
        incoming.forEach(function(m){
          var id=String(m.id);
          byId[id]=mergeChatMessage(byId[id],m);
        });
        nextMessages=Object.keys(byId).map(function(k){return byId[k];}).sort(function(a,b){return Date.parse(a.createdAt)-Date.parse(b.createdAt);});
      }else{
        nextMessages=incoming.map(function(m){
          var existing=chatCache.find(function(x){return String(x.id)===String(m.id);});
          return mergeChatMessage(existing,m);
        });
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
  function markVisibleChatRead(){if(!token||chat.classList.contains('hidden'))return;var ids=chatCache.filter(function(m){return m.user!==member;}).map(function(m){return m.id;});setUnread(0);if(!ids.length)return;var k=ids.join(',');if(k===readSentKey)return;api('POST','/api/chat/read',{messageIds:ids}).then(function(){readSentKey=k;setUnread(0);if(realtimeActive&&realtimeChannel){try{realtimeChannel.send({type:'broadcast',event:'chat_read',payload:{reader:member,messageIds:ids}});}catch(e){}}}).catch(function(){});}
  var chatReadRefreshPending=false;
  function refreshChatReadReceipts(){
    if(!token||chatReadRefreshPending)return;
    chatReadRefreshPending=true;
    api('GET','/api/chat?fast=1&since='+encodeURIComponent(new Date(Date.now()-60000).toISOString())).then(function(d){
      var incoming=d.messages||[],changed=false,byId={};
      incoming.forEach(function(m){byId[String(m.id)]=m;});
      chatCache.forEach(function(m){var fresh=byId[String(m.id)];if(!fresh)return;var next=Array.isArray(fresh.readBy)?fresh.readBy:[];if(JSON.stringify(m.readBy||[])!==JSON.stringify(next)){m.readBy=next.slice();changed=true;}});
      if(changed&&!chat.classList.contains('hidden'))renderChat();
    }).catch(function(){}).finally(function(){chatReadRefreshPending=false;});
  }


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
  function setupChatAudioPlayer(el,url){if(!el||!url)return;var audio=new Audio(url);audio.preload='metadata';audio.volume=.85;var play=el.querySelector('.up-chat-audio-play'),time=el.querySelector('.up-chat-audio-time'),wave=el.querySelector('.up-chat-audio-wave'),vol=el.querySelector('.up-chat-audio-volume'),duration=0,peaks=[];var cacheKey=String(url);function fmt(s){s=Number(s);if(!isFinite(s)||s<0)return'--:--';s=Math.floor(s);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}function setDuration(v){v=Number(v);if(isFinite(v)&&v>0){duration=v;time.textContent=fmt(audio.currentTime)+' / '+fmt(duration);return true}return false}function draw(){if(!wave)return;wave.innerHTML='';for(var i=0;i<34;i++){var p=peaks[i]||.15;var h=Math.max(4,Math.round(4+p*24)),s=document.createElement('span');s.style.height=h+'px';s.style.minHeight=h+'px';wave.appendChild(s)}}function fallback(){peaks=[];for(var i=0;i<34;i++)peaks.push(.15+(((i*17)%83)/100)*.55);draw()}function applyCached(){var cached=audioWaveformCache[cacheKey];if(!cached)return false;peaks=cached.peaks.slice();setDuration(cached.duration);draw();return true}function analyze(){if(applyCached())return;if(audioWaveformPending[cacheKey]){audioWaveformPending[cacheKey].then(function(cached){peaks=cached.peaks.slice();setDuration(cached.duration);draw()}).catch(function(){fallback()});return}var job=Promise.resolve().then(function(){return fetch(url).then(function(r){return r.arrayBuffer()})}).then(function(buf){var AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('AudioContext unavailable');var ctx=new AC();return ctx.decodeAudioData(buf).then(function(decoded){var data=decoded.getChannelData(0),count=34,len=Math.max(1,Math.floor(data.length/count)),out=[];for(var i=0;i<count;i++){var start=i*len,end=i===count-1?data.length:Math.min(data.length,start+len),sum=0,n=0,step=Math.max(1,Math.floor((end-start)/220));for(var j=start;j<end;j+=step){var v=Math.abs(data[j]||0);sum+=v*v;n++}out.push(n?Math.sqrt(sum/n):.05)}var max=Math.max.apply(null,out.concat([.01]));out=out.map(function(v){return Math.max(.08,v/max)});var result={peaks:out,duration:Number(decoded.duration)||0};audioWaveformCache[cacheKey]=result;try{ctx.close()}catch(e){}return result})}).then(function(result){delete audioWaveformPending[cacheKey];peaks=result.peaks.slice();setDuration(result.duration);draw();return result}).catch(function(err){delete audioWaveformPending[cacheKey];throw err});audioWaveformPending[cacheKey]=job;job.catch(function(){})}function progress(){var d=duration||audio.duration,pct=isFinite(d)&&d>0?Math.min(1,audio.currentTime/d):0,spans=wave?wave.querySelectorAll('span'):[];spans.forEach(function(s,i){s.style.opacity=i/spans.length<=pct?'1':'.35'})}if(!applyCached())fallback();play.onclick=function(e){e.preventDefault();if(audio.paused){audio.play().then(function(){play.textContent='❚❚'}).catch(function(){})}else{audio.pause();play.textContent='▶'}};audio.addEventListener('loadedmetadata',function(){setDuration(audio.duration);analyze()});audio.addEventListener('durationchange',function(){setDuration(audio.duration)});audio.addEventListener('timeupdate',function(){var d=duration||audio.duration;time.textContent=fmt(audio.currentTime)+(isFinite(d)&&d>0?' / '+fmt(d):'');progress()});audio.addEventListener('ended',function(){play.textContent='▶';time.textContent=fmt(duration||audio.duration);progress()});if(vol)vol.onclick=function(){audio.muted=!audio.muted;vol.innerHTML=iconSvg('sound');vol.style.opacity=audio.muted?'.45':'1'};el._upAudio=audio;if(!audioWaveformCache[cacheKey])analyze()}
  function dedupeChatCache(){
    var byId={};
    (chatCache||[]).forEach(function(m){if(!m||m.id==null)return;var id=String(m.id);byId[id]=mergeChatMessage(byId[id],m);});
    chatCache=Object.keys(byId).map(function(id){return byId[id];}).sort(function(a,b){return Date.parse(a.createdAt)-Date.parse(b.createdAt);});
  }
  function renderChat(){
    var list=chat.querySelector('.up-chat-list');if(!list)return;
    dedupeChatCache();
    var forceScrollBottom=chatForceScrollBottom;
    chatForceScrollBottom=false;
    var renderKey=chatDataKey(chatCache);
    if(renderKey===chatLastRenderKey){
      if(forceScrollBottom)scrollChatToBottom(true);
      return;
    }
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
    chatLastRenderKey=renderKey;
    requestAnimationFrame(function(){
      if(forceScrollBottom)scrollChatToBottom(true);
      else list.scrollTop=wasAtBottom?list.scrollHeight:previousScrollTop;
    });
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
  function closeChat(showDashboard){
    if(!chat.classList.contains('hidden')){
      saveChatDraft();
      hideChatContextMenu();
      stopTypingHeartbeat();
      broadcastChatPresence(false);
    }
    chat.classList.add('hidden');
    card.classList.add('hidden');
    if(showDashboard)card.classList.remove('hidden');
    history.classList.add('hidden');
    health.classList.add('hidden');
    remoteOverlay.classList.add('hidden');
    stopHealthMonitor();
  }

  function openChat(){
    if(!token)return;
    chatReplyTo=null;chatContextMessageId=null;
    setUnread(0);
    chat.classList.remove('hidden');card.classList.add('hidden');history.classList.add('hidden');broadcastChatPresence(true);refresh();
    chat.innerHTML='<div class="up-history-head"><div class="up-chat-title-wrap"><button type="button" class="up-chat-profile-btn" title="Alterar foto de perfil"><img alt="Minha foto"></button><div><div class="up-history-title">Chat da equipe</div><div class="up-chat-header-info"><span class="chat-online-dot">●</span> 0 online · 0 no bate-papo</div></div></div><div style="display:flex;gap:6px;align-items:center">'+(member==='Ricardo'?'<button class="up-chat-clear" type="button" title="Limpar chat">'+iconSvg('trash')+'</button>':'')+'<button class="up-chat-back" type="button">← Voltar</button></div></div><div class="up-chat-lucca-alert hidden">🔴 ALERTA DE LUCCA MALUCO</div><div class="up-chat-list">Carregando…</div><div class="up-chat-typing hidden"></div><div class="up-chat-context-menu"></div><div class="up-chat-compose"><div class="up-chat-reply-bar hidden"><div class="up-chat-reply-copy"></div><button type="button" class="up-chat-reply-close">×</button></div><div class="up-mention-menu hidden"></div><div class="up-chat-emoji-menu hidden"></div><div class="up-chat-recording-label">Gravando <span class="up-chat-recording-time">0:00</span> • clique novamente para enviar</div><div class="up-chat-input-wrap"><textarea class="up-chat-input" maxlength="1000" placeholder="Digite uma mensagem"></textarea><button type="button" class="up-chat-send" title="Enviar mensagem" aria-label="Enviar mensagem">'+iconSvg('send')+'</button></div><div class="up-chat-tools"><button type="button" class="up-chat-emoji-btn" title="Emojis" aria-label="Emojis">'+iconSvg('emoji')+'</button><button type="button" class="up-chat-attach" title="Enviar foto, GIF ou vídeo" aria-label="Enviar foto, GIF ou vídeo">'+iconSvg('photo')+'</button><button type="button" class="up-chat-record" title="Gravar áudio (até 30 segundos)" aria-label="Gravar áudio">🎙️</button><input class="up-chat-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" hidden></div></div><div class="up-chat-lightbox hidden"><button type="button" class="up-chat-lightbox-close" aria-label="Fechar">×</button><img alt="Imagem ampliada"></div>';
    var profileBtn=chat.querySelector('.up-chat-profile-btn');if(profileBtn){hydrateAvatar(profileBtn.querySelector('img'),member);profileBtn.onclick=function(e){e.stopPropagation();openProfileModal();};profileBtn.addEventListener('mouseenter',function(e){showChatProfileHover(profileBtn.querySelector('img'),member,e);});profileBtn.addEventListener('mousemove',positionChatProfileHover);profileBtn.addEventListener('mouseleave',hideChatProfileHover);}
    var input=chat.querySelector('.up-chat-input'),photoBtn=chat.querySelector('.up-chat-attach'),photoFile=chat.querySelector('.up-chat-file'),emojiBtn=chat.querySelector('.up-chat-emoji-btn'),emojiMenu=chat.querySelector('.up-chat-emoji-menu'),recordBtn=chat.querySelector('.up-chat-record');
    restoreChatDraft(input);
    photoBtn.onclick=function(e){e.stopPropagation();photoFile.click()};
    photoFile.addEventListener('change',function(){if(photoFile.files&&photoFile.files[0])sendChatMedia(photoFile.files[0])});
    setupEmojiPicker(emojiBtn,emojiMenu,input);
    if(recordBtn)recordBtn.onclick=function(e){e.stopPropagation();toggleAudioRecording(recordBtn);};
    input.addEventListener('paste',function(e){var items=e.clipboardData&&e.clipboardData.items?Array.from(e.clipboardData.items):[];var item=items.find(function(x){return x.kind==='file'&&/^image\//i.test(x.type)});if(item){var file=item.getAsFile();if(file){e.preventDefault();sendChatMedia(file);}}});
    chat.querySelector('.up-chat-reply-close').onclick=function(e){e.stopPropagation();setChatReply(null);};
    if(!chatDocumentClickBound){
      chatDocumentClickBound=true;
      document.addEventListener('click',function(e){
        var menu=chat.querySelector('.up-chat-context-menu');
        if(menu&&menu.classList.contains('show')&&!menu.contains(e.target))hideChatContextMenu();
      });
    }
    chat.querySelector('.up-chat-back').onclick=function(e){e.stopPropagation();closeChat(true);};
    var clearBtn=chat.querySelector('.up-chat-clear');if(clearBtn)clearBtn.onclick=clearChatRicardo;
    var lightbox=chat.querySelector('.up-chat-lightbox');if(lightbox){lightbox.querySelector('.up-chat-lightbox-close').onclick=closeChatLightbox;lightbox.onclick=function(e){if(e.target===lightbox)closeChatLightbox();}}
    chat.querySelector('.up-chat-send').onclick=function(e){e.stopPropagation();sendChat()};
    input.addEventListener('input',function(){renderMentionMenu();handleTypingInput();});input.addEventListener('click',renderMentionMenu);input.addEventListener('keyup',renderMentionMenu);input.addEventListener('keydown',function(e){if(e.key.length===1||e.key==='Backspace'||e.key==='Delete')startTypingHeartbeat();});input.addEventListener('focus',function(){if(String(input.value||'').trim())startTypingHeartbeat();});input.addEventListener('blur',function(){if(typingStopTimer)clearTimeout(typingStopTimer);typingStopTimer=setTimeout(function(){stopTypingHeartbeat();},1200);});
    input.addEventListener('keydown',function(e){if(e.key==='Escape'){var menu=chat.querySelector('.up-mention-menu');if(menu)menu.classList.add('hidden');return;}if(e.key==='Enter'&&!e.shiftKey){if(e.repeat){e.preventDefault();return;}var menu=chat.querySelector('.up-mention-menu');if(menu&&!menu.classList.contains('hidden')){var first=menu.querySelector('.up-mention-option');if(first){e.preventDefault();applyMention(first.getAttribute('data-name'));return;}}e.preventDefault();sendChat();}});
    if(chatCache.length)renderChat();
    updateLuccaPresence(luccaOnline);
    loadChat();
    pollChatTyping();
    markVisibleChatRead();
  }
  function refreshChatAfterSend(input,btn){if(input)input.value='';if(btn)btn.disabled=false;loadChat();return Promise.resolve();}

  function reconcileSentChatMessage(tempId,created){
    var idx=chatCache.findIndex(function(m){return String(m.id)===String(tempId);});
    if(idx<0){chatCache.push(created);chatCache.sort(function(a,b){return Date.parse(a.createdAt)-Date.parse(b.createdAt);});renderChat();return;}
    var previous=idx>0?chatCache[idx-1]:null;
    var sameDay=!!previous&&chatDateKey(previous.createdAt)===chatDateKey(created.createdAt);
    var structuralSafe=idx===chatCache.length-1&&sameDay;
    chatCache[idx]=mergeChatMessage(chatCache[idx],created);
    chatCache[idx].id=created.id;
    if(!structuralSafe){
      chatCache.sort(function(a,b){return Date.parse(a.createdAt)-Date.parse(b.createdAt);});
      renderChat();
      return;
    }
    var item=chat.querySelector('.up-chat-item[data-message-id="'+CSS.escape(String(tempId))+'"]');
    if(item)item.setAttribute('data-message-id',String(created.id));
    chatLastRenderKey=chatDataKey(chatCache);
  }
  function setupEmojiPicker(btn,menu,input){
    if(!btn||!menu||!input)return;
    var emojis=[0x1F600,0x1F603,0x1F604,0x1F601,0x1F606,0x1F605,0x1F602,0x1F642,0x1F643,0x1F609,0x1F60A,0x1F60D,0x1F970,0x1F618,0x1F60E,0x1F914,0x1F610,0x1F611,0x1F636,0x1F644,0x1F60F,0x1F634,0x1F923,0x1F62D,0x1F621,0x1F92F,0x1F631,0x1F91D,0x1F44D,0x1F44E,0x1F44C,0x270C,0x1F64F,0x1F44F,0x1F4AA,0x2764,0x1F7E7,0x1F7E8,0x1F7E9,0x1F7E6,0x1F535,0x1F7E3,0x1F5A4,0x1F90D,0x1F4AF,0x1F525,0x1F389,0x1F680,0x2705,0x274C,0x2B50,0x1F921,0x1F916,0x1F440,0x1FAE1].map(function(cp){return String.fromCodePoint(cp);});
    menu.innerHTML=emojis.map(function(e){return '<button type="button" class="up-chat-emoji" data-emoji="'+esc(e)+'">'+e+'</button>';}).join('');
    btn.onclick=function(e){e.stopPropagation();menu.classList.toggle('hidden');};
    menu.querySelectorAll('.up-chat-emoji').forEach(function(b){b.onclick=function(e){e.preventDefault();e.stopPropagation();var value=input.value||'',pos=input.selectionStart==null?value.length:input.selectionStart,em=b.getAttribute('data-emoji')||'';input.value=value.slice(0,pos)+em+value.slice(pos);pos+=em.length;input.focus();input.setSelectionRange(pos,pos);};});
    if(!chatEmojiDocumentClickBound){
      chatEmojiDocumentClickBound=true;
      document.addEventListener('click',function(e){
        var currentMenu=chat.querySelector('.up-chat-emoji-menu'),currentBtn=chat.querySelector('.up-chat-emoji-btn');
        if(currentMenu&&currentBtn&&!currentMenu.contains(e.target)&&e.target!==currentBtn)currentMenu.classList.add('hidden');
      });
    }
  }
  function updateRecordingUi(btn,active){var label=chat.querySelector('.up-chat-recording-label');var time=chat.querySelector('.up-chat-recording-time');if(btn)btn.classList.toggle('recording',active);if(label)label.classList.toggle('show',active);if(!active&&time)time.textContent='0:00';}
  function stopAudioRecording(send){var rec=mediaRecorder;if(!rec)return;rec.__sendOnStop=!!send;try{if(rec.state==='recording'){try{rec.requestData();}catch(e){}rec.stop();}}catch(e){finishAudioRecording(rec);}}
  function finishAudioRecording(rec){try{if(rec&&rec.stream)rec.stream.getTracks().forEach(function(t){t.stop();});}catch(e){}clearInterval(recordingTimer);recordingTimer=null;updateRecordingUi(chat.querySelector('.up-chat-record'),false);mediaRecorder=null;}
  function toggleAudioRecording(btn){
    if(mediaRecorder&&mediaRecorder.state==='recording'){stopAudioRecording(true);return;}
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||typeof MediaRecorder==='undefined'){message('Seu navegador não suporta gravação de áudio.',true);return;}
    navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}}).then(function(stream){
      recordingChunks=[];recordingStartedAt=Date.now();var mime='';
      ['audio/ogg;codecs=opus','audio/webm;codecs=opus','audio/webm','audio/mp4','audio/mpeg'].some(function(x){if(MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(x)){mime=x;return true;}return false;});
      var options=mime?{mimeType:mime,audioBitsPerSecond:128000}:{};
      var rec=new MediaRecorder(stream,options);mediaRecorder=rec;rec.__sendOnStop=true;rec.__mime=mime;
      rec.ondataavailable=function(e){if(e.data&&e.data.size)recordingChunks.push(e.data);};
      rec.onerror=function(){finishAudioRecording(rec);recordingChunks=[];message('Não foi possível gravar o áudio.',true);};
      rec.onstop=function(){var shouldSend=!!rec.__sendOnStop;var mimeType=rec.mimeType||mime||'audio/webm';var chunks=recordingChunks.slice();recordingChunks=[];finishAudioRecording(rec);if(!shouldSend||!chunks.length)return;var blob=new Blob(chunks,{type:mimeType});if(blob.size>5*1024*1024){message('O áudio ficou maior que 5 MB.',true);return;}var reader=new FileReader();reader.onload=function(){sendChatAudioData(String(reader.result));};reader.onerror=function(){message('Não foi possível preparar o áudio.',true);};reader.readAsDataURL(blob);};
      rec.start(250);updateRecordingUi(btn,true);recordingTimer=setInterval(function(){var elapsed=Math.floor((Date.now()-recordingStartedAt)/1000),time=chat.querySelector('.up-chat-recording-time');if(time)time.textContent='0:'+String(Math.min(elapsed,30)).padStart(2,'0');if(elapsed>=30)stopAudioRecording(true);},250);
    }).catch(function(e){message(e.name==='NotAllowedError'?'Permita o uso do microfone para gravar áudio.':'Não foi possível acessar o microfone.',true);});
  }
  function sendChatAudioData(dataUrl){var send=chat.querySelector('.up-chat-send'),record=chat.querySelector('.up-chat-record');if(send)send.disabled=true;if(record)record.disabled=true;var raw=String(dataUrl||'');var match=raw.match(/^data:(audio\/[^;,]+)(?:;[^,]*)?;base64,/i);if(!match){if(send)send.disabled=false;if(record)record.disabled=false;message('Áudio inválido.',true);return;}api('POST','/api/chat/audio',{dataUrl:raw}).then(function(r){return api('POST','/api/chat',{message:'',imageUrl:r.imageUrl,type:'audio',replyTo:chatReplyTo});}).then(function(r){var created=normalizeChatMessage(r&&r.message);if(created){try{chatCache.push(created);dedupeChatCache();chatForceScrollBottom=true;renderChat();scrollChatToBottom(true);}catch(_){loadChat(true);}try{sendRealtimeEvent('chat_fast',{message:created});}catch(_){}}chatReplyTo=null;setChatReply(null);stopTypingHeartbeat();return refreshChatAfterSend(null,send);}).catch(function(e){if(send)send.disabled=false;message(e.message,true);}).finally(function(){if(record)record.disabled=false;});}
  function clearChatRicardo(){if(member!=='Ricardo')return;if(!confirm('Limpar todo o chat para a equipe?'))return;api('POST','/api/chat/clear',{}).then(function(){chatCache=[];chatLastRenderKey='';return api('GET','/api/chat');}).then(function(d){chatCache=d.messages||[];if(d.profiles)profileCache=d.profiles;renderChat();}).catch(function(e){message(e.message,true);});}
  function scrollChatToBottom(force){
    if(force===false)return;
    var list=chat.querySelector('.up-chat-list');
    if(!list)return;
    function apply(){
      try{
        var target=Math.max(0,list.scrollHeight-list.clientHeight);
        list.scrollTo(0,target);
        if(list.scrollTop!==target)list.scrollTop=target;
      }catch(e){}
    }
    apply();
    requestAnimationFrame(apply);
    requestAnimationFrame(function(){requestAnimationFrame(apply);});
  }
  function sendChat(){
    var input=chat.querySelector('.up-chat-input'),text=input?(input.value||'').trim():'';
    if(!input||!text)return;
    var btn=chat.querySelector('.up-chat-send');
    var tempId='local-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
    var tempReply=chatReplyTo;
    var optimistic={id:tempId,user:member,message:text,type:'text',systemType:'',createdAt:new Date().toISOString(),imageUrl:'',mentions:[],replyTo:tempReply,reactions:{},readBy:[],optimistic:true};
    chatCache.push(optimistic);
    input.value='';
    chatForceScrollBottom=true;
    clearChatDraft();
    chatReplyTo=null;
    setChatReply(null);
    try{renderChat();scrollChatToBottom(true);}catch(renderError){try{console.error('[UpStatus Chat] Falha ao renderizar envio otimista:',renderError);}catch(_){}}
    api('POST','/api/chat',{message:text,replyTo:tempReply}).then(function(r){
      var created=normalizeChatMessage(r&&r.message);
      if(created){
        clearChatDraft();
        try{
          reconcileSentChatMessage(tempId,created);
        }catch(reconcileError){
          try{console.error('[UpStatus Chat] Mensagem enviada, mas falhou a reconciliação visual:',reconcileError);}catch(_){}
          chatCache=chatCache.filter(function(m){return String(m.id)!==String(tempId);});
          loadChat(true);
        }
        try{sendRealtimeEvent('chat_fast',{message:created});}catch(_){}
      }else{
        chatCache=chatCache.filter(function(m){return m.id!==tempId;});
        loadChat(true);
      }
    }).catch(function(e){
      chatCache=chatCache.filter(function(m){return m.id!==tempId;});
      try{renderChat();}catch(renderError){try{console.error('[UpStatus Chat] Falha ao renderizar erro de envio:',renderError);}catch(_){}}
      if(input)input.value=text;
      saveChatDraft(input);
      message(e.message||'Não foi possível enviar a mensagem.',true);
    }).finally(function(){
      if(btn)btn.disabled=false;
    });
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
    var loginMember=GM_getValue(key+'last_member','Ricardo')||'Ricardo';lastMember=loginMember;card.innerHTML='<div class="up-title">UpStatus</div><div class="up-you">Entre para controlar o seu status.</div><div class="up-login"><label>Seu nome</label><select class="up-select" id="up-name"></select><label>Senha</label><input class="up-input" id="up-password" type="password" placeholder="Sua senha"><button id="up-enter">Entrar</button></div><div class="up-update up-login-update"><div><span>Versão v'+CURRENT_VERSION+'</span><a href="#" class="up-patch-link">O que há de novo?</a></div><div><button type="button" class="up-update-check">Verificar atualização</button><button type="button" class="up-update-now">Atualizar</button></div><span class="up-update-status"></span></div><div class="up-message"></div>';
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
    card.querySelector('.up-patch-link').onclick=function(e){e.preventDefault();openPatchNotes();};
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

  var upTestLoop={caller:null,callee:null,stream:null,audio:null,connected:false};
  var upTestMode=false;
  function closeTestPanel(){var el=document.querySelector('.up-test-overlay');if(el)el.remove();}
  function testCleanupLoop(){try{if(upTestLoop.caller)upTestLoop.caller.close();}catch(e){}try{if(upTestLoop.callee)upTestLoop.callee.close();}catch(e){}try{if(upTestLoop.stream)upTestLoop.stream.getTracks().forEach(function(t){t.stop();});}catch(e){}if(upTestLoop.audio){try{upTestLoop.audio.srcObject=null;}catch(e){}}upTestLoop={caller:null,callee:null,stream:null,audio:null,connected:false};}
  function testStopCall(){if(upTestMode)upTestMode=false;if(upCall.active)callCleanup(false);testCleanupLoop();}
  function testSimulateIncoming(){
    if(upCall.active&&!upTestMode){message('Finalize a chamada real antes de usar o teste.',true);return;}
    testStopCall();upTestMode=true;upCall.callId='test-'+Date.now();upCall.peer='Teste';upCall.role='callee';upCall.participants=[member,'Teste'];upCall.active=true;upCall.connected=false;upCall.muted=false;upCall.pendingOffers={};upCall.pendingInvite=null;
    callStartRingtone();callRender('Teste','Chamada recebida (teste)',[
      {label:'Atender',icon:'phone',onClick:function(){testAcceptIncoming();}},
      {label:'Recusar',icon:'hangup',danger:true,onClick:function(){testStopCall();}}
    ]);
  }
  function testAcceptIncoming(){
    if(!upTestMode)return;
    callStopRingtone();upCall.connected=true;
    callRender('Teste','Conectado (teste)',[
      {label:'Mutar',icon:'mic',onClick:function(){message('Mute visual do teste acionado.');}},
      {label:'Desligar',icon:'hangup',danger:true,onClick:function(){testStopCall();}}
    ]);
  }
  function testRingtone(roleKey){
    if(upCall.active&&!upTestMode){message('Finalize a chamada real antes de testar o toque.',true);return;}
    testStopCall();upTestMode=true;upCall.callId='ring-'+Date.now();upCall.peer='Teste';upCall.role=roleKey==='caller'?'caller':'callee';upCall.participants=[member,'Teste'];upCall.active=true;upCall.connected=false;
    callStartRingtone();setTimeout(function(){if(upTestMode)testStopCall();},8000);
  }
  async function testLoopback(){if(upCall.active&&!upTestMode){message('Finalize a chamada real antes de iniciar o loopback.',true);return;}testStopCall();var status=document.querySelector('.up-test-status');try{if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error('Microfone indisponível neste navegador.');upTestLoop.stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});upTestLoop.caller=new RTCPeerConnection();upTestLoop.callee=new RTCPeerConnection();upTestLoop.caller.onicecandidate=function(e){if(e.candidate)upTestLoop.callee.addIceCandidate(e.candidate).catch(function(){});};upTestLoop.callee.onicecandidate=function(e){if(e.candidate)upTestLoop.caller.addIceCandidate(e.candidate).catch(function(){});};upTestLoop.callee.ontrack=function(e){var audio=document.querySelector('.up-test-audio');if(audio){audio.srcObject=e.streams[0];upTestLoop.audio=audio;audio.play().catch(function(){});}};upTestLoop.stream.getTracks().forEach(function(t){upTestLoop.caller.addTrack(t,upTestLoop.stream);});var offer=await upTestLoop.caller.createOffer({offerToReceiveAudio:true});await upTestLoop.caller.setLocalDescription(offer);await upTestLoop.callee.setRemoteDescription(offer);var answer=await upTestLoop.callee.createAnswer();await upTestLoop.callee.setLocalDescription(answer);await upTestLoop.caller.setRemoteDescription(answer);upTestLoop.connected=true;if(status)status.textContent='Loopback WebRTC conectado. Sua voz deve voltar pelo áudio do teste.';}catch(e){testCleanupLoop();if(status)status.textContent=e.message||'Falha no teste WebRTC.';}}
  function openTestPanel(){if(member!=='Ricardo')return;closeTestPanel();var o=document.createElement('div');o.className='up-test-overlay';o.style.cssText='position:fixed;inset:0;z-index:2147483647;background:rgba(4,8,14,.68);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;';o.innerHTML='<div style="width:min(430px,calc(100vw - 28px));max-height:calc(100vh - 36px);overflow:auto;background:linear-gradient(145deg,#182334,#101722);border:1px solid #3d5272;border-radius:16px;box-shadow:0 22px 70px #000b;padding:18px;color:#edf2fb;font-family:Segoe UI,Arial,sans-serif;box-sizing:border-box"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><div style="font-size:17px;font-weight:800">Painel de testes</div><div style="font-size:11px;color:#91a2ba;margin-top:3px">Somente Ricardo • build '+esc(CURRENT_VERSION)+'</div></div><button class="up-test-close" style="border:0;background:#273247;color:#dbe5f5;border-radius:8px;width:30px;height:30px;cursor:pointer">×</button></div><div style="margin-top:14px;font-size:11px;color:#8fa0b8">Chamadas e áudio</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:7px"><button class="up-test-incoming">Simular chamada recebida</button><button class="up-test-stop">Encerrar teste</button><button class="up-test-ring-caller">Toque: chamando</button><button class="up-test-ring-callee">Toque: recebendo</button><button class="up-test-loop" style="grid-column:1/-1">Testar WebRTC local (loopback)</button></div><audio class="up-test-audio" autoplay playsinline controls style="width:100%;margin-top:9px;display:block"></audio><div class="up-test-status" style="margin-top:10px;padding:9px 10px;border:1px solid #2f4058;border-radius:9px;background:#111a27;color:#a9bad0;font-size:11px">Pronto para testar.</div><div style="margin-top:12px;font-size:10px;color:#74869f">O painel não altera o fluxo normal das chamadas. Os testes locais podem ser encerrados a qualquer momento.</div></div>';document.body.appendChild(o);o.querySelector('.up-test-close').onclick=function(){testStopCall();closeTestPanel();};o.querySelector('.up-test-incoming').onclick=testSimulateIncoming;o.querySelector('.up-test-stop').onclick=testStopCall;o.querySelector('.up-test-ring-caller').onclick=function(){testRingtone('caller');};o.querySelector('.up-test-ring-callee').onclick=function(){testRingtone('callee');};o.querySelector('.up-test-loop').onclick=testLoopback;o.addEventListener('click',function(e){if(e.target===o){testStopCall();closeTestPanel();}});}

  function app(){
    api('GET','/api/members').then(function(r){window.__upstatusMembers=(r.members||[]).map(function(x){return x.name});}).catch(function(){});
    card.innerHTML='<div class="up-head"><div class="up-head-identity"><button type="button" class="up-head-avatar up-head-avatar-btn" title="Alterar foto de perfil" aria-label="Alterar foto de perfil"><img class="up-head-avatar-img" alt=""></button><div><div class="up-title">UpStatus</div><div class="up-you">Conectado como '+esc(member)+'</div></div></div><div class="up-actions"><button class="up-chat-btn" title="Chat da equipe" aria-label="Chat da equipe">'+iconSvg('chat')+'</button><button class="up-history-btn hidden" title="Ver histórico" aria-label="Ver histórico">'+iconSvg('clock')+'</button><button class="up-settings-btn" title="Configurações" aria-label="Configurações">'+iconSvg('gear')+'</button><div class="up-settings-menu hidden"><button type="button" class="up-settings-notifications"></button><button type="button" class="up-settings-theme"></button>'+'<button type="button" class="up-settings-health">'+iconSvg('pulse')+'<span>Saúde do sistema</span></button>'+(member==='Ricardo'&&role==='implementation_admin'?'<button type="button" class="up-settings-test">'+iconSvg('tools')+'<span>Painel de testes</span></button>':'')+'</div><button class="up-logout">Sair</button></div></div><div class="up-statuses"><button class="up-status online">'+iconSvg('online')+' Online</button><button class="up-status busy">'+iconSvg('busy')+' Ocupado</button><button class="up-status away">'+iconSvg('away')+' Ausente</button></div><div class="up-reasons hidden"><label class="up-label">Motivo de ocupado</label><div class="up-reason-picker"><button type="button" class="up-reason-trigger"><span class="up-reason-trigger-icon">'+iconSvg('edit')+'</span><span class="up-reason-trigger-text">Selecione um motivo</span></button><div class="up-reason-menu hidden">'+reasons.map(function(x){return '<button type="button" class="up-reason-option" data-value="'+esc(x.value)+'">'+iconSvg(x.icon)+'<span class="up-reason-text">'+esc(x.label)+'</span></button>'}).join('')+'</div></div><select class="up-select hidden"></select><input class="up-input hidden" placeholder="Escreva o motivo"><button class="up-confirm hidden">Confirmar ocupado</button></div><div class="up-message"></div><div class="up-notice">'+iconSvg('pulse')+'<span>Sincronização com o Sale Smartly ativa.</span><span class="up-notice-ok">✓</span></div><div class="up-team-title-row"><div class="up-team-title">Equipe</div><span class="up-team-count"></span></div><div class="up-team">Carregando…</div>';
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
    if(settingsMenu){settingsMenu.onclick=function(e){e.stopPropagation();};var settingsHealth=settingsMenu.querySelector('.up-settings-health');if(settingsHealth)settingsHealth.onclick=function(){settingsMenu.classList.add('hidden');openHealth();};var settingsTest=settingsMenu.querySelector('.up-settings-test');if(settingsTest)settingsTest.onclick=function(){settingsMenu.classList.add('hidden');openTestPanel();};settingsMenu.querySelector('.up-settings-notifications').onclick=function(){toggleNotifications();};settingsMenu.querySelector('.up-settings-theme').onclick=function(){toggleTheme();};document.addEventListener('click',function(e){if(!settingsMenu.contains(e.target)&&e.target!==settingsBtn)settingsMenu.classList.add('hidden');});}
    card.querySelector('.up-chat-btn').onclick=function(e){e.stopPropagation();openChat()};
    quickChatBubble.onclick=function(e){e.stopPropagation();openChat()};
    updateNotificationPermissionUI();
    applyTheme();
    card.insertAdjacentHTML('beforeend','<div class="up-update"><div class="up-update-version">'+iconSvg('update')+'<div><b>Versão v'+CURRENT_VERSION+'</b><a href="#" class="up-patch-link">O que há de novo?</a><span class="up-update-status"></span></div></div><div class="up-update-actions"><button type="button" class="up-update-check">Verificar atualização</button><button type="button" class="up-update-now">Atualizar</button></div></div>');
    card.querySelector('.up-update-check').onclick=checkUpdate;
    card.querySelector('.up-patch-link').onclick=function(e){e.preventDefault();openPatchNotes();};
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
          ? '<button type="button" class="up-member-barui" data-target="'+esc(m.name)+'" title="Ligar para para '+esc(m.name)+'" aria-label="Ligar para para '+esc(m.name)+'">'+iconSvg('phone')+'</button><button type="button" class="up-member-power" data-target="'+esc(m.name)+'" title="Controlar fila de '+esc(m.name)+'" aria-label="Controlar fila de '+esc(m.name)+'">'+iconSvg('power')+'</button>'
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
      team.querySelectorAll('.up-member-barui').forEach(function(btn){btn.onclick=function(e){e.preventDefault();e.stopPropagation();startOutgoingCall(btn.getAttribute('data-target'));};});
      team.querySelectorAll('.up-member-power').forEach(function(btn){btn.onclick=function(e){e.preventDefault();e.stopPropagation();openRemoteControl(btn.getAttribute('data-target'));};});
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
    callUnlockAudio();
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
  setInterval(function(){if(member){broadcastChatPresence(!chat.classList.contains('hidden'));Object.keys(chatPresence).forEach(function(name){if(chatPresence[name]&&chatPresence[name]<Date.now())delete chatPresence[name];});if(!chat.classList.contains('hidden'))updateChatHeaderPresence();}},10000);
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
  setInterval(refreshChatReadReceipts,8000);
  setInterval(pollChatTyping,1000);  setInterval(pollRemoteStatus,5000);
  setInterval(checkUpdate,60000);
})();