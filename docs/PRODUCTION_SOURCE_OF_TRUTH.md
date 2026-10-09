# Production recovery source of truth

## Deployment baseline captured from the live service

Production runs UpStatus 3.0.29 in Supabase function version 390. A source snapshot retrieved during the audit is archived at `archive/production-3.0.29/index.ts`.

Fingerprints recorded at capture:

- Project: `dlfvkawaiqduhlazsszm`
- Function: `upstatus`
- Function version: `390`
- Live deployment source fingerprint reported by Supabase: `ad3ba7f776d1ca49129d8fa1b2a1944710695908ef630ac736ee72ce279dd442`
- Archived repository file SHA-256: `a60b8c5249cf418b0e7a55720799f4bebb82a1daa2c6c50e9f08e1ced3978da8`
- Embedded userscript header: `3.0.29`

The live fingerprint and archived file hash differ. Their serialization/hash relationship has not been confirmed, so they must not be presented as the same hash. The archived function is a recovery reference, not a drop-in build template, because it embeds a specific userscript and deployed version.

## Current repository drift

The release metadata still says 3.0.27 while live production is 3.0.29. The backend template matches the archived backend after generated substitutions. The userscript template is not byte-identical to the archived userscript: production cross-tab leader/follower coordination has been restored in the template, while newer chat-context and call-audio behavior is also present and must be preserved.

## Required reconciliation before any release

1. Review the generated production userscript diff against the archived snapshot. Confirm that the leader/follower lock, follower event delivery, and startup wrapper remain integrated.
2. Run `npm run validate`, `npm run audit:production-drift`, and `npm run test:release-safety` from a clean checkout.
3. Manually test two-client behavior: leader election/failover, duplicate-client exclusion, follower notifications, chat/status updates, and incoming/outgoing calls/audio.
4. For a deliberate recovery of the exact 3.0.29 payload, require byte-for-byte equality with the archived payload. For a new release, document and review every intentional difference instead of forcing equality with the old baseline.
5. Resolve or clearly document the fingerprint serialization discrepancy, then prepare a deliberate version bump. Never deploy this recovery work to production without explicit approval.

Keep this PR in draft and do not merge it until the manual regression checks and remaining source review are complete.
