import { getAdminReviewRule } from "@/data/alphabet/admin-review-rules";
import { ALPHABET_SYSTEM_USER_ID } from "@/lib/alphabet/db-repositories/alphabet-events.repository";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type {
  AdminReviewEvaluationResult,
  AdminReviewOutcomeStatus,
  AdminReviewConsoleRuleSet,
  AdminReviewSignalInput
} from "@/types/alphabet/admin-review.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function hasEvidence(input: AdminReviewSignalInput): boolean {
  return Boolean(
    input.rawEvidence &&
      typeof input.rawEvidence === "object" &&
      !Array.isArray(input.rawEvidence) &&
      Object.keys(input.rawEvidence as Record<string, unknown>).length > 0
  );
}

function isHighSeverity(input: AdminReviewSignalInput): boolean {
  return input.severity === "high" || input.severity === "critical";
}

function calculateReviewReadinessScore(
  input: AdminReviewSignalInput,
  rule?: AdminReviewConsoleRuleSet | null
): number {
  let score = 0;

  score += input.reviewCaseId ? 0.08 : 0;
  score += input.reviewCaseType ? 0.08 : 0;
  score += input.reviewTrigger ? 0.08 : 0;
  score += input.severity ? 0.06 : 0;
  score += input.priority ? 0.06 : 0;
  score += input.publicSummary ? 0.05 : 0;
  score += input.internalSummary ? 0.05 : 0;
  score += input.sourceEventIds.length > 0 ? 0.06 : 0;

  if (rule?.requiresEvidence) {
    score += hasEvidence(input) ? 0.12 : 0;
  } else {
    score += 0.06;
  }

  if (rule?.requiresAssignmentForDecision && input.decisionSubmitted) {
    score += input.assignedReviewerId ? 0.12 : 0;
  } else {
    score += 0.06;
  }

  score += input.safetyScores.evidenceCompletenessScore * 0.1;
  score += input.safetyScores.downstreamSafetyScore * 0.08;
  score += (1 - input.safetyScores.platformRiskScore) * 0.08;

  return clamp(score);
}

function calculateDecisionSafetyScore(input: AdminReviewSignalInput): number {
  let score = 1;

  score -= input.safetyScores.platformRiskScore * 0.3;
  score -= input.decisionSubmitted && !input.decidedByUserId ? 0.2 : 0;
  score -= input.decisionSubmitted && input.decisionReasonCodes.length === 0 ? 0.15 : 0;
  score -= isHighSeverity(input) && !input.assignedReviewerId ? 0.2 : 0;
  score -=
    input.decision === "reverse_and_compensate" &&
    !input.subjectIds.compensationId &&
    !input.subjectIds.externalTransferId
      ? 0.15
      : 0;
  score -= input.decision === "freeze_wallet" && !input.subjectIds.walletId ? 0.15 : 0;

  score += input.safetyScores.reviewerAuthorityScore * 0.12;
  score += input.safetyScores.decisionConfidenceScore * 0.12;
  score += input.safetyScores.downstreamSafetyScore * 0.12;

  return clamp(score);
}

