#!/usr/bin/env node
/**
 * Black-box unauthenticated checks for the isolated UpStatus signaling prototype.
 * Usage: UPSTATUS_SIGNAL_URL=https://<test-project>.supabase.co/functions/v1/upstatus-signal-test node scripts/test-signaling-endpoint.mjs
 * This test intentionally uses no production credentials and never mutates data.
 */
const base = (process.env.UPSTATUS_SIGNAL_URL || "").replace(/\/$/, "");
if (!base) {
  console.error("Set UPSTATUS_SIGNAL_URL to the isolated test function URL.");
  process.exit(2);
}
const cases = [
  {
    name: "health endpoint is available",
    run: () => fetch(base + "/health"),
    expected: 200,
    body: body => body.ok === true && body.service === "upstatus-signal-test",
  },
  {
    name: "room creation requires a valid UpStatus session",
    run: () => fetch(base + "/room/create", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ participants: [] }),
    }),
    expected: 401,
  },
  {
    name: "signal submission requires a valid UpStatus session",
    run: () => fetch(base + "/signal", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ roomId: "forged", recipient: "someone", eventType: "offer", payload: {}, sender: "admin" }),
    }),
    expected: 401,
  },
  {
    name: "polling requires a valid UpStatus session",
    run: () => fetch(base + "/poll", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ roomId: "forged" }),
    }),
    expected: 401,
  },
  {
    name: "room invitation status requires a valid UpStatus session",
    run: () => fetch(base + "/room/status", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ roomId: "forged" }),
    }),
    expected: 401,
  },
  {
    name: "listing room invitations requires a valid UpStatus session",
    run: () => fetch(base + "/room/invitations", {
      method: "POST", headers: { "content-type": "application/json" },
      body: "{}",
    }),
    expected: 401,
  },
  {
    name: "accepting a room invitation requires a valid UpStatus session",
    run: () => fetch(base + "/room/accept", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ roomId: "forged" }),
    }),
    expected: 401,
  },
  {
    name: "declining a room invitation requires a valid UpStatus session",
    run: () => fetch(base + "/room/decline", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ roomId: "forged" }),
    }),
    expected: 401,
  },
  {
    name: "closing a room requires a valid UpStatus session",
    run: () => fetch(base + "/room/close", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ roomId: "forged" }),
    }),
    expected: 401,
  },
  {
    name: "invalid tokens are rejected before route processing",
    run: () => fetch(base + "/not-a-route", {
      method: "POST", headers: { "content-type": "application/json", "x-upstatus-token": "invalid-test-token" },
      body: "{}",
    }),
    expected: 401,
  },
  {
    name: "unsupported methods are rejected",
    run: () => fetch(base + "/signal", { method: "PUT" }),
    expected: 405,
  },
];
let failed = 0;
for (const test of cases) {
  try {
    const res = await test.run();
    let json = null;
    try { json = await res.json(); } catch {}
    const bodyOk = !test.body || test.body(json);
    const ok = res.status === test.expected && bodyOk;
    console.log(`${ok ? "PASS" : "FAIL"} ${test.name} (HTTP ${res.status}, expected ${test.expected})`);
    if (!ok) {
      failed++;
      if (json) console.log("  response:", JSON.stringify(json));
    }
  } catch (error) {
    failed++;
    console.log(`FAIL ${test.name} (${String(error)})`);
  }
}
console.log(`\n${cases.length - failed}/${cases.length} unauthenticated checks passed.`);
if (failed) process.exit(1);
