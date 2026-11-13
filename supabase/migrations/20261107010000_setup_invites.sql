alter table public.users
  add column if not exists setup_token_hash text,
  add column if not exists setup_token_expires_at timestamptz,
  add column if not exists setup_token_issued_by text,
  add column if not exists setup_token_issued_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.users'::regclass
      and conname = 'users_setup_token_pair_check'
  ) then
    alter table public.users
      add constraint users_setup_token_pair_check
      check (
        (setup_token_hash is null and setup_token_expires_at is null and setup_token_issued_by is null and setup_token_issued_at is null)
        or
        (setup_token_hash is not null and setup_token_expires_at is not null and setup_token_issued_by is not null and setup_token_issued_at is not null)
      );
  end if;
end
$$;

create unique index if not exists users_setup_token_hash_uidx
  on public.users (setup_token_hash)
  where setup_token_hash is not null;

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
      role = coalesce(u.role, 'implementation_user'),
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

revoke all on function public.consume_upstatus_setup_invite(text, text, text) from public;
revoke all on function public.consume_upstatus_setup_invite(text, text, text) from anon, authenticated;
grant execute on function public.consume_upstatus_setup_invite(text, text, text) to service_role;

comment on column public.users.setup_token_hash is 'SHA-256 hash of a one-time first-access enrollment token; raw tokens are never stored.';
comment on function public.consume_upstatus_setup_invite(text, text, text) is 'Atomically consumes one unexpired first-access invite and sets the initial password; service_role only.';
