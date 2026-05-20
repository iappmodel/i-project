type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

export type ApiSurface = "app" | "admin" | "worker" | "webhook" | "audit";

export type ApiRole =
  | "user_jwt"
  | "app_api_role"
  | "admin_api_role"
  | "worker_role"
  | "finance_worker_role"
  | "ml_worker_role"
  | "readonly_audit_role"
  | "webhook_secret";

export interface RequestMetadata {
  appVersion?: string;
  platform?: string;
  deviceId?: string;
  sessionId?: string;
  [key: string]: JsonValue | undefined;
}

export interface StandardRequestContext {
  requestId: string;
  idempotencyKey?: string;
  clientTimestamp?: string;
  metadata?: RequestMetadata;
}

export type ApiErrorDto = {
  code: string;
  category: string;
  message: string;
  retryable: boolean;
  httpStatus: number;
  details?: Record<string, unknown>;
};

export type ApiError = ApiErrorDto;

export interface ApiSuccessResponse<T> {
  ok: true;
  data: T;
  error: null;
  requestId: string;
}

export interface ApiErrorResponse {
  ok: false;
  data: null;
  error: ApiErrorDto;
  requestId: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
export type ApiSuccess<T> = ApiSuccessResponse<T>;
export type ApiFailure = ApiErrorResponse;

export type UUID = string;
export type ISODateTime = string;
export type CurrencyCode = "USD";
export type MinorAmount = number;
export type Metadata = Record<string, unknown>;

export type Platform = "ios" | "android" | "web" | "desktop" | "server";

export type PaginatedResponse<T> = {
  items: T[];
  nextCursor: string | null;
};

export type WalletStatus =
  | "active"
  | "restricted"
  | "locked"
  | "fraud_locked"
  | "closed";

export type WalletSummaryDto = {
  walletId: UUID;
  userId: UUID;
  currencyCode: CurrencyCode;
  availableBalanceMinor: MinorAmount;
  pendingBalanceMinor: MinorAmount;
  lockedBalanceMinor: MinorAmount;
  totalBalanceMinor: MinorAmount;
  status: WalletStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type WalletLedgerEntryType =
  | "reward_issued"
  | "reward_released"
  | "withdrawal_reserved"
  | "withdrawal_paid"
  | "withdrawal_failed_released"
  | "withdrawal_reversal_recredit"
  | "admin_credit"
  | "admin_debit"
  | "campaign_clawback";

export type WalletLedgerEntryDto = {
  ledgerEntryId: UUID;
  entryType: WalletLedgerEntryType;
  currencyCode: CurrencyCode;
  availableImpactMinor: MinorAmount;
  pendingImpactMinor: MinorAmount;
  lockedImpactMinor: MinorAmount;
  status: "posted" | "voided" | "reversed";
  sourceType: string;
  sourceId: UUID | null;
  createdAt: ISODateTime;
};

export type ResolveAttentionAssignmentRequestDto = {
  requestId: string;
  idempotencyKey?: string;
  walletId: UUID;
  deviceId?: UUID;
  appSessionId?: UUID;
  campaignId?: UUID;
  creativeId?: UUID;
  placementId?: UUID;
  platform: Platform;
  appVersion: string;
  metadata?: Metadata;
};

export type ResolveAttentionAssignmentResponseDto = {
  runtimeAssignmentId: UUID;
};

export type StartAttentionSessionRequestDto = {
  requestId: string;
  runtimeAssignmentId: UUID;
  walletId: UUID;
  campaignId?: UUID;
  creativeId?: UUID;
  placementId?: UUID;
  deviceId?: UUID;
  appSessionId?: UUID;
  appVersion: string;
  metadata?: Metadata;
};

export type StartAttentionSessionResponseDto = {
  attentionSessionId: UUID;
};

export type AttentionDecision =
  | "passed"
  | "failed"
  | "fraud_suspected"
  | "inconclusive";

export type CompleteAttentionSessionRequestDto = {
  requestId: string;
  idempotencyKey: string;
  attentionSessionId: UUID;
  decision: AttentionDecision;
  decisionReason: string;
  attentionScore: number;
  confidenceScore: number;
  fraudRiskScore: number;
  qualityScore: number;
  gazeScore?: number;
  fixationScore?: number;
  livenessScore?: number;
  completionScore?: number;
  validFrameCount: number;
  invalidFrameCount: number;
  noFaceFrameCount: number;
  gazeInvalidFrameCount: number;
  rewardEligible: boolean;
  metadata?: Metadata;
};

export type CompleteAttentionSessionResponseDto = {
  attentionEventId: UUID;
  rewardEligible: boolean;
  rewardIssued: boolean;
  rewardStatus: "not_eligible" | "queued" | "issued" | "failed" | "review";
};

export type WithdrawalStatus =
  | "requested"
  | "trust_review"
  | "approved"
  | "reserved"
  | "submitted"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"
  | "reversed"
  | "partially_reversed";

export type CreateWithdrawalRequestDto = {
  requestId: string;
  idempotencyKey: string;
  walletId: UUID;
  amountMinor: MinorAmount;
  currencyCode: CurrencyCode;
  providerKey: string;
  metadata?: Metadata;
};

export type CreateWithdrawalResponseDto = {
  withdrawalRequestId: UUID;
  status: WithdrawalStatus;
};

export type WithdrawalSummaryDto = {
  withdrawalRequestId: UUID;
  walletId: UUID;
  currencyCode: CurrencyCode;
  requestedAmountMinor: MinorAmount;
  processorFeeMinor: MinorAmount;
  netAmountMinor: MinorAmount;
  status: WithdrawalStatus;
  requestedAt: ISODateTime;
  approvedAt: ISODateTime | null;
  submittedAt: ISODateTime | null;
  paidAt: ISODateTime | null;
  failedAt: ISODateTime | null;
  cancelledAt: ISODateTime | null;
  reversedAt: ISODateTime | null;
  visibleStatusReason: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type RewardStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "clawed_back";

export type RewardSummaryDto = {
  rewardIssuanceGroupId: UUID;
  walletId: UUID;
  campaignId: UUID | null;
  attentionEventId: UUID | null;
  currencyCode: CurrencyCode;
  rewardAmountMinor: MinorAmount;
  status: RewardStatus;
  createdAt: ISODateTime;
  completedAt: ISODateTime | null;
};

export type UserRewardHistoryItemDto = {
  rewardId: UUID;
  title: string;
  amountMinor: MinorAmount;
  currencyCode: CurrencyCode;
  status: RewardStatus;
  createdAt: ISODateTime;
};

export type AdminActionStatus =
  | "requested"
  | "approved"
  | "denied"
  | "executed"
  | "failed"
  | "cancelled";

export type RequestAdminActionRequestDto = {
  requestId: string;
  permissionKey: string;
  targetType: string;
  targetId: UUID;
  reason: string;
  adminCaseId: UUID;
  walletId?: UUID;
  userId?: UUID;
  campaignId?: UUID;
  requestPayload: Record<string, unknown>;
  metadata?: Metadata;
};

export type RequestAdminActionResponseDto = {
  adminActionRequestId: UUID;
  status: AdminActionStatus;
};

export type ApproveAdminActionRequestDto = {
  requestId: string;
  approvingAdminUserId: UUID;
  reason: string;
  metadata?: Metadata;
};

export type ApproveAdminActionResponseDto = {
  adminActionRequestId: UUID;
  status: AdminActionStatus;
};

export type ApplyTrustOverrideRequestDto = {
  requestId: string;
  adminActionRequestId: UUID;
  subjectType: "wallet" | "user" | "device" | "identity_cluster";
  subjectEntityId: UUID;
  userId?: UUID;
  walletId?: UUID;
  overrideTrustScore: number;
  overrideRiskScore: number;
  overrideConfidenceScore: number;
  reason: string;
  adminCaseId: UUID;
  expiresAt?: ISODateTime;
  metadata?: Metadata;
};

export type ApplyTrustOverrideResponseDto = {
  trustOverrideEventId: UUID;
};

export type AdminWalletCreditRequestDto = {
  requestId: string;
  idempotencyKey: string;
  adminActionRequestId: UUID;
  walletId: UUID;
  userId: UUID;
  amountMinor: MinorAmount;
  currencyCode: CurrencyCode;
  adjustmentType:
    | "support_goodwill_credit"
    | "reward_correction"
    | "refund_correction"
    | "manual_adjustment";
  reason: string;
  adminCaseId: UUID;
  metadata?: Metadata;
};

export type AdminWalletCreditResponseDto = {
  adminAdjustmentGroupId: UUID;
};

export type AdminWithdrawalDetailDto = {
  withdrawalRequestId: UUID;
  walletId: UUID;
  userId: UUID;
  currencyCode: CurrencyCode;
  requestedAmountMinor: MinorAmount;
  processorFeeMinor: MinorAmount;
  netAmountMinor: MinorAmount;
  status: WithdrawalStatus;
  trustGateDecision: string | null;
  providerKey: string | null;
  externalPayoutId: UUID | null;
  externalPayoutStatus: string | null;
  providerPayoutId: string | null;
  providerTransferId: string | null;
  processorReference: string | null;
  requestedAt: ISODateTime;
  approvedAt: ISODateTime | null;
  reservedAt: ISODateTime | null;
  submittedAt: ISODateTime | null;
  paidAt: ISODateTime | null;
  failedAt: ISODateTime | null;
  cancelledAt: ISODateTime | null;
  reversedAt: ISODateTime | null;
  failureReason: string | null;
  cancellationReason: string | null;
  reservedLotCount: number;
  currentlyReservedMinor: MinorAmount;
  consumedReservedMinor: MinorAmount;
  releasedReservedMinor: MinorAmount;
  statusEventCount: number;
};

export type AdminCancelWithdrawalRequestDto = {
  requestId: string;
  adminActionRequestId: UUID;
  reason: string;
  adminCaseId: UUID;
  metadata?: Metadata;
};

export type AdminCancelWithdrawalResponseDto = {
  withdrawalRequestId: UUID;
};

export type AdminFailReleaseWithdrawalRequestDto = {
  requestId: string;
  adminActionRequestId: UUID;
  failureReason: string;
  externalPayoutId?: UUID;
  adminCaseId: UUID;
  metadata?: Metadata;
};

export type AdminFailReleaseWithdrawalResponseDto = {
  withdrawalRequestId: UUID;
};

export type WithdrawalReversalResolutionAction =
  | "recredit_wallet"
  | "do_not_recredit"
  | "fraud_lock"
  | "dismiss";

export type AdminResolveWithdrawalReversalRequestDto = {
  requestId: string;
  adminActionRequestId: UUID;
  resolutionAction: WithdrawalReversalResolutionAction;
  resolutionNote: string;
  adminCaseId: UUID;
  metadata?: Metadata;
};

export type AdminResolveWithdrawalReversalResponseDto = {
  reviewId: UUID;
};

export type RunScheduledJobRequestDto = {
  requestId: string;
  jobKey: string;
  lockedBy: string;
  metadata?: Metadata;
};

export type RunScheduledJobResponseDto = {
  scheduledJobRunId: UUID;
};

export type ScheduledJobStatusDto = {
  scheduledJobId: UUID;
  jobKey: string;
  jobName: string;
  jobGroup: string;
  enabled: boolean;
  scheduleCron: string;
  timezone: string;
  functionName: string;
  lastStartedAt: ISODateTime | null;
  lastCompletedAt: ISODateTime | null;
  lastFailedAt: ISODateTime | null;
  lastStatus:
    | "started"
    | "completed"
    | "failed"
    | "skipped_locked"
    | "disabled"
    | null;
  currentlyLocked: boolean;
  failedRuns24h: number;
  completedRuns24h: number;
  avgRuntimeMs24h: number | null;
};

export type NormalizedPayoutProviderEventDto = {
  providerKey: string;
  providerEventId?: string;
  providerPayoutId?: string;
  providerTransferId?: string;
  processorReference?: string;
  eventType: string;
  eventStatus?: string;
  currencyCode: CurrencyCode;
  amountMinor?: MinorAmount;
  feeMinor?: MinorAmount;
  occurredAt?: ISODateTime;
  rawPayload: Record<string, unknown>;
  metadata?: Metadata;
};

export type WebhookAcceptedResponseDto = {
  received: true;
};

export type SystemHealthStatus = "healthy" | "warning" | "degraded" | "critical";

export type PlatformOperationsDashboardDto = {
  latestSnapshotId: UUID;
  systemStatus: SystemHealthStatus;
  snapshotAt: ISODateTime;
  walletCount: number;
  activeWalletCount: number;
  totalAvailableBalanceMinor: MinorAmount;
  totalPendingBalanceMinor: MinorAmount;
  totalLockedBalanceMinor: MinorAmount;
  rewardIssuancePendingCount: number;
  rewardIssuanceFailedCount: number;
  openPayoutIssueCount: number;
  openCampaignInvoiceIssueCount: number;
  openReconciliationIssueCount: number;
  failedScheduledJobCount24h: number;
  criticalErrorCount1h: number;
  auditHashBrokenCount: number;
  attentionEventCount1h: number;
  attentionFraudSuspectedCount1h: number;
  trustOverrideActiveCount: number;
  fraudLockedWalletCount: number;
  jobAlerts: unknown[];
  errorSummary: unknown[];
};

export type MoneyIntegrityDashboardDto = {
  unbalancedJournalCount: number;
  missingAccountingMirrorCount: number;
  missingCampaignInvoiceMirrorCount: number;
  openHighPayoutIssueCount: number;
  openHighCampaignInvoiceIssueCount: number;
  accountingUserWalletLiabilityMinor: MinorAmount;
  walletTotalBalanceMinor: MinorAmount;
  walletVsAccountingDeltaMinor: MinorAmount;
  checkedAt: ISODateTime;
};

export type AlertSeverity = "warning" | "high" | "critical";
export type AlertStatus = "open" | "acknowledged" | "resolved" | "dismissed";

export type AlertEventDto = {
  alertEventId: UUID;
  alertKey: string;
  alertName: string | null;
  severity: AlertSeverity;
  status: AlertStatus;
  metricName: string;
  metricValue: number | null;
  threshold: number | null;
  message: string;
  ownerTeam: string | null;
  relatedEntityType: string | null;
  relatedEntityId: UUID | null;
  createdAt: ISODateTime;
  acknowledgedAt: ISODateTime | null;
  resolvedAt: ISODateTime | null;
};

export type CampaignInvoiceStatus =
  | "draft"
  | "issued"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "voided"
  | "refunded";

export type CampaignInvoiceSummaryDto = {
  campaignInvoiceId: UUID;
  invoiceNumber: string;
  advertiserId: UUID | null;
  advertiserName: string | null;
  campaignId: UUID | null;
  invoiceType:
    | "campaign_usage"
    | "campaign_prepay"
    | "campaign_adjustment"
    | "campaign_refund";
  status: CampaignInvoiceStatus;
  currencyCode: CurrencyCode;
  rewardAmountMinor: MinorAmount;
  platformFeeMinor: MinorAmount;
  taxAmountMinor: MinorAmount;
  totalAmountMinor: MinorAmount;
  paidAmountMinor: MinorAmount;
  outstandingAmountMinor: MinorAmount;
  billingPeriodStart: ISODateTime | null;
  billingPeriodEnd: ISODateTime | null;
  issuedAt: ISODateTime | null;
  dueAt: ISODateTime | null;
  paidAt: ISODateTime | null;
};

export type AttentionRolloutStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "paused"
  | "completed"
  | "rolled_back"
  | "cancelled";

export type AttentionRolloutDashboardDto = {
  rolloutId: UUID;
  rolloutKey: string;
  rolloutName: string;
  status: AttentionRolloutStatus;
  rolloutType:
    | "percentage"
    | "campaign_only"
    | "platform_only"
    | "internal_test"
    | "holdout_experiment"
    | "forced";
  rolloutPercentage: number;
  killSwitchEnabled: boolean;
  modelVersion: string;
  modelStatus: string | null;
  pipelineVersion: string;
  pipelineStatus: string | null;
  runtimeSignalSchemaVersion: string;
  scoringFormulaVersion: string;
  targetPlatform: Platform | null;
  targetCampaignId: UUID | null;
  eventCount: number | null;
  passRate: number | null;
  fraudSuspectedRate: number | null;
  avgAttentionScore: number | null;
  avgFraudRiskScore: number | null;
  shouldPause: boolean | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export interface IPlatformApiClient {
  getWalletSummary(): Promise<ApiResponse<WalletSummaryDto>>;
  getWalletLedger(params?: {
    limit?: number;
    cursor?: string;
  }): Promise<ApiResponse<PaginatedResponse<WalletLedgerEntryDto>>>;
  resolveAttentionAssignment(
    input: ResolveAttentionAssignmentRequestDto,
  ): Promise<ApiResponse<ResolveAttentionAssignmentResponseDto>>;
  startAttentionSession(
    input: StartAttentionSessionRequestDto,
  ): Promise<ApiResponse<StartAttentionSessionResponseDto>>;
  completeAttentionSession(
    input: CompleteAttentionSessionRequestDto,
  ): Promise<ApiResponse<CompleteAttentionSessionResponseDto>>;
  createWithdrawal(
    input: CreateWithdrawalRequestDto,
  ): Promise<ApiResponse<CreateWithdrawalResponseDto>>;
  getWithdrawal(withdrawalRequestId: UUID): Promise<ApiResponse<WithdrawalSummaryDto>>;
}

export interface IAdminApiClient {
  requestAdminAction(
    input: RequestAdminActionRequestDto,
  ): Promise<ApiResponse<RequestAdminActionResponseDto>>;
  approveAdminAction(
    adminActionRequestId: UUID,
    input: ApproveAdminActionRequestDto,
  ): Promise<ApiResponse<ApproveAdminActionResponseDto>>;
  applyTrustOverride(
    input: ApplyTrustOverrideRequestDto,
  ): Promise<ApiResponse<ApplyTrustOverrideResponseDto>>;
  creditWallet(input: AdminWalletCreditRequestDto): Promise<ApiResponse<AdminWalletCreditResponseDto>>;
  getWithdrawalDetail(
    withdrawalRequestId: UUID,
  ): Promise<ApiResponse<AdminWithdrawalDetailDto>>;
  cancelWithdrawal(
    withdrawalRequestId: UUID,
    input: AdminCancelWithdrawalRequestDto,
  ): Promise<ApiResponse<AdminCancelWithdrawalResponseDto>>;
  failReleaseWithdrawal(
    withdrawalRequestId: UUID,
    input: AdminFailReleaseWithdrawalRequestDto,
  ): Promise<ApiResponse<AdminFailReleaseWithdrawalResponseDto>>;
  getOperationsDashboard(): Promise<ApiResponse<PlatformOperationsDashboardDto>>;
  getMoneyIntegrityDashboard(): Promise<ApiResponse<MoneyIntegrityDashboardDto>>;
}

export const MAX_METADATA_BYTES = 16 * 1024;
export const MAX_IDEMPOTENCY_KEY_LENGTH = 256;

export interface EndpointContract {
  method: "GET" | "POST";
  path: string;
  surface: ApiSurface;
  allowedRoles: readonly ApiRole[];
  rpcFunction?: string;
  description: string;
}

export const ENDPOINT_CONTRACTS = {
  attentionAssignment: {
    method: "POST",
    path: "/v1/attention/assignment",
    surface: "app",
    allowedRoles: ["app_api_role"],
    rpcFunction: "resolve_attention_runtime_assignment",
    description: "Resolve sticky runtime assignment for an attention session.",
  },
  attentionSessionStart: {
    method: "POST",
    path: "/v1/attention/session/start",
    surface: "app",
    allowedRoles: ["app_api_role"],
    rpcFunction: "start_attention_verification_session_from_assignment",
    description: "Start attention verification session from runtime assignment.",
  },
  attentionSessionComplete: {
    method: "POST",
    path: "/v1/attention/session/complete",
    surface: "app",
    allowedRoles: ["app_api_role"],
    rpcFunction: "complete_attention_verification_event",
    description: "Complete attention session and enqueue reward decision flow.",
  },
  walletSummary: {
    method: "GET",
    path: "/v1/wallet/summary",
    surface: "app",
    allowedRoles: ["user_jwt", "app_api_role"],
    description: "Read own wallet summary from safe projection views.",
  },
  walletLedger: {
    method: "GET",
    path: "/v1/wallet/ledger",
    surface: "app",
    allowedRoles: ["user_jwt", "app_api_role"],
    description: "Read own ledger entries with privacy-safe projection.",
  },
  withdrawalsCreate: {
    method: "POST",
    path: "/v1/withdrawals",
    surface: "app",
    allowedRoles: ["app_api_role"],
    rpcFunction: "create_withdrawal_request",
    description: "Create withdrawal request (user identity from auth only).",
  },
  withdrawalsStatus: {
    method: "GET",
    path: "/v1/withdrawals/:withdrawalRequestId",
    surface: "app",
    allowedRoles: ["user_jwt", "app_api_role"],
    description: "Read withdrawal status for authenticated owner.",
  },
  adminActionRequest: {
    method: "POST",
    path: "/v1/admin/actions/request",
    surface: "admin",
    allowedRoles: ["admin_api_role"],
    rpcFunction: "request_admin_action",
    description: "Create auditable admin action request.",
  },
  adminActionApprove: {
    method: "POST",
    path: "/v1/admin/actions/:id/approve",
    surface: "admin",
    allowedRoles: ["admin_api_role"],
    rpcFunction: "approve_admin_action",
    description: "Approve auditable admin action request.",
  },
  adminTrustOverride: {
    method: "POST",
    path: "/v1/admin/trust/override",
    surface: "admin",
    allowedRoles: ["admin_api_role"],
    rpcFunction: "gated_apply_trust_score_override",
    description: "Execute gated trust override mutation.",
  },
  adminWalletCredit: {
    method: "POST",
    path: "/v1/admin/wallets/:walletId/credit",
    surface: "admin",
    allowedRoles: ["admin_api_role"],
    rpcFunction: "gated_admin_credit_wallet_balance",
    description: "Execute gated wallet credit mutation.",
  },
  workerRunJob: {
    method: "POST",
    path: "/v1/worker/jobs/run",
    surface: "worker",
    allowedRoles: ["worker_role", "finance_worker_role", "ml_worker_role"],
    rpcFunction: "run_scheduled_job",
    description: "Run allowlisted scheduled job with worker-only credentials.",
  },
  payoutWebhook: {
    method: "POST",
    path: "/v1/webhooks/payout/:providerKey",
    surface: "webhook",
    allowedRoles: ["webhook_secret"],
    rpcFunction: "record_payout_provider_event",
    description: "Ingest verified provider webhook event payload.",
  },
  adminJobsDashboard: {
    method: "GET",
    path: "/v1/admin/jobs",
    surface: "admin",
    allowedRoles: ["admin_api_role"],
    description: "Read scheduled job dashboard and alerts.",
  },
  auditHashChainRead: {
    method: "GET",
    path: "/v1/audit/hash-chain",
    surface: "audit",
    allowedRoles: ["readonly_audit_role"],
    description: "Read audit hash chain integrity views.",
  },
} as const satisfies Record<string, EndpointContract>;

export type EndpointContractKey = keyof typeof ENDPOINT_CONTRACTS;

export const HIGH_RISK_ADMIN_PERMISSIONS = {
  adminTrustOverride: "trust.override",
  adminWalletCredit: "wallet.adjust",
  adminActionRequest: "admin.action.request",
  adminActionApprove: "admin.action.approve",
} as const;

export function buildSuccessResponse<T>(requestId: string, data: T): ApiSuccessResponse<T> {
  return {
    ok: true,
    data,
    error: null,
    requestId,
  };
}

export function buildErrorResponse(
  requestId: string,
  error: Omit<ApiErrorDto, "details"> & { details?: Record<string, unknown> },
): ApiErrorResponse {
  return {
    ok: false,
    data: null,
    error,
    requestId,
  };
}

export function validateUuidLike(value: string, fieldName: string): void {
  const uuidLikeRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidLikeRegex.test(value)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }
}

export function validateScore(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${fieldName} must be between 0 and 1`);
  }
}

export function validateNonNegativeInt(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }
}

export function validatePositiveAmountMinor(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer minor unit`);
  }
}

export function validateIdempotencyKey(value: string): void {
  if (!value || value.trim().length === 0) {
    throw new Error("idempotencyKey is required");
  }
  if (value.length < 8) {
    throw new Error("idempotencyKey must be at least 8 characters");
  }
  if (value.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    throw new Error(`idempotencyKey exceeds max length ${MAX_IDEMPOTENCY_KEY_LENGTH}`);
  }
}

export function assertMetadataSizeWithinLimit(metadata: Metadata | undefined): void {
  if (!metadata) {
    return;
  }
  const bytes = Buffer.byteLength(JSON.stringify(metadata), "utf8");
  if (bytes > MAX_METADATA_BYTES) {
    throw new Error(`metadata exceeds max ${MAX_METADATA_BYTES} bytes`);
  }
}

export function validateScoresInUnitRange(scores: Record<string, number | undefined>): void {
  for (const [fieldName, value] of Object.entries(scores)) {
    if (value !== undefined) {
      validateScore(value, fieldName);
    }
  }
}

type SimpleSchema<T> = {
  parse: (input: unknown) => T;
};

export const uuidSchema: SimpleSchema<string> = {
  parse(input: unknown): string {
    if (typeof input !== "string") {
      throw new Error("value must be a string UUID");
    }
    validateUuidLike(input, "uuid");
    return input;
  },
};

export const scoreSchema: SimpleSchema<number> = {
  parse(input: unknown): number {
    if (typeof input !== "number") {
      throw new Error("score must be a number");
    }
    validateScore(input, "score");
    return input;
  },
};

export const metadataSchema: SimpleSchema<Metadata | undefined> = {
  parse(input: unknown): Metadata | undefined {
    if (input === undefined) {
      return undefined;
    }
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("metadata must be an object");
    }
    const metadata = input as Metadata;
    assertMetadataSizeWithinLimit(metadata);
    return metadata;
  },
};

