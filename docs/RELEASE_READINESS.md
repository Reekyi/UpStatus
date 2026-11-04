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
