# Realtime Security Validation Matrix

Status: candidate-only test plan. No production or TEST changes have been applied.

## Release gate

This matrix is intentionally not marked passed until it has been exercised against an isolated environment and both browser clients. Static source assertions are not evidence of sender authentication.

## Required threat model

The existing topic `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0` is broadcast with public access. Treat every event and payload received from it as attacker-controlled. A field such as `from`, `sender`, `target`, `participants`, or `roomId` is not proof of identity or membership.

## Required test cases

| ID | Area | Test | Expected result | Current status |
|---|---|---|---|---|
| RT-01 | Public topic | Subscribe without a valid UpStatus session | No sensitive payloads are disclosed; unauthorized subscription is denied or payloads are non-sensitive | BLOCKED: current topic is public |
| RT-02 | Sender identity | Publish a call event claiming another user's `from` identity | Server rejects it or recipient ignores it based on authenticated server identity | NOT PROVEN |
| RT-03 | Recipient binding | Send offer/answer/ICE with forged `to` | Server verifies recipient and room membership before delivery | NOT PROVEN |
| RT-04 | Room membership | Send join/presence/leave for a room the sender has not joined | Rejected; roster is unchanged | NOT PROVEN |
| RT-05 | Call authorization | Forge `join_approved`, `join_declined`, or `ended` | Only an authorized participant can change call state | NOT PROVEN |
| RT-06 | Screen share | Forge screen-share offer/answer/ICE and presence/leave events | Only authenticated room members can negotiate; untrusted signals do not create unauthorized peers | NOT PROVEN |
| RT-07 | Voice room | Forge voice-room presence, join, leave, offer, answer, and ICE | Server validates membership and recipient before forwarding | NOT PROVEN |
| RT-08 | Replay | Replay an old signal after logout, room exit, or call end | Expired/revoked session or closed call is rejected | NOT PROVEN |
| RT-09 | Abuse resistance | Flood malformed/oversized signaling messages | Bounded request size, rate limits, no unbounded memory/peer creation | PARTIAL: client bounds exist; server enforcement not proven |
| RT-10 | Chat events | Forge `db_change`, `chat_fast`, and `chat_read` payloads | Client treats broadcasts as invalidation hints and refetches canonical state via authenticated API | STATIC CHECKS PASS; browser test pending |
| RT-11 | Remote commands | Forge `remote_command` and `remote_result` events | No action/result is trusted from broadcast alone; server API remains authoritative | STATIC CHECKS PASS; browser test pending |
| RT-12 | Session revocation | Revoke a session while an Edge Function instance is warm | Requests fail after documented cache window; no long-lived stale authorization | NOT PROVEN |
| RT-13 | Migration grants | Execute the three trigger-only functions as `anon` and `authenticated` | Direct EXECUTE is denied; triggers still run for legitimate database writes | NOT RUN: migration is staged |
| RT-14 | Table grants | Read/write the nine backend-owned tables directly as `anon` and `authenticated` | Direct access denied; authenticated backend flows continue to work | NOT RUN: migration is staged |
| RT-15 | Cross-client compatibility | Normal and Team Lite clients join/leave calls and share screens across supported versions | No insecure downgrade; no broken call, voice, or screen-share workflow | NOT RUN |
| RT-16 | Regression | Login/logout, chat CRUD, reactions, receipts, typing, uploads, updater, remote status | No browser console/network regressions | PARTIAL: CI/static tests only |

## Required architecture decision

Choose one of these paths only after proving identity and authorization in isolation:

1. **Private Realtime channels:** issue short-lived, signed identity tokens from a trusted server; validate the custom UpStatus session before issuing claims; require private channels and explicit RLS policies for `realtime.messages`; ensure revocation/expiry behavior and refresh are tested.
2. **Server-mediated signaling:** clients submit signaling intents to authenticated endpoints; the server derives sender identity from the session, checks room membership and recipient, bounds/rate-limits events, and relays/stores them without trusting client-supplied identity fields.

Do not treat client-side checks, public-channel obfuscation, or an unguessable topic name as sender authentication. Do not use the service-role key or a service-role JWT to sign user tokens.

## Isolated environment requirements

The existing Supabase branch inventory did not provide a trustworthy migration-test target. Do not use production or a branch marked `MIGRATIONS_FAILED` for destructive/permission-changing validation. Create or obtain a supported isolated TEST project/branch, verify its project reference and migration baseline, and record the results before considering any migration.

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
