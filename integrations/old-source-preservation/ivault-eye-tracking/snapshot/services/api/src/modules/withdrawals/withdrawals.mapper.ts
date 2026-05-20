import { toNullableString, toNumber, toStringValue } from "../../shared/map";
import type { WithdrawalSummaryDto } from "./withdrawals.dto";

export function mapWithdrawalSummaryRow(row: any): WithdrawalSummaryDto {
  return {
    withdrawalRequestId: toStringValue(row.withdrawal_request_id),
    userId: toStringValue(row.user_id),
    walletId: toStringValue(row.wallet_id),

    currencyCode: row.currency_code,

    requestedAmountMinor: toNumber(row.requested_amount_minor),
    processorFeeMinor: toNumber(row.processor_fee_minor),
    netAmountMinor: toNumber(row.net_amount_minor),

    status: row.status,

    requestedAt: toStringValue(row.requested_at),
    approvedAt: toNullableString(row.approved_at),
    reservedAt: toNullableString(row.reserved_at),
    submittedAt: toNullableString(row.submitted_at),
    paidAt: toNullableString(row.paid_at),
    failedAt: toNullableString(row.failed_at),
    cancelledAt: toNullableString(row.cancelled_at),

    visibleStatusReason: toNullableString(row.visible_status_reason),

    createdAt: toStringValue(row.created_at),
    updatedAt: toStringValue(row.updated_at)
  };
}
