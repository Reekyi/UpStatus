-- Isolated-only catalog and live-readiness contract for signaling readiness v2.
-- Apply only after the paired production candidate migration on the allowlisted lab.
DO $test$
DECLARE
  v_rpc oid := pg_catalog.to_regprocedure('public.upstatus_signal_readiness()');
  v_prosecdef boolean;
  v_provolatile "char";
  v_proconfig text[];
  v_result jsonb;
  v_public_execute boolean;
BEGIN
  IF v_rpc IS NULL THEN
    RAISE EXCEPTION 'upstatus_signal_readiness() is missing';
  END IF;

  SELECT p.prosecdef, p.provolatile, p.proconfig
    INTO v_prosecdef, v_provolatile, v_proconfig
  FROM pg_catalog.pg_proc AS p
  WHERE p.oid = v_rpc;

  IF v_prosecdef OR v_provolatile <> 's'
     OR NOT (COALESCE(v_proconfig, ARRAY[]::text[]) @> ARRAY['search_path=""']) THEN
    RAISE EXCEPTION 'readiness RPC must be STABLE SECURITY INVOKER with empty search_path';
  END IF;

  IF NOT pg_catalog.has_schema_privilege('service_role', 'public', 'USAGE') THEN
    RAISE EXCEPTION 'service_role must have USAGE on the public schema';
  END IF;

  IF pg_catalog.has_function_privilege('anon', v_rpc, 'EXECUTE')
     OR pg_catalog.has_function_privilege('authenticated', v_rpc, 'EXECUTE')
     OR NOT pg_catalog.has_function_privilege('service_role', v_rpc, 'EXECUTE') THEN
    RAISE EXCEPTION 'readiness RPC must be executable only by service_role';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS p,
         LATERAL pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) AS acl
    WHERE p.oid = v_rpc
      AND acl.grantee = 0
      AND acl.privilege_type = 'EXECUTE'
  ) INTO v_public_execute;
  IF v_public_execute THEN
    RAISE EXCEPTION 'PUBLIC must not execute the readiness RPC';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint AS c
    WHERE c.conrelid = pg_catalog.to_regclass('public.upstatus_signal_event_idempotency')
      AND c.contype = 'p'
      AND c.convalidated
      AND ARRAY(
        SELECT a.attname::text
        FROM pg_catalog.unnest(c.conkey) WITH ORDINALITY AS key(attnum, ordinality)
        JOIN pg_catalog.pg_attribute AS a
          ON a.attrelid = c.conrelid AND a.attnum = key.attnum
        ORDER BY key.ordinality
      ) = ARRAY['room_id','sender','idempotency_key']::text[]
  ) THEN
    RAISE EXCEPTION 'idempotency ledger must have the room/sender/key primary key';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint AS c
    WHERE c.conrelid = pg_catalog.to_regclass('public.upstatus_signal_event_idempotency')
      AND c.contype = 'f'
      AND c.confrelid = pg_catalog.to_regclass('public.upstatus_signal_rooms')
      AND c.confdeltype = 'c'
      AND ARRAY(
        SELECT a.attname::text
        FROM pg_catalog.unnest(c.conkey) WITH ORDINALITY AS key(attnum, ordinality)
        JOIN pg_catalog.pg_attribute AS a
          ON a.attrelid = c.conrelid AND a.attnum = key.attnum
        ORDER BY key.ordinality
      ) = ARRAY['room_id']::text[]
      AND ARRAY(
        SELECT a.attname::text
        FROM pg_catalog.unnest(c.confkey) WITH ORDINALITY AS key(attnum, ordinality)
        JOIN pg_catalog.pg_attribute AS a
          ON a.attrelid = c.confrelid AND a.attnum = key.attnum
        ORDER BY key.ordinality
      ) = ARRAY['room_id']::text[]
  ) THEN
    RAISE EXCEPTION 'idempotency ledger room foreign key must cascade with room deletion';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_index AS i
    WHERE i.indexrelid = pg_catalog.to_regclass('public.upstatus_signal_events_recipient_expiry_idx')
      AND i.indrelid = pg_catalog.to_regclass('public.upstatus_signal_events')
      AND i.indisvalid AND i.indisready AND i.indislive
      AND pg_catalog.pg_get_indexdef(i.indexrelid) =
        'CREATE INDEX upstatus_signal_events_recipient_expiry_idx ON public.upstatus_signal_events USING btree (recipient, expires_at, event_id)'
  ) THEN
    RAISE EXCEPTION 'event recipient/expiry polling index must exist and be valid';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_index AS i
    WHERE i.indexrelid = pg_catalog.to_regclass('public.upstatus_signal_events_room_idx')
      AND i.indrelid = pg_catalog.to_regclass('public.upstatus_signal_events')
      AND i.indisvalid AND i.indisready AND i.indislive
      AND pg_catalog.pg_get_indexdef(i.indexrelid) =
        'CREATE INDEX upstatus_signal_events_room_idx ON public.upstatus_signal_events USING btree (room_id, event_id)'
  ) THEN
    RAISE EXCEPTION 'event room/ack index must exist and be valid';
  END IF;

  v_result := public.upstatus_signal_readiness();
  IF v_result ->> 'ready' IS DISTINCT FROM 'true'
     OR v_result ->> 'schemaVersion' IS DISTINCT FROM 'signal-v2'
     OR pg_catalog.jsonb_typeof(v_result -> 'missing') IS DISTINCT FROM 'array'
     OR pg_catalog.jsonb_array_length(v_result -> 'missing') <> 0 THEN
    RAISE EXCEPTION 'isolated signaling database is not ready: %', v_result -> 'missing';
  END IF;
END;
$test$;
