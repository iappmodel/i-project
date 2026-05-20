-- Fixes for Evidence Vault RPC behaviors (Slice 2a)
-- Replace silent error swallow in sync_admin_security_evidence_from_trust_systems
-- with explicit per-row error accounting and warnings. Add errors + errorCount to return.

CREATE OR REPLACE FUNCTION sync_admin_security_evidence_from_trust_systems(
  p_batch_size integer default 500
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_synced integer := 0;
  v_failed integer := 0;
  v_row record;
  v_obj_id uuid;
  v_sync_admin_auth_user_id uuid;
  v_errors jsonb := '[]'::jsonb;
  v_err_msg text;
  v_err_state text;
BEGIN
  IF p_batch_size < 1 THEN
    RAISE EXCEPTION 'batch size must be >= 1';
  END IF;

  IF p_batch_size > 500 THEN
    RAISE EXCEPTION 'batch size must be <= 500';
  END IF;

  SELECT auth_user_id
  INTO v_sync_admin_auth_user_id
  FROM admin_users
  WHERE status = 'active'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_sync_admin_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'no active admin user available for evidence sync';
  END IF;

  FOR v_row IN
    (
      select
        'incidents'::text as source_module,
        'admin_security_trust_incidents'::text as source_table,
        i.id as source_id,
        i.customer_name,
        i.customer_domain,
        i.title,
        i.summary,
        'incident'::text as evidence_category
      from admin_security_trust_incidents i
      where i.created_at >= now() - interval '30 days'
        and i.severity in ('high', 'critical')
      union all
      select
        'ai_analyst'::text,
        'admin_security_trust_ai_findings'::text,
        f.id,
        f.customer_name,
        f.customer_domain,
        f.title,
        f.summary,
        'ai_finding'::text
      from admin_security_trust_ai_findings f
      where f.created_at >= now() - interval '30 days'
        and f.severity in ('high', 'critical')
      union all
      select
        'alerts'::text,
        'admin_security_trust_alert_events'::text,
        a.id,
        a.customer_name,
        a.customer_domain,
        a.title,
        a.summary,
        'alert'::text
      from admin_security_trust_alert_events a
      where a.created_at >= now() - interval '30 days'
        and a.alert_priority in ('high', 'critical')
      order by source_id desc
      limit p_batch_size
    )
  loop
    begin
      v_obj_id := register_admin_security_evidence_object(
        v_sync_admin_auth_user_id,
        v_row.evidence_category,
        'trust_system_record',
        coalesce(v_row.title, 'Trust system evidence'),
        v_row.summary,
        v_row.source_module,
        v_row.source_table,
        v_row.source_id,
        null,
        v_row.customer_name,
        v_row.customer_domain,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        'restricted',
        'internal',
        '{}'::jsonb,
        jsonb_build_object('syncSource', 'trust_systems'),
        'scheduled_sync',
        jsonb_build_object('source', 'sync_admin_security_evidence_from_trust_systems')
      );
      IF v_obj_id IS NOT NULL THEN
        v_synced := v_synced + 1;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        v_err_msg := SQLERRM;
        v_err_state := SQLSTATE;
        v_errors := v_errors || jsonb_build_array(
          jsonb_build_object(
            'source_module', v_row.source_module,
            'source_table', v_row.source_table,
            'source_id', v_row.source_id::text,
            'error_message', v_err_msg,
            'sqlstate', v_err_state
          )
        );
        v_failed := v_failed + 1;
        RAISE WARNING 'evidence sync row error: module=% source_table=% source_id=% error=% state=%',
          v_row.source_module, v_row.source_table, v_row.source_id, v_err_msg, v_err_state;
        -- continue to next row
    END;
  end loop;

  return jsonb_build_object(
    'evidenceObjectsSynced', v_synced,
    'errors', v_errors,
    'errorCount', v_failed
  );
END;
$$;

