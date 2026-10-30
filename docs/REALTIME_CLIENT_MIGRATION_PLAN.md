# Realtime client migration: implementation gates

Status: design/audit checkpoint; no client transport has been switched.

## Why this must be staged

The userscript currently has one public Supabase Realtime channel for several independent purposes. The signaling events are `call_signal`, `voice_room_signal`, and `upstatus_screen_signal_3_1_1_beta8`. Chat refresh hints, presence, health pings, and remote-command hints also use this channel. The new authenticated signaling API is not a drop-in replacement for `realtimeChannel.send()`: it requires an authenticated room membership, while legacy flows assume they can send immediately.

## Audited call flow

- `startOutgoingCall(target)` creates a call ID, starts ringing, acquires the microphone, creates a peer connection, and sends the initial SDP offer immediately.
- `receiveCallSignal()` handles `offer`, `invite`, `join_request`, `join_approved`, `join`, `answer`, `ice`, `reject`, `busy`, `hangup`, and `leave`.
- Group invitations are currently delivered as a broadcast `invite`; acceptance occurs locally before the recipient sends mesh join messages.
- `voiceRoomSend/Receive/Join/Leave` exchange room presence and WebRTC offer/answer/ICE over the same broadcast channel. The normal room mirrors signals to the Team Lite logical room ID.
- `screenShareSend/Receive` uses a separate WebRTC peer mesh, but shares the voice-room logical room ID.

## Required transport contract

1. Every transport operation must use the authenticated user's server-side identity. Never trust client-supplied `from`, `to`, participant lists, or logical room IDs as authorization.
2. The client must create or resolve a logical room binding, send explicit invitations, and wait for accepted membership before sending SDP or ICE.
3. A recipient must be able to accept/decline an invitation before any offer or media setup begins. The caller must wait for acceptance before sending the initial offer.
4. Room closure and member departure must stop polling and close all associated RTCPeerConnections/tracks. Screen share and voice must have separate binding types even when they share a UI room.
5. Retries must be idempotent; duplicate invitations/signals must not create duplicate peers or bypass the membership state machine.
6. Legacy chat/presence/health broadcasts must remain operational during the signaling migration. Do not globally replace `sendRealtimeEvent` with the new API.

## Safe rollout sequence

- [x] Harden isolated signaling API and room-membership state machine.
- [x] Add isolated logical room bindings and explicit invitation endpoint.
- [x] Add static and unauthenticated HTTP regression coverage.
- [x] Add a default-off adapter with strict input validation, deduplication, acknowledgement, abortable polling, bounded retry backoff, explicit acceptance gating, and accepted-member fanout.
- [ ] Connect the bundled adapter to a GM_xmlhttpRequest wrapper using an explicitly configured, same-project signaling endpoint; keep it disabled by default.
- [ ] Migrate one-to-one calls behind a default-off feature flag; preserve legacy path by default. The adapter now has a call-room preparation primitive that waits for creator-observed acceptance before returning to offer creation.
- [ ] Test invitation acceptance, decline, timeout, simultaneous calls, hangup, ICE ordering, reconnect, and room closure using authenticated test identities.
- [ ] Migrate group calls only after one-to-one flow is proven.
- [ ] Migrate voice room and screen sharing only after the call path passes authenticated browser/WebRTC E2E.
- [ ] Migrate voice room and screen sharing with distinct binding types and independent cleanup tests.
- [ ] Configure the isolated CI service-role secret through GitHub/Supabase settings (never paste credentials into chat) and require the authenticated E2E job to pass. The authenticated job currently skips because the secret is absent.
- [ ] Verify the built userscript, browser behavior, and rollback path before requesting release approval.

## Release safety

All current transport work remains on the development branch and isolated Supabase project. Do not enable the new transport by default, merge the PR, apply migrations to production/official TEST, or publish either release line without explicit authorization. A passing static or unauthenticated test suite is not evidence that authenticated WebRTC signaling is production-ready.


## Additional acceptance-state work (2026-10-30)

- Added creator-only `POST /room/status`, returning room member names and states only to the room creator. This gives the initiator a server-authoritative way to wait for acceptance instead of trusting a public Realtime broadcast.
- Added adapter method `waitForAcceptance`, with timeout, decline handling, and abort support. Added tests for pending-to-accepted transitions, decline, and stale poll responses after cancellation.
- Deployed the new route to isolated function revision 21 only. The isolated health endpoint returned `{"ok":true,"service":"upstatus-signal-test"}`.
- The adapter remains disconnected from live userscript call/voice/screen handlers. Authenticated E2E and actual browser/WebRTC behavior remain release blockers.


## Build integration (2026-10-30)

- The shared build now bundles the adapter into normal and TEST userscript artifacts. Build validation checks both artifacts contain the adapter; the adapter remains disabled by default and has no runtime effect until a future caller explicitly initializes it.
- CI passed on [41117936053](https://github.com/Reekyi/UpStatus/actions/runs/41117936053) and build validation passed on [41117936020](https://github.com/Reekyi/UpStatus/actions/runs/41117936020).


## Accepted-member fanout (2026-10-30)

- Added `POST /room/members` for accepted members only, exposing accepted member names but not pending/declined invitation state to non-creators.
- Added `sendToRoom` so broadcast-style events can be translated into individually authorized recipient-scoped signals.
- Isolated function revision 22 deployed and health-checked. CI [41118513244](https://github.com/Reekyi/UpStatus/actions/runs/41118513244) passed 13 adapter assertions and 12/12 unauthenticated HTTP checks. Authenticated integration remains unverified.
