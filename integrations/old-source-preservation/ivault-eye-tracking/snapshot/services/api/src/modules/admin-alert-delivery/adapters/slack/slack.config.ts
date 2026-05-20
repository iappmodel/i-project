export type SlackProviderKind = "manual_demo" | "incoming_webhook";

function splitCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getSlackAlertConfig() {
  const allowedChannelKeys = new Set(
    splitCsv(process.env.ADMIN_ALERT_SLACK_ALLOWED_CHANNEL_KEYS).map((key) =>
      key.toLowerCase()
    )
  );

  const webhookByChannelKey: Record<string, string | undefined> = {
    security_alerts: process.env.ADMIN_ALERT_SLACK_WEBHOOK_SECURITY_ALERTS,
    admin_alerts: process.env.ADMIN_ALERT_SLACK_WEBHOOK_ADMIN_ALERTS
  };

  return {
    provider: (process.env.ADMIN_ALERT_SLACK_PROVIDER ??
      "manual_demo") as SlackProviderKind,

    dryRun: (process.env.ADMIN_ALERT_SLACK_DRY_RUN ?? "true") !== "false",

    allowedChannelKeys,

    webhookByChannelKey
  };
}
