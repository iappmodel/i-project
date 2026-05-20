import { toNullableString, toNumber, toStringValue } from "../../shared/map";
import type {
  AdminDeviceDto,
  AdminMoneyIntegrityDto,
  AdminNetworkRiskObservationDto,
  AdminSchedulerJobDto,
  AdminSessionRiskEventDto,
  AdminSystemCommandCenterDto,
  AdminTrustComponentDto,
  AdminTrustUserDto
} from "./admin.dto";

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function mapAdminSystemCommandCenterRow(
  row: any
): AdminSystemCommandCenterDto | null {
  if (!row) return null;

  return {
    latestSnapshotId: toStringValue(row.latest_snapshot_id),
    systemStatus: row.system_status,
    snapshotAt: toStringValue(row.snapshot_at),

    walletCount: toNumber(row.wallet_count),
    activeWalletCount: toNumber(row.active_wallet_count),

    totalAvailableBalanceMinor: toNumber(row.total_available_balance_minor),
    totalPendingBalanceMinor: toNumber(row.total_pending_balance_minor),
    totalLockedBalanceMinor: toNumber(row.total_locked_balance_minor),
    totalWalletBalanceMinor: toNumber(row.total_wallet_balance_minor),

    rewardPendingCount: toNumber(row.reward_pending_count),
    rewardCompletedCount24h: toNumber(row.reward_completed_count_24h),
    rewardFailedCount24h: toNumber(row.reward_failed_count_24h),

    attentionEventCount1h: toNumber(row.attention_event_count_1h),
    attentionPassedCount1h: toNumber(row.attention_passed_count_1h),
    attentionFraudSuspectedCount1h: toNumber(row.attention_fraud_suspected_count_1h),

    unbalancedJournalCount: toNumber(row.unbalanced_journal_count),
    missingRewardMirrorCount: toNumber(row.missing_reward_mirror_count),
    walletAccountingDeltaMinor: toNumber(row.wallet_accounting_delta_minor),

    auditMissingHashRecordCount: toNumber(row.audit_missing_hash_record_count),
    auditBrokenVerificationCount24h: toNumber(row.audit_broken_verification_count_24h),
    missingAdminActionHashCount: toNumber(row.missing_admin_action_hash_count),
    missingPrivilegedActionHashCount: toNumber(row.missing_privileged_action_hash_count),
    missingAdminSecurityAlertHashCount: toNumber(
      row.missing_admin_security_alert_hash_count
    ),
    openAdminSecurityAlertCount: toNumber(row.open_admin_security_alert_count),
    criticalAdminSecurityAlertCount: toNumber(row.critical_admin_security_alert_count),
    pendingPrivilegedActionCount: toNumber(row.pending_privileged_action_count),
    staleOpenCriticalAlertCount: toNumber(row.stale_open_critical_alert_count),
    staleOpenHighAlertCount: toNumber(row.stale_open_high_alert_count),
    staleAcknowledgedAlertCount: toNumber(row.stale_acknowledged_alert_count),
    privilegedActionsExpiringSoonCount: toNumber(
      row.privileged_actions_expiring_soon_count
    ),
    adminSecurityEscalationCount24h: toNumber(
      row.admin_security_escalation_count_24h
    ),

    failedScheduledJobCount24h: toNumber(row.failed_scheduled_job_count_24h),
    criticalErrorCount1h: toNumber(row.critical_error_count_1h),
    highErrorCount1h: toNumber(row.high_error_count_1h),
    activeAdminSessionCount: toNumber(row.active_admin_session_count),
    reauthRequiredAdminSessionCount: toNumber(
      row.reauth_required_admin_session_count
    ),
    revokedAdminSessionCount24h: toNumber(row.revoked_admin_session_count_24h),
    expiredAdminSessionCount24h: toNumber(row.expired_admin_session_count_24h),
    idleActiveAdminSessionCount: toNumber(row.idle_active_admin_session_count),
    openIncidentReviewCount: toNumber(row.open_incident_review_count),
    overdueIncidentReviewCount: toNumber(row.overdue_incident_review_count),
    openCriticalIncidentReviewCount: toNumber(row.open_critical_incident_review_count),
    closedIncidentReviewCount24h: toNumber(row.closed_incident_review_count_24h),
    openCorrectiveActionCount: toNumber(row.open_corrective_action_count),
    overdueCorrectiveActionCount: toNumber(row.overdue_corrective_action_count),
    openCriticalCorrectiveActionCount: toNumber(
      row.open_critical_corrective_action_count
    ),
    completedCorrectiveActionCount24h: toNumber(
      row.completed_corrective_action_count_24h
    ),
    openReviewsWithoutCorrectiveActionsCount: toNumber(
      row.open_reviews_without_corrective_actions_count
    ),

    metrics: asRecord(row.metrics),
    jobAlerts: asArray(row.job_alerts),
    errorSummary: asArray(row.error_summary),
    activeAlerts: asArray(row.active_alerts)
  };
}

