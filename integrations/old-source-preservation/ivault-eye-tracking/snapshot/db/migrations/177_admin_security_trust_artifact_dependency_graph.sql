-- Step 9.62 — Build trust artifact dependency graph.
-- Runs after 176_admin_security_evidence_lifecycle_retention.sql.

create table if not exists admin_security_trust_artifact_dependencies (
  id uuid primary key default gen_random_uuid(),
  dependency_key text not null unique,
  status text not null default 'active',
  relationship_type text not null,
  dependency_strength text not null default 'strong',
  parent_source_type text not null,
  parent_source_id uuid not null,
  child_source_type text not null,
  child_source_id uuid not null,
  parent_artifact_key text,
  child_artifact_key text,
  parent_title text,
  child_title text,
  customer_name text,
  customer_domain text,
  impact_on_parent_change text not null default 'review_required',
  impact_on_parent_revocation text not null default 'child_review_required',
  impact_on_parent_deletion text not null default 'block_child_or_delete_child',
  propagation_status text not null default 'not_propagated',
  last_propagated_at timestamptz,
  discovered_by text not null default 'system',
  discovered_at timestamptz not null default now(),
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (
    parent_source_type,
    parent_source_id,
    child_source_type,
    child_source_id,
    relationship_type
  ),
  constraint admin_security_trust_artifact_dependencies_status_check
  check (
    status in (
      'active',
      'inactive',
      'superseded',
      'deleted',
      'error'
    )
  ),
  constraint admin_security_trust_artifact_dependencies_relationship_check
  check (
    relationship_type in (
      'derived_from',
      'published_as',
      'included_in',
      'references',
      'verified_by',
      'revoked_by',
      'supersedes',
      'retained_as',
      'downloaded_as',
      'question_about',
      'acknowledged_by',
      'other'
    )
  ),
  constraint admin_security_trust_artifact_dependencies_strength_check
  check (
    dependency_strength in (
      'weak',
      'medium',
      'strong',
      'critical'
    )
  ),
  constraint admin_security_trust_artifact_dependencies_impact_change_check
  check (
    impact_on_parent_change in (
      'none',
      'review_required',
      'child_update_required',
      'child_invalid',
      'child_revoke_required'
    )
  ),
  constraint admin_security_trust_artifact_dependencies_impact_revocation_check
  check (
    impact_on_parent_revocation in (
      'none',
      'child_review_required',
      'child_invalid',
      'child_revoke_required',
      'child_public_notice_required'
    )
  ),
  constraint admin_security_trust_artifact_dependencies_impact_deletion_check
  check (
    impact_on_parent_deletion in (
      'none',
      'review_required',
      'block_delete',
      'block_child_or_delete_child',
      'cascade_delete_allowed'
    )
  ),
  constraint admin_security_trust_artifact_dependencies_propagation_status_check
  check (
    propagation_status in (
      'not_propagated',
      'pending',
      'propagated',
      'blocked',
      'failed',
      'not_required'
    )
  ),
  constraint admin_security_trust_artifact_dependencies_not_self_check
  check (
    not (
      parent_source_type = child_source_type
      and parent_source_id = child_source_id
    )
  )
);

create index if not exists admin_security_trust_artifact_dependencies_parent_idx
on admin_security_trust_artifact_dependencies (
  parent_source_type,
  parent_source_id,
  status
);

create index if not exists admin_security_trust_artifact_dependencies_child_idx
on admin_security_trust_artifact_dependencies (
  child_source_type,
  child_source_id,
  status
);

create index if not exists admin_security_trust_artifact_dependencies_customer_idx
on admin_security_trust_artifact_dependencies (
  customer_name,
  customer_domain
);

create index if not exists admin_security_trust_artifact_dependencies_propagation_idx
on admin_security_trust_artifact_dependencies (
  propagation_status,
  created_at
);

drop trigger if exists admin_security_trust_artifact_dependencies_set_updated_at
on admin_security_trust_artifact_dependencies;

create trigger admin_security_trust_artifact_dependencies_set_updated_at
before update on admin_security_trust_artifact_dependencies
for each row
execute function set_updated_at();

create table if not exists admin_security_trust_artifact_impact_analyses (
  id uuid primary key default gen_random_uuid(),
  analysis_key text not null unique,
  status text not null default 'completed',
  analysis_type text not null,
  source_type text not null,
  source_id uuid not null,
  artifact_key text,
  requested_action text not null,
  direct_dependency_count integer not null default 0,
  recursive_dependency_count integer not null default 0,
  blocking_dependency_count integer not null default 0,
  review_required_count integer not null default 0,
  public_notice_required_count integer not null default 0,
  impact_summary text not null,
  impact_payload jsonb not null default '{}'::jsonb,
  requested_by_auth_user_id uuid,
  requested_by_admin_user_id uuid references admin_users(id),
  worker_id text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_security_trust_artifact_impact_analyses_status_check
  check (
    status in (
      'completed',
      'failed',
      'pending'
    )
  ),
  constraint admin_security_trust_artifact_impact_analyses_type_check
  check (
    analysis_type in (
      'publish',
      'revoke',
      'delete',
      'supersede',
      'expire',
      'retention_delete',
      'manual',
      'other'
    )
  ),
  constraint admin_security_trust_artifact_impact_analyses_summary_check
  check (length(trim(impact_summary)) > 0)
);

create index if not exists admin_security_trust_artifact_impact_analyses_source_idx
on admin_security_trust_artifact_impact_analyses (
  source_type,
  source_id,
  created_at desc
);

create index if not exists admin_security_trust_artifact_impact_analyses_type_idx
on admin_security_trust_artifact_impact_analyses (
  analysis_type,
  created_at desc
);

create table if not exists admin_security_trust_artifact_propagation_events (
  id uuid primary key default gen_random_uuid(),
  propagation_key text not null unique,
  status text not null default 'pending',
  propagation_type text not null,
  dependency_id uuid
    references admin_security_trust_artifact_dependencies(id)
    on delete cascade,
  parent_source_type text not null,
  parent_source_id uuid not null,
  child_source_type text not null,
  child_source_id uuid not null,
  triggering_event_type text not null,
  action_taken text,
  action_result text,
  error_message text,
  worker_id text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_trust_artifact_propagation_events_status_check
  check (
    status in (
      'pending',
      'processing',
      'completed',
      'blocked',
      'failed',
      'cancelled'
    )
  ),
  constraint admin_security_trust_artifact_propagation_events_type_check
  check (
    propagation_type in (
      'revocation',
      'deletion',
      'supersession',
      'expiry',
      'publication',
      'retention',
      'manual',
      'other'
    )
  ),
  constraint admin_security_trust_artifact_propagation_events_trigger_check
  check (
    triggering_event_type in (
      'parent_revoked',
      'parent_deleted',
      'parent_expired',
      'parent_superseded',
      'parent_published',
      'parent_retention_deleted',
      'manual',
      'other'
    )
  )
);

create index if not exists admin_security_trust_artifact_propagation_events_status_idx
on admin_security_trust_artifact_propagation_events (
  status,
  created_at
);

create index if not exists admin_security_trust_artifact_propagation_events_parent_idx
on admin_security_trust_artifact_propagation_events (
  parent_source_type,
  parent_source_id
);

create index if not exists admin_security_trust_artifact_propagation_events_child_idx
on admin_security_trust_artifact_propagation_events (
  child_source_type,
  child_source_id
);

