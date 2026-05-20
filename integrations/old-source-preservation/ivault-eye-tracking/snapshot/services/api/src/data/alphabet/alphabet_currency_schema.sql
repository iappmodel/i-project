CREATE TABLE coin_definitions (
  coin_code TEXT PRIMARY KEY,
  coin_name TEXT NOT NULL,
  letter TEXT NOT NULL UNIQUE,
  core_meaning TEXT NOT NULL,
  measures TEXT NOT NULL,
  coin_category TEXT NOT NULL,
  is_spendable BOOLEAN NOT NULL DEFAULT FALSE,
  is_score_based BOOLEAN NOT NULL DEFAULT FALSE,
  is_identity_based BOOLEAN NOT NULL DEFAULT FALSE,
  is_access_based BOOLEAN NOT NULL DEFAULT FALSE,
  is_system_only BOOLEAN NOT NULL DEFAULT FALSE,
  can_convert_to_icoin BOOLEAN NOT NULL DEFAULT FALSE,
  can_convert_to_vcoin BOOLEAN NOT NULL DEFAULT FALSE,
  should_never_convert_directly_to_money BOOLEAN NOT NULL DEFAULT FALSE,
  affects_u_value BOOLEAN NOT NULL DEFAULT TRUE,
  affects_trust BOOLEAN NOT NULL DEFAULT TRUE,
  default_visibility TEXT NOT NULL DEFAULT 'private',
  user_facing_explanation TEXT NOT NULL,
  internal_explanation TEXT NOT NULL,
  mythic_sentence TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wallets (
  wallet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  wallet_status TEXT NOT NULL DEFAULT 'active',
  default_currency TEXT NOT NULL DEFAULT 'iCoin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE coin_accounts (
  coin_account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(wallet_id),
  coin_code TEXT NOT NULL REFERENCES coin_definitions(coin_code),
  available_balance NUMERIC(20, 6) NOT NULL DEFAULT 0,
  pending_balance NUMERIC(20, 6) NOT NULL DEFAULT 0,
  locked_balance NUMERIC(20, 6) NOT NULL DEFAULT 0,
  restricted_balance NUMERIC(20, 6) NOT NULL DEFAULT 0,
  identity_balance NUMERIC(20, 6) NOT NULL DEFAULT 0,
  score_value NUMERIC(20, 6) NOT NULL DEFAULT 0,
  lifetime_earned NUMERIC(20, 6) NOT NULL DEFAULT 0,
  lifetime_spent NUMERIC(20, 6) NOT NULL DEFAULT 0,
  lifetime_converted_in NUMERIC(20, 6) NOT NULL DEFAULT 0,
  lifetime_converted_out NUMERIC(20, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(wallet_id, coin_code)
);

CREATE TABLE coin_lots (
  lot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(wallet_id),
  coin_code TEXT NOT NULL REFERENCES coin_definitions(coin_code),
  source_event_id UUID,
  source_type TEXT NOT NULL,
  amount_original NUMERIC(20, 6) NOT NULL,
  amount_remaining NUMERIC(20, 6) NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  spend_restriction TEXT,
  age_restriction TEXT,
  expires_at TIMESTAMPTZ,
  available_at TIMESTAMPTZ,
  risk_hold_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (amount_original >= 0),
  CHECK (amount_remaining >= 0)
);

CREATE TABLE ledger_entries (
  entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(wallet_id),
  coin_code TEXT NOT NULL REFERENCES coin_definitions(coin_code),
  lot_id UUID REFERENCES coin_lots(lot_id),
  direction TEXT NOT NULL,
  amount NUMERIC(20, 6) NOT NULL,
  state_before TEXT,
  state_after TEXT,
  event_type TEXT NOT NULL,
  source_event_id UUID,
  counterparty_id UUID,
  metadata_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (amount >= 0)
);

CREATE TABLE conversion_rules (
  conversion_rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_coin TEXT NOT NULL REFERENCES coin_definitions(coin_code),
  target_coin TEXT NOT NULL REFERENCES coin_definitions(coin_code),
  base_rate NUMERIC(20, 8) NOT NULL,
  min_trust_tier INTEGER NOT NULL DEFAULT 0,
  min_quality_score NUMERIC(8, 4) NOT NULL DEFAULT 0,
  max_daily_conversion NUMERIC(20, 6) NOT NULL DEFAULT 0,
  pending_duration_hours INTEGER NOT NULL DEFAULT 24,
  requires_budget_source BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_coin, target_coin)
);

CREATE TABLE coin_conversions (
  conversion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_coin TEXT NOT NULL REFERENCES coin_definitions(coin_code),
  target_coin TEXT NOT NULL REFERENCES coin_definitions(coin_code),
  source_amount NUMERIC(20, 6) NOT NULL,
  target_amount NUMERIC(20, 6) NOT NULL,
  base_rate NUMERIC(20, 8) NOT NULL,
  quality_multiplier NUMERIC(8, 4) NOT NULL DEFAULT 1,
  trust_multiplier NUMERIC(8, 4) NOT NULL DEFAULT 1,
  risk_multiplier NUMERIC(8, 4) NOT NULL DEFAULT 1,
  age_multiplier NUMERIC(8, 4) NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'requested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at TIMESTAMPTZ
);

CREATE TABLE alphabet_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  coin_code TEXT REFERENCES coin_definitions(coin_code),
  event_type TEXT NOT NULL,
  object_type TEXT,
  object_id UUID,
  source_context TEXT NOT NULL,
  raw_score NUMERIC(10, 4),
  quality_score NUMERIC(10, 4),
  trust_score_at_event NUMERIC(10, 4),
  risk_score NUMERIC(10, 4),
  age_band TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  metadata_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_coin_scores (
  user_id UUID NOT NULL,
  coin_code TEXT NOT NULL REFERENCES coin_definitions(coin_code),
  score_value NUMERIC(12, 4) NOT NULL DEFAULT 0,
  score_tier INTEGER NOT NULL DEFAULT 0,
  lifetime_score NUMERIC(12, 4) NOT NULL DEFAULT 0,
  last_event_at TIMESTAMPTZ,
  decay_rate NUMERIC(8, 6) NOT NULL DEFAULT 0,
  confidence_level NUMERIC(8, 4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, coin_code)
);

CREATE TABLE trust_scores (
  user_id UUID PRIMARY KEY,
  trust_score NUMERIC(10, 4) NOT NULL DEFAULT 0,
  trust_tier INTEGER NOT NULL DEFAULT 0,
  identity_score NUMERIC(10, 4) NOT NULL DEFAULT 0,
  payment_risk_score NUMERIC(10, 4) NOT NULL DEFAULT 0,
  safety_score NUMERIC(10, 4) NOT NULL DEFAULT 0,
  reputation_score NUMERIC(10, 4) NOT NULL DEFAULT 0,
  last_review_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE u_value_scores (
  user_id UUID PRIMARY KEY,
  u_value_score NUMERIC(12, 4) NOT NULL DEFAULT 0,
  u_value_tier INTEGER NOT NULL DEFAULT 0,
  lifetime_positive_value NUMERIC(12, 4) NOT NULL DEFAULT 0,
  lifetime_negative_events INTEGER NOT NULL DEFAULT 0,
  grant_eligibility BOOLEAN NOT NULL DEFAULT FALSE,
  surprise_reward_eligibility BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
