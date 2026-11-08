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

- `20261108020000_voice_attempt_account_scoped_lock_test.sql` verifies the attempt-ID → account → shared-room lock order for cancellation, the account-scoped singleton scan before shared-room open, and the retained inner logical-room lock.
- The candidate migration removes the outer global room lock from the per-account scan. `open_upstatus_signal_voice_room` still serializes shared binding mutations; cancellation takes the account lock before the shared-room lock so open/cancel follow one lock order.
- The authenticated integration harness races opens and cancels for two different accounts while retaining the same-account one-winner regression.
- Apply the test SQL only to the allowlisted isolated project `bfpjtfqlnypisxljoxkb`; never apply test-migration files to production or official TEST.
