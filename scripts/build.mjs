#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const release=JSON.parse(fs.readFileSync(path.join(ROOT,"release.json"),"utf8"));
const baseVersion=String(release.version||"").trim();
const preRelease=String(release.preRelease||"").trim();
if(!/^\d+\.\d+\.\d+$/.test(baseVersion))throw new Error("release.json: version must use X.Y.Z");
const fullVersion=preRelease?baseVersion+"-"+preRelease:baseVersion;
const PROD_VERSION="3.5.0";

const userTemplate=fs.readFileSync(path.join(ROOT,"src/userscript/upstatus.user.template.js"),"utf8");
const serverTemplate=fs.readFileSync(path.join(ROOT,"src/server/index.template.ts"),"utf8");

const PROD_PROJECT="mvjqunhjxkbfcrxkjtgf";
// Beta 2 intentionally shares live database, Storage and Realtime through a new, isolated function slug.
const TEST_PROJECT=PROD_PROJECT;
const PROD_REALTIME_URL="https://mvjqunhjxkbfcrxkjtgf.supabase.co";
const PROD_REALTIME_KEY="sb_publishable_4_dLUWGGqyPP0prupYq8Jw_DTLJ2FlQ";
const TEST_REALTIME_URL=PROD_REALTIME_URL;
const TEST_REALTIME_KEY=PROD_REALTIME_KEY;
const PROD_FUNCTION="upstatus";
const TEST_FUNCTION="upstatus-351-test";
const PROD_TOPIC="upstatus-screen-share-live-3-1-1-beta10";
const TEST_TOPIC=PROD_TOPIC;
const PROD_RINGTONE_CHANNEL="upstatus-screen-share-3-1-1-beta9-2-ringtone-stop-v1";
const TEST_RINGTONE_CHANNEL=PROD_RINGTONE_CHANNEL;
const PROD_RINGTONE_STORAGE="upstatus_screen_share_beta8_ringtone_stop_bus";
const TEST_RINGTONE_STORAGE=PROD_RINGTONE_STORAGE;
const PROD_UPDATE_MANIFEST_URL="https://raw.githubusercontent.com/Reekyi/UpStatus/master/release.json";
const TEST_UPDATE_MANIFEST_URL="https://raw.githubusercontent.com/Reekyi/UpStatus/beta/3.5.1-beta.2-agenda-status-mirror/release.json";

function render(template,replacements){
  let out=template;
  for(const [key,value] of Object.entries(replacements))out=out.split(key).join(value);
  if(/__UPSTATUS_[A-Z0-9_]+__/.test(out))throw new Error("Unresolved build placeholder detected.");
  return out;
}
function hexEncode(text){return Buffer.from(text,"utf8").toString("hex");}
function renderUser({version,test}){
  const fn=test?TEST_FUNCTION:PROD_FUNCTION;
  const name=test?"UpStatus TEST - Sale Smartly":"UpStatus - Sale Smartly";
  const namespace=test?"upseller-test":"upseller";
  const prefix=test?"upstatus_351_beta2_":"upstatus_screen_share_beta8_";
  const topic=test?TEST_TOPIC:PROD_TOPIC;
  const ringtoneChannel=test?TEST_RINGTONE_CHANNEL:PROD_RINGTONE_CHANNEL;
  const ringtoneStorage=test?TEST_RINGTONE_STORAGE:PROD_RINGTONE_STORAGE;
  const project=test?TEST_PROJECT:PROD_PROJECT;
  const cloud="https://"+project+".supabase.co/functions/v1/"+(test?fn:"upstatus-screen-share-3-1-1-beta10");
  const realtimeUrl=test?TEST_REALTIME_URL:PROD_REALTIME_URL;
  const realtimeKey=test?TEST_REALTIME_KEY:PROD_REALTIME_KEY;
  // The beta API and updater use a dedicated function slug while sharing approved live data services.
  const updateUrl="https://"+project+".supabase.co/functions/v1/"+fn+"/upstatus.user.js";
  return render(userTemplate,{
    "__UPSTATUS_NAME__":name,
    "__UPSTATUS_NAMESPACE__":namespace,
    "__UPSTATUS_VERSION__":version,
    "__UPSTATUS_UPDATE_URL__":updateUrl,
    "__UPSTATUS_DOWNLOAD_URL__":updateUrl,
    "__UPSTATUS_UPDATE_MANIFEST_URL__":test?TEST_UPDATE_MANIFEST_URL:PROD_UPDATE_MANIFEST_URL,
    "__UPSTATUS_STORAGE_PREFIX__":prefix,
    "__UPSTATUS_CLOUD_SERVER__":cloud,
    "__UPSTATUS_REALTIME_URL__":realtimeUrl,
    "__UPSTATUS_REALTIME_KEY__":realtimeKey,
    "__UPSTATUS_REALTIME_TOPIC__":topic,
    "__UPSTATUS_RINGTONE_CHANNEL__":ringtoneChannel,
    "__UPSTATUS_RINGTONE_STORAGE_KEY__":ringtoneStorage
  });
}
function renderFunction({version,test}){
  const fn=test?TEST_FUNCTION:PROD_FUNCTION;
  const userscript=renderUser({version,test});
  return render(serverTemplate,{
    "__UPSTATUS_VERSION__":version,
    "__UPSTATUS_USERSCRIPT_HEX__":hexEncode(userscript),
    "__UPSTATUS_PATH_MARKER__":"/"+fn
  });
}
function writeFunction(fn,source){
  const dir=path.join(ROOT,"supabase/functions",fn);
  fs.rmSync(dir,{recursive:true,force:true});
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,"index.ts"),source,"utf8");
}
const prodUser=renderUser({version:PROD_VERSION,test:false});
const testUser=renderUser({version:fullVersion,test:true});
writeFunction(PROD_FUNCTION,renderFunction({version:PROD_VERSION,test:false}));
writeFunction(TEST_FUNCTION,renderFunction({version:fullVersion,test:true}));
const dist=path.join(ROOT,"dist");
fs.rmSync(dist,{recursive:true,force:true});
fs.mkdirSync(dist,{recursive:true});
fs.writeFileSync(path.join(dist,"upstatus.user.js"),prodUser,"utf8");
fs.writeFileSync(path.join(dist,TEST_FUNCTION+".user.js"),testUser,"utf8");
fs.writeFileSync(path.join(dist,"build-manifest.json"),JSON.stringify({
  baseVersion:PROD_VERSION,testVersion:fullVersion,channel:preRelease?"pre-release":"stable",
  productionFunction:PROD_FUNCTION,testFunction:TEST_FUNCTION
},null,2)+"\n","utf8");
console.log("Built UpStatus "+baseVersion+" / TEST "+fullVersion);
