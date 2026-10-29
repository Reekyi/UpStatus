#!/usr/bin/env node
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(path, "utf8");
const manifest = JSON.parse(read("team-lite/release.json"));
const script = read("team-lite/upstatus-team-lite.user.js");
const luccaSite = read("lucca-site/index.html");
const luccaStandalone = read("lucca.html");
const ycaro = read("ycaro.html");
const backend = read("src/server/team-lite-index.template.ts");
const build = read("scripts/build.mjs");

function header(name) {
  const match = script.match(new RegExp("^// @" + name + "\\s+([^\\r\\n]+)$", "m"));
  return match ? match[1].trim() : "";
}
function assertInlineScriptsParse(html, file) {
  let count = 0;
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const code = match[1].trim();
    if (!code) continue;
    new vm.Script(code, { filename: file + "#inline-" + (++count) });
  }
  assert.ok(count > 0, file + " must contain at least one inline script");
  return count;
}

assert.equal(manifest.product, "UpStatus Team Lite");
assert.equal(manifest.buildVersion, header("version"), "manifest buildVersion must match userscript @version");
assert.ok(script.includes("var CURRENT_VERSION='" + manifest.buildVersion + "'"), "internal CURRENT_VERSION must match release version");
assert.equal(header("updateURL"), manifest.scriptUrl, "@updateURL must match manifest scriptUrl");
assert.equal(header("downloadURL"), manifest.scriptUrl, "@downloadURL must match manifest scriptUrl");
assert.ok(script.includes("var UPDATE_URL='" + manifest.scriptUrl + "'"), "internal UPDATE_URL must match manifest scriptUrl");
new vm.Script(script, { filename: "team-lite/upstatus-team-lite.user.js" });
assert.ok(script.includes("if(served!==remote)throw new Error"), "manifest/script version mismatch must block updates");
assert.ok(script.includes("if(cmp>0){setUpdateAvailable(true,served)"), "only a newer remote version may show the update prompt");
assert.ok(script.includes("try{checkUpdate();}catch(_){}"), "updater must be invoked");
assert.ok(luccaSite.includes("/api/lucca/login"), "Lucca portal must use the Lucca login route");
assert.ok(luccaStandalone.includes("/api/lucca/login"), "standalone Lucca page must use the Lucca login route");
assert.ok(ycaro.includes("/api/ycaro/login"), "Ycaro portal must use its separate login route");
assert.ok(ycaro.includes("/api/ycaro/heartbeat") && ycaro.includes("/api/ycaro/logout"), "Ycaro portal must use separate session lifecycle routes");
assert.ok(!/(?:password|senha)\s*[:=]\s*['"][^'"]{8,}['"]/i.test(ycaro), "Ycaro page must not contain an obvious hardcoded password literal");

assert.ok(backend.includes('const VERSION = "__UPSTATUS_VERSION__";'), "Team Lite backend version placeholder missing");
assert.ok(backend.includes('const USERSCRIPT_BASE64 = "__UPSTATUS_USERSCRIPT_BASE64__";'), "Team Lite embedded userscript placeholder missing");
assert.ok(backend.includes("async function chatRows(name:string,since?:string,guestJoinedAt=0)"), "guest chat history must be scoped to session start");
assert.ok(backend.includes('query=query.gte("created_at",new Date(Math.max(guestJoinedAt,Date.parse(cutoff))).toISOString())'), "guest chat history cutoff missing");
assert.ok(backend.includes("return await readRoute(req,name,ctx?.guest?ctx.joinedAt:0)"), "guest read route must receive session start");
assert.ok(backend.includes('return a?.role==="implementation_admin"'), "admin access must use stored role");
assert.ok(!backend.includes('const isAdmin=name==="Ricardo"||await admin(name);'), "backend must not grant admin by name alone");
assert.ok(!backend.includes('db.from("messages").delete().eq("user_name","Lucca")') && !backend.includes('db.from("messages").delete().eq("user_name","Ycaro")'), "guest login must not delete shared chat history");
assert.ok(backend.includes("async function luccaRoute(req:Request)") && backend.includes("async function ycaroRoute(req:Request)"), "Lucca and Ycaro must have separate auth handlers");
assert.ok(script.includes("if(c&&c.target===member)pollRemoteStatus();"), "remote command broadcast must trigger authenticated polling only");
assert.ok(!script.includes("if(c&&c.target===member)executeRemoteCommand(c);"), "client must not execute untrusted remote command broadcast payloads");
assert.ok(build.includes('writeFunction("upstatus-team-lite",renderTeamLiteFunction())'), "build must generate the Team Lite Edge Function");