drop trigger if exists admin_security_trust_artifact_propagation_events_set_updated_at
on admin_security_trust_artifact_propagation_events;

create trigger admin_security_trust_artifact_propagation_events_set_updated_at
before update on admin_security_trust_artifact_propagation_events
for each row
execute function set_updated_at();

create or replace function upsert_admin_security_trust_artifact_dependency(
  p_relationship_type text,
  p_dependency_strength text,
  p_parent_source_type text,
  p_parent_source_id uuid,
  p_child_source_type text,
  p_child_source_id uuid,
  p_parent_artifact_key text default null,
  p_child_artifact_key text default null,
  p_parent_title text default null,
  p_child_title text default null,
  p_customer_name text default null,
  p_customer_domain text default null,
  p_impact_on_parent_change text default 'review_required',
  p_impact_on_parent_revocation text default 'child_review_required',
  p_impact_on_parent_deletion text default 'block_child_or_delete_child',
  p_discovered_by text default 'system',
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_dependency_id uuid;
  v_dependency_key text;
begin
  if p_parent_source_id is null or p_child_source_id is null then
    raise exception 'dependency parent and child source ids are required';
  end if;

  if p_parent_source_type = p_child_source_type and p_parent_source_id = p_child_source_id then
    raise exception 'dependency cannot reference itself';
  end if;

  v_dependency_key :=
    'trust_dependency:' ||
    p_relationship_type || ':' ||
    p_parent_source_type || ':' ||
    p_parent_source_id::text || ':' ||
    p_child_source_type || ':' ||
    p_child_source_id::text;

  insert into admin_security_trust_artifact_dependencies (
    dependency_key,
    status,
    relationship_type,
    dependency_strength,
    parent_source_type,
    parent_source_id,
    child_source_type,
    child_source_id,
    parent_artifact_key,
    child_artifact_key,
    parent_title,
    child_title,
    customer_name,
    customer_domain,
    impact_on_parent_change,
    impact_on_parent_revocation,
    impact_on_parent_deletion,
    discovered_by,
    request_id,
    metadata
  )
  values (
    v_dependency_key,
    'active',
    p_relationship_type,
    coalesce(p_dependency_strength, 'strong'),
    p_parent_source_type,
    p_parent_source_id,
    p_child_source_type,
    p_child_source_id,
    p_parent_artifact_key,
    p_child_artifact_key,
    p_parent_title,
    p_child_title,
    p_customer_name,
    p_customer_domain,
    coalesce(p_impact_on_parent_change, 'review_required'),
    coalesce(p_impact_on_parent_revocation, 'child_review_required'),
    coalesce(p_impact_on_parent_deletion, 'block_child_or_delete_child'),
    coalesce(p_discovered_by, 'system'),
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (
    parent_source_type,
    parent_source_id,
    child_source_type,
    child_source_id,
    relationship_type
  )
  do update set
    status = 'active',
    dependency_strength = excluded.dependency_strength,
    parent_artifact_key = coalesce(excluded.parent_artifact_key, admin_security_trust_artifact_dependencies.parent_artifact_key),
    child_artifact_key = coalesce(excluded.child_artifact_key, admin_security_trust_artifact_dependencies.child_artifact_key),
    parent_title = coalesce(excluded.parent_title, admin_security_trust_artifact_dependencies.parent_title),
    child_title = coalesce(excluded.child_title, admin_security_trust_artifact_dependencies.child_title),
    customer_name = coalesce(excluded.customer_name, admin_security_trust_artifact_dependencies.customer_name),
    customer_domain = coalesce(excluded.customer_domain, admin_security_trust_artifact_dependencies.customer_domain),
    impact_on_parent_change = excluded.impact_on_parent_change,
    impact_on_parent_revocation = excluded.impact_on_parent_revocation,
    impact_on_parent_deletion = excluded.impact_on_parent_deletion,
    discovered_by = excluded.discovered_by,
    metadata = admin_security_trust_artifact_dependencies.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_dependency_id;

  return v_dependency_id;
end;
$$;

create or replace function discover_admin_security_trust_artifact_dependencies(
  p_batch_size integer default 1000,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_row record;
begin
  if p_batch_size <= 0 or p_batch_size > 5000 then
    raise exception 'batch size must be between 1 and 5000';
  end if;

  for v_row in
    select
      'derived_from'::text as relationship_type,
      'strong'::text as dependency_strength,
      'admin_security_questionnaire_project'::text as parent_source_type,
      p.id as parent_source_id,
      'admin_security_questionnaire_export'::text as child_source_type,
      e.id as child_source_id,
      p.project_key as parent_artifact_key,
      e.export_key as child_artifact_key,
      p.questionnaire_title as parent_title,
      p.questionnaire_title || ' Export' as child_title,
      p.customer_name,
      p.customer_domain
    from admin_security_questionnaire_exports e
    join admin_security_questionnaire_projects p
      on p.id = e.questionnaire_project_id
    where not exists (
      select 1
      from admin_security_trust_artifact_dependencies d
      where d.parent_source_type = 'admin_security_questionnaire_project'
        and d.parent_source_id = p.id
        and d.child_source_type = 'admin_security_questionnaire_export'
        and d.child_source_id = e.id
        and d.relationship_type = 'derived_from'
    )
    limit p_batch_size
  loop
    perform upsert_admin_security_trust_artifact_dependency(
      v_row.relationship_type,
      v_row.dependency_strength,
      v_row.parent_source_type,
      v_row.parent_source_id,
      v_row.child_source_type,
      v_row.child_source_id,
      v_row.parent_artifact_key,
      v_row.child_artifact_key,
      v_row.parent_title,
      v_row.child_title,
      v_row.customer_name,
      v_row.customer_domain,
      'child_update_required',
      'child_revoke_required',
      'block_delete',
      'dependency-discovery',
      null,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'dependency_discovery_run_id',
        v_run_id,
        'worker_id',
        p_worker_id
      )
    );
  end loop;

  for v_row in
    select
      'published_as'::text as relationship_type,
      'critical'::text as dependency_strength,
      p.source_type as parent_source_type,
      p.source_id as parent_source_id,
      'admin_security_disclosure_package'::text as child_source_type,
      p.id as child_source_id,
      p.artifact_key as parent_artifact_key,
      p.package_key as child_artifact_key,
      p.title as parent_title,
      p.title as child_title,
      p.customer_name,
      p.customer_domain
    from admin_security_disclosure_packages p
    where not exists (
      select 1
      from admin_security_trust_artifact_dependencies d
      where d.parent_source_type = p.source_type
        and d.parent_source_id = p.source_id
        and d.child_source_type = 'admin_security_disclosure_package'
        and d.child_source_id = p.id
        and d.relationship_type = 'published_as'
    )
    limit p_batch_size
  loop
    perform upsert_admin_security_trust_artifact_dependency(
      v_row.relationship_type,
      v_row.dependency_strength,
      v_row.parent_source_type,
      v_row.parent_source_id,
      v_row.child_source_type,
      v_row.child_source_id,
      v_row.parent_artifact_key,
      v_row.child_artifact_key,
      v_row.parent_title,
      v_row.child_title,
      v_row.customer_name,
      v_row.customer_domain,
      'review_required',
      'child_revoke_required',
      'block_delete',
      'dependency-discovery',
      null,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'dependency_discovery_run_id',
        v_run_id,
        'worker_id',
        p_worker_id
      )
    );
  end loop;

  for v_row in
    select
      'included_in'::text as relationship_type,
      'strong'::text as dependency_strength,
      'admin_security_disclosure_package'::text as parent_source_type,
      p.id as parent_source_id,
      'admin_security_external_trust_timeline_event'::text as child_source_type,
      e.id as child_source_id,
      p.package_key as parent_artifact_key,
      e.event_key as child_artifact_key,
      p.title as parent_title,
      e.title as child_title,
      e.customer_name,
      e.customer_domain
    from admin_security_external_trust_timeline_events e
    join admin_security_disclosure_packages p
      on p.id = e.disclosure_package_id
    where not exists (
      select 1
      from admin_security_trust_artifact_dependencies d
      where d.parent_source_type = 'admin_security_disclosure_package'
        and d.parent_source_id = p.id
        and d.child_source_type = 'admin_security_external_trust_timeline_event'
        and d.child_source_id = e.id
        and d.relationship_type = 'included_in'
    )
    limit p_batch_size
  loop
    perform upsert_admin_security_trust_artifact_dependency(
      v_row.relationship_type,
      v_row.dependency_strength,
      v_row.parent_source_type,
      v_row.parent_source_id,
      v_row.child_source_type,
      v_row.child_source_id,
      v_row.parent_artifact_key,
      v_row.child_artifact_key,
      v_row.parent_title,
      v_row.child_title,
      v_row.customer_name,
      v_row.customer_domain,
      'review_required',
      'child_revoke_required',
      'block_delete',
      'dependency-discovery',
      null,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'dependency_discovery_run_id',
        v_run_id,
        'worker_id',
        p_worker_id
      )
    );
  end loop;

  for v_row in
    select
      'revoked_by'::text as relationship_type,
      'critical'::text as dependency_strength,
      r.source_type as parent_source_type,
      r.source_id as parent_source_id,
      'admin_security_revocation_record'::text as child_source_type,
      r.id as child_source_id,
      null::text as parent_artifact_key,
      r.revocation_key as child_artifact_key,
      r.source_type as parent_title,
      'Revocation ' || r.revocation_key as child_title,
      r.affected_customer_name as customer_name,
      null::text as customer_domain
    from admin_security_revocation_records r
    where not exists (
      select 1
      from admin_security_trust_artifact_dependencies d
      where d.parent_source_type = r.source_type
        and d.parent_source_id = r.source_id
        and d.child_source_type = 'admin_security_revocation_record'
        and d.child_source_id = r.id
        and d.relationship_type = 'revoked_by'
    )
    limit p_batch_size
  loop
    perform upsert_admin_security_trust_artifact_dependency(
      v_row.relationship_type,
      v_row.dependency_strength,
      v_row.parent_source_type,
      v_row.parent_source_id,
      v_row.child_source_type,
      v_row.child_source_id,
      v_row.parent_artifact_key,
      v_row.child_artifact_key,
      v_row.parent_title,
      v_row.child_title,
      v_row.customer_name,
      v_row.customer_domain,
      'none',
      'none',
      'block_delete',
      'dependency-discovery',
      null,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'dependency_discovery_run_id',
        v_run_id,
        'worker_id',
        p_worker_id
      )
    );
  end loop;

  for v_row in
    select
      'published_as'::text as relationship_type,
      'strong'::text as dependency_strength,
      'admin_security_auditor_evidence_packet'::text as parent_source_type,
      p.id as parent_source_id,
      'admin_security_auditor_packet_manifest'::text as child_source_type,
      m.id as child_source_id,
      p.packet_key as parent_artifact_key,
      m.manifest_key as child_artifact_key,
      p.title as parent_title,
      m.title as child_title,
      m.customer_name,
      m.customer_domain
    from admin_security_auditor_packet_manifests m
    join admin_security_auditor_evidence_packets p
      on p.id = m.evidence_packet_id
    where not exists (
      select 1
      from admin_security_trust_artifact_dependencies d
      where d.parent_source_type = 'admin_security_auditor_evidence_packet'
        and d.parent_source_id = p.id
        and d.child_source_type = 'admin_security_auditor_packet_manifest'
        and d.child_source_id = m.id
        and d.relationship_type = 'published_as'
    )
    limit p_batch_size
  loop
    perform upsert_admin_security_trust_artifact_dependency(
      v_row.relationship_type,
      v_row.dependency_strength,
      v_row.parent_source_type,
      v_row.parent_source_id,
      v_row.child_source_type,
      v_row.child_source_id,
      v_row.parent_artifact_key,
      v_row.child_artifact_key,
      v_row.parent_title,
      v_row.child_title,
      v_row.customer_name,
      v_row.customer_domain,
      'review_required',
      'child_revoke_required',
      'block_delete',
      'dependency-discovery',
      null,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'dependency_discovery_run_id',
        v_run_id,
        'worker_id',
        p_worker_id
      )
    );
  end loop;

  for v_row in
    select
      'retained_as'::text as relationship_type,
      'critical'::text as dependency_strength,
      s.source_type as parent_source_type,
      s.source_id as parent_source_id,
      'admin_security_retention_subject'::text as child_source_type,
      s.id as child_source_id,
      s.artifact_key as parent_artifact_key,
      s.retention_subject_key as child_artifact_key,
      s.subject_title as parent_title,
      s.subject_title as child_title,
      s.customer_name,
      s.customer_domain
    from admin_security_retention_subjects s
    where not exists (
      select 1
      from admin_security_trust_artifact_dependencies d
      where d.parent_source_type = s.source_type
        and d.parent_source_id = s.source_id
        and d.child_source_type = 'admin_security_retention_subject'
        and d.child_source_id = s.id
        and d.relationship_type = 'retained_as'
    )
    limit p_batch_size
  loop
    perform upsert_admin_security_trust_artifact_dependency(
      v_row.relationship_type,
      v_row.dependency_strength,
      v_row.parent_source_type,
      v_row.parent_source_id,
      v_row.child_source_type,
      v_row.child_source_id,
      v_row.parent_artifact_key,
      v_row.child_artifact_key,
      v_row.parent_title,
      v_row.child_title,
      v_row.customer_name,
      v_row.customer_domain,
      'review_required',
      'child_review_required',
      'block_delete',
      'dependency-discovery',
      null,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'dependency_discovery_run_id',
        v_run_id,
        'worker_id',
        p_worker_id
      )
    );
  end loop;

  return v_run_id;
