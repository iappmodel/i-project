import { toNullableString, toNumber, toStringValue } from "../../shared/map";
import type { RewardHistoryItemDto } from "./rewards.dto";

export function mapRewardHistoryRow(row: any): RewardHistoryItemDto {
  return {
    rewardId: toStringValue(row.reward_id),
    attentionEventId: toStringValue(row.attention_event_id),

    userId: toStringValue(row.user_id),
    walletId: toStringValue(row.wallet_id),

    campaignId: toNullableString(row.campaign_id),
    creativeId: toNullableString(row.creative_id),
    placementId: toNullableString(row.placement_id),

    currencyCode: row.currency_code,
    rewardAmountMinor: toNumber(row.reward_amount_minor),

    status: toStringValue(row.status),
    displayStatus: toStringValue(row.display_status),

    queuedAt: toStringValue(row.queued_at),
    completedAt: toNullableString(row.completed_at),
    failedAt: toNullableString(row.failed_at),

    createdAt: toStringValue(row.created_at),
    updatedAt: toStringValue(row.updated_at)
  };
}