assert.ok(script.includes("function scheduleRealtimeChatRefresh()"), "Team Lite public chat broadcasts must use a canonical refresh scheduler");
assert.ok(script.includes("var wait=Math.max(0,1000-(Date.now()-realtimeChatRefreshLastAt));"), "Team Lite public broadcast refreshes must be throttled");
assert.ok(script.includes("function handleRealtimeChatFast(){scheduleRealtimeChatRefresh();}"), "Team Lite must not trust chat_fast payloads as canonical message data");
assert.ok(script.includes(".on('broadcast',{event:'db_change'},function(){if(isAuthenticated()&&realtimeGeneration===authGeneration&&realtimeMember===member)scheduleRealtimeChatRefresh();})"), "Team Lite database-change broadcasts must not apply supplied rows");
assert.ok(script.includes(".on('broadcast',{event:'chat_fast'},function(){if(isAuthenticated()&&realtimeGeneration===authGeneration&&realtimeMember===member)handleRealtimeChatFast();})"), "Team Lite chat_fast listener must ignore attacker-controlled payloads");
assert.ok(script.includes(".on('broadcast',{event:'chat_read'},function(){if(isAuthenticated()&&realtimeGeneration===authGeneration&&realtimeMember===member)scheduleRealtimeChatRefresh();})"), "Team Lite read receipts must be reconciled from the authenticated API");
assert.ok(!script.includes(".on('broadcast',{event:'db_change'},function(payload){"), "Team Lite must not apply public database-change payload rows");
assert.ok(script.includes("if(!isAuthenticated()||generation!==authGeneration||requestedMember!==member)return;") && script.includes("loadChat(true);"), "Team Lite canonical refresh must be scoped to the active authenticated session");

assert.ok(script.includes("p.type!=='presence'&&p.type!=='ended'&&p.to!==member"), "Team Lite call signaling must be addressed to the current member except public presence/end events");
assert.ok(script.includes("p.callId.length>160") && script.includes("p.from.length>80"), "Team Lite call signaling identifiers must be bounded");
assert.ok(script.includes("p.sdp.sdp.length>100000"), "Team Lite must reject oversized call SDP");
assert.ok(script.includes("JSON.stringify(p.candidate).length>4096"), "Team Lite must reject oversized ICE candidates");
assert.ok(script.includes("(p.type==='offer'||p.type==='answer'||p.type==='ice')&&p.to!==member"), "Team Lite voice and screen-share negotiation must be directly targeted");

const inlineCounts = {
  luccaSite: assertInlineScriptsParse(luccaSite, "lucca-site/index.html"),
  luccaStandalone: assertInlineScriptsParse(luccaStandalone, "lucca.html"),
  ycaro: assertInlineScriptsParse(ycaro, "ycaro.html")
};
console.log("Team Lite candidate checks passed:", JSON.stringify({
  version: manifest.buildVersion,
  updaterManifestConsistency: true,
  userscriptSyntax: true,
  guestPortalSyntax: inlineCounts,
  guestSessionIsolationChecks: true,
  separateLuccaYcaroAuthRoutes: true
}));


