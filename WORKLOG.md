# UpStatus Work Log

Last updated: 2026-10-29

## Current workstream

- Repository: `Reekyi/UpStatus`
- Working branch: `chore/continuity-foundation`
- Pull request: #74, open, draft, not merged
- Baseline: `master` at `a9288ccfcb0f308d3a587bfca624418a395be07b` when this workstream began
- Release safety: no production, TEST, or Team Lite deployment; no release version was changed.

## Work completed

- Added `ARCHITECTURE.md` to map product/release lines, build chain, runtime differences, and release safety invariants.
- Added `DEVELOPMENT.md` to document a repeatable inspect, patch, test, review, and release workflow.
- Fixed production update/download URL generation to use `release.json.scriptUrl` or the stable production endpoint fallback, rather than the legacy runtime endpoint.
- Added exact updater URL checks and backend behavior assertions to `scripts/validate.mjs`.
- Reconciled the backend template with known live behavior while preserving signed-upload routes and official-team filtering, and retaining guest-session history filtering and document filename persistence.
- Removed name-only admin authorization for message deletion and removed name-based admin assignment during first-time account setup. The database was checked read-only on 2026-10-29: Ricardo, Guilherme, and Lohan each have a configured password and explicit `implementation_admin` role.
- Implemented pending attachment staging for the normal chat composer. File picker and pasted images now stage before upload, can be removed before sending, and support an optional caption.
- Kept the original document filename in the separate `fileName` payload field and backend `file_name` column.
- Preserved the selected reply target when sending a staged attachment. If upload fails, the composer restores the attachment, caption, and reply target so the user can retry instead of losing the draft.
- Added a removable visual preview for the first HTTP(S) link in the draft. The preview does not rewrite the message text; it clears after sending and stays synchronized when attachments are removed.
- Replaced two brittle chat test assertions with semantic checks; added assertions for filename payloads, reply preservation, failed-upload recovery, and preview cleanup.
- Added `scripts/team-lite-updater.test.mjs`. It reads the independent `team-lite-official` branch and checks manifest/script version and URL consistency, the newer-version prompt, equal versions, manifest/script mismatch, downgrade protection, and network failure behavior.
- Updated the validation workflow to fetch all branches so the Team Lite regression test can inspect the official branch without copying its script into the normal product branch.

## Validation

- Userscript template source-level syntax parsing passed during patching.
- Chat regression suite passed, including the latest attachment and preview assertions.
- Team Lite updater regression suite passed against the official branch source.
- GitHub Actions run `40908353637` passed for current code head `8a0e449c34210aebabdc853bbe4d3f1bde67cf8f`, including the build, full `scripts/validate.mjs` pipeline, chat regression tests, and Team Lite updater regression tests.
- The Supabase `public.messages.file_name` column was confirmed to exist using a read-only schema query.
- The account-role verification used a read-only query only. No database rows were modified.

## Important findings and limitations

- Production normal script was observed at version 3.4.7. The previous build logic generated updater URLs under the legacy runtime endpoint; this is corrected in the branch but not deployed.
- TEST's `develop` line was observed at `3.0.40-beta.22`, behind production. Do not assume TEST contains production fixes.
- Team Lite is an independent release line at version 3.4.30. Its updater correctly shows a popup only when the remote version is newer than the installed version and the manifest/script versions agree. The user's installed version and browser runtime are unknown, so the original missing-popup report is not conclusively diagnosed.
- `scripts/validate.mjs` runs the build first. The build deletes and recreates generated `supabase/functions/*` and `dist` output; validation is not read-only.
- Backend template reconciliation is source-level only. Generated/deployed runtime parity has not been fully established.
- Browser-level behavior for attachment staging and link previews has not been verified manually.

## Next steps

1. Keep PR #74 in draft pending final review.
2. Test attachment staging, upload-failure recovery, reply handling, and link previews in a browser/TEST environment.
3. Compare the generated backend against the live Edge Function and check the generated function with an appropriate TypeScript/Deno validation before any deployment.
4. Diagnose the Team Lite popup on the affected installation by confirming the installed `@version`, updater status text, and whether the manifest/script fetch succeeds. Do not bump the official version merely to force a popup.
5. Merge or deploy only after the runtime checks are complete and Ricardo explicitly authorizes the release.
