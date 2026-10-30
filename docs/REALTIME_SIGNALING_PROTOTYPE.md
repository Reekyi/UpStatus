# Server-Mediated Signaling Prototype

Status: isolated prototype only. Not integrated with either userscript. Not approved for production.

## Environment

- Supabase project: `upstatus-security-test` (`bfpjtfqlnypisxljoxkb`)
- Function: `upstatus-signal-test`, isolated deployment revision 12 (bounded streaming JSON body reader included).
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
- The invitation migration adds a constrained membership status (`pending`, `accepted`, `declined`) and an index. Existing memberships preserve legacy behavior through an `accepted` default; new invitees are explicitly inserted as `pending`. The migration has been applied only to the isolated test project; the migration file is in the development branch.

## Running authenticated integration tests locally

The repository now includes a one-command fixture runner. It creates three temporary users and hashed sessions in the isolated test project, runs the authenticated harness, then removes test-created rooms and fixtures in a `finally` block. It refuses all other Supabase project URLs and does not print session tokens.

PowerShell (run locally; never paste the service-role key into chat or commit it):

```powershell
$env:SUPABASE_URL = "https://bfpjtfqlnypisxljoxkb.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<isolated test project's service-role/secret key>"
node scripts/run-signaling-authenticated.mjs
```

Use a test-project key only. If fixture cleanup reports an error, inspect the isolated test project and remove only rows whose names begin with `__signal_test_`. This runner is syntax-checked in CI but has not yet been executed by this session because the test project's service-role key is not available to the runner environment.

## Validation status

- [x] Test project created separately from production.
- [x] Tables created; RLS and direct grants verified by SQL catalog query.
- [x] Function deployed to the isolated project, currently revision 10.
- [x] Health endpoint returned HTTP success and expected JSON.
- [x] Polling is non-destructive; acknowledgement is scoped to the room and recipient.
- [x] Payload size guard, stale in-memory rate-map cleanup, and bounded opportunistic expiry cleanup added.\n- [x] Branch hardening adds bounded streaming body reads and rejects non-object JSON bodies; CI static regression checks cover both. Deploy and runtime-check this change in the isolated project before considering it validated.
- [x] Unauthenticated smoke workflow previously passed 7/7 checks against the isolated test endpoint.
- [x] Explicit invite listing, acceptance and decline routes and pending-membership gating implemented in the isolated prototype.
- [x] Authenticated integration harness expanded to test invitation discovery/privacy, invite consent, accurate acknowledgement counts, repeat acceptance, and decline access denial.
- [x] Static regression tests cover migration idempotency/default compatibility, atomic invitation transitions, accepted-member authorization, and test-project mutation guards.
- [x] Unauthenticated smoke workflow passed through run #30, including static regression checks and syntax checks for both integration harnesses.
- [ ] Authenticated integration harness has not been run: three valid test sessions and distinct test users are not available to this session. Do not count its scenarios as passed until it runs and its output is reviewed.
- [ ] Negative API tests: missing/expired/revoked token, spoofed sender, non-member recipient, closed/expired room, invalid event type, oversized body and rate limiting. The branch now adds bounded streaming body reads and rejects valid JSON that is not an object; deploy and runtime checks are pending.
- [x] Isolated test schema default updated to `accepted` for legacy membership inserts; verified in the database catalog.
- [x] Function revision 10 deployed to the isolated project with atomic invitation transitions and accepted-member-only acknowledgement; health endpoint returned expected JSON.
- [x] Function revision 12 deployed with bounded streaming JSON body reads and non-object JSON rejection; health endpoint returned expected JSON.
- [x] Body parser unit tests exercise valid/empty bodies, malformed JSON, non-object JSON, declared-size rejection, and streaming cancellation; GitHub Actions run #38 passed.
- [ ] Authenticated runtime re-check of invitation transitions and accepted-member-only acknowledgement. The body parser itself has credential-free unit coverage; HTTP-level authenticated endpoint tests remain pending.
- [ ] Multi-client WebRTC tests for offer/answer/ICE, calls, voice rooms and screen sharing.
- [ ] Client integration for normal and Team Lite.
- [ ] Latency/load/retention cleanup tests.
- [ ] Security review and explicit release approval.

## Known prototype limitations

- Rate limiting is in-memory per Edge Function instance, not a global distributed quota.
- Expired events (up to 500) and rooms (up to 100) are now cleaned opportunistically at most once per minute per warm function isolate. This is bounded best-effort cleanup, not a global scheduler; inactive projects/isolates can retain expired rows until the next authenticated request, and cleanup behavior still needs runtime/retention testing.
- Polling is at-least-once until acknowledgement; clients must deduplicate `event_id` and acknowledge only after handling each event.
- Polling latency and ICE throughput have not been measured.
- Event-type authorization still needs a formal state machine, particularly for call acceptance, rejection and ending a room.
- No production or official TEST function was changed. No PR was merged.
