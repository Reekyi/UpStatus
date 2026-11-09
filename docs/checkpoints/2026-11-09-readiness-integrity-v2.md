# Signaling readiness integrity v2 — 2026-11-09

## QA finding addressed

The independent QA audit at 2026-11-09 04:40 UTC found that the database-backed readiness RPC could report ready when the idempotency ledger table existed but its primary/unique key, foreign keys, or concurrency-critical indexes were missing or invalid. It also found that the unauthenticated `GET /ready` path called the service-role RPC on every request and that the capacity/replay fixture harness did not require database readiness before writes or continue cleanup after an individual DELETE failed.

## Candidate changes

- Added production migration `20261109050000_signal_database_readiness_integrity.sql`, which upgrades the readiness contract to `signal-v2`.
- Readiness now checks the required primary/unique constraints, foreign-key targets and delete actions, plus the exact valid/ready indexes used by event polling, room lookup, membership lookup and bounded cleanup.
- Added isolated catalog test migration `20261109050000_signal_database_readiness_integrity_test.sql` to assert the idempotency ledger key/FK, event polling/ack indexes, readiness RPC ACL/security, and a zero-missing-dependency result.
- Added a five-second per-warm-isolate cache and single-flight coalescing to `GET /ready`. The response advertises `X-UpStatus-Signal-Readiness: database-v2` only on HTTP 200. This is a bounded per-isolate probe policy, not a global rate limiter.
- The capacity/replay harness now requires the database-v2 readiness marker before fixture creation. Cleanup attempts every FK-safe DELETE, performs all postflight emptiness checks with `Promise.allSettled`, and aggregates primary/cleanup failures without skipping later cleanup steps.

## Read-only lab preflight

The body of the candidate readiness function was executed as a standalone SELECT against the allowlisted isolated lab `bfpjtfqlnypisxljoxkb`.

Result: `ready=false`, with only the expected missing idempotency ledger table/columns/primary key/foreign keys and the capacity/idempotent-enqueue RPCs. Existing session/user keys, room/member/binding/event/rate-limit/call/voice constraints, and the required existing indexes passed the catalog checks.

This is SQL-body/catalog validation only. The function and migration were not applied. No fixture was created. The shared lab remains on `upstatus-signal-test` v32 and does not advertise `database-v2`, so the HTTP harness must fail closed there.

## Validation boundary

- Base PR #113 branch: `feat/normal-signal-db-readiness-20261109`.
- Candidate branch: `fix/normal-signal-readiness-integrity-20261109-v2`.
- The Validate workflow was extended to recognize this child branch for push and pull-request events.
- PR #117 exact HEAD `206e19df0d9c896b22e50eb16864a4ba80be9f16`: push Validate [42565786660](https://github.com/Reekyi/UpStatus/actions/runs/42565786660) and pull-request Validate [42565813869](https://github.com/Reekyi/UpStatus/actions/runs/42565813869) both **SUCCESS**. The logs confirm migration layout, source parity, room-capacity, idempotency, readiness integrity, signed-upload, chat, Team Lite updater checks, and `Validation OK: PROD 3.4.7 / TEST 3.4.7`.
- Supabase Preview was skipped because automatic preview branches are disabled; no database migration was applied.
- PRs #115 and #116 remain open Draft but are marked superseded by the consolidated #117 candidate.
- True fresh-key SDP/ICE replay rejection remains unresolved; client-key idempotency alone is not adversarial anti-replay.
- Team Lite backend/client reconciliation, invite quota thresholds, authenticated cutover, public Realtime/Storage hardening and physical #78 acceptance remain open.

No production or lab migration, SQL write, runtime deployment, fixture mutation, secret/role/grant/ACL/policy/flag change, merge, release or userscript publication was performed.
