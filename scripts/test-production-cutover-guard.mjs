#!/usr/bin/env node
import assert from "node:assert/strict";
import { evaluateProductionCutover, parseDeployedFunctions } from "./verify-production-cutover.mjs";

const workflow = [
  "      - name: Deploy PRODUCTION only",
  "        run: supabase functions deploy upstatus --project-ref \\\"$SUPABASE_PROJECT_ID\\\" --use-api",
].join("\n");

assert.deepEqual(parseDeployedFunctions(workflow), ["upstatus"]);

const aligned = evaluateProductionCutover({
  manifest: {
    productionFunction: "upstatus",
    productionApiFunction: "upstatus",
    productionApiBase: "https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus",
  },
  workflow,
  availableSources: ["upstatus"],
});
assert.equal(aligned.ready, true);
assert.deepEqual(aligned.issues, []);

const currentMismatch = evaluateProductionCutover({
  manifest: {
    productionFunction: "upstatus",
    productionApiFunction: "upstatus-screen-share-3-1-1-beta10",
    productionApiBase: "https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus-screen-share-3-1-1-beta10",
  },
  workflow,
  availableSources: ["upstatus"],
});
assert.equal(currentMismatch.ready, false);
assert(currentMismatch.issues.some(issue => issue.includes('runtime "upstatus-screen-share-3-1-1-beta10" is not deployed')));
assert(currentMismatch.issues.some(issue => issue.includes('source "supabase/functions/upstatus-screen-share-3-1-1-beta10/index.ts" is not versioned/generated')));

const deployedWithoutSource = evaluateProductionCutover({
  manifest: {
    productionFunction: "upstatus",
    productionApiFunction: "upstatus-screen-share-3-1-1-beta10",
    productionApiBase: "https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus-screen-share-3-1-1-beta10",
  },
  workflow: workflow.replace("deploy upstatus ", "deploy upstatus-screen-share-3-1-1-beta10 "),
  availableSources: ["upstatus"],
});
assert.equal(deployedWithoutSource.ready, false);
assert(deployedWithoutSource.issues.some(issue => issue.includes("is not versioned/generated")));

const wrongTarget = evaluateProductionCutover({
  manifest: {
    productionFunction: "upstatus",
    productionApiFunction: "upstatus",
    productionApiBase: "https://bfpjtfqlnypisxljoxkb.supabase.co/functions/v1/upstatus",
  },
  workflow,
  availableSources: ["upstatus"],
});
assert.equal(wrongTarget.ready, false);
assert(wrongTarget.issues.some(issue => issue.includes("approved production API function")));

const missingManifestField = evaluateProductionCutover({
  manifest: { productionFunction: "upstatus" },
  workflow,
  availableSources: ["upstatus"],
});
assert.equal(missingManifestField.ready, false);
assert(missingManifestField.issues.some(issue => issue.includes("productionApiFunction is missing or invalid")));

console.log("PASS production cutover guard: aligned release accepted; API mismatch, missing source, wrong project host, and incomplete manifest blocked.");
