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
    name: "atomic call preparation requires a valid UpStatus session",
    run: () => fetch(base + "/room/prepare-call", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ logicalId: "forged-call", recipient: "someone" }),
    }),
    expected: 401,
  },
  {
    name: "call cancellation by logical ID requires a valid UpStatus session",
    run: () => fetch(base + "/room/cancel-call", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ logicalId: "forged-call" }),
    }),
    expected: 401,
  },
  {
    name: "open voice room requires a valid UpStatus session",
    run: () => fetch(base + "/room/open", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ logicalId: "upstatus-team-room-v1" }) }),
    expected: 401,
  },
  {
    name: "voice room attempt cancellation requires a valid UpStatus session",
    run: () => fetch(base + "/room/cancel-open", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ logicalId: "upstatus-team-room-v1", attemptId: "forged-voice-attempt" }),
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
    name: "requesting an invitation to a call requires a valid UpStatus session",
    run: () => fetch(base + "/room/request-invite", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ bindingType: "call", logicalId: "forged" }),
    }),
    expected: 401,
  },
  {
    name: "room broadcast requires a valid UpStatus session",
    run: () => fetch(base + "/broadcast", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ roomId: "forged", eventType: "call_signal", payload: { type: "presence" } }),
    }),
    expected: 401,
  },
  {
    name: "accepted room member listing requires a valid UpStatus session",
    run: () => fetch(base + "/room/members", {
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
    let res;
    for (let attempt = 1; attempt <= 3; attempt++) {
      res = await test.run();
      if (![502, 503, 504].includes(res.status) || attempt === 3) break;
      console.log(`RETRY ${test.name}: transient HTTP ${res.status} (attempt ${attempt}/3)`);
      await new Promise(resolve => setTimeout(resolve, 750 * attempt));
    }
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
try {
  const preflight = await fetch(base + "/health", { method: "OPTIONS" });
  const exposed = (preflight.headers.get("access-control-expose-headers") || "")
    .split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  const ok = preflight.status === 200 && exposed.includes("retry-after");
  console.log(`${ok ? "PASS" : "FAIL"} CORS exposes Retry-After to browser clients (HTTP ${preflight.status}).`);
  if (!ok) failed++;
} catch (error) {
  failed++;
  console.log(`FAIL CORS exposes Retry-After to browser clients (${String(error)}).`);
}
console.log(`\n${cases.length + 1 - failed}/${cases.length + 1} unauthenticated checks passed.`);
if (failed) process.exit(1);
