-- Migration: 20261028_payment_sessions.sql
-- Description: Creates the shared payment sessions and replay transactions tables,
-- atomic session creation/saving (save_payment_session), atomic session consumption
-- and payment replay prevention RPC (consume_payment_session), and cleanup function
-- with row-level locks, service_role security, and cross-instance persistence.

CREATE TABLE IF NOT EXISTS public.payment_sessions (
  id TEXT PRIMARY KEY,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  session_token TEXT NOT NULL,
  client_ip TEXT,
  order_number TEXT,
  consumed BOOLEAN NOT NULL DEFAULT false,
  created_at BIGINT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_sessions_expires_at
  ON public.payment_sessions (expires_at);

CREATE INDEX IF NOT EXISTS idx_payment_sessions_order_number
  ON public.payment_sessions (order_number);

ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny direct public access to payment_sessions" ON public.payment_sessions;
CREATE POLICY "Deny direct public access to payment_sessions"
  ON public.payment_sessions
  FOR ALL
  TO public
  USING (false);

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  payment_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES public.payment_sessions(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at BIGINT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed';

CREATE INDEX IF NOT EXISTS idx_payment_transactions_expires_at
  ON public.payment_transactions (expires_at);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_number
  ON public.payment_transactions (order_number);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status
  ON public.payment_transactions (status);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny direct public access to payment_transactions" ON public.payment_transactions;
CREATE POLICY "Deny direct public access to payment_transactions"
  ON public.payment_transactions
  FOR ALL
  TO public
  USING (false);

-- Drop previous function signatures if present
DROP FUNCTION IF EXISTS public.claim_payment_session(TEXT, TEXT, TEXT, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.release_payment_claim(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.save_payment_session(TEXT, NUMERIC, TEXT, TEXT, BIGINT, BIGINT, TEXT, INT);
DROP FUNCTION IF EXISTS public.consume_payment_session(TEXT, TEXT, TEXT, NUMERIC, TEXT, INT);
DROP FUNCTION IF EXISTS public.prune_expired_payment_data();

-- Save Payment Session RPC with capacity check
CREATE OR REPLACE FUNCTION public.save_payment_session(
  p_session_id TEXT,
  p_amount NUMERIC,
  p_currency TEXT,
  p_session_token TEXT,
  p_created_at BIGINT,
  p_expires_at_ms BIGINT,
  p_client_ip TEXT DEFAULT NULL,
  p_max_active INT DEFAULT 1000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_active_count INT;
  v_now_tz TIMESTAMPTZ;
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') AND
     COALESCE(current_setting('request.jwt.claim.role', true), '') != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: save_payment_session is restricted to service_role credential';
  END IF;

  v_now_tz := clock_timestamp();
  v_expires_at := to_timestamp(p_expires_at_ms / 1000.0);

  -- Purge expired sessions
  DELETE FROM public.payment_sessions WHERE expires_at < v_now_tz;

  -- Capacity check: preserve live unexpired sessions
  SELECT COUNT(*) INTO v_active_count
  FROM public.payment_sessions
  WHERE NOT consumed AND expires_at >= v_now_tz;

  IF v_active_count >= p_max_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment session capacity reached'
    );
  END IF;

  INSERT INTO public.payment_sessions (
    id,
    amount,
    currency,
    session_token,
    client_ip,
    consumed,
    created_at,
    expires_at
  ) VALUES (
    p_session_id,
    p_amount,
    p_currency,
    p_session_token,
    p_client_ip,
    false,
    p_created_at,
    v_expires_at
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id
  );
END;
$$;

-- Atomic Claim Payment Session RPC (Claim payment before order insertion)
CREATE OR REPLACE FUNCTION public.claim_payment_session(
  p_session_id TEXT,
  p_payment_id TEXT,
  p_order_number TEXT,
  p_amount NUMERIC,
  p_currency TEXT DEFAULT 'INR'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_session RECORD;
  v_existing_tx RECORD;
  v_now BIGINT;
  v_now_tz TIMESTAMPTZ;
BEGIN
  IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') AND
     COALESCE(current_setting('request.jwt.claim.role', true), '') != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: claim_payment_session is restricted to service_role credential';
  END IF;

  v_now := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  v_now_tz := clock_timestamp();

  -- 1. Check if transaction was already processed or claimed
  SELECT * INTO v_existing_tx FROM public.payment_transactions WHERE payment_id = p_payment_id FOR UPDATE;
  IF FOUND THEN
    IF v_existing_tx.order_number = p_order_number THEN
      RETURN jsonb_build_object(
        'success', true,
        'order_number', p_order_number,
        'claimed', true
      );
    END IF;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Duplicate transaction detected. This payment transaction has already been claimed or consumed.',
      'duplicate', true,
      'order_number', v_existing_tx.order_number
    );
  END IF;

  -- 2. Lock and check session
  SELECT * INTO v_session FROM public.payment_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or unrecognized payment session ID.'
    );
  END IF;

  IF v_session.expires_at < v_now_tz THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment session has expired. Please initiate a new checkout session.'
    );
  END IF;

  IF v_session.consumed THEN
    IF v_session.order_number = p_order_number THEN
      RETURN jsonb_build_object(
        'success', true,
        'order_number', p_order_number
      );
    END IF;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment session has already been consumed for a completed order.',
      'duplicate', true,
      'order_number', v_session.order_number
    );
  END IF;

  IF v_session.order_number IS NOT NULL AND v_session.order_number != p_order_number THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment session is already claimed by another concurrent order.',
      'duplicate', true,
      'order_number', v_session.order_number
    );
  END IF;

  IF v_session.amount != p_amount OR v_session.currency != p_currency THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment amount or currency mismatch.'
    );
  END IF;

  -- 3. Atomically record claim
  UPDATE public.payment_sessions
  SET order_number = p_order_number
  WHERE id = p_session_id;

  INSERT INTO public.payment_transactions (
    payment_id,
    session_id,
    order_number,
    amount,
    currency,
    status,
    created_at,
    expires_at
  ) VALUES (
    p_payment_id,
    p_session_id,
    p_order_number,
    p_amount,
    p_currency,
    'claimed',
    v_now,
    v_now_tz + INTERVAL '1 hour'
  );

  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'payment_id', p_payment_id,
    'order_number', p_order_number
  );
