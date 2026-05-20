import {
  POPS_DATA_CATEGORY,
  POPS_DISPUTE_RETENTION_DAYS,
  POPS_RAW_CAMERA_REVIEW_RETENTION_DAYS_MAX,
  POPS_RAW_CAMERA_REVIEW_RETENTION_DAYS_MIN,
  POPS_RETENTION_RULES,
  POPS_STANDARD_RETENTION_DAYS,
  RETENTION_REASON,
  type PopsDataCategory,
  type RetentionReason
} from "./pops-retention.types";

const DAY_MS = 86_400_000;

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * DAY_MS);
}

function ruleFor(category: PopsDataCategory) {
  const found = POPS_RETENTION_RULES.find((r) => r.category === category);
  if (!found) {
    throw new Error(`Unknown P.O.P.S data category: ${category}`);
  }
  return found;
}

/**
 * Computes retention horizons and extension rules for P.O.P.S categories.
 */
export class PopsRetentionPolicyService {
  eventRetentionDays(reasons: ReadonlySet<RetentionReason>): number {
    if (
      reasons.has(RETENTION_REASON.LEGAL_HOLD) ||
      reasons.has(RETENTION_REASON.USER_DISPUTE) ||
      reasons.has(RETENTION_REASON.FRAUD_REVIEW) ||
      reasons.has(RETENTION_REASON.WALLET_SETTLEMENT)
    ) {
      return Math.max(POPS_STANDARD_RETENTION_DAYS, POPS_DISPUTE_RETENTION_DAYS);
    }
    if (
      reasons.has(RETENTION_REASON.KYC_REVIEW) ||
      reasons.has(RETENTION_REASON.ADMIN_REVIEW)
    ) {
      return POPS_DISPUTE_RETENTION_DAYS;
    }
    return POPS_STANDARD_RETENTION_DAYS;
  }

  signalBatchRetentionDays(_reasons: ReadonlySet<RetentionReason>): number {
    return POPS_STANDARD_RETENTION_DAYS;
  }

  /** After this horizon, raw batches should be aggregated then raw deleted unless hold. */
  signalBatchRawDeletionCutoff(now: Date, reasons: ReadonlySet<RetentionReason>): Date {
    const days = this.signalBatchRetentionDays(reasons);
    return addDays(now, -days);
  }

  eventSoftRetentionCutoff(now: Date, reasons: ReadonlySet<RetentionReason>): Date {
    const days = this.eventRetentionDays(reasons);
    return addDays(now, -days);
  }

  rawCameraReviewRetentionDays(configuredDays?: number): number {
    if (configuredDays == null) {
      return POPS_RAW_CAMERA_REVIEW_RETENTION_DAYS_MAX;
    }
    return Math.min(
      POPS_RAW_CAMERA_REVIEW_RETENTION_DAYS_MAX,
      Math.max(POPS_RAW_CAMERA_REVIEW_RETENTION_DAYS_MIN, configuredDays)
    );
  }

  rawCameraStoredUntil(createdAt: Date, configuredReviewRetentionDays?: number): string {
    const days = this.rawCameraReviewRetentionDays(configuredReviewRetentionDays);
    return addDays(createdAt, days).toISOString();
  }

  preciseLocationAllowed(campaignRequiresLocation: boolean): boolean {
    return campaignRequiresLocation;
  }

  shouldExtendEventsForRewards(reasons: ReadonlySet<RetentionReason>): boolean {
    return reasons.has(RETENTION_REASON.WALLET_SETTLEMENT);
  }

  isFinancialLedgerCategory(category: PopsDataCategory): boolean {
    return ruleFor(category).financialAuditRecord;
  }

  isRawSensitiveCategory(category: PopsDataCategory): boolean {
    return ruleFor(category).rawSensitive;
  }

  fraudOrLegalHoldBlocksDeletion(reasons: ReadonlySet<RetentionReason>): boolean {
    return (
      reasons.has(RETENTION_REASON.LEGAL_HOLD) ||
      reasons.has(RETENTION_REASON.FRAUD_REVIEW) ||
      reasons.has(RETENTION_REASON.ADMIN_REVIEW) ||
      reasons.has(RETENTION_REASON.KYC_REVIEW)
    );
  }

  categoriesForExport(): PopsDataCategory[] {
    return [
      POPS_DATA_CATEGORY.SESSION_METADATA,
      POPS_DATA_CATEGORY.JUDGMENTS,
      POPS_DATA_CATEGORY.REWARD_DECISIONS,
      POPS_DATA_CATEGORY.WALLET_INTENTS,
      POPS_DATA_CATEGORY.PRIVACY_RECEIPTS,
      POPS_DATA_CATEGORY.DISPUTES
    ];
  }

  exportExclusionsNote(): string {
    return (
      "Excluded from user export: fraud exploit internals, proprietary scoring thresholds, " +
      "other users' data, raw admin-only abuse signatures."
    );
  }
}
