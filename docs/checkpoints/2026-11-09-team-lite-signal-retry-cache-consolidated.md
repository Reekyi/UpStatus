# Team Lite authenticated signaling idempotency and retry cache — 2026-11-09

## Consolidated candidate

- Base branch: `fix/team-lite-authenticated-call-source-guard-20261108` at exact inspected HEAD `de2c6a92154ece2f8a313d2bafedf02170bb5f5a`.
- Supersedes the stacked Draft history in #111/#121 for integration review; neither historical PR is merged or closed by this candidate.
- Normal reference: Draft #120 exact code HEAD `086bc543e33f4c0a416b0453b5714f60d9e3f894`.
- Team Lite userscript remains version 3.4.31 in this candidate; no release version bump or publication.

## Behavior

- Generate secure 128-bit idempotency keys for authenticated request-invite, unicast signal, and room broadcast operations.
- Retain the original key and exact request body across ambiguous failures and HTTP 408/425/429/5xx; perform at most one bounded automatic retry.
- Respect Retry-After up to the automatic retry limit and retain a not-before deadline for later caller retries, returning local `SIGNAL_RETRY_DEFERRED` without sending early.
- Coalesce identical in-flight operations, retain pending keys for 2h5m, cap at 256 entries, and fail closed rather than silently evict a pending implicit key.
- Resolve an explicit retry to an implicit pending entry only when `error.idempotencyKey` exactly matches; replay the original body and keep a different explicit key as a distinct operation.
- Keep operation IDs local-only and preserve existing Team Lite endpoints and default-disabled authenticated-signaling flag.

## Validation

- Shared `scripts/signaling-transport.test.mjs` contains retry-key, exact-body, Retry-After, explicit-key lookup, mismatched-key isolation, concurrency, expiry, cache-capacity and broadcast regression coverage.
- `scripts/team-lite-candidate-check.mjs` requires exact shared-source / embedded-bundle parity and asserts retry-cache, explicit-key and Retry-After behavior.
- The offline Team Lite Authenticated Call Source Guard is the safe CI gate. The fixture-mutating full Candidate Checks and live HTTP/browser/WebRTC tests are not dispatched against the shared lab without an explicit QA-authorized window.
- No local checkout was available for an independent local Node run; report exact GitHub Actions results only after they complete.

## Boundaries

- Cache is in-memory per transport instance; it does not survive reload/recreation.
- No stable operation IDs were added to call sites; per-event identity/supersession semantics remain under review.
- No server-verifiable fresh-key anti-replay, durable outbox, migration, fixture mutation, function deployment, flag change, merge, release or userscript publication is part of this candidate.