END;
$$;

-- Atomic Release Payment Claim RPC (If order insertion fails)
CREATE OR REPLACE FUNCTION public.release_payment_claim(
  p_session_id TEXT,
  p_payment_id TEXT,
  p_order_number TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') AND
     COALESCE(current_setting('request.jwt.claim.role', true), '') != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: release_payment_claim is restricted to service_role credential';
  END IF;

  -- Delete from transactions only if status is 'claimed'
  DELETE FROM public.payment_transactions
  WHERE payment_id = p_payment_id
    AND order_number = p_order_number
    AND status = 'claimed';

  -- Release order_number from session if not consumed
  UPDATE public.payment_sessions
  SET order_number = NULL
  WHERE id = p_session_id
    AND order_number = p_order_number
    AND NOT consumed;

  RETURN jsonb_build_object(
    'success', true
  );
END;
$$;

-- Atomic Consume Payment Session and Record Replay Transaction RPC
CREATE OR REPLACE FUNCTION public.consume_payment_session(
  p_session_id TEXT,
  p_payment_id TEXT,
  p_order_number TEXT,
  p_amount NUMERIC,
  p_currency TEXT DEFAULT 'INR',
  p_retention_days INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_session RECORD;
  v_existing_tx RECORD;
  v_now BIGINT;
  v_now_tz TIMESTAMPTZ;
BEGIN
  IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') AND
     COALESCE(current_setting('request.jwt.claim.role', true), '') != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: consume_payment_session is restricted to service_role credential';
  END IF;

  v_now := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  v_now_tz := clock_timestamp();

  -- Check if transaction was already processed or claimed
  SELECT * INTO v_existing_tx FROM public.payment_transactions WHERE payment_id = p_payment_id FOR UPDATE;
  IF FOUND THEN
    IF v_existing_tx.order_number = p_order_number THEN
      -- Already claimed by this order: transition to confirmed
      UPDATE public.payment_transactions
      SET status = 'confirmed',
          expires_at = v_now_tz + (p_retention_days || ' days')::INTERVAL
      WHERE payment_id = p_payment_id;

      UPDATE public.payment_sessions
      SET consumed = true,
          order_number = p_order_number,
          consumed_at = v_now_tz
      WHERE id = p_session_id;

      RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'payment_id', p_payment_id,
        'order_number', p_order_number
      );
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Duplicate transaction detected. This payment transaction has already been consumed.',
      'duplicate', true,
      'order_number', v_existing_tx.order_number
    );
  END IF;

  -- Lock and check session
  SELECT * INTO v_session FROM public.payment_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or unrecognized payment session ID.'
    );
  END IF;

  IF v_session.expires_at < v_now_tz THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment session has expired. Please initiate a new checkout session.'
    );
  END IF;

  IF v_session.consumed THEN
    IF v_session.order_number = p_order_number THEN
      RETURN jsonb_build_object(
        'success', true,
        'order_number', p_order_number
      );
    END IF;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment session has already been consumed for a completed order.',
      'duplicate', true,
      'order_number', v_session.order_number
    );
  END IF;

  -- Mark session consumed
  UPDATE public.payment_sessions
  SET consumed = true,
      order_number = p_order_number,
      consumed_at = v_now_tz
  WHERE id = p_session_id;

  -- Insert processed transaction record
  INSERT INTO public.payment_transactions (
    payment_id,
    session_id,
    order_number,
    amount,
    currency,
    status,
    created_at,
    expires_at
  ) VALUES (
    p_payment_id,
    p_session_id,
    p_order_number,
    p_amount,
    p_currency,
    'confirmed',
    v_now,
    v_now_tz + (p_retention_days || ' days')::INTERVAL
  );

  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'payment_id', p_payment_id,
    'order_number', p_order_number
  );
