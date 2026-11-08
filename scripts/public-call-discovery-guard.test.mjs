#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targets = {
  normal: ["src/userscript/upstatus.user.template.js", "Normal"],
  "team-lite": ["team-lite/upstatus-team-lite.user.js", "Team Lite"],
};
const selected = process.argv[2] || "normal";
const names = selected === "all" ? Object.keys(targets) : [selected];
for (const name of names) {
  assert.ok(targets[name], "usage: node scripts/public-call-discovery-guard.test.mjs normal|team-lite|all");
  const [relativePath, label] = targets[name];
  const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
  assert.ok(source.includes("async function receiveCallSignal(p,authenticatedSource){"),
    label + " must receive transport provenance out-of-band");
  assert.ok(source.includes("if(signalTransportFlag&&!authenticatedSource&&!isAllowedPublicCallDiscoverySignal(p))return;"),
    label + " must not trust payload fields as authenticated provenance");
  assert.ok(!source.includes("_authenticatedTransport"),
    label + " must not use a payload-controlled authenticated marker");

  const pollStart = source.indexOf("function signalStartCallPolling");
  const pollEnd = source.indexOf("function signalStopCallPolling", pollStart);
  assert.ok(pollStart >= 0 && pollEnd > pollStart, label + " authenticated polling block must exist");
  assert.ok(source.slice(pollStart, pollEnd).includes("await receiveCallSignal(p,true);"),
    label + " authenticated room events must pass trusted provenance explicitly");

  const inviteStart = source.indexOf("async function signalPollInvitations");
  const inviteEnd = source.indexOf("function signalStartInvitationPolling", inviteStart);
  assert.ok(inviteStart >= 0 && inviteEnd > inviteStart, label + " invitation polling block must exist");
  assert.ok(source.slice(inviteStart, inviteEnd).includes("},true);"),
    label + " authenticated invitations must pass trusted provenance explicitly");

  const realtimeCallListener = source.indexOf(".on('broadcast',{event:'call_signal'}");
  assert.ok(realtimeCallListener >= 0, label + " public call discovery listener must remain available");
  assert.ok(source.slice(realtimeCallListener, realtimeCallListener + 300).includes("receiveCallSignal(payload&&payload.payload||{},false);"),
    label + " public Realtime events must always be marked untrusted");

  const discoveryEvents = [...source.matchAll(/sendRealtimeEvent\\('call_signal',\\{type:'([^']+)'[^}]*discoveryOnly:true\\}\\)/g)]
    .map(match => match[1]).sort();
  assert.deepEqual(discoveryEvents, ["ended", "presence"],
    label + " may publish only presence and ended as public discovery hints");
  const presenceStart = source.indexOf("function callPublishPresence()");
  const presenceEnd = source.indexOf("function callStartPresence()", presenceStart);
  assert.ok(presenceStart >= 0 && presenceEnd > presenceStart, label + " call presence publisher must exist");
  const presenceBlock = source.slice(presenceStart, presenceEnd);
  assert.ok(presenceBlock.includes("type:'presence'") && presenceBlock.includes("discoveryOnly:true"),
    label + " public presence hint must be explicitly marked discovery-only");
  const endedStart = source.indexOf("if(p.type==='ended'){");
  const endedEnd = source.indexOf("if(p.type==='join_request')", endedStart);
  assert.ok(endedStart >= 0 && endedEnd > endedStart, label + " ended handler must exist");
  const endedBlock = source.slice(endedStart, endedEnd);
  assert.ok(endedBlock.includes("delete upCallDirectory[p.callId];return;"),
    label + " public ended hint may only remove a directory entry");
  assert.ok(!endedBlock.includes("callCleanup") && !endedBlock.includes("upCall.active"),
    label + " public ended hint must not terminate an active call");
}
console.log("Authenticated call-source boundary tests passed: " + names.join(", "));
