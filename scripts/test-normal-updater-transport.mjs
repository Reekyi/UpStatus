#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const ROOT = new URL("../", import.meta.url);
const sourcePath = new URL("../src/userscript/normal-3.4.7.user.template.js", import.meta.url);
const releasePath = new URL("../release.json", import.meta.url);
const source = fs.readFileSync(sourcePath, "utf8");
const release = JSON.parse(fs.readFileSync(releasePath, "utf8"));
const stableUrl = "https://mvjqunhjxkbfcrxkjtgf.supabase.co/functions/v1/upstatus/upstatus.user.js";
const manifestUrl = "https://raw.githubusercontent.com/Reekyi/UpStatus/master/release.json";

function assertHeader(name, expected) {
  const match = source.match(new RegExp("^// @" + name + "\\s+([^\\r\\n]+)$", "m"));
  assert.ok(match, "Missing userscript header @" + name);
  assert.equal(match[1].trim(), expected, "Unexpected @" + name);
}

function extractFunction(text, name) {
  const marker = "function " + name + "(";
  const start = text.indexOf(marker);
  assert.notEqual(start, -1, "Missing function " + name);
  const open = text.indexOf("{", start + marker.length);
  assert.notEqual(open, -1, "Missing body for " + name);
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = open; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (lineComment) {
      if (ch === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === "*" && next === "/") { blockComment = false; i++; }
      continue;
    }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === "/" && next === "/") { lineComment = true; i++; continue; }
    if (ch === "/" && next === "*") { blockComment = true; i++; continue; }
    if (ch === "'" || ch === '"' || ch === "\`") { quote = ch; continue; }
    if (ch === "{") depth++;
    if (ch === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error("Unclosed function " + name);
}

assert.equal(release.version, "3.4.7");
assert.equal(release.preRelease, "");
assert.equal(release.scriptUrl, stableUrl, "Stable manifest must resolve to the Revived script endpoint.");
assertHeader("version", "3.4.7");
assertHeader("updateURL", stableUrl);
assertHeader("downloadURL", stableUrl);
assert.ok(source.includes("@connect      *"), "Userscript network permission is required for the update transport.");
assert.doesNotThrow(() => new vm.Script(source, { filename: "normal-3.4.7.user.js" }));

const checker = extractFunction(source, "checkUpdate");
assert.ok(checker.includes("requestUpdateResource(manifestUrl"), "Manifest must use the userscript network transport.");
assert.ok(checker.includes("requestUpdateResource(url"), "Script download must use the userscript network transport.");
assert.ok(!checker.includes("fetch("), "Cross-origin updater must not depend on page fetch/CORS.");
assert.ok(checker.includes("manifest.preRelease"), "Stable channel must reject prerelease manifests.");
assert.ok(checker.includes("url!==stableScriptUrl"), "Stable channel must pin the official Revived endpoint.");
assert.ok(checker.includes("served!==result.remote"), "Manifest and downloaded script versions must match.");

const helper = extractFunction(source, "requestUpdateResource");
function loadHelper(GM_xmlhttpRequest) {
  const context = {};
  if (GM_xmlhttpRequest) context.GM_xmlhttpRequest = GM_xmlhttpRequest;
  vm.runInNewContext(helper + "\nthis.requestUpdateResource = requestUpdateResource;", context);
  return context.requestUpdateResource;
}

const requestOk = loadHelper((options) => options.onload({ status: 200, responseText: "manifest body" }));
assert.equal(await requestOk(manifestUrl, "manifesto"), "manifest body");

const request404 = loadHelper((options) => options.onload({ status: 404, responseText: "missing" }));
await assert.rejects(request404(stableUrl, "script"), /HTTP 404/);

const requestNetworkError = loadHelper((options) => options.onerror({}));
await assert.rejects(requestNetworkError(manifestUrl, "manifesto"), /Falha de rede/);

const requestTimeout = loadHelper((options) => options.ontimeout({}));
await assert.rejects(requestTimeout(manifestUrl, "manifesto"), /Tempo esgotado/);

