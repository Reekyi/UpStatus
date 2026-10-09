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
- Initial inspection confirmed `lucca.html` exactly matches the HTML embedded in `src/server/index.template.ts`. The implementation now uses standalone Lucca/Ycaro HTML source files as build inputs and adds independent Ycaro auth/session handling. GitHub Actions `UpStatus Validate` run #91 passed for implementation commit `148b63ed4f985fb01742e685c93af38f53ec88f8`, logging `Built UpStatus 3.0.27 / TEST 3.0.27-beta.5` and `Validation OK: PROD 3.0.27 / TEST 3.0.27-beta.5`. This is automated build/validation, not a live login test.
- No Supabase secret or function deployment, Vercel deployment, or production resource has been changed. The new access will require `YCARO_PASSWORD` to be configured in Supabase before live login works.
- PR #17 is open against `develop`: https://github.com/Reekyi/UpStatus/pull/17. Its Vercel status check reported success for a preview, not production. Next steps: re-check latest PR status after this documentation checkpoint update, then wait for explicit approval before merge/deploy. Live Ycaro login also requires `YCARO_PASSWORD` configured as a Supabase function secret.

## Open items

- No known user-reported call bug is currently open; user said calls are working perfectly.
- Continuity documentation PR #13 was merged into `develop` as `b0f4bed3f635d6b6a68c1898286cd519907b632d`.
- Consider adding a link to these documents from README in a later small documentation change; the permanent prompt is already available in `docs/PROJECT_GUIDE.md`.
- Before any future WebRTC change, re-check current browser behavior and consider TURN only if real networks still fail.

## Bonfire note

Issue #16 tracks the Ycaro guest-access implementation on `feature/ycaro-guest-access`; PR #17 is open and unmerged. Re-read the guide and this file, then inspect Issue #16, PR #17, latest CI and deployment state before continuing. Validation run #91 passed on the implementation commit. Keep Lucca access and production runtime unchanged; configure `YCARO_PASSWORD` only through Supabase secrets after explicit authorization, and do not merge or deploy without explicit approval.

## Last updated

2026-10-09. Updated after validation run #91 passed and PR #17 was opened for Ycaro guest access. Issue #16 is the checkpoint. Re-check latest GitHub checks, Supabase, and Vercel state before continuing.
