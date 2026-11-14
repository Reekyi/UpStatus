# Signal event idempotency and replay protection

Date: 2026-11-09 UTC
Engineering candidate: [PR #112](https://github.com/Reekyi/UpStatus/pull/112) (current-base replacement; #110 is superseded)
Team Lite compatibility: [PR #111](https://github.com/Reekyi/UpStatus/pull/111)

## Candidate changes

PR #112 adds a server-only replay ledger, `upstatus_signal_event_idempotency`, scoped by room, authenticated sender and a 128-bit lower-hex idempotency key. The row is retained for the room lifetime, including after event ACK/expiry, and cascades only when the room is deleted.

The new `enqueue_upstatus_signal_events` RPC is VOLATILE, SECURITY INVOKER, uses an empty `search_path`, and is executable only by `service_role`. It locks the room before accepted membership rows, revalidates sender/recipient membership in the transaction, atomically claims the key, and binds it to a canonical request hash. Same-key/same-request returns the original attempt/delivery counts without re-enqueueing; same-key/different-request returns `IDEMPOTENCY_KEY_REUSED` for HTTP 409.

The RPC supports unicast, room broadcast and a narrowly guarded `join_request` exception. The exception requires a known non-member requester, an active call binding for the supplied logical call ID, and the active room creator as the sole accepted recipient.

The Normal adapter now generates secure 128-bit keys, accepts an explicit key for retry reuse, and attaches the key to request errors. PR #111 mirrors this in the shared Team Lite adapter and embedded userscript. The Team Lite source/bundle parity assertion passes.

## Exact validation

- PR #110 HEAD: `13f8b80d536ed07b8c1882503a336ab414fe5f0f`.
- UpStatus Validate: [42554605639](https://github.com/Reekyi/UpStatus/actions/runs/42554605639) SUCCESS. The log includes `Signal event idempotency contract tests passed`, migration layout, production/isolated source parity, room-capacity contract, Normal build and `Validation OK: PROD 3.4.7 / TEST 3.4.7`.
- PR #111 HEAD: `d65c3a6e42b5adba4303fcd510747839eca25b20`, 5 ahead / 1 behind current #103 base; GitHub reports mergeable/clean and the PR-specific offline guard passed.
- Team Lite Authenticated Call Source Guard: [42554841729](https://github.com/Reekyi/UpStatus/actions/runs/42554841729) SUCCESS. Adapter tests, public call-source guard and Team Lite candidate static/IIFE checks passed.
- PR #109 workflow-filter update HEAD: `9294f47a9dbea7038d34b74fdc53e958804e2d51`, Validate [42554593978](https://github.com/Reekyi/UpStatus/actions/runs/42554593978) SUCCESS.
- PR #103 workflow-filter update HEAD: `de2c6a92154ece2f8a313d2bafedf02170bb5f5a`, offline guard [42554766818](https://github.com/Reekyi/UpStatus/actions/runs/42554766818) SUCCESS.

PR #112 and PR #111 remain Draft, open, and without human reviews. PR #112 is stacked on #109; PR #111 is stacked on #103. PR #110 is superseded by #112 and remains open/Draft only for history. The full Team Lite Candidate Checks workflow was intentionally not triggered because it runs fixture-mutating tests against the QA-shared lab. Only the offline Team Lite guard ran.

## Live-test and environment limits

The guarded room-capacity harness now also exercises:
- same-key/same-payload unicast replay (one event row);
- same-key/different-payload unicast conflict (409);
- same-key/same-payload room broadcast replay (one event per accepted recipient);
- same-key/different-payload broadcast conflict (409);
- replay-ledger cleanup after fixture-room deletion.

The harness requires both reviewed candidate health headers, exact isolated-project allowlisting, explicit mutation opt-in, and empty preflight/postflight checks. It has **not** been executed. The QA-shared lab remains on `upstatus-signal-test` v32, lacks the capacity/idempotency headers, and has not received the new migrations. The new catalog test migration is not applied.

No production or lab writes, migrations, deployments, fixture mutations, secrets, grants, policies, roles, ACLs or feature flags were changed.

## Remaining gates

- QA-coordinated isolated migration/runtime update and real replay/concurrency HTTP tests.
- Confirm the new SQL migration against the exact lab schema before application.
- Add database-backed readiness distinct from liveness.
- Agree per-room/per-recipient invitation quota thresholds; no values were invented.
- Continue public Realtime/Storage/grant hardening and authenticated Normal/Team Lite cutover.
- Issue #78 remains 0/8 physical acceptance criteria. Issue #79 retains its historical 16/35 checklist; this checkpoint adds evidence without rewriting that count.


## Current branch/CI snapshot

- PR #74 HEAD `9c0133e8cf6bd85ac8993888718a408db2f24a3e`: Validate + Smoke PASS.
- PR #75 HEAD `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`: historical baseline Candidate Checks PASS.
- PR #76 HEAD `eb28e88325d7e8a6236d9050bebabf794d64a8c4`: Candidate Checks PASS.
- PR #80 current docs HEAD `03fba586301656e46130294dde68020f29a83a55`: Validate [42555744751](https://github.com/Reekyi/UpStatus/actions/runs/42555744751) FAIL, inherited `client signed upload helper missing` at `scripts/validate.mjs:55`.
- PR #82 current QA HEAD `cc0d4d0f78c664f9d776284c545df368f76110a2`: Validate [42551591404](https://github.com/Reekyi/UpStatus/actions/runs/42551591404) FAIL, inherited `production updateURL mismatch` at `scripts/validate.mjs:26`.
- PR #109 current parent HEAD `9294f47a9dbea7038d34b74fdc53e958804e2d51`: Validate [42554593978](https://github.com/Reekyi/UpStatus/actions/runs/42554593978) PASS; workflow filter only.
- PR #103 current Team Lite parent HEAD `de2c6a92154ece2f8a313d2bafedf02170bb5f5a`: offline guard [42554766818](https://github.com/Reekyi/UpStatus/actions/runs/42554766818) PASS; workflow filter only.
- PR #111 Team Lite idempotency HEAD `d65c3a6e42b5adba4303fcd510747839eca25b20`: offline guard [42554841729](https://github.com/Reekyi/UpStatus/actions/runs/42554841729) PASS. Fixture-mutating Team Lite Candidate Checks were not run.

## Latest read-only Supabase snapshot

- Production `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations through `20261027155438`, 38 Edge Functions, Normal v480, beta10 v6, Team Lite v15, TEST v281. No production signal schema, idempotency table or `upstatus-signal` function. 50 Realtime messages, all public. Security Advisor 6 WARN / 10 INFO.
- Lab `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 38 migrations through `20261108050802`, `upstatus-signal-test` v32 and E2E v3. Signal rooms/events exist but the new idempotency ledger is absent. Realtime messages 0. Security Advisor 0 WARN / 17 INFO; Performance has four unused-index INFO findings.
- The new idempotency and catalog-test migrations are candidate files only. Neither production nor lab received a migration. The guarded HTTP harness remains unexecuted.
- The independent QA audit still classifies the project **NO RELEASE**. Readiness remains static-only, invite quotas are undefined, public Realtime payload/grants and Storage need hardening, AUTH-03 is absent in production, managed Supabase branch main remains MIGRATIONS_FAILED, and #78 is 0/8 physical acceptance. Issue #79's body remains historical 16/35.
