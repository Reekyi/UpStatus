-- Public Realtime events are unauthenticated hints, never authoritative state.
-- Clients must poll the custom-session-authenticated backend for canonical data.
-- Deploy only together with the matching normal and Team Lite client candidates.
CREATE OR REPLACE FUNCTION public.upstatus_broadcast_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $function$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object('op', TG_OP),
    'user_status',
    'upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0',
    false
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.upstatus_broadcast_remote_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $function$
DECLARE
  old_commands jsonb := '{}'::jsonb;
  old_results jsonb := '{}'::jsonb;
  k text;
  v jsonb;
BEGIN
  IF NEW.state_key <> 'remote-status' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    old_commands := coalesce(OLD.value->'commands', '{}'::jsonb);
    old_results := coalesce(OLD.value->'results', '{}'::jsonb);
  END IF;

  FOR k, v IN
    SELECT key, value FROM jsonb_each(coalesce(NEW.value->'commands', '{}'::jsonb))
  LOOP
    IF (old_commands->k) IS DISTINCT FROM v THEN
      PERFORM realtime.send(
        jsonb_build_object('op', TG_OP),
        'remote_command',
        'upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0',
        false
      );
    END IF;
  END LOOP;

  FOR k, v IN
    SELECT key, value FROM jsonb_each(coalesce(NEW.value->'results', '{}'::jsonb))
  LOOP
    IF (old_results->k) IS DISTINCT FROM v THEN
      PERFORM realtime.send(
        jsonb_build_object('op', TG_OP),
        'remote_result',
        'upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0',
        false
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;
