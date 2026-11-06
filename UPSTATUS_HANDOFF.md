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


### Cross-product leave review — 2026-11-05 21:04 BRT

- Static review of Normal PR #74 head `b0c0e03fbe820e02404d4ae7d9f83e2a18642e50` found the same retry-context risk: `voiceRoomLeave()` clears `signalVoiceRoomRoomId` and owner state before awaiting `signalTransport.leave(leavingRoomId)`, then suppresses RPC failure. The roster cache is also cleared before server confirmation. This is code inspection, not a runtime failure reproduction.
- Do not start another fixture-mutating workflow while Team Lite Candidate Checks `42134550466` is pending in the shared isolated-project concurrency group. After #76 completes and cleanup is confirmed, port the retain-until-success behavior to Normal with a fail-then-success regression. #74 remains otherwise CI-green on its current exact head.


### Final ancestry correction — 2026-11-05

The branch advanced with documentation follow-ups after the earlier 52-ahead snapshot. Its exact current ancestry must be re-fetched from GitHub before any integration decision; do not rely on the historical count.

## Engineering checkpoint — 2026-11-05 22:xx BRT

### Current PR and CI state

| PR | Current HEAD | Current evidence |
|---|---|---|
| #74 Normal | `b0c0e03fbe820e02404d4ae7d9f83e2a18642e50` | Validate 42122609464 and Signaling Smoke 42122609431 passed on this exact HEAD |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Candidate Checks 41674353127 passed historically on this exact baseline |
| #76 Team Lite | `7538296fd7e0d5208fe96da6baed0c9263f12e33` | Candidate Checks 42142527307 running; prior intermediate 6ba88b failed only in a new VM-test source-boundary escape |
| #80 Continuity | `5ea7773af33e5884828202e72efa639d0da1881c` | Validate 42142746252 failed at `client signed upload helper missing` |
| #82 QA | `3cb3539ba10c0061d104d5936c2c04ee5bb81b79` | Validate 42137572524 failed at `production updateURL mismatch` |

All five PRs remain open and Draft. #76 remains a descendant of #75; do not treat them as independent merges. Current ancestry comparisons: #74 is 639 commits ahead of master; #76 is 178 ahead of `team-lite-official` and 119 ahead of #75; #80 is 60 ahead of develop; #82 is 45 ahead of master. The large #74 ancestry remains a separate integration-review gate.

### Reconnect failure is confirmed

Issue #78 now records a manual failure in both candidate clients: after approximately 10 seconds offline during voice use, the user cannot reliably re-enter the room or recover call signaling without F5. This is a confirmed release blocker, not a pending manual test.

Code inspection found that offline handlers start voice leave while offline and immediately stop Realtime/signaling and clear room context. The leave path can therefore wait on an unreachable final signal or membership request while the transport is being torn down. Team Lite serializes a new join behind the leave promise. Normal also had a leave continuation that could consult a replacement global transport after reconnect. Legacy outgoing calls and group-call join requests did not wait for Realtime SUBSCRIBED before sending.

Isolated candidate branches now contain the proposed recovery:
- Team Lite `team-lite/reconnect-recovery-candidate`, head `7538296fd7e0d5208fe96da6baed0c9263f12e33`: local-only voice teardown on offline; Realtime readiness wait before legacy voice/call actions; tests for offline teardown, readiness, leave retry and stale transport.
- Normal `normal/reconnect-recovery-candidate`, head `08ebf838f327134a672d06d787d9cdbd778d801b`: equivalent local-only teardown, readiness gates, captured-transport leave retry and VM regressions.

The Team Lite branch has been fast-forwarded into Draft PR #76. Normal remains isolated until the shared Supabase test group is free. Neither candidate is declared approved until its exact-head CI passes. The physical 10-second outage test must be repeated after CI, including voice re-entry, outgoing/incoming calls, and duplicate-peer/polling cleanup.

### Production Supabase — read-only revalidation

Project `dlfvkawaiqduhlazsszm` remains ACTIVE_HEALTHY, PostgreSQL 17.11. Production still has 7 migrations through `20261027155438` and 38 active Edge Functions. There is no dedicated `upstatus-signal` function and the production catalog still lacks open/leave voice RPCs, `merge_chat_read_receipts`, `consume_upstatus_signal_rate_limit`, and the rate-limit table.

The three public broadcast functions remain SECURITY DEFINER and executable by anon/authenticated. The message broadcast still publishes OLD/NEW row JSON to public `db_change`. Nine backend-owned tables still have broad client table grants while RLS is enabled with no policies. Default ACLs remain broad for `postgres` in `public`/`storage` and `supabase_admin` in `public`/`graphql`/`graphql_public`. The available SQL role cannot alter `supabase_admin` defaults.

No production SQL write, migration, function update, flag change, secret change, deploy, release, or publication occurred. All catalog checks were SELECT-only.


## Engineering checkpoint — 2026-11-05 23:10 BRT

### Team Lite: confirmed voice leave is now a logout gate

The independent release-readiness audit identified that Team Lite awaited the voice leave path but did not require a confirmed server membership release before calling `/api/logout`, invalidating the auth generation, stopping Realtime, and clearing the stored token. The offline handler also stopped the transport and discarded the room ID, making a later retry impossible in the same page.

The Draft PR #76 branch `team-lite/signaling-transport-candidate` is now at `f5739813c3d49f889eb4d51bb65cea44248e60d6` and contains these candidate changes:

- Preserve the authenticated room ID through offline and online Realtime teardown; reset only transport/prepared/owner state so the next join performs a fresh open-room handshake.
- Treat explicit `false`, `{ok:false}`, or error responses from the leave RPC as unconfirmed; do not clear the room binding on those responses.
- Make `voiceRoomLeave()` return a confirmation boolean and retain the room ID when both the primary leave and fallback fail.
- Block logout while offline or while a server-owned room ID remains. On failure, keep the authenticated session/token/storage intact, restore the card, and show a retry message. A later online retry can use the reinitialized authenticated transport.
- Extend the candidate harness for room-context preservation, denied leave responses, logout gating, and session/token retention.

Commit sequence after the previously validated head: `24e5c64`, `fea56b0`, `6c1fcf5`, `f573981`.