function decideOutcome(params: {
  input: AdminReviewSignalInput;
  rule: AdminReviewConsoleRuleSet;
  readinessScore: number;
  decisionSafetyScore: number;
  reasons: string[];
}): AdminReviewOutcomeStatus {
  const { input, rule, readinessScore, decisionSafetyScore, reasons } = params;

  if (input.cancelRequested || input.decision === "cancel_case") {
    reasons.push("admin_review_canceled");
    return "review_canceled";
  }

  if (input.closeRequested || input.currentStatus === "review_closed") {
    reasons.push("admin_review_closed");
    return "review_closed";
  }

  if (rule.requiresEvidence && !hasEvidence(input)) {
    reasons.push("admin_review_evidence_required");
    return "review_requires_more_info";
  }

  if (rule.requiresActorForManualAction && !input.subjectIds.actorUserId) {
    reasons.push("admin_review_actor_user_required_for_manual_action");
    return "review_requires_more_info";
  }

  if (rule.requiresAssignmentForHighSeverity && isHighSeverity(input) && !input.assignedReviewerId) {
    reasons.push("admin_review_high_severity_assignment_required");
    return "review_requires_assignment";
  }

  if (input.assignmentRequested && !input.assignedReviewerId) {
    reasons.push("admin_review_assignment_requested");
    return "review_requires_assignment";
  }

  if (input.moreInfoRequested || input.decision === "request_more_info") {
    reasons.push("admin_review_more_info_requested");
    return "review_requires_more_info";
  }

  if (input.safetyScores.evidenceCompletenessScore < rule.minEvidenceCompletenessScore) {
    reasons.push("admin_review_evidence_completeness_below_minimum");
    return "review_requires_more_info";
  }

  if (!input.decisionSubmitted) {
    if (readinessScore < rule.minReviewReadinessScore) {
      reasons.push("admin_review_readiness_below_minimum");
      return "review_requires_more_info";
    }

    reasons.push("admin_review_ready");
    return "review_ready";
  }

  if (rule.requiresAssignmentForDecision && !input.assignedReviewerId) {
    reasons.push("admin_review_assignment_required_for_decision");
    return "review_requires_assignment";
  }

  if (!input.decidedByUserId) {
    reasons.push("admin_review_decider_required");
    return "review_decision_blocked";
  }

  if (rule.requiresDecisionReasonCodes && input.decisionReasonCodes.length === 0) {
    reasons.push("admin_review_decision_reason_codes_required");
    return "review_decision_blocked";
  }

  if (input.safetyScores.reviewerAuthorityScore < rule.minReviewerAuthorityScore) {
    reasons.push("admin_review_reviewer_authority_below_minimum");
    return "review_escalation_required";
  }

  if (input.safetyScores.decisionConfidenceScore < rule.minDecisionConfidenceScore) {
    reasons.push("admin_review_decision_confidence_below_minimum");
    return "review_escalation_required";
  }

  if (input.safetyScores.downstreamSafetyScore < rule.minDownstreamSafetyScore) {
    reasons.push("admin_review_downstream_safety_below_minimum");
    return "review_escalation_required";
  }

  if (input.safetyScores.platformRiskScore > rule.maxPlatformRiskScore) {
    reasons.push("admin_review_platform_risk_above_maximum");
    return "review_escalation_required";
  }

  if (decisionSafetyScore < rule.minDecisionSafetyScore) {
    reasons.push("admin_review_decision_safety_below_minimum");
    return "review_escalation_required";
  }

  if (input.decision === "escalate") {
    reasons.push("admin_review_escalated");
    return "review_escalation_required";
  }

  if (input.decision === "reject_block") {
    reasons.push("admin_review_decision_blocked");
    return "review_decision_blocked";
  }

  if (
    input.decision === "freeze_wallet" ||
    input.decision === "freeze_withdrawals" ||
    input.decision === "freeze_campaign"
  ) {
    reasons.push("admin_review_restrictive_action_allowed");
    return "review_decision_allowed";
  }

  reasons.push("admin_review_decision_allowed");
  return "review_decision_allowed";
}

