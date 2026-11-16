# Engineering checkpoint — 2026-11-16 05:12 UTC

## Scope and safety

Read-only reconciliation of GitHub, current QA report, Supabase catalogs/advisors/logs, continuity documents and release checklist. The only product-code writes in this engineering run are on isolated candidate branch `fix/develop-admin-role-no-name-fallback-20261116` (PR #175). This checkpoint is documentation-only.

No merge into master/develop/team-lite-official, no deploy, release, userscript publication, production SQL write, migration, secret/feature-flag change, workflow dispatch, billing query or destructive operation occurred. No local checkout or local tests were used. Test evidence below is from GitHub Actions runners.

## Official refs and required PRs

Verified official branch heads:

- master: `9d40461babcec8eb8686c2a04be9c675df7da381`
- develop: `6b33e1e26ad105143f00372ae6d0f2fa52df60d6`
- team-lite-official: `9065bc1536fde64f437f6f12b7abb9b072cb8281`
- QA: `456de382d4fcb26104a022cfd620a6847ca8903f` (documentation head; latest QA report records code HEAD `c9817d70` before its report commit)

| PR | HEAD | Current evidence |
|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a0` | Validate [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) PASS; Smoke [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) PASS |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b9` | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) historical PASS |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `83a6cc4` | Candidate Checks [43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) PASS |
| [#80 continuity](https://github.com/Reekyi/UpStatus/pull/80) | `46541cad` | Validate [43651529898](https://github.com/Reekyi/UpStatus/actions/runs/43651529898) FAIL: `client signed upload helper missing` at validator line 55 |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `456de382` | Validate [43805255036](https://github.com/Reekyi/UpStatus/actions/runs/43805255036) FAIL: inherited `production updateURL mismatch` at line 26 |

All five required PRs remain open and Draft. No human reviews were recorded on the required PRs or #175.

## Candidate engineering work

### PR #174 — signed-upload client backport

[PR #174](https://github.com/Reekyi/UpStatus/pull/174), HEAD `277dd7bbfe87a4e40c0ca62395a83c3fe01c7849`, based on exact develop HEAD. Validate [43802407509](https://github.com/Reekyi/UpStatus/actions/runs/43802407509) passed the offline client/server signed-upload contracts and build. It does not prove a real Storage transfer, browser upload, byte inspection or private quarantine. The candidate remains Draft and unreviewed.

### PR #175 — persisted administrator authorization

[PR #175](https://github.com/Reekyi/UpStatus/pull/175), current HEAD `d20187c22bb0684ce19aabc38fbc5ebb774fdd40`, based on develop `6b33e1e`, 8 commits ahead / 0 behind, five files changed.

Changes:
- First setup no longer promotes Ricardo/Lohan/Guilherme by display name. Only the persisted `implementation_admin` value remains administrative; null or unexpected roles become `implementation_user`.
- Server chat-wide clear requires both owner identity (Ricardo) and `admin(name)`, which reads the persisted role.
- Client clear button and handler also require the persisted admin role; server remains authoritative.
- A VM-backed regression tests missing, user, admin and unexpected roles, and checks server/client guards. The regression is invoked at the start of `scripts/validate.mjs`.

Evidence:
- Dedicated isolated regression workflow [43808391473](https://github.com/Reekyi/UpStatus/actions/runs/43808391473) SUCCESS on code-equivalent candidate head `7e1d3c7396da5b5d06609cbca65952266693741`. Its log prints: `PASS admin-role security: setup cannot elevate by name; chat-wide clear requires persisted role on server and client.`
- Validate [43808422047](https://github.com/Reekyi/UpStatus/actions/runs/43808422047) on `b8867664` prints the same PASS before failing at the inherited develop assertion `client signed upload helper missing` (validator line 56). This confirms the new regression ran; the full Validate remains blocked by the separate #174 upload dependency.
- The dedicated workflow was restored in the latest branch head `d20187c`; no run on that final HEAD was visible at this checkpoint.
- PR #175 remains Draft, unreviewed, unmerged and unintegrated. No production runtime changed.

### Related candidates

- #167 `d25b3fbe`: Validate [43784897392](https://github.com/Reekyi/UpStatus/actions/runs/43784897392) PASS for offline signed-upload contracts and chat regressions; no real Storage byte inspection or Smoke.
- #168 `c6de3eb`: Validate [43755941462](https://github.com/Reekyi/UpStatus/actions/runs/43755941462) PASS; Retry-After is a conservative full-window 900 seconds, not exact remaining time.
- #171 is closed, not merged; it is a Team Lite chat-clear authorization candidate and was used only as a reference. QA branches/commits were not modified.
- #172 remains closed/merged only within the isolated #167 candidate lineage; QA recommends retaining that fast-forward. No official ref was changed.

## Supabase read-only snapshot — 2026-11-16 05:04 UTC

### Production `dlfvkawaiqduhlazsszm`

- Project ACTIVE_HEALTHY, PostgreSQL 17.11, seven migrations, 38 ACTIVE Edge Functions.
- Managed branch `main` remains `MIGRATIONS_FAILED`; preview reports ACTIVE_HEALTHY.
- Core function versions: `upstatus` v480, `upstatus-team-lite` v15, `upstatus-test` v281, legacy beta10 v6.
- Realtime: 106/106 rows have `private=false`, all in one legacy topic; zero policies and six client grants on `realtime.messages`.
- `public.messages` has content/metadata columns; the production SECURITY DEFINER trigger function `upstatus_broadcast_messages()` sends `to_jsonb(OLD/NEW)` with `realtime.send(..., false)`. The remote-state and user-status broadcasts also use public sends.
- Three `upstatus_broadcast_*` functions have `search_path=public` and EXECUTE effective for anon/authenticated.
- Public schema: 10 RLS-enabled tables without policies; 126 anon/authenticated table grants across nine tables, including 18 TRUNCATE grants.
- Storage: public buckets `chat-images` (168 objects) and `profile-images` (20 objects), 188 objects total, zero policies on `storage.objects`, eight client grants.
- Security Advisor: 10 INFO RLS/no-policy findings and six WARN function-execution findings. Performance and health advisors returned no findings.
- Users table count-only check: five accounts, three persisted administrators, two implementation users, zero null roles. This supports removing the name fallback; it does not authorize a production change.
- No setup-invite rate-limit table or consume RPC exists in production.
- Installed Normal, Team Lite, TEST and beta10 sources still contain name-based setup-role fallback; the global chat-clear route still checks the name rather than the persisted admin helper. Signed-upload endpoints exist in deployed sources, but validation is weaker than the candidate and no byte inspection/quarantine exists.

### Isolated laboratory `bfpjtfqlnypisxljoxkb`

- ACTIVE_HEALTHY, 39 migrations, two isolated Edge Functions.
- Zero users/fixtures, zero Realtime messages, zero buckets and zero Storage objects.
- 18 RLS-enabled public tables without policies; zero direct public-schema client grants, but six client grants on `realtime.messages` and eight on `storage.objects`.
- Broadcast functions use empty search_path and deny anon/authenticated EXECUTE.
- Setup-invite and rate-limit table/RPCs exist only here.
- Performance Advisor has five unused-index INFO findings; Health Advisor has none.
- This is not Full-Product TEST.

### Logs and migrations

- Exact 24-hour window `2026-11-15T05:04:00Z`–`2026-11-16T05:04:00Z`: production 72 PgBouncer + 23 PostgreSQL records; lab 72 PgBouncer + 19 PostgreSQL records. No Edge/Function source was available, so no current HTTP 402 count or quota-recovery conclusion is supportable.
- Four original production SQL files remain absent from repository history: `20261023154754`, `20261026195855`, `20261027154329`, `20261027155438`. Do not reconstruct them from names or apply replacements.
- No production SQL was written. All catalog queries were SELECT-only.

## Workflows, acceptance and release

- Team Lite production workflow still reads root beta.22, uses Supabase CLI `latest`, and deploys slug `upstatus` rather than `upstatus-team-lite`. Do not dispatch.
- Develop TEST workflow still has push trigger and generic `SUPABASE_PROJECT_ID`; destination is not allowlisted in code.
- Master deploy workflow is manual but still uses generic project secret and CLI `latest`.
- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) remains OPEN, 0/8 physical reconnect criteria. No Tampermonkey/Sale Smartly no-F5 test was performed.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) remains OPEN; its body is historical 16/35. Dedicated Engineering/QA comments are operational records.
- QA's latest report [2026-11-16 04:35 UTC](https://github.com/Reekyi/UpStatus/blob/qa/release-readiness-2026-11-04-master/docs/audits/2026-11-16-upstatus-qa-audit-0435-utc.md) confirms full review of the 1,046,356-character Release Readiness document; its last embedded base checkpoint is 2026-11-15 06:30 UTC. This report is the fresher independent delta.
- Release recommendation remains NOT READY. Required human reviews, private/authorized Realtime, complete AUTH-03 rollout, ACL/Storage remediation, original migration provenance, Full-Product TEST and physical reconnect acceptance remain outstanding.

## Next steps

1. Obtain independent review of #175 and #174.
2. Integrate #174's signed-upload contract into develop only after review; rerun exact-head Validate and resolve #80 without weakening its assertion.
3. Reconcile Normal #74/#161/#167/#168 as one reviewed line; keep Team Lite #76 separate.
4. Correct #82's updater/build contract in a candidate; do not edit QA-owned files.
5. Design private Storage quarantine and byte inspection; repair Team Lite dispatcher and TEST project allowlist.
6. Recover original SQL files and diagnose managed production migration branch.
7. Continue RT-01, AUTH-03 and ACL/Storage; keep #78 open until Ricardo confirms physical no-F5 acceptance.
8. No release until human review and explicit authorization.

**Recommendation: NOT READY.**
