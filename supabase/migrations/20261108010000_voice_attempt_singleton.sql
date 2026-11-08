-- Prevent multiple tab-local voice attempts from owning one account membership.
-- The logical room is shared by Normal and Team Lite; the guard is serialized
-- by the existing logical-room advisory transaction lock.
CREATE OR REPLACE FUNCTION public.open_upstatus_signal_voice_room_attempt(
  p_attempt_id text,
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
  v_prefix text;
  v_attempt public.upstatus_signal_voice_room_attempts%ROWTYPE;
  v_open jsonb;
  v_room_id text;
  v_expires_at timestamptz;
  v_member_status text;
  v_existing_attempt public.upstatus_signal_voice_room_attempts%ROWTYPE;
BEGIN
  IF p_logical_id = 'upstatus-team-room-v1' THEN
    v_alias := 'upstatus-team-lite-room-v1';
  ELSIF p_logical_id = 'upstatus-team-lite-room-v1' THEN
    v_alias := 'upstatus-team-room-v1';
  ELSE
    RETURN pg_catalog.jsonb_build_object('error', 'INVALID_LOGICAL_ID');
  END IF;

  IF p_user_name IS NULL OR pg_catalog.length(pg_catalog.btrim(p_user_name)) NOT BETWEEN 1 AND 80
     OR p_max_members IS NULL OR p_max_members < 2 OR p_max_members > 32
     OR p_attempt_id IS NULL OR pg_catalog.length(p_attempt_id) NOT BETWEEN 1 AND 128
     OR p_attempt_id !~ '^[A-Za-z0-9._:-]{1,128}$' THEN
    RETURN pg_catalog.jsonb_build_object('error', 'INVALID_ARGUMENT');
  END IF;

  v_prefix := pg_catalog.regexp_replace(p_user_name, '[^A-Za-z0-9._:-]', '_', 'g') || '-voice-';
  IF pg_catalog.left(p_attempt_id, pg_catalog.length(v_prefix)) <> v_prefix THEN
    RETURN pg_catalog.jsonb_build_object('error', 'INVALID_ATTEMPT_ID');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users AS u WHERE u.name = p_user_name) THEN
    RETURN pg_catalog.jsonb_build_object('error', 'UNKNOWN_USER');
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('upstatus-voice-attempt:' || p_attempt_id, 0)
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'upstatus-open-voice:' || LEAST(p_logical_id, v_alias) || ':' || GREATEST(p_logical_id, v_alias),
      0
    )
  );

  SELECT a.*
    INTO v_attempt
  FROM public.upstatus_signal_voice_room_attempts AS a
  WHERE a.attempt_id = p_attempt_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_attempt.created_by <> p_user_name OR v_attempt.logical_id <> p_logical_id THEN
      RETURN pg_catalog.jsonb_build_object('error', 'VOICE_ATTEMPT_CONFLICT');
    END IF;
    IF v_attempt.status IN ('cancelled', 'closed') THEN
      RETURN pg_catalog.jsonb_build_object('error', 'VOICE_ROOM_OPEN_CANCELLED');
    END IF;

    SELECT r.expires_at
      INTO v_expires_at
    FROM public.upstatus_signal_rooms AS r
    WHERE r.room_id = v_attempt.room_id
      AND r.status = 'active'
      AND r.expires_at > pg_catalog.now()
    FOR UPDATE;

    IF NOT FOUND THEN
      UPDATE public.upstatus_signal_voice_room_attempts
        SET status = 'closed', room_id = NULL, expires_at = pg_catalog.now() + interval '7 days'
      WHERE attempt_id = p_attempt_id;
      RETURN pg_catalog.jsonb_build_object('error', 'VOICE_ROOM_UNAVAILABLE');
    END IF;

    SELECT m.status
      INTO v_member_status
    FROM public.upstatus_signal_room_members AS m
    WHERE m.room_id = v_attempt.room_id
      AND m.user_name = p_user_name
    FOR UPDATE;

    IF v_member_status IS DISTINCT FROM 'accepted' THEN
      UPDATE public.upstatus_signal_voice_room_attempts
        SET status = 'closed', room_id = NULL, expires_at = pg_catalog.now() + interval '7 days'
      WHERE attempt_id = p_attempt_id;
      RETURN pg_catalog.jsonb_build_object('error', 'VOICE_ROOM_MEMBERSHIP_ENDED');
    END IF;

    RETURN pg_catalog.jsonb_build_object(
      'ok', true, 'roomId', v_attempt.room_id, 'created', false, 'joined', false,
      'existing', true, 'attemptId', p_attempt_id, 'expiresAt', v_expires_at
    );
  END IF;

  -- One account owns one voice-room membership across Normal and Team Lite.
  -- Team Lite stores attempts per tab, so distinct tabs can otherwise create
  -- separate attempt IDs for the same server-side membership.
  FOR v_existing_attempt IN
    SELECT a.*
    FROM public.upstatus_signal_voice_room_attempts AS a
    WHERE a.created_by = p_user_name
      AND a.status = 'active'
    ORDER BY a.created_at ASC, a.attempt_id ASC
    FOR UPDATE
  LOOP
    IF v_existing_attempt.expires_at > pg_catalog.now()
       AND v_existing_attempt.room_id IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM public.upstatus_signal_rooms AS r
         WHERE r.room_id = v_existing_attempt.room_id
           AND r.status = 'active'
           AND r.expires_at > pg_catalog.now()
       )
       AND EXISTS (
         SELECT 1 FROM public.upstatus_signal_room_members AS m
         WHERE m.room_id = v_existing_attempt.room_id
           AND m.user_name = p_user_name
           AND m.status = 'accepted'
       )
    THEN
      RETURN pg_catalog.jsonb_build_object('error', 'VOICE_ATTEMPT_ALREADY_ACTIVE');
    END IF;

    UPDATE public.upstatus_signal_voice_room_attempts
      SET status = 'closed', room_id = NULL, expires_at = pg_catalog.now() + interval '7 days'
    WHERE attempt_id = v_existing_attempt.attempt_id;
  END LOOP;

  v_open := public.open_upstatus_signal_voice_room(p_logical_id, p_user_name, p_max_members);
  IF v_open IS NULL OR pg_catalog.jsonb_typeof(v_open) <> 'object' THEN
    RETURN pg_catalog.jsonb_build_object('error', 'VOICE_ROOM_OPEN_FAILED');
  END IF;
  IF v_open ? 'error' THEN
    RETURN v_open;
  END IF;

  v_room_id := v_open->>'roomId';
  IF v_room_id IS NULL OR pg_catalog.length(v_room_id) NOT BETWEEN 1 AND 128 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'VOICE_ROOM_OPEN_FAILED');
  END IF;

  INSERT INTO public.upstatus_signal_voice_room_attempts
    (attempt_id, logical_id, created_by, room_id, status, expires_at)
  VALUES
    (p_attempt_id, p_logical_id, p_user_name, v_room_id, 'active', pg_catalog.now() + interval '7 days');

  RETURN v_open || pg_catalog.jsonb_build_object('attemptId', p_attempt_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.open_upstatus_signal_voice_room_attempt(text, text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_upstatus_signal_voice_room_attempt(text, text, text, integer) TO service_role;
