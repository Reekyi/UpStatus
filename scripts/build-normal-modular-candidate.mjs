#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = path.join(ROOT, "src/server/normal-3.4.7.recovered.template.ts");
const modulesDir = path.join(ROOT, "src/server/normal-3.4.7/modules");
const moduleFiles = [
  "http.js", "state.js", "auth-crypto.js", "guest-sessions.js", "members.js",
  "status.js", "remote-status.js", "chat-data.js", "media.js", "auth-context.js", "chat-route.js", "media-routes.js", "guest-routes.js", "chat-interaction-routes.js", "auth-core.js", "auth-routes.js"
];
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
  "chat-data.js": "export function createChatDataStore",
  "media.js": "export function createMediaStore",
  "auth-context.js": "export function createAuthContext",
  "chat-route.js": "export function createChatRouteHandler",
  "media-routes.js": "export function createMediaRoutes",
  "guest-routes.js": "export function createGuestRoutes",
  "chat-interaction-routes.js": "export function createChatInteractionRoutes",
  "auth-core.js": "export function createAuthCore",
  "auth-routes.js": "export function createAuthRoutes"
};
for (const [file, marker] of Object.entries(expectedExports)) {
  if (!moduleContents[file].includes(marker)) throw new Error("Expected export missing from " + file);
}
const userscript = fs.readFileSync(userscriptPath, "utf8");
const ycaro = fs.readFileSync(ycaroPath, "utf8");

const cacheDeclaration = "let membersCache:{at:number,data:Array<{name:string}>}|null=null;";
if (!source.includes(cacheDeclaration)) throw new Error("Members cache declaration not found.");
source = source.replace(cacheDeclaration, () => "const { members } = createMembersStore(db);");

const extracted = {};
function extract(name, startNeedle, endNeedle, replacement, label) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start);
  if (start < 0 || end < 0) throw new Error("Could not isolate " + label + ".");
  extracted[name] = source.slice(start, end);
  source = source.slice(0, start) + replacement + "\n" + source.slice(end);
}
function restore(name, marker) {
  const needle = marker + "\n";
  if (!source.includes(needle)) throw new Error("Could not restore " + name + ".");
  source = source.replace(needle, () => extracted[name]);
}

extract(
  "http",
  "function response(body:unknown",
  "function token(req:Request)",
  "const { response, readBody } = createHttpHelpers(CORS);",
  "HTTP helper block"
);
extract(
  "chatData",
  "async function mentions(text:string){",
  "async function stateValue(key:string, fallback:any) {",
  "const { mentions, chatRows } = createChatDataStore({ db, members });",
  "chat data block"
);
extract(
  "state",
  "async function stateValue(key:string, fallback:any) {",
  "function cookie(req:Request,name:string)",
  "const { stateValue, setState } = createStateStore(db);",
  "shared state block"
);
extract(
  "guest",
  "function cookie(req:Request,name:string)",
  "async function profileMap()",
  "const { cookie, luccaToken, luccaState, expireLucca, ycaroToken, ycaroState, expireYcaro } = createGuestSessionStore({ stateValue, setState, db, randomBytes });",
  "guest session block"
);
extract(
  "media",
  "async function profileMap()",
  "async function contextName(req:Request)",
  "const { profileMap, decodeDataUrl, sniffMime, ext, uploadFile } = createMediaStore({ db, randomBytes });",
  "media primitives block"
);
extract(
  "authContext",
  "async function contextName(req:Request)",
  "async function chatRoute(req:Request,name:string)",
  "const { contextName } = createAuthContext({ userFromToken, expireLucca, luccaToken, expireYcaro, ycaroToken });",
  "authentication context block"
);
extract(
  "chatRoute",
  "async function chatRoute(req:Request,name:string){",
  "async function readRoute(req:Request,name:string){",
  "const { chatRoute } = createChatRouteHandler({ db, response, readBody, chatRows, mentions, expireLucca, randomBytes });",
  "chat route block"
);

extract(
  "chatInteractionRoutes",
  "async function readRoute(req:Request,name:string){",
  "async function profileRoute(req:Request,name:string) {",
  "const { readRoute, typingRoute, reactionRoute, editRoute, deleteRoute } = createChatInteractionRoutes({ db, response, readBody, admin });",
  "chat interaction routes"
);
extract(
  "members",
  "async function members(){",
  "async function healthRoute(req:Request,name:string){",
  "/* MEMBERS_MODULE */",
  "members block"
);
extract(
  "status",
  "async function healthRoute(req:Request,name:string){",
  "const { mentions, chatRows } = createChatDataStore({ db, members });",
  "const { healthRoute, statusRoute, historyRoute } = createStatusHandlers({ db, response, readBody, account, admin, version: VERSION });",
  "status handler block"
);
extract(
  "mediaRoutes",
  "async function profileRoute(req:Request,name:string) {",
  "async function remoteRoute(req:Request,name:string) {",
  "const { profileRoute, mediaRoute, signedUploadRoute } = createMediaRoutes({ response, readBody, profileMap, uploadFile, db, randomBytes, PROJECT_URL });",
  "media routes block"
);

