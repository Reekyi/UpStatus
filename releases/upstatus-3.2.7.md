# UpStatus 3.2.7

Release artifact captured from the verified production Edge Function after deployment.

## Changes
- Fix image lightbox stacking: temporarily lower the UpStatus root using inline `z-index: 1 !important`, then restore the original z-index value and priority on close.
- Grouped incoming messages show the avatar on the first message, preserve compact connected bubbles, and add a small tail to the first incoming bubble.
- Sender names receive non-repeating pastel colors while the palette has available colors, with paired colors for dark and light themes.
- Incoming timestamps and own timestamp/read ticks are aligned at the lower-right inside the bubble.
- Link cards identify Google Sheets, Docs, and Slides by type, and attempt a title lookup only for public Google Docs URLs using anonymous requests. Private or unavailable document titles keep a useful fallback label.
- Preserved compact blue read ticks, the hidden avatar for the current user's own messages, link cards, and realtime read tracking.

## Validation
- JavaScript syntax compilation passed for the embedded userscript.
- Post-deployment inspection confirmed the production function serves userscript version 3.2.7 and all feature-presence checks passed.
- Not visually tested in Sale Smartly in a real browser session.

## Source synchronization note
The checked-in `release.json` and source templates on `master` were older than the deployed 3.2.6 production artifact at the start of this release. This branch archives the exact deployed 3.2.7 userscript so the release is recoverable; do not run the current master build over production until source-template synchronization is completed.
