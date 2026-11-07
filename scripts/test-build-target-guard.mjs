#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const productionProject = "dlfvkawaiqduhlazsszm";
const isolatedSignalingProject = "bfpjtfqlnypisxljoxkb";
const sentinelProject = "00000000000000000000";
const sampleProject = "11111111111111111111";
const generatedPaths = [
  "supabase/functions/upstatus/index.ts",
  "supabase/functions/upstatus-test/index.ts",
  "dist/upstatus.user.js",
  "dist/upstatus-test.user.js",
  "dist/build-manifest.json",
];

function runBuild(projectId) {
  const env = { ...process.env };
  if (projectId === null) delete env.UPSTATUS_TEST_PROJECT_ID;
  else env.UPSTATUS_TEST_PROJECT_ID = projectId;
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
function assertEmbeddedTestUser() {
  const manifest = JSON.parse(fs.readFileSync("dist/build-manifest.json", "utf8"));
  const testUser = fs.readFileSync("dist/upstatus-test.user.js", "utf8");
  const testFunction = fs.readFileSync("supabase/functions/upstatus-test/index.ts", "utf8");
  const match = testFunction.match(/const USERSCRIPT_HEX = "([0-9a-f]+)";/i);
  assert.ok(match, "TEST function must embed the generated userscript");
  assert.equal(Buffer.from(match[1], "hex").toString("utf8"), testUser,
    "TEST function must serve exactly the generated TEST userscript");
  return { manifest, testUser };
}

let result = runBuild(null);
assert.equal(result.status, 0, "default build must succeed with an inert TEST target: " + output(result).slice(-2000));
let { manifest, testUser } = assertEmbeddedTestUser();
assert.equal(manifest.testProjectId, sentinelProject);
assert.equal(manifest.testTargetConfigured, false);
assert.equal(header(testUser, "updateURL"),
  "https://" + sentinelProject + ".supabase.co/functions/v1/upstatus-test/upstatus.user.js");
assert.equal(header(testUser, "downloadURL"),
  "https://" + sentinelProject + ".supabase.co/functions/v1/upstatus-test/upstatus.user.js");
assert.ok(!testUser.includes("https://" + productionProject + ".supabase.co"),
  "default TEST artifact must never contain the production project origin");

result = runBuild(sampleProject);
assert.equal(result.status, 0, "an explicit non-production TEST project must build: " + output(result).slice(-2000));
({ manifest, testUser } = assertEmbeddedTestUser());
assert.equal(manifest.testProjectId, sampleProject);
assert.equal(manifest.testTargetConfigured, true);
assert.equal(header(testUser, "updateURL"),
  "https://" + sampleProject + ".supabase.co/functions/v1/upstatus-test/upstatus.user.js");

for (const [projectId, expectedMessage] of [
  [productionProject, /Refusing to build TEST artifacts against the production Supabase project/],
  [isolatedSignalingProject, /Refusing to build full TEST artifacts against the isolated signaling\/auth project/],
  ["not-a-project-ref", /UPSTATUS_TEST_PROJECT_ID must be a 20-character lowercase Supabase project reference/],
]) {
  const before = snapshot();
  const rejected = runBuild(projectId);
  assert.notEqual(rejected.status, 0, "unsafe TEST project target must be rejected: " + projectId);
  assert.match(output(rejected), expectedMessage, "unsafe TEST target rejection must be explicit");
  assertUnchanged(before, "rejected TEST build");
}

result = runBuild(null);
assert.equal(result.status, 0, "final reset to inert TEST target must succeed");
({ manifest, testUser } = assertEmbeddedTestUser());
assert.equal(manifest.testProjectId, sentinelProject);
assert.equal(manifest.testTargetConfigured, false);

console.log("PASS TEST build defaults to an inert project, accepts an explicit non-production target, and rejects production/fixture projects before writes.");
