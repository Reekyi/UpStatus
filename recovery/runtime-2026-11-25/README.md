# UpStatus Normal runtime recovery snapshot

Date: 2026-11-25
Status: recovery snapshot, not a release and not merged to master.

## Target
- Supabase project: `mvjqunhjxkbfcrxkjtgf` (organization UpStatus Revived, region sa-east-1)
- Distribution function: `upstatus`, runtime version 3.4.7
- Backend function: `upstatus-screen-share-3-1-1-beta10`, source-declared runtime version 3.1.1-beta8

## Scope and safety
- This branch preserves the runtime sources deployed to the isolated recovery project.
- The old production project remains unchanged.
- No Team Lite code is included.
- Do not merge this branch into master without a separate reviewed release plan.
- Supabase secrets are not stored in GitHub.
- The userscript's Supabase URL and publishable key are configured for the destination project.

## Current migration state
- Public schema reconstructed in the destination.
- Users, profile records, sanitized state, and visual configuration migrated.
- Chat messages, status history, and chat read cursors migrated.
- Old sessions intentionally not copied; users must authenticate again.
- Storage buckets and MIME/size configuration exist, but binary object transfer is blocked because the source Storage gateway currently returns HTTP 402.
- Edge Functions are deployed, but backend operation still depends on destination secrets and runtime smoke tests.

## Runtime files
- `upstatus/index.ts`: distribution function source.
- `backend/index.ts`: backend/API function source.

This is a recovery snapshot for auditability, not an assertion that the service is production-ready.
