-- Deduplicate authenticated signaling sends for the lifetime of a room.
-- Rows intentionally outlive the short event TTL; room deletion cascades the replay ledger.
CREATE TABLE IF NOT EXISTS public.upstatus_signal_event_idempotency (
  room_id text NOT NULL,
  sender text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  attempted integer NOT NULL DEFAULT 0,
  delivered integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT upstatus_signal_event_idempotency_pkey PRIMARY KEY (room_id, sender, idempotency_key),
  CONSTRAINT upstatus_signal_event_idempotency_room_fkey
    FOREIGN KEY (room_id) REFERENCES public.upstatus_signal_rooms(room_id) ON DELETE CASCADE,
  CONSTRAINT upstatus_signal_event_idempotency_sender_fkey
    FOREIGN KEY (sender) REFERENCES public.users(name) ON DELETE CASCADE,
  CONSTRAINT upstatus_signal_event_idempotency_key_check
    CHECK (idempotency_key ~ '^[0-9a-f]{32}$'),
  CONSTRAINT upstatus_signal_event_idempotency_hash_check
    CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT upstatus_signal_event_idempotency_counts_check
    CHECK (attempted >= 0 AND delivered >= 0 AND delivered <= attempted)
);

ALTER TABLE public.upstatus_signal_event_idempotency ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.upstatus_signal_event_idempotency FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.upstatus_signal_event_idempotency TO service_role;

COMMENT ON TABLE public.upstatus_signal_event_idempotency IS
  'Server-only replay ledger. Keys remain until the room expires/deletes, even after queued events are acknowledged or expire.';

