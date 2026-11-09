# UpStatus independent QA audit — 2026-11-09 00:25 UTC (2026-11-08 21:25 BRT)

## Scope and evidence classes

Repository: Reekyi/UpStatus. Production Supabase: dlfvkawaiqduhlazsszm. Isolated signaling project: bfpjtfqlnypisxljoxkb.

This run first read `docs/RELEASE_READINESS.md` on `qa/release-readiness-2026-11-04-master`, then refreshed Git refs/PRs/issues, exact-head workflow runs and logs, production deploy manifests/workflows, Supabase project/function/migration inventories, Security Advisor findings, and SELECT-only PostgreSQL catalogs.

Evidence labels:
- **AUTOMATED PASS**: completed workflow passed on the exact SHA stated.
- **CODE/CATALOG INSPECTION**: source, workflow or database catalog inspection only.
- **MANUAL PENDING**: requires installed browser, physical device/network or human acceptance.
- **BLOCKED**: required release dependency is absent or a release gate is failing.
- **NOT VERIFIED**: current evidence does not prove the runtime behavior.

## QA document and refs

The requested readiness file was read first. Its current blob SHA is `7cfbd70886df42ce790c078c224b19284a632595`; the latest appended section in that file is the 2026-11-08 15:30 BRT revalidation. The previous independent note `docs/audits/2026-11-08-upstatus-qa-audit-2332-utc.md` was also re-read at blob SHA `40defbe6987cf4a9f3a5418a48d34b716f830a90`. Neither existing file was modified.

Observed branch heads:
- `master`: `9d40461babcec8eb8686c2a04be9c675df7da381`
- `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`
- QA branch / PR #82: `5f349833d619f413a87af97fb62370c36e164527`

QA is 142 commits ahead and 1 behind master; merge base `a9288ccfcb0f308d3a587bfca624418a395be07b`. The 31 files in the QA comparison are documentation-only additions. No rebase or merge was performed.

**Branch governance finding:** GitHub's branch API reports both `master` and `team-lite-official` as `protected:false`, with required-status-check enforcement `off` and no required contexts. CI may pass, but it is not enforced as a merge gate on these two release branches. This run did not change branch settings.

## PR heads, CI and review state

| PR | Exact head | Current evidence |
|---|---|---|
| #74 Normal | `9c0133e8cf6bd85ac8993888718a408db2f24a3e` | Validate [42451736696](https://github.com/Reekyi/UpStatus/actions/runs/42451736696) PASS; Signaling Smoke [42451736729](https://github.com/Reekyi/UpStatus/actions/runs/42451736729) PASS |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) historical PASS; superseded by #76 |
| #76 Team Lite candidate | `eb28e88325d7e8a6236d9050bebabf794d64a8c4` | Candidate Checks [42450476433](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) PASS |
| #82 QA | `5f349833d619f413a87af97fb62370c36e164527` | Validate [42536065273](https://github.com/Reekyi/UpStatus/actions/runs/42536065273) FAIL |
| #101 production signaling backend | `2ef7c3324d2eb5443d31a45bd071d154ebeb4aa7` | [42513317464](https://github.com/Reekyi/UpStatus/actions/runs/42513317464) PASS on push; no PR-triggered run on this head |
| #102 Normal provenance | `c4a5cae1271147204ab3b0c79b8916235f0799aa` | [42519210669](https://github.com/Reekyi/UpStatus/actions/runs/42519210669) offline PASS |
| #103 Team Lite provenance | `b3fb66429851024ee513bccb4700c944e50ff0cb` | [42519564405](https://github.com/Reekyi/UpStatus/actions/runs/42519564405) offline PASS |
| #104 RT-01 release guard | `da45e7418a9d9c7719ca447a25024aeb4a553bfc` | [42524476674](https://github.com/Reekyi/UpStatus/actions/runs/42524476674) offline guard PASS |
| #105 /room/open route guard | `28d4aaaedc52e16d6ded938b842cf048aceefe30` | PR Validate [42538289953](https://github.com/Reekyi/UpStatus/actions/runs/42538289953) PASS |
| #106 executable HTTP mapper | `7ed1f8ca602d8127d5c38727de304ae8d4b7b7c0` | PR Validate [42538295974](https://github.com/Reekyi/UpStatus/actions/runs/42538295974) PASS |
| #108 malformed RPC error guard | `bdb7c5b23d2723eb7782f5e7e91c249a1e9a1736` | Push [42538296549](https://github.com/Reekyi/UpStatus/actions/runs/42538296549) and PR [42538303740](https://github.com/Reekyi/UpStatus/actions/runs/42538303740) PASS |

