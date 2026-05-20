import { getWebhookAlertConfig } from "./webhook.config";
import { assertWebhookHostResolvesPublicly } from "./webhook.network-security";

export async function assertSafeWebhookTarget(
  target: string | null
): Promise<URL> {
  if (!target) {
    throw new Error("webhook target is required");
  }

  const config = getWebhookAlertConfig();
  const url = new URL(target);

  if (url.protocol !== "https:") {
    throw new Error("webhook target must use https");
  }

  const hostname = url.hostname.toLowerCase();

  if (!config.allowedHosts.has(hostname)) {
    throw new Error("webhook target host is not allowlisted");
  }

  if (url.username || url.password) {
    throw new Error("webhook target must not include credentials");
  }

  if (url.port && url.port !== "443") {
    throw new Error("webhook target must use default HTTPS port");
  }

  await assertWebhookHostResolvesPublicly(hostname);

  return url;
}
