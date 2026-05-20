import { CREATION_RULES } from "../../data/alphabet/creation-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  CreationRuleSet,
  CreationSignalInput,
  CreationVerificationResult,
  CreationVerificationStatus
} from "../../types/alphabet/creation.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: CreationSignalInput): CreationRuleSet | undefined {
  return CREATION_RULES.find(
    (rule) => rule.active && rule.artifactType === input.artifactType
  );
}

function isUnder13(ageBand: string): boolean {
  return ageBand === "under_13";
}

function isTeen(ageBand: string): boolean {
  return ageBand === "13_15" || ageBand === "16_17";
}

function calculateFinalOriginalityScore(input: CreationSignalInput): number {
  const aiPenalty =
    input.aiAssisted && input.aiDisclosed
      ? 0.92
      : input.aiAssisted && !input.aiDisclosed
        ? 0.65
        : 1;

  const score =
    clamp(input.originalityScore) * 0.55 +
    clamp(input.remixScore) * 0.2 +
    clamp(input.rightsScore) * 0.15 +
    clamp(input.effortScore) * 0.1;

  return clamp(score * aiPenalty);
}

function calculateFinalQualityScore(input: CreationSignalInput): number {
  const score =
    clamp(input.qualityScore) * 0.35 +
    clamp(input.usefulnessScore) * 0.25 +
    clamp(input.effortScore) * 0.2 +
    clamp(input.audienceValueScore) * 0.15 +
    clamp(input.rightsScore) * 0.05;

  return clamp(score);
}

function calculateCreationScore(input: CreationSignalInput): number {
  const originality = calculateFinalOriginalityScore(input);
  const quality = calculateFinalQualityScore(input);

  const score =
    clamp(input.rightsScore) * 0.2 +
    originality * 0.25 +
    quality * 0.3 +
    clamp(input.usefulnessScore) * 0.1 +
    clamp(input.effortScore) * 0.1 +
    clamp(input.audienceValueScore) * 0.05;

  return clamp(score);
}

function calculateRiskScore(input: CreationSignalInput): number {
  let risk =
    clamp(input.plagiarismRisk) * 0.28 +
    clamp(input.copyrightRisk) * 0.25 +
    clamp(input.aiSpamRisk) * 0.2 +
    clamp(input.duplicateContentRisk) * 0.15 +
    clamp(input.manipulationRisk) * 0.08 +
    (input.deviceIntegrityScore < 0.5 ? 0.04 : 0);

  if (input.aiAssisted && !input.aiDisclosed) {
    risk += 0.08;
  }

  if (input.originalityScore < 0.25 && input.effortScore < 0.35) {
    risk += 0.08;
  }

  return clamp(risk);
}

function decideCreationStatus(params: {
  input: CreationSignalInput;
  rule: CreationRuleSet;
  creationScore: number;
  finalOriginalityScore: number;
  finalQualityScore: number;
  riskScore: number;
  reasons: string[];
}): CreationVerificationStatus {
  const {
    input,
    rule,
    creationScore,
    finalOriginalityScore,
    finalQualityScore,
    riskScore,
    reasons
  } = params;

  if (!input.artifactExists) {
    reasons.push("artifact_missing");
    return "rejected";
  }

  if (isUnder13(input.ageBand) && !rule.under13Allowed) {
    reasons.push("under_13_not_allowed_for_artifact_type");
    return "suspicious";
  }

  if (isTeen(input.ageBand) && !rule.teenAllowed) {
    reasons.push("teen_not_allowed_for_artifact_type");
    return "suspicious";
  }

  if (input.aiAssisted && !rule.allowAiAssisted) {
    reasons.push("ai_assisted_not_allowed");
    return "rejected";
  }

  if (input.aiAssisted && rule.requireAiDisclosure && !input.aiDisclosed) {
    reasons.push("ai_assistance_not_disclosed");
    return "needs_review";
  }

  if (input.rightsScore < rule.minRightsScore) {
    reasons.push("rights_score_below_minimum");
    return "needs_review";
  }

  if (input.plagiarismRisk > rule.maxPlagiarismRisk) {
    reasons.push("plagiarism_risk_above_maximum");
    return "suspicious";
  }

  if (input.copyrightRisk > rule.maxCopyrightRisk) {
    reasons.push("copyright_risk_above_maximum");
    return "suspicious";
  }

  if (input.aiSpamRisk > rule.maxAiSpamRisk) {
    reasons.push("ai_spam_risk_above_maximum");
    return "suspicious";
  }

  if (riskScore > rule.maxRiskScore) {
    reasons.push("risk_score_above_maximum");
    return riskScore > 0.75 ? "suspicious" : "needs_review";
  }

  if (finalOriginalityScore < rule.minOriginalityScore) {
    reasons.push("originality_score_below_minimum");
    return "creation_verified";
  }

  if (finalQualityScore < rule.minQualityScore) {
    reasons.push("quality_score_below_minimum");
    return "originality_verified";
  }

  if (input.usefulnessScore < rule.minUsefulnessScore) {
    reasons.push("usefulness_score_below_minimum");
    return "originality_verified";
  }

  if (input.effortScore < rule.minEffortScore) {
    reasons.push("effort_score_below_minimum");
    return "originality_verified";
  }

  if (creationScore < rule.minCreationScore) {
    reasons.push("creation_score_below_minimum");
    return "originality_verified";
  }

  reasons.push("quality_verified");
  return "quality_verified";
}

