import { APPEAL_ADMIN_REVIEW_RULES } from "../../data/alphabet/admin-appeal-review-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  AdminReviewResult,
  AppealAdminReviewRuleSet,
  AppealStatus,
  ReviewReason,
  ReviewerDecision,
  ReviewSignalInput
} from "../../types/alphabet/admin-appeal-review.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(reason: ReviewReason): AppealAdminReviewRuleSet | undefined {
  return APPEAL_ADMIN_REVIEW_RULES.find((rule) => rule.active && rule.reason === reason);
}

function isUnder13(ageBand: string): boolean {
  return ageBand === "under_13";
}

function isTeen(ageBand: string): boolean {
  return ageBand === "13_15" || ageBand === "16_17";
}

function calculateReviewRiskScore(input: ReviewSignalInput): number {
  let risk =
    clamp(input.manipulationRisk) * 0.25 +
    clamp(input.collusionRisk) * 0.2 +
    clamp(input.reviewerBiasRisk) * 0.2 +
    clamp(input.policyMismatchRisk) * 0.15 +
    clamp(input.appealAbuseRisk) * 0.1 +
    (1 - clamp(input.reviewQualityScore)) * 0.1;

  if (input.priority === "critical" && input.assignedReviewerId === null) {
    risk += 0.08;
  }

  if (input.systemErrorLikelihood > 0.7 && input.policyConfidenceScore < 0.5) {
    risk += 0.05;
  }

  return clamp(risk);
}

function calculateReviewConfidenceScore(input: ReviewSignalInput): number {
  const assignmentScore = input.assignedReviewerId ? 1 : 0.35;

  const score =
    clamp(input.evidenceStrengthScore) * 0.25 +
    clamp(input.policyConfidenceScore) * 0.25 +
    clamp(input.decisionConfidenceScore) * 0.25 +
    clamp(input.reviewerConsistencyScore) * 0.15 +
    assignmentScore * 0.1;

  return clamp(score);
}

function calculateAppealMeritScore(input: ReviewSignalInput): number {
  if (input.appealStatus === "none") return 0;

  const score =
    clamp(input.appealEvidenceStrengthScore) * 0.4 +
    clamp(input.appealUserCredibilityScore) * 0.25 +
    clamp(input.systemErrorLikelihood) * 0.2 +
    (1 - clamp(input.appealAbuseRisk)) * 0.15;

  return clamp(score);
}

function shouldEscalate(input: ReviewSignalInput, rule: AppealAdminReviewRuleSet): boolean {
  if (input.priority === "critical" && rule.requiresEscalationForCritical) return true;

  if (
    input.reason === "compliance_block" ||
    input.reason === "grant_review" ||
    input.reason === "age_restriction"
  ) {
    return true;
  }

  if (isUnder13(input.ageBand) && rule.under13RequiresSpecialistReview) return true;
  if (isTeen(input.ageBand) && rule.teenRequiresSpecialistReview) return true;

  return false;
}

function outputFlagsFromDecision(
  input: ReviewSignalInput,
  finalDecision: ReviewerDecision | null
) {
  const lockWallet =
    finalDecision === "restrict" ||
    (input.reason === "fraud_risk" && finalDecision === "uphold") ||
    (input.reason === "payment_risk" && finalDecision === "uphold");

  const lockWithdrawals =
    lockWallet ||
    input.reason === "compliance_block" ||
    input.reason === "payment_risk" ||
    input.reason === "fraud_risk";

  const lockCampaigns =
    lockWallet ||
    input.subjectType === "campaign" ||
    input.reason === "fraud_risk" ||
    input.reason === "identity_risk";

  const restrictUser = finalDecision === "restrict";
  const releaseHold =
    finalDecision === "reverse" ||
    finalDecision === "approve" ||
    finalDecision === "unrestrict";

  const reversePenalty = finalDecision === "reverse";
  const approvePayout = input.subjectType === "withdrawal" && finalDecision === "approve";

  const approveGrant =
    input.subjectType === "yield_grant" &&
    input.reason === "grant_review" &&
    finalDecision === "approve";

  return {
    lockWallet,
    lockWithdrawals,
    lockCampaigns,
    restrictUser,
    releaseHold,
    reversePenalty,
    approvePayout,
    approveGrant
  };
}

