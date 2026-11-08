# Public Realtime command guard and Normal Full-IIFE follow-up — 2026-11-08

## Summary

The independent QA release-readiness audit classifies public Realtime client-to-client signaling as a P0 release blocker. This checkpoint records a narrow Normal candidate correction, the remaining media-signaling risk, and the latest isolated-browser test result. It does not claim that Realtime is secured or that release is ready.

## Exact candidate work

### Normal public remote-command wake-up

Normal setup-invite UI PR #94 (branch fix/normal-setup-invite-admin-ui-20261108, base #93) had regressed to executing a remote_command object received from public Broadcast:

- The listener read payload.payload.command.
- If its target matched the local member, it called executeRemoteCommand(c) directly.
- This bypassed the authenticated HTTP queue as the source of command truth.

Created Draft follow-up [PR #99](https://github.com/Reekyi/UpStatus/pull/99), stacked on #94:

- Exact HEAD: bdce39626a9636f441ffe2988c87706b9f7c7154.
- Public event callback accepts no payload argument and only calls scheduleRemoteStatusPoll().
- The hint is debounced for 1.1 seconds and captures the current token/member; a session change discards the pending hint.
- pollRemoteStatus() obtains the command from the authenticated GET /api/remote-status response before calling executeRemoteCommand.
- Added VM-backed regression for forged payload rejection, debounce, session invalidation and authenticated-queue-only execution.
- Wired the test into full Normal Validate and a pinned-checkout, read-only workflow.

Evidence:
- Push [42503182292](https://github.com/Reekyi/UpStatus/actions/runs/42503182292) SUCCESS.
- Pull-request [42503227603](https://github.com/Reekyi/UpStatus/actions/runs/42503227603) SUCCESS.
- Exact log includes PASS public remote_command is a debounced wake-up only and Validation OK: PROD 3.4.7 / TEST 3.4.7.
- The production cutover guard still reports PRODUCTION CUTOVER BLOCKED, as expected.

Scope limitation: #99 fixes only the Normal candidate's public remote_command path. It does not fix public call_signal, voice-room, screen-share or presence signaling. Do not describe it as a complete Realtime security fix.

### Team Lite comparison

Team Lite candidate #76 and setup-invite UI #95 already use the public remote_command event only as a debounced wake-up to the authenticated queue. Their legacy public media listeners remain active when the authenticated signaling transport flag is disabled. The same migration/compatibility work remains necessary.

### Normal Full-IIFE test diagnosis

Normal Full-IIFE PR #98 (branch test/normal-setup-invite-full-iife-20261108, exact parent HEAD 76753b1181004420e8fafa56bc154a9bec305a23) failed in run [42502183259](https://github.com/Reekyi/UpStatus/actions/runs/42502183259):

- Build and browser setup succeeded.
- #upstatus-root mounted.
- The test then waited for #upstatus-card .up-settings-btn while the card was still collapsed.
- Playwright resolved the locator as hidden 24 times and timed out at scripts/test-normal-setup-invite-browser.mjs:162.
- The caller clicked #upstatus-bubble only after createScenario() returned, so the settings button could not become visible.
- This is a test-ordering defect, not evidence of an IIFE startup exception. The failure output did not include the captured page-error array.

Created Draft test-only follow-up [PR #100](https://github.com/Reekyi/UpStatus/pull/100), stacked on #98:
- Opens the bubble inside createScenario() before waiting for the settings button.
- Removes duplicate bubble clicks from admin and ordinary-user scenarios.
- Adds page-error, console and UI-snapshot diagnostics if the control remains hidden.

Exact HEAD: f8716a047328891eeaf4ff6729b8e936d45aeeed. Push workflow [42503432784](https://github.com/Reekyi/UpStatus/actions/runs/42503432784) SUCCESS: both administrator and ordinary-user Full-IIFE scenarios passed, followed by full offline Validate. This uses inert .invalid endpoints and stubbed GM/API/Realtime, not real Tampermonkey or live Edge Function HTTP.

### Related setup-invite UI/test candidates

- [#94 Normal setup-invite UI](https://github.com/Reekyi/UpStatus/pull/94), HEAD 00462a202661fe3502d015dd2dd0ef1da239059d: offline UI contract [42498502349](https://github.com/Reekyi/UpStatus/actions/runs/42498502349) SUCCESS.
- [#95 Team Lite setup-invite UI](https://github.com/Reekyi/UpStatus/pull/95), HEAD 3dc309ce17470eb706d3cd2223e99e33a94a8bd6: UI/Full-IIFE and build-parity [42499560082](https://github.com/Reekyi/UpStatus/actions/runs/42499560082) SUCCESS.
- [#96 Normal issuance contract](https://github.com/Reekyi/UpStatus/pull/96), HEAD f4ee025d242dd3ec182741d38e2cc068be34818d: [42501260634](https://github.com/Reekyi/UpStatus/actions/runs/42501260634) SUCCESS.
- [#97 Team Lite non-admin Full-IIFE](https://github.com/Reekyi/UpStatus/pull/97), HEAD ba318f7270827d532166bda7286e870e189e7362: [42501696875](https://github.com/Reekyi/UpStatus/actions/runs/42501696875) SUCCESS.
- [#98 Normal Full-IIFE](https://github.com/Reekyi/UpStatus/pull/98): failed as described above; #100 is the test-only follow-up.

All remain Draft; no human reviews have been submitted. Child PRs must remain stacked with their parents.

## P0 Realtime finding remains open

The QA release-readiness audit's 2026-11-08 static inspection identifies the public Realtime channel as a P0 release blocker. Deployed clients subscribe to the global public topic without private: true and do not call realtime.setAuth(). The channel carries client-originated call_signal, voice-room, screen-share, presence and other events. Sender/member/room fields in those payloads are self-asserted, not cryptographic identity.

Static code paths of concern include:
- Public remote_command directly triggering status synchronization in deployed Normal/Team Lite; candidate Normal #99 closes this path only in its own branch.
- Public call_signal offers/answers/ICE being passed to WebRTC handlers.
- Voice-room presence/offer/ICE being accepted based on payload fields without server-verified room membership.
- Screen-share offers being accepted based on payload fields without server-verified identity/membership; when local screen capture is active, the peer path can add local tracks.
- Public db_change trigger broadcasts using the old topic and full to_jsonb(OLD/NEW) message rows.

No hostile broadcast was sent, no external client was connected, and no audio/screen capture was attempted. Treat these as high-impact static findings, not a reproduced live exploit.

Required architecture work:
1. Make public Realtime messages wake-up hints only; fetch commands/state through authenticated HTTP.
2. Move call/voice/screen signaling to server-mediated endpoints with session and membership verification, or implement a complete private-channel identity/JWT/policy design.
3. Reject public offer/answer/ICE/presence events from the legacy client path once authenticated transport is active; ensure the flag cannot silently leave public signaling as the release default.
4. Add isolated negative tests for forged sender, non-member, command, presence, voice and screen offers.
5. Align database broadcast topic with clients and minimize payloads; do not broadcast full message rows.
6. Verify Dashboard Allow public access before changing it. Do not disable public access before a coordinated cutover because it may break existing clients. The current custom UpStatus session token is not a Supabase Auth JWT; setting private: true alone is insufficient.

## Fresh Supabase read-only snapshot

Production project dlfvkawaiqduhlazsszm:
- Project ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- Seven applied migrations, latest 20261027155438 (set_upstatus_upload_limits_20mb).
- 38 Edge Functions ACTIVE; all report verify_jwt=false.
- Four operational runtimes:
  - upstatus v480, source SHA bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd.
  - upstatus-screen-share-3-1-1-beta10 v6, source SHA f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29.
  - upstatus-team-lite v15, source SHA 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb.
  - upstatus-test v281, source SHA 7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a.
- Direct source inspection of all four confirms no /api/setup-invite route, first-caller setup behavior and name-based authorization fallbacks.
- Production SELECT: zero setup_token_* columns, zero consume_upstatus_setup_invite RPCs, 50 realtime.messages rows, seven direct partitions, three public SECURITY DEFINER trigger functions.
- Security Advisor observed 2026-11-08 17:07 UTC: 6 WARN (three anon and three authenticated SECURITY DEFINER trigger findings) and 10 INFO (RLS enabled without policies). Performance and health advisors returned no findings.
- Managed branch main remains MIGRATIONS_FAILED while the project and preview are ACTIVE_HEALTHY; root cause still requires Dashboard branch logs.

Isolated lab bfpjtfqlnypisxljoxkb:
- ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 38 migrations, two Edge Functions.
- SELECT: four setup-token columns, one consume_upstatus_setup_invite RPC, zero users, zero messages, zero realtime.messages rows.
- No third TEST full-product project exists.

## Release gates still open

1. Port the authenticated Realtime signaling design into both stable candidate lines and close public media-signal trust.
2. Complete HTTP Deno integration for invite issuance/consumption and the signaling HTTP 409 mapping; helper remains v32.
3. Apply AUTH-03 migrations only after explicit authorization, onboarding freeze and coordinated four-runtime rollout/rollback plan; production currently lacks the schema/RPC.
4. Verify post-migration catalog state and Management API token database_migrations_read scope.
5. Create a dedicated Team Lite production deploy workflow; inherited workflow still targets upstatus rather than upstatus-team-lite.
6. Resolve AUTH-02 trusted-IP/rate limiting, grants/default ACLs, Storage privacy/limits, and managed branch MIGRATIONS_FAILED.
7. Provision TEST full-product, obtain human reviews, and configure branch protection.
8. Complete physical acceptance #78; it remains 0/8. Update #79's historical 16/35 body after QA/engineering reconcile the checklist.

## Safety

All production Supabase operations in this checkpoint were read-only (Management API source/version/list/advisor reads and SELECT-only catalog queries). No migration, SQL write, deploy, workflow dispatch, merge, release, userscript publication, secret/role/grant/ACL/policy/feature-flag change, function deactivation, hostile broadcast or physical test was performed. QA's branch and docs/RELEASE_READINESS.md were not modified.