export function mapAdminMoneyIntegrityRow(row: any): AdminMoneyIntegrityDto | null {
  if (!row) return null;

  return {
    unbalancedJournalCount: toNumber(row.unbalanced_journal_count),
    missingRewardMirrorCount: toNumber(row.missing_reward_mirror_count),

    accountingUserWalletLiabilityMinor: toNumber(row.accounting_user_wallet_liability_minor),
    walletTotalBalanceMinor: toNumber(row.wallet_total_balance_minor),
    walletVsAccountingDeltaMinor: toNumber(row.wallet_vs_accounting_delta_minor),

    walletIntegrityIssueCount: toNumber(row.wallet_integrity_issue_count),
    campaignBudgetIntegrityIssueCount: toNumber(row.campaign_budget_integrity_issue_count),
    rewardIntegrityIssueCount: toNumber(row.reward_integrity_issue_count),

    checkedAt: toStringValue(row.checked_at)
  };
}

export function mapAdminSchedulerJobRow(row: any): AdminSchedulerJobDto {
  return {
    scheduledJobId: toStringValue(row.scheduled_job_id),
    jobKey: toStringValue(row.job_key),
    jobName: toStringValue(row.job_name),
    jobGroup: toStringValue(row.job_group),
    enabled: Boolean(row.enabled),

    scheduleCron: toStringValue(row.schedule_cron),
    timezone: toStringValue(row.timezone),

    functionName: toStringValue(row.function_name),
    functionArgs: asRecord(row.function_args),

    maxRuntimeSeconds: toNumber(row.max_runtime_seconds),
    retryLimit: toNumber(row.retry_limit),
    lockTtlSeconds: toNumber(row.lock_ttl_seconds),

    lastStartedAt: toNullableString(row.last_started_at),
    lastCompletedAt: toNullableString(row.last_completed_at),
    lastFailedAt: toNullableString(row.last_failed_at),
    lastStatus: toNullableString(row.last_status),
    lastRunId: toNullableString(row.last_run_id),

    currentlyLocked: Boolean(row.currently_locked),
    lockedBy: toNullableString(row.locked_by),
    lockedAt: toNullableString(row.locked_at),
    lockExpiresAt: toNullableString(row.lock_expires_at),

    failedRuns24h: toNumber(row.failed_runs_24h),
    completedRuns24h: toNumber(row.completed_runs_24h),
    avgRuntimeMs24h:
      row.avg_runtime_ms_24h === null || row.avg_runtime_ms_24h === undefined
        ? null
        : toNumber(row.avg_runtime_ms_24h),

    alertType: toNullableString(row.alert_type)
  };
}

export function mapAdminTrustUserRow(row: any): AdminTrustUserDto | null {
  if (!row) return null;

  return {
    trustScoreSnapshotId: toStringValue(row.trust_score_snapshot_id),
    userId: toStringValue(row.user_id),

    trustScore: toNumber(row.trust_score),
    riskScore: toNumber(row.risk_score),
    trustTier: toStringValue(row.trust_tier),
    status: toStringValue(row.status),

    reasonCode: toNullableString(row.reason_code),
    reasonMessage: toNullableString(row.reason_message),

    source: toStringValue(row.source),
    calculatedAt: toStringValue(row.calculated_at),
    createdAt: toStringValue(row.created_at),

    recentComponents: asArray(row.recent_components)
  };
}

