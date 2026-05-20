import { GRANT_RULES } from "../../data/alphabet/grant-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  GrantEvaluationResult,
  GrantFulfillmentInstruction,
  GrantOutcomeStatus,
  GrantRuleSet,
  GrantSignalInput
} from "../../types/alphabet/grant.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: GrantSignalInput): GrantRuleSet | undefined {
  return GRANT_RULES.find(
    (rule) => rule.active && rule.grantType === input.grantType
  );
}

function isMinor(input: GrantSignalInput): boolean {
  return (
    input.ageBand === "under_13" ||
    input.ageBand === "13_15" ||
    input.ageBand === "16_17"
  );
}

function calculateHumanValueScore(input: GrantSignalInput): number {
  return clamp(
    clamp(input.uValueScore / 100) * 0.18 +
      clamp(input.trustScore / 100) * 0.16 +
      clamp(input.contributionScore / 100) * 0.12 +
      clamp(input.learningScore / 100) * 0.1 +
      clamp(input.creationScore / 100) * 0.1 +
      clamp(input.helpScore / 100) * 0.1 +
      clamp(input.safetyScore / 100) * 0.1 +
      clamp(input.originalityScore / 100) * 0.08 +
      clamp(input.communityImpactScore / 100) * 0.08 +
      clamp(input.consistencyScore) * 0.08
  );
}

function calculateGrantRiskScore(input: GrantSignalInput): number {
  let risk =
    clamp(input.fraudRisk) * 0.28 +
    clamp(input.safetyRisk) * 0.2 +
    clamp(input.paymentRisk) * 0.18 +
    clamp(input.reputationRisk) * 0.14 +
    clamp(input.complianceRisk) * 0.2;

  if (!input.regionEligible) risk += 0.1;
  if (
    isMinor(input) &&
    input.guardianApprovalRequired &&
    !input.guardianApprovalReceived
  ) {
    risk += 0.08;
  }
  if (input.trustScore < 40) risk += 0.08;
  if (input.uValueScore < 10) risk += 0.04;

  return clamp(risk);
}

function calculateTreasuryReadinessScore(input: GrantSignalInput): number {
  const budgetCoverage =
    input.requestedGrantAmount <= 0
      ? 0
      : clamp(input.treasuryBudgetAvailable / input.requestedGrantAmount);

  const reserveScore =
    input.treasuryStatus === "reserved" || input.treasuryStatus === "funded"
      ? 1
      : input.treasuryReserveApproved
        ? 0.85
        : input.treasuryReserveRequested
          ? 0.45
          : 0.2;

  return clamp(budgetCoverage * 0.55 + reserveScore * 0.45);
}

function calculateBlessingRarityScore(input: GrantSignalInput): number {
  const humanValue = calculateHumanValueScore(input);

  return clamp(
    clamp(input.rarityScore) * 0.35 +
      humanValue * 0.3 +
      clamp(input.communityImpactScore / 100) * 0.12 +
      clamp(input.originalityScore / 100) * 0.1 +
      clamp(input.consistencyScore) * 0.08 +
      clamp(input.economicNeedScore / 100) * 0.05
  );
}

function calculateGrantEligibilityScore(input: GrantSignalInput): number {
  const humanValueScore = calculateHumanValueScore(input);
  const riskScore = calculateGrantRiskScore(input);
  const treasuryScore = calculateTreasuryReadinessScore(input);
  const blessingScore = calculateBlessingRarityScore(input);

  const reviewScore =
    input.reviewStatus === "approved"
      ? 1
      : input.reviewStatus === "pending" || input.reviewStatus === "required"
        ? 0.45
        : input.reviewStatus === "rejected"
          ? 0
          : 0.65;

  const auditScore =
    input.auditStatus === "complete"
      ? 1
      : input.auditStatus === "created" || input.auditStatus === "required"
        ? 0.55
        : input.auditStatus === "failed"
          ? 0
          : 0.65;

  return clamp(
    humanValueScore * 0.34 +
      (1 - riskScore) * 0.22 +
      treasuryScore * 0.18 +
      blessingScore * 0.14 +
      reviewScore * 0.06 +
      auditScore * 0.06
  );
}

