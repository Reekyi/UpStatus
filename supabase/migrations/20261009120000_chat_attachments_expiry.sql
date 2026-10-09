-- Private chat attachments with a hard 72-hour retention window.
-- Apply in TEST first. This migration intentionally does not change the existing chat-images bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  false,
  26214400,
  array[
    'image/png','image/jpeg','image/webp','image/gif',
    'video/mp4','video/webm',
    'audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav','audio/x-wav','audio/x-m4a',
    'application/pdf','text/plain','text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.upstatus_chat_attachments (
  object_path text primary key,
  created_by text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  content_type text not null,
  byte_size bigint not null check (byte_size >= 0)
);

create index if not exists upstatus_chat_attachments_expiry_idx
  on public.upstatus_chat_attachments (expires_at);

alter table public.upstatus_chat_attachments enable row level security;

-- The Edge Function uses the service-role key. No client-facing policy is created.
-- The scheduled task deletes the Storage object and its metadata after expiration.
create extension if not exists pg_cron with schema pg_catalog;

do $$
declare existing_job bigint;
begin
  for existing_job in
    select jobid from cron.job where jobname = 'upstatus-chat-attachment-cleanup'
  loop
    perform cron.unschedule(existing_job);
  end loop;
end $$;

select cron.schedule(
  'upstatus-chat-attachment-cleanup',
  '*/15 * * * *',
  $job$
    with expired as (
      select object_path
      from public.upstatus_chat_attachments
      where expires_at <= now()
      limit 500
    ),
    removed as (
      delete from storage.objects o
      using expired e
      where o.bucket_id = 'chat-attachments'
        and o.name = e.object_path
      returning o.name
    )
    delete from public.upstatus_chat_attachments a
    using expired e
    where a.object_path = e.object_path
  $job$
);
