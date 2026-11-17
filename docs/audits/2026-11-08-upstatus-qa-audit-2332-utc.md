# UpStatus independent QA audit — 2026-11-08 23:32 UTC

## Scope and evidence classes

Repository: Reekyi/UpStatus. Production Supabase: dlfvkawaiqduhlazsszm. Isolated signaling project: bfpjtfqlnypisxljoxkb.

This audit first read docs/RELEASE_READINESS.md on the dedicated QA branch, then refreshed Git refs, PR metadata/reviews, exact-head workflow runs and logs, issue #78/#79, candidate source, deployed lab Edge Function source, Supabase migrations/functions/advisors, and read-only PostgreSQL catalogs.

Status vocabulary:
- AUTOMATED PASS: a completed workflow passed on the stated commit.
- CODE INSPECTION: source/config/catalog review only.
- MANUAL PENDING: requires real browser, device, network or human acceptance.
- BLOCKED: a required release dependency is absent or a blocker is confirmed.
- NOT VERIFIED: available evidence does not prove the behavior/runtime state.

## Refs and QA integrity

Observed refs:
- master: 9d40461babcec8eb8686c2a04be9c675df7da381
- team-lite-official: 9065bc1536fde64f437f6f12b7abb9b072cb8281
- qa/release-readiness-2026-11-04-master: 4807f1212587e036390097c878e41ebec5846d90

QA is 141 commits ahead and 1 behind master; merge base is a9288ccfcb0f308d3a587bfca624418a395be07b. No rebase or incorporation was performed.

The main readiness file was re-read; its current blob SHA is 7cfbd70886df42ce790c078c224b19284a632595. The previous separate audit note docs/audits/2026-11-08-upstatus-qa-audit-2225-utc.md was re-read at blob SHA b189f06a2b3116389a87c8c619d280c55c8a08ea. This new note is a separate file; neither existing file is replaced.

The GitHub branch-protection endpoint returned HTTP 403 in this run. Branch protection/required checks therefore could not be independently re-verified now. Do not treat the earlier audit's unprotected-branch observation as a fresh confirmation.

## Current PR heads and CI

| PR | Exact head | Base | Current evidence |
|---|---|---|---|
| #74 Normal | 9c0133e8cf6bd85ac8993888718a408db2f24a3e | master | Validate 42451736696 PASS; Signaling Smoke 42451736729 PASS |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | team-lite-official | 41674353127 historical PASS; superseded by #76 |
| #76 Team Lite candidate | eb28e88325d7e8a6236d9050bebabf794d64a8c4 | team-lite-official | Candidate Checks 42450476433 PASS |
| #82 QA docs | 4807f1212587e036390097c878e41ebec5846d90 | master | Validate 42530636037 FAILURE |
| #101 production signaling backend | 2ef7c3324d2eb5443d31a45bd071d154ebeb4aa7 | #74 branch | 42513317464 PASS on push only; no PR-triggered run |
| #102 Normal provenance | c4a5cae1271147204ab3b0c79b8916235f0799aa | #101 branch | 42519210669 offline PASS |
| #103 Team Lite provenance | b3fb66429851024ee513bccb4700c944e50ff0cb | #76 branch | 42519564405 offline PASS |
| #104 RT-01 guard | da45e7418a9d9c7719ca447a25024aeb4a553bfc | separate RT-01 parent | 42524476674 offline guard PASS |
| #105 room-open 409 route guard | d6f719ef4f32627b77622368d4c108c8afd20e21 | #102 branch | 42533180658 PASS |
| #106 executable HTTP mapper contract | e510731f817b8d6a77ed86a6352d38b0f9e1512d | #105 branch | 42533254905 PASS |

All listed PRs remain open/Draft. No submitted human reviews were found on #74, #75, #76, #82, or #101–#106.

### QA #82 failure

The exact-head Validate 42530636037 checked merge ref b9014a298dd29ca2e68e979d1b063af334bc5630 and failed in scripts/validate.mjs:26 with:

production updateURL mismatch

The build completed as 3.4.7 / TEST 3.4.7. This is the existing master build/validation contract mismatch, not a defect in the Markdown note. The candidate fix exists in #74 and #85, but neither is merged into master; #82 therefore remains red against its base.

### New PRs #105 and #106 — meaningful progress, bounded scope

#105 adds a route-scoped source assertion that the /room/open route calls the voice-attempt RPC and maps VOICE_ATTEMPT_CONFLICT, VOICE_ATTEMPT_ALREADY_ACTIVE and ROOM_FULL to HTTP 409.

#106 extracts the status mapping into byte-identical http-contract.mjs modules for the production candidate and repository-isolated handler. The test imports and executes those real modules and checks 400/404/410/409/500 outcomes, malformed results, and prototype-like keys (constructor, toString, __proto__). It also checks that both route handlers use the helper.