All PRs above remain open/Draft. No submitted human reviews were found on #74, #75, #76, #82 or #101–#106/#108.

### QA #82 failure

The exact-head Validate 42536065273 checked merge ref `e37479b7335c6a84ba96dd572c2970a2d8741ff5` and failed at `scripts/validate.mjs:26` with `production updateURL mismatch`. The build completed as PROD 3.4.7 / TEST 3.4.7 before the assertion. This is the inherited master build/validation mismatch, not a Markdown-note failure. The fix exists in candidate #74/#85 but is not in master. #82 remains red against master.

### #105/#106/#108 — scope of green checks

- #105 adds a route-scoped assertion that `/room/open` invokes the voice-attempt RPC and maps `VOICE_ATTEMPT_CONFLICT`, `VOICE_ATTEMPT_ALREADY_ACTIVE` and `ROOM_FULL` to HTTP 409.
- #106 extracts the mapper into executable shared modules for production and isolated source; tests cover 400/404/410/409/500, malformed results and prototype-like keys.
- #108 hardens the mapper further: only an own, non-empty string `error` is accepted; it avoids `String(...)` coercion and returns a fail-closed 500 for malformed/inherited values. Its PR log confirms the source-parity test and full offline Normal Validate pass.

These are **offline source/helper tests**, not a live HTTP request to the deployed lab function. The deployed runtime remains v32. #107 is the superseded dirty predecessor; #108 is the clean replacement. Compare of #108 against its current base `cc0869ee28b2fbc8752622fe2e65d78ad4bfdb22` is 10 ahead / 0 behind. Do not integrate #107.

### Candidate stacks are not one release

- #101 is based on the #74 line; #102 builds on #101.
- #103 is based on #76.
- #105 builds on #102; #106 builds on #105; #108 is the clean HTTP error-shape child.
- #104 remains a separate RT-01 guard stack. Compared with #101 it is 119 commits ahead / 887 behind, merge base `a9288ccfcb0f308d3a587bfca624418a395be07b`.

Do not aggregate independent green runs into a claim that a combined Normal + Team Lite + live Supabase release was tested.

## Production deploy workflow inspection

Current master `.github/workflows/deploy-production.yml` blob SHA `8252c6c6e7005c98625603b5b02b14cb1e50a519` is manual-dispatch only, checks root `release.json` for exactly stable 3.4.7, runs Validate, installs Supabase CLI `latest`, then deploys only `upstatus`. It does not pin CLI, explicitly verify project/ref/SHA, preflight the full migration set, or deploy the new signaling function/API/distribution sequence.

Current Team Lite `.github/workflows/deploy-production.yml` blob SHA `e95bab7602fd3fcf80ab88ff44ccc9c259593c75` reads the **root** `release.json` (Team Lite branch value 3.0.40 / beta.22) and rejects pre-releases, then also deploys `upstatus` with CLI `latest`. Team Lite's own `team-lite/release.json` says buildVersion 3.4.30 stable, but the workflow does not read it. Therefore the current Team Lite workflow fails closed at the root pre-release check; if that check were bypassed, its deploy target would still be the wrong function. **Do not dispatch it.**

The stronger three-stage cutover guard in #104 is not integrated into the master/Team Lite release branches. The Normal candidate guard also requires a stable version above 3.4.7, while master still advertises 3.4.7.

## Supabase state — read-only

### Projects, migrations and functions

Production `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, seven migrations, 38 ACTIVE Edge Functions. No production function named `upstatus-signal` exists. Relevant deployed functions:
- `upstatus` v480, source SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`
- `upstatus-team-lite` v15, source SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`
- `upstatus-screen-share-3-1-1-beta10` v6, source SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`
- `upstatus-test` v281, source SHA `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a`

