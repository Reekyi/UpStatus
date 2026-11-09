#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const workflow = fs.readFileSync(".github/workflows/deploy-production.yml", "utf8");
const lines = workflow.split("\n");

assert.ok(workflow.includes("name: Team Lite legacy production deployment (disabled)"),
  "legacy workflow must be explicitly labeled disabled");
assert.ok(lines.includes("  workflow_dispatch:"),
  "legacy workflow may expose only a manual guard entry point");
assert.ok(lines.includes("  block_legacy_dispatch:"),
  "legacy workflow must contain the fail-closed guard job");
assert.ok(workflow.includes("This legacy Team Lite workflow is disabled") && workflow.includes("exit 1"),
  "manual dispatch must fail with an explicit explanation");

for (const forbidden of [
  "secrets.SUPABASE_ACCESS_TOKEN",
  "secrets.SUPABASE_PROJECT_ID",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_PROJECT_ID",
  "supabase functions deploy",
  "environment: production",
  "version: latest",
  "supabase/setup-cli",
  "  deploy:",
]) {
  assert.ok(!workflow.includes(forbidden), "disabled workflow contains forbidden deploy capability: " + forbidden);
}

console.log("PASS: legacy Team Lite production workflow is fail-closed and contains no deploy path.");
