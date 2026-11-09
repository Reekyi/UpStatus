# Client signaling idempotency retry-key cache

Date: 2026-11-09  
Candidate: `feat/normal-signal-retry-key-cache-20261109`  
Base: PR #117, HEAD `4889111a6f1e59015785792f53e3132141044227`  
Scope: UpStatus Normal client transport adapter only.

## Finding

The adapter already generated a cryptographically random 128-bit idempotency key and attached it to a failed request error. However, a later invocation of the same logical send generated a new key unless the caller explicitly copied `error.idempotencyKey`. The current Normal call sites do not pass explicit keys. A response lost after the server commits could therefore be retried as a new operation.

## Candidate change

`src/userscript/signaling-transport.mjs` now keeps a bounded, in-memory retry cache inside each transport instance:

- Cache identity includes endpoint path, optional caller-supplied `operationId`, explicit key scope, and a canonical JSON request payload with object keys sorted and array order preserved.
- Only the event envelope's volatile `at` and `updatedAt` fields are excluded from identity. When a retry matches, the adapter resends the exact original request body and the original key, preserving the server's canonical request hash.
- Network/ambiguous failures, HTTP 408/425/429, and 5xx responses retain the key. One bounded automatic retry is attempted for transient failures.
- `Retry-After` is respected up to 1.5 seconds. Longer delays are not slept through; the cache stores a not-before timestamp and rejects premature caller retries with `SIGNAL_RETRY_DEFERRED` until the server delay elapses, preserving the original key/body.
- Permanent 4xx responses and `IDEMPOTENCY_KEY_REUSED` do not retain a key.
- Concurrent identical operations share one in-flight request.
- Entries expire after 2 hours and 5 minutes and the cache is capped at 256 entries. The server creates rooms with a 2-hour lifetime and retains the idempotency ledger until room expiry/deletion; the extra 5 minutes cover the best-effort 60-second cleanup cadence. When the cache is full, new sends without an explicit key fail closed with `SIGNAL_RETRY_CACHE_FULL`; pending keys are never silently evicted.
- `sendSignal`, `sendToRoom`, and `requestInvite` accept an optional local-only `operationId` (maximum 256 characters); it is not sent to the server. Current Normal call sites do not yet pass explicit IDs; they use the normalized payload fallback, so a call-site-specific operation ID remains a possible follow-up if QA requires stronger identity across payload reconstruction.

No session token, credential, or secret is stored in the cache.

## Automated coverage added

`scripts/signaling-transport.test.mjs` covers:

- bounded retry with the same key and exact body;
- later caller retry reusing the original key and payload despite a refreshed transport timestamp;
- distinct operation IDs receiving distinct keys without sending them to the server;
- permanent 4xx failures not being retried or cached;
- concurrent duplicate operations being coalesced even when only the transport timestamp changes;
- retry-key expiry;
- cache-capacity fail-closed behavior without evicting pending keys;
- long `Retry-After` deferral with the original key/body retained;
- equivalent behavior for room broadcasts.

`scripts/signal-idempotency-contract.test.mjs` now asserts that the bounded cache and these regression cases remain part of the contract.

## Boundaries and remaining work

- The cache is in-memory and scoped to one `createSignalingTransport` instance. It does not survive page reload or transport-instance recreation. A future durable outbox would need a separately reviewed storage and member/session scoping design.
- This candidate changes the Normal adapter source. Team Lite's independent release line still needs the same behavior ported and validated separately; no Team Lite artifact was changed here.
- CI must pass on the final PR HEAD. No browser/WebRTC test was performed.
- No Supabase query, migration, fixture, deployment, feature flag, release, or production operation is part of this change.

## Release posture

Draft only. Do not merge, deploy, enable authenticated signaling, or treat this adapter improvement as closure of the public Realtime P0.


## Retry-After enforcement follow-up — 2026-11-09

Review found that the first candidate retained the key for a long Retry-After but did not enforce the not-before time on a later caller invocation. A caller retry could therefore send immediately despite the server's requested delay. The follow-up stores an absolute retry-after deadline with the pending key and returns `SIGNAL_RETRY_DEFERRED` (HTTP 429, remaining delay, same key) until that deadline passes. The original request body and idempotency key are then replayed unchanged. Regression coverage uses a fake clock to prove that no second HTTP request is sent early.

This remains Normal-only and in-memory per transport instance. It does not add Team Lite parity, durable retry across reload, or fresh-key anti-replay protection.
