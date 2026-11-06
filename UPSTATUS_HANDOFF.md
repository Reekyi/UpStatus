# UpStatus Handoff

**Last verified:** 2026-11-04 11:39 BRT  
**Repository:** https://github.com/Reekyi/UpStatus  
**Purpose:** Continue release-readiness work in a new ChatGPT conversation without repeating discovery or losing decisions.

> This is a verified checkpoint, not permission to merge, deploy, publish, change production flags, apply production migrations, or alter production Supabase. Re-check live refs and runtime state before any action.

## Operating rules

- Keep PRs #74, #75, and #76 open and Draft while work or validation remains.
- Never merge any PR unless Ricardo explicitly authorizes that merge.
- Never deploy/publish, change production feature flags, apply production migrations, alter production Supabase, or modify secrets without explicit, specific approval.
- Isolated/test environments only. Do not infer that isolated validation proves production readiness.
- Preserve existing chat history, Lucca/Ycaro separation, user sessions, and user data.
- Do not ask Ricardo to repeat the no-F5 reconnect test unless a material new code change makes a fresh test necessary. The test has already been requested and remains a release gate.
- Do not lower the structural-completion percentage just because release-readiness/security gates remain. Track **engineering structure** separately from **production readiness**. The prior 78% answer was an unsupported metric and must not be reused.

## Current PR checkpoint (GitHub verified 2026-11-04)

| PR | Branch | Base | Head SHA | State | CI evidence |
|---|---|---|---|---|---|
| #74 Normal | `chore/continuity-foundation` | `master` | `2219a1b297545f8e894aa39c2e3a70038903c0a7` | Open, Draft, not merged | Validate run 41714075786: success; Signaling Smoke 41714075798: success |
| #75 Team Lite baseline | `team-lite/3.4.31-guest-fixes` | `team-lite-official` | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Open, Draft, not merged | Candidate Checks 41674353127: success |
| #76 Team Lite signaling | `team-lite/signaling-transport-candidate` | `team-lite-official` | `ab650607c4b83a710539e29a581856afec7c57cd` | Open, Draft, not merged | Candidate Checks 41713749993: success |

PRs #74-#76 are on separate product/release lines. Do not combine or retarget them casually. Current GitHub metadata reported mergeable=true for these PRs, but that is not a substitute for review, checks, or release approval.

### CI evidence recorded in issue #79

- Normal #74: Validate passed; Signaling Smoke passed. The latest recorded smoke evidence includes 14/14 unauthenticated checks, 86/86 authenticated checks, Chromium WebRTC call audio, voice-room audio, screen-share video, three-member mesh, teardown, and fixture cleanup.
- Team Lite #76: Candidate Checks passed with 14/14 unauthenticated and 86/86 authenticated checks, Chromium media negotiation/teardown, and portal/session/updater validations.
- Team Lite #75: Candidate Checks passed for manifest, syntax, portals, session isolation, and updater scenarios.
- CI is evidence for automated candidate behavior only. It does not prove physical network recovery in Tampermonkey, real microphone/display permissions, or production safety.

## Release blockers / work remaining

### 1. Network recovery without F5 — issue #78

- The acceptance criteria remain unchecked for both Normal and Team Lite.
- Candidate source has offline/online recovery logic, but current CI does not reproduce a real internet outage in the full userscript/Tampermonkey environment.
- Required real-browser acceptance: disconnect internet for about 10 seconds during a voice room, reconnect without F5, re-enter room, initiate/receive a new call, verify two-way audio, repeat in both product directions, ensure online peers remain healthy, and confirm no duplicate audio, orphan peers, or duplicate polling.
- Do not mark complete until Ricardo confirms the physical test. Do not re-request the test unless a material candidate change makes a new test necessary.

### 2. Real Tampermonkey and device validation

Still required for the release candidates:
- Separate Normal and Team Lite Tampermonkey profiles.
- Real microphone permission, audio capture/playback, mute/unmute.
- Real display/tab capture and stop-sharing.
- Normal ↔ Team Lite calls and voice rooms in both directions.
- GM bridge/authenticated flow where enabled, using the isolated environment.
- Browser/UI behavior and session isolation.

### 3. Security and Realtime migration

Issue #79 records the following gates:
- RT-01: legacy Realtime topic remains public.
- RT-05, RT-08, RT-09, RT-10, RT-11, RT-12, RT-15, RT-16 remain partial pending proof.
- Production Security Advisor previously reported three broad EXECUTE grants on SECURITY DEFINER broadcast functions and unnecessary anon/authenticated table grants on nine backend-owned tables. Recheck current catalog before action; RLS/no-policy means do not assume public row access is proven.
- Candidate migrations exist in PR #74 and were validated only in an isolated project. They have not been applied to production or official TEST.
- Realtime message table grants and public topic behavior need an explicit, reviewed migration/rollout plan.
- Rate limiting was previously found local to an Edge Function isolate, not globally distributed; retry idempotency and full call-state lifecycle are incomplete. Recheck candidate code/tests before changing anything.
- No production migration, function deployment, flag change, or secret change is authorized by this handoff.

### 4. Normal backend cutover / version alignment

- PR #74 candidate Normal userscript still targets the legacy `upstatus-screen-share-3-1-1-beta10` API endpoint, while the candidate builds a separate `upstatus` function.
- The 5-second session-cache revalidation in the candidate does not automatically apply to the currently targeted legacy function; prior inspection found the active legacy function still had a 30-second cache.
- Do not change endpoint or deploy one side independently. Define and review a coordinated client/API/auth/signaling cutover plus rollback.
- Candidate release metadata/version bump is required before distributing changed code; never ship modified code under an unchanged version.

### 5. Chat regression — issue #24

- Root causes and real-world behavior remain unverified.
- Required: previously read messages stay read after F5, status changes, Realtime reconnect, and chat reopen; opening chat lands at newest messages after async history/layout without breaking intentional scrollback.
- Audit seven prior beta attempts and related PRs before any cherry-pick/merge. Related PR histories diverge; do not blindly merge.
- Sale Smartly manual confirmation remains pending.

### 6. Ycaro — issue #16 / PR #17

- Ycaro frontend and backend routes exist in prior verified sources. Production `upstatus` v480 and `upstatus-test` v281 were observed to contain `/api/ycaro/login` and `/api/ycaro/logout`; login reads `YCARO_PASSWORD`.
- Presence/value of the secret cannot be verified through connected tools. Do not assume present or absent; never request or write the secret value in GitHub.
- PR #17 is open and non-mergeable, based on `develop`; its old branch is divergent. Do not merge/rebase blindly.
- Decide whether Ycaro is in this release or explicitly defer it. Do not let an unrelated Ycaro branch block the Normal/Team Lite core release if scope can be cleanly separated.

### 7. Documentation — issue #14 / PR #15

- PR #15 is open, not Draft, and currently reports mergeable=false. It targets `develop`; inspect its exact divergence/checks before any merge.
- This handoff file is a new checkpoint branch artifact. It is not yet merged into any shared branch.

## Work strategy to finish the core release

1. Re-fetch current PR heads and issue states; do not repeat the full historical discovery unless refs moved.
2. Review the current code/tests for each explicit gate, then make only narrow candidate-branch fixes with regression coverage.
3. Prioritize Normal/Team Lite core stability: reconnect lifecycle, signaling idempotency/call state, version/endpoint cutover plan, and real browser validation.
4. Close security gates with a documented isolated migration test and a production rollout/rollback plan. Production remains untouched until separately approved.
5. Separate unrelated chat/Ycaro/documentation scope from the core release where safe; keep those tasks tracked and do not claim completion without evidence.
6. Update issue #79 only when there is new material evidence or a gate changes.
7. Before declaring the core release ready, ensure candidate PR checks pass on their exact current heads, manual browser/device checks are recorded, migration/cutover plan is reviewed, and Ricardo explicitly approves any release action.

## Prior security observations to re-check, not blindly assume current

- Production: public legacy Realtime topic; three SECURITY DEFINER broadcast functions with broad EXECUTE warnings; nine backend-owned tables had anon/authenticated CRUD grants while RLS/no policies were enabled.
- Isolated project: several trigger-only functions/tables were hardened; public Realtime topic and realtime.messages grants remained notable exceptions.
- An earlier audit found 38 ACTIVE Edge Functions in production, all with `verify_jwt=false`; this does not prove anonymous access because application-level validation may be present. Four operational endpoints were identified and many old beta/test variants. Inventory before deactivation; do not disable functions blindly.
- An earlier isolated test left expired room/session/member/binding fixtures; cleanup was test-scoped, not a global production cleanup.

## Continuation prompt for a new ChatGPT chat

Continue UpStatus release-readiness in https://github.com/Reekyi/UpStatus. First read `docs/PROJECT_GUIDE.md`, `docs/CURRENT_STATE.md`, and `UPSTATUS_HANDOFF.md` from the relevant branches. Re-fetch live PRs #74, #75, #76 and issues #78, #79, #24, #16, #14 before acting. Continue from this checkpoint without repeating completed discovery. Prioritize finishing the Normal and Team Lite core release gates and making concrete candidate-branch fixes with regression tests. Keep PRs open and Draft; never merge. Never deploy/publish, change production flags, apply production migrations, alter production Supabase, or change secrets without Ricardo's explicit specific approval. Do not claim browser/manual validation without Ricardo's evidence. Do not ask again for the no-F5 test unless a material new code change requires a fresh test. Track structural completion separately from production readiness; do not reuse the unsupported 78% figure. Update this handoff and the project's current-state record after meaningful work.


## 2026-11-04 candidate regression-test checkpoint

- Normal PR #74 head advanced with commit `00a2fbede2eb2088921bd0c8ca4b07d7b8d59d1c`. Added assertions that the online handler restarts Realtime and `startRealtime()` recreates the authenticated signaling transport for both production and TEST artifacts. UpStatus Validate run `41850211413` passed; Signaling Smoke run `41850210903` was still in progress at last inspection.
- Team Lite PR #76 head advanced with commit `a3409dfe7b5ebb8a46073c086650a0d2f67ff44e`. Added equivalent assertion to Team Lite candidate checks. Exact-head CI status still needs confirmation.
- These changes add regression guards; they do not claim the physical no-F5 browser scenario is fixed or validated. No runtime behavior changed.


## CI refresh — 2026-11-04 11:48 BRT

- Team Lite PR #76 exact head `a3409dfe7b5ebb8a46073c086650a0d2f67ff44e` passed Candidate Checks run `41850263270`. Full job `126644365017` was inspected. Evidence: adapter tests and endpoint authentication passed; 86/86 authenticated integration checks passed; Chromium call audio, voice-room audio, and screen-share video negotiation/remote track delivery passed; dynamic invitation/fanout and all three pairwise links in the three-member mesh passed; teardown and fixture cleanup passed; Team Lite candidate/version/portal/session/updater checks passed, including the new reconnect transport reinitialization assertion.
- Normal PR #74 exact head `00a2fbede2eb2088921bd0c8ca4b07d7b8d59d1c`: UpStatus Validate run `41850211413` passed. Signaling Smoke run `41850210903` remained in progress in the authenticated integration/browser step at the last check. Do not claim the Normal signaling smoke passed until its run and full job logs are inspected.
- These tests validate authenticated signaling integration and WebRTC negotiation in Chromium. They still do not simulate a physical internet outage through the full Tampermonkey userscript, so issue #78 remains open.


## CI completion — 2026-11-04 11:50 BRT

- Normal PR #74 exact head `00a2fbede2eb2088921bd0c8ca4b07d7b8d59d1c`: UpStatus Validate `41850211413` SUCCESS; Signaling Smoke `41850210903` SUCCESS. Full job `126644179048` logs inspected: 14/14 unauthenticated checks, 86/86 authenticated integration checks, Chromium call/voice/screen WebRTC remote-track delivery, three-member mesh, teardown, and isolated fixture cleanup passed.
- Team Lite PR #76 exact head `a3409dfe7b5ebb8a46073c086650a0d2f67ff44e`: Candidate Checks `41850263270` SUCCESS. Full job `126644365017` logs inspected: 86/86 authenticated integration checks, Chromium call/voice/screen WebRTC, dynamic invitation/fanout, all three mesh links, teardown, fixture cleanup, Team Lite version/portal/session/updater checks, and new reconnect assertion passed.
- Only observed workflow warning: non-blocking Node 20 deprecation notice for `actions/checkout@v4` (runner currently forces Node 24).
- This confirms automated candidate tests only. Issue #78 still requires physical network interruption/recovery in the complete Tampermonkey userscript; no runtime code change in these two commits and no production action occurred.


## Latest documentation pointer

- Handoff is maintained in draft PR #80 targeting `develop` on branch `docs/continuity-handoff-2026-11-04`; fetch the live PR head before making any follow-up edit.
- Issue #78 received the 2026-11-04 CI evidence comment `6633705412`; issue #79 was updated with the completed CI evidence in comment `6633632371`.
- Normal and Team Lite candidate regression checks are green on the exact heads recorded above. The one remaining acceptance check that cannot be established by this remote CI is the physical Tampermonkey no-F5 network recovery test.


## 2026-11-04 follow-up: stopAll lifecycle coverage and CI trigger filters

- Normal #74: added a behavioral adapter regression test in `scripts/signaling-transport.test.mjs`, commit `fdfa4976a9a9dcbe7691c418b858a060aed3a806`. It starts an in-flight authenticated poll, calls `stopAll()`, verifies AbortSignal cancellation, no stale event dispatch, zero active poll slots, and rejection of new pollers on the stopped instance. Normal Validate run `41851743792` passed. Normal Signaling Smoke run `41851743859` was still pending/queued at the last check; inspect before claiming pass.
- Team Lite #76: copied the same behavioral adapter regression test, commit `b4f8734b6af6b190f78f01e569b61336c915e6d8`, and fixed `.github/workflows/team-lite-candidate.yml` path filters to watch both `scripts/signaling-transport.test.mjs` and `src/userscript/signaling-transport.mjs`, commit `499c91281ed701eae2449023b2f5c948838000dc`. This closes a CI blind spot where the workflow executed the shared adapter test but edits to that test/module did not themselves trigger the workflow.
- Team Lite Candidate Checks run `41851948810` was in progress at last check. The new adapter lifecycle test passed, and isolated endpoint authentication step passed; authenticated integration/browser step was still running. Inspect final run and logs.
- These changes add test coverage and CI trigger coverage; no runtime application behavior changed. No production resource was changed.


