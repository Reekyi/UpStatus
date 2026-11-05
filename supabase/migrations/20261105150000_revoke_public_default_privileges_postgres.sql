-- Harden future public objects created by the postgres migration owner.
-- Keep service_role grants: UpStatus Edge Functions use the service-role client.
-- supabase_admin defaults are intentionally excluded because the migration executor
-- is postgres and has no membership in supabase_admin; handle that owner separately
-- through a supported administrative path.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated;
