# UpStatus independent QA audit — 2026-11-09 06:27 UTC

## Scope and method

Repository: Reekyi/UpStatus. Production Supabase: dlfvkawaiqduhlazsszm. Isolated signaling lab: bfpjtfqlnypisxljoxkb.

The current docs/RELEASE_READINESS.md was read first from the QA branch through the GitHub Contents API. Its blob SHA is 7cfbd70886df42ce790c078c224b19284a632595. It is approximately 1,045,105 characters and contains a long append-only history; older status tables are stale. This checkpoint uses freshly fetched refs, PR metadata, workflow runs, issue bodies/comments, deployed function inventories/source, read-only SQL catalog queries, and current Supabase Advisors.

No production writes, migrations, deploys, merges, releases, fixture mutations, secrets/flags/role/grant/policy/ACL changes, or userscript publication were performed. SQL was SELECT-only. No live HTTP signaling/readiness or physical browser/device test was run.

## Exact repository refs and governance

- master: 9d40461babcec8eb8686c2a04be9c675df7da381
- team-lite-official: 9065bc1536fde64f437f6f12b7abb9b072cb8281
- QA branch: 37e0148c11d2d3eae2481527d28a1bb42976b02c
- QA vs master: 151 ahead, 1 behind; merge base a9288ccfcb0f308d3a587bfca624418a395be07b.
- master, team-lite-official, and QA all report protected=false; required status-check enforcement is off.

The QA branch has one known master-only documentation commit since the merge base. Do not rebase or overwrite it during this audit.

## PR and CI snapshot

- PR #74 Normal: open/Draft, head 9c0133e8cf6bd85ac8993888718a408db2f24a3e. Exact-head Validate 42451736696 SUCCESS and Signaling Smoke 42451736729 SUCCESS. This is candidate automation only, not production acceptance.
- PR #75 Team Lite baseline: open/Draft, head 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309. Candidate Checks 41674353127 is a historical pass on the unchanged baseline; #76 is the newer signaling candidate. Do not merge #75 and #76 independently without a fresh overlap review.
- PR #76 Team Lite signaling: open/Draft, head eb28e88325d7e8a6236d9050bebabf794d64a8c4. Candidate Checks 42450476433 SUCCESS on that commit.
- PR #82 QA documentation: open/Draft, head 37e0148c11d2d3eae2481527d28a1bb42976b02c. Exact-head Validate 42568413663 FAILED at scripts/validate.mjs with 'production updateURL mismatch'. This is an inherited master validator/build-contract mismatch; the QA change is documentation-only. Do not bypass the validator to make the documentation PR green.
- PR #109 capacity: head 9294f47a9dbea7038d34b74fdc53e958804e2d51; Validate 42554593978 SUCCESS. The 32-member transaction contract is code/CI evidence only; the candidate migration/runtime is not installed in the lab.
- PR #112 idempotency: head a7d6950fa0835e2c296318b2f431256f0fca3ab5; Validate 42555495928 SUCCESS. Same-key retries are deduplicated and same-key/different-request is rejected. Fresh-key replay remains a separate server protocol gate.
- PR #117 readiness integrity: PR head 4889111a6f1e59015785792f53e3132141044227; code HEAD 206e19df0d9c896b22e50eb16864a4ba80be9f16. Validate 42565813869 SUCCESS on the code HEAD; the later PR head is a documentation-only checkpoint. Readiness v2 checks constraints/FKs/indexes and the harness requires database-v2 before fixtures.
- PR #118 Normal retry-key cache: current branch head 7c36c5cff5444248faa0fbf8cd37cf21aadbcea6; code HEAD de00404ecbf5a59e52f4330e07ad7d593020b546. Validate 42572221805 SUCCESS on the code HEAD. Comparing code HEAD to current branch head shows two later commits touching only .github/workflows/validate.yml and docs/checkpoints/2026-11-09-client-idempotency-retry-cache.md. No runtime code changed after the passing code run.
- PR #111 Team Lite idempotency adapter: head d65c3a6e42b5adba4303fcd510747839eca25b20. Offline source guard 42554841729 SUCCESS. The fixture-mutating full Candidate Checks workflow was intentionally not run against the shared lab.

