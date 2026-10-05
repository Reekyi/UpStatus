-- UpStatus cloud persistence
-- Existing rows are preserved.

alter table if exists public.users add column if not exists password_hash text;
alter table if exists public.users add column if not exists role text default 'implementation_user';
alter table if exists public.users add column if not exists status text default 'offline';
alter table if exists public.users add column if not exists reason text default '';
alter table if exists public.users add column if not exists updated_at timestamptz;
alter table if exists public.users add column if not exists sync text default 'not_configured';

alter table if exists public.messages add column if not exists system_type text default '';
alter table if exists public.messages add column if not exists image_url text default '';
alter table if exists public.messages add column if not exists mentions jsonb default '[]'::jsonb;
alter table if exists public.messages add column if not exists reply_to jsonb;
alter table if exists public.messages add column if not exists reactions jsonb default '{}'::jsonb;
alter table if exists public.messages add column if not exists type text default 'text';
alter table if exists public.messages add column if not exists created_at timestamptz default now();

alter table if exists public.chat_reads add column if not exists last_read_at timestamptz;
alter table if exists public.chat_reads add column if not exists messages jsonb default '{}'::jsonb;

alter table if exists public.status_history add column if not exists user_name text;
alter table if exists public.status_history add column if not exists actor text;
alter table if exists public.status_history add column if not exists target text;
alter table if exists public.status_history add column if not exists status text;
alter table if exists public.status_history add column if not exists reason text default '';
alter table if exists public.status_history add column if not exists created_at timestamptz default now();

create table if not exists public.upstatus_sessions (
  token_hash text primary key,
  user_name text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists upstatus_sessions_expiry_idx on public.upstatus_sessions (expires_at);

create table if not exists public.upstatus_state (
  state_key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.upstatus_profiles (
  user_name text primary key,
  avatar_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.upstatus_typing (
  user_name text primary key,
  last_seen_at timestamptz not null default now()
);

create index if not exists messages_created_at_idx on public.messages (created_at desc);
create index if not exists status_history_created_at_idx on public.status_history (created_at desc);

alter table public.upstatus_sessions enable row level security;
alter table public.upstatus_state enable row level security;
alter table public.upstatus_profiles enable row level security;
alter table public.upstatus_typing enable row level security;
