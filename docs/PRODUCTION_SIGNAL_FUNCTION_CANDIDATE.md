# Production server-mediated signaling candidate

This directory contains the candidate production Edge Function `upstatus-signal`. It is a separate reviewed source, not a deployment.

## Provenance and parity

The handler is derived from the reviewed Normal candidate's isolated `upstatus-signal-test` source. The only handler-level change is the health response service label (`upstatus-signal-test` → `upstatus-signal`). The bounded JSON parser and legacy-envelope allowlist are copied byte-for-byte. An offline regression enforces this relationship.

The function authenticates every non-health request through the custom `x-upstatus-token` session hash, derives sender identity from `upstatus_sessions` and `users`, checks active room membership, strips caller-supplied identity/recipient claims from nested payloads, and applies the distributed rate-limit RPC. It uses a service-role client only inside the Edge Function.

## Required schema

Before deployment, the following production migrations must be applied and verified in PostgreSQL, not merely present in Git:

- `20261029205000_server_mediated_signaling.sql`
- `20261030120000_signal_room_invitation_consent.sql`
- `20261030150000_signal_membership_legacy_default.sql`
- `20261030190000_allow_legacy_signaling_envelopes.sql`
- `20261030192000_signal_room_bindings.sql`
- `20261103171000_index_signal_room_bindings_created_by.sql`
- `20261105190000_open_voice_room_membership.sql`
- `20261106080200_call_room_attempt_recovery.sql`
- `20261106111000_call_attempt_foreign_key_indexes.sql`
- `20261106120500_voice_room_attempt_recovery.sql`
- `20261108010000_voice_attempt_singleton.sql`
- `20261108050751_voice_attempt_account_scoped_lock.sql`
- `20261108190000_distributed_signaling_rate_limit.sql`

The rate-limit migration creates an RLS-enabled table with no browser-role grants and a SECURITY INVOKER RPC with an empty search path. Cleanup is bounded to 100 stale buckets per opportunistic pass.

## Authentication configuration

`supabase/config.toml` explicitly sets `verify_jwt = false` for this function because the handler validates the UpStatus custom session token itself. Do not remove this setting or rely on the Supabase CLI default.

## Release status and safety

- Candidate only. No production migration or deployment is part of this change.
- The client transport remains opt-in/default-off in this branch; this PR does not close the public Realtime fallback P0.
- Do not point users at the isolated test project.
- Do not deploy until the migration preflight and post-migration catalog checks pass, the production deployment workflow is updated to deploy this function, Normal and Team Lite client cutover/rollback are reviewed, and Ricardo explicitly authorizes the production change.