function sourceContextFromArtifactType(
  artifactType: CreationSignalInput["artifactType"]
): AlphabetEvent["sourceContext"] {
  switch (artifactType) {
    case "course":
      return "learning";
    case "tool":
    case "code":
      return "creator";
    default:
      return "creator";
  }
}

function createCreationAlphabetEvent(params: {
  input: CreationSignalInput;
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
    objectType: "creation_artifact",
    objectId: params.input.artifactId,
    sourceContext: sourceContextFromArtifactType(params.input.artifactType),
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: params.input.ageBand,
    verificationStatus: params.verificationStatus,
    metadata: {
      artifactId: params.input.artifactId,
      creatorId: params.input.creatorId,
      artifactType: params.input.artifactType,
      aiAssisted: params.input.aiAssisted,
      aiDisclosed: params.input.aiDisclosed,
      rightsScore: params.input.rightsScore,
      originalityScore: params.input.originalityScore,
      remixScore: params.input.remixScore,
      usefulnessScore: params.input.usefulnessScore,
      effortScore: params.input.effortScore,
      audienceValueScore: params.input.audienceValueScore,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function verifyCreationArtifact(
  input: CreationSignalInput
): CreationVerificationResult {
  const reasons: string[] = [];
  const rule = findRule(input);

  const finalOriginalityScore = calculateFinalOriginalityScore(input);
  const finalQualityScore = calculateFinalQualityScore(input);
  const creationScore = calculateCreationScore(input);
  const riskScore = calculateRiskScore(input);

  if (!rule) {
    reasons.push("no_active_creation_rule");

    const submittedEvent = createCreationAlphabetEvent({
      input,
      eventType: "creation_submitted",
      coinCode: "C",
      rawScore: creationScore,
      qualityScore: finalQualityScore,
      riskScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      artifactId: input.artifactId,
      userId: input.userId,
      creatorId: input.creatorId,
      status: "suspicious",
      creationScore,
      finalOriginalityScore,
      finalQualityScore,
      riskScore,
      reasons,
      submittedEvent,
      rightsCheckedEvent: null,
      originalityScoredEvent: null,
      qualityScoredEvent: null,
      cCoinEvent: null,
      oCoinEvent: null,
      qCoinEvent: null,
      metadata: input.metadata ?? {}
    };
  }

  const status = decideCreationStatus({
    input,
    rule,
    creationScore,
    finalOriginalityScore,
    finalQualityScore,
    riskScore,
    reasons
  });

  const verificationStatus =
    status === "creation_verified" ||
    status === "originality_verified" ||
    status === "quality_verified"
      ? "verified"
      : "rejected";

  const submittedEvent = createCreationAlphabetEvent({
    input,
    eventType: "creation_submitted",
    coinCode: "C",
    rawScore: creationScore,
    qualityScore: finalQualityScore,
    riskScore,
    verificationStatus,
    metadata: { reasons }
  });

  const rightsCheckedEvent = createCreationAlphabetEvent({
    input,
    eventType: "creation_rights_checked",
    coinCode: "C",
    rawScore: input.rightsScore,
    qualityScore: finalQualityScore,
    riskScore,
    verificationStatus,
    metadata: { reasons }
  });

  const originalityScoredEvent = createCreationAlphabetEvent({
    input,
    eventType: "creation_originality_scored",
    coinCode: "O",
    rawScore: finalOriginalityScore,
    qualityScore: finalQualityScore,
    riskScore,
    verificationStatus,
    metadata: { reasons }
  });

  const qualityScoredEvent = createCreationAlphabetEvent({
    input,
    eventType: "creation_quality_scored",
    coinCode: "Q",
    rawScore: finalQualityScore,
    qualityScore: finalQualityScore,
    riskScore,
    verificationStatus,
    metadata: { reasons }
  });

  const cCoinEvent =
    status === "creation_verified" ||
    status === "originality_verified" ||
    status === "quality_verified"
      ? createCreationAlphabetEvent({
          input,
          eventType: "ccoin_awarded",
          coinCode: "C",
          rawScore: creationScore,
          qualityScore: finalQualityScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            status,
            creationScore,
            finalOriginalityScore,
            finalQualityScore,
            reasons
          }
        })
      : null;

  const oCoinEvent =
    status === "originality_verified" || status === "quality_verified"
      ? createCreationAlphabetEvent({
          input,
          eventType: "ocoin_awarded",
          coinCode: "O",
          rawScore: finalOriginalityScore,
          qualityScore: finalQualityScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            status,
            creationScore,
            finalOriginalityScore,
            finalQualityScore,
            reasons
          }
        })
      : null;

  const qCoinEvent =
    status === "quality_verified"
      ? createCreationAlphabetEvent({
          input,
          eventType: "qcoin_adjusted",
          coinCode: "Q",
          rawScore: finalQualityScore,
          qualityScore: finalQualityScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            issueMode: "score_update",
            status,
            creationScore,
            finalOriginalityScore,
            finalQualityScore,
            reasons
          }
        })
      : null;

  return {
    artifactId: input.artifactId,
    userId: input.userId,
    creatorId: input.creatorId,
    status,
    creationScore,
    finalOriginalityScore,
    finalQualityScore,
    riskScore,
    reasons,
    submittedEvent,
    rightsCheckedEvent,
    originalityScoredEvent,
    qualityScoredEvent,
    cCoinEvent,
    oCoinEvent,
    qCoinEvent,
    metadata: {
      ruleArtifactType: rule.artifactType,
      ...input.metadata
    }
  };
}
