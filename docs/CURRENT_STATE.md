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

## Chat read-state and scroll investigation (2026-10-15)

- Tracking issue: https://github.com/Reekyi/UpStatus/issues/24
- Working branch: `fix/chat-read-scroll-root-cause-audit`, created from `develop` commit `7df829a5faf3d82eba27b854a4352258c0abbabf`. Current source changes are not merged.
- Scope: prevent already-read messages from reappearing as unread after reload/status changes, and ensure a rebuilt chat list actually renders before scrolling to the newest message.
- Confirmed render-cache gap in deployed TEST beta.7: the DOM-aware guard existed, but the render-key attribute was only assigned in the empty-history path, not after a normal non-empty render. The working branch now assigns the key after normal rendering. A second scroll race is addressed: `openChat()`'s force-bottom flag could be consumed while rendering cached messages before the fresh history response arrived; the branch now preserves a separate initial-scroll intent until fresh history is rendered, so media/layout callbacks retain bottom-scroll intent for the opening sequence. This source-path analysis is strong evidence, but Sale Smartly runtime confirmation is still pending.
- Read-state changes: full-history API now returns the persisted `lastReadAt`; the client uses this watermark and per-message `readBy` receipts to suppress notifications/unread increments for already-read messages. Server unread counts also honor per-message read receipts. Read-state database query failures now throw instead of silently treating read state as empty. Read API returns its persisted timestamp and client validates success before advancing its local watermark.
- Commits currently recorded on branch: `24077a18b459abd00166a425bcdf5579bd4110a0` (userscript), `57e93e1539311a3d984841a88f7675bf38a88d76` (server read watermark), `6c0d9a22d0a4da33614ddeb95a484641a576ed2a` (initial regression guards), `54f93a7214d3f95cd1bfe9c0f3b6e2e09bb95103` (surface read-state query failures), `cf5d675ff632b6ad3ffe076606f2f1d482b88118` (additional regression guards).
- Validation: GitHub Actions `UpStatus Validate` run #133 passed on head `9dfdfdf42ad8e3a1a8cd97c0947777abd890e451`, before the latest initial-scroll-intent patch. The run's `validate` job and `Validate build` step succeeded. A new CI run must be checked for the latest source commit. A local checkout test was not run. GitHub compare shows changes limited to the userscript template, server template, validation script, and this continuity document.
- TEST deployment: not performed. Before deployment, recheck the actual live TEST function version and payload. No production deployment or merge performed.
- Required manual verification in Sale Smartly: mark several messages read, reload with F5, change status, reopen chat, and confirm no old unread notifications return; open chat repeatedly and confirm newest messages are visible at the bottom. Also check that reading older history does not unexpectedly jump to the bottom during routine refresh.
- Draft PR #25: https://github.com/Reekyi/UpStatus/pull/25, base `develop`. Live TEST was rechecked: `upstatus-test` is ACTIVE version 65 serving `3.0.32-beta.7`, and its payload contains the earlier render guard but not the new persisted-read-watermark logic or initial-scroll-intent flag. Next action: re-check CI for the latest source commit, review the complete diff, then consider TEST-only deployment after verifying the generated artifact is isolated. Manual Sale Smartly behavior is mandatory before claiming resolution.

## Last updated

2026-10-15. Recorded chat read-state/scroll investigation, source-path scroll race, and prior CI run #133. The latest initial-scroll-intent patch still requires CI and Sale Smartly verification. Re-check live Supabase state before any TEST deployment or production action.
