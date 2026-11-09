-- Serialize generic room invitations and acceptance on the room row.
-- The room-first lock order matches leave_upstatus_signal_room and the voice-room
-- open path, preventing concurrent accepts from exceeding the 32-member limit.
CREATE OR REPLACE FUNCTION public.invite_upstatus_signal_room_member(
  p_room_id text,
  p_inviter text,
  p_recipient text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_room_status text;
  v_expires_at timestamptz;
  v_inviter_status text;
  v_existing_status text;
  v_existing boolean := false;
  v_accepted_count integer := 0;
  v_rows integer := 0;
BEGIN
  IF p_room_id IS NULL OR pg_catalog.length(p_room_id) NOT BETWEEN 1 AND 128
     OR p_inviter IS NULL OR pg_catalog.length(pg_catalog.btrim(p_inviter)) NOT BETWEEN 1 AND 80
     OR p_recipient IS NULL OR pg_catalog.length(pg_catalog.btrim(p_recipient)) NOT BETWEEN 1 AND 80
     OR p_recipient = p_inviter THEN
    RETURN pg_catalog.jsonb_build_object('error', 'INVALID_ARGUMENT');
  END IF;

  -- Lock order is room -> inviter membership -> recipient membership.
  -- It matches leave_upstatus_signal_room and serializes invite/accept decisions.
  SELECT r.status, r.expires_at
    INTO v_room_status, v_expires_at
  FROM public.upstatus_signal_rooms AS r
  WHERE r.room_id = p_room_id
  FOR UPDATE;

  IF NOT FOUND OR v_room_status IS DISTINCT FROM 'active'
     OR v_expires_at IS NULL OR v_expires_at <= pg_catalog.now() THEN
    RETURN pg_catalog.jsonb_build_object('error', 'ROOM_UNAVAILABLE');
  END IF;

  SELECT m.status
    INTO v_inviter_status
  FROM public.upstatus_signal_room_members AS m
  WHERE m.room_id = p_room_id
    AND m.user_name = p_inviter
  FOR UPDATE;

  IF NOT FOUND OR v_inviter_status IS DISTINCT FROM 'accepted' THEN
    RETURN pg_catalog.jsonb_build_object('error', 'ROOM_MEMBER_FORBIDDEN');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users AS u WHERE u.name = p_recipient
  ) THEN
    RETURN pg_catalog.jsonb_build_object('error', 'UNKNOWN_USER');
  END IF;

  SELECT m.status
    INTO v_existing_status
  FROM public.upstatus_signal_room_members AS m
  WHERE m.room_id = p_room_id
    AND m.user_name = p_recipient
  FOR UPDATE;
  v_existing := FOUND;

  IF v_existing AND v_existing_status IS DISTINCT FROM 'declined' THEN
    RETURN pg_catalog.jsonb_build_object('error', 'MEMBER_EXISTS');
  END IF;

  SELECT pg_catalog.count(*)::integer
    INTO v_accepted_count
  FROM public.upstatus_signal_room_members AS m
  WHERE m.room_id = p_room_id
    AND m.status = 'accepted';

  IF v_accepted_count >= 32 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'ROOM_FULL');
  END IF;

  IF v_existing THEN
    UPDATE public.upstatus_signal_room_members AS m
      SET status = 'pending', joined_at = pg_catalog.now()
    WHERE m.room_id = p_room_id
      AND m.user_name = p_recipient
      AND m.status = 'declined';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 1 THEN
      RETURN pg_catalog.jsonb_build_object('error', 'MEMBER_EXISTS');
    END IF;
    RETURN pg_catalog.jsonb_build_object('ok', true, 'status', 'pending', 'reissued', true);
  END IF;

  INSERT INTO public.upstatus_signal_room_members (room_id, user_name, status)
  VALUES (p_room_id, p_recipient, 'pending');

  RETURN pg_catalog.jsonb_build_object('ok', true, 'status', 'pending', 'reissued', false);
EXCEPTION
  WHEN unique_violation THEN
    RETURN pg_catalog.jsonb_build_object('error', 'MEMBER_EXISTS');
  WHEN foreign_key_violation THEN
    RETURN pg_catalog.jsonb_build_object('error', 'UNKNOWN_USER');
END;
$function$;

REVOKE ALL ON FUNCTION public.invite_upstatus_signal_room_member(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invite_upstatus_signal_room_member(text, text, text) TO service_role;


CREATE OR REPLACE FUNCTION public.accept_upstatus_signal_room_invitation(
  p_room_id text,
  p_user_name text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_room_status text;
  v_expires_at timestamptz;
  v_invitation_status text;
  v_accepted_count integer := 0;
  v_rows integer := 0;
BEGIN
  IF p_room_id IS NULL OR pg_catalog.length(p_room_id) NOT BETWEEN 1 AND 128
     OR p_user_name IS NULL OR pg_catalog.length(pg_catalog.btrim(p_user_name)) NOT BETWEEN 1 AND 80 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'INVALID_ARGUMENT');
  END IF;

  -- Lock the room before the invitation row. This is the same order used by
  -- leave_upstatus_signal_room, so concurrent accepts cannot deadlock with leave.
  SELECT r.status, r.expires_at
    INTO v_room_status, v_expires_at
  FROM public.upstatus_signal_rooms AS r
  WHERE r.room_id = p_room_id
  FOR UPDATE;

  IF NOT FOUND OR v_room_status IS DISTINCT FROM 'active'
     OR v_expires_at IS NULL OR v_expires_at <= pg_catalog.now() THEN
    RETURN pg_catalog.jsonb_build_object('error', 'ROOM_UNAVAILABLE');
  END IF;

  SELECT m.status
    INTO v_invitation_status
  FROM public.upstatus_signal_room_members AS m
  WHERE m.room_id = p_room_id
    AND m.user_name = p_user_name
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('error', 'INVITATION_NOT_FOUND');
  END IF;
  IF v_invitation_status IS DISTINCT FROM 'pending' THEN
    RETURN pg_catalog.jsonb_build_object('error', 'INVITATION_ALREADY_HANDLED');
  END IF;

  SELECT pg_catalog.count(*)::integer
    INTO v_accepted_count
  FROM public.upstatus_signal_room_members AS m
  WHERE m.room_id = p_room_id
    AND m.status = 'accepted';

  IF v_accepted_count >= 32 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'ROOM_FULL');
  END IF;

  UPDATE public.upstatus_signal_room_members AS m
    SET status = 'accepted'
  WHERE m.room_id = p_room_id
    AND m.user_name = p_user_name
    AND m.status = 'pending';
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows <> 1 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'INVITATION_ALREADY_HANDLED');
  END IF;

  SELECT pg_catalog.count(*)::integer
    INTO v_accepted_count
  FROM public.upstatus_signal_room_members AS m
  WHERE m.room_id = p_room_id
    AND m.status = 'accepted';

  RETURN pg_catalog.jsonb_build_object(
    'ok', true,
    'status', 'accepted',
    'memberCount', v_accepted_count
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.accept_upstatus_signal_room_invitation(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_upstatus_signal_room_invitation(text, text) TO service_role;
