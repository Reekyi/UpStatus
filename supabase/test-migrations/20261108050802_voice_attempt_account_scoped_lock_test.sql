DO $test$
DECLARE
  v_open_oid oid := pg_catalog.to_regprocedure('public.open_upstatus_signal_voice_room_attempt(text,text,text,integer)')::oid;
  v_cancel_oid oid := pg_catalog.to_regprocedure('public.cancel_upstatus_signal_voice_room_attempt(text,text,text)')::oid;
  v_room_oid oid := pg_catalog.to_regprocedure('public.open_upstatus_signal_voice_room(text,text,integer)')::oid;
  v_open_def text;
  v_cancel_def text;
  v_room_def text;
  v_open_attempt integer;
  v_open_account integer;
  v_open_scan integer;
  v_open_inner integer;
  v_cancel_attempt integer;
  v_cancel_account integer;
  v_cancel_shared integer;
  v_cancel_row integer;
  v_room_shared integer;
BEGIN
  IF v_open_oid IS NULL OR v_cancel_oid IS NULL OR v_room_oid IS NULL THEN
    RAISE EXCEPTION 'voice attempt or shared-room RPC is missing';
  END IF;
  SELECT pg_catalog.pg_get_functiondef(v_open_oid) INTO v_open_def;
  SELECT pg_catalog.pg_get_functiondef(v_cancel_oid) INTO v_cancel_def;
  SELECT pg_catalog.pg_get_functiondef(v_room_oid) INTO v_room_def;

  v_open_attempt := pg_catalog.strpos(v_open_def, 'upstatus-voice-attempt:');
  v_open_account := pg_catalog.strpos(v_open_def, 'upstatus-voice-account:');
  v_open_scan := pg_catalog.strpos(v_open_def, 'FOR v_existing_attempt IN');
  v_open_inner := pg_catalog.strpos(v_open_def, 'public.open_upstatus_signal_voice_room(');
  IF NOT (v_open_attempt > 0 AND v_open_account > v_open_attempt
      AND v_open_scan > v_open_account AND v_open_inner > v_open_scan) THEN
    RAISE EXCEPTION 'open lock order must be attempt -> account -> singleton scan -> shared-room open';
  END IF;
  IF pg_catalog.strpos(v_open_def, 'upstatus-open-voice:') <> 0 THEN
    RAISE EXCEPTION 'open attempt must not hold the global room lock during the account scan';
  END IF;

  v_cancel_attempt := pg_catalog.strpos(v_cancel_def, 'upstatus-voice-attempt:');
  v_cancel_account := pg_catalog.strpos(v_cancel_def, 'upstatus-voice-account:');
  v_cancel_shared := pg_catalog.strpos(v_cancel_def, 'upstatus-open-voice:');
  v_cancel_row := pg_catalog.strpos(v_cancel_def, 'SELECT a.*');
  IF NOT (v_cancel_attempt > 0 AND v_cancel_account > v_cancel_attempt
      AND v_cancel_shared > v_cancel_account AND v_cancel_row > v_cancel_shared) THEN
    RAISE EXCEPTION 'cancel lock order must be attempt -> account -> shared-room -> attempt row';
  END IF;

  v_room_shared := pg_catalog.strpos(v_room_def, 'upstatus-open-voice:');
  IF v_room_shared <= 0 THEN
    RAISE EXCEPTION 'shared-room open RPC must retain its logical-room advisory lock';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc AS p
    WHERE p.oid IN (v_open_oid, v_cancel_oid)
      AND (p.prosecdef OR NOT COALESCE(p.proconfig, ARRAY[]::text[]) @> ARRAY['search_path=""']::text[])
  ) THEN
    RAISE EXCEPTION 'voice attempt RPCs must remain SECURITY INVOKER with empty search_path';
  END IF;
  IF pg_catalog.has_function_privilege('anon', v_open_oid, 'EXECUTE')
     OR pg_catalog.has_function_privilege('authenticated', v_open_oid, 'EXECUTE')
     OR pg_catalog.has_function_privilege('anon', v_cancel_oid, 'EXECUTE')
     OR pg_catalog.has_function_privilege('authenticated', v_cancel_oid, 'EXECUTE')
     OR NOT pg_catalog.has_function_privilege('service_role', v_open_oid, 'EXECUTE')
     OR NOT pg_catalog.has_function_privilege('service_role', v_cancel_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'voice attempt RPC grants must remain service_role-only';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc AS p,
         LATERAL pg_catalog.aclexplode(p.proacl) AS a
    WHERE p.oid IN (v_open_oid, v_cancel_oid)
      AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'PUBLIC must not execute voice attempt RPCs';
  END IF;
END;
$test$;