function decideAdminReviewStatus(params: {
  input: ReviewSignalInput;
  rule: AppealAdminReviewRuleSet;
  reviewRiskScore: number;
  reviewConfidenceScore: number;
  appealMeritScore: number;
  reasons: string[];
}): {
  status: AdminReviewResult["status"];
  appealStatus: AppealStatus;
  finalDecision: ReviewerDecision | null;
} {
  const { input, rule, reviewRiskScore, reviewConfidenceScore, appealMeritScore, reasons } =
    params;

  if (rule.requiresAssignment && !input.assignedReviewerId) {
    reasons.push("reviewer_assignment_required");
    return {
      status: "review_open",
      appealStatus: input.appealStatus,
      finalDecision: null
    };
  }

  if (shouldEscalate(input, rule) && input.reviewerDecision !== "escalate") {
    reasons.push("case_requires_escalation");
    return {
      status: "escalated",
      appealStatus: input.appealStatus,
      finalDecision: "escalate"
    };
  }

  if (input.manipulationRisk > rule.maxManipulationRisk) {
    reasons.push("manipulation_risk_above_maximum");
    return {
      status: "suspicious",
      appealStatus: input.appealStatus,
      finalDecision: "hold"
    };
  }

  if (input.collusionRisk > rule.maxCollusionRisk) {
    reasons.push("collusion_risk_above_maximum");
    return {
      status: "suspicious",
      appealStatus: input.appealStatus,
      finalDecision: "hold"
    };
  }

  if (input.reviewerBiasRisk > rule.maxReviewerBiasRisk) {
    reasons.push("reviewer_bias_risk_above_maximum");
    return {
      status: "escalated",
      appealStatus: input.appealStatus,
      finalDecision: "escalate"
    };
  }

  if (input.appealAbuseRisk > rule.maxAppealAbuseRisk) {
    reasons.push("appeal_abuse_risk_above_maximum");
    return {
      status: "suspicious",
      appealStatus: input.appealStatus,
      finalDecision: "hold"
    };
  }

  if (reviewRiskScore > rule.maxReviewRiskScore) {
    reasons.push("review_risk_score_above_maximum");
    return {
      status: reviewRiskScore > 0.75 ? "suspicious" : "escalated",
      appealStatus: input.appealStatus,
      finalDecision: "escalate"
    };
  }

  if (input.evidenceStrengthScore < rule.minEvidenceStrengthScore) {
    reasons.push("evidence_strength_below_minimum");
    return {
      status: "review_assigned",
      appealStatus: input.appealStatus,
      finalDecision: "require_more_info"
    };
  }

  if (input.reviewQualityScore < rule.minReviewQualityScore) {
    reasons.push("review_quality_below_minimum");
    return {
      status: "review_assigned",
      appealStatus: input.appealStatus,
      finalDecision: "require_more_info"
    };
  }

  if (input.policyConfidenceScore < rule.minPolicyConfidenceScore) {
    reasons.push("policy_confidence_below_minimum");
    return {
      status: "escalated",
      appealStatus: input.appealStatus,
      finalDecision: "escalate"
    };
  }

  if (reviewConfidenceScore < rule.minDecisionConfidenceScore) {
    reasons.push("review_confidence_below_minimum");
    return {
      status: "review_assigned",
      appealStatus: input.appealStatus,
      finalDecision: "require_more_info"
    };
  }

  if (input.appealStatus === "appeal_opened") {
    reasons.push("appeal_open");
    return {
      status: "appeal_open",
      appealStatus: "appeal_under_review",
      finalDecision: null
    };
  }

  if (input.appealStatus === "appeal_under_review") {
    if (appealMeritScore >= rule.minAppealMeritScore) {
      reasons.push("appeal_reversed");
      return {
        status: "appeal_decided",
        appealStatus: "appeal_reversed",
        finalDecision: "reverse"
      };
    }

    reasons.push("appeal_upheld");
    return {
      status: "appeal_decided",
      appealStatus: "appeal_upheld",
      finalDecision: "uphold"
    };
  }

  if (
    input.appealStatus === "appeal_reversed" ||
    input.appealStatus === "appeal_upheld" ||
    input.appealStatus === "appeal_rejected"
  ) {
    reasons.push("appeal_already_decided");
    return {
      status: "appeal_decided",
      appealStatus: input.appealStatus,
      finalDecision:
        input.appealStatus === "appeal_reversed"
          ? "reverse"
          : input.appealStatus === "appeal_upheld"
            ? "uphold"
            : "reject"
    };
  }

  if (!input.reviewerDecision) {
    reasons.push("reviewer_decision_missing");
    return {
      status: "review_assigned",
      appealStatus: input.appealStatus,
      finalDecision: null
    };
  }

  reasons.push("review_decision_recorded");
  return {
    status: "review_decided",
    appealStatus: input.appealStatus,
    finalDecision: input.reviewerDecision
  };
}

