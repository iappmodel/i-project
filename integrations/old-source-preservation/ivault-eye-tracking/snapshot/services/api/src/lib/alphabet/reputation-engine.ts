import { REPUTATION_RULES } from "../../data/alphabet/reputation-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  IdentityProofLevel,
  ReputationSignalInput,
  ReputationVerificationResult,
  ReputationVerificationStatus
} from "../../types/alphabet/reputation.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function isUnder13(ageBand: string): boolean {
  return ageBand === "under_13";
}

function isTeen(ageBand: string): boolean {
  return ageBand === "13_15" || ageBand === "16_17";
}

function proofLevelScore(level: IdentityProofLevel): number {
  switch (level) {
    case "none":
      return 0;
    case "device_verified":
      return 0.2;
    case "email_verified":
      return 0.25;
    case "phone_verified":
      return 0.35;
    case "payment_verified":
      return 0.55;
    case "document_verified":
      return 0.75;
    case "institution_verified":
      return 0.8;
    case "guardian_verified":
      return 0.65;
    case "business_verified":
      return 0.85;
    case "platform_verified":
      return 1;
    default:
      return 0;
  }
}

function calculateIdentityStrengthScore(input: ReputationSignalInput): number {
  const accountAgeScore = clamp(input.accountAgeDays / 365);
  const proofScore = proofLevelScore(input.identityProofLevel);

  const score =
    proofScore * 0.35 +
    accountAgeScore * 0.15 +
    clamp(input.accountIntegrityScore) * 0.2 +
    clamp(input.walletIntegrityScore) * 0.15 +
    clamp(input.deviceIntegrityScore) * 0.15;

  return clamp(score);
}

function calculateReputationScore(input: ReputationSignalInput): number {
  const verifiedHistoryScore = clamp(input.verifiedEventCount / 250);
  const negativePenalty = clamp(input.negativeEventCount / 50) * 0.25;
  const severePenalty = clamp(input.severeNegativeEventCount / 10) * 0.45;

  const domainScore =
    clamp(input.contributionScore) * 0.12 +
    clamp(input.creatorReputationScore) * 0.1 +
    clamp(input.workerReputationScore) * 0.1 +
    clamp(input.helperReputationScore) * 0.12 +
    clamp(input.safetyReputationScore) * 0.12 +
    clamp(input.judgmentReputationScore) * 0.1 +
    clamp(input.learningReputationScore) * 0.1 +
    clamp(input.masteryReputationScore) * 0.12 +
    clamp(input.exchangeReliabilityScore) * 0.12;

  const trustScore = clamp(input.trustScore / 100);
  const uValueScore = clamp(input.uValueScore / 100);

  const score =
    domainScore * 0.45 +
    trustScore * 0.2 +
    uValueScore * 0.15 +
    verifiedHistoryScore * 0.2 -
    negativePenalty -
    severePenalty;

  return clamp(score);
}

function calculateRiskScore(input: ReputationSignalInput): number {
  let risk =
    clamp(input.impersonationRisk) * 0.28 +
    clamp(input.syntheticIdentityRisk) * 0.28 +
    clamp(input.reputationFarmingRisk) * 0.22 +
    clamp(input.banEvasionRisk) * 0.17 +
    (input.deviceIntegrityScore < 0.45 ? 0.05 : 0);

  if (input.severeNegativeEventCount > 0) {
    risk += clamp(input.severeNegativeEventCount / 10) * 0.1;
  }

  if (input.verifiedEventCount < 3 && input.uValueScore > 70) {
    risk += 0.05;
  }

  return clamp(risk);
}

function calculateCredibilityScore(input: ReputationSignalInput): number {
  const identityStrengthScore = calculateIdentityStrengthScore(input);
  const reputationScore = calculateReputationScore(input);
  const riskScore = calculateRiskScore(input);

  const score =
    identityStrengthScore * 0.3 +
    reputationScore * 0.45 +
    clamp(input.trustScore / 100) * 0.15 +
    clamp(input.exchangeReliabilityScore) * 0.1;

  return clamp(score * (1 - riskScore * 0.55));
}

