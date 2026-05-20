import { AUDIT_RULES } from "../../data/alphabet/audit-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  AuditEvaluationResult,
  AuditRuleSet,
  AuditSignalInput,
  AuditDecisionStatus,
  EvidenceItem
} from "../../types/alphabet/audit.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: AuditSignalInput): AuditRuleSet | undefined {
  return AUDIT_RULES.find(
    (rule) => rule.active && rule.auditCategory === input.auditCategory
  );
}

export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }

  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(object[key])}`)
    .join(",")}}`;
}

export async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function calculateAuditHash(params: {
  subjectType: string;
  subjectId: string;
  targetObjectId: string;
  auditCategory: string;
  evidencePacketId?: string | null;
  sourceEventIds: string[];
  previousHash?: string | null;
  chainSequence: number;
  payload?: Record<string, unknown>;
}): Promise<string> {
  return sha256Hex(
    canonicalize({
      subjectType: params.subjectType,
      subjectId: params.subjectId,
      targetObjectId: params.targetObjectId,
      auditCategory: params.auditCategory,
      evidencePacketId: params.evidencePacketId ?? null,
      sourceEventIds: params.sourceEventIds,
      previousHash: params.previousHash ?? null,
      chainSequence: params.chainSequence,
      payload: params.payload ?? {}
    })
  );
}

function calculateAuditIntegrityScore(input: AuditSignalInput): number {
  return clamp(
    (input.hashValid ? 0.35 : 0) +
      (input.chainValid ? 0.25 : 0) +
      (input.immutableHash ? 0.15 : 0) +
      (input.chainSequence >= 0 ? 0.1 : 0) +
      (input.sourceEventIds.length > 0 ? 0.1 : 0) +
      (input.evidencePacketId ? 0.05 : 0)
  );
}

function calculateEvidenceCompletenessScore(input: AuditSignalInput): number {
  if (input.evidenceItems.length === 0) {
    return clamp(input.evidenceCompletenessScore);
  }

  const typeDiversity = new Set(input.evidenceItems.map((item) => item.evidenceType)).size;
  const redactionCoverage = input.evidenceItems.every(
    (item) => item.privacySensitivity !== "restricted" || item.redactionRequired
  )
    ? 1
    : 0.4;

  const itemQuality =
    input.evidenceItems.reduce((sum, item) => {
      const hasTitle = item.title.trim().length > 0 ? 0.25 : 0;
      const hasSummary = item.summary.trim().length > 0 ? 0.25 : 0;
      const hasPayload = Object.keys(item.payload).length > 0 ? 0.25 : 0;
      const hasHash = item.hash ? 0.25 : 0;
      return sum + hasTitle + hasSummary + hasPayload + hasHash;
    }, 0) / input.evidenceItems.length;

  return clamp(
    input.evidenceCompletenessScore * 0.35 +
      itemQuality * 0.35 +
      clamp(typeDiversity / 4) * 0.15 +
      redactionCoverage * 0.15
  );
}

function calculateComplianceRiskScore(input: AuditSignalInput): number {
  let risk =
    clamp(input.fraudRisk) * 0.18 +
    clamp(input.safetyRisk) * 0.2 +
    clamp(input.complianceRisk) * 0.24 +
    clamp(input.paymentRisk) * 0.16 +
    clamp(input.privacyRisk) * 0.16;

  if (input.childSafetyFlag) risk += 0.12;
  if (input.legalRequestFlag) risk += 0.08;
  if (input.financialRecordFlag) risk += 0.04;
  if (input.privacySensitivity === "restricted") risk += 0.08;
  if (input.redactionRequired && !input.exportSafe) risk += 0.05;

  return clamp(risk);
}

function calculateExportSafetyScore(input: AuditSignalInput): number {
  let score = 1;

  if (!input.exportSafe) score -= 0.25;
  if (input.redactionRequired) score -= 0.12;
  if (input.privacySensitivity === "restricted") score -= 0.25;
  if (input.privacySensitivity === "high") score -= 0.12;
  if (input.privacyRisk > 0.5) score -= 0.15;
  if (input.childSafetyFlag) score -= 0.2;
  if (input.evidenceItems.some((item) => item.privacySensitivity === "restricted")) {
    score -= 0.12;
  }

  return clamp(score);
}

