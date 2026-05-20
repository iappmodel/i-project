-- Step 7.11 — RLS and role grants hardening.
-- Lock down direct table access and force controlled function-driven writes.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_api_role') then
    create role app_api_role;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'worker_role') then
    create role worker_role;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'finance_worker_role') then
    create role finance_worker_role;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'admin_api_role') then
    create role admin_api_role;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'readonly_audit_role') then
    create role readonly_audit_role;
  end if;
exception
  when insufficient_privilege then
    raise notice 'Role creation skipped: insufficient privilege.';
end
$$;

do $$
begin
  if to_regclass('public.withdrawal_review_queue') is not null then
    drop policy if exists admin_all_withdrawal_review_queue on withdrawal_review_queue;
    create policy admin_all_withdrawal_review_queue
    on withdrawal_review_queue
    for all
    to admin_api_role
    using (true)
    with check (true);
  end if;
end
$$;

revoke all on schema public from public;

do $$
declare
  v_role text;
begin
  foreach v_role in array array[
    'authenticated',
    'app_api_role',
    'worker_role',
    'finance_worker_role',
    'admin_api_role',
    'readonly_audit_role'
  ]
  loop
    if exists (select 1 from pg_roles where rolname = v_role) then
      execute format('grant usage on schema public to %I', v_role);
    end if;
  end loop;
end
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'wallets',
    'wallet_value_lots',
    'wallet_ledger_entries',
    'campaign_budgets',
    'campaign_budget_reservations',
    'runtime_signal_schema_versions',
    'attention_scoring_formula_versions',
    'attention_model_versions',
    'attention_pipeline_versions',
    'attention_pipeline_model_links',
    'attention_verification_sessions',
    'attention_verification_events',
    'attention_frame_summaries',
    'attention_fraud_signals',
    'reward_issuance_groups',
    'reward_policies',
    'reward_issuance_runs',
    'reward_release_runs',
    'accounting_accounts',
    'accounting_journal_entries',
    'accounting_journal_lines',
    'accounting_mirror_runs',
    'audit_hash_chain_entries',
    'audit_hash_chain_verification_runs',
    'audit_hash_chain_verification_issues',
    'audit_hash_chain_anchors',
    'audit_hash_backfill_runs',
    'scheduled_jobs',
    'scheduled_job_runs',
    'scheduled_job_locks',
    'error_catalog',
    'error_events',
    'error_mapping_rules',
    'platform_events',
    'system_health_snapshots',
    'observability_runs',
    'alert_rules',
    'alert_events',
    'withdrawal_limit_policies',
    'withdrawal_trust_gate_evaluations',
    'withdrawal_review_queue'
  ]
  loop
    if to_regclass(format('public.%I', v_table)) is not null then
      execute format('alter table %I enable row level security', v_table);
    end if;
  end loop;
end
$$;

do $$
begin
  if to_regclass('public.wallets') is not null then
    drop policy if exists wallets_user_read_own on wallets;
    create policy wallets_user_read_own
    on wallets
    for select
    to authenticated
    using (user_id = auth.uid());

    drop policy if exists wallets_no_user_write on wallets;
    create policy wallets_no_user_write
    on wallets
    for all
    to authenticated
    using (false)
    with check (false);
  end if;

  if to_regclass('public.wallet_ledger_entries') is not null then
    drop policy if exists wallet_ledger_entries_user_read_own on wallet_ledger_entries;
    create policy wallet_ledger_entries_user_read_own
    on wallet_ledger_entries
    for select
    to authenticated
    using (user_id = auth.uid());

    drop policy if exists wallet_ledger_entries_no_user_write on wallet_ledger_entries;
    create policy wallet_ledger_entries_no_user_write
    on wallet_ledger_entries
    for all
    to authenticated
    using (false)
    with check (false);
  end if;

  if to_regclass('public.wallet_value_lots') is not null then
    drop policy if exists wallet_value_lots_user_read_own_limited on wallet_value_lots;
    create policy wallet_value_lots_user_read_own_limited
    on wallet_value_lots
    for select
    to authenticated
    using (user_id = auth.uid());

    drop policy if exists wallet_value_lots_no_user_write on wallet_value_lots;
    create policy wallet_value_lots_no_user_write
    on wallet_value_lots
    for all
    to authenticated
    using (false)
    with check (false);
  end if;
