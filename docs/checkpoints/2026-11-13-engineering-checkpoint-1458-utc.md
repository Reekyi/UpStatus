# Engineering checkpoint — 2026-11-13 14:58 UTC

## Scope and safety

Live read-only revalidation of GitHub refs, pull requests, workflow runs, continuity documents, Supabase projects, Edge Functions, migrations, Security Advisor, PostgreSQL catalog, Realtime rows, and Storage metadata. The only writes in this checkpoint are this documentation file and the existing Engineering comment on Issue #79.

No merge, deploy, release, userscript publication, production SQL write, migration, secret/feature-flag/grant/policy/ACL change, or destructive operation was performed. All SQL against both Supabase projects was SELECT-only. No new application tests were run in this execution; existing CI logs were inspected.

## GitHub refs and pull requests

The live PR metadata reports these open, Draft, unmerged and mergeable candidates. The review endpoint returned zero submitted reviews for each listed PR.

| PR | Head | Base | Commits / files | Current evidence |
|---|---|---|---:|---|
| #74 Normal | `dcaf6a072546eda0089e0cee4018c3047011f600` | `master` at PR-reported base `a9288ccfcb0f308d3a587bfca624418a395be07b` | 887 / 90 | Validate [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) and Smoke [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) SUCCESS |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | `team-lite-official` at `9065bc1536fde64f437f6f12b7abb9b072cb8281` | 59 / 10 | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) historical PASS |
| #76 Team Lite | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | `team-lite-official` at `9065bc1536fde64f437f6f12b7abb9b072cb8281` | 386 / 57 | Candidate Checks [43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) SUCCESS; 16/16 unauthenticated and 110/110 authenticated |
| #80 Continuity | `345cab7b0e7d06aa6a5d2f01e0bca4135d04451f` | `develop` at `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` | 308 / 21 | Validate [43439484532](https://github.com/Reekyi/UpStatus/actions/runs/43439484532) FAIL |
| #82 Independent QA | `31838c877e2a1deae6a8a1675c369d0465ba2acc` | `master` at PR-reported base `a9288ccfcb0f308d3a587bfca624418a395be07b` | 282 / 139 | Validate [43445076211](https://github.com/Reekyi/UpStatus/actions/runs/43445076211) FAIL |
| #161 Normal consolidated | `ae6a5f3053b160f6f5235b68cc94ff1a9fb8984e` | `chore/continuity-foundation` at `dcaf6a072546eda0089e0cee4018c3047011f600` | 11 / 10 | Smoke [43430030814](https://github.com/Reekyi/UpStatus/actions/runs/43430030814) SUCCESS; no exact-head Validate run was returned by the PR-triggered workflow query |
| #162 Voice HTTP contract | `8dc23905180494feded76f10e9fbdd59ac85feb5` | `fix/normal-api-target-aligned-rate-limit-20261113` at `a1d8dc8409ae894a5fb02acd2014749b7281868f` | 6 / 7 | Validate [43430131864](https://github.com/Reekyi/UpStatus/actions/runs/43430131864) SUCCESS |

The latest #80 job log fails at `scripts/validate.mjs:55` with `client signed upload helper missing`. The latest #82 job log fails at `scripts/validate.mjs:26` with `production updateURL mismatch`. No assertion was removed or weakened.

The #161 branch has advanced one commit beyond the base SHA recorded by #162. Comparing `a1d8dc8` to `ae6a5f3` returns exactly one commit ahead, changing only `.github/workflows/validate.yml` (one insertion and one deletion). #162 has not been rebased onto that latest base.

The dedicated `voice-open-http-status-contract.yml` in #162 filters `pull_request.branches` to the #162 head branch, while the current PR base is the #161 branch. The generic Validate workflow is the confirmed PR check for #162; the dedicated workflow's current filter should not be counted as current-PR coverage.

