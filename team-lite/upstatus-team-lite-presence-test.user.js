// ==UserScript==
// @name         UpStatus Team Lite Presence (TEST)
// @namespace    upseller-team-lite-presence-test
// @version      3.4.0.1
// @description  Indicador temporário de presença dos líderes na bolha oficial do UpStatus, usando apenas o backend TEST.
// @match        *://*.salesmartly.com/*
// @match        *://salesmartly.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
(function(){
'use strict';
if(window.__UPSTATUS_TEAM_LITE_PRESENCE_HELPER__)return;
window.__UPSTATUS_TEAM_LITE_PRESENCE_HELPER__=true;
const API='https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus-test';
const STYLE_ID='upstatus-team-lite-presence-test-style';
const style=document.createElement('style');
style.id=STYLE_ID;
style.textContent=`
#upstatus-bubble.utl-presence-luca{box-shadow:0 0 0 3px #a855f7,0 0 17px #a855f7!important;animation:utlPresencePulse 1.15s ease-in-out infinite!important}
#upstatus-bubble.utl-presence-icaro{box-shadow:0 0 0 3px #ff922b,0 0 17px #ff922b!important;animation:utlPresencePulse 1.15s ease-in-out infinite!important}
#upstatus-bubble.utl-presence-both{animation:utlPresenceBoth 1.25s linear infinite!important}
@keyframes utlPresencePulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.45)}}
@keyframes utlPresenceBoth{0%,49%{box-shadow:0 0 0 3px #a855f7,0 0 17px #a855f7!important}50%,100%{box-shadow:0 0 0 3px #ff922b,0 0 17px #ff922b!important}}
`;
(document.head||document.documentElement).appendChild(style);
let lastState=null;
async function check(){
 const bubble=document.getElementById('upstatus-bubble');if(!bubble)return;
 try{
  const results=await Promise.all([
   fetch(API+'/api/lucca/me?_presence='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Luca presence');return r.json();}),
   fetch(API+'/api/ycaro/me?_presence='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Ícaro presence');return r.json();})
  ]);
  const state={luca:!!results[0].online,icaro:!!results[1].online};
  lastState=state;
  bubble.classList.remove('utl-presence-luca','utl-presence-icaro','utl-presence-both');
  if(state.luca&&state.icaro)bubble.classList.add('utl-presence-both');
  else if(state.luca)bubble.classList.add('utl-presence-luca');
  else if(state.icaro)bubble.classList.add('utl-presence-icaro');
  bubble.title=state.luca&&state.icaro?'UpStatus · Luca e Ícaro ativos':state.luca?'UpStatus · Luca ativo':state.icaro?'UpStatus · Ícaro ativo':'Abrir UpStatus';
 }catch(e){
  if(lastState===null)bubble.classList.remove('utl-presence-luca','utl-presence-icaro','utl-presence-both');
 }
}
function start(){check();setInterval(check,4000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
