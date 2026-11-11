#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const user = fs.readFileSync(path.join(ROOT, "src/userscript/upstatus.user.template.js"), "utf8");
const server = fs.readFileSync(path.join(ROOT, "src/server/index.template.ts"), "utf8");

function section(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert(start >= 0 && end > start, label + " section missing");
  return source.slice(start, end);
}

const commandHandler = section(
  user,
  ".on('broadcast',{event:'remote_command'},function(){",
  ".on('broadcast',{event:'call_signal'}",
  "remote_command broadcast handler"
);
assert.match(commandHandler, /scheduleRemoteStatusPoll\(\)/, "remote_command must only schedule a coalesced authenticated poll");
assert.doesNotMatch(commandHandler, /payload|executeRemoteCommand/, "remote_command payload must never execute a command");

const resultHandler = section(
  user,
  ".on('broadcast',{event:'remote_result'},function(){",
  ".subscribe(function(status)",
  "remote_result broadcast handler"
);
assert.doesNotMatch(resultHandler, /payload|remoteResultCache|remoteResultWaiters|waiter\(/, "remote_result payload must never resolve a command result");

const subscribeHandler = section(user, ".subscribe(function(status){", "        });", "Realtime subscribe handler");
assert.ok(subscribeHandler.indexOf("status==='SUBSCRIBED'") >= 0 && subscribeHandler.indexOf("scheduleRemoteStatusPoll()") > subscribeHandler.indexOf("status==='SUBSCRIBED'"), "Realtime subscription must reconcile pending commands after connect/reconnect");

const pollScheduler = section(user, "  function scheduleRemoteStatusPoll(){", "  function startRealtime(){", "coalesced command poll scheduler");
assert.match(pollScheduler, /remotePollHintPending=true/, "broadcast hints must be queued while a poll is in flight");
assert.match(pollScheduler, /remotePollHintTimer/, "broadcast hints must be coalesced into one timer");
assert.match(pollScheduler, /expectedToken=token,expectedMember=member/, "scheduled poll must be bound to the current login identity");
assert.ok(pollScheduler.includes("Date.now()-remoteLastPollAt"), "scheduled polling must enforce a local cooldown");

assert.match(user, /if\(r\.commandId\)sendRealtimeEvent\('remote_command',\{op:'hint'\}\);/, "command broadcasts must contain only a wake-up hint");
assert.match(user, /sendRealtimeEvent\('remote_result',\{op:'hint'\}\);/, "result broadcasts must contain only a wake-up hint");
assert.doesNotMatch(user, /remoteResultCache|remoteResultWaiters/, "public result cache/waiter path must be removed");

const commandPoll = section(user, "  function pollRemoteStatus(){", "  function refresh(){", "authenticated command poll");
const stopRealtime = section(user, "  function stopRealtime(){", "  function updateLuccaPresence(", "Realtime stop cleanup");
assert.match(stopRealtime, /clearTimeout\(remotePollHintTimer\)/, "pending poll timer must be cleared when Realtime stops");
assert.match(commandPoll, /if\(!token\)return;/, "command polling must require a local session token");
assert.match(commandPoll, /if\(remotePolling\)\{remotePollHintPending=true;return;\}/, "hints received during an active poll must not be lost");
assert.match(commandPoll, /remoteLastPollAt=Date\.now\(\)/, "command polling must record its cooldown");
assert.match(commandPoll, /token!==expectedToken\|\|member!==expectedMember/, "poll response must not cross a login identity change");
assert.match(commandPoll, /if\(remotePollHintPending\)scheduleRemoteStatusPoll\(\)/, "queued hints must be retried after the active poll finishes");
assert.match(commandPoll, /api\('GET','\/api\/remote-status'\)/, "command polling must use the authenticated API");
assert.match(commandPoll, /executeRemoteCommand\(d\.command\)/, "only the server-returned command may execute");

const resultPoll = section(user, "  function waitRemoteResult(", "  function executeRemoteCommand(", "authenticated result poll");
assert.match(resultPoll, /api\('GET','\/api\/remote-status\/result\?id='/, "result confirmation must use the authenticated API");
assert.doesNotMatch(resultPoll, /remoteResultCache|remoteResultWaiters|payload/, "result confirmation must not depend on broadcast data");

const remoteRoute = section(server, "async function remoteRoute(", "async function luccaRoute(", "server remote-status route");
assert.match(remoteRoute, /state\.commands\[name\]/, "server must scope command retrieval to the authenticated session name");
assert.match(remoteRoute, /if\(\!\(await admin\(name\)\)\)return response\(\{error:"Somente administradores podem consultar resultados\."\},403\)/, "result retrieval must remain admin-authorized");

const contextStart = server.indexOf("const ctx=await contextName(req);");
const authGate = server.indexOf('if(!ctx)return response({error:"Faça login para continuar."},401);', contextStart);
const remoteDispatch = server.indexOf('if(path.startsWith("/api/remote-status"))return await remoteRoute(req,name);', contextStart);
assert(contextStart >= 0 && authGate > contextStart && remoteDispatch > authGate, "remote-status routes must remain behind authenticated context resolution");

console.log("PASS remote_command/remote_result are untrusted wake-up hints; commands and results are fetched through authenticated server routes.");
