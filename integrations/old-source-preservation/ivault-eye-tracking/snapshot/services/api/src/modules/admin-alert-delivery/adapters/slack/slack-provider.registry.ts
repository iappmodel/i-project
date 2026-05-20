import { dryRunSlackProvider } from "./providers/dry-run-slack.provider";
import { incomingWebhookSlackProvider } from "./providers/incoming-webhook-slack.provider";
import { manualDemoSlackProvider } from "./providers/manual-demo-slack.provider";
import { getSlackAlertConfig } from "./slack.config";
import type { AdminAlertSlackProvider } from "./slack-provider.types";

export function getAdminAlertSlackProvider(): AdminAlertSlackProvider {
  const config = getSlackAlertConfig();

  if (config.dryRun) {
    return dryRunSlackProvider;
  }

  switch (config.provider) {
    case "manual_demo":
      return manualDemoSlackProvider;

    case "incoming_webhook":
      return incomingWebhookSlackProvider;

    default:
      throw new Error(`unsupported slack provider: ${config.provider}`);
  }
}
