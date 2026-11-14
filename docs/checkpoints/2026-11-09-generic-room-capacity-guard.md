# Generic signaling room capacity guard — 2026-11-09

## QA finding

The independent QA audit `docs/audits/2026-11-09-upstatus-qa-audit-0025-utc.md` identified that generic `/room/invite` and `/room/accept` did not enforce the 32-member cap transactionally. Concurrent accepts near capacity could exceed the intended limit.

## Engineering candidate

Draft [PR #109](https://github.com/Reekyi/UpStatus/pull/109) is stacked on the Normal signaling candidate #108.

- HEAD: `94d43feca3ca4632862e24f7cdf5ecc4c4c9ac39`
- Exact-head Validate: [42544535436](https://github.com/Reekyi/UpStatus/actions/runs/42544279847) — SUCCESS.
- The new offline contract test passed in the full Validate run.

The candidate adds:
- `invite_upstatus_signal_room_member(text,text,text)`
- `accept_upstatus_signal_room_invitation(text,text)`
- Both RPCs are VOLATILE, SECURITY INVOKER, use an empty `search_path`, and grant EXECUTE only to `service_role`.
- Both lock the room row before membership rows, matching the lock order in `leave_upstatus_signal_room`.
- The invite RPC checks room state, inviter membership, recipient existence, duplicates/reissue, and current accepted count.
- The accept RPC checks a pending invitation and serializes the accepted-member count under the same room lock.
- A full room returns `ROOM_FULL`; the Edge Function maps that to HTTP 409.
- Existing success response shapes are preserved.

The production migration and isolated catalog test migration are versioned. The live concurrent HTTP harness creates 35 uniquely prefixed fixtures, verifies one winner/one HTTP 409 at capacity, checks 32 accepted members, and cleans only its own fixtures. It requires the exact lab project, explicit mutation opt-in, empty-fixture preflight, and `X-UpStatus-Signal-Capacity: room-capacity-v1` before any fixture write.

## Validation boundary

The live harness syntax and safety contract passed offline CI, but it was not executed. The shared lab's deployed `upstatus-signal-test` remains v32 and does not advertise the capacity marker. The lab is QA-shared; no migration, function deployment, fixture, or other lab write was performed.

Production was not modified. No production SQL write, migration, deploy, secret/role/grant/ACL/policy/flag change, merge, release, or userscript publication occurred.

## Remaining QA gates

- Coordinate an isolated runtime update before applying the capacity migration and running the concurrent HTTP harness in the lab.
- Route-specific invite quotas still need agreed thresholds.
- Event replay/idempotency remains open.
- Health is still liveness-only; a database-backed readiness probe remains open.
- Team Lite must be reconciled with the shared backend candidate before a combined release.
- Broader authenticated signaling cutover and public Realtime P0 remain open.

The full `docs/RELEASE_READINESS.md` blob exceeded the connector's retrieval limit in this run. The latest focused QA audit above and the current continuity state were read; the QA-owned branch and release-readiness file were not edited.
