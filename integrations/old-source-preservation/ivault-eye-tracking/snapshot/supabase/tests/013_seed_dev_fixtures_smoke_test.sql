do $$
declare
  v_run_id uuid;
begin
  v_run_id := seed_demo_core_money_loop(
    'smoke_core_money_loop',
    'v1',
    '{"source": "fixture_smoke_test"}'::jsonb
  );

  if v_run_id is null then
    raise exception 'fixture run was not created';
  end if;

  if not exists (
    select 1
    from dev_fixture_runs
    where id = v_run_id
      and status = 'completed'
      and created_wallet_count = 1
      and created_campaign_count = 1
      and created_attention_event_count = 1
      and created_reward_count = 1
  ) then
    raise exception 'fixture run did not complete correctly';
  end if;

  if exists (
    select 1
    from money_integrity_dashboard
    where unbalanced_journal_count <> 0
       or missing_reward_mirror_count <> 0
       or wallet_vs_accounting_delta_minor <> 0
  ) then
    raise exception 'money integrity failed after fixture seed';
  end if;

  if exists (
    select 1
    from audit_hash_missing_records
  ) then
    raise exception 'audit hash missing records after fixture seed';
  end if;

  if exists (
    select 1
    from audit_hash_chain_verification_runs
    where id = (
      select (metadata->>'audit_verify_run_id')::uuid
      from dev_fixture_runs
      where id = v_run_id
    )
    and broken_entry_count <> 0
  ) then
    raise exception 'audit verification failed after fixture seed';
  end if;

  if not exists (
    select 1
    from platform_operations_dashboard
  ) then
    raise exception 'platform operations dashboard returned no rows after fixture seed';
  end if;
end $$;
