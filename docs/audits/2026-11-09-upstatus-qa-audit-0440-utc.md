# Independent UpStatus QA audit — 2026-11-09 04:40 UTC

## Scope and evidence rules

This audit covers the UpStatus userscript/application integrated with Sale Smartly: presence, chat, voice calls, and screen sharing. It is not an election or voting system.

Evidence labels:
- **AUTOMATED PASS**: a workflow passed on the exact recorded commit.
- **CODE INSPECTION**: source, catalog, configuration, or deployed artifact was inspected; no runtime behavior is implied.
- **MANUAL PENDING**: requires a real installed browser, device, network, or human acceptance.
- **BLOCKED**: a release gate has a confirmed unresolved dependency.
- **NOT VERIFIED**: evidence is absent or only exists in an isolated candidate.

All GitHub and Supabase inspections in this pass were read-only, except for this new documentation file on the dedicated QA branch. No test harness or fixture-mutating workflow was run.

## Required checkpoint and exact refs

Read `docs/RELEASE_READINESS.md` from `qa/release-readiness-2026-11-04-master` before this audit. The GitHub contents connector returned the blob metadata but not the 1.01 MB body; the raw GitHub file was fetched and read. It contains 8,409 lines. Its last appended checkpoint is dated 2026-11-08 18:30 UTC and predates the 09/11 PRs #109, #111, #112, #113 and #115.

- Main checkpoint blob SHA: `7cfbd70886df42ce790c078c224b19284a632595` (preserved; not edited).
- Previous QA audit note blob SHA: `ec42ac70fc3ccbd8843096ffcf14bbb3828090e8`.

Heads re-fetched immediately before this note:

