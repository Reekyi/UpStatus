# UpStatus independent QA audit
## 2026-11-07 09:34 UTC (06:34 BRT)

Scope: GitHub repository Reekyi/UpStatus and Supabase production project dlfvkawaiqduhlazsszm. This is a presence, chat, voice-call and screen-sharing userscript/app integrated with Sale Smartly.

This report records read-only evidence gathered after first reading docs/RELEASE_READINESS.md on the dedicated QA branch. It supersedes no prior report and does not edit the main readiness file.

## Executive result

The exact current Normal and Team Lite candidate HEADs now both have successful CI:

- Normal #74: Validate and Signaling Smoke both SUCCESS on the same exact HEAD.
- Team Lite #76: Candidate Checks SUCCESS on the same exact HEAD.

This is a material improvement over the previous checkpoint, where Normal Smoke was still running and Team Lite was queued.

Release remains BLOCKED. The reasons are not the current candidate CI results. They are the incomplete full-product TEST environment, a Normal API/distribution mismatch in the current #74 builder, missing Team Lite TEST backend/deploy path, legacy production authentication, missing auth-specific throttling, and production Realtime/grant exposure. Manual browser acceptance also remains open.

## 1. Exact GitHub heads and PR state

All PRs below were re-read from the GitHub Pull Requests API at approximately 2026-11-07 09:32 UTC.

| PR | Head branch | Exact HEAD | Base | Commits / changed files | State |
|---|---|---|---|---:|---|
| #74 Normal | chore/continuity-foundation | 7475a82e421c9286e6944ea17ee73afd39ed73d9 | master | 839 / 80 | Open, Draft, unmerged |
| #75 Team Lite baseline | team-lite/3.4.31-guest-fixes | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | team-lite-official | 59 / 10 | Open, Draft, unmerged |
| #76 Team Lite candidate | team-lite/signaling-transport-candidate | 87bbb2f91ac21477d69f7945ec62598e2bc6dce7 | team-lite-official | 310 / 42 | Open, Draft, unmerged |
| #82 QA documentation | qa/release-readiness-2026-11-04-master | f09b34ec17b5d17301fe20d7184ec038a118d46d | master | 90 / 7 | Open, Draft, unmerged |
| #84 TEST target guard | safety/test-deploy-target-guard-20261107 | 1e2f9251cb0064ed5cec713736e778edb6b0959d | develop | 20 / 11 | Open, Draft, unmerged |

Comparisons:

- #74 is 839 commits ahead of master and zero behind. This is a substantial history delta; a deliberate merge-base and history review remains required.
- #76 is 251 commits ahead of #75 and zero behind. It is the continuation of the Team Lite baseline, not an independent sibling implementation.
- #82 is 90 commits ahead of master and zero behind.
- #84 is based on develop, not master or the #74 branch. Its changes are not automatically part of the Normal release candidate.

GitHub review queries returned zero submitted human reviews for #74, #75, #76, #82 and #84. All remain Draft. No merge was performed.

## 2. Exact-head CI evidence

### Normal #74

