/**
 * Stage 32 — P.O.P.S data categories and retention contracts.
 * Principle: keep only what verification, settlement, fraud, disputes, compliance,
 * and aggregate analytics require; delete or aggregate the rest.
 */

export const POPS_DATA_CATEGORY = {
  SESSION_METADATA: "SESSION_METADATA",
  EVENTS: "EVENTS",
  SIGNAL_BATCHES: "SIGNAL_BATCHES",
  AGGREGATES: "AGGREGATES",
  JUDGMENTS: "JUDGMENTS",
  REWARD_DECISIONS: "REWARD_DECISIONS",
  WALLET_INTENTS: "WALLET_INTENTS",
  PRIVACY_RECEIPTS: "PRIVACY_RECEIPTS",
  TRUST_IMPACTS: "TRUST_IMPACTS",
  ADMIN_ACTIONS: "ADMIN_ACTIONS",
  DISPUTES: "DISPUTES",
  AUDIT_LOGS: "AUDIT_LOGS",
  RAW_CAMERA: "RAW_CAMERA",
  RAW_AUDIO: "RAW_AUDIO",
  PRECISE_LOCATION: "PRECISE_LOCATION",
  AGGREGATE_ANALYTICS: "AGGREGATE_ANALYTICS"
} as const;

export type PopsDataCategory =
  (typeof POPS_DATA_CATEGORY)[keyof typeof POPS_DATA_CATEGORY];

export const RETENTION_REASON = {
  NORMAL_OPERATION: "NORMAL_OPERATION",
  WALLET_SETTLEMENT: "WALLET_SETTLEMENT",
  USER_DISPUTE: "USER_DISPUTE",
  FRAUD_REVIEW: "FRAUD_REVIEW",
  ADMIN_REVIEW: "ADMIN_REVIEW",
  LEGAL_HOLD: "LEGAL_HOLD",
  KYC_REVIEW: "KYC_REVIEW",
  AGGREGATE_ANALYTICS: "AGGREGATE_ANALYTICS",
  USER_DELETION_REQUEST: "USER_DELETION_REQUEST"
} as const;

export type RetentionReason =
  (typeof RETENTION_REASON)[keyof typeof RETENTION_REASON];

/** Default window (days) for raw camera when stored for human review. */
export const POPS_RAW_CAMERA_REVIEW_RETENTION_DAYS_MIN = 7;
export const POPS_RAW_CAMERA_REVIEW_RETENTION_DAYS_MAX = 30;

/** Normal P.O.P.S events / signal batch horizon before aggregation or purge. */
export const POPS_STANDARD_RETENTION_DAYS = 90;

/** Dispute / legal tail after session end (days) — policy knob; extend via hold. */
export const POPS_DISPUTE_RETENTION_DAYS = 365;

export interface PopsRetentionRule {
  readonly category: PopsDataCategory;
  /** Human-readable policy text for receipts / ops runbooks. */
  readonly summary: string;
  /** When true, default product posture is to not persist this category at rest. */
  readonly defaultNeverStored: boolean;
  /** Soft max days if stored for review (camera/audio exceptions). */
  readonly reviewStorageMaxDays?: number;
  /** Standard rolling retention in days when no hold applies. */
  readonly rollingRetentionDays?: number;
  /** Financial / audit categories must not be hard-deleted when law requires ledger. */
  readonly financialAuditRecord: boolean;
  /** Raw sensitive categories get highest deletion priority when not on hold. */
  readonly rawSensitive: boolean;
}

