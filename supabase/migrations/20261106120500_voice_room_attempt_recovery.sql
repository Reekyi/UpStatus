-- Durable, cancellable voice-room open attempts.
-- The client persists attempt_id before /room/open. Open and cancel serialize on the
-- same attempt and logical-room locks, so cancel-before-open writes a tombstone and
-- a delayed open cannot recreate a membership after the user has left.
CREATE TABLE IF NOT EXISTS public.upstatus_signal_voice_room_attempts (
  attempt_id text PRIMARY KEY CHECK (pg_catalog.length(attempt_id) BETWEEN 1 AND 128),
  logical_id text NOT NULL CHECK (logical_id IN ('upstatus-team-room-v1', 'upstatus-team-lite-room-v1')),
  created_by text NOT NULL REFERENCES public.users(name) ON DELETE CASCADE,
  room_id text REFERENCES public.upstatus_signal_rooms(room_id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('active', 'cancelled', 'closed')),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS upstatus_signal_voice_room_attempts_created_by_idx
  ON public.upstatus_signal_voice_room_attempts (created_by);
CREATE INDEX IF NOT EXISTS upstatus_signal_voice_room_attempts_room_id_idx
  ON public.upstatus_signal_voice_room_attempts (room_id);
CREATE INDEX IF NOT EXISTS upstatus_signal_voice_room_attempts_expiry_idx
  ON public.upstatus_signal_voice_room_attempts (expires_at);

ALTER TABLE public.upstatus_signal_voice_room_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.upstatus_signal_voice_room_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.upstatus_signal_voice_room_attempts TO service_role;

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

CREATE OR REPLACE FUNCTION public.cancel_upstatus_signal_voice_room_attempt(
  p_attempt_id text,
  p_logical_id text,
  p_user_name text
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
  v_leave jsonb;
  v_already_gone boolean := false;
BEGIN
  IF p_logical_id = 'upstatus-team-room-v1' THEN
    v_alias := 'upstatus-team-lite-room-v1';
  ELSIF p_logical_id = 'upstatus-team-lite-room-v1' THEN
    v_alias := 'upstatus-team-room-v1';
  ELSE
    RETURN pg_catalog.jsonb_build_object('error', 'INVALID_LOGICAL_ID');
  END IF;

  IF p_user_name IS NULL OR pg_catalog.length(pg_catalog.btrim(p_user_name)) NOT BETWEEN 1 AND 80
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
      RETURN pg_catalog.jsonb_build_object('error', 'VOICE_ATTEMPT_FORBIDDEN');
    END IF;
    IF v_attempt.status IN ('cancelled', 'closed') THEN
      RETURN pg_catalog.jsonb_build_object('ok', true, 'cancelled', true, 'alreadyCancelled', true);
    END IF;

    IF v_attempt.room_id IS NOT NULL THEN
      v_leave := public.leave_upstatus_signal_room(v_attempt.room_id, p_user_name);
      IF v_leave ? 'error' THEN
        IF v_leave->>'error' NOT IN ('ROOM_UNAVAILABLE', 'ROOM_MEMBERSHIP_ENDED') THEN
          RETURN pg_catalog.jsonb_build_object('error', 'VOICE_ROOM_CLEANUP_FAILED');
        END IF;
        v_already_gone := true;
      END IF;
    ELSE
      v_already_gone := true;
    END IF;

    UPDATE public.upstatus_signal_voice_room_attempts
      SET status = 'cancelled', room_id = NULL, expires_at = pg_catalog.now() + interval '7 days'
    WHERE attempt_id = p_attempt_id;

    RETURN pg_catalog.jsonb_build_object(
      'ok', true, 'cancelled', true, 'alreadyGone', v_already_gone,
      'roomClosed', COALESCE((v_leave->>'roomClosed')::boolean, false)
    );
  END IF;

  -- Cancel-before-open tombstone: a delayed open with this attempt ID must fail.
  INSERT INTO public.upstatus_signal_voice_room_attempts
    (attempt_id, logical_id, created_by, room_id, status, expires_at)
  VALUES
    (p_attempt_id, p_logical_id, p_user_name, NULL, 'cancelled', pg_catalog.now() + interval '7 days');

  RETURN pg_catalog.jsonb_build_object('ok', true, 'cancelled', true, 'notFound', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.open_upstatus_signal_voice_room_attempt(text, text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_upstatus_signal_voice_room_attempt(text, text, text, integer) TO service_role;
REVOKE ALL ON FUNCTION public.cancel_upstatus_signal_voice_room_attempt(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_upstatus_signal_voice_room_attempt(text, text, text) TO service_role;
