#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = path.join(ROOT, "src/server/normal-3.4.7.recovered.template.ts");
const modulesDir = path.join(ROOT, "src/server/normal-3.4.7/modules");
const helperPath = path.join(modulesDir, "http.js");
const statePath = path.join(modulesDir, "state.js");
const authCryptoPath = path.join(modulesDir, "auth-crypto.js");
const guestSessionsPath = path.join(modulesDir, "guest-sessions.js");
const membersPath = path.join(modulesDir, "members.js");
const userscriptPath = path.join(ROOT, "recovery/runtime-2026-11-26/userscripts/original-project-normal-3.4.7.user.js");
const ycaroPath = path.join(ROOT, "ycaro.html");
const outputRoot = path.join(ROOT, "dist/modular-normal-candidate");
const outputPath = path.join(outputRoot, "index.ts");

const template = fs.readFileSync(templatePath, "utf8");
let source = template;
const helperModule = fs.readFileSync(helperPath, "utf8");
if (!helperModule.includes("export function createHttpHelpers")) throw new Error("HTTP helper module export not found.");
const stateModule = fs.readFileSync(statePath, "utf8");
if (!stateModule.includes("export function createStateStore")) throw new Error("State store module export not found.");
const authCryptoModule = fs.readFileSync(authCryptoPath, "utf8");
if (!authCryptoModule.includes("export function createAuthCrypto")) throw new Error("Auth crypto module export not found.");
const guestSessionsModule = fs.readFileSync(guestSessionsPath, "utf8");
if (!guestSessionsModule.includes("export function createGuestSessionStore")) throw new Error("Guest session module export not found.");
const membersModule = fs.readFileSync(membersPath, "utf8");
if (!membersModule.includes("export function createMembersStore")) throw new Error("Members module export not found.");
const userscript = fs.readFileSync(userscriptPath, "utf8");
const ycaro = fs.readFileSync(ycaroPath, "utf8");

const cacheDeclaration = "let membersCache:{at:number,data:Array<{name:string}>}|null=null;";
if (!source.includes(cacheDeclaration)) throw new Error("Members cache declaration not found.");
source = source.replace(cacheDeclaration, () => "const { members } = createMembersStore(db);");

const httpStart = source.indexOf("function response(body:unknown");
const httpEnd = source.indexOf("function token(req:Request)", httpStart);
if (httpStart < 0 || httpEnd < 0) throw new Error("Could not isolate the original HTTP helper block.");
const originalHttpBlock = source.slice(httpStart, httpEnd);
source = source.slice(0, httpStart) +
  "const { response, readBody } = createHttpHelpers(CORS);\n" +
  source.slice(httpEnd);

const stateStart = source.indexOf("async function stateValue(key:string, fallback:any) {");
const stateEnd = source.indexOf("function cookie(req:Request,name:string)", stateStart);
if (stateStart < 0 || stateEnd < 0) throw new Error("Could not isolate the original shared state block.");
const originalStateBlock = source.slice(stateStart, stateEnd);
source = source.slice(0, stateStart) +
  "const { stateValue, setState } = createStateStore(db);\n" +
  source.slice(stateEnd);

const guestStart = source.indexOf("function cookie(req:Request,name:string)");
const guestEnd = source.indexOf("async function profileMap()", guestStart);
if (guestStart < 0 || guestEnd < 0) throw new Error("Could not isolate the original guest session block.");
const originalGuestBlock = source.slice(guestStart, guestEnd);
source = source.slice(0, guestStart) +
  "const { cookie, luccaToken, luccaState, expireLucca, ycaroToken, ycaroState, expireYcaro } = createGuestSessionStore({ stateValue, setState, db, randomBytes });\n" +
  source.slice(guestEnd);

const membersStart = source.indexOf("async function members(){");
const membersEnd = source.indexOf("async function healthRoute(req:Request,name:string){", membersStart);
if (membersStart < 0 || membersEnd < 0) throw new Error("Could not isolate the original members function.");
const originalMembersBlock = source.slice(membersStart, membersEnd);
source = source.slice(0, membersStart) + "/* MEMBERS_MODULE */\n" + source.slice(membersEnd);

const authCryptoStart = source.indexOf("function tokenHash(t:string)");
const authCryptoEnd = source.indexOf("async function userFromToken(req:Request)", authCryptoStart);
if (authCryptoStart < 0 || authCryptoEnd < 0) throw new Error("Could not isolate the original auth crypto block.");
const originalAuthCryptoBlock = source.slice(authCryptoStart, authCryptoEnd);
source = source.slice(0, authCryptoStart) +
  "const { tokenHash, passwordHash, checkPassword } = createAuthCrypto({ Buffer, createHash, randomBytes, scryptSync, timingSafeEqual });\n" +
  source.slice(authCryptoEnd);

const importAnchor = 'import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";';
if (!source.includes(importAnchor)) throw new Error("Crypto import anchor not found.");
const importedBlock = importAnchor +
  '\nimport { createHttpHelpers } from "./modules/http.js";' +
  '\nimport { createStateStore } from "./modules/state.js";' +
  '\nimport { createAuthCrypto } from "./modules/auth-crypto.js";' +
  '\nimport { createGuestSessionStore } from "./modules/guest-sessions.js";' +
  '\nimport { createMembersStore } from "./modules/members.js";';
source = source.replace(importAnchor, () => importedBlock);

const restored = source
  .replace("const { response, readBody } = createHttpHelpers(CORS);\n", () => originalHttpBlock)
  .replace("const { stateValue, setState } = createStateStore(db);\n", () => originalStateBlock)
  .replace("const { cookie, luccaToken, luccaState, expireLucca, ycaroToken, ycaroState, expireYcaro } = createGuestSessionStore({ stateValue, setState, db, randomBytes });\n", () => originalGuestBlock)
  .replace("/* MEMBERS_MODULE */\n", () => originalMembersBlock)
  .replace("const { tokenHash, passwordHash, checkPassword } = createAuthCrypto({ Buffer, createHash, randomBytes, scryptSync, timingSafeEqual });\n", () => originalAuthCryptoBlock)
  .replace("const { members } = createMembersStore(db);", () => cacheDeclaration)
  .replace(importedBlock, () => importAnchor);
if (restored !== template) {
  throw new Error("Modular candidate changed code outside the five extracted helper blocks.");
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
for (const file of [helperPath, statePath, authCryptoPath, guestSessionsPath, membersPath]) {
  fs.copyFileSync(file, path.join(outputRoot, "modules", path.basename(file)));
}
fs.writeFileSync(
  path.join(outputRoot, "README.txt"),
  "NON-PRODUCTION CANDIDATE. Generated offline for review only. Never deploy this output automatically.\n",
  "utf8"
);

console.log("Built isolated modular Normal candidate.");
console.log("Output: " + path.relative(ROOT, outputPath));
console.log("Extracted modules: HTTP, shared state, auth crypto, guest sessions, members");
console.log("Outside extracted blocks: unchanged");
console.log("Supabase/deploy actions: none");
