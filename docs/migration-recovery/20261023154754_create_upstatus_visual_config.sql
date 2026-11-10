create table if not exists public.upstatus_visual_config (
  id text primary key check (id = 'published'),
  version bigint not null default 1,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.upstatus_visual_config enable row level security;
revoke all on table public.upstatus_visual_config from anon, authenticated;
insert into public.upstatus_visual_config (id, version, config)
values ('published', 1, '{"themes":{"light":{},"dark":{}}}'::jsonb)
on conflict (id) do nothing;