end
$$;

do $$
begin
  if to_regclass('public.attention_verification_sessions') is not null then
    drop policy if exists attention_sessions_user_read_own on attention_verification_sessions;
    create policy attention_sessions_user_read_own
    on attention_verification_sessions
    for select
    to authenticated
    using (user_id = auth.uid());

    drop policy if exists attention_sessions_no_user_write on attention_verification_sessions;
    create policy attention_sessions_no_user_write
    on attention_verification_sessions
    for all
    to authenticated
    using (false)
    with check (false);
  end if;

  if to_regclass('public.attention_verification_events') is not null then
    drop policy if exists attention_events_user_read_own on attention_verification_events;
    create policy attention_events_user_read_own
    on attention_verification_events
    for select
    to authenticated
    using (user_id = auth.uid());

    drop policy if exists attention_events_no_user_write on attention_verification_events;
    create policy attention_events_no_user_write
    on attention_verification_events
    for all
    to authenticated
    using (false)
    with check (false);
  end if;

  if to_regclass('public.attention_frame_summaries') is not null then
    drop policy if exists attention_frame_summaries_user_read_own on attention_frame_summaries;
    create policy attention_frame_summaries_user_read_own
    on attention_frame_summaries
    for select
    to authenticated
    using (user_id = auth.uid());

    drop policy if exists attention_frame_summaries_no_user_write on attention_frame_summaries;
    create policy attention_frame_summaries_no_user_write
    on attention_frame_summaries
    for all
    to authenticated
    using (false)
    with check (false);
  end if;

  if to_regclass('public.attention_fraud_signals') is not null then
    drop policy if exists attention_fraud_signals_no_user_access on attention_fraud_signals;
    create policy attention_fraud_signals_no_user_access
    on attention_fraud_signals
    for all
    to authenticated
    using (false)
    with check (false);
  end if;
end
$$;

do $$
declare
  v_table text;
  v_policy text;
