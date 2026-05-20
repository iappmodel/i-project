import { REVIEW_RULES } from "../../data/alphabet/review-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  ReviewDecision,
  ReviewEvaluationResult,
  ReviewerRole,
  ReviewOutcomeStatus,
  ReviewRuleSet,
  ReviewSignalInput
} from "../../types/alphabet/review.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: ReviewSignalInput): ReviewRuleSet | undefined {
  return REVIEW_RULES.find(
    (rule) => rule.active && rule.subjectType === input.subjectType
  );
}

function isExpired(input: ReviewSignalInput): boolean {
  return new Date(input.now).getTime() > new Date(input.slaDeadlineAt).getTime();
}

function isSeniorRole(role?: ReviewerRole | null): boolean {
  return role === "senior_reviewer" || role === "admin";
}

function isSpecialistRole(role?: ReviewerRole | null): boolean {
  return (
    role === "safety_specialist" ||
    role === "rights_specialist" ||
    role === "compliance_specialist" ||
    role === "payment_specialist" ||
    role === "treasury_specialist" ||
    role === "senior_reviewer" ||
    role === "admin"
  );
}

function decisionIsFinal(decision: ReviewDecision): boolean {
  return !["none", "request_more_evidence", "escalate"].includes(decision);
}

function calculateReviewPriorityScore(input: ReviewSignalInput): number {
  const priorityWeight = {
    low: 0.15,
    normal: 0.35,
    high: 0.6,
    urgent: 0.8,
    critical: 1
  }[input.priority];

  const riskBlend =
    clamp(input.riskScore) * 0.25 +
    clamp(input.severityScore) * 0.25 +
    clamp(input.fraudRisk) * 0.12 +
    clamp(input.safetyRisk) * 0.14 +
    clamp(input.complianceRisk) * 0.1 +
    clamp(input.paymentRisk) * 0.07 +
    clamp(input.rightsRisk) * 0.07;

  return clamp(priorityWeight * 0.45 + riskBlend * 0.55);
}

function calculateDecisionQualityScore(input: ReviewSignalInput): number {
  const decisionScore = decisionIsFinal(input.decision)
    ? clamp(input.decisionConfidenceScore)
    : input.decision === "request_more_evidence"
      ? 0.45
      : 0.1;

  return clamp(
    decisionScore * 0.35 +
      clamp(input.reviewerConfidenceScore) * 0.25 +
      clamp(input.evidenceCompletenessScore) * 0.25 +
      (input.decisionSummary && input.decisionSummary.length >= 12 ? 0.15 : 0)
  );
}

function calculateAppealEligibilityScore(input: ReviewSignalInput): number {
  const appealRemaining =
    input.appealCount < input.allowedAppealLimit ? 1 : 0;

  const ownerScore = input.requesterIsSubjectOwner ? 1 : 0.25;
  const decisionScore = decisionIsFinal(input.decision) ? 1 : 0.2;
  const severityScore = clamp(input.severityScore);

  return clamp(
    appealRemaining * 0.35 +
      ownerScore * 0.25 +
      decisionScore * 0.2 +
      severityScore * 0.2
  );
}

function calculateResolutionIntegrityScore(input: ReviewSignalInput): number {
  const evidenceScore = clamp(input.evidenceCompletenessScore);
  const decisionScore = clamp(input.decisionConfidenceScore);
  const reviewerScore = clamp(input.reviewerConfidenceScore);
  const correctionScore =
    input.downstreamCorrectionRequested
      ? input.correctionInstructions.length > 0
        ? 1
        : 0
      : 1;

  const roleScore =
    input.priority === "critical" || input.riskScore > 0.6 || input.severityScore > 0.6
      ? isSpecialistRole(input.assignedReviewerRole)
        ? 1
        : 0.3
      : input.assignedReviewerRole
        ? 1
        : 0.4;

  return clamp(
    evidenceScore * 0.25 +
      decisionScore * 0.25 +
      reviewerScore * 0.2 +
      correctionScore * 0.15 +
      roleScore * 0.15
  );
}

function requiresSpecialist(input: ReviewSignalInput, rule: ReviewRuleSet): boolean {
  if (!rule.requireSpecialistForCritical) return false;

  return (
    input.priority === "critical" ||
    input.riskScore > rule.maxRiskScoreForStandardReviewer ||
    input.severityScore > rule.maxSeverityScoreForStandardReviewer ||
    input.safetyRisk > 0.5 ||
    input.complianceRisk > 0.5 ||
    input.paymentRisk > 0.5 ||
    input.rightsRisk > 0.5
  );
}

