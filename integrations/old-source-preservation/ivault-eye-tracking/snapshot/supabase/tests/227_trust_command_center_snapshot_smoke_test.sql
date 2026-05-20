do $$
declare
  v_snapshot_id uuid;
  v_cards jsonb;
begin
  v_snapshot_id := compute_admin_security_trust_command_center_snapshot(
    null,
    null,
    'command-center-worker',
    'command-center-snapshot',
    '{"test": true}'::jsonb
  );

  v_cards := seed_admin_security_trust_command_center_cards(
    v_snapshot_id,
    'command-center-cards',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_trust_command_center_snapshots
    where id = v_snapshot_id
      and status = 'active'
  ) then
    raise exception 'command center snapshot missing';
  end if;

  if not exists (
    select 1
    from admin_security_trust_command_center_cards
    where snapshot_id = v_snapshot_id
      and status = 'active'
  ) then
    raise exception 'command center cards missing';
  end if;

  if coalesce((v_cards->>'cardsSeeded')::integer, 0) < 1 then
    raise exception 'command center seed returned unexpected cardsSeeded: %', v_cards;
  end if;
end $$;