| Branch | Exact HEAD | Protected | Required-check enforcement |
|---|---|---:|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` | No | Off |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | No | Off |
| `qa/release-readiness-2026-11-04-master` | `9cc68a7be9c53abcb6e9284712ab39183dfc649c` | No | Off |

Compare QA to master: 147 commits ahead, 1 behind; merge-base `a9288ccfcb0f308d3a587bfca624418a395be07b`. The master-only commit is documentary. No rebase or automatic incorporation was performed.

The GitHub branch API reports `protected=false` and required-check enforcement `off` for all three branches. This is a governance risk: a green CI result is not a mandatory barrier to updating the official branches. This check did not inspect organization-wide repository rulesets.

## PRs, exact heads, reviews, and CI

All listed PRs remain open and Draft. No human reviews were returned for #74, #75, #76, #82, #109, #111, #112, #113 or #115.

| PR | Exact HEAD | Exact workflow evidence | Classification |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `9c0133e8cf6bd85ac8993888718a408db2f24a3e` | [Validate 42451736696](https://github.com/Reekyi/UpStatus/actions/runs/42451736696) and [Signaling Smoke 42451736729](https://github.com/Reekyi/UpStatus/actions/runs/42451736729), both SUCCESS | Automated PASS on this candidate head |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127), SUCCESS | Historical PASS; not the current Team Lite candidate |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `eb28e88325d7e8a6236d9050bebabf794d64a8c4` | [Candidate Checks 42450476433](https://github.com/Reekyi/UpStatus/actions/runs/42450476433), SUCCESS | Automated PASS on this candidate head |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `9cc68a7be9c53abcb6e9284712ab39183dfc649c` | [Validate 42558136499](https://github.com/Reekyi/UpStatus/actions/runs/42558136499), FAILURE | Blocked; docs-only PR inherits master validation failure |
| [#109 capacity](https://github.com/Reekyi/UpStatus/pull/109) | `9294f47a9dbea7038d34b74fdc53e958804e2d51` | [Validate 42554593978](https://github.com/Reekyi/UpStatus/actions/runs/42554593978), SUCCESS | Automated contract/static PASS; no live race test |
| [#111 Team Lite adapter](https://github.com/Reekyi/UpStatus/pull/111) | `d65c3a6e42b5adba4303fcd510747839eca25b20` | [Source Guard 42554841729](https://github.com/Reekyi/UpStatus/actions/runs/42554841729), SUCCESS | Offline/static guard PASS only |
| [#112 Normal idempotency](https://github.com/Reekyi/UpStatus/pull/112) | `a7d6950fa0835e2c296318b2f431256f0fca3ab5` | [Validate 42555495928](https://github.com/Reekyi/UpStatus/actions/runs/42555495928), SUCCESS | Automated contract/static PASS |
| [#113 DB readiness](https://github.com/Reekyi/UpStatus/pull/113) | `6a86d5c6b4285fe5cde6e46ffb4a70c070a96c90` | [PR Validate 42559889611](https://github.com/Reekyi/UpStatus/actions/runs/42559889611) and [push Validate 42559885561](https://github.com/Reekyi/UpStatus/actions/runs/42559885561), SUCCESS | Automated contract/static PASS |
| [#115 readiness schema guard](https://github.com/Reekyi/UpStatus/pull/115) | `f7e89e535b523af784bb588c2419a678f28db18b` | [Validate 42559930958](https://github.com/Reekyi/UpStatus/actions/runs/42559930958), SUCCESS | Automated contract/static PASS |

The #82 Validate log fails at `scripts/validate.mjs:26` with `production updateURL mismatch`. The #82 comparison contains 35 changed files and every changed path is under `docs/`; no runtime source is changed by this QA PR. This is an inherited master/build-manifest mismatch, not a failure caused by the new audit note.

PR #110 is superseded by #112 and must not be integrated. PR #114 is superseded by #115 and must not be integrated. #112 is stacked on #109; #113 is stacked on #112; #115 is stacked on #113. Preserve bottom-up reconciliation and do not merge a partial stack as a release candidate.

PR #111 changes the Team Lite transport adapter and embedded userscript, but its base is the Team Lite source-guard branch, not the current Normal backend PR #112. It has no full Team Lite HTTP/browser integration result in this pass. The full fixture-mutating Team Lite workflow was intentionally not run against the shared lab.

## Capacity — PR #109

**CODE INSPECTION + AUTOMATED CONTRACT PASS.** The candidate migration `20261109010000_enforce_signal_room_member_capacity.sql` adds `invite_upstatus_signal_room_member` and `accept_upstatus_signal_room_invitation`. Both RPCs are VOLATILE, SECURITY INVOKER, use an empty `search_path`, and grant EXECUTE only to service_role. The room row is locked before membership rows; accepted membership count is checked before the write. The intended maximum is 32 accepted participants; full rooms map to HTTP 409 / `ROOM_FULL`.

The exact-head Validate passed static contracts and migration-layout checks. It did not execute the concurrent HTTP race against PostgreSQL. The migration is not applied in the lab or production.

## Idempotency and replay — PRs #111/#112

**CODE INSPECTION + AUTOMATED CONTRACT PASS.** Migration `20261109030000_signal_event_idempotency.sql` (blob `30a534b5228e502f73d835d1f0535083186cf794`) creates `public.upstatus_signal_event_idempotency` with primary key `(room_id, sender, idempotency_key)`, a SHA-256 request hash, checks for 32-hex-character keys and 64-hex-character hashes, and room/user foreign keys. The enqueue RPC uses `ON CONFLICT (room_id, sender, idempotency_key)`, locks room/membership state, and records the ledger and event rows atomically. It is VOLATILE, SECURITY INVOKER, empty-search_path and service_role-only.

Observed contract:
- Same key + same canonical request: returns the original result without enqueueing again.
- Same key + different request hash: HTTP 409 / `IDEMPOTENCY_KEY_REUSED`.
- Unicast, broadcast and validated join-request flow use the enqueue RPC.

The adapter generates a 128-bit random key with `crypto.getRandomValues`, accepts an explicit key and attaches it to a thrown error for caller reuse. It does not itself persist a logical operation key across independent invocations. The changed-file list for #112 contains the adapter, backend, migrations and tests, but no call-site retry coordinator. A retry must explicitly reuse the same key.

### Important semantic limit

The PR title says “replay protection”, but the inspected design proves **idempotency by client-supplied key**, not full anti-replay protection. The same SDP/ICE payload sent with a fresh key is a new ledger key and can be enqueued again. There is no server-issued nonce, monotonic sender sequence, or operation identifier that rejects a repeated logical signal across fresh keys. The tests cover same-key retry and same-key/different-payload conflict, not same payload with a new key.

Do not close the anti-replay requirement on the basis of #112 alone. Decide whether the required control is retry idempotency or adversarial replay rejection, then add a server-verifiable nonce/sequence or operation identity and test the fresh-key replay case.

## Database readiness — PRs #113/#115

**CODE INSPECTION + AUTOMATED CONTRACT PASS.** The candidate adds a STABLE, SECURITY INVOKER readiness RPC with empty `search_path`, service_role-only EXECUTE, and a public `GET /ready` separate from process-only `GET /health`. It checks required tables, RLS enabled, required columns, service_role table privileges, public-schema USAGE, and the handler RPCs' existence, VOLATILE/SECURITY INVOKER properties, empty search_path, service_role EXECUTE and no anon/authenticated EXECUTE. The HTTP route returns only generic 200/503 responses.

PR #115 adds the missing `has_schema_privilege('service_role','public','USAGE')` dependency and matching isolated/offline assertions. This is a future-drift guard, not a current outage: read-only catalog checks return service_role public-schema USAGE = true in both production and lab.

### Readiness false-green gap

The readiness RPC does **not** inspect required primary keys, unique constraints, foreign keys or indexes. The isolated test checks the RPC security properties and requires `ready=true`, but does not assert the critical constraints. In particular, the idempotency enqueue RPC's `ON CONFLICT (room_id, sender, idempotency_key)` depends on the matching unique/primary-key constraint. If the table and columns exist but that constraint is missing or drifted, readiness can still report ready while enqueue fails at runtime.

Add catalog checks for the required idempotency primary key and other concurrency-critical constraints/indexes before using `/ready` as a cutover gate.

The public `GET /ready` route is dispatched before the POST authentication and rate-limit path. Each request can invoke a service-role database RPC without application-level rate limiting. The response is generic, but the DB work is still unauthenticated and unthrottled. Consider a bounded cache, gateway rate limit, or low-cost probe policy.

PR #115 edits the same versioned readiness migration introduced by #113. Reconcile the final stacked migration before applying it anywhere. If the #113 version is applied first, editing that already-recorded migration file will not cause Supabase to replay it; any subsequent change must use a new migration version.

## Test harness safety

Current `scripts/test-signal-room-capacity.mjs` blob SHA: `1ba969c1e7feba1750a21e58f7a68de9543ec019`.

- Preflight checks the `/health` markers but does not call `/ready` or require `X-UpStatus-Signal-Readiness: database-v1` before the first fixture write.
- Cleanup in `finally` awaits DELETE operations sequentially. If one deletion fails, later deletions and final emptiness assertions are skipped; cleanup failure can also mask the original assertion failure.
- The harness includes idempotency-ledger cleanup and final table-empty checks, but its failure path is not best-effort.

Fix the preflight and cleanup before authorizing a fixture-mutating run. The harness requires the exact allowlisted lab project, service-role credentials, `UPSTATUS_SIGNAL_ALLOW_MUTATION=1`, and fixture writes. An allowlist in source is not authorization to mutate the shared lab. No harness or fixture mutation was executed in this audit.

## Supabase runtime and migration inventory

Production `dlfvkawaiqduhlazsszm`:
- Project status ACTIVE_HEALTHY; PostgreSQL 17.11.0.002.
- 7 migrations, latest `20261027155438`.
- 38 Edge Functions ACTIVE.
- `upstatus` v480, source SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`, embedded userscript 3.4.7.
- `upstatus-team-lite` v15, source SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`, embedded userscript 3.4.30.
- Legacy API `upstatus-screen-share-3-1-1-beta10` v6, source SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`, embedded userscript 3.1.1-beta8.
- No `upstatus-signal` function is deployed.
- All 38 functions report `verify_jwt=false`; this is not by itself proof of unauthenticated application access. Core UpStatus endpoints use custom-token/session checks and require per-function auth review.
- Supabase managed branch `main` is `MIGRATIONS_FAILED`; preview project status is ACTIVE_HEALTHY. Cause remains undiagnosed.

