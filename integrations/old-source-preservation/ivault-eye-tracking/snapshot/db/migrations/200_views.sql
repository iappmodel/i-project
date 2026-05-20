create or replace view app_wallet_summary as
select
  w.id as wallet_id,
  w.user_id,
  w.currency_code,
  w.available_balance_minor,
  w.pending_balance_minor,
  w.locked_balance_minor,
  w.total_balance_minor,
  w.status,
  w.created_at,
  w.updated_at
from wallets w;

do $$
begin
  execute 'alter view app_wallet_summary set (security_invoker = true)';
exception
  when others then null;
end $$;

grant select on app_wallet_summary to authenticated;
grant select on app_wallet_summary to app_api_role;
grant select on app_wallet_summary to admin_api_role;

create or replace view app_wallet_ledger as
select
  wle.id as wallet_ledger_entry_id,
  wle.wallet_id,
  wle.user_id,
  wle.currency_code,
  wle.entry_type,
  wle.available_impact_minor,
  wle.pending_impact_minor,
  wle.locked_impact_minor,
  wle.status,
  case
    when wle.entry_type = 'reward_pending' then 'Reward pending'
    when wle.entry_type = 'reward_released' then 'Reward available'
    when wle.entry_type = 'withdrawal_reserved' then 'Withdrawal started'
    when wle.entry_type = 'withdrawal_paid' then 'Withdrawal paid'
    when wle.entry_type = 'withdrawal_failed_released' then 'Withdrawal failed'
    when wle.entry_type = 'admin_credit' then 'Account credit'
    when wle.entry_type = 'admin_debit' then 'Account adjustment'
    else 'Wallet activity'
  end as display_label,
  wle.created_at
from wallet_ledger_entries wle
where wle.status = 'posted';

do $$
begin
  execute 'alter view app_wallet_ledger set (security_invoker = true)';
exception
  when others then null;
end $$;

grant select on app_wallet_ledger to authenticated;
grant select on app_wallet_ledger to app_api_role;
grant select on app_wallet_ledger to admin_api_role;

create or replace view app_attention_history as
select
  ave.id as attention_event_id,
  ave.attention_session_id,
  ave.user_id,
  ave.wallet_id,
  ave.campaign_id,
  ave.creative_id,
  ave.placement_id,
  case
    when ave.decision = 'passed' then 'verified'
    when ave.decision = 'failed' then 'not_verified'
    when ave.decision = 'fraud_suspected' then 'not_accepted'
    when ave.decision = 'inconclusive' then 'try_again'
    else 'unknown'
  end as user_visible_result,
  ave.reward_eligible,
  ave.reward_issued,
  ave.reward_id,
  ave.occurred_at,
  ave.created_at
from attention_verification_events ave;

do $$
begin
  execute 'alter view app_attention_history set (security_invoker = true)';
exception
  when others then null;
end $$;

grant select on app_attention_history to authenticated;
grant select on app_attention_history to app_api_role;
grant select on app_attention_history to admin_api_role;

create or replace view app_reward_history as
select
  rig.id as reward_id,
  rig.attention_event_id,
  rig.user_id,
  rig.wallet_id,
  rig.campaign_id,
  rig.creative_id,
  rig.placement_id,
  rig.currency_code,
  rig.reward_amount_minor,
  rig.status,
  case
    when rig.status = 'pending' then 'Pending'
    when rig.status = 'processing' then 'Processing'
    when rig.status = 'completed' then 'Rewarded'
    when rig.status = 'failed' then 'Failed'
    when rig.status = 'cancelled' then 'Cancelled'
    when rig.status = 'clawed_back' then 'Adjusted'
    else 'Reward'
  end as display_status,
  rig.queued_at,
  rig.completed_at,
  rig.failed_at,
  rig.created_at,
  rig.updated_at
from reward_issuance_groups rig;

do $$
begin
  execute 'alter view app_reward_history set (security_invoker = true)';
exception
  when others then null;
end $$;

grant select on app_reward_history to authenticated;
grant select on app_reward_history to app_api_role;
grant select on app_reward_history to admin_api_role;

