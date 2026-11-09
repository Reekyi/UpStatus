# Database-backed signaling readiness

Date: 2026-11-09 UTC  
Candidate: [PR #113](https://github.com/Reekyi/UpStatus/pull/113)  
Base: Draft [PR #112](https://github.com/Reekyi/UpStatus/pull/112), HEAD `a7d6950fa0835e2c296318b2f431256f0fca3ab5`

## Finding

The signaling handler's existing `GET /health` response is a process/liveness marker only. It returns `ok: true` without checking PostgreSQL connectivity, the required signaling tables, the idempotency ledger, rate-limit storage, RPC availability, or the privileges used by the service-role client. It must not be treated as database readiness.

## Candidate change

- Keep `GET /health` as liveness.
- Add `GET /ready`, backed by the read-only `public.upstatus_signal_readiness()` RPC.
- The RPC is `STABLE SECURITY INVOKER`, uses an empty `search_path`, and is executable only by `service_role`.
- It verifies the required tables are ordinary/partitioned tables with RLS enabled, required columns exist, service_role has the table privileges used by the handler, and every handler RPC exists with service_role EXECUTE. Handler RPCs must also remain VOLATILE SECURITY INVOKER functions with an empty `search_path`, service_role EXECUTE, and no anon/authenticated EXECUTE.
- The Edge Function returns only generic 200/503 bodies. Internal missing-dependency names are not exposed to unauthenticated callers.
- The production and isolated handlers/helpers remain byte-identical apart from the health service label.

## Validation

- Offline contract tests cover ready, missing dependency, wrong schema version, malformed response, and RPC/database errors.
- The isolated catalog migration executes the readiness RPC and requires `ready=true` with an empty missing list.
- The live catalog test and HTTP probe have not been run. The shared lab remains on v32 and does not yet contain the capacity/idempotency/readiness candidate migrations or runtime headers.
- No Supabase migration, deployment, fixture mutation, or production operation is part of this PR.

## Release boundary

This endpoint is a candidate readiness contract, not proof that the currently deployed lab or production runtime is ready. The authenticated signaling backend remains absent from production; the feature remains default-off. Keep Draft pending exact-head CI, QA review, coordinated isolated schema/runtime installation, and live HTTP verification.


## Exact-head validation follow-up

- Validated code HEAD: `314e67cbd974247b40953aad92ce25e21001c1c3`. The subsequent branch-tip commit only updates this checkpoint; no application, migration, or test code changed after the successful run.
- PR Validate [42556846009](https://github.com/Reekyi/UpStatus/actions/runs/42556846009): SUCCESS. Logs confirm migration layout, production/isolated source parity, room-capacity contract, event-idempotency contract, database-readiness contract, Normal build, and `Validation OK: PROD 3.4.7 / TEST 3.4.7`.
- Initial run [42556761023](https://github.com/Reekyi/UpStatus/actions/runs/42556761023) failed because the existing room-capacity and idempotency parity tests replaced only the first service label. Both guards now replace all service-label occurrences; the final exact-head run passes.
- The readiness RPC and isolated catalog migration remain unexecuted/unapplied. The shared lab still runs `upstatus-signal-test` v32 and does not contain the candidate capacity, idempotency, or readiness migrations.
- Scope note: PR #109 protects generic signaling call-room `/room/invite` and `/room/accept`; Issue #78's open voice-room rule remains unchanged. The voice-room path remains `/room/open`, with no invitation/acceptance added to that flow.


## Read-only SQL-body preflight

The exact CTE body from the candidate readiness migration was executed as a standalone SELECT against the allowlisted lab project `bfpjtfqlnypisxljoxkb`. It parsed and returned `ready=false` with only the expected missing dependencies: the event-idempotency ledger/table columns, the capacity invite/accept RPCs, and the idempotent enqueue RPC. All pre-existing required tables, columns, service_role grants, and other listed RPC signatures passed the query's checks.

This was a SELECT-only query extracted from the migration function body. It did not create the readiness function, apply a migration, or mutate the lab. The live `GET /ready` endpoint and isolated catalog test remain unexecuted.


## Final security-inventory validation — 2026-11-09

This section supersedes the earlier code-head reference above.

- Final validated code/PR HEAD: `bfc6fc2585daaaacaf885ac9001a992fa93acb5f`.
- Exact PR Validate [42557325620](https://github.com/Reekyi/UpStatus/actions/runs/42557325620): SUCCESS. Logs confirm `Signal database readiness contract tests passed`, source parity, capacity/idempotency contracts, Normal build, and `Validation OK: PROD 3.4.7 / TEST 3.4.7`.
- Readiness now also fails closed if any handler RPC is not VOLATILE SECURITY INVOKER with empty `search_path`, service_role EXECUTE, and no anon/authenticated EXECUTE.
- The SQL body was re-run as a standalone SELECT against the allowlisted lab after these checks were added. It still returns `ready=false` only for the expected absent event-idempotency ledger/table columns and the not-yet-applied capacity/idempotent-enqueue RPCs. Existing RPCs pass the volatility, invoker, search_path, and client-grant checks.
- No function/migration was applied and no schema or row was changed. A subsequent checkpoint-only commit follows this validated code HEAD; no code changed after the passing run.
