import { getEmailAlertConfig } from "../email.config";
import type {
  AdminAlertEmailProvider,
  SendAdminAlertEmailInput,
  SendAdminAlertEmailResult
} from "../email-provider.types";

function assertSafeEmailEndpoint(endpoint: string): URL {
  if (!endpoint) {
    throw new Error("email HTTP endpoint is not configured");
  }

  const url = new URL(endpoint);

  if (url.protocol !== "https:") {
    throw new Error("email HTTP endpoint must use https");
  }

  return url;
}

export const genericHttpEmailProvider: AdminAlertEmailProvider = {
  providerKey: "generic_http",

  async send(
    input: SendAdminAlertEmailInput
  ): Promise<SendAdminAlertEmailResult> {
    const config = getEmailAlertConfig();
    const url = assertSafeEmailEndpoint(config.httpEndpoint);

    if (!config.httpApiKey) {
      throw new Error("email HTTP API key is not configured");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${config.httpApiKey}`,
          "x-i-alert-delivery-id": input.deliveryId
        },
        body: JSON.stringify({
          to: input.to,
          from: input.from,
          subject: input.subject,
          text: input.textBody,
          html: input.htmlBody,
          metadata: {
            deliveryId: input.deliveryId,
            alertId: input.payload.alertId,
            alertKey: input.payload.alertKey,
            severity: input.payload.severity
          }
        }),
        signal: controller.signal
      });

      const text = await response.text();

      if (!response.ok) {
        return {
          success: false,
          retryDelaySeconds: response.status >= 500 ? 900 : 3600,
          failureReason: `email HTTP provider returned HTTP ${response.status}`,
          providerResponse: {
            providerKey: "generic_http",
            status: response.status,
            bodyPreview: text.slice(0, 1000)
          }
        };
      }

      return {
        success: true,
        providerResponse: {
          providerKey: "generic_http",
          status: response.status,
          bodyPreview: text.slice(0, 1000),
          deliveredAt: new Date().toISOString()
        }
      };
    } finally {
      clearTimeout(timeout);
    }
  }
};