export const createWithdrawalRequestSchema: SimpleSchema<CreateWithdrawalRequestDto> = {
  parse(input: unknown): CreateWithdrawalRequestDto {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("createWithdrawal request must be an object");
    }
    const row = input as Record<string, unknown>;
    if (typeof row.requestId !== "string" || row.requestId.length < 1 || row.requestId.length > 128) {
      throw new Error("requestId must be 1..128 characters");
    }
    if (typeof row.idempotencyKey !== "string") {
      throw new Error("idempotencyKey is required");
    }
    validateIdempotencyKey(row.idempotencyKey);
    if (typeof row.walletId !== "string") {
      throw new Error("walletId is required");
    }
    validateUuidLike(row.walletId, "walletId");
    if (typeof row.amountMinor !== "number") {
      throw new Error("amountMinor must be a number");
    }
    validatePositiveAmountMinor(row.amountMinor, "amountMinor");
    if (row.currencyCode !== "USD") {
      throw new Error("currencyCode must be USD");
    }
    if (typeof row.providerKey !== "string" || row.providerKey.length < 1 || row.providerKey.length > 64) {
      throw new Error("providerKey must be 1..64 characters");
    }
    return {
      requestId: row.requestId,
      idempotencyKey: row.idempotencyKey,
      walletId: row.walletId,
      amountMinor: row.amountMinor,
      currencyCode: "USD",
      providerKey: row.providerKey,
      metadata: metadataSchema.parse(row.metadata),
    };
  },
};