The managed production branch `main` remains `MIGRATIONS_FAILED` while its preview is ACTIVE_HEALTHY. Cause not established.

Lab `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 38 migrations, two ACTIVE functions:
- `upstatus-signal-test` v32, source SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`
- `upstatus-signal-e2e-once` v3, source SHA `db0c9206b2171f5f5d67459e2e7451ecbaf6e8ad3c8f55cb4e491660164f5053`

Production has no signaling schema/RPC/migration set from #101. The candidate function and rate-limit migration exist in GitHub only.

### AUTH-03

Production: five users, zero setup-token columns, and no `consume_upstatus_setup_invite` RPC.

Lab: zero users, four setup-token columns (`setup_token_hash`, `setup_token_expires_at`, `setup_token_issued_by`, `setup_token_issued_at`) and the atomic consume RPC. Catalog confirms SECURITY INVOKER, empty `search_path`, and EXECUTE only for postgres/service_role. No production migration was applied.

### RLS, grants, SECURITY DEFINER and default ACLs

Production:
- Ten public tables have RLS enabled and zero policies.
- Nine of those ten expose effective anon/authenticated SELECT/INSERT/UPDATE/DELETE/TRUNCATE privileges; `upstatus_visual_config` is the exception with no direct client grants. RLS with no policies does not neutralize TRUNCATE.
- Three `upstatus_broadcast_*` functions are SECURITY DEFINER, return `trigger`, set `search_path=public`, and their ACLs include EXECUTE for anon/authenticated/service_role.
- Security Advisor currently reports 6 WARN (three anon + three authenticated) for those functions and 10 INFO for RLS/no-policy tables. The Advisor explicitly describes the functions as callable via `/rest/v1/rpc/...`; catalog confirms `RETURNS trigger`, but no live PostgREST RPC request was made. Treat the warning as **unresolved**, not as a proven false positive. Revoke unnecessary client EXECUTE and harden search_path in a reviewed migration after owner review.
- Default ACLs remain broad for postgres-created public/storage objects and supabase_admin-created public/GraphQL objects.

Lab:
- All seven `upstatus_signal_*` tables are RLS-enabled with zero policies and no effective anon/authenticated SELECT/INSERT/UPDATE/DELETE/TRUNCATE privileges; service_role has the required table access.
- Signal RPCs inspected are SECURITY INVOKER, use empty `search_path`, and grant EXECUTE only to postgres/service_role.
- postgres defaults in public are restricted to postgres/service_role; storage defaults and supabase_admin defaults in public/GraphQL remain broad.

### Realtime and Storage

Production `realtime.messages`: RLS enabled, zero policies, anon/authenticated SELECT/INSERT/UPDATE effective. Current catalog query saw 50 rows, all `private=false`, on one topic: 42 `user_status` and 8 `db_change`. The message trigger uses `to_jsonb(OLD/NEW)` and broadcasts the full row. No external broadcast or access attempt was made; Dashboard Allow public access was not available for inspection.

Production Storage:
- `chat-images`: public, 20 MiB.
- `profile-images`: public, 20 MiB.
- `storage.objects`: RLS enabled, zero policies, anon/authenticated SELECT/INSERT/UPDATE effective.

Lab has no chat/profile buckets. Storage privacy and size alignment remain open.

## Signaling source/runtime findings

### Replay/idempotency remains absent

Lab schema `public.upstatus_signal_events` has only `event_id`, `room_id`, `sender`, `recipient`, `event_type`, `payload`, `created_at`, `expires_at`. The only uniqueness is the event_id primary key; indexes cover recipient/expiry, room and sender. No nonce, idempotency key, sender sequence or replay key exists.

Deployed lab v32 inserts a new event for each accepted `/signal` and `/broadcast` request. `/poll` asks clients to deduplicate the stored `event_id`, but resubmitting the same payload creates a new event_id. TTL limits retention, not replay. Add server-enforced idempotency bound to authenticated sender, room, recipient and event type, with concurrent duplicate tests. No replay was attempted.

### Generic room capacity can exceed 32