function decideReputationStatus(params: {
  input: ReputationSignalInput;
  identityStrengthScore: number;
  reputationScore: number;
  credibilityScore: number;
  riskScore: number;
  reasons: string[];
}): ReputationVerificationStatus {
  const { input, identityStrengthScore, reputationScore, credibilityScore, riskScore, reasons } =
    params;

  const rule = REPUTATION_RULES;

  if (!rule.active) {
    reasons.push("reputation_rules_inactive");
    return "needs_review";
  }

  if (isUnder13(input.ageBand) && !rule.under13Allowed) {
    reasons.push("under_13_not_allowed_for_reputation");
    return "needs_review";
  }

  if (isTeen(input.ageBand) && !rule.teenAllowed) {
    reasons.push("teen_not_allowed_for_reputation");
    return "needs_review";
  }

  if (
    isUnder13(input.ageBand) &&
    rule.requiresGuardianForUnder13 &&
    input.identityProofLevel !== "guardian_verified" &&
    !input.metadata?.guardianApproved
  ) {
    reasons.push("under_13_guardian_required");
    return "needs_review";
  }

  if (input.banEvasionRisk > rule.maxBanEvasionRisk) {
    reasons.push("ban_evasion_risk_above_maximum");
    return "restricted";
  }

  if (input.impersonationRisk > rule.maxImpersonationRisk) {
    reasons.push("impersonation_risk_above_maximum");
    return "suspicious";
  }

  if (input.syntheticIdentityRisk > rule.maxSyntheticIdentityRisk) {
    reasons.push("synthetic_identity_risk_above_maximum");
    return "suspicious";
  }

  if (input.reputationFarmingRisk > rule.maxReputationFarmingRisk) {
    reasons.push("reputation_farming_risk_above_maximum");
    return "suspicious";
  }

  if (riskScore > rule.maxRiskScore) {
    reasons.push("risk_score_above_maximum");
    return riskScore > 0.75 ? "restricted" : "suspicious";
  }

  if (input.accountAgeDays < rule.minAccountAgeDays) {
    reasons.push("account_age_below_minimum");
    return "emerging_profile";
  }

  if (input.verifiedEventCount < rule.minVerifiedEventCount) {
    reasons.push("verified_event_count_below_minimum");
    return "emerging_profile";
  }

  if (input.trustScore < rule.minTrustScore) {
    reasons.push("trust_score_below_minimum");
    return "needs_review";
  }

  if (input.uValueScore < rule.minUValueScore) {
    reasons.push("u_value_below_minimum");
    return "emerging_profile";
  }

  if (identityStrengthScore < rule.minIdentityStrengthScore) {
    reasons.push("identity_strength_below_minimum");
    return "credible_profile";
  }

  if (reputationScore < rule.minReputationScore) {
    reasons.push("reputation_score_below_minimum");
    return "credible_profile";
  }

  if (credibilityScore < rule.minCredibilityScore) {
    reasons.push("credibility_score_below_minimum");
    return "credible_profile";
  }

  if (identityStrengthScore >= 0.75 && reputationScore >= 0.6 && credibilityScore >= 0.7) {
    reasons.push("reputation_verified");
    return "reputation_verified";
  }

  reasons.push("identity_strengthened");
  return "identity_strengthened";
}

function createReputationAlphabetEvent(params: {
  input: ReputationSignalInput;
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
    userId: params.input.userId,
    coinCode: params.coinCode,
    eventType: params.eventType,
    objectType: "reputation_profile",
    objectId: params.input.reputationProfileId,
    sourceContext: "system",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: params.input.trustScore,
    riskScore: params.riskScore,
    ageBand: params.input.ageBand,
    verificationStatus: params.verificationStatus,
    metadata: {
      reputationProfileId: params.input.reputationProfileId,
      identityProofLevel: params.input.identityProofLevel,
      accountAgeDays: params.input.accountAgeDays,
      trustScore: params.input.trustScore,
      uValueScore: params.input.uValueScore,
      verifiedEventCount: params.input.verifiedEventCount,
      negativeEventCount: params.input.negativeEventCount,
      severeNegativeEventCount: params.input.severeNegativeEventCount,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function verifyReputationProfile(
  input: ReputationSignalInput
): ReputationVerificationResult {
  const reasons: string[] = [];

  const identityStrengthScore = calculateIdentityStrengthScore(input);
  const reputationScore = calculateReputationScore(input);
  const credibilityScore = calculateCredibilityScore(input);
  const riskScore = calculateRiskScore(input);

  const status = decideReputationStatus({
    input,
    identityStrengthScore,
    reputationScore,
    credibilityScore,
    riskScore,
    reasons
  });

  const profileCredibilityUpdatedEvent = createReputationAlphabetEvent({
    input,
    eventType: "profile_credibility_updated",
    coinCode: "R",
    rawScore: credibilityScore,
    qualityScore: reputationScore,
    riskScore,
    verificationStatus:
      status === "suspicious" || status === "restricted" ? "rejected" : "verified",
    metadata: {
      status,
      identityStrengthScore,
      reputationScore,
      credibilityScore,
      reasons
    }
  });

  const reputationVerifiedEvent =
    status === "reputation_verified"
      ? createReputationAlphabetEvent({
          input,
          eventType: "reputation_verified",
          coinCode: "R",
          rawScore: reputationScore,
          qualityScore: credibilityScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            issueMode: "score_update",
            status,
            identityStrengthScore,
            reputationScore,
            credibilityScore,
            reasons
          }
        })
      : null;

  const identityStrengthenedEvent =
    status === "identity_strengthened" || status === "reputation_verified"
      ? createReputationAlphabetEvent({
          input,
          eventType: "identity_strengthened",
          coinCode: "I",
          rawScore: identityStrengthScore,
          qualityScore: credibilityScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            issueMode: "identity_update",
            status,
            identityStrengthScore,
            reputationScore,
            credibilityScore,
            reasons
          }
        })
      : null;

  const impersonationRiskEvent =
    status === "suspicious" && reasons.includes("impersonation_risk_above_maximum")
      ? createReputationAlphabetEvent({
          input,
          eventType: "impersonation_risk_detected",
          coinCode: "R",
          rawScore: 0,
          qualityScore: 0,
          riskScore,
          verificationStatus: "rejected",
          metadata: {
            status,
            reasons
          }
        })
      : null;

  const syntheticIdentityRiskEvent =
    status === "suspicious" && reasons.includes("synthetic_identity_risk_above_maximum")
      ? createReputationAlphabetEvent({
          input,
          eventType: "synthetic_identity_detected",
          coinCode: "R",
          rawScore: 0,
          qualityScore: 0,
          riskScore,
          verificationStatus: "rejected",
          metadata: {
            status,
            reasons
          }
        })
      : null;

  return {
    reputationProfileId: input.reputationProfileId,
    userId: input.userId,
    status,
    identityStrengthScore,
    reputationScore,
    credibilityScore,
    riskScore,
    reasons,
    identityStrengthenedEvent,
    reputationVerifiedEvent,
    profileCredibilityUpdatedEvent,
    impersonationRiskEvent,
    syntheticIdentityRiskEvent,
    metadata: input.metadata ?? {}
  };
}
