# UpStatus independent QA audit — 2026-11-09 01:28 UTC

## Scope and method

Read the QA baseline `docs/RELEASE_READINESS.md` first (blob SHA `7cfbd70886df42ce790c078c224b19284a632595`). Rechecked GitHub refs, PR metadata, workflow runs and job logs; inspected production and isolated Supabase project inventories, deployed Edge Function source, migration history, RLS, grants, SECURITY DEFINER functions, Realtime triggers/messages, Storage buckets, and relevant SQL catalog metadata.

All database statements in this audit were SELECT/catalog reads. No test harness that writes fixtures was run. No production or lab migration, deploy, merge, release, secret/flag/role/grant/policy/ACL change, or userscript publication was performed. No physical browser/device test was performed.

## Exact refs observed

- master: `9d40461babcec8eb868c2a04be9c675df7da381`
- team-lite-official: `9065bc1536fde64f437f6f12b7abb9b072cb8281`
- QA branch and PR #82 HEAD: `5815951953fb516567304a27798da032a332f1bf`
- QA compared with current master: 143 commits ahead, 1 behind; merge base `a9288ccfcb0f308d3a587bfca624418a395be07b`. The current master commit absent from QA is the documentation-only AUTH-03 migration preflight checkpoint. PR #82 metadata returned base_sha a9288ccfcb0f308d3a587bfca624418a395be07b, matching the comparison merge base; the live master ref above is authoritative for the current base.
- The QA baseline file SHA remains `7cfbd70886df42ce790c078c224b19284a632595`.

GitHub branch API reports master and team-lite-official as protected=false, with required status-check enforcement off and empty required-check contexts. Repository-level rulesets were not inspected, so this finding is limited to the branch-protection data returned by the branch endpoint.

## PRs, exact heads and CI evidence

| PR | Exact HEAD | Current evidence / boundary |
|---|---|---|
| #74 Normal | `9c0133e8cf6bd85ac8993888718a408db2f24a3e` | Validate 42451736696 PASS; Signaling Smoke 42451736729 PASS |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Historical Candidate Checks 41674353127 PASS; not the current Team Lite signaling candidate |
| #76 Team Lite | `eb28e88325d7e8a6236d9050bebabf794d64a8c4` | Candidate Checks 42450476433 PASS |
| #82 QA | `5815951953fb516567304a27798da032a332f1bf` | Validate 42540676032 FAIL: production updateURL mismatch at scripts/validate.mjs:26 |
| #101 production signal backend | `2ef7c3324d2eb5443d31a45bd071d154ebeb4aa7` | Push validation 42513317464 PASS; no PR-triggered run was returned for this HEAD |
| #102 Normal provenance | `c4a5cae1271147204ab3b0c79b8916235f0799aa` | PR workflow 42519210669 PASS |
| #103 Team Lite provenance | `b3fb66429851024ee513bccb4700c944e50ff0cb` | PR workflow 42519564405 PASS |
| #104 RT-01 release guard | `da45e7418a9d9c7719ca447a25024aeb4a553bfc` | PR workflow 42524476674 PASS; offline guard only |
| #105 HTTP route contract | `28d4aaaedc52e16d6ded938b842cf048aceefe30` | PR Validate 42538289953 PASS |
| #106 executable HTTP mapper | `7ed1f8ca602d8127d5c38727de304ae8d4b7b7c0` | PR Validate 42538295974 PASS |
| #108 malformed RPC error shape | `59f8650a1c18e0c94eaf80eda8775d5418ed3fd9` | Exact-head PR Validate 42543614675 PASS |
| #109 transactional room capacity | `94d43feca3ca4632862e24f7cdf5ecc4c4c9ac39` | Exact-head UpStatus Validate 42544535436 PASS; offline/source contract only |

The #82 job log confirms the failure is still the inherited master assertion: 'production updateURL mismatch'. The successful #74 candidate uses the release manifest URL, but that correction is not in current master.

PR #109 is stacked on the #108 v2 branch (base HEAD `59f8650a1c18e0c94eaf80eda8775d5418ed3fd9`). It remains Draft, mergeable, and has no human review. PR #108 also has no human review. Review queries returned no submitted reviews for #74-#76, #82, #101-#106, #108 and #109. PR #107 was not re-reviewed because it is the superseded dirty attempt. PR #107 is the dirty/superseded first attempt; do not integrate it.

PR #104 remains a separate divergent line: compared with #101, it is 119 commits ahead and 887 behind, with merge base `a9288ccfcb0f308d3a587bfca624418a395be07b`. Do not combine the release guard and backend stacks by blind merge.

## Important candidate progress

### #108 — safer HTTP error contract

The candidate requires an own, non-empty string error field, avoids String coercion and uses exact Map lookup. Malformed RPC results fail closed with HTTP 500. The exact-head workflow log includes the executable voice-room status contract and full offline Normal validation. This is source-level validation, not a request to a deployed Edge Function.