function decideReviewOutcome(params: {
  input: ReviewSignalInput;
  rule: ReviewRuleSet;
  reviewPriorityScore: number;
  decisionQualityScore: number;
  appealEligibilityScore: number;
  resolutionIntegrityScore: number;
  expired: boolean;
  needsSpecialist: boolean;
  reasons: string[];
}): ReviewOutcomeStatus {
  const {
    input,
    rule,
    decisionQualityScore,
    appealEligibilityScore,
    resolutionIntegrityScore,
    expired,
    needsSpecialist,
    reasons
  } = params;

  if (expired && !decisionIsFinal(input.decision)) {
    reasons.push("review_sla_expired_without_decision");
    return "review_expired";
  }

  if (rule.requireEvidencePacket && !input.evidencePacketId) {
    reasons.push("evidence_packet_required");
    return "review_needs_evidence";
  }

  if (input.evidenceCompletenessScore < rule.minEvidenceCompletenessScore) {
    reasons.push("evidence_completeness_below_minimum");
    return "review_needs_evidence";
  }

  if (!input.assignedReviewerRole || !input.assignedReviewerUserId) {
    reasons.push("reviewer_assignment_required");
    return "review_queued";
  }

  if (needsSpecialist && !isSpecialistRole(input.assignedReviewerRole)) {
    reasons.push("specialist_reviewer_required");
    return "review_escalated";
  }

  if (
    input.appealRequested &&
    (!rule.allowAppeal || input.appealCount >= input.allowedAppealLimit)
  ) {
    reasons.push("appeal_not_allowed_or_limit_reached");
    return "review_resolved";
  }

  if (input.appealRequested) {
    if (rule.requireSeniorForAppeal && !isSeniorRole(input.assignedReviewerRole)) {
      reasons.push("senior_reviewer_required_for_appeal");
      return "review_escalated";
    }

    if (appealEligibilityScore < 0.55) {
      reasons.push("appeal_eligibility_below_minimum");
      return "review_resolved";
    }

    reasons.push("appeal_created");
    return "review_appealable";
  }

  if (input.decision === "request_more_evidence") {
    reasons.push("reviewer_requested_more_evidence");
    return "review_needs_evidence";
  }

  if (input.decision === "escalate") {
    reasons.push("reviewer_escalated_case");
    return "review_escalated";
  }

  if (input.decision === "none") {
    if (input.currentStatus === "assigned") {
      reasons.push("review_assigned");
      return "review_assigned";
    }

    if (input.currentStatus === "in_review" || input.currentStatus === "appeal_in_review") {
      reasons.push("review_in_progress");
      return "review_in_progress";
    }

    reasons.push("review_created");
    return "review_created";
  }

  if (input.decisionConfidenceScore < rule.minDecisionConfidenceScore) {
    reasons.push("decision_confidence_below_minimum");
    return "review_escalated";
  }

  if (input.reviewerConfidenceScore < rule.minReviewerConfidenceScore) {
    reasons.push("reviewer_confidence_below_minimum");
    return "review_escalated";
  }

  if (decisionQualityScore < rule.minDecisionQualityScore) {
    reasons.push("decision_quality_below_minimum");
    return "review_escalated";
  }

  if (resolutionIntegrityScore < rule.minResolutionIntegrityScore) {
    reasons.push("resolution_integrity_below_minimum");
    return "review_escalated";
  }

  if (input.downstreamCorrectionRequested && input.correctionInstructions.length === 0) {
    reasons.push("downstream_correction_missing_instructions");
    return "review_escalated";
  }

  reasons.push("review_decided");
  return input.downstreamCorrectionRequested ? "review_resolved" : "review_decided";
}