end;
$$;

create or replace function analyze_admin_security_trust_artifact_impact(
  p_admin_auth_user_id uuid,
  p_source_type text,
  p_source_id uuid,
  p_analysis_type text,
  p_requested_action text,
  p_max_depth integer default 5,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_analysis_id uuid;
  v_analysis_key text;
  v_direct_count integer;
  v_recursive_count integer;
  v_blocking_count integer;
  v_review_count integer;
  v_public_notice_count integer;
  v_payload jsonb;
  v_summary text;
begin
  if p_admin_auth_user_id is not null
    and admin_has_permission(p_admin_auth_user_id, 'admin.read') is not true
  then
    raise exception 'missing required permission: admin.read';
  end if;

  if p_source_id is null then
    raise exception 'impact analysis source id is required';
  end if;

  if p_max_depth <= 0 or p_max_depth > 20 then
    raise exception 'impact analysis max depth must be between 1 and 20';
  end if;

  if p_admin_auth_user_id is not null then
    v_admin := get_active_admin_user(p_admin_auth_user_id);
  end if;

  select count(*)
  into v_direct_count
  from admin_security_trust_artifact_dependencies
  where parent_source_type = p_source_type
    and parent_source_id = p_source_id
    and status = 'active';

  with recursive dep_tree as (
    select
      d.id,
      d.parent_source_type,
      d.parent_source_id,
      d.child_source_type,
      d.child_source_id,
      d.relationship_type,
      d.dependency_strength,
      d.impact_on_parent_change,
      d.impact_on_parent_revocation,
      d.impact_on_parent_deletion,
      d.child_artifact_key,
      d.child_title,
      d.customer_name,
      1 as depth,
      array[d.id] as path
    from admin_security_trust_artifact_dependencies d
    where d.parent_source_type = p_source_type
      and d.parent_source_id = p_source_id
      and d.status = 'active'
    union all
    select
      d.id,
      d.parent_source_type,
      d.parent_source_id,
      d.child_source_type,
      d.child_source_id,
      d.relationship_type,
      d.dependency_strength,
      d.impact_on_parent_change,
      d.impact_on_parent_revocation,
      d.impact_on_parent_deletion,
      d.child_artifact_key,
      d.child_title,
      d.customer_name,
      dt.depth + 1,
      dt.path || d.id
    from admin_security_trust_artifact_dependencies d
    join dep_tree dt
      on d.parent_source_type = dt.child_source_type
     and d.parent_source_id = dt.child_source_id
    where d.status = 'active'
      and dt.depth < p_max_depth
      and not d.id = any(dt.path)
  )
  select
    count(*),
    count(*) filter (
      where case
        when p_analysis_type in ('delete', 'retention_delete')
          then impact_on_parent_deletion in ('block_delete', 'block_child_or_delete_child')
        when p_analysis_type in ('revoke', 'expire')
          then impact_on_parent_revocation in ('child_revoke_required', 'child_public_notice_required')
        else false
      end
    ),
    count(*) filter (
      where case
        when p_analysis_type in ('delete', 'retention_delete')
          then impact_on_parent_deletion = 'review_required'
        when p_analysis_type in ('revoke', 'expire')
          then impact_on_parent_revocation = 'child_review_required'
        else impact_on_parent_change = 'review_required'
      end
    ),
    count(*) filter (where impact_on_parent_revocation = 'child_public_notice_required'),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'dependencyId', id,
          'depth', depth,
          'relationshipType', relationship_type,
          'dependencyStrength', dependency_strength,
          'parentSourceType', parent_source_type,
          'parentSourceId', parent_source_id,
          'childSourceType', child_source_type,
          'childSourceId', child_source_id,
          'childArtifactKey', child_artifact_key,
          'childTitle', child_title,
          'customerName', customer_name,
          'impactOnParentChange', impact_on_parent_change,
          'impactOnParentRevocation', impact_on_parent_revocation,
          'impactOnParentDeletion', impact_on_parent_deletion
        )
        order by depth asc
      ),
      '[]'::jsonb
    )
  into
    v_recursive_count,
    v_blocking_count,
    v_review_count,
    v_public_notice_count,
    v_payload
  from dep_tree;

  v_summary :=
    'Impact analysis found ' ||
    coalesce(v_direct_count, 0)::text ||
    ' direct dependencies and ' ||
    coalesce(v_recursive_count, 0)::text ||
    ' recursive dependencies. Blocking dependencies: ' ||
    coalesce(v_blocking_count, 0)::text ||
    '. Review required: ' ||
    coalesce(v_review_count, 0)::text ||
    '.';

  v_analysis_key :=
    'impact_analysis:' ||
    p_analysis_type || ':' ||
    p_source_type || ':' ||
    p_source_id::text || ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  insert into admin_security_trust_artifact_impact_analyses (
    analysis_key,
    status,
    analysis_type,
    source_type,
    source_id,
    requested_action,
    direct_dependency_count,
    recursive_dependency_count,
    blocking_dependency_count,
    review_required_count,
    public_notice_required_count,
    impact_summary,
    impact_payload,
    requested_by_auth_user_id,
    requested_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    v_analysis_key,
    'completed',
    p_analysis_type,
    p_source_type,
    p_source_id,
    p_requested_action,
    coalesce(v_direct_count, 0),
    coalesce(v_recursive_count, 0),
    coalesce(v_blocking_count, 0),
    coalesce(v_review_count, 0),
    coalesce(v_public_notice_count, 0),
    v_summary,
    jsonb_build_object('dependencies', coalesce(v_payload, '[]'::jsonb), 'maxDepth', p_max_depth),
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_analysis_id;

  return v_analysis_id;
end;
$$;

create or replace function require_no_blocking_trust_artifact_dependencies(
  p_source_type text,
  p_source_id uuid,
  p_action_type text
)
returns void
language plpgsql
stable
as $$
declare
  v_blocking_count integer;
begin
  if p_action_type in ('delete', 'retention_delete') then
    select count(*)
    into v_blocking_count
    from admin_security_trust_artifact_dependencies
    where parent_source_type = p_source_type
      and parent_source_id = p_source_id
      and status = 'active'
      and impact_on_parent_deletion in ('block_delete', 'block_child_or_delete_child');
  elsif p_action_type in ('revoke', 'expire') then
    select count(*)
    into v_blocking_count
    from admin_security_trust_artifact_dependencies
    where parent_source_type = p_source_type
      and parent_source_id = p_source_id
      and status = 'active'
      and dependency_strength in ('strong', 'critical')
      and impact_on_parent_revocation in ('child_revoke_required', 'child_public_notice_required');
  else
    v_blocking_count := 0;
  end if;

  if coalesce(v_blocking_count, 0) > 0 then
    raise exception 'blocking trust artifact dependencies exist: %', v_blocking_count;
  end if;
end;
$$;

create or replace function queue_admin_security_trust_artifact_propagation(
  p_parent_source_type text,
  p_parent_source_id uuid,
  p_propagation_type text,
  p_triggering_event_type text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_dependency admin_security_trust_artifact_dependencies%rowtype;
  v_count integer := 0;
  v_key text;
begin
  for v_dependency in
    select *
    from admin_security_trust_artifact_dependencies
    where parent_source_type = p_parent_source_type
      and parent_source_id = p_parent_source_id
      and status = 'active'
  loop
    v_key :=
      'propagation:' ||
      p_propagation_type || ':' ||
      v_dependency.id::text || ':' ||
      substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

    insert into admin_security_trust_artifact_propagation_events (
      propagation_key,
      status,
      propagation_type,
      dependency_id,
      parent_source_type,
      parent_source_id,
      child_source_type,
      child_source_id,
      triggering_event_type,
      request_id,
      metadata
    )
    values (
      v_key,
      'pending',
      p_propagation_type,
      v_dependency.id,
      v_dependency.parent_source_type,
      v_dependency.parent_source_id,
      v_dependency.child_source_type,
      v_dependency.child_source_id,
      p_triggering_event_type,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    update admin_security_trust_artifact_dependencies
    set
      propagation_status = 'pending',
      updated_at = now()
    where id = v_dependency.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function process_admin_security_trust_artifact_propagation_events(
  p_batch_size integer default 100,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_event admin_security_trust_artifact_propagation_events%rowtype;
  v_dependency admin_security_trust_artifact_dependencies%rowtype;
  v_action_taken text;
  v_action_result text;
begin
  if p_batch_size <= 0 or p_batch_size > 1000 then
    raise exception 'batch size must be between 1 and 1000';
  end if;

  for v_event in
    select *
    from admin_security_trust_artifact_propagation_events
    where status = 'pending'
    order by created_at asc
    limit p_batch_size
    for update skip locked
  loop
    update admin_security_trust_artifact_propagation_events
    set
      status = 'processing',
      worker_id = p_worker_id,
      updated_at = now()
    where id = v_event.id;

    select *
    into v_dependency
    from admin_security_trust_artifact_dependencies
    where id = v_event.dependency_id;

    begin
      v_action_taken := 'review_marked';
      v_action_result := 'dependency marked for review';

      if v_event.propagation_type = 'revocation' then
        if v_event.child_source_type = 'admin_security_disclosure_package'
          and v_dependency.impact_on_parent_revocation in ('child_revoke_required', 'child_public_notice_required')
        then
          update admin_security_disclosure_packages
          set
            status = case when status = 'active' then 'revoked' else status end,
            metadata = metadata || jsonb_build_object(
              'revoked_by_dependency_propagation',
              true,
              'parent_source_type',
              v_event.parent_source_type,
              'parent_source_id',
              v_event.parent_source_id,
              'propagation_event_id',
              v_event.id
            )
          where id = v_event.child_source_id;

          v_action_taken := 'child_disclosure_package_revoked';
          v_action_result := 'child disclosure package marked revoked';
        elsif v_event.child_source_type = 'admin_security_external_trust_timeline_event'
          and v_dependency.impact_on_parent_revocation in ('child_revoke_required', 'child_public_notice_required')
        then
          update admin_security_external_trust_timeline_events
          set
            status = case when status = 'published' then 'revoked' else status end,
            verification_status = 'revoked',
            internal_metadata = internal_metadata || jsonb_build_object(
              'revoked_by_dependency_propagation',
              true,
              'parent_source_type',
              v_event.parent_source_type,
              'parent_source_id',
              v_event.parent_source_id,
              'propagation_event_id',
              v_event.id
            ),
            updated_at = now()
          where id = v_event.child_source_id;

          v_action_taken := 'child_timeline_event_revoked';
          v_action_result := 'child timeline event marked revoked';
        elsif v_event.child_source_type = 'admin_security_auditor_packet_manifest'
          and v_dependency.impact_on_parent_revocation in ('child_revoke_required', 'child_public_notice_required')
        then
          update admin_security_auditor_packet_manifests
          set
            status = case when status in ('pending', 'generating', 'ready', 'failed') then 'revoked' else status end,
            metadata = metadata || jsonb_build_object(
              'revoked_by_dependency_propagation',
              true,
              'parent_source_type',
              v_event.parent_source_type,
              'parent_source_id',
              v_event.parent_source_id,
              'propagation_event_id',
              v_event.id
            ),
            updated_at = now()
          where id = v_event.child_source_id;

          v_action_taken := 'child_auditor_manifest_revoked';
          v_action_result := 'child auditor packet manifest marked revoked';
        else
          update admin_security_trust_artifact_dependencies
          set
            propagation_status = 'blocked',
            updated_at = now()
          where id = v_dependency.id;

          v_action_taken := 'blocked_review_required';
          v_action_result := 'manual review required';
        end if;
      end if;

      update admin_security_trust_artifact_dependencies
      set
        propagation_status = case when v_action_taken like 'blocked%' then 'blocked' else 'propagated' end,
        last_propagated_at = now(),
        updated_at = now()
      where id = v_dependency.id;

      update admin_security_trust_artifact_propagation_events
      set
        status = case when v_action_taken like 'blocked%' then 'blocked' else 'completed' end,
        action_taken = v_action_taken,
        action_result = v_action_result,
        worker_id = p_worker_id,
        metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('propagation_run_id', v_run_id),
        updated_at = now()
      where id = v_event.id;
    exception
      when others then
        update admin_security_trust_artifact_propagation_events
        set
          status = 'failed',
          error_message = sqlerrm,
          worker_id = p_worker_id,
          metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('propagation_run_id', v_run_id),
          updated_at = now()
        where id = v_event.id;

        update admin_security_trust_artifact_dependencies
        set
          propagation_status = 'failed',
          updated_at = now()
        where id = v_dependency.id;
    end;
  end loop;

  return v_run_id;
end;
$$;

insert into scheduled_jobs (
  job_key,
  job_name,
  job_group,
  enabled,
  schedule_cron,
  function_name,
  function_args,
  max_runtime_seconds,
  lock_ttl_seconds,
  metadata
)
values
  (
    'admin_security_trust_dependency_discovery_hourly',
    'Discover trust artifact dependencies',
    'admin',
    true,
    '17 * * * *',
    'discover_admin_security_trust_artifact_dependencies',
    '{"batch_size": 1000}'::jsonb,
    300,
    600,
    '{"priority": "medium"}'::jsonb
  ),
  (
    'admin_security_trust_dependency_propagation_every_5m',
    'Process trust artifact dependency propagation',
    'admin',
    true,
    '*/5 * * * *',
    'process_admin_security_trust_artifact_propagation_events',
    '{"batch_size": 100}'::jsonb,
    300,
    600,
    '{"priority": "high"}'::jsonb
  )
on conflict (job_key)
do update set
  enabled = excluded.enabled,
  schedule_cron = excluded.schedule_cron,
  function_name = excluded.function_name,
  function_args = excluded.function_args,
  max_runtime_seconds = excluded.max_runtime_seconds,
  lock_ttl_seconds = excluded.lock_ttl_seconds,
  metadata = scheduled_jobs.metadata || excluded.metadata,
  updated_at = now();

create or replace function run_scheduled_job(
  p_job_key text,
  p_locked_by text default 'scheduler',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_job scheduled_jobs%rowtype;
  v_run_id uuid;
  v_lock_acquired boolean;
  v_started_at timestamptz;
  v_uuid_result uuid;
  v_result jsonb := '{}'::jsonb;
begin
  if p_job_key is null or length(trim(p_job_key)) = 0 then
    raise exception 'job key is required';
  end if;

  select * into v_job from scheduled_jobs where job_key = p_job_key;
  if v_job.id is null then
    raise exception 'scheduled job not found: %', p_job_key;
  end if;

  if v_job.enabled is false then
    insert into scheduled_job_runs (scheduled_job_id, job_key, job_group, status, metadata)
    values (v_job.id, v_job.job_key, v_job.job_group, 'disabled', p_metadata)
    returning id into v_run_id;
    update scheduled_jobs
    set last_status = 'disabled', last_run_id = v_run_id, updated_at = now()
    where id = v_job.id;
    return v_run_id;
  end if;

  v_lock_acquired := acquire_scheduled_job_lock(
    v_job.job_key,
    p_locked_by,
    v_job.lock_ttl_seconds,
    p_metadata
  );

  if v_lock_acquired is false then
    insert into scheduled_job_runs (scheduled_job_id, job_key, job_group, status, metadata)
    values (v_job.id, v_job.job_key, v_job.job_group, 'skipped_locked', p_metadata)
    returning id into v_run_id;
    update scheduled_jobs
    set last_status = 'skipped_locked', last_run_id = v_run_id, updated_at = now()
    where id = v_job.id;
    return v_run_id;
  end if;

  v_started_at := now();
  insert into scheduled_job_runs (
    scheduled_job_id,
    job_key,
    job_group,
    status,
    started_at,
    metadata
  )
  values (v_job.id, v_job.job_key, v_job.job_group, 'started', v_started_at, p_metadata)
  returning id into v_run_id;

  update scheduled_jobs
  set
    last_started_at = v_started_at,
    last_status = 'started',
    last_run_id = v_run_id,
    updated_at = now()
  where id = v_job.id;

  if v_job.function_name = 'run_reward_issuance_job' then
    v_uuid_result := run_reward_issuance_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'release_mature_reward_lots' then
    v_uuid_result := release_mature_reward_lots(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_accounting_mirror_job' then
    v_uuid_result := run_accounting_mirror_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_withdrawal_reserve_job' then
    v_uuid_result := run_withdrawal_reserve_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 100),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_audit_hash_backfill_job' then
    v_uuid_result := run_audit_hash_backfill_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'verify_audit_hash_chain' then
    v_uuid_result := verify_audit_hash_chain(
      coalesce(v_job.function_args->>'chain_key', 'global_audit_chain'),
      coalesce((v_job.function_args->>'batch_size')::integer, 100000),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_observability_snapshot_job' then
    v_uuid_result := run_observability_snapshot_job(
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'discover_admin_security_retention_subjects' then
    v_uuid_result := discover_admin_security_retention_subjects(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_admin_security_retention_lifecycle_job' then
    v_uuid_result := run_admin_security_retention_lifecycle_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'discover_admin_security_trust_artifact_dependencies' then
    v_uuid_result := discover_admin_security_trust_artifact_dependencies(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'process_admin_security_trust_artifact_propagation_events' then
    v_uuid_result := process_admin_security_trust_artifact_propagation_events(
      coalesce((v_job.function_args->>'batch_size')::integer, 100),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  else
    raise exception 'scheduled function not allowlisted: %', v_job.function_name;
  end if;

  update scheduled_job_runs
  set
    status = 'completed',
    completed_at = now(),
    runtime_ms = (extract(epoch from (now() - v_started_at)) * 1000)::integer,
    result = v_result
  where id = v_run_id;

  update scheduled_jobs
  set
    last_completed_at = now(),
    last_status = 'completed',
    last_run_id = v_run_id,
    updated_at = now()
  where id = v_job.id;

  perform release_scheduled_job_lock(v_job.job_key);
  return v_run_id;
exception
  when others then
    if v_run_id is not null then
      update scheduled_job_runs
      set
        status = 'failed',
        failed_at = now(),
        runtime_ms = case
          when v_started_at is not null
          then (extract(epoch from (now() - v_started_at)) * 1000)::integer
          else null
        end,
        error_message = sqlerrm
      where id = v_run_id;
    end if;

    update scheduled_jobs
    set
      last_failed_at = now(),
      last_status = 'failed',
      last_run_id = v_run_id,
      updated_at = now()
    where job_key = p_job_key;

    perform release_scheduled_job_lock(p_job_key);
    raise;
end;
$$;

create or replace function execute_admin_security_retention_deletion(
  p_admin_auth_user_id uuid,
  p_retention_subject_id uuid,
  p_reason text,
  p_second_admin_approval_request_id uuid default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_subject admin_security_retention_subjects%rowtype;
  v_policy admin_security_retention_policies%rowtype;
  v_previous_status text;
  v_decision_id uuid;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'retention deletion reason is required';
  end if;

  select *
  into v_subject
  from admin_security_retention_subjects
  where id = p_retention_subject_id
  for update;

  if v_subject.id is null then
    raise exception 'retention subject not found: %', p_retention_subject_id;
  end if;

  if v_subject.legal_hold_active is true then
    raise exception 'cannot delete retention subject under legal hold';
  end if;

  if v_subject.status <> 'deletion_eligible' then
    raise exception 'retention subject is not deletion eligible: %', v_subject.status;
  end if;

  perform analyze_admin_security_trust_artifact_impact(
    p_admin_auth_user_id,
    v_subject.source_type,
    v_subject.source_id,
    'retention_delete',
    'execute_retention_deletion',
    5,
    p_request_id,
    p_metadata || jsonb_build_object('retention_subject_id', v_subject.id)
  );

  perform require_no_blocking_trust_artifact_dependencies(
    v_subject.source_type,
    v_subject.source_id,
    'retention_delete'
  );

  select *
  into v_policy
  from admin_security_retention_policies
  where id = v_subject.policy_id;

  if coalesce(v_policy.require_mfa_for_delete, true) is true then
    perform require_admin_mfa(
      p_admin_auth_user_id,
      'privileged_action',
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'action_key',
        'execute_admin_security_retention_deletion',
        'retention_subject_id',
        v_subject.id
      )
    );
  end if;

  if coalesce(v_policy.require_second_admin_for_delete, true) is true then
    perform require_admin_security_disclosure_approval(
      'admin_security_retention_subject',
      v_subject.id,
      'other'
    );
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);
  v_previous_status := v_subject.status;

  if v_subject.source_type = 'admin_security_questionnaire_export' then
    update admin_security_questionnaire_exports
    set
      storage_uri = null,
      metadata = metadata || jsonb_build_object(
        'retention_deleted_at',
        now(),
        'retention_subject_id',
        v_subject.id
      ),
      updated_at = now()
    where id = v_subject.source_id;
  elsif v_subject.source_type = 'admin_security_compliance_report' then
    update admin_security_compliance_report_requests
    set
      storage_uri = null,
      metadata = metadata || jsonb_build_object(
        'retention_deleted_at',
        now(),
        'retention_subject_id',
        v_subject.id
      ),
      updated_at = now()
    where id = v_subject.source_id;
  elsif v_subject.source_type = 'admin_security_auditor_packet_manifest' then
    update admin_security_auditor_packet_manifests
    set
      storage_uri = null,
      manifest_json = '{}'::jsonb,
      metadata = metadata || jsonb_build_object(
        'retention_deleted_at',
        now(),
        'retention_subject_id',
        v_subject.id
      ),
      updated_at = now()
    where id = v_subject.source_id;
  elsif v_subject.source_type = 'admin_security_auditor_packet_download_request' then
    update admin_security_auditor_packet_download_requests
    set
      storage_uri = null,
      metadata = metadata || jsonb_build_object(
        'retention_deleted_at',
        now(),
        'retention_subject_id',
        v_subject.id
      ),
      updated_at = now()
    where id = v_subject.source_id;
  end if;

  update admin_security_retention_subjects
  set
    status = 'deleted',
    deleted_at = now(),
    deletion_blocked_reason = null,
    updated_at = now()
  where id = v_subject.id;

  v_decision_id := record_admin_security_retention_decision(
    v_subject.id,
    v_subject.source_type,
    v_subject.source_id,
    'deleted',
    v_previous_status,
    'deleted',
    v_subject.policy_id,
    null,
    'manual',
    p_reason,
    case
      when v_subject.public_deletion_proof is true then 'Retention period ended and deletion was completed.'
      else null
    end,
    jsonb_build_object(
      'retention_subject_key',
      v_subject.retention_subject_key,
      'source_type',
      v_subject.source_type,
      'source_id',
      v_subject.source_id,
      'artifact_key',
      v_subject.artifact_key,
      'checksum_sha256',
      v_subject.checksum_sha256,
      'deleted_at',
      now()
    ),
    p_admin_auth_user_id,
    null,
    p_request_id,
    p_metadata
  );

  perform record_admin_action(
    p_admin_auth_user_id,
    'execute_admin_security_retention_deletion',
    'admin.write',
    'admin_security_retention_subject',
    v_subject.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('retention_decision_id', v_decision_id)
  );

  return v_decision_id;
end;
$$;

create or replace function create_admin_security_revocation_record(
  p_admin_auth_user_id uuid,
  p_source_type text,
  p_source_id uuid,
  p_revocation_type text,
  p_severity text,
  p_reason_code text,
  p_reason text,
  p_public_reason text default null,
  p_internal_note text default null,
  p_disclose_publicly boolean default true,
  p_notify_customers boolean default true,
  p_notify_auditors boolean default false,
  p_affected_customer_name text default null,
  p_affected_room_id uuid default null,
  p_previous_status text default null,
  p_new_status text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_revocation_id uuid;
  v_revocation_key text;
  v_participant_count integer := 0;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'privileged_action',
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'action_key',
      'create_admin_security_revocation_record',
      'source_type',
      p_source_type,
      'source_id',
      p_source_id
    )
  );

  if p_source_id is null then
    raise exception 'revocation source id is required';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'revocation reason is required';
  end if;

  perform analyze_admin_security_trust_artifact_impact(
    p_admin_auth_user_id,
    p_source_type,
    p_source_id,
    case when coalesce(p_revocation_type, 'revocation') = 'forced_expiry' then 'expire' else 'revoke' end,
    'revoke_artifact',
    5,
    p_request_id,
    p_metadata
  );

  perform require_no_blocking_trust_artifact_dependencies(
    p_source_type,
    p_source_id,
    case when coalesce(p_revocation_type, 'revocation') = 'forced_expiry' then 'expire' else 'revoke' end
  );

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  if p_affected_room_id is not null then
    select count(*)
    into v_participant_count
    from admin_security_enterprise_review_room_participants
    where review_room_id = p_affected_room_id
      and status in ('active', 'invited');
  end if;

  v_revocation_key :=
    'revocation:' ||
    p_source_type || ':' ||
    p_source_id::text || ':' ||
    extract(epoch from now())::bigint::text || ':' ||
    substr(encode(gen_random_bytes(4), 'hex'), 1, 8);

  insert into admin_security_revocation_records (
    revocation_key,
    status,
    source_type,
    source_id,
    revocation_type,
    severity,
    reason_code,
    reason,
    public_reason,
    internal_note,
    effective_at,
    disclose_publicly,
    notify_customers,
    notify_auditors,
    affected_customer_name,
    affected_room_id,
    affected_participant_count,
    previous_status,
    new_status,
    revoked_by_auth_user_id,
    revoked_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    v_revocation_key,
    'active',
    p_source_type,
    p_source_id,
    coalesce(p_revocation_type, 'revocation'),
    coalesce(p_severity, 'high'),
    p_reason_code,
    p_reason,
    p_public_reason,
    p_internal_note,
    now(),
    coalesce(p_disclose_publicly, true),
    coalesce(p_notify_customers, true),
    coalesce(p_notify_auditors, false),
    p_affected_customer_name,
    p_affected_room_id,
    v_participant_count,
    p_previous_status,
    p_new_status,
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_revocation_id;

  perform queue_admin_security_trust_artifact_propagation(
    p_source_type,
    p_source_id,
    'revocation',
    'parent_revoked',
    p_request_id,
    p_metadata
  );

  perform record_admin_action(
    p_admin_auth_user_id,
    'create_admin_security_revocation_record',
    'admin.write',
    'admin_security_revocation_record',
    v_revocation_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'source_type',
      p_source_type,
      'source_id',
      p_source_id,
      'reason_code',
      p_reason_code
    )
  );

  perform create_admin_security_alert(
    'admin_security_artifact_revoked',
    coalesce(p_severity, 'high'),
    p_admin_auth_user_id,
    null,
    'create_admin_security_revocation_record',
    null,
    'Security artifact was revoked.',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'revocation_record_id',
      v_revocation_id,
      'source_type',
      p_source_type,
      'source_id',
      p_source_id,
      'reason_code',
      p_reason_code
    )
  );

  return v_revocation_id;
end;
$$;

create or replace view admin_security_trust_artifact_dependency_dashboard as
select
  d.id as admin_security_trust_artifact_dependency_id,
  d.dependency_key,
  d.status,
  d.relationship_type,
  d.dependency_strength,
  d.parent_source_type,
  d.parent_source_id,
  d.parent_artifact_key,
  d.parent_title,
  d.child_source_type,
  d.child_source_id,
  d.child_artifact_key,
  d.child_title,
  d.customer_name,
  d.customer_domain,
  d.impact_on_parent_change,
  d.impact_on_parent_revocation,
  d.impact_on_parent_deletion,
  d.propagation_status,
  d.last_propagated_at,
  d.discovered_by,
  d.discovered_at,
  d.created_at,
  d.updated_at,
  d.metadata
from admin_security_trust_artifact_dependencies d
order by d.created_at desc;

create or replace view admin_security_trust_artifact_impact_analysis_dashboard as
select
  a.id as admin_security_trust_artifact_impact_analysis_id,
  a.analysis_key,
  a.status,
  a.analysis_type,
  a.source_type,
  a.source_id,
  a.artifact_key,
  a.requested_action,
  a.direct_dependency_count,
  a.recursive_dependency_count,
  a.blocking_dependency_count,
  a.review_required_count,
  a.public_notice_required_count,
  a.impact_summary,
  requester.email as requested_by_email,
  a.worker_id,
  a.created_at,
  a.metadata
from admin_security_trust_artifact_impact_analyses a
left join admin_users requester
  on requester.id = a.requested_by_admin_user_id
order by a.created_at desc;

create or replace view admin_security_trust_artifact_propagation_dashboard as
select
  e.id as admin_security_trust_artifact_propagation_event_id,
  e.propagation_key,
  e.status,
  e.propagation_type,
  e.dependency_id,
  d.dependency_key,
  d.relationship_type,
  d.dependency_strength,
  e.parent_source_type,
  e.parent_source_id,
  d.parent_artifact_key,
  e.child_source_type,
  e.child_source_id,
  d.child_artifact_key,
  e.triggering_event_type,
  e.action_taken,
  e.action_result,
  e.error_message,
  e.worker_id,
  e.created_at,
  e.updated_at,
  e.metadata
from admin_security_trust_artifact_propagation_events e
left join admin_security_trust_artifact_dependencies d
  on d.id = e.dependency_id
order by e.created_at desc;

create or replace view admin_security_trust_artifact_dependency_integrity as
select
  (
    select count(*)
    from admin_security_trust_artifact_dependencies
    where status = 'active'
  ) as active_dependency_count,
  (
    select count(*)
    from admin_security_trust_artifact_dependencies
    where status = 'active'
      and propagation_status = 'blocked'
  ) as blocked_dependency_count,
  (
    select count(*)
    from admin_security_trust_artifact_propagation_events
    where status = 'pending'
  ) as pending_propagation_event_count,
  (
    select count(*)
    from admin_security_trust_artifact_propagation_events
    where status = 'failed'
  ) as failed_propagation_event_count,
  (
    select count(*)
    from admin_security_trust_artifact_impact_analyses
    where created_at >= now() - interval '24 hours'
  ) as impact_analysis_count_24h,
  (
    select count(*)
    from admin_security_trust_artifact_impact_analyses
    where blocking_dependency_count > 0
      and created_at >= now() - interval '24 hours'
  ) as blocking_impact_analysis_count_24h,
  now() as checked_at;

grant select on admin_security_trust_artifact_dependency_dashboard to admin_api_role;
grant select on admin_security_trust_artifact_impact_analysis_dashboard to admin_api_role;
grant select on admin_security_trust_artifact_propagation_dashboard to admin_api_role;
grant select on admin_security_trust_artifact_dependency_integrity to admin_api_role;

alter table admin_security_trust_artifact_dependencies enable row level security;
alter table admin_security_trust_artifact_impact_analyses enable row level security;
alter table admin_security_trust_artifact_propagation_events enable row level security;

drop policy if exists admin_security_trust_artifact_dependencies_no_user_direct_access
on admin_security_trust_artifact_dependencies;
create policy admin_security_trust_artifact_dependencies_no_user_direct_access
on admin_security_trust_artifact_dependencies
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_trust_artifact_impact_analyses_no_user_direct_access
on admin_security_trust_artifact_impact_analyses;
create policy admin_security_trust_artifact_impact_analyses_no_user_direct_access
on admin_security_trust_artifact_impact_analyses
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_trust_artifact_propagation_events_no_user_direct_access
on admin_security_trust_artifact_propagation_events;
create policy admin_security_trust_artifact_propagation_events_no_user_direct_access
on admin_security_trust_artifact_propagation_events
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_all_admin_security_trust_artifact_dependencies
on admin_security_trust_artifact_dependencies;
create policy admin_api_all_admin_security_trust_artifact_dependencies
on admin_security_trust_artifact_dependencies
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_trust_artifact_impact_analyses
on admin_security_trust_artifact_impact_analyses;
create policy admin_api_all_admin_security_trust_artifact_impact_analyses
on admin_security_trust_artifact_impact_analyses
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_trust_artifact_propagation_events
on admin_security_trust_artifact_propagation_events;
create policy admin_api_all_admin_security_trust_artifact_propagation_events
on admin_security_trust_artifact_propagation_events
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists worker_all_admin_security_trust_artifact_dependencies
on admin_security_trust_artifact_dependencies;
create policy worker_all_admin_security_trust_artifact_dependencies
on admin_security_trust_artifact_dependencies
for all
to worker_role
using (true)
with check (true);

drop policy if exists worker_all_admin_security_trust_artifact_propagation_events
on admin_security_trust_artifact_propagation_events;
create policy worker_all_admin_security_trust_artifact_propagation_events
on admin_security_trust_artifact_propagation_events
for all
to worker_role
using (true)
with check (true);

drop policy if exists worker_insert_admin_security_trust_artifact_impact_analyses
on admin_security_trust_artifact_impact_analyses;
create policy worker_insert_admin_security_trust_artifact_impact_analyses
on admin_security_trust_artifact_impact_analyses
for insert
to worker_role
with check (true);

grant execute on function upsert_admin_security_trust_artifact_dependency(
  text, text, text, uuid, text, uuid, text, text, text, text, text, text, text, text, text, text, text, jsonb
) to admin_api_role, worker_role;

grant execute on function discover_admin_security_trust_artifact_dependencies(integer, text, jsonb)
to admin_api_role, worker_role;

grant execute on function analyze_admin_security_trust_artifact_impact(
  uuid, text, uuid, text, text, integer, text, jsonb
) to admin_api_role, worker_role;

grant execute on function require_no_blocking_trust_artifact_dependencies(text, uuid, text)
to admin_api_role, worker_role;

grant execute on function queue_admin_security_trust_artifact_propagation(
  text, uuid, text, text, text, jsonb
) to admin_api_role, worker_role;

grant execute on function process_admin_security_trust_artifact_propagation_events(integer, text, jsonb)
to worker_role, admin_api_role;

alter function upsert_admin_security_trust_artifact_dependency(
  text, text, text, uuid, text, uuid, text, text, text, text, text, text, text, text, text, text, text, jsonb
) security definer;
alter function upsert_admin_security_trust_artifact_dependency(
  text, text, text, uuid, text, uuid, text, text, text, text, text, text, text, text, text, text, text, jsonb
) set search_path = public;

alter function discover_admin_security_trust_artifact_dependencies(integer, text, jsonb) security definer;
alter function discover_admin_security_trust_artifact_dependencies(integer, text, jsonb) set search_path = public;

alter function analyze_admin_security_trust_artifact_impact(
  uuid, text, uuid, text, text, integer, text, jsonb
) security definer;
alter function analyze_admin_security_trust_artifact_impact(
  uuid, text, uuid, text, text, integer, text, jsonb
) set search_path = public;

alter function require_no_blocking_trust_artifact_dependencies(text, uuid, text) security definer;
alter function require_no_blocking_trust_artifact_dependencies(text, uuid, text) set search_path = public;

alter function queue_admin_security_trust_artifact_propagation(
  text, uuid, text, text, text, jsonb
) security definer;
alter function queue_admin_security_trust_artifact_propagation(
  text, uuid, text, text, text, jsonb
) set search_path = public;

alter function process_admin_security_trust_artifact_propagation_events(integer, text, jsonb) security definer;
alter function process_admin_security_trust_artifact_propagation_events(integer, text, jsonb) set search_path = public;

insert into error_catalog (
  error_code,
  category,
  severity,
  http_status,
  retryable,
  user_visible,
  user_message,
  internal_message,
  owner_team
)
values
  (
    'TRUST_DEPENDENCY_BLOCKING',
    'validation',
    'high',
    409,
    false,
    true,
    'Blocking trust artifact dependencies exist.',
    'Blocking trust artifact dependencies exist.',
    'platform'
  ),
  (
    'TRUST_DEPENDENCY_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Trust dependency request requires complete fields.',
    'Trust dependency required fields missing.',
    'platform'
  ),
  (
    'TRUST_DEPENDENCY_INVALID_STATE',
    'validation',
    'medium',
    409,
    false,
    true,
    'Trust dependency action is not allowed from the current state.',
    'Trust dependency invalid state.',
    'platform'
  )
on conflict (error_code)
do update set
  category = excluded.category,
  severity = excluded.severity,
  http_status = excluded.http_status,
  retryable = excluded.retryable,
  user_visible = excluded.user_visible,
  internal_message = excluded.internal_message,
  owner_team = excluded.owner_team,
  updated_at = now();

insert into error_mapping_rules (
  match_pattern,
  error_code,
  priority,
  metadata
)
values
  ('blocking trust artifact dependencies exist', 'TRUST_DEPENDENCY_BLOCKING', 5, '{}'),
  ('dependency parent and child source ids are required', 'TRUST_DEPENDENCY_REQUIRED_FIELDS', 5, '{}'),
  ('dependency cannot reference itself', 'TRUST_DEPENDENCY_REQUIRED_FIELDS', 5, '{}'),
  ('impact analysis source id is required', 'TRUST_DEPENDENCY_REQUIRED_FIELDS', 5, '{}'),
  ('impact analysis max depth must be between 1 and 20', 'TRUST_DEPENDENCY_REQUIRED_FIELDS', 5, '{}'),
  ('batch size must be between 1 and 1000', 'TRUST_DEPENDENCY_REQUIRED_FIELDS', 5, '{}'),
  ('batch size must be between 1 and 5000', 'TRUST_DEPENDENCY_REQUIRED_FIELDS', 5, '{}')
on conflict do nothing;
