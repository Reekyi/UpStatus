# Changelog

## 2026-10-17

### 3.0.40-beta.6 (restored)
- Reverted beta.7 chat-list spacing change after UI regression; restored beta.6 behavior.

## 2026-10-17

### 3.0.40-beta.7
- Reduced the apparent gap between the last chat message and the composer by bottom-aligning short message lists while preserving scroll behavior for longer histories.

## 2026-10-17

### 3.0.40-beta.6
- Restored the latest test chat UI changes, including the message context menu portal, emoji picker positioning, composer alignment, and updated send icon.
- Fixed a missing quote in the chat icon definition that prevented the userscript from loading.

## 2026-10-17

### 3.0.40-beta.5
- Rendered the emoji picker and message context menu above the page layer to prevent clipping by the animated chat panel.
- Updated outside-click handling and theme styling for the portaled menus.
- Preserved existing reply, reaction, delete, emoji insertion, and composer behavior.

## 2026-10-17

### 3.0.40-beta.4
- Anchored the emoji picker to the chat composer to prevent it from opening outside the panel.
- Replaced the fragile early right-click capture with one delegated chat listener for message context menus.
- Added a refined paper-plane SVG icon for sending messages.
- Vertically centered the message input and placeholder with the composer controls.
- Preserved TEST-only storage, Realtime topic, ringtone coordination, and Edge Function routing.

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