begin
  if to_regclass('public.reward_issuance_groups') is not null then
    drop policy if exists reward_issuance_groups_user_read_own on reward_issuance_groups;
    create policy reward_issuance_groups_user_read_own
    on reward_issuance_groups
    for select
    to authenticated
    using (user_id = auth.uid());

    drop policy if exists reward_issuance_groups_no_user_write on reward_issuance_groups;
    create policy reward_issuance_groups_no_user_write
    on reward_issuance_groups
    for all
    to authenticated
    using (false)
    with check (false);
  end if;

  if to_regclass('public.reward_policies') is not null then
    drop policy if exists reward_policies_no_user_access on reward_policies;
    create policy reward_policies_no_user_access
    on reward_policies
    for all
    to authenticated
    using (false)
    with check (false);
  end if;

  for v_table, v_policy in
    select *
    from (
      values
        ('campaign_budgets', 'campaign_budgets_no_user_access'),
        ('campaign_budget_reservations', 'campaign_budget_reservations_no_user_access'),
        ('runtime_signal_schema_versions', 'runtime_signal_schema_no_user_access'),
        ('attention_scoring_formula_versions', 'scoring_formula_no_user_access'),
        ('attention_model_versions', 'model_versions_no_user_access'),
        ('attention_pipeline_versions', 'pipeline_versions_no_user_access'),
        ('attention_pipeline_model_links', 'pipeline_model_links_no_user_access'),
        ('accounting_accounts', 'accounting_accounts_no_user_access'),
        ('accounting_journal_entries', 'accounting_journal_entries_no_user_access'),
        ('accounting_journal_lines', 'accounting_journal_lines_no_user_access'),
        ('accounting_mirror_runs', 'accounting_mirror_runs_no_user_access'),
        ('audit_hash_chain_entries', 'audit_hash_chain_entries_no_user_access'),
        ('audit_hash_chain_verification_runs', 'audit_hash_chain_verification_runs_no_user_access'),
        ('audit_hash_chain_verification_issues', 'audit_hash_chain_verification_issues_no_user_access'),
        ('audit_hash_chain_anchors', 'audit_hash_chain_anchors_no_user_access'),
        ('audit_hash_backfill_runs', 'audit_hash_backfill_runs_no_user_access'),
        ('scheduled_jobs', 'scheduled_jobs_no_user_access'),
        ('scheduled_job_runs', 'scheduled_job_runs_no_user_access'),
        ('scheduled_job_locks', 'scheduled_job_locks_no_user_access'),
        ('error_catalog', 'error_catalog_no_user_access'),
        ('error_events', 'error_events_no_user_access'),
        ('error_mapping_rules', 'error_mapping_rules_no_user_access'),
        ('platform_events', 'platform_events_no_user_access'),
        ('system_health_snapshots', 'system_health_snapshots_no_user_access'),
        ('observability_runs', 'observability_runs_no_user_access'),
        ('alert_rules', 'alert_rules_no_user_access'),
        ('alert_events', 'alert_events_no_user_access'),
        ('withdrawal_limit_policies', 'withdrawal_limit_policies_no_user_access'),
        ('withdrawal_trust_gate_evaluations', 'withdrawal_trust_gate_evaluations_no_user_access'),
        ('withdrawal_review_queue', 'withdrawal_review_queue_no_user_access')
    ) as t(tbl, pol)
  loop
    if to_regclass(format('public.%I', v_table)) is not null then
      execute format('drop policy if exists %I on %I', v_policy, v_table);
      execute format(
        'create policy %I on %I for all to authenticated using (false) with check (false)',
        v_policy,
        v_table
      );
    end if;
  end loop;
end
$$;

do $$
begin
  if to_regclass('public.wallets') is not null then
    drop policy if exists app_api_read_wallets on wallets;
    create policy app_api_read_wallets
    on wallets
    for select
    to app_api_role
    using (true);

    drop policy if exists app_api_no_direct_wallet_write on wallets;
    create policy app_api_no_direct_wallet_write
    on wallets
    for all
    to app_api_role
    using (false)
    with check (false);
  end if;

  if to_regclass('public.wallet_ledger_entries') is not null then
    drop policy if exists app_api_read_wallet_ledger on wallet_ledger_entries;
    create policy app_api_read_wallet_ledger
    on wallet_ledger_entries
    for select
    to app_api_role
    using (true);

    drop policy if exists app_api_no_direct_wallet_ledger_write on wallet_ledger_entries;
    create policy app_api_no_direct_wallet_ledger_write
    on wallet_ledger_entries
    for all
    to app_api_role
    using (false)
    with check (false);
  end if;

  if to_regclass('public.wallet_value_lots') is not null then
    drop policy if exists app_api_read_wallet_lots on wallet_value_lots;
    create policy app_api_read_wallet_lots
    on wallet_value_lots
    for select
    to app_api_role
    using (true);

    drop policy if exists app_api_no_direct_wallet_lot_write on wallet_value_lots;
    create policy app_api_no_direct_wallet_lot_write
    on wallet_value_lots
    for all
    to app_api_role
    using (false)
    with check (false);
  end if;

  if to_regclass('public.attention_verification_sessions') is not null then
    drop policy if exists app_api_read_attention_sessions on attention_verification_sessions;
    create policy app_api_read_attention_sessions
    on attention_verification_sessions
    for select
    to app_api_role
    using (true);

    drop policy if exists app_api_no_direct_attention_session_write on attention_verification_sessions;
    create policy app_api_no_direct_attention_session_write
    on attention_verification_sessions
    for all
    to app_api_role
    using (false)
    with check (false);
  end if;

  if to_regclass('public.attention_verification_events') is not null then
    drop policy if exists app_api_read_attention_events on attention_verification_events;
    create policy app_api_read_attention_events
    on attention_verification_events
    for select
    to app_api_role
    using (true);

    drop policy if exists app_api_no_direct_attention_event_write on attention_verification_events;
    create policy app_api_no_direct_attention_event_write
    on attention_verification_events
    for all
    to app_api_role
    using (false)
    with check (false);
  end if;

  if to_regclass('public.reward_issuance_groups') is not null then
    drop policy if exists app_api_read_rewards on reward_issuance_groups;
    create policy app_api_read_rewards
    on reward_issuance_groups
    for select
    to app_api_role
    using (true);

    drop policy if exists app_api_no_direct_reward_write on reward_issuance_groups;
    create policy app_api_no_direct_reward_write
    on reward_issuance_groups
    for all
    to app_api_role
    using (false)
    with check (false);
  end if;
