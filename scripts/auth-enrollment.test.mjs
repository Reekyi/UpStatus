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
assert.ok(loginBody.includes("const minPasswordLength=setup?6:4;"), "password minimum policy changed unexpectedly");
assert.ok(loginBody.includes("password.length<minPasswordLength"), "login and setup must use the explicit minimum-length policy");
const client = fs.readFileSync(path.join(ROOT, config.client), "utf8");
const migration = fs.readFileSync(path.join(ROOT, "supabase/migrations/20261107010000_setup_invites.sql"), "utf8");
const testMigration = fs.readFileSync(path.join(ROOT, "supabase/test-migrations/20261107010000_setup_invites_test.sql"), "utf8");

assert.match(server, /async function issueSetupInvite\(req:Request,adminName:string\)/, "admin setup-invite handler missing");
assert.match(server, /if\(!await admin\(adminName\)\)/, "setup invite issuance must require an authenticated admin");
assert.match(server, /randomBytes\(32\)\.toString\("hex"\)/, "setup invite must use a 256-bit random token");
assert.match(server, /setup_token_hash:tokenHash\(raw\)/, "only the setup-token hash may be persisted");
assert.ok(server.includes('password_hash.is.null,password_hash.eq.""'), "admin may invite NULL or legacy empty-string password rows only");
assert.doesNotMatch(server, /\.is\("password_hash",null\)/, "invite issuance must not exclude legacy empty-string password rows");
assert.match(server, /consume_upstatus_setup_invite/, "first setup must consume the invite through the atomic RPC");
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
if (product === "normal") {
  assert.ok(client.includes("var key='__UPSTATUS_STORAGE_PREFIX__';"), "Normal storage namespace placeholder must remain present");
  assert.match(client, /@grant\s+GM_listValues/, "Normal must request GM_listValues to purge legacy credentials");
  assert.match(client, /@grant\s+GM_deleteValue/, "Normal must request GM_deleteValue to purge legacy credentials");
  assert.match(client, /GM_listValues\(\)/, "Normal must enumerate its legacy credential keys");
  assert.match(client, /GM_deleteValue\(storageKey\)/, "Normal must delete legacy plaintext credential values");
} else {
  assert.match(client, /sessionStorage\.key\(i\)/, "Team Lite must enumerate legacy session credential keys");
  assert.match(client, /sessionStorage\.removeItem\(storageKey\)/, "Team Lite must delete legacy plaintext credential values");
}


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

console.log(product + " one-time setup enrollment static checks passed.");