## CI trigger and serialization follow-up — 2026-11-04 11:55 BRT

- Normal #74 latest head: `52266026c77f0f3a3cdf2512049ea1db7fb3b8ad`. UpStatus Validate run `41852107050` passed. Signaling Smoke run `41852107018` was cancelled before a job was created; earlier run `41851743859` remained pending. The new commit adds the shared adapter source/test to the PR path filters, but a successful smoke run on this exact head is still required.
- Team Lite #76 latest head: `665ed9a3c7123dfcee51b709169aca27a88ee840`. Added adapter stopAll test in `b4f8734b6af6b190f78f01e569b61336c915e6d8`; Candidate Checks run `41851948810` reached and passed adapter test + isolated endpoint auth, but authenticated integration/browser step was still running at last inspection. New run `41852223087` for the latest head was queued.
- CI workflow hardening: Team Lite workflow now watches shared adapter source/test paths and uses the same global concurrency group as Normal because both test workflows mutate the same isolated Supabase fixture project. This prevents cross-workflow fixture races in future runs. Commit `665ed9a3c7123dfcee51b709169aca27a88ee840`.
- Issue #79 comment `6633856944` records this checkpoint. No runtime application code or production resource was changed.


## Chat unread root-cause candidate — 2026-11-04

- Issue #24 investigation found a false-read window: the fast route derived unread count from `last_read_at`, while `readRoute` advanced that cursor to request-processing time even though the browser sent a snapshot of message IDs. Messages arriving after the snapshot but before request handling could be counted read without being in the per-message receipt map.
- PR #74 now computes unread count from per-message receipts in both full and fast routes, and only advances `last_read_at` to the newest valid message timestamp included in the read batch. Empty/invalid batches do not advance the cursor.
- Added behavioral regression in `scripts/chat-regression.test.mjs` for persisted read receipts after refresh, a message arriving after the snapshot, another user's receipt, own messages, and system messages.
- Normal Validate run `41853971245` passed on head `fb1417ab69a16b0bf30611df5584e8d0d3466076`. Team Lite Candidate Checks run `41852223087` passed on head `665ed9a3c7123dfcee51b709169aca27a88ee840`.
- Normal Signaling Smoke run `41853971486` was queued at last check.
- **Not resolved:** read receipt map still uses a read-modify-upsert. Concurrent requests on separate Edge Function isolates can overwrite each other's JSONB updates. An atomic database-side merge and isolated concurrency test remain required before closing #24. No migration or database change was applied; no production changes.


## Isolated Supabase grant audit — 2026-11-04

- Read-only catalog checks on isolated project `bfpjtfqlnypisxljoxkb`: all three trigger-only SECURITY DEFINER broadcast functions deny EXECUTE to `anon` and `authenticated`; `service_role` retains EXECUTE.
- Backend-owned chat, users, sessions, signaling, status and typing tables have RLS enabled and no client SELECT/INSERT grants. Exception: `public.upstatus_visual_config` still grants SELECT/INSERT to both client roles. RLS is enabled with no policies, so row access is not established by this grant alone, but the grants are unnecessary.
- `realtime.messages` also has RLS enabled with no policies and retains anon/authenticated SELECT/INSERT grants. RT-17 added to the matrix; no direct row access inferred.
- Security Advisor: 14 INFO RLS-enabled/no-policy notices. Performance Advisor: five unused-index INFO notices. No WARN/ERROR items in the returned advisor results.
- Updated RT-14 to PARTIAL and added RT-17 in PR #74's `docs/REALTIME_SECURITY_TEST_MATRIX.md`. No migrations applied and no production/official TEST changes.
- A reviewed migration is still needed to remove the unnecessary visual-config and realtime.messages grants in isolation. Supabase CLI is not available in this execution environment; do not invent a migration timestamp or bypass the CLI migration workflow.


## Workflow runtime guard — 2026-11-04

- Added `timeout-minutes: 30` to the Normal signaling smoke job and Team Lite candidate-check job. Commits: Normal `7c701ca8394ddb06ded053aca79ccb9c9f5d536e`, Team Lite `11682880132c9d626a08d8120d1d794dec0bb21c`.
- The two workflows share one global concurrency group for the same isolated Supabase fixtures. The timeout applies to future runs; an already-running earlier job retains its original timeout. Issue #79 comment `6634174996` records the change.


## CI duplicate-run correction — 2026-11-04

- Removed the redundant `push` trigger from Normal and Team Lite isolated smoke workflows. Both PR and manual dispatch triggers remain. The same branches were producing duplicate push + pull_request runs against one isolated Supabase fixture project, replacing queued runs in the shared concurrency group.
- Global serialization and 30-minute job timeouts remain. Commits: Normal `5d700050dfbd8e221be7d61e130585dde2003879`, Team Lite `2d1fa7d1d66655bf7081362330edafe9ea54a9a8`. Issue #79 comment `6634230737` records this change.


## Latest CI confirmation — 2026-11-04 15:10 UTC

- Normal Validate run `41854832531`: SUCCESS on latest Normal PR head `5d700050dfbd8e221be7d61e130585dde2003879`.
- Normal Signaling Smoke run `41853971486`: SUCCESS, including unauthenticated endpoint checks and authenticated integration/browser step. It ran on `fb1417ab69a16b0bf30611df5584e8d0d3466076`; subsequent Normal commits were workflow/docs-only and did not alter runtime signaling code.
- Team Lite Candidate Checks run `41854846745` is in progress on latest workflow head `2d1fa7d1d66655bf7081362330edafe9ea54a9a8`. Adapter regression and unauthenticated endpoint steps passed; authenticated integration/browser step is still running. Earlier run `41852223087` passed on the previous candidate head.
- Issue #79 comment `6634243752` records the evidence.



## 2026-11-05 10:00 BRT — Normal fixture guard ported; exact-head smoke pending

### Engineering branch and CI evidence

- Normal PR #74 remains open and Draft on `chore/continuity-foundation`. Its current HEAD is `0150ac0276a55bd32fbb46acc68c15df5b5403d0`.
- Commit `db08471c58aed97344dbbea59d7cc91eb8038e02` ports the Team Lite isolated-fixture guard to Normal:
  - exact allowlist for `https://bfpjtfqlnypisxljoxkb.supabase.co`;
  - requires service-role key and `UPSTATUS_SIGNAL_ALLOW_MUTATION=1`;
  - performs a read-only PostgREST preflight before fixture mutation;
  - removes SKIP/exit-0 behavior from direct rate-limit and read-receipt fixture tests;
  - protects the authenticated runner and browser harness;
  - makes the workflow fail closed when the isolated secret is missing;
  - adds unit and static wiring checks, including the workflow's explicit opt-in/fail-closed contract.
