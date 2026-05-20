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
    1000,
    'admin_credit',
    gen_random_uuid(),
    'test_withdrawal_limits_credit:' || v_wallet_id::text,
    '{"test": true}'::jsonb
  );

  begin
    v_withdrawal_id := create_withdrawal_request(
      v_user_id,
      v_wallet_id,
      2000000,
      'manual_demo',
      0,
      'USD',
      'test_withdrawal_limit_block:' || v_wallet_id::text,
      '{"test": true}'::jsonb
    );

    raise exception 'withdrawal should have been blocked by limit';
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
  ) then
    raise exception 'blocked trust gate evaluation was not recorded';
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
    'test_withdrawal_review_credit:' || v_wallet_id::text,
    '{"test": true}'::jsonb
  );

  v_withdrawal_id := create_withdrawal_request(
    v_user_id,
    v_wallet_id,
    60000,
    'manual_demo',
    0,
    'USD',
    'test_withdrawal_review:' || v_wallet_id::text,
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from withdrawal_requests
    where id = v_withdrawal_id
      and status = 'trust_review'
  ) then
    raise exception 'withdrawal was not placed into trust review';
  end if;

  if not exists (
    select 1
    from withdrawal_review_queue
    where withdrawal_request_id = v_withdrawal_id
      and status = 'open'
  ) then
    raise exception 'withdrawal review queue item missing';
  end if;

  perform approve_withdrawal_review(
    v_withdrawal_id,
    'smoke_admin',
    'approved by smoke test',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from withdrawal_requests
    where id = v_withdrawal_id
      and status = 'approved'
  ) then
    raise exception 'review approval did not approve withdrawal';
  end if;
end $$;
