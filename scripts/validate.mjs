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
const luccaPage=fs.readFileSync(path.join(ROOT,"lucca.html"),"utf8");
const ycaroPage=fs.readFileSync(path.join(ROOT,"ycaro.html"),"utf8");
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
assert(prodFn.includes("const html="+JSON.stringify(luccaPage)+";"),"Lucca guest page embedding mismatch");
assert(prodFn.includes("const html="+JSON.stringify(ycaroPage)+";"),"Ycaro guest page embedding mismatch");
assert(prodFn.includes('if(path==="/ycaro"||path==="/ycaro.html")'),"Ycaro page route missing");
assert(prodFn.includes('Deno.env.get("YCARO_PASSWORD")'),"Ycaro password setting missing");
assert(prodFn.includes('cookie(req,"ycaro_session")'),"Ycaro session cookie missing");
assert(ycaroPage.includes("%F0%9F%97%BF"),"Ycaro moai favicon missing");
assert(ycaroPage.includes("var member='Ycaro'"),"Ycaro identity mismatch");
assert(ycaroPage.includes("api('/api/ycaro/login'"),"Ycaro login endpoint mismatch");
assert(ycaroPage.includes("#ff8a1f"),"Ycaro orange theme missing");
assert(!ycaroPage.includes("api('/api/lucca/"),"Ycaro page contains Lucca endpoints");
checkSyntax(prodUser,"dist/upstatus.user.js");
checkSyntax(testUser,"dist/upstatus-test.user.js");
console.log("Validation OK: PROD "+baseVersion+" / TEST "+testVersion);
