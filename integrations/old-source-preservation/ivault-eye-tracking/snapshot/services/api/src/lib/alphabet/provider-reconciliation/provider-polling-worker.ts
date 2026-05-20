import { listPendingExternalTransfersForPollingDb } from "../db-repositories/provider-reconciliation.repository";
import { MockPayoutProvider } from "../external-transfer/mock-payout-provider";
import { reconcileProviderStatus } from "./provider-reconciliation-store";
import type { ExternalTransferProvider } from "@/types/alphabet/external-transfer.types";

function getProviderAdapter(provider: ExternalTransferProvider) {
  switch (provider) {
    case "mock":
      return new MockPayoutProvider();
    default:
      return new MockPayoutProvider();
  }
}

export async function runProviderPollingOnce(params: {
  provider?: ExternalTransferProvider | null;
  limit?: number;
}) {
  const transfers = await listPendingExternalTransfersForPollingDb({
    provider: params.provider ?? null,
    limit: params.limit ?? 25
  });

  const results: Awaited<ReturnType<typeof reconcileProviderStatus>>[] = [];

  for (let i = 0; i < transfers.length; i++) {
    const transfer = transfers[i] as Record<string, unknown>;
    if (!transfer.provider_transfer_id || !transfer.idempotency_key) {
      continue;
    }

    const adapter = getProviderAdapter(transfer.provider as ExternalTransferProvider);

    const providerResult = await adapter.getTransferStatus({
      providerTransferId: String(transfer.provider_transfer_id),
      idempotencyKey: String(transfer.idempotency_key)
    });

    const priorAttempts =
      typeof transfer.metadata === "object" && transfer.metadata && "pollingAttemptCount" in transfer.metadata
        ? Number((transfer.metadata as Record<string, unknown>).pollingAttemptCount)
        : 0;

    const result = await reconcileProviderStatus({
      reconciliationSource: "polling",
      provider: transfer.provider as ExternalTransferProvider,
      providerTransferId: String(transfer.provider_transfer_id),
      providerStatus: providerResult.providerStatus,
      providerResponse: providerResult.providerResponse as Record<string, unknown>,
      pollingAttemptCount: priorAttempts + 1
    });

    results.push(result);
  }

  return {
    checked: transfers.length,
    reconciled: results.length,
    results
  };
}