- Validate [42354944089](https://github.com/Reekyi/UpStatus/actions/runs/42354944089): SUCCESS.
- Signaling Smoke [42354944038](https://github.com/Reekyi/UpStatus/actions/runs/42354944038): SUCCESS.
- Both runs target exact HEAD 7475a82e421c9286e6944ea17ee73afd39ed73d9.

The completed Smoke job log confirms:

- 19/19 unauthenticated endpoint checks passed.
- 129/129 authenticated integration checks passed.
- Browser WebRTC call audio, voice-room audio and screen-share video negotiations delivered remote tracks.
- Three-member authenticated mesh and teardown passed.
- Normal and Team Lite logical room aliases joined the same open voice room in the integration harness.
- Distributed endpoint rate limit: 90 accepted, one HTTP 429, Retry-After 60 seconds.
- Atomic chat read-receipt concurrency passed.
- Setup invite tests passed for NULL/empty eligibility, configured-account denial, malformed/wrong/expired/replayed tokens, one-winner concurrency, NULL/empty/whitespace role fallback, explicit-role preservation and padded-admin non-escalation.
- Temporary users, sessions, rooms, memberships and events cleanup was verified.

The Validate run also passed the TEST build-target regression and static enrollment checks.

### Team Lite #76

- Candidate Checks [42354761800](https://github.com/Reekyi/UpStatus/actions/runs/42354761800): SUCCESS.
- Exact HEAD 87bbb2f91ac21477d69f7945ec62598e2bc6dce7.

The completed job log confirms:

- 16/16 unauthenticated endpoint checks passed.
- 103/103 authenticated integration checks passed.
- Browser WebRTC call audio, voice-room audio and screen-share video delivered remote tracks.
- Three-member group mesh and teardown passed.
- Distributed signaling rate limit and atomic read receipts passed.
- Setup invite tests passed, including padded-admin non-escalation.
- Team Lite version 3.4.31, updater scenarios, userscript syntax, Lucca/Ycaro portal syntax and guest-session isolation checks passed.
- Temporary fixture cleanup was verified.

The candidate job has no Supabase Preview step and performs no full-product Edge Function deployment; its integration tests use the existing isolated signaling/auth project. Do not interpret Candidate Checks as a full product backend deployment.

### Team Lite baseline #75

Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) remains historical PASS for baseline HEAD 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309. It is not a fresh validation of #76.

### QA documentation #82

Validate [42356336014](https://github.com/Reekyi/UpStatus/actions/runs/42356336014) failed on exact QA HEAD f09b34ec17b5d17301fe20d7184ec038a118d46d.

The log built UpStatus 3.4.7 / TEST 3.4.7 and then failed at scripts/validate.mjs with:

VALIDATION FAILED: production updateURL mismatch

This is an inherited repository validation/build-manifest mismatch, not a failure in the newly added Markdown report. Do not weaken the validator to make the documentation PR green.

### TEST isolation PR #84

Validate [42358463945](https://github.com/Reekyi/UpStatus/actions/runs/42358463945) failed on exact HEAD 1e2f9251cb0064ed5cec713736e778edb6b0959d.

The new TEST target guard, dedicated-project metadata preflight and deploy-workflow secret-scope tests passed. The build then stopped at the existing develop baseline assertion:

VALIDATION FAILED: client signed upload helper missing

The failure is in the develop-based validation baseline. The PR intentionally did not weaken the assertion. #84 remains a separate develop-based candidate and is not integrated into #74/#76.

## 3. TEST isolation: safer builder, no full TEST project yet

The current Supabase organization inventory still contains exactly two projects:

| Project | Ref | State | PostgreSQL | Purpose |
|---|---|---|---|---|
| UpStatus production | dlfvkawaiqduhlazsszm | ACTIVE_HEALTHY | 17.11.0.002 | Production |
| upstatus-security-test | bfpjtfqlnypisxljoxkb | ACTIVE_HEALTHY | 17.11.0.003 | Isolated signaling/auth fixtures |

There is no third full-product TEST project.

The isolated project has 33 migration records through 20261107061242 and only two deployed Edge Functions:

- upstatus-signal-test v32, SHA f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712.
- upstatus-signal-e2e-once v3, SHA db0c9206b2171f5f5d67459e2e7451ecbaf6e8ad3c8f55cb4e491660164f5053.

It does not contain a complete Normal or Team Lite product backend.

### Guard improvements verified in candidate source

The #74 and #76 builders use UPSTATUS_TEST_PROJECT_ID. When absent, the generated TEST target is the inert sentinel 00000000000000000000. They reject both production and the isolated signaling/auth fixture project as full TEST targets before generated writes. The TEST API and Realtime origin are rendered from the same explicit target.

The #84 develop-based candidate adds a stronger deploy workflow:

- workflow_dispatch only; no push or pull_request trigger.
- Restricted to develop.
- Requires vars.SUPABASE_TEST_PROJECT_ID.
- Rejects production and the isolated fixture project.
- Requires a 20-character project ref.
- Performs a read-only Supabase Management API check for exact project ref, expected organization, ACTIVE_HEALTHY status and matching database host.
- Scopes SUPABASE_ACCESS_TOKEN to the credential check, metadata verification and deploy steps.
- Deploys only upstatus-test.

The local guard, project metadata preflight and secret-scope regression tests passed in run 42358463945. The later Validate failure was the unrelated signed-upload helper assertion.

These guards are good fail-closed improvements. They do not provision a project, and no TEST deploy was run.

### Team Lite TEST runtime gap

The current #76 scripts/build.mjs builds the Normal production function upstatus and Normal TEST function upstatus-test. It separately renders Team Lite only to upstatus-team-lite.

No upstatus-team-lite-test function is generated. The deploy-test.yml workflow deploys only upstatus-test.

Therefore:

- Team Lite client and signaling adapter regressions are covered by Candidate Checks.
- The isolated signaling API is exercised by the shared integration harness.
- The actual Team Lite Edge Function runtime is not built/deployed to a dedicated full-product TEST project by this workflow.

This is a release gate. Add a Team Lite TEST function target, manifest entry, preflight and deployment validation, or document and prove a different approved architecture that provides equivalent isolation.

## 4. Normal API and distribution mismatch remains in #74

The current #74 build script blob is 55b7db9c36a58956cfa41d5002ac290ab8fee5d3.

The current #74 release.json blob is 93caf1701ea508575c90d002c0b8c3037b34d82a and sets scriptUrl to:

https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus/upstatus.user.js

But the #74 builder still sets the production CLOUD_SERVER to:

https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus-screen-share-3-1-1-beta10

The generated updateURL is taken from release.json, while API calls use CLOUD_SERVER. Distribution and API therefore point to different functions in the current #74 candidate.

The #74 deploy-production.yml deploys only upstatus. It does not deploy beta10 or Team Lite. This means a deploy of upstatus alone does not update the API runtime currently selected by the #74 client.

The #84 develop-based builder instead derives production API and update URL from the upstatus function, but that code is on a separate develop-based PR and is not integrated into #74. Do not claim the #74 production cutover is aligned.

Required gate: make the approved Normal userscript distribution URL, API CLOUD_SERVER, Realtime origin, deployed function and rollback target agree. Verify the exact generated artifact and backend source together.

## 5. AUTH-03 candidate implementation and remaining gaps

Both current candidate templates contain the one-time setup-invite flow.

Source inspection confirms:

- Administrator context is required to issue an invite.
- The server checks the stored implementation_admin role.
- The token is 32 random bytes (256 bits).
- Only the SHA-256 token hash and issuance metadata are stored.
- Expiry is 15 minutes.
- Setup requires a 64-character hexadecimal token.
- The consume RPC checks the uninitialized account, hash and expiry in one conditional atomic update.
- Replay and concurrent consumption permit only one winner.
- NULL, empty and ASCII-whitespace-only roles default to implementation_user.
- Non-empty explicit roles are preserved literally. A padded value such as " implementation_admin " remains invalid and is not promoted to administrator.
- The isolated RPC is SECURITY INVOKER, has an empty pinned search_path, and EXECUTE is limited to service_role.

The exact-head CI logs now pass the enrollment regression for both products.

However, scripts/test-auth-enrollment.mjs provisions isolated fixtures with service_role and calls the RPC directly. It does not exercise the complete HTTP issuance path.

Still required:

1. Admin issuance through POST /api/setup-invite.
2. HTTP 403 for a non-admin issuer.
3. Full HTTP issuance-to-private-delivery-to-POST /api/setup flow.
4. Confirm token does not appear in logs.
5. Dedicated admin UI or a reviewed operational issuance procedure.

No auth-specific distributed rate limiter exists in either database or either candidate server template. Neither upstatus_auth_rate_limits nor consume_upstatus_auth_rate_limit exists. The signaling rate limiter does not protect login, setup or invite issuance.

Password policy is still asymmetric for new setup:
- Normal setup requires 6 characters; existing login accepts 4.
- Team Lite setup and login accept 4.

Normal can authenticate existing 4-character Team Lite accounts, but new setup policy should be unified at six characters or explicitly justified. Add tests that prove cross-product compatibility.

## 6. Production Edge Functions and account state

Production project dlfvkawaiqduhlazsszm is ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, with seven migration records through 20261027155438.

The inventory contains 38 ACTIVE Edge Functions, all configured with verify_jwt=false. That setting alone does not prove absence of authentication; the core application functions implement custom session authentication. Four core deployed sources were inspected in this pass:

| Function | Version | SHA |
|---|---:|---|
| upstatus | v480 | bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd |
| upstatus-test | v281 | 7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a |
| upstatus-team-lite | v15 | 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb |
| upstatus-screen-share-3-1-1-beta10 | v6 | f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29 |

All four inspected sources still expose the old public first-setup route and name-based admin fallback for an uninitialized row with no role. Their GET /api/account?name=... path still derives needsSetup from the named account.

This is a latent production provisioning risk, not evidence of a currently claimable official account.

A read-only aggregate query on production public.users found:
- 5 accounts.
- 0 NULL/empty password hashes.
- 0 NULL/blank roles.

Production has no setup-token columns/RPC, no auth rate limiter, no signaling rate limiter and no atomic chat-read receipt RPC. No candidate migration or function was deployed by QA.

The remaining 34 functions were inventoried but not all inspected route-by-route in this pass. The many old beta and backup functions remain ACTIVE; map their consumers and rollback dependencies before any retirement decision.

## 7. RLS, grants, SECURITY DEFINER and Realtime

### Production catalog

The production catalog reports ten public RLS-enabled tables and zero public policies. Nine backend-owned tables have effective grants to both anon and authenticated for all eight of these privileges:

SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN.

This is 144 effective role/table/privilege combinations (9 tables × 2 client roles × 8 privileges). upstatus_visual_config is the tenth RLS table and has no client table grants.

RLS with zero policies denies ordinary row access, but it does not protect TRUNCATE. The broad privileges are unnecessary and should be revoked after confirming service_role coverage.

realtime.messages has RLS enabled, zero Realtime policies and SELECT/INSERT/UPDATE grants to anon/authenticated. realtime.subscription has RLS disabled and SELECT grants to those roles. Realtime authorization is not private or least-privilege.

### Production broadcast functions

Three enabled triggers call SECURITY DEFINER functions:

- upstatus_broadcast_messages()
- upstatus_broadcast_remote_state()
- upstatus_broadcast_users()

All three have search_path=public and effective EXECUTE for anon and authenticated. All call realtime.send with private=false.

The message trigger publishes the full OLD/NEW row using to_jsonb. The remote-state trigger publishes command/result metadata including sender, target, status, reason and result fields. The user-status trigger publishes name, status, reason, updated_at and sync.

Security Advisor at approximately 2026-11-07 09:30 UTC reported:
- 3 WARN for anon-executable SECURITY DEFINER functions.
- 3 WARN for authenticated-executable SECURITY DEFINER functions.
- 10 INFO for RLS enabled with no policies.
- Production Performance and Health advisors returned no findings.

### Isolated project catalog

The isolated project has zero effective anon/authenticated grants on public tables. Its setup-invite, signaling-rate-limit and atomic read-receipt RPCs are SECURITY INVOKER, use empty pinned search_path and grant EXECUTE only to service_role.

Its three broadcast functions remain SECURITY DEFINER, but now use search_path=pg_catalog, public, have no anon/authenticated EXECUTE and publish only a minimal {op} hint. They still use private=false, so private Realtime migration remains incomplete.

realtime.messages still has RLS enabled, zero Realtime policies and client SELECT/INSERT/UPDATE grants. realtime.subscription has RLS disabled and client SELECT grants.

Isolated Security Advisor:
- 0 SECURITY DEFINER WARN.
- 17 RLS-without-policy INFO.
- 4 unused-index INFO.
- Health returned no findings.

### Default ACL / ACL-02

Production default ACLs remain broad for postgres in public and storage and for supabase_admin in public, graphql and graphql_public. The postgres role is not a member of supabase_admin.

The isolated project has restricted postgres defaults for public objects to postgres/service_role and a global function default limited to postgres, but supabase_admin defaults remain broad in public/graphql/graphql_public and postgres defaults remain broad in storage.

ACL-02 remains blocked pending an authorized administrative path. Do not attempt privilege escalation or alter default ACLs through the audit connection.

## 8. Isolated fixture status

After the exact-head Normal and Team Lite workflows completed, a SELECT-only snapshot at approximately 2026-11-07 09:32 UTC found zero rows in the isolated fixture tables queried:

- users and sessions
- signal rooms, memberships, bindings and events
- call attempts and voice-room attempts
- signaling rate-limit buckets
- chat reads

The CI logs show the fixture suites verified the exact isolated project and explicit mutation opt-in, then verified cleanup. QA did not start these workflows or run their mutation scripts. No fixture was modified or deleted by this audit.

## 9. Issues and physical acceptance

### Issue #78

[Issue #78](https://github.com/Reekyi/UpStatus/issues/78) remains OPEN with all 8 acceptance boxes unchecked.

CI now covers browser WebRTC negotiation, remote media tracks, mesh, teardown, recovery contracts and room concurrency. It does not simulate a real internet interruption through the installed Tampermonkey userscript.

Still MANUAL PENDING:
- Normal offline/online recovery without F5.
- Team Lite offline/online recovery without F5.
- Re-entry to voice room and new incoming/outgoing calls after reconnect.
- Physical microphone permission and bidirectional audio.
- Physical display/tab capture and stop.
- Multiple network interruptions.
- No duplicate audio, orphan peers or duplicate polling.
- Installed Normal ↔ Team Lite interoperability.

### Issue #79

[Issue #79](https://github.com/Reekyi/UpStatus/issues/79) remains OPEN. Its body still presents the 2026-11-03 snapshot and historical CI heads. It must be reconciled with the exact current HEADs and run links above. Do not mark release complete based on the old checklist.

## 10. Next gates

1. Keep #74, #75, #76, #82 and #84 Draft. No merge/release.
2. Create/provision a dedicated full-product TEST project in the expected UpStatus organization. Until then, keep deploy-test fail-closed.
3. Add a Team Lite TEST backend function and deployment path, or prove an equivalent isolated runtime.
4. Align #74 Normal API CLOUD_SERVER with its updateURL and actual deploy target. Reconcile the separate develop-based #84 changes.
5. Add route-level HTTP tests for invite issuance, non-admin denial, private delivery and setup consumption.
6. Add a separate distributed fail-closed auth limiter for login/setup/invite issuance with concurrency, 429/Retry-After and recovery tests.
7. Unify new setup password policy while preserving existing login compatibility.
8. Plan the production cutover from public name-based setup only after full TEST acceptance and reviewed rollback.
9. Remove full-row chat/remote-state broadcasts, complete authenticated/private Realtime authorization, and reduce client grants.
10. Resolve ACL-02 via authorized administration.
11. Run physical #78 acceptance in Tampermonkey/browser with real network, microphone and display permissions.
12. Reconcile #79 and obtain human reviews.
13. Inspect all remaining ACTIVE beta/backup Edge Functions and document consumer/rollback dependencies before retirement.

## 11. Evidence classification

| Evidence type | Current classification |
|---|---|
| Normal Validate exact HEAD | Automated PASS |
| Normal Signaling Smoke exact HEAD | Automated PASS |
| Team Lite Candidate Checks exact HEAD | Automated PASS |
| Candidate source/security review | Code inspection; several release blockers remain |
| Isolated SQL/catalog and advisor checks | Read-only PASS for observed properties |
| Production SQL/catalog and advisor checks | Read-only findings; critical risks remain |
| #82 documentation Validate | Automated FAIL: production updateURL mismatch |
| #84 TEST guard Validate | Automated FAIL: signed upload helper missing after new guards passed |
| Tampermonkey/network/device acceptance | Manual PENDING |
| Full-product TEST environment | BLOCKED: project not provisioned |
| Production security cutover | BLOCKED: no authorized deployment/migration |

No completion percentage is reported.

## 12. Safety record

- All SQL issued by QA was SELECT-only.
- No production or isolated migration was applied by QA.
- No Edge Function deploy or source mutation was performed.
- No secret, flag, role, grant, policy or default ACL was changed.
- No workflow was started, rerun, cancelled or dispatched by QA.
- No test script that mutates fixtures was executed by QA.
- The CI workflows ran their own explicitly allowlisted isolated fixtures and reported cleanup; QA independently verified zero fixture rows afterward.
- No merge, release or userscript publication was performed.
- No engineering branch was modified.
- The only repository write in this pass is this new report on the dedicated QA branch. The existing RELEASE_READINESS.md and prior audit reports were preserved.
