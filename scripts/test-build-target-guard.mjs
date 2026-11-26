#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const productionProject = "dlfvkawaiqduhlazsszm";
const isolatedSignalingProject = "bfpjtfqlnypisxljoxkb";
const productionKey = "sb_publishable_qoML52WUyBQRMB6DLP1yjw_J0Pbaae_";
const sentinelProject = "00000000000000000000";
const inertKey = "sb_publishable_inert_test_target_not_configured";
const sampleProject = "11111111111111111111";
const sampleKey = "sb_publishable_sample_isolated_test_key";
const generatedPaths = [
  "supabase/functions/upstatus/index.ts",
  "supabase/functions/upstatus-test/index.ts",
  "dist/upstatus.user.js",
  "dist/upstatus-test.user.js",
  "dist/build-manifest.json",
];

function runBuild(projectId, publishableKey) {
  const env = { ...process.env };
  if (projectId === null) delete env.UPSTATUS_TEST_PROJECT_ID;
  else env.UPSTATUS_TEST_PROJECT_ID = projectId;
  if (publishableKey === null) delete env.UPSTATUS_TEST_PUBLISHABLE_KEY;
  else env.UPSTATUS_TEST_PUBLISHABLE_KEY = publishableKey;
  return spawnSync(process.execPath, ["scripts/build.mjs"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
}
function output(result) {
  return String(result.stdout || "") + "\n" + String(result.stderr || "");
}
function snapshot() {
  return new Map(generatedPaths.map(path => [path, fs.readFileSync(path, "utf8")]));
}
function assertUnchanged(before, label) {
  for (const [path, content] of before) {
    assert.equal(fs.readFileSync(path, "utf8"), content, label + " must not modify " + path);
  }
}
function header(text, name) {
  const match = text.match(new RegExp("^// @" + name + "\\s+(.+)$", "m"));
  return match ? match[1].trim() : "";
}
function embeddedTest() {
  const manifest = JSON.parse(fs.readFileSync("dist/build-manifest.json", "utf8"));
  const testUser = fs.readFileSync("dist/upstatus-test.user.js", "utf8");
  const testFunction = fs.readFileSync("supabase/functions/upstatus-test/index.ts", "utf8");
  const match = testFunction.match(/const USERSCRIPT_HEX = "([0-9a-f]+)";/i);
  assert.ok(match, "TEST function must embed the generated userscript");
  assert.equal(Buffer.from(match[1], "hex").toString("utf8"), testUser,
    "TEST function must serve exactly the generated TEST userscript");
  return { manifest, testUser };
}

let result = runBuild(null, null);
assert.equal(result.status, 0, "default build must succeed with an inert TEST target: " + output(result).slice(-2000));
let { manifest, testUser } = embeddedTest();
assert.equal(manifest.testProjectId, sentinelProject);
assert.equal(manifest.testTargetConfigured, false);
assert.equal(manifest.testRealtimeKeyConfigured, false);
assert.equal(header(testUser, "updateURL"),
  "https://" + sentinelProject + ".supabase.co/functions/v1/upstatus-test/upstatus.user.js");
assert.equal(header(testUser, "downloadURL"),
  "https://" + sentinelProject + ".supabase.co/functions/v1/upstatus-test/upstatus.user.js");
assert.ok(!testUser.includes("https://" + productionProject + ".supabase.co"),
  "default TEST artifact must never contain the production project origin");
assert.ok(testUser.includes("var UP_REALTIME_URL='https://" + sentinelProject + ".supabase.co';"),
  "default TEST Realtime URL must use the inert sentinel project");
assert.ok(testUser.includes("var UP_REALTIME_KEY='" + inertKey + "';"),
  "default TEST artifact must use an inert publishable key");
assert.ok(testUser.includes("var RELEASE_MANIFEST_URL='';") &&
  !testUser.includes("https://raw.githubusercontent.com/Reekyi/UpStatus/master/release.json"),
  "default TEST artifact must disable the production release feed");
assert.ok(testUser.includes("var CLOUD_SERVER='https://" + sentinelProject + ".supabase.co/functions/v1/upstatus-test';"),
  "default TEST API must use the inert project and TEST function");

result = runBuild(sampleProject, sampleKey);
assert.equal(result.status, 0, "an explicit isolated TEST project/key must build: " + output(result).slice(-2000));
({ manifest, testUser } = embeddedTest());
assert.equal(manifest.testProjectId, sampleProject);
assert.equal(manifest.testTargetConfigured, true);
assert.equal(manifest.testRealtimeKeyConfigured, true);
assert.equal(header(testUser, "updateURL"),
  "https://" + sampleProject + ".supabase.co/functions/v1/upstatus-test/upstatus.user.js");
assert.ok(testUser.includes("var UP_REALTIME_URL='https://" + sampleProject + ".supabase.co';"),
  "configured TEST Realtime URL must use the same project as the API");
assert.ok(testUser.includes("var UP_REALTIME_KEY='" + sampleKey + "';"),
  "configured TEST artifact must use the matching publishable key");
assert.ok(!testUser.includes("https://" + productionProject + ".supabase.co"),
  "configured TEST artifact must not contain the production project origin");

for (const [projectId, key, expectedMessage] of [
  [productionProject, sampleKey, /Refusing to build TEST artifacts against the production Supabase project/],
  [isolatedSignalingProject, sampleKey, /Refusing to build full TEST artifacts against the isolated signaling\/auth project/],
  ["not-a-project-ref", sampleKey, /UPSTATUS_TEST_PROJECT_ID must be a 20-character lowercase Supabase project reference/],
  [sampleProject, null, /UPSTATUS_TEST_PUBLISHABLE_KEY is required/],
  [sampleProject, productionKey, /TEST publishable key must not equal the production publishable key/],
  [null, sampleKey, /UPSTATUS_TEST_PUBLISHABLE_KEY requires UPSTATUS_TEST_PROJECT_ID/],
]) {
  const before = snapshot();
  const rejected = runBuild(projectId, key);
  assert.notEqual(rejected.status, 0, "unsafe TEST configuration must be rejected: " + String(projectId));
  assert.match(output(rejected), expectedMessage, "unsafe TEST configuration rejection must be explicit");
  assertUnchanged(before, "rejected TEST build");
}

result = runBuild(null, null);
assert.equal(result.status, 0, "final reset to inert TEST target must succeed");
({ manifest, testUser } = embeddedTest());
assert.equal(manifest.testProjectId, sentinelProject);
assert.equal(manifest.testTargetConfigured, false);
assert.equal(manifest.testRealtimeKeyConfigured, false);

console.log("PASS TEST build defaults to an inert project/key, requires a dedicated project/key pair, and rejects production/signaling targets before writes.");
