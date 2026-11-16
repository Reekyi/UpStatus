import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const server=fs.readFileSync("src/server/index.template.ts","utf8");
const user=fs.readFileSync("src/userscript/upstatus.user.template.js","utf8");

const loginStart=server.indexOf("async function login(req:Request,setup:boolean){");
const loginEnd=server.indexOf("\nasync function members()",loginStart);
assert.ok(loginStart>=0&&loginEnd>loginStart,"login function source is missing");
let loginSource=server.slice(loginStart,loginEnd);
loginSource=loginSource
  .replace("async function login(req:Request,setup:boolean)","async function login(req,setup)")
  .replace("const p:any=","const p=");
assert.ok(!/:Request|:boolean|:any/.test(loginSource),"test harness left TypeScript annotations");
assert.ok(loginSource.includes('const role=a.role==="implementation_admin"?"implementation_admin":"implementation_user";'),
  "setup must preserve only the persisted implementation_admin role");
assert.ok(!loginSource.includes('["Ricardo","Lohan","Guilherme"]'),
  "setup must not elevate an account by display name");

const calls={updates:[]};
const context=vm.createContext({
  readBody:async req=>req.body||{},
  response:(body,status=200)=>({body,status}),
  passwordHash:value=>"hash:"+value,
  db:{from:table=>({update:row=>({eq:async(column,value)=>{calls.updates.push({table,row,column,value});return {error:null};}})})},
  createSession:async(name,known)=>({name,role:known.role})
});
context.accountData=null;
context.account=async()=>context.accountData;
vm.runInContext(loginSource+"\nglobalThis.__login=login;",context);

async function setupAs(name,persistedRole,expectedRole){
  context.accountData={name,password_hash:null,role:persistedRole};
  calls.updates.length=0;
  const result=await context.__login({body:{name,password:"candidate-password"}},true);
  assert.equal(result.role,expectedRole,name+" must receive the expected persisted role");
  assert.equal(calls.updates.length,1,name+" setup must persist one role update");
  assert.equal(calls.updates[0].row.role,expectedRole,name+" setup must persist the non-escalating role");
}
await setupAs("Ricardo",null,"implementation_user");
await setupAs("Lohan",null,"implementation_user");
await setupAs("Ricardo","implementation_user","implementation_user");
await setupAs("Ricardo","implementation_admin","implementation_admin");
await setupAs("Ricardo","unexpected_role","implementation_user");

const adminStart=server.indexOf("async function admin(name:string|null){");
const sessionStart=server.indexOf("async function createSession",adminStart);
assert.ok(adminStart>=0&&sessionStart>adminStart,"persisted-role admin helper is missing");
const adminSource=server.slice(adminStart,sessionStart);
assert.ok(adminSource.includes('return a?.role==="implementation_admin";'),
  "admin helper must read the persisted implementation_admin role");

const clearStart=server.indexOf('if(path==="\/api\/chat\/clear"&&req.method==="POST"){');
assert.ok(clearStart>=0,"server chat-clear route is missing");
const clearRoute=server.slice(clearStart,clearStart+1200);
assert.ok(clearRoute.includes('if(name!=="Ricardo"||!(await admin(name)))'),
  "server chat-clear route must require owner identity and persisted administrator role");
assert.ok(!clearRoute.includes('if(name!=="Ricardo")return response({error:"Somente Ricardo pode limpar o chat."},403);'),
  "server chat-clear route must not authorize by display name alone");

assert.ok(user.includes("var role=GM_getValue(key+'role','implementation_user');"),
  "client must load the role returned by the server");
assert.ok(user.includes("function clearChatAdmin(){if(member!=='Ricardo'||role!=='implementation_admin')return;"),
  "client handler must require owner identity and persisted admin role");
assert.ok(user.includes("clearBtn.onclick=clearChatAdmin"),
  "chat-clear button must call the guarded handler");
assert.ok(user.includes("(member==='Ricardo'&&role==='implementation_admin'?'<button class=\"up-chat-clear\""),
  "chat-clear button must be hidden unless the persisted admin role is present");
assert.ok(user.includes("role=r.role||'implementation_user'")&&user.includes("GM_setValue(key+'role',role)"),
  "client must persist the role returned by the authenticated server");

process.stdout.write("PASS admin-role security: setup cannot elevate by name; chat-wide clear requires persisted role on server and client.\n");
