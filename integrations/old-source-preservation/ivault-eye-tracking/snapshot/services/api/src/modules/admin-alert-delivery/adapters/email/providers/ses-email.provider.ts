import type {
  AdminAlertEmailProvider,
  SendAdminAlertEmailInput,
  SendAdminAlertEmailResult
} from "../email-provider.types";

export const sesEmailProvider: AdminAlertEmailProvider = {
  providerKey: "ses",

  async send(
    _input: SendAdminAlertEmailInput
  ): Promise<SendAdminAlertEmailResult> {
    throw new Error("ses email provider not implemented yet");
  }
};
