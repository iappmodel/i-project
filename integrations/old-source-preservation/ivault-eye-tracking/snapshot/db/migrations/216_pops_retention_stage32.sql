-- Stage 32: P.O.P.S retention, legal hold, and deletion support fields

alter table if exists pops_sessions
  add column if not exists retention_reason text,
  add column if not exists legal_hold boolean not null default false,
  add column if not exists legal_hold_reason text,
  add column if not exists legal_hold_applied_at timestamptz,
  add column if not exists legal_hold_released_at timestamptz,
  add column if not exists raw_camera_stored_until timestamptz,
  add column if not exists raw_audio_stored_until timestamptz,
  add column if not exists precise_location_expires_at timestamptz,
  add column if not exists session_metadata_anonymized_at timestamptz,
  add column if not exists user_pops_deletion_requested_at timestamptz;

create index if not exists idx_pops_sessions_legal_hold
  on pops_sessions (legal_hold)
  where legal_hold = true;

create index if not exists idx_pops_sessions_retention_reason
  on pops_sessions (retention_reason)
  where retention_reason is not null;

alter table if exists pops_events
  add column if not exists retention_extended_until timestamptz,
  add column if not exists anonymized_at timestamptz,
  add column if not exists payload_redacted boolean not null default false;

create index if not exists idx_pops_events_anonymize_candidates
  on pops_events (server_received_at)
  where anonymized_at is null and payload_redacted = false;

alter table if exists pops_signal_batches
  add column if not exists aggregated_at timestamptz,
  add column if not exists raw_payload_deleted_at timestamptz,
  add column if not exists retention_hold_reason text;

create index if not exists idx_pops_signal_batches_raw_ttl
  on pops_signal_batches (server_received_at)
  where raw_payload is not null and raw_payload_deleted_at is null;

alter table if exists pops_session_aggregates
  add column if not exists analytics_anonymized_at timestamptz;
