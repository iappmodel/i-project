export type AdminSystemCommandCenterDto = {
  latestSnapshotId: string;
  systemStatus: "healthy" | "warning" | "degraded" | "critical";
  snapshotAt: string;

  walletCount: number;
  activeWalletCount: number;

  totalAvailableBalanceMinor: number;
  totalPendingBalanceMinor: number;
  totalLockedBalanceMinor: number;
  totalWalletBalanceMinor: number;

  rewardPendingCount: number;
  rewardCompletedCount24h: number;
  rewardFailedCount24h: number;

  attentionEventCount1h: number;
  attentionPassedCount1h: number;
  attentionFraudSuspectedCount1h: number;

  unbalancedJournalCount: number;
  missingRewardMirrorCount: number;
  walletAccountingDeltaMinor: number;

  auditMissingHashRecordCount: number;
  auditBrokenVerificationCount24h: number;
  missingAdminActionHashCount: number;
  missingPrivilegedActionHashCount: number;
  missingAdminSecurityAlertHashCount: number;
  openAdminSecurityAlertCount: number;
  criticalAdminSecurityAlertCount: number;
  pendingPrivilegedActionCount: number;
  staleOpenCriticalAlertCount: number;
  staleOpenHighAlertCount: number;
  staleAcknowledgedAlertCount: number;
  privilegedActionsExpiringSoonCount: number;
  adminSecurityEscalationCount24h: number;

  failedScheduledJobCount24h: number;
  criticalErrorCount1h: number;
  highErrorCount1h: number;

  activeAdminSessionCount: number;
  reauthRequiredAdminSessionCount: number;
  revokedAdminSessionCount24h: number;
  expiredAdminSessionCount24h: number;
  idleActiveAdminSessionCount: number;
  openIncidentReviewCount: number;
  overdueIncidentReviewCount: number;
  openCriticalIncidentReviewCount: number;
  closedIncidentReviewCount24h: number;
  openCorrectiveActionCount: number;
  overdueCorrectiveActionCount: number;
  openCriticalCorrectiveActionCount: number;
  completedCorrectiveActionCount24h: number;
  openReviewsWithoutCorrectiveActionsCount: number;

  metrics: Record<string, unknown>;
  jobAlerts: unknown[];
  errorSummary: unknown[];
  activeAlerts: unknown[];
};

export type AdminMoneyIntegrityDto = {
  unbalancedJournalCount: number;
  missingRewardMirrorCount: number;

  accountingUserWalletLiabilityMinor: number;
  walletTotalBalanceMinor: number;
  walletVsAccountingDeltaMinor: number;

  walletIntegrityIssueCount: number;
  campaignBudgetIntegrityIssueCount: number;
  rewardIntegrityIssueCount: number;

  checkedAt: string;
};

export type AdminSchedulerJobDto = {
  scheduledJobId: string;
  jobKey: string;
  jobName: string;
  jobGroup: string;
  enabled: boolean;

  scheduleCron: string;
  timezone: string;

  functionName: string;
  functionArgs: Record<string, unknown>;

  maxRuntimeSeconds: number;
  retryLimit: number;
  lockTtlSeconds: number;

  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  lastFailedAt: string | null;
  lastStatus: string | null;
  lastRunId: string | null;

  currentlyLocked: boolean;
  lockedBy: string | null;
  lockedAt: string | null;
  lockExpiresAt: string | null;

  failedRuns24h: number;
  completedRuns24h: number;
  avgRuntimeMs24h: number | null;

  alertType: string | null;
};

export type AdminTrustUserDto = {
  trustScoreSnapshotId: string;
  userId: string;

  trustScore: number;
  riskScore: number;
  trustTier: string;
  status: string;

  reasonCode: string | null;
  reasonMessage: string | null;

  source: string;
  calculatedAt: string;
  createdAt: string;

  recentComponents: unknown[];
};

export type AdminTrustComponentDto = {
  componentId: string;
  userId: string;

  componentKey: string;
  componentCategory: string;

  scoreDelta: number;
  riskDelta: number;
  weight: number;

  sourceType: string | null;
  sourceId: string | null;

  reasonCode: string;
  reasonMessage: string | null;

  createdAt: string;
};

export type AdminDeviceDto = {
  deviceId: string;
  deviceFingerprintHash: string;

  platform: string;
  appVersion: string | null;
  deviceModel: string | null;
  osVersion: string | null;

  firstSeenUserId: string | null;
  firstSeenAt: string;
  lastSeenAt: string;

  userCount: number;
  sessionCount: number;

  status: string;
  riskScore: number;

  createdAt: string;
  updatedAt: string;
};

export type AdminSessionRiskEventDto = {
  sessionRiskEventId: string;
  userId: string;
  deviceId: string | null;
  appSessionId: string | null;
  requestId: string | null;

  eventType: string;
  platform: string | null;
  appVersion: string | null;

  ipHash: string | null;

  riskScore: number;
  trustDelta: number;
  riskDelta: number;

  decision: string;
  reasonCode: string;
  reasonMessage: string | null;

  source: string;
  occurredAt: string;
};

export type AdminNetworkRiskObservationDto = {
  networkObservationId: string;
  userId: string;
  deviceId: string | null;

  ipHash: string;
  ipCountry: string | null;
  ipRegion: string | null;
  ipCity: string | null;

  asn: string | null;
  networkType: string | null;

  isVpn: boolean | null;
  isProxy: boolean | null;
  isTor: boolean | null;
  isHosting: boolean | null;

  riskScore: number;
  source: string;
  observedAt: string;
};
