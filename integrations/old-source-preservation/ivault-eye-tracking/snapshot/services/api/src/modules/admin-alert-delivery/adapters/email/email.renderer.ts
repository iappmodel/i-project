export type RenderedAdminAlertEmail = {
  subject: string;
  textBody: string;
  htmlBody: string;
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeString(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

export function renderAdminAlertEmail(
  payload: Record<string, unknown>
): RenderedAdminAlertEmail {
  const severity = safeString(payload.severity || "unknown").toUpperCase();
  const alertKey = safeString(payload.alertKey || "admin_security_alert");
  const message = safeString(payload.message || "Admin security alert");
  const actionKey = safeString(payload.actionKey || "unknown_action");
  const createdAt = safeString(payload.createdAt || new Date().toISOString());
  const alertId = safeString(payload.alertId || "");

  const subject = `[${severity}] ${alertKey}`;

  const textBody = [
    `Admin Security Alert`,
    ``,
    `Severity: ${severity}`,
    `Alert: ${alertKey}`,
    `Action: ${actionKey}`,
    `Message: ${message}`,
    `Alert ID: ${alertId}`,
    `Created At: ${createdAt}`,
    ``,
    `This is an automated security alert from the i platform admin system.`
  ].join("\n");

  const htmlBody = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; line-height: 1.5;">
      <h2>Admin Security Alert</h2>
      <p><strong>Severity:</strong> ${escapeHtml(severity)}</p>
      <p><strong>Alert:</strong> ${escapeHtml(alertKey)}</p>
      <p><strong>Action:</strong> ${escapeHtml(actionKey)}</p>
      <p><strong>Message:</strong> ${escapeHtml(message)}</p>
      <p><strong>Alert ID:</strong> ${escapeHtml(alertId)}</p>
      <p><strong>Created At:</strong> ${escapeHtml(createdAt)}</p>
      <hr />
      <p style="color: #666;">This is an automated security alert from the i platform admin system.</p>
    </div>
  `.trim();

  return {
    subject,
    textBody,
    htmlBody
  };
}
