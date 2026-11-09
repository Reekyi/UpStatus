# Team Lite signaling retry-cache parity — 2026-11-09

## Candidate

- Parent Draft PR: #111, branch `feat/team-lite-signal-event-idempotency-20261109`, inspected HEAD `d65c3a6e42b5adba4303fcd510747839eca25b20`.
- Normal reference: Draft PR #120, branch `fix/normal-signal-explicit-retry-key-lookup-20261109`, exact code HEAD `086bc543e33f4c0a416b0453b5714f60d9e3f894`.
- This candidate ports the reviewed Normal retry-cache contract to Team Lite without changing the Team Lite release version or publishing the userscript.

## Behavior ported

- Retain the original 128-bit idempotency key and exact request body after ambiguous failures, HTTP 408/425/429 and 5xx.
- Perform at most one bounded automatic retry and honor Retry-After up to the configured automatic-retry limit.
- Retain long Retry-After not-before deadlines for later caller retries; return local `SIGNAL_RETRY_DEFERRED` without issuing an early HTTP request.
- Coalesce concurrent identical operations, expire pending keys after 2h5m, cap the cache at 256 entries, and fail closed rather than evict a pending implicit key.
- Resolve an explicit retry to an implicit pending entry only when the supplied `error.idempotencyKey` exactly matches that entry; replay the original body and preserve a different explicit key as a distinct operation.
- Keep `operationId` local-only and preserve the existing Team Lite signaling endpoints and default-disabled feature flag.

## Validation plan

- The shared adapter test suite is ported from the exact Normal #120 candidate and runs without Supabase fixtures.
- Team Lite candidate checks require byte-for-byte source/bundle parity and explicitly assert the retry cache, explicit-key lookup and Retry-After guard.
- The offline Team Lite source-guard workflow is the intended CI gate for this candidate. Do not dispatch the fixture-mutating full Candidate Checks against the shared lab without a separate QA-authorized window.
- No local checkout was available for an independent Node run; report only exact GitHub Actions results after they complete.

## Boundaries

- Cache remains in-memory per transport instance and does not survive reload/recreation.
- This does not add stable operation IDs at every call site, durable outbox semantics, or server-verifiable fresh-key anti-replay.
- No Supabase migration, fixture mutation, function deployment, feature-flag change, merge, release, or userscript publication is authorized by this candidate.