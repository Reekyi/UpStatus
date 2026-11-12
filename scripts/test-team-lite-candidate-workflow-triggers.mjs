#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

function parseBranchTargets(config, triggerName) {
  const trigger = config.match(new RegExp(
    `^  ${triggerName}:\\s*\\r?\\n([\\s\\S]*?)(?=^  [A-Za-z0-9_-]+:|$)`,
    "m"
  ));
  assert.ok(trigger, `workflow must define the ${triggerName} trigger`);

  const inline = trigger[1].match(/^ {4}branches:\\s*\\[([^\\]]*)\\]/m);
  if (inline) {
    return inline[1].split(",").map(value => value.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
  }

  const multiline = trigger[1].match(/^ {4}branches:\\s*\\r?\\n((?:^ {6}-\\s*[^#\\r\\n]+(?:\\r?\\n|$))+)/m);
  assert.ok(multiline, `${triggerName} must declare a readable branches list`);
  return [...multiline[1].matchAll(/^ {6}-\\s*(['"]?)(.*?)\\1\\s*$/gm)].map(match => match[2]);
}

const workflow = fs.readFileSync(".github/workflows/team-lite-candidate.yml", "utf8");
const triggerConfig = workflow.split("\\nconcurrency:")[0];
const pushSection = triggerConfig.split("  pull_request:")[0];
const pullRequestSection = triggerConfig.split("  pull_request:")[1] || "";

const pushBranches = parseBranchTargets(triggerConfig, "push");
const pullRequestBranches = parseBranchTargets(triggerConfig, "pull_request");

// Keep both the official branch and this isolated child candidate covered.
assert.deepEqual(pushBranches, [
  "team-lite-official",
  "fix/team-lite-call-source-provenance-20261112",
]);
assert.doesNotMatch(pushSection, /^ {4}paths:/m,
  "every official Team Lite push must receive candidate-checks on its exact commit");
assert.deepEqual(pullRequestBranches, [
  "team-lite-official",
  "team-lite/signaling-transport-candidate",
]);
assert.match(pullRequestSection, /paths:/,
  "pull-request candidate checks retain their focused path filter");
assert.match(workflow, /^  candidate-checks:/m,
  "the release check name must remain candidate-checks");

// The parser must accept both valid GitHub Actions YAML list styles.
assert.deepEqual(
  parseBranchTargets("  pull_request:\\n    branches: [team-lite-official]\\n", "pull_request"),
  ["team-lite-official"]
);
assert.deepEqual(
  parseBranchTargets("  pull_request:\\n    branches:\\n      - team-lite-official\\n      - candidate-branch\\n", "pull_request"),
  ["team-lite-official", "candidate-branch"]
);

const isolationGuard = fs.readFileSync("scripts/assert-isolated-supabase.mjs", "utf8");
assert.match(isolationGuard, /EXPECTED_ORIGIN = "https:\\/\\/bfpjtfqlnypisxljoxkb\\.supabase\\.co"/);
assert.match(isolationGuard, /allowMutation !== "1"/,
  "fixture writes require explicit opt-in and the exact isolated project");

const authenticatedRunner = fs.readFileSync("scripts/run-signaling-authenticated.mjs", "utf8");
assert.match(authenticatedRunner, /EXPECTED_ORIGIN = "https:\\/\\/bfpjtfqlnypisxljoxkb\\.supabase\\.co"/);
assert.match(authenticatedRunner, /UPSTATUS_SIGNAL_ALLOW_MUTATION/,
  "authenticated fixtures must reject a missing mutation opt-in");

assert.match(workflow, /SUPABASE_URL: https:\\/\\/bfpjtfqlnypisxljoxkb\\.supabase\\.co/);
assert.match(workflow, /SUPABASE_SERVICE_ROLE_KEY: \\$\\{\\{ secrets\\.UPSTATUS_SIGNAL_TEST_SERVICE_ROLE_KEY \\}\\}/);
const isolationStep = workflow.indexOf("Verify isolated Supabase mutation guard");
const authenticatedStep = workflow.indexOf("Run authenticated isolated integration and browser tests");
assert.ok(isolationStep > 0 && authenticatedStep > isolationStep,
  "the isolation guard must run before authenticated fixture mutations");

console.log("PASS Team Lite release checks cover the official branch and exact candidate triggers with inline or block YAML lists.");