The isolated deployed function remains v32 and its source still does not map VOICE_ATTEMPT_ALREADY_ACTIVE to HTTP 409. The deployed route can therefore still return HTTP 500 for that case. No live HTTP request was made.

### #109 — generic room capacity fix candidate

The new production migration is `20261109010000_enforce_signal_room_member_capacity.sql` (blob SHA `eeae5af9efb2d8a2334aa153106570a33918cfdd`). It adds invite/accept RPCs that are VOLATILE, SECURITY INVOKER, use an empty search_path, revoke PUBLIC/anon/authenticated execution, and grant EXECUTE only to service_role. Both lock the room row before membership rows and enforce at most 32 accepted members. The candidate routes /room/invite and /room/accept call those RPCs and map ROOM_FULL to HTTP 409.

The isolated handler source blob is `f85e1d6de34738f073e27a807472f34072577a20`; the production handler source blob is `fa014bd8ed51688cea381f16fbabd5b1382908c0`. The isolated catalog test migration blob is `ac8ba49b4efc1009e3fbac29fa0f869da1ba2c65`.

Run 42544535436 logs 'Generic signaling room capacity contract tests passed' and checks the live harness syntax. It does not execute the live concurrent HTTP harness. The harness is deliberately gated by the exact isolated project ref, UPSTATUS_SIGNAL_ALLOW_MUTATION=1, an empty-fixture preflight, and the X-UpStatus-Signal-Capacity marker. The deployed lab runtime v32 does not advertise that marker; the test migration and candidate runtime have not been applied to the lab. No fixture mutation was attempted.

This is a meaningful source-level fix for the previously identified accepted-member overflow, including concurrent accepts. It is not yet proven in the running lab or integrated into the Team Lite release stack. Route-specific invite quotas remain undefined. Pending invitations can still accumulate while accepted-member count is below 32, while room/member status queries are capped at 32; this needs a separate quota/visibility decision.

## Remaining signaling integrity findings

- The deployed lab v32 handler and the #109 candidate handler contain no nonce, idempotency key, replay cache, per-sender sequence, or dedupe constraint for signal events. The lab event table has event_id, room_id, sender, recipient, event_type, payload, created_at and expires_at; event_id is the row identity, not a client-operation idempotency key. Re-sending the same SDP/ICE payload can create a new event row. TTL does not prevent replay within the TTL.
- The #109 /health route returns ok=true and a static capacity-version header. It does not check PostgreSQL connectivity, required tables, RPC availability or rate-limit readiness. The header is a candidate-code marker, not a database-backed readiness probe.
- The new capacity migration is absent from the lab's applied migration history (lab remains at 38 migrations, latest 20261108050802) and absent from production. The production project still has no upstatus-signal Edge Function or signaling schema.
- #109 only changes the Normal backend candidate. Team Lite provenance work in #103 is not yet reconciled with the shared backend/capacity stack.

## Production runtime and Realtime

Supabase inventory shows only two projects in the organization:
- Production `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations, 38 active Edge Functions.
- Isolated lab `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 38 migrations, 2 test Edge Functions.
There is no independent full-product TEST project. Production's managed main branch is MIGRATIONS_FAILED while its preview status is ACTIVE_HEALTHY.

