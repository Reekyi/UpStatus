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
const ycaroPage=fs.readFileSync(path.join(ROOT,"ycaro.html"),"utf8");

const PROJECT="dlfvkawaiqduhlazsszm";
const ISOLATED_SIGNALING_PROJECT="bfpjtfqlnypisxljoxkb";
const TEST_PROJECT_SENTINEL="00000000000000000000";
const PRODUCTION_REALTIME_KEY="sb_publishable_qoML52WUyBQRMB6DLP1yjw_J0Pbaae_";
const configuredTestProject=String(process.env.UPSTATUS_TEST_PROJECT_ID||"").trim();
const configuredTestRealtimeKey=String(process.env.UPSTATUS_TEST_PUBLISHABLE_KEY||"").trim();
if(configuredTestRealtimeKey&&!configuredTestProject)throw new Error("UPSTATUS_TEST_PUBLISHABLE_KEY requires UPSTATUS_TEST_PROJECT_ID.");
const TEST_PROJECT=configuredTestProject||TEST_PROJECT_SENTINEL;
if(!/^[a-z0-9]{20}$/.test(TEST_PROJECT))throw new Error("UPSTATUS_TEST_PROJECT_ID must be a 20-character lowercase Supabase project reference.");
if(configuredTestProject&&TEST_PROJECT===TEST_PROJECT_SENTINEL)throw new Error("The inert TEST project sentinel cannot be configured as a real project.");
if(TEST_PROJECT===PROJECT)throw new Error("Refusing to build TEST artifacts against the production Supabase project.");
if(TEST_PROJECT===ISOLATED_SIGNALING_PROJECT)throw new Error("Refusing to build full TEST artifacts against the isolated signaling/auth project.");
if(configuredTestProject&&!configuredTestRealtimeKey)throw new Error("UPSTATUS_TEST_PUBLISHABLE_KEY is required when UPSTATUS_TEST_PROJECT_ID is configured.");
if(configuredTestProject&&configuredTestRealtimeKey===PRODUCTION_REALTIME_KEY)throw new Error("TEST publishable key must not equal the production publishable key.");
const TEST_REALTIME_KEY=configuredTestProject?configuredTestRealtimeKey:"sb_publishable_inert_test_target_not_configured";
const PROD_FUNCTION="upstatus";
const TEST_FUNCTION="upstatus-test";
const PROD_TOPIC="upstatus-screen-share-live-3-1-1-beta10";
const TEST_TOPIC="upstatus-test-live-20261007-v1";
const PROD_RINGTONE_CHANNEL="upstatus-screen-share-3-1-1-beta9-2-ringtone-stop-v1";
const TEST_RINGTONE_CHANNEL="upstatus-test-call-ringtone-stop-v1";
const PROD_RINGTONE_STORAGE="upstatus_screen_share_beta8_ringtone_stop_bus";
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
  const prefix=test?"upstatus_test_":"upstatus_screen_share_beta8_";
  const topic=test?TEST_TOPIC:PROD_TOPIC;
  const ringtoneChannel=test?TEST_RINGTONE_CHANNEL:PROD_RINGTONE_CHANNEL;
  const ringtoneStorage=test?TEST_RINGTONE_STORAGE:PROD_RINGTONE_STORAGE;
  const cloud="https://"+(test?TEST_PROJECT:PROJECT)+".supabase.co/functions/v1/"+fn;
  const expectedProductionUpdateUrl="https://"+PROJECT+".supabase.co/functions/v1/"+PROD_FUNCTION+"/upstatus.user.js";
  const configuredProductionUpdateUrl=String(release.scriptUrl||"").trim();
  if(!test&&configuredProductionUpdateUrl!==expectedProductionUpdateUrl)throw new Error("release.json: scriptUrl must exactly match the configured production project and /upstatus/upstatus.user.js endpoint.");
  const updateUrl=test?cloud+"/upstatus.user.js":expectedProductionUpdateUrl;
  return render(userTemplate,{
    "__UPSTATUS_NAME__":name,
    "__UPSTATUS_NAMESPACE__":namespace,
    "__UPSTATUS_VERSION__":version,
    "__UPSTATUS_UPDATE_URL__":updateUrl,
    "__UPSTATUS_DOWNLOAD_URL__":updateUrl,
    "__UPSTATUS_RELEASE_MANIFEST_URL__":test?"":"https://raw.githubusercontent.com/Reekyi/UpStatus/master/release.json",
    "__UPSTATUS_STORAGE_PREFIX__":prefix,
    "__UPSTATUS_CLOUD_SERVER__":cloud,
    "__UPSTATUS_REALTIME_URL__":"https://"+(test?TEST_PROJECT:PROJECT)+".supabase.co",
    "__UPSTATUS_REALTIME_KEY__":test?TEST_REALTIME_KEY:PRODUCTION_REALTIME_KEY,
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
    "__UPSTATUS_PATH_MARKER__":"/"+fn,
    "__UPSTATUS_YCARO_HTML_EXPR__":JSON.stringify(ycaroPage)
  });
}
function writeFunction(fn,source){
  const dir=path.join(ROOT,"supabase/functions",fn);
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
  productionFunction:PROD_FUNCTION,testFunction:TEST_FUNCTION,
  testProjectId:TEST_PROJECT,testTargetConfigured:Boolean(configuredTestProject),
  testRealtimeKeyConfigured:Boolean(configuredTestRealtimeKey)
},null,2)+"\n","utf8");
console.log("Built UpStatus "+baseVersion+" / TEST "+fullVersion+" / TEST target "+(configuredTestProject?TEST_PROJECT:"inert sentinel (not deployable)"));
