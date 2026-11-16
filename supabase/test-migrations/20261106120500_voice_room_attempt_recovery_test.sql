DO $test$
DECLARE
  v_table regclass := pg_catalog.to_regclass('public.upstatus_signal_voice_room_attempts');
  v_function record;
  v_count integer;
BEGIN
  IF v_table IS NULL THEN
    RAISE EXCEPTION 'voice-room attempt table is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class AS c
    WHERE c.oid = v_table AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'voice-room attempt table must have RLS enabled';
  END IF;

  IF pg_catalog.has_table_privilege('anon', v_table, 'SELECT')
     OR pg_catalog.has_table_privilege('authenticated', v_table, 'SELECT')
     OR pg_catalog.has_table_privilege('anon', v_table, 'INSERT')
     OR pg_catalog.has_table_privilege('authenticated', v_table, 'INSERT') THEN
    RAISE EXCEPTION 'client roles must not access voice-room attempt records';
  END IF;

  IF NOT pg_catalog.has_table_privilege('service_role', v_table, 'SELECT')
     OR NOT pg_catalog.has_table_privilege('service_role', v_table, 'INSERT')
     OR NOT pg_catalog.has_table_privilege('service_role', v_table, 'UPDATE')
     OR NOT pg_catalog.has_table_privilege('service_role', v_table, 'DELETE') THEN
    RAISE EXCEPTION 'service_role must retain required voice-room attempt privileges';
  END IF;

  SELECT count(*) INTO v_count
  FROM pg_catalog.pg_indexes AS i
  WHERE i.schemaname = 'public'
    AND i.tablename = 'upstatus_signal_voice_room_attempts'
    AND i.indexname IN (
      'upstatus_signal_voice_room_attempts_created_by_idx',
      'upstatus_signal_voice_room_attempts_room_id_idx',
      'upstatus_signal_voice_room_attempts_expiry_idx'
    );
  IF v_count <> 3 THEN
    RAISE EXCEPTION 'expected all three voice-room attempt indexes, found %', v_count;
  END IF;

  FOR v_function IN
    SELECT p.oid, p.prosecdef, p.proconfig, p.proname
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'open_upstatus_signal_voice_room_attempt',
        'cancel_upstatus_signal_voice_room_attempt'
      )
  LOOP
    IF v_function.prosecdef THEN
      RAISE EXCEPTION 'voice-room attempt function % must not be SECURITY DEFINER', v_function.proname;
    END IF;
    IF NOT COALESCE(v_function.proconfig, ARRAY[]::text[]) @> ARRAY['search_path=""']::text[] THEN
      RAISE EXCEPTION 'voice-room attempt function % must pin an empty search_path', v_function.proname;
    END IF;
    IF pg_catalog.has_function_privilege('anon', v_function.oid, 'EXECUTE')
       OR pg_catalog.has_function_privilege('authenticated', v_function.oid, 'EXECUTE')
       OR NOT pg_catalog.has_function_privilege('service_role', v_function.oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'voice-room attempt function % has unsafe EXECUTE grants', v_function.proname;
    END IF;
  END LOOP;

  IF (
    SELECT count(*) FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'open_upstatus_signal_voice_room_attempt',
        'cancel_upstatus_signal_voice_room_attempt'
      )
  ) <> 2 THEN
    RAISE EXCEPTION 'both voice-room attempt functions must exist';
  END IF;
END;
$test$;
