# UpStatus independent QA audit — 2026-11-09 07:51 UTC

## Scope and safety

Repository: Reekyi/UpStatus  
Production Supabase project: dlfvkawaiqduhlazsszm  
Isolated signaling lab: bfpjtfqlnypisxljoxkb  
QA branch: qa/release-readiness-2026-11-04-master

This audit treats UpStatus as a Sale Smartly-integrated presence, chat, voice-call and screen-sharing userscript/application.

All GitHub and Supabase inspections in this run were read-only except for creation of this new audit document on the dedicated QA branch. SQL was SELECT-only. No local checkout was available for an independent local Node test run. GitHub Actions logs were inspected instead.

No migration, fixture mutation, SQL write, deploy, merge, release, userscript publication, secret/flag/role/grant/policy/ACL change, or physical browser/WebRTC test was performed.

## Required baseline document and actual refs

The required docs/RELEASE_READINESS.md was fetched from the QA branch before reviewing new work.

- QA HEAD at audit start: c633d5b3b2f078bacdc87b2ebae95039ae3aa1fe
- docs/RELEASE_READINESS.md blob: 7cfbd70886df42ce790c078c224b19284a632595
- Previous QA audit 0627 UTC blob: 60a081d6ce5165c3689000597a66ec70d016c0fe
- master HEAD: 9d40461babcec8eb8686c2a04be9c675df7da381
- team-lite-official HEAD: 9065bc1536fde64f437f6f12b7abb9b072cb8281
- QA vs master: 152 ahead / 1 behind; merge base a9288ccfcb0f308d3a587bfca624418a395be07b

The one master-only commit remains a documentation checkpoint. No rebase or branch reconciliation was attempted.

GitHub branch metadata reports master protected=false and team-lite-official protected=false. The branch-protection endpoint itself returned 403, so required-check details and QA branch protection were not independently readable in this run.

## Pull requests and exact-head CI evidence

### Required release candidates

- PR #74 Normal, HEAD 9c0133e8cf6bd85ac8993888718a408db2f24a3e: Validate 42451736696 SUCCESS; Signaling Smoke 42451736729 SUCCESS. Automated evidence only; no physical acceptance.
- PR #75 Team Lite baseline, HEAD 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309: Candidate Checks 41674353127 SUCCESS. Historical baseline evidence, not a substitute for #76.
- PR #76 Team Lite, HEAD eb28e88325d7e8a6236d9050bebabf794d64a8c4: Candidate Checks 42450476433 SUCCESS. Automated candidate evidence; not a physical Tampermonkey test.
- PR #82 QA, HEAD c633d5b3b2f078bacdc87b2ebae95039ae3aa1fe: Validate 42573817979 FAILURE at scripts/validate.mjs:26, “production updateURL mismatch”. This is the inherited master/build manifest mismatch, not a failure in the new audit note.

### Backend and retry follow-ups

- PR #109 capacity, HEAD 9294f47a9dbea7038d34b74fdc53e958804e2d51: Validate 42554593978 SUCCESS.
- PR #112 idempotency, HEAD a7d6950fa0835e2c296318b2f431256f0fca3ab5: Validate 42555495928 SUCCESS.
- PR #117 readiness integrity v2, HEAD 4889111a6f1e59015785792f53e3132141044227: Validate 42565884714 SUCCESS.
- PR #120 Normal retry follow-up, HEAD 086bc543e33f4c0a416b0453b5714f60d9e3f894: Validate 42577115565 SUCCESS; job 129027212024.
- PR #122 consolidated Team Lite retry candidate, HEAD ad9638eb8a8e2b89ee7fd5e27ab158cef12f7f6f: Authenticated Call Source Guard 42578565781 SUCCESS; job 129031707296.

The #120 job log confirms bounded transient retries, Retry-After deferral, exact-body/key reuse, explicit-key lookup, mismatched-key isolation, logical operation identity isolation, concurrency, TTL and cache-capacity tests, idempotency/capacity/readiness contracts, and Validation OK for PROD 3.4.7 / TEST 3.4.7.

The #122 job log confirms the same shared retry tests, Team Lite bundle/source parity, candidate checks, and offline voice-room leave/recovery/logout tests. It is an offline guard, not the fixture-mutating full Candidate Checks and not live HTTP/browser/WebRTC acceptance.

#120 fixes the P2 explicit-key lookup defect previously found in #118: an implicit first send followed by a retry using error.idempotencyKey now resolves the original pending entry only when the key matches exactly, replays the original body, and keeps a different explicit key separate. Six regression assertions cover the transition. The earlier #118/#119 stack should not be integrated independently of the current #120 candidate.