CODE INSPECTION of deployed lab v32:
- `/room/create` rejects more than 32 requested participants (creator included).
- `/room/invite` validates room, inviter membership, recipient existence and duplicate membership, but does not enforce a room capacity.
- `/room/accept` atomically changes pending to accepted but does not enforce capacity.
- `upstatus_signal_room_members` has a composite room/user primary key and status check, but no maximum-member constraint/trigger.
- `/room/members` and `/room/status` return at most 32 rows; `/broadcast` fetches at most 32 accepted recipients.
- The separate voice-room-open RPC enforces its 2–32 limit, but does not protect the generic create/invite/accept path.

Repeated invitations/acceptances can therefore produce more than 32 accepted members, while roster/status/fanout queries silently cap at 32. This is a data-integrity and availability risk for authenticated participants. The general write limit is 90/minute per sender; no per-room, per-recipient invite or active-room creation quota was found. Enforce capacity transactionally, including concurrent accept-at-capacity, and add route-specific quotas. No invite flood or fixture mutation was performed.

### Health is liveness-only

The deployed lab `GET /health` returns `ok:true` before checking PostgreSQL, required tables or RPCs. It proves the handler is alive, not ready for traffic. Add a separate bounded readiness probe and do not use the current health response as a cutover gate.

### HTTP 409

Deployed lab `upstatus-signal-test` v32 maps `VOICE_ATTEMPT_CONFLICT` and `ROOM_FULL` to 409 but omits `VOICE_ATTEMPT_ALREADY_ACTIVE`, which can fall through to 500. #105/#106/#108 now cover the route/helper source and malformed RPC error shapes offline, but the deployed function has not been updated and no live HTTP request was sent. Keep runtime HTTP 409 NOT VERIFIED/BLOCKED.

The candidate uses custom `x-upstatus-token` auth with `verify_jwt=false`; the handler validates the app session server-side. Wildcard CORS is not itself an auth bypass because the token is explicit, but supported userscript/extension origins should be reviewed for narrowing.

## Issues and manual acceptance

- [#78](https://github.com/Reekyi/UpStatus/issues/78) remains OPEN with 0/8 criteria checked. Real network loss/recovery without F5, room re-entry, real microphone/display capture and installed Normal ↔ Team Lite interoperability are MANUAL PENDING.
- [#79](https://github.com/Reekyi/UpStatus/issues/79) remains OPEN with 16 checked / 19 unchecked in its body. The latest engineering comment references #108, but the checklist body remains historical and has not been reconciled with this audit.

No physical browser/device/network test was performed in this run.

## Release decision and next gates

**DO NOT RELEASE.**

1. Reconcile #101/#102 into one Normal candidate and #103 into Team Lite; obtain exact combined-head checks including live isolated Supabase/WebRTC.
2. Add server-enforced replay/idempotency and concurrent duplicate tests.
3. Enforce the 32-member cap transactionally across generic room creation, invite and accept; add per-room/per-recipient quotas.
4. Add readiness separate from liveness.
5. Update the isolated runtime only through its approved pipeline and prove HTTP 409 with a real request.
6. Make authenticated signaling the safe default in both clients and remove public media-signaling fallback.
7. Reconcile the separate #104 guard stack; do not merge by assumption.
8. Correct Team Lite deployment manifest, target, CLI pin, project/SHA verification, migration preflight and rollback.
9. Fix the master updateURL mismatch so #82 can obtain a passing Validate.
10. Enable branch protection/required checks for master and team-lite-official; obtain human reviews.
11. Review production grants/default ACLs, trigger RPC exposure, Realtime payload minimization and Storage privacy/limits.
12. Complete AUTH-03 and diagnose `MIGRATIONS_FAILED`.
13. Complete #78 physical acceptance, reconcile #79 and obtain explicit release approval.

## Safety record

No production or lab SQL writes, migrations, Edge Function deployments, workflow dispatches/reruns, fixture mutations, secrets/flags/roles/grants/policies/ACL changes, PR merges, releases or userscript publications were performed. All SQL was SELECT/catalog-only. No Realtime broadcast, SDP/ICE injection, replay attempt, invitation flood, microphone capture or screen capture was performed. The only write in this run is this new documentation file on the dedicated QA branch; no engineering branch or issue was changed.
