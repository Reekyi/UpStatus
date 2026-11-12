#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const client=fs.readFileSync(path.join(ROOT,"src/userscript/upstatus.user.template.js"),"utf8");
const server=fs.readFileSync(path.join(ROOT,"src/server/index.template.ts"),"utf8");
function assert(ok,message){if(!ok)throw new Error("SIGNED UPLOAD PARITY FAILED: "+message);}

assert(client.includes("uploadFileDirect(file,'/api/chat/upload-url')"),"chat attachments must request a signed upload ticket");
assert(client.includes("uploadFileDirect(file,'/api/profile/avatar-upload-url')"),"profile avatars must request a signed upload ticket");
assert(client.includes("api('POST',route,{mime:info.mime,size:file.size,name:String(file.name||'arquivo')})"),"client ticket request must include MIME, size and filename");
assert(client.includes("fetch(url.toString(),{method:'PUT'"),"client must upload file bytes with PUT to the signed URL");
assert(client.includes("headers:{'Content-Type':info.mime,'x-upsert':'true'"),"client PUT must preserve the declared MIME and upsert contract");

const routeStart=server.indexOf('async function signedUploadRoute(req:Request,kind:"chat"|"avatar") {');
const routeEnd=server.indexOf("\n\nasync function remoteRoute",routeStart);
assert(routeStart>=0&&routeEnd>routeStart,"server template must implement the signed upload route handler");
const route=server.slice(routeStart,routeEnd);
assert(route.includes('kind==="avatar"?"profile-images":"chat-images"'),"signed upload handler must select only the intended bucket");
assert(route.includes("const max=20*1024*1024;"),"signed upload handler must enforce the 20 MiB contract");
assert(route.includes("if(!allowed.has(mime))return response"),"signed upload handler must validate allowed MIME types");
assert(route.includes("!Number.isFinite(size)||size<1||size>max"),"signed upload handler must validate the declared size");
assert(route.includes("createSignedUploadUrl(path,{upsert:true})"),"signed upload handler must request a Storage signed-upload token");
assert(route.includes("uploadUrl:uploadUrl.toString()")&&route.includes("publicUrl")&&route.includes("token:uploadToken")&&route.includes("path:signedPath"),"signed upload response must include the client ticket fields");

assert(server.includes('if(path==="/api/chat/upload-url"&&req.method==="POST")return await signedUploadRoute(req,"chat");'),"chat signed-upload route must be POST-only and connected to the handler");
assert(server.includes('if(path==="/api/profile/avatar-upload-url"&&req.method==="POST")return await signedUploadRoute(req,"avatar");'),"avatar signed-upload route must be POST-only and connected to the handler");

const profileStart=server.indexOf('async function profileRoute(req:Request,name:string) {');
const profileEnd=server.indexOf("\nasync function mediaRoute",profileStart);
assert(profileStart>=0&&profileEnd>profileStart,"profile route must exist");
const profile=server.slice(profileStart,profileEnd);
assert(profile.includes('String(p.avatarUrl||"").trim()'),"profile route must accept the signed-upload public URL");
assert(profile.includes('new URL(PROJECT_URL).origin')&&profile.includes('/storage/v1/object/public/profile-images/'),"avatar URL must be restricted to this project's public profile-images bucket");
assert(profile.includes("getPublicUrl(objectPath).data.publicUrl"),"avatar URL must be canonicalized against the configured bucket");
assert(profile.includes('String(p.dataUrl||"")'),"legacy avatar data-URL clients must remain compatible");


const serveStart=server.indexOf("Deno.serve(async(req)=>{");
const contextStart=server.indexOf("const ctx=await contextName(req);",serveStart);
const contextNameLine=server.indexOf("const name=ctx?.name||null;",contextStart);
const authGuard=server.indexOf('if(!ctx)return response({error:"Faça login para continuar."},401);',contextStart);
const chatTicketRoute=server.indexOf('if(path==="/api/chat/upload-url"&&req.method==="POST")return await signedUploadRoute(req,"chat");',authGuard);
const avatarTicketRoute=server.indexOf('if(path==="/api/profile/avatar-upload-url"&&req.method==="POST")return await signedUploadRoute(req,"avatar");',authGuard);
assert(serveStart>=0&&contextStart>serveStart&&contextNameLine>contextStart&&authGuard>contextNameLine,
  "server must resolve the custom session and reject missing sessions before API routes");
assert(chatTicketRoute>authGuard&&avatarTicketRoute>authGuard,
  "signed-upload routes must remain behind custom-session auth guard");

console.log("Signed upload parity passed: chat/avatar routes, ticket fields, PUT contract and profile URL validation.");
