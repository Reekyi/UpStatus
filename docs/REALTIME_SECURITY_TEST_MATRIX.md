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
| RT-05 | Call authorization | Forge `join_approved`, `join_declined`, or `ended` | Only an authorized participant can change call state | PARTIAL: invite/accept/decline and membership authorization tested; all legacy call-state transitions not covered |
| RT-06 | Screen share | Forge screen-share offer/answer/ICE and presence/leave events | Only authenticated room members can negotiate; untrusted signals do not create unauthorized peers | PASS for isolated authenticated screen-video SDP/ICE negotiation and teardown; legacy UI path pending |
| RT-07 | Voice room | Forge voice-room presence, join, leave, offer, answer, and ICE | Server validates membership and recipient before forwarding | PASS for isolated authenticated voice audio SDP/ICE negotiation and teardown; legacy UI path pending |
| RT-08 | Replay | Replay an old signal after logout, room exit, or call end | Expired/revoked session or closed call is rejected | NOT PROVEN |
| RT-09 | Abuse resistance | Flood malformed/oversized signaling messages | Bounded request size, rate limits, no unbounded memory/peer creation | PARTIAL: malformed, oversized, deep and wide payloads rejected; rate-limit load/scale testing remains |
| RT-10 | Chat events | Forge `db_change`, `chat_fast`, and `chat_read` payloads | Client treats broadcasts as invalidation hints and refetches canonical state via authenticated API | STATIC CHECKS PASS; full browser abuse test pending |
| RT-11 | Remote commands | Forge `remote_command` and `remote_result` events | No action/result is trusted from broadcast alone; server API remains authoritative | STATIC CHECKS PASS; full browser abuse test pending |
| RT-12 | Session revocation | Revoke a session while an Edge Function instance is warm | Requests fail after documented cache window; no long-lived stale authorization | NOT PROVEN |
| RT-13 | Migration grants | Execute the three trigger-only functions as `anon` and `authenticated` | Direct EXECUTE is denied; triggers still run for legitimate database writes | PASS: isolated catalog privilege checks show EXECUTE denied to both roles; trigger smoke operations previously passed |
| RT-14 | Table grants | Read/write the nine backend-owned tables directly as `anon` and `authenticated` | Direct access denied; authenticated backend flows continue to work | PASS: isolated privilege checks show no SELECT on messages/users/sessions for either role; authenticated API suite passes |
| RT-15 | Cross-client compatibility | Normal and Team Lite clients join/leave calls and share screens across supported versions | No insecure downgrade; no broken call, voice, or screen-share workflow | NOT RUN |
| RT-16 | Regression | Login/logout, chat CRUD, reactions, receipts, typing, uploads, updater, remote status | No browser console/network regressions | PARTIAL: CI/static tests only |

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

The existing candidate CI validates builds and selected regression invariants. It does not authenticate public Realtime senders and does not replace integration tests. Public signaling remains a release-blocking security gap until one of the server-authorized designs above is implemented and verified.


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
