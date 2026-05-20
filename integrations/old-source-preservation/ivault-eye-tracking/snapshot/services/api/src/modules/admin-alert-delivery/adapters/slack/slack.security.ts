import { getSlackAlertConfig } from "./slack.config";

export function normalizeSlackChannelKey(target: string | null): string {
  if (!target) {
    throw new Error("slack target is required");
  }

  const normalized = target
    .trim()
    .replace(/^#/, "")
    .toLowerCase();

  if (!/^[a-z0-9_-]{2,64}$/.test(normalized)) {
    throw new Error("invalid slack channel key");
  }

  return normalized;
}

export function assertAllowedSlackChannelKey(target: string | null): string {
  const config = getSlackAlertConfig();
  const channelKey = normalizeSlackChannelKey(target);

  if (!config.allowedChannelKeys.has(channelKey)) {
    throw new Error("slack channel key is not allowlisted");
  }

  return channelKey;
}

export function getSlackWebhookUrlForChannelKey(channelKey: string): string {
  const config = getSlackAlertConfig();
  const webhookUrl = config.webhookByChannelKey[channelKey];

  if (!webhookUrl) {
    throw new Error("slack webhook is not configured for channel key");
  }

  const url = new URL(webhookUrl);

  if (url.protocol !== "https:") {
    throw new Error("slack webhook must use https");
  }

  if (url.hostname !== "hooks.slack.com") {
    throw new Error("slack webhook host is invalid");
  }

  return webhookUrl;
}
