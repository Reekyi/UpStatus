-- Idempotent authenticated call-room attempts.
-- A client persists its logical call ID before requesting preparation. Both prepare and
-- cancel serialize on that ID, so a pagehide cancellation either closes the prepared room
-- or writes a tombstone that prevents a late prepare request from creating one.
CREATE TABLE IF NOT EXISTS public.upstatus_signal_call_attempts (
  call_id text PRIMARY KEY CHECK (pg_catalog.length(call_id) BETWEEN 1 AND 128),
  created_by text NOT NULL REFERENCES public.users(name) ON DELETE CASCADE,
  recipient text REFERENCES public.users(name) ON DELETE CASCADE,
  room_id text REFERENCES public.upstatus_signal_rooms(room_id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('active', 'cancelled', 'closed')),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS upstatus_signal_call_attempts_expiry_idx
  ON public.upstatus_signal_call_attempts (expires_at);

ALTER TABLE public.upstatus_signal_call_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.upstatus_signal_call_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.upstatus_signal_call_attempts TO service_role;

CREATE OR REPLACE FUNCTION public.prepare_upstatus_signal_call_room(
  p_call_id text,
  p_user_name text,
  p_recipient text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_attempt public.upstatus_signal_call_attempts%ROWTYPE;
  v_binding public.upstatus_signal_room_bindings%ROWTYPE;
  v_room public.upstatus_signal_rooms%ROWTYPE;
  v_sender_status text;
  v_recipient_status text;
  v_prefix text;
  v_room_id text;
  v_expires_at timestamptz;
BEGIN
  IF p_call_id IS NULL OR pg_catalog.length(p_call_id) NOT BETWEEN 1 AND 128
     OR p_user_name IS NULL OR pg_catalog.length(pg_catalog.btrim(p_user_name)) NOT BETWEEN 1 AND 80
     OR p_recipient IS NULL OR pg_catalog.length(pg_catalog.btrim(p_recipient)) NOT BETWEEN 1 AND 80
     OR p_recipient = p_user_name THEN
    RETURN pg_catalog.jsonb_build_object('error', 'INVALID_ARGUMENT');
  END IF;

  v_prefix := pg_catalog.regexp_replace(p_user_name, '[^A-Za-z0-9._:-]', '_', 'g') || '-';
  IF pg_catalog.left(p_call_id, pg_catalog.length(v_prefix)) <> v_prefix
     OR p_call_id !~ '^[A-Za-z0-9._:-]{1,128}$' THEN
    RETURN pg_catalog.jsonb_build_object('error', 'INVALID_CALL_ID');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users AS u WHERE u.name = p_user_name)
     OR NOT EXISTS (SELECT 1 FROM public.users AS u WHERE u.name = p_recipient) THEN
    RETURN pg_catalog.jsonb_build_object('error', 'UNKNOWN_USER');
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('upstatus-call:' || p_call_id, 0)
  );

  SELECT a.*
    INTO v_attempt
  FROM public.upstatus_signal_call_attempts AS a
  WHERE a.call_id = p_call_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_attempt.created_by <> p_user_name THEN
      RETURN pg_catalog.jsonb_build_object('error', 'CALL_ID_CONFLICT');
    END IF;
    IF v_attempt.status IN ('cancelled', 'closed') THEN
      RETURN pg_catalog.jsonb_build_object('error', 'CALL_CANCELLED');
    END IF;
    IF v_attempt.recipient IS DISTINCT FROM p_recipient THEN
      RETURN pg_catalog.jsonb_build_object('error', 'CALL_RECIPIENT_MISMATCH');
    END IF;

    SELECT r.*
      INTO v_room
    FROM public.upstatus_signal_rooms AS r
    WHERE r.room_id = v_attempt.room_id
      AND r.status = 'active'
      AND r.expires_at > pg_catalog.now()
    FOR UPDATE;

    IF NOT FOUND THEN
      UPDATE public.upstatus_signal_call_attempts
        SET status = 'closed',
            room_id = NULL,
            expires_at = pg_catalog.now() + interval '7 days'
      WHERE call_id = p_call_id;
      RETURN pg_catalog.jsonb_build_object('error', 'CALL_EXPIRED');
    END IF;

    SELECT m.status INTO v_sender_status
    FROM public.upstatus_signal_room_members AS m
    WHERE m.room_id = v_room.room_id AND m.user_name = p_user_name;

    SELECT m.status INTO v_recipient_status
    FROM public.upstatus_signal_room_members AS m
    WHERE m.room_id = v_room.room_id AND m.user_name = p_recipient;

    IF v_sender_status IS DISTINCT FROM 'accepted'
       OR v_recipient_status NOT IN ('pending', 'accepted') THEN
      UPDATE public.upstatus_signal_call_attempts
        SET status = 'closed', expires_at = pg_catalog.now() + interval '7 days'
      WHERE call_id = p_call_id;
      RETURN pg_catalog.jsonb_build_object('error', 'CALL_MEMBERSHIP_ENDED');
    END IF;

    RETURN pg_catalog.jsonb_build_object(
      'ok', true, 'roomId', v_room.room_id, 'created', false, 'existing', true,
      'expiresAt', v_room.expires_at
    );
  END IF;

  -- Adopt a still-active binding created by an older candidate client. This keeps
  -- retries compatible while new clients move to the atomic attempt protocol.
  SELECT b.*
    INTO v_binding
  FROM public.upstatus_signal_room_bindings AS b
  WHERE b.binding_type = 'call' AND b.logical_id = p_call_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_binding.created_by <> p_user_name THEN
      RETURN pg_catalog.jsonb_build_object('error', 'CALL_ID_CONFLICT');
    END IF;

    SELECT r.*
      INTO v_room
    FROM public.upstatus_signal_rooms AS r
    WHERE r.room_id = v_binding.room_id
    FOR UPDATE;

    IF NOT FOUND OR v_room.status <> 'active' OR v_room.expires_at <= pg_catalog.now() THEN
      INSERT INTO public.upstatus_signal_call_attempts
        (call_id, created_by, recipient, room_id, status, expires_at)
      VALUES
        (p_call_id, p_user_name, p_recipient, NULL, 'closed', pg_catalog.now() + interval '7 days');
      RETURN pg_catalog.jsonb_build_object('error', 'CALL_EXPIRED');
    END IF;

    SELECT m.status INTO v_sender_status
    FROM public.upstatus_signal_room_members AS m
    WHERE m.room_id = v_room.room_id AND m.user_name = p_user_name;

    SELECT m.status INTO v_recipient_status
    FROM public.upstatus_signal_room_members AS m
    WHERE m.room_id = v_room.room_id AND m.user_name = p_recipient;

    IF v_sender_status IS DISTINCT FROM 'accepted'
       OR v_recipient_status NOT IN ('pending', 'accepted') THEN
      INSERT INTO public.upstatus_signal_call_attempts
        (call_id, created_by, recipient, room_id, status, expires_at)
      VALUES
        (p_call_id, p_user_name, p_recipient, NULL, 'closed', pg_catalog.now() + interval '7 days');
      RETURN pg_catalog.jsonb_build_object('error', 'CALL_MEMBERSHIP_ENDED');
    END IF;

    INSERT INTO public.upstatus_signal_call_attempts
      (call_id, created_by, recipient, room_id, status, expires_at)
    VALUES
      (p_call_id, p_user_name, p_recipient, v_room.room_id, 'active', v_room.expires_at);

    RETURN pg_catalog.jsonb_build_object(
      'ok', true, 'roomId', v_room.room_id, 'created', false, 'existing', true,
      'expiresAt', v_room.expires_at
    );
  END IF;

  v_room_id := 'sig_' || pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '');
  v_expires_at := pg_catalog.now() + interval '2 hours';

  BEGIN
    INSERT INTO public.upstatus_signal_rooms (room_id, created_by, status, expires_at)
    VALUES (v_room_id, p_user_name, 'active', v_expires_at);

    INSERT INTO public.upstatus_signal_room_members (room_id, user_name, status)
    VALUES
      (v_room_id, p_user_name, 'accepted'),
      (v_room_id, p_recipient, 'pending');

    INSERT INTO public.upstatus_signal_room_bindings
      (binding_type, logical_id, room_id, created_by)
    VALUES
      ('call', p_call_id, v_room_id, p_user_name);

    INSERT INTO public.upstatus_signal_call_attempts
      (call_id, created_by, recipient, room_id, status, expires_at)
    VALUES
      (p_call_id, p_user_name, p_recipient, v_room_id, 'active', v_expires_at);
  EXCEPTION WHEN unique_violation THEN
    RETURN pg_catalog.jsonb_build_object('error', 'CALL_ID_CONFLICT');
  END;

  RETURN pg_catalog.jsonb_build_object(
    'ok', true, 'roomId', v_room_id, 'created', true, 'existing', false,
    'expiresAt', v_expires_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_upstatus_signal_call_room(
  p_call_id text,
  p_user_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_attempt public.upstatus_signal_call_attempts%ROWTYPE;
  v_binding public.upstatus_signal_room_bindings%ROWTYPE;
  v_leave jsonb;
  v_prefix text;
BEGIN
  IF p_call_id IS NULL OR pg_catalog.length(p_call_id) NOT BETWEEN 1 AND 128
     OR p_user_name IS NULL OR pg_catalog.length(pg_catalog.btrim(p_user_name)) NOT BETWEEN 1 AND 80 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'INVALID_ARGUMENT');
  END IF;

  v_prefix := pg_catalog.regexp_replace(p_user_name, '[^A-Za-z0-9._:-]', '_', 'g') || '-';
  IF pg_catalog.left(p_call_id, pg_catalog.length(v_prefix)) <> v_prefix
     OR p_call_id !~ '^[A-Za-z0-9._:-]{1,128}$' THEN
    RETURN pg_catalog.jsonb_build_object('error', 'INVALID_CALL_ID');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users AS u WHERE u.name = p_user_name) THEN
    RETURN pg_catalog.jsonb_build_object('error', 'UNKNOWN_USER');
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('upstatus-call:' || p_call_id, 0)
  );

  SELECT a.*
    INTO v_attempt
  FROM public.upstatus_signal_call_attempts AS a
  WHERE a.call_id = p_call_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_attempt.created_by <> p_user_name THEN
      RETURN pg_catalog.jsonb_build_object('error', 'CALL_ID_FORBIDDEN');
    END IF;

    IF v_attempt.status IN ('cancelled', 'closed') THEN
      RETURN pg_catalog.jsonb_build_object('ok', true, 'cancelled', true, 'alreadyCancelled', true);
    END IF;

    IF v_attempt.room_id IS NOT NULL THEN
      v_leave := public.leave_upstatus_signal_room(v_attempt.room_id, p_user_name);
      IF v_leave ? 'error' AND v_leave->>'error' NOT IN ('ROOM_UNAVAILABLE', 'ROOM_MEMBERSHIP_ENDED') THEN
        RETURN pg_catalog.jsonb_build_object('error', 'CALL_CLEANUP_FAILED');
      END IF;
    END IF;

    UPDATE public.upstatus_signal_call_attempts
      SET status = 'closed',
          expires_at = pg_catalog.now() + interval '7 days'
    WHERE call_id = p_call_id;

    RETURN pg_catalog.jsonb_build_object(
      'ok', true, 'cancelled', true,
      'roomClosed', COALESCE((v_leave->>'roomClosed')::boolean, false),
      'alreadyGone', COALESCE(v_leave ? 'error', false)
    );
  END IF;

  -- Compatibility path for a call created by the previous create+bind sequence.
  SELECT b.*
    INTO v_binding
  FROM public.upstatus_signal_room_bindings AS b
  WHERE b.binding_type = 'call' AND b.logical_id = p_call_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_binding.created_by <> p_user_name THEN
      RETURN pg_catalog.jsonb_build_object('error', 'CALL_ID_FORBIDDEN');
    END IF;
    v_leave := public.leave_upstatus_signal_room(v_binding.room_id, p_user_name);
    IF v_leave ? 'error' AND v_leave->>'error' NOT IN ('ROOM_UNAVAILABLE', 'ROOM_MEMBERSHIP_ENDED') THEN
      RETURN pg_catalog.jsonb_build_object('error', 'CALL_CLEANUP_FAILED');
    END IF;

    INSERT INTO public.upstatus_signal_call_attempts
      (call_id, created_by, recipient, room_id, status, expires_at)
    VALUES
      (p_call_id, p_user_name, NULL, NULL, 'closed', pg_catalog.now() + interval '7 days');

    RETURN pg_catalog.jsonb_build_object(
      'ok', true, 'cancelled', true,
      'roomClosed', COALESCE((v_leave->>'roomClosed')::boolean, false),
      'alreadyGone', COALESCE(v_leave ? 'error', false)
    );
  END IF;

  -- A tombstone makes cancel-before-prepare safe: a delayed prepare with the same
  -- logical ID observes CALL_CANCELLED instead of creating an orphan room.
  INSERT INTO public.upstatus_signal_call_attempts
    (call_id, created_by, recipient, room_id, status, expires_at)
  VALUES
    (p_call_id, p_user_name, NULL, NULL, 'cancelled', pg_catalog.now() + interval '7 days');

  RETURN pg_catalog.jsonb_build_object('ok', true, 'cancelled', true, 'notFound', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.prepare_upstatus_signal_call_room(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_upstatus_signal_call_room(text, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.cancel_upstatus_signal_call_room(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_upstatus_signal_call_room(text, text) TO service_role;
