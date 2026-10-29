# Server-Mediated Signaling Prototype

Status: isolated prototype only. Not integrated with either userscript. Not approved for production.

## Environment

- Supabase project: `upstatus-security-test` (`bfpjtfqlnypisxljoxkb`)
- Function: `upstatus-signal-test`, revision 4
- Endpoint health check: `GET /functions/v1/upstatus-signal-test/health` returned `{"ok":true,"service":"upstatus-signal-test"}`
- The test project contains no production user/session rows and no production data was copied.
- The project is on the free tier; usage limits still apply.

## Flow

1. Every POST requires the UpStatus custom session in `x-upstatus-token`.
2. The function hashes the presented token and looks it up in `upstatus_sessions`; it checks expiration and confirms the user still exists.
3. `POST /room/create` creates a server-generated room ID and records the approved participant roster.
4. `POST /signal` derives the sender from the validated session. Client-supplied sender/target/room identity fields are stripped from the event payload. Sender and recipient must both be members of the active room.
5. Events are recipient-scoped, expire within two minutes, and are bounded by request/payload size and an in-memory per-user rate limit.
6. `POST /poll` returns only unexpired events addressed to the authenticated user for an active room; polling does not delete events.
7. `POST /ack` deletes only event IDs belonging to the caller as recipient in the specified room, after the client handles them.
8. `POST /room/close` can close a room only when called by its creator.

## Endpoint contract

- `GET /health`: deployment health only; does not require a session.
- `POST /room/create`: body `{"participants":["member name"]}`; caller is added automatically.
- `POST /signal`: body `{"roomId":"...","recipient":"...","eventType":"offer","payload":{...}}`.
- `POST /poll`: body `{"roomId":"..."}`.
- `POST /ack`: body `{"roomId":"...","eventIds":[123,124]}`; call only after handling events and deduplicating by `event_id`.
- `POST /room/close`: body `{"roomId":"..."}`.

The endpoint is deployed with platform JWT verification disabled only because UpStatus uses its own session token. Each non-health route validates that custom token itself. This is a test implementation, not evidence that the official clients are protected yet.

## Database protections

- Three dedicated tables: `upstatus_signal_rooms`, `upstatus_signal_room_members`, `upstatus_signal_events`.
- RLS is enabled on all three.
- Direct table privileges are revoked from `PUBLIC`, `anon`, and `authenticated`; only the server's service role has table access.
- Foreign keys bind room creators, room members, event senders and recipients to known users.
- Foreign-key indexes were added after the performance advisor identified missing covering indexes.

## Validation status

- [x] Test project created separately from production.
- [x] Tables created; RLS and direct grants verified by SQL catalog query.
- [x] Function deployed to the isolated project.
- [x] Health endpoint returned HTTP success and expected JSON after correcting a runtime naming collision.
- [x] Polling is non-destructive; added recipient-scoped acknowledgement to avoid losing events on interrupted responses.
- [x] Added content-length guard and stale in-memory rate-map cleanup.
- [x] Added a manual GitHub Actions smoke test for unauthenticated access and method restrictions.
- [x] Source and test harness saved in this repository branch.
- [x] Unauthenticated smoke workflow executed against the isolated test URL: 7/7 checks passed (health 200; unauthenticated create/signal/poll/close rejected with 401; invalid token rejected with 401; unsupported method rejected with 405).
- [ ] Positive API tests with two valid custom sessions.
- [ ] Negative API tests: missing/expired/revoked token, spoofed sender, non-member recipient, closed/expired room, invalid event type, oversized body and rate limiting.
- [ ] Multi-client WebRTC tests for offer/answer/ICE, calls, voice rooms and screen sharing.
- [ ] Client integration for normal and Team Lite.
- [ ] Latency/load/retention cleanup tests.
- [ ] Security review and explicit release approval.

## Known prototype limitations

- Rate limiting is in-memory per Edge Function instance, not a global distributed quota.
- Event queue cleanup/retention needs a scheduled cleanup or bounded cleanup strategy; TTL filters prevent delivery after expiry but expired rows still need cleanup.
- Polling is at-least-once until acknowledgement; client integration must deduplicate `event_id` and acknowledge only after successfully handling each event.
- Polling latency and ICE throughput have not been measured.
- Event-type authorization still needs a formal state machine, particularly for call acceptance, rejection and ending a room.
- No production or official TEST function was changed.
