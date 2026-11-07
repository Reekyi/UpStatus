import assert from "node:assert/strict";
import fs from "node:fs";

const workflow = fs.readFileSync(".github/workflows/deploy-test.yml", "utf8");

assert.match(workflow, /^on:\n  workflow_dispatch:\s*$/m,
  "TEST deployment must remain manual-only");
assert.doesNotMatch(workflow, /^  (push|pull_request):/m,
  "TEST deployment must not run automatically on pushes or pull requests");
assert.doesNotMatch(workflow, /^      SUPABASE_ACCESS_TOKEN:/m,
  "Supabase access token must not be exposed at job scope");
const scopedTokenBindings = workflow.match(/^\s{10}SUPABASE_ACCESS_TOKEN: \$\{\{ secrets\.SUPABASE_ACCESS_TOKEN \}\}$/gm) || [];
assert.equal(scopedTokenBindings.length, 3,
  "Supabase access token must be scoped only to credential check, metadata verification, and deploy steps");
assert.match(workflow, /name: Verify dedicated TEST project with Supabase Management API\n        env:/,
  "metadata verifier must receive the token only at its own step");
assert.match(workflow, /name: Deploy TEST only\n        env:/,
  "deploy step must receive the token only at its own step");
assert.match(workflow, /supabase functions deploy upstatus-test --project-ref "\$SUPABASE_TEST_PROJECT_ID" --use-api/,
  "workflow must deploy only the TEST function to the verified TEST project");
assert.doesNotMatch(workflow, /secrets\.SUPABASE_PROJECT_ID/,
  "workflow must not use the shared production project secret");

console.log("PASS TEST deploy workflow is manual-only, TEST-only, and scopes the Supabase access token to the three steps that require it.");