The latest QA report file on the QA branch is [2026-11-13 audit, 14:40:54 UTC](https://github.com/Reekyi/UpStatus/blob/qa/release-readiness-2026-11-04-master/docs/audits/2026-11-13-upstatus-qa-audit-1440-utc.md). PR #82's current head `31838c8` is the report commit; the report's ref table records the pre-report QA head. Its findings remain NOT READY.

## Supabase project inventory

Exactly two Supabase projects were returned:

- Production `dlfvkawaiqduhlazsszm`, UpStatus, `us-west-2`, `ACTIVE_HEALTHY`.
- Isolated signaling/auth lab `bfpjtfqlnypisxljoxkb`, `sa-east-1`, `ACTIVE_HEALTHY`.

There is no independent full-product TEST project.

### Edge Functions and migrations

Production has 38 active Edge Functions, including `upstatus` v480, `upstatus-team-lite` v15, `upstatus-test` v281 and 12 slugs beginning with `upstatus-test`. The lab has two active functions: `upstatus-signal-test` v32 and `upstatus-signal-e2e-once` v3.

The migration API returned 7 production migrations and 38 lab migrations. The production managed branch remains reported as `MIGRATIONS_FAILED` in the latest QA checkpoint, while the project itself is healthy. The four historical statements are present in the production ledger, but the original canonical SQL files remain absent; ledger contents do not prove byte-for-byte source provenance.

### Realtime

A fresh SELECT over `realtime.messages` for the last 14 days returned 92 production rows, all `private=false`, on topic `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`. The lab returned zero rows. The QA snapshot at 14:40 UTC reported 91 rows; Realtime snapshots vary and are not monotonic counters.

QA source inspection reports that installed clients still subscribe to the beta10 topic and do not set `private:true` or call `realtime.setAuth()`. RT-01 remains BLOCKED.

### Authentication and identity schema

| Check | Production | Lab |
|---|---:|---:|
| Setup-token columns on `public.users` | 0 | 4 |
| `upstatus_sessions.user_id` columns | 0 | 0 |
| `upstatus_sessions.user_name` columns | 1 | 1 |
| `upstatus_setup_invite_rate_limits` tables | 0 | 1 |
| Unique index on `users.name` | 0 | 1 |

The lab has the setup-token and invite-rate-limit schema, but both projects still use name-based sessions. Production has not received the candidate AUTH-03 migrations or RPCs.

### Security Advisor, grants and Storage

Production Security Advisor returned 6 WARN (the three broadcast SECURITY DEFINER functions are executable by both `anon` and `authenticated`) and 10 INFO for RLS-enabled tables without policies. Lab returned 18 INFO and no WARN.

The raw `information_schema.role_table_grants` query returned 83 grant rows across 18 objects for each of `anon` and `authenticated` in production; the lab returned 20 rows across 9 objects for each role. These are metadata counts, not a claim that every listed privilege is unnecessary.

Production Storage has two public buckets:
- `chat-images`: 20 MiB live limit; 168 objects.
- `profile-images`: 20 MiB live limit; 20 objects.
- `storage.objects`: zero policies.

The repository `supabase/config.toml` differs from live configuration: it declares 25 MB for `chat-images` and 2 MB for `profile-images`. The live chat bucket also allows document MIME types beyond the image/audio list in the config. Lab has no buckets or objects.

### Voice HTTP 409

The deployed lab function `upstatus-signal-test` v32 still lacks the `VOICE_ATTEMPT_ALREADY_ACTIVE` mapping in `/room/open`; the deployed mapping handles `VOICE_ATTEMPT_CONFLICT` and `ROOM_FULL` as 409, with the already-active code falling through to 500. PR #162 contains the offline helper mapping to 409 and passed generic Validate, but no lab deployment or live HTTP request occurred.

## Issues and acceptance

- Issue [#78](https://github.com/Reekyi/UpStatus/issues/78) remains open with 0/8 physical acceptance criteria. No installed-browser no-F5 reconnect test was reported.
- Issue [#79](https://github.com/Reekyi/UpStatus/issues/79) body remains 16/35 historical checklist items. Use the dedicated Engineering/QA JSON comments for current gates; the Engineering comment was updated in place and the QA comment was preserved.

## Current release gates

- RT-01: BLOCKED — public Realtime rows and installed-client topic/auth mismatch.
- TEST-ISOLATION: BLOCKED — only production and the signaling/auth lab exist; no full-product TEST.
- MIGRATION-PROVENANCE: IN PROGRESS — statements recovered from ledger, original source files not restored.
- AUTH-03: BLOCKED — production lacks setup-token/rate-limit schema and session identity by immutable user ID.
- ACL-STORAGE: BLOCKED — SECURITY DEFINER grants, RLS/grants and public Storage buckets/policies remain unresolved.
- RECONNECT: PENDING — no physical no-F5 acceptance from Ricardo; #78 remains 0/8.
- HUMAN-REVIEW: PENDING — all seven reviewed PRs remain Draft with zero submitted reviews.

## Next actions

1. Obtain independent QA review of #161/#162 and reconcile #162 onto the current #161 base before relying on further checks.
2. Resolve the storage live/config mismatch and document a non-destructive ACL/Storage plan.
3. Provision a full-product TEST project only after explicit authorization and cost/organization confirmation.
4. Design private/authorized Realtime and a coordinated client/server cutover plan.
5. Complete AUTH-03 with immutable session identity, not only name-based uniqueness.
6. Recover original migration files or formally document the remaining provenance gap.
7. Validate the #162 HTTP 409 behavior by live request only after explicit authorization for a deploy to the isolated lab.
8. Complete all eight physical acceptance criteria in Issue #78.
9. Keep all PRs Draft; do not merge, deploy, release, publish, or modify production without explicit authorization.

## Readiness

**NOT READY.** Automated candidate checks are useful evidence but do not establish production readiness, private Realtime, full TEST isolation, installed-browser recovery, human review, or release authorization.
