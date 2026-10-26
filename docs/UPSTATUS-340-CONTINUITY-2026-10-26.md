# UpStatus 3.4.0 official release and production recovery

## Official release status

- Release: `3.4.0` (stable; `release.json` has an empty `preRelease`).
- GitHub PR #73: merged into `master`; merge commit `d8f05561e20e38fb7bc800d3c6dd6dc270bd3475`.
- Validation workflow: `UpStatus Validate` passed on the release branch head `a357ed02df2c79c69414a98a6866cc2e5f981b85` (run `40421235502`).
- Supabase project: `dlfvkawaiqduhlazsszm`.
- Production Edge Function: `upstatus`, deployment version `461`, `verify_jwt=false`.
- Production backend SHA-256: `c2fb8b953fbfc6486442db4c36801d0a4285b6975d1c3230de83859d28de98a0`.
- Production backend and embedded userscript both report version `3.4.0`; the embedded userscript exactly matches the rendered build artifact.
- Public production userscript: https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus/upstatus.user.js
- Test Edge Function: `upstatus-test`, deployment version `239`, serving version `3.4.0` in the test namespace.
- Public test userscript: https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus-test/upstatus.user.js

## Production safety snapshot

Before the 3.4.0 deployment, production was confirmed as version `3.3.1`, deployment `459`, with SHA-256 `12e0237c98957b203e5f0bdb3cd81aebf04916ae419836abd98446faabca390a`. That exact source remains recoverable from the five ordered parts in `docs/backups/production-upstatus-3.3.1-2026-10-26/`. Concatenate `index.ts.part-01.txt` through `index.ts.part-05.txt` in ascending order with no separator to reconstruct it.

## Compatibility correction included

The production userscript historically used the Realtime topic `upstatus-screen-share-live-3-1-1-beta8`. The initial 3.4.0 deployment briefly used the repository's former `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0` topic, which could prevent existing 3.3.1 clients from communicating with 3.4.0. This was corrected immediately in deployment `461`; the build now preserves the production topic and `scripts/validate.mjs` guards against changing it unintentionally.

## Features restored and preserved in 3.4.0

- Pending attachments and pre-send link previews.
- Stable in-message link cards and Google Docs/Sheets/Slides title hydration.
- Screen-sharing WebRTC handlers, UI panel, fullscreen viewer, and monitor indicator.
- Speaker-output mute control in voice rooms.
- Per-sender chat color palette and rendering.
- Message timestamps/read indicators and existing chat behavior.
- Role-based administrator message deletion and the existing backend authorization checks.

The stable production endpoint was fetched after deployment and returned the `3.4.0` userscript header and correct production update/download URLs. The built script passed JavaScript syntax parsing, and the live Edge Function was checked to confirm that its embedded script matched the rendered artifact.

## Follow-up

- Manually verify on Sale Smartly that chat link cards/tails, message timestamps and read ticks, screen sharing, speaker mute, and light/dark voice-room controls work in a real browser session.
- Keep production on `3.4.0` unless a concrete regression is confirmed. If one occurs, the original `3.3.1` backend source and deployment metadata above are available for recovery.
