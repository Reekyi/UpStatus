# Server-Mediated Signaling Prototype

Status: isolated prototype only. Not integrated with either userscript. Not approved for production.

## Environment

- Supabase project: `upstatus-security-test` (`bfpjtfqlnypisxljoxkb`)
- Function: `upstatus-signal-test`, isolated deployment revision 7.
- Endpoint health check: `GET /functions/v1/upstatus-signal-test/health` returned `{"ok":true,"service":"upstatus-signal-test"}`.
- No production user/session rows or production data were copied into this test project.
- The project is on the free tier; usage limits still apply.

## Flow

1. Every POST requires the UpStatus custom session in `x-upstatus-token`.
2. The function hashes the presented token and looks it up in `upstatus_sessions`; it checks expiration and confirms the user still exists.
3. `POST /room/create` creates a server-generated room ID. The creator is an accepted member; other requested users are invitations with `pending` status.
4. `POST /room/invitations` lists the caller's own pending invitations, without exposing rooms they were not invited to. `POST /room/accept` lets only the authenticated invitee accept their own pending invitation. `POST /room/decline` lets them decline it. Uninvited users cannot accept. Pending/declined users cannot signal or poll.
5. `POST /signal` derives the sender from the validated session. Client-supplied sender/target/room identity fields are stripped from event payloads. Sender and recipient must both be accepted members of the active room.
6. Events are recipient-scoped, expire within two minutes, and are bounded by request/payload size and an in-memory per-user rate limit.
7. `POST /poll` returns only unexpired events addressed to the authenticated user for an active room; polling does not delete events.
8. `POST /ack` deletes only event IDs belonging to the caller as recipient in the specified room, and reports the number of rows actually deleted.
9. `POST /room/close` can close a room only when called by its creator.

## Endpoint contract

- `GET /health`: deployment health only; does not require a session.
- `POST /room/create`: body `{"participants":["member name"]}`; caller is added automatically and invitees start as pending.
- `POST /room/invitations`: body `{}`; returns up to 50 active, unexpired invitations addressed to the authenticated caller.
- `POST /room/accept`: body `{"roomId":"..." }`; authenticated invitee accepts their own invitation.
- `POST /room/decline`: body `{"roomId":"..." }`; authenticated invitee declines their own invitation.
- `POST /signal`: body `{"roomId":"...","recipient":"...","eventType":"offer","payload":{...}}`.
- `POST /poll`: body `{"roomId":"..." }`.
- `POST /ack`: body `{"roomId":"...","eventIds":[123,124]}`; call only after handling events and deduplicating by `event_id`.
- `POST /room/close`: body `{"roomId":"..." }`.

The endpoint is deployed with platform JWT verification disabled only because UpStatus uses its own session token. Each non-health route validates that custom token itself. This is a test implementation, not evidence that the official clients are protected yet.

## Database protections

- Three dedicated tables: `upstatus_signal_rooms`, `upstatus_signal_room_members`, `upstatus_signal_events`.
- RLS is enabled on all three.
- Direct table privileges are revoked from `PUBLIC`, `anon`, and `authenticated`; only the server's service role has table access.
- Foreign keys bind room creators, room members, event senders and recipients to known users.
- The invitation migration adds a constrained membership status (`pending`, `accepted`, `declined`) and an index. It has been applied only to the isolated test project; the migration file is in the development branch.

## Validation status

- [x] Test project created separately from production.
- [x] Tables created; RLS and direct grants verified by SQL catalog query.
- [x] Function deployed to the isolated project, currently revision 8.
- [x] Health endpoint returned HTTP success and expected JSON.
- [x] Polling is non-destructive; acknowledgement is scoped to the room and recipient.
- [x] Payload size guard and stale in-memory rate-map cleanup added.
- [x] Unauthenticated smoke workflow previously passed 7/7 checks against the isolated test endpoint.
- [x] Explicit invite listing, acceptance and decline routes and pending-membership gating implemented in the isolated prototype.
- [x] Authenticated integration harness expanded to test invitation discovery/privacy, invite consent and accurate acknowledgement counts.
- [ ] Latest smoke workflow run must finish successfully before counting invitation-discovery auth checks as validated.
- [ ] Authenticated integration harness has not been run: three valid test sessions and distinct test users are not available to this session. Do not count its scenarios as passed until it runs and its output is reviewed.
- [ ] Negative API tests: missing/expired/revoked token, spoofed sender, non-member recipient, closed/expired room, invalid event type, oversized body and rate limiting.
- [ ] Multi-client WebRTC tests for offer/answer/ICE, calls, voice rooms and screen sharing.
- [ ] Client integration for normal and Team Lite.
- [ ] Latency/load/retention cleanup tests.
- [ ] Security review and explicit release approval.

## Known prototype limitations

- Rate limiting is in-memory per Edge Function instance, not a global distributed quota.
- Event queue cleanup/retention needs a scheduled cleanup or bounded cleanup strategy; TTL filters prevent delivery after expiry but expired rows still need cleanup.
- Polling is at-least-once until acknowledgement; clients must deduplicate `event_id` and acknowledge only after handling each event.
- Polling latency and ICE throughput have not been measured.
- Event-type authorization still needs a formal state machine, particularly for call acceptance, rejection and ending a room.
- No production or official TEST function was changed. No PR was merged.
