# UpStatus — production signaling dependency map

**Verified:** 2026-11-17T23:32:07.983Z  
**Production project:** `dlfvkawaiqduhlazsszm`  
**Scope:** read-only production catalog and deployed-function inspection; GitHub candidate-source inspection. No SQL writes, migrations, deployments, merges, secret changes, or userscript publication.

## 1. Production readiness snapshot

- Supabase project: `ACTIVE_HEALTHY`, PostgreSQL `17.11.0.002`.
- Active Edge Functions: 38. No deployed `upstatus-signal` function.
- Public schema: 10 tables. Applied migration ledger: seven entries, latest `20261027155438`.
- All seven signaling tables and all seven RPCs listed below are absent from production.
- Therefore the PR #101 function is source-complete enough for static review, but not deployable against the current production schema.

## 2. Candidate handler contract

Candidate branch: `feat/production-authenticated-signaling-runtime-20261108`  
Candidate HEAD: `2ef7c3324d2eb5443d31a45bd071d154ebeb4aa7`  
Function source: `supabase/functions/upstatus-signal/index.ts`  
Source blob: `27729216bc28123317736e5d7d4b5e0ed1cf770f`

Direct database dependencies parsed from the handler:

### Tables

| Table | Purpose inferred from handler |
|---|---|
| `upstatus_signal_rooms` | Room lifecycle and creator/status/expiry |
| `upstatus_signal_room_members` | Membership and invitation state |
| `upstatus_signal_events` | Queued room-scoped signaling events |
| `upstatus_signal_room_bindings` | Binding between logical calls and signaling rooms |
| `upstatus_signal_call_attempts` | Durable call-attempt recovery |
| `upstatus_signal_voice_room_attempts` | Durable voice-room attempt recovery |
| `upstatus_signal_rate_limits` | Distributed per-user read/write counters |

The handler also reads existing `public.users` and `public.upstatus_sessions`.

### RPCs

| RPC | Responsibility |
|---|---|
| `prepare_upstatus_signal_call_room` | Create/recover a logical call room |
| `cancel_upstatus_signal_call_room` | Cancel a logical call attempt |
| `open_upstatus_signal_voice_room` | Open voice-room membership |
| `leave_upstatus_signal_room` | Leave a signaling room |
| `open_upstatus_signal_voice_room_attempt` | Open/recover a durable voice attempt |
| `cancel_upstatus_signal_voice_room_attempt` | Cancel a durable voice attempt |
| `consume_upstatus_signal_rate_limit` | Atomically consume a distributed rate-limit bucket |

The handler uses `x-upstatus-token` and validates the custom session against `upstatus_sessions`; the function config explicitly sets `verify_jwt = false` for this custom-auth design. Do not change that setting without redesigning the auth boundary.

## 3. Migration provenance for direct dependencies

| Migration | Objects created or replaced | Notes |
|---|---|---|
| `20261029205000_server_mediated_signaling.sql` | `upstatus_signal_rooms`, `upstatus_signal_room_members`, `upstatus_signal_events` | Initial room, membership and event schema |
| `20261030120000_signal_room_invitation_consent.sql` | Membership/index/consent evolution | No new table or RPC |
| `20261030150000_signal_membership_legacy_default.sql` | Membership default evolution | No new table or RPC |
| `20261030190000_allow_legacy_signaling_envelopes.sql` | Legacy envelope compatibility | No new table or RPC |
| `20261030192000_signal_room_bindings.sql` | `upstatus_signal_room_bindings` | Logical-call to room binding |
| `20261105190000_open_voice_room_membership.sql` | `open_upstatus_signal_voice_room`, `leave_upstatus_signal_room` | Voice-room membership RPCs |
| `20261106080200_call_room_attempt_recovery.sql` | `upstatus_signal_call_attempts`, `prepare_upstatus_signal_call_room`, `cancel_upstatus_signal_call_room` | Durable call-attempt state |
| `20261106120500_voice_room_attempt_recovery.sql` | `upstatus_signal_voice_room_attempts`, initial open/cancel voice-attempt RPCs | Durable voice-attempt state |
| `20261108010000_voice_attempt_singleton.sql` | Replaces `open_upstatus_signal_voice_room_attempt` | Singleton behavior; not a new object |
| `20261108050751_voice_attempt_account_scoped_lock.sql` | Replaces open/cancel voice-attempt RPCs | Account-scoped locking; review identity stability |
| `20261108190000_distributed_signaling_rate_limit.sql` | `upstatus_signal_rate_limits`, `consume_upstatus_signal_rate_limit` | RLS enabled; browser roles revoked; service_role-only; SECURITY INVOKER with empty search_path |

