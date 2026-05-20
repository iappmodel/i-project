import type {
  ActionApiAuthContext,
  ActionApiRequestPayload
} from "@/types/alphabet/action-api.types";
import type {
  ActionIntentContext,
  ActionIntentRiskSignals
} from "@/types/alphabet/action-intent.types";

export function buildIntentContextFromApi(params: {
  payload: ActionApiRequestPayload;
  authContext: ActionApiAuthContext;
}): ActionIntentContext {
  const { payload, authContext } = params;

  return {
    surface: (payload.surface as ActionIntentContext["surface"]) ?? "api",
    objectType: payload.objectType ?? null,
    objectId:
      payload.objectId ??
      payload.walletId ??
      payload.contentId ??
      payload.campaignId ??
      payload.grantEligibilityId ??
      null,

    amount: payload.amount ?? null,
    coinCode: payload.coinCode ?? null,

    regionCode: authContext.ipRegionCode ?? "US",
    ageBand: "unknown",

    trustScore: null,
    uValueScore: null,

    walletStatus: payload.walletId ? "unknown" : null,
    contentSafetyStatus: payload.contentId ? "unknown" : null,
    contentRightsStatus: payload.contentId ? "unknown" : null,
    campaignStatus: payload.campaignId ? "unknown" : null,
    treasuryStatus: null,

    metadata: payload.metadata ?? {}
  };
}

export function buildDefaultIntentRiskSignals(): ActionIntentRiskSignals {
  return {
    ageRisk: 0.05,
    safetyRisk: 0.03,
    rightsRisk: 0.03,
    fraudRisk: 0.04,
    paymentRisk: 0.04,
    privacyRisk: 0.03,
    complianceRisk: 0.03,
    duplicateRisk: 0.01
  };
}

export function getRuntimeUserId(params: {
  payload: ActionApiRequestPayload;
  authContext: ActionApiAuthContext;
}): string | null {
  return params.payload.userId ?? params.authContext.authenticatedUserId ?? null;
}

export function getRuntimeActorUserId(params: {
  payload: ActionApiRequestPayload;
  authContext: ActionApiAuthContext;
}): string | null {
  return params.payload.actorUserId ?? params.authContext.actorUserId ?? null;
}
