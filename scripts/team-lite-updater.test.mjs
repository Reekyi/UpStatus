#!/usr/bin/env node
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const script=execFileSync("git",["show","origin/team-lite-official:team-lite/upstatus-team-lite.user.js"],{cwd:ROOT,encoding:"utf8"});
const release=JSON.parse(execFileSync("git",["show","origin/team-lite-official:team-lite/release.json"],{cwd:ROOT,encoding:"utf8"}));
function assert(ok,message){if(!ok)throw new Error("TEAM LITE UPDATER TEST FAILED: "+message);}
function headerValue(text,name){const m=text.match(new RegExp("^// @"+name+"\\s+(.+)$","m"));return m?m[1].trim():"";}

const scriptVersion=headerValue(script,"version");
assert(release.product==="UpStatus Team Lite","manifest product mismatch");
assert(String(release.buildVersion)===scriptVersion,"manifest buildVersion must match userscript @version");
assert(headerValue(script,"updateURL")===release.scriptUrl,"userscript updateURL must match manifest scriptUrl");
assert(headerValue(script,"downloadURL")===release.scriptUrl,"userscript downloadURL must match manifest scriptUrl");
assert(script.includes("function checkUpdate(){"),"checkUpdate function missing");
assert(script.includes("showUpdatePrompt(served)"),"newer version must trigger update prompt");
assert(script.includes("if(served!==remote)throw new Error("),"manifest/script version mismatch must block updates");
assert(script.includes("if(cmp>0){setUpdateAvailable(true,served)"),"prompt must only show when remote version is newer");
assert(script.includes("try{checkUpdate();}catch(_){}"),"updater must be invoked from the Team Lite UI");

const versionStart=script.indexOf("  function versionParts(");
const versionEnd=script.indexOf("  var updatePromptShown",versionStart);
const checkStart=script.indexOf("  function checkUpdate(){");
const checkEnd=script.indexOf("\n  function mentionNames",checkStart);
assert(versionStart>=0&&versionEnd>versionStart,"version comparison functions not found");
assert(checkStart>=0&&checkEnd>checkStart,"checkUpdate boundaries not found");
const executable=script.slice(versionStart,versionEnd)+"\n"+script.slice(checkStart,checkEnd)+"\nthis.__runCheckUpdate=checkUpdate;";

async function runScenario({installed,manifest,servedVersion,fetchFailure=false}){
  const calls={prompt:[],availability:[],fetches:0};
  const status={textContent:"",innerHTML:""};
  const manual={disabled:false,title:"",onclick:null};
  const card={querySelectorAll(selector){return selector===".up-update-status"?[status]:[manual];}};
  const mockFetch=async function(url){
    calls.fetches++;
    if(fetchFailure)throw new Error("network unavailable");
    if(calls.fetches===1)return {ok:true,json:async()=>manifest};
    return {ok:true,text:async()=>"// ==UserScript==\n// @version      "+servedVersion+"\n// ==/UserScript=="};
  };
  const context={CURRENT_VERSION:installed,card,fetch:mockFetch,esc:String,
    setUpdateAvailable:(show,version)=>calls.availability.push({show,version}),
    showUpdatePrompt:version=>calls.prompt.push(version),
    setTimeout,clearTimeout,Promise,URL};
  vm.runInNewContext(executable,context,{timeout:1000});
  context.__runCheckUpdate();
  await new Promise(resolve=>setTimeout(resolve,0));
  return {calls,status,manual};
}
const valid=(version)=>({product:"UpStatus Team Lite",buildVersion:version,scriptUrl:release.scriptUrl});
const newer=await runScenario({installed:"3.4.30",manifest:valid("3.4.31"),servedVersion:"3.4.31"});
assert(newer.calls.prompt.length===1&&newer.calls.prompt[0]==="3.4.31","newer matching release must show exactly one prompt; debug="+JSON.stringify({calls:newer.calls,status:newer.status,manual:{disabled:newer.manual.disabled,title:newer.manual.title}}));
assert(newer.manual.disabled===false,"manual update must be enabled for a newer matching release");
assert(newer.status.innerHTML.includes("3.4.31"),"status must announce the available version");

const current=await runScenario({installed:"3.4.30",manifest:valid("3.4.30"),servedVersion:"3.4.30"});
assert(current.calls.prompt.length===0,"equal installed and remote versions must not show a prompt");
assert(current.manual.disabled===true,"manual update must be disabled when already current");

const mismatch=await runScenario({installed:"3.4.30",manifest:valid("3.4.31"),servedVersion:"3.4.32"});
assert(mismatch.calls.prompt.length===0,"manifest/script mismatch must not show a prompt");
assert(mismatch.manual.disabled===true,"manifest/script mismatch must disable manual update");
assert(statusText(mismatch).includes("Versões divergentes"),"mismatch must explain why the update was blocked");

const downgrade=await runScenario({installed:"3.4.30",manifest:valid("3.4.29"),servedVersion:"3.4.29"});
assert(downgrade.calls.prompt.length===0,"older remote version must not show a prompt");
assert(downgrade.manual.disabled===true,"older remote version must not enable manual update");

const offline=await runScenario({installed:"3.4.30",manifest:valid("3.4.31"),servedVersion:"3.4.31",fetchFailure:true});
assert(offline.calls.prompt.length===0,"network failure must not show a false update prompt");
assert(offline.manual.disabled===true,"network failure must disable manual update");
assert(statusText(offline).includes("Atualizador bloqueado"),"network failure must show an updater diagnostic");

function statusText(result){return String(result.status.textContent||result.status.innerHTML||"");}
console.log("Team Lite updater tests passed: manifest consistency, newer release prompt, current version, mismatch, downgrade, and network failure.");
