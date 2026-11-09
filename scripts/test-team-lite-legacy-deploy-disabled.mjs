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

const guard = fs.readFileSync(".github/workflows/team-lite-legacy-deploy-guard.yml", "utf8");
assert.ok(guard.includes("name: Team Lite Legacy Deploy Safety Guard"),
  "the regression guard workflow must have its expected identity");
assert.ok(guard.includes("permissions:\n  contents: read"),
  "the guard workflow must use read-only repository permissions");
assert.ok(guard.includes("uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd"),
  "the guard workflow must pin checkout to an immutable action SHA");
assert.ok(guard.includes("ref: ${{ github.sha }}"),
  "the guard workflow must test the exact event commit");
assert.ok(guard.includes("persist-credentials: false"),
  "checkout must not persist a write-capable Git credential");
assert.ok(guard.includes("node --check scripts/test-team-lite-legacy-deploy-disabled.mjs"),
  "the guard workflow must syntax-check its test");
assert.ok(guard.includes("node scripts/test-team-lite-legacy-deploy-disabled.mjs"),
  "the guard workflow must execute the offline regression test");
assert.ok(!guard.includes("workflow_dispatch:"),
  "the regression guard itself must not expose a manual dispatch path");
for (const forbidden of [
  "secrets.",
  "supabase functions deploy",
  "environment: production",
  "version: latest",
]) {
  assert.ok(!guard.includes(forbidden),
    "the regression guard must not gain production credentials or deployment capability: " + forbidden);
}
assert.ok(!guard.split("\n").some(line => line.startsWith("  deploy:")),
  "the regression guard must not define a deployment job");

const pushSection = guard.split("  pull_request:")[0];
const pullRequestSection = guard.split("  pull_request:")[1] || "";
assert.ok(pushSection.includes("  push:") &&
  pushSection.includes("- fix/team-lite-disable-legacy-prod-dispatch-20261109") &&
  pushSection.includes("- team-lite-official"),
  "the guard must run on candidate and official-branch pushes");
assert.ok(pullRequestSection.includes("branches:\n      - team-lite-official"),
  "the guard must run for pull requests targeting team-lite-official");

console.log("PASS: legacy Team Lite deployment is disabled and its regression guard is read-only, exact-commit, and wired to candidate/official branch changes.");
