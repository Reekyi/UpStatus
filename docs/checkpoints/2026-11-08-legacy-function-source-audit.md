# Production Edge Function source audit — 2026-11-08

**Verified at:** 2026-11-08 06:04 BRT / 09:04 UTC  
**Repository:** `Reekyi/UpStatus`  
**Production project:** `dlfvkawaiqduhlazsszm`  
**Lab project:** `bfpjtfqlnypisxljoxkb`  
**Method:** GitHub PR/CI inspection; Supabase function metadata and source retrieval; read-only function invocation logs; read-only PostgreSQL catalog/row-count queries. No runtime, database, secret, or deployment writes.

> Evidence checkpoint only. It does not authorize merge, deploy, release, userscript publication, production SQL/migration, role/grant/ACL/policy/flag changes, or function deactivation.

## 1. GitHub state and CI

All seven tracked PRs remain open, Draft, unmerged, and have no submitted human reviews.

| PR | Current HEAD | Latest inspected CI |
|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `9c0133e8cf6bd85ac8993888718a408db2f24a3e` | Validate [42451736696](https://github.com/Reekyi/UpStatus/actions/runs/42451736696) PASS; Smoke [42451736729](https://github.com/Reekyi/UpStatus/actions/runs/42451736729) PASS; 136/136 authenticated checks |
| [#75 baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) historical PASS |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `eb28e88325d7e8a6236d9050bebabf794d64a8c4` | Candidate Checks [42450476433](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) PASS; 110/110 authenticated checks |
| [#80 continuity](https://github.com/Reekyi/UpStatus/pull/80) | `c5bad1e74837274f7392ee84a0a445dfc1c7890b` | Validate [42461771403](https://github.com/Reekyi/UpStatus/actions/runs/42461771403) FAIL at inherited `client signed upload helper missing`, `scripts/validate.mjs:55` |
| [#82 independent QA](https://github.com/Reekyi/UpStatus/pull/82) | `b16b414f8c61e00398a34eff67f6d9d22acf7a49` | Validate [42463622764](https://github.com/Reekyi/UpStatus/actions/runs/42463622764) FAIL at inherited `production updateURL mismatch`, `scripts/validate.mjs:26` |
| [#84 TEST isolation](https://github.com/Reekyi/UpStatus/pull/84) | `21341f331270e142bdf7584c1cdf16e6011e41b3` | Validate [42387042361](https://github.com/Reekyi/UpStatus/actions/runs/42387042361) PASS |
| [#85 master stabilization](https://github.com/Reekyi/UpStatus/pull/85) | `36c19ab87d883fe5252715fcbbc0fbef2e35ec9f` | Validate [42440947791](https://github.com/Reekyi/UpStatus/actions/runs/42440947791) PASS |

The #80/#82 failure logs were inspected; each stops at its inherited base-contract assertion before product integration tests. No validator was weakened.

Current compare results against PR bases: #74 877 ahead/0 behind master; #75 59/0 against `team-lite-official`; #76 364/0 against `team-lite-official` and 305 commits ahead of #75; #80 226/0 against develop; #82 122/0 against master. Do not merge #75 and #76 together or treat #74/#76 as small independent patches.

## 2. Production Edge Function inventory

The organization lists exactly two Supabase projects. Production is `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002, with seven migrations. The isolated signaling lab is `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.003, with 38 migrations. No independent full-product TEST project exists; `upstatus-test` is a function inside the production project, not an environment boundary.

Production has **38/38 Edge Functions ACTIVE**. All 38 metadata records report `verify_jwt=false`.

### Four operational endpoints

| Function | Version | Runtime role |
|---|---:|---|
| `upstatus` | v480 | Normal userscript/update artifact endpoint |
| `upstatus-screen-share-3-1-1-beta10` | v6 | Legacy Normal API endpoint; currently receiving live traffic |
| `upstatus-team-lite` | v15 | Team Lite API endpoint |
| `upstatus-test` | v281 | TEST function still hosted inside production |

### Thirty-four historical/test/beta/backup endpoints

**Test family (11):**
- `upstatus-test-backup-032`
- `upstatus-test-beta11`
- `upstatus-test-3-0-51-beta1` through `beta3`
- `upstatus-test-3-0-52-beta1` through `beta6`

**Screen-share family (12):**
- `upstatus-screen-share-3-1-1-beta1` through `beta9`
- `upstatus-screen-share-3-1-1-beta9-1`
- `upstatus-screen-share-3-1-1-beta9-2`
- `upstatus-screen-share-3-1-1-beta9-3`

**Backup family (11):**
- `upstatus-backup-pre-3-1-1-20261022`
- `upstatus-backup-3-1-1-loopfix-20261022`
- `upstatus-backup-pre-3-1-2-20261022`
- `upstatus-backup-3-1-2-identityfix-20261022`
- `upstatus-backup-325`, `326`, `327-prepatch`, `327-pre328`, `328-pre329`, `329-pre330`, `330-pre331`

No function was disabled.

## 3. Source-level route and authorization audit

Source retrieval succeeded for **37 of 38** functions. The active function `upstatus-backup-327-pre328` returned an `index.ts` file with **zero bytes** from the source retrieval endpoint. Treat it as **unclassified**; an empty retrieval payload is not proof that the deployed runtime is empty.

Across the 37 retrievable sources:

- All contain the custom `x-upstatus-token` header path, a token parser, `contextName`, `account()`, and `admin()`.
- All expose the common account/setup/login/me/logout, health/status/history, chat/read/typing/reaction, chat item PATCH/DELETE, chat clear, profiles/avatar, remote-status, and member/update-info route families.
- Lucca portal routes are present in all 37. Ycaro portal routes are present in 36; `upstatus-test-backup-032` is the exception.
- Signed-upload routes (`/api/chat/upload-url` and `/api/profile/avatar-upload-url`) appear in the three current product/update functions (`upstatus`, `upstatus-test`, `upstatus-team-lite`), not the legacy beta/backup family.
- `upstatus-test-backup-032` also lacks the later chat-document route.
- The source-level dispatch uses custom session context for protected product APIs; public/static/login/setup routes remain separately reachable by design. Because all functions have `verify_jwt=false`, gateway JWT verification is not a substitute for those handler checks. Reference: [Supabase Authorization headers](https://supabase.com/docs/guides/functions/auth-headers).

**Critical common authorization drift:** all 37 retrievable sources still contain `/api/chat/clear` guarded only by the session name `Ricardo`, without requiring the stored `implementation_admin` role. This is a privilege-revocation defect in every source-retrievable operational and historical runtime.

**Individual message deletion differs by generation:**
- Current four operational endpoints and `upstatus-backup-330-pre331` use the legacy `name === "Ricardo" || await admin(name)` fallback in `deleteRoute`.
- The other 32 retrievable historical functions restrict deletion to the message owner.
- This is not a reason to disable or overwrite a backup; preserve the variants until dependencies and rollback needs are established.

Candidate code has already corrected both authorization checks: Normal template blob `c7de6c4b8677fd829f512b224db3157e506cf2ad`; Team Lite template blob `c2367c8bd5ebdd2d2149803f7dc62c1c5aa6fcac`. Both use `admin(name)`, which checks the stored `implementation_admin` role. These are candidate source inspections, not production rollout evidence.

## 4. Runtime traffic — current 24-hour query

Read-only `function_edge_logs` aggregation with `timestamp >= now() - interval 24 hour` returned **468 invocations**, with events between 2026-11-07 17:06:12 UTC and 18:31:42 UTC:

| Function / path | Requests | HTTP | Average execution |
|---|---:|---:|---:|
| beta10 `/api/status` | 157 | 200 | 1016.8 ms |
| beta10 `/api/chat` | 156 | 200 | 1502.7 ms |
| beta10 `/api/remote-status` | 154 | 200 | 531.7 ms |
| `upstatus` `/upstatus.user.js` | 1 | 200 | 294 ms |

No invocation rows appeared for the other 36 active function IDs in this query window. The absence of logs is not proof of no historical/client dependency.

A separate 7-day query and a 30-day query returned the same 468 rows with the same first/last event timestamps (2026-11-07 17:06:12 UTC to 18:31:42 UTC). The currently surfaced log dataset therefore does **not** establish a true 7/30-day zero-use history for the other functions; it only establishes that the available rows cover this 1h25m interval. Longer-retention exports or client-side endpoint inventory are required before any retirement decision.

**Operational conclusion:** beta10 is demonstrably live and must not be treated as an unused backup. Keep it active until the Normal API/update artifact split is reconciled and a coordinated cutover/rollback is reviewed.

### Normal and Team Lite artifact mismatch

- Deployed `upstatus` v480 serves userscript 3.4.7 with update/download URLs pointing to `/functions/v1/upstatus/upstatus.user.js`, while its `CLOUD_SERVER` points to beta10.
- Deployed beta10 v6 embeds a userscript identifying as 3.1.1-beta8; its embedded update/download URL and `CLOUD_SERVER` point to beta8.
- The logs prove that beta10 receives requests; they do not prove which persisted endpoint each installed client uses or which updater path every client follows.
- Deployed Team Lite v15 embeds 3.4.30; candidate #76 is 3.4.31 and has not been published/deployed.

Do not change only one URL, deploy only the updater, or deactivate beta8/beta10 based on the 24-hour window. Align artifact version, API endpoint, auth, signaling, manifest, updater, and rollback as one reviewed cutover per product.

## 5. Production database — read-only snapshot

Current SELECT-only catalog/data checks returned:

- Five users; three explicit `implementation_admin` roles; zero blank roles; zero blank password hashes.
- Three `upstatus_broadcast_*` trigger functions remain SECURITY DEFINER with `search_path=public`; effective EXECUTE is true for anon, authenticated, and service_role.
- Nine backend-owned tables (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) have effective SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, and MAINTAIN for both anon and authenticated.
- `pg_policies` returned no policies for those nine tables or `storage.objects`. RLS/no-policy does not prove ordinary row access; the grants remain excessive.
- Default ACLs remain broad for owners `postgres` and `supabase_admin`. Current SQL role is `postgres`; do not attempt to assume or alter `supabase_admin` ownership.
- `realtime.messages`: 50 rows, seven child partitions; anon/authenticated have SELECT and INSERT.
- Storage buckets `chat-images` and `profile-images` are public, each with a 20 MiB limit.
- No candidate rate-limit/setup-invite/voice-room/chat-read RPC names were found in production.

Security Advisor: three anon SECURITY DEFINER WARN, three authenticated SECURITY DEFINER WARN, ten RLS-enabled/no-policy INFO. Performance and Health Advisors returned no findings.

RT-01, grant hardening, and default-ACL owner authority remain release blockers. Do not simply set Realtime channels private: the current custom-token client does not provide a Supabase Auth JWT for private-channel authorization, so transport/auth design and end-to-end delivery proof must be coordinated.

## 6. Isolated lab and signaling helper

Read-only lab snapshot after the latest completed CI runs returned zero users, messages, chat reads, sessions, rooms, room members, events, bindings, rate-limit rows, call attempts, voice-room attempts, Storage objects, Realtime rows/partitions, and granted/waiting advisory locks.

The deployed `upstatus-signal-test` remains v32, SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`. Its mapper contains `VOICE_ATTEMPT_CONFLICT` and `ROOM_FULL` → HTTP 409, but does not contain `VOICE_ATTEMPT_ALREADY_ACTIVE`; that code still falls through to HTTP 500 in the deployed helper. Candidate offline mapper tests do not prove a real HTTP response. Validate only in an explicitly authorized isolated environment.

## 7. Issues and release gates

- [#78 no-F5 reconnection](https://github.com/Reekyi/UpStatus/issues/78) remains OPEN, **0/8 physical acceptance criteria**. Real offline/online recovery, re-entry, new calls, real microphone/display capture, and installed Normal ↔ Team Lite interoperability remain manual pending.
- [#79 release readiness](https://github.com/Reekyi/UpStatus/issues/79) remains OPEN. CI green does not close stored-role authorization rollout, RT-01, AUTH-02, full-product TEST, artifact/API cutover, human reviews, or physical acceptance.

## 8. Next actions

1. Preserve all 38 functions; continue longer-window dependency and client inventory before any deactivation.
2. Keep beta10 live and prepare a coordinated Normal artifact/API cutover with rollback; keep Team Lite as a separate release line.
3. Correct stored-role authorization in the four operational runtimes only through a separately authorized, reviewed rollout with zero-side-effect denial tests.
4. Version and test the isolated signaling helper's HTTP 409 mapping in authorized TEST; do not deploy from this checkpoint.
5. Complete AUTH-02 source-identity design and real Deno HTTP AUTH-03 tests.
6. Resolve RT-01 with authenticated/private transport compatible with custom sessions, then validate delivery in an isolated full-product environment.
7. Rehearse grants/default-ACL changes with the appropriate owner/admin authority; provision full-product TEST.
8. Obtain human reviews and complete the eight physical #78 acceptance criteria.

## Safety record

Production inspection used only metadata, logs, and SELECT/catalog queries. Lab inspection used only SELECT/catalog queries after completed CI. No function, fixture, secret, role, grant, ACL, policy, feature flag, migration, or production setting was changed. No workflow was dispatched or rerun. No function was deactivated. No merge, deploy, release, or userscript publication occurred.
