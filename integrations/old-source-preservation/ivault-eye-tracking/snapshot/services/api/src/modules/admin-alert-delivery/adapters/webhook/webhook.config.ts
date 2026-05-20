function splitCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getWebhookAlertConfig() {
  const timeoutMs = Number(process.env.ADMIN_ALERT_WEBHOOK_TIMEOUT_MS ?? 5000);

  return {
    allowedHosts: new Set(
      splitCsv(process.env.ADMIN_ALERT_WEBHOOK_ALLOWED_HOSTS).map((host) =>
        host.toLowerCase()
      )
    ),
    secret: process.env.ADMIN_ALERT_WEBHOOK_SECRET ?? "",
    timeoutMs: Number.isFinite(timeoutMs)
      ? Math.min(Math.max(timeoutMs, 1000), 10000)
      : 5000
  };
}
