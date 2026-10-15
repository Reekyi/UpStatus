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
assert(prodUser.includes("list.getAttribute('data-render-key')===renderKey")&&prodUser.includes("list.setAttribute('data-render-key',renderKey)"),"a rebuilt chat list must render even when the global render key is unchanged");
assert(prodUser.includes("var chatInitialLoadScrollPending=false;")&&prodUser.includes("chatInitialLoadScrollPending=true;"),"opening the chat must retain bottom-scroll intent until the fresh history response arrives");
assert(prodUser.includes("if(chatInitialLoadScrollPending)chatForceScrollBottom=true;")&&prodUser.includes("if(chatInitialLoadScrollPending){\n          chatInitialLoadScrollPending=false;\n          scrollChatToBottom(true);"),"fresh history rendering must consume the initial bottom-scroll intent only after data arrives");
assert(prodUser.includes("function chatMessageAlreadyRead(m)")&&prodUser.includes("created<=chatLastReadAt"),"persisted read watermark must suppress notifications for previously read messages");
assert(prodUser.includes("!chatMessageAlreadyRead(m))setUnread(chatUnread+1)"),"Realtime events for previously read messages must not inflate unread count");
assert(testFn.includes("lastReadAt:me?.last_read_at||null"),"full chat history must expose the persisted read watermark to clients");
assert(testFn.includes("!(readBy[m.id]||[]).some((reader)=>normalizedReader(reader)===normalizedReader(name))"),"unread counts must honor normalized per-message read receipts");
assert(testFn.includes("if(readRes.error)throw readRes.error"),"failed read-state lookup must not report every message as unread");
assert(testFn.includes("if(currentError)throw currentError")&&testFn.includes("if(validError)throw validError"),"read receipt write must not silently overwrite state after failed reads");
assert(testUser.includes("list.getAttribute('data-render-key')===renderKey")&&testUser.includes("function chatMessageAlreadyRead(m)"),"TEST userscript must contain chat render and read-notification regression fixes");
assert(!testUser.includes("if(realtimeActive&&!forceFull)return;"),"Realtime must not disable HTTP fallback polling");
assert(testUser.includes("Date.now()-chatLastFullLoadAt<30000"),"incremental polling must periodically refresh full history/read state");
assert(testUser.includes("if(chatLoading){if(forceFull)chatFullReloadPending=true;return;}")&&testUser.includes("if(chatFullReloadPending&&token)"),"forced chat-open history loads must be queued while a request is in flight");
assert(testUser.includes("var chatFullReloadPending=false,chatLastFullLoadAt=0,chatReadInFlightKey='',chatReadPending=false;"),"chat history and read receipt requests must be coordinated");
assert(testFn.includes("normalizedReader(reader)===normalizedReader(name)"),"unread counts must compare read receipts case-insensitively");
assert(testFn.includes('String(reader||"").trim().toLocaleLowerCase()===String(name||"").trim().toLocaleLowerCase()'),"read receipt writes must deduplicate member names case-insensitively");
console.log("Validation OK: PROD "+baseVersion+" / TEST "+testVersion+" / chat read-scroll regression guards");
