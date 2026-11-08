#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const relative=String(process.argv[2]||"src/userscript/upstatus.user.template.js").trim();
const sourcePath=path.resolve(ROOT,relative);
if(!sourcePath.startsWith(ROOT+path.sep))throw new Error("Userscript source path must remain inside the repository.");
const source=fs.readFileSync(sourcePath,"utf8");

const handlerMatch=source.match(/\\.on\\('broadcast',\\s*\\{\\s*event:\\s*'remote_command'\\s*\\},\\s*(function\\s*\\(\\s*\\)\\s*\\{[\\s\\S]*?\\})\\s*\\)/);
assert.ok(handlerMatch,"public remote_command handler must exist and accept no payload argument");
const handlerSource=handlerMatch[1];
assert.match(handlerSource,/scheduleRemoteStatusPoll\\(\\)/,"public remote_command may only schedule an authenticated queue poll");
assert.doesNotMatch(handlerSource,/\\bpayload\\b|executeRemoteCommand|syncSaleSmartly|api\\(/,"public broadcast payload must never be executed or passed to an API");

let scheduled=0,executed=0;
const handlerSandbox={
  scheduleRemoteStatusPoll(){scheduled++;},
  executeRemoteCommand(){executed++;}
};
const handler=vm.runInNewContext("("+handlerSource+")",handlerSandbox,{timeout:1000});
handler({payload:{command:{id:"forged",target:"Ricardo",status:"online",sender:"attacker"}}});
assert.equal(scheduled,1,"untrusted broadcast must only schedule the authenticated poll");
assert.equal(executed,0,"untrusted broadcast must not execute its embedded command");

const scheduleStart=source.indexOf("  var remotePollHintTimer=null;");
const scheduleEnd=source.indexOf("  function pollRemoteStatus()",scheduleStart);
assert.ok(scheduleStart>=0&&scheduleEnd>scheduleStart,"debounced remote-status poll helper must exist before pollRemoteStatus()");
const scheduleSource=source.slice(scheduleStart,scheduleEnd);
assert.match(scheduleSource,/var expectedToken=token,expectedMember=member/,"poll hint must capture the current session identity");
assert.match(scheduleSource,/token===expectedToken&&member===expectedMember/,"stale-session hints must be discarded");
