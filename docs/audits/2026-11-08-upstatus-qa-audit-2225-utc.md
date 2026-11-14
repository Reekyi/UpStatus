# UpStatus independent QA audit — 2026-11-08 22:25 UTC

## Scope and method

Repository: `Reekyi/UpStatus`  
Production Supabase: `dlfvkawaiqduhlazsszm`  
Isolated signaling project: `bfpjtfqlnypisxljoxkb`

This audit inspected the current QA readiness document first, then refreshed Git refs, PR metadata/diffs, workflow runs/jobs/logs, issues #78/#79, production and isolated Supabase project state, migrations, Edge Functions, Security Advisor, PostgreSQL catalogs, Realtime rows, Storage buckets, and the deployed isolated signaling function.

All SQL in this audit was SELECT/catalog-only. No workflow was dispatched or rerun. No fixture-mutating script was run. No production or lab migration, deployment, merge, release, userscript publication, secret/flag/role/grant/policy/ACL change, or destructive operation was performed.

Status vocabulary:
- **AUTOMATED PASS:** a workflow completed successfully on the exact stated commit.
- **CODE INSPECTION:** source/config/catalog inspection only.
- **MANUAL PENDING:** real browser/device/network/human acceptance is still required.
- **BLOCKED:** a required release dependency is absent or a confirmed blocker remains.
- **NOT VERIFIED:** the available evidence does not prove the behavior or state.

## Refs and repository governance

Exact refs observed during this run:

| Ref | SHA |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| `qa/release-readiness-2026-11-04-master` | `3ba9c15a61d220c46e7906b2f9c21b545401530e` |

The QA branch is 139 commits ahead and 1 behind master; merge base is `a9288ccfcb0f308d3a587bfca624418a395be07b`. The one master-only commit is documentation-only (`docs: record read-only AUTH-03 migration preflight`). No rebase or incorporation was performed.

Branch API responses show `protected=false` and protection disabled for master, team-lite-official, and the QA branch; no required status checks are configured on those refs. This is a governance risk because green checks/reviews are not enforced by branch protection.

### Current PR heads

