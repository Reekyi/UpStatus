# Team Lite migration content provenance guard

**Date:** 2026-11-09  
**Base PR:** [#126](https://github.com/Reekyi/UpStatus/pull/126)  
**Candidate branch:** `fix/team-lite-migration-content-provenance-20261109`

## Finding addressed

The independent QA audit found that the #126 preflight compared only remote migration version/name with local filenames. A local SQL file could be changed while keeping its filename and still pass that reconciliation.

The Supabase Management API exposes version/name but not a SQL checksum. This candidate adds a repository provenance manifest containing Git blob SHA-1 values for each historical migration whose exact source is currently present and verified in the reviewed `master` tree.

## Implementation

- `supabase/migrations/provenance.json` records the exact Git blob SHA-1, source ref, and source commit for the three original migrations present in the reviewed master tree.
- `computeGitBlobSha` calculates the canonical Git blob object ID from UTF-8 file contents.
- `assertRemoteMigrationsHaveVerifiedProvenance` requires every remote applied migration to have a matching version/name/filename, source commit, source ref, and exact Git blob SHA-1.
- The preflight remains read-only. It only fetches Management API migration history and reads local files.
- Offline tests cover complete provenance, tampered content, missing entries, duplicate versions, malformed provenance, and the current incomplete production manifest.

## Deliberately unresolved historical sources

Four already-applied production migrations are still missing from the repository and are deliberately absent from the manifest:

1. `20261023154754_create_upstatus_visual_config.sql`
2. `20261026195855_add_chat_message_file_name.sql`
3. `20261027154329_allow_chat_document_mime_types.sql`
4. `20261027155438_set_upstatus_upload_limits_20mb.sql`

No SQL was reconstructed from the current schema. The production preflight must continue to fail until original reviewed sources and their provenance are recovered.

The manifest is a reviewed provenance record, not a signature. The separate #125 approval guard must require a trusted human reviewer on the exact PR head before any production dispatch can be considered.

## Validation boundary

The focused workflow is offline-only and uses no Supabase credentials, Management API calls, fixtures, migrations, or deployment. No production or lab writes were performed.
