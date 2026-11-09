#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const workflow = fs.readFileSync(".github/workflows/deploy-production.yml", "utf8");

assert.match(workflow, /^name: Team Lite legacy production deployment \\(disabled\\)$/m,
  "legacy workflow must be explicitly labeled disabled");
assert.match(workflow, /^on:\\n  workflow_dispatch:\\s*$/m,
  "legacy workflow may expose only a manual guard entry point");
assert.match(workflow, /^  block_legacy_dispatch:\\s*$/m,
  "legacy workflow must contain the fail-closed guard job");
assert.match(workflow, /This legacy Team Lite workflow is disabled[\\s\\S]*?exit 1/,
  "manual dispatch must fail with an explicit explanation");

assert.doesNotMatch(workflow, /secrets\\.SUPABASE_|SUPABASE_ACCESS_TOKEN|SUPABASE_PROJECT_ID/,
  "disabled workflow must not read Supabase credentials or project IDs");
assert.doesNotMatch(workflow, /supabase functions deploy/i,
  "disabled workflow must not contain a deployment command");
assert.doesNotMatch(workflow, /environment:\\s*production/i,
  "disabled workflow must not request the production environment");
assert.doesNotMatch(workflow, /supabase\\/setup-cli|version:\\s*latest/i,
  "disabled workflow must not install a deployment CLI");
assert.doesNotMatch(workflow, /^  deploy:/m,
  "disabled workflow must not contain a deploy job");

console.log("PASS: legacy Team Lite production workflow is fail-closed and contains no deploy path.");
