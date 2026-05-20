import type {
  AdminAlertSlackProvider,
  SendAdminAlertSlackInput,
  SendAdminAlertSlackResult
} from "../slack-provider.types";

export const incomingWebhookSlackProvider: AdminAlertSlackProvider = {
  providerKey: "incoming_webhook",

  async send(
    input: SendAdminAlertSlackInput
  ): Promise<SendAdminAlertSlackResult> {
    if (!input.webhookUrl) {
      throw new Error("slack webhook url is required");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(input.webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          text: input.text,
          blocks: input.blocks
        }),
        signal: controller.signal
      });

      const text = await response.text();

      if (!response.ok) {
        return {
          success: false,
          retryDelaySeconds: response.status >= 500 ? 900 : 3600,
          failureReason: `slack webhook returned HTTP ${response.status}`,
          providerResponse: {
            providerKey: "incoming_webhook",
            status: response.status,
            bodyPreview: text.slice(0, 1000)
          }
        };
      }

      return {
        success: true,
        providerResponse: {
          providerKey: "incoming_webhook",
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
