-- Defense in depth for trigger-only SECURITY DEFINER broadcast functions.
-- Their bodies use schema-qualified realtime.send and pg_catalog built-ins.
-- An empty function search_path prevents object shadowing during trigger execution.
-- Existing trigger bindings and service_role-only EXECUTE grants are unchanged.
ALTER FUNCTION public.upstatus_broadcast_messages() SET search_path = '';
ALTER FUNCTION public.upstatus_broadcast_remote_state() SET search_path = '';
ALTER FUNCTION public.upstatus_broadcast_users() SET search_path = '';
