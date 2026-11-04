# UpStatus release cutover plan

Status: candidate preparation only. This document does not authorize production changes.

## Current deployed baseline (read-only inventory, 2026-11-04)

### Normal
- Release manifest: 3.4.7.
- Production main function: upstatus, deployed version 480.
- Production legacy runtime endpoint used by the userscript build: upstatus-screen-share-3-1-1-beta10, deployed version 6.
- Userscript update artifact URL already points to /functions/v1/upstatus/upstatus.user.js.
- The build script still renders CLOUD_SERVER to the legacy upstatus-screen-share-3-1-1-beta10 endpoint. Do not change only one of these URLs.

### Team Lite
- Release manifest: core 3.4.7, build 3.4.31.
- Production function: upstatus-team-lite, deployed version 15.
- Stable userscript URL currently points to the team-lite-official branch.
- Candidate changes are in PR #76 and must not be distributed from the stable URL before approval.

### Realtime authorization dependency
- The current userscript subscribes to a public Realtime topic and authenticates UpStatus API calls with its own x-upstatus-token. That custom token is not a Supabase Auth JWT.
- Supabase private Realtime channels require config.private=true plus RLS policies on realtime.messages and a valid Auth JWT in the Realtime connection. See https://supabase.com/docs/guides/realtime/authorization.
- Therefore, do not simply revoke anon/authenticated privileges on realtime.messages or flip the channel to private. First design and test a trusted JWT exchange or replace the public broadcast dependency with an authenticated server-mediated/polling path.
- Keep RT-01 and RT-17 open until that migration is implemented and validated end-to-end.

### Signaling candidate
- Isolated project function upstatus-signal-test is deployed at version 27.
- It validates authenticated room signaling and now uses a Postgres-backed fixed-window rate limiter.
- This endpoint is isolated-only. There is no production upstatus-signal endpoint in the current production inventory.
- The authenticated transport in both userscripts remains opt-in and disabled by default. Do not enable it globally until the production endpoint and migration sequence are ready.

## Required order

1. **Freeze the candidate heads**
   - Normal PR #74 and Team Lite PR #76 remain Draft.
   - Record the exact head SHAs and require passing Validate, Signaling Smoke, and Candidate Checks on those exact heads.
   - Resolve any workflow queue or failure before preparing release artifacts.

2. **Prepare production migrations**
   - Generate production migration files through the approved Supabase CLI workflow. Do not copy isolated migration versions or names ending in _test into production.
   - Review the SQL and rollback for: trigger-only SECURITY DEFINER execute grants; backend-owned table grants; chat receipt atomic merge RPC; rate-limit table/RPC if the production signaling endpoint will use it.
   - Confirm the Realtime realtime.messages grants and public topic dependency before changing them. Revoking those grants without moving the client off public channels may break broadcasts.
   - Apply to official TEST first, run smoke and rollback checks, then obtain explicit approval before production.

3. **Deploy backend before client**
   - Deploy the reviewed backend function to the intended product endpoint.
   - Verify health, authentication, chat read receipts, room creation/invitation, signal delivery, poll/ack, rate limits, and cleanup against the deployed candidate.
   - Keep the legacy endpoint available during the validation window.

4. **Switch Normal as one coordinated release**
   - Update the build-time CLOUD_SERVER target and the update artifact URL consistently.
   - Increment the release version and build artifacts from the reviewed commit.
   - Verify manifest version, userscript metadata, endpoint path, embedded backend version, and download/update URL.
   - Do not distribute until the new endpoint has passed authenticated browser tests.

5. **Switch Team Lite separately**
   - Keep the Team Lite stable URL and version unchanged until PR #76 is approved.
   - Publish a new versioned artifact from the approved Team Lite head.
   - Verify Lucca/Ycaro session boundaries, guest read receipts, updater behavior, and Normal ↔ Team Lite compatibility.

6. **Enable authenticated signaling gradually**
   - Keep the opt-in flag disabled by default.
   - Enable only for a controlled test cohort after the endpoint is deployed and validated.
   - Verify voice, screen sharing, room invitation, reconnection, peer teardown, and rate-limit behavior before widening rollout.

## Rollback

- Preserve the previous userscript artifacts and endpoint versions.
- If the new endpoint fails, restore the prior CLOUD_SERVER target and previous artifact URL/version as one coordinated rollback.
- Disable the new signaling opt-in flag for the affected cohort.
- Keep additive database objects in place unless a reviewed rollback proves they are safe to remove.
- Restore any revoked grants only through an explicit reviewed migration; do not use ad-hoc console edits.
- Record the exact failing version, endpoint, migration versions, and test evidence.

## Release gates still open

- Final-head Normal Signaling Smoke and Team Lite Candidate Checks, including the new 429 endpoint test and concurrent rate-limit RPC test.
- Production migration review and official TEST validation.
- Public Realtime topic / realtime.messages decision.
- Production endpoint cutover and release version increments.
- Physical browser network-loss recovery, Tampermonkey permissions, real microphone and screen capture checks.
- Manual chat scroll/unread confirmation and Sale Smartly confirmation.
- Ycaro scope and secret configuration decision.

## Safety boundary

No production deployment, migration, feature-flag change, stable artifact publication, PR merge, or endpoint cutover is authorized by this plan. Each requires explicit approval after the preceding gates pass.
