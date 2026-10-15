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
const luccaHtml=fs.readFileSync(path.join(ROOT,"lucca-site/index.html"),"utf8");
const ycaroHtml=fs.readFileSync(path.join(ROOT,"ycaro.html"),"utf8");
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
execFileSync(process.execPath,[path.join(ROOT,"scripts/chat-regression.test.mjs")],{stdio:"inherit"});
assert(prodUser.includes("if(realtimeActive&&!forceFull&&chatInitialized&&chatCache.length)return;"),"Realtime must not skip the first full chat history snapshot");
assert(testUser.includes("if(realtimeActive&&!forceFull&&chatInitialized&&chatCache.length)return;"),"TEST Realtime must not skip the first full chat history snapshot");
assert(prodUser.includes("chatPendingInitialScroll=true;")&&prodUser.includes("if(chatPendingInitialScroll){scrollChatToBottom(true);chatPendingInitialScroll=false;}"),"opening chat must retain bottom-scroll intent until history load completes");
assert(testUser.includes("chatPendingInitialScroll=true;")&&testUser.includes("if(chatPendingInitialScroll){scrollChatToBottom(true);chatPendingInitialScroll=false;}"),"TEST opening chat must retain bottom-scroll intent until history load completes");
assert(prodUser.includes("if(renderKey===chatLastRenderKey&&list.getAttribute('data-render-key')===renderKey){"),"chat render cache must be validated against the current DOM list");
assert(testUser.includes("if(renderKey===chatLastRenderKey&&list.getAttribute('data-render-key')===renderKey){"),"TEST chat render cache must be validated against the current DOM list");
assert(prodUser.includes("list.setAttribute('data-render-key',renderKey);"),"chat render must tag the current DOM list with its render key");
assert(prodUser.includes("if(nextKey!==beforeKey||!list||list.getAttribute('data-render-key')!==nextKey)renderChat();")&&prodUser.includes("markVisibleChatRead();\n        updateTypingIndicator(d.typing||[]);"),"chat read persistence must run even when history is unchanged");
assert(testUser.includes("if(nextKey!==beforeKey||!list||list.getAttribute('data-render-key')!==nextKey)renderChat();")&&testUser.includes("markVisibleChatRead();\n        updateTypingIndicator(d.typing||[]);"),"TEST chat read persistence must run even when history is unchanged");
assert(prodUser.includes("chatForceScrollBottom=true;")&&prodUser.includes("if(chatCache.length)renderChat();"),"opening chat must force scroll to the latest messages");
assert(testUser.includes("chatForceScrollBottom=true;")&&testUser.includes("if(chatCache.length)renderChat();"),"TEST opening chat must force scroll to the latest messages");
assert(prodUser.includes("setUnread(0);var k=ids.join(',');if(ids.length&&k===readSentKey)return;api('POST','/api/chat/read',{messageIds:ids})"),"read watermark must be persisted even when local message cache is empty");
assert(testUser.includes("setUnread(0);var k=ids.join(',');if(ids.length&&k===readSentKey)return;api('POST','/api/chat/read',{messageIds:ids})"),"TEST read watermark must be persisted even when local message cache is empty");

assert(prodUser.includes("function processChatNotifications(messages,initialSnapshot)"),"notification initialization must distinguish a full baseline snapshot from realtime events");
assert(prodUser.includes("function loadSeenChatNotifications()")&&prodUser.includes("function persistSeenChatNotifications()"),"chat notification deduplication must persist across page reloads");
assert(testUser.includes("chat_seen_notifications_'+member"),"TEST notification seen-ID storage must be scoped to the active member");
assert(prodUser.includes("if(!list._upstatusBottomScrollBound)")&&prodUser.includes("list.addEventListener('load',function()"),"chat must re-pin to the latest message when async media loads");
assert(testUser.includes("new ResizeObserver(function()")&&testUser.includes("Date.now()<chatOpenScrollUntil"),"TEST chat bottom-scroll intent must survive async layout changes");

assert(testUser.includes("pendingChatNotificationMessages.push(m)")&&testUser.includes("pendingChatNotificationMessages.splice(0)"),"TEST realtime messages arriving before the baseline must be queued and reconciled");
assert(prodUser.includes("processChatNotifications(incoming,!useFast);")&&testUser.includes("processChatNotifications(incoming,!useFast);"),"only full history loads may establish the initial notification baseline");
assert(prodUser.includes("Date.now()<chatOpenScrollUntil")&&testUser.includes("if(Date.now()<chatOpenScrollUntil)scrollChatToBottom(true);"),"opening chat must retain and reapply bottom-scroll intent through history completion");


const luccaInline=[...luccaHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].find(m=>!/\bsrc\s*=/.test(m[1])&&m[2].trim());
assert(!!luccaInline,"Lucca inline script missing");
checkSyntax(luccaInline[2],"lucca-site/index.html inline script");
assert(luccaHtml.includes("input.addEventListener('paste'"),"Lucca clipboard image paste handler missing");
assert(luccaHtml.includes("sendMedia(file)"),"Lucca clipboard image upload flow missing");
assert(luccaHtml.includes("chatCache=chatCache.filter(function(m){return m.id!==tempId});upsertGuestRealtimeMessage(created)"),"Lucca optimistic/realtime message deduplication missing");
assert(luccaHtml.includes("function callInviteParticipant")&&luccaHtml.includes("function callAcceptGroupInvite"),"Lucca group-call invite protocol missing");
assert(luccaHtml.includes("event:'call_signal'"),"Lucca Realtime call signaling missing");
assert(luccaHtml.includes("o.style.left='50%'")&&luccaHtml.includes("o.style.bottom='14px'")&&luccaHtml.includes("translateX(-50%)"),"Lucca call pop-out must be bottom-centered");
assert(!prodFn.includes('db.from("messages").delete().eq("user_name","Lucca");'),"Lucca login/logout/expiry must not delete shared messages");
assert(prodFn.includes("const html="+JSON.stringify(ycaroHtml)+";"),"Ycaro guest page embedding mismatch");
assert(prodFn.includes('if(path==="/ycaro"||path==="/ycaro.html")'),"Ycaro page route missing");
assert(prodFn.includes('Deno.env.get("YCARO_PASSWORD")'),"Ycaro password setting missing");
assert(prodFn.includes('cookie(req,"ycaro_session")'),"Ycaro session cookie missing");
assert(prodFn.includes('if(path.startsWith("/api/ycaro/"))return await ycaroRoute(req);'),"Ycaro API route missing");
assert(!prodFn.includes('db.from("messages").delete().eq("user_name","Ycaro")'),"Ycaro login/logout/expiry must preserve shared chat history");
assert(ycaroHtml.includes("localStorage.getItem('upstatus_ycaro_token')"),"Ycaro API session token is not sent");
assert(ycaroHtml.includes("localStorage.setItem('upstatus_ycaro_token',d.token)"),"Ycaro login token is not persisted");
assert(ycaroHtml.includes("localStorage.removeItem('upstatus_ycaro_token')"),"Ycaro logout token is not cleared");
assert(ycaroHtml.includes("#d66b1f"),"Ycaro orange theme missing");
assert(!ycaroHtml.includes("api('/api/lucca/"),"Ycaro page contains Lucca endpoints");


console.log("Validation OK: PROD "+baseVersion+" / TEST "+testVersion);
