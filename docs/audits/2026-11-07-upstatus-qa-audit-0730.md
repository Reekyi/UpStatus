# UpStatus independent QA audit — 2026-11-07 07:30 UTC

**Repository:** `Reekyi/UpStatus`  
**Production Supabase:** `dlfvkawaiqduhlazsszm`  
**Isolated signaling/auth Supabase:** `bfpjtfqlnypisxljoxkb`  
**QA branch:** `qa/release-readiness-2026-11-04-master`

## Executive result

- **Normal #74 and Team Lite #76 both passed their complete automated workflows on the exact current HEADs.** This closes the previous CI queue, not the release gates.
- Normal #74 HEAD `edd7574af6714ece71910d0153af71ad569eee23`: Validate and Signaling Smoke both SUCCESS.
- Team Lite #76 HEAD `628acb6050b92f88790d4fdb33efb5d367c20787`: Candidate Checks SUCCESS after a stale static assertion was corrected in the new commit.
- The AUTH-03 role-preservation correction passed the isolated enrollment integration test, including padded-admin non-escalation and one-winner concurrency. HTTP route-level enrollment tests remain absent.
- **Release remains BLOCKED:** the TEST artifact still targets `upstatus-test` inside the production Supabase project; the Normal API URL points to legacy beta10 while the update URL and deploy workflow target `upstatus`.
- Production still has public first-access setup with name-based administrator fallback in the four primary deployed runtimes inspected.
- Production Realtime still broadcasts complete message rows and remote-command metadata on public channels; SECURITY DEFINER broadcast functions remain executable by anon/authenticated.
- Login/setup have no dedicated distributed authentication rate limiter in either candidate or either database.
- All PRs remain OPEN/Draft, unmerged, with no submitted human reviews. No release is approved.

## 1. Exact GitHub refs

