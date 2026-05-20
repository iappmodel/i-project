import { HELP_RULES } from "../../data/alphabet/help-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  HelpRuleSet,
  HelpSignalInput,
  HelpVerificationResult,
  HelpVerificationStatus
} from "../../types/alphabet/help.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: HelpSignalInput): HelpRuleSet | undefined {
  return HELP_RULES.find((rule) => rule.active && rule.context === input.context);
}

function isUnder13(ageBand: string): boolean {
  return ageBand === "under_13";
}

function isTeen(ageBand: string): boolean {
  return ageBand === "13_15" || ageBand === "16_17";
}

function calculateOutcomeScore(input: HelpSignalInput): number {
  const recipientConfirmationMultiplier = input.recipientConfirmed ? 1 : 0.65;

  const score =
    clamp(input.recipientOutcomeScore) * 0.35 +
    clamp(input.independentOutcomeEvidenceScore) * 0.3 +
    clamp(input.systemValidationScore) * 0.2 +
    clamp(input.communityValidationScore) * 0.15;

  return clamp(score * recipientConfirmationMultiplier);
}

function calculateHelpScore(input: HelpSignalInput): number {
  const durationScore = clamp(input.durationMs / (30 * 60 * 1000));
  const outcomeScore = calculateOutcomeScore(input);

  const score =
    clamp(input.recipientUsefulnessScore) * 0.22 +
    outcomeScore * 0.22 +
    clamp(input.helperEffortScore) * 0.16 +
    clamp(input.kindnessScore) * 0.12 +
    clamp(input.clarityScore) * 0.1 +
    clamp(input.followThroughScore) * 0.1 +
    durationScore * 0.05 +
    clamp(input.repeatHelpScore) * 0.03;

  return clamp(score);
}

function calculateNobilityScore(input: HelpSignalInput): number {
  const helpScore = calculateHelpScore(input);
  const outcomeScore = calculateOutcomeScore(input);

  const vulnerabilityWeight = clamp(input.vulnerabilityLevel);
  const sensitivityWeight = clamp(input.sensitivityLevel);

  const evidenceStrength =
    clamp(input.independentOutcomeEvidenceScore) * 0.45 +
    clamp(input.systemValidationScore) * 0.35 +
    clamp(input.communityValidationScore) * 0.2;

  const score =
    helpScore * 0.25 +
    outcomeScore * 0.25 +
    clamp(input.kindnessScore) * 0.12 +
    clamp(input.followThroughScore) * 0.1 +
    clamp(input.impactScore) * 0.15 +
    evidenceStrength * 0.08 +
    vulnerabilityWeight * 0.03 +
    sensitivityWeight * 0.02;

  return clamp(score);
}

function calculateRiskScore(input: HelpSignalInput): number {
  let risk =
    clamp(input.collusionRisk) * 0.28 +
    clamp(input.fakeRecipientRisk) * 0.25 +
    clamp(input.manipulationRisk) * 0.18 +
    clamp(input.harassmentRisk) * 0.14 +
    clamp(input.paymentCoercionRisk) * 0.1 +
    (input.deviceIntegrityScore < 0.5 ? 0.05 : 0);

  if (input.helperUserId === input.recipientUserId) {
    risk += 0.25;
  }

  if (!input.recipientConfirmed && input.independentOutcomeEvidenceScore < 0.6) {
    risk += 0.1;
  }

  return clamp(risk);
}

