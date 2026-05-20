import type {
  AdminAlertEmailProvider,
  SendAdminAlertEmailInput,
  SendAdminAlertEmailResult
} from "../email-provider.types";

export const postmarkEmailProvider: AdminAlertEmailProvider = {
  providerKey: "postmark",

  async send(
    _input: SendAdminAlertEmailInput
  ): Promise<SendAdminAlertEmailResult> {
    throw new Error("postmark email provider not implemented yet");
  }
};
