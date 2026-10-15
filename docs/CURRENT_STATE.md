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
- Source/integration branch: `fix/chat-read-scroll-root-cause-audit`; TEST-specific branch based on the exact beta.7 source: `fix/chat-read-scroll-beta8`. TEST candidate PR #26: https://github.com/Reekyi/UpStatus/pull/26. Develop integration PR #25: https://github.com/Reekyi/UpStatus/pull/25.
- Validation: GitHub Actions `UpStatus Validate` run #138 passed on head `4af87299f8b777c3da4992986dca15ffc3dbe847` for the develop integration branch; the `validate` job and `Validate build` step completed successfully, including the initial-scroll-intent and read-watermark guards. The TEST-specific beta.8 branch uses the exact beta.7 baseline and includes an additional build change for Ycaro endpoint isolation; this feature-branch PR did not report a GitHub Actions run. Its generated TEST artifact was reconstructed and checked for exact embedded userscript equality, beta.8 version, TEST namespace/storage/topic/endpoint, no unresolved placeholders, read/scroll fixes, and Ycaro TEST endpoint isolation. Supabase accepted the deployment and marked the function ACTIVE.
- TEST deployment verified: `upstatus-test` is ACTIVE version 66 serving `3.0.32-beta.8`, hash `d459db6e6c4bcf08d5a6c9d2305ed4e352b273b532d8bb9aeba017f1875b19a1`. The deployed function was re-read and confirmed to include the persisted read watermark, initial-scroll intent, and Ycaro TEST endpoint; the embedded Ycaro page no longer points to the production function. Production `upstatus` remains ACTIVE version 395, hash `6ae6ba4ec13059f1092acc0bad1296d6981eb7683a1ed3b7f116f71bdb1c9cf3`. No production deploy, merge, database mutation, Vercel configuration change, or secret change.
- Required manual verification in Sale Smartly: mark several messages read, reload with F5, change status, reopen chat, and confirm no old unread notifications return; open chat repeatedly and confirm newest messages are visible at the bottom. Also check that reading older history does not unexpectedly jump to the bottom during routine refresh.
- Manual Sale Smartly verification is still pending: test F5, status changes, reopening chat, stale notifications, initial scroll-to-bottom with long history/media, and preservation of scroll when reading older messages. Do not claim the bugs resolved until this real-browser check passes. Next action: user verifies the deployed beta.8 in Sale Smartly; record outcomes in issue #24 and PR #26. Keep both PRs draft until the appropriate review/integration decision.

## Last updated

2026-10-15. Recorded source audit, beta.8 TEST deployment, production isolation, and successful `UpStatus Validate` run #138. Manual Sale Smartly verification remains pending. Re-check live Supabase state before further deployment or production action.
