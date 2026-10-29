-- Security hardening for trigger-only broadcast functions.
-- These SECURITY DEFINER functions are invoked by existing table triggers, not by clients.
-- Revoke direct RPC execution from PUBLIC/anon/authenticated while preserving trigger behavior.
-- Conditional lookup keeps this migration safe on environments where a function is not present yet.
DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    to_regprocedure('public.upstatus_broadcast_messages()'),
    to_regprocedure('public.upstatus_broadcast_remote_state()'),
    to_regprocedure('public.upstatus_broadcast_users()')
  ]
  LOOP
    IF fn IS NOT NULL THEN
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
        fn
      );
    END IF;
  END LOOP;
END
$$;
