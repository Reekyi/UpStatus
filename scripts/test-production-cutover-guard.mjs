#!/usr/bin/env node
import assert from "node:assert/strict";
import { evaluateProductionCutover, parseDeployedFunctions } from "./verify-production-cutover.mjs";

const apiFunction = "upstatus-screen-share-3-1-1-beta10";
const distributionFunction = "upstatus";
const apiDeploy = `          supabase functions deploy ${apiFunction} --project-ref "$SUPABASE_PROJECT_ID" --use-api`;
const distributionDeploy = `          supabase functions deploy ${distributionFunction} --project-ref "$SUPABASE_PROJECT_ID" --use-api`;
const workflow = [
  "      - name: Deploy production API before userscript distribution",
  "        run: |",
  apiDeploy,
  distributionDeploy,
].join("\n");

assert.deepEqual(parseDeployedFunctions(workflow), [apiFunction, distributionFunction]);

const manifest = {
  productionFunction: distributionFunction,
  productionApiFunction: apiFunction,
  productionApiBase: "https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/" + apiFunction,
};
const aligned = evaluateProductionCutover({
  manifest,
  workflow,
  availableSources: [distributionFunction, apiFunction],
});
assert.equal(aligned.ready, true);
assert.deepEqual(aligned.issues, []);

const apiNotDeployed = evaluateProductionCutover({
  manifest,
  workflow: workflow.replace(apiDeploy, "# API deployment omitted"),
  availableSources: [distributionFunction, apiFunction],
});
assert.equal(apiNotDeployed.ready, false);
assert(apiNotDeployed.issues.some(issue => issue.includes('runtime "' + apiFunction + '" is not deployed')));

const apiSourceMissing = evaluateProductionCutover({
  manifest,
  workflow,
  availableSources: [distributionFunction],
});
assert.equal(apiSourceMissing.ready, false);
assert(apiSourceMissing.issues.some(issue => issue.includes("source \"supabase/functions/" + apiFunction + "/index.ts\" is not versioned/generated")));

const reversed = evaluateProductionCutover({
  manifest,
  workflow: workflow.replace(apiDeploy + "\n" + distributionDeploy, distributionDeploy + "\n" + apiDeploy),
  availableSources: [distributionFunction, apiFunction],
});
assert.equal(reversed.ready, false);
assert(reversed.issues.some(issue => issue.includes("API runtime must be deployed before the userscript distribution")));

const unexpected = evaluateProductionCutover({
  manifest,
  workflow: workflow.replace(distributionDeploy, distributionDeploy + "\n          supabase functions deploy upstatus-test --project-ref \"$SUPABASE_PROJECT_ID\" --use-api"),
  availableSources: [distributionFunction, apiFunction, "upstatus-test"],
});
assert.equal(unexpected.ready, false);
assert(unexpected.issues.some(issue => issue.includes('Unexpected production runtime "upstatus-test"')));

const wrongTarget = evaluateProductionCutover({
  manifest: {
    ...manifest,
    productionApiBase: "https://bfpjtfqlnypisxljoxkb.supabase.co/functions/v1/" + apiFunction,
  },
  workflow,
  availableSources: [distributionFunction, apiFunction],
});
assert.equal(wrongTarget.ready, false);
assert(wrongTarget.issues.some(issue => issue.includes("approved production API function")));

const missingManifestField = evaluateProductionCutover({
  manifest: { productionFunction: distributionFunction },
  workflow,
  availableSources: [distributionFunction],
});
assert.equal(missingManifestField.ready, false);
assert(missingManifestField.issues.some(issue => issue.includes("productionApiFunction is missing or invalid")));

console.log("PASS production cutover guard: aligned API-first release accepted; missing API deploy/source, reversed order, unexpected TEST deploy, wrong project host, and incomplete manifest blocked.");
