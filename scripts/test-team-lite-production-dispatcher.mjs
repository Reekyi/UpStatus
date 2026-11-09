#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { assertAuthorizedReleaseApproval } from "./verify-team-lite-release-review.mjs";

const workflow = fs.readFileSync(".github/workflows/deploy-team-lite-production.yml", "utf8");

assert.match(workflow, /^name: Team Lite Production Dispatcher$/m);
assert.match(workflow, /^  workflow_dispatch:\n/m,
  "the dispatcher must be present on the repository default branch");
assert.match(workflow, /release_sha:[\s\S]*?required: true[\s\S]*?type: string/,
  "the exact Team Lite release SHA must be a required input");
assert.match(workflow, /approved_pr_number:[\s\S]*?required: true[\s\S]*?type: number/,
  "a merged, human-approved PR must be explicitly identified");
assert.match(workflow, /release_version:[\s\S]*?required: true[\s\S]*?type: string/,
  "the exact stable release version must be a required input");
assert.match(workflow, /confirm_production_deploy:[\s\S]*?required: true[\s\S]*?default: false/,
  "production confirmation must be explicit and default to false");
assert.match(workflow, /branches:\n\s+- master/,
  "the dispatcher PR guard must target master");
assert.match(workflow, /branches:\n\s+- fix\/team-lite-production-dispatcher-master-20261109/,
  "the offline guard push must be limited to this isolated candidate branch");

assert.match(workflow, /permissions:[\s\S]*?contents: read[\s\S]*?pull-requests: read[\s\S]*?checks: read/,
  "the dispatcher must grant only the read permissions needed for provenance checks");
assert.match(workflow, /offline_guard:[\s\S]*?if: github\.event_name != 'workflow_dispatch'/,
  "push/PR validation must be offline-only");
assert.match(workflow, /deploy:[\s\S]*?if: github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/master' && inputs\.confirm_production_deploy == true/,
  "the production job must run only from default-branch manual dispatch with explicit confirmation");
assert.match(workflow, /GITHUB_REF[\s\S]*?refs\/heads\/master/,
  "the runtime guard must reject dispatch from a non-default ref");
assert.match(workflow, /git\/ref\/heads\/team-lite-official/,
  "the current official Team Lite branch head must be resolved through GitHub API");
assert.match(workflow, /current_sha[\s\S]*?RELEASE_SHA/,
  "the supplied release SHA must exactly match the current official branch head");
assert.match(workflow, /pulls\/\$APPROVED_PR_NUMBER/,
  "the supplied PR must be read from GitHub before deployment");
assert.match(workflow, /\.merged_at[\s\S]*?\.base\.ref[\s\S]*?\.merge_commit_sha[\s\S]*?RELEASE_SHA/,
  "the approved PR must be merged into team-lite-official and produce the exact release SHA");
assert.match(workflow, /reviews\?per_page=100[\s\S]*?review_count[\s\S]*?-ge 100[\s\S]*?team-lite-release-reviews\.json[\s\S]*?verify-team-lite-release-review\.mjs/,
  "the workflow must pass the complete current PR review response to the exact-head approval verifier");
assert.match(workflow, /UPSTATUS_RELEASE_REVIEWERS[\s\S]*?vars\.UPSTATUS_RELEASE_REVIEWERS/,
  "the workflow must use an explicit repository allowlist of authorized release reviewers");
assert.match(workflow, /verify-team-lite-release-review\.mjs[\s\S]*?head_sha[\s\S]*?author_login[\s\S]*?UPSTATUS_RELEASE_REVIEWERS/,
  "approval verification must bind the human reviewer to the exact PR head and author");
assert.match(workflow, /review_count[\s\S]*?-ge 100/,
  "the workflow must fail closed rather than silently truncate a multi-page review history");
assert.match(workflow, /check-runs\?per_page=100[\s\S]*?check_count[\s\S]*?returned_check_count[\s\S]*?bad_checks/,
  "the approved PR head must have completed successful or explicitly skipped check runs");
assert.match(workflow, /check_count[\s\S]*?-ne "\$returned_check_count"/,
  "the workflow must fail closed if check-run pagination is incomplete");
assert.match(workflow, /grep -q "assertTeamLiteProductionMainBranch"/,
  "the target Team Lite candidate must reject an unhealthy managed main branch");