function deletionEligible(input: AuditSignalInput): boolean {
  if (input.legalHold) return false;
  if (!input.deletionEligibleAt) return false;
  return new Date(input.now).getTime() >= new Date(input.deletionEligibleAt).getTime();
}

function buildExportRecord(input: AuditSignalInput): Record<string, unknown> {
  const safeEvidence = input.evidenceItems.map((item) => ({
    evidenceItemId: item.evidenceItemId,
    evidenceType: item.evidenceType,
    sourceObjectId: item.sourceObjectId ?? null,
    sourceEventId: item.sourceEventId ?? null,
    title: item.title,
    summary: item.redactionRequired ? "Redacted evidence summary." : item.summary,
    privacySensitivity: item.privacySensitivity,
    redacted: item.redactionRequired,
    hash: item.hash ?? null,
    createdAt: item.createdAt
  }));

  return {
    auditRecordId: input.auditRecordId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    auditCategory: input.auditCategory,
    severity: input.severity,
    complianceStatus: input.complianceStatus,
    retentionClass: input.retentionClass,
    targetObjectId: input.targetObjectId,
    evidencePacketId: input.evidencePacketId ?? null,
    sourceEventIds: input.sourceEventIds,
    immutableHash: input.immutableHash,
    previousHash: input.previousHash ?? null,
    chainSequence: input.chainSequence,
    exportSafe: input.exportSafe,
    privacySensitivity: input.privacySensitivity,
    redactionRequired: input.redactionRequired,
    legalHold: input.legalHold,
    evidence: safeEvidence
  };
}

function decideAuditStatus(params: {
  input: AuditSignalInput;
  rule: AuditRuleSet;
  auditIntegrityScore: number;
  evidenceCompletenessScore: number;
  complianceRiskScore: number;
  exportSafetyScore: number;
  deletionEligible: boolean;
  reasons: string[];
}): AuditDecisionStatus {
  const {
    input,
    rule,
    auditIntegrityScore,
    evidenceCompletenessScore,
    complianceRiskScore,
    exportSafetyScore,
    reasons
  } = params;

  if (input.legalHold || input.retentionClass === "legal_hold") {
    reasons.push("legal_hold_applied");
    return "audit_legal_hold";
  }

  if (rule.requiresEscalationForChildSafety && input.childSafetyFlag) {
    reasons.push("child_safety_audit_escalation_required");
    return "audit_escalated";
  }

  if (input.severity === "critical" && rule.requiresLegalHoldForCritical) {
    reasons.push("critical_audit_requires_legal_hold_review");
    return "audit_review_required";
  }

  if (rule.requiresEvidencePacket && !input.evidencePacketId) {
    reasons.push("evidence_packet_required");
    return "audit_incomplete";
  }

  if (rule.requiresHashChain && (!input.hashValid || !input.chainValid)) {
    reasons.push("hash_chain_invalid");
    return "audit_review_required";
  }

  if (auditIntegrityScore < rule.minAuditIntegrityScore) {
    reasons.push("audit_integrity_below_minimum");
    return "audit_review_required";
  }

  if (evidenceCompletenessScore < rule.minEvidenceCompletenessScore) {
    reasons.push("evidence_completeness_below_minimum");
    return "audit_incomplete";
  }

  if (complianceRiskScore > rule.maxComplianceRiskScore) {
    reasons.push("compliance_risk_above_maximum");
    return complianceRiskScore > 0.7 ? "audit_escalated" : "audit_review_required";
  }

  if (input.exportRequested) {
    if (
      !input.exportSafe ||
      exportSafetyScore < rule.minExportSafetyScore ||
      input.privacyRisk > rule.maxPrivacyRiskForExport ||
      (input.privacySensitivity === "restricted" && rule.requiresRedactionForRestricted)
    ) {
      reasons.push("audit_export_blocked");
      return "audit_export_blocked";
    }

    reasons.push("audit_export_ready");
    return "audit_export_ready";
  }

  reasons.push("audit_complete");
  return "audit_complete";
}

