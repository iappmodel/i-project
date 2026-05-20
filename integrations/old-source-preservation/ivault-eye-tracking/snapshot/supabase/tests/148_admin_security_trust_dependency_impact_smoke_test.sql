do $$
declare
  v_parent_id uuid := gen_random_uuid();
  v_child_id uuid := gen_random_uuid();
  v_dep_id uuid;
  v_analysis_id uuid;
begin
  v_dep_id := upsert_admin_security_trust_artifact_dependency(
    'published_as',
    'critical',
    'other',
    v_parent_id,
    'admin_security_disclosure_package',
    v_child_id,
    'parent-artifact',
    'child-package',
    'Parent Artifact',
    'Child Package',
    'Dependency Corp',
    'dependency.example.com',
    'review_required',
    'child_revoke_required',
    'block_delete',
    'smoke-test',
    'dependency-upsert',
    '{"test": true}'::jsonb
  );

  v_analysis_id := analyze_admin_security_trust_artifact_impact(
    null,
    'other',
    v_parent_id,
    'delete',
    'delete_parent',
    5,
    'dependency-analysis',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_trust_artifact_impact_analyses
    where id = v_analysis_id
      and blocking_dependency_count > 0
      and recursive_dependency_count > 0
  ) then
    raise exception 'impact analysis did not detect blocking dependency';
  end if;

  begin
    perform require_no_blocking_trust_artifact_dependencies(
      'other',
      v_parent_id,
      'delete'
    );

    raise exception 'dependency check should have blocked deletion';
  exception
    when others then
      if sqlerrm not like '%blocking trust artifact dependencies exist%' then
        raise;
      end if;
  end;
end $$;
