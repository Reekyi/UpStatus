import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assertIsolatedSupabaseMutationTarget } from "./assert-isolated-supabase.mjs";

const valid = {
  baseUrl: "https://bfpjtfqlnypisxljoxkb.supabase.co",
  serviceKey: "test-only-placeholder",
  allowMutation: "1",
};
assert.equal(assertIsolatedSupabaseMutationTarget(valid), valid.baseUrl);
assert.throws(() => assertIsolatedSupabaseMutationTarget({ ...valid, allowMutation: "0" }), /UPSTATUS_SIGNAL_ALLOW_MUTATION/);
assert.throws(() => assertIsolatedSupabaseMutationTarget({ ...valid, serviceKey: "" }), /SUPABASE_SERVICE_ROLE_KEY/);
assert.throws(() => assertIsolatedSupabaseMutationTarget({ ...valid, baseUrl: "https://dlfvkawaiqduhlazsszm.supabase.co" }), /only https/);
assert.throws(() => assertIsolatedSupabaseMutationTarget({ ...valid, baseUrl: "http://bfpjtfqlnypisxljoxkb.supabase.co" }), /only https/);
assert.throws(() => assertIsolatedSupabaseMutationTarget({ ...valid, baseUrl: valid.baseUrl + "/rest/v1" }), /only https/);
assert.throws(() => assertIsolatedSupabaseMutationTarget({ ...valid, baseUrl: valid.baseUrl + "?project=other" }), /only https/);
assert.throws(() => assertIsolatedSupabaseMutationTarget({ ...valid, baseUrl: valid.baseUrl + "#fragment" }), /only https/);
assert.throws(() => assertIsolatedSupabaseMutationTarget({ ...valid, baseUrl: valid.baseUrl.replace("https://", "https://user:pass@") }), /only https/);

for (const [file, pattern] of [
  ["run-signaling-authenticated.mjs", /verifyIsolatedSupabaseMutationTarget/],
  ["test-signal-rate-limit.mjs", /verifyIsolatedSupabaseMutationTarget/],
  ["test-chat-read-receipts.mjs", /verifyIsolatedSupabaseMutationTarget/],
  ["test-signaling-browser.mjs", /UPSTATUS_SIGNAL_ALLOW_MUTATION !== "1"/],
  ["test-signaling-authenticated.mjs", /UPSTATUS_SIGNAL_ALLOW_MUTATION !== "1"/],
]) {
  const source = readFileSync(new URL("./" + file, import.meta.url), "utf8");
  assert.match(source, pattern, file + " must enforce the isolated mutation guard.");
}

const workflow = readFileSync(new URL("../.github/workflows/signaling-smoke.yml", import.meta.url), "utf8");
assert.match(workflow, /UPSTATUS_SIGNAL_ALLOW_MUTATION: "1"/, "workflow must explicitly opt in to isolated fixture mutations");
assert.match(workflow, /UPSTATUS_SIGNAL_TEST_SERVICE_ROLE_KEY is required; refusing to skip/, "workflow must fail closed when the test secret is missing");
assert.doesNotMatch(workflow, /SKIP: UPSTATUS_SIGNAL_TEST_SERVICE_ROLE_KEY/, "workflow must not report a false-green skip");

console.log("Isolated Supabase mutation guard and workflow wiring checks passed.");
