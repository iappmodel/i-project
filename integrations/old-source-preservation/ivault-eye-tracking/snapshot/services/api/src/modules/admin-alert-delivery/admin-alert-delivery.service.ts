import { supabaseAdmin } from "../../config/supabase";
import { getAlertDeliveryAdapter } from "./adapters/registry";
import type { AdminAlertDeliveryProviderInput } from "./adapters/types";

type DeliveryRow = {
  id: string;
  channel_key: string;
  channel_type: "email" | "slack" | "webhook" | "console";
  provider_key: string;
  target: string | null;
  payload: unknown;
  metadata: unknown;
};

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function mapDeliveryRow(row: DeliveryRow): AdminAlertDeliveryProviderInput {
  return {
    deliveryId: String(row.id),
    channelKey: String(row.channel_key),
    channelType: row.channel_type,
    providerKey: String(row.provider_key),
    target:
      row.target === null || row.target === undefined ? null : String(row.target),
    payload: toRecord(row.payload),
    metadata: toRecord(row.metadata)
  };
}

export async function runAdminAlertDeliveryProviderWorker(input: {
  batchSize?: number;
  lockedBy: string;
  requestId: string;
}) {
  const batchSize = Math.min(Math.max(input.batchSize ?? 100, 1), 500);

  const { data: rows, error } = await supabaseAdmin.rpc(
    "claim_admin_security_alert_deliveries",
    {
      p_batch_size: batchSize,
      p_locked_by: input.lockedBy,
      p_lock_ttl_seconds: 300,
      p_metadata: {
        requestId: input.requestId,
        worker: "api_provider_worker"
      }
    }
  );

  if (error) {
    throw error;
  }

  const deliveries = ((rows as DeliveryRow[] | null) ?? []).map(mapDeliveryRow);
  let deliveredCount = 0;
  let failedCount = 0;

  for (const delivery of deliveries) {
    try {
      const adapter = getAlertDeliveryAdapter(
        delivery.providerKey,
        delivery.channelType
      );

      const result = await adapter.deliver(delivery);

      if (result.delivered) {
        const { error: markError } = await supabaseAdmin.rpc(
          "mark_admin_security_alert_delivery_delivered",
          {
            p_delivery_id: delivery.deliveryId,
            p_provider_response: result.providerResponse,
            p_metadata: {
              requestId: input.requestId,
              adapter: adapter.providerKey
            }
          }
        );

        if (markError) {
          throw markError;
        }

        deliveredCount += 1;
      } else {
        const { error: failError } = await supabaseAdmin.rpc(
          "mark_admin_security_alert_delivery_failed",
          {
            p_delivery_id: delivery.deliveryId,
            p_failure_reason: result.failureReason ?? "delivery failed",
            p_provider_response: result.providerResponse,
            p_retry_delay_seconds: result.retryDelaySeconds ?? 900,
            p_metadata: {
              requestId: input.requestId,
              adapter: adapter.providerKey
            }
          }
        );

        if (failError) {
          throw failError;
        }

        failedCount += 1;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "delivery exception";

      await supabaseAdmin.rpc("mark_admin_security_alert_delivery_failed", {
        p_delivery_id: delivery.deliveryId,
        p_failure_reason: message,
        p_provider_response: {
          exception: true,
          message
        },
        p_retry_delay_seconds: 900,
        p_metadata: {
          requestId: input.requestId
        }
      });

      failedCount += 1;
    }
  }

  return {
    scannedCount: deliveries.length,
    deliveredCount,
    failedCount
  };
}
