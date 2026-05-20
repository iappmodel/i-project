import type {
  AdminAlertDeliveryAdapter,
  AdminAlertDeliveryProviderInput,
  AdminAlertDeliveryProviderResult
} from "./types";
import { getEmailAlertConfig } from "./email/email.config";
import { getAdminAlertEmailProvider } from "./email/email-provider.registry";
import { renderAdminAlertEmail } from "./email/email.renderer";
import { assertAllowedEmailRecipient } from "./email/email.security";

export const emailAlertDeliveryAdapter: AdminAlertDeliveryAdapter = {
  providerKey: "email",
  channelTypes: ["email"],

  async deliver(
    input: AdminAlertDeliveryProviderInput
  ): Promise<AdminAlertDeliveryProviderResult> {
    const config = getEmailAlertConfig();
    const to = assertAllowedEmailRecipient(input.target);
    const rendered = renderAdminAlertEmail(input.payload);
    const provider = getAdminAlertEmailProvider();
    const result = await provider.send({
      to,
      from: config.from,
      subject: rendered.subject,
      textBody: rendered.textBody,
      htmlBody: rendered.htmlBody,
      deliveryId: input.deliveryId,
      payload: input.payload
    });

    return {
      delivered: result.success,
      retryDelaySeconds: result.retryDelaySeconds,
      failureReason: result.failureReason,
      providerResponse: {
        adapter: "email",
        provider: provider.providerKey,
        ...result.providerResponse
      }
    };
  }
};
