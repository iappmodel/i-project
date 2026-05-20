import type {
  AdminAlertDeliveryAdapter,
  AdminAlertDeliveryProviderInput,
  AdminAlertDeliveryProviderResult
} from "./types";

export const manualDemoAlertDeliveryAdapter: AdminAlertDeliveryAdapter = {
  providerKey: "manual_demo",
  channelTypes: ["email", "slack", "webhook", "console"],

  async deliver(
    input: AdminAlertDeliveryProviderInput
  ): Promise<AdminAlertDeliveryProviderResult> {
    return {
      delivered: true,
      providerResponse: {
        providerKey: "manual_demo",
        channelType: input.channelType,
        target: input.target,
        simulated: true,
        alertKey: input.payload.alertKey,
        severity: input.payload.severity,
        deliveredAt: new Date().toISOString()
      }
    };
  }
};
