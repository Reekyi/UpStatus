#!/usr/bin/env node
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { verifyIsolatedSupabaseMutationTarget } from "./assert-isolated-supabase.mjs";

const configuredUrl = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "");
const baseUrl = await verifyIsolatedSupabaseMutationTarget({
  baseUrl: configuredUrl,
  serviceKey,
  allowMutation: process.env.UPSTATUS_AUTH_ALLOW_MUTATION,
});
const bucket = "setup-invite-ci:" + randomUUID().replace(/-/g, "");
const headers = {
  apikey: serviceKey,
  Authorization: "Bearer " + serviceKey,
  "Content-Type": "application/json",
};

async function request(path, init = {}) {
  const response = await fetch(baseUrl + path, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error("Isolated setup-invite rate-limit request failed (" + response.status + "): " + text.slice(0, 500));
  }
  return text ? JSON.parse(text) : null;
}

try {
  const rpc = "/rest/v1/rpc/consume_upstatus_setup_invite_rate_limit";
  const outcomes = await Promise.all(
    Array.from({ length: 24 }, () =>
      request(rpc, {
        method: "POST",
        body: JSON.stringify({
          p_bucket_key: bucket,
          p_limit: 5,
          p_window_seconds: 60,
        }),
      })
    )
  );

  assert.ok(outcomes.every(value => typeof value === "boolean"), "rate-limit RPC must return booleans");
  assert.equal(outcomes.filter(Boolean).length, 5, "exactly five concurrent invite requests must be allowed");
  assert.equal(outcomes.filter(value => value === false).length, 19, "remaining concurrent invite requests must be denied");

  await new Promise(resolve => setTimeout(resolve, 1100));
  const reset = await request(rpc, {
    method: "POST",
    body: JSON.stringify({
      p_bucket_key: bucket,
      p_limit: 5,
      p_window_seconds: 1,
    }),
  });
  assert.equal(reset, true, "a new fixed window must reset the setup-invite counter");

  console.log("Distributed setup-invite rate-limit concurrency test passed on the isolated Supabase project.");
} finally {
  await request(
    "/rest/v1/upstatus_setup_invite_rate_limits?bucket_key=eq." + encodeURIComponent(bucket),
    { method: "DELETE" }
  ).catch(error => {
    console.error("Setup-invite rate-limit fixture cleanup failed:", error.message);
    process.exitCode = 1;
  });
}
