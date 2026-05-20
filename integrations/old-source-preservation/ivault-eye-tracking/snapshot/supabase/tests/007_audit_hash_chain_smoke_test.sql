do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_wallet_id uuid;
  v_campaign_id uuid := gen_random_uuid();

  v_session_id uuid;
  v_event_id uuid;
  v_reward_group_id uuid;

  v_accounting_run_id uuid;
  v_hash_run_id uuid;
  v_verify_run_id uuid;
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
    'test_audit_attention_complete:' || v_session_id::text,
    '{"test": true}'::jsonb
  );

  v_reward_group_id := issue_reward_from_attention_event(
    v_event_id,
    100,
    'test_audit_reward:' || v_event_id::text,
    '{"test": true}'::jsonb
  );

  v_accounting_run_id := run_accounting_mirror_job(
    500,
    '{"test": true}'::jsonb
  );

  if v_accounting_run_id is null then
    raise exception 'accounting mirror run was not created';
  end if;

  v_hash_run_id := run_audit_hash_backfill_job(
    1000,
    '{"test": true}'::jsonb
  );

  if v_hash_run_id is null then
    raise exception 'audit hash backfill run was not created';
  end if;

  if exists (
    select 1
    from audit_hash_missing_records
  ) then
    raise exception 'audit hash missing records still exist after backfill';
  end if;

  v_verify_run_id := verify_audit_hash_chain(
    'global_audit_chain',
    100000,
    '{"test": true}'::jsonb
  );

  if exists (
    select 1
    from audit_hash_chain_verification_runs
    where id = v_verify_run_id
      and broken_entry_count <> 0
  ) then
    raise exception 'audit hash chain verification failed';
  end if;

  if not exists (
    select 1
    from audit_hash_chain_dashboard
    where chain_key = 'global_audit_chain'
      and entry_count > 0
      and missing_hash_record_count = 0
  ) then
    raise exception 'audit hash chain dashboard incorrect';
  end if;

  if v_reward_group_id is null then
    raise exception 'reward group was not created';
  end if;
end $$;
