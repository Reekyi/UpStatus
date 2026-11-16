# Team Lite production deploy guard and migration parity

Date: 2026-11-09

## Base and scope

- Parent candidate: PR #76, branch team-lite/signaling-transport-candidate.
- Parent HEAD at branch creation: eb28e88325d7e8a6236d9050bebabf794d64a8c4.
- This candidate is isolated on fix/team-lite-production-deploy-guard-20261109 and targets the parent branch.
- No QA branch or document was edited.

## Verified release-blocking findings

1. The inherited .github/workflows/deploy-production.yml deployed the Normal function slug upstatus, although scripts/build.mjs generates a separate upstatus-team-lite function. Dispatching the old workflow from the Team Lite line could overwrite the Normal runtime.
2. The old workflow floated Supabase CLI to latest, did not pin the dispatch ref/SHA, did not verify the production project/organization, and did not check applied migration history.
3. The Team Lite backend template calls consume_upstatus_setup_invite and merge_chat_read_receipts. The current production database has neither RPC. Production migration history still contains only seven migrations through 20261027155438.
4. The production candidate branch already carries the three AUTH-03 setup-invite migrations, but it did not contain a production migration for merge_chat_read_receipts. Only the isolated test counterpart existed.
5. Production currently has upstatus-team-lite v15 with embedded userscript version 3.4.30 and verify_jwt=false. The Team Lite candidate manifest is stable build 3.4.31.
6. Production chat-images and profile-images buckets are both configured at 20 MiB. The candidate config had 25 MB and 2 MB respectively; the candidate config was aligned to 20 MB. Bucket privacy was not changed.

## Candidate changes

- Added production migration 20261109090000_atomic_chat_read_receipts_and_visual_config_grants.sql. It creates the atomic merge RPC as SECURITY INVOKER with an empty search_path, revokes execution from PUBLIC/anon/authenticated, grants EXECUTE only to service_role, and retains the existing visual-config client privilege revocation.
- Added the explicit [functions.upstatus-team-lite] verify_jwt=false config section to preserve custom x-upstatus-token authentication.
- Replaced the unsafe Team Lite deploy workflow with a manual-only workflow that:
  - requires confirm_production_deploy=true (default false) and an exact release_version input;
  - requires refs/heads/team-lite-official and verifies the checkout SHA equals GITHUB_SHA;
  - verifies the exact production project, organization, and ACTIVE_HEALTHY status using read-only Management API GET;
  - verifies the three AUTH-03 migrations plus the atomic chat-read receipt migration are already applied using read-only Management API GET;
  - pins Supabase CLI 2.122.1;
  - deploys only upstatus-team-lite with --no-verify-jwt;
  - never applies migrations and never deploys upstatus, upstatus-test, or the signaling fixture function.
- Added offline tests for release version, project identity, migration history, workflow target, custom JWT configuration, and exact SQL parity with the isolated test counterpart.
- Added a dedicated offline CI workflow. It has no Supabase secrets and does not run fixture-mutating tests.
- Added no new test migration. The existing isolated SQL counterpart remains in its test-only directory.

## Expected current behavior

The production migration preflight is intentionally fail-closed today: production has not applied the three AUTH-03 migrations or the new chat-read receipt migration. The deploy workflow must not proceed until those migrations are separately reviewed, authorized, applied through the approved process, and verified.

The public Storage bucket policy remains a separate release/security gate. This candidate only aligns local config size limits; it does not change bucket privacy or apply Storage settings.

## Validation boundary

The new CI workflow runs only offline/static checks and mocked Management API responses. It does not contact Supabase, create fixtures, apply SQL, deploy, or dispatch any production workflow. The shared lab was not modified in this run.
