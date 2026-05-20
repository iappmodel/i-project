export type SendAdminAlertSlackInput = {
  channelKey: string;
  webhookUrl?: string;

  text: string;
  blocks: unknown[];

  deliveryId: string;
  payload: Record<string, unknown>;
};

export type SendAdminAlertSlackResult = {
  success: boolean;
  providerResponse: Record<string, unknown>;
  retryDelaySeconds?: number;
  failureReason?: string;
};

export type AdminAlertSlackProvider = {
  providerKey: string;

  send(input: SendAdminAlertSlackInput): Promise<SendAdminAlertSlackResult>;
};
