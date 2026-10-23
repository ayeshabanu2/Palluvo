-- Migration: 20261012_contact_rate_limiter.sql
-- Description: Creates the shared contact rate limit table, atomic consumer RPC,
-- and guaranteed cleanup function with HMAC-SHA256 digest identifiers,
-- server-derived policy constants, advisory capacity locking, row-level locks,
-- resilient two-phase capacity eviction against DoS, security_invoker bounded view,
-- and service_role-only execution.

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

-- Deny all direct public access; only accessible via service_role RPC
DROP POLICY IF EXISTS "Deny direct public access to contact_rate_limits" ON public.contact_rate_limits;
CREATE POLICY "Deny direct public access to contact_rate_limits"
  ON public.contact_rate_limits
  FOR ALL
  TO public
  USING (false);

-- Drop previous versions of functions if present
DROP FUNCTION IF EXISTS public.consume_contact_rate_limit(TEXT[], BIGINT, BIGINT, INT, BIGINT, INT);
DROP FUNCTION IF EXISTS public.consume_contact_rate_limit(TEXT[]);
DROP FUNCTION IF EXISTS public.prune_expired_contact_rate_limits();

-- Guaranteed/Scheduled Expiry Cleanup Function
CREATE OR REPLACE FUNCTION public.prune_expired_contact_rate_limits()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted INT;
BEGIN
  -- Strict server-only authorization
  IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') AND
     COALESCE(current_setting('request.jwt.claim.role', true), '') != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: prune function is restricted to server service_role credential';
  END IF;

  DELETE FROM public.contact_rate_limits
  WHERE expires_at < clock_timestamp();

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Revoke public execution for prune function
REVOKE ALL ON FUNCTION public.prune_expired_contact_rate_limits() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prune_expired_contact_rate_limits() FROM anon;
REVOKE ALL ON FUNCTION public.prune_expired_contact_rate_limits() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.prune_expired_contact_rate_limits() TO service_role;

