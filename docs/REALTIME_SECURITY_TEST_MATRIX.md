# Realtime Security Validation Matrix

Status: candidate-only test plan. No production or TEST changes have been applied.

## Release gate

This matrix records isolated API and Chromium WebRTC evidence separately from the remaining legacy Realtime and release gates. Static source assertions are not evidence of sender authentication.

## Required threat model

The existing topic `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0` is broadcast with public access. Treat every event and payload received from it as attacker-controlled. A field such as `from`, `sender`, `target`, `participants`, or `roomId` is not proof of identity or membership.

## Required test cases

| ID | Area | Test | Expected result | Current status |
|---|---|---|---|---|
| RT-01 | Public topic | Subscribe without a valid UpStatus session | No sensitive payloads are disclosed; unauthorized subscription is denied or payloads are non-sensitive | BLOCKED: current topic is public |
| RT-02 | Sender identity | Publish a call event claiming another user's `from` identity | Server rejects it or recipient ignores it based on authenticated server identity | PASS: authenticated API test derives sender and strips identity claims |
| RT-03 | Recipient binding | Send offer/answer/ICE with forged `to` | Server verifies recipient and room membership before delivery | PASS: recipient-scoped delivery and non-member rejection tested |
| RT-04 | Room membership | Send join/presence/leave for a room the sender has not joined | Rejected; roster is unchanged | PASS: membership, pending/accepted gates, leave and owner handoff covered by authenticated API suite |
| RT-05 | Call authorization | Forge `join_approved`, `join_declined`, or `ended` | Only an authorized participant can change call state | PARTIAL: authenticated invitation/acceptance/decline, group join requests, and discovery-only decline hints tested; every legacy call-state transition is not covered |
| RT-06 | Screen share | Forge screen-share offer/answer/ICE and presence/leave events; drop/replay offers and answers across reconnect | Only authenticated room members can negotiate; lost offer/answer is retried with bounded recovery and stale peers are replaced | PARTIAL: isolated authenticated screen-video negotiation/remote-track/teardown passes; Normal candidate VM retransmission/recovery tests pass; Team Lite exact-head workflow is queued; physical Tampermonkey/display-capture/network-recovery remains pending |
| RT-07 | Voice room | Forge voice-room presence, join, leave, offer, answer, and ICE | Server validates membership and recipient before forwarding | PASS for isolated authenticated voice audio SDP/ICE negotiation and teardown; legacy UI path pending |
| RT-08 | Replay | Replay an old signal after logout, room exit, or call end | Expired/revoked session or closed call is rejected | PARTIAL: closed-room, departed-member, and removed-binding replay paths return 403/404; warm-instance session cache is bounded to 5 seconds, but live cross-isolate revocation remains unverified |
| RT-09 | Abuse resistance | Flood malformed/oversized signaling messages | Bounded request size, distributed per-user read/write rate limits, 429 on excess, no unbounded memory/peer creation | PARTIAL: isolated signaling test endpoint v27 now uses a Postgres-backed atomic fixed-window counter with separate read/write buckets and returns 429 after the configured limit; migration 20261104154623 adds the table/RPC with service_role-only execution. CI now checks both the atomic RPC (24 concurrent calls, expected 10 allowed/14 denied, plus window reset) and the authenticated endpoint (91 concurrent writes from a dedicated fixture user, expected 90 route-level 404 responses and one 429); final-head runs are queued. Product endpoint cutover and production load/scale validation remain pending |
| RT-10 | Chat events | Forge `db_change`, `chat_fast`, and `chat_read` payloads | Client treats broadcasts as invalidation hints and refetches canonical state via authenticated API | PARTIAL: current Normal/Team Lite candidates emit empty `chat_fast` hints and ignore supplied rows; legacy clients and the public DB trigger can still disclose message data |
| RT-11 | Remote commands | Forge `remote_command` and `remote_result` events | No action/result is trusted from broadcast alone; server API remains authoritative | STATIC CHECKS PASS; full browser abuse test pending |
| RT-12 | Session revocation | Revoke a session while an Edge Function instance is warm | Requests fail after documented cache window; no long-lived stale authorization | PARTIAL: server-side session cache is explicitly bounded to 5 seconds; live warm-isolate revocation timing test remains pending |
| RT-13 | Migration grants | Execute the three trigger-only functions as `anon` and `authenticated` | Direct EXECUTE is denied; triggers still run for legitimate database writes | PASS: isolated catalog privilege checks show EXECUTE denied to both roles; trigger smoke operations previously passed |
| RT-14 | Table grants | Read/write backend-owned tables directly as `anon` and `authenticated` | Direct access denied; authenticated backend flows continue to work | PARTIAL: isolated migration 20261104152847 revokes all client privileges on upstatus_visual_config, and production catalog already showed no anon/auth SELECT/INSERT grants there. The nine backend-owned tables remain protected by the earlier revocation migration in isolation, but production still has unnecessary client grants on those nine tables; production rollout is pending |
| RT-15 | Cross-client compatibility | Normal and Team Lite clients join/leave calls and share screens across supported versions | No insecure downgrade; no broken call, voice, or screen-share workflow | PARTIAL: normal and Team Lite server templates now have identical token hashing/session lookup and session-creation contracts; shared isolated API/browser tests pass, but both product userscripts have not yet been exercised together in one live session |
| RT-16 | Regression | Login/logout, chat CRUD, reactions, receipts, typing, uploads, updater, remote status | No browser console/network regressions | PARTIAL: CI/static tests only |
| RT-17 | Realtime internal table grants | Inspect `realtime.messages` grants and RLS policies for anon/authenticated | No unnecessary direct client grants; authorization is enforced by explicit policies where private channels are used | PARTIAL: both production and isolated catalogs show RLS enabled but no policies while anon/authenticated retain SELECT/INSERT table grants; direct row access is not inferred, but the grants remain unnecessary and require a reviewed migration |

