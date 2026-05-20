import type {
  ExternalTransferProviderRequest,
  ExternalTransferProviderResult
} from "@/types/alphabet/external-transfer.types";

export interface ExternalTransferProviderAdapter {
  providerName: string;

  createTransfer(request: ExternalTransferProviderRequest): Promise<ExternalTransferProviderResult>;

  getTransferStatus(params: {
    providerTransferId: string;
    idempotencyKey: string;
  }): Promise<ExternalTransferProviderResult>;
}

export function sanitizeProviderPayload(payload: Record<string, unknown>) {
  const forbidden = new Set([
    "bankToken",
    "paymentToken",
    "accountNumber",
    "routingNumber",
    "cardNumber",
    "cvv",
    "secretKey",
    "apiKey",
    "rawIdentityDocument"
  ]);

  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (forbidden.has(key)) continue;
    clean[key] = value;
  }

  return clean;
}
