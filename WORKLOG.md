# UpStatus Worklog

This is the durable handoff point across conversations. Update it after each meaningful implementation or release step. Always verify repository state before acting on entries here.

## Current objective

Establish a safe, fast, recoverable workflow for ongoing fixes to UpStatus normal and Team Lite, avoiding unnecessary full-script reads and preventing work from being lost when a chat reaches its context limit.

## Initial inventory (2026-10-29)

### Repository and branch state observed
- Repository: `Reekyi/UpStatus`
- Default branch: `master`
- `master` head observed: `a9288ccfcb0f308d3a587bfca624418a395be07b`
- `develop` head observed: `6b33e1e26ad105143f00372ae6d0f2fa52df60d6`
- `team-lite-official` head observed: `9065bc1536fde64f437f6f12b7abb9b072cb8281`

### Versions observed
- Normal production manifest on `master`: `3.4.7`
- Normal `develop` manifest: `3.0.40-beta.22`
- Team Lite manifest on `team-lite-official`: core `3.4.7`, build `3.4.30`

### Important build/validation behavior
- `scripts/validate.mjs` calls `scripts/build.mjs` before validation.
- `scripts/build.mjs` deletes and recreates generated `supabase/functions/upstatus`, `supabase/functions/upstatus-test`, and `dist` directories.
- The source template `src/userscript/upstatus.user.template.js` is approximately 544 KB. The old `master` build logic incorrectly derived production updater URLs from the legacy `upstatus-screen-share-3-1-1-beta10` API endpoint. The live `upstatus` Edge Function is version `3.4.7` and serves an embedded script whose update/download URLs point to `/functions/v1/upstatus/upstatus.user.js`; the legacy endpoint serves script version `3.1.1-beta8`.
- The production deployment workflow is manual and contains a guard that currently allows only stable version `3.4.7`.
- The TEST deployment workflow is also manual and deploys only `upstatus-test`.
- The Team Lite release manifest and script are on a separate branch. Team Lite deployment behavior has not yet been independently verified.

### Changes made so far
- No deployed runtime code, release version, or deployment has been changed.
- Branch `chore/continuity-foundation` was created from `master`; production branch remains untouched.
- Added `ARCHITECTURE.md`, `DEVELOPMENT.md`, and `WORKLOG.md` for durable project context and cross-chat handoff.
- Patched `scripts/build.mjs` to use `release.json.scriptUrl` for production update/download URLs, with a stable-endpoint fallback for older manifests that omit that field, preserving the separate legacy runtime API endpoint.
- Strengthened `scripts/validate.mjs` to assert exact production and TEST update/download URLs.
- Added `.github/workflows/validate-pr.yml` for build/validation checks on future PRs to `master` and `develop`.
- Confirmed by deterministic template rendering that the corrected production substitutions match tracked `UpStatus.user.js` exactly (544,057 characters). The actual Node build/validator has not been executed here.
- Compared the deployed `upstatus` backend with the rendered server template after normalizing the embedded script block. Found live-only behaviors missing from the template (signed upload handler/routes, official-team member filtering, and Ricardo admin fallback) and template-only behaviors missing from live (server-authoritative guest-session history filtering and document filename persistence).
- Ported the live-only backend behaviors into `src/server/index.template.ts` on this branch while preserving the template-only guest-session and document metadata behavior. Added validation assertions for upload routes, member filtering, admin fallback, guest-session filtering, and document filename persistence. This is source reconciliation only; the Edge Function was not deployed.

### Immediate next steps
1. Review the draft PR and inspect the complete diff for unintended changes.
2. Get `node scripts/validate.mjs` to run on a clean runner and confirm it passes. The newly added PR workflow may only run automatically for later PRs until the workflow is merged into a base branch.
3. If validation passes, merge the safe build/validator fix into `master` only after review; no deployment is required for the code change itself.
4. Reconcile the `develop` line with stable fixes using an explicit, reviewable strategy rather than blindly merging the old branch.
5. Design independent parity checks and updater tests for `team-lite-official`, then separately investigate why its in-app update pop-up was not appearing.

### Validation feedback (2026-10-29)
- GitHub Actions ran the build and validator on PR merge commit `9d92d025ae7e213023babe200bb9705d8acea830`. The build completed, then validation failed at the broad assertion `!testUser.includes("/functions/v1/upstatus/upstatus.user.js")`. That check scanned the entire TEST userscript and could match unrelated embedded/runtime text, even though the TEST updater metadata was already checked exactly.
- Replaced that broad check with explicit negative assertions against only the TEST userscript's `@updateURL` and `@downloadURL` metadata. Fix commit: `aba5596ab9596ea57541720e3f5ecf48f210799b`.
- A new workflow result for the updated head has not yet been confirmed. Do not treat the validation as passing until the updated PR check completes successfully.
- The workflow build recreates generated output directories in its clean GitHub runner, so it does not risk local uncommitted/generated artifacts.

### Follow-up validation feedback (2026-10-29)
- The latest GitHub Actions logs showed the build succeeds, but the regression suite then failed on a stale emoji-picker assertion. The implementation now binds the outside-click handler per menu using `m.__upstatusEmojiButton`; the test incorrectly expected an older single-menu query (`currentMenu/currentBtn`).
- Updated `scripts/chat-regression.test.mjs` to assert the current per-menu ownership behavior instead of the obsolete implementation detail. Commit: `2012863d092f76ae13b179ad1340395eb978347d`.
- Removed the newly added duplicate `.github/workflows/validate-pr.yml`; the base `master` already has `.github/workflows/validate.yml` configured for both `pull_request` and pushes to `master`/ `develop`. This avoids running the same validation twice.
- The latest head needs a fresh CI run after these changes. Do not merge until the current head's validation is green and the backend template diff has been reviewed.

### Deployment state
- Production: not changed by this work.
- TEST: not changed by this work.
- Team Lite: not changed by this work.
