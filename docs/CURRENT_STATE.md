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


## Chat reliability beta.9 investigation (2026-10-15)

- User retested TEST beta.8 in Sale Smartly: already-read messages FAIL; read state after status change FAIL; opening chat FAIL; manual scrolling PASS; genuinely new message notification FAIL. These manual cases remain unverified after any new changes.
- Confirmed live TEST before correction: Supabase Edge Function `upstatus-test` ACTIVE v66, version `3.0.32-beta.8`; production `upstatus` ACTIVE v395 and unchanged.
- Investigation found a client guard in `loadChat()` that returned early whenever Realtime was subscribed and chat cache was initialized. The userscript also calls `loadChat()` periodically, so this disabled the HTTP incremental fallback precisely when Realtime appeared connected. That made fresh messages depend on broadcasts arriving on the exact same topic/client version.
- Beta.9 candidate branch: `fix/chat-reliability-beta9`, based on the exact beta.8 TEST source branch. Candidate changes: restore incremental HTTP polling even when Realtime is subscribed; force a full history/read-state refresh at least every 30 seconds; queue forced history reloads if another request is in flight; serialize read-receipt writes to avoid overlapping upserts; normalize member-name comparisons for read receipts.
- Regression assertions were added to scripts/validate.mjs. The generated PROD/TEST artifacts were reconstructed in-memory from the current build replacement map and the repository's validation assertions were executed against them; all assertions passed, including generated userscript syntax and TEST endpoint isolation. A native local Node run and GitHub Actions run were not confirmed; the TypeScript server template was not separately type-checked.
- Production remains unchanged. Do not merge or deploy production. Do not mark any reported manual failure as resolved until a fresh Sale Smartly retest passes.
- Validation passed in-memory; beta.9 is now deployed to TEST as recorded below. Next action: collect fresh Sale Smartly results; do not mark any failed manual case resolved until it passes.


## Beta.9 TEST deployment checkpoint (2026-10-15)

- Deployed candidate 3.0.32-beta.9 to Supabase Edge Function upstatus-test, now ACTIVE version 67, hash b5279c10af0e5f53a7329caf413d419cd1561b3fe10b442b34a62e283d2f1aff.
- Re-read the live TEST function and decoded its embedded userscript. Verified version 3.0.32-beta.9, HTTP fallback polling, forced-load queuing, serialized read receipts, case-normalized read handling, and TEST endpoint isolation.
- Production function upstatus remains ACTIVE version 395 with unchanged hash 6ae6ba4ec13059f1092acc0bad1296d6981eb7683a1ed3b7f116f71bdb1c9cf3.
- Deployment/runtime source verification is complete, but no Sale Smartly browser retest has occurred. Keep all previously failed manual cases open and unverified.
- TEST PR: https://github.com/Reekyi/UpStatus/pull/27. Do not merge or deploy production without explicit authorization.

## Beta.9 Sale Smartly retest failed; runtime evidence collected (2026-10-15)

- User retest after TEST deployment: messages already read after refresh FAIL; changing status reintroduces old unread messages FAIL; opening chat/newest position FAIL; manual scrolling PASS; new-message notification FAIL. None of the failed behaviors is resolved.
- Confirmed deployed TEST function remains ACTIVE v67 (`3.0.32-beta.9`, hash `b5279c10af0e5f53a7329caf413d419cd1561b3fe10b442b34a62e283d2f1aff`). Production remains ACTIVE v395 with unchanged hash `6ae6ba4ec13059f1092acc0bad1296d6981eb7683a1ed3b7f116f71bdb1c9cf3`.
- Runtime confirms Ricardo's client is reporting `3.0.32-beta.9` to TEST. The `public.chat_reads` row for Ricardo still has `last_read_at=2026-10-13 13:58:40.795+00`, so the read watermark was not updated during the reported retest.
- TEST function logs from 2026-10-15 15:20Z through 15:45Z show frequent successful GET `/api/chat` and `/api/status` requests (HTTP 200), but no POST `/api/chat/read` and no POST `/api/chat` in that interval. This means the read-marking route was not reached during the observed window; the evidence does not indicate a server-side read-route rejection.
- There were 35 messages in the shared database during the prior 48h, with newest at `2026-10-15 15:18:14.917+00`. No new chat message was inserted during the observed 15:20Z-15:45Z test window, so the new-message-notification test was not exercised by a newly persisted message during that window. Repeat that case only after sending a message after the script has initialized and while the chat is closed.
- Source inspection: `markVisibleChatRead()` is called after a successful `/api/chat` load only when the chat element is not `.hidden`; it filters out own/system messages before POSTing. Since logs show no read POST while polling succeeds, next diagnostic must determine whether the chat visibility gate or eligible message list is empty, or whether the test window did not overlap a true chat-open/read action. Do not assume a server failure.
- Current diagnosis: beta.9 polling is active and the server responds successfully; the remaining issue is likely in the client-side path that decides when to mark messages read, plus notification test timing. Chat opening/scroll still fails despite the intended forced-load queue, so inspect actual client render/scroll state separately. No further code change or deployment made after the beta.9 retest.
- Next action: add narrowly scoped diagnostics (or capture browser console) for `openChat`, successful full history payload count, `chat.classList.contains('hidden')`, eligible message IDs, POST `/api/chat/read` success/error, and new-message notification gates. Then make a source-first patch based on those observations and redeploy only to TEST after validation. Production remains untouched.


