#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { voiceOpenErrorStatus } from "../supabase/functions/upstatus-signal-test/voice-status.mjs";

const source = readFileSync("supabase/functions/upstatus-signal-test/index.ts", "utf8");
const workflow = readFileSync(".github/workflows/voice-open-http-status-contract.yml", "utf8");
assert.match(
  workflow,
  /push:\s*branches:\s*\n\s*-\s*fix\/voice-open-http-409-contract-20261113/,
  "the contract workflow push trigger must target this candidate branch",
);
assert.match(
  workflow,
  /pull_request:\s*branches:\s*\n\s*-\s*fix\/normal-api-target-aligned-rate-limit-20261113/,
  "the contract workflow PR trigger must include its actual stacked base branch",
);
assert.match(
  workflow,
  /pull_request:[\s\S]*?branches:[\s\S]*?-\s*fix\/voice-open-http-409-contract-20261113/,
  "the contract workflow PR trigger must retain the candidate branch for future child PRs",
);
assert.match(
  source,
  /import\s*\{\s*voiceOpenErrorStatus\s*\}\s*from\s*["']\.\/voice-status\.mjs["']/,
  "the signaling endpoint must import the tested voice-open status mapper",
);
assert.match(
  source,
  /const status = voiceOpenErrorStatus\(code\);/,
  "the /room/open HTTP response must use the tested status mapper",
);

const cases = [
  ["INVALID_LOGICAL_ID", 400],
  ["INVALID_ARGUMENT", 400],
  ["INVALID_ATTEMPT_ID", 400],
  ["UNKNOWN_USER", 404],
  ["VOICE_ROOM_OPEN_CANCELLED", 410],
  ["VOICE_ROOM_UNAVAILABLE", 410],
  ["VOICE_ROOM_MEMBERSHIP_ENDED", 410],
  ["VOICE_ATTEMPT_CONFLICT", 409],
  ["VOICE_ATTEMPT_ALREADY_ACTIVE", 409],
  ["ROOM_FULL", 409],
  ["UNEXPECTED_RPC_ERROR", 500],
];

for (const [code, expectedStatus] of cases) {
  const actualStatus = voiceOpenErrorStatus(code);
  const response = new Response(JSON.stringify({ error: code }), { status: actualStatus });
  assert.equal(response.status, expectedStatus, code + " must map to HTTP " + expectedStatus);
  assert.deepEqual(await response.json(), { error: code });
}

console.log("Voice-room open HTTP status contract passed: 400/404/410/409/500, including VOICE_ATTEMPT_ALREADY_ACTIVE => 409.");
console.log("Voice contract workflow push and stacked pull_request branch filters passed.");
