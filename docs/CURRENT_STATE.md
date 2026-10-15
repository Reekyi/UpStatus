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
- No build/validation command or browser test has been run in a working checkout yet. GitHub file edits were verified by exact-match post-edit assertions in the editing script only; do not treat this as a successful project build or functional test.
- No PR opened yet. No deployment performed from this branch.

## Live runtime verified at restart

- Supabase project: `dlfvkawaiqduhlazsszm`.
- Production function `upstatus`: ACTIVE v395, source hash `6ae6ba4ec13059f1092acc0bad1296d6981eb7683a1ed3b7f116f71bdb1c9cf3`; left untouched.
- TEST function `upstatus-test`: ACTIVE v69, source hash `4b2446fff5b2bd3c49480bbf69b1f4a9bcbff281c3090c027e9fde8c875da366`; still running the prior beta.11 candidate pending validation of the clean 3.0.32-based fix.
- No production deployment, merge, database write, or chat-history deletion performed.

## Next action

1. Verify the final diff on `fix/chat-root-cause-3.0.32-clean`.
2. Run `node scripts/validate.mjs` and confirm the generated userscript/function artifacts; verify TEST endpoint/storage isolation.
3. Open a draft PR targeting `master` or the agreed stable integration target, and deploy only the generated TEST artifact if build validation succeeds.
4. Do not claim either bug fixed until the actual Sale Smartly browser behavior passes: opening chat lands at newest messages; already-read messages stay read after F5/status changes.
5. Production remains untouched unless separately authorized.
