# Production recovery source of truth

## Deployment baseline captured from the live service

Production runs UpStatus 3.0.29 in Supabase function version 390. The exact deployed `index.ts` is archived at `archive/production-3.0.29/index.ts`, with the live function's source fingerprint recorded in `archive/production-3.0.29/README.md`.

Live fingerprint:

- Project: `dlfvkawaiqduhlazsszm`
- Function: `upstatus`
- Function version: `390`
- Edge Function source SHA-256: `ad3ba7f776d1ca49129d8fa1b2a1944710695908ef630ac736ee72ce279dd442`
- Userscript header: `3.0.29`

## Current repository drift

The current release metadata and template build artifacts are not a reproducible representation of the live 3.0.29 deployment: `release.json` says 3.0.27 and the `src/server/index.template.ts` uses placeholders to generate a function that differs significantly in size from the live function. The archived function is a recovery copy, not a suitable drop-in build template because it embeds a specific userscript and deployed version.

## Required reconciliation before any release

1. Diff the decoded production userscript against the current `src/userscript/upstatus.user.template.js` after rendering placeholders.
2. Port the production changes into the source template and build generator in small, reviewable changes.
3. Generate the production and TEST artifacts from a clean checkout and run `npm run validate` plus `npm run test:release-safety`.
4. Verify that the generated production artifact exactly matches the archived 3.0.29 payload before adjusting release metadata.
5. Only then prepare a separate version bump on TEST. Never deploy this recovery work to production without explicit approval.

Until these checks pass, keep this PR in draft and do not merge it.