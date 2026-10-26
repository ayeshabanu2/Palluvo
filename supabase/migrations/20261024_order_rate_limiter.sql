-- Migration: 20261024_order_rate_limiter.sql
-- Description: Creates the shared order rate limit table, idempotency records table,
-- atomic order slot acquisition RPC (acquire_order_slot), finalization RPC (finalize_order_slot),
-- and cleanup function with row-level locks, advisory capacity locking, and service_role security.

CREATE TABLE IF NOT EXISTS public.order_rate_limits (
  key TEXT PRIMARY KEY,
  timestamps BIGINT[] NOT NULL DEFAULT '{}',
  last_updated BIGINT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_rate_limits_expires_at
  ON public.order_rate_limits (expires_at);

ALTER TABLE public.order_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny direct public access to order_rate_limits" ON public.order_rate_limits;
CREATE POLICY "Deny direct public access to order_rate_limits"
  ON public.order_rate_limits
  FOR ALL
  TO public
  USING (false);

CREATE TABLE IF NOT EXISTS public.order_idempotency_records (
  fingerprint TEXT PRIMARY KEY,
  in_flight BOOLEAN NOT NULL DEFAULT true,
  order_data JSONB,
  created_at BIGINT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_idempotency_records_expires_at
  ON public.order_idempotency_records (expires_at);

ALTER TABLE public.order_idempotency_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny direct public access to order_idempotency_records" ON public.order_idempotency_records;
CREATE POLICY "Deny direct public access to order_idempotency_records"
  ON public.order_idempotency_records
  FOR ALL
  TO public
  USING (false);

-- Drop previous function signatures if present
DROP FUNCTION IF EXISTS public.acquire_order_slot(TEXT, TEXT, TEXT, BIGINT, INT, INT, BIGINT, BIGINT, INT, BIGINT, INT);
DROP FUNCTION IF EXISTS public.acquire_order_slot(TEXT, TEXT, TEXT, TEXT, BIGINT, INT, INT, BIGINT, BIGINT, INT, BIGINT, INT);
DROP FUNCTION IF EXISTS public.finalize_order_slot(TEXT, JSONB, BIGINT);
DROP FUNCTION IF EXISTS public.prune_expired_order_rate_limits();

-- Prune function for scheduled cleanup of expired order rate limits and idempotency markers
CREATE OR REPLACE FUNCTION public.prune_expired_order_rate_limits()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_limits INT;
  v_deleted_idem INT;
BEGIN
  IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') AND
     COALESCE(current_setting('request.jwt.claim.role', true), '') != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: prune function is restricted to server service_role credential';
  END IF;

  DELETE FROM public.order_rate_limits WHERE expires_at < clock_timestamp();
  GET DIAGNOSTICS v_deleted_limits = ROW_COUNT;

  DELETE FROM public.order_idempotency_records WHERE expires_at < clock_timestamp();
  GET DIAGNOSTICS v_deleted_idem = ROW_COUNT;

  RETURN v_deleted_limits + v_deleted_idem;
END;
$$;

REVOKE ALL ON FUNCTION public.prune_expired_order_rate_limits() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prune_expired_order_rate_limits() FROM anon;
REVOKE ALL ON FUNCTION public.prune_expired_order_rate_limits() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.prune_expired_order_rate_limits() TO service_role;

-- Atomic Order Slot Acquisition RPC
-- Checks idempotency, global burst limit, per-IP limit & cooldown, and per-Email limit & cooldown.
-- Reserves in-flight slot if allowed.
CREATE OR REPLACE FUNCTION public.acquire_order_slot(
  p_ip_key TEXT,
  p_email_key TEXT,
  p_account_key TEXT DEFAULT NULL,
  p_fingerprint TEXT DEFAULT NULL,
  p_window_ms BIGINT DEFAULT 600000,           -- 10 minutes sliding window
  p_max_ip INT DEFAULT 5,                      -- max 5 orders per 10m per IP
  p_max_email INT DEFAULT 3,                   -- max 3 orders per 10m per email
  p_cooldown_ms BIGINT DEFAULT 5000,           -- 5s cooldown between orders
  p_global_window_ms BIGINT DEFAULT 60000,     -- 1 minute global window
  p_max_global INT DEFAULT 30,                 -- max 30 orders/min globally
  p_idempotency_window_ms BIGINT DEFAULT 60000, -- 60s idempotency window
  p_max_store_size INT DEFAULT 1000            -- max tracked keys
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now BIGINT := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  v_global_rec RECORD;
  v_global_ts BIGINT[];
  v_ip_rec RECORD;
  v_ip_ts BIGINT[];
  v_email_rec RECORD;
  v_email_ts BIGINT[];
  v_account_rec RECORD;
  v_account_ts BIGINT[];
  v_idem_rec RECORD;
  c_global_key CONSTANT TEXT := 'order_limit:global';
BEGIN
  -- 1. Authorization check
  IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') AND
     COALESCE(current_setting('request.jwt.claim.role', true), '') != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: acquire_order_slot is restricted to server service_role credential';
  END IF;

  -- 2. Transactional advisory lock to serialize capacity and reservation
  PERFORM pg_advisory_xact_lock(hashtext('palluvo_order_slot_reservation_lock'));

  -- 3. Opportunistic cleanup of expired rows
  DELETE FROM public.order_rate_limits WHERE expires_at < to_timestamp(v_now / 1000.0);
  DELETE FROM public.order_idempotency_records WHERE expires_at < to_timestamp(v_now / 1000.0);

  -- 4. Idempotency Check
  IF p_fingerprint IS NOT NULL AND length(trim(p_fingerprint)) > 0 THEN
    SELECT * INTO v_idem_rec
    FROM public.order_idempotency_records
    WHERE fingerprint = p_fingerprint
    FOR UPDATE;

    IF FOUND THEN
      IF v_idem_rec.in_flight THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'isDuplicate', true,
          'slotAcquired', false,
          'error', 'An order with identical items and delivery details is currently being processed. Please wait a moment.'
        );
      ELSIF v_idem_rec.order_data IS NOT NULL THEN
        RETURN jsonb_build_object(
          'allowed', true,
          'isDuplicate', true,
          'slotAcquired', false,
          'existingOrder', v_idem_rec.order_data
        );
      END IF;
    END IF;
  END IF;

  -- 5. Global Burst Check
  SELECT * INTO v_global_rec
  FROM public.order_rate_limits
  WHERE key = c_global_key
  FOR UPDATE;

  IF FOUND THEN
    SELECT COALESCE(array_agg(ts), '{}'::BIGINT[]) INTO v_global_ts
    FROM unnest(v_global_rec.timestamps) AS ts
    WHERE ts > (v_now - p_global_window_ms);

    IF v_global_ts IS NULL THEN
      v_global_ts := '{}'::BIGINT[];
    END IF;

    IF array_length(v_global_ts, 1) >= p_max_global THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'slotAcquired', false,
        'error', 'Order processing service is currently experiencing unusually high traffic. Please try again in one minute.'
      );
    END IF;
  ELSE
    v_global_ts := '{}'::BIGINT[];
  END IF;

  -- 6. Per-IP Check
  IF p_ip_key IS NOT NULL AND length(trim(p_ip_key)) > 0 AND p_ip_key != 'ip:unknown' THEN
    SELECT * INTO v_ip_rec
    FROM public.order_rate_limits
    WHERE key = p_ip_key
    FOR UPDATE;

    IF FOUND THEN
      SELECT COALESCE(array_agg(ts), '{}'::BIGINT[]) INTO v_ip_ts
      FROM unnest(v_ip_rec.timestamps) AS ts
      WHERE ts > (v_now - p_window_ms);

      IF v_ip_ts IS NULL THEN
        v_ip_ts := '{}'::BIGINT[];
      END IF;

      -- Cooldown check
      IF v_now - v_ip_rec.last_updated < p_cooldown_ms THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'slotAcquired', false,
          'error', 'Please wait a few seconds before placing another order.'
        );
      END IF;

      -- Window count check
      IF array_length(v_ip_ts, 1) >= p_max_ip THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'slotAcquired', false,
          'error', 'Too many orders have been placed from your connection. Please wait 10 minutes before attempting another order.'
        );
      END IF;
    ELSE
      v_ip_ts := '{}'::BIGINT[];
    END IF;
  END IF;

  -- 7. Per-Email Check
  IF p_email_key IS NOT NULL AND length(trim(p_email_key)) > 0 THEN
    SELECT * INTO v_email_rec
    FROM public.order_rate_limits
    WHERE key = p_email_key
    FOR UPDATE;

    IF FOUND THEN
      SELECT COALESCE(array_agg(ts), '{}'::BIGINT[]) INTO v_email_ts
      FROM unnest(v_email_rec.timestamps) AS ts
      WHERE ts > (v_now - p_window_ms);

      IF v_email_ts IS NULL THEN
        v_email_ts := '{}'::BIGINT[];
      END IF;

      -- Cooldown check
      IF v_now - v_email_rec.last_updated < p_cooldown_ms THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'slotAcquired', false,
          'error', 'Please wait a few seconds before placing another order.'
        );
      END IF;

      -- Window count check
      IF array_length(v_email_ts, 1) >= p_max_email THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'slotAcquired', false,
          'error', 'Maximum order placement attempts reached for this email address. Please try again in 10 minutes.'
        );
      END IF;
    ELSE
      v_email_ts := '{}'::BIGINT[];
    END IF;
  END IF;

  -- 8. Per-Account Check (separate quota key based on authenticated user's confirmed email principal)
  IF p_account_key IS NOT NULL AND length(trim(p_account_key)) > 0 AND p_account_key != COALESCE(p_email_key, '') THEN
    SELECT * INTO v_account_rec
    FROM public.order_rate_limits
    WHERE key = p_account_key
    FOR UPDATE;

    IF FOUND THEN
      SELECT COALESCE(array_agg(ts), '{}'::BIGINT[]) INTO v_account_ts
      FROM unnest(v_account_rec.timestamps) AS ts
      WHERE ts > (v_now - p_window_ms);

      IF v_account_ts IS NULL THEN
        v_account_ts := '{}'::BIGINT[];
      END IF;

      -- Cooldown check
      IF v_now - v_account_rec.last_updated < p_cooldown_ms THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'slotAcquired', false,
          'error', 'Please wait a few seconds before placing another order.'
        );
      END IF;

      -- Window count check
      IF array_length(v_account_ts, 1) >= p_max_email THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'slotAcquired', false,
          'error', 'Maximum order placement attempts reached for this account. Please try again in 10 minutes.'
        );
      END IF;
    ELSE
      v_account_ts := '{}'::BIGINT[];
    END IF;
  END IF;

  -- 9. Commit Reservations Atomically
  -- Global record
  v_global_ts := array_append(v_global_ts, v_now);
  INSERT INTO public.order_rate_limits (key, timestamps, last_updated, expires_at)
  VALUES (
    c_global_key,
    v_global_ts,
    v_now,
    to_timestamp((v_now + p_global_window_ms) / 1000.0)
  )
  ON CONFLICT (key) DO UPDATE
  SET timestamps = v_global_ts,
      last_updated = v_now,
      expires_at = to_timestamp((v_now + p_global_window_ms) / 1000.0);

  -- IP record
  IF p_ip_key IS NOT NULL AND length(trim(p_ip_key)) > 0 AND p_ip_key != 'ip:unknown' THEN
    v_ip_ts := array_append(v_ip_ts, v_now);
    INSERT INTO public.order_rate_limits (key, timestamps, last_updated, expires_at)
    VALUES (
      p_ip_key,
      v_ip_ts,
      v_now,
      to_timestamp((v_now + p_window_ms) / 1000.0)
    )
    ON CONFLICT (key) DO UPDATE
    SET timestamps = v_ip_ts,
        last_updated = v_now,
        expires_at = to_timestamp((v_now + p_window_ms) / 1000.0);
  END IF;

  -- Email record
  IF p_email_key IS NOT NULL AND length(trim(p_email_key)) > 0 THEN
    v_email_ts := array_append(v_email_ts, v_now);
    INSERT INTO public.order_rate_limits (key, timestamps, last_updated, expires_at)
    VALUES (
      p_email_key,
      v_email_ts,
      v_now,
      to_timestamp((v_now + p_window_ms) / 1000.0)
    )
    ON CONFLICT (key) DO UPDATE
    SET timestamps = v_email_ts,
        last_updated = v_now,
        expires_at = to_timestamp((v_now + p_window_ms) / 1000.0);
  END IF;

  -- Account record
  IF p_account_key IS NOT NULL AND length(trim(p_account_key)) > 0 THEN
    v_account_ts := array_append(COALESCE(v_account_ts, '{}'::BIGINT[]), v_now);
    INSERT INTO public.order_rate_limits (key, timestamps, last_updated, expires_at)
    VALUES (
      p_account_key,
      v_account_ts,
      v_now,
      to_timestamp((v_now + p_window_ms) / 1000.0)
    )
    ON CONFLICT (key) DO UPDATE
    SET timestamps = v_account_ts,
        last_updated = v_now,
        expires_at = to_timestamp((v_now + p_window_ms) / 1000.0);
  END IF;

  -- Idempotency reservation (in-flight)
  IF p_fingerprint IS NOT NULL AND length(trim(p_fingerprint)) > 0 THEN
    INSERT INTO public.order_idempotency_records (fingerprint, in_flight, order_data, created_at, expires_at)
    VALUES (
      p_fingerprint,
      true,
      NULL,
      v_now,
      to_timestamp((v_now + p_idempotency_window_ms) / 1000.0)
    )
    ON CONFLICT (fingerprint) DO UPDATE
    SET in_flight = true,
        order_data = NULL,
        created_at = v_now,
        expires_at = to_timestamp((v_now + p_idempotency_window_ms) / 1000.0);
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'isDuplicate', false,
    'slotAcquired', true
  );
