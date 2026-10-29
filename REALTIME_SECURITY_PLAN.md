# UpStatus Realtime Security Remediation Plan

Last reviewed: 2026-10-29  
Status: design only; no runtime, database, secret, or release changes.

## Executive summary

The normal and Team Lite candidate userscripts now treat several public broadcasts as untrusted hints, but the shared Realtime channel remains public. Client-side validation can reduce malformed input and UI spoofing; it cannot prove the sender's identity. A subscriber to a public topic can observe events and send payloads using another member's displayed name.

The immediate goal is to prevent sensitive chat and call/media signaling from being trusted or exposed to arbitrary public-topic subscribers without breaking current sessions.

## Verified live state (read-only, 2026-10-29)

- Production Edge Function `upstatus`: revision 480, version 3.4.7, `verify_jwt=false`.
- TEST Edge Function `upstatus-test`: revision 281, embedded userscript 3.3.28, `verify_jwt=false`.
- Team Lite Edge Function `upstatus-team-lite`: revision 15, embedded userscript 3.4.30, `verify_jwt=false`.
- The production Realtime producer functions `public.upstatus_broadcast_messages()`, `public.upstatus_broadcast_remote_state()`, and `public.upstatus_broadcast_users()` are SECURITY DEFINER, use `realtime.send(..., false)`, and have direct EXECUTE available to `anon` and `authenticated`.
- These three functions are bound to table triggers on `messages`, `upstatus_state`, and `users`; the exact trigger names are `upstatus_messages_broadcast`, `upstatus_remote_state_broadcast`, and `upstatus_users_broadcast`.
- The shared topic is `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`. Producers send `db_change` with the full changed message row, `user_status` with selected user status fields, and remote command/result fields. Each uses `private=false`.
- Read-only catalog checks returned no policies on `realtime.messages`. The `realtime.messages` table has RLS enabled, but has no authorization policy.
- Security Advisor currently reports three broad-EXECUTE SECURITY DEFINER findings and ten public tables with RLS enabled but no policies. A separate privilege query confirmed that several of those tables still have grants to `anon` and `authenticated`; RLS without policies denies row operations through those policies, but unnecessary grants should be removed after compatibility checks.
- Two migration candidates are staged in PR #74 but have not been applied:
  - `20261029170500_restrict_trigger_function_execute.sql`: revokes direct EXECUTE grants from PUBLIC, anon and authenticated for the three trigger-only functions.
  - `20261029183000_revoke_unused_public_table_grants.sql`: revokes unnecessary direct table grants from PUBLIC, anon and authenticated for nine tables.
- The deployed runtime code is not a one-to-one copy of the candidate template. This is intentional in some areas and must not be reconciled by overwriting the runtime blindly.

No secrets, signing keys, or raw secret values were read or printed. A read-only probe for JWT-related database settings returned no rows; that is not proof that a suitable signing key is unavailable, since signing configuration may be managed outside SQL-visible settings.

### Custom-session revocation timing

The current candidate Edge Function caches a successfully resolved custom session in memory and skips the database re-check for up to 30 seconds (`sessionCache`, guarded by `now-cached.checkedAt<30000`). Expired sessions are rejected by the cached expiry, but a server-side session deletion, account disablement, or role change may not take effect on an already warm function instance until that cache entry is revalidated or expires. This is a separate authorization freshness issue from Realtime sender identity. Any future credential-issuing endpoint must either revalidate the session and member status at issuance, keep issued tokens very short-lived, and define revocation expectations, or introduce an explicit revocation/version mechanism. Do not treat cache expiry alone as immediate logout or member-removal revocation.

## Current event inventory

The normal userscript's generated Realtime channel uses `upstatus-screen-share-live-3-1-1-beta10` in the production build and the TEST topic configured by `scripts/build.mjs`. The runtime topic observed in the deployed production bundle differs from the candidate build topic and must be treated separately.

