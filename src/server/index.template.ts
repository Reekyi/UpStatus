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
async function contextName(req:Request) {
  const name=await userFromToken(req);
  if(!name||!["Ricardo","Lohan","Guilherme"].includes(name))return null;
  return {name,guest:false,joinedAt:0};
}
async function account(name:string){
  if(!["Ricardo","Lohan","Guilherme"].includes(name))return null;
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
  const allowed=new Set(["Ricardo","Lohan","Guilherme"]);
  const out=(data||[]).filter((x:any)=>allowed.has(String(x.name))).map((x:any)=>({name:String(x.name)}));
  membersCache={at:now,data:out};
  return out;
}
async function healthRoute(req:Request,name:string){
  if(req.method!=="GET")return response({error:"Método não permitido."},405);
  if(!["Ricardo","Lohan","Guilherme"].includes(name))return response({error:"Seu perfil não possui acesso à saúde do sistema."},403);
  const started=Date.now();
  const dbStarted=Date.now();
  const usersQ=await db.from("users").select("name,status,reason,client_version,client_seen_at").in("name",["Ricardo","Lohan","Guilherme"]).order("name");
  const dbOk=!usersQ.error;
  const dbMs=Date.now()-dbStarted;

  const chatStarted=Date.now();
  const chatQ=await db.from("messages").select("id").limit(1);
  const chatOk=!chatQ.error;
  const chatMs=Date.now()-chatStarted;

  const stateStarted=Date.now();
  const stateQ=await db.from("upstatus_state").select("state_key").in("state_key",["remote-status"]);
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
    const {data,error}=await db.from("users").select("name,status,reason,updated_at,sync,client_version,client_seen_at").in("name",["Ricardo","Lohan","Guilherme"]).order("name");
    if(error)throw error;
    const members:Record<string,unknown>={};
    const nowMs=Date.now();
    for(const x of data||[]){
      const seen=x.client_seen_at?Date.parse(x.client_seen_at):0;
      members[x.name]={name:x.name,status:x.status||"offline",reason:x.reason||"",updatedAt:x.updated_at||null,sync:x.sync||"not_configured",version:x.client_version||"",seenAt:x.client_seen_at||null,connected:!!seen&&nowMs-seen<15000};
    }
    return response({members});
  }
  const p:any=await readBody(req);
  if(p.confirmedBySaleSmartly!==true)return response({error:"Status não alterado: o Sale Smartly ainda não confirmou a mudança."},409);
  const status=String(p.status||""),source=String(p.source||"manual");
  const reason=status==="online"?"":String(p.reason||"").trim();
  if(!["online","busy","away"].includes(status))return response({error:"Status inválido."},400);
  if(!["manual","salesmartly","agenda"].includes(source))return response({error:"Origem de alteração inválida."},400);
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
  const runtime:any=await stateValue(AGENDA_RUNTIME_KEY,{});
  const current=runtime[name];
  if(source==="agenda"){
    if(current&&current.pending){
      if(current.pendingAction==="restore")delete runtime[name];
      else{
        current.pending=false;current.pendingAction="";current.pendingAt=0;
        current.appliedStatus=status;current.appliedReason=reason;current.appliedAt=now;
        runtime[name]=current;
      }
    }
  }else{
    const config:any=await stateValue(AGENDA_CONFIG_KEY,{days:{},weeks:{}});
    const event=agendaCurrentEvent(name,config);
    const activeKey=current?.activeKey||event?.key||"";
    if(activeKey){
      runtime[name]=Object.assign({},current||{date:event?.date||saoPauloParts().date,activeKey},{
        activeKey,overrideKey:activeKey,pending:false,pendingAction:"",pendingAt:0,manualAt:now
      });
    }
  }
  await setState(AGENDA_RUNTIME_KEY,runtime);
  return response({name,status,reason,updatedAt:now,sync:old.sync||"not_configured",version:VERSION,source});
}

