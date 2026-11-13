-- TEST ONLY: apply to the isolated upstatus-security-test project
-- (bfpjtfqlnypisxljoxkb). Never apply this file to production or official TEST.
-- The production candidate globally revokes PUBLIC EXECUTE for functions created
-- by postgres. Verify that this effect is intentional and applies outside public.
CREATE SCHEMA upstatus_acl_global_scope_probe_20261105;

CREATE FUNCTION upstatus_acl_global_scope_probe_20261105.probe()
RETURNS integer
LANGUAGE sql
AS 'SELECT 1';

DO $$
DECLARE
  probe_function text := 'upstatus_acl_global_scope_probe_20261105.probe()';
BEGIN
  IF has_function_privilege('anon', probe_function, 'EXECUTE') THEN
    RAISE EXCEPTION 'anon unexpectedly inherits EXECUTE in a non-public schema';
  END IF;

  IF has_function_privilege('authenticated', probe_function, 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated unexpectedly inherits EXECUTE in a non-public schema';
  END IF;

  IF NOT has_function_privilege('postgres', probe_function, 'EXECUTE') THEN
    RAISE EXCEPTION 'postgres owner lost EXECUTE on its probe function';
  END IF;
END
$$;

DROP SCHEMA upstatus_acl_global_scope_probe_20261105 CASCADE;
