import {
  POPS_RETENTION_POLICY,
  type PopsRetentionPolicy
} from "./pops-privacy-receipt.types";

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * DAY_MS);
}

export function retentionExpiresAtForPolicy(
  policy: PopsRetentionPolicy,
  createdAtIso: string
): string | null {
  const createdAt = new Date(createdAtIso);
  switch (policy) {
    case POPS_RETENTION_POLICY.SESSION_ONLY:
      return createdAtIso;
    case POPS_RETENTION_POLICY.THIRTY_DAYS:
      return addDays(createdAt, 30).toISOString();
    case POPS_RETENTION_POLICY.NINETY_DAYS:
      return addDays(createdAt, 90).toISOString();
    case POPS_RETENTION_POLICY.ONE_YEAR:
      return addDays(createdAt, 365).toISOString();
    case POPS_RETENTION_POLICY.FRAUD_REVIEW_REQUIRED:
      return addDays(createdAt, 180).toISOString();
    case POPS_RETENTION_POLICY.KYC_REQUIRED:
      return addDays(createdAt, 365).toISOString();
    case POPS_RETENTION_POLICY.LEGAL_REQUIRED:
      return null;
    default: {
      const exhaustive: never = policy;
      return exhaustive;
    }
  }
}

export function retentionLabel(policy: PopsRetentionPolicy): string {
  switch (policy) {
    case POPS_RETENTION_POLICY.SESSION_ONLY:
      return "Session only";
    case POPS_RETENTION_POLICY.THIRTY_DAYS:
      return "30 days";
    case POPS_RETENTION_POLICY.NINETY_DAYS:
      return "90 days";
    case POPS_RETENTION_POLICY.ONE_YEAR:
      return "1 year";
    case POPS_RETENTION_POLICY.FRAUD_REVIEW_REQUIRED:
      return "Fraud review window";
    case POPS_RETENTION_POLICY.KYC_REQUIRED:
      return "KYC retention window";
    case POPS_RETENTION_POLICY.LEGAL_REQUIRED:
      return "Legal hold";
    default: {
      const exhaustive: never = policy;
      return exhaustive;
    }
  }
}

