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
