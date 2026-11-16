import assert from "node:assert/strict";
import fs from "node:fs";
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

process.stdout.write("Team Lite chat-clear authorization regression passed.\n");
