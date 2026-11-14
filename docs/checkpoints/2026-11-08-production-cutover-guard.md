# Production API cutover guard checkpoint — 2026-11-08 07:10 BRT

## Summary

A fail-closed preflight was added to the Draft production-deploy candidate PR #85. It prevents the manual production workflow from deploying the Normal distribution function while the generated userscript still targets a different API function that is neither deployed by the workflow nor versioned in the repository.

This is a candidate-only safeguard. It does not perform a cutover, deployment, release, or authorization to dispatch the production workflow.

## Confirmed mismatch

The current Normal build configuration has two distinct endpoints:

- Userscript update/download artifact: `/functions/v1/upstatus/upstatus.user.js`.
- Runtime API base: `https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus-screen-share-3-1-1-beta10`.

The Draft production workflow in PR #85 deploys only `upstatus`.

The production beta10 function is ACTIVE v6 and remains a live compatibility endpoint. Its source is not present under `supabase/functions/upstatus-screen-share-3-1-1-beta10/` in the PR #85 candidate. Therefore deploying only `upstatus` would update the distribution artifact without updating the API runtime used by the generated Normal userscript.

## Candidate implementation in PR #85

Current PR #85 HEAD: `c53f1bd23988de50fa21f62e18bcc9f817792ee8`.

- `scripts/build.mjs` now records `productionApiFunction` and `productionApiBase` in `dist/build-manifest.json`.
- `scripts/verify-production-cutover.mjs` compares the distribution function, API function, API URL host/path, deploy commands in `deploy-production.yml`, and the presence of versioned/generated function sources.
- `.github/workflows/deploy-production.yml` runs the verifier with `--enforce` after build validation and before Management API preflight, CLI setup, or any deploy command.
- `scripts/test-production-cutover-guard.mjs` covers an aligned release, the current beta10/upstatus mismatch, a deployed-but-unversioned API source, a wrong project host, and an incomplete manifest.
- The existing production workflow guard test now asserts that the cutover check runs before the project preflight.

The guard is intentionally fail-closed. It does not infer that beta10 is safe to deploy merely because it is ACTIVE. The beta10 source must first be recovered, reviewed, versioned, and tested, or the client API target must be deliberately changed to a candidate runtime that is included in the same coordinated release.

## Validation evidence

