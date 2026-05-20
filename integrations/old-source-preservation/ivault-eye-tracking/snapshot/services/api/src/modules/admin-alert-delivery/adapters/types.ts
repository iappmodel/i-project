export type AdminAlertDeliveryProviderInput = {
  deliveryId: string;
  channelKey: string;
  channelType: "email" | "slack" | "webhook" | "console";
  providerKey: string;
  target: string | null;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
};

export type AdminAlertDeliveryProviderResult = {
  delivered: boolean;
  providerResponse: Record<string, unknown>;
  retryDelaySeconds?: number;
  failureReason?: string;
};

export type AdminAlertDeliveryAdapter = {
  providerKey: string;
  channelTypes: Array<"email" | "slack" | "webhook" | "console">;
  deliver(
    input: AdminAlertDeliveryProviderInput
  ): Promise<AdminAlertDeliveryProviderResult>;
};