function buildFulfillmentInstructions(
  input: GrantSignalInput,
  issueAuthorized: boolean
): GrantFulfillmentInstruction[] {
  if (!issueAuthorized) return [];

  const requiresGuardianApproval =
    isMinor(input) && input.guardianApprovalRequired;

  if (input.rewardCoinCode && input.walletId) {
    return [
      {
        fulfillmentType: "wallet_credit",
        targetUserId: input.userId,
        walletId: input.walletId,
        coinCode: input.rewardCoinCode,
        amount: input.requestedGrantAmount,
        description: input.secrecyMode
          ? "A platform grant has been issued."
          : input.realWorldRewardDescription ?? "Grant wallet credit.",
        requiresGuardianApproval,
        requiresManualFulfillment: false,
        metadata: {
          grantEligibilityId: input.grantEligibilityId,
          grantType: input.grantType,
          secrecyMode: input.secrecyMode
        }
      }
    ];
  }

  if (
    input.grantType === "scholarship" ||
    input.grantType === "education_grant"
  ) {
    return [
      {
        fulfillmentType: "scholarship_payment",
        targetUserId: input.userId,
        walletId: input.walletId ?? null,
        coinCode: input.rewardCoinCode ?? null,
        amount: input.requestedGrantAmount,
        description: input.secrecyMode
          ? "An education grant has been approved."
          : input.realWorldRewardDescription ?? "Education grant fulfillment.",
        requiresGuardianApproval,
        requiresManualFulfillment: true,
        metadata: {
          grantEligibilityId: input.grantEligibilityId,
          grantType: input.grantType
        }
      }
    ];
  }

  if (input.realWorldRewardDescription) {
    return [
      {
        fulfillmentType: "real_world_reward",
        targetUserId: input.userId,
        walletId: input.walletId ?? null,
        coinCode: input.rewardCoinCode ?? null,
        amount: input.requestedGrantAmount,
        description: input.secrecyMode
          ? "A rare reward has been approved."
          : input.realWorldRewardDescription,
        requiresGuardianApproval,
        requiresManualFulfillment: true,
        metadata: {
          grantEligibilityId: input.grantEligibilityId,
          grantType: input.grantType
        }
      }
    ];
  }

  return [
    {
      fulfillmentType: "cash_payout",
      targetUserId: input.userId,
      walletId: input.walletId ?? null,
      coinCode: input.rewardCoinCode ?? null,
      amount: input.requestedGrantAmount,
      description: input.secrecyMode
        ? "A platform grant has been approved."
        : "Cash grant fulfillment.",
      requiresGuardianApproval,
      requiresManualFulfillment: true,
      metadata: {
        grantEligibilityId: input.grantEligibilityId,
        grantType: input.grantType
      }
    }
  ];
}

