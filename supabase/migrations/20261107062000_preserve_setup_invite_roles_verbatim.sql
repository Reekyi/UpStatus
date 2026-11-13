create or replace function public.consume_upstatus_setup_invite(
  p_user_name text,
  p_setup_token_hash text,
  p_password_hash text
)
returns table(name text, role text)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  update public.users as u
  set password_hash = p_password_hash,
      role = case when u.role is null or btrim(u.role, E' \t\n\r') = '' then 'implementation_user' else u.role end,
      setup_token_hash = null,
      setup_token_expires_at = null,
      setup_token_issued_by = null,
      setup_token_issued_at = null
  where u.name = p_user_name
    and (u.password_hash is null or u.password_hash = '')
    and u.setup_token_hash = p_setup_token_hash
    and u.setup_token_expires_at > pg_catalog.now()
    and p_user_name is not null
    and p_user_name <> ''
    and p_setup_token_hash ~ '^[0-9a-f]{64}$'
    and p_password_hash is not null
    and p_password_hash <> ''
  returning u.name, u.role;
end;
$$;

revoke all on function public.consume_upstatus_setup_invite(text, text, text) from public, anon, authenticated;
grant execute on function public.consume_upstatus_setup_invite(text, text, text) to service_role;

comment on function public.consume_upstatus_setup_invite(text, text, text) is
  'Atomically consumes one unexpired first-access invite; only blank roles default to implementation_user, while every non-empty role value is preserved verbatim.';
