-- Test-only follow-up: bound opportunistic cleanup to at most 100 stale buckets per call.
-- This file must remain under supabase/test-migrations/ and must never enter production CLI migrations.

CREATE OR REPLACE FUNCTION public.consume_upstatus_signal_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer DEFAULT 60
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

  INSERT INTO public.upstatus_signal_rate_limits(bucket_key, window_started_at, hit_count, updated_at)
  VALUES (p_bucket_key, v_now, 1, v_now)
  ON CONFLICT (bucket_key) DO UPDATE SET
    window_started_at = CASE
      WHEN public.upstatus_signal_rate_limits.window_started_at <= v_now - pg_catalog.make_interval(secs => p_window_seconds)
      THEN v_now
      ELSE public.upstatus_signal_rate_limits.window_started_at
    END,
    hit_count = CASE
      WHEN public.upstatus_signal_rate_limits.window_started_at <= v_now - pg_catalog.make_interval(secs => p_window_seconds)
      THEN 1
      ELSE public.upstatus_signal_rate_limits.hit_count + 1
    END,
    updated_at = v_now
  RETURNING hit_count INTO v_count;

  IF pg_catalog.mod(pg_catalog.hashtext(p_bucket_key)::bigint, 64) = 0 THEN
    WITH stale AS (
      SELECT bucket_key
      FROM public.upstatus_signal_rate_limits
      WHERE updated_at < v_now - interval '1 day'
      ORDER BY updated_at ASC, bucket_key ASC
      LIMIT 100
      FOR UPDATE SKIP LOCKED
    )
    DELETE FROM public.upstatus_signal_rate_limits AS target
    USING stale
    WHERE target.bucket_key = stale.bucket_key;
  END IF;

  RETURN v_count <= p_limit;
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_upstatus_signal_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_upstatus_signal_rate_limit(text, integer, integer) TO service_role;

-- Execute a deterministic bounded-cleanup regression on the isolated test database.
DO $test$
DECLARE
  v_probe_key text;
  v_remaining integer;
  v_preexisting_stale integer;
BEGIN
  -- The cleanup query is global; require a clean stale-bucket baseline so this
  -- regression proves its own 150 -> 50 result rather than deleting older fixtures.
  SELECT count(*)
  INTO v_preexisting_stale
  FROM public.upstatus_signal_rate_limits
  WHERE updated_at < pg_catalog.clock_timestamp() - interval '1 day';

  IF v_preexisting_stale <> 0 THEN
    RAISE EXCEPTION 'bounded cleanup regression requires zero pre-existing stale buckets; found %', v_preexisting_stale;
  END IF;

  SELECT '__bounded_cleanup_probe_' || series.n::text
  INTO v_probe_key
  FROM pg_catalog.generate_series(1, 10000) AS series(n)
  WHERE pg_catalog.mod(
    pg_catalog.hashtext('__bounded_cleanup_probe_' || series.n::text)::bigint,
    64
  ) = 0
  LIMIT 1;

  IF v_probe_key IS NULL THEN
    RAISE EXCEPTION 'could not derive a deterministic cleanup probe key';
  END IF;

  INSERT INTO public.upstatus_signal_rate_limits(bucket_key, window_started_at, hit_count, updated_at)
  SELECT
    '__bounded_cleanup_expired_' || series.n::text,
    pg_catalog.clock_timestamp() - interval '2 days',
    1,
    pg_catalog.clock_timestamp() - interval '2 days'
  FROM pg_catalog.generate_series(1, 150) AS series(n)
  ON CONFLICT (bucket_key) DO UPDATE SET
    window_started_at = EXCLUDED.window_started_at,
    hit_count = EXCLUDED.hit_count,
    updated_at = EXCLUDED.updated_at;

  PERFORM public.consume_upstatus_signal_rate_limit(v_probe_key, 100, 60);

  SELECT count(*)
  INTO v_remaining
  FROM public.upstatus_signal_rate_limits
  WHERE pg_catalog.left(bucket_key, pg_catalog.length('__bounded_cleanup_expired_')) = '__bounded_cleanup_expired_';

  IF v_remaining <> 50 THEN
    RAISE EXCEPTION 'bounded cleanup expected exactly 50 stale buckets to remain after deleting at most 100; found %', v_remaining;
  END IF;

  DELETE FROM public.upstatus_signal_rate_limits
  WHERE pg_catalog.left(bucket_key, pg_catalog.length('__bounded_cleanup_expired_')) = '__bounded_cleanup_expired_'
     OR bucket_key = v_probe_key;
END;
$test$;
