-- Distributed, per-admin throttling for first-access invite issuance.
-- This migration is candidate-only until reviewed and coordinated with AUTH-03 rollout.

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

  -- Opportunistic cleanup is bounded so one request cannot delete an unbounded
  -- number of stale buckets or monopolize the rate-limit table.
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

COMMENT ON TABLE public.upstatus_setup_invite_rate_limits IS
  'Distributed fixed-window counters for authenticated first-access invite issuance; keys contain hashed admin identities.';
COMMENT ON FUNCTION public.consume_upstatus_setup_invite_rate_limit(text, integer, integer) IS
  'Atomically consumes a per-admin setup-invite issuance allowance; service_role only.';
