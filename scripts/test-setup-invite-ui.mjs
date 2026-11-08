#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const relative=String(process.argv[2]||"").trim();
if(!relative)throw new Error("Pass the userscript source path.");
const sourcePath=path.resolve(ROOT,relative);
if(!sourcePath.startsWith(ROOT+path.sep))throw new Error("Userscript path must remain inside the repository.");
const source=fs.readFileSync(sourcePath,"utf8");
const header=source.slice(0,source.indexOf("(function"));
assert.match(header,/^\/\/ @grant\s+GM_setClipboard\s*$/m,"userscript must request the clipboard grant");
assert.match(source,/function canViewHealth\(\)\{return role==='implementation_admin';\}/,"invite UI must remain inside the stored-admin health panel");

const helperStart=source.indexOf("  async function createAndCopySetupInvite(");
const helperEnd=source.indexOf("\n  function bindSetupInviteControls()",helperStart);
assert.ok(helperStart>=0&&helperEnd>helperStart,"setup invite helper must exist");
const helperSource=source.slice(helperStart,helperEnd);
assert.match(helperSource,/api\("POST","\/api\/setup-invite",\{name:target\}\)/,"helper must call the authenticated setup-invite route");
assert.match(helperSource,/GM_setClipboard\(code,"text"\)/,"helper must use the userscript clipboard API");
assert.doesNotMatch(helperSource,/GM_setValue|localStorage|sessionStorage|innerHTML|console\./,"raw invite tokens must not be persisted, rendered, or logged");

const bindStart=source.indexOf("  function bindSetupInviteControls()");
const openStart=source.indexOf("  function openHealth()",bindStart);
assert.ok(bindStart>=0&&openStart>bindStart,"setup invite controls must be bound from the health panel");
const bindSource=source.slice(bindStart,openStart);
assert.match(bindSource,/createAndCopySetupInvite\(target\)/,"button must call the tested helper");
const healthStart=source.indexOf("  function openHealth()");
const healthEnd=source.indexOf("  function startHealthMonitor()",healthStart);
const healthSource=source.slice(healthStart,healthEnd);
assert.match(healthSource,/class="up-setup-invite"/,"admin health panel must render the invite section");
assert.match(healthSource,/bindSetupInviteControls\(\)/,"admin health panel must wire the invite controls");
assert.doesNotMatch(healthSource,/setupToken/,"raw setup token must never be placed in health-panel DOM");

const validToken="a".repeat(64);
let calls=[];
let copied=[];
let fallbackCopied=[];
const sandbox={
  canViewHealth:()=>true,
  token:"session-token",
  member:"Ricardo",
  api:async(method,route,payload)=>{
    calls.push({method,route,payload});
    return {name:"Lucca",setupToken:validToken,expiresAt:new Date(Date.now()+15*60*1000).toISOString()};
  },
  GM_setClipboard:(value,type)=>copied.push({value,type}),
  navigator:{clipboard:{writeText:async value=>fallbackCopied.push(value)}}
};
vm.runInNewContext(helperSource+"\nthis.createAndCopySetupInvite=createAndCopySetupInvite;",sandbox,{timeout:1000});
const result=await sandbox.createAndCopySetupInvite("  Lucca  ");
assert.equal(calls.length,1);
assert.equal(calls[0].method,"POST");
assert.equal(calls[0].route,"/api/setup-invite");
assert.equal(calls[0].payload.name,"Lucca");
assert.equal(copied.length,1);
assert.equal(copied[0].value,validToken);
assert.equal(copied[0].type,"text");
assert.equal(result.name,"Lucca");
assert.equal(typeof result.expiresAt,"number");
assert.equal(Object.prototype.hasOwnProperty.call(result,"setupToken"),false);

sandbox.canViewHealth=()=>false;
await assert.rejects(()=>sandbox.createAndCopySetupInvite("Lucca"),/Acesso não autorizado/);
assert.equal(calls.length,1,"non-admin must not call the invite endpoint");

sandbox.canViewHealth=()=>true;
await assert.rejects(()=>sandbox.createAndCopySetupInvite("  "),/nome exato/);
assert.equal(calls.length,1,"invalid target must not call the invite endpoint");

sandbox.api=async()=>({name:"Lucca",setupToken:"short",expiresAt:new Date(Date.now()+60000).toISOString()});
await assert.rejects(()=>sandbox.createAndCopySetupInvite("Lucca"),/código inválido/);
assert.equal(copied.length,1,"malformed token must not reach clipboard");

sandbox.api=async()=>({name:"Lucca",setupToken:validToken,expiresAt:new Date(Date.now()-1000).toISOString()});
await assert.rejects(()=>sandbox.createAndCopySetupInvite("Lucca"),/expirou/);

delete sandbox.GM_setClipboard;
sandbox.navigator={clipboard:{writeText:async value=>fallbackCopied.push(value)}};
sandbox.api=async()=>({name:"Lucca",setupToken:validToken,expiresAt:new Date(Date.now()+60000).toISOString()});
await sandbox.createAndCopySetupInvite("Lucca");
assert.equal(fallbackCopied[fallbackCopied.length-1],validToken,"Clipboard API fallback must work");

sandbox.navigator={};
await assert.rejects(()=>sandbox.createAndCopySetupInvite("Lucca"),/copiar o código/);
console.log("PASS setup-invite admin UI contract, stored-role gate, 256-bit token validation, expiry, clipboard fallback, and no DOM/storage/log exposure.");
