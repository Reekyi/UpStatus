import { Buffer } from "node:buffer";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const ADMIN_KEY = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const db = createClient(PROJECT_URL, ADMIN_KEY, { auth: { persistSession: false } });
const sessionCache = new Map<string,{name:string,expiresAt:number,checkedAt:number}>();
let membersCache:{at:number,data:Array<{name:string}>}|null=null;

const VERSION = "__UPSTATUS_VERSION__";
const USERSCRIPT_HEX = "__UPSTATUS_USERSCRIPT_HEX__";
function userscriptText(){ const bytes=new Uint8Array(USERSCRIPT_HEX.length/2); for(let i=0;i<bytes.length;i++) bytes[i]=parseInt(USERSCRIPT_HEX.slice(i*2,i*2+2),16); return new TextDecoder().decode(bytes); }
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
  if(!["Ricardo","Lohan","Guilherme"].includes(name))return response({error:"Seu perfil não possui acesso à saúde do sistema."},403);
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
  const stateQ=await db.from("upstatus_state").select("state_key").in("state_key"["remote-status"]);
  const stateOk=!stateQ.error;
  const stateMs=Date.now()-stateStarted;

  const nowMs=Date.now();
  const members=(usersQ.data||[]).map((x:any)=>({
    name:String(x.name),
    status:x.status||"offline",
    version:x.client_version||"",
    seenAt:x.client_seen_at||null,
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
    const clientVersion=(req.headers.get("x-upstatus-version")||"").trim();
    const presenceUpdate:Record<string,unknown>={client_seen_at:now};
    if(clientVersion)presenceUpdate.client_version=clientVersion;
    await db.from("users").update(presenceUpdate).eq("name",name);
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
        seenAt:x.client_seen_at||null,
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
  let query=db.from("messages").select("id,user_name,message,type,system_type,created_at,edited_at,image_url,mentions,reply_to,reactions").gte("created_at",cutoff);
  if(since)query=query.gt("created_at",since);
  const {data,error}=await query.order("created_at",{ascending:true}).limit(since?200:1000);
  if(error)throw error;
  await cleanupExpiredChatAttachments();
  const rows=await Promise.all((data||[]).map(async(m:any)=>({
    id:String(m.id),user:m.user_name,message:m.message||"",type:m.type||"text",systemType:m.system_type||"",
    createdAt:m.created_at,imageUrl:await signedChatAttachment(m.image_url||""),mentions:Array.isArray(m.mentions)?m.mentions:[],
    replyTo:m.reply_to||null,reactions:m.reactions||{},readBy:[]
  })));
  return rows;
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
function luccaToken(req:Request) {
  const auth=req.headers.get("authorization")||"";
  if(/^Bearer\s+/i.test(auth))return auth.replace(/^Bearer\s+/i,"").trim();
  return cookie(req,"lucca_session");
}
async function luccaState() {
  return await stateValue("lucca",{online:false,session:null,joinedAt:null,lastSeen:null});
}
async function expireLucca() {
  const s:any=await luccaState();
  if(!s.online||!s.lastSeen||Date.now()-Date.parse(String(s.lastSeen))<12000)return s;
  const next={...s,online:false,session:null,lastSeen:new Date().toISOString()};
  await setState("lucca",next);
  await db.from("messages").delete().eq("user_name","Lucca");
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
  if(bytes.length>=5&&bytes[0]===0x25&&bytes[1]===0x50&&bytes[2]===0x44&&bytes[3]===0x46&&bytes[4]===0x2d)return "application/pdf";
  if(bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return "image/jpeg";
  if(bytes.length>=8&&bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47&&bytes[4]===0x0d&&bytes[5]===0x0a&&bytes[6]===0x1a&&bytes[7]===0x0a)return "image/png";
  if(bytes.length>=6&&bytes[0]===0x47&&bytes[1]===0x49&&bytes[2]===0x46&&bytes[3]===0x38)return "image/gif";
  if(bytes.length>=12&&bytes[0]===0x52&&bytes[1]===0x49&&bytes[2]===0x46&&bytes[3]===0x46&&bytes[8]===0x57&&bytes[9]===0x45&&bytes[10]===0x42&&bytes[11]===0x50)return "image/webp";
  if(bytes.length>=4&&bytes[0]===0x50&&bytes[1]===0x4b&&bytes[2]===0x03&&bytes[3]===0x04&&/^application\/(vnd\.openxmlformats-officedocument\.|zip)/i.test(declared))return declared;
  if(bytes.length>=4&&bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3)return declared.startsWith("audio/")?"audio/webm":"video/webm";
  if(bytes.length>=4&&bytes[0]===0x4f&&bytes[1]===0x67&&bytes[2]===0x67&&bytes[3]===0x53)return "audio/ogg";
  if(bytes.length>=3&&bytes[0]===0x49&&bytes[1]===0x44&&bytes[2]===0x33)return "audio/mpeg";
  if(bytes.length>=12&&bytes[4]===0x66&&bytes[5]===0x74&&bytes[6]===0x79&&bytes[7]===0x70)return declared==="video/mp4"?"video/mp4":declared.startsWith("audio/")?"audio/mp4":"image/jpeg";
  if(bytes.length>=12&&bytes[0]===0x52&&bytes[1]===0x49&&bytes[2]===0x46&&bytes[3]===0x46&&bytes[8]===0x57&&bytes[9]===0x41&&bytes[10]===0x56&&bytes[11]===0x45)return "audio/wav";
  return declared;
}
function ext(mime:string) {
  return ({ "image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif","video/mp4":"mp4","video/webm":"webm","audio/webm":"webm","audio/ogg":"ogg","audio/mp4":"m4a","audio/mpeg":"mp3","audio/wav":"wav","audio/x-wav":"wav","audio/x-m4a":"m4a","application/pdf":"pdf","text/plain":"txt","text/csv":"csv","application/vnd.openxmlformats-officedocument.wordprocessingml.document":"docx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":"xlsx","application/vnd.openxmlformats-officedocument.presentationml.presentation":"pptx" } as Record<string,string>)[mime]||"";
}
const CHAT_ATTACHMENT_TTL_MS=72*60*60*1000;
const CHAT_ATTACHMENT_PREFIX="attachment:";
async function cleanupExpiredChatAttachments(){
  const now=new Date().toISOString();
  const {data,error}=await db.from("upstatus_chat_attachments").select("object_path").lte("expires_at",now).limit(100);
  if(error)throw error;
  const paths=(data||[]).map((x:any)=>String(x.object_path||"")).filter(Boolean);
  if(!paths.length)return;
  const {error:removeError}=await db.storage.from("chat-attachments").remove(paths);
  if(removeError)throw removeError;
  const {error:deleteError}=await db.from("upstatus_chat_attachments").delete().in("object_path",paths);
  if(deleteError)throw deleteError;
}
async function signedChatAttachment(value:string){
  if(!value.startsWith(CHAT_ATTACHMENT_PREFIX))return value;
  const objectPath=value.slice(CHAT_ATTACHMENT_PREFIX.length);
  const {data,error}=await db.from("upstatus_chat_attachments").select("expires_at").eq("object_path",objectPath).maybeSingle();
  if(error||!data||Date.parse(data.expires_at)<=Date.now())return "";
  const {data:signed,error:signedError}=await db.storage.from("chat-attachments").createSignedUrl(objectPath,Math.max(60,Math.floor((Date.parse(data.expires_at)-Date.now())/1000)));
  if(signedError)throw signedError;
  return signed.signedUrl;
}
async function uploadChatAttachment(dataUrl:string,max:number,allowed:Set<string>){
  const d=decodeDataUrl(dataUrl);
  const mime=sniffMime(d.bytes,d.mime);
  if(!allowed.has(mime))throw new Error("Tipo de arquivo não suportado.");
  if(d.bytes.length>max)throw new Error("Arquivo acima do limite permitido.");
  const e=ext(mime);if(!e)throw new Error("Tipo de arquivo não suportado.");
  const path=Date.now()+"-"+randomBytes(12).toString("hex")+"."+e;
  const body=d.bytes.buffer.slice(d.bytes.byteOffset,d.bytes.byteOffset+d.bytes.byteLength);
  const {error}=await db.storage.from("chat-attachments").upload(path,body,{contentType:mime,cacheControl:"3600",upsert:false});
  if(error)throw error;
  const expiresAt=new Date(Date.now()+CHAT_ATTACHMENT_TTL_MS).toISOString();
  const {error:metaError}=await db.from("upstatus_chat_attachments").insert({object_path:path,created_by:"chat",expires_at:expiresAt,content_type:mime,byte_size:d.bytes.length});
  if(metaError){await db.storage.from("chat-attachments").remove([path]);throw metaError;}
  return {url:CHAT_ATTACHMENT_PREFIX+path,mime};
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
  const c=luccaToken(req);
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
      const [messages,profileRes,typingRes,luccaStateNow]=await Promise.all([
        chatRows(name,effectiveSince),
        db.from("upstatus_profiles").select("user_name,avatar_url"),
        db.from("upstatus_typing").select("user_name").gt("last_seen_at",cutoffTyping).neq("user_name",name),
        expireLucca()
      ]);
      const profileMap:Record<string,string>={};
      for(const p of profileRes.data||[])if(p.avatar_url)profileMap[p.user_name]=p.avatar_url;
      return response({messages,profiles:profileMap,typing:(typingRes.data||[]).map((x:any)=>x.user_name),luccaOnline:(luccaStateNow as any).online===true});
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
  const displayImageUrl=await signedChatAttachment(imageUrl);
  return response({ok:true,message:{id,user:name,user_name:name,message,type,systemType:"",system_type:"",createdAt,imageUrl:displayImageUrl,image_url:displayImageUrl,mentions:mentionList,replyTo,reactions:{},readBy:[]}});
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
async function editRoute(req:Request,name:string,id:string){
  const cleanId=String(id||"").trim();
  if(!cleanId)return response({error:"Mensagem inválida."},400);
  const p:any=await readBody(req),message=String(p.message||"").trim();
  if(!message)return response({error:"A mensagem não pode ficar vazia."},400);
  if(message.length>1000)return response({error:"A mensagem deve ter no máximo 1000 caracteres."},400);
  const {data}=await db.from("messages").select("id,user_name,message,type").eq("id",cleanId).maybeSingle();
  if(!data)return response({error:"Mensagem não encontrada."},404);
  if(data.user_name!==name)return response({error:"Você só pode editar suas próprias mensagens."},403);
  if(data.type!=="text")return response({error:"Somente mensagens de texto podem ser editadas."},400);
  const editedAt=new Date().toISOString();
  const {error}=await db.from("messages").update({message,edited_at:editedAt}).eq("id",cleanId);
  if(error)throw error;
  return response({ok:true,message:{id:cleanId,user:name,message,editedAt}});
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
async function mediaRoute(req:Request,kind:"image"|"audio"|"file") {
  const p:any=await readBody(req);
  await cleanupExpiredChatAttachments();
  const max=kind==="audio"?5*1024*1024:25*1024*1024;
  const fileTypes=new Set(["application/pdf","text/plain","text/csv","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/vnd.openxmlformats-officedocument.presentationml.presentation"]);
  const mediaTypes=kind==="audio"?new Set(["audio/webm","audio/ogg","audio/mp4","audio/mpeg","audio/wav","audio/x-wav","audio/x-m4a"]):new Set(["image/png","image/jpeg","image/webp","image/gif","video/mp4","video/webm"]);
  const allowed=kind==="file"?fileTypes:mediaTypes;
  const saved=await uploadChatAttachment(String(p.dataUrl||""),max,allowed);
  return response({ok:true,imageUrl:saved.url,type:kind==="file"?"file":saved.mime.startsWith("video/")?"video":kind});
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
  await setState("remote-status",state);
  return response({ok:true,commandId:id,command:state.commands[target]});
}
async function luccaRoute(req:Request) {
  const rawPath=new URL(req.url).pathname;
  let path=rawPath;
  const marker="__UPSTATUS_PATH_MARKER__";
  const markerAt=path.lastIndexOf(marker);
  if(markerAt>=0)path=path.slice(markerAt+marker.length);
  if(!path)path="/";
  if(path.length>1)path=path.replace(/\/$/,"");
  if(path==="/api/lucca/login") {
    const p:any=await readBody(req);
    const pass=Deno.env.get("LUCCA_PASSWORD")||"";
    if(!pass||String(p.password||"")!==pass)return response({error:"Senha incorreta."},401);
    const old:any=await expireLucca();
    const session=randomBytes(32).toString("hex"),joinedAt=new Date().toISOString();
    await setState("lucca",{online:true,session,joinedAt,lastSeen:joinedAt});
    const background=async()=>{
      try{
        if(old.online)await db.from("messages").insert({id:randomBytes(8).toString("hex"),user_name:"Sistema",message:"🔴 Lucca Maluco saiu do chat.",type:"system",system_type:"lucca_leave",created_at:new Date().toISOString(),image_url:"",mentions:[],reply_to:null,reactions:{}});
        await db.from("messages").delete().eq("user_name","Lucca");
        await db.from("messages").insert({id:randomBytes(8).toString("hex"),user_name:"Sistema",message:"🔴 Lucca Maluco entrou no chat.",type:"system",system_type:"lucca_join",created_at:new Date().toISOString(),image_url:"",mentions:[],reply_to:null,reactions:{}});
      }catch(e){console.error("Lucca login background cleanup failed",e);}
    };
    EdgeRuntime.waitUntil(background());
    return response({ok:true,name:"Lucca",joinedAt,token:session},200,{"Set-Cookie":"lucca_session="+encodeURIComponent(session)+"; HttpOnly; SameSite=Lax; Secure; Path=/; Max-Age=86400"});
  }
  if(path==="/api/lucca/me") {
    const s:any=await expireLucca(),c=luccaToken(req);
    return response(c&&s.online&&s.session===c?{authenticated:true,name:"Lucca",joinedAt:s.joinedAt,online:true}:{authenticated:false,name:null,online:!!s.online});
  }
  if(path==="/api/lucca/heartbeat") {
    const s:any=await expireLucca(),c=luccaToken(req);
    if(!c||!s.online||s.session!==c)return response({error:"Sessão do Lucca encerrada."},401);
    await setState("lucca",{...s,lastSeen:new Date().toISOString()});return response({ok:true,online:true});
  }
  if(path==="/api/lucca/logout") {
    const s:any=await expireLucca(),c=luccaToken(req);
    if(c&&s.online&&s.session===c){await setState("lucca",{...s,online:false,session:null,lastSeen:new Date().toISOString()});await db.from("messages").delete().eq("user_name","Lucca");await db.from("messages").insert({id:randomBytes(8).toString("hex"),user_name:"Sistema",message:"🔴 Lucca Maluco saiu do chat.",type:"system",system_type:"lucca_leave",created_at:new Date().toISOString(),image_url:"",mentions:[],reply_to:null,reactions:{}});}
    return response({ok:true},200,{"Set-Cookie":"lucca_session=; HttpOnly; SameSite=Lax; Secure; Path=/; Max-Age=0"});
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
  const marker="__UPSTATUS_PATH_MARKER__";
  const markerAt=path.lastIndexOf(marker);
  if(markerAt>=0)path=path.slice(markerAt+marker.length);
  if(!path)path="/";
  if(path.length>1)path=path.replace(/\/$/,"");
    if(path==="/upstatus.user.js"&&req.method==="GET")return new Response(userscriptText(),{status:200,headers:{"Content-Type":"text/javascript; charset=utf-8",...CORS,"Cache-Control":"no-store"}});
    if(path==="/health"&&req.method==="GET")return response({ok:true,service:"UpStatus",version:VERSION});
    if(path==="/api/members"&&req.method==="GET")return response({members:await members()});
    if(path==="/api/update-info"&&req.method==="GET")return response({version:VERSION,updateUrl:"/upstatus.user.js"});
    if(path==="/lucca"||path==="/lucca.html"){
      if(req.method!=="GET")return response({error:"Método não permitido."},405);
      const html="<!doctype html>\n<html lang=\"pt-BR\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<title>Lucca Maluco • UpStatus</title>\n<style>\n#upstatus-root{position:fixed;right:24px;bottom:24px;z-index:2147483647;font:14px Segoe UI,Arial,sans-serif;color:#edf2fb}.up-main-alert{animation:upAlertShake .45s ease-in-out 1}.up-main-alert.up-barui-alert{animation:upAlertShake .35s ease-in-out infinite}@keyframes upAlertShake{0%,100%{transform:translateX(0) rotate(0)}20%{transform:translateX(-4px) rotate(-3deg)}40%{transform:translateX(4px) rotate(3deg)}60%{transform:translateX(-3px) rotate(-2deg)}80%{transform:translateX(3px) rotate(2deg)}}#upstatus-bubble{position:relative;width:42px;height:42px;border:2px solid #6b7688;border-radius:50%;background:#5b6574;overflow:visible;padding:0;box-shadow:0 5px 16px #0009;cursor:grab;display:flex;align-items:center;justify-content:center;user-select:none;-webkit-user-select:none;touch-action:none;line-height:1;transition:background .18s,border-color .18s}#upstatus-bubble img{display:none}#upstatus-bubble .up-bubble-icon{width:22px;height:22px;color:#fff}.up-notify-dot{position:absolute;right:-10px;top:-10px;min-width:18px;height:18px;padding:0 4px;border-radius:999px;background:#ff334f;border:2px solid #19212e;display:none;align-items:center;justify-content:center;box-sizing:border-box;color:#fff;font:800 10px/1 Segoe UI,Arial,sans-serif}.up-notify-dot.show{display:block}.up-quick-chat-bubble{position:absolute;left:-7px;top:-7px;width:22px;height:22px;border:2px solid #19212e;border-radius:50%;background:#687384;color:#fff;box-sizing:border-box;padding:0;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px #0008;cursor:pointer;z-index:5;transition:background .18s,border-color .18s,transform .18s}.up-quick-chat-bubble:hover{background:#7a8799;border-color:#253149;transform:scale(1.08)}.up-quick-chat-icon{width:12px;height:12px}.up-update-dot{position:absolute;right:-8px;top:-8px;width:22px;height:22px;border-radius:50%;background:#4f7dff;border:2px solid #19212e;display:none;align-items:center;justify-content:center;font-size:12px;line-height:1;box-sizing:border-box}.up-update-dot.show{display:flex}.up-barui-incoming{position:absolute;right:52px;bottom:0;width:315px;z-index:90;pointer-events:auto}.up-barui-incoming.hidden{display:none}.up-barui-incoming-card{position:relative;box-sizing:border-box;padding:13px 12px 11px;border:2px solid #ff3d58;border-radius:14px;background:rgba(75,12,25,.94);color:#fff;box-shadow:0 0 0 3px rgba(255,45,72,.14),0 10px 30px rgba(0,0,0,.35);animation:upbaruiAlert .62s infinite alternate}.up-barui-incoming-title{font-size:13px;font-weight:900;letter-spacing:.2px;line-height:1.2;text-transform:uppercase}.up-barui-incoming-sub{font-size:11px;color:#ffd6dc;margin-top:4px}.up-barui-incoming-actions{display:flex;gap:7px;margin-top:10px}.up-barui-incoming-actions button{flex:1;border:0;border-radius:8px;padding:8px 9px;font:800 12px Segoe UI,Arial,sans-serif;cursor:pointer}.up-barui-attend{background:#fff;color:#b51f39}.up-barui-stop{background:#8d1f32;color:#fff}.up-barui-incoming.shake{animation:upbaruiAlert .62s infinite alternate}.up-toast-stack{position:absolute;right:52px;bottom:0;width:300px;display:flex;flex-direction:column-reverse;gap:7px;pointer-events:none}.up-toast{position:relative;pointer-events:auto;box-sizing:border-box;width:100%;padding:9px 28px 9px 11px;border:1px solid rgba(90,105,130,.45);border-radius:12px;background:rgba(25,33,46,.82);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 8px 24px rgba(0,0,0,.22);color:#e7edf7;animation:uptoastIn .16s ease-out}.up-toast-name{font-size:11px;font-weight:750;color:#aebbd0;line-height:1.15;margin-bottom:3px}.up-toast-text{font-size:12px;line-height:1.35;white-space:pre-wrap;word-break:break-word}.up-toast-close{position:absolute;right:7px;top:6px;width:18px;height:18px;border:0;border-radius:50%;background:transparent;color:#9aa8bc;font-size:14px;line-height:18px;padding:0;cursor:pointer}.up-toast-close:hover{background:rgba(127,145,170,.16);color:#edf2fb}@keyframes uptoastIn{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}@media(prefers-color-scheme:light){.up-toast{background:rgba(255,255,255,.82);border-color:rgba(60,75,95,.22);color:#1d2735;box-shadow:0 8px 24px rgba(0,0,0,.14)}.up-toast-name{color:#526176}.up-toast-close{color:#718096}.up-toast-close:hover{background:rgba(80,95,115,.1);color:#263345}}.up-bubble-icon{width:24px;height:24px}#upstatus-card{position:absolute;bottom:55px;right:0;width:365px;max-width:calc(100vw - 32px);background:#19212e;border:1px solid #354258;border-radius:16px;padding:18px;box-shadow:0 16px 42px #000b}#upstatus-history{position:absolute;bottom:55px;right:0;width:365px;max-width:calc(100vw - 32px);height:520px;box-sizing:border-box;background:#19212e;border:1px solid #354258;border-radius:16px;padding:18px;box-shadow:0 16px 42px #000b;overflow:hidden;display:flex;flex-direction:column}#upstatus-chat{position:absolute;bottom:55px;right:0;width:365px;max-width:calc(100vw - 32px);height:520px;box-sizing:border-box;background:#19212e;border:1px solid #354258;border-radius:16px;padding:18px;box-shadow:0 16px 42px #000b;overflow:hidden;display:flex;flex-direction:column}#upstatus-card{resize:both;min-width:320px;min-height:420px;max-width:calc(100vw - 32px);max-height:calc(100vh - 32px);overflow:auto}#upstatus-history,#upstatus-chat{resize:both;min-width:320px;min-height:420px;max-width:calc(100vw - 32px);max-height:calc(100vh - 32px)}#upstatus-card.hidden,#upstatus-history.hidden,#upstatus-chat.hidden,.up-reasons.hidden,.up-select.hidden,.up-input.hidden,.up-confirm.hidden,.up-history-btn.hidden{display:none}.up-head,.up-member-top,.up-history-head{display:flex;justify-content:space-between;align-items:center}.up-title,.up-history-title{font-size:18px;font-weight:750}.up-you,.up-reason{color:#aab6c9;font-size:12px;margin-top:4px}.up-actions{display:flex;gap:6px;align-items:center;position:relative}.up-chat-btn,.up-logout,.up-history-btn,.up-close{border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer;box-sizing:border-box;height:34px;min-width:34px}.up-chat-btn{position:relative;border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer}.up-notification-btn{border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer;box-sizing:border-box;height:34px;min-width:34px;font-size:15px;line-height:1}.up-notification-btn.enabled{background:#184f3a;color:#7ef0b6}.up-notification-btn.denied{background:#3a2730;color:#ff9aaa}.up-chat-btn .up-chat-notify-dot{position:absolute;right:-3px;top:-3px;width:10px;height:10px;border-radius:50%;background:#ff4d67;border:2px solid #19212e;display:none}.up-chat-btn .up-chat-notify-dot.show{display:block}.up-barui-main{position:relative;width:34px;height:34px;padding:0;border:0;border-radius:50%;background:#273247;color:#c6d1e1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.up-barui-main .up-icon{width:17px;height:17px}.up-barui-main.active,.up-barui-main.incoming{background:#c52f48;color:#fff;animation:upbaruibtn .55s infinite alternate}.up-barui-popup{position:absolute;right:0;top:42px;width:230px;padding:10px;background:#111722;border:1px solid #3a475b;border-radius:10px;box-shadow:0 12px 30px #0009;z-index:60}.up-barui-popup.hidden{display:none}.up-barui-popup-title{font-size:12px;font-weight:750;color:#cbd5e4;margin-bottom:7px}.up-barui-popup-row{display:flex;gap:6px}.up-barui-popup select{flex:1;min-width:0;border:1px solid #3a475b;border-radius:7px;background:#19212e;color:#edf2fb;padding:7px;font-size:12px}.up-barui-popup button{border:0;border-radius:7px;background:#c52f48;color:#fff;font-weight:750;padding:7px 9px;cursor:pointer}.up-barui-popup button:disabled{opacity:.6;cursor:wait}.up-barui-row{display:flex;gap:7px;margin-top:8px}.up-barui-select{flex:1;min-width:0;border:1px solid #3a475b;border-radius:8px;background:#111722;color:#edf2fb;padding:8px}.up-barui-btn{border:0;border-radius:8px;padding:8px 11px;background:#a52a3c;color:#fff;font-weight:800;cursor:pointer}.up-barui-btn.active{background:#d66b1f}.up-barui-hint{font-size:11px;color:#8f9db2;margin-top:5px}.up-barui-active{animation:upbarui .55s infinite alternate}@keyframes upbaruibtn{from{transform:scale(1);box-shadow:0 0 0 0 #ff334f55}to{transform:scale(1.08);box-shadow:0 0 0 7px #ff334f55}}@keyframes upbarui{from{box-shadow:0 7px 22px #0009}to{box-shadow:0 0 0 7px #ff334f55,0 7px 22px #0009}}.up-icon{display:inline-block;width:16px;height:16px;vertical-align:-3px;flex:0 0 auto}.up-icon-wrap{display:inline-flex;align-items:center;justify-content:center;vertical-align:middle}.up-history-btn{font-size:17px;padding:5px 8px;line-height:1}.up-history-btn .up-icon{width:18px;height:18px}.up-select,.up-history-list,.up-history-head{font-family:\"Segoe UI\",Arial,sans-serif}.up-reason-picker{position:relative}.up-reason-trigger{width:100%;display:flex;align-items:center;gap:8px;padding:10px;border-radius:8px;border:1px solid #3a475b;background:#111722;color:#edf2fb;cursor:pointer;text-align:left}.up-reason-menu{position:absolute;z-index:30;left:0;right:0;margin-top:4px;background:#111722;border:1px solid #3a475b;border-radius:8px;padding:4px;box-shadow:0 12px 30px #0008}.up-reason-menu.hidden{display:none}.up-reason-option{width:100%;display:flex;align-items:center;gap:8px;border:0;background:transparent;color:#edf2fb;padding:9px 8px;border-radius:6px;cursor:pointer;text-align:left}.up-reason-option:hover{background:#273247}.up-reason-text{flex:1}.up-status-icon.online{color:#7be1a7}.up-status-icon.busy{color:#ffcf61}.up-status-icon.away{color:#c7d0df}.up-export{border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer;font-size:12px;font-weight:700}.up-statuses{display:flex;gap:7px;margin:16px 0 12px}.up-status{border:0;border-radius:8px;padding:9px;font-weight:700;cursor:pointer}.online{background:#173f2b;color:#7be1a7}.busy{background:#4d3a13;color:#ffcf61}.away{background:#303949;color:#c7d0df}.up-label{display:block;margin-bottom:6px;font-weight:650}.up-select,.up-input{width:100%;padding:10px;border-radius:8px;border:1px solid #3a475b;background:#111722;color:#edf2fb}.up-input{margin-top:7px}.up-confirm{margin-top:7px;width:100%;border:0;border-radius:8px;padding:9px;background:#4f7dff;color:#fff;font-weight:700;cursor:pointer}.up-message{min-height:20px;font-size:12px;color:#ff8499;margin-top:8px}.up-notice{margin:10px 0;padding:9px;border-radius:8px;background:#173f2b;color:#9ce5b8;font-size:12px}.up-team-title{font-weight:750;margin:13px 0 7px}.up-member{padding:9px 0;border-bottom:1px solid #303b4d}.up-member:last-child{border:0}.up-badge{font-size:11px;font-weight:700;border-radius:12px;padding:3px 6px}.b-online{background:#173f2b;color:#7be1a7}.b-busy{background:#4d3a13;color:#ffcf61}.b-away,.b-offline{background:#303949;color:#c7d0df}.up-time{font-size:11px;color:#8390a4;margin-top:4px}.up-chat-list{height:auto;flex:1;min-height:0;overflow:auto;margin-top:12px;padding-right:3px}.up-chat-item{position:relative;display:flex;align-items:flex-end;gap:7px;padding:6px 0}.up-chat-item.own{flex-direction:row-reverse;cursor:context-menu}.up-chat-avatar{width:28px;height:28px;flex:0 0 28px;border-radius:50%;object-fit:cover;background:#273247;border:1px solid #3a475b}.up-chat-bubble{position:relative;max-width:78%;min-width:52px;padding:7px 9px;border-radius:12px 12px 12px 3px;background:#273247;color:#e7edf7;box-sizing:border-box;box-shadow:0 3px 10px #0003}.up-chat-item.own .up-chat-bubble{border-radius:12px 12px 3px 12px;background:#3159bd}.up-chat-item.lucca .up-chat-bubble{background:rgba(106,18,39,.48);border:1px solid rgba(255,76,108,.48);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 4px 18px rgba(255,45,82,.12),inset 0 1px 0 rgba(255,255,255,.07)}.up-chat-item.lucca .up-chat-meta b{color:#ff91a7}.up-chat-item.lucca .up-chat-text{color:#ffe9ee}.up-chat-system-event.clear span{background:#273247;border-color:#4f7dff;color:#a9c2ff}.up-chat-photo{cursor:zoom-in}.up-chat-lightbox{position:fixed;inset:0;z-index:2147483647;background:rgba(5,8,13,.88);display:flex;align-items:center;justify-content:center;padding:28px;box-sizing:border-box;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}.up-chat-lightbox.hidden{display:none}.up-chat-lightbox img{max-width:92vw;max-height:90vh;width:auto;height:auto;object-fit:contain;border-radius:12px;box-shadow:0 20px 70px #000b;border:1px solid #52627b}.up-chat-lightbox-close{position:absolute;right:22px;top:18px;width:38px;height:38px;border:0;border-radius:50%;background:rgba(39,50,71,.9);color:#fff;font-size:25px;line-height:38px;cursor:pointer}.up-chat-lightbox-close:hover{background:#4f5e75}.up-chat-meta{display:flex;align-items:center;gap:7px;font-size:10px;color:#9eabc0}.up-chat-meta b{font-weight:750;color:#cbd5e4}.up-chat-item.own .up-chat-meta{justify-content:flex-end}.up-chat-read{font-size:11px;color:#aebbd0;margin-left:4px;cursor:help;user-select:none}.up-chat-read.read{color:#63a2ff}.up-chat-own-meta{text-align:right;min-height:13px}.up-chat-profile-btn{width:34px;height:34px;padding:0;border:0;border-radius:50%;background:#273247;cursor:pointer;overflow:hidden}.up-chat-profile-btn img{width:100%;height:100%;object-fit:cover;display:block}.up-chat-title-wrap{display:flex;align-items:center;gap:8px}.up-chat-profile-modal{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}.up-chat-profile-modal.hidden{display:none}.up-chat-profile-dialog{width:min(330px,calc(100vw - 40px));padding:18px;border:1px solid #40506a;border-radius:14px;background:#182130;box-shadow:0 18px 45px #000b}.up-chat-profile-preview{width:84px;height:84px;margin:0 auto 12px;border-radius:50%;object-fit:cover;background:#273247;border:2px solid #40506a;display:block}.up-chat-profile-file{width:100%;margin:8px 0;color:#cbd5e4;font-size:12px}.up-chat-profile-actions{display:flex;gap:7px}.up-chat-profile-actions button{flex:1;border:0;border-radius:8px;padding:9px;cursor:pointer;font-weight:750}.up-chat-profile-save{background:#4f7dff;color:#fff}.up-chat-profile-cancel{background:#273247;color:#cbd5e4}.up-chat-profile-message{min-height:18px;font-size:11px;color:#ff9aaa;margin:7px 0}.up-delete-action{position:absolute;right:4px;top:28px;border:1px solid #4a566b;border-radius:6px;background:#273247;color:#ff9aaa;padding:4px 7px;font:700 11px Segoe UI,Arial,sans-serif;cursor:pointer;box-shadow:0 5px 14px #0006;z-index:5}.up-delete-action:hover{background:#3a2530;color:#ffb5c1}.up-delete-action.hidden{display:none}.up-chat-meta{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:#8fa0b8}.up-chat-text{font-size:13px;color:#e7edf7;white-space:pre-wrap;word-break:break-word;margin-top:4px}.up-chat-typing{display:flex;align-items:center;gap:7px;min-height:28px;margin:2px 0 3px 35px;color:#9eabc0;font-size:10px}.up-chat-typing.hidden{display:none}.up-chat-typing-avatar{width:22px;height:22px;border-radius:50%;object-fit:cover;border:1px solid #3a475b;background:#273247}.up-chat-typing-dots{display:inline-flex;align-items:center;gap:3px;padding:5px 7px;border-radius:10px 10px 10px 3px;background:#273247}.up-chat-typing-dots i{width:4px;height:4px;border-radius:50%;background:#aebbd0;animation:upTyping 1s infinite ease-in-out}.up-chat-typing-dots i:nth-child(2){animation-delay:.15s}.up-chat-typing-dots i:nth-child(3){animation-delay:.3s}@keyframes upTyping{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-3px);opacity:1}}.up-member-top{display:flex;align-items:center;gap:7px}.up-member-top b{flex:1;min-width:0}.up-member-barui{width:28px;height:28px;padding:0;border:0;border-radius:50%;background:#273247;color:#c6d1e1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}.up-member-barui .up-icon{width:15px;height:15px}.up-member-barui:hover{background:#36445b}.up-member-barui.active{background:#c52f48;color:#fff;animation:upbaruibtn .55s infinite alternate}.up-member-barui:disabled{opacity:.55;cursor:wait}.up-member-power{width:28px;height:28px;padding:0;border:0;border-radius:50%;background:#273247;color:#c6d1e1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}.up-member-power .up-icon{width:15px;height:15px}.up-member-power:hover{background:#3b465b;color:#fff}.up-member-power:disabled{opacity:.55;cursor:wait}.up-remote-overlay{position:absolute;inset:0;z-index:100;background:rgba(10,15,24,.68);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;border-radius:16px}.up-remote-overlay.hidden{display:none}.up-remote-dialog{width:100%;max-width:315px;background:#182130;border:1px solid #40506a;border-radius:14px;padding:14px;box-sizing:border-box;box-shadow:0 18px 45px #000b}.up-remote-title{font-size:15px;font-weight:800}.up-remote-sub{font-size:11px;color:#9aa8bc;margin-top:3px}.up-remote-statuses{display:flex;gap:6px;margin-top:12px}.up-remote-status{flex:1;border:1px solid #3a475b;border-radius:8px;padding:9px 6px;background:#111722;color:#dce5f2;cursor:pointer;font:700 12px Segoe UI,Arial,sans-serif}.up-remote-status:hover,.up-remote-status.active{background:#30405b;border-color:#5b7fc8}.up-remote-reason{margin-top:9px}.up-remote-reason.hidden{display:none}.up-remote-reason-menu{display:flex;flex-direction:column;gap:3px}.up-remote-reason-option{border:0;background:#111722;color:#dce5f2;border-radius:7px;padding:8px;text-align:left;cursor:pointer;font:12px Segoe UI,Arial,sans-serif}.up-remote-reason-option:hover,.up-remote-reason-option.active{background:#30405b}.up-remote-actions{display:flex;gap:7px;margin-top:12px}.up-remote-actions button{flex:1;border:0;border-radius:8px;padding:9px;font:800 12px Segoe UI,Arial,sans-serif;cursor:pointer}.up-remote-cancel{background:#273247;color:#cbd5e4}.up-remote-confirm{background:#4f7dff;color:#fff}.up-remote-confirm:disabled{opacity:.55;cursor:wait}.up-remote-message{min-height:18px;margin-top:7px;font-size:11px;color:#ff9aaa}.up-chat-text{font-size:13px;color:#e7edf7;white-space:pre-wrap;word-break:break-word;margin-top:4px}.up-chat-photo{display:block;max-width:260px;max-height:210px;width:auto;height:auto;margin-top:6px;border:1px solid #3a475b;border-radius:9px;background:#111722;cursor:zoom-in;object-fit:contain;box-shadow:0 4px 14px #0004}.up-chat-media{display:block;max-width:220px;max-height:150px;margin-top:6px;border:1px solid #3a475b;border-radius:9px;background:#111722;object-fit:contain;box-shadow:0 4px 14px #0004}.up-chat-media-video{width:220px;height:150px}.up-chat-profile-hover{position:fixed;z-index:2147483647;display:none;width:148px;padding:10px;box-sizing:border-box;border:1px solid #52627b;border-radius:12px;background:#182130;box-shadow:0 14px 40px #000b;pointer-events:none;text-align:center}.up-chat-profile-hover.show{display:block}.up-chat-profile-hover img{display:block;width:96px;height:96px;margin:0 auto 7px;border-radius:50%;object-fit:cover;border:2px solid #40506a;background:#273247}.up-chat-profile-hover-name{font-size:12px;font-weight:750;color:#e7edf7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.up-chat-profile-hover-role{font-size:10px;color:#9eabc0;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.up-chat-compose{position:relative;display:flex;align-items:stretch;gap:6px}.up-chat-compose .up-chat-input{display:block;flex:1 1 auto;width:auto;box-sizing:border-box;min-width:0}.up-chat-tools{display:flex;align-items:stretch;gap:6px;flex:0 0 auto;margin-top:0}.up-mention-menu{position:absolute;left:0;bottom:calc(100% + 8px);z-index:20;display:flex;flex-wrap:wrap;gap:6px;width:100%;padding:7px;box-sizing:border-box;background:#182130;border:1px solid #3a475b;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.32)}.up-mention-menu.hidden{display:none}.up-mention-option{flex:0 0 auto;border:1px solid #344158;background:#243149;color:#dbe5f5;border-radius:8px;padding:6px 9px;cursor:pointer;font:12px Segoe UI,Arial,sans-serif}.up-mention-option:hover{background:#30405b;border-color:#4f7dff}.up-mention-option.up-mention-all{background:#3b315f;border-color:#8065c7;color:#fff}.up-chat-tools{display:flex;gap:6px;flex:0 0 auto}.up-chat-emoji-btn{width:38px;height:42px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;padding:0;border:1px solid #3a475b;border-radius:8px;background:#273247;color:#fff;cursor:pointer;font-size:20px}.up-chat-emoji-btn:hover{background:#35425a}.up-chat-attach{width:38px;height:42px;padding:0;border:1px solid #3a475b;border-radius:8px;background:#273247;color:#dbe5f5;cursor:pointer;font-size:17px;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box}.up-chat-attach:hover{background:#35425a}.up-chat-back{border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer;font:700 12px Segoe UI,Arial,sans-serif}.up-chat-back:hover{background:#35425a}.up-chat-mention{color:#7fb1ff;font-weight:750}.up-chat-input{flex:1 1 auto;width:auto;min-width:0;min-height:42px;height:42px;max-height:90px;resize:vertical;padding:8px;border-radius:8px;border:1px solid #3a475b;background:#111722;color:#edf2fb;font:13px Segoe UI,Arial,sans-serif}.up-chat-send{margin-top:7px;width:100%;border:0;border-radius:8px;padding:9px;background:#4f7dff;color:#fff;font-weight:700;cursor:pointer}.up-update{font-size:11px;color:#9caac0;margin-top:10px}.up-update button{margin-left:6px;border:0;background:#273247;color:#c6d1e1;border-radius:6px;padding:4px 7px;cursor:pointer}.up-update button:hover{background:#35425a}.up-update .up-update-now:disabled{opacity:.45;cursor:not-allowed;background:#202938;color:#7f8ca0}.up-update .up-update-now:disabled:hover{background:#202938}.up-history-list{overflow:auto;flex:1;min-height:0;margin-top:12px}.up-history-day{font-size:12px;font-weight:750;color:#8fa0b8;margin:14px 0 7px}.up-history-item{padding:9px 0;border-bottom:1px solid #303b4d}.up-history-meta{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.up-history-reason{font-size:12px;color:#b7c2d2;margin-top:3px}.up-history-empty{font-size:12px;color:#9aa8bc;padding:14px 0}.up-login label{display:block;margin:12px 0 5px;font-weight:650}.up-login button{width:100%;margin-top:15px;border:0;border-radius:8px;padding:10px;background:#4f7dff;color:#fff;font-weight:700;cursor:pointer}.up-remote-overlay{position:fixed!important;inset:0!important;width:100vw;height:100vh;z-index:2147483646;background:rgba(5,9,16,.64);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;border-radius:0;overflow:auto}.up-remote-dialog{width:min(360px,calc(100vw - 40px));max-height:calc(100vh - 40px);overflow:auto}.up-chat-read-tooltip{position:fixed;z-index:2147483647;display:none;max-width:280px;padding:7px 9px;border:1px solid #40506a;border-radius:8px;background:#182130;color:#edf2fb;font:11px Segoe UI,Arial,sans-serif;box-shadow:0 10px 25px #0008;pointer-events:none;white-space:nowrap}.up-chat-read-tooltip.show{display:block}.up-chat-emoji-menu{position:absolute;right:0;bottom:calc(100% + 8px);z-index:25;width:260px;max-height:190px;overflow:auto;padding:8px;box-sizing:border-box;display:flex;flex-wrap:wrap;gap:4px;background:#182130;border:1px solid #3a475b;border-radius:10px;box-shadow:0 10px 30px #0008}.up-chat-emoji-menu.hidden{display:none}.up-chat-emoji{width:32px;height:32px;border:0;border-radius:7px;background:transparent;color:#fff;font-size:20px;cursor:pointer}.up-chat-emoji:hover{background:#273247}.up-chat-context-menu{position:fixed;z-index:2147483647;display:none;min-width:170px;padding:6px;background:#182130;border:1px solid #40506a;border-radius:10px;box-shadow:0 12px 32px #0009}.up-chat-context-menu.show{display:block}.up-chat-context-action{display:flex;align-items:center;gap:7px;width:100%;border:0;background:transparent;color:#edf2fb;border-radius:7px;padding:8px;text-align:left;cursor:pointer;font:12px Segoe UI,Arial,sans-serif}.up-chat-context-action:hover{background:#273247}.up-chat-context-reaction-row{display:flex;gap:3px;padding:4px 2px 2px;border-top:1px solid #334158;margin-top:4px}.up-chat-quoted{margin-bottom:6px;padding:5px 7px;border-left:3px solid #7aa2ff;background:#202b3d;border-radius:6px;font-size:10px;color:#b8c6d9}.up-chat-quoted b{display:block;color:#8eb2ff;margin-bottom:2px}.up-chat-reactions{display:flex;gap:4px;flex-wrap:wrap;margin-top:5px}.up-chat-reaction{border:0;border-radius:10px;background:#202c40;color:#fff;padding:2px 6px;font-size:12px;cursor:pointer}.up-chat-reaction.mine{background:#39558a}.up-chat-reply-bar{display:flex;align-items:center;gap:7px;margin-bottom:6px;padding:7px 9px;border-left:3px solid #4f7dff;background:#202b3d;border-radius:7px;color:#dce5f2}.up-chat-reply-bar.hidden{display:none}.up-chat-reply-copy{flex:1;min-width:0;font-size:11px}.up-chat-reply-copy b{display:block;color:#7fb1ff}.up-chat-reply-close{border:0;background:transparent;color:#aebbd0;cursor:pointer;font-size:17px}.up-chat-record{width:38px;height:42px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;padding:0;border:1px solid #3a475b;border-radius:8px;background:#273247;color:#dbe5f5;cursor:pointer;font-size:17px}.up-chat-record.recording{background:#c52f48;color:#fff;animation:uprecord .7s infinite alternate}.up-chat-record:disabled{opacity:.55;cursor:wait}@keyframes uprecord{from{box-shadow:0 0 0 0 #ff334f55}to{box-shadow:0 0 0 7px #ff334f55}}.up-chat-recording-label{position:absolute;left:0;bottom:calc(100% + 8px);padding:6px 9px;border-radius:8px;background:#c52f48;color:#fff;font-size:11px;font-weight:800;display:none}.up-chat-recording-label.show{display:block}.up-chat-audio{display:block;width:240px;max-width:100%;margin-top:6px}#upstatus-root.up-theme-light{color:#1b2430}#upstatus-root.up-theme-light #upstatus-card,#upstatus-root.up-theme-light #upstatus-history,#upstatus-root.up-theme-light #upstatus-chat{background:#f7f9fc;border-color:#d7dee9;color:#1b2430;box-shadow:0 16px 42px rgba(0,0,0,.18)}#upstatus-root.up-theme-light .up-you,#upstatus-root.up-theme-light .up-reason,#upstatus-root.up-theme-light .up-time,#upstatus-root.up-theme-light .up-history-day,#upstatus-root.up-theme-light .up-history-reason,#upstatus-root.up-theme-light .up-history-empty{color:#64748b}#upstatus-root.up-theme-light .up-chat-btn,#upstatus-root.up-theme-light .up-logout,#upstatus-root.up-theme-light .up-history-btn,#upstatus-root.up-theme-light .up-close,#upstatus-root.up-theme-light .up-notification-btn,#upstatus-root.up-theme-light .up-export{background:#e8edf4;color:#334155}#upstatus-root.up-theme-light .up-notification-btn.enabled{background:#d7f4e5;color:#147044}#upstatus-root.up-theme-light .up-member{border-color:#dbe2ec}#upstatus-root.up-theme-light .up-member-barui,#upstatus-root.up-theme-light .up-member-power{background:#e8edf4;color:#334155}#upstatus-root.up-theme-light .up-chat-context-menu,#upstatus-root.up-theme-light .up-chat-reply-bar{background:#fff;color:#1e293b;border-color:#cbd5e1}#upstatus-root.up-theme-light .up-chat-context-action{color:#1e293b}#upstatus-root.up-theme-light .up-chat-context-action:hover{background:#eef2f7}#upstatus-root.up-theme-light .up-chat-reaction{background:#eef2f7;color:#1e293b}#upstatus-root.up-theme-light .up-chat-reply-copy b{color:#3567c8}#upstatus-root.up-theme-light .up-chat-reply-close{color:#64748b}#upstatus-root.up-theme-light .up-chat-quoted{background:#eef2f7;color:#475569}#upstatus-root.up-theme-light .up-chat-quoted b{color:#3567c8}#upstatus-root.up-theme-light .up-chat-attach,#upstatus-root.up-theme-light .up-chat-record,#upstatus-root.up-theme-light .up-chat-emoji-btn{background:#e8edf4;color:#334155;border-color:#cbd5e1}#upstatus-root.up-theme-light .up-reason-trigger,#upstatus-root.up-theme-light .up-reason-menu,#upstatus-root.up-theme-light .up-select,#upstatus-root.up-theme-light .up-input,#upstatus-root.up-theme-light .up-chat-input,#upstatus-root.up-theme-light .up-chat-photo,#upstatus-root.up-theme-light .up-mention-menu{background:#fff;border-color:#cbd5e1;color:#1e293b}#upstatus-root.up-theme-light .up-reason-option,#upstatus-root.up-theme-light .up-mention-option{color:#1e293b}#upstatus-root.up-theme-light .up-reason-option:hover,#upstatus-root.up-theme-light .up-mention-option:hover{background:#eef2f7}#upstatus-root.up-theme-light .up-chat-item{border-color:#dbe2ec}#upstatus-root.up-theme-light .up-chat-text{color:#1e293b}#upstatus-root.up-theme-light .up-chat-bubble{background:#e7edf5;color:#1e293b;box-shadow:0 3px 10px rgba(15,23,42,.12)}#upstatus-root.up-theme-light .up-chat-item.own .up-chat-bubble{background:#dbeafe;color:#1e293b}#upstatus-root.up-theme-light .up-chat-meta,#upstatus-root.up-theme-light .up-chat-meta b{color:#526176}#upstatus-root.up-theme-light .up-chat-read{color:#64748b}#upstatus-root.up-theme-light .up-chat-read.read{color:#1677ff}#upstatus-root.up-theme-light .up-chat-emoji-menu{background:#fff;border-color:#cbd5e1;box-shadow:0 10px 30px rgba(0,0,0,.16)}#upstatus-root.up-theme-light .up-chat-emoji:hover{background:#eef2f7}#upstatus-root.up-theme-light .up-chat-record,#upstatus-root.up-theme-light .up-chat-photo,#upstatus-root.up-theme-light .up-chat-emoji-btn{background:#fff;color:#334155;border-color:#cbd5e1}#upstatus-root.up-theme-light .up-update{color:#64748b}#upstatus-root.up-theme-light .up-update button{background:#e8edf4;color:#334155}#upstatus-root.up-theme-light .up-toast{background:rgba(255,255,255,.94);border-color:#d4dce7;color:#1e293b}#upstatus-root.up-theme-light .up-toast-name{color:#526176}#upstatus-root.up-theme-light .up-barui-incoming-card{background:rgba(255,245,247,.98);color:#8f1730}#upstatus-root.up-theme-light .up-barui-incoming-sub{color:#a83a4d}#upstatus-root.up-theme-light .up-barui-stop{background:#f1d5da;color:#8f1730}#upstatus-root.up-theme-light .up-remote-dialog{background:#fff;border-color:#cbd5e1;color:#1e293b}#upstatus-root.up-theme-light .up-remote-sub{color:#64748b}#upstatus-root.up-theme-light .up-remote-status{background:#f1f5f9;border-color:#cbd5e1;color:#334155}#upstatus-root.up-theme-light .up-remote-status:hover,#upstatus-root.up-theme-light .up-remote-status.active{background:#dbeafe;border-color:#7aa2e8;color:#1e3a8a}#upstatus-root.up-theme-light .up-remote-reason-option{background:#f1f5f9;color:#334155}#upstatus-root.up-theme-light .up-remote-reason-option:hover,#upstatus-root.up-theme-light .up-remote-reason-option.active{background:#dbeafe}#upstatus-root.up-theme-light .up-remote-cancel{background:#e8edf4;color:#334155}#upstatus-root.up-theme-light .up-chat-notify-dot{border-color:#f7f9fc}#upstatus-root.up-theme-light .up-notify-dot,#upstatus-root.up-theme-light .up-update-dot,#upstatus-root.up-theme-light .up-quick-chat-bubble{border-color:#f7f9fc}.up-theme-btn{border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer;box-sizing:border-box;height:34px;min-width:34px;display:inline-flex;align-items:center;justify-content:center}.up-theme-btn .up-icon{width:16px;height:16px}#upstatus-root.up-theme-light .up-theme-btn{background:#e8edf4;color:#334155}\nhtml,body{margin:0;min-height:100%;background:#0e141d;color:#edf2fb;font-family:\"Segoe UI\",Arial,sans-serif}\nbody{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box}\n.hidden{display:none!important}\n#guest-login{width:min(365px,calc(100vw - 36px));box-sizing:border-box;background:#19212e;border:1px solid #354258;border-radius:16px;padding:22px;box-shadow:0 16px 42px #000b}\n.guest-login-title{font-size:20px;font-weight:800;margin-bottom:4px}\n.guest-login-sub{font-size:12px;color:#9eabc0;margin-bottom:18px}\n.guest-login-label{display:block;font-size:12px;font-weight:700;margin:12px 0 6px}\n.guest-login-input{width:100%;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid #3a475b;background:#111722;color:#edf2fb;outline:none}\n.guest-login-btn{width:100%;border:0;border-radius:8px;padding:10px;margin-top:14px;background:#4f7dff;color:#fff;font-weight:800;cursor:pointer}\n.guest-login-msg{min-height:18px;margin-top:8px;font-size:12px;color:#ff8499}\n#guest-shell{width:min(760px,calc(100vw - 36px));height:min(760px,calc(100vh - 36px));min-height:520px;display:flex;align-items:stretch;justify-content:center}\n#guest-chat{position:relative;right:auto;bottom:auto;width:min(760px,100%);height:100%;max-width:none;max-height:none;box-sizing:border-box;background:#19212e;border:1px solid #354258;border-radius:16px;padding:18px;box-shadow:0 16px 42px #000b;overflow:hidden;display:flex;flex-direction:column}\n#guest-chat .up-history-head{flex:0 0 auto}\n#guest-chat .up-chat-list{margin-top:10px}\n.guest-alert{flex:0 0 auto;position:relative;z-index:20;margin-top:10px;padding:9px 12px;border:1px solid #a92e43;border-radius:9px;background:#351724;color:#ff9aaa;font-size:12px;font-weight:850;letter-spacing:.2px;box-shadow:0 4px 14px #0005}\n.guest-top-actions{display:flex;gap:6px;align-items:center}\n.guest-exit{border:0;border-radius:7px;padding:7px 9px;background:#273247;color:#c6d1e1;cursor:pointer;height:34px}\n.guest-badge{font-size:10px;padding:3px 7px;border-radius:99px;background:#351724;color:#ff9aaa;border:1px solid #6d2637;font-weight:800}\n.up-chat-system-event{display:flex;justify-content:center;padding:9px 0 7px}\n.up-chat-system-event span{padding:6px 10px;border-radius:999px;background:#252e3c;border:1px solid #3a475b;color:#aebbd0;font-size:10px;font-weight:800;text-align:center}\n.up-chat-system-event.join span{background:#351724;border-color:#7c2a3e;color:#ff9aaa}\n@media(max-width:600px){body{padding:0}#guest-shell{width:100%;height:100vh;min-height:0}#guest-chat{border-radius:0;border-left:0;border-right:0}}\n</style>\n</head>\n<body>\n<section id=\"guest-login\">\n  <div class=\"guest-login-title\">Lucca Maluco</div>\n  <div class=\"guest-login-sub\">Acesso exclusivo ao chat da equipe.</div>\n  <label class=\"guest-login-label\" for=\"guest-password\">Senha</label>\n  <input id=\"guest-password\" class=\"guest-login-input\" type=\"password\" inputmode=\"numeric\" placeholder=\"Digite a senha\" autocomplete=\"off\">\n  <button id=\"guest-enter\" class=\"guest-login-btn\">Entrar no chat</button>\n  <div id=\"guest-login-msg\" class=\"guest-login-msg\"></div>\n</section>\n\n<section id=\"guest-shell\" class=\"hidden\">\n  <div id=\"guest-chat\">\n    <div class=\"up-history-head\">\n      <div class=\"up-chat-title-wrap\">\n        <button type=\"button\" class=\"up-chat-profile-btn\" title=\"Alterar foto de perfil\"><img alt=\"Minha foto\"></button>\n        <div><div class=\"up-history-title\">Chat da equipe</div><div class=\"guest-badge\">LUCCA MALUCO</div></div>\n      </div>\n      <div class=\"guest-top-actions\"><button class=\"guest-exit\" type=\"button\">Sair</button></div>\n    </div>\n    <div class=\"guest-alert\">🔴 ALERTA DE LUCCA MALUCO</div>\n    <div class=\"up-chat-list\">Carregando…</div>\n    <div class=\"up-chat-typing hidden\"></div>\n    <div class=\"up-chat-context-menu\"></div>\n    <div class=\"up-chat-compose\">\n      <div class=\"up-chat-reply-bar hidden\"><div class=\"up-chat-reply-copy\"></div><button type=\"button\" class=\"up-chat-reply-close\">×</button></div>\n      <div class=\"up-mention-menu hidden\"></div>\n      <div class=\"up-chat-emoji-menu hidden\"></div>\n      <div class=\"up-chat-recording-label\">Gravando <span class=\"up-chat-recording-time\">0:00</span> • clique novamente para enviar</div>\n      <textarea class=\"up-chat-input\" maxlength=\"1000\" placeholder=\"Digite uma mensagem\"></textarea>\n      <div class=\"up-chat-tools\"><button type=\"button\" class=\"up-chat-emoji-btn\" title=\"Emojis\" aria-label=\"Emojis\">😀</button><button type=\"button\" class=\"up-chat-attach\" title=\"Enviar foto, GIF ou vídeo\" aria-label=\"Enviar foto, GIF ou vídeo\">📷</button><button type=\"button\" class=\"up-chat-record\" title=\"Gravar áudio (até 30 segundos)\" aria-label=\"Gravar áudio\">🎙</button><input class=\"up-chat-file\" type=\"file\" accept=\"image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm\" hidden></div>\n    </div>\n    <button class=\"up-chat-send\">Enviar</button><div class=\"up-chat-lightbox hidden\"><button type=\"button\" class=\"up-chat-lightbox-close\" aria-label=\"Fechar\">×</button><img alt=\"Imagem ampliada\"></div>\n  </div>\n</section>\n\n<div class=\"up-chat-profile-hover\"></div>\n<div class=\"up-chat-read-tooltip\"></div>\n<div id=\"guest-profile-modal\" class=\"up-chat-profile-modal hidden\"><div class=\"up-chat-profile-dialog\"><img class=\"up-chat-profile-preview\" alt=\"Sua foto\"><div class=\"up-label\">Foto de perfil</div><input class=\"up-chat-profile-file\" type=\"file\" accept=\"image/png,image/jpeg,image/webp,image/gif\"><div class=\"up-chat-profile-message\"></div><div class=\"up-chat-profile-actions\"><button type=\"button\" class=\"up-chat-profile-cancel\">Cancelar</button><button type=\"button\" class=\"up-chat-profile-save\">Salvar foto</button></div></div></div>\n\n<script>\n(function(){\n'use strict';\nvar member='Lucca', token='', joinedAt=0, chatCache=[], profileCache={}, mediaBlobCache={}, chatReplyTo=null, chatContextMessageId=null, typingHeartbeat=null, typingStopTimer=null, mediaRecorder=null, recordingChunks=[], recordingTimer=null, recordingStartedAt=0, chatLastRenderKey='', heartbeatTimer=null;\nvar root=document.getElementById('guest-chat'), loginPanel=document.getElementById('guest-login'), shell=document.getElementById('guest-shell');\nvar list=root.querySelector('.up-chat-list'), input=root.querySelector('.up-chat-input'), sendBtn=root.querySelector('.up-chat-send');\nvar profileHover=document.querySelector('.up-chat-profile-hover'), readTooltip=document.querySelector('.up-chat-read-tooltip'), profileModal=document.getElementById('guest-profile-modal');\nvar members=['Ricardo','Lohan','Guilherme','Lucca'];\nfunction esc(s){return String(s==null?'':s).replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#039;'}[c]})}\nfunction fmtTime(x){return x?new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date(x)):''}\nfunction api(route,opts){opts=opts||{};var method=String(opts.method||'GET').toUpperCase();var target=route;if(method==='GET'){target+=(target.indexOf('?')>=0?'&':'?')+'_lucca_nc='+Date.now()+'_'+Math.random().toString(36).slice(2)}var base={credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'}};return fetch(target,Object.assign(base,opts)).then(async function(r){var d=await r.json().catch(function(){return {}});if(!r.ok)throw new Error(d.error||'Erro de comunicação.');return d;})}\nfunction profileFallback(){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"64\" height=\"64\"><rect width=\"64\" height=\"64\" rx=\"32\" fill=\"#273247\"/><circle cx=\"32\" cy=\"24\" r=\"11\" fill=\"#9aa8bc\"/><path d=\"M12 56c3-13 11-19 20-19s17 6 20 19\" fill=\"#9aa8bc\"/></svg>')}\nfunction loadBlob(route,key){key=key||route;if(mediaBlobCache[key])return Promise.resolve(mediaBlobCache[key]);return fetch(route,{credentials:'same-origin'}).then(function(r){if(!r.ok)throw new Error('Arquivo não encontrado.');return r.blob()}).then(function(b){var u=URL.createObjectURL(b);mediaBlobCache[key]=u;return u})}\nfunction hydrateAvatar(img,name){var route=profileCache[name];if(!route){img.src=profileFallback();return}loadBlob(route,'profile:'+name).then(function(u){img.src=u}).catch(function(){img.src=profileFallback()})}\nfunction showHover(img,name,e){if(!profileHover)return;profileHover.innerHTML='<div style=\"font-weight:800;margin-bottom:6px\">'+esc(name)+'</div><img style=\"width:84px;height:84px;border-radius:50%;object-fit:cover;background:#273247;border:2px solid #40506a;display:block;margin:auto\" src=\"'+esc(img.src||profileFallback())+'\">';profileHover.classList.add('show');positionHover(e);if(profileCache[name]&&!img.src)hydrateAvatar(profileHover.querySelector('img'),name)}\nfunction positionHover(e){if(!profileHover.classList.contains('show'))return;var w=profileHover.offsetWidth||150,h=profileHover.offsetHeight||130,x=(e.clientX||0)+14,y=(e.clientY||0)+14;if(x+w>innerWidth-12)x=(e.clientX||0)-w-14;if(y+h>innerHeight-12)y=(e.clientY||0)-h-14;profileHover.style.left=Math.max(12,x)+'px';profileHover.style.top=Math.max(12,y)+'px'}\nfunction hideHover(){profileHover.classList.remove('show');profileHover.innerHTML=''}\nfunction mentionState(){var value=input.value||'',caret=input.selectionStart==null?value.length:input.selectionStart,before=value.slice(0,caret),m=before.match(/(?:^|\\s)@([\\p{L}\\p{N}_-]*)$/u);if(!m)return null;var q=(m[1]||'').toLowerCase(),names=members.filter(function(n){return n.toLowerCase().indexOf(q)===0});if('todos'.indexOf(q)===0)names.unshift('__ALL__');return {names:names}}\nfunction applyMention(name){var value=input.value||'',caret=input.selectionStart==null?value.length:input.selectionStart,before=value.slice(0,caret),after=value.slice(caret),m=before.match(/(?:^|\\s)@([\\p{L}\\p{N}_-]*)$/u);if(!m)return;var mention=name==='__ALL__'?'todos':name,prefix=before.slice(0,before.length-(m[1]||'').length-1);input.value=prefix+'@'+mention+' '+after;var pos=(prefix+'@'+mention+' ').length;input.focus();input.setSelectionRange(pos,pos);var menu=root.querySelector('.up-mention-menu');if(menu)menu.classList.add('hidden')}\nfunction renderMentionMenu(){var menu=root.querySelector('.up-mention-menu'),state=mentionState();if(!state){menu.classList.add('hidden');menu.innerHTML='';return}menu.innerHTML=state.names.map(function(n){return n==='__ALL__'?'<button type=\"button\" class=\"up-mention-option up-mention-all\" data-name=\"__ALL__\">💬 <span>@todos</span></button>':'<button type=\"button\" class=\"up-mention-option\" data-name=\"'+esc(n)+'\">💬 <span>@'+esc(n)+'</span></button>'}).join('');menu.classList.remove('hidden');menu.querySelectorAll('.up-mention-option').forEach(function(b){b.onclick=function(){applyMention(b.getAttribute('data-name'))}})}\nfunction renderText(text){var safe=esc(text);members.forEach(function(name){var re=new RegExp('(^|[^\\w])(@'+name.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')+')(?![\\w])','gi');safe=safe.replace(re,'$1<span class=\"up-chat-mention\">$2</span>')});return safe}\nfunction replyPreview(m){if(!m.replyTo)return '';return '<div class=\"up-chat-reply-preview\"><b>'+esc(m.replyTo.user)+'</b><span>'+esc(m.replyTo.message||'Anexo')+'</span></div>'}\nfunction renderReactions(m){var r=m.reactions||{},parts=[];Object.keys(r).forEach(function(em){var a=Array.isArray(r[em])?r[em]:[];if(a.length)parts.push('<button type=\"button\" class=\"up-chat-reaction\" data-reaction=\"'+esc(em)+'\">'+em+' '+a.length+'</button>')});return parts.join('')}\nfunction renderChat(){var wasBottom=(list.scrollHeight-list.scrollTop-list.clientHeight)<28,oldTop=list.scrollTop;if(!chatCache.length){list.innerHTML='<div class=\"up-history-empty\">Nenhuma mensagem desde sua entrada.</div>';return}list.innerHTML=chatCache.map(function(m){var own=m.user===member,avatar='<img class=\"up-chat-avatar\" data-avatar-name=\"'+esc(m.user)+'\" alt=\"'+esc(m.user)+'\">';if(m.type==='system')return '<div class=\"up-chat-system-event '+(m.systemType==='lucca_join'?'join':(m.systemType==='chat_clear'?'clear':'leave'))+'\"><span>'+esc(m.message)+'</span></div>';var body='';if(m.imageUrl){if(m.type==='video')body='<video class=\"up-chat-media up-chat-media-video\" data-media-route=\"'+esc(m.imageUrl)+'\" controls preload=\"metadata\"></video>';else if(m.type==='audio')body='<audio class=\"up-chat-audio\" data-media-route=\"'+esc(m.imageUrl)+'\" controls preload=\"metadata\"></audio>';else body='<img class=\"up-chat-photo\" data-media-route=\"'+esc(m.imageUrl)+'\" alt=\"Imagem enviada por '+esc(m.user)+'\" loading=\"lazy\">'}else if(m.message)body='<div class=\"up-chat-text\">'+renderText(m.message)+'</div>';var bubble='<div class=\"up-chat-bubble\">'+replyPreview(m)+'<div class=\"up-chat-meta\"><b>'+esc(m.user)+'</b><span>'+fmtTime(m.createdAt)+'</span></div>'+body+'<div class=\"up-chat-reactions\">'+renderReactions(m)+'</div></div>';return '<div class=\"up-chat-item '+(own?'own ':'')+(m.user==='Lucca'?'lucca':'')+'\" data-message-id=\"'+esc(m.id)+'\">'+avatar+bubble+(own?'<button type=\"button\" class=\"up-delete-action hidden\">Excluir</button>':'')+'</div>'}).join('');list.querySelectorAll('[data-avatar-name]').forEach(function(img){var n=img.getAttribute('data-avatar-name');hydrateAvatar(img,n);img.addEventListener('mouseenter',function(e){showHover(img,n,e)});img.addEventListener('mousemove',positionHover);img.addEventListener('mouseleave',hideHover)});list.querySelectorAll('[data-media-route]').forEach(function(el){var route=el.getAttribute('data-media-route');loadBlob(route,'chat:'+route).then(function(u){el.src=u}).catch(function(){})});list.querySelectorAll('.up-chat-photo').forEach(function(img){img.addEventListener('click',function(){openChatLightbox(img.src);});});list.querySelectorAll('.up-chat-item').forEach(function(item){item.addEventListener('contextmenu',function(e){e.preventDefault();var id=item.getAttribute('data-message-id'),m=chatCache.find(function(x){return x.id===id});if(m)openContext(e,m)})});list.querySelectorAll('.up-chat-reaction').forEach(function(b){b.onclick=function(){toggleReaction(b.closest('.up-chat-item').getAttribute('data-message-id'),b.getAttribute('data-reaction'))}});list.querySelectorAll('.up-chat-item.own').forEach(function(item){var b=item.querySelector('.up-delete-action');b.onclick=function(e){e.stopPropagation();var id=item.getAttribute('data-message-id');if(!confirm('Excluir esta mensagem?'))return;api('/api/chat/'+encodeURIComponent(id),{method:'DELETE'}).then(loadChat).catch(showError)}});requestAnimationFrame(function(){list.scrollTop=list.scrollHeight})}\nfunction openChatLightbox(src){var box=root.querySelector('.up-chat-lightbox'),img=box&&box.querySelector('img');if(!box||!img)return;img.src=src;box.classList.remove('hidden')}\nfunction closeChatLightbox(){var box=root.querySelector('.up-chat-lightbox');if(box)box.classList.add('hidden')}\nfunction openContext(e,m){var menu=root.querySelector('.up-chat-context-menu'),canReply=m.user!==member,canDelete=m.user===member,quick=['😂','❤️','👍','😡','😮','👏'];chatContextMessageId=m.id;menu.innerHTML=(canReply?'<button type=\"button\" class=\"up-chat-context-action\" data-action=\"reply\">↩ Responder</button>':'')+(canDelete?'<button type=\"button\" class=\"up-chat-context-action up-chat-context-delete\" data-action=\"delete\">🗑 Excluir mensagem</button>':'')+'<div class=\"up-chat-context-reaction-row\">'+quick.map(function(em){return '<button type=\"button\" class=\"up-chat-reaction\" data-context-reaction=\"'+esc(em)+'\">'+em+'</button>'}).join('')+'</div>';menu.classList.add('show');menu.style.left=Math.min(innerWidth-menu.offsetWidth-8,Math.max(8,e.clientX||8))+'px';menu.style.top=Math.min(innerHeight-menu.offsetHeight-8,Math.max(8,e.clientY||8))+'px';var r=menu.querySelector('[data-action=\"reply\"]');if(r)r.onclick=function(){setReply(m);hideContext()};var d=menu.querySelector('[data-action=\"delete\"]');if(d)d.onclick=function(){hideContext();if(confirm('Excluir esta mensagem?'))api('/api/chat/'+encodeURIComponent(m.id),{method:'DELETE'}).then(loadChat).catch(showError)};menu.querySelectorAll('[data-context-reaction]').forEach(function(b){b.onclick=function(){toggleReaction(m.id,b.getAttribute('data-context-reaction'));hideContext()}})}\nfunction hideContext(){var menu=root.querySelector('.up-chat-context-menu');if(menu)menu.classList.remove('show');chatContextMessageId=null}\nfunction toggleReaction(id,emoji){api('/api/chat/reaction',{method:'POST',body:JSON.stringify({messageId:id,emoji:emoji})}).then(loadChat).catch(showError)}\nfunction setReply(m){chatReplyTo=m?{id:m.id,user:m.user,message:m.message||'Anexo'}:null;var bar=root.querySelector('.up-chat-reply-bar'),copy=bar.querySelector('.up-chat-reply-copy');if(chatReplyTo){copy.innerHTML='<b>Respondendo a '+esc(m.user)+'</b> '+esc(chatReplyTo.message.slice(0,120));bar.classList.remove('hidden')}else{bar.classList.add('hidden');copy.textContent=''}input.focus()}\nfunction setupEmoji(){var menu=root.querySelector('.up-chat-emoji-menu'),btn=root.querySelector('.up-chat-emoji-btn'),emojis='😀 😃 😄 😁 😆 😅 😂 🙂 🙃 😉 😊 😍 🥰 😘 😎 🤔 😐 😑 😶 🙄 😏 😴 🤣 😭 😡 🤯 😱 🤝 👍 👎 👌 ✌️ 🙏 👏 💪 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💯 🔥 🎉 🚀 ✅ ❌ ⭐ 🤡 🤖 👀 🫡'.split(' ');menu.innerHTML=emojis.map(function(e){return '<button type=\"button\" class=\"up-chat-emoji\" data-emoji=\"'+esc(e)+'\">'+e+'</button>'}).join('');btn.onclick=function(e){e.stopPropagation();menu.classList.toggle('hidden')};menu.querySelectorAll('.up-chat-emoji').forEach(function(b){b.onclick=function(e){e.preventDefault();e.stopPropagation();var v=input.value||'',p=input.selectionStart==null?v.length:input.selectionStart,em=b.getAttribute('data-emoji');input.value=v.slice(0,p)+em+v.slice(p);p+=em.length;input.focus();input.setSelectionRange(p,p)}});document.addEventListener('click',function(e){if(!menu.contains(e.target)&&e.target!==btn)menu.classList.add('hidden')})}\nfunction showError(e){var box=root.querySelector('.up-chat-list');if(box)box.insertAdjacentHTML('afterbegin','<div class=\"up-history-empty\">'+esc(e.message||'Erro')+'</div>')}\nfunction markRead(){var ids=chatCache.filter(function(m){return m.user!==member&&m.type!=='system'}).map(function(m){return m.id});if(!ids.length)return;api('/api/chat/read',{method:'POST',body:JSON.stringify({messageIds:ids})}).catch(function(){})}\nfunction loadChat(){return api('/api/chat').then(function(d){chatCache=d.messages||[];if(d.profiles)profileCache=d.profiles;hydrateAvatar(root.querySelector('.up-chat-profile-btn img'),member);var key=chatCache.map(function(m){return [m.id,m.createdAt,m.message,m.type,m.imageUrl,JSON.stringify(m.replyTo||null),JSON.stringify(m.reactions||{})].join('~')}).join('|');if(key!==chatLastRenderKey){chatLastRenderKey=key;renderChat()}updateTyping(d.typing||[]);markRead()}).catch(showError)}\nfunction updateTyping(names){var box=root.querySelector('.up-chat-typing'),active=(names||[]).filter(function(n){return n&&n!==member});if(!active.length){box.classList.add('hidden');box.innerHTML='';return}var shown=active.slice(0,2),first=shown[0],label=shown.join(' e ')+(active.length>2?' e mais alguém':'');box.innerHTML='<img class=\"up-chat-typing-avatar\" data-typing-avatar=\"'+esc(first)+'\"><div class=\"up-chat-typing-dots\"><i></i><i></i><i></i></div><span>'+esc(label)+' digitando</span>';box.classList.remove('hidden');hydrateAvatar(box.querySelector('img'),first)}\nfunction sendTyping(active){return api('/api/chat/typing',{method:'POST',body:JSON.stringify({typing:!!active})}).catch(function(){})}\nfunction stopTyping(){if(typingHeartbeat){clearInterval(typingHeartbeat);typingHeartbeat=null}if(typingStopTimer){clearTimeout(typingStopTimer);typingStopTimer=null}sendTyping(false)}\nfunction startTyping(){if(typingHeartbeat)return;sendTyping(true);typingHeartbeat=setInterval(function(){if(!String(input.value||'').trim()){stopTyping();return}sendTyping(true)},1500)}\nfunction sendChat(){var text=(input.value||'').trim();if(!text)return;sendBtn.disabled=true;api('/api/chat',{method:'POST',body:JSON.stringify({message:text,replyTo:chatReplyTo})}).then(function(){input.value='';chatReplyTo=null;setReply(null);stopTyping();return loadChat()}).catch(showError).finally(function(){sendBtn.disabled=false})}\nfunction fileToData(file){return new Promise(function(resolve,reject){if(!file)return reject(new Error('Nenhum arquivo selecionado.'));var ok=/^(image\\/(png|jpe?g|webp|gif)|video\\/(mp4|webm))$/i.test(file.type);if(!ok)return reject(new Error('Use PNG, JPG, WEBP, GIF, MP4 ou WEBM.'));var max=/^video\\//i.test(file.type)?25*1024*1024:5*1024*1024;if(file.size>max)return reject(new Error('O arquivo deve ter no máximo '+max/1024/1024+' MB.'));var r=new FileReader();r.onload=function(){resolve(String(r.result))};r.onerror=function(){reject(new Error('Não foi possível ler o arquivo.'))};r.readAsDataURL(file)})}\nfunction sendMedia(file){var b=root.querySelector('.up-chat-attach');b.disabled=true;fileToData(file).then(function(data){return api('/api/chat/image',{method:'POST',body:JSON.stringify({dataUrl:data})})}).then(function(r){return api('/api/chat',{method:'POST',body:JSON.stringify({message:'',imageUrl:r.imageUrl,type:r.type,replyTo:chatReplyTo})})}).then(function(){chatReplyTo=null;setReply(null);return loadChat()}).catch(showError).finally(function(){b.disabled=false})}\nfunction updateRec(active){var b=root.querySelector('.up-chat-record'),lab=root.querySelector('.up-chat-recording-label'),time=root.querySelector('.up-chat-recording-time');b.classList.toggle('recording',active);lab.classList.toggle('show',active);if(!active)time.textContent='0:00'}\nfunction finishRec(rec){try{rec.stream.getTracks().forEach(function(t){t.stop()})}catch(e){}clearInterval(recordingTimer);recordingTimer=null;mediaRecorder=null;updateRec(false)}\nfunction toggleRec(){var btn=root.querySelector('.up-chat-record');if(mediaRecorder&&mediaRecorder.state==='recording'){mediaRecorder.__send=true;try{mediaRecorder.requestData()}catch(e){}mediaRecorder.stop();return}if(!window.isSecureContext||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||typeof MediaRecorder==='undefined'){showError(new Error('A gravação de áudio precisa ser aberta pelo link HTTPS do Lucca.'));return}navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}}).then(function(stream){recordingChunks=[];recordingStartedAt=Date.now();var mime='';['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/mpeg'].some(function(x){if(MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(x)){mime=x;return true}return false});var rec=new MediaRecorder(stream,mime?{mimeType:mime,audioBitsPerSecond:128000}:{});mediaRecorder=rec;rec.__send=true;rec.ondataavailable=function(e){if(e.data&&e.data.size)recordingChunks.push(e.data)};rec.onerror=function(){finishRec(rec);showError(new Error('Não foi possível gravar o áudio.'))};rec.onstop=function(){var send=!!rec.__send,chunks=recordingChunks.slice();recordingChunks=[];finishRec(rec);if(!send||!chunks.length)return;var blob=new Blob(chunks,{type:rec.mimeType||mime||'audio/webm'});if(blob.size>5*1024*1024)return showError(new Error('O áudio ficou maior que 5 MB.'));var fr=new FileReader();fr.onload=function(){api('/api/chat/audio',{method:'POST',body:JSON.stringify({dataUrl:String(fr.result)})}).then(function(r){return api('/api/chat',{method:'POST',body:JSON.stringify({message:'',imageUrl:r.imageUrl,type:'audio',replyTo:chatReplyTo})})}).then(function(){chatReplyTo=null;setReply(null);return loadChat()}).catch(showError)};fr.readAsDataURL(blob)};rec.start(250);updateRec(true);recordingTimer=setInterval(function(){var e=Math.floor((Date.now()-recordingStartedAt)/1000);root.querySelector('.up-chat-recording-time').textContent='0:'+String(Math.min(e,30)).padStart(2,'0');if(e>=30){rec.__send=true;try{rec.stop()}catch(x){}}},250)}).catch(function(e){showError(new Error(e.name==='NotAllowedError'?'Permita o uso do microfone para gravar áudio.':'Não foi possível acessar o microfone.'))})}\nfunction openProfile(){var f=profileModal.querySelector('.up-chat-profile-file'),p=profileModal.querySelector('.up-chat-profile-preview');f.value='';p.src=profileFallback();hydrateAvatar(p,member);profileModal.classList.remove('hidden')}\nfunction closeProfile(){profileModal.classList.add('hidden')}\nfunction saveProfile(){var f=profileModal.querySelector('.up-chat-profile-file').files[0],msg=profileModal.querySelector('.up-chat-profile-message'),btn=profileModal.querySelector('.up-chat-profile-save');if(!f){msg.textContent='Escolha uma foto.';return}btn.disabled=true;fileToData(f).then(function(data){return api('/api/profile/avatar',{method:'POST',body:JSON.stringify({dataUrl:data})})}).then(function(r){profileCache[member]=r.avatarUrl;return loadChat()}).then(closeProfile).catch(function(e){msg.textContent=e.message}).finally(function(){btn.disabled=false})}\nfunction login(){var password=document.getElementById('guest-password').value,box=document.getElementById('guest-login-msg');box.textContent='Entrando…';api('/api/lucca/login',{method:'POST',body:JSON.stringify({password:password})}).then(function(d){joinedAt=Date.parse(d.joinedAt)||Date.now();chatCache=[];chatLastRenderKey='';list.innerHTML='';loginPanel.classList.add('hidden');shell.classList.remove('hidden');startHeartbeat();loadChat()}).catch(function(e){box.textContent=e.message})}\nfunction startHeartbeat(){if(heartbeatTimer)clearInterval(heartbeatTimer);heartbeatTimer=setInterval(function(){api('/api/lucca/heartbeat',{method:'POST',body:'{}'}).catch(function(){})},5000)}\nfunction logout(){stopTyping();if(heartbeatTimer)clearInterval(heartbeatTimer);heartbeatTimer=null;api('/api/lucca/logout',{method:'POST',body:'{}'}).finally(function(){location.reload()})}\nroot.querySelector('.up-chat-profile-btn').onclick=openProfile;root.querySelector('.up-chat-profile-btn').addEventListener('mouseenter',function(e){showHover(root.querySelector('.up-chat-profile-btn img'),member,e)});root.querySelector('.up-chat-profile-btn').addEventListener('mousemove',positionHover);root.querySelector('.up-chat-profile-btn').addEventListener('mouseleave',hideHover);root.querySelector('.guest-exit').onclick=logout;root.querySelector('.up-chat-send').onclick=sendChat;root.querySelector('.up-chat-attach').onclick=function(){root.querySelector('.up-chat-file').click()};root.querySelector('.up-chat-file').onchange=function(){if(this.files[0])sendMedia(this.files[0]);this.value=''};root.querySelector('.up-chat-record').onclick=toggleRec;root.querySelector('.up-chat-reply-close').onclick=function(){setReply(null)};input.addEventListener('input',function(){renderMentionMenu();if(input.value.trim())startTyping();else stopTyping()});input.addEventListener('click',renderMentionMenu);input.addEventListener('keydown',function(e){if(e.key==='Escape'){root.querySelector('.up-mention-menu').classList.add('hidden')}if(e.key==='Enter'&&!e.shiftKey){var menu=root.querySelector('.up-mention-menu');if(menu&&!menu.classList.contains('hidden')){var first=menu.querySelector('.up-mention-option');if(first){e.preventDefault();applyMention(first.getAttribute('data-name'));return}}e.preventDefault();sendChat()}});document.addEventListener('click',function(e){if(!root.querySelector('.up-chat-context-menu').contains(e.target))hideContext()});profileModal.querySelector('.up-chat-profile-cancel').onclick=closeProfile;profileModal.querySelector('.up-chat-profile-save').onclick=saveProfile;profileModal.querySelector('.up-chat-profile-file').onchange=function(){var f=this.files[0],msg=profileModal.querySelector('.up-chat-profile-message');if(f&&(!/^image\\/(png|jpe?g|webp|gif)$/i.test(f.type)||f.size>2*1024*1024))msg.textContent='Use PNG, JPG, WEBP ou GIF, até 2 MB.'};var lightbox=root.querySelector('.up-chat-lightbox');if(lightbox){lightbox.querySelector('.up-chat-lightbox-close').onclick=closeChatLightbox;lightbox.onclick=function(e){if(e.target===lightbox)closeChatLightbox();}}document.addEventListener('keydown',function(e){if(e.key==='Escape')closeChatLightbox()});setupEmoji();\nsetInterval(function(){if(!shell.classList.contains('hidden')){loadChat()}},2000);setInterval(function(){if(!shell.classList.contains('hidden'))api('/api/chat/typing').then(function(d){updateTyping(d.typing||[])}).catch(function(){})},1000);\ndocument.getElementById('guest-enter').onclick=login;document.getElementById('guest-password').addEventListener('keydown',function(e){if(e.key==='Enter')login()});\nwindow.addEventListener('beforeunload',function(){try{navigator.sendBeacon('/api/lucca/logout',new Blob(['{}'],{type:'application/json'}))}catch(e){}});\napi('/api/lucca/me').then(function(d){if(d.authenticated){joinedAt=Date.parse(d.joinedAt)||Date.now();chatCache=[];chatLastRenderKey='';list.innerHTML='';loginPanel.classList.add('hidden');shell.classList.remove('hidden');startHeartbeat();loadChat()}}).catch(function(){});\n})();\n</script>\n</body>\n</html>\n";
      return new Response(html,{status:200,headers:{
        "content-type":"text/html",
        "cache-control":"no-store",
        "content-disposition":"inline"
      }});
    }
    if(path.startsWith("/api/lucca/"))return await luccaRoute(req);
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
    if(path.startsWith("/api/chat/")&&req.method==="PATCH")return await editRoute(req,name,path.slice("/api/chat/".length));
    if(path.startsWith("/api/chat/")&&req.method==="DELETE")return await deleteRoute(name,path.slice("/api/chat/".length));
    if(path==="/api/profiles")return await profileRoute(req,name);
    if(path==="/api/profile/avatar"&&req.method==="POST")return await profileRoute(req,name);
    if(path==="/api/chat/image"&&req.method==="POST")return await mediaRoute(req,"image");
    if(path==="/api/chat/audio"&&req.method==="POST")return await mediaRoute(req,"audio");
    if(path==="/api/chat/file"&&req.method==="POST")return await mediaRoute(req,"file");
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