import { toNullableString, toStringValue } from "../../shared/map";
import type { AttentionHistoryItemDto } from "./attention.dto";

export function mapAttentionHistoryRow(row: any): AttentionHistoryItemDto {
  return {
    attentionEventId: toStringValue(row.attention_event_id),
    attentionSessionId: toStringValue(row.attention_session_id),

    userId: toStringValue(row.user_id),
    walletId: toStringValue(row.wallet_id),

    campaignId: toNullableString(row.campaign_id),
    creativeId: toNullableString(row.creative_id),
    placementId: toNullableString(row.placement_id),

    userVisibleResult: row.user_visible_result,

    rewardEligible: Boolean(row.reward_eligible),
    rewardIssued: Boolean(row.reward_issued),
    rewardId: toNullableString(row.reward_id),

    occurredAt: toStringValue(row.occurred_at),
    createdAt: toStringValue(row.created_at)
  };
}
