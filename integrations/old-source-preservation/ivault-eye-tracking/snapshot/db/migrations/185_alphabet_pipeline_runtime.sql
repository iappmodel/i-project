-- Alphabet pipeline runtime: action intents through notifications (control plane).
-- Requires pgcrypto for gen_random_uuid().

CREATE TABLE IF NOT EXISTS action_intents (
  action_intent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_type TEXT NOT NULL,
  intent_source TEXT NOT NULL,
  status TEXT NOT NULL,
  user_id UUID NOT NULL,
  actor_user_id UUID,
  creator_id UUID,
  business_id UUID,
  wallet_id UUID,
  content_id UUID,
  campaign_id UUID,
  grant_eligibility_id UUID,
  session_id TEXT,
  device_id TEXT,
  client_request_id TEXT,
  idempotency_key TEXT,
  dedupe_key TEXT,
  source_event_ids UUID[] NOT NULL DEFAULT '{}',
  context JSONB NOT NULL DEFAULT '{}',
  risk_signals JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS action_intents_user_id_idx ON action_intents (user_id);
CREATE INDEX IF NOT EXISTS action_intents_idempotency_key_idx ON action_intents (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS action_intents_dedupe_key_idx ON action_intents (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS policy_decisions (
  policy_decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  creator_id UUID,
  business_id UUID,
  wallet_id UUID,
  content_id UUID,
  campaign_id UUID,
  grant_eligibility_id UUID,
  action_type TEXT NOT NULL,
  primary_domain TEXT NOT NULL,
  decision TEXT NOT NULL,
  status TEXT NOT NULL,
  gate_results JSONB NOT NULL DEFAULT '[]',
  risk_signals JSONB NOT NULL DEFAULT '{}',
  age_band TEXT NOT NULL DEFAULT 'unknown',
  trust_score NUMERIC(12, 4) NOT NULL DEFAULT 0,
  u_value_score NUMERIC(12, 4) NOT NULL DEFAULT 0,
  downstream_instructions JSONB NOT NULL DEFAULT '[]',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pipeline_records (
  pipeline_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_type TEXT NOT NULL,
  status TEXT NOT NULL,
  user_id UUID NOT NULL,
  actor_user_id UUID,
  creator_id UUID,
  business_id UUID,
  wallet_id UUID,
  content_id UUID,
  campaign_id UUID,
  grant_eligibility_id UUID,
  request_source TEXT NOT NULL,
  request_channel TEXT NOT NULL,
  requested_intent_type TEXT NOT NULL,
  requested_policy_action TEXT,
  requested_policy_domain TEXT,
  requested_saga_type TEXT,
  target_systems TEXT[] NOT NULL DEFAULT '{}',
  action_intent_id UUID REFERENCES action_intents (action_intent_id),
  policy_decision_id UUID REFERENCES policy_decisions (policy_decision_id),
  saga_id UUID,
  execution_request_ids UUID[] NOT NULL DEFAULT '{}',
  handler_definition_ids UUID[] NOT NULL DEFAULT '{}',
  audit_record_ids UUID[] NOT NULL DEFAULT '{}',
  notification_ids UUID[] NOT NULL DEFAULT '{}',
  source_event_ids UUID[] NOT NULL DEFAULT '{}',
  idempotency_key TEXT,
  dedupe_key TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  risk_signals JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pipeline_records_idempotency_key_idx ON pipeline_records (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS saga_records (
  saga_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saga_type TEXT NOT NULL,
  status TEXT NOT NULL,
  user_id UUID NOT NULL,
  wallet_id UUID,
  content_id UUID,
  campaign_id UUID,
  grant_eligibility_id UUID,
  source_action_intent_id UUID REFERENCES action_intents (action_intent_id),
  policy_decision_id UUID REFERENCES policy_decisions (policy_decision_id),
  source_event_ids UUID[] NOT NULL DEFAULT '{}',
  idempotency_key TEXT,
  timeout_deadline TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saga_steps (
  saga_step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saga_id UUID NOT NULL REFERENCES saga_records (saga_id) ON DELETE CASCADE,
  step_type TEXT NOT NULL,
  status TEXT NOT NULL,
  label TEXT NOT NULL,
  source_object_id UUID,
  source_event_id UUID,
  depends_on_step_ids UUID[] NOT NULL DEFAULT '{}',
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  compensation_required BOOLEAN NOT NULL DEFAULT FALSE,
  compensation_action TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS handler_definitions (
  handler_definition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handler_name TEXT NOT NULL,
  handler_version TEXT NOT NULL,
  target_system TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  health TEXT NOT NULL DEFAULT 'healthy',
  runtime_mode TEXT NOT NULL DEFAULT 'async',
  permission_level TEXT NOT NULL DEFAULT 'internal',
  risk_class TEXT NOT NULL DEFAULT 'low',
  schema_contract JSONB NOT NULL DEFAULT '{}',
  idempotency_required BOOLEAN NOT NULL DEFAULT FALSE,
  audit_required BOOLEAN NOT NULL DEFAULT FALSE,
  retry_supported BOOLEAN NOT NULL DEFAULT TRUE,
  timeout_ms INTEGER NOT NULL DEFAULT 60_000,
  owner_team TEXT NOT NULL DEFAULT 'platform',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (handler_name, handler_version)
);

CREATE TABLE IF NOT EXISTS execution_requests (
  execution_request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_policy_decision_id UUID REFERENCES policy_decisions (policy_decision_id),
  source_event_ids UUID[] NOT NULL DEFAULT '{}',
  target_system TEXT NOT NULL,
  target_object_id UUID,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  idempotency_key TEXT,
  dedupe_key TEXT,
  handler_name TEXT NOT NULL,
  handler_version TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  sanitized_payload JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_records (
  audit_record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_type TEXT NOT NULL,
  status TEXT NOT NULL,
  user_id UUID,
  actor_user_id UUID,
  wallet_id UUID,
  content_id UUID,
  campaign_id UUID,
  policy_decision_id UUID REFERENCES policy_decisions (policy_decision_id),
  execution_request_id UUID REFERENCES execution_requests (execution_request_id),
  saga_id UUID REFERENCES saga_records (saga_id),
  pipeline_id UUID REFERENCES pipeline_records (pipeline_id),
  source_event_ids UUID[] NOT NULL DEFAULT '{}',
  public_summary TEXT,
  internal_summary TEXT,
  evidence JSONB NOT NULL DEFAULT '{}',
  redacted_evidence JSONB NOT NULL DEFAULT '{}',
  risk_summary JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_records (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL,
  source_system TEXT NOT NULL,
  source_object_id UUID,
  source_event_ids UUID[] NOT NULL DEFAULT '{}',
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  title TEXT,
  body TEXT,
  explanation_class TEXT,
  object_label TEXT,
  internal_reason_codes TEXT[] NOT NULL DEFAULT '{}',
  privacy_sensitivity TEXT NOT NULL DEFAULT 'medium',
  dedupe_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Minimal handler rows so runtime can resolve common paths (extend in ops seed scripts).
INSERT INTO handler_definitions (
  handler_name,
  handler_version,
  target_system,
  action,
  status,
  health,
  runtime_mode,
  permission_level,
  risk_class,
  schema_contract,
  idempotency_required,
  audit_required,
  retry_supported,
  timeout_ms,
  owner_team
)
VALUES
  (
    'system.noop',
    'v1',
    'system',
    'noop',
    'active',
    'healthy',
    'async',
    'internal',
    'low',
    '{"requiredPayloadKeys":["userId"],"optionalPayloadKeys":["walletId","contentId","campaignId","grantEligibilityId","amount","coinCode","reasonCode"],"forbiddenPayloadKeys":[],"requiredResultKeys":[],"optionalResultKeys":[]}'::jsonb,
    FALSE,
    FALSE,
    TRUE,
    30_000,
    'platform'
  ),
  (
    'wallet.credit',
    'v1',
    'wallet',
    'credit',
    'active',
    'healthy',
    'queue',
    'financial',
    'high',
    '{"requiredPayloadKeys":["userId"],"optionalPayloadKeys":["walletId","amount","coinCode"],"forbiddenPayloadKeys":[],"requiredResultKeys":[],"optionalResultKeys":[]}'::jsonb,
    TRUE,
    TRUE,
    TRUE,
    120_000,
    'wallet'
  ),
  (
    'wallet.debit',
    'v1',
    'wallet',
    'debit',
    'active',
    'healthy',
    'queue',
    'financial',
    'high',
    '{"requiredPayloadKeys":["userId"],"optionalPayloadKeys":["walletId","amount","coinCode"],"forbiddenPayloadKeys":[],"requiredResultKeys":[],"optionalResultKeys":[]}'::jsonb,
    TRUE,
    TRUE,
    TRUE,
    120_000,
    'wallet'
  ),
  (
    'withdrawal.create',
    'v1',
    'withdrawal',
    'withdraw',
    'active',
    'healthy',
    'queue',
    'financial',
    'high',
    '{"requiredPayloadKeys":["userId"],"optionalPayloadKeys":["walletId","amount","coinCode"],"forbiddenPayloadKeys":[],"requiredResultKeys":[],"optionalResultKeys":[]}'::jsonb,
    TRUE,
    TRUE,
    TRUE,
    120_000,
    'wallet'
  ),
  (
    'conversion.create',
    'v1',
    'conversion',
    'convert',
    'active',
    'healthy',
    'queue',
    'financial',
    'medium',
    '{"requiredPayloadKeys":["userId"],"optionalPayloadKeys":["walletId","amount","coinCode"],"forbiddenPayloadKeys":[],"requiredResultKeys":[],"optionalResultKeys":[]}'::jsonb,
    TRUE,
    TRUE,
    TRUE,
    120_000,
    'wallet'
  ),
  (
    'campaign.reserve',
    'v1',
    'campaign',
    'reserve',
    'active',
    'healthy',
    'queue',
    'privileged',
    'medium',
    '{"requiredPayloadKeys":["userId"],"optionalPayloadKeys":["campaignId"],"forbiddenPayloadKeys":[],"requiredResultKeys":[],"optionalResultKeys":[]}'::jsonb,
    TRUE,
    TRUE,
    TRUE,
    120_000,
    'campaign'
  ),
  (
    'notification.send',
    'v1',
    'notification',
    'notify',
    'active',
    'healthy',
    'async',
    'internal',
    'low',
    '{"requiredPayloadKeys":["userId"],"optionalPayloadKeys":[],"forbiddenPayloadKeys":[],"requiredResultKeys":[],"optionalResultKeys":[]}'::jsonb,
    FALSE,
    FALSE,
    TRUE,
    60_000,
    'notifications'
  )
ON CONFLICT (handler_name, handler_version) DO NOTHING;

ALTER TABLE pipeline_records
  DROP CONSTRAINT IF EXISTS pipeline_records_saga_id_fkey;

ALTER TABLE pipeline_records
  ADD CONSTRAINT pipeline_records_saga_id_fkey
  FOREIGN KEY (saga_id) REFERENCES saga_records (saga_id);
