#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateProductionCutover, hasAuthEnrollmentTestInvocation, parseDeployedFunctions, REQUIRED_SETUP_MIGRATIONS } from "./verify-production-cutover.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const apiFunction = "upstatus-screen-share-3-1-1-beta10";
const distributionFunction = "upstatus";
const apiDeploy = "          supabase functions deploy " + apiFunction + ' --project-ref "$SUPABASE_PROJECT_ID" --use-api';
const distributionDeploy = '          supabase functions deploy upstatus --project-ref "$SUPABASE_PROJECT_ID" --use-api';
const workflow = [
  "      - name: Deploy production API before userscript distribution",
  "        run: |",
  apiDeploy,
  distributionDeploy,
].join("\n");
const manifest = {
  productionFunction: distributionFunction,
  productionApiFunction: apiFunction,
  productionApiBase: "https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/" + apiFunction,
};
const secureServerSource = [
  "async function account(name:string){return {role:'implementation_admin'};}",
  "async function admin(name:string|null){",
  "if(!name)return false;",
  "const a=await account(name);",
  'return a?.role==="implementation_admin";',
  "}",
  "async function issueSetupInvite(req:Request,adminName:string){",
  "if(!await admin(adminName))return response({},403);",
  'randomBytes(32).toString("hex")',
  "setup_token_hash:tokenHash(raw)",
  "consume_upstatus_setup_invite",
  "p_setup_token_hash:tokenHash(setupToken)",
  'const enrolledRole=String(enrolled.role||"");',
  'const sessionRole=enrolledRole.trim()?enrolledRole:"implementation_user";',
  'if(path==="/api/chat/clear"&&req.method==="POST"){',
  'if(name!=="Ricardo"||!(await admin(name)))return response({},403);',
  "async function deleteRoute(name:string,id:string){",
  "const {data}=await db.from('messages').select('id,user_name').eq('id',id).maybeSingle();",
  "if(!data)return response({},404);",
  "const isAdmin=await admin(name);",
  "if(data.user_name!==name&&!isAdmin)return response({},403);",
  "}",
].join("\\n");

assert.deepEqual(parseDeployedFunctions(workflow), [apiFunction, distributionFunction]);

const validateInvocation = 'execFileSync(process.execPath,[path.join(ROOT,"scripts/auth-enrollment.test.mjs"),"normal"],{stdio:"inherit"});';
const validateInvocationSplit = 'execFileSync(process.execPath,[path.join(ROOT,"scripts","auth-enrollment.test.mjs"),"normal"],{stdio:"inherit"});';
assert.equal(hasAuthEnrollmentTestInvocation(validateInvocation), true, "the normal enrollment test must be invoked by Validate");
assert.equal(hasAuthEnrollmentTestInvocation(validateInvocationSplit), true, "split path.join arguments must also be recognized");
assert.equal(hasAuthEnrollmentTestInvocation("// " + validateInvocation), false, "a comment mentioning the test must not satisfy the release gate");
assert.equal(hasAuthEnrollmentTestInvocation("const marker = 1; // " + validateInvocation), false, "an inline comment mentioning the test must not satisfy the release gate");
assert.equal(hasAuthEnrollmentTestInvocation(validateInvocation.replace('"normal"', '"team-lite"')), false, "Team Lite-only execution must not satisfy the Normal release gate");

