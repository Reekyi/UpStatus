-- Isolated-only setup-invite rate-limit schema and privilege regression.
-- This file belongs only in supabase/test-migrations and must never be applied to production.

CREATE TABLE IF NOT EXISTS public.upstatus_setup_invite_rate_limits (
  bucket_key text PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  hit_count integer NOT NULL CHECK (hit_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp()
);

CREATE INDEX IF NOT EXISTS upstatus_setup_invite_rate_limits_updated_at_idx
  ON public.upstatus_setup_invite_rate_limits (updated_at);

ALTER TABLE public.upstatus_setup_invite_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.upstatus_setup_invite_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.upstatus_setup_invite_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_upstatus_setup_invite_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer DEFAULT 900
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_count integer;
BEGIN
  IF p_bucket_key IS NULL OR pg_catalog.btrim(p_bucket_key) = '' OR pg_catalog.length(p_bucket_key) > 256 THEN
    RAISE EXCEPTION 'invalid bucket key';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 10000 THEN
    RAISE EXCEPTION 'invalid limit';
  END IF;
  IF p_window_seconds IS NULL OR p_window_seconds < 1 OR p_window_seconds > 3600 THEN
    RAISE EXCEPTION 'invalid window';
  END IF;

  INSERT INTO public.upstatus_setup_invite_rate_limits(bucket_key, window_started_at, hit_count, updated_at)
  VALUES (p_bucket_key, v_now, 1, v_now)
  ON CONFLICT (bucket_key) DO UPDATE SET
    window_started_at = CASE
      WHEN public.upstatus_setup_invite_rate_limits.window_started_at <= v_now - pg_catalog.make_interval(secs => p_window_seconds)
      THEN v_now
      ELSE public.upstatus_setup_invite_rate_limits.window_started_at
    END,
    hit_count = CASE
      WHEN public.upstatus_setup_invite_rate_limits.window_started_at <= v_now - pg_catalog.make_interval(secs => p_window_seconds)
      THEN 1
      ELSE public.upstatus_setup_invite_rate_limits.hit_count + 1
    END,
    updated_at = v_now
  RETURNING hit_count INTO v_count;

  IF pg_catalog.mod(pg_catalog.hashtext(p_bucket_key)::bigint, 64) = 0 THEN
    WITH stale AS (
      SELECT bucket_key
      FROM public.upstatus_setup_invite_rate_limits
      WHERE updated_at < v_now - interval '1 day'
      ORDER BY updated_at ASC, bucket_key ASC
      LIMIT 100
      FOR UPDATE SKIP LOCKED
    )
    DELETE FROM public.upstatus_setup_invite_rate_limits AS target
    USING stale
    WHERE target.bucket_key = stale.bucket_key;
  END IF;

  RETURN v_count <= p_limit;
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_upstatus_setup_invite_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_upstatus_setup_invite_rate_limit(text, integer, integer) TO service_role;

DO $test$
DECLARE
  v_function oid;
  v_security_definer boolean;
  v_search_path text;
  v_rls boolean;
BEGIN
  SELECT p.oid, p.prosecdef,
         (
           SELECT pg_catalog.replace(pg_catalog.split_part(setting, '=', 2), '"', '')
           FROM pg_catalog.unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS config(setting)
           WHERE setting LIKE 'search_path=%'
           LIMIT 1
         )
    INTO v_function, v_security_definer, v_search_path
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'consume_upstatus_setup_invite_rate_limit'
    AND pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_bucket_key text, p_limit integer, p_window_seconds integer';

  IF v_function IS NULL THEN RAISE EXCEPTION 'setup invite rate-limit RPC is missing'; END IF;
  IF v_security_definer THEN RAISE EXCEPTION 'setup invite rate-limit RPC must remain SECURITY INVOKER'; END IF;
  IF v_search_path IS DISTINCT FROM '' THEN RAISE EXCEPTION 'setup invite rate-limit RPC must pin an empty search_path (got %)', v_search_path; END IF;
  IF NOT pg_catalog.has_function_privilege('service_role', v_function, 'EXECUTE') THEN RAISE EXCEPTION 'service_role must execute setup invite rate-limit RPC'; END IF;
  IF pg_catalog.has_function_privilege('anon', v_function, 'EXECUTE') OR pg_catalog.has_function_privilege('authenticated', v_function, 'EXECUTE') THEN
    RAISE EXCEPTION 'client roles must not execute setup invite rate-limit RPC';
  END IF;

  SELECT c.relrowsecurity INTO v_rls
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'upstatus_setup_invite_rate_limits';

  IF NOT COALESCE(v_rls, false) THEN RAISE EXCEPTION 'setup invite rate-limit table must have RLS enabled'; END IF;
  IF NOT pg_catalog.has_table_privilege('service_role', 'public.upstatus_setup_invite_rate_limits', 'SELECT') OR
     NOT pg_catalog.has_table_privilege('service_role', 'public.upstatus_setup_invite_rate_limits', 'INSERT') OR
     NOT pg_catalog.has_table_privilege('service_role', 'public.upstatus_setup_invite_rate_limits', 'UPDATE') OR
     NOT pg_catalog.has_table_privilege('service_role', 'public.upstatus_setup_invite_rate_limits', 'DELETE') THEN
    RAISE EXCEPTION 'service_role must retain rate-limit table access';
  END IF;
  IF pg_catalog.has_table_privilege('anon', 'public.upstatus_setup_invite_rate_limits', 'SELECT') OR
     pg_catalog.has_table_privilege('anon', 'public.upstatus_setup_invite_rate_limits', 'INSERT') OR
     pg_catalog.has_table_privilege('anon', 'public.upstatus_setup_invite_rate_limits', 'UPDATE') OR
     pg_catalog.has_table_privilege('anon', 'public.upstatus_setup_invite_rate_limits', 'DELETE') OR
     pg_catalog.has_table_privilege('authenticated', 'public.upstatus_setup_invite_rate_limits', 'SELECT') OR
     pg_catalog.has_table_privilege('authenticated', 'public.upstatus_setup_invite_rate_limits', 'INSERT') OR
     pg_catalog.has_table_privilege('authenticated', 'public.upstatus_setup_invite_rate_limits', 'UPDATE') OR
     pg_catalog.has_table_privilege('authenticated', 'public.upstatus_setup_invite_rate_limits', 'DELETE') THEN
    RAISE EXCEPTION 'client roles must not access setup invite rate-limit buckets';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='upstatus_setup_invite_rate_limits') THEN
    RAISE EXCEPTION 'setup invite rate-limit table must not expose client policies';
  END IF;
END;
$test$;
