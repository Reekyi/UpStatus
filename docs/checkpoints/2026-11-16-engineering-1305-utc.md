# Engineering checkpoint — 2026-11-16 13:05 UTC

This is a read-only engineering checkpoint. It supersedes the 12:44 UTC snapshot for live GitHub, CI, Supabase and release-readiness observations. It does not authorize merge, deployment, release, publication, production writes, billing changes or destructive operations.

## GitHub refs and mandatory PRs

Official refs observed:
- `master`: `9d40461babcec8eb8686c2a04be9c675df7da381`
- `develop`: `6b33e1e26ad105143f00372ae6d0f2fa52df60d6`
- `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`
- Branch protection API reports `protected=false` for master, develop and team-lite-official.

All mandatory PRs remain open, Draft, unmerged and without submitted reviews:
- #74 Normal: `dcaf6a072546eda0089e0cee4018c3047011f600`, 887 commits, 90 files. Validate [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) and Smoke [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) passed on this exact head.
- #75 Team Lite baseline: `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`, 59 commits, 10 files. Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) is a historical pass on this unchanged baseline.
- #76 Team Lite: `00a578e9174e08238a1289a35feb02d171625421`, 389 commits, 59 files. Candidate Checks [43868863235](https://github.com/Reekyi/UpStatus/actions/runs/43868863235) failed overall: `signed-upload-contracts` passed, while `candidate-checks` failed when the isolated endpoint returned HTTP 402. Later authenticated/browser/rate-limit/migration steps were skipped.
- #80 continuity: `46541cad8b5592e183406ed2d78afc2b43c47bff`, 320 commits, 22 files. Validate [43651529898](https://github.com/Reekyi/UpStatus/actions/runs/43651529898) fails with `client signed upload helper missing`.
- #82 QA: `789e94f6f98ba08b468725d437a0c54843c62138`, 368 commits, 207 files. Latest Validate [43869616955](https://github.com/Reekyi/UpStatus/actions/runs/43869616955) fails with inherited `production updateURL mismatch`.

Related candidates:
- #167 Validate [43784897392](https://github.com/Reekyi/UpStatus/actions/runs/43784897392) passed.
- #168 Validate [43755941462](https://github.com/Reekyi/UpStatus/actions/runs/43755941462) passed.
- #171 authorization regression [43814131143](https://github.com/Reekyi/UpStatus/actions/runs/43814131143) passed.
- #174 Validate [43802407509](https://github.com/Reekyi/UpStatus/actions/runs/43802407509) passed.
- #175 targeted authorization regression [43808590208](https://github.com/Reekyi/UpStatus/actions/runs/43808590208) passed, but full Validate [43808590131](https://github.com/Reekyi/UpStatus/actions/runs/43808590131) failed on the inherited upload helper assertion.

The latest independent QA report is [2026-11-16 12:45 UTC](../audits/2026-11-16-upstatus-qa-audit-1245-utc.md). The live #82 head advanced after that report to `789e94f`; its exact-head Validate failure is recorded above. The QA branch and QA-owned comment were not modified.

## Supabase runtime and availability

Both projects report `ACTIVE_HEALTHY`:
- Production: `dlfvkawaiqduhlazsszm`.
- Isolated signaling lab: `bfpjtfqlnypisxljoxkb`. This is not a Full-Product TEST environment.

Production inventory:
- 38 ACTIVE Edge Functions; operational versions: Normal `upstatus` v480, TEST `upstatus-test` v281, Team Lite `upstatus-team-lite` v15, legacy beta10 v6.
- All four inspected operational functions report `verify_jwt=false`; application-level authentication still needs to be considered separately.
- 7 migration ledger entries.
- 106/106 Realtime messages have `private=false`.
- 10 public tables have RLS enabled and no policies; 126 anon/authenticated table-grant entries in public, including 18 TRUNCATE grants per the independent QA catalog audit.
- 6 public default-ACL entries remain broad.
- 3 SECURITY DEFINER broadcast functions remain executable by client roles.
- Storage: public `chat-images` and `profile-images` buckets, 188 objects, zero Storage policies. Both buckets have a 20 MiB limit.
- The four installed runtimes still contain the legacy `login(req,true)` setup path in the inspected sources.