end
$$;

do $$
declare
  v_table text;
  v_policy text;
begin
  for v_table, v_policy in
    select *
    from (
      values
        ('reward_issuance_runs', 'worker_all_reward_runs'),
        ('reward_release_runs', 'worker_all_reward_release_runs'),
        ('scheduled_jobs', 'worker_all_scheduled_jobs'),
        ('scheduled_job_runs', 'worker_all_scheduled_job_runs'),
        ('scheduled_job_locks', 'worker_all_scheduled_job_locks'),
        ('error_events', 'worker_all_error_events'),
        ('platform_events', 'worker_all_platform_events'),
        ('observability_runs', 'worker_all_observability_runs'),
        ('system_health_snapshots', 'worker_all_system_health_snapshots'),
        ('alert_events', 'worker_all_alert_events'),
        ('reward_issuance_groups', 'worker_all_rewards'),
        ('campaign_budgets', 'worker_all_campaign_budgets'),
        ('campaign_budget_reservations', 'worker_all_campaign_budget_reservations'),
        ('wallets', 'worker_all_wallets'),
        ('wallet_value_lots', 'worker_all_wallet_lots'),
        ('wallet_ledger_entries', 'worker_all_wallet_ledger'),
        ('attention_verification_events', 'worker_all_attention_events'),
        ('accounting_journal_entries', 'worker_all_accounting_entries'),
        ('accounting_journal_lines', 'worker_all_accounting_lines'),
        ('accounting_mirror_runs', 'worker_all_accounting_runs'),
        ('audit_hash_chain_entries', 'worker_all_audit_entries'),
        ('audit_hash_backfill_runs', 'worker_all_audit_backfill_runs'),
        ('audit_hash_chain_verification_runs', 'worker_all_audit_verification_runs'),
        ('audit_hash_chain_verification_issues', 'worker_all_audit_verification_issues'),
        ('withdrawal_trust_gate_evaluations', 'worker_all_withdrawal_trust_gate_evaluations')
    ) as t(tbl, pol)
  loop
    if to_regclass(format('public.%I', v_table)) is not null then
      execute format('drop policy if exists %I on %I', v_policy, v_table);
      execute format(
        'create policy %I on %I for all to worker_role using (true) with check (true)',
        v_policy,
        v_table
      );
    end if;
  end loop;
end
$$;

do $$
declare
  v_table text;
  v_policy text;
