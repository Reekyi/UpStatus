-- UpStatus: realtime for remote queue commands/results
create or replace function public.upstatus_broadcast_remote_state()
returns trigger
language plpgsql
security definer
set search_path to public
as $function$
declare
  old_commands jsonb := '{}'::jsonb;
  old_results jsonb := '{}'::jsonb;
  k text;
  v jsonb;
begin
  if new.state_key <> 'remote-status' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    old_commands := coalesce(old.value->'commands','{}'::jsonb);
    old_results := coalesce(old.value->'results','{}'::jsonb);
  end if;

  for k, v in select key, value from jsonb_each(coalesce(new.value->'commands','{}'::jsonb)) loop
    if (old_commands->k) is distinct from v then
      perform realtime.send(
        jsonb_build_object(
          'command', jsonb_build_object(
            'id', v->>'id',
            'sender', v->>'sender',
            'target', v->>'target',
            'status', v->>'status',
            'reason', coalesce(v->>'reason',''),
            'createdAt', v->>'createdAt'
          )
        ),
        'remote_command',
        'upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0',
        false
      );
    end if;
  end loop;

  for k, v in select key, value from jsonb_each(coalesce(new.value->'results','{}'::jsonb)) loop
    if (old_results->k) is distinct from v then
      perform realtime.send(
        jsonb_build_object(
          'result', jsonb_build_object(
            'commandId', v->>'commandId',
            'sender', v->>'sender',
            'target', v->>'target',
            'status', v->>'status',
            'reason', coalesce(v->>'reason',''),
            'ok', coalesce((v->>'ok')::boolean,false),
            'error', coalesce(v->>'error',''),
            'createdAt', v->>'createdAt'
          )
        ),
        'remote_result',
        'upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0',
        false
      );
    end if;
  end loop;

  return new;
end;
$function$;

drop trigger if exists upstatus_remote_state_broadcast on public.upstatus_state;

create trigger upstatus_remote_state_broadcast
after insert or update of value on public.upstatus_state
for each row
when (new.state_key = 'remote-status')
execute function public.upstatus_broadcast_remote_state();
