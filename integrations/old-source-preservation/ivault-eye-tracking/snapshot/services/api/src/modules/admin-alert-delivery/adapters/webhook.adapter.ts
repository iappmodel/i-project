import type {
  AdminAlertDeliveryAdapter,
  AdminAlertDeliveryProviderInput,
  AdminAlertDeliveryProviderResult
} from "./types";
import { getWebhookAlertConfig } from "./webhook/webhook.config";
import {
  createWebhookNonce,
  createWebhookTimestamp,
  signWebhookPayload
} from "./webhook/webhook.crypto";
import { assertSafeWebhookTarget } from "./webhook/webhook.security";

export const webhookAlertDeliveryAdapter: AdminAlertDeliveryAdapter = {
  providerKey: "generic_webhook",
  channelTypes: ["webhook"],

  async deliver(
    input: AdminAlertDeliveryProviderInput
  ): Promise<AdminAlertDeliveryProviderResult> {
    const config = getWebhookAlertConfig();
    const url = await assertSafeWebhookTarget(input.target);

    const body = JSON.stringify({
      deliveryId: input.deliveryId,
      channelKey: input.channelKey,
      alert: input.payload,
      metadata: {
        deliveryId: input.deliveryId,
        sentAt: new Date().toISOString()
      }
    });

    const timestamp = createWebhookTimestamp();
    const nonce = createWebhookNonce();
    const signature = signWebhookPayload({
      secret: config.secret,
      timestamp,
      nonce,
      body
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        redirect: "manual",
        headers: {
          "content-type": "application/json",
          "x-i-delivery-id": input.deliveryId,
          "x-i-timestamp": timestamp,
          "x-i-nonce": nonce,
          "x-i-signature": `sha256=${signature}`
        },
        body,
        signal: controller.signal
      });

      const text = await response.text();

      if (response.status >= 300 && response.status < 400) {
        return {
          delivered: false,
          retryDelaySeconds: 3600,
          failureReason: `webhook redirect blocked with HTTP ${response.status}`,
          providerResponse: {
            providerKey: "generic_webhook",
            status: response.status,
            redirectBlocked: true
          }
        };
      }

      if (!response.ok) {
        return {
          delivered: false,
          retryDelaySeconds: response.status >= 500 ? 900 : 3600,
          failureReason: `webhook returned HTTP ${response.status}`,
          providerResponse: {
            providerKey: "generic_webhook",
            status: response.status,
            bodyPreview: text.slice(0, 1000)
          }
        };
      }

      return {
        delivered: true,
        providerResponse: {
          providerKey: "generic_webhook",
          status: response.status,
          bodyPreview: text.slice(0, 1000),
          deliveredAt: new Date().toISOString()
        }
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "webhook delivery failed";

      return {
        delivered: false,
        retryDelaySeconds: 900,
        failureReason: message,
        providerResponse: {
          providerKey: "generic_webhook",
          exception: true,
          message
        }
      };
    } finally {
      clearTimeout(timeout);
    }
  }
};
