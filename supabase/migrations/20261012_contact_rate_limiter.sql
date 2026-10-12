-- Migration: 20261012_contact_rate_limiter.sql
-- Description: Creates the shared contact rate limit table and atomic RPC function
-- with multi-key locking, sliding window, burst cooldown, capacity protection, and TTL cleanup.

CREATE TABLE IF NOT EXISTS public.contact_rate_limits (
  key TEXT PRIMARY KEY,
  timestamps BIGINT[] NOT NULL DEFAULT '{}',
  last_updated BIGINT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Index on expires_at for efficient pruning of expired keys
CREATE INDEX IF NOT EXISTS idx_contact_rate_limits_expires_at
  ON public.contact_rate_limits (expires_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.contact_rate_limits ENABLE ROW LEVEL SECURITY;

-- Deny all direct public access; only accessible via SECURITY DEFINER RPC
DROP POLICY IF EXISTS "Deny direct public access to contact_rate_limits" ON public.contact_rate_limits;
CREATE POLICY "Deny direct public access to contact_rate_limits"
  ON public.contact_rate_limits
  FOR ALL
  TO public
  USING (false);

-- Atomic multi-key rate limit consumer function
CREATE OR REPLACE FUNCTION public.consume_contact_rate_limit(
  p_keys TEXT[],
  p_now BIGINT,
  p_window_ms BIGINT DEFAULT 600000,
  p_max_requests INT DEFAULT 5,
  p_cooldown_ms BIGINT DEFAULT 5000,
  p_max_store_size INT DEFAULT 1000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_window_start BIGINT := p_now - p_window_ms;
  v_key TEXT;
  v_rec RECORD;
  v_filtered_ts BIGINT[];
  v_last_ts BIGINT;
  v_active_count INT;
  v_total_keys INT;
  v_new_key_count INT := 0;
  v_retry_after INT;
  v_sorted_keys TEXT[];
BEGIN
  -- 1. TTL cleanup: Purge records whose expires_at is in the past
  DELETE FROM public.contact_rate_limits
  WHERE expires_at < to_timestamp(p_now / 1000.0);

  -- 2. Count current active entries in the store
  SELECT COUNT(*) INTO v_total_keys FROM public.contact_rate_limits;

  -- 3. Sort keys to ensure deterministic lock acquisition order (prevents deadlocks)
  SELECT array_agg(k ORDER BY k) INTO v_sorted_keys
  FROM (SELECT DISTINCT unnest(p_keys) AS k) sub;

  IF v_sorted_keys IS NULL OR array_length(v_sorted_keys, 1) = 0 THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

  -- 4. Check all keys under row-level locks
  FOREACH v_key IN ARRAY v_sorted_keys LOOP
    SELECT * INTO v_rec
    FROM public.contact_rate_limits
    WHERE key = v_key
    FOR UPDATE;

    IF NOT FOUND THEN
      v_new_key_count := v_new_key_count + 1;
    ELSE
      -- Filter timestamps inside active sliding window
      SELECT COALESCE(array_agg(ts), '{}'::BIGINT[]) INTO v_filtered_ts
      FROM unnest(v_rec.timestamps) AS ts
      WHERE ts > v_window_start;

      v_active_count := array_length(v_filtered_ts, 1);

      IF v_active_count IS NOT NULL AND v_active_count > 0 THEN
        -- Rapid burst cooldown check
        v_last_ts := v_filtered_ts[v_active_count];
        IF p_now - v_last_ts < p_cooldown_ms THEN
          v_retry_after := CEIL((p_cooldown_ms - (p_now - v_last_ts)) / 1000.0);
          RETURN jsonb_build_object(
            'allowed', false,
            'retryAfterSeconds', v_retry_after,
            'error', 'Please wait a moment before sending another message.'
          );
        END IF;

        -- Sliding window max requests threshold check
        IF v_active_count >= p_max_requests THEN
          v_retry_after := CEIL((v_filtered_ts[1] + p_window_ms - p_now) / 1000.0);
          RETURN jsonb_build_object(
            'allowed', false,
            'retryAfterSeconds', v_retry_after,
            'error', 'Too many inquiries submitted. Please wait a few minutes before trying again or reach out to our concierge directly.'
          );
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- 5. Store capacity check for new keys (fail closed if capacity reached with active keys)
  IF v_total_keys + v_new_key_count > p_max_store_size THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'Service is temporarily experiencing high volume. Please wait a few moments before trying again or reach out to our concierge directly.'
    );
  END IF;

  -- 6. All checks passed: commit updated timestamps atomically for all keys
  FOREACH v_key IN ARRAY v_sorted_keys LOOP
    SELECT * INTO v_rec
    FROM public.contact_rate_limits
    WHERE key = v_key
    FOR UPDATE;

    IF FOUND THEN
      SELECT COALESCE(array_agg(ts), '{}'::BIGINT[]) INTO v_filtered_ts
      FROM unnest(v_rec.timestamps) AS ts
      WHERE ts > v_window_start;

      IF v_filtered_ts IS NULL THEN
        v_filtered_ts := '{}'::BIGINT[];
      END IF;
      v_filtered_ts := array_append(v_filtered_ts, p_now);

      UPDATE public.contact_rate_limits
      SET timestamps = v_filtered_ts,
          last_updated = p_now,
          expires_at = to_timestamp((p_now + p_window_ms) / 1000.0)
      WHERE key = v_key;
    ELSE
      INSERT INTO public.contact_rate_limits (key, timestamps, last_updated, expires_at)
      VALUES (
        v_key,
        ARRAY[p_now],
        p_now,
        to_timestamp((p_now + p_window_ms) / 1000.0)
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Grant execution permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.consume_contact_rate_limit(
  TEXT[], BIGINT, BIGINT, INT, BIGINT, INT
) TO anon, authenticated, service_role;
