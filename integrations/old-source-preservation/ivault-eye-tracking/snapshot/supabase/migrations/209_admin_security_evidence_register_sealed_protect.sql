-- Migration 209: Prevent mutation of sealed evidence objects on register (Slice 2d)
-- Replace upsert behavior to avoid mutating sealed rows. On conflict with a sealed
-- existing row, return existing id and record a non-mutating custody event.

CREATE OR REPLACE FUNCTION register_admin_security_evidence_object(
  p_admin_auth_user_id uuid,
  p_evidence_category text,
  p_evidence_type text,
  p_title text,
  p_description text default null,
  p_source_module text default 'manual',
  p_source_table text default null,
  p_source_id uuid default null,
  p_source_key text default null,
  p_customer_name text default null,
  p_customer_domain text default null,
  p_content_hash_sha256 text default null,
  p_content_hash_sha512 text default null,
  p_storage_location_id uuid default null,
  p_storage_uri text default null,
  p_object_path text default null,
  p_object_version text default null,
  p_media_type text default null,
  p_file_name text default null,
  p_file_extension text default null,
  p_byte_size bigint default null,
  p_access_classification text default 'restricted',
  p_confidentiality_level text default 'internal',
  p_evidence_payload jsonb default '{}'::jsonb,
  p_evidence_metadata jsonb default '{}'::jsonb,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_storage admin_security_evidence_storage_locations%rowtype;
  v_policy admin_security_evidence_retention_policies%rowtype;
  v_admin admin_users%rowtype;
  v_manifest_hash text;
  v_object_id uuid;
  v_object_key text;
  v_seed text;
  v_conflict_sealed boolean;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;
  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'evidence title is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  if p_storage_location_id is null then
    select *
    into v_storage
    from admin_security_evidence_storage_locations
    where status = 'active'
    order by
      case when storage_location_key = 'evidence_storage:default_internal_vault' then 0 else 1 end,
      created_at asc
    limit 1;
  else
    select *
    into v_storage
    from admin_security_evidence_storage_locations
    where id = p_storage_location_id;
  end if;

  if v_storage.id is null then
    raise exception 'evidence storage location not found';
  end if;

  select *
  into v_policy
  from admin_security_evidence_retention_policies
  where status = 'active'
    and evidence_category = p_evidence_category
    and (
      (customer_name is null and customer_domain is null)
      or (customer_name = p_customer_name and customer_domain is not distinct from p_customer_domain)
    )
  order by
    case when customer_name = p_customer_name then 0 else 1 end,
    created_at desc
  limit 1;

  if v_policy.id is null then
    select *
    into v_policy
    from admin_security_evidence_retention_policies
    where status = 'active'
      and evidence_category = p_evidence_category
    order by created_at desc
    limit 1;
  end if;

  v_seed :=
    coalesce(p_source_table, '') || '|' ||
    coalesce(p_source_id::text, '') || '|' ||
    coalesce(p_source_key, '') || '|' ||
    coalesce(p_content_hash_sha256, '') || '|' ||
    coalesce(p_title, '');

  v_object_key :=
    'evidence_object:' || p_evidence_category || ':' || p_source_module || ':' ||
    encode(digest(v_seed, 'sha256'), 'hex');

  v_manifest_hash := encode(digest('', 'sha256'), 'hex');

  -- Attempt insert; on conflict do nothing so we can decide sealed vs merge explicitly
  insert into admin_security_evidence_vault_objects (
    evidence_object_key,
    status,
    evidence_category,
    evidence_type,
    customer_name,
    customer_domain,
    title,
    description,
    source_module,
    source_table,
    source_id,
    source_key,
    storage_location_id,
    storage_uri,
    object_path,
    object_version,
    media_type,
    file_name,
    file_extension,
    byte_size,
    content_hash_sha256,
    content_hash_sha512,
    manifest_hash_sha256,
    encryption_mode,
    kms_key_reference,
    retention_policy_id,
    retain_until,
    deletion_eligible_at,
    access_classification,
    confidentiality_level,
    evidence_payload,
    evidence_metadata,
    registered_by_auth_user_id,
    registered_by_admin_user_id,
    custody_state,
    request_id,
    metadata
  )
  values (
    v_object_key,
    'active',
    p_evidence_category,
    p_evidence_type,
    p_customer_name,
    p_customer_domain,
    p_title,
    p_description,
    p_source_module,
    p_source_table,
    p_source_id,
    p_source_key,
    v_storage.id,
    p_storage_uri,
    p_object_path,
    p_object_version,
    p_media_type,
    p_file_name,
    p_file_extension,
    p_byte_size,
    p_content_hash_sha256,
    p_content_hash_sha512,
    v_manifest_hash,
    v_storage.encryption_mode,
    v_storage.kms_key_reference,
    v_policy.id,
    case when v_policy.id is not null then now() + make_interval(days => v_policy.retention_days) else now() + interval '365 days' end,
    case
      when v_policy.id is not null and v_policy.delete_after_retention is true then now() + make_interval(days => v_policy.retention_days)
      else null
    end,
    p_access_classification,
    p_confidentiality_level,
    coalesce(p_evidence_payload, '{}'::jsonb),
    coalesce(p_evidence_metadata, '{}'::jsonb),
    p_admin_auth_user_id,
    v_admin.id,
    'registered',
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (evidence_object_key) do nothing
  returning id into v_object_id;

  if v_object_id is null then
    -- conflict: inspect existing row
    select id, sealed into v_object_id, v_conflict_sealed
    from admin_security_evidence_vault_objects
    where evidence_object_key = v_object_key
    limit 1;

    if v_object_id is null then
      raise exception 'evidence object conflict but existing row not found';
    end if;

    if v_conflict_sealed is true then
      -- Sealed: do not mutate. Record a non-mutating custody event and return existing id.
      perform record_admin_security_evidence_custody_event(
        v_object_id,
        'registered',
        'register_attempt_on_sealed',
        null,
        null,
        'admin',
        p_admin_auth_user_id,
        v_admin.id,
        v_admin.email,
        'Attempted register on sealed evidence object',
        'Register attempted but object is sealed and immutable; no changes applied.',
        null,
        null,
        jsonb_build_object(
          'evidenceObjectKey', v_object_key,
          'action', 'no-op-sealed',
          'objectMutated', false
        ),
        p_request_id,
        p_metadata
      );
      return v_object_id;
    else
      -- Not sealed: preserve previous merge behavior (update metadata as before)
      update admin_security_evidence_vault_objects
      set
        updated_at = now(),
        evidence_metadata = admin_security_evidence_vault_objects.evidence_metadata || coalesce(p_evidence_metadata, '{}'::jsonb),
        metadata = admin_security_evidence_vault_objects.metadata || coalesce(p_metadata, '{}'::jsonb)
      where id = v_object_id;
    end if;
  end if;

  perform record_admin_security_evidence_custody_event(
    v_object_id,
    'registered',
    'register_evidence_object',
    null,
    'registered',
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Evidence object registered',
    'Evidence object registered in vault.',
    null,
    null,
    jsonb_build_object(
      'evidenceObjectKey', v_object_key,
      'evidenceCategory', p_evidence_category,
      'sourceModule', p_source_module
    ),
    p_request_id,
    p_metadata
  );

  return v_object_id;
end;
$$;

