# UpStatus Current State

## Clean chat-fix restart (2026-10-15)

- User requested abandoning the beta fix line and restarting from the standard non-prerelease release.
- Source baseline: repository `master`, `release.json` version `3.0.32`, empty `preRelease`. This is the stable source baseline, not a statement that the live production runtime already runs 3.0.32.
- Work branch: `fix/chat-root-cause-3.0.32-clean`, created from `master`.
- Fresh source inspection identified two concrete issues in `src/userscript/upstatus.user.template.js`:
  1. Successful visible-chat history refresh only called `markVisibleChatRead()` when the message data key changed. If the same history was returned, the client skipped persisting the read watermark.
  2. `renderChat()` used the global `chatLastRenderKey` as its sole render-cache guard even though `openChat()` replaces the DOM. A newly created list could therefore be mistaken for an already-rendered list.
- Minimal source changes made on the clean branch:
  - Validate the render key against the actual current `.up-chat-list` element.
  - Tag the current list with its render key, including the empty-history case.
  - Request rendering when the current DOM list has not rendered the current cache, even if the message cache itself is unchanged.
  - Run the read-receipt path after every successful visible-chat history load, independently of whether message content changed.
  - Add focused static regression assertions to `scripts/validate.mjs`.
- No changes to database schema/history, messages, calls, status behavior, guest portals, or release version metadata.
- GitHub Actions `UpStatus Validate` run #153 built the artifacts and passed the userscript syntax checks plus the new chat regression assertions, then failed at the existing assertion `Ycaro orange theme missing` in `scripts/validate.mjs` line 72. The branch does not change `ycaro.html` or that existing assertion; this unrelated baseline mismatch blocks a green full validation run and has not been changed to avoid scope creep.
- In-memory build-equivalent checks passed for stable version, no unresolved placeholders, PROD/TEST namespaces and update URLs, path markers, embedded userscript equality, userscript syntax, Lucca inline script syntax, Ycaro HTML embedding, and both chat regression conditions. This is not a substitute for the native validation script finishing successfully or a browser test.
- Draft PR #29: https://github.com/Reekyi/UpStatus/pull/29, targeting `master`; not merged.
- TEST deployment performed from this clean stable 3.0.32 source: `upstatus-test` ACTIVE v70, hash `e2bdffd5a9c5b353d0313469f56655feb35f3488b7da4d1cba0a48957ab8b705`. Re-read the active function and verified stable version `3.0.32`, TEST route marker, TEST namespace/update URL, embedded userscript, and both chat changes. Production remains untouched.

## Live runtime verified at restart

- Supabase project: `dlfvkawaiqduhlazsszm`.
- Production function `upstatus`: ACTIVE v395, source hash `6ae6ba4ec13059f1092acc0bad1296d6981eb7683a1ed3b7f116f71bdb1c9cf3`; left untouched.
- TEST function `upstatus-test`: ACTIVE v69, source hash `4b2446fff5b2bd3c49480bbf69b1f4a9bcbff281c3090c027e9fde8c875da366`; still running the prior beta.11 candidate pending validation of the clean 3.0.32-based fix.
- No production deployment, merge, database write, or chat-history deletion performed.

## Next action

1. Resolve the existing Ycaro theme assertion only if separately approved; it is outside the requested chat scope. Until then, keep the CI failure clearly attributed and do not claim full validation passed.
2. Ask the user to test the currently deployed TEST script in Sale Smartly: open chat at newest messages, then read messages and use F5/status change to confirm old unread counts do not return.
3. Investigate only a reported failing behavior, using the fresh stable 3.0.32 source as the reference. Do not continue beta.11 work or expand scope.
4. Production remains untouched unless separately authorized.


## Follow-up after beta test failure: focused 3.0.32 correction (2026-10-15)

- User confirmed both behaviors still failed on TEST v70: stale unread notifications appeared on Sale Smartly startup, and chat opened at the top showing messages from about two days earlier.
- Fresh runtime evidence: `public.chat_reads` for Ricardo still had `last_read_at = 2026-10-13 13:58:40.795+00`; 33 non-Ricardo messages in the last three days were newer than that watermark. Function logs for TEST v70 showed GET `/api/chat` returning 200 but no POST `/api/chat/read` during the observed test period. This confirms the read receipt was not reaching the server, rather than merely a badge-rendering issue.
- Two additional minimal fixes on this same clean stable branch:
  1. `markVisibleChatRead()` now sends the read-watermark POST even when the local message cache is empty. The server's existing read route updates `last_read_at` unconditionally and accepts an empty ID list; message receipt broadcasts remain limited to actual message IDs. Deduplication only applies to non-empty ID lists.
  2. `openChat()` sets `chatForceScrollBottom=true` before rendering cached history, so `renderChat()` uses its existing forced-bottom path during opening.
- Added static regression assertions for both exact behaviors.
- TEST deployed from stable 3.0.32 source: `upstatus-test` ACTIVE v71, hash `eb63db2091d3361a8a7b76bcb3a0988f60fe8b7c164c2e33f648a1ebf623f084`. Re-read active function confirms version, TEST route, TEST namespace/update URL, embedded payload, empty-cache read POST, and forced-bottom-on-open.
- In-memory generated artifact checks all passed: production/test userscript syntax, placeholders, endpoint isolation, path markers, embedded payload equality, Lucca inline syntax, and Ycaro HTML embedding.
- GitHub Actions full validation still fails at the unrelated pre-existing `Ycaro orange theme missing` assertion (`scripts/validate.mjs:72`). Do not claim full validation passed.
- Production remains ACTIVE v395 with hash `6ae6ba4ec13059f1092acc0bad1296d6981eb7683a1ed3b7f116f71bdb1c9cf3`, untouched. No DB writes or message deletions were performed.
- Await user browser confirmation on v71. Expected first successful open may clear the accumulated stale count by writing the current watermark; after that, F5/status changes should not restore the same old messages.