- The first smoke attempt on `db08471` failed only because `scripts/signaling-static.test.mjs` still asserted that missing secrets must SKIP. That stale assertion was corrected in commit `0150ac0276a55bd32fbb46acc68c15df5b5403d0` to require fail-closed behavior.
- On exact HEAD `0150ac0`: UpStatus Validate run [42032008035](https://github.com/Reekyi/UpStatus/actions/runs/42032008035) is SUCCESS. Signaling Smoke run [42032007996](https://github.com/Reekyi/UpStatus/actions/runs/42032007996) was IN_PROGRESS at this checkpoint: syntax/static checks (including the new isolation guard and wiring tests) passed, unauthenticated isolated endpoint checks passed, authenticated integration/browser checks were still running, and the rate-limit/read-receipt concurrency steps had not started. Do not claim full smoke success until the run completes and its logs are inspected.
- Team Lite PR #76 remains open and Draft at HEAD `578ba8a44dd67401a4bad0db897980c91fea3df5`. Candidate Checks [42024542507](https://github.com/Reekyi/UpStatus/actions/runs/42024542507) completed SUCCESS. Full job logs confirm the guard preflight, 86/86 authenticated integration checks, 90 accepted plus one 429 endpoint response, distributed rate-limit concurrency, atomic read-receipt concurrency, and candidate/version/portal checks.
- Team Lite baseline PR #75 remains open and Draft at `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; its baseline Candidate Checks run `41674353127` passed. PR #76 is 101 commits ahead and zero behind #75; it carries the baseline and should not be treated as an independent merge candidate.
- Documentation PR #80 itself remains Draft. Its latest recorded Validate run `41855199729` failed on the pre-existing `client signed upload helper missing` assertion. Independent QA PR #82 remains Draft; its latest Validate run `42029048298` failed on `production updateURL mismatch`. Do not alter the QA branch or weaken either validator without proving the expected production artifact.
- Issue #78 remains open. Physical no-F5 network recovery in Tampermonkey is still a manual acceptance gate; the fixture-safety changes above do not change runtime behavior and do not require repeating that manual test.
- Issue #79 remains the release checklist and should receive a concise evidence update after the Normal smoke completes.

### Production Supabase — read-only recheck

- Project `dlfvkawaiqduhlazsszm`: `ACTIVE_HEALTHY`, PostgreSQL `17.11.0.002`.
- Production migration history remains seven migrations through `20261027155438`.
- `public.upstatus_signal_rate_limits`, `public.consume_upstatus_signal_rate_limit(text, integer, integer)`, and `public.merge_chat_read_receipts(text, jsonb, timestamptz)` are absent.
- Read-only catalog query confirmed the production `upstatus_messages_broadcast` trigger still calls `public.upstatus_broadcast_messages()`. That SECURITY DEFINER function serializes the complete OLD/NEW row with `to_jsonb(...)` and sends `{op, record}` on `db_change` with `private=false`. The function remains executable by `anon` and `authenticated`.
- The same catalog query found zero RLS policies across the nine backend-owned tables checked. This is an unnecessary privilege surface, but RLS/no-policy alone is not proof of direct row access.
- Security Advisor at approximately 09:57 BRT: two WARN categories covering the same three SECURITY DEFINER broadcast functions (anon and authenticated EXECUTE), plus ten INFO RLS-without-policy notices. Performance Advisor returned no findings.
- Both real product server templates were inspected: neither currently calls `consume_upstatus_signal_rate_limit`; the RPC is used only by the isolated signaling test endpoint. Product endpoint integration and the coordinated client/API cutover remain blocked pending a reviewed migration and rollout plan.

### Safety and next actions

- No production SQL write, migration, Edge Function deployment, secret/flag change, userscript publication, PR merge, or destructive operation occurred.
- Next: inspect completion of Normal Signaling Smoke on exact HEAD `0150ac0`; record its full integration and cleanup logs; then plan product-endpoint rate-limit integration and the Realtime/client cutover without changing production.
- Keep #74, #75, #76, #80, and #82 Draft while gates remain. Do not edit the QA-owned #82 branch from engineering.


## 2026-11-05 10:58 BRT — exact-head refresh and CI checkout hardening

### Current candidate refs and CI

- **Normal PR #74** remains open/Draft on `chore/continuity-foundation`, HEAD `f59cf57d82d171029c081843a655423fa2c1f95a`.
  - Previous exact runtime head `0150ac0276a55bd32fbb46acc68c15df5b5403d0`: Validate [42032008035](https://github.com/Reekyi/UpStatus/actions/runs/42032008035) and complete Signaling Smoke [42032007996](https://github.com/Reekyi/UpStatus/actions/runs/42032007996) both SUCCESS. The smoke log confirms 14/14 unauthenticated checks, 86/86 authenticated integration checks, Chromium call/voice/screen WebRTC, three-member mesh/teardown, 90 accepted + 1 HTTP 429, distributed rate-limit concurrency, atomic read-receipt concurrency, and fixture cleanup.
  - Workflow hardening: commit [f868a96](https://github.com/Reekyi/UpStatus/commit/f868a963e2f470070b8e58a6af035c3dc6601eec) pins `actions/checkout` to the reviewed v4 commit SHA and sets `persist-credentials: false`. Static regression assertion was added in `07a5ae1` and corrected for valid regex escaping in [f59cf57](https://github.com/Reekyi/UpStatus/commit/f59cf57d82d171029c081843a655423fa2c1f95a).
  - Exact-head Validate [42040877440](https://github.com/Reekyi/UpStatus/actions/runs/42040877440) is SUCCESS. Exact-head Signaling Smoke [42040877642](https://github.com/Reekyi/UpStatus/actions/runs/42040877642) is PENDING at this checkpoint; do not infer its result from the previous head.
- **Team Lite PR #76** remains open/Draft at `578ba8a44dd67401a4bad0db897980c91fea3df5`. Candidate Checks [42024542507](https://github.com/Reekyi/UpStatus/actions/runs/42024542507) completed SUCCESS. Full logs confirm guard preflight, 14/14 unauthenticated checks, 86/86 authenticated checks, Chromium call/voice/screen media, three-member mesh, 90 accepted + 1 HTTP 429, distributed rate-limit concurrency, atomic read-receipt concurrency, fixture cleanup, and version/updater/portal checks.
- **Team Lite baseline PR #75** remains open/Draft at `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passed. #76 is the current signaling candidate and carries the baseline; do not merge both independently.
- **Continuity PR #80** remains open/Draft at `20fe32c0fc9632239c0728f5a9187cd9750bc8cf`. Validate [42032264419](https://github.com/Reekyi/UpStatus/actions/runs/42032264419) failed at the existing `client signed upload helper missing` assertion after building `3.0.40 / TEST 3.0.40-beta.22`. The PR changes documentation only; do not weaken the validator without reconciling the expected TEST artifact.
- **Independent QA PR #82** remains open/Draft at `2b9fbf3809c89659eaa978f3cbf83b8dd9685a15`. Validate [42037114517](https://github.com/Reekyi/UpStatus/actions/runs/42037114517) failed at the existing `production updateURL mismatch` assertion. This branch is QA-owned and was not edited by engineering.

### Production Supabase — read-only 10:58 BRT recheck

- Project `dlfvkawaiqduhlazsszm` remains `ACTIVE_HEALTHY`, PostgreSQL 17.11; migration history remains seven entries through `20261027155438`.
- Read-only `to_regclass`/`to_regprocedure` checks return NULL for `public.upstatus_signal_rate_limits`, `public.consume_upstatus_signal_rate_limit(text, integer, integer)`, and `public.merge_chat_read_receipts(text, jsonb, timestamptz)`.
- Production trigger `upstatus_messages_broadcast` still invokes `public.upstatus_broadcast_messages()`. Its current SECURITY DEFINER body serializes OLD/NEW with `to_jsonb` and calls `realtime.send(..., 'db_change', ..., false)`; effective EXECUTE remains true for anon and authenticated.
- Nine backend-owned tables (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) have RLS enabled, zero policies, and effective anon/authenticated SELECT/INSERT grants. This is an unnecessary privilege surface; RLS with zero policies does not itself prove direct row access.
- Security Advisor still reports two WARN categories covering the three trigger functions (anon and authenticated EXECUTE) plus ten INFO RLS-without-policy notices. Performance Advisor returned no findings.
- Candidate rate limiting remains isolated-test-only: neither real Normal nor Team Lite server template calls `consume_upstatus_signal_rate_limit`. Product endpoint integration and the coordinated Realtime/client cutover remain release blockers.

### Manual and safety gates

- Issue [#78](https://github.com/Reekyi/UpStatus/issues/78) remains OPEN. Real network interruption/recovery without F5, room re-entry, post-reconnect calls, real devices, and installed Normal ↔ Team Lite acceptance remain MANUAL PENDING. No runtime reconnect code changed in this checkpoint.
- No production SQL write, migration, Edge Function deployment, secret/flag change, userscript publication, merge, or destructive operation occurred.
- Next: inspect Signaling Smoke [42040877642](https://github.com/Reekyi/UpStatus/actions/runs/42040877642) on exact #74 HEAD; then continue design/implementation of product-endpoint rate limiting and the authenticated Realtime cutover without touching production or the QA-owned #82 branch.


### Exact ancestry comparison (2026-11-05 11:00 BRT)

Fresh GitHub compare results:
- Normal #74 vs `master`: **612 commits ahead, 0 behind**.
- Team Lite signaling #76 vs baseline #75: **101 commits ahead, 0 behind**.
- Continuity #80 vs `develop`: **21 commits ahead, 0 behind**.
- Independent QA #82 vs `master`: **23 commits ahead, 0 behind**.

The large #74 ancestry is a separate merge-review risk even when CI is green. Before any merge decision, inspect the full 612-commit range and confirm that the branch contains only intended history. Do not squash/merge or retarget as a shortcut. #76 carries #75's baseline; keep the pair as one related Team Lite line rather than two independent merge candidates.


### Documentation branch validation refresh (2026-11-05 11:02 BRT)

The ancestry note above was committed as documentation-only HEAD `0a9b34c970167b6a247c4d4c89acddbc7509ad4e` on PR #80. Its new Validate run [42041133424](https://github.com/Reekyi/UpStatus/actions/runs/42041133424) completed FAILURE at the same pre-existing `client signed upload helper missing` assertion after building `3.0.40 / TEST 3.0.40-beta.22`. No runtime file changed. Keep the failure classified as a base/validator mismatch; do not bypass the assertion.


## 2026-11-05 12:01 BRT — exact-head CI completion and production recheck

### Exact GitHub refs and automated evidence

All PRs remain open, Draft and unmerged.

| PR | Exact head | Current comparison | Exact-head CI |
|---|---|---|---|
| #74 Normal | `f59cf57d82d171029c081843a655423fa2c1f95a` | 612 ahead / 0 behind `master` | Validate [42040877440](https://github.com/Reekyi/UpStatus/actions/runs/42040877440) SUCCESS; Signaling Smoke [42040877642](https://github.com/Reekyi/UpStatus/actions/runs/42040877642) SUCCESS |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 59 ahead / 0 behind `team-lite-official` | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) SUCCESS (baseline) |
| #76 Team Lite signaling | `578ba8a44dd67401a4bad0db897980c91fea3df5` | 160 ahead / 0 behind `team-lite-official`; 101 ahead / 0 behind #75 | Candidate Checks [42024542507](https://github.com/Reekyi/UpStatus/actions/runs/42024542507) SUCCESS |
| #80 continuity | `a01ca0d4e4f04584368582b9810cc598c09d9004` | 23 ahead / 0 behind `develop` | Validate [42041271313](https://github.com/Reekyi/UpStatus/actions/runs/42041271313) FAILURE |
| #82 independent QA | `f4bdf93fe0a1d778e6aa8603501c6a138c8193f6` | 24 ahead / 0 behind `master` | Validate [42046974106](https://github.com/Reekyi/UpStatus/actions/runs/42046974106) FAILURE |

Normal #74's latest exact-head smoke job `127293440174` completed all authenticated integration and browser phases, including call audio, voice-room audio, screen video, dynamic invitations, all three links in a three-member mesh, peer/media teardown, 90 accepted requests plus one HTTP 429, distributed rate-limit concurrency, atomic read-receipt concurrency, and temporary fixture cleanup. Team Lite #76's exact-head job `127236981895` completed the corresponding integration/browser, rate-limit, read-receipt, cleanup, version, updater and portal checks. These are isolated-project CI results, not physical Tampermonkey acceptance.

The #80 failure is the existing `client signed upload helper missing` assertion after building `3.0.40 / TEST 3.0.40-beta.22`. The #82 failure is `production updateURL mismatch` after building `3.4.7 / TEST 3.4.7`. Both are documentation-only PRs; do not weaken either validator without reconciling the expected artifact. The QA-owned #82 branch was not edited.

### Reconnect source inspection

Both current candidate userscripts handle `offline` by stopping local call/voice resources and Realtime. On `online`, each calls `startRealtime()`; both `startRealtime()` implementations call `initSignalingTransport()`, recreating the authenticated signaling adapter when configured. Voice-room re-entry remains an explicit user action. This is source inspection plus static regression coverage, not a physical network-outage test. Issue #78 remains open until Ricardo confirms the real no-F5 scenario in both clients.

### Production Supabase — read-only

- Project `dlfvkawaiqduhlazsszm`: `ACTIVE_HEALTHY`, PostgreSQL `17.11.0.002`.
- Seven production migrations; latest `20261027155438`.
- `consume_upstatus_signal_rate_limit`, `upstatus_signal_rate_limits`, and `merge_chat_read_receipts` remain absent.
- The production `upstatus_messages_broadcast` trigger still invokes `upstatus_broadcast_messages()`; the SECURITY DEFINER function serializes the full OLD/NEW row and sends `db_change` with `private=false`.
- The three trigger broadcast functions remain executable by `anon` and `authenticated`.
- Security Advisor: two WARN categories covering the three broadcast functions and ten INFO RLS-without-policy notices. Performance Advisor: no findings.
- Production has 38 ACTIVE Edge Functions. The core deployed functions remain `upstatus` v480, `upstatus-team-lite` v15 and `upstatus-screen-share-3-1-1-beta10` v6. No production `upstatus-signal` endpoint is present.
- Neither product server template calls `consume_upstatus_signal_rate_limit`; the atomic limiter is exercised by the isolated signaling test endpoint only. RT-09 remains PARTIAL. The test-suffixed SQL files under `supabase/migrations/` must not be sent to production as-is; production migration packaging and the coordinated endpoint cutover need separate review.

### Safety

This checkpoint used GitHub reads, existing Actions logs and read-only Supabase metadata/catalog/advisor queries. No production SQL write, migration, function deployment, secret/flag change, userscript publication, merge, or destructive operation occurred. Keep all five PRs Draft. Do not repeat the physical #78 test request; it remains pending until Ricardo reports its result.


## 2026-11-05 — test-migration isolation and release-gate refresh

### Test-only SQL packaging hazard corrected

Two executable DDL files with a `_test.sql` suffix were found inside `supabase/migrations/` on both signaling candidate branches. Supabase CLI migration discovery is directory-based; the filename suffix is not an exclusion mechanism. A normal migration push could therefore treat isolated-test DDL as deployable migration history.

- Normal PR #74: moved both files to `supabase/test-migrations/` in commit [4d07a75](https://github.com/Reekyi/UpStatus/commit/4d07a755fae6ebe6a993b5ef1a563755b40af2a3).
- Team Lite PR #76: the same move in commit [61672ad](https://github.com/Reekyi/UpStatus/commit/61672adfdbbd1e020cf5922838404b0958b832e6).
- Added `supabase/test-migrations/README.md` restricting manual use to isolated project ref `bfpjtfqlnypisxljoxkb`; these files must never be applied to production or shared/official TEST.
- Added `scripts/migration-layout.test.mjs`, which fails if test-suffixed SQL is placed under `supabase/migrations/` and verifies the isolated copies and safety README.
- Normal Validate and Signaling Smoke, plus Team Lite Candidate Checks, are wired to run the guard. The Normal static test now reads the rate-limit SQL from the isolated test-migrations directory.
- Verified on both branches that the old paths are absent and the new paths/guard/README exist.

### Exact candidate heads and CI

- **Normal #74:** HEAD `4d07a755fae6ebe6a993b5ef1a563755b40af2a3`, open/Draft. Validate [42062127872](https://github.com/Reekyi/UpStatus/actions/runs/42062127872) passed. Signaling Smoke [42062127943](https://github.com/Reekyi/UpStatus/actions/runs/42062127943) is still running; the migration-layout guard and unauthenticated endpoint step passed, while authenticated/browser and concurrency steps were pending at the last inspection.
- **Team Lite #76:** HEAD `61672adfdbbd1e020cf5922838404b0958b832e6`, open/Draft. The workflow includes the migration-layout guard and new path filter. No workflow run was visible for this exact head at the last lookup; the prior pass on `578ba8a` does not validate this new commit.
- **Team Lite baseline #75:** unchanged at `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; its historical CI pass remains baseline-only.
- #76 is now 102 commits ahead and zero behind #75; it carries the baseline and must not be treated as an independent merge payload.
- #74 is 613 commits ahead and zero behind master; its large ancestry remains a separate review gate.
- **Continuity #80:** HEAD `ced6c746f252ad28984f895ff4e0e31a0c185e72`; Validate [42051290807](https://github.com/Reekyi/UpStatus/actions/runs/42051290807) fails at the existing `client signed upload helper missing` assertion after building 3.0.40 / TEST 3.0.40-beta.22.
- **Independent QA #82:** HEAD `40676d360fb65bdb466758caa7f546cc67063671`; Validate [42057223983](https://github.com/Reekyi/UpStatus/actions/runs/42057223983) fails at the existing `production updateURL mismatch` assertion after building 3.4.7 / TEST 3.4.7. QA branch remains untouched.

### Production Supabase and hard deployment dependency

Read-only checks reconfirmed project `dlfvkawaiqduhlazsszm` is `ACTIVE_HEALTHY`, PostgreSQL 17.11, with seven migrations through `20261027155438`. The rate-limit table/RPC and atomic read-receipt RPC remain absent.

All three production broadcast functions remain SECURITY DEFINER and executable by `anon`, `authenticated`, and `service_role`. The messages trigger still serializes the full OLD/NEW row and publishes `db_change` with `private=false`. `realtime.messages` has RLS enabled with zero policies but still has anon/authenticated SELECT, INSERT, and UPDATE grants; the nine backend-owned public tables also retain broad client grants. RLS with no policies does not by itself prove direct row access, but the grants remain unnecessary privilege surface.

**Hard dependency confirmed in both candidate server templates:** Normal `src/server/index.template.ts` and Team Lite `src/server/team-lite-index.template.ts` call `db.rpc("merge_chat_read_receipts", ...)` in `readRoute` and immediately throw on RPC error. Because the RPC is absent in production, deploying either candidate server template before its separately reviewed receipt migration is installed would break that route. Required order: author/review production-form migration separately, validate in the approved TEST environment, apply only through the separately authorized migration process, then deploy the matching server template. The test-suffixed SQL files moved above are not production migrations.

No production SQL write, migration, Edge Function deployment, secret/flag change, userscript publication, merge, or destructive operation occurred. Keep all five PRs Draft. Do not repeat the physical #78 no-F5 test request; it remains pending until Ricardo reports the result.


## 2026-11-05 14:05 BRT — privilege audit and exact-head refresh

### Current candidate state

- Normal PR #74: HEAD `76de9fbe5b24666aa79b64971b6521249f91a4e0`, open/Draft. Validate [42071213103](https://github.com/Reekyi/UpStatus/actions/runs/42071213103) passed. Signaling Smoke [42071213058](https://github.com/Reekyi/UpStatus/actions/runs/42071213058) was still running at this checkpoint.
- Team Lite PR #76: HEAD `61672adfdbbd1e020cf5922838404b0958b832e6`, open/Draft. Candidate Checks [42062435489](https://github.com/Reekyi/UpStatus/actions/runs/42062435489) passed on this exact head, including mutation guard, migration-layout guard, 14/14 unauthenticated checks, 86/86 authenticated checks, browser/WebRTC, rate-limit concurrency, and atomic read receipts.
- Team Lite baseline #75 remains at `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passed.
- #76 is 102 commits ahead and zero behind #75; it carries the baseline and is not an independent merge payload.
- #74 is 613 commits ahead and zero behind master; the large ancestry remains a separate review gate.
- Continuity #80: HEAD `3d7378a727818e59cb39c4b82570b3aacecbac73`; Validate [42062564203](https://github.com/Reekyi/UpStatus/actions/runs/42062564203) fails at the existing `client signed upload helper missing` assertion.
- Independent QA #82: HEAD `e03033544dd91eb23d7b02d61c689ba8bcbbfa26`; Validate [42066570047](https://github.com/Reekyi/UpStatus/actions/runs/42066570047) fails at `production updateURL mismatch`. QA branch remains untouched.

### New production privilege finding

A fresh SELECT-only catalog audit of `dlfvkawaiqduhlazsszm` used `has_table_privilege` to inspect effective grants, not only the RLS state:

- Both `anon` and `authenticated` have effective SELECT, INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER and REFERENCES privileges on the nine backend-owned tables: `chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, and `users`.
- RLS remains enabled with no policies. RLS blocks ordinary row access but does not protect TRUNCATE; this is a broader privilege surface than previously recorded. This catalog result does not prove that PostgREST exposes a direct TRUNCATE operation.
- `upstatus_visual_config` has no client-role privileges.
- `realtime.messages` retains SELECT/INSERT/UPDATE for client roles, but not DELETE/TRUNCATE. Do not revoke these until the public Realtime client cutover is coordinated.

The candidate migration `20261029183000_revoke_unused_public_table_grants.sql` already uses `REVOKE ALL PRIVILEGES` on the nine backend-owned tables. The trigger-function migration revokes direct EXECUTE on the three trigger-only SECURITY DEFINER functions. Neither migration has been applied to production.

To guard this contract, Normal #74 gained [commit 76de9fb](https://github.com/Reekyi/UpStatus/commit/76de9fbe5b24666aa79b64971b6521249f91a4e0), extending `scripts/signaling-static.test.mjs` to assert all nine tables are covered by `REVOKE ALL PRIVILEGES` and all three broadcast functions are protected from direct client EXECUTE. Validate passed; the exact-head Smoke remains pending at this checkpoint.

### Production snapshot and safety

- Project `dlfvkawaiqduhlazsszm`: `ACTIVE_HEALTHY`, PostgreSQL 17.11, seven migrations through `20261027155438`.
- `merge_chat_read_receipts`, `upstatus_signal_rate_limits`, and `consume_upstatus_signal_rate_limit` remain absent in production.
- The message trigger still publishes full OLD/NEW rows to public `db_change` (`private=false`); the three broadcast functions remain SECURITY DEFINER and executable by anon/authenticated.
- 38 Edge Functions are ACTIVE and report `verify_jwt=false`. That gateway setting alone does not establish whether custom application auth exists. Three core runtime functions have source-level custom-token review; the remaining 35 require route-by-route auth/owner/consumer/rollback inventory.
- No production SQL write, migration, function deployment, secret/flag change, userscript publication, merge, or destructive operation occurred. All production database checks were SELECT-only.


## 2026-11-05 14:10 BRT — default-privilege root cause

A second SELECT-only catalog pass found the root cause behind the broad client grants:

- `pg_default_acl` for schema `public` grants default table privileges to `anon`, `authenticated`, and `service_role` for objects created by both `postgres` and `supabase_admin`. The table ACL includes SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER and PostgreSQL 17 MAINTAIN.
- Default function ACL grants EXECUTE to the same three roles for functions created by both owners.
- Default sequence ACL grants SELECT, UPDATE and USAGE to the same three roles.
- `has_table_privilege` confirms anon/authenticated MAINTAIN is effective on the nine backend-owned tables. Neither role has CREATE on schema `public`.

The existing candidate migration `20261029183000_revoke_unused_public_table_grants.sql` revokes all privileges on current backend-owned tables, but it does not change default ACLs. Without a separate default-privilege hardening migration, future public tables, functions and sequences created by either owner can inherit client grants again.

Required design: separately revoke default table/function/sequence privileges for `anon` and `authenticated` under both `postgres` and `supabase_admin`, while preserving owner and `service_role` access. Inventory expected public objects and dependencies first. Generate the migration through the approved Supabase CLI workflow and validate it in official TEST. The CLI/official TEST environment was unavailable in this pass, so no migration filename was fabricated and no DDL was applied.

This root-cause finding was recorded in [issue #79 comment 6664233350](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6664233350). Production remains unchanged.


## 2026-11-05 14:12 BRT — default ACL administration boundary

A read-only role audit confirmed that SQL access is `current_user = session_user = postgres`; postgres is not superuser and is not a member of `supabase_admin`. `supabase_admin` is a login-capable superuser.

Therefore, a normal migration executed by the current postgres connection cannot run `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin`. Do not add such a migration assuming it will succeed, and do not attempt role membership changes or credential workarounds. The default-privilege remediation has two distinct gates:

1. Defaults owned by postgres can be addressed through the normal migration path after approved TEST validation.
2. Defaults owned by supabase_admin require a separately authorized administrative execution path supported by Supabase.

The current public tables and functions are owned by postgres (10 tables, 3 functions), but the supabase_admin defaults remain a future-object risk. This constraint is recorded in [issue #79 comment 6664265799](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6664265799). No ALTER DEFAULT PRIVILEGES, SET ROLE, role-membership change, credential access, or production write was attempted.


## 2026-11-05 14:56 BRT — candidate default-ACL hardening for postgres owner

### Exact candidate and CI state

- Normal PR #74 remains open/Draft. New head: `e24f105b57664a4a6d28f58737b5e5fd1d3067fe`.
- UpStatus Validate [42080166961](https://github.com/Reekyi/UpStatus/actions/runs/42080166961) passed on this exact head.
- Signaling Smoke [42080166863](https://github.com/Reekyi/UpStatus/actions/runs/42080166863) was pending at the last check; inspect its final result before treating the head as fully validated.
- Team Lite PR #76 remains open/Draft at `61672adfdbbd1e020cf5922838404b0958b832e6`; Candidate Checks [42062435489](https://github.com/Reekyi/UpStatus/actions/runs/42062435489) passed on that exact head.
- Team Lite baseline #75 remains open/Draft at `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passed.
- Continuity #80 remains at `dc0a384d5349668c6b8509edfa16a80bbb172840`; Validate [42071989209](https://github.com/Reekyi/UpStatus/actions/runs/42071989209) fails at the existing `client signed upload helper missing` assertion (build 3.0.40 / TEST 3.0.40-beta.22).
- QA #82 remains on its separate branch at `d8a6a42c6f7b6df0bd5a0f2c84cee1c7b6946420`; Validate [42076102639](https://github.com/Reekyi/UpStatus/actions/runs/42076102639) fails at the existing `production updateURL mismatch` assertion (build 3.4.7 / TEST 3.4.7). The QA branch was not modified.

### Candidate migration added

Normal #74 now contains:

- Production candidate: `supabase/migrations/20261105150000_revoke_public_default_privileges_postgres.sql`.
- Isolated probe: `supabase/test-migrations/20261105150000_postgres_public_default_privileges_test.sql`.
- Static regression in `scripts/signaling-static.test.mjs`, committed at `e24f105`.

The migration addresses defaults for objects created by role `postgres` only:

1. In schema `public`, revoke all default table privileges from `anon` and `authenticated` (including PostgreSQL 17 `MAINTAIN`).
2. In schema `public`, revoke default function EXECUTE from `anon` and `authenticated`.
3. In schema `public`, revoke all default sequence privileges from `anon` and `authenticated`.
4. Globally for functions created by `postgres`, revoke the PostgreSQL default EXECUTE grant from `PUBLIC`. This global statement is necessary because a schema-specific revoke cannot remove the global PUBLIC default.

The migration deliberately preserves `service_role` defaults and does not target `supabase_admin`. The global function PUBLIC revoke applies to future functions created by `postgres` in any schema, not only `public`; review that scope before production approval. Existing-object revocations remain a separate migration.

### Isolated validation and correction

The isolated project `upstatus-security-test` (`bfpjtfqlnypisxljoxkb`, PostgreSQL 17.11.0.003) was re-confirmed ACTIVE_HEALTHY and its initial public default ACLs matched production.

- First probe attempt failed because new functions still inherited global PUBLIC EXECUTE even after the schema-specific anon/authenticated revoke. This exposed a real gap in the first candidate draft.
- Added `ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC`.
- Re-applied the corrected test migration successfully.
- Probe assertions verified that future public tables have no anon/authenticated SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER or MAINTAIN; future sequences have no anon/authenticated USAGE/SELECT/UPDATE; future functions are not executable by anon/authenticated.
- The same probe verified that `service_role` and owner `postgres` retain required access.
- A follow-up SELECT confirmed the probe table, sequence and function were dropped; postgres-owned public client defaults were removed; service_role defaults remained; supabase_admin public defaults remained.

The isolated migration history records both the failed first attempt and successful retry under the same test migration name. This is confined to the isolated test project and does not alter the repository's production migration history.

### Production remains unchanged

Read-only checks reconfirmed production project `dlfvkawaiqduhlazsszm` is ACTIVE_HEALTHY, PostgreSQL 17.11, with seven migrations through `20261027155438`. The catalog still has 24 postgres-owned public default ACL entries for anon/authenticated and 24 supabase_admin-owned public default ACL entries. No production migration, SQL write, role change, deployment or secret change was made.

The remaining ACL-02 gate is the `supabase_admin` default ACL path. The available SQL executor runs as `postgres`, which is not a member of `supabase_admin`; do not attempt SET ROLE, grant membership or credential workarounds. Obtain a supported administrative path separately. This candidate closes only the `postgres`-owned portion after approved migration review and application.

### Other release gates unchanged

- RT-01 remains blocked: production chat broadcasts still publish full OLD/NEW rows to public Realtime; candidate migrations are not deployed.
- RT-09 remains partial: the distributed limiter is still not integrated into both deployed product endpoints.
- The production read-receipt RPC remains absent; both candidate server templates call it, so the production migration must be installed before either matching server is deployed.
- Issue #78 remains MANUAL PENDING for physical no-F5 recovery in Normal and Team Lite.
- PR #74 still has 614 commits ahead of master and needs full history review; #76 is 102 commits ahead and zero behind #75, so #75/#76 are not independent merge payloads.
- Keep all PRs Draft. No merge, production migration, deploy, release, userscript publication, flag/secret change or production write is authorized.


## 2026-11-05 14:56 BRT — production-form read-receipt RPC candidate

Normal PR #74 now also contains `supabase/migrations/20261105160000_merge_chat_read_receipts.sql` (commit `b8aa4ba`, current code head later advanced to `d38b8f1`).

The production migration defines `public.merge_chat_read_receipts(text,jsonb,timestamptz)` with:
- `SECURITY INVOKER` and an empty `search_path`;
- validation for non-empty user name, object payload, and array-valued receipt entries;
- atomic `INSERT ... ON CONFLICT (user_name) DO UPDATE`;
- monotonic `last_read_at = greatest(existing, excluded)`;
- per-message union of unique non-empty reader strings;
- explicit revoke from `PUBLIC`, `anon`, and `authenticated`, then EXECUTE only for `service_role`.

Before authoring, a SELECT-only production catalog query confirmed `public.chat_reads.user_name` is the primary key and the table has the expected `last_read_at` and `messages` columns. The production RPC remains absent.

Applied this production-form migration only to the isolated `upstatus-security-test` project (`bfpjtfqlnypisxljoxkb`) as a test. Follow-up catalog inspection confirmed:
- `prosecdef=false` (SECURITY INVOKER);
- `search_path=""`;
- EXECUTE false for anon and authenticated;
- EXECUTE true for service_role and owner postgres.

The migration is now part of the Normal candidate, not production. The Team Lite server template also calls this shared RPC, so the shared database migration must be installed and verified before deploying either matching server template. Do not deploy one server first.

Latest #74 code head: `d38b8f1b646fe4a9147c15ee714ea1d624ffda87`.
- Validate [42080591304](https://github.com/Reekyi/UpStatus/actions/runs/42080591304): success.
- Signaling Smoke [42080591331](https://github.com/Reekyi/UpStatus/actions/runs/42080591331): pending at the last check.

Production remains unchanged: `merge_chat_read_receipts(text,jsonb,timestamptz)` is still absent, with seven migrations through `20261027155438`. Keep the production migration as a release dependency; apply only after approved TEST validation and explicit production authorization.


## 2026-11-05 14:58 BRT — exact-head refresh after static-regex correction

Normal PR #74 advanced to `019fdef2b14861e3405f3970fc39155393f42640`. The SQL migrations did not change; this commit corrected an over-escaped regular expression in the static regression for the read-receipt migration.

- UpStatus Validate [42080821136](https://github.com/Reekyi/UpStatus/actions/runs/42080821136): in progress at the last check.
- Signaling Smoke [42080821123](https://github.com/Reekyi/UpStatus/actions/runs/42080821123): queued at the last check.
- The immediately preceding head `d38b8f1` had Validate success [42080591304](https://github.com/Reekyi/UpStatus/actions/runs/42080591304); its smoke [42080591331](https://github.com/Reekyi/UpStatus/actions/runs/42080591331) was still pending. Do not transfer a result to the newer head.

Fresh branch comparisons:
- #74 vs master: 622 ahead, 0 behind.
- #76 vs #75: 102 ahead, 0 behind.
- #80 vs develop: 33 ahead, 0 behind.
- #82 vs master: 29 ahead, 0 behind.

All five PRs remain open and Draft. #76 remains a descendant of #75, not an independent merge payload. The QA branch #82 remains untouched.


## 2026-11-05 14:59 BRT — static regression correction and queued exact-head checks

Normal PR #74 advanced to `1dfe050ef5f3e4c25b16f3b71f10036214ab3142`. The two production-form migrations are unchanged. The latest edits corrected static-test assertions after two exact-head smoke failures:

- Head `019fdef`: the existing backend-table migration assertion was accidentally over-escaped while adding new checks; Smoke [42080821123](https://github.com/Reekyi/UpStatus/actions/runs/42080821123) failed at the static-test step before any fixture mutation.
- Head `181f4d7`: after restoring the table assertion, the new default-ACL assertion incorrectly treated the explanatory `service_role` comment as a revoke target; Smoke [42081010541](https://github.com/Reekyi/UpStatus/actions/runs/42081010541) failed at the static-test step before fixture mutation.
- Corrected the check to inspect uncommented REVOKE statements and use proper regex word boundaries. This is test-only; SQL migrations were not changed.

Latest head `1dfe050`:
- Validate [42081126225](https://github.com/Reekyi/UpStatus/actions/runs/42081126225): in progress at last check.
- Signaling Smoke [42081126527](https://github.com/Reekyi/UpStatus/actions/runs/42081126527): pending at last check.

Fresh ancestry: #74 is 625 commits ahead / 0 behind master; #76 is 102 ahead / 0 behind #75; #80 is 34 ahead / 0 behind develop; #82 is 29 ahead / 0 behind master. All PRs remain Draft. No fixture tests ran in the two failed smoke jobs because the static step failed first.


## 2026-11-05 15:00 BRT — latest exact-head CI result

Normal PR #74 remains at `1dfe050ef5f3e4c25b16f3b71f10036214ab3142`.

- Validate [42081126225](https://github.com/Reekyi/UpStatus/actions/runs/42081126225): **success**.
- Signaling Smoke [42081126527](https://github.com/Reekyi/UpStatus/actions/runs/42081126527): **pending**, with no job created at the latest poll. Older queued smoke runs `42080591331` and `42080166863` also had no jobs. Do not call the new migration/static suite approved until a smoke job actually executes and finishes.
- The prior Smoke failures on `019fdef` and `181f4d7` occurred at the static regression step, before any fixture or browser test ran. Their causes are recorded above; the assertions were corrected in `1dfe050`.

All PRs remain open/Draft. Production project status and seven-migration history are unchanged. No production write occurred.


## 2026-11-05 16:04 BRT — exact-head CI, default-ACL scope, and browser-test dependency

This checkpoint supersedes earlier CI and ACL snapshots above where they conflict. All observations below were re-fetched from GitHub/Supabase during this run.

### Exact candidate heads and workflows

| PR | Branch | Exact head | Current workflow evidence |
|---|---|---|---|
| #74 Normal | `chore/continuity-foundation` | `b981a716f30bb1a9a960f74d050315dd51a3735f` | Validate [42091463530](https://github.com/Reekyi/UpStatus/actions/runs/42091463530) passed; Signaling Smoke [42091463609](https://github.com/Reekyi/UpStatus/actions/runs/42091463609) is running. |
| #75 Team Lite baseline | `team-lite/3.4.31-guest-fixes` | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passed on this unchanged baseline. |
| #76 Team Lite signaling | `team-lite/signaling-transport-candidate` | `bd89a5364f66ca81780869b1bff17c061f90245c` | Candidate Checks [42091473392](https://github.com/Reekyi/UpStatus/actions/runs/42091473392) is pending behind Normal because both suites share the isolated fixture project. |
| #80 Continuity | `docs/continuity-handoff-2026-11-04` | `920648f1cd91b0b3d5dff424df411b8a4162f7bd` | Validate [42081616004](https://github.com/Reekyi/UpStatus/actions/runs/42081616004) failed on the baseline assertion `client signed upload helper missing` after building 3.0.40 / TEST 3.0.40-beta.22. |
| #82 Independent QA | `qa/release-readiness-2026-11-04-master` | `7253bb6d4bbcb8e4ba2137e659ef95581073ebe8` | Validate [42086096708](https://github.com/Reekyi/UpStatus/actions/runs/42086096708) failed on the baseline assertion `production updateURL mismatch` after building 3.4.7 / TEST 3.4.7. QA branch was not modified. |

All five PRs remain open and Draft. Fresh comparisons: #74 is 625 commits ahead / 0 behind master; #76 is 102 ahead / 0 behind #75; #80 is 36 ahead / 0 behind develop; #82 is 30 ahead / 0 behind master. #75/#76 remain a baseline/descendant pair, not independent merge payloads.

### Normal exact-head smoke and Playwright dependency correction

- Previous Normal head `1dfe050ef5f3e4c25b16f3b71f10036214ab3142` passed Validate [42081126225](https://github.com/Reekyi/UpStatus/actions/runs/42081126225) and Signaling Smoke [42081126527](https://github.com/Reekyi/UpStatus/actions/runs/42081126527). The full smoke job confirmed 14/14 static groups, 14/14 unauthenticated checks, 86/86 authenticated checks, Chromium call/voice/screen WebRTC with remote tracks, three-member mesh, teardown, fixture cleanup, 90 accepted + 1 HTTP 429, distributed rate-limit concurrency, and atomic read-receipt concurrency.
- A subsequent test-only/documentation head `c6815912d86258ca99d35d70ed612512257c949e` passed Validate [42091168292](https://github.com/Reekyi/UpStatus/actions/runs/42091168292), but Smoke [42091168664](https://github.com/Reekyi/UpStatus/actions/runs/42091168664) failed during dependency installation before authenticated/browser tests: npm resolved `playwright-core@1.65.0`, which was not published in the registry used by the runner. Static regressions and 14/14 unauthenticated checks had passed; the failure was not an application or fixture failure.
- Pinned both candidate workflows to the published stable `playwright@1.64.1`: Normal commit [b981a71](https://github.com/Reekyi/UpStatus/commit/b981a716f30bb1a9a960f74d050315dd51a3735f), Team Lite commit [bd89a53](https://github.com/Reekyi/UpStatus/commit/bd89a5364f66ca81780869b1bff17c061f90245c). The package listing reports 1.64.1 as the published package version: https://www.npmjs.com/package/playwright.
- On current Normal head `b981a71`, Validate is green and Smoke has passed the static and unauthenticated stages; authenticated integration/browser work is still running. Team Lite is queued behind it. Do not transfer the earlier 1dfe050 smoke pass to either newer head.

### Default-ACL inventory: expanded scope discovered

The production `pg_default_acl` inventory is broader than the earlier public-schema-only summary:

- Defaults owned by `postgres` exist in schemas `public` and `storage` for tables, functions, and sequences. The schema-specific ACL arrays in both schemas include explicit `anon`, `authenticated`, and `service_role` grants.
- Defaults owned by `supabase_admin` exist in `extensions`, `graphql`, `graphql_public`, `public`, and `realtime`. The `graphql`, `graphql_public`, and `public` ACL arrays include `anon` and `authenticated`; `extensions` and `realtime` do not show those client grants in the current inventory.
- The candidate migration `20261105150000_revoke_public_default_privileges_postgres.sql` only revokes explicit client defaults for `postgres` in `public`. Its separate global `REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` applies to future functions created by `postgres` in every schema. It does not revoke the explicit `postgres` defaults in `storage` or any `supabase_admin` defaults.
- Do not expand revocations into `storage`, `graphql`, `graphql_public`, `realtime`, or `extensions` without a Supabase-managed-schema dependency review. The global PUBLIC-function change is also broader than the public schema and requires explicit release review.
- Role boundary remains confirmed: `postgres` is not superuser and is not a member of `supabase_admin`; `supabase_admin` is a login-capable superuser. No role escalation, membership change, credential access, or workaround was attempted.

### New isolated regression for the global function-default scope

Added `supabase/test-migrations/20261105170000_postgres_global_function_default_scope_test.sql` and wired it into `scripts/migration-layout.test.mjs`. The test creates a temporary schema outside `public`, creates a function as `postgres`, verifies anon/authenticated cannot execute it while the owner can, then drops the schema.

- Test file commit [81693f5](https://github.com/Reekyi/UpStatus/commit/81693f5afe8ae5b08714b617b3b957c4e1234957).
- Layout-guard commit [0f4c31c](https://github.com/Reekyi/UpStatus/commit/0f4c31c4d6bcb9cc305e4972e7425229fd5264).
- Test-migrations README update [c681591](https://github.com/Reekyi/UpStatus/commit/c6815912d86258ca99d35d70ed612512257c949e).

Applied only to isolated project `upstatus-security-test` (`bfpjtfqlnypisxljoxkb`, ACTIVE_HEALTHY, PostgreSQL 17.11.0.003) using migration `verify_postgres_default_acl_global_function_scope_20261105`. The application returned success. Read-only verification confirmed the probe schema was removed, the global postgres function ACL was `{postgres=X/postgres}`, PUBLIC EXECUTE was absent, and anon/authenticated EXECUTE was absent. This proves the global effect outside `public`; it is not production validation.

### Production runtime and security recheck

Production project `dlfvkawaiqduhlazsszm` remains ACTIVE_HEALTHY on PostgreSQL 17.11.0.002 with seven migrations through `20261027155438`. Both `merge_chat_read_receipts(text,jsonb,timestamptz)` and `consume_upstatus_signal_rate_limit(text,integer,integer)` remain absent.

The production Edge Function inventory contains 38 ACTIVE functions; all currently report `verify_jwt=false`. Core versions remain `upstatus` v480, `upstatus-test` v281, `upstatus-team-lite` v15, and legacy `upstatus-screen-share-3-1-1-beta10` v6. No production `upstatus-signal` function exists. The deployed Normal and Team Lite function sources do not call either candidate RPC. The candidate server templates do call the read-receipt RPC, so that migration must be installed through the approved TEST/production sequence before deploying either matching server. The product-facing rate limiter remains unintegrated.

The current production trigger-function definitions were re-read:
- `upstatus_broadcast_messages()` sends the complete OLD/NEW row as `record` on `db_change`, with `private=false`.
- `upstatus_broadcast_remote_state()` sends command/result metadata (including IDs, sender/target, status, reason, timestamps, and result error fields) on public remote-command/result events.
- `upstatus_broadcast_users()` sends name/status/reason/update/sync metadata on the public user-status event.
- All three remain SECURITY DEFINER and broadly executable by anon/authenticated. Candidate migrations reduce payloads to an `op` hint, but they are not deployed.

Security Advisor still reports three anon EXECUTE warnings, three authenticated EXECUTE warnings, and ten RLS-enabled/no-policy INFO notices. Performance and health advisors returned no findings. RLS without policies continues to deny ordinary row access; grants alone are not proof of successful row access.

### Manual and release gates

- Issue #78 remains open: physical no-F5 network recovery is still MANUAL PENDING in both Normal and Team Lite. Do not re-request the test unless a material runtime change requires it.
- Public Realtime cutover, production migrations, product rate-limit integration, read-receipt migration sequencing, endpoint/version alignment, real Tampermonkey/device tests, and full #74 ancestry review remain release gates.
- No production SQL write, migration, Edge Function deployment, secret/flag change, userscript publication, PR merge, or destructive operation occurred in this checkpoint.


## Revalidation 2026-11-05 17:02 BRT — exact-head CI and production catalog

This checkpoint was appended after re-fetching the live PR heads, exact-head Actions runs, current release documents, and production catalog. It supersedes the earlier 16:04 BRT checkpoint where the Normal Smoke and Team Lite run were still pending.

### Current PR refs and exact-head CI

All five PRs remain open, Draft, and unmerged.

| PR | Branch / base | Exact head | Exact-head workflow evidence |
|---|---|---|---|
| #74 Normal | `chore/continuity-foundation` → `master` | `b981a716f30bb1a9a960f74d050315dd51a3735f` | Validate [42091463530](https://github.com/Reekyi/UpStatus/actions/runs/42091463530) SUCCESS; Signaling Smoke [42091463609](https://github.com/Reekyi/UpStatus/actions/runs/42091463609) SUCCESS |
| #75 Team Lite baseline | `team-lite/3.4.31-guest-fixes` → `team-lite-official` | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) historical SUCCESS; superseded for signaling work by #76 |
| #76 Team Lite signaling | `team-lite/signaling-transport-candidate` → `team-lite-official` | `bd89a5364f66ca81780869b1bff17c061f90245c` | Candidate Checks [42091473392](https://github.com/Reekyi/UpStatus/actions/runs/42091473392) SUCCESS |
| #80 Continuity | `docs/continuity-handoff-2026-11-04` → `develop` | `a0fca9c75e65755533c391217133b501660cdabf` | Validate [42091857000](https://github.com/Reekyi/UpStatus/actions/runs/42091857000) FAILURE: `client signed upload helper missing` |
| #82 QA readiness | `qa/release-readiness-2026-11-04-master` → `master` | `0fd1877c4989b1681093eefc151a617dd7212e50` | Validate [42096117538](https://github.com/Reekyi/UpStatus/actions/runs/42096117538) FAILURE: `production updateURL mismatch` |

The Normal and Team Lite workflows both completed on their exact current heads. Full job logs confirm:
- 14/14 static signaling regression groups and 14/14 unauthenticated endpoint checks.
- 86/86 authenticated integration checks.
- Chromium WebRTC call audio, voice-room audio, and screen-share video negotiation with remote tracks.
- Dynamic group invitation/fanout, all three pairwise links in a three-member mesh, peer/media teardown.
- 90 accepted writes followed by one HTTP 429; distributed rate-limit RPC concurrency/window-reset test passed.
- Atomic chat read-receipt concurrency test passed.
- Temporary users, sessions, rooms, memberships and events were cleaned up.
- Team Lite version/manifest, portal syntax, guest-session isolation and updater scenarios passed.

Both workflows now resolve `playwright@1.64.1`; the exact-head jobs completed without the earlier npm `playwright-core@1.65.0` resolution failure.

The #80 and #82 failures are documentation-branch validation failures in their respective existing build baselines. Logs show #80 built `3.0.40 / TEST 3.0.40-beta.22` before failing on `client signed upload helper missing`; #82 built `3.4.7 / TEST 3.4.7` before failing on `production updateURL mismatch`. Do not weaken the validators or modify the independent QA branch to hide these failures.

### Current ancestry

Fresh GitHub comparisons:
- #74: 629 commits ahead / 0 behind `master`.
- #76: 103 ahead / 0 behind #75.
- #80: 37 ahead / 0 behind `develop`.
- #82: 32 ahead / 0 behind `master`.

#76 remains a descendant of #75, not an independent sibling merge payload. The #74 ancestry is large and remains a separate full-review gate even though its current CI is green.

### Production Supabase — read-only revalidation

Project `dlfvkawaiqduhlazsszm` is `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002. The migration inventory still has seven entries, latest `20261027155438`.

The catalog confirms that production still lacks:
- `public.merge_chat_read_receipts(text,jsonb,timestamptz)`;
- `public.consume_upstatus_signal_rate_limit(text,integer,integer)`;
- `public.upstatus_signal_rate_limits`.

The nine backend-owned tables `chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, and `users` have RLS enabled with zero policies. For both `anon` and `authenticated`, the catalog reports all eight table privileges: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER and MAINTAIN. This is an unnecessary privilege surface; RLS with no policies means the grant inventory alone does not prove ordinary row access. `upstatus_visual_config` has no client table privileges.

`realtime.messages` has RLS enabled, zero policies, and SELECT/INSERT/UPDATE for `anon` and `authenticated`. Do not revoke these grants or make channels private until the client authentication/Realtime cutover is designed and validated.

The three production broadcast functions remain SECURITY DEFINER with `search_path=public` and EXECUTE available to anon/authenticated:
- `upstatus_broadcast_messages()` serializes the complete OLD/NEW message row and publishes `db_change` with `private=false`.
- `upstatus_broadcast_remote_state()` publishes remote command/result metadata with `private=false`.
- `upstatus_broadcast_users()` publishes name/status/reason/update/sync metadata with `private=false`.

Security Advisor: three anon EXECUTE WARN findings, three authenticated EXECUTE WARN findings, and ten RLS-enabled/no-policy INFO findings. Performance and health advisors returned no findings.

The production inventory contains 38 ACTIVE Edge Functions; all report `verify_jwt=false`. This flag alone does not prove anonymous application access. Current core versions are `upstatus` v480, `upstatus-test` v281, `upstatus-team-lite` v15, and legacy `upstatus-screen-share-3-1-1-beta10` v6. No production `upstatus-signal` function exists. A full route/auth inventory for all 38 functions remains open.

### Default ACL and role boundary

Current default ACLs remain broad:
- `postgres`: schema-specific defaults in `public` and `storage` for anon/authenticated/service_role on tables, functions and sequences.
- `supabase_admin`: defaults in `graphql`, `graphql_public` and `public` include anon/authenticated/service_role. The broader catalog inventory also contains managed-schema defaults that require a dependency review before any change.
- Current SQL session is `postgres`, not superuser and not a member of `supabase_admin`; `supabase_admin` is a login-capable superuser. No role escalation or membership change was attempted.

The candidate default-ACL migration only addresses explicit defaults for `postgres` in `public`; its global PUBLIC EXECUTE revocation affects future functions created by postgres in every schema. It does not address postgres defaults in `storage` or supabase_admin defaults. Keep the global scope under explicit review and do not extend changes into Supabase-managed schemas without dependency evidence.

### Candidate code and release dependencies

Both candidate product templates call `merge_chat_read_receipts` from `readRoute`; neither calls `consume_upstatus_signal_rate_limit`. Thus atomic receipts are integrated in candidate code but cannot work against production until the reviewed RPC migration is applied before the matching backend cutover. The distributed limiter remains isolated-test-only and RT-09 remains PARTIAL.

The release cutover plan and Realtime matrix were read again. Normal's build-time API `CLOUD_SERVER` still targets the legacy screen-share beta10 function while the update artifact URL points at `upstatus`; these paths require one coordinated version/backend/client rollback plan. The authenticated signaling feature remains opt-in/default-off, and the legacy public Realtime path remains active.

Issue #78 remains open with all physical no-F5 acceptance criteria unchecked. Do not ask Ricardo to repeat the already-requested test unless a material runtime change makes a fresh test necessary.

### Documentation lookup note

`UPSTATUS_HANDOFF.md`, `docs/RELEASE_CUTOVER_PLAN.md`, `docs/REALTIME_SECURITY_TEST_MATRIX.md`, and the QA branch's `docs/RELEASE_READINESS.md` were read. Attempts to fetch `docs/PROJECT_GUIDE.md` and `docs/CURRENT_STATE.md` on the inspected refs returned 404; do not assume those files exist until their path/ref is verified.

### Safety record and next work

This checkpoint used GitHub read APIs, existing workflow logs, Supabase project/advisor/function metadata, and SELECT-only catalog queries. No workflow was dispatched or rerun. No production SQL write, migration, Edge Function deployment, secret/flag change, userscript publication, PR merge, or destructive action occurred.

Next safe work:
1. Review the default-ACL migration's global PUBLIC EXECUTE scope and document its managed-schema impact.
2. Prepare a supported official-TEST migration sequence for atomic receipts and backend grants; production remains untouched.
3. Design product endpoint rate-limit integration and the Retry-After contract before claiming RT-09.
4. Complete the trusted-auth/server-mediated Realtime cutover plan.
5. Continue full ancestry review of #74 and manual device/network acceptance tracking.


## 2026-11-05 17:58 BRT — exact engineering and QA checkpoint

### Exact GitHub refs and CI

All five PRs were re-fetched. They remain open, Draft and unmerged.

- **Normal #74** — `chore/continuity-foundation`, HEAD `b981a716f30bb1a9a960f74d050315dd51a3735f`, 629 commits ahead / 0 behind `master`. Validate [42091463530](https://github.com/Reekyi/UpStatus/actions/runs/42091463530) and Signaling Smoke [42091463609](https://github.com/Reekyi/UpStatus/actions/runs/42091463609) both completed successfully on the exact HEAD.
- **Team Lite #76** — `team-lite/signaling-transport-candidate`, HEAD `bd89a5364f66ca81780869b1bff17c061f90245c`. Candidate Checks [42091473392](https://github.com/Reekyi/UpStatus/actions/runs/42091473392) passed on the exact HEAD. #76 is 103 commits ahead / 0 behind #75 and contains that baseline; do not treat #75 and #76 as independent merge payloads.
- **Team Lite baseline #75** — HEAD `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; baseline Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passed.
- **Continuity #80** — `docs/continuity-handoff-2026-11-04`, HEAD `143418af4d4ac564ecf22bb8dab7169b8ff07356`, 38 commits ahead / 0 behind `develop`. Validate [42099963739](https://github.com/Reekyi/UpStatus/actions/runs/42099963739) fails at the existing `client signed upload helper missing` assertion after building `3.0.40 / TEST 3.0.40-beta.22`.
- **Independent QA #82** — `qa/release-readiness-2026-11-04-master`, HEAD `e6372482f04cdd8983cbde993eee67446c5e04af`, 35 commits ahead / 0 behind `master`. Validate [42105592944](https://github.com/Reekyi/UpStatus/actions/runs/42105592944) fails at the existing `production updateURL mismatch` assertion after building `3.4.7 / TEST 3.4.7`. QA branch was read-only in this engineering run.

Normal's exact-head Smoke log confirms 14/14 static groups, 14/14 unauthenticated endpoint checks, 86/86 authenticated integration checks, Chromium call/voice/screen WebRTC with remote tracks, three-member mesh, teardown, fixture cleanup, 90 accepted writes plus one HTTP 429, distributed rate-limit concurrency, and atomic read-receipt concurrency. Team Lite's exact-head log confirms its isolation guard, authenticated adapter, 14/14 unauthenticated checks, 86/86 authenticated checks, WebRTC/mesh/teardown, the same rate-limit and receipt checks, migration-layout guard, version 3.4.31, portal/session-isolation checks and updater scenarios.

### New confirmed candidate blocker — open voice-room membership

The independent QA release-readiness document identifies **VOICE-OPEN-JOIN** as a blocking compatibility gate. I independently inspected the current Normal client, Team Lite client, shared transport adapter, and isolated signaling endpoint.

- Both clients currently resolve an existing voice room only if the caller is already an accepted member; otherwise they look for a pending invitation and call `accept(roomId)`.
- If no invitation exists, the client snapshots the current roster, creates a room with the other roster members as `pending`, then binds voice/screen logical IDs.
- The isolated endpoint defines membership as `status='accepted'`; `/room/resolve`, polling, roster listing and signaling require accepted membership.
- `/room/request-invite` explicitly supports `bindingType='call'` only. There is no authenticated open-join path for a team member arriving after an active voice room was created.
- Existing integration tests validate invitation/acceptance and rejection of pre-accept polling; they do not validate open join, late join or concurrent join.

This conflicts with issue #78's explicit functional rule: voice rooms are open channels, with free entry/exit and no invitation/acceptance semantics. It is a **candidate design incompatibility**, not a production regression: authenticated signaling remains opt-in/default-off and the endpoint exists only in the isolated project.

The isolated membership table has primary key `(room_id,user_name)` and statuses `pending|accepted|declined`; room bindings are unique by `(binding_type,logical_id)`. A safe fix needs an authenticated voice-only open-join operation, idempotent/concurrent membership handling, room-capacity enforcement, and serialization against leave/last-member room closure. Do not reuse the call invitation flow or enable the transport until late/concurrent joins, aliases across Normal/Team Lite, owner departure and cross-client fanout are covered.

### Production Supabase — read-only recheck

Project `dlfvkawaiqduhlazsszm` remains `ACTIVE_HEALTHY`, PostgreSQL `17.11.0.002`, with seven migrations through `20261027155438`. The current SQL session is `postgres`.

Production still lacks:
- `public.merge_chat_read_receipts(text,jsonb,timestamptz)`;
- `public.consume_upstatus_signal_rate_limit(text,integer,integer)`;
- `public.upstatus_signal_rate_limits`.

The nine backend-owned tables (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) have RLS enabled with zero policies and effective `anon`/`authenticated` grants for all eight catalogued table privileges (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN). `upstatus_visual_config` has no client table privileges. The RLS state means the grant inventory alone does not prove ordinary row access; the excessive grants remain an unnecessary privilege surface.

The three broadcast functions remain SECURITY DEFINER, `search_path=public`, and executable by anon/authenticated/service_role. `upstatus_broadcast_messages()` sends the complete OLD/NEW row to `db_change` with `private=false`; remote-state and user-status broadcasts also expose metadata on the public topic. Security Advisor currently reports three anon EXECUTE WARN findings, three authenticated EXECUTE WARN findings and ten RLS-without-policy INFO findings. Performance and health advisors return no findings.

Default ACLs remain explicit for `postgres` in `public` and `storage`, and for `supabase_admin` in `public`, `graphql` and `graphql_public`. The SQL session is not superuser and is not a member of `supabase_admin`; no role escalation was attempted. The candidate postgres/public migration's global PUBLIC EXECUTE scope remains under review.

The production function inventory contains 38 ACTIVE functions, all reporting `verify_jwt=false`; that gateway setting alone does not establish absence of application-level authentication. Core deployed versions remain `upstatus` v480, `upstatus-test` v281, `upstatus-team-lite` v15 and legacy screen-share beta10 v6. There is no production `upstatus-signal` function. The full route-level auth/owner/consumer inventory remains open.

### Additional release-control findings from QA documentation

The QA branch's release-readiness audit also records that `.github/workflows/deploy-production.yml` has no explicit approved-ref assertion or in-workflow assertion that the project ID equals `dlfvkawaiqduhlazsszm`, uses Supabase CLI `latest`, and deploys only Normal `upstatus`, not Team Lite. GitHub Environment protection was not inspected. Treat this as a deployment-control review gate; no workflow was run or modified.

Issue #78 remains open with physical no-F5 recovery and device/cross-client criteria unchecked. Issue #79's body remains an older snapshot; this checkpoint is the current evidence supplement. The independent QA branch and its release-readiness file were not modified.

### Safety and next work

This checkpoint used GitHub read APIs, exact workflow job logs, source-file inspection, Supabase project/migration/function/advisor metadata, and SELECT-only production catalog queries. No fixture-mutating script was run in this engineering turn; no workflow was dispatched or rerun. No production SQL write, migration, Edge Function deployment, secret/flag change, userscript publication, PR merge, role change or destructive action occurred.

Next safe engineering work:
1. Design the voice-only authenticated open-join contract and transactional membership/leave semantics before coding.
2. Add late-join, duplicate/concurrent join, capacity, owner-departure and Normal/Team Lite alias tests in the isolated project.
3. Keep authenticated transport default-off until that contract passes.
4. Continue production Realtime, read-receipt migration, product rate-limit and ACL/deployment-control gates separately.


### Post-update validation of the refreshed continuity checkpoint

After the two documentation commits above, PR #80 is now at HEAD `8016e211fe89ddf4488662509d68b6cc4e2a92c5`, 40 commits ahead / 0 behind `develop`. Validate [42108753435](https://github.com/Reekyi/UpStatus/actions/runs/42108753435) completed and reproduced the same baseline assertion `client signed upload helper missing`; no validator was weakened. The failure is not caused by the handoff content. The #80 branch remains Draft. The independent QA branch #82 remains untouched.


## Engineering checkpoint — 2026-11-05 19:23 BRT

This checkpoint supersedes earlier candidate-head and open-join notes where they conflict. Exact refs were re-fetched from GitHub and production Supabase was queried read-only.

### Current PR heads and CI

- **Normal #74** — branch `chore/continuity-foundation`, source head `73c19d5a890d39ee9524c1fb5042b7f6ffb7f53b` at start of this checkpoint. Validate [42120068532](https://github.com/Reekyi/UpStatus/actions/runs/42120068532) passed. Signaling Smoke [42120068577](https://github.com/Reekyi/UpStatus/actions/runs/42120068577) was still in progress at the last poll; the job had completed static harness checks and 14/14 unauthenticated endpoint checks, while authenticated/browser and concurrency steps remained in progress/pending. Two documentation-only commits were then added to this branch: [2f0c6ac](https://github.com/Reekyi/UpStatus/commit/2f0c6ac4dfc284cf4fdb44f9a4f43548e43613f2) (security matrix) and [fd55588](https://github.com/Reekyi/UpStatus/commit/fd55588379c6a35ae4817ddafd556a8e8728997f) (cutover plan). They do not change runtime or workflow inputs; the successful Validate and in-progress Smoke refer to the preceding runtime head.
- **Team Lite #76** — branch `team-lite/signaling-transport-candidate`, exact head `4178e54654b1bd2c06516fba9edea17d779b9ecd`. Candidate Checks [42119919319](https://github.com/Reekyi/UpStatus/actions/runs/42119919319) passed. Full job logs show **103/103 authenticated integration checks**, including open voice late join through both logical aliases, idempotent repeated join, no pending invitation, accepted roster, owner departure/handoff, departed-member rejoin, last-member closure/binding cleanup, owner-departure/late-join race, server-side capacity, WebRTC call/voice/screen, three-member mesh, teardown, 90 accepted + 1 HTTP 429, distributed rate-limit concurrency, atomic read-receipt concurrency, and migration-layout checks. Candidate/version/updater/portal checks passed.
- **Team Lite baseline #75** — exact head `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passed. #76 is 104 commits ahead and zero behind #75; it is the descendant candidate, not an independent merge.
- **Continuity #80** — exact head at start `0c3374aec9e26a84c23aeff41c8fa458884757bb`; last Validate [42108902345](https://github.com/Reekyi/UpStatus/actions/runs/42108902345) failed on the inherited develop baseline assertion `client signed upload helper missing` after building TEST 3.0.40-beta.22. No validator bypass was introduced.
- **Independent QA #82** — exact head `9fc5bfd3ff72ab4b1c44a9b0a0740432ae20e27d`; Validate [42114185476](https://github.com/Reekyi/UpStatus/actions/runs/42114185476) failed on the inherited master baseline assertion `production updateURL mismatch` after building 3.4.7. QA branch remains untouched.

All five PRs remain open and Draft. Current branch comparisons: #74 is 631 commits ahead / 0 behind master; #76 is 163 ahead / 0 behind team-lite-official and 104 ahead / 0 behind #75; #80 is 42 ahead / 0 behind develop; #82 is 36 ahead / 0 behind master. #74's 631-commit ancestry remains a separate integration-review gate.

### VOICE-OPEN-JOIN — implementation now present in candidates

The earlier note that no open-join path existed is superseded for the current candidate sources. The Normal and Team Lite candidates now contain:
- Authenticated `POST /room/open`, deriving the caller from the validated `x-upstatus-token` session and accepting only the two voice logical IDs.
- `open_upstatus_signal_voice_room(text,text,integer)`, a service-role-only SECURITY INVOKER RPC with empty search_path. It validates the user, serializes Normal/Team Lite aliases with an advisory transaction lock, locks the active room row, enforces a maximum of 32 accepted members, and joins without invitation/acceptance.
- `leave_upstatus_signal_room(text,text)`, which serializes against room operations, removes the departing member, transfers owner control to the earliest remaining accepted member, and closes/cleans the room when the last member leaves.
- Voice uses open membership; one-to-one call invitations remain separate.

The isolated migration inventory contains `20261105220323 open_voice_room_membership_candidate`. The isolated endpoint is still the only deployed candidate environment. Production does not contain either RPC. Keep the authenticated transport disabled by default until exact-head Normal Smoke and all manual/cutover gates pass.

### Production Supabase — fresh read-only confirmation

Project `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11, current SQL session `postgres`, seven migrations through `20261027155438`, 38 ACTIVE Edge Functions. Core versions remain `upstatus` v480, `upstatus-test` v281, `upstatus-team-lite` v15, and legacy screen-share beta10 v6. No production `upstatus-signal` function exists.

Production still lacks:
- `public.open_upstatus_signal_voice_room(text,text,integer)`;
- `public.leave_upstatus_signal_room(text,text)`;
- `public.merge_chat_read_receipts(text,jsonb,timestamptz)`;
- `public.consume_upstatus_signal_rate_limit(text,integer,integer)`;
- `public.upstatus_signal_rate_limits`.

The nine backend-owned tables still have RLS enabled with no policies and effective anon/authenticated SELECT/INSERT/TRUNCATE/MAINTAIN grants; `upstatus_visual_config` has no client table grants. The three broadcast functions remain SECURITY DEFINER, `search_path=public`, and executable by anon/authenticated. The messages trigger still publishes full OLD/NEW rows to public `db_change`. Security Advisor: 3 anon EXECUTE WARN, 3 authenticated EXECUTE WARN, 10 RLS-without-policy INFO; performance and health advisors have no findings.

Default ACLs remain explicit for `postgres` in `public` and `storage`, and `supabase_admin` in `public`, `graphql`, and `graphql_public`. The SQL session is not superuser and is not a member of `supabase_admin`; no role escalation or workaround was attempted.

### Remaining release gates

1. Complete Normal #74 Smoke on the exact runtime head; inspect full logs.
2. Add/verify `Retry-After` on HTTP 429; current isolated endpoint returns 429 without that header.
3. Reconcile production/official TEST source baselines before any backend deployment; current candidate migrations are not in production.
4. Validate read-receipt and voice-membership migrations in official TEST before any dependent server cutover.
5. Integrate the distributed limiter into both real product endpoints; current product templates do not call the limiter RPC.
6. Replace or safely retire public Realtime full-row broadcasts while preserving legacy compatibility.
7. Review default ACL scope and obtain an authorized Supabase-supported path for `supabase_admin`.
8. Complete the route-level auth/owner/consumer/rollback inventory for all Edge Functions and investigate the active backup with an empty entrypoint.
9. Add clean-database reproducibility for SQL candidate migrations; current CI exercises the persistent isolated project and does not apply the SQL probe set from scratch.
10. Perform real Tampermonkey/device/network recovery tests, including no-F5 re-entry, new inbound/outbound calls, repeated drops, microphone/screen capture, and live Normal ↔ Team Lite.
11. Review #74's 631-commit ancestry and resolve #80/#82 inherited validator baseline mismatches without weakening validation.

### Safety

This checkpoint used GitHub read APIs, source/doc reads, workflow job steps/logs, Supabase project/migration/function metadata, advisor results, and SELECT-only production catalog queries. The only writes were documentation commits on the existing candidate #74 branch and this handoff on #80. No fixture-mutating script or workflow was run by this checkpoint. No production SQL write, migration, Edge Function deployment, secret/flag/role change, userscript publication, merge, release, or destructive operation occurred.


### Follow-up — Normal Signaling Smoke completed

After the checkpoint above, Normal Signaling Smoke [42120068577](https://github.com/Reekyi/UpStatus/actions/runs/42120068577) completed SUCCESS on runtime head `73c19d5a890d39ee9524c1fb5042b7f6ffb7f53b`; Validate [42120068532](https://github.com/Reekyi/UpStatus/actions/runs/42120068532) was also SUCCESS. The full Smoke job log confirms 14/14 static groups, 14/14 unauthenticated checks, 103/103 authenticated integration checks, open voice join/alias/idempotency/capacity/owner-race/owner-transfer/last-member cleanup, Chromium call/voice/screen WebRTC, three-member mesh, peer/media teardown, 90 accepted + 1 HTTP 429, isolated fixture cleanup, rate-limit concurrency and atomic read-receipt concurrency.

The current #74 branch subsequently advanced through documentation-only commits `2f0c6ac`, `fd55588`, `15b95ad`, and `8f07ea9`; none changes runtime or workflow inputs. Current PR #74 head is `8f07ea9c26f02f28159d53fedd04dcc79c8d5ef6`. The exact runtime validation remains tied to `73c19d5`; docs-only commits do not invalidate those runtime checks.

Team Lite #76 remains green at `4178e54654b1bd2c06516fba9edea17d779b9ecd`, Candidate Checks [42119919319](https://github.com/Reekyi/UpStatus/actions/runs/42119919319), including 103/103 authenticated checks. The open-join design incompatibility is therefore implemented and automated-tested in both candidate product lines. Manual physical recovery and installed Normal ↔ Team Lite acceptance remain open.


### Isolated Edge Function source parity correction — 2026-11-05

The isolated project `bfpjtfqlnypisxljoxkb` reports `upstatus-signal-test` version **28** (not the earlier documented v27), ACTIVE, `verify_jwt=false`, source SHA `e26011f026c74821a1e05bf314340604d715820ab864b63d66fd481d93d00d4f`. I retrieved the deployed source and compared it with current PR #74 candidate source: `body.mjs` and `legacy-envelope.mjs` match byte-for-byte; `index.ts` matches after whitespace normalization, with only formatting/line-wrap differences. The deployed v28 therefore contains the same open-join logic as the current Normal candidate. It still has no `Retry-After` header. No isolated or production deployment was performed during this checkpoint.


### Production Edge Function source inventory recheck — 2026-11-05

Fetched the deployed source for the four relevant functions directly from production metadata/source APIs:

- `upstatus` v480, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`, `index.ts` 894,196 bytes.
- `upstatus-team-lite` v15, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`, `index.ts` 1,013,011 bytes.
- `upstatus-screen-share-3-1-1-beta10` v6, SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`, `index.ts` 1,023,201 bytes.
- `upstatus-backup-327-pre328` v1, SHA `3d6c4f8e5f777830ea720ab2938cb023b5a4e4c7d26f3fc02b926ce0e4d0dd90`, `index.ts` 0 bytes; function is ACTIVE. Do not disable without consumer/dependency and rollback evidence.

All four report `verify_jwt=false`. The three primary/legacy runtime sources contain `x-upstatus-token`, `token_hash`, and `expires_at` custom session-authentication markers. They do not contain calls to `merge_chat_read_receipts`, `consume_upstatus_signal_rate_limit`, or `open_upstatus_signal_voice_room`. Thus the deployed runtime is still on the legacy path; the RPC dependency and new open voice behavior exist only in candidate source. The empty backup has no source-level auth markers, but its route/consumer behavior was not exercised. No production function was deployed or modified.


### Production deployment workflow hardening candidate — 2026-11-05

A fresh review of `.github/workflows/deploy-production.yml` found a time-sensitive CLI risk: the workflow used `supabase/setup-cli` with `version: latest`. Supabase's official Nov 4, 2026 changelog says CLI v3.0.0 became the default on Nov 2; unattended hosted mutations such as `functions deploy` now fail in CI unless explicitly confirmed with `--yes`, and several CLI defaults/flags changed. Source: https://supabase.com/changelog/supabase-cli-v3

Candidate-only change on PR #74:
- Pin Supabase CLI to `2.122.1` instead of mutable `latest` to keep the current v2 command contract until a separately reviewed v3 migration.
- Require `GITHUB_REF=refs/heads/master`.
- Require checked-out `HEAD` to equal `GITHUB_SHA`.
- Require `SUPABASE_PROJECT_ID=dlfvkawaiqduhlazsszm` and a non-empty `SUPABASE_ACCESS_TOKEN`.
- Preserve the existing stable release lock at `3.4.7`.
- Add a static regression assertion to `scripts/signaling-static.test.mjs` that verifies guard ordering and pinned CLI before the deploy step.

Commits: [1495716](https://github.com/Reekyi/UpStatus/commit/1495716cf3613c0be19a30a31ddd1ce2e710eaf1) (workflow guard/pin), [2f226e1](https://github.com/Reekyi/UpStatus/commit/2f226e11cbe7c19fd83cc5a72940eaf93bf274d8) (static regression). PR #74's current head is `2f226e11cbe7c19fd83cc5a72940eaf93bf274d8`; Validate is running and Signaling Smoke is queued at the time of this note.

This is a candidate workflow edit only. No `workflow_dispatch` was triggered, no production deploy was attempted, and no secrets or GitHub environment settings were read/changed. GitHub Environment protection rules were not inspectable with the available repository connector. The workflow still deploys only Normal `upstatus`; Team Lite deployment coordination remains a separate gate.


### Team Lite voice-leave/logout race — candidate fix and safe-test boundary (2026-11-05)

QA's `TEAM-LITE-VOICE-LEAVE` note is directionally correct but the exact failure is an async race, not a missing call to `signalTransport.leave`: the active path invokes it indirectly from the `voiceRoomSend('leave')` Promise chain, but `voiceRoomLeave()` previously did not await that Promise. It set `voiceRoom.active=false` and returned; the menu then called `teamLiteEndSession()`, which saw `active=false` and skipped its own await. The session could be invalidated before the server leave request completed. The sender also cleared its room ID before the RPC confirmed success.

A separate candidate branch was created from exact #76 head `4178e54654b1bd2c06516fba9edea17d779b9ecd`:
- Branch `team-lite/voice-leave-fix-candidate`, head [dd04be2](https://github.com/Reekyi/UpStatus/commit/dd04be22a1eb57ab8fc349356ba29a588b74073a), 7 commits ahead / 0 behind #76. Diff is limited to `team-lite/upstatus-team-lite.user.js` and `scripts/team-lite-candidate-check.mjs`.
- Runtime change: shared/idempotent `voiceRoomLeavePromise`; stop the call poller immediately; await final leave signal + membership RPC; retain room ID until the RPC succeeds; if it fails, attempt `signalReleaseVoiceRoom` fallback; session logout awaits an in-flight leave even after local `active` is false; menu delegates to the awaited session teardown; UI button stays disabled until completion.
- Regression harness: concurrent leave coalescing, awaited server leave, failed-leave fallback retry, logout gate after local active reset, menu/UI handler assertions.
- Pure local V8 validation against exact fetched source passed: userscript syntax, test-harness syntax, shared promise/idempotency, wait for server leave, fallback retry, and logout gate. No Supabase or fixture was accessed.

**Full Candidate Checks deliberately not run.** Current QA `docs/RELEASE_READINESS.md` records an active fixture suffix `9bc23d87851e` in the shared isolated project without confirmed ownership. No cleanup was attempted. This branch has no PR yet, so it does not trigger the fixture-mutating Candidate Checks workflow. Wait for QA to attribute/clear the fixture before opening a PR or running the full integration suite. PR #76 and QA PR #82 were not modified.

### Current CI follow-up

- Normal #74 head `b0c0e03fbe820e02404d4ae7d9f83e2a18642e50`: Validate [42122609464](https://github.com/Reekyi/UpStatus/actions/runs/42122609464) SUCCESS; Signaling Smoke [42122609431](https://github.com/Reekyi/UpStatus/actions/runs/42122609431) IN_PROGRESS at this update. This head includes candidate-only production deploy workflow guards/pin and static regression; no workflow_dispatch was run.
- Team Lite #76 remains at `4178e54654b1bd2c06516fba9edea17d779b9ecd`, Candidate Checks [42119919319](https://github.com/Reekyi/UpStatus/actions/runs/42119919319) SUCCESS; the new voice-leave fix is on the separate branch above, not yet CI-validated.
- Continuity #80 current head before this note: `635964324fe201d05e989460019519e8699bdd03`; Validate [42122553649](https://github.com/Reekyi/UpStatus/actions/runs/42122553649) failed on inherited develop assertion `client signed upload helper missing`.
- QA #82 current head `bf2928cf4eaa8f4c942a5bbd38b751578701b848`; Validate [42122684334](https://github.com/Reekyi/UpStatus/actions/runs/42122684334) failed on inherited master assertion `production updateURL mismatch`. QA branch remains untouched.


### Team Lite voice-leave branch head correction

The separate candidate branch `team-lite/voice-leave-fix-candidate` has advanced to [`ea70498`](https://github.com/Reekyi/UpStatus/commit/ea70498a225b1c5d38d18a1a857789b7c977a739), **9 commits ahead / 0 behind** the #76 head `4178e54654b1bd2c06516fba9edea17d779b9ecd`. Diff remains exactly two files: `team-lite/upstatus-team-lite.user.js` (+51/-8) and `scripts/team-lite-candidate-check.mjs` (+191).

The pure local V8 harness now also executes the actual `voiceRoomSend` source and verifies final leave signal → membership RPC ordering, room ID/prepared-state retention while the RPC is pending, and clearing only after RPC success. Previous checks still pass for coalesced leave calls, awaited active leave, fallback retry after failure, and logout waiting when local `active=false`. Userscript and test harness syntax pass.

No PR has been opened and no Candidate Checks workflow was run. The Normal Smoke [42122609431](https://github.com/Reekyi/UpStatus/actions/runs/42122609431) remains IN_PROGRESS with its own isolated fixture active. The earlier unowned QA suffix `9bc23d87851e` currently has zero matches across signaling rooms, members, bindings, events, and rate-limit rows; the current active fixture is Normal Smoke suffix `60e1eae9f2aa`. Wait for the current run to complete and verify cleanup before opening the Draft PR/triggering fixture-mutating Team Lite checks.


### Team Lite leave/rejoin serialization — latest candidate head

The isolated branch `team-lite/voice-leave-fix-candidate` is now at [`5610263`](https://github.com/Reekyi/UpStatus/commit/561026304756b9a2e5bd2029e59eda630df1b5cd), **12 commits ahead / 0 behind** #76 head `4178e54654b1bd2c06516fba9edea17d779b9ecd`. Diff remains exactly two files: `team-lite/upstatus-team-lite.user.js` (+54/-10) and `scripts/team-lite-candidate-check.mjs` (+229).

Additional race closed: while the server leave RPC is pending, the join control now remains disabled with “Saindo...” and `voiceRoomJoin` waits for the shared leave promise before re-entering. This prevents a delayed leave response from removing a newly recreated membership.

Latest pure local V8 validation against exact source passed: userscript syntax; concurrent leave coalescing; final signal before leave RPC; room ID/prepared-state retained until RPC success; failed-leave fallback retry; logout waiting after local `active=false`; rejoin serialization; candidate harness syntax. No Supabase or fixtures were accessed.

No PR opened and no Candidate Checks run. Normal Smoke [42122609431](https://github.com/Reekyi/UpStatus/actions/runs/42122609431) is still IN_PROGRESS with its own isolated fixture active; wait for completion and verify cleanup before triggering Team Lite's fixture-mutating suite.


### Engenharia contínua — checkpoint 2026-11-05 19:53 BRT (run 11)

**Heads e CI verificados novamente:**
- PR #74 Normal: HEAD `b0c0e03fbe820e02404d4ae7d9f83e2a18642e50`; Validate [42122609464](https://github.com/Reekyi/UpStatus/actions/runs/42122609464) SUCCESS e Signaling Smoke [42122609431](https://github.com/Reekyi/UpStatus/actions/runs/42122609431) SUCCESS. O Smoke confirma 103/103 integrações autenticadas, WebRTC de chamada/voz/tela, malha de três membros, rate limit 90/1, concorrência de rate limit/read receipts e cleanup. Os checks de open voice join estão incluídos: membro tardio entra pelos aliases Normal/Team Lite, join repetido é idempotente, sem convite pendente, capacidade e corrida entre saída do owner e entrada tardia foram cobertas.
- PR #76 Team Lite: o branch isolado `team-lite/voice-leave-fix-candidate` foi revisado e fast-forward aplicado ao branch da PR usando expected HEAD `4178e54654b1bd2c06516fba9edea17d779b9ecd`, sem force. Novo HEAD [5610263](https://github.com/Reekyi/UpStatus/commit/561026304756b9a2e5bd2029e59eda630df1b5cd); a branch candidata e o branch da PR agora são idênticos (0 ahead/0 behind). A alteração continua limitada a `team-lite/upstatus-team-lite.user.js` e `scripts/team-lite-candidate-check.mjs`. PR permanece Draft.
- Candidate Checks #76 [42125597354](https://github.com/Reekyi/UpStatus/actions/runs/42125597354) está IN_PROGRESS no passo de integração autenticada/browser. Guard de mutação, adapter e autenticação passaram; não há conclusão ainda. Antes do disparo, o projeto isolado `bfpjtfqlnypisxljoxkb` tinha zero fixtures de signaling de teste; o workflow atual é o único produtor ativo observado. Não iniciar outro teste mutável até terminar e confirmar cleanup.
- PR #75 baseline: HEAD `7bbf9b9`, CI histórico aprovado. #76 está 175 commits à frente de `team-lite-official` e 116 à frente de #75, zero atrás. #74 está 639 commits à frente de master, zero atrás.
- PR #80 permanece Draft, HEAD `6dbf2a1`, 50 commits à frente/0 atrás de develop. Validate [42124487466](https://github.com/Reekyi/UpStatus/actions/runs/42124487466) falhou no baseline herdado `client signed upload helper missing`. PR #82 QA permanece intacta e Draft, HEAD `bf2928c`, 40 commits à frente/0 atrás de master; Validate [42122684334](https://github.com/Reekyi/UpStatus/actions/runs/42122684334) falhou em `production updateURL mismatch`.

**Correção de fotografia funcional:** o open join autenticado de voz já está implementado nas branches candidatas e passou nos 103 checks do Normal; a nota anterior que listava o desenho de open join como trabalho ainda não implementado está superada. A migração candidata cria `open_upstatus_signal_voice_room` e usa `leave_upstatus_signal_room`; não está em produção. A correção Team Lite de leave/logout agora aguarda a Promise compartilhada, o sinal final e o RPC de membership; o logout aguarda leave em andamento e o botão de entrada fica bloqueado até a saída terminar. O CI desse novo ajuste ainda está pendente.

**Revisão adicional identificada:** `signalReleaseVoiceRoom()` ainda limpa o room ID local antes do RPC e suprime erro. O caminho normal de leave mantém o ID até sucesso, mas o fallback pode perder a referência se a rede estiver indisponível. Tratar como follow-up para uma regressão específica de falha de rede/fallback; não declarar cleanup garantido em caso de falha de transporte.

**Supabase de produção — somente leitura:** projeto `dlfvkawaiqduhlazsszm` ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, sete migrations até `20261027155438`. Permanecem ausentes `open_upstatus_signal_voice_room`, `leave_upstatus_signal_room`, `merge_chat_read_receipts`, `consume_upstatus_signal_rate_limit` e `upstatus_signal_rate_limits`. Há 38 Edge Functions ativas; `upstatus` v480, `upstatus-test` v281, `upstatus-team-lite` v15 e screen-share beta10 v6; não há `upstatus-signal` em produção.

As três funções broadcast continuam SECURITY DEFINER, `search_path=public`, EXECUTE para anon/authenticated; mensagens ainda envia OLD/NEW completo para tópico público com `private=false`. As nove tabelas backend-owned continuam RLS=true, zero policies e grants efetivos de SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN para anon/authenticated; isso é superfície excessiva, não prova isolada de leitura de linhas via REST. Default ACLs atuais observados: owner postgres em `public` e `storage`; owner supabase_admin em `public`, `graphql` e `graphql_public`. A sessão SQL é postgres e não pode alterar defaults de supabase_admin. Advisor: três WARN anon EXECUTE, três WARN authenticated EXECUTE, dez INFO RLS sem policy; performance/health sem findings.

Issue #78 continua aberta para testes físicos de queda/retorno de internet sem F5, pagehide e compatibilidade instalada. Issue #79 recebeu este checkpoint. Nenhuma alteração em produção foi feita; todas as consultas de produção foram SELECT-only. Nenhum merge, deploy, release, publicação, migration, secret, feature flag, role ou operação destrutiva foi executada.

## 2026-11-05 21:04 BRT live engineering checkpoint

### GitHub refs and CI

- **PR #74 Normal:** open/Draft, head `b0c0e03fbe820e02404d4ae7d9f83e2a18642e50`; Validate `42122609464` and Signaling Smoke `42122609431` both completed successfully on that exact head. Smoke log: 103/103 authenticated integration checks, Chromium call/voice/screen WebRTC, three-member mesh, 90+1 endpoint limit, distributed rate-limit concurrency, atomic read-receipt concurrency, and fixture cleanup.
- **PR #75 Team Lite baseline:** open/Draft, head `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; Candidate Checks `41674353127` passed on this unchanged baseline.
- **PR #76 Team Lite signaling:** open/Draft, head `488a693dbd234817e87aa11eb232533e34459695`; the prior head `561026304756b9a2e5bd2029e59eda630df1b5cd` completed Candidate Checks `42125597354` with 103/103 authenticated checks, browser WebRTC/mesh, rate-limit and read-receipt concurrency, and fixture cleanup all passing, but the final candidate-check step failed at the voice-leave fallback assertion. The current head adds a two-file follow-up: preserve room ID/prepared/owner context until the leave RPC succeeds, report failure without discarding retry context, add fail-then-success regression coverage, and wait one event-loop turn before asserting a VM-context async fallback. Candidate Checks `42134550466` is pending; do not claim it passed until logs are inspected.
- **PR #80 continuity:** open/Draft, head `a353e684c9a3393421cdd108d76421e1d857a5e0`; latest Validate `42126202343` fails inherited `client signed upload helper missing` after build `3.0.40 / TEST 3.0.40-beta.22`.
- **PR #82 independent QA:** open/Draft, head `63e94e3730c5a0bb689f4def4893cd10277ae954`; Validate `42131148632` fails inherited `production updateURL mismatch`. QA branch was not modified.
- Ancestry: #74 is 639 ahead/0 behind `master`; #76 is 177 ahead/0 behind `team-lite-official` and 118 ahead/0 behind #75; #80 is 52 ahead/0 behind `develop`; #82 is 44 ahead/0 behind `master`. #76 descends from the Team Lite baseline; do not merge #75 and #76 independently.

### Production Supabase read-only recheck

- Project `dlfvkawaiqduhlazsszm`: `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002; seven migrations through `20261027155438`.
- Absent in production: open voice room RPC, leave room RPC, `merge_chat_read_receipts`, `consume_upstatus_signal_rate_limit`, and `upstatus_signal_rate_limits`.
- 38 Edge Functions active; key deployed versions: `upstatus` v480, `upstatus-test` v281, `upstatus-team-lite` v15, `upstatus-screen-share-3-1-1-beta10` v6. No dedicated `upstatus-signal` function.
- Three broadcast functions remain SECURITY DEFINER with EXECUTE effective for anon/authenticated. Message trigger still broadcasts full OLD/NEW rows on the public topic. Security Advisor: three anon SECURITY DEFINER WARN, three authenticated SECURITY DEFINER WARN, ten RLS-without-policy INFO; performance and health advisors empty.
- No production writes, migrations, function deployments, secret/flag/role changes, or releases were performed. All production SQL in this checkpoint was SELECT-only.

### Remaining release gates

- Inspect Candidate Checks `42134550466` on exact #76 head `488a693`; if it passes, still require physical browser/Tampermonkey and network-recovery acceptance.
- Issue #78 remains open: real offline/online recovery without F5, pagehide, devices, and installed Normal ↔ Team Lite interoperability are not proven by CI.
- Public Realtime disclosure, missing production migrations/RPCs, production endpoint cutover, distributed rate-limit integration in deployed endpoints, default ACL hardening, and the #74 639-commit ancestry review remain blockers.
- Keep all candidate PRs Draft. No merge, deploy, release, publication, production migration, or feature-flag change is authorized by this checkpoint.