END;
$$;

-- Backward-compatible 11-argument wrapper overload
CREATE OR REPLACE FUNCTION public.acquire_order_slot(
  p_ip_key TEXT,
  p_email_key TEXT,
  p_fingerprint TEXT,
  p_window_ms BIGINT,
  p_max_ip INT,
  p_max_email INT,
  p_cooldown_ms BIGINT,
  p_global_window_ms BIGINT,
  p_max_global INT,
  p_idempotency_window_ms BIGINT,
  p_max_store_size INT
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.acquire_order_slot(
    p_ip_key,
    p_email_key,
    NULL,
    p_fingerprint,
    p_window_ms,
    p_max_ip,
    p_max_email,
    p_cooldown_ms,
    p_global_window_ms,
    p_max_global,
    p_idempotency_window_ms,
    p_max_store_size
  );
$$;

REVOKE ALL ON FUNCTION public.acquire_order_slot(TEXT, TEXT, TEXT, TEXT, BIGINT, INT, INT, BIGINT, BIGINT, INT, BIGINT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.acquire_order_slot(TEXT, TEXT, TEXT, TEXT, BIGINT, INT, INT, BIGINT, BIGINT, INT, BIGINT, INT) FROM anon;
REVOKE ALL ON FUNCTION public.acquire_order_slot(TEXT, TEXT, TEXT, TEXT, BIGINT, INT, INT, BIGINT, BIGINT, INT, BIGINT, INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_order_slot(TEXT, TEXT, TEXT, TEXT, BIGINT, INT, INT, BIGINT, BIGINT, INT, BIGINT, INT) TO service_role;

REVOKE ALL ON FUNCTION public.acquire_order_slot(TEXT, TEXT, TEXT, BIGINT, INT, INT, BIGINT, BIGINT, INT, BIGINT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.acquire_order_slot(TEXT, TEXT, TEXT, BIGINT, INT, INT, BIGINT, BIGINT, INT, BIGINT, INT) FROM anon;
REVOKE ALL ON FUNCTION public.acquire_order_slot(TEXT, TEXT, TEXT, BIGINT, INT, INT, BIGINT, BIGINT, INT, BIGINT, INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_order_slot(TEXT, TEXT, TEXT, BIGINT, INT, INT, BIGINT, BIGINT, INT, BIGINT, INT) TO service_role;

-- Finalize Order Slot RPC
-- If p_order_data is provided: marks slot completed and caches order data for idempotency window.
-- If p_order_data is NULL: ONLY deletes if the slot is still in_flight (preserves cached completed orders).
CREATE OR REPLACE FUNCTION public.finalize_order_slot(
  p_fingerprint TEXT,
  p_order_data JSONB DEFAULT NULL,
  p_idempotency_window_ms BIGINT DEFAULT 60000
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now BIGINT := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
BEGIN
  IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') AND
     COALESCE(current_setting('request.jwt.claim.role', true), '') != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: finalize_order_slot is restricted to server service_role credential';
  END IF;

  IF p_fingerprint IS NULL OR length(trim(p_fingerprint)) = 0 THEN
    RETURN;
  END IF;

  IF p_order_data IS NOT NULL THEN
    -- Cache completed order
    UPDATE public.order_idempotency_records
    SET in_flight = false,
        order_data = p_order_data,
        expires_at = to_timestamp((v_now + p_idempotency_window_ms) / 1000.0)
    WHERE fingerprint = p_fingerprint;
  ELSE
    -- Only release reservation if currently in_flight. NEVER delete an already completed order!
    DELETE FROM public.order_idempotency_records
    WHERE fingerprint = p_fingerprint AND in_flight = true;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_order_slot(TEXT, JSONB, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_order_slot(TEXT, JSONB, BIGINT) FROM anon;
REVOKE ALL ON FUNCTION public.finalize_order_slot(TEXT, JSONB, BIGINT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_order_slot(TEXT, JSONB, BIGINT) TO service_role;
