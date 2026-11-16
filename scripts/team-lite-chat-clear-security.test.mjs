import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const server = fs.readFileSync(path.join(root, "src/server/index.template.ts"), "utf8");
const user = fs.readFileSync(path.join(root, "src/userscript/upstatus.user.template.js"), "utf8");

const accountStart = server.indexOf("async function account(name:string)");
const adminStart = server.indexOf("async function admin(name:string|null)");
const createSessionStart = server.indexOf("async function createSession", adminStart);
assert.ok(accountStart >= 0 && adminStart > accountStart && createSessionStart > adminStart,
  "server must retain account lookup and the persisted-role admin helper");
const adminHelper = server.slice(adminStart, createSessionStart);
assert.ok(adminHelper.includes("const a=await account(name);") &&
  adminHelper.includes('return a?.role==="implementation_admin";'),
  "admin helper must read the persisted implementation_admin role");

const routeStart = server.indexOf('if(path==="/api/chat/clear"&&req.method==="POST"){');
assert.ok(routeStart >= 0, "server chat-clear route must exist");
const route = server.slice(routeStart, routeStart + 1500);
assert.ok(route.includes('if(name!=="Ricardo"||!(await admin(name)))'),
  "server chat-clear route must require owner identity and persisted administrator role");
assert.ok(!route.includes('if(name!=="Ricardo")return response({error:"Somente Ricardo pode limpar o chat."},403);'),
  "server must not retain the display-name-only authorization bypass");
assert.ok(route.includes('message:"🧹 "+name+" limpou o chat."'),
  "system audit message must identify the acting administrator");

assert.ok(user.includes("var role=GM_getValue(key+'role','implementation_user');"),
  "client must load the persisted role for UI gating");
assert.ok(user.includes("role=r.role||'implementation_user'") &&
  user.includes("GM_setValue(key+'role',role)"),
  "client must persist the role returned by the authenticated server");
assert.ok(user.includes("(member==='Ricardo'&&role==='implementation_admin'?'<button class=\"up-chat-clear\""),
  "clear-chat control must be visible only to the owner administrator");
assert.ok(user.includes("function clearChatAdmin(){if(member!=='Ricardo'||role!=='implementation_admin')return;"),
  "client clear-chat handler must repeat the role check");
assert.ok(user.includes("clearBtn.onclick=clearChatAdmin"),
  "clear-chat control must call the guarded handler");
assert.ok(!user.includes("function clearChatRicardo(){if(member!=='Ricardo')return;"),
  "client must not retain the display-name-only handler");

const loginStart = server.indexOf("async function login(req:Request,setup:boolean){");
const loginEnd = server.indexOf("\nasync function members()", loginStart);
assert.ok(loginStart >= 0 && loginEnd > loginStart, "Team Lite setup login function must exist");
let loginSource = server.slice(loginStart, loginEnd)
  .replace("async function login(req:Request,setup:boolean)", "async function login(req,setup)")
  .replace("const p:any=", "const p=");
assert.ok(loginSource.includes('const role=a.role==="implementation_admin"?"implementation_admin":"implementation_user";'),
  "setup must preserve only the persisted implementation_admin role");
assert.ok(!loginSource.includes('["Ricardo","Lohan","Guilherme"]'),
  "setup must not elevate administrators by display name");

const calls = { updates: [] };
const context = vm.createContext({
  readBody: async req => req.body || {},
  response: (body, status = 200) => ({ body, status }),
  passwordHash: value => "hash:" + value,
  db: {
    from: table => ({
      update: row => ({
        eq: async (column, value) => {
          calls.updates.push({ table, row, column, value });
          return { error: null };
        }
      })
    })
  },
  createSession: async (name, known) => ({ name, role: known.role })
});
context.accountData = null;
context.account = async () => context.accountData;
vm.runInContext(loginSource + "\nglobalThis.__login=login;", context);

async function setupAs(name, persistedRole, expectedRole) {
  context.accountData = { name, password_hash: null, role: persistedRole };
  calls.updates.length = 0;
  const result = await context.__login({ body: { name, password: "candidate-password" } }, true);
  assert.equal(result.name, name, name + " session must preserve account identity");
  assert.equal(result.role, expectedRole, name + " must receive the expected persisted role");
  assert.equal(calls.updates.length, 1, name + " setup must persist exactly one role update");
  assert.equal(calls.updates[0].row.role, expectedRole, name + " must persist the non-escalating role");
}

await setupAs("Ricardo", null, "implementation_user");
await setupAs("Lohan", null, "implementation_user");
await setupAs("Ricardo", "implementation_user", "implementation_user");
await setupAs("Ricardo", "implementation_admin", "implementation_admin");
await setupAs("Ricardo", "unexpected_role", "implementation_user");

process.stdout.write("Team Lite authorization regression passed: setup cannot elevate by name; chat-wide clear requires persisted role on server and client.\n");
