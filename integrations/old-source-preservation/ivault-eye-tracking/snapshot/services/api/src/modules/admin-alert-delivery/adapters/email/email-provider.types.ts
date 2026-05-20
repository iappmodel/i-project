export type SendAdminAlertEmailInput = {
  to: string;
  from: string;

  subject: string;
  textBody: string;
  htmlBody: string;

  deliveryId: string;
  payload: Record<string, unknown>;
};

export type SendAdminAlertEmailResult = {
  success: boolean;
  providerResponse: Record<string, unknown>;
  retryDelaySeconds?: number;
  failureReason?: string;
};

export type AdminAlertEmailProvider = {
  providerKey: string;

  send(input: SendAdminAlertEmailInput): Promise<SendAdminAlertEmailResult>;
};
