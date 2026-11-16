create or replace function public.merge_chat_read_receipts(
  p_user_name text,
  p_messages jsonb,
  p_last_read_at timestamptz default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if p_user_name is null or btrim(p_user_name) = '' then
    raise exception 'p_user_name must not be empty';
  end if;

  if p_messages is null or jsonb_typeof(p_messages) <> 'object' then
    raise exception 'p_messages must be a JSON object';
  end if;

  if exists (
    select 1
    from jsonb_each(p_messages) as item(message_id, readers)
    where jsonb_typeof(item.readers) <> 'array'
  ) then
    raise exception 'each receipt entry must be an array';
  end if;

  insert into public.chat_reads (user_name, last_read_at, messages)
  values (p_user_name, p_last_read_at, p_messages)
  on conflict (user_name) do update
  set
    last_read_at = greatest(public.chat_reads.last_read_at, excluded.last_read_at),
    messages = (
      select coalesce(jsonb_object_agg(entry.message_id, entry.readers), '{}'::jsonb)
      from (
        select
          keys.message_id,
          (
            select coalesce(jsonb_agg(to_jsonb(readers.reader) order by readers.reader), '[]'::jsonb)
            from (
              select distinct item.value #>> '{}' as reader
              from jsonb_array_elements(
                case
                  when jsonb_typeof(public.chat_reads.messages -> keys.message_id) = 'array'
                    then public.chat_reads.messages -> keys.message_id
                  else '[]'::jsonb
                end
                ||
                case
                  when jsonb_typeof(excluded.messages -> keys.message_id) = 'array'
                    then excluded.messages -> keys.message_id
                  else '[]'::jsonb
                end
              ) as item(value)
              where jsonb_typeof(item.value) = 'string'
                and item.value #>> '{}' <> ''
            ) as readers
          ) as readers
        from jsonb_object_keys(
          coalesce(public.chat_reads.messages, '{}'::jsonb)
          || coalesce(excluded.messages, '{}'::jsonb)
        ) as keys(message_id)
      ) as entry
    );
end;
$function$;

revoke all on function public.merge_chat_read_receipts(text, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.merge_chat_read_receipts(text, jsonb, timestamptz) to service_role;

revoke all privileges on table public.upstatus_visual_config from anon, authenticated;
