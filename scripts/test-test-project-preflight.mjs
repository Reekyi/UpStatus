import assert from "node:assert/strict";
import { assertDedicatedTestProject } from "./test-project-metadata.mjs";

const ref = "11111111111111111111";
const organizationId = "bcjtvojfkfoxvsitzmkl";
const valid = {
  id: ref,
  ref,
  organization_id: organizationId,
  status: "ACTIVE_HEALTHY",
  database: { host: "db." + ref + ".supabase.co" },
};

assert.doesNotThrow(() => assertDedicatedTestProject(valid, ref, organizationId));
assert.throws(
  () => assertDedicatedTestProject({ ...valid, id: "22222222222222222222" }, ref, organizationId),
  /reference does not match/,
);
assert.throws(
  () => assertDedicatedTestProject({ ...valid, organization_id: "aaaaaaaaaaaaaaaaaaaa" }, ref, organizationId),
  /not owned by the expected/,
);
assert.throws(
  () => assertDedicatedTestProject({ ...valid, status: "INACTIVE" }, ref, organizationId),
  /must be ACTIVE_HEALTHY/,
);
assert.throws(
  () => assertDedicatedTestProject({ ...valid, database: { host: "db.dlfvkawaiqduhlazsszm.supabase.co" } }, ref, organizationId),
  /database host does not match/,
);
assert.throws(
  () => assertDedicatedTestProject({ ...valid, database: null }, ref, organizationId),
  /database host does not match/,
);

console.log("PASS TEST project preflight requires the exact project ref, UpStatus organization, ACTIVE_HEALTHY status, and matching database host.");
