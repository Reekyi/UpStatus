# Voice-room open HTTP 409 route contract — 2026-11-08

## Finding and correction

The current production signaling candidate already maps `VOICE_ATTEMPT_ALREADY_ACTIVE` to HTTP 409 inside the actual `/room/open` route. The remaining gap was regression coverage: the parity test checked function/source consistency and membership/rate-limit wiring, but did not assert that the route's inline result-error mapping retained this specific conflict code.

Added a route-scoped assertion to `scripts/production-signal-source-parity.test.mjs`:

- Extracts the bounded `/room/open` block from both production and isolated handlers.
- Requires the attempt RPC call to remain wired in that route.
- Requires `VOICE_ATTEMPT_CONFLICT`, `VOICE_ATTEMPT_ALREADY_ACTIVE`, and `ROOM_FULL` to map to HTTP 409.
- Requires the route to pass the checked status into its HTTP response.

A dedicated offline workflow now runs this route contract and the full Normal Validate on the child branch and on PRs targeting the Normal provenance candidate.

## Validation boundary

This is an offline source/route-wiring regression, not a live HTTP request to a deployed Edge Function. The isolated runtime remains v32 and was not deployed or modified. A real HTTP 409 test against an updated isolated runtime remains a separate gate.

No database operation, fixture, secret, deployment, workflow dispatch, merge, release, or userscript publication was performed.
