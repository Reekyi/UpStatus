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
- At the time of initial implementation, no Supabase secret or function deployment had been changed. The user later reported configuring `YCARO_PASSWORD` in Supabase Dashboard; the connected toolset cannot independently list Edge Function secret names, so this remains user-reported rather than tool-verified.
- PR #17 is open against `develop`: https://github.com/Reekyi/UpStatus/pull/17. Its Vercel status check reported success for a preview, not production. GitHub Actions `UpStatus Validate` run #92 also passed for checkpoint commit `bf6118094b85e88843b6d4dee60764c5d4508bbf`, confirming build/validation after the documentation checkpoint update. Next: wait for explicit user approval before merge/deploy, and re-check the latest PR status before any integration. Live Ycaro login requires `YCARO_PASSWORD` configured as a Supabase function secret.

## Current publication request (2026-10-09)

- The user requested publication of the Ycaro guest access and provided a password in chat. Do not copy the password value into GitHub, source code, docs, logs, or deployment output.
- PR #17 remains open and unmerged. Implementation validation passed on commit `148b63ed4f985fb01742e685c93af38f53ec88f8` (Actions run #91); checkpoint validation also passed on `bf6118094b85e88843b6d4dee60764c5d4508bbf` (run #92). Latest recorded branch head before this note was `8c56cdc6c1d170f77bbf2ca4281bf57d9b78b1b9`.
- Secret status: the user reports setting `YCARO_PASSWORD` through the authorized Supabase Dashboard. Connected tools do not expose a safe secret-name listing action, so the presence cannot be independently verified without a dashboard check. No secret value must ever be copied to chat, GitHub, or logs.
- Before publication, recheck PR #17 and CI, and stop if any mismatch or unanticipated risk appears.

## Ycaro Vercel frontend publication (2026-10-09)

- User asked to use Vercel in the same manner as the Lucca portal.
- Created separate Vercel project `upstatus-ycaro` (ID `prj_7CS7CPFOKfw2tEoiqT0IevPutuRC`) and deployed the Ycaro HTML, avoiding changes to the existing `upstatus-lucca` project/root directory.
- Production alias https://upstatus-ycaro.vercel.app/ is assigned to deployment `dpl_5fZvs41hmBYe7aos7QL4ZmJimbrb` (READY); live fetch verified HTTP 200 and Ycaro page title.
- Updated `ycaro.html` on the feature branch in commit `8d00482d4b5756d7a7a9b1bc1b10dd844a2a06ec` to route API requests to the Supabase Edge Function base, matching the Lucca pattern. On 2026-10-09, final review found the Ycaro page did not persist/send its own bearer token while using `credentials: omit`; this was corrected in commit `40df2be4eaf52c2e8dd73236a966a314e2fac877` and explicit validation assertions were added in `989821359fbe678a8dade9e11b355f81af71e20a`.
- Important: this is only the frontend publication. The active Supabase production `upstatus` Edge Function remains version 393 and does not yet include Ycaro routes, and `YCARO_PASSWORD` is not configured. Login is therefore not yet functional; do not state otherwise.
- Connected Supabase tools have neither a secret-write action nor a safe secret-name listing action. User reports that `YCARO_PASSWORD` is configured. If a Dashboard check is required before deploy, confirm the name only, never the value.
- PR #17 remains open and unmerged. Check CI for the latest frontend-adjustment commit, then review/merge and deploy the Supabase production function only when explicitly authorized. No function deployment, secret change, PR merge, database mutation, or Lucca alias change was made.

## Production release safety finding (2026-10-09)

- Final release review found the feature branch is based on `develop` release `3.0.27-beta.5`, while `master` and the live production Edge Function source use stable `3.0.31`. The active production function is version 394 and has no Ycaro routes.
- Do not deploy generated output from the current feature branch directly to production: `scripts/build.mjs` would embed the older userscript/backend and risk downgrading existing production behavior.
- Vercel Git previews for the `upstatus-ycaro` project fail with `STATIC_BUILD_NO_OUT_DIR` because project settings expect a `public` output directory. The already-published production alias was deployed separately and remains READY; do not change its project settings without a scoped decision.
- Safe next path: merge the feature PR to `develop` only after required checks/review; then create a separate release branch from `master` and carefully port the Ycaro route/page/build/validation changes while preserving stable 3.0.31 functionality. Run source validation and verify the secret name in Dashboard before a production deploy.
- User explicitly authorized merging PR #17 and deploying production, but also instructed to stop if an unanticipated risk appears. No merge or production deployment was performed after this finding.
 
## Open items

- No known user-reported call bug is currently open; user said calls are working perfectly.
- Continuity documentation PR #13 was merged into `develop` as `b0f4bed3f635d6b6a68c1898286cd519907b632d`.
- Consider adding a link to these documents from README in a later small documentation change; the permanent prompt is already available in `docs/PROJECT_GUIDE.md`.
- Before any future WebRTC change, re-check current browser behavior and consider TURN only if real networks still fail.

## Bonfire note

Issue #16 tracks Ycaro guest access; PR #17 remains open and unmerged at last check. The separate Vercel frontend is live at https://upstatus-ycaro.vercel.app/ (deployment READY). Production Supabase `upstatus` was version 394 and still lacked Ycaro routes. The user reports `YCARO_PASSWORD` is configured, but connected tools cannot independently verify secret names. Final review caught and fixed a Ycaro bearer-token persistence bug in commit `40df2be4eaf52c2e8dd73236a966a314e2fac877`; validation assertions were added in `989821359fbe678a8dade9e11b355f81af71e20a`. Recheck CI, review current code, merge only with existing explicit approval, generate from `scripts/build.mjs`, deploy only the generated production function, then verify live version and login.

## Last updated

2026-10-09. Ycaro frontend is published separately to Vercel and verified READY. User reports `YCARO_PASSWORD` configured. Final review found and corrected the Ycaro bearer-token persistence issue; new validation assertions added. PR #17 remains open/unmerged at last check. Recheck final CI and review generated production source before merging/deploying; verify live backend and real login afterward.
