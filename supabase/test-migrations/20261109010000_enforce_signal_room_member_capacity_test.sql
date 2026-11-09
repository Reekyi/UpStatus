-- Isolated-only catalog contract for generic room capacity enforcement.
-- Apply only to bfpjtfqlnypisxljoxkb after the paired production candidate migration.
DO $test$
DECLARE
  v_invite_oid oid := pg_catalog.to_regprocedure('public.invite_upstatus_signal_room_member(text,text,text)');
  v_accept_oid oid := pg_catalog.to_regprocedure('public.accept_upstatus_signal_room_invitation(text,text)');
  v_def text;
  v_prosecdef boolean;
  v_provolatile "char";
  v_proconfig text[];
  v_public_execute boolean;
  v_room_pos integer;
  v_room_lock_pos integer;
  v_member_pos integer;
  v_count_pos integer;
BEGIN
  IF v_invite_oid IS NULL OR v_accept_oid IS NULL THEN
    RAISE EXCEPTION 'generic room capacity RPCs are missing';
  END IF;

  SELECT p.prosecdef, p.provolatile, p.proconfig
    INTO v_prosecdef, v_provolatile, v_proconfig
  FROM pg_catalog.pg_proc AS p
  WHERE p.oid = v_invite_oid;

  IF v_prosecdef OR v_provolatile <> 'v'
     OR NOT (COALESCE(v_proconfig, ARRAY[]::text[]) @> ARRAY['search_path=""']) THEN
    RAISE EXCEPTION 'invite RPC must be VOLATILE SECURITY INVOKER with empty search_path';
  END IF;

  IF has_function_privilege('anon', v_invite_oid, 'EXECUTE')
     OR has_function_privilege('authenticated', v_invite_oid, 'EXECUTE')
     OR NOT has_function_privilege('service_role', v_invite_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'invite RPC grants must be service_role-only';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) AS acl
    WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
  )
    INTO v_public_execute
  FROM pg_catalog.pg_proc AS p
  WHERE p.oid = v_invite_oid;
  IF v_public_execute THEN
    RAISE EXCEPTION 'PUBLIC must not execute invite RPC';
  END IF;

  v_def := pg_catalog.pg_get_functiondef(v_invite_oid);
  v_room_pos := pg_catalog.strpos(v_def, 'FROM public.upstatus_signal_rooms AS r');
  v_member_pos := pg_catalog.strpos(v_def, 'FROM public.upstatus_signal_room_members AS m');
  v_count_pos := pg_catalog.strpos(v_def, 'SELECT pg_catalog.count(*)');
  IF v_room_pos = 0 OR v_member_pos = 0 OR v_count_pos = 0 THEN
    RAISE EXCEPTION 'invite RPC must lock the room, lock membership, and count accepted members';
  END IF;
  v_room_lock_pos := v_room_pos + pg_catalog.strpos(pg_catalog.substring(v_def FROM v_room_pos), 'FOR UPDATE') - 1;
  IF v_room_lock_pos < v_room_pos OR v_room_lock_pos >= v_member_pos
     OR pg_catalog.strpos(v_def, 'ROOM_FULL') = 0
     OR pg_catalog.strpos(v_def, '>= 32') = 0 THEN
    RAISE EXCEPTION 'invite RPC must serialize room-first and enforce the 32-member limit';
  END IF;

  SELECT p.prosecdef, p.provolatile, p.proconfig
    INTO v_prosecdef, v_provolatile, v_proconfig
  FROM pg_catalog.pg_proc AS p
  WHERE p.oid = v_accept_oid;

  IF v_prosecdef OR v_provolatile <> 'v'
     OR NOT (COALESCE(v_proconfig, ARRAY[]::text[]) @> ARRAY['search_path=""']) THEN
    RAISE EXCEPTION 'accept RPC must be VOLATILE SECURITY INVOKER with empty search_path';
  END IF;

  IF has_function_privilege('anon', v_accept_oid, 'EXECUTE')
     OR has_function_privilege('authenticated', v_accept_oid, 'EXECUTE')
     OR NOT has_function_privilege('service_role', v_accept_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'accept RPC grants must be service_role-only';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) AS acl
    WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
  )
    INTO v_public_execute
  FROM pg_catalog.pg_proc AS p
  WHERE p.oid = v_accept_oid;
  IF v_public_execute THEN
    RAISE EXCEPTION 'PUBLIC must not execute accept RPC';
  END IF;

  v_def := pg_catalog.pg_get_functiondef(v_accept_oid);
  v_room_pos := pg_catalog.strpos(v_def, 'FROM public.upstatus_signal_rooms AS r');
  v_member_pos := pg_catalog.strpos(v_def, 'FROM public.upstatus_signal_room_members AS m');
  v_count_pos := pg_catalog.strpos(v_def, 'SELECT pg_catalog.count(*)');
  IF v_room_pos = 0 OR v_member_pos = 0 OR v_count_pos = 0 THEN
    RAISE EXCEPTION 'accept RPC must lock the room, lock invitation, and count accepted members';
  END IF;
  v_room_lock_pos := v_room_pos + pg_catalog.strpos(pg_catalog.substring(v_def FROM v_room_pos), 'FOR UPDATE') - 1;
  IF v_room_lock_pos < v_room_pos OR v_room_lock_pos >= v_member_pos
     OR v_count_pos <= v_member_pos
     OR pg_catalog.strpos(v_def, 'ROOM_FULL') = 0
     OR pg_catalog.strpos(v_def, '>= 32') = 0 THEN
    RAISE EXCEPTION 'accept RPC must serialize room-first and enforce the 32-member limit';
  END IF;
END;
$test$;