function decideGrantStatus(params: {
  input: GrantSignalInput;
  rule: GrantRuleSet;
  grantEligibilityScore: number;
  humanValueScore: number;
  grantRiskScore: number;
  treasuryReadinessScore: number;
  blessingRarityScore: number;
  reasons: string[];
}): GrantOutcomeStatus {
  const {
    input,
    rule,
    grantEligibilityScore,
    humanValueScore,
    grantRiskScore,
    treasuryReadinessScore,
    blessingRarityScore,
    reasons
  } = params;

  if (input.cancelRequested) {
    reasons.push("grant_canceled");
    return "grant_canceled";
  }

  if (!input.regionEligible) {
    reasons.push("region_not_eligible");
    return "grant_ineligible";
  }

  if (isMinor(input) && !rule.allowMinors) {
    reasons.push("grant_not_available_to_minors");
    return "grant_ineligible";
  }

  if (
    isMinor(input) &&
    rule.requiresGuardianApprovalForMinors &&
    input.guardianApprovalRequired &&
    !input.guardianApprovalReceived
  ) {
    reasons.push("guardian_approval_required");
    return "grant_review_required";
  }

  if (input.requestedGrantAmount < rule.minGrantAmount) {
    reasons.push("grant_amount_below_minimum");
    return "grant_ineligible";
  }

  if (input.requestedGrantAmount > rule.maxGrantAmount) {
    reasons.push("grant_amount_above_maximum");
    return "grant_review_required";
  }

  if (input.uValueScore < rule.minUValueScore) {
    reasons.push("u_value_below_grant_minimum");
    return "grant_ineligible";
  }

  if (input.trustScore < rule.minTrustScore) {
    reasons.push("trust_score_below_grant_minimum");
    return "grant_ineligible";
  }

  if (input.contributionScore < rule.minContributionScore) {
    reasons.push("contribution_score_below_grant_minimum");
    return "grant_ineligible";
  }

  if (input.consistencyScore < rule.minConsistencyScore) {
    reasons.push("consistency_score_below_grant_minimum");
    return "grant_ineligible";
  }

  if (input.fraudRisk > rule.maxFraudRisk) {
    reasons.push("fraud_risk_above_grant_maximum");
    return "grant_rejected";
  }

  if (input.safetyRisk > rule.maxSafetyRisk) {
    reasons.push("safety_risk_above_grant_maximum");
    return "grant_rejected";
  }

  if (input.paymentRisk > rule.maxPaymentRisk) {
    reasons.push("payment_risk_above_grant_maximum");
    return "grant_review_required";
  }

  if (input.reputationRisk > rule.maxReputationRisk) {
    reasons.push("reputation_risk_above_grant_maximum");
    return "grant_review_required";
  }

  if (input.complianceRisk > rule.maxComplianceRisk) {
    reasons.push("compliance_risk_above_grant_maximum");
    return "grant_rejected";
  }

  if (humanValueScore < rule.minHumanValueScore) {
    reasons.push("human_value_score_below_minimum");
    return "grant_ineligible";
  }

  if (blessingRarityScore < rule.minBlessingRarityScore) {
    reasons.push("blessing_rarity_score_below_minimum");
    return "grant_ineligible";
  }

  if (grantRiskScore > 0.35) {
    reasons.push("grant_risk_score_requires_review");
    return grantRiskScore > 0.65 ? "grant_rejected" : "grant_review_required";
  }

  if (rule.requiresReview) {
    if (input.reviewStatus === "rejected") {
      reasons.push("grant_review_rejected");
      return "grant_rejected";
    }

    if (input.reviewStatus !== "approved") {
      reasons.push("grant_review_required");
      return "grant_review_required";
    }
  }

  if (rule.requiresAudit) {
    if (input.auditStatus === "failed") {
      reasons.push("grant_audit_failed");
      return "grant_rejected";
    }

    if (input.auditStatus !== "complete") {
      reasons.push("grant_audit_required");
      return "grant_review_required";
    }
  }

  if (rule.requiresAdminApproval && !input.adminApproved) {
    reasons.push("admin_approval_required");
    return "grant_review_required";
  }

  if (grantEligibilityScore < rule.minGrantEligibilityScore) {
    reasons.push("grant_eligibility_score_below_minimum");
    return "grant_ineligible";
  }

  if (rule.requiresTreasuryReserve) {
    if (input.treasuryStatus === "rejected") {
      reasons.push("treasury_rejected_grant");
      return "grant_rejected";
    }

    if (
      input.treasuryBudgetAvailable < input.requestedGrantAmount ||
      treasuryReadinessScore < rule.minTreasuryReadinessScore
    ) {
      reasons.push("treasury_budget_not_ready");
      return "grant_treasury_pending";
    }

    if (input.treasuryStatus === "reserved") {
      reasons.push("grant_treasury_reserved");
      return "grant_funded";
    }

    if (input.treasuryStatus === "funded") {
      if (input.issueRequested) {
        reasons.push("grant_issued");
        return "grant_issued";
      }
      reasons.push("grant_funded");
      return "grant_funded";
    }

    if (!input.treasuryReserveApproved) {
      reasons.push("treasury_reserve_required");
      return "grant_treasury_pending";
    }
  }

  if (input.issueRequested) {
    reasons.push("grant_issued");
    return "grant_issued";
  }

  if (input.completeRequested) {
    reasons.push("grant_completed");
    return "grant_issued";
  }

  reasons.push("grant_approved");
  return "grant_approved";
}

