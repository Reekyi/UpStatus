# UpStatus Realtime Security Remediation Plan

Last reviewed: 2026-10-29  
Status: design only; no runtime, database, secret, or release changes.

## Executive summary

The normal and Team Lite candidate userscripts now treat several public broadcasts as untrusted hints, but the shared Realtime channel remains public. Client-side validation can reduce malformed input and UI spoofing; it cannot prove the sender's identity. A subscriber to a public topic can observe events and send payloads using another member's displayed name.

The immediate goal is to prevent sensitive chat and call/media signaling from being trusted or exposed to arbitrary public-topic subscribers without breaking current sessions.

## Current event inventory

The normal userscript's generated Realtime channel uses upstatus-screen-share-live-3-1-1-beta10 in production and the TEST topic configured by scripts/build.mjs. The shared channel currently carries these event families:

| Event | Current candidate behavior | Remaining risk / required treatment |
| --- | --- | --- |
| db_change | Refresh hint only; reconcile through authenticated chat API | Keep payload-free or minimally scoped; never accept row mutations from broadcast |
| chat_fast | Refresh hint only; reconcile through authenticated chat API | Same; avoid message body/attachment disclosure on public topic |
| chat_read | Refresh hint only; reconcile through authenticated chat API | Never trust public read receipts or reader identity |
| user_status | Triggers a refresh | Verify refresh endpoint authorization; don't trust event identity/data |
| chat_presence | Updates online/open indicator from event | Name and presence can be spoofed; move to authorized topic or treat as cosmetic only |
| health_ping / health_pong | Bounded payloads and sender-label matching | Sender labels are not authentication; do not use as security/availability proof |
| remote_command | Triggers an authenticated backend poll; payload itself is not executed | Keep poll as authority; validate authorization and target again server-side |
| remote_result | Public result payload is ignored; authenticated endpoint is polled | Keep authenticated endpoint as the only source of truth |
| call_signal | Validates size, event target, IDs and participant roster | Critical: caller identity is still spoofable; offers/answers/ICE and call controls need authenticated sender identity |
| voice_room_signal | Room messages are processed client-side | Critical: sender/room identity is spoofable; validate room membership and sender on a trusted boundary |
| upstatus_screen_signal_3_1_1_beta8 | Screen-share signaling is processed client-side | Critical: sender/room identity is spoofable; protect SDP/ICE and share controls |
| Trigger-generated broadcasts | Database triggers emit messages/users/remote-state changes | Confirm payload minimization and direct function EXECUTE grants separately |

## Architecture decision gates

### Option A: private Realtime channels with server-issued identity

1. Keep the existing UpStatus custom session as the application authentication source.
2. Add a narrowly scoped Edge Function endpoint that validates the custom session, member status, role and session expiry, then issues a short-lived Realtime-compatible JWT using an approved signing mechanism. Never expose signing material to the userscript or logs.
3. Confirm which signing keys and token-verification configuration are supported by this Supabase project. Do not assume the service-role key can sign arbitrary JWTs. Do not read or print secrets during discovery.
4. Define RLS policies on realtime.messages for SELECT and INSERT that allow only approved members and approved topic/event families. Use explicit topic matching and claims; do not use a blanket USING (true) policy.
5. Switch clients to private channel configuration, call realtime.setAuth(shortLivedToken), and refresh credentials safely before expiry. Handle token refresh, reconnect, sign-out, expired sessions and role changes.
6. Test authorization with allowed member, anonymous client, expired token, removed member, wrong room, spoofed sender, unauthorized event, and cross-product topic cases.
7. Migrate clients and policies in a coordinated TEST rollout before production. Public legacy channels must not carry sensitive data during the transition.

Gate: Do not implement until signing-key availability, claims, sub/role, expiry, refresh/revocation behavior, and policy semantics have been confirmed against current project configuration and tested in isolation.

### Option B: authenticated server-mediated signaling

1. Send signaling through custom-session-authenticated Edge Function endpoints.
2. Store bounded, expiring, recipient-scoped events in a dedicated table or equivalent server-controlled queue; authorize sender, recipient, room membership, and event type on every write/read.
3. Deliver events by authenticated polling or a non-sensitive Realtime invalidation hint. Never trust the hint as event content.
4. Measure polling latency, ICE candidate throughput, retention cleanup, rate limits, duplicate delivery and multi-member call behavior before deciding whether the latency is acceptable.

Trade-off: this avoids introducing Realtime JWT identity into the custom-session system, but polling and durable event delivery can add latency and database load, especially for WebRTC signaling.

## Recommended implementation sequence

1. No-regrets hardening: retain the candidate chat, remote-command/result and payload-boundary fixes. Keep server endpoints authoritative.
2. Read-only inventory: map every broadcast producer, consumer, topic, event payload, trigger, and recipient rule across normal, TEST and Team Lite. Verify actual deployed runtime separately from generated source.
3. Choose A or B: prove the identity and authorization path before editing clients.
4. Isolated TEST implementation: create policies/endpoints and a test matrix; do not apply to production or official Team Lite.
5. Compatibility rollout: prove that old and new clients cannot accidentally downgrade to an insecure path and that voice/call/screen-share still work.
6. Release gate: browser-test login/logout, session expiry, multiple members, chat attachments/replies/link previews, remote actions, voice rooms, calls, screen sharing, updater behavior and reconnection. Require explicit approval before deployment or merge.

## Separate database privilege finding

The staged migration supabase/migrations/20261029170500_restrict_trigger_function_execute.sql revokes direct EXECUTE grants from the three trigger-only functions upstatus_broadcast_messages(), upstatus_broadcast_remote_state(), and upstatus_broadcast_users() for PUBLIC, anon, and authenticated, while leaving trigger invocation intact. Read-only catalog checks still show the broad grants present and no migration-history record for 20261029170500. The migration has not been applied. Review rollback and validate trigger behavior in TEST before any application.

## Safety invariants

- Never publish or merge a candidate without explicit approval.
- Never deploy to production or TEST, apply migrations, or change official Team Lite without explicit approval.
- Never expose signing secrets, service-role keys, session tokens, or raw private payloads in logs or documentation.
- Never create broad Realtime policies solely to silence the Security Advisor.
- Client-side validation is defense-in-depth, not sender authentication.
- Treat deployed Edge Function source/version as runtime truth; do not assume a legacy bundle or generated artifact is deployed.