create or replace view admin_wallet_detail as
select
  w.id as wallet_id,
  w.user_id,
  w.currency_code,
  w.available_balance_minor,
  w.pending_balance_minor,
  w.locked_balance_minor,
  w.total_balance_minor,
  w.status,
  (
    select count(*)
    from wallet_value_lots l
    where l.wallet_id = w.id
  ) as value_lot_count,
  (
    select count(*)
    from wallet_value_lots l
    where l.wallet_id = w.id
      and l.status = 'pending'
  ) as pending_lot_count,
  (
    select count(*)
    from wallet_value_lots l
    where l.wallet_id = w.id
      and l.status = 'available'
  ) as available_lot_count,
  (
    select count(*)
    from wallet_ledger_entries e
    where e.wallet_id = w.id
      and e.status = 'posted'
  ) as ledger_entry_count,
  (
    select count(*)
    from reward_issuance_groups r
    where r.wallet_id = w.id
  ) as reward_count,
  (
    select count(*)
    from attention_verification_events a
    where a.wallet_id = w.id
  ) as attention_event_count,
  (
    select count(*)
    from attention_fraud_signals fs
    where fs.wallet_id = w.id
  ) as attention_fraud_signal_count,
  w.metadata,
  w.created_at,
  w.updated_at
from wallets w;

grant select on admin_wallet_detail to admin_api_role;

create or replace view admin_wallet_ledger_detail as
select
  wle.id as wallet_ledger_entry_id,
  wle.wallet_id,
  wle.user_id,
  wle.currency_code,
  wle.entry_type,
  wle.source_type,
  wle.source_id,
  wle.available_impact_minor,
  wle.pending_impact_minor,
  wle.locked_impact_minor,
  wle.status,
  wle.idempotency_key,
  wle.entry_hash,
  wle.previous_hash,
  wle.metadata,
  wle.created_at
from wallet_ledger_entries wle;

grant select on admin_wallet_ledger_detail to admin_api_role, readonly_audit_role;

create or replace view admin_attention_detail as
select
  ave.id as attention_event_id,
  ave.attention_session_id,
  ave.user_id,
  ave.wallet_id,
  ave.campaign_id,
  ave.creative_id,
  ave.placement_id,
  ave.device_id,
  ave.app_session_id,
  ave.model_version,
  ave.pipeline_version,
  ave.runtime_signal_schema_version,
  ave.scoring_formula_version,
  ave.decision,
  ave.decision_reason,
  ave.attention_score,
  ave.confidence_score,
  ave.fraud_risk_score,
  ave.quality_score,
  ave.gaze_score,
  ave.fixation_score,
  ave.liveness_score,
  ave.completion_score,
  ave.valid_frame_count,
  ave.invalid_frame_count,
  ave.no_face_frame_count,
  ave.gaze_invalid_frame_count,
  (
    ave.no_face_frame_count::numeric
    / greatest(ave.valid_frame_count + ave.invalid_frame_count, 1)
  )::numeric(8, 6) as no_face_rate,
  (
    ave.gaze_invalid_frame_count::numeric
    / greatest(ave.valid_frame_count + ave.invalid_frame_count, 1)
  )::numeric(8, 6) as gaze_invalid_rate,
  ave.reward_eligible,
  ave.reward_issued,
  ave.reward_id,
  (
    select count(*)
    from attention_fraud_signals fs
    where fs.attention_event_id = ave.id
  ) as fraud_signal_count,
  ave.idempotency_key,
  ave.occurred_at,
  ave.metadata,
  ave.created_at
from attention_verification_events ave;

grant select on admin_attention_detail to admin_api_role;

create or replace view admin_reward_detail as
select
  rig.id as reward_issuance_group_id,
  rig.attention_event_id,
  rig.user_id,
  rig.wallet_id,
  rig.campaign_id,
  rig.creative_id,
  rig.placement_id,
  rig.currency_code,
  rig.reward_amount_minor,
  rig.status,
  rig.failure_reason,
  rig.campaign_budget_reservation_id,
  cbr.status as campaign_budget_reservation_status,
  cbr.amount_minor as campaign_budget_reservation_amount_minor,
  rig.wallet_value_lot_id,
  wvl.status as wallet_value_lot_status,
  wvl.remaining_amount_minor as wallet_value_lot_remaining_minor,
  wvl.available_at as wallet_value_lot_available_at,
  rig.wallet_ledger_entry_id,
  wle.entry_type as wallet_ledger_entry_type,
  wle.pending_impact_minor as wallet_ledger_pending_impact_minor,
  wle.available_impact_minor as wallet_ledger_available_impact_minor,
  ave.decision as attention_decision,
  ave.attention_score,
  ave.confidence_score,
  ave.fraud_risk_score,
  ave.quality_score,
  (
    select count(*)
    from accounting_journal_entries aje
    where aje.source_type = 'reward_issuance_group'
      and aje.source_id = rig.id
      and aje.status = 'posted'
  ) as accounting_journal_count,
  (
    select count(*)
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'reward_issuance_group'
      and ahc.source_id = rig.id
      and ahc.status = 'active'
  ) as audit_hash_count,
  rig.queued_at,
  rig.processing_at,
  rig.completed_at,
  rig.failed_at,
  rig.cancelled_at,
  rig.metadata,
  rig.created_at,
  rig.updated_at