Reviews: no human review submissions were returned for PRs #74, #76, #82, #117, or #118. All remain Draft.

## New code-review finding in PR #118

Severity: P2 candidate correctness / API compatibility.

In src/userscript/signaling-transport.mjs, signalRetryIdentity includes explicitKey in the cache identity. An initial send without an explicit key is cached under an identity whose explicitKey component is empty. If a caller later follows the adapter's existing error.idempotencyKey contract and retries by passing that key explicitly, the new identity contains the key and no longer matches the cached entry. The adapter therefore misses the original cached body and uses the newly supplied payload. If volatile timestamps changed, the server sees the same key with a different canonical request hash and can return IDEMPOTENCY_KEY_REUSED/409; the original cache entry also remains until TTL expiry.

The added manual-retry test retries without passing error.idempotencyKey, so it does not cover this transition. Add a regression test for implicit first send -> ambiguous failure -> explicit retry using error.idempotencyKey and refreshed at/updatedAt fields. Fix by resolving explicit-key retries to the existing pending entry and replaying its original body, or by using a cache identity that does not split the same operation by key representation.

Additional review risk: current Normal call sites do not pass operationId. The fallback identity removes payload.at and payload.updatedAt and canonicalizes object-key order. Distinct logical sends with identical normalized payloads may therefore share an identity; stable call/negotiation/candidate operation IDs should be considered at the call sites. This is a risk to validate, not a reproduced runtime failure.

PR #118 is Normal-only. Its cache is in-memory per transport instance and does not survive reload/recreation. Team Lite's PR #111 currently adds generated/explicit idempotency keys but does not contain pendingRetryKeys, operationId, or the retry-cache behavior. Team Lite parity remains open.

Neither #112 nor #118 provides adversarial replay protection when the same SDP/ICE operation is submitted with a fresh key. Server-verifiable nonce/sequence semantics remain required.

## Supabase production and lab

Projects:
- Production dlfvkawaiqduhlazsszm: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- Lab bfpjtfqlnypisxljoxkb: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.

Migration inventory:
- Production: 7 migrations, latest 20261027155438.
- Lab: 38 migrations, latest 20261108050802.
- Candidate migrations for #109/#112/#117 are not applied.
- Lab runtime remains upstatus-signal-test v32 (SHA f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712) and upstatus-signal-e2e-once v3. The lab has no idempotency ledger table, no enqueue RPC, and no readiness RPC. The seven existing signal tables have RLS enabled and no direct anon/authenticated SELECT/INSERT grants.
- Production has no server-mediated signaling function. It has 38 Edge Functions; all report verify_jwt=false. Core UpStatus endpoints implement custom-token application authentication, so this inventory is a per-function auth-review gate, not proof that every endpoint is anonymous.
- Production core runtimes: upstatus v480 (3.4.7), upstatus-team-lite v15 (3.4.30), legacy Normal beta10 v6. No upstatus-signal slug exists.
- Supabase managed production branch main remains MIGRATIONS_FAILED while preview_project_status is ACTIVE_HEALTHY. Root cause is not established.

Readiness v2 has only offline/SELECT-only evidence. The PR #117 description records a standalone SELECT-only execution of the candidate readiness body against the lab, returning ready=false for expected missing candidate dependencies. No migration was applied and no live /ready HTTP response was tested.

## Production security catalog

