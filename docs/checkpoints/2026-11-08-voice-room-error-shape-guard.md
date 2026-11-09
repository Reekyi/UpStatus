# Voice-room RPC error-shape guard — 2026-11-08

## Finding

The executable `voiceRoomOpenResultStatus(result)` mapper previously coerced `result.error` with `String(...)`. The `/room/open` route independently repeated that coercion when building the response body.

A malformed RPC result such as `{ error: { toString: "ROOM_FULL" } }` can make JavaScript string coercion throw instead of returning the mapper's documented fail-closed HTTP 500 response. Non-string values could also be accepted through coercion if their string representation happened to match a known status key.

## Change

- Require an own `error` property whose value is a non-empty string before mapping.
- Look up the exact string in the `Map`; do not coerce unknown values.
- Make both production and isolated `/room/open` routes detect an own error field and use a safe fallback code for malformed values.
- Keep the production and isolated helper modules byte-identical.
- Extend the parity regression with numeric, boolean, array, object, empty-string, and inherited-error cases.
- Extend the workflow path/branch filters to cover this candidate.

## Validation boundary

This candidate is validated by offline source parity plus the full Normal Validate workflow. It is not a live HTTP request to an Edge Function. No Supabase request, fixture, migration, deployment, or production operation is part of this change.

Keep Draft pending exact-head CI and human review.
