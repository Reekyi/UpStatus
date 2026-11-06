# UpStatus Release Readiness and Independent QA Audit

**Audit date:** 2026-11-04  
**Scope:** GitHub `Reekyi/UpStatus`; Supabase project `dlfvkawaiqduhlazsszm`; isolated signaling test project `bfpjtfqlnypisxljoxkb`.  
**Method:** Read-only GitHub inspection, workflow-log review, Supabase catalog/advisor queries, and candidate-source inspection. No production writes or test reruns were performed.

> This file is a release-readiness checkpoint, not authorization to merge, deploy, publish userscripts, change flags/secrets, or apply migrations. Re-fetch all refs and runtime state before acting.

## Status vocabulary

- **AUTOMATED PASS:** a workflow/test passed on the exact recorded commit.
- **CODE INSPECTION:** behavior or configuration was inspected statically; this is not a runtime test.
- **MANUAL PENDING:** requires a real browser, device, or human acceptance test.
- **BLOCKED:** a release gate has an unresolved dependency or a confirmed blocker.
- **NOT VERIFIED:** evidence is absent or belongs only to an isolated environment.

## Initial documentation lookup

The requested `docs/RELEASE_READINESS.md` did not exist on `master` or the current Normal candidate branch when this audit began. The existing `UPSTATUS_HANDOFF.md` and `docs/CURRENT_STATE.md` in draft PR #80 were read as continuity sources, together with `docs/REALTIME_SECURITY_TEST_MATRIX.md` and `docs/RELEASE_CUTOVER_PLAN.md`. PR #80's snapshot predates the latest candidate heads and CI runs recorded below; do not treat its PR/CI table as current.

## Current GitHub candidate state

| Workstream | Exact head | Automated evidence | Current result |
|---|---|---|---|
| Normal PR #74 | `2a5574c0bae1be608dd9e6d9ce091c6c0768e35a` | Validate run [41864124241](https://github.com/Reekyi/UpStatus/actions/runs/41864124241) passed. Signaling Smoke run [41864124208](https://github.com/Reekyi/UpStatus/actions/runs/41864124208) failed. | **BLOCKED:** smoke stopped in static harness checks before endpoint/authenticated tests. |
| Team Lite PR #76 | `3cf080156ae15c0defd2a981eb3b2221edf0d208` | Candidate Checks [41863688477](https://github.com/Reekyi/UpStatus/actions/runs/41863688477) passed. | **AUTOMATED PASS:** 86/86 authenticated checks, Chromium call/voice/screen WebRTC, three-member mesh, teardown, invitation/fanout, 90 accepted + 1 rejected (429), distributed rate-limit concurrency/reset, atomic receipt concurrency, version/updater/portal checks. |
| Team Lite baseline PR #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passed. | Historical automated pass on the unchanged baseline; superseded for current signaling work by #76. |
| Continuity PR #80 | `33aefd3bb80b5b6229730e104b946d4faf57aa36` | Documentation-only draft. | Snapshot is stale relative to the current #74/#76 heads and must be refreshed without overwriting its author. |

All four PRs are open and Draft; none is merged. #74 targets `master`; #75/#76 target `team-lite-official`; #80 targets `develop`.

### Normal PR #74 smoke failure

The latest Normal smoke failed in `Syntax-check signaling test harnesses`, specifically `scripts/signaling-static.test.mjs:154`. The assertion still expects the old in-memory rate-limit map pattern (`rate.size >= 2000`). The isolated signaling endpoint now calls the Postgres RPC `consume_upstatus_signal_rate_limit`, so the static assertion is stale.

This is evidence of a **test-contract mismatch**, not evidence that the new distributed limiter failed at runtime. However, the run stopped before unauthenticated endpoint checks, authenticated integration/browser checks, rate-limit tests, and chat-receipt tests. Those checks therefore have **no exact-head Normal result** yet. Fix the assertion to validate the DB-backed limiter contract; do not restore the obsolete in-memory limiter merely to satisfy the old regex.

### Team Lite PR overlap

PRs #75 and #76 target the same base and modify several of the same files, including the Team Lite workflow, build script, Team Lite server template, candidate checker, release manifest, userscript, and portal files. Their histories should be reviewed as related/overlapping candidates. Do not merge both independently or assume their order is safe without a fresh comparison.

## Production Supabase read-only findings

Project `dlfvkawaiqduhlazsszm` reported `ACTIVE_HEALTHY`. The production migration inventory contains seven migrations, with the latest version `20261027155438`. The candidate hardening migrations from PR #74 are not present in the production migration history.

### Confirmed Realtime disclosure path — release blocker

**CODE INSPECTION + PRODUCTION CATALOG:** the production trigger `upstatus_messages_broadcast` invokes `public.upstatus_broadcast_messages()` after INSERT/UPDATE/DELETE on `public.messages`. The SECURITY DEFINER function serializes the complete OLD/NEW row with `to_jsonb(...)` and calls `realtime.send(..., 'db_change', ..., false)`. The final `false` selects a public broadcast channel.

The `public.messages` schema contains message text and metadata fields including `message`, `image_url`, `mentions`, `reply_to`, `reactions`, and `file_name`, as well as the sender and timestamp. Therefore the public broadcast path emits chat content and attachment metadata, not merely an invalidation hint. RLS on `public.messages` does not prevent a SECURITY DEFINER trigger from publishing that payload to Realtime.

Two additional production trigger functions also broadcast to the same public topic:
- `upstatus_broadcast_remote_state()` emits remote-command and remote-result metadata.
- `upstatus_broadcast_users()` emits user name/status/reason/update metadata.

The current candidate userscript handlers treat several chat/status broadcasts as refresh hints, but that client behavior does **not** prevent the server-side public broadcast from disclosing the full row. The authenticated signaling transport is also disabled by default in both candidates, so legacy call, voice-room, and screen-share signaling continues to use the public Realtime path while that flag is off. RT-01 remains **BLOCKED** until the payload and channel architecture are changed and validated. This is the highest-priority finding from this audit.

### SECURITY DEFINER and table grants

The production catalog confirms three trigger-only functions are `SECURITY DEFINER` and currently have EXECUTE effective for `anon` and `authenticated` (as well as `service_role`):
- `upstatus_broadcast_messages()`
- `upstatus_broadcast_remote_state()`
- `upstatus_broadcast_users()`

All three are attached to database triggers. Their current `search_path` is `public`. The public schema does not grant CREATE to anon/authenticated, and this audit did not demonstrate direct invocation or exploitation; nevertheless, the broad EXECUTE grants are unnecessary and are reported by Supabase Security Advisor. The candidate migration `20261029170500_restrict_trigger_function_execute.sql` revokes client/PUBLIC EXECUTE while preserving trigger behavior, but it has not been applied to production.

Nine backend-owned public tables report effective anon/authenticated SELECT/INSERT/UPDATE/DELETE privileges while RLS is enabled and there are zero policies:
`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, and `users`.

This grant inventory is an unnecessary privilege surface. Because RLS is enabled with no policies, the catalog result alone does **not** prove that anon/authenticated can read or change rows. Candidate migration `20261029183000_revoke_unused_public_table_grants.sql` revokes those grants, but production remains unchanged.

`public.upstatus_visual_config` currently has no anon/authenticated table grants. `realtime.messages` has RLS enabled with no policies but retains anon/authenticated SELECT and INSERT grants. Do not infer direct row access from those grants alone; RT-17 remains partial pending a reviewed Realtime authorization migration.

Supabase Security Advisor returned two WARN lint categories covering the same three SECURITY DEFINER functions: one category for anon EXECUTE and one for authenticated EXECUTE. It also returned ten INFO findings for RLS-enabled tables without policies. Performance Advisor returned no findings.

### Production Edge Functions and migration gaps

The production inventory contains 38 ACTIVE Edge Functions, all reporting `verify_jwt=false`. This does not by itself prove unauthenticated access: the core UpStatus functions validate the custom `x-upstatus-token` session at application level. It does mean the gateway is not enforcing Supabase Auth JWTs for these functions; retain an explicit per-function route/auth inventory and do not disable legacy functions blindly.

Read-only source inspection confirmed:
- `upstatus`: ACTIVE version 480, internal version `3.4.7`.
- `upstatus-team-lite`: ACTIVE version 15, internal version `3.4.30`.
- `upstatus-screen-share-3-1-1-beta10`: ACTIVE version 6; its source and embedded userscript identify themselves as `3.1.1-beta8`. This is the legacy Normal runtime endpoint.
- Both deployed core functions use a 30-second warm-instance session-cache revalidation window. The candidate Normal and Team Lite server templates use 5 seconds; that candidate behavior is not deployed.

The Normal build separates the artifact URL from the API runtime: `release.json` points userscript updates to `/functions/v1/upstatus/upstatus.user.js`, while `scripts/build.mjs` still sets `CLOUD_SERVER` to the legacy `upstatus-screen-share-3-1-1-beta10` endpoint. Keep the client/API/auth/signaling switch coordinated with a reviewed rollback.

The production catalog does **not** contain:
- `public.upstatus_signal_rate_limits`
- `public.consume_upstatus_signal_rate_limit(text, integer, integer)`
- `public.merge_chat_read_receipts(text, jsonb, timestamptz)`

Therefore neither the distributed rate-limit RPC nor the atomic chat-receipt merge RPC is installed in production. The candidate migrations with `_test` suffix were applied only to the isolated test project. Generate reviewed production migrations through the approved Supabase CLI workflow; do not copy test migration names directly into production.

## Isolated signaling candidate

The isolated project `bfpjtfqlnypisxljoxkb` contains the candidate migrations `20261104152847` and `20261104154623`. Its `upstatus-signal-test` Edge Function is ACTIVE version 27.

The isolated endpoint uses separate fixed-window buckets per authenticated UpStatus username: 240 reads/minute and 90 writes/minute. The rate-limit table has RLS enabled and no client grants; the RPC is SECURITY INVOKER, uses an empty search_path, and EXECUTE is limited to service_role.

Team Lite exact-head CI passed the 91-request endpoint check (90 accepted, 1 HTTP 429), the 24-concurrent-request RPC check (10 allowed, 14 denied, then window reset), and the atomic chat-receipt concurrency test. This is **isolated candidate evidence only**. The product-facing Normal and Team Lite endpoints do not yet call this RPC, and production has no corresponding table/function. RT-09 remains **PARTIAL** until the limiter is integrated into the coordinated product endpoint cutover and validated on both candidates.

The isolated endpoint's current response helper returns HTTP 429 but does not add a `Retry-After` header. If retry guidance is part of the API contract, add it explicitly and assert it in CI.

## Manual acceptance gates

**MANUAL PENDING:** issue #78 remains open. Neither current candidate has a recorded real-browser test of approximately 10 seconds of internet loss followed by recovery without F5. Required in both Normal and Team Lite:
- recover Realtime/authenticated transport and re-enter the voice room;
- place and receive a new call after reconnect;
- repeat multiple drops;
- verify bidirectional audio and unaffected participants who stayed online;
- confirm no duplicate audio, orphan peers, or duplicate pollers.

Also pending on the current candidates:
- separate Tampermonkey profiles;
- real microphone permission/capture/playback and mute/unmute;
- real tab/display capture and stop-sharing;
- Normal ↔ Team Lite cross-client call/voice/screen tests in both directions;
- GM bridge/authenticated flow in the isolated environment.

Earlier manual checks on the legacy baseline do not substitute for acceptance of these current candidates.

## Required next actions

1. **Normal CI:** repair the stale static rate-limit assertion and obtain a successful Signaling Smoke run on the exact latest #74 head, including endpoint, authenticated/browser, distributed rate-limit, and atomic receipt checks.
2. **Public Realtime:** design and test the migration away from public full-row broadcasts. Private Supabase Realtime requires `private: true`, explicit RLS policies on `realtime.messages`, and a Supabase Auth JWT. Current clients authenticate UpStatus API requests with a custom token, not a Supabase Auth JWT. Do not simply revoke Realtime grants or flip channels to private before a trusted JWT exchange or server-mediated replacement is designed and tested.
3. **Production security migration:** validate the trigger-function EXECUTE revocations, nine-table grant revocations, and Realtime grant/policy plan in official TEST first, including rollback and continued trigger behavior. Production remains untouched pending explicit approval.
4. **Product rate limiting:** integrate the distributed limiter into the actual product endpoints and validate per-user read/write quotas, HTTP 429 behavior, concurrency, cleanup, and retry semantics.
5. **Chat receipts:** validate the atomic receipt RPC and caller permissions in official TEST before any production rollout.
6. **Coordinated endpoint/version cutover:** align Normal userscript, legacy API endpoint, new endpoint, Team Lite 3.4.31 candidate, manifests, and rollback as one reviewed release.
7. **Manual device/network acceptance:** complete the no-F5 recovery and real Tampermonkey/device tests above.
8. **Scope decisions:** resolve remaining issue #24 chat regression/Sale Smartly confirmation and issue #16 Ycaro inclusion/secret setup before claiming the full release scope is closed.

## Safety record

No production SQL write, migration, Edge Function deployment, secret/flag change, userscript publication, PR merge, or destructive operation was performed during this audit. All Supabase SQL was read-only. Existing CI logs were inspected; no new workflow run was triggered because Normal and Team Lite share an isolated fixture project and the engineering branch was actively changing.

Do not report a completion percentage. Automated candidate checks, static inspection, manual acceptance, and production readiness are separate states. No release is ready while the public Realtime disclosure path, Normal exact-head smoke, production migration/cutover, and manual acceptance gates remain open.

## Evidence links

- [Normal PR #74](https://github.com/Reekyi/UpStatus/pull/74)
- [Team Lite baseline PR #75](https://github.com/Reekyi/UpStatus/pull/75)
- [Team Lite signaling PR #76](https://github.com/Reekyi/UpStatus/pull/76)
- [Continuity handoff PR #80](https://github.com/Reekyi/UpStatus/pull/80)
- [Reconnect issue #78](https://github.com/Reekyi/UpStatus/issues/78)
- [Release checklist issue #79](https://github.com/Reekyi/UpStatus/issues/79)
- [Normal Validate run 41864124241](https://github.com/Reekyi/UpStatus/actions/runs/41864124241)
- [Normal Signaling Smoke run 41864124208](https://github.com/Reekyi/UpStatus/actions/runs/41864124208)
- [Team Lite Candidate Checks run 41863688477](https://github.com/Reekyi/UpStatus/actions/runs/41863688477)
- [Supabase Advisor: SECURITY DEFINER callable by anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Supabase Advisor: SECURITY DEFINER callable by authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Supabase Advisor: RLS enabled without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)


## Documentation branch validation note

The documentation was kept on an isolated branch and PR #82 targets `master`; it does not change runtime code. Its Validate run [41888642090](https://github.com/Reekyi/UpStatus/actions/runs/41888642090) failed at the existing `scripts/validate.mjs` assertion `production updateURL mismatch`. The only changed path in PR #82 is this Markdown file, so the failure is in the current master baseline rather than in this audit document. No code was changed to bypass the check.

An earlier documentation-only attempt against `develop` (PR #81, now closed) failed at `client signed upload helper missing` in that branch's validator. This is another branch-baseline mismatch, not a document failure. Keep PR #82 Draft until the base validation issue is resolved or the repository owners explicitly accept a documentation-only exception.


## Revalidation 2026-11-04 — latest refs, CI and production catalog

This section supersedes older snapshots where the exact PR head or workflow run differs. It was appended on the isolated QA documentation branch only. PR #80 and all engineering branches were left untouched.

### Repository and concurrent work

- Default branch `master` is still at `a9288ccfcb0f308d3a587bfca624418a395be07b`; the requested readiness file is not present on `master` and remains in PR #82.
- PR #82 is still open/Draft at head `f87997e18996c3d2ef1a7e9b2d612b251a6ac608`. PR #80 remains a separate open/Draft handoff branch at `33aefd3bb80b5b6229730e104b946d4faf57aa36`; it was not edited.
- Recent commits on the Normal branch end at `2a5574c`. The latest commits include the isolated rate-limit test/fixture work and documentation-only cutover/private-Realtime notes. Team Lite #76 ends at `3cf0801`; #75 remains at `7bbf9b9`.

### Exact-head workflow status

| PR | Exact head | Latest inspected run | Result |
|---|---|---|---|
| #74 Normal | `2a5574c0bae1be608dd9e6d9ce091c6c0768e35a` | Validate [41864124241](https://github.com/Reekyi/UpStatus/actions/runs/41864124241); Signaling Smoke [41864124208](https://github.com/Reekyi/UpStatus/actions/runs/41864124208) | Validate **AUTOMATED PASS**; Smoke **BLOCKED/FAIL** |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | Historical **AUTOMATED PASS**; superseded by #76 |
| #76 Team Lite signaling | `3cf080156ae15c0defd2a981eb3b2221edf0d208` | Candidate Checks [41863688477](https://github.com/Reekyi/UpStatus/actions/runs/41863688477) | **AUTOMATED PASS** |
| #82 QA documentation | `f87997e18996c3d2ef1a7e9b2d612b251a6ac608` | Validate [41888771770](https://github.com/Reekyi/UpStatus/actions/runs/41888771770) | **BLOCKED** by base-branch validator assertion |

**Normal failure detail:** job `126694475658` failed at step 3, “Syntax-check signaling test harnesses”. The assertion in `scripts/signaling-static.test.mjs` still requires the old in-memory map pattern `rate.size >= 2000`. The isolated signaling endpoint now calls `consume_upstatus_signal_rate_limit` in Postgres, so the test contract is stale. This is a test/implementation mismatch, not proof that the RPC itself failed. The unauthenticated endpoint, authenticated integration/browser, distributed limiter and receipt-concurrency steps were all skipped after that failure. Do not report those as passed on the current Normal head.

The older successful Normal smoke [41853971486](https://github.com/Reekyi/UpStatus/actions/runs/41853971486) belongs to the earlier commit `fb1417ab69a16b0bf30611df5584e8d0d3466076`, not the current #74 head. The issue #79 comment at 15:02 BRT is a historical checkpoint and does not supersede the later exact-head failure.

**Team Lite pass detail:** run 41863688477 completed all candidate steps on the exact #76 head. Logs show 14/14 unauthenticated checks, 86/86 authenticated integration checks, Chromium call/voice/screen WebRTC with remote tracks, three-member mesh and teardown, 90 accepted plus one HTTP 429, distributed rate-limit concurrency/reset, atomic receipt concurrency, version 3.4.31, portal/syntax checks and updater scenarios. The fixtures were cleaned up. This is isolated-project automated evidence, not a real Tampermonkey installation or physical network-loss test.

**PR dependency:** comparing #75 head to #76 head reports #76 as 92 commits ahead, 0 behind, with #75 as the merge base. #76 is a continuation/descendant of the #75 baseline, not an independent sibling candidate. Review the combined history and recomputed diff after any base-branch movement; do not treat the two PRs as independent release payloads.

### Workflow inspection

- `.github/workflows/signaling-smoke.yml` uses path filters for the Normal signaling suite, `workflow_dispatch`, a shared concurrency group `upstatus-signaling-isolated-tests`, `cancel-in-progress: false`, read-only repository permissions and a 30-minute job timeout. The shared group is appropriate because Normal and Team Lite use the same isolated fixture project.
- The Normal smoke workflow uses `actions/checkout@v4` by tag rather than a pinned commit SHA. This is a supply-chain hardening item; the Team Lite candidate workflow and Validate workflow use a pinned checkout SHA.
- `.github/workflows/team-lite-candidate.yml` also uses the shared fixture concurrency group and read-only repository permissions. The authenticated integration step explicitly skips when the isolated secret is absent; the passing current run proves the secret was available for that run.
- The `master` version of `.github/workflows/validate.yml` has no `paths-ignore`. Therefore the docs-only PR #82 still triggered Validate using the base-branch workflow and failed at `scripts/validate.mjs:26` with `production updateURL mismatch`. The `paths-ignore` added on the candidate branch does not govern this PR while its base is master. This is a baseline validation failure, not a failure caused by the Markdown content.
- The authenticated harness and rate-limit scripts explicitly target the isolated project `bfpjtfqlnypisxljoxkb`; the authenticated harness refuses other project URLs and cleans up temporary fixtures. No workflow was rerun during this audit.

### Production Supabase recheck — read-only

Project `dlfvkawaiqduhlazsszm` is `ACTIVE_HEALTHY` on Postgres 17.11. Production still has seven recorded migrations; latest is `20261027155438`. The candidate security, payload-minimization, rate-limit and receipt migrations are not in production migration history.

**Public Realtime payload:** production definitions were re-read from `pg_get_functiondef` and confirmed unchanged:
- `upstatus_broadcast_messages()` is `SECURITY DEFINER`, `search_path=public`, serializes the complete OLD/NEW message row with `to_jsonb`, and calls `realtime.send(..., false)` on the shared public topic.
- The message row contains `message`, `image_url`, `mentions`, `reply_to`, `reactions`, `file_name`, sender and timestamps.
- `upstatus_broadcast_remote_state()` sends command/result metadata publicly.
- `upstatus_broadcast_users()` sends user name/status/reason/update/sync metadata publicly.

The candidate migrations `20261103160000_minimize_public_chat_broadcast.sql` and `20261103170000_minimize_public_status_broadcasts.sql` reduce those database-trigger broadcasts to an `op` hint only. Matching isolated migrations exist in the test project, but the production catalog and migration inventory show that these changes have **not** been applied to production. Even after those migrations, the shared topic remains public: the clients still use public Realtime for presence/health and, while authenticated signaling is default-off, legacy call/voice/screen events. Payload minimization is not equivalent to private-channel authorization or a completed transport cutover.

**Grants and RLS:**
- The three trigger-only SECURITY DEFINER functions still have EXECUTE for `anon`, `authenticated`, `service_role` and `postgres`; each retains `search_path=public`. Supabase Security Advisor reports two WARN categories covering these three functions.
- The nine backend-owned tables `chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, and `users` have RLS enabled, no policies, and broad grants to both `anon` and `authenticated`: DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE and UPDATE. These grants are broader than the earlier summary's SELECT/INSERT shorthand. No direct row access was demonstrated; RLS has no policies. Treat this as unnecessary privilege surface, not proof that those roles can read rows.
- `upstatus_visual_config` has only the service-role grants in the inspected ACL.
- `realtime.messages` has RLS enabled with no policies and grants INSERT, SELECT and UPDATE to `anon` and `authenticated`. Do not revoke these blindly while clients depend on the public topic.
- Security Advisor reports 10 INFO findings for RLS-enabled tables without policies; Performance Advisor returned no findings.

**Production Edge Functions:**
- Inventory: 38 ACTIVE functions, all 38 report `verify_jwt=false`. This flag alone does not prove unauthenticated application access. Source inspection of the three core functions confirms custom `x-upstatus-token` session validation; a complete per-function route/auth inventory remains **NOT VERIFIED**.
- `upstatus`: deployed version 480, internal 3.4.7.
- `upstatus-team-lite`: deployed version 15, internal 3.4.30.
- `upstatus-screen-share-3-1-1-beta10`: deployed version 6, internal 3.1.1-beta8.
- All three inspected production sources use a 30-second warm-instance session-cache revalidation window. This can delay propagation of a revoked session on other warm instances; the 5-second candidate behavior is not deployed.
- Neither production core function source contains `consume_upstatus_signal_rate_limit` or `merge_chat_read_receipts`.

### Isolated-only rate-limit and receipt evidence

The isolated project `bfpjtfqlnypisxljoxkb` is ACTIVE_HEALTHY and has 16 migrations. Its `upstatus-signal-test` function is ACTIVE version 27. The fixed-window buckets are per authenticated UpStatus username, split into read/write classes (240 reads/minute and 90 writes/minute), not per individual token/session.

The #76 CI log verifies the endpoint threshold (90 accepted, 1 rejected with HTTP 429), the concurrent RPC case (10 allowed, 14 denied out of 24 concurrent requests), fixed-window reset and atomic receipt concurrency. However:
- Both candidate product server templates in PRs #74 and #76 call `db.rpc("merge_chat_read_receipts", ...)` from `readRoute`; source inspection confirms atomic receipt integration in both Normal and Team Lite candidates. The #76 CI run also passed the isolated concurrent receipt-RPC test. This is candidate-code inspection plus isolated RPC test evidence, not production deployment evidence. Production still lacks the RPC, so the reviewed migration must be installed before deploying either candidate backend; otherwise the read-receipt route will fail when it calls the missing function.
- Neither candidate product server template calls `consume_upstatus_signal_rate_limit`. The distributed rate limiter is wired only into the isolated `upstatus-signal-test` function, not the product-facing Normal or Team Lite endpoints. RT-09 therefore remains PARTIAL.
- The isolated endpoint's 429 response helper does not include a `Retry-After` header. Add and test it if retry timing is part of the API contract.
- Production has neither the rate-limit table/RPC nor the receipt-merge RPC.
- The isolated endpoint's 429 response helper does not include a `Retry-After` header. Add and test it if retry timing is part of the API contract.
- Production has neither the rate-limit table/RPC nor the receipt-merge RPC.

### Normal / Team Lite compatibility and reconnect

- Normal candidate remains 3.4.7 and its build-time `CLOUD_SERVER` still targets the legacy `upstatus-screen-share-3-1-1-beta10` endpoint; the update artifact URL targets the separate `upstatus` endpoint. These two paths require a coordinated cutover.
- Team Lite candidate manifest is 3.4.31, but its stable script URL still points to `team-lite-official`; PR #76 has not been published.
- Both candidate transports remain disabled by default. The legacy Realtime path remains active for call/voice/screen when the flag is off.
- Static source inspection confirms both candidates clean up active voice/call state on `offline`, stop old signaling pollers, restart Realtime and initialize a fresh signaling transport on `online`. The voice room is intentionally **not** auto-joined; the user must re-enter after the channel is subscribed. This is code inspection, not a physical network test.
- Team Lite's current candidate workflow passed its static reconnect assertions. Normal's current Signaling Smoke stopped at the earlier stale rate-limit assertion, so later static assertions in that script did not execute on the exact #74 head.
- The Chromium harness validates the isolated server/adapter and WebRTC flows; it does not install both actual userscripts in separate Tampermonkey profiles. Normal ↔ Team Lite cross-client behavior, real microphone/display capture, and the no-F5 physical network recovery remain **MANUAL PENDING** under issue #78.

### Current release gates

1. **BLOCKED — Normal exact-head CI:** update the stale static assertion to test the Postgres RPC contract, then obtain a full Signaling Smoke pass on the exact current #74 head.
2. **BLOCKED — Public Realtime:** apply and validate the candidate payload minimization only after official TEST review, and separately complete the client-originated event/transport migration. A private-channel switch requires a trusted Supabase Auth JWT or a tested replacement path; the UpStatus custom token is not that JWT.
3. **BLOCKED — Product rate limiting/receipts:** integrate and test the distributed limiter and atomic receipt RPC in the actual Normal and Team Lite product endpoints. Current CI is isolated-only.
4. **PENDING — Production hardening:** review and validate trigger EXECUTE revocations, backend-table grant revocations, and Realtime authorization/grant changes in official TEST with rollback and trigger-regression coverage.
5. **PENDING — Session revocation:** bring the shorter session-cache window to the actual product endpoint as part of the coordinated cutover.
6. **MANUAL PENDING — Device/network:** complete Tampermonkey profile tests, real mic and display capture, Normal ↔ Team Lite cross-client flows, repeated network drops/recovery without F5, new calls after reconnect, bidirectional audio, and no duplicate/orphan peers or pollers.
7. **PENDING — Scope:** resolve issue #24 unread/chat regression and Sale Smartly confirmation, plus issue #16 Ycaro scope/secret/activation decision.

### Audit safety record

This revalidation used GitHub read APIs, existing workflow logs, Supabase catalog/source reads and read-only SQL. No tests or workflows were manually dispatched. The documentation commit automatically triggered Validate on PR #82 because the base `master` workflow has no `paths-ignore`; run [41898768499](https://github.com/Reekyi/UpStatus/actions/runs/41898768499) failed at the same existing `production updateURL mismatch` assertion. No production SQL write, migration, Edge Function deployment, secret/flag change, userscript publication, merge, destructive operation, or engineering-branch edit was performed. The only repository write was this documentation update on the isolated PR #82 QA branch, using the fetched current blob SHA as an optimistic concurrency guard.


## Revalidation 2026-11-04 — latest PR refs, workflow logs and production catalog

This pass re-fetched the default branch, current PR metadata, issue state/comments, exact-head workflow runs, candidate files and production Supabase catalog. The branch refs below are the GitHub API values observed in this pass; issue comments that mention older SHAs are historical checkpoints, not current PR-head evidence.

### Current repository and PR refs

- Default branch `master`: `a9288ccfcb0f308d3a587bfca624418a395be07b`. `docs/RELEASE_READINESS.md` is still absent from master and remains only in this QA documentation branch/PR #82.
- PR #74 Normal: open/Draft, head `2a5574c0bae1be608dd9e6d9ce091c6c0768e35a`, base `master`.
- PR #75 Team Lite baseline: open/Draft, head `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`, base `team-lite-official`.
- PR #76 Team Lite signaling: open/Draft, head `3cf080156ae15c0defd2a981eb3b2221edf0d208`, same base `team-lite-official`.
- PR #80 engineering handoff: open/Draft, head `33aefd3bb80b5b6229730e104b946d4faf57aa36`; untouched.
- PR #82 QA documentation: open/Draft, head `28b3432c52119ccddf0167802d0dc6e067a37ef8`; its only changed file remains `docs/RELEASE_READINESS.md`.

PR #76 is 92 commits ahead of #75 and zero commits behind it; the merge base is exactly the #75 head. #76 is a descendant/continuation of #75, not an independent release payload. Their changed-file sets overlap in the Team Lite workflow, build script, server template, userscript, updater and portal files. Do not merge them as independent siblings.

Several issue comments mention commits `8df04f4`, `d9f4ef0`, `5d70005` and `2d1fa7d`. GitHub compare confirms those are behind the current #74/#76 heads (12 commits behind for the cited Normal receipt commit; 5 behind for the cited Team Lite template commit). The current PR head SHAs and exact-head runs below supersede those older comments.

All #74, #75, #76, #80 and #82 PRs remain open and Draft; none is merged.

### Exact-head CI evidence

| PR | Exact head | Run | Result |
|---|---|---|---|
| #74 Normal | `2a5574c0bae1be608dd9e6d9ce091c6c0768e35a` | Validate [41864124241](https://github.com/Reekyi/UpStatus/actions/runs/41864124241) | **AUTOMATED PASS** |
| #74 Normal | same | Signaling Smoke [41864124208](https://github.com/Reekyi/UpStatus/actions/runs/41864124208) | **BLOCKED/FAIL** |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | Historical **AUTOMATED PASS**, superseded by #76 |
| #76 Team Lite signaling | `3cf080156ae15c0defd2a981eb3b2221edf0d208` | Candidate Checks [41863688477](https://github.com/Reekyi/UpStatus/actions/runs/41863688477) | **AUTOMATED PASS** |
| #82 QA documentation | `28b3432c52119ccddf0167802d0dc6e067a37ef8` | Validate [41898865916](https://github.com/Reekyi/UpStatus/actions/runs/41898865916) | **BLOCKED** by base-branch validation assertion |

**Normal failure cause is now confirmed from the job log.** Run 41864124208 failed in the static harness step with: `rate-limit buckets must remain bounded without evicting active counters`. The assertion in `scripts/signaling-static.test.mjs` still expects the old in-memory `rate.size >= 2000` pattern in `supabase/functions/upstatus-signal-test/index.ts`. That isolated endpoint now uses the Postgres RPC `consume_upstatus_signal_rate_limit` and has no such in-memory map. This is a stale test contract, not evidence that the Postgres RPC failed. The unauthenticated endpoint, authenticated integration/browser, distributed rate-limit and receipt-concurrency steps were all skipped after the static failure. None of those later stages has an exact-current-head Normal result.

**Team Lite run 41863688477 completed all steps on the exact #76 head.** The log confirms adapter assertions, 14/14 unauthenticated checks, 86/86 authenticated integration checks, Chromium call/voice/screen negotiation, all three pairwise links in the three-member mesh, teardown, 90 accepted plus one HTTP 429, the distributed limiter concurrency/reset test, atomic receipt concurrency, candidate version 3.4.31, portal syntax and updater scenarios. This remains isolated-project CI evidence, not a real Tampermonkey/device/network-loss acceptance test.

The PR #82 Validate run failed at `scripts/validate.mjs` with `production updateURL mismatch`. The PR changes only this Markdown file. The current `master` Validate workflow triggers on push and pull request to `master`/ `develop` and has no `paths-ignore`, so documentation-only changes still run the base validator. Do not weaken or bypass the validator as part of this QA documentation change.

### Workflow inspection

- Normal `.github/workflows/signaling-smoke.yml`: `pull_request` to `master` plus `workflow_dispatch`; shared isolated-project concurrency group `upstatus-signaling-isolated-tests`; `cancel-in-progress: false`; `contents: read`; 30-minute timeout. It uses `actions/checkout@v4` by mutable tag, unlike the pinned checkout SHA in the Team Lite workflow. Its comment still says push and pull-request runs share the fixture, although the current trigger has no `push`. The migration path filter is duplicated. These are workflow hygiene/supply-chain improvements, not a reason to rerun against shared fixtures now.
- Team Lite `.github/workflows/team-lite-candidate.yml`: pull request to `team-lite-official`; same global isolated-project concurrency group; `cancel-in-progress: false`; `contents: read`; 30-minute timeout; checkout pinned to a commit SHA with `persist-credentials: false`. The authenticated step is conditional on the isolated service-role secret; the current passing run's 86/86 output confirms that the authenticated suite actually ran.
- Both candidate workflows wire the isolated rate-limit and atomic-receipt scripts after the authenticated integration stage. No workflow was manually dispatched or rerun in this pass.

### Candidate product-code integration

**Atomic chat receipts:** both `src/server/index.template.ts` in #74 and `src/server/team-lite-index.template.ts` in #76 call `merge_chat_read_receipts` from `readRoute`. Both preserve the greatest of the prior read cursor and the newest message included in the snapshot. The candidate SQL defines the RPC as `SECURITY INVOKER`, uses an empty `search_path`, revokes client/PUBLIC EXECUTE and grants EXECUTE to `service_role`. #76 CI passed the concurrent RPC regression. This is a positive candidate-code correction to the earlier audit note: the receipt RPC is integrated into both candidate templates. It is still **NOT VERIFIED in production**, because the production catalog has no such function and the deployed Edge Function sources do not call it. The migration must be reviewed and installed in official TEST, then included in the authorized production cutover before deploying candidate endpoints.

**Distributed rate limiting:** neither product server template contains a call to `consume_upstatus_signal_rate_limit`. The isolated `upstatus-signal-test` function calls the RPC, uses separate per-username read/write buckets (240 reads/minute and 90 writes/minute), and returns HTTP 429 after the configured threshold. The CI concurrency test checks 24 simultaneous RPC calls (10 allowed, 14 denied) and window reset. This does not prove product endpoint enforcement. RT-09 remains **PARTIAL** until the limiter is integrated into both actual product endpoints and validated there. The isolated endpoint response helper does not add `Retry-After`; decide whether that header is part of the contract and test it.

### Production Supabase recheck — read-only

Project `dlfvkawaiqduhlazsszm` remains `ACTIVE_HEALTHY` on Postgres 17.11. The production migration inventory still contains seven migrations; latest is `20261027155438`.

The current production catalog does **not** contain:
- `public.upstatus_signal_rate_limits`
- `public.consume_upstatus_signal_rate_limit(text, integer, integer)`
- `public.merge_chat_read_receipts(text, jsonb, timestamptz)`

The three production trigger functions remain `SECURITY DEFINER`, `search_path=public`, with EXECUTE for `anon`, `authenticated`, `service_role` and `postgres`:
- `upstatus_broadcast_messages()`
- `upstatus_broadcast_remote_state()`
- `upstatus_broadcast_users()`

Their live definitions were read again with `pg_get_functiondef`:
- `upstatus_broadcast_messages()` serializes the complete relevant OLD/NEW message row via `to_jsonb`, wraps it as `{op, record}`, and calls `realtime.send(..., 'db_change', ..., false)`.
- `upstatus_broadcast_remote_state()` publishes remote command/result metadata to the shared topic with `private=false`.
- `upstatus_broadcast_users()` publishes name, status, reason, update timestamp and sync metadata with `private=false`.

The message schema includes message text and attachment/interaction metadata. This remains a **BLOCKED** public Realtime disclosure path. RLS on the source table does not prevent the SECURITY DEFINER trigger from publishing the payload. Candidate payload-minimization migrations reduce trigger payloads to operation hints, but they are not applied in production and do not make the shared topic private. The authenticated signaling transport remains opt-in/default-off, so legacy call/voice/screen signaling continues to rely on public Realtime while disabled.

The read-only ACL/policy query reconfirmed:
- The nine backend-owned tables `chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing` and `users` have RLS enabled, zero policies and broad anon/authenticated privileges (DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE and UPDATE).
- `public.upstatus_visual_config` has RLS enabled, zero policies and no anon/authenticated table grants.
- `realtime.messages` has RLS enabled, zero policies and anon/authenticated INSERT, SELECT and UPDATE grants.
- The grant inventory alone does not prove direct row access where RLS has no policies. Do not revoke Realtime grants blindly while clients still depend on the public topic.

Security Advisor currently reports two WARN lint categories (anon EXECUTE and authenticated EXECUTE) covering the same three SECURITY DEFINER functions, plus ten INFO findings for RLS-enabled tables without policies. Performance Advisor returned no findings.

### Production Edge Functions and client compatibility

The project inventory still reports 38 ACTIVE Edge Functions, all with `verify_jwt=false`. This flag is not proof of unauthenticated application access: the inspected core functions validate the custom `x-upstatus-token` session. A full per-function route/auth inventory remains **NOT VERIFIED**.

Current deployed core functions:
- `upstatus`: ACTIVE version 480, internal version 3.4.7.
- `upstatus-team-lite`: ACTIVE version 15, internal version 3.4.30.
- `upstatus-screen-share-3-1-1-beta10`: ACTIVE version 6, internal version 3.1.1-beta8.

All three inspected deployed sources still use a 30-second warm-instance session revalidation interval. Both candidate product templates use 5 seconds. Neither deployed core function source calls the receipt-merge or rate-limit RPCs. Production client/backend cutover is therefore still outstanding.

The Normal candidate build continues to separate the userscript update artifact URL from the API `CLOUD_SERVER` endpoint: the update artifact uses `/upstatus/upstatus.user.js`, while the runtime API still targets the legacy `upstatus-screen-share-3-1-1-beta10` endpoint. Keep those paths, the backend, authentication, signaling, versions and rollback coordinated. Team Lite candidate manifest remains 3.4.31 and points at the stable `team-lite-official` script URL; PR #76 has not been published.

Both candidates keep authenticated signaling disabled by default. Static source inspection finds offline/online lifecycle handlers and stale join-generation guards, but the voice room is not auto-rejoined; the user must enter again after transport recovery. Issue #78 remains open, and its current issue body records the observed symptom: after an approximately 10-second internet interruption during a voice room, the user cannot re-enter without F5. Candidate CI checks do not prove the full userscript recovers in a real browser.

### Current gates and safe-work record

1. **BLOCKED — Normal exact-head smoke:** update the stale assertion to validate the Postgres RPC contract, then obtain a complete Signaling Smoke pass on the exact current #74 head.
2. **BLOCKED — Public Realtime:** minimize public trigger payloads only as an interim step; complete a trusted Supabase Auth JWT exchange or replace public client-originated events with a server-mediated authenticated transport. Keep RT-01/RT-17 open until end-to-end validation.
3. **PARTIAL — Rate limiting:** integrate the distributed limiter into both product-facing endpoints; test per-user quotas, concurrency, 429, reset/cleanup and retry semantics. Current green evidence is isolated-only.
4. **CANDIDATE INTEGRATED / PRODUCTION NOT VERIFIED — Chat receipts:** install the reviewed RPC migration in official TEST and production before candidate backend deployment; validate UI behavior, rollback and Sale Smartly compatibility.
5. **PENDING — Production hardening:** validate trigger EXECUTE revocation, backend-owned table grants and Realtime authorization in official TEST with trigger regression and rollback. Do not apply production changes without explicit authorization.
6. **PENDING — Session revocation and cutover:** bring the 5-second cache to the deployed endpoints and coordinate Normal userscript/API endpoint, Team Lite version, migrations and rollback.
7. **MANUAL PENDING — Issue #78:** test real network loss/recovery without F5 in both clients, re-entry, new calls, repeated drops, bidirectional audio, remaining participants, microphone/display permissions, Tampermonkey GM bridge and no orphan peers/pollers.
8. **PENDING — Scope:** issue #24 chat UI/unread and Sale Smartly confirmation; issue #16 Ycaro scope/secret/activation decision; issue #14 / PR #15 documentation review.

This pass used GitHub read APIs, existing workflow logs, Supabase metadata/source reads and read-only SQL. No workflow was rerun; no shared fixture was mutated. No production SQL write, migration, Edge Function deployment, secret/flag change, userscript publication, merge, destructive operation or engineering-branch edit was performed. The only repository write in this pass is this append/correction on the isolated QA documentation branch, guarded by the current file blob SHA. No completion percentage is reported.


## Revalidation 2026-11-04 — current GitHub and Supabase state

This pass re-read this document from the QA branch before inspecting current refs. The file is still absent from `master`; it exists on `qa/release-readiness-2026-11-04-master` in PR #82. The file blob read before this append was `13c1df15ed866a169d8f9fc3f6eea2f5eaca41fb`. The QA branch remains separate from engineering PR #80 and the runtime candidates.

### Exact repository state and concurrent work

- `master` remains at `a9288ccfcb0f308d3a587bfca624418a395be07b`.
- PR #74 remains open/Draft at `2a5574c0bae1be608dd9e6d9ce091c6c0768e35a`; PR #75 remains open/Draft at `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; PR #76 remains open/Draft at `3cf080156ae15c0defd2a981eb3b2221edf0d208`.
- PR #80 remains open/Draft at `33aefd3bb80b5b6229730e104b946d4faf57aa36`; it was not edited. PR #82 was open/Draft at `24da6dde653207987ae2f33d8a65f10fe06e2e3f` before this append.
- PR #76 is exactly 92 commits ahead of #75 and zero behind; its merge base is the #75 head. Treat #76 as the continuation of #75, not a separate sibling release payload.
- Compare from the previously validated Normal runtime head `5d700050dfbd8e221be7d61e130585dde2003879` to #74 head `2a5574c` shows 21 later commits, including atomic chat receipts, distributed rate-limit candidate code, new tests, workflow changes and cutover/security documentation. Therefore the older passing smoke run [41853971486](https://github.com/Reekyi/UpStatus/actions/runs/41853971486) is not exact-head evidence for the current #74 candidate.
- Issue #78 remains open; its acceptance checkboxes remain unchecked. Issue #79 remains open, but its body is still the 2026-11-03 snapshot with older candidate SHAs. Use current PR refs and exact-head workflow runs rather than the stale body table.

### Current exact-head workflow evidence

| PR | Exact head | Evidence | Classification |
|---|---|---|---|
| #74 Normal | `2a5574c0bae1be608dd9e6d9ce091c6c0768e35a` | Validate [41864124241](https://github.com/Reekyi/UpStatus/actions/runs/41864124241) passed; Signaling Smoke [41864124208](https://github.com/Reekyi/UpStatus/actions/runs/41864124208) failed | Validate **AUTOMATED PASS**; smoke **BLOCKED/FAIL** |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passed | Historical **AUTOMATED PASS**, superseded by #76 |
| #76 Team Lite signaling | `3cf080156ae15c0defd2a981eb3b2221edf0d208` | Candidate Checks [41863688477](https://github.com/Reekyi/UpStatus/actions/runs/41863688477) passed | **AUTOMATED PASS** |
| #82 QA docs | `24da6dde653207987ae2f33d8a65f10fe06e2e3f` | Validate [41907601988](https://github.com/Reekyi/UpStatus/actions/runs/41907601988) failed | **BLOCKED** by the unchanged master validator baseline |

**Normal smoke root cause is confirmed by job log.** Run 41864124208 failed in job `126694475658`, step 3, `Syntax-check signaling test harnesses`. The failing assertion in `scripts/signaling-static.test.mjs` still requires the old in-memory `rate.size >= 2000` map. The current isolated endpoint source instead calls `db.rpc("consume_upstatus_signal_rate_limit", ...)`. This is a stale static-test contract, not evidence of a runtime RPC failure. The unauthenticated endpoint, authenticated integration/browser, rate-limit concurrency and receipt-concurrency steps were skipped after the static failure. Do not report them as passed on the current Normal head.

Team Lite job `126692567137` completed all steps on exact #76 head: authenticated API checks 86/86, Chromium call/voice/screen flows, three-member mesh and teardown, endpoint rate limit (90 accepted, one HTTP 429), RPC concurrency/reset, atomic receipt concurrency, and version/updater/portal checks. This is isolated-project CI evidence, not a physical Tampermonkey or network-loss acceptance test.

The #82 Validate run 41907601988 failed at `scripts/validate.mjs` with `production updateURL mismatch`. PR #82 changes only `docs/RELEASE_READINESS.md`; the failure is in the unchanged master validation baseline. The current `.github/workflows/validate.yml` has no `paths-ignore`, so documentation-only PRs still run the build validator.

### Workflow and release-control inspection

- Normal `.github/workflows/signaling-smoke.yml` runs for PRs targeting `master` and via `workflow_dispatch`; it has no `push` trigger even though its concurrency comment mentions push runs. It uses the shared isolated-fixture concurrency group with `cancel-in-progress: false`, a 30-minute timeout, and mutable `actions/checkout@v4` without `persist-credentials: false`. Its path list repeats `supabase/migrations/**`.
- Team Lite `.github/workflows/team-lite-candidate.yml` uses the same serialized fixture group and timeout, but pins checkout to a commit SHA and sets `persist-credentials: false`. Its path list also repeats `supabase/migrations/**` and includes the Normal server template path, causing some unrelated Normal changes to trigger Team Lite candidate checks.
- `.github/workflows/deploy-production.yml` is manual-only, checks stable version 3.4.7, runs validation, and deploys the `upstatus` Edge Function. It does **not** apply database migrations. `.github/workflows/deploy-test.yml` is also manual-only and deploys the `upstatus-test` function. Migration application is a separate operation and must be sequenced before any backend that depends on new RPCs.
- The production deploy workflow has a stable-version gate but no explicit branch/ref allowlist. Consider requiring the approved release ref and expected Supabase project ID in the workflow before any future dispatch. No workflow was dispatched in this audit.

### Candidate integration and migration packaging

- Both Normal `src/server/index.template.ts` and Team Lite `src/server/team-lite-index.template.ts` define `SESSION_CACHE_TTL_MS=5000` and call `merge_chat_read_receipts` from `readRoute`. The atomic receipt RPC is therefore integrated in both candidate templates by code inspection.
- Neither product-facing template calls `consume_upstatus_signal_rate_limit`. The distributed limiter remains wired only into the isolated `upstatus-signal-test` Edge Function. RT-09 remains **PARTIAL**; candidate CI does not prove product endpoint enforcement.
- The isolated limiter uses per-authenticated-UpStatus-user buckets split into `:read` and `:write`, with 240 reads/minute and 90 writes/minute. Its response helper returns 429 without `Retry-After`; add the header if it is part of the API contract.
- The receipt and rate-limit SQL files are present in the canonical `supabase/migrations/` directory in both #74 and #76, with identical blob contents, despite the `_test.sql` suffix. Supabase CLI migration discovery is timestamp/path based; the suffix does not exclude them from a future `db push`. Keep these isolated-test migrations out of any production migration run until replaced by reviewed production migration files. The current deploy workflow does not run `db push`, so merging alone does not apply them.
- The receipt RPC is `SECURITY INVOKER`, uses an empty search path, and grants EXECUTE only to `service_role`. The rate-limit RPC has the same invoker/empty-search-path/service-role-only pattern. Both are present in the isolated project, not production.

### Production Supabase recheck — read-only

Project `dlfvkawaiqduhlazsszm` remains `ACTIVE_HEALTHY` on Postgres 17.11.0.002. Its migration inventory still has seven entries; the latest is `20261027155438`. The production catalog still lacks `upstatus_signal_rate_limits`, `consume_upstatus_signal_rate_limit(text, integer, integer)`, and `merge_chat_read_receipts(text, jsonb, timestamptz)`.

The three active production triggers still call SECURITY DEFINER functions with `search_path=public` and EXECUTE available to `anon`, `authenticated`, and `service_role`:
- `upstatus_messages_broadcast` -> `upstatus_broadcast_messages()`
- `upstatus_remote_state_broadcast` -> `upstatus_broadcast_remote_state()`
- `upstatus_users_broadcast` -> `upstatus_broadcast_users()`

The live message trigger still serializes the full OLD/NEW row and sends it to Realtime with `private=false`. The row schema includes `message`, `image_url`, `mentions`, `reply_to`, `reactions`, `file_name`, sender and timestamp. The remote-state trigger sends command/result metadata and the user trigger sends name/status/reason/update metadata, also with `private=false`. RT-01 remains **BLOCKED**. The candidate payload-minimization migrations send only operation hints, but are not applied in production and do not make the shared topic private.

Read-only ACL and policy checks reconfirmed:
- Nine backend-owned tables (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) have RLS enabled, zero policies, and broad client grants including SELECT/INSERT/UPDATE/DELETE/TRIGGER/TRUNCATE/REFERENCES. `FORCE ROW LEVEL SECURITY` is false.
- `realtime.messages` has RLS enabled, zero policies, and anon/authenticated INSERT/SELECT/UPDATE grants.
- `upstatus_visual_config` has RLS enabled, zero policies and no anon/authenticated table grants.
- These ACLs are unnecessary privilege surface; they do not by themselves prove direct row access where RLS has no policies.
- Security Advisor returned two WARN categories (three functions each: anon EXECUTE and authenticated EXECUTE) plus ten INFO findings for RLS-enabled tables without policies. Performance Advisor returned no findings.

Production currently reports 38 ACTIVE Edge Functions, all with `verify_jwt=false`. The three inspected current runtime functions are:
- `upstatus`: Edge Function version 480, internal version 3.4.7.
- `upstatus-team-lite`: version 15, internal version 3.4.30.
- `upstatus-screen-share-3-1-1-beta10`: version 6, internal version 3.1.1-beta8.

The three deployed sources use a 30-second warm-instance session revalidation window and do not call either the receipt RPC or rate-limit RPC. The core functions validate the custom UpStatus session token at application level, so `verify_jwt=false` alone is not proof of missing route authentication. A route-by-route authentication inventory for all 38 active functions remains **NOT VERIFIED**.

The isolated project `bfpjtfqlnypisxljoxkb` is `ACTIVE_HEALTHY), has 16 migrations, and hosts `upstatus-signal-test` ACTIVE version 27. Its RPC and endpoint CI evidence remains isolated-only.

### Current gates and safe-work record

1. **BLOCKED — RT-01:** remove full-row public broadcasts and complete an authenticated/private or server-mediated event path. Payload minimization is interim only.
2. **BLOCKED — Normal exact-head smoke:** update the stale static assertion to validate the Postgres RPC contract, then obtain a complete Signaling Smoke pass on exact #74 head.
3. **PARTIAL — RT-09:** integrate the distributed limiter into both actual product endpoints; validate quotas, concurrency, 429, retry semantics and cleanup there.
4. **CANDIDATE INTEGRATED / PRODUCTION NOT VERIFIED — receipts:** validate the reviewed migration in official TEST and include it in the authorized database-before-backend cutover.
5. **PENDING — production grants:** validate trigger EXECUTE revocations, backend-table grant revocations and Realtime authorization/rollback in official TEST. Do not revoke Realtime grants blindly while legacy clients still use the topic.
6. **PENDING — session revocation/cutover:** deploy the candidate 5-second cache only as part of a coordinated endpoint/version/rollback plan; production remains at 30 seconds.
7. **MANUAL PENDING — issue #78:** real no-F5 network recovery, voice-room re-entry, new calls, repeated drops, bidirectional audio, remaining participants, Tampermonkey profiles, real microphone/display capture and Normal ↔ Team Lite cross-client flows.
8. **PENDING — scope:** issue #24 chat/unread and Sale Smartly confirmation; issue #16 Ycaro scope/secret/activation; issue #14 / PR #15 review.

This pass used GitHub read APIs, existing workflow logs, Supabase metadata/function-source reads and read-only catalog SQL. No tests or workflows were rerun because Normal and Team Lite share the isolated fixture project. No production SQL write, migration, Edge Function deployment, secret/flag change, userscript publication, PR merge, destructive operation or engineering-branch edit was performed. The only repository write from this pass is this documentation append on the isolated QA branch, using the current file blob SHA as an optimistic concurrency guard. No completion percentage is reported.


## Revalidation 2026-11-04 — exact refs, workflow assurance and production catalog

This pass re-read this file first, then verified live PR metadata, branch refs, issue comments, workflow jobs/logs, candidate source files and Supabase catalogs. The QA branch was still at `b0f855e3c35c5da084e9680016635d90b65f849e` and the document blob was `09701b8000973ebcd621d9daeb2ab8575383c1b8` before this append.

### Exact GitHub refs and concurrent work

| PR | State | Base | Exact head | Current interpretation |
|---|---|---|---|---|
| #74 Normal | Open / Draft | `master` | `2a5574c0bae1be608dd9e6d9ce091c6c0768e35a` | Current Normal candidate; smoke fails below |
| #75 Team Lite baseline | Open / Draft | `team-lite-official` | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Historical baseline only |
| #76 Team Lite signaling | Open / Draft | `team-lite-official` | `3cf080156ae15c0defd2a981eb3b2221edf0d208` | Current Team Lite candidate |
| #80 engineering handoff | Open / Draft | `develop` | `33aefd3bb80b5b6229730e104b946d4faf57aa36` | Left untouched |
| #82 QA continuity | Open / Draft | `master` | `b0f855e3c35c5da084e9680016635d90b65f849e` | Documentation-only branch |

The Normal branch's latest commit is `2a5574c` (documentation of endpoint-level 429 regression); the preceding commits include test-fixture cleanup and cutover/private-Realtime documentation. The Team Lite branch's latest commit is `3cf0801` (fixture cleanup). No newer engineering commits were present on either branch during this read. PR #80 remains a separate branch and was not changed.

A stale-head discrepancy exists in the PR #76 description: its validation narrative still calls `2d1fa7d` the current head, but the GitHub PR API and branch ref both report `3cf0801`. The current exact-head evidence is Candidate Checks run [41863688477](https://github.com/Reekyi/UpStatus/actions/runs/41863688477), not the older run in the PR narrative. Likewise, older successful Normal smoke evidence in PR #74's body belongs to older SHAs and does not supersede the current failed run.

Compare confirms #76 is 92 commits ahead of #75 and zero behind; #76 is the continuation of #75, not an independent sibling release candidate. Keep both Draft and do not plan separate merges.

Issues #78 and #79 remain open. The latest #78 comment records automated reconnect regression assertions but explicitly leaves physical no-F5 acceptance pending. The latest #79 comment matches the current #74/#76 CI state and reiterates the production security blockers; the issue body still contains older checklist snapshots, so use exact live refs and run IDs instead of its historical SHA table.

### Exact-head CI and workflow evidence

**Normal #74**
- Validate [41864124241](https://github.com/Reekyi/UpStatus/actions/runs/41864124241): **AUTOMATED PASS** on exact head `2a5574c`.
- Signaling Smoke [41864124208](https://github.com/Reekyi/UpStatus/actions/runs/41864124208): **BLOCKED/FAIL** on the same exact head.
- Job `126694475658` failed at step 3, `Syntax-check signaling test harnesses`, with assertion text: `rate-limit buckets must remain bounded without evicting active counters` at `scripts/signaling-static.test.mjs:154`.
- The assertion expects the old in-memory counter map, while the isolated endpoint source now calls `db.rpc("consume_upstatus_signal_rate_limit", ...)`. This is a stale static-test contract, not proof of a runtime RPC failure.
- Steps 4–7 (unauthenticated endpoint, authenticated integration/browser, rate-limit concurrency, and receipt concurrency) were skipped after step 3 failed. They have no current exact-head Normal result.

**Team Lite #76**
- Candidate Checks [41863688477](https://github.com/Reekyi/UpStatus/actions/runs/41863688477): **AUTOMATED PASS** on exact head `3cf0801`.
- The job log confirms 86/86 authenticated integration checks; Chromium call audio, voice-room audio and screen video; dynamic invitations; all three pairwise links in the three-member mesh; peer/media teardown; and fixture cleanup.
- The same run confirms 90 endpoint requests accepted and one rejected with HTTP 429, distributed rate-limit concurrency/reset, atomic receipt concurrency, Team Lite 3.4.31 metadata, portal syntax/session-isolation checks and updater runtime scenarios.
- This is isolated-project CI evidence. It is not physical Tampermonkey, real microphone/display permission, or real network interruption acceptance.

**CI assurance gap found in both signaling workflows**
- The authenticated integration step exits successfully with `SKIP` when `UPSTATUS_SIGNAL_TEST_SERVICE_ROLE_KEY` is absent.
- `scripts/test-signal-rate-limit.mjs` and `scripts/test-chat-read-receipts.mjs` also print `SKIP` and exit 0 when the Supabase URL/key are absent.
- Therefore a future green workflow can omit authenticated, rate-limit and receipt tests if the secret is missing. The current Team Lite run's logs prove those stages did execute and pass, but the workflow contract is not fail-closed. Make the secret a required release-check prerequisite or explicitly fail when a required gate is skipped.
- Normal smoke uses mutable `actions/checkout@v4` and does not set `persist-credentials: false`; Team Lite pins checkout to a commit SHA and disables credential persistence. Both have `contents: read`.
- Normal smoke's comment mentions push and pull-request runs, but its actual triggers are pull_request and workflow_dispatch only. Both candidate workflows duplicate the `supabase/migrations/**` path entry; Team Lite also watches the Normal server template, so some unrelated Normal edits trigger its suite.
- `validate.yml` has no path filters. Documentation-only PR #82 therefore runs the full build validator and fails at the existing `production updateURL mismatch` assertion. Latest run [41918051312](https://github.com/Reekyi/UpStatus/actions/runs/41918051312) failed in `scripts/validate.mjs`; the PR still changes only this Markdown file.
- `deploy-production.yml` is manual-only, checks stable version 3.4.7 and deploys only Edge Function `upstatus`; it does not apply migrations. It has no explicit approved-ref allowlist or assertion that the supplied project ID equals the expected production project. Review those controls before any future dispatch. No workflow was dispatched in this audit.

### Candidate integration and migration packaging

| Capability | Normal candidate | Team Lite candidate | Production |
|---|---|---|---|
| Session cache revalidation | 5 seconds | 5 seconds | 30 seconds in deployed core functions |
| Atomic chat receipt RPC | Called by `readRoute` | Called by `readRoute` | RPC absent |
| Distributed signaling rate RPC | Not called by product template | Not called by product template | Table/RPC absent |
| Authenticated signaling | Opt-in / default-off | Opt-in / default-off | Not cut over |

The exact candidate source files confirm `SESSION_CACHE_TTL_MS=5000` and calls to `merge_chat_read_receipts` in both product templates. Neither product template calls `consume_upstatus_signal_rate_limit`; that RPC is used by the isolated `upstatus-signal-test` function only. Thus RT-09 remains **PARTIAL** despite the isolated endpoint and RPC tests passing. The isolated 429 response has no `Retry-After` header; decide and test the API retry contract.

Both candidate SQL files with `_test.sql` suffix remain under the canonical `supabase/migrations/` directory:
- `20261104152847_atomic_chat_read_receipts_and_visual_config_grants_test.sql`
- `20261104154623_distributed_signaling_rate_limit_test.sql`

The suffix does not make these files invisible to standard timestamp-based migration discovery. Do not include them in a production migration run; replace them with separately reviewed production migrations and validate ordering/rollback in official TEST. The production deploy workflow does not run `db push`, so a PR merge alone does not apply them.

### Supabase production recheck — read-only

Production project `dlfvkawaiqduhlazsszm` remains `ACTIVE_HEALTHY`, Postgres 17.11.0.002, with seven recorded migrations; latest `20261027155438`. The isolated project `bfpjtfqlnypisxljoxkb` is also `ACTIVE_HEALTHY`, Postgres 17.11.0.003, with 16 migrations through `20261104154623`. Its `upstatus-signal-test` function is ACTIVE version 27; the isolated function is not a production endpoint.

Production still lacks:
- `public.upstatus_signal_rate_limits`
- `public.consume_upstatus_signal_rate_limit(text, integer, integer)`
- `public.merge_chat_read_receipts(text, jsonb, timestamptz)`

The three active production triggers still call `SECURITY DEFINER` functions with `search_path=public` and EXECUTE for `anon`, `authenticated` and `service_role`. The message trigger serializes the full OLD/NEW row and calls Realtime with `private=false`; remote-state and user-status triggers also publish metadata to the public topic. RT-01 remains **BLOCKED**.

The catalog recheck confirms nine backend-owned tables have RLS enabled, zero policies, `FORCE ROW LEVEL SECURITY=false`, and broad client grants (DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE). The grants are unnecessary privilege surface; the catalog result alone does not prove direct row access because RLS has no policies.

A follow-up catalog query confirmed `realtime.messages` is a partitioned parent (`relkind=p`), with RLS enabled, zero policies, and anon/authenticated INSERT, SELECT and UPDATE grants. An earlier query filtered only ordinary tables and therefore omitted this parent; the follow-up included all relation kinds. Do not infer direct row access from grants alone, and do not revoke these privileges blindly while legacy clients still use public Realtime.

Security Advisor observed two WARN categories (three SECURITY DEFINER functions callable by anon and the same three callable by authenticated) and ten INFO findings for RLS-enabled tables without policies. Performance Advisor returned no findings.

The production Edge Function inventory reports 38 ACTIVE functions, all with `verify_jwt=false`. This flag alone is not proof of missing application authentication; the three inspected core sources validate the custom UpStatus session token. A route-by-route authentication inventory for all 38 functions remains **NOT VERIFIED**. Deployed versions remain Normal 3.4.7 / Edge version 480, Team Lite 3.4.30 / Edge version 15, and legacy Normal endpoint 3.1.1-beta8 / Edge version 6. The three deployed sources retain 30-second session-cache revalidation and do not call the receipt or rate-limit RPCs.

### Manual and release gates

- **MANUAL PENDING — issue #78:** real network loss/recovery without F5 in both products; voice-room re-entry; new calls; repeated drops; bidirectional audio; remaining participants; real microphone/display capture; Tampermonkey GM bridge; no orphan peers or duplicate pollers.
- **BLOCKED — RT-01:** remove full-row public chat broadcasts and replace public client-originated signaling with an authenticated/private or server-mediated design. Payload minimization alone is not channel authorization.
- **BLOCKED — Normal smoke:** update the stale static assertion and obtain a complete exact-head Signaling Smoke pass.
- **PARTIAL — RT-09:** integrate the distributed rate limiter into both product endpoints; test quotas, concurrency, 429, retry semantics and cleanup.
- **CANDIDATE INTEGRATED / PRODUCTION NOT VERIFIED — receipts:** both templates call the RPC, but the production RPC is absent. Validate the reviewed migration in official TEST and sequence database before backend.
- **PENDING — migration packaging and grants:** separate test migrations; validate trigger EXECUTE revocation, table grants, Realtime authorization and rollback in official TEST.
- **PENDING — coordinated cutover:** align Normal artifact URL, legacy `CLOUD_SERVER`, new endpoint, Team Lite version, session cache, migrations and rollback.
- **PENDING — scope:** issue #24 chat/unread and Sale Smartly confirmation; issue #16 Ycaro scope/secret/activation; issue #14 / PR #15 review.

This pass used GitHub read APIs, existing CI job logs, source-file reads, Supabase metadata/advisors and read-only catalog SQL. No CI was rerun because Normal and Team Lite share the isolated fixture project. No production SQL write, migration, Edge Function deployment, secret/flag change, userscript publication, PR merge, destructive operation, or engineering-branch edit was performed. The only write is this documentation append on the isolated QA branch, guarded by the previously fetched file blob SHA. No completion percentage is reported.


## Revalidation 2026-11-04 23:28 UTC - workflow contract, production catalog and Edge inventory

This pass re-read this document first, then re-fetched PR/issue metadata, changed-file lists, exact-head workflow runs and logs, current candidate source files, production Edge Function metadata/source, Supabase advisors, migrations and read-only catalog state. No new CI run was triggered because Normal and Team Lite share the isolated fixture project.

### Exact GitHub state and concurrent work

- PR #74 remains open/Draft on head `2a5574c0bae1be608dd9e6d9ce091c6c0768e35a`; PR #75 remains open/Draft on `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; PR #76 remains open/Draft on `3cf080156ae15c0defd2a981eb3b2221edf0d208`.
- PR #80 remains open/Draft on `33aefd3bb80b5b6229730e104b946d4faf57aa36`. Its changed files are `UPSTATUS_HANDOFF.md` and `docs/CURRENT_STATE.md`; the current head commit updates only `docs/CURRENT_STATE.md`. Neither file nor the PR #80 branch was changed.
- PR #82 remains open/Draft on `6b001d7583f508dd076a1792fb378108fa8caff4`, with exactly one changed file: this readiness document. The readiness file is still absent from `master`; it exists only on the QA branch/PR #82.
- Compare #75...#76 remains `ahead_by=92`, `behind_by=0`. #76 is a continuation of #75, not an independent sibling candidate.
- Issue #78 remains open with three comments and no recorded physical no-F5 acceptance. Issue #79 remains open with 35 comments; its body still contains the older 2026-11-03 head/run table. The latest comment is the 2026-11-04 QA checkpoint, so current PR API refs and exact workflow runs supersede the older body snapshot.

### Exact-head CI

- Normal #74 Validate [41864124241](https://github.com/Reekyi/UpStatus/actions/runs/41864124241) passed on the recorded head. Signaling Smoke [41864124208](https://github.com/Reekyi/UpStatus/actions/runs/41864124208) failed in job `126694475658`, step 3, at `scripts/signaling-static.test.mjs:154`. The assertion still requires the old in-memory `rate.size >= 2000` pattern, while `supabase/functions/upstatus-signal-test/index.ts` calls `db.rpc("consume_upstatus_signal_rate_limit", ...)`. The failure is a stale static-test contract, not a runtime failure result for the RPC. Steps 4-7 were skipped, so no exact-head Normal approval exists for endpoint, authenticated/browser, rate-limit concurrency or receipt concurrency.
- Team Lite #76 Candidate Checks [41863688477](https://github.com/Reekyi/UpStatus/actions/runs/41863688477) passed on exact head `3cf0801`. Its job log confirms 86/86 authenticated checks, Chromium call/voice/screen WebRTC, dynamic invitation and roster flows, three-member pairwise mesh, teardown, 90 accepted plus one HTTP 429, distributed rate-limit concurrency/reset, atomic receipt concurrency, candidate version 3.4.31, portal/session-isolation and updater checks. This remains isolated-project automated evidence, not physical Tampermonkey/device/network acceptance.
- PR #82 Validate [41925942180](https://github.com/Reekyi/UpStatus/actions/runs/41925942180) failed at `production updateURL mismatch` in `scripts/validate.mjs`. The PR still changes only Markdown. The run is a baseline validator failure, not a runtime change introduced by this document.

### Workflow assurance and branch-specific correction

- `.github/workflows/validate.yml` on `master` has no `paths-ignore`, so documentation-only PR #82 still invokes the build validator and hits the existing baseline assertion. The same workflow on the current Normal candidate branch `chore/continuity-foundation` does include ignores for Markdown and `docs/**`. This is a branch/base difference; do not describe the candidate-branch file as the workflow currently governing the #82 base.
- Normal `signaling-smoke.yml` on #74 declares `pull_request` and `workflow_dispatch`, not `push`; its path list repeats `supabase/migrations/**`. It uses mutable `actions/checkout@v4` and does not set `persist-credentials: false`. Team Lite pins checkout to SHA `de0fac2e4500dabe0009e67214ff5f5447ce83dd` and disables credential persistence.
- Both signaling workflows allow the authenticated integration step to print `SKIP` and exit 0 if `UPSTATUS_SIGNAL_TEST_SERVICE_ROLE_KEY` is absent. Both rate-limit and receipt test scripts also print `SKIP` and exit 0 if `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing. Therefore the workflow contract is not fail-closed for required release gates. The current Team Lite run logs prove those steps actually ran and passed; do not retroactively invalidate that run. Make credentials a required release-check prerequisite or fail when a mandatory gate is skipped.
- `deploy-production.yml` is manual-only, validates stable release version 3.4.7 and deploys only Edge Function `upstatus`; it does not apply migrations. Its YAML has no explicit approved-ref allowlist or assertion that the supplied project ID equals the expected production project. The existence/configuration of GitHub Environment protections was not inspected, so no claim is made about external approval rules.

### Candidate and migration integration

- Both Normal and Team Lite product templates still set `SESSION_CACHE_TTL_MS=5000` and call `merge_chat_read_receipts` from `readRoute`.
- Neither product template calls `consume_upstatus_signal_rate_limit`; the RPC call is present in the isolated `upstatus-signal-test` function only. RT-09 remains PARTIAL.
- The two files named `20261104152847_atomic_chat_read_receipts_and_visual_config_grants_test.sql` and `20261104154623_distributed_signaling_rate_limit_test.sql` remain in the canonical `supabase/migrations/` folder. They contain actual DDL for the receipt function/table privileges and rate-limit table/function. The `_test` suffix is part of the migration name, not an exclusion rule. Supabase CLI's migration workflow discovers timestamped files in this folder and `db push` applies pending migrations. Do not run these candidate files against production; generate/review the intended production migrations separately and validate ordering/rollback in official TEST. The production deploy workflow does not run `db push`.

### Production Supabase catalog and advisors - read-only

Project `dlfvkawaiqduhlazsszm` remains ACTIVE_HEALTHY on Postgres 17.11.0.002, with seven recorded migrations through `20261027155438`. The catalog query reconfirmed that production lacks `public.upstatus_signal_rate_limits`, `public.consume_upstatus_signal_rate_limit(text, integer, integer)`, and `public.merge_chat_read_receipts(text, jsonb, timestamptz)`.

- The three active triggers remain attached to `public.messages`, `public.upstatus_state` and `public.users`. Their functions are SECURITY DEFINER, configured with `search_path=public`, and have effective EXECUTE for `anon`, `authenticated` and `service_role`.
- `upstatus_broadcast_messages()` serializes OLD for DELETE and NEW otherwise with `to_jsonb(...)`, then calls `realtime.send(..., false)`. The current production definition still publishes the full message row on the public topic. The remote-state and user-status trigger functions also send their command/result and status metadata with `private=false`. RT-01 remains BLOCKED.
- Nine backend-owned public tables retain RLS enabled, zero policies, `FORCE ROW LEVEL SECURITY=false`, and explicit client grants including DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE and UPDATE. `public.upstatus_visual_config` has no anon/authenticated table grants. The `realtime.messages` partitioned parent (`relkind=p`) has RLS enabled, zero policies and anon/authenticated INSERT, SELECT and UPDATE grants. These ACLs are unnecessary privilege surface; they do not alone establish direct row access through RLS.
- Security Advisor observed two WARN categories covering the three SECURITY DEFINER functions (anon and authenticated EXECUTE) and ten INFO findings for RLS-enabled relations without policies. Performance Advisor returned no findings.

### Production Edge Function inventory

- Current inventory: 38/38 Edge Functions ACTIVE; all report `verify_jwt=false`.
- Three production runtime endpoints inspected in source remain Normal `upstatus` version 480/internal 3.4.7, Team Lite `upstatus-team-lite` version 15/internal 3.4.30, and legacy Normal `upstatus-screen-share-3-1-1-beta10` version 6/internal 3.1.1-beta8. Their source validates the custom `x-upstatus-token` against `upstatus_sessions`, but the warm-instance revalidation cache remains 30 seconds. This is application-level auth evidence for these inspected sources; `verify_jwt=false` alone is not proof of an unauthenticated route.
- The inventory also includes 35 other ACTIVE test, beta, backup and older screen-share slugs, including `upstatus-test` version 281. A sample read of `upstatus-test` also showed the custom session-token pattern and 30-second cache. The route-by-route authentication/ownership/usage inventory for all 38 functions is still NOT VERIFIED. Do not disable or delete historical endpoints without confirming consumers and rollback requirements.
- The isolated project `bfpjtfqlnypisxljoxkb` remains ACTIVE_HEALTHY; its `upstatus-signal-test` function is ACTIVE version 27 and uses the distributed rate-limit RPC. This does not install the RPC in production.

### Current gates and safe-work record

1. **BLOCKED - RT-01:** replace full-row public broadcasts and complete the authenticated/private or server-mediated transport design. Supabase Realtime private channels require private-channel configuration and appropriate RLS authorization; the current client uses the custom UpStatus session token rather than a Supabase Auth JWT. See [Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization).
2. **BLOCKED - Normal exact-head smoke:** update the stale static assertion to validate the DB-backed limiter contract, then obtain a complete Signaling Smoke pass on the exact current #74 head.
3. **PARTIAL - RT-09:** integrate the distributed rate limiter into both product endpoints and test quotas, concurrency, 429, retry semantics and cleanup on those endpoints.
4. **PENDING - CI fail-closed:** make authenticated, rate-limit and receipt gates mandatory for release validation; a skipped required gate must not exit successfully.
5. **PENDING - migration packaging:** replace/separate the test-suffixed files before any production migration run; validate reviewed migrations in official TEST.
6. **PENDING - production privileges and Realtime:** validate trigger EXECUTE revocations, table grant changes, private-channel authorization and rollback in official TEST before production authorization.
7. **PENDING - Edge inventory:** complete route-by-route auth, ownership and usage classification for all 38 active functions, especially test/backup/beta endpoints.
8. **MANUAL PENDING - issue #78:** physical no-F5 network recovery, voice-room re-entry, new calls, repeated drops, real microphone/display capture, Tampermonkey and Normal <-> Team Lite cross-client acceptance.
9. **PENDING - coordinated cutover and scope:** align endpoint versions, sessions, migrations and rollback; resolve issues #24, #16 and #14 before declaring full scope closed.

This pass used GitHub read APIs, existing workflow job logs, source-file reads, Supabase metadata/advisors, official Supabase documentation search and read-only catalog SQL. No tests or workflows were rerun. No production SQL write, migration, Edge Function deployment, secret/flag change, userscript publication, PR merge, destructive operation, or engineering-branch edit was performed. The only repository write is this documentation append on the isolated QA branch, guarded by the current file blob SHA. No completion percentage is reported.


## QA branch commit and validation follow-up - 2026-11-04 23:33 UTC

- The documentation append above was committed as `dd23c3435b11a4932ac9d721c498fcb130ddce05`. GitHub compare confirms it is one commit ahead of the previously recorded QA head `6b001d7583f508dd076a1792fb378108fa8caff4`, with zero commits behind and only `docs/RELEASE_READINESS.md` changed.
- The branch file read confirms the appended content is present. The PR metadata endpoint still returned the previous head during this check, so treat the branch commit and compare result as the fresher evidence and re-fetch PR metadata after GitHub refreshes its PR snapshot.
- The new documentation commit triggered Validate run [41934558498](https://github.com/Reekyi/UpStatus/actions/runs/41934558498). It failed at the existing `production updateURL mismatch` assertion in `scripts/validate.mjs`. No runtime path was changed. This repeats the same master-baseline validator failure observed on the previous documentation-only run.
- No manual rerun was requested or dispatched. The master workflow has no documentation path exclusion, so further documentation-only commits will continue to invoke the same validator until the base workflow or its existing assertion is addressed by the repository maintainers.


## Revalidation 2026-11-05 00:27 UTC — public client chat_fast path and test-harness safety

This pass re-read the current readiness document first, then refreshed PR/issue metadata, exact branch heads, candidate and deployed userscript sources, workflow files/logs, Edge Function inventory/source, Supabase advisors, migrations, and read-only PostgreSQL catalog state. No test was rerun because the Normal and Team Lite workflows share the isolated fixture project.

### Exact refs and concurrent work

- PR #74 remains open/Draft at `2a5574c0bae1be608dd9e6d9ce091c6c0768e35a`; #75 remains open/Draft at `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; #76 remains open/Draft at `3cf080156ae15c0defd2a981eb3b2221edf0d208`.
- PR #80 remains open/Draft at `33aefd3bb80b5b6229730e104b946d4faf57aa36`; its handoff branch was not changed.
- PR #82 remains open/Draft at `054a8ecb81bb494eccc043dfe515b6fcdd11dfd5`, with only `docs/RELEASE_READINESS.md` changed. No new PR in the current release workstream appeared.
- Compare #75...#76 remains 92 commits ahead and zero behind; #76 is the continuation of #75, not a separate sibling candidate.
- Issue #78 remains open with three comments and no recorded physical no-F5 acceptance. Issue #79 remains open with 36 comments; its body still contains the older 2026-11-03 CI snapshot. The latest comment is an operational automation checkpoint, not manual release acceptance. Current PR API heads and exact workflow runs take precedence over the stale issue-body table.

### New confirmed public message broadcast path — RT-01 remains blocked

The database-trigger broadcast is not the only public message path.

**Deployed Normal and Team Lite scripts:**
- Production Edge Function `upstatus` is ACTIVE version 480 and embeds userscript 3.4.7.
- Production Edge Function `upstatus-team-lite` is ACTIVE version 15 and embeds userscript 3.4.30.
- Both embedded scripts send `sendRealtimeEvent('chat_fast', { message: created })` after a message send and `sendRealtimeEvent('chat_fast', { message: r.message })` after attachment send.
- Both create the Realtime channel with `realtimeClient.channel(UP_REALTIME_TOPIC)` and no private-channel option. No `private: true` configuration is present in either embedded script.
- The production `handleRealtimeChatFast` handler reads `payload.message`, confirming the full message object is an active part of the deployed client protocol.

**Current candidate scripts:**
- Normal and Team Lite candidates still send the same full `chat_fast` message object.
- Their current handlers ignore the received payload and schedule an authenticated API refresh, which is a useful client-side minimization, but it does not stop the sender from publishing the object to the public channel.
- The Normal server template's message-create response contains the message text, image URL, filename, mentions, reply metadata, reactions, and read state; the userscript forwards that response object in `chat_fast`.

**Why the existing migration is insufficient:**
- `20261103160000_minimize_public_chat_broadcast.sql` changes only the database trigger payload to `{ op: TG_OP }`.
- It does not modify the client-originated `chat_fast` sender.
- That migration is present in PR #74's branch, absent from the PR #76 Team Lite branch, and absent from production migration history.
- Therefore, even if the trigger migration were applied, the deployed/candidate clients would still broadcast message content through `chat_fast` until that client-originated path is removed or replaced.

This is a confirmed public-channel content path in the deployed Normal 3.4.7 and Team Lite 3.4.30 scripts, not merely a stale trigger concern. RT-01 remains **BLOCKED** until both database-trigger and client-originated message broadcasts are addressed and verified. Payload minimization of the trigger alone is not sufficient.

### Test-harness safety finding

The shared `scripts/test-signal-rate-limit.mjs` and `scripts/test-chat-read-receipts.mjs` files are byte-identical in the Normal and Team Lite candidate branches.

- If `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing, both print `SKIP` and exit with code 0.
- If credentials are present, neither script checks that `SUPABASE_URL` is the isolated project `bfpjtfqlnypisxljoxkb`.
- The rate-limit test invokes the RPC and deletes its fixture bucket row.
- The receipt test writes a `chat_reads` fixture through the RPC, reads it back, and deletes the fixture row.
- Neither script requires an explicit mutation opt-in.
- By contrast, `scripts/run-signaling-authenticated.mjs` checks the exact isolated project hostname and requires `UPSTATUS_SIGNAL_ALLOW_MUTATION=1`.

The current workflows hard-code the isolated project URL and serialize both suites in the same concurrency group, so the observed Team Lite CI run was scoped to the isolated project. Its job log confirms the authenticated suite actually ran (86/86), the endpoint rate-limit check passed (90 accepted, one 429), and both RPC concurrency scripts passed. The log line containing the word `SKIP` is the shell's echoed conditional command; subsequent authenticated pass output confirms that branch was not taken in this run.

However, local/manual invocation of either RPC test with production environment variables could create and delete test fixtures in production. Add an explicit isolated-project allowlist and mutation opt-in to both scripts before encouraging local execution. Do not run these scripts against production.

The workflows also remain fail-open when the isolated secret is absent: the authenticated step prints SKIP and exits 0, and the two RPC scripts independently skip with exit 0. The current green Team Lite run is valid evidence because its logs show the tests ran; future release CI must fail when a mandatory gate is skipped.

### Current exact-head CI and issue state

- Normal #74 Validate [41864124241](https://github.com/Reekyi/UpStatus/actions/runs/41864124241) passed; Signaling Smoke [41864124208](https://github.com/Reekyi/UpStatus/actions/runs/41864124208) failed in step 3 at `scripts/signaling-static.test.mjs:154`. Steps 4-7 (unauthenticated endpoint, authenticated/browser, rate-limit concurrency, receipt concurrency) were skipped after the static failure. The stale assertion still requires the old in-memory `rate.size >= 2000` implementation, while the isolated endpoint uses the Postgres RPC.
- Team Lite #76 Candidate Checks [41863688477](https://github.com/Reekyi/UpStatus/actions/runs/41863688477) passed on exact head. Logs confirm the authenticated tests actually ran, including 86/86 checks, Chromium WebRTC call/voice/screen, three-member mesh and teardown, endpoint 90+1/429, rate-limit concurrency/reset, and receipt concurrency.
- PR #82 Validate [41934622821](https://github.com/Reekyi/UpStatus/actions/runs/41934622821) failed at `scripts/validate.mjs:26` with `VALIDATION FAILED: production updateURL mismatch`. The PR still changes only this Markdown document; no runtime file changed in that PR.

### Production Supabase snapshot — read-only

- Project `dlfvkawaiqduhlazsszm` reports `ACTIVE_HEALTHY`, Postgres 17.11.0.002, seven migrations through `20261027155438`.
- Production still lacks `public.upstatus_signal_rate_limits`, `public.consume_upstatus_signal_rate_limit(text, integer, integer)`, and `public.merge_chat_read_receipts(text, jsonb, timestamptz)`.
- The active message trigger is AFTER INSERT/UPDATE/DELETE and still publishes the full OLD/NEW row through `realtime.send(..., false)`. The remote-state and user-status triggers also publish to the public topic.
- The three trigger functions remain `SECURITY DEFINER`, `search_path=public`, with effective EXECUTE for `anon`, `authenticated`, and `service_role`.
- The nine backend-owned public tables remain RLS-enabled with zero policies and broad client privileges. The `realtime.messages` partitioned parent remains RLS-enabled with zero policies and client SELECT/INSERT/UPDATE grants. `upstatus_visual_config` has no client grants. These ACLs are unnecessary privilege surface; the catalog does not by itself prove direct row access through RLS.
- Security Advisor observed two WARN categories (three functions each for anon/authenticated EXECUTE) and ten INFO RLS-without-policy findings. Performance Advisor returned no findings.
- The inventory remains 38/38 ACTIVE Edge Functions with `verify_jwt=false`. The three inspected production runtime sources validate the custom UpStatus session token, but a route-by-route authentication/ownership/usage inventory for all 38 remains NOT VERIFIED.
- Deployed core functions retain 30-second session-cache revalidation; candidate Normal and Team Lite templates use five seconds.

### Required follow-up

1. Remove or replace the client-originated public `chat_fast` full-message broadcasts in both products; test that no other public client event contains message bodies or attachment metadata.
2. Treat the trigger-minimization migration as an intermediate step only; RT-01 cannot close while the client-originated path remains.
3. Add an isolated-project URL allowlist and explicit mutation opt-in to the rate-limit and receipt test scripts.
4. Make authenticated, rate-limit, and receipt checks fail closed in both workflows when required credentials are absent.
5. Fix the stale Normal static assertion and obtain a complete exact-head Signaling Smoke pass.
6. Keep the physical no-F5 reconnect, real Tampermonkey/device, and Normal <-> Team Lite acceptance gates open until actually performed.
7. Keep production migrations, grants, Edge Function changes, and endpoint cutover pending official TEST validation and explicit authorization.

This revalidation used GitHub read APIs, existing workflow logs, source reads, Supabase metadata/advisors, and read-only catalog SQL. No tests or workflows were rerun. No production SQL write, migration, Edge Function deployment, secret/flag change, userscript publication, PR merge, destructive operation, or engineering-branch edit was performed. The only repository write is this documentation append on the isolated QA branch, guarded by the freshly fetched file blob SHA. No completion percentage is reported.


## Revalidation 2026-11-05 — deployed chat_fast path, test-harness guard and current state

This pass re-read this document before refreshing repository refs, workflow jobs/logs, candidate userscripts/templates, deployed Edge Function source, Supabase migration/catalog/advisor state, and the current issue discussions. All database statements were read-only. No shared-project tests were rerun because Normal and Team Lite use the same isolated fixtures.

### Exact refs and concurrent work

- Normal PR #74 remains open/Draft at `2a5574c0bae1be608dd9e6d9ce091c6c0768e35a`; Team Lite baseline #75 remains open/Draft at `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; Team Lite continuation #76 remains open/Draft at `3cf080156ae15c0defd2a981eb3b2221edf0d208`.
- #76 remains 92 commits ahead and zero behind #75. It is a continuation of the #75 baseline, not an independent sibling candidate.
- Handoff PR #80 remains open/Draft at `33aefd3bb80b5b6229730e104b946d4faf57aa36`; no engineering or handoff branch was changed.
- QA PR #82 remains open/Draft at `ba5c1ee916a4681da9fe073e0f41d1039f142455`; this pass changes only this Markdown file.
- Issue #78 remains open with three comments and no recorded physical no-F5 acceptance. Issue #79 remains open with 36 comments; its body still contains an older CI snapshot. Current PR heads and exact workflow jobs below take precedence over that historical table.

### Exact-head workflow evidence

| Workstream | Exact head | Run | Result |
|---|---|---|---|
| Normal #74 | `2a5574c` | Validate [41864124241](https://github.com/Reekyi/UpStatus/actions/runs/41864124241) | **AUTOMATED PASS** |
| Normal #74 | `2a5574c` | Signaling Smoke [41864124208](https://github.com/Reekyi/UpStatus/actions/runs/41864124208) | **BLOCKED/FAIL** |
| Team Lite #76 | `3cf0801` | Candidate Checks [41863688477](https://github.com/Reekyi/UpStatus/actions/runs/41863688477) | **AUTOMATED PASS** |
| QA docs #82 | `ba5c1ee` | Validate [41942062168](https://github.com/Reekyi/UpStatus/actions/runs/41942062168) | **BLOCKED by base validator** |

- Normal job `126694475658` failed at step 3, `Syntax-check signaling test harnesses`, with the stale assertion `rate-limit buckets must remain bounded without evicting active counters`. Steps 4-7 (unauthenticated endpoint, authenticated/browser integration, rate-limit concurrency, and receipt concurrency) were skipped. This remains a static test-contract mismatch with the isolated endpoint's Postgres RPC implementation; it is not evidence that the RPC failed at runtime.
- Team Lite job `126692567137` completed all steps successfully. Logs explicitly show 14/14 unauthenticated checks, 86/86 authenticated checks, Chromium call/voice/screen remote tracks, three-member mesh and teardown, endpoint rate limit (90 accepted, 1 HTTP 429), rate-limit concurrency/reset, receipt concurrency, and candidate/updater checks. The log echoes the conditional command containing the word `SKIP`, but the later pass output confirms that the skip branch was not taken in this run.
- QA documentation Validate job `126965078886` failed at `scripts/validate.mjs:26` with `production updateURL mismatch`. PR #82 still changes only Markdown; no runtime change was made to resolve or bypass this baseline assertion.

### Confirmed deployed and candidate public chat_fast path

The deployed Edge Function source was read and its embedded userscript was decoded locally in the inspection runtime:

- Production Normal `upstatus` is ACTIVE Edge Function version 480, internal userscript 3.4.7. Its embedded script sends `sendRealtimeEvent('chat_fast', {message: created})` after message creation and `sendRealtimeEvent('chat_fast', {message: r.message})` after attachment creation. Its deployed handler reads `payload.message`.
- Production Team Lite `upstatus-team-lite` is ACTIVE Edge Function version 15, internal userscript 3.4.30. It has the same two full-message send paths and a deployed handler that reads `payload.message`.
- The current Normal candidate `src/userscript/upstatus.user.template.js` still sends the full object at lines 3145 and 3187. The current Team Lite candidate `team-lite/upstatus-team-lite.user.js` still sends it at lines 3598 and 3640.
- Candidate receivers now ignore the broadcast-supplied message and refresh through the authenticated API. This is useful receiver-side minimization, but it does not stop the sender from publishing the full message object.
- Both inspected clients create the shared Realtime channel without a private-channel option. The public `chat_fast` sender therefore remains present in both deployed products and both candidates.
- Migration `20261103160000_minimize_public_chat_broadcast.sql` changes the database trigger payload only. It does not remove the client-originated `chat_fast` sender. Applying that trigger migration alone would not close RT-01.
- The candidates also retain public `call_signal` fallback while authenticated signaling remains opt-in/default-off. RT-01 remains **BLOCKED** until client-originated message broadcasts and the legacy public signaling path are replaced or secured and validated end-to-end.

This confirms two independent message-content broadcast paths: database-trigger `db_change` and client-originated `chat_fast`. Treating broadcasts as untrusted hints on the receiving side is not equivalent to preventing publication.

### Test-harness safety and CI fail-open

- `scripts/test-signal-rate-limit.mjs` and `scripts/test-chat-read-receipts.mjs` are identical in the Normal and Team Lite branches.
- Both print `SKIP` and exit 0 when `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing.
- Neither validates that the supplied URL is the isolated project `bfpjtfqlnypisxljoxkb`; neither requires an explicit mutation opt-in.
- With credentials present, the rate-limit script deletes its fixture bucket row, and the receipt script deletes its `chat_reads` fixture row in `finally`. A local invocation with production environment variables could therefore mutate production fixtures.
- In contrast, `scripts/run-signaling-authenticated.mjs` checks the exact isolated project origin and requires `UPSTATUS_SIGNAL_ALLOW_MUTATION=1`.
- Both workflows also allow the authenticated step to print `SKIP` and exit 0 if the isolated secret is absent. The current Team Lite run is still a valid automated pass because its logs show the tests executed; future required release gates must fail closed when a secret or test is missing.

Required follow-up: add the isolated-project allowlist and explicit mutation opt-in to both fixture scripts, and make authenticated/rate-limit/receipt gates mandatory in release CI. Do not run these fixture-mutating scripts against production.

### Production Supabase catalog and advisors — read-only

- Project `dlfvkawaiqduhlazsszm` remains `ACTIVE_HEALTHY`, Postgres 17.11.0.002, with seven migrations through `20261027155438`.
- Read-only `to_regclass`/`to_regprocedure` checks confirm production still lacks `public.upstatus_signal_rate_limits`, `public.consume_upstatus_signal_rate_limit(text, integer, integer)`, and `public.merge_chat_read_receipts(text, jsonb, timestamptz)`.
- The production message trigger remains AFTER INSERT/UPDATE/DELETE and publishes the complete OLD/NEW row through `realtime.send(..., false)`. The remote-state and user-status triggers also publish metadata with `private=false`.
- The three trigger functions remain `SECURITY DEFINER`, `search_path=public`, with EXECUTE for `anon` and `authenticated` (as well as internal roles).
- Nine backend-owned public tables remain RLS-enabled with zero policies and broad client ACLs. The current catalog query grouped the ACLs and confirmed anon/authenticated have DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, and UPDATE on each of those relations.
- The `realtime.messages` partitioned parent remains RLS-enabled with zero policies and anon/authenticated INSERT, SELECT, and UPDATE grants. These ACLs are unnecessary privilege surface; the catalog alone does not establish direct row access through RLS.
- Security Advisor observed two WARN categories for the three SECURITY DEFINER functions and ten INFO findings for RLS-enabled relations without policies. Performance Advisor returned no findings.

### Edge Function inventory refinement

- The production inventory still contains 38/38 ACTIVE Edge Functions, all reporting `verify_jwt=false`.
- The three main deployed functions were re-read. Their backend source checks `x-upstatus-token`, hashes the token, and looks up `upstatus_sessions`; the two core product functions retain a 30-second session-cache revalidation window, versus five seconds in the candidates.
- A sample of seven additional active test/beta/backup endpoints (`upstatus-test`, `upstatus-test-beta11`, `upstatus-test-3-0-51-beta1`, `upstatus-test-3-0-52-beta6`, `upstatus-screen-share-3-1-1-beta1`, `upstatus-screen-share-3-1-1-beta9`, and `upstatus-backup-325`) showed the same custom token/hash/session-table pattern and 30-second cache. One additional backup endpoint (`upstatus-test-backup-032`) returned no readable index source in the connector response.
- This is source sampling, not a completed route-by-route authentication/ownership/consumer inventory for all 38 functions. Do not disable old test/backup/beta endpoints without confirming consumers and rollback requirements. `verify_jwt=false` alone is not proof that a route lacks application authentication.

### Current integration and manual gates

- Both candidate server templates use `SESSION_CACHE_TTL_MS=5000` and call `merge_chat_read_receipts` from the read route.
- Neither product template calls `consume_upstatus_signal_rate_limit`; the distributed limiter remains isolated-test-only. RT-09 is **PARTIAL**.
- The two test-suffixed DDL files remain under `supabase/migrations/` in #74 and #76. The suffix does not exclude timestamped files from normal Supabase CLI migration discovery. Separate/review them before any database migration workflow.
- Issue #78 remains **MANUAL PENDING**: no-F5 internet interruption/recovery, voice-room re-entry, new calls, repeated drops, real microphone/display capture, Tampermonkey, and Normal ↔ Team Lite cross-client acceptance have not been recorded.
- The deployed/candidate Realtime path, Normal exact-head smoke, product rate-limit integration, migration packaging, production privilege hardening, and complete Edge Function inventory remain release gates. No completion percentage is reported.

### Safety record

This pass used GitHub read APIs, existing workflow job logs, source reads, Supabase metadata/advisors, Edge Function source reads, and read-only PostgreSQL catalog queries. No tests or workflows were rerun because the isolated fixture project is shared. No production SQL write, migration, Edge Function deployment, secret/flag change, userscript publication, PR merge, destructive operation, or engineering/handoff branch edit was performed. The only repository write is this documentation append on the isolated QA branch, using the freshly fetched file blob SHA as the update precondition.


## Revalidation 2026-11-04 BRT — exact-head CI, workflow controls and production catalog

This pass re-read the readiness document before inspecting current PR metadata, exact-head workflow runs/logs, changed-file comparisons, candidate workflows and scripts, deployed Edge Function sources, Supabase migrations/catalog/advisors, and issue discussions. It corrects several stale snapshots in the preceding sections. All Supabase SQL remained read-only.

### Exact GitHub refs and evidence precedence

| Workstream | Current PR head | Latest inspected exact-head evidence | Classification |
|---|---|---|---|
| Normal #74 | `2a5574c0bae1be608dd9e6d9ce091c6c0768e35a` | Validate [41864124241](https://github.com/Reekyi/UpStatus/actions/runs/41864124241) success; Smoke [41864124208](https://github.com/Reekyi/UpStatus/actions/runs/41864124208) failure | Validate AUTOMATED PASS; Smoke BLOCKED before runtime tests |
| Team Lite baseline #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) success | Historical AUTOMATED PASS; superseded by #76 |
| Team Lite #76 | `3cf080156ae15c0defd2a981eb3b2221edf0d208` | Candidate Checks [41863688477](https://github.com/Reekyi/UpStatus/actions/runs/41863688477) success | AUTOMATED PASS on exact head |
| Handoff #80 | `33aefd3bb80b5b6229730e104b946d4faf57aa36` | Open/Draft; unchanged | Preserved |
| QA documentation #82 | `0eca23298a4cf1b861efee78cccfaa0904107409` | Validate [41949243872](https://github.com/Reekyi/UpStatus/actions/runs/41949243872) failure | Documentation-only PR; base validator failure |

All five PRs remain open and Draft, and none is merged. #76 is 92 commits ahead and zero behind #75; it is a continuation of the Team Lite baseline, not an independent sibling candidate.

The PR bodies and issue #79 body contain older CI snapshots. Prefer current PR metadata, the exact commit associated with a workflow run, and the job log over historical prose. In particular, an earlier issue comment says the Normal run 41864124208 should not be treated as current. The current PR metadata still identifies #74 head 2a5574c, and the run log checks out a synthetic merge containing that head. The run is therefore relevant to the current PR head, although its failure occurs before endpoint/runtime checks.

### Normal #74 — exact-head smoke and stale historical pass

- Job 126694475658 in run 41864124208 failed at step 3, “Syntax-check signaling test harnesses”.
- The assertion at scripts/signaling-static.test.mjs:154 still requires the old in-memory rate-map pattern. The isolated endpoint now uses the Postgres RPC consume_upstatus_signal_rate_limit.
- Steps 4–7 were skipped: unauthenticated endpoint checks, authenticated/browser integration, distributed rate-limit concurrency, and atomic receipt concurrency.
- This confirms a stale test-contract assertion. It does not establish that the database RPC failed at runtime.

A prior complete smoke pass, run 41853971486, was on commit fb1417ab69a16b0bf30611df5584e8d0d3466076. The current head is not merely four workflow/docs commits beyond that successful runtime test: compare_commits reports 25 commits from fb1417 to 2a5574, with changes including the Normal server template, isolated endpoint, test harnesses, migrations, workflow, and release/security documentation. The latest successful smoke therefore does not cover all current candidate changes. The current exact-head smoke is BLOCKED before those changed runtime components are exercised.

The current head commit 2a5574 itself changes only docs/REALTIME_SECURITY_TEST_MATRIX.md. That fact does not erase the runtime changes accumulated between the earlier passing smoke and the current head.

### Team Lite #76 — exact-head automated result

Job 126692567137 in run 41863688477 completed all steps successfully. The log confirms:
- 14/14 unauthenticated endpoint checks;
- 86/86 authenticated integration checks;
- Chromium call/voice/screen WebRTC, remote tracks, three-member mesh and teardown;
- endpoint rate limit: 90 accepted and one HTTP 429;
- distributed rate-limit concurrency and fixed-window reset;
- atomic chat-receipt concurrency;
- Team Lite candidate/version, portal and updater checks.

The log echoes the conditional shell command containing the word SKIP, but the step continued through the authenticated tests and printed the 86/86 result. The skip branch was not taken in this run. This is an AUTOMATED PASS on the isolated project, not physical Tampermonkey/device acceptance.

The current #76 head commit changes scripts/run-signaling-authenticated.mjs. The file comparison confirms the isolated project origin allowlist and cleanup-by-fixture-identity logic. #76 remains 92 commits ahead of #75 and zero behind.

### Workflow review and test-harness safety

**Normal signaling workflow**
- .github/workflows/signaling-smoke.yml has pull_request targeting master and workflow_dispatch; it does not declare a push trigger even though a comment refers to push and pull_request runs.
- It serializes fixture-mutating suites in the shared upstatus-signaling-isolated-tests concurrency group.
- It uses actions/checkout@v4 without a pinned SHA or persist-credentials: false.
- If UPSTATUS_SIGNAL_TEST_SERVICE_ROLE_KEY is missing, the authenticated step prints SKIP and exits 0.
- The static test itself asserts that this skip message exists, so the current workflow explicitly permits an absent authenticated secret.

**Team Lite workflow**
- .github/workflows/team-lite-candidate.yml pins checkout to a commit SHA and sets persist-credentials: false.
- It uses the same global isolated-test concurrency group.
- It also prints SKIP and exits 0 when the isolated service-role secret is absent.

**Fixture-mutating scripts**
- scripts/test-signal-rate-limit.mjs and scripts/test-chat-read-receipts.mjs are byte-identical in both candidate branches.
- Both exit 0 when SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.
- Neither validates the expected isolated project origin nor requires an operator mutation opt-in.
- With credentials, the rate-limit script calls the RPC and deletes its bucket fixture. The receipt script writes/reads a chat_reads fixture and deletes it in cleanup.
- A local invocation with production environment variables could therefore mutate production fixtures. These scripts were not executed during this audit.

Precision correction to the previous documentation: scripts/run-signaling-authenticated.mjs checks the exact isolated origin https://bfpjtfqlnypisxljoxkb.supabase.co and requires a service-role key. It injects UPSTATUS_SIGNAL_ALLOW_MUTATION=1 into the child test process; it does not require a separate operator-supplied opt-in at the wrapper level. The two RPC fixture scripts above have neither the origin guard nor that explicit child guard.

Required changes before these scripts are used locally or treated as release gates: add the exact isolated-project allowlist and an explicit mutation opt-in to both RPC fixture scripts; make required authenticated, rate-limit, and receipt CI steps fail closed when credentials are absent; and remove the static assertion that institutionalizes a successful SKIP.

### Production workflow guard review

The master workflow .github/workflows/deploy-production.yml is manual (workflow_dispatch), uses the production GitHub Environment, pins checkout and the Supabase setup action, checks stable release version 3.4.7, validates the build, and deploys only the upstatus Edge Function. It does not apply migrations.

The workflow YAML does not itself enforce an approved branch/ref allowlist or assert that SUPABASE_PROJECT_ID equals the expected production project. External GitHub Environment protection rules and secret restrictions were not inspected. The Supabase CLI version is set to latest rather than a fixed version, which weakens reproducibility. Treat these as workflow-hardening review items; no deployment was attempted.

The master validate.yml has no paths-ignore, so the documentation-only PR #82 still invokes the full validator. Run 41949243872 failed at scripts/validate.mjs:26 with “production updateURL mismatch” after reporting the build as UpStatus 3.4.7 / TEST 3.4.7. PR #82 changes only docs/RELEASE_READINESS.md, so this failure is in code inherited unchanged from master, not a runtime change introduced by the QA PR. No validator assertion or production URL was modified to bypass it.

### Candidate integration and migration packaging

- Normal and Team Lite server templates both set SESSION_CACHE_TTL_MS to 5000 and call merge_chat_read_receipts from their read routes.
- Neither product-facing server template calls consume_upstatus_signal_rate_limit. The limiter remains wired only to the isolated test endpoint; RT-09 is PARTIAL.
- The isolated receipt migration creates merge_chat_read_receipts as SECURITY INVOKER with an empty search_path and grants EXECUTE only to service_role.
- The isolated rate-limit migration creates upstatus_signal_rate_limits and consume_upstatus_signal_rate_limit as SECURITY INVOKER with an empty search_path and service_role-only EXECUTE.
- Both timestamped files remain under supabase/migrations/ with a _test suffix in #74 and #76. They contain real DDL; the suffix does not exclude timestamped files from normal Supabase CLI migration discovery. Separate/review them before any database migration workflow.
- Production still lacks the rate-limit table/RPC and atomic receipt RPC. No migration was applied.

### Production Supabase catalog — current read-only check

Project dlfvkawaiqduhlazsszm reports ACTIVE_HEALTHY on Postgres 17.11.0.002. The migration history still contains seven versions through 20261027155438.

The catalog confirms:
- public.upstatus_signal_rate_limits is absent;
- public.consume_upstatus_signal_rate_limit(text, integer, integer) is absent;
- public.merge_chat_read_receipts(text, jsonb, timestamptz) is absent;
- the production messages trigger remains attached and invokes upstatus_broadcast_messages.

Privilege checks using has_table_privilege and pg_policies confirm nine backend-owned public tables — chat_reads, messages, reactions, status_history, upstatus_profiles, upstatus_sessions, upstatus_state, upstatus_typing, and users — have RLS enabled, zero policies, and effective anon/authenticated SELECT, INSERT, UPDATE, and DELETE privileges. This is unnecessary ACL surface; zero policies means this catalog evidence does not prove direct row access.

The public upstatus_visual_config table has RLS enabled, zero policies, and no anon/authenticated SELECT/INSERT/UPDATE/DELETE privileges. The realtime.messages parent is partitioned (relkind p), has RLS enabled and zero policies, and has anon/authenticated SELECT, INSERT, and UPDATE privileges; DELETE is false for both roles.

The three trigger functions upstatus_broadcast_messages(), upstatus_broadcast_remote_state(), and upstatus_broadcast_users() remain SECURITY DEFINER with search_path=public. has_function_privilege confirms EXECUTE for anon, authenticated, and service_role. Security Advisor observed two WARN categories, three functions each (anon and authenticated EXECUTE), and ten INFO RLS-enabled/no-policy findings. Performance Advisor returned no findings.

### Deployed Edge Functions and Realtime message path

The production inventory remains 38/38 ACTIVE Edge Functions, all reporting verify_jwt=false. This is a gateway configuration observation, not proof that every route lacks application authentication. Source inspection of the three principal runtime functions confirms custom x-upstatus-token handling, token hashing, and lookup in upstatus_sessions. A complete route-by-route auth/ownership/consumer inventory for all 38 functions remains NOT VERIFIED.

Current deployed functions:
- upstatus: Edge Function version 480, internal userscript 3.4.7;
- upstatus-team-lite: Edge Function version 15, internal userscript 3.4.30;
- upstatus-screen-share-3-1-1-beta10: Edge Function version 6, internal version 3.1.1-beta8.

All three inspected deployed backend sources use a 30,000 ms session-cache revalidation bound. Candidate Normal and Team Lite templates use 5,000 ms; the candidate change is not deployed.

The public chat disclosure remains confirmed by both database and client code inspection:
- The production database trigger serializes the full OLD/NEW message row and sends db_change with private=false.
- The embedded production Normal 3.4.7 and Team Lite 3.4.30 userscripts both send chat_fast with the full message object after message creation and attachment creation. Their deployed handlers read payload.message.
- Current candidate Normal and Team Lite userscripts still send the full message object in chat_fast. Their receivers now ignore the supplied row and refresh via authenticated API, but receiver-side minimization does not prevent the sender from publishing the object.
- Both deployed and candidate clients create the shared Realtime channel without private:true.
- Candidate call_signal still has a public Realtime fallback while authenticated signaling is disabled by default/opt-in.

Thus there are at least two separate message-content paths: database-trigger db_change and client-originated chat_fast. The trigger-minimization migration only changes the first path. RT-01 remains BLOCKED until both message paths and the legacy public signaling architecture are replaced or secured and validated end-to-end.

This is code/catalog inspection, not an external subscriber test. No attempt was made to subscribe as an unauthorized party or retrieve another user's messages.

### Issues and manual acceptance

- Issue #78 remains OPEN with three comments. Its acceptance checklist is still unchecked for real no-F5 recovery in Normal and Team Lite, voice-room re-entry, new calls, repeated drops, bidirectional audio, unaffected participants, and absence of orphan peers/pollers.
- Issue #79 remains OPEN with 36 comments. Its body still contains the 2026-11-03 CI table and old candidate heads. The current PR metadata and exact-head workflow evidence above supersede that body snapshot. The latest comment concerns automation state, not completion of the release acceptance gates.
- Manual Tampermonkey, real microphone/display capture, and Normal ↔ Team Lite cross-client acceptance remain MANUAL PENDING.

### Safety record

This pass used GitHub read APIs, exact workflow job logs, source reads and commit comparisons, Supabase function/migration metadata, advisors, and read-only catalog SQL. No shared-project tests were rerun because Normal and Team Lite share isolated fixtures. No production SQL write, migration, Edge Function deployment, secret/flag change, userscript publication, PR merge, destructive operation, or engineering/handoff branch edit was performed. The only repository write is this documentation append on the isolated QA branch, guarded by the freshly fetched blob SHA. No completion percentage is reported.


## Revalidation 2026-11-05 BRT — latest exact refs, CI logs and production catalog

This pass began by reading this file from the QA branch. The default `master` branch still does not contain `docs/RELEASE_READINESS.md`; the continuity document remains in PR #82. The branch head and file blob were rechecked immediately before this append. No engineering branch or PR #80 handoff file was changed.

### Exact GitHub state

| Workstream | Current head | Current state | Evidence |
|---|---|---|---|
| Normal #74 | `2a5574c0bae1be608dd9e6d9ce091c6c0768e35a` | Open, Draft | [PR #74](https://github.com/Reekyi/UpStatus/pull/74) |
| Team Lite baseline #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Open, Draft; historical baseline | [PR #75](https://github.com/Reekyi/UpStatus/pull/75) |
| Team Lite #76 | `3cf080156ae15c0defd2a981eb3b2221edf0d208` | Open, Draft | [PR #76](https://github.com/Reekyi/UpStatus/pull/76) |
| Handoff #80 | `33aefd3bb80b5b6229730e104b946d4faf57aa36` | Open, Draft; preserved | [PR #80](https://github.com/Reekyi/UpStatus/pull/80) |
| QA documentation #82 | `18cf5fe0953f5ca60188247443dbfe8926981fcb` | Open, Draft; one Markdown file | [PR #82](https://github.com/Reekyi/UpStatus/pull/82) |

The branch API confirms #82 head `18cf5fe`, parent `0eca232`, and this file's pre-update blob SHA `6b8f341`. No newer engineering commits were found on #74, #75 or #76. #76 remains exactly 92 commits ahead and zero behind #75; treat it as the continuation of the baseline, not an independent sibling PR.

### Exact-head CI recheck

- Normal #74: [Validate 41864124241](https://github.com/Reekyi/UpStatus/actions/runs/41864124241) is **AUTOMATED PASS**. [Signaling Smoke 41864124208](https://github.com/Reekyi/UpStatus/actions/runs/41864124208) is **BLOCKED/FAIL**. Its job log confirms the assertion failure `rate-limit buckets must remain bounded without evicting active counters` in the static harness. The later endpoint/authenticated/browser, rate-limit concurrency and receipt-concurrency steps did not run.
- Team Lite #76: [Candidate Checks 41863688477](https://github.com/Reekyi/UpStatus/actions/runs/41863688477) is **AUTOMATED PASS** on the exact head. The log confirms 14/14 unauthenticated checks, 86/86 authenticated checks, Chromium WebRTC call/voice/screen, three-member mesh and teardown, 90 accepted plus one HTTP 429, distributed limiter concurrency/reset, and atomic receipt concurrency. The log echoes a conditional shell command containing `SKIP`, but the skip branch was not taken in this run; the 86/86 and subsequent results prove the tests executed.
- The last complete Normal smoke, [41853971486](https://github.com/Reekyi/UpStatus/actions/runs/41853971486), is on `fb1417a`, 25 commits behind the current #74 head. The comparison includes changes to the Normal server template, isolated endpoint, test harnesses, migrations and workflow. It is not an exact-head approval.
- QA #82: [Validate 41956460635](https://github.com/Reekyi/UpStatus/actions/runs/41956460635) failed at `scripts/validate.mjs` with `production updateURL mismatch`. This PR changes only `docs/RELEASE_READINESS.md`; the runtime assertion is inherited from `master`. No assertion or production URL was changed to bypass it.

### Reconfirmed client-originated chat broadcast

The embedded userscripts in production Edge Functions `upstatus` (Edge version 480, internal 3.4.7), `upstatus-team-lite` (version 15, internal 3.4.30), and legacy Normal `upstatus-screen-share-3-1-1-beta10` (version 6, internal 3.1.1-beta8) were decoded and inspected. All three contain two sender call sites publishing `chat_fast` with `{message: created}` and `{message: r.message}`; their receivers consume `payload.message`. None of the inspected scripts configures `private: true`.

The current candidate source confirms this is not only a production artifact:
- Normal candidate `src/userscript/upstatus.user.template.js`: sender call sites at lines 3145 and 3187 still publish the complete message object; its receiver no longer consumes the supplied payload and instead refreshes.
- Team Lite candidate `team-lite/upstatus-team-lite.user.js`: sender call sites at lines 3598 and 3640 still publish the complete message object; its receiver no longer consumes the supplied payload and instead refreshes.

The production database function `upstatus_broadcast_messages()` was re-read with `pg_get_functiondef`: it serializes OLD on DELETE and NEW otherwise, then calls `realtime.send` for `db_change` with `private=false`. The remote-state function sends command/result metadata with `private=false`; the user-status function sends name/status/reason/update/sync metadata with `private=false`.

These are separate paths: database-trigger `db_change` and client-originated `chat_fast`. The candidate receiver change does not stop the sender from publishing the object, and the trigger-minimization migration affects only `db_change`. RT-01 remains **BLOCKED**. This is source/catalog inspection; no unauthorized external subscriber test was attempted.

### Production Supabase snapshot — read-only

Project `dlfvkawaiqduhlazsszm` remains `ACTIVE_HEALTHY`, Postgres `17.11.0.002`, with seven migrations through `20261027155438`.

Read-only catalog checks confirm:
- `upstatus_signal_rate_limits`, `consume_upstatus_signal_rate_limit(text, integer, integer)`, and `merge_chat_read_receipts(text, jsonb, timestamptz)` are still absent.
- The three broadcast functions remain `SECURITY DEFINER`, configured with `search_path=public`, and executable by `anon`, `authenticated`, and `service_role`.
- The active `messages` trigger fires after INSERT/UPDATE/DELETE. The remote-state and user-status triggers are also enabled.
- Nine backend-owned public tables remain RLS-enabled with zero policies and client grants including SELECT, INSERT, UPDATE, DELETE, TRIGGER, TRUNCATE and REFERENCES. This is unnecessary ACL surface; zero policies means these catalog results do not prove direct row access.
- `public.upstatus_visual_config` has no anon/authenticated table privileges in the checked ACL set.
- The partitioned parent `realtime.messages` has RLS enabled, zero policies, and anon/authenticated SELECT, INSERT and UPDATE grants; DELETE is not granted.
- Security Advisor still reports three anon-executable and three authenticated-executable SECURITY DEFINER findings (two WARN categories), plus ten RLS-without-policy INFO findings. Performance Advisor returned no findings.
- All 38 Edge Functions are ACTIVE and report `verify_jwt=false`. This is a gateway setting, not proof that every route lacks application authentication. The core functions inspected use the custom UpStatus token flow; a full route-by-route inventory remains NOT VERIFIED. Do not disable legacy/test/backup endpoints without confirming consumers and rollback.

### Workflow and fixture-script controls

The candidate workflows and scripts were re-read:
- Normal `.github/workflows/signaling-smoke.yml` uses `actions/checkout@v4` without a pinned SHA or `persist-credentials: false`; it declares `pull_request` and `workflow_dispatch`, not `push` despite a nearby comment.
- Team Lite pins checkout by SHA and sets `persist-credentials: false`.
- Both workflows can print `SKIP` and exit successfully when the isolated service-role secret is absent. The current Team Lite exact-head run did execute its tests, but future runs can be false-green if the secret is absent.
- `scripts/test-signal-rate-limit.mjs` and `scripts/test-chat-read-receipts.mjs` both exit 0 when credentials are missing. Neither validates the exact isolated project origin nor requires a separate operator mutation opt-in; with service-role credentials they create/use fixtures and perform cleanup DELETEs. They were not executed. Add the isolated-project allowlist and explicit opt-in before local use.
- `master` `.github/workflows/validate.yml` includes push and pull_request triggers. `deploy-production.yml` is manual and deploys only `upstatus`; it does not apply migrations. The YAML uses Supabase CLI `latest` and does not itself show an approved-ref allowlist or explicit expected-project-ID assertion. External GitHub Environment protection rules were not inspected.

### Issues and acceptance state

- Issue #78 remains OPEN with three comments; its no-F5 reconnect, voice-room re-entry, post-reconnect calls, repeated-drop, bidirectional-audio, unaffected-peer and manual-browser criteria remain unchecked.
- Issue #79 remains OPEN with 36 comments and still contains the 2026-11-03 CI table/old heads in its body. Prefer exact PR metadata and exact-head run logs over that historical table. The latest comment observed discusses the engineering automation state, not closure of the release gates.
- Real Tampermonkey, microphone/display capture and Normal ↔ Team Lite cross-client acceptance remain **MANUAL PENDING**.

### Safety record

This revalidation used GitHub read APIs, exact-head workflow logs, source reads, commit comparisons, Supabase metadata/advisors, and read-only PostgreSQL catalog/function-definition queries. No tests or workflows were rerun because Normal and Team Lite share the isolated fixture project. No production write, migration, deploy, Edge Function change, secret/flag change, userscript publication, merge, destructive operation, or engineering/handoff branch edit was performed. The only repository write is this documentation append on the isolated QA branch, guarded by the freshly fetched file blob SHA. No completion percentage is reported.


### Addendum — QA documentation CI for the 2026-11-05 revalidation

After the documentation commit `863c62e0f4880060939fad2f47782447bf9fe307`, GitHub started Validate run [41962502185](https://github.com/Reekyi/UpStatus/actions/runs/41962502185) on the exact new PR #82 head. The job completed with failure at `scripts/validate.mjs`, reporting `VALIDATION FAILED: production updateURL mismatch`. The PR still changes only `docs/RELEASE_READINESS.md`; this is the same inherited `master` baseline assertion, not a runtime change from the QA append. Keep the PR Draft and do not bypass the assertion without reconciling the expected production update URL with the release artifact.


### Addendum — scope boundary of automated signaling tests

A final source comparison of the Normal and Team Lite test harnesses confirms that `scripts/test-signaling-browser.mjs` in both branches targets the isolated `/functions/v1/upstatus-signal-test` endpoint. The authenticated harness contains an explicit comment that its result does not claim the product userscript has migrated to that endpoint. The browser test exercises the isolated endpoint's polling/ack flow; it does not instantiate the installed Normal userscript against the Team Lite product runtime or vice versa.

Therefore the Team Lite 86/86 result and the isolated Chromium WebRTC checks are valid candidate-endpoint automation, but they are **not** proof of a full Normal ↔ Team Lite product-client interoperability matrix or of the userscript cutover. Cross-client product acceptance remains **MANUAL PENDING**, and a product-level automated integration test should be added after the transport architecture is selected.

The documentation commit `1c86d279c28f804ba26edb3a4b617877734c2b10` triggered Validate run [41962548517](https://github.com/Reekyi/UpStatus/actions/runs/41962548517), which was still queued at the time of this addendum. No result is claimed for that run here.


### Addendum — completion of the preceding documentation validation

The previously queued Validate run [41962548517](https://github.com/Reekyi/UpStatus/actions/runs/41962548517) has now completed with failure at `scripts/validate.mjs`, again reporting `production updateURL mismatch`. The run was associated with documentation-only commit `1c86d279`; no runtime path changed in that commit. A new Validate run [41962597104](https://github.com/Reekyi/UpStatus/actions/runs/41962597104) was queued for the latest documentation head `e6c34b990e15e96a21a9afb9d94819bb2a48c80e` and had no result at the time of this note. Do not claim a passing validation for the current QA head.


## Revalidation 2026-11-05 01:30 BRT — exact-head reconciliation and production recheck

This pass re-read this document first, then re-fetched PR metadata, branch comparisons, current workflow job logs, candidate sources, production Edge Function source, migration history, advisors, and read-only PostgreSQL catalogs. No engineering branch, PR #80 handoff, or production resource was changed.

### Exact GitHub refs and stale PR-body correction

| Workstream | Current PR metadata head | Exact-head evidence | Classification |
|---|---|---|---|
| Normal #74 | `2a5574c0bae1be608dd9e6d9ce091c6c0768e35a` | Validate [41864124241](https://github.com/Reekyi/UpStatus/actions/runs/41864124241) passed; Smoke [41864124208](https://github.com/Reekyi/UpStatus/actions/runs/41864124208) failed | **BLOCKED** |
| Team Lite baseline #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | Historical **AUTOMATED PASS** |
| Team Lite #76 | `3cf080156ae15c0defd2a981eb3b2221edf0d208` | Candidate Checks [41863688477](https://github.com/Reekyi/UpStatus/actions/runs/41863688477) | **AUTOMATED PASS** |
| QA documentation #82 | `1dad4203ba5658c3c25e12825d3baee00032adc5` before this append | Validate [41962627663](https://github.com/Reekyi/UpStatus/actions/runs/41962627663) failed at the inherited production URL assertion | **BLOCKED BY BASELINE** |

PR #74's description still calls `974afa23be3f66b5d20ee5e9391c2c69a958e249` its current head. GitHub PR metadata and the branch ref instead identify `2a5574c` as the current head. A direct compare shows the branch is **70 commits ahead** of `974afa`. The successful Normal smoke [41692984911](https://github.com/Reekyi/UpStatus/actions/runs/41692984911) belongs to that older ancestor, not the current head. Its job contained the static, unauthenticated endpoint, and authenticated/browser stages, but did not contain the later distributed rate-limit concurrency or atomic receipt-concurrency steps. Do not cite that run as current-head approval or as evidence for those later gates.

On exact current Normal head `2a5574c`, Validate passed but Smoke failed at step 3, `scripts/signaling-static.test.mjs`, with `rate-limit buckets must remain bounded without evicting active counters`. The assertion still expects the old in-memory map pattern; the isolated endpoint now calls the Postgres RPC. Steps 4–7 (unauthenticated endpoint, authenticated/browser, distributed rate-limit concurrency, atomic receipt concurrency) were skipped after the failure. This remains a confirmed test-contract mismatch, not a runtime failure of the RPC. Normal exact-head endpoint and integration gates are **NOT VERIFIED**.

Team Lite #76's exact-head job log confirms every configured stage ran and passed: 14/14 unauthenticated checks, 86/86 authenticated checks, Chromium call/voice/screen WebRTC, three-member mesh and teardown, 90 accepted plus one HTTP 429, distributed limiter concurrency/reset, atomic receipt concurrency, candidate version/updater/portal checks. This is isolated candidate automation, not physical Tampermonkey acceptance. #76 is 92 commits ahead and zero behind #75; it carries the #75 baseline forward and should not be merged as an independent sibling.

### Current candidate-source integration

- Normal and Team Lite server templates both set `SESSION_CACHE_TTL_MS=5000` and call `merge_chat_read_receipts` from the read route.
- Neither product server template calls `consume_upstatus_signal_rate_limit`. The distributed limiter remains implemented/tested in the isolated endpoint only; RT-09 remains **PARTIAL**.
- The isolated HTTP 429 response still has no `Retry-After` header. Decide and assert the retry contract.
- Both current candidate userscripts still send `chat_fast` with the full message object at the message-create and attachment-create call sites. Their receivers now ignore the broadcast-supplied row and refresh from the authenticated API. Receiver-side refresh does not remove the sender-side payload.
- Both candidate channels are created without `private: true`; the authenticated transport remains opt-in/default-off, leaving legacy public signaling fallback in place.
- The two timestamped `*_test.sql` files remain under `supabase/migrations/` in both candidate PRs. They contain real DDL; the suffix does not exclude them from timestamp-based migration discovery. Keep them out of any production migration run and replace them with separately reviewed production migrations.

### Production Supabase recheck — read-only

Project `dlfvkawaiqduhlazsszm` responded on Postgres 17.11. Production migration history remains seven entries through `20261027155438`. The following remain absent:
- `public.upstatus_signal_rate_limits`
- `public.consume_upstatus_signal_rate_limit(text, integer, integer)`
- `public.merge_chat_read_receipts(text, jsonb, timestamptz)`

The catalog still shows:
- Three broadcast trigger functions are `SECURITY DEFINER`, configured with `search_path=public`, and EXECUTE is effective for `anon`, `authenticated`, and `service_role`.
- The message trigger fires after INSERT/UPDATE/DELETE and serializes the complete OLD/NEW row to `db_change` using `private=false`.
- Remote-state and user-status triggers also emit metadata with `private=false`.
- Nine backend-owned public tables remain RLS-enabled with zero policies and broad anon/authenticated table grants. `upstatus_visual_config` has RLS/no policy but no anon/authenticated table grants.
- The partitioned `realtime.messages` parent remains RLS-enabled with zero policies and anon/authenticated SELECT/INSERT/UPDATE grants.
- Security Advisor observed two WARN categories covering the same three SECURITY DEFINER functions (anon EXECUTE and authenticated EXECUTE), plus ten INFO RLS-without-policy findings. Performance Advisor returned no findings.

### Deployed Edge Functions and public Realtime paths

The production inventory contains **38/38 ACTIVE** Edge Functions; all report `verify_jwt=false`. This is a gateway configuration fact, not proof that every route lacks application authentication. The three principal deployed sources inspected validate the custom UpStatus session token, but a route-by-route authentication/owner/consumer inventory for all 38 remains **NOT VERIFIED**. Do not disable old test/beta/backup endpoints without confirming consumers and rollback.

Deployed versions remain:
- `upstatus`: Edge version 480, embedded userscript 3.4.7.
- `upstatus-team-lite`: Edge version 15, embedded userscript 3.4.30.
- `upstatus-screen-share-3-1-1-beta10`: Edge version 6, embedded userscript 3.1.1-beta8.

The deployed sources still use a 30-second session-cache revalidation bound; candidate templates use five seconds. The production endpoints do not call the candidate receipt or rate-limit RPCs.

The embedded userscripts were decoded and checked again. All three deployed clients still publish `chat_fast` with the full message object and consume `payload.message` in the receiver. The current Normal and Team Lite candidates still publish the full object, although their receivers now treat the event as a refresh hint. The database `db_change` trigger is a separate path. RT-01 remains **BLOCKED** until both message paths and the public legacy signaling design are replaced or secured and validated end-to-end. This is code/catalog inspection; no external subscriber test was attempted.

### Workflows, fixture safety, issues, and manual gates

- Normal `signaling-smoke.yml` uses `actions/checkout@v4` without a pinned SHA or `persist-credentials: false`; Team Lite pins checkout by SHA and disables credential persistence.
- Both candidate workflows can print `SKIP` and exit 0 when the isolated service-role secret is absent. The Team Lite exact-head run did execute the tests; future runs can still be false-green if the secret is missing.
- `scripts/test-signal-rate-limit.mjs` and `scripts/test-chat-read-receipts.mjs` exit 0 when credentials are absent, do not enforce the isolated project hostname, and do not require a separate operator mutation opt-in. With service-role credentials they call mutating RPCs and perform fixture cleanup DELETEs. They were not executed in this pass. The authenticated integration runner has a stronger isolated-project check; the two fixture scripts do not.
- The `master` Validate workflow has no documentation path filter, so the docs-only PR #82 runs the full validator. Run 41962627663 on pre-append head `1dad420` failed at `scripts/validate.mjs:26` with `production updateURL mismatch`; no runtime file changed in #82.
- Production deploy remains manual, uses the production GitHub Environment, validates stable version 3.4.7, and deploys only `upstatus`; it does not apply migrations. The workflow uses Supabase CLI `latest` and does not itself show an explicit approved-ref allowlist or expected project-ID assertion. External Environment protection rules were not inspected.
- Issue #78 remains OPEN; its real no-F5 reconnect, room re-entry, post-reconnect calls, repeated drops, bidirectional audio, and physical browser/device acceptance are **MANUAL PENDING**.
- Issue #79 remains OPEN with 36 comments and contains older CI/head snapshots in its body. Prefer exact PR metadata and exact-head run logs above. Its latest observed automation comment explicitly avoided editing PR #82 to prevent conflict with the QA owner; this append uses the isolated QA branch only.

### Safety record

No production SQL write, migration, Edge Function deployment, secret/flag change, userscript publication, PR merge, destructive operation, or engineering/handoff branch edit was performed. No tests were rerun because Normal and Team Lite share the isolated fixture project. Existing CI logs and read-only catalog/source evidence were inspected. The only repository write is this documentation append on the isolated QA branch, guarded by the freshly fetched blob SHA. No completion percentage is reported.


## Revalidation 2026-11-05 07:27 BRT — Normal smoke recovered; production security unchanged

This pass began by fetching this file from the dedicated QA branch, then refreshed PR/issue metadata, branch heads, commit diffs, exact-head workflow runs and job logs, candidate source files, deployed Edge Function artifacts, migration inventory, Security/Performance Advisors, and read-only PostgreSQL catalogs. Engineering branches and PR #80 were not edited.

### Exact GitHub state

| PR | Current metadata | Exact-head CI evidence | Classification |
|---|---|---|---|
| #74 Normal candidate | Open/Draft; base master; head branch chore/continuity-foundation; SHA d33284092eb9712619fdda5a4b8e0155e6c1f6a9 | Validate [42007563035](https://github.com/Reekyi/UpStatus/actions/runs/42007563035) SUCCESS; Signaling Smoke [42007563079](https://github.com/Reekyi/UpStatus/actions/runs/42007563079) SUCCESS | **AUTOMATED PASS** on exact head, isolated endpoint only |
| #75 Team Lite baseline | Open/Draft; head 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | Historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) SUCCESS | Historical **AUTOMATED PASS** |
| #76 Team Lite signaling | Open/Draft; head 3cf080156ae15c0defd2a981eb3b2221edf0d208 | Candidate Checks [41863688477](https://github.com/Reekyi/UpStatus/actions/runs/41863688477) SUCCESS | **AUTOMATED PASS** on exact head, isolated endpoint only |
| #82 QA documentation | Open/Draft; head d73bb529b09afbd825965cbc581ddb5fab11cc2d | Validate [41968669531](https://github.com/Reekyi/UpStatus/actions/runs/41968669531) FAILURE | **BLOCKED BY BASELINE**; docs-only PR |

PR #74 moved one commit beyond the previously audited head 2a5574c. Commit [d332840](https://github.com/Reekyi/UpStatus/commit/d33284092eb9712619fdda5a4b8e0155e6c1f6a9) changes only scripts/signaling-static.test.mjs. It replaces the obsolete in-memory-map assertion with a contract check for the Postgres RPC, parameters, fail-closed behavior, per-user read/write bucket separation, HTTP 429, atomic UPSERT, SECURITY INVOKER, and service_role-only EXECUTE.

The new exact-head smoke log confirms all configured stages completed:
- 14/14 static regression groups.
- 3/3 body-parser and 3/3 envelope test groups, plus signaling-transport assertions.
- 14/14 unauthenticated endpoint checks.
- 86/86 authenticated integration checks.
- Chromium WebRTC call audio, voice-room audio, screen video, remote-track delivery, three-member mesh, and teardown.
- Dynamic invitation, accepted-member authorization/fanout, logical room bindings, ownership handoff, parallel rooms, and legacy envelope compatibility.
- 90 endpoint requests accepted and one rejected with HTTP 429.
- Distributed rate-limit concurrency/reset test passed.
- Atomic chat-receipt concurrency test passed.
- Temporary users, sessions, rooms, memberships, and events cleanup verified.

This is a meaningful change: the Normal smoke is no longer blocked by the stale static assertion. The earlier failed run [41864124208](https://github.com/Reekyi/UpStatus/actions/runs/41864124208) is historical and must not be used as the current result. The new successful run still targets the isolated project bfpjtfqlnypisxljoxkb, not the production product endpoints or installed userscripts.

The PR #74 description still contains older head/run claims. GitHub metadata is authoritative: current head is d332840. The compare from 2a5574c to d332840 is exactly one commit and one changed file. The compare API reports the PR branch 604 commits ahead of master and zero behind; this is pre-existing branch ancestry, not the one-commit test correction. Preserve a full merge-base/history review before any merge decision.

PR #76 remains 92 commits ahead and zero behind #75. Treat #76 as the continuation of the #75 baseline, not a separate sibling candidate. Its body still cites an older head 2d1fa7d; current metadata head is 3cf0801. #75 body/head remain aligned at 7bbf9b9.

### Issues and stale status surfaces

- Issue [#78](https://github.com/Reekyi/UpStatus/issues/78) remains OPEN with three comments. The no-F5 network-loss recovery, voice-room re-entry, post-reconnect calls, repeated drops, audio continuity, and real browser/device acceptance remain **MANUAL PENDING**. Current CI does not simulate an actual internet outage through the installed userscript.
- Issue [#79](https://github.com/Reekyi/UpStatus/issues/79) remains OPEN with 38 comments. Its body still contains the 2026-11-03 head/run table and prior manual-test claims. Its latest comment at 07:05 BRT said the new Normal smoke was still in progress; the exact-head run has since completed successfully. Prefer current PR metadata and run 42007563079 over the stale issue body. No issue body/comment was edited in this pass.

### Candidate integration and workflow controls

The latest Normal candidate source was re-read at branch chore/continuity-foundation:
- The userscript still publishes chat_fast with the full message object at lines 3145 and 3187.
- Its chat_fast receiver ignores the supplied payload and refreshes from the authenticated API. This protects the receiver from trusting the broadcast row but does not remove the sender-side publication.
- The server template uses SESSION_CACHE_TTL_MS=5000 and calls merge_chat_read_receipts.
- It does not call consume_upstatus_signal_rate_limit.

The Team Lite candidate source was re-read at team-lite/signaling-transport-candidate:
- The userscript still publishes the full message object at lines 3598 and 3640.
- Its receiver also treats chat_fast as a refresh hint.
- Its server template uses a five-second session-cache bound and calls merge_chat_read_receipts, but does not call consume_upstatus_signal_rate_limit.

Thus the distributed rate limiter is validated in the isolated signaling test endpoint, not integrated into the product-facing Normal or Team Lite endpoints. RT-09 remains **PARTIAL**. The isolated 429 response still has no documented Retry-After contract.

Workflow and fixture-safety findings remain:
- Normal signaling-smoke.yml uses actions/checkout@v4, persists credentials, and does not pin the action to a full SHA. Team Lite pins checkout to a SHA and sets persist-credentials=false.
- Both workflows can SKIP authenticated tests and exit 0 if the isolated service-role secret is absent. The current Normal and Team Lite logs prove the configured authenticated tests did run on their recorded heads; this is a future false-green risk, not a failure of these runs.
- scripts/test-signal-rate-limit.mjs and scripts/test-chat-read-receipts.mjs still accept any SUPABASE_URL, exit 0 when credentials are missing, do not enforce the isolated project origin, and do not require a separate operator mutation opt-in. They use service_role and perform fixture cleanup DELETEs. They were inspected, not executed.
- scripts/run-signaling-authenticated.mjs checks the expected isolated origin and supplies UPSTATUS_SIGNAL_ALLOW_MUTATION=1 to its child process; the two direct fixture scripts do not inherit that origin guard.
- The two timestamped *_test.sql files remain under supabase/migrations/. They contain real DDL; the suffix does not exclude them from normal timestamp-based migration discovery. Do not run production migrations from this candidate branch. Replace these with separately reviewed production migrations and keep test-only DDL out of the production migration directory.

### Production Supabase recheck — read-only

Project dlfvkawaiqduhlazsszm is ACTIVE_HEALTHY on Postgres 17.11. Migration history remains seven entries through 20261027155438. The following objects remain absent:
- public.upstatus_signal_rate_limits
- public.consume_upstatus_signal_rate_limit(text, integer, integer)
- public.merge_chat_read_receipts(text, jsonb, timestamptz)

The fresh catalog query confirms:
- Three broadcast trigger functions remain SECURITY DEFINER with search_path=public and effective EXECUTE for anon, authenticated, and service_role.
- The active messages trigger fires after INSERT/UPDATE/DELETE. upstatus_broadcast_messages() serializes the complete OLD/NEW row and calls realtime.send for db_change with private=false.
- The remote-state trigger emits command/result metadata with private=false; the users trigger emits user status/name/reason/update metadata with private=false.
- Nine backend-owned public tables remain RLS-enabled with zero policies and broad anon/authenticated SELECT/INSERT/UPDATE/DELETE privileges: chat_reads, messages, reactions, status_history, upstatus_profiles, upstatus_sessions, upstatus_state, upstatus_typing, and users.
- public.upstatus_visual_config remains RLS-enabled with zero policies and no anon/authenticated table privileges.
- realtime.messages remains RLS-enabled with zero policies and anon/authenticated SELECT/INSERT/UPDATE; DELETE is not granted in the current effective-privilege check.
- These ACLs are unnecessary privilege surface, but RLS with no policies means the catalog output alone does not prove direct row access.
- Security Advisor observed two WARN categories, each covering the same three SECURITY DEFINER functions (anon EXECUTE and authenticated EXECUTE), plus ten INFO RLS-without-policy findings. Performance Advisor returned no findings. Advisor observation timestamp: 2026-11-05T10:27:31Z.

### Deployed Edge Functions and Realtime

The production inventory is 38/38 ACTIVE; all 38 report verify_jwt=false. This is the gateway setting, not proof that every route lacks application authentication. The three principal deployed functions inspected are:
- upstatus: Edge version 480, embedded userscript 3.4.7.
- upstatus-team-lite: Edge version 15, embedded userscript 3.4.30.
- upstatus-screen-share-3-1-1-beta10: Edge version 6, embedded userscript 3.1.1-beta8.

The deployed core sources use the custom UpStatus session-token flow and revalidate cached sessions after 30 seconds. Candidate Normal and Team Lite templates use five seconds. The route-by-route source/authentication/owner/consumer inventory for all 38 functions remains **NOT VERIFIED**; do not disable test, beta, or backup functions without confirming consumers and rollback.

The embedded userscripts were decoded from the deployed Edge Function sources. All three deployed clients still send chat_fast with {message: created} and {message: r.message}; their receivers consume payload.message. The current Normal and Team Lite candidates still send the complete message object, though their receivers now refresh rather than trust it. No inspected client configures private:true for the shared topic.

This is independent of the database trigger path. RT-01 remains **BLOCKED**: production has both client-originated full-message chat_fast and database-originated full-row db_change on public Realtime. The legacy call/voice/screen signaling events also remain on the public Realtime path in deployed clients. This is code/catalog inspection; no external-subscriber access test was attempted. Private Supabase Realtime cannot be enabled safely by a simple flag flip: it requires private channels, realtime.messages RLS policies, and a trusted Supabase Auth JWT or a separately validated server-mediated transport. The current UpStatus custom token is not itself a Supabase Auth JWT.

### Manual and release gates

- **AUTOMATED PASS:** Normal exact-head Validate and full isolated Signaling Smoke on d332840; Team Lite #76 Candidate Checks on 3cf0801.
- **CODE INSPECTION:** current candidate senders, production embedded userscripts, broadcast trigger definitions, grants, SECURITY DEFINER attributes, workflow YAML, fixture scripts, and candidate server-template integration.
- **MANUAL PENDING:** issue #78 recovery without F5; real Tampermonkey profiles; physical microphone/audio; real tab/display capture; and installed Normal ↔ Team Lite cross-client call/voice/screen acceptance in both directions.
- **BLOCKED:** RT-01 public Realtime disclosure; production grant/trigger hardening; production migration/cutover; product-endpoint rate-limit integration; fixture-script safety; CI fail-closed behavior.
- **NOT VERIFIED:** full source/auth inventory of all 38 Edge Functions; product-level cross-client integration on installed userscripts; external public-channel subscriber access.

### Safety record

No production SQL write, migration, Edge Function deployment, secret/flag change, userscript publication, PR merge, destructive operation, or engineering/handoff branch edit was performed. No test script or workflow was executed or rerun by QA; only existing GitHub workflow logs were inspected. The CI runs above were initiated by the repository workflow, not by this audit. Supabase SQL was read-only. The only repository write for this pass is this documentation append on the dedicated QA branch, guarded by the freshly fetched content blob SHA. No completion percentage is reported.


## Revalidation 2026-11-05 08:33 BRT — payload-free candidate chat hints; Normal exact-head CI green; Team Lite rerun cancelled

This pass began by reading the current QA-branch readiness document, then re-fetched live PR metadata, branch refs, recent commit diffs, exact-head workflow runs and logs, candidate userscripts/tests/workflows/migrations, production Edge Function artifacts, Supabase migration inventory, Security/Performance Advisors, and read-only PostgreSQL catalogs. No engineering branch, issue, PR description, or production resource was modified.

### Current GitHub refs and exact-head CI

| PR | Current state and exact head | Exact-head evidence | Classification |
|---|---|---|---|
| #74 Normal | Open/Draft, base `master`, head `chore/continuity-foundation`, `c5db358e77889526e05720cd65dff7c35f41c088` | Validate [42016419929](https://github.com/Reekyi/UpStatus/actions/runs/42016419929) SUCCESS; Signaling Smoke [42016420022](https://github.com/Reekyi/UpStatus/actions/runs/42016420022) SUCCESS | **AUTOMATED PASS** on exact head; isolated test project |
| #75 Team Lite baseline | Open/Draft, head `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) SUCCESS | Historical **AUTOMATED PASS** on unchanged baseline |
| #76 Team Lite signaling | Open/Draft, head `edd9afbfcbb643873b413ca7e5141405115ef49d` | Candidate Checks [42016097593](https://github.com/Reekyi/UpStatus/actions/runs/42016097593) CANCELLED; no jobs started | **NOT VERIFIED** on current head; prior pass [41863688477](https://github.com/Reekyi/UpStatus/actions/runs/41863688477) belongs to old head `3cf0801` |
| #82 QA documentation | Open/Draft, head `b3219b3560b348572108e03d029d48fc261b26dc` | Validate [42011427058](https://github.com/Reekyi/UpStatus/actions/runs/42011427058) FAILURE | **BLOCKED BY BASELINE VALIDATOR**; one changed file only |

PR #74's latest smoke job (job `127208925996`) completed successfully on the exact head `c5db358`. Its log confirms 14/14 static regression groups, 14/14 unauthenticated endpoint checks, 86/86 authenticated integration checks, Chromium call/voice/screen WebRTC with remote-track delivery, dynamic group invitation, three-member mesh and teardown, 90 accepted plus one HTTP 429 endpoint request, distributed rate-limit concurrency, atomic read-receipt concurrency, and fixture cleanup. The workflow used the fixed isolated project `bfpjtfqlnypisxljoxkb`. These are existing repository CI results; QA only inspected the logs and did not run the fixture-mutating scripts.

PR #74's latest candidate commits add a payload-free `chat_fast` hint (details below), and the exact-head CI covers those changes. The PR description still contains older head/run references; current GitHub metadata and exact-head run IDs above are authoritative.

The current #76 head contains the Team Lite payload-free sender and regression assertion, but its run was cancelled before any job started. The repository's latest issue #79 note attributes the cancellation to the shared concurrency group used by Normal and Team Lite because both workflows share the isolated Supabase fixture project. The old green #76 run does not validate `edd9afb`. Do not report the current Team Lite head as CI-approved. No new run was triggered: the shared fixture suite mutates test data and the user explicitly restricted QA to read-only inspections unless mutation authorization and project allowlisting are established.

PR #75 remains the earlier baseline. Compare `7bbf9b9...edd9afb` reports #76 **94 commits ahead and zero behind** #75; treat #76 as its continuation, not as an independent sibling merge. PR #74 currently reports **607 commits ahead and zero behind** `master`, with 49 changed files (base SHA `a9288ccfcb0f308d3a587bfca624418a395be07b`). GitHub currently reports it mergeable, but this large ancestry and file set still require a deliberate merge-base/history review; `mergeable=true` is not QA approval. No review submissions or inline review threads were returned for #74, #75, #76, or #82.

PR #82 remains documentation-only: GitHub reports one changed file, `docs/RELEASE_READINESS.md`, 19 commits ahead of master and zero behind. Its latest exact-head Validate run failed at `scripts/validate.mjs:26` with `production updateURL mismatch`; the build step first printed `Built UpStatus 3.4.7 / TEST 3.4.7`. The document itself did not change runtime code. Keep the PR Draft; do not bypass the validator in this audit.

### New candidate mitigation: `chat_fast` no longer carries the message row

This is a real improvement over the previous audit snapshot.

- Normal code commit [`b8fdb8b`](https://github.com/Reekyi/UpStatus/commit/b8fdb8bbfbe755ec0e5f30705a1b076993f2991a) changes both text-message and attachment send sites to call `sendRealtimeEvent('chat_fast')` without a message object.
- Normal regression commit [`32d54d7`](https://github.com/Reekyi/UpStatus/commit/32d54d7da7585178fe778817d941c5f3faeb4e9c) asserts that the empty hint is sent and the old `{message:created}` / `{message:r.message}` forms are absent.
- Team Lite code commit [`2bcb5ec`](https://github.com/Reekyi/UpStatus/commit/2bcb5ec4306c7b2028d99990987924b16cf0f834) makes the same two sender changes.
- Team Lite regression commit [`edd9afb`](https://github.com/Reekyi/UpStatus/commit/edd9afbfcbb643873b413ca7e5141405115ef49d) asserts the payload-free sender contract.

Current candidate source inspection found exactly two `chat_fast` send sites in each client, both payload-free. The shared `sendRealtimeEvent` helper serializes `payload || {}`, so these calls send an empty object. Candidate receivers ignore supplied rows and schedule canonical authenticated API refreshes; Team Lite also scopes delayed refreshes to the active auth generation/member. This is **CODE INSPECTION** plus static regression assertions, not a live public-subscriber test.

This closes the client-originated full-message payload in the *new candidate source* but does not close production disclosure:

- Deployed Normal Edge Function `upstatus` remains version 480 with embedded userscript 3.4.7; its send sites still publish `{message:created}` and `{message:r.message}` (embedded lines 2809 and 2851).
- Deployed Team Lite Edge Function `upstatus-team-lite` remains version 15 with embedded userscript 3.4.30; its send sites still publish the full message object (lines 3006 and 3048).
- Deployed legacy Normal endpoint `upstatus-screen-share-3-1-1-beta10` remains Edge version 6 with embedded userscript 3.1.1-beta8; its send sites still publish the full message object (lines 2596 and 2637).
- Production trigger `upstatus_broadcast_messages()` still serializes the complete OLD/NEW row and calls `realtime.send(..., 'db_change', ..., false)`.

Candidate migration `20261103160000_minimize_public_chat_broadcast.sql` changes the database event to an `op`-only hint; candidate migration `20261103170000_minimize_public_status_broadcasts.sql` similarly minimizes status/remote-command/result broadcasts. Neither migration is in production migration history. Old deployed clients and the full-row production trigger therefore remain separate disclosure paths. RT-01 remains **BLOCKED**. RT-10 is improved in candidate source but remains **PARTIAL** until a coordinated deployed-client/trigger cutover and end-to-end validation.

### Production Supabase recheck — read-only

Project `dlfvkawaiqduhlazsszm` is `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002. Production still has seven migrations through `20261027155438`. The following remain absent:

- `public.upstatus_signal_rate_limits`
- `public.consume_upstatus_signal_rate_limit(text, integer, integer)`
- `public.merge_chat_read_receipts(text, jsonb, timestamptz)`

The explicit schema-qualified catalog query confirms:

- Nine backend-owned public tables (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) have RLS enabled, zero policies, and effective anon/authenticated SELECT, INSERT, UPDATE, and DELETE privileges.
- `public.upstatus_visual_config` has RLS enabled, zero policies, and no anon/authenticated table privileges.
- `realtime.messages` has RLS enabled, zero policies, and anon/authenticated SELECT, INSERT, and UPDATE; DELETE is not granted.
- The nine-table grants are unnecessary privilege surface. RLS enabled with no policies means this catalog output alone does **not** prove direct row access.
- Three production trigger functions remain `SECURITY DEFINER`, `search_path=public`, and EXECUTE remains effective for PUBLIC, anon, authenticated, and service_role. They are trigger-only functions; broad direct EXECUTE is unnecessary and remains reported by the Advisor.
- Security Advisor observation at `2026-11-05T11:33:26Z` (08:33:26 BRT): two WARN categories, each covering the same three functions (anon EXECUTE and authenticated EXECUTE), plus ten INFO RLS-without-policy findings. Performance Advisor returned no findings.

The candidate migrations `20261029170500_restrict_trigger_function_execute.sql` and `20261029183000_revoke_unused_public_table_grants.sql` remain unapplied to production. The two timestamped `*_test.sql` migrations for receipts and rate limiting remain under `supabase/migrations/`; their suffix does not exclude them from normal migration discovery. Keep test-only DDL out of a production migration run and create separately reviewed production migrations through the approved process.

### Edge Functions and endpoint integration

Production has 38/38 Edge Functions ACTIVE; all 38 report `verify_jwt=false`. This is the gateway setting, not proof that every route lacks application authentication. The three core sources inspected use the custom UpStatus session-token design; a route-by-route auth/owner/consumer inventory for all 38 remains **NOT VERIFIED**. Do not disable test/beta/backup functions without checking consumers and rollback.

The deployed core versions remain Normal 3.4.7, Team Lite 3.4.30, and legacy Normal 3.1.1-beta8. The candidate server templates still use a 5-second session-cache bound and call `merge_chat_read_receipts`; production remains at the prior 30-second cache and has no receipt RPC. Neither candidate product server template calls `consume_upstatus_signal_rate_limit`: the 240-read/minute and 90-write/minute per-authenticated-username buckets are implemented and tested only in the isolated signaling test endpoint. RT-09 remains **PARTIAL** until the limiter is integrated into both product endpoints and validated there.

### Workflow and fixture safety

- Normal `signaling-smoke.yml` still uses `actions/checkout@v4` without a pinned SHA or `persist-credentials: false`; its log emits the Node.js 20 deprecation warning. Team Lite pins checkout to a full SHA and disables credential persistence.
- Both workflows share concurrency group `upstatus-signaling-isolated-tests` because the test project is shared. A pending run can be displaced/cancelled; current #76 exact-head run was cancelled while #74 smoke was queued/running. Preserve serialization, but arrange a sequential rerun or separate isolated fixture project before claiming Team Lite current-head validation.
- Both workflows allow the authenticated step to print `SKIP` and exit zero if the service-role secret is absent. The current #74 run logs prove the secret was present and tests executed; the cancelled #76 run has no job evidence.
- `scripts/test-signal-rate-limit.mjs` and `scripts/test-chat-read-receipts.mjs` still accept any `SUPABASE_URL`, skip with exit zero when credentials are absent, and do not require a separate operator mutation opt-in. They use service_role and perform fixture cleanup DELETEs. They were inspected, not executed by QA.
- `scripts/run-signaling-authenticated.mjs` has an exact isolated-project origin guard for `bfpjtfqlnypisxljoxkb.supabase.co` and sets the child mutation opt-in, but that guard is not shared by the two direct fixture scripts.
- The latest #74 smoke's fixture mutations and cleanup were performed by the repository CI job, not by this QA audit. QA did not trigger or rerun any workflow.

### Issues and manual acceptance

- Issue [#78](https://github.com/Reekyi/UpStatus/issues/78) remains OPEN with three comments. Its acceptance checklist is still unchecked for real no-F5 recovery, room re-entry, post-reconnect calls, repeated drops, bidirectional audio, and real browser/device validation. **MANUAL PENDING**.
- Issue [#79](https://github.com/Reekyi/UpStatus/issues/79) remains OPEN with 39 comments. Its body still contains 2026-11-03 CI and manual-test snapshots. Its latest comment records #74 smoke as pending and #76 as cancelled; the #74 run subsequently completed SUCCESS at 11:15:13Z. Prefer current PR metadata and exact-head run logs. No issue body/comment was edited.
- Installed-client Normal ↔ Team Lite call/voice/screen acceptance, separate Tampermonkey profiles, real microphone permissions/capture, and real tab/display capture remain **MANUAL PENDING**. Isolated Chromium signaling E2E is not a substitute.

### Current classification and next gates

- **AUTOMATED PASS:** Normal #74 Validate and full isolated Signaling Smoke on exact head `c5db358`.
- **AUTOMATED PASS (historical only):** Team Lite #75 baseline on `7bbf9b9`; Team Lite #76 previous head `3cf0801`.
- **NOT VERIFIED:** Team Lite #76 exact head `edd9afb`, because run 42016097593 was cancelled before jobs started.
- **CODE INSPECTION:** payload-free `chat_fast` senders and static assertions in both candidates; production embedded clients; public database trigger definitions; candidate trigger-minimization migrations; workflows, fixture scripts, RLS/grants, SECURITY DEFINER functions, and Edge Function inventory.
- **MANUAL PENDING:** issue #78 recovery and installed-client/device/cross-product acceptance.
- **BLOCKED:** RT-01 production public Realtime disclosure; production trigger/grant hardening and coordinated cutover; rate-limit integration in real product endpoints; fixture-script allowlisting/opt-in; CI fail-closed behavior; production migration review.
- **NOT VERIFIED:** full route-by-route security/consumer inventory of all 38 Edge Functions; external public-channel subscriber access.

Next gates: (1) complete a coordinated client + database-trigger Realtime cutover, including legacy-client handling; (2) obtain a non-cancelled exact-head Team Lite CI run without concurrent fixture use; (3) add project allowlisting and explicit mutation authorization to direct fixture scripts; (4) make missing integration secrets fail closed; (5) integrate the rate limiter into both product endpoints; (6) separate test migrations and validate production hardening in official TEST; (7) complete the 38-function inventory; (8) perform manual no-F5 and installed Normal ↔ Team Lite acceptance; (9) review #74's 607-commit ancestry before any merge decision.

### Safety record

No production SQL write, migration, Edge Function deployment, secret/flag change, userscript publication, PR merge, destructive operation, issue edit, or engineering/handoff branch edit was performed. QA used only read-only Supabase catalog/advisor queries and inspected existing GitHub workflow logs. No fixture-mutating script or new workflow was executed by QA. The only repository write in this pass is this append to `docs/RELEASE_READINESS.md` on the dedicated QA branch, guarded by the freshly fetched content blob SHA. No completion percentage is reported.


## Revalidation 2026-11-05 09:35 BRT — Team Lite fixture guard hardened; exact-head CI green; Normal branch still unguarded

This pass began by reading the current QA-branch readiness document (blob `e5e22882b9fa53085092435e6c15432407e5ade2`) and then re-fetching live PR metadata, branch comparisons, exact-head workflow runs/jobs, candidate workflow/scripts/templates/migrations, production Supabase migration/catalog/advisor state, and deployed Edge Function sources. The PR #82 head and document blob were rechecked immediately before this append. No engineering branch or issue was modified.

### Current GitHub refs and exact-head evidence

| PR | Current state and exact head | Exact-head CI evidence | Classification |
|---|---|---|---|
| #74 Normal | Open/Draft; base `master`; head `c5db358e77889526e05720cd65dff7c35f41c088` | Validate [42016419929](https://github.com/Reekyi/UpStatus/actions/runs/42016419929) SUCCESS; Signaling Smoke [42016420022](https://github.com/Reekyi/UpStatus/actions/runs/42016420022) SUCCESS | **AUTOMATED PASS** on exact head; isolated test project |
| #75 Team Lite baseline | Open/Draft; base `team-lite-official`; head `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) SUCCESS | Historical **AUTOMATED PASS**; superseded by #76 |
| #76 Team Lite signaling | Open/Draft; base `team-lite-official`; head `578ba8a44dd67401a4bad0db897980c91fea3df5` | Candidate Checks [42024542507](https://github.com/Reekyi/UpStatus/actions/runs/42024542507) SUCCESS | **AUTOMATED PASS** on exact head; isolated test project |
| #82 QA documentation | Open/Draft; base `master`; head `27d769488d6b509853310db0e961793262541249` before this append | Validate [42020362859](https://github.com/Reekyi/UpStatus/actions/runs/42020362859) FAILURE at the Validate build step | **BLOCKED BY BASELINE VALIDATOR**; one Markdown file changed |

Normal #74 remains at the previously validated head `c5db358`; no newer engineering commit was present at inspection time. The full smoke run 42016420022 completed on that exact SHA.

Team Lite #76 advanced seven commits from `edd9afb` to `578ba8a`. Its final run 42024542507 completed successfully. The job's steps all report SUCCESS: isolated-project guard tests, authenticated signaling adapter tests, unauthenticated endpoint checks, authenticated integration/browser tests, distributed rate-limit concurrency, atomic read-receipt concurrency, and candidate/version checks. The intermediate run [42024529027](https://github.com/Reekyi/UpStatus/actions/runs/42024529027) on `949e7ec` was cancelled before jobs started; it does not invalidate the later exact-head success. An earlier intermediate run [42024489587](https://github.com/Reekyi/UpStatus/actions/runs/42024489587) passed on `c3fdae3`, but the final-head run is the authoritative result.

The Team Lite workflow still uses the shared concurrency group `upstatus-signaling-isolated-tests` with `cancel-in-progress: false`, protecting the shared fixture database from simultaneous running jobs. The observed cancelled pending run shows that rapid successive pushes can still leave an intermediate head without a test result; the final head now has a successful result. Do not treat a cancelled/superseded head as validated.

### PR topology, history, and review state

- #74 compares to `master` as **607 commits ahead, zero behind**, with 49 changed files. GitHub reports `mergeable=true`, but this is not a review or QA approval. The large ancestry/file set requires a deliberate merge-base/history review before any merge decision.
- #75 compares to `team-lite-official` as 59 commits ahead, zero behind.
- #76 compares to `team-lite-official` as 160 commits ahead, zero behind, and is **101 commits ahead of #75's head** with zero behind. Treat #76 as the continuation of #75, not as an independent sibling candidate to merge separately.
- #82 compares to `master` as 20 commits ahead, zero behind, with exactly one changed file: `docs/RELEASE_READINESS.md`.
- No submitted reviews or inline review threads were returned for #74, #75, #76, or #82. All four remain open and Draft.

PR #82's latest Validate run failed at its build-validation step. The unchanged master validator asserts at `scripts/validate.mjs:26` that the production userscript updateURL includes `/upstatus/upstatus.user.js`; the PR changes only this Markdown document, so the failure is not caused by a runtime-code change in the QA PR. Keep #82 Draft and do not bypass the assertion as part of this audit.

### New Team Lite improvement: fail-closed fixture safety

The seven commits added to #76 since `edd9afb` are:

- `c3fdae3996d892e73f5b9b8a97f96f999c09b4ec` — isolated Supabase mutation guard.
- `2c314dfe349d1bb6f224904545dbb0aa9e4ed59c` — guard regression test.
- `856be676344d909e8ea9904695b9686c6ccb831a` — guard rate-limit fixture writes.
- `e606303ab1d45ecce27d7e43e1dde867b52951b8` — guard read-receipt fixture writes.
- `ce12617cd5fed1abdcbfd7109e6a484a1fa83020` — require explicit mutation opt-in in the authenticated runner.
- `949e7ec9f9e83327d3bf81a9a9b40841946a10b4` — require explicit mutation opt-in in the browser harness.
- `578ba8a44dd67401a4bad0db897980c91fea3df5` — fail-closed Team Lite workflow.

Static inspection confirms `scripts/assert-isolated-supabase.mjs` now:
- allowlists only `https://bfpjtfqlnypisxljoxkb.supabase.co` (exact origin, root path, no query/hash/userinfo);
- requires `SUPABASE_SERVICE_ROLE_KEY` and `UPSTATUS_SIGNAL_ALLOW_MUTATION=1`;
- performs a read-only PostgREST GET preflight with the supplied key before fixture writes;
- rejects production host, HTTP, unexpected path/query, missing key, and missing opt-in in its static regression test.

The Team Lite rate-limit and read-receipt fixture scripts call this guard and no longer treat missing credentials as a successful SKIP. The workflow sets the mutation opt-in only alongside the isolated project URL and secret, explicitly fails if the secret is absent, pins checkout to SHA `de0fac2e4500dabe0009e67214ff5f5447ce83dd`, sets `persist-credentials: false`, and uses read-only repository permissions. The exact-head CI run passed all corresponding steps.

**Important asymmetry: this hardening exists on #76, not on the current Normal #74 head.** Inspection of #74's current `signaling-smoke.yml` and scripts found:
- checkout remains `actions/checkout@v4` without a pinned SHA or `persist-credentials: false`;
- the authenticated workflow step still prints SKIP and exits zero if the integration secret is missing;
- `test-signal-rate-limit.mjs` and `test-chat-read-receipts.mjs` still accept arbitrary `SUPABASE_URL`, have no exact isolated-project allowlist or explicit mutation opt-in, and SKIP with exit zero when credentials are missing;
- the Normal authenticated runner checks the isolated origin but creates/cleans fixtures without an operator opt-in of its own; it sets the opt-in only in the child environment after its own fixture provisioning;
- the Normal browser harness has no independent mutation opt-in guard.

This is a **CODE INSPECTION** finding, not evidence that the current successful Normal CI run touched production. The observed Normal CI used the fixed isolated URL and its configured test secret. However, the scripts are unsafe to run locally with arbitrary environment variables, and missing secrets can produce false-green Normal CI. The latest issue #79 comment (40 comments total, latest at 2026-11-05T12:09:11Z) explicitly identifies the next engineering action: port the Team Lite guard/fail-closed behavior to #74. QA did not edit the issue or either engineering branch.

### Realtime payload mitigation: candidate improved, production still exposed

Current Normal and Team Lite candidate userscripts each have two `chat_fast` send sites, and all four now call `sendRealtimeEvent('chat_fast')` without a message argument. The candidate receivers treat the event as a refresh hint and retrieve canonical chat state through the authenticated UpStatus API. This is **CODE INSPECTION** backed by the candidate regression/CI checks; it is not an external-subscriber test.

The deployed userscripts embedded in production Edge Functions remain unchanged and still send `{message: created}` and `{message: r.message}`, with receivers reading `payload.message`:

| Production function | Edge version | Embedded userscript |
|---|---:|---|
| `upstatus` | 480 | 3.4.7 |
| `upstatus-team-lite` | 15 | 3.4.30 |
| `upstatus-screen-share-3-1-1-beta10` | 6 | 3.1.1-beta8 |

The production database trigger `upstatus_messages_broadcast` still invokes `public.upstatus_broadcast_messages()`, which serializes OLD/NEW via `to_jsonb(...) ` and sends `{op, record}` as `db_change` with `private=false`. This remains a public full-row chat-content path independent of client-originated `chat_fast`.

The candidate migration `20261103160000_minimize_public_chat_broadcast.sql` changes that trigger payload to `{op}` only, and `20261103170000_minimize_public_status_broadcasts.sql` similarly reduces user-status/remote-command/result events to operation hints. Both still use public broadcasts (`private=false`), so they minimize payloads but do not make the channel private. These migrations are staged in #74 and are not present in production migration history; they are also absent from the #76 Team Lite diff, so the release plan must coordinate the shared database migration separately from the Team Lite userscript branch.

The authenticated signaling adapter remains opt-in/default-off: `createSignalingTransport` defaults `enabled=false`, and both candidate clients read `signaling_transport_enabled` with a default of `false`. Legacy public Realtime therefore remains the default call/voice/screen signaling path until a coordinated cutover. **RT-01 remains BLOCKED**: candidate payload minimization is progress, but deployed clients, the production full-row trigger, and the default-off legacy signaling path remain.

### Production Supabase recheck — read-only

Project `dlfvkawaiqduhlazsszm` reported `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002. The production migration inventory remains seven migrations through `20261027155438`. These objects remain absent:
- `public.upstatus_signal_rate_limits`
- `public.consume_upstatus_signal_rate_limit(text, integer, integer)`
- `public.merge_chat_read_receipts(text, jsonb, timestamptz)`

The schema-qualified catalog query reconfirmed:
- Nine backend-owned public tables (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) have RLS enabled, zero policies, and effective anon/authenticated SELECT, INSERT, UPDATE, and DELETE privileges.
- `public.upstatus_visual_config` has RLS enabled, zero policies, and no anon/authenticated table privileges.
- `realtime.messages` has RLS enabled, zero policies, anon/authenticated SELECT, INSERT, and UPDATE; DELETE is not granted.
- Three trigger-only public functions remain `SECURITY DEFINER`, `search_path=public`, with EXECUTE effective for anon, authenticated, and service_role: `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()`, and `upstatus_broadcast_users()`. The message function still emits the full OLD/NEW row; remote-state emits selected command/result fields; user-status emits name/status/reason/updated_at/sync metadata.
- Security Advisor observation at `2026-11-05T12:35:03Z`: two WARN categories, each covering the same three functions (anon EXECUTE and authenticated EXECUTE), plus ten INFO RLS-without-policy findings. Performance Advisor returned no findings.

These grants are unnecessary privilege surface, but RLS enabled with zero policies means the catalog result alone does not prove direct row access. Candidate revocation migrations remain unapplied. No production migration or SQL write was performed.

### Product endpoint integration and Edge Functions

Both candidate server templates call `merge_chat_read_receipts`; neither product template calls `consume_upstatus_signal_rate_limit`. The rate limiter remains validated only in the isolated signaling test endpoint, not integrated into the real Normal or Team Lite product endpoints. The receipt RPC is also absent from production. The two timestamped `*_test.sql` migrations remain under `supabase/migrations/` in candidate source; keep test-only DDL out of a production migration run and prepare separately reviewed production migrations.

Production inventory: **38/38 Edge Functions ACTIVE; 38/38 report `verify_jwt=false`**. This is the Supabase gateway setting, not proof that every function lacks application-level authentication. The three core functions inspected use the custom UpStatus session-token design. The full route-by-route authentication/owner/consumer inventory for all 38 functions remains **NOT VERIFIED**. Do not disable beta/test/backup functions without checking consumers and rollback.

### Workflow and release-safety notes

The production deployment workflow is manual (`workflow_dispatch`), uses the `production` GitHub Environment, checks for stable Normal version `3.4.7`, then deploys the `upstatus` Edge Function. It pins checkout and the Supabase setup action, but uses CLI version `latest` and does not explicitly assert an approved Git ref/SHA or that `SUPABASE_PROJECT_ID` equals the intended production project. Treat this as a **CODE INSPECTION** release-control gap; no deployment was attempted. Normal candidate `release.json` still says `3.4.7`, while Team Lite candidate `team-lite/release.json` says build `3.4.31`. Version bump, artifact URL, target function, project ID, and rollback must be reconciled in a single reviewed cutover. The Normal candidate still requires an intentional version decision before publication.

### Issues and manual acceptance

- Issue [#78](https://github.com/Reekyi/UpStatus/issues/78) remains OPEN with three comments. Both candidates contain `offline`/`online` handlers that tear down local call/voice state and Realtime on outage, then restart Realtime and refresh after connectivity returns. The room is not auto-rejoined; the user can re-enter after recovery. This is **CODE INSPECTION**, not physical acceptance. No real Tampermonkey test of internet loss/recovery without F5 has been recorded; issue #78 remains **MANUAL PENDING**.
- Issue [#79](https://github.com/Reekyi/UpStatus/issues/79) remains OPEN with 40 comments. Its latest comment records the Team Lite fixture-guard work and asks for the same protection to be ported to Normal. The issue body still contains open release gates; do not treat its older CI snapshots as current.

Still **MANUAL PENDING**: real Tampermonkey profiles, real microphone permission/capture and bidirectional audio, real tab/display capture and stop-sharing, no-F5 reconnect/re-entry, repeated network drops, and installed-client Normal ↔ Team Lite calls/voice/screen in both directions. Chromium CI is automated isolated evidence, not a substitute for those device/network tests.

### Current classifications and next gates

- **AUTOMATED PASS:** Normal #74 exact head `c5db358` (Validate + full isolated Signaling Smoke); Team Lite #76 exact head `578ba8a` (full Candidate Checks including new fixture guard).
- **HISTORICAL AUTOMATED PASS:** Team Lite #75 baseline `7bbf9b9`; it is superseded by #76 for current signaling work.
- **CODE INSPECTION:** candidate payload-free chat hints, offline/online recovery handlers, mutation guard implementation, production embedded userscripts, production broadcast trigger definitions, migrations, RLS/grants/SECURITY DEFINER, workflow YAML, release metadata, and Edge Function inventory.
- **MANUAL PENDING:** issue #78 and real installed-client/device/cross-product acceptance.
- **BLOCKED:** RT-01 production public Realtime disclosure; production trigger/grant hardening and coordinated client/database cutover; product-endpoint rate-limit integration; Normal fixture-script allowlisting/explicit opt-in/fail-closed CI; production migration review; deployment ref/SHA/project guard.
- **NOT VERIFIED:** external public-channel subscriber access; route-by-route auth/owner/consumer review of all 38 Edge Functions; physical no-F5 recovery and installed-client interoperability.

Next gates: (1) port the Team Lite fixture guard, explicit mutation opt-in, and fail-closed secret behavior to Normal #74; (2) coordinate the shared Realtime payload migration with both client releases and replace/default-off legacy public call signaling safely; (3) integrate the distributed rate limiter into both real product endpoints; (4) separate test migrations and validate production hardening in official TEST; (5) add approved-ref/SHA and project-ID checks to production deployment; (6) complete the 38-function inventory; (7) perform manual no-F5, device, and Normal ↔ Team Lite acceptance; (8) review #74's 607-commit ancestry before any merge decision.

### Safety record

No production SQL write, migration, Edge Function deployment, secret/flag change, userscript publication, PR merge, destructive operation, issue edit, or engineering-branch edit was performed. QA did not run fixture-mutating scripts or trigger/rerun any workflow. Existing GitHub CI logs initiated by engineering were inspected; all SQL executed by QA was read-only. The only repository write for this pass is this append to `docs/RELEASE_READINESS.md` on the dedicated QA branch, guarded by the freshly fetched blob SHA. No completion percentage is reported.


## Revalidation 2026-11-05 — Normal fixture guard ported; exact-head smoke green; production remains unchanged

This pass re-read the QA branch readiness document and re-fetched the live PR heads before inspecting the two new Normal commits, exact-head CI jobs/logs, candidate workflows/scripts/templates, issue discussions, and production Supabase catalog/advisors/Edge Function bundles. All candidate CI evidence below was initiated by engineering; QA did not start or rerun workflows and did not execute fixture-mutating scripts.

### Current PR heads, topology, and review state

| PR | State / base / exact head | Compare result | Current CI evidence | Classification |
|---|---|---|---|---|
| #74 Normal | Open/Draft; `master`; `0150ac0276a55bd32fbb46acc68c15df5b5403d0` | 609 ahead, 0 behind; 51 changed files; GitHub reports mergeable | Validate [42032008035](https://github.com/Reekyi/UpStatus/actions/runs/42032008035) SUCCESS; Signaling Smoke [42032007996](https://github.com/Reekyi/UpStatus/actions/runs/42032007996) SUCCESS | **AUTOMATED PASS** on exact head; isolated project only |
| #75 Team Lite baseline | Open/Draft; `team-lite-official`; `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 59 ahead, 0 behind | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) SUCCESS | Historical **AUTOMATED PASS**; superseded by #76 |
| #76 Team Lite signaling | Open/Draft; `team-lite-official`; `578ba8a44dd67401a4bad0db897980c91fea3df5` | 160 ahead, 0 behind; 101 commits ahead of #75 | Candidate Checks [42024542507](https://github.com/Reekyi/UpStatus/actions/runs/42024542507) SUCCESS | **AUTOMATED PASS** on exact head; isolated project only |
| #82 QA documentation | Open/Draft; `master`; `c747f9baba5f54afabcda05a95fb1d3a72494b91` | 21 ahead, 0 behind; exactly one changed file | Validate [42029048298](https://github.com/Reekyi/UpStatus/actions/runs/42029048298) FAILURE at `scripts/validate.mjs`: `production updateURL mismatch` | **BLOCKED BY BASELINE VALIDATOR**; runtime code unchanged |

All four PRs remain open and Draft; none is merged. GitHub returned zero submitted reviews and zero inline review threads for #74, #75, #76, and #82. #74's 609-commit ancestry and 51-file diff still require a deliberate history/merge-base review; `mergeable=true` is not an approval. #76 remains a continuation of #75, not an independent sibling candidate. PR descriptions and issue #79's body still contain older CI/head snapshots; use exact-head Actions results, not those stale summaries.

### Normal fixture safety was ported and the exact-head smoke completed

Engineering added the Normal-side guard in commit [db08471](https://github.com/Reekyi/UpStatus/commit/db08471c58aed97344dbbea59d7cc91eb8038e02) and updated its static regression/workflow contract in [0150ac0](https://github.com/Reekyi/UpStatus/commit/0150ac0276a55bd32fbb46acc68c15df5b5403d0). The current #74 head is the latter commit.

**CODE INSPECTION:** `scripts/assert-isolated-supabase.mjs` now:
- permits only the exact origin `https://bfpjtfqlnypisxljoxkb.supabase.co`, root path, and no query/hash/userinfo;
- requires `SUPABASE_SERVICE_ROLE_KEY` and explicit `UPSTATUS_SIGNAL_ALLOW_MUTATION=1`;
- performs a read-only PostgREST GET preflight with redirects rejected and a 10-second timeout before any fixture write;
- fails closed on an invalid target, missing key, missing opt-in, or failed preflight.

Both direct fixture scripts (`test-signal-rate-limit.mjs` and `test-chat-read-receipts.mjs`) call the guard before their POST/DELETE operations. The authenticated runner validates the target before stale-fixture cleanup or fixture creation. The browser harness independently requires the mutation opt-in. Static regression tests cover the guard and workflow wiring.

The Normal `signaling-smoke.yml` now sets the exact isolated URL and explicit opt-in, and exits nonzero if the integration secret is absent instead of returning SKIP/exit 0. Its concurrency group remains shared with Team Lite and uses `cancel-in-progress: false`, serializing fixture-mutating suites. The Team Lite workflow has the same guard/fail-closed behavior. **Residual workflow asymmetry:** Normal `signaling-smoke.yml` still uses floating `actions/checkout@v4` and does not set `persist-credentials: false`; Normal `validate.yml` and Team Lite candidate workflow pin checkout to SHA `de0fac2e4500dabe0009e67214ff5f5447ce83dd` and disable persisted credentials. This is a hardening follow-up, not a failure of the completed smoke.

**AUTOMATED PASS — Normal exact head:** run [42032007996](https://github.com/Reekyi/UpStatus/actions/runs/42032007996), job `127260543515`, every step SUCCESS:
- 14/14 static signaling regression groups; body-parser and envelope suites passed; transport adapter/polling/lifecycle assertions passed;
- isolated mutation guard and workflow-wiring checks passed;
- 14/14 unauthenticated endpoint checks;
- 86/86 authenticated integration checks;
- Chromium WebRTC call audio, voice-room audio, and screen-share video negotiation/delivery passed;
- three-member mesh links and teardown passed;
- distributed endpoint quota: 90 accepted, 1 rejected with HTTP 429;
- distributed rate-limit concurrency and atomic read-receipt concurrency passed;
- temporary users, sessions, rooms, memberships, and events cleanup verified.

Validate run [42032008035](https://github.com/Reekyi/UpStatus/actions/runs/42032008035) also completed SUCCESS on the same #74 head. These are isolated candidate tests against `bfpjtfqlnypisxljoxkb`, not production endpoint or installed-user acceptance.

**AUTOMATED PASS — Team Lite exact head:** [42024542507](https://github.com/Reekyi/UpStatus/actions/runs/42024542507), job `127236981895`, every step SUCCESS. It includes the guard, 14/14 unauthenticated checks, 86/86 authenticated checks, Chromium call/voice/screen media delivery, three-member mesh/teardown, 90 accepted + 1 rejected (429), rate-limit concurrency, atomic receipt concurrency, and fixture cleanup. The older cancelled intermediate run does not invalidate this later exact-head success.

### Candidate chat hints improved; production still runs the old clients

**CODE INSPECTION:** current Normal and Team Lite candidate userscripts each have two `chat_fast` send sites and zero send sites that attach an object payload. Their receivers treat the event as a refresh hint and fetch canonical chat state through the authenticated API. However, both clients still default `signaling_transport_enabled` to false. Legacy public Realtime remains the default call/voice/screen signaling path until a coordinated transport cutover.

I decoded the actual userscript payloads embedded in the three deployed production Edge Functions. All three still contain two `chat_fast` send sites with `{message: created}` and `{message: r.message}`, and receivers still read `payload.message`:

| Production Edge Function | Edge version | Embedded userscript | Observed behavior |
|---|---:|---|---|
| `upstatus` | 480 | 3.4.7 | Full chat payload on `chat_fast`; `db_change` listener |
| `upstatus-team-lite` | 15 | 3.4.30 | Full chat payload on `chat_fast`; `db_change` listener |
| `upstatus-screen-share-3-1-1-beta10` | 6 | 3.1.1-beta8 | Full chat payload on `chat_fast`; `db_change` listener |

All three deployed server functions still revalidate cached sessions at 30 seconds; both candidate server templates use 5 seconds. These are direct inspections of the deployed function source and decoded embedded userscript, not assumptions based on the candidate repository.

### Production Realtime trigger, RLS/grants, SECURITY DEFINER, and migration state

Supabase project `dlfvkawaiqduhlazsszm` returned `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002. The production migration history still contains seven migrations, latest `20261027155438`.

A direct read-only `to_regclass`/`to_regprocedure` check returned NULL for all three candidate objects:
- `public.upstatus_signal_rate_limits`
- `public.consume_upstatus_signal_rate_limit(text, integer, integer)`
- `public.merge_chat_read_receipts(text, jsonb, timestamptz)`

The production trigger `upstatus_messages_broadcast` still invokes `public.upstatus_broadcast_messages()`, which serializes OLD/NEW with `to_jsonb(...)` and calls `realtime.send(jsonb_build_object('op', TG_OP, 'record', rec), 'db_change', ..., false)`. The final `false` keeps the broadcast public. The production remote-state and user-status trigger functions also publish selected command/result or status metadata to public channels.

The candidate chat migration `20261103160000_minimize_public_chat_broadcast.sql` reduces the message event to an operation hint, and the status migration similarly reduces payloads. Both still use `private=false`; payload minimization is not private-channel authorization. These migrations are not in production history. The chat/status migrations are in #74's diff, not #76's; the database change therefore remains a shared coordinated release dependency.

Read-only catalog results:
- Three trigger functions remain `SECURITY DEFINER`, `search_path=public`, with effective EXECUTE for `anon`, `authenticated`, and `service_role`: `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()`, and `upstatus_broadcast_users()`.
- Nine backend-owned public tables (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) have RLS enabled, zero policies, and effective anon/authenticated SELECT/INSERT/UPDATE/DELETE privileges.
- `public.upstatus_visual_config` has RLS enabled, zero policies, and no anon/authenticated table privileges.
- `realtime.messages` has RLS enabled, zero policies, and anon/authenticated SELECT/INSERT/UPDATE; DELETE is not granted.

These are excessive/unnecessary privilege surfaces. RLS enabled with zero policies means the catalog findings alone do not prove direct row access. Do not overstate them as demonstrated data exfiltration.

Security Advisor observation at 2026-11-05T13:31:05Z returned two WARN categories, each covering the same three functions (SECURITY DEFINER callable by anon; callable by authenticated), and ten INFO findings for RLS enabled without policies. Performance Advisor returned no findings. Remediation references: [anon SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

### Product endpoint and Edge Function gaps

Both candidate server templates call `merge_chat_read_receipts`, but neither calls `consume_upstatus_signal_rate_limit`. The rate limiter remains tested only in the isolated signaling endpoint, not integrated into the actual Normal or Team Lite product endpoints. The receipt RPC is called by candidates but absent from production. The two `*_test.sql` migrations remain under `supabase/migrations/` in candidate source; they must not be treated as production-ready migrations.

The production inventory remains 38/38 Edge Functions ACTIVE and 38/38 with gateway `verify_jwt=false`. The three core functions inspected validate the custom UpStatus session token at application level; `verify_jwt=false` alone is not proof of unauthenticated access. Route-by-route authentication, owner, and consumer review for all 38 functions remains **NOT VERIFIED**. Do not disable beta/test/backup functions without consumer and rollback analysis.

### Issues, manual acceptance, and remaining workflow gates

- Issue [#78](https://github.com/Reekyi/UpStatus/issues/78) remains OPEN with three comments. The comments document code/CI work, not a physical no-F5 recovery test. Real network loss/recovery, room re-entry, new calls after reconnect, real microphone/audio, real screen capture, repeated drops, and installed Normal ↔ Team Lite acceptance remain **MANUAL PENDING**.
- Issue [#79](https://github.com/Reekyi/UpStatus/issues/79) remains OPEN with 41 comments. Its body is still an older release snapshot. Its latest engineering comment at 10:00 BRT recorded Normal smoke as IN_PROGRESS; that is now superseded by exact-head SUCCESS runs 42032007996 and 42032008035. QA did not edit the issue.
- PR #82's current Validate run [42029048298](https://github.com/Reekyi/UpStatus/actions/runs/42029048298) failed at `scripts/validate.mjs` with `production updateURL mismatch`. The PR changes only `docs/RELEASE_READINESS.md`; keep it Draft and do not bypass the baseline assertion as part of QA.
- The production deploy workflow's approved-ref/project-ID guard was not re-inspected in this pass; retain the previously recorded release-control concern as **NOT REVERIFIED**, not as a new finding.

### Current classifications and next gates

- **AUTOMATED PASS:** Normal #74 exact head `0150ac0` (Validate + complete isolated Signaling Smoke); Team Lite #76 exact head `578ba8a` (complete Candidate Checks including mutation guard).
- **HISTORICAL AUTOMATED PASS:** Team Lite #75 baseline `7bbf9b9`; superseded by #76 for current signaling work.
- **CODE INSPECTION:** Normal and Team Lite mutation guards/workflows, payload-free candidate `chat_fast` hints, default-off transport flags, decoded production userscripts, production trigger definitions, candidate migrations, RLS/grants/SECURITY DEFINER, and core Edge Function authentication/cache.
- **MANUAL PENDING:** issue #78 and installed-client/device/network/cross-product acceptance.
- **BLOCKED:** RT-01 public Realtime disclosure and legacy public signaling; production trigger/grant hardening and coordinated cutover; rate limiter not integrated into product endpoints; production migrations absent; QA PR #82 base validator failure.
- **NOT VERIFIED:** external public-channel subscriber access; complete route-by-route auth/owner/consumer inventory for 38 Edge Functions; physical no-F5 recovery; production deploy workflow guard in this pass.

Next gates: (1) design and validate a coordinated public-Realtime cutover for both clients and database triggers, including legacy-client behavior and a trusted authenticated transport; (2) integrate the distributed rate limiter into both real product endpoints; (3) prepare separate reviewed production migrations and validate them in official TEST, keeping `*_test.sql` out of production migration runs; (4) revoke unnecessary trigger-function/table grants only after the TEST plan and rollback are approved; (5) complete the 38-function route/auth/consumer inventory; (6) perform manual no-F5, device, and installed Normal ↔ Team Lite acceptance; (7) pin the Normal smoke workflow checkout and disable persisted credentials; (8) review #74's 609-commit ancestry and refresh stale PR/issue summaries before any merge decision.

### Safety record

No production SQL write, migration, Edge Function deployment, secret/flag change, userscript publication, PR merge, destructive operation, issue edit, or engineering-branch edit was performed. QA did not run fixture-mutating scripts or trigger/rerun workflows. Existing engineering CI logs were inspected; CI fixture writes shown in those logs were confined to the exact allowlisted isolated project and cleanup was verified. All SQL executed by QA was read-only. The only repository write for this pass is this append to `docs/RELEASE_READINESS.md` on the dedicated QA branch, using the freshly fetched blob SHA. No completion percentage is reported.


## QA documentation commit validation follow-up — 2026-11-05

The append above was committed as `286819fa564e8f81603922431d29233934c7113e` (blob `bdd520bed6d403d49570f63985927366d3000a2a`). Exact-head Validate [42036998107](https://github.com/Reekyi/UpStatus/actions/runs/42036998107) completed FAILURE in `scripts/validate.mjs:26` with `production updateURL mismatch`. The job's checkout succeeded and the Validate build step failed. This is the same baseline URL assertion observed on the previous QA commit; PR #82 still changes only this Markdown file. No validator bypass or runtime change was made. Keep #82 Draft. The failure is recorded as a documentation-branch validation blocker, not a failure of the audit findings.

## Revalidation 2026-11-05 14:30 UTC — exact-head smoke, fixture guards and production Realtime

This pass re-read the QA readiness document before inspecting current PR refs, issue state, exact-head workflow jobs/logs, candidate source, deployed Edge Function source, Supabase migrations/advisors and read-only PostgreSQL catalogs. No workflow was dispatched and no fixture script was run by QA.

### Current GitHub refs and review state

| PR | Current head | Base | GitHub state | Review |
|---|---|---|---|---|
| #74 Normal | `f59cf57d82d171029c081843a655423fa2c1f95a` | `master` | Open, Draft, mergeable=true; 612 commits, 51 files | No submitted reviews or inline threads |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | `team-lite-official` | Open, Draft; 59 commits, 10 files | No submitted reviews or inline threads |
| #76 Team Lite signaling | `578ba8a44dd67401a4bad0db897980c91fea3df5` | `team-lite-official` | Open, Draft; 160 commits, 22 files | No submitted reviews or inline threads |
| #82 QA documentation | `2b9fbf3809c89659eaa978f3cbf83b8dd9685a15` | `master` | Open, Draft; 23 commits, one file | No submitted reviews or inline threads |

No PR is merged. GitHub reports #74, #76 and #82 as mergeable, but mergeability is not a security or history review. #74 is 612 commits ahead of master and requires a deliberate merge-base/history review before any merge decision. Compare #75...#76 is 101 commits ahead and zero behind; #76 is a descendant/continuation of #75, not an independent release payload. #82 remains documentation-only.

Since the prior Normal head `0150ac0276a55bd32fbb46acc68c15df5b5403d0`, compare confirms exactly three commits affecting only `.github/workflows/signaling-smoke.yml` and `scripts/signaling-static.test.mjs`. These pin checkout and add static regression assertions; they do not change the runtime implementation.

### Exact-head automated evidence

| Candidate | Exact head | Run | Result |
|---|---|---|---|
| Normal Validate | `f59cf57d82d171029c081843a655423fa2c1f95a` | [42040877440](https://github.com/Reekyi/UpStatus/actions/runs/42040877440) | **AUTOMATED PASS** |
| Normal Signaling Smoke | same | [42040877642](https://github.com/Reekyi/UpStatus/actions/runs/42040877642) | **AUTOMATED PASS** |
| Team Lite Candidate Checks | `578ba8a44dd67401a4bad0db897980c91fea3df5` | [42024542507](https://github.com/Reekyi/UpStatus/actions/runs/42024542507) | **AUTOMATED PASS** |
| Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | Historical pass; superseded for current signaling work by #76 |
| QA documentation | `2b9fbf3809c89659eaa978f3cbf83b8dd9685a15` | [42037114517](https://github.com/Reekyi/UpStatus/actions/runs/42037114517) | **BLOCKED** by unchanged master validator assertion |

Normal Signaling Smoke job `127293440174` completed every step successfully. Its log confirms:

- 14/14 signaling static regression groups and 14/14 unauthenticated endpoint checks passed.
- 86/86 authenticated integration checks passed.
- Chromium WebRTC call, voice-room and screen-share negotiation delivered remote audio/video tracks; browser peers and local media were torn down.
- Dynamic invitation/roster/fanout and three-member pairwise mesh checks passed, including teardown.
- Distributed endpoint rate limit accepted 90 requests and rejected one with HTTP 429.
- Rate-limit concurrency and atomic chat-receipt concurrency tests passed.
- Temporary users, sessions, rooms, memberships and events cleanup was verified.

Normal Validate also passed chat regressions, untrusted Realtime payload handling, targeted media signaling and updater tests.

Team Lite run 42024542507 passed on its exact current head. Its job confirms the isolation guard, authenticated adapter, endpoint authentication, 86/86 authenticated integration checks, Chromium call/voice/screen flows, three-member mesh/teardown, 90 accepted plus one HTTP 429, rate-limit concurrency/reset, atomic receipt concurrency, userscript version 3.4.31, portal syntax/session isolation and updater scenarios.

These are **AUTOMATED PASS** results against the isolated project `bfpjtfqlnypisxljoxkb`. They are not production validation or physical Tampermonkey/network-loss acceptance.

The QA PR's run 42037114517 failed in `scripts/validate.mjs` with `VALIDATION FAILED: production updateURL mismatch`. The current master `.github/workflows/validate.yml` runs on all pushes/PRs to master/develop and has no documentation path exclusion. #82 changes only `docs/RELEASE_READINESS.md`; this is a **base-validator blocker**, not evidence of a runtime regression. Do not weaken the validator merely to green the documentation PR.

### Workflow and fixture-safety recheck

The Normal branch now has the same fixture safety contract previously introduced in Team Lite:

- Exact allowlist: `https://bfpjtfqlnypisxljoxkb.supabase.co`.
- Requires `SUPABASE_SERVICE_ROLE_KEY` and explicit `UPSTATUS_SIGNAL_ALLOW_MUTATION=1`.
- Performs a read-only PostgREST preflight before fixture writes.
- Rejects unexpected origin/path/query/credentials and missing opt-in/key.
- Rate-limit and receipt test scripts fail closed rather than returning a successful SKIP.
- Authenticated runner and browser harness require the explicit mutation opt-in.

The current Normal smoke workflow now pins `actions/checkout` to `de0fac2e4500dabe0009e67214ff5f5447ce83dd` and sets `persist-credentials: false`; its static test enforces both. Team Lite uses the same pin and credential setting. Both workflows serialize use of the shared isolated fixture project. No workflow was manually dispatched by this audit.

**Resolved from the previous QA note:** Normal's checkout pin/credential persistence and fail-closed fixture guard are no longer open findings. The exact-head Normal run proves the protected fixture tests actually ran; its logs show successful cleanup.

The manual production workflow remains a **CODE INSPECTION** concern: `.github/workflows/deploy-production.yml` is workflow-dispatch only, uses the `production` environment, checks stable release version 3.4.7, and deploys only Edge Function `upstatus`. It uses Supabase CLI `latest`, does not apply database migrations, and the YAML has no explicit approved-ref allowlist or assertion that `SUPABASE_PROJECT_ID` equals the expected production project. External GitHub Environment required-reviewer protections were not inspected, so no claim is made about those controls. A production workflow must not be run as part of this audit.

### Candidate Realtime code versus deployed bundles

**Candidate CODE INSPECTION:** Normal and Team Lite now emit `chat_fast` without a message object:

- Normal userscript template: lines 3145 and 3187 call `sendRealtimeEvent('chat_fast')`.
- Team Lite userscript: lines 3598 and 3640 call `sendRealtimeEvent('chat_fast')`.
- Both `handleRealtimeChatFast()` handlers only schedule an authenticated chat refresh; they do not consume a supplied message object.
- Both `db_change` listeners ignore the broadcast payload and schedule a refresh.

This closes the direct full-message payload in the **current candidate client code**. It does not close the production path.

**Production source inspection:** the three deployed bundles were decoded from the current Edge Function sources:

| Edge Function | Edge version | Embedded userscript | Full-message `chat_fast` send sites | `payload.message` reads |
|---|---:|---|---:|---:|
| `upstatus` | 480 | 3.4.7 | 2 | 1 |
| `upstatus-team-lite` | 15 | 3.4.30 | 2 | 1 |
| `upstatus-screen-share-3-1-1-beta10` | 6 | 3.1.1-beta8 | 2 | 1 |

All three deployed sources still use a 30-second warm-instance session revalidation window, do not call `merge_chat_read_receipts` or `consume_upstatus_signal_rate_limit`, and validate the custom `x-upstatus-token` against `upstatus_sessions`. All 38 Edge Functions report `verify_jwt=false`; this is not proof of absent application authentication. Only the three core runtime sources above were inspected for the custom-token flow. The route-by-route authentication/ownership/consumer inventory for the remaining functions is still **NOT VERIFIED**.

**Production catalog confirms the independent database disclosure path:** trigger `upstatus_messages_broadcast` is enabled and calls `public.upstatus_broadcast_messages()`. The live function is SECURITY DEFINER with `search_path=public`; it serializes OLD on DELETE or NEW otherwise using `to_jsonb`, then calls `realtime.send` with `{op, record}`, event `db_change`, and `private=false`. The message row contains text and attachment/interaction metadata.

Two other enabled triggers also publish to the same public topic:

- `upstatus_broadcast_remote_state()` publishes selected remote command/result fields (sender, target, status, reason, timestamps and result metadata) using `private=false`.
- `upstatus_broadcast_users()` publishes name, status, reason, update timestamp and sync metadata using `private=false`.

The candidate migrations `20261103160000_minimize_public_chat_broadcast.sql` and `20261103170000_minimize_public_status_broadcasts.sql` reduce these payloads to `{op: TG_OP}` and set function search_path to `pg_catalog, public`. They still call `realtime.send(..., false)`: the topic remains public. These migrations are not in production's migration history and have not been applied.

The candidate signaling transport remains opt-in/default-off in both userscripts (`signaling_transport_enabled=false`). Therefore the default client flow still relies on legacy public Realtime for call, voice-room and screen-share signaling. Empty `chat_fast` and minimized trigger payloads are useful defense-in-depth, but they do not authenticate channel membership or secure the legacy signaling path.

**RT-01 remains BLOCKED.** Supabase's current authorization guide requires RLS policies on `realtime.messages`, private-channel configuration (`private: true`) and disabling public access in Realtime settings; authorization uses the user's Auth JWT and topic. The UpStatus client currently presents a custom session token, not a Supabase Auth JWT. The migration plan therefore needs a trusted JWT exchange or a server-mediated replacement, explicit topic/membership policies, client cutover and rollback, followed by unauthorized-subscription and cross-user tests. See [Supabase Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization).

### Production Supabase catalog, migrations and advisors — read-only

Project `dlfvkawaiqduhlazsszm` is `ACTIVE_HEALTHY`, region `us-west-2`, PostgreSQL 17.11.0.002. Production has seven recorded migrations; latest is `20261027155438`.

The following objects remain absent in production:

- `public.upstatus_signal_rate_limits`
- `public.consume_upstatus_signal_rate_limit(text, integer, integer)`
- `public.merge_chat_read_receipts(text, jsonb, timestamptz)`

The nine backend-owned public tables `chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing` and `users` have RLS enabled, zero policies and `FORCE ROW LEVEL SECURITY=false`. The current role-table-grant query shows client grants for INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER to both `anon` and `authenticated`. This is unnecessary privilege surface; RLS with no policies means the grant inventory alone does not prove direct row access. `upstatus_visual_config` has RLS enabled and no client grants.

The `realtime.messages` parent has RLS enabled, no policies, and anon/authenticated INSERT, SELECT and UPDATE grants. Do not infer direct row access from grants alone and do not revoke these blindly while clients still depend on the public channel.

The three trigger functions `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()` and `upstatus_broadcast_users()` remain SECURITY DEFINER with `search_path=public`. Catalog privilege checks confirm EXECUTE for `anon`, `authenticated` and `service_role`. Candidate migrations `20261029170500_restrict_trigger_function_execute.sql` and `20261029183000_revoke_unused_public_table_grants.sql` revoke unnecessary client privileges, but they are not applied to production.

Security Advisor observed at 2026-11-05 14:30:41 UTC:

- WARN `anon_security_definer_function_executable`: 3 functions.
- WARN `authenticated_security_definer_function_executable`: the same 3 functions.
- INFO `rls_enabled_no_policy`: 10 relations.
- Performance Advisor: no findings.
- Health Advisor: no findings.

These are catalog/advisor findings, not exploit demonstrations.

### Product integration and migration packaging

Both candidate server templates use `SESSION_CACHE_TTL_MS=5000` and call `merge_chat_read_receipts` from `readRoute`. Neither candidate product endpoint calls `consume_upstatus_signal_rate_limit`. The distributed limiter is exercised by the isolated test endpoint and concurrency scripts only. RT-09 therefore remains **PARTIAL** until the limiter is integrated into both product-facing endpoints and tested there.

The two timestamped files with `_test.sql` suffix remain inside `supabase/migrations/` on the candidate branches:

- `20261104152847_atomic_chat_read_receipts_and_visual_config_grants_test.sql`
- `20261104154623_distributed_signaling_rate_limit_test.sql`

The suffix is not an exclusion mechanism. Supabase documents that `supabase db push` compares the local migrations folder with `supabase_migrations.schema_migrations` and applies pending migration files in order. Do not point production at these test files. Produce separately reviewed production migration files and validate ordering, data compatibility, permissions, rollback and trigger behavior in official TEST first. See [Supabase Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations) and [supabase db push](https://supabase.com/docs/reference/cli/supabase-db-push).

Production's seven-migration history confirms none of these candidate RPCs or hardening migrations has been installed. The current production deploy workflow deploys only `upstatus` and does not run `db push`; merging code alone does not install the required database objects.

### Issues and manual acceptance

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) remains open with three comments and unchecked acceptance criteria. There is no recorded physical test of an approximately 10-second internet interruption and recovery without F5 in both clients.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) remains open with 42 comments. Its body still contains the 2026-11-03 candidate SHAs/run table. Its latest engineering comment at 11:03 BRT still describes Normal smoke as pending; run 42040877642 subsequently completed successfully. The issue has not been edited by QA.

**MANUAL PENDING:** real Tampermonkey profiles, microphone permission/capture and bidirectional audio, display capture/stop-sharing, real network loss/recovery without F5, voice-room re-entry, new calls after reconnect, repeated drops, unaffected participants, no orphan peers/duplicate pollers, and installed Normal ↔ Team Lite cross-client acceptance. Chromium CI is not a substitute for these device/network tests.

### Updated gates

1. **BLOCKED — RT-01:** remove the full-row public database broadcast and replace the default public signaling transport with an authenticated/private or server-mediated design; validate unauthorized subscription and cross-user isolation.
2. **PARTIAL — RT-09:** integrate distributed rate limiting into both actual product endpoints and validate per-user quotas, concurrency, HTTP 429, retry semantics and cleanup.
3. **CANDIDATE INTEGRATED / PRODUCTION NOT VERIFIED — receipts:** validate the atomic receipt migration in official TEST, then sequence its authorized production migration before deploying templates that call the RPC.
4. **PENDING — migration packaging:** separate the two test-suffixed migrations from the production migration stream; create reviewed production migrations with rollback and compatibility plans.
5. **PENDING — production hardening:** validate trigger-function EXECUTE revocation, backend-owned table grant revocation and Realtime authorization in official TEST. Do not change production without explicit authorization.
6. **PENDING — Edge inventory:** classify authentication, owner, consumers and rollback requirements for all 38 ACTIVE functions; do not disable historical test/backup/beta functions blindly.
7. **MANUAL PENDING — #78:** complete physical no-F5 recovery and voice/call/screen acceptance in Normal and Team Lite.
8. **PENDING — coordinated release:** align Normal artifact/API endpoint, Team Lite 3.4.31 candidate versus deployed 3.4.30, 5-second session-cache behavior, migrations, authenticated transport and rollback.
9. **PENDING — review process:** obtain human reviews for #74/#76 and review #74's 612-commit ancestry before merge consideration; refresh issue #79's stale release snapshot.
10. **BLOCKED — QA PR #82 validation:** master validator's existing `production updateURL mismatch` must be addressed by repository maintainers or explicitly accepted as a documentation-only exception; do not bypass it in this audit.

### Safety record

This pass used GitHub read APIs, existing workflow logs, source-file reads, Supabase project metadata/advisors and read-only SQL. No tests or workflows were launched by QA. The exact-head CI runs above were initiated by engineering and their logs confirm fixture use only in the allowlisted isolated project with explicit mutation opt-in and cleanup. No production SQL write, migration, Edge Function deployment, secret/flag change, userscript publication, PR merge, destructive operation or engineering-branch edit was performed. The only repository write is this documentation update on the isolated QA branch, guarded by the current file blob SHA. No completion percentage is reported.

### Evidence links

- [PR #74 Normal](https://github.com/Reekyi/UpStatus/pull/74)
- [PR #75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75)
- [PR #76 Team Lite signaling](https://github.com/Reekyi/UpStatus/pull/76)
- [PR #82 QA documentation](https://github.com/Reekyi/UpStatus/pull/82)
- [Issue #78 reconnect acceptance](https://github.com/Reekyi/UpStatus/issues/78)
- [Issue #79 release checklist](https://github.com/Reekyi/UpStatus/issues/79)
- [Normal Validate 42040877440](https://github.com/Reekyi/UpStatus/actions/runs/42040877440)
- [Normal Signaling Smoke 42040877642](https://github.com/Reekyi/UpStatus/actions/runs/42040877642)
- [Team Lite Candidate Checks 42024542507](https://github.com/Reekyi/UpStatus/actions/runs/42024542507)
- [QA Validate 42037114517](https://github.com/Reekyi/UpStatus/actions/runs/42037114517)


## Revalidation 2026-11-05 15:37 UTC — current refs, CI, production catalog and deploy controls

This pass re-read this file first, then refreshed PR/issue refs, exact-head workflow runs and jobs, current candidate templates/workflows/migrations, deployed Edge Function source, production migration inventory, Supabase advisors and read-only PostgreSQL catalogs. The candidate heads are unchanged from the 14:30 UTC checkpoint. No workflow was dispatched and no fixture script was run by QA.

### Exact GitHub refs and reviews

| PR | Exact head | Base | Current state | Compare |
|---|---|---|---|---|
| #74 Normal | `f59cf57d82d171029c081843a655423fa2c1f95a` | `master` | Open / Draft / mergeable=true; 612 commits, 51 files | 612 ahead, 0 behind |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | `team-lite-official` | Open / Draft / mergeable=true; 59 commits, 10 files | Historical baseline |
| #76 Team Lite signaling | `578ba8a44dd67401a4bad0db897980c91fea3df5` | `team-lite-official` | Open / Draft / mergeable=true; 160 commits, 22 files | 101 ahead of #75, 0 behind |
| #82 QA documentation | `f4bdf93fe0a1d778e6aa8603501c6a138c8193f6` | `master` | Open / Draft / mergeable=true; 24 commits, one file | 24 ahead, 0 behind |

#76 is a continuation/descendant of #75, not an independent release payload. #74's merge base is master `a9288ccfcb0f308d3a587bfca624418a395be07b`; its 612-commit ancestry and 51-file diff still require deliberate history review. GitHub's mergeable flag is not a security or ancestry approval. No submitted reviews or inline review threads were found on #74, #75, #76 or #82. No PR is merged.

### Exact-head CI evidence

| Candidate | Exact head | Run | Result |
|---|---|---|---|
| Normal Validate | `f59cf57d82d171029c081843a655423fa2c1f95a` | [42040877440](https://github.com/Reekyi/UpStatus/actions/runs/42040877440) | **AUTOMATED PASS** |
| Normal Signaling Smoke | same | [42040877642](https://github.com/Reekyi/UpStatus/actions/runs/42040877642) | **AUTOMATED PASS** |
| Team Lite Candidate Checks | `578ba8a44dd67401a4bad0db897980c91fea3df5` | [42024542507](https://github.com/Reekyi/UpStatus/actions/runs/42024542507) | **AUTOMATED PASS** |
| Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | Historical **AUTOMATED PASS**, superseded by #76 |
| QA documentation | `f4bdf93fe0a1d778e6aa8603501c6a138c8193f6` | [42046974106](https://github.com/Reekyi/UpStatus/actions/runs/42046974106) | **BLOCKED** by baseline validator failure |

Normal Signaling Smoke job `127293440174` completed every step successfully: harness syntax, 14/14 unauthenticated endpoint checks, 86/86 authenticated API checks, Chromium call/voice/screen WebRTC with remote tracks, three-member pairwise mesh and teardown, 90 accepted + one HTTP 429, distributed rate-limit concurrency, atomic receipt concurrency, and isolated fixture cleanup. Normal Validate job `127291052964` passed.

Team Lite job `127236981895` completed every step successfully on the exact #76 head: isolation guard, adapter and endpoint authentication, 86/86 authenticated checks, browser call/voice/screen, three-member mesh/teardown, 90 accepted + one HTTP 429, rate-limit and receipt concurrency, candidate version 3.4.31, updater scenarios and portal/session checks. These are automated isolated-project results, not production validation or physical Tampermonkey acceptance.

QA Validate job `127312466191` checked out merge commit `be5900bdecac6c327d9ebfc23b65ade4a28c46fd` (PR head `f4bdf93` merged into master for validation), built Normal 3.4.7 / TEST 3.4.7, then failed at `scripts/validate.mjs:26`: `production updateURL mismatch`. PR #82 changes only `docs/RELEASE_READINESS.md`; this is the existing master/base validator contract, not a runtime regression in this documentation diff. Keep #82 Draft; do not weaken the validator to force green.

### Candidate source and migration inspection

**CODE INSPECTION:** both candidate userscripts now emit `chat_fast` as an empty invalidation event at both send sites; neither attaches the message object. Their receivers schedule authenticated chat refreshes rather than trusting a broadcast-supplied row. The exact candidate files are Normal `src/userscript/upstatus.user.template.js` (blob `25bbc080157a43ca56495a8d0379cff30de3a4ec`) and Team Lite `team-lite/upstatus-team-lite.user.js` (blob `73a72a0f6ddbc37e5b727af9495cbbee3a7cb3f9`).

The authenticated signaling flag is still explicitly default-off in both clients (`GM_getValue(..., false) === true`). The Normal comment describes it as an opt-in migration path; Team Lite explicitly says legacy calls remain unchanged while disabled. Therefore the authenticated transport is not yet the default path for installed users. The candidate SQL migrations `20261103160000_minimize_public_chat_broadcast.sql` and `20261103170000_minimize_public_status_broadcasts.sql` reduce event payloads to `{op: TG_OP}`, but still pass `false` as the `realtime.send` private-channel argument. They minimize data; they do not make the topic private.

Both product server templates set session-cache revalidation to 5 seconds and call `merge_chat_read_receipts` from the read route. Neither product template calls `consume_upstatus_signal_rate_limit`; the distributed limiter is tested only through the isolated test endpoint, so RT-09 remains **PARTIAL**.

The timestamped files ending in `_test.sql` remain inside `supabase/migrations/`. They contain real DDL: the receipt file creates/replaces `merge_chat_read_receipts` and changes grants; the rate-limit file creates `upstatus_signal_rate_limits`, an index, RLS and the RPC. The suffix is not an exclusion mechanism for Supabase migration discovery. Keep these test artifacts out of any production migration push; create separately reviewed production migrations and validate them in official TEST.

The production deploy workflow `.github/workflows/deploy-production.yml` is `workflow_dispatch` only, uses the `production` GitHub environment and checks `release.json` for stable version 3.4.7. It deploys only Edge Function `upstatus`, does not apply migrations, and uses Supabase CLI `latest`. **Additional CODE INSPECTION gate:** the step named “Checkout approved release ref” does not specify an explicit `ref:`; the workflow has no YAML-level allowlist for the dispatch branch/SHA and no assertion that `SUPABASE_PROJECT_ID` equals `dlfvkawaiqduhlazsszm`. External GitHub Environment required-reviewer protections were not inspected, so their presence/absence is **NOT VERIFIED**. Do not run this workflow as part of QA.

### Production Supabase — read-only snapshot

Project `dlfvkawaiqduhlazsszm` is `ACTIVE_HEALTHY`, region `us-west-2`, PostgreSQL 17.11. The migration inventory still has seven entries, latest `20261027155438`. The following remain absent: `public.upstatus_signal_rate_limits`, `public.consume_upstatus_signal_rate_limit(text, integer, integer)`, and `public.merge_chat_read_receipts(text, jsonb, timestamptz)`.

The three active production runtime functions remain:
- `upstatus`: Edge version 480, embedded userscript 3.4.7, source SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`.
- `upstatus-team-lite`: Edge version 15, embedded userscript 3.4.30, source SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`.
- `upstatus-screen-share-3-1-1-beta10`: Edge version 6, embedded userscript 3.1.1-beta8, source SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`.

Decoded embedded userscripts in all three deployed sources still have two full-message `chat_fast` send sites and one `payload.message` read. All three server sources validate the custom `x-upstatus-token`; all three lack calls to the rate-limit and receipt RPCs. Their session-cache revalidation interval remains 30,000 ms. All 38 production Edge Functions are ACTIVE and report `verify_jwt=false`; this is gateway configuration, not proof that all routes are unauthenticated. Only the three core runtime functions were inspected for the custom-session flow; the route-by-route auth/owner/consumer inventory for the other 35 remains **NOT VERIFIED**.

The production trigger `upstatus_messages_broadcast` is enabled on `public.messages` and calls `upstatus_broadcast_messages()`. The live function is SECURITY DEFINER, `search_path=public`, serializes OLD/NEW with `to_jsonb`, and publishes `{op, record}` on `db_change` with `private=false`. The two other enabled broadcast triggers publish remote-state and user-status metadata on the same public topic. Candidate payload minimization has not been applied to production.

Catalog checks show the three broadcast functions remain SECURITY DEFINER with `search_path=public`; effective EXECUTE is true for `anon`, `authenticated` and `service_role`. Ten public tables (the nine backend-owned tables plus `upstatus_visual_config`) and `realtime.messages` all have RLS enabled, zero policies and `FORCE ROW LEVEL SECURITY=false`. The nine backend-owned tables retain broad client grants including CRUD/TRUNCATE/REFERENCES/TRIGGER; `upstatus_visual_config` has no anon/authenticated grants. `realtime.messages` retains anon/authenticated SELECT/INSERT/UPDATE grants. Grants are a privilege-surface finding; RLS with no policies means this catalog alone does not demonstrate direct row access.

Security Advisor observed at 2026-11-05 15:36:58 UTC:
- WARN `anon_security_definer_function_executable`: 3 functions.
- WARN `authenticated_security_definer_function_executable`: the same 3 functions.
- INFO `rls_enabled_no_policy`: 10 relations.
- Performance Advisor: no findings.
- Health Advisor: no findings.

### Issues and manual acceptance

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) remains open with three comments and all acceptance checkboxes unchecked. The physical ~10-second internet-loss/recovery test without F5 remains **MANUAL PENDING** for both clients, including room re-entry, new calls, repeated drops, bidirectional audio and unaffected peers.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) remains open with 43 comments. Its body still contains a 2026-11-03 snapshot. The latest engineering comment [#6661366138](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6661366138), at 12:01 BRT, records the exact Normal/Team Lite CI heads and the production read-only findings; it does not close the release gates.

Manual acceptance remains pending for separate Tampermonkey profiles, real microphone permissions/audio, real display capture/stop-sharing, real network loss/recovery without F5, voice-room re-entry, new calls after reconnect, and installed Normal ↔ Team Lite cross-client tests. Chromium CI is not a substitute.

### Updated gates

1. **BLOCKED — RT-01:** remove full-row public message broadcasts and replace default public signaling with a private/authenticated or server-mediated design; validate unauthorized subscriptions and cross-user isolation. The custom UpStatus token is not automatically a Supabase Auth JWT.
2. **PARTIAL — RT-09:** integrate the distributed limiter into both actual product endpoints; test per-user quotas, concurrency, 429, retry semantics and cleanup.
3. **PENDING — production migration packaging:** keep test-suffixed DDL out of the deploy stream; produce reviewed production migrations and test ordering, permissions, data compatibility and rollback in official TEST.
4. **PENDING — production hardening:** validate trigger-function EXECUTE revocations, backend-owned table grant revocations and Realtime policy/channel design in official TEST before any production change.
5. **PENDING — Edge inventory:** classify auth, owner, consumers and rollback for all 38 functions; inspect the remaining 35 before disabling anything.
6. **MANUAL PENDING — #78:** complete physical no-F5 reconnect and device acceptance in Normal and Team Lite.
7. **PENDING — deploy controls:** add explicit approved ref/SHA and expected project-ID assertions; pin Supabase CLI to a reviewed version; inspect GitHub Environment protection rules.
8. **PENDING — review process:** obtain human reviews and review #74's 612-commit ancestry before merge consideration; refresh #79's stale body.
9. **BLOCKED — QA PR #82:** master validator fails at `production updateURL mismatch`; maintainers must fix the baseline contract or explicitly accept a documentation-only exception. Do not bypass it in QA.

### Safety record

This pass used GitHub read APIs, existing Actions logs, source-file reads, Supabase project/function/migration/advisor metadata and SELECT-only catalog SQL. No new workflow was dispatched; no fixture script was run. Existing CI logs confirm the two candidate suites ran in the allowlisted isolated project and cleaned their fixtures. No production write, migration, Edge Function deployment, secret/flag change, userscript publication, merge, destructive operation or engineering-branch edit occurred. The only repository write is this append-only checkpoint on the dedicated QA branch, guarded by the freshly fetched blob SHA. No completion percentage is reported.

### Evidence links

- [PR #74 Normal](https://github.com/Reekyi/UpStatus/pull/74)
- [PR #75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75)
- [PR #76 Team Lite signaling](https://github.com/Reekyi/UpStatus/pull/76)
- [PR #82 QA documentation](https://github.com/Reekyi/UpStatus/pull/82)
- [Issue #78 reconnect acceptance](https://github.com/Reekyi/UpStatus/issues/78)
- [Issue #79 release checklist](https://github.com/Reekyi/UpStatus/issues/79)
- [Normal Validate 42040877440](https://github.com/Reekyi/UpStatus/actions/runs/42040877440)
- [Normal Signaling Smoke 42040877642](https://github.com/Reekyi/UpStatus/actions/runs/42040877642)
- [Team Lite Candidate Checks 42024542507](https://github.com/Reekyi/UpStatus/actions/runs/42024542507)
- [QA Validate 42046974106](https://github.com/Reekyi/UpStatus/actions/runs/42046974106)


### Follow-up dependency check — chat read receipts

A focused read of the current Normal and Team Lite server templates found that each `readRoute` calls `db.rpc("merge_chat_read_receipts", ...)` and immediately throws when the RPC returns an error (Normal line 442; Team Lite line 443). Production catalog checks confirm that RPC is absent. Therefore deploying either candidate server template before its separately reviewed receipt migration is installed would make this route fail at the RPC boundary; the migration is a hard deployment dependency, not optional cleanup. The required order is: validate the production-form migration in official TEST, approve/apply it through the separately authorized migration process, then deploy the matching server template. No such migration or deployment was performed here.


## Revalidation 2026-11-05 16:35 UTC — migration-layout guard, exact candidate heads and production catalog

This section supersedes earlier snapshots wherever the exact head, CI run, issue-comment count, or migration path differs. The readiness file was re-fetched immediately before this append; its blob SHA was `e4abab10423058af7470b92fb6af1164f2c5a555`, and PR #82 still pointed to `40676d360fb65bdb466758caa7f546cc67063671`. No engineering branch was modified.

### Exact GitHub refs and review state

| PR | Exact head | Base | Current state | Compare |
|---|---|---|---|---|
| #74 Normal | `4d07a755fae6ebe6a993b5ef1a563755b40af2a3` | `master` | Open / Draft / mergeable=true; 53 files | 613 ahead, 0 behind |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | `team-lite-official` | Open / Draft / mergeable=true; 10 files | Historical baseline |
| #76 Team Lite signaling | `61672adfdbbd1e020cf5922838404b0958b832e6` | `team-lite-official` | Open / Draft / mergeable=true; 24 files | 102 ahead of #75, 0 behind |
| #82 QA documentation | `40676d360fb65bdb466758caa7f546cc67063671` | `master` | Open / Draft / mergeable=true; one file | 26 ahead, 0 behind |

#76 remains a continuation/descendant of #75, not an independent release payload. #74's 613-commit ancestry and 53-file diff require deliberate history review before merge consideration. GitHub's mergeable flag is not an ancestry or security approval. The four PRs have no submitted reviews and no inline review threads. None is merged.

### Exact-head automated evidence

| Candidate | Exact head | Run | Result |
|---|---|---|---|
| Normal Validate | #74 `4d07a75` | [42062127872](https://github.com/Reekyi/UpStatus/actions/runs/42062127872) | **AUTOMATED PASS** |
| Normal Signaling Smoke | #74 `4d07a75` | [42062127943](https://github.com/Reekyi/UpStatus/actions/runs/42062127943) | **AUTOMATED PASS** |
| Team Lite Candidate Checks | #76 `61672ad` | [42062435489](https://github.com/Reekyi/UpStatus/actions/runs/42062435489) | **AUTOMATED PASS** |
| Team Lite baseline | #75 `7bbf9b9` | [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | Historical **AUTOMATED PASS**, superseded by #76 |
| QA documentation | #82 `40676d3` | [42057223983](https://github.com/Reekyi/UpStatus/actions/runs/42057223983) | **BLOCKED** by baseline validator assertion |

Normal Validate job `127366411858` and Signaling Smoke job `127366413887` both completed successfully. The smoke log confirms the new migration-layout guard, 14/14 static signaling regression groups, 14/14 unauthenticated endpoint checks, 86/86 authenticated integration checks, Chromium call/voice/screen WebRTC with remote tracks, all three pairwise links in the three-member mesh, teardown, 90 accepted plus one HTTP 429, distributed rate-limit concurrency, atomic receipt concurrency, and fixture cleanup.

Team Lite job `127369608239` completed successfully on exact #76 head. Its log confirms the isolated Supabase mutation guard, signaling adapter assertions, 14/14 unauthenticated checks, 86/86 authenticated checks, browser call/voice/screen WebRTC with remote tracks, three-member mesh and teardown, 90 accepted plus one HTTP 429, rate-limit and receipt concurrency, migration-layout guard, candidate version 3.4.31, updater scenarios, userscript syntax, and Lucca/Ycaro portal/session checks.

These are **AUTOMATED PASS** results against the isolated project `bfpjtfqlnypisxljoxkb`. They are not production validation, physical Tampermonkey acceptance, or proof of the current installed-client cutover. No workflow was dispatched by QA; the runs were initiated by engineering.

QA Validate job `127348802307` for run [42057223983](https://github.com/Reekyi/UpStatus/actions/runs/42057223983) built Normal 3.4.7 / TEST 3.4.7 and failed at `scripts/validate.mjs` with `VALIDATION FAILED: production updateURL mismatch`. PR #82 changes only `docs/RELEASE_READINESS.md`; do not weaken the validator to force a green result. Keep #82 Draft pending a maintainer fix or explicit documentation-only exception.

### Resolved candidate packaging risk — test DDL moved out of migration discovery

Engineering moved the two executable test-only SQL files out of `supabase/migrations/` and into `supabase/test-migrations/` on both candidate lines:

- Normal #74: [commit 4d07a75](https://github.com/Reekyi/UpStatus/commit/4d07a755fae6ebe6a993b5ef1a563755b40af2a3).
- Team Lite #76: [commit 61672ad](https://github.com/Reekyi/UpStatus/commit/61672adfdbbd1e020cf5922838404b0958b832e6).

The moved files are:
- `20261104152847_atomic_chat_read_receipts_and_visual_config_grants_test.sql`
- `20261104154623_distributed_signaling_rate_limit_test.sql`

Both branches now include `scripts/migration-layout.test.mjs`. It recursively rejects test-suffixed SQL under `supabase/migrations/`, asserts these two files exist under `supabase/test-migrations/` and not under the CLI discovery directory, and checks the safety README. The Normal Validate/Smoke and Team Lite Candidate Checks workflows run this guard; the exact-head logs above show it passed.

The new `supabase/test-migrations/README.md` explicitly restricts manual use to isolated project `bfpjtfqlnypisxljoxkb` and says not to apply the files to production `dlfvkawaiqduhlazsszm` or the shared/official TEST runtime. It also states that the JavaScript fixture guard does not authorize SQL DDL execution. This closes the prior **candidate layout/discovery risk**. It does not create production migrations, authorize applying the test DDL, or close the migration/cutover gate. No SQL file was applied by QA.

The latest #74 commit changes workflow paths, adds the layout guard and README, updates static-test file paths, and moves the two test SQL files. The latest #76 commit makes the corresponding workflow/guard/path changes. Neither latest commit changes the product runtime templates or userscripts.

### Candidate runtime dependencies and rate-limit integration

**CODE INSPECTION:** Normal `src/server/index.template.ts` (blob `226c08b34c2a73ef49e27f82bff404b4a1f8cdb8`) and Team Lite `src/server/team-lite-index.template.ts` (blob `eec7684d36c3e2fc65a85bd212d3f1fb3bfa8f63`) both set a 5-second session-cache revalidation bound. Both `readRoute` handlers call `db.rpc("merge_chat_read_receipts", ...)` and immediately throw if the RPC returns an error (Normal line 442; Team Lite line 443). Neither server template contains a call to `consume_upstatus_signal_rate_limit`.

The production catalog still has no `public.merge_chat_read_receipts(text,jsonb,timestamptz)`, no `public.upstatus_signal_rate_limits`, and no `public.consume_upstatus_signal_rate_limit(text,integer,integer)`. Therefore:
- Deploying either candidate server template before a separately reviewed receipt migration is installed would make `/api/chat/read` fail at the RPC boundary.
- The distributed rate limiter is still tested on the isolated signaling endpoint but is **not integrated into either real product endpoint**. RT-09 remains **PARTIAL**.
- The test migrations are not production migration artifacts. Produce separate reviewed production migrations, validate in the approved official TEST environment, and sequence the authorized migration before deploying a server template that depends on the receipt RPC.

### Production Supabase — fresh read-only catalog and advisors

Project `dlfvkawaiqduhlazsszm` remains `ACTIVE_HEALTHY`, region `us-west-2`, PostgreSQL 17.11. The migration inventory is still seven entries, latest `20261027155438`. The three rate-limit/read-receipt objects above remain absent.

**Realtime disclosure path — still BLOCKED (RT-01):** production trigger `upstatus_messages_broadcast` runs after INSERT/UPDATE/DELETE on `public.messages` and calls `public.upstatus_broadcast_messages()`. The function remains `SECURITY DEFINER`, `search_path=public`, and serializes the complete OLD/NEW row using `to_jsonb`. It calls `realtime.send(jsonb_build_object('op',TG_OP,'record',rec), 'db_change', <static UpStatus topic>, false)`. The final `false` selects a public broadcast. The other two trigger functions also send public events (`private=false`): remote-state command/result metadata and selected user status fields. The message trigger is the confirmed full-row content/attachment-metadata disclosure path; the other two broadcast selected metadata, not a full row.

The candidate migrations reduce these events to an operation hint but still use `private=false`; payload minimization does not make a channel private. The authenticated signaling flag remains default-off in both candidate clients, so the public legacy transport remains the default until a coordinated cutover. The custom UpStatus token is not automatically a Supabase Auth JWT; do not flip to private Realtime without a trusted JWT exchange or server-mediated design and cross-user authorization tests.

**Realtime catalog nuance:** `realtime.messages` is a partitioned relation (`relkind=p`), RLS enabled, FORCE RLS false, zero policies. `anon` and `authenticated` have effective SELECT/INSERT/UPDATE privileges but not DELETE. `realtime.send(jsonb,text,text,boolean)` is `SECURITY INVOKER` and EXECUTE is effective for anon/authenticated/service_role. With RLS enabled and zero policies, these grants alone do not demonstrate direct row read/write access; do not overstate them. The privileged trigger function is a separate path: its SECURITY DEFINER execution publishes the full message payload to a public topic.

**Public schema grants:** the nine backend-owned tables `chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, and `users` all have RLS enabled, zero policies, FORCE RLS false, and effective anon/authenticated SELECT/INSERT/UPDATE/DELETE grants. `upstatus_visual_config` has RLS enabled, zero policies, and no anon/authenticated table grants. These grants are an unnecessary privilege surface; RLS with no policies means this catalog alone does not establish direct row access.

The three broadcast functions remain SECURITY DEFINER with `search_path=public`; EXECUTE is effective for anon, authenticated and service_role. Security Advisor observed at 2026-11-05 16:35:26 UTC:
- WARN `anon_security_definer_function_executable`: 3 functions.
- WARN `authenticated_security_definer_function_executable`: the same 3 functions.
- INFO `rls_enabled_no_policy`: 10 relations.
- Performance Advisor: no findings.
- Health Advisor: no findings.

### Production Edge Functions and embedded userscripts

The project lists 38 ACTIVE Edge Functions; all report `verify_jwt=false`. This is gateway configuration, not proof that every route is unauthenticated. Source was inspected for the three core runtime functions; their handlers use the custom `x-upstatus-token` session mechanism. The remaining 35 functions still need a route-by-route auth/owner/consumer/rollback inventory (**NOT VERIFIED**).

Freshly fetched and decoded embedded userscripts confirm the deployed runtimes remain old:
- `upstatus`: ACTIVE Edge version 480, userscript 3.4.7, source SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`.
- `upstatus-team-lite`: ACTIVE Edge version 15, userscript 3.4.30, source SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`.
- `upstatus-screen-share-3-1-1-beta10`: ACTIVE Edge version 6, embedded userscript 3.1.1-beta8, source SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`.

Each decoded deployed userscript still has two `chat_fast` send sites attaching `{message: ...}` and one `payload.message` read. Each deployed server source has zero calls to `consume_upstatus_signal_rate_limit` and zero calls to `merge_chat_read_receipts`. The candidate userscripts' empty `chat_fast` invalidation events are not present in these deployed bundles. Production remains on the old code; no deployment or publication was performed.

### Issues and manual acceptance

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) remains open with three comments and all acceptance checkboxes unchecked. The real ~10-second internet-loss/recovery without F5 test remains **MANUAL PENDING** in both products.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) remains open with 44 comments. Its body still contains the 2026-11-03 checklist snapshot. The latest engineering comment [#6663018700](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6663018700) records the migration-layout move and, at comment time, described the new CI runs as pending/in progress. Those runs have since completed successfully as recorded above. The issue body itself was not changed by QA.

Manual acceptance remains pending for separate Tampermonkey profiles, real microphone permissions/capture and bidirectional audio, real display capture/stop-sharing, real network loss/recovery without F5, voice-room re-entry, new calls after reconnect, repeated drops, unaffected participants, no orphan peers/duplicate pollers, and installed Normal ↔ Team Lite cross-client tests. Chromium CI does not substitute for these checks.

### Updated gates

1. **BLOCKED — RT-01:** remove the production full-row public message broadcast and complete a coordinated authenticated/private or server-mediated transport cutover across Normal, Team Lite, legacy clients, triggers, and rollback. Validate unauthorized subscriptions and cross-user isolation.
2. **PARTIAL — RT-09:** integrate the distributed limiter into both real product endpoints; validate per-user quotas, concurrency, 429/retry semantics and cleanup.
3. **PENDING — production migration packaging:** the test-DDL discovery risk is resolved in candidate layout, but separately authored production migrations for receipts, rate limiting and security hardening still require review and official TEST validation.
4. **BLOCKED deployment dependency — read receipts:** install the separately reviewed receipt RPC through the authorized migration process before deploying either server template that calls it.
5. **PENDING — production hardening:** validate trigger-function EXECUTE revocations, backend-owned table grant revocations and Realtime authorization in official TEST before any production change.
6. **PENDING — Edge inventory:** classify auth, owner, consumers and rollback for all 38 functions; only three core functions have source-level auth inspection in this pass.
7. **MANUAL PENDING — #78:** complete physical no-F5 reconnect, real devices and installed Normal ↔ Team Lite acceptance.
8. **PENDING — deploy controls:** add explicit approved ref/SHA and expected project-ID assertions; pin Supabase CLI to a reviewed version; inspect GitHub Environment required-reviewer protection.
9. **PENDING — review process:** obtain human reviews and review #74's 613-commit ancestry before merge consideration; refresh #79's stale body.
10. **BLOCKED — QA PR #82 validation:** master validator still fails with `production updateURL mismatch`; maintainers must fix the baseline contract or explicitly accept a documentation-only exception. Do not bypass it.

### Safety record

This pass used GitHub read APIs, exact-head Actions jobs/logs, candidate source reads, Supabase project/function/migration/advisor metadata, and SELECT-only PostgreSQL catalog queries. No new workflow was dispatched; no fixture script was run by QA. Existing engineering CI logs show fixture tests against the allowlisted isolated project, explicit mutation opt-in and cleanup. No production SQL write, migration, Edge Function deployment, secret/flag change, userscript publication, PR merge, destructive operation, or engineering-branch edit occurred. The only repository write is this append-only documentation update on the dedicated QA branch, guarded by the current file blob SHA. No completion percentage is reported.

### Evidence links

- [PR #74 Normal](https://github.com/Reekyi/UpStatus/pull/74)
- [PR #75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75)
- [PR #76 Team Lite signaling](https://github.com/Reekyi/UpStatus/pull/76)
- [PR #82 QA documentation](https://github.com/Reekyi/UpStatus/pull/82)
- [Issue #78 reconnect acceptance](https://github.com/Reekyi/UpStatus/issues/78)
- [Issue #79 release checklist](https://github.com/Reekyi/UpStatus/issues/79)
- [Normal Validate 42062127872](https://github.com/Reekyi/UpStatus/actions/runs/42062127872)
- [Normal Signaling Smoke 42062127943](https://github.com/Reekyi/UpStatus/actions/runs/42062127943)
- [Team Lite Candidate Checks 42062435489](https://github.com/Reekyi/UpStatus/actions/runs/42062435489)
- [QA Validate 42057223983](https://github.com/Reekyi/UpStatus/actions/runs/42057223983)


## Revalidation 2026-11-05 17:30 UTC — exact CI refresh, default ACL root cause and full Edge inventory

This checkpoint supersedes earlier snapshots where exact heads, run status, issue comment counts, production catalog privileges, or Edge Function inventory differ. The QA file was freshly fetched immediately before this append (blob SHA `b49f766b8a3760911ece5e2b29ff0814cfafd410`); PR #82 still targets the dedicated QA branch at head `e03033544dd91eb23d7b02d61c689ba8bcbbfa26`. Only this document is changed below.

### Exact GitHub refs and automated evidence

| PR | Exact head | State / comparison | Current evidence |
|---|---|---|---|
| #74 Normal | `76de9fbe5b24666aa79b64971b6521249f91a4e0` | Open / Draft; 614 ahead of master, 0 behind; 53 files | Validate [42071213103](https://github.com/Reekyi/UpStatus/actions/runs/42071213103) **AUTOMATED PASS**; Signaling Smoke [42071213058](https://github.com/Reekyi/UpStatus/actions/runs/42071213058) **AUTOMATED PASS** |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Open / Draft; historical baseline | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) historical **AUTOMATED PASS**, superseded for signaling work by #76 |
| #76 Team Lite signaling | `61672adfdbbd1e020cf5922838404b0958b832e6` | Open / Draft; 102 ahead of #75, 0 behind; 24 files | Candidate Checks [42062435489](https://github.com/Reekyi/UpStatus/actions/runs/42062435489) **AUTOMATED PASS** |
| #82 QA documentation | `e03033544dd91eb23d7b02d61c689ba8bcbbfa26` | Open / Draft; 27 ahead of master, 0 behind; one file | Validate [42066570047](https://github.com/Reekyi/UpStatus/actions/runs/42066570047) **BLOCKED** by baseline assertion `production updateURL mismatch` |

#74's latest commit [76de9fb](https://github.com/Reekyi/UpStatus/commit/76de9fbe5b24666aa79b64971b6521249f91a4e0) changes only `scripts/signaling-static.test.mjs`. It adds static assertions that the staged migrations revoke EXECUTE on the three trigger-only SECURITY DEFINER functions and REVOKE ALL PRIVILEGES on the nine backend-owned tables. The exact-head Validate and Smoke runs above both completed successfully. Smoke job `127399317167` reports every step SUCCESS: static harness checks, unauthenticated endpoint checks, authenticated integration/browser checks, distributed rate-limit concurrency and atomic receipt concurrency. Its log confirms 86/86 authenticated checks, call/voice/screen remote media, three-member mesh, 90 accepted plus one HTTP 429, and isolated fixture cleanup. This is **AUTOMATED PASS in the isolated project**, not production validation or manual browser acceptance.

Team Lite job `127369608239` for run 42062435489 also completed every step SUCCESS. The log confirms 86/86 authenticated checks, call/voice/screen remote tracks, three-member mesh, 90 accepted plus one HTTP 429, rate-limit and receipt concurrency, migration-layout guard, userscript/portal syntax, version 3.4.31 and updater scenarios. No workflow was dispatched by QA.

All four PRs remain open and Draft, with no submitted reviews and no inline review threads. #76 is a descendant of #75 and must not be treated as an independent parallel merge. #74's 614-commit ancestry still requires explicit history review; GitHub `mergeable=true` is not an approval.

### New production finding — default ACLs are the root cause of recurring grants

Fresh SELECT-only queries to `pg_default_acl`, `aclexplode`, `pg_roles`, and `has_table_privilege` confirm default privileges in schema `public` for objects created by both owners, `postgres` and `supabase_admin`:

- **Tables:** defaults grant anon, authenticated and service_role SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER and MAINTAIN.
- **Functions:** defaults grant EXECUTE to anon, authenticated and service_role.
- **Sequences:** defaults grant SELECT, UPDATE and USAGE to anon, authenticated and service_role.

The nine existing backend-owned tables also currently report all of those table privileges effective for both anon and authenticated, including **TRUNCATE and MAINTAIN**. All nine have RLS enabled, zero policies and FORCE RLS false. RLS does not filter table-level TRUNCATE/MAINTAIN privileges. No direct exploit through PostgREST was demonstrated; the finding is an excessive effective privilege surface, not a claim that a public REST request can successfully truncate a table. `upstatus_visual_config` has no client grants.

The existing candidate migration `20261029183000_revoke_unused_public_table_grants.sql` revokes current-object grants, and `20261029170500_restrict_trigger_function_execute.sql` revokes direct client EXECUTE on the three trigger functions. Neither changes `pg_default_acl`. Consequently, a later table/function/sequence created by either owner can inherit the same client grants again. The new #74 static regression added at 76de9fb checks migration text for current-object REVOKE statements; it does **not** test or remediate default ACLs.

### Administrative authority limitation — supabase_admin defaults

The same read-only catalog query reports:
- `current_user = session_user = postgres`;
- `postgres` is not a superuser and is not a member of `supabase_admin`;
- `supabase_admin` is a login-enabled superuser.

Therefore a normal migration/session running as `postgres` cannot alter default privileges owned by `supabase_admin` using `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin`. Engineering recorded this limitation in [issue #79 comment 6664265799](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6664265799). No role switch, membership grant, credential request, default-ACL change or write was attempted.

Split the remediation into two separately authorized paths:
1. Prepare and validate default-ACL hardening for objects created by `postgres` through the normal migration process in official TEST.
2. Obtain a supported administrative mechanism, explicitly authorized by the project owner/Supabase, for defaults owned by `supabase_admin`. Do not try to bypass the role boundary or ship a migration that will fail under the available `postgres` executor.

Preserve owner and service_role privileges deliberately, and cover tables, functions and sequences. Re-query default ACLs and effective privileges after the authorized change. This is a new **BLOCKED security-hardening gate (ACL-02)**.

### Production catalog and Realtime — unchanged

Project `dlfvkawaiqduhlazsszm` remains `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002, seven migrations through `20261027155438`. The rate-limit table/RPC and `merge_chat_read_receipts(text,jsonb,timestamptz)` remain absent.

The message trigger `upstatus_messages_broadcast` still invokes `public.upstatus_broadcast_messages()`. The function remains SECURITY DEFINER with `search_path=public`, serializes the OLD/NEW message row using `to_jsonb`, and calls `realtime.send(..., 'db_change', ..., false)`. The final `false` is the public-channel flag. The three broadcast functions remain EXECUTE-able by anon/authenticated/service_role. `realtime.messages` has RLS enabled, zero policies, and anon/authenticated SELECT/INSERT/UPDATE; no DELETE/TRUNCATE was observed. Do not infer direct row access from these grants alone.

Security Advisor observed at 2026-11-05 17:30:35 UTC:
- WARN `anon_security_definer_function_executable`: 3 functions.
- WARN `authenticated_security_definer_function_executable`: the same 3 functions.
- INFO `rls_enabled_no_policy`: 10 relations.
- Performance and Health Advisors: no findings.

### Full Edge Function metadata/source inventory

The Supabase API lists **38/38 functions ACTIVE**, all with `verify_jwt=false`. This is gateway metadata, not proof that every route is unauthenticated. I fetched the source bundle for all 38 functions. Thirty-seven have non-empty `index.ts` entrypoints and contain the custom UpStatus token/session lookup pattern (`x-upstatus-token`, token hashing and `upstatus_sessions`) in static inspection. This marker scan does not prove every route in every historical copy enforces the guard correctly; route-by-route authorization and consumer review remains required.

**New anomaly:** `upstatus-backup-327-pre328` is ACTIVE (version 1, `verify_jwt=false`) but its retrieved entrypoint `index.ts` is **zero bytes** (source SHA `3d6c4f8e5f777830ea720ab2938cb023b5a4e4c7d26f3fc02b926ce0e4d0dd90`). Its runtime behavior was not probed. Treat this as **NOT VERIFIED / inventory anomaly**, not as evidence of a working or exploitable endpoint. Identify owner/consumers and decide its fate through a separately reviewed cleanup plan; do not disable it blindly.

The active inventory includes multiple `upstatus-test*`, `upstatus-screen-share-*-beta*`, and `upstatus-backup*` endpoints. All remain deployed/ACTIVE. Create an explicit owner, purpose, auth, data-access, consumer, retention and rollback record for each before retiring any. Only the three principal runtime functions were fully examined for embedded userscript behavior:

| Function | Edge version | Embedded userscript | Source SHA |
|---|---:|---|---|
| `upstatus` | 480 | 3.4.7 | `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd` |
| `upstatus-team-lite` | 15 | 3.4.30 | `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb` |
| `upstatus-screen-share-3-1-1-beta10` | 6 | 3.1.1-beta8 | `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29` |

Decoded deployed scripts still have two `chat_fast` send sites attaching complete message objects and one `payload.message` read. Their server sources contain zero calls to `consume_upstatus_signal_rate_limit` and zero calls to `merge_chat_read_receipts`; session-cache revalidation remains 30 seconds. Candidate code changes have not reached these deployed bundles.

### Deploy workflow inspection

Current candidate `.github/workflows/deploy-production.yml` blob SHA `8252c6c6e7005c98625603b5b02b14cb1e50a519` has a pinned checkout action SHA and `persist-credentials: false`, which closes the earlier checkout-action concern. Remaining gaps:
- the checkout step does not set an explicit approved `ref`/commit SHA despite its name “Checkout approved release ref”;
- the workflow does not assert that `SUPABASE_PROJECT_ID` equals the expected production project `dlfvkawaiqduhlazsszm`;
- Supabase CLI is configured as `latest`, not a reviewed fixed version;
- this workflow deploys only Edge Function `upstatus`, not Team Lite;
- GitHub Environment required-reviewer/protection settings were not inspected.

It is manual and uses environment `production`, and validates stable version 3.4.7. Do not treat those controls as a substitute for explicit ref/project assertions. No workflow was run.

### Issues and manual acceptance

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) remains open with three comments; all acceptance checkboxes remain unchecked. Physical ~10-second network loss/recovery without F5 is still **MANUAL PENDING**.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) is open with 47 comments and a stale 2026-11-03 body. Latest engineering notes include default ACL root cause [6664233350](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6664233350) and the `supabase_admin` authority limitation [6664265799](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6664265799). The issue body was not edited by QA.

### Updated release gates

1. **BLOCKED — RT-01:** remove full-row public message broadcasts and complete coordinated authenticated/private or server-mediated transport cutover, including legacy clients, Normal, Team Lite, trigger changes, authorization and rollback.
2. **BLOCKED — ACL-02:** remediate default ACLs for both `postgres` and `supabase_admin`; the latter requires an explicitly supported administrative path. Current-object REVOKE migrations alone do not close this.
3. **PENDING — current object grants:** validate current-table/function revocations in official TEST, preserving service_role/owner access; include TRUNCATE and MAINTAIN in effective-privilege assertions.
4. **PARTIAL — RT-09:** integrate distributed rate limiting into both actual product endpoints and test per-user quotas, concurrency, HTTP 429, retry guidance and cleanup.
5. **BLOCKED deployment dependency — read receipts:** install the separately reviewed production receipt RPC through the authorized migration process before deploying either server template that calls it.
6. **PENDING — production migration packaging:** keep test DDL under `supabase/test-migrations/`; author distinct production migrations and validate ordering, privileges, rollback and data compatibility in official TEST.
7. **NOT VERIFIED — Edge inventory:** resolve the empty active backup entrypoint and complete per-route auth/owner/consumer/retention/rollback review for all 38 functions before disabling any.
8. **MANUAL PENDING — #78:** physical no-F5 reconnect, real microphone/display capture and installed Normal ↔ Team Lite cross-client acceptance.
9. **PENDING — deploy controls:** set approved ref/SHA and expected project-ID assertions, pin CLI, inspect environment protections, and define coordinated Normal + Team Lite deployment/rollback.
10. **PENDING — review process:** obtain human reviews and review #74's 614-commit ancestry before merge consideration; refresh #79's stale body.
11. **BLOCKED — QA PR #82 validation:** latest run [42066570047](https://github.com/Reekyi/UpStatus/actions/runs/42066570047) fails at `scripts/validate.mjs` with `production updateURL mismatch`. The PR changes only this Markdown file; do not weaken the validator to force green.

### Safety record

This revalidation used GitHub read APIs, exact-head workflow steps/logs, candidate source reads, Supabase project/migration/function/advisor metadata, and SELECT-only PostgreSQL catalog queries. All 38 Edge Function bundles were fetched for static inventory; no function endpoint was probed. No workflow was dispatched by QA and no fixture script was run. No production SQL write, migration, Edge deployment, secret/flag change, userscript publication, PR merge, destructive operation, role switch, role-membership change or engineering-branch edit occurred. The only repository write is this append-only checkpoint on the dedicated QA branch, guarded by the freshly fetched file blob SHA. No completion percentage is reported.


### QA validation after the 17:30 UTC checkpoint

The documentation commit `d688e7dff169cb79212f62e56d6e34f558574de0` triggered [Validate run 42075999388](https://github.com/Reekyi/UpStatus/actions/runs/42075999388) on the updated #82 head. Job `127416221826` failed only at `scripts/validate.mjs` with `VALIDATION FAILED: production updateURL mismatch`. The checkout completed successfully; the failing step was the existing build validator. This PR still changes only `docs/RELEASE_READINESS.md`. Do not weaken the validator to manufacture a pass.


## Revalidation 2026-11-05 18:35 UTC — current heads, default-ACL candidate and production recheck

This checkpoint supersedes earlier snapshots where exact PR heads, workflow results, migration inventory, default ACLs, or Edge Function versions differ. The QA branch was re-fetched immediately before this append: PR #82 head `d8a6a42c6f7b6df0bd5a0f2c84cee1c7b6946420`; current `docs/RELEASE_READINESS.md` blob SHA `98ecf32b1b22fc43c1053f3cefaa63cd9d922e6e`. Only this file is changed below.

### Exact GitHub refs and CI

| PR | Exact head | Current state / comparison | Evidence |
|---|---|---|---|
| #74 Normal | `1dfe050ef5f3e4c25b16f3b71f10036214ab3142` | Open / Draft; 625 commits ahead of master, 0 behind; 56 files | Validate [42081126225](https://github.com/Reekyi/UpStatus/actions/runs/42081126225) **AUTOMATED PASS**; Signaling Smoke [42081126527](https://github.com/Reekyi/UpStatus/actions/runs/42081126527) **AUTOMATED PASS** |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Open / Draft; 59 commits; historical baseline | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) historical pass; superseded by #76 for current signaling candidate |
| #76 Team Lite signaling | `61672adfdbbd1e020cf5922838404b0958b832e6` | Open / Draft; 102 commits ahead of #75, 0 behind; 24 files | Candidate Checks [42062435489](https://github.com/Reekyi/UpStatus/actions/runs/42062435489) **AUTOMATED PASS** |
| #82 QA documentation | `d8a6a42c6f7b6df0bd5a0f2c84cee1c7b6946420` | Open / Draft; 29 commits ahead of master, 0 behind; one file | Validate [42076102639](https://github.com/Reekyi/UpStatus/actions/runs/42076102639) **BLOCKED** by baseline assertion |

All four PRs remain open, unmerged and Draft. GitHub reports `mergeable=true`, which is not an approval. The review API returned zero submitted reviews and zero inline review threads on #74, #75, #76 and #82. #76 is a descendant of #75; do not merge both independently. #74's 625-commit ancestry requires explicit history/merge-base review.

The latest #74 commit [1dfe050](https://github.com/Reekyi/UpStatus/commit/1dfe050ef5f3e4c25b16f3b71f10036214ab3142) changes only `scripts/signaling-static.test.mjs` and corrects a service-role regex word-boundary assertion. It includes the candidate migrations described below; no runtime client/backend code changed in that final commit.

Normal Smoke job `127437106817` and Team Lite job `127369608239` completed successfully. The Normal log confirms 86/86 authenticated checks, invitation and membership authorization, call/voice/screen WebRTC with remote tracks, three-member mesh, media teardown, 90 accepted + one HTTP 429, rate-limit concurrency, receipt concurrency, and isolated fixture cleanup. Team Lite confirms the same authenticated/browser and concurrency suites, migration-layout guard, userscript/portal syntax, version 3.4.31 and updater scenarios. These are **AUTOMATED PASS in the isolated project**, not production validation or manual device acceptance.

The current QA Validate failure is [run 42076102639](https://github.com/Reekyi/UpStatus/actions/runs/42076102639), job `127416575930`. The log built Normal 3.4.7 / TEST 3.4.7 and then failed at `scripts/validate.mjs` with `VALIDATION FAILED: production updateURL mismatch`. The triggering commit [d8a6a42](https://github.com/Reekyi/UpStatus/commit/d8a6a42c6f7b6df0bd5a0f2c84cee1c7b6946420) changes only this Markdown file. Do not weaken the validator to manufacture a green result.

### New candidate migration work — postgres-owned default ACLs and read receipts

Engineering added two production-candidate migrations to #74:

1. `supabase/migrations/20261105150000_revoke_public_default_privileges_postgres.sql` (blob SHA `73b21d39f617f254d293ad55839679f0c7fecf4d`).
2. `supabase/migrations/20261105160000_merge_chat_read_receipts.sql` (blob SHA `0ee571ab953df6284da48edd51ad279ecddaf443`).

The default-ACL migration:
- Revokes future table privileges from `anon` and `authenticated` for objects created by `postgres` in schema `public`.
- Revokes future function EXECUTE for those roles in `public`.
- Revokes future sequence privileges for those roles in `public`.
- Also revokes PostgreSQL's global default function EXECUTE from `PUBLIC` for future functions created by `postgres`.
- Deliberately preserves `service_role` defaults and does not attempt to alter `supabase_admin`.

**Scope review required:** the last global `ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` applies to future functions created by `postgres` in every schema, not only `public`. This is a defensible hardening direction, but its cross-schema compatibility impact must be inventoried and validated in official TEST before approval. The migration changes defaults for future objects; it does not remove grants from existing objects. Existing-object REVOKE migrations remain separately necessary.

The isolated test file `supabase/test-migrations/20261105150000_postgres_public_default_privileges_test.sql` creates a table, sequence and function probe, checks anon/authenticated privileges (including PostgreSQL 17 `MAINTAIN`), checks service_role and postgres owner access, then drops the probes. This SQL is mutating by design and was **not executed by QA**. The current Signaling Smoke workflow runs static assertions and endpoint/browser/receipt/rate-limit harnesses; it does not itself apply this test-migration SQL. Therefore the isolated probe result reported by engineering is not an exact-head automated CI step.

### Isolated project post-state — independently rechecked read-only

Project `bfpjtfqlnypisxljoxkb` (`upstatus-security-test`) is ACTIVE_HEALTHY, PostgreSQL 17.11.0.003. Its migration inventory includes the isolated default-ACL test entries `20261105180031` and `20261105180059`, plus receipt candidate test entry `20261105180339`. Two default-ACL test entries have the same migration name but distinct versions; retain that history rather than rewriting it, and clarify in the test record that it represents successive probe attempts.

A fresh SELECT-only catalog query confirms:
- No anon/authenticated default grants remain for postgres-owned public tables, functions or sequences in this isolated project.
- The global postgres function default no longer grants EXECUTE to PUBLIC.
- service_role and postgres owner defaults remain.
- The three probe objects are absent after cleanup.
- `merge_chat_read_receipts(text,jsonb,timestamptz)` exists, is `SECURITY INVOKER`, has an empty `search_path`, denies EXECUTE to anon/authenticated, and permits EXECUTE to service_role.

This independently confirms the **current isolated post-state**. It does not prove that CI re-applies the migration from a clean database, and it does not validate the migration against production or official TEST.

### ACL-02 remains blocked for supabase_admin

Fresh SELECT-only production catalog inspection at 2026-11-05 18:35 UTC reconfirms:
- `current_user = session_user = postgres`; postgres is not superuser and is not a member of `supabase_admin`.
- `supabase_admin` is a login-enabled superuser.
- `pg_default_acl` still contains client-role defaults for objects created by both `postgres` and `supabase_admin` in `public`: table privileges (including TRUNCATE/MAINTAIN), function EXECUTE and sequence SELECT/UPDATE/USAGE.
- The isolated postgres-owned default remediation has not changed production defaults.

The normal migration executor cannot alter defaults owned by `supabase_admin`. No `SET ROLE`, membership change, credential request or administrative workaround was attempted. ACL-02 remains **BLOCKED** until the project owner/Supabase provides an explicitly supported, authorized administrative path. Do not add a migration that is known to fail under the available postgres executor.

### Production catalog and Realtime — unchanged

Project `dlfvkawaiqduhlazsszm` remains ACTIVE_HEALTHY in `us-west-2`, PostgreSQL 17.11.0.002. Production still has seven migrations through `20261027155438`; `upstatus_signal_rate_limits`, `consume_upstatus_signal_rate_limit(text,integer,integer)` and `merge_chat_read_receipts(text,jsonb,timestamptz)` are absent.

Fresh SELECT-only privilege checks confirm nine backend-owned tables still grant anon/authenticated SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER and MAINTAIN, with RLS enabled, zero policies and FORCE RLS false. `upstatus_visual_config` has no client grants. RLS does not neutralize table-level TRUNCATE/MAINTAIN. This is an excessive effective privilege surface; no successful PostgREST exploit was demonstrated.

The three broadcast functions remain SECURITY DEFINER, owned by postgres, configured with `search_path=public`, and EXECUTE-able by anon/authenticated/service_role. The `upstatus_messages_broadcast` trigger still invokes `upstatus_broadcast_messages()` after INSERT/UPDATE/DELETE on `public.messages`. Its current definition serializes OLD/NEW via `to_jsonb` and calls `realtime.send(..., 'db_change', ..., false)`, so the message row is sent to a public broadcast topic. `realtime.messages` still has RLS enabled, zero policies, and anon/authenticated SELECT/INSERT/UPDATE (no DELETE). Do not confuse those grants with direct row-access proof; the confirmed message disclosure path is the privileged trigger publishing the full row.

Security Advisor observed at 2026-11-05 18:35:37 UTC:
- WARN `anon_security_definer_function_executable`: 3 functions.
- WARN `authenticated_security_definer_function_executable`: the same 3 functions.
- INFO `rls_enabled_no_policy`: 10 relations.
- Performance and Health Advisors: no findings.

### Current Edge Function inventory and deployed userscripts

The Supabase API still lists 38/38 Edge Functions ACTIVE; all report `verify_jwt=false`. This is gateway metadata and does not alone prove unauthenticated access. The current source hashes/versions of the three principal runtimes match the prior inventory:

| Function | Edge version | Embedded userscript | Source SHA |
|---|---:|---|---|
| `upstatus` | 480 | 3.4.7 | `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd` |
| `upstatus-team-lite` | 15 | 3.4.30 | `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb` |
| `upstatus-screen-share-3-1-1-beta10` | 6 | 3.1.1-beta8 | `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29` |

The Normal 3.4.7 and Team Lite 3.4.30 bundles were decoded again this pass. Each still contains two `chat_fast` send sites attaching the complete message object and one `payload.message` read. The legacy beta10 source SHA is unchanged from the preceding source inspection; no new runtime test or endpoint probe was performed. Candidate fixes are not deployed. All three principal runtimes still lack calls to the candidate rate-limit and receipt RPCs according to the prior source inventory.

**Empty active backup remains an inventory anomaly:** `upstatus-backup-327-pre328` is ACTIVE version 1, `verify_jwt=false`, and its fetched `index.ts` remains zero bytes (SHA `3d6c4f8e5f777830ea720ab2938cb023b5a4e4c7d26f3fc02b926ce0e4d0dd90`). Its endpoint was not probed. Treat runtime behavior as **NOT VERIFIED**; identify owner/consumers and rollback purpose before any retirement. Do not disable it blindly. The remaining 34 historical/test/backup functions still need route-by-route auth, owner, data-access and consumer inventory; the previous 37-source marker scan is not a full authorization proof.

### Issues and manual acceptance

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) remains open with three comments; all reconnect acceptance checkboxes are unchecked. Physical ~10-second network loss/recovery without F5 remains **MANUAL PENDING** for Normal and Team Lite.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) remains open with 49 comments. Its body still contains the older 2026-11-03 snapshot. Latest engineering comments [#6665400611](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6665400611) and [#6665426356](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6665426356) record the postgres default-ACL migration, isolated probe results, receipt migration and exact #74 CI status. QA did not edit either issue.

Manual acceptance is still pending for real no-F5 recovery, voice-room re-entry, new calls after reconnect, repeated network drops, real microphone/audio, real screen capture, separate Tampermonkey profiles, and installed Normal ↔ Team Lite cross-client compatibility. Chromium CI is not a substitute.

### Updated gates

1. **BLOCKED — RT-01:** remove production full-row public message broadcasts and complete the coordinated Normal/Team Lite/legacy client transport cutover, including channel authorization, trigger behavior, rollback and cross-user isolation.
2. **BLOCKED — ACL-02:** validate postgres default-ACL hardening in official TEST; review the all-schema PUBLIC EXECUTE scope; obtain a supported authorized administrative path for supabase_admin defaults.
3. **PENDING — current-object hardening:** validate existing-table and trigger-function revocations in official TEST, preserving service_role and required trigger operation; include TRUNCATE and MAINTAIN assertions.
4. **PARTIAL — RT-09:** integrate distributed rate limiting into both real product endpoints and validate per-user quotas, concurrency, 429/Retry-After semantics and cleanup.
5. **BLOCKED deployment dependency — read receipts:** production receipt RPC is absent; validate its migration in official TEST and apply through the authorized process before deploying either server template that calls it.
6. **PENDING — migration reproducibility:** add a clean isolated-database path that actually applies the SQL test migrations in CI, or provide a separate reproducible migration-test workflow. Static text assertions alone do not validate SQL execution.
7. **NOT VERIFIED — Edge inventory:** resolve the empty active backup entrypoint and complete route-level auth/owner/consumer/retention/rollback inventory for all 38 functions before disabling any.
8. **MANUAL PENDING — #78:** physical no-F5 reconnect, real microphone/display capture and installed Normal ↔ Team Lite acceptance.
9. **PENDING — deploy controls:** require explicit approved ref/SHA and expected project-ID assertions, pin Supabase CLI, inspect GitHub Environment protection, and define coordinated Normal + Team Lite deploy/rollback.
10. **PENDING — review process:** obtain human reviews; review #74's 625-commit ancestry; refresh the stale #79 body.
11. **BLOCKED — QA PR #82 validation:** current run 42076102639 fails on the inherited `production updateURL mismatch`; maintainers must fix the baseline contract or explicitly accept a documentation-only exception. Do not bypass it.

### Safety record

This pass used GitHub read APIs, exact-head commit/PR/workflow metadata and logs, source reads for the candidate migrations and deployed Edge Functions, Supabase project/migration/function/advisor metadata, and SELECT-only catalog queries in production and the isolated project. QA did not run the mutating SQL probe, fixture scripts or workflows. Existing engineering CI logs were inspected; the isolated test project was only queried read-only. No production SQL write, migration, Edge deployment, secret/flag change, userscript publication, PR merge, destructive operation, role switch/membership change or engineering-branch edit occurred. The only repository write is this append-only documentation update on the dedicated QA branch, guarded by the freshly fetched blob SHA. No completion percentage is reported.

### Evidence links

- [PR #74 Normal](https://github.com/Reekyi/UpStatus/pull/74)
- [PR #75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75)
- [PR #76 Team Lite signaling](https://github.com/Reekyi/UpStatus/pull/76)
- [PR #82 QA documentation](https://github.com/Reekyi/UpStatus/pull/82)
- [Issue #78 reconnect acceptance](https://github.com/Reekyi/UpStatus/issues/78)
- [Issue #79 release checklist](https://github.com/Reekyi/UpStatus/issues/79)
- [Normal Validate 42081126225](https://github.com/Reekyi/UpStatus/actions/runs/42081126225)
- [Normal Signaling Smoke 42081126527](https://github.com/Reekyi/UpStatus/actions/runs/42081126527)
- [Team Lite Candidate Checks 42062435489](https://github.com/Reekyi/UpStatus/actions/runs/42062435489)
- [QA Validate 42076102639](https://github.com/Reekyi/UpStatus/actions/runs/42076102639)
- [Supabase Advisor: SECURITY DEFINER callable by anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Supabase Advisor: SECURITY DEFINER callable by authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Supabase Advisor: RLS enabled without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)


---

## Independent QA audit checkpoint — 2026-11-05 16:32 BRT

This checkpoint was appended after reading the current QA document and confirming PR #82 head `7253bb6d4bbcb8e4ba2137e659ef95581073ebe8` and blob SHA `b43c65a08bf5319247fc5861676dd7c03c048086`. It does not modify engineering branches or production resources.

### Exact GitHub heads and CI

All four PRs remain open, Draft and unmerged. No submitted reviews or review threads were found.

| PR | Exact head | Changed files | Comparison |
|---|---|---:|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `b981a716f30bb1a9a960f74d050315dd51a3735f` | 57 | 629 ahead / 0 behind master |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 10 | Baseline for #76 |
| [#76 Team Lite candidate](https://github.com/Reekyi/UpStatus/pull/76) | `bd89a5364f66ca81780869b1bff17c061f90245c` | 24 | 103 ahead / 0 behind #75 |
| [#82 QA documentation](https://github.com/Reekyi/UpStatus/pull/82) | `7253bb6d4bbcb8e4ba2137e659ef95581073ebe8` | 1 | 30 ahead / 0 behind master |

The latest Normal and Team Lite commits only pin Playwright to published version `1.64.1`. The preceding CI failure was dependency resolution attempting unavailable `playwright-core@1.65.0`; the pin removed that failure.

- **AUTOMATED PASS — Normal Validate:** [42091463530](https://github.com/Reekyi/UpStatus/actions/runs/42091463530), exact head #74.
- **AUTOMATED PASS — Normal Signaling Smoke:** [42091463609](https://github.com/Reekyi/UpStatus/actions/runs/42091463609), exact head #74. Job completed SUCCESS; 14/14 unauthenticated checks, 86/86 authenticated checks, Chromium call/voice/screen WebRTC, three-member mesh, media teardown, 90 accepted + 1 HTTP 429, rate-limit/read-receipt concurrency and fixture cleanup passed.
- **AUTOMATED PASS — Team Lite Candidate Checks:** [42091473392](https://github.com/Reekyi/UpStatus/actions/runs/42091473392), exact head #76. All steps completed SUCCESS, including isolated mutation guard, authenticated adapter, endpoint checks, browser integration, rate limit, receipts, migration-layout guard and version/updater checks. Candidate version remains 3.4.31.
- **HISTORICAL PASS — Team Lite baseline:** [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127), head #75.
- **BLOCKED — QA Validate:** [42086096708](https://github.com/Reekyi/UpStatus/actions/runs/42086096708), head #82. Fails in `scripts/validate.mjs:26` with inherited `production updateURL mismatch`. No bypass was introduced; no successful validation is claimed for #82.

### Candidate client/backend inspection

Source files were read at the current PR branch refs.

- Normal userscript template SHA: `25bbc080157a43ca56495a8d0379cff30de3a4ec`. Its two `chat_fast` send sites call `sendRealtimeEvent('chat_fast')` without a message object.
- Team Lite userscript SHA: `73a72a0f6ddbc37e5b727af9495cbbee3a7cb3f9`. Its two send sites are also payload-free.
- The deployed Normal and Team Lite userscripts are still older; see production inventory below.
- Both candidate server templates use `SESSION_CACHE_TTL_MS=5000` and call `merge_chat_read_receipts`. Neither template calls `consume_upstatus_signal_rate_limit`; the distributed limiter remains **PARTIAL / NOT INTEGRATED** into the real product endpoints.
- The authenticated signaling adapter defaults to `enabled=false`; the userscript flag `signaling_transport_enabled` defaults to false and the endpoint setting defaults empty. The authenticated transport is therefore **OPT-IN / NOT ACTIVE BY DEFAULT**. Isolated API/Chromium tests do not prove the installed userscript cutover.
- The candidate read-receipt RPC is `SECURITY INVOKER`, has an empty `search_path`, revokes EXECUTE from PUBLIC/anon/authenticated and grants EXECUTE to service_role. It merges reader arrays atomically and keeps the read timestamp monotonic. Production still lacks this RPC, so the candidate templates must not be deployed before the production migration is separately validated and authorized.
- Production `readRoute` still performs read-modify-upsert of `chat_reads.messages`; concurrent requests for the same user can overwrite one another. The isolated atomic RPC addresses this race, but the fix is not yet in production.

### New compatibility gate — open voice-room semantics

Issue [#78](https://github.com/Reekyi/UpStatus/issues/78) explicitly states that a voice room is an open channel: no invitation or acceptance flow should be introduced as part of reconnect recovery.

Static inspection found that both authenticated candidate clients model voice-room membership using pending invitations:
- `signalPrepareVoiceRoom()` first resolves a logical voice room; otherwise it checks `invitations()` and calls `accept(roomId)`.
- If no invitation exists, it snapshots `/api/members`, creates a room with the current roster as participants, then binds `voice` and `screen` logical IDs (including Normal/Team Lite aliases).
- The server-mediated integration tests explicitly exercise pending invitations, acceptance and rejection of polling before acceptance.
- A late-added/otherwise unlisted team member has no open-join path for an already active voice room. The adapter's `requestInvite()` is hard-coded to `bindingType: "call"`, not `voice`.

This is a **SPEC-COMPATIBILITY RISK / PENDING DESIGN GATE**, not a confirmed production regression: the transport flag remains disabled by default. Before enabling it, preserve open voice-room behavior for any currently authorized team member, including late joiners, without a user-visible invite/accept step. Add automated coverage for open join, concurrent join, late join, Normal ↔ Team Lite aliases and room-owner departure. Do not treat the current invitation state-machine PASS as approval of the open voice-room requirement.

### Production Supabase — fresh read-only catalog inspection

Projects:
- Production `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations through `20261027155438`.
- Isolated `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 20 migration-history entries including isolated ACL, signaling, rate-limit and receipt test entries. This is not production.

Production still has no:
- `public.upstatus_signal_rate_limits`
- `public.consume_upstatus_signal_rate_limit(...)`
- `public.merge_chat_read_receipts(...)`

Read-only catalog findings in production:
- Nine backend-owned public tables (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) have RLS enabled, zero policies, FORCE RLS disabled, and effective anon/authenticated privileges including SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER and MAINTAIN. This is an excessive privilege surface; it is not proof that PostgREST can directly perform every operation through RLS.
- `upstatus_visual_config` has no anon/authenticated table privileges.
- `realtime.messages` has RLS enabled, zero policies and SELECT/INSERT/UPDATE grants for anon/authenticated; no DELETE grant. Do not infer direct row access from grants alone.
- The three existing broadcast functions remain SECURITY DEFINER with `search_path=public` and EXECUTE effective for anon/authenticated/service_role.
- Production `upstatus_messages_broadcast` still calls `upstatus_broadcast_messages()`, which serializes OLD/NEW with `to_jsonb` and sends `{op, record}` to `db_change` using `private=false`. The remote-state and user-status triggers also publish metadata to public topics.
- Security Advisor: 3 WARN findings for SECURITY DEFINER executable by anon, the same 3 for authenticated, and 10 INFO RLS-without-policy findings; Performance and Health Advisors returned no findings.

### Default ACL scope refined

The fresh production `pg_default_acl` query confirms client defaults across more than the UpStatus-owned `public` schema:
- Owner `postgres`: anon/authenticated defaults in `public` **and** `storage`, for tables, functions and sequences.
- Owner `supabase_admin`: anon/authenticated defaults in `graphql`, `graphql_public` and `public`, for tables, functions and sequences. No anon/authenticated rows were returned for its `extensions` or `realtime` defaults in this filtered query.

The candidate migration `20261105150000_revoke_public_default_privileges_postgres.sql` changes only postgres defaults in `public`, plus a global PUBLIC EXECUTE revoke for future functions created by postgres in any schema. It deliberately leaves postgres `storage` and all supabase_admin defaults untouched. Do not broaden revokes into Supabase-managed schemas without dependency review and an authorized supported administrative path.

Read-only confirmation in the isolated project:
- postgres defaults in `public` now retain only service_role grants for tables/functions/sequences;
- all nine existing backend-owned public tables have no anon/authenticated effective privileges;
- the three broadcast functions have EXECUTE false for anon/authenticated and true for service_role, with `search_path=pg_catalog, public`;
- the receipt and rate-limit RPCs exist as SECURITY INVOKER with empty `search_path`, EXECUTE false for anon/authenticated and true for service_role;
- minimized broadcast trigger payloads contain only `op`, but still use `private=false`. The isolated result is not evidence of a production change.

### Deployed Edge Functions and Realtime gap

Production still lists 38 ACTIVE Edge Functions, all with `verify_jwt=false`; this gateway flag alone does not prove missing custom authentication. The three principal deployed functions use the UpStatus custom session token:
- `upstatus`: Edge v480, userscript 3.4.7, source SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`.
- `upstatus-team-lite`: Edge v15, userscript 3.4.30, source SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`.
- `upstatus-screen-share-3-1-1-beta10`: Edge v6, userscript 3.1.1-beta8, source SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`.

The deployed Normal and Team Lite bundles were decoded again: each still has two `chat_fast` send sites carrying the full message object and one `payload.message` read. Production session-cache validation remains 30 seconds versus 5 seconds in the candidates. The deployed read-receipt path still uses non-atomic read/merge/upsert.

The active backup `upstatus-backup-327-pre328` remains version 1 with a zero-byte `index.ts` (SHA `3d6c4f8e5f777830ea720ab2938cb023b5a4e4c7d26f3fc02b926ce0e4d0dd90`). Runtime behavior was not probed; owner, consumers and rollback purpose remain **NOT VERIFIED**. Do not disable blindly. The remaining historical/test/backup functions still need route-level authentication and consumer inventory.

### Workflow and issues

- `.github/workflows/signaling-smoke.yml` and `.github/workflows/team-lite-candidate.yml` now pin Playwright 1.64.1, serialize fixture-mutating jobs under one concurrency group, require the isolated project guard and explicit mutation opt-in, and fail if the service-role test secret is absent.
- The SQL test migrations under `supabase/test-migrations/` remain executable DDL outside Supabase CLI discovery. `migration-layout.test.mjs` checks their location, but the current CI does **not** apply the SQL test-migration files to a clean database. The default-ACL SQL probe was executed by engineering in the isolated project; QA only inspected the migration history and queried the resulting catalog. Reproducible SQL migration execution in CI remains pending.
- `.github/workflows/deploy-production.yml` pins checkout and sets `persist-credentials: false`, but has no explicit approved `ref`, no in-workflow assertion of expected project ID `dlfvkawaiqduhlazsszm`, and uses Supabase CLI `latest`. It deploys only `upstatus`, not Team Lite. GitHub Environment protection was not inspected.
- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) remains open with 3 comments and all acceptance boxes unchecked. Physical no-F5 recovery, real microphone/display capture and installed Normal ↔ Team Lite acceptance remain **MANUAL PENDING**.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) remains open with 50 comments; its body still carries the 2026-11-03 snapshot. Latest engineering comment [#6666905725](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6666905725) records the Playwright pin, completed runs and expanded default-ACL schema inventory. QA did not edit either issue.

### Updated gates

1. **BLOCKED — RT-01:** remove production full-row public message broadcasts and complete coordinated Normal/Team Lite/legacy client cutover; keep channel authorization, rollback and cross-user isolation explicit.
2. **BLOCKED — ACL-02:** validate postgres default-ACL hardening in official TEST; review global PUBLIC EXECUTE scope; obtain supported authorized path for supabase_admin defaults. Keep storage/GraphQL managed-schema defaults out of blanket revokes until reviewed.
3. **PENDING — current-object hardening:** validate table and trigger-function revocations in official TEST, including TRUNCATE/MAINTAIN, service_role preservation and trigger execution.
4. **PARTIAL — RT-09:** integrate distributed rate limiting into both real product endpoints; test quotas, concurrency, 429/Retry-After and cleanup.
5. **BLOCKED deployment dependency — receipts:** production receipt RPC is absent; validate and apply its official migration through the authorized process before deploying either server template that calls it.
6. **PENDING — SQL test reproducibility:** provide a clean isolated-database workflow that actually applies test migrations; static layout/text checks are not SQL execution evidence.
7. **PENDING — voice-room semantics:** reconcile invitation/acceptance-based membership with issue #78's open-room/no-invite requirement before enabling authenticated transport.
8. **NOT VERIFIED — Edge inventory:** resolve the empty active backup entrypoint and complete route-level auth/owner/consumer/retention/rollback inventory for all 38 functions.
9. **MANUAL PENDING — #78:** physical no-F5 reconnect, real microphone/display capture and installed Normal ↔ Team Lite acceptance.
10. **PENDING — deploy controls:** require approved ref/SHA and expected project-ID assertions, pin Supabase CLI, inspect GitHub Environment protection, and define coordinated Normal + Team Lite deploy/rollback.
11. **PENDING — review process:** obtain human reviews; review #74's 629-commit ancestry; refresh stale #79 body.
12. **BLOCKED — QA PR #82 validation:** current run 42086096708 fails on inherited `production updateURL mismatch`; maintainers must fix the baseline contract or explicitly accept a documentation-only exception. Do not bypass it.

### Safety record

This pass used GitHub read APIs, exact-head PR/commit/workflow metadata and CI logs, source reads of both candidate clients/templates/migrations and deployed Edge Functions, Supabase project/migration/function/advisor metadata, and SELECT-only catalog queries in production and the isolated project. QA did not execute fixture scripts, SQL probes or workflows. Existing engineering CI and isolated migration results were inspected; production remained read-only. No production SQL write, migration, Edge deployment, secret/flag change, userscript publication, merge, destructive operation, role switch/membership change or engineering-branch edit occurred. The only repository write is this append-only documentation update on the dedicated QA branch, guarded by the freshly fetched blob SHA. No completion percentage is reported.

### Evidence links

- [PR #74](https://github.com/Reekyi/UpStatus/pull/74) · [PR #75](https://github.com/Reekyi/UpStatus/pull/75) · [PR #76](https://github.com/Reekyi/UpStatus/pull/76) · [PR #82](https://github.com/Reekyi/UpStatus/pull/82)
- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) · [Issue #79](https://github.com/Reekyi/UpStatus/issues/79)
- [Normal Validate 42091463530](https://github.com/Reekyi/UpStatus/actions/runs/42091463530) · [Normal Smoke 42091463609](https://github.com/Reekyi/UpStatus/actions/runs/42091463609) · [Team Lite Checks 42091473392](https://github.com/Reekyi/UpStatus/actions/runs/42091473392)
- [QA Validate 42086096708](https://github.com/Reekyi/UpStatus/actions/runs/42086096708)
- [Supabase Advisor — anon SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) · [authenticated SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) · [RLS without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)


### Supplementary default-function ACL check

A separate read-only query of `acldefault('f', postgres)` confirmed that production's built-in default function ACL still contains EXECUTE for **PUBLIC** as well as the owner. Production has no global `pg_default_acl` override for postgres-owned functions. The schema-specific `public` and `storage` ACL rows do not remove this built-in PUBLIC grant. The candidate migration's global `ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` is therefore necessary; it is not redundant with the per-schema anon/authenticated revokes.

The isolated project has a global function-default override whose effective ACL contains only the postgres owner, matching the intended test result. Production remains unchanged. This finding reinforces ACL-02 and the requirement to validate the global scope against managed schemas before release.


---

## Independent QA audit checkpoint — 2026-11-05 17:31 BRT

This checkpoint was appended after re-reading the current QA document and re-fetching PR #82. Before the write, #82 remained open/Draft at head `0fd1877c4989b1681093eefc151a617dd7212e50`; the current document blob was `af64a23c877b2bf127f6e73936eddd59265c37d7`. Only this documentation file was updated.

### Exact PR heads and CI

All four requested PRs remain open, Draft and unmerged. No submitted reviews or inline review threads were found.

| PR | Exact head | Changed files | Comparison |
|---|---|---:|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `b981a716f30bb1a9a960f74d050315dd51a3735f` | 57 | 629 ahead / 0 behind master |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 10 | Historical baseline for #76 |
| [#76 Team Lite candidate](https://github.com/Reekyi/UpStatus/pull/76) | `bd89a5364f66ca81780869b1bff17c061f90245c` | 24 | 162 ahead / 0 behind #75 |
| [#82 QA documentation](https://github.com/Reekyi/UpStatus/pull/82) | `0fd1877c4989b1681093eefc151a617dd7212e50` | 1 | 32 ahead / 0 behind master |

#76 is a continuation of #75 and must not be treated as an independent merge. #74's 629-commit ancestry still requires a deliberate history/merge-base review.

**AUTOMATED PASS — Normal**
- Validate [42091463530](https://github.com/Reekyi/UpStatus/actions/runs/42091463530), exact head #74: SUCCESS.
- Signaling Smoke [42091463609](https://github.com/Reekyi/UpStatus/actions/runs/42091463609), exact head #74: SUCCESS.
- Full smoke job log inspected: 14/14 static regression groups, 14/14 unauthenticated checks, 86/86 authenticated integration checks, Chromium call/voice/screen WebRTC with remote tracks, 90 accepted + 1 HTTP 429, rate-limit concurrency, atomic receipt concurrency and fixture cleanup passed.

**AUTOMATED PASS — Team Lite**
- Candidate Checks [42091473392](https://github.com/Reekyi/UpStatus/actions/runs/42091473392), exact head #76: SUCCESS.
- Full job log inspected: 14/14 unauthenticated checks, 86/86 authenticated checks, call/voice/screen WebRTC, 90 accepted + 1 HTTP 429, rate-limit and receipt concurrency, fixture cleanup, migration-layout guard, userscript/portal syntax, updater and session-isolation checks passed.
- #75 baseline run [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) remains a historical pass, superseded for current signaling work by #76.

**BLOCKED — QA validation**
- [Validate 42096117538](https://github.com/Reekyi/UpStatus/actions/runs/42096117538), exact head #82: FAILURE at `scripts/validate.mjs` with `production updateURL mismatch`.
- #82 changes only `docs/RELEASE_READINESS.md`; no validator bypass was added.

### Confirmed candidate compatibility blocker — open voice-room join

Issue [#78](https://github.com/Reekyi/UpStatus/issues/78) explicitly requires voice rooms to behave as open channels: members may enter/leave freely, with no invitation or acceptance flow.

Current candidate source was re-read at the exact PR branch refs:
- Normal userscript template SHA: `25bbc080157a43ca56495a8d0379cff30de3a4ec`.
- Team Lite userscript SHA: `73a72a0f6ddbc37e5b727af9495cbbee3a7cb3f9`.
- Isolated signaling endpoint source SHA: `7b84af73de644196ae0a06af40d5b5a6ebe5513b`.

The candidate endpoint currently:
1. Creates the room creator as `accepted`, but inserts every other participant from the initial roster as `pending`.
2. Defines membership as a row with `status='accepted'`.
3. Requires accepted membership for `/room/resolve`, polling, room member listing and signaling.
4. Exposes `/room/accept` and `/room/decline`; `/room/request-invite` explicitly accepts only `bindingType='call'`, not `voice`.

Both candidate clients' `signalPrepareVoiceRoom()` first resolve an existing room, then inspect pending invitations and automatically call `accept(roomId)`; if neither exists, they create a room from a snapshot of the current roster. Normal's failure path tells the user to ask an existing participant for an invitation. There is no open-join operation for an authorized member who joins after the room was created.

The authenticated integration suite explicitly tests that pending invitees cannot poll before acceptance and that uninvited users cannot accept a room. It does not test open join, late join, or a no-invitation voice-room lifecycle. The passing invitation tests therefore do **not** satisfy issue #78's room semantics.

This is a **confirmed candidate design incompatibility**, not a production regression: authenticated transport remains default-off and the isolated endpoint is not deployed to production. Do not enable the transport until an authenticated open-join model is implemented and tested for Normal, Team Lite, late joiners, concurrent joins, cross-product aliases and owner departure.

### Production Supabase — fresh read-only recheck

Project `dlfvkawaiqduhlazsszm` remains `ACTIVE_HEALTHY`, PostgreSQL `17.11.0.002`, with seven migrations through `20261027155438`.

The following remain absent in production:
- `public.upstatus_signal_rate_limits`
- `public.consume_upstatus_signal_rate_limit(text, integer, integer)`
- `public.merge_chat_read_receipts(text, jsonb, timestamptz)`

Read-only catalog checks reconfirmed:
- Nine backend-owned public tables have RLS enabled, zero policies and effective anon/authenticated grants including SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER and MAINTAIN. This is an excessive privilege surface; it does not by itself prove PostgREST row access through RLS.
- `realtime.messages` has RLS enabled, zero policies, and SELECT/INSERT/UPDATE grants for anon/authenticated.
- The three broadcast trigger functions remain SECURITY DEFINER with `search_path=public`; EXECUTE is effective for anon, authenticated and service_role.
- `upstatus_messages_broadcast` still invokes `upstatus_broadcast_messages()`, which serializes OLD/NEW with `to_jsonb` and sends `{op, record}` to `db_change` using `private=false`. Remote-state and user-status triggers also publish metadata to public topics.
- PostgreSQL built-in function defaults still include EXECUTE for PUBLIC and postgres. Explicit default ACLs still grant client privileges for postgres in `public` and `storage`, and for supabase_admin in `graphql`, `graphql_public` and `public`. Production has not received the candidate ACL migration; the migration covers postgres/public plus global PUBLIC EXECUTE and deliberately does not modify supabase_admin or storage defaults.
- Security Advisor observed at 2026-11-05 20:34 UTC: 3 WARN for anon EXECUTE on SECURITY DEFINER broadcast functions, 3 WARN for authenticated EXECUTE on the same functions, and 10 INFO RLS-without-policy findings. Performance and Health Advisors returned no findings.

Remediation references:
- [SECURITY DEFINER callable by anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [SECURITY DEFINER callable by authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [RLS enabled without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)

### Deployed Edge Functions and runtime mismatch

The production inventory contains 38 ACTIVE Edge Functions; all report `verify_jwt=false`. This gateway setting does not by itself prove missing application authentication.

Current core function source was retrieved and the embedded userscript decoded:
- `upstatus`: Edge v480, userscript 3.4.7, source SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`.
- `upstatus-team-lite`: Edge v15, userscript 3.4.30, source SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`.
- `upstatus-screen-share-3-1-1-beta10`: Edge v6, embedded userscript 3.1.1-beta8, source SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`.

All three deployed bundles still contain two `chat_fast` send sites with the full message object and one `payload.message` read. None calls the receipt or rate-limit RPC. The deployed session cache remains 30 seconds versus five seconds in both candidates.

The active backup `upstatus-backup-327-pre328` remains version 1 with a zero-byte `index.ts`, SHA `3d6c4f8e5f777830ea720ab2938cb023b5a4e4c7d26f3fc02b926ce0e4d0dd90`. Runtime behavior, owner, consumers and rollback purpose remain NOT VERIFIED; do not disable it blindly. All 38 function names/statuses were inventoried, but route-level authentication and consumer analysis for the remaining 35 functions is still incomplete.

### Deploy controls, issues and manual gates

- `.github/workflows/deploy-production.yml` current blob SHA: `8252c6c6e7005c98625603b5b02b14cb1e50a519`. Checkout is SHA-pinned and uses `persist-credentials: false`; however, the workflow still has no explicit approved `ref`, no in-workflow assertion of expected project ID `dlfvkawaiqduhlazsszm`, uses Supabase CLI `latest`, and deploys only `upstatus`, not Team Lite. GitHub Environment protection was not inspected.
- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) remains open with all acceptance criteria unchecked. Real network loss/recovery without F5, physical microphone/display capture and installed Normal ↔ Team Lite acceptance remain MANUAL PENDING.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) remains open with 51 comments. Its body still contains the 2026-11-03 snapshot; latest engineering comment [#6668012736](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6668012736) is dated 2026-11-05 17:02 BRT and records the prior exact-head CI/catalog state. QA did not edit either issue.

### Updated gates

1. **BLOCKED — RT-01:** remove full-row public message broadcasts in production and complete coordinated Normal/Team Lite/legacy cutover.
2. **BLOCKED — VOICE-OPEN-JOIN:** implement authenticated open membership without invitation/acceptance semantics and add late/concurrent join tests before enabling transport.
3. **BLOCKED — ACL-02:** validate postgres default-ACL hardening in official TEST; review global PUBLIC EXECUTE scope; obtain a supported authorized path for supabase_admin defaults. Do not blanket-revoke managed storage/GraphQL defaults without dependency review.
4. **BLOCKED deployment dependency — receipts:** validate and apply the official receipt RPC migration through the authorized process before deploying templates that call it.
5. **PARTIAL — RT-09:** integrate the distributed rate limiter into both real product endpoints and test 429/Retry-After, concurrency and cleanup.
6. **PENDING — SQL migration reproducibility:** CI checks migration layout but does not apply the SQL test migrations to a clean isolated database.
7. **NOT VERIFIED — Edge inventory:** resolve the empty backup entrypoint and complete route-level auth/owner/consumer/retention/rollback inventory.
8. **PENDING — deploy controls:** require approved ref/SHA and project-ID assertions, pin Supabase CLI, inspect Environment protection, and define coordinated Normal + Team Lite deployment/rollback.
9. **MANUAL PENDING — #78:** real no-F5 recovery, devices and installed cross-client acceptance.
10. **PENDING — review process:** obtain human reviews, review #74's 629-commit ancestry, and refresh the stale #79 body.
11. **BLOCKED — QA PR #82 validation:** inherited `production updateURL mismatch` remains unresolved; do not bypass the validator.

### Safety record

This checkpoint used GitHub read APIs, exact PR refs, source-file reads, workflow job logs, Supabase project/function/migration/advisor metadata, current Edge Function source retrieval, and SELECT-only production catalog queries. No fixture script or SQL probe was executed by QA; no workflow was triggered. No production SQL write, migration, Edge deployment, secret/flag change, userscript publication, merge, destructive operation, role switch/membership change, or engineering-branch edit occurred. The only repository write is this append-only update to `docs/RELEASE_READINESS.md` on the dedicated QA branch, using the freshly fetched blob SHA. No completion percentage is reported.

### Evidence links

- [PR #74](https://github.com/Reekyi/UpStatus/pull/74) · [PR #75](https://github.com/Reekyi/UpStatus/pull/75) · [PR #76](https://github.com/Reekyi/UpStatus/pull/76) · [PR #82](https://github.com/Reekyi/UpStatus/pull/82)
- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) · [Issue #79](https://github.com/Reekyi/UpStatus/issues/79)
- [Normal Validate 42091463530](https://github.com/Reekyi/UpStatus/actions/runs/42091463530) · [Normal Smoke 42091463609](https://github.com/Reekyi/UpStatus/actions/runs/42091463609) · [Team Lite Checks 42091473392](https://github.com/Reekyi/UpStatus/actions/runs/42091473392)
- [QA Validate 42096117538](https://github.com/Reekyi/UpStatus/actions/runs/42096117538)
- [Supabase Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization)



---

## Isolated database and endpoint recheck — 2026-11-05 17:35 BRT

A read-only follow-up was performed after the main checkpoint. It does not change the production conclusions.

### Isolated project evidence

Project `bfpjtfqlnypisxljoxkb` is `ACTIVE_HEALTHY`, PostgreSQL `17.11.0.003`. Its migration history contains 20 entries through `20261105190937`.

The current isolated catalog confirms:
- `public.upstatus_signal_rate_limits` exists.
- `public.consume_upstatus_signal_rate_limit(text, integer, integer)` exists.
- `public.merge_chat_read_receipts(text, jsonb, timestamptz)` exists.
- No postgres-owned `public` default ACL entries grant privileges to anon/authenticated.
- No global postgres default EXECUTE grant remains for PUBLIC.
- The three broadcast trigger functions are not executable by anon/authenticated; service_role retains EXECUTE.

The isolated migration history has two distinct version entries with the same name, `revoke_public_default_privileges_postgres_test` (`20261105180031` and `20261105180059`). They are separate history versions, not evidence of duplicate production migrations; retain the history and explain the retry/validation sequence rather than rewriting it.

The isolated project has `upstatus-signal-test` ACTIVE v27 and `upstatus-signal-e2e-once` ACTIVE v3. The production inventory of 38 functions contains neither slug. Therefore the authenticated signaling backend is still isolated-only; no production signaling endpoint is available for the candidate clients.

### SQL test reproducibility and guard boundary

The test file `supabase/test-migrations/20261105170000_postgres_global_function_default_scope_test.sql` (blob `d300b568deba78362e8397f756d9f18713a05580`) creates a dedicated probe schema/function, asserts anon/authenticated lack EXECUTE while postgres retains it, then drops the probe schema with CASCADE. The README (blob `ce8a3dfc38ad08c90bc56e680069fa691af4429f`) explicitly restricts these DDL files to the isolated project and warns that the JavaScript fixture guard does not authorize SQL DDL.

The current Normal smoke workflow (blob `deb67fbc82ef54635335aa4e834d6f8214d0ee7b`) runs `migration-layout.test.mjs`, the authenticated API/browser harness, and the two API-level concurrency scripts. It does not apply the SQL files under `supabase/test-migrations/` to a clean database. Thus:
- The isolated catalog and migration history are current evidence of a successful engineering-applied test.
- A clean-database, repeatable CI migration application remains unproven.
- QA did not execute the DDL test file or any fixture script.

The shared JavaScript mutation guard (blob `9a88c633789e502380fc81a249bf3f62a8944cd5`) requires the exact isolated project origin, service key, explicit `UPSTATUS_SIGNAL_ALLOW_MUTATION=1`, and a read-only preflight. That guard is used by API fixture scripts; it is not embedded in the SQL test migration itself. Manual SQL application therefore remains a separately controlled operation.

### Post-update QA branch state

The immediately preceding checkpoint commit was `10eba8a7deb2e3036131b6ad7b0e299fa036731c` (blob `fe887b564a68a5926d38dff99077d2a75606b912`). At the time of this isolated-project recheck, the QA branch was at `e030a112ef6faab6c54e4170182baebc20a91779` (blob `673bc54066af482475941a3d4c4a5a2da4dbdab2`); GitHub REST reported PR #82 `mergeable=true`, `mergeable_state=clean`, 34 ahead / 0 behind master. No workflow run was associated with `e030a112`; the failure `42096117538` belongs to the older QA head `0fd1877`.



---

## Independent QA checkpoint — 2026-11-05 18:32 BRT

This checkpoint supersedes earlier snapshots where exact heads, issue comments, CI runs, or Supabase catalog state differ. The requested QA file was fetched immediately before this append; current blob SHA before write: `232e4d627a253eaf9d1839b817453b4e8e63e89a`. PR #82 was still open/Draft at head `e6372482f04cdd8983cbde993eee67446c5e04af`. Only this Markdown file is being updated.

### Exact GitHub refs and review state

| PR | Exact head | Base | State | Notes |
|---|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `b981a716f30bb1a9a960f74d050315dd51a3735f` | `master` | Open/Draft | 629 commits, 57 files; compare is 629 ahead / 0 behind master |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | `team-lite-official` | Open/Draft | 59 commits, 10 files; historical baseline |
| [#76 Team Lite candidate](https://github.com/Reekyi/UpStatus/pull/76) | `bd89a5364f66ca81780869b1bff17c061f90245c` | `team-lite-official` | Open/Draft | 162 commits, 24 files; 103 ahead / 0 behind #75 |
| [#82 QA documentation](https://github.com/Reekyi/UpStatus/pull/82) | `e6372482f04cdd8983cbde993eee67446c5e04af` | `master` | Open/Draft | 35 commits, one changed file |

All four PRs are unmerged. GitHub reports #82 mergeable at this checkpoint, but that is not a release approval. #76 is a continuation/descendant of #75 and must not be treated as an independent merge. The 629-commit ancestry of #74 still requires human history/merge-base review.

GitHub review and review-thread queries returned no submitted reviews and no inline review threads for #74, #75, #76, or #82.

### Exact-head CI

**Normal #74 — AUTOMATED PASS**
- Validate [42091463530](https://github.com/Reekyi/UpStatus/actions/runs/42091463530): SUCCESS on exact head `b981a716f30bb1a9a960f74d050315dd51a3735f`.
- Signaling Smoke [42091463609](https://github.com/Reekyi/UpStatus/actions/runs/42091463609): SUCCESS on the same head.
- The smoke job completed static/harness checks, unauthenticated endpoint checks, authenticated integration/browser checks, distributed rate-limit concurrency, and atomic receipt concurrency. Its log records 14/14 unauthenticated checks, 86/86 authenticated checks, call/voice/screen WebRTC with remote tracks, three-participant mesh and teardown, 90 accepted + 1 HTTP 429, rate-limit concurrency, receipt concurrency, and fixture cleanup.

**Team Lite #76 — AUTOMATED PASS**
- Candidate Checks [42091473392](https://github.com/Reekyi/UpStatus/actions/runs/42091473392): SUCCESS on exact head `bd89a5364f66ca81780869b1ff17c061f90245c`.
- The job completed isolation-guard verification, adapter tests, unauthenticated endpoint checks, 86/86 authenticated integration checks, browser call/voice/screen WebRTC, three-member mesh, 90 accepted + 1 HTTP 429, rate-limit and receipt concurrency, migration-layout guard, userscript/portal syntax, updater scenarios, and fixture cleanup.
- #75 baseline run [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) remains a historical pass, superseded for current signaling work by #76.

**QA #82 — BLOCKED by inherited validator**
- Validate [42105592944](https://github.com/Reekyi/UpStatus/actions/runs/42105592944) ran on exact QA head `e6372482f04cdd8983cbde993eee67446c5e04af` and failed at `scripts/validate.mjs` with `production updateURL mismatch`.
- #82 changes only `docs/RELEASE_READINESS.md`. No validator bypass or runtime change was made. This is a baseline contract failure, not a successful validation of the documentation branch.

CI approval is isolated-candidate evidence. It does not establish manual acceptance, production migration, or deployed-runtime readiness.

### Confirmed candidate incompatibility — VOICE-OPEN-JOIN

Issue [#78](https://github.com/Reekyi/UpStatus/issues/78) still requires voice rooms to behave as open channels: authorized team members enter/leave freely, without invitations or acceptance.

Current candidate source was fetched at the exact PR branch refs:
- Normal userscript template `src/userscript/upstatus.user.template.js`: blob `25bbc080157a43ca56495a8d0379cff30de3a4ec`.
- Team Lite userscript `team-lite/upstatus-team-lite.user.js`: blob `73a72a0f6ddbc37e5b727af9495cbbee3a7cb3f9`.
- Shared transport `src/userscript/signaling-transport.mjs`: blob `9df3040a98fc9a3a457ca12ac2fdedbc911809e2`.
- Isolated endpoint `supabase/functions/upstatus-signal-test/index.ts`: blob `7b84af73de644196ae0a06af40d5b5a6ebe5513b`.
- Authenticated integration test `scripts/test-signaling-authenticated.mjs`: blob `bfdd070182ef42859152a47f23df8fabb8e66cf3`.

Inspection confirms:
1. The clients try `resolveRoom(voice)`, then look for pending invitations and call `accept(roomId)`; if neither exists, they create a room from a snapshot of the current roster.
2. The endpoint creates non-creator roster members as `pending` (source lines 243–254), and accepted membership is required by resolve/list/poll/signal paths.
3. `/room/request-invite` explicitly rejects any binding type other than `call` (source lines 285–288). There is no authenticated open-join route for a late-arriving voice-room member.
4. The current integration suite tests invitation discovery, pending-member denial, explicit acceptance, invitation reissue, and ownership handoff. It does not test voice open-join, late join, or concurrent open-join.

This is a **confirmed candidate design incompatibility**, not a production regression: authenticated signaling remains opt-in/default-off, and `upstatus-signal-test` exists only in the isolated project. Do not enable the transport until an authenticated, idempotent and concurrency-safe voice open-join operation is implemented and tested for late members, capacity, leave/close races, owner departure, and Normal/Team Lite logical aliases.

Engineering acknowledged the same finding in [issue #78 comment 6669395769](https://github.com/Reekyi/UpStatus/issues/78#issuecomment-6669395769). The physical no-F5 network recovery test remains MANUAL PENDING; the issue body still has all acceptance checkboxes open.

### Production Supabase — fresh read-only catalog

Project `dlfvkawaiqduhlazsszm` is `ACTIVE_HEALTHY`, region `us-west-2`, PostgreSQL `17.11.0.002`. Production migration history still contains seven entries through `20261027155438`.

The following remain absent:
- `public.upstatus_signal_rate_limits`
- `public.consume_upstatus_signal_rate_limit(text, integer, integer)`
- `public.merge_chat_read_receipts(text, jsonb, timestamptz)`

**RLS and effective table privileges**
- Nine backend-owned tables (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) have RLS enabled, no policies, and effective anon/authenticated privileges for SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, and PostgreSQL 17 MAINTAIN.
- `upstatus_visual_config` has RLS enabled and no effective table privileges for anon/authenticated.
- `realtime.messages` has RLS enabled, no policies, and effective SELECT/INSERT/UPDATE for anon/authenticated; DELETE/TRUNCATE are not granted.
- Excessive grants are a privilege-surface finding. The catalog does not by itself prove direct PostgREST row access through RLS-without-policy tables. RLS is not a substitute for removing TRUNCATE/MAINTAIN grants.

**Default ACL**
- Explicit client defaults for objects owned by `postgres` remain in schemas `public` and `storage`.
- Explicit client defaults for objects owned by `supabase_admin` remain in `public`, `graphql`, and `graphql_public`.
- PostgreSQL's built-in default function ACL for `postgres` still includes EXECUTE for PUBLIC as well as the owner.
- The SQL session is `postgres`; it is not superuser and is not a member of `supabase_admin`. The normal migration executor cannot alter `supabase_admin` defaults without a supported, explicitly authorized administrative path.
- No role switch, membership change, or workaround was attempted.

**SECURITY DEFINER and Realtime**
- `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()`, and `upstatus_broadcast_users()` remain SECURITY DEFINER, `search_path=public`, and executable by anon/authenticated/service_role.
- Trigger `upstatus_messages_broadcast` remains enabled after INSERT/UPDATE/DELETE on `public.messages`.
- `upstatus_broadcast_messages()` serializes OLD/NEW with `to_jsonb` and calls `realtime.send(..., 'db_change', ..., false)`; the final false keeps the topic public. Remote-state and user-status triggers also send metadata to public topics.
- Supabase Security Advisor observed at approximately 18:32 BRT: 3 WARN for anon EXECUTE on SECURITY DEFINER functions, 3 WARN for authenticated EXECUTE on the same functions, and 10 INFO RLS-without-policy findings. Performance and Health Advisors returned no findings.

### Production Edge Functions

The project inventory contains 38 ACTIVE functions; all report `verify_jwt=false`. This means the gateway is not enforcing Supabase Auth JWT validation; it does **not** by itself prove missing application-level authentication.

Inventory categories:
- 2 primary runtime functions: `upstatus` v480 and `upstatus-team-lite` v15.
- 12 test/test-backup variants, including `upstatus-test` v281.
- 13 screen-share beta/legacy variants, including `upstatus-screen-share-3-1-1-beta10` v6.
- 11 backup snapshots.

Current primary/legacy source hashes:
- `upstatus`: `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`.
- `upstatus-team-lite`: `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`.
- `upstatus-screen-share-3-1-1-beta10`: `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`.

The three core source files contain custom `x-upstatus-token`/session-table authentication markers; this is source inspection, not a route-by-route authorization test. The other 35 functions still need individual auth, owner, consumer, retention, and rollback inventory. The isolated `upstatus-signal-test` endpoint is not present in the 38-function production inventory.

Anomaly reconfirmed: `upstatus-backup-327-pre328` is ACTIVE v1 with a zero-byte `index.ts`; source SHA `3d6c4f8e5f777830ea720ab2938cb023b5a4e4c7d26f3fc02b926ce0e4d0dd90`. Its runtime behavior and consumers were not tested. Do not disable it without dependency and rollback evidence.

### Candidate/backend dependency and migration reproducibility

- Normal and Team Lite server templates call `merge_chat_read_receipts`; production lacks the RPC, so the official receipt migration must be validated/applied through the authorized process before deploying dependent templates.
- The actual product server templates still do not call `consume_upstatus_signal_rate_limit`; the rate-limit RPC is exercised in the isolated endpoint tests but is not yet integrated into both real product endpoints.
- `.github/workflows/signaling-smoke.yml` (blob `deb67fbc82ef54635335aa4e834d6f8214d0ee7b`) runs the JavaScript migration-layout guard and API/browser/concurrency scripts. It does not apply SQL files under `supabase/test-migrations/` to a clean isolated database. Repeatable CI execution of those DDL probes remains unproven.
- The production deploy workflow (blob `8252c6c6e7005c98625603b5b02b14cb1e50a519`) has SHA-pinned checkout and `persist-credentials: false`, but no explicit approved ref, no in-workflow assertion of the expected project ID, uses Supabase CLI `latest`, and deploys only `upstatus`. GitHub Environment protection was not inspected.

### Issues and manual acceptance

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) remains open with four comments. Its latest engineering note acknowledges VOICE-OPEN-JOIN; the physical no-F5 test and all listed manual criteria remain unchecked.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) remains open with 52 comments. Its body still contains the older 2026-11-03 checklist snapshot; latest relevant engineering checkpoint is [comment 6669394493](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6669394493). QA did not edit either issue.

Manual pending in both clients: real internet loss/recovery without F5, re-entry to open voice room, new inbound/outbound calls after reconnect, real microphone/audio, real screen capture, installed Tampermonkey profiles, and Normal ↔ Team Lite interoperability. Chromium CI does not replace these tests.

### Updated release gates

1. **BLOCKED — RT-01:** remove public full-row message broadcasts and complete the coordinated legacy/Normal/Team Lite cutover.
2. **BLOCKED — VOICE-OPEN-JOIN:** implement authenticated open membership without invite/accept semantics; add late/concurrent join, capacity, leave/close race, owner-departure, and alias tests.
3. **BLOCKED — ACL-02:** validate postgres default ACL changes in official TEST; review global PUBLIC EXECUTE scope; obtain an authorized Supabase-supported path for supabase_admin defaults.
4. **BLOCKED deployment dependency — receipts:** validate official receipt migration and install the RPC through the authorized process before deploying dependent templates.
5. **PARTIAL — RT-09:** integrate distributed rate limiting into both product endpoints and test per-user quotas, 429/Retry-After, concurrency, and cleanup.
6. **PENDING — SQL test reproducibility:** add an isolated clean-database workflow for SQL test migrations; do not run DDL through the API fixture guard.
7. **NOT VERIFIED — Edge inventory:** complete route-level auth/owner/consumer/rollback analysis for the remaining functions and investigate the empty backup entrypoint.
8. **PENDING — deploy controls:** pin Supabase CLI; assert approved ref/SHA and project ID; inspect Environment approvals; define coordinated deployment/rollback.
9. **MANUAL PENDING — #78:** real network/device recovery and installed cross-client acceptance.
10. **PENDING — review process:** obtain human reviews, review #74's 629-commit ancestry, and refresh the stale #79 body.
11. **BLOCKED — QA PR #82 validation:** inherited `production updateURL mismatch` remains unresolved; do not bypass the validator.

### Safety record

This checkpoint used GitHub read APIs, exact PR refs, source reads, workflow job logs, Supabase project/migration/function/advisor metadata, and SELECT-only production catalog queries. No SQL DDL, fixture script, or workflow was executed by QA. No production write, migration, Edge deployment, secret/flag change, userscript publication, merge, destructive operation, role switch/membership change, or engineering-branch edit occurred. The only write is this append to `docs/RELEASE_READINESS.md` on the dedicated QA branch, guarded by the freshly fetched blob SHA. No completion percentage is reported.

### Evidence links

- [PR #74](https://github.com/Reekyi/UpStatus/pull/74) · [PR #75](https://github.com/Reekyi/UpStatus/pull/75) · [PR #76](https://github.com/Reekyi/UpStatus/pull/76) · [PR #82](https://github.com/Reekyi/UpStatus/pull/82)
- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) · [Issue #79](https://github.com/Reekyi/UpStatus/issues/79)
- [Normal Validate 42091463530](https://github.com/Reekyi/UpStatus/actions/runs/42091463530) · [Normal Smoke 42091463609](https://github.com/Reekyi/UpStatus/actions/runs/42091463609) · [Team Lite Checks 42091473392](https://github.com/Reekyi/UpStatus/actions/runs/42091473392)
- [QA Validate 42105592944](https://github.com/Reekyi/UpStatus/actions/runs/42105592944)
- [Supabase Advisor — anon SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) · [authenticated SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) · [RLS without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
- [Supabase Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization)


## Auditoria independente — 2026-11-05: open voice join, lifecycle e revalidação de produção

### Heads e workflows conferidos

- **PR #74 Normal**: head atual `4c9c1ffac1b1cafd630e6f52337bff33788170e1`, branch `chore/continuity-foundation`, 636 commits à frente de master e zero atrás; 58 arquivos alterados; Draft e aberta. Validate [42122093281](https://github.com/Reekyi/UpStatus/actions/runs/42122093281) passou. Smoke [42122093257](https://github.com/Reekyi/UpStatus/actions/runs/42122093257) estava PENDING, sem job disponível na consulta.
- O último head com runtime validado é `73c19d5a890d39ee9524c1fb5042b7f6ffb7f53b). Seu Signaling Smoke [42120068577](https://github.com/Reekyi/UpStatus/actions/runs/42120068577) e Validate [42120068532](https://github.com/Reekyi/UpStatus/actions/runs/42120068532) passaram. Os commits posteriores até `4c9c1ff` são documentais; o novo Smoke do head documental ainda deve concluir antes de declarar aprovação exata do head atual.
- **PR #76 Team Lite**: head `4178e54654b1bd2c06516fba9edea17d779b9ecd`, 163 commits à frente de `team-lite-official`, zero atrás; 104 commits à frente de #75; 25 arquivos alterados; Draft e aberta. Candidate Checks [42119919319](https://github.com/Reekyi/UpStatus/actions/runs/42119919319) passou.
- **PR #75 baseline**: head `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; Candidate Checks histórico [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passou.
- **PR #82 QA**: head `9fc5bfd3ff72ab4b1c44a9b0a0740432ae20e27d`, 36 commits à frente de master e zero atrás, um único arquivo alterado; Draft e aberta. Validate [42114185476](https://github.com/Reekyi/UpStatus/actions/runs/42114185476) falhou no baseline herdado `production updateURL mismatch`. Nenhum contorno foi feito.
- As quatro PRs permanecem abertas e Draft. Não há reviews submetidos nem threads de revisão nos PRs #74, #75, #76 e #82.

### VOICE-OPEN-JOIN: implementação candidata confirmada

A incompatibilidade de sala aberta registrada na #78 recebeu implementação candidata nos dois produtos:

- Normal #74 e Team Lite #76 usam `POST /room/open`.
- O endpoint deriva o nome do usuário da sessão UpStatus autenticada, valida os dois logical IDs permitidos e chama `open_upstatus_signal_voice_room` por service role.
- A migration `20261105190000_open_voice_room_membership.sql` cria as RPCs de abertura/entrada e saída. A abertura usa advisory lock, lock de linha, associação `accepted` sem convite, aliases compartilhados Normal/Team Lite, limite de 32 membros e idempotência. A saída transfere o owner ao membro aceito mais antigo e fecha/remove aliases quando o último membro sai.
- No projeto isolado, `open_upstatus_signal_voice_room` e `leave_upstatus_signal_room` são SECURITY INVOKER, usam `search_path` vazio e têm EXECUTE apenas para `service_role`; anon/authenticated não executam as RPCs.
- O projeto isolado `bfpjtfqlnypisxljoxkb` está ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, com 21 migrations; a última é `20261105220323 open_voice_room_membership_candidate`. `upstatus-signal-test` está ACTIVE v28, source SHA `e26011f026c74821a1e05bf314340604d715820ab864b63d66fd481d93d00d4f`; `upstatus-signal-e2e-once` está ACTIVE v3.
- Comparei a função implantada no projeto isolado com o source da branch #74: `index.ts` coincide após normalização de whitespace; `body.mjs` e `legacy-envelope.mjs` coincidem byte a byte. Isso confirma a paridade do endpoint usado nos testes, não uma implantação em produção.
- Normal runtime head `73c19d5`: 103/103 verificações autenticadas; testes de late join pelos aliases Normal/Team Lite, idempotência, ausência de convite, rejoin, capacidade, owner handoff, corrida owner-leave/late-join, fechamento e limpeza passaram. Chromium validou WebRTC call/voice/screen, mesh de três participantes e teardown; rate limit 90 aceitos + 1 HTTP 429 e concorrência de recibos passaram.
- Team Lite head `4178e546`: Candidate Checks confirmou 103/103 verificações autenticadas, late join, aliases, idempotência, owner handoff/race, capacidade, fechamento, WebRTC, rate limit, recibos e limpeza.
- VOICE-OPEN-JOIN deixa de ser bloqueador de desenho nos candidatos. A issue #78 continua aberta para testes manuais de perda real de rede, recuperação sem F5, reentrada, chamadas novas, microfone/tela reais e interoperabilidade instalada Normal ↔ Team Lite.

### Novo achado de código: Team Lite não libera a associação ao sair de uma sala ativa

**TEAM-LITE-VOICE-LEAVE — bloqueador para habilitar o transporte no Team Lite.**

No userscript Team Lite da PR #76, blob SHA `516b22afba2e8bd05871993be702c47ea4cca2d8`, a função `voiceRoomLeave()` tem este fluxo:

- Quando `wasActive` é verdadeiro, envia `voiceRoomSend('leave', ...)`.
- Só chama `signalReleaseVoiceRoom()` no ramo `else`, quando a sala não estava ativa.
- O ramo ativo não chama `signalReleaseVoiceRoom()`, `signalStopCallPolling()` nem `signalTransport.leave(room)`.

A função `signalReleaseVoiceRoom()` existe e interrompe o poller, limpa o ID local e chama `POST /room/leave`, mas não é usada pelo caminho normal de saída ativa. O logout Team Lite delega a saída à mesma função, portanto herda o risco.

Consequências prováveis: a associação `accepted` permanece no servidor, o owner não é transferido, a sala não fecha quando deveria, o poller continua ativo e a associação residual pode consumir capacidade ou manter leitura de eventos depois da saída/logout. Isso é inspeção de código, não observação de produção.

A cobertura atual não detecta o problema:
- `scripts/team-lite-candidate-check.mjs` verifica a existência de `signalReleaseVoiceRoom()`, de uma chamada `await signalReleaseVoiceRoom()` e de `signalTransport.leave(room)`, mas não exige a chamada no ramo `wasActive`.
- O browser harness limpa a sala chamando diretamente a API `/room/leave` no bloco final; não aciona a saída real da UI Team Lite.
- O Normal faz a liberação no caminho ativo, aguardando os sinais pendentes e chamando `signalTransport.leave(leavingRoomId)`.

**Correção exigida:** fazer o caminho ativo do Team Lite aguardar os sinais finais, parar o poller, limpar o estado local e chamar a RPC de leave; acrescentar teste de UI/logout que comprove remoção da associação, transferência de owner e fechamento do último membro. Endurecer a asserção estática para verificar especificamente o ramo ativo.

### RT-09: resposta 429 sem Retry-After

O endpoint isolado limita eventos a 90/minuto e leituras a 240/minuto. Quando `rateLimit()` retorna falso, a rota responde HTTP 429 com `{ error: "Rate limit exceeded" }`, mas o helper de resposta não inclui `Retry-After`. O cliente não recebe indicação explícita de quando tentar novamente. A implementação candidata deve calcular e enviar o tempo de espera, e testar o cabeçalho. O rate limiter também continua sem integração nos endpoints reais implantados.

### Snapshot de fixtures do projeto isolado

Uma consulta SELECT-only encontrou, durante a rodada, um conjunto ativo com sufixo `9bc23d87851e`: quatro usuários de teste, quatro sessões, dez salas, treze associações, dois eventos e duas salas ativas no snapshot detalhado. Esse sufixo não apareceu nos logs dos dois runs concluídos inspecionados. Pode pertencer a outra execução concorrente; a origem não foi atribuída. **Nenhuma limpeza foi tentada** para não interferir em uma execução possivelmente ativa. Os logs dos runs concluídos continuam registrando a limpeza das próprias fixtures, mas não se declara que o projeto isolado esteja globalmente vazio.

### Produção: fotografia permanece bloqueada

Projeto `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, região us-west-2, PostgreSQL 17.11.0.002, sete migrations até `20261027155438`.

Continuam ausentes:
- `upstatus_signal_rate_limits`
- `consume_upstatus_signal_rate_limit`
- `merge_chat_read_receipts`
- `open_upstatus_signal_voice_room`
- `leave_upstatus_signal_room`

As nove tabelas backend-owned continuam com RLS habilitado, zero policies e privilégios efetivos excessivos para anon/authenticated (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN). `upstatus_visual_config` não tem grants de cliente. `realtime.messages` mantém RLS ativo, zero policies e grants de SELECT/INSERT/UPDATE para os papéis cliente.

Os default ACLs continuam concedendo privilégios de cliente: postgres nos schemas `public` e `storage`; supabase_admin em `public`, `graphql` e `graphql_public`. O ACL padrão de funções de postgres ainda inclui EXECUTE para PUBLIC. A sessão administrativa continua `postgres`, sem superuser e sem membership em `supabase_admin`; ACL-02 segue bloqueado para o owner supabase_admin.

As três funções de broadcast continuam SECURITY DEFINER, `search_path=public`, EXECUTE para anon/authenticated/service_role. O trigger de `public.messages` continua serializando OLD/NEW com `to_jsonb` e publicando `db_change` com `private=false`. RT-01 permanece bloqueador.

Security Advisor observado em 2026-11-05 às 22:30:38 UTC: três WARN de SECURITY DEFINER executável por anon, três WARN para authenticated e dez INFO de RLS sem policies. Performance e Health Advisors sem findings.

### Edge Functions de produção

As 38 funções continuam ACTIVE e reportam `verify_jwt=false`; isso não prova ausência de autenticação própria. As três funções principais foram inspecionadas e os bundles incorporados foram decodificados:

| Função | Edge version | Userscript | Source SHA |
|---|---:|---|---|
| `upstatus` | 480 | 3.4.7 | `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd` |
| `upstatus-team-lite` | 15 | 3.4.30 | `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb` |
| `upstatus-screen-share-3-1-1-beta10` | 6 | 3.1.1-beta8 | `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29` |

Os três bundles ainda têm dois emissores `chat_fast` com mensagem completa e um receptor que lê `payload.message`; nenhum contém `openVoiceRoom` ou chamadas às RPCs de recibos/rate limit. O endpoint de sinalização existe somente no projeto isolado, não na lista de produção.

A função `upstatus-backup-327-pre328` permanece ACTIVE v1 com entrypoint `index.ts` de zero bytes e SHA `3d6c4f8e5f777830ea720ab2938cb023b5a4e4c7d26f3fc02b926ce0e4d0dd90`; comportamento e consumidores não verificados.

### Issues e próximos gates

- #78 está aberta, seis comentários; a engenharia reconheceu a implementação candidata de open join. Os critérios manuais continuam desmarcados.
- #79 está aberta, 56 comentários. O corpo principal continua com a fotografia antiga de 2026-11-03; os comentários recentes registram os heads, open join, source parity e produção inalterada.

Próximos gates:
1. Corrigir TEAM-LITE-VOICE-LEAVE e cobrir saída real da UI/logout.
2. Implementar `Retry-After` e integrar rate limit aos endpoints de produto.
3. Obter o Smoke do head documental atual #74.
4. Resolver RT-01 e planejar corte coordenado dos clientes legados.
5. Validar migrations oficiais de voz, recibos, rate limit e ACL no ambiente oficial de TEST; obter caminho administrativo suportado para supabase_admin.
6. Completar testes manuais da #78 e interoperabilidade instalada.
7. Auditar as 35 Edge Functions restantes, incluindo o backup vazio.
8. Obter reviews humanos e revisar a ancestralidade extensa do #74.

Nenhuma escrita em produção, migration, deploy, merge, release, publicação de userscript, alteração de secret/flag/role ou operação destrutiva foi realizada. As consultas Supabase foram SELECT-only. Não foram executados testes mutáveis pela auditoria.


## Correção de fotografia — 2026-11-05: novo head Normal e hardening do deploy

Após o checkpoint anterior, a engenharia avançou novamente a PR #74:

- **Head atual #74**: `2f226e11cbe7c19fd83cc5a72940eaf93bf274d8`, 638 commits à frente de master e zero atrás; 59 arquivos alterados; PR aberta e Draft.
- Commit intermediário [1495716](https://github.com/Reekyi/UpStatus/commit/1495716cf3613c0be19a30a31ddd1ce2e710eaf1) adicionou hardening a `.github/workflows/deploy-production.yml`:
  - checkout explícito em `${{ github.sha }}`;
  - execução permitida somente em `refs/heads/master`;
  - validação de `git rev-parse HEAD == GITHUB_SHA`;
  - project ID esperado fixado em `dlfvkawaiqduhlazsszm`, comparado ao secret `SUPABASE_PROJECT_ID`;
  - exigência de `SUPABASE_ACCESS_TOKEN`;
  - release estável travada em 3.4.7;
  - Supabase CLI fixado em 2.122.1 e action de setup fixada por SHA.
- O workflow continua implantando somente a Edge Function `upstatus`; não faz deploy coordenado de Team Lite.
- Commit [2f226e1](https://github.com/Reekyi/UpStatus/commit/2f226e11cbe7c19fd83cc5a72940eaf93bf274d8) acrescentou uma regressão estática no `scripts/signaling-static.test.mjs`, blob SHA `0fda7903e2a5b72f966ee58500a1a3866c77b706`, para conferir os guards de branch, SHA, projeto, credenciais, versão estável e CLI antes do deploy.
- O Validate [42122463533](https://github.com/Reekyi/UpStatus/actions/runs/42122463533) passou no commit intermediário `1495716`; o Smoke [42122463556](https://github.com/Reekyi/UpStatus/actions/runs/42122463556) estava PENDING. O head mais novo `2f226e11` ainda não apresentava workflow associado na última consulta. O novo guard estático precisa passar no Smoke do head atual.
- O workflow agora verifica branch master, checkout igual ao SHA despachado, project ID e versão da CLI. Ainda não há uma allowlist independente de release SHA; o SHA é o commit de master escolhido no dispatch e o gate de versão é 3.4.7. As proteções externas de aprovação do GitHub Environment `production` não foram inspecionadas. Nenhum deploy foi executado.

A correção acima encerra a pendência anterior de ausência de branch/project/CLI guards no YAML, mas não altera o bloqueio de produção: migrations, Realtime, ACL, integração de rate limit, RPCs e validação manual continuam pendentes. TEAM-LITE-VOICE-LEAVE também permanece aberto no head atual #76.


### Correção final de head #74 — 2026-11-05

A #74 avançou novamente após o commit `2f226e11`. O head observado agora é `b0c0e03fbe820e02404d4ae7d9f83e2a18642e50`, 639 commits à frente de master e zero atrás, com 59 arquivos alterados. O commit [b0c0e03](https://github.com/Reekyi/UpStatus/commit/b0c0e03fbe820e02404d4ae7d9f83e2a18642e50) apenas corrige o contador da regressão estática de guards de deploy para `16/16`; não altera runtime nem o workflow de deploy. Nenhum workflow estava associado a esse head na última consulta. Portanto, o Smoke verde anterior continua ligado ao runtime head `73c19d5`; o guard de deploy foi validado em código, mas a regressão estática adicionada depois ainda precisa de execução no head atual.


### Atualização de CI do head #74 — 2026-11-05

A execução associada ao head atual `b0c0e03fbe820e02404d4ae7d9f83e2a18642e50` apareceu após a correção anterior:
- Validate [42122609464](https://github.com/Reekyi/UpStatus/actions/runs/42122609464): SUCCESS.
- Signaling Smoke [42122609431](https://github.com/Reekyi/UpStatus/actions/runs/42122609431): PENDING, ainda sem job na consulta.
O novo teste estático de deploy está incluído no `signaling-static.test.mjs`, executado pelo Signaling Smoke. Portanto, aguardar esse run é necessário para validar o contador 16/16 no head atual.


## Revalidação independente — 2026-11-05 20:34 BRT

Esta fotografia foi acrescentada após nova leitura do documento QA, comparação dos refs, inspeção dos workflows e consultas SELECT-only nos projetos de produção e isolado. Ela substitui os estados anteriores quando os heads/runs abaixo forem mais recentes.

### Heads e evidência exata de CI

| PR | Head confirmado | Comparação | Evidência atual | Resultado |
|---|---|---|---|---|
| #74 Normal | `b0c0e03fbe820e02404d4ae7d9f83e2a18642e50` | 639 ahead / 0 behind de master | Validate [42122609464](https://github.com/Reekyi/UpStatus/actions/runs/42122609464); Smoke [42122609431](https://github.com/Reekyi/UpStatus/actions/runs/42122609431) | **AUTOMATED PASS** nos dois workflows |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 59 ahead / 0 behind de team-lite-official | Histórico Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | **HISTORICAL PASS**, superado pelo trabalho de #76 |
| #76 Team Lite | `561026304756b9a2e5bd2029e59eda630df1b5cd` | 175 ahead / 0 behind de team-lite-official; 116 ahead / 0 behind de #75 | Candidate Checks [42125597354](https://github.com/Reekyi/UpStatus/actions/runs/42125597354), job [127588838635](https://github.com/Reekyi/UpStatus/actions/runs/42125597354) | **FAIL** no último passo de regressões do candidato |
| #82 QA | `bf2928cf4eaa8f4c942a5bbd38b751578701b848` | 40 ahead / 0 behind de master | Validate [42122684334](https://github.com/Reekyi/UpStatus/actions/runs/42122684334) | **BLOCKED** pelo baseline `production updateURL mismatch` |

#74 permanece aberto/Draft e não mesclado. O job Smoke `127581999363` passou no head exato: 15/15 verificações não autenticadas, 103/103 autenticadas, open voice join/late join por aliases, idempotência, capacidade, owner handoff e corrida owner-leave/late-join, WebRTC call/voice/screen, mesh de três participantes, teardown, rate limit 90 aceitos + 1 HTTP 429, concorrência de rate limit e recibos atômicos. A limpeza das fixtures foi confirmada. O run verde é do head `b0c0e03`, não deve ser atribuído a outro SHA.

#75 continua sendo baseline histórico; #76 é sua continuação, não um merge independente. Nenhum dos quatro PRs (#74/#75/#76/#82) possui review humano submetido ou thread de revisão registrada na consulta desta rodada.

### TEAM-LITE-VOICE-LEAVE — nova falha no CI e risco residual

A correção de saída Team Lite foi fast-forward para a branch da PR #76. O source atual da PR tem blob SHA `5337a5e8c7a8bbe81fdf6870b2aebccc54d521cc`; o harness tem blob SHA `5de3124f6cb2314b05ad13ae2840b0d79b91a535`.

O workflow [42125597354](https://github.com/Reekyi/UpStatus/actions/runs/42125597354) completou:
- 103/103 verificações autenticadas;
- open join, late join, idempotência, aliases, capacidade, owner handoff e concorrência;
- Chromium WebRTC de chamada, voz e tela, mesh e teardown;
- rate limit, recibos atômicos e migration-layout guard;
- limpeza das fixtures.

Mas falhou no passo `Check candidate scripts and version metadata`, em `scripts/team-lite-candidate-check.mjs:411`, com a asserção: `failed active leave must retry through signalReleaseVoiceRoom while the room binding remains`. Portanto, #76 **não está verde no head 5610263**.

A inspeção do userscript confirma que `voiceRoomLeave()` agora compartilha uma Promise, aguarda o sinal final e o leave RPC, interrompe o polling, faz logout aguardando o leave e serializa reentrada durante a saída. Porém, a função `signalReleaseVoiceRoom()` ainda limpa `signalVoiceRoomRoomId`, `signalVoiceRoomPrepared` e `signalVoiceRoomCreator` antes de o RPC confirmar sucesso e captura/suprime a falha. Se o fallback de leave também falhar, o cliente perde o identificador necessário para retry. Isso é um risco confirmado por inspeção de código.

A falha da asserção mostra que o harness não observou o fallback esperado; a causa imediata dessa divergência entre o fluxo extraído e o mock ainda não foi isolada. Não classificar como mero falso positivo nem como falha comprovada de runtime sem corrigir/reproduzir o caso. Próximo gate: preservar room ID/prepared state até sucesso confirmado, propagar ou registrar falha, permitir retry idempotente, e testar saída pela UI, logout, falha do primeiro leave, falha do fallback e rejoin. O teste atual chama diretamente a função/harness; ainda é necessária cobertura de UI/browser.

### Deploy de produção

O workflow `.github/workflows/deploy-production.yml` foi reconsultado; blob SHA `f3493d19cb59bb4d9f41eb4ab05d542befa2b8ce`. A inspeção confirma:
- checkout explícito em `${{ github.sha }}` com action fixada e `persist-credentials: false`;
- execução somente em `refs/heads/master`;
- conferência `git rev-parse HEAD == GITHUB_SHA`;
- project ID esperado `dlfvkawaiqduhlazsszm` comparado ao secret;
- token de acesso obrigatório;
- release estável fixada em 3.4.7;
- Supabase CLI fixado em 2.122.1.

O workflow ainda implanta somente `upstatus`, não o Team Lite. O SHA é o commit de master selecionado no dispatch, não uma allowlist independente de release SHA. As proteções externas do GitHub Environment `production` continuam **NOT VERIFIED**. Nenhum deploy foi executado.

### Projeto Supabase isolado

Projeto `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, região sa-east-1, PostgreSQL 17.11.0.003, 21 migrations até `20261105220323`. `upstatus-signal-test` está ACTIVE v28; `upstatus-signal-e2e-once` ACTIVE v3.

Após o run #76 que falhou no último harness, uma consulta independente SELECT-only encontrou zero linhas em `upstatus_signal_rooms`, `upstatus_signal_room_members`, `upstatus_signal_room_bindings`, `upstatus_signal_events` e `upstatus_signal_rate_limits`. Não foi necessária nem tentada limpeza manual. O workflow da engenharia já havia registrado cleanup verificado.

### Produção Supabase — nova fotografia read-only

Projeto `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, us-west-2, PostgreSQL 17.11.0.002, sete migrations até `20261027155438`.

Continuam ausentes:
- `public.upstatus_signal_rate_limits`;
- `public.consume_upstatus_signal_rate_limit(text, integer, integer)`;
- `public.merge_chat_read_receipts(text, jsonb, timestamptz)`;
- `public.open_upstatus_signal_voice_room`;
- `public.leave_upstatus_signal_room`.

As nove tabelas backend-owned (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) mantêm RLS ativo, zero policies, FORCE RLS desativado e privilégios efetivos anon/authenticated para SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN. `upstatus_visual_config` mantém RLS sem grants de cliente. `realtime.messages` mantém RLS ativo, zero policies e grants SELECT/INSERT/UPDATE para anon/authenticated. Esses grants são superfície excessiva; não constituem, isoladamente, prova de leitura/escrita de linhas com RLS ativo e sem policies.

A sessão SQL continua `current_user=postgres`, `session_user=postgres`; postgres não é superuser e não é membro de `supabase_admin`. Os default ACLs de postgres continuam concedendo aos papéis cliente privilégios de tabelas, EXECUTE de funções e SELECT/UPDATE/USAGE de sequences em `public` e `storage`. Os defaults de `supabase_admin` continuam concedendo os mesmos tipos de privilégios em `public`, `graphql` e `graphql_public`. Defaults de schemas gerenciados `extensions` e `realtime` também foram listados, mas os grants observados ali são de postgres/dashboard_user, não anon/authenticated. ACL-02 continua **BLOCKED**, especialmente para o owner `supabase_admin`.

As três funções `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()` e `upstatus_broadcast_users()` continuam SECURITY DEFINER, `search_path=public`, EXECUTE para anon/authenticated/service_role. O trigger `upstatus_messages_broadcast` continua AFTER INSERT/UPDATE/DELETE em `public.messages`; a função serializa OLD/NEW com `to_jsonb` e publica `db_change` com `private=false`. Os triggers de status de usuários e estado remoto também continuam em tópicos públicos. RT-01 permanece bloqueador.

Security Advisor observado em 2026-11-05 23:36:47 UTC: 3 WARN para SECURITY DEFINER executável por anon, 3 WARN para authenticated e 10 INFO de RLS sem policies. Performance e Health Advisors sem findings. Remediações: [anon SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS sem policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

### Edge Functions de produção

A lista atual contém 38/38 funções ACTIVE; todas reportam `verify_jwt=false`, o que não prova ausência de autenticação própria. Versões e source hashes principais permanecem:
- `upstatus`: v480, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`;
- `upstatus-team-lite`: v15, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`;
- `upstatus-screen-share-3-1-1-beta10`: v6, SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`;
- `upstatus-backup-327-pre328`: v1, entrypoint `index.ts` com zero bytes, SHA `3d6c4f8e5f777830ea720ab2938cb023b5a4e4c7d26f3fc02b926ce0e4d0dd90`.

A função de sinalização autenticada continua ausente da lista de produção. O backup vazio não foi exercitado nem desativado; identificar consumers e rollback antes de qualquer ação.

### Issues e aceitação manual

- [#78](https://github.com/Reekyi/UpStatus/issues/78) permanece aberta, 10 comentários, critérios de aceite ainda desmarcados. Perda real de internet por ~10 segundos, recuperação sem F5, reentrada, chamadas novas, áudio/microfone/tela reais e interoperabilidade Tampermonkey Normal ↔ Team Lite continuam **MANUAL PENDING**.
- [#79](https://github.com/Reekyi/UpStatus/issues/79) permanece aberta, 63 comentários. O corpo principal ainda usa a fotografia de 2026-11-03. O comentário mais recente da engenharia dizia que Candidate Checks #42125597354 estava em andamento; esse run agora terminou **FAIL** no teste de fallback acima. O corpo/checklist precisa ser atualizado pelo responsável, mas esta auditoria não alterou a issue.

### Próximos gates

1. Corrigir o fallback de leave Team Lite sem perder room ID/retry context e fazer Candidate Checks verde no head atualizado.
2. Cobrir saída pela UI, logout, falha de RPC e reentrada com browser harness.
3. Implementar `Retry-After` no HTTP 429 e integrar o rate limiter nos endpoints reais.
4. Manter RT-01 bloqueado até eliminar o broadcast público de conteúdo completo e validar cutover dos clientes legados.
5. Validar migrations oficiais de recibos, rate limit, open/leave e ACL no ambiente autorizado de TEST; obter caminho administrativo suportado para `supabase_admin`.
6. Rever escopo de default ACL em schemas gerenciados antes de qualquer rollout.
7. Completar testes físicos da #78, inventário das 35 Edge Functions restantes e investigação do backup vazio.
8. Obter reviews humanos e revisar a ancestralidade extensa de #74/#76.

### Segurança e execução desta rodada

Todas as consultas Supabase desta rodada foram SELECT-only. O run #42125597354 foi iniciado pela engenharia, não por esta auditoria; seu log confirma uso do projeto isolado permitido, opt-in explícito de mutação e cleanup. A auditoria confirmou zero linhas residuais nas tabelas de fixtures. Nenhum workflow foi disparado pela QA. Nenhuma escrita em produção, migration, deploy, alteração de secret/flag/role, publicação de userscript, merge ou operação destrutiva foi realizada. A única escrita desta rodada é este registro documental na branch QA dedicada.


### QA Validate após o commit documental desta rodada

O commit documental `dc49f0a878135f2fd1fbad4b31e62d2367ad0a1c` disparou Validate [42130997021](https://github.com/Reekyi/UpStatus/actions/runs/42130997021). O job [127607267816](https://github.com/Reekyi/UpStatus/actions/runs/42130997021) falhou em `Validate build` com a mesma mensagem herdada `VALIDATION FAILED: production updateURL mismatch`. PR #82 continua alterando somente `docs/RELEASE_READINESS.md`; nenhum código foi modificado para contornar o validador. O novo commit documental não tem aprovação automatizada de Validate.


### Verificação da branch QA antes da última nota documental

Na leitura imediatamente anterior a esta nota, a branch `qa/release-readiness-2026-11-04-master` estava em `69012d2dc41c63c2d6ddcf3ef51d8a90c9a0708f`, 42 commits ahead / 0 behind de `master`, com blob `2e2f96a8abf933db54344651a1a265ff1ab2dc71`. Esta seção registra deliberadamente o checkpoint anterior; o commit que adiciona esta nota passa a ser o head resultante. Seu SHA e blob devem ser lidos do resultado do commit e revalidados no GitHub, sendo reportados no checkpoint externo desta auditoria para evitar uma autorreferência estática dentro do próprio arquivo. PR #82 continua alterando somente `docs/RELEASE_READINESS.md`. O Validate [42130997021](https://github.com/Reekyi/UpStatus/actions/runs/42130997021) pertence ao commit anterior `dc49f0a` e falhou em `production updateURL mismatch`; não atribuir esse run a commits posteriores.


## Revalidação independente — 2026-11-05 21:29 BRT

Esta fotografia foi obtida com GitHub e Supabase read-only. Ela substitui estados anteriores quando o SHA/run abaixo for mais recente. O único arquivo atualizado nesta branch é este documento.

### Heads, PRs e ancestralidade

| PR | Head exato | Estado | Comparação |
|---|---|---|---|
| #74 Normal | **b0c0e03fbe820e02404d4ae7d9f83e2a18642e50** | Aberta/Draft | 639 ahead / 0 behind de master |
| #75 Team Lite baseline | **7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309** | Aberta/Draft | 59 commits sobre team-lite-official; baseline histórico |
| #76 Team Lite signaling | **488a693dbd234817e87aa11eb232533e34459695** | Aberta/Draft | 177 ahead / 0 behind de team-lite-official; 118 ahead / 0 behind de #75 |
| #82 QA | **63e94e3730c5a0bb689f4def4893cd10277ae954** | Aberta/Draft | 44 ahead / 0 behind de master; somente este Markdown |

Nenhum PR foi mesclado. Não há review humano submetido nem thread de revisão nos PRs #74, #75, #76 ou #82. #76 descende de #75; não integrar ambos como merges independentes.

### CI por HEAD exato

**Normal #74 — AUTOMATED PASS**

- Validate [42122609464](https://github.com/Reekyi/UpStatus/actions/runs/42122609464): SUCCESS.
- Signaling Smoke [42122609431](https://github.com/Reekyi/UpStatus/actions/runs/42122609431): SUCCESS.
- O Smoke no head exato b0c0e03 concluiu 15/15 verificações não autenticadas e 103/103 autenticadas, incluindo open voice join/late join por aliases Normal/Team Lite, idempotência, capacidade, owner handoff, concorrência owner-leave/late-join, WebRTC call/voice/screen, mesh de três participantes, teardown, rate limit 90 aceitos + 1 HTTP 429, concorrência do rate limiter, recibos atômicos e cleanup.

**Team Lite #76 — AUTOMATED FAIL**

- Candidate Checks [42134550466](https://github.com/Reekyi/UpStatus/actions/runs/42134550466), head exato 488a693dbd234817e87aa11eb232533e34459695: FAILURE.
- Job [127624287840](https://github.com/Reekyi/UpStatus/actions/runs/42134550466) passou guard de mutação, adapter, autenticação do endpoint, integração/browser, 103/103 checks autenticados, WebRTC call/voice/screen, mesh de três membros, rate limit, recibos atômicos, migration-layout guard e cleanup.
- A falha ocorreu no passo final Check candidate scripts and version metadata, em scripts/team-lite-candidate-check.mjs:483: “voiceRoomSend must deliver the final leave signal before invoking the membership RPC”.
- O commit [488a693](https://github.com/Reekyi/UpStatus/commit/488a693dbd234817e87aa11eb232533e34459695) adicionou o teste de retry context e alterou o timing de outro teste para aguardar setTimeout(0). O teste que falha ainda aguarda somente duas microtasks com Promise.resolve(), embora a função extraída seja executada em outro contexto VM e percorra uma cadeia assíncrona de envio→leave. Como o próprio harness precisou de um turno do event loop para a asserção de fallback imediatamente anterior, a causa provável é uma janela de agendamento insuficiente no teste. Isso não está provado como falso positivo: o CI permanece vermelho até que o teste use sincronização determinística e o workflow completo passe.
- Source Team Lite: blob 3f129257f0d0c0273f3092f5b5e3f2750f3c96ad. Harness: blob 4cf17b1afe32647f1381fca13a0877370bb2e6ac. O helper signalReleaseVoiceRoom() agora preserva room ID/prepared/owner até confirmação do RPC, retorna false em falha e informa o usuário. Os testes de retry context e fallback passaram antes da asserção final que falhou.

**Team Lite #75 — HISTORICAL PASS**

- Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) continua sendo evidência histórica do baseline inalterado; não substitui a validação atual de #76.

**QA #82 — VALIDATION BLOCKED**

- Head atual 63e94e3730c5a0bb689f4def4893cd10277ae954.
- Validate [42131148632](https://github.com/Reekyi/UpStatus/actions/runs/42131148632) falhou em scripts/validate.mjs:26 com “VALIDATION FAILED: production updateURL mismatch”, após build 3.4.7 / TEST 3.4.7.
- O PR altera somente docs/RELEASE_READINESS.md; não foi alterado o validador para contornar o baseline.

### Novo achado de código — logout Team Lite pode invalidar sessão após leave não confirmado

**CODE INSPECTION — bloqueador de robustez do leave/logout.**

No userscript Team Lite atual, blob 3f129257f0d0c0273f3092f5b5e3f2750f3c96ad:

- signalReleaseVoiceRoom() retorna false se o RPC falhar e mantém o room ID para retry.
- voiceRoomLeave() aguarda o fallback, mas não transforma um resultado false em rejeição/estado de falha persistente; a Promise de leave pode resolver mesmo sem confirmação do servidor.
- teamLiteReleaseVoiceRoomBeforeLogout() apenas aguarda voiceRoomLeave(); não verifica se a membership foi realmente liberada.
- teamLiteEndSession() captura exceções e continua: define authenticated=false, incrementa a geração, chama /api/logout, limpa token/membro do estado e do Tampermonkey e volta ao login.

Consequência: se o leave inicial e o fallback falharem por rede, o logout ainda pode invalidar a sessão e apagar a credencial necessária para repetir a operação. A membership accepted pode permanecer no servidor até expiração/limpeza, consumindo capacidade e mantendo estado de sala incorreto. O teste atual comprova que logout espera uma Promise pendente, mas não cobre o cenário em que a liberação termina com false.

Gate exigido: propagar um resultado explícito de leave confirmado/não confirmado; não invalidar a sessão enquanto a associação não tiver sido removida, ou fornecer uma revogação server-side de membership ligada ao encerramento da sessão. Adicionar teste de logout com primeira tentativa e fallback falhando, seguido de retry/recuperação. Não basta testar apenas que logout espera uma Promise.

### Achado cruzado no Normal — retry context ainda é descartado

**CODE INSPECTION — não é teste de runtime.**

No Normal #74, template de userscript blob 423a17d244afa08529a1af489432c379f81d20aa, voiceRoomLeave():
- limpa signalVoiceRoomRoomId e signalVoiceRoomCreator antes da confirmação de signalTransport.leave(leavingRoomId);
- limpa o roster cache antes da confirmação;
- suprime falha com catch vazio.

A observação também está registrada pela engenharia em [#78, comentário 6672940725](https://github.com/Reekyi/UpStatus/issues/78#issuecomment-6672940725). Portar a correção de retry context do Team Lite para Normal, com regressões fail-then-success e falha persistente, sem alterar a branch Normal durante uma execução mutável compartilhada.

### Projeto Supabase isolado — evidência atual

Projeto bfpjtfqlnypisxljoxkb: ACTIVE_HEALTHY, sa-east-1, PostgreSQL 17.11.0.003, 21 migrations até 20261105220323.

- upstatus-signal-test: ACTIVE v28, source SHA e26011f026c74821a1e05bf314340604d715820ab864b63d66fd481d93d00d4f.
- upstatus-signal-e2e-once: ACTIVE v3, source SHA db0c9206b2171f5f5d67459e2e7451ecbaf6e8ad3c8f55cb4e491660164f5053.
- RPCs consume_upstatus_signal_rate_limit, merge_chat_read_receipts, open_upstatus_signal_voice_room e leave_upstatus_signal_room existem. Todas foram observadas como SECURITY INVOKER, search_path vazio, EXECUTE negado a anon/authenticated e permitido a service_role.
- Após o run #76, consultas SELECT-only encontraram zero linhas em rooms, members, bindings, events e rate_limits. Não foi necessária limpeza manual.
- O endpoint isolado usa a RPC de rate limit e retorna HTTP 429, mas o helper de resposta não adiciona Retry-After.
- Os templates de API de produto Normal/Team Lite chamam merge_chat_read_receipts, mas não chamam consume_upstatus_signal_rate_limit. O rate limiter está no serviço de sinalização isolado; não está integrado aos endpoints de produto implantados.

### Produção Supabase — nova fotografia read-only

Projeto dlfvkawaiqduhlazsszm: ACTIVE_HEALTHY, us-west-2, PostgreSQL 17.11.0.002, sete migrations até 20261027155438.

As seguintes relações/funções continuam ausentes: upstatus_signal_rate_limits, consume_upstatus_signal_rate_limit(text,integer,integer), merge_chat_read_receipts(text,jsonb,timestamptz), open_upstatus_signal_voice_room e leave_upstatus_signal_room. O resultado de to_regclass/to_regprocedure foi NULL para todas.

**RLS/grants:**
- As nove tabelas backend-owned chat_reads, messages, reactions, status_history, upstatus_profiles, upstatus_sessions, upstatus_state, upstatus_typing e users mantêm RLS ativo, zero policies, FORCE RLS desativado e privilégios efetivos para anon/authenticated: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN.
- upstatus_visual_config mantém RLS sem grants de cliente.
- realtime.messages tem RLS ativo, zero policies e grants SELECT/INSERT/UPDATE para anon/authenticated.
- Os grants excessivos não provam, isoladamente, acesso direto às linhas via PostgREST com RLS ativo e sem policies; continuam sendo superfície de privilégio desnecessária.

**SECURITY DEFINER/Realtime:**
- upstatus_broadcast_messages(), upstatus_broadcast_remote_state() e upstatus_broadcast_users() continuam SECURITY DEFINER, search_path=public, EXECUTE efetivo para anon/authenticated/service_role.
- O trigger upstatus_messages_broadcast continua AFTER INSERT/UPDATE/DELETE em public.messages; a função serializa OLD/NEW com to_jsonb e chama realtime.send(..., 'db_change', ..., false). O último argumento mantém o broadcast público.
- Os triggers de estado remoto e status dos usuários também continuam publicando metadados em tópicos públicos. RT-01 permanece BLOCKED.

**Default ACL:**
- Defaults de postgres continuam concedendo a anon/authenticated privilégios de tabelas, funções e sequences nos schemas public e storage.
- Defaults de supabase_admin continuam concedendo privilégios equivalentes em public, graphql e graphql_public.
- A consulta efetiva acldefault('f', postgres) confirmou PUBLIC:EXECUTE e postgres:EXECUTE. Não há override global de default ACL que retire PUBLIC EXECUTE. ACL-02 permanece BLOCKED; postgres não é superuser e não pertence a supabase_admin.

**Security Advisor**, observado em 2026-11-06 00:29:28 UTC:
- 3 WARN SECURITY DEFINER executável por anon;
- 3 WARN SECURITY DEFINER executável por authenticated;
- 10 INFO RLS habilitado sem policy;
- Performance e Health sem findings.

### Edge Functions e bundles implantados

A produção lista 38/38 funções ACTIVE, todas com verify_jwt=false; isso não prova ausência de autenticação própria. As principais permanecem:
- upstatus v480, SHA bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd, userscript interno 3.4.7;
- upstatus-team-lite v15, SHA 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb, userscript interno 3.4.30;
- upstatus-screen-share-3-1-1-beta10 v6, SHA f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29.

Os bundles incorporados de Normal e Team Lite foram decodificados nesta rodada: cada um ainda possui dois emissores chat_fast que enviam {message: ...} e um receptor que lê payload.message. Nenhum dos dois bundles contém openVoiceRoom, chamada à RPC de recibos ou chamada à RPC de rate limit. A função de sinalização autenticada não existe no inventário de produção; o cliente exige configuração explícita de endpoint same-origin em /functions/v1/upstatus-signal ou -test. Em produção não existe upstatus-signal, portanto o transporte candidato não pode ser habilitado contra o projeto oficial.

A função upstatus-backup-327-pre328 permanece ACTIVE v1 com index.ts vazio (0 bytes), SHA 3d6c4f8e5f777830ea720ab2938cb023b5a4e4c7d26f3fc02b926ce0e4d0dd90. Não foi testada nem desativada; consumidores e rollback continuam NOT VERIFIED.

### Deploy workflow

O workflow .github/workflows/deploy-production.yml, blob SHA f3493d19cb59bb4d9f41eb4ab05d542befa2b8ce, contém checkout SHA fixado, branch master obrigatória, comparação HEAD/GITHUB_SHA, project ID esperado, token obrigatório, release 3.4.7 e Supabase CLI 2.122.1. Ainda implanta somente upstatus, não Team Lite; não há allowlist independente de SHA aprovado e as proteções externas do GitHub Environment production permanecem NOT VERIFIED. Nenhum deploy foi executado.

### Issues e testes manuais

- [#78](https://github.com/Reekyi/UpStatus/issues/78) está aberta, 12 comentários; a regra funcional continua sendo sala de voz aberta, sem convite/aceitação. Todos os critérios manuais permanecem desmarcados.
- [#79](https://github.com/Reekyi/UpStatus/issues/79) está aberta, 64 comentários; o corpo principal ainda contém a fotografia de 2026-11-03. O comentário [6672919235](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6672919235) registra o head #76 488a693 e o CI pendente na hora do comentário; o run depois terminou FAIL.
- Queda real de internet por ~10 segundos, recuperação sem F5, pagehide, reentrada, chamadas após reconexão, microfone/áudio/tela reais, Tampermonkey em perfis separados e interoperabilidade instalada Normal ↔ Team Lite continuam MANUAL PENDING.

### Próximos gates

1. Corrigir o logout Team Lite para não apagar token/sessão se leave e fallback não forem confirmados; testar falha persistente e retry.
2. Tornar determinística a asserção de ordem final-signal→membership-RPC no harness e obter Candidate Checks verde no head atualizado.
3. Portar para Normal a retenção do room ID/owner/roster até confirmação do leave; testar falha seguida de retry e falha persistente.
4. Cobrir saída pela UI, logout, pagehide, falha do primeiro RPC, falha do fallback e reentrada.
5. Implementar Retry-After e integrar rate limit aos endpoints reais.
6. Manter RT-01 bloqueado até remover broadcast público de conteúdo completo e validar corte coordenado dos clientes legados.
7. Validar migrations oficiais de voz, recibos, rate limit e ACL no ambiente autorizado de TEST; obter caminho administrativo suportado para supabase_admin.
8. Completar testes físicos da #78, inventário das Edge Functions restantes e investigação do backup vazio.
9. Obter reviews humanos e revisar a ancestralidade extensa de #74/#76.

### Segurança e execução desta rodada

Todas as consultas SQL desta rodada foram SELECT-only. O workflow [42134550466](https://github.com/Reekyi/UpStatus/actions/runs/42134550466) foi iniciado pela engenharia, não pela QA; os logs confirmam o project ref isolado, opt-in explícito de mutação e cleanup. A auditoria confirmou zero linhas residuais nas tabelas de fixtures. Nenhum workflow foi disparado manualmente pela QA. Nenhuma escrita em produção, migration, deploy, alteração de secret/flag/role, publicação de userscript, merge ou operação destrutiva foi realizada. A única escrita desta rodada é este registro documental na branch QA dedicada.


## Revalidação independente — 2026-11-05 22:31 BRT

Esta seção substitui os estados anteriores quando há SHA, execução ou catálogo mais recente. A leitura da branch QA ocorreu antes da escrita; a atualização foi condicionada ao head #82 `3cb3539ba10c0061d104d5936c2c04ee5bb81b79` e ao blob atual `782397b450590a8e916f2affc0705c7b13bb154f`. Nenhum arquivo de engenharia foi alterado.

### Heads, ancestralidade e reviews

| PR | Head exato | Estado | Comparação |
|---|---|---|---|
| #74 Normal | `b0c0e03fbe820e02404d4ae7d9f83e2a18642e50` | Aberta/Draft | 639 ahead / 0 behind de master |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Aberta/Draft | 59 ahead / 0 behind de team-lite-official |
| #76 Team Lite signaling | `092dc83c75e2257de2a5564429cc7d9995403509` | Aberta/Draft | 190 ahead / 0 behind de team-lite-official; 131 ahead / 0 behind de #75 |
| #82 QA | `3cb3539ba10c0061d104d5936c2c04ee5bb81b79` | Aberta/Draft | 45 ahead / 0 behind de master; somente `docs/RELEASE_READINESS.md` |

Nenhum dos PRs foi mesclado. As consultas de reviews e review threads retornaram zero submissões e zero threads nos PRs #74, #75, #76 e #82. #76 continua descendente de #75; não tratar os dois como merges independentes.

### CI por HEAD exato

**Normal #74 — AUTOMATED PASS**

- Validate [42122609464](https://github.com/Reekyi/UpStatus/actions/runs/42122609464): SUCCESS.
- Signaling Smoke [42122609431](https://github.com/Reekyi/UpStatus/actions/runs/42122609431): SUCCESS.
- O Smoke no head exato `b0c0e03` passou 15/15 verificações não autenticadas e 103/103 autenticadas, incluindo open voice join/late join, aliases Normal/Team Lite, idempotência, capacidade, owner handoff, concorrência de saída/entrada, WebRTC call/voice/screen, mesh de três participantes, rate limit 90 aceitos + 1 HTTP 429, concorrência, recibos atômicos e cleanup.

**Team Lite #76 — PENDING no head atual**

- Head exato `092dc83c75e2257de2a5564429cc7d9995403509`.
- Candidate Checks [42143206998](https://github.com/Reekyi/UpStatus/actions/runs/42143206998): `in_progress`, job [127648319099](https://github.com/Reekyi/UpStatus/actions/runs/42143206998).
- Na última observação, mutation guard, adapter e autenticação do endpoint haviam concluído com SUCCESS. A etapa de integração autenticada/browser ainda estava `in_progress`; rate-limit concurrency, read-receipt concurrency, migration-layout guard, candidate metadata e cleanup ainda estavam pendentes. Não declarar pass/fail até o término do run.
- A execução pertence à engenharia e usa o projeto isolado. Consultas SELECT-only durante o run encontraram 10 salas, 12 memberships, 2 bindings, 1 evento e 6 rate-limit buckets. Esses registros são compatíveis com fixtures em uso. Não iniciar outra suíte mutável nem limpar manualmente enquanto o run estiver ativo.
- O commit [092dc83](https://github.com/Reekyi/UpStatus/commit/092dc83c75e2257de2a5564429cc7d9995403509) adiciona `realtimeRetryTimer: null` ao contexto VM do teste de readiness. É uma correção de harness; o run exato ainda não terminou.

**Team Lite #75 — HISTORICAL PASS**

- Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): SUCCESS no baseline inalterado. Não substitui o resultado atual de #76.

**QA #82 — VALIDATION BLOCKED**

- Validate [42137572524](https://github.com/Reekyi/UpStatus/actions/runs/42137572524): FAILURE no head exato `3cb3539`.
- O log mostra build `UpStatus 3.4.7 / TEST 3.4.7`, seguido de `scripts/validate.mjs:26`: `VALIDATION FAILED: production updateURL mismatch`.
- O PR altera somente este Markdown. O validador não foi enfraquecido nem modificado; o erro continua sendo uma incompatibilidade do contrato de URL do baseline, não uma aprovação da documentação.

### Reconexão: dois candidatos ainda não equivalem a aceite

A reprodução manual da [issue #78](https://github.com/Reekyi/UpStatus/issues/78) continua registrada como falha confirmada: após aproximadamente 10 segundos sem internet, os clientes podem não recuperar entrada em sala/chamadas sem F5. Nenhum teste manual de recuperação foi aprovado.

**Normal:** a branch separada `normal/reconnect-recovery-candidate` está no commit [08ebf838](https://github.com/Reekyi/UpStatus/commit/08ebf838f327134a672d06d787d9cdbd778d801b), 15 commits ahead / 0 behind do head #74. O compare mostra dois arquivos alterados: `src/userscript/upstatus.user.template.js` e `scripts/signaling-static.test.mjs`. O commit não possui workflow run associado. A branch candidata inclui teardown local offline, espera de Realtime SUBSCRIBED antes de rejoin/chamadas, leave Promise serializada, captura da instância de transporte para evitar leave tardio em transporte substituído, retenção do room ID em falha e proteção contra tentativa de chamada duplicada. Isso é CODE INSPECTION; ainda não está integrado ao PR #74 nem automatizado em CI.

**Team Lite:** o head atual #76 inclui handlers offline/online, teardown local com `skipServerLeave`, reconstrução do Realtime e espera de até 10 segundos por canal pronto antes de rejoin/chamada legada. A suíte exata está em andamento no run acima. A aceitação física permanece MANUAL PENDING.

### Novo achado de código — logout Team Lite pode invalidar a sessão após leave não confirmado

**CODE INSPECTION — bloqueador de robustez.**

No userscript Team Lite do head #76, blob `fb5524fcd4e38896f315bdeae1713862a49f9581`:

- `signalReleaseVoiceRoom()` preserva room ID/prepared/owner se o RPC falha e retorna `false`.
- `voiceRoomLeave()` aguarda o sinal final e o fallback, mas suprime a rejeição do leave inicial e não transforma o resultado `false` do fallback em falha da Promise de saída.
- `teamLiteReleaseVoiceRoomBeforeLogout()` apenas aguarda `voiceRoomLeave()`; não verifica se a associação foi confirmada como removida nem se `signalVoiceRoomRoomId` ficou vazio.
- `teamLiteEndSession()` captura exceções e continua: invalida `authenticated`, incrementa `authGeneration`, chama `/api/logout`, para Realtime e apaga token/membro do estado e do Tampermonkey.

Se o leave inicial e o fallback falharem por rede, a Promise pode resolver mesmo com a membership ainda ativa. O logout então remove a credencial que permitiria repetir o leave. A associação accepted pode permanecer no servidor até a expiração da sala.

O harness atual testa que logout aguarda uma Promise pendente que depois resolve com sucesso. Não simula fallback retornando `false`, falha persistente e preservação da sessão. Gate: propagar estado explícito de leave confirmado/não confirmado; manter sessão para retry ou implementar revogação server-side da membership no encerramento da sessão; testar falha inicial + fallback falho + retry bem-sucedido.

### Risco de ocupação por membership offline — TTL fixo do candidato

**CODE INSPECTION — impacto limitado, requisito ainda não aceito.**

A migration `20261105190000_open_voice_room_membership.sql` cria salas com `expires_at = now() + interval '2 hours'`. Ao reutilizar uma sala ativa, a RPC não estende esse TTL. A tabela `upstatus_signal_room_members` contém `joined_at` e `status`, sem heartbeat/last_seen por membro. O endpoint isolado executa cleanup no máximo uma vez por minuto e remove salas expiradas; as FKs fazem cascade para memberships e eventos.

O caminho offline dos clientes usa leave local (`skipServerLeave`) para não depender da rede. Portanto, um membro desconectado sem leave confirmado pode continuar como `accepted` e contar para o limite de 32 até a expiração da sala (no máximo duas horas desde sua criação). O rejoin do mesmo usuário é idempotente, mas outros participantes podem observar ocupação residual. Não é prova de vazamento permanente; é um limite operacional a aceitar/documentar ou resolver com lease/heartbeat e testes de capacidade após quedas.

### Projeto Supabase isolado — estado durante o CI

Projeto `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, região `sa-east-1`, PostgreSQL 17.11.0.003, 21 migrations até `20261105220323`.

- `upstatus-signal-test`: ACTIVE v28, SHA `e26011f026c74821a1e05bf314340604d715820ab864b63d66fd481d93d00d4f`.
- `upstatus-signal-e2e-once`: ACTIVE v3, SHA `db0c9206b2171f5f5d67459e2e7451ecbaf6e8ad3c8f55cb4e491660164f5053`.
- As RPCs `consume_upstatus_signal_rate_limit`, `merge_chat_read_receipts`, `open_upstatus_signal_voice_room` e `leave_upstatus_signal_room` existem. Foram observadas como SECURITY INVOKER, `search_path` vazio, EXECUTE negado a anon/authenticated e permitido a service_role.
- Os fixtures não estavam vazios durante esta observação porque o Candidate Checks [42143206998](https://github.com/Reekyi/UpStatus/actions/runs/42143206998) estava ativo. Nenhuma limpeza manual foi feita.

### Produção Supabase — catálogo e runtime atuais

Projeto `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, `us-west-2`, PostgreSQL 17.11.0.002, sete migrations até `20261027155438`.

As relações/funções candidatas continuam ausentes: `upstatus_signal_rate_limits`, `consume_upstatus_signal_rate_limit`, `merge_chat_read_receipts`, `open_upstatus_signal_voice_room` e `leave_upstatus_signal_room`; `to_regclass`/`to_regprocedure` retornaram NULL.

**RLS/grants:**
- As nove tabelas backend-owned `chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing` e `users` mantêm RLS ativo, zero policies, FORCE RLS desativado e os oito privilégios efetivos para anon/authenticated: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN.
- `upstatus_visual_config` mantém RLS e nenhum privilégio de cliente.
- `realtime.messages` mantém RLS ativo, zero policies e SELECT/INSERT/UPDATE para anon/authenticated. Os grants não provam acesso a linhas por si sós com RLS ativo e sem policies.

**Default ACL:**
- Defaults de postgres continuam concedendo a anon/authenticated privilégios de sequences, funções e tabelas nos schemas `public` e `storage`.
- Defaults de supabase_admin continuam concedendo esses privilégios em `public`, `graphql` e `graphql_public`. No schema gerenciado `realtime`, os defaults observados eram para dashboard_user/postgres, não para anon/authenticated.
- `acldefault('f', postgres)` continua incluindo PUBLIC EXECUTE e EXECUTE para postgres. ACL-02 permanece BLOCKED; a sessão é postgres, sem superuser e sem membership em supabase_admin.

**SECURITY DEFINER e triggers:**
- `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()` e `upstatus_broadcast_users()` continuam SECURITY DEFINER, owner postgres, `search_path=public`, EXECUTE efetivo para anon/authenticated/service_role.
- Os três triggers estão habilitados. `upstatus_messages_broadcast` dispara AFTER INSERT/UPDATE/DELETE em `public.messages`; a função serializa OLD/NEW com `to_jsonb` e chama `realtime.send(..., 'db_change', ..., false)`. O broadcast de mensagem continua público e inclui conteúdo/metadados.
- Os triggers de estado remoto e status de usuários também publicam metadados em tópicos públicos. RT-01 permanece BLOCKED.

**Security Advisor**, observado em `2026-11-06T01:31:28.378Z`:
- 3 WARN SECURITY DEFINER executável por anon;
- 3 WARN SECURITY DEFINER executável por authenticated;
- 10 INFO RLS habilitado sem policy;
- Performance e Health sem findings.

### Edge Functions e bundles de produção

O inventário contém 38/38 funções ACTIVE; todas reportam `verify_jwt=false`, o que não prova ausência de autenticação própria. Os três runtimes principais continuam:

- `upstatus`: v480, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`, userscript 3.4.7.
- `upstatus-team-lite`: v15, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`, userscript 3.4.30.
- `upstatus-screen-share-3-1-1-beta10`: v6, SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`, userscript 3.1.1-beta8.

A decodificação read-only dos três bundles confirma em cada um dois emissores `chat_fast` com payload `message` e um receptor que lê `payload.message`. Nenhum contém `openVoiceRoom`; os runtimes server-side não chamam a RPC de recibos nem a RPC de rate limit. A função `upstatus-signal` autenticada continua ausente do projeto de produção.

`upstatus-backup-327-pre328` permanece ACTIVE v1, entrypoint `index.ts` vazio (0 bytes), SHA `3d6c4f8e5f777830ea720ab2938cb023b5a4e4c7d26f3fc02b926ce0e4d0dd90`. Não foi exercitada nem desativada; consumidores e rollback permanecem NOT VERIFIED.

### Deploy, issues e aceitação manual

- `.github/workflows/deploy-production.yml`, blob `f3493d19cb59bb4d9f41eb4ab05d542befa2b8ce`, mantém checkout por SHA, branch master obrigatória, igualdade HEAD/GITHUB_SHA, project ID esperado, token obrigatório, release 3.4.7 e Supabase CLI 2.122.1. Ainda implanta somente `upstatus`, sem deploy coordenado de Team Lite nem allowlist independente de SHA aprovado; proteções externas do Environment `production` não foram verificadas.
- [#78](https://github.com/Reekyi/UpStatus/issues/78) permanece aberta, 15 comentários; a reprodução manual de queda de rede continua confirmada e todos os critérios de aceite físico permanecem desmarcados.
- [#79](https://github.com/Reekyi/UpStatus/issues/79) permanece aberta, 69 comentários; o corpo principal ainda usa a fotografia de 2026-11-03. O comentário [6674095424](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6674095424) registra o Validate de #82 e o estado anterior dos candidatos; os comentários [6674082399](https://github.com/Reekyi/UpStatus/issues/78#issuecomment-6674082399) e [6674082908](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6674082908) registram os heads separados de reconnect Normal/Team Lite.
- Perda real de internet por ~10 segundos, recuperação sem F5, reentrada, chamadas após reconexão, ausência de peers/pollers duplicados, microfone/áudio/tela reais, Tampermonkey em perfis separados e interoperabilidade instalada Normal ↔ Team Lite continuam MANUAL PENDING.

### Próximos gates

1. Corrigir Team Lite logout para não invalidar token/sessão quando leave/fallback não forem confirmados; testar falha persistente e retry.
2. Concluir Candidate Checks no head atual #76 e investigar qualquer falha do run `42143206998`; não sobrepor fixtures.
3. Integrar o candidato Normal `08ebf838` ao fluxo revisado somente depois de CI no branch isolado e revisão do diff; o #74 aprovado ainda não contém esse código.
4. Definir e testar a política de membership stale/TTL de duas horas, inclusive ocupação de capacidade após offline.
5. Implementar Retry-After e integrar rate limit aos endpoints reais.
6. Manter RT-01 bloqueado até remover broadcast público de conteúdo completo e validar cutover coordenado dos clientes legados.
7. Validar migrations oficiais de voz, recibos, rate limit e ACL no ambiente autorizado de TEST; obter caminho administrativo suportado para supabase_admin.
8. Completar testes físicos da #78, inventário das Edge Functions restantes e investigação do backup vazio.
9. Resolver o contrato do Validate para `production updateURL mismatch` sem enfraquecer o gate.
10. Obter reviews humanos e revisar a ancestralidade extensa de #74/#76.

### Segurança e execução desta rodada

Todas as consultas SQL desta rodada foram SELECT-only. O Candidate Checks [42143206998](https://github.com/Reekyi/UpStatus/actions/runs/42143206998) foi iniciado pela engenharia e permanecia em execução; as fixtures observadas pertencem a essa execução. Nenhum workflow foi disparado manualmente pela auditoria, nenhuma fixture foi alterada ou limpa pela QA, e nenhuma escrita em produção, migration, deploy, alteração de secret/flag/role, publicação de userscript, merge ou operação destrutiva foi realizada. A única escrita desta rodada é este registro documental na branch QA dedicada.


## Revalidação independente — 2026-11-05 BRT / 2026-11-06 UTC (rodada 11)

Esta seção acrescenta evidências obtidas diretamente no GitHub e nos dois projetos Supabase. O corte de CI do Team Lite foi feito enquanto a nova execução ainda estava ativa; o estado é explicitamente separado do resultado do head anterior.

### Heads e relações verificadas

- PR #74 Normal: HEAD **b0c0e03fbe820e02404d4ae7d9f83e2a18642e50**, aberta/Draft, 639 commits à frente e zero atrás de master.
- PR #75 Team Lite baseline: HEAD **7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309**, aberta/Draft, 59 commits à frente e zero atrás de team-lite-official.
- PR #76 Team Lite signaling: HEAD **88a0865efee9194c868dc685f3de946b128d83bd**, aberta/Draft, 196 commits à frente de team-lite-official; comparação direta com #75: 137 à frente, zero atrás.
- PR #82 QA: HEAD **b916551b925da245d7bc1583f3c7ee1b9e641ba8**, aberta/Draft, 46 commits à frente e zero atrás de master.
- Branch isolada Normal **normal/reconnect-recovery-candidate**: HEAD **1ca2de6e3abbb383be1ccb4afff09d8b3c13dc12**, 20 commits à frente e zero atrás do HEAD do #74. Não integra o #74 e não possui workflow concluído.

Nenhum review humano ou thread de revisão foi encontrado nos PRs #74, #75, #76 e #82.

### CI e workflows

- #74: Validate **42122609464** e Signaling Smoke **42122609431** concluídos com SUCCESS no HEAD b0c0e03. O Smoke registrou 15/15 verificações não autenticadas e 103/103 autenticadas, incluindo open voice join, late join, aliases Normal/Team Lite, idempotência, capacidade, owner handoff, corrida leave/join, WebRTC de chamada/voz/tela, mesh de três membros, rate limit (90 aceitas e 1 HTTP 429), concorrência de recibos e cleanup.
- #75: Candidate Checks **41674353127** é aprovação histórica do baseline, não substitui o head atual do #76.
- #76: o head anterior **8678b4b056314482630e00762055927e79a6e94b** passou em **42149391376**. O log confirma 103/103 verificações autenticadas, WebRTC call/voice/screen, mesh de três membros, open join/late join/owner handoff/capacity, rate limit 90+1, concorrência de recibos, migration guard, logout gate e cleanup.
- #76 atual: o commit **88a0865** iniciou **42150807002**. Na última consulta, o job candidate-checks estava IN_PROGRESS no passo de integração autenticada/browser; os passos de rate limit, recibos, migration guard, metadata e cleanup ainda estavam pendentes. Portanto, não atribuir aprovação ao HEAD 88a0865 até o workflow terminar.
- #82: Validate **42144878286** falhou em scripts/validate.mjs:26 com **production updateURL mismatch**. O PR altera somente docs/RELEASE_READINESS.md; não houve alteração no validador.

Links:
- #74 Validate: https://github.com/Reekyi/UpStatus/actions/runs/42122609464
- #74 Smoke: https://github.com/Reekyi/UpStatus/actions/runs/42122609431
- #76 head anterior aprovado: https://github.com/Reekyi/UpStatus/actions/runs/42149391376
- #76 head atual em execução no corte: https://github.com/Reekyi/UpStatus/actions/runs/42150807002
- #82 Validate: https://github.com/Reekyi/UpStatus/actions/runs/42144878286

### Ciclo de saída, logout e estados terminais

O bloqueio anterior de logout Team Lite foi corrigido no código candidato e passou no teste de regressão do head 8678b4b: quando o leave não é confirmado, teamLiteEndSession aborta antes de /api/logout, invalidação de authGeneration, parada de Realtime e limpeza do token/storage. A sessão e o room ID são preservados para retry.

A revisão seguinte identificou dois resultados terminais legítimos da RPC de saída:
- ROOM_UNAVAILABLE: sala fechada, expirada ou inexistente (endpoint retorna HTTP 404).
- ROOM_MEMBERSHIP_ENDED: a associação já não existe (endpoint retorna HTTP 409).

O adapter do Team Lite no commit 88a0865 agora normaliza somente esses dois códigos como saída idempotentemente concluída, tanto quando chegam em body 2xx quanto em erro não-2xx. Foram adicionadas cinco asserções cobrindo os dois códigos nos dois formatos e preservando ROOM_MEMBERSHIP_REQUIRED/403 como falha real. O mesmo código e testes existem na branch Normal 1ca2de6. O CI do Team Lite para 88a0865 ainda estava em execução no corte; o candidato Normal não tem CI. Classificação: implementação por inspeção; validação automatizada pendente para os heads atuais.

O código de leave mantém o room ID até confirmação e o logout bloqueia se a associação ainda estiver ativa. Ainda falta validar a persistência do room ID através de reload completo enquanto offline. Hoje o identificador permanece em memória de página; fechar/recarregar o navegador sem rede pode perder o contexto local enquanto a membership fica no servidor até expiração.

A migration candidata define TTL de sala de duas horas e o endpoint faz limpeza periódica de salas expiradas. A tabela de memberships contém room_id, user_name, joined_at e status, sem heartbeat/last_seen por participante. Isso limita a duração de memberships abandonadas, mas permite que participantes offline ocupem vagas até a expiração. Tratar como risco de desenho a avaliar, não como vazamento permanente comprovado.

### Supabase isolado — bfpjtfqlnypisxljoxkb

Projeto ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, região sa-east-1, 21 migrations até **20261105220323**. Edge Function upstatus-signal-test ACTIVE v28, SHA **e26011f026c74821a1e05bf314340604d715820ab864b63d66fd481d93d00d4f**.

As funções candidatas existem com assinaturas:
- open_upstatus_signal_voice_room(text,text,integer)
- leave_upstatus_signal_room(text,text)
- consume_upstatus_signal_rate_limit(text,integer,integer)
- merge_chat_read_receipts(text,jsonb,timestamp with time zone)

As quatro são SECURITY INVOKER, possuem search_path vazio e EXECUTE negado a anon/authenticated, permitido a service_role. As tabelas de sinalização e rate limit examinadas têm RLS habilitado, sem grants de SELECT/INSERT para anon/authenticated; service_role conserva os privilégios necessários.

O default ACL isolado de postgres contém uma entrada global de funções que remove PUBLIC EXECUTE; os defaults de public limitam funções, tabelas e sequences a postgres/service_role. O schema storage ainda possui defaults de cliente amplos, portanto o hardening isolado não deve ser descrito como abrangendo todos os schemas gerenciados.

Durante a execução **42150807002**, consultas SELECT-only observaram 10 rooms, 11 memberships, 0 bindings, 1 event, 6 buckets de rate limit, 4 usuários e 4 sessões de teste; chat_reads de teste estava em zero. Como o workflow compartilhado ainda estava IN_PROGRESS, esses registros são compatíveis com fixtures ativas. Nenhuma limpeza foi executada pela auditoria.

### Supabase de produção — dlfvkawaiqduhlazsszm

Projeto ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, região us-west-2, sete migrations até **20261027155438**.

Continuam ausentes a tabela upstatus_signal_rate_limits e as RPCs de rate limit, recibos, open voice e leave. Nenhuma migration candidata foi aplicada em produção.

RLS/grants confirmados por catálogo:
- Nove tabelas backend-owned em public têm RLS ativo, zero policies e privilégios efetivos excessivos para anon/authenticated, incluindo SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN.
- upstatus_visual_config tem RLS e nenhum grant de cliente.
- realtime.messages tem RLS, zero policies e SELECT/INSERT/UPDATE para anon/authenticated.
- A consulta de pg_policies não encontrou policies nas dez tabelas public sinalizadas nem em realtime.messages.

As três funções upstatus_broadcast_messages(), upstatus_broadcast_remote_state() e upstatus_broadcast_users() continuam SECURITY DEFINER, com search_path=public e EXECUTE para anon/authenticated/service_role. A definição atual de upstatus_broadcast_messages() serializa OLD/NEW com to_jsonb e chama realtime.send no tópico db_change com private=false; o trigger continua habilitado para INSERT/UPDATE/DELETE em public.messages. RT-01 permanece bloqueador.

Default ACL de produção:
- postgres: public e storage mantêm defaults amplos para anon/authenticated/service_role em sequences, funções e tabelas; o default de funções de postgres continua com PUBLIC EXECUTE e não há override global equivalente ao isolado.
- supabase_admin: public, graphql e graphql_public mantêm defaults amplos. O executor é postgres, não superuser e sem membership em supabase_admin; não foi tentada troca de role.
- O Security Advisor observou 10 findings INFO de RLS sem policies, 3 WARN de SECURITY DEFINER executável por anon e 3 WARN para authenticated. Performance e Health Advisors retornaram zero findings.

### Edge Functions de produção

Inventário: 38/38 ACTIVE; todas reportam verify_jwt=false, o que não prova ausência de autenticação própria. As três funções principais mantêm os bundles antigos:
- upstatus v480, SHA bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd, userscript embutido 3.4.7.
- upstatus-team-lite v15, SHA 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb, userscript embutido 3.4.30.
- upstatus-screen-share-3-1-1-beta10 v6, SHA f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29, userscript embutido 3.1.1-beta8.

Nenhuma função upstatus-signal autenticada aparece no inventário de produção. Os bundles principais não contêm open voice join, RPC de recibos ou RPC de rate limit. A função upstatus-backup-327-pre328 continua ACTIVE v1 com index.ts de zero bytes, SHA 3d6c4f8e5f777830ea720ab2938cb023b5a4e4c7d26f3fc02b926ce0e4d0dd90; consumidores e rollback seguem não verificados.

### Deploy de produção

Há diferença entre master e o candidato do PR #74:
- master, blob do workflow **8252c6c6e7005c98625603b5b02b14cb1e50a519**: workflow_dispatch, checkout fixado e persist-credentials=false, mas usa Supabase CLI latest, não fixa o project ID esperado nem valida GITHUB_REF/HEAD contra GITHUB_SHA; implanta somente upstatus.
- branch do #74, blob **f3493d19cb59bb4d9f41eb4ab05d542befa2b8ce**: adiciona exigência de refs/heads/master, igualdade HEAD/GITHUB_SHA, project ID esperado dlfvkawaiqduhlazsszm, token obrigatório e CLI 2.122.1. Ainda implanta somente upstatus, sem deploy coordenado de Team Lite nem allowlist independente de SHA de release.

Como #74 permanece aberto/Draft, as proteções candidatas ainda não estão no workflow de master. Nenhum deploy foi executado.

### Issues e aceitação manual

- #78 continua aberta; a última atualização de engenharia é o comentário 6675276330, que registra a normalização de estados terminais. A reprodução manual anterior de perda de rede por cerca de dez segundos falhou nos dois candidatos; não há novo teste instalado aprovado após os commits recentes.
- #79 continua aberta, com 70 comentários; o corpo/checklist principal segue desatualizado em relação às últimas execuções.
- Permanecem pendentes: teste físico de queda/retorno sem F5, entrada/saída após reconexão, incoming/outgoing calls, áudio bidirecional com microfone real, compartilhamento físico de tela, perfis Tampermonkey separados, compatibilidade instalada Normal ↔ Team Lite e persistência do room ID após reload offline.

### Veredito e gates

Não recomendar release. O logout Team Lite foi corrigido no código e passou no head anterior, mas o head atual 88a0865 ainda aguarda CI. O Normal possui a normalização terminal e a proteção de logout apenas em branch isolada, sem CI e fora do PR #74. Produção continua bloqueada por RT-01, ACL-02, migrations ausentes, bundles legados e testes físicos pendentes. Também faltam reviews humanos.

Nenhuma operação de produção, migration, deploy, merge, publicação de userscript, alteração de secret/flag/role ou limpeza de fixtures foi realizada nesta rodada. As consultas Supabase foram SELECT-only. O único trabalho de escrita é este registro documental na branch QA dedicada.


### Follow-up de CI e fixture cleanup — 2026-11-05 BRT / 2026-11-06 UTC

Após o corte anterior, o workflow exato do Team Lite **42150807002** terminou com FAILURE no HEAD **88a0865efee9194c868dc685f3de946b128d83bd**. Não é falha dos testes de integração: o log confirma 103/103 autenticadas, WebRTC de chamada/voz/tela, mesh de três membros, rate limit 90 aceitas + 1 HTTP 429, concorrência de recibos e migration-layout guard aprovados. O cleanup das fixtures também foi confirmado pelo próprio workflow.

A falha ocorreu no passo final “Check candidate scripts and version metadata”, em scripts/team-lite-candidate-check.mjs:227:

**Team Lite bundled adapter must match the shared tested source module**

Causa confirmada por inspeção:
- O adapter compartilhado src/userscript/signaling-transport.mjs (blob **b2145b8a86fa775e9521f2b38c40cabad0c77172**) contém a normalização idempotente de ROOM_UNAVAILABLE e ROOM_MEMBERSHIP_ENDED.
- O userscript Team Lite ainda incorpora a versão anterior (blob **e61ac4b7a626142e9319497de21bfc3fe8c81814**), cujo leave(roomId) apenas retorna post("/room/leave", { roomId }) e não contém terminalCodes.
- O checker compara a implementação incorporada com o módulo compartilhado e falha corretamente. Logo, o novo tratamento ainda não está no bundle efetivamente testado/publicável do Team Lite.

Gate: atualizar o adapter incorporado no userscript Team Lite a partir do módulo compartilhado, preservar o checker de igualdade e repetir Candidate Checks no novo HEAD. Não enfraquecer a asserção.

Após a conclusão do workflow, uma consulta SELECT-only no projeto isolado retornou zero rooms, memberships, bindings, events, buckets de rate limit, usuários de teste, sessões de teste e chat_reads de teste. Nenhuma limpeza manual foi realizada.

A atualização documental anterior gerou o commit QA **6d1e24793404a77b3ee186ed21bf297b8eb4a115**, blob **2fefb1935bbd1e25cca2860a1e034f214c3462e5**. O Validate exato **42151343042** também terminou FAILURE com a mesma asserção de baseline **production updateURL mismatch** em scripts/validate.mjs:26; o PR #82 continua alterando somente este documento.

Contagem atualizada de comentários: issue #78 tem 17 comentários (último 6675276330); issue #79 tem 71 comentários (último 6675276903). A última nota de release da #79 foi publicada enquanto o run 42150807002 ainda estava em andamento; o resultado final acima substitui aquele status pendente.


## Revalidação independente — 2026-11-06 00:26 BRT / 03:26 UTC (rodada 12)

Esta seção substitui o estado pendente anterior do Candidate Checks #76. O novo run terminou com sucesso no HEAD exato após sincronização do adapter incorporado. A leitura inicial desta rodada foi feita neste arquivo na branch QA; antes da escrita, o conteúdo e o blob atuais foram buscados novamente. A atualização abaixo é append-only e usa o blob SHA atual como precondição.

### Heads reais, ancestralidade e reviews

| PR | HEAD exato | Base | Estado |
|---|---|---|---|
| #74 Normal | `b0c0e03fbe820e02404d4ae7d9f83e2a18642e50` | master | aberta / Draft |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official | aberta / Draft |
| #76 Team Lite signaling | `3627557f244c98a9c7e1cc986c7cea43124863a9` | team-lite-official | aberta / Draft |
| #82 QA | `151f63793a71949f5d4ba2c600f24c8401ce753b` | master | aberta / Draft |

Comparações atuais:
- #74: 639 commits à frente / 0 atrás de master.
- #75: 59 à frente / 0 atrás de team-lite-official.
- #76: 197 à frente / 0 atrás de team-lite-official; comparação direta com #75: 138 à frente / 0 atrás.
- #82: 48 à frente / 0 atrás de master; altera somente `docs/RELEASE_READINESS.md`.

Os quatro PRs continuam abertos, Draft e não mesclados. Nenhum review humano submetido e nenhuma thread de revisão foram encontrados nos PRs #74, #75, #76 e #82.

### CI no HEAD exato

- **#74 Normal:** Validate [42122609464](https://github.com/Reekyi/UpStatus/actions/runs/42122609464) e Signaling Smoke [42122609431](https://github.com/Reekyi/UpStatus/actions/runs/42122609431) concluídos com SUCCESS no HEAD b0c0e03. O Smoke registrou 15/15 verificações não autenticadas e 103/103 autenticadas, open voice join/late join, aliases Normal/Team Lite, idempotência, capacidade, owner handoff e corrida leave/join, WebRTC de chamada/voz/tela, mesh de três membros, rate limit 90 aceitas + 1 HTTP 429, concorrência de recibos e cleanup.
- **#75 baseline:** Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) é aprovação histórica do baseline 7bbf9b9; não substitui o head atual do #76.
- **#76 Team Lite:** Candidate Checks [42153971733](https://github.com/Reekyi/UpStatus/actions/runs/42153971733), job `127683584177`, terminou com SUCCESS no HEAD exato 3627557. O log confirma:
  - mutation guard do projeto isolado aprovado;
  - 5 regressões de normalização dos estados terminais de leave e 17 assertions do adapter;
  - 15/15 verificações não autenticadas e 103/103 verificações autenticadas;
  - open voice join, late join por aliases Normal/Team Lite, idempotência, saída/reentrada, transferência de proprietário, capacidade e concorrência;
  - WebRTC de chamada, voz e compartilhamento de tela com entrega de tracks remotas;
  - convites dinâmicos e mesh autenticada de três participantes, incluindo os três links par-a-par e teardown;
  - rate limit distribuído: 90 aceitas e 1 rejeitada com HTTP 429; teste de concorrência aprovado;
  - recibos atômicos concorrentes, migration-layout guard, versão 3.4.31, sintaxe dos userscripts/portais e cenários do atualizador;
  - testes de sequência de leave, coalescência de saída duplicada, retry context, fallback retry, ordem send/leave, serialização de reentrada, prontidão Realtime, teardown offline, preservação do contexto offline/online, resposta não confirmada e gate de logout;
  - teste explícito de falha no logout preservando sessão e estado de retry.
- **#82 QA:** Validate [42151484883](https://github.com/Reekyi/UpStatus/actions/runs/42151484883) terminou FAILURE em `scripts/validate.mjs:26`, com `production updateURL mismatch`. O PR contém somente este Markdown; a falha é do contrato/base atual do validador, não de código runtime introduzido pelo documento. O validador não foi alterado nem contornado.

O run 42153971733 foi iniciado pela engenharia, não por esta auditoria. Seu log confirma a limpeza das fixtures. Uma consulta SELECT-only posterior no projeto isolado encontrou zero rooms, members, bindings, events e buckets de rate limit.

### Correção de bundle e ciclo de vida de voz

A causa da falha anterior do #76 foi corrigida no commit [3627557](https://github.com/Reekyi/UpStatus/commit/3627557f244c98a9c7e1cc986c7cea43124863a9), que alterou somente `team-lite/upstatus-team-lite.user.js`. O bloco `leave()` incorporado agora contém a mesma normalização terminal do módulo compartilhado `src/userscript/signaling-transport.mjs` (blob `b2145b8a86fa775e9521f2b38c40cabad0c77172`); o userscript atualizado tem blob `f18cf6e17fc149c03daeaa512f1c69030e4e9232`. O checker de igualdade foi preservado e passou no run exato.

O adapter considera somente `ROOM_UNAVAILABLE` e `ROOM_MEMBERSHIP_ENDED` como estados terminais idempotentes de saída. Erros reais de autorização, como `ROOM_MEMBERSHIP_REQUIRED`/403, continuam sendo falhas.

Inspeção do userscript Team Lite atual:
- `voiceRoomLeave()` coalesce chamadas concorrentes, interrompe polling, envia o sinal final, aguarda a confirmação do leave e tenta a liberação de membership quando necessário;
- `signalReleaseVoiceRoom()` preserva o room ID/contexto em falha e só limpa o identificador após confirmação;
- `teamLiteEndSession()` aborta o logout se a saída não for confirmada, preservando sessão/token e exibindo instrução de retry antes de chamar `/api/logout`, invalidar a geração de autenticação ou limpar armazenamento.
- Os testes automatizados do head atual cobrem fallback, retry context, ordenação de sinal final/RPC, saída concorrente e falha de logout.

**Classificação:** AUTOMATED PASS para o candidato Team Lite no head 3627557; CODE INSPECTION para o comportamento do cliente; MANUAL PENDING para rede/dispositivos reais. Não extrapolar o PASS do Team Lite para Normal.

A branch `normal/reconnect-recovery-candidate` continua separada do #74. A comparação atual indica 20 commits à frente / 0 atrás do #74; o último SHA exato registrado na discussão é `1ca2de6e3abbb383be1ccb4afff09d8b3c13dc12`, para o qual não há workflow associado. O conector confirmou a existência da branch, mas não forneceu o SHA de HEAD diretamente nesta leitura; não declarar esse SHA como HEAD atual sem nova evidência.

Risco residual de desenho: o room ID permanece em memória da página. Um reload/fechamento completo enquanto offline pode perder o contexto local; a membership pode permanecer até a expiração/limpeza da sala (TTL de duas horas). A tabela de memberships não possui heartbeat/last_seen por participante. Não é evidência de membership permanente, mas pode consumir capacidade até o TTL. Definir lease/heartbeat ou aceitar formalmente esse limite e testá-lo.

### Supabase de produção — dlfvkawaiqduhlazsszm

Estado do projeto: ACTIVE_HEALTHY, região us-west-2, PostgreSQL 17.11.0.002, sete migrations até `20261027155438`.

Continuam ausentes:
- `public.upstatus_signal_rate_limits`;
- `consume_upstatus_signal_rate_limit(text,integer,integer)`;
- `merge_chat_read_receipts(text,jsonb,timestamptz)`;
- `open_upstatus_signal_voice_room(text,text,integer)`;
- `leave_upstatus_signal_room(text,text)`.

Consulta de catálogo SELECT-only:
- Nove tabelas backend-owned (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) mantêm RLS ativo, zero policies e privilégios efetivos anon/authenticated para SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN. Isso é superfície excessiva de grants; RLS sem policies significa que o resultado de catálogo, isoladamente, não prova leitura/escrita de linhas.
- `upstatus_visual_config` mantém RLS e nenhum grant de cliente.
- `realtime.messages` mantém RLS, zero policies e grants de SELECT/INSERT para anon e authenticated, além de UPDATE para authenticated.
- As três funções `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()` e `upstatus_broadcast_users()` continuam SECURITY DEFINER, `search_path=public`, EXECUTE efetivo para anon/authenticated/service_role.
- O trigger `upstatus_messages_broadcast` permanece habilitado após INSERT/UPDATE/DELETE em `public.messages`. A função de mensagens serializa OLD/NEW por `to_jsonb` e chama `realtime.send` no tópico `db_change` com `private=false`. O broadcast de remote state também publica metadados de comandos/resultados; status de usuário publica name/status/reason/updated_at/sync. RT-01 permanece bloqueador.
- Default ACLs permanecem amplos: postgres em `public` e `storage`; supabase_admin em `public`, `graphql` e `graphql_public`. A ACL padrão de funções obtida por `acldefault` ainda inclui PUBLIC EXECUTE para postgres e supabase_admin; os defaults por schema também concedem privilégios a anon/authenticated/service_role. A sessão é `current_user=postgres`, postgres não é superuser e não possui membership em supabase_admin. ACL-02 continua bloqueado por falta de caminho administrativo autorizado para esse proprietário.
- Security Advisor desta rodada: 3 WARN para SECURITY DEFINER executável por anon, 3 WARN para authenticated e 10 INFO de RLS sem policy. Performance e Health Advisors sem findings.

Não confundir grants excessivos com exploração comprovada. O risco de divulgação confirmado é o caminho de broadcast público de conteúdo completo via função SECURITY DEFINER/trigger.

### Supabase isolado — bfpjtfqlnypisxljoxkb

Projeto ACTIVE_HEALTHY, região sa-east-1, PostgreSQL 17.11.0.003, 21 migrations até `20261105220323`. `upstatus-signal-test` está ACTIVE v28 (SHA `e26011f026c74821a1e05bf314340604d715820ab864b63d66fd481d93d00d4f`); `upstatus-signal-e2e-once` está ACTIVE v3.

As quatro RPCs candidatas existem: rate limit, merge de recibos, open voice room e leave room. Todas são SECURITY INVOKER, têm `search_path` vazio, EXECUTE negado para anon/authenticated e permitido para service_role. As cinco tabelas de sinalização/rate limit examinadas têm RLS ativo, zero policies e nenhum SELECT/INSERT concedido a anon/authenticated.

Após o run 42153971733, contagens SELECT-only: rooms 0, members 0, bindings 0, events 0, rate limits 0. Nenhuma limpeza manual foi feita. O projeto isolado comprova o candidato, não a implantação ou migração em produção.

### Edge Functions, bundles e deploy

Produção contém 38/38 Edge Functions ACTIVE, todas reportando `verify_jwt=false`. Isso não prova ausência de autenticação própria. Inspeção de fonte das três funções principais confirmou validação de sessão própria via `x-upstatus-token`, lookup de sessão e comparação timing-safe:
- `upstatus`: v480, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`, versão interna 3.4.7.
- `upstatus-team-lite`: v15, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`, versão interna 3.4.30.
- `upstatus-screen-share-3-1-1-beta10`: v6, SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`, versão interna/embutida 3.1.1-beta8.

O inventário não contém função dedicada `upstatus-signal` em produção. Os três runtimes principais ainda não incorporam o conjunto candidato de open voice join, recibos atômicos e rate limit. As outras funções além dos runtimes principais e backups amostrados ainda exigem inventário individual de rota, consumidor e autenticação.

Anomalias de backup:
- `upstatus-backup-327-pre328`: ACTIVE v1, `index.ts` com zero bytes, SHA `3d6c4f8e5f777830ea720ab2938cb023b5a4e4c7d26f3fc02b926ce0e4d0dd90`. Não foi chamada nem desativada.
- `upstatus-backup-328-pre329`: ACTIVE v1, entrypoint de 1.149.997 bytes, versão interna 3.2.8, SHA `1d08d9f0fc475a99afdc73bee4d96810b9cf5ed1b4ebe99536bee823be76411a`. Consumidores/rollback de ambos permanecem não verificados.

O workflow de deploy em master, blob `8252c6c6e7005c98625603b5b02b14cb1e50a519`, ainda usa Supabase CLI `latest` e não valida branch/SHA/projeto esperado. A versão candidata no #74, blob `f3493d19cb59bb4d9f41eb4ab05d542befa2b8ce`, exige master, igualdade HEAD/GITHUB_SHA, project ID `dlfvkawaiqduhlazsszm`, token e CLI 2.122.1. Porém #74 não foi mesclado, e o workflow ainda implanta somente `upstatus`, sem Team Lite nem allowlist independente de SHA de release. Nenhum deploy foi executado.

### Issues e aceitação manual

- [#78](https://github.com/Reekyi/UpStatus/issues/78) continua aberta, 18 comentários; os oito critérios de aceite permanecem desmarcados. Teste físico de queda de internet por ~10 segundos e recuperação sem F5, reentrada, chamadas após reconexão, múltiplas quedas, áudio/microfone reais, compartilhamento físico e interoperabilidade instalada seguem MANUAL PENDING.
- [#79](https://github.com/Reekyi/UpStatus/issues/79) continua aberta, 72 comentários. O corpo/checklist principal ainda contém a fotografia de 2026-11-03 e marca testes manuais antigos como concluídos, embora #78 permaneça aberta. O comentário 6675727906 dizia que o run 42153971733 estava em andamento; esse status foi superado pelo SUCCESS exato acima. Atualizar o corpo da issue exige ação separada e não foi feito nesta auditoria.
- Persistência do room ID após reload offline, política de membership stale/TTL, perfis Tampermonkey separados, permissões de microfone/tela reais e chamadas Normal ↔ Team Lite em ambos os sentidos permanecem MANUAL PENDING.

### Próximos gates

1. Manter #76 Draft apesar do CI verde; obter review humano e executar aceitação física antes de habilitar/publicar.
2. Executar CI exato para a branch candidata de reconexão Normal e integrar somente após revisão; #74 aprovado não contém essa branch.
3. Resolver/aceitar explicitamente membership stale após offline e reload, com lease/heartbeat ou política de TTL testada.
4. Implementar `Retry-After` e integrar rate limiter aos endpoints de produto; o 429 existe no endpoint isolado, mas não há evidência de integração nos runtimes de produção.
5. Planejar migração RT-01 com troca coordenada de payloads públicos e autenticação Realtime compatível com o token UpStatus; não apenas trocar `private=false` por `true`.
6. Validar migrations de grants, funções, recibos, rate limit e voz no ambiente oficial de TEST, incluindo rollback e caminho administrativo suportado para supabase_admin.
7. Completar inventário das Edge Functions restantes e mapear consumidores/rollback dos backups.
8. Endurecer workflow de deploy em master e planejar deploy coordenado Normal/Team Lite com allowlist de SHA aprovado.
9. Atualizar #79 e concluir os oito critérios físicos de #78.
10. Obter reviews humanos dos PRs #74/#75/#76/#82.

### Registro de segurança desta rodada

Todas as consultas SQL foram SELECT-only. O run 42153971733 foi iniciado pela engenharia no projeto isolado e apenas inspecionado pela auditoria. A limpeza foi confirmada por log e consulta posterior; nenhuma fixture foi alterada pela auditoria. Não houve escrita em produção, migration, deploy, merge, release, publicação de userscript, alteração de secret/flag/role ou operação destrutiva. A única escrita desta rodada é este append documental na branch QA dedicada.

Não declarar percentual de conclusão. #76 tem AUTOMATED PASS no head exato; isso não equivale a teste manual, review humano ou prontidão de produção. RT-01, ACL-02, cutover/migrations, testes físicos e revisão humana continuam bloqueadores.


## Revalidação independente — 2026-11-06 (rodada 13; CI 04:11–04:17 UTC, catálogo 04:27 UTC)

Esta seção supersede snapshots anteriores quando houver divergência de head, workflow ou catálogo. A leitura foi feita na branch QA dedicada. A escrita abaixo é append-only e usa o blob SHA obtido imediatamente antes da atualização. Nenhuma branch de engenharia foi alterada.

### Heads reais, PRs e ancestralidade

| PR | HEAD exato | Base | Estado |
|---|---|---|---|
| #74 Normal | `562d60e73e5827a8d87d6959c06e87af4c356588` | `master` | aberta / Draft / não mesclada |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | `team-lite-official` | aberta / Draft / não mesclada |
| #76 Team Lite signaling | `3627557f244c98a9c7e1cc986c7cea43124863a9` | `team-lite-official` | aberta / Draft / não mesclada |
| #82 QA | `704ba71795d31eb63278dffa0ac74ebcb30572ba` | `master` | aberta / Draft / não mesclada |

Comparações GitHub atuais:
- #74: 665 commits à frente / 0 atrás de `master`; 59 arquivos alterados.
- #75: 59 à frente / 0 atrás de `team-lite-official`; 10 arquivos alterados.
- #76: 197 à frente / 0 atrás de `team-lite-official`; 138 à frente / 0 atrás de #75; 25 arquivos alterados.
- #82: 49 à frente / 0 atrás de `master`; somente `docs/RELEASE_READINESS.md` alterado.
- A branch `normal/reconnect-recovery-candidate` agora compara como **identical** com `chore/continuity-foundation` / #74: ambos apontam para `562d60e73e5827a8d87d6959c06e87af4c356588`. O snapshot anterior que a tratava como branch separada em `1ca2de6` está superado.

Os PRs #74, #75, #76 e #82 continuam abertos e Draft. As consultas de reviews e review threads retornaram zero submissões e zero threads nos quatro PRs.

### CI por HEAD exato

- **Normal #74 — AUTOMATED PASS:** Validate [42161030346](https://github.com/Reekyi/UpStatus/actions/runs/42161030346) e Signaling Smoke [42161030275](https://github.com/Reekyi/UpStatus/actions/runs/42161030275) concluíram SUCCESS no head `562d60e`.
  - 15/15 verificações não autenticadas.
  - 103/103 verificações autenticadas.
  - Open voice join, late join por aliases Normal/Team Lite, idempotência, capacidade, owner handoff e corridas de saída/entrada.
  - Chromium WebRTC de chamada, voz e tela com entrega de tracks remotas; teardown de peers/tracks.
  - Convites dinâmicos e malha autenticada de três participantes, com os três links par-a-par.
  - Rate limit isolado: 90 aceitas e 1 rejeitada com HTTP 429; concorrência do rate limiter aprovada.
  - Concorrência de recibos atômicos aprovada e cleanup das fixtures confirmado pelo log.
- **Team Lite #76 — AUTOMATED PASS:** Candidate Checks [42153971733](https://github.com/Reekyi/UpStatus/actions/runs/42153971733), job `127683584177`, concluiu SUCCESS no head `3627557`.
  - Mutation guard do projeto isolado, adapter autenticado e autenticação do endpoint aprovados.
  - 103/103 verificações autenticadas, open join/late join, owner handoff, capacidade e concorrência aprovados.
  - WebRTC de chamada/voz/tela, mesh de três participantes e teardown aprovados.
  - Rate limit 90+1 HTTP 429, concorrência do rate limiter, recibos atômicos e migration-layout guard aprovados.
  - Bundle parity, versão 3.4.31, sintaxe de userscript/portais, updater, retry de leave, coalescência, reentrada serializada, recuperação offline/online e gate de logout aprovados.
  - Cleanup confirmado pelo workflow e por consulta posterior somente de leitura no projeto isolado.
- **Team Lite #75 — aprovação histórica:** Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passou no baseline `7bbf9b9`; #76 é 138 commits à frente e deve ser tratado como o candidato de sinalização atual. Não mesclar #75 e #76 independentemente sem decisão explícita sobre a sobreposição.
- **QA #82 — BLOCKED por validação de base:** Validate [42157072865](https://github.com/Reekyi/UpStatus/actions/runs/42157072865) falhou em `scripts/validate.mjs:18` com `production updateURL mismatch`. O PR contém somente este Markdown; nenhum validador foi alterado ou contornado. Manter Draft até resolver a incompatibilidade herdada ou aceitar formalmente uma exceção documental.

Os runs acima foram iniciados pela engenharia. Esta auditoria apenas inspecionou os resultados; não disparou workflows nem iniciou uma suíte mutável concorrente.

### Novo achado de código — call-room cleanup perde o retry handle

**ID sugerido: CALL-CLEANUP-RETRY — CODE INSPECTION / RELEASE GATE para o transporte autenticado de chamadas.**

O código atual de `callCleanup()` é estruturalmente igual nos dois candidatos:
- Normal: `src/userscript/upstatus.user.template.js`, blob `28e7ac93bc5084b9fc4e62930add0468e072a3dc`, linhas 2087–2097.
- Team Lite: `team-lite/upstatus-team-lite.user.js`, blob `f18cf6e17fc149c03daeaa512f1c69030e4e9232`, linhas 2614–2624.

Sequência observada:
1. Lê `signalRoomId` de `signalRoomByCallId[callId]`.
2. Interrompe o polling e apaga imediatamente `signalRoomByCallId`, `signalCallIdByRoom` e `signalRosterCache`.
3. Agenda `Promise.allSettled(pendingSignals).then(() => signalTransport.leave(signalRoomId))`.
4. O callback consulta a variável global mutável `signalTransport`, não uma referência local capturada.
5. Qualquer falha é absorvida por `.catch(function(){})`; o estado de chamada e o call ID são limpos antes da confirmação do servidor.

**Corrida determinística no caminho offline:** o handler Normal chama `callCleanup(false)` e, no mesmo turno síncrono, executa `signalTransport.stopAll(); signalTransport=null` (linhas 2499–2506). O handler Team Lite chama `callCleanup(false)` e imediatamente `stopRealtime({preserveVoiceRoomContext:true})`; essa função define `signalTransport=null` e zera os mapas de sala/chamada (linhas 3016–3035). Quando a continuação assíncrona de `Promise.allSettled(...)` roda, ela tenta acessar `signalTransport.leave` já com a variável global nula; o erro é engolido. Assim, o leave do call-room não é enviado e o mapa local para retry já foi removido.

Também há fragilidade fora do evento offline:
- No Normal, o handler de logout aguarda `callCleanup(true,'hangup')`, mas o catch interno transforma falha de leave em Promise resolvida; o logout pode prosseguir sem confirmação.
- No Team Lite, `teamLiteEndSession()` chama `callCleanup(true,'hangup')` sem `await` (linha 772), depois aguarda apenas a liberação da sala de voz; o call-room é uma associação separada.
- Os testes atuais verificam estaticamente a presença/ordem de `signalTransport.leave` após os sinais pendentes, mas não exercitam o handler offline, a nulificação do transporte, falha de leave e retry. Referências: [Normal static test](https://github.com/Reekyi/UpStatus/blob/chore/continuity-foundation/scripts/signaling-static.test.mjs#L321-L326) e [Team Lite candidate checker](https://github.com/Reekyi/UpStatus/blob/team-lite/signaling-transport-candidate/scripts/team-lite-candidate-check.mjs#L255-L262).

Evidências de código:
- [Normal callCleanup](https://github.com/Reekyi/UpStatus/blob/chore/continuity-foundation/src/userscript/upstatus.user.template.js#L2087-L2097)
- [Normal offline handler](https://github.com/Reekyi/UpStatus/blob/chore/continuity-foundation/src/userscript/upstatus.user.template.js#L2499-L2506)
- [Normal logout](https://github.com/Reekyi/UpStatus/blob/chore/continuity-foundation/src/userscript/upstatus.user.template.js#L3534)
- [Team Lite callCleanup](https://github.com/Reekyi/UpStatus/blob/team-lite/signaling-transport-candidate/team-lite/upstatus-team-lite.user.js#L2614-L2624)
- [Team Lite stopRealtime/offline](https://github.com/Reekyi/UpStatus/blob/team-lite/signaling-transport-candidate/team-lite/upstatus-team-lite.user.js#L3016-L3041)
- [Team Lite logout](https://github.com/Reekyi/UpStatus/blob/team-lite/signaling-transport-candidate/team-lite/upstatus-team-lite.user.js#L769-L794)

**Impacto:** quando o transporte autenticado de chamadas está habilitado, uma chamada encerrada durante perda de rede ou falha transitória pode deixar a membership do call-room no servidor até expiração/limpeza. O cliente já perdeu o room ID e o handle de transporte para repetir o leave. Não é evidência de vazamento de conteúdo nem de membership permanente; é risco de consistência, capacidade e teardown.

O endpoint candidato define TTL de sala de duas horas e executa limpeza periódica a cada 60 segundos (`supabase/functions/upstatus-signal-test/index.ts`, `ROOM_TTL_MS` e `CLEANUP_INTERVAL_MS`). Logo, uma membership abandonada pode consumir capacidade até expiração e o próximo ciclo de cleanup.

**Correção exigida:** capturar a instância de transporte antes do teardown; manter um registro pendente de leave separado do estado de mídia; só remover o mapa/handle depois de confirmação ou estado terminal idempotente; não engolir erros não terminais; propagar sucesso/falha ao logout; e adicionar testes dinâmicos offline/fail-then-success/falha persistente/owner handoff. A mídia local deve continuar sendo encerrada imediatamente mesmo quando o servidor estiver indisponível.

Classificação: **CODE INSPECTION confirmado; runtime ainda não reproduzido manualmente.** O PASS do CI #74/#76 não cobre este cenário. Tratar como gate para habilitar/publicar o transporte autenticado de chamadas.

### Normal/Team Lite: integração de rate limit ainda parcial

A inspeção dos templates de produto no head atual encontrou:
- `src/server/index.template.ts`: chamada a `merge_chat_read_receipts`, mas nenhuma referência a `consume_upstatus_signal_rate_limit` ou `upstatus_signal_rate_limits`.
- `src/server/team-lite-index.template.ts`: mesma situação.
- O endpoint isolado `supabase/functions/upstatus-signal-test/index.ts` contém a chamada à RPC de rate limit, mas não contém o cabeçalho `Retry-After`.

Portanto, os testes 90+1 HTTP 429 e de concorrência comprovam o endpoint isolado, não a aplicação de quotas distribuídas nos endpoints de produto Normal/Team Lite. RT-09 permanece **PARTIAL**. Integrar a RPC nos endpoints coordenados e definir/testar Retry-After antes de declarar o rate limit pronto para produção.

### Supabase de produção — revalidação somente leitura

Projeto `dlfvkawaiqduhlazsszm`: `ACTIVE_HEALTHY`, região `us-west-2`, PostgreSQL `17.11.0.002`. A migration inventory continua com sete entradas até `20261027155438`.

Ausentes no schema `public`:
- `upstatus_signal_rate_limits`;
- `consume_upstatus_signal_rate_limit`;
- `merge_chat_read_receipts`;
- `open_upstatus_signal_voice_room`;
- `leave_upstatus_signal_room`.

RLS/grants confirmados por catálogo:
- As nove tabelas backend-owned continuam com RLS ativo e zero policies.
- Para `anon` e `authenticated`, `has_table_privilege` retornou true para SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN em cada uma das nove tabelas. Isso confirma a superfície excessiva de grants, mas não prova acesso efetivo a linhas: RLS está ativo e sem policies.
- `upstatus_visual_config` tem RLS e zero policies, sem grants de tabela para os papéis cliente.
- `realtime.messages` tem RLS e zero policies, com SELECT/INSERT/UPDATE para anon/authenticated.

As funções `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()` e `upstatus_broadcast_users()` continuam SECURITY DEFINER, `search_path=public`, executáveis por anon/authenticated/service_role. O trigger `upstatus_messages_broadcast` continua habilitado após INSERT/UPDATE/DELETE em `public.messages`. A definição exata da função de mensagens serializa OLD/NEW com `to_jsonb` e chama `realtime.send(..., 'db_change', ..., false)`; RT-01 permanece bloqueador confirmado.

Default ACL:
- `acldefault('f', ...)` confirma PUBLIC EXECUTE no default de funções para os proprietários postgres e supabase_admin.
- Os defaults por schema permanecem amplos nos schemas já registrados em snapshots anteriores.
- A sessão atual é `postgres`, não superuser e sem membership em `supabase_admin`; ACL-02 continua sem caminho administrativo autorizado nesta sessão.

Security Advisor observado em `2026-11-06T04:27:31Z`: 3 WARN para SECURITY DEFINER executável por anon, 3 WARN para authenticated e 10 INFO para RLS sem policy. Performance Advisor sem findings; Health Advisor sem findings.

Não inferir exploração direta somente dos grants. O caminho de divulgação confirmado continua sendo o trigger SECURITY DEFINER que envia a linha completa para broadcast público.

### Supabase isolado — bfpjtfqlnypisxljoxkb

Projeto `ACTIVE_HEALTHY`, região `sa-east-1`, PostgreSQL `17.11.0.003`, 21 migrations até `20261105220323`. Edge Functions isoladas: `upstatus-signal-test` ACTIVE v28 e `upstatus-signal-e2e-once` ACTIVE v3.

As quatro RPCs candidatas existem:
- `consume_upstatus_signal_rate_limit`;
- `merge_chat_read_receipts`;
- `open_upstatus_signal_voice_room`;
- `leave_upstatus_signal_room`.

Todas são SECURITY INVOKER, têm `search_path` vazio, EXECUTE negado a anon/authenticated e EXECUTE permitido a service_role. As cinco tabelas de sinalização/rate limit têm RLS ativo, zero policies e nenhum SELECT/INSERT para anon/authenticated.

Consulta SELECT-only posterior ao CI retornou zero rooms, members, bindings, events e rate-limit rows. Nenhuma limpeza manual foi realizada.

### Edge Functions e deploy

Produção lista 38/38 Edge Functions ACTIVE; todas reportam `verify_jwt=false`. Isso não prova ausência de autenticação própria. A inspeção de fonte das três funções principais confirmou validação própria por `x-upstatus-token` e `timingSafeEqual`:
- `upstatus`: v480, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`, versão interna 3.4.7.
- `upstatus-team-lite`: v15, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`, versão interna 3.4.30.
- `upstatus-screen-share-3-1-1-beta10`: v6, SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`, versão interna 3.1.1-beta8.

A função dedicada `upstatus-signal` continua ausente em produção. As demais 31 funções não incluídas nessa amostra ainda precisam de inventário individual de rota, consumidor e autenticação.

Backups ativos amostrados nesta rodada (não é inventário completo):
- `upstatus-backup-327-pre328`: v1, entrypoint vazio, SHA `3d6c4f8e5f777830ea720ab2938cb023b5a4e4c7d26f3fc02b926ce0e4d0dd90`.
- `upstatus-backup-328-pre329`: v1, versão interna 3.2.8, SHA `1d08d9f0fc475a99afdc73bee4d96810b9cf5ed1b4ebe99536bee823be76411a`.
- `upstatus-backup-329-pre330`: v1, versão interna 3.2.9, SHA `61349cabf45da6e7a6f6162693709e91235bc281ea01c34dcb0dff086ae9071b`.
- `upstatus-backup-330-pre331`: v1, versão interna 3.3.0, SHA `d62e501bbadd99e7f976613b059a21170948511a6ef6480ce6a8c25bc2bca412`.

Consumidores e plano de rollback desses backups continuam não verificados. Não foram chamados nem desativados.

Workflow:
- Master ainda usa deploy com CLI `latest`, sem as verificações de branch/SHA/projeto presentes no candidato.
- O candidato #74, blob `f3493d19cb59bb4d9f41eb4ab05d542befa2b8ce`, fixa checkout em `github.sha`, exige master, compara HEAD/GITHUB_SHA, fixa project ID `dlfvkawaiqduhlazsszm` e CLI 2.122.1.
- Mesmo o candidato ainda implanta somente `upstatus`, sem Team Lite e sem allowlist independente de SHA aprovado; #74 não foi mesclado. Nenhum deploy ocorreu.

### Issues e aceitação manual

- [#78](https://github.com/Reekyi/UpStatus/issues/78) continua aberta, 19 comentários; os oito critérios de aceite permanecem desmarcados. O corpo ainda descreve falha manual de recuperação sem F5 após cerca de dez segundos offline. Áudio/microfone real, compartilhamento físico, chamadas após reconexão, múltiplas quedas e interoperabilidade instalada seguem MANUAL PENDING.
- [#79](https://github.com/Reekyi/UpStatus/issues/79) continua aberta, 73 comentários; o corpo principal ainda contém a fotografia de 2026-11-03 e está desatualizado em relação aos heads/runs atuais. O comentário de engenharia [6676647352](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6676647352) já menciona o risco de `callCleanup()`; esta rodada o confirmou independentemente por inspeção de código.

### Próximos gates

1. Corrigir `callCleanup()` em Normal e Team Lite: capturar o transporte, preservar retry handle/membership até confirmação, propagar falhas e aguardar corretamente no logout.
2. Acrescentar testes dinâmicos para offline handler, transporte nulificado, falha de leave, retry fail-then-success, falha persistente, owner handoff e cleanup após reconexão.
3. Manter #74/#76 Draft até review humano e aceitação física; os PASSs atuais são automatizados e não cobrem o novo achado.
4. Completar testes físicos da #78: queda/retorno sem F5, novas chamadas, microfone real, display capture e compatibilidade Normal ↔ Team Lite instalada.
5. Integrar rate limit distribuído aos endpoints reais Normal/Team Lite e implementar/testar Retry-After.
6. Planejar RT-01 com troca coordenada de payloads públicos e autorização Realtime compatível com identidade confiável. A documentação Supabase exige RLS em `realtime.messages`, canal `private: true` e identidade JWT; um token UpStatus customizado não substitui automaticamente um Supabase Auth JWT. Ver [Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization).
7. Validar migrations de grants, SECURITY DEFINER, recibos, rate limit e voz no ambiente oficial de TEST, com rollback e caminho administrativo suportado para supabase_admin.
8. Atualizar #79, auditar as 31 Edge Functions restantes e mapear consumidores/rollback dos backups.
9. Endurecer o workflow de deploy em master e planejar cutover coordenado Normal/Team Lite com allowlist de SHA aprovado.
10. Obter reviews humanos de #74, #75, #76 e #82.

### Registro de segurança desta rodada

Todas as consultas SQL foram SELECT-only. Os workflows 42161030346, 42161030275 e 42153971733 foram iniciados pela engenharia e apenas inspecionados. Nenhum workflow foi disparado por esta auditoria; nenhuma fixture foi alterada ou limpa por esta auditoria. Não houve escrita em produção, migration, deploy, merge, release, publicação de userscript, alteração de secret/flag/role ou operação destrutiva. A única escrita desta rodada é este append documental na branch QA dedicada.

Não declarar percentual de conclusão. #74 e #76 têm AUTOMATED PASS nos heads exatos; isso não equivale a teste manual, review humano ou prontidão de produção. CALL-CLEANUP-RETRY, RT-01, ACL-02, rate-limit cutover, migrations, testes físicos e revisão humana continuam gates abertos.


## Independent audit checkpoint — 2026-11-06 02:30 BRT

This checkpoint supersedes earlier call-cleanup findings where noted below. Snapshot was read from the QA branch before this append; no engineering branch was modified.

### PR heads, ancestry and exact-head CI

All four PRs remain open, Draft, unmerged and mergeable. Current reviews and inline review threads: zero on #74, #75, #76 and #82.

- **#74 Normal** — HEAD 2e346162d6db9fe05a68a97d501039ddb6de4547; 671 ahead / 0 behind master. Exact-head Validate [42166842757](https://github.com/Reekyi/UpStatus/actions/runs/42166842757) and Signaling Smoke [42166842803](https://github.com/Reekyi/UpStatus/actions/runs/42166842803) both SUCCESS. Smoke log: 15/15 unauthenticated, 103/103 authenticated, 21/21 signaling static regression groups, authenticated browser call/voice/screen WebRTC, three-member mesh, rate limit 90 accepted + 1 HTTP 429, atomic read-receipt concurrency and fixture cleanup. The new Normal call-room cleanup retry/logout-gate regressions passed.
- **#75 Team Lite baseline** — HEAD 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309; 59 ahead / 0 behind team-lite-official. Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) is historical baseline evidence only; #76 is the newer candidate.
- **#76 Team Lite** — HEAD 95d88e34c25679e161f09654f5f7e372f2a7a430; 201 ahead / 0 behind team-lite-official and 142 ahead / 0 behind #75. Exact-head Candidate Checks [42166848429](https://github.com/Reekyi/UpStatus/actions/runs/42166848429) SUCCESS. Log: 15/15 unauthenticated, 103/103 authenticated, call/voice/screen WebRTC, three-member mesh, open join/late join/owner handoff/race/capacity, rate limit 90+1, read-receipt concurrency, migration-layout guard, candidate version 3.4.31, call-room retry/logout-gate tests and fixture cleanup.
- **#82 QA** — HEAD 4b85bb1cbe11794380eebe38daf760a0ee2305f0; 51 ahead / 0 behind master before this append. Validate [42163103958](https://github.com/Reekyi/UpStatus/actions/runs/42163103958) failed at the inherited assertion “production updateURL mismatch” in scripts/validate.mjs:26. This is not a runtime test failure, but it remains a red check on the current documentation head.

The call-room retry branches normal/call-room-leave-retry-20261106 and team-lite/call-room-leave-retry-20261106 compare identical to the corresponding PR heads (0 ahead / 0 behind). No separate unmerged code delta was found.

### Call-room cleanup retry — previous finding corrected in current candidates

The earlier finding that callCleanup discarded the retry context during an offline transport replacement is **fixed in the current #74 and #76 heads by code inspection and exact-head automated tests**.

Both candidates now:
- Capture the member and transport instance before asynchronous teardown.
- Create a member-bound signalPendingCallLeaves entry containing room ID, call ID, member and promise.
- Keep the pending entry until the server confirms leave or an idempotent terminal state.
- Refuse to switch a still-running operation silently to a replacement transport.
- Retry the pending leave after the authenticated transport is recreated.
- Return an unconfirmed result on persistent failure.
- Gate logout/session revocation before API logout, Realtime shutdown and credential clearing.

Dynamic tests in scripts/signaling-static.test.mjs and scripts/team-lite-candidate-check.mjs cover fail-then-success, transport replacement, no transport/offline retry, persistent failure, member/account isolation and logout gating. Relevant logs: [Normal Smoke 42166842803](https://github.com/Reekyi/UpStatus/actions/runs/42166842803) and [Team Lite Candidate Checks 42166848429](https://github.com/Reekyi/UpStatus/actions/runs/42166848429).

### Remaining lifecycle gap — pagehide does not clean up authenticated calls

A separate issue remains and is confirmed on both current heads:

- Normal pagehide handler at src/userscript/upstatus.user.template.js:258 calls only voiceRoomLeave().
- Team Lite pagehide handler at team-lite/upstatus-team-lite.user.js:544 calls only voiceRoomLeave().catch(...).
- Neither handler invokes callCleanup() for an active authenticated call.
- signalPendingCallLeaves is an in-memory object; it is not persisted in userscript storage.

Therefore, closing the tab during an active call may never create a pending call-room leave handle. If offline teardown has already created one, full reload/process termination loses it. The server membership may remain until the room expires.

The isolated endpoint uses ROOM_TTL_MS = 2 hours and best-effort cleanup on requests with a 60-second cooldown and a maximum of 100 expired rooms per cleanup pass. The membership table has no participant heartbeat/last_seen_at. This bounds the stale membership but does not make page termination cleanup reliable.

Issue [#78 follow-up 6677503321](https://github.com/Reekyi/UpStatus/issues/78#issuecomment-6677503321) records the next safe design: best-effort call cleanup on pagehide; persist only validated room ID, member, call ID and timestamp (never the session token); restore/retry only after the same member authenticates; clear persisted state only after confirmed or terminal-idempotent leave. Required tests: online pagehide, offline pagehide + reload, expired room, malformed/stale stored state and account isolation. This is not implemented and remains MANUAL/IMPLEMENTATION PENDING.

### Supabase production — current read-only catalog

Project dlfvkawaiqduhlazsszm remains ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, us-west-2, seven migrations through 20261027155438.

The candidate objects remain absent from production:
- upstatus_signal_rate_limits and consume_upstatus_signal_rate_limit;
- merge_chat_read_receipts;
- open_upstatus_signal_voice_room;
- leave_upstatus_signal_room;
- dedicated upstatus-signal Edge Function.

RLS/grants were checked with catalog queries and has_table_privilege():
- Nine backend-owned public tables have RLS enabled and zero policies, but anon and authenticated still have SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER and MAINTAIN.
- public.upstatus_visual_config has RLS enabled, zero policies and no anon/authenticated table grants.
- realtime.messages has RLS enabled, zero policies and client SELECT/INSERT/UPDATE grants.

The grants are excessive privilege surface, but do not by themselves prove row access while RLS has no policies. Do not infer direct table disclosure solely from grants.

The enabled trigger upstatus_messages_broadcast remains AFTER INSERT/UPDATE/DELETE on public.messages. Its function upstatus_broadcast_messages() is SECURITY DEFINER, search_path=public, executable by anon/authenticated/service_role, and serializes OLD/NEW with to_jsonb before calling realtime.send on db_change with private=false. This confirms the public full-row message broadcast path remains present. The other two broadcast functions, upstatus_broadcast_remote_state() and upstatus_broadcast_users(), are also SECURITY DEFINER and executable by client roles.

Security Advisor observed at 2026-11-06T05:30:14Z: 3 WARN anon-executable SECURITY DEFINER, 3 WARN authenticated-executable SECURITY DEFINER, 10 INFO RLS enabled without policies; performance and health advisors had no findings.

Production default ACL catalog entries remain broad:
- postgres: public and storage defaults grant object privileges to anon/authenticated/service_role;
- supabase_admin: public, graphql and graphql_public defaults grant object privileges to anon/authenticated/service_role.
There is no global default-ACL override for function EXECUTE in production. SQL session is postgres, not superuser and not a member of supabase_admin; ACL-02 cannot be completed by this session.

### Supabase isolated project — current read-only catalog

Project bfpjtfqlnypisxljoxkb remains ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, sa-east-1, 21 migrations through 20261105220323. Isolated Edge Functions: upstatus-signal-test ACTIVE v28 (SHA e26011f026c74821a1e05bf314340604d715820ab864b63d66fd481d93d00d4f) and upstatus-signal-e2e-once ACTIVE v3.

The four candidate RPCs exist: consume_upstatus_signal_rate_limit, merge_chat_read_receipts, open_upstatus_signal_voice_room and leave_upstatus_signal_room. All are SECURITY INVOKER, have empty search_path, deny EXECUTE to anon/authenticated and allow service_role. Signal/receipt/rate-limit tables have RLS enabled, zero policies and no anon/authenticated SELECT/INSERT.

Post-CI read-only counts were zero for rooms, memberships, events, bindings and rate-limit buckets; users, messages and chat_reads were also zero. No manual cleanup was run by this audit.

Effective default ACL scope in the isolated project is narrower but not global across all owners/schemas:
- postgres global function default is restricted to postgres;
- postgres defaults in public restrict tables/functions/sequences to postgres and service_role;
- postgres defaults in storage remain broad;
- supabase_admin defaults in public/graphql/graphql_public remain broad.
The isolated hardening must not be described as covering every managed schema/owner.

The isolated signal endpoint authenticates x-upstatus-token by hashing it and resolving an unexpired upstatus_sessions row plus an existing user. It calls consume_upstatus_signal_rate_limit for event/read buckets; 90+1 and concurrency passed in CI. However, the endpoint does not emit Retry-After, and neither current product server template (src/server/index.template.ts, src/server/team-lite-index.template.ts) references consume_upstatus_signal_rate_limit. Product endpoint integration and Retry-After remain pending.

### Production Edge Function inventory and deployed bundle parity

Production currently lists 38/38 Edge Functions ACTIVE; all report verify_jwt=false. That gateway setting does not prove absence of application authentication.

Source inspection covered 31/38 functions: the two primary product runtimes, all 13 screen-share versions, all 11 backup functions and five legacy/test endpoints. The sampled non-empty functions contain custom token/session-auth markers; seven remaining legacy/test variants still need route/consumer/auth review.

Primary runtimes:
- upstatus v480, SHA bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd, internal userscript 3.4.7.
- upstatus-team-lite v15, SHA 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb, internal userscript 3.4.30.
- upstatus-screen-share-3-1-1-beta10 v6, SHA f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29, internal userscript 3.1.1-beta8.

The embedded Normal and Team Lite userscripts were decoded and searched. Neither contains signalPendingCallLeaves, signalRetryPendingCallLeaves, openVoiceRoom, consume_upstatus_signal_rate_limit or Retry-After. Thus the production bundles have not received the candidate call-room retry/open-voice/rate-limit integration, even though their visible version strings may look close to candidate versions. Production Team Lite is still 3.4.30; candidate #76 is 3.4.31.

The 11 active backup endpoints include upstatus-backup-327-pre328, whose index.ts is empty (0 bytes; SHA 3d6c4f8e5f777830ea720ab2938cb023b5a4e4c7d26f3fc02b926ce0e4d0dd90). Other backups contain older runtime snapshots. The 12 active upstatus-test* endpoints and 13 screen-share version endpoints remain a sizeable legacy surface; consumer mapping and decommission/rollback decisions are pending. No endpoint was invoked and no function was disabled.

### Deploy, issues and remaining release gates

The master deploy workflow still differs from the candidate in #74: master uses the unpinned CLI latest path and lacks the candidate's explicit branch/SHA/project checks. The candidate workflow pins checkout to github.sha, requires master, compares HEAD/GITHUB_SHA, pins project ID dlfvkawaiqduhlazsszm and Supabase CLI 2.122.1, but it is not merged and deploys only Normal. No deploy occurred.

- [#78](https://github.com/Reekyi/UpStatus/issues/78) remains open (21 comments). Physical no-F5 reconnection, pagehide/reload offline, installed Normal ↔ Team Lite, real microphone/audio and physical display capture remain unverified.
- [#79](https://github.com/Reekyi/UpStatus/issues/79) remains open (74 comments). Its latest engineering checkpoint [6677465427](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6677465427) still described Team Lite run 42166848429 as in progress; that run has since completed successfully. Update the issue checkpoint before using it as the release source of truth.

Priority gates:
1. Implement token-free durable pagehide/reload recovery for pending call-room leaves and test online/offline/account-isolation cases.
2. Keep #74/#76 Draft until human review and physical installed-browser acceptance.
3. Integrate distributed rate limiting into real Normal/Team Lite product endpoints and add Retry-After.
4. Resolve RT-01 with coordinated private Realtime authorization/payload cutover compatible with the UpStatus session model.
5. Resolve ACL-02 with a supported administrative path for supabase_admin and least-privilege defaults.
6. Validate production-intended migrations only in the authorized TEST project, including rollback and grants/SECURITY DEFINER checks.
7. Audit the seven remaining test endpoints, map all backup consumers and rollback paths, and retire only after owner approval.
8. Update #79 and complete the physical #78 acceptance checklist.

### Safety record

All Supabase queries in this audit were SELECT-only/catalog reads. The CI workflows linked above were initiated by engineering and inspected read-only; their isolated test scripts used the explicit project guard and mutation opt-in, not this audit. This audit did not start workflows, execute test scripts, mutate fixtures or clean data. No production write, migration, deploy, merge, release, userscript publication, secret/flag/role change or destructive operation occurred. The only write from this audit is this append to docs/RELEASE_READINESS.md on the dedicated QA branch.

Do not publish a completion percentage. #74 and #76 have exact-head AUTOMATED PASS, but pagehide durability, physical/manual acceptance, human reviews, RT-01, ACL-02, product rate-limit cutover and production migrations remain open gates.


## Independent audit checkpoint — 2026-11-06 03:33 BRT

This checkpoint supersedes the prior pagehide finding for Normal only. The requested QA file was re-fetched immediately before this append (blob `987762e13001686f75749245d7b6c284ed340192`); PR #82 head was still `bf040c34e236df133653eccbcfae04ba94e9a64b`. The update is confined to this QA branch and uses the fetched blob SHA as the contents-API precondition.

### Exact PR heads, ancestry, CI and review state

All four PRs remain open, Draft, unmerged and mergeable. Review submissions and inline review threads are empty on #74, #75, #76 and #82.

- **Normal #74** — HEAD `2db440814d374ad1e06b48645920573eaa8db978`, 674 ahead / 0 behind `master`. Exact-head Validate [42172723990](https://github.com/Reekyi/UpStatus/actions/runs/42172723990) and Signaling Smoke [42172723820](https://github.com/Reekyi/UpStatus/actions/runs/42172723820) both completed SUCCESS. Smoke job [127745903430](https://github.com/Reekyi/UpStatus/actions/runs/42172723820) completed every step successfully: 15/15 unauthenticated checks, 103/103 authenticated integration checks, browser call/voice/screen WebRTC with remote tracks, three-member mesh, 90 accepted + 1 HTTP 429, distributed limiter concurrency, atomic receipt concurrency, and fixture cleanup. The log explicitly reports “Normal durable pagehide/reload call-room leave recovery tests passed.”
- **Team Lite #76** — HEAD `95d88e34c25679e161f09654f5f7e372f2a7a430`, 201 ahead / 0 behind `team-lite-official`, 142 ahead / 0 behind #75. Exact-head Candidate Checks [42166848429](https://github.com/Reekyi/UpStatus/actions/runs/42166848429) completed SUCCESS (job [127726459225](https://github.com/Reekyi/UpStatus/actions/runs/42166848429)). Logs confirm 103/103 authenticated checks, call/voice/screen browser WebRTC, three-member mesh, rate limit 90+1, receipt concurrency, cleanup, call-room retry and logout-gate regressions, candidate version 3.4.31 and portal/updater checks. This run does **not** cover durable pagehide/reload call-leave persistence; that code is absent from this head.
- **Team Lite baseline #75** — HEAD `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`, 59 ahead / 0 behind `team-lite-official`. Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) remains historical baseline evidence; #76 is the current signaling candidate.
- **QA #82** — HEAD `bf040c34e236df133653eccbcfae04ba94e9a64b`, 52 ahead / 0 behind `master`; the only changed path remains this Markdown file. Validate [42169381115](https://github.com/Reekyi/UpStatus/actions/runs/42169381115) failed at `scripts/validate.mjs:26` with `production updateURL mismatch`. The failure is in the repository validator/build metadata path, not a Markdown parse failure. No validator assertion was weakened.

The former `normal/reconnect-recovery-candidate` branch is now 9 commits behind #74 (0 ahead); the pagehide implementation is already in #74's current head. No separate Normal candidate delta remains to be integrated.

### Normal pagehide/reload recovery — implemented and exact-head CI passed

Current Normal source: [`src/userscript/upstatus.user.template.js`](https://github.com/Reekyi/UpStatus/blob/chore/continuity-foundation/src/userscript/upstatus.user.template.js), blob `a1a67a4a938383b5b2fe39b1848e9338b1783cf2`.

- The pagehide handler at line 258 starts `callCleanup(false, 'pagehide')` before the voice-room leave attempt.
- Pending authenticated call-room leaves are persisted under a versioned, per-member Tampermonkey GM-storage key.
- The stored envelope contains only `roomId`, `member`, `callId` and `createdAt`; no session token or transport object is persisted.
- Records are bounded to 20, room IDs must match `^[A-Za-z0-9._:-]{1,128}$`, call IDs are bounded and reject control characters, member identity must match the authenticated member, future timestamps beyond the 60-second allowance are rejected, and records older than seven days are rejected.
- Restore runs only after the same member has authenticated and the authenticated signaling transport initializes; the restored handles are retried and cleared after confirmed or terminal-idempotent leave.
- The exact-head Smoke log confirms VM regressions for pagehide persistence, token absence, same-member restore, cross-member isolation, malformed/stale/future record rejection, reload retry and clearing after confirmed leave.

**Residual code-inspection risk:** `signalPersistPendingCallLeaves()` catches a GM storage exception and returns `false`, but the pagehide/call-cleanup caller does not check that return value. The current regression suite covers successful GM storage but has no explicit storage-write-failure case. Persistence is therefore best-effort if Tampermonkey storage itself fails. Add a failure-path test and define the expected degraded behavior; do not describe this as guaranteed durability under storage failure.

### Team Lite pagehide parity — still missing

Current Team Lite source: [`team-lite/upstatus-team-lite.user.js`](https://github.com/Reekyi/UpStatus/blob/team-lite/signaling-transport-candidate/team-lite/upstatus-team-lite.user.js), blob `4e0095a0c9c6854250145220f97dd0ca11aa1c8d`.

- Its pagehide handler at line 544 still calls only `voiceRoomLeave().catch(...)`.
- It has an in-memory `signalPendingCallLeaves` map but no `signalPendingCallLeavesStorageKey`, no `signalPersistPendingCallLeaves`, and no same-member durable restore path.
- Team Lite `callCleanup()` creates an in-memory pending entry, but a full page/process termination can discard it.
- The passing #76 Candidate Checks cover call cleanup/retry/logout and offline/online recovery during the page lifetime, not durable call-leave recovery across pagehide/reload.

Port the Normal persistence contract to Team Lite without copying session tokens or transport objects, regenerate the embedded userscript from the tested source, retain bundle/source equality checks, and add the same malformed/stale/future/cross-member/reload/storage-failure tests. Until then, pagehide durability is **Normal candidate PASS / Team Lite BLOCKED** and issue #78 remains open.

### Issue status and documentation drift

- [#78](https://github.com/Reekyi/UpStatus/issues/78) remains open with 21 comments and all eight acceptance checkboxes unchecked. Latest engineering follow-up [6677503321](https://github.com/Reekyi/UpStatus/issues/78#issuecomment-6677503321) records the Normal-only persistence implementation, confirms Team Lite parity is not implemented, and keeps physical close/reload/offline acceptance pending.
- [#79](https://github.com/Reekyi/UpStatus/issues/79) remains open with 74 comments. Its body still carries the 2026-11-03 snapshot and its latest checkpoint predates the Normal pagehide implementation and exact-head Smoke completion. Treat #79's embedded head/run table as stale until its owner refreshes it; this audit did not edit the issue.

### Production Supabase — current read-only catalog

Project `dlfvkawaiqduhlazsszm` remains ACTIVE_HEALTHY, region `us-west-2`, PostgreSQL `17.11.0.002`, seven migrations through `20261027155438`, and 38/38 Edge Functions ACTIVE.

The following candidate objects are still absent from production: `upstatus_signal_rate_limits`, `consume_upstatus_signal_rate_limit`, `merge_chat_read_receipts`, `open_upstatus_signal_voice_room`, and `leave_upstatus_signal_room`. The dedicated `upstatus-signal` Edge Function is also absent.

Read-only catalog/privilege checks reconfirmed:
- Nine backend-owned public tables (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) have RLS enabled and zero policies, while anon and authenticated each retain SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER and MAINTAIN. These are unnecessary effective grants, but with RLS enabled and no policies they do not alone prove row access.
- `public.upstatus_visual_config` has RLS and zero policies but no anon/authenticated table grants.
- `realtime.messages` has RLS enabled, zero policies, and anon/authenticated SELECT/INSERT/UPDATE grants.
- `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()` and `upstatus_broadcast_users()` remain SECURITY DEFINER with `search_path=public`; their ACLs include PUBLIC, anon, authenticated and service_role EXECUTE. All three corresponding triggers remain enabled.
- `upstatus_broadcast_messages()` serializes the OLD/NEW row with `to_jsonb` and calls `realtime.send(..., 'db_change', ..., false)`. The public full-row message/attachment-metadata broadcast path remains a confirmed RT-01 release blocker.
- Production default ACLs remain broad for postgres in public/storage and supabase_admin in public/graphql/graphql_public. `acldefault('f', postgres)` is `{=X/postgres,postgres=X/postgres}` and there is no global function-default override. Current SQL role is postgres, not superuser and not a member of supabase_admin; ACL-02 remains blocked pending a supported administrative path.

Security Advisor observed at `2026-11-06T06:34:14.955Z`: three WARN findings for anon-executable SECURITY DEFINER functions, three WARN findings for authenticated-executable SECURITY DEFINER functions, and ten INFO findings for RLS-enabled tables without policies. Performance and health advisors returned no findings.

### Isolated Supabase candidate — not production evidence

Project `bfpjtfqlnypisxljoxkb` remains ACTIVE_HEALTHY, `sa-east-1`, PostgreSQL `17.11.0.003`, 21 migrations through `20261105220323`. `upstatus-signal-test` is ACTIVE v28 (SHA `e26011f026c74821a1e05bf314340604d715820ab864b63d66fd481d93d00d4f`); `upstatus-signal-e2e-once` is ACTIVE v3.

The four candidate RPCs exist:
- `consume_upstatus_signal_rate_limit(p_bucket_key text, p_limit integer, p_window_seconds integer)`
- `merge_chat_read_receipts(p_user_name text, p_messages jsonb, p_last_read_at timestamptz)`
- `open_upstatus_signal_voice_room(p_logical_id text, p_user_name text, p_max_members integer)`
- `leave_upstatus_signal_room(p_room_id text, p_user_name text)`

All four are SECURITY INVOKER, use an empty `search_path`, and grant EXECUTE only to postgres/service_role among the checked roles. The five signaling tables have RLS enabled, zero policies, no anon/authenticated SELECT/INSERT, and service_role access. Post-run counts for rooms, members, bindings, events and rate-limit buckets were all zero; no manual cleanup was performed.

The isolated project still has broader defaults for supabase_admin in public/graphql/graphql_public and for postgres in storage; its public-schema postgres defaults and global function default are restricted. Its Security Advisor returned 15 INFO RLS-without-policy findings and no SECURITY DEFINER WARN; health advisor returned no findings. This is isolated-only hardening, not evidence of production remediation.

The isolated signal endpoint passed 90 accepted + 1 HTTP 429 and concurrency in CI, but its source has no `Retry-After` header. Both current product server templates contain the atomic receipt RPC call but no `consume_upstatus_signal_rate_limit` call and no `Retry-After` behavior. Product endpoint rate-limit integration remains pending.

### Edge Functions and deployed/candidate parity

Production lists 38 ACTIVE functions. The inventory includes two primary product runtimes, 13 screen-share variants, 12 backup-labelled functions and 12 test-labelled functions (labels overlap for `upstatus-test-backup-032`; counts are not additive). All report `verify_jwt=false`; that gateway setting does not establish absence of application-level auth.

The primary deployed functions remain:
- `upstatus`: v480, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`.
- `upstatus-team-lite`: v15, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`.
- `upstatus-screen-share-3-1-1-beta10`: v6, SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`.

Source inspection of the two primary runtimes still finds custom `x-upstatus-token` validation and timing-safe comparison. The deployed Normal and Team Lite function source/bundles contain none of the candidate markers `signalPendingCallLeaves`, `openVoiceRoom`, `consume_upstatus_signal_rate_limit`, `merge_chat_read_receipts` or `Retry-After`. Thus the pagehide/retry/rate-limit/receipt candidate work is not deployed. The seven less-reviewed legacy/test variants and backup consumer/rollback mapping remain open inventory work; no endpoint was invoked or disabled.

### Workflow and safety review

- Exact-head Normal Smoke and Team Lite Candidate Checks were initiated by engineering/GitHub and inspected read-only. No workflow was started by this audit.
- The candidate workflows run `scripts/assert-isolated-supabase.mjs` and explicitly set `UPSTATUS_SIGNAL_ALLOW_MUTATION=1` for the test steps. Their CI mutation is confined by the project guard to the isolated project; this audit did not execute those scripts or mutate fixtures.
- Master `.github/workflows/deploy-production.yml` still uses Supabase CLI `latest`, lacks explicit branch/SHA/project guards, and deploys only `upstatus`. The #74 candidate workflow (blob `f3493d19cb59bb4d9f41eb4ab05d542befa2b8ce`) checks out `github.sha`, requires `refs/heads/master`, verifies project ID `dlfvkawaiqduhlazsszm`, pins CLI `2.122.1`, and still deploys only Normal. It is not active in master because #74 remains Draft. No deploy occurred.
- Master validator `scripts/validate.mjs:26` still asserts that the production userscript `@updateURL` includes `/upstatus/upstatus.user.js`; #82's Validate run fails at this assertion. The validator was not changed.

### Next gates

1. Port Normal's validated token-free, per-member durable pagehide/reload pending-leave persistence to Team Lite and regenerate its bundle.
2. Add a Normal regression for GM storage write failure; define and expose the degraded behavior when persistence cannot be committed.
3. Run exact-head Team Lite Candidate Checks after the parity port; keep the adapter/bundle equality guard.
4. Complete real Tampermonkey/browser close/reload/offline tests and the full no-F5 network-recovery acceptance for both products; keep #78 open until signed off.
5. Integrate the distributed limiter into both actual product endpoints and add/test `Retry-After`.
6. Resolve RT-01 with a coordinated private/authenticated Realtime or server-mediated replacement design compatible with the custom UpStatus session model.
7. Resolve ACL-02 through a supported administrative path; validate grant/SECURITY DEFINER/default-ACL migrations in official TEST with rollback.
8. Update #79's stale head/run snapshot, complete the remaining Edge Function/backup consumer inventory, and obtain human reviews.
9. Keep #74/#76 Draft; no release until production security, migrations, manual acceptance and coordinated Normal/Team Lite cutover are approved.

### Safety record

All Supabase SQL in this checkpoint was SELECT-only/catalog inspection. No production write, migration, Edge Function deploy, secret/flag/role change, userscript publication, merge, release, destructive operation, test-script execution or fixture mutation was performed. The only write is this append to `docs/RELEASE_READINESS.md` on the dedicated QA branch. No completion percentage is reported.


## Independent audit checkpoint — 2026-11-06 04:39 BRT

This checkpoint supersedes the previous pagehide parity statement: durable pending call-room leave persistence is now present in both current candidates. It does not waive the real-browser acceptance gate. The QA file and branch ref were re-fetched immediately before this append; current branch head was `4e8c6634d7d32b072fbd524530ccd76f54cbbcef`, current file blob was `092bcee36e33851e93ec8e37a7bb05f3d02bd69f`, and PR #82 pointed to the same branch/head. The update uses the fetched blob SHA as the contents-API precondition.

### Exact refs, ancestry, PR state and reviews

All four tracked PRs remain open, Draft, unmerged and mergeable. GitHub review-submission and inline-thread APIs returned zero reviews and zero threads for #74, #75, #76 and #82.

- **Normal #74** — `chore/continuity-foundation`, HEAD `2db440814d374ad1e06b48645920573eaa8db978`; 674 ahead / 0 behind `master`. Exact-head Validate [42172723990](https://github.com/Reekyi/UpStatus/actions/runs/42172723990) and Signaling Smoke [42172723820](https://github.com/Reekyi/UpStatus/actions/runs/42172723820) completed SUCCESS. Smoke job [127745903430](https://github.com/Reekyi/UpStatus/actions/runs/42172723820) reports 15/15 unauthenticated and 103/103 authenticated checks, 21/21 static regression groups, call/voice/screen WebRTC, three-member mesh, 90 accepted + 1 HTTP 429, rate-limit concurrency, atomic receipt concurrency, durable pagehide/reload helper tests, and cleanup.
- **Team Lite #76** — `team-lite/signaling-transport-candidate`, HEAD `28e8d948f82d4d86fa853ba20d1ac6cadcd1574a`; 203 ahead / 0 behind `team-lite-official`, 144 ahead / 0 behind #75. Exact-head Candidate Checks [42178075022](https://github.com/Reekyi/UpStatus/actions/runs/42178075022) completed SUCCESS. Job [127761066800](https://github.com/Reekyi/UpStatus/actions/runs/42178075022) reports 15/15 unauthenticated, 103/103 authenticated, browser voice/WebRTC and three-member mesh, 90 accepted + 1 HTTP 429, distributed limiter concurrency, atomic receipt concurrency, migration-layout guard, candidate version 3.4.31/portal/updater checks, durable pagehide/reload helper tests, and final cleanup.
- **Team Lite baseline #75** — HEAD `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; 59 ahead / 0 behind `team-lite-official`. Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) remains historical baseline evidence; #76 is the current signaling candidate.
- **QA #82** — HEAD `4e8c6634d7d32b072fbd524530ccd76f54cbbcef`; 53 ahead / 0 behind `master`; one changed path, this Markdown file. Validate [42175677100](https://github.com/Reekyi/UpStatus/actions/runs/42175677100) failed at the existing `production updateURL mismatch` assertion during the Validate build step. The failure is inherited from the master baseline/build metadata path, not a Markdown syntax error. The validator was not changed or weakened.

The requested QA branch is currently **not protected** (`protected=false` in the branch API). Continue using a fresh content fetch and blob-SHA precondition for every documentation write; do not infer that branch protection will prevent concurrent edits.

### Durable pagehide/reload recovery — both candidates now present

- Normal source: `src/userscript/upstatus.user.template.js`, blob `a1a67a4a938383b5b2fe39b1848e9338b1783cf2`.
- Team Lite source: `team-lite/upstatus-team-lite.user.js`, blob `1931e0a255d797cf5c97674d1e9c8b0316d39466`.
- Team Lite candidate checker: `scripts/team-lite-candidate-check.mjs`, blob `0ce678c9c545c17c3b2dfff62bca0cbecc17d244`.
- Normal static/VM regression harness: `scripts/signaling-static.test.mjs`, blob `42891c84047a2ef6b074e4209e9db85a8878fe19`.

Both pagehide handlers now initiate `callCleanup(false,'pagehide')` before the voice-room leave attempt. Both clients persist a versioned per-member GM-storage envelope containing only `roomId`, `member`, `callId` and `createdAt`; no session token or transport object is stored. Restore is gated on the same authenticated member and transport initialization. Records are bounded to 20 entries and seven days, reject malformed room/call IDs, cross-member records, stale records and future timestamps, and are cleared after confirmed leave.

**Evidence classification:** the exact-head CI tests are automated VM/helper-contract tests. Their harnesses use a Map-backed `GM_setValue`/ `GM_getValue` shim; the Team Lite checker asserts the pagehide handler wiring and then directly invokes the cleanup/restore helpers. They are not a real Tampermonkey installation test and do not prove browser process termination or actual GM storage durability. Real browser close/reload while offline, same-member recovery without F5, real microphone/display permissions and installed Normal ↔ Team Lite interoperability remain **MANUAL PENDING**.

### Two residual call-room cleanup risks

1. **GM storage write failure — CODE INSPECTION; regression absent.** In both clients, `signalPersistPendingCallLeaves()` catches a `GM_setValue` exception and returns `false`. `callCleanup()` calls it but does not check the return value before continuing. The current test contexts implement `GM_setValue` as `storage.set(...)` on a normal Map, so the failure path is not exercised. If Tampermonkey storage throws, the page can close without a durable retry record. Add an injected storage-write-failure test and define the degraded behavior; do not describe persistence as guaranteed when the storage API fails.
2. **Room created before the client receives its ID — UNVERIFIED RACE.** The call path awaits `signalTransport.prepareCallRoom(upCall.callId,...)` and only then writes `signalRoomByCallId[callId] = room.roomId`. The adapter creates the room, binds the logical call ID, waits for recipient acceptance, and returns the room ID only after those steps. If page/process termination occurs during that in-flight sequence, `callCleanup()` may have no room ID to persist even though the server may already have created the room. The code closes the room if the promise later resumes and rejects while the page is alive, but that is not a guarantee after process termination. This is not a reproduced failure. Add server-side idempotent lookup/close by logical call ID or persist a pre-creation recovery handle, then test pagehide during create, bind and acceptance-wait phases. The issue's engineering note [#78 comment 6677503321](https://github.com/Reekyi/UpStatus/issues/78#issuecomment-6677503321) records the same residual race.

### Issues and manual acceptance

- [#78](https://github.com/Reekyi/UpStatus/issues/78) remains open with 21 comments and all eight acceptance checkboxes unchecked. Latest engineering comment [6677503321](https://github.com/Reekyi/UpStatus/issues/78#issuecomment-6677503321) confirms both candidate CI passes, while physical close/reload-offline, same-member recovery without F5, real devices and installed cross-client interoperability remain pending.
- [#79](https://github.com/Reekyi/UpStatus/issues/79) remains open with 74 comments. Its main issue body still carries the 2026-11-03 snapshot; latest checkpoint comment [6677465427](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6677465427) contains newer heads and CI, but the body should be refreshed by its owner before it is treated as the release source of truth.

### Production Supabase — current read-only revalidation

Project `dlfvkawaiqduhlazsszm` is ACTIVE_HEALTHY in `us-west-2`, PostgreSQL `17.11.0.002`, with seven migrations through `20261027155438`. The following candidate objects remain absent: `upstatus_signal_rate_limits`, `consume_upstatus_signal_rate_limit`, `merge_chat_read_receipts`, `open_upstatus_signal_voice_room`, and `leave_upstatus_signal_room`. The dedicated `upstatus-signal` function is also absent.

Read-only catalog checks reconfirmed:

- Nine backend-owned public tables (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) have RLS enabled, zero policies, and all eight table privileges effective for both anon and authenticated: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER and MAINTAIN. This is an excessive privilege surface; it does not by itself prove row access because RLS is enabled with no policies.
- `public.upstatus_visual_config` has RLS enabled, zero policies and no anon/authenticated table SELECT/INSERT grants.
- `realtime.messages` has RLS enabled, zero policies and anon/authenticated SELECT/INSERT/UPDATE grants.
- The three trigger functions `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()` and `upstatus_broadcast_users()` remain SECURITY DEFINER with `search_path=public` and EXECUTE effective for anon/authenticated/service_role. Their three triggers remain enabled.
- The messages trigger fires after INSERT/UPDATE/DELETE. `upstatus_broadcast_messages()` serializes the full OLD/NEW row with `to_jsonb` and calls `realtime.send(..., 'db_change', ..., false)`; this remains a public full-row broadcast path and the highest-priority RT-01 release blocker.
- Default ACLs remain broad for postgres in public/storage and supabase_admin in public/graphql/graphql_public. The SQL session is postgres, not superuser and not a member of supabase_admin. Function defaults still include PUBLIC EXECUTE; ACL-02 remains blocked pending a supported administrative path for the supabase_admin-owned defaults.

Security Advisor observed at `2026-11-06T07:39:13.845Z`: three WARN findings for anon-executable SECURITY DEFINER functions, three WARN for authenticated-executable SECURITY DEFINER functions, and ten INFO findings for RLS-enabled tables without policies. Performance and health advisors returned no findings.

### Isolated Supabase candidate — not production evidence

Project `bfpjtfqlnypisxljoxkb` is ACTIVE_HEALTHY in `sa-east-1`, PostgreSQL `17.11.0.003`, with 21 migrations through `20261105220323`. The isolated `upstatus-signal-test` Edge Function is ACTIVE v28 (SHA `e26011f026c74821a1e05bf314340604d715820ab864b63d66fd481d93d00d4f`); `upstatus-signal-e2e-once` is ACTIVE v3 (SHA `db0c9206b2171f5f5d67459e2e7451ecbaf6e8ad3c8f55cb4e491660164f5053`).

The four candidate RPCs exist, are SECURITY INVOKER, use an empty `search_path`, and grant EXECUTE only to service_role among the checked client/service roles. The five signaling tables have RLS enabled, zero policies and no anon/authenticated SELECT/INSERT grants. Read-only post-run fixture counts were zero for rooms, members, bindings, events and rate-limit buckets.

The isolated endpoint authenticates the custom `x-upstatus-token` against hashed UpStatus sessions and calls `consume_upstatus_signal_rate_limit`; it returns HTTP 429 in CI but has no `Retry-After` header. The current Normal and Team Lite product server templates call `merge_chat_read_receipts` but contain no `consume_upstatus_signal_rate_limit` call and no `Retry-After` behavior. Product rate-limit integration remains pending; isolated endpoint success is not production evidence.

### Production Edge Functions and deployment

Production lists 38/38 Edge Functions ACTIVE; all report `verify_jwt=false`. Source inspection of the three primary runtimes confirmed application-level custom `x-upstatus-token` validation and timing-safe comparison, but this inspection does not cover every legacy/test endpoint.

- `upstatus`: v480, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`.
- `upstatus-team-lite`: v15, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`.
- `upstatus-screen-share-3-1-1-beta10`: v6, SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`.

The deployed primary function sources/bundles contain none of the candidate markers `signalPendingCallLeaves`, `signalPersistPendingCallLeaves`, `openVoiceRoom`, `consume_upstatus_signal_rate_limit`, `merge_chat_read_receipts` or `Retry-After`; the candidate call-room/persistence/rate-limit/receipt work is not deployed. `upstatus-backup-327-pre328` remains ACTIVE v1 with a zero-byte `index.ts` entrypoint and SHA `3d6c4f8e5f777830ea720ab2938cb023b5a4e4c7d26f3fc02b926ce0e4d0dd90`. The other legacy/test/screen-share/backup endpoints still need consumer/auth/rollback mapping; no endpoint was invoked or disabled.

Master deploy workflow blob `8252c6c6e7005c98625603b5b02b14cb1e50a519` still uses Supabase CLI `latest` and lacks the candidate's explicit branch/SHA/project checks. Candidate #74 deploy workflow blob `f3493d19cb59bb4d9f41eb4ab05d542befa2b8ce` checks out `github.sha`, requires `refs/heads/master`, verifies HEAD equals GITHUB_SHA, pins project ID `dlfvkawaiqduhlazsszm` and CLI `2.122.1`, but still deploys only Normal. It is not active in master because #74 remains Draft. The signaling smoke and Team Lite candidate workflows serialize the shared isolated fixture project and use the explicit isolation guard plus mutation opt-in against `bfpjtfqlnypisxljoxkb`; this audit only inspected their completed logs and did not start a workflow or execute test scripts.

### Next gates

1. Add GM-storage write-failure injection tests to both clients; check and surface the persistence result rather than silently treating a failed write as durable.
2. Close the in-flight `prepareCallRoom` race with server-side idempotent lookup/close by logical call ID or an earlier recovery handle; test pagehide during room creation, binding and acceptance wait.
3. Complete real Tampermonkey/browser close/reload-offline and no-F5 recovery acceptance in both products; keep #78 open until signed off.
4. Integrate the distributed rate limiter into both actual product endpoints and add/test `Retry-After`.
5. Resolve RT-01 with a coordinated authenticated/private Realtime or server-mediated replacement compatible with the custom UpStatus session model.
6. Resolve ACL-02 through a supported administrative path; validate least-privilege grants, SECURITY DEFINER revocations and default-ACL migrations in official TEST with rollback.
7. Audit remaining Edge Function routes/consumers and backup rollback paths; refresh #79's main body and obtain human reviews.
8. Keep #74/#76 Draft. No release until security cutover, official TEST migration rehearsal, physical acceptance and coordinated Normal/Team Lite rollout are approved.

### Safety record

All Supabase SQL in this checkpoint was SELECT-only/catalog inspection. No production write, migration, Edge Function deploy, secret/flag/role change, userscript publication, merge, release, destructive operation, test-script execution or fixture mutation was performed by this audit. The CI workflows linked above were initiated by engineering/GitHub and inspected read-only; their fixture mutations were guarded and confined to the isolated project. The only write from this audit is this append to `docs/RELEASE_READINESS.md` on the dedicated QA branch. No completion percentage is reported.


## Independent audit checkpoint — 2026-11-06 (post-pagehide parity revalidation)

This checkpoint supersedes the preceding snapshot where PR #82 was at `4e8c6634d7d32b072fbd524530ccd76f54cbbcef`. Immediately before this update, PR #82 and the QA branch were re-read; the branch head was `2a43527a256a5b06f52da00b48acd723fb744591` and the current document blob was `a7f7ffd0d127a8a5e4edf0ed94d433db299de1d3`. The update uses that freshly fetched blob SHA as the contents-API precondition. No engineering branch was changed.

### Exact PR heads, ancestry and workflow evidence

All four tracked PRs are currently open, Draft, unmerged and mergeable. GitHub review-submission and inline-thread queries returned zero reviews and zero threads for #74, #75, #76 and #82.

- **Normal #74** — branch `chore/continuity-foundation`, HEAD `2db440814d374ad1e06b48645920573eaa8db978`; 674 ahead / 0 behind `master`. Exact-head Validate [42172723990](https://github.com/Reekyi/UpStatus/actions/runs/42172723990) and Signaling Smoke [42172723820](https://github.com/Reekyi/UpStatus/actions/runs/42172723820) completed SUCCESS. Smoke job [127745903430](https://github.com/Reekyi/UpStatus/actions/runs/42172723820) reports 15/15 unauthenticated checks, 103/103 authenticated integration checks, 21/21 static regression groups, open-room/late-join/owner-handoff/race/capacity cases, call/voice/screen WebRTC with remote tracks, three-member mesh, 90 accepted + 1 HTTP 429, distributed limiter concurrency, atomic receipt concurrency, and fixture cleanup.
- **Team Lite #76** — branch `team-lite/signaling-transport-candidate`, HEAD `28e8d948f82d4d86fa853ba20d1ac6cadcd1574a`; 203 ahead / 0 behind `team-lite-official`, 144 ahead / 0 behind #75. Exact-head Candidate Checks [42178075022](https://github.com/Reekyi/UpStatus/actions/runs/42178075022) completed SUCCESS. Job [127761066800](https://github.com/Reekyi/UpStatus/actions/runs/42178075022) reports 15/15 unauthenticated, 103/103 authenticated, browser call/voice/screen WebRTC with remote audio/video tracks, three-member mesh teardown, distributed limiter and receipt concurrency, migration-layout guard, version 3.4.31/portal/updater checks, voice leave/retry/logout gates, durable pagehide/reload helper tests, and final cleanup.
- **Team Lite baseline #75** — HEAD `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; 59 ahead / 0 behind `team-lite-official`. Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) remains historical baseline evidence; #76 is the current signaling candidate.
- **QA #82** — HEAD `2a43527a256a5b06f52da00b48acd723fb744591`; 54 ahead / 0 behind `master`; one changed path, this Markdown file. Exact-head Validate [42182631099](https://github.com/Reekyi/UpStatus/actions/runs/42182631099) failed in the build-validation step after building Normal 3.4.7 / TEST 3.4.7. The failure is the existing `production updateURL mismatch` assertion at `scripts/validate.mjs:26`, inherited from the master build/metadata baseline; it is not a Markdown parsing failure. The validator was not changed or weakened.

### Durable pagehide/reload recovery — parity now present

Current candidate source blobs:
- Normal `src/userscript/upstatus.user.template.js`: `a1a67a4a938383b5b2fe39b1848e9338b1783cf2`.
- Team Lite `team-lite/upstatus-team-lite.user.js`: `1931e0a255d797cf5c97674d1e9c8b0316d39466`.
- Normal regression harness `scripts/signaling-static.test.mjs`: `42891c84047a2ef6b074e4209e9db85a8878fe19`.
- Team Lite candidate checker `scripts/team-lite-candidate-check.mjs`: `0ce678c9c545c17c3b2dfff62bca0cbecc17d244`.

Both clients now invoke `callCleanup(false,'pagehide')` before the separate voice-room leave attempt. Both persist a versioned per-member GM-storage envelope containing only `roomId`, `member`, `callId` and `createdAt`; the session token and transport object are not persisted. The envelope is capped at 20 records, records older than seven days are rejected, room/call IDs are validated, and restore is restricted to the same authenticated member before retrying on the newly initialized transport. The exact-head CI logs explicitly report durable pagehide/reload recovery tests passing in both candidates.

**Evidence classification:** these are automated VM/helper-contract tests. The harnesses inject a Map-backed `GM_setValue`/`GM_getValue` implementation. They verify schema, member isolation, validation, persistence and retry behavior, but do not prove actual Tampermonkey storage durability or browser process termination. Real browser close/reload while offline, same-member recovery without F5, physical microphone/display capture and installed Normal ↔ Team Lite interoperability remain **MANUAL PENDING**.

### Two residual cleanup risks remain in both candidates

1. **GM storage write failure — CODE INSPECTION; regression absent.** In both clients, `signalPersistPendingCallLeaves()` catches a `GM_setValue` exception and returns `false`. `callCleanup()` invokes it but does not check that return value before clearing the in-memory call maps and continuing teardown. The current harness uses `storage.set()` on a normal Map and has no injected throwing-storage case. If Tampermonkey storage rejects the write during pagehide, no durable retry record is guaranteed. Add a throwing `GM_setValue` test and define an explicit degraded behavior; do not report persistence as guaranteed when storage fails.
2. **In-flight `prepareCallRoom` race — CODE INSPECTION; NOT REPRODUCED.** The adapter performs `createRoom()`, then `bindRoom({bindingType:"call", logicalId})`, then waits for recipient acceptance, and returns `roomId` only after those steps. The caller writes `signalRoomByCallId[callId] = room.roomId` only after awaiting the entire `prepareCallRoom()` promise. If the page/process terminates after the server has created/bound a room but before that promise returns, the pagehide cleanup may not know a room ID to persist. The adapter closes the room if its catch path continues running, and the caller closes it if the promise resolves after the call was locally cancelled; neither path guarantees cleanup after process termination. This is a bounded, unverified race, not a reproduced incident. Add server-side idempotent lookup/close by logical call ID or an earlier recovery handle, and test termination during create, bind and acceptance-wait phases.

### Issues and manual acceptance

- [#78](https://github.com/Reekyi/UpStatus/issues/78) remains open with 21 comments; all eight acceptance checkboxes remain unchecked. The latest engineering checkpoint [6677503321](https://github.com/Reekyi/UpStatus/issues/78#issuecomment-6677503321) confirms both exact-head CI passes. Physical approximately 10-second network loss/recovery without F5, real browser close/reload offline, real devices and installed cross-client acceptance remain pending.
- [#79](https://github.com/Reekyi/UpStatus/issues/79) remains open with 74 comments. Its main issue body still carries the 2026-11-03 snapshot; the newer engineering checkpoint [6677465427](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6677465427) contains later heads and CI. The body should be refreshed by its owner before it is treated as the release source of truth.

### Production Supabase — fresh read-only catalog/advisor check

Production project `dlfvkawaiqduhlazsszm` is `ACTIVE_HEALTHY`, region `us-west-2`, PostgreSQL `17.11.0.002`, with seven migrations through `20261027155438`. Candidate signaling/read-receipt/rate-limit tables and RPCs remain absent, as does the dedicated `upstatus-signal` Edge Function.

Read-only catalog checks reconfirmed:
- Nine backend-owned public tables (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) have RLS enabled, zero policies, and all eight table privileges effective for anon and authenticated: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER and MAINTAIN. This is an excessive privilege surface; it does not by itself prove row access because RLS is enabled with no policies.
- `public.upstatus_visual_config` has RLS enabled, zero policies and no anon/authenticated table grants. `realtime.messages` has RLS enabled, zero policies and anon/authenticated SELECT/INSERT/UPDATE grants.
- `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()` and `upstatus_broadcast_users()` remain SECURITY DEFINER, `search_path=public`, and executable by anon/authenticated/service_role. All three attached triggers are enabled.
- The messages trigger fires after INSERT/UPDATE/DELETE. `upstatus_broadcast_messages()` serializes the complete OLD/NEW row with `to_jsonb` and calls `realtime.send(...,'db_change',...,false)`. This remains the confirmed public full-row chat disclosure path and the highest-priority RT-01 release blocker.
- `acldefault('f', postgres)` and `acldefault('f', supabase_admin)` both include PUBLIC EXECUTE for newly created functions. Schema-specific default ACL overrides also grant anon/authenticated privileges in public/storage/graphql/graphql_public scopes. The SQL session is postgres, not superuser and not a member of supabase_admin; ACL-02 remains blocked pending a supported administrative path for the supabase_admin-owned defaults.

The latest Security Advisor query returned three WARN findings for anon-executable SECURITY DEFINER functions, three WARN for authenticated-executable SECURITY DEFINER functions, and ten INFO findings for RLS-enabled tables without policies. Performance and health advisors returned no findings. Remediation references: [anon SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), and [RLS without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

### Isolated Supabase candidate — not production evidence

Project `bfpjtfqlnypisxljoxkb` is `ACTIVE_HEALTHY`, region `sa-east-1`, PostgreSQL `17.11.0.003`, with 21 migrations through `20261105220323`. The isolated `upstatus-signal-test` Edge Function is ACTIVE v28 and `upstatus-signal-e2e-once` is ACTIVE v3.

The four candidate RPCs exist, are SECURITY INVOKER, use an empty `search_path`, and restrict EXECUTE to service_role among the checked roles. Five signaling tables have RLS enabled, zero policies and no anon/authenticated SELECT/INSERT grants. Read-only post-run fixture counts were zero for rooms, members, bindings, events and rate-limit buckets.

The isolated endpoint passed the 90-accepted + 1-HTTP-429 check and distributed concurrency in CI, but it does not return `Retry-After`. Both product server templates call `merge_chat_read_receipts` but do not call `consume_upstatus_signal_rate_limit`; product-facing distributed rate-limit integration remains pending. Isolated success is not production evidence.

### Edge Functions and deployment parity

Production lists 38/38 Edge Functions ACTIVE. The inventory has 12 backup-labelled, 12 test-labelled and 13 screen-share-labelled functions; labels overlap and are not additive. All report `verify_jwt=false`, which does not by itself establish unauthenticated access. Source inspection of the three primary runtimes found custom `x-upstatus-token` validation and `timingSafeEqual`, but the remaining legacy/test routes still need per-function auth/consumer/rollback mapping.

- `upstatus`: ACTIVE v480, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`.
- `upstatus-team-lite`: ACTIVE v15, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`.
- `upstatus-screen-share-3-1-1-beta10`: ACTIVE v6, SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`.

The deployed primary sources contain `x-upstatus-token` and `timingSafeEqual`, but none of the candidate markers `signalPendingCallLeaves`, `signalPersistPendingCallLeaves`, `openVoiceRoom`, `consume_upstatus_signal_rate_limit`, `merge_chat_read_receipts` or `Retry-After`. The zero-byte `upstatus-backup-327-pre328` remains ACTIVE v1 (SHA `3d6c4f8e5f777830ea720ab2938cb023b5a4e4c7d26f3fc02b926ce0e4d0dd90`). No legacy function was invoked or disabled.

Master deploy workflow blob `8252c6c6e7005c98625603b5b02b14cb1e50a519` still uses Supabase CLI `latest` and lacks explicit branch/SHA/project guards. Candidate #74 workflow blob `f3493d19cb59bb4d9f41eb4ab05d542befa2b8ce` checks out `github.sha`, requires `refs/heads/master`, verifies HEAD/GITHUB_SHA, fixes the production project ID and pins CLI `2.122.1`; it still deploys only Normal and is not active in master while #74 remains Draft. No deploy occurred.

### Next gates

1. Add injected GM-storage write-failure tests to both clients and check/surface the persistence result rather than silently treating a failed write as durable.
2. Close the in-flight `prepareCallRoom` race with server-side idempotent lookup/close by logical call ID or an earlier recovery handle; test page termination during create, bind and acceptance wait.
3. Complete real Tampermonkey/browser close/reload-offline and no-F5 recovery acceptance in both products; keep #78 open until signed off.
4. Integrate the distributed limiter into both product endpoints and add/test `Retry-After`.
5. Resolve RT-01 with a coordinated authenticated/private Realtime or server-mediated replacement compatible with the custom UpStatus session model.
6. Resolve ACL-02 through a supported administrative path; validate least-privilege grants, SECURITY DEFINER revocations and default-ACL migrations in official TEST with rollback.
7. Complete legacy Edge Function route/auth/consumer/rollback mapping, refresh #79's main body, and obtain human reviews.
8. Keep #74/#76 Draft. No release until production security, official TEST migration rehearsal, physical acceptance and coordinated Normal/Team Lite cutover are approved.

### Safety record

All Supabase SQL in this checkpoint was SELECT-only/catalog inspection. No production write, migration, Edge Function deployment, secret/flag/role change, userscript publication, PR merge, release, destructive operation, test-script execution or fixture mutation was performed by this audit. Exact-head CI workflows were initiated by engineering/GitHub and inspected read-only; this audit did not start or rerun them. The only write is this append to `docs/RELEASE_READINESS.md` on the dedicated QA branch. No completion percentage is reported.


## Independent audit checkpoint — 2026-11-06 (logical call-attempt recovery)

This checkpoint was prepared after re-reading the QA document and branch ref. Pre-write QA branch HEAD was `e79dd6238996171c075ea79fd96da6932dca1312`; document blob was `73f0bf1dad7955f944741295e86e0b762c70dfd5`. The update is limited to this document on `qa/release-readiness-2026-11-04-master`. Engineering branches and production remain untouched.

### Fresh GitHub refs and exact-head CI

All tracked PRs remain open, Draft, unmerged and mergeable. GitHub review-submission and inline-thread queries returned zero reviews and zero threads for #74, #75, #76 and #82.

- **Normal #74** — `chore/continuity-foundation`, HEAD `0ff4ef9a50c79717250d9eed7e60ed85fa9c8a41`, 692 ahead / 0 behind `master`. Exact-head Validate [42188549612](https://github.com/Reekyi/UpStatus/actions/runs/42188549612) completed SUCCESS. Exact-head Signaling Smoke [42188549610](https://github.com/Reekyi/UpStatus/actions/runs/42188549610) is **IN PROGRESS**, not a pass: syntax/static harnesses and unauthenticated endpoint checks passed; authenticated isolated integration/browser tests are running; distributed rate-limit and atomic receipt concurrency steps are still pending. Do not reuse the prior #74 pass on `2db440814d374ad1e06b48645920573eaa8db978` as evidence for this new head.
- **Team Lite #76** — `team-lite/signaling-transport-candidate`, HEAD `28e8d948f82d4d86fa853ba20d1ac6cadcd1574a`, 203 ahead / 0 behind `team-lite-official`, 144 ahead / 0 behind #75. Exact-head Candidate Checks [42178075022](https://github.com/Reekyi/UpStatus/actions/runs/42178075022) completed SUCCESS on this head. This run validates the earlier durable pagehide/reload implementation, not the new logical call-attempt protocol introduced only in #74.
- **Team Lite baseline #75** — HEAD `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`, 59 ahead / 0 behind `team-lite-official`; [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) remains historical baseline evidence, superseded for current signaling by #76.
- **QA #82** — HEAD `e79dd6238996171c075ea79fd96da6932dca1312`, 55 ahead / 0 behind `master`, one changed file. Latest known Validate [42183661932](https://github.com/Reekyi/UpStatus/actions/runs/42183661932) failed on the inherited `production updateURL mismatch` assertion. This is the prior QA head; a new automatic PR validation may run after this documentation commit. Do not weaken the validator.

### Normal logical call-attempt recovery — CODE INSPECTION; exact-head integration pending

PR #74 adds production-candidate migration `supabase/migrations/20261106080200_call_room_attempt_recovery.sql` (blob `75e994ac4f928753d4d4b1d4e5bbf6785fae23b7`) and isolated test migration `supabase/test-migrations/20261106080200_call_room_attempt_recovery_test.sql` (blob `aca0c31b61af6819a748d74e0d564160efc7ebb9`).

The migration introduces `public.upstatus_signal_call_attempts` and two SECURITY INVOKER RPCs:
- `prepare_upstatus_signal_call_room(text,text,text)`
- `cancel_upstatus_signal_call_room(text,text)`

Both RPCs use an empty `search_path`, serialize prepare/cancel through the same transaction-scoped advisory lock keyed by logical call ID, and grant EXECUTE only to `service_role` among the checked client/service roles. The attempt table has RLS enabled, no policies, no anon/authenticated table privileges, and service_role access. The prepare RPC creates the room, pending membership, binding and attempt record in one transaction. The cancel RPC can close by logical call ID without the client knowing a room ID; cancel-before-prepare writes a tombstone so a delayed prepare cannot create an orphan room. Repeated prepare/cancel is idempotent, and the migration retains a compatibility path for older create+bind clients.

The Normal userscript now persists a per-member logical call ID before sending the first prepare request. If this initial GM-storage write fails, `signalTrackPendingCallAttempt()` returns false and the outgoing call is not started. Cleanup/pagehide can cancel by logical ID even if the prepare response containing the room ID was lost. The shared adapter uses `/room/prepare-call` and `/room/cancel-call`; the isolated Edge Function routes those operations to the two RPCs. This is a materially stronger recovery design than persisting only a room ID after `prepareCallRoom()` returns.

The authenticated integration harness now contains checks for atomic room creation/binding, same-ID idempotent prepare, recipient mismatch, creator-only cancellation, idempotent cancellation, cancel-before-prepare tombstones, eight concurrent prepare requests racing with cancellation, at-most-one room, and rejection of a late prepare. Static assertions also require the migration, endpoint routes, client adapter methods and cleanup coverage.

**Execution status matters:** the exact #74 Smoke run [42188549610](https://github.com/Reekyi/UpStatus/actions/runs/42188549610) had not completed at this checkpoint. Its authenticated integration/browser stage was still running; rate-limit and receipt concurrency were pending. Therefore the new call-attempt race suite is present in the exact-head test code and the schema/function are installed in the isolated project, but there is not yet an exact-head automated PASS for those tests. The exact-head Validate run passed; that is not a substitute for the Smoke run.

### Isolated Supabase confirmation for call-attempt recovery

The isolated project `bfpjtfqlnypisxljoxkb` is ACTIVE_HEALTHY in `sa-east-1`, PostgreSQL `17.11.0.003`. Its migration history now includes:
- `20261106082526` — `call_room_attempt_recovery`
- `20261106082546` — `call_room_attempt_recovery_test`

The isolated `upstatus-signal-test` Edge Function is ACTIVE v29, SHA `0593e8a5245358ece4473cd7504b699adff20372311e43923cde60b19c6808b1`. Its current source calls the new prepare/cancel RPCs and deletes expired call-attempt rows in bounded cleanup batches. It also calls the distributed rate-limit RPC for authenticated reads/writes.

Fresh SELECT-only catalog queries confirmed:
- `upstatus_signal_call_attempts`: RLS enabled, zero policies, anon/authenticated SELECT and INSERT false, service_role SELECT/INSERT true, zero rows.
- Both call-attempt RPCs: SECURITY INVOKER, `search_path=""`, anon/authenticated EXECUTE false, service_role EXECUTE true.
- Post-run fixture counts: rooms 0, members 0, bindings 0, events 0, call attempts 0, rate-limit buckets 0.

This is isolated candidate evidence only. No production migration or function was changed.

### Newly clarified parity and storage residuals

**Team Lite parity is incomplete again for the new protocol.** The current #76 userscript has no `signalPendingCallAttempts` / `signalTrackPendingCallAttempt` implementation. Its adapter still prepares calls using the older `/room/create` + `/room/bind` flow and closes by room ID; it does not expose `cancelCallRoom(logicalId)`. The earlier pagehide room-ID persistence remains present and its previous exact-head CI is green, but it does not cover the new lost-prepare-response/tombstone protocol. Port the migration, server route, adapter, userscript, tests and bundle parity to Team Lite before claiming Normal/Team Lite parity.

**GM storage failure is now split by participant role.** For the Normal call creator, failure of the initial pending-call-attempt write blocks call creation. That closes the earlier creator-side “start call without a recovery handle” gap. However, non-creator participants still rely on the room-ID-based `signalPendingCallLeaves` record. `signalPersistPendingCallLeaves()` catches `GM_setValue` failure and returns false, while the cleanup path does not enforce that result before teardown. If a non-creator page closes while offline and the GM write fails, durable leave recovery is not guaranteed; the server-side membership remains bounded by room TTL/cleanup. Add a throwing-storage test and an explicit degraded path for this participant case. The same concern should be checked for voice-room membership cleanup separately.

### Production Supabase — fresh read-only revalidation

Production project `dlfvkawaiqduhlazsszm` remains ACTIVE_HEALTHY in `us-west-2`, PostgreSQL `17.11.0.002`, with seven migrations through `20261027155438`. The following remain absent from production: `upstatus_signal_call_attempts`, both call-attempt RPCs, the rate-limit table/RPC, `merge_chat_read_receipts`, open/leave voice-room RPCs, and the dedicated `upstatus-signal` Edge Function.

Read-only catalog queries reconfirmed:
- Nine backend-owned public tables (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) have RLS enabled, zero policies, and all eight privileges effective for anon and authenticated: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER and MAINTAIN. This is an excessive privilege surface, not proof of row access while RLS is enabled with no policies.
- `public.upstatus_visual_config` has RLS and no anon/authenticated table privileges.
- `realtime.messages` is partitioned, RLS enabled, zero policies; anon/authenticated retain SELECT/INSERT/UPDATE.
- The enabled `upstatus_messages_broadcast` trigger fires after INSERT/UPDATE/DELETE on `public.messages`. The current SECURITY DEFINER function has `search_path=public`, serializes the full row via `to_jsonb`, and calls `realtime.send(jsonb_build_object('op', TG_OP, 'record', rec), 'db_change', <topic>, false)`. The final `false` keeps the broadcast public. Full message content and attachment metadata remain exposed through this path. RT-01 remains the critical release blocker.
- The three broadcast SECURITY DEFINER functions remain executable by anon/authenticated. Security Advisor at `2026-11-06T08:40:08.893Z` returned 3 WARN for anon EXECUTE, 3 WARN for authenticated EXECUTE, and 10 INFO for RLS-enabled tables without policies; Performance Advisor returned no findings.
- Default ACLs remain broad for postgres in public/storage and supabase_admin in public/graphql/graphql_public. Current SQL role is postgres, not superuser and not a member of supabase_admin; ACL-02 remains blocked pending an authorized administrative path.

Production Edge Functions remain 38/38 ACTIVE. The primary deployed Normal `upstatus` is v480, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`; Team Lite `upstatus-team-lite` is v15, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`; legacy Screen Share beta10 is v6, SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`. Re-inspected deployed Normal and Team Lite source/bundles contain none of the new call-attempt markers, prepare/cancel routes, rate-limit RPC, or Retry-After. All report `verify_jwt=false`; the core functions still perform application-level custom UpStatus token/session validation, so this flag alone is not proof of anonymous application access.

### Rate-limit and remaining release gates

The isolated v29 endpoint uses the distributed rate-limit RPC, but its response helper does not set `Retry-After`. The actual product-facing Normal/Team Lite server templates still do not call `consume_upstatus_signal_rate_limit`; production has no corresponding table/RPC. Rate limiting is therefore isolated-endpoint evidence, not production or coordinated product integration.

Next gates:
1. Wait for and inspect exact-head Normal Smoke [42188549610](https://github.com/Reekyi/UpStatus/actions/runs/42188549610); do not count it as passed while authenticated integration/browser, rate-limit and receipt steps remain incomplete.
2. Port logical call-attempt persistence, prepare/cancel routes, SQL/test migration, adapter and regression tests to Team Lite; retain exact bundle parity checks.
3. Add throwing-GM-storage tests and explicit fallback for non-creator call participants and voice-room leave.
4. Complete physical Tampermonkey close/reload-offline and no-F5 recovery in both products; keep #78 open until the eight acceptance criteria are actually signed off.
5. Integrate rate limiting into both real product endpoints and add/test `Retry-After`.
6. Resolve RT-01 with a coordinated authenticated/private Realtime or server-mediated replacement compatible with the custom UpStatus session model.
7. Resolve ACL-02 through a supported administrative path; rehearse least-privilege/security migrations in official TEST with rollback.
8. Audit remaining legacy Edge Function routes/consumers/rollback paths, refresh #79's main body, and obtain human reviews.
9. Keep #74/#76 Draft. No release until production security, exact-head CI, official TEST rehearsal, physical acceptance and coordinated Normal/Team Lite rollout are approved.

### Safety record

All production SQL in this checkpoint was SELECT-only/catalog inspection. No production write, migration, Edge Function deployment/invocation, secret/flag/role change, userscript publication, merge, release, destructive operation, workflow rerun, test-script execution or fixture mutation was performed by this audit. The exact-head CI workflows were initiated by engineering/GitHub and inspected read-only; the current #74 Smoke was still running. The only write from this audit is this append to `docs/RELEASE_READINESS.md` on the dedicated QA branch. No completion percentage is reported.


## Auditoria independente de continuidade e segurança (2026-11-06, rodada atual)

### Heads e CI revalidados

Todas as referências abaixo foram lidas novamente do GitHub. Os estados distinguem CI do HEAD exato de candidatos laterais.

- **PR #74 Normal**: HEAD `0ff4ef9a50c79717250d9eed7e60ed85fa9c8a41`, 692 commits à frente / 0 atrás de `master`. Validate [42188549612](https://github.com/Reekyi/UpStatus/actions/runs/42188549612) e Signaling Smoke [42188549610](https://github.com/Reekyi/UpStatus/actions/runs/42188549610) concluíram SUCCESS no HEAD exato. O Smoke confirmou 116/116 verificações autenticadas, tombstone de cancel-before-prepare, rejeição de prepare atrasado, serialização de prepare/cancel, WebRTC call/voice/screen, mesh de três participantes, rate limit 90 aceitas + 1 HTTP 429, concorrência de rate limit/read receipts e cleanup.
- **PR #75 baseline Team Lite**: HEAD `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`, 59 commits à frente / 0 atrás de `team-lite-official`. Candidate Checks histórico [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) SUCCESS. Manter como baseline histórico, não como candidato mais novo.
- **PR #76 Team Lite**: HEAD `5cc5df4865250a0d67935937ea43e206217730d5`, 208 commits à frente / 0 atrás de `team-lite-official`, e 149 à frente / 0 atrás de #75. Candidate Checks exato [42194948317](https://github.com/Reekyi/UpStatus/actions/runs/42194948317) concluiu SUCCESS. O log confirma 103/103 verificações autenticadas, WebRTC call/voice/screen, mesh de três participantes, rate limit 90+1 e concorrência, recibos atômicos, migration guard, cleanup, persistência de logical call ID antes do prepare, storage-failure gate, recuperação de room ID desconhecido no pagehide, logout bloqueado por tentativa lógica não cancelada e aceitação de destinatário bloqueada quando não há persistência durável.
- **PR #82 QA**: HEAD `05d384b7f47b605b4b1d453edb1b504d61cfded7`, 56 commits à frente / 0 atrás de master. Validate [42189479021](https://github.com/Reekyi/UpStatus/actions/runs/42189479021) falhou em `production updateURL mismatch`, herdado do baseline de build/validação. Não enfraquecer o validador para contornar essa divergência.
- Todos os PRs #74, #75, #76 e #82 permanecem abertos, Draft e sem merge. Reviews humanas submetidas: zero; threads de revisão: zero nos PRs inspecionados.

### Paridade de recuperação: avanço no Team Lite, dois gates ainda abertos no Normal

O Team Lite #76 agora porta o protocolo de logical call attempt do Normal:
- persiste o logical call ID por membro, sem token, antes do primeiro prepare;
- usa `/room/prepare-call` e `/room/cancel-call`;
- cancela por logical ID mesmo quando o navegador não recebeu o room ID;
- restaura/reexecuta cancelamento após autenticação/reconexão;
- faz fail-closed se o GM Storage falhar antes da chamada;
- persiste o room-ID leave handle do destinatário antes de aceitar convite autenticado;
- não aceita o convite se essa persistência falhar;
- tenta cancelar logical attempts restauradas antes de leaves e logout.

Os testes do Candidate Checks exato passaram, inclusive os cenários de storage failure do criador e do destinatário, pagehide com room ID desconhecido, retry offline e logout com cancelamento não confirmado.

**Gate Normal N-LOGOUT ainda aberto:** o HEAD #74 `0ff4ef9` mantém no handler de logout a expressão que, quando `upCall.active=false`, tenta somente `signalRetryPendingCallLeaves()`. Isso ignora logical call attempts restauradas sem chamada ativa. O commit lateral [cf99b1b](https://github.com/Reekyi/UpStatus/commit/cf99b1b14f69b1caf6606684d2d42f9898f03a1e) corrige o fluxo e adiciona regressão, mas está exatamente 1 commit à frente de #74 e ainda não integra o PR. Seu Validate [42195926899](https://github.com/Reekyi/UpStatus/actions/runs/42195926899) falhou porque o validador reteve a asserção antiga `normal logout must await confirmed authenticated call-room release before clearing credentials`; o Smoke [42195926855](https://github.com/Reekyi/UpStatus/actions/runs/42195926855) estava IN_PROGRESS na última consulta. Não declarar a correção aprovada até ajustar a asserção ao novo contrato sem enfraquecer a validação e obter CI exato verde.

**Gate Normal N-RECIPIENT-STORAGE ainda aberto:** em `src/userscript/upstatus.user.template.js`, `callAcceptGroupInvite()` chama `signalTransport.accept(signalRoomId)` sem primeiro exigir `signalTrackPendingCallLeave()`. O cleanup posterior cria o registro e chama `signalPersistPendingCallLeaves()`, mas não bloqueia se a gravação falhar. Assim, um participante Normal pode entrar na membership autenticada sem handle durável caso GM Storage falhe. O Team Lite já tem o guard e teste correspondente. Portar o mesmo fail-closed para o Normal e testar aceitação de destinatário com `GM_setValue` lançando exceção. Referências: [Normal callAcceptGroupInvite](https://github.com/Reekyi/UpStatus/blob/0ff4ef9a50c79717250d9eed7e60ed85fa9c8a41/src/userscript/upstatus.user.template.js#L2482-L2505), [Team Lite callAcceptGroupInvite](https://github.com/Reekyi/UpStatus/blob/5cc5df4865250a0d67935937ea43e206217730d5/team-lite/upstatus-team-lite.user.js#L3038-L3065), [Team Lite regressões de destinatário](https://github.com/Reekyi/UpStatus/blob/5cc5df4865250a0d67935937ea43e206217730d5/scripts/team-lite-candidate-check.mjs#L1175-L1214).

### Call-attempt schema e endpoint isolado

Projeto isolado `bfpjtfqlnypisxljoxkb`:
- ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, região sa-east-1;
- 23 migrations, incluindo `20261106082526_call_room_attempt_recovery` e `20261106082546_call_room_attempt_recovery_test`;
- Edge Function `upstatus-signal-test` ACTIVE v29;
- `upstatus_signal_call_attempts` existe, RLS ativo, zero policies, sem SELECT/INSERT para anon/authenticated e acesso de service_role;
- `prepare_upstatus_signal_call_room(text,text,text)` e `cancel_upstatus_signal_call_room(text,text)` são SECURITY INVOKER, `search_path` vazio, EXECUTE negado a anon/authenticated e permitido a service_role.

A consulta SELECT-only após o Candidate Checks Team Lite confirmou zero fixtures residuais: rooms 0, members 0, bindings 0, events 0, call attempts 0 e rate-limit buckets 0. O workflow terminou SUCCESS e seu log confirmou cleanup. Nenhuma suíte adicional foi iniciada pela auditoria.

O endpoint isolado integra `consume_upstatus_signal_rate_limit`; os testes de concorrência e 90+1 passaram. `Retry-After` continua ausente. O teste Normal Smoke cobre a corrida real de prepare/cancel e tombstone no endpoint compartilhado; o Candidate Checks Team Lite cobre o adapter/cliente por harness e VM, mas o harness HTTP autenticado específico do Team Lite ainda conserva cenários legados create/bind. Manter a cobertura de integração Team Lite com prepare/cancel como gate explícito ou documentar formalmente que a validação do endpoint compartilhado é fornecida pelo Smoke Normal no mesmo artefato/endpoint.

### Produção Supabase: bloqueadores confirmados por catálogo e Advisor

Projeto `dlfvkawaiqduhlazsszm`:
- ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, us-west-2;
- sete migrations até `20261027155438`;
- 38/38 Edge Functions ACTIVE, todas com `verify_jwt=false`;
- produção ainda não possui `upstatus_signal_call_attempts`, RPCs prepare/cancel, tabela/RPC de rate limit, RPCs open/leave de sala, `merge_chat_read_receipts` nem Edge Function dedicada `upstatus-signal`.

Inspeção read-only de fontes das Edge Functions `upstatus` e `upstatus-team-lite` confirmou autenticação própria por `x-upstatus-token` e `timingSafeEqual`; `verify_jwt=false` isoladamente não prova ausência de autenticação. Os bundles implantados não contêm prepare/cancel de logical call attempt, rate-limit distribuído, merge de read receipts nem `Retry-After`. SHAs: Normal `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`; Team Lite `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`; Screen Share beta10 `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`.

Catálogo PostgreSQL:
- nove tabelas backend-owned mantêm SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN para anon/authenticated; todas com RLS ativo e zero policies;
- `upstatus_visual_config` tem RLS e zero policies, sem grants de tabela para anon/authenticated;
- `realtime.messages` tem RLS, zero policies e SELECT/INSERT/UPDATE para anon/authenticated;
- três funções `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()` e `upstatus_broadcast_users()` seguem SECURITY DEFINER, `search_path=public`, EXECUTE para anon/authenticated e triggers habilitados;
- `upstatus_broadcast_messages()` continua serializando OLD/NEW completos com `to_jsonb` e chamando `realtime.send(..., 'db_change', ..., false)`. RT-01 continua bloqueador crítico;
- os defaults globais de EXECUTE para funções incluem PUBLIC para postgres e supabase_admin; postgres não é superuser e não é membro de supabase_admin, portanto não pode corrigir os defaults pertencentes a esse proprietário pela sessão atual.

Security Advisor atual: 3 WARN para SECURITY DEFINER executável por anon, 3 WARN para authenticated e 10 INFO para RLS sem policy. Performance Advisor sem findings. ACL-02 e RT-01 permanecem bloqueados.

### Issues, validação manual e gates

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) continua aberta, 21 comentários; os oito critérios de aceitação física permanecem pendentes. Testar Tampermonkey instalado, offline/online por 10 segundos, fechamento/reload offline, recuperação sem F5, microfone/display reais e interoperabilidade instalada Normal ↔ Team Lite.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) continua aberta, 74 comentários; o corpo principal permanece na fotografia antiga de 3 de novembro e precisa ser atualizado pela engenharia/release owner.

Próximos gates em ordem:
1. Integrar N-LOGOUT ao #74 e obter Validate + Smoke exatos verdes.
2. Portar N-RECIPIENT-STORAGE ao Normal e testar falha de GM Storage antes de aceitar membership.
3. Manter #76 com seu Candidate Checks exato verde e ampliar o harness HTTP Team Lite para prepare/cancel ou formalizar a cobertura compartilhada.
4. Completar os testes físicos da #78.
5. Integrar rate limit nos endpoints reais e implementar `Retry-After`.
6. Resolver RT-01 com cutover autenticado coordenado, compatível com o token próprio do UpStatus.
7. Resolver ACL-02 por caminho administrativo autorizado e ensaiar least-privilege no TEST com rollback.
8. Auditar consumidores/rollback das Edge Functions antigas, atualizar #79 e obter reviews humanas.
9. Manter #74/#76 Draft. Sem release enquanto segurança de produção, CI exato, teste físico e rollout coordenado não forem aprovados.

### Registro de segurança desta rodada

Todas as consultas SQL desta rodada foram SELECT-only e de catálogo/contagens. A primeira consulta de catálogo falhou por qualificar incorretamente `realtime.messages` como `public.realtime.messages`; foi corrigida para o schema `realtime` e não realizou qualquer escrita. Uma consulta de contagem incluiu dois nomes de tabelas de fixtures inexistentes e falhou sem mutação; a consulta subsequente usou somente as seis tabelas confirmadas e encontrou zero resíduos. O Candidate Checks Team Lite foi iniciado pela engenharia/GitHub e inspecionado read-only; a auditoria não iniciou testes mutáveis. Nenhuma produção write, migration, deploy, secret/flag/role change, merge, release, publicação de userscript ou operação destrutiva ocorreu. A única escrita desta rodada é este append documental nesta branch QA dedicada.


## Auditoria independente — 2026-11-06 07:29 BRT (voice-room durability e revalidação exata)

Este checkpoint foi preparado após nova leitura do PR #82 e do blob atual de `docs/RELEASE_READINESS.md`. PR #82 estava aberto/Draft, sem merge, na branch `qa/release-readiness-2026-11-04-master`; o blob usado como precondição foi `3d681f0e67a3d7e52565fbf22eb96961acf9196d`. A atualização abaixo altera somente este Markdown na branch QA. Se o arquivo tiver sido alterado concorrentemente, a atualização por SHA deve falhar em vez de sobrescrever a edição.

### Heads reais, ancestry e CI

Todos os PRs #74, #75, #76 e #82 permanecem abertos, Draft, não mesclados e mergeable. Consultas atuais de reviews e inline review threads retornaram zero em todos os quatro PRs.

- **Normal #74** — `chore/continuity-foundation`, HEAD `18201b01f875d1ab5d3706e4e35f07ab23ed1c86`, 700 commits ahead / 0 behind `master`. Validate [42200054443](https://github.com/Reekyi/UpStatus/actions/runs/42200054443) e Signaling Smoke [42200054440](https://github.com/Reekyi/UpStatus/actions/runs/42200054440) concluíram SUCCESS no SHA exato. O Smoke terminou 116/116 verificações autenticadas, integração HTTP de prepare/cancel/tombstone, negociação WebRTC call/voice/screen com tracks remotas, mesh de três participantes, rate limit 90 aceitas + 1 HTTP 429, concorrência do rate limiter e read receipts atômicos. O log confirma os testes Normal de persistência do call ID antes do prepare, falha de GM Storage bloqueando criação, recuperação de room ID desconhecido, logout bloqueado por cancelamento lógico não confirmado e aceitação do destinatário fail-closed antes de aceitar membership.
- **Team Lite #76** — `team-lite/signaling-transport-candidate`, HEAD `5cc5df4865250a0d67935937ea43e206217730d5`, 208 ahead / 0 behind `team-lite-official`, 149 ahead / 0 behind #75. Candidate Checks exato [42194948317](https://github.com/Reekyi/UpStatus/actions/runs/42194948317) concluiu SUCCESS. O log confirma 103/103 checks autenticados, WebRTC call/voice/screen, mesh de três membros, retry/logout gate, pagehide/reload de call rooms, logical call ID persistido antes do prepare, storage-failure fail-closed para criador e destinatário, rate limit 90+1, concorrência de rate limit/read receipts e cleanup.
- **Team Lite baseline #75** — HEAD `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`, 59 ahead / 0 behind `team-lite-official`. Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) continua sendo evidência histórica do baseline; #76 é o candidato de sinalização atual.
- **QA #82** — HEAD `a4b675bace4f94ce2e4fb961b3446ca55887b4d3`, 57 ahead / 0 behind `master`; um único caminho alterado, este Markdown. Validate [42196233886](https://github.com/Reekyi/UpStatus/actions/runs/42196233886) falhou com `production updateURL mismatch` em `scripts/validate.mjs:26`. A causa foi revalidada: em master, `scripts/build.mjs` usa o endpoint legado `upstatus-screen-share-3-1-1-beta10` como `cloud` e deriva dele o `updateUrl`; o validador exige `/functions/v1/upstatus/upstatus.user.js`. O build candidato de #74 separa API `cloud` de URL de publicação e lê `release.scriptUrl`. A falha de #82 é herdada do baseline master, não erro de Markdown; o validador não foi enfraquecido.
- Comparações atuais: #74 = 700/0 vs master; #76 = 208/0 vs team-lite-official e 149/0 vs #75; #82 = 57/0 vs master. Nenhum PR foi mesclado e nenhuma review humana foi registrada.

### Call-room logical attempts — gates anteriores agora fechados no CI exato

A inspeção dos arquivos atuais e os logs exatos confirmam que os dois gaps Normal identificados na rodada anterior foram corrigidos no HEAD #74:

1. **N-LOGOUT:** quando não há chamada ativa, o logout agora tenta `signalRetryPendingCallAttempts()` antes de `signalRetryPendingCallLeaves()`; só prossegue para voice-room leave, API logout e limpeza de credenciais após confirmação. A regressão `chat-regression.test.mjs` foi alinhada ao novo contrato e o Validate + Smoke do HEAD `18201b01` passaram.
2. **N-RECIPIENT-STORAGE:** `callAcceptGroupInvite()` agora exige `signalTrackPendingCallLeave(roomId, callId, transport)` antes de `signalTransport.accept(roomId)`. Se o armazenamento não aceitar a gravação, o convite permanece pendente e a membership não é aceita. O Smoke exato registra: “Normal recipient call acceptance fails closed without durable leave storage and persists before accept.”

O Team Lite #76 já tinha os dois gates e seu Candidate Checks exato permanece verde. A paridade de call-room logical attempts, storage fail-closed do destinatário e logout gate pode ser marcada como **AUTOMATED PASS** nos dois candidatos. Isso não cobre ainda a persistência da membership separada de voice room descrita abaixo.

### Novo gate funcional: voice-room leave ainda não é durável

**VOICE-ROOM-DURABILITY — CODE INSPECTION; MANUAL PENDING; não reproduzido fisicamente.**

Os dois userscripts atuais ainda não possuem marcador persistente para membership de sala de voz:

- Normal `signalPrepareVoiceRoom()` chama `signalTransport.openVoiceRoom(voiceRoom.id)` e só depois da resposta grava `signalVoiceRoomRoomId = opened.roomId` em memória.
- Team Lite faz a mesma sequência.
- Não há `signalPendingVoiceRoom`, storage key, persistência token-free de logical ID/membro/timestamp ou restore/retry pós-autenticação. A inspeção de ambos os arquivos não encontrou marcador durável de voice-room.
- O handler `pagehide` chama `voiceRoomLeave()`, mas não aguarda a Promise nem persiste um handle de recuperação.
- Os handlers `offline` chamam `voiceRoomLeave({skipServerLeave:true})` e interrompem o transporte/Realtime para encerrar mídia local sem depender da rede. Isso é adequado para não manter microfone/peers locais ativos, mas o room ID permanece apenas em memória. Se a página/processo for encerrado offline, a referência local desaparece sem confirmação de leave.

O efeito possível é uma membership de voice room abandonada no servidor até expiração/cleanup. O endpoint candidato define TTL de duas horas e cleanup best-effort por requisição; isso limita a duração, mas não prova saída imediata nem recuperação durável. Este achado é distinto do protocolo de call-room logical attempts, que já passou nos testes.

### Contrato existente que permite recuperação sem nova migration, sujeito a implementação/teste

A inspeção do adapter compartilhado, da migration candidata `20261105190000_open_voice_room_membership.sql` e do endpoint isolado v29 confirmou um caminho de recuperação já disponível no ambiente isolado:

- `open_upstatus_signal_voice_room(text,text,integer)` normaliza os aliases `upstatus-team-room-v1` e `upstatus-team-lite-room-v1`, usa advisory transaction lock, reutiliza o binding ativo e trata a reabertura pelo mesmo membro como idempotente.
- O endpoint autenticado `POST /room/open` chama essa RPC com o usuário derivado da sessão.
- `POST /room/resolve` só devolve o room ID se a sala estiver ativa e `isMember(roomId, sender)` confirmar membership aceita do usuário autenticado; caso contrário responde 404.
- A RPC `leave_upstatus_signal_room(text,text)` permite saída confirmada. No projeto isolado, open/leave são SECURITY INVOKER, `search_path` vazio, EXECUTE negado a anon/authenticated e permitido a service_role.

Desenho recomendado, ainda **não implementado nem testado**: persistir, antes de `openVoiceRoom`, um marcador por membro contendo somente `logicalId`, `member` e `createdAt` (nunca token). Se a escrita GM falhar, bloquear a abertura antes de criar/joinar membership. Após reautenticação, chamar `resolveRoom({bindingType:"voice", logicalId})`; se a membership ainda existir, executar leave e manter o marcador até confirmação. Remover o marcador somente após leave confirmado ou resolve retornar 404 terminal. Se o room ID já for conhecido, também pode ser persistido. Testar falha de resposta de `/room/open`, pagehide online/offline, reload offline, storage write failure, conta diferente, sala expirada, resolve 404, retry e aliases Normal ↔ Team Lite. Não manter mídia local aberta enquanto a limpeza remota aguarda.

O contrato acima foi confirmado **somente no projeto isolado**. Produção ainda não possui a RPC open/leave nem a Edge Function dedicada; portanto não há evidência de que esse fluxo esteja implantado no runtime oficial.

### Supabase produção — catálogo, privilégios e Advisor atuais

Projeto `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, região `us-west-2`, PostgreSQL `17.11.0.002`, sete migrations até `20261027155438`. Permanecem ausentes em produção: `upstatus_signal_call_attempts`, RPCs prepare/cancel, tabela/RPC de rate limit, `merge_chat_read_receipts`, RPCs open/leave voice-room e Edge Function dedicada `upstatus-signal`.

SELECT-only/catalog revalidou:
- Nove tabelas backend-owned em `public` têm RLS ativo, zero policies e os oito privilégios efetivos para anon/authenticated (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN). É uma superfície excessiva de privilégios, não prova de acesso às linhas enquanto RLS está ativo sem policies.
- `public.upstatus_visual_config` tem RLS e zero policies, sem grants de tabela para anon/authenticated.
- `realtime.messages` tem RLS, zero policies e SELECT/INSERT/UPDATE para anon/authenticated.
- `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()` e `upstatus_broadcast_users()` continuam SECURITY DEFINER, `search_path=public`, EXECUTE para anon/authenticated/service_role e triggers habilitados.
- O trigger `upstatus_messages_broadcast` dispara após INSERT/UPDATE/DELETE em `public.messages`. A função serializa OLD/NEW completos com `to_jsonb` e chama `realtime.send(...,'db_change',...,false)`. Conteúdo da mensagem e metadados de anexos continuam no broadcast público. **RT-01 permanece bloqueador crítico.**
- Default ACLs seguem amplos: postgres em `public`/`storage` e supabase_admin em `public`/`graphql`/`graphql_public`; os defaults globais de função incluem PUBLIC EXECUTE. A sessão é postgres, não superuser e não membro de supabase_admin. **ACL-02 permanece bloqueado** até caminho administrativo autorizado.
- Security Advisor observado em `2026-11-06T10:29:28Z`: 3 WARN para SECURITY DEFINER executável por anon, 3 WARN para authenticated e 10 INFO para RLS sem policy. Performance Advisor e Health Advisor de produção sem findings.

### Supabase isolado — schema, grants, Advisor e fixtures

Projeto `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, `sa-east-1`, PostgreSQL `17.11.0.003`, 23 migrations até `20261106082546`; `upstatus-signal-test` está ACTIVE v29.

As tabelas de sinalização, incluindo `upstatus_signal_call_attempts`, têm RLS ativo, zero policies, sem SELECT/INSERT para anon/authenticated e privilégios de service_role. As RPCs call prepare/cancel, rate limit, receipts e voice open/leave verificadas são SECURITY INVOKER, `search_path` vazio, EXECUTE negado a anon/authenticated e permitido a service_role.

Após os workflows existentes, consultas SELECT-only encontraram zero linhas em rooms, members, bindings, events, call attempts, rate-limit buckets, users, sessions, messages e chat_reads. Nenhuma limpeza manual foi executada.

Novo detalhe de performance no projeto isolado: o Performance Advisor observado em `2026-11-06T10:33:10Z` reportou três foreign keys sem índice cobridor em `upstatus_signal_call_attempts` (`created_by`, `recipient`, `room_id`). A migration atual cria a PK de `call_id` e índice de `expires_at`, mas não índices para essas três FKs. Avaliar índices adequados antes de produção/volume, especialmente para deletes/cascades e lookup por room/recipient. O Advisor também marcou quatro índices antigos como unused; com as fixtures zeradas, não remover esses índices sem evidência de carga/uso. Security Advisor isolado retornou 16 INFO de RLS habilitado sem policy, incluindo as seis tabelas server-owned de sinalização; não houve WARN SECURITY DEFINER. Health Advisor isolado sem findings.

O endpoint isolado v29 chama `consume_upstatus_signal_rate_limit`, mas a resposta HTTP 429 ainda não inclui `Retry-After`. Os templates reais de produto ainda não integram o RPC de rate limit; produção também não possui a tabela/RPC. Rate limiting segue **isolated candidate pass / product integration pending**.

### Edge Functions, deploy e issues

- Produção lista 38/38 Edge Functions ACTIVE, todas com `verify_jwt=false`. Isso não prova ausência de autenticação da aplicação: os runtimes principais `upstatus` v480 e `upstatus-team-lite` v15 usam `x-upstatus-token` e comparação timing-safe. Seus bundles implantados não contêm logical call attempts, voice-room durable marker, RPC de rate limit, merge de read receipts ou `Retry-After`. A função dedicada `upstatus-signal` permanece ausente.
- O mapeamento individual de rota/auth/consumidor/rollback das funções antigas ainda está incompleto. O backup `upstatus-backup-327-pre328` permanece ACTIVE v1 com entrypoint vazio; nenhuma função foi invocada ou desativada.
- Master deploy ainda usa Supabase CLI `latest` e não tem todas as verificações de branch/SHA/project do workflow candidato #74. O workflow candidato fixa SHA/branch/project e CLI `2.122.1`, mas só implanta Normal e ainda não está ativo em master.
- [#78](https://github.com/Reekyi/UpStatus/issues/78) permanece aberta, 22 comentários, 8/8 critérios de aceite desmarcados. O comentário de engenharia [6682414062](https://github.com/Reekyi/UpStatus/issues/78#issuecomment-6682414062) descreve o desenho open/resolve/leave, mas declara explicitamente que marcador durável ainda não foi implementado nem testado. Teste físico Tampermonkey offline/reload/no-F5, microfone/display reais e interoperabilidade instalada continuam **MANUAL PENDING**.
- [#79](https://github.com/Reekyi/UpStatus/issues/79) permanece aberta, 75 comentários; o corpo principal ainda mostra a fotografia de 2026-11-03. O corpo contém 35 checkboxes, 16 marcados e 19 pendentes. Atualizar pela engenharia/release owner antes de usá-la como fonte de verdade.

### Próximos gates

1. Implementar marcador token-free de voice-room antes de `openVoiceRoom`, restore via `resolveRoom` e leave confirmado em Normal e Team Lite; testar storage failure e resposta perdida de open.
2. Completar os testes físicos de #78: queda de rede de ~10 s, reentrada sem F5, reload offline, permissões reais e interoperabilidade instalada.
3. Avaliar índices para as três FKs de `upstatus_signal_call_attempts` antes de promover a migration; não remover índices apenas por advisor em fixture vazia.
4. Integrar rate limit aos endpoints reais e adicionar/testar `Retry-After`.
5. Resolver RT-01 com cutover autenticado coordenado e resolver ACL-02 por caminho administrativo autorizado.
6. Ensaiar migrations/rollback no TEST oficial; mapear consumidores/rollback das Edge Functions antigas; atualizar #79; obter reviews humanas.
7. Manter #74/#76 Draft. Não liberar enquanto RT-01, ACL-02, voice-room durable recovery, aceitação física e cutover coordenado permanecerem pendentes.

### Registro de segurança desta rodada

Todas as consultas SQL bem-sucedidas foram SELECT-only/catalog/contagens. Uma consulta diagnóstica de default ACL falhou por alias SQL incorreto e não alterou estado; a consulta corrigida foi somente leitura. Não foram executados scripts de teste, workflows ou mutações de fixtures pela auditoria. Os workflows #74/#76 foram iniciados pela engenharia/GitHub e seus logs foram inspecionados read-only. Nenhuma escrita em produção, migration, deploy/invocação de Edge Function, secret/flag/role change, merge, release, publicação de userscript ou operação destrutiva ocorreu. A única escrita desta rodada é este append documental na branch QA dedicada. Não declarar percentual de conclusão.


## Auditoria independente — 2026-11-06 08:33 BRT (revalidação de CI, índices e voice-room)

Este checkpoint começa pela leitura do próprio `docs/RELEASE_READINESS.md` na branch QA. O blob imediatamente anterior à atualização foi `09b0d7dd79bd19f546d1c646e023c21a85b11b28`. A escrita abaixo é somente neste arquivo e nesta branch; o SHA do conteúdo é usado como precondição para impedir sobrescrita de edição concorrente.

### Heads reais, ancestry e CI

As quatro PRs solicitadas permanecem abertas, Draft, não mescladas e mergeable. Reviews submetidas e inline review threads continuam zeradas em #74, #75, #76 e #82.

- **Normal #74** — `chore/continuity-foundation`, HEAD `3ed7b9d6e3fbe7ab77a285201eea2f96d941316f`, 703 commits ahead / 0 behind `master`. Validate [42207304139](https://github.com/Reekyi/UpStatus/actions/runs/42207304139) e Signaling Smoke [42207304173](https://github.com/Reekyi/UpStatus/actions/runs/42207304173) concluíram SUCCESS no SHA exato. O Smoke terminou 17/17 verificações não autenticadas e 116/116 autenticadas. Logs confirmam prepare/cancel por logical call ID, tombstone contra prepare atrasado, serialização de corrida prepare/cancel, WebRTC call/voice/screen com tracks remotas, mesh de três participantes, teardown, rate limit 90 aceitas + 1 HTTP 429, concorrência do rate limiter e read receipts atômicos. Também passaram regressões de voice offline/realtime readiness/leave retry, membership leave sem confirmação, falha de join de voz, logout com retenção de sessão, pagehide/reload de call rooms, storage failure antes do prepare e recipient fail-closed.
- **Team Lite #76** — `team-lite/signaling-transport-candidate`, HEAD `5cc5df4865250a0d67935937ea43e206217730d5`, 208 ahead / 0 behind `team-lite-official`, 149 ahead / 0 behind #75. Candidate Checks [42194948317](https://github.com/Reekyi/UpStatus/actions/runs/42194948317) concluiu SUCCESS: 15/15 não autenticadas, 103/103 autenticadas, WebRTC call/voice/screen, mesh de três membros, rate limit 90+1, concorrência de rate limit/read receipts, updater/portal/version checks, falhas GM Storage, recipient fail-closed, logout gate e cleanup. O log também cobre sequenciamento de voice leave, preservação do contexto durante offline/online e teardown local offline; isso não equivale a persistência voice-room após unload completo.
- **Team Lite baseline #75** — HEAD `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`, 59 ahead / 0 behind `team-lite-official`. Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) é aprovação histórica do baseline; #76 é a linha atual de sinalização.
- **QA #82** — HEAD `aec1192cbec2da61d2dacb62b83f308b2d2f8903`, 58 ahead / 0 behind `master`, um único caminho alterado. Validate [42203746245](https://github.com/Reekyi/UpStatus/actions/runs/42203746245) falhou em `production updateURL mismatch` (`scripts/validate.mjs:26`). A causa foi revalidada no código: em master, `scripts/build.mjs` deriva `updateUrl` de `cloud`, que aponta para o runtime legado `upstatus-screen-share-3-1-1-beta10`; o validador exige `/functions/v1/upstatus/upstatus.user.js`. `release.json` já contém a URL correta, e o build candidato #74 separa o endpoint de API da URL de publicação via `release.scriptUrl`. A falha é herdada do baseline master, não do Markdown. O validador não foi enfraquecido.

Links e estados foram conferidos por refs reais, workflow runs, jobs e logs. Nenhuma suíte foi disparada pela auditoria.

### Voice-room durability — bloqueador funcional ainda aberto

**CODE INSPECTION; MANUAL PENDING; não reproduzido fisicamente.** A leitura dos userscripts nos heads atuais confirma que o problema continua nos dois produtos:

- Normal, blob `bf65750581961b3a4bf78259de3f9f22ad710742`: `signalPrepareVoiceRoom()` aguarda `openVoiceRoom(voiceRoom.id)` e só depois grava `signalVoiceRoomRoomId` em memória. Não há `signalPendingVoiceRoom`, storage key ou marcador pré-open token-free.
- Team Lite, blob `186226bb68e48409ec98ef3362ebeb4d0e8fc20e`: mesma dependência do room ID retornado e ausência de marcador persistente.
- Adapter compartilhado, blob `e33e5bca2a984bc1849401e853290e1edddc2fc7`, já expõe `openVoiceRoom` e `resolveRoom`; o contrato existe, mas os clientes não o usam para restaurar membership após unload.
- Os handlers `offline` executam `voiceRoomLeave({skipServerLeave:true})` e interrompem o transporte/Reatime para parar mídia local sem depender da rede. O handler `pagehide` chama `voiceRoomLeave()` em fire-and-forget; não aguarda confirmação remota. Após fechar a página offline, a referência em memória desaparece e a membership pode permanecer até TTL/cleanup (TTL de sala observado: duas horas).

A solução candidata não exige nova migration com a evidência atual: o endpoint isolado v29 já oferece `POST /room/open`, `POST /room/resolve` e `POST /room/leave`; `resolve` verifica membership aceita do usuário autenticado antes de devolver o room ID. Desenho recomendado, ainda não implementado/testado: persistir antes de `/room/open` um marcador por membro contendo apenas logical ID, member e timestamp; falha de GM Storage deve bloquear a abertura; após reautenticação, resolver pelo mesmo logical ID e executar leave autenticado; remover o marcador somente após leave confirmado ou 404 terminal. Nunca persistir token. Cobrir resposta perdida de open, pagehide online/offline, reload offline, conta diferente, expiração, storage failure, retry e ausência de mídia local órfã.

[Issue #78](https://github.com/Reekyi/UpStatus/issues/78) continua aberta, 22 comentários e 0/8 critérios de aceite marcados. O comentário de engenharia [6682414062](https://github.com/Reekyi/UpStatus/issues/78#issuecomment-6682414062) descreve corretamente o contrato open/resolve/leave, mas declara que o marcador ainda não foi implementado/testado. Os testes automatizados de offline/realtime readiness no Smoke verificam recuperação enquanto o contexto permanece vivo; não provam recuperação após fechar/recarregar a página.

### Supabase produção — catálogo e segurança atuais

Projeto `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL `17.11.0.002`, sete migrations até `20261027155438`, 38 Edge Functions ACTIVE.

Ausentes em produção: `upstatus_signal_call_attempts`, `upstatus_signal_rate_limits`, RPCs prepare/cancel, rate-limit, read-receipt merge e voice-room open/leave, além da Edge Function dedicada `upstatus-signal`.

SELECT-only/catalog confirmou:

- Nove tabelas backend-owned (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) têm RLS ativo, zero policies e os oito privilégios efetivos para anon/authenticated: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN. Isso é superfície excessiva de privilégios; não prova acesso às linhas enquanto RLS está ativo sem policies.
- `upstatus_visual_config` tem RLS/zero policies e nenhum grant de tabela para os papéis cliente.
- `realtime.messages` tem RLS, zero policies e SELECT/INSERT/UPDATE efetivos para anon/authenticated.
- `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()` e `upstatus_broadcast_users()` continuam SECURITY DEFINER, `search_path=public`, EXECUTE para PUBLIC/anon/authenticated/service_role. Os três triggers estão habilitados.
- `upstatus_broadcast_messages()` serializa OLD/NEW completos com `to_jsonb` e chama `realtime.send(...,'db_change',...,false)`. A tabela `messages` contém `message`, `image_url`, `mentions`, `reply_to`, `reactions` e `file_name`; portanto o payload público inclui conteúdo e metadados de anexos. **RT-01 permanece bloqueador crítico.**
- Default ACLs continuam amplos para postgres em `public` e `storage`, e para supabase_admin em `public`, `graphql`, `graphql_public`. A sessão é postgres, não superuser e não membro de supabase_admin; não tem autoridade para corrigir os defaults desse proprietário.
- Security Advisor observado em `2026-11-06T11:33:49Z`: 3 WARN para SECURITY DEFINER executável por anon, 3 WARN para authenticated e 10 INFO de RLS sem policy. Performance e Health Advisor de produção sem findings.

### Supabase isolado — índices, grants e provenance

Projeto allowlisted `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL `17.11.0.003`, 25 migrations até `20261106110221`; `upstatus-signal-test` ACTIVE v29, SHA `0593e8a5245358ece4473cd7504b699adff20372311e43923cde60b19c6808b1`.

As seis tabelas de sinalização verificadas têm RLS ativo, zero policies, sem SELECT/INSERT para anon/authenticated e privilégios de service_role. As seis RPCs de call attempts, rate limit, receipts e voice-room verificadas são SECURITY INVOKER, `search_path` vazio, EXECUTE negado a anon/authenticated e permitido a service_role.

A correção de performance dos call attempts agora está presente no schema isolado: PK em `call_id`, índice em `expires_at` e índices B-tree cobrindo `created_by`, `recipient` e `room_id`; as três FKs foram confirmadas. O Performance Advisor atual não reporta mais foreign keys sem índice; restam quatro avisos INFO de índices antigos unused (`messages_created_at_idx`, `status_history_created_at_idx`, `upstatus_sessions_expiry_idx`, `idx_users_client_seen_at`). Como as fixtures estão vazias, não remover esses índices sem evidência de carga. Security Advisor isolado: 16 INFO de RLS sem policy, sem WARN SECURITY DEFINER; Health Advisor sem findings.

A migration candidata no PR #74 é `supabase/migrations/20261106111000_call_attempt_foreign_key_indexes.sql` (blob `ae3c2f3d14bf8eeb4a9db08c7899535fdb834f5c`), com teste `supabase/test-migrations/20261106111000_call_attempt_foreign_key_indexes_test.sql` (blob `4587d38f3262b43767c05340808fd2538c9761c3`). A história do projeto isolado registra versões locais `20261106110214` e `20261106110221` para os objetos/teste de índices. O schema foi verificado, mas não afirmo que o arquivo versionado `20261106111000` foi aplicado pelo Supabase CLI com o mesmo version ID. Reconciliar lineage e validar o arquivo exato no TEST oficial antes de promover.

Contagens SELECT-only pós-CI no projeto isolado: rooms 0, members 0, bindings 0, events 0, call attempts 0 e rate-limit buckets 0. Nenhuma limpeza manual foi executada.

O hardening de default ACL no projeto isolado é parcial: defaults de postgres global para funções e no schema public estão restritos a postgres/service_role; storage ainda mantém defaults amplos; defaults de supabase_admin em public/graphql/graphql_public continuam amplos. A sessão postgres não é superuser nem membro de supabase_admin.

### Rate limit, read receipts e Edge Functions

O endpoint isolado v29 usa `consume_upstatus_signal_rate_limit`, tem evidência de CI 90 aceitas + 1 HTTP 429 e teste de concorrência; sua resposta 429 ainda não inclui `Retry-After`. Os templates de servidor Normal e Team Lite incluem `merge_chat_read_receipts`, mas não chamam `consume_upstatus_signal_rate_limit`. Em produção, ambas as RPCs e a tabela de rate limit continuam ausentes.

Produção lista 38/38 Edge Functions ACTIVE, todas com `verify_jwt=false`. Isso não prova ausência de autenticação própria: as funções core `upstatus` v480 (SHA `bb2713ce...`) e `upstatus-team-lite` v15 (SHA `2c13414a...`) validam `x-upstatus-token` e usam `timingSafeEqual`. `upstatus-test` está v281 (SHA `7b5dfb12...`); screen-share beta10 está v6 (SHA `f6c5f8a4...`). Os bundles implantados core não contêm rotas open/resolve/leave, rate-limit RPC, merge de read receipts ou `Retry-After`. O endpoint isolado v29 contém open/resolve/leave e rate-limit RPC; não contém `Retry-After`.

O workflow deploy em master usa Supabase CLI `latest`, não fixa branch/SHA/project ID no próprio job e implanta somente `upstatus`. O workflow candidato #74 valida `refs/heads/master`, checkout SHA igual a `GITHUB_SHA`, project ID fixo `dlfvkawaiqduhlazsszm`, token presente e CLI `2.122.1`; ainda implanta somente Normal e não está ativo em master. Nenhum deploy foi executado.

### Issues e gates manuais

- [#78](https://github.com/Reekyi/UpStatus/issues/78): aberta, 22 comentários, 0/8 checkboxes; teste físico offline/online sem F5, voice-room, call, áudio/microfone/display reais e compatibilidade instalada continuam MANUAL PENDING.
- [#79](https://github.com/Reekyi/UpStatus/issues/79): aberta, 75 comentários, 16/35 checkboxes marcados; o corpo mantém RT-01, testes físicos, migrations/cutover, issues #24/#16 e revisão final pendentes. A fotografia do corpo não acompanha integralmente o CI mais recente e precisa ser atualizada pelo release owner.

### Próximos gates

1. Implementar marcador voice-room token-free pré-open em Normal e Team Lite, restore via resolve e leave confirmado; cobrir resposta perdida de open e falha do GM Storage.
2. Executar aceitação física de #78 em ambos os userscripts instalados, inclusive reload offline/no-F5 e permissões reais.
3. Reconciliar o versionamento da migration de índices e validar o arquivo exato no TEST oficial com plano de rollback.
4. Integrar rate limit distribuído aos endpoints reais e implementar/testar `Retry-After`.
5. Resolver RT-01 por cutover autenticado coordenado; resolver ACL-02 por caminho administrativo autorizado.
6. Validar migrations de grants/Realtime/read receipts no TEST oficial; mapear consumidores e rollback das 38 Edge Functions antigas.
7. Atualizar #79, obter reviews humanas e manter #74/#76 Draft até todos os gates de segurança, CI, teste físico e cutover estarem aprovados.

### Registro de segurança desta rodada

Todas as consultas SQL bem-sucedidas foram SELECT-only, de catálogo, privilégios, definições e contagens. Uma consulta de diagnóstico inicial falhou por incompatibilidade de tipos em UNION; foi corrigida e não realizou escrita. Não foram executados scripts, workflows ou mutações de fixtures pela auditoria. Os workflows #74/#76 foram iniciados pela engenharia/GitHub e inspecionados read-only. Nenhuma escrita em produção, migration, deploy/invocação de Edge Function, alteração de secret/flag/role, merge, release, publicação de userscript ou operação destrutiva ocorreu. A única escrita desta rodada é este append documental nesta branch QA.


## Auditoria independente — 2026-11-06 09:30 BRT (revalidação do voice-attempt protocol e CI exato)

Este checkpoint foi iniciado pela leitura do próprio arquivo nesta branch. Antes da escrita, o HEAD QA foi confirmado como `b8aa9b0e162ff28d5d57f5bbadc98bb44268f0cb` e o blob do documento como `f631521cbd300080605f3334895e64828aac6bad`. A atualização abaixo usa esse blob como precondição; nenhuma branch de engenharia foi alterada.

### Heads reais, PRs, ancestry e reviews

As PRs #74, #75, #76 e #82 foram reconsultadas no GitHub. Todas permanecem abertas, Draft, não mescladas e mergeable.

| PR | Branch / HEAD exato | Ahead / Behind da base | Estado |
|---|---|---:|---|
| #74 Normal | `chore/continuity-foundation` / `2b2cc0d7d02299347d17e67244327d7a4d17efad` | 718 / 0 de `master` | Draft |
| #75 Team Lite baseline | `team-lite/3.4.31-guest-fixes` / `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 59 / 0 de `team-lite-official` | Draft |
| #76 Team Lite signaling | `team-lite/signaling-transport-candidate` / `5cc5df4865250a0d67935937ea43e206217730d5` | 208 / 0 de `team-lite-official`; 149 / 0 de #75 | Draft |
| #82 QA | `qa/release-readiness-2026-11-04-master` / `b8aa9b0e162ff28d5d57f5bbadc98bb44268f0cb` | 59 / 0 de `master` | Draft |

Reviews submetidas e inline review threads: **zero** em cada uma das quatro PRs. #75 continua sendo baseline histórico; #76 é o candidato Team Lite de sinalização.

### CI por SHA exato

- **Normal #74 — AUTOMATED PASS:** Validate [42217144822](https://github.com/Reekyi/UpStatus/actions/runs/42217144822) e Signaling Smoke [42217144765](https://github.com/Reekyi/UpStatus/actions/runs/42217144765) concluíram SUCCESS no HEAD `2b2cc0d7d02299347d17e67244327d7a4d17efad`. O Smoke registrou 18/18 verificações não autenticadas e 129/129 autenticadas. Passaram os cenários de call/voice/screen WebRTC com tracks remotas, mesh autenticada de três membros, teardown, rate limit 90 aceitas + 1 HTTP 429, concorrência do rate limiter e read receipts atômicos. O log inclui explicitamente cancel-before-open com tombstone, rejeição de open atrasado (HTTP 410), open idempotente, cancelamento de membership do próprio membro, preservação de outro membro, corrida concorrente open/cancel sem membership órfã e rejeição de replay entre aliases. Cleanup de usuários, sessões, salas, memberships e eventos foi confirmado. O job separado de Validate construiu `3.4.7 / TEST 3.4.7` e terminou com `Validation OK`.
- **Team Lite #76 — AUTOMATED PASS histórico do HEAD atual:** Candidate Checks [42194948317](https://github.com/Reekyi/UpStatus/actions/runs/42194948317) concluiu SUCCESS em `5cc5df4865250a0d67935937ea43e206217730d5`: 103/103 verificações autenticadas, WebRTC call/voice/screen, mesh de três membros, rate limit 90+1, concorrência de rate limit/read receipts, pagehide/reload de call rooms, falhas de GM Storage, recipient fail-closed, logout gate, offline/online context preservation e cleanup. Esse HEAD não contém o novo voice-attempt protocol introduzido no #74.
- **Team Lite #75 — AUTOMATED PASS histórico:** Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passou no baseline `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; não substitui a validação do #76.
- **QA #82 — BLOCKED por baseline master:** Validate [42211720970](https://github.com/Reekyi/UpStatus/actions/runs/42211720970) falhou em `scripts/validate.mjs` com `production updateURL mismatch`. A causa foi revalidada nos arquivos atuais: master deriva `updateUrl` de `cloud`, que aponta para o runtime legado `upstatus-screen-share-3-1-1-beta10`; `release.json` aponta para `/functions/v1/upstatus/upstatus.user.js`, que é o caminho exigido pelo validador. O build candidato #74 separa URL da API e `release.scriptUrl`, mas essa correção ainda não está em master. O PR #82 altera somente este Markdown; o validador não foi enfraquecido.

Os workflows #74/#76 foram iniciados pela engenharia/GitHub. A auditoria apenas leu os jobs e logs; não iniciou nem repetiu workflow.

### Voice-room attempts — backend candidato aprovado em isolamento, clientes ainda não integrados

A conclusão anterior precisa ser refinada. O protocolo server-side de tentativa durável **já existe no candidato Normal e passou pelos testes autenticados do endpoint isolado**. Isso ainda não equivale à recuperação end-to-end pelos userscripts.

**Código e schema candidatos:**
- Migration: [`20261106120500_voice_room_attempt_recovery.sql`](https://github.com/Reekyi/UpStatus/blob/chore/continuity-foundation/supabase/migrations/20261106120500_voice_room_attempt_recovery.sql), blob `2abab9e677b14673518e652d651d4be18a73ce94`.
- Test migration: [`20261106120500_voice_room_attempt_recovery_test.sql`](https://github.com/Reekyi/UpStatus/blob/chore/continuity-foundation/supabase/test-migrations/20261106120500_voice_room_attempt_recovery_test.sql), blob `98f9cbf85fb272bf699ad1ece1101110c51b5ebd`.
- Tabela `public.upstatus_signal_voice_room_attempts`: RLS ativo, zero policies, nenhum SELECT/INSERT para anon/authenticated, service_role com privilégios necessários; índices para PK `attempt_id`, `created_by`, `room_id` e `expires_at`.
- RPCs `open_upstatus_signal_voice_room_attempt` e `cancel_upstatus_signal_voice_room_attempt`: SECURITY INVOKER, `search_path = ''`, EXECUTE negado a anon/authenticated e permitido a service_role.
- O endpoint isolado aceita `attemptId` em `POST /room/open` e implementa `POST /room/cancel-open`. As RPCs serializam por attempt ID e alias lógico; cancel-before-open grava tombstone por sete dias, impedindo uma abertura atrasada; open-before-cancel remove somente a membership do autor da tentativa.
- O Smoke exato #74 validou o contrato HTTP e as corridas acima. Isso é **AUTOMATED PASS do backend isolado**, não teste físico de navegador.

**Gap de integração cliente confirmado por inspeção dos blobs atuais:**
- Normal userscript, blob `bf65750581961b3a4bf78259de3f9f22ad710742`: `signalPrepareVoiceRoom()` chama `openVoiceRoom(voiceRoom.id)` sem attempt ID; não contém `cancelVoiceRoomOpen`, marcador persistente de voice attempt ou recuperação/cancelamento por attempt ID.
- Adapter Normal, blob `d1a474957d5c59bb261e560cccf13addeb14976c`, já aceita attempt ID e expõe `cancelVoiceRoomOpen`; o teste unitário do adapter cobre nove assertions. O caller do userscript não utiliza essas APIs.
- Team Lite userscript, blob `186226bb68e48409ec98ef3362ebeb4d0e8fc20e`, e adapter embutido, blob `e33e5bca2a984bc1849401e853290e1edddc2fc7`, ainda chamam `openVoiceRoom(logicalId)` sem attempt ID e não possuem `cancelVoiceRoomOpen`.
- Templates de servidor candidatos Normal (`src/server/index.template.ts`, blob `226c08b34c2a73ef49e27f82bff404b4a1f8cdb8`) e Team Lite (`src/server/team-lite-index.template.ts`, blob `eec7684d36c3e2fc65a85bd212d3f1fb3bfa8f63`) não contêm o novo contrato `attemptId/cancel-open`. A rota está no Edge Function de teste isolado, não nos runtimes de produto.
- Portanto, o room ID continua em memória nos dois callers. Fechar a página offline ainda pode perder o handle da membership. A issue #78 permanece **MANUAL PENDING** e o novo protocolo não deve ser descrito como já entregue end-to-end.

### Supabase isolado — estado atual, segurança e lineage

Projeto `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL `17.11.0.003`, 27 migrations até `20261106120851`; `upstatus-signal-test` ACTIVE v31, SHA `c69cd21dc606f552aa93c1f423d1151db1cdead26c39c0167b92554e8b9e3310`.

SELECT-only confirmou:
- `upstatus_signal_voice_room_attempts` existe com RLS, zero policies e zero SELECT/INSERT para anon/authenticated; service_role possui SELECT/INSERT necessários.
- As duas RPCs de voice attempt são SECURITY INVOKER, search_path vazio, sem EXECUTE para anon/authenticated e EXECUTE para service_role.
- Os quatro índices esperados estão presentes.
- Após os workflows existentes: rooms 0, members 0, bindings 0, events 0, call attempts 0, voice attempts 0 e rate-limit buckets 0.

**Proveniência a reconciliar:** o repositório usa prefixo `20261106120500`, enquanto o histórico do banco isolado registra `20261106120844` (`voice_room_attempt_recovery`) e `20261106120851` (`voice_room_attempt_recovery_test`). O schema/contratos estão presentes e validados, mas o version ID exato do arquivo versionado não coincide com o histórico. Antes de promover, mapear o SQL aplicado ao arquivo/blob e impedir aplicação duplicada.

Security Advisor isolado: 17 INFO de RLS sem policy, sem WARN SECURITY DEFINER; Performance Advisor: quatro índices antigos unused, sem alerta atual de FK sem índice; Health Advisor sem findings. Não remover índices unused com base em fixtures vazias.

### Supabase produção — sem mudanças

Projeto `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL `17.11.0.002`, sete migrations até `20261027155438`, 38/38 Edge Functions ACTIVE.

Continuam ausentes em produção: `upstatus_signal_voice_room_attempts`, RPCs open/cancel voice attempt, call-attempt table/RPCs, rate-limit table/RPC, `merge_chat_read_receipts`, RPCs de voice-room e Edge Function dedicada `upstatus-signal`. Os runtimes core permanecem Normal v480 (SHA `bb2713ce...`) e Team Lite v15 (SHA `2c13414a...`); o endpoint de teste isolado v31 não é produção.

SELECT-only confirmou novamente:
- Nove tabelas backend-owned têm RLS ativo, zero policies e os oito privilégios efetivos para anon e authenticated (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN). Isso é superfície excessiva de grants; não prova acesso às linhas sob RLS sem policies.
- `upstatus_visual_config` não concede privilégios de tabela aos papéis cliente.
- `realtime.messages` tem RLS, zero policies e SELECT/INSERT/UPDATE para anon/authenticated.
- As três funções `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state` e `upstatus_broadcast_users` continuam SECURITY DEFINER, `search_path=public`, EXECUTE para anon/authenticated. O trigger de mensagens continua enviando OLD/NEW completos via `to_jsonb` para `realtime.send(..., false)`, no tópico público `db_change`. **RT-01 continua bloqueador crítico.**
- Default ACLs permanecem amplos para postgres em public/storage e supabase_admin em public/graphql/graphql_public. A sessão é postgres, não superuser e não membro de supabase_admin; não pode alterar os defaults desse proprietário.

Security Advisor produção observado em `2026-11-06T12:30:08Z`: três WARN de SECURITY DEFINER executável por anon, três WARN para authenticated e dez INFO de RLS sem policy. Performance e Health sem findings.

### Rate limit, receipts e Edge Functions

O endpoint isolado v31 usa `consume_upstatus_signal_rate_limit`; CI comprovou 90 aceitas + 1 HTTP 429 e concorrência. A resposta 429 ainda não inclui `Retry-After`. Os templates Normal/Team Lite contêm `merge_chat_read_receipts`, mas não chamam `consume_upstatus_signal_rate_limit`; produção não possui as RPCs/tabelas candidatas. Rate limit segue **isolated pass / product integration pending**.

Os bundles implantados de produção `upstatus` v480 e `upstatus-team-lite` v15 validam o token próprio `x-upstatus-token` com comparação timing-safe; `verify_jwt=false` no gateway não prova ausência de autenticação da aplicação. Entretanto, os bundles implantados não contêm voice-attempt open/cancel, rate-limit RPC, merge de receipts ou `Retry-After`. O inventário segue 38/38 funções ACTIVE; não foi invocada nem desativada nenhuma função.

### Issues, testes manuais e release

- [#78](https://github.com/Reekyi/UpStatus/issues/78) permanece aberta, 22 comentários e 0/8 critérios marcados. O teste físico de perda/retorno de rede sem F5, reload offline, voz, dispositivos reais e interoperabilidade instalada Normal ↔ Team Lite não foi executado nesta auditoria.
- [#79](https://github.com/Reekyi/UpStatus/issues/79) permanece aberta, 75 comentários e 16/35 checkboxes no corpo. A fotografia do corpo ainda é de 2026-11-03; release owner deve reconciliar o checklist com CI e bloqueadores atuais.
- O candidato Normal ainda valida como 3.4.7; a própria PR #74 exige bump deliberado de versão antes de sincronizar/publicar código candidato sob o mesmo número.
- Nenhum review humano foi submetido.

### Próximos gates

1. Portar o protocolo voice attempt para o caller Normal: gerar/persistir attempt ID token-free antes de open, falhar fechado se GM Storage falhar, cancelar em logout/pagehide/reconnect e limpar marcador só após confirmação terminal.
2. Portar migration/RPC, endpoint real, adapter e bundle ao Team Lite; manter igualdade adapter/bundle e paridade Normal/Team Lite.
3. Testar open perdido, cancel-before-open, open-before-cancel, corrida, account switch, storage failure, reload offline, logout e múltiplas abas nos dois clientes.
4. Integrar rate limit nos endpoints reais e adicionar/testar `Retry-After`.
5. Reconciliar lineage da migration voice attempt e validar migration/rollback no TEST oficial.
6. Resolver RT-01 com arquitetura autenticada compatível com o token próprio; resolver ACL-02 por caminho administrativo autorizado.
7. Atualizar #79, completar #78 em Tampermonkey real, obter reviews humanas, corrigir a validação herdada de updateURL em master e bump de versão Normal.
8. Manter #74/#76 Draft; não fazer merge, deploy, release ou publicação enquanto os gates acima permanecerem abertos.

### Registro de segurança desta rodada

Todas as consultas SQL bem-sucedidas foram SELECT-only/catalog/advisor/contagens. Os testes mutáveis vistos nos logs foram executados pelos workflows de engenharia no projeto isolado `bfpjtfqlnypisxljoxkb`, com guard de project ID e `UPSTATUS_SIGNAL_ALLOW_MUTATION=1`; a consulta posterior confirmou zero fixtures. A auditoria não iniciou workflows nem executou scripts mutáveis. Nenhuma escrita em produção, migration, deploy/invocação de Edge Function, alteração de secret/flag/role, merge, release, publicação de userscript ou operação destrutiva ocorreu. A única escrita desta rodada é este append documental na branch QA dedicada.


## Correção de fotografia — Normal voice-attempt client integrado no HEAD mais novo (2026-11-06 09:35 BRT)

A reconsulta final dos refs mostrou que a engenharia avançou #74 durante esta auditoria. A fotografia anterior deste documento, baseada em `2b2cc0d7`, foi supersedida por commits novos; este append registra o estado mais recente sem reescrever a história anterior.

### #74 Normal — HEAD e CI mais recentes

- HEAD/branch atual: `65cc0cb1e8f9baf5da8ef09890753df90ac27c65`, `chore/continuity-foundation`, 726 commits à frente / 0 atrás de master. PR continua aberta, Draft, não mesclada e mergeable.
- Commit [`eee06f9`](https://github.com/Reekyi/UpStatus/commit/eee06f9f4148d708167c02f3c5da57b41b75e253): alteração de tratamento de falha transitória de GM Storage; uma falha de escrita não marca permanentemente o storage como unhealthy, permitindo nova tentativa. O registro continua fail-closed antes de abrir a sala.
- Commit [`65cc0cb`](https://github.com/Reekyi/UpStatus/commit/65cc0cb1e8f9baf5da8ef09890753df90ac27c65): atualiza o contexto VM de logout e a asserção de Validate para o novo contrato de voice attempt.
- Validate exato [42218802820](https://github.com/Reekyi/UpStatus/actions/runs/42218802820): **AUTOMATED PASS** no HEAD `65cc0cb1...`.
- Signaling Smoke exato [42218802900](https://github.com/Reekyi/UpStatus/actions/runs/42218802900): **IN PROGRESS** na última consulta. Syntax/static harnesses e voice-attempt recovery test passaram; 18 checks não autenticados passaram; integração autenticada/browser ainda executava; rate-limit concurrency, read-receipt concurrency e cleanup aguardavam. Não declarar Smoke completo até conclusão.
- No HEAD anterior `eee06f9`, Validate [42218478638](https://github.com/Reekyi/UpStatus/actions/runs/42218478638) falhou porque o validador ainda procurava a condição literal antiga `if(signalVoiceRoomRoomId)`, enquanto o novo gate considera também `signalVoiceRoomAttemptId` e a lista de tentativas pendentes. Smoke [42218478649](https://github.com/Reekyi/UpStatus/actions/runs/42218478649) falhou no harness estático por falta de seed de `signalVoiceRoomAttemptId` no contexto VM. O commit `65cc0cb` atualizou ambos; Validate agora passa e o Smoke atual já passou pela etapa estática. Esses erros anteriores não devem ser apresentados como estado do HEAD atual.

### Normal — inspeção do novo fluxo cliente

No userscript Normal atual, blob `cf2284500ff583391a4e5e965df505fd99d3f08b`:
- `signalPrepareVoiceRoom()` primeiro tenta cancelar tentativas antigas; gera attempt ID membro-bound; persiste `attemptId/logicalId/member/createdAt` antes de chamar `openVoiceRoom(logicalId, attemptId)`; bloqueia a entrada se GM Storage falhar.
- Após open, confere geração da entrada e attempt ID retornado. Resposta perdida, erro ou cancelamento concorrente chama `cancelVoiceRoomOpen`; se não houver confirmação, mantém o registro para retry.
- Inicialização do transporte autenticado restaura os marcadores do mesmo membro antes de tentar cancelá-los.
- Offline encerra mídia local com `skipServerLeave`, mas mantém o attempt persistido; pagehide chama o leave/cancel, e o marcador durável cobre o encerramento antes da resposta.
- Logout aguarda voice leave e retry das tentativas; se a rede estiver offline ou restar membership/attempt não confirmado, mantém a sessão e não revoga as credenciais.
- O envelope persistido não contém token, é limitado a 20 entradas e rejeita membro divergente, logical ID inválido, ID malformado, timestamps futuros e registros com mais de sete dias.
- O teste novo `scripts/voice-room-attempt-recovery.test.mjs` (blob `b3065c85994c14d74164dd49ab505109a9c6418d`) cobre persist-before-open, restore do mesmo membro, cancel após reload sem room ID, isolamento de identidade, dados malformados/expirados/futuros, falhas de leitura/escrita, retry de rede, falha ao persistir remoção, não cancelar a sala ativa, ordem de inicialização e logout gate. A etapa estática que executa esse teste passou no Smoke atual; a integração HTTP/browser ainda está pendente.
- O adapter Normal blob `d1a474957d5c59bb261e560cccf13addeb14976c` expõe `openVoiceRoom(logicalId, attemptId)` e `cancelVoiceRoomOpen`.

**Classificação:** código Normal integrado por inspeção; unit/static harness PASS no HEAD atual; Validate PASS; Signaling Smoke ainda em execução; teste físico Tampermonkey continua pendente.

### Team Lite — paridade ainda não alcançada

PR #76 permanece no HEAD `5cc5df4865250a0d67935937ea43e206217730d5`, 208/0 de team-lite-official. Candidate Checks [42194948317](https://github.com/Reekyi/UpStatus/actions/runs/42194948317) continua sendo PASS para o escopo anterior de call rooms, voice WebRTC, leave sequencing, retry de room ID, storage fail-closed de call acceptance e logout. Não cobre o novo protocolo de voice attempts.

O bundle Team Lite blob `186226bb68e48409ec98ef3362ebeb4d0e8fc20e` e adapter embutido blob `e33e5bca2a984bc1849401e853290e1edddc2fc7` ainda chamam `openVoiceRoom(logicalId)`, sem attempt ID e sem `cancelVoiceRoomOpen`. Migration/RPC/route de voice attempt também não foram portadas ao branch #76. Portanto, não há paridade Normal/Team Lite para esse fluxo.

### Backend e limite de implantação

A migration/RPC de voice attempt e a rota `/room/cancel-open` foram validadas no projeto isolado pelo Edge Function `upstatus-signal-test` v31. O Smoke anterior no parent `2b2cc0d7` passou 129/129 authenticated checks, incluindo tombstone cancel-before-open, open atrasado HTTP 410, open/cancel concorrente sem membership órfã e cleanup. O Smoke atual `42218802900` é o primeiro a testar o novo client Normal junto desse backend e ainda não terminou.

O endpoint dedicado `upstatus-signal` continua ausente em produção; a função v31 é exclusivamente do projeto isolado. Os templates de servidor Normal/Team Lite não incluem a rota `cancel-open`. A migration não foi aplicada em produção. O Team Lite não tem o contrato novo. Portanto, não há release end-to-end.

O projeto isolado foi reconsultado antes do Smoke atual: 27 migrations até `20261106120851`, Edge v31; a contagem SELECT-only anterior ao run atual era zero em rooms, members, bindings, events, call attempts, voice attempts e rate limits. Como o Smoke atual estava usando o mesmo projeto, não foi feita nova contagem durante a execução para não confundir fixtures transitórias com cleanup final.

### QA #82 após o append anterior

HEAD QA permanece `5e46c2fc8f605fd8d1f7d76d162f56e35bca760b`, blob do documento `0cd4ccf1c5eb6d86eee34d1b32ab5f2820782c60` antes deste append, 60 commits à frente / 0 atrás de master. Validate [42218626049](https://github.com/Reekyi/UpStatus/actions/runs/42218626049) concluiu FAILURE com a mesma causa herdada `production updateURL mismatch`; master ainda constrói updateURL a partir do endpoint legado, enquanto `release.json` e o validador exigem `/functions/v1/upstatus/upstatus.user.js`. O candidato #74 separa `cloud` e `release.scriptUrl`. O validador não foi alterado para aceitar o caminho errado.

### Gates imediatos atualizados

1. Aguardar conclusão do Smoke [42218802900](https://github.com/Reekyi/UpStatus/actions/runs/42218802900) no HEAD Normal `65cc0cb1...`; confirmar integração autenticada, browser, rate-limit, receipts e cleanup.
2. Portar o contrato completo de voice attempts para Team Lite: migration/RPC, Edge route, adapter, bundle, persistência token-free, retry e logout gate; executar Candidate Checks no novo SHA.
3. Validar endpoint real dedicado no TEST e configurar o cutover sem apontar userscript de produção para `upstatus-signal-test`.
4. Fazer teste físico de offline/reload/no-F5 em Tampermonkey nos dois produtos.
5. Manter RT-01, ACL-02, rate-limit/Retry-After, migration lineage, bump de versão Normal, #79 e human reviews como gates de release.

Nenhuma branch de engenharia foi escrita pela auditoria. O HEAD QA e o blob foram reconsultados imediatamente antes desta atualização; a escrita usa o SHA do blob como precondição e preserva qualquer commit concorrente em outros arquivos.


## Auditoria independente - atualização pós-paridade de voice attempts (2026-11-06)

Esta seção supersede as fotografias anteriores de #74 e #76. Os refs foram consultados diretamente antes do registro.

### Heads reais e ancestralidade

| PR | Branch | HEAD atual | Ahead / behind |
|---|---|---|---:|
| #74 Normal | chore/continuity-foundation | 94513c106d42cb8d77ab9a1c11ff7c9bfa610ba6 | 735 / 0 de master |
| #76 Team Lite | team-lite/signaling-transport-candidate | bdd229de6214faa4e0d14ac4d82a5746191ed657 | 224 / 0 de team-lite-official |
| #75 baseline | team-lite/3.4.31-guest-fixes | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | 59 / 0 de team-lite-official |
| #82 QA | qa/release-readiness-2026-11-04-master | 3d9bcb3ac1375b4d5584fecb09c4c6dd6ed7a645 | 61 / 0 de master |

#76 está 166 commits à frente de #75 e zero atrás. Todos os PRs seguem abertos e sem merge. Reviews humanas submetidas: 0 em #74, #75, #76 e #82.

### #74 Normal - aprovação automatizada integral

- HEAD exato: 94513c106d42cb8d77ab9a1c11ff7c9bfa610ba6.
- Validate [42220452780](https://github.com/Reekyi/UpStatus/actions/runs/42220452780): SUCCESS.
- Signaling Smoke [42220452949](https://github.com/Reekyi/UpStatus/actions/runs/42220452949): SUCCESS.
- Logs confirmam 18/18 checks não autenticados e 129/129 autenticados.
- Aprovados: prepare/cancel por logical call ID, tombstone cancel-before-open, open atrasado, concorrência open/cancel, call/voice/screen WebRTC, áudio e vídeo remoto, mesh de três membros, rate limit 90 aceitas + 1 HTTP 429, concorrência do rate limiter, read receipts atômicos, recuperação de call rooms, voice-room attempt persistence, storage failure, recipient fail-closed, logout gate e cleanup.
- Classificação: AUTOMATED PASS no SHA exato. Teste físico Tampermonkey continua pendente.

### #76 Team Lite - protocolo de voice attempts portado, CI exato ainda bloqueado

O branch atual já contém a implementação cliente de voice-room attempts. Isso corrige a conclusão anterior de que o Team Lite ainda não tinha recebido o protocolo.

- Userscript Team Lite atual: blob 30964ad32cf0309776196dc5f9b0e2eaa8fd9fcf.
- Adapter compartilhado: blob d1a474957d5c59bb261e560cccf13addeb14976c.
- O cliente persiste attempt ID antes de /room/open, envia openVoiceRoom(logicalId, attemptId), cancela por cancelVoiceRoomOpen, restaura tentativas do mesmo membro, preserva o marcador offline e bloqueia logout enquanto houver saída não confirmada.
- O teste scripts/team-lite-voice-room-attempt-recovery.test.mjs passou no workflow mais recente, incluindo persist-before-open, cancel-before-open, reload retry, falha de GM Storage, pagehide e logout gate.
- Migration e test migration de voice attempts são byte-idênticas às de #74: blobs 2abab9e677b14673518e652d651d4be18a73ce94 e 98f9cbf85fb272bf699ad1ece1101110c51b5ebd. A promoção compartilhada deve aplicar cada migration uma única vez.

O commit [bdd229de](https://github.com/Reekyi/UpStatus/commit/bdd229de6214faa4e0d14ac4d82a5746191ed657) atualizou o contexto VM do logout harness após o run anterior falhar com ReferenceError de signalVoiceRoomAttemptId. O novo run exato [42227054099](https://github.com/Reekyi/UpStatus/actions/runs/42227054099), no HEAD bdd229de, terminou FAILURE antes da integração autenticada:

- Adapter tests: PASS.
- Durable voice-room attempt recovery tests: PASS.
- Isolated endpoint unauthenticated checks: 14/15.
- Única falha: POST /signal excedeu AbortSignal.timeout(12000); integração autenticada/browser, rate-limit concurrency, read-receipt concurrency, migration guard e candidate-check foram SKIPPED.
- Os logs Edge do mesmo intervalo mostram GET /health 200 e os demais POSTs sem autenticação respondendo 401 em 17-141 ms, além de PUT /signal 405. Não existe entrada Edge correspondente ao POST /signal que expirou. Um health probe posterior também retornou 200. Evidência favorece falha transitória de transporte/gateway antes da invocação, mas não comprova a causa.
- O fix do harness em bdd229de ainda não foi validado pelo step final, porque o run falhou antes de chegar a ele.

Classificação: implementação por inspeção e testes unitários/estáticos PASS; AUTOMATED CI do HEAD exato FAIL por timeout de uma requisição não autenticada. Não reutilizar o PASS histórico [42194948317](https://github.com/Reekyi/UpStatus/actions/runs/42194948317) como aprovação do HEAD atual.

### Risco residual de armazenamento local

Normal e Team Lite usam o mesmo comportamento em signalRestorePendingVoiceRoomAttempts: entradas que não passam na normalização são ignoradas e o envelope é regravado apenas com as entradas válidas. Os testes atuais esperam descartar entradas cross-member, IDs malformados, logical IDs desconhecidos e timestamps expirados/futuros.

Isso é seguro contra replay de identidade inválida, mas há risco de recuperação: se um marcador do próprio membro for corrompido e ainda representar uma tentativa ativa no servidor, a restauração pode descartá-lo sem cancelamento. O servidor mantém TTL e cleanup, portanto o risco é limitado, mas não é recuperação garantida. Classificação: inspeção de código, não reproduzida. Avaliar preservação/fail-closed para registros inválidos do próprio membro e adicionar teste explícito; não sobrescrever silenciosamente um possível handle ativo.

### Projeto Supabase isolado

Projeto bfpjtfqlnypisxljoxkb:

- ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 27 migrations até 20261106120851.
- Edge Function upstatus-signal-test v31, SHA c69cd21dc606f552aa93c1f423d1151db1cdead26c39c0167b92554e8b9e3310, verify_jwt=false.
- Tabela upstatus_signal_voice_room_attempts e RPCs open/cancel presentes.
- Tabelas de sinalização: RLS ativo, zero policies, sem grants diretos para anon/authenticated e acesso service_role.
- RPCs de signaling: SECURITY INVOKER, search_path vazio, EXECUTE negado a anon/authenticated e permitido a service_role.
- Índices das FKs de call attempts presentes; Performance Advisor não reporta mais FK sem índice. Restam quatro avisos de índices antigos unused, que não devem ser removidos com base somente no banco de teste.
- Security Advisor: 17 INFO de RLS habilitado sem policies, sem WARN; Health sem findings.
- A consulta SELECT final encontrou zero users, sessions, rooms, members, bindings, events, call attempts, voice attempts, rate-limit buckets e chat_reads. Nenhuma limpeza manual foi executada.

#### Realtime candidato isolado

As três funções de broadcast continuam SECURITY DEFINER, mas agora têm search_path pg_catalog, public e EXECUTE revogado para anon/authenticated. Os payloads de messages, remote_state e users foram reduzidos a apenas {op: TG_OP}. Isso remove conteúdo de mensagem e os metadados anteriores desses broadcasts no isolado.

Limite restante: todas ainda chamam realtime.send com private=false. O tópico continua público e transmite metadados de ocorrência/operação. A tabela realtime.messages também mantém SELECT/INSERT/UPDATE para anon/authenticated, RLS ativo e zero policies. A mitigação de payload é real, mas não equivale a canais privados autenticados.

#### Default ACL isolado

O owner postgres tem defaults de public restringidos a postgres/service_role para tabelas, funções e sequences; há também default global de EXECUTE restrito a postgres. Porém, defaults de supabase_admin em public, graphql e graphql_public continuam concedendo privilégios amplos a anon/authenticated/service_role, e defaults de postgres em storage continuam amplos. A sessão é postgres, não superuser e não membro de supabase_admin. O Advisor não substitui essa inspeção de catálogo.

Durante uma consulta intermediária o laboratório estava ocupado por fixtures de teste; uma leitura posterior, após a atividade, retornou todas as contagens em zero. Nenhuma conclusão de cleanup foi baseada na fotografia transitória.

#### Proveniência das migrations

O repositório usa o prefixo 20261106120500 para voice-room attempt recovery e seu teste; o histórico do projeto isolado registra 20261106120844 e 20261106120851. Os arquivos são idênticos entre #74 e #76, mas a linhagem/versão registrada no banco precisa ser reconciliada antes da promoção oficial. Não reaplicar a migration apenas para alinhar o timestamp.

### Produção Supabase - bloqueadores mantidos

Projeto dlfvkawaiqduhlazsszm:

- ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations até 20261027155438, 38 Edge Functions ACTIVE.
- upstatus v480 SHA bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd.
- upstatus-team-lite v15 SHA 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb.
- upstatus-backup-327-pre328 continua ACTIVE v1 com index.ts vazio (0 bytes), SHA 3d6c4f8e5f777830ea720ab2938cb023b5a4e4c7d26f3fc02b926ce0e4d0dd90. Confirmar ausência de consumidores antes de qualquer decisão operacional.
- Não existe função de produção upstatus-signal. upstatus-signal-test é exclusivamente do projeto isolado. As funções core usam x-upstatus-token e timingSafeEqual, apesar de verify_jwt=false.
- Nenhuma migration candidata, call/voice attempt, rate-limit table/RPC ou merge_chat_read_receipts foi promovida.

RT-01 permanece crítico: upstatus_broadcast_messages em produção serializa OLD/NEW completos via to_jsonb e envia ao tópico db_change com private=false. O trigger está ativo para INSERT/UPDATE/DELETE. A função é SECURITY DEFINER, search_path=public e executável por anon/authenticated. Em contraste, o isolado já transmite somente {op} e revogou EXECUTE dos papéis cliente.

RLS/grants: nove tabelas backend-owned têm RLS ativo e zero policies, mas anon e authenticated possuem os oito privilégios efetivos (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN). upstatus_visual_config não concede privilégios de tabela aos clientes. realtime.messages mantém SELECT/INSERT/UPDATE para anon/authenticated, RLS ativo e zero policies. Grants amplos não provam acesso às linhas, mas continuam sendo superfície desnecessária.

SECURITY DEFINER: as três funções de broadcast permanecem executáveis por anon/authenticated. Default ACLs continuam amplos para postgres em public/storage e supabase_admin em public/graphql/graphql_public. A sessão é postgres, não superuser e não membro de supabase_admin; não tem autoridade para corrigir os defaults de supabase_admin.

Security Advisor de produção: 3 WARN para anon, 3 WARN para authenticated e 10 INFO de RLS sem policies; performance e health sem findings. ACL-02 permanece bloqueado por falta de autoridade administrativa.

### Rate limit e Edge Functions

O endpoint isolado v31 integra consume_upstatus_signal_rate_limit e o teste anterior confirmou 90 aceitas + 1 HTTP 429. A resposta 429 não inclui Retry-After. Produção não tem a tabela/RPC e os templates de produto não integram o rate limit distribuído. O endpoint de sinalização dedicado continua ausente em produção.

O workflow #76 usa o endpoint isolado upstatus-signal-test; a função compartilhada de teste está no PR #74, não no PR #76. A promoção deve tratar essa dependência explicitamente e criar/deployar o endpoint de produção somente no gate autorizado, nunca apontar userscripts de produção para a função -test.

### Issues e QA documental

- [#78](https://github.com/Reekyi/UpStatus/issues/78): aberta, 23 comentários; critérios físicos ainda 0/8. O último checkpoint ainda descreve heads anteriores.
- [#79](https://github.com/Reekyi/UpStatus/issues/79): aberta, 76 comentários; 16/35 itens marcados. O último checkpoint também está desatualizado em relação ao HEAD Team Lite bdd229de.
- Testes físicos Tampermonkey, offline/reload/no-F5, permissões reais e interoperabilidade Normal ↔ Team Lite instalados continuam pendentes.
- [#82](https://github.com/Reekyi/UpStatus/pull/82) permanece docs-only, HEAD 3d9bcb3. Validate [42218972117](https://github.com/Reekyi/UpStatus/actions/runs/42218972117) falhou com production updateURL mismatch herdado de master. Master deriva updateURL do endpoint legado; o candidato Normal separa endpoint de API e release.scriptUrl. Não enfraquecer o validador.
- Blob anterior do documento QA: 9751c225d96acafb56197f5cd7059b644009d275. Este append usa o conteúdo e SHA reconsultados imediatamente antes da escrita.

### Gates imediatos

1. Reexecutar os checks de #76 após o timeout de POST /signal e exigir CI verde no SHA bdd229de ou em HEAD posterior verificado.
2. Confirmar que o step candidate-check executa após os testes de endpoint e valida o fix do VM logout harness.
3. Verificar a paridade final do bundle Team Lite com o adapter compartilhado e a dependência do backend de #74.
4. Testar a política para registros locais malformados sem perder um possível handle ativo.
5. Reconciliar a linhagem das migrations e aplicar cada migration compartilhada uma única vez no TEST autorizado.
6. Reconsultar fixtures após o workflow terminar; não executar cleanup manual sem autorização explícita.
7. Executar testes físicos Tampermonkey nos dois produtos.
8. Implementar Retry-After e integrar rate limit nos endpoints reais.
9. Resolver RT-01 com broadcast privado/autenticado e payload mínimo em produção.
10. Resolver ACL-02 por caminho administrativo autorizado; revisar grants de realtime.messages e defaults de supabase_admin.
11. Atualizar #78/#79, obter reviews humanas e ensaiar rollback antes de qualquer release.

Nenhuma branch de engenharia foi escrita pela auditoria. Nenhum workflow ou teste mutável foi iniciado pela auditoria. As consultas SQL desta rodada foram SELECT-only; nenhuma migration, deploy, merge, release, publicação, secret/flag/role change ou operação destrutiva foi realizada. A única escrita é este append na branch QA, usando o blob SHA atual como precondição.


## Correção de fotografia - Team Lite avançou para novo HEAD durante a auditoria (2026-11-06)

A engenharia atualizou #76 depois do append anterior. A fotografia mais recente do ref é:

- Branch team-lite/signaling-transport-candidate.
- HEAD atual: 65e0176212091d4aa07a483aa978d2980f498479.
- 225 commits à frente / 0 atrás de team-lite-official; 166 à frente / 0 atrás do baseline #75.
- Commit [65e0176](https://github.com/Reekyi/UpStatus/commit/65e0176212091d4aa07a483aa978d2980f498479) altera somente o timeout do black-box endpoint test de 12 para 20 segundos.

A causa provável do run anterior ficou mais clara:

- [42227054099](https://github.com/Reekyi/UpStatus/actions/runs/42227054099) falhou em 14/15 checks não autenticados porque POST /signal expirou em 12 segundos.
- A consulta read-only aos Edge logs no intervalo não encontrou invocação correspondente para esse POST. GET /health retornou 200; os POSTs adjacentes sem token retornaram 401 rapidamente; PUT /signal retornou 405.
- O health probe isolado retornou 200. A evidência é compatível com cold start/latência ou falha de transporte antes da invocação, não com rejeição de autenticação comprovada.
- O commit 65e0176 aumentou o timeout para 20 segundos. Isso é uma mitigação de flakiness, não uma correção funcional do produto.

Novo workflow exato [42227413397](https://github.com/Reekyi/UpStatus/actions/runs/42227413397):

- Mutation guard: PASS.
- Adapter tests: PASS.
- Durable voice-room attempt recovery tests: PASS.
- Isolated endpoint unauthenticated checks: PASS.
- Integração autenticada/browser: IN PROGRESS na última consulta.
- Rate-limit concurrency, read-receipt concurrency, migration guard, candidate-check e cleanup: ainda pendentes.

Classificação atual de #76: implementação por inspeção e testes estáticos PASS; endpoint checks PASS no novo run; integração autenticada/browser ainda em execução. Não declarar Candidate Checks completo até o run 42227413397 terminar com SUCCESS e cleanup final ser confirmado. O laboratório está ocupado por esse workflow; não foi feita nova contagem de fixtures durante a execução.

O HEAD Normal #74 permanece 94513c106d42cb8d77ab9a1c11ff7c9bfa610ba6, com Validate + Signaling Smoke completos em SUCCESS. O QA #82 permanece em 3d9bcb3, com o Validate anterior falhando no updateURL mismatch herdado de master.

Este append usa o conteúdo e blob SHA reconsultados imediatamente antes da escrita. Nenhuma branch de engenharia foi alterada pela auditoria; nenhuma operação de produção ou teste mutável foi iniciada pela auditoria.


## Auditoria independente — revalidação de PRs, CI e Supabase (2026-11-06 11:32 BRT)

Esta atualização substitui as fotografias anteriores de #74/#76 onde os SHAs ou runs diferem. Todos os refs foram consultados novamente. A única escrita desta auditoria é este append no branch QA; nenhum branch de engenharia foi alterado.

### Refs reais e ancestralidade

| PR | Branch | HEAD exato | Base | Ahead / behind |
|---|---|---|---|---:|
| #74 Normal | `chore/continuity-foundation` | `94513c106d42cb8d77ab9a1c11ff7c9bfa610ba6` | `master` `a9288ccfcb0f308d3a587bfca624418a395be07b` | 735 / 0 |
| #75 Team Lite baseline | `team-lite/3.4.31-guest-fixes` | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | `team-lite-official` `9065bc1536fde64f437f6f12b7abb9b072cb8281` | 59 / 0 |
| #76 Team Lite candidate | `team-lite/signaling-transport-candidate` | `83216ccf5818274da3241273ea18ebd97fa3928b` | `team-lite-official` `9065bc1536fde64f437f6f12b7abb9b072cb8281` | 227 / 0 |
| #82 QA docs | `qa/release-readiness-2026-11-04-master` | `2937f1c50b2d22e338f1d9bd83ae7deeb7b84983` | `master` `a9288ccfcb0f308d3a587bfca624418a395be07b` | 63 / 0 |

#76 está 168 commits à frente de #75 e zero atrás. #74, #75, #76 e #82 continuam abertos, Draft, não mesclados e mergeable. Reviews humanas submetidas: 0; threads inline: 0.

### #74 Normal — AUTOMATED PASS no HEAD exato

- Validate [42220452780](https://github.com/Reekyi/UpStatus/actions/runs/42220452780): SUCCESS.
- Signaling Smoke [42220452949](https://github.com/Reekyi/UpStatus/actions/runs/42220452949): SUCCESS.
- Logs do job `127900887795`: 18/18 checks não autenticados e 129/129 checks autenticados passaram.
- O Smoke também concluiu WebRTC call/voice/screen, mesh de três membros, rate limit 90 aceitas + 1 HTTP 429, concorrência do rate limiter, read receipts atômicos e cleanup de usuários/sessões/rooms/memberships/events.
- Os testes específicos de voice-room attempt persistence, cancel-before-open, reload retry, storage fail-closed e logout gate passaram.
- Classificação: **AUTOMATED PASS** no SHA `94513c1`. Não equivale a teste físico Tampermonkey.

### #76 Team Lite — implementação presente, CI exato FAIL no harness final

HEAD `83216ccf5818274da3241273ea18ebd97fa3928b`.

- Candidate Checks [42229990514](https://github.com/Reekyi/UpStatus/actions/runs/42229990514): FAILURE.
- Passaram: mutation/isolation guard, adapter tests, durable voice-room attempt tests, autenticação dos endpoints, integração autenticada, browser WebRTC call/voice/screen, mesh de três membros, rate-limit concurrency, read-receipt concurrency e migration-layout guard.
- Logs do job `127933138500`: 103/103 checks autenticados passaram; o cleanup de usuários/sessões/rooms/memberships/events foi confirmado.
- A falha ocorreu somente no passo final `scripts/team-lite-candidate-check.mjs`, linha 538: `failed active leave must retry through signalReleaseVoiceRoom while the room binding remains`.
- O commit [83216cc](https://github.com/Reekyi/UpStatus/commit/83216ccf5818274da3241273ea18ebd97fa3928b) alterou somente o contrato de teste anterior para esperar o retorno booleano de `signalReleaseVoiceRoom()` e duas tentativas; não alterou runtime.
- A asserção que agora falha ainda espera o fallback legado `signalReleaseVoiceRoom()`. No caminho atual com `leavingAttemptId`, `voiceRoomLeave()` chama diretamente `signalAttemptPendingVoiceRoomCancel()`; a RPC cancel-open é a operação autoritativa e mantém o marcador se não confirmar. O harness está exercitando uma expectativa anterior ao protocolo de logical attempts.
- Classificação: **CODE INSPECTION + testes unitários/integração PASS**, mas **AUTOMATED CI FAIL** no HEAD exato. A causa é compatível com contrato de harness obsoleto, não é evidência suficiente de falha funcional do cancelamento. Não marcar #76 verde até substituir a asserção por uma regressão alinhada ao contrato atual e obter um novo SUCCESS exato.
- Teste recomendado para substituir a asserção: simular cancel-open transitório sem confirmação; exigir retorno falso, marcador e contexto preservados, logout bloqueado; restaurar transporte e exigir retry confirmado, remoção persistida e uma única finalização. Não adicionar fallback que apague estado sem confirmação.

O baseline #75 mantém o PASS histórico [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127), mas não substitui os checks atuais de #76.

### Paridade de voice-room attempts e risco de recuperação local

A inspeção dos dois userscripts confirma o mesmo desenho geral nos candidatos Normal e Team Lite:

- attempt ID e envelope member-scoped são persistidos antes de `/room/open`;
- `openVoiceRoom(logicalId, attemptId)` e `cancelVoiceRoomOpen(logicalId, attemptId)` usam o contrato de attempt;
- a inicialização do transporte restaura e tenta cancelar tentativas pendentes;
- falha de storage bloqueia nova abertura;
- logout aguarda cancelamento confirmado;
- o token de sessão não é persistido;
- a flag `signaling_transport_enabled` continua **false por padrão** e o endpoint precisa ser HTTPS, same-origin e terminar em `/functions/v1/upstatus-signal` ou `/functions/v1/upstatus-signal-test`.

**Risco residual por inspeção:** `signalRestorePendingVoiceRoomAttempts()` ignora individualmente registros que falham na normalização e depois regrava o envelope somente com os registros válidos. Um marcador corrompido do próprio membro ainda pode representar uma tentativa ativa no servidor; descartá-lo silenciosamente pode perder o único attempt ID de recuperação. Envelopes acima de 20 entradas já falham fechados, mas registros individuais malformados não tornam o envelope inteiro unhealthy. Não reproduzido em navegador. Recomenda-se preservar o envelope suspeito e bloquear novas operações/logout até reconciliação ou cleanup server-side seguro, com teste específico de marcador own-member inválido.

### Endpoint candidato e dependência de backend

- Os dois arquivos de produto `src/server/index.template.ts` e `src/server/team-lite-index.template.ts` não contêm as rotas `/room/open` e `/room/cancel-open`, nem a RPC distribuída `consume_upstatus_signal_rate_limit`.
- As rotas de call/voice attempts e rate limit estão no Edge Function **isolado** `upstatus-signal-test` v31, SHA `c69cd21dc606f552aa93c1f423d1151db1cdead26c39c0167b92554e8b9e3310`.
- Produção não possui Edge Function `upstatus-signal`; o endpoint `-test` não deve ser configurado nos clientes de produção.
- A flag permanece off por padrão, portanto os novos fluxos autenticados são candidatos, não o caminho de produção.
- O helper de resposta do endpoint v31 não adiciona `Retry-After`; o rate limit retorna HTTP 429 sem orientação explícita de retry.
- O adapter Team Lite ainda usa `GM_xmlhttpRequest` com timeout de 12 segundos; o aumento para 20 segundos foi no teste black-box de endpoint, não no timeout do cliente. Avaliar se o orçamento do cliente é compatível com cold start/rede e com o retry, sem transformar timeout maior em substituto de idempotência.

### Supabase isolado — `bfpjtfqlnypisxljoxkb`

- ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.
- 27 migrations; últimas: `20261106110214` / `20261106110221` (índices de FKs) e `20261106120844` / `20261106120851` (voice-room attempts e teste).
- `upstatus-signal-test` ACTIVE v31, `verify_jwt=false`, SHA acima; autenticação da aplicação é pelo token UpStatus.
- `upstatus_signal_voice_room_attempts`, call attempts e rate-limit tables estão presentes. Tabelas server-owned: RLS ativo, zero policies, sem SELECT/INSERT/UPDATE/DELETE para anon/authenticated; service_role mantém acesso necessário.
- RPCs de sinalização examinadas: SECURITY INVOKER, `search_path=""`, EXECUTE negado a anon/authenticated e permitido a service_role.
- As três funções de broadcast candidatas continuam SECURITY DEFINER, mas usam `search_path=pg_catalog, public`, EXECUTE negado a anon/authenticated e payload minimizado a `{op: TG_OP}`.
- Limite restante: os broadcasts do isolado ainda usam `private=false`; metadados de ocorrência/operação continuam observáveis no tópico público. `realtime.messages` tem RLS, zero policies e SELECT/INSERT/UPDATE para anon/authenticated.
- Security Advisor: 17 INFO de RLS sem policies, sem WARN. Performance Advisor: quatro índices antigos unused; nenhuma FK sem índice. Não remover índices somente com base no banco de teste.
- Default ACL do owner postgres em `public` está restrito a postgres/service_role; EXECUTE global default está restrito a postgres. Defaults de postgres em `storage` e defaults de supabase_admin em `public`, `graphql` e `graphql_public` continuam amplos. A sessão é postgres, não superuser e não membro de supabase_admin.
- Consulta SELECT-only após o run #76 encontrou zero users, sessions, rooms, members, bindings, events, call attempts, voice attempts, rate-limit buckets e chat_reads.
- **Proveniência:** os arquivos versionados `20261106120500_voice_room_attempt_recovery.sql` e seu test migration são byte-idênticos entre #74 e #76 (blobs `2abab9e677b14673518e652d651d4be18a73ce94` e `98f9cbf85fb272bf699ad1ece1101110c51b5ebd`). O banco registra `20261106120844` e `20261106120851`. Reconciliar a linhagem antes da promoção; não reaplicar a migration só para alinhar timestamps.

### Produção Supabase — `dlfvkawaiqduhlazsszm`

- ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, região us-west-2; sete migrations até `20261027155438`.
- 38 Edge Functions ACTIVE. Principais: `upstatus` v480 SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`; `upstatus-team-lite` v15 SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`; Screen Share beta10 v6 SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`.
- `upstatus-backup-327-pre328` continua ACTIVE v1 com `index.ts` vazio (0 bytes), SHA `3d6c4f8e5f777830ea720ab2938cb023b5a4e4c7d26f3fc02b926ce0e4d0dd90`. Verificar consumidores antes de qualquer decisão operacional; nenhuma função foi desativada.
- Nenhuma tabela/RPC de signaling, call attempts, voice attempts, rate limit ou `merge_chat_read_receipts` está presente. Nenhuma Edge Function `upstatus-signal` está implantada.
- As funções core reportam `verify_jwt=false`, mas a inspeção de fonte confirma autenticação própria por `x-upstatus-token`; isso não é, isoladamente, prova de endpoint sem autenticação.
- **RT-01 confirmado:** `upstatus_messages_broadcast` continua habilitado para INSERT/UPDATE/DELETE. `upstatus_broadcast_messages()` serializa OLD/NEW completos com `to_jsonb` e chama `realtime.send(..., false)`. A linha completa de `messages`, incluindo texto e metadados de anexos, continua sendo publicada em tópico público. As funções de remote-state e users também publicam metadados públicos.
- As três funções de broadcast em produção são SECURITY DEFINER, `search_path=public`, e EXECUTE efetivo para anon/authenticated/service_role.
- Nove tabelas backend-owned têm RLS ativo, zero policies e oito privilégios efetivos para anon e authenticated. `upstatus_visual_config` não concede esses privilégios. `realtime.messages` é partitioned table, RLS ativo, zero policies e SELECT/INSERT/UPDATE efetivos para anon/authenticated. Grants amplos não provam acesso às linhas, mas continuam desnecessários.
- Default ACL de postgres em `public` e `storage` e de supabase_admin em `public`, `graphql` e `graphql_public` continuam concedendo privilégios amplos a anon/authenticated. A sessão atual não é superuser nem membro de supabase_admin.
- Security Advisor observado às 14:34 UTC: 3 WARN para SECURITY DEFINER executável por anon, 3 WARN para authenticated e 10 INFO de RLS sem policies. Performance e Health sem findings.
- RT-01 e ACL-02 permanecem bloqueadores. Nenhuma alteração foi feita em produção.

### Issues, revisão humana e manual acceptance

- [#78](https://github.com/Reekyi/UpStatus/issues/78) aberta, 24 comentários, 0/8 critérios físicos marcados. O escopo define voice room como canal aberto, sem convite/aceitação; preservar essa regra.
- [#79](https://github.com/Reekyi/UpStatus/issues/79) aberta, 77 comentários, 16/35 checkboxes marcados. O corpo principal ainda contém fotografia de 2026-11-03 e não é um snapshot confiável dos heads atuais.
- Teste físico Tampermonkey, offline/reload/no-F5, permissões reais de microfone/tela e interoperabilidade entre userscripts instalados continuam **MANUAL PENDING**.
- #74/#75/#76/#82 não têm reviews humanas submetidas nem threads inline.
- PR #82 Validate [42227785333](https://github.com/Reekyi/UpStatus/actions/runs/42227785333) falhou em `production updateURL mismatch` na validação de master. #82 continua docs-only, Draft e sem merge; não alterar o validador para mascarar a divergência.

### Gates imediatos

1. Corrigir o harness Team Lite para validar cancelamento por attempt ID, marcador retido em falha e retry após reconexão; executar Candidate Checks em novo SHA e exigir SUCCESS integral.
2. Cobrir a corrupção de um registro individual own-member sem sobrescrever o envelope suspeito.
3. Fazer teste físico #78 em Normal e Team Lite instalados, incluindo múltiplas quedas e áudio bidirecional.
4. Reconciliar a linhagem das migrations compartilhadas e confirmar aplicação única no ambiente isolado/TEST autorizado.
5. Integrar rate limit aos endpoints reais e adicionar `Retry-After`; não apontar clientes de produção para `upstatus-signal-test`.
6. Resolver RT-01 com desenho autenticado de Realtime ou substituto server-mediated; validar RLS/grants e rollback no TEST.
7. Resolver ACL-02 por caminho administrativo autorizado, incluindo defaults de supabase_admin e grants de `realtime.messages`.
8. Revisar consumidores/rollback das 38 Edge Functions, incluindo o backup vazio, sem desativar nada nesta auditoria.
9. Atualizar #79, obter reviews humanas e concluir plano de cutover/rollback antes de qualquer release.

Nenhum percentual de conclusão é declarado. Automated CI, inspeção estática, teste manual e produção implantada permanecem estados separados.

### Registro de segurança desta rodada

Nenhuma escrita SQL em produção, migration, deploy, merge, release, publicação de userscript, alteração de secret/flag/role ou operação destrutiva foi realizada. Todas as consultas SQL executadas pela auditoria foram SELECT-only. Nenhum workflow ou teste mutável foi iniciado pela auditoria. O run #76 foi executado pelo GitHub/engenharia com mutation guard, project allowlist e opt-in explícito no projeto isolado; o resultado e as fixtures foram somente inspecionados. Nenhum cleanup manual foi executado.

O HEAD QA e o blob SHA foram reconsultados imediatamente antes deste append. A atualização usa o blob SHA como precondição e altera somente este Markdown na branch QA.


## Confirmação do commit QA desta auditoria (2026-11-06 11:38 BRT)

O append acima criou o commit documental [9aad139eb52a3c385907e5128cbc717a9680e185](https://github.com/Reekyi/UpStatus/commit/9aad139eb52a3c385907e5128cbc717a9680e185), blob `9054bf010d3a1dd8be5c6da83182f66ac9ef819b`. Após a escrita, a comparação confirmou #82 com 64 commits à frente / 0 atrás de master; PR permanece aberta e Draft. O Validate automático [42235658575](https://github.com/Reekyi/UpStatus/actions/runs/42235658575) concluiu FAILURE na asserção herdada `production updateURL mismatch` em `scripts/validate.mjs`. O PR continua alterando somente `docs/RELEASE_READINESS.md`; não alterei o validador nem código de runtime. Nenhuma outra alteração foi feita nesta branch.


## Revalidação independente — heads, CI, voice-attempt recovery e Supabase (2026-11-06 12:30–12:35 BRT)

Esta seção substitui fotografias anteriores quando SHA, run ou estado atual diferirem. O arquivo e o head da branch QA foram reconsultados imediatamente antes deste append. A escrita fica restrita a este Markdown na branch QA.

### Refs reais e CI exato

| PR | Branch / base | HEAD exato | Comparação | Evidência mais recente |
|---|---|---|---:|---|
| #74 Normal | `chore/continuity-foundation` → `master` | `9ed9fcb77958455f90c31d14c2b66a463ad9d191` | 740 ahead / 0 behind | Validate [42242569542](https://github.com/Reekyi/UpStatus/actions/runs/42242569542) SUCCESS; Smoke [42242569548](https://github.com/Reekyi/UpStatus/actions/runs/42242569548) IN PROGRESS |
| #75 Team Lite baseline | `team-lite/3.4.31-guest-fixes` → `team-lite-official` | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 59 ahead / 0 behind | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) histórico SUCCESS |
| #76 Team Lite candidate | `team-lite/signaling-transport-candidate` → `team-lite-official` | `1a6de09805353145e78083f5c03f6c91f0118449` | 236 ahead / 0 behind | Candidate Checks [42241688374](https://github.com/Reekyi/UpStatus/actions/runs/42241688374) SUCCESS |
| #82 QA docs | `qa/release-readiness-2026-11-04-master` → `master` | `a3596fd586872c332822a30d697be24788352890` | 65 ahead / 0 behind | Validate [42235896025](https://github.com/Reekyi/UpStatus/actions/runs/42235896025) FAILURE herdado |

Master permanece em `a9288ccfcb0f308d3a587bfca624418a395be07b`; `team-lite-official` permanece em `9065bc1536fde64f437f6f12b7abb9b072cb8281`. #76 está 177 commits à frente do baseline #75 e zero atrás. #74, #75, #76 e #82 continuam abertas, Draft, não mescladas e mergeable. Reviews humanas submetidas: zero; comentários inline de review: zero.

### Normal #74 — validação parcial no novo HEAD

- Validate [42242569542](https://github.com/Reekyi/UpStatus/actions/runs/42242569542): **AUTOMATED PASS** no SHA exato `9ed9fcb`.
- Smoke [42242569548](https://github.com/Reekyi/UpStatus/actions/runs/42242569548): **IN PROGRESS** no mesmo SHA.
- Job `127976340571`: checkout, syntax/static harnesses e endpoint checks não autenticados concluídos com SUCCESS; integração autenticada/browser ainda executando; concorrência do rate limiter, concorrência de read receipts e etapa pós-job/cleanup ainda pendentes.
- Não declarar Smoke completo nem cleanup final enquanto esse run estiver ativo.
- O último commit [9ed9fcb](https://github.com/Reekyi/UpStatus/commit/9ed9fcb77958455f90c31d14c2b66a463ad9d191) altera somente `scripts/voice-room-attempt-recovery.test.mjs`, evitando colisão de variável no teste; não altera runtime.

Classificação: Validate **AUTOMATED PASS**; partes iniciais do Smoke **AUTOMATED PASS**; integração autenticada e cleanup **PENDING/IN PROGRESS**.

### Team Lite #76 — Candidate Checks integralmente aprovados

- [Candidate Checks 42241688374](https://github.com/Reekyi/UpStatus/actions/runs/42241688374): **SUCCESS** no HEAD exato `1a6de098`.
- 15/15 checks não autenticados e 103/103 checks de integração autenticada passaram.
- Chromium: WebRTC de chamada, áudio de voice room e vídeo de screen share com tracks remotas; convite dinâmico e mesh de três membros; teardown aprovado.
- Rate limit distribuído: 90 aceitas + 1 HTTP 429; concorrência aprovada.
- Concorrência de read receipts atômicos aprovada.
- Migration layout guard, versão 3.4.31, userscript syntax, manifest consistency, portais Lucca/Ycaro, isolamento de guest sessions e cenários do updater aprovados.
- Sequenciamento de voice leave, coalescência de leave duplicado, logout aguardando leave em andamento, retry de cancel-open, rejoin serialization, Realtime readiness, offline/online context preservation e logout membership gate passaram.
- O log registra cleanup de usuários, sessões, salas, memberships e events como verificado. A execução incluiu mutation guard, allowlist do projeto isolado e opt-in explícito; a auditoria apenas inspecionou o run.

O commit [1a6de098](https://github.com/Reekyi/UpStatus/commit/1a6de09805353145e78083f5c03f6c91f0118449) altera somente `scripts/team-lite-voice-room-attempt-recovery.test.mjs`, evitando colisão de variável no teste. O runtime e os testes de recuperação já estavam no histórico anterior do candidato.

### Recuperação de voice-room e corrupção do envelope local

A inspeção dos userscripts atuais e dos testes Normal/Team Lite confirma paridade no protocolo de tentativa lógica:

- attempt ID e registro member-scoped são persistidos antes de `/room/open`;
- falha de persistência bloqueia a abertura;
- cancelamento usa attempt ID mesmo quando o room ID não chegou;
- retry ocorre após a reconstrução do transporte autenticado;
- token de sessão não é persistido;
- logout permanece bloqueado até confirmação da saída.

**Risco anterior de descarte silencioso de marcador corrompido: corrigido no candidato e coberto por teste.** Agora, corrupção suspeita de registro do próprio membro (ID inválido, timestamp inválido/expirado/futuro, logical ID inesperado, membro ausente/conflitante, campo extra, duplicata ou entrada não-objeto) faz restore falhar fechado, marca o storage como unhealthy, preserva o envelope original, não restaura parcialmente o subconjunto válido, bloqueia retry/logout e bloqueia nova tentativa. Registro explicitamente estrangeiro só é descartado quando o prefixo do attempt ID confirma a identidade estrangeira. Os testes correspondentes passaram nos candidatos Normal e Team Lite.

### Laboratório compartilhado e cleanup

O projeto isolado é compartilhado pelos workflows Normal e Team Lite. O run Normal [42242569548](https://github.com/Reekyi/UpStatus/actions/runs/42242569548) ainda estava executando integração autenticada quando a consulta SELECT-only foi feita. Naquele momento havia fixtures com prefixo `__signal_test` (quatro usuários/sessões, duas salas, duas memberships, uma tentativa de call e buckets de rate limit), compatíveis com a execução Normal em andamento. **Esses registros não são classificados como resíduo do Team Lite nem como falha de cleanup**; não houve contagem pós-run do Normal e nenhuma limpeza manual foi feita. Reconsultar somente depois que o Smoke terminar e liberar o laboratório.

### Issues e aceitação manual

- [#78](https://github.com/Reekyi/UpStatus/issues/78): aberta, 24 comentários, 0/8 critérios marcados. A regra funcional permanece sala de voz aberta, sem convite/aceitação.
- [#79](https://github.com/Reekyi/UpStatus/issues/79): aberta, 77 comentários, 16/35 critérios marcados.
- Testes físicos Tampermonkey, queda/reconexão sem F5, microfone, display capture e interoperabilidade entre userscripts instalados continuam **MANUAL PENDING**.

### Supabase isolado — `bfpjtfqlnypisxljoxkb`

- ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 27 migrations até `20261106120851`.
- `upstatus-signal-test` ACTIVE v31, SHA `c69cd21dc606f552aa93c1f423d1151db1cdead26c39c0167b92554e8b9e3310`; existe também `upstatus-signal-e2e-once` v3. Nenhuma dessas funções é endpoint de produção.
- Call attempts, voice-room attempts, rate limits, rooms, members, bindings e events estão presentes. Tabelas server-owned: RLS ativo, zero policies e sem SELECT/INSERT/UPDATE/DELETE para anon/authenticated; service_role conserva o acesso necessário.
- RPCs de sinalização inspecionadas são SECURITY INVOKER, `search_path=""`, EXECUTE negado a anon/authenticated e permitido a service_role.
- As três funções de broadcast candidatas são SECURITY DEFINER, `search_path=pg_catalog, public`, EXECUTE negado a anon/authenticated e permitido a service_role. O payload de mensagens/remote-state/users foi reduzido a `{op: TG_OP}`, sem linha completa.
- **Risco residual:** os broadcasts do isolado ainda usam `private=false`; tópico e metadados de ocorrência continuam públicos. `realtime.messages` mantém RLS, zero policies e SELECT/INSERT/UPDATE para anon/authenticated.
- Security Advisor: 17 INFO de RLS sem policies, sem WARN. Performance Advisor: quatro índices antigos unused, nenhuma FK sem índice. Health Advisor sem findings.
- Default ACL de postgres em `public` (tabelas/funções) está restrito a postgres/service_role e EXECUTE global de postgres está restrito a postgres. Defaults de postgres em `storage` e de supabase_admin em `public`, `graphql` e `graphql_public` continuam amplos. Não foi possível administrar defaults pertencentes a supabase_admin com a sessão atual.

### Produção Supabase — `dlfvkawaiqduhlazsszm`

- ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, região us-west-2; sete migrations até `20261027155438`.
- 38 Edge Functions ACTIVE, todas reportando `verify_jwt=false`. Core functions `upstatus` v480 SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd` e `upstatus-team-lite` v15 SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`; Screen Share beta10 v6 SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`. As funções core usam autenticação própria por `x-upstatus-token`; `verify_jwt=false` isoladamente não demonstra ausência de autenticação.
- `upstatus-signal` dedicado está ausente. Os bundles core implantados não contêm rotas de voice-room attempts, call-attempt recovery ou rate-limit RPC; a função v31 existe somente no projeto isolado.
- **RT-01 permanece confirmado:** trigger `upstatus_messages_broadcast` ativo em INSERT/UPDATE/DELETE; `upstatus_broadcast_messages()` é SECURITY DEFINER, `search_path=public`, EXECUTE efetivo para anon/authenticated e publica OLD/NEW completos via `to_jsonb` em `realtime.send(..., false)`. O conteúdo de mensagens e metadados de anexos é enviado ao tópico público. Broadcasts de remote-state e users também permanecem públicos.
- Nove tabelas backend-owned (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) têm RLS ativo, zero policies e SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN efetivos para anon/authenticated. `upstatus_visual_config` não tem grants de cliente. `realtime.messages` tem RLS, zero policies e SELECT/INSERT/UPDATE efetivos para anon/authenticated.
- SECURITY DEFINER de broadcast: três WARN para anon e três para authenticated. Security Advisor: dez INFO de RLS sem policies. Performance e Health sem findings.
- Default ACL de postgres em `public` e `storage` e de supabase_admin em `public`, `graphql` e `graphql_public` continuam concedendo privilégios amplos a anon/authenticated. A sessão atual não tem autoridade administrativa para corrigir os defaults de supabase_admin.
- Nenhuma tabela/RPC de call attempts, voice attempts, rate limit ou merge de read receipts foi encontrada em produção.

### Gates imediatos

1. Concluir o Smoke Normal [42242569548](https://github.com/Reekyi/UpStatus/actions/runs/42242569548) no SHA exato; depois que o run liberar o laboratório, executar apenas SELECT para confirmar cleanup final.
2. Manter o Candidate Checks Team Lite [42241688374](https://github.com/Reekyi/UpStatus/actions/runs/42241688374) como PASS no SHA `1a6de098`; qualquer novo commit exige nova validação exata.
3. Resolver RT-01 com desenho autenticado/private ou server-mediated e teste de autorização. Não basta minimizar payload mantendo o tópico público.
4. Resolver ACL-02 por caminho administrativo autorizado, incluindo defaults de supabase_admin e revisão de grants em `realtime.messages`.
5. Integrar as rotas de signaling, rate limit distribuído e Retry-After aos endpoints reais Normal/Team Lite; não apontar clientes para `upstatus-signal-test`.
6. Reconciliar a linhagem das migrations isoladas antes da promoção; não reaplicar migration apenas para igualar timestamps.
7. Completar testes físicos da #78 e atualizar #79; obter reviews humanas e ensaiar cutover/rollback no TEST oficial.

### Registro de segurança desta rodada

Nenhuma escrita SQL em produção, migration, deploy, merge, release, publicação de userscript, alteração de secret/flag/role ou operação destrutiva foi realizada. Todas as consultas SQL da auditoria foram SELECT-only. Os workflows #74/#76 foram executados pela engenharia/GitHub; a auditoria somente inspecionou runs e logs. O run Team Lite passou pelo mutation guard, allowlist do projeto isolado e opt-in explícito. O projeto isolado estava sendo usado pelo Smoke Normal durante a consulta de fixtures; nenhum cleanup manual foi executado. A única escrita desta auditoria é este append documental na branch QA, usando o blob SHA atual como precondição.


## Revalidação independente — CI concluído, screen-share negotiation e production cutover (2026-11-06 13:29 BRT)

Esta seção supersede os estados anteriores quando o SHA, run ou resultado diferir. O documento e o head da PR #82 foram reconsultados imediatamente antes da escrita. A alteração permanece restrita a este Markdown na branch QA dedicada.

### Refs reais e CI no head exato

| PR | Branch / base | HEAD exato | Comparação | Evidência exata |
|---|---|---|---:|---|
| #74 Normal | `chore/continuity-foundation` → `master` | `e585447d092bcb385ab6e5b16044d85e6674e3e3` | 749 ahead / 0 behind | Validate [42250699197](https://github.com/Reekyi/UpStatus/actions/runs/42250699197) SUCCESS; Signaling Smoke [42250699210](https://github.com/Reekyi/UpStatus/actions/runs/42250699210) SUCCESS |
| #75 Team Lite baseline | `team-lite/3.4.31-guest-fixes` → `team-lite-official` | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 59 ahead / 0 behind | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) histórico SUCCESS |
| #76 Team Lite candidate | `team-lite/signaling-transport-candidate` → `team-lite-official` | `eaeb3fbb6f9f2c7971e93ed6ce7cc353fba2d227` | 245 ahead / 0 behind; 186 ahead / 0 behind #75 | Candidate Checks [42250709207](https://github.com/Reekyi/UpStatus/actions/runs/42250709207) SUCCESS |
| #82 QA documentation | `qa/release-readiness-2026-11-04-master` → `master` | `f6a9eaed2b127b4d2d4a4de9a413470666ecff06` | 66 ahead / 0 behind | Validate [42244487940](https://github.com/Reekyi/UpStatus/actions/runs/42244487940) FAILURE herdada |

Os refs base consultados foram `master=a9288ccfcb0f308d3a587bfca624418a395be07b` e `team-lite-official=9065bc1536fde64f437f6f12b7abb9b072cb8281`. As quatro PRs continuam abertas, Draft, não mescladas e mergeable. Não há reviews humanas submetidas nas PRs #74, #75, #76 e #82.

**Normal #74 — AUTOMATED PASS no SHA exato:** 18/18 verificações não autenticadas e 129/129 verificações autenticadas. O log do job [128005600322](https://github.com/Reekyi/UpStatus/actions/runs/42250699210) confirma WebRTC de chamada, áudio de voice room e vídeo de screen share com tracks remotas; mesh autenticado de três participantes e teardown; open/cancel de voice attempts, tombstone contra abertura atrasada e corrida open/cancel sem membership órfã; rate limit 90 aceitas + 1 HTTP 429; concorrência do rate limiter; concorrência de read receipts; e cleanup do próprio workflow verificado. O teste VM de screen-share recovery também passou.

**Team Lite #76 — AUTOMATED PASS no SHA exato:** 15/15 verificações não autenticadas e 103/103 autenticadas. O log do job [128008215293](https://github.com/Reekyi/UpStatus/actions/runs/42250709207) confirma WebRTC call/voice/screen, mesh de três participantes, convite e roster, voice-room open join entre aliases Normal/Team Lite, idempotência, transferência de proprietário, capacidade e corridas de saída/entrada; rate limit 90+1 e concorrência; read receipts atômicos; migration layout guard; version 3.4.31; updater, portais Lucca/Ycaro, logout gate, retry e cleanup. O teste VM de screen-share recovery também passou.

A alteração de workflow `queue: max` com `cancel-in-progress: false` está presente nos dois candidatos. A fila compartilhada do projeto isolado reteve o run Team Lite atrás do Normal e depois o executou, em vez de substituir o run pendente. #75 permanece apenas baseline histórico; #76 está 186 commits à frente dele.

**PR #82:** o run [42244487940](https://github.com/Reekyi/UpStatus/actions/runs/42244487940) falhou em `scripts/validate.mjs:26` com `VALIDATION FAILED: production updateURL mismatch`. A PR continua alterando somente este Markdown. Não alterar o validador para mascarar a divergência do baseline master.

### Screen-share offer/answer recovery — melhoria aprovada, lacuna concorrente aberta

A inspeção dos userscripts atuais confirma que o bloco de screen-share recovery possui 6.211 caracteres e é byte-identical entre os produtos. Blobs dos userscripts: Normal `d46552483149900b6ddd7a6298cdea10c7fa7af8`; Team Lite `8cab5ebc0b4ba7810a37b36f114bbd93c3538b34`. O teste compartilhado tem o mesmo blob nos dois heads: `a039ebfd0624c76502e843d659623941bd2dc8d9`.

Comportamento inspecionado e coberto pelo teste VM:
- cache do offer local e answer local;
- retransmissão do mesmo SDP do offer em eventos de presença;
- retry limitado a três retransmissões, em intervalos de 3 segundos;
- interrupção do retry quando answer é aplicado ou o peer conecta;
- replay do answer armazenado quando chega offer duplicado;
- substituição de peer em estado failed/closed/disconnected;
- cancelamento do timer ao aplicar answer ou descartar peer.

Os dois workflows executaram e aprovaram `scripts/screen-share-recovery.test.mjs` nos respectivos userscripts.

**Novo residual — CODE INSPECTION, não reproduzido:** `screenShareOffer()` e `screenShareReceive()` não possuem lock/promise de negociação por peer. O fluxo de presença pode invocar offer mais de uma vez; chamadas concorrentes podem passar pela verificação de signalingState antes de qualquer uma aplicar `setLocalDescription`. Offers remotos duplicados concorrentes também podem passar pela verificação de remoteDescription antes da primeira negociação concluir. O teste atual cobre duplicata sequencial, não concorrência simultânea. Não há campo/guard de `offerInFlight`, `negotiationPromise` ou equivalente no bloco inspecionado. Não foi alegada reprodução física nem falha CI. Gate: adicionar serialização por peer e testes concorrentes de criação de offer e processamento de remote offer antes de declarar screen-share recovery completo.

O comentário de engenharia [#78, comentário 6686292254](https://github.com/Reekyi/UpStatus/issues/78#issuecomment-6686292254) registra que o achado original foi de code review, não falha física reproduzida. A aceitação física de screen share permanece pendente.

### Rate limit / Retry-After — branch separada e divergente

A branch `normal/rate-limit-retry-after-20261106` existe no GitHub e está no commit `7fa1b0aef76aec6acc293c350414309b38362744`. Comparada ao head atual #74 `e585447d`, está **divergente**: 10 commits exclusivos na branch de rate limit e 14 commits exclusivos no head atual #74; merge-base `94513c106d42cb8d77ab9a1c11ff7c9bfa610ba6`. Não fazer cherry-pick/fast-forward dessa branch como unidade.

A migration candidata `20261106133500_distributed_signaling_rate_limit.sql` (blob `41ed8aa2cb1a970a9823073c5e1a33d60a7ed9ab`) executa, dentro da RPC chamada no caminho de requisição, um `DELETE` sem limite por lote para buckets antigos quando `hashtext(p_bucket_key) mod 64 = 0`. Isso significa que 1 em 64 chamadas pode fazer trabalho proporcional a todos os buckets expirados, com risco de latência/lock/IO crescente. O endpoint dessa branch acrescenta `Retry-After: 60` e `Access-Control-Expose-Headers: Retry-After`, mas a migration não deve ser promovida nessa forma. Recriar apenas as mudanças revisadas sobre o head atual e substituir a limpeza por lote limitado ou rotina agendada.

Esse branch é candidato separado; a migration não aparece no inventário atual do banco isolado nem em produção. O endpoint isolado v31 continua sem `Retry-After`. Os templates candidatos Normal/Team Lite chamam `merge_chat_read_receipts`, mas não chamam `consume_upstatus_signal_rate_limit` e não implementam as rotas `/room/open` ou `/room/cancel-open`; essas rotas estão somente no endpoint isolado dedicado. Rate limit distribuído e Retry-After continuam **não integrados ao caminho real de produção**.

### Produto, build e cutover

- A flag `signaling_transport_enabled` continua default-off nos dois userscripts: `GM_getValue(..., false) === true`. Clientes sem configuração explícita permanecem no caminho legado de Realtime.
- O build Normal atual mantém `CLOUD_SERVER` de produção apontando para `upstatus-screen-share-3-1-1-beta10`, enquanto o `release.json` aponta o userscript update URL para `/functions/v1/upstatus/upstatus.user.js`. Isso é uma separação deliberada entre URL do artefato e endpoint de API, mas exige cutover coordenado e rollback revisado; não significa que o backend candidato `upstatus` esteja sendo usado pelo cliente atual.
- `release.json` Normal permanece em versão `3.4.7`; o Validate atual construiu `3.4.7`. Antes de publicação, exige-se bump deliberado e validação de manifesto/artefato. Team Lite candidato está em `3.4.31`.
- Os templates candidatos incluem `merge_chat_read_receipts`, mas os bundles core implantados em produção ainda não. O endpoint `upstatus-signal-test` não é endpoint de produção.

### Supabase de produção — snapshot atual read-only

Projeto `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, região us-west-2; sete migrations até `20261027155438`. Inventário: 38/38 Edge Functions ACTIVE; todas reportam `verify_jwt=false`. Isso não prova ausência de autenticação em todas as funções: as core `upstatus` v480 (SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`) e `upstatus-team-lite` v15 (SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`) foram inspecionadas e validam `x-upstatus-token` com comparação timing-safe. A revisão rota-a-rota das outras funções ainda não está concluída.

A função Screen Share beta10 está ACTIVE v6, SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`. `upstatus-backup-327-pre328` permanece ACTIVE v1, mas o entrypoint retornado tem 0 bytes (SHA `3d6c4f8e5f777830ea720ab2938cb023b5a4e4c7d26f3fc02b926ce0e4d0dd90`). As funções backup 328 e 329 consultadas têm fontes não vazias. Não desativar nenhuma função; verificar consumidores e plano de rollback antes de qualquer decisão.

Os bundles core de produção não contêm `/room/open`, `/room/cancel-open`, `/room/resolve`, `consume_upstatus_signal_rate_limit`, `merge_chat_read_receipts` ou `Retry-After`. A função dedicada `upstatus-signal` não existe em produção. Nenhuma tabela/RPC de call attempts, voice attempts ou rate limit está no schema de produção.

**RT-01 continua crítico:** trigger `upstatus_messages_broadcast` habilitado para INSERT/UPDATE/DELETE em `public.messages`. `upstatus_broadcast_messages()` é SECURITY DEFINER, `search_path=public`, EXECUTE efetivo para anon/authenticated e serializa OLD/NEW completos com `to_jsonb`, enviando `{op, record}` para `db_change` com `private=false`. O conteúdo de mensagens e metadados de anexos continua no broadcast público. `upstatus_broadcast_remote_state()` e `upstatus_broadcast_users()` também permanecem SECURITY DEFINER, `search_path=public`, executáveis por anon/authenticated e publicam metadados em tópicos públicos.

Nove tabelas backend-owned (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) têm RLS ativo, zero policies e os oito privilégios efetivos de tabela para anon e authenticated: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN. `upstatus_visual_config` não tem grants de cliente. `realtime.messages` tem RLS ativo, zero policies e SELECT/INSERT/UPDATE para anon/authenticated. Grants não demonstram por si só acesso às linhas, pois o RLS está ativo sem policies; ainda assim, a superfície de privilégios é excessiva.

Default ACL de produção continua amplo: postgres em public/storage e supabase_admin em public/graphql/graphql_public. A sessão consultada é `current_user=postgres`, não superuser e não membro de `supabase_admin`; o role `supabase_admin` é superuser. Portanto, a conexão atual não pode alterar defaults pertencentes a esse owner. Security Advisor observado em 2026-11-06 16:29 UTC: 3 WARN de SECURITY DEFINER executável por anon, 3 WARN para authenticated e 10 INFO de RLS sem policies. Performance e Health sem findings.

### Supabase isolado — snapshot atual read-only

Projeto `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, região sa-east-1; 27 migrations até `20261106120851`. Funções: `upstatus-signal-test` v31, SHA `c69cd21dc606f552aa93c1f423d1151db1cdead26c39c0167b92554e8b9e3310`, e `upstatus-signal-e2e-once` v3, SHA `db0c9206b2171f5f5d67459e2e7451ecbaf6e8ad3c8f55cb4e491660164f5053`.

Tabelas de signaling consultadas têm RLS ativo, zero policies e sem SELECT/INSERT/UPDATE/DELETE para anon/authenticated; service_role mantém acesso. RPCs de call/voice attempts, rate limit e read receipts consultadas são SECURITY INVOKER, `search_path=""`, EXECUTE negado a anon/authenticated e permitido a service_role.

As três funções de broadcast candidatas permanecem SECURITY DEFINER, mas usam `search_path=pg_catalog, public`, não são executáveis por anon/authenticated e enviam somente `{op: TG_OP}`. Ainda usam `private=false`; o tópico e metadados de ocorrência continuam públicos. Advisor: 17 INFO de RLS sem policies, 4 índices antigos unused, sem WARN; Health sem findings. Defaults de postgres em public estão restringidos, mas defaults de postgres em storage e de supabase_admin em public/graphql/graphql_public continuam amplos.

Após o término dos dois workflows, uma consulta independente SELECT-only confirmou zero linhas em rooms, members, bindings, events, call attempts, voice attempts, rate-limit buckets, chat_reads, users, sessions e messages. **Laboratório livre e sem fixtures residuais no momento da consulta.** Não houve limpeza manual.

A linhagem da migration de voice attempts ainda precisa reconciliação: arquivo candidato versionado `20261106120500_voice_room_attempt_recovery.sql` (blob `2abab9e677b14673518e652d651d4be18a73ce94`, idêntico nos dois candidatos) e test migration blob `98f9cbf85fb272bf699ad1ece1101110c51b5ebd`; o banco registra `20261106120844` e `20261106120851`. Não reaplicar apenas para alinhar timestamps.

### Issues, revisão humana e aceitação manual

- [#78](https://github.com/Reekyi/UpStatus/issues/78) permanece aberta, 24 comentários e 0/8 critérios físicos marcados. O comentário [6686292254](https://github.com/Reekyi/UpStatus/issues/78#issuecomment-6686292254) registra a correção de screen-share offer/answer, mas os testes físicos continuam pendentes.
- [#79](https://github.com/Reekyi/UpStatus/issues/79) permanece aberta, 77 comentários e 16/35 checkboxes. O checkpoint [6686292943](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6686292943) está desatualizado em relação aos runs concluídos nesta seção; atualizar a issue antes de usá-la como snapshot de release.
- Ainda não houve teste físico no Tampermonkey instalado: offline/reload sem F5, microfone real, display capture, interoperabilidade Normal ↔ Team Lite e screen-share recovery físico.
- Nenhuma review humana foi submetida nas PRs #74/#75/#76/#82.

### Gates imediatos

1. Adicionar lock/promise de negociação por peer para screen share e regressões de concorrência de offers/respostas nos dois produtos.
2. Executar aceitação física da #78 nos dois userscripts instalados, incluindo quedas/reload offline, áudio bidirecional, microfone, captura de tela e interoperabilidade.
3. Recriar a proposta de Retry-After sobre o head atual; substituir DELETE ilimitado da migration divergente por limpeza limitada/agendada; integrar rate limit aos endpoints reais.
4. Resolver RT-01 com autorização Realtime privada ou substituto server-mediated e teste de autorização. Não basta manter payload mínimo em tópico público.
5. Resolver ACL-02 por caminho administrativo autorizado; não tentar alterar defaults de supabase_admin pela sessão postgres atual.
6. Reconciliar a linhagem das migrations e validar uma única sequência no TEST oficial, com rollback.
7. Coordenar API legacy beta10, novo endpoint, Normal 3.4.7 (com bump deliberado), Team Lite 3.4.31, manifests e rollback.
8. Revisar rota/auth de todas as 38 Edge Functions e os backups, especialmente o entrypoint vazio de pre328, sem desativar nada nesta auditoria.
9. Atualizar #79, obter reviews humanas e aprovação explícita de release.

Não declarar percentual de conclusão. Automated CI, code inspection, teste manual e produção implantada permanecem estados separados.

### Registro de segurança desta rodada

Nenhuma escrita SQL em produção, migration, deploy, merge, release, publicação de userscript, alteração de secret/flag/role ou operação destrutiva foi realizada. Todas as consultas SQL foram SELECT-only. Os workflows #74/#76 foram iniciados pela engenharia/GitHub e apenas inspecionados; os testes mutáveis usaram mutation guard, allowlist do projeto isolado e opt-in explícito. A auditoria não iniciou workflows nem testes mutáveis. Fixtures foram verificadas por SELECT após ambos os runs. A única escrita desta auditoria é este append documental na branch QA, com o blob SHA atual como precondição.

## Revalidação independente — screen-share serialization, exact-head CI e fronteira de produção (2026-11-06, 14:35 BRT)

Esta seção supersede conclusões anteriores quando o HEAD, run ou evidência diferir. A inspeção começou pela leitura deste arquivo no branch QA. Os quatro PRs, as duas issues, os workflows e os dois projetos Supabase foram reconsultados. As consultas SQL foram executadas sequencialmente por projeto e somente com SELECT.

### Refs reais e estado exato dos PRs

| PR | Branch → base | HEAD exato | Comparação com a base | Evidência mais recente |
|---|---|---|---:|---|
| #74 Normal | `chore/continuity-foundation` → `master` | `05c9b4d59b74202e718bec77746746b7aa19632f` | 753 ahead / 0 behind | Validate [42260571956](https://github.com/Reekyi/UpStatus/actions/runs/42260571956) SUCCESS; Smoke [42260571690](https://github.com/Reekyi/UpStatus/actions/runs/42260571690) IN PROGRESS |
| #75 Team Lite baseline | `team-lite/3.4.31-guest-fixes` → `team-lite-official` | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 59 ahead / 0 behind | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) histórico SUCCESS |
| #76 Team Lite candidate | `team-lite/signaling-transport-candidate` → `team-lite-official` | `b784daa63447cda1675dd45f6daccdaf5c2c8973` | 249 ahead / 0 behind `team-lite-official`; 190 ahead / 0 behind #75 | Candidate Checks [42260582180](https://github.com/Reekyi/UpStatus/actions/runs/42260582180) PENDING, ainda sem job |
| #82 QA | `qa/release-readiness-2026-11-04-master` → `master` | `cd85c53157161ca12d70e65c8843183ae8006140` | 67 ahead / 0 behind | Validate [42253902143](https://github.com/Reekyi/UpStatus/actions/runs/42253902143) FAILURE herdada |

Refs base confirmados: `master=a9288ccfcb0f308d3a587bfca624418a395be07b`; `team-lite-official=9065bc1536fde64f437f6f12b7abb9b072cb8281`. Todas as quatro PRs continuam abertas, Draft, não mescladas e mergeable. Nenhuma review humana foi submetida em #74, #75, #76 ou #82.

**Normal #74:** o Validate do HEAD atual passou. No Smoke atual, syntax/static harnesses e endpoints não autenticados passaram; a integração autenticada/browser ainda está em execução. Rate-limit concurrency, read-receipt concurrency e cleanup final aguardam. O Smoke completo anterior [42250699210](https://github.com/Reekyi/UpStatus/actions/runs/42250699210) passou no HEAD imediatamente anterior `e585447d092bcb385ab6e5b16044d85e6674e3e3`, não no HEAD atual.

**Team Lite #76:** o HEAD atual está quatro commits à frente do último HEAD integralmente aprovado `eaeb3fbb6f9f2c7971e93ed6ce7cc353fba2d227`. O run atual está na fila compartilhada e ainda não criou job. O PASS anterior [42250709207](https://github.com/Reekyi/UpStatus/actions/runs/42250709207) é evidência histórica do HEAD anterior, não aprovação do SHA atual. A comparação entre os dois heads mostra alterações somente em `scripts/screen-share-recovery.test.mjs` e no userscript Team Lite.

**PR #82:** o run [42253902143](https://github.com/Reekyi/UpStatus/actions/runs/42253902143) falhou em `scripts/validate.mjs:26` com `VALIDATION FAILED: production updateURL mismatch`. O build reportou `UpStatus 3.4.7 / TEST 3.4.7`. A PR altera somente este Markdown; não enfraquecer o validador para mascarar a divergência herdada de master.

### Correção explícita da conclusão anterior sobre screen share

A conclusão anterior de que faltava lock por peer está **superada** pelo código atual. Os dois clients agora possuem `screenShareQueuePeerOperation()` e `negotiationPromise`, serializando operações locais e remotas por peer. A fila cobre criação de offer, aplicação de remote offer/answer e processamento de ICE; o código verifica a identidade do peer depois de operações WebRTC assíncronas e aplica glare handling determinístico com rollback no peer polite.

Os arquivos atuais confirmam:
- Normal userscript blob `f1180be64dfd2819ad9f91cfdf043e6e4c08b1ca`.
- Team Lite userscript blob `9960a7eb8de634af939bbab3f5f3940c1b7ea75c`.
- Teste compartilhado, byte-identical nos dois branches: `scripts/screen-share-recovery.test.mjs`, blob `622856c2bd794ac55ce77b98ac54a496e08f043a`.

A regressão VM cobre ofertas locais concorrentes, colisão simultânea local/remota com peers polite/impolite, offers remotos duplicados concorrentes (uma resposta criada e a resposta em cache retransmitida), descarte de peer durante createOffer, retries limitados a três e limpeza de timers. O comentário de engenharia [#79, 6691193761](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6691193761) registra a mesma correção nos dois produtos.

**Classificação atual:** CODE INSPECTION confirma a fila por peer; AUTOMATED STATIC/VM passou na etapa inicial do Smoke Normal atual. O Candidate Checks Team Lite do HEAD atual ainda está PENDING. Não houve teste físico de screen share no Tampermonkey. A lacuna de negociação concorrente foi fechada no código/teste; a aceitação física permanece MANUAL PENDING.

### Rate limit e Retry-After: branch divergente não promovível como unidade

A branch `normal/rate-limit-retry-after-20261106` permanece divergente do HEAD atual de #74:
- 10 commits exclusivos na branch de rate limit.
- 18 commits exclusivos no HEAD atual de #74.
- Merge-base `94513c106d42cb8d77ab9a1c11ff7c9bfa610ba6`.

A migration `20261106133500_distributed_signaling_rate_limit.sql`, blob `41ed8aa2cb1a970a9823073c5e1a33d60a7ed9ab`, ainda executa um `DELETE` sem limite de lote dentro da RPC chamada no caminho de requisição quando `hashtext(bucket_key) mod 64 = 0`. O trabalho pode crescer proporcionalmente a todos os buckets expirados, gerando latência, IO e locks justamente no endpoint protegido. Não promover essa migration nem cherry-pick/fast-forward da branch inteira. Recriar a mudança sobre o HEAD atual com limpeza limitada ou rotina agendada.

A branch de rate limit acrescenta `Retry-After: 60` e expõe o header via CORS. O endpoint isolado v31 ainda não inclui `Retry-After`. Os templates de servidor Normal e Team Lite chamam `merge_chat_read_receipts`, mas não chamam `consume_upstatus_signal_rate_limit` e não expõem as rotas `/room/open` e `/room/cancel-open`. A implementação distribuída continua fora do caminho real do produto.

### Supabase — snapshots sequenciais read-only

**Produção `dlfvkawaiqduhlazsszm`:**
- ACTIVE_HEALTHY; PostgreSQL 17.11.0.002; região us-west-2.
- Sete migrations até `20261027155438`.
- As tabelas/RPCs candidatas de call attempts, voice-room attempts, rate limits e read receipts estão ausentes. `to_regclass`/`to_regprocedure` retornaram false para os objetos consultados.
- Nenhuma migration candidata foi aplicada nesta auditoria.

**Isolado `bfpjtfqlnypisxljoxkb`:**
- ACTIVE_HEALTHY; PostgreSQL 17.11.0.003; região sa-east-1.
- 27 migrations até `20261106120851`.
- Call attempts, voice attempts, rate limits, rooms e RPCs correspondentes estão presentes.

As tabelas server-owned do projeto isolado têm RLS ativo, zero policies e nenhum privilégio direto de SELECT/INSERT/UPDATE/DELETE para anon/authenticated. As RPCs examinadas são SECURITY INVOKER, `search_path=""`, EXECUTE negado a anon/authenticated e permitido a service_role.

A linhagem da migration de voice attempts continua divergente: arquivo candidato `20261106120500_voice_room_attempt_recovery.sql`, enquanto o banco registra `20261106120844`; o test migration registra `20261106120851`. Não reaplicar apenas para alinhar timestamps.

### RLS, grants, SECURITY DEFINER, Realtime e default ACL

**Produção:** as nove tabelas backend-owned `chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing` e `users` têm RLS ativo, zero policies e os oito privilégios de tabela para anon e authenticated: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN. `upstatus_visual_config` não concede esses privilégios. `realtime.messages` tem RLS ativo, zero policies e SELECT/INSERT/UPDATE para anon/authenticated. Os grants não demonstram acesso às linhas sem policy, mas mantêm uma superfície de privilégios desnecessária.

Os três broadcasts de produção continuam SECURITY DEFINER, `search_path=public` e EXECUTE para anon/authenticated. Os triggers continuam habilitados:
- `public.messages`: INSERT/UPDATE/DELETE → `upstatus_broadcast_messages()`.
- `public.upstatus_state`: atualização de remote-status → `upstatus_broadcast_remote_state()`.
- `public.users`: atualização de status/reason/updated_at/sync → `upstatus_broadcast_users()`.

**RT-01 continua CRÍTICO:** `upstatus_broadcast_messages()` serializa OLD/NEW completos com `to_jsonb` e envia `{op, record}` para `db_change` usando `private=false`. Texto da mensagem e metadados de anexos continuam no broadcast público. Remote-state e user-status também continuam em tópicos públicos e transmitem metadados operacionais.

No projeto isolado, os três broadcasts candidatos usam `search_path=pg_catalog, public`, negam EXECUTE a anon/authenticated e publicam somente `{op: TG_OP}`. Ainda usam `private=false`: o tópico e a ocorrência/frequência de eventos continuam públicos, embora o conteúdo das mensagens tenha sido removido do payload. `realtime.messages` mantém SELECT/INSERT/UPDATE para anon/authenticated nos dois projetos, com RLS e zero policies.

**ACL-02:** na produção, os default privileges de postgres em public/storage e de supabase_admin em public/graphql/graphql_public continuam amplos para anon/authenticated. A sessão é `current_user=postgres`, não superuser e não membro de `supabase_admin`; o role `supabase_admin` é superuser. Não há autoridade suficiente nesta sessão para corrigir defaults pertencentes a esse owner. No isolado, defaults de postgres em public foram restringidos; defaults de postgres em storage e de supabase_admin continuam amplos.

Security Advisor observado em 2026-11-06 17:35 UTC:
- Produção: 3 WARN SECURITY DEFINER executáveis por anon, 3 WARN executáveis por authenticated, 10 INFO RLS sem policies; Performance e Health sem findings.
- Isolado: 17 INFO RLS sem policies, 4 INFO índices unused; nenhum WARN de SECURITY DEFINER; Health sem findings.

### Edge Functions e cutover

Produção contém 38/38 Edge Functions ACTIVE; todas reportam `verify_jwt=false`. Isso não prova ausência de autenticação de aplicação. As fontes atuais das funções core `upstatus` v480 (SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`), `upstatus-team-lite` v15 (SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`) e Screen Share beta10 v6 (SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`) contêm validação própria de `x-upstatus-token` e comparação timing-safe nas funções core inspecionadas.

Os bundles core implantados não contêm `/room/open`, `/room/cancel-open`, `/room/resolve`, `consume_upstatus_signal_rate_limit`, `merge_chat_read_receipts` ou `Retry-After`. O endpoint dedicado `upstatus-signal-test` v31 e suas rotas de open/cancel/resolve existem somente no projeto isolado. Não apontar clientes de produção para essa função de teste.

`upstatus-backup-327-pre328` continua ACTIVE v1, mas seu entrypoint retornado tem zero bytes (SHA `3d6c4f8e5f777830ea720ab2938cb023b5a4e4c7d26f3fc02b926ce0e4d0dd90`). Não desativar sem identificar consumidores e rollback.

O build Normal ainda gera `CLOUD_SERVER` para `/functions/v1/upstatus-screen-share-3-1-1-beta10`, enquanto `release.json` publica o userscript via `/functions/v1/upstatus/upstatus.user.js`. O manifest Normal continua em 3.4.7; Team Lite em 3.4.31, com URL oficial apontando para `team-lite-official`. A API legacy e o URL do artefato são destinos diferentes; o cutover exige coordenação e rollback explícitos.

### Issues e aceitação manual

- [#78](https://github.com/Reekyi/UpStatus/issues/78): aberta, 24 comentários, 0/8 critérios físicos marcados. Queda/reconexão sem F5, Tampermonkey instalado, áudio bidirecional, microfone, captura real de tela e interoperabilidade continuam MANUAL PENDING.
- [#79](https://github.com/Reekyi/UpStatus/issues/79): aberta, 78 comentários; o corpo principal mantém 16/35 checkboxes (19 pendentes). O comentário de engenharia [6691193761](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6691193761) atualiza a correção de screen-share e o estado dos runs, mas o corpo/checklist ainda não reflete integralmente a fotografia atual.
- Nenhum teste físico de Tampermonkey foi executado pela auditoria.

### Gates imediatos

1. Concluir o Smoke Normal [42260571690](https://github.com/Reekyi/UpStatus/actions/runs/42260571690) no SHA exato; depois do término, confirmar cleanup por SELECT.
2. Executar Candidate Checks Team Lite [42260582180](https://github.com/Reekyi/UpStatus/actions/runs/42260582180) no SHA exato `b784daa`.
3. Manter a correção de negociação por peer e os testes concorrentes; completar aceitação física de screen share e reconexão na #78.
4. Recriar Retry-After e rate limit sobre o HEAD atual, removendo DELETE ilimitado do caminho de requisição e integrando a RPC aos endpoints reais.
5. Resolver RT-01 com canal privado/autorização real ou substituto server-mediated. Minimizar payload em tópico público não fecha a exposição de metadados.
6. Resolver ACL-02 por caminho administrativo autorizado, incluindo defaults de supabase_admin e revisão de grants de realtime.messages.
7. Reconciliar migrations, ensaiar sequência e rollback no TEST oficial, e coordenar endpoint beta10, endpoint novo, versões e manifests.
8. Revisar rota/auth das 38 Edge Functions e dependências dos backups; atualizar o corpo da #79, obter reviews humanas e aprovação explícita de release.

Não declarar percentual de conclusão. Automated CI, code inspection, manual acceptance e produção implantada continuam estados separados.

### Registro de segurança desta rodada

Nenhuma escrita SQL em produção, migration, deploy, merge, release, publicação de userscript, alteração de secret/flag/role ou operação destrutiva foi realizada. Todas as consultas SQL foram SELECT-only e executadas sequencialmente por projeto. Os workflows #74/#76 foram executados pela engenharia/GitHub e apenas inspecionados; a auditoria não iniciou workflows nem testes mutáveis. O Smoke Normal estava ativo ao encerrar a consulta; não houve cleanup manual nem contagem de fixtures durante a execução. A única escrita desta auditoria é este append documental na branch QA, com o blob SHA atual como precondição.
