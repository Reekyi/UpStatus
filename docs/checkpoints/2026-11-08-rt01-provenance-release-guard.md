# RT-01 release guard provenance follow-up

Date: 2026-11-08

## Finding

The RT-01 release guard candidate used the removed payload-controlled `_authenticatedTransport` property as its synthetic proof of trusted call signaling. That fixture could accept the pre-fix trust model while rejecting the corrected out-of-band provenance used by Normal #102 and Team Lite #103.

The guard also omitted the production migration `20261108190000_distributed_signaling_rate_limit.sql`, although the production `upstatus-signal` handler calls the distributed rate-limit RPC created by that migration. A release preflight that does not require the table/RPC could allow a function deployment to reach a database without its rate-limit dependency.

The migration-history verifier already consumes `REQUIRED_PRODUCTION_MIGRATIONS`; adding the missing migration to that shared list makes both the source guard and read-only history preflight require it.

## Candidate correction

- Require `receiveCallSignal(payload, authenticatedSource)` and an out-of-band provenance check.
- Require authenticated polling and invitation paths to pass `true`, and the public Realtime listener to pass `false`.
- Reject any `_authenticatedTransport` payload marker.
- Require an own-property allowlist limited to `presence` and `ended` with `discoveryOnly === true`; `join_declined` is not a public discovery event.
- Require public `ended` to remove only a call-directory entry.
- Require the release migration list to include the distributed signaling rate-limit migration.
- Align the deploy-workflow regression with the actual three-runtime order: signaling, product API, then userscript distribution.
- Add an offline-only GitHub Actions workflow. It uses no secrets, Supabase calls, fixtures, or deployment steps.

## Current limitation

The parent RT-01 branch still contains the pre-cutover Normal userscript source and does not yet contain the production signaling adapter/function artifacts. The updated guard intentionally keeps that source blocked. This follow-up hardens the gate; it does not claim that RT-01 is release-ready.

No production or laboratory database was modified. No migration, deployment, workflow dispatch, merge, release, feature flag change, or userscript publication was performed.