export const completeAttentionSessionRequestSchema: SimpleSchema<CompleteAttentionSessionRequestDto> =
  {
    parse(input: unknown): CompleteAttentionSessionRequestDto {
      if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw new Error("completeAttention request must be an object");
      }
      const row = input as Record<string, unknown>;
      if (typeof row.requestId !== "string" || row.requestId.length < 1 || row.requestId.length > 128) {
        throw new Error("requestId must be 1..128 characters");
      }
      if (typeof row.idempotencyKey !== "string") {
        throw new Error("idempotencyKey is required");
      }
      validateIdempotencyKey(row.idempotencyKey);
      if (typeof row.attentionSessionId !== "string") {
        throw new Error("attentionSessionId is required");
      }
      validateUuidLike(row.attentionSessionId, "attentionSessionId");
      const validDecisions: AttentionDecision[] = [
        "passed",
        "failed",
        "fraud_suspected",
        "inconclusive",
      ];
      if (typeof row.decision !== "string" || !validDecisions.includes(row.decision as AttentionDecision)) {
        throw new Error("decision is invalid");
      }
      if (typeof row.decisionReason !== "string" || row.decisionReason.length < 1 || row.decisionReason.length > 256) {
        throw new Error("decisionReason must be 1..256 characters");
      }
      const requiredScores = ["attentionScore", "confidenceScore", "fraudRiskScore", "qualityScore"] as const;
      for (const scoreField of requiredScores) {
        if (typeof row[scoreField] !== "number") {
          throw new Error(`${scoreField} must be a number`);
        }
      }
      validateScoresInUnitRange({
        attentionScore: row.attentionScore as number,
        confidenceScore: row.confidenceScore as number,
        fraudRiskScore: row.fraudRiskScore as number,
        qualityScore: row.qualityScore as number,
        gazeScore: row.gazeScore as number | undefined,
        fixationScore: row.fixationScore as number | undefined,
        livenessScore: row.livenessScore as number | undefined,
        completionScore: row.completionScore as number | undefined,
      });
      const frameFields = [
        "validFrameCount",
        "invalidFrameCount",
        "noFaceFrameCount",
        "gazeInvalidFrameCount",
      ] as const;
      for (const frameField of frameFields) {
        if (typeof row[frameField] !== "number") {
          throw new Error(`${frameField} must be a number`);
        }
        validateNonNegativeInt(row[frameField] as number, frameField);
      }
      if (typeof row.rewardEligible !== "boolean") {
        throw new Error("rewardEligible must be a boolean");
      }

      return {
        requestId: row.requestId,
        idempotencyKey: row.idempotencyKey,
        attentionSessionId: row.attentionSessionId,
        decision: row.decision as AttentionDecision,
        decisionReason: row.decisionReason,
        attentionScore: row.attentionScore as number,
        confidenceScore: row.confidenceScore as number,
        fraudRiskScore: row.fraudRiskScore as number,
        qualityScore: row.qualityScore as number,
        gazeScore: row.gazeScore as number | undefined,
        fixationScore: row.fixationScore as number | undefined,
        livenessScore: row.livenessScore as number | undefined,
        completionScore: row.completionScore as number | undefined,
        validFrameCount: row.validFrameCount as number,
        invalidFrameCount: row.invalidFrameCount as number,
        noFaceFrameCount: row.noFaceFrameCount as number,
        gazeInvalidFrameCount: row.gazeInvalidFrameCount as number,
        rewardEligible: row.rewardEligible,
        metadata: metadataSchema.parse(row.metadata),
      };
    },
  };