begin
  for v_table, v_policy in
    select *
    from (
      values
        ('wallets', 'admin_read_wallets'),
        ('wallet_value_lots', 'admin_read_wallet_lots'),
        ('wallet_ledger_entries', 'admin_read_wallet_ledger'),
        ('attention_verification_sessions', 'admin_read_attention_sessions'),
        ('attention_verification_events', 'admin_read_attention_events'),
        ('attention_fraud_signals', 'admin_read_attention_fraud_signals'),
        ('reward_issuance_groups', 'admin_read_rewards'),
        ('campaign_budgets', 'admin_read_campaign_budgets'),
        ('campaign_budget_reservations', 'admin_read_campaign_budget_reservations'),
        ('accounting_journal_entries', 'admin_read_accounting_entries'),
        ('accounting_journal_lines', 'admin_read_accounting_lines'),
        ('audit_hash_chain_entries', 'admin_read_audit_entries'),
        ('scheduled_jobs', 'admin_read_scheduler'),
        ('scheduled_job_runs', 'admin_read_scheduler_runs'),
        ('error_events', 'admin_read_errors'),
        ('system_health_snapshots', 'admin_read_observability'),
        ('alert_events', 'admin_read_alert_events'),
        ('platform_events', 'admin_read_platform_events'),
        ('withdrawal_limit_policies', 'admin_read_withdrawal_limit_policies'),
        ('withdrawal_trust_gate_evaluations', 'admin_read_withdrawal_trust_gate_evaluations')
    ) as t(tbl, pol)
  loop
    if to_regclass(format('public.%I', v_table)) is not null then
      execute format('drop policy if exists %I on %I', v_policy, v_table);
      execute format(
        'create policy %I on %I for select to admin_api_role using (true)',
        v_policy,
        v_table
      );
    end if;
  end loop;

  for v_table, v_policy in
    select *
    from (
      values
        ('wallets', 'admin_no_direct_wallet_write'),
        ('wallet_ledger_entries', 'admin_no_direct_wallet_ledger_write'),
        ('wallet_value_lots', 'admin_no_direct_wallet_lot_write'),
        ('reward_issuance_groups', 'admin_no_direct_reward_write'),
        ('accounting_journal_entries', 'admin_no_direct_accounting_entry_write'),
        ('accounting_journal_lines', 'admin_no_direct_accounting_line_write')
    ) as t(tbl, pol)
  loop
    if to_regclass(format('public.%I', v_table)) is not null then
      execute format('drop policy if exists %I on %I', v_policy, v_table);
      execute format(
        'create policy %I on %I for all to admin_api_role using (false) with check (false)',
        v_policy,
        v_table
      );
    end if;
  end loop;
end
$$;

do $$
declare
  v_table text;
  v_policy text;
begin
  for v_table, v_policy in
    select *
    from (
      values
        ('wallet_ledger_entries', 'audit_read_wallet_ledger'),
        ('reward_issuance_groups', 'audit_read_rewards'),
        ('attention_verification_events', 'audit_read_attention_events'),
        ('accounting_journal_entries', 'audit_read_accounting_entries'),
        ('accounting_journal_lines', 'audit_read_accounting_lines'),
        ('audit_hash_chain_entries', 'audit_read_hash_entries'),
        ('audit_hash_chain_verification_runs', 'audit_read_hash_verification_runs'),
        ('audit_hash_chain_verification_issues', 'audit_read_hash_verification_issues'),
        ('audit_hash_chain_anchors', 'audit_read_hash_anchors')
    ) as t(tbl, pol)
  loop
    if to_regclass(format('public.%I', v_table)) is not null then
      execute format('drop policy if exists %I on %I', v_policy, v_table);
      execute format(
        'create policy %I on %I for select to readonly_audit_role using (true)',
        v_policy,
        v_table
      );
    end if;
  end loop;
end
$$;

do $$
declare
  v_view text;
begin
  foreach v_view in array array[
    'user_wallet_summary',
    'user_wallet_ledger',
    'attention_event_summary',
    'reward_issuance_details'
  ]
  loop
    if to_regclass(format('public.%I', v_view)) is not null then
      execute format('grant select on %I to authenticated', v_view);
      begin
        execute format('alter view %I set (security_invoker = true)', v_view);
      exception
        when others then
          null;
      end;
    end if;
  end loop;