const requestAbort = loadHelper((options) => options.onabort({}));
await assert.rejects(requestAbort(manifestUrl, "manifesto"), /cancelada/);

const requestUnavailable = loadHelper(undefined);
await assert.rejects(requestUnavailable(manifestUrl, "manifesto"), /GM_xmlhttpRequest/);

const requestThrows = loadHelper(() => { throw new Error("mock failure"); });
await assert.rejects(requestThrows(manifestUrl, "manifesto"), /mock failure/);

const requestOnce = loadHelper((options) => {
  options.onload({ status: 200, responseText: "first" });
  options.onerror({});
});
assert.equal(await requestOnce(manifestUrl, "manifesto"), "first", "Transport must settle once.");


const versionParts = extractFunction(source, "versionParts");
const compareVersions = extractFunction(source, "compareVersions");
const versionContext = {};
vm.runInNewContext(versionParts + "\n" + compareVersions + "\nthis.compareVersions = compareVersions;", versionContext);
assert.equal(versionContext.compareVersions("3.4.8-beta.2", "3.4.8-beta.1"), 1);
assert.equal(versionContext.compareVersions("3.4.8-beta.1", "3.4.8-beta.10"), -1);
assert.equal(versionContext.compareVersions("3.4.8", "3.4.8-beta.99"), 1);
assert.equal(versionContext.compareVersions("3.4.7", "3.4.8-beta.1"), -1);
assert.equal(versionContext.compareVersions("3.4.8-beta.1", "3.4.8-beta.1"), 0);

const stagingPath = new URL("../src/userscript/normal-staging.user.js", import.meta.url);
const betaReleasePath = new URL("../release-beta.json", import.meta.url);
const staging = fs.readFileSync(stagingPath, "utf8");
const betaRelease = JSON.parse(fs.readFileSync(betaReleasePath, "utf8"));
const stagingUrl = "https://akbgmmpnnpwcwgcfrltw.supabase.co/functions/v1/upstatus/upstatus.user.js";
const stagingManifestUrl = "https://raw.githubusercontent.com/Reekyi/UpStatus/feat/release-pipeline-foundation/release-beta.json";
function assertStagingHeader(name, expected) {
  const match = staging.match(new RegExp("^// @" + name + "\\s+([^\\r\\n]+)$", "m"));
  assert.ok(match, "Missing staging userscript header @" + name);
  assert.equal(match[1].trim(), expected, "Unexpected staging @" + name);
}
assert.equal(betaRelease.version, "3.4.8-beta.1");
assert.equal(betaRelease.preRelease, "beta.1");
assert.equal(betaRelease.scriptUrl, stagingUrl);
assertStagingHeader("version", "3.4.8-beta.1");
assertStagingHeader("namespace", "upseller-staging");
assertStagingHeader("updateURL", stagingUrl);
assertStagingHeader("downloadURL", stagingUrl);
assert.ok(staging.includes("https://akbgmmpnnpwcwgcfrltw.supabase.co/functions/v1/upstatus-screen-share-3-1-1-beta10"));
assert.ok(staging.includes("sb_publishable_YZKmAyA19mkOfByJ5Y-Cmg_VbNnNkbA"));
assert.ok(staging.includes("upstatus-screen-share-staging-live-v1"));
assert.ok(!staging.includes("mvjqunhjxkbfcrxkjtgf"));
assert.ok(!staging.includes("dlfvkawaiqduhlazsszm"));
assert.doesNotThrow(() => new vm.Script(staging, { filename: "normal-staging.user.js" }));
const stagingChecker = extractFunction(staging, "checkUpdate");
assert.ok(stagingChecker.includes(stagingManifestUrl));
assert.ok(stagingChecker.includes("betaScriptUrl"));
assert.ok(stagingChecker.includes("requestUpdateResource"));
assert.ok(!stagingChecker.includes("fetch("));
assert.ok(stagingChecker.includes("manifest.preRelease"));
assert.ok(stagingChecker.includes("served!==result.remote"));

console.log("Updater transport and channels OK: stable + staging manifests, semver prereleases, syntax and GM_xmlhttpRequest error paths.");
