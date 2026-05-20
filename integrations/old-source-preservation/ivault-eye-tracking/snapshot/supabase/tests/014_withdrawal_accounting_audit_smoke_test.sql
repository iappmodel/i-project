do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_wallet_id uuid;
  v_withdrawal_id uuid;
  v_payout_id uuid;
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
    'test_withdrawal_available_credit:' || v_wallet_id::text,
    '{"test": true}'::jsonb
  );

  v_withdrawal_id := create_withdrawal_request(
    v_user_id,
    v_wallet_id,
    500,
    'manual_demo',
    0,
    'USD',
    'test_withdrawal_request:' || v_wallet_id::text,
    '{"test": true}'::jsonb
  );

  perform reserve_wallet_funds_for_withdrawal(
    v_withdrawal_id,
    '{"test": true}'::jsonb
  );

  v_payout_id := submit_withdrawal_to_provider(
    v_withdrawal_id,
    'manual_demo',
    'demo_provider_payout_001',
    null,
    'manual_ref_001',
    '{"test": true}'::jsonb
  );

  perform mark_withdrawal_paid(
    v_withdrawal_id,
    v_payout_id,
    'manual_paid_ref_001',
    '{"test": true}'::jsonb
  );

  perform run_accounting_mirror_job(
    500,
    '{"test": true}'::jsonb
  );

  perform run_audit_hash_backfill_job(
    1000,
    '{"test": true}'::jsonb
  );

  perform verify_audit_hash_chain(
    'global_audit_chain',
    100000,
    '{"test": true}'::jsonb
  );

  if exists (
    select 1
    from withdrawal_integrity_check
    where withdrawal_request_id = v_withdrawal_id
      and has_integrity_issue is true
  ) then
    raise exception 'withdrawal integrity failed';
  end if;

  if exists (
    select 1
    from accounting_unbalanced_journals
  ) then
    raise exception 'unbalanced journal after withdrawal';
  end if;

  if exists (
    select 1
    from accounting_missing_money_mirrors
  ) then
    raise exception 'missing accounting mirror after withdrawal';
  end if;

  if exists (
    select 1
    from audit_hash_missing_records
  ) then
    raise exception 'missing audit hash after withdrawal';
  end if;

  if exists (
    select 1
    from money_integrity_dashboard
    where wallet_vs_accounting_delta_minor <> 0
  ) then
    raise exception 'wallet/accounting delta after withdrawal';
  end if;
end
$$;