end
$$;

do $$
declare
  v_view text;
begin
  foreach v_view in array array[
    'wallet_integrity_check',
    'campaign_budget_summary',
    'campaign_budget_integrity_check',
    'attention_runtime_dashboard',
    'attention_runtime_integrity_check',
    'attention_runtime_provenance_details',
    'attention_verification_health',
    'reward_issuance_integrity_check',
    'reward_flow_dashboard',
    'accounting_account_balances',
    'accounting_unbalanced_journals',
    'accounting_missing_reward_mirrors',
    'accounting_journal_details',
    'money_integrity_dashboard',
    'audit_hash_missing_records',
    'audit_hash_chain_dashboard',
    'audit_hash_chain_verification_dashboard',
    'scheduled_job_dashboard',
    'scheduled_job_alerts',
    'error_event_dashboard',
    'critical_error_alerts',
    'platform_operations_dashboard',
    'reward_operations_dashboard',
    'attention_operations_dashboard',
    'wallet_operations_dashboard',
    'audit_operations_dashboard',
    'alert_dashboard',
    'admin_withdrawal_review_queue',
    'admin_withdrawal_trust_gate_detail'
  ]
  loop
    if to_regclass(format('public.%I', v_view)) is not null then
      if v_view in (
        'wallet_integrity_check',
        'campaign_budget_integrity_check',
        'reward_issuance_integrity_check',
        'accounting_account_balances',
        'accounting_unbalanced_journals',
        'accounting_missing_reward_mirrors',
        'accounting_journal_details',
        'money_integrity_dashboard',
        'audit_hash_missing_records',
        'audit_hash_chain_dashboard',
        'audit_hash_chain_verification_dashboard'
      ) then
        execute format('grant select on %I to admin_api_role, readonly_audit_role', v_view);
      else
        execute format('grant select on %I to admin_api_role', v_view);
      end if;
    end if;
  end loop;
end
$$;

do $$
declare
  v_sig text;
begin
  foreach v_sig in array array[
    'public.create_wallet(uuid,text,jsonb)',
    'public.start_attention_verification_session(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text,text,text,jsonb)',
    'public.complete_attention_verification_event(uuid,text,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,integer,integer,integer,integer,boolean,text,jsonb)',
    'public.fail_attention_verification_session(uuid,text,jsonb)'
  ]
  loop
    if to_regprocedure(v_sig) is not null then
      execute format('grant execute on function %s to app_api_role', v_sig);
    end if;
  end loop;

  foreach v_sig in array array[
    'public.queue_reward_from_attention_event(uuid,bigint,text,jsonb)',
    'public.issue_reward_group(uuid,jsonb)',
    'public.issue_reward_from_attention_event(uuid,bigint,text,jsonb)',
    'public.run_reward_issuance_job(integer,jsonb)',
    'public.release_mature_reward_lots(integer,jsonb)',
    'public.run_accounting_mirror_job(integer,jsonb)',
    'public.mirror_accounting_reward_issued(uuid,jsonb)',
    'public.run_audit_hash_backfill_job(integer,jsonb)',
    'public.verify_audit_hash_chain(text,integer,jsonb)',
    'public.run_scheduled_job(text,text,jsonb)',
    'public.create_system_health_snapshot(text,jsonb)',
    'public.run_observability_snapshot_job(jsonb)',
    'public.evaluate_alert_rules(jsonb)'
  ]
  loop
    if to_regprocedure(v_sig) is not null then
      execute format('grant execute on function %s to worker_role', v_sig);
    end if;
  end loop;

  foreach v_sig in array array[
    'public.verify_audit_hash_chain(text,integer,jsonb)'
  ]
  loop
    if to_regprocedure(v_sig) is not null then
      execute format('grant execute on function %s to readonly_audit_role', v_sig);
    end if;
  end loop;

  if to_regprocedure('public.register_audit_hash_chain_anchor(text,bigint,text,text,text,text,jsonb)') is not null then
    execute 'revoke execute on function public.register_audit_hash_chain_anchor(text,bigint,text,text,text,text,jsonb) from readonly_audit_role';
  end if;

  foreach v_sig in array array[
    'public.acknowledge_alert_event(uuid,jsonb)',
    'public.resolve_alert_event(uuid,text,jsonb)',
    'public.approve_withdrawal_review(uuid,text,text,jsonb)',
    'public.block_withdrawal_review(uuid,text,text,jsonb)'
  ]
  loop
    if to_regprocedure(v_sig) is not null then
      execute format('grant execute on function %s to admin_api_role', v_sig);
    end if;
  end loop;

  foreach v_sig in array array[
    'public.build_api_error_response(text,text,jsonb)',
    'public.resolve_error_code_from_raw_error(text)',
    'public.record_error_event(text,text,text,text,uuid,uuid,text,text,text,text,text,text,uuid,jsonb)',
    'public.evaluate_withdrawal_trust_gate(uuid,uuid,bigint,text,uuid,jsonb)'
  ]
  loop
    if to_regprocedure(v_sig) is not null then
      execute format('grant execute on function %s to app_api_role, admin_api_role, worker_role', v_sig);
    end if;
  end loop;
