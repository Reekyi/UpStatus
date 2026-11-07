-- Apply only to the explicitly allowlisted isolated UpStatus TEST project.
DO $$
DECLARE
  v_table oid := pg_catalog.to_regclass('public.upstatus_signal_call_attempts');
  v_prepare oid := pg_catalog.to_regprocedure('public.prepare_upstatus_signal_call_room(text,text,text)');
  v_cancel oid := pg_catalog.to_regprocedure('public.cancel_upstatus_signal_call_room(text,text)');
BEGIN
  IF v_table IS NULL OR v_prepare IS NULL OR v_cancel IS NULL THEN
    RAISE EXCEPTION 'call attempt recovery schema is incomplete';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE oid = v_table AND relrowsecurity) THEN
    RAISE EXCEPTION 'call attempt table must have RLS enabled';
  END IF;

  IF has_table_privilege('anon', v_table, 'SELECT')
     OR has_table_privilege('anon', v_table, 'INSERT')
     OR has_table_privilege('anon', v_table, 'UPDATE')
     OR has_table_privilege('anon', v_table, 'DELETE')
     OR has_table_privilege('authenticated', v_table, 'SELECT')
     OR has_table_privilege('authenticated', v_table, 'INSERT')
     OR has_table_privilege('authenticated', v_table, 'UPDATE')
     OR has_table_privilege('authenticated', v_table, 'DELETE') THEN
    RAISE EXCEPTION 'client roles must not access call attempt records';
  END IF;

  IF has_function_privilege('anon', v_prepare, 'EXECUTE')
     OR has_function_privilege('authenticated', v_prepare, 'EXECUTE')
     OR has_function_privilege('anon', v_cancel, 'EXECUTE')
     OR has_function_privilege('authenticated', v_cancel, 'EXECUTE') THEN
    RAISE EXCEPTION 'call attempt RPCs must not be executable by client roles';
  END IF;

  IF NOT has_function_privilege('service_role', v_prepare, 'EXECUTE')
     OR NOT has_function_privilege('service_role', v_cancel, 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role must execute call attempt RPCs';
  END IF;

  IF (SELECT prosecdef FROM pg_catalog.pg_proc WHERE oid = v_prepare)
     OR (SELECT prosecdef FROM pg_catalog.pg_proc WHERE oid = v_cancel) THEN
    RAISE EXCEPTION 'call attempt RPCs must remain SECURITY INVOKER';
  END IF;

  IF position('pg_advisory_xact_lock' in pg_catalog.pg_get_functiondef(v_prepare)) = 0
     OR position('pg_advisory_xact_lock' in pg_catalog.pg_get_functiondef(v_cancel)) = 0
     OR position('CALL_CANCELLED' in pg_catalog.pg_get_functiondef(v_prepare)) = 0 THEN
    RAISE EXCEPTION 'call attempt RPCs must serialize prepare/cancel and honor tombstones';
  END IF;
END;
$$;
