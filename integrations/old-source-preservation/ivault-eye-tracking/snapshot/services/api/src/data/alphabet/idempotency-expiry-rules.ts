import type { IdempotencyExpiryRuleSet } from "@/types/alphabet/idempotency-expiry.types";

export const IDEMPOTENCY_EXPIRY_RULES: IdempotencyExpiryRuleSet[] = [
  {
    expiryType: "idempotency_key_expired",
    defaultSeverity: "info",
    archiveSafeExpired: true,
    suppressDuplicateExpired: false,
    createsOperationalAlert: false,
    createsReviewCase: false,
    minConfidenceScore: 0.7,
    warnSeverityScore: 0.25,
    failSeverityScore: 0.6,
    criticalSeverityScore: 0.85,
    active: true
  },
  {
    expiryType: "idempotency_key_stale",
    defaultSeverity: "warning",
    archiveSafeExpired: false,
    suppressDuplicateExpired: false,
    createsOperationalAlert: true,
    createsReviewCase: false,
    minConfidenceScore: 0.75,
    warnSeverityScore: 0.25,
    failSeverityScore: 0.55,
    criticalSeverityScore: 0.85,
    active: true
  },
  {
    expiryType: "idempotency_key_conflict_spike",
    defaultSeverity: "critical",
    archiveSafeExpired: false,
    suppressDuplicateExpired: true,
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.8,
    warnSeverityScore: 0.2,
    failSeverityScore: 0.45,
    criticalSeverityScore: 0.7,
    active: true
  },
  {
    expiryType: "idempotency_key_replay_spike",
    defaultSeverity: "critical",
    archiveSafeExpired: false,
    suppressDuplicateExpired: true,
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.8,
    warnSeverityScore: 0.2,
    failSeverityScore: 0.45,
    criticalSeverityScore: 0.7,
    active: true
  },
  {
    expiryType: "idempotency_key_missing_result",
    defaultSeverity: "danger",
    archiveSafeExpired: false,
    suppressDuplicateExpired: false,
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.75,
    warnSeverityScore: 0.25,
    failSeverityScore: 0.5,
    criticalSeverityScore: 0.8,
    active: true
  },
  {
    expiryType: "idempotency_key_result_mismatch",
    defaultSeverity: "critical",
    archiveSafeExpired: false,
    suppressDuplicateExpired: true,
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.8,
    warnSeverityScore: 0.2,
    failSeverityScore: 0.45,
    criticalSeverityScore: 0.7,
    active: true
  },
  {
    expiryType: "idempotency_key_locked_too_long",
    defaultSeverity: "danger",
    archiveSafeExpired: false,
    suppressDuplicateExpired: false,
    createsOperationalAlert: true,
    createsReviewCase: false,
    minConfidenceScore: 0.75,
    warnSeverityScore: 0.25,
    failSeverityScore: 0.5,
    criticalSeverityScore: 0.8,
    active: true
  },
  {
    expiryType: "dedupe_key_expired",
    defaultSeverity: "info",
    archiveSafeExpired: true,
    suppressDuplicateExpired: true,
    createsOperationalAlert: false,
    createsReviewCase: false,
    minConfidenceScore: 0.7,
    warnSeverityScore: 0.25,
    failSeverityScore: 0.6,
    criticalSeverityScore: 0.85,
    active: true
  },
  {
    expiryType: "dedupe_key_stale",
    defaultSeverity: "warning",
    archiveSafeExpired: false,
    suppressDuplicateExpired: false,
    createsOperationalAlert: true,
    createsReviewCase: false,
    minConfidenceScore: 0.75,
    warnSeverityScore: 0.25,
    failSeverityScore: 0.55,
    criticalSeverityScore: 0.85,
    active: true
  },
  {
    expiryType: "dedupe_duplicate_spike",
    defaultSeverity: "danger",
    archiveSafeExpired: false,
    suppressDuplicateExpired: true,
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.8,
    warnSeverityScore: 0.2,
    failSeverityScore: 0.45,
    criticalSeverityScore: 0.75,
    active: true
  },
  {
    expiryType: "dedupe_replay_spike",
    defaultSeverity: "critical",
    archiveSafeExpired: false,
    suppressDuplicateExpired: true,
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.8,
    warnSeverityScore: 0.2,
    failSeverityScore: 0.45,
    criticalSeverityScore: 0.7,
    active: true
  },
  {
    expiryType: "dedupe_key_missing_object",
    defaultSeverity: "danger",
    archiveSafeExpired: false,
    suppressDuplicateExpired: false,
    createsOperationalAlert: true,
    createsReviewCase: false,
    minConfidenceScore: 0.75,
    warnSeverityScore: 0.25,
    failSeverityScore: 0.5,
    criticalSeverityScore: 0.8,
    active: true
  },
  {
    expiryType: "dedupe_key_locked_too_long",
    defaultSeverity: "danger",
    archiveSafeExpired: false,
    suppressDuplicateExpired: false,
    createsOperationalAlert: true,
    createsReviewCase: false,
    minConfidenceScore: 0.75,
    warnSeverityScore: 0.25,
    failSeverityScore: 0.5,
    criticalSeverityScore: 0.8,
    active: true
  }
];

export function getIdempotencyExpiryRule(expiryType: string): IdempotencyExpiryRuleSet | null {
  return IDEMPOTENCY_EXPIRY_RULES.find((rule) => rule.active && rule.expiryType === expiryType) ?? null;
}
