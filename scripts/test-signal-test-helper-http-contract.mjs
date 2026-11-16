#!/usr/bin/env node
/**
 * Offline HTTP response-contract regression for the isolated signaling helper.
 * No network, Supabase client, credentials, or fixtures are used.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mapOpenVoiceRoomResult } from "../supabase/test-functions/upstatus-signal-test/http-contract.mjs";

const responseFactory = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8" },
});

const cases = [
  {
    name: "duplicate active voice attempt maps to HTTP 409",
    result: { error: "VOICE_ATTEMPT_ALREADY_ACTIVE", memberCount: 1 },
    status: 409,
    body: { error: "VOICE_ATTEMPT_ALREADY_ACTIVE", memberCount: 1 },
  },
  {
    name: "legacy voice attempt conflict remains HTTP 409",
    result: { error: "VOICE_ATTEMPT_CONFLICT", memberCount: 1 },
    status: 409,
    body: { error: "VOICE_ATTEMPT_CONFLICT", memberCount: 1 },
  },
  {
    name: "full voice room remains HTTP 409",
    result: { error: "ROOM_FULL", memberCount: 32 },
    status: 409,
    body: { error: "ROOM_FULL", memberCount: 32 },
  },
  {
    name: "invalid attempt arguments remain HTTP 400",
    result: { error: "INVALID_ATTEMPT_ID" },
    status: 400,
    body: { error: "INVALID_ATTEMPT_ID" },
  },
  {
    name: "unknown user remains HTTP 404",
    result: { error: "UNKNOWN_USER" },
    status: 404,
    body: { error: "UNKNOWN_USER" },
  },
  {
    name: "closed or expired room remains HTTP 410",
    result: { error: "VOICE_ROOM_UNAVAILABLE" },
    status: 410,
    body: { error: "VOICE_ROOM_UNAVAILABLE" },
  },
  {
    name: "unknown RPC error remains HTTP 500",
    result: { error: "UNEXPECTED_RPC_FAILURE" },
    status: 500,
    body: { error: "UNEXPECTED_RPC_FAILURE" },
  },
  {
    name: "new room remains HTTP 201",
    result: { created: true, roomId: "room-test" },
    status: 201,
    body: { created: true, roomId: "room-test" },
  },
  {
    name: "existing room remains HTTP 200",
    result: { created: false, roomId: "room-test" },
    status: 200,
    body: { created: false, roomId: "room-test" },
  },
  {
    name: "invalid RPC result remains HTTP 500",
    result: null,
    status: 500,
    body: { error: "Open voice room failed" },
  },
];

for (const testCase of cases) {
  const response = mapOpenVoiceRoomResult(testCase.result, responseFactory);
  assert.ok(response instanceof Response, testCase.name);
  assert.equal(response.status, testCase.status, testCase.name);
  assert.deepEqual(await response.json(), testCase.body, testCase.name);
  console.log(`PASS ${testCase.name} (HTTP ${testCase.status})`);
}

const source = await readFile(
  new URL("../supabase/test-functions/upstatus-signal-test/index.ts", import.meta.url),
  "utf8",
);
assert.match(
  source,
  /import\s+\{\s*mapOpenVoiceRoomResult\s*\}\s+from\s+["']\.\/http-contract\.mjs["']/,
  "isolated Edge Function imports the tested response mapper",
);
assert.equal(
  (source.match(/return mapOpenVoiceRoomResult\(result, response\);/g) || []).length,
  1,
  "open voice-room route uses the tested response mapper exactly once",
);
console.log("PASS isolated Edge Function route is wired to the tested HTTP mapper");
console.log(`\n${cases.length + 1}/${cases.length + 1} isolated HTTP contract checks passed.`);
