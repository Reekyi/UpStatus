# Independent UpStatus QA revalidation — 2026-11-08 00:43 UTC / 2026-11-07 21:43 BRT

## Scope and method

Repository: Reekyi/UpStatus. Production Supabase: dlfvkawaiqduhlazsszm. Isolated signaling/auth project: bfpjtfqlnypisxljoxkb.

The requested readiness document was read first from the dedicated QA branch. Its current blob SHA at the pre-write check was 1ae48aab678a06b4ff75d061d2355a6449cbe1e0. PR #82 head at that same check was 4446e41c26b2d9401bc3f916e84e8eb1a46e927c.

All Supabase SQL in this pass was SELECT-only. Existing GitHub Actions logs were inspected; no workflow was dispatched or rerun. No candidate script was executed locally. Existing CI logs show their own isolated fixture tests used explicit project allowlist checks and mutation opt-ins; QA did not initiate those jobs or mutate/clean fixtures. Only a new report file is being added to this QA branch; no existing document or engineering branch is changed.

Status vocabulary:
- AUTOMATED PASS: exact recorded commit has a completed successful workflow.
- CODE INSPECTION: static source/catalog review, not a runtime test.
- MANUAL PENDING: requires a real browser/device or human acceptance.
- BLOCKED: release gate has an unresolved dependency or confirmed defect.
- NOT VERIFIED: available evidence does not establish the behavior.

## 1. Exact GitHub heads and CI

| PR | Exact head | Base | Ahead / behind | Current evidence |
|---|---|---|---:|---|
| #74 Normal | acf4d8053ac38618e912b2d7957af11ff3a20476 | master | 860 / 0 | Validate 42424257590 SUCCESS; Signaling Smoke 42424257530 SUCCESS |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | team-lite-official | 59 / 0 | Candidate Checks 41674353127 SUCCESS, historical baseline |
| #76 Team Lite signaling | 544866b17cc797209269036ffb76e4a7edb25cf9 | team-lite-official | 324 / 0 | Candidate Checks 42424260073 SUCCESS |
| #82 QA documentation | 4446e41c26b2d9401bc3f916e84e8eb1a46e927c | master | 113 / 0 | Validate 42425967195 FAILURE at inherited production updater URL assertion |
| #84 TEST deploy guard | 21341f331270e142bdf7584c1cdf16e6011e41b3 | develop | 30 / 0 | Validate 42387042361 SUCCESS |
| #85 updater / stored-role authorization | 17554523ef51bafd503e74b3f1271d55f43a6eda | master | 21 / 0 | Validate 42386047749 SUCCESS |

All six PRs are open, Draft, and unmerged. Review queries returned zero submitted human reviews.

### Exact-head test detail

Normal #74:
- Validate: https://github.com/Reekyi/UpStatus/actions/runs/42424257590
- Signaling Smoke: https://github.com/Reekyi/UpStatus/actions/runs/42424257530
- Smoke job 128561331029 completed all steps.
- 19/19 unauthenticated checks and 129/129 authenticated integration checks passed.
- Chromium confirmed authenticated call, voice, and screen WebRTC negotiation and remote tracks; three-member mesh and teardown passed.
- Distributed endpoint limiter accepted 90 and rejected the next request with HTTP 429 and Retry-After 60s.
- Concurrent rate-limit and atomic read-receipt checks passed.
- Setup-invite atomic consumption and cleanup passed.

Team Lite #76:
- Candidate Checks: https://github.com/Reekyi/UpStatus/actions/runs/42424260073
- Job 128562806585 completed all steps.
- 16/16 unauthenticated checks and 103/103 authenticated checks passed.
- Chromium call, voice, and screen WebRTC; remote tracks; three-member mesh; teardown; recovery; rate limit; read receipts; setup-invite and cleanup passed.
- The workflow also ran the Team Lite candidate checker and voice-room recovery regressions.

The two products have strong automated candidate evidence. It does not constitute physical Tampermonkey/device acceptance or production deployment approval.

