#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const release=JSON.parse(fs.readFileSync(path.join(ROOT,"team-lite/release.json"),"utf8"));
const script=fs.readFileSync(path.join(ROOT,"team-lite/upstatus-team-lite.user.js"),"utf8");
function assert(ok,msg){if(!ok)throw new Error("TEAM LITE UPDATER TEST FAILED: "+msg);}
function header(name){const m=script.match(new RegExp("^// @"+name+"\\s+(.+)$","m"));return m?m[1].trim():"";}
assert(header("version")===String(release.buildVersion),"script @version must match release.json buildVersion");
assert(header("updateURL")===release.scriptUrl,"@updateURL must match the official release scriptUrl");
assert(header("downloadURL")===release.scriptUrl,"@downloadURL must match the official release scriptUrl");
assert(script.includes("var CURRENT_VERSION='"+release.buildVersion+"'"),"runtime CURRENT_VERSION must match the manifest");
assert(script.includes("fetch('https://raw.githubusercontent.com/Reekyi/UpStatus/team-lite-official/team-lite/release.json?cb='+Date.now(),{cache:'no-store'"),"updater must fetch the official manifest without cache");
assert(script.includes("if(served!==remote)throw new Error('Versões divergentes:"),"updater must reject a manifest/script version mismatch");
assert(script.includes("var cmp=compareVersions(served,installed);"),"updater must compare semantic versions");
assert(script.includes("if(cmp>0){setUpdateAvailable(true,served);"),"updater must expose an update only when the remote version is newer");
assert(script.includes("showUpdatePrompt(served);"),"updater must show the update prompt for a newer official version");
assert(script.includes("Atualização bloqueada para evitar downgrade."),"updater must prevent downgrades");
assert(script.includes("if(c&&c.target===member)pollRemoteStatus();"),"remote command broadcasts must trigger authenticated polling");
assert(!script.includes("if(c&&c.target===member)executeRemoteCommand(c);"),"remote command broadcasts must not execute their untrusted payload");
assert(script.includes("background:var(--up-chat-neutral-fill)!important;border:1px solid #a855f7!important"),"Lucca bubble needs neutral fill and purple border");
assert(script.includes("background:var(--up-chat-neutral-fill)!important;border:1px solid #f97316!important"),"Ycaro bubble needs neutral fill and orange border");
assert(script.includes("justify-content:center!important")&&script.includes("text-align:center!important"),"presence notices must be centered and text-only");
new vm.Script(script,{filename:"team-lite/upstatus-team-lite.user.js"});
const start=script.indexOf("function versionParts");
const end=script.indexOf("var updatePromptShown",start);
assert(start>=0&&end>start,"semantic version comparator functions must exist");
const compare=script.slice(start,end);
const compareVersions=new Function(compare+";return compareVersions;");
const cmp=compareVersions();
assert(cmp("3.4.31","3.4.30")>0,"3.4.31 must compare newer than 3.4.30");
assert(cmp("3.4.31","3.4.31")===0,"identical versions must compare equal");
assert(cmp("3.4.30","3.4.31")<0,"3.4.30 must compare older than 3.4.31");
console.log("Team Lite updater OK: version "+release.buildVersion+", manifest/script consistency, update prompt, downgrade guard, remote-command hardening, and visual invariants.");