extract(
  "remote",
  "async function remoteRoute(req:Request,name:string) {",
  "async function luccaRoute(req:Request) {",
  "const { remoteRoute } = createRemoteStatusHandler({ stateValue, setState, admin, response, readBody, members, randomBytes });",
  "remote status block"
);
extract(
  "guestRoutes",
  "async function luccaRoute(req:Request) {",
  "Deno.serve(async(req)=>{",
  "const { luccaRoute, ycaroRoute } = createGuestRoutes({ response, readBody, expireLucca, luccaToken, expireYcaro, ycaroToken, setState, db, randomBytes, getPassword: (key) => Deno.env.get(key) || \"\", edgeRuntime: EdgeRuntime });",
  "guest HTTP routes"
);
extract(
  "authCrypto",
  "function tokenHash(t:string)",
  "async function userFromToken(req:Request)",
  "const { tokenHash, passwordHash, checkPassword } = createAuthCrypto({ Buffer, createHash, randomBytes, scryptSync, timingSafeEqual });",
  "auth crypto block"
);

extract(
  "authCore",
  "async function userFromToken(req:Request){",
  "/* MEMBERS_MODULE */",
  "const { userFromToken, account, admin, createSession, login } = createAuthCore({ db, sessionCache, token, tokenHash, randomBytes, response, readBody, passwordHash, checkPassword });",
  "authentication core block"
);

extract(
  "authRoutes",
  'if(path==="/api/account"&&req.method==="GET"){',
  'if(path==="/api/setup"&&req.method==="POST")',
  'const { accountRoute, meRoute, logoutRoute } = createAuthRoutes({ response, account, db, token, tokenHash, sessionCache });\n    if(path==="/api/account"&&req.method==="GET")return await accountRoute(req);',
  "authentication endpoint routes"
);
extract(
  "authMeRoute",
  'if(path==="/api/me"&&req.method==="GET"){',
  'if(!ctx)return response({error:"Faça login para continuar."},401);',
  'if(path==="/api/me"&&req.method==="GET")return await meRoute(name);',
  "authentication me route"
);
extract(
  "authLogoutRoute",
  'if(path==="/api/logout"&&req.method==="POST"){',
  'if(path==="/api/health"&&req.method==="GET")',
  'if(path==="/api/logout"&&req.method==="POST")return await logoutRoute(req);',
  "authentication logout route"
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
  '\nimport { createChatDataStore } from "./modules/chat-data.js";' +
  '\nimport { createMediaStore } from "./modules/media.js";' +
  '\nimport { createAuthContext } from "./modules/auth-context.js";' +
  '\nimport { createChatRouteHandler } from "./modules/chat-route.js";' +
  '\nimport { createMediaRoutes } from "./modules/media-routes.js";' +
  '\nimport { createGuestRoutes } from "./modules/guest-routes.js";' +
  '\nimport { createChatInteractionRoutes } from "./modules/chat-interaction-routes.js";' +
  '\nimport { createAuthCore } from "./modules/auth-core.js";' +
  '\nimport { createAuthRoutes } from "./modules/auth-routes.js";';
source = source.replace(importAnchor, () => importedBlock);

restore("authCrypto", "const { tokenHash, passwordHash, checkPassword } = createAuthCrypto({ Buffer, createHash, randomBytes, scryptSync, timingSafeEqual });");
restore("authCore", "const { userFromToken, account, admin, createSession, login } = createAuthCore({ db, sessionCache, token, tokenHash, randomBytes, response, readBody, passwordHash, checkPassword });");
restore("mediaRoutes", "const { profileRoute, mediaRoute, signedUploadRoute } = createMediaRoutes({ response, readBody, profileMap, uploadFile, db, randomBytes, PROJECT_URL });");
restore("guestRoutes", "const { luccaRoute, ycaroRoute } = createGuestRoutes({ response, readBody, expireLucca, luccaToken, expireYcaro, ycaroToken, setState, db, randomBytes, getPassword: (key) => Deno.env.get(key) || \"\", edgeRuntime: EdgeRuntime });");
restore("remote", "const { remoteRoute } = createRemoteStatusHandler({ stateValue, setState, admin, response, readBody, members, randomBytes });");
restore("status", "const { healthRoute, statusRoute, historyRoute } = createStatusHandlers({ db, response, readBody, account, admin, version: VERSION });");
restore("members", "/* MEMBERS_MODULE */");
restore("chatRoute", "const { chatRoute } = createChatRouteHandler({ db, response, readBody, chatRows, mentions, expireLucca, randomBytes });");
restore("chatInteractionRoutes", "const { readRoute, typingRoute, reactionRoute, editRoute, deleteRoute } = createChatInteractionRoutes({ db, response, readBody, admin });");
restore("authContext", "const { contextName } = createAuthContext({ userFromToken, expireLucca, luccaToken, expireYcaro, ycaroToken });");
restore("media", "const { profileMap, decodeDataUrl, sniffMime, ext, uploadFile } = createMediaStore({ db, randomBytes });");
restore("guest", "const { cookie, luccaToken, luccaState, expireLucca, ycaroToken, ycaroState, expireYcaro } = createGuestSessionStore({ stateValue, setState, db, randomBytes });");
restore("state", "const { stateValue, setState } = createStateStore(db);");
restore("chatData", "const { mentions, chatRows } = createChatDataStore({ db, members });");
restore("http", "const { response, readBody } = createHttpHelpers(CORS);");
source = source.replace("const { members } = createMembersStore(db);", () => cacheDeclaration);
source = source.replace(importedBlock, () => importAnchor);
if (source !== template) {
  throw new Error("Modular candidate changed code outside the extracted blocks.");
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
console.log("Extracted modules: HTTP, shared state, auth crypto, auth core, guest sessions, members, status, remote status, chat data, media, auth context, chat route, media routes, guest routes, chat interaction routes");
console.log("Outside extracted blocks: unchanged");
console.log("Supabase/deploy actions: none");