The last migration is the only new schema migration added by PR #101 itself. The other six tables and six RPCs depend on the base candidate migration chain from PR #74. The migration chain must be replayed and tested as a whole in a clean isolated database; applying only the PR #101 migration is insufficient.

Related non-handler migrations still matter to the cutover: trigger grant hardening, public table-grant revocation, minimal Realtime broadcast payloads, empty search_path for trigger functions, and supporting indexes. They are separate security gates, not substitutes for the signaling schema above.

## 4. PR ancestry and source parity

- Current PR #74 candidate HEAD: `dcaf6a072546eda0089e0cee4018c3047011f600`.
- PR #101 branch base/merge-base: `9c0133e8cf6bd85ac8993888718a408db2f24a3e`.
- PR #101 and current PR #74 are divergent: 10 commits unique to each side.
- Do not merge PR #101 directly. Reconcile the 10 commits from each side on a fresh isolated candidate branch and rerun validation.
- Compared the PR #101 production function source with the current PR #74 `upstatus-signal-test` source: after normalizing only the `/health` service label, the index files are byte-identical. `body.mjs` and `legacy-envelope.mjs` are byte-identical without normalization.
- PR #102 is an open child security follow-up that moves authenticated-source provenance out of payload-controlled fields. Review/reconcile it with the current Normal client branch before any cutover.

This parity is static source comparison, not a live deployment or integration test.

## 5. Deployment workflow gap

- Current `master` production workflow deploys only `upstatus`.
- PR #101's candidate production workflow adds master-ref, SHA and expected-project guards, but still deploys only `upstatus`; it has no `upstatus-signal` deploy step.
- Current `master` also locks the stable release manifest to `3.4.7`.
- PR #101's `docs/RELEASE_CUTOVER_PLAN.md` still states that HTTP 429 has no `Retry-After`, but the current handler returns `Retry-After: 60` and exposes it through CORS. The plan is stale and must be corrected during reconciliation.
- Historical offline workflow runs #42513317464 (PR #101) and #42519210669 (PR #102) completed successfully. They ran offline source/validation checks; they did not deploy, run against production, or validate the full product.

## 6. Required gates before any production cutover

1. Reconcile PR #101 and #102 with the current PR #74 head; preserve the source-parity regression.
2. Replay the complete signaling/security migration chain in a clean, active Full-Product TEST database.
3. Verify every table, RPC signature, owner, RLS state, grant, default ACL and trigger after migration.
4. Run authenticated endpoint tests, rate-limit concurrency/429/Retry-After tests, room/call/voice recovery, and browser WebRTC tests in that environment.
5. Add a separately guarded `upstatus-signal` deployment step and a tested rollback/forward-fix plan. Keep it manual-only and pinned to an approved SHA/project.
6. Cut over Normal and Team Lite together only after both clients and their public discovery fallback behavior are validated.
7. Complete real Tampermonkey, microphone/display permission, reconnect-without-F5 and cross-client tests.
8. Obtain Ricardo's explicit production authorization. No candidate branch, green CI run or source parity result authorizes a production change.

**Current disposition:** keep the transport default-off; production remains unchanged; Full-Product TEST remains a blocker.
