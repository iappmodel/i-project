-- Stage 32 rollback: P.O.P.S retention support fields

drop index if exists idx_pops_signal_batches_raw_ttl;
alter table if exists pops_signal_batches
  drop column if exists aggregated_at,
  drop column if exists raw_payload_deleted_at,
  drop column if exists retention_hold_reason;

drop index if exists idx_pops_events_anonymize_candidates;
alter table if exists pops_events
  drop column if exists retention_extended_until,
  drop column if exists anonymized_at,
  drop column if exists payload_redacted;

alter table if exists pops_session_aggregates
  drop column if exists analytics_anonymized_at;

drop index if exists idx_pops_sessions_retention_reason;
drop index if exists idx_pops_sessions_legal_hold;
alter table if exists pops_sessions
  drop column if exists retention_reason,
  drop column if exists legal_hold,
  drop column if exists legal_hold_reason,
  drop column if exists legal_hold_applied_at,
  drop column if exists legal_hold_released_at,
  drop column if exists raw_camera_stored_until,
  drop column if exists raw_audio_stored_until,
  drop column if exists precise_location_expires_at,
  drop column if exists session_metadata_anonymized_at,
  drop column if exists user_pops_deletion_requested_at;
