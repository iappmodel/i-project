-- Migration 208: Deterministic manifest_item_count recompute for export packages (Slice 2c)
-- Replace incremental manifest_item_count update with deterministic recompute.
-- Also add supporting index for export_package_objects(export_package_id, included).

CREATE OR REPLACE FUNCTION add_admin_security_evidence_object_to_export_package(
  p_admin_auth_user_id uuid,
  p_export_package_id uuid,
  p_evidence_object_id uuid,
  p_included boolean default true,
  p_redacted boolean default true,
  p_inclusion_reason text default null,
  p_exclusion_reason text default null,
  p_export_manifest_payload jsonb default '{}'::jsonb,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin admin_users%rowtype;
  v_pkg admin_security_evidence_export_packages%rowtype;
  v_obj admin_security_evidence_vault_objects%rowtype;
  v_id uuid;
  v_key text;
BEGIN
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select * into v_pkg from admin_security_evidence_export_packages where id = p_export_package_id for update;
  if v_pkg.id is null then
    raise exception 'evidence export package not found';
  end if;
  if v_pkg.status not in ('pending', 'processing') then
    raise exception 'evidence export package is not editable';
  end if;

  select * into v_obj from admin_security_evidence_vault_objects where id = p_evidence_object_id;
  if v_obj.id is null then
    raise exception 'evidence object not found';
  end if;

  v_key := 'export_package_object:' || substr(encode(digest(p_export_package_id::text || '|' || p_evidence_object_id::text, 'sha256'), 'hex'), 1, 24);

  insert into admin_security_evidence_export_package_objects (
    export_package_object_key,
    export_package_id,
    evidence_object_id,
    included,
    redacted,
    inclusion_reason,
    exclusion_reason,
    export_manifest_payload
  )
  values (
    v_key,
    p_export_package_id,
    p_evidence_object_id,
    coalesce(p_included, true),
    coalesce(p_redacted, true),
    p_inclusion_reason,
    p_exclusion_reason,
    coalesce(p_export_manifest_payload, '{}'::jsonb)
  )
  on conflict (export_package_id, evidence_object_id) do update
  set
    included = excluded.included,
    redacted = excluded.redacted,
    inclusion_reason = excluded.inclusion_reason,
    exclusion_reason = excluded.exclusion_reason,
    export_manifest_payload = excluded.export_manifest_payload
  returning id into v_id;

  -- DETERMINISTIC RECOMPUTE: recompute object_count and manifest_item_count
  update admin_security_evidence_export_packages
  set
    object_count = (
      select count(*)
      from admin_security_evidence_export_package_objects
      where export_package_id = p_export_package_id
        and included is true
    ),
    manifest_item_count = (
      select count(m.id)
      from admin_security_evidence_manifest_items m
      join admin_security_evidence_export_package_objects x
        on x.evidence_object_id = m.evidence_object_id
      where x.export_package_id = p_export_package_id
        and x.included is true
        and m.item_status <> 'deleted'
    ),
    updated_at = now()
  where id = p_export_package_id;

  perform record_admin_security_evidence_custody_event(
    p_evidence_object_id,
    'exported',
    'include_in_export_package',
    v_obj.custody_state,
    v_obj.custody_state,
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Evidence object added to export package',
    coalesce(p_inclusion_reason, 'Included in evidence export package.'),
    null,
    null,
    jsonb_build_object('exportPackageId', p_export_package_id, 'included', coalesce(p_included, true)),
    p_request_id,
    p_metadata
  );

  return v_id;
END;
$$;

-- Supporting index for faster package-scoped counts
CREATE INDEX IF NOT EXISTS admin_security_export_package_objects_pkg_included_idx
  ON admin_security_evidence_export_package_objects(export_package_id, included);

