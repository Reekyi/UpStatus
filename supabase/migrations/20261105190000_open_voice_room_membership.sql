CREATE OR REPLACE FUNCTION public.open_upstatus_signal_voice_room(
  p_logical_id text,
  p_user_name text,
  p_max_members integer DEFAULT 32
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_alias text;
  v_room_ids text[];
  v_room_id text;
  v_expires_at timestamptz;
  v_created_by text;
  v_created boolean := false;
  v_previous_status text;
  v_joined boolean := false;
  v_member_count integer := 0;
  v_rows integer := 0;
  v_binding_type text;
  v_binding_logical_id text;
BEGIN
  IF p_logical_id = 'upstatus-team-room-v1' THEN
    v_alias := 'upstatus-team-lite-room-v1';
  ELSIF p_logical_id = 'upstatus-team-lite-room-v1' THEN
    v_alias := 'upstatus-team-room-v1';
  ELSE
    RETURN pg_catalog.jsonb_build_object('error', 'INVALID_LOGICAL_ID');
  END IF;

  IF p_user_name IS NULL OR pg_catalog.length(pg_catalog.btrim(p_user_name)) NOT BETWEEN 1 AND 80
     OR p_max_members IS NULL OR p_max_members < 2 OR p_max_members > 32 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'INVALID_ARGUMENT');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users AS u WHERE u.name = p_user_name) THEN
    RETURN pg_catalog.jsonb_build_object('error', 'UNKNOWN_USER');
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'upstatus-open-voice:' || LEAST(p_logical_id, v_alias) || ':' || GREATEST(p_logical_id, v_alias),
      0
    )
  );

  SELECT pg_catalog.array_agg(DISTINCT r.room_id ORDER BY r.room_id)
    INTO v_room_ids
  FROM public.upstatus_signal_room_bindings AS b
  JOIN public.upstatus_signal_rooms AS r ON r.room_id = b.room_id
  WHERE b.binding_type IN ('voice', 'screen')
    AND b.logical_id IN (p_logical_id, v_alias)
    AND r.status = 'active'
    AND r.expires_at > pg_catalog.now();

  IF COALESCE(pg_catalog.array_length(v_room_ids, 1), 0) > 1 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'VOICE_ROOM_BINDING_CONFLICT');
  END IF;

  IF COALESCE(pg_catalog.array_length(v_room_ids, 1), 0) = 1 THEN
    v_room_id := v_room_ids[1];
    SELECT r.created_by, r.expires_at
      INTO v_created_by, v_expires_at
    FROM public.upstatus_signal_rooms AS r
    WHERE r.room_id = v_room_id
      AND r.status = 'active'
      AND r.expires_at > pg_catalog.now()
    FOR UPDATE;
    IF NOT FOUND THEN
      v_room_id := NULL;
    END IF;
  END IF;

  IF v_room_id IS NULL THEN
    v_room_id := 'sig_' || pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '');
    v_expires_at := pg_catalog.now() + interval '2 hours';
    v_created_by := p_user_name;
    INSERT INTO public.upstatus_signal_rooms (room_id, created_by, status, expires_at)
    VALUES (v_room_id, p_user_name, 'active', v_expires_at);
    v_created := true;
  END IF;

  SELECT m.status
    INTO v_previous_status
  FROM public.upstatus_signal_room_members AS m
  WHERE m.room_id = v_room_id
    AND m.user_name = p_user_name
  FOR UPDATE;

  IF v_previous_status IS DISTINCT FROM 'accepted' THEN
    SELECT pg_catalog.count(*)::integer
      INTO v_member_count
    FROM public.upstatus_signal_room_members AS m
    WHERE m.room_id = v_room_id
      AND m.status = 'accepted';

    IF v_member_count >= p_max_members THEN
      RETURN pg_catalog.jsonb_build_object('error', 'ROOM_FULL', 'memberCount', v_member_count);
    END IF;

    INSERT INTO public.upstatus_signal_room_members (room_id, user_name, status)
    VALUES (v_room_id, p_user_name, 'accepted')
    ON CONFLICT (room_id, user_name) DO UPDATE
      SET status = 'accepted',
          joined_at = CASE
            WHEN public.upstatus_signal_room_members.status = 'accepted'
              THEN public.upstatus_signal_room_members.joined_at
            ELSE pg_catalog.now()
          END;
    v_joined := true;
  END IF;

  FOREACH v_binding_type IN ARRAY ARRAY['voice', 'screen']::text[] LOOP
    FOREACH v_binding_logical_id IN ARRAY ARRAY[p_logical_id, v_alias]::text[] LOOP
      INSERT INTO public.upstatus_signal_room_bindings AS current_binding
        (binding_type, logical_id, room_id, created_by)
      VALUES
        (v_binding_type, v_binding_logical_id, v_room_id, v_created_by)
      ON CONFLICT (binding_type, logical_id) DO UPDATE
        SET room_id = EXCLUDED.room_id,
            created_by = EXCLUDED.created_by,
            created_at = CASE
              WHEN current_binding.room_id = EXCLUDED.room_id THEN current_binding.created_at
              ELSE pg_catalog.now()
            END
        WHERE current_binding.room_id = EXCLUDED.room_id
           OR NOT EXISTS (
             SELECT 1
             FROM public.upstatus_signal_rooms AS old_room
             WHERE old_room.room_id = current_binding.room_id
               AND old_room.status = 'active'
               AND old_room.expires_at > pg_catalog.now()
           );
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      IF v_rows <> 1 THEN
        RAISE EXCEPTION 'VOICE_ROOM_BINDING_CONFLICT' USING ERRCODE = 'P0001';
      END IF;
    END LOOP;
  END LOOP;

  SELECT pg_catalog.count(*)::integer
    INTO v_member_count
  FROM public.upstatus_signal_room_members AS m
  WHERE m.room_id = v_room_id
    AND m.status = 'accepted';

  RETURN pg_catalog.jsonb_build_object(
    'ok', true,
    'roomId', v_room_id,
    'created', v_created,
    'joined', v_joined,
    'expiresAt', v_expires_at,
    'memberCount', v_member_count
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.leave_upstatus_signal_room(
  p_room_id text,
  p_user_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_owner text;
  v_room_status text;
  v_expires_at timestamptz;
  v_next_owner text;
  v_departed text;
  v_owner_transferred boolean := false;
BEGIN
  IF p_room_id IS NULL OR pg_catalog.length(p_room_id) NOT BETWEEN 1 AND 128
     OR p_user_name IS NULL OR pg_catalog.length(pg_catalog.btrim(p_user_name)) NOT BETWEEN 1 AND 80 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'INVALID_ARGUMENT');
  END IF;

  SELECT r.created_by, r.status, r.expires_at
    INTO v_owner, v_room_status, v_expires_at
  FROM public.upstatus_signal_rooms AS r
  WHERE r.room_id = p_room_id
  FOR UPDATE;

  IF NOT FOUND OR v_room_status <> 'active' OR v_expires_at <= pg_catalog.now() THEN
    RETURN pg_catalog.jsonb_build_object('error', 'ROOM_UNAVAILABLE');
  END IF;

  PERFORM 1
  FROM public.upstatus_signal_room_members AS m
  WHERE m.room_id = p_room_id
    AND m.user_name = p_user_name
    AND m.status = 'accepted'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('error', 'ROOM_MEMBERSHIP_ENDED');
  END IF;

  DELETE FROM public.upstatus_signal_events AS e
  WHERE e.room_id = p_room_id
    AND e.recipient = p_user_name;

  DELETE FROM public.upstatus_signal_room_members AS m
  WHERE m.room_id = p_room_id
    AND m.user_name = p_user_name
    AND m.status = 'accepted'
  RETURNING m.user_name INTO v_departed;

  IF v_departed IS NULL THEN
    RETURN pg_catalog.jsonb_build_object('error', 'ROOM_MEMBERSHIP_ENDED');
  END IF;

  SELECT m.user_name
    INTO v_next_owner
  FROM public.upstatus_signal_room_members AS m
  WHERE m.room_id = p_room_id
    AND m.status = 'accepted'
  ORDER BY m.joined_at ASC, m.user_name ASC
  LIMIT 1;

  IF v_next_owner IS NULL THEN
    UPDATE public.upstatus_signal_rooms AS r
      SET status = 'closed'
    WHERE r.room_id = p_room_id
      AND r.status = 'active';

    DELETE FROM public.upstatus_signal_room_bindings AS b WHERE b.room_id = p_room_id;
    DELETE FROM public.upstatus_signal_events AS e WHERE e.room_id = p_room_id;
    DELETE FROM public.upstatus_signal_room_members AS m WHERE m.room_id = p_room_id;

    RETURN pg_catalog.jsonb_build_object('ok', true, 'roomClosed', true, 'ownerTransferred', false);
  END IF;

  IF v_owner = p_user_name THEN
    UPDATE public.upstatus_signal_rooms AS r
      SET created_by = v_next_owner
    WHERE r.room_id = p_room_id
      AND r.created_by = p_user_name;

    UPDATE public.upstatus_signal_room_bindings AS b
      SET created_by = v_next_owner
    WHERE b.room_id = p_room_id;

    v_owner_transferred := true;
  END IF;

  RETURN pg_catalog.jsonb_build_object('ok', true, 'roomClosed', false, 'ownerTransferred', v_owner_transferred);
END;
$function$;

REVOKE ALL ON FUNCTION public.open_upstatus_signal_voice_room(text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_upstatus_signal_voice_room(text, text, integer) TO service_role;
REVOKE ALL ON FUNCTION public.leave_upstatus_signal_room(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leave_upstatus_signal_room(text, text) TO service_role;