const actualServerSource = fs.readFileSync(path.join(ROOT, "src/server/index.template.ts"), "utf8");
const actualSourceResult = evaluateProductionCutover({
  manifest,
  workflow,
  availableSources: [distributionFunction, apiFunction],
  serverSource: actualServerSource,
  availableMigrations: REQUIRED_SETUP_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert(!actualSourceResult.issues.some(issue => issue.includes("Administrative authorization must derive only from the persisted")), "the current production candidate admin helper must be backed by the stored role");
assert(!actualSourceResult.issues.some(issue => issue.includes("Message deletion must allow the owner")), "the current production candidate deleteRoute must use stored-role admin authorization");
assert(!actualSourceResult.issues.some(issue => issue.includes("Chat clear must require Ricardo")), "the current production candidate chat clear must use stored-role authorization");

const aligned = evaluateProductionCutover({
  manifest,
  workflow,
  availableSources: [distributionFunction, apiFunction],
  serverSource: secureServerSource,
  availableMigrations: REQUIRED_SETUP_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(aligned.ready, true);
assert.deepEqual(aligned.issues, []);

const apiNotDeployed = evaluateProductionCutover({
  manifest,
  workflow: workflow.replace(apiDeploy, "# API deployment omitted"),
  availableSources: [distributionFunction, apiFunction],
  serverSource: secureServerSource,
  availableMigrations: REQUIRED_SETUP_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(apiNotDeployed.ready, false);
assert(apiNotDeployed.issues.some(issue => issue.includes('runtime "' + apiFunction + '" is not deployed')));

const apiSourceMissing = evaluateProductionCutover({
  manifest,
  workflow,
  availableSources: [distributionFunction],
  serverSource: secureServerSource,
  availableMigrations: REQUIRED_SETUP_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(apiSourceMissing.ready, false);
assert(apiSourceMissing.issues.some(issue => issue.includes("source \"supabase/functions/" + apiFunction + "/index.ts\" is not versioned/generated")));

const reversed = evaluateProductionCutover({
  manifest,
  workflow: workflow.replace(apiDeploy + "\n" + distributionDeploy, distributionDeploy + "\n" + apiDeploy),
  availableSources: [distributionFunction, apiFunction],
  serverSource: secureServerSource,
  availableMigrations: REQUIRED_SETUP_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(reversed.ready, false);
assert(reversed.issues.some(issue => issue.includes("API runtime must be deployed before the userscript distribution")));

const unexpected = evaluateProductionCutover({
  manifest,
  workflow: workflow.replace(distributionDeploy, distributionDeploy + "\n          supabase functions deploy upstatus-test --project-ref \"$SUPABASE_PROJECT_ID\" --use-api"),
  availableSources: [distributionFunction, apiFunction, "upstatus-test"],
  serverSource: secureServerSource,
  availableMigrations: REQUIRED_SETUP_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(unexpected.ready, false);
assert(unexpected.issues.some(issue => issue.includes('Unexpected production runtime "upstatus-test"')));

const noInvite = evaluateProductionCutover({
  manifest,
  workflow,
  availableSources: [distributionFunction, apiFunction],
  serverSource: 'if(path==="/api/chat/clear"&&req.method==="POST"){if(name!=="Ricardo"||!await admin(name))return response({},403);}',
  availableMigrations: REQUIRED_SETUP_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(noInvite.ready, false);
assert(noInvite.issues.some(issue => issue.includes("AUTH-03 is not release-ready")));

const missingAuthTest = evaluateProductionCutover({
  manifest,
  workflow,
  availableSources: [distributionFunction, apiFunction],
  serverSource: secureServerSource,
  availableMigrations: REQUIRED_SETUP_MIGRATIONS,
  authEnrollmentTestPresent: false,
});
assert.equal(missingAuthTest.ready, false);
assert(missingAuthTest.issues.some(issue => issue.includes("AUTH-03 regression test is missing")));

const missingMigration = evaluateProductionCutover({
  manifest,
  workflow,
  availableSources: [distributionFunction, apiFunction],
  serverSource: secureServerSource,
  availableMigrations: REQUIRED_SETUP_MIGRATIONS.slice(1),
  authEnrollmentTestPresent: true,
});
assert.equal(missingMigration.ready, false);
assert(missingMigration.issues.some(issue => issue.includes("Required AUTH-03 migration source is missing")));

const nameFallback = evaluateProductionCutover({
  manifest,
  workflow,
  availableSources: [distributionFunction, apiFunction],
  serverSource: secureServerSource + '\nconst role=["Ricardo","Lohan","Guilherme"].includes(name)?"implementation_admin":"implementation_user";',
  availableMigrations: REQUIRED_SETUP_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(nameFallback.ready, false);
assert(nameFallback.issues.some(issue => issue.includes("must not grant implementation_admin by hard-coded account name")));

const nameOnlyChatClear = evaluateProductionCutover({
  manifest,
  workflow,
  availableSources: [distributionFunction, apiFunction],
  serverSource: secureServerSource.replace('if(name!=="Ricardo"||!(await admin(name)))', 'if(name!=="Ricardo")'),
  availableMigrations: REQUIRED_SETUP_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(nameOnlyChatClear.ready, false);
assert(nameOnlyChatClear.issues.some(issue => issue.includes("Chat clear must require Ricardo")));

const nameOnlyMessageDelete = evaluateProductionCutover({
  manifest,
  workflow,
  availableSources: [distributionFunction, apiFunction],
  serverSource: secureServerSource.replace("const isAdmin=await admin(name);", 'const isAdmin=name==="Ricardo";'),
  availableMigrations: REQUIRED_SETUP_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(nameOnlyMessageDelete.ready, false);
assert(nameOnlyMessageDelete.issues.some(issue => issue.includes("Message deletion must allow the owner")));

const nameFallbackAdmin = evaluateProductionCutover({
  manifest,
  workflow,
  availableSources: [distributionFunction, apiFunction],
  serverSource: secureServerSource.replace('return a?.role==="implementation_admin";', 'return name==="Ricardo";'),
  availableMigrations: REQUIRED_SETUP_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(nameFallbackAdmin.ready, false);
assert(nameFallbackAdmin.issues.some(issue => issue.includes("Administrative authorization must derive only from the persisted")));

const unsafeWorkflow = evaluateProductionCutover({
  manifest,
  workflow: workflow + "\nsupabase db push",
  availableSources: [distributionFunction, apiFunction],
  serverSource: secureServerSource,
  availableMigrations: REQUIRED_SETUP_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(unsafeWorkflow.ready, false);
assert(unsafeWorkflow.issues.some(issue => issue.includes("must not apply database migrations automatically")));

const wrongTarget = evaluateProductionCutover({
  manifest: {
    ...manifest,
    productionApiBase: "https://bfpjtfqlnypisxljoxkb.supabase.co/functions/v1/" + apiFunction,
  },
  workflow,
  availableSources: [distributionFunction, apiFunction],
  serverSource: secureServerSource,
  availableMigrations: REQUIRED_SETUP_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(wrongTarget.ready, false);
assert(wrongTarget.issues.some(issue => issue.includes("approved production API function")));

const missingManifestField = evaluateProductionCutover({
  manifest: { productionFunction: distributionFunction },
  workflow,
  availableSources: [distributionFunction],
  serverSource: secureServerSource,
  availableMigrations: REQUIRED_SETUP_MIGRATIONS,
  authEnrollmentTestPresent: true,
});
assert.equal(missingManifestField.ready, false);
assert(missingManifestField.issues.some(issue => issue.includes("productionApiFunction is missing or invalid")));

console.log("PASS production cutover guard: API-first alignment, AUTH-03 invite/atomic consumption and executable regression wiring, stored-role chat clear and individual-message deletion, required migrations, no automatic db push; missing deploy/source/test, reversed order, TEST deploy, first-caller setup, name-based admin/delete fallback, comment-only test reference, name-only chat clear, missing migrations, wrong host and incomplete manifest blocked.");