Validation is intentionally not claimed for the new head yet. The prior exact head `092dc83` passed Candidate Checks run [42143206998](https://github.com/Reekyi/UpStatus/actions/runs/42143206998), including 103/103 authenticated integration checks, browser WebRTC call/voice/screen tests, three-member mesh, 90 accepted plus one HTTP 429, rate-limit and read-receipt concurrency, migration-layout guard, candidate metadata, and fixture cleanup. For the new work, run [42148017860](https://github.com/Reekyi/UpStatus/actions/runs/42148017860) is still in progress on older commit `24e5c64`; the latest exact-head run [42148155469](https://github.com/Reekyi/UpStatus/actions/runs/42148155469) is pending behind the shared isolated-test concurrency group. Do not start another mutating suite until these runs finish and cleanup is verified.

### Normal: same logout failure found and isolated candidate updated

The Normal source template had the same underlying risk: offline teardown cleared `signalVoiceRoomRoomId`, and the logout click handler ignored the result of `voiceRoomLeave()` before calling `/api/logout` and clearing local credentials.

The separate branch `normal/reconnect-recovery-candidate` is now at `bbf1f2bc5464d7c4fa862473241df8d49bd26381`, 18 commits ahead and zero behind PR #74's current head `b0c0e03`. It preserves the room ID on offline teardown, treats unsuccessful leave RPC responses as failures, and gates logout before API/session/token invalidation. Static regressions cover the retained room ID, denied RPC response, and logout retry UI. This branch has not been run through CI and remains isolated; do not fast-forward it into PR #74 until the shared test group is free and its exact-head checks pass.

### Current PR and CI state

- #74 Normal: `b0c0e03`, Draft; Validate [42122609464](https://github.com/Reekyi/UpStatus/actions/runs/42122609464) and Signaling Smoke [42122609431](https://github.com/Reekyi/UpStatus/actions/runs/42122609431) passed on that exact PR head. The newer Normal recovery branch is separate and unvalidated.
- #75 Team Lite baseline: `7bbf9b9`, Draft; Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passed historically.
- #76 Team Lite signaling: `f573981`, Draft; exact-head Candidate Checks [42148155469](https://github.com/Reekyi/UpStatus/actions/runs/42148155469) pending.
- #80 continuity: `c6fabac`, Draft; Validate [42143354543](https://github.com/Reekyi/UpStatus/actions/runs/42143354543) fails with `client signed upload helper missing`.
- #82 independent QA: `b916551`, Draft; Validate [42144878286](https://github.com/Reekyi/UpStatus/actions/runs/42144878286) fails with `production updateURL mismatch`. QA branch remains untouched.

Ancestry at this checkpoint: #74 is 639 commits ahead of `master`; #76 is 194 ahead of `team-lite-official` and 135 ahead of #75; #80 is 68 ahead of `develop`; #82 is 46 ahead of `master`.

### Residual lifecycle limitation

The room ID is currently preserved in page memory, not persisted across a full browser reload. If the browser is closed while offline, the token remains in userscript storage but the in-memory room ID is lost; server membership can remain until its TTL. The candidate fixes prevent same-page logout from invalidating the session without confirmation, but they do not yet eliminate the reload/TTL case. Follow-up should either persist a pending room binding safely (scoped to the authenticated member/session) or provide an authenticated server-side cleanup path. Keep issue #78 open until physical outage/recovery and this lifecycle edge are verified.

### Production remains read-only

The production project `dlfvkawaiqduhlazsszm` was rechecked with SELECT/catalog/advisor reads only. It remains ACTIVE_HEALTHY on PostgreSQL 17.11.0.002 with 7 migrations through `20261027155438` and 38 active Edge Functions. Production still lacks the open/leave voice RPCs, `merge_chat_read_receipts`, `consume_upstatus_signal_rate_limit`, the rate-limit table, and a dedicated `upstatus-signal` function. The three public broadcast functions remain SECURITY DEFINER and executable by anon/authenticated; the message broadcast still includes OLD/NEW row JSON on public `db_change`. Nine backend-owned tables retain broad client grants with RLS enabled and no policies. Default ACLs remain broad for `postgres` in `public`/`storage` and `supabase_admin` in `public`/`graphql`/`graphql_public`; the available SQL role cannot modify the latter defaults.

No production SQL write, migration, function update, flag change, secret change, deploy, release, merge, or userscript publication occurred.


## CI follow-up — 2026-11-05 23:16 BRT

The earlier run [42148017860](https://github.com/Reekyi/UpStatus/actions/runs/42148017860) on commit `24e5c64` has now completed with a harness-only failure. It passed 103/103 authenticated integration checks, browser WebRTC call/voice/screen negotiation and remote-track delivery, three-member mesh teardown, 90 accepted plus one HTTP 429, rate-limit concurrency, atomic read-receipt concurrency, migration-layout guard, candidate metadata checks, and isolated fixture cleanup. The final VM logout-gate test then raised `ReferenceError: teamLiteNetworkOffline is not defined`: the extracted test context did not define the new global used by the gate. Commit `6c1fcf5` added `teamLiteNetworkOffline:false` to that harness context, and `f573981` is the current candidate head containing the corrected test.

The latest exact-head run [42148155469](https://github.com/Reekyi/UpStatus/actions/runs/42148155469) on `f573981` is now in progress. Setup, checkout, mutation guard, authenticated adapter, and endpoint-auth tests passed; the authenticated integration/browser step is still running. Rate-limit concurrency, read-receipt concurrency, migration-layout, candidate metadata, and final cleanup are pending. No approval is claimed for `f573981` until this run completes successfully and cleanup is confirmed.


## CI follow-up — 2026-11-05 23:20 BRT

The exact-head run [42148155469](https://github.com/Reekyi/UpStatus/actions/runs/42148155469) on `f573981` completed with a test-harness-only failure. It passed all 103 authenticated integration checks, browser WebRTC call/voice/screen negotiation and remote-track delivery, three-member mesh teardown, 90 accepted plus one HTTP 429, rate-limit concurrency, atomic read-receipt concurrency, migration-layout guard, candidate metadata/updater checks, and isolated fixture cleanup. The final new logout-gate VM test failed because its stub used `this.voiceRoomLeaveCalls` while the VM invokes the extracted global function with an undefined receiver. Commit `8678b4b` replaces that stub with a closure counter and arrow functions.

The isolated test project `upstatus-security-test` (`bfpjtfqlnypisxljoxkb`, PostgreSQL 17.11.0.003) was checked read-only after the failed run. Counts for test-prefixed users, sessions, rooms, memberships, events, rate-limit buckets, and chat-read rows were all zero. The latest exact-head Candidate Checks run [42149391376](https://github.com/Reekyi/UpStatus/actions/runs/42149391376) on `8678b4b` is now in progress. No approval is claimed until it completes and the cleanup check is repeated.


## Additional release-gate finding — expired voice room response semantics — 2026-11-05 23:24 BRT

Read the candidate migration `20261105190000_open_voice_room_membership.sql` on the Team Lite branch. It sets voice-room expiry to two hours and the leave RPC returns terminal JSON errors `ROOM_UNAVAILABLE` when the room is closed/expired and `ROOM_MEMBERSHIP_ENDED` when the user is no longer an accepted member. The shared signaling adapter's `post()` throws with `error.code` for non-2xx responses and returns JSON bodies for 2xx responses. The current Normal and Team Lite clients treat any `result.error` or thrown leave error as an unconfirmed failure, retaining the room ID and blocking logout. That is too strict for these two terminal states: the server is saying there is no active membership to release. The next safe fix is to normalize only `ROOM_UNAVAILABLE` and `ROOM_MEMBERSHIP_ENDED` to an idempotent successful leave in the shared adapter (cover both 2xx JSON and non-2xx error responses), while preserving failure behavior for all other errors. This is not implemented yet and must receive adapter/client regressions before release.

Team Lite exact-head run [42149391376](https://github.com/Reekyi/UpStatus/actions/runs/42149391376) on `8678b4b` is still in progress; the prior `f573981` run's only failure was the VM test stub receiver and was corrected in `8678b4b`. Keep PR #76 Draft until the new run and cleanup pass. Normal candidate `bbf1f2b` remains isolated and unvalidated.


## Ancestry refresh — 2026-11-05 23:26 BRT

Re-read current PR refs after the documentation and logout-gate commits:

- #74 `b0c0e03` vs `master`: 639 ahead / 0 behind.
- #75 `7bbf9b9` vs `team-lite-official`: baseline unchanged.
- #76 `8678b4b` vs `team-lite-official`: 195 ahead / 0 behind; vs #75: 136 ahead / 0 behind.
- #80 `e04146e` vs `develop`: 76 ahead / 0 behind (documentation-only commits account for the increase).
- #82 `b916551` vs `master`: 46 ahead / 0 behind.
- Normal recovery candidate `bbf1f2b` vs PR #74 head `b0c0e03`: 18 ahead / 0 behind.

All five PRs remain Draft. Team Lite exact-head Candidate Checks [42149391376](https://github.com/Reekyi/UpStatus/actions/runs/42149391376) remains in progress on `8678b4b`; Normal candidate remains unvalidated.


## Engineering refresh — 2026-11-05 23:31 BRT

### Exact current GitHub state

All five PRs remain open, Draft, and unmerged. Refs and CI were re-fetched; do not reuse earlier heads:

- **#74 Normal** `b0c0e03fbe820e02404d4ae7d9f83e2a18642e50`, 639 ahead / 0 behind `master`. Validate [42122609464](https://github.com/Reekyi/UpStatus/actions/runs/42122609464) and Signaling Smoke [42122609431](https://github.com/Reekyi/UpStatus/actions/runs/42122609431) passed on this exact head.
- **#75 Team Lite baseline** `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`, 59 ahead / 0 behind `team-lite-official`. Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passed historically on this unchanged baseline.
- **#76 Team Lite signaling** `88a0865efee9194c868dc685f3de946b128d83bd`, 196 ahead / 0 behind `team-lite-official`, 137 ahead / 0 behind #75. The preceding exact head `8678b4b` passed Candidate Checks [42149391376](https://github.com/Reekyi/UpStatus/actions/runs/42149391376); the new exact-head run [42150807002](https://github.com/Reekyi/UpStatus/actions/runs/42150807002) is in progress for the terminal-leave normalization added at `88a0865`.
- **#80 continuity** `7de59898a4f76645d89df390b9b3f002f97b3172`, 78 ahead / 0 behind `develop`. Validate [42149838692](https://github.com/Reekyi/UpStatus/actions/runs/42149838692) fails at the pre-existing `client signed upload helper missing` assertion.
- **#82 independent QA** `b916551b925da245d7bc1583f3c7ee1b9e641ba8`, 46 ahead / 0 behind `master`. Validate [42144878286](https://github.com/Reekyi/UpStatus/actions/runs/42144878286) fails at `production updateURL mismatch`. QA branch remains untouched.

### Voice-room leave terminal states

- The Normal recovery candidate branch `normal/reconnect-recovery-candidate` has advanced independently to `1ca2de6e3abbb383be1ccb4afff09d8b3c13dc12`, 20 commits ahead / 0 behind #74. It now normalizes only `ROOM_UNAVAILABLE` and `ROOM_MEMBERSHIP_ENDED` as idempotent successful leaves for both 2xx JSON error bodies and non-2xx error responses. Other membership errors still reject. Adapter regressions cover both codes in both response forms plus a non-terminal 403. This branch has no CI run/status yet; do not call it validated or fast-forward it into #74 without exact-head checks.
- The same narrowly scoped adapter behavior and five assertions were ported to Team Lite PR #76 in commit [88a0865](https://github.com/Reekyi/UpStatus/commit/88a0865efee9194c868dc685f3de946b128d83bd). It changes only `src/userscript/signaling-transport.mjs` and `scripts/signaling-transport.test.mjs`. Exact-head Candidate Checks [42150807002](https://github.com/Reekyi/UpStatus/actions/runs/42150807002) is still running; no PASS is claimed for `88a0865` until it completes and fixture cleanup is verified.
- The previous Team Lite head `8678b4b` passed 103/103 authenticated integration checks, browser WebRTC call/voice/screen with remote tracks, three-member mesh, open-voice late join/owner handoff/race/capacity/last-member cleanup, 90 accepted + 1 HTTP 429, rate-limit concurrency, atomic read-receipt concurrency, migration-layout guard, candidate metadata/updater tests, and voice leave/logout retry tests. Adapter unit test reported 17 assertions. The isolated project cleanup check afterward returned zero test-prefixed users, sessions, rooms, memberships, events, rate-limit buckets, and chat-read rows.
- The two terminal codes are deliberately treated as success only by `leave()`; non-terminal authorization/network failures remain failures so clients retain room context and block logout. This does not resolve the two-hour stale-membership lease or room-ID loss after a full offline browser reload.

### Production and release gates (read-only)

Production `dlfvkawaiqduhlazsszm` remains ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, seven migrations through `20261027155438`, 38 active Edge Functions. The production SQL session is `postgres`.

- `upstatus` v480, `upstatus-test` v281, `upstatus-team-lite` v15, and `upstatus-screen-share-3-1-1-beta10` v6 remain the relevant deployed functions. No dedicated `upstatus-signal` exists.
- Production still lacks `upstatus_signal_rate_limits`, `consume_upstatus_signal_rate_limit`, `merge_chat_read_receipts`, `open_upstatus_signal_voice_room`, and `leave_upstatus_signal_room`.
- The three public broadcast functions remain SECURITY DEFINER, `search_path=public`, and executable by anon/authenticated. The message trigger still publishes OLD/NEW row JSON to public `db_change`. Nine backend-owned tables retain all eight client table privileges while RLS is enabled with no policies. Default ACLs remain broad for postgres in `public`/`storage` and supabase_admin in `public`/`graphql`/`graphql_public`; current SQL role cannot administer supabase_admin defaults.
- Security Advisor: 3 WARN for anon-executable SECURITY DEFINER functions, 3 WARN for authenticated-executable functions, and 10 INFO for RLS without policies. Performance and health advisors have no findings.
- Physical no-F5 recovery, real Tampermonkey GM bridge, microphone/display capture, and installed Normal ↔ Team Lite interoperability remain MANUAL PENDING under #78. The authenticated transport remains default-off. Production remains read-only.

No merge, deploy, release, production SQL write/migration, secret/flag/role change, userscript publication, or destructive action occurred in this checkpoint.


## Engineering checkpoint — 2026-11-06

### Exact GitHub state

All five tracked PRs remain open, Draft, and unmerged. Exact refs were re-fetched from GitHub:

- **#74 Normal:** `chore/continuity-foundation`, HEAD `b0c0e03fbe820e02404d4ae7d9f83e2a18642e50`, 639 ahead / 0 behind `master`. Validate [42122609464](https://github.com/Reekyi/UpStatus/actions/runs/42122609464) and Signaling Smoke [42122609431](https://github.com/Reekyi/UpStatus/actions/runs/42122609431) passed on this exact head.
- **#75 Team Lite baseline:** `team-lite/3.4.31-guest-fixes`, HEAD `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`, 59 ahead / 0 behind `team-lite-official`. Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passed historically.
- **#76 Team Lite signaling:** `team-lite/signaling-transport-candidate`, HEAD `3627557f244c98a9c7e1cc986c7cea43124863a9`, 138 ahead / 0 behind #75. Candidate Checks [42153971733](https://github.com/Reekyi/UpStatus/actions/runs/42153971733) is running on this exact head; the authenticated integration/browser step is still in progress. Do not claim a pass until all steps and cleanup complete.
- **#80 continuity:** `docs/continuity-handoff-2026-11-04`, HEAD `222edcecf892edbb62f7b649f44adce23d123b25`, 79 ahead / 0 behind `develop`. Validate [42150956107](https://github.com/Reekyi/UpStatus/actions/runs/42150956107) fails at the inherited `client signed upload helper missing` assertion.
- **#82 independent QA:** `qa/release-readiness-2026-11-04-master`, HEAD `151f63793a71949f5d4ba2c600f24c8401ce753b`, 48 ahead / 0 behind `master`. Validate [42151484883](https://github.com/Reekyi/UpStatus/actions/runs/42151484883) fails at the inherited `production updateURL mismatch` assertion. QA branch remains untouched.

The separate Normal recovery candidate `normal/reconnect-recovery-candidate` is at `1ca2de6e3abbb383be1ccb4afff09d8b3c13dc12`, 20 commits ahead / 0 behind #74. It contains the offline/online recovery and leave-retry work plus terminal leave-state normalization. No workflow run is associated with this exact candidate head; do not fast-forward it into #74 until its exact-head checks pass.

### Team Lite bundle mismatch fixed; validation pending

The prior exact-head run [42150807002](https://github.com/Reekyi/UpStatus/actions/runs/42150807002) on `88a0865efee9194c868dc685f3de946b128d83bd` passed the mutation guard, adapter regressions, 15/15 unauthenticated checks, 103/103 authenticated integration checks, Chromium call/voice/screen WebRTC with remote tracks, the three-member room race, rate-limit 90+1, rate-limit concurrency, atomic read-receipt concurrency, migration-layout guard, candidate metadata, and fixture cleanup. It failed only at the final candidate assertion because `team-lite/upstatus-team-lite.user.js` still contained the old bundled `leave()` implementation while `src/userscript/signaling-transport.mjs` contained the new terminal-state normalization.

Commit [3627557](https://github.com/Reekyi/UpStatus/commit/3627557f244c98a9c7e1cc986c7cea43124863a9) updates only the Team Lite userscript bundle. Before writing, the branch head, previous bundle blob, shared adapter blob, and exact commit diff were inspected. The stale leave block was replaced from the shared source; a local content comparison confirmed the normalized shared adapter is now an exact substring of the bundle. The existing checker was not weakened. Exact-head Candidate Checks [42153971733](https://github.com/Reekyi/UpStatus/actions/runs/42153971733) is still in progress. A read-only query after the prior run found zero test users, sessions, rooms, memberships, events, bindings, rate-limit buckets, and chat-read rows in isolated project `bfpjtfqlnypisxljoxkb`. The current run is using that shared fixture project; do not start another mutating suite until it completes and cleanup is verified again.

### Production Supabase — SELECT-only revalidation

Project `dlfvkawaiqduhlazsszm` remains `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002, with seven migrations through `20261027155438` and 38 ACTIVE Edge Functions. Core deployed versions remain `upstatus` v480, `upstatus-test` v281, `upstatus-team-lite` v15, and legacy screen-share beta10 v6. No dedicated production `upstatus-signal` exists.

Production still lacks the open/leave voice-room RPCs, `merge_chat_read_receipts`, `consume_upstatus_signal_rate_limit`, and the rate-limit table. The three broadcast functions remain SECURITY DEFINER with `search_path=public` and EXECUTE available to `anon` and `authenticated`; `upstatus_broadcast_messages()` still sends OLD/NEW row JSON to public `db_change`. Nine backend-owned tables retain all eight table privileges for both client roles while RLS is enabled with zero policies. `realtime.messages` also has RLS enabled with zero policies and retains anon/authenticated SELECT, INSERT, and UPDATE grants. Default ACLs remain broad for `postgres` in `public` and `storage`, and for `supabase_admin` in `public`, `graphql`, and `graphql_public`; the available SQL connection remains `postgres` and cannot administer the `supabase_admin` defaults.

Security Advisor still reports 3 WARN for anon-executable SECURITY DEFINER functions, 3 WARN for authenticated-executable functions, and 10 INFO for RLS without policies. Performance and health advisors return no findings.

Issue #78 remains open: physical no-F5 network recovery, full Tampermonkey GM-bridge/device validation, Normal ↔ Team Lite installed interoperability, and the full-reload/offline room-ID persistence edge remain unverified. Voice-room IDs are retained in page memory; a browser closed while offline can still leave a server membership until its two-hour room TTL.

No production SQL write, migration, Edge Function update, secret/flag/role change, deploy, release, userscript publication, merge, or destructive action occurred.


## Continuity validation follow-up — 2026-11-06

The documentation commits advanced PR #80 to HEAD `41dd77d69b1866ea0f2bae97f2634fcad43415d1`, now 81 commits ahead / 0 behind `develop`. Exact-head Validate [42154265009](https://github.com/Reekyi/UpStatus/actions/runs/42154265009) completed and reproduced the inherited `client signed upload helper missing` assertion after building `3.0.40 / TEST 3.0.40-beta.22`. This is the same base-validator mismatch already recorded; no validator was weakened and the documentation-only changes did not alter runtime code.

Team Lite PR #76 remains at `3627557f244c98a9c7e1cc986c7cea43124863a9`; Candidate Checks [42153971733](https://github.com/Reekyi/UpStatus/actions/runs/42153971733) is still in the authenticated integration/browser step. Its exact adapter/bundle equality fix is committed, but final CI and post-run fixture cleanup remain pending.


## 2026-11-06 live engineering checkpoint

This section supersedes older PR/CI snapshots above where exact refs differ. Rechecked against GitHub and Supabase during the 2026-11-06 engineering run. All PRs remain open, Draft, and unmerged.

### Current candidate refs and CI

- **Normal PR #74**: branch `chore/continuity-foundation`, base `master`, HEAD `872d567a6c5cbe227ab44d808befca702b34da5a`; 664 commits ahead / 0 behind `master`.
  - The isolated `normal/reconnect-recovery-candidate` branch was 20 commits ahead / 0 behind the prior #74 head before a fast-forward. Its four-file diff contained the reconnect/leave lifecycle implementation and regression coverage. The PR branch was fast-forwarded with expected-head protection; no force update or merge.
  - Candidate follow-ups corrected two stale assertions in the static/validate harnesses and fixed a real cleanup gap: microphone/setup failure after opening an authenticated voice room now calls the confirmed `voiceRoomLeave()` path rather than clearing `signalVoiceRoomRoomId` before an unconfirmed RPC. If leave fails, the room ID remains available for logout/retry. A regression assertion guards against reintroducing the early clear.
  - Validate [42160740788](https://github.com/Reekyi/UpStatus/actions/runs/42160740788) passed on the exact HEAD. Signaling Smoke [42160740799](https://github.com/Reekyi/UpStatus/actions/runs/42160740799) is pending behind the shared isolated-fixture concurrency group. Earlier Smoke [42160472429](https://github.com/Reekyi/UpStatus/actions/runs/42160472429), on prior head `8942324`, was still in progress at the last poll; do not claim exact-head Smoke success until the queued run finishes.
- **Team Lite PR #76**: branch `team-lite/signaling-transport-candidate`, HEAD `3627557f244c98a9c7e1cc986c7cea43124863a9`; 197 ahead / 0 behind `team-lite-official`, and 138 ahead / 0 behind PR #75.
  - Candidate Checks [42153971733](https://github.com/Reekyi/UpStatus/actions/runs/42153971733) passed on the exact HEAD. Full job logs confirm 103/103 authenticated integration checks, call/voice/screen WebRTC with remote tracks, three-member mesh, open voice join/late-member/owner-handoff/race/capacity checks, 90 accepted + 1 rejected (429), distributed rate-limit concurrency, atomic read-receipt concurrency, Team Lite leave/retry/offline recovery checks, updater/portal/version checks, and fixture cleanup.
- **Team Lite baseline PR #75**: HEAD `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passed. #76 is a descendant/continuation, not an independent sibling release payload.
- **Continuity PR #80**: HEAD `8c49bb39af368bcb3c73b8cc38eef58976dbd099`; 83 ahead / 0 behind `develop`. Validate [42154459967](https://github.com/Reekyi/UpStatus/actions/runs/42154459967) fails at the inherited `client signed upload helper missing` assertion.
- **Independent QA PR #82**: HEAD `704ba71795d31eb63278dffa0ac74ebcb30572ba`; 49 ahead / 0 behind `master`. Validate [42157072865](https://github.com/Reekyi/UpStatus/actions/runs/42157072865) fails at the inherited `production updateURL mismatch` assertion. QA branch was not modified.

### Normal reconnect/leave findings

- The Normal candidate waits for Realtime subscription before legacy voice rejoin/outgoing call allocation, serializes leave/rejoin, coalesces duplicate leave, invalidates stale outgoing attempts, preserves room ID on unconfirmed leave, and prevents an old leave promise from using a replacement transport.
- A second orphan-membership path was found in the microphone/setup failure catch: it previously cleared the room ID and swallowed `signalTransport.leave()` failure. The candidate now routes this through `voiceRoomLeave()`, which only clears the ID after terminal/confirmed release; failure retains the context and adds a user-visible retry warning.
- The first exact-head runs on `1ca2de6` exposed stale test contracts, not runtime regressions: the static test expected a standalone `var leavingTransport` declaration although it is part of a comma declaration, and Validate expected a direct `return leavePromise` / direct logout call although the helper returns `voiceRoomLeavePromise` and logout uses `normalReleaseVoiceRoomBeforeLogout()`. Assertions were updated to validate the actual semantics. Latest Validate passed; latest Smoke remains pending.

### Production Supabase recheck — read-only

- Project `dlfvkawaiqduhlazsszm`: `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002, seven migrations through `20261027155438`.
- The 38 listed Edge Functions are ACTIVE and report `verify_jwt=false`; this is not proof that every route lacks application-level auth. Core UpStatus functions use the custom session token, and the per-function auth inventory remains a separate gate.
- Production still lacks `open_upstatus_signal_voice_room`, `leave_upstatus_signal_room`, `merge_chat_read_receipts`, `consume_upstatus_signal_rate_limit`, and the distributed rate-limit table.
- Nine backend-owned tables (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) retain all eight table privileges for `anon` and `authenticated`, while RLS is enabled with zero policies. `upstatus_visual_config` has no client table grants. `realtime.messages` retains client SELECT/INSERT/UPDATE grants with RLS and no policies; do not infer direct row access from grants alone.
- The three trigger functions `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()`, and `upstatus_broadcast_users()` remain SECURITY DEFINER with `search_path=public` and EXECUTE available to `anon` and `authenticated`. The messages trigger still serializes the complete OLD/NEW row and broadcasts to the public `db_change` topic.
- Default ACLs remain broad: `postgres` has anon/authenticated defaults for tables/functions/sequences in `public` and `storage`; `supabase_admin` has them in `public`, `graphql`, and `graphql_public`. Its `realtime` defaults in the catalog are for `dashboard_user`, not the client roles. SQL session is `postgres`, not superuser and not a member of `supabase_admin`; no role escalation was attempted.
- Security Advisor: 3 WARN for anon-executable SECURITY DEFINER functions, 3 WARN for authenticated-executable functions, 10 INFO for RLS without policies. Performance and health advisors returned no findings.
- Isolated project `bfpjtfqlnypisxljoxkb` is `ACTIVE_HEALTHY` on PostgreSQL 17.11.0.003 and contains the candidate/test migrations used by CI. This does not change production state.

### Remaining release gates

- Issue #78 remains open: physical no-F5 network interruption/recovery in full Tampermonkey, real microphone/display-capture permissions, installed Normal ↔ Team Lite interoperability, and reload/close-while-offline room membership behavior remain unverified.
- Voice-room room IDs are currently held in page memory. Closing the browser while offline can still leave a server membership until its two-hour room TTL; durable recovery across full page/process termination is not established.
- Public Realtime payload minimization/cutover, default ACL hardening (including the administrative `supabase_admin` path), production migration ordering, endpoint/function cutover and rollback, and version bump remain blockers.
- No production SQL write, migration, Edge Function update, secret/flag/role change, deploy, release, userscript publication, merge, or destructive action occurred in this checkpoint.


## 2026-11-06 Normal exact-head follow-up

- Normal PR #74 advanced from `872d567` to `562d60e73e5827a8d87d6959c06e87af4c356588`. The only change after `872d567` is a test assertion update: the microphone/setup-failure catch now uses the shared confirmed leave helper, so the static contract must not require the removed direct `signalTransport.leave(failedRoom)` call.
- Exact-head Validate [42161030346](https://github.com/Reekyi/UpStatus/actions/runs/42161030346) passed.
- Smoke [42161030275](https://github.com/Reekyi/UpStatus/actions/runs/42161030275) is in progress. Static harnesses and unauthenticated endpoint checks passed; authenticated isolated integration/browser tests are running. Do not claim exact-head Smoke success until this run completes.
- Smoke [42160472429](https://github.com/Reekyi/UpStatus/actions/runs/42160472429) completed successfully on prior head `8942324`; this is useful baseline evidence but not exact-head evidence for the microphone-failure fix.
- Smoke [42160740799](https://github.com/Reekyi/UpStatus/actions/runs/42160740799) failed on `872d567` only at a stale static assertion expecting the old direct `failedRoom` call. The candidate now tests the confirmed shared leave path and preserves the room ID on failure.
- The latest continuity-doc Validate [42160896890](https://github.com/Reekyi/UpStatus/actions/runs/42160896890) on PR #80 HEAD `33ea888` reproduced the inherited `client signed upload helper missing` assertion. No validator was weakened.


## 2026-11-06 Normal Smoke assertion follow-up

This note supersedes the earlier `872d567` Normal head reference above.

- Current Normal PR #74 HEAD: `562d60e73e5827a8d87d6959c06e87af4c356588`.
- Exact-head Validate [42161030346](https://github.com/Reekyi/UpStatus/actions/runs/42161030346) passed.
- Exact-head Smoke [42161030275](https://github.com/Reekyi/UpStatus/actions/runs/42161030275) is still running. Its syntax/static harness step and unauthenticated endpoint checks passed; authenticated isolated integration/browser checks are in progress. Do not mark exact-head Smoke complete yet.
- Smoke [42160740799](https://github.com/Reekyi/UpStatus/actions/runs/42160740799) on `872d567` failed before endpoint/integration tests because one static assertion still required the old direct `signalTransport.leave(failedRoom)` call. The microphone/setup failure path now uses `await voiceRoomLeave()` so the shared helper can preserve room ID on failed server release. The assertion was corrected in `562d60e`; this was a stale test contract, not a runtime test failure.
- Smoke [42160472429](https://github.com/Reekyi/UpStatus/actions/runs/42160472429) passed on prior head `8942324`, before the later microphone/setup failure cleanup change; it is not exact-head evidence for `562d60e`.
- Continuity PR #80 HEAD is `ba677c885ec2c61d6a72f5908c92f6d0fa322606`; Validate [42161109206](https://github.com/Reekyi/UpStatus/actions/runs/42161109206) reproduced the inherited `client signed upload helper missing` assertion after building `3.0.40 / TEST 3.0.40-beta.22`. No validator was weakened.


## 2026-11-06 — authenticated call-room cleanup retry

### Candidate changes
- Normal candidate branch `normal/call-room-leave-retry-20261106`: HEAD `c6d21ae5452378d02d313b4931cc48c4af1df484`, now fast-forwarded to PR #74.
- Team Lite candidate branch `team-lite/call-room-leave-retry-20261106`: HEAD `db7558520d8202673d822cda010964e57fac7b43`, now fast-forwarded to PR #76.
- Both clients now retain a separate in-memory `signalPendingCallLeaves` handle when call-room leave is not confirmed. The attempt captures its transport; a replacement transport is used only by a later explicit retry/reconnect pass. Confirmed leave clears the pending handle and related maps.
- Normal logout and Team Lite session end now await call-room release before voice-room release, server logout, Realtime teardown or credential clearing. Failed leave keeps the session active and retryable.
- Candidate regression coverage includes fail-then-success, no transport/offline, transport replacement during pending signal, persistent failure, member isolation and logout gating. Both full userscript sources passed syntax compilation in an isolated JavaScript harness; the appended dynamic regression blocks were executed against the exact candidate source and passed. This is not a substitute for the repository's full CI.

### Exact-head CI
- #74 `c6d21ae`: Validate [42166495867](https://github.com/Reekyi/UpStatus/actions/runs/42166495867) passed. Signaling Smoke [42166495874](https://github.com/Reekyi/UpStatus/actions/runs/42166495874) is pending behind the shared isolated test group.
- #76 `db75585`: Candidate Checks [42166395958](https://github.com/Reekyi/UpStatus/actions/runs/42166395958) was cancelled before jobs started. The earlier run [42166267489](https://github.com/Reekyi/UpStatus/actions/runs/42166267489), on parent head `c133569`, remains in authenticated integration/browser tests. No exact-head CI approval exists for `db75585`.
- The isolated project `bfpjtfqlnypisxljoxkb` is occupied by that older Team Lite run. Last read-only count: 4 users, 4 sessions, 11 rooms, 13 memberships, 1 event, 1 room binding, 6 rate-limit buckets, 0 chat_reads. Do not start another fixture-mutating suite until the run completes and cleanup is verified.

### Remaining limitations
- The pending call-room handle is in page memory only. A full browser close/reload while offline can still lose it; server membership may remain until the two-hour TTL. Durable recovery across process termination is not solved.
- Physical no-F5 recovery, pagehide/reload offline, real microphone/display-capture, installed Normal ↔ Team Lite interoperability, public Realtime cutover, production migrations, rate-limit integration, default ACL/admin `supabase_admin` path, ancestry review and human reviews remain release gates.
- Production `dlfvkawaiqduhlazsszm` was inspected read-only: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations through `20261027155438`, 38 active Edge Functions. The three broadcast functions remain SECURITY DEFINER/client-executable; nine backend-owned tables retain client grants with RLS and no policies; default ACLs remain broad. Security Advisor: 3 WARN for anon, 3 WARN for authenticated, 10 INFO RLS/no-policy; performance and health have no findings.

No production write, migration, role/secret/feature-flag change, deploy, release, userscript publication, merge or destructive operation occurred.


## 2026-11-06 — superseding exact-head checkpoint

This section supersedes the earlier call-room checkpoint's candidate SHAs and CI states.

- Normal #74 HEAD is now `2e346162d6db9fe05a68a97d501039ddb6de4547` (671 ahead / 0 behind master). Exact Validate [42166842757](https://github.com/Reekyi/UpStatus/actions/runs/42166842757) passed. Exact Smoke [42166842803](https://github.com/Reekyi/UpStatus/actions/runs/42166842803) passed syntax and unauthenticated endpoint checks; authenticated integration/browser is still running.
- Team Lite #76 HEAD is now `95d88e34c25679e161f09654f5f7e372f2a7a430` (201 ahead / 0 behind team-lite-official; 142 ahead / 0 behind #75). Exact Candidate Checks [42166848429](https://github.com/Reekyi/UpStatus/actions/runs/42166848429) is pending behind the shared isolated project. The prior run [42166267489](https://github.com/Reekyi/UpStatus/actions/runs/42166267489) on parent `c133569` passed integration/browser, rate-limit/read-receipt concurrency, migration-layout and cleanup; it failed only at a stale final assertion expecting the removed direct `signalTransport.leave(signalRoomId)` call. The assertion is updated in `95d88e3`; no exact-head pass yet.
- Normal's previous Smoke [42166495874](https://github.com/Reekyi/UpStatus/actions/runs/42166495874) failed at a stale assertion that expected the old direct call. The assertion is updated in `2e34616`; the new exact-head Smoke is running.
- #80 is now `df932946`, 88 ahead / 0 behind develop; Validate [42166706068](https://github.com/Reekyi/UpStatus/actions/runs/42166706068) again reproduces `client signed upload helper missing`. #82 remains `4b85bb1`; Validate [42163103958](https://github.com/Reekyi/UpStatus/actions/runs/42163103958) remains failed on `production updateURL mismatch`. No QA branch changes.

### Additional pagehide gap
A fresh read of both userscripts confirms their `pagehide` handlers call only `voiceRoomLeave()`; neither calls `callCleanup()`. Thus an active authenticated call can leave its call-room membership until server TTL when the tab closes. The current pending-call handle is also memory-only. The next isolated candidate should queue call cleanup from pagehide and persist only validated room ID, member, call ID and timestamp in userscript storage (never the session token), restoring/retrying only after the same member authenticates. This is not implemented yet; issue #78 remains open.

The shared isolated Supabase project is currently used by Normal Smoke, with Team Lite Candidate Checks pending. Do not start another fixture-mutating run until both workflows finish and cleanup is rechecked. Production remains read-only and unchanged.


## 2026-11-06 03:02 BRT — exact-head CI and durable pagehide candidate

### Current PRs and workflow state (re-read from GitHub)
- **#74 Normal** is open/Draft at `acd26e02119633164c0e23624bcccdf5bd66bd5f` (671 ahead / 0 behind `master`). Exact-head Validate [42172519530](https://github.com/Reekyi/UpStatus/actions/runs/42172519530) and Signaling Smoke [42172519519](https://github.com/Reekyi/UpStatus/actions/runs/42172519519) are both in progress. No result is claimed yet.
- **#76 Team Lite** is open/Draft at `95d88e34c25679e161f09654f5f7e372f2a7a430` (201 ahead / 0 behind `team-lite-official`; 142 ahead / 0 behind #75). Exact-head Candidate Checks [42166848429](https://github.com/Reekyi/UpStatus/actions/runs/42166848429) completed successfully. Logs confirm 103/103 authenticated checks, browser call/voice/screen WebRTC, three-member mesh, open voice join/late join/owner handoff/race/capacity, rate limit 90+1 and concurrency, atomic read receipts, migration-layout, Team Lite updater/portal checks, leave/retry/logout tests, and fixture cleanup.
- **#75 Team Lite baseline** remains open/Draft at `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passed (59 ahead / 0 behind `team-lite-official`). #76 is its descendant, not an independent release line.
- **#80 continuity** remains open/Draft at `fd0ee7663be98ad3ccb7a192506ed624d3fee6e9` (91 ahead / 0 behind `develop`). Validate [42167511914](https://github.com/Reekyi/UpStatus/actions/runs/42167511914) fails at the inherited `client signed upload helper missing` assertion after building the base artifact; no validator was weakened.
- **#82 independent QA** remains open/Draft at `bf040c34e236df133653eccbcfae04ba94e9a64b` (52 ahead / 0 behind `master`). Validate [42169381115](https://github.com/Reekyi/UpStatus/actions/runs/42169381115) fails at the inherited `production updateURL mismatch` assertion. The QA branch was not modified.
- All five PRs remain unmerged and Draft. No human approval is recorded for #74/#76.

### Normal pagehide/reload candidate
- Added commit [`acd26e0`](https://github.com/Reekyi/UpStatus/commit/acd26e02119633164c0e23624bcccdf5bd66bd5f) to the existing isolated Normal candidate branch. It changes only `src/userscript/upstatus.user.template.js` and `scripts/signaling-static.test.mjs`.
- The Normal `pagehide` handler now invokes `callCleanup(false, 'pagehide')` before voice-room leave. For the authenticated transport path, the pagehide cleanup skips the final broadcast so the durable membership-release attempt is not delayed by a separate signal.
- Pending call-room leaves are written to a versioned, per-member Tampermonkey GM storage key. The persisted record contains only `roomId`, `member`, `callId`, and `createdAt`; no session token or transport object is stored. Restore validates record shape, member identity, control characters, future timestamps and a seven-day age bound, then retries only after the same member has authenticated and the authenticated transport is initialized. Confirmed/terminal leave removes the stored record. Storage is bounded to 20 pending rooms per member.
- The static harness now includes VM regressions for pagehide persistence, token absence, same-member restoration, cross-member isolation, malformed/stale/future record rejection, retry after reload, and storage clearing after confirmed leave.
- Exact-head CI [Validate 42172519530](https://github.com/Reekyi/UpStatus/actions/runs/42172519530) and [Signaling Smoke 42172519519](https://github.com/Reekyi/UpStatus/actions/runs/42172519519) are running. The code change is **not yet approved**. Team Lite has not yet received this pagehide persistence port; issue #78 remains open.

### Supabase recheck (read-only)
- Production `dlfvkawaiqduhlazsszm`: `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002, 7 migrations through `20261027155438`, 38 active Edge Functions. Primary deployed versions remain Normal v480, Team Lite v15, and screen-share beta10 v6. No production `upstatus-signal`, open/leave voice RPC, atomic read-receipt RPC, or distributed rate-limit RPC/table is present.
- Production catalog still shows the three broadcast functions as `SECURITY DEFINER`, `search_path=public`, and executable by `anon`/ `authenticated`; nine backend-owned tables retain client grants while RLS is enabled with no policies. Default ACLs remain broad for `postgres` in `public`/`storage` and `supabase_admin` in `public`/`graphql`/`graphql_public`. Security Advisor: 3 WARN for anon, 3 WARN for authenticated, 10 INFO RLS/no-policy; performance and health have no findings.
- Isolated project `bfpjtfqlnypisxljoxkb` is `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.003, 21 migrations through `20261105220323`. Immediately before the new Normal run started, read-only fixture counts were zero; the active run now owns the shared isolated test group. No overlapping fixture-mutating suite was started.

No merge, deploy, release, production migration/write, secret/role/flag change, userscript publication, or destructive operation occurred. Production remained read-only.


## 2026-11-06 03:12 BRT — pagehide persistence regression and correction

- The first pagehide persistence candidate commit `acd26e02119633164c0e23624bcccdf5bd66bd5f` passed Validate [42172519530](https://github.com/Reekyi/UpStatus/actions/runs/42172519530), but Signaling Smoke [42172519519](https://github.com/Reekyi/UpStatus/actions/runs/42172519519) failed in the new VM regression: a room identifier containing whitespace was accepted as valid. The failure occurred in the static harness before any fixture-mutating step.
- Tightened the Normal persistence validator to accept only the opaque room identifier alphabet `[A-Za-z0-9._:-]{1,128}` in commit [`a3784be`](https://github.com/Reekyi/UpStatus/commit/a3784be9ca7625d6b5206ff04ec72295920ad728), and added an explicit source assertion in [`2db4408`](https://github.com/Reekyi/UpStatus/commit/2db440814d374ad1e06b48645920573eaa8db978).
- Current #74 HEAD is `2db440814d374ad1e06b48645920573eaa8db978`. Validate [42172723990](https://github.com/Reekyi/UpStatus/actions/runs/42172723990) is in progress. Smoke [42172671559](https://github.com/Reekyi/UpStatus/actions/runs/42172671559) is running on parent `a3784be` (static and unauthenticated steps passed; authenticated browser/integration step is running); exact-head Smoke [42172723820](https://github.com/Reekyi/UpStatus/actions/runs/42172723820) is queued behind it. Do not mark the new candidate approved until the exact-head run completes.
- #76 Team Lite remains at `95d88e34c25679e161f09654f5f7e372f2a7a430`; exact-head Candidate Checks [42166848429](https://github.com/Reekyi/UpStatus/actions/runs/42166848429) passed. The pagehide persistence change has not yet been ported to Team Lite; keep the two products serialized through the shared isolated fixture project.
- The new Normal storage record is versioned and per-member, bounded to 20 rooms, and contains only room ID, member, call ID and timestamp. It stores no token, validates member identity and opaque room ID, rejects control characters, stale (>7 days) and future-dated records, restores only after same-member authentication/transport initialization, and clears after confirmed leave. Physical browser close/reload/offline tests remain outstanding.

No production writes or release actions occurred.


## 2026-11-06 03:55 BRT — durable pagehide parity and exact-head status

### PR refs and ancestry (re-fetched)

All five tracked PRs remain open, Draft, and unmerged. No human approval is recorded for #74 or #76.

- **#74 Normal** — HEAD `2db440814d374ad1e06b48645920573eaa8db978`, 674 ahead / 0 behind `master`. Exact-head Validate [42172723990](https://github.com/Reekyi/UpStatus/actions/runs/42172723990) and Signaling Smoke [42172723820](https://github.com/Reekyi/UpStatus/actions/runs/42172723820) both completed SUCCESS. The Smoke log confirms 15/15 unauthenticated checks, 103/103 authenticated checks, browser WebRTC call/voice/screen with remote tracks, three-member mesh teardown, rate-limit 90+1 and concurrency, atomic receipt concurrency, fixture cleanup, and the Normal durable pagehide/reload recovery regression.
- **#75 Team Lite baseline** — HEAD `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`, 59 ahead / 0 behind `team-lite-official`. Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) remains historical baseline evidence.
- **#76 Team Lite** — HEAD `28e8d948f82d4d86fa853ba20d1ac6cadcd1574a`, 203 ahead / 0 behind `team-lite-official`, 144 ahead / 0 behind #75. The branch was advanced only by a verified fast-forward from an isolated candidate branch based on prior HEAD `95d88e3`; no merge occurred.
- **#80 continuity** — HEAD `93888cc8caba3f62a95232f5c68b9d7ed5263cd1`, 93 ahead / 0 behind `develop`.
- **#82 independent QA** — HEAD `4e8c6634d7d32b072fbd524530ccd76f54cbbcef`, 53 ahead / 0 behind `master`. The QA branch was not modified.

### Team Lite durable pagehide candidate

Candidate branch `team-lite/pagehide-recovery-20261106` was created from exact PR #76 parent HEAD `95d88e34c25679e161f09654f5f7e372f2a7a430`, reviewed, and fast-forwarded into the PR branch using an expected-HEAD lease. Commits:

- [`2c09fd8`](https://github.com/Reekyi/UpStatus/commit/2c09fd8b094b18fedf0ffb465fd5b9ba4f4e938c) — persist call-room leave records and invoke call cleanup from pagehide.
- [`28e8d94`](https://github.com/Reekyi/UpStatus/commit/28e8d948f82d4d86fa853ba20d1ac6cadcd1574a) — add durable pagehide/reload regressions.

The Team Lite userscript now starts `callCleanup(false,'pagehide')` before voice-room leave. Authenticated pagehide skips the final broadcast, persists a versioned per-member GM-storage envelope before attempting server leave, and retains the room/call/member/timestamp handle when leave is unconfirmed. No token or transport object is persisted. The schema is bounded to 20 entries and seven days; room IDs use `[A-Za-z0-9._:-]{1,128}`; restore is same-member only and occurs after authenticated transport initialization, before retry. Confirmed leave rewrites the envelope without the completed entry.

The Team Lite VM harness now covers pagehide persistence, exact stored fields/token absence, cross-member isolation, same-member reload retry, clearing after confirmed leave, and malformed/stale/future record rejection.

Exact-head Candidate Checks [42178075022](https://github.com/Reekyi/UpStatus/actions/runs/42178075022), HEAD `28e8d94`: isolation guard, authenticated adapter, and endpoint-authentication steps passed; authenticated integration/browser step was in progress at this checkpoint. Rate-limit concurrency, read-receipt concurrency, migration-layout, candidate metadata, and final cleanup were still pending. The shared isolated project `bfpjtfqlnypisxljoxkb` was owned by this run; a read-only mid-run snapshot showed 4 test users, 4 sessions, 12 rooms, 14 memberships, 5 bindings, 1 event, 6 rate-limit buckets, and 0 chat-read fixtures. Do not start another fixture-mutating suite until this run completes and cleanup is rechecked.

The prior exact-head Team Lite run [42166848429](https://github.com/Reekyi/UpStatus/actions/runs/42166848429) passed on `95d88e3`, but it did not include durable pagehide persistence and is not evidence for the new HEAD.

### Root causes of the two documentation-branch Validate failures

- **#80 / develop** — Validate [42173007826](https://github.com/Reekyi/UpStatus/actions/runs/42173007826) failed at `client signed upload helper missing`. This is inherited branch-baseline drift, not a documentation change: the `develop` userscript template at the PR base lacks `uploadFileDirect`, while `master` contains it. `master` and `develop` are diverged (146 commits master-only, 114 develop-only). #80 changes only `UPSTATUS_HANDOFF.md` and `docs/CURRENT_STATE.md`; do not weaken the validator or add unrelated upload code to this documentation branch. The current #74 candidate includes the signed-upload path and its Validate passes.
- **#82 / master** — Validate [42175677100](https://github.com/Reekyi/UpStatus/actions/runs/42175677100) failed at `production updateURL mismatch`. On the master baseline, `scripts/build.mjs` derives the production update URL from the API `CLOUD_SERVER` pointing at `upstatus-screen-share-3-1-1-beta10`, while `release.json.scriptUrl` and the validator's stable contract point to `/functions/v1/upstatus/upstatus.user.js`. The #74 candidate build now uses `release.scriptUrl` for the production updater while keeping the beta10 API server separate, and its exact-head Validate passes. The independent QA branch remains untouched; this is not a reason to relax the validator.

### Production read-only snapshot

Project `dlfvkawaiqduhlazsszm` remains `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002, seven migrations through `20261027155438`, and 38 ACTIVE Edge Functions. Current relevant versions: `upstatus` v480, `upstatus-test` v281, `upstatus-team-lite` v15, screen-share beta10 v6. Production still lacks open/leave voice RPCs, `merge_chat_read_receipts`, `consume_upstatus_signal_rate_limit`, the rate-limit table, and dedicated `upstatus-signal`.

The three public broadcast functions remain SECURITY DEFINER with `search_path=public` and EXECUTE for `anon`/`authenticated`; the message trigger still broadcasts OLD/NEW row JSON to public `db_change`. Nine backend-owned tables retain client table grants while RLS is enabled with zero policies. Default ACLs remain broad for `postgres` in `public`/`storage` and `supabase_admin` in `public`/`graphql`/`graphql_public`. The production SQL session is `postgres`, not superuser and not a member of `supabase_admin`. Security Advisor remains 3 WARN for anon-executable SECURITY DEFINER, 3 WARN for authenticated, and 10 INFO for RLS without policies; performance and health advisors are empty.

### Remaining gates and limitations

- Physical browser close/reload while offline, same-member recovery without F5, real microphone/display permissions, and installed Normal ↔ Team Lite interoperability remain unverified.
- The durable handle is created after `prepareCallRoom` returns a room ID. A page close while that initial request is still in flight may leave a server-created room whose ID was never received/persisted; this is a review risk, not a reproduced failure. Investigate server-side lookup/idempotency by call ID before claiming all pagehide races are covered.
- #78 remains open. #79 remains open. Keep #74/#76 Draft until physical, security, migration, human-review, and cutover gates are satisfied.

No production write, migration, Edge deployment, secret/role/flag change, deploy, release, merge, userscript publication, or destructive operation occurred. Production remained read-only.


## 2026-11-06 — Team Lite durable pagehide exact-head CI result

- Team Lite PR #76 exact HEAD `28e8d948f82d4d86fa853ba20d1ac6cadcd1574a` passed Candidate Checks [42178075022](https://github.com/Reekyi/UpStatus/actions/runs/42178075022). Job [127761066800](https://github.com/Reekyi/UpStatus/actions/runs/42178075022) completed success.
- Logs confirm 15/15 unauthenticated checks, 103/103 authenticated integration checks, browser call/voice/screen WebRTC with remote audio/video tracks, three-member mesh teardown, distributed rate-limit concurrency, atomic read-receipt concurrency, migration-layout, Team Lite version 3.4.31/portal/updater metadata, and the new `Team Lite durable pagehide/reload call-room leave recovery tests passed` assertion.
- The durable regression verified the pagehide call cleanup path, no final broadcast dependency, persisted schema fields/token absence, same-member restore and retry, cross-member isolation, malformed/stale/future rejection, and storage clearing after confirmed leave.
- Final workflow log explicitly reports temporary users/sessions/rooms/memberships/events cleanup verified. A separate read-only count immediately after completion returned zero matching test users, sessions, rooms, memberships, events, bindings, rate-limit rows, and chat-read rows in isolated project `bfpjtfqlnypisxljoxkb`.
- #74 Normal remains exact-head green: Validate [42172723990](https://github.com/Reekyi/UpStatus/actions/runs/42172723990) and Smoke [42172723820](https://github.com/Reekyi/UpStatus/actions/runs/42172723820) succeeded on `2db4408`.
- #80's documentation update triggered Validate [42178888759](https://github.com/Reekyi/UpStatus/actions/runs/42178888759), which again failed at the same inherited `client signed upload helper missing` assertion. No code validator was weakened and the branch remains docs-only.
- #82 remains at HEAD `4e8c663`; Validate [42175677100](https://github.com/Reekyi/UpStatus/actions/runs/42175677100) still fails the inherited `production updateURL mismatch` on master baseline.
- PR review API recheck: #74 and #76 have zero submitted reviews and zero inline review comments. Both remain Draft.

No production write, migration, function deployment, secret/role/flag change, deploy, release, merge, userscript publication, or destructive operation occurred.


## 2026-11-06 05:30 BRT — call-attempt recovery and exact-head CI follow-up

### Current PRs and workflows (re-fetched from GitHub)
- **#74 Normal** is open/Draft at `0ff4ef9a50c79717250d9eed7e60ed85fa9c8a41` (692 ahead / 0 behind `master`). Exact-head Validate [42188549612](https://github.com/Reekyi/UpStatus/actions/runs/42188549612) passed. Exact-head Signaling Smoke [42188549610](https://github.com/Reekyi/UpStatus/actions/runs/42188549610) is still in authenticated integration/browser tests; syntax and unauthenticated endpoint checks passed. Do not claim full approval until the smoke, rate-limit concurrency, receipt concurrency, and fixture cleanup finish.
- The previous Smoke [42187679764](https://github.com/Reekyi/UpStatus/actions/runs/42187679764) on parent `12ef783` failed before fixture mutation because `scripts/signaling-static.test.mjs` declared `outgoingStartStart` (and related harness identifiers) twice at module scope. Candidate branch `normal/call-attempt-recovery-20261106` was 2 commits ahead of #74; the isolated fix renamed only the second VM harness identifiers in commit [`0ff4ef9`](https://github.com/Reekyi/UpStatus/commit/0ff4ef9a50c79717250d9eed7e60ed85fa9c8a41), then fast-forwarded #74 using expected HEAD `12ef783` with no force. The new smoke passed syntax and unauthenticated checks.
- **#76 Team Lite** remains open/Draft at `28e8d948f82d4d86fa853ba20d1ac6cadcd1574a` (203 ahead / 0 behind `team-lite-official`; 144 ahead / 0 behind #75). Exact-head Candidate Checks [42178075022](https://github.com/Reekyi/UpStatus/actions/runs/42178075022) passed, including 15/15 unauthenticated, 103/103 authenticated, browser call/voice/screen WebRTC, three-member mesh, durable pagehide/reload leave tests, rate-limit/read-receipt concurrency, migration layout, metadata, and cleanup.
- **#75 baseline** remains open/Draft at `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passed (59 ahead / 0 behind `team-lite-official`). #76 remains its descendant, not a separate release line.
- **#80 continuity** remains open/Draft at `5ee51987c7ff193f5ed80cffeba3b2fa77c95337` (99 ahead / 0 behind `develop`). Validate [42189214763](https://github.com/Reekyi/UpStatus/actions/runs/42189214763) failed at inherited `client signed upload helper missing`; #80 changes only the handoff/current-state documentation. Do not weaken the validator or add unrelated upload code.
- **#82 independent QA** remains open/Draft at `e79dd6238996171c075ea79fd96da6932dca1312` (55 ahead / 0 behind `master`). Validate [42183661932](https://github.com/Reekyi/UpStatus/actions/runs/42183661932) failed at inherited `production updateURL mismatch`. QA branch was not modified.
- All five PRs remain open, Draft and unmerged. Reviews API shows no submitted human review for #74 or #76.

### Normal call-attempt protocol candidate
- PR #74 now includes migration `20261106080200_call_room_attempt_recovery.sql` and test migration `20261106080200_call_room_attempt_recovery_test.sql`. The server-side logical call ID is persisted before room creation; prepare/cancel serialize on the same advisory transaction lock. Cancel-before-prepare writes a tombstone, so a late prepare cannot create a room. The client persists a per-member, token-free call ID before invoking prepare and retries cancellation after authenticated transport initialization. Storage write failure is fail-closed for outgoing call creation in the Normal harness.
- The authenticated integration harness now covers cancel-before-prepare tombstones, repeated cancellation, concurrent prepare/cancel (eight prepares plus cancel), terminal late prepare, invalid call-ID prefix, and cleanup of `upstatus_signal_call_attempts`. The cleanup runner deletes and verifies attempts by exact fixture creator.
- Isolated project `bfpjtfqlnypisxljoxkb` currently records the candidate migration and its test migration as versions `20261106082526` and `20261106082546`. The active Normal Smoke owns the shared fixture project; do not start another fixture-mutating run until it completes and cleanup is rechecked.
- **Team Lite parity gap confirmed by source inspection:** its adapter still implements `prepareCallRoom` as `createRoom → bindRoom → waitForAcceptance`, exposes no `cancelCallRoom`, and its userscript has no durable logical call-attempt record. Team Lite pagehide/reload persistence for known room IDs passed CI, but a close before the prepare response is received remains unhandled there. Port the logical call-ID protocol only after the current Normal smoke releases the shared isolated project; keep the shared migration/endpoint dependency explicit and avoid duplicate or divergent SQL.
- The Normal call-attempt migration is candidate-only. Production has no `upstatus_signal_call_attempts` table or prepare/cancel RPCs.

### Production read-only snapshot
- Production `dlfvkawaiqduhlazsszm` remains ACTIVE_HEALTHY, PostgreSQL 17.11, seven migrations through `20261027155438`, and 38 ACTIVE Edge Functions. Current deployed primary versions remain Normal v480, TEST v281, Team Lite v15, and screen-share beta10 v6.
- Production catalog confirms no call-attempt table/RPC, open/leave voice RPC, atomic read-receipt RPC, distributed rate-limit RPC/table, or dedicated `upstatus-signal` endpoint.
- The three broadcast functions remain SECURITY DEFINER with `search_path=public` and EXECUTE for anon/authenticated; public message broadcast still emits full OLD/NEW row JSON. Nine backend-owned tables retain anon/authenticated SELECT/INSERT grants while RLS is enabled with no policies; `realtime.messages` retains client SELECT/INSERT/UPDATE grants. Default ACLs remain broad for postgres in public/storage and supabase_admin in public/graphql/graphql_public. Security Advisor remains 3 WARN anon, 3 WARN authenticated, and 10 INFO RLS/no-policy; performance and health advisors are empty.
- All production queries in this checkpoint were SELECT/catalog reads only. No production mutation occurred.

### Remaining gates
- Finish exact-head Normal Smoke [42188549610](https://github.com/Reekyi/UpStatus/actions/runs/42188549610) and verify zero fixture rows after completion.
- Port call-attempt cancellation and storage-failure behavior to Team Lite with a reviewed shared-migration/endpoint dependency; add tests for pagehide during prepare and acceptance wait.
- Complete real Tampermonkey/browser close/reload-offline and no-F5 acceptance in both products; keep #78 open.
- Integrate distributed rate limiting into both product endpoints and add `Retry-After`; resolve RT-01 public Realtime exposure and ACL-02 via supported admin path; rehearse migrations in official TEST with rollback.
- Keep #74/#76 Draft. No merge, deploy, release, production migration/write, secret/role/flag change, userscript publication, or destructive action is authorized by this checkpoint.


## 2026-11-06 06:18 BRT — Team Lite logical call-attempt parity and logout gate

### Fresh refs and exact-head CI

All tracked PRs remain open, Draft, unmerged. No submitted human reviews or inline review threads were found for #74/#76.

- **#74 Normal** — HEAD `0ff4ef9a50c79717250d9eed7e60ed85fa9c8a41`, 692 ahead / 0 behind `master`. Validate [42188549612](https://github.com/Reekyi/UpStatus/actions/runs/42188549612) and Signaling Smoke [42188549610](https://github.com/Reekyi/UpStatus/actions/runs/42188549610) both completed SUCCESS on the exact head. Smoke logs confirm 116/116 authenticated integration checks, the cancel-before-prepare tombstone and rejection of a late prepare, call/voice/screen WebRTC with remote tracks, three-member mesh, rate limit 90 accepted + 1 HTTP 429, rate-limit concurrency, atomic read-receipt concurrency, and temporary fixture cleanup.
- **#76 Team Lite** — HEAD `c22ff0666b5e769de010fd25c4011f8346349c24`, 206 ahead / 0 behind `team-lite-official`, 147 ahead / 0 behind #75. New Candidate Checks [42193658040](https://github.com/Reekyi/UpStatus/actions/runs/42193658040) is **IN PROGRESS**. Isolation guard, adapter tests and endpoint-authentication checks passed; authenticated integration/browser tests are running; rate-limit concurrency, read-receipt concurrency, migration-layout, metadata and final cleanup are still pending. Do not claim exact-head approval yet.
- **#75 baseline** — HEAD `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`, 59 ahead / 0 behind `team-lite-official`; historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passed. #76 remains its descendant.
- **#80 continuity** — HEAD `a1f01b28edbb89a26125b6ab468bdeef37b9965f`, 101 ahead / 0 behind `develop`. Validate [42189355400](https://github.com/Reekyi/UpStatus/actions/runs/42189355400) failed at the inherited `client signed upload helper missing` assertion; #80 remains documentation-only.
- **#82 independent QA** — HEAD `05d384b7f47b605b4b1d453edb1b504d61cfded7`, 56 ahead / 0 behind `master`. Validate [42189479021](https://github.com/Reekyi/UpStatus/actions/runs/42189479021) failed at the inherited `production updateURL mismatch` assertion. QA branch and `docs/RELEASE_READINESS.md` were not modified.
- **Normal logout-gate candidate** — branch `normal/call-attempt-logout-gate-20261106`, HEAD `cf99b1b14f69b1caf6606684d2d42f9898f03a1e`, one commit ahead / zero behind #74. Not yet fast-forwarded into #74 because the shared isolated fixture project is currently owned by #76's Candidate Checks.

### Team Lite logical call-attempt recovery

The source review confirmed the previous Team Lite path used `createRoom → bindRoom → waitForAcceptance` and could not cancel a call if the prepare response (and room ID) was lost. The candidate now mirrors Normal's logical-call protocol:

- The adapter uses atomic `/room/prepare-call` and `/room/cancel-call` operations; decline/abort cleanup is keyed by logical call ID, not room ID.
- The userscript writes a per-member, versioned, token-free call-attempt record before sending prepare; same-member restore and cancellation retry run after authenticated transport initialization.
- Pagehide during an in-flight prepare can cancel by logical ID before any room ID is known. Offline failure retains the logical ID for retry after reconnect.
- Storage failure is fail-closed for outgoing call creation. The record contains only `callId`, `member` and `createdAt`, with validation, a 20-entry bound and seven-day expiry.
- The embedded Team Lite adapter is byte-identical to `src/userscript/signaling-transport.mjs`; the shared adapter tests now cover prepare, cancel, decline and abort paths.
- Candidate regressions cover same-member restore, cross-member/malformed/stale/future rejection, token absence, storage failure, unknown-room pagehide, offline retry and preservation of an active call.

The shared call-attempt migration and isolated Edge Function routes remain owned by Normal PR #74. No duplicate SQL migration was added to #76. The Team Lite candidate depends on that shared schema/endpoint being part of the coordinated cutover; its current CI uses the already-provisioned isolated project, not production.

### Newly found logout safety gap — candidate fix in both clients

A restored logical call attempt could remain pending while `upCall.active` was false. Both logout handlers previously retried room-ID leaves but skipped logical call-attempt cancellation, allowing logout to invalidate the token before the server-side tombstone was confirmed.

- Team Lite #76 now retries `signalRetryPendingCallAttempts()` before room leaves; its candidate test blocks logout and preserves the token when cancellation is unconfirmed.
- Normal candidate `cf99b1b` applies the same order and adds an equivalent regression. This Normal candidate still needs exact-head Validate + Smoke after the Team Lite run releases the shared lab.

### Remaining recovery/security gates

- QA's non-creator storage concern remains open: `signalPersistPendingCallLeaves()` can return false when GM storage throws, while the acceptance/cleanup path does not yet fail closed before a recipient joins. Add throwing-storage tests and persist the recipient leave handle before accepting; review voice-room membership persistence separately.
- Physical Tampermonkey close/reload while offline, same-member no-F5 recovery, real microphone/display permissions and installed Normal ↔ Team Lite interoperability remain unverified.
- Product-facing endpoints still lack coordinated distributed rate-limit integration and `Retry-After`; isolated rate-limit tests are not production readiness.
- RT-01 public Realtime broadcast exposure and ACL-02 default-ACL administration remain release blockers. Official TEST migration/rollback rehearsal and human reviews remain pending.

### Production read-only revalidation

Project `dlfvkawaiqduhlazsszm` remains ACTIVE_HEALTHY, `us-west-2`, PostgreSQL `17.11.0.002`, seven migrations through `20261027155438`, and 38 ACTIVE Edge Functions. Relevant deployed versions remain Normal v480, TEST v281, Team Lite v15 and screen-share beta10 v6.

Fresh catalog checks confirm production still lacks the call-attempt table and prepare/cancel RPCs, open/leave voice RPCs, atomic read-receipt RPC, rate-limit RPC/table and dedicated `upstatus-signal`. The three public broadcast functions remain executable by anon/authenticated; `realtime.messages` retains client grants. Security Advisor remains 3 WARN for anon-executable SECURITY DEFINER, 3 WARN for authenticated, and 10 INFO for RLS without policies; performance and health advisors are empty. SQL role is `postgres`, not superuser. Previously confirmed broad backend-table grants and default ACLs remain unresolved.

All production queries were SELECT/catalog reads only. No production write, migration, function deployment, secret/role/flag change, merge, deploy, release, userscript publication or destructive operation occurred.



## Engineering checkpoint — 2026-11-06 06:30 BRT

### Current repository state and CI

All five tracked PRs remain open, Draft and unmerged.

- **#74 Normal**: HEAD `cf99b1b14f69b1caf6606684d2d42f9898f03a1e`, 693 ahead / 0 behind `master`. Validate [42195926899](https://github.com/Reekyi/UpStatus/actions/runs/42195926899) failed at `scripts/validate.mjs:139` because the validator still expected the old direct `signalRetryPendingCallLeaves()` logout path. The current implementation first retries logical call-attempt cancellation, then room-ID leaves. Smoke [42195926855](https://github.com/Reekyi/UpStatus/actions/runs/42195926855) is still running; authenticated integration/browser step was active at this checkpoint.
- **#75 Team Lite baseline**: HEAD `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`, 59 ahead / 0 behind `team-lite-official`. Historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passed.
- **#76 Team Lite**: HEAD `5cc5df4865250a0d67935937ea43e206217730d5`, 208 ahead / 0 behind `team-lite-official`, 149 ahead / 0 behind #75. Candidate Checks [42194948317](https://github.com/Reekyi/UpStatus/actions/runs/42194948317) passed. The exact log confirms 103/103 authenticated checks, WebRTC call/voice/screen, three-member mesh, rate-limit 90 accepted + 1 HTTP 429, atomic read receipts, durable pagehide/reload recovery, pre-prepare call-ID persistence, idle-logout cancellation gate and recipient fail-closed acceptance. Temporary users/sessions/rooms/memberships/events were cleaned. An independent read-only count immediately after this run showed zero users, sessions, rooms, memberships, bindings, events, call attempts, rate-limit buckets and read receipts.
- **#80 continuity**: HEAD `f96b71910b1e5bff5cf4e2e635b06fdd233f1d24`, 102 ahead / 0 behind `develop`. Validate [42194285929](https://github.com/Reekyi/UpStatus/actions/runs/42194285929) reproduced inherited `client signed upload helper missing`; this is a baseline mismatch in `develop`, not a reason to add unrelated upload code or weaken the validator.
- **#82 independent QA**: HEAD `a4b675bace4f94ce2e4fb961b3446ca55887b4d3`, 57 ahead / 0 behind `master`. Validate [42196233886](https://github.com/Reekyi/UpStatus/actions/runs/42196233886) reproduced inherited `production updateURL mismatch`. QA branch and `docs/RELEASE_READINESS.md` remain untouched.

### Normal recipient acceptance parity fix — candidate only

The current Normal template still accepted an authenticated group invitation without first persisting the recipient's room-ID leave handle. Team Lite #76 now fails closed when userscript storage throws and verifies that persistence happens before `signalTransport.accept()`.

Created isolated branch `normal/recipient-call-recovery-20261106` from the exact Normal candidate parent. Current candidate HEAD is `1a62a38b44968a89dd72685132ad2235f4b0c569`, four commits ahead / zero behind #74. It:
- requires the authenticated transport when the signaling flag is enabled;
- persists the recipient leave handle before accepting membership;
- blocks acceptance and retains the pending invitation if GM storage fails;
- adds VM regressions for storage failure, persistence-before-accept ordering, token absence and successful acceptance;
- updates the Validate contract to require logical call-attempt cancellation before room-ID leave and credential clearing.

This candidate has not run CI yet. It is deliberately not integrated into #74 while Smoke [42195926855](https://github.com/Reekyi/UpStatus/actions/runs/42195926855) is still using the shared isolated Supabase project. After that run finishes and cleanup is verified, re-check branch/PR HEADs and fast-forward only if the ancestry remains exactly 4 ahead / 0 behind.

### Additional voice-room recovery gap

Code review of both Normal and Team Lite shows `signalPrepareVoiceRoom()` stores `signalVoiceRoomRoomId` only in page memory. `pagehide` attempts `voiceRoomLeave()`, but the offline path intentionally skips the server leave. There is no token-free durable pending voice-room leave record to restore after a full reload. Therefore a tab closed offline after the room ID was received can lose the only client-side room reference while server membership remains until the room TTL (currently two hours). This is a code-inspection gap, not a reproduced runtime failure.

The next design should persist a per-member room-ID leave handle before voice UI activation, restore/retry after authenticated transport initialization, and separately handle the open-response-loss race with a server-side logical attempt/tombstone. Do not claim this is solved by the existing call-room logical-ID protocol; voice-room membership is a separate flow.

### Supabase state

Production project `dlfvkawaiqduhlazsszm` remains ACTIVE_HEALTHY, PostgreSQL `17.11.0.002`, seven migrations through `20261027155438`, 38 ACTIVE Edge Functions (Normal v480, TEST v281, Team Lite v15, screen-share beta10 v6). Read-only catalog checks confirm production still lacks the call-attempt table/RPCs, voice open/leave RPCs, atomic read-receipt RPC, rate-limit table/RPC and dedicated `upstatus-signal`.

The three public broadcast functions remain SECURITY DEFINER and executable by anon/authenticated. The messages broadcast trigger still sends full OLD/NEW row JSON to the public `db_change` topic. Nine backend-owned public tables retain broad client grants despite RLS enabled with no policies; `realtime.messages` also retains client SELECT/INSERT/UPDATE grants. Default ACLs remain broad for postgres and supabase_admin. Security Advisor: 3 WARN for anon-executable SECURITY DEFINER, 3 WARN for authenticated, 10 INFO for RLS without policies; performance and health advisors are empty. SQL role is `postgres`, not superuser.

The isolated project `bfpjtfqlnypisxljoxkb` is ACTIVE_HEALTHY, PostgreSQL `17.11.0.003`, with call-attempt migrations through `20261106082546` and `upstatus-signal-test` v29. The zero-fixture read happened after #76 cleanup and before #74 Smoke began; do not treat the lab as idle while #74 Smoke remains in progress.

### Remaining gates

- Finish #74 Smoke on `cf99b1b`; then revalidate the isolated-project cleanup.
- Fast-forward the Normal recipient candidate only after a fresh ancestry/HEAD check; run exact-head Validate + Smoke.
- Implement durable voice-room leave recovery and the open-response-loss race in both clients.
- Physical Tampermonkey close/reload while offline, same-member no-F5 recovery, real microphone/display permissions and installed Normal ↔ Team Lite interoperability remain unverified.
- Integrate distributed rate limiting into product endpoints with `Retry-After`; resolve RT-01 public Realtime exposure and ACL-02 default-ACL administration; rehearse official TEST migration/rollback; obtain human reviews.

All production queries were SELECT/catalog reads only. No production write, migration, function deployment, secret/role/flag change, merge, deploy, release, userscript publication or destructive operation occurred.


## Engineering checkpoint — 2026-11-06 07:02 BRT (latest exact-head refresh)

This section supersedes the preceding note that the Normal recipient-recovery candidate had not yet been integrated.

### Normal recipient acceptance: missing helper fixed

- The Normal candidate at 1a62a38b44968a89dd72685132ad2235f4b0c569 exposed two exact-head CI failures: Validate 42199746909 still had an old logout assertion in scripts/chat-regression.test.mjs; Smoke 42199746902 failed the recipient storage regression.
- Source inspection found a real runtime omission: callAcceptGroupInvite() called signalTrackPendingCallLeave(), but the Normal template had no definition. Team Lite already had the bounded, member-scoped implementation.
- Added the helper to the Normal template, exported it into the VM harness, and updated the chat-regression contract to require logical call-attempt cancellation followed by confirmed room leave before API logout/credential clearing.
- The new candidate branch normal/recipient-call-storage-helper-20261106 was three commits ahead / zero behind 1a62a38; its three-file diff was reviewed before a fast-forward update of PR #74. No force update was used.
- **Current Normal #74 head:** 18201b01f875d1ab5d3706e4e35f07ab23ed1c86, 700 ahead / 0 behind master, Open/Draft.
- Exact-head Validate [42200054443](https://github.com/Reekyi/UpStatus/actions/runs/42200054443) passed.
- Exact-head Signaling Smoke [42200054440](https://github.com/Reekyi/UpStatus/actions/runs/42200054440) is still running. At last inspection, syntax/static harnesses passed and the unauthenticated endpoint step was in progress; authenticated integration/browser, rate-limit concurrency, atomic receipt concurrency, and final cleanup were pending. Do not claim Smoke approval until its complete job log and cleanup are inspected.

### Current PR and CI snapshot

| PR | Exact head | Ancestry | Latest evidence |
|---|---|---:|---|
| #74 Normal | 18201b01 | 700 / 0 vs master | Validate 42200054443 passed; Smoke 42200054440 running |
| #75 Team Lite baseline | 7bbf9b9 | 59 / 0 vs team-lite-official | Historical Candidate Checks 41674353127 passed |
| #76 Team Lite | 5cc5df4 | 208 / 0 vs team-lite-official; 149 / 0 vs #75 | Candidate Checks 42194948317 passed |
| #80 continuity | 7d948bc | 104 / 0 vs develop | Validate 42196656716 reproduces inherited client signed upload helper missing |
| #82 independent QA | a4b675b | 57 / 0 vs master | Validate 42196233886 reproduces production updateURL mismatch |

All five PRs remain open and Draft. #74 and #76 have no submitted human reviews. #76 remains a descendant of #75; do not treat them as independent releases. The QA branch and docs/RELEASE_READINESS.md were not modified.

Team Lite #76 exact-head Candidate Checks 42194948317 passed 103/103 authenticated checks, WebRTC call/voice/screen and three-member mesh, pagehide/reload recovery, pre-prepare call-ID persistence, storage-failure fail-closed acceptance, rate-limit 90+1/concurrency, atomic receipts, and cleanup. A read-only post-run count showed zero temporary users, sessions, rooms, memberships, bindings, events, call attempts, rate-limit buckets, and receipts. The isolated project is now occupied by Normal Smoke; do not start a concurrent fixture workflow.

### Production Supabase — read-only refresh

Project dlfvkawaiqduhlazsszm is ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, seven migrations through 20261027155438, and 38 ACTIVE Edge Functions (upstatus v480, upstatus-test v281, upstatus-team-lite v15, screen-share beta10 v6). No dedicated upstatus-signal function is present.

Read-only catalog checks confirm the following are absent: public.upstatus_signal_call_attempts, public.upstatus_signal_rate_limits, merge_chat_read_receipts(text,jsonb,timestamptz), consume_upstatus_signal_rate_limit(text,integer,integer), and the inspected voice-room open/leave and call-attempt prepare/cancel RPC names.

The catalog reports nine public tables with anon/authenticated grants, three client privileges on realtime.messages, and three broadcast SECURITY DEFINER functions executable by both client roles. Security Advisor: three anon EXECUTE WARN, three authenticated EXECUTE WARN, ten RLS-without-policy INFO; Performance and Health advisors are empty. The public full-row broadcast and default-ACL issues remain release blockers.

All production database queries in this checkpoint were SELECT/catalog reads. No production migration, SQL write, function deployment, secret, role, or flag change occurred.

### Remaining engineering and release gates

- Finish Normal Smoke 42200054440, inspect the full authenticated/browser/rate-limit/read-receipt logs, then verify isolated fixture cleanup.
- Keep the new Normal recipient-acceptance helper and regression tests only if the exact-head Smoke passes; otherwise fix the demonstrated failure on a new isolated candidate.
- Durable voice-room leave recovery is still a separate gap: signalPrepareVoiceRoom() retains the room ID only in page memory, and offline pagehide can skip remote leave. The open-response-loss race needs a server-side logical attempt/tombstone; call-room call-ID recovery does not solve voice-room creation.
- Physical Tampermonkey offline close/reload, same-member no-F5 recovery, real microphone/display permissions, and live Normal ↔ Team Lite interoperability remain MANUAL PENDING.
- Integrate distributed rate limiting into product endpoints with Retry-After; resolve RT-01 public Realtime disclosure and ACL/default-privilege gates; validate reviewed migrations and rollback in official TEST; obtain human reviews.
- Keep PRs Draft. No merge, deploy, release, publication, production migration, or irreversible action is authorized by this checkpoint.


### Voice-room recovery design correction — 2026-11-06

A focused read of the current Normal server route, signaling transport, and candidate voice-room migration corrects the earlier tombstone proposal:

- Client openVoiceRoom(logicalId) calls authenticated POST /room/open.
- open_upstatus_signal_voice_room() takes an advisory transaction lock across the Normal/Team Lite aliases, reuses the existing active logical-room binding, and treats an already-accepted member as an idempotent repeat. Retrying the same logicalId for the same member returns the same active room ID rather than creating another membership.
- The existing authenticated /room/resolve route already checks isMember(binding.room_id, sender) and returns the active room ID only to a current member; otherwise it returns 404.
- Therefore the open-response-loss case does not appear to require a new server-side call-attempt/tombstone migration. A token-free per-member pending marker can be persisted before open with logicalId/member/timestamp. After re-authentication, resolveRoom({bindingType: "voice", logicalId}) can recover the existing room ID for that same member, followed by confirmed leave. When the room ID is already known, persist it as well and retry leave directly.
- If storage cannot persist the pre-open marker, fail closed before opening the room. Keep the marker until leave is confirmed or the membership-scoped resolve definitively returns 404.

The pagehide handler in both clients calls voiceRoomLeave(), which attempts the remote leave, but the pagehide handler does not await it. If the browser is offline or unload aborts the request, the leave is unconfirmed and the room ID exists only in page memory; a full unload loses that reference. No durable voice-room pending record currently exists.

This is code/design inspection only. The marker/resolve/retry flow is not implemented or tested yet. Keep issue #78 open. No new database migration is proposed unless implementation testing reveals a gap in the existing idempotent open/resolve contract.


### Engineering checkpoint — 2026-11-06 08:09 BRT

#### Exact PR/CI state

- #74 Normal, branch `chore/continuity-foundation`, HEAD `3ed7b9d6e3fbe7ab77a285201eea2f96d941316f`, 703 ahead / 0 behind master, Draft. Validate [42207304139](https://github.com/Reekyi/UpStatus/actions/runs/42207304139) passed on the exact HEAD. Smoke [42207304173](https://github.com/Reekyi/UpStatus/actions/runs/42207304173) remains in the authenticated integration/browser step; rate-limit concurrency, read-receipt concurrency, and final cleanup are pending. Do not call the new HEAD fully approved yet.
- #76 Team Lite, HEAD `5cc5df4865250a0d67935937ea43e206217730d5`, 208 ahead / 0 behind team-lite-official and 149 ahead / 0 behind #75. Exact Candidate Checks [42194948317](https://github.com/Reekyi/UpStatus/actions/runs/42194948317) passed, including 103/103 authenticated checks, WebRTC/browser, pagehide/reload call recovery, storage-failure fail-closed acceptance, rate-limit and receipt concurrency, and cleanup.
- #75 remains at `7bbf9b9`, 59 ahead / 0 behind team-lite-official; historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passed.
- #80 remains at `5d45f9b`, 108 ahead / 0 behind develop; Validate [42200688810](https://github.com/Reekyi/UpStatus/actions/runs/42200688810) reproduces inherited `client signed upload helper missing`.
- #82 remains at `aec1192`, 58 ahead / 0 behind master; Validate [42203746245](https://github.com/Reekyi/UpStatus/actions/runs/42203746245) reproduces `production updateURL mismatch`. The independent QA branch and `docs/RELEASE_READINESS.md` were not modified.
- All five PRs remain open and Draft. #74/#76 have no submitted human reviews.

#### Candidate performance migration — isolated only

A focused catalog query and isolated Performance Advisor confirmed three unindexed child-side FKs on `public.upstatus_signal_call_attempts`: `created_by`, `recipient`, and `room_id`. The candidate branch `normal/call-attempt-indexes-20261106` was reviewed as exactly three commits ahead / zero behind #74, then fast-forwarded without force. Current #74 includes:
- `supabase/migrations/20261106111000_call_attempt_foreign_key_indexes.sql` — three simple B-tree indexes, one per FK column.
- `supabase/test-migrations/20261106111000_call_attempt_foreign_key_indexes_test.sql` — isolated SQL assertion for valid leading-key indexes.
- `scripts/migration-layout.test.mjs` — guards the test migration location and required index contract.

Only isolated project `bfpjtfqlnypisxljoxkb` was modified. The migration and test were applied there; the connector recorded isolated history entries `20261106110214` and `20261106110221`. Read-only catalog inspection confirmed all three indexes. The isolated Performance Advisor no longer reports unindexed foreign keys; seven unused-index INFO findings remain because the test project has no workload. Do not remove these indexes based only on an empty-fixture advisor. The production project was not touched.

#### Release gates still open

- Durable voice-room recovery remains unimplemented in Normal and Team Lite. Existing authenticated `/room/open` and membership-scoped `/room/resolve` appear sufficient for recovery without a new tombstone migration: persist a token-free logical ID/member/timestamp before open, resolve after reauthentication, then leave and clear only after confirmation or definitive 404. Storage failure before open must fail closed.
- Physical Tampermonkey offline/reload/no-F5, real microphone/display permissions, and installed Normal ↔ Team Lite interoperability remain manual pending.
- Rate limiting is not integrated into product endpoints; isolated 429 still lacks `Retry-After`.
- RT-01 public full-row Realtime broadcast and ACL-02 default ACL ownership remain blockers. Official TEST migration/rollback rehearsal and human reviews are also pending.

Production remains read-only. No merge, deploy, release, production migration/SQL write, secret/role/flag change, userscript publication, or destructive action occurred.

## Engineering checkpoint — 2026-11-06 08:55 BRT: cancellable voice-room attempts

The earlier conclusion that authenticated `/room/resolve` alone was sufficient is superseded. A delayed `/room/open` request can arrive after a recovery `resolve` returns 404, so clearing the local marker on 404 could still leave a later membership. The safe candidate now uses a persisted attempt ID plus a server-side cancel tombstone.

- Normal PR #74 HEAD: `8a4bfd930b1d4169f6f5ae8360beb30f1bb204e4` (715 ahead / 0 behind master; still Draft).
- Candidate branch: `normal/voice-room-attempt-recovery-v2-20261106`.
- Migration: `20261106120500_voice_room_attempt_recovery.sql`; table `upstatus_signal_voice_room_attempts`; service-role-only SECURITY INVOKER RPCs `open_upstatus_signal_voice_room_attempt` and `cancel_upstatus_signal_voice_room_attempt`.
- Authenticated test routes: `/room/open` accepts optional `attemptId`; `/room/cancel-open` serializes cancel-before-open tombstones and open-before-cancel membership removal with the same logical-room lock. Tombstones expire after seven days.
- Migration and SQL guard were applied only to isolated project `bfpjtfqlnypisxljoxkb`; isolated `upstatus-signal-test` is v31. No production write/deploy occurred.
- Validate [42215932957](https://github.com/Reekyi/UpStatus/actions/runs/42215932957) passed on the exact HEAD. Smoke [42215932716](https://github.com/Reekyi/UpStatus/actions/runs/42215932716) passed syntax and unauthenticated checks; authenticated integration/browser and cleanup are still running.

This is only the server-contract milestone. The adapter and Normal/Team Lite userscripts do not yet persist/send the attempt ID, and Team Lite has not received this protocol. Do not mark issue #78 complete or enable the production transport. Production project `dlfvkawaiqduhlazsszm` remains read-only.


## Engineering checkpoint — 2026-11-06 09:42 BRT: Normal voice-attempt client

### Normal #74 — client attempt recovery and exact-head evidence

- Current PR #74 HEAD: `b7a6b3cfd88548175e47db48b5f8c541a3a1e457`, branch `chore/continuity-foundation`, 726 commits ahead / 0 behind `master`. PR remains open and Draft.
- Exact Validate [42219641493](https://github.com/Reekyi/UpStatus/actions/runs/42219641493): PASS.
- Exact Signaling Smoke [42219641534](https://github.com/Reekyi/UpStatus/actions/runs/42219641534): IN PROGRESS at this checkpoint. Syntax/static harnesses (including `scripts/voice-room-attempt-recovery.test.mjs`) and 18 unauthenticated endpoint checks passed; authenticated integration/browser, rate-limit concurrency, read-receipt concurrency, and final cleanup were still pending. Do not call this HEAD fully approved until the run completes.
- The immediately preceding HEAD `65cc0cb1e8f9baf5da8ef09890753df90ac27c65` completed Validate [42218802820](https://github.com/Reekyi/UpStatus/actions/runs/42218802820) and Signaling Smoke [42218802900](https://github.com/Reekyi/UpStatus/actions/runs/42218802900) successfully. Logs show 129/129 authenticated integration checks, browser WebRTC call/voice/screen negotiation and remote tracks, dynamic invitations, three-member mesh, voice-attempt cancel-before-open tombstones, late-open HTTP 410, idempotent open/cancel, open/cancel concurrency without orphan membership, rate limit 90 accepted + 1 HTTP 429, atomic read receipts, and workflow cleanup. A post-run read-only query returned zero rooms, members, bindings, events, call attempts, voice attempts, rate limits, and test users.
- The current `b7a6b3c` candidate adds a stricter local safety layer: unreadable/malformed GM storage blocks join/recovery/logout claims; transient write failures remain retryable; member-prefix normalization uses Unicode code-point replacement to match PostgreSQL; the accepted future-clock window is bounded to seven days. The new storage-health logout gate and tests are in the exact HEAD whose Smoke is running.

### Team Lite parity remains open

- PR #76 remains at `5cc5df4865250a0d67935937ea43e206217730d5`, 208 ahead / 0 behind `team-lite-official`, 149 ahead / 0 behind #75. Candidate Checks [42194948317](https://github.com/Reekyi/UpStatus/actions/runs/42194948317) passed for the previous scope.
- Team Lite's bundled adapter still exposes `openVoiceRoom(logicalId)` only; it has no `cancelVoiceRoomOpen`, no durable voice-attempt marker, and the Team Lite server template/Edge route have not yet received the new voice-attempt protocol. Do not describe Normal/Team Lite as voice-attempt-parity complete.

### Other current gates

- #80 current Validate [42216271705](https://github.com/Reekyi/UpStatus/actions/runs/42216271705) still fails the inherited `client signed upload helper missing` assertion on `develop`.
- #82 QA current HEAD `3d9bcb3ac1375b4d5584fecb09c4c6dd6ed7a645`, 61 ahead / 0 behind master; Validate [42218972117](https://github.com/Reekyi/UpStatus/actions/runs/42218972117) still fails inherited `production updateURL mismatch`. The independent QA branch and its release-readiness document were not modified.
- Production project `dlfvkawaiqduhlazsszm` remains read-only. Its 7 migrations and 38 ACTIVE Edge Functions do not include a dedicated `upstatus-signal`; the attempt migration/RPC/route exists only in isolated TEST.
- RT-01 public full-row chat broadcast, ACL-02 default ACL ownership, product endpoint rate-limit integration/Retry-After, official TEST cutover/rollback rehearsal, human review, and physical Tampermonkey no-F5 testing remain release gates.

No merge, deploy, release, production migration/SQL write, secret/role/flag change, userscript publication, or destructive action occurred.
