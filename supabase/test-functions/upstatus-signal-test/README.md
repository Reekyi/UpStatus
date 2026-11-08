# Isolated signaling test function source

This directory versions the source for the isolated Supabase function
`upstatus-signal-test`. It is intentionally stored under
`supabase/test-functions/`, not `supabase/functions/`, so it is not part of
the repository's normal Edge Function source tree.

## Provenance

The starting snapshot was read from the isolated project
`bfpjtfqlnypisxljoxkb`, function version 32, source SHA
`f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`.

The candidate changes only the HTTP mapping for the RPC result
`VOICE_ATTEMPT_ALREADY_ACTIVE`, returning HTTP 409 consistently with
`VOICE_ATTEMPT_CONFLICT` and `ROOM_FULL`. Existing 400/404/410/500 and
201/200 response contracts are preserved.

## Safety

- No credentials or secret values are stored here.
- This directory is not referenced by the production deploy workflow.
- Candidate CI runs only the offline response-contract test; it does not deploy
  this function or call Supabase.
- Do not copy this source into `supabase/functions/` or deploy it to any
  project without a separate reviewed change and explicit authorization.
- The currently deployed isolated helper remains version 32 until a separately
  authorized isolated deployment occurs.
