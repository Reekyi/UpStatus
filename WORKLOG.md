[object Object]

### Follow-up verification (2026-10-29, latest checked run)
- Implemented pending attachment staging in the normal chat composer. File picker and pasted images now stage first; users can remove the pending attachment before sending. Sending supports an optional caption alongside the attachment.
- Added a removable URL preview for the first HTTP(S) link in the draft message. The preview is visual-only and does not change the message text. Corrected the URL-matching regex after a source-level syntax check caught an escaping error.
- Updated chat normalization to preserve `file_name`/ `fileName` as `fileName`, so document filenames remain distinct from captions.
- Adjusted two brittle regression assertions to test the intended semantics (sent timestamp metadata and actual link-card renderer/styles), rather than requiring a particular variable declaration or an obsolete compatibility-style ID. No behavior assertion was removed.
- Source-level syntax parsing passed for the userscript template. All 56 direct source/server assertions extracted from `scripts/chat-regression.test.mjs` passed, and additional checks confirmed attachment staging, pasted-image staging, caption forwarding, and removable link preview behavior.
- GitHub Actions run `40906042287` for head `5550195b1a63a9aceccbd65fe4df10a73b6e29cd` completed successfully. Build and full `scripts/validate.mjs` pipeline passed.
- PR #74 remains open and draft. No merge, deployment, release-version bump, or Supabase mutation was performed. Production, TEST, and Team Lite remain untouched.
- Remaining before considering a release: review the final diff; verify the Ricardo account has the `implementation_admin` role in the database; separately validate browser-level chat UX and Team Lite updater behavior; confirm backend runtime parity before any deployment. Do not merge or deploy as part of the current work session.
