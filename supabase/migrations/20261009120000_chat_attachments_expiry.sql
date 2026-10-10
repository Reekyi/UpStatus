-- Private chat attachments with a hard 72-hour access window.
-- Apply in TEST first. This migration intentionally does not change the existing chat-images bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  false,
  104857600,
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

-- No client-facing policy is created. The Edge Function uses the service-role key.
-- Storage objects must be deleted through the Storage API, not by deleting rows
-- directly from storage.objects. Expired URLs are denied immediately by the
-- Edge Function; expired objects are physically removed during subsequent chat API
-- activity by cleanupExpiredChatAttachments(). A scheduled worker is intentionally
-- omitted because this project must not create paid infrastructure.
