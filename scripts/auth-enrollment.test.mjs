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
assert.doesNotMatch(issueInviteFunction,/console\\.(log|error)\\(/,"raw setup tokens must never be logged by the invite handler");

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
    tokenHash:raw=>"sha256:"+raw
  };
  const handlers=vm.runInNewContext(adminFunction+"\\n"+issueInviteFunction+"\\n({admin,issueSetupInvite})",sandbox);
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
assert.equal(persisted.setup_token_hash,"sha256:"+issued.body.setupToken,"only the token hash may be persisted");
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
