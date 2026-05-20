do $$
declare
  v_result jsonb;
begin
  v_result := process_admin_security_proof_observability_cycle(
    'observability-worker',
    'observability-cycle-smoke',
    '{"test": true}'::jsonb
  );

  if v_result->>'snapshotId' is null then
    raise exception 'observability cycle did not return snapshot id';
  end if;

  if not exists (
    select 1
    from admin_security_proof_observability_snapshots
    where id = (v_result->>'snapshotId')::uuid
      and status = 'ready'
  ) then
    raise exception 'observability cycle snapshot missing';
  end if;
end $$;
