# UpStatus independent QA audit — 2026-11-07 06:36 UTC

**Repository:** `Reekyi/UpStatus`  
**Production Supabase:** `dlfvkawaiqduhlazsszm`  
**Isolated signaling/auth test Supabase:** `bfpjtfqlnypisxljoxkb`  
**QA branch:** `qa/release-readiness-2026-11-04-master`

## Executive result

- Normal and Team Lite are **not both CI-approved on their current exact HEADs**. The most recent role-preservation correction advanced both candidates after earlier green runs.
- Normal Validate passed on exact HEAD `edd7574af6714ece71910d0153af71ad569eee23`; its exact-head Signaling Smoke is pending with no jobs created.
- Team Lite Candidate Checks on exact HEAD `c6b74ee39a4246f3af85e112fbb4f08986b445ae` is pending with no jobs created.
- AUTH-03 role normalization was corrected safely in candidate SQL: blank roles default to `implementation_user`, while every non-empty role is preserved verbatim. This avoids turning a padded invalid role such as ` implementation_admin ` into a valid administrator role.
- Production still runs the old public setup path and name-based admin fallback. No current production account is uninitialized in the latest aggregate snapshot, but future provisioning remains exposed.
- The generated TEST userscript still targets `upstatus-test` inside the production Supabase project. There is no separate full TEST project. This is a release-blocking environment-isolation defect.
- Production Realtime still publishes full message rows and remote-command metadata to public broadcasts; SECURITY DEFINER functions remain executable by anon/authenticated.
- No release is approved. All PRs remain Draft and no human reviews are recorded.

## 1. Exact GitHub refs and comparisons

