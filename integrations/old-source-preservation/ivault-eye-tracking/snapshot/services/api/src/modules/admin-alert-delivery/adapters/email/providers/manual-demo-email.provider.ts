import type {
  AdminAlertEmailProvider,
  SendAdminAlertEmailInput,
  SendAdminAlertEmailResult
} from "../email-provider.types";

export const manualDemoEmailProvider: AdminAlertEmailProvider = {
  providerKey: "manual_demo",

  async send(
    input: SendAdminAlertEmailInput
  ): Promise<SendAdminAlertEmailResult> {
    return {
      success: true,
      providerResponse: {
        simulated: true,
        providerKey: "manual_demo",
        to: input.to,
        from: input.from,
        subject: input.subject,
        deliveryId: input.deliveryId,
        deliveredAt: new Date().toISOString()
      }
    };
  }
};