// Execute the candidate's actual updater logic with mocked network/DOM dependencies.
// This catches behavior regressions that static string checks cannot detect.
const versionStart = script.indexOf("  function versionParts(");
const updaterStart = script.indexOf("  var updatePromptShown", versionStart);
const checkStart = script.indexOf("  function checkUpdate(){", updaterStart);
const versionEnd = script.indexOf("  function mentionNames", checkStart);
assert.ok(versionStart >= 0 && updaterStart > versionStart && checkStart > updaterStart && versionEnd > checkStart, "updater runtime test boundaries not found");
const updaterCode = script.slice(versionStart, versionEnd) + "\nthis.__candidateCheckUpdate = checkUpdate;";
async function runUpdaterScenario({ installed, manifest, servedVersion, fetchFailureAt = 0 }) {
  const calls = { prompts: [], availability: [], fetches: 0, opened: 0 };
  const status = { textContent: "", innerHTML: "" };
  const manual = { disabled: false, title: "", onclick: null };
  const card = { querySelectorAll(selector) { return selector === ".up-update-status" ? [status] : [manual]; } };
  const mockFetch = async function (url) {
    calls.fetches++;
    if (fetchFailureAt === calls.fetches) throw new Error("network unavailable");
    if (calls.fetches === 1) return { ok: true, json: async () => manifest };
    return { ok: true, text: async () => "// ==UserScript==\n// @version      " + servedVersion + "\n// ==/UserScript==" };
  };
  const root = {
    children: [],
    querySelector(selector) { return this.children.find(child => (" " + child.className + " ").includes(" " + selector.slice(1) + " ")) || null; },
    appendChild(child) {
      this.children.push(child);
      child.parentElement = this;
      if (child.className && child.className.split(/\\s+/).includes("up-update-prompt")) calls.prompts.push(child);
    },
  };
  const document = {
    createElement(tag) {
      const handlers = {};
      const classes = new Set();
      return {
        tagName: tag.toUpperCase(), className: "", style: { setProperty() {} },
        children: [], parentElement: null, innerHTML: "",
        classList: {
          add(name) { classes.add(name); },
          remove(name) { classes.delete(name); },
          contains(name) { return classes.has(name); },
        },
        querySelector(selector) {
          if (selector === ".up-update-prompt-later") return { onclick: null };
          if (selector === ".up-update-prompt-now") return { onclick: null };
          return null;
        },
        remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(item => item !== this); },
      };
    }
  };
  const context = {
    CURRENT_VERSION: installed, card, fetch: mockFetch, esc: String,
    root, document,
    node: (tag, attrs) => Object.assign(document.createElement(tag), attrs || {}),
    closePopupAnimated: (element, finish) => finish && finish(),
    setUpdateAvailable: (show, version) => calls.availability.push({ show, version }),
    openUpdate: () => { calls.opened++; }
  };
  vm.runInNewContext(updaterCode, context, { timeout: 1000 });
  context.__candidateCheckUpdate();
  await new Promise(resolve => setTimeout(resolve, 0));
  return { calls, status, manual };
}
const candidateManifest = version => ({ product: "UpStatus Team Lite", buildVersion: version, scriptUrl: manifest.scriptUrl });
const candidateNewer = await runUpdaterScenario({ installed: manifest.buildVersion.replace(/\d+$/, n => String(Number(n) - 1)), manifest: candidateManifest(manifest.buildVersion), servedVersion: manifest.buildVersion });
assert.equal(candidateNewer.calls.prompts.length, 1, "newer matching candidate release must show exactly one prompt");
assert.equal(candidateNewer.calls.prompts.length, 1, "actual modal was created by the extracted prompt implementation");
assert.ok(String(candidateNewer.calls.prompts[0].innerHTML).includes("v" + manifest.buildVersion), "prompt modal must name the newer version");
assert.equal(candidateNewer.manual.disabled, false, "manual update must be enabled for a newer matching release");
candidateNewer.manual.onclick();
assert.equal(candidateNewer.calls.opened, 1, "manual update must open the official update URL");
const candidateCurrent = await runUpdaterScenario({ installed: manifest.buildVersion, manifest: candidateManifest(manifest.buildVersion), servedVersion: manifest.buildVersion });
assert.equal(candidateCurrent.calls.prompts.length, 0, "current version must not show an update prompt");
assert.equal(candidateCurrent.manual.disabled, true, "manual update must be disabled when current");
const candidateMismatch = await runUpdaterScenario({ installed: "3.4.30", manifest: candidateManifest(manifest.buildVersion), servedVersion: "99.0.0" });
assert.equal(candidateMismatch.calls.prompts.length, 0, "manifest/script mismatch must block prompt");
assert.match(String(candidateMismatch.status.textContent), /Versões divergentes/, "mismatch should be visible in updater status");
const candidateDowngrade = await runUpdaterScenario({ installed: "99.0.0", manifest: candidateManifest(manifest.buildVersion), servedVersion: manifest.buildVersion });
assert.equal(candidateDowngrade.calls.prompts.length, 0, "older candidate must not trigger a downgrade prompt");
const candidateManifestOffline = await runUpdaterScenario({ installed: "3.4.30", manifest: candidateManifest(manifest.buildVersion), servedVersion: manifest.buildVersion, fetchFailureAt: 1 });
assert.equal(candidateManifestOffline.calls.prompts.length, 0, "manifest network failure must not show a prompt");
assert.match(String(candidateManifestOffline.status.textContent), /Atualizador bloqueado/, "manifest network failure should be visible");
const candidateScriptOffline = await runUpdaterScenario({ installed: "3.4.30", manifest: candidateManifest(manifest.buildVersion), servedVersion: manifest.buildVersion, fetchFailureAt: 2 });
assert.equal(candidateScriptOffline.calls.prompts.length, 0, "script network failure must not show a prompt");
assert.match(String(candidateScriptOffline.status.textContent), /Atualizador bloqueado/, "script network failure should be visible");
const candidateInvalidManifest = await runUpdaterScenario({ installed: "3.4.30", manifest: { product: "Wrong product", buildVersion: manifest.buildVersion, scriptUrl: manifest.scriptUrl }, servedVersion: manifest.buildVersion });
assert.equal(candidateInvalidManifest.calls.prompts.length, 0, "invalid manifest must not show a prompt");
console.log("Candidate updater runtime scenarios passed: newer/current/mismatch/downgrade/manifest-offline/script-offline/invalid-manifest.");
