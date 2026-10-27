// ==UserScript==
// @name UpStatus Team Lite
// @namespace upseller-team-lite
// @version 0.1.0
// @description Chat restrito para líderes, aberto por Shift+C.
// @match *://*.salesmartly.com/*
// @match *://salesmartly.com/*
// @run-at document-idle
// @grant none
// ==/UserScript==
(function () {
'use strict';
if (window.__UPSTATUS_TEAM_LITE__) return;
window.__UPSTATUS_TEAM_LITE__ = true;
const API='https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus-test';
const KEY='upstatus_team_lite_session_v1';
const root=document.createElement('section');
root.id='up-team-lite';
root.style.cssText='position:fixed;right:24px;bottom:24px;width:350px;height:480px;z-index:2147483647;background:#19212e;color:#edf2fb;border:1px solid #354258;border-radius:14px;box-shadow:0 16px 42px #000b;font:14px Segoe UI,Arial,sans-serif;display:none;flex-direction:column;overflow:hidden';
root.innerHTML='<header style="padding:12px;background:#202b3d;display:flex;justify-content:space-between"><b>UpStatus · Líderes</b><button id="utl-close">×</button></header><div id="utl-login" style="padding:16px;display:flex;flex-direction:column;gap:8px"><label>Nome</label><select id="utl-name"><option>Luca</option><option>Ícaro</option></select><label>Senha</label><input id="utl-pass" type="password" placeholder="Digite sua senha"><button id="utl-enter">Entrar no chat</button><small id="utl-error"></small></div><div id="utl-chat" style="display:none;flex:1;min-height:0;flex-direction:column"><div id="utl-messages" style="flex:1;overflow:auto;padding:10px"></div><div style="display:flex;gap:6px;padding:8px"><textarea id="utl-text" placeholder="Escreva uma mensagem" style="flex:1"></textarea><button id="utl-send">Enviar</button></div></div>';
document.body.appendChild(root);
const $=s=>root.querySelector(s); let session=null,poll=null,heartbeat=null;
function api(path,opts={}){const h={'Content-Type':'application/json'};if(session&&session.token)h['x-upstatus-token']=session.token;const u=API+path+(opts.method?'':'?_tl='+Date.now());return fetch(u,{method:opts.method||'GET',headers:h,body:opts.body,cache:'no-store'}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Falha de comunicação.');return d;});}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function load(){const d=await api('/api/chat');const list=(d.messages||[]).filter(m=>!session.joinedAt||Date.parse(m.createdAt||0)>=session.joinedAt);$('#utl-messages').innerHTML=list.map(m=>'<div style="padding:7px;margin:6px 0;background:#263349;border-radius:9px"><small>'+esc(m.user)+' · '+new Date(m.createdAt||Date.now()).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'</small><div>'+esc(m.message)+'</div></div>').join('')||'<small>Nenhuma mensagem nesta sessão ainda.</small>';$('#utl-messages').scrollTop=$('#utl-messages').scrollHeight;}
async function login(){const name=$('#utl-name').value;const endpoint=name==='Luca'?'/api/lucca/login':'/api/ycaro/login';try{const d=await api(endpoint,{method:'POST',body:JSON.stringify({password:$('#utl-pass').value})});session={name,token:d.token||'',joinedAt:Date.parse(d.joinedAt)||Date.now()};sessionStorage.setItem(KEY,JSON.stringify(session));$('#utl-login').style.display='none';$('#utl-chat').style.display='flex';await load();poll=setInterval(()=>load().catch(()=>{}),2500);heartbeat=setInterval(()=>api(name==='Luca'?'/api/lucca/heartbeat':'/api/ycaro/heartbeat',{method:'POST',body:'{}'}).catch(()=>{}),5000);}catch(e){$('#utl-error').textContent=e.message;}}
async function close(){root.style.display='none';if(poll)clearInterval(poll);if(heartbeat)clearInterval(heartbeat);poll=heartbeat=null;if(session){const endpoint=session.name==='Luca'?'/api/lucca/logout':'/api/ycaro/logout';try{await api(endpoint,{method:'POST',body:'{}'});}catch(_){}}session=null;sessionStorage.removeItem(KEY);$('#utl-login').style.display='flex';$('#utl-chat').style.display='none';$('#utl-pass').value='';}
async function send(){const field=$('#utl-text'),message=field.value.trim();if(!message)return;try{await api('/api/chat',{method:'POST',body:JSON.stringify({message})});field.value='';await load();}catch(e){$('#utl-error').textContent=e.message;}}
function toggle(){if(!location.hostname.endsWith('salesmartly.com'))return;if(root.style.display==='flex'){close();return;}root.style.display='flex';const saved=sessionStorage.getItem(KEY);if(saved){try{session=JSON.parse(saved);$('#utl-login').style.display='none';$('#utl-chat').style.display='flex';load();poll=setInterval(()=>load().catch(()=>{}),2500);heartbeat=setInterval(()=>api(session.name==='Luca'?'/api/lucca/heartbeat':'/api/ycaro/heartbeat',{method:'POST',body:'{}'}).catch(()=>{}),5000);return;}catch(_){}}}
document.addEventListener('keydown',e=>{if(e.shiftKey&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&e.key.toLowerCase()==='c'){const el=e.target;if(el&&(el.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(el.tagName)))return;e.preventDefault();e.stopPropagation();toggle();}},true);
$('#utl-close').onclick=close;$('#utl-enter').onclick=login;$('#utl-pass').onkeydown=e=>{if(e.key==='Enter')login();};$('#utl-send').onclick=send;$('#utl-text').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}};
})();