# UpStatus Independent QA Audit — 2026-11-07 19:34 BRT

**Repository:** Reekyi/UpStatus  
**Production Supabase:** dlfvkawaiqduhlazsszm  
**Isolated signaling/auth project:** bfpjtfqlnypisxljoxkb  
**QA branch:** qa/release-readiness-2026-11-04-master  
**Method:** read-only GitHub/Supabase inspection, exact-commit workflow-log review, deployed Edge Function source inspection, and SELECT-only catalog/aggregate queries. No new workflow was started or rerun.

## Status vocabulary

- **AUTOMATED PASS:** completed CI on the exact recorded candidate commit.
- **CODE INSPECTION:** source/configuration inspected without executing the behavior.
- **MANUAL PENDING:** requires a real browser, device, network interruption, or human acceptance.
- **BLOCKED:** a confirmed release dependency or defect remains unresolved.
- **NOT VERIFIED:** evidence is absent or only covers a different environment/path.

## 1. Exact GitHub refs and CI

All six reviewed PRs remain open and Draft. The review-list queries returned no submitted human reviews. No PR is merged.

| PR | Exact inspected head | Base | Ahead / behind | Current evidence |
|---|---|---|---:|---|
| #74 Normal | 18dd3e7dd64f57fe81cab03b9aa59158188d8772 | master | 853 / 0 | Validate [42419107639](https://github.com/Reekyi/UpStatus/actions/runs/42419107639) PASS; Signaling Smoke [42419107700](https://github.com/Reekyi/UpStatus/actions/runs/42419107700) PASS |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | team-lite-official | 59 / 0 | Historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) PASS; superseded by #76 |
| #76 Team Lite | fc49eb804457a159a1c066faf6203dbc6fb5a9da | team-lite-official | 318 / 0 | Candidate Checks [42419070366](https://github.com/Reekyi/UpStatus/actions/runs/42419070366) PASS |
| #82 QA documentation | 9d37db7223272a0d56d8729e825a3c365f224fb9 | master | 109 / 0 | Validate [42416350842](https://github.com/Reekyi/UpStatus/actions/runs/42416350842) FAIL at inherited production updater URL assertion |
| #84 TEST isolation | 21341f331270e142bdf7584c1cdf16e6011e41b3 | develop | 30 / 0 | Validate [42387042361](https://github.com/Reekyi/UpStatus/actions/runs/42387042361) PASS |
| #85 updater/security | 17554523ef51bafd503e74b3f1271d55f43a6eda | master | 21 / 0 | Validate [42386047749](https://github.com/Reekyi/UpStatus/actions/runs/42386047749) PASS |

### Exact-head automated results

**Normal #74:** the Validate job completed successfully. The Signaling Smoke job completed all steps successfully: harness syntax/static checks, unauthenticated endpoint checks, authenticated integration/browser checks, distributed signaling-rate-limit concurrency, atomic read-receipt concurrency, and one-time setup-invite consumption. The log reports **19/19 unauthenticated** and **129/129 authenticated** checks. Chromium call/voice/screen WebRTC and remote media delivery were exercised. This is isolated candidate evidence, not production acceptance.

**Team Lite #76:** Candidate Checks completed successfully on the exact head. The log reports **16/16 unauthenticated** and **103/103 authenticated** checks. The job passed the TEST target guard, isolated mutation guard, adapter/enrollment/voice-recovery/screen-share checks, endpoint authentication, authenticated browser/WebRTC integration, signaling-rate-limit concurrency, atomic read receipts, setup-invite consumption, migration-layout guard, and candidate metadata checks. This is isolated candidate evidence.

**#84:** Validate passed the build-target, TEST metadata, workflow secret-scope/SHA-pin, signed-upload client, and repository validation checks. The workflow itself was not dispatched; the Management API preflight and deploy were not executed.

**#85:** Validate passed its signed-upload client/server VM and chat regressions. Storage/database behavior is mocked; no real Storage upload was performed.

**#82:** the latest inspected Validate failed at scripts/validate.mjs:26 with `VALIDATION FAILED: production updateURL mismatch`. The log shows the build completed before the assertion. The correction is in Draft #85 and has not been integrated into master. Do not weaken the validator to hide this base-branch mismatch.

## 2. New high-priority authorization finding — Team Lite chat clear

**BLOCKED — candidate security parity defect; production debt also confirmed.**

At exact Team Lite candidate commit fc49eb804457a159a1c066faf6203dbc6fb5a9da, the built server template is src/server/team-lite-index.template.ts, blob SHA `099d343d977be8f127bacb6d3988cfe90c4fc412`.

At line 759, POST /api/chat/clear checks only that the authenticated session name is exactly Ricardo. It does not call the existing admin(name) helper. The route then reads all message attachment URLs, deletes all messages, and removes corresponding chat-images objects.

