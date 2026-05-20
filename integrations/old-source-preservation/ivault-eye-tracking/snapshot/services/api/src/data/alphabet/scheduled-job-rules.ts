import type { ScheduledJobCategory, ScheduledJobKey } from "@/types/alphabet/scheduled-job.types";

export interface ScheduledJobRuleSet {
  jobKey: ScheduledJobKey;
  jobCategory: ScheduledJobCategory;

  requiresLock: boolean;
  allowManualTrigger: boolean;
  createsAlertOnFailure: boolean;

  minJobReadinessScore: number;
  minLockSafetyScore: number;
  minExecutionSafetyScore: number;
  minResultIntegrityScore: number;
  minRetrySafetyScore: number;

  active: boolean;
}

export const SCHEDULED_JOB_RULES: ScheduledJobRuleSet[] = [
  {
    jobKey: "provider_polling_5m",
    jobCategory: "payments",
    requiresLock: true,
    allowManualTrigger: true,
    createsAlertOnFailure: true,
    minJobReadinessScore: 0.8,
    minLockSafetyScore: 0.9,
    minExecutionSafetyScore: 0.85,
    minResultIntegrityScore: 0.75,
    minRetrySafetyScore: 0.7,
    active: true
  },
  {
    jobKey: "pending_payout_scan_5m",
    jobCategory: "payments",
    requiresLock: true,
    allowManualTrigger: true,
    createsAlertOnFailure: true,
    minJobReadinessScore: 0.8,
    minLockSafetyScore: 0.9,
    minExecutionSafetyScore: 0.85,
    minResultIntegrityScore: 0.75,
    minRetrySafetyScore: 0.7,
    active: true
  },
  {
    jobKey: "review_sla_scan_5m",
    jobCategory: "risk",
    requiresLock: true,
    allowManualTrigger: true,
    createsAlertOnFailure: true,
    minJobReadinessScore: 0.75,
    minLockSafetyScore: 0.9,
    minExecutionSafetyScore: 0.8,
    minResultIntegrityScore: 0.75,
    minRetrySafetyScore: 0.7,
    active: true
  },
  {
    jobKey: "operational_alert_scan_5m",
    jobCategory: "risk",
    requiresLock: true,
    allowManualTrigger: true,
    createsAlertOnFailure: true,
    minJobReadinessScore: 0.75,
    minLockSafetyScore: 0.9,
    minExecutionSafetyScore: 0.8,
    minResultIntegrityScore: 0.75,
    minRetrySafetyScore: 0.7,
    active: true
  },
  {
    jobKey: "stuck_saga_scan_1h",
    jobCategory: "infra",
    requiresLock: true,
    allowManualTrigger: true,
    createsAlertOnFailure: true,
    minJobReadinessScore: 0.7,
    minLockSafetyScore: 0.85,
    minExecutionSafetyScore: 0.75,
    minResultIntegrityScore: 0.7,
    minRetrySafetyScore: 0.65,
    active: true
  },
  {
    jobKey: "wallet_invariant_scan_1h",
    jobCategory: "wallet",
    requiresLock: true,
    allowManualTrigger: true,
    createsAlertOnFailure: true,
    minJobReadinessScore: 0.8,
    minLockSafetyScore: 0.9,
    minExecutionSafetyScore: 0.85,
    minResultIntegrityScore: 0.8,
    minRetrySafetyScore: 0.7,
    active: true
  },
  {
    jobKey: "idempotency_expiry_1h",
    jobCategory: "infra",
    requiresLock: true,
    allowManualTrigger: true,
    createsAlertOnFailure: false,
    minJobReadinessScore: 0.65,
    minLockSafetyScore: 0.85,
    minExecutionSafetyScore: 0.7,
    minResultIntegrityScore: 0.65,
    minRetrySafetyScore: 0.6,
    active: true
  },
  {
    jobKey: "dedupe_expiry_1h",
    jobCategory: "infra",
    requiresLock: true,
    allowManualTrigger: true,
    createsAlertOnFailure: false,
    minJobReadinessScore: 0.65,
    minLockSafetyScore: 0.85,
    minExecutionSafetyScore: 0.7,
    minResultIntegrityScore: 0.65,
    minRetrySafetyScore: 0.6,
    active: true
  },
  {
    jobKey: "audit_integrity_daily",
    jobCategory: "audit",
    requiresLock: true,
    allowManualTrigger: true,
    createsAlertOnFailure: true,
    minJobReadinessScore: 0.8,
    minLockSafetyScore: 0.9,
    minExecutionSafetyScore: 0.85,
    minResultIntegrityScore: 0.85,
    minRetrySafetyScore: 0.7,
    active: true
  },
  {
    jobKey: "financial_reconciliation_daily",
    jobCategory: "payments",
    requiresLock: true,
    allowManualTrigger: true,
    createsAlertOnFailure: true,
    minJobReadinessScore: 0.85,
    minLockSafetyScore: 0.9,
    minExecutionSafetyScore: 0.9,
    minResultIntegrityScore: 0.85,
    minRetrySafetyScore: 0.7,
    active: true
  },
  {
    jobKey: "trust_fraud_review_daily",
    jobCategory: "fraud",
    requiresLock: true,
    allowManualTrigger: true,
    createsAlertOnFailure: true,
    minJobReadinessScore: 0.8,
    minLockSafetyScore: 0.9,
    minExecutionSafetyScore: 0.85,
    minResultIntegrityScore: 0.8,
    minRetrySafetyScore: 0.7,
    active: true
  }
];

export function getScheduledJobRule(jobKey: string): ScheduledJobRuleSet | null {
  return SCHEDULED_JOB_RULES.find((rule) => rule.active && rule.jobKey === jobKey) ?? null;
}
