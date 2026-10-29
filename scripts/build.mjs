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
const syncRootArtifact=process.argv.includes("--sync-root-artifact");

const userTemplate=fs.readFileSync(path.join(ROOT,"src/userscript/upstatus.user.template.js"),"utf8");
const serverTemplate=fs.readFileSync(path.join(ROOT,"src/server/index.template.ts"),"utf8");
const ycaroPage=fs.readFileSync(path.join(ROOT,"ycaro.html"),"utf8");

const PROJECT="dlfvkawaiqduhlazsszm";
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
function compareVersions(a,b){
  const left=String(a||"").split(".").map(Number),right=String(b||"").split(".").map(Number);
  for(let i=0;i<3;i++){const x=left[i]||0,y=right[i]||0;if(x!==y)return x>y?1:-1;}
  return 0;
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
  const cloud=test?"https://"+PROJECT+".supabase.co/functions/v1/"+fn:"https://"+PROJECT+".supabase.co/functions/v1/upstatus-screen-share-3-1-1-beta10";
  const updateUrl=test?cloud+"/upstatus.user.js":String(release.scriptUrl||("https://"+PROJECT+".supabase.co/functions/v1/upstatus/upstatus.user.js")).trim();
  if(!updateUrl)throw new Error("Could not determine the production userscript update URL.");
  if(!test&&!/^https:\/\/[^/]+\/functions\/v1\/upstatus\/upstatus\.user\.js$/.test(updateUrl))throw new Error("release.json: scriptUrl must point to the production /upstatus/upstatus.user.js endpoint.");
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
    "__UPSTATUS_PATH_MARKER__":"/"+fn,
    "__UPSTATUS_YCARO_HTML_EXPR__":JSON.stringify(ycaroPage)
  });
}
function writeFunction(fn,source){
  const dir=path.join(ROOT,"supabase/functions",fn);
  // Preserve tracked sidecar files; only the generated entrypoint belongs to this build.
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,"index.ts"),source,"utf8");
}
const prodUser=renderUser({version:baseVersion,test:false});
const testUser=renderUser({version:fullVersion,test:true});
let rootArtifactPath=null;
if(syncRootArtifact){
  rootArtifactPath=path.join(ROOT,"UpStatus.user.js");
  const currentArtifact=fs.readFileSync(rootArtifactPath,"utf8");
  const currentVersion=(currentArtifact.match(/^\/\/ @version\s+(.+)$/m)||[])[1]||"";
  if(currentArtifact!==prodUser&&(!/^\d+\.\d+\.\d+$/.test(currentVersion)||compareVersions(baseVersion,currentVersion)<=0))throw new Error("Refusing to sync UpStatus.user.js unless release.json.version is greater than the tracked artifact version ("+currentVersion+"). Increment release.json.version before updating the tracked distribution artifact.");
}
writeFunction(PROD_FUNCTION,renderFunction({version:baseVersion,test:false}));
writeFunction(TEST_FUNCTION,renderFunction({version:fullVersion,test:true}));
const dist=path.join(ROOT,"dist");
fs.mkdirSync(dist,{recursive:true});
fs.writeFileSync(path.join(dist,"upstatus.user.js"),prodUser,"utf8");
fs.writeFileSync(path.join(dist,"upstatus-test.user.js"),testUser,"utf8");
fs.writeFileSync(path.join(dist,"build-manifest.json"),JSON.stringify({
  baseVersion,testVersion:fullVersion,channel:preRelease?"pre-release":"stable",
  productionFunction:PROD_FUNCTION,testFunction:TEST_FUNCTION
},null,2)+"\n","utf8");
if(syncRootArtifact){
  fs.writeFileSync(rootArtifactPath,prodUser,"utf8");
  console.log("Synchronized tracked UpStatus.user.js artifact.");
}
console.log("Built UpStatus "+baseVersion+" / TEST "+fullVersion);