from reward_issuance_groups rig
left join campaign_budget_reservations cbr
  on cbr.id = rig.campaign_budget_reservation_id
left join wallet_value_lots wvl
  on wvl.id = rig.wallet_value_lot_id
left join wallet_ledger_entries wle
  on wle.id = rig.wallet_ledger_entry_id
left join attention_verification_events ave
  on ave.id = rig.attention_event_id;

grant select on admin_reward_detail to admin_api_role, readonly_audit_role;

create or replace view admin_campaign_budget_detail as
select
  cb.id as campaign_budget_id,
  cb.campaign_id,
  cb.advertiser_id,
  cb.currency_code,
  cb.funded_amount_minor,
  cb.reserved_amount_minor,
  cb.issued_amount_minor,
  cb.released_amount_minor,
  cb.expired_amount_minor,
  cb.refunded_amount_minor,
  (
    cb.funded_amount_minor
    - cb.reserved_amount_minor
    - cb.issued_amount_minor
    - cb.refunded_amount_minor
  )::bigint as available_amount_minor,
  cb.status,
  (
    select count(*)
    from campaign_budget_reservations cbr
    where cbr.campaign_budget_id = cb.id
  ) as reservation_count,
  (
    select count(*)
    from campaign_budget_reservations cbr
    where cbr.campaign_budget_id = cb.id
      and cbr.status = 'reserved'
  ) as active_reservation_count,
  (
    select count(*)
    from reward_issuance_groups rig
    where rig.campaign_id = cb.campaign_id
  ) as reward_count,
  (
    select count(*)
    from reward_issuance_groups rig
    where rig.campaign_id = cb.campaign_id
      and rig.status = 'completed'
  ) as completed_reward_count,
  (
    select coalesce(sum(reward_amount_minor), 0)
    from reward_issuance_groups rig
    where rig.campaign_id = cb.campaign_id
      and rig.status = 'completed'
  )::bigint as completed_reward_amount_minor,
  cb.metadata,
  cb.created_at,
  cb.updated_at
from campaign_budgets cb;

grant select on admin_campaign_budget_detail to admin_api_role;

create or replace view admin_accounting_journal_detail as
select
  *
from accounting_journal_details;

grant select on admin_accounting_journal_detail to admin_api_role, readonly_audit_role;

create or replace view admin_money_integrity as
select
  mid.unbalanced_journal_count,
  mid.missing_reward_mirror_count,
  mid.accounting_user_wallet_liability_minor,
  mid.wallet_total_balance_minor,
  mid.wallet_vs_accounting_delta_minor,
  (
    select count(*)
    from wallet_integrity_check
    where total_balance_delta_minor <> 0
       or available_vs_ledger_delta_minor <> 0
       or pending_vs_ledger_delta_minor <> 0
       or locked_vs_ledger_delta_minor <> 0
  ) as wallet_integrity_issue_count,
  (
    select count(*)
    from campaign_budget_integrity_check
    where has_integrity_issue is true
  ) as campaign_budget_integrity_issue_count,
  (
    select count(*)
    from reward_issuance_integrity_check
    where has_integrity_issue is true
  ) as reward_integrity_issue_count,
  mid.checked_at
from money_integrity_dashboard mid;

grant select on admin_money_integrity to admin_api_role, readonly_audit_role;

create or replace view admin_audit_integrity as
select
  aod.missing_hash_record_count,
  aod.hash_chain_entry_count,
  aod.latest_sequence_number,
  aod.latest_chain_hash,
  aod.broken_verification_runs_24h,
  aod.latest_verification_completed_at,
  (
    select count(*)
    from audit_hash_chain_anchors
  ) as anchor_count,
  (
    select max(anchored_at)
    from audit_hash_chain_anchors
  ) as latest_anchor_at,
  aod.checked_at
from audit_operations_dashboard aod;

grant select on admin_audit_integrity to admin_api_role, readonly_audit_role;

