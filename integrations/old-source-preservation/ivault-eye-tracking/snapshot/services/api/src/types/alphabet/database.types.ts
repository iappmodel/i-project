export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface DbActionIntent {
  action_intent_id: string;
  intent_type: string;
  intent_source: string;
  status: string;
  user_id: string;
  actor_user_id: string | null;
  creator_id: string | null;
  business_id: string | null;
  wallet_id: string | null;
  content_id: string | null;
  campaign_id: string | null;
  grant_eligibility_id: string | null;
  session_id: string | null;
  device_id: string | null;
  client_request_id: string | null;
  idempotency_key: string | null;
  dedupe_key: string | null;
  source_event_ids: string[];
  context: Json;
  risk_signals: Json;
  metadata: Json;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbPolicyDecision {
  policy_decision_id: string;
  user_id: string;
  creator_id: string | null;
  business_id: string | null;
  wallet_id: string | null;
  content_id: string | null;
  campaign_id: string | null;
  grant_eligibility_id: string | null;
  action_type: string;
  primary_domain: string;
  decision: string;
  status: string;
  gate_results: Json;
  risk_signals: Json;
  age_band: string;
  trust_score: number;
  u_value_score: number;
  downstream_instructions: Json;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface DbPipelineRecord {
  pipeline_id: string;
  pipeline_type: string;
  status: string;
  user_id: string;
  actor_user_id: string | null;
  creator_id: string | null;
  business_id: string | null;
  wallet_id: string | null;
  content_id: string | null;
  campaign_id: string | null;
  grant_eligibility_id: string | null;
  request_source: string;
  request_channel: string;
  requested_intent_type: string;
  requested_policy_action: string | null;
  requested_policy_domain: string | null;
  requested_saga_type: string | null;
  target_systems: string[];
  action_intent_id: string | null;
  policy_decision_id: string | null;
  saga_id: string | null;
  execution_request_ids: string[];
  handler_definition_ids: string[];
  audit_record_ids: string[];
  notification_ids: string[];
  source_event_ids: string[];
  idempotency_key: string | null;
  dedupe_key: string | null;
  steps: Json;
  risk_signals: Json;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface DbSagaRecord {
  saga_id: string;
  saga_type: string;
  status: string;
  user_id: string;
  wallet_id: string | null;
  content_id: string | null;
  campaign_id: string | null;
  grant_eligibility_id: string | null;
  source_action_intent_id: string | null;
  policy_decision_id: string | null;
  source_event_ids: string[];
  idempotency_key: string | null;
  timeout_deadline: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface DbSagaStep {
  saga_step_id: string;
  saga_id: string;
  step_type: string;
  status: string;
  label: string;
  source_object_id: string | null;
  source_event_id: string | null;
  depends_on_step_ids: string[];
  retry_count: number;
  max_retries: number;
  compensation_required: boolean;
  compensation_action: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface DbHandlerDefinition {
  handler_definition_id: string;
  handler_name: string;
  handler_version: string;
  target_system: string;
  action: string;
  status: string;
  health: string;
  runtime_mode: string;
  permission_level: string;
  risk_class: string;
  schema_contract: Json;
  idempotency_required: boolean;
  audit_required: boolean;
  retry_supported: boolean;
  timeout_ms: number;
  owner_team: string;
  created_at: string;
  updated_at: string;
}

export interface DbExecutionRequest {
  execution_request_id: string;
  source_policy_decision_id: string | null;
  source_event_ids: string[];
  target_system: string;
  target_object_id: string | null;
  action: string;
  status: string;
  priority: string;
  idempotency_key: string | null;
  dedupe_key: string | null;
  handler_name: string;
  handler_version: string;
  payload: Json;
  sanitized_payload: Json;
  metadata: Json;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
}

/** Row shape for `wallet_accounts` (worker ledger cache). */
export interface DbWalletAccount {
  wallet_account_id: string;
  wallet_id: string;
  user_id: string;
  coin_code: string;
  available_balance: number;
  pending_balance: number;
  locked_balance: number;
  created_at: string;
  updated_at: string;
}

/** Row shape for append-only `ledger_entries`. */
export interface DbLedgerEntry {
  ledger_entry_id: string;
  wallet_id: string;
  wallet_account_id: string;
  user_id: string;
  coin_code: string;
  direction: string;
  ledger_status: string;
  amount: number;
  available_delta: number;
  pending_delta: number;
  locked_delta: number;
  source_type: string;
  source_object_id: string;
  source_event_id: string | null;
  idempotency_key: string | null;
  dedupe_key: string | null;
  reason_code: string;
  metadata: Json;
  created_at: string;
}

export interface DbAuditRecord {
  audit_record_id: string;
  audit_type: string;
  status: string;
  user_id: string | null;
  actor_user_id: string | null;
  wallet_id: string | null;
  content_id: string | null;
  campaign_id: string | null;
  policy_decision_id: string | null;
  execution_request_id: string | null;
  saga_id: string | null;
  pipeline_id: string | null;
  source_event_ids: string[];
  public_summary: string | null;
  internal_summary: string | null;
  evidence: Json;
  redacted_evidence: Json;
  risk_summary: Json;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface DbNotificationRecord {
  notification_id: string;
  recipient_user_id: string;
  source_system: string;
  source_object_id: string | null;
  source_event_ids: string[];
  category: string;
  severity: string;
  status: string;
  title: string | null;
  body: string | null;
  explanation_class: string | null;
  object_label: string | null;
  internal_reason_codes: string[];
  privacy_sensitivity: string;
  dedupe_key: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}
