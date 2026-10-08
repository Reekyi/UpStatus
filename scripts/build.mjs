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

const userTemplate=fs.readFileSync(path.join(ROOT,"src/userscript/upstatus.user.template.js"),"utf8");
const serverTemplate=fs.readFileSync(path.join(ROOT,"src/server/index.template.ts"),"utf8");

const PROJECT="dlfvkawaiqduhlazsszm";
const PROD_FUNCTION="upstatus";
const TEST_FUNCTION="upstatus-test";
const PROD_TOPIC="upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0";
const TEST_TOPIC=PROD_TOPIC;
const PROD_RINGTONE_CHANNEL="upstatus-call-ringtone-stop-v1";
const TEST_RINGTONE_CHANNEL="upstatus-test-call-ringtone-stop-v1";
const PROD_RINGTONE_STORAGE="upstatus_call_ringtone_stop_bus";
const TEST_RINGTONE_STORAGE="upstatus_test_call_ringtone_stop_bus";

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
  const prefix=test?"upstatus_test_":"upstatus_";
  const topic=test?TEST_TOPIC:PROD_TOPIC;
  const ringtoneChannel=test?TEST_RINGTONE_CHANNEL:PROD_RINGTONE_CHANNEL;
  const ringtoneStorage=test?TEST_RINGTONE_STORAGE:PROD_RINGTONE_STORAGE;
  const cloud="https://"+PROJECT+".supabase.co/functions/v1/"+fn;
  const updateUrl=cloud+"/upstatus.user.js";
  return render(userTemplate,{
    "__UPSTATUS_NAME__":name,
    "__UPSTATUS_NAMESPACE__":namespace,
    "__UPSTATUS_VERSION__":version,
    "__UPSTATUS_UPDATE_URL__":updateUrl,
    "__UPSTATUS_DOWNLOAD_URL__":updateUrl,
    "__UPSTATUS_STORAGE_PREFIX__":prefix,
    "__UPSTATUS_CLOUD_SERVER__":cloud,
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
const prodUser=renderUser({version:baseVersion,test:false});
const testUser=renderUser({version:fullVersion,test:true});
writeFunction(PROD_FUNCTION,renderFunction({version:baseVersion,test:false}));
writeFunction(TEST_FUNCTION,renderFunction({version:fullVersion,test:true}));
const dist=path.join(ROOT,"dist");
fs.rmSync(dist,{recursive:true,force:true});
fs.mkdirSync(dist,{recursive:true});
fs.writeFileSync(path.join(dist,"upstatus.user.js"),prodUser,"utf8");
fs.writeFileSync(path.join(dist,"upstatus-test.user.js"),testUser,"utf8");
fs.writeFileSync(path.join(dist,"build-manifest.json"),JSON.stringify({
  baseVersion,testVersion:fullVersion,channel:preRelease?"pre-release":"stable",
  productionFunction:PROD_FUNCTION,testFunction:TEST_FUNCTION
},null,2)+"\n","utf8");
console.log("Built UpStatus "+baseVersion+" / TEST "+fullVersion);
