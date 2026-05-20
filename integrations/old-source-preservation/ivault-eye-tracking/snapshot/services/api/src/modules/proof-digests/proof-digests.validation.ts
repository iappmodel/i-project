import { z } from "zod";

export const createPrivateRoomDigestSubscriptionSchema = z.object({
  recipientEmail: z.string().email(),
  recipientDisplayName: z.string().max(256).optional(),
  digestFrequency: z
    .enum(["immediate", "hourly", "daily", "weekly", "manual"])
    .default("daily"),
  digestChannel: z
    .enum(["email", "in_app", "webhook", "slack", "system"])
    .default("email"),
  timezone: z.string().min(1).max(128).default("UTC")
});
