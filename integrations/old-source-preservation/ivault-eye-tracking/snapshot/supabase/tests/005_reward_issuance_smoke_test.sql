do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_wallet_id uuid;
  v_campaign_id uuid := gen_random_uuid();

  v_session_id uuid;
  v_event_id uuid;

  v_budget_id uuid;
  v_reward_group_id uuid;
begin
  perform seed_demo_attention_runtime(
    '{"test": true}'::jsonb
  );

  v_wallet_id := create_wallet(
    v_user_id,
    'USD',
    '{"test": true}'::jsonb
  );

  v_budget_id := create_campaign_budget(
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
    'test_reward_attention_complete:' || v_session_id::text,
    '{"test": true}'::jsonb
  );

  v_reward_group_id := issue_reward_from_attention_event(
    v_event_id,
    100,
    'test_reward_from_attention:' || v_event_id::text,
    '{"test": true}'::jsonb
  );

  if v_reward_group_id is null then
    raise exception 'reward group was not created';
  end if;

  if not exists (
    select 1
    from reward_issuance_groups
    where id = v_reward_group_id
      and status = 'completed'
      and reward_amount_minor = 100
  ) then
    raise exception 'reward group not completed correctly';
  end if;

  if not exists (
    select 1
    from attention_verification_events
    where id = v_event_id
      and reward_issued is true
      and reward_id = v_reward_group_id
  ) then
    raise exception 'attention event reward flags incorrect';
  end if;

  if not exists (
    select 1
    from wallets
    where id = v_wallet_id
      and pending_balance_minor = 100
      and total_balance_minor = 100
  ) then
    raise exception 'wallet pending balance incorrect after reward';
  end if;

  if not exists (
    select 1
    from campaign_budget_summary
    where campaign_id = v_campaign_id
      and issued_amount_minor = 100
      and available_amount_minor = 9900
  ) then
    raise exception 'campaign budget was not issued correctly';
  end if;

  if exists (
    select 1
    from reward_issuance_integrity_check
    where reward_issuance_group_id = v_reward_group_id
      and has_integrity_issue is true
  ) then
    raise exception 'reward integrity check failed';
  end if;

  if exists (
    select 1
    from wallet_integrity_check
    where wallet_id = v_wallet_id
      and (
        total_balance_delta_minor <> 0
        or pending_vs_ledger_delta_minor <> 0
        or available_vs_ledger_delta_minor <> 0
        or locked_vs_ledger_delta_minor <> 0
      )
  ) then
    raise exception 'wallet integrity failed after reward';
  end if;
end $$;
