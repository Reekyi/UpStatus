-- Public Realtime is an untrusted notification channel.
-- Chat clients must refetch canonical rows through the authenticated UpStatus API.
-- Never publish message bodies, attachment paths, sender metadata, or deleted row contents.
-- Deploy only together with a client build that treats db_change as a refresh hint.
CREATE OR REPLACE FUNCTION public.upstatus_broadcast_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object('op', TG_OP),
    'db_change',
    'upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0',
    false
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;
