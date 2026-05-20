import type {
  AdminAlertDeliveryAdapter,
  AdminAlertDeliveryProviderInput,
  AdminAlertDeliveryProviderResult
} from "./types";

export const consoleAlertDeliveryAdapter: AdminAlertDeliveryAdapter = {
  providerKey: "internal_console",
  channelTypes: ["console"],

  async deliver(
    input: AdminAlertDeliveryProviderInput
  ): Promise<AdminAlertDeliveryProviderResult> {
    return {
      delivered: true,
      providerResponse: {
        providerKey: "internal_console",
        channelType: input.channelType,
        simulated: false,
        deliveredAt: new Date().toISOString()
      }
    };
  }
};
