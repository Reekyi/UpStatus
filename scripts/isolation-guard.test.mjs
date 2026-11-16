import assert from "node:assert/strict";
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
console.log("Isolated Supabase mutation guard checks passed.");
