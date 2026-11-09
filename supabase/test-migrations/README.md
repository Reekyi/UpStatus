# Isolated UpStatus test migrations

These SQL files create or modify database objects used by the isolated default-privilege, signaling (including cancellable voice-room attempts), rate-limit, and chat-read-receipt test suite. They are executable DDL, not inert fixtures.

They are deliberately stored outside `supabase/migrations/`, which is the Supabase CLI migration-discovery directory. Keeping them here prevents a normal `supabase db push` from treating test-only DDL as production migration history.

## Target restriction

- Intended project ref: `bfpjtfqlnypisxljoxkb` (isolated security-test project) only.
- Never apply these files to the production project `dlfvkawaiqduhlazsszm` or to the shared/official TEST runtime.
- Never move a file with a `_test.sql` suffix into `supabase/migrations/`.
- Before any manual application, independently verify the project ref and SQL contents. The JavaScript fixture guard protects API-based test mutations; it does not authorize SQL DDL execution.

Production migrations must be separately authored, reviewed, validated against the approved TEST environment, and packaged through the release process. These files are not production migrations and must not be renamed to make them appear deployable.

## Setup invite regression

`20261107010000_setup_invites_test.sql` checks the setup-invite columns, unique token-hash index, SECURITY INVOKER setting, pinned empty search_path, and service_role-only RPC execution. The companion `scripts/test-auth-enrollment.mjs` uses unique `__auth_test_` users in the allowlisted isolated project and verifies concurrent one-time consumption and expiry, then removes only its exact fixtures. It is not a production migration.
## Broadcast trigger search-path hardening

`20261107170000_pin_empty_search_path_trigger_broadcasts_test.sql` is an isolated-only counterpart to `supabase/migrations/20261107170000_pin_empty_search_path_trigger_broadcasts.sql`. It pins the three trigger-only SECURITY DEFINER broadcast functions to an empty function `search_path`, then verifies that they remain attached to triggers, keep schema-qualified `realtime.send`, deny direct execution to `anon`/`authenticated`, and preserve `service_role` execution.

Apply it only to the allowlisted isolated project after checking that no fixture workflow is active. It is not a production migration and does not make the legacy public Realtime topic private.


## Voice attempt singleton (2026-11-08)

- `20261108010000_voice_attempt_singleton_test.sql` verifies that the voice-attempt RPC remains SECURITY INVOKER, pins an empty `search_path`, and is executable only by `service_role`.
- The paired production candidate migration prevents one UpStatus account from creating multiple active voice-room attempts across the Normal and Team Lite logical aliases. Stale/departed attempts are closed before a new attempt is accepted.
- The authenticated integration harness races two different tab-local attempt IDs for the same account and requires exactly one winner, a deterministic `VOICE_ATTEMPT_ALREADY_ACTIVE` conflict, and a successful retry after cancellation.
- These files are candidate-only. Apply the test SQL only to the allowlisted isolated project `bfpjtfqlnypisxljoxkb`; never apply test-migration files to production or the official TEST project.


## Voice attempt account-scoped lock (2026-11-08)

- Candidate migration: `20261108050751_voice_attempt_account_scoped_lock.sql`. It scopes the singleton scan lock to the account while retaining the shared logical-room lock inside `open_upstatus_signal_voice_room`; cancellation acquires the account lock before the shared-room lock.
- Isolated contract test: `20261108050802_voice_attempt_account_scoped_lock_test.sql` verifies attempt-ID → account → shared-room ordering, confirms the open scan happens before the inner room-open RPC, and preserves SECURITY INVOKER, empty search_path and service_role-only grants.
- The authenticated integration harness races opens and cancels for two different accounts while retaining the same-account one-winner regression.
- These two version numbers match the migration records already applied to the allowlisted isolated lab `bfpjtfqlnypisxljoxkb`. Never apply test-migration files to production or official TEST.


## Generic room membership capacity (2026-11-09)