## Required architecture decision

Choose one of these paths only after proving identity and authorization in isolation:

1. **Private Realtime channels:** issue short-lived, signed identity tokens from a trusted server; validate the custom UpStatus session before issuing claims; require private channels and explicit RLS policies for `realtime.messages`; ensure revocation/expiry behavior and refresh are tested.
2. **Server-mediated signaling:** clients submit signaling intents to authenticated endpoints; the server derives sender identity from the session, checks room membership and recipient, bounds/rate-limits events, and relays/stores them without trusting client-supplied identity fields.

Do not treat client-side checks, public-channel obfuscation, or an unguessable topic name as sender authentication. Do not use the service-role key or a service-role JWT to sign user tokens.

## Isolated environment requirements

The isolated Supabase project `bfpjtfqlnypisxljoxkb` is used for authenticated API and browser signaling tests. Its signaling tables and columns have been inspected read-only. The trigger-function and table-grant migrations have been applied only to the isolated project. Read-only privilege checks confirm the public client roles cannot execute trigger-only functions or read backend-owned messages/users/sessions tables; service_role retains required privileges. Production and official TEST remain untouched.

## Release gate evidence

Before marking this work complete, attach:
- Environment/project reference and migration baseline (never secrets).
- Before/after grant and trigger catalog results.
- Positive and negative API tests for all RT-01 through RT-16 applicable cases.
- Browser test results for normal and Team Lite.
- Confirmation that chat, remote actions, calls, voice rooms, and screen sharing work with the chosen authorization design.
- Security Advisor results after applying changes to the isolated environment.
- Explicit reviewer approval before merge or deployment.

## Current conclusion

Both normal UpStatus and Team Lite candidates now include the default-off server-mediated signaling path. When explicitly enabled, call, voice, and screen signaling use authenticated room-scoped APIs; public Realtime is limited to non-authoritative discovery hints and legacy fallback remains active only when the flag is off. The isolated API and browser suites pass, including three-member group invitation/fanout and mesh coverage once the current CI run completes. This does not authenticate or retire the legacy public topic for clients that have not migrated. Public Realtime and production grant cleanup remain release blockers until a coordinated migration is approved and verified.


## 2026-11-03 isolated validation update

