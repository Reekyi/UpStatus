#!/usr/bin/env node
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const product = String(process.argv[2] || "normal").toLowerCase();
const config = product === "team-lite"
  ? { server: "src/server/team-lite-index.template.ts", client: "team-lite/upstatus-team-lite.user.js" }
  : product === "normal"
    ? { server: "src/server/index.template.ts", client: "src/userscript/upstatus.user.template.js" }
    : null;
assert.ok(config, "usage: node scripts/auth-enrollment.test.mjs normal|team-lite");

const server = fs.readFileSync(path.join(ROOT, config.server), "utf8");
const loginStart = server.indexOf("async function login(req:Request,setup:boolean){");
const loginEnd = loginStart >= 0 ? server.indexOf("\n}", loginStart) : -1;
assert.ok(loginStart >= 0 && loginEnd > loginStart, "login handler must remain testable for password compatibility");
const loginBody = server.slice(loginStart, loginEnd);
assert.ok(loginBody.includes("const minPasswordLength=setup?6:4;"), "Team Lite must require six characters for first access while preserving four-character login compatibility");
assert.ok(loginBody.includes("password.length<minPasswordLength"), "Team Lite must enforce the setup/login minimum policy before password verification or invite consumption");
const client = fs.readFileSync(path.join(ROOT, config.client), "utf8");
const migration = fs.readFileSync(path.join(ROOT, "supabase/migrations/20261107010000_setup_invites.sql"), "utf8");
const testMigration = fs.readFileSync(path.join(ROOT, "supabase/test-migrations/20261107010000_setup_invites_test.sql"), "utf8");
const roleMigration = fs.readFileSync(path.join(ROOT, "supabase/migrations/20261107060000_normalize_setup_invite_role.sql"), "utf8");
const roleTestMigration = fs.readFileSync(path.join(ROOT, "supabase/test-migrations/20261107060000_setup_invite_role_normalization_test.sql"), "utf8");
const rolePreservationMigration = fs.readFileSync(path.join(ROOT, "supabase/migrations/20261107062000_preserve_setup_invite_roles_verbatim.sql"), "utf8");
const rolePreservationTestMigration = fs.readFileSync(path.join(ROOT, "supabase/test-migrations/20261107062000_setup_invite_role_preservation_test.sql"), "utf8");