| PR | Branch / HEAD | Base | Ahead / behind | State |
|---|---|---|---:|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `chore/continuity-foundation` / `edd7574af6714ece71910d0153af71ad569eee23` | `master` `a9288ccfcb0f308d3a587bfca624418a395be07` | 818 / 0 | OPEN, Draft |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `team-lite/3.4.31-guest-fixes` / `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | `team-lite-official` `9065bc1536fde64f437f6f12b7abb9b072cb8281` | 59 / 0 | OPEN, Draft |
| [#76 Team Lite current](https://github.com/Reekyi/UpStatus/pull/76) | `team-lite/signaling-transport-candidate` / `c6b74ee39a4246f3af85e112fbb4f08986b445ae` | `team-lite-official` `9065bc1536fde64f437f6f12b7abb9b072cb8281` | 298 / 0 | OPEN, Draft |
| [#82 QA docs](https://github.com/Reekyi/UpStatus/pull/82) | `qa/release-readiness-2026-11-04-master` / `1eec308fd1eec1173e99690a5b25f58d26570e07` | `master` `a9288ccfcb0f308d3a587bfca624418a395be07` | 84 / 0 | OPEN, Draft |

#76 is 239 commits ahead of #75 and zero behind it; #75 is the earlier baseline, not an independent current release candidate. All four PRs are unmerged. Review-list queries returned zero submitted reviews for #74, #75, #76 and #82.

## 2. Exact-head CI

| Candidate | Workflow | Run | Result on exact HEAD |
|---|---|---|---|
| #74 `edd7574` | Validate | [42346234567](https://github.com/Reekyi/UpStatus/actions/runs/42346234567) | **AUTOMATED PASS** |
| #74 `edd7574` | Signaling Smoke | [42346234562](https://github.com/Reekyi/UpStatus/actions/runs/42346234562) | **PENDING**; jobs endpoint returned an empty list |
| #76 `c6b74ee` | Candidate Checks | [42346239383](https://github.com/Reekyi/UpStatus/actions/runs/42346239383) | **PENDING**; jobs endpoint returned an empty list |
| #75 `7bbf9b9` | Candidate Checks | [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | Historical PASS on its unchanged baseline |
| #82 `1eec308` | Validate | [42343239987](https://github.com/Reekyi/UpStatus/actions/runs/42343239987) | **FAIL** at `production updateURL mismatch` |

Normal Validate job `128324471565` completed successfully and its log includes `Test migration layout guard passed`, `normal one-time setup enrollment static checks passed`, chat/updater regressions passed. This does not substitute for the pending HTTP/DB/browser Smoke. The latest pending Smoke and Team Lite runs had no jobs created when queried; do not call them failures or passes.

PR #82 Validate job `128315329307` failed in `scripts/validate.mjs:26` with `VALIDATION FAILED: production updateURL mismatch`. Preserve the validator; correct the underlying build/manifest contract rather than weakening the check.

## 3. AUTH-03 — first-access enrollment and role preservation

Current candidate template blobs:
- Normal `src/server/index.template.ts`: `d2291a9927983ba40fa53b45bc61fb86c3093ffb`.
- Team Lite `src/server/team-lite-index.template.ts`: `6696ba618a4080d6073e9264dd8fc621a6f8bb0f`.
- Follow-up migration `20261107062000_preserve_setup_invite_roles_verbatim.sql`: `1a29a4baa097ca7108de2982a9f1c0f2a02b7f3b`.
- Runtime test `scripts/test-auth-enrollment.mjs`: `97abe2500f2a1a4b83c85ef5388c909cd54609b4`.

Static inspection of both candidate templates confirms:
- `/api/setup-invite` is dispatched only after a valid application session context; `issueSetupInvite` then checks the stored role for exact equality with `implementation_admin`.
- The server generates a 32-byte random token, stores only SHA-256, records issuer/timestamps and expires it after 15 minutes.
- `/api/setup` requires a 64-character lowercase hex token and consumes `consume_upstatus_setup_invite`; the conditional UPDATE sets the password and clears invite metadata atomically.
- `/api/account` returns a generic `{needsSetup:false}` response.
- The client does not persist the setup token.
- Missing/blank role values default to `implementation_user`; a non-empty value is preserved literally.

The role-preservation correction matters: an earlier `btrim`-as-return-value approach could have canonicalized ` implementation_admin ` into `implementation_admin`. The final SQL uses a CASE expression and preserves non-empty values verbatim. The integration fixture explicitly checks that padded admin text remains non-admin, while a genuinely provisioned `implementation_admin` is preserved.

**Evidence classification:** code inspection plus static validation PASS on Normal. The current exact-head runtime enrollment test is not yet certified because Normal Smoke and Team Lite Candidate Checks are pending. The runtime script directly creates/updates isolated fixtures using service_role and calls the RPC; it does not exercise the actual HTTP `/api/setup-invite` route, prove HTTP 403 for a non-admin issuer, or prove token non-leakage in logs. Those route-level checks remain pending.

Low-priority semantic edge: SQL `btrim(role, E' \\t\\n\\r')` covers space, tab, LF and CR, but not ASCII VT/FF. JavaScript `trim()` recognizes a broader whitespace set. This does not create admin escalation because authorization compares the stored role exactly, but VT/FF-only roles could be normalized differently in the DB and session response. Either define the intended whitespace set explicitly or add regression cases.

## 4. AUTH-02 and password compatibility

Full candidate template searches found no `consume_upstatus_auth_rate_limit`, `upstatus_auth_rate_limits`, or equivalent login limiter in either product. The isolated and production migration/catalog checks also found no auth-specific limiter table/RPC. The signaling limiter is not called by either product server template and does not protect `/api/login`, `/api/setup` or `/api/setup-invite`.

Password minimums now differ only for **new setup**: Normal uses 6 characters for setup and 4 for login; Team Lite uses 4 for both. This preserves cross-product login compatibility for existing 4–5-character Team Lite accounts, but the new-enrollment policy remains inconsistent and should be decided explicitly.

## 5. TEST environment and build routing — release blocker

Supabase project inventory contains only:
- Production `dlfvkawaiqduhlazsszm` (`UpStatus`, us-west-2).
- Isolated signaling/auth project `bfpjtfqlnypisxljoxkb` (`upstatus-security-test`, sa-east-1).

There is no separate full TEST project. The current Normal `scripts/build.mjs` blob is `e68bc2ad3c1ada638a384f0c07f9a8c48bc87192` and hard-codes `PROJECT="dlfvkawaiqduhlazsszm"` and `TEST_FUNCTION="upstatus-test"`. The TEST artifact therefore calls `https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus-test`; that function is ACTIVE in production at v281. A different TEST topic does not isolate the database, storage, auth or Realtime project.

The same builder sets the production API `CLOUD_SERVER` to `upstatus-screen-share-3-1-1-beta10`, while the release/update URL points to `/functions/v1/upstatus/upstatus.user.js`. Production has `upstatus` v480 and legacy beta10 v6. Updating only the userscript-serving function would not guarantee that Normal API requests reach the new runtime. Align API URL, update URL, Normal/Team Lite deployment targets and rollback as one reviewed cutover.

## 6. Production Edge Functions and accounts

Current production inventory: 38/38 Edge Functions ACTIVE; all 38 report `verify_jwt=false`. This setting alone does not prove missing app authentication; the core functions use custom session authentication. The four main deployed sources inspected (`upstatus` v480, `upstatus-test` v281, `upstatus-team-lite` v15 and legacy beta10 v6) still expose public `/api/setup` and `/api/login`; `upstatus` source confirms the old name-based fallback to `implementation_admin` for Ricardo/Lohan/Guilherme when role is missing. The public account endpoint still reports setup-needed state in production. The active backup `upstatus-backup-327-pre328` returned an empty entrypoint in the source lookup; do not disable it without identifying consumers/rollback dependencies.

Production aggregate SELECT: 5 user rows, 0 NULL/empty password hashes, 0 blank roles, 3 explicit `implementation_admin` rows. No currently claimable official account was observed. This does not remove the latent future-provisioning risk in deployed setup code.

## 7. Supabase migrations, grants and SECURITY DEFINER

| Project | Status | Migrations | Latest |
|---|---|---:|---|
| Production `dlfvkawaiqduhlazsszm` | ACTIVE_HEALTHY | 7 | `20261027155438` |
| Isolated `bfpjtfqlnypisxljoxkb` | ACTIVE_HEALTHY | 33 | `20261107061242` |

Production has no setup-invite columns/RPC, auth rate-limit table/RPC, signaling rate-limit table/RPC, or atomic read-receipt RPC. Isolated has setup-invite role-preservation migrations and the three relevant service-only RPCs.

Isolated catalog query confirmed `consume_upstatus_setup_invite`, `consume_upstatus_signal_rate_limit` and `merge_chat_read_receipts` are SECURITY INVOKER, use empty search_path, deny EXECUTE to anon/authenticated and allow service_role. Signaling tables have RLS enabled and no anon/authenticated SELECT/INSERT grants. `realtime.messages` remains RLS-enabled with zero policies and anon/authenticated SELECT/INSERT/UPDATE grants.

Production catalog query confirmed the three broadcast functions are SECURITY DEFINER, `search_path=public`, and EXECUTE is effective for anon, authenticated and service_role. The three triggers remain active.

Nine backend-owned public tables (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) have RLS enabled, zero policies, and effective anon/authenticated SELECT/INSERT/UPDATE/DELETE/TRUNCATE privileges. Zero policies mean row access is not demonstrated by this grant inventory alone; however, TRUNCATE is not filtered by RLS and the client grants are an unnecessary privilege surface. `realtime.messages` also has RLS/no policies and client SELECT/INSERT/UPDATE grants.

Production default ACLs remain broad for postgres in public/storage and for supabase_admin in public/graphql/graphql_public. Current SQL role is postgres, not superuser and not a member of supabase_admin; supabase_admin is superuser. ACL-02 therefore remains blocked by lack of authority in this session.

## 8. Realtime disclosure — production release blocker

Read-only `pg_get_functiondef` and trigger catalog inspection confirmed:
- `upstatus_broadcast_messages()` serializes the complete OLD/NEW row with `to_jsonb` and calls `realtime.send(..., private=false)` on the shared public topic.
- `upstatus_broadcast_remote_state()` emits sender, target, status, reason, command and result metadata with `private=false`.
- `upstatus_broadcast_users()` emits name/status/reason/update metadata with `private=false`.

All three functions are SECURITY DEFINER with `search_path=public`, and client roles retain EXECUTE. This is confirmed production code/catalog evidence, not merely an Advisor inference.

Security Advisor observation returned at approximately 2026-11-07 06:36 UTC:
- Production: 3 WARN for anon-executable SECURITY DEFINER functions, 3 WARN for authenticated-executable SECURITY DEFINER functions, 10 INFO for RLS-enabled tables without policies. Performance and Health returned no findings.
- Isolated: 0 SECURITY DEFINER WARN, 17 RLS INFO; Performance returned 4 unused-index INFO; Health returned no findings.

Remediation references: [anon SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## 9. Isolated fixture state — do not mutate

A SELECT-only snapshot during this audit found non-zero isolated fixtures: 4 users, 4 sessions, 1 signal room, 2 memberships, 0 call attempts, 0 voice attempts, 1 event and 6 signaling rate-limit buckets. Ownership of these rows was not established. The current exact-head #74 Smoke and #76 Candidate Checks were pending with no jobs at the latest query, so these rows are not attributed to those pending runs.

QA did not run fixture scripts, clean rows, start/rerun/cancel workflows or send setup/login requests. Wait for the fixture owner to confirm completion, then verify zero rows with SELECT before another mutating suite.

## 10. Issues and manual acceptance

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) remains OPEN with all 8 acceptance boxes unchecked. Real offline/online recovery without F5, re-entry, new calls, real microphone/display capture, installed Normal ↔ Team Lite interoperability and orphan/poller checks remain MANUAL PENDING.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) remains OPEN with 88 comments. Its body still presents the 2026-11-03 snapshot and old heads; later comments record newer AUTH-03 work. Reconcile the body only after current exact-head CI and manual acceptance are settled.

## 11. Required next gates

1. Create a full official TEST Supabase project and make the TEST artifact use its project ID, functions, Realtime and storage; assert that production project ID is impossible in TEST build output.
2. Align Normal API `CLOUD_SERVER`, userscript update URL, deployment workflow and rollback target. Define equivalent Team Lite deployment/rollback.
3. Complete exact-head #74 Smoke and #76 Candidate Checks; do not reuse earlier green runs for the new heads.
4. Add real HTTP tests for admin invite issuance, non-admin 403, account eligibility, setup consumption and token/log redaction.
5. Add a distributed, fail-closed auth limiter for login/setup/invite issuance with concurrency, 429/Retry-After, recovery and trusted-origin handling; do not trust forwarded IP headers without gateway proof.
6. Decide and align the minimum password length for new enrollments while preserving 4-character legacy login compatibility if required.
7. Correct the deployed public setup/name-based-admin path across active consumers through an approved cutover; inventory legacy/beta/backup function consumers before disabling anything.
8. Replace full-row public Realtime broadcasts, then complete private-channel authorization or a server-mediated transport. Do not flip private=true or revoke grants until the client auth/JWT design is proven.
9. Revoke unnecessary table/function grants and address default ACLs through an authorized admin path; resolve ACL-02 separately.
10. Wait for isolated fixture ownership/cleanup; then rerun authorized tests and verify cleanup by SELECT.
11. Complete physical #78 acceptance, reconcile #79, obtain human reviews, and resolve #82 validator mismatch without weakening validation.

## Safety record

- All SQL issued by QA was SELECT-only.
- No production or isolated migration was applied by QA.
- No Edge Function was deployed or changed.
- No secrets, flags, roles, grants or policies were changed.
- No fixture was created, updated or deleted by QA.
- No workflow was started, rerun, cancelled or modified by QA.
- No PR was merged; no release or userscript publication occurred.
- Engineering branches were not modified.
- This report is a new file on the dedicated QA branch; the 6221-line `docs/RELEASE_READINESS.md` and prior audit reports were preserved.
- No completion percentage is reported.

## Evidence links

- [Normal Validate 42346234567](https://github.com/Reekyi/UpStatus/actions/runs/42346234567)
- [Normal Signaling Smoke 42346234562](https://github.com/Reekyi/UpStatus/actions/runs/42346234562)
- [Team Lite Candidate Checks 42346239383](https://github.com/Reekyi/UpStatus/actions/runs/42346239383)
- [QA Validate 42343239987](https://github.com/Reekyi/UpStatus/actions/runs/42343239987)
- [PR #74](https://github.com/Reekyi/UpStatus/pull/74), [PR #75](https://github.com/Reekyi/UpStatus/pull/75), [PR #76](https://github.com/Reekyi/UpStatus/pull/76), [PR #82](https://github.com/Reekyi/UpStatus/pull/82)
- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78), [Issue #79](https://github.com/Reekyi/UpStatus/issues/79)