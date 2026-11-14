#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
execFileSync(process.execPath,[path.join(ROOT,"scripts/build.mjs")],{stdio:"inherit"});

const release=JSON.parse(fs.readFileSync(path.join(ROOT,"release.json"),"utf8"));
const buildSource=fs.readFileSync(path.join(ROOT,"scripts/build.mjs"),"utf8");
const template=fs.readFileSync(path.join(ROOT,"src/userscript/upstatus.user.template.js"),"utf8");
const deployWorkflow=fs.readFileSync(path.join(ROOT,".github/workflows/deploy-production.yml"),"utf8");
const prodUser=fs.readFileSync(path.join(ROOT,"dist/upstatus.user.js"),"utf8");
const testUser=fs.readFileSync(path.join(ROOT,"dist/upstatus-test.user.js"),"utf8");

function assert(ok,msg){if(!ok)throw new Error("QA RELEASE TARGET FAILED: "+msg);}
function headerValue(text,name){const m=text.match(new RegExp("^// @"+name+"\\s+(.+)$","m"));return m?m[1].trim():"";}

const project=buildSource.match(/const PROJECT="([^"]+)";/)?.[1];
const productionFunction=buildSource.match(/const PROD_FUNCTION="([^"]+)";/)?.[1];
const testFunction=buildSource.match(/const TEST_FUNCTION="([^"]+)";/)?.[1];
assert(project&&productionFunction&&testFunction,"build configuration must declare production and TEST functions");

const expectedProductionUpdateUrl=String(release.scriptUrl||("https://"+project+".supabase.co/functions/v1/"+productionFunction+"/upstatus.user.js")).trim();
const expectedTestUpdateUrl="https://"+project+".supabase.co/functions/v1/"+testFunction+"/upstatus.user.js";

assert(headerValue(prodUser,"updateURL")===expectedProductionUpdateUrl,"Normal updateURL must match release.json");
assert(headerValue(prodUser,"downloadURL")===expectedProductionUpdateUrl,"Normal downloadURL must match release.json");
assert(prodUser.includes("var UPDATE_URL='"+expectedProductionUpdateUrl+"';"),"Normal manual updater must use the stable URL");
assert(prodUser.includes("var RELEASE_MANIFEST_URL='https://raw.githubusercontent.com/Reekyi/UpStatus/master/release.json';"),"Normal updater must use the stable manifest");
assert(prodUser.includes("var CLOUD_SERVER='https://"+project+".supabase.co/functions/v1/"+productionFunction+"';"),"Normal API target must match PROD_FUNCTION");
assert(!prodUser.includes("upstatus-screen-share-3-1-1-beta10"),"Normal API must not use the legacy beta10 function");
assert(deployWorkflow.includes("supabase functions deploy "+productionFunction+" --project-ref"),"Normal build target must match the deploy workflow");

assert(headerValue(testUser,"updateURL")===expectedTestUpdateUrl,"TEST updateURL must use the TEST function");
assert(headerValue(testUser,"downloadURL")===expectedTestUpdateUrl,"TEST downloadURL must use the TEST function");
assert(testUser.includes("var UPDATE_URL='"+expectedTestUpdateUrl+"';"),"TEST manual updater must use its configured function");
assert(testUser.includes("var RELEASE_MANIFEST_URL='';"),"TEST updater manifest must be disabled");
assert(!testUser.includes("https://raw.githubusercontent.com/Reekyi/UpStatus/master/release.json"),"TEST must not fetch the production release feed");
assert(!testUser.includes("/functions/v1/upstatus/upstatus.user.js"),"TEST must not contain the production updater endpoint");
assert(testUser.includes("if(!RELEASE_MANIFEST_URL){"),"TEST must stop automatic update checks without a channel manifest");
assert(testUser.includes("x.onclick=openUpdate"),"TEST manual update must remain available for its own configured endpoint");

assert(template.includes("var canDelete=m.user===member||role==='implementation_admin';"),"chat delete UI must use the stored administrator role");
assert(!template.includes("var canDelete=m.user===member||member==='Ricardo'||role==='implementation_admin';"),"chat delete UI must not grant admin access by display name");
assert(template.includes("role=r.role||'implementation_user';")&&template.includes("GM_setValue(key+'role',role);"),"chat UI must persist the role returned by the server");
assert(template.includes("document.addEventListener('click',function(ev){document.querySelectorAll('.up-chat-emoji-menu').forEach(function(m){var b=m.__upstatusEmojiButton;if(!m.contains(ev.target)&&(!b||!b.contains(ev.target)))"),"emoji picker must preserve clicks inside its menu and owning button");

console.log("QA release target, updater-channel and chat-role contracts PASS");
