import { supabaseAdmin } from "../../config/supabase";

export async function recordPayoutProviderWebhook(input: {
  providerKey: string;
  providerEventId: string;
  providerEventType: string;
  providerPayoutId?: string;
  providerTransferId?: string;
  processorReference?: string;
  currencyCode: "USD";
  amountMinor?: number;
  feeMinor?: number;
  normalizedStatus: string;
  rawPayload?: Record<string, unknown>;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc("record_payout_provider_event", {
    p_provider_key: input.providerKey,
    p_provider_event_id: input.providerEventId,
    p_provider_event_type: input.providerEventType,
    p_provider_payout_id: input.providerPayoutId ?? null,
    p_provider_transfer_id: input.providerTransferId ?? null,
    p_processor_reference: input.processorReference ?? null,
    p_currency_code: input.currencyCode,
    p_amount_minor: input.amountMinor ?? null,
    p_fee_minor: input.feeMinor ?? null,
    p_normalized_status: input.normalizedStatus,
    p_raw_payload: input.rawPayload ?? {},
    p_metadata: {
      requestId: input.requestId
    }
  });

  if (error) {
    throw error;
  }

  return {
    providerEventId: String(data),
    processingStatus: "received" as const
  };
}