#122 consolidates Team Lite retry-cache work and supersedes the historical #111/#121 stack for integration review. #111/#121 remain open/Draft historical branches and should not be integrated independently. #122 is based on the inspected authenticated-call-source base at de2c6a92154ece2f8a313d2bafedf02170bb5f5a, six commits ahead and zero behind. GitHub reports mergeable=true.

The shared adapter file in #120 and #122 has identical blob SHA 078b3af2ab05ce258ba5be9a018b9a02e2e65666. The Team Lite candidate checker asserts that the embedded bundle matches the shared source. The candidate reports Team Lite version 3.4.31, but no release version bump or publication was performed. Its authenticated-signaling feature flag remains disabled by default.

No human review was found on #120 or #122. Both remain Draft.

## Retry-cache design review

The current candidate provides:
- Secure 128-bit client idempotency keys.
- Exact request-body retention after ambiguous failures.
- One bounded automatic retry.
- Retry-After not-before enforcement for later caller retries.
- In-flight coalescing.
- Two-hour-five-minute in-memory TTL.
- A 256-entry cap with fail-closed behavior rather than silently evicting a pending key.
- Explicit retry lookup that only consumes an implicit pending entry when the supplied error.idempotencyKey matches.

The explicit-key lookup correction is accepted as a code-level fix based on exact-head offline tests.

The cache remains in-memory per transport instance. It does not survive reload or transport recreation.

A read-only operation-identity review found no call sites passing operationId in either Normal or Team Lite. Voice-room presence is sent every four seconds. The retry identity intentionally ignores payload.at/payload.updatedAt while replaying the original body; this allows a lost-response retry to receive the server's duplicate confirmation, clear the cache entry, and let the next heartbeat use a fresh key. Engineering explicitly advised against assigning a unique operation ID to every heartbeat because a 256-entry fail-closed cache could fill during a sustained outage and block terminal leave operations. No collision was reproduced. Stable identities for SDP/answer/ICE remain a design item; define per-event retry/supersession semantics before changing call sites.

## Fresh-key replay remains open

The #112 migration creates public.upstatus_signal_event_idempotency with primary key (room_id, sender, idempotency_key), a SHA-256 request hash, and a server-side RPC. The RPC:
- Inserts with ON CONFLICT DO NOTHING.
- Returns duplicate=true for the same key and same request hash.
- Returns HTTP 409 for the same key with a different request hash.
- Keeps ledger rows for the lifetime of the room.

This is strong retry idempotency, but it is not complete adversarial replay protection. A sender can submit the same SDP/ICE payload with a newly generated idempotency key; the primary key does not collide and the same request hash is not unique per sender/room. No server-issued nonce or monotonic sender sequence is present in the migration. Fresh-key replay therefore remains a release gate, separate from the successful idempotency contract.

## Supabase live snapshot

### Projects and migrations

Production dlfvkawaiqduhlazsszm:
- ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- 7 migrations.
- 38/38 Edge Functions ACTIVE.
- All 38 report platform verify_jwt=false. This does not mean every route is unauthenticated: the primary application handlers implement custom x-upstatus-token hashing/session lookup. The unauthenticated setup route described below is a separate exception.
- Normal upstatus v480, source SHA bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd.
- Team Lite upstatus-team-lite v15, source SHA 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb.
- API beta10 v6, source SHA f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29.
- No production upstatus-signal function.
- Supabase branch main remains MIGRATIONS_FAILED while the preview is ACTIVE_HEALTHY; root cause not identified.

Isolated lab bfpjtfqlnypisxljoxkb:
- ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.
- 38 migrations, latest 20261108050802.
- upstatus-signal-test v32, SHA f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712.
- upstatus-signal-e2e-once v3.
- No Supabase development branches.
- No idempotency ledger, no readiness RPC, no enqueue RPC, and no candidate capacity/idempotency/readiness markers in the deployed v32 function.
- The candidate migrations for capacity, idempotency and readiness remain unapplied.

A read-only catalog snapshot confirms the lab has the seven original upstatus_signal_* relations, but not public.upstatus_signal_event_idempotency. It has no upstatus_signal_readiness() or enqueue RPC. The setup-invite RPC and four setup_token_* columns exist in the lab only.

No local checkout was available and the lab is shared. The harness creates users, sessions, rooms and memberships and requires an explicit mutation window. No harness or fixture mutation was run.

### Readiness and capacity

The #117 database-v2 readiness candidate now checks tables, columns, RLS, grants, RPC security properties, primary/unique/foreign-key constraints, and required valid/ready/live indexes. The earlier false-positive risk is corrected in candidate code and its exact-head CI passed.