function createReviewAlphabetEvent(params: {
  input: ReviewSignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.subjectOwnerUserId ?? "system",
    coinCode: "J",
    eventType: params.eventType,
    objectType: "review_case",
    objectId: params.input.reviewCaseId,
    sourceContext: "system",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: "unknown",
    verificationStatus: params.verificationStatus,
    metadata: {
      reviewCaseId: params.input.reviewCaseId,
      subjectType: params.input.subjectType,
      subjectId: params.input.subjectId,
      reason: params.input.reason,
      priority: params.input.priority,
      currentStatus: params.input.currentStatus,
      decision: params.input.decision,
      assignedReviewerRole: params.input.assignedReviewerRole ?? null,
      assignedReviewerUserId: params.input.assignedReviewerUserId ?? null,
      evidencePacketId: params.input.evidencePacketId ?? null,
      sourceEventIds: params.input.sourceEventIds,
      appealCount: params.input.appealCount,
      allowedAppealLimit: params.input.allowedAppealLimit,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function evaluateReviewCase(input: ReviewSignalInput): ReviewEvaluationResult {
  const reasons: string[] = [];
  const rule = findRule(input);

  const reviewPriorityScore = calculateReviewPriorityScore(input);
  const decisionQualityScore = calculateDecisionQualityScore(input);
  const appealEligibilityScore = calculateAppealEligibilityScore(input);
  const resolutionIntegrityScore = calculateResolutionIntegrityScore(input);
  const expired = isExpired(input);

  if (!rule) {
    reasons.push("no_active_review_rule");

    const reviewCaseCreatedEvent = createReviewAlphabetEvent({
      input,
      eventType: "review_case_created",
      rawScore: reviewPriorityScore,
      qualityScore: decisionQualityScore,
      riskScore: input.riskScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      reviewCaseId: input.reviewCaseId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      subjectOwnerUserId: input.subjectOwnerUserId ?? null,
      status: "review_escalated",
      decision: input.decision,
      reviewPriorityScore,
      decisionQualityScore,
      appealEligibilityScore,
      resolutionIntegrityScore,
      requiresEvidence: true,
      requiresAssignment: true,
      requiresSpecialist: true,
      requiresSeniorReview: true,
      appealAllowed: false,
      appealCreated: false,
      expired,
      resolved: false,
      downstreamCorrectionRequired: false,
      correctionInstructions: [],
      reasons,
      reviewCaseCreatedEvent,
      reviewEvidenceRequestedEvent: reviewCaseCreatedEvent,
      reviewCaseAssignedEvent: null,
      reviewStartedEvent: null,
      reviewDecisionMadeEvent: null,
      reviewAppealCreatedEvent: null,
      reviewAppealResolvedEvent: null,
      reviewCaseResolvedEvent: null,
      reviewCaseEscalatedEvent: reviewCaseCreatedEvent,
      reviewDownstreamCorrectionRequiredEvent: null,
      metadata: input.metadata ?? {}
    };
  }

  const needsSpecialist = requiresSpecialist(input, rule);

  const status = decideReviewOutcome({
    input,
    rule,
    reviewPriorityScore,
    decisionQualityScore,
    appealEligibilityScore,
    resolutionIntegrityScore,
    expired,
    needsSpecialist,
    reasons
  });

  const requiresEvidence = status === "review_needs_evidence";
  const requiresAssignment = status === "review_queued";
  const requiresSeniorReview =
    input.appealRequested && rule.requireSeniorForAppeal && !isSeniorRole(input.assignedReviewerRole);

  const appealAllowed =
    rule.allowAppeal &&
    input.appealCount < input.allowedAppealLimit &&
    decisionIsFinal(input.decision) &&
    status !== "review_expired";

  const appealCreated = status === "review_appealable";
  const resolved = status === "review_resolved" || status === "review_decided";
  const downstreamCorrectionRequired =
    input.downstreamCorrectionRequested &&
    resolved &&
    input.correctionInstructions.length > 0;

  const verificationStatus =
    status === "review_decided" ||
    status === "review_resolved" ||
    status === "review_assigned" ||
    status === "review_in_progress" ||
    status === "review_appealable"
      ? "verified"
      : "rejected";

  const reviewCaseCreatedEvent = createReviewAlphabetEvent({
    input,
    eventType: "review_case_created",
    rawScore: reviewPriorityScore,
    qualityScore: decisionQualityScore,
    riskScore: input.riskScore,
    verificationStatus,
    metadata: { status, reasons }
  });

  const reviewEvidenceRequestedEvent =
    requiresEvidence
      ? createReviewAlphabetEvent({
          input,
          eventType: "review_evidence_requested",
          rawScore: input.evidenceCompletenessScore,
          qualityScore: decisionQualityScore,
          riskScore: input.riskScore,
          verificationStatus: "rejected",
          metadata: { status, reasons }
        })
      : null;

  const reviewCaseAssignedEvent =
    input.assignedReviewerRole && input.assignedReviewerUserId
      ? createReviewAlphabetEvent({
          input,
          eventType: "review_case_assigned",
          rawScore: reviewPriorityScore,
          qualityScore: input.reviewerConfidenceScore,
          riskScore: input.riskScore,
          verificationStatus: "verified",
          metadata: { status, reasons }
        })
      : null;

  const reviewStartedEvent =
    status === "review_in_progress" ||
    input.currentStatus === "in_review" ||
    input.currentStatus === "appeal_in_review"
      ? createReviewAlphabetEvent({
          input,
          eventType: "review_started",
          rawScore: reviewPriorityScore,
          qualityScore: input.evidenceCompletenessScore,
          riskScore: input.riskScore,
          verificationStatus,
          metadata: { status, reasons }
        })
      : null;

  const reviewDecisionMadeEvent =
    decisionIsFinal(input.decision) &&
    (status === "review_decided" || status === "review_resolved" || status === "review_appealable")
      ? createReviewAlphabetEvent({
          input,
          eventType: "review_decision_made",
          rawScore: decisionQualityScore,
          qualityScore: resolutionIntegrityScore,
          riskScore: input.riskScore,
          verificationStatus: "verified",
          metadata: {
            status,
            decision: input.decision,
            decisionSummary: input.decisionSummary ?? null,
            reasons
          }
        })
      : null;

  const reviewAppealCreatedEvent =
    appealCreated
      ? createReviewAlphabetEvent({
          input,
          eventType: "review_appeal_created",
          rawScore: appealEligibilityScore,
          qualityScore: decisionQualityScore,
          riskScore: input.riskScore,
          verificationStatus: "verified",
          metadata: { status, reasons }
        })
      : null;

  const reviewAppealResolvedEvent =
    input.currentStatus === "appeal_in_review" && resolved
      ? createReviewAlphabetEvent({
          input,
          eventType: "review_appeal_resolved",
          rawScore: decisionQualityScore,
          qualityScore: resolutionIntegrityScore,
          riskScore: input.riskScore,
          verificationStatus: "verified",
          metadata: { status, decision: input.decision, reasons }
        })
      : null;

  const reviewCaseResolvedEvent =
    resolved
      ? createReviewAlphabetEvent({
          input,
          eventType: "review_case_resolved",
          rawScore: resolutionIntegrityScore,
          qualityScore: decisionQualityScore,
          riskScore: input.riskScore,
          verificationStatus: "verified",
          metadata: { status, decision: input.decision, reasons }
        })
      : null;

  const reviewCaseEscalatedEvent =
    status === "review_escalated"
      ? createReviewAlphabetEvent({
          input,
          eventType: "review_case_escalated",
          rawScore: reviewPriorityScore,
          qualityScore: resolutionIntegrityScore,
          riskScore: input.riskScore,
          verificationStatus: "rejected",
          metadata: {
            status,
            requiresSpecialist: needsSpecialist,
            requiresSeniorReview,
            reasons
          }
        })
      : null;

  const reviewDownstreamCorrectionRequiredEvent =
    downstreamCorrectionRequired
      ? createReviewAlphabetEvent({
          input,
          eventType: "review_downstream_correction_required",
          rawScore: input.correctionInstructions.length,
          qualityScore: resolutionIntegrityScore,
          riskScore: input.riskScore,
          verificationStatus: "verified",
          metadata: {
            status,
            correctionInstructions: input.correctionInstructions,
            reasons
          }
        })
      : null;

  return {
    reviewCaseId: input.reviewCaseId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    subjectOwnerUserId: input.subjectOwnerUserId ?? null,
    status,
    decision: input.decision,
    reviewPriorityScore,
    decisionQualityScore,
    appealEligibilityScore,
    resolutionIntegrityScore,
    requiresEvidence,
    requiresAssignment,
    requiresSpecialist: needsSpecialist,
    requiresSeniorReview,
    appealAllowed,
    appealCreated,
    expired,
    resolved,
    downstreamCorrectionRequired,
    correctionInstructions: downstreamCorrectionRequired
      ? input.correctionInstructions
      : [],
    reasons,
    reviewCaseCreatedEvent,
    reviewEvidenceRequestedEvent,
    reviewCaseAssignedEvent,
    reviewStartedEvent,
    reviewDecisionMadeEvent,
    reviewAppealCreatedEvent,
    reviewAppealResolvedEvent,
    reviewCaseResolvedEvent,
    reviewCaseEscalatedEvent,
    reviewDownstreamCorrectionRequiredEvent,
    metadata: {
      ruleSubjectType: rule.subjectType,
      ...input.metadata
    }
  };
}
