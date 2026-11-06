# Isolated UpStatus test migrations

These SQL files create or modify database objects used by the isolated default-privilege, signaling (including cancellable voice-room attempts), rate-limit, and chat-read-receipt test suite. They are executable DDL, not inert fixtures.

They are deliberately stored outside `supabase/migrations/`, which is the Supabase CLI migration-discovery directory. Keeping them here prevents a normal `supabase db push` from treating test-only DDL as production migration history.

## Target restriction

- Intended project ref: `bfpjtfqlnypisxljoxkb` (isolated security-test project) only.
- Never apply these files to the production project `dlfvkawaiqduhlazsszm` or to the shared/official TEST runtime.
- Never move a file with a `_test.sql` suffix into `supabase/migrations/`.
- Before any manual application, independently verify the project ref and SQL contents. The JavaScript fixture guard protects API-based test mutations; it does not authorize SQL DDL execution.

Production migrations must be separately authored, reviewed, validated against the approved TEST environment, and packaged through the release process. These files are not production migrations and must not be renamed to make them appear deployable.
