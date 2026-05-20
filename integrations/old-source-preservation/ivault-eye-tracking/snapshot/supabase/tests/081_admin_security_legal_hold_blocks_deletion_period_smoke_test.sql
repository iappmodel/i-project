do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_hold_id uuid;
  v_challenge_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'legal-hold-period@example.com',
    'Legal Hold Period',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'legal hold period smoke bootstrap'
  );

  insert into admin_mfa_factors (
    admin_auth_user_id,
    admin_user_id,
    factor_type,
    provider,
    status,
    label,
    secret_ciphertext,
    secret_key_version,
    confirmed_at,
    metadata
  )
  values (
    v_admin_auth_user_id,
    v_admin_user_id,
    'totp',
    'totp',
    'active',
    'Legal Hold Factor',
    'v1.fake.fake.fake',
    'v1',
    now(),
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_admin_auth_user_id,
    'stub',
    'privileged_action',
    'legal-hold-period-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'legal-hold-period-mfa',
    '{"test": true}'::jsonb
  );

  v_hold_id := create_admin_security_legal_hold(
    v_admin_auth_user_id,
    'legal_hold_period_smoke',
    'legal',
    'Period hold smoke',
    'Block deletion for test period.',
    'legal',
    'CASE-001',
    now() - interval '1 day',
    null,
    'legal-hold-period-create',
    '{"test": true}'::jsonb
  );

  perform add_admin_security_legal_hold_target(
    v_admin_auth_user_id,
    v_hold_id,
    'source_period',
    'admin_security_notification_delivery',
    null,
    now() - interval '700 days',
    now() - interval '300 days',
    null,
    null,
    'legal-hold-period-target',
    '{"test": true}'::jsonb
  );

  begin
    perform require_no_admin_security_legal_hold(
      'admin_security_notification_delivery',
      null,
      now() - interval '600 days',
      now() - interval '400 days',
      null,
      null
    );

    raise exception 'legal hold should have blocked operation';
  exception
    when others then
      if sqlerrm not like '%active legal hold blocks this operation%' then
        raise;
      end if;
  end;
end $$;
