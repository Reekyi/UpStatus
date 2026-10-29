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

1. Validation passed for the trigger-function privilege migration and its checks. README/work-log documentation-only follow-ups have been added since; verify the latest CI run for the current head before considering the PR green. Keep PR #74 in draft pending final review.
2. Test attachment staging, caption/reply preservation, failed-upload recovery, and link previews in a browser/TEST environment.
3. Compare the generated backend against the live Edge Function and run an appropriate TypeScript/Deno check before any deployment.
4. Diagnose the Team Lite popup on the affected installation by confirming its installed `@version`, updater status line, and whether manifest/script fetches succeed. Do not bump the official version merely to force a popup.
5. Merge or deploy only after runtime checks are complete and Ricardo explicitly authorizes release.
