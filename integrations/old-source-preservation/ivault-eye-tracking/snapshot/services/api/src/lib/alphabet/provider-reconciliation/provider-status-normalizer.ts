import type {
  NormalizedProviderStatus,
  ProviderWebhookNormalizedPayload
} from "@/types/alphabet/provider-reconciliation.types";
import type { ExternalTransferProvider } from "@/types/alphabet/external-transfer.types";
import { sanitizeProviderPayload } from "../external-transfer/external-transfer-provider-contract";

function normalizeStatus(
  provider: ExternalTransferProvider,
  rawStatus: string | null
): NormalizedProviderStatus {
  const value = String(rawStatus ?? "").toLowerCase();

  if (["created", "requires_action", "queued"].includes(value)) return "provider_created";
  if (["pending", "in_transit", "submitted"].includes(value)) return "provider_pending";
  if (["processing", "running"].includes(value)) return "provider_processing";
  if (["succeeded", "success", "paid", "completed", "settled"].includes(value))
    return "provider_succeeded";
  if (["failed", "failure", "declined", "rejected"].includes(value)) return "provider_failed";
  if (["canceled", "cancelled"].includes(value)) return "provider_canceled";
  if (["returned", "return"].includes(value)) return "provider_returned";
  if (["reversed", "reversal"].includes(value)) return "provider_reversed";

  if (provider === "mock" && value === "unknown") return "provider_unknown";
  if (provider === "mock" && value.length > 0) return "provider_unknown";

  return "provider_unknown";
}

function parseJson(rawBody: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function normalizeProviderWebhookPayload(params: {
  provider: ExternalTransferProvider;
  rawBody: string;
}): ProviderWebhookNormalizedPayload {
  const payload = parseJson(params.rawBody);

  const data =
    typeof payload.data === "object" && payload.data
      ? (payload.data as Record<string, unknown>)
      : payload;

  const providerEventId =
    String(payload.id ?? payload.event_id ?? data.eventId ?? "") || null;

  const providerRawEventType =
    String(payload.type ?? payload.event_type ?? data.type ?? "") || null;

  const providerTransferId =
    String(
      data.providerTransferId ??
        data.transfer_id ??
        data.payout_id ??
        data.id ??
        payload.providerTransferId ??
        ""
    ) || null;

  const rawStatus =
    String(
      data.status ??
        payload.status ??
        data.providerStatus ??
        payload.providerStatus ??
        ""
    ) || null;

  const sanitizedPayload = sanitizeProviderPayload(payload);

  return {
    provider: params.provider,
    providerEventId,
    providerRawEventType,
    providerTransferId,
    normalizedStatus: normalizeStatus(params.provider, rawStatus),
    rawPayload: payload as never,
    sanitizedPayload: sanitizedPayload as never,
    amount: typeof data.amount === "number" ? data.amount : null,
    currency: typeof data.currency === "string" ? data.currency : null,
    metadata: {
      rawStatus
    } as never
  };
}