The candidate Normal template at exact #74 commit 18dd3e7dd64f57fe81cab03b9aa59158188d8772, blob SHA `c7de6c4b8677fd829f512b224db3157e506cf2ad`, requires both the Ricardo product rule and `await admin(name)` at line 784.

The Team Lite helper itself correctly resolves the stored role to implementation_admin, but the clear route does not use it. The current Team Lite candidate checker (scripts/team-lite-candidate-check.mjs, blob `18a56435370673980118b0a32e01192ec429481c`) asserts stored-role admin behavior and role-gated health, but contains no /api/chat/clear assertion. This explains why the complete Candidate Checks workflow can pass without detecting the route defect.

**Impact, stated precisely:** this is not an anonymous endpoint. A valid session for the account named Ricardo is still required. However, if that account's stored role is revoked, downgraded, or provisioned as non-admin, the route continues to authorize full chat deletion by name alone. That defeats role revocation for this destructive operation.

**Production confirmation:** read-only source retrieval of deployed upstatus v480, upstatus-team-lite v15, upstatus-test v281, and legacy beta10 v6 found the same name-only chat-clear condition. The production Normal candidate #74 and master stabilization candidate #85 contain the stored-role check, but neither has been merged/deployed; Team Lite #76 remains uncorrected at the inspected head.

Required correction before #76 integration:
1. Require both the existing Ricardo product rule and `await admin(name)` server-side.
2. Add a Team Lite route-level regression where a valid Ricardo session with a non-admin stored role receives HTTP 403.
3. Assert that the denied path performs no message deletion or Storage removal.
4. Retain a positive test for a valid stored administrator.
5. Reconcile the deployed Normal/Team Lite runtimes only through the separately approved TEST/cutover plan.

No clear-chat route was invoked by QA.

## 3. TEST deploy safety

The active develop workflow file .github/workflows/deploy-test.yml has blob SHA `d4d44fd3ae78bc1ebe885bd1d5e91fe5b8607839`. It still contains both workflow_dispatch and an automatic push trigger on develop, uses the shared SUPABASE_PROJECT_ID secret, pins Supabase CLI to latest, and deploys upstatus-test without independently validating the destination project identity.

The secret value was not read. This audit does not claim that the current secret points to production; the defect is that the workflow does not enforce a safe destination.

The #84 candidate workflow blob `1ca0c4ef4f633724280b81691471d8acc777edd2` is materially safer: manual-only, exact dispatch-SHA checkout, required develop ref and SHA equality, dedicated vars.SUPABASE_TEST_PROJECT_ID, explicit rejection of production and the isolated fixture project, organization/database metadata preflight, pinned CLI 2.122.1, and deployment limited to upstatus-test.

However, the organization currently has only two projects: production and the isolated signaling/auth project. There is no dedicated full-product TEST project. The #84 workflow is designed to fail closed until one exists. It was not dispatched.

## 4. Supabase project and runtime inventory

Fresh project inventory:

| Project | Status | PostgreSQL | Migrations | Edge Functions |
|---|---|---|---:|---:|
| dlfvkawaiqduhlazsszm (UpStatus production) | ACTIVE_HEALTHY | 17.11.0.002 | 7 | 38 |
| bfpjtfqlnypisxljoxkb (upstatus-security-test) | ACTIVE_HEALTHY | 17.11.0.003 | 34 | 2 |

No third full-product TEST project exists.

Production core deployed functions:

| Function | Version | Deployed source SHA |
|---|---:|---|
| upstatus | 480 | bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd |
| upstatus-test | 281 | 7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a |
| upstatus-team-lite | 15 | 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb |
| upstatus-screen-share-3-1-1-beta10 | 6 | f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29 |

All 38 production Edge Functions report verify_jwt=false; 36 names contain test, beta, or backup. This is a gateway-JWT configuration fact, not proof that every route is unauthenticated: the core application validates custom UpStatus sessions. A per-function route/auth inventory is still required. Do not disable legacy functions blindly.

Read-only production catalog/source inspection confirms no setup-invite RPC, no auth-specific rate-limit table/RPC, no signaling-rate-limit table/RPC, no atomic chat-read receipt RPC, and no voice-room-attempt table. The isolated project has the setup-invite RPC, signaling rate-limit table/RPC, atomic read-receipt RPC, and voice-room-attempt table; it still has no auth-specific login/setup limiter.

Production aggregate users query: 5 accounts, 0 blank/null password hashes, 0 blank roles, 3 explicit implementation_admin roles. This is not evidence of a currently claimable account; it does not remove the latent risk from deployed legacy setup routes.

The isolated fixture snapshot after the completed CI runs returned zero users, sessions, messages, rooms, memberships, events, bindings, rate-limit buckets, call attempts, voice-room attempts, and chat-read rows.

## 5. RLS, grants, SECURITY DEFINER, Realtime, and Storage

### Production

