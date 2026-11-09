-- Isolated-only catalog contract for server-side signal event idempotency.
-- Apply only to bfpjtfqlnypisxljoxkb after the paired production candidate migration.
DO $test$
DECLARE
  v_table oid := pg_catalog.to_regclass('public.upstatus_signal_event_idempotency');
  v_rpc oid := pg_catalog.to_regprocedure(
    'public.enqueue_upstatus_signal_events(text,text,text[],text,jsonb,timestamp with time zone,text,text,boolean)'
  );
  v_prosecdef boolean;
  v_provolatile "char";
  v_proconfig text[];
  v_def text;
  v_public_execute boolean;
BEGIN
  IF v_table IS NULL OR v_rpc IS NULL THEN
    RAISE EXCEPTION 'signal event idempotency table or RPC is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class AS c
    WHERE c.oid = v_table AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'signal event idempotency ledger must have RLS enabled';
  END IF;

  IF pg_catalog.has_table_privilege('anon', v_table, 'SELECT')
     OR pg_catalog.has_table_privilege('anon', v_table, 'INSERT')
     OR pg_catalog.has_table_privilege('authenticated', v_table, 'SELECT')
     OR pg_catalog.has_table_privilege('authenticated', v_table, 'INSERT')
     OR NOT pg_catalog.has_table_privilege('service_role', v_table, 'SELECT')
     OR NOT pg_catalog.has_table_privilege('service_role', v_table, 'INSERT') THEN
    RAISE EXCEPTION 'idempotency ledger table grants are not service_role-only';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint AS c
    WHERE c.conrelid = v_table AND c.contype = 'p'
      AND pg_catalog.pg_get_constraintdef(c.oid) LIKE '%(room_id, sender, idempotency_key)%'
  ) THEN
    RAISE EXCEPTION 'idempotency ledger must have a room/sender/key primary key';
  END IF;

  SELECT p.prosecdef, p.provolatile, p.proconfig
    INTO v_prosecdef, v_provolatile, v_proconfig
  FROM pg_catalog.pg_proc AS p
  WHERE p.oid = v_rpc;

  IF v_prosecdef OR v_provolatile <> 'v'
     OR NOT (COALESCE(v_proconfig, ARRAY[]::text[]) @> ARRAY['search_path=""']) THEN
    RAISE EXCEPTION 'enqueue RPC must be VOLATILE SECURITY INVOKER with empty search_path';
  END IF;

  IF pg_catalog.has_function_privilege('anon', v_rpc, 'EXECUTE')
     OR pg_catalog.has_function_privilege('authenticated', v_rpc, 'EXECUTE')
     OR NOT pg_catalog.has_function_privilege('service_role', v_rpc, 'EXECUTE') THEN
    RAISE EXCEPTION 'enqueue RPC grants must be service_role-only';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) AS acl
    WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
  )
  INTO v_public_execute
  FROM pg_catalog.pg_proc AS p
  WHERE p.oid = v_rpc;
  IF v_public_execute THEN
    RAISE EXCEPTION 'PUBLIC must not execute the enqueue RPC';
  END IF;

  v_def := pg_catalog.pg_get_functiondef(v_rpc);
  IF pg_catalog.strpos(v_def, 'ON CONFLICT (room_id, sender, idempotency_key) DO NOTHING') = 0
     OR pg_catalog.strpos(v_def, 'IDEMPOTENCY_KEY_REUSED') = 0
     OR pg_catalog.strpos(v_def, 'FOR SHARE') = 0
     OR pg_catalog.strpos(v_def, 'upstatus_signal_events') = 0
     OR pg_catalog.strpos(v_def, 'p_allow_join_request') = 0 THEN
    RAISE EXCEPTION 'enqueue RPC must atomically deduplicate, reject key reuse, lock membership, and support only the guarded join-request exception';
  END IF;
END;
$test$;