END;
$$;

-- Prune expired payment sessions and transaction logs
CREATE OR REPLACE FUNCTION public.prune_expired_payment_data()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_sessions INT;
  v_deleted_tx INT;
BEGIN
  IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') AND
     COALESCE(current_setting('request.jwt.claim.role', true), '') != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: prune_expired_payment_data is restricted to service_role credential';
  END IF;

  DELETE FROM public.payment_sessions WHERE expires_at < clock_timestamp() AND (consumed OR expires_at < clock_timestamp() - INTERVAL '1 day');
  GET DIAGNOSTICS v_deleted_sessions = ROW_COUNT;

  DELETE FROM public.payment_transactions WHERE expires_at < clock_timestamp();
  GET DIAGNOSTICS v_deleted_tx = ROW_COUNT;

  RETURN v_deleted_sessions + v_deleted_tx;
END;
$$;

REVOKE ALL ON FUNCTION public.save_payment_session(TEXT, NUMERIC, TEXT, TEXT, BIGINT, BIGINT, TEXT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_payment_session(TEXT, NUMERIC, TEXT, TEXT, BIGINT, BIGINT, TEXT, INT) FROM anon;
REVOKE ALL ON FUNCTION public.save_payment_session(TEXT, NUMERIC, TEXT, TEXT, BIGINT, BIGINT, TEXT, INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.save_payment_session(TEXT, NUMERIC, TEXT, TEXT, BIGINT, BIGINT, TEXT, INT) TO service_role;

REVOKE ALL ON FUNCTION public.claim_payment_session(TEXT, TEXT, TEXT, NUMERIC, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_payment_session(TEXT, TEXT, TEXT, NUMERIC, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.claim_payment_session(TEXT, TEXT, TEXT, NUMERIC, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_payment_session(TEXT, TEXT, TEXT, NUMERIC, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.release_payment_claim(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_payment_claim(TEXT, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.release_payment_claim(TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.release_payment_claim(TEXT, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.consume_payment_session(TEXT, TEXT, TEXT, NUMERIC, TEXT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_payment_session(TEXT, TEXT, TEXT, NUMERIC, TEXT, INT) FROM anon;
REVOKE ALL ON FUNCTION public.consume_payment_session(TEXT, TEXT, TEXT, NUMERIC, TEXT, INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_payment_session(TEXT, TEXT, TEXT, NUMERIC, TEXT, INT) TO service_role;

REVOKE ALL ON FUNCTION public.prune_expired_payment_data() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prune_expired_payment_data() FROM anon;
REVOKE ALL ON FUNCTION public.prune_expired_payment_data() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.prune_expired_payment_data() TO service_role;

-- Dedicated indexed payment_id on public.orders for exact-match idempotent reconciliation
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS payment_id TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON public.orders (payment_id);

-- Backfill existing orders where payment_id is unset (or previously corrupted with method name) and payment_status contains gateway payment id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_id'
  ) THEN
    UPDATE public.orders
    SET payment_id = substring(payment_status FROM '\([A-Za-z0-9_-]+:\s*([^)]+)\)')
    WHERE (payment_id IS NULL OR payment_id IN ('UPI', 'CARD'))
      AND payment_status ~ '\([A-Za-z0-9_-]+:\s*([^)]+)\)';
  END IF;
END $$;

