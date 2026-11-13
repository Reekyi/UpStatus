#!/usr/bin/env node
import fs from "node:fs";
import vm from "node:vm";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const server=fs.readFileSync(path.join(ROOT,"src/server/team-lite-index.template.ts"),"utf8");
const client=fs.readFileSync(path.join(ROOT,"team-lite/upstatus-team-lite.user.js"),"utf8");
function assert(ok,message){if(!ok)throw new Error("TEAM LITE AVATAR HARDENING FAILED: "+message);}

const identityStart=server.indexOf("function uniqueAvatarUserId(rows:any[]) {");
const ownerStart=server.indexOf("function avatarOwnerPrefix(userId:string|number) {",identityStart);
const profileStart=server.indexOf("async function profileRoute(req:Request,name:string) {");
const profileEnd=server.indexOf("\nasync function mediaRoute",profileStart);
assert(identityStart>=0&&ownerStart>identityStart&&profileStart>ownerStart&&profileEnd>profileStart,"immutable user identity helpers and profile route must exist in order");
const identity=server.slice(identityStart,ownerStart);
const owner=server.slice(ownerStart,profileStart);
const profile=server.slice(profileStart,profileEnd);
assert(identity.includes('db.from("users").select("id").eq("name",normalized).limit(2)'),"avatar ownership must resolve users.id and inspect up to two matching names");
assert(identity.includes("return uniqueAvatarUserId(data);"),"avatar identity lookup must reject missing or ambiguous users");
assert(owner.includes('tokenHash("upstatus-user-id:"+normalized).slice(0,24)'),"owner prefix must derive from immutable users.id, not the session name");
assert(owner.includes('if(!/^[0-9]+$/.test(normalized))'),"owner prefix must reject non-numeric user identifiers");
const identitySource=server.match(/function uniqueAvatarUserId\(rows:any\[\]\) \{[\s\S]*?\n\}/);
assert(identitySource,"pure unique-user resolver must be present");
const uniqueAvatarUserId=vm.runInNewContext("("+identitySource[0].replace("function uniqueAvatarUserId(rows:any[])","function uniqueAvatarUserId(rows)")+")");
assert(uniqueAvatarUserId([{id:42}])==="42","one valid users.id must resolve");
assert(uniqueAvatarUserId([])===null,"missing user must fail closed");
assert(uniqueAvatarUserId([{id:42},{id:43}])===null,"duplicate names must fail closed");
assert(uniqueAvatarUserId([{id:"not-an-id"}])===null,"invalid user IDs must fail closed");
const prefixSource=server.match(/function avatarOwnerPrefix\(userId:string\|number\) \{[\s\S]*?\n\}/);
assert(prefixSource,"immutable avatar owner prefix helper must be present");
const avatarOwnerPrefix=vm.runInNewContext("("+prefixSource[0].replace("function avatarOwnerPrefix(userId:string|number)","function avatarOwnerPrefix(userId)")+")",{tokenHash:value=>createHash("sha256").update(value).digest("hex")});
assert(avatarOwnerPrefix(42)===avatarOwnerPrefix("42"),"numeric user ID must have a stable owner prefix");
assert(avatarOwnerPrefix(42)!==avatarOwnerPrefix(43),"different users must have different owner prefixes");
assert.throws(()=>avatarOwnerPrefix("Ricardo"),/Identidade de usuário inválida/,"session names must not be accepted as owner identifiers");
assert(profile.includes("const userId=await avatarUserId(name);"),"profile save must resolve the immutable user ID");
assert(profile.includes('if(!userId)return response({error:"Não foi possível identificar sua conta com segurança."},409);'),"ambiguous or missing user identity must fail closed");
assert(profile.includes("objectPath.startsWith(ownerPrefix)"),"profile route must reject objects owned by another immutable user ID");
assert(profile.includes('uploadFile("profile-images",String(p.dataUrl||""),2*1024*1024,new Set(["image/png","image/jpeg","image/webp","image/gif"]),ownerPrefix)'),"legacy avatar uploads must use the same immutable owner prefix");
assert(profile.includes('String(p.avatarUrl||"").trim()'),"profile route must normalize the submitted avatar URL");
assert(profile.includes('parsed.origin!==new URL(PROJECT_URL).origin'),"avatar URL must belong to this Supabase project");
assert(profile.includes('parsed.username||parsed.password||parsed.search||parsed.hash'),"avatar URL must reject credentials, query strings and fragments");
assert(profile.includes("objectPath.startsWith(ownerPrefix)"),"profile route must reject objects owned by another immutable user ID");
assert(profile.includes('objectPath.includes("/")||objectPath.includes("\\\\")||objectPath==="."||objectPath===".."'),"profile route must reject path traversal and nested object paths");
assert(profile.includes('canonicalUrl!==parsed.toString()'),"profile route must require the canonical public URL");
assert(profile.includes('uploadFile("profile-images",String(p.dataUrl||""),2*1024*1024,new Set(["image/png","image/jpeg","image/webp","image/gif"]),ownerPrefix)'),"legacy avatar uploads must retain the 2 MiB limit and immutable owner prefix");
assert(!profile.includes("20*1024*1024"),"profile route must not retain the 20 MiB avatar limit");

