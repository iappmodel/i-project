import type {
  CampaignActionType,
  CampaignLifecycle,
  CampaignLifecycleResult,
  CampaignLifecycleSignalInput,
  CampaignLifecycleStatus,
  CampaignObjective,
  CampaignRewardType
} from "../../types/alphabet/campaign-lifecycle.types";
import type { CoinCode } from "../../types/alphabet/coin.types";
import { evaluateCampaignLifecycle } from "./campaign-lifecycle-engine";

type CampaignLifecycleStoreState = {
  campaigns: Map<string, CampaignLifecycle>;
  results: Map<string, CampaignLifecycleResult>;
};

const store: CampaignLifecycleStoreState = {
  campaigns: new Map(),
  results: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function mapDecisionStatus(status: CampaignLifecycleResult["status"]): CampaignLifecycleStatus {
  switch (status) {
    case "campaign_draft":
      return "draft";
    case "campaign_policy_pending":
      return "policy_pending";
    case "campaign_treasury_pending":
      return "treasury_pending";
    case "campaign_approved":
      return "approved";
    case "campaign_active":
      return "active";
    case "campaign_paused":
      return "paused";
    case "campaign_exhausted":
      return "exhausted";
    case "campaign_completed":
      return "completed";
    case "campaign_rejected":
      return "rejected";
    case "campaign_suspended":
      return "suspended";
    default:
      return "draft";
  }
}

export function createCampaignLifecycle(params: {
  campaignId?: string;
  businessId: string;
  ownerUserId: string;
  objective: CampaignObjective;
  rewardCoinCode: CoinCode;
  rewardType: CampaignRewardType;
  actionType: CampaignActionType;
  requestedBudget: number;
  rewardAmountPerAction: number;
  maxRewardPerUser: number;
  dailyRewardCap: number;
  totalParticipantCap: number;
  startsAt: string;
  endsAt: string;
}): CampaignLifecycle {
  const now = nowIso();

  const campaign: CampaignLifecycle = {
    campaignLifecycleId: createId("campaign_lifecycle"),
    campaignId: params.campaignId ?? createId("campaign"),
    businessId: params.businessId,
    ownerUserId: params.ownerUserId,
    objective: params.objective,
    status: "draft",
    rewardCoinCode: params.rewardCoinCode,
    rewardType: params.rewardType,
    actionType: params.actionType,
    requestedBudget: params.requestedBudget,
    approvedBudget: 0,
    reservedBudget: 0,
    spentBudget: 0,
    remainingBudget: 0,
    refundedBudget: 0,
    rewardAmountPerAction: params.rewardAmountPerAction,
    maxRewardPerUser: params.maxRewardPerUser,
    dailyRewardCap: params.dailyRewardCap,
    totalParticipantCap: params.totalParticipantCap,
    participantCount: 0,
    authorizedRewardCount: 0,
    startsAt: params.startsAt,
    endsAt: params.endsAt,
    createdAt: now,
    updatedAt: now,
    activatedAt: null,
    completedAt: null
  };

  store.campaigns.set(campaign.campaignLifecycleId, campaign);

  return campaign;
}

export function getCampaignLifecycle(
  campaignLifecycleId: string
): CampaignLifecycle | null {
  return store.campaigns.get(campaignLifecycleId) ?? null;
}

export function approveCampaignBudget(params: {
  campaignLifecycleId: string;
  approvedBudget: number;
  reservedBudget: number;
}): CampaignLifecycle {
  const campaign = getCampaignLifecycle(params.campaignLifecycleId);

  if (!campaign) {
    throw new Error("Campaign lifecycle not found.");
  }

  const next: CampaignLifecycle = {
    ...campaign,
    approvedBudget: params.approvedBudget,
    reservedBudget: params.reservedBudget,
    remainingBudget: params.reservedBudget,
    status: "treasury_pending",
    updatedAt: nowIso()
  };

  store.campaigns.set(next.campaignLifecycleId, next);
  return next;
}

export function evaluateStoredCampaignLifecycle(
  input: Omit<
    CampaignLifecycleSignalInput,
    | "campaignLifecycleId"
    | "campaignId"
    | "businessId"
    | "ownerUserId"
    | "objective"
    | "currentStatus"
    | "rewardCoinCode"
    | "rewardType"
    | "actionType"
    | "requestedBudget"
    | "approvedBudget"
    | "reservedBudget"
    | "spentBudget"
    | "remainingBudget"
    | "refundedBudget"
    | "rewardAmountPerAction"
  > & {
    campaignLifecycleId: string;
  }
): CampaignLifecycleResult {
  const campaign = getCampaignLifecycle(input.campaignLifecycleId);

  if (!campaign) {
    throw new Error("Campaign lifecycle not found.");
  }

  const now = Date.now();

  const result = evaluateCampaignLifecycle({
    ...input,
    campaignLifecycleId: campaign.campaignLifecycleId,
    campaignId: campaign.campaignId,
    businessId: campaign.businessId,
    ownerUserId: campaign.ownerUserId,
    objective: campaign.objective,
    currentStatus: campaign.status,
    rewardCoinCode: campaign.rewardCoinCode,
    rewardType: campaign.rewardType,
    actionType: campaign.actionType,
    requestedBudget: campaign.requestedBudget,
    approvedBudget: campaign.approvedBudget,
    reservedBudget: campaign.reservedBudget,
    spentBudget: campaign.spentBudget,
    remainingBudget: campaign.remainingBudget,
    refundedBudget: campaign.refundedBudget,
    rewardAmountPerAction: campaign.rewardAmountPerAction,
    campaignStartReached: input.campaignStartReached ?? new Date(campaign.startsAt).getTime() <= now,
    campaignEndReached: input.campaignEndReached ?? new Date(campaign.endsAt).getTime() <= now,
    metadata: {
      ...input.metadata
    }
  });

  const nextSpent = result.budgetShouldDecrement
    ? Number((campaign.spentBudget + result.authorizedRewardAmount).toFixed(6))
    : campaign.spentBudget;

  const nextRemaining = result.budgetShouldDecrement
    ? Number(Math.max(0, campaign.remainingBudget - result.authorizedRewardAmount).toFixed(6))
    : campaign.remainingBudget;

  const nextRefunded = result.shouldRefund
    ? Number((campaign.refundedBudget + result.refundableBudget).toFixed(6))
    : campaign.refundedBudget;

  const next: CampaignLifecycle = {
    ...campaign,
    status: result.shouldRefund ? "refunded" : mapDecisionStatus(result.status),
    spentBudget: nextSpent,
    remainingBudget: result.shouldRefund ? 0 : nextRemaining,
    refundedBudget: nextRefunded,
    participantCount:
      result.rewardAuthorized && input.userRewardedAmountSoFar === 0
        ? campaign.participantCount + 1
        : campaign.participantCount,
    authorizedRewardCount: result.rewardAuthorized
      ? campaign.authorizedRewardCount + 1
      : campaign.authorizedRewardCount,
    activatedAt:
      result.status === "campaign_active" && !campaign.activatedAt
        ? nowIso()
        : campaign.activatedAt,
    completedAt:
      result.status === "campaign_completed" ||
      result.status === "campaign_exhausted" ||
      result.shouldRefund
        ? nowIso()
        : campaign.completedAt,
    updatedAt: nowIso()
  };

  store.campaigns.set(next.campaignLifecycleId, next);
  store.results.set(result.campaignLifecycleId, result);

  return result;
}

export function getCampaignLifecycleResult(
  campaignLifecycleId: string
): CampaignLifecycleResult | null {
  return store.results.get(campaignLifecycleId) ?? null;
}

export function listCampaignLifecyclesByBusiness(
  businessId: string
): CampaignLifecycle[] {
  return Array.from(store.campaigns.values()).filter(
    (campaign) => campaign.businessId === businessId
  );
}

export function resetCampaignLifecycleStoreForTests(): void {
  store.campaigns.clear();
  store.results.clear();
}
