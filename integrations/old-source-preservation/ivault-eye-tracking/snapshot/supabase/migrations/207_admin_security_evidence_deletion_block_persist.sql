-- Migration 207: Persist blocked deletion requests (Slice 2b)
-- Replace the post-insert RAISE in request_admin_security_evidence_deletion
-- so blocked deletion requests are persisted and still produce custody events.

CREATE OR REPLACE FUNCTION request_admin_security_evidence_deletion(
  p_admin_auth_user_id uuid,
  p_evidence_object_id uuid,
  p_request_type text default 'retention_expired',
  p_requested_reason text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_obj admin_security_evidence_vault_objects%rowtype;
  v_admin admin_users%rowtype;
  v_id uuid;
  v_key text;
  v_hold_blocked boolean := false;
  v_retention_blocked boolean := false;
  v_status text := 'pending_approval';
  v_blockedBy text := null;
BEGIN
  IF admin_has_permission(p_admin_auth_user_id, 'admin.write') IS NOT true THEN
    RAISE EXCEPTION 'missing required permission: admin.write';
  END IF;
  IF p_requested_reason IS NULL OR length(trim(p_requested_reason)) = 0 THEN
    RAISE EXCEPTION 'evidence deletion reason is required';
  END IF;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  SELECT * INTO v_obj
  FROM admin_security_evidence_vault_objects
  WHERE id = p_evidence_object_id
  FOR UPDATE;

  IF v_obj.id IS NULL THEN
    RAISE EXCEPTION 'evidence object not found';
  END IF;

  IF v_obj.legal_hold_active THEN
    v_hold_blocked := true;
    v_status := 'blocked';
    v_blockedBy := 'legal_hold';
  END IF;

  IF v_obj.retain_until IS NOT NULL AND v_obj.retain_until > now() THEN
    v_retention_blocked := true;
    v_status := 'blocked';
    v_blockedBy := COALESCE(v_blockedBy, 'retention');
  END IF;

  v_key := 'evidence_deletion_request:' || substr(encode(digest(p_evidence_object_id::text || '|' || now()::text, 'sha256'), 'hex'), 1, 24);

  INSERT INTO admin_security_evidence_deletion_requests (
    deletion_request_key,
    status,
    evidence_object_id,
    request_type,
    requested_reason,
    legal_hold_blocked,
    retention_blocked,
    requested_by_auth_user_id,
    requested_by_admin_user_id,
    request_id,
    metadata
  )
  VALUES (
    v_key,
    v_status,
    p_evidence_object_id,
    p_request_type,
    p_requested_reason,
    v_hold_blocked,
    v_retention_blocked,
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  IF v_status = 'blocked' THEN
    -- Blocked: persist request, do NOT update object; record custody event with no state change
    PERFORM record_admin_security_evidence_custody_event(
      p_evidence_object_id,
      'deletion_requested',
      'request_deletion',
      v_obj.custody_state,
      v_obj.custody_state,
      'admin',
      p_admin_auth_user_id,
      v_admin.id,
      v_admin.email,
      'Evidence deletion requested (blocked)',
      p_requested_reason,
      NULL,
      NULL,
      jsonb_build_object(
        'deletionRequestId', v_id,
        'status', v_status,
        'blockedBy', v_blockedBy
      ),
      p_request_id,
      p_metadata
    );

    RETURN v_id;
  END IF;

  -- Not blocked: update object first (preserve original ordering), then record custody event
  UPDATE admin_security_evidence_vault_objects
  SET
    status = 'deletion_requested',
    custody_state = 'deletion_requested',
    updated_at = now()
  WHERE id = p_evidence_object_id;

  PERFORM record_admin_security_evidence_custody_event(
    p_evidence_object_id,
    'deletion_requested',
    'request_deletion',
    v_obj.custody_state,
    'deletion_requested',
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Evidence deletion requested',
    p_requested_reason,
    NULL,
    NULL,
    jsonb_build_object(
      'deletionRequestId', v_id,
      'status', v_status
    ),
    p_request_id,
    p_metadata
  );

  RETURN v_id;
END;
$$;