| PR | Head SHA | Base | State |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `9c0133e8cf6bd85ac8993888718a408db2f24a3e` | master | Open / Draft |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official | Open / Draft |
| [#76 Team Lite candidate](https://github.com/Reekyi/UpStatus/pull/76) | `eb28e88325d7e8a6236d9050bebabf794d64a8c4` | team-lite-official | Open / Draft |
| [#82 QA documentation](https://github.com/Reekyi/UpStatus/pull/82) | `3ba9c15a61d220c46e7906b2f9c21b545401530e` | master | Open / Draft |
| [#85 master updater/role fix](https://github.com/Reekyi/UpStatus/pull/85) | `b75707b6eaf678d87863144748b9aed8e2866455` | master | Open / Draft |
| [#101 production signaling backend](https://github.com/Reekyi/UpStatus/pull/101) | `2ef7c3324d2eb5443d31a45bd071d154ebeb4aa7` | #74 branch | Open / Draft |
| [#102 Normal call-source provenance](https://github.com/Reekyi/UpStatus/pull/102) | `c4a5cae1271147204ab3b0c79b8916235f0799aa` | #101 branch | Open / Draft |
| [#103 Team Lite call-source provenance](https://github.com/Reekyi/UpStatus/pull/103) | `b3fb66429851024ee513bccb4700c944e50ff0cb` | #76 branch | Open / Draft |
| [#104 RT-01 release guard](https://github.com/Reekyi/UpStatus/pull/104) | `da45e7418a9d9c7719ca447a25024aeb4a553bfc` | separate RT-01 parent | Open / Draft |

No submitted GitHub reviews were found on #74, #75, #76, #82, #101, #102, #103, or #104. The PRs are not approved for merge.

# CI and PR evidence

## Main candidate lines

- Normal #74 exact head: Validate [42451736696](https://github.com/Reekyi/UpStatus/actions/runs/42451736696) **AUTOMATED PASS**; Signaling Smoke [42451736729](https://github.com/Reekyi/UpStatus/actions/runs/42451736729) **AUTOMATED PASS**.
- Team Lite #76 exact head: Candidate Checks [42450476433](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) **AUTOMATED PASS**.
- Team Lite #75 run [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) is a historical baseline pass, not the current Team Lite candidate. #76 is the newer candidate.
- These #74/#76 runs predate the new #101/#102/#103 stack. They do not validate the combined backend + provenance changes.

## QA #82 and the updater URL failure

The exact QA head Validate [42526633725](https://github.com/Reekyi/UpStatus/actions/runs/42526633725) is **FAILURE**. The job log confirms:
- Build completed as `3.4.7 / TEST 3.4.7`.
- `scripts/validate.mjs:26` failed with `production updateURL mismatch`.

The current master source explains the failure:
- `scripts/build.mjs` constructs production `updateURL` from the legacy beta10 API host.
- `release.json` declares the stable `/functions/v1/upstatus/upstatus.user.js` distribution URL.
- `scripts/validate.mjs` explicitly requires the stable `/upstatus/upstatus.user.js` path.

This is a master build/validation contract mismatch, not a defect in the Markdown document. The related fix exists in separate Draft PR #85: its build derives the update URL from `release.json.scriptUrl`, separates the API host from the distribution URL, and keeps TEST update feeds isolated. Validate [42475230911](https://github.com/Reekyi/UpStatus/actions/runs/42475230911) completed successfully on #85's exact head. #85 remains open/Draft and is not merged, so master and QA remain red.

## New signaling and provenance stack

- #101 source parity + complete offline Normal Validate [42513317464](https://github.com/Reekyi/UpStatus/actions/runs/42513317464): **SUCCESS**, but GitHub run metadata says event `push`, not `pull_request`. The workflow in #101 has only a push trigger. Therefore #101 has no PR-triggered check on its own head.
- #102 Normal source-boundary workflow [42519210669](https://github.com/Reekyi/UpStatus/actions/runs/42519210669): **AUTOMATED PASS** on a PR-triggered run. It runs offline source checks and complete offline Normal Validate, not Supabase/WebRTC E2E.
- #103 Team Lite call-source guard [42519564405](https://github.com/Reekyi/UpStatus/actions/runs/42519564405): **AUTOMATED PASS** on a PR-triggered run. The workflow is offline-only and checks adapter policy, call-source wiring, and static Team Lite contracts.
- #104 RT-01 provenance/release guard [42524476674](https://github.com/Reekyi/UpStatus/actions/runs/42524476674): **AUTOMATED PASS** on an offline guard workflow. It does not deploy or exercise the runtime.
- #104 is 11 commits ahead of its RT-01 parent `0ff11af43e78bfe57d39a2a0098c30f29afed9a2`; its body explicitly says the parent still lacks the production signaling artifacts and pre-cutover Normal userscript. The guard intentionally blocks that parent. It is not a release candidate.

The stack relationships are not a single integrated candidate:
- #101 is 10 commits ahead of #74.
- #102 is 13 commits ahead of #101.
- #103 is 16 commits ahead of #76.
- #104 is a separate release-guard stack.
Do not add these independent green runs together and call the combined product validated. A deliberate stack integration and exact-head E2E is still required.

# P0 — public Realtime and authenticated signaling cutover

## Production runtime inventory

Production project `dlfvkawaiqduhlazsszm` is `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002, with seven migrations and 38 ACTIVE Edge Functions. The core deployed functions remain:

| Function | Version | Source SHA |
|---|---:|---|
| `upstatus` | v480 | `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd` |
| `upstatus-screen-share-3-1-1-beta10` | v6 | `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29` |
| `upstatus-team-lite` | v15 | `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb` |
| `upstatus-test` | v281 | `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a` |

All 38 production functions report `verify_jwt=false`. This is not by itself proof of unauthenticated access: the existing UpStatus endpoints use custom-token authentication. It does mean the route-by-route application-auth inventory must remain explicit.

No production function named `upstatus-signal` is deployed. The only isolated functions are `upstatus-signal-test` v32 (SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`) and `upstatus-signal-e2e-once` v3 (SHA `db0c9206b2171f5f5d67459e2e7451ecbaf6e8ad3c8f55cb4e491660164f5053`).

Production's seven migration versions end at `20261027155438`. The isolated project `bfpjtfqlnypisxljoxkb` is `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.003, with 38 migrations and two active test functions. It has the server-mediated signaling schema; production does not.

## #101 production signaling handler — code inspection

PR #101 adds `supabase/functions/upstatus-signal/` and migration `20261108190000_distributed_signaling_rate_limit.sql`. The handler source SHA is `27729216bc28123317736e5d7d4b5e0ed1cf770f`; the rate-limit migration blob SHA is `0441b7a591c59704d14ca8ea54c98373253fc478`.

Positive controls found in the candidate:
- Custom session token is read from `x-upstatus-token`; only its SHA-256 hash is queried against `upstatus_sessions`, and the session expiry plus existence of the user are checked.
- Sender identity is derived from the server-side session, not trusted from the request payload.
- Room status/expiry and accepted membership are checked server-side. Unicast verifies both sender and recipient membership; broadcast verifies the sender and derives accepted recipients server-side; poll is recipient-scoped.
- Identity/recipient claims are stripped recursively from payloads.
- Event allowlists and legacy envelope subtype allowlists are present.
- Request body is stream-limited to 20 KiB; normalized payload JSON is capped at 12 KiB; traversal is bounded by depth 64 and 4,096 visited nodes.
- Event TTL is two minutes; room TTL is two hours.
- Distributed rate limits are 90 writes/minute and 240 reads/minute per authenticated user, with HTTP 429 and `Retry-After: 60`.
- The rate-limit migration enables RLS, revokes table/function access from PUBLIC/anon/authenticated, grants service_role only, and defines the RPC as SECURITY INVOKER with an empty search_path.
- The candidate config explicitly keeps `verify_jwt=false` because the handler validates the UpStatus custom session token itself.

This is **CODE INSPECTION + OFFLINE AUTOMATED PASS**, not a deployed runtime test. The PR's workflow is push-only. Its source-parity test compares repository files (`upstatus-signal` and `upstatus-signal-test`) and checks required migration files exist; it does not fetch or attest the deployed Edge Function or prove migrations were applied.

## Newly identified signaling gaps

1. **No replay/idempotency guard was found in the signaling event contract.** The isolated `upstatus_signal_events` table has only `event_id, room_id, sender, recipient, event_type, payload, created_at, expires_at`. Its indexes are event_id PK plus room/recipient/sender indexes; there is no nonce, idempotency key, sequence, or unique replay key. Candidate `/signal` and `/broadcast` insert a new event row for each accepted request. The two-minute TTL limits how long an event remains queued; it does not prevent a valid room member from resubmitting the same offer/ICE/control payload and creating a new event. Add a server-enforced idempotency/replay strategy and tests before treating replay protection as complete.
2. **Invitation amplification is not fully bounded.** `/room/create` accepts up to 32 participant names (sender plus up to 31 invitees), while the general per-user write bucket permits 90 writes/minute. No per-recipient invitation quota or active-room creation cap was found in this handler. This is an authenticated abuse/availability risk, not an unauthenticated access bypass. Add route-specific limits and recipient/room quotas.
3. **Health is liveness-only.** Unauthenticated GET `/health` returns `ok:true` without checking required tables/RPCs or database connectivity. Do not use it as a readiness gate for a production cutover. Add a separate readiness check that verifies required schema/RPC dependencies without exposing sensitive details.
4. **Public CORS is wildcard.** The handler uses `Access-Control-Allow-Origin: *` and permits the custom token header. The token is not an ambient cookie, so wildcard CORS alone is not an authentication bypass; nevertheless, review whether the supported userscript/extension origins can be narrowed without breaking GM requests.
5. The candidate endpoint has not been exercised against a deployed production-equivalent function/database. Its service-role query paths, transaction/race behavior, cleanup failure handling, and 32-member behavior still need isolated runtime tests.

## Deployed lab v32 versus repository candidate

A direct source comparison found the deployed lab `upstatus-signal-test` v32 differs from the repository candidate source:
- Deployed v32 does **not** contain `VOICE_ATTEMPT_ALREADY_ACTIVE` in the `/room/open` HTTP status mapping.
- The repository's `supabase/functions/upstatus-signal-test/index.ts` source does contain that mapping.
- PR #101's production candidate also maps `VOICE_ATTEMPT_ALREADY_ACTIVE` to HTTP 409.

Therefore the repository source-parity check can pass while the currently deployed lab function remains behind. No real HTTP request was sent to v32 during this audit; the mismatch is confirmed by source comparison. The HTTP 409 runtime contract remains **NOT VERIFIED** until the isolated function is updated through its approved pipeline and exercised over HTTP.

# PR #102/#103 — call-source provenance

The previous client used payload-controlled `_authenticatedTransport: true` as proof of authenticated signaling. A public sender could supply that property.

The candidate fixes pass transport provenance out-of-band:
- Authenticated polling/invitation paths pass `true`.
- Public Realtime listener passes `false`.
- The payload marker is removed.
- Public call discovery is restricted to own-property `presence` and `ended` hints with `discoveryOnly: true`.
- Public `ended` only removes a call-directory entry; it cannot terminate an active call.

#102 and #103 CI passed their offline source tests. Residual: public `presence` and `ended` hints remain untrusted and can mislead/hide call-directory entries. More importantly, the authenticated transport remains opt-in in the #74/#76 product candidates (default flag false); the public media-signaling fallback is still available while the flag is off. These PRs do not yet establish a safe default-on cutover or prove full browser/WebRTC behavior on their combined heads.

## RT-01 guard #104

#104 correctly adds the distributed rate-limit migration to the required production migration list and updates provenance checks to the out-of-band model. Its offline guard passed. Its own description confirms its parent lacks the production signaling adapter/function and pre-cutover Normal userscript. Keep it as a guard-only child, not evidence of release readiness.

# Supabase catalog and security

## Production

- Project status: `ACTIVE_HEALTHY`; managed `main` branch status: `MIGRATIONS_FAILED`, while its preview project status is `ACTIVE_HEALTHY`. Cause not established.
- Seven production migrations; no `upstatus_signal_*` tables and no signaling rate-limit/call/voice RPCs.
- `upstatus_sessions` columns are `token_hash, user_name, expires_at, created_at`; no setup-token columns exist on `users`.
- Security Advisor observed at 2026-11-08 22:25: 6 WARN (three trigger-returning SECURITY DEFINER functions reported for anon and authenticated) and 10 INFO (RLS enabled without policies). Health Advisor returned no findings.
- Ten public tables have RLS and no policies. Nine backend-owned tables still grant anon/authenticated SELECT and TRUNCATE among other privileges. RLS without policies denies ordinary row access but does not protect TRUNCATE; no destructive test was attempted.
- The three `upstatus_broadcast_*` functions return `trigger`, are attached to triggers, are SECURITY DEFINER, have `search_path=public`, and still have client EXECUTE grants. The linter's suggestion of direct RPC invocation is not established for trigger-returning functions; the broad grants are unnecessary and the search_path should be hardened.
- Default ACLs for postgres in public/storage and supabase_admin in public/GraphQL schemas still include anon/authenticated grants.
- `realtime.messages`: RLS enabled, zero policies, anon/authenticated SELECT and INSERT grants. Current snapshot: 50 rows, all `private=false`, 42 `user_status` and 8 `db_change`, on topic `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`. The current userscript topic observed in prior deployed-source inspection is `upstatus-screen-share-live-3-1-1-beta10`; it does not match the trigger topic. The message trigger publishes full OLD/NEW JSON. Dashboard `Allow public access` is not exposed by the connector; no external broadcast or exploit was attempted.
- Storage buckets `chat-images` and `profile-images` are both public and limited to 20 MiB. Existing candidate config has different chat/profile limits; policy/privacy and MIME/size alignment remain open.

## Isolated project

- 38 migrations; signal rooms/members/bindings/events/rate-limit/call-attempt/voice-attempt tables exist, RLS enabled, zero policies.
- Signal tables grant no SELECT/INSERT to anon/authenticated; service_role has required CRUD.
- Signal RPCs inspected are SECURITY INVOKER, empty search_path, no EXECUTE for anon/authenticated, EXECUTE for service_role.
- Backend-owned application tables have no direct client table grants in the inspected set.
- Realtime still has zero rows and zero policies, but anon/authenticated SELECT/INSERT grants remain; no claim of private Realtime is made.
- Security Advisor: 0 WARN / 17 INFO. The INFO findings reflect RLS enabled without policies on backend-owned tables and should not be “fixed” by adding broad client policies.
- Default ACLs for postgres in public are restricted to postgres/service_role, but storage defaults and supabase_admin defaults in public/GraphQL schemas remain broad.

## Logs (24-hour query window)

Production returned 731 edge logs, 215 function-edge logs, 132 function logs, 77 pgbouncer logs, 42 postgres logs, 5 workflow-run logs, and one Realtime plus one Storage event. Function-edge logs only cover approximately 18:39–19:14 UTC on 2026-11-08; they are not a complete 24-hour runtime history.

The lab returned 40,657 edge logs and 7,933 function-edge logs, but function-edge coverage only spans approximately 23:10 UTC on 2026-11-07 through 05:52 UTC on 2026-11-08. Do not infer current runtime activity or full-day absence from these partial windows.

# Issues and manual acceptance

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) remains OPEN; all 8 acceptance checkboxes are unchecked. The issue describes failure to re-enter a voice room after ~10 seconds of internet loss without F5. No real browser/network-loss test was performed in this audit.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) remains OPEN; the current body has 16 checked items and 19 unchecked items (35 total).
- MANUAL PENDING: Tampermonkey GM bridge in separate profiles; real microphone permissions/capture/playback and mute/unmute; real display/tab capture and stop-sharing; repeated network drops and recovery without F5; Normal ↔ Team Lite installed cross-client calls/voice/screen in both directions; multi-member/maximum-room load and simultaneous-call behavior.
- Earlier manual tests on legacy artifacts do not satisfy current candidate acceptance.

# Release decision and next gates

**DO NOT RELEASE.** The main gates are:

1. Integrate #101 + #102 into one Normal stack and #103 into the Team Lite stack; obtain PR-triggered checks for the exact combined heads, not only push/offline child checks.
2. Add replay/idempotency protection and route-specific invitation/room quotas to the signaling backend; add a readiness check distinct from liveness.
3. Update and test the isolated deployed signal function so the actual HTTP 409 mapping matches the repository candidate; source parity alone is insufficient.
4. Make authenticated signaling the safe default in both clients, remove public call/voice/screen media fallback, and test full browser/WebRTC behavior on the integrated exact heads.
5. Review the public discovery hints and complete the public Realtime migration/payload minimization plan. Verify the Dashboard public-access setting through an authorized channel.
6. Review and apply the full required signaling/AUTH-03 migrations only through an explicitly approved, staged cutover; production currently lacks the schema.
7. Fix the Team Lite deployment workflow to target `upstatus-team-lite`, pin the CLI, verify project and SHA, preflight migrations, and document rollback. Do not dispatch the current Team Lite workflow.
8. Resolve the master updateURL mismatch through the reviewed #85 fix or equivalent integration; #85 Validate passed but the PR is still Draft/unmerged.
9. Correct production grants/default ACLs with the owning team, define Storage privacy/limits, and diagnose `MIGRATIONS_FAILED`.
10. Complete the eight physical acceptance criteria in #78, update #79, and obtain human reviews/explicit release approval.

No completion percentage is reported. CI, static inspection, deployed runtime state, and manual acceptance remain separate evidence classes.

## Safety record

No production or lab SQL writes, migrations, Edge Function deployments, workflow dispatches/reruns, fixture mutations, secrets/flags/roles/grants/policies/ACL changes, PR merges, releases, or userscript publications were performed. All SQL was SELECT/catalog-only. No Realtime attack, broadcast injection, WebRTC offer/ICE injection, microphone capture, or screen capture was performed. The only write in this run is this new documentation file on the dedicated QA branch; no engineering branch or issue was changed.


## Addendum — updater fix also present in Normal #74

A follow-up source read corrected one omission in the comparison above. The current #74 branch (`chore/continuity-foundation`) already contains the updater URL fix, not only the separate #85 branch:

- #74 `scripts/build.mjs` blob `55b7db9c36a58956cfa41d5002ac290ab8fee5d3` derives the production `updateURL` from `release.json.scriptUrl`, validates the stable `/functions/v1/upstatus/upstatus.user.js` path, and keeps TEST on a separate non-production project/URL.
- #74 `scripts/validate.mjs` blob `bab708afb472542961f1ee06478704ea41495280` checks exact production updateURL equality and the isolated TEST URL contract.
- #74 exact-head Validate [42451736696](https://github.com/Reekyi/UpStatus/actions/runs/42451736696) is SUCCESS.

Thus the mismatch remains specifically on current master/QA; both #74 and #85 contain candidate fixes, but neither has been merged. This correction does not change the release decision or the fact that #82's latest observed merge-ref Validate failed against master.