### Baseline and candidate relationship

Compare #75 head to #76 head: #76 is 265 commits ahead and zero behind. #76 is the continuation of the Team Lite baseline, not an independent sibling candidate. Treat #75's green run as historical evidence only.

Compare #85 head to #74 head: histories are diverged from master, with #74 860 commits ahead and 21 commits behind #85. They modify overlapping Normal files, including the server template and chat regression/build validation paths. Reconcile the two candidate diffs before integrating either; do not assume a clean sequential merge.

### QA PR #82 failure

Current exact-head Validate: https://github.com/Reekyi/UpStatus/actions/runs/42425967195

Job 128564186549 built “UpStatus 3.4.7 / TEST 3.4.7” and then failed at scripts/validate.mjs:26 with:

- VALIDATION FAILED: production updateURL mismatch

PR #82 changes documentation only (RELEASE_READINESS.md and audit snapshots). The failure occurs in the existing master validator before document content is evaluated. Do not weaken the validator. PR #85 contains a candidate correction for the production updater URL contract, but that candidate is not merged.

### TEST guard #84

The candidate workflow blob is 1ca0c4ef4f633724280b81691471d8acc777edd2. It is manual-only, checks refs/heads/develop, checks out the exact dispatch SHA, requires vars.SUPABASE_TEST_PROJECT_ID, rejects production and the isolated fixture project, checks build/deploy project-ID equality, uses a pinned Supabase CLI 2.122.1, and includes a Management API project preflight.

The current develop workflow blob remains d4d44fd3ae78bc1ebe885bd1d5e91fe5b8607839. It still has both workflow_dispatch and an automatic push trigger, uses the shared secrets.SUPABASE_PROJECT_ID, uses CLI latest, and deploys upstatus-test without validating the target project's identity. Secret values were not read.

#84's Validate proves static/build/workflow guards, not a real Management API preflight or deployment. The workflow was not dispatched. The organization still has no dedicated full-product TEST project, and #84 rejects the existing signaling fixture project by design. Do not run the old develop workflow.

The GitHub branch-protection endpoint returned 403 Resource not accessible by integration. Branch-protection/ruleset status is therefore NOT VERIFIED by this pass; do not infer protected=false from this permission failure.

## 2. Confirmed candidate authorization mismatch — Team Lite chat clear

BLOCKED — high-priority security correction required before #76 integration.

Current Team Lite source at head 544866b17cc797209269036ffb76e4a7edb25cf9:
- File: src/server/team-lite-index.template.ts
- Blob SHA: 099d343d977be8f127bacb6d3988cfe90c4fc412
- Route begins at line 759.
- The authorization check at line 760 is name-only: name !== "Ricardo".
- After that check, the handler reads all message image URLs, deletes all rows from public.messages, removes matching chat-images objects, and writes a system marker.

It does not call the existing admin(name) role check.

Normal source at head acf4d8053ac38618e912b2d7957af11ff3a20476:
- File: src/server/index.template.ts
- Blob SHA: c7de6c4b8677fd829f512b224db3157e506cf2ad
- Route begins at line 784.
- Line 785 requires both the Ricardo account name and await admin(name), which checks the stored implementation_admin role.

PR #85's Normal server template also contains the stored-role check at its chat-clear route (source blob e5fcaf88cad0018ef19dcdde11f1249132412963). That change does not modify the Team Lite server template.

The Team Lite checker at scripts/team-lite-candidate-check.mjs, blob 18a56435370673980118b0a32e01192ec429481c, has zero references to /api/chat/clear, chat_clear, or “chat clear”. It checks admin(name) elsewhere, including the health route, but does not assert authorization for this destructive route. This is the test-coverage gap that allows Candidate Checks to pass.

The Team Lite userscript also gates its clear-chat handler by member === 'Ricardo'. Client-side visibility is not an authorization boundary; the server must enforce the stored role.

The server risk is scoped: the route still requires a valid session for the Ricardo account. The confirmed defect is that a valid Ricardo session remains able to clear the whole chat if that account's stored admin role is revoked or downgraded. This is not evidence of anonymous access.