Supabase Security Advisor observed at 2026-11-07T22:35:20Z:
- 3 SECURITY DEFINER functions executable by anon (WARN).
- 3 SECURITY DEFINER functions executable by authenticated (WARN).
- 10 RLS-enabled tables without policies (INFO).

The three broadcast functions remain SECURITY DEFINER with search_path=public and effective EXECUTE for anon/authenticated/service_role. Three enabled triggers attach them to messages, users, and upstatus_state.

The message trigger serializes the complete OLD/NEW message row using to_jsonb and sends it on a public broadcast channel (private=false). The remote-state trigger emits command/result metadata; the user trigger emits status metadata. This is a confirmed public disclosure path, not merely a client-side refresh hint.

Of ten public RLS-enabled tables with zero policies, nine still have effective anon/authenticated table privileges. The catalog result alone does not prove direct row access while there are no permissive policies, but these grants are unnecessary privilege surface. Default ACLs are also broad for postgres in public/storage and supabase_admin in public/graphql/graphql_public.

The realtime.messages table has zero policies and anon/authenticated SELECT/INSERT/UPDATE privileges. Production has seven child partitions and 50 rows.

### Isolated project

The three broadcast functions remain SECURITY DEFINER but now have an empty search_path, EXECUTE denied to anon/authenticated and retained for service_role. Payloads are reduced to {op}; triggers remain enabled.

The broadcasts still use private=false. realtime.messages still has zero policies and anon/authenticated SELECT/INSERT/UPDATE privileges. The isolated project has zero rows and zero child partitions in realtime.messages, so trigger-to-Realtime delivery is NOT VERIFIED there.

The isolated project has 17 public RLS-enabled tables without policies but zero effective anon/authenticated table privileges across those tables. Its default ACLs are still broad for supabase_admin in public/graphql/graphql_public and postgres in storage. The production default-ACL issue is therefore only partially addressed in the isolated environment.

Supabase Security Advisor on the isolated project returned zero SECURITY DEFINER WARN and 17 RLS-without-policy INFO. Performance Advisor reported four unused-index INFO findings; these are not release blockers by themselves.

### Storage

Production chat-images and profile-images buckets are both public with a 20 MiB object limit. Signed-upload candidate tests are mocked; the isolated project has no matching chat/profile buckets and no real upload/download E2E. Signed upload protects write authorization, not public read access. Decide explicitly whether chat attachments may be publicly readable or require private buckets and signed downloads.

## 6. Manual acceptance and issue state

- Issue #78 remains OPEN with **0/8** acceptance boxes checked. Real Tampermonkey offline interruption/recovery without F5, physical microphone/display permissions, and installed Normal ↔ Team Lite interoperability remain MANUAL PENDING.
- Issue #79 remains OPEN and its body is stale at 16/35 checked. Its latest coordination comment still described the #74 Smoke as in progress; that exact run is now complete and successful. It also needs the latest #76 head and CI result reconciled.
- No physical browser/device test was performed in this audit.

## 7. QA documentation branch and write

The requested QA branch was re-fetched and compared: it is identical to commit `9d37db7223272a0d56d8729e825a3c365f224fb9`, 109 commits ahead of master and zero behind at the pre-write check.

The existing docs/RELEASE_READINESS.md was re-fetched before this report; blob SHA remains `1ae48aab678a06b4ff75d061d2355a6449cbe1e0` (6,221 lines). It remains an older checkpoint and was preserved without modification.

This report is a new file only. No existing document, issue, PR, engineering branch, or runtime file was edited.

## 8. Required next gates

1. Fix Team Lite chat-clear authorization and add positive/negative route-level tests.
2. Keep the current develop TEST deploy workflow unused until #84's guard is integrated and a dedicated full-product TEST project exists.
3. Provision and validate a full-product TEST environment, including a separate Team Lite runtime and Storage buckets.
4. Complete AUTH-03 route-level issuer/HTTP tests and implement a separate distributed, fail-closed login/setup limiter.
5. Design private Realtime authorization compatible with the custom UpStatus session model; do not simply flip private=false or revoke grants before the trusted-token/server-mediated replacement is tested.
6. Validate grant/default-ACL hardening and rollback in official TEST.
7. Decide Storage read privacy and complete real signed upload/download tests.
8. Inventory legacy Edge Function consumers before any deactivation.
9. Complete issue #78 physical acceptance, reconcile #79, and obtain human reviews.
10. Reconcile #74/#85 overlapping files and review the full diffs before any merge.

## Safety record

All Supabase SQL in this audit was SELECT-only. No production or isolated SQL writes, migrations, Edge Function deployments, secrets/flags/roles/grants/policies/ACL changes, userscript publication, PR merge, release, or destructive operations were performed. No workflow was started or rerun. Existing CI logs were inspected only. No fixture was created, changed, or cleaned. No secret value was read. The only write is this new audit document on the dedicated QA branch.