end
$$;

do $$
declare
  v_sig text;
begin
  foreach v_sig in array array[
    'public.create_wallet(uuid,text,jsonb)',
    'public.post_wallet_ledger_entry(uuid,uuid,text,text,uuid,bigint,bigint,bigint,text,text,jsonb)',
    'public.start_attention_verification_session(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text,text,text,jsonb)',
    'public.complete_attention_verification_event(uuid,text,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,integer,integer,integer,integer,boolean,text,jsonb)',
    'public.run_reward_issuance_job(integer,jsonb)',
    'public.issue_reward_group(uuid,jsonb)',
    'public.release_mature_reward_lots(integer,jsonb)',
    'public.run_accounting_mirror_job(integer,jsonb)',
    'public.run_audit_hash_backfill_job(integer,jsonb)',
    'public.verify_audit_hash_chain(text,integer,jsonb)',
    'public.run_scheduled_job(text,text,jsonb)',
    'public.run_observability_snapshot_job(jsonb)',
    'public.evaluate_withdrawal_trust_gate(uuid,uuid,bigint,text,uuid,jsonb)',
    'public.approve_withdrawal_review(uuid,text,text,jsonb)',
    'public.block_withdrawal_review(uuid,text,text,jsonb)'
  ]
  loop
    if to_regprocedure(v_sig) is not null then
      execute format('alter function %s security definer', v_sig);
      execute format('alter function %s set search_path = public', v_sig);
    end if;
  end loop;
end
$$;

do $$
declare
  v_sig text;
begin
  foreach v_sig in array array[
    'public.post_wallet_ledger_entry(uuid,uuid,text,text,uuid,bigint,bigint,bigint,text,text,jsonb)',
    'public.create_available_wallet_value_lot(uuid,uuid,bigint,text,uuid,text,jsonb)',
    'public.reserve_campaign_budget(uuid,bigint,uuid,uuid,uuid,uuid,text,jsonb)',
    'public.mark_campaign_budget_reservation_issued(uuid,uuid,jsonb)',
    'public.issue_reward_from_attention_event(uuid,bigint,text,jsonb)',
    'public.issue_reward_group(uuid,jsonb)',
    'public.run_reward_issuance_job(integer,jsonb)',
    'public.run_accounting_mirror_job(integer,jsonb)',
    'public.run_scheduled_job(text,text,jsonb)'
  ]
  loop
    if to_regprocedure(v_sig) is not null then
      execute format('revoke execute on function %s from authenticated', v_sig);
    end if;
  end loop;
end
$$;
