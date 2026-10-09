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

## Current implementation task (2026-10-09)

- GitHub checkpoint: Issue #16, "Add independent Ycaro guest chat access with orange theme": https://github.com/Reekyi/UpStatus/issues/16.
- Working branch: `feature/ycaro-guest-access`, created from `develop` HEAD `6494a3d3018a4141ea2503dda012374517028979`.
- Scope: add an independent Ycaro guest portal with orange highlights and a 🗿 favicon, independent `ycaro_session` cookie/state, and `YCARO_PASSWORD` configuration; preserve Lucca access and shared chat data.
- Initial inspection confirmed `lucca.html` exactly matches the HTML embedded in `src/server/index.template.ts`. The implementation now uses standalone Lucca/Ycaro HTML source files as build inputs and adds independent Ycaro auth/session handling. Source-level preflight checks passed; build and CI validation remain pending.
- No Supabase secret or function deployment, Vercel deployment, or production resource has been changed. The new access will require `YCARO_PASSWORD` to be configured in Supabase before live login works.
- Next steps: finish diff review, run `npm run validate` and `npm run build` where possible, inspect CI, open a PR against `develop`, and wait for explicit approval before merge/deploy.

## Open items

- No known user-reported call bug is currently open; user said calls are working perfectly.
- Continuity documentation PR #13 was merged into `develop` as `b0f4bed3f635d6b6a68c1898286cd519907b632d`.
- Consider adding a link to these documents from README in a later small documentation change; the permanent prompt is already available in `docs/PROJECT_GUIDE.md`.
- Before any future WebRTC change, re-check current browser behavior and consider TURN only if real networks still fail.

## Bonfire note

Issue #16 tracks the Ycaro guest-access implementation on `feature/ycaro-guest-access`. Re-read the guide and this file, then inspect Issue #16, the branch's latest commit, validation results, and PR/deployment state before continuing. Keep the Lucca access and production runtime unchanged; configure `YCARO_PASSWORD` only through Supabase secrets after explicit authorization, and do not merge or deploy without explicit approval.

## Last updated

2026-10-09. Updated for the in-progress Ycaro guest-access task on `feature/ycaro-guest-access`; Issue #16 is the checkpoint. Re-check live GitHub, Supabase, and Vercel state before continuing.
