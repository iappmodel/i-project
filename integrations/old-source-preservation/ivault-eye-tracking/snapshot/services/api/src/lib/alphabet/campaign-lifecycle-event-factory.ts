import type { CampaignLifecycleResult } from "../../types/alphabet/campaign-lifecycle.types";
import type { TrustImpactEvent } from "../../types/alphabet/trust.types";
import type { UValueImpactEvent } from "../../types/alphabet/u-value.types";
import { createTrustImpactEvent } from "./trust-event-factory";
import { createUValueImpactEvent } from "./u-value-event-factory";

export function createTrustEventFromCampaignLifecycle(
  result: CampaignLifecycleResult
): TrustImpactEvent | null {
  if (result.status === "campaign_active" || result.status === "campaign_approved") {
    return createTrustImpactEvent({
      userId: result.ownerUserId,
      eventType: "campaign_lifecycle_clean",
      category: "reputation",
      severity: "positive_small",
      sourceEventId:
        result.campaignActivatedEvent?.eventId ??
        result.campaignApprovedEvent?.eventId ??
        null,
      confidence: 0.65,
      metadata: {
        campaignLifecycleId: result.campaignLifecycleId,
        campaignId: result.campaignId,
        businessId: result.businessId,
        status: result.status,
        campaignReadinessScore: result.campaignReadinessScore
      }
    });
  }

  if (result.campaignRiskDetectedEvent || result.status === "campaign_suspended") {
    return createTrustImpactEvent({
      userId: result.ownerUserId,
      eventType: "campaign_risk_detected",
      category: "reputation",
      severity:
        result.status === "campaign_suspended" ? "negative_large" : "negative_medium",
      sourceEventId:
        result.campaignRiskDetectedEvent?.eventId ??
        result.campaignRejectedEvent?.eventId ??
        null,
      confidence: 0.8,
      metadata: {
        campaignLifecycleId: result.campaignLifecycleId,
        campaignId: result.campaignId,
        businessId: result.businessId,
        status: result.status,
        reasons: result.reasons,
        campaignRiskScore: result.campaignRiskScore
      }
    });
  }

  return null;
}

export function createUValueEventFromCampaignLifecycle(
  result: CampaignLifecycleResult
): UValueImpactEvent | null {
  if (result.rewardAuthorized) {
    return createUValueImpactEvent({
      userId: result.ownerUserId,
      eventType: "campaign_reward_authorized",
      category: "economic",
      severity: "positive_small",
      coinCode: result.rewardCoinCode,
      sourceEventId: result.campaignRewardAuthorizedEvent?.eventId ?? null,
      confidence: 0.7,
      metadata: {
        campaignLifecycleId: result.campaignLifecycleId,
        campaignId: result.campaignId,
        authorizedRewardAmount: result.authorizedRewardAmount,
        remainingBudget: result.remainingBudget
      }
    });
  }

  if (result.status === "campaign_rejected" || result.status === "campaign_suspended") {
    return createUValueImpactEvent({
      userId: result.ownerUserId,
      eventType: "campaign_blocked_or_suspended",
      category: "economic",
      severity: "negative_medium",
      coinCode: result.rewardCoinCode,
      sourceEventId:
        result.campaignRejectedEvent?.eventId ??
        result.campaignRiskDetectedEvent?.eventId ??
        null,
      confidence: 0.75,
      metadata: {
        campaignLifecycleId: result.campaignLifecycleId,
        campaignId: result.campaignId,
        status: result.status,
        reasons: result.reasons
      }
    });
  }

  return null;
}
