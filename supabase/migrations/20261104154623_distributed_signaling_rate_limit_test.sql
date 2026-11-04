create table if not exists public.upstatus_signal_rate_limits (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  hit_count integer not null check (hit_count >= 0),
  updated_at timestamptz not null default clock_timestamp()
);
create index if not exists upstatus_signal_rate_limits_updated_at_idx on public.upstatus_signal_rate_limits (updated_at);
alter table public.upstatus_signal_rate_limits enable row level security;
revoke all privileges on table public.upstatus_signal_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.upstatus_signal_rate_limits to service_role;
create or replace function public.consume_upstatus_signal_rate_limit(p_bucket_key text,p_limit integer,p_window_seconds integer default 60)
returns boolean language plpgsql security invoker set search_path = ''
as $function$
declare v_now timestamptz := clock_timestamp(); v_count integer;
begin
 if p_bucket_key is null or btrim(p_bucket_key) = '' or length(p_bucket_key) > 256 then raise exception 'invalid bucket key'; end if;
 if p_limit is null or p_limit < 1 or p_limit > 10000 then raise exception 'invalid limit'; end if;
 if p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 3600 then raise exception 'invalid window'; end if;
 insert into public.upstatus_signal_rate_limits(bucket_key,window_started_at,hit_count,updated_at)
 values(p_bucket_key,v_now,1,v_now)
 on conflict(bucket_key) do update set
 window_started_at=case when public.upstatus_signal_rate_limits.window_started_at <= v_now-make_interval(secs=>p_window_seconds) then v_now else public.upstatus_signal_rate_limits.window_started_at end,
 hit_count=case when public.upstatus_signal_rate_limits.window_started_at <= v_now-make_interval(secs=>p_window_seconds) then 1 else public.upstatus_signal_rate_limits.hit_count+1 end,
 updated_at=v_now
 returning hit_count into v_count;
 if mod(hashtext(p_bucket_key)::bigint,64)=0 then delete from public.upstatus_signal_rate_limits where updated_at < v_now-interval '1 day'; end if;
 return v_count <= p_limit;
end;
$function$;
revoke all on function public.consume_upstatus_signal_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_upstatus_signal_rate_limit(text,integer,integer) to service_role;
