import type {
  AdminAlertEmailProvider,
  SendAdminAlertEmailInput,
  SendAdminAlertEmailResult
} from "../email-provider.types";

export const sendgridEmailProvider: AdminAlertEmailProvider = {
  providerKey: "sendgrid",

  async send(
    _input: SendAdminAlertEmailInput
  ): Promise<SendAdminAlertEmailResult> {
    throw new Error("sendgrid email provider not implemented yet");
  }
};