assert.match(workflow, /grep -q "assertRemoteMigrationsHaveLocalFiles"/,
  "the target Team Lite candidate must reconcile every remote migration to a local source file");
assert.match(workflow, /grep -q "assertTeamLiteProductionMainBranch"/,
  "the target Team Lite candidate must reject an unhealthy managed main branch");
assert.match(workflow, /grep -q "assertRemoteMigrationsHaveLocalFiles"/,
  "the target Team Lite candidate must reconcile every remote migration to a local source file");
assert.match(workflow, /ref: \$\{\{ inputs\.release_sha \}\}/,
  "checkout must use the explicitly supplied release SHA");
assert.match(workflow, /git rev-parse HEAD[\s\S]*?RELEASE_SHA/,
  "the checked-out source must be verified against the supplied release SHA");

for (const required of [
  "scripts/verify-team-lite-release.mjs",
  "scripts/team-lite-candidate-check.mjs",
  "scripts/test-team-lite-production-deploy.mjs",
  "scripts/verify-team-lite-production-project.mjs",
  "scripts/verify-team-lite-production-migrations.mjs",
  "scripts/migration-layout.test.mjs",
]) {
  assert.ok(workflow.includes(required), "missing candidate preflight: " + required);
}

const dispatcherCheckoutIndex = workflow.indexOf("Checkout default-branch dispatcher source");
const approvedPrIndex = workflow.indexOf("Require an approved merged PR");
const checkoutIndex = workflow.indexOf("Checkout exact Team Lite release candidate");
const releaseIndex = workflow.indexOf("node scripts/verify-team-lite-release.mjs");
const buildIndex = workflow.indexOf("node scripts/build.mjs");
const candidateIndex = workflow.indexOf("node scripts/team-lite-candidate-check.mjs");
const projectIndex = workflow.indexOf("node scripts/verify-team-lite-production-project.mjs");
const migrationsIndex = workflow.indexOf("node scripts/verify-team-lite-production-migrations.mjs");
const cliIndex = workflow.indexOf("name: Setup pinned Supabase CLI");
const deployIndex = workflow.indexOf("supabase functions deploy");
const finalHeadCheckIndex = workflow.indexOf("Recheck Team Lite release SHA immediately before deployment");
const finalHeadApiIndex = workflow.indexOf("/git/ref/heads/team-lite-official", finalHeadCheckIndex);
const finalHeadCompareIndex = workflow.indexOf('if [ "$final_current_sha" != "$RELEASE_SHA" ]', finalHeadCheckIndex);
const finalDeployStepIndex = workflow.indexOf("      - name: Deploy Team Lite function only");
assert.ok(finalHeadCheckIndex > cliIndex && finalHeadApiIndex > finalHeadCheckIndex &&
  finalHeadCompareIndex > finalHeadApiIndex && finalDeployStepIndex > finalHeadCompareIndex &&
  !workflow.slice(finalHeadCheckIndex, finalDeployStepIndex).includes("\\n      - name:"),
  "the official branch head must be rechecked after all preflights and immediately before the deploy step");

assert.ok(dispatcherCheckoutIndex > 0 && approvedPrIndex > dispatcherCheckoutIndex &&
  checkoutIndex > approvedPrIndex && releaseIndex > checkoutIndex &&
  buildIndex > releaseIndex && candidateIndex > buildIndex &&
  projectIndex > candidateIndex && migrationsIndex > projectIndex &&
  cliIndex > migrationsIndex && deployIndex > cliIndex,
  "PR provenance, source, release, candidate, project and migration preflights must complete before CLI setup/deploy");