Production function inventory includes Normal upstatus v480, Team Lite upstatus-team-lite v15, beta10 API v6, upstatus-test v281 and numerous old test/beta/backup slugs. All 38 report verify_jwt=false; this disables platform JWT verification and makes per-function custom authentication review essential. Not every legacy/backup handler was individually audited in this pass. Production has no upstatus-signal function. Lab has upstatus-signal-test v32 (SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`) and upstatus-signal-e2e-once v3.

The currently deployed userscripts extracted from production are Normal 3.4.7 and Team Lite 3.4.30. Normal's API CLOUD_SERVER is beta10; Team Lite uses upstatus-team-lite. Both subscribe only to topic `upstatus-screen-share-live-3-1-1-beta10` and still consume public Realtime call/voice/screen signaling. Neither deployed userscript contains the authenticated signaling flag/endpoint adapter. Normal's public remote_command handler executes the broadcast command payload directly; Team Lite checks its authenticated session generation but still takes the command/result content from the public broadcast. This is not server-authenticated provenance.

A topic mismatch was confirmed:
- Production database trigger functions publish to `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0` with private=false.
- Both deployed userscripts subscribe to `upstatus-screen-share-live-3-1-1-beta10`.
The decoded userscripts contain only the latter topic. Trigger-originated db_change/user_status/remote command/result events therefore do not reach that userscript subscription; confirm whether another consumer exists before assigning the full product impact.

Production Realtime catalog: 50 stored rows, 8 db_change and 42 user_status, all on the trigger topic and private=false; 7 partitions. The messages trigger broadcasts the full OLD/NEW row via to_jsonb. The remote-state trigger broadcasts command/result metadata. The user-status trigger broadcasts status metadata.

Production RLS/grants/Advisor:
- Security Advisor reports 3 WARN for anon and 3 WARN for authenticated on upstatus_broadcast_messages(), upstatus_broadcast_remote_state() and upstatus_broadcast_users(), plus 10 INFO for RLS enabled without policies.
- The three functions are SECURITY DEFINER with search_path=public and EXECUTE for anon/authenticated/service_role. The Advisor describes them as callable through /rest/v1/rpc; their catalog return type is trigger. No direct PostgREST HTTP call was made, so the endpoint behavior remains unverified and the warnings must not be dismissed.
- Ten public tables have RLS and no policies. Nine backend-owned tables retain broad anon/authenticated grants, including TRUNCATE. RLS currently denies ordinary row operations without policies, but TRUNCATE and unnecessary grants remain a privilege-hardening risk.
- realtime.messages has RLS/no policies but client SELECT/INSERT/UPDATE grants.
- storage.objects has RLS/no policies and client grants. chat-images and profile-images are public buckets with 20 MiB limits.
- Default ACLs for postgres in public are broad in production. In the lab, postgres defaults in public are restricted to postgres/service_role, but supabase_admin defaults in public/graphql/graphql_public and storage defaults remain broad.

Lab Security Advisor reports 0 WARN and 17 INFO (RLS/no-policy notices). The audited signal tables have no direct anon/authenticated grants; signal RPCs currently deployed in the lab use SECURITY INVOKER, empty search_path and service_role-only execution. The new capacity RPCs are not yet installed there.

## AUTH-03

Production users table has no setup-token columns and no consume_upstatus_setup_invite RPC. The lab users table has four setup-token columns and consume_upstatus_setup_invite(p_user_name, p_setup_token_hash, p_password_hash), SECURITY INVOKER, empty search_path and service_role-only EXECUTE. Production currently has 5 users and 262 messages; the lab has 0 users and 0 messages. No setup-invite migration was applied to production.

## Deployment workflows

- master .github/workflows/deploy-production.yml is workflow_dispatch-only. It checks root release.json for stable 3.4.7, runs Validate, installs Supabase CLI latest, then deploys only upstatus using SUPABASE_PROJECT_ID. It has no explicit project-ref assertion or production migration preflight in the workflow.
- team-lite-official workflow is also workflow_dispatch-only. Its root release.json is 3.0.40 with preRelease beta.22, so its current guard rejects it. The Team Lite manifest at team-lite/release.json is buildVersion 3.4.30. If the guard were bypassed, the workflow still deploys slug upstatus, not upstatus-team-lite, and uses CLI latest. Do not dispatch either workflow as part of this audit.

## Issues and manual acceptance

- Issue #78 remains OPEN. All 8 physical acceptance criteria are unchecked. The latest evidence comment says automated Normal/Team Lite tests passed, but real installed Tampermonkey offline/reconnect/no-F5, microphone/display permissions and installed cross-version interoperability remain unperformed.
- Issue #79 remains OPEN and was updated 2026-11-09 01:15:34 UTC. Its latest comment records #109 and explicitly says the live capacity harness/test migration were not run, route-specific invite quotas and replay/readiness remain open, and Team Lite reconciliation is still required. The checklist body is historical and should be re-baselined against the current PR heads.

## Decision and next gates

**NO RELEASE.** Automated source-level checks are useful but do not prove deployed runtime behavior or physical acceptance.

1. Reconcile #101/#102/#108/#109 into one Normal candidate and reconcile the equivalent backend/client contract into Team Lite.
2. Add server-side event idempotency/replay protection.
3. Keep the 32 accepted-member cap transactional; execute the guarded concurrent HTTP harness only after an authorized isolated runtime/schema update, and define pending-invite quotas.
4. Implement database-backed readiness, not only a static health marker.
5. Verify HTTP 409 against the running isolated Edge Function.
6. Make authenticated signaling mandatory and remove public call/voice/screen fallback before cutover.
7. Resolve the production Realtime topic mismatch and stop full-row public message broadcasts.
8. Resolve SECURITY DEFINER EXECUTE warnings, public table grants, TRUNCATE privileges and default ACLs with an owner-approved migration plan.
9. Complete AUTH-03 and a coordinated production migration/cutover plan.
10. Fix Team Lite's release workflow to read its own manifest and deploy upstatus-team-lite; pin the CLI and assert the intended project ref.
11. Add branch protection/required checks and human review; inspect repository rulesets separately.
12. Diagnose production MIGRATIONS_FAILED.
13. Complete #78 physical acceptance and refresh #79.

No production or lab write, migration, deploy, merge, release, publication, secret/flag/role/grant/policy/ACL change, or fixture mutation was performed.
