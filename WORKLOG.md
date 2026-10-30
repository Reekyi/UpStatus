# UpStatus Work Log

Last updated: 2026-10-29

## Current workstream

- Repository: `Reekyi/UpStatus`
- Working branch: `chore/continuity-foundation`
- Pull request: #74, open, draft, not merged
- Baseline: `master` at `a9288ccfcb0f308d3a587bfca624418a395be07b` when this workstream began
- Release safety: no production, TEST, or Team Lite deployment; no release version was changed.

## Work completed

- Refreshed `README.md` with links to the architecture/development/work log guides, corrected stale version examples, and clarified the independent Team Lite release line.
- Added `ARCHITECTURE.md` to map release lines, build chain, runtime differences, and release safety invariants.
- Expanded `DEVELOPMENT.md` with a repeatable workflow and Team Lite updater troubleshooting steps.
- Fixed normal userscript update/download URL generation to use `release.json.scriptUrl` or the stable production endpoint fallback, rather than the legacy runtime endpoint.
- Added exact updater URL checks and backend invariants to `scripts/validate.mjs`.
- Reconciled the backend template with known live behavior for signed uploads and official-team filtering while retaining guest-session history filtering and document filename persistence. Guest session start times now scope message history, fast unread counts, and read receipts so a returning guest cannot carry unread/read state across sessions.
- Removed name-only admin privilege assignment during first-time setup. Message deletion requires the stored `implementation_admin` role; health diagnostics require that role in both server and UI. Clearing the entire shared chat remains owner-only, but now also requires Ricardo's explicit `implementation_admin` role on both server and UI.
- Read-only database checks confirmed Ricardo, Guilherme, and Lohan each have a configured password and explicit `implementation_admin` role. The `public.messages.file_name` column was confirmed to exist. No database rows were modified.
- Implemented staged attachment selection and paste support in the normal chat composer. Attachments can be removed before sending and can include a caption.
- Preserved document filenames in the separate `fileName` payload and backend `file_name` column.
- Preserved the reply target when sending staged attachments. Failed uploads restore the file, caption, and reply target for retry. The caption stays visible while an upload is pending.
- Added a removable visual preview for the first HTTP(S) link in the draft. It does not rewrite the message; it clears after sending, preserves preview state when attachments are removed, hides invalid empty previews, and scopes dismissal to the specific URL.
- Updated chat regression tests for filename payloads, reply preservation, upload-failure recovery, optimistic captions, preview cleanup, owner-only chat clearing, and role-gated health UI.
- Added `scripts/team-lite-updater.test.mjs`. It checks the independent `team-lite-official` branch for manifest/header/internal version consistency, stable update/download URLs, the newer-version prompt, equal versions, mismatch/downgrade protection, manual update action, invalid manifests, and manifest/script network failures.
- Updated CI checkout to fetch all branches so the Team Lite updater test can inspect the official branch without copying its large script into the normal release branch.
- Added an explicit `--sync-root-artifact` build option with a preflight guard that requires `release.json.version` to be strictly newer before overwriting a changed tracked artifact. The validator confirms ordinary validation leaves `UpStatus.user.js` unchanged and exercises rejection of same-version sync.

## Validation

- Latest validation after signed-upload security assertions: GitHub Actions run `40917000057` passed for commit `9f6bff310ec847a0a5e214bb08c2658e8653aa2b`.

- Userscript template source-level syntax parsing passed during patching.
- Chat regression suite passed after the latest code changes.
- Team Lite updater regression suite passed against the official branch source, including manifest/header/internal version consistency, the internal `UPDATE_URL`, and pinned official manifest/script URLs.
- GitHub Actions run `40911932354` passed for code/test head `600431def2cfc74979bd153a36df98b541d8ebc8`, including build, chat regression tests, Team Lite updater tests, the root-artifact sync safety check, and the full `scripts/validate.mjs` pipeline.
- Earlier architecture and work-log documentation updates passed in runs `40909976273` and `40910037380`.
- The account-role and schema checks were read-only.

## Important findings and limitations

