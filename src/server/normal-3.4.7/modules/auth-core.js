export function createAuthCore({ db, sessionCache, token, tokenHash, randomBytes, response, readBody, passwordHash, checkPassword }) {
  async function userFromToken(req){
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
  async function account(name){
    const {data,error}=await db.from("users").select("name,password_hash,role,status,reason,updated_at,sync").eq("name",name).maybeSingle();
    if(error)throw error;
    return data;
  }
  async function admin(name){
    if(!name)return false;
    const a=await account(name);
    return a?.role==="implementation_admin";
  }
  async function createSession(name,knownAccount){
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
  async function login(req,setup){
    const p=await readBody(req);
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
  return { userFromToken, account, admin, createSession, login };
}