const signedStart=server.indexOf('async function signedUploadRoute(req:Request,kind:"chat"|"avatar",ownerName:string) {');
const signedEnd=server.indexOf("\nasync function remoteRoute",signedStart);
assert(signedStart>=0&&signedEnd>signedStart,"signed upload handler must receive the authenticated owner");
const signed=server.slice(signedStart,signedEnd);
assert(signed.includes('const max=kind==="avatar"?2*1024*1024:20*1024*1024;'),"signed avatar tickets must be limited to 2 MiB while chat remains 20 MiB");
assert(signed.includes('const ownerId=kind==="avatar"?await avatarUserId(ownerName):"";'),"signed avatar tickets must resolve the immutable users.id");
assert(signed.includes('const ownerPrefix=kind==="avatar"?avatarOwnerPrefix(ownerId):"";'),"signed avatar tickets must derive the path prefix from users.id");
assert(signed.includes('kind==="avatar"?ownerPrefix+fileName:fileName'),"signed avatar object paths must be scoped to the authenticated user ID");
assert(signed.includes('kind==="avatar"?"O avatar deve ter no máximo 2 MB.":"O arquivo deve ter no máximo 20 MB."'),"size rejection must report the per-kind limit");
assert(signed.includes('createSignedUploadUrl(path,{upsert:true})'),"signed uploads must continue using a Storage upload ticket");

assert(server.includes('if(path==="/api/profile/avatar-upload-url"&&req.method==="POST")return await signedUploadRoute(req,"avatar",ctx.name);'),"avatar ticket route must pass the authenticated session name");
assert(server.includes('if(path==="/api/chat/upload-url"&&req.method==="POST")return await signedUploadRoute(req,"chat",ctx.name);'),"chat ticket route must preserve the authenticated session contract");

const serveStart=server.indexOf("const ctx=await contextName(req);");
const authGuard=server.indexOf('if(!ctx)return response({error:"Faça login para continuar."},401);',serveStart);
const avatarRoute=server.indexOf('if(path==="/api/profile/avatar-upload-url"&&req.method==="POST")',authGuard);
const chatRoute=server.indexOf('if(path==="/api/chat/upload-url"&&req.method==="POST")',authGuard);
assert(serveStart>=0&&authGuard>serveStart&&avatarRoute>authGuard&&chatRoute>authGuard,"both signed-upload routes must remain behind custom-session authentication");

const profilePreviewStart=client.indexOf("function fileToDataUrlForProfile(file,type,ext){");
const profilePreviewEnd=client.indexOf("\n  function uploadFileDirect",profilePreviewStart);
assert(profilePreviewStart>=0&&profilePreviewEnd>profilePreviewStart,"profile preview helper must exist");
const profilePreview=client.slice(profilePreviewStart,profilePreviewEnd);
assert(profilePreview.includes("file.size>2*1024*1024"),"profile preview must reject avatars above 2 MiB before reading bytes");

const clientUploadStart=client.indexOf("function uploadFileDirect(file,route){");
const clientUploadEnd=client.indexOf("\n  function sendChatMedia",clientUploadStart);
assert(clientUploadStart>=0&&clientUploadEnd>clientUploadStart,"signed upload client helper must exist");
const clientUpload=client.slice(clientUploadStart,clientUploadEnd);
assert(clientUpload.includes("route==='/api/profile/avatar-upload-url'?2*1024*1024:20*1024*1024"),"client ticket helper must use 2 MiB for avatars and preserve 20 MiB for chat attachments");
assert(clientUpload.includes("if(file.size>max)"),"client ticket helper must reject oversized files before requesting a ticket");
assert(client.includes("uploadFileDirect(file,'/api/profile/avatar-upload-url')"),"profile save must use the signed avatar route");

const profileChangeStart=client.indexOf("profileModal.querySelector('.up-chat-profile-file').onchange=function(){");
const profileSaveStart=client.indexOf("profileModal.querySelector('.up-chat-profile-save').onclick",profileChangeStart);
assert(profileChangeStart>=0&&profileSaveStart>profileChangeStart,"profile file picker handler must exist");
const profileChange=client.slice(profileChangeStart,profileSaveStart);
assert(profileChange.includes("if(f.size>2*1024*1024)"),"profile file picker must enforce the 2 MiB limit before preview");
assert(profileChange.includes("A foto deve ter no máximo 2 MB."),"profile file picker must explain the 2 MiB limit");

console.log("Team Lite avatar hardening passed: 2 MiB limit, session ownership, canonical URL and authenticated ticket routes.");