- Production normal script was observed at version 3.4.7. The old build logic generated update/download URLs under the legacy runtime endpoint; this branch corrects the build source but is not deployed.
- The tracked root `UpStatus.user.js` matched the `master` baseline but intentionally remains unchanged on this branch: the working template now contains unversioned chat/auth changes. Do not distribute the working branch under `3.4.7`; a release must regenerate the root artifact, increment the appropriate version, validate parity, and receive explicit release approval.
- TEST's `develop` line was observed at `3.0.40-beta.22`, behind production. Do not assume TEST contains production fixes.
- Team Lite is an independent release line at version 3.4.30. Its updater only shows a popup when the official remote version is newer than the installed version and the manifest/script agree. The affected installation's version and browser runtime are unknown, so the original missing-popup report is not conclusively diagnosed.
- `scripts/validate.mjs` runs the build first. The build deletes and recreates generated `supabase/functions/*` and `dist` outputs; validation is not read-only.
- Read-only runtime parity check decoded the live `upstatus` Edge Function's embedded userscript and confirmed an exact match with `master/UpStatus.user.js` at version `3.4.7`. The candidate generated from this PR's template intentionally differs because it contains unversioned staged-attachment, role-gating, and related fixes; do not distribute that candidate as `3.4.7`.
- A normalized comparison of the live Edge Function and template, excluding embedded script/HTML and build substitutions, surfaced the intentional logic differences: role-based authorization, guest-session filtering for history/unread counts/read receipts, and document filename persistence. No other distinct route-level differences were identified in that comparison.
- Read-only Storage configuration check on 2026-10-29 confirmed `chat-images` has a 20 MiB file-size limit and an explicit MIME allowlist, while `profile-images` has a 20 MiB limit and image-only MIME allowlist. This provides a storage-side size/MIME ceiling in addition to signed-upload route checks.
- Supabase Security Advisor reported three `SECURITY DEFINER` trigger broadcast functions with direct `EXECUTE` grants to `PUBLIC`, `anon`, and `authenticated`. Added a conditional, idempotent privilege-revocation migration and static validation checks in this PR. The migration has **not** been applied to the live database; review its effect on the deployed trigger setup before applying it.
- High-priority Realtime security finding: the live database triggers call `realtime.send(..., false)` on the fixed `upstatus-live-...` topic, and the userscript subscribes to that topic without a private-channel auth configuration. Supabase's Broadcast documentation confirms `false` means anyone can subscribe without authentication. The topic is embedded in the public userscript, and the broadcast payloads include message rows, user-status updates, and remote-command events. This creates a confidentiality/spoofing risk for Realtime data and signaling. A complete fix needs coordinated private-channel authorization and validation of all client signaling; it was not changed wholesale here because it could break chat, calls, and screen sharing.
- Added targeted mitigation for remote-status commands: public `remote_command` events now only trigger a throttled authenticated `/api/remote-status` poll; clients no longer execute the untrusted broadcast payload directly. Regression assertions cover this. This mitigates that command-injection path but does **not** solve the broader public Realtime exposure.
- The advisor also reports 10 tables with RLS enabled and no policies. A read-only privilege audit found that `anon` and `authenticated` have table-level grants on several core tables, but with RLS enabled and no policies, row access is denied by default. UpStatus accesses these tables through its Edge Function/service role; preserve this boundary and do not add broad RLS policies without a separate review.
- Backend template reconciliation is source-level only. Generated/deployed runtime parity has not been fully established.
- Browser-level behavior for attachment staging, upload-failure recovery, and link previews has not been manually verified.

## Next steps