export const POPS_RETENTION_RULES: readonly PopsRetentionRule[] = [
  {
    category: POPS_DATA_CATEGORY.SESSION_METADATA,
    summary: "Session metadata retained for operational window; anonymize when eligible.",
    defaultNeverStored: false,
    rollingRetentionDays: POPS_STANDARD_RETENTION_DAYS,
    financialAuditRecord: false,
    rawSensitive: false
  },
  {
    category: POPS_DATA_CATEGORY.EVENTS,
    summary: "Events 90d unless reward, dispute, fraud, or legal hold extends.",
    defaultNeverStored: false,
    rollingRetentionDays: POPS_STANDARD_RETENTION_DAYS,
    financialAuditRecord: false,
    rawSensitive: false
  },
  {
    category: POPS_DATA_CATEGORY.SIGNAL_BATCHES,
    summary: "Signal batches 90d; aggregate then delete raw unless dispute/fraud hold.",
    defaultNeverStored: false,
    rollingRetentionDays: POPS_STANDARD_RETENTION_DAYS,
    financialAuditRecord: false,
    rawSensitive: false
  },
  {
    category: POPS_DATA_CATEGORY.AGGREGATES,
    summary: "Aggregates may persist in anonymized form for analytics.",
    defaultNeverStored: false,
    rollingRetentionDays: POPS_STANDARD_RETENTION_DAYS,
    financialAuditRecord: false,
    rawSensitive: false
  },
  {
    category: POPS_DATA_CATEGORY.JUDGMENTS,
    summary: "Judgments retained as long as wallet / audit requires.",
    defaultNeverStored: false,
    financialAuditRecord: true,
    rawSensitive: false
  },
  {
    category: POPS_DATA_CATEGORY.REWARD_DECISIONS,
    summary: "Reward decisions are financial/audit records.",
    defaultNeverStored: false,
    financialAuditRecord: true,
    rawSensitive: false
  },
  {
    category: POPS_DATA_CATEGORY.WALLET_INTENTS,
    summary: "Wallet reward intents follow settlement and ledger requirements.",
    defaultNeverStored: false,
    financialAuditRecord: true,
    rawSensitive: false
  },
  {
    category: POPS_DATA_CATEGORY.PRIVACY_RECEIPTS,
    summary: "Privacy receipts live as long as the linked decision record unless legally deletable.",
    defaultNeverStored: false,
    financialAuditRecord: true,
    rawSensitive: false
  },
  {
    category: POPS_DATA_CATEGORY.TRUST_IMPACTS,
    summary: "Trust impacts follow trust product policy windows.",
    defaultNeverStored: false,
    rollingRetentionDays: POPS_STANDARD_RETENTION_DAYS,
    financialAuditRecord: false,
    rawSensitive: false
  },
  {
    category: POPS_DATA_CATEGORY.ADMIN_ACTIONS,
    summary: "Admin actions: long audit window or permanent per governance.",
    defaultNeverStored: false,
    financialAuditRecord: true,
    rawSensitive: false
  },
  {
    category: POPS_DATA_CATEGORY.DISPUTES,
    summary: "Disputes retained for dispute/legal window.",
    defaultNeverStored: false,
    rollingRetentionDays: POPS_DISPUTE_RETENTION_DAYS,
    financialAuditRecord: true,
    rawSensitive: false
  },
  {
    category: POPS_DATA_CATEGORY.AUDIT_LOGS,
    summary: "Audit logs follow compliance program (typically long retention).",
    defaultNeverStored: false,
    financialAuditRecord: true,
    rawSensitive: false
  },
  {
    category: POPS_DATA_CATEGORY.RAW_CAMERA,
    summary: "Never stored by default; if stored for review, 7–30d max unless hold.",
    defaultNeverStored: true,
    reviewStorageMaxDays: POPS_RAW_CAMERA_REVIEW_RETENTION_DAYS_MAX,
    financialAuditRecord: false,
    rawSensitive: true
  },
  {
    category: POPS_DATA_CATEGORY.RAW_AUDIO,
    summary: "Never stored by default; consent/legal exceptions shortest retention.",
    defaultNeverStored: true,
    reviewStorageMaxDays: POPS_RAW_CAMERA_REVIEW_RETENTION_DAYS_MAX,
    financialAuditRecord: false,
    rawSensitive: true
  },
  {
    category: POPS_DATA_CATEGORY.PRECISE_LOCATION,
    summary: "Not stored unless campaign requires; campaign/dispute window only.",
    defaultNeverStored: true,
    rollingRetentionDays: POPS_STANDARD_RETENTION_DAYS,
    financialAuditRecord: false,
    rawSensitive: true
  },
  {
    category: POPS_DATA_CATEGORY.AGGREGATE_ANALYTICS,
    summary: "Anonymized aggregates allowed long-term.",
    defaultNeverStored: false,
    financialAuditRecord: false,
    rawSensitive: false
  }
] as const;

export interface PopsLegalHoldState {
  readonly sessionId: string;
  readonly active: boolean;
  readonly reason?: string;
  readonly appliedAt?: string;
  readonly releasedAt?: string;
}

export interface PopsDeletionBatchResult {
  readonly affectedIds: readonly string[];
  readonly skippedDueToHold: readonly string[];
  readonly skippedFinancialLedger: readonly string[];
}

export interface PopsUserDataExport {
  readonly userId: string;
  readonly exportedAt: string;
  readonly sessions: readonly Record<string, unknown>[];
  readonly judgments: readonly Record<string, unknown>[];
  readonly rewardDecisions: readonly Record<string, unknown>[];
  readonly walletRewardIntents: readonly Record<string, unknown>[];
  readonly privacyReceipts: readonly Record<string, unknown>[];
  readonly disputes: readonly Record<string, unknown>[];
  /** User-visible summaries only — no fraud exploit internals or proprietary thresholds. */
  readonly userVisibleReasonSummaries: readonly string[];
  readonly exclusionsNote: string;
}

/**
 * Persistence port for retention/deletion worker (Postgres implementation lives in services).
 * In-memory fakes power unit tests.
 */
export interface PopsRetentionDataStore {
  sessionHasLegalHold(sessionId: string): Promise<boolean>;
  listSessionIdsForUser(userId: string): Promise<string[]>;

  deleteSessionRawPayloads(sessionId: string): Promise<PopsDeletionBatchResult>;
  clearSignalBatchRawPayloadsOlderThan(cutoffIso: string): Promise<PopsDeletionBatchResult>;
  markSignalBatchesAggregatedBefore(cutoffIso: string): Promise<PopsDeletionBatchResult>;
  anonymizeEventsOlderThan(cutoffIso: string): Promise<PopsDeletionBatchResult>;
  deleteOrAnonymizeRawSensitivePastPolicy(nowIso: string): Promise<PopsDeletionBatchResult>;

  applyLegalHold(sessionId: string, reason: string, atIso: string): Promise<void>;
  releaseLegalHold(sessionId: string, atIso: string): Promise<void>;

  loadUserExportSlices(userId: string): Promise<Omit<PopsUserDataExport, "exportedAt" | "exclusionsNote">>;
  deleteUserOwnedEphemeralPopsData(userId: string): Promise<PopsDeletionBatchResult>;
}

export interface PopsRetentionWorkerRunSummary {
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly signalBatches: PopsDeletionBatchResult;
  readonly eventsAnonymized: PopsDeletionBatchResult;
  readonly rawSensitive: PopsDeletionBatchResult;
  readonly errors: readonly string[];
}
