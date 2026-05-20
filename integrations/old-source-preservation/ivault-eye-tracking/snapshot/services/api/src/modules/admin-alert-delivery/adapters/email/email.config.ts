export type EmailProviderKind =
  | "manual_demo"
  | "generic_http"
  | "sendgrid"
  | "postmark"
  | "ses";

function splitCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getEmailAlertConfig() {
  return {
    provider: (process.env.ADMIN_ALERT_EMAIL_PROVIDER ??
      "manual_demo") as EmailProviderKind,

    dryRun: (process.env.ADMIN_ALERT_EMAIL_DRY_RUN ?? "true") !== "false",

    from: process.env.ADMIN_ALERT_EMAIL_FROM ?? "security@example.com",

    allowedRecipients: new Set(
      splitCsv(process.env.ADMIN_ALERT_EMAIL_ALLOWED_RECIPIENTS).map((email) =>
        email.toLowerCase()
      )
    ),

    allowedDomains: new Set(
      splitCsv(process.env.ADMIN_ALERT_EMAIL_ALLOWED_DOMAINS).map((domain) =>
        domain.toLowerCase()
      )
    ),

    httpEndpoint: process.env.ADMIN_ALERT_EMAIL_HTTP_ENDPOINT ?? "",
    httpApiKey: process.env.ADMIN_ALERT_EMAIL_HTTP_API_KEY ?? "",
    httpProviderKey:
      process.env.ADMIN_ALERT_EMAIL_HTTP_PROVIDER_KEY ?? "generic_email_http"
  };
}
