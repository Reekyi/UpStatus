# Isolated UpStatus test migrations

These SQL files create or modify database objects used by the isolated signaling, rate-limit, and chat-read-receipt test suite. They are executable DDL, not inert fixtures.

They are deliberately stored outside `supabase/migrations/`, which is the Supabase CLI migration-discovery directory. Keeping them here prevents a normal `supabase db push` from treating test-only DDL as production migration history.

## Target restriction

- Intended project ref: `bfpjtfqlnypisxljoxkb` (isolated security-test project) only.
- Never apply these files to the production project `dlfvkawaiqduhlazsszm` or to the shared/official TEST runtime.
- Never move a file with a `_test.sql` suffix into `supabase/migrations/`.
- Before any manual application, independently verify the project ref and SQL contents. The JavaScript fixture guard protects API-based test mutations; it does not authorize SQL DDL execution.

Production migrations must be separately authored, reviewed, validated against the approved TEST environment, and packaged through the release process. These files are not production migrations and must not be renamed to make them appear deployable.


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

## Team Lite production deployment prerequisites (2026-11-09)

- The Team Lite backend template calls both consume_upstatus_setup_invite and merge_chat_read_receipts. Production must have the three AUTH-03 setup-invite migrations and the production candidate migration 20261109090000_atomic_chat_read_receipts_and_visual_config_grants.sql applied before the matching Team Lite function can be deployed.
- The production migration is a separately reviewed candidate under supabase/migrations/. Its SQL is byte-identical to the existing isolated counterpart 20261104152847_atomic_chat_read_receipts_and_visual_config_grants_test.sql.
- The isolated counterpart remains test-only and must never be applied to production or the official TEST runtime. Any future application to the isolated lab requires a coordinated QA window and independent project/content verification.
- The Team Lite production workflow checks project identity and migration history with read-only Management API GET requests. It does not apply migrations.
- The workflow is manual-only, requires an explicit confirmation input defaulting to false, pins the exact official branch/SHA, and deploys only upstatus-team-lite with --no-verify-jwt.
- The candidate Storage size settings now match the observed 20 MB production bucket limits. Bucket privacy remains unchanged; this workflow does not deploy or modify Storage configuration.


## Additional production cutover gates (2026-11-09)

- The read-only Team Lite project preflight also reads the managed Supabase branch inventory. The default `main` branch must track Git `master` and report `ACTIVE_HEALTHY`; a healthy project with `main.status = MIGRATIONS_FAILED` is not deploy-ready.
- The read-only migration preflight compares every remotely applied migration version/name with the local `supabase/migrations/*.sql` filenames. Candidate migrations may be newer and unapplied, but every remote version must have its original local source filename. A missing or mismatched historical file blocks deployment.
- Do not reconstruct missing historical SQL from the current schema. Recover the original reviewed artifacts or use a separately reviewed baseline/reconciliation plan.
- The current production branch `main` is `MIGRATIONS_FAILED`, and four already-applied production migration files are absent from the candidate repository history. The Team Lite production preflight must therefore fail closed until both branch health and local/remote history are reconciled.