CREATE OR REPLACE FUNCTION public.enqueue_upstatus_signal_events(
  p_room_id text,
  p_sender text,
  p_recipients text[],
  p_event_type text,
  p_payload jsonb,
  p_expires_at timestamptz,
  p_idempotency_key text,
  p_request_hash text,
  p_allow_join_request boolean
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_room_created_by text;
  v_room_expires_at timestamptz;
  v_recipients text[];
  v_lock_names text[];
  v_member_name text;
  v_locked_count integer := 0;
  v_inserted integer := 0;
  v_attempted integer := 0;
  v_delivered integer := 0;
  v_existing_hash text;
  v_existing_attempted integer;
  v_existing_delivered integer;
BEGIN
  IF p_room_id IS NULL OR pg_catalog.length(p_room_id) NOT BETWEEN 1 AND 128
     OR p_sender IS NULL OR pg_catalog.length(pg_catalog.btrim(p_sender)) NOT BETWEEN 1 AND 80
     OR p_event_type IS NULL OR pg_catalog.length(p_event_type) NOT BETWEEN 1 AND 40
     OR p_payload IS NULL OR pg_catalog.jsonb_typeof(p_payload) <> 'object'
     OR p_expires_at IS NULL
     OR p_idempotency_key IS NULL OR p_idempotency_key !~ '^[0-9a-f]{32}$'
     OR p_request_hash IS NULL OR p_request_hash !~ '^[0-9a-f]{64}$'
     OR p_allow_join_request IS NULL THEN
    RETURN pg_catalog.jsonb_build_object('error', 'INVALID_ARGUMENT');
  END IF;

  SELECT COALESCE(
    pg_catalog.array_agg(DISTINCT requested.user_name ORDER BY requested.user_name),
    ARRAY[]::text[]
  )
  INTO v_recipients
  FROM pg_catalog.unnest(COALESCE(p_recipients, ARRAY[]::text[])) AS requested(user_name)
  WHERE requested.user_name IS NOT NULL;

  IF pg_catalog.cardinality(v_recipients) > 31
     OR p_sender = ANY(v_recipients) THEN
    RETURN pg_catalog.jsonb_build_object('error', 'INVALID_ARGUMENT');
  END IF;

  SELECT r.created_by, r.expires_at
    INTO v_room_created_by, v_room_expires_at
  FROM public.upstatus_signal_rooms AS r
  WHERE r.room_id = p_room_id
    AND r.status = 'active'
    AND r.expires_at > pg_catalog.now()
  FOR SHARE;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('error', 'ROOM_UNAVAILABLE');
  END IF;

  IF p_expires_at <= pg_catalog.now() OR p_expires_at > v_room_expires_at THEN
    RETURN pg_catalog.jsonb_build_object('error', 'INVALID_ARGUMENT');
  END IF;

  IF p_allow_join_request THEN
    IF p_event_type <> 'call_signal'
       OR p_payload ->> 'type' <> 'join_request'
       OR pg_catalog.cardinality(v_recipients) <> 1
       OR v_recipients[1] <> v_room_created_by
       OR NOT EXISTS (
         SELECT 1 FROM public.users AS u WHERE u.name = p_sender
       )
       OR EXISTS (
         SELECT 1 FROM public.upstatus_signal_room_members AS m
         WHERE m.room_id = p_room_id AND m.user_name = p_sender AND m.status = 'accepted'
       )
       OR NOT EXISTS (
         SELECT 1 FROM public.upstatus_signal_room_bindings AS b
         WHERE b.room_id = p_room_id
           AND b.binding_type = 'call'
           AND b.logical_id = p_payload ->> 'callId'
       ) THEN
      RETURN pg_catalog.jsonb_build_object('error', 'ROOM_MEMBER_FORBIDDEN');
    END IF;
    v_lock_names := v_recipients;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.upstatus_signal_room_members AS m
      WHERE m.room_id = p_room_id AND m.user_name = p_sender AND m.status = 'accepted'
    ) THEN
      RETURN pg_catalog.jsonb_build_object('error', 'ROOM_MEMBERSHIP_ENDED');
    END IF;
    SELECT COALESCE(
      pg_catalog.array_agg(DISTINCT requested.user_name ORDER BY requested.user_name),
      ARRAY[]::text[]
    )
    INTO v_lock_names
    FROM pg_catalog.unnest(v_recipients || ARRAY[p_sender]) AS requested(user_name);
  END IF;

  -- Share locks follow the room-first order used by membership mutations.
  -- They allow concurrent signal sends but prevent a leave/close from racing authorization.
  FOR v_member_name IN
    SELECT m.user_name
    FROM public.upstatus_signal_room_members AS m
    WHERE m.room_id = p_room_id
      AND m.user_name = ANY(v_lock_names)
      AND m.status = 'accepted'
    ORDER BY m.user_name
    FOR SHARE
  LOOP
    v_locked_count := v_locked_count + 1;
  END LOOP;

  IF v_locked_count <> pg_catalog.cardinality(v_lock_names) THEN
    IF p_allow_join_request THEN
      RETURN pg_catalog.jsonb_build_object('error', 'ROOM_MEMBER_FORBIDDEN');
    END IF;
    RETURN pg_catalog.jsonb_build_object('error', 'ROOM_MEMBERSHIP_ENDED');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.unnest(v_recipients) AS requested(user_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.upstatus_signal_room_members AS m
      WHERE m.room_id = p_room_id
        AND m.user_name = requested.user_name
        AND m.status = 'accepted'
    )
  ) THEN
    RETURN pg_catalog.jsonb_build_object('error', 'ROOM_MEMBER_FORBIDDEN');
  END IF;

  INSERT INTO public.upstatus_signal_event_idempotency (
    room_id, sender, idempotency_key, request_hash, attempted, delivered
  )
  VALUES (
    p_room_id, p_sender, p_idempotency_key, p_request_hash,
    pg_catalog.cardinality(v_recipients), 0
  )
  ON CONFLICT (room_id, sender, idempotency_key) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    SELECT d.request_hash, d.attempted, d.delivered
      INTO v_existing_hash, v_existing_attempted, v_existing_delivered
    FROM public.upstatus_signal_event_idempotency AS d
    WHERE d.room_id = p_room_id
      AND d.sender = p_sender
      AND d.idempotency_key = p_idempotency_key
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN pg_catalog.jsonb_build_object('error', 'ROOM_UNAVAILABLE');
    END IF;
    IF v_existing_hash <> p_request_hash THEN
      RETURN pg_catalog.jsonb_build_object('error', 'IDEMPOTENCY_KEY_REUSED');
    END IF;

    RETURN pg_catalog.jsonb_build_object(
      'ok', true, 'duplicate', true,
      'attempted', v_existing_attempted, 'delivered', v_existing_delivered
    );
  END IF;

  INSERT INTO public.upstatus_signal_events (
    room_id, sender, recipient, event_type, payload, expires_at
  )
  SELECT p_room_id, p_sender, requested.user_name, p_event_type, p_payload,
         pg_catalog.least(p_expires_at, v_room_expires_at)
  FROM pg_catalog.unnest(v_recipients) AS requested(user_name);

  GET DIAGNOSTICS v_delivered = ROW_COUNT;
  v_attempted := pg_catalog.cardinality(v_recipients);

  UPDATE public.upstatus_signal_event_idempotency AS d
  SET attempted = v_attempted, delivered = v_delivered
  WHERE d.room_id = p_room_id
    AND d.sender = p_sender
    AND d.idempotency_key = p_idempotency_key;

  RETURN pg_catalog.jsonb_build_object(
    'ok', true, 'duplicate', false,
    'attempted', v_attempted, 'delivered', v_delivered
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.enqueue_upstatus_signal_events(
  text, text, text[], text, jsonb, timestamptz, text, text, boolean
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_upstatus_signal_events(
  text, text, text[], text, jsonb, timestamptz, text, text, boolean
) TO service_role;
