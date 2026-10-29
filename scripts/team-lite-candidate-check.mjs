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
  separateLuccaYcaroAuthRoutes: true
}));
