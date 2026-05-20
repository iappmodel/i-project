do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_wallet_id uuid;
  v_campaign_id uuid := gen_random_uuid();

  v_session_id uuid;
  v_event_id uuid;

  v_reward_group_id uuid;
  v_mirror_run_id uuid;
begin
  perform seed_demo_attention_runtime(
    '{"test": true}'::jsonb
  );

  v_wallet_id := create_wallet(
    v_user_id,
    'USD',
    '{"test": true}'::jsonb
  );

  perform create_campaign_budget(
    v_campaign_id,
    10000,
    null,
    'USD',
    '{"test": true}'::jsonb
  );

  v_session_id := start_attention_verification_session(
    v_user_id,
    v_wallet_id,
    v_campaign_id,
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid(),
    '1.0.0-test',
    'android',
    'vision_model_v1',
    'runtime_pipeline_v1',
    'runtime_signals_v1',
    'attention_score_v1',
    '{"test": true}'::jsonb
  );

  v_event_id := complete_attention_verification_event(
    v_session_id,
    'passed',
    'test_attention_verified',
    0.9200,
    0.9300,
    0.0500,
    0.9000,
    0.9100,
    0.8800,
    0.9500,
    1.0000,
    300,
    10,
    2,
    5,
    null,
    'test_accounting_attention_complete:' || v_session_id::text,
    '{"test": true}'::jsonb
  );

  v_reward_group_id := issue_reward_from_attention_event(
    v_event_id,
    100,
    'test_accounting_reward:' || v_event_id::text,
    '{"test": true}'::jsonb
  );

  v_mirror_run_id := run_accounting_mirror_job(
    500,
    '{"test": true}'::jsonb
  );

  if v_mirror_run_id is null then
    raise exception 'accounting mirror run was not created';
  end if;

  if exists (
    select 1
    from accounting_unbalanced_journals
  ) then
    raise exception 'unbalanced accounting journal exists';
  end if;

  if exists (
    select 1
    from accounting_missing_reward_mirrors
  ) then
    raise exception 'missing reward accounting mirror exists';
  end if;

  if not exists (
    select 1
    from accounting_journal_entries
    where source_type = 'reward_issuance_group'
      and source_id = v_reward_group_id
      and total_debit_minor = 100
      and total_credit_minor = 100
      and status = 'posted'
  ) then
    raise exception 'reward accounting journal was not posted correctly';
  end if;

  if exists (
    select 1
    from money_integrity_dashboard
    where unbalanced_journal_count <> 0
       or missing_reward_mirror_count <> 0
       or wallet_vs_accounting_delta_minor <> 0
  ) then
    raise exception 'money integrity dashboard failed';
  end if;
end $$;