The lab runtime is still v32 and does not expose /ready or X-UpStatus-Signal-Readiness: database-v2. No HTTP 200/503 readiness test has been performed.

The #109 capacity candidate uses transactionally locked room/member operations to enforce 32 accepted members. Its contract CI passed, but the candidate migration/RPCs are not in the lab and no concurrent HTTP capacity test was run.

### Auth setup path: new release-blocking code finding

The deployed Normal v480 and Team Lite v15 sources both route POST /api/setup to login(req, true) before the general contextName/authentication check.

The setup handler only verifies that the named account exists and that password_hash is empty. It does not require an invitation/setup token. It then sets a password and creates a session. If the account role is empty, the fallback grants implementation_admin to the allow-listed names Ricardo, Lohan and Guilherme.

The current production catalog has 5 users, 0 missing password hashes, and 0 missing roles. Therefore no currently unconfigured row was observed. This is still a latent account-claim risk if an account is later created/reset without a password: anyone who knows the account name can attempt first setup before an invitation proof is required.

Production has zero setup_token_* columns and no consume_upstatus_setup_invite RPC. The lab has four setup_token_* columns and a SECURITY INVOKER consume_upstatus_setup_invite RPC with empty search_path and EXECUTE only for service_role.

Team Lite currently accepts a four-character minimum password in its legacy setup/login handler, while Normal requires six. This policy drift should be resolved in the AUTH-03 design.

Classification: P1 latent provisioning/authentication gap; current production rows are configured, but the route is still not invitation-gated. Do not test the route against production.

### RLS, grants, SECURITY DEFINER and default ACLs

Production:
- 10 public tables have RLS enabled and zero policies.
- 9 public tables have effective anon/authenticated grants including SELECT/INSERT/UPDATE/DELETE, REFERENCES, TRIGGER and TRUNCATE.
- RLS does not protect TRUNCATE.
- realtime.messages has RLS, zero policies, and anon/authenticated SELECT/INSERT privileges.
- storage.objects has RLS, zero policies, and anon/authenticated SELECT/INSERT privileges.
- Three upstatus_broadcast_* functions are SECURITY DEFINER, return trigger, have search_path=public and EXECUTE grants for anon/authenticated. They are attached to triggers. Direct PostgREST invocation was not demonstrated; the grants are unnecessary and the Security Advisor flags them.
- Default ACLs remain broad for postgres and supabase_admin in public, storage and GraphQL schemas.

Production Security Advisor: 6 WARN / 10 INFO. Performance and Health Advisors returned no findings.

Lab:
- The 17 audited public tables have RLS and no effective direct anon/authenticated table grants.
- realtime.messages and storage.objects still have RLS, zero policies, and anon/authenticated SELECT/INSERT privileges.
- Default ACLs remain broad for supabase_admin in public/GraphQL and postgres in storage, even though postgres defaults in public are restricted.
- Security Advisor: 0 WARN / 17 INFO. Performance Advisor: 4 INFO unused-index findings. Health Advisor: no findings.

### Realtime and installed clients

The deployed userscripts were decoded from the actual production Edge Function sources.

- Normal userscript 3.4.7 subscribes to upstatus-screen-share-live-3-1-1-beta10.
- Team Lite userscript 3.4.30 subscribes to the same topic.
- Both have no private:true, no realtime.setAuth(), no signalingTransport adapter, and no signaling_transport_enabled flag.
- Both still listen to public call_signal, voice_room_signal and screen-share events.
- The database triggers publish to upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0. The topic mismatch is confirmed.
- Production realtime.messages contains 50 rows in the snapshot, all private=false: 42 user_status and 8 db_change.
- upstatus_broadcast_messages sends to_jsonb(OLD/NEW) in full to db_change.
- upstatus_broadcast_remote_state emits command/result fields.
- upstatus_broadcast_users emits user status fields.
- No public broadcast injection or external subscription test was performed. Dashboard public-access configuration was not exposed by the connector.

The new #120/#122 retry-cache work is candidate-only. It does not change installed production userscripts.

### Storage

Production chat-images and profile-images buckets are public, each with a 20 MiB file-size limit. storage.objects has zero policies. Public URL possession is therefore relevant to read access; no per-user isolation was proven. The candidate configuration has historically differed from deployed bucket limits and should be reconciled before release.

## Deployment workflows and branch governance

Current master .github/workflows/deploy-production.yml:
- Manual workflow_dispatch only.
- Hard-pins release.json to stable 3.4.7.
- Uses Supabase CLI latest.
- Deploys only upstatus.
- Does not deploy the beta10 API as part of this workflow.
- Does not include a full migration preflight or explicit project/SHA allowlist in the inspected file.