1. Treat public Realtime broadcast confidentiality/signaling as the highest-priority follow-up: design and test private-channel authorization, authenticated sender identity, and server validation before changing the shared channel.
2. Latest GitHub Actions validation passed for current head `97219b5fca9ded679f69680fab48398a7208ef32` in run [40923953706](https://github.com/Reekyi/UpStatus/actions/runs/40923953706). Keep PR #74 in draft pending runtime/security review.
3. Test attachment staging, caption/reply preservation, failed-upload recovery, and link previews in a browser/TEST environment.
4. Compare the generated backend against the live Edge Function and run an appropriate TypeScript/Deno check before any deployment.
5. Diagnose the Team Lite popup on the affected installation by confirming its installed `@version`, updater status line, and whether manifest/script fetches succeed. Do not bump the official version merely to force a popup.
6. Merge or deploy only after runtime checks are complete and Ricardo explicitly authorizes release.


## Additional work during the 2026-10-29 continuation

- Created draft [PR #75](https://github.com/Reekyi/UpStatus/pull/75) from the isolated `team-lite/3.4.31-guest-fixes` branch into `team-lite-official`. It is a review-only candidate and has not been merged; the official branch and served Team Lite script remain unchanged.
- Added `scripts/team-lite-candidate-check.mjs` and `.github/workflows/team-lite-candidate.yml` on the candidate branch. This provides CI coverage for userscript syntax, manifest/header/internal version parity, updater URL parity and mismatch/newer-version guards, guest portal inline-script syntax, and separate Lucca/Ycaro auth routes.
- Candidate checks passed in GitHub Actions run `40920479779` for candidate head `f4c43ecb4921ec7266a9e77abf569961889b0a44`.
- The existing `Deploy Lucca Portal` workflow failed before upload/deploy because GitHub Pages is not enabled/configured for Actions. Its `Upload Lucca site` and `Deploy` steps were skipped; no portal deployment occurred. This needs a deliberate hosting decision, not a code workaround.
- The first candidate-check attempts exposed a regex-escaping bug in the newly added test script; it was corrected and the subsequent candidate workflow passed.
- Updated PR #74's validation reference to its current head `675afdd521c0ac00c031c1a07f3f47390feef8fe` and documented the separate candidate PR.
- High-priority security follow-up remains: the shared Supabase Realtime topic is public and carries more than remote commands. The PR's remote-status polling mitigation narrows one command-injection path only. Do not claim that public broadcast confidentiality or call/signaling authenticity has been fully fixed.

- Extended the isolated Team Lite candidate checks to execute the candidate's actual updater logic in a mocked runtime. The suite covers newer/current versions, manifest/script mismatch, downgrade protection, invalid manifest, and manifest/script network failures. After correcting test-harness escaping and version-fixture issues, the candidate CI passed on `503ad93a339bc9cad3ff7a19fc14b1074a038cd2` (run [40923258203](https://github.com/Reekyi/UpStatus/actions/runs/40923258203)).
- Updated draft PR #75 with the new runtime-test coverage. It remains review-only; Team Lite official remains untouched.

- Read-only runtime version audit on 2026-10-29 decoded the embedded scripts from live Supabase functions: production `upstatus` is revision 480 with userscript 3.4.7; `upstatus-test` is revision 281 with userscript 3.3.28; `upstatus-team-lite` is revision 15 with Team Lite 3.4.30. The GitHub `develop` manifest was previously observed at 3.0.40-beta.22, so TEST source/runtime drift is confirmed and must be reconciled before deploying to TEST.


## Continuation update: 2026-10-29 (live-state recheck)

- Re-checked GitHub before further changes. PR #74 remains open/draft at `6802a89069e993cef0228e4a1e60441973920d1f`; validation run [40924054726](https://github.com/Reekyi/UpStatus/actions/runs/40924054726) passed. PR #75 remains open/draft, and the candidate branch moved after the previously documented passing head. A newer candidate check exposed a regression in the new runtime-test harness.
- Investigated the candidate CI failure: the harness cut extracted code at `var updatePromptShown`, unintentionally excluding the actual `showUpdatePrompt()` implementation. The mocked updater therefore lacked a dependency and fell into its error handler, reporting zero prompts. Fixed the extraction boundary on isolated branch `team-lite/3.4.31-guest-fixes` so the actual prompt function is included; the test still requires exactly one prompt for a newer matching release.
- The change is on candidate commit `2b12d6c31dd462b9319145373e628f7edd065667`; GitHub Actions run [40924895817](https://github.com/Reekyi/UpStatus/actions/runs/40924895817) was queued at last observation. CI has not yet been confirmed green for this commit.
- Supabase Security Advisor re-check still reports three public-schema `SECURITY DEFINER` broadcast trigger functions directly executable by authenticated clients and 10 tables with RLS enabled but no policies. No database changes were made. Do not add broad policies without mapping the service-role/Edge Function access model.
- Supabase documentation confirms private Realtime channels require RLS policies on `realtime.messages` and client channels configured with `private: true`. Switching one side alone is incomplete. Design authenticated identity/token issuance, sender authorization by event, call/screen-share signaling requirements, and rollout/rollback before changing the live channel.
- All work in this continuation remains isolated from `team-lite-official` and deployed Supabase functions. No production/TEST deployments, version bumps, merges, migrations, or PR state changes were performed.


## Candidate updater test follow-up: 2026-10-29

- The earlier attempted harness fixes on candidate commits `2b12d6c`, `4b99e07`, `aa6d2d0`, `ccd2864`, and `351479b` failed CI and are superseded by the latest test-only correction. Review the full branch history if auditing; do not treat the earlier runs as green.
- Root causes identified from CI logs: the extracted test did not exercise the real update prompt reliably, then the mock DOM was used but an assertion incorrectly compared the created modal element to a version string. The current harness now counts actual modal creation and verifies the modal HTML contains the candidate version, keeping the newer-version prompt assertion intact.
- Latest candidate head: `9215510179ca6a4bc1ee274b76bc8d1befbec82b`. Candidate checks succeeded in [run 40925496334](https://github.com/Reekyi/UpStatus/actions/runs/40925496334) and [run 40925508281](https://github.com/Reekyi/UpStatus/actions/runs/40925508281). This is still a mocked-runtime CI test, not a live browser verification.
- PR #75 remains open and draft, base `team-lite-official`; official Team Lite version remains 3.4.30. No change was made to the official branch. Do not merge or deploy without explicit approval.
- PR #74's WORKLOG update is commit `0bad8e7ebbb645f01b4f0ca87747c7f144a410e2`; its validation passed in [run 40924931689](https://github.com/Reekyi/UpStatus/actions/runs/40924931689). Both PRs remain drafts.
- No Supabase functions, database migrations, table data, production, or TEST runtime were changed. Security Advisor remains as previously recorded; the public Realtime channel and SECURITY DEFINER grants remain unresolved.


## Final verification correction: 2026-10-29

- The PR #74 work-log commit is now `9847994c4a4fc7d5011c926232199b0b68a44a66`, not the earlier intermediate `0bad8e7...`; its validation completed successfully in [run 40925578489](https://github.com/Reekyi/UpStatus/actions/runs/40925578489).
- Current PR #75 head is `9215510179ca6a4bc1ee274b76bc8d1befbec82b`; candidate runtime checks passed in [40925496334](https://github.com/Reekyi/UpStatus/actions/runs/40925496334) and [40925508281](https://github.com/Reekyi/UpStatus/actions/runs/40925508281). The official Team Lite manifest was independently read and remains `3.4.30`; candidate manifest is `3.4.31` and points to the same stable official URL by design, but does not serve users until the official branch changes. No such branch change was made.
- Live Supabase function versions rechecked: `upstatus` revision 480, `upstatus-test` revision 281, `upstatus-team-lite` revision 15. No functions or migrations were deployed. Security Advisor still reports 10 RLS-enabled tables without policies, plus three `SECURITY DEFINER` broadcast functions directly executable by `anon` and three by `authenticated`; remediation requires an explicit least-privilege review. See [RLS advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [anon SECURITY DEFINER finding](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), and [authenticated SECURITY DEFINER finding](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).


## Realtime security continuation: 2026-10-29

- Read the current Supabase Realtime documentation through the Supabase docs tool. Public topics allow arbitrary clients to subscribe, send, and receive; private topics require authorization policies. A private flag alone is insufficient.
- Ran a read-only catalog query against project `dlfvkawaiqduhlazsszm`. Confirmed `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()`, and `upstatus_broadcast_users()` are SECURITY DEFINER functions with attached triggers, and both `anon` and `authenticated` have direct EXECUTE privileges.
- Did not execute DDL, apply migrations, deploy functions, merge either PR, or change official branches. The candidate migration `20261029170500_restrict_trigger_function_execute.sql` remains review-only.
- Added a detailed event-family authorization matrix and a staged private-channel migration plan to `ARCHITECTURE.md` in commit `a2fad4ea03f3bbfcb9b901265e944edd96ff3c65`.
- Key implementation constraint: UpStatus uses its own session system, not Supabase Auth. Do not add blanket `authenticated` policies or flip the existing database broadcasts to private until a server-issued short-lived Realtime identity, scoped RLS policies, cross-account negative tests, and a rollback path exist.
- Next engineering work: inventory all normal and Team Lite Realtime subscribe/send handlers, identify which payloads contain data versus refresh hints, and add regression tests for sender spoofing, target mismatch, non-member signaling, expired sessions, and anonymous publish/subscribe. Then implement server-side token issuance and policies as a separate candidate change, without deployment.


## Public Realtime payload hardening candidate: 2026-10-29

- Changed `src/userscript/upstatus.user.template.js` so the public `db_change`, `chat_fast`, and `chat_read` broadcasts are treated as refresh hints only. The client no longer inserts a broadcast-supplied chat row, deletes a row based on an unauthenticated payload, or trusts broadcast-supplied read receipts. It schedules a throttled full refresh from the authenticated `/api/chat` route instead.
- Added regression assertions to `scripts/chat-regression.test.mjs` for payload non-trust, canonical refresh, and one-second throttling.
- Commits: source hardening `0d4fce82c9f6a883126eb062b248588006d4d85b`; regression coverage `60207b8d6a34b78f3df735432df0c8dedb9175b0`.
- Validation status: CI is expected to run against the latest branch head; do not call this verified until the actual run is green.
- Scope limitation: this closes a specific public-broadcast injection path for chat rows/read receipts. Public call signaling, voice-room signaling, screen-share signaling, health ping/pong, and presence remain untrusted and are not fixed by this patch. The Realtime channel is still public. Do not publish or deploy this candidate until tests and full event-by-event authorization work are complete.

- Validation follow-up: GitHub Actions run [40926552969](https://github.com/Reekyi/UpStatus/actions/runs/40926552969) completed successfully for commit `60207b8d6a34b78f3df735432df0c8dedb9175b0`, including the new Realtime payload regression assertions. The subsequent `WORKLOG.md`-only commit does not alter tested source or test code.

 
## Targeted call/media signaling hardening: 2026-10-29

- Extended the candidate normal userscript to reject call signaling with missing/oversized identifiers, missing or oversized SDP, oversized ICE candidates, and non-presence/non-ended call events not explicitly addressed to the current member.
- Voice-room and screen-share handlers now require offer/answer/ICE events to target the current member and reject oversized SDP/candidate payloads. Broadcast presence/leave-style events remain supported.
- Call roster presence is now bounded: call IDs max 160 chars, member labels max 80 chars, roster max 32 members; invalid or duplicate entries are discarded. Participant merging is bounded and deduplicated.
- Mirrored the same defensive checks into the Team Lite 3.4.31 candidate.
- Candidate validation passed for normal source hardening in [run 40935056074](https://github.com/Reekyi/UpStatus/actions/runs/40935056074) and Team Lite in [run 40935072417](https://github.com/Reekyi/UpStatus/actions/runs/40935072417). These runs include the source edits; the newest test-only commits are awaiting/need their own CI confirmation.
- Important limit: these checks reduce malformed, untargeted, and oversized signaling abuse. They do not authenticate the claimed sender. Because the Realtime topic is still public, a malicious sender can still spoof a legitimate member name. Full fix requires server-issued Realtime identity and authorization policies, or a server-mediated signaling path.
- No deployment, SQL migration, official version, or merge changed.


## Post-change validation and database privilege recheck: 2026-10-29

- Latest normal candidate head `42db6fd8f63ace33db118a30193a6c8ccbeeffa7` passed CI in [run 40935146528](https://github.com/Reekyi/UpStatus/actions/runs/40935146528). The source hardening and test assertions also passed in [run 40935093186](https://github.com/Reekyi/UpStatus/actions/runs/40935093186).
- Team Lite candidate head `f12264aee00f9a66abbd63fda2c4e915b1e36748` passed candidate checks in [run 40935103623](https://github.com/Reekyi/UpStatus/actions/runs/40935103623). The corresponding source changes passed in [run 40935072417](https://github.com/Reekyi/UpStatus/actions/runs/40935072417).
- Re-ran Supabase Security Advisor and read-only catalog checks. The same three `SECURITY DEFINER` broadcast trigger functions remain directly executable by `anon` and `authenticated`; the candidate revoke migration is still unapplied (`0` migration-history rows for version `20261029170500`).
- Read-only table privilege audit found `anon` and `authenticated` have table-level grants on nine RLS-enabled public tables with no policies. With RLS enabled and no policies, those table reads/writes are denied by RLS, but the grants are unnecessary exposure surface and should be reviewed separately. `upstatus_visual_config` has no anon/authenticated table grants. Do not add broad policies to silence the Advisor; the app's intended access path is through the authenticated Edge Function/service role.
- Production Edge Function `upstatus` remains revision 480; TEST `upstatus-test` remains revision 281; Team Lite `upstatus-team-lite` remains revision 15. No deploy or database mutation was performed.


## Remote command result authenticity hardening: 2026-10-29

- Audited the public Realtime event handlers and found that `remote_result` could complete the UI waiter using a public broadcast payload when `result.sender === member`. This could forge the visual success/failure notification, even though the actual remote command is still retrieved through the authenticated backend poll.
- Normal and Team Lite candidates now ignore the public `remote_result` payload as an authority. `waitRemoteResult()` continues polling `/api/remote-status/result`, which remains the canonical authenticated result source.
- Added regression assertions to both candidate suites to ensure public result broadcasts are not applied and authenticated result polling remains present.
- Validation: normal candidate build passed in [run 40936531809](https://github.com/Reekyi/UpStatus/actions/runs/40936531809); Team Lite candidate checks passed in [run 40936550825](https://github.com/Reekyi/UpStatus/actions/runs/40936550825).
- This closes a spoofable UI confirmation path only. It does not authenticate Realtime senders or solve public-channel exposure for presence, health diagnostics, and call/media signaling. No deployment, migration, official version change, or merge occurred.


## Health diagnostic spoof-resistance and Realtime auth design: 2026-10-29

- Tightened the health ping/pong handlers in both candidate userscripts. They now require bounded string IDs and sender labels; a pong is accepted only when its sender label matches the member the client originally pinged. This reduces accidental/malicious misattribution of latency results, but sender labels remain spoofable on a public channel and are not identity proof.
- Added regression assertions to both candidate test suites.
- Validation: normal candidate validation passed in [run 40937604488](https://github.com/Reekyi/UpStatus/actions/runs/40937604488); Team Lite candidate checks passed in [run 40937631921](https://github.com/Reekyi/UpStatus/actions/runs/40937631921).
- Confirmed from the current Supabase docs that public channels permit any user to subscribe, send, and receive messages; private-channel authorization requires RLS policies on `realtime.messages`, private channel configuration, and access tokens with claims Realtime can authorize. See [Realtime Concepts](https://supabase.com/docs/guides/realtime/concepts) and [Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization).
- The current userscripts create Realtime clients using the publishable key with `persistSession:false`, while application authentication is a separate custom session handled by the UpStatus Edge Function. Therefore simply flipping the client channel to private would break connectivity and would not authenticate the app's custom identity. A safe design needs a server-issued, short-lived Realtime-compatible JWT, verified claims/role mapping, per-topic RLS policies, and coordinated client migration. No JWT secret was read or exposed, and no database or Realtime settings were changed.
- No deploy, migration, official version change, or merge occurred.

## Follow-up inventory: Realtime event map and runtime artifact boundaries: 2026-10-29

- Rechecked the live production Edge Function read-only: `upstatus` is still active at revision 480, version 3.4.7, with `verify_jwt=false` because the handler implements its own custom UpStatus session authentication. No deployment or configuration change was made.
- Read-only SQL re-confirmed all three trigger-only broadcast functions (`upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()`, `upstatus_broadcast_users()`) are executable by `anon` and `authenticated` through current grants. The staged migration path is `supabase/migrations/20261029170500_restrict_trigger_function_execute.sql`; the migration history still has no `20261029170500` row. The migration remains unapplied. Revoking direct EXECUTE should preserve trigger execution, but it still needs a reviewed rollback plan before application.
- The candidate normal userscript's shared broadcast event map includes `db_change`, `chat_fast`, `chat_read`, `user_status`, `chat_presence`, `health_ping`, `health_pong`, `remote_command`, `remote_result`, and `call_signal`. Current hardening makes chat data refresh from the authenticated API, ignores public remote-result payloads, and treats remote-command broadcast as a poll hint. Presence, health and call/media signaling remain sender-spoofable because member labels are not cryptographic identity.
- Confirmed that the checked-in legacy `supabase/functions/upstatus/index_v25_loader.ts` loads `backend_v25_bundle.ts`, whose embedded backend declares version `2.7.25`. This is not the currently deployed production entrypoint: Supabase reports the live entrypoint as `index.ts`, revision 480, with version 3.4.7. Do not mistake the legacy loader/bundle for production runtime or use it as a generation source without tracing references/build history.
- Realtime remediation design remains open. Option A is private channels with server-issued short-lived Realtime-compatible credentials, explicit per-event authorization policies, and coordinated migration. Option B is to move sensitive signaling to authenticated Edge Function endpoints with bounded polling/short-lived persisted messages, retaining public Realtime only for non-sensitive invalidation hints. Do not implement a private-channel flip or mint tokens until the signing mechanism, claims, expiry/revocation behavior, topic authorization and rollout have been proven in an isolated test environment.
- No code release, official branch change, merge, deployment, migration, secret read, or database mutation occurred in this follow-up.

## Build safety regression found and fixed: 2026-10-29

- Reviewing the build pipeline found that `scripts/build.mjs` recursively removed each entire Supabase function directory before rewriting `index.ts`. Those directories also contain tracked sidecar artifacts such as `index_v25_loader.ts` and `backend_v25_bundle.ts`. Running the build could therefore delete unrelated tracked files from a developer checkout and obscure the legacy/runtime boundary.
- Changed `writeFunction()` to create the directory if needed and overwrite only the generated `index.ts`. Removed recursive directory cleanup from the build, including `dist`; the build overwrites its three known generated artifacts without deleting unrelated files.
- Added validation assertions that prohibit recursive cleanup and verify the two known production sidecars remain present after the build.
- Commits: build fix `9391ec113c5583471f96368eb7d070fc2a0b70ec`; regression assertions `26db1386c63b1a7e97b2ecb5550077b4c9d3dee4`.
- CI has not yet reported a run for these latest API-created commits. The existing CI workflow only runs on pull requests targeting `master` or `develop`; the PR targets `master`, but the connector has not returned a new run. Do not claim the latest change is CI-verified until a run on this head is observed. No runtime deployment or release artifact was changed.

## Realtime security design captured: 2026-10-29

- Added REALTIME_SECURITY_PLAN.md and linked it from README. It inventories the normal candidate's chat, presence, health, remote-command/result, call, voice-room and screen-share event families; separates already mitigated UI trust issues from unresolved sender spoofing; and documents private-channel/JWT and server-mediated signaling alternatives with decision gates and negative-test cases.
- No signing key or secret was read. The plan explicitly prohibits assuming a service-role key can sign Realtime tokens and requires verification of the project's signing configuration before implementation.
- Build safety fix and regression checks passed in GitHub Actions run 40939791684 (commit 26db1386c63b1a7e97b2ecb5550077b4c9d3dee4). The subsequent WORKLOG-only commit was picked up by run 40939827026, which also completed successfully.
- PR #74 has returned to mergeable=true and remains open/draft/unmerged. PR #75 remains open/draft/unmerged. Neither PR was merged and no deployment or migration occurred.
- The public-channel sender-authentication issue remains an explicit release blocker; documentation does not claim the risk is fixed.

## Live production backend parity audit: 2026-10-29

- Compared the live Supabase production Edge Function source (revision 480, reported version 3.4.7) with the candidate server template after normalizing the embedded userscript and release-specific constants. The normalized diff contains 27 differing line groups; it is not safe to assume that the template and deployed backend are equivalent.
- Confirmed material differences: live account setup has a fallback that grants implementation_admin by matching the names Ricardo, Lohan, or Guilherme when the stored role is absent; the live health route authorizes by name allowlist instead of the role helper; live chat responses/storage omit document filenames; live message history, unread count and read-receipt routes lack the candidate's guest-session start-time filters; and live chat clearing uses a name-only Ricardo check instead of the candidate's role check.
- Read-only query confirmed the current roles for Ricardo, Guilherme and Lohan are implementation_admin. Password hashes were not inspected. The account setup route only blocks setup when a password hash already exists, so the initial-setup state of privileged accounts must be verified through a safe boolean-only check before deciding whether there is an active account-claim risk. Do not expose hashes or reset credentials.
- The differences may include intentional UX changes as well as security fixes. The draft source is not a deployable substitute at version 3.4.7; review each backend difference, test account provisioning and guest isolation in TEST, increment the version when authorized, and verify the served runtime after any approved deployment.
- Updated ARCHITECTURE.md with this runtime comparison and corrected the build safety note. No production/TEST deployment, SQL migration, secret read, role change, password change, or merge occurred.

## TEST backend parity audit: 2026-10-29

- Read the live TEST Edge Function read-only: slug upstatus-test, revision 281, embedded userscript version 3.3.28. Compared its backend source with the current server template after normalizing embedded payloads and release-specific constants; 38 differing line groups remain.
- TEST runtime has some distinct guest-session filtering and profile/upload behavior not identical to the current candidate template, but it also retains the name-based admin fallback and lacks document filename persistence and the candidate's full guest-session start-time filters for history/unread/read receipts.
- This confirms TEST is not a clean drop-in validation target for the current candidate. Do not deploy to TEST merely to align versions; first reconcile the intended source baseline and explicitly choose which runtime behavior is authoritative.
- Updated ARCHITECTURE.md. No TEST/production deployment, migration, secret read, or database mutation occurred.

## Team Lite backend parity audit: 2026-10-29

- Read the live upstatus-team-lite Edge Function read-only: revision 15, embedded version 3.4.30. A normalized comparison with the Team Lite candidate backend template found 17 differing line groups.
- Material differences: live runtime does not persist/return document filenames; read receipts do not enforce the candidate's guest-session start-time filter; an admin check includes a name-based Ricardo bypass; guest join/leave notice text differs. Candidate and runtime must be reconciled rather than assuming version 3.4.31 alone makes them equivalent.
- The Team Lite userscript candidate's latest checks remain passed on head fcc638e308730742f1280a39803d94e36706b662 in run 40937631921. This validates candidate checks, not the live browser updater popup or backend parity.
- Updated ARCHITECTURE.md with the live Team Lite comparison. No Team Lite deployment, official branch change, migration, or merge occurred.

## Public table grant hardening staged: 2026-10-29

- Read-only catalog audit identified nine RLS-enabled public tables with no RLS policies but broad table grants for anon/authenticated: chat_reads, messages, reactions, status_history, upstatus_profiles, upstatus_sessions, upstatus_state, upstatus_typing, and users. RLS currently denies direct table operations when no policies apply, so this is unnecessary grant surface rather than proof of an exploitable direct read.
- Added unapplied migration supabase/migrations/20261029183000_revoke_unused_public_table_grants.sql to revoke table privileges from PUBLIC, anon and authenticated while leaving service_role/owner privileges untouched. Added static validation assertions for the migration's target table list and revoke scope.
- Updated ARCHITECTURE.md. The migration has not been applied; validate the migration in an isolated TEST baseline, confirm all application reads/writes go through the Edge Function, and prepare rollback before any authorized application.
- Latest CI for the migration/test commit has not yet been observed. Do not describe this addition as validated until GitHub Actions reports success on the relevant code/test head. No database mutation occurred.

## Follow-up security work and current CI: 2026-10-29

- Read-only Realtime catalog review confirmed that `realtime.messages` has RLS enabled but no policies. The three live `upstatus_broadcast_*` SECURITY DEFINER trigger functions still grant EXECUTE to `anon` and `authenticated`; the triggers remain active on `messages`, `upstatus_state`, and `users`.
- Read-only function-definition review confirmed all three current producers use `realtime.send(..., false)` on the shared public topic. The message producer sends the entire changed row; the user-status producer sends name/status/reason/sync fields; the remote-state producer sends command/result metadata. No private-channel flip or new RLS policy was attempted.
- Expanded `REALTIME_SECURITY_PLAN.md` with verified production, TEST and Team Lite function revisions, actual producer behavior and payloads, the missing Realtime policies, privilege findings, staged migration status, and the A/B architecture decision gate. The document change is commit `abf769fdd5473305a922d90d6ca6cbd24780456a`.
- Latest observed normal candidate CI: [run 40942570434](https://github.com/Reekyi/UpStatus/actions/runs/40942570434) passed on `abf769fdd5473305a922d90d6ca6cbd24780456a`. Supabase Preview remains skipped because this work branch is not associated with a Supabase branch database; this is not a deployed runtime test.
- Team Lite candidate security fix: commit `aac1d9cbbda14772e81f618d8921ead61090d96f` changes setup fallback to `implementation_user` and makes the health route consult the stored `implementation_admin` role. Regression assertions were added in commit `8ad76f4e8e195b7397f5b176dbb277f850f6ebf7`.
- Latest observed Team Lite candidate CI: [run 40942718446](https://github.com/Reekyi/UpStatus/actions/runs/40942718446) passed on `8ad76f4e8e195b7397f5b176dbb277f850f6ebf7`. The candidate updater test executes the extracted `checkUpdate()` logic with mocked fetch/DOM dependencies and covers newer/current version, manifest mismatch, downgrade, manifest/script network failure and invalid manifest. This is simulated runtime testing, not a live browser or live served-artifact test.
- Both PRs remain open, draft, mergeable, and unmerged. No production/TEST/Team Lite function was deployed; no SQL migration, secret/config change, or official branch modification occurred.
- Remaining high-priority work: prove whether the deployed Supabase setup supports a safely issued Realtime-compatible JWT without reading secrets; decide and test private-channel authorization or server-mediated signaling; exercise migrations and endpoint behavior in an isolated TEST baseline after authorization; run real browser tests for normal and Team Lite update popup and core chat/call/share flows; reconcile version/source/runtime parity before any release. Current completion is not 100%.

- Additional authorization finding documented in `REALTIME_SECURITY_PLAN.md` commit `3b969a73509a7021ee3483722bdd3d79398f7bf1`: the candidate Edge Function caches custom-session validation for up to 30 seconds. A server-side session deletion, account disablement or role change may therefore not take effect immediately on a warm instance. This needs explicit revocation semantics before issuing Realtime credentials. The commit's validation check is still pending at the time of this note; Supabase Preview was skipped because no preview branch is attached.


## Follow-up permission cross-check: 2026-10-29

- Rechecked effective table privileges in the live production database with read-only catalog queries. The nine tables listed in `20261029183000_revoke_unused_public_table_grants.sql` still grant table privileges to both `anon` and `authenticated`; the migration's target list matches those nine tables. `upstatus_visual_config` also has RLS enabled without policies, but currently grants none of the tested table privileges to either client role, so it was intentionally not added to the revoke list.
- Rechecked the three trigger-only broadcast functions: `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()`, and `upstatus_broadcast_users()` still grant EXECUTE to PUBLIC, `anon`, and `authenticated`. The staged revoke migration targets all three. No migration was applied.
- The live `realtime.messages` catalog has no policies. This remains a blocking authorization design issue for a secure private-channel migration; do not switch existing clients to private channels until a supported identity/signing path and complete policy tests are proven.
- CI now passes on current normal head `58fc97eb4ae889ad80fed86c6eea1dd132c553f2` (run 40943314984) and Team Lite head `8ad76f4e8e195b7397f5b176dbb277f850f6ebf7` (run 40942731055). Supabase Preview is skipped because neither PR has an associated Supabase branch database. These are candidate CI results, not live browser or deployment validation.
- No production/TEST/Team Lite deployment, database migration, secret/configuration change, or PR merge occurred.

## Publicly served artifact parity check: 2026-10-29

- Read the currently served userscript artifacts over HTTPS without modifying any runtime. Production serves version `3.4.7`, TEST serves `3.3.28`, and the official Team Lite raw artifact serves `3.4.30`. These match their currently configured release manifests, but they do not include the unmerged candidate changes on PRs #74 and #75.
- Team Lite candidate `3.4.31` is intentionally not served by the official Team Lite branch yet; therefore the new candidate updater/security behavior cannot be considered live or browser-verified. Do not alter the official update endpoint or publish the candidate without explicit approval.
- Added normal candidate validation assertions that the public Realtime `db_change`, `chat_fast`, and `chat_read` broadcasts are only invalidation hints, and that `remote_command` / `remote_result` broadcast payloads do not become authoritative command/result data. Latest normal CI passed on commit `990954a04a71859ac5298e0932f05433b89b94a9` (run 40943754357). Team Lite candidate CI remains passed on `8ad76f4e8e195b7397f5b176dbb277f850f6ebf7` (run 40942731055).
- The Realtime sender-authentication issue remains unresolved: client-side filtering does not authenticate call, voice-room, or screen-share signaling. No deployment, database migration, official branch change, or merge occurred.

## Realtime signing-key feasibility: 2026-10-29

- Reviewed the official Supabase documentation for Realtime authorization, JWT signing keys, and Edge Function secrets. Private channels require RLS policies plus `private: true` and disabling public access in Realtime settings; custom identity JWTs require an app-controlled signing key. Private signing material is not extractable from Supabase after import.
- Updated `REALTIME_SECURITY_PLAN.md` to document these prerequisites and explicitly rule out using the service-role key / `role=service_role` JWT as a shortcut. No signing key was created/imported, no Realtime setting was changed, and no secret was read or modified. These auth/configuration changes require explicit approval and isolated testing.
- The most recent completed normal validation before this documentation update passed on `990954a04a71859ac5298e0932f05433b89b94a9` (run 40943754357). Validation for the current worklog/plan commits is pending; Supabase Preview is skipped because the PR has no associated Supabase branch database.

## Follow-up live catalog verification: 2026-10-29

- Re-ran a read-only query against the current production catalog. `realtime.messages` still has zero RLS policies.
- Reconfirmed the three public broadcast functions are SECURITY DEFINER, owned by postgres, executable by both `anon` and `authenticated`, and each is attached to its expected trigger table: messages, upstatus_state, and users. This supports the staged grant-revocation migration's target selection; it does not replace a TEST validation of trigger behavior.
- Re-ran the Supabase Security Advisor. It reports 10 RLS-enabled tables without policies and three SECURITY DEFINER functions callable by anon. Nine of those tables are covered by the staged table-grant migration; `upstatus_visual_config` has no client grants in the earlier privilege check and is intentionally not included in the revoke list.
- Normal candidate CI remains green on current head `6695357599532dc3298d5dfa587790ac22cf2bc6` (run 40943907867); Team Lite candidate CI remains green on `8ad76f4e8e195b7397f5b176dbb277f850f6ebf7` (run 40942731055). Both PRs remain draft and unmerged.
- No migration, deployment, secret/configuration change, or merge was performed. Realtime sender authentication and cross-instance session revocation remain open security items; the current evidence does not justify declaring the project release-ready.

## Database migration test planning: 2026-10-29

- Added a candidate-only database grant migration runbook to `REALTIME_SECURITY_PLAN.md`: preflight inventory, staged TEST order, direct-RPC denial checks, trigger regression checks, service-role compatibility checks, rollback discipline, and post-migration Security Advisor verification.
- The runbook is planning/documentation only. No migration was applied. Normal candidate validation passed on commit `3dba283131be0f4b59279603edf088e30ba5d7c5` (run 40944759137). Supabase Preview remains skipped because no Supabase branch database is attached to the PR.
- Remaining blockers are unchanged: authenticated Realtime sender identity, cross-instance session revocation semantics, and live browser/runtime coverage. PR #74 and PR #75 remain open draft PRs and are not merged.


## Realtime candidate artifact/source reconciliation: 2026-10-29

- Investigated an apparent mismatch found during a read-only audit: the tracked root `UpStatus.user.js` still contains the older direct handlers for `db_change`, `chat_fast`, and `chat_read`. This is the preserved stable artifact and is intentionally not overwritten during ordinary candidate validation.
- Confirmed the actual normal candidate source `src/userscript/upstatus.user.template.js` treats those public broadcasts as untrusted refresh hints and reconciles chat through the authenticated API. `scripts/build.mjs` renders that template into `dist/upstatus.user.js`; `scripts/validate.mjs` and `scripts/chat-regression.test.mjs` assert the generated artifact does not apply broadcast-supplied rows or read receipts.
- Confirmed the Team Lite candidate source is `team-lite/upstatus-team-lite.user.js`, which uses the same canonical refresh approach with authenticated-session generation guards. `scripts/team-lite-candidate-check.mjs` has explicit regression assertions for these handlers. The separate root `UpStatus.user.js` is not the Team Lite candidate artifact.
- The apparent mismatch is explained by the intentionally preserved stable/root artifact versus the candidate source. This audit did not change code or any served artifact. Normal candidate validation passed on source/test commit `3dba283131be0f4b59279603edf088e30ba5d7c5` (run 40944759137); Team Lite candidate checks passed on `8ad76f4e8e195b7397f5b176dbb277f850f6ebf7` (run 40942731055).
- No deployment, migration, secret/configuration change, official branch modification, or merge occurred. Public Realtime sender authentication, cross-instance session revocation, and live browser/runtime testing remain open release blockers.

## Signaling acknowledgement correctness: 2026-10-30

- Corrected `POST /ack` in the isolated `upstatus-signal-test` function so the response count comes from rows actually deleted by the database, rather than the submitted ID count. The delete is still scoped to the requested room and authenticated recipient.
- Extended the opt-in authenticated integration harness to send one valid event ID plus a safe nonexistent ID and assert that only one event is acknowledged. Expanded payload-sanitization assertions to cover `created_by`, `recipient`, `sender_id`, `userId`, and `user_id`.
- Deployed the updated function as revision 6 only to the isolated Supabase project `bfpjtfqlnypisxljoxkb`. No production or official TEST function was changed.
- Added documentation for the acknowledgement behavior and a confirmed design gap: room creation currently makes requested known users members immediately, without an invite-acceptance step. Before production use, introduce pending invitations and require acceptance before signaling.
- The authenticated harness remains unexecuted because valid, distinct test-user sessions are not available in this session. The code change is not yet runtime-verified by that harness. No PR was merged and no production migration or deployment occurred.

## Room invitation consent and discovery: 2026-10-30

- Added a membership status column to the isolated signaling prototype (`pending`, `accepted`, `declined`) and applied the schema change only to test project `bfpjtfqlnypisxljoxkb`. No production database was touched.
- Updated room creation so the creator is accepted immediately and invited users remain pending. Pending users cannot signal or poll until they accept their invitation.
- Added authenticated `POST /room/invitations`, `POST /room/accept`, and `POST /room/decline` routes. The invitation listing returns only the caller's own active, unexpired invitations.
- Deployed function revision 8 to the isolated test project. The health endpoint still returns the expected success JSON.
- Expanded authenticated integration harness checks for invitation discovery, privacy from uninvited users, pre-accept polling denial, explicit acceptance, and acknowledgement count correctness. These tests remain unexecuted because valid test-session tokens are not available.
- Expanded unauthenticated smoke tests to require authentication for invitation listing/acceptance/decline. Earlier CI run #16 passed after acceptance/decline routes were added; the latest invitation-listing smoke run is still pending at last inspection.
- Updated the migration to preserve existing room memberships as accepted when upgrading, while new invitations are explicitly inserted as pending by the function.
- No production or official TEST function was changed. No PR was merged.
