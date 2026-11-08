# Production server-mediated signaling candidate — 2026-11-08

## GitHub candidate

- PR [#101](https://github.com/Reekyi/UpStatus/pull/101), Draft, stacked on #74.
- Base: `chore/continuity-foundation` at `9c0133e8cf6bd85ac8993888718a408db2f24a3e`.
- Candidate HEAD: `2ef7c3324d2eb5443d31a45bd071d154ebeb4aa7`.
- Exact-head workflow [42513317464](https://github.com/Reekyi/UpStatus/actions/runs/42513317464): SUCCESS. Node v24.22.2; offline source parity and complete Normal Validate passed.
- Initial run [42513272235](https://github.com/Reekyi/UpStatus/actions/runs/42513272235) failed because shallow checkout omitted `origin/team-lite-official`, required by the existing updater test. The new workflow now uses `fetch-depth: 0`; the exact-head rerun passed.

## Candidate changes

- Adds `supabase/functions/upstatus-signal/` with `index.ts`, `body.mjs`, and `legacy-envelope.mjs`.
- Adds explicit `[functions.upstatus-signal] verify_jwt = false` because the endpoint validates the custom UpStatus `x-upstatus-token` itself.
- Adds production migration source `20261108190000_distributed_signaling_rate_limit.sql`.
- Adds `scripts/production-signal-source-parity.test.mjs`, wired into Normal Validate.
- Adds a push-triggered offline workflow with read-only checkout and no Supabase secrets or fixtures.

The production handler is byte-identical to the Normal candidate's isolated handler after replacing only the health service label. Direct read-only comparison against deployed lab `upstatus-signal-test` v32 found exactly one functional candidate change: the HTTP 409 mapping now includes `VOICE_ATTEMPT_ALREADY_ACTIVE`. The `body.mjs` and `legacy-envelope.mjs` sidecars are byte-identical to the lab deployment.

## Rate-limit migration

The new migration creates `public.upstatus_signal_rate_limits`, enables RLS, revokes browser-role privileges, grants required table access only to `service_role`, and defines `consume_upstatus_signal_rate_limit(text,integer,integer)` as SECURITY INVOKER with an empty search_path. Opportunistic cleanup deletes at most 100 stale buckets using `FOR UPDATE SKIP LOCKED`.

The isolated lab catalog confirms:
- RLS enabled on the rate-limit table.
- No table SELECT/INSERT privilege for anon or authenticated.
- No RPC EXECUTE for anon or authenticated.
- Service role has required table INSERT and RPC EXECUTE.

The deployed lab function remains v32; no isolated deployment was performed.

## Production state and blockers

Production project `dlfvkawaiqduhlazsszm` remains ACTIVE_HEALTHY with seven migrations. Read-only catalog checks show that all server-mediated signaling objects are absent: rooms, room members, events, bindings, call attempts, voice-room attempts, rate-limit table, and rate-limit RPC.

The function source and migration are candidates only. The production deploy workflow is not yet wired to deploy `upstatus-signal`. Normal and Team Lite clients still default `signaling_transport_enabled` to false and retain public call/voice/screen fallback paths. **RT-01 remains P0.**

Before any release:
1. Review all schema migrations required by the handler and add a production migration-history preflight.
2. Apply migrations only under separate explicit authorization, then verify the PostgreSQL catalog and effective privileges.
3. Add the function to the production deploy workflow with project/SHA checks and migration preflight.
4. Validate live HTTP auth, room membership, replay/expiry, rate limits, HTTP 409, and cleanup in an isolated environment.
5. Implement coordinated Normal + Team Lite client cutover and rollback; remove public media-signaling fallback only after the authenticated endpoint is ready.
6. Obtain human review and Ricardo's explicit authorization.

No production SQL write, migration, deploy, feature-flag change, secret/role/grant/ACL/policy change, merge, release, or userscript publication occurred in this checkpoint.
