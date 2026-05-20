import type { ContentRightsResult } from "../../types/alphabet/content-rights.types";
import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromContentRights(
  result: ContentRightsResult
): TrustImpactEvent | null {
  if (result.status === "rights_verified" && result.monetizationApproved) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "content_rights_verified_clean",
      category: "reputation",
      severity: "positive_medium",
      sourceEventId:
        result.contentMonetizationApprovedEvent?.eventId ??
        result.contentOriginalityVerifiedEvent?.eventId ??
        null,
      confidence: result.rightsConfidenceScore,
      metadata: {
        contentRightsId: result.contentRightsId,
        contentId: result.contentId,
        creatorId: result.creatorId,
        rightsClaimType: result.rightsClaimType,
        monetizationEligibilityScore: result.monetizationEligibilityScore
      }
    });
  }

  if (
    result.status === "rights_blocked" ||
    result.status === "rights_rejected" ||
    result.contentCopyrightRiskDetectedEvent
  ) {
    return createTrustImpactEvent({
      userId: result.userId,
      eventType: "content_rights_risk_detected",
      category: "reputation",
      severity:
        result.status === "rights_blocked" ? "negative_large" : "negative_medium",
      sourceEventId:
        result.contentCopyrightRiskDetectedEvent?.eventId ??
        result.contentRightsRejectedEvent?.eventId ??
        result.contentRightsCreatedEvent.eventId,
      confidence: 0.8,
      metadata: {
        contentRightsId: result.contentRightsId,
        contentId: result.contentId,
        creatorId: result.creatorId,
        status: result.status,
        reasons: result.reasons,
        copyrightRisk: result.copyrightRisk,
        plagiarismRisk: result.plagiarismRisk
      }
    });
  }

  return null;
}

export function createUValueEventFromContentRights(
  result: ContentRightsResult
): UValueImpactEvent | null {
  if (result.status === "rights_verified" && result.monetizationApproved) {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "content_monetization_approved",
      category: "creation",
      severity: "positive_medium",
      coinCode: "O",
      sourceEventId: result.contentMonetizationApprovedEvent?.eventId ?? null,
      confidence: result.monetizationEligibilityScore,
      metadata: {
        contentRightsId: result.contentRightsId,
        contentId: result.contentId,
        creatorId: result.creatorId,
        payoutQualityMultiplier: result.payoutQualityMultiplier
      }
    });
  }

  if (result.monetizationBlocked || result.status === "rights_blocked") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "content_monetization_blocked",
      category: "creation",
      severity:
        result.status === "rights_blocked" ? "negative_large" : "negative_medium",
      coinCode: "O",
      sourceEventId:
        result.contentMonetizationBlockedEvent?.eventId ??
        result.contentRightsRejectedEvent?.eventId ??
        null,
      confidence: 0.8,
      metadata: {
        contentRightsId: result.contentRightsId,
        contentId: result.contentId,
        creatorId: result.creatorId,
        status: result.status,
        reasons: result.reasons
      }
    });
  }

  if (result.status === "rights_disputed") {
    return createUValueImpactEvent({
      userId: result.userId,
      eventType: "content_rights_disputed",
      category: "creation",
      severity: "negative_small",
      coinCode: "O",
      sourceEventId: result.contentRightsDisputedEvent?.eventId ?? null,
      confidence: 0.65,
      metadata: {
        contentRightsId: result.contentRightsId,
        contentId: result.contentId,
        reasons: result.reasons
      }
    });
  }

  return null;
}