| PR | Branch / exact HEAD | Base | Ahead / behind | State |
|---|---|---|---:|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `chore/continuity-foundation` / `edd7574af6714ece71910d0153af71ad569eee23` | `master` `a9288ccfcb0f308d3a587bfca624418a395be07b` | 818 / 0 | OPEN, Draft |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `team-lite/3.4.31-guest-fixes` / `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | `team-lite-official` `9065bc1536fde64f437f6f12b7abb9b072cb8281` | 59 / 0 | OPEN, Draft |
| [#76 Team Lite current](https://github.com/Reekyi/UpStatus/pull/76) | `team-lite/signaling-transport-candidate` / `628acb6050b92f88790d4fdb33efb5d367c20787` | `team-lite-official` `9065bc1536fde64f437f6f12b7abb9b072cb8281` | 299 commits from base | OPEN, Draft |
| [#82 QA docs](https://github.com/Reekyi/UpStatus/pull/82) | `qa/release-readiness-2026-11-04-master` / `1693410699346c988976c679f3ad8b1be00a5d28` | `master` `a9288ccfcb0f308d3a587bfca624418a395be07b` | 85 / 0 | OPEN, Draft |

GitHub compare confirms #76 is **240 commits ahead of #75 and zero behind**. #75 is the earlier baseline, not an independent current release candidate. Review-list queries for #74, #75, #76 and #82 returned zero submitted reviews. All four remain unmerged.

## 2. Exact-head CI evidence

| Candidate | Workflow | Run | Result |
|---|---|---|---|
| #74 `edd7574` | Validate | [42346234567](https://github.com/Reekyi/UpStatus/actions/runs/42346234567) | **AUTOMATED PASS** |
| #74 `edd7574` | Signaling Smoke | [42346234562](https://github.com/Reekyi/UpStatus/actions/runs/42346234562) | **AUTOMATED PASS** |
| #76 `628acb6` | Candidate Checks | [42349939459](https://github.com/Reekyi/UpStatus/actions/runs/42349939459) | **AUTOMATED PASS** |
| #75 `7bbf9b9` | Candidate Checks | [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | Historical PASS on unchanged baseline |
| #82 `1693410` | Validate | [42347949781](https://github.com/Reekyi/UpStatus/actions/runs/42347949781) | **FAIL**: `production updateURL mismatch` |

### Normal #74

Validate job `128324471565` passed migration-layout validation, static enrollment contract checks, build 3.4.7 / TEST 3.4.7, chat/Realtime payload regressions and updater checks.

Signaling Smoke job `128329857060` passed:
- 19/19 unauthenticated checks.
- 129/129 authenticated integration checks.
- Browser WebRTC call and voice negotiation with remote audio tracks.
- Browser screen-share negotiation with remote video tracks.
- Three-member mesh and teardown.
- Voice-room open/cancel races, tombstones and idempotency.
- 90 accepted signaling operations followed by HTTP 429, with `Retry-After: 60`.
- Atomic read-receipt concurrency.
- Setup enrollment: malformed, wrong, expired and replayed tokens; one-winner concurrent consumption; blank-role fallback; explicit-role preservation; padded-admin non-escalation.
- Workflow fixture cleanup verified.

### Team Lite #76

Candidate Checks job `128335717491` passed:
- 16/16 unauthenticated checks.
- 103/103 authenticated integration checks.
- Browser WebRTC call/voice remote audio and screen-share remote video.
- Three-member mesh.
- 90 accepted signaling operations followed by HTTP 429 and `Retry-After: 60`.
- Atomic read receipts.
- Setup enrollment and padded-admin non-escalation.
- Voice-room recovery and logout gates.
- Team Lite 3.4.31 updater/manifest consistency, syntax, Lucca/Ycaro portal syntax, guest-session isolation and separate guest auth routes.
- Workflow fixture cleanup verified.

The earlier #76 run 42346239383 exposed an initial 20-second `/room/request-invite` timeout and then a stale static assertion after the role-preservation contract changed. Commit `628acb6` corrected the assertion; the new exact-head run 42349939459 completed SUCCESS. The old failed run is not the current verdict.

**Classification:** automated CI PASS on both exact candidate HEADs. This does not constitute physical Tampermonkey/device acceptance, independent human review, or production release approval.

## 3. AUTH-03 — first-access enrollment and role preservation

Current candidate blobs:
- Normal `src/server/index.template.ts`: `d2291a9927983ba40fa53b45bc61fb86c3093ffb`.
- Team Lite `src/server/team-lite-index.template.ts`: `6696ba618a4080d6073e9264dd8fc621a6f8bb0f`.
- Role-preservation migration `20261107062000_preserve_setup_invite_roles_verbatim.sql`: `1a29a4baa097ca7108de2982a9f1c0f2a02b7f3b`.
- Runtime fixture test `scripts/test-auth-enrollment.mjs`: `97abe2500f2a1a4b83c85ef5388c909cd54609b4`.
- Static contract test `scripts/auth-enrollment.test.mjs`: `409acf6a9ca21d5cc826190e70840bf73d466d1a`.

Both candidate templates now:
- Require an authenticated application session before dispatching `POST /api/setup-invite`.
- Check the stored role by exact equality with `implementation_admin`.
- Generate a 32-byte random setup token; store only its SHA-256 hash.
- Set a 15-minute expiry and issuer/timestamp metadata.
- Require a 64-character lowercase hexadecimal token for `POST /api/setup`.
- Consume the invite through `consume_upstatus_setup_invite`.
- Return generic `{needsSetup:false}` from the candidate `/api/account` route.
- Avoid persisting the raw setup token.

The final SQL RPC is SECURITY INVOKER, pins an empty search_path, and grants EXECUTE only to service_role. Its conditional UPDATE sets the password and clears invite metadata atomically. The role CASE defaults only NULL/space-tab-LF-CR-only values to `implementation_user`; every non-empty value is preserved literally. This prevents a value such as `" implementation_admin "` from being trimmed into a valid administrator role.

The exact-head CI runtime test passed NULL/empty eligibility, configured-account denial, malformed/wrong/expired/replayed token rejection, one-winner concurrency, NULL/empty/whitespace role fallback, explicit-role preservation, padded-admin non-escalation and cleanup.

**Remaining evidence gap:** `scripts/test-auth-enrollment.mjs` creates isolated fixtures using service_role and calls the RPC directly. It does not exercise the full HTTP route chain. Still required:
- Admin session issues invite through `POST /api/setup-invite`.
- Non-admin session receives HTTP 403.
- The returned token is delivered only to the authorized admin and is not logged.
- The user consumes the token through the real `POST /api/setup` route.
- HTTP behavior is tested against a full isolated product backend.

Low-priority semantic edge: SQL `btrim(role, E' \t\n\r')` covers space, tab, LF and CR, while JavaScript `trim()` recognizes a wider whitespace set. VT/FF-only values could be treated as blank in the session response but remain nonblank in SQL. Exact admin comparison prevents escalation; add VT/FF cases or define the accepted whitespace set explicitly.

## 4. AUTH-02 and password compatibility

Searches of both candidate server templates found no `consume_upstatus_auth_rate_limit`, `upstatus_auth_rate_limits` or equivalent distributed login limiter. Catalog checks found no auth-specific limiter table/RPC in production or the isolated project. The signaling rate limiter is not called by either product login/setup handler.

Password policy currently differs for new enrollment:
- Normal: setup minimum 6; existing login minimum 4.
- Team Lite: setup and login minimum 4.

This preserves cross-product login for existing Team Lite accounts with 4–5-character passwords, but new-enrollment policy is inconsistent. Decide a common new-password minimum while retaining legacy login compatibility if required.

## 5. Browser credential storage

The current Normal userscript template grants `GM_listValues` and `GM_deleteValue` and purges legacy namespaced password keys. Searches found no new password persistence via `GM_setValue(password...)`, `GM_getValue(password...)` or sessionStorage.

The Team Lite client similarly removes legacy namespaced password entries from sessionStorage and no longer writes the password there.

This is code/VM regression evidence, not a real Tampermonkey permission test. Validate that the new GM grants work in the supported manager/browser combinations and that legacy values are removed without touching unrelated keys.

## 6. TEST isolation and deployment routing — release blockers

Supabase project inventory contains only:
- Production `dlfvkawaiqduhlazsszm` (UpStatus, us-west-2).
- Isolated signaling/auth project `bfpjtfqlnypisxljoxkb` (upstatus-security-test, sa-east-1).

There is **no separate full TEST project**.

Current Normal `scripts/build.mjs` blob: `e68bc2ad3c1ada638a384f0c07f9a8c48bc87192`.
It hard-codes:
- `PROJECT="dlfvkawaiqduhlazsszm"`
- `PROD_FUNCTION="upstatus"`
- `TEST_FUNCTION="upstatus-test"`

The generated TEST userscript therefore targets `https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus-test`. That function is ACTIVE in the **production** project at v281. A different TEST topic/storage prefix does not isolate the database, auth, storage or Realtime project. Do not use this artifact for mutating tests or release acceptance.

The same builder sends production API calls to `upstatus-screen-share-3-1-1-beta10`, while `release.json` blob `93caf1701ea508575c90d002c0b8c3037b34d82a` points the update URL to `/functions/v1/upstatus/upstatus.user.js`. Production has `upstatus` v480 and legacy beta10 v6. The current `.github/workflows/deploy-production.yml` blob `f3493d19cb59bb4d9f41eb4ab05d542befa2b8ce` deploys only `upstatus`. Updating the userscript-serving function alone does not guarantee that API requests reach the same candidate runtime. Team Lite also needs an explicit deployment and rollback contract.

Required: create a full official TEST project; make build-time project selection explicit; add a hard guard that rejects the production project ID for TEST; align API URL, update URL, function deployment and rollback for Normal and Team Lite.

## 7. Production Edge Functions and account state

Current production inventory:
- 38/38 Edge Functions ACTIVE.
- All 38 report `verify_jwt=false`. This flag alone does not prove missing application authentication; core functions use custom session authentication.
- Deep source inspection in this pass covered the four primary deployed runtimes and the empty backup entrypoint.

| Function | Version | Source SHA | Finding |
|---|---:|---|---|
| `upstatus` | v480 | `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd` | Old public setup and name-based admin fallback |
| `upstatus-test` | v281 | `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a` | Old public setup in production project |
| `upstatus-team-lite` | v15 | `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb` | Old public setup and name-based admin fallback |
| `upstatus-screen-share-3-1-1-beta10` | v6 | `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29` | Legacy API target; old setup/fallback |
| `upstatus-backup-327-pre328` | v1 | `3d6c4f8e5f777830ea720ab2938cb023b5a4e4c7d26f3fc02b926ce0e4d0dd90` | ACTIVE, empty entrypoint |

The four primary source files still expose public `/api/setup` and `/api/login`. The old setup path assigns `implementation_admin` by name for Ricardo/Lohan/Guilherme when the stored role is missing. The public account endpoint reveals whether setup is needed. The backup has no readable source; identify consumers and rollback dependencies before changing its state. This pass did not deeply inspect all 38 function sources route-by-route.

Production aggregate SELECT:
- 5 users.
- 0 NULL/empty password hashes.
- 0 blank roles.
- 3 explicit `implementation_admin` rows.

No currently uninitialized official account was observed. The latent future-provisioning risk remains because the deployed endpoints still use the old setup logic.

## 8. Supabase schema, migrations, grants and RPCs

| Project | Status | PostgreSQL | Migrations | Latest |
|---|---|---|---:|---|
| Production `dlfvkawaiqduhlazsszm` | ACTIVE_HEALTHY | 17.11.0.002 | 7 | `20261027155438` |
| Isolated `bfpjtfqlnypisxljoxkb` | ACTIVE_HEALTHY | 17.11.0.003 | 33 | `20261107061242` |

Production catalog checks found no setup-invite RPC/columns, auth rate-limit table/RPC, signaling rate-limit table/RPC, voice-room-attempt table or atomic read-receipt RPC.

The isolated project has setup invites, signaling rate limits, voice/call attempt recovery and atomic read receipts. Catalog inspection confirmed:
- `consume_upstatus_setup_invite`
- `consume_upstatus_signal_rate_limit`
- `merge_chat_read_receipts`

All three are SECURITY INVOKER, use empty search_path, deny EXECUTE to anon/authenticated and allow service_role.

Isolated signaling tables have RLS and no direct anon/authenticated SELECT/INSERT grants. The isolated product broadcast functions now emit only `{op}`, use `search_path=pg_catalog, public`, and deny EXECUTE to anon/authenticated. However, they still call Realtime broadcast with `private=false`; payload minimization is not private-channel authorization.

After the exact-head Team Lite workflow completed and verified cleanup, a SELECT-only fixture snapshot returned zero rows in users, sessions, rooms, memberships, bindings, events, rate-limit buckets, call attempts, voice attempts, chat reads and messages. No manual cleanup was performed.

## 9. Production grants, RLS and default ACLs

Nine backend-owned public tables (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) have RLS enabled and zero policies. Effective anon/authenticated privileges include SELECT, INSERT, UPDATE, DELETE and TRUNCATE. `upstatus_visual_config` has RLS/no policies but no corresponding client grants in the current query.

Zero policies mean row access is not demonstrated by this grant inventory alone. TRUNCATE is not filtered by RLS, so client TRUNCATE grants are a concrete excessive-privilege finding and should be revoked after service-only access is validated.

`realtime.messages` has RLS enabled, zero policies, and anon/authenticated SELECT/INSERT/UPDATE grants in production. The isolated project also has RLS/no policies and anon/authenticated SELECT/INSERT grants on `realtime.messages`.

Production default ACLs remain broad:
- postgres defaults in public and storage grant client roles broad table/sequence/function privileges.
- supabase_admin defaults in public, graphql and graphql_public grant client roles broad privileges.

Current SQL role is postgres, not superuser and not a member of supabase_admin. ACL-02 remains **BLOCKED** by insufficient administrative authority in this session. Do not attempt to bypass this boundary.

## 10. Realtime disclosure and Advisor

Production catalog inspection confirmed three enabled triggers:
- `upstatus_messages_broadcast`
- `upstatus_remote_state_broadcast`
- `upstatus_users_broadcast`

Their functions are SECURITY DEFINER, use `search_path=public`, and EXECUTE is effective for anon/authenticated. The message trigger serializes the complete OLD/NEW row using `to_jsonb` and sends it with `private=false`. Remote-state broadcast sends sender/target/status/reason and command/result metadata publicly. User-status broadcast sends name/status/reason/update metadata publicly.

Current Security Advisor observation: 2026-11-07 07:36:39 UTC.
- Production: 3 WARN for anon-executable SECURITY DEFINER functions; 3 WARN for authenticated-executable SECURITY DEFINER functions; 10 INFO for RLS enabled without policies. Performance and Health returned no findings.
- Isolated: 0 SECURITY DEFINER WARN; 17 RLS/no-policy INFO; 4 unused-index INFO; Health returned no findings.

References: [anon SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

The isolated broadcast payload reduction is useful but does not close RT-01. Do not simply flip `private=true` or revoke client grants before the custom-session/JWT authorization design and all clients are proven.

## 11. Issues and manual acceptance

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) remains OPEN with 0/8 physical acceptance criteria checked. Still MANUAL PENDING: real offline/online recovery without F5, browser close/reopen while offline, room re-entry, real microphone and bidirectional audio, physical display capture, Normal ↔ Team Lite installed interoperability, repeated reconnect and orphan peer/membership checks.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) remains OPEN with 89 comments. Its body and latest engineering checkpoint are stale relative to the exact-head CI completion: the last checkpoint still described Team Lite run 42349939459 as running. Reconcile the issue body/comment with the final exact-head PASS results; do not infer a global completion percentage from old checklist counts.
- [PR #82](https://github.com/Reekyi/UpStatus/pull/82) remains OPEN/Draft. Exact-head Validate [42347949781](https://github.com/Reekyi/UpStatus/actions/runs/42347949781) fails in the inherited validator with `VALIDATION FAILED: production updateURL mismatch`. Preserve the validator and correct the build/manifest contract.

## 12. Required next gates

1. Create a full official TEST Supabase project and enforce a build guard that makes the production project ID impossible in TEST artifacts.
2. Align Normal API `CLOUD_SERVER`, update URL, deploy target and rollback; define the equivalent Team Lite cutover.
3. Inventory consumers of the 38 active Edge Functions and safely plan migration/retirement of legacy setup/name-fallback endpoints. Do not disable the empty backup before identifying dependencies.
4. Add HTTP integration tests for admin invite issuance, non-admin 403, token delivery/redaction and first-access consumption through the real routes.
5. Add a distributed, fail-closed auth rate limiter for login/setup/invite issuance, with concurrency, 429/Retry-After and recovery tests. Do not trust forwarded-IP headers without gateway proof.
6. Decide one new-enrollment password policy while preserving legacy login compatibility if required.
7. Validate Normal's GM permissions and both clients' legacy password cleanup in real Tampermonkey/browser combinations.
8. Replace full-row public Realtime broadcasts and design private-channel/server-mediated authorization before changing client grants.
9. Revoke excessive client grants and address default ACLs through an authorized admin path; resolve ACL-02 separately.
10. Complete physical #78 acceptance, reconcile #79, obtain human reviews and resolve #82 validation without weakening checks.

## Safety record

- All SQL issued by this audit was SELECT-only.
- No production or isolated migration was applied by QA.
- No Edge Function was deployed or modified.
- No secrets, flags, roles, grants or policies were changed.
- No fixture was created, updated or deleted by QA.
- No workflow was started, rerun, cancelled or modified by QA; only existing run logs/statuses were inspected.
- No PR was merged; no release or userscript publication occurred.
- Engineering branches were not modified.
- This report is a new file on the dedicated QA branch. The main `docs/RELEASE_READINESS.md` and all previous audit reports were preserved.
- No completion percentage is reported.

## Evidence links

- [Normal Validate 42346234567](https://github.com/Reekyi/UpStatus/actions/runs/42346234567)
- [Normal Signaling Smoke 42346234562](https://github.com/Reekyi/UpStatus/actions/runs/42346234562)
- [Team Lite Candidate Checks 42349939459](https://github.com/Reekyi/UpStatus/actions/runs/42349939459)
- [QA Validate 42347949781](https://github.com/Reekyi/UpStatus/actions/runs/42347949781)
- [PR #74](https://github.com/Reekyi/UpStatus/pull/74), [PR #75](https://github.com/Reekyi/UpStatus/pull/75), [PR #76](https://github.com/Reekyi/UpStatus/pull/76), [PR #82](https://github.com/Reekyi/UpStatus/pull/82)
- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78), [Issue #79](https://github.com/Reekyi/UpStatus/issues/79)


## Post-snapshot verification — 2026-11-07 07:38 UTC

The 07:30 snapshot above recorded QA PR #82 at its pre-report head \`1693410699346c988976c679f3ad8b1be00a5d28\`. Creating this audit and correcting its Markdown escaping advanced the QA branch to \`fe55e2e344e880fbb1496a18ac0aea1c1d4cbc47\` (87 commits ahead of master, zero behind).

A fresh exact-head workflow query on \`fe55e2e\` returned [Validate 42352117995](https://github.com/Reekyi/UpStatus/actions/runs/42352117995), completed FAILURE. Job \`128342281405\` built UpStatus 3.4.7 / TEST 3.4.7, then failed with \`VALIDATION FAILED: production updateURL mismatch\`. This is the same build/manifest contract failure; no validator change is recommended. The new QA append below records the observed failure; it does not change the underlying release gate.
