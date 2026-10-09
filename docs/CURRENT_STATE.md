# UpStatus Current State

> This is a handoff snapshot, not a substitute for checking live state. Re-verify branches, PRs, checks, and deployments before acting.

## Verified baseline at documentation setup

- Repository: `Reekyi/UpStatus`.
- Release file on `master`: `release.json` reports version `3.0.31`, no prerelease suffix.
- README release policy: `master` is production/stable; `develop` is integration/TEST; normal feature branches and PRs target `develop`; production deployment is manual.
- Latest relevant merged change observed: PR #11, "Fix Lucca call controls and improve call startup reliability", merge commit `c509277911b862d8624310f4d0acff56bea98b8c`.
- Its release version follow-up PR #12 was merged as `1e81a39d436b6e854a3e5172c0247a23e2f20ac5`.
- Vercel status check for commit `c509277911b862d8624310f4d0acff56bea98b8c` reported success and its production deployment metadata showed READY, alias `upstatus-lucca.vercel.app`, production target.
- Supabase production Edge Function `upstatus` was deployed to ACTIVE version 393 with version `3.0.31` and the updated userscript embedded. The active function source was retrieved and checked to contain the userscript update.
- Latest Lucca call fixes: corrected microphone icon state, removed injected call controls from the top header, and waited for Supabase Realtime subscription before outgoing call startup, with a clear timeout message.
- User reported the Lucca calls were working "100%" after the previous fixes. This is user-reported real-world success, not a universal connectivity guarantee.

## Known architectural constraints

- Lucca portal: `lucca-site/index.html`, served by Vercel project `upstatus-lucca`.
- Userscript source: `src/userscript/upstatus.user.template.js`.
- Supabase function source template: `src/server/index.template.ts`.
- Build/version authority: `release.json` and `scripts/build.mjs`; validation: `scripts/validate.mjs`.
- Supabase project ID: `dlfvkawaiqduhlazsszm`.
- Production function slug: `upstatus`; TEST function slug: `upstatus-test`.
- Do not print or store credentials/secrets in this file.
- README specifies feature PRs to `develop`, separate TEST identifiers and manual production deployment. Confirm the current release strategy before making future production changes.

## Current documentation task (2026-10-09)

- GitHub Issue #14 tracks the mandatory pre-work plan and resumable checkpoint protocol: https://github.com/Reekyi/UpStatus/issues/14.
- Working branch: `docs/work-plan-checkpoint-protocol`, created from `develop` after registering the issue and before editing documentation.
- Updated `docs/PROJECT_GUIDE.md` to require a GitHub Issue/checkpoint before code or documentation edits, milestone updates during execution, interruption-safe handoff notes, and linking the PR/status in the task record.
- Updated the permanent new-chat prompt in `docs/PROJECT_GUIDE.md` to enforce the same process and wait for the user's task request after summarizing verified state.
- Documentation-only task. No application code, production resources, Supabase functions, or Vercel deployments changed. Runtime tests are not applicable; final document review and PR status remain to be checked.
- Next action: review both files on the working branch, open a PR to `develop`, then update this section and Issue #14 with the PR URL and actual validation/status. Do not merge without explicit approval.

## Open items

- No known user-reported call bug is currently open; user said calls are working perfectly.
- Continuity documentation PR #13 was merged into `develop` as `b0f4bed3f635d6b6a68c1898286cd519907b632d`.
- Consider adding a link to these documents from README in a later small documentation change; the permanent prompt is already available in `docs/PROJECT_GUIDE.md`.
- Before any future WebRTC change, re-check current browser behavior and consider TURN only if real networks still fail.

## Bonfire note

The current task is updating the permanent workflow so no implementation starts before its plan is recorded on GitHub. Issue #14 is the active checkpoint; working branch is `docs/work-plan-checkpoint-protocol`. The guide and prompt have been updated on the working branch; review and PR creation are still pending. No production deployment has been performed. If this chat is interrupted, open Issue #14, inspect branch `docs/work-plan-checkpoint-protocol`, review the latest commits and these docs, then continue with document review and PR creation. Do not merge without explicit approval.

## Last updated

2026-10-09. Updated on the documentation task branch for Issue #14; PR and final review pending. Re-check live GitHub, Supabase, and Vercel state before any implementation.
