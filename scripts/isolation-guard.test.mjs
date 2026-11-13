import assert from "node:assert/strict";
import fs from "node:fs";
import { assertIsolatedSupabaseMutationTarget } from "./assert-isolated-supabase.mjs";

const valid = {
  baseUrl: "https://bfpjtfqlnypisxljoxkb.supabase.co",
  serviceKey: "test-only-placeholder",
  allowMutation: "1",
};
assert.equal(assertIsolatedSupabaseMutationTarget(valid), valid.baseUrl);
assert.throws(
  () => assertIsolatedSupabaseMutationTarget({ ...valid, allowMutation: "0" }),
  /runner-specific UPSTATUS_\*_ALLOW_MUTATION/,
);
assert.throws(() => assertIsolatedSupabaseMutationTarget({ ...valid, serviceKey: "" }), /SUPABASE_SERVICE_ROLE_KEY/);
assert.throws(() => assertIsolatedSupabaseMutationTarget({ ...valid, baseUrl: "https://dlfvkawaiqduhlazsszm.supabase.co" }), /only https/);
assert.throws(() => assertIsolatedSupabaseMutationTarget({ ...valid, baseUrl: "http://bfpjtfqlnypisxljoxkb.supabase.co" }), /only https/);
assert.throws(() => assertIsolatedSupabaseMutationTarget({ ...valid, baseUrl: valid.baseUrl + "/rest/v1" }), /only https/);
assert.throws(() => assertIsolatedSupabaseMutationTarget({ ...valid, baseUrl: valid.baseUrl + "?project=other" }), /only https/);

const authRunner = fs.readFileSync(new URL("./test-auth-enrollment.mjs", import.meta.url), "utf8");
assert.match(authRunner, /allowMutation:\s*process\.env\.UPSTATUS_AUTH_ALLOW_MUTATION/,
  "AUTH-03 runner must use its explicit AUTH mutation opt-in");
assert.match(authRunner, /redirect:\s*["']error["']/,
  "AUTH-03 fixture requests must reject redirects before forwarding service-role headers");

const isolationHelper = fs.readFileSync(new URL("./assert-isolated-supabase.mjs", import.meta.url), "utf8");
assert.match(isolationHelper, /redirect:\s*["']error["']/,
  "read-only project identity preflight must reject redirects");
console.log("Isolated Supabase mutation and credential redirect guard checks passed.");
