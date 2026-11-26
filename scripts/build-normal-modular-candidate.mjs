#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = path.join(ROOT, "src/server/normal-3.4.7.recovered.template.ts");
const modulesDir = path.join(ROOT, "src/server/normal-3.4.7/modules");
const moduleFiles = ["http.js", "state.js", "auth-crypto.js", "guest-sessions.js", "members.js", "status.js", "remote-status.js", "chat-data.js"];
const modulePaths = Object.fromEntries(moduleFiles.map((file) => [file, path.join(modulesDir, file)]));
const userscriptPath = path.join(ROOT, "recovery/runtime-2026-11-26/userscripts/original-project-normal-3.4.7.user.js");
const ycaroPath = path.join(ROOT, "ycaro.html");
const outputRoot = path.join(ROOT, "dist/modular-normal-candidate");
const outputPath = path.join(outputRoot, "index.ts");

const template = fs.readFileSync(templatePath, "utf8");
let source = template;
const moduleContents = Object.fromEntries(moduleFiles.map((file) => [file, fs.readFileSync(modulePaths[file], "utf8")]));
const expectedExports = {
  "http.js": "export function createHttpHelpers",
  "state.js": "export function createStateStore",
  "auth-crypto.js": "export function createAuthCrypto",
  "guest-sessions.js": "export function createGuestSessionStore",
  "members.js": "export function createMembersStore",
  "status.js": "export function createStatusHandlers",
  "remote-status.js": "export function createRemoteStatusHandler",
  "chat-data.js": "export function createChatDataStore"
};
for (const [file, marker] of Object.entries(expectedExports)) {
  if (!moduleContents[file].includes(marker)) throw new Error("Expected export missing from " + file);
}
const userscript = fs.readFileSync(userscriptPath, "utf8");
const ycaro = fs.readFileSync(ycaroPath, "utf8");

const cacheDeclaration = "let membersCache:{at:number,data:Array<{name:string}>}|null=null;";
if (!source.includes(cacheDeclaration)) throw new Error("Members cache declaration not found.");
source = source.replace(cacheDeclaration, () => "const { members } = createMembersStore(db);");

function replaceBlock(startNeedle, endNeedle, replacement, label) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start);
  if (start < 0 || end < 0) throw new Error("Could not isolate " + label + ".");
  const original = source.slice(start, end);
  source = source.slice(0, start) + replacement + "\n" + source.slice(end);
  return original;
}

const originalHttpBlock = replaceBlock(
  "function response(body:unknown",
  "function token(req:Request)",
  "const { response, readBody } = createHttpHelpers(CORS);",
  "HTTP helper block"
);
const originalChatDataBlock = replaceBlock(
  "async function mentions(text:string){",
  "async function stateValue(key:string, fallback:any) {",
  "const { mentions, chatRows } = createChatDataStore({ db, members });",
  "chat data block"
);
const originalStateBlock = replaceBlock(
  "async function stateValue(key:string, fallback:any) {",
  "function cookie(req:Request,name:string)",
  "const { stateValue, setState } = createStateStore(db);",
  "shared state block"
);
const originalGuestBlock = replaceBlock(
  "function cookie(req:Request,name:string)",
  "async function profileMap()",
  "const { cookie, luccaToken, luccaState, expireLucca, ycaroToken, ycaroState, expireYcaro } = createGuestSessionStore({ stateValue, setState, db, randomBytes });",
  "guest session block"
);
const originalMembersBlock = replaceBlock(
  "async function members(){",
  "async function healthRoute(req:Request,name:string){",
  "/* MEMBERS_MODULE */",
  "members block"
);
const originalStatusBlock = replaceBlock(
  "async function healthRoute(req:Request,name:string){",
  "const { mentions, chatRows } = createChatDataStore({ db, members });",
  "const { healthRoute, statusRoute, historyRoute } = createStatusHandlers({ db, response, readBody, account, admin, version: VERSION });",
  "status handler block"
);
const originalRemoteBlock = replaceBlock(
  "async function remoteRoute(req:Request,name:string) {",
  "async function luccaRoute(req:Request) {",
  "const { remoteRoute } = createRemoteStatusHandler({ stateValue, setState, admin, response, readBody, members, randomBytes });",
  "remote status block"
);
const originalAuthCryptoBlock = replaceBlock(
  "function tokenHash(t:string)",
  "async function userFromToken(req:Request)",
  "const { tokenHash, passwordHash, checkPassword } = createAuthCrypto({ Buffer, createHash, randomBytes, scryptSync, timingSafeEqual });",
  "auth crypto block"
);