function createGrantAlphabetEvent(params: {
  input: GrantSignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.userId,
    coinCode: params.input.rewardCoinCode ?? "U",
    eventType: params.eventType,
    objectType: "grant",
    objectId: params.input.grantEligibilityId,
    sourceContext: "treasury",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: params.input.trustScore,
    riskScore: params.riskScore,
    ageBand: params.input.ageBand,
    verificationStatus: params.verificationStatus,
    metadata: {
      grantEligibilityId: params.input.grantEligibilityId,
      userId: params.input.userId,
      creatorId: params.input.creatorId ?? null,
      businessId: params.input.businessId ?? null,
      walletId: params.input.walletId ?? null,
      grantType: params.input.grantType,
      requestedGrantAmount: params.input.requestedGrantAmount,
      rewardCoinCode: params.input.rewardCoinCode ?? null,
      ageBand: params.input.ageBand,
      regionCode: params.input.regionCode ?? null,
      secrecyMode: params.input.secrecyMode,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function evaluateGrantEligibility(
  input: GrantSignalInput
): GrantEvaluationResult {
  const reasons: string[] = [];
  const rule = findRule(input);

  const humanValueScore = calculateHumanValueScore(input);
  const grantRiskScore = calculateGrantRiskScore(input);
  const treasuryReadinessScore = calculateTreasuryReadinessScore(input);
  const blessingRarityScore = calculateBlessingRarityScore(input);
  const grantEligibilityScore = calculateGrantEligibilityScore(input);

  if (!rule) {
    reasons.push("no_active_grant_rule");

    const grantEligibilityCreatedEvent = createGrantAlphabetEvent({
      input,
      eventType: "grant_eligibility_created",
      rawScore: grantEligibilityScore,
      qualityScore: humanValueScore,
      riskScore: grantRiskScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      grantEligibilityId: input.grantEligibilityId,
      userId: input.userId,
      creatorId: input.creatorId ?? null,
      businessId: input.businessId ?? null,
      walletId: input.walletId ?? null,
      grantType: input.grantType,
      status: "grant_rejected",
      grantAmount: input.requestedGrantAmount,
      rewardCoinCode: input.rewardCoinCode ?? null,
      realWorldRewardDescription: input.realWorldRewardDescription ?? null,
      grantEligibilityScore,
      humanValueScore,
      grantRiskScore,
      treasuryReadinessScore,
      blessingRarityScore,
      eligible: false,
      approved: false,
      treasuryReserveRequired: false,
      treasuryReserveAuthorized: false,
      reviewRequired: true,
      auditRequired: true,
      issueAuthorized: false,
      walletCreditAuthorized: false,
      realWorldFulfillmentRequired: false,
      guardianApprovalRequired: false,
      secrecyMode: false,
      fulfillmentInstructions: [],
      reasons,
      grantEligibilityCreatedEvent,
      grantEligibleEvent: null,
      grantIneligibleEvent: null,
      grantReviewRequiredEvent: grantEligibilityCreatedEvent,
      grantApprovedEvent: null,
      grantRejectedEvent: grantEligibilityCreatedEvent,
      grantTreasuryReservedEvent: null,
      grantFundedEvent: null,
      grantIssuedEvent: null,
      grantCompletedEvent: null,
      grantRiskDetectedEvent: grantEligibilityCreatedEvent,
      metadata: input.metadata ?? {}
    };
  }

  const status = decideGrantStatus({
    input,
    rule,
    grantEligibilityScore,
    humanValueScore,
    grantRiskScore,
    treasuryReadinessScore,
    blessingRarityScore,
    reasons
  });

  const eligible =
    status === "grant_eligible" ||
    status === "grant_approved" ||
    status === "grant_treasury_pending" ||
    status === "grant_funded" ||
    status === "grant_issued";

  const approved =
    status === "grant_approved" ||
    status === "grant_funded" ||
    status === "grant_issued";

  const treasuryReserveRequired =
    rule.requiresTreasuryReserve &&
    (status === "grant_approved" || status === "grant_treasury_pending");

  const treasuryReserveAuthorized =
    rule.requiresTreasuryReserve &&
    input.treasuryReserveApproved &&
    input.treasuryBudgetAvailable >= input.requestedGrantAmount;

  const reviewRequired =
    status === "grant_review_required" ||
    (rule.requiresReview && input.reviewStatus !== "approved");

  const auditRequired = rule.requiresAudit && input.auditStatus !== "complete";

  const issueAuthorized =
    status === "grant_issued" &&
    treasuryReserveAuthorized &&
    !reviewRequired &&
    !auditRequired;

  const walletCreditAuthorized =
    issueAuthorized && Boolean(input.walletId) && Boolean(input.rewardCoinCode);

  const realWorldFulfillmentRequired =
    issueAuthorized &&
    (!input.rewardCoinCode || Boolean(input.realWorldRewardDescription));

  const guardianApprovalRequired =
    isMinor(input) &&
    rule.requiresGuardianApprovalForMinors &&
    input.guardianApprovalRequired;

  const secrecyMode = input.secrecyMode && rule.allowsSecrecyMode;
  const fulfillmentInstructions = buildFulfillmentInstructions(
    input,
    issueAuthorized
  );

  const verificationStatus = approved || eligible ? "verified" : "rejected";

  const grantEligibilityCreatedEvent = createGrantAlphabetEvent({
    input,
    eventType: "grant_eligibility_created",
    rawScore: grantEligibilityScore,
    qualityScore: humanValueScore,
    riskScore: grantRiskScore,
    verificationStatus,
    metadata: { status, reasons }
  });

  const grantEligibleEvent = eligible
    ? createGrantAlphabetEvent({
        input,
        eventType: "grant_eligible",
        rawScore: grantEligibilityScore,
        qualityScore: humanValueScore,
        riskScore: grantRiskScore,
        verificationStatus: "verified",
        metadata: { status, reasons }
      })
    : null;

  const grantIneligibleEvent =
    status === "grant_ineligible"
      ? createGrantAlphabetEvent({
          input,
          eventType: "grant_ineligible",
          rawScore: grantEligibilityScore,
          qualityScore: humanValueScore,
          riskScore: grantRiskScore,
          verificationStatus: "rejected",
          metadata: { status, reasons }
        })
      : null;

  const grantReviewRequiredEvent = reviewRequired
    ? createGrantAlphabetEvent({
        input,
        eventType: "grant_review_required",
        rawScore: grantEligibilityScore,
        qualityScore: humanValueScore,
        riskScore: grantRiskScore,
        verificationStatus: "rejected",
        metadata: { status, reasons }
      })
    : null;

  const grantApprovedEvent = approved
    ? createGrantAlphabetEvent({
        input,
        eventType: "grant_approved",
        rawScore: input.requestedGrantAmount,
        qualityScore: grantEligibilityScore,
        riskScore: grantRiskScore,
        verificationStatus: "verified",
        metadata: { status, secrecyMode, reasons }
      })
    : null;

  const grantRejectedEvent =
    status === "grant_rejected"
      ? createGrantAlphabetEvent({
          input,
          eventType: "grant_rejected",
          rawScore: grantEligibilityScore,
          qualityScore: humanValueScore,
          riskScore: grantRiskScore,
          verificationStatus: "rejected",
          metadata: { status, reasons }
        })
      : null;

  const grantTreasuryReservedEvent = treasuryReserveAuthorized
    ? createGrantAlphabetEvent({
        input,
        eventType: "grant_treasury_reserved",
        rawScore: input.requestedGrantAmount,
        qualityScore: treasuryReadinessScore,
        riskScore: grantRiskScore,
        verificationStatus: "verified",
        metadata: { status, reasons }
      })
    : null;

  const grantFundedEvent =
    status === "grant_funded"
      ? createGrantAlphabetEvent({
          input,
          eventType: "grant_funded",
          rawScore: input.requestedGrantAmount,
          qualityScore: treasuryReadinessScore,
          riskScore: grantRiskScore,
          verificationStatus: "verified",
          metadata: { status, reasons }
        })
      : null;

  const grantIssuedEvent = issueAuthorized
    ? createGrantAlphabetEvent({
        input,
        eventType: "grant_issued",
        rawScore: input.requestedGrantAmount,
        qualityScore: grantEligibilityScore,
        riskScore: grantRiskScore,
        verificationStatus: "verified",
        metadata: { status, fulfillmentInstructions, secrecyMode, reasons }
      })
    : null;

  const grantCompletedEvent =
    input.completeRequested && issueAuthorized
      ? createGrantAlphabetEvent({
          input,
          eventType: "grant_completed",
          rawScore: input.requestedGrantAmount,
          qualityScore: grantEligibilityScore,
          riskScore: grantRiskScore,
          verificationStatus: "verified",
          metadata: { status, reasons }
        })
      : null;

  const grantRiskDetectedEvent =
    grantRiskScore > 0.35 || status === "grant_rejected"
      ? createGrantAlphabetEvent({
          input,
          eventType: "grant_risk_detected",
          rawScore: grantRiskScore,
          qualityScore: grantEligibilityScore,
          riskScore: grantRiskScore,
          verificationStatus: "rejected",
          metadata: { status, reasons }
        })
      : null;

  return {
    grantEligibilityId: input.grantEligibilityId,
    userId: input.userId,
    creatorId: input.creatorId ?? null,
    businessId: input.businessId ?? null,
    walletId: input.walletId ?? null,
    grantType: input.grantType,
    status,
    grantAmount: input.requestedGrantAmount,
    rewardCoinCode: input.rewardCoinCode ?? null,
    realWorldRewardDescription: input.realWorldRewardDescription ?? null,
    grantEligibilityScore,
    humanValueScore,
    grantRiskScore,
    treasuryReadinessScore,
    blessingRarityScore,
    eligible,
    approved,
    treasuryReserveRequired,
    treasuryReserveAuthorized,
    reviewRequired,
    auditRequired,
    issueAuthorized,
    walletCreditAuthorized,
    realWorldFulfillmentRequired,
    guardianApprovalRequired,
    secrecyMode,
    fulfillmentInstructions,
    reasons,
    grantEligibilityCreatedEvent,
    grantEligibleEvent,
    grantIneligibleEvent,
    grantReviewRequiredEvent,
    grantApprovedEvent,
    grantRejectedEvent,
    grantTreasuryReservedEvent,
    grantFundedEvent,
    grantIssuedEvent,
    grantCompletedEvent,
    grantRiskDetectedEvent,
    metadata: {
      ruleGrantType: rule.grantType,
      ...input.metadata
    }
  };
}