## Chat diagnostics beta.10 (2026-10-15)

- After beta.9 retest, the user confirmed four failures and one pass; none of the failures are considered resolved.
- Added client-side diagnostics in `src/userscript/upstatus.user.template.js`: `load-start`, `load-success`, `load-error`, `read-gate-blocked`, `read-candidate`, `read-post-start/success/error`, `notification-candidate`, `open-start`, `scroll-scheduled/final`. Logs contain counts, gates, IDs and outcomes only; no message bodies or auth tokens, and current member identity is not emitted by the diagnostic wrapper.
- `release.json` now selects TEST version `3.0.32-beta.10`. This is a diagnostic candidate, not a fix claim.
- Generated TEST userscript was constructed in memory from the source/build substitutions; syntax compilation passed, placeholders were fully resolved, TEST endpoint/version isolation passed, and expected diagnostic events were present. The repository's native `node scripts/validate.mjs` and GitHub Actions have not run in this environment. The server TypeScript template still needs a generated artifact check before deployment.
- Current TEST runtime was last verified as `upstatus-test` ACTIVE v67 beta.9; production remains `upstatus` ACTIVE v395 unchanged. No beta.10 deployment has occurred yet.
- Next: assemble the generated TEST function from templates, check embedded userscript/version/path isolation and function source shape, then deploy only `upstatus-test` if preflight passes. Capture fresh runtime version/hash and ask for a controlled Sale Smartly retest. Do not merge or deploy production.


## beta.10 TEST deployment checkpoint (2026-10-15)

- Deployed generated `3.0.32-beta.10` function source to Supabase `upstatus-test` only. Active version is 68; runtime hash `f4064a7ce829cca4e19dffb175f9122a888cca2f4382b5c07227f92526bc7119`.
- Retrieved active function source after deployment and decoded its embedded userscript. Confirmed embedded userscript metadata version `3.0.32-beta.10`, expected diagnostic events, TEST update endpoint and route marker. Embedded script is 260,095 UTF-8 bytes. The public script URL could not be verified through the web retrieval tool, so only the active source/embedded payload is confirmed.
- Production remains `upstatus` ACTIVE v395, unchanged hash `6ae6ba4ec13059f1092acc0bad1296d6981eb7683a1ed3b7f116f71bdb1c9cf3`. No production deployment, merge, or database write occurred.
- The deployed beta.10 is diagnostic only. All four failed manual cases remain unresolved; manual scrolling remains the only reported pass. Next: ensure the TEST userscript is updated in Tampermonkey, open Sale Smartly DevTools Console, filter `UpStatus ChatDiag`, then reproduce one read-state failure and one new-message notification failure with controlled steps. Capture the event sequence without message content. After collecting evidence, implement a root-cause fix and retest all five cases.


## beta.11 focused chat fix deployed to TEST (2026-10-15)

- Fresh source review isolated changes to chat open-scroll/read-watermark behavior and server read-state identity handling.
- Client now keeps bottom-scroll intent through cached/fresh renders, resolves the current list node during each scheduled scroll, targets the last rendered child, and retries through 450 ms after layout.
- On successful history load while the chat is open, the client forces the read-watermark POST even if its cache contains no eligible IDs. The server accepts that as a valid "all current history read" watermark update, resolves existing read rows case-insensitively, preserves the canonical existing username key, and normalizes own-message comparisons.
- Regression assertions were added to `scripts/validate.mjs`. Generated TEST userscript syntax compiled in memory; TEST function placeholders/version/route and embedded userscript matched exactly. Native `node scripts/validate.mjs`, GitHub Actions, and independent server TypeScript type-check remain unconfirmed.
- Deployed only to `upstatus-test`: ACTIVE v69, hash `4b2446fff5b2bd3c49480bbf69b1f4a9bcbff281c3090c027e9fde8c875da366`. Retrieved active source and decoded embedded userscript; beta.11 markers and TEST endpoint were verified.
- Production `upstatus` remains ACTIVE v395, unchanged hash `6ae6ba4ec13059f1092acc0bad1296d6981eb7683a1ed3b7f116f71bdb1c9cf3`. No merge, production deployment, or database write.
- Status: source-level fix deployed to TEST; real Sale Smartly browser behavior is still unverified. The user should only need to update/reload the TEST userscript and check two behaviors: opening the chat lands at newest messages; after reading and closing, F5/status changes do not restore old unread counts. If either still fails, retain beta.11 diagnostics and inspect the captured event sequence before further edits.
