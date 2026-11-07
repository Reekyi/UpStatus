-- ISOLATED TEST ONLY. Intended for bfpjtfqlnypisxljoxkb.
-- Mirrors the production follow-up but also asserts the resulting function contract.
ALTER FUNCTION public.upstatus_broadcast_messages() SET search_path = '';
ALTER FUNCTION public.upstatus_broadcast_remote_state() SET search_path = '';
ALTER FUNCTION public.upstatus_broadcast_users() SET search_path = '';

DO $$
DECLARE
  fn regprocedure;
  v_search_path text;
  v_security_definer boolean;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    to_regprocedure('public.upstatus_broadcast_messages()'),
    to_regprocedure('public.upstatus_broadcast_remote_state()'),
    to_regprocedure('public.upstatus_broadcast_users()')
  ] LOOP
    IF fn IS NULL THEN
      RAISE EXCEPTION 'expected trigger broadcast function is missing';
    END IF;

    SELECT p.prosecdef,
           (
             SELECT replace(split_part(setting, '=', 2), '"', '')
             FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) AS config(setting)
             WHERE setting LIKE 'search_path=%'
             LIMIT 1
           )
      INTO v_security_definer, v_search_path
    FROM pg_proc p
    WHERE p.oid = fn;

    IF v_security_definer IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION 'expected SECURITY DEFINER trigger function: %', fn;
    END IF;
    IF v_search_path IS DISTINCT FROM '' THEN
      RAISE EXCEPTION 'trigger function must have an empty search_path: % (got %)', fn, v_search_path;
    END IF;
    IF has_function_privilege('anon', fn, 'EXECUTE')
       OR has_function_privilege('authenticated', fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'client roles must not directly execute trigger function: %', fn;
    END IF;
    IF NOT has_function_privilege('service_role', fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'service_role execution grant must be preserved: %', fn;
    END IF;
    IF position('realtime.send' IN pg_get_functiondef(fn)) = 0 THEN
      RAISE EXCEPTION 'trigger function must keep schema-qualified realtime.send: %', fn;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger t
      WHERE t.tgfoid = fn AND NOT t.tgisinternal
    ) THEN
      RAISE EXCEPTION 'trigger function must remain attached to a user trigger: %', fn;
    END IF;
  END LOOP;
END
$$;
