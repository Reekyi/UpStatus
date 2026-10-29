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
