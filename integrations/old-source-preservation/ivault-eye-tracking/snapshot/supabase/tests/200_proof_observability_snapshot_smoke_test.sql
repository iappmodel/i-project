do $$
declare
  v_snapshot_id uuid;
begin
  v_snapshot_id := build_admin_security_proof_observability_snapshot(
    'global_admin',
    null,
    null,
    null,
    null,
    null,
    'observability-snapshot-smoke',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_proof_observability_snapshots
    where id = v_snapshot_id
      and status = 'ready'
      and snapshot_hash_sha256 is not null
      and health_score >= 0
      and health_score <= 100
  ) then
    raise exception 'proof observability snapshot was not created';
  end if;
end $$;
