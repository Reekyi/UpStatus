# Production runtime inventory and traffic checkpoint — 2026-11-08

**Verified at:** 2026-11-08 05:03 BRT / 08:03 UTC  
**Repository:** `Reekyi/UpStatus`  
**Production project:** `dlfvkawaiqduhlazsszm`  
**Method:** GitHub refs/CI inspection, Supabase project/function/source inventory, 24-hour function invocation logs, Security Advisor, and read-only PostgreSQL catalog queries.

> This checkpoint is evidence only. It does not authorize merge, deploy, release, userscript publication, production SQL/migration, secret/role/grant/ACL/policy/flag changes, or function deactivation.

## 1. Current GitHub state

All seven tracked PRs are open, Draft, and unmerged. No review submissions were returned for PRs #74, #75, #76, #80, #82, #84, or #85.

| PR | Branch / base | Current HEAD | Latest inspected CI |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `chore/continuity-foundation` → `master` | `9c0133e8cf6bd85ac8993888718a408db2f24a3e` | Validate [42451736696](https://github.com/Reekyi/UpStatus/actions/runs/42451736696) PASS; Signaling Smoke [42451736729](https://github.com/Reekyi/UpStatus/actions/runs/42451736729) PASS |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `team-lite/3.4.31-guest-fixes` → `team-lite-official` | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) historical PASS |
| [#76 Team Lite candidate](https://github.com/Reekyi/UpStatus/pull/76) | `team-lite/signaling-transport-candidate` → `team-lite-official` | `eb28e88325d7e8a6236d9050bebabf794d64a8c4` | Candidate Checks [42450476433](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) PASS |
| [#80 continuity](https://github.com/Reekyi/UpStatus/pull/80) | `docs/continuity-handoff-2026-11-04` → `develop` | `a2e0b9b3b0db7552f5aa7a7f6870309be1ccd64f` | Validate [42457288702](https://github.com/Reekyi/UpStatus/actions/runs/42457288702) FAIL: inherited `client signed upload helper missing` at `scripts/validate.mjs:55` |
| [#82 independent QA](https://github.com/Reekyi/UpStatus/pull/82) | `qa/release-readiness-2026-11-04-master` → `master` | `3cb0ee94db0ca868c12bea44298082d65b0fea2c` | Validate [42459436446](https://github.com/Reekyi/UpStatus/actions/runs/42459436446) FAIL: inherited `production updateURL mismatch` at `scripts/validate.mjs:26` |
| [#84 TEST isolation](https://github.com/Reekyi/UpStatus/pull/84) | `safety/test-deploy-target-guard-20261107` → `develop` | `21341f331270e142bdf7584c1cdf16e6011e41b3` | Validate [42387042361](https://github.com/Reekyi/UpStatus/actions/runs/42387042361) PASS |
| [#85 master stabilization](https://github.com/Reekyi/UpStatus/pull/85) | `fix/master-release-script-url-20261107` → `master` | `36c19ab87d883fe5252715fcbbc0fbef2e35ec9f` | Validate [42440947791](https://github.com/Reekyi/UpStatus/actions/runs/42440947791) PASS |

The current base SHAs reported by PR metadata are `master=a9288ccfcb0f308d3a587bfca624418a395be07b`, `develop=6b33e1e26ad105143f00372ae6d0f2fa52df60d6`, and `team-lite-official=9065bc1536fde64f437f6f12b7abb9b072cb8281`.

The #74 candidate is 877 commits ahead / 0 behind master. #76 is 305 commits ahead / 0 behind #75 and is a continuation containing the baseline; do not treat #75 and #76 as independent release payloads.

Issue [#78](https://github.com/Reekyi/UpStatus/issues/78) remains open with 0/8 physical acceptance criteria checked. Issue [#79](https://github.com/Reekyi/UpStatus/issues/79) remains open.

The #80 and #82 failures were confirmed in their job logs. Neither failure is evidence that the new Normal/Team Lite runtime tests failed; each stops at the inherited base-validator assertion. No validator was weakened.

## 2. Supabase project inventory

The organization currently lists exactly two projects:

- Production `dlfvkawaiqduhlazsszm`: `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002, seven migrations through `20261027155438`.
- Isolated signaling lab `bfpjtfqlnypisxljoxkb`: `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.003.

There is no independent full-product TEST project. The `upstatus-test` Edge Function is hosted inside the production Supabase project and is not a separate project boundary.

Production currently lists 38 ACTIVE Edge Functions. The earlier shorthand that all 36 non-primary functions were merely old backups was imprecise. A better classification is:

### Four operational endpoints

| Function | Deployed version | Source/artifact observation | Current role |
|---|---:|---|---|
| `upstatus` | 480 | Backend version 3.4.7; embedded userscript 3.4.7; update/download URL points to `/functions/v1/upstatus/upstatus.user.js`; embedded `CLOUD_SERVER` points to beta10 | Normal update artifact endpoint |
| `upstatus-screen-share-3-1-1-beta10` | 6 | Embedded userscript identifies as 3.1.1-beta8 and its embedded update/download URL and `CLOUD_SERVER` point to beta8 | Legacy Normal API endpoint receiving live traffic |
| `upstatus-team-lite` | 15 | Embedded userscript identifies as 3.4.30 and `CLOUD_SERVER` points to `upstatus-team-lite` | Team Lite API endpoint |
| `upstatus-test` | 281 | Embedded userscript identifies as 3.3.28 and targets `upstatus-test` | Official TEST function endpoint inside the production project |

### Thirty-four historical/test/beta/backup endpoints

- `upstatus-test-backup-032`, `upstatus-test-beta11`, `upstatus-test-3-0-51-beta1` through `beta3`, and `upstatus-test-3-0-52-beta1` through `beta6`.
- `upstatus-screen-share-3-1-1-beta1` through `beta9`, plus `beta9-1`, `beta9-2`, and `beta9-3`.
- `upstatus-backup-pre-3-1-1-20261022`, `upstatus-backup-3-1-1-loopfix-20261022`, `upstatus-backup-pre-3-1-2-20261022`, `upstatus-backup-3-1-2-identityfix-20261022`, and `upstatus-backup-325` through `backup-330-pre331`.

All 38 function records report `verify_jwt=false`. Per current Supabase documentation, this disables the gateway's Supabase Auth JWT check before the handler; it does not itself prove that a handler is unauthenticated. Each function must enforce its own application-level authentication when required. Reference: [Supabase Edge Function authorization headers](https://supabase.com/docs/guides/functions/auth-headers).

Source inspection of six representative/current functions (`upstatus`, `upstatus-test`, `upstatus-team-lite`, beta10, `upstatus-backup-330-pre331`, and `upstatus-test-beta11`) found the custom `x-upstatus-token`/session-validation path. The same sample also retained the legacy name-based admin fallback and name-only `/api/chat/clear` guard. This is a sample, not a completed source audit of all 38 functions.

## 3. Production function traffic — last 24 hours

Read-only `function_edge_logs` aggregation returned 468 invocations across two function IDs:

| Function | Requests | Paths/status |
|---|---:|---|
| `upstatus-screen-share-3-1-1-beta10` | 467 | `/api/status`: 157 × HTTP 200; `/api/chat`: 156 × HTTP 200; `/api/remote-status`: 154 × HTTP 200 |
| `upstatus` | 1 | `/upstatus.user.js`: 1 × HTTP 200 |

No invocation rows appeared for the other 36 active function IDs in this 24-hour log window. This is not proof that they are unused: the query is time-bounded and does not replace a longer retention review or client/dependency inventory.

**Operational conclusion:** beta10 is demonstrably still serving Normal API traffic and must not be disabled or treated as an unused backup. The `upstatus` endpoint is serving the Normal update artifact separately.

### Important artifact/runtime mismatch

The currently deployed `upstatus` function embeds a 3.4.7 userscript whose API `CLOUD_SERVER` is beta10, while its update artifact URL is `upstatus`.

The deployed beta10 function is version 6, but its embedded userscript identifies as 3.1.1-beta8 and points its embedded update/download URL and API server to beta8. At the same time, the last-24-hour invocation logs show clients calling beta10. This indicates a split between the live API endpoint, the artifact embedded in that legacy function, and the newer updater endpoint. The source does not establish which clients still hold a persisted beta10 server value or which updater path each client uses.

Do not change only one URL, redeploy beta10, or deactivate beta8/beta10 based on this observation. Reconcile the stored client endpoint behavior and build/update artifact contract first, then prepare one coordinated Normal API + artifact cutover with rollback.

Team Lite production remains at function version 15 / embedded userscript 3.4.30. Candidate #76 is 3.4.31 and has not been deployed or published. No Team Lite invocation appeared in the same 24-hour function log window; that absence is not proof of non-use.

## 4. Production database security — read-only confirmation

The three trigger broadcast functions remain:

- `public.upstatus_broadcast_messages()`
- `public.upstatus_broadcast_remote_state()`
- `public.upstatus_broadcast_users()`

Current catalog checks confirm all three are SECURITY DEFINER, have `search_path=public`, and have effective EXECUTE for `anon`, `authenticated`, and `service_role`.

The nine backend-owned tables below have RLS enabled and effective grants for all eight listed table privileges to both `anon` and `authenticated`: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, and MAINTAIN.

`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`.

Because these tables currently have RLS enabled without policies, the grant inventory alone does not prove ordinary client row access. The grants remain an unnecessary privilege surface and must be removed only through a reviewed, tested migration.

Default ACLs in schema `public` remain broad for both object owners `postgres` and `supabase_admin`, including table, function, and sequence defaults. The current SQL role `postgres` is not a member of `supabase_admin`; do not attempt to change `supabase_admin` defaults through an ordinary postgres migration or role-membership workaround.

Security Advisor at 2026-11-08 08:04 UTC reports three anon SECURITY DEFINER WARN findings, three authenticated SECURITY DEFINER WARN findings, and ten RLS-enabled/no-policy INFO findings. Health Advisor returned no lints. Production migration inventory remains seven entries; no candidate hardening migration is installed here.

## 5. Release and safety conclusions

- Normal #74 and Team Lite #76 have passing automated candidate CI on the exact current heads listed above.
- Automated CI does not close issue #78: real Tampermonkey network-loss recovery without F5, real microphone/display-capture permissions, and installed Normal ↔ Team Lite interoperability remain manual gates.
- The Normal endpoint/update-artifact mismatch remains a cutover blocker.
- RT-01 remains blocked by the public Realtime broadcast architecture and full-row message payload.
- AUTH-02, production AUTH-03 rollout, product-endpoint distributed rate limiting, trigger/table grant hardening, default ACL authority, official TEST rehearsal, human review, and rollback approval remain open.
- Keep PRs Draft. Do not merge #74/#76 independently or merge both #75 and #76.
- No production SQL write, migration, Edge Function deploy, secret/role/grant/ACL/policy/feature-flag change, workflow dispatch, merge, release, userscript publication, or function deactivation occurred in this checkpoint. Production inspection was read-only; no fixture-mutating test was started.

## 6. Next engineering actions

1. Keep beta10 live while tracing the Normal updater/API split; add a read-only client/runtime dependency inventory before proposing any deactivation.
2. Inspect the remaining 34 historical functions by source and longer-window usage before classifying any as safe to retire. Do not infer unused from one 24-hour window.
3. Prepare a coordinated Normal endpoint/artifact cutover and rollback plan; keep Team Lite as a separate release line.
4. Continue the RT-01 architecture decision and validate the chosen private/server-mediated transport in isolation.
5. Resolve AUTH-02 source identity and complete real Deno HTTP AUTH-03 tests.
6. Rehearse reviewed ACL/default-ACL migrations in an authorized full-product TEST environment; do not attempt supabase_admin-owned ACL changes with postgres.
7. Complete physical acceptance for issue #78 and obtain human reviews before release approval.