create or replace view admin_system_command_center as
select
  pod.latest_snapshot_id,
  pod.system_status,
  pod.snapshot_at,
  pod.wallet_count,
  pod.active_wallet_count,
  pod.total_available_balance_minor,
  pod.total_pending_balance_minor,
  pod.total_locked_balance_minor,
  pod.total_wallet_balance_minor,
  pod.reward_pending_count,
  pod.reward_completed_count_24h,
  pod.reward_failed_count_24h,
  pod.attention_event_count_1h,
  pod.attention_passed_count_1h,
  pod.attention_fraud_suspected_count_1h,
  pod.unbalanced_journal_count,
  pod.missing_reward_mirror_count,
  pod.wallet_accounting_delta_minor,
  pod.audit_missing_hash_record_count,
  pod.audit_broken_verification_count_24h,
  pod.failed_scheduled_job_count_24h,
  pod.critical_error_count_1h,
  pod.high_error_count_1h,
  pod.metrics,
  pod.job_alerts,
  pod.error_summary,
  (
    select jsonb_agg(
      jsonb_build_object(
        'alert_event_id', alert_event_id,
        'alert_key', alert_key,
        'alert_name', alert_name,
        'category', category,
        'severity', severity,
        'status', status,
        'metric_name', metric_name,
        'metric_value', metric_value,
        'threshold', threshold,
        'message', message,
        'created_at', created_at
      )
      order by
        case severity
          when 'critical' then 1
          when 'high' then 2
          else 3
        end,
        created_at desc
    )
    from alert_dashboard
    where status in ('open', 'acknowledged')
  ) as active_alerts
from platform_operations_dashboard pod;

grant select on admin_system_command_center to admin_api_role;

create or replace view admin_scheduler_dashboard as
select
  sjd.scheduled_job_id,
  sjd.job_key,
  sjd.job_name,
  sjd.job_group,
  sjd.enabled,
  sjd.schedule_cron,
  sjd.timezone,
  sjd.function_name,
  sjd.function_args,
  sjd.max_runtime_seconds,
  sjd.retry_limit,
  sjd.lock_ttl_seconds,
  sjd.last_started_at,
  sjd.last_completed_at,
  sjd.last_failed_at,
  sjd.last_status,
  sjd.last_run_id,
  sjd.currently_locked,
  sjd.locked_by,
  sjd.locked_at,
  sjd.lock_expires_at,
  sjd.failed_runs_24h,
  sjd.completed_runs_24h,
  sjd.avg_runtime_ms_24h,
  sja.alert_type
from scheduled_job_dashboard sjd
left join scheduled_job_alerts sja
  on sja.job_key = sjd.job_key;

grant select on admin_scheduler_dashboard to admin_api_role;

create or replace view admin_error_dashboard as
select
  eed.error_code,
  eed.category,
  eed.severity,
  eed.owner_team,
  eed.retryable,
  eed.total_count,
  eed.count_1h,
  eed.count_24h,
  eed.last_seen_at,
  eed.recent_events
from error_event_dashboard eed
order by
  case eed.severity
    when 'critical' then 1
    when 'high' then 2
    when 'medium' then 3
    else 4
  end,
  eed.count_1h desc,
  eed.count_24h desc;

grant select on admin_error_dashboard to admin_api_role;

create or replace view admin_alert_dashboard as
select
  *
from alert_dashboard;

grant select on admin_alert_dashboard to admin_api_role;

create or replace view app_user_home_snapshot as
select
  w.user_id,
  w.id as wallet_id,
  w.currency_code,
  w.available_balance_minor,
  w.pending_balance_minor,
  w.locked_balance_minor,
  w.total_balance_minor,
  w.status as wallet_status,
  (
    select count(*)
    from reward_issuance_groups rig
    where rig.user_id = w.user_id
      and rig.status = 'completed'
  ) as completed_reward_count,
  (
    select coalesce(sum(reward_amount_minor), 0)
    from reward_issuance_groups rig
    where rig.user_id = w.user_id
      and rig.status = 'completed'
  )::bigint as completed_reward_amount_minor,
  (
    select count(*)
    from attention_verification_events ave
    where ave.user_id = w.user_id
      and ave.occurred_at >= now() - interval '24 hours'
  ) as attention_event_count_24h,
  (
    select count(*)
    from attention_verification_events ave
    where ave.user_id = w.user_id
      and ave.reward_eligible is true
      and ave.occurred_at >= now() - interval '24 hours'
  ) as reward_eligible_attention_count_24h,
  w.updated_at as wallet_updated_at
from wallets w;

do $$
begin
  execute 'alter view app_user_home_snapshot set (security_invoker = true)';
exception
  when others then null;
end $$;

grant select on app_user_home_snapshot to authenticated;
grant select on app_user_home_snapshot to app_api_role;