function createAuditAlphabetEvent(params: {
  input: AuditSignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.actorUserId ?? params.input.subjectOwnerUserId ?? "system",
    coinCode: "J",
    eventType: params.eventType,
    objectType: "audit_record",
    objectId: params.input.auditRecordId,
    sourceContext: "audit",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: "unknown",
    verificationStatus: params.verificationStatus,
    metadata: {
      auditRecordId: params.input.auditRecordId,
      subjectType: params.input.subjectType,
      subjectId: params.input.subjectId,
      auditCategory: params.input.auditCategory,
      severity: params.input.severity,
      complianceStatus: params.input.complianceStatus,
      retentionClass: params.input.retentionClass,
      targetObjectId: params.input.targetObjectId,
      evidencePacketId: params.input.evidencePacketId ?? null,
      sourceEventIds: params.input.sourceEventIds,
      immutableHash: params.input.immutableHash,
      previousHash: params.input.previousHash ?? null,
      chainSequence: params.input.chainSequence,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function evaluateAuditRecord(input: AuditSignalInput): AuditEvaluationResult {
  const reasons: string[] = [];
  const rule = findRule(input);

  const auditIntegrityScore = calculateAuditIntegrityScore(input);
  const evidenceScore = calculateEvidenceCompletenessScore(input);
  const complianceRiskScore = calculateComplianceRiskScore(input);
  const exportSafetyScore = calculateExportSafetyScore(input);
  const isDeletionEligible = deletionEligible(input);

  if (!rule) {
    reasons.push("no_active_audit_rule");

    const auditRecordCreatedEvent = createAuditAlphabetEvent({
      input,
      eventType: "audit_record_created",
      rawScore: auditIntegrityScore,
      qualityScore: evidenceScore,
      riskScore: complianceRiskScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      auditRecordId: input.auditRecordId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      auditCategory: input.auditCategory,
      severity: input.severity,
      complianceStatus: input.complianceStatus,
      retentionClass: input.retentionClass,
      status: "audit_review_required",
      auditIntegrityScore,
      evidenceCompletenessScore: evidenceScore,
      complianceRiskScore,
      exportSafetyScore,
      auditComplete: false,
      reviewRequired: true,
      escalated: false,
      exportReady: false,
      exportBlocked: false,
      legalHoldApplied: false,
      deletionEligible: false,
      exportRecord: null,
      reasons,
      auditRecordCreatedEvent,
      evidencePacketCreatedEvent: null,
      auditRecordCompletedEvent: null,
      auditReviewRequiredEvent: auditRecordCreatedEvent,
      auditEscalatedEvent: null,
      auditExportReadyEvent: null,
      auditExportBlockedEvent: null,
      auditLegalHoldAppliedEvent: null,
      metadata: input.metadata ?? {}
    };
  }

  const status = decideAuditStatus({
    input,
    rule,
    auditIntegrityScore,
    evidenceCompletenessScore: evidenceScore,
    complianceRiskScore,
    exportSafetyScore,
    deletionEligible: isDeletionEligible,
    reasons
  });

  const auditComplete =
    status === "audit_complete" ||
    status === "audit_export_ready" ||
    status === "audit_legal_hold";
  const reviewRequired = status === "audit_review_required" || status === "audit_incomplete";
  const escalated = status === "audit_escalated";
  const exportReady = status === "audit_export_ready";
  const exportBlocked = status === "audit_export_blocked";
  const legalHoldApplied = status === "audit_legal_hold";
  const exportRecord = exportReady ? buildExportRecord(input) : null;

  const verificationStatus = auditComplete || exportReady ? "verified" : "rejected";

  const auditRecordCreatedEvent = createAuditAlphabetEvent({
    input,
    eventType: "audit_record_created",
    rawScore: auditIntegrityScore,
    qualityScore: evidenceScore,
    riskScore: complianceRiskScore,
    verificationStatus,
    metadata: { status, reasons }
  });

  const evidencePacketCreatedEvent = input.evidencePacketId
    ? createAuditAlphabetEvent({
        input,
        eventType: "evidence_packet_created",
        rawScore: input.evidenceItems.length,
        qualityScore: evidenceScore,
        riskScore: complianceRiskScore,
        verificationStatus: "verified",
        metadata: {
          status,
          evidencePacketId: input.evidencePacketId,
          evidenceItemCount: input.evidenceItems.length,
          reasons
        }
      })
    : null;

  const auditRecordCompletedEvent =
    status === "audit_complete"
      ? createAuditAlphabetEvent({
          input,
          eventType: "audit_record_completed",
          rawScore: auditIntegrityScore,
          qualityScore: evidenceScore,
          riskScore: complianceRiskScore,
          verificationStatus: "verified",
          metadata: { status, reasons }
        })
      : null;

  const auditReviewRequiredEvent =
    reviewRequired
      ? createAuditAlphabetEvent({
          input,
          eventType: "audit_review_required",
          rawScore: auditIntegrityScore,
          qualityScore: evidenceScore,
          riskScore: complianceRiskScore,
          verificationStatus: "rejected",
          metadata: { status, reasons }
        })
      : null;

  const auditEscalatedEvent =
    escalated
      ? createAuditAlphabetEvent({
          input,
          eventType: "audit_escalated",
          rawScore: complianceRiskScore,
          qualityScore: evidenceScore,
          riskScore: complianceRiskScore,
          verificationStatus: "rejected",
          metadata: { status, reasons }
        })
      : null;

  const auditExportReadyEvent =
    exportReady
      ? createAuditAlphabetEvent({
          input,
          eventType: "audit_export_ready",
          rawScore: exportSafetyScore,
          qualityScore: auditIntegrityScore,
          riskScore: complianceRiskScore,
          verificationStatus: "verified",
          metadata: { status, reasons }
        })
      : null;

  const auditExportBlockedEvent =
    exportBlocked
      ? createAuditAlphabetEvent({
          input,
          eventType: "audit_export_blocked",
          rawScore: exportSafetyScore,
          qualityScore: auditIntegrityScore,
          riskScore: complianceRiskScore,
          verificationStatus: "rejected",
          metadata: { status, reasons }
        })
      : null;

  const auditLegalHoldAppliedEvent =
    legalHoldApplied
      ? createAuditAlphabetEvent({
          input,
          eventType: "audit_legal_hold_applied",
          rawScore: auditIntegrityScore,
          qualityScore: evidenceScore,
          riskScore: complianceRiskScore,
          verificationStatus: "verified",
          metadata: { status, reasons }
        })
      : null;

  return {
    auditRecordId: input.auditRecordId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    auditCategory: input.auditCategory,
    severity: input.severity,
    complianceStatus: input.complianceStatus,
    retentionClass: input.retentionClass,
    status,
    auditIntegrityScore,
    evidenceCompletenessScore: evidenceScore,
    complianceRiskScore,
    exportSafetyScore,
    auditComplete,
    reviewRequired,
    escalated,
    exportReady,
    exportBlocked,
    legalHoldApplied,
    deletionEligible: isDeletionEligible,
    exportRecord,
    reasons,
    auditRecordCreatedEvent,
    evidencePacketCreatedEvent,
    auditRecordCompletedEvent,
    auditReviewRequiredEvent,
    auditEscalatedEvent,
    auditExportReadyEvent,
    auditExportBlockedEvent,
    auditLegalHoldAppliedEvent,
    metadata: {
      ruleAuditCategory: rule.auditCategory,
      ...input.metadata
    }
  };
}

export function derivePacketPrivacy(items: EvidenceItem[]): {
  privacySensitivity: "low" | "medium" | "high" | "restricted";
  redactionRequired: boolean;
} {
  if (items.some((item) => item.privacySensitivity === "restricted")) {
    return { privacySensitivity: "restricted", redactionRequired: true };
  }

  if (items.some((item) => item.privacySensitivity === "high")) {
    return {
      privacySensitivity: "high",
      redactionRequired: items.some((item) => item.redactionRequired)
    };
  }

  if (items.some((item) => item.privacySensitivity === "medium")) {
    return {
      privacySensitivity: "medium",
      redactionRequired: items.some((item) => item.redactionRequired)
    };
  }

  return {
    privacySensitivity: "low",
    redactionRequired: items.some((item) => item.redactionRequired)
  };
}
