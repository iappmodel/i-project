import type {
  AdminAlertSlackProvider,
  SendAdminAlertSlackInput,
  SendAdminAlertSlackResult
} from "../slack-provider.types";

export const dryRunSlackProvider: AdminAlertSlackProvider = {
  providerKey: "slack_dry_run",

  async send(
    input: SendAdminAlertSlackInput
  ): Promise<SendAdminAlertSlackResult> {
    return {
      success: true,
      providerResponse: {
        dryRun: true,
        providerKey: "slack_dry_run",
        channelKey: input.channelKey,
        text: input.text,
        deliveryId: input.deliveryId,
        deliveredAt: new Date().toISOString()
      }
    };
  }
};
