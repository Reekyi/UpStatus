# Team Lite production dispatcher on the default branch

Date: 2026-11-09

## Finding and live repository evidence

- Repository default branch is `master`, HEAD `9d40461babcec8eb8686c2a04be9c675df7da381`.
- `master` contains the Normal `.github/workflows/deploy-production.yml`; it does not contain the Team Lite workflow added by Draft PR #123. A read-only Contents API request for `.github/workflows/team-lite-production-deploy-guard.yml` on `master` returned 404.
- Draft PR #123 is stacked on `team-lite/signaling-transport-candidate`, not yet on `team-lite-official`. Its manual-only workflow is therefore not present on the default branch and cannot serve as the repository's default-branch workflow-dispatch entry point.
- Branch metadata at this checkpoint: `master`, `develop`, and `team-lite-official` all report `protected=false`; repository rulesets endpoint returned zero rulesets. The dispatcher therefore enforces review provenance itself rather than assuming branch protection.

## Candidate implementation

- Isolated branch: `fix/team-lite-production-dispatcher-master-20261109`.
- Base: `master` at `9d40461babcec8eb8686c2a04be9c675df7da381`.
- Final code HEAD: `6c67bfe2ba6751b81fe160189f3683e8091a54b6`.
- Adds `.github/workflows/deploy-team-lite-production.yml` on the master-based candidate. It is a separate workflow; the existing Normal `deploy-production.yml` is untouched.
- Adds an offline contract test at `scripts/test-team-lite-production-dispatcher.mjs`.
- The workflow is manual-dispatch only for deployment. Push/PR events run only the offline guard. It will become dispatchable only after the workflow file is merged into the default branch; no merge was performed here.
- Inputs require the exact `team-lite-official` HEAD SHA, the merged PR number that produced it, the exact Team Lite release version, and an explicit production confirmation that defaults to false.
- Before checkout/deploy it verifies: dispatch from `master`; the supplied SHA equals current `team-lite-official` HEAD; the supplied PR is merged into `team-lite-official`; the PR merge commit equals the supplied SHA; the latest non-dismissed review is APPROVED by someone other than the PR author; and all PR-head check runs are completed with success or explicitly skipped conclusions. Incomplete one-page review/check histories fail closed.
- It checks out the exact SHA, verifies the checkout, runs Team Lite release/build/candidate/migration-layout contracts, verifies production project and applied migration history through read-only Management API calls, pins Supabase CLI 2.122.1, and contains exactly one deployment command: `upstatus-team-lite` with `--no-verify-jwt`.
- The workflow never applies migrations and cannot target Normal `upstatus`, TEST, or the signaling fixture function.

## Exact-head validation

- Final offline guard run: [42597677555](https://github.com/Reekyi/UpStatus/actions/runs/42597677555) — SUCCESS on `6c67bfe2ba6751b81fe160189f3683e8091a54b6`.
- Job `129094225368`: Node syntax check and `scripts/test-team-lite-production-dispatcher.mjs` passed. The deploy job was skipped because this was a push-triggered guard run.
- An intermediate test-only failure [42597592272](https://github.com/Reekyi/UpStatus/actions/runs/42597592272) was caused by a regex in the new assertion expecting whitespace in the shell `-ge 100` operator. The assertion was corrected; the final exact-head run above passed.
- Earlier successful guard runs on intermediate heads are not used as final-head evidence.

## Current runtime and why deployment remains blocked

Read-only Supabase inventory and SQL catalog checks:

- Production `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, seven migrations through `20261027155438`, 38 ACTIVE Edge Functions; Normal v480, Team Lite v15, TEST v281, beta10 v6.
- Production has no `setup_token_hash` column, no `consume_upstatus_setup_invite` RPC, and no `merge_chat_read_receipts` RPC. Aggregate read-only check found zero accounts without password hashes and zero accounts without roles; this does not remove the latent first-setup route risk.
- Isolated lab `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 38 migrations, two signaling test functions. The setup-token column, setup-invite RPC, and merge-chat-read-receipts RPC are present there.
- The production deploy guard in #123 requires the three AUTH-03 migrations plus `20261109090000_atomic_chat_read_receipts_and_visual_config_grants`. None is in the current production migration history. The dispatcher must fail its migration preflight today.
- Current `team-lite-official` HEAD remains `9065bc1536fde64f437f6f12b7abb9b072cb8281`; it does not yet contain the reviewed deploy helper scripts from #123. The dispatcher checks required files and fails closed until the Team Lite candidate stack is reviewed and integrated.

## Required PR/issue and QA coordination

- Draft [PR #123](https://github.com/Reekyi/UpStatus/pull/123) still needs human review and its base/stack must be reconciled deliberately before the official branch contains the guard helpers.
- Draft [PR #125](https://github.com/Reekyi/UpStatus/pull/125) contains this default-branch dispatcher candidate.
- #80 remains open/Draft; latest HEAD `247b7a31a70e8f07ed2bb149bd650d54654c32e8`, Validate [42595116112](https://github.com/Reekyi/UpStatus/actions/runs/42595116112) fails the inherited `client signed upload helper missing` assertion at `scripts/validate.mjs:55).
- #82 remains open/Draft and independent. Latest QA HEAD `44d842043dcbb05f83335837aec80e2ed9c4682e`, Validate [42596403077](https://github.com/Reekyi/UpStatus/actions/runs/42596403077) fails the inherited `production updateURL mismatch` assertion at `scripts/validate.mjs:26). QA branch and audit files were not edited.
- Issue #78 remains OPEN at 0/8 physical acceptance checks. Issue #79 remains OPEN at the historical 16/35 checklist count; this is not a release percentage.
- The connector returned an empty content payload for `docs/RELEASE_READINESS.md` despite its blob being present. The independent QA audit `2026-11-09-upstatus-qa-audit-0751-utc.md` and Issue #79 were read and used; do not claim the full release-readiness file was read through this connector.

## Safety boundary

No Supabase SQL write, migration, fixture mutation, Edge Function deployment, workflow_dispatch, secret/role/grant/ACL/policy/flag change, merge, release, userscript publication, or destructive operation occurred. Production and the shared lab remained read-only. The final CI run exercised only the offline guard; it did not contact Supabase.
