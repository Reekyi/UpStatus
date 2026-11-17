# UpStatus independent QA audit - 2026-11-09 20:40 UTC

## Executive result

**Release recommendation: NOT READY.** The current Normal candidate passed exact-head Validate and Signaling Smoke. The current Team Lite candidate completed 110/110 authenticated integration checks and browser WebRTC scenarios, but its final candidate check failed because the bundled adapter does not match the shared tested adapter. The QA branch Validate also fails on the inherited production updateURL assertion.

Production remains blocked by public Realtime signaling, unauthenticated first-caller setup, broad database/storage grants, incomplete migration provenance, an unsafe Team Lite official deploy workflow, and missing physical acceptance. No production mutation or manual browser test was performed by QA.

## Branches and source document

Read the complete blob for `docs/RELEASE_READINESS.md` on `qa/release-readiness-2026-11-04-master`:
- Blob SHA: `7cfbd70886df42ce790c078c224b19284a632595`
- 1,045,105 characters / 8,410 lines.
- Its latest appended audit section is dated 2026-11-08 15:30 BRT / 18:30 UTC. The file was not modified in this run.

Exact refs observed:
- QA: `0fcecd618c9a08985e88ac120faa6b2e63dd982e`
- master: `9d40461babcec8eb8686c2a04be9c675df7da381`
- team-lite-official: `9065bc1536fde64f437f6f12b7abb9b072cb8281`

Compare QA against master: 169 commits ahead, 1 behind, merge base `a9288ccfcb0f308d3a587bfca624418a395be07b`. No rebase or engineering-branch update was performed.

## Pull requests and exact-head CI

| PR | Exact HEAD | State | Current evidence |
|---|---|---|---|
| #74 Normal | `5939b57027748eb9af08327d2a8c712fd5046484` | Open / Draft | Validate [42689757655](https://github.com/Reekyi/UpStatus/actions/runs/42689757655) SUCCESS; Signaling Smoke [42689757169](https://github.com/Reekyi/UpStatus/actions/runs/42689757169) SUCCESS |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Open / Draft | Historical Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) SUCCESS; no newer exact-head run found |
| #76 Team Lite | `187eaf6f7c430c89f98433059cf0f69efececfb3` | Open / Draft | Candidate Checks [42689804530](https://github.com/Reekyi/UpStatus/actions/runs/42689804530) FAILURE |
| #82 QA | `0fcecd618c9a08985e88ac120faa6b2e63dd982e` | Open / Draft | Validate [42685528597](https://github.com/Reekyi/UpStatus/actions/runs/42685528597) FAILURE |
| #129 Team Lite legacy deploy guard | `886d364d0c43af0d8aed867bf04c407478af5e8f` | Open / Draft | Offline guard [42670892535](https://github.com/Reekyi/UpStatus/actions/runs/42670892535) SUCCESS |

### #74 Normal

The current HEAD passed both Validate and Signaling Smoke. The Smoke log confirms 136/136 authenticated integration checks, browser WebRTC negotiation and remote media delivery for call audio, voice-room audio and screen video, three-member mesh setup/teardown, distributed rate limiting, atomic chat read receipts, setup-enrollment regression checks and cleanup. This is automated candidate evidence, not physical Tampermonkey acceptance.

The latest commit adds regression coverage for both `VOICE_ATTEMPT_ALREADY_ACTIVE` and `VOICE_ATTEMPT_CONFLICT` in the shared adapter.

### #76 Team Lite: current CI failure is real

The run completed 110/110 authenticated integration checks. Browser call, voice and screen WebRTC, group invitation, three-member mesh, rate limit, read receipts and isolated setup-enrollment tests passed. The final candidate check failed with:

`AssertionError: Team Lite bundled adapter must match the shared tested source module`

The source comparison explains the failure:
- `src/userscript/signaling-transport.mjs` handles both `VOICE_ATTEMPT_ALREADY_ACTIVE` and `VOICE_ATTEMPT_CONFLICT`.
- `team-lite/upstatus-team-lite.user.js` still handles only `VOICE_ATTEMPT_ALREADY_ACTIVE`.
- The latest #76 commit adds the two-code regression test but does not synchronize the bundled adapter.