- GitHub Actions signaling smoke run `41661330565` completed successfully, including the authenticated test job. The job also passed the unauthenticated endpoint checks and static/adapter suites.
- The isolated authenticated runner creates three temporary test identities and sessions, runs API authorization, invitation, membership, binding, payload-sanitization, delivery, and cleanup checks, then runs Chromium WebRTC tests when the API suite passes.
- Browser coverage includes one-to-one call audio, voice-room audio, and screen-share video using isolated contexts, SDP offer/answer, gathered ICE candidates, connected peer states, remote media-track delivery, and teardown.
- These results validate the server-mediated prototype in isolation. They do not validate the full Tampermonkey UI/GM bridge, real hardware permissions, simultaneous calls, reconnect under adverse networks, normal/Team Lite cross-client compatibility, or the legacy public Realtime topic.
- RT-01 remains a release blocker for legacy Realtime: the public topic is still public. The authenticated transport remains default-off; no production or official TEST migration/deployment, PR merge, or release was performed.


## 2026-11-03 privilege and CI re-verification

- Normal build validation passed on commit `06fa7f2e44427a09c9cfa4f98cd73f05f42c98db`.
- Authenticated isolated signaling suite passed 86/86 HTTP checks; Chromium passed call audio, voice-room audio, and screen-video negotiation, remote track delivery, and teardown. Unauthenticated endpoint checks passed 14/14.
- Read-only privilege checks in isolated project: `anon` and `authenticated` cannot EXECUTE any of the three trigger-only broadcast functions and cannot SELECT `messages`, `users`, or `upstatus_sessions`. `service_role` retains required privileges. This complements prior trigger smoke tests; it does not claim a full REST negative-write matrix for every table.
- Production Security Advisor still reports the three broad-EXECUTE warnings. No production migration has been applied.
- Team Lite candidate validation is not cross-client signaling validation: Team Lite still uses the legacy public Realtime media-signaling path. RT-15 remains blocked.


## Session revocation cache hardening (2026-11-03)

- Normal UpStatus server now revalidates cached sessions at least every 5 seconds; logout in the same isolate still evicts the local entry immediately.
- This bounds stale authorization after external revocation to the cache TTL per warm isolate, subject to request/database availability. It does not provide instantaneous global revocation.
- Live multi-isolate timing verification remains a manual release gate.

## 2026-11-03 fail-closed and group-mesh follow-up

- Normal UpStatus and Team Lite now both reject public call-control events while authenticated transport is enabled, ignore public voice/screen media broadcasts, and fail closed rather than falling back to public signaling when the endpoint or room binding is unavailable.
- Group join approval now fails closed if the authenticated room mapping is missing; public decline is emitted only as a discovery-only hint.
- The normal and Team Lite server templates are statically checked for identical token hashing/session lookup and session creation contracts over the shared `upstatus_sessions` table.
- The browser harness has been extended to create a three-member group, exercise dynamic invitation/acceptance and authenticated roster fanout, negotiate all three peer-to-peer audio links, and verify peer/media teardown. Latest CI for this extended group-mesh suite is pending.
- A race in concurrent CI fixture provisioning was corrected: session rows are inserted before user rows, identity columns allocate IDs, and stale-fixture cleanup preserves every unexpired session/room. This prevents one run from deleting another run's active test identities.
- Production catalog checks still show broad `anon`/`authenticated` EXECUTE on the three trigger-only broadcast functions and direct client grants on nine RLS-enabled backend tables. The candidate revocation migrations are staged and validated in isolation; none has been applied to production or official TEST.


## 2026-11-04 isolated catalog and advisor refresh

Read-only verification against isolated project `bfpjtfqlnypisxljoxkb`:

- The three public SECURITY DEFINER broadcast trigger functions deny EXECUTE to `anon` and `authenticated`; `service_role` retains EXECUTE. This confirms the trigger-only grant hardening is present in isolation.
- Backend-owned tables `chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_signal_events`, `upstatus_signal_room_bindings`, `upstatus_signal_room_members`, `upstatus_signal_rooms`, `upstatus_state`, `upstatus_typing`, and `users` have RLS enabled and no client SELECT/INSERT grants; `service_role` retains access.
- Exception: `public.upstatus_visual_config` still grants SELECT and INSERT to both client roles. RLS is enabled with no policies, so this catalog result does not prove row access, but the grants are unnecessary and RT-14 is now PARTIAL.
- `realtime.messages` also has RLS enabled with no policies but retains anon/authenticated SELECT and INSERT grants. No direct row access is inferred; RT-17 tracks the unnecessary grants separately.
- Security Advisor: 14 INFO notices for RLS-enabled/no-policy tables; no ERROR/WARN items were returned. Performance Advisor: five unused-index INFO notices, including the recent bindings index. Do not drop indexes without workload evidence.
- No migration was applied during this audit. Production and official TEST were not queried or changed in this follow-up.


