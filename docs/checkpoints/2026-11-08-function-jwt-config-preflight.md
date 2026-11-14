# Function-specific JWT deploy configuration audit — 2026-11-08

## Summary

Two candidate branches now explicitly preserve the current UpStatus custom-session authentication mode when deploying Edge Functions. This closes a configuration gap discovered while reviewing the separate Normal and Team Lite deployment paths.

Supabase documents that `functions.<function_name>.verify_jwt` defaults to `true` unless overridden in `supabase/config.toml` or by the CLI `--no-verify-jwt` flag:
- https://supabase.com/docs/guides/local-development/cli/config
- https://supabase.com/docs/guides/functions/function-configuration

The current production runtimes report `verify_jwt=false`; their handlers authenticate with the custom UpStatus session token. The candidate deployment commands do not pass `--no-verify-jwt`, so each custom-auth function must have an explicit per-function config entry. Without it, a future CLI deployment could change gateway behavior and reject clients before the handler sees their custom token.

## Production snapshot — read-only

Project `dlfvkawaiqduhlazsszm`:
- ACTIVE_HEALTHY; PostgreSQL 17.11.0.002; 7 migrations; 38/38 Edge Functions ACTIVE.
- Operational functions:
  - `upstatus`: v480, `verify_jwt=false`.
  - `upstatus-screen-share-3-1-1-beta10`: v6, `verify_jwt=false`.
  - `upstatus-team-lite`: v15, `verify_jwt=false`.
  - `upstatus-test`: v281, `verify_jwt=false`.
- Team Lite deployed source embeds application version 3.4.30; candidate #91 builds 3.4.31.
- The seven applied migrations still do not include AUTH-03's three setup-invite migrations. Production schema/RPC remains absent.
- The managed branch `main` still reports `MIGRATIONS_FAILED`, while project status and preview status are ACTIVE_HEALTHY. Root cause still requires branch-specific Dashboard logs.

The candidate `supabase/config.toml` on the Normal #89 line explicitly configures `upstatus` and `upstatus-test`, but had no beta10 block. The Team Lite #91 line had no `upstatus-team-lite` block. Both gaps are now covered by separate Draft PRs.

## PR #92 — Team Lite custom-auth JWT config