- Production candidate migration: `20261109010000_enforce_signal_room_member_capacity.sql`. It moves generic room invitation and acceptance into SECURITY INVOKER RPCs that lock the room row before membership rows, matching the lock order used by `leave_upstatus_signal_room`.
- The RPCs enforce a maximum of 32 accepted members transactionally. Concurrent acceptances at 31 members must yield exactly one success and one `ROOM_FULL` conflict; invitations after the room is full are rejected.
- Isolated catalog contract: `20261109010000_enforce_signal_room_member_capacity_test.sql`. It verifies VOLATILE/SECURITY INVOKER, empty `search_path`, room-first lock order, the 32-member check, and service_role-only execution.
- Live fixture harness: `scripts/test-signal-room-capacity.mjs`. It requires the exact isolated project ref, explicit `UPSTATUS_SIGNAL_ALLOW_MUTATION=1`, an empty lab preflight across users, sessions, rooms, members, bindings, events, call attempts, voice attempts, and rate limits, plus the reviewed `X-UpStatus-Signal-Capacity: room-capacity-v1` health header before creating 35 uniquely prefixed users. It cleans only those exact fixtures.
- The current shared lab runtime v32 does not advertise the capacity header, so the live harness intentionally aborts before fixture writes until QA/engineering coordinates an isolated candidate runtime update.
- Never apply this test migration to production or the official TEST project. Do not run the live harness while another fixture-mutating suite is active.


### Capacity lock-order and cleanup contract follow-up (2026-11-09)

- The catalog test now checks the exact sequence: room row lock, inviter membership row lock, recipient membership row lock, accepted-member count, then either reissue/update or insert. The accept RPC must lock the room and invitation row before counting and changing status.
- The live harness removes only rows tied to its unique fixture usernames/room across events, bindings, call attempts, voice attempts, memberships, rooms, sessions and rate-limit buckets, then asserts all nine preflight tables are empty.
- This remains offline/catalog-contract coverage plus an unexecuted lab-only HTTP harness. Do not apply the test migration or run the harness until the QA-shared lab runtime is updated through an approved coordinated path.


## Server-side signaling event idempotency (2026-11-09)

- Production candidate migration: `20261109030000_signal_event_idempotency.sql`. It adds a service-role-only replay ledger scoped by room, authenticated sender and a 128-bit client idempotency key. The ledger remains until room deletion, even after an event is acknowledged or expires, so replay cannot re-enqueue the same operation during the room lifetime.
- The `enqueue_upstatus_signal_events` RPC uses VOLATILE SECURITY INVOKER, an empty `search_path`, room-first/share membership locks, and service_role-only execution. Reusing a key with a different canonical request hash returns `IDEMPOTENCY_KEY_REUSED` (HTTP 409).
- The RPC supports unicast, room broadcast and the narrowly validated non-member `join_request` path. The join-request exception requires the active room creator as the sole recipient and a matching call binding.
- Isolated catalog contract: `20261109030000_signal_event_idempotency_test.sql`. It verifies RLS, grants, primary key, RPC security, lock behavior and replay conflict handling.
- The guarded `scripts/test-signal-room-capacity.mjs` now also exercises same-key unicast/broadcast replay and different-payload key reuse. It requires both `X-UpStatus-Signal-Capacity: room-capacity-v1` and `X-UpStatus-Signal-Idempotency: event-idempotency-v1`, the exact isolated project allowlist, explicit mutation opt-in and empty preflight/postflight checks including the replay ledger.
- The live harness remains unexecuted. The QA-shared lab runtime v32 lacks both candidate markers and the migration is unapplied. Do not apply the test migration or run the fixture harness until QA coordinates an isolated candidate runtime update.


## Database-backed signaling readiness (2026-11-09)

- Production candidate migration: `20261109040000_signal_database_readiness.sql`. It adds `upstatus_signal_readiness()` as a read-only STABLE SECURITY INVOKER RPC with an empty `search_path` and service_role-only EXECUTE.
- The probe verifies required signaling/session tables, columns, RLS state, service_role table privileges, and every RPC used by the handler, including rate limiting, call/voice attempt recovery, capacity, and event idempotency.
- `GET /health` remains a liveness check. `GET /ready` calls the database RPC and returns 200 only when the full dependency contract is present; missing dependencies or RPC errors return a generic 503 without exposing internal names.
- Isolated catalog/live-readiness contract: `20261109040000_signal_database_readiness_test.sql`. It verifies STABLE/SECURITY INVOKER, empty search_path, service_role-only execution, and a ready result with no missing dependencies.
- The test migration is isolated-only. Never apply it to production or official TEST. The production migration remains a candidate and requires QA-coordinated validation before any lab application.