Required candidate correction:
1. Require the stored implementation_admin role on the Team Lite server route, consistent with Normal.
2. Align the client affordance with the stored role, without relying on it for security.
3. Add a regression for authenticated Ricardo with a non-admin role: expect HTTP 403 and prove no message or Storage deletion occurred.
4. Add a positive administrator case.
5. Keep the destructive route unexecuted during QA.

## 3. Production Edge Functions — deployed source and versions

Current production inventory: 38 ACTIVE functions; all report verify_jwt=false. Thirty-six names contain test, beta, or backup. This flag alone does not prove missing authentication: the core UpStatus functions use custom application sessions. Each legacy function still needs a route/consumer/auth inventory before removal.

Core deployed snapshots:
- upstatus v480, SHA bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd
- upstatus-team-lite v15, SHA 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb
- upstatus-test v281, SHA 7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a
- upstatus-screen-share-3-1-1-beta10 v6, SHA f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29

Direct inspection of all four deployed sources confirmed the same name-only /api/chat/clear authorization. All four still route POST /api/setup to the legacy login(req,true) path and do not contain /api/setup-invite. The candidate invite implementation is not deployed.

Production aggregate users snapshot: five accounts; zero NULL/empty password hashes; zero NULL/blank roles. This is not evidence of a currently claimable official account, but the legacy first-caller setup path remains a latent risk for future uninitialized accounts.

## 4. Supabase project and migration state

The organization currently lists exactly two projects:
- Production dlfvkawaiqduhlazsszm, ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, region us-west-2.
- Isolated upstatus-security-test bfpjtfqlnypisxljoxkb, ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, region sa-east-1.

No third full-product TEST project exists.

Production has seven migration records through 20261027155438 and 38 Edge Functions. The isolated project has 34 migration records through 20261107165942 and two Edge Functions:
- upstatus-signal-test v32, SHA f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712
- upstatus-signal-e2e-once v3, SHA db0c9206b2171f5f5d67459e2e7451ecbaf6e8ad3c8f55cb4e491660164f5053

The isolated project has signaling/auth/read-receipt/voice recovery migrations, but not full Normal and Team Lite product runtimes or the chat/profile Storage buckets. No Team Lite TEST runtime is present.

Read-only RPC/table existence checks:
- Production: setup-invite RPC absent; auth rate-limit table/RPC absent; signaling rate-limit table/RPC absent; atomic chat-read receipt RPC absent.
- Isolated: setup-invite RPC present; signaling rate-limit table/RPC present; atomic chat-read receipt RPC present; auth-specific rate-limit table/RPC absent.
- No auth-specific distributed limiter exists in either project. Signaling rate limiting does not protect login/setup.

## 5. RLS, grants, SECURITY DEFINER, and default ACLs

Production Security Advisor observed at 2026-11-08 00:43:41 UTC:
- 6 WARN total: three trigger SECURITY DEFINER functions callable by anon and the same three callable by authenticated.
- 10 INFO: RLS enabled without policies.

The three production trigger functions remain SECURITY DEFINER, SET search_path TO public, and EXECUTE is effective for anon, authenticated, and service_role:
- upstatus_broadcast_messages()
- upstatus_broadcast_remote_state()
- upstatus_broadcast_users()

All three have enabled triggers on messages, upstatus_state, and users.

Ten public tables have RLS enabled and zero policies. Nine backend-owned tables also show effective anon/authenticated SELECT, INSERT, UPDATE, DELETE, and TRUNCATE privileges:
chat_reads, messages, reactions, status_history, upstatus_profiles, upstatus_sessions, upstatus_state, upstatus_typing, users.
upstatus_visual_config has RLS and no client table grants.

These grants are unnecessary privilege surface. Zero policies means the catalog result alone does not prove direct row access through PostgREST; TRUNCATE is not protected by RLS and must be treated separately.

