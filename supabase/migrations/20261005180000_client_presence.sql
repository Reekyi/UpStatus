-- UpStatus: client presence and userscript version
alter table public.users
  add column if not exists client_version text,
  add column if not exists client_seen_at timestamptz;

create index if not exists idx_users_client_seen_at
  on public.users (client_seen_at);