- Nine backend-owned public tables (chat_reads, messages, reactions, status_history, upstatus_profiles, upstatus_sessions, upstatus_state, upstatus_typing, users) have RLS enabled and zero policies but still grant anon/authenticated broad table privileges, including TRUNCATE. RLS with no policies blocks row access, but does not neutralize TRUNCATE grants. upstatus_visual_config did not show those client grants.
- Three trigger functions are SECURITY DEFINER with search_path=public and EXECUTE effective for anon/authenticated: upstatus_broadcast_messages(), upstatus_broadcast_remote_state(), upstatus_broadcast_users(). Each is attached to a trigger. Security Advisor reports 3 anon and 3 authenticated WARNs. Catalog grants are confirmed; direct PostgREST invocation of trigger-returning functions was not tested.
- upstatus_broadcast_messages sends the full OLD/NEW row via to_jsonb(...) using realtime.send(..., private=false). The remote-state and user-status triggers also publish metadata.
- realtime.messages has RLS=true, FORCE RLS=false, zero policies, and anon/authenticated SELECT/INSERT/UPDATE privileges. The current snapshot has 50 rows, all private=false: 42 user_status and 8 db_change, all on topic upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0.
- The deployed Normal 3.4.7 and Team Lite 3.4.30 embedded userscripts both subscribe to upstatus-screen-share-live-3-1-1-beta10, without private:true or realtime.setAuth(). This does not match the trigger topic. The clients still use legacy public call/voice/screen event handlers; Normal consumes remote_command payloads directly when target matches, while Team Lite adds local session checks but no authenticated sender provenance. This is static source inspection; no spoofing/subscription exploit was attempted. The Dashboard public-access toggle was not available to inspect.
- Production chat-images and profile-images buckets are public, 20 MiB each. storage.objects has RLS, zero policies, and broad anon/authenticated SELECT/INSERT/UPDATE/DELETE privileges.
- Production default ACLs remain broad for postgres and supabase_admin in public (tables/functions/sequences), and postgres in storage. Lab postgres/public defaults are restricted to postgres/service_role, but supabase_admin/public and postgres/storage defaults remain broad.
- AUTH-03 is absent in production: 5 users, no setup_token_* columns, and no consume_upstatus_setup_invite RPC. Lab has four setup-token columns and the RPC.
- Advisors: production Security 6 WARN / 10 INFO, Performance 0, Health 0. Lab Security 0 WARN / 17 INFO, Performance 4 unused-index INFO, Health 0. RLS/no-policy INFO is not a reason to add broad public policies.

## Issues and manual acceptance

- Issue #78 remains OPEN with 0/8 acceptance boxes checked. Real Tampermonkey, offline/online recovery without F5, voice-room re-entry, real microphone/display capture, and Normal <-> Team Lite physical compatibility remain MANUAL PENDING. The issue explicitly defines voice rooms as open join/leave; generic invitation capacity fixes must not add invitations to that flow.
- Issue #79 remains OPEN with 16/35 boxes checked and 19 unchecked. Its latest discussion records #117 and #118, but the checklist is historical and is not a release percentage.

## Decision and next gates

NO RELEASE.

1. Fix and test the PR #118 explicit-key retry lookup regression.
2. Add stable operation IDs at Normal call sites and validate whether payload-fallback identity can conflate distinct logical signals.
3. Port retry-cache semantics to Team Lite and run offline parity tests; later run full tests only in an explicitly authorized isolated window.
4. Design server-verifiable anti-replay beyond client idempotency keys.
5. Obtain explicit authorization before applying candidate migrations or creating fixtures in the shared lab; then validate database-v2 readiness, concurrent room capacity, idempotency, and replay over real HTTP.
6. Reconcile Normal and Team Lite backend/client versions and make authenticated signaling mandatory before disabling legacy public call/voice/screen paths.
7. Resolve the public Realtime topic/payload exposure, trigger-function EXECUTE grants, table grants, Default ACLs, and Storage privacy/limits.
8. Diagnose production MIGRATIONS_FAILED and complete AUTH-03 only through a reviewed, authorized plan.
9. Correct the Team Lite deploy workflow/slug and require protected-branch CI/reviews.
10. Complete issue #78 physical acceptance, update #79, and obtain human reviews.

No merge, deploy, migration, SQL write, fixture mutation, secret/flag/role/grant/policy/ACL change, release, or userscript publication was performed. The only write for this audit is this new Markdown checkpoint on the dedicated QA branch.