Production realtime.messages is partitioned with seven child partitions, RLS enabled, zero policies, anon SELECT/INSERT, and authenticated SELECT/INSERT/UPDATE. The grants are excessive; do not infer row access solely from the grant inventory.

Production default ACLs remain broad:
- postgres defaults in public and storage grant anon/authenticated privileges on future sequences, functions, and tables.
- supabase_admin defaults in public, graphql, and graphql_public also grant anon/authenticated privileges on future sequences, functions, and tables.
A revocation of current object grants alone would not close this future-object privilege path.

Isolated Security Advisor observed at 2026-11-08 00:43:42 UTC:
- 0 WARN.
- 17 INFO for RLS-enabled tables without policies.

The isolated broadcast functions remain SECURITY DEFINER but now have an empty search_path; EXECUTE is denied to anon/authenticated and allowed to service_role. The isolated default ACL for postgres/public is restricted to postgres and service_role. However, postgres/storage and supabase_admin defaults in public/graphql/graphql_public still include anon/authenticated privileges.

No grants, policies, ACLs, roles, or functions were changed by this audit.

## 6. Realtime payload and delivery

Production pg_get_functiondef confirms:
- upstatus_broadcast_messages serializes the complete OLD/NEW message row with to_jsonb and sends it on db_change with private=false.
- upstatus_broadcast_remote_state emits command and result metadata, including sender, target, status, reason, error, and timestamps, with private=false.
- upstatus_broadcast_users emits user name/status/reason/update metadata with private=false.

This is a confirmed public disclosure path. RLS on public.messages does not prevent a SECURITY DEFINER trigger from publishing its payload to a public Realtime topic.

The isolated versions have reduced payloads to {op} and have the hardened empty search_path and function EXECUTE grants described above. They still call realtime.send with private=false.

Read-only partition check:
- Production realtime.messages: seven child partitions.
- Isolated realtime.messages: zero child partitions and zero rows.

The isolated catalog configuration is improved, but actual broadcast delivery over Realtime/WebSocket is NOT VERIFIED. Do not mark RT-01 complete. The authenticated signaling transport remains opt-in in both userscripts: signaling_transport_enabled defaults to false and the endpoint setting defaults to an empty string. Legacy public Realtime remains relevant to default client behavior.

Private Realtime is not a simple flag flip: the current product session is a custom UpStatus token, not a Supabase Auth JWT. A trusted JWT exchange or server-mediated replacement and explicit channel authorization must be designed and tested before private channels can replace the legacy path.

## 7. Storage

Production buckets:
- chat-images: public=true, 20 MiB limit.
- profile-images: public=true, 20 MiB limit.

PR #85's signed-upload client/server VM tests passed, but no real Storage upload was performed in this pass and the isolated project has no corresponding chat/profile buckets. Signed upload protects the write path; it does not make public object reads private. Decide whether chat attachments are intentionally public or require private buckets and signed downloads.

The audio upload path remains separate from the new signed image/document/avatar contract and requires its own size/transport compatibility test.

## 8. Issues and manual acceptance

Issue #78:
- OPEN, 27 comments.
- All 8 acceptance boxes remain unchecked.
- Latest engineering checkpoint says physical acceptance is still 0/8.
- Real Tampermonkey network loss/recovery without F5, room re-entry, subsequent calls, physical microphone/display permissions, and installed Normal ↔ Team Lite interoperability remain MANUAL PENDING.

Issue #79:
- OPEN, 99 comments, body updated 2026-11-08 00:08 UTC.
- Body still contains older snapshots/checklist counts; the latest engineering comment at 2026-11-07 21:02 BRT records exact Normal and Team Lite CI success on heads acf4d805 and 544866b.
- Reconcile the body/checklist against the current exact-head evidence; do not infer release readiness from its old checked-item count.

## 9. Release gates

