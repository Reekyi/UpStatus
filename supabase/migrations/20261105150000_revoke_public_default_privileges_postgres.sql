-- Harden future public objects created by the postgres migration owner.
-- Keep service_role grants: UpStatus Edge Functions use the service-role client.
-- The schema-specific revokes remove anon/authenticated defaults for public tables,
-- functions and sequences. PostgreSQL's global function default also grants EXECUTE
-- to PUBLIC, so remove that separately for functions created by postgres in any schema.
-- supabase_admin defaults are intentionally excluded: the migration executor is
-- postgres and has no membership in supabase_admin. Handle that owner separately
-- through a supported administrative path.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