The exact #106 PR job log confirms:
- Node 24.22.2.
- Both mapper modules and the parity test pass syntax checks.
- Executable source-parity/status contract passes.
- Full offline Normal Validate passes, including transport adapter, polling, invite, retry, voice-attempt, provenance, setup-invite, signed-upload, chat and updater regressions.

Evidence: #105 PR run https://github.com/Reekyi/UpStatus/actions/runs/42533180658 and #106 PR run https://github.com/Reekyi/UpStatus/actions/runs/42533254905.

Boundary: these are offline source/helper tests, not an HTTP request to a deployed Edge Function. The deployed lab function remains v32 and has not been updated. The helper improvement does not close the live-runtime 409 gate.

### Candidate stacks are still not one release

- #101 is based on #74; #102 is based on #101.
- #103 is based on #76.
- #105 is based on #102; #106 is based on #105.
- #104 is a separate release-guard stack. Compared with #101, its head is 119 commits ahead and 887 behind, with merge base a9288ccfcb0f308d3a587bfca624418a395be07b.

Do not add independent green workflow results together and call the combined system validated. #101 still has only a push-triggered workflow; #102/#103/#104/#105/#106 checks are offline source/guard contracts, not a combined live Supabase/WebRTC run.

## New signaling source findings

### Replay/idempotency is still absent

CODE INSPECTION + LAB CATALOG:

The isolated public.upstatus_signal_events table has event_id, room_id, sender, recipient, event_type, payload, created_at and expires_at. The only uniqueness constraint is the event_id primary key. Its indexes cover recipient/expiry, room and sender. There is no nonce, idempotency key, sender sequence or unique replay key.

The candidate /signal and /broadcast handlers insert new event rows for every accepted request. Poll returns event_id and asks clients to deduplicate/ack after handling, but that only prevents duplicate processing of the same stored row. It does not stop an authenticated room member from resubmitting the same offer/ICE/control payload and creating a new event with a new event_id. The two-minute TTL limits retention, not replay.

Add a server-enforced idempotency key bound to authenticated sender, room, recipient and event type, with concurrent duplicate tests. Cover repeated offer, answer, ICE, hangup, invite and out-of-order events. No replay was attempted in this audit.

### Invitation and room-capacity gap

CODE INSPECTION + LAB CATALOG:

- /room/create rejects more than 32 participants (creator included).
- /room/invite checks room, inviter membership, recipient existence and duplicate membership, but does not count existing members or enforce a room capacity.
- /room/accept conditionally changes pending to accepted but does not enforce capacity.
- upstatus_signal_room_members has only its composite primary key, room/user foreign keys and a status check; no maximum-member constraint or trigger was found.
- /room/members and /room/status return at most 32 rows; /broadcast fetches at most 32 accepted recipients.
- The separate open_upstatus_signal_voice_room RPC does enforce a 2–32 accepted-member limit, but that does not protect the generic room/create + invite + accept path.

A generic call room can therefore accumulate more than 32 accepted members through repeated invitations. Once that happens, member/status responses and broadcast fanout are capped at 32, so some accepted members may be omitted from discovery or signaling fanout.

The general write limiter is 90 writes/minute per authenticated user. No separate active-room creation cap, per-room invite cap or per-recipient invitation quota was found. One room/create request can include up to 31 invitees. This creates an authenticated availability/abuse risk, not an unauthenticated authorization bypass.

Enforce capacity transactionally in the database or a serialized server operation, and add route-specific room/invite quotas. Test concurrent accept-at-capacity and repeated room creation. No invite flood or fixture mutation was performed.

### Health is liveness-only

The candidate GET /health route returns ok:true before authenticating or querying required tables/RPCs. It proves the Edge Function handler is alive, not that the database schema, rate-limit RPC or signaling dependencies are ready. Add a separate readiness check with bounded dependency probes and no sensitive output. Do not use the current /health response as a cutover gate.

The candidate also uses wildcard CORS while permitting x-upstatus-token. Wildcard CORS alone is not an authentication bypass because the token is not an ambient browser cookie, but supported userscript/extension origins should be reviewed for possible narrowing.

## Supabase read-only state

### Projects, migrations and functions

Production dlfvkawaiqduhlazsszm: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, seven migrations, 38 ACTIVE Edge Functions. No production function named upstatus-signal exists. Core deployed functions remain:
- upstatus v480, source SHA bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd
- upstatus-screen-share-3-1-1-beta10 v6, source SHA f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29
- upstatus-team-lite v15, source SHA 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb
- upstatus-test v281, source SHA 7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a

The managed production main branch remains MIGRATIONS_FAILED while its preview is ACTIVE_HEALTHY. The cause was not established.

Lab bfpjtfqlnypisxljoxkb: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 38 migrations, two ACTIVE functions:
- upstatus-signal-test v32, source SHA f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712
- upstatus-signal-e2e-once v3, source SHA db0c9206b2171f5f5d67459e2e7451ecbaf6e8ad3c8f55cb4e491660164f5053

