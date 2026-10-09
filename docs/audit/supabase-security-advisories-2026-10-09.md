# Supabase security advisor review (2026-10-09)

## Scope and safety

Read-only review of the production project's Supabase security advisor and definitions/ACLs for the three flagged functions. No database schema, grants, data, Edge Functions, or production runtime were changed.

## Findings

### 1. RLS enabled without policies (9 public tables)

The advisor reports RLS enabled and no policies on:

- `public.chat_reads`
- `public.messages`
- `public.reactions`
- `public.status_history`
- `public.upstatus_profiles`
- `public.upstatus_sessions`
- `public.upstatus_state`
- `public.upstatus_typing`
- `public.users`

This blocks ordinary API roles from accessing rows through RLS-protected table access, unless another privileged path is used. UpStatus may intentionally route access through its Edge Function using a service-role credential. Before adding policies, map all client and Edge Function data paths and define the intended authorization model. In particular, do not expose `users`, session material, or message data through broad policies.

### 2. Trigger functions executable by API roles (3 functions)

The advisor reports that `anon` and `authenticated` have EXECUTE grants on:

- `public.upstatus_broadcast_messages()`
- `public.upstatus_broadcast_remote_state()`
- `public.upstatus_broadcast_users()`

All three are `SECURITY DEFINER` PL/pgSQL trigger functions, and all set `search_path` to `public`. Their bodies publish payloads using qualified `realtime.send(...)` calls to the UpStatus Realtime topic. They are designed for trigger invocation; direct RPC calls may fail because PostgreSQL trigger functions require trigger context, so the advisor finding alone does not establish an exploitable path.

Recommended controlled remediation, after verifying trigger attachments and testing Realtime behavior: revoke direct EXECUTE from `PUBLIC`, `anon`, and `authenticated` for these trigger functions while preserving the owner/service privileges needed by the database triggers. Apply this only as a reviewed migration and verify that inserts/updates/deletes still publish the expected events. Do not switch them to `SECURITY INVOKER` blindly, because that may break access to Realtime internals.

## Next verification steps

1. Confirm each function's trigger attachment and the tables/events it covers.
2. Trace which roles the browser client and Edge Function use for each table.
3. Test expected reads/writes and Realtime events in a non-production environment.
4. Implement narrowly scoped grants/policies in a reviewed migration, then re-run the Supabase security advisor.

No production changes were made as part of this review.
