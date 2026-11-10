# Recovered migration-ledger statements

These files are **not represented as original migration source files**. They preserve the SQL text stored in the production Supabase migration ledger.

## Source and method

- Project: `dlfvkawaiqduhlazsszm`
- Source table: `supabase_migrations.schema_migrations`
- Read-only fields: `version`, `name`, `created_by`, `idempotency_key`, `statements`, `rollback`
- Retrieved: 2026-11-10 11:12 UTC
- Each of the four records contained exactly one statement and a NULL rollback value.
- The version and name values match the production migration inventory.

## Important provenance limitation

The migration ledger preserves executed statement text, but does not establish byte-for-byte recovery of the original files, comments, formatting, or original Git commit/blob. These are therefore labeled **executed-statement recoveries**, not original SQL sources.

The files live under `docs/migration-recovery/`, outside `supabase/migrations/`. They are evidence for QA review only. Do not copy them into the migration discovery directory, run them, or use them for a deployment until independent QA and the project owner explicitly approve the provenance and content.

No database writes, migration operations, or production changes were performed to create this evidence.