async function historyRoute(req:Request,name:string){
  if(!(await admin(name)))return response({error:"Seu perfil não possui acesso ao histórico."},403);
  const limit=Math.min(Math.max(Number(new URL(req.url).searchParams.get("limit")||100),1),500);
  const {data,error}=await db.from("status_history").select("user_name,actor,target,status,reason,created_at").in("user_name",["Ricardo","Lohan","Guilherme"]).in("actor",["Ricardo","Lohan","Guilherme"]).order("created_at",{ascending:false}).limit(limit);
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
async function chatRows(name:string,since?:string,sessionStartedAt?:number){
  const cutoff=new Date(Date.now()-48*60*60*1000).toISOString();
  let query=db.from("messages").select("id,user_name,message,type,system_type,created_at,edited_at,image_url,file_name,mentions,reply_to,reactions").gte("created_at",cutoff);
  if(sessionStartedAt&&Number.isFinite(sessionStartedAt)&&sessionStartedAt>0)query=query.gte("created_at",new Date(Math.max(sessionStartedAt,Date.parse(cutoff))).toISOString());
  if(since)query=query.gt("created_at",since);
  const {data,error}=await query.order("created_at",{ascending:true}).limit(since?200:1000);
  if(error)throw error;
  return (data||[]).filter((m:any)=>["Ricardo","Lohan","Guilherme","Sistema"].includes(String(m.user_name))).map((m:any)=>({
    id:String(m.id),user:m.user_name,message:m.message||"",type:m.type||"text",systemType:m.system_type||"",
    createdAt:m.created_at,imageUrl:m.image_url||"",fileName:m.file_name||"",mentions:Array.isArray(m.mentions)?m.mentions:[],
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

const AGENDA_MEMBERS=["Ricardo","Guilherme","Lohan"];
const AGENDA_DAYS=["Mon","Tue","Wed","Thu","Fri"];
const AGENDA_TRAINING_SLOTS=["10","11","15","16"];
const AGENDA_CONFIG_KEY="team-agenda-v1";
const AGENDA_RUNTIME_KEY="team-agenda-runtime-v1";
function saoPauloParts(date=new Date()){
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit",weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date);
  const get=(type:string)=>parts.find((x:any)=>x.type===type)?.value||"";
  return {date:get("year")+"-"+get("month")+"-"+get("day"),weekday:get("weekday"),hour:Number(get("hour")),minute:Number(get("minute"))};
}
function agendaWeekStart(dateKey:string){
  const d=new Date(dateKey+"T12:00:00Z"),day=d.getUTCDay(),offset=(day+6)%7;
  d.setUTCDate(d.getUTCDate()-offset);
  return d.toISOString().slice(0,10);
}
function agendaCurrentEvent(name:string,config:any,now=new Date()){
  const p=saoPauloParts(now),day=Number(p.hour)*60+Number(p.minute);
  if(!AGENDA_DAYS.includes(p.weekday))return null;
  if(day>=18*60)return {key:p.date+":end",date:p.date,kind:"end",status:"away",reason:"Fim do expediente"};
  const daily=(config&&config.days&&config.days[p.date])||{};
  const lunch=daily.lunch||{},training=daily.training||{};
  const lunchTime=String(lunch[name]||"");
  if((lunchTime==="12"&&day>=12*60&&day<13*60)||(lunchTime==="13"&&day>=13*60&&day<14*60))
    return {key:p.date+":lunch",date:p.date,kind:"pause",status:"busy",reason:"Almoçando"};
  const week=agendaWeekStart(p.date);
  const weeklyOwner=String((config&&config.weeks&&config.weeks[week])||"");
  const aulao=weeklyOwner===name&&day>=15*60&&day<17*60;
  const fixed=AGENDA_TRAINING_SLOTS.some((slot)=>{
    const start=Number(slot)*60;
    return String(training[slot]||"")===name&&day>=start&&day<start+60;
  });
  if(aulao||fixed)return {key:p.date+":training",date:p.date,kind:"pause",status:"busy",reason:"Em treinamento"};
  return null;
}
async function agendaView(name:string){
  const config:any=await stateValue(AGENDA_CONFIG_KEY,{days:{},weeks:{}});
  const p=saoPauloParts(),weekStart=agendaWeekStart(p.date),daily=(config.days&&config.days[p.date])||{};
  const lunch=daily.lunch||{},savedTraining=daily.training||{},training:any={};
  for(const slot of AGENDA_TRAINING_SLOTS)training[slot]=String(savedTraining[slot]||"");
  const normalizedLunch:any={};
  for(const who of AGENDA_MEMBERS)normalizedLunch[who]=["12","13"].includes(String(lunch[who]||""))?String(lunch[who]):"";
  return {date:p.date,weekStart,lunch:normalizedLunch,training,aulaoOwner:AGENDA_MEMBERS.includes(String((config.weeks||{})[weekStart]||""))?String(config.weeks[weekStart]):"",canEditTeam:await admin(name)};
}
async function agendaRoute(req:Request,name:string){
  if(req.method==="GET")return response(await agendaView(name));
  if(req.method!=="POST")return response({error:"Método não permitido."},405);
  const p:any=await readBody(req),type=String(p.type||"");
  const config:any=await stateValue(AGENDA_CONFIG_KEY,{days:{},weeks:{}});
  config.days=config.days||{};config.weeks=config.weeks||{};
  const parts=saoPauloParts(),weekStart=agendaWeekStart(parts.date);
  if(type==="lunch"){
    const value=String(p.time||"");
    if(value!==""&&value!=="12"&&value!=="13")return response({error:"Horário de almoço inválido."},400);
    const day=config.days[parts.date]||{};
    day.lunch=day.lunch||{};day.lunch[name]=value;config.days[parts.date]=day;
  }else if(type==="training"){
    if(!(await admin(name)))return response({error:"Somente Ricardo pode definir os treinamentos."},403);
    const slot=String(p.slot||""),owner=String(p.owner||"");
    if(!AGENDA_TRAINING_SLOTS.includes(slot))return response({error:"Horário de treinamento inválido."},400);
    if(owner!==""&&!AGENDA_MEMBERS.includes(owner))return response({error:"Responsável inválido."},400);
    const day=config.days[parts.date]||{};
    day.training=day.training||{};day.training[slot]=owner;config.days[parts.date]=day;
  }else if(type==="aulao"){
    if(!(await admin(name)))return response({error:"Somente Ricardo pode definir o responsável pelo aulão."},403);
    const owner=String(p.owner||"");
    if(owner!==""&&!AGENDA_MEMBERS.includes(owner))return response({error:"Responsável inválido."},400);
    config.weeks[weekStart]=owner;
  }else return response({error:"Tipo de configuração inválido."},400);
  await setState(AGENDA_CONFIG_KEY,config);
  return response({ok:true,agenda:await agendaView(name)});
}
async function agendaMarkManualOverride(name:string){
  const config:any=await stateValue(AGENDA_CONFIG_KEY,{days:{},weeks:{}});
  const runtime:any=await stateValue(AGENDA_RUNTIME_KEY,{});
  const event=agendaCurrentEvent(name,config);
  const current=runtime[name]||{};
  if(event||current.activeKey){
    current.date=current.date||event?.date||saoPauloParts().date;
    current.activeKey=current.activeKey||event?.key||"";
    current.overrideKey=current.activeKey;
    current.pending=false;
    current.pendingAction="";
    runtime[name]=current;
    await setState(AGENDA_RUNTIME_KEY,runtime);
  }
}
async function agendaReconcileRoute(req:Request,name:string){
  const p:any=await readBody(req),actualStatus=String(p.status||""),actualReason=String(p.reason||"");
  if(!["online","busy","away"].includes(actualStatus))return response({error:"Status atual inválido."},400);
  const config:any=await stateValue(AGENDA_CONFIG_KEY,{days:{},weeks:{}});
  const runtime:any=await stateValue(AGENDA_RUNTIME_KEY,{});
  let state:any=runtime[name]||null;
  const now=Date.now(),parts=saoPauloParts(),event=agendaCurrentEvent(name,config);
  const noAction=async()=>{if(state)runtime[name]=state;else delete runtime[name];await setState(AGENDA_RUNTIME_KEY,runtime);return response({action:null});};
  const issue=async(status:string,reason:string,eventKey:string,kind:string)=>{
    state=state||{date:parts.date,activeKey:eventKey,kind:kind,restoreStatus:actualStatus,restoreReason:actualReason,overrideKey:""};
    state.date=parts.date;state.activeKey=eventKey;state.kind=kind;state.pending=true;state.pendingAction=status==="online"?"restore":kind;state.pendingStatus=status;state.pendingReason=reason;state.pendingAt=now;
    runtime[name]=state;await setState(AGENDA_RUNTIME_KEY,runtime);
    return response({action:{status,reason,eventKey}});
  };
  if(event){
    if(state&&state.date!==parts.date){delete runtime[name];state=null;}
    if(state&&state.overrideKey===event.key)return noAction();
    if(event.kind==="end"){
      if(!state||state.kind!=="end"||state.activeKey!==event.key)state={date:parts.date,activeKey:event.key,kind:"end",restoreStatus:"",restoreReason:"",overrideKey:"",pending:false};
      if(state.pending&&now-Number(state.pendingAt||0)<20000)return response({action:null});
      if(actualStatus==="away"&&actualReason===event.reason){state.pending=false;state.pendingAction="";state.pendingStatus="away";state.pendingReason=event.reason;runtime[name]=state;return noAction();}
      return issue("away",event.reason,event.key,"end");
    }
    if(state&&state.kind==="end"){delete runtime[name];state=null;}
    if(state&&state.overrideKey===event.key)return noAction();
    if(!state||state.kind!=="pause"){
      if(actualStatus!=="online"){
        state={date:parts.date,activeKey:event.key,kind:"pause",restoreStatus:"online",restoreReason:"",overrideKey:event.key,pending:false};
        return noAction();
      }
      state={date:parts.date,activeKey:event.key,kind:"pause",restoreStatus:"online",restoreReason:"",appliedStatus:"busy",appliedReason:event.reason,overrideKey:"",pending:false};
    }else state.activeKey=event.key;
    if(state.pending&&now-Number(state.pendingAt||0)<20000)return response({action:null});
    if(actualStatus==="busy"&&actualReason===event.reason){
      state.pending=false;state.pendingAction="";state.appliedStatus="busy";state.appliedReason=event.reason;runtime[name]=state;return noAction();
    }
    if(actualStatus!==String(state.appliedStatus||"busy")&&actualStatus!=="online"){
      state.overrideKey=event.key;state.pending=false;state.pendingAction="";return noAction();
    }
    return issue("busy",event.reason,event.key,"pause");
  }
  if(!state)return response({action:null});
  if(state.date!==parts.date||state.kind==="end"){
    delete runtime[name];await setState(AGENDA_RUNTIME_KEY,runtime);return response({action:null});
  }
  if(state.overrideKey===state.activeKey){
    delete runtime[name];await setState(AGENDA_RUNTIME_KEY,runtime);return response({action:null});
  }
  if(state.pending&&now-Number(state.pendingAt||0)<20000)return response({action:null});
  if(actualStatus===String(state.appliedStatus||"busy")&&actualReason===String(state.appliedReason||"")){
    return issue(String(state.restoreStatus||"online"),String(state.restoreReason||""),state.activeKey,"restore");
  }
  delete runtime[name];await setState(AGENDA_RUNTIME_KEY,runtime);return response({action:null});
}
async function agendaReconcileFailRoute(req:Request,name:string){
  const p:any=await readBody(req),runtime:any=await stateValue(AGENDA_RUNTIME_KEY,{});
  const state=runtime[name];
  if(state&&state.activeKey===String(p.eventKey||"")){
    state.pending=false;state.pendingAction="";state.pendingAt=0;runtime[name]=state;
    await setState(AGENDA_RUNTIME_KEY,runtime);
  }
  return response({ok:true});
}

async function profileMap() {
  const {data,error}=await db.from("upstatus_profiles").select("user_name,avatar_url").in("user_name",["Ricardo","Lohan","Guilherme"]);
  if(error)throw error;
  const out:Record<string,string>={};
  for(const x of data||[])if(x.avatar_url&&["Ricardo","Lohan","Guilherme"].includes(String(x.user_name)))out[x.user_name]=x.avatar_url;
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
  return ({ "image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif","application/pdf":"pdf","application/msword":"doc","application/vnd.openxmlformats-officedocument.wordprocessingml.document":"docx","application/vnd.ms-excel":"xls","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":"xlsx","text/csv":"csv","application/vnd.ms-powerpoint":"ppt","application/vnd.openxmlformats-officedocument.presentationml.presentation":"pptx","text/plain":"txt","text/rtf":"rtf","application/rtf":"rtf","video/mp4":"mp4","video/webm":"webm","audio/webm":"webm","audio/ogg":"ogg","audio/mp4":"m4a","audio/mpeg":"mp3","audio/wav":"wav","audio/x-wav":"wav","audio/x-m4a":"m4a" } as Record<string,string>)[mime]||"";
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
async function chatRoute(req:Request,name:string,sessionStartedAt=0){
  if(req.method==="GET"){
    const url=new URL(req.url);
    const fast=url.searchParams.get("fast")==="1";
    const sinceRaw=url.searchParams.get("since")||"";
    const since=sinceRaw?new Date(sinceRaw):null;
    if(fast){
      const effectiveSince=since&&!Number.isNaN(since.getTime())?new Date(since.getTime()-2000).toISOString():"";
      const cutoffTyping=new Date(Date.now()-4500).toISOString();
      const cutoff=new Date(Date.now()-48*60*60*1000).toISOString();
      const [messages,profileRes,typingRes,readRes]=await Promise.all([
        chatRows(name,effectiveSince,sessionStartedAt),
        db.from("upstatus_profiles").select("user_name,avatar_url").in("user_name",["Ricardo","Lohan","Guilherme"]),
        db.from("upstatus_typing").select("user_name").in("user_name",["Ricardo","Lohan","Guilherme"]).gt("last_seen_at",cutoffTyping).neq("user_name",name),

        db.from("chat_reads").select("last_read_at").eq("user_name",name).maybeSingle()
      ]);
      const lastReadAt=(readRes.data as any)?.last_read_at||cutoff;
      const unreadQuery=db.from("messages").select("id",{count:"exact",head:true})
        .gte("created_at",cutoff).gt("created_at",lastReadAt)
        .in("user_name",["Ricardo","Lohan","Guilherme"]).neq("user_name",name).neq("type","system");
      const {count:unreadCount,error:unreadError}=await unreadQuery;
      if(unreadError)throw unreadError;
      const profileMap:Record<string,string>={};
      for(const p of profileRes.data||[])if(p.avatar_url)profileMap[p.user_name]=p.avatar_url;
      return response({messages,unreadCount:unreadCount||0,profiles:profileMap,typing:(typingRes.data||[]).map((x:any)=>x.user_name)});
    }
    const cutoffTyping=new Date(Date.now()-4500).toISOString();
    const [messages,readRes,profileRes,typingRes]=await Promise.all([
      chatRows(name,undefined,sessionStartedAt),
      db.from("chat_reads").select("user_name,last_read_at,messages").in("user_name",["Ricardo","Lohan","Guilherme"]),
      db.from("upstatus_profiles").select("user_name,avatar_url").in("user_name",["Ricardo","Lohan","Guilherme"]),
      db.from("upstatus_typing").select("user_name").in("user_name",["Ricardo","Lohan","Guilherme"]).gt("last_seen_at",cutoffTyping).neq("user_name",name),

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
    return response({messages,unreadCount,profiles:profileMap,typing:(typingRes.data||[]).map((x:any)=>x.user_name)});
  }
  const p:any=await readBody(req);
  const message=String(p.message||"").trim();
  const imageUrl=String(p.imageUrl||"").trim();
  const fileName=String(p.fileName||"").trim().slice(0,255);
  const type=p.type==="document"?"document":p.type==="video"?"video":p.type==="audio"?"audio":imageUrl?"image":"text";
  if(!message&&!imageUrl)return response({error:"Digite uma mensagem ou envie um arquivo."},400);
  if(message.length>1000)return response({error:"A mensagem deve ter no máximo 1000 caracteres."},400);
  let replyTo:any=null;
  if(p.replyTo?.id){
    const rows=await chatRows(name,undefined,sessionStartedAt);
    const hit=rows.find((x:any)=>x.id===String(p.replyTo.id));
    if(hit)replyTo={id:hit.id,user:hit.user,message:hit.message,type:hit.type,imageUrl:hit.imageUrl};
  }
  const id=randomBytes(8).toString("hex");
  const createdAt=new Date().toISOString();
  const mentionList=await mentions(message);
  const {error}=await db.from("messages").insert({
    id,user_name:name,message,type,system_type:"",
    created_at:createdAt,image_url:imageUrl,file_name:type==="document"&&fileName?fileName:null,mentions:mentionList,reply_to:replyTo,reactions:{}
  });
  if(error)throw error;
  return response({ok:true,message:{id,user:name,user_name:name,message,type,systemType:"",system_type:"",createdAt,imageUrl,image_url:imageUrl,fileName:type==="document"?fileName:"",file_name:type==="document"?fileName:"",mentions:mentionList,replyTo,reactions:{},readBy:[]}});
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
    const {data}=await db.from("upstatus_typing").select("user_name").in("user_name",["Ricardo","Lohan","Guilherme"]).gt("last_seen_at",cutoff).neq("user_name",name);
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
  const isAdmin=await admin(name);
  if(data.user_name!==name&&!isAdmin)return response({error:"Você só pode excluir suas próprias mensagens."},403);
  const {error}=await db.from("messages").delete().eq("id",id);if(error)throw error;
  return response({ok:true,id,deletedByAdmin:data.user_name!==name});
}

async function profileRoute(req:Request,name:string) {
  if(req.method==="GET") return response({profiles:await profileMap()});
  const p:any=await readBody(req);
  const saved=await uploadFile("profile-images",String(p.dataUrl||""),2*1024*1024,new Set(["image/png","image/jpeg","image/webp","image/gif"]));
  await db.from("upstatus_profiles").upsert({user_name:name,avatar_url:saved.url,updated_at:new Date().toISOString()},{onConflict:"user_name"});
  return response({ok:true,avatarUrl:saved.url});
}
async function mediaRoute(req:Request,kind:"image"|"audio"|"document") {
  const p:any=await readBody(req);
  const max=kind==="audio"?5*1024*1024:kind==="document"?10*1024*1024:25*1024*1024;
  const allowed=kind==="audio"?new Set(["audio/webm","audio/ogg","audio/mp4","audio/mpeg","audio/wav","audio/x-wav","audio/x-m4a"]):kind==="document"?new Set(["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","text/csv","application/vnd.ms-powerpoint","application/vnd.openxmlformats-officedocument.presentationml.presentation","text/plain","text/rtf","application/rtf"]):new Set(["image/png","image/jpeg","image/webp","image/gif","video/mp4","video/webm"]);
  const saved=await uploadFile("chat-images",String(p.dataUrl||""),max,allowed);
  return response({ok:true,imageUrl:saved.url,type:saved.mime.startsWith("video/")?"video":kind});
}

async function chatUploadUrlRoute(req:Request) {
  const p:any=await readBody(req);
  const mime=String(p.mime||"").toLowerCase();
  const size=Number(p.size);
  const allowed=new Set(["image/png","image/jpeg","image/webp","image/gif","video/mp4","video/webm"]);
  if(!allowed.has(mime))return response({error:"Tipo de arquivo não suportado."},400);
  if(!Number.isSafeInteger(size)||size<=0)return response({error:"Tamanho de arquivo inválido."},400);
  if(size>20*1024*1024)return response({error:"O arquivo deve ter no máximo 20 MB."},413);
  const extension=ext(mime);
  if(!extension)return response({error:"Tipo de arquivo não suportado."},400);
  const bucket="chat-images";
  const path=Date.now()+"-"+randomBytes(6).toString("hex")+"."+extension;
  const {data,error}=await db.storage.from(bucket).createSignedUploadUrl(path);
  if(error)throw error;
  const uploadUrl=new URL(data.signedUrl,PROJECT_URL).toString();
  const publicUrl=db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  return response({ok:true,uploadUrl,signedUrl:uploadUrl,token:data.token,publicUrl,path,bucket,mime});
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
    if(path==="/api/account"&&req.method==="GET"){
      const name=new URL(req.url).searchParams.get("name")||"";
      const a=await account(name);
      return response({needsSetup:!!a&&!a.password_hash});
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
    if(path==="/api/agenda")return await agendaRoute(req,name);
    if(path==="/api/agenda/reconcile"&&req.method==="POST")return await agendaReconcileRoute(req,name);
    if(path==="/api/agenda/reconcile/fail"&&req.method==="POST")return await agendaReconcileFailRoute(req,name);
    if(path==="/api/status")return await statusRoute(req,name);
    if(path==="/api/history")return await historyRoute(req,name);
    if(path==="/api/chat")return await chatRoute(req,name,ctx.guest?ctx.joinedAt:0);
    if(path==="/api/chat/read"&&req.method==="POST")return await readRoute(req,name);
    if(path==="/api/chat/typing")return await typingRoute(req,name);
    if(path==="/api/chat/reaction"&&req.method==="POST")return await reactionRoute(req,name);
    if(path.startsWith("/api/chat/")&&req.method==="PATCH")return await editRoute(req,name,path.slice("/api/chat/".length));
    if(path.startsWith("/api/chat/")&&req.method==="DELETE")return await deleteRoute(name,path.slice("/api/chat/".length));
    if(path==="/api/profiles")return await profileRoute(req,name);
    if(path==="/api/profile/avatar"&&req.method==="POST")return await profileRoute(req,name);
    if(path==="/api/chat/upload-url"&&req.method==="POST")return await chatUploadUrlRoute(req);
    if(path==="/api/chat/image"&&req.method==="POST")return await mediaRoute(req,"image");
    if(path==="/api/chat/document"&&req.method==="POST")return await mediaRoute(req,"document");
    if(path==="/api/chat/audio"&&req.method==="POST")return await mediaRoute(req,"audio");
    if(path.startsWith("/api/remote-status"))return await remoteRoute(req,name);
    if(path==="/api/chat/clear"&&req.method==="POST"){
      if(name!=="Ricardo")return response({error:"Somente Ricardo pode limpar o chat."},403);
      const {data:oldMessages,error:readError}=await db.from("messages").select("image_url").gte("created_at","1970-01-01");
      if(readError)throw readError;
      const prefix=PROJECT_URL+"/storage/v1/object/public/chat-images/";
      const objectPaths=Array.from(new Set((oldMessages||[]).map((m:any)=>String(m.image_url||"")).filter((url:string)=>url.startsWith(prefix)).map((url:string)=>decodeURIComponent(url.slice(prefix.length).split("?")[0])).filter((p:string)=>p&&!p.includes("..")&&!p.startsWith("/"))));
      const {error}=await db.from("messages").delete().gte("created_at","1970-01-01");
      if(error)throw error;
      let removedFiles=0;
      for(let i=0;i<objectPaths.length;i+=100){
        const batch=objectPaths.slice(i,i+100);
        const {error:removeError}=await db.storage.from("chat-images").remove(batch);
        if(removeError)console.error("Chat media cleanup failed",removeError);
        else removedFiles+=batch.length;
      }
      await db.from("messages").insert({id:randomBytes(8).toString("hex"),user_name:"Sistema",message:"🧹 Ricardo limpou o chat.",type:"system",system_type:"chat_clear",created_at:new Date().toISOString(),image_url:"",mentions:[],reply_to:null,reactions:{}});
      return response({ok:true,removedFiles});
    }
    return response({error:"Não encontrado."},404);
  }catch(e){
    console.error(e);
    return response({error:e instanceof Error?e.message:"Erro interno."},500);
  }
});