export function assertRoleAllowed(contractKey: EndpointContractKey, role: ApiRole): void {
  const contract = ENDPOINT_CONTRACTS[contractKey];
  if (!contract.allowedRoles.includes(role)) {
    throw new Error(`role ${role} is not allowed to call ${contract.path}`);
  }
}

export const IDEMPOTENCY_KEYS = {
  attentionComplete: (attentionSessionId: string) =>
    `attention_complete:${attentionSessionId}`,
  rewardFromAttention: (attentionEventId: string) =>
    `reward_from_attention:${attentionEventId}`,
  withdrawalRequest: (walletId: string, clientRequestId: string) =>
    `withdrawal_request:${walletId}:${clientRequestId}`,
  externalPayout: (withdrawalRequestId: string) =>
    `external_payout:${withdrawalRequestId}`,
  adminCredit: (adminCaseId: string, walletId: string, amountMinor: number) =>
    `admin_credit:${adminCaseId}:${walletId}:${amountMinor}`,
  providerEvent: (providerKey: string, providerEventId: string) =>
    `provider_event:${providerKey}:${providerEventId}`,
  campaignUsageInvoice: (campaignId: string, periodStart: string, periodEnd: string) =>
    `campaign_usage_invoice:${campaignId}:${periodStart}:${periodEnd}`,
} as const;

