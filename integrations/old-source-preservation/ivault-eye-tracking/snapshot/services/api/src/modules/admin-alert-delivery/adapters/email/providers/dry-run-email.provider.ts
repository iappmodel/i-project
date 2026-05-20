import type {
  AdminAlertEmailProvider,
  SendAdminAlertEmailInput,
  SendAdminAlertEmailResult
} from "../email-provider.types";

export const dryRunEmailProvider: AdminAlertEmailProvider = {
  providerKey: "email_dry_run",

  async send(
    input: SendAdminAlertEmailInput
  ): Promise<SendAdminAlertEmailResult> {
    return {
      success: true,
      providerResponse: {
        dryRun: true,
        providerKey: "email_dry_run",
        to: input.to,
        from: input.from,
        subject: input.subject,
        deliveryId: input.deliveryId,
        deliveredAt: new Date().toISOString()
      }
    };
  }
};
