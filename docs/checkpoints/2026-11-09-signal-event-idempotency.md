# Signal event idempotency and replay protection

Date: 2026-11-09 UTC
Engineering candidate: [PR #110](https://github.com/Reekyi/UpStatus/pull/110)
Team Lite compatibility: [PR #111](https://github.com/Reekyi/UpStatus/pull/111)

## Candidate changes

PR #110 adds a server-only replay ledger, `upstatus_signal_event_idempotency`, scoped by room, authenticated sender and a 128-bit lower-hex idempotency key. The row is retained for the room lifetime, including after event ACK/expiry, and cascades only when the room is deleted.

The new `enqueue_upstatus_signal_events` RPC is VOLATILE, SECURITY INVOKER, uses an empty `search_path`, and is executable only by `service_role`. It locks the room before accepted membership rows, revalidates sender/recipient membership in the transaction, atomically claims the key, and binds it to a canonical request hash. Same-key/same-request returns the original attempt/delivery counts without re-enqueueing; same-key/different-request returns `IDEMPOTENCY_KEY_REUSED` for HTTP 409.

The RPC supports unicast, room broadcast and a narrowly guarded `join_request` exception. The exception requires a known non-member requester, an active call binding for the supplied logical call ID, and the active room creator as the sole accepted recipient.

The Normal adapter now generates secure 128-bit keys, accepts an explicit key for retry reuse, and attaches the key to request errors. PR #111 mirrors this in the shared Team Lite adapter and embedded userscript. The Team Lite source/bundle parity assertion passes.

## Exact validation

- PR #110 HEAD: `13f8b80d536ed07b8c1882503a336ab414fe5f0f`.
- UpStatus Validate: [42554605639](https://github.com/Reekyi/UpStatus/actions/runs/42554605639) SUCCESS. The log includes `Signal event idempotency contract tests passed`, migration layout, production/isolated source parity, room-capacity contract, Normal build and `Validation OK: PROD 3.4.7 / TEST 3.4.7`.
- PR #111 HEAD: `d65c3a6e42b5adba4303fcd510747839eca25b20`.
- Team Lite Authenticated Call Source Guard: [42554841729](https://github.com/Reekyi/UpStatus/actions/runs/42554841729) SUCCESS. Adapter tests, public call-source guard and Team Lite candidate static/IIFE checks passed.
- PR #109 workflow-filter update HEAD: `9294f47a9dbea7038d34b74fdc53e958804e2d51`, Validate [42554593978](https://github.com/Reekyi/UpStatus/actions/runs/42554593978) SUCCESS.
- PR #103 workflow-filter update HEAD: `de2c6a92154ece2f8a313d2bafedf02170bb5f5a`, offline guard [42554766818](https://github.com/Reekyi/UpStatus/actions/runs/42554766818) SUCCESS.

Both new PRs remain Draft, open, and without human reviews. PR #110 is stacked on #109; PR #111 is stacked on #103. The full Team Lite Candidate Checks workflow was intentionally not triggered because it runs fixture-mutating tests against the QA-shared lab. Only the offline Team Lite guard ran.

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