The guard correctly fails closed. Do not weaken the assertion; synchronize the Team Lite bundle and rerun Candidate Checks on the resulting exact HEAD.

### #75 and #82

#75 remains a Draft baseline with only its historical Candidate Checks success. Its current commit moves voice-room leave before session revocation and removes a duplicate leave call from the logout handler. It has no submitted review.

#82 remains a documentation-only QA PR and its Validate fails at `scripts/validate.mjs:26` with `production updateURL mismatch`. The current candidate does not resolve that inherited master contract. No validator workaround was made.

No submitted reviews were found on PRs #74, #75, #76, #82, #85, #127, #128 or #129.

## Workflow and branch governance

The workflow on `team-lite-official` still exposes manual production dispatch, loads production secrets, uses Supabase CLI `latest`, and runs `supabase functions deploy upstatus`. That slug is the Normal function, not `upstatus-team-lite`. The official workflow remains unsafe. PR #129 replaces it with a fail-closed guard and passes its offline regression test, but is still Draft and not present on the official branch.

The #74 candidate pins Supabase CLI 2.122.1 and checks the approved branch, SHA and project ID, but its production workflow deploys only `upstatus`; it does not coordinate the separate Normal API function `upstatus-screen-share-3-1-1-beta10`.

GitHub branch metadata reports `protected=false` for both `master` and `team-lite-official`; the rulesets endpoint returned an empty list. The branch-protection detail endpoint returned 403 to the integration, so no stronger claim about required checks was made.

## Production Supabase snapshot (read-only)

Project `dlfvkawaiqduhlazsszm` is ACTIVE_HEALTHY, PostgreSQL 17.11.0.002. The managed branch `main` reports `MIGRATIONS_FAILED`.

### Migrations

Production reports seven remote migrations. The current `master/supabase/migrations` directory contains only three files:
- `20261005160000_upstatus_cloud.sql`
- `20261005173000_remote_realtime.sql`
- `20261005180000_client_presence.sql`

The four remote versions still missing from master are:
- `20261023154754_create_upstatus_visual_config`
- `20261026195855_add_chat_message_file_name`
- `20261027154329_allow_chat_document_mime_types`
- `20261027155438_set_upstatus_upload_limits_20mb`

The provenance guard in #127 does not reconstruct those SQL files. Do not recreate them from the live schema. Recover the originals or approve a separately reviewed reconciliation plan.

### RLS, grants, Default ACL and Storage

Read-only catalog queries found:
- 10 public tables with RLS enabled and no policies.
- 9 public tables with direct grants to `anon` and `authenticated`, including `TRUNCATE`.
- 24 default ACL entries, including broad defaults for `postgres` in public/storage and `supabase_admin` in public/GraphQL schemas.
- `realtime.messages`: RLS enabled, FORCE RLS disabled, zero policies, and SELECT/INSERT/UPDATE grants to anon/authenticated.
- `storage.objects`: zero policies and DELETE/INSERT/SELECT/UPDATE grants to anon/authenticated.
- Both `chat-images` and `profile-images` buckets are public with a 20 MiB limit.

The Security Advisor reports 10 RLS-enabled/no-policy findings and three SECURITY DEFINER functions flagged for anon execution plus three for authenticated execution.

The three `upstatus_broadcast_*` functions are SECURITY DEFINER, use `search_path=public`, have broad EXECUTE ACLs and are attached to triggers. They return `trigger`, so this inspection does not establish direct PostgREST RPC invocation. The concrete risk is their public broadcast behavior and payload, not a claimed direct trigger-function exploit.

### Realtime P0

A SELECT-only snapshot found 44 rows in `realtime.messages`, all `private=false`, on topic `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`:
- 22 `db_change`
- 18 `user_status`
- 2 `remote_result`
- 2 `remote_command`

The production Normal and Team Lite userscripts embedded in the deployed Edge Functions subscribe to `upstatus-screen-share-live-3-1-1-beta10`, not the trigger topic. Neither client configures `private:true` or calls `realtime.setAuth()`.

