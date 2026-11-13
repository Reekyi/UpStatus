# UpStatus engineering checkpoint — 2026-11-09 14:01 UTC

This checkpoint records a fresh read-only revalidation. It does not supersede the independent QA audit or authorize deployment.

## GitHub refs and CI

- Repository default branch: `master`.
- Branch refs observed: master `9d40461babcec8eb8686c2a04be9c675df7da381`; develop `6b33e1e26ad105143f00372ae6d0f2fa52df60d6`; team-lite-official `9065bc1536fde64f437f6f12b7abb9b072cb8281`.
- #74 Normal: `9c0133e8cf6bd85ac8993888718a408db2f24a3e`, Draft/open; Validate 42451736696 and Signaling Smoke 42451736729 SUCCESS.
- #75 Team Lite baseline: `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`, Draft/open; Candidate Checks 41674353127 is historical PASS. #76 descends from this baseline; do not integrate both independently.
- #76 Team Lite: `eb28e88325d7e8a6236d9050bebabf794d64a8c4`, Draft/open; Candidate Checks 42450476433 SUCCESS.
- #80 continuity: `325be78d4126f7100543980187d08c850f8395e8`, Draft/open; exact-head Validate 42622898493 FAIL at `scripts/validate.mjs:55`, `client signed upload helper missing`.
- #82 independent QA: `9ff1478d00fd3823f9c7f606ee8075518167e694`, Draft/open; Validate 42620208784 FAIL at `scripts/validate.mjs:26`, `production updateURL mismatch`.
- #85 master stabilization: `b75707b6eaf678d87863144748b9aed8e2866455`, Draft/open; Validate 42475230911 SUCCESS.
- #123/#126 deploy preflight candidates and #127 migration provenance remain Draft. #126 focused workflow 42598779957 SUCCESS; #127 focused workflows 42615124790 and 42615130073 SUCCESS on `4ddd703287d8b17f29e3b28880cf0b1ef533f5fb`.
- #125 dispatcher remains Draft: offline guard 42598656306 SUCCESS, but full Validate 42598656421 FAIL on the inherited updateURL contract; deploy job was SKIPPED.
- #128 exact-head review-provenance guard remains Draft; focused workflow 42614800302 SUCCESS on `cb38853c4ac79932159715c8eafa8287fc884cb1`.
- Reviews query returned no reviews for #74, #76, #127 or #128. GitHub branch-protection endpoint returned 403; rulesets endpoint returned an empty list. Branch protection therefore remains unverified, not assumed.
- #124 current patch contains five files, including the signed-upload client/server changes and two new VM tests; it is not validator-only. Its server test mocks Storage and `uploadFile()`, so it does not exercise actual byte sniffing or a real upload. #124 targets develop and does not establish Team Lite parity.

## Supabase read-only snapshot

Only two projects are listed:
- Production `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, seven migrations, 38 ACTIVE Edge Functions. `upstatus` v480, `upstatus-team-lite` v15, `upstatus-test` v281, beta10 v6; no dedicated `upstatus-signal`.
- Lab `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 38 migrations, Signal Test v32 and Signal E2E v3. No Storage buckets are present in the lab.

Production managed branch `main` remains `MIGRATIONS_FAILED` while the project is ACTIVE_HEALTHY. Remote history has seven migrations; four applied SQL source files remain missing locally. Do not synthesize them from the live schema.

Fresh production SELECT of `realtime.messages` returned 55 rows, all `private=false`, on the legacy topic:
- 45 `user_status`
- 8 `db_change`
- 1 `remote_command`
- 1 `remote_result`

This is a row/catalog observation, not proof of external exploitation or successful delivery to subscribers. It is an increase from the prior 52-row snapshot and expands the exposed event types.

Production Storage has two public buckets, `chat-images` and `profile-images`, each with a 20 MiB limit. A fresh catalog query found no lab buckets. Existing audit evidence records zero policies on `storage.objects`. Production Security Advisor observed 6 WARN and 10 INFO; lab observed 0 WARN and 17 INFO.

## Upload byte-validation review

The current Normal and Team Lite templates still have `sniffMime()` fallback to the client-declared MIME for document/text formats. The legacy upload path therefore does not strictly verify bytes for those formats. The signed-upload route validates declared MIME/size and creates a direct signed upload to a public bucket without seeing the bytes.

The current #124 VM server test extracts `profileRoute` and `signedUploadRoute`, but mocks `uploadFile()` and Storage; it does not test `sniffMime()` or uploaded bytes. This is code inspection, not an exploit reproduction.

A safe fix needs a pre-publication validation boundary, most plausibly a private quarantine bucket plus authenticated finalize/inspect/publish flow, or a server-mediated upload only if platform request-size/memory limits are proven for the supported file sizes. The lab currently has no buckets, and no QA-authorized mutation window was present. Do not change bucket privacy or upload behavior until that design is reviewed and the lab is authorized.

## Release decision

**DO NOT RELEASE.** Open gates include AUTH-03 first-access enrollment, migration-history recovery, authenticated signaling/RT-01, server-verifiable anti-replay, Storage byte validation/privacy, branch/review governance, and all eight physical acceptance checks in #78. Issue #78 remains 0/8 physical; #79's 16/35 is historical checklist state, not a readiness percentage.

All Supabase operations in this checkpoint were SELECT/catalog/inventory reads. No migration, SQL write, fixture, upload, deploy, workflow dispatch, merge, release, secret/variable/permission/role/grant/ACL/policy/flag change or userscript publication occurred. The QA branch and audit files were not modified.