export const RETRY_SAFE_OPERATIONS = new Set<string>([
  "attention_assignment",
  "attention_session_start",
  "attention_session_complete_with_same_idempotency",
  "withdrawal_create_with_same_idempotency",
  "record_provider_webhook_with_provider_event_id",
  "run_scheduled_job",
]);

export const RETRY_REQUIRES_GUARDRAILS = new Set<string>([
  "admin_credit",
  "admin_debit",
  "campaign_clawback",
  "withdrawal_submission_to_external_provider",
  "invoice_payment_recording",
]);

export const APP_RESPONSE_REDACTED_FIELDS = new Set<string>([
  "identity_graph_details",
  "admin_notes",
  "legal_hold_details",
  "evidence_artifact_uri",
  "model_rollout_targeting",
  "processor_raw_payload",
  "accounting_journal_entries",
  "audit_hash_chain_data",
]);

export function sanitizeForAppResponse<T extends JsonObject>(payload: T): T {
  const sanitized: JsonObject = {};
  for (const [key, value] of Object.entries(payload)) {
    if (APP_RESPONSE_REDACTED_FIELDS.has(key)) {
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized as T;
}

function mustString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new Error(`${key} must be a string`);
  }
  return value;
}

function nullableString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (value == null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`${key} must be string|null`);
  }
  return value;
}