- Local Node.js 22.16.0: `node --check` passed for both new scripts.
- Local offline regression: all production-cutover guard scenarios passed.
- Local enforcement simulation: the current beta10/upstatus mismatch produced exit code 1 with two explicit blockers: beta10 is not in the deploy workflow and its source is not versioned/generated.
- Exact-head GitHub Validate: [run 42470236560](https://github.com/Reekyi/UpStatus/actions/runs/42470236560) SUCCESS on `c53f1bd`.
- Job log confirms the existing production workflow guard passed, the new cutover regression passed, and the non-enforcing diagnostic printed:
  - `upstatus-screen-share-3-1-1-beta10` is not deployed by the workflow;
  - its source is not versioned/generated.
- The Validate job completed with `Validation OK: PROD 3.4.7 / TEST 3.4.7`.

The production workflow itself was **not** dispatched. Its `--enforce` gate would currently stop before the Management API check, CLI setup, or deploy step.

## Live PR and CI snapshot

All tracked PRs remain OPEN, Draft, unmerged, and have zero submitted human reviews.

| PR | Current HEAD | Base | Ahead / behind | Exact current evidence |
|---|---|---|---:|---|
| #74 Normal | `9c0133e8cf6bd85ac8993888718a408db2f24a3e` | master | 877 / 0 | Validate [42451736696](https://github.com/Reekyi/UpStatus/actions/runs/42451736696) PASS; Signaling Smoke [42451736729](https://github.com/Reekyi/UpStatus/actions/runs/42451736729) PASS |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official | 59 / 0 | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) historical PASS |
| #76 Team Lite candidate | `eb28e88325d7e8a6236d9050bebabf794d64a8c4` | team-lite-official | 364 / 0 | Candidate Checks [42450476433](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) PASS |
| #80 Continuity | `f40118d8c844d5372cd685c66ee4ca18ac6e8afc` | develop | 229 / 0 | Validate [42466057648](https://github.com/Reekyi/UpStatus/actions/runs/42466057648) FAIL: inherited `client signed upload helper missing` at `scripts/validate.mjs:55` |
| #82 Independent QA | `adb9a4562d8b502e9bd4ef6abf55e3c1254b59e0` | master | 123 / 0 | Validate [42468055308](https://github.com/Reekyi/UpStatus/actions/runs/42468055308) FAIL: inherited `production updateURL mismatch` at `scripts/validate.mjs:26` |
| #84 TEST isolation | `21341f331270e142bdf7584c1cdf16e6011e41b3` | develop | 30 / 0 | Validate [42387042361](https://github.com/Reekyi/UpStatus/actions/runs/42387042361) PASS |
| #85 Production guard | `c53f1bd23988de50fa21f62e18bcc9f817792ee8` | master | 31 / 0 | Validate [42470236560](https://github.com/Reekyi/UpStatus/actions/runs/42470236560) PASS; deployment workflow remains manual-only and unexecuted |

The #82 PR HEAD is now `adb9a456`; the latest status table inside the QA-owned `docs/RELEASE_READINESS.md` still records an earlier #82 HEAD. Engineering did not edit the QA branch or that file. QA should refresh its exact-ref table on its own branch.

## Supabase read-only revalidation

The organization still has exactly two ACTIVE_HEALTHY projects:

- Production `dlfvkawaiqduhlazsszm`: PostgreSQL 17.11.0.002, 7 migrations, 38 ACTIVE Edge Functions.
- Isolated signaling lab `bfpjtfqlnypisxljoxkb`: PostgreSQL 17.11.0.003, 38 migrations, two ACTIVE test functions.
- No independent full-product TEST project exists.

Production runtime metadata confirms:

- `upstatus` v480.
- `upstatus-team-lite` v15.
- `upstatus-test` v281.
- `upstatus-screen-share-3-1-1-beta10` v6.

A fresh production SQL SELECT at 2026-11-08 10:06 UTC confirmed 5 users, 3 explicit `implementation_admin` accounts, no blank roles/password hashes, three public SECURITY DEFINER broadcast functions with `search_path=public` and EXECUTE effective for anon/authenticated, and nine backend-owned tables with RLS/no policies but excessive client grants including TRUNCATE. `realtime.messages` still has 50 rows across 7 partitions. Default ACLs remain broad for postgres and supabase_admin; the SQL session is not a member of supabase_admin.

Production Security Advisor at 10:06 UTC: 3 anon SECURITY DEFINER WARN, 3 authenticated SECURITY DEFINER WARN, and 10 RLS/no-policy INFO. Health Advisor is empty.

The isolated `upstatus-signal-test` remains v32. Its deployed HTTP mapper still lacks `VOICE_ATTEMPT_ALREADY_ACTIVE` → HTTP 409; the candidate offline mapper contract does not substitute for a deployed HTTP test.

## Remaining release gates

1. Recover and review the exact beta10 source or deliberately change the API target to a versioned candidate runtime; validate both distribution and API endpoints together.
2. Preserve beta10 until client dependencies and a rollback path are proven; the available log window is incomplete and does not prove historical non-use.
3. Keep RT-01/private or server-mediated Realtime, AUTH-02, live Deno AUTH-03, ACL/default-ACL remediation, real Storage E2E, and full-product TEST open.
4. Complete real Tampermonkey/device/network recovery and cross-client acceptance. Issue #78 remains OPEN at 0/8 physical criteria.
5. Obtain human reviews and explicit release authorization.

All production database operations in this checkpoint were SELECT/catalog-only. No production write, migration, Edge Function deployment, workflow dispatch, merge, release, userscript publication, secret/role/grant/ACL/policy/feature-flag change, function deactivation, or destructive operation occurred. PR #74/#76 and the QA branch were not modified.