## 2026-11-04 production and isolated catalog refresh

Read-only catalog checks at approximately 15:15 UTC confirmed the release blocker is still present in production:

- The three trigger-only SECURITY DEFINER functions `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()`, and `upstatus_broadcast_users()` still grant EXECUTE to `PUBLIC`, `anon`, and `authenticated` in production. `service_role` also retains EXECUTE. Production Security Advisor returned three WARN findings for these functions and ten INFO notices for RLS-enabled tables without policies.
- Production still grants anon/authenticated SELECT and INSERT on the nine backend-owned public tables: `chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, and `users`. RLS is enabled with no policies on these tables, so the grant result is not evidence of successful row access. `service_role` retains the required access.
- Production `upstatus_visual_config` currently has no anon/authenticated SELECT or INSERT grants. This differs from the isolated project, where those grants remain.
- Both production and isolated projects still grant anon/authenticated SELECT and INSERT on `realtime.messages`; RLS is enabled with no policies. Do not infer direct row access from the grants alone.
- In the isolated project, the three SECURITY DEFINER functions correctly deny EXECUTE to anon/authenticated, and the nine backend-owned public tables deny client SELECT/INSERT. The remaining catalog exceptions are `upstatus_visual_config` and `realtime.messages`. Its Security Advisor returned 14 INFO notices and no WARN/ERROR findings.
- No production or official TEST migration was applied during this audit. The existing candidate revocation migrations remain staged; the additional `upstatus_visual_config` and `realtime.messages` grants need a separately reviewed migration and isolated behavior test.

## 2026-11-04 rate-limit coverage clarification

The authenticated signaling suite currently verifies malformed JSON, oversized request bodies, excessive nesting, and excessive payload width. The isolated signaling test endpoint uses a Postgres-backed fixed-window limiter with separate per-authenticated-UpStatus-username buckets (`:read` and `:write`): 240 reads/minute and 90 writes/minute. CI validates the RPC's atomic concurrency behavior and the endpoint's 429 response. The product-facing Normal/Team Lite endpoints do not yet call this RPC, and production does not contain its table/RPC. RT-09 therefore remains PARTIAL until the limiter is integrated into the coordinated product endpoint cutover and validated there.


## 2026-11-04 atomic chat receipts and isolated grant hardening

- Fixed a race in both Normal and Team Lite readRoute: separate Edge Function isolates no longer read the same JSONB receipt map and overwrite each other's changes.
- Added public.merge_chat_read_receipts(text, jsonb, timestamptz), a SECURITY INVOKER function with an empty search path. Its INSERT ... ON CONFLICT DO UPDATE merges each message's reader array under the row lock, de-duplicates readers, and advances last_read_at only to the newest message actually included in the read snapshot.
- Function EXECUTE is revoked from PUBLIC, anon, and authenticated; only service_role can call it. Both candidate server templates now use this RPC rather than client-side read-modify-upsert.
- Isolated migration version 20261104152847 also revokes all privileges on public.upstatus_visual_config from anon/authenticated. RLS remains enabled; service_role retains the required privileges.
- Concurrent isolated test: two simultaneous RPC calls for the same user updated overlapping and distinct message keys. The final JSONB preserved both readers on the overlapping message and the distinct second message; last_read_at retained the later timestamp.
- Normal Validate passed on the candidate head. The signaling smoke and Team Lite candidate workflows are being rerun against the final candidate heads. No production or official TEST migration was applied.
- RT-17 remains PARTIAL: realtime.messages still has client SELECT/INSERT grants in both catalogs; no change was made because its Realtime runtime dependency must be verified before revocation.


## 2026-11-04 distributed rate-limit candidate

- Added isolated migration 20261104154623_distributed_signaling_rate_limit_test: public.upstatus_signal_rate_limits plus public.consume_upstatus_signal_rate_limit(...). The function uses INSERT ... ON CONFLICT DO UPDATE so requests from separate Edge isolates share one atomic fixed-window counter.
- Table RLS is enabled; client roles have no table privileges. RPC is SECURITY INVOKER with an empty search_path; EXECUTE is revoked from PUBLIC/anon/authenticated and granted only to service_role.
- Isolated Edge Function upstatus-signal-test deployed as version 27 now calls the database RPC instead of an isolate-local Map. Read and write buckets remain separate; existing thresholds are 240 reads/minute and 90 writes/minute per session.
- Added scripts/test-signal-rate-limit.mjs to issue 24 concurrent requests against one bucket, expect exactly 10 allowed and 14 denied, then verify fixed-window reset. The authenticated integration harness also creates a dedicated temporary user, issues 91 concurrent writes, expects 90 requests to reach the unknown route and one HTTP 429, then deletes the user, session, and rate-limit buckets. Both checks are wired into Normal and Team Lite CI workflows.
- This is an isolated candidate validation only. The product-facing Normal/Team Lite endpoint cutover is not deployed; RT-09 remains PARTIAL until final CI passes and the limiter is integrated into the coordinated release endpoint.


## 2026-11-05 payload-free chat refresh hints

- Normal PR #74 and Team Lite PR #76 now emit `chat_fast` with an empty payload after successful text and attachment sends. The receiver already ignores broadcast data and refreshes canonical chat state through the authenticated API.
- Added regression assertions that fail if either candidate reintroduces `{message: ...}` in a `chat_fast` broadcast.
- This is a candidate-only reduction in exposure. Older deployed clients may still publish full message objects, the legacy topic remains public, and production `upstatus_broadcast_messages()` still broadcasts complete OLD/NEW rows as `db_change`. RT-01 remains BLOCKED and RT-10 remains PARTIAL.
- Exact-head CI at the time of this update: Normal Validate passed, Normal Signaling Smoke was cancelled before jobs became available for retry, and Team Lite Candidate Checks was pending. Do not treat these changes as fully validated until exact-head workflows complete.
- Production was inspected read-only; no migration, deployment, flag change, or grant change was performed.


## 2026-11-05 authenticated open voice-room membership

- The candidate now has a voice-only `POST /room/open` route. It derives the caller from the validated `x-upstatus-token` session; the client cannot choose the sender identity. The route accepts only the Normal/Team Lite voice logical IDs and calls the service-role-only `open_upstatus_signal_voice_room` RPC.
- The RPC is `SECURITY INVOKER`, has an empty search path, and is executable only by `service_role`. It validates that the authenticated name exists in `public.users`, serializes both product aliases with an advisory transaction lock, locks the active room row, enforces the 32-member ceiling, and inserts/updates the caller as `accepted` without an invitation.
- `leave_upstatus_signal_room` locks the room and membership rows, transfers owner control to the earliest remaining accepted member, and closes/cleans the room and bindings when the last member leaves. Call invitation/acceptance remains separate; voice does not use it.
- Team Lite PR #76 exact head `4178e54654b1bd2c06516fba9edea17d779b9ecd`, Candidate Checks run [42119919319](https://github.com/Reekyi/UpStatus/actions/runs/42119919319), passed. The authenticated suite reported **103/103** checks; logs specifically confirm late join through both Normal/Team Lite aliases, idempotent rejoin, no pending invitation, owner handoff, departed-member rejoin, last-member cleanup, owner-departure/late-join race, capacity enforcement, browser call/voice/screen WebRTC, three-member mesh, 90 accepted + 1 HTTP 429, rate-limit concurrency, read-receipt concurrency, and migration-layout guard.
- Normal PR #74 exact head before this documentation update was `73c19d5a890d39ee9524c1fb5042b7f6ffb7f53b`. Validate run [42120068532](https://github.com/Reekyi/UpStatus/actions/runs/42120068532) passed. Signaling Smoke [42120068577](https://github.com/Reekyi/UpStatus/actions/runs/42120068577) was still running at the last check: static harness and 14/14 unauthenticated checks passed; authenticated/browser and concurrency steps had not yet completed.
- The isolated project migration inventory includes `20261105220323 open_voice_room_membership_candidate`. Production does not contain either voice membership RPC; the candidate transport remains default-off. This is isolated candidate evidence, not production readiness.
- **Still pending:** real browser/Tampermonkey network-loss recovery without F5, microphone/display-capture permissions, and live Normal ↔ Team Lite interoperability. The physical recovery criteria in issue #78 remain open.
- **RT-09 remains PARTIAL:** the 429 response currently has no `Retry-After` header. Add and test an explicit conservative retry interval before treating the HTTP contract as complete.


### Normal exact-head validation completion — 2026-11-05

- Normal runtime head `73c19d5a890d39ee9524c1fb5042b7f6ffb7f53b`: Validate [42120068532](https://github.com/Reekyi/UpStatus/actions/runs/42120068532) and Signaling Smoke [42120068577](https://github.com/Reekyi/UpStatus/actions/runs/42120068577) both completed SUCCESS.
- Full smoke log confirms 14/14 static regression groups, 14/14 unauthenticated endpoint checks, **103/103 authenticated integration checks**, open voice late join/alias/idempotency/capacity/owner-handoff/race/last-member cleanup, Chromium call/voice/screen WebRTC with remote tracks, three-member mesh, peer/media teardown, fixture cleanup, 90 accepted + 1 HTTP 429, distributed rate-limit concurrency, and atomic read-receipt concurrency.
- The current PR #74 branch head is now `fd55588379c6a35ae4817ddafd556a8e8728997f` after documentation-only commits `2f0c6ac` and `fd55588`. No runtime or workflow-input file changed after the validated runtime head, so the exact runtime smoke evidence remains applicable. The Validate workflow ignores Markdown/docs.
- Team Lite #76 exact head `4178e54654b1bd2c06516fba9edea17d779b9ecd` independently passed Candidate Checks [42119919319](https://github.com/Reekyi/UpStatus/actions/runs/42119919319), also with 103/103 authenticated checks and the same open-join/WebRTC/rate-limit/read-receipt gates.
- RT-09 remains PARTIAL because the 429 response still lacks `Retry-After`, and the distributed limiter is not integrated into the deployed product endpoints. Manual network/device/cross-client acceptance remains pending.


### Isolated endpoint source parity — 2026-11-05

The isolated project `bfpjtfqlnypisxljoxkb` currently reports `upstatus-signal-test` version **28**, ACTIVE, `verify_jwt=false`, deployed source SHA `e26011f026c74821a1e05bf314340604d715820ab864b63d66fd481d93d00d4f`. Retrieved its actual Edge Function source and compared `index.ts`, `body.mjs`, and `legacy-envelope.mjs` with PR #74 head `8f07ea9`: the two helper modules match byte-for-byte; `index.ts` differs only in whitespace/line wrapping (whitespace-normalized content matches). This confirms the isolated endpoint logic under test matches the candidate source. It still has no `Retry-After` header on 429. Production Edge Functions and production database were not modified.


## 2026-11-06 screen-share offer/answer recovery candidate

- Code review found a one-shot negotiation gap in both userscripts: the sender did not retransmit a pending local offer after presence/reconnect, and the receiver ignored a duplicate offer even when the prior answer might have been lost.
- Both candidates now cache the pending local offer and answer, retransmit the same offer while have-local-offer remains unresolved, retry at 3-second intervals up to three times, cancel the timer after an accepted answer or connected state, resend the cached answer for duplicate offers, replace failed/disconnected peers before starting a new offer, and clear timers on peer teardown.
- Added scripts/screen-share-recovery.test.mjs; both candidate workflows execute it against their own userscript source. Coverage includes exact-SDP retransmission, bounded retries, connected-state cancellation, duplicate-offer answer replay, disconnected-peer replacement, and timer cleanup.
- Normal #74 runtime/test/workflow head f56acb9a59f56d0dfcef4bf3192550fc82f59c0d: Validate [42249084532](https://github.com/Reekyi/UpStatus/actions/runs/42249084532) passed; Smoke [42249084515](https://github.com/Reekyi/UpStatus/actions/runs/42249084515) passed the syntax/VM and unauthenticated endpoint stages while authenticated integration/browser/cleanup remained in progress at the last check.
- Team Lite #76 head ac18ada46755276691e08a127b52e9b3e8955d16: Candidate Checks [42249119327](https://github.com/Reekyi/UpStatus/actions/runs/42249119327) was queued behind the shared isolated-test concurrency group. The Normal and Team Lite screen-share implementation blocks and regression test file were verified byte-identical.
- This is candidate evidence only. No real network interruption, installed Tampermonkey UI, real display-capture permission, or live Normal ↔ Team Lite screen-share session has been verified. Production and official TEST remain untouched.

## 2026-11-06 — Retry-After client propagation follow-up

The earlier notes above stating that the isolated 429 response lacked `Retry-After` are superseded by the isolated endpoint v32 update and the client bridge work below.

- Isolated `upstatus-signal-test` v32 returns `Retry-After: 60` on HTTP 429 and exposes the header through `Access-Control-Expose-Headers`.
- Normal #74 and Team Lite #76 now preserve `GM_xmlhttpRequest.responseHeaders` in the signaling bridge.
- The shared adapter parses both delta-seconds and HTTP-date formats, attaches `retryAfterMs` and `retryAfterSeconds` to HTTP errors, and makes its polling loop respect the server delay even when it exceeds the local exponential-backoff cap.
- Non-polling write operations are not automatically retried; they receive the retry metadata so callers can avoid duplicate non-idempotent sends.
- Regression tests cover case-insensitive raw response headers, HTTP-date conversion, and the exact 60-second poll schedule.

**RT-09 remains PARTIAL.** The client now understands the isolated endpoint's retry contract, but the distributed limiter is still not integrated into the product-facing Normal/Team Lite backend endpoints or production. The authenticated signaling transport remains opt-in/default-off. Exact-head Normal Smoke and Team Lite Candidate Checks are still required, followed by official TEST and physical/manual acceptance.


## 2026-11-07 — empty search_path migration and Realtime delivery limitation

**Evidence time:** 2026-11-07 17:57 UTC. This section records a lab-only catalog verification and the limit of the trigger-delivery probe; it does not change RT-01 status.

- The isolated project `bfpjtfqlnypisxljoxkb` records migration `20261107165942 pin_empty_search_path_trigger_broadcasts_test` (34 migration records total).
- Direct read-only catalog verification confirms all three trigger functions remain `SECURITY DEFINER`, each has `proconfig = ['search_path=""']`, each remains attached to its original public-table trigger, and each retains schema-qualified `realtime.send`.
- Effective direct EXECUTE is false for `anon` and `authenticated`, and true for `service_role`, for all three functions.
- The lab's partitioned `realtime.messages` parent currently has **0 child partitions** and 0 rows. The production parent has 7 child partitions. The earlier rolled-back trigger probe therefore could not establish delivery: `realtime.send` logged/swallowed the missing-partition warning and inserted no row.
- Supabase documents `realtime.messages` as a day-partitioned table and states that `realtime.send` inserts into it; the function captures errors so a broadcast failure does not abort the caller. See [Realtime architecture](https://supabase.com/docs/guides/realtime/architecture#broadcast-from-postgres) and [Realtime concepts](https://supabase.com/docs/guides/realtime/concepts#schema-and-tables).
- Do not create partitions manually in the Supabase-managed `realtime` schema. A supported Realtime-enabled lab/project is required before claiming trigger-to-WebSocket delivery.
- Production remains unchanged: its three functions still have `search_path=public` and direct EXECUTE effective for anon/authenticated. The production migration in this PR is candidate-only.

**Classification:** empty-search-path function configuration and trigger/grant bindings are verified in the isolated database; end-to-end Realtime delivery is **NOT VERIFIED** in the lab. RT-01 remains blocked because public channels/full-row production broadcasts and the coordinated client cutover are still unresolved.
