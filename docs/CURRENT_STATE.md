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

## Stable Ycaro release preparation (2026-10-09)

- Created release branch `release/ycaro-3.0.32` from stable `master` commit `1e81a39d436b6e854a3e5172c0247a23e2f20ac5`, and opened draft PR #18 targeting `master`: https://github.com/Reekyi/UpStatus/pull/18.
- PR #18 bumps the stable version from `3.0.31` to `3.0.32`, adds `ycaro.html`, embeds it through the build script, and ports independent Ycaro login/session routes without replacing the stable Lucca implementation.
- The release branch preserves shared chat history: Ycaro login, logout, and expiry do not delete messages. The frontend sends/persists/clears its separate `upstatus_ycaro_token`.
- GitHub Actions `UpStatus Validate` run #100 passed for PR #18 head `5be9f8f2e5a2825aa1dc6fe3d26092f46bbb4d23`. The source preflight also confirmed the route, secret lookup, separate session, frontend token handling, and absence of Ycaro message deletion. This is not a live browser/login test.
- Vercel preview check `upstatus-ycaro` still fails with the known `STATIC_BUILD_NO_OUT_DIR` / missing `public` output directory configuration. Lucca's Vercel check passes. Do not change Vercel settings as part of this release; the corrected Ycaro HTML should be manually redeployed using the known manual-upload path after backend release approval.
- Production remains unchanged: Supabase Edge Function `upstatus` is ACTIVE version 394 and still serves backend version `3.0.31` without Ycaro routes. The live Ycaro Vercel alias still serves the older frontend and is not yet functional against production.
- The user reports setting `YCARO_PASSWORD` in the Supabase Dashboard, but the connected tools cannot verify secret names. Before deployment, confirm that the secret name exists in the Dashboard; never ask for or expose its value.
- PR #17 remains open against `develop`; its latest head `ec49a99c45068ff930a1ba62057c0fc0df913a1e` has a successful `UpStatus Validate` run, while its Ycaro Vercel preview check fails for the same project output-directory configuration.
- No PR was merged and no production function or frontend deployment was performed after the stable-version mismatch was discovered. Next step: review PR #18, verify the secret name in Dashboard, and only then follow the explicitly approved release sequence.

## Open items

- No known user-reported call bug is currently open; user said calls are working perfectly.
- Continuity documentation PR #13 was merged into `develop` as `b0f4bed3f635d6b6a68c1898286cd519907b632d`.
- Consider adding a link to these documents from README in a later small documentation change; the permanent prompt is already available in `docs/PROJECT_GUIDE.md`.
- Before any future WebRTC change, re-check current browser behavior and consider TURN only if real networks still fail.

## Bonfire note

The current chat is establishing durable continuity docs so a new chat can continue without rebuilding the whole conversation. The permanent prompt is in `docs/PROJECT_GUIDE.md`. The continuity docs are merged into `develop`. No production deployment was performed for this documentation-only change. At the start of the next task, read the guide and this file, then verify live repository and runtime state before implementation.

## Last updated

2026-10-09. Updated with the Ycaro stable-release preparation checkpoint. Re-check live GitHub, Supabase, and Vercel state before any merge or deployment.


## 2026-11-04 live continuation checkpoint

This section supersedes older PR/runtime snapshots above where they conflict. Re-verified against GitHub at 11:39-11:45 BRT:

- PR #74: open Draft, unmerged; branch `chore/continuity-foundation`, head originally `2219a1b297545f8e894aa39c2e3a70038903c0a7`. A new source-validation regression assertion was committed as `00a2fbede2eb2088921bd0c8ca4b07d7b8d59d1c` to verify that Normal and TEST restart the authenticated signaling transport when Realtime is restarted after an online event. UpStatus Validate run `41850211413` passed. Signaling Smoke run `41850210903` was still running at the last check; inspect it before claiming full CI success.
- PR #76: open Draft, unmerged; branch `team-lite/signaling-transport-candidate`, head `a3409dfe7b5ebb8a46073c086650a0d2f67ff44e`. Added a candidate-check assertion that Team Lite's online recovery restarts Realtime and recreates the authenticated signaling transport. A new workflow result for this exact head was not yet visible through the connected workflow-run lookup at the last check; verify before claiming pass.
- PR #75: open Draft, unmerged; branch `team-lite/3.4.31-guest-fixes`, head `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; prior Candidate Checks run `41674353127` passed.
- Created `UPSTATUS_HANDOFF.md` on branch `docs/continuity-handoff-2026-11-04`; draft PR #80 targets `develop`. This handoff is the concise source for a new chat.
- Updated issue #79 with comment `6633530331` linking the handoff and recording current PR/CI evidence.
- No application runtime code was changed in this checkpoint; only regression assertions and documentation. No merge, deployment, production migration, production flag, secret, or production resource was changed.

### Immediate next actions

1. Inspect completion and full job logs for Normal Signaling Smoke run `41850210903`.
2. Confirm CI for PR #76 exact head `a3409dfe7b5ebb8a46073c086650a0d2f67ff44e`; fix any assertion/CI failure and rerun only failed jobs when appropriate.
3. Continue core release closure using `UPSTATUS_HANDOFF.md`; do not repeat historical discovery. Physical Tampermonkey/network validation and production security/cutover approval remain separate gates.


### CI refresh — 2026-11-04 11:48 BRT

- Team Lite PR #76 exact head `a3409dfe7b5ebb8a46073c086650a0d2f67ff44e` passed Candidate Checks run `41850263270`; full job `126644365017` logs inspected. 86/86 authenticated integration checks passed; Chromium call/voice/screen WebRTC and three-member mesh passed; invitation/fanout, teardown, fixture cleanup, version/portal/session/updater checks passed. The new Team Lite reconnect transport assertion passed.
- Normal PR #74 exact head `00a2fbede2eb2088921bd0c8ca4b07d7b8d59d1c`: Validate run `41850211413` passed. Signaling Smoke run `41850210903` remained in progress during authenticated integration/browser tests at last check.
- No runtime code changed in these two commits; issue #78 remains open because CI does not simulate a physical outage through the full Tampermonkey userscript.
