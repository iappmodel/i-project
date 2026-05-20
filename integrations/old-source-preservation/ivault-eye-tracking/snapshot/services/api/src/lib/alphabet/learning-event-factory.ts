import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import type { LearningVerificationResult } from "../../types/alphabet/learning.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromLearningVerification(
  result: LearningVerificationResult
): TrustImpactEvent | null {
  if (result.status === "learned" || result.status === "knowledge_verified") {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "learning_verified_clean",
      category: "learning",
      severity: "positive_small",
      sourceEventId: result.learningEvent?.eventId ?? result.lessonCompletedEvent.eventId,
      confidence: 0.75,
      metadata: {
        learningSessionId: result.learningSessionId,
        learningScore: result.learningScore,
        knowledgeScore: result.knowledgeScore,
        qualityScore: result.qualityScore,
        riskScore: result.riskScore
      }
    });
  }

  if (result.status === "suspicious" || result.reasons.includes("risk_score_above_maximum")) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "quiz_cheating_detected",
      category: "learning",
      severity: "negative_medium",
      sourceEventId: result.lessonCompletedEvent.eventId,
      confidence: 0.65,
      metadata: {
        learningSessionId: result.learningSessionId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}

export function createUValueEventFromLearningVerification(
  result: LearningVerificationResult
): UValueImpactEvent | null {
  if (result.status === "knowledge_verified") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "knowledge_verified",
      category: "knowledge",
      severity: "positive_medium",
      coinCode: "K",
      sourceEventId: result.knowledgeEvent?.eventId ?? result.learningEvent?.eventId ?? null,
      confidence: 0.85,
      metadata: {
        learningSessionId: result.learningSessionId,
        learningScore: result.learningScore,
        knowledgeScore: result.knowledgeScore,
        qualityScore: result.qualityScore
      }
    });
  }

  if (result.status === "learned" || result.status === "partially_learned") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "learning_verified",
      category: "learning",
      severity: "positive_medium",
      coinCode: "L",
      sourceEventId: result.learningEvent?.eventId ?? result.lessonCompletedEvent.eventId,
      confidence: result.status === "learned" ? 0.8 : 0.55,
      metadata: {
        learningSessionId: result.learningSessionId,
        learningScore: result.learningScore,
        knowledgeScore: result.knowledgeScore,
        qualityScore: result.qualityScore
      }
    });
  }

  if (result.status === "suspicious" || result.reasons.includes("risk_score_above_maximum")) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "fraud_detected",
      category: "learning",
      severity: "negative_medium",
      coinCode: "L",
      sourceEventId: result.lessonCompletedEvent.eventId,
      confidence: 0.6,
      metadata: {
        learningSessionId: result.learningSessionId,
        reasons: result.reasons,
        riskScore: result.riskScore
      }
    });
  }

  return null;
}