function createAdminReviewEvent(params: {
  input: AdminReviewSignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  const extraMeta = params.metadata ?? {};
  const inputMeta =
    params.input.metadata &&
    typeof params.input.metadata === "object" &&
    !Array.isArray(params.input.metadata)
      ? (params.input.metadata as Record<string, unknown>)
      : {};

  return {
    eventId: createId("alphabet_event"),
    userId: params.input.subjectIds.userId ?? ALPHABET_SYSTEM_USER_ID,
    coinCode: "J",
    eventType: params.eventType,
    objectType: "admin_review_case",
    objectId: params.input.reviewCaseId,
    sourceContext: "admin_review",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: "unknown",
    verificationStatus: params.verificationStatus,
    metadata: {
      reviewCaseId: params.input.reviewCaseId,
      reviewCaseType: params.input.reviewCaseType,
      reviewTrigger: params.input.reviewTrigger,
      decision: params.input.decision ?? null,
      severity: params.input.severity,
      priority: params.input.priority,
      subjectIds: params.input.subjectIds,
      ...extraMeta,
      ...inputMeta
    },
    createdAt: new Date().toISOString()
  };
}

export function evaluateAdminReview(input: AdminReviewSignalInput): AdminReviewEvaluationResult {
  const reasons: string[] = [];
  const rule = getAdminReviewRule(input.reviewCaseType);

  const readinessScore = calculateReviewReadinessScore(input, rule);
  const decisionSafetyScore = calculateDecisionSafetyScore(input);

  if (!rule) {
    reasons.push("no_active_admin_review_rule");

    const adminReviewCreatedEvent = createAdminReviewEvent({
      input,
      eventType: "admin_review_created",
      rawScore: readinessScore,
      qualityScore: decisionSafetyScore,
      riskScore: 1 - decisionSafetyScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      reviewCaseId: input.reviewCaseId,
      reviewCaseType: input.reviewCaseType,
      reviewTrigger: input.reviewTrigger,
      status: "review_decision_blocked",
      decision: input.decision ?? null,
      reviewReadinessScore: readinessScore,
      decisionSafetyScore,
      ready: false,
      requiresAssignment: false,
      requiresMoreInfo: false,
      decisionAllowed: false,
      decisionBlocked: true,
      escalationRequired: false,
      closed: false,
      canceled: false,
      auditRequired: true,
      notificationRequired: true,
      reasons,
      adminReviewCreatedEvent,
      adminReviewQueuedEvent: null,
      adminReviewAssignedEvent: null,
      adminReviewStartedEvent: null,
      adminReviewMoreInfoRequestedEvent: null,
      adminReviewApprovedEvent: null,
      adminReviewRejectedEvent: adminReviewCreatedEvent,
      adminReviewEscalatedEvent: null,
      adminReviewClosedEvent: null,
      adminReviewCanceledEvent: null,
      metadata: input.metadata ?? {}
    };
  }

  const status = decideOutcome({
    input,
    rule,
    readinessScore,
    decisionSafetyScore,
    reasons
  });

  const ready = status === "review_ready";
  const requiresAssignment = status === "review_requires_assignment";
  const requiresMoreInfo = status === "review_requires_more_info";
  const decisionAllowed = status === "review_decision_allowed";
  const decisionBlocked = status === "review_decision_blocked";
  const escalationRequired = status === "review_escalation_required";
  const closed = status === "review_closed";
  const canceled = status === "review_canceled";

  const verificationStatus: AlphabetEvent["verificationStatus"] =
    ready || decisionAllowed || closed ? "verified" : "rejected";

  const base: {
    rawScore: number;
    qualityScore: number;
    riskScore: number;
    verificationStatus: AlphabetEvent["verificationStatus"];
    metadata: Record<string, unknown>;
  } = {
    rawScore: readinessScore,
    qualityScore: decisionSafetyScore,
    riskScore: 1 - decisionSafetyScore,
    verificationStatus,
    metadata: { status, reasons }
  };

  const adminReviewCreatedEvent = createAdminReviewEvent({
    input,
    eventType: "admin_review_created",
    ...base
  });

  const adminReviewQueuedEvent =
    ready || requiresAssignment
      ? createAdminReviewEvent({
          input,
          eventType: "admin_review_queued",
          ...base
        })
      : null;

  const adminReviewAssignedEvent = input.assignedReviewerId
    ? createAdminReviewEvent({
        input,
        eventType: "admin_review_assigned",
        ...base,
        verificationStatus: "verified"
      })
    : null;

  const adminReviewStartedEvent = input.reviewStarted
    ? createAdminReviewEvent({
        input,
        eventType: "admin_review_started",
        ...base
      })
    : null;

  const adminReviewMoreInfoRequestedEvent = requiresMoreInfo
    ? createAdminReviewEvent({
        input,
        eventType: "admin_review_more_info_requested",
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  const adminReviewApprovedEvent = decisionAllowed
    ? createAdminReviewEvent({
        input,
        eventType: "admin_review_approved",
        ...base,
        verificationStatus: "verified"
      })
    : null;

  const adminReviewRejectedEvent = decisionBlocked
    ? createAdminReviewEvent({
        input,
        eventType: "admin_review_rejected",
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  const adminReviewEscalatedEvent = escalationRequired
    ? createAdminReviewEvent({
        input,
        eventType: "admin_review_escalated",
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  const adminReviewClosedEvent = closed
    ? createAdminReviewEvent({
        input,
        eventType: "admin_review_closed",
        ...base,
        verificationStatus: "verified"
      })
    : null;

  const adminReviewCanceledEvent = canceled
    ? createAdminReviewEvent({
        input,
        eventType: "admin_review_canceled",
        ...base,
        verificationStatus: "rejected"
      })
    : null;

  return {
    reviewCaseId: input.reviewCaseId,
    reviewCaseType: input.reviewCaseType,
    reviewTrigger: input.reviewTrigger,
    status,
    decision: input.decision ?? null,
    reviewReadinessScore: readinessScore,
    decisionSafetyScore,
    ready,
    requiresAssignment,
    requiresMoreInfo,
    decisionAllowed,
    decisionBlocked,
    escalationRequired,
    closed,
    canceled,
    auditRequired: rule.requiresAudit,
    notificationRequired: rule.requiresNotification,
    reasons,
    adminReviewCreatedEvent,
    adminReviewQueuedEvent,
    adminReviewAssignedEvent,
    adminReviewStartedEvent,
    adminReviewMoreInfoRequestedEvent,
    adminReviewApprovedEvent,
    adminReviewRejectedEvent,
    adminReviewEscalatedEvent,
    adminReviewClosedEvent,
    adminReviewCanceledEvent,
    metadata: {
      ruleReviewCaseType: rule.reviewCaseType,
      ...metadataRecord(input.metadata)
    }
  };
}

function metadataRecord(meta: AdminReviewSignalInput["metadata"]): Record<string, unknown> {
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    return meta as Record<string, unknown>;
  }
  return {};
}