Current team-lite-official workflow:
- Reads the root release.json, which is 3.0.40 beta.22.
- The Team Lite-specific manifest is 3.4.30 stable.
- Rejects pre-release builds based on the root manifest.
- Uses Supabase CLI latest.
- Deploys upstatus, not upstatus-team-lite.
- Does not include the Normal candidate's project/SHA/migration preflight.

Do not dispatch the current Team Lite workflow. The target slug is wrong and could affect the Normal function if its preconditions were bypassed.

GitHub branch metadata confirms master and team-lite-official are protected=false. No PR reviews were found on #120/#122; no human approval was found for the key release candidates inspected.

## Issues and manual acceptance

- Issue #78 remains OPEN, 0/8 physical acceptance checks. No Tampermonkey physical test, real network loss/recovery without F5, real microphone/screen permissions, or installed Normal ↔ Team Lite interoperability test was performed.
- Issue #79 remains OPEN, 16 checked / 19 pending in the current body. This is a historical checklist count, not a release percentage. Its latest coordination comments record #120 and #122, the operation-identity review, and remaining fresh-key anti-replay/lab/physical gates.

## Current decision

**DO NOT RELEASE.**

Positive candidate evidence:
- #74 Normal exact-head Validate and Smoke passed.
- #76 Team Lite exact-head Candidate Checks passed.
- #109 capacity contract passed.
- #112 idempotency contract passed.
- #117 readiness integrity contract passed.
- #120 explicit-key retry correction and Retry-After tests passed.
- #122 Team Lite retry-cache parity/source guard passed.

Release blockers and open risks:
1. Fresh-key adversarial replay is not prevented by client idempotency keys alone.
2. Candidate capacity/idempotency/readiness migrations and RPCs are not installed in the lab; no real HTTP tests have run.
3. Deployed clients still use public Realtime for calls/voice/screen; private authenticated transport is absent.
4. Trigger topic and client topic differ; public full-row/status/remote-state broadcasts remain.
5. Legacy POST /api/setup has no invitation token and can claim any unconfigured account; production currently has no such rows, but the provisioning route must be closed by AUTH-03.
6. Production grants/default ACLs, Storage and Realtime policies need owner-authorized remediation.
7. Team Lite production workflow deploys the wrong function slug.
8. Production migration branch main remains MIGRATIONS_FAILED.
9. #82 Validate remains red on production updateURL mismatch.
10. Physical acceptance #78 is 0/8; human reviews and branch protection remain required.

## Next gates

1. Complete AUTH-03 invitation-token gating and remove unauthenticated first-setup claim; reconcile Normal/Team Lite password policy.
2. Keep #120 and #122 as the current retry-cache candidates; obtain human review and reconcile ancestry deliberately.
3. Design server-verifiable fresh-key anti-replay using nonce/sequence/operation semantics, separate from retry idempotency.
4. Obtain an explicit QA-authorized lab mutation window. Confirm the project allowlist, apply only reviewed candidate migrations to the isolated lab, then run readiness 200/503, capacity concurrency, idempotency/replay and cleanup postflight.
5. Verify the lab runtime and database markers before any HTTP fixture test.
6. Replace public call/voice/screen broadcasts with private server-authorized transport; align topic routing and minimize payloads.
7. Reconcile RLS, grants, SECURITY DEFINER, default ACLs, Storage privacy and file-size limits with the authorized database owner.
8. Correct Team Lite deployment slug, pin CLI, and add project/SHA/migration preflight.
9. Diagnose MIGRATIONS_FAILED without applying production migrations.
10. Fix the inherited updateURL validator mismatch, obtain human reviews, and complete all eight physical #78 acceptance checks.

## Audit write boundary

This document is a new file on the dedicated QA branch. The existing RELEASE_READINESS.md and prior audit file were not modified. No engineering branch, issue, production project, lab schema, secret, flag, user, session, fixture or deployed function was changed.


## Post-write QA CI revalidation — 2026-11-09 08:00 UTC

The audit-note commit updated PR #82 and triggered a new exact-HEAD Validate run:

- QA commit: 6a5d24672643cb85ccba34e90e9a2410b04a0faa.
- Run: 42582780883 — FAILURE.
- Job: 129045290501.
- Log: scripts/validate.mjs:26, VALIDATION FAILED: production updateURL mismatch.

This is the same inherited release-manifest/updateURL mismatch observed on the previous QA HEAD. It is not a failure in the newly added audit document. No rerun was initiated.

The QA commit parent was c633d5b3b2f078bacdc87b2ebae95039ae3aa1fe and its only changed file was this new audit note. The RELEASE_READINESS.md blob and previous audit blob remained unchanged.