The deployed database trigger for `db_change` sends the full OLD/NEW row via `to_jsonb` on a public broadcast. The remote-state trigger publicly emits command metadata. The Normal client executes a received `remote_command` when its target matches the local member. Team Lite also checks its own local authentication/generation, but does not authenticate the sender of the broadcast. Client-controlled sender/target/room fields are not proof of identity.

This is static source/catalog confirmation. No external broadcast injection, live exploit, audio capture or screen capture was performed.

### Edge Functions, AUTH-03 and upload

Production has 38/38 Edge Functions ACTIVE; all report `verify_jwt=false`. This setting alone is not proof of an authentication bypass because the product uses custom UpStatus session tokens in handlers. The relevant deployed runtimes are:
- Normal `upstatus` v480, userscript 3.4.7, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`.
- Team Lite `upstatus-team-lite` v15, userscript 3.4.30, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`.
- Normal API `upstatus-screen-share-3-1-1-beta10` v6, SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`.

No production `upstatus-signal` function is listed.

AUTH-03 remains blocked:
- Production `POST /api/setup` calls `login(req,true)`.
- The deployed login path allows first-caller password setup for an account without a password, without an invite token or atomic invite consumption.
- When role is empty, the runtime assigns `implementation_admin` by matching the names Ricardo, Lohan or Guilherme.
- Production has no `setup_token_*` columns and no `consume_upstatus_setup_invite` RPC. The catalog found 5 users, zero empty password hashes and zero empty roles; this is a latent onboarding/reset risk, not evidence of an account currently lacking a password.
- No setup-invite route or rate-limit reference was found in either deployed Normal or Team Lite runtime. Password minimums differ: 6 characters in Normal and 4 in Team Lite.

Upload validation remains incomplete: `sniffMime(bytes, declared)` falls back to the client-declared MIME when no recognized signature matches. `signedUploadRoute` validates declared MIME/size and issues a signed URL without inspecting the uploaded bytes. This is code inspection, not a reproduced malicious upload.

## Isolated test project and physical acceptance

Only two Supabase projects are listed: production and `upstatus-security-test` (`bfpjtfqlnypisxljoxkb`). The isolated project is ACTIVE_HEALTHY, has 38 migrations and two test Edge Functions. Table inventory reports zero rows in the UpStatus application tables, Storage objects and `realtime.messages`.

This is a useful isolated security/signaling fixture environment, but it is not a full-product TEST project. Keep TEST-ISOLATION in progress until a dedicated full-product environment and its safeguards are available.

Issue #78 remains open with all eight physical acceptance criteria unchecked. Its latest engineering evidence still states 0/8; no installed Tampermonkey test of real internet loss/recovery without F5, room re-entry, new calls, microphone/screen permissions or installed Normal/Team Lite interoperability was performed in this QA run.

## Gate status after this execution

| Gate | Status | Reason |
|---|---|---|
| RT-01 | BLOCKED | Public broadcasts, missing sender authentication, topic mismatch and full-row/command payloads remain in deployed path |
| TEST-ISOLATION | IN_PROGRESS | Isolated security-test project is empty, but no full-product TEST project exists |
| MIGRATION-PROVENANCE | BLOCKED | Four remote migration SQL files are absent from master |
| AUTH-03 | BLOCKED | Deployed first-caller setup remains; invite columns/RPC/route and setup rate limiting are absent |
| ACL-STORAGE | BLOCKED | RLS/policy, grants, Default ACL and public Storage findings remain |
| RECONNECT | PENDING | Physical acceptance remains 0/8; no F5-free installed-browser proof |
| HUMAN-REVIEW | PENDING | PRs remain Draft with no submitted reviews; no explicit release authorization |

## Safety and execution limits

All Supabase queries in this audit were SELECT/catalog/Management API reads. No production or lab writes, migrations, DDL, fixture mutations, deploys, workflow dispatches, merges, releases, secret/flag changes or userscript publications were performed. No manual browser test was run. The only repository write for this report is a new file on the dedicated QA branch; no existing document or engineering branch is overwritten.