| Event | Current candidate behavior | Remaining risk / required treatment |
| --- | --- | --- |
| db_change | Refresh hint only; reconcile through authenticated chat API | Live producer currently broadcasts the complete changed row. Remove sensitive row content from public broadcasts; use only a payload-free hint or authorized channel. |
| chat_fast | Refresh hint only; reconcile through authenticated chat API | Keep payload-free; avoid message body/attachment disclosure on public topic. |
| chat_read | Refresh hint only; reconcile through authenticated chat API | Never trust public read receipts or reader identity. |
| user_status | Triggers a refresh | Live trigger broadcasts selected status/reason/sync fields publicly. Move to authorized topic or minimize to a generic hint. |
| chat_presence | Updates online/open indicator from event | Name and presence can be spoofed; move to authorized topic or treat as cosmetic only. |
| health_ping / health_pong | Bounded payloads and sender-label matching | Sender labels are not authentication; do not use as security/availability proof. |
| remote_command | Triggers an authenticated backend poll; payload itself is not executed by candidates | Live producer still publicly broadcasts command metadata. Keep server poll authoritative and minimize/remove public command contents. |
| remote_result | Public result payload is ignored; authenticated endpoint is polled | Live producer publicly broadcasts result metadata including reason/error. Keep authenticated endpoint as the only source of truth. |
| call_signal | Validates size, event target, IDs and participant roster | Critical: caller identity is still spoofable; offers/answers/ICE and call controls need authenticated sender identity. |
| voice_room_signal | Room messages are processed client-side | Critical: sender/room identity is spoofable; validate room membership and sender on a trusted boundary. |
| upstatus_screen_signal_3_1_1_beta8 | Screen-share signaling is processed client-side | Critical: sender/room identity is spoofable; protect SDP/ICE and share controls. |
| Trigger-generated broadcasts | Database triggers emit messages/users/remote-state changes | All verified current trigger producers use public `realtime.send(..., false)`; confirm event payload minimization and direct function EXECUTE grants separately. |

## Architecture decision gates

### Option A: private Realtime channels with server-issued identity

1. Keep the existing UpStatus custom session as the application authentication source.
2. Add a narrowly scoped Edge Function endpoint that validates the custom session, member status, role and session expiry, then issues a short-lived Realtime-compatible JWT using an approved signing mechanism. Never expose signing material to the userscript or logs.
3. Confirm which signing keys and token-verification configuration are supported by this Supabase project. Do not assume the service-role key can sign arbitrary JWTs. The project currently uses a mixture of a modern publishable client key and server-side secret/service-role environment fallback; this does not prove that an appropriate Realtime JWT signing key is available to the app.
4. Define RLS policies on `realtime.messages` for SELECT and INSERT that allow only approved members and approved topic/event families. Use explicit topic matching and claims; do not use a blanket `USING (true)` policy.
5. Switch clients to private channel configuration, call `realtime.setAuth(shortLivedToken)`, and refresh credentials safely before expiry. Handle token refresh, reconnect, sign-out, expired sessions and role changes.
6. Test authorization with allowed member, anonymous client, expired token, removed member, wrong room, spoofed sender, unauthorized event, and cross-product topic cases.
7. Migrate clients and policies in a coordinated TEST rollout before production. Public legacy channels must not carry sensitive data during the transition.

Gate: Do not implement until signing-key availability, claims, subject/role, expiry, refresh/revocation behavior, and policy semantics have been confirmed against current project configuration and tested in isolation.

### Option B: authenticated server-mediated signaling

1. Send signaling through custom-session-authenticated Edge Function endpoints.
2. Store bounded, expiring, recipient-scoped events in a dedicated table or equivalent server-controlled queue; authorize sender, recipient, room membership, and event type on every write/read.
3. Deliver events by authenticated polling or a non-sensitive Realtime invalidation hint. Never trust the hint as event content.
4. Measure polling latency, ICE candidate throughput, retention cleanup, rate limits, duplicate delivery and multi-member call behavior before deciding whether the latency is acceptable.

