import { Buffer } from "node:buffer";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const ADMIN_KEY = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const db = createClient(PROJECT_URL, ADMIN_KEY, { auth: { persistSession: false } });

const VERSION = "2.7.2";
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
  const {data}=await db.from("upstatus_sessions").select("user_name,expires_at").eq("token_hash",tokenHash(t)).maybeSingle();
  if(!data)return null;
  if(Date.parse(data.expires_at)<=Date.now()){
    await db.from("upstatus_sessions").delete().eq("token_hash",tokenHash(t));
    return null;
  }
  return String(data.user_name);
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
async function createSession(name:string){
  const raw=randomBytes(32).toString("hex");
  await db.from("upstatus_sessions").delete().lt("expires_at",new Date().toISOString());
  const {error}=await db.from("upstatus_sessions").insert({
    token_hash:tokenHash(raw),
    user_name:name,
    expires_at:new Date(Date.now()+30*86400000).toISOString()
  });
  if(error)throw error;
  const a=await account(name);
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
    return createSession(name);
  }
  if(!a.password_hash||!checkPassword(password,String(a.password_hash)))return response({error:"Nome ou senha incorretos."},401);
  return createSession(name);
}
async function members(){
  const {data,error}=await db.from("users").select("name").order("name");
  if(error)throw error;
  return (data||[]).map((x:any)=>({name:String(x.name)}));
}
async function statusRoute(req:Request,name:string){
  if(req.method==="GET"){
    const {data,error}=await db.from("users").select("name,status,reason,updated_at,sync").order("name");
    if(error)throw error;
    const members:Record<string,unknown>={};
    for(const x of data||[])members[x.name]={name:x.name,status:x.status||"offline",reason:x.reason||"",updatedAt:x.updated_at||null,sync:x.sync||"not_configured"};
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
  return response({name,status,reason,updatedAt:now,sync:old.sync||"not_configured"});
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
async function chatRows(name:string){
  const cutoff=new Date(Date.now()-48*60*60*1000).toISOString();
  const {data,error}=await db.from("messages").select("id,user_name,message,type,system_type,created_at,image_url,mentions,reply_to,reactions").gte("created_at",cutoff).order("created_at",{ascending:true}).limit(1000);
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
  const m=String(raw||"").match(/^data:([^;]+)(?:;[^,]*)?;base64,([\\s\\S]+)$/i);
  if(!m)throw new Error("Arquivo inválido.");
  const bin=atob(m[2].replace(/\\s/g,""));
  return {mime:m[1].toLowerCase(),bytes:Uint8Array.from(bin,c=>c.charCodeAt(0))};
}
function ext(mime:string) {
  return ({ "image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif","video/mp4":"mp4","video/webm":"webm","audio/webm":"webm","audio/ogg":"ogg","audio/mp4":"m4a","audio/mpeg":"mp3","audio/wav":"wav","audio/x-wav":"wav","audio/x-m4a":"m4a" } as Record<string,string>)[mime]||"";
}
async function uploadFile(bucket:string,dataUrl:string,max:number,allowed:Set<string>) {
  const d=decodeDataUrl(dataUrl);
  if(!allowed.has(d.mime))throw new Error("Tipo de arquivo não suportado.");
  if(d.bytes.length>max)throw new Error("Arquivo acima do limite permitido.");
  const e=ext(d.mime);if(!e)throw new Error("Tipo de arquivo não suportado.");
  const path=Date.now()+"-"+randomBytes(6).toString("hex")+"."+e;
  const {error}=await db.storage.from(bucket).upload(path,d.bytes,{contentType:d.mime,upsert:false});
  if(error)throw error;
  return {url:db.storage.from(bucket).getPublicUrl(path).data.publicUrl,mime:d.mime};
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
    const messages=await chatRows(name);
    const {data:read}=await db.from("chat_reads").select("user_name,last_read_at,messages");
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
    const {data:profiles}=await db.from("upstatus_profiles").select("user_name,avatar_url");
    const profileMap:Record<string,string>={};
    for(const p of profiles||[])if(p.avatar_url)profileMap[p.user_name]=p.avatar_url;
    const cutoffTyping=new Date(Date.now()-4500).toISOString();
    const {data:typing}=await db.from("upstatus_typing").select("user_name").gt("last_seen_at",cutoffTyping).neq("user_name",name);
    return response({messages,unreadCount,profiles:profileMap,typing:(typing||[]).map((x:any)=>x.user_name),luccaOnline:(await expireLucca()).online===true});
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
  const {error}=await db.from("messages").insert({
    id:randomBytes(8).toString("hex"),user_name:name,message,type,system_type:"",
    created_at:new Date().toISOString(),image_url:imageUrl,mentions:await mentions(message),reply_to:replyTo,reactions:{}
  });
  if(error)throw error;
  return response({ok:true});
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
      if(!result||result.sender!==name)return response({error:"Resultado ainda não disponível."},404);
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
    let path=new URL(req.url).pathname;
    path=path.replace(/^.*\/upstatus/, "") || "/";
    if(path.length>1)path=path.replace(/\/$/, "");

    if(path==="/health"&&req.method==="GET")return response({ok:true,service:"UpStatus",version:VERSION});
    if(path==="/api/members"&&req.method==="GET")return response({members:await members()});
    if(path==="/api/update-info"&&req.method==="GET")return response({version:VERSION,updateUrl:""});
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
      const t=token(req);if(t)await db.from("upstatus_sessions").delete().eq("token_hash",tokenHash(t));
      return response({ok:true});
    }
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
