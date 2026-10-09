# UpStatus two-client regression test plan

This document defines the first automated test layer. It is a plan, not a claim that browser/WebRTC tests already run in CI.

## Test harness requirements

- Use two isolated browser contexts/clients, never two pages sharing the same userscript storage.
- Inject test doubles at explicit boundaries rather than relying on undocumented Sale Smartly DOM internals.
- Point test clients only at the TEST Edge Function and TEST Realtime topic.
- Fail the suite if any TEST artifact includes a production userscript URL, production storage prefix, production topic, or production ringtone coordination key.
- Do not deploy from these tests.

## Required deterministic scenarios

1. Leader election: one client obtains the leader lock, publishes leader presence, and starts the full instance.
2. Duplicate exclusion: a second client on the same chat route remains a follower and does not create a second Realtime/WebRTC instance.
3. Leader failover: after the leader closes, one follower becomes leader; the remaining clients stay followers.
4. Shift+C routing: with an active leader, the shortcut routes focus to the leader; without one, it opens Sale Smartly and does not create a duplicate full instance.
5. Call signaling: incoming offer is routed only to the intended call instance and unknown/duplicate call IDs are ignored.
6. Accept and reject: accepting connects the intended peer; rejecting stops ringing and does not disturb an unrelated active call.
7. End and cleanup: ending a call removes tracks, timers, audio elements, channels, and handlers created by that call.
8. Realtime reconnect: losing and restoring the connection restores listeners without duplicate subscriptions or duplicate event processing.
9. Isolation: test browser contexts share only TEST coordination data; production constants remain absent.
10. Audio routing: native remote audio playback stays separate from the WebAudio source used by the speaker detector.

## Layers

### Layer A: Node unit tests
Extract pure functions and state-transition logic where possible. Run on every pull request, using Node's built-in test runner (`node:test`) to avoid adding a framework dependency immediately.

### Layer B: browser integration tests
Add Playwright only after the project can provision its browser dependency reliably in CI. Use simulated signaling/media at first; do not claim real microphone/audio quality from mocked tracks.

### Layer C: manual real-browser matrix
Continue the release checklist for Chrome-to-Chrome, Firefox-to-Chrome, Chrome-to-Firefox, and Firefox-to-Firefox, including real audio, permissions, accept/reject, mute, group-call continuity, and tab closure.

## Acceptance criteria

- Test artifacts are always generated from the build script, never hand-edited copies.
- CI runs the deterministic suite before any TEST deployment.
- TEST manual checklist passes before a release candidate is considered.
- Production remains unchanged until explicit approval.
