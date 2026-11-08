# Authenticated call-source boundary regression

Date: 2026-11-08

## Finding

The authenticated-signaling clients previously used a payload property, `_authenticatedTransport: true`, as proof that a call signal came from the server-mediated polling path. A public Realtime sender could supply that same property in its JSON payload, so the property was not a trustworthy provenance boundary.

The same guard also treated public `ended` and `join_declined` messages marked `discoveryOnly` as acceptable. The only current public discovery publisher is `callPublishPresence()`; it emits a presence hint, not call-control events.

## Candidate correction

- Trusted provenance is now an explicit second argument to `receiveCallSignal(payload, authenticatedSource)`.
- Only the authenticated room poller and authenticated invitation poller pass `true`.
- The public Realtime listener always passes `false`.
- The payload no longer carries or controls an internal authenticated marker.
- A shared `isAllowedPublicCallDiscoverySignal()` allowlist accepts only an own-property `type: "presence"` plus `discoveryOnly: true`.
- Public `ended`, `join_declined`, offer, answer and ICE messages are rejected when authenticated signaling is enabled.

## Validation

- `scripts/signaling-transport.test.mjs` tests the public-discovery allowlist, including inherited-property rejection.
- `scripts/public-call-discovery-guard.test.mjs normal` checks the Normal caller provenance and public listener wiring.
- Full Normal Validate is wired to execute both tests.
- No Supabase endpoint, secret, fixture, or network call is used by these regressions.

## Residual boundary

Public presence remains an untrusted discovery hint and can still create misleading call-directory entries. It does not grant room membership or authorize call-control events; those require the authenticated server-mediated endpoint. Replacing public discovery itself remains part of the coordinated Realtime cutover.

No production change, migration, deploy, merge, release, or userscript publication was performed.
