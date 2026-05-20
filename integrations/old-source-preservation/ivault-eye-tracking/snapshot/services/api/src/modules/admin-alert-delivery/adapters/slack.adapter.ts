import type {
  AdminAlertDeliveryAdapter,
  AdminAlertDeliveryProviderInput,
  AdminAlertDeliveryProviderResult
} from "./types";
import { getSlackAlertConfig } from "./slack/slack.config";
import { getAdminAlertSlackProvider } from "./slack/slack-provider.registry";
import { renderAdminAlertSlackMessage } from "./slack/slack.renderer";
import {
  assertAllowedSlackChannelKey,
  getSlackWebhookUrlForChannelKey
} from "./slack/slack.security";

export const slackAlertDeliveryAdapter: AdminAlertDeliveryAdapter = {
  providerKey: "slack",
  channelTypes: ["slack"],

  async deliver(
    input: AdminAlertDeliveryProviderInput
  ): Promise<AdminAlertDeliveryProviderResult> {
    const config = getSlackAlertConfig();
    const channelKey = assertAllowedSlackChannelKey(input.target);
    const rendered = renderAdminAlertSlackMessage(input.payload);
    const provider = getAdminAlertSlackProvider();

    const webhookUrl =
      config.dryRun || provider.providerKey === "manual_demo"
        ? undefined
        : getSlackWebhookUrlForChannelKey(channelKey);

    const result = await provider.send({
      channelKey,
      webhookUrl,
      text: rendered.text,
      blocks: rendered.blocks,
      deliveryId: input.deliveryId,
      payload: input.payload
    });

    return {
      delivered: result.success,
      retryDelaySeconds: result.retryDelaySeconds,
      failureReason: result.failureReason,
      providerResponse: {
        adapter: "slack",
        provider: provider.providerKey,
        ...result.providerResponse
      }
    };
  }
};
