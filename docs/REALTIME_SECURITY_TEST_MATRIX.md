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
| RT-06 | Screen share | Forge screen-share offer/answer/ICE and presence/leave events | Only authenticated room members can negotiate; untrusted signals do not create unauthorized peers | PASS for isolated authenticated screen-video SDP/ICE negotiation and teardown; legacy UI path pending |
| RT-07 | Voice room | Forge voice-room presence, join, leave, offer, answer, and ICE | Server validates membership and recipient before forwarding | PASS for isolated authenticated voice audio SDP/ICE negotiation and teardown; legacy UI path pending |
| RT-08 | Replay | Replay an old signal after logout, room exit, or call end | Expired/revoked session or closed call is rejected | PARTIAL: closed-room, departed-member, and removed-binding replay paths return 403/404; warm-instance session cache is bounded to 5 seconds, but live cross-isolate revocation remains unverified |
| RT-09 | Abuse resistance | Flood malformed/oversized signaling messages | Bounded request size, rate limits, no unbounded memory/peer creation | PARTIAL: malformed, oversized, deep and wide payloads rejected; rate-limit load/scale testing remains |
| RT-10 | Chat events | Forge `db_change`, `chat_fast`, and `chat_read` payloads | Client treats broadcasts as invalidation hints and refetches canonical state via authenticated API | STATIC CHECKS PASS; full browser abuse test pending |
| RT-11 | Remote commands | Forge `remote_command` and `remote_result` events | No action/result is trusted from broadcast alone; server API remains authoritative | STATIC CHECKS PASS; full browser abuse test pending |
| RT-12 | Session revocation | Revoke a session while an Edge Function instance is warm | Requests fail after documented cache window; no long-lived stale authorization | PARTIAL: server-side session cache is explicitly bounded to 5 seconds; live warm-isolate revocation timing test remains pending |
| RT-13 | Migration grants | Execute the three trigger-only functions as `anon` and `authenticated` | Direct EXECUTE is denied; triggers still run for legitimate database writes | PASS: isolated catalog privilege checks show EXECUTE denied to both roles; trigger smoke operations previously passed |
| RT-14 | Table grants | Read/write backend-owned tables directly as `anon` and `authenticated` | Direct access denied; authenticated backend flows continue to work | PARTIAL: current isolated catalog confirms no client SELECT/INSERT on chat, user, session, signaling, and status tables; `upstatus_visual_config` still has SELECT/INSERT grants for both client roles (RLS enabled with no policies, so row access remains denied) |
| RT-15 | Cross-client compatibility | Normal and Team Lite clients join/leave calls and share screens across supported versions | No insecure downgrade; no broken call, voice, or screen-share workflow | PARTIAL: normal and Team Lite server templates now have identical token hashing/session lookup and session-creation contracts; shared isolated API/browser tests pass, but both product userscripts have not yet been exercised together in one live session |
| RT-16 | Regression | Login/logout, chat CRUD, reactions, receipts, typing, uploads, updater, remote status | No browser console/network regressions | PARTIAL: CI/static tests only |
| RT-17 | Realtime internal table grants | Inspect `realtime.messages` grants and RLS policies for anon/authenticated | No unnecessary direct client grants; authorization is enforced by explicit policies where private channels are used | PARTIAL: isolated catalog shows RLS enabled but no policies, while anon/authenticated retain SELECT/INSERT table grants; direct row access is denied by RLS, but grants remain unnecessary and require a reviewed migration |

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
