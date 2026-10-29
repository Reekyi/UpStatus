# UpStatus Work Log

Last updated: 2026-10-29

## Current workstream

- Repository: `Reekyi/UpStatus`
- Working branch: `chore/continuity-foundation`
- Pull request: #74, draft and not merged
- Baseline: `master` at `a9288ccfcb0f308d3a587bfca624418a395be07b` when the workstream began
- Safety: no production, TEST, or Team Lite deployment performed during this workstream.

## Work completed

- Added `ARCHITECTURE.md` to map product/release lines, build chain, runtime differences, and release safety invariants.
- Added `DEVELOPMENT.md` to document a repeatable inspect, patch, test, review, and release workflow.
- Fixed production update/download URL generation to use the stable URL in `release.json.scriptUrl` or the stable production endpoint fallback, rather than the legacy runtime endpoint.
- Added exact updater URL checks and important backend behavior assertions to the validator.
- Reconciled the backend template with known live behavior while preserving signed upload routes, official-team filtering, guest-session history filtering, and document filename persistence.
- Removed name-only admin privilege in favor of the stored `implementation_admin` role. The database role was later verified read-only on 2026-10-29: `public.users` has Ricardo with role `implementation_admin`. Re-check if the account/role changes before deployment.
- Implemented pending attachment staging in the normal chat composer. File picker and pasted images now stage first; users can remove the pending attachment before sending. Sending supports an optional caption with the attachment.
- Added a removable visual preview for the first HTTP(S) link in the draft message. The preview does not rewrite the message text.
- Preserved `file_name`/`fileName` during chat message normalization, keeping document filenames separate from captions.
- Replaced two brittle test assertions with semantic checks for sent timestamp metadata and the actual link-card renderer/styles. No behavior assertion was removed.

## Validation

- Userscript template source-level syntax parse: passed.
- Direct static checks extracted from `scripts/chat-regression.test.mjs`: 56/56 passed on the current code at the time of checking.
- Additional checks for file picker staging, pasted-image staging, caption forwarding, and removable link preview: passed.
- GitHub Actions run `40906042287` for commit `5550195b1a63a9aceccbd65fe4df10a73b6e29cd`: passed, including the build and full `scripts/validate.mjs` pipeline.
- The latest run above corresponds to the current branch head. PR metadata edits do not change the code head.

## Important findings and limitations

- Production normal script observed at version 3.4.7; the build source previously generated an incorrect legacy update URL.
- TEST's `develop` line was observed at `3.0.40-beta.22`, behind production. Do not assume TEST contains production fixes.
- Team Lite is an independent release line. Its manifest/script were observed at Team Lite version 3.4.30; do not bump its official version just to force an update popup.
- `scripts/validate.mjs` runs the build first. The build deletes and recreates generated `supabase/functions/*` and `dist` output. Do not treat validation as read-only.
- Backend template reconciliation is source-level only. Generated/deployed runtime parity has not been fully established.
- Browser-level behavior for attachment staging/link previews has not yet been verified manually.
- The Team Lite update popup issue remains unverified against the user's installed script version and runtime; the official branch was not changed.

## Next steps

1. Final PR diff inspected; latest CI run for current head passed. Keep the PR draft until browser/runtime checks are complete.
2. Account role check completed read-only on 2026-10-29: Ricardo is `implementation_admin`. Re-check if account configuration changes; never restore a name-only admin bypass.
3. Validate chat attachment staging and removable link previews in a browser/TEST environment.
4. Reconcile backend template against the live Edge Function and compile/check the generated function before any deployment.
5. Investigate the Team Lite update popup in an isolated test branch without bumping the official raw-file version.
6. Keep PR #74 draft until final review is complete. Do not merge or deploy without explicit approval.
