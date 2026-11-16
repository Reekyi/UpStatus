# Engineering checkpoint — 2026-11-16 16:57 UTC

This checkpoint records a read-only reconciliation of GitHub, CI, Supabase and release gates. It does not authorize merge, deploy, release, publication, billing changes, production writes, migrations or destructive operations.

## GitHub refs and required PRs

Official refs:
- `master`: `9d40461babcec8eb8686c2a04be9c675df7da381`
- `develop`: `6b33e1e26ad105143f00372ae6d0f2fa52df60d6`
- `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`
- QA branch `qa/release-readiness-2026-11-04-master`: current PR #82 HEAD `a9a9e1965d0442b1fe9476b32657ef95c66ff99d`

| PR | HEAD | Ahead / behind | Latest exact-head CI |
|---|---|---:|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a072546eda0089e0cee4018c3047011f600` | 887 / 1 | Validate [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) SUCCESS; Smoke [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) SUCCESS |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 59 / 0 | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) historical SUCCESS |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `00a578e9174e08238a1289a35feb02d171625421` | 389 / 0 | Candidate Checks [43868863235](https://github.com/Reekyi/UpStatus/actions/runs/43868863235) FAILURE: offline signed-upload job passed; endpoint integration returned HTTP 402 |
| [#80 continuity](https://github.com/Reekyi/UpStatus/pull/80) | `46541cad8b5592e183406ed2d78afc2b43c47bff` | 320 / 0 | Validate [43651529898](https://github.com/Reekyi/UpStatus/actions/runs/43651529898) FAILURE: inherited `client signed upload helper missing` |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `a9a9e1965d0442b1fe9476b32657ef95c66ff99d` | 372 / 1 | Validate [43911923614](https://github.com/Reekyi/UpStatus/actions/runs/43911923614) FAILURE: inherited `production updateURL mismatch` |

All five required PRs remain open, Draft, unmerged and without submitted human reviews. The #82 QA branch advanced from the code head recorded in its 16:49 UTC report (`793ddc86`) to `a9a9e196` when the report commit was added. The exact current-head Validate run still reproduces the same inherited updateURL assertion. The #82 diff is documentation-only (211 files under `docs/`).

### Related candidates

- [#167](https://github.com/Reekyi/UpStatus/pull/167), HEAD `d25b3fbe1bd28a222d45ead6a467ceb7fd00548a`: updater metadata separation, staged chat attachments and signed-upload offline contracts; Validate [43784897392](https://github.com/Reekyi/UpStatus/actions/runs/43784897392) SUCCESS. No real Storage PUT or byte inspection.
- [#171](https://github.com/Reekyi/UpStatus/pull/171), HEAD `8eae059a4b20e5a04370d8d39d6da7f32a220335`: Team Lite persisted-admin setup regression; dedicated workflow [43814131143](https://github.com/Reekyi/UpStatus/actions/runs/43814131143) SUCCESS.
- [#174](https://github.com/Reekyi/UpStatus/pull/174), HEAD `277dd7bbfe87a4e40c0ca62395a83c3fe01c7849`: develop signed-upload backport; Validate [43802407509](https://github.com/Reekyi/UpStatus/actions/runs/43802407509) SUCCESS.
- [#175](https://github.com/Reekyi/UpStatus/pull/175), HEAD `d20187c22bb0684ce19aabc38fbc5ebb774fdd40`: targeted admin-role regression [43808590208](https://github.com/Reekyi/UpStatus/actions/runs/43808590208) SUCCESS; full Validate [43808590131](https://github.com/Reekyi/UpStatus/actions/runs/43808590131) fails on the separate signed-upload dependency #174.

Do not duplicate these candidates or weaken inherited validators to make documentation PRs green.

## QA and documentation

Read:
- `docs/PROJECT_GUIDE.md` and `docs/CURRENT_STATE.md` from develop.
- `UPSTATUS_HANDOFF.md` and its appended current-state history from the #80 documentation branch.
- `RELEASE_CHECKLIST.md`.
- The full `docs/RELEASE_READINESS.md` blob on the QA branch (1,046,356 characters / 8,423 lines).
- Latest independent QA report [2026-11-16 16:49 UTC](https://github.com/Reekyi/UpStatus/blob/qa/release-readiness-2026-11-04-master/docs/audits/2026-11-16-upstatus-qa-audit-1649-utc.md).

The QA report confirms #76's 11/11 offline HTTP contract checks passed before the isolated endpoint check; the endpoint then returned 402 and the remaining browser/authenticated steps were skipped. QA did not start new tests. The QA-owned branch/report were not edited.

## Supabase organization, projects and availability

The `UpStatus` organization is on the Free plan. Exactly two projects are listed:
- Production `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations, 38 Edge Functions.
- Isolated signaling lab `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 39 migrations, two test Edge Functions. It is not Full-Product TEST and has no user/message fixtures, Realtime rows, buckets or Storage objects.

The isolated lab's Candidate Checks failure is explicitly explained by the service response `exceed_edge_functions_invocations_quota`; the response instructs the project owner to upgrade the plan or remove spend caps. No billing or plan setting was changed.

## HTTP 402 evidence

Read-only aggregation of production `function_edge_logs` for the requested 24-hour interval `2026-11-15T16:57:11Z`–`2026-11-16T16:57:11Z` returned 50,303 function log rows. Available records begin only at 11:41:55 UTC, so this is approximately 5h15m of observed coverage, not a complete 24-hour sample. Every returned function log row is HTTP 402:
- beta10 `/api/chat`: 26,846
- beta10 `/api/status`: 11,702
- beta10 `/api/remote-status`: 11,676
- beta10 `/api/account`: 31
- beta10 `/api/members`: 21
- beta10 `/api/me`: 21
- `/upstatus/upstatus.user.js`: 6

The last observed production 402 in this query was 16:57:10.439 UTC. Sample log records expose status/request metadata but not the response body. The deployed beta10 source contains no literal quota error or HTTP 402 response branch, which is consistent with a platform-level restriction but does not prove its exact cause. Do not attribute production 402s to the lab's quota reason without response-body or Dashboard evidence.

The lab had 48 function Edge log rows in the same window, all 402 on `upstatus-signal-test` routes, matching the explicit quota error from the GitHub Actions response.

## Runtime and security snapshot

Production function versions:
- Normal `upstatus` v480.
- TEST `upstatus-test` v281.
- Team Lite `upstatus-team-lite` v15.
- Legacy API `upstatus-screen-share-3-1-1-beta10` v6.

Source inspection of all four installed handlers still finds `login(req,true)`, `needsSetup`, and the display-name administrator fallback. No setup-invite token/RPC usage is present in those deployed sources. Candidate authorization changes remain unintegrated.

Read-only production catalog:
- 106/106 `realtime.messages` rows have `private=false`; zero Realtime policies.
- 10 public RLS-enabled tables have no policies.
- 126 anon/authenticated table grant rows, including 18 TRUNCATE grants.
- Six public default-ACL entries.
- Three SECURITY DEFINER broadcast functions remain client-executable according to the Security Advisor.
- Two public Storage buckets, 188 objects and zero `storage.objects` policies.

Lab catalog:
- 18 public RLS-enabled tables without policies.
- Zero direct anon/authenticated grants on public tables.
- Zero Realtime messages, buckets or Storage objects.
- Candidate signaling, attempt and setup-invite rate-limit tables exist only in this lab.

Security Advisor: production 10 INFO and 6 WARN; lab 18 INFO and zero WARN. No schema or data writes were performed.

## Migrations and deployment workflows

Production ledger has seven migrations; the four original source files below still return 404 from master:
- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

The managed production `main` branch remains `MIGRATIONS_FAILED`; preview status is ACTIVE_HEALTHY. No SQL was reconstructed.

Direct workflow inspection:
- Master production workflow is manual-only but uses generic `SUPABASE_PROJECT_ID`, CLI `latest`, and deploys only `upstatus`.
- Develop TEST workflow has both push and manual triggers, generic project ID and CLI `latest`.
- Team Lite official production workflow deploys slug `upstatus` instead of `upstatus-team-lite`, with generic project ID and CLI `latest`.

No deployment workflow was dispatched.

## Issues and release gates

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) remains OPEN with all eight physical no-F5/reconnect criteria unchecked. No physical test was confirmed.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) remains OPEN. The Engineering and QA comments are separate; only the Engineering comment is updated by Engineering.

| Gate | State |
|---|---|
| RT-01 | BLOCKED — public Realtime rows and client-executable broadcasts |
| TEST-ISOLATION | BLOCKED — lab Edge quota exhausted; no Full-Product TEST |
| MIGRATION-PROVENANCE | BLOCKED — four original SQL sources absent; managed main MIGRATIONS_FAILED |
| AUTH-03 | BLOCKED — installed runtimes still use legacy setup/admin logic |
| ACL-STORAGE | BLOCKED — broad grants/default ACLs, public buckets, zero Storage policies |
| RECONNECT | PENDING — physical Normal and Team Lite no-F5 acceptance not confirmed |
| HUMAN-REVIEW | PENDING — no submitted human reviews or explicit release authorization |

**Recommendation: NOT READY.**

Owner-side action: inspect the Free-plan organization/project usage and the isolated lab's Edge invocation spend cap; do not change plan or limits without reviewing cost. Separately inspect production's 402 response details in the Dashboard because the logs do not expose the cause.

## Execution integrity

This run made no product-code changes and started no tests or workflows. Existing GitHub Actions logs were inspected; Supabase reads were SELECT/catalog/log-only. No merge, deploy, release, userscript publication, migration, production SQL write, secret/feature-flag/role/grant/policy/ACL change, billing change, fixture mutation or destructive action occurred. The only writes in this run are documentation on the existing isolated PR #169 branch, the existing Engineering comment on Issue #79, and the existing Engineering coordination comment on PR #82.
