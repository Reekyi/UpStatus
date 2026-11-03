# Realtime client migration: implementation gates

Status: opt-in one-to-one client path is wired behind a default-off flag; no default/live transport cutover has occurred.

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
- [x] Connect the bundled adapter to a GM_xmlhttpRequest wrapper using an explicitly configured, same-project signaling endpoint; enforce HTTPS and same-origin endpoint validation, and keep it disabled by default.
- [x] Wire an opt-in one-to-one call path behind a default-off flag, including invitation discovery, acceptance gating, polling, recipient-scoped signaling, and cleanup. Browser-authenticated WebRTC validation remains outstanding.
- [x] Validate authenticated HTTP invitation acceptance/decline/reissue, duplicate requests, accepted-member authorization, recipient-scoped signaling, broadcast fanout, acknowledgement, and room closure using temporary identities in the isolated project (65/65 integration checks passed).\n- [x] Validate authenticated browser call audio, voice-room audio, and screen-video negotiation using two isolated Chromium contexts, separate logical bindings, gathered ICE candidates, connected RTCPeerConnection states, and remote media-track delivery.
- [ ] Validate the complete Tampermonkey userscript UI/GM bridge, real hardware microphone permission, real getDisplayMedia capture, simultaneous-call collisions, hangup/reconnect lifecycle, and production-like network conditions.
- [ ] Migrate group calls only after one-to-one flow is proven.
- [x] Route candidate voice-room and screen-share signals through distinct authenticated binding types behind the same default-off flag, while preserving the Realtime fallback.
- [ ] Validate voice-room audio, screen-share video, independent binding resolution, peer teardown, and reconnect in authenticated browser E2E before enabling either path by default.
- [x] Configure the isolated CI service-role secret through GitHub/Supabase settings (never paste credentials into chat); authenticated HTTP integration job now runs and passes 65/65 checks. The secret is scoped to the isolated project.
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


## Opt-in one-to-one call wiring (2026-10-30)

- The shared userscript now contains a same-origin HTTPS request bridge and a default-off transport path for direct calls. It leaves the existing Realtime route as the default fallback.
- The path waits for explicit acceptance before acquiring media and sending the first SDP offer, and it uses server-derived accepted members for fanout.
- CI [41119407912](https://github.com/Reekyi/UpStatus/actions/runs/41119407912) and build validation [41119408099](https://github.com/Reekyi/UpStatus/actions/runs/41119408099) passed.
- Group call discovery/join, voice rooms, screen sharing, and authenticated browser/WebRTC verification remain pending. Do not enable or release the feature yet.


## Authenticated HTTP integration checkpoint (2026-11-03)

- The isolated CI secret `UPSTATUS_SIGNAL_TEST_SERVICE_ROLE_KEY` is configured in GitHub Actions and is never printed by the workflow.
- First authenticated run exposed an environment drift: the isolated Edge Function was revision 22 while the PR candidate included newer request-invite, broadcast, and declined-invitation reissue behavior.
- Updated only the isolated `upstatus-signal-test` Edge Function to the exact candidate files from this branch (revision 23). No production or official TEST function was changed.
- Re-ran the smoke job: 14/14 unauthenticated HTTP checks and 65/65 authenticated integration checks passed. Static regression suites and transport adapter assertions also passed. Temporary users, sessions, rooms, memberships, and events were cleaned up.
- This is authenticated HTTP/API validation, not browser/WebRTC E2E. A new Playwright Chromium harness now exercises the isolated authenticated API from two browser contexts and negotiates real RTCPeerConnection audio with gathered ICE candidates; its first CI execution is pending. Real user microphone permission, simultaneous calls, reconnect, and the full userscript call/voice/screen UI lifecycle remain unverified. Keep the feature disabled by default and do not enable group calls, voice rooms, or screen sharing for users until the browser checks pass.


## Browser WebRTC validation harness (2026-11-03)

- Added `scripts/test-signaling-browser.mjs`, executed only after the isolated authenticated HTTP suite passes.
- The CI job installs Playwright Chromium with fake microphone devices, creates two isolated browser contexts using temporary UpStatus test identities, accepts a server-issued room invitation, exchanges SDP offer/answer through the authenticated signaling endpoint, gathers ICE candidates, and asserts both peer connections reach `connected` and the callee receives a remote audio track.
- First CI execution passed: 65/65 authenticated HTTP checks, then Chromium successfully negotiated call audio, voice-room audio, and screen-video SDP offer/answer flows over separate authenticated bindings. All gathered ICE paths reached connected state and delivered remote media tracks.
- The browser harness closes rooms, peers, and local tracks in a `finally` block. The parent runner verified and removed temporary users, sessions, rooms, memberships, and events; a follow-up read-only query confirmed no temporary users remain.
- This validates real browser WebRTC primitives and authenticated server transport for all three media signal types. It does not yet exercise the complete Tampermonkey UI/GM bridge, actual hardware microphone permission, real getDisplayMedia capture, simultaneous-call collision handling, or reconnect behavior. These remain release gates.


## Call, voice, and screen browser checkpoint (2026-11-03)

- CI run [41656936221](https://github.com/Reekyi/UpStatus/actions/runs/41656936221) passed: static regressions 12/12, unauthenticated HTTP 14/14, authenticated HTTP 65/65, and authenticated Chromium WebRTC tests.
- Browser results: call audio passed, voice-room audio passed, and screen-video passed. The suite creates distinct call/voice/screen bindings, negotiates SDP and gathered ICE through the authenticated endpoint, confirms connected peer state, and checks remote audio/video track delivery.
- The follow-up CI run [41658151715](https://github.com/Reekyi/UpStatus/actions/runs/41658151715) also passed explicit teardown assertions: all three peer connections closed and every local media track reached `ended`. The runner verified cleanup; a read-only query confirmed no temporary test identities remain.


## Guest-session and media teardown regression checkpoint (2026-11-03)

- Added chat regression assertions for Lucca/Ycaro session start-time isolation across history, unread counts, and read receipts, and verified that the route passes the authenticated guest session timestamp to those handlers.
- CI validation [41658151915](https://github.com/Reekyi/UpStatus/actions/runs/41658151915) passed.
- Signaling smoke [41658151715](https://github.com/Reekyi/UpStatus/actions/runs/41658151715) passed: static 12/12, unauthenticated 14/14, authenticated 65/65, plus Chromium call/voice/screen media negotiation and teardown assertions.
- Temporary identities, sessions, rooms, memberships, and events were removed and verified absent from the isolated database.