function createAdminReviewAlphabetEvent(params: {
  input: ReviewSignalInput;
  eventType: AlphabetEvent["eventType"];
  coinCode: AlphabetEvent["coinCode"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.userId ?? "system",
    coinCode: params.coinCode,
    eventType: params.eventType,
    objectType: "admin_review_case",
    objectId: params.input.reviewCaseId,
    sourceContext: "admin",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: params.input.ageBand,
    verificationStatus: params.verificationStatus,
    metadata: {
      reviewCaseId: params.input.reviewCaseId,
      subjectType: params.input.subjectType,
      subjectId: params.input.subjectId,
      userId: params.input.userId ?? null,
      walletId: params.input.walletId ?? null,
      reason: params.input.reason,
      priority: params.input.priority,
      assignedReviewerId: params.input.assignedReviewerId ?? null,
      reviewerDecision: params.input.reviewerDecision ?? null,
      appealStatus: params.input.appealStatus,
      ...params.metadata,
      ...reviewAppealMetadataRecord(params.input.metadata)
    },
    createdAt: new Date().toISOString()
  };
}

export function reviewAdminCase(input: ReviewSignalInput): AdminReviewResult {
  const reasons: string[] = [];
  const rule = findRule(input.reason);

  const reviewRiskScore = calculateReviewRiskScore(input);
  const reviewConfidenceScore = calculateReviewConfidenceScore(input);
  const appealMeritScore = calculateAppealMeritScore(input);

  if (!rule) {
    reasons.push("no_active_admin_review_rule");

    const reviewCaseCreatedEvent = createAdminReviewAlphabetEvent({
      input,
      eventType: "review_case_created",
      coinCode: "J",
      rawScore: reviewConfidenceScore,
      qualityScore: input.reviewQualityScore,
      riskScore: reviewRiskScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      reviewCaseId: input.reviewCaseId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      userId: input.userId ?? null,
      walletId: input.walletId ?? null,
      status: "suspicious",
      appealStatus: input.appealStatus,
      reviewRiskScore,
      reviewConfidenceScore,
      appealMeritScore,
      finalDecision: "hold",
      ...outputFlagsFromDecision(input, "hold"),
      reasons,
      reviewCaseCreatedEvent,
      reviewCaseAssignedEvent: null,
      reviewDecisionRecordedEvent: null,
      appealOpenedEvent: null,
      appealDecisionRecordedEvent: null,
      adminOverrideAppliedEvent: null,
      reviewAbuseDetectedEvent: null,
      metadata: input.metadata ?? {}
    };
  }

  const decision = decideAdminReviewStatus({
    input,
    rule,
    reviewRiskScore,
    reviewConfidenceScore,
    appealMeritScore,
    reasons
  });

  const flags = outputFlagsFromDecision(input, decision.finalDecision);

  const verificationStatus = decision.status === "suspicious" ? "rejected" : "verified";

  const reviewCaseCreatedEvent = createAdminReviewAlphabetEvent({
    input,
    eventType: "review_case_created",
    coinCode: "J",
    rawScore: reviewConfidenceScore,
    qualityScore: input.reviewQualityScore,
    riskScore: reviewRiskScore,
    verificationStatus,
    metadata: {
      status: decision.status,
      finalDecision: decision.finalDecision,
      reasons
    }
  });

  const reviewCaseAssignedEvent = input.assignedReviewerId
    ? createAdminReviewAlphabetEvent({
        input,
        eventType: "review_case_assigned",
        coinCode: "J",
        rawScore: reviewConfidenceScore,
        qualityScore: input.reviewerConsistencyScore,
        riskScore: reviewRiskScore,
        verificationStatus,
        metadata: {
          status: decision.status,
          reasons
        }
      })
    : null;

  const reviewDecisionRecordedEvent =
    decision.status === "review_decided" ||
    decision.status === "escalated" ||
    decision.status === "suspicious"
      ? createAdminReviewAlphabetEvent({
          input,
          eventType: "review_decision_recorded",
          coinCode: "J",
          rawScore: reviewConfidenceScore,
          qualityScore: input.reviewQualityScore,
          riskScore: reviewRiskScore,
          verificationStatus,
          metadata: {
            finalDecision: decision.finalDecision,
            flags,
            reasons
          }
        })
      : null;

  const appealOpenedEvent =
    input.appealStatus === "appeal_opened" || input.appealStatus === "appeal_under_review"
      ? createAdminReviewAlphabetEvent({
          input,
          eventType: "appeal_opened",
          coinCode: "J",
          rawScore: appealMeritScore,
          qualityScore: input.appealEvidenceStrengthScore,
          riskScore: reviewRiskScore,
          verificationStatus,
          metadata: {
            appealStatus: decision.appealStatus,
            reasons
          }
        })
      : null;

  const appealDecisionRecordedEvent =
    decision.status === "appeal_decided"
      ? createAdminReviewAlphabetEvent({
          input,
          eventType: "appeal_decision_recorded",
          coinCode: "J",
          rawScore: appealMeritScore,
          qualityScore: input.appealEvidenceStrengthScore,
          riskScore: reviewRiskScore,
          verificationStatus,
          metadata: {
            appealStatus: decision.appealStatus,
            finalDecision: decision.finalDecision,
            flags,
            reasons
          }
        })
      : null;

  const adminOverrideAppliedEvent =
    decision.finalDecision === "reverse" ||
    decision.finalDecision === "unrestrict" ||
    flags.releaseHold ||
    flags.approvePayout ||
    flags.approveGrant
      ? createAdminReviewAlphabetEvent({
          input,
          eventType: "admin_override_applied",
          coinCode: "J",
          rawScore: reviewConfidenceScore,
          qualityScore: input.reviewQualityScore,
          riskScore: reviewRiskScore,
          verificationStatus,
          metadata: {
            finalDecision: decision.finalDecision,
            flags,
            reasons
          }
        })
      : null;

  const reviewAbuseDetectedEvent =
    decision.status === "suspicious"
      ? createAdminReviewAlphabetEvent({
          input,
          eventType: "review_abuse_detected",
          coinCode: "J",
          rawScore: 0,
          qualityScore: 0,
          riskScore: reviewRiskScore,
          verificationStatus: "rejected",
          metadata: {
            finalDecision: decision.finalDecision,
            reasons
          }
        })
      : null;

  return {
    reviewCaseId: input.reviewCaseId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    userId: input.userId ?? null,
    walletId: input.walletId ?? null,
    status: decision.status,
    appealStatus: decision.appealStatus,
    reviewRiskScore,
    reviewConfidenceScore,
    appealMeritScore,
    finalDecision: decision.finalDecision,
    ...flags,
    reasons,
    reviewCaseCreatedEvent,
    reviewCaseAssignedEvent,
    reviewDecisionRecordedEvent,
    appealOpenedEvent,
    appealDecisionRecordedEvent,
    adminOverrideAppliedEvent,
    reviewAbuseDetectedEvent,
    metadata: {
      ruleReason: rule.reason,
      ...reviewAppealMetadataRecord(input.metadata)
    }
  };
}

function reviewAppealMetadataRecord(
  meta: ReviewSignalInput["metadata"]
): Record<string, unknown> {
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    return meta as Record<string, unknown>;
  }
  return {};
}
