# Authenticated call-source boundary regression

Date: 2026-11-08

## Finding

The authenticated-signaling clients previously used the payload-controlled `_authenticatedTransport: true` property as proof that a call signal came from the server-mediated polling path. A public Realtime sender could supply that same property in its JSON payload, so the property was not a trustworthy provenance boundary.

The public-discovery exception also accepts an `ended` hint. The current client publishes it only to remove a call-directory entry; the `ended` handler does not terminate an active call. `join_declined` is not a public discovery event and must not be accepted from that channel.

## Candidate correction

- Trusted provenance is now an explicit second argument to `receiveCallSignal(payload, authenticatedSource)`.
- Only the authenticated room poller and authenticated invitation poller pass `true`.
- The public Realtime listener always passes `false`.
- The payload no longer carries or controls an internal authenticated marker.
- A shared own-property allowlist accepts only `type: "presence"` or `type: "ended"` with `discoveryOnly: true`.
- The public `ended` path is constrained to deleting a directory entry; it cannot close or mutate an active call.
- Public `join_declined`, offer, answer and ICE messages are rejected when authenticated signaling is enabled.

## Validation

- `scripts/signaling-transport.test.mjs` tests positive/negative allowlist cases, including inherited-property rejection.
- `scripts/public-call-discovery-guard.test.mjs normal` checks the Normal call-site provenance, exact discovery event types, and directory-only ended handling.
- Full Normal Validate is wired to execute both tests.
- No Supabase endpoint, secret, fixture, or network call is used by these regressions.

## Residual boundary

Public presence and ended remain untrusted discovery hints. Presence can still create misleading call-directory entries, and ended can hide an entry; neither grants room membership or authorizes call-control events. Removing these public hints entirely requires replacing call-directory discovery with an authenticated server-side query as part of the coordinated Realtime cutover.

No production change, migration, deploy, merge, release, or userscript publication was performed.
