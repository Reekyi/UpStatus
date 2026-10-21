#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const release=JSON.parse(fs.readFileSync(path.join(ROOT,"release.json"),"utf8"));
const baseVersion=String(release.version||"").trim();
const preRelease=String(release.preRelease||"").trim();
const version=preRelease?baseVersion+"-"+preRelease:baseVersion;
if(version!=="3.0.52-beta5")throw new Error("This isolated builder only publishes 3.0.52-beta5.");
const PROJECT="dlfvkawaiqduhlazsszm";
const FUNCTION="upstatus-test-3-0-52-beta5";
const userTemplate=fs.readFileSync(path.join(ROOT,"src/userscript/upstatus.user.template.js"),"utf8");
const serverTemplate=fs.readFileSync(path.join(ROOT,"src/server/index.template.ts"),"utf8");
const ycaroPage=fs.readFileSync(path.join(ROOT,"ycaro.html"),"utf8");
function render(t,replacements){let out=t;for(const [a,b] of Object.entries(replacements))out=out.split(a).join(b);if(/__UPSTATUS_[A-Z0-9_]+__/.test(out))throw new Error("Unresolved build placeholder.");return out;}
const cloud="https://"+PROJECT+".supabase.co/functions/v1/"+FUNCTION;
const user=render(userTemplate,{
 "__UPSTATUS_NAME__":"UpStatus Beta 3.0.52-beta5 - Sale Smartly",
 "__UPSTATUS_NAMESPACE__":"upseller-test-3-0-52-beta5",
 "__UPSTATUS_VERSION__":version,
 "__UPSTATUS_UPDATE_URL__":cloud+"/upstatus.user.js",
 "__UPSTATUS_DOWNLOAD_URL__":cloud+"/upstatus.user.js",
 "__UPSTATUS_STORAGE_PREFIX__":"upstatus_test_3_0_52_beta5_",
 "__UPSTATUS_CLOUD_SERVER__":cloud,
 "__UPSTATUS_REALTIME_TOPIC__":"upstatus-test-3-0-52-beta5-live-v1",
 "__UPSTATUS_RINGTONE_CHANNEL__":"upstatus-test-3-0-52-beta5-ringtone-v1",
 "__UPSTATUS_RINGTONE_STORAGE_KEY__":"upstatus_test_3_0_52_beta5_ringtone_bus"
});
new vm.Script(user,{filename:"dist/upstatus-test-3-0-52-beta5.user.js"});
if(!user.includes("voice_room_signal")||!user.includes("up-voice-room"))throw new Error("Team voice room implementation is missing.");
if(user.includes('class="up-member-barui"')||user.includes('class="up-member-power"')||user.includes('class="up-member-call-indicator"'))throw new Error("Legacy per-member call/power controls must not ship.");
const server=render(serverTemplate,{
 "__UPSTATUS_VERSION__":version,
 "__UPSTATUS_USERSCRIPT_HEX__":Buffer.from(user,"utf8").toString("hex"),
 "__UPSTATUS_PATH_MARKER__":"/"+FUNCTION,
 "__UPSTATUS_YCARO_HTML_EXPR__":JSON.stringify(ycaroPage)
});
const fnDir=path.join(ROOT,"supabase/functions",FUNCTION);
fs.mkdirSync(fnDir,{recursive:true});
fs.writeFileSync(path.join(fnDir,"index.ts"),server,"utf8");
const dist=path.join(ROOT,"dist");fs.mkdirSync(dist,{recursive:true});
fs.writeFileSync(path.join(dist,FUNCTION+".user.js"),user,"utf8");
fs.writeFileSync(path.join(dist,"build-manifest-"+FUNCTION+".json"),JSON.stringify({version,function:FUNCTION,namespace:"upseller-test-3-0-52-beta5",updateUrl:cloud+"/upstatus.user.js",storagePrefix:"upstatus_test_3_0_52_beta5_",realtimeTopic:"upstatus-test-3-0-52-beta5-live-v1"},null,2)+"\n","utf8");
console.log("Built "+version+" for isolated function "+FUNCTION);
