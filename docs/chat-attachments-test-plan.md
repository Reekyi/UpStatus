# Chat attachments: validation plan

Run against an isolated TEST deployment only. Do not apply the migration or deploy the production Edge Function as part of this checklist. Do not create paid infrastructure.

## Automated validation

- Run `node scripts/validate.mjs`.
- Confirm the generated production and TEST userscripts embed their matching source templates.
- Confirm the userscript parses as JavaScript.
- Confirm the server template has the 72-hour TTL, private Storage bucket, signed URLs, metadata, cleanup route, and document endpoint.
- Confirm the migration creates only the private bucket and metadata table. It must not delete rows directly from `storage.objects` or create a scheduled worker.

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

- [ ] Verify a small document uploads and downloads correctly.
- [ ] Verify a file just below the 100 MiB limit succeeds in an isolated environment.
- [ ] Verify a file above the 100 MiB limit fails with a readable error.
- [ ] Verify the direct signed Storage upload endpoint accepts the browser request and reports upload errors clearly.
- [ ] Verify network failures do not leave an orphan object or permanently disable the attachment button.
- [ ] Verify images, video, audio, and existing chat features still work independently of document uploads.

### Privacy and expiry

- [ ] Confirm chat-attachments is private in Supabase Storage.
- [ ] Confirm an unauthenticated public object URL cannot read an attachment.
- [ ] Confirm an authorized chat client receives a signed URL.
- [ ] Confirm the signed URL stops working at its expiry.
- [ ] In TEST only, set an attachment expiry in the past and verify chat API activity removes the object through the Supabase Storage API and removes its metadata.
- [ ] Confirm expired messages remain visible with an “Anexo expirado após 72 horas” placeholder.
- [ ] Confirm replies, reactions, unread markers, realtime updates, and message deletion still work for attachment messages.

## Known limitation under the zero-cost rule

No paid scheduler or separate worker will be created. Signed downloads must become inaccessible at the 72-hour expiry regardless of cleanup timing. Physical deletion is opportunistic and runs during subsequent chat API activity. If guaranteed automatic physical deletion at exactly 72 hours becomes mandatory, investigate an already-available free mechanism before proposing any infrastructure.

## Release gate

Do not merge or deploy production until the available free validations pass, the integration checklist is completed in an isolated TEST environment, and production release is explicitly approved.