function decideHelpStatus(params: {
  input: HelpSignalInput;
  rule: HelpRuleSet;
  helpScore: number;
  outcomeScore: number;
  nobilityScore: number;
  riskScore: number;
  reasons: string[];
}): HelpVerificationStatus {
  const { input, rule, helpScore, outcomeScore, nobilityScore, riskScore, reasons } = params;

  if (input.helperUserId === input.recipientUserId) {
    reasons.push("helper_and_recipient_same_user");
    return "rejected";
  }

  if (isUnder13(input.helperAgeBand) && !rule.allowsUnder13Helper) {
    reasons.push("under_13_helper_not_allowed_for_context");
    return "suspicious";
  }

  if (isUnder13(input.recipientAgeBand) && !rule.allowsUnder13Recipient) {
    reasons.push("under_13_recipient_not_allowed_for_context");
    return "suspicious";
  }

  if (isTeen(input.helperAgeBand) && !rule.allowsTeenHelper) {
    reasons.push("teen_helper_not_allowed_for_context");
    return "suspicious";
  }

  if (isTeen(input.recipientAgeBand) && !rule.allowsTeenRecipient) {
    reasons.push("teen_recipient_not_allowed_for_context");
    return "suspicious";
  }

  if (input.durationMs < rule.minDurationMs) {
    reasons.push("help_duration_below_minimum");
    return "useful_but_unverified";
  }

  if (rule.requiresRecipientConfirmation && !input.recipientConfirmed) {
    reasons.push("recipient_confirmation_required");
    return "needs_review";
  }

  if (
    rule.requiresReviewIfSensitive &&
    (input.vulnerabilityLevel >= 0.7 || input.sensitivityLevel >= 0.7)
  ) {
    reasons.push("sensitive_help_requires_review");
    return "needs_review";
  }

  if (input.collusionRisk > rule.maxCollusionRisk) {
    reasons.push("collusion_risk_above_maximum");
    return "suspicious";
  }

  if (input.fakeRecipientRisk > rule.maxFakeRecipientRisk) {
    reasons.push("fake_recipient_risk_above_maximum");
    return "suspicious";
  }

  if (input.harassmentRisk > rule.maxHarassmentRisk) {
    reasons.push("harassment_risk_above_maximum");
    return "suspicious";
  }

  if (riskScore > rule.maxRiskScore) {
    reasons.push("risk_score_above_maximum");
    return riskScore > 0.75 ? "suspicious" : "needs_review";
  }

  if (input.recipientUsefulnessScore < rule.minRecipientUsefulnessScore) {
    reasons.push("recipient_usefulness_below_minimum");
    return "useful_but_unverified";
  }

  if (input.recipientOutcomeScore < rule.minRecipientOutcomeScore) {
    reasons.push("recipient_outcome_below_minimum");
    return "useful_but_unverified";
  }

  if (input.helperEffortScore < rule.minHelperEffortScore) {
    reasons.push("helper_effort_below_minimum");
    return "useful_but_unverified";
  }

  if (outcomeScore < rule.minOutcomeScore) {
    reasons.push("outcome_score_below_minimum");
    return "useful_but_unverified";
  }

  if (helpScore < rule.minHelpScore) {
    reasons.push("help_score_below_minimum");
    return "useful_but_unverified";
  }

  const qualifiesForNobility =
    nobilityScore >= rule.minNobilityScore &&
    input.independentOutcomeEvidenceScore >= rule.minIndependentEvidenceForNobility &&
    input.impactScore >= 0.8 &&
    riskScore <= rule.maxRiskScore * 0.75;

  if (qualifiesForNobility) {
    reasons.push("noble_action_verified");
    return "noble_action_verified";
  }

  reasons.push("help_verified");
  return "help_verified";
}

function sourceContextFromHelpContext(
  context: HelpSignalInput["context"]
): AlphabetEvent["sourceContext"] {
  switch (context) {
    case "learning_help":
    case "mentorship_help":
      return "learning";
    case "creator_help":
      return "creator";
    case "marketplace_help":
      return "marketplace";
    case "community_help":
    case "emotional_support":
    case "accessibility_help":
    case "emergency_help":
    case "technical_help":
    case "general_help":
      return "system";
    default:
      return "system";
  }
}

