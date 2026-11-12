#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const server=fs.readFileSync(path.join(ROOT,"src/server/team-lite-index.template.ts"),"utf8");
const client=fs.readFileSync(path.join(ROOT,"team-lite/upstatus-team-lite.user.js"),"utf8");
function assert(ok,message){if(!ok)throw new Error("TEAM LITE AVATAR HARDENING FAILED: "+message);}

const ownerStart=server.indexOf("function avatarOwnerPrefix(name:string) {");
const profileStart=server.indexOf("async function profileRoute(req:Request,name:string) {");
const profileEnd=server.indexOf("\nasync function mediaRoute",profileStart);
assert(ownerStart>=0&&profileStart>ownerStart&&profileEnd>profileStart,"owner prefix helper and profile route must exist in order");
const owner=server.slice(ownerStart,profileStart);
const profile=server.slice(profileStart,profileEnd);
assert(owner.includes('String(name||"").trim().toLowerCase()'),"owner prefix must normalize the authenticated session name");
assert(owner.includes('tokenHash(normalized).slice(0,24)'),"owner prefix must use a stable SHA-256-derived session scope");
assert(profile.includes('String(p.avatarUrl||"").trim()'),"profile route must normalize the submitted avatar URL");
assert(profile.includes('parsed.origin!==new URL(PROJECT_URL).origin'),"avatar URL must belong to this Supabase project");
assert(profile.includes('parsed.username||parsed.password||parsed.search||parsed.hash'),"avatar URL must reject credentials, query strings and fragments");
assert(profile.includes('objectPath.startsWith(avatarOwnerPrefix(name))'),"profile route must reject objects owned by another session");
assert(profile.includes('objectPath.includes("/")||objectPath.includes("\\\\")||objectPath==="."||objectPath===".."'),"profile route must reject path traversal and nested object paths");
assert(profile.includes('canonicalUrl!==parsed.toString()'),"profile route must require the canonical public URL");
assert(profile.includes('uploadFile("profile-images",String(p.dataUrl||""),2*1024*1024'),"legacy avatar uploads must retain the 2 MiB server-side limit");
assert(!profile.includes("20*1024*1024"),"profile route must not retain the 20 MiB avatar limit");

const signedStart=server.indexOf('async function signedUploadRoute(req:Request,kind:"chat"|"avatar",ownerName:string) {');
const signedEnd=server.indexOf("\nasync function remoteRoute",signedStart);
assert(signedStart>=0&&signedEnd>signedStart,"signed upload handler must receive the authenticated owner");
const signed=server.slice(signedStart,signedEnd);
assert(signed.includes('const max=kind==="avatar"?2*1024*1024:20*1024*1024;'),"signed avatar tickets must be limited to 2 MiB while chat remains 20 MiB");
assert(signed.includes('kind==="avatar"?avatarOwnerPrefix(ownerName)+fileName:fileName'),"signed avatar object paths must be scoped to the authenticated owner");
assert(signed.includes('kind==="avatar"?"O avatar deve ter no máximo 2 MB.":"O arquivo deve ter no máximo 20 MB."'),"size rejection must report the per-kind limit");
assert(signed.includes('createSignedUploadUrl(path,{upsert:true})'),"signed uploads must continue using a Storage upload ticket");

assert(server.includes('if(path==="/api/profile/avatar-upload-url"&&req.method==="POST")return await signedUploadRoute(req,"avatar",ctx.name);'),"avatar ticket route must pass the authenticated session name");
assert(server.includes('if(path==="/api/chat/upload-url"&&req.method==="POST")return await signedUploadRoute(req,"chat",ctx.name);'),"chat ticket route must preserve the authenticated session contract");

const serveStart=server.indexOf("const ctx=await contextName(req);");
const authGuard=server.indexOf('if(!ctx)return response({error:"Faça login para continuar."},401);',serveStart);
const avatarRoute=server.indexOf('if(path==="/api/profile/avatar-upload-url"&&req.method==="POST")',authGuard);
const chatRoute=server.indexOf('if(path==="/api/chat/upload-url"&&req.method==="POST")',authGuard);
assert(serveStart>=0&&authGuard>serveStart&&avatarRoute>authGuard&&chatRoute>authGuard,"both signed-upload routes must remain behind custom-session authentication");

assert(client.includes("f.size>2*1024*1024"),"Team Lite avatar picker must retain its 2 MiB client-side limit");

console.log("Team Lite avatar hardening passed: 2 MiB limit, session ownership, canonical URL and authenticated ticket routes.");