const importAnchor = 'import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";';
if (!source.includes(importAnchor)) throw new Error("Crypto import anchor not found.");
const importedBlock = importAnchor +
  '\nimport { createHttpHelpers } from "./modules/http.js";' +
  '\nimport { createStateStore } from "./modules/state.js";' +
  '\nimport { createAuthCrypto } from "./modules/auth-crypto.js";' +
  '\nimport { createGuestSessionStore } from "./modules/guest-sessions.js";' +
  '\nimport { createMembersStore } from "./modules/members.js";' +
  '\nimport { createStatusHandlers } from "./modules/status.js";' +
  '\nimport { createRemoteStatusHandler } from "./modules/remote-status.js";' +
  '\nimport { createChatDataStore } from "./modules/chat-data.js";';
source = source.replace(importAnchor, () => importedBlock);

const restored = source
  .replace("const { response, readBody } = createHttpHelpers(CORS);\n", () => originalHttpBlock)
  .replace("const { stateValue, setState } = createStateStore(db);\n", () => originalStateBlock)
  .replace("const { cookie, luccaToken, luccaState, expireLucca, ycaroToken, ycaroState, expireYcaro } = createGuestSessionStore({ stateValue, setState, db, randomBytes });\n", () => originalGuestBlock)
  .replace("/* MEMBERS_MODULE */\n", () => originalMembersBlock)
  .replace("const { healthRoute, statusRoute, historyRoute } = createStatusHandlers({ db, response, readBody, account, admin, version: VERSION });\n", () => originalStatusBlock)
  .replace("const { mentions, chatRows } = createChatDataStore({ db, members });\n", () => originalChatDataBlock)
  .replace("const { remoteRoute } = createRemoteStatusHandler({ stateValue, setState, admin, response, readBody, members, randomBytes });\n", () => originalRemoteBlock)
  .replace("const { tokenHash, passwordHash, checkPassword } = createAuthCrypto({ Buffer, createHash, randomBytes, scryptSync, timingSafeEqual });\n", () => originalAuthCryptoBlock)
  .replace("const { members } = createMembersStore(db);", () => cacheDeclaration)
  .replace(importedBlock, () => importAnchor);
if (restored !== template) {
  throw new Error("Modular candidate changed code outside the eight extracted blocks.");
}

const replacements = {
  "__UPSTATUS_VERSION__": "3.4.7",
  "__UPSTATUS_USERSCRIPT_BASE64__": Buffer.from(userscript, "utf8").toString("base64"),
  "__UPSTATUS_YCARO_HTML_EXPR__": JSON.stringify(ycaro)
};
for (const [placeholder, value] of Object.entries(replacements)) {
  if (!source.includes(placeholder)) throw new Error("Missing placeholder: " + placeholder);
  source = source.replaceAll(placeholder, () => value);
}
if (/__UPSTATUS_[A-Z0-9_]+__/.test(source)) throw new Error("Unresolved runtime placeholder detected.");

fs.mkdirSync(path.join(outputRoot, "modules"), { recursive: true });
fs.writeFileSync(outputPath, source, "utf8");
for (const file of moduleFiles) {
  fs.copyFileSync(modulePaths[file], path.join(outputRoot, "modules", file));
}
fs.writeFileSync(
  path.join(outputRoot, "README.txt"),
  "NON-PRODUCTION CANDIDATE. Generated offline for review only. Never deploy this output automatically.\n",
  "utf8"
);

console.log("Built isolated modular Normal candidate.");
console.log("Output: " + path.relative(ROOT, outputPath));
console.log("Extracted modules: HTTP, shared state, auth crypto, guest sessions, members, status, remote status, chat data");
console.log("Outside extracted blocks: unchanged");
console.log("Supabase/deploy actions: none");
