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
    return response({messages,unreadCount,profiles:profileMap,typing:(typing||[]).map((x:any)=>x.user_name),luccaOnline:false});
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

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
  try{
    const path=new URL(req.url).pathname;

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

    const name=await userFromToken(req);
    if(path==="/api/me"&&req.method==="GET"){
      const a=name?await account(name):null;
      return response({authenticated:!!name,name:name||null,role:a?.role||null,canViewHistory:a?.role==="implementation_admin",needsSetup:!!a&&!a.password_hash});
    }
    if(!name)return response({error:"Faça login para continuar."},401);

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
    return response({error:"Não encontrado."},404);
  }catch(e){
    console.error(e);
    return response({error:e instanceof Error?e.message:"Erro interno."},500);
  }
});