assert.match(workflow, /EXPECTED_PRODUCTION_PROJECT_ID: dlfvkawaiqduhlazsszm/);
assert.match(workflow, /EXPECTED_SUPABASE_ORGANIZATION_ID: bcjtvojfkfoxvsitzmkl/);
assert.match(workflow, /EXPECTED_ISOLATED_SIGNALING_PROJECT_ID: bfpjtfqlnypisxljoxkb/);
assert.match(workflow, /EXPECTED_CURRENT_TEAM_LITE_VERSION: ["']3\.4\.30["']/);
assert.match(workflow, /version: 2\.122\.1/);
assert.doesNotMatch(workflow, /version:\s*latest/);
assert.match(workflow, /environment: production/);
assert.match(workflow, /group: upstatus-team-lite-production-deploy[\s\S]*?queue: max[\s\S]*?cancel-in-progress: false/);

const deployCommands = workflow.match(/^\s*run: supabase functions deploy .+$/gm) || [];
assert.equal(deployCommands.length, 1, "the dispatcher must contain exactly one deploy command");
assert.match(deployCommands[0], /--no-verify-jwt upstatus-team-lite/);
assert.match(deployCommands[0], /--project-ref "\$SUPABASE_PROJECT_ID" --use-api/);
assert.doesNotMatch(workflow, /supabase functions deploy upstatus(?:\s|$)/,
  "Team Lite must never deploy the Normal function");
assert.doesNotMatch(workflow, /supabase functions deploy (?:--no-verify-jwt )?upstatus-test\b|supabase functions deploy .*upstatus-signal/,
  "Team Lite must never deploy TEST or signaling fixture functions");
assert.doesNotMatch(workflow, /supabase\s+(?:db\s+push|migration\s+up)/,
  "the production dispatcher must never apply migrations");
assert.doesNotMatch(workflow, /^  (?:schedule|workflow_run):/m,
  "the dispatcher must not run on a schedule or workflow completion");

const approvalHead = "c".repeat(40);
const approvedAt = "2026-11-09T10:00:00Z";
const approval = {
  id: 1,
  state: "APPROVED",
  commit_id: approvalHead,
  submitted_at: approvedAt,
  user: { login: "release-reviewer", type: "User" },
};
const approvalOptions = {
  headSha: approvalHead,
  authorLogin: "release-author",
  authorizedReviewers: "release-reviewer, backup-reviewer",
};
assert.deepEqual(
  assertAuthorizedReleaseApproval([approval], approvalOptions),
  { reviewer: "release-reviewer", headSha: approvalHead, submittedAt: approvedAt },
);
assert.doesNotThrow(() => assertAuthorizedReleaseApproval([
  { ...approval, commit_id: "d".repeat(40), state: "CHANGES_REQUESTED" },
  approval,
  { id: 2, state: "COMMENTED", commit_id: approvalHead, submitted_at: "2026-11-09T10:01:00Z", user: { login: "commenter", type: "User" } },
], approvalOptions));
assert.throws(() => assertAuthorizedReleaseApproval([
  { ...approval, user: { login: "release-reviewer[bot]", type: "Bot" } },
], approvalOptions), /human GitHub user/);
assert.throws(() => assertAuthorizedReleaseApproval([
  { ...approval, user: { login: "unlisted-reviewer", type: "User" } },
], approvalOptions), /not in UPSTATUS_RELEASE_REVIEWERS/);
assert.throws(() => assertAuthorizedReleaseApproval([
  { ...approval, user: { login: "release-author", type: "User" } },
], approvalOptions), /cannot approve their own/);
assert.throws(() => assertAuthorizedReleaseApproval([
  { ...approval, commit_id: "d".repeat(40) },
], approvalOptions), /no latest APPROVED review/);
assert.throws(() => assertAuthorizedReleaseApproval([
  approval,
  { id: 2, state: "CHANGES_REQUESTED", commit_id: approvalHead, submitted_at: "2026-11-09T10:02:00Z", user: { login: "release-reviewer", type: "User" } },
], approvalOptions), /no latest APPROVED review/);
assert.throws(() => assertAuthorizedReleaseApproval([
  approval,
  { id: 2, state: "DISMISSED", commit_id: approvalHead, submitted_at: "2026-11-09T10:02:00Z", user: { login: "release-reviewer", type: "User" } },
], approvalOptions), /no latest APPROVED review/);
assert.throws(() => assertAuthorizedReleaseApproval([approval], {
  ...approvalOptions,
  authorizedReviewers: "",
}), /UPSTATUS_RELEASE_REVIEWERS/);
assert.throws(() => assertAuthorizedReleaseApproval([
  { ...approval, submitted_at: "not-a-date" },
], approvalOptions), /invalid submission timestamp/);

console.log("PASS Team Lite dispatcher guard with exact-head authorized human review provenance.");
