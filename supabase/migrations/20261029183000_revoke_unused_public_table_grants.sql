-- Defense in depth: these tables are accessed through the authenticated UpStatus Edge Function.
-- They currently have RLS enabled and no policies, but public client roles still have
-- unnecessary table-level grants. Revoke those grants without changing service_role/owner
-- access used by the Edge Function and trigger functions.
DO $$
DECLARE
  tbl regclass;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    to_regclass('public.chat_reads'),
    to_regclass('public.messages'),
    to_regclass('public.reactions'),
    to_regclass('public.status_history'),
    to_regclass('public.upstatus_profiles'),
    to_regclass('public.upstatus_sessions'),
    to_regclass('public.upstatus_state'),
    to_regclass('public.upstatus_typing'),
    to_regclass('public.users')
  ]
  LOOP
    IF tbl IS NOT NULL THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE %s FROM PUBLIC, anon, authenticated',
        tbl
      );
    END IF;
  END LOOP;
END
$$;
