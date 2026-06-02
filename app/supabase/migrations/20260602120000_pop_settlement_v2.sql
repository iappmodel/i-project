-- POP settlement v2: release eligibility, appeal holds, fraud events, server-gated settle.

ALTER TABLE public.pop_pending_holds
  ADD COLUMN IF NOT EXISTS release_eligible_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS appeal_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reverify_used BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trust_tier_at_hold TEXT DEFAULT 't0_new';

COMMENT ON COLUMN public.pop_pending_holds.release_eligible_at IS
  'Earliest time settle_pop_pending_hold may credit wallet (approved/partial).';

COMMENT ON COLUMN public.pop_pending_holds.appeal_expires_at IS
  'Pending/escalated appeal window end; forfeit if not re-verified.';

ALTER TABLE public.pop_pending_holds DROP CONSTRAINT IF EXISTS pop_pending_holds_hold_status_check;

ALTER TABLE public.pop_pending_holds ADD CONSTRAINT pop_pending_holds_hold_status_check
  CHECK (hold_status IN ('pending', 'appeal_pending', 'settled', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_pop_pending_holds_release_eligible
  ON public.pop_pending_holds (hold_status, release_eligible_at)
  WHERE hold_status = 'pending';

CREATE TABLE IF NOT EXISTS public.pop_fraud_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  local_user_ref TEXT,
  review_status TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pop_fraud_events_session_idx
  ON public.pop_fraud_events (session_id, created_at DESC);

ALTER TABLE public.pop_fraud_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY pop_fraud_events_service_write ON public.pop_fraud_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.settle_pop_pending_hold(
  p_session_id TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_hold RECORD;
  v_ref_id TEXT;
  v_ledger_result JSONB;
  v_new_balance INTEGER;
BEGIN
  IF p_session_id IS NULL OR length(trim(p_session_id)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'code', 'invalid_session_id');
  END IF;

  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'invalid_user_id');
  END IF;

  SELECT *
  INTO v_hold
  FROM public.pop_pending_holds
  WHERE session_id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'hold_not_found');
  END IF;

  IF v_hold.hold_status = 'settled' THEN
    RETURN jsonb_build_object(
      'success', true,
      'code', 'already_settled',
      'session_id', v_hold.session_id,
      'amount', v_hold.amount,
      'currency', v_hold.currency,
      'ledger_ref_id', v_hold.ledger_ref_id
    );
  END IF;

  IF v_hold.hold_status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'code', 'hold_cancelled');
  END IF;

  IF v_hold.hold_status = 'appeal_pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'appeal_pending',
      'review_status', v_hold.review_status,
      'appeal_expires_at', v_hold.appeal_expires_at
    );
  END IF;

  IF v_hold.review_status NOT IN ('approved', 'partial') THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'review_not_settlement_eligible',
      'review_status', v_hold.review_status
    );
  END IF;

  IF v_hold.release_eligible_at IS NOT NULL AND v_hold.release_eligible_at > now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'release_not_eligible_yet',
      'release_eligible_at', v_hold.release_eligible_at
    );
  END IF;

  v_ref_id := COALESCE(v_hold.ledger_ref_id, 'pop_hold_' || p_session_id);

  v_ledger_result := public.ledger_append(
    p_user_id,
    'reward'::TEXT,
    v_hold.amount,
    v_hold.currency::TEXT,
    v_ref_id,
    NULL::JSONB
  );

  v_new_balance := (v_ledger_result->>'new_balance')::INTEGER;

  IF NOT COALESCE((v_ledger_result->>'applied')::BOOLEAN, false) THEN
    IF v_ledger_result->>'reason' = 'duplicate_ref_id' THEN
      UPDATE public.pop_pending_holds
      SET
        user_id = COALESCE(user_id, p_user_id),
        hold_status = 'settled',
        release_status = 'released',
        ledger_ref_id = v_ref_id,
        settled_at = COALESCE(settled_at, now()),
        updated_at = now()
      WHERE session_id = p_session_id;

      RETURN jsonb_build_object(
        'success', true,
        'code', 'already_settled',
        'session_id', p_session_id,
        'amount', v_hold.amount,
        'currency', v_hold.currency,
        'new_balance', v_new_balance,
        'ledger_ref_id', v_ref_id
      );
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'code', 'ledger_append_failed',
      'reason', v_ledger_result->>'reason',
      'new_balance', v_new_balance
    );
  END IF;

  UPDATE public.pop_pending_holds
  SET
    user_id = p_user_id,
    hold_status = 'settled',
    release_status = 'released',
    ledger_ref_id = v_ref_id,
    settled_at = now(),
    updated_at = now()
  WHERE session_id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'code', 'settled',
    'session_id', p_session_id,
    'amount', v_hold.amount,
    'currency', v_hold.currency,
    'new_balance', v_new_balance,
    'ledger_ref_id', v_ref_id
  );
END;
$$;

COMMENT ON FUNCTION public.settle_pop_pending_hold IS
  'Release an approved POP pending hold when release_eligible_at has passed (idempotent on ledger ref).';

REVOKE ALL ON FUNCTION public.settle_pop_pending_hold(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_pop_pending_hold(TEXT, UUID) TO service_role;
