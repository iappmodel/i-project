import type { ActionApiRequestPayload } from "@/types/alphabet/action-api.types";
import type { RuntimeExecutionDraft } from "@/types/alphabet/runtime.types";

export function mapIntentToExecutionTarget(intentType?: string | null): {
  targetSystem: string;
  action: string;
  handlerName: string;
} {
  switch (intentType) {
    case "withdraw":
      return {
        targetSystem: "withdrawal",
        action: "withdraw",
        handlerName: "withdrawal.create"
      };
    case "convert":
      return {
        targetSystem: "conversion",
        action: "convert",
        handlerName: "conversion.create"
      };
    case "tip":
      return {
        targetSystem: "wallet",
        action: "debit",
        handlerName: "wallet.debit"
      };
    case "earn_reward":
    case "issue_reward":
    case "verify_presence":
      return {
        targetSystem: "wallet",
        action: "credit",
        handlerName: "wallet.credit"
      };
    case "launch_campaign":
      return {
        targetSystem: "campaign",
        action: "reserve",
        handlerName: "campaign.reserve"
      };
    case "notification_delivery":
      return {
        targetSystem: "notification",
        action: "notify",
        handlerName: "notification.send"
      };
    default:
      return {
        targetSystem: "system",
        action: "noop",
        handlerName: "system.noop"
      };
  }
}

export function buildExecutionDraftFromPayload(params: {
  payload: ActionApiRequestPayload;
  userId: string;
  policyDecisionId?: string | null;
  sourceEventIds: string[];
}): RuntimeExecutionDraft {
  const route = mapIntentToExecutionTarget(params.payload.intentType);

  const targetObjectId =
    params.payload.walletId ??
    params.payload.contentId ??
    params.payload.campaignId ??
    params.payload.grantEligibilityId ??
    null;

  const payload = {
    userId: params.userId,
    walletId: params.payload.walletId ?? null,
    contentId: params.payload.contentId ?? null,
    campaignId: params.payload.campaignId ?? null,
    grantEligibilityId: params.payload.grantEligibilityId ?? null,
    amount: params.payload.amount ?? null,
    coinCode: params.payload.coinCode ?? null,
    reasonCode: `runtime:${params.payload.intentType ?? "unknown"}`
  };

  return {
    sourcePolicyDecisionId: params.policyDecisionId ?? null,
    sourceEventIds: params.sourceEventIds,
    targetSystem: route.targetSystem,
    targetObjectId,
    action: route.action,
    priority:
      params.payload.intentType === "withdraw" ||
      params.payload.intentType === "issue_grant"
        ? "high"
        : "normal",
    idempotencyKey: params.payload.idempotencyKey ?? null,
    dedupeKey: params.payload.dedupeKey ?? null,
    handlerName: route.handlerName,
    handlerVersion: "v1",
    payload,
    sanitizedPayload: payload,
    metadata: {
      intentType: params.payload.intentType ?? null
    }
  };
}
