#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const ROOT = new URL("../", import.meta.url);
const screenPath = new URL("../src/server/screen-share-staging/index.ts", import.meta.url);
const normalPath = new URL("../src/userscript/normal-staging.user.js", import.meta.url);
const screen = fs.readFileSync(screenPath, "utf8");
const normal = fs.readFileSync(normalPath, "utf8");

const stageRef = "akbgmmpnnpwcwgcfrltw";
const stageBase = "https://" + stageRef + ".supabase.co";
const screenEndpoint = stageBase + "/functions/v1/upstatus-screen-share-3-1-1-beta10";
const normalEndpoint = stageBase + "/functions/v1/upstatus/upstatus.user.js";
const publishableKey = "sb_publishable_YZKmAyA19mkOfByJ5Y-Cmg_VbNnNkbA";

assert.ok(screen.includes('const VERSION = "3.1.1-staging.1";'), "Screen-share staging backend version mismatch.");
assert.ok(!screen.includes("mvjqunhjxkbfcrxkjtgf"), "Screen-share staging backend must not contain production ref.");
assert.ok(!screen.includes("dlfvkawaiqduhlazsszm"), "Screen-share staging backend must not contain legacy ref.");

const hexMatch = screen.match(/const USERSCRIPT_HEX = "([0-9a-f]+)";/i);
assert.ok(hexMatch, "Screen-share staging userscript payload missing.");
assert.equal(hexMatch[1].length % 2, 0, "Screen-share userscript hex payload has odd length.");
const screenUser = Buffer.from(hexMatch[1], "hex").toString("utf8");
assert.doesNotThrow(() => new vm.Script(screenUser, { filename: "screen-share-staging.user.js" }));
function header(source, name) {
  const match = source.match(new RegExp("^// @" + name + "\\s+([^\\r\\n]+)$", "m"));
  assert.ok(match, "Missing userscript header @" + name);
  return match[1].trim();
}
assert.equal(header(screenUser, "namespace"), "upseller-screen-share-staging");
assert.equal(header(screenUser, "version"), "3.1.1-staging.1");
assert.equal(header(screenUser, "updateURL"), screenEndpoint + "/upstatus.user.js");
assert.equal(header(screenUser, "downloadURL"), screenEndpoint + "/upstatus.user.js");
assert.ok(screenUser.includes("var CLOUD_SERVER='" + screenEndpoint + "'"));
assert.ok(screenUser.includes("var UP_REALTIME_URL='" + stageBase + "'"));
assert.ok(screenUser.includes("var UP_REALTIME_KEY='" + publishableKey + "'"));
assert.ok(screenUser.includes("var UP_REALTIME_TOPIC='upstatus-screen-share-staging-live-v1';"));
assert.ok(screenUser.includes("var SCREEN_ROOM_EVENT='upstatus_screen_signal_staging_v1';"));
assert.ok(screenUser.includes("var key='upstatus_screen_share_staging_';"));
assert.ok(screenUser.includes("upstatus_screen_share_staging_ringtone_stop_bus"));
assert.ok(!screenUser.includes("mvjqunhjxkbfcrxkjtgf"));
assert.ok(!screenUser.includes("dlfvkawaiqduhlazsszm"));

assert.doesNotThrow(() => new vm.Script(normal, { filename: "normal-staging.user.js" }));
assert.equal(header(normal, "namespace"), "upseller-staging");
assert.equal(header(normal, "version"), "3.4.8-beta.1");
assert.equal(header(normal, "updateURL"), normalEndpoint);
assert.equal(header(normal, "downloadURL"), normalEndpoint);
assert.ok(normal.includes("var CLOUD_SERVER='" + screenEndpoint + "'"));
assert.ok(normal.includes("var UP_REALTIME_URL='" + stageBase + "'"));
assert.ok(normal.includes("var UP_REALTIME_KEY='" + publishableKey + "'"));
assert.ok(normal.includes("upstatus-screen-share-staging-live-v1"));
assert.ok(!normal.includes("mvjqunhjxkbfcrxkjtgf"));
assert.ok(!normal.includes("dlfvkawaiqduhlazsszm"));

console.log("Staging runtime OK: screen-share backend/user script, Normal Beta user script, endpoint pins, independent Realtime/storage namespaces, and syntax.");
