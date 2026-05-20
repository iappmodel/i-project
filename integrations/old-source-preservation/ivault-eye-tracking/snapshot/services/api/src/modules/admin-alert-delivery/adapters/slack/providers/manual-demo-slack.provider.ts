import type {
  AdminAlertSlackProvider,
  SendAdminAlertSlackInput,
  SendAdminAlertSlackResult
} from "../slack-provider.types";

export const manualDemoSlackProvider: AdminAlertSlackProvider = {
  providerKey: "manual_demo",

  async send(
    input: SendAdminAlertSlackInput
  ): Promise<SendAdminAlertSlackResult> {
    return {
      success: true,
      providerResponse: {
        simulated: true,
        providerKey: "manual_demo",
        channelKey: input.channelKey,
        text: input.text,
        deliveryId: input.deliveryId,
        deliveredAt: new Date().toISOString()
      }
    };
  }
};
