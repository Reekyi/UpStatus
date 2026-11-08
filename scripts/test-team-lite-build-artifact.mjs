#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const release = JSON.parse(fs.readFileSync(path.join(ROOT, "team-lite/release.json"), "utf8"));
const script = fs.readFileSync(path.join(ROOT, "team-lite/upstatus-team-lite.user.js"), "utf8");
const runtimePath = path.join(ROOT, "supabase/functions/upstatus-team-lite/index.ts");
assert.ok(fs.existsSync(runtimePath), "build must generate supabase/functions/upstatus-team-lite/index.ts");
const runtime = fs.readFileSync(runtimePath, "utf8");

function header(name) {
  const match = script.match(new RegExp("^// @" + name + "\\s+([^\\r\\n]+)$", "m"));
  return match ? match[1].trim() : "";
}

assert.match(String(release.buildVersion || ""), /^\\d+\\.\\d+\\.\\d+$/,
  "Team Lite buildVersion must be a stable semantic version");
assert.equal(header("version"), release.buildVersion, "Team Lite @version must match release.json");
assert.equal(header("updateURL"), release.scriptUrl, "Team Lite @updateURL must match release.json");
assert.equal(header("downloadURL"), release.scriptUrl, "Team Lite @downloadURL must match release.json");
assert.ok(script.includes("var CURRENT_VERSION='" + release.buildVersion + "'"),
  "Team Lite internal CURRENT_VERSION must match release.json");
assert.ok(script.includes("var UPDATE_URL='" + release.scriptUrl + "'"),
  "Team Lite internal UPDATE_URL must match release.json");
assert.ok(script.includes("var CLOUD_SERVER='https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus-team-lite';"),
  "Team Lite API must target the production upstatus-team-lite function");
assert.ok(script.includes("var UP_REALTIME_URL='https://dlfvkawaiqduhlazsszm.supabase.co';"),
  "Team Lite Realtime origin must match the production project");

const versionMatch = runtime.match(/const VERSION = "([^"]+)";/);
assert.ok(versionMatch, "generated Team Lite API runtime VERSION missing");
assert.equal(versionMatch[1], release.buildVersion, "generated Team Lite API version must match release.json");

const embeddedMatch = runtime.match(/const USERSCRIPT_BASE64 = "([A-Za-z0-9+/=]+)";/);
assert.ok(embeddedMatch, "generated Team Lite API runtime embedded userscript missing");
const embeddedScript = Buffer.from(embeddedMatch[1], "base64").toString("utf8");
assert.equal(embeddedScript, script, "generated Team Lite API must embed the exact reviewed userscript bytes");

assert.ok(runtime.includes('const marker="/upstatus-team-lite";'),
  "generated Team Lite API must retain its function path marker");
assert.ok(runtime.includes("function userscriptText()"),
  "generated Team Lite API must decode and serve the embedded userscript");
assert.ok(runtime.includes("async function issueSetupInvite("),
  "generated Team Lite API must include the reviewed AUTH-03 invite route");
assert.ok(runtime.includes('db.rpc("consume_upstatus_setup_invite"'),
  "generated Team Lite API must use the atomic setup-invite RPC");
assert.ok(!/__UPSTATUS_[A-Z0-9_]+__/.test(runtime),
  "generated Team Lite API must not contain unresolved build placeholders");

console.log("Team Lite built API artifact matches release metadata and exact userscript source.");
