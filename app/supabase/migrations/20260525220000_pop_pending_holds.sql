-- POP pending holds: proof packet review → pending wallet record → ledger settlement.
-- Bridges integrations/pop-core/validator to wallet_ledger via ledger_append.

CREATE TABLE public.pop_pending_holds (
  session_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  local_user_ref TEXT NOT NULL,
  offer_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  artifact_id TEXT,
  review_status TEXT NOT NULL CHECK (
    review_status IN ('pending', 'approved', 'partial', 'rejected', 'escalated')
  ),
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL CHECK (currency IN ('icoin', 'vicoin')),
  hold_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    hold_status IN ('pending', 'settled', 'cancelled')
  ),
  release_status TEXT NOT NULL DEFAULT 'not_released' CHECK (
    release_status IN (
      'not_released',
      'release_ready',
      'release_blocked',
      'released',
      'cancelled'
    )
  ),
  ledger_ref_id TEXT,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pop_pending_holds IS
  'POP validator pending holds; settled via settle_pop_pending_hold → wallet_ledger.';

CREATE UNIQUE INDEX idx_pop_pending_holds_ledger_ref
  ON public.pop_pending_holds (ledger_ref_id)
  WHERE ledger_ref_id IS NOT NULL;

CREATE INDEX idx_pop_pending_holds_user_id
  ON public.pop_pending_holds (user_id, hold_status, created_at DESC);

CREATE INDEX idx_pop_pending_holds_local_user_ref
  ON public.pop_pending_holds (local_user_ref, hold_status, created_at DESC);

ALTER TABLE public.pop_pending_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pop pending holds"
  ON public.pop_pending_holds FOR SELECT
  USING (auth.uid() = user_id);

-- Inserts/updates: service role only (no authenticated INSERT policy).

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

  IF v_hold.review_status NOT IN ('approved', 'partial') THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'review_not_settlement_eligible',
      'review_status', v_hold.review_status
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
  'Release an approved POP pending hold into wallet_ledger (idempotent on ledger ref).';

REVOKE ALL ON FUNCTION public.settle_pop_pending_hold(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_pop_pending_hold(TEXT, UUID) TO service_role;
