function safeString(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function severityEmoji(severity: string): string {
  switch (severity.toLowerCase()) {
    case "critical":
      return "🚨";
    case "high":
      return "⚠️";
    case "medium":
      return "🟡";
    case "low":
      return "🔵";
    default:
      return "ℹ️";
  }
}

export function renderAdminAlertSlackMessage(payload: Record<string, unknown>) {
  const severity = safeString(payload.severity || "unknown").toUpperCase();
  const alertKey = safeString(payload.alertKey || "admin_security_alert");
  const message = safeString(payload.message || "Admin security alert");
  const actionKey = safeString(payload.actionKey || "unknown_action");
  const alertId = safeString(payload.alertId || "");
  const createdAt = safeString(payload.createdAt || new Date().toISOString());

  const emoji = severityEmoji(severity);

  return {
    text: `${emoji} [${severity}] ${alertKey}: ${message}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji} Admin Security Alert`,
          emoji: true
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Severity:*\n${severity}`
          },
          {
            type: "mrkdwn",
            text: `*Alert:*\n${alertKey}`
          },
          {
            type: "mrkdwn",
            text: `*Action:*\n${actionKey}`
          },
          {
            type: "mrkdwn",
            text: `*Created:*\n${createdAt}`
          }
        ]
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Message:*\n${message}`
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Alert ID: \`${alertId}\``
          }
        ]
      }
    ]
  };
}
