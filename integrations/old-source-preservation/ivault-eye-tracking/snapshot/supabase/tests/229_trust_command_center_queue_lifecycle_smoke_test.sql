do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_queue_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'command-queue-admin@example.com',
    'Command Queue Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'command queue bootstrap');

  v_queue_id := upsert_admin_security_trust_command_queue_item(
    'other',
    'medium',
    'Manual command queue smoke',
    'Manual command queue smoke summary.',
    'manual',
    'smoke',
    gen_random_uuid(),
    'manual-command-queue-smoke',
    'medium',
    'Queue Corp',
    'queue.example.com',
    now() + interval '1 day',
    '/admin/test',
    'Open',
    '{"test": true}'::jsonb,
    'command-queue-create',
    '{"test": true}'::jsonb
  );

  perform acknowledge_admin_security_trust_command_queue_item(
    v_admin_auth_user_id,
    v_queue_id,
    'command-queue-ack',
    '{"test": true}'::jsonb
  );

  perform resolve_admin_security_trust_command_queue_item(
    v_admin_auth_user_id,
    v_queue_id,
    'Resolved in smoke test.',
    'command-queue-resolve',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_trust_command_center_queue
    where id = v_queue_id
      and status = 'resolved'
  ) then
    raise exception 'command queue item was not resolved';
  end if;
end $$;
