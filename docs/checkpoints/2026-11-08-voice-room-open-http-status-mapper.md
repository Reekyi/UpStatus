# Voice-room open HTTP status mapper — 2026-11-08

## Change

The /room/open handler in the production candidate and its isolated repository counterpart now call the same voiceRoomOpenResultStatus(result) helper. The helper is kept byte-identical in both function directories.

The mapper preserves the existing contract:
- Invalid logical ID/argument/attempt ID → HTTP 400.
- Unknown user → HTTP 404.
- Cancelled, unavailable, or ended membership → HTTP 410.
- Attempt conflict, already-active attempt, or full room → HTTP 409.
- Unknown or malformed RPC results → HTTP 500.

## Regression coverage

scripts/production-signal-source-parity.test.mjs now imports and executes the actual mapper modules from both function directories. It checks all documented statuses, the VOICE_ATTEMPT_ALREADY_ACTIVE conflict, malformed-result fail-closed behavior, route wiring, and byte parity between production and isolated sources.

The workflow path filters now include both mapper files and every source/config/migration input consumed by the parity test, so edits to those inputs cannot silently skip this guard.

## Validation boundary

This is an executable source-level HTTP status contract, not a live HTTP request to a deployed Edge Function. The isolated upstatus-signal-test runtime remains v32. No Supabase request, fixture, migration, or deployment was performed.

The PR must remain Draft pending exact-head CI and human review.