-- Atomic multi-key rate limit consumer function
-- Takes ONLY p_keys containing non-reversible HMAC-SHA256 digests.
CREATE OR REPLACE FUNCTION public.consume_contact_rate_limit(
  p_keys TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  -- Policy constants derived strictly inside SQL (cannot be altered by callers)
  c_window_ms CONSTANT BIGINT := 600000;       -- 10 minutes sliding window
  c_max_requests CONSTANT INT := 5;            -- 5 inquiries max per window
  c_cooldown_ms CONSTANT BIGINT := 5000;       -- 5 seconds burst cooldown
  c_max_store_size CONSTANT INT := 1000;       -- 1000 active keys max
  c_max_keys CONSTANT INT := 2;                -- max 2 keys per check (IP and email digests)
  c_max_key_length CONSTANT INT := 120;        -- max characters per key (digest:sha256:<64-hex> is 79 chars)
  c_global_window_ms CONSTANT BIGINT := 60000; -- 1 minute sliding window for global admission
  c_max_global_requests CONSTANT INT := 120;   -- 120 submissions per minute max globally across all instances
  c_global_admission_key CONSTANT TEXT := 'digest:sha256:0000000000000000000000000000000000000000000000000000000000000000';

  -- Server-side timestamp derivation (prevents caller timestamp manipulation)
  v_now BIGINT := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  v_window_start BIGINT := v_now - c_window_ms;

  v_key TEXT;
  v_rec RECORD;
  v_global_rec RECORD;
  v_global_ts BIGINT[];
  v_filtered_ts BIGINT[];
  v_last_ts BIGINT;
  v_active_count INT;
  v_total_keys INT;
  v_new_key_count INT := 0;
  v_retry_after INT;
  v_sorted_keys TEXT[];
  v_needed_slots INT := 0;
  v_evicted_count INT := 0;
BEGIN
  -- 1. Authorization: Ensure execution is strictly performed by the server service_role credential
  IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') AND
     COALESCE(current_setting('request.jwt.claim.role', true), '') != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: rate limit function is restricted to server service_role credential';
  END IF;

  -- 2. Input Validation: strictly bound array size and element formats
  IF p_keys IS NULL OR array_length(p_keys, 1) IS NULL OR array_length(p_keys, 1) = 0 THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

  IF array_length(p_keys, 1) > c_max_keys THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'Too many rate limit keys specified.'
    );
  END IF;

  FOREACH v_key IN ARRAY p_keys LOOP
    IF v_key IS NULL OR length(v_key) < 15 OR length(v_key) > c_max_key_length THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'error', 'Invalid rate limiter key identifier.'
      );
    END IF;

    -- Enforce keyed digest format: rejects raw IP and raw email identifiers to protect user privacy
    IF NOT (v_key ~ '^digest:sha256:[0-9a-fA-F]{64}$') THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'error', 'Invalid rate limiter key format. Raw identifiers are rejected.'
      );
    END IF;
  END LOOP;

  -- 3. Sort keys to ensure deterministic lock acquisition order (prevents deadlocks)
  SELECT array_agg(k ORDER BY k) INTO v_sorted_keys
  FROM (SELECT DISTINCT unnest(p_keys) AS k) sub;

  -- 4. Acquire transactional advisory lock to serialize capacity check and reservations for concurrent new keys
  PERFORM pg_advisory_xact_lock(hashtext('contact_rate_limit_capacity_lock'));

  -- 5. TTL cleanup: Purge records whose expires_at is in the past
  DELETE FROM public.contact_rate_limits
  WHERE expires_at < to_timestamp(v_now / 1000.0);

  -- 5b. Shared global admission check across all distributed serverless instances (WAF / bot flood protection)
  SELECT * INTO v_global_rec
  FROM public.contact_rate_limits
  WHERE key = c_global_admission_key
  FOR UPDATE;

  IF FOUND THEN
    SELECT COALESCE(array_agg(ts), '{}'::BIGINT[]) INTO v_global_ts
    FROM unnest(v_global_rec.timestamps) AS ts
    WHERE ts > (v_now - c_global_window_ms);

    IF v_global_ts IS NULL THEN
      v_global_ts := '{}'::BIGINT[];
    END IF;

    IF array_length(v_global_ts, 1) >= c_max_global_requests THEN
      v_retry_after := CEIL((v_global_ts[1] + c_global_window_ms - v_now) / 1000.0);
      RETURN jsonb_build_object(
        'allowed', false,
        'retryAfterSeconds', v_retry_after,
        'error', 'Inquiry service is receiving unusually high traffic. Please wait a moment or contact our atelier directly via phone or WhatsApp.'
      );
    END IF;
  ELSE
    v_global_ts := '{}'::BIGINT[];
  END IF;

  -- Count every attempt entering the RPC against the global flood admission window
  -- (regardless of whether subsequent per-key checks or capacity limits reject the attempt).
  -- This prevents throttled callers from hammering the database with rejected requests
  -- without consuming the global admission budget.
  v_global_ts := array_append(v_global_ts, v_now);
  IF v_global_rec.key IS NOT NULL THEN
    UPDATE public.contact_rate_limits
    SET timestamps = v_global_ts,
        last_updated = v_now,
        expires_at = to_timestamp((v_now + c_global_window_ms) / 1000.0)
    WHERE key = c_global_admission_key;
  ELSE
    INSERT INTO public.contact_rate_limits (key, timestamps, last_updated, expires_at)
    VALUES (
      c_global_admission_key,
      v_global_ts,
      v_now,
      to_timestamp((v_now + c_global_window_ms) / 1000.0)
    );
  END IF;

  -- 6. Count current active client entries in the store (excluding global admission tracker)
  SELECT COUNT(*) INTO v_total_keys FROM public.contact_rate_limits WHERE key != c_global_admission_key;

  -- 7. Check all keys under row-level locks
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
        IF v_now - v_last_ts < c_cooldown_ms THEN
          v_retry_after := CEIL((c_cooldown_ms - (v_now - v_last_ts)) / 1000.0);
          RETURN jsonb_build_object(
            'allowed', false,
            'retryAfterSeconds', v_retry_after,
            'error', 'Please wait a moment before sending another message.'
          );
        END IF;

        -- Sliding window max requests threshold check
        IF v_active_count >= c_max_requests THEN
          v_retry_after := CEIL((v_filtered_ts[1] + c_window_ms - v_now) / 1000.0);
          RETURN jsonb_build_object(
            'allowed', false,
            'retryAfterSeconds', v_retry_after,
            'error', 'Too many inquiries submitted. Please wait a few minutes before trying again or reach out to our concierge directly.'
          );
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- 8. Resilient capacity strategy: prevent untrusted public submissions from globally exhausting the shared key budget
  -- If inserting new keys exceeds max store capacity, evict entries to make room for legitimate traffic
  -- rather than globally failing closed (which would allow an attacker rotating IPs/emails to DoS the service)
  IF v_new_key_count > 0 AND (v_total_keys + v_new_key_count > c_max_store_size) THEN
    v_needed_slots := (v_total_keys + v_new_key_count) - c_max_store_size;

    -- Phase 1: Evict un-throttled entries (single-use or low-frequency synthetic keys from rotated submissions)
    -- This strictly protects actively throttled quotas (keys with >= c_max_requests or in active burst cooldown)
    DELETE FROM public.contact_rate_limits
    WHERE key IN (
      SELECT key
      FROM public.contact_rate_limits
      WHERE key != ALL(v_sorted_keys)
        AND key != c_global_admission_key
        AND array_length(timestamps, 1) < c_max_requests
        AND (v_now - last_updated) >= c_cooldown_ms
      ORDER BY array_length(timestamps, 1) ASC, last_updated ASC
      LIMIT v_needed_slots
    );

    GET DIAGNOSTICS v_evicted_count = ROW_COUNT;

    -- Enforce hard storage capacity bound: if store remains full because remaining rows are actively throttled,
    -- do NOT insert new keys. Reject submission while strictly preserving all active throttled quotas intact.
    IF (v_total_keys - v_evicted_count + v_new_key_count) > c_max_store_size THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'retryAfterSeconds', 60,
        'error', 'Service is currently experiencing high inquiry volume. Please try again in a few moments or reach out to our concierge directly.'
      );
    END IF;
  END IF;

  -- 9. All checks passed: commit updated timestamps atomically for client keys
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
      v_filtered_ts := array_append(v_filtered_ts, v_now);

      UPDATE public.contact_rate_limits
      SET timestamps = v_filtered_ts,
          last_updated = v_now,
          expires_at = to_timestamp((v_now + c_window_ms) / 1000.0)
      WHERE key = v_key;
    ELSE
      INSERT INTO public.contact_rate_limits (key, timestamps, last_updated, expires_at)
      VALUES (
        v_key,
        ARRAY[v_now],
        v_now,
        to_timestamp((v_now + c_window_ms) / 1000.0)
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Revoke all execution rights from public, anon, and authenticated roles
REVOKE ALL ON FUNCTION public.consume_contact_rate_limit(TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_contact_rate_limit(TEXT[]) FROM anon;
REVOKE ALL ON FUNCTION public.consume_contact_rate_limit(TEXT[]) FROM authenticated;

-- Grant execution EXCLUSIVELY to service_role (server-only credential)
GRANT EXECUTE ON FUNCTION public.consume_contact_rate_limit(TEXT[]) TO service_role;

-- Provision pg_cron extension for durable scheduled database-level cleanup
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule durable automated pruning every 10 minutes
DO $$
BEGIN
  -- Unschedule existing job if already registered to ensure idempotency across migration runs
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'prune-expired-contact-rate-limits'
  ) THEN
    PERFORM cron.unschedule('prune-expired-contact-rate-limits');
  END IF;

  PERFORM cron.schedule(
    'prune-expired-contact-rate-limits',
    '*/10 * * * *',
    'SELECT public.prune_expired_contact_rate_limits()'
  );
END;
$$;

-- Bounded retention view: guarantees expired identifier digests are never exposed.
-- Configured with security_invoker = true so view queries enforce underlying table RLS policies,
-- and explicitly restricted from public/anon/authenticated roles (granted only to service_role).
CREATE OR REPLACE VIEW public.active_contact_rate_limits
WITH (security_invoker = true) AS
  SELECT key, timestamps, last_updated, expires_at
  FROM public.contact_rate_limits
  WHERE expires_at >= clock_timestamp();

-- Revoke all view permissions from public roles
REVOKE ALL ON public.active_contact_rate_limits FROM PUBLIC;
REVOKE ALL ON public.active_contact_rate_limits FROM anon;
REVOKE ALL ON public.active_contact_rate_limits FROM authenticated;

-- Grant SELECT exclusively to service_role (server-only credential)
GRANT SELECT ON public.active_contact_rate_limits TO service_role;


