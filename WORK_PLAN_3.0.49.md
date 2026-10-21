# UpStatus 3.0.49 work plan

Baseline: stable release 3.0.48. All runtime changes must be tested against the `upstatus-test` Edge Function first. Never deploy `upstatus` production without explicit user approval.

## Ordered work items

1. **Chat scroll jump**: user reports that scrolling upward immediately after opening the chat is overridden 2–3 times. Root-cause review found a 2.4-second `chatOpenScrollUntil` window, repeated animation-frame and timer retries, plus MutationObserver/ResizeObserver/load listeners that force the list to the bottom without tracking deliberate user scrolling. Implement a targeted interruption mechanism and regression coverage.
2. **Ricardo-only header button order**: when member is Ricardo, render clear/trash before media library. Keep existing actions and other users' header unchanged.
3. **Responsive chat images**: constrain image width to the message bubble/container with proportional height, including narrow chat widths; ensure media viewer and GIF behavior remain intact.
4. **Call controls/group calling**: recover intent from historical `feature/group-calls-3.0.27-beta.1` and compare with current stable. Restore add-participants control if the group-call implementation can be safely integrated; investigate signaling, ringtone/notification delivery and cross-version/browser call setup. Don't claim universal browser reliability without real multi-client testing.
5. **Chat document attachments**: support common office and document formats (PDF, DOC/DOCX, XLS/XLSX/CSV, PPT/PPTX, TXT/RTF) with validation, upload-size/type controls, metadata and download/open UX.
6. **Media library categories**: distinct Media and Documents views with appropriate file rendering, retaining existing historical media compatibility.
7. **Visual redesign**: follow the user-approved mock-up: refined dark premium/minimalist surfaces, rounded/larger thumbnails, metadata hierarchy, search/sort, tabs and compact controls. Keep existing modal/viewer/player behavior stable.

## Execution rules

- Work one logical issue at a time with a separate focused commit and tests.
- Inspect repository and function state before changing it.
- Keep the official stable 3.0.48 and production function unchanged until explicit approval.
- Keep generated distribution and embedded userscript payload synchronized using `scripts/build.mjs`.
- Run `node scripts/validate.mjs` and relevant targeted tests after each step.
- Distinguish static/automated tests from manual Sale Smartly/browser/multi-user call tests.
- Do not merge to master or deploy production unless explicitly authorized.