1. Fix Team Lite /api/chat/clear stored-role authorization and add explicit non-admin 403/no-side-effect plus admin-positive regressions.
2. Reconcile #74 and #85 overlapping/diverged Normal changes before integration.
3. Integrate the TEST workflow guard only after review; do not run the old develop push-triggered workflow.
4. Provision a dedicated full-product TEST project and separate Normal/Team Lite runtime targets. The existing signaling/auth fixture project is deliberately rejected by #84 and is not a substitute.
5. Complete real Management API preflight and a controlled TEST deploy only after project provisioning and explicit authorization.
6. Add a distributed fail-closed login/setup rate limiter; verify 429/Retry-After and concurrent abuse resistance.
7. Validate the complete setup-invite HTTP flow, private token delivery, non-admin issuer denial, and no token leakage in official TEST. Candidate Node VM/RPC checks are not a real deployed Edge Function E2E.
8. Coordinate production removal of public first-caller setup and name-based admin fallbacks, including chat clear, only after official TEST and rollback review.
9. Replace full-row public Realtime broadcasts, design private channel authorization or server-mediated transport, and prove actual delivery in a provisioned TEST environment.
10. Revoke unnecessary current grants and correct default ACLs through an authorized owner/admin path, with future-object regression tests.
11. Define Storage read privacy and validate actual signed upload/download behavior, including audio.
12. Complete physical issue #78 acceptance, reconcile #79, resolve remaining scope decisions, and obtain human reviews.

## 10. Safety and evidence boundaries

- No production or isolated SQL writes, DDL, migrations, Edge Function deployment, secret/flag/role/grant/policy/ACL changes, userscript publication, PR merge, release, or destructive operation was performed by QA.
- All SQL issued in this pass was SELECT-only.
- Existing GitHub Actions logs were inspected; no workflow was started or rerun.
- The existing CI jobs explicitly checked the isolated project and mutation opt-in before their fixture tests. QA did not invoke those scripts.
- Independent SELECT after those completed runs found zero rows in isolated users, sessions, rooms, memberships, events, rate limits, call attempts, voice attempts, chat_reads, and messages.
- No branch-protection conclusion is made because the GitHub integration returned 403 for the branch-protection endpoint.
- No production deployment, runtime behavior, private Realtime delivery, real Storage upload, or physical browser acceptance is claimed.
- The only repository write in this pass is this new report file on the dedicated QA branch. Existing docs/RELEASE_READINESS.md and all engineering branches remain untouched.

No completion percentage is reported. Candidate CI, source inspection, production catalog, isolated runtime evidence, manual acceptance, and release readiness are separate states.

## Evidence links

- [PR #74 Normal](https://github.com/Reekyi/UpStatus/pull/74)
- [PR #75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75)
- [PR #76 Team Lite signaling](https://github.com/Reekyi/UpStatus/pull/76)
- [PR #82 QA documentation](https://github.com/Reekyi/UpStatus/pull/82)
- [PR #84 TEST deploy guard](https://github.com/Reekyi/UpStatus/pull/84)
- [PR #85 updater and stored-role authorization](https://github.com/Reekyi/UpStatus/pull/85)
- [Issue #78 reconnect acceptance](https://github.com/Reekyi/UpStatus/issues/78)
- [Issue #79 release checklist](https://github.com/Reekyi/UpStatus/issues/79)
- [Normal Validate 42424257590](https://github.com/Reekyi/UpStatus/actions/runs/42424257590)
- [Normal Signaling Smoke 42424257530](https://github.com/Reekyi/UpStatus/actions/runs/42424257530)
- [Team Lite Candidate Checks 42424260073](https://github.com/Reekyi/UpStatus/actions/runs/42424260073)
- [QA Validate 42425967195](https://github.com/Reekyi/UpStatus/actions/runs/42425967195)
- [TEST guard Validate 42387042361](https://github.com/Reekyi/UpStatus/actions/runs/42387042361)
- [Updater Validate 42386047749](https://github.com/Reekyi/UpStatus/actions/runs/42386047749)
- [Supabase linter: SECURITY DEFINER callable by anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Supabase linter: SECURITY DEFINER callable by authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Supabase linter: RLS enabled without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