Trade-off: this avoids introducing Realtime JWT identity into the custom-session system, but polling and durable event delivery can add latency and database load, especially for WebRTC signaling.

### Signing-key feasibility check (official Supabase documentation, 2026-10-29)

The official Supabase documentation confirms that private Realtime channels require both RLS policies on `realtime.messages` and client channels configured with `private: true`; the project's Realtime setting must also disable public access. Authorization is evaluated from the JWT claims, request headers, and topic. Supabase also documents that custom JWTs require a signing key whose private key or shared secret is held by the application that mints the token; asymmetric signing-key private material is not extractable from Supabase after import.

References:
- https://supabase.com/docs/guides/realtime/authorization
- https://supabase.com/docs/guides/auth/signing-keys
- https://supabase.com/docs/guides/functions/secrets

This reinforces the current gate: the project has not been verified to have an app-controlled signing key suitable for UpStatus's custom session identities. Do not use the service-role API key or a role=`service_role` JWT as a shortcut. A viable private-channel route would require an intentionally provisioned signing key (with its private material securely stored as an Edge Function secret), an agreed custom-identity claim model, explicit Realtime public-access configuration, and policies tested in isolation. Those are auth/configuration changes and are not authorized as part of this candidate-only work. Until explicit approval and isolated validation are available, server-mediated signaling remains the alternative to investigate.

### Preliminary recommendation

Do not flip existing channels to private yet. The read-only checks found no current RLS policy on `realtime.messages`, and the app's custom sessions are not Supabase Auth JWTs. Option A remains possible only after a supported signing and validation mechanism is proven. Option B is the lower-coupling fallback if a supported signing mechanism cannot be established without secrets/configuration changes, but it needs latency and throughput testing.

## Recommended implementation sequence

1. No-regrets hardening: retain the candidate chat, remote-command/result and payload-boundary fixes. Keep server endpoints authoritative.
2. Read-only inventory: map every broadcast producer, consumer, topic, event payload, trigger, and recipient rule across normal, TEST and Team Lite. Verify actual deployed runtime separately from generated source.
3. Choose A or B: prove the identity and authorization path before editing clients.
4. Isolated TEST implementation: create policies/endpoints and a test matrix; do not apply to production or official Team Lite without explicit approval.
5. Compatibility rollout: prove that old and new clients cannot accidentally downgrade to an insecure path and that voice/call/screen-share still work.
6. Release gate: browser-test login/logout, session expiry, multiple members, chat attachments/replies/link previews, remote actions, voice rooms, calls, screen sharing, updater behavior and reconnection. Require explicit approval before deployment or merge.

## Separate database privilege finding

The staged migration `supabase/migrations/20261029170500_restrict_trigger_function_execute.sql` revokes direct EXECUTE grants from the three trigger-only functions `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()`, and `upstatus_broadcast_users()` for PUBLIC, anon, and authenticated, while leaving trigger invocation intact. Read-only catalog checks still show the broad grants present and no migration-history record for `20261029170500`. The migration has not been applied. Review rollback and validate trigger behavior in TEST before any application.

The second staged migration `supabase/migrations/20261029183000_revoke_unused_public_table_grants.sql` revokes unnecessary table privileges for PUBLIC, anon, and authenticated on nine tables currently accessed through the backend Edge Function. It has not been applied either. Validate direct client compatibility and service-role trigger behavior in TEST before considering it.

## Safety invariants

- Never publish or merge a candidate without explicit approval.
- Never deploy to production or TEST, apply migrations, or change official Team Lite without explicit approval.
- Never expose signing secrets, service-role keys, session tokens, or raw private payloads in logs or documentation.
- Never create broad Realtime policies solely to silence the Security Advisor.
- Client-side validation is defense-in-depth, not sender authentication.
- Treat deployed Edge Function source/version as runtime truth; do not assume a legacy bundle or generated artifact is deployed.
