# Read-only production AUTH-03 migration-history preflight — 2026-11-08

## Candidate

- PR [#89](https://github.com/Reekyi/UpStatus/pull/89), branch `fix/normal-auth03-build-safe-20261108`.
- Exact HEAD: `4224dc31683d4b235e52d2ddcece1570294763f0`.
- Base: PR #88 at `f04d18d780ffc355b6bad457b8a12ef9fe07f82b`.
- Comparison: 30 commits ahead, 0 behind; 22 changed files.
- PR remains open, Draft, unmerged; no human reviews.

## Change

Added `scripts/verify-production-migrations.mjs` and wired it into `.github/workflows/deploy-production.yml` after the existing read-only project/organization check and before Supabase CLI setup/deploy.

The preflight calls the documented Supabase Management API endpoint `GET /v1/projects/{ref}/database/migrations` and requires these exact applied version/name pairs:

- `20261107010000 / setup_invites`
- `20261107060000 / normalize_setup_invite_role`
- `20261107062000 / preserve_setup_invite_roles_verbatim`

It fails closed for wrong/isolated project refs, missing token, HTTP errors, missing versions, duplicate versions, malformed entries, or version/name mismatches. HTTP 403 explains the required `database_migrations_read` scope. Requests use GET, `redirect: "error"`, and a 15-second timeout. The workflow keeps the Management API token step-scoped. No migration is applied by this script or workflow.

Official API reference: https://supabase.com/docs/reference/api/v1-list-migration-history

## Regression coverage

Extended `scripts/test-production-deploy-workflow-guard.mjs`, already invoked by `scripts/validate.mjs`, to verify:

- Migration preflight runs after project identity verification and before CLI setup/deploy.
- The Management API call is GET-only, redirect-rejecting, and bounded by timeout.
- All three required versions/names pass.
- Missing, duplicate, and mismatched history entries fail.
- The exact seven-entry production history observed on 2026-11-08 fails the AUTH-03 preflight.
- An isolated project ref is rejected before any request.
- HTTP 403 fails closed with the `database_migrations_read` permission hint.
- The production workflow still has exactly two function deploy commands and no `db push`/migration application.

Candidate workflow [42486397701](https://github.com/Reekyi/UpStatus/actions/runs/42486397701) **SUCCESS** on the exact HEAD `4224dc3`. It ran full offline Validate, the allowlisted AUTH-03 integration suite in the isolated lab, syntax checks, and cutover regressions. The production migration-history script was tested with mocked fetch; it was not run against production from GitHub Actions.

The AUTH-03 integration runner used only `https://bfpjtfqlnypisxljoxkb.supabase.co`, the existing isolated service-role secret, and explicit mutation opt-in. It covered invalid/expired/replayed tokens, one-winner concurrency, role preservation/non-escalation, and cleanup. Post-run SELECT found 0 users, 0 `__auth_test_*` fixtures, and 0 messages in the lab.

## Current production evidence and gate

The live Supabase migration inventory currently contains only seven versions, through `20261027155438 / set_upstatus_upload_limits_20mb`. None of the three AUTH-03 versions is applied. The unit test embeds that exact observed history and confirms that it is rejected.

Production project `dlfvkawaiqduhlazsszm` is `ACTIVE_HEALTHY`; its managed `main` branch reports `MIGRATIONS_FAILED` while `preview_project_status` is `ACTIVE_HEALTHY`. The root cause remains unverified because branch deployment logs are not available through the connected read-only tools.

Production users: 5 total, 3 stored admins, 0 uninitialized passwords, 0 blank roles. Setup-invite columns and RPC are absent. The cutover remains blocked because `release.json` still uses deployed version 3.4.7 and the required migrations are absent. The existing production deploy workflow remains manual-only; it was not dispatched.

Security snapshot observed 2026-11-08 13:46 UTC:
- 3 SECURITY DEFINER broadcasts callable by anon and authenticated, each with `search_path=public`.
- 9 of 10 audited backend-owned tables have excessive client privileges including TRUNCATE; all 10 have RLS enabled and zero policies.
- `chat-images` and `profile-images` are public; `storage.objects` has zero policies.
- Security Advisor: 6 WARN and 10 INFO.

## Related PR/issue status

- #74 Normal HEAD `9c0133e`: Validate [42451736696](https://github.com/Reekyi/UpStatus/actions/runs/42451736696) and Smoke [42451736729](https://github.com/Reekyi/UpStatus/actions/runs/42451736729) SUCCESS.
- #76 Team Lite HEAD `eb28e88`: Candidate Checks [42450476433](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) SUCCESS.
- #85 HEAD `b75707b`: Validate [42475230911](https://github.com/Reekyi/UpStatus/actions/runs/42475230911) SUCCESS; cutover guard still blocks.
- #88 HEAD `f04d18d`: guard [42478899179](https://github.com/Reekyi/UpStatus/actions/runs/42478899179) SUCCESS.
- #80 HEAD `17eeac9`: Validate [42485867651](https://github.com/Reekyi/UpStatus/actions/runs/42485867651) fails inherited `client signed upload helper missing`.
- #82 HEAD `35fa63c`: Validate [42486103438](https://github.com/Reekyi/UpStatus/actions/runs/42486103438) fails inherited `production updateURL mismatch`.
- #78 remains 0/8 physical acceptance criteria.

No QA-owned branch or `docs/RELEASE_READINESS.md` was modified. No production SQL write, migration, deploy, workflow dispatch, merge, release, userscript publication, secret/role/grant/ACL/policy/flag change, or function deactivation occurred.
