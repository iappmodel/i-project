import { consoleAlertDeliveryAdapter } from "./console.adapter";
import { emailAlertDeliveryAdapter } from "./email.adapter";
import { manualDemoAlertDeliveryAdapter } from "./manual-demo.adapter";
import { slackAlertDeliveryAdapter } from "./slack.adapter";
import { webhookAlertDeliveryAdapter } from "./webhook.adapter";
import type { AdminAlertDeliveryAdapter } from "./types";

const adapters: AdminAlertDeliveryAdapter[] = [
  consoleAlertDeliveryAdapter,
  manualDemoAlertDeliveryAdapter,
  emailAlertDeliveryAdapter,
  slackAlertDeliveryAdapter,
  webhookAlertDeliveryAdapter
];

const channelTypes = ["email", "slack", "webhook", "console"] as const;
type ChannelType = (typeof channelTypes)[number];

function isChannelType(value: string): value is ChannelType {
  return channelTypes.includes(value as ChannelType);
}

export function getAlertDeliveryAdapter(
  providerKey: string,
  channelType: string
): AdminAlertDeliveryAdapter {
  if (!isChannelType(channelType)) {
    throw new Error(`unsupported alert delivery channel type: ${channelType}`);
  }

  const adapter = adapters.find(
    (candidate) =>
      candidate.providerKey === providerKey &&
      candidate.channelTypes.includes(channelType)
  );

  if (!adapter) {
    throw new Error(
      `unsupported alert delivery adapter: ${providerKey}/${channelType}`
    );
  }

  return adapter;
}
