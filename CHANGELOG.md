# Changelog

## 2026-10-16

### 3.0.40-beta.3
- Fixed emoji picker positioning and visibility inside the animated chat panel; preserved cursor insertion and outside-click dismissal.
- Restored right-click message context menus with string-safe message ID matching.
- Neutralized attachment and microphone default states in light theme, with clear hover, recording, and disabled states.
- Reduced chat panel height while preserving message-list scrolling and compact-screen access.
- Kept the composer order as emoji, attachment, message input, microphone, and send.

### 3.0.40-beta.2
- Grouped emoji, attachment, message input, microphone, and send controls into one composer bar.
- Fixed the emoji picker closing immediately when clicking its icon.

## 2026-10-16

### 3.0.40-beta.1
- Replaced the audio recorder emoji with the microphone SVG icon used by call controls.
- Matched the recorder button dimensions to the attachment button on desktop and mobile.
- Added reserved bottom space to the chat message list so the last message does not sit against the composer.
- Added subtle panel and menu entrance animations with reduced-motion support.

## 2026-10-07

### Release pipeline v1
- Established `3.0.26` as the production baseline.
- Added `develop` as the TEST/integration branch.
- Added a single release configuration file.
- Extracted the userscript into a readable source template.
- Extracted the Edge Function into a generated source template.
- Added reproducible build and validation scripts.
- Isolated TEST storage, Realtime signaling, and ringtone coordination.
- Added validation, manual TEST deployment, and manual production workflows.
- Automatic TEST deployment is intentionally paused until GitHub Actions Supabase secrets are configured.
- Production runtime was not modified by the pipeline refactor.
\n
## 2026-10-08

### 3.0.27-beta.5
- Chat notifications now stack up to 3 visible balloons instead of replacing the previous one.
- Additional messages are queued and displayed as older balloons leave the screen.
- Each notification stays visible for 3 seconds and now has entry and exit animations.
- Added a pending notification counter for messages waiting in the queue.
