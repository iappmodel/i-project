import type { AlphabetEvent } from "./event.types";

export type SafetyReportContext =
  | "harassment"
  | "scam"
  | "spam"
  | "self_harm"
  | "child_safety"
  | "hate"
  | "sexual_content"
  | "violence"
  | "misinformation"
  | "impersonation"
  | "copyright"
  | "payment_abuse"
  | "marketplace_abuse"
  | "privacy_violation"
  | "platform_abuse"
  | "other";

export type ModerationOutcome =
  | "pending"
  | "no_violation"
  | "warning"
  | "content_removed"
  | "account_restricted"
  | "account_suspended"
  | "escalated"
  | "law_enforcement_escalation";

export type SafetyVerificationStatus =
  | "safety_contribution_verified"
  | "judgment_verified"
  | "valid_report"
  | "invalid_report"
  | "false_report"
  | "needs_review"
  | "suspicious";

export type SafetyReportStatus =
  | "submitted"
  | "under_review"
  | "validated"
  | "invalid"
  | "false_report"
  | "needs_review"
  | "suspicious"
  | "closed";

export interface SafetyReport {
  safetyReportId: string;

  reporterUserId: string;
  reportedUserId?: string | null;

  context: SafetyReportContext;

  objectType: string;
  objectId: string;

  status: SafetyReportStatus;

  reporterAgeBand: string;

  submittedAt: string;
  reviewedAt?: string | null;
  closedAt?: string | null;
  updatedAt: string;
}

export interface SafetySignalInput {
  safetyReportId: string;

  reporterUserId: string;
  reportedUserId?: string | null;

  context: SafetyReportContext;

  objectType: string;
  objectId: string;

  evidenceScore: number;
  reportClarityScore: number;
  reporterHistoryScore: number;

  harmSeverity: number;
  urgencyScore: number;

  moderationOutcome: ModerationOutcome;

  reportValid: boolean;
  appealReversed: boolean;

  falseReportRisk: number;
  brigadingRisk: number;
  retaliationRisk: number;
  manipulationRisk: number;
  reporterDeviceIntegrityScore: number;

  reporterAgeBand: string;

  metadata?: Record<string, unknown>;
}

export interface SafetyRuleSet {
  context: SafetyReportContext;

  minEvidenceScore: number;
  minReportClarityScore: number;
  minReporterHistoryScore: number;

  minSafetyContributionScore: number;
  minJudgmentScore: number;

  minHarmSeverityForSafetyCoin: number;

  maxRiskScore: number;
  maxFalseReportRisk: number;
  maxBrigadingRisk: number;
  maxRetaliationRisk: number;

  under13Allowed: boolean;
  teenAllowed: boolean;

  requiresStrictReview: boolean;
  active: boolean;
}

export interface SafetyVerificationResult {
  safetyReportId: string;

  reporterUserId: string;
  reportedUserId?: string | null;

  status: SafetyVerificationStatus;

  safetyContributionScore: number;
  judgmentScore: number;
  riskScore: number;

  reasons: string[];

  reportSubmittedEvent: AlphabetEvent;
  reportValidatedEvent?: AlphabetEvent | null;
  safetyContributionEvent?: AlphabetEvent | null;
  judgmentEvent?: AlphabetEvent | null;
  falseReportEvent?: AlphabetEvent | null;

  metadata: Record<string, unknown>;
}