Lab `bfpjtfqlnypisxljoxkb`:
- Project status ACTIVE_HEALTHY; PostgreSQL 17.11.0.003.
- 38 migrations, latest `20261108050802`; no Supabase branches.
- Two functions: `upstatus-signal-test` v32, SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`; and `upstatus-signal-e2e-once` v3, SHA `db0c9206b2171f5f5d67459e2e7451ecbaf6e8ad3c8f55cb4e491660164f5053`.
- The deployed v32 source lacks the capacity, idempotency and readiness headers/routes/ledger/RPCs.
- Existing signaling tables are RLS-enabled and have no direct anon/authenticated table privileges in the audited public tables. The new idempotency ledger, capacity RPCs, enqueue RPC and readiness RPC are absent.
- Candidate migrations #109/#112/#113/#115 are not applied.

No third full-product TEST project exists.

### AUTH-03

Read-only catalog result:
- Production: 5 users; no `setup_token_*` columns on `public.users`; `consume_upstatus_setup_invite(text,text,text)` absent.
- Lab: 0 users; four setup-token columns exist; consume RPC exists, VOLATILE SECURITY INVOKER, empty search_path, EXECUTE for service_role only.

No AUTH-03 data or schema was changed.

## RLS, grants, SECURITY DEFINER, Realtime and Storage

### Production grants and RLS

- Ten public tables have RLS enabled and zero policies.
- Nine tables (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) have effective anon and authenticated SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER privileges. RLS without policies does not protect TRUNCATE. `upstatus_visual_config` has no such client grants.
- `realtime.messages` and `storage.objects` have RLS enabled, zero policies, and effective anon/authenticated SELECT/INSERT/UPDATE grants.
- Security Advisor: 6 WARN / 10 INFO. Performance and Health Advisors: no findings.

Three production `upstatus_broadcast_*` functions are SECURITY DEFINER, `search_path=public`, and have effective EXECUTE for anon/authenticated. They return `trigger` and are attached to triggers; this audit did not make a direct PostgREST invocation and does not claim direct RPC exploitability. The grants are still unnecessary and Advisor-reported.

The production message trigger publishes `to_jsonb(OLD/NEW)` as `db_change` on a public Realtime channel. The remote-state trigger publishes command/result metadata; the user trigger publishes name/status/reason/update metadata. All use `private=false`. This is a public data-minimization and trust-boundary blocker.

### Lab grants and trigger functions

- Seventeen public tables have RLS enabled and zero policies; the audited public tables have no direct anon/authenticated privileges.
- `realtime.messages` and `storage.objects` still have RLS/no-policy plus anon/authenticated SELECT/INSERT/UPDATE grants.
- The three broadcast functions use empty search_path and deny anon/authenticated EXECUTE. Their payloads are minimized to `{"op": TG_OP}`, but the channel argument remains `private=false`.
- Security Advisor: 0 WARN / 17 INFO. Performance Advisor: 4 INFO unused-index findings. Health Advisor: no findings.
- Default ACLs remain broad for storage and for supabase_admin-created public/GraphQL objects; postgres defaults in public are more restricted than production.

### Realtime topic mismatch — confirmed against deployed clients

The embedded Normal 3.4.7 and Team Lite 3.4.30 userscripts in the deployed Edge Function sources both subscribe to:

`upstatus-screen-share-live-3-1-1-beta10`

The production database triggers publish to:

`upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`

The topics do not match. Both deployed clients create the channel without `private:true` and do not call `realtime.setAuth()`. Normal's `remote_command` listener executes when the payload target matches the local member; Team Lite also checks its local authenticated/session generation, but neither proves the broadcast sender's identity. Both still route public call, voice-room and screen-share events to their handlers.

Production `realtime.messages` contains 50 rows in the inspected snapshot, all `private=false`: 42 `user_status` and 8 `db_change`, on the database-trigger topic. The Dashboard “Allow public access” setting was not available through the connector; no external anonymous publish/subscribe test was performed. Do not describe external exploitation as demonstrated.

### Storage

Production buckets:
- `chat-images`: public, 20 MiB.
- `profile-images`: public, 20 MiB.

No policies exist on `storage.objects`. The bucket visibility and lack of object policies need an explicit attachment-privacy decision. No object read/write was attempted. The lab has no buckets.

## Official deployment workflows

- Normal master workflow is locked to stable version 3.4.7 and deploys only `upstatus`. Its current Validate path fails the production updateURL assertion. It is not the newer coordinated candidate workflow.
- Team Lite official workflow reads root `release.json`, whose `preRelease` is `beta.22`, while `team-lite/release.json` is stable 3.4.30. The workflow rejects the root pre-release. The Team Lite build script reads the root manifest, sets `PROD_FUNCTION="upstatus"`, and the workflow deploys `upstatus`, not `upstatus-team-lite`. Do not dispatch this workflow; bypassing the guard risks targeting the Normal function.
- The current branch protection settings do not enforce required CI or human review.

## Issues and manual acceptance

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): 0/8 physical acceptance criteria. No installed Tampermonkey test for real network loss/recovery without F5, room re-entry, real microphone/display capture, multi-tab behavior, or installed Normal ↔ Team Lite interoperability was performed.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): the body remains the historical 16/35 checklist; comments record #109/#112/#113/#115 but the body is not a current release verdict. Do not convert 16/35 into a completion percentage.

No manual browser/device test, live `GET /ready`, HTTP concurrency race, replay request, external Realtime test, or fixture run was performed.

## Prioritized next gates

1. Define and implement true replay rejection beyond client-key idempotency; test identical SDP/ICE with a fresh key.
2. Persist one idempotency key per logical operation at the client call site and prove retry reuses it.
3. Extend readiness to verify primary/unique/FK constraints and concurrency-critical indexes; add bounded protection for public `GET /ready`.
4. Update the capacity/replay harness to require database readiness before fixture writes and make cleanup best-effort with aggregated errors and final empty-state verification.
5. Obtain explicit QA authorization and a scheduled lab window. Only then apply the final reconciled candidate migrations to the allowlisted lab, update the test function, and run HTTP readiness/capacity/idempotency/replay tests. Do not use production.
6. Reconcile the Team Lite adapter/backend on the current candidate stack and run exact-head combined tests without unsafe concurrent use of the shared lab.
7. Make authenticated server-mediated signaling the default in both clients, retire public call/voice/screen control events, minimize Realtime payloads and align the topic/channel authorization design.
8. Fix Team Lite manifest/build/deploy slug and harden both official workflows with pinned CLI, exact SHA/project checks, migration preflight and rollback.
9. Resolve production grants/default ACLs, SECURITY DEFINER execution grants, Realtime policy/payload design, Storage privacy, AUTH-03 and `MIGRATIONS_FAILED`.
10. Protect master/team-lite-official, require exact-head CI and human review, complete #78's eight physical tests, and refresh #79 with current evidence.

## Safety record and verdict

**NO RELEASE.** The code-level capacity, idempotency and readiness contracts have automated PASS evidence, but the candidate migrations are not applied and the lab runtime remains v32. The production clients remain on the public Realtime path; the server-mediated signaling function is absent from production. Replay with a fresh key, readiness constraint coverage, Team Lite reconciliation, production hardening and physical acceptance remain open.

All Supabase SQL in this pass was SELECT-only. No migration, fixture, deployment, merge, release, userscript publication, secret/flag/role/grant/policy/ACL change or destructive action was performed. The only write is this new append-only audit note on the dedicated QA branch.


## Post-commit QA Validate result

The documentation-only commit `772992a91385e3ce58c6d1c7bc15adefd9ce2f9d` has parent `9cc68a7be9c53abcb6e9284712ab39183dfc649c` and changes only this new audit file (210 additions, zero deletions). Its automatic PR #82 Validate [42563113049](https://github.com/Reekyi/UpStatus/actions/runs/42563113049) completed FAILURE. Job log: `production updateURL mismatch` in `scripts/validate.mjs:26`, same inherited master/build-manifest blocker as the previous #82 run. This does not indicate a runtime change in the documentation commit.

Before this append, the QA branch head was `772992a91385e3ce58c6d1c7bc15adefd9ce2f9d`; the current audit-note blob was `d6328a77f3c63c5dc9b36638ca209280354e4d11`. The update below uses that exact current blob SHA and preserves the existing note content.
