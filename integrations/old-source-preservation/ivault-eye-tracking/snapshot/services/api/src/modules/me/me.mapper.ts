import { toNumber, toStringValue } from "../../shared/map";
import type { UserHomeSnapshotDto } from "./me.dto";

export function mapUserHomeSnapshotRow(row: any): UserHomeSnapshotDto | null {
  if (!row) return null;

  return {
    userId: toStringValue(row.user_id),
    walletId: toStringValue(row.wallet_id),

    currencyCode: row.currency_code,

    availableBalanceMinor: toNumber(row.available_balance_minor),
    pendingBalanceMinor: toNumber(row.pending_balance_minor),
    lockedBalanceMinor: toNumber(row.locked_balance_minor),
    totalBalanceMinor: toNumber(row.total_balance_minor),

    walletStatus: toStringValue(row.wallet_status),

    completedRewardCount: toNumber(row.completed_reward_count),
    completedRewardAmountMinor: toNumber(row.completed_reward_amount_minor),

    attentionEventCount24h: toNumber(row.attention_event_count_24h),
    rewardEligibleAttentionCount24h: toNumber(row.reward_eligible_attention_count_24h),

    walletUpdatedAt: toStringValue(row.wallet_updated_at)
  };
}
