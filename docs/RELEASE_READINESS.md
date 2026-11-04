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
