# Chat attachments: validation plan

Run against an isolated TEST deployment only. Do not apply the migration or deploy the production Edge Function as part of this checklist.

## Automated validation

- Run node scripts/validate.mjs.
- Confirm the generated production and TEST userscripts embed their matching source templates.
- Confirm the userscript parses as JavaScript.
- Confirm the server template has the 72-hour TTL, private Storage bucket, signed URLs, metadata, cleanup route, and document endpoint.
- Confirm the migration defines a private bucket and a scheduled cleanup job.

## TEST integration checklist

### Upload allowlist
- [ ] PNG, JPEG, WEBP and GIF upload, render and open correctly.
- [ ] MP4 and WEBM upload and play correctly.
- [ ] PDF, TXT, CSV, DOCX, XLSX and PPTX upload and download correctly.
- [ ] Rename an unsupported file to a supported extension. The server must reject it when its bytes/MIME do not match the allowlist.
- [ ] Upload an empty file and a malformed PDF/Office file. Reject malformed or empty content.
- [ ] Verify audio recording and playback still work.
- [ ] Verify profile avatar uploads still use the existing profile-images bucket and remain unaffected.

### Size and request handling
- [ ] Verify a file just below the allowed size succeeds.
- [ ] Verify a file just above the allowed size fails with a readable error.
- [ ] Verify the deployed Edge Function and gateway accept the JSON/base64 request size. A 25 MB file expands to roughly 33.3 MB before JSON overhead; if the gateway rejects it, replace this transport with a signed direct-to-Storage upload before release.
- [ ] Verify network failures do not leave an orphan object or permanently disable the attachment button.

### Privacy and expiry
- [ ] Confirm chat-attachments is private in Supabase Storage.
- [ ] Confirm an unauthenticated public object URL cannot read an attachment.
- [ ] Confirm an authorized chat client receives a signed URL.
- [ ] Confirm the signed URL stops working at its expiry.
- [ ] In TEST only, create an attachment with an expiry time in the past and verify the scheduled cleanup deletes both the Storage object and metadata.
- [ ] Confirm the scheduler is registered exactly once and runs every 15 minutes.
- [ ] Confirm expired messages remain visible with an Anexo expirado após 72 horas placeholder.
- [ ] Confirm replies, reactions, unread markers, realtime updates, and message deletion still work for attachment messages.

## Release gate

Do not merge or deploy production until all TEST integration checks are complete, the request-size transport is confirmed, and the migration/cleanup job has been observed working in TEST.