export function mapAdminTrustComponentRow(row: any): AdminTrustComponentDto {
  return {
    componentId: toStringValue(row.id),
    userId: toStringValue(row.user_id),

    componentKey: toStringValue(row.component_key),
    componentCategory: toStringValue(row.component_category),

    scoreDelta: toNumber(row.score_delta),
    riskDelta: toNumber(row.risk_delta),
    weight: toNumber(row.weight),

    sourceType: toNullableString(row.source_type),
    sourceId: toNullableString(row.source_id),

    reasonCode: toStringValue(row.reason_code),
    reasonMessage: toNullableString(row.reason_message),

    createdAt: toStringValue(row.created_at)
  };
}

export function mapAdminDeviceRow(row: any): AdminDeviceDto {
  return {
    deviceId: toStringValue(row.device_id),
    deviceFingerprintHash: toStringValue(row.device_fingerprint_hash),

    platform: toStringValue(row.platform),
    appVersion: toNullableString(row.app_version),
    deviceModel: toNullableString(row.device_model),
    osVersion: toNullableString(row.os_version),

    firstSeenUserId: toNullableString(row.first_seen_user_id),
    firstSeenAt: toStringValue(row.first_seen_at),
    lastSeenAt: toStringValue(row.last_seen_at),

    userCount: toNumber(row.user_count),
    sessionCount: toNumber(row.session_count),

    status: toStringValue(row.status),
    riskScore: toNumber(row.risk_score),

    createdAt: toStringValue(row.created_at),
    updatedAt: toStringValue(row.updated_at)
  };
}

export function mapAdminSessionRiskEventRow(
  row: any
): AdminSessionRiskEventDto {
  return {
    sessionRiskEventId: toStringValue(row.session_risk_event_id),
    userId: toStringValue(row.user_id),
    deviceId: toNullableString(row.device_id),
    appSessionId: toNullableString(row.app_session_id),
    requestId: toNullableString(row.request_id),

    eventType: toStringValue(row.event_type),
    platform: toNullableString(row.platform),
    appVersion: toNullableString(row.app_version),

    ipHash: toNullableString(row.ip_hash),

    riskScore: toNumber(row.risk_score),
    trustDelta: toNumber(row.trust_delta),
    riskDelta: toNumber(row.risk_delta),

    decision: toStringValue(row.decision),
    reasonCode: toStringValue(row.reason_code),
    reasonMessage: toNullableString(row.reason_message),

    source: toStringValue(row.source),
    occurredAt: toStringValue(row.occurred_at)
  };
}

export function mapAdminNetworkRiskObservationRow(
  row: any
): AdminNetworkRiskObservationDto {
  return {
    networkObservationId: toStringValue(row.network_observation_id),
    userId: toStringValue(row.user_id),
    deviceId: toNullableString(row.device_id),

    ipHash: toStringValue(row.ip_hash),
    ipCountry: toNullableString(row.ip_country),
    ipRegion: toNullableString(row.ip_region),
    ipCity: toNullableString(row.ip_city),

    asn: toNullableString(row.asn),
    networkType: toNullableString(row.network_type),

    isVpn:
      row.is_vpn === null || row.is_vpn === undefined ? null : Boolean(row.is_vpn),
    isProxy:
      row.is_proxy === null || row.is_proxy === undefined
        ? null
        : Boolean(row.is_proxy),
    isTor:
      row.is_tor === null || row.is_tor === undefined ? null : Boolean(row.is_tor),
    isHosting:
      row.is_hosting === null || row.is_hosting === undefined
        ? null
        : Boolean(row.is_hosting),

    riskScore: toNumber(row.risk_score),
    source: toStringValue(row.source),
    observedAt: toStringValue(row.observed_at)
  };
}
