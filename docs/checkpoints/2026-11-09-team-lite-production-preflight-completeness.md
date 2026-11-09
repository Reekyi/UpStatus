# Team Lite production preflight completeness

Date: 2026-11-09

## QA finding

The independent QA audit `docs/audits/2026-11-09-upstatus-qa-audit-0943-utc.md` identified two P2 gaps in the Team Lite production deploy guard:

1. It checked project status and required migration names, but not the Supabase managed default branch `main` status.
2. It checked only the four Team Lite-required migrations, not whether every already-applied remote production migration had its original local source file.

Fresh read-only Supabase branch inventory confirms production managed branch `main` tracks Git `master`, is the default branch, and currently reports `MIGRATIONS_FAILED`; its preview project status is `ACTIVE_HEALTHY`. Project status alone is therefore not a sufficient deploy gate.

## Candidate changes

- Isolated branch: `fix/team-lite-production-preflight-completeness-20261109`.
- Base: Draft #123 HEAD `b8cd8e15a983b00fd5b1eaca0ffecfd18b9b0d99`.
- Final code HEAD: `68c48bfe22cbbf434f214367b4b1ade48e3bb29c`.
- Draft child PR: [#126](https://github.com/Reekyi/UpStatus/pull/126).

### Managed branch health

`scripts/verify-team-lite-production-project.mjs` now performs a second read-only Management API GET to `/v1/projects/{ref}/branches`.

It requires exactly one default `main` branch, `git_branch=master`, and `status=ACTIVE_HEALTHY`. Missing/malformed branch inventory, duplicate defaults, wrong Git branch, HTTP errors and `MIGRATIONS_FAILED` all fail closed. The parser accepts either the raw branch array or a `{branches:[...]}` wrapper.

The current production branch is `MIGRATIONS_FAILED`; this preflight must reject it even though the project itself is `ACTIVE_HEALTHY`.

### Complete remote/local migration reconciliation

`scripts/verify-team-lite-production-migrations.mjs` now compares every remotely applied migration version/name with local `supabase/migrations/*.sql` filenames.

- Every remote version must have an exact local `{version}_{name}.sql` source filename.
- Duplicate or malformed local/remote versions fail closed.
- Candidate migrations that are local but not yet applied remotely are allowed.
- This checks source-file presence/name only; the Management API does not provide a SQL content checksum here.
- No historical SQL is reconstructed from the current schema.

Independent 404 checks on this candidate confirmed that the four already-applied production migration files remain absent:

- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

The production remote history contains seven migrations through `20261027155438`; the candidate local directory still does not represent all seven. The new preflight must reject this state until original reviewed artifacts are recovered or a separate baseline/reconciliation plan is approved.

### Tests and workflow

- Added mocked tests for healthy main, `MIGRATIONS_FAILED`, wrong tracked Git branch, missing/duplicate default main, complete remote/local history, missing source file, name mismatch and duplicate local version.
- Added a focused offline workflow; it uses fake Management API responses and no Supabase secrets or network.
- Updated the Team Lite dispatcher candidate #125 to require both new helper markers after checking out the release SHA. If #123 alone is integrated without #126, the default-branch dispatcher refuses to proceed.

## Exact-head evidence

- Focused offline contract [42598515834](https://github.com/Reekyi/UpStatus/actions/runs/42598515834) — SUCCESS on code HEAD `68c48bfe22cbbf434f214367b4b1ade48e3bb29c`.
- Job `129096956203`: syntax checks, mocked project/migration deploy contracts, and migration-layout pairing all passed.
- The separate full `UpStatus Validate` on an intermediate code commit `872729459192c312956f94664c34a2583f7c6167` failed with the inherited `production updateURL mismatch` at `scripts/validate.mjs:26`. This is the same master build/manifest issue recorded by QA; it is not a failure in the new preflight contract.
- The child branch is 5 commits ahead / 0 behind #123. No merge was performed.

## Dispatcher dependency

Draft [PR #125](https://github.com/Reekyi/UpStatus/pull/125) now requires `assertTeamLiteProductionMainBranch` and `assertRemoteMigrationsHaveLocalFiles` in the exact Team Lite release candidate before proceeding. Its updated offline guard [42598649482](https://github.com/Reekyi/UpStatus/actions/runs/42598649482) passed on code HEAD `35c9122d5a07a0890c1fafda86cadd3a842f96b1`; its deploy job was skipped.

## Safety boundary

All Supabase inspection remained read-only. No migration, SQL write, fixture, Edge Function deployment, workflow_dispatch, merge, release, secret/role/grant/ACL/policy/flag change or userscript publication occurred. The candidate workflows used only mocked Management API responses. Do not reconstruct the four missing historical SQL files; recover original artifacts or obtain an explicitly reviewed reconciliation plan.
