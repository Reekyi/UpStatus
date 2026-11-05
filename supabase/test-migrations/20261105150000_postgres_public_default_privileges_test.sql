-- TEST ONLY: apply to the isolated upstatus-security-test project
-- (bfpjtfqlnypisxljoxkb). Never apply this file to production or official TEST.
-- This mirrors the postgres-owned default-ACL remediation and verifies future objects.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated;

CREATE TABLE public.__upstatus_default_acl_probe_20261105 (id bigint);
CREATE SEQUENCE public.__upstatus_default_acl_probe_seq_20261105;
CREATE FUNCTION public.__upstatus_default_acl_probe_fn_20261105()
RETURNS integer LANGUAGE sql AS 'SELECT 1';

DO $$
DECLARE
  role_name text;
  privilege_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    FOREACH privilege_name IN ARRAY ARRAY[
      'SELECT', 'INSERT', 'UPDATE', 'DELETE',
      'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN'
    ] LOOP
      IF has_table_privilege(
        role_name,
        'public.__upstatus_default_acl_probe_20261105',
        privilege_name
      ) THEN
        RAISE EXCEPTION '% unexpectedly has % on the probe table',
          role_name, privilege_name;
      END IF;
    END LOOP;

    FOREACH privilege_name IN ARRAY ARRAY['USAGE', 'SELECT', 'UPDATE'] LOOP
      IF has_sequence_privilege(
        role_name,
        'public.__upstatus_default_acl_probe_seq_20261105',
        privilege_name
      ) THEN
        RAISE EXCEPTION '% unexpectedly has % on the probe sequence',
          role_name, privilege_name;
      END IF;
    END LOOP;

    IF has_function_privilege(
      role_name,
      'public.__upstatus_default_acl_probe_fn_20261105()',
      'EXECUTE'
    ) THEN
      RAISE EXCEPTION '% unexpectedly has EXECUTE on the probe function',
        role_name;
    END IF;
  END LOOP;

  IF NOT has_table_privilege(
    'service_role',
    'public.__upstatus_default_acl_probe_20261105',
    'SELECT'
  ) OR NOT has_sequence_privilege(
    'service_role',
    'public.__upstatus_default_acl_probe_seq_20261105',
    'USAGE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.__upstatus_default_acl_probe_fn_20261105()',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'service_role default access was not preserved';
  END IF;

  IF NOT has_table_privilege(
    'postgres',
    'public.__upstatus_default_acl_probe_20261105',
    'MAINTAIN'
  ) OR NOT has_sequence_privilege(
    'postgres',
    'public.__upstatus_default_acl_probe_seq_20261105',
    'USAGE'
  ) OR NOT has_function_privilege(
    'postgres',
    'public.__upstatus_default_acl_probe_fn_20261105()',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'postgres owner access was not preserved';
  END IF;
END
$$;

DROP FUNCTION public.__upstatus_default_acl_probe_fn_20261105();
DROP SEQUENCE public.__upstatus_default_acl_probe_seq_20261105;
DROP TABLE public.__upstatus_default_acl_probe_20261105;
