# Migration statement recovery — 2026-11-16

## Scope

This isolated candidate restores four missing migration source files from the exact statement strings retained by the production Supabase migration ledger. The source was read from `supabase_migrations.schema_migrations` in project `dlfvkawaiqduhlazsszm` using SELECT only.

The repository tree on `master`, `develop`, PR #74, PR #76, PR #80 and the existing documentation candidate did not contain these four migration filenames. The candidate branch was created from `develop` at `6b33e1e26ad105143f00372ae6d0f2fa52df60d6`; its initial comparison to develop was identical and the target paths were absent before creation.

## Recovered ledger entries

| Version | Ledger name | Statements | Rollback |
|---|---|---:|---|
| `20261023154754` | `create_upstatus_visual_config` | 1 | null |
| `20261026195855` | `add_chat_message_file_name` | 1 | null |
| `20261027154329` | `allow_chat_document_mime_types` | 1 | null |
| `20261027155438` | `set_upstatus_upload_limits_20mb` | 1 | null |

Each SQL file contains the corresponding statement string from the applied ledger, with a final newline. This is a ledger-based recovery of the executed SQL text, **not proof that the original repository file bytes, comments, or formatting have been recovered byte-for-byte**. No SQL was inferred from the current schema.

## Read-only catalog corroboration

A read-only query against production confirmed:

- `public.upstatus_visual_config` exists with columns `id`, `version`, `config`, `updated_at`; RLS is enabled; the `published` row exists at version 1 with a `themes` config key.
- `public.messages.file_name` exists.
- `storage.buckets.allowed_mime_types` for `chat-images` matches the MIME array in the recovered statement.
- `chat-images` and `profile-images` both report a 20 MiB limit (20,971,520 bytes).

These checks corroborate the applied effects. They do not authorize replaying migrations or changing production.

## Safety and remaining work

- No production SQL write, migration, deploy, release, secret/flag change, or destructive operation was performed.
- The recovered files are staged only on this isolated Git branch for review.
- Do not replay these migrations against production.
- Do not mark migration provenance complete until an independent reviewer accepts the ledger source, compares any external original archive if available, and the migration-history preflight is validated in a genuinely isolated Full-Product TEST environment.
- The production managed branch currently reports `MIGRATIONS_FAILED`; this source recovery does not repair or alter that branch.