- [PR #92](https://github.com/Reekyi/UpStatus/pull/92), Draft; base is the exact #91 branch `test/team-lite-built-runtime-parity-20261108`.
- Candidate branch: `fix/team-lite-deploy-jwt-config-guard-20261108`.
- Exact HEAD: `2a1b8c74a255b92fe17844b521b49f184888f852`.
- Comparison: 7 commits ahead / 0 behind #91; 4 changed files.
- Adds `[functions.upstatus-team-lite] verify_jwt = false`.
- Adds `scripts/test-function-jwt-config.mjs`, rejecting missing/true/malformed/duplicate/comment-only settings.
- Wires the check into Team Lite Candidate Checks.
- Exact-head offline build/config workflow [42493683062](https://github.com/Reekyi/UpStatus/actions/runs/42493683062) SUCCESS: built Team Lite 3.4.31, verified generated API/userscript byte parity, and passed positive/negative JWT config regressions.
- PR #92 workflow used no secrets, network calls, Supabase access, fixtures or deploy commands.

## PR #93 — Normal beta10 custom-auth JWT config

- [PR #93](https://github.com/Reekyi/UpStatus/pull/93), Draft; base is the exact #89 branch `fix/normal-auth03-build-safe-20261108`.
- Candidate branch: `fix/normal-beta10-verify-jwt-config-guard-20261108`.
- Exact HEAD: `fb9ccd9b9aa69a329e7340f87fc8b07c82618bbe`.
- Comparison: 5 commits ahead / 0 behind #89; 4 changed files.
- Adds `[functions.upstatus-screen-share-3-1-1-beta10] verify_jwt = false`.
- Adds the generic config guard and invokes it from `scripts/validate.mjs` for `upstatus`, beta10 and `upstatus-test`.
- Exact-head offline full Validate [42493686213](https://github.com/Reekyi/UpStatus/actions/runs/42493686213) SUCCESS: config guard, build, sidecar preservation, production deploy/cutover guards, signed-upload client/server tests, chat regressions, and final `Validation OK: PROD 3.4.7 / TEST 3.4.7`.
- No Supabase secret, network call, fixture, or deploy was used by this workflow.

## PR stack corrections

The PR descriptions for #90 and #91 stated they were stacked on #76, but their GitHub base metadata initially pointed to `team-lite-official`. This would have made their diffs include the entire #76 candidate again. Their bases were corrected to `team-lite/signaling-transport-candidate`, the exact #76 head. The new #92 is stacked on #91. The new #93 is stacked on #89. All remain Draft and unmerged.

## Current PR/CI snapshot

- #74 Normal HEAD `974afa23be3f66b5d20ee5e9391c2c69a958e249`: Validate [41692984901](https://github.com/Reekyi/UpStatus/actions/runs/41692984901) and Signaling Smoke [41692984911](https://github.com/Reekyi/UpStatus/actions/runs/41692984911) SUCCESS on exact head (historical 2026-11-03 run; no newer exact-head run observed).
- #75 baseline HEAD `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`: Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) PASS historical.
- #76 Team Lite HEAD `eb28e88325d7e8a6236d9050bebabf794d64a8c4`: Candidate Checks [42450476433](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) SUCCESS.
- #80 continuity HEAD `635265e8879c819683abccf2b787fc1f559a70e7`: Validate [42488189106](https://github.com/Reekyi/UpStatus/actions/runs/42488189106) FAILURE at inherited `client signed upload helper missing` (`scripts/validate.mjs:55`).
- #82 QA HEAD `588e5c0500b0a6fcd81dfa6a14780739fad87977`: Validate [42490869141](https://github.com/Reekyi/UpStatus/actions/runs/42490869141) FAILURE at inherited `production updateURL mismatch` (`scripts/validate.mjs:26`).
- #85 HEAD `b75707b6eaf678d87863144748b9aed8e2866455`: Validate [42475230911](https://github.com/Reekyi/UpStatus/actions/runs/42475230911) SUCCESS, but its cutover diagnostic remains BLOCKED.
- #88 HEAD `f04d18d780ffc355b6bad457b8a12ef9fe07f82b`: offline guard [42478899179](https://github.com/Reekyi/UpStatus/actions/runs/42478899179) SUCCESS.
- #89 HEAD `4224dc31683d4b235e52d2ddcece1570294763f0`: candidate workflow [42486397701](https://github.com/Reekyi/UpStatus/actions/runs/42486397701) SUCCESS, including isolated AUTH-03 RPC integration and cleanup.
- #90 HEAD `47e0b8760587e52448cf5954d823b00131b941fa`: offline runner safety [42487717033](https://github.com/Reekyi/UpStatus/actions/runs/42487717033) SUCCESS.
- #91 HEAD `cb65cb831910d384715addf98285d01a273e2c6a`: Team Lite artifact parity [42488110607](https://github.com/Reekyi/UpStatus/actions/runs/42488110607) SUCCESS.
- #92 HEAD `2a1b8c74a255b92fe17844b521b49f184888f852`: [42493683062](https://github.com/Reekyi/UpStatus/actions/runs/42493683062) SUCCESS.
- #93 HEAD `fb9ccd9b9aa69a329e7340f87fc8b07c82618bbe`: [42493686213](https://github.com/Reekyi/UpStatus/actions/runs/42493686213) SUCCESS.

All candidate PRs remain Draft; no human review was submitted in this run. The #80/#82 failures remain inherited base-contract failures and were not weakened.

## QA coordination and remaining release gates

Read the latest independent `docs/RELEASE_READINESS.md` at QA branch #82 HEAD `588e5c0500b0a6fcd81dfa6a14780739fad87977`. It records additional operational gates:
1. No admin UI currently calls `/api/setup-invite`; first-access users can enter a token, but administrators lack a visible issue/copy flow. Add an admin-only UI or document a secure provisioning procedure; do not log tokens.
2. The migration→deploy window leaves legacy first-caller setup active. Freeze onboarding/provisioning for the entire window or add a compatible database guard before applying migrations.
3. Rollout must cover beta10, upstatus, Team Lite and upstatus-test, with rollback per runtime.
4. Migration-history preflight confirms ledger entries only; add a read-only catalog check for columns, RPC signature, SECURITY INVOKER, empty search_path and effective ACLs after migration.
5. Confirm the Management API token has `database_migrations_read`; scope is not observable from the current secret and was not changed.

QA's document also records:
- Production Security Advisor: 6 WARN / 10 INFO.
- Three public SECURITY DEFINER broadcasts.
- Nine of ten backend-owned tables with excessive client grants, including TRUNCATE.
- `realtime.messages`: 50 rows / 7 partitions.
- Storage buckets public, zero object policies.
- Lab signal helper remains v32 and does not map `VOICE_ATTEMPT_ALREADY_ACTIVE` to HTTP 409.
- Issue #78 remains 0/8 physical; Issue #79 body remains 16/35 and needs reconciliation.

The independent QA branch and `docs/RELEASE_READINESS.md` were not edited. Coordination is requested through a new comment on PR #82.

## Safety

All production Supabase work this run was read-only: Management API metadata/source reads, migrations list, advisors and SELECT/catalog queries. No production migration, SQL write, deploy, workflow dispatch, merge, release, userscript publication, secret, role, grant, ACL, policy, feature flag or function deactivation occurred. The new CI workflows were offline-only; no Supabase project was contacted by PR #92/#93 tests. No lab fixture mutation was run in this execution.
