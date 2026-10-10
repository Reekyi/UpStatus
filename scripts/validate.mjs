#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
execFileSync(process.execPath,[path.join(ROOT,"scripts/build.mjs")],{stdio:"inherit"});
const release=JSON.parse(fs.readFileSync(path.join(ROOT,"release.json"),"utf8"));
const baseVersion=String(release.version).trim();
const preRelease=String(release.preRelease||"").trim();
const testVersion=preRelease?baseVersion+"-"+preRelease:baseVersion;
const prodFn=fs.readFileSync(path.join(ROOT,"supabase/functions/upstatus/index.ts"),"utf8");
const testFn=fs.readFileSync(path.join(ROOT,"supabase/functions/upstatus-test/index.ts"),"utf8");
const prodUser=fs.readFileSync(path.join(ROOT,"dist/upstatus.user.js"),"utf8");
const testUser=fs.readFileSync(path.join(ROOT,"dist/upstatus-test.user.js"),"utf8");
function assert(ok,msg){if(!ok)throw new Error("VALIDATION FAILED: "+msg);}
function headerValue(text,name){const m=text.match(new RegExp("^// @"+name+"\\s+(.+)$","m"));return m?m[1].trim():"";}
function decodeHex(code){const m=code.match(/const USERSCRIPT_HEX = "([0-9a-f]+)";/i);assert(m,"USERSCRIPT_HEX missing");return Buffer.from(m[1],"hex").toString("utf8");}
function checkSyntax(text,label){new vm.Script(text,{filename:label});}
assert(headerValue(prodUser,"version")===baseVersion,"production userscript version mismatch");
assert(headerValue(testUser,"version")===testVersion,"test userscript version mismatch");
assert(headerValue(prodUser,"namespace")==="upseller","production namespace mismatch");
assert(headerValue(testUser,"namespace")==="upseller-test","test namespace mismatch");
assert(headerValue(prodUser,"updateURL").includes("/upstatus/upstatus.user.js"),"production updateURL mismatch");
assert(headerValue(testUser,"updateURL").includes("/upstatus-test/upstatus.user.js"),"test updateURL mismatch");
assert(!testUser.includes("/functions/v1/upstatus/upstatus.user.js"),"test userscript contains production updateURL");
assert(prodUser.includes("var key='upstatus_';"),"production storage prefix mismatch");
assert(testUser.includes("var key='upstatus_test_';"),"test storage prefix mismatch");
assert(prodUser.includes("var UP_REALTIME_TOPIC='upstatus-live-"),"production realtime topic missing");
assert(testUser.includes("var UP_REALTIME_TOPIC='upstatus-test-live-"),"test realtime topic missing");
assert(prodUser.includes("var UP_RINGTONE_CHANNEL='upstatus-call-ringtone-stop-v1';"),"production ringtone channel mismatch");
assert(testUser.includes("var UP_RINGTONE_CHANNEL='upstatus-test-call-ringtone-stop-v1';"),"test ringtone channel mismatch");
assert(prodUser.includes("var upRingtoneStorageKey='upstatus_call_ringtone_stop_bus';"),"production ringtone storage mismatch");
assert(testUser.includes("var upRingtoneStorageKey='upstatus_test_call_ringtone_stop_bus';"),"test ringtone storage mismatch");
assert(prodFn.includes('const VERSION = "'+baseVersion+'";'),"production backend version mismatch");
assert(testFn.includes('const VERSION = "'+testVersion+'";'),"test backend version mismatch");
assert(prodFn.includes('const marker="/upstatus";'),"production path marker mismatch");
assert(testFn.includes('const marker="/upstatus-test";'),"test path marker mismatch");
assert(decodeHex(prodFn)===prodUser,"production embedded userscript does not match build output");
assert(decodeHex(testFn)===testUser,"test embedded userscript does not match build output");
checkSyntax(prodUser,"dist/upstatus.user.js");
checkSyntax(testUser,"dist/upstatus-test.user.js");
const sourceTemplate=fs.readFileSync(path.join(ROOT,"src/server/index.template.ts"),"utf8");
const userTemplate=fs.readFileSync(path.join(ROOT,"src/userscript/upstatus.user.template.js"),"utf8");
const attachmentMigration=fs.readFileSync(path.join(ROOT,"supabase/migrations/20261009120000_chat_attachments_expiry.sql"),"utf8");
assert(sourceTemplate.includes("const CHAT_ATTACHMENT_TTL_MS=72*60*60*1000;"),"chat attachment TTL must be 72 hours");
assert(sourceTemplate.includes('p.type==="file"?"file"'),"backend must preserve document attachment message type");
assert(sourceTemplate.includes('path==="/api/chat/file"&&req.method==="POST"'),"document attachment upload endpoint missing");
assert(sourceTemplate.includes('createSignedUploadUrl(path,{upsert:false})'),"large document uploads must use signed direct storage uploads");
assert(sourceTemplate.includes('const CHAT_FILE_MAX_BYTES=100*1024*1024;'),"document attachment maximum must be 100 MiB");
assert(sourceTemplate.includes('path==="/api/chat/file-upload/complete"&&req.method==="POST"'),"document upload completion endpoint missing");
assert(sourceTemplate.includes('db.storage.from("chat-attachments").createSignedUrl'),"chat attachments must use signed URLs");
assert(sourceTemplate.includes("createSignedUrl(objectPath,Math.max(1,Math.floor((Date.parse(data.expires_at)-Date.now())/1000)))"),"signed URL must not outlive the attachment expiry");
assert(sourceTemplate.includes('db.storage.from("chat-attachments").remove(paths)'),"expired chat objects must be deleted through the Storage API");
assert(sourceTemplate.includes("await cleanupExpiredChatAttachments();"),"chat cleanup must run during API activity");
assert(sourceTemplate.includes('db.from("upstatus_chat_attachments").insert'),"uploaded attachments must register expiry metadata");
assert(attachmentMigration.includes("public = false"),"chat attachment bucket must be private");
assert(!attachmentMigration.includes("delete from storage.objects"),"migration must not delete Storage objects directly through SQL");
assert(!attachmentMigration.includes("pg_cron")&&!attachmentMigration.includes("cron.schedule"),"migration must not create a scheduled worker or paid infrastructure");
assert(attachmentMigration.includes("physically removed during subsequent chat API"),"migration must document opportunistic cleanup and its limitation");
assert(userTemplate.includes("Anexo expirado após 72 horas"),"chat UI must preserve an expired attachment placeholder");
assert(userTemplate.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),"DOCX file support missing");
assert(userTemplate.includes("el.href=url;el.download=''"),"download link must use the signed URL");
assert(userTemplate.includes("function uploadChatDocument(file,info)"),"100 MiB documents must upload directly to private storage");
assert(userTemplate.includes("var max=100*1024*1024;"),"userscript document size limit must be 100 MiB");
assert(!sourceTemplate.includes('getPublicUrl(path).data.publicUrl,mime')||sourceTemplate.includes('async function uploadChatAttachment'),"private chat upload path missing");
console.log("Validation OK: PROD "+baseVersion+" / TEST "+testVersion+" / private 72h chat attachments");
