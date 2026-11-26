#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = path.join(ROOT, "src/server/normal-3.4.7.recovered.template.ts");
const modulesDir = path.join(ROOT, "src/server/normal-3.4.7/modules");
const moduleFiles = [
  "http.js", "state.js", "auth-crypto.js", "guest-sessions.js", "members.js",
  "status.js", "remote-status.js", "chat-data.js", "media.js", "auth-context.js", "chat-route.js", "media-routes.js", "guest-routes.js", "chat-interaction-routes.js", "auth-core.js", "auth-routes.js", "chat-maintenance.js"
];
const modulePaths = Object.fromEntries(moduleFiles.map((file) => [file, path.join(modulesDir, file)]));
const userscriptPath = process.env.UPSTATUS_USERSCRIPT_PATH
  ? path.resolve(ROOT, process.env.UPSTATUS_USERSCRIPT_PATH)
  : path.join(ROOT, "src/userscript/normal-3.4.7.user.template.js");
const candidateVersion = String(process.env.UPSTATUS_VERSION || "3.4.7").trim();
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(candidateVersion)) {
  throw new Error("UPSTATUS_VERSION must be a valid numeric release or prerelease version.");
}
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
  "auth-routes.js": "export function createAuthRoutes",
  "chat-maintenance.js": "export function createChatMaintenanceRoutes"
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

