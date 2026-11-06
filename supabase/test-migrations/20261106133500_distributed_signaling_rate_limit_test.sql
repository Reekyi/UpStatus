DO $test$
DECLARE
  v_table regclass := pg_catalog.to_regclass('public.upstatus_signal_rate_limits');
  v_function oid;
  v_security_definer boolean;
  v_config text[];
BEGIN
  IF v_table IS NULL THEN
    RAISE EXCEPTION 'distributed signaling rate-limit table is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    WHERE c.oid = v_table AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'rate-limit table must have RLS enabled';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c,
      LATERAL pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))) a
    WHERE c.oid = v_table
      AND (a.grantee = 0 OR a.grantee IN (
        SELECT r.oid FROM pg_catalog.pg_roles r WHERE r.rolname IN ('anon', 'authenticated')
      ))
  ) THEN
    RAISE EXCEPTION 'PUBLIC/anon/authenticated must not have rate-limit table privileges';
  END IF;

  IF NOT pg_catalog.has_table_privilege('service_role', v_table, 'SELECT')
     OR NOT pg_catalog.has_table_privilege('service_role', v_table, 'INSERT')
     OR NOT pg_catalog.has_table_privilege('service_role', v_table, 'UPDATE')
     OR NOT pg_catalog.has_table_privilege('service_role', v_table, 'DELETE') THEN
    RAISE EXCEPTION 'service_role must retain rate-limit table privileges';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_indexes
    WHERE schemaname = 'public' AND tablename = 'upstatus_signal_rate_limits'
      AND indexname = 'upstatus_signal_rate_limits_updated_at_idx'
  ) THEN
    RAISE EXCEPTION 'rate-limit cleanup index is missing';
  END IF;

  SELECT p.oid, p.prosecdef, p.proconfig
    INTO v_function, v_security_definer, v_config
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'consume_upstatus_signal_rate_limit'
    AND pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_bucket_key text, p_limit integer, p_window_seconds integer';

  IF v_function IS NULL THEN
    RAISE EXCEPTION 'rate-limit RPC is missing';
  END IF;
  IF v_security_definer THEN
    RAISE EXCEPTION 'rate-limit RPC must remain SECURITY INVOKER';
  END IF;
  IF NOT ('search_path=' = ANY(COALESCE(v_config, ARRAY[]::text[]))) THEN
    RAISE EXCEPTION 'rate-limit RPC must use an empty search_path';
  END IF;
  IF pg_catalog.has_function_privilege('anon', v_function, 'EXECUTE')
     OR pg_catalog.has_function_privilege('authenticated', v_function, 'EXECUTE')
     OR EXISTS (
       SELECT 1 FROM pg_catalog.pg_proc p,
         LATERAL pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
       WHERE p.oid = v_function AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'PUBLIC/anon/authenticated must not execute the rate-limit RPC';
  END IF;
  IF NOT pg_catalog.has_function_privilege('service_role', v_function, 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role must execute the rate-limit RPC';
  END IF;
END;
$test$;
