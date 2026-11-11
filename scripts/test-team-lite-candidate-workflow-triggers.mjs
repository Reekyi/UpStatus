#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const workflow = fs.readFileSync(".github/workflows/team-lite-candidate.yml", "utf8");
const triggerConfig = workflow.split("\nconcurrency:")[0];
const pushSection = triggerConfig.split("  pull_request:")[0];
const pullRequestSection = triggerConfig.split("  pull_request:")[1] || "";

assert.match(pushSection, /push:\n    branches:\n      - team-lite-official/);
assert.doesNotMatch(pushSection, /^ {4}paths:/m,
  "every official Team Lite push must receive candidate-checks on its exact commit");
assert.match(pullRequestSection, /branches: \[team-lite-official\]/);
assert.match(pullRequestSection, /paths:/,
  "pull-request candidate checks retain their focused path filter");
assert.match(workflow, /^  candidate-checks:/m,
  "the release check name must remain candidate-checks");

const isolationGuard = fs.readFileSync("scripts/assert-isolated-supabase.mjs", "utf8");
assert.match(isolationGuard, /EXPECTED_ORIGIN = "https:\/\/bfpjtfqlnypisxljoxkb\.supabase\.co"/);
assert.match(isolationGuard, /allowMutation !== "1"/,
  "fixture writes require explicit opt-in and the exact isolated project");

const authenticatedRunner = fs.readFileSync("scripts/run-signaling-authenticated.mjs", "utf8");
assert.match(authenticatedRunner, /EXPECTED_ORIGIN = "https:\/\/bfpjtfqlnypisxljoxkb\.supabase\.co"/);
assert.match(authenticatedRunner, /UPSTATUS_SIGNAL_ALLOW_MUTATION/,
  "authenticated fixtures must reject a missing mutation opt-in");

assert.match(workflow, /SUPABASE_URL: https:\/\/bfpjtfqlnypisxljoxkb\.supabase\.co/);
assert.match(workflow, /SUPABASE_SERVICE_ROLE_KEY: \$\{\{ secrets\.UPSTATUS_SIGNAL_TEST_SERVICE_ROLE_KEY \}\}/);
const isolationStep = workflow.indexOf("Verify isolated Supabase mutation guard");
const authenticatedStep = workflow.indexOf("Run authenticated isolated integration and browser tests");
assert.ok(isolationStep > 0 && authenticatedStep > isolationStep,
  "the isolation guard must run before authenticated fixture mutations");

console.log("PASS Team Lite release checks run on every official push and retain exact isolated-project mutation guards.");
