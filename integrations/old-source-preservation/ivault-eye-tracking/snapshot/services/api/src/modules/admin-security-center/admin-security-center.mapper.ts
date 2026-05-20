function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function mapSecuritySummary(row: any) {
  return {
    checkedAt: row.checked_at,
    securityStatus: row.security_status,
    alerts: {
      open: toNumber(row.open_alert_count),
      openCritical: toNumber(row.open_critical_alert_count),
      escalations24h: toNumber(row.alert_escalation_count_24h)
    },
    incidents: {
      openReviews: toNumber(row.open_incident_review_count),
      overdueReviews: toNumber(row.overdue_incident_review_count)
    },
    correctiveActions: {
      open: toNumber(row.open_corrective_action_count),
      overdue: toNumber(row.overdue_corrective_action_count)
    },
    sessions: {
      active: toNumber(row.active_session_count),
      reauthRequired: toNumber(row.reauth_required_session_count),
      revoked24h: toNumber(row.revoked_session_count_24h)
    },
    devices: {
      unknown: toNumber(row.unknown_device_count),
      suspicious: toNumber(row.suspicious_device_count),
      blockedOrRevoked: toNumber(row.blocked_or_revoked_device_count)
    },
    mfa: {
      superAdminsWithoutActiveMfa: toNumber(row.super_admin_without_active_mfa_count),
      activeRecoveryCodes: toNumber(row.active_recovery_code_count)
    },
    breakGlass: {
      openRequests: toNumber(row.open_break_glass_request_count),
      activeAccess: toNumber(row.active_break_glass_access_count)
    },
    audit: {
      missingHashes: toNumber(row.audit_hash_missing_count)
    }
  };
}
