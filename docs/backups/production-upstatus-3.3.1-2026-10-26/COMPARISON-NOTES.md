# UpStatus 3.3.1 production recovery and 3.4.0 comparison

## Verified production snapshot

- Supabase project: `dlfvkawaiqduhlazsszm`
- Edge Function: `upstatus`
- Production userscript version: `3.3.1`
- Supabase deployment version: `459`
- `verify_jwt`: `false`
- Source length: `1,162,103` characters
- Supabase source SHA-256: `12e0237c98957b203e5f0bdb3cd81aebf04916ae419836abd98446faabca390a`
- Exact reconstruction verified from the five ordered parts in this directory: reconstructed length equals source length and full source text matches byte-for-byte at the decoded text level.

To reconstruct the original Edge Function source, concatenate `index.ts.part-01.txt` through `index.ts.part-05.txt` in ascending order with no separator. The source split points preserve the original content.

## Current 3.4.0 branch findings

Branch inspected: `release/3.4.0-chat-composer`.

- Userscript template: 421,175 characters.
- Production embedded userscript: 499,160 characters.
- Backend template: 102,434 characters.
- Production backend: 1,162,103 characters including the embedded userscript.
- The server template is structurally close to production, but the userscript template is not a complete replacement for the production script.
- The current template contains the pending-attachment and pre-send link-preview work, but lacks production capabilities that must be preserved before it can safely replace production:
  - screen-sharing core handlers and UI bindings;
  - speaker-audio mute control in voice rooms;
  - per-sender chat color palette and its render integration;
  - in-message link-card rendering/title hydration;
  - additional chat bubble/timestamp CSS and scroll behavior;
  - production's appended visual patch scripts.
- The production script also has code differences that should remain changed in 3.4.0, such as role-based admin message deletion and the newer pending-composer flow. Do not blindly copy the production script over the 3.4.0 template.

## Deployment safety

- Production Edge Function `upstatus` was not modified.
- The current 3.4.0 branch must not be deployed as a replacement until the missing production features are merged and validated.
- The current test Edge Function inspected separately is version `3.2.6-beta7` (deployment version 238); it was not modified during this recovery.
- Next work: merge production-only behavior into the 3.4.0 template without reverting the pending-attachment/link-preview changes, run repository validation and CI, then deploy only to the test endpoint for manual Sale Smartly validation.
