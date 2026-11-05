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