extract(
  "chatMaintenance",
  'if(path==="/api/chat/clear"&&req.method==="POST"){',
  'return response({error:"Não encontrado."},404);',
  'const { clearChatRoute } = createChatMaintenanceRoutes({ db, PROJECT_URL, randomBytes, response, logError: console.error });\n    if(path==="/api/chat/clear"&&req.method==="POST")return await clearChatRoute(name);',
  "chat maintenance route"
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
  '\nimport { createAuthRoutes } from "./modules/auth-routes.js";' +
  '\nimport { createChatMaintenanceRoutes } from "./modules/chat-maintenance.js";';
source = source.replace(importAnchor, () => importedBlock);

const modularSource = source;

restore("authCrypto", "const { tokenHash, passwordHash, checkPassword } = createAuthCrypto({ Buffer, createHash, randomBytes, scryptSync, timingSafeEqual });");
restore("authCore", "const { userFromToken, account, admin, createSession, login } = createAuthCore({ db, sessionCache, token, tokenHash, randomBytes, response, readBody, passwordHash, checkPassword });");
restore("authRoutes", 'const { accountRoute, meRoute, logoutRoute } = createAuthRoutes({ response, account, db, token, tokenHash, sessionCache });\n    if(path==="/api/account"&&req.method==="GET")return await accountRoute(req);');
restore("authMeRoute", 'if(path==="/api/me"&&req.method==="GET")return await meRoute(name);');
restore("authLogoutRoute", 'if(path==="/api/logout"&&req.method==="POST")return await logoutRoute(req);');
restore("chatMaintenance", 'const { clearChatRoute } = createChatMaintenanceRoutes({ db, PROJECT_URL, randomBytes, response, logError: console.error });\n    if(path==="/api/chat/clear"&&req.method==="POST")return await clearChatRoute(name);');


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

let candidate = modularSource;

const replacements = {
  "__UPSTATUS_VERSION__": candidateVersion,
  "__UPSTATUS_USERSCRIPT_BASE64__": Buffer.from(userscript, "utf8").toString("base64"),
  "__UPSTATUS_YCARO_HTML_EXPR__": JSON.stringify(ycaro)
};
for (const [placeholder, value] of Object.entries(replacements)) {
  if (!candidate.includes(placeholder)) throw new Error("Missing placeholder: " + placeholder);
  candidate = candidate.replaceAll(placeholder, () => value);
}
if (/__UPSTATUS_[A-Z0-9_]+__/.test(candidate)) throw new Error("Unresolved runtime placeholder detected.");

// Build the recovered monolith as an isolated Deno reference server. Only its
// listener port is changed for side-by-side HTTP contract comparison.
let referenceCandidate = template;
for (const [placeholder, value] of Object.entries(replacements)) {
  if (!referenceCandidate.includes(placeholder)) throw new Error("Missing reference placeholder: " + placeholder);
  referenceCandidate = referenceCandidate.replaceAll(placeholder, () => value);
}
const referenceServeAnchor = "Deno.serve(async(req)=>{";
if (!referenceCandidate.includes(referenceServeAnchor)) throw new Error("Reference Deno entrypoint not found.");
referenceCandidate = referenceCandidate.replace(
  referenceServeAnchor,
  "Deno.serve({port:8001},async(req)=>{"
);
if (/__UPSTATUS_[A-Z0-9_]+__/.test(referenceCandidate)) throw new Error("Unresolved reference placeholder detected.");
if (candidate === template) throw new Error("Modular candidate unexpectedly equals the recovered monolith.");
for (const file of moduleFiles) {
  if (!candidate.includes("./modules/" + file)) throw new Error("Missing modular import for " + file);
}

const factoryMarkers = [
  "createHttpHelpers(CORS)",
  "createStateStore(db)",
  "createAuthCrypto({ Buffer, createHash, randomBytes, scryptSync, timingSafeEqual })",
  "createGuestSessionStore({ stateValue, setState, db, randomBytes })",
  "createMembersStore(db)",
  "createStatusHandlers({ db, response, readBody, account, admin, version: VERSION })",
  "createRemoteStatusHandler({ stateValue, setState, admin, response, readBody, members, randomBytes })",
  "createChatDataStore({ db, members })",
  "createMediaStore({ db, randomBytes })",
  "createAuthContext({ userFromToken, expireLucca, luccaToken, expireYcaro, ycaroToken })",
  "createChatRouteHandler({ db, response, readBody, chatRows, mentions, expireLucca, randomBytes })",
  "createMediaRoutes({ response, readBody, profileMap, uploadFile, db, randomBytes, PROJECT_URL })",
  "createGuestRoutes({ response, readBody, expireLucca, luccaToken, expireYcaro, ycaroToken, setState, db, randomBytes",
  "createChatInteractionRoutes({ db, response, readBody, admin })",
  "createAuthCore({ db, sessionCache, token, tokenHash, randomBytes, response, readBody, passwordHash, checkPassword })",
  "createAuthRoutes({ response, account, db, token, tokenHash, sessionCache })",
  "createChatMaintenanceRoutes({ db, PROJECT_URL, randomBytes, response, logError: console.error })"
];
for (const marker of factoryMarkers) {
  if (!candidate.includes(marker)) throw new Error("Missing dependency-injected factory call: " + marker);
}

const dispatchMarkers = [
  "Deno.serve(async(req)=>{",
  'if(path.startsWith("/api/ycaro/"))return await ycaroRoute(req);',
  'if(path.startsWith("/api/lucca/"))return await luccaRoute(req);',
  'if(path==="/api/account"&&req.method==="GET")return await accountRoute(req);',
  'if(path==="/api/setup"&&req.method==="POST")return await login(req,true);',
  'if(path==="/api/login"&&req.method==="POST")return await login(req,false);',
  "const ctx=await contextName(req);",
  'if(path==="/api/me"&&req.method==="GET")return await meRoute(name);',
  'if(!ctx)return response({error:"Faça login para continuar."},401);',
  'if(path==="/api/logout"&&req.method==="POST")return await logoutRoute(req);',
  'if(path==="/api/health"&&req.method==="GET")return await healthRoute(req,name);',
  'if(path==="/api/status")return await statusRoute(req,name);',
  'if(path==="/api/history")return await historyRoute(req,name);',
  'if(path==="/api/chat")return await chatRoute(req,name);',
  'if(path==="/api/chat/read"&&req.method==="POST")return await readRoute(req,name);',
  'if(path==="/api/chat/typing")return await typingRoute(req,name);',
  'if(path==="/api/chat/reaction"&&req.method==="POST")return await reactionRoute(req,name);',
  'if(path.startsWith("/api/chat/")&&req.method==="PATCH")return await editRoute(req,name,path.slice("/api/chat/".length));',
  'if(path.startsWith("/api/chat/")&&req.method==="DELETE")return await deleteRoute(name,path.slice("/api/chat/".length));',
  'if(path==="/api/profiles")return await profileRoute(req,name);',
  'if(path==="/api/profile/avatar"&&req.method==="POST")return await profileRoute(req,name);',
  'if(path==="/api/profile/avatar-upload-url"&&req.method==="POST")return await signedUploadRoute(req,"avatar");',
  'if(path==="/api/chat/upload-url"&&req.method==="POST")return await signedUploadRoute(req,"chat");',
  'if(path==="/api/chat/image"&&req.method==="POST")return await mediaRoute(req,"image");',
  'if(path==="/api/chat/document"&&req.method==="POST")return await mediaRoute(req,"document");',
  'if(path==="/api/chat/audio"&&req.method==="POST")return await mediaRoute(req,"audio");',
  'if(path.startsWith("/api/remote-status"))return await remoteRoute(req,name);',
  'if(path==="/api/chat/clear"&&req.method==="POST")return await clearChatRoute(name);',
  "  }catch(e){"
];
for (const marker of dispatchMarkers) {
  if (!candidate.includes(marker)) throw new Error("Missing or changed entrypoint dispatch contract: " + marker);
}

// Presence alone is insufficient: preserve the dispatch precedence as well.
// Scope the checks to Deno.serve so similarly named helpers cannot satisfy them.
const dispatcherStart = candidate.indexOf("Deno.serve(async(req)=>{");
if (dispatcherStart < 0) throw new Error("Deno HTTP entrypoint not found.");
const dispatcherSource = candidate.slice(dispatcherStart);
const orderedDispatchMarkers = [
  'if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});',
  "  try{",
  'if(req.method==="GET" && requestUrl.pathname.endsWith("/upstatus.user.js"))',
  'const rawPath=new URL(req.url).pathname;',
  'if(path==="/upstatus.user.js"&&req.method==="GET")',
  'if(path==="/health"&&req.method==="GET")',
  'if(path==="/api/members"&&req.method==="GET")',
  'if(path==="/api/update-info"&&req.method==="GET")',
  'if(path==="/lucca"||path==="/lucca.html")',
  'if(path==="/ycaro"||path==="/ycaro.html")',
  'if(path.startsWith("/api/ycaro/"))return await ycaroRoute(req);',
  'if(path.startsWith("/api/lucca/"))return await luccaRoute(req);',
  'if(path==="/api/account"&&req.method==="GET")return await accountRoute(req);',
  'if(path==="/api/setup"&&req.method==="POST")return await login(req,true);',
  'if(path==="/api/login"&&req.method==="POST")return await login(req,false);',
  "const ctx=await contextName(req);",
  'if(path==="/api/me"&&req.method==="GET")return await meRoute(name);',
  'if(!ctx)return response({error:"Faça login para continuar."},401);',
  'if(path==="/api/logout"&&req.method==="POST")return await logoutRoute(req);',
  'if(path==="/api/health"&&req.method==="GET")return await healthRoute(req,name);',
  'if(path==="/api/status")return await statusRoute(req,name);',
  'if(path==="/api/history")return await historyRoute(req,name);',
  'if(path==="/api/chat")return await chatRoute(req,name);',
  'if(path==="/api/chat/read"&&req.method==="POST")return await readRoute(req,name);',
  'if(path==="/api/chat/typing")return await typingRoute(req,name);',
  'if(path==="/api/chat/reaction"&&req.method==="POST")return await reactionRoute(req,name);',
  'if(path.startsWith("/api/chat/")&&req.method==="PATCH")return await editRoute(req,name,path.slice("/api/chat/".length));',
  'if(path.startsWith("/api/chat/")&&req.method==="DELETE")return await deleteRoute(name,path.slice("/api/chat/".length));',
  'if(path==="/api/profiles")return await profileRoute(req,name);',
  'if(path==="/api/profile/avatar"&&req.method==="POST")return await profileRoute(req,name);',
  'if(path==="/api/profile/avatar-upload-url"&&req.method==="POST")return await signedUploadRoute(req,"avatar");',
  'if(path==="/api/chat/upload-url"&&req.method==="POST")return await signedUploadRoute(req,"chat");',
  'if(path==="/api/chat/image"&&req.method==="POST")return await mediaRoute(req,"image");',
  'if(path==="/api/chat/document"&&req.method==="POST")return await mediaRoute(req,"document");',
  'if(path==="/api/chat/audio"&&req.method==="POST")return await mediaRoute(req,"audio");',
  'if(path.startsWith("/api/remote-status"))return await remoteRoute(req,name);',
  'if(path==="/api/chat/clear"&&req.method==="POST")return await clearChatRoute(name);',
  'return response({error:"Não encontrado."},404);',
  "}catch(e){",
  "return response({error:e instanceof Error?e.message:\"Erro interno.\"},500);"
];
let previous = -1;
for (const marker of orderedDispatchMarkers) {
  // Embedded guest HTML contains its own JavaScript catch blocks. The runtime
  // error boundary is the final catch in the Deno.serve source.
  const position = marker === "}catch(e){" || marker.startsWith("return response({error:e instanceof Error?")
    ? dispatcherSource.lastIndexOf(marker)
    : dispatcherSource.indexOf(marker);
  if (position < 0) throw new Error("Missing HTTP contract marker in dispatcher: " + marker);
  if (position <= previous) throw new Error("HTTP dispatch precedence changed near: " + marker);
  previous = position;
}

fs.mkdirSync(path.join(outputRoot, "modules"), { recursive: true });
fs.writeFileSync(outputPath, candidate, "utf8");
const referenceRoot = path.join(ROOT, "dist/recovered-normal-reference");
fs.mkdirSync(referenceRoot, { recursive: true });
fs.writeFileSync(path.join(referenceRoot, "index.ts"), referenceCandidate, "utf8");
fs.writeFileSync(
  path.join(referenceRoot, "README.txt"),
  "NON-PRODUCTION REFERENCE SERVER. Recovered monolith, port adjusted to 8001 for offline differential HTTP tests only. Never deploy this output.\\n",
  "utf8"
);
for (const file of moduleFiles) {
  fs.copyFileSync(modulePaths[file], path.join(outputRoot, "modules", file));
}
fs.writeFileSync(
  path.join(outputRoot, "README.txt"),
  "NON-PRODUCTION MODULAR CANDIDATE. Generated offline for review only. The Deno entrypoint is wired to dependency-injected modules. Never deploy this output automatically.\n",
  "utf8"
);

console.log("Built isolated modular Normal candidate.");
console.log("Output: " + path.relative(ROOT, outputPath));
console.log("Reference: " + path.relative(ROOT, path.join(referenceRoot, "index.ts")));
console.log("Extracted modules: 17 dependency-injected modules (HTTP, state, auth, guests, members, status, chat, media, routes)");
console.log("Outside extracted blocks: unchanged");
console.log("Supabase/deploy actions: none");
