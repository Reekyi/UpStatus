do $$
declare
  v_function oid;
  v_security_definer boolean;
  v_config text;
begin
  select p.oid, p.prosecdef, array_to_string(p.proconfig, ',')
    into v_function, v_security_definer, v_config
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname='consume_upstatus_setup_invite'
    and pg_get_function_identity_arguments(p.oid)='p_user_name text, p_setup_token_hash text, p_password_hash text';

  if v_function is null then raise exception 'consume_upstatus_setup_invite is missing'; end if;
  if v_security_definer then raise exception 'setup invite RPC must remain SECURITY INVOKER'; end if;
  if coalesce(v_config,'') not ilike '%search_path=%' then raise exception 'setup invite RPC must pin an empty search_path'; end if;
  if position($needle$nullif(btrim(u.role, E' \t\n\r'), '')$needle$ in pg_catalog.pg_get_functiondef(v_function)) = 0 then
    raise exception 'blank role normalization is missing';
  end if;
  if not has_function_privilege('service_role', v_function, 'EXECUTE') then raise exception 'service_role must execute setup invite RPC'; end if;
  if has_function_privilege('anon', v_function, 'EXECUTE') then raise exception 'anon must not execute setup invite RPC'; end if;
  if has_function_privilege('authenticated', v_function, 'EXECUTE') then raise exception 'authenticated must not execute setup invite RPC'; end if;
end
$$;
