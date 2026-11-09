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
    AND NOT pg_catalog.has_table_privilege('service_role', r.relation_oid, p.privilege)
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
missing_routines AS (
  SELECT 'routine:' || r.signature AS dependency
  FROM resolved_routines AS r
  WHERE r.routine_oid IS NULL
  UNION ALL
  SELECT 'execute:' || r.signature AS dependency
  FROM resolved_routines AS r
  WHERE r.routine_oid IS NOT NULL
    AND NOT pg_catalog.has_function_privilege('service_role', r.routine_oid, 'EXECUTE')
),
missing AS (
  SELECT dependency FROM missing_tables
  UNION ALL SELECT dependency FROM missing_table_privileges
  UNION ALL SELECT dependency FROM missing_columns
  UNION ALL SELECT dependency FROM missing_routines
)
SELECT pg_catalog.jsonb_build_object(
  'ready', NOT EXISTS (SELECT 1 FROM missing),
  'schemaVersion', 'signal-v1',
  'missing', COALESCE(
    (SELECT pg_catalog.jsonb_agg(dependency ORDER BY dependency) FROM missing),
    '[]'::jsonb
  )
);
$function$;

REVOKE ALL ON FUNCTION public.upstatus_signal_readiness() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upstatus_signal_readiness() TO service_role;

COMMENT ON FUNCTION public.upstatus_signal_readiness() IS
  'Read-only database readiness probe for the server-mediated signaling handler; reports schema, service_role privilege, column, and RPC dependencies.';