### Deployed lab HTTP 409 remains unverified

Direct source inspection of deployed upstatus-signal-test v32 confirms its /room/open mapping includes VOICE_ATTEMPT_CONFLICT and ROOM_FULL but omits VOICE_ATTEMPT_ALREADY_ACTIVE. It can still map that result to HTTP 500.

The repository candidate source and #106 helper now include the 409 mapping, but no live HTTP request was sent and no lab function was deployed. Keep the deployed HTTP 409 gate NOT VERIFIED/BLOCKED until an approved isolated update and actual HTTP contract test occur.

### AUTH-03

Production has five users, no setup-token columns and no consume_upstatus_setup_invite RPC. The lab has four setup-token columns and the atomic consume RPC. AUTH-03 remains absent from production; no migration was applied.

### RLS, grants, SECURITY DEFINER and default ACLs

Production catalog:
- Ten public tables have RLS enabled and zero policies.
- Nine of the ten audited backend-owned tables grant effective anon/authenticated privileges including SELECT and TRUNCATE. RLS without policies denies ordinary row access, but does not protect TRUNCATE. No destructive privilege test was attempted.
- Three upstatus_broadcast_* functions are SECURITY DEFINER, return trigger, use search_path=public and have effective EXECUTE for anon/authenticated. Their trigger return type means the Advisor's ordinary RPC warning is not proof of a directly invocable PostgREST RPC; the broad grants remain unnecessary and search_path should be hardened.
- Production default ACLs remain broad for postgres-created objects in public/storage and supabase_admin-created objects in public/graphql/graphql_public.

Lab:
- Seven signaling tables are RLS-enabled, have zero client policies, no direct anon/authenticated table grants, and service_role retains the required access.
- Signaling RPCs inspected are SECURITY INVOKER, use an empty search_path and grant EXECUTE only to service_role.
- postgres defaults in public are restricted to postgres/service_role, but storage defaults and supabase_admin defaults in public/GraphQL schemas remain broad.

Security Advisor: production 6 WARN / 10 INFO; lab 0 WARN / 17 INFO. Performance Advisor: production empty; lab has four unused-index INFO findings. Do not add broad client policies merely to silence RLS/no-policy INFO findings.

### Realtime and Storage

Production realtime.messages: RLS enabled, zero policies, anon/authenticated SELECT/INSERT/UPDATE privileges, 50 rows and seven partitions. All 50 rows are private=false: 42 user_status and 8 db_change on topic upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0. The broadcast message trigger publishes full OLD/NEW JSON. The deployed clients subscribe to a different legacy topic. No external broadcast or access was attempted; Dashboard Allow public access was not available for inspection.

Storage production: chat-images and profile-images are public, 20 MiB each, with zero policies in storage.objects. Candidate limits/privacy remain misaligned and require an explicit decision.

## Issues and manual acceptance

- Issue #78 remains OPEN, 0/8 acceptance criteria checked. Physical network loss/recovery without F5, real microphone/display capture, and installed Normal ↔ Team Lite interoperability remain MANUAL PENDING.
- Issue #79 remains OPEN, with 16 checked and 19 unchecked items in its body. Its latest engineering comment records #106, but the checklist body has not been reconciled with this audit.

No physical browser/device/network test was performed in this run.

## Release decision and next gates

**DO NOT RELEASE.**

1. Integrate #101 + #102 into one Normal candidate and #103 into the Team Lite candidate; obtain exact combined-head checks, including live isolated Supabase/WebRTC tests.
2. Add server-enforced replay/idempotency and route-specific invitation/active-room quotas.
3. Enforce the 32-member cap on generic call rooms transactionally; ensure membership listing and broadcast fanout cannot silently omit accepted members.
4. Add readiness separate from liveness.
5. Update the isolated deployed function through its approved pipeline and prove HTTP 409 with a real request; repository helper tests are not runtime evidence.
6. Make authenticated signaling the safe default in both clients and remove public media-signaling fallback.
7. Reconcile the separate #104 guard stack with the backend stack; do not merge by assumption.
8. Correct the Team Lite production workflow target/pinning/project/SHA/preflight/rollback.
9. Resolve the master updateURL mismatch so #82 can obtain a passing Validate.
10. Review production grants/default ACLs, Realtime payloads and Storage privacy/limits with the owning team.
11. Complete AUTH-03 and investigate MIGRATIONS_FAILED.
12. Complete #78 physical acceptance, reconcile #79 and obtain human reviews/explicit release approval.

## Safety record

No production or lab SQL writes, migrations, Edge Function deployments, workflow dispatches/reruns, fixture mutations, secrets/flags/roles/grants/policies/ACL changes, PR merges, releases or userscript publications were performed. All SQL was SELECT/catalog-only. No Realtime broadcast, SDP/ICE injection, replay attempt, invitation flood, microphone capture or screen capture was performed. The only write in this run is this new documentation file on the dedicated QA branch; no engineering branch or issue was changed.
