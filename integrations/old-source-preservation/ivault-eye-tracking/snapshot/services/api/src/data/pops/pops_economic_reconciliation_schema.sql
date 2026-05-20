-- P.O.P.S Stage 33 — Economic reconciliation (Postgres).
-- Amounts are integer minor units; coin_type aligns with product currency / coin codes.

CREATE TABLE IF NOT EXISTS pops_campaign_budget_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL,
  session_id TEXT,
  user_id TEXT,
  reward_decision_id TEXT,
  estimated_reward_minor BIGINT NOT NULL DEFAULT 0,
  debited_minor BIGINT NOT NULL DEFAULT 0,
  released_back_minor BIGINT NOT NULL DEFAULT 0,
  reserve_status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  CONSTRAINT pops_budget_reserve_status_chk CHECK (
    reserve_status IN ('OPEN', 'DEBITED_PENDING', 'DEBITED_RELEASED', 'RELEASED_BACK', 'FAILED')
  )
);

CREATE INDEX IF NOT EXISTS pops_campaign_budget_reservations_campaign_idx
  ON pops_campaign_budget_reservations (campaign_id);

CREATE INDEX IF NOT EXISTS pops_campaign_budget_reservations_decision_idx
  ON pops_campaign_budget_reservations (reward_decision_id);

CREATE TABLE IF NOT EXISTS pops_economic_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  reward_decision_id TEXT NOT NULL,
  wallet_intent_id TEXT,
  budget_reserve_id UUID REFERENCES pops_campaign_budget_reservations (id),
  coin_type TEXT NOT NULL,
  base_amount_minor BIGINT NOT NULL,
  final_amount_minor BIGINT NOT NULL,
  decision_status TEXT NOT NULL,
  budget_status TEXT NOT NULL,
  wallet_status TEXT NOT NULL,
  reconciliation_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pops_economic_budget_status_chk CHECK (
    budget_status IN (
      'RESERVED',
      'DEBITED_PENDING',
      'DEBITED_RELEASED',
      'RELEASED_BACK_TO_CAMPAIGN',
      'FAILED',
      'NOT_REQUIRED'
    )
  ),
  CONSTRAINT pops_economic_wallet_status_chk CHECK (
    wallet_status IN ('NONE', 'PENDING', 'HELD', 'RELEASED', 'DENIED', 'EXPIRED')
  ),
  CONSTRAINT pops_economic_recon_status_chk CHECK (
    reconciliation_status IN (
      'MATCHED',
      'PENDING_WALLET',
      'PENDING_BUDGET',
      'AMOUNT_MISMATCH',
      'MISSING_WALLET_INTENT',
      'MISSING_BUDGET_RECORD',
      'DUPLICATE_REWARD',
      'FAILED_REQUIRES_REVIEW'
    )
  )
);

CREATE INDEX IF NOT EXISTS pops_economic_records_campaign_created_idx
  ON pops_economic_records (campaign_id, created_at);

CREATE INDEX IF NOT EXISTS pops_economic_records_decision_idx
  ON pops_economic_records (reward_decision_id);

CREATE TABLE IF NOT EXISTS pops_economic_reconciliation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  range_start TIMESTAMPTZ NOT NULL,
  range_end TIMESTAMPTZ NOT NULL,
  matched_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  issue_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pops_economic_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES pops_economic_reconciliation_runs (id),
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pops_economic_audit_log_run_idx ON pops_economic_audit_log (run_id);
