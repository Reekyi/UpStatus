# Engineering checkpoint — 2026-11-09 12:55 UTC

Read-only engineering revalidation. No product code, QA branch, or Supabase resource was changed.

## Exact GitHub state

- #74 Normal: open/Draft, HEAD 9c0133e8cf6bd85ac8993888718a408db2f24a3e; Validate 42451736696 and Signaling Smoke 42451736729 PASS.
- #75 Team Lite baseline: open/Draft, HEAD 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309; Candidate Checks 41674353127 PASS historical only. #76 is the current Team Lite line.
- #76 Team Lite: open/Draft, HEAD eb28e88325d7e8a6236d9050bebabf794d64a8c4; Candidate Checks 42450476433 PASS.
- #80 continuity: open/Draft, HEAD b794af23764da8a0bc0117ba794d0f5457ab08d0; Validate 42615571593 FAIL at scripts/validate.mjs:55, inherited client signed upload helper missing.
- #82 QA: open/Draft, HEAD 9ff1478d00fd3823f9c7f606ee8075518167e694; Validate 42620208784 FAIL at scripts/validate.mjs:26, inherited production updateURL mismatch. The latest head change is documentation-only.
- #85 master URL/admin candidate: open/Draft, HEAD b75707b6eaf678d87863144748b9aed8e2866455; Validate 42475230911 PASS, not integrated.
- #123 Team Lite deploy guard: open/Draft, HEAD b8cd8e15a983b00fd5b1eaca0ffecfd18b9b0d99; focused guard 42589119358 PASS.
- #125 master dispatcher: open/Draft, HEAD 35c9122d5a07a0890c1fafda86cadd3a842f96b1; dispatcher guard 42598656306 PASS with deploy job SKIPPED; repository Validate 42598656421 FAIL at updateURL.
- #126 production preflight: open/Draft, HEAD 048f74c7987c02225260605480a535c3808ebcfa; focused offline contract 42598779957 PASS.
- #127 migration content provenance: open/Draft, HEAD 4ddd703287d8b17f29e3b28880cf0b1ef533f5fb; focused workflows 42615124790 and 42615130073 PASS.
- #128 exact-head release review: open/Draft, HEAD cb38853c4ac79932159715c8eafa8287fc884cb1; focused workflow 42614800302 PASS.

The #126–#128 focused workflows are offline contracts, not live Supabase tests or full release validation. No human reviews were returned for the reviewed candidate PRs. GitHub rulesets query returned zero; branch-protection endpoint returned 403, so individual branch protection is NOT VERIFIED. The UPSTATUS_RELEASE_REVIEWERS variable and production Environment reviewers remain unverified.

## Additional signed-upload finding (CODE INSPECTION)

Normal server template blob e5fcaf88cad0018ef19dcdde11f1249132412963: sniffMime() starts at line 300 and falls through to return declared at line 310; legacy uploadFile() calls it at lines 315–317. mediaRoute() allows PDF, Office, CSV, text and RTF MIME values and passes data URLs to uploadFile().

Team Lite server template blob c2367c8bd5ebdd2d2149803f7dc62c1c5aa6fcac has the same fallback at lines 330–340 and calls it from uploadFile() at lines 345–347.

For formats without a signature check (notably PDF/Office/text/RTF), arbitrary bytes wrapped in a data URL declaring an allowed MIME can fall through as the declared MIME and be uploaded by the legacy path. This is not byte validation.

The direct signed paths (Normal around line 504; Team Lite around line 549) accept client-declared MIME/size, create a signed upload URL with upsert=true, and return it without seeing object bytes. The object is written directly to a public bucket.

The server regression harness scripts/test-signed-upload-server.mjs, blob f58a5b1b99ea30bf547a41eea58cd054d0457407, mocks uploadFile; it tests URL metadata/origin/path, not actual bytes or magic-byte validation.

Classification: CODE INSPECTION, not a reproduced exploit. No upload was attempted. Because buckets are public, validation after upload leaves an exposure window. A release-safe design must validate bytes before public publication (private quarantine plus authenticated finalize/copy, or a proven server-mediated upload) and harden the legacy sniffing path. No bucket privacy or upload behavior was changed.

## Supabase read-only snapshot

Production dlfvkawaiqduhlazsszm: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, seven remote migrations through 20261027155438, 38/38 Edge Functions ACTIVE, managed main=MIGRATIONS_FAILED, preview ACTIVE_HEALTHY. Runtimes: upstatus v480, upstatus-team-lite v15, upstatus-test v281, beta10 v6; no production upstatus-signal.

Laboratory bfpjtfqlnypisxljoxkb: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 38 migrations, signal-test v32 and signal-e2e-once v3. Read-only check: zero Realtime rows and zero Storage buckets; no mutating fixtures were run.

Fresh production SELECT/catalog results: 52 Realtime rows, all private=false (44 user_status, 8 db_change); ten RLS-enabled/no-policy tables; nine tables with client TRUNCATE; 24 default ACL entries; two public Storage buckets; zero storage.objects policies. Security Advisor 6 WARN / 10 INFO; Performance and Health no findings. Lab Security Advisor 0 WARN / 17 INFO.

## Release gates

1. Recover the four original production migration SQL files; do not reconstruct from live schema.
2. Resolve managed-main migration history and keep #126/#127 fail-closed.
3. Close AUTH-03 on both installed runtimes; remove first-caller setup and name-based admin fallback.
4. Replace public Realtime signaling/broadcast trust with server-authenticated sender/membership checks and private transport as the safe default.
5. Decide and implement byte validation before public Storage publication; resolve the legacy MIME fallback.
6. Integrate retry fixes #120/#122 into main candidates and keep anti-replay with a new key as a separate server-side gate.
7. Obtain human reviews, verify release-review allowlist and Environment protection, and resolve build/CI failures.
8. Complete the eight physical Tampermonkey acceptance criteria in Issue #78. Current state 0/8; Issue #79 remains 16/35 historical checklist items, not a release percentage.

## Safety record

Production and laboratory were queried read-only. No migration, SQL write, fixture, upload, deploy, workflow dispatch, merge, release, userscript publication, secret/variable/role/grant/ACL/policy/flag change, or destructive operation occurred. QA branch and audit files were not modified. Decision: DO NOT RELEASE.