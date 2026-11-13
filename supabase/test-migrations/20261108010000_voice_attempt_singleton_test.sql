DO $test$
DECLARE
  v_function oid := pg_catalog.to_regprocedure('public.open_upstatus_signal_voice_room_attempt(text,text,text,integer)')::oid;
  v_security_definer boolean;
  v_config text[];
  v_definition text;
BEGIN
  IF v_function IS NULL THEN RAISE EXCEPTION 'voice attempt singleton RPC is missing'; END IF;
  SELECT p.prosecdef, p.proconfig, pg_catalog.pg_get_functiondef(p.oid)
    INTO v_security_definer, v_config, v_definition
  FROM pg_catalog.pg_proc AS p WHERE p.oid = v_function;
  IF v_security_definer THEN RAISE EXCEPTION 'voice attempt singleton RPC must remain SECURITY INVOKER'; END IF;
  IF NOT COALESCE(v_config, ARRAY[]::text[]) @> ARRAY['search_path=""']::text[] THEN
    RAISE EXCEPTION 'voice attempt singleton RPC must pin an empty search_path';
  END IF;
  IF pg_catalog.strpos(v_definition, 'VOICE_ATTEMPT_ALREADY_ACTIVE') = 0 THEN
    RAISE EXCEPTION 'voice attempt singleton conflict guard is missing';
  END IF;
  IF pg_catalog.strpos(v_definition, 'FOR UPDATE') = 0 THEN
    RAISE EXCEPTION 'voice attempt singleton guard must lock active attempts';
  END IF;
  IF pg_catalog.has_function_privilege('anon', v_function, 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not execute the voice attempt singleton RPC';
  END IF;
  IF pg_catalog.has_function_privilege('authenticated', v_function, 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must not execute the voice attempt singleton RPC';
  END IF;
  IF NOT pg_catalog.has_function_privilege('service_role', v_function, 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role must execute the voice attempt singleton RPC';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS p, LATERAL pg_catalog.aclexplode(p.proacl) AS a
    WHERE p.oid = v_function AND a.grantee = 0 AND a.privilege_type = 'EXECUTE') THEN
    RAISE EXCEPTION 'PUBLIC must not execute the voice attempt singleton RPC';
  END IF;
END;
$test$;