function mustNumber(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value !== "number" && typeof value !== "string") {
    throw new Error(`${key} must be number-like`);
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`${key} must be finite`);
  }
  return numeric;
}

export function mapWalletSummaryRow(rowInput: unknown): WalletSummaryDto {
  if (!rowInput || typeof rowInput !== "object" || Array.isArray(rowInput)) {
    throw new Error("wallet row must be an object");
  }
  const row = rowInput as Record<string, unknown>;
  return {
    walletId: mustString(row, "wallet_id"),
    userId: mustString(row, "user_id"),
    currencyCode: mustString(row, "currency_code") as CurrencyCode,
    availableBalanceMinor: mustNumber(row, "available_balance_minor"),
    pendingBalanceMinor: mustNumber(row, "pending_balance_minor"),
    lockedBalanceMinor: mustNumber(row, "locked_balance_minor"),
    totalBalanceMinor: mustNumber(row, "total_balance_minor"),
    status: mustString(row, "status") as WalletStatus,
    createdAt: mustString(row, "created_at"),
    updatedAt: mustString(row, "updated_at"),
  };
}

export function mapWithdrawalSummaryRow(rowInput: unknown): WithdrawalSummaryDto {
  if (!rowInput || typeof rowInput !== "object" || Array.isArray(rowInput)) {
    throw new Error("withdrawal row must be an object");
  }
  const row = rowInput as Record<string, unknown>;
  return {
    withdrawalRequestId: mustString(row, "withdrawal_request_id"),
    walletId: mustString(row, "wallet_id"),
    currencyCode: mustString(row, "currency_code") as CurrencyCode,
    requestedAmountMinor: mustNumber(row, "requested_amount_minor"),
    processorFeeMinor: mustNumber(row, "processor_fee_minor"),
    netAmountMinor: mustNumber(row, "net_amount_minor"),
    status: mustString(row, "status") as WithdrawalStatus,
    requestedAt: mustString(row, "requested_at"),
    approvedAt: nullableString(row, "approved_at"),
    submittedAt: nullableString(row, "submitted_at"),
    paidAt: nullableString(row, "paid_at"),
    failedAt: nullableString(row, "failed_at"),
    cancelledAt: nullableString(row, "cancelled_at"),
    reversedAt: nullableString(row, "reversed_at"),
    visibleStatusReason: nullableString(row, "visible_status_reason"),
    createdAt: mustString(row, "created_at"),
    updatedAt: mustString(row, "updated_at"),
  };
}

export function withdrawalStatusLabel(status: WithdrawalStatus): string {
  switch (status) {
    case "requested":
    case "approved":
      return "Withdrawal requested";
    case "trust_review":
      return "Under review";
    case "reserved":
    case "submitted":
    case "processing":
      return "Processing";
    case "paid":
      return "Paid";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    case "reversed":
    case "partially_reversed":
      return "Reversed";
    default:
      return "Unknown";
  }
}

export function attentionResultLabel(decision: AttentionDecision): string {
  switch (decision) {
    case "passed":
      return "Verified";
    case "failed":
      return "Not verified";
    case "fraud_suspected":
      return "Not accepted";
    case "inconclusive":
      return "Try again";
    default:
      return "Unknown";
  }
}
