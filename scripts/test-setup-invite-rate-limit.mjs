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
const independentBucket = bucket + ":independent";
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

async function consume(bucketKey, limit, windowSeconds) {
  return request("/rest/v1/rpc/consume_upstatus_setup_invite_rate_limit", {
    method: "POST",
    body: JSON.stringify({
      p_bucket_key: bucketKey,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    }),
  });
}

async function cleanup(bucketKey) {
  const filter = "?bucket_key=eq." + encodeURIComponent(bucketKey);
  await request("/rest/v1/upstatus_setup_invite_rate_limits" + filter, { method: "DELETE" });
  const remaining = await request("/rest/v1/upstatus_setup_invite_rate_limits" + filter + "&select=bucket_key");
  assert.deepEqual(remaining, [], "setup-invite rate-limit fixture must be removed after the test");
}

try {
  const outcomes = await Promise.all(
    Array.from({ length: 24 }, () => consume(bucket, 5, 60))
  );

  assert.ok(outcomes.every(value => typeof value === "boolean"), "rate-limit RPC must return booleans");
  assert.equal(outcomes.filter(Boolean).length, 5, "exactly five concurrent invite requests must be allowed");
  assert.equal(outcomes.filter(value => value === false).length, 19, "remaining concurrent invite requests must be denied");

  const independentOutcomes = await Promise.all(
    Array.from({ length: 6 }, () => consume(independentBucket, 5, 60))
  );
  assert.ok(independentOutcomes.every(value => typeof value === "boolean"), "independent bucket RPC must return booleans");
  assert.equal(independentOutcomes.filter(Boolean).length, 5, "the second admin bucket must allow exactly five requests");
  assert.equal(independentOutcomes.filter(value => value === false).length, 1, "the second admin bucket must deny its sixth request");

  const firstBucketStillLimited = await consume(bucket, 5, 60);
  assert.equal(firstBucketStillLimited, false, "using another admin bucket must not reset the first admin's exhausted limit");

  await new Promise(resolve => setTimeout(resolve, 1100));
  const reset = await consume(bucket, 5, 1);
  assert.equal(reset, true, "a new fixed window must reset the setup-invite counter");

  console.log("Distributed setup-invite rate-limit concurrency, bucket isolation, and cleanup tests passed on the isolated Supabase project.");
} finally {
  for (const bucketKey of [bucket, independentBucket]) {
    try {
      await cleanup(bucketKey);
    } catch (error) {
      console.error("Setup-invite rate-limit fixture cleanup failed:", error.message);
      process.exitCode = 1;
    }
  }
}