function createHelpAlphabetEvent(params: {
  input: HelpSignalInput;
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
    userId: params.input.helperUserId,
    coinCode: params.coinCode,
    eventType: params.eventType,
    objectType: "help_session",
    objectId: params.input.helpSessionId,
    sourceContext: sourceContextFromHelpContext(params.input.context),
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: params.input.helperAgeBand,
    verificationStatus: params.verificationStatus,
    metadata: {
      helpSessionId: params.input.helpSessionId,
      helperUserId: params.input.helperUserId,
      recipientUserId: params.input.recipientUserId,
      context: params.input.context,
      durationMs: params.input.durationMs,
      recipientConfirmed: params.input.recipientConfirmed,
      recipientUsefulnessScore: params.input.recipientUsefulnessScore,
      recipientOutcomeScore: params.input.recipientOutcomeScore,
      helperEffortScore: params.input.helperEffortScore,
      kindnessScore: params.input.kindnessScore,
      clarityScore: params.input.clarityScore,
      followThroughScore: params.input.followThroughScore,
      impactScore: params.input.impactScore,
      vulnerabilityLevel: params.input.vulnerabilityLevel,
      sensitivityLevel: params.input.sensitivityLevel,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function verifyHelpSession(input: HelpSignalInput): HelpVerificationResult {
  const reasons: string[] = [];
  const rule = findRule(input);

  const helpScore = calculateHelpScore(input);
  const outcomeScore = calculateOutcomeScore(input);
  const nobilityScore = calculateNobilityScore(input);
  const riskScore = calculateRiskScore(input);

  if (!rule) {
    reasons.push("no_active_help_rule");

    const helpCompletedEvent = createHelpAlphabetEvent({
      input,
      eventType: "help_session_completed",
      coinCode: "H",
      rawScore: helpScore,
      qualityScore: outcomeScore,
      riskScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      helpSessionId: input.helpSessionId,
      helperUserId: input.helperUserId,
      recipientUserId: input.recipientUserId,
      status: "suspicious",
      helpScore,
      outcomeScore,
      nobilityScore,
      riskScore,
      reasons,
      helpCompletedEvent,
      hCoinEvent: null,
      nCoinEvent: null,
      metadata: input.metadata ?? {}
    };
  }

  const status = decideHelpStatus({
    input,
    rule,
    helpScore,
    outcomeScore,
    nobilityScore,
    riskScore,
    reasons
  });

  const verificationStatus =
    status === "help_verified" ||
    status === "noble_action_verified" ||
    status === "useful_but_unverified"
      ? "verified"
      : "rejected";

  const helpCompletedEvent = createHelpAlphabetEvent({
    input,
    eventType: "help_session_completed",
    coinCode: "H",
    rawScore: helpScore,
    qualityScore: outcomeScore,
    riskScore,
    verificationStatus,
    metadata: {
      status,
      reasons
    }
  });

  const hCoinEvent =
    status === "help_verified" || status === "noble_action_verified"
      ? createHelpAlphabetEvent({
          input,
          eventType: "help_verified",
          coinCode: "H",
          rawScore: helpScore,
          qualityScore: outcomeScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            status,
            helpScore,
            outcomeScore,
            nobilityScore,
            reasons
          }
        })
      : null;

  const nCoinEvent =
    status === "noble_action_verified"
      ? createHelpAlphabetEvent({
          input,
          eventType: "noble_action_verified",
          coinCode: "N",
          rawScore: nobilityScore,
          qualityScore: outcomeScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            issueMode: "identity_update",
            status,
            helpScore,
            outcomeScore,
            nobilityScore,
            reasons
          }
        })
      : null;

  return {
    helpSessionId: input.helpSessionId,
    helperUserId: input.helperUserId,
    recipientUserId: input.recipientUserId,
    status,
    helpScore,
    outcomeScore,
    nobilityScore,
    riskScore,
    reasons,
    helpCompletedEvent,
    hCoinEvent,
    nCoinEvent,
    metadata: {
      ruleContext: rule.context,
      ...input.metadata
    }
  };
}
