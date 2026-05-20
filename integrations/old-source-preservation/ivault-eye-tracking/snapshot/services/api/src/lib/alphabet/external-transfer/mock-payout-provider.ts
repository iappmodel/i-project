import type {
  ExternalTransferProviderRequest,
  ExternalTransferProviderResult
} from "@/types/alphabet/external-transfer.types";
import type { ExternalTransferProviderAdapter } from "./external-transfer-provider-contract";

export class MockPayoutProvider implements ExternalTransferProviderAdapter {
  providerName = "mock";

  async createTransfer(
    request: ExternalTransferProviderRequest
  ): Promise<ExternalTransferProviderResult> {
    const forcedStatus = (request.metadata as Record<string, unknown> | undefined)?.mockStatus;

    if (forcedStatus === "failed") {
      return {
        ok: false,
        providerTransferId: `mock_transfer_${request.externalTransferId}`,
        providerStatus: "failed",
        providerResponse: {
          provider: "mock",
          failureReason: "forced_mock_failure"
        },
        failureReason: "forced_mock_failure",
        retryable: false
      };
    }

    if (forcedStatus === "unknown") {
      return {
        ok: false,
        providerTransferId: `mock_transfer_${request.externalTransferId}`,
        providerStatus: "unknown",
        providerResponse: {
          provider: "mock",
          warning: "forced_unknown_state"
        },
        failureReason: "unknown_state",
        retryable: false
      };
    }

    if (forcedStatus === "succeeded") {
      return {
        ok: true,
        providerTransferId: `mock_transfer_${request.externalTransferId}`,
        providerStatus: "succeeded",
        providerResponse: {
          provider: "mock",
          status: "succeeded"
        },
        retryable: false
      };
    }

    return {
      ok: true,
      providerTransferId: `mock_transfer_${request.externalTransferId}`,
      providerStatus: "pending",
      providerResponse: {
        provider: "mock",
        status: "pending"
      },
      retryable: true
    };
  }

  async getTransferStatus(params: {
    providerTransferId: string;
    idempotencyKey: string;
  }): Promise<ExternalTransferProviderResult> {
    return {
      ok: true,
      providerTransferId: params.providerTransferId,
      providerStatus: "pending",
      providerResponse: {
        provider: "mock",
        status: "pending",
        checkedWithIdempotencyKey: params.idempotencyKey
      },
      retryable: true
    };
  }
}
