import type { AlphabetEvent } from "./event.types";

export type AuditSubjectType =
  | "wallet"
  | "ledger_entry"
  | "reward"
  | "conversion"
  | "withdrawal"
  | "campaign"
  | "creator_payout"
  | "content_rights"
  | "content_safety"
  | "review"
  | "appeal"
  | "treasury"
  | "admin_command"
  | "notification"
  | "trust_score"
  | "u_value"
  | "grant"
  | "policy"
  | "system";

export type AuditCategory =
  | "financial"
  | "safety"
  | "rights"
  | "compliance"
  | "fraud"
  | "payout"
  | "campaign"
  | "treasury"
  | "review"
  | "admin"
  | "notification"
  | "identity"
  | "system";

export type EvidenceType =
  | "event"
  | "screenshot"
  | "document"
  | "model_output"
  | "user_submission"
  | "reviewer_note"
  | "admin_command"
  | "ledger_snapshot"
  | "policy_result"
  | "treasury_snapshot"
  | "notification_copy"
  | "external_reference";

export type AuditSeverity =
  | "low"
  | "normal"
  | "high"
  | "urgent"
  | "critical";

export type ComplianceStatus =
  | "none"
  | "pending"
  | "compliant"
  | "non_compliant"
  | "review_required"
  | "escalated";

export type RetentionClass =
  | "short"
  | "standard"
  | "extended"
  | "legal_hold"
  | "permanent";

export type AuditDecisionStatus =
  | "audit_created"
  | "audit_complete"
  | "audit_incomplete"
  | "audit_review_required"
  | "audit_escalated"
  | "audit_export_ready"
  | "audit_export_blocked"
  | "audit_legal_hold";

export type AuditPrivacySensitivity =
  | "low"
  | "medium"
  | "high"
  | "restricted";

export interface EvidenceItem {
  evidenceItemId: string;
  evidenceType: EvidenceType;
  sourceObjectId?: string | null;
  sourceEventId?: string | null;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  privacySensitivity: AuditPrivacySensitivity;
  redactionRequired: boolean;
  hash?: string | null;
  createdAt: string;
}

export interface EvidencePacket {
  evidencePacketId: string;
  subjectType: AuditSubjectType;
  subjectId: string;
  actorUserId?: string | null;
  subjectOwnerUserId?: string | null;
  evidenceItems: EvidenceItem[];
  completenessScore: number;
  privacySensitivity: AuditPrivacySensitivity;
  redactionRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditRecord {
  auditRecordId: string;
  subjectType: AuditSubjectType;
  subjectId: string;
  auditCategory: AuditCategory;
  severity: AuditSeverity;
  complianceStatus: ComplianceStatus;
  retentionClass: RetentionClass;
  actorUserId?: string | null;
  subjectOwnerUserId?: string | null;
  targetObjectId: string;
  evidencePacketId?: string | null;
  sourceEventIds: string[];
  immutableHash: string;
  previousHash?: string | null;
  chainSequence: number;
  exportSafe: boolean;
  privacySensitivity: AuditPrivacySensitivity;
  redactionRequired: boolean;
  legalHold: boolean;
  deletionEligibleAt?: string | null;
  status: AuditDecisionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuditSignalInput {
  auditRecordId: string;
  subjectType: AuditSubjectType;
  subjectId: string;
  auditCategory: AuditCategory;
  severity: AuditSeverity;
  complianceStatus: ComplianceStatus;
  retentionClass: RetentionClass;
  actorUserId?: string | null;
  subjectOwnerUserId?: string | null;
  targetObjectId: string;
  evidencePacketId?: string | null;
  evidenceItems: EvidenceItem[];
  sourceEventIds: string[];
  immutableHash: string;
  previousHash?: string | null;
  chainSequence: number;
  exportRequested: boolean;
  exportSafe: boolean;
  privacySensitivity: AuditPrivacySensitivity;
  redactionRequired: boolean;
  legalHold: boolean;
  deletionEligibleAt?: string | null;
  now: string;
  evidenceCompletenessScore: number;
  hashValid: boolean;
  chainValid: boolean;
  fraudRisk: number;
  safetyRisk: number;
  complianceRisk: number;
  paymentRisk: number;
  privacyRisk: number;
  childSafetyFlag: boolean;
  financialRecordFlag: boolean;
  legalRequestFlag: boolean;
  metadata?: Record<string, unknown>;
}

export interface AuditRuleSet {
  auditCategory: AuditCategory;
  minAuditIntegrityScore: number;
  minEvidenceCompletenessScore: number;
  minExportSafetyScore: number;
  maxComplianceRiskScore: number;
  maxPrivacyRiskForExport: number;
  requiresEvidencePacket: boolean;
  requiresHashChain: boolean;
  requiresRedactionForRestricted: boolean;
  requiresLegalHoldForCritical: boolean;
  requiresEscalationForChildSafety: boolean;
  defaultRetentionClass: RetentionClass;
  minimumRetentionDays: number;
  active: boolean;
}

export interface AuditEvaluationResult {
  auditRecordId: string;
  subjectType: AuditSubjectType;
  subjectId: string;
  auditCategory: AuditCategory;
  severity: AuditSeverity;
  complianceStatus: ComplianceStatus;
  retentionClass: RetentionClass;
  status: AuditDecisionStatus;
  auditIntegrityScore: number;
  evidenceCompletenessScore: number;
  complianceRiskScore: number;
  exportSafetyScore: number;
  auditComplete: boolean;
  reviewRequired: boolean;
  escalated: boolean;
  exportReady: boolean;
  exportBlocked: boolean;
  legalHoldApplied: boolean;
  deletionEligible: boolean;
  exportRecord: Record<string, unknown> | null;
  reasons: string[];
  auditRecordCreatedEvent: AlphabetEvent;
  evidencePacketCreatedEvent?: AlphabetEvent | null;
  auditRecordCompletedEvent?: AlphabetEvent | null;
  auditReviewRequiredEvent?: AlphabetEvent | null;
  auditEscalatedEvent?: AlphabetEvent | null;
  auditExportReadyEvent?: AlphabetEvent | null;
  auditExportBlockedEvent?: AlphabetEvent | null;
  auditLegalHoldAppliedEvent?: AlphabetEvent | null;
  metadata: Record<string, unknown>;
}
