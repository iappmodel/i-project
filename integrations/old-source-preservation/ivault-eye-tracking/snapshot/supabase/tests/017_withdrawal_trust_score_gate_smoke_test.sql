do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_wallet_id uuid;
begin
  v_wallet_id := create_wallet(
    v_user_id,
    'USD',
    '{"test": true}'::jsonb
  );

  perform create_available_wallet_value_lot(
    v_wallet_id,
    v_user_id,
    100000,
    'admin_credit',
    gen_random_uuid(),
    'test_trust_block_credit:' || v_wallet_id::text,
    '{"test": true}'::jsonb
  );

  perform add_user_trust_score_component(
    v_user_id,
    'admin_block_test',
    'admin',
    -1.0000,
    1.0000,
    1.0000,
    'test',
    gen_random_uuid(),
    'admin_block_test',
    'Smoke test block.',
    '{"test": true}'::jsonb
  );

  begin
    perform create_withdrawal_request(
      v_user_id,
      v_wallet_id,
      500,
      'manual_demo',
      0,
      'USD',
      'test_trust_block_withdrawal:' || v_wallet_id::text,
      '{"test": true}'::jsonb
    );

    raise exception 'withdrawal should have been blocked by trust score';
  exception
    when others then
      if sqlerrm not like '%withdrawal blocked by trust gate%' then
        raise;
      end if;
  end;

  if not exists (
    select 1
    from withdrawal_trust_gate_evaluations
    where wallet_id = v_wallet_id
      and decision = 'blocked'
      and reason_code = 'trust_tier_blocks_withdrawals'
  ) then
    raise exception 'trust-score blocked gate evaluation missing';
  end if;
end $$;

do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_wallet_id uuid;
  v_withdrawal_id uuid;
begin
  v_wallet_id := create_wallet(
    v_user_id,
    'USD',
    '{"test": true}'::jsonb
  );

  perform create_available_wallet_value_lot(
    v_wallet_id,
    v_user_id,
    100000,
    'admin_credit',
    gen_random_uuid(),
    'test_trust_review_credit:' || v_wallet_id::text,
    '{"test": true}'::jsonb
  );

  perform add_user_trust_score_component(
    v_user_id,
    'low_trust_test',
    'admin',
    -0.2000,
    0.0500,
    1.0000,
    'test',
    gen_random_uuid(),
    'low_trust_test',
    'Smoke test low trust.',
    '{"test": true}'::jsonb
  );

  v_withdrawal_id := create_withdrawal_request(
    v_user_id,
    v_wallet_id,
    500,
    'manual_demo',
    0,
    'USD',
    'test_trust_review_withdrawal:' || v_wallet_id::text,
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from withdrawal_requests
    where id = v_withdrawal_id
      and status = 'trust_review'
  ) then
    raise exception 'low trust withdrawal was not sent to review';
  end if;

  if not exists (
    select 1
    from withdrawal_trust_gate_evaluations
    where withdrawal_request_id = v_withdrawal_id
      and decision = 'review'
      and reason_code = 'trust_tier_requires_review'
  ) then
    raise exception 'trust review evaluation missing';
  end if;
end $$;
