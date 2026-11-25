# UpStatus Normal runtime recovery snapshot

Date: 2026-11-25
Status: isolated recovery snapshot, not a release and not merged to master.

## Target
- Supabase project: `mvjqunhjxkbfcrxkjtgf` (organization UpStatus Revived, region sa-east-1)
- Distribution function: `upstatus`, userscript version 3.4.7
- Backend function: `upstatus-screen-share-3-1-1-beta10`, source-declared userscript version 3.1.1-beta8

## Scope and safety
- Runtime sources are preserved here for auditability.
- The old production project remains unchanged.
- No Team Lite code is included.
- Do not merge this branch into master without a separate reviewed release plan.
- Supabase secrets are not stored in GitHub.
- The embedded Normal userscript is configured for the destination Supabase URL and its publishable key.
- Backend initialization prefers the platform-provided SUPABASE_SERVICE_ROLE_KEY before the optional SUPABASE_SECRET_KEYS default entry.

## Migration state
- Public schema reconstructed; 10 application tables and broadcast triggers exist.
- Five user records, five profile records, sanitized state, and visual configuration migrated.
- 302 chat messages, 526 status-history rows, and 6 chat-read cursors migrated.
- Old sessions intentionally not copied; everyone must authenticate again.
- Storage buckets and MIME/size settings exist, but binary object transfer is blocked: the old project's public Storage URLs currently return HTTP 402. No files were copied; old bucket remains intact.
- API smoke test: `/api/members` returned the five expected member names; unauthenticated `/api/status` returned 401 as expected.
- Service-role table grants are configured. Public/anon/authenticated table grants were revoked; RLS remains enabled without direct client policies because the app uses the server-side backend.

## Remaining operational setup
- Set new destination secrets `LUCCA_PASSWORD` and `YCARO_PASSWORD` if those guest portals are still required.
- Copy the 188 Storage objects after the source project's HTTP 402 quota/billing block is resolved.
- Perform an authenticated login and end-to-end checks with the users.

## Runtime files
- `upstatus/index.ts`: destination distribution function source.
- `backend/index.ts`: destination backend/API function source.

This is a recovery snapshot, not an assertion that the service is fully production-ready.
