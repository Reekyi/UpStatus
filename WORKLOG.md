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
- The source template `src/userscript/upstatus.user.template.js` is approximately 544 KB. **A mismatch was confirmed:** tracked `UpStatus.user.js` is 544,057 characters and points update/download URLs at `/functions/v1/upstatus/upstatus.user.js`; rendering the template with current `scripts/build.mjs` substitutions produces 544,109 characters and points them at `/functions/v1/upstatus-screen-share-3-1-1-beta10/upstatus.user.js`. First mismatch is in the header. Do not run build/validate until the intended route is confirmed and the mismatch is resolved.
- The production deployment workflow is manual and contains a guard that currently allows only stable version `3.4.7`.
- The TEST deployment workflow is also manual and deploys only `upstatus-test`.
- The Team Lite release manifest and script are on a separate branch. Team Lite deployment behavior has not yet been independently verified.

### Changes made so far
- No runtime code, script, manifest, release version, or deployment has been changed.
- Compared the current production artifact with the actual substitutions in `scripts/build.mjs`; found an update/download URL mismatch at character 517. The build was not run.
- A documentation-only branch named `chore/continuity-foundation` was created from `master`.
- This branch is intended for the first reviewable documentation patch; production branch remains untouched.

### Immediate next steps
1. Review the draft PR and inspect the complete diff for unintended changes.
2. Get the PR validation workflow to run and confirm `node scripts/validate.mjs` passes on a clean runner.
3. If validation passes, merge the safe build/validator fix into `master` only after review; no deployment is required for the code change itself.
4. Reconcile the `develop` line with stable fixes using an explicit, reviewable strategy rather than blindly merging the old branch.
5. Design independent parity checks and updater tests for `team-lite-official`, then separately investigate why its in-app update pop-up was not appearing.

### Deployment state
- Production: not changed by this work.
- TEST: not changed by this work.
- Team Lite: not changed by this work.
