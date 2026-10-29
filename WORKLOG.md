# UpStatus Work Log

Last updated: 2026-10-29

## Current workstream

- Repository: `Reekyi/UpStatus`
- Working branch: `chore/continuity-foundation`
- Pull request: #74, open, draft, not merged
- Baseline: `master` at `a9288ccfcb0f308d3a587bfca624418a395be07b` when this workstream began
- Release safety: no production, TEST, or Team Lite deployment; no release version was changed.

## Work completed

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

## Validation

- Userscript template source-level syntax parsing passed during patching.
- Chat regression suite passed after the latest code changes.
- Team Lite updater regression suite passed against the official branch source, including manifest/header/internal version consistency, the internal `UPDATE_URL`, and pinned official manifest/script URLs.
- GitHub Actions run `40910713764` passed for code/test head `9e96282b5e8fe24532b4d03dc750765892840ae9`, including build, chat regression tests, Team Lite updater tests, and the full `scripts/validate.mjs` pipeline.
- Earlier architecture and work-log documentation updates passed in runs `40909976273` and `40910037380`.
- The account-role and schema checks were read-only.

## Important findings and limitations

- Production normal script was observed at version 3.4.7. The old build logic generated update/download URLs under the legacy runtime endpoint; this branch corrects the build source but is not deployed.
- TEST's `develop` line was observed at `3.0.40-beta.22`, behind production. Do not assume TEST contains production fixes.
- Team Lite is an independent release line at version 3.4.30. Its updater only shows a popup when the official remote version is newer than the installed version and the manifest/script agree. The affected installation's version and browser runtime are unknown, so the original missing-popup report is not conclusively diagnosed.
- `scripts/validate.mjs` runs the build first. The build deletes and recreates generated `supabase/functions/*` and `dist` outputs; validation is not read-only.
- Backend template reconciliation is source-level only. Generated/deployed runtime parity has not been fully established.
- Browser-level behavior for attachment staging, upload-failure recovery, and link previews has not been manually verified.

## Next steps

1. Keep PR #74 in draft pending final review.
2. Test attachment staging, caption/reply preservation, failed-upload recovery, and link previews in a browser/TEST environment.
3. Compare the generated backend against the live Edge Function and run an appropriate TypeScript/Deno check before any deployment.
4. Diagnose the Team Lite popup on the affected installation by confirming its installed `@version`, updater status line, and whether manifest/script fetches succeed. Do not bump the official version merely to force a popup.
5. Merge or deploy only after runtime checks are complete and Ricardo explicitly authorizes release.
