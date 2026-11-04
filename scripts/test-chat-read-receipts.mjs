import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const baseUrl = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "");
if (!baseUrl || !serviceKey) {
  console.log("SKIP: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(0);
}

const userName = "__upstatus_atomic_receipt_ci_" + randomUUID().replace(/-/g, "");
const sharedMessage = "shared-" + randomUUID();
const firstMessage = "first-" + randomUUID();
const secondMessage = "second-" + randomUUID();
const firstReadAt = "2026-11-04T14:00:00.000Z";
const secondReadAt = "2026-11-04T14:01:00.000Z";
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
    throw new Error("Supabase request failed (" + response.status + "): " + text.slice(0, 500));
  }
  return text ? JSON.parse(text) : null;
}

try {
  const rpc = "/rest/v1/rpc/merge_chat_read_receipts";
  await Promise.all([
    request(rpc, {
      method: "POST",
      body: JSON.stringify({
        p_user_name: userName,
        p_messages: {
          [sharedMessage]: ["Ricardo"],
          [firstMessage]: ["Guilherme"],
        },
        p_last_read_at: firstReadAt,
      }),
    }),
    request(rpc, {
      method: "POST",
      body: JSON.stringify({
        p_user_name: userName,
        p_messages: {
          [sharedMessage]: ["Lohan"],
          [secondMessage]: ["Ícaro"],
        },
        p_last_read_at: secondReadAt,
      }),
    }),
  ]);

  const rows = await request(
    "/rest/v1/chat_reads?select=messages,last_read_at&user_name=eq." + encodeURIComponent(userName),
    { headers: { Accept: "application/json" } },
  );
  assert.equal(rows.length, 1, "concurrent receipt writes must leave one row");
  const row = rows[0];
  const receipts = row.messages || {};
  assert.deepEqual(
    [...(receipts[sharedMessage] || [])].sort(),
    ["Lohan", "Ricardo"],
    "concurrent updates to the same message must preserve both readers",
  );
  assert.deepEqual(receipts[firstMessage], ["Guilherme"], "first distinct message receipt must survive");
  assert.deepEqual(receipts[secondMessage], ["Ícaro"], "second distinct message receipt must survive");
  assert.equal(Date.parse(row.last_read_at), Date.parse(secondReadAt), "read cursor must retain the newest valid timestamp");
  console.log("Atomic chat receipt concurrency test passed.");
} finally {
  await request(
    "/rest/v1/chat_reads?user_name=eq." + encodeURIComponent(userName),
    { method: "DELETE" },
  ).catch(error => {
    console.error("Fixture cleanup failed:", error.message);
    process.exitCode = 1;
  });
}
