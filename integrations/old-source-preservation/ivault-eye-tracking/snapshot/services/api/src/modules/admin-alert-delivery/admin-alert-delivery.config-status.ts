import { getEmailAlertConfig } from "./adapters/email/email.config";
import { getSlackAlertConfig } from "./adapters/slack/slack.config";
import { getWebhookAlertConfig } from "./adapters/webhook/webhook.config";

export async function getAdminAlertDeliveryConfigStatus() {
  const emailConfig = getEmailAlertConfig();
  const slackConfig = getSlackAlertConfig();
  const webhookConfig = getWebhookAlertConfig();

  return {
    email: {
      provider: emailConfig.provider,
      dryRun: emailConfig.dryRun,
      fromConfigured: Boolean(emailConfig.from),
      allowedRecipientCount: emailConfig.allowedRecipients.size,
      allowedDomainCount: emailConfig.allowedDomains.size,
      httpEndpointConfigured: Boolean(emailConfig.httpEndpoint),
      httpApiKeyConfigured: Boolean(emailConfig.httpApiKey)
    },
    slack: {
      provider: slackConfig.provider,
      dryRun: slackConfig.dryRun,
      allowedChannelKeyCount: slackConfig.allowedChannelKeys.size,
      configuredWebhookCount: Object.values(
        slackConfig.webhookByChannelKey
      ).filter(Boolean).length
    },
    webhook: {
      allowedHostCount: webhookConfig.allowedHosts.size,
      signingSecretConfigured: Boolean(webhookConfig.secret),
      timeoutMs: webhookConfig.timeoutMs
    }
  };
}
