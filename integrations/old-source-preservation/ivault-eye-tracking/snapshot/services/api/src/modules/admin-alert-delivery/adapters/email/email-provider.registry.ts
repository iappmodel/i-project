import { dryRunEmailProvider } from "./providers/dry-run-email.provider";
import { genericHttpEmailProvider } from "./providers/generic-http-email.provider";
import { manualDemoEmailProvider } from "./providers/manual-demo-email.provider";
import { getEmailAlertConfig } from "./email.config";
import type { AdminAlertEmailProvider } from "./email-provider.types";

export function getAdminAlertEmailProvider(): AdminAlertEmailProvider {
  const config = getEmailAlertConfig();

  if (config.dryRun) {
    return dryRunEmailProvider;
  }

  switch (config.provider) {
    case "manual_demo":
      return manualDemoEmailProvider;

    case "generic_http":
      return genericHttpEmailProvider;

    case "sendgrid":
      throw new Error("sendgrid email provider not implemented yet");

    case "postmark":
      throw new Error("postmark email provider not implemented yet");

    case "ses":
      throw new Error("ses email provider not implemented yet");

    default:
      throw new Error(`unsupported email provider: ${config.provider}`);
  }
}
