-- Database-backed readiness for the server-mediated signaling runtime.
-- Liveness remains a process-only /health check; /ready is green only when the
-- complete schema, service_role grants, and every RPC used by the handler exist.
CREATE OR REPLACE FUNCTION public.upstatus_signal_readiness()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
WITH required_tables(table_name, privileges) AS (
  VALUES
    ('public.upstatus_sessions', ARRAY['SELECT']::text[]),
    ('public.users', ARRAY['SELECT']::text[]),
    ('public.upstatus_signal_rooms', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']::text[]),
    ('public.upstatus_signal_room_members', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']::text[]),
    ('public.upstatus_signal_room_bindings', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']::text[]),
    ('public.upstatus_signal_events', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']::text[]),
    ('public.upstatus_signal_rate_limits', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']::text[]),
    ('public.upstatus_signal_call_attempts', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']::text[]),
    ('public.upstatus_signal_voice_room_attempts', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']::text[]),
    ('public.upstatus_signal_event_idempotency', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']::text[])
),
resolved_tables AS (
  SELECT table_name, pg_catalog.to_regclass(table_name) AS relation_oid, privileges
  FROM required_tables
),
missing_tables AS (
  SELECT 'table:' || r.table_name AS dependency
  FROM resolved_tables AS r
  WHERE r.relation_oid IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM pg_catalog.pg_class AS c
       WHERE c.oid = r.relation_oid
         AND c.relkind IN ('r', 'p')
         AND c.relrowsecurity
     )
),
missing_table_privileges AS (
  SELECT 'privilege:' || r.table_name || ':' || p.privilege AS dependency
  FROM resolved_tables AS r
  CROSS JOIN LATERAL pg_catalog.unnest(r.privileges) AS p(privilege)
  WHERE r.relation_oid IS NOT NULL
    AND NOT pg_catalog.has_table_privilege('service_role', r.table_name, p.privilege)
),
missing_schema_privileges AS (
  SELECT 'schema:public:USAGE' AS dependency
  WHERE NOT pg_catalog.has_schema_privilege('service_role', 'public', 'USAGE')
),
required_columns(table_name, column_name) AS (
  VALUES
    ('public.upstatus_sessions', 'token_hash'),
    ('public.upstatus_sessions', 'user_name'),
    ('public.upstatus_sessions', 'expires_at'),
    ('public.users', 'name'),
    ('public.upstatus_signal_rooms', 'room_id'),
    ('public.upstatus_signal_rooms', 'created_by'),
    ('public.upstatus_signal_rooms', 'status'),
    ('public.upstatus_signal_rooms', 'created_at'),
    ('public.upstatus_signal_rooms', 'expires_at'),
    ('public.upstatus_signal_room_members', 'room_id'),
    ('public.upstatus_signal_room_members', 'user_name'),
    ('public.upstatus_signal_room_members', 'status'),
    ('public.upstatus_signal_room_members', 'joined_at'),
    ('public.upstatus_signal_room_bindings', 'room_id'),
    ('public.upstatus_signal_room_bindings', 'binding_type'),
    ('public.upstatus_signal_room_bindings', 'logical_id'),
    ('public.upstatus_signal_events', 'event_id'),
    ('public.upstatus_signal_events', 'room_id'),
    ('public.upstatus_signal_events', 'sender'),
    ('public.upstatus_signal_events', 'recipient'),
    ('public.upstatus_signal_events', 'event_type'),
    ('public.upstatus_signal_events', 'payload'),
    ('public.upstatus_signal_events', 'created_at'),
    ('public.upstatus_signal_events', 'expires_at'),
    ('public.upstatus_signal_rate_limits', 'bucket_key'),
    ('public.upstatus_signal_rate_limits', 'window_started_at'),
    ('public.upstatus_signal_rate_limits', 'hit_count'),
    ('public.upstatus_signal_rate_limits', 'updated_at'),
    ('public.upstatus_signal_call_attempts', 'call_id'),
    ('public.upstatus_signal_call_attempts', 'created_by'),
    ('public.upstatus_signal_call_attempts', 'recipient'),
    ('public.upstatus_signal_call_attempts', 'room_id'),
    ('public.upstatus_signal_call_attempts', 'status'),
    ('public.upstatus_signal_call_attempts', 'created_at'),
    ('public.upstatus_signal_call_attempts', 'expires_at'),
    ('public.upstatus_signal_voice_room_attempts', 'attempt_id'),
    ('public.upstatus_signal_voice_room_attempts', 'logical_id'),
    ('public.upstatus_signal_voice_room_attempts', 'created_by'),
    ('public.upstatus_signal_voice_room_attempts', 'room_id'),
    ('public.upstatus_signal_voice_room_attempts', 'status'),
    ('public.upstatus_signal_voice_room_attempts', 'created_at'),
    ('public.upstatus_signal_voice_room_attempts', 'expires_at'),
    ('public.upstatus_signal_event_idempotency', 'room_id'),
    ('public.upstatus_signal_event_idempotency', 'sender'),
    ('public.upstatus_signal_event_idempotency', 'idempotency_key'),
    ('public.upstatus_signal_event_idempotency', 'request_hash'),
    ('public.upstatus_signal_event_idempotency', 'attempted'),
    ('public.upstatus_signal_event_idempotency', 'delivered'),
    ('public.upstatus_signal_event_idempotency', 'created_at')
),
missing_columns AS (
  SELECT 'column:' || r.table_name || '.' || r.column_name AS dependency
  FROM required_columns AS r
  LEFT JOIN pg_catalog.pg_class AS c
    ON c.oid = pg_catalog.to_regclass(r.table_name)
  LEFT JOIN pg_catalog.pg_attribute AS a
    ON a.attrelid = c.oid
   AND a.attname = r.column_name
   AND a.attnum > 0
   AND NOT a.attisdropped
  WHERE c.oid IS NULL OR a.attnum IS NULL
),
required_routines(signature) AS (
  VALUES
    ('public.consume_upstatus_signal_rate_limit(text,integer,integer)'),
    ('public.prepare_upstatus_signal_call_room(text,text,text)'),
    ('public.cancel_upstatus_signal_call_room(text,text)'),
    ('public.open_upstatus_signal_voice_room_attempt(text,text,text,integer)'),
    ('public.open_upstatus_signal_voice_room(text,text,integer)'),
    ('public.cancel_upstatus_signal_voice_room_attempt(text,text,text)'),
    ('public.invite_upstatus_signal_room_member(text,text,text)'),
    ('public.accept_upstatus_signal_room_invitation(text,text)'),
    ('public.leave_upstatus_signal_room(text,text)'),
    ('public.enqueue_upstatus_signal_events(text,text,text[],text,jsonb,timestamp with time zone,text,text,boolean)')
),
resolved_routines AS (
  SELECT signature, pg_catalog.to_regprocedure(signature) AS routine_oid
  FROM required_routines
),
routine_properties AS (
  SELECT r.signature, r.routine_oid, p.prosecdef, p.provolatile, p.proconfig
  FROM resolved_routines AS r
  LEFT JOIN pg_catalog.pg_proc AS p ON p.oid = r.routine_oid
),
missing_routines AS (
  SELECT 'routine:' || r.signature AS dependency
  FROM routine_properties AS r
  WHERE r.routine_oid IS NULL
  UNION ALL
  SELECT 'execute:' || r.signature AS dependency
  FROM routine_properties AS r
  WHERE r.routine_oid IS NOT NULL
    AND NOT pg_catalog.has_function_privilege('service_role', r.signature, 'EXECUTE')
  UNION ALL
  SELECT 'security-definer:' || r.signature AS dependency
  FROM routine_properties AS r
  WHERE r.routine_oid IS NOT NULL AND r.prosecdef
  UNION ALL
  SELECT 'volatility:' || r.signature AS dependency
  FROM routine_properties AS r
  WHERE r.routine_oid IS NOT NULL AND r.provolatile <> 'v'
  UNION ALL
  SELECT 'search_path:' || r.signature AS dependency
  FROM routine_properties AS r
  WHERE r.routine_oid IS NOT NULL
    AND NOT (COALESCE(r.proconfig, ARRAY[]::text[]) @> ARRAY['search_path=""'])
  UNION ALL
  SELECT 'client-execute:' || r.signature AS dependency
  FROM routine_properties AS r
  WHERE r.routine_oid IS NOT NULL
    AND (
      pg_catalog.has_function_privilege('anon', r.signature, 'EXECUTE')
      OR pg_catalog.has_function_privilege('authenticated', r.signature, 'EXECUTE')
    )
),

required_constraints(table_name, constraint_type, columns, referenced_table, referenced_columns, delete_action) AS (
  VALUES
    ('public.upstatus_sessions', 'p', ARRAY['token_hash']::text[], NULL::text[], NULL::text[], NULL::text[]),
    ('public.users', 'u', ARRAY['name']::text[], NULL::text[], NULL::text[], NULL::text[]),
    ('public.upstatus_signal_rooms', 'p', ARRAY['room_id']::text[], NULL::text[], NULL::text[], NULL::text[]),
    ('public.upstatus_signal_rooms', 'f', ARRAY['created_by']::text[], 'public.users', ARRAY['name']::text[], 'c'),
    ('public.upstatus_signal_room_members', 'p', ARRAY['room_id','user_name']::text[], NULL::text[], NULL::text[], NULL::text[]),
    ('public.upstatus_signal_room_members', 'f', ARRAY['room_id']::text[], 'public.upstatus_signal_rooms', ARRAY['room_id']::text[], 'c'),
    ('public.upstatus_signal_room_members', 'f', ARRAY['user_name']::text[], 'public.users', ARRAY['name']::text[], 'c'),
    ('public.upstatus_signal_room_bindings', 'p', ARRAY['binding_type','logical_id']::text[], NULL::text[], NULL::text[], NULL::text[]),
    ('public.upstatus_signal_room_bindings', 'f', ARRAY['room_id']::text[], 'public.upstatus_signal_rooms', ARRAY['room_id']::text[], 'c'),
    ('public.upstatus_signal_room_bindings', 'f', ARRAY['created_by']::text[], 'public.users', ARRAY['name']::text[], 'c'),
    ('public.upstatus_signal_events', 'p', ARRAY['event_id']::text[], NULL::text[], NULL::text[], NULL::text[]),
    ('public.upstatus_signal_events', 'f', ARRAY['room_id']::text[], 'public.upstatus_signal_rooms', ARRAY['room_id']::text[], 'c'),
    ('public.upstatus_signal_events', 'f', ARRAY['sender']::text[], 'public.users', ARRAY['name']::text[], 'c'),
    ('public.upstatus_signal_events', 'f', ARRAY['recipient']::text[], 'public.users', ARRAY['name']::text[], 'c'),
    ('public.upstatus_signal_rate_limits', 'p', ARRAY['bucket_key']::text[], NULL::text[], NULL::text[], NULL::text[]),
    ('public.upstatus_signal_call_attempts', 'p', ARRAY['call_id']::text[], NULL::text[], NULL::text[], NULL::text[]),
    ('public.upstatus_signal_call_attempts', 'f', ARRAY['created_by']::text[], 'public.users', ARRAY['name']::text[], 'c'),
    ('public.upstatus_signal_call_attempts', 'f', ARRAY['recipient']::text[], 'public.users', ARRAY['name']::text[], 'c'),
    ('public.upstatus_signal_call_attempts', 'f', ARRAY['room_id']::text[], 'public.upstatus_signal_rooms', ARRAY['room_id']::text[], 'n'),
    ('public.upstatus_signal_voice_room_attempts', 'p', ARRAY['attempt_id']::text[], NULL::text[], NULL::text[], NULL::text[]),
    ('public.upstatus_signal_voice_room_attempts', 'f', ARRAY['created_by']::text[], 'public.users', ARRAY['name']::text[], 'c'),
    ('public.upstatus_signal_voice_room_attempts', 'f', ARRAY['room_id']::text[], 'public.upstatus_signal_rooms', ARRAY['room_id']::text[], 'n'),
    ('public.upstatus_signal_event_idempotency', 'p', ARRAY['room_id','sender','idempotency_key']::text[], NULL::text[], NULL::text[], NULL::text[]),
    ('public.upstatus_signal_event_idempotency', 'f', ARRAY['room_id']::text[], 'public.upstatus_signal_rooms', ARRAY['room_id']::text[], 'c'),
    ('public.upstatus_signal_event_idempotency', 'f', ARRAY['sender']::text[], 'public.users', ARRAY['name']::text[], 'c')
),
constraint_shapes AS (
  SELECT
    c.conrelid,
    c.contype::text AS constraint_type,
    c.confrelid,
    c.confdeltype::text AS delete_action,
    c.convalidated,
    ARRAY(
      SELECT a.attname::text
      FROM pg_catalog.unnest(c.conkey) WITH ORDINALITY AS key(attnum, ordinality)
      JOIN pg_catalog.pg_attribute AS a
        ON a.attrelid = c.conrelid AND a.attnum = key.attnum
      ORDER BY key.ordinality
    ) AS columns,
    CASE WHEN c.contype = 'f' THEN ARRAY(
      SELECT a.attname::text
      FROM pg_catalog.unnest(c.confkey) WITH ORDINALITY AS key(attnum, ordinality)
      JOIN pg_catalog.pg_attribute AS a
        ON a.attrelid = c.confrelid AND a.attnum = key.attnum
      ORDER BY key.ordinality
    ) ELSE NULL::text[] END AS referenced_columns
  FROM pg_catalog.pg_constraint AS c
  WHERE c.contype IN ('p','u','f')
),
missing_constraints AS (
  SELECT
    'constraint:' || r.table_name || ':' || r.constraint_type || ':' ||
    pg_catalog.array_to_string(r.columns, ',') AS dependency
  FROM required_constraints AS r
  WHERE NOT EXISTS (
    SELECT 1
    FROM constraint_shapes AS c
    WHERE c.conrelid = pg_catalog.to_regclass(r.table_name)
      AND c.constraint_type = r.constraint_type
      AND c.columns = r.columns
      AND c.convalidated
      AND (
        r.constraint_type <> 'f'
        OR (
          c.confrelid = pg_catalog.to_regclass(r.referenced_table)
          AND c.referenced_columns = r.referenced_columns
          AND c.delete_action = r.delete_action
        )
      )
  )
),
required_indexes(index_name, table_name, index_definition) AS (
  VALUES
    ('upstatus_signal_events_recipient_expiry_idx', 'public.upstatus_signal_events',
      'CREATE INDEX upstatus_signal_events_recipient_expiry_idx ON public.upstatus_signal_events USING btree (recipient, expires_at, event_id)'),
    ('upstatus_signal_events_room_idx', 'public.upstatus_signal_events',
      'CREATE INDEX upstatus_signal_events_room_idx ON public.upstatus_signal_events USING btree (room_id, event_id)'),
    ('idx_upstatus_signal_room_members_status', 'public.upstatus_signal_room_members',
      'CREATE INDEX idx_upstatus_signal_room_members_status ON public.upstatus_signal_room_members USING btree (room_id, user_name, status)'),
    ('upstatus_signal_room_members_user_idx', 'public.upstatus_signal_room_members',
      'CREATE INDEX upstatus_signal_room_members_user_idx ON public.upstatus_signal_room_members USING btree (user_name)'),
    ('upstatus_signal_room_bindings_room_idx', 'public.upstatus_signal_room_bindings',
      'CREATE INDEX upstatus_signal_room_bindings_room_idx ON public.upstatus_signal_room_bindings USING btree (room_id)'),
    ('upstatus_signal_rate_limits_updated_at_idx', 'public.upstatus_signal_rate_limits',
      'CREATE INDEX upstatus_signal_rate_limits_updated_at_idx ON public.upstatus_signal_rate_limits USING btree (updated_at)'),
    ('upstatus_signal_call_attempts_expiry_idx', 'public.upstatus_signal_call_attempts',
      'CREATE INDEX upstatus_signal_call_attempts_expiry_idx ON public.upstatus_signal_call_attempts USING btree (expires_at)'),
    ('upstatus_signal_voice_room_attempts_expiry_idx', 'public.upstatus_signal_voice_room_attempts',
      'CREATE INDEX upstatus_signal_voice_room_attempts_expiry_idx ON public.upstatus_signal_voice_room_attempts USING btree (expires_at)')
),
missing_indexes AS (
  SELECT 'index:' || r.index_name AS dependency
  FROM required_indexes AS r
  LEFT JOIN pg_catalog.pg_class AS idx
    ON idx.oid = pg_catalog.to_regclass('public.' || r.index_name)
  LEFT JOIN pg_catalog.pg_index AS i
    ON i.indexrelid = idx.oid
  WHERE idx.oid IS NULL
     OR i.indrelid IS DISTINCT FROM pg_catalog.to_regclass(r.table_name)
     OR i.indisvalid IS DISTINCT FROM TRUE
     OR i.indisready IS DISTINCT FROM TRUE
     OR i.indislive IS DISTINCT FROM TRUE
     OR pg_catalog.pg_get_indexdef(i.indexrelid) IS DISTINCT FROM r.index_definition
),
missing AS (
  SELECT dependency FROM missing_tables
  UNION ALL SELECT dependency FROM missing_table_privileges
  UNION ALL SELECT dependency FROM missing_schema_privileges
  UNION ALL SELECT dependency FROM missing_columns
  UNION ALL SELECT dependency FROM missing_routines
  UNION ALL SELECT dependency FROM missing_constraints
  UNION ALL SELECT dependency FROM missing_indexes
)
SELECT pg_catalog.jsonb_build_object(
  'ready', NOT EXISTS (SELECT 1 FROM missing),
  'schemaVersion', 'signal-v2',
  'missing', COALESCE(
    (SELECT pg_catalog.jsonb_agg(dependency ORDER BY dependency) FROM missing),
    '[]'::jsonb
  )
);
$function$;

REVOKE ALL ON FUNCTION public.upstatus_signal_readiness() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upstatus_signal_readiness() TO service_role;

COMMENT ON FUNCTION public.upstatus_signal_readiness() IS
  'Read-only database readiness probe for the server-mediated signaling handler; reports schema, service_role privilege, column, constraint, index, and RPC dependencies.';
