do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_session_id text := 'smoke-session-revoked';
  v_challenge_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'session-revoke-admin@example.com',
    'Session Revoke Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'session revoke smoke bootstrap'
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
    'Smoke Factor',
    'v1.fake.fake.fake',
    'v1',
    now(),
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_admin_auth_user_id,
    'stub',
    'privileged_action',
    'session-revoke-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'session-revoke-mfa',
    '{"test": true}'::jsonb
  );

  perform touch_admin_session_control(
    v_admin_auth_user_id,
    v_session_id,
    'session-revoke-touch',
    '{"test": true}'::jsonb
  );

  perform admin_revoke_session(
    v_admin_auth_user_id,
    v_admin_auth_user_id,
    v_session_id,
    'smoke revoke own session',
    'session-revoke-request',
    '{"test": true}'::jsonb
  );

  begin
    perform require_admin_session_allowed(
      v_admin_auth_user_id,
      v_session_id,
      'smoke_sensitive_action',
      'session-revoke-check',
      '{"test": true}'::jsonb
    );

    raise exception 'revoked session should have been blocked';
  exception
    when others then
      if sqlerrm not like '%admin session has been revoked%' then
        raise;
      end if;
  end;
end $$;