assert.match(server, /async function issueSetupInvite\(req:Request,adminName:string\)/, "admin setup-invite handler missing");
assert.match(server, /if\(!await admin\(adminName\)\)/, "setup invite issuance must require an authenticated admin");
assert.match(server, /randomBytes\(32\)\.toString\("hex"\)/, "setup invite must use a 256-bit random token");
assert.match(server, /setup_token_hash:tokenHash\(raw\)/, "only the setup-token hash may be persisted");
assert.ok(server.includes('password_hash.is.null,password_hash.eq.""'), "admin may invite NULL or legacy empty-string password rows only");
assert.doesNotMatch(server, /\.is\("password_hash",null\)/, "invite issuance must not exclude legacy empty-string password rows");
assert.match(server, /consume_upstatus_setup_invite/, "first setup must consume the invite through the atomic RPC");
assert.ok(server.includes('const enrolledRole=String(enrolled.role||"");')&&server.includes('const sessionRole=enrolledRole.trim()?enrolledRole:"implementation_user";'), "server must default blank roles without trimming non-empty explicit roles");
assert.match(server, /p_setup_token_hash:tokenHash\(setupToken\)/, "first setup must send only the token hash to the database");
assert.match(server, /if\(path==="\/api\/setup-invite"&&req\.method==="POST"\)/, "admin invite route missing");
assert.match(server, /if\(path==="\/api\/account"&&req\.method==="GET"\)return response\(\{needsSetup:false\}\);/, "public account endpoint must not disclose setup state");
assert.doesNotMatch(server, /if\(setup\)\{\s*if\(a\.password_hash\)/, "first setup must not rely on first-caller claimability");
assert.match(server, /Código de primeiro acesso inválido ou expirado/, "setup failures must use a generic response");

assert.match(client, /id="up-setup-token"/, "client must provide an explicit first-access token field");
assert.match(client, /setupToken/, "client must submit the one-time setup token");
assert.doesNotMatch(client, /\/api\/account\?name=/, "client must not enumerate account setup state");

assert.match(client, /function clearLegacyPasswordStorage\(\)/, "client must clear legacy plaintext password entries on upgrade");
assert.doesNotMatch(client, /function passwordKey\(name\)/, "client must not retain a per-account plaintext password key");
assert.doesNotMatch(client, /GM_setValue\(passwordKey\(name\),password\)|sessionStorage\.setItem\(passwordKey\(name\),password\)/, "client must not persist submitted passwords");
assert.match(client, /passwordInput\.value=''/, "successful authentication must clear the password input");
assert.match(client, /setupTokenInput\.value=''/, "successful first access must clear the one-time token input");
assert.ok(client.includes("var key='upstatus_team_lite_';"), "Team Lite storage namespace must be declared before use");
assert.match(client, /sessionStorage\.key\(i\)/, "Team Lite must enumerate legacy session credential keys");
assert.match(client, /sessionStorage\.removeItem\(storageKey\)/, "Team Lite must delete legacy plaintext credential values");


assert.match(migration, /add column if not exists setup_token_hash/i);
assert.match(migration, /create unique index if not exists users_setup_token_hash_uidx/i);
assert.match(migration, /u\.password_hash is null or u\.password_hash = ''/i, "atomic invite consumption must accept NULL and legacy empty-string hashes");
assert.match(migration, /security invoker/i);
assert.match(migration, /set search_path = ''/i);
assert.match(migration, /revoke all on function public\.consume_upstatus_setup_invite\(text, text, text\) from public/i);
assert.match(migration, /revoke all on function public\.consume_upstatus_setup_invite\(text, text, text\) from anon, authenticated/i);
assert.match(migration, /grant execute on function public\.consume_upstatus_setup_invite\(text, text, text\) to service_role/i);
assert.match(testMigration, /has_function_privilege\('anon'/i);
assert.match(testMigration, /has_function_privilege\('authenticated'/i);
assert.match(testMigration, /has_function_privilege\('service_role'/i);
const legacyRoleExpression = "nullif(btrim(u.role, E' \\t\\n\\r'), '')";
const safeRoleExpression = "case when u.role is null or btrim(u.role, E' \\t\\n\\r') = '' then 'implementation_user' else u.role end";
assert.ok(roleMigration.includes(safeRoleExpression), "initial migration must preserve non-empty roles verbatim");
assert.ok(roleTestMigration.includes(legacyRoleExpression)&&roleTestMigration.includes(safeRoleExpression), "initial assertion accepts historical and final safe role expressions");
assert.ok(rolePreservationMigration.includes(safeRoleExpression), "follow-up migration must preserve non-empty roles verbatim");
assert.ok(rolePreservationTestMigration.includes(safeRoleExpression), "follow-up isolated assertion must verify verbatim role preservation");


function extractFunction(source,name){
  const marker="function "+name+"(){";
  const start=source.indexOf(marker);
  assert.ok(start>=0, name+" function must exist");
  let depth=0;
  for(let i=source.indexOf("{",start);i<source.length;i++){
    if(source[i]==="{")depth++;
    else if(source[i]==="}"&&--depth===0)return source.slice(start,i+1);
  }
  throw new Error("Could not extract "+name);
}
const cleanupFunction=extractFunction(client,"clearLegacyPasswordStorage");
if(product==="normal"){
  const store=new Map([["upstatus_password_ricardo","legacy-secret"],["upstatus_password_lohan","legacy-secret"],["upstatus_token","keep"],["other_password","keep"]]);
  vm.runInNewContext(cleanupFunction+";clearLegacyPasswordStorage();",{
    key:"upstatus_",
    GM_listValues:()=>Array.from(store.keys()),
    GM_deleteValue:storageKey=>store.delete(storageKey)
  });
  assert.deepEqual(Array.from(store.keys()).sort(),["other_password","upstatus_token"],"Normal cleanup must delete only namespaced legacy password keys");
}else{
  const store=new Map([["upstatus_team_lite_password_lucca","legacy-secret"],["upstatus_team_lite_password_ycaro","legacy-secret"],["upstatus_team_lite_token","keep"],["other_password","keep"]]);
  const sessionStorage={
    get length(){return store.size;},
    key:index=>Array.from(store.keys())[index]??null,
    removeItem:storageKey=>store.delete(storageKey)
  };
  vm.runInNewContext(cleanupFunction+";clearLegacyPasswordStorage();",{key:"upstatus_team_lite_",sessionStorage});
  assert.deepEqual(Array.from(store.keys()).sort(),["other_password","upstatus_team_lite_token"],"Team Lite cleanup must delete only namespaced legacy password keys");
}


function extractBlock(source,marker){
  const start=source.indexOf(marker);
  assert.ok(start>=0,"missing function: "+marker);
  const brace=source.indexOf("{",start);
  let depth=0;
  for(let i=brace;i<source.length;i++){
    if(source[i]==="{")depth++;
    else if(source[i]==="}"&&--depth===0)return source.slice(start,i+1);
  }
  throw new Error("Could not extract "+marker);
}
const adminFunction=extractBlock(server,"async function admin(name:string|null){")
  .replace("async function admin(name:string|null){","async function admin(name){");
const issueInviteFunction=extractBlock(server,"async function issueSetupInvite(req:Request,adminName:string){")
  .replace("async function issueSetupInvite(req:Request,adminName:string){","async function issueSetupInvite(req,adminName){")
  .replace("const p:any=await readBody(req);","const p=await readBody(req);");
const contextAt=server.indexOf("const ctx=await contextName(req);");
const authGuardAt=server.indexOf('if(!ctx)return response({error:"Faça login para continuar."},401);',contextAt);
const inviteRouteAt=server.indexOf('if(path==="/api/setup-invite"&&req.method==="POST")',contextAt);
assert.ok(contextAt>=0&&authGuardAt>contextAt&&inviteRouteAt>authGuardAt,"setup-invite route must be behind the active-session guard");
assert.ok(server.includes('issueSetupInvite(req,name||"")'),"setup-invite route must use the name derived from the authenticated context");
assert.doesNotMatch(issueInviteFunction,/console\.(log|error)\(/,"raw setup tokens must never be logged by the invite handler");

const roleMap=new Map([
  ["Admin","implementation_admin"],
  ["User","implementation_user"],
  ["PaddedAdmin"," implementation_admin "]
]);
function makeInviteHarness(targetAvailable=true){
  const state={targetAvailable,updates:[],filter:null,orFilter:null,selected:null,readBodyCalls:0};
  const db={
    from(table){
      assert.equal(table,"users","invite issuance may update only the users table");
      return {
        update(payload){
          state.updates.push(payload);
          return {
            eq(column,value){
              state.filter={column,value};
              return {
                or(filter){
                  state.orFilter=filter;
                  return {
                    select(columns){
                      state.selected=columns;
                      return {
                        maybeSingle:async()=>({data:state.targetAvailable?{name:state.filter.value}:null,error:null})
                      };
                    }
                  };
                }
              };
            }
          };
        }
      };
    }
  };
  const sandbox={
    account:async name=>roleMap.has(name)?{role:roleMap.get(name)}:null,
    db,
    readBody:async req=>{state.readBodyCalls++;return req.body||{};},
    response:(body,status=200)=>({body,status}),
    randomBytes:n=>({toString:encoding=>{assert.equal(encoding,"hex");return "ab".repeat(n);}}),
    tokenHash:raw=>"sha256:"+"cd".repeat(32)
  };
  const handlers=vm.runInNewContext([adminFunction,issueInviteFunction,"({admin,issueSetupInvite})"].join("\n"),sandbox);
  return {handlers,state};
}
const authHarness=makeInviteHarness();
assert.equal(await authHarness.handlers.admin(null),false,"missing caller cannot be an admin");
assert.equal(await authHarness.handlers.admin("User"),false,"stored implementation_user cannot issue invites");
assert.equal(await authHarness.handlers.admin("PaddedAdmin"),false,"whitespace-padded admin text cannot become an admin");
assert.equal(await authHarness.handlers.admin("Admin"),true,"only the exact stored implementation_admin role is accepted");

const deniedHarness=makeInviteHarness();
const denied=await deniedHarness.handlers.issueSetupInvite({body:{name:"Target"}}, "User");
assert.equal(denied.status,403,"non-admin invite issuance must be denied");
assert.equal(deniedHarness.state.readBodyCalls,0,"unauthorized requests must be rejected before reading target data");
assert.equal(deniedHarness.state.updates.length,0,"unauthorized requests must not touch the database");
assert.equal(denied.body.setupToken,undefined,"denial must not disclose a setup token");

const invalidHarness=makeInviteHarness();
const invalid=await invalidHarness.handlers.issueSetupInvite({body:{name:"   "}}, "Admin");
assert.equal(invalid.status,400,"blank target names must be rejected");
assert.equal(invalidHarness.state.updates.length,0,"invalid targets must not update users");
const oversized=await invalidHarness.handlers.issueSetupInvite({body:{name:"x".repeat(121)}}, "Admin");
assert.equal(oversized.status,400,"target names over 120 characters must be rejected");

const successHarness=makeInviteHarness(true);
const issued=await successHarness.handlers.issueSetupInvite({body:{name:"  Target User  "}}, "Admin");
assert.equal(issued.status,200,"authorized invite issuance must succeed for an uninitialized account");
assert.equal(issued.body.name,"Target User","target name must be normalized");
assert.match(issued.body.setupToken,/^[0-9a-f]{64}$/,"the one-time token must contain 256 random bits");
assert.equal(successHarness.state.updates.length,1,"authorized issuance must perform one conditional update");
assert.equal(successHarness.state.filter.column,"name");
assert.equal(successHarness.state.filter.value,"Target User");
assert.equal(successHarness.state.orFilter,'password_hash.is.null,password_hash.eq.""',"only NULL/legacy-empty password rows may receive an invite");
assert.equal(successHarness.state.selected,"name");
const persisted=successHarness.state.updates[0];
assert.deepEqual(Object.keys(persisted).sort(),["setup_token_hash","setup_token_expires_at","setup_token_issued_by","setup_token_issued_at"].sort());
assert.equal(persisted.setup_token_hash,"sha256:"+"cd".repeat(32),"only the token hash may be persisted");
assert.equal(persisted.setup_token_issued_by,"Admin","the stored issuer must be the authenticated admin");
assert.equal(JSON.stringify(persisted).includes(issued.body.setupToken),false,"the raw token must never be persisted");
const lifetime=Date.parse(issued.body.expiresAt)-Date.parse(persisted.setup_token_issued_at);
assert.ok(lifetime>=899000&&lifetime<=901000,"setup invite must expire after 15 minutes");

const unavailableHarness=makeInviteHarness(false);
const unavailable=await unavailableHarness.handlers.issueSetupInvite({body:{name:"AlreadyConfigured"}}, "Admin");
assert.equal(unavailable.status,409,"configured or missing accounts must return a generic conflict");
assert.equal(unavailable.body.setupToken,undefined,"unavailable accounts must not receive a token");
assert.equal(unavailableHarness.state.updates.length,1,"the database must receive one conditional eligibility update");

console.log(product+" setup-invite route authorization and token-handling checks passed.");

console.log(product + " one-time setup enrollment static checks passed.");

// Execute the exact candidate router slice together with its real auth/session,
// admin, invite-issuance and first-setup handlers. Only external DB/runtime
// boundaries are mocked; this is not a live Deno HTTP or Supabase test.
const routeStart = server.indexOf('if(path==="/api/account"&&req.method==="GET")');
const routeEnd = server.indexOf('\n\n    if(path==="/api/logout"', routeStart);
assert.ok(routeStart >= 0 && routeEnd > routeStart, "account/setup/login/authenticated route block must remain extractable");
const routeSource = server.slice(routeStart, routeEnd);

const routeReadBody = extractBlock(server, "async function readBody(req:Request) {")
  .replace("async function readBody(req:Request) {", "async function readBody(req) {");
const routeToken = extractBlock(server, "function token(req:Request){")
  .replace("function token(req:Request){", "function token(req){");
const routeUserFromToken = extractBlock(server, "async function userFromToken(req:Request){")
  .replace("async function userFromToken(req:Request){", "async function userFromToken(req){");
const routeAccount = extractBlock(server, "async function account(name:string){")
  .replace("async function account(name:string){", "async function account(name){");
const routeAdmin = extractBlock(server, "async function admin(name:string|null){")
  .replace("async function admin(name:string|null){", "async function admin(name){");
const routeInvite = extractBlock(server, "async function issueSetupInvite(req:Request,adminName:string){")
  .replace("async function issueSetupInvite(req:Request,adminName:string){", "async function issueSetupInvite(req,adminName){")
  .replace("const p:any=await readBody(req);", "const p=await readBody(req);");
const routeLogin = extractBlock(server, "async function login(req:Request,setup:boolean){")
  .replace("async function login(req:Request,setup:boolean){", "async function login(req,setup){")
  .replace("const p:any=await readBody(req);", "const p=await readBody(req);");
const routeContext = extractBlock(server, "async function contextName(req:Request) {")
  .replace("async function contextName(req:Request) {", "async function contextName(req) {")
  .replace("const s:any=", "const s=")
  .replace("const ys:any=", "const ys=");

function makeRouteHarness(options={}){
  const state={
    readBodyCalls:0,updates:[],accountLookups:[],sessionLookups:[],
    rpcCalls:[],createdSessions:[],updateTarget:null,eligibilityFilter:null,
    rpcAccept:options.rpcAccept===true,rpcRole:options.rpcRole??null,
    targetAvailable:options.targetAvailable!==false,guestOnline:false
  };
  const roles=new Map([
    ["Admin","implementation_admin"],
    ["User","implementation_user"],
    ["PaddedAdmin"," implementation_admin "],
    ["Lucca","implementation_user"],
    ["Target",null]
  ]);
  const sessions=new Map();
  for(const [raw,name] of [["admin-session","Admin"],["user-session","User"],["padded-admin-session","PaddedAdmin"]]){
    sessions.set("sha256:"+raw,{
      user_name:name,
      expires_at:new Date(Date.now()+60000).toISOString()
    });
  }
  const db={
    from(table){
      if(table==="upstatus_sessions"){
        return {
          select(){
            return {
              eq(column,value){
                state.sessionLookups.push({column,value});
                return {maybeSingle:async()=>({data:sessions.get(value)||null,error:null})};
              }
            };
          },
          delete(){
            return {eq:async()=>({error:null})};
          }
        };
      }
      if(table==="users"){
        return {
          select(){
            return {
              eq(column,value){
                state.accountLookups.push(value);
                return {
                  maybeSingle:async()=>({
                    data:roles.has(value)?{name:value,role:roles.get(value),password_hash:"configured"}:null,
                    error:null
                  })
                };
              }
            };
          },
          update(payload){
            state.updates.push(payload);
            return {
              eq(column,value){
                state.updateTarget=value;
                return {
                  or(filter){
                    state.eligibilityFilter=filter;
                    return {
                      select(){
                        return {
                          maybeSingle:async()=>({
                            data:state.targetAvailable?{name:state.updateTarget}:null,
                            error:null
                          })
                        };
                      }
                    };
                  }
                };
              }
            };
          }
        };
      }
      throw new Error("Unexpected table in AUTH-03 route harness: "+table);
    },
    async rpc(name,args){
      state.rpcCalls.push({name,args});
      if(name!=="consume_upstatus_setup_invite")throw new Error("Unexpected RPC: "+name);
      return {
        data:state.rpcAccept?[{name:args.p_user_name,role:state.rpcRole}]:[],
        error:null
      };
    }
  };
  const sandbox={
    db,
    sessionCache:new Map(),
    SESSION_CACHE_TTL_MS:5000,
    tokenHash:raw=>"sha256:"+raw,
    randomBytes:n=>({toString:encoding=>{assert.equal(encoding,"hex");return "ab".repeat(n);}}),
    passwordHash:password=>"password-hash:"+password,
    checkPassword:()=>false,
    response:(body,status=200)=>({body,status}),
    createSession:async(name,knownAccount)=>{
      state.createdSessions.push({name,role:knownAccount?.role});
      return {body:{name,role:knownAccount?.role,token:"session-token"},status:200};
    },
    expireLucca:async()=>state.guestOnline
      ?{online:true,session:"guest-session",joinedAt:new Date().toISOString()}
      :{online:false,session:""},
    luccaToken:req=>req.headers.get("x-test-guest")||"",
    expireYcaro:async()=>({online:false,session:""}),
    ycaroToken:()=>"",
    readBody:undefined
  };
  const factorySource="(async function(req,path){\n"+routeSource+"\nreturn response({error:\"Não encontrado.\"},404);\n})";
  const dispatch=vm.runInNewContext([
    routeReadBody,routeToken,routeUserFromToken,routeAccount,routeAdmin,
    routeInvite,routeLogin,routeContext,factorySource
  ].join("\n"),sandbox);
  return {dispatch,state};
}
function makeRouteRequest(state,options={}){
  state.guestOnline=!!options.guest;
  const headers=new Map([
    ["x-upstatus-token",options.token||""],
    ["x-test-guest",options.guest||""]
  ]);
  return {
    method:options.method||"POST",
    headers:{get:name=>headers.get(String(name).toLowerCase())||null},
    text:async()=>{
      state.readBodyCalls++;
      if(options.bodyText!==undefined)return options.bodyText;
      return options.body===undefined?"":JSON.stringify(options.body);
    }
  };
}

{
  const h=makeRouteHarness();
  const result=await h.dispatch(makeRouteRequest(h.state,{body:{name:"Target"}}),"/api/setup-invite");
  assert.equal(result.status,401,"unauthenticated setup-invite requests must be rejected by the actual route block");
  assert.equal(h.state.readBodyCalls,0,"unauthenticated requests must be rejected before parsing the body");
  assert.equal(h.state.updates.length,0,"unauthenticated requests must not update users");
}
{
  const h=makeRouteHarness();
  const result=await h.dispatch(makeRouteRequest(h.state,{token:"user-session",body:{name:"Target"}}),"/api/setup-invite");
  assert.equal(result.status,403,"authenticated non-admin setup-invite requests must be denied");
  assert.equal(h.state.readBodyCalls,0,"non-admin requests must be denied before parsing target data");
  assert.equal(h.state.updates.length,0,"non-admin requests must not update users");
  assert.equal(result.body.setupToken,undefined,"non-admin responses must not disclose a setup token");
}
{
  const h=makeRouteHarness();
  const result=await h.dispatch(makeRouteRequest(h.state,{token:"padded-admin-session",body:{name:"Target"}}),"/api/setup-invite");
  assert.equal(result.status,403,"whitespace-padded admin roles must not authorize the route");
  assert.equal(h.state.updates.length,0,"padded roles must not update users");
}
{
  const h=makeRouteHarness();
  const result=await h.dispatch(makeRouteRequest(h.state,{guest:"guest-session",body:{name:"Target"}}),"/api/setup-invite");
  assert.equal(result.status,403,"a guest portal context must not authorize admin invite issuance");
  assert.equal(h.state.updates.length,0,"guest contexts must not update users");
}
{
  const h=makeRouteHarness();
  const result=await h.dispatch(makeRouteRequest(h.state,{
    token:"admin-session",
    body:{name:"Target",adminName:"Spoofed"}
  }),"/api/setup-invite");
  assert.equal(result.status,200,"an authenticated stored admin must be able to issue an invite");
  assert.equal(result.body.name,"Target");
  assert.match(result.body.setupToken,/^[0-9a-f]{64}$/);
  assert.equal(h.state.updates.length,1);
  assert.equal(h.state.updates[0].setup_token_issued_by,"Admin","issuer identity must come from the validated session, not request JSON");
  assert.equal(h.state.updates[0].setup_token_hash,"sha256:"+result.body.setupToken,"only the token hash may be persisted");
  assert.equal(JSON.stringify(h.state.updates[0]).includes(result.body.setupToken),false,"the raw invite token must not be persisted");
  assert.equal(h.state.eligibilityFilter,'password_hash.is.null,password_hash.eq.""');
}
{
  const h=makeRouteHarness();
  const result=await h.dispatch(makeRouteRequest(h.state,{method:"GET"}),"/api/account");
  assert.equal(result.status,200);
  assert.equal(result.body.needsSetup,false,"public account lookup must not disclose per-name setup state");
  assert.equal(h.state.accountLookups.length,0,"public account lookup must not query named accounts");
}
{
  const h=makeRouteHarness();
  const result=await h.dispatch(makeRouteRequest(h.state,{
    body:{name:"Target",password:"12345",setupToken:"cd".repeat(32)}
  }),"/api/setup");
  assert.equal(result.status,400,"first setup must enforce the six-character password minimum");
  assert.equal(h.state.rpcCalls.length,0,"short passwords must be rejected before invite consumption");
}
{
  const h=makeRouteHarness();
  const result=await h.dispatch(makeRouteRequest(h.state,{
    body:{name:"Target",password:"abcdef",setupToken:"malformed"}
  }),"/api/setup");
  assert.equal(result.status,403,"malformed setup tokens must receive the generic denial");
  assert.equal(result.body.error,"Código de primeiro acesso inválido ou expirado.");
  assert.equal(h.state.rpcCalls.length,0,"malformed tokens must not reach the consume RPC");
  assert.equal(h.state.createdSessions.length,0,"malformed tokens must not create sessions");
}
{
  const h=makeRouteHarness({rpcAccept:false});
  const rawToken="cd".repeat(32);
  const result=await h.dispatch(makeRouteRequest(h.state,{
    body:{name:"Target",password:"abcdef",setupToken:rawToken}
  }),"/api/setup");
  assert.equal(result.status,403,"wrong, expired or replayed invite consumption must be denied");
  assert.equal(result.body.error,"Código de primeiro acesso inválido ou expirado.");
  assert.equal(h.state.rpcCalls.length,1);
  assert.equal(h.state.rpcCalls[0].name,"consume_upstatus_setup_invite");
  assert.equal(h.state.rpcCalls[0].args.p_setup_token_hash,"sha256:"+rawToken,"only the token hash may reach the consume RPC");
  assert.equal(JSON.stringify(h.state.rpcCalls[0].args).includes(rawToken),false,"raw setup tokens must not reach the RPC");
  assert.equal(h.state.createdSessions.length,0,"failed invite consumption must not create a session");
}
{
  const h=makeRouteHarness({rpcAccept:true,rpcRole:null});
  const rawToken="ef".repeat(32);
  const result=await h.dispatch(makeRouteRequest(h.state,{
    body:{name:"Target",password:"abcdef",setupToken:rawToken}
  }),"/api/setup");
  assert.equal(result.status,200,"a valid one-time invite must complete the actual first-setup route");
  assert.equal(h.state.rpcCalls.length,1);
  assert.equal(h.state.rpcCalls[0].args.p_setup_token_hash,"sha256:"+rawToken);
  assert.equal(h.state.rpcCalls[0].args.p_password_hash,"password-hash:abcdef");
  assert.deepEqual(h.state.createdSessions,[{name:"Target",role:"implementation_user"}],"blank enrolled roles must default to implementation_user");
}
{
  const h=makeRouteHarness({rpcAccept:true,rpcRole:" implementation_admin "});
  const result=await h.dispatch(makeRouteRequest(h.state,{
    body:{name:"Target",password:"abcdef",setupToken:"ef".repeat(32)}
  }),"/api/setup");
  assert.equal(result.status,200);
  assert.deepEqual(h.state.createdSessions,[{name:"Target",role:" implementation_admin "}],"non-empty explicit roles must be preserved verbatim, not silently normalized");
}

console.log(product+" setup-invite and first-setup route-dispatch checks passed.");