Read-only log aggregation for 2026-11-15 13:05 UTC through 2026-11-16 13:05 UTC:
- Production: 12,720 HTTP 402 responses across function Edge logs. Main paths: beta10 `/api/chat` 6,724; `/api/status` 2,970; `/api/remote-status` 2,968; smaller counts on account/me/members and two script-download requests.
- Production last-hour window (12:05–13:05 UTC): 9,883 HTTP 402 responses.
- Lab: 48 HTTP 402 responses across the 14 `upstatus-signal-test` routes; the same count appears in the last-hour window.
- The lab workflow response explicitly states `exceed_edge_functions_invocations_quota` and instructs the project owner to upgrade the plan or remove spend caps. Production logs expose status/request metadata but not the response body; do not attribute production 402s to the same quota cause without evidence.

The production Security Advisor reports 10 INFO findings for RLS-enabled/no-policy tables and 6 WARN findings (the three broadcast functions are executable by anon and authenticated). No database writes were performed.

Lab inventory:
- 39 migrations and two test Edge Functions.
- No managed Supabase branches.
- No Full-Product fixtures, Realtime rows, buckets or Storage objects according to the independent QA inventory.
- Candidate Checks cannot complete authenticated endpoint/browser validation while Edge Functions return 402.

## Migration provenance and issues

- Production ledger contains seven versions, but the four original SQL files remain absent from `master/supabase/migrations` (404): `20261023154754`, `20261026195855`, `20261027154329`, `20261027155438`.
- Production managed branch `main` remains `MIGRATIONS_FAILED`; its preview project status is ACTIVE_HEALTHY. Cause remains undiagnosed.
- Issue #78 remains open with all eight physical reconnect criteria unchecked. No physical no-F5 test was performed in this execution.
- Issue #79 remains open; its historical checklist count is 16/35. The dedicated Engineering comment was updated in place; the separate QA comment was preserved.

## Gates and next actions

| Gate | State | Evidence / next action |
|---|---|---|
| RT-01 | BLOCKED | Public Realtime messages and broad client grants remain; design and validate private authenticated transport before rollout. |
| TEST-ISOLATION | BLOCKED | Lab Edge quota is exhausted; restore service and provision a separate Full-Product TEST project. |
| MIGRATION-PROVENANCE | BLOCKED | Recover the four original SQL sources; do not reconstruct from ledger names. |
| AUTH-03 | BLOCKED | Candidate regressions exist, but installed runtimes remain legacy; review before any deployment. |
| ACL-STORAGE | BLOCKED | Reconcile grants/default ACLs, public buckets and missing Storage policies through a reviewed isolated migration. |
| RECONNECT | PENDING | Issue #78 requires Ricardo's physical Normal and Team Lite no-F5 acceptance. |
| HUMAN-REVIEW | PENDING | No submitted review or explicit release authorization. |

Immediate owner-side action: inspect the isolated project's Edge invocation quota/spend cap. Separately investigate the production HTTP 402 volume without assuming the lab's cause. No plan, spend-cap, production, secret, role, grant, ACL, policy, migration, feature flag or deployment setting was changed by this checkpoint.

## Execution integrity

This checkpoint was created after verifying PR #169's branch, HEAD `e6b4dbe2b8ecacc0ddba5ad97eb3b7a205f596c6`, its existing documentation-only diff and the absence of this target path. This execution made no product-code change and started no tests or workflows. It inspected existing GitHub Actions runs and performed SELECT/catalog-only Supabase reads. No merge, deploy, release, userscript publication, production SQL write or destructive action occurred.
