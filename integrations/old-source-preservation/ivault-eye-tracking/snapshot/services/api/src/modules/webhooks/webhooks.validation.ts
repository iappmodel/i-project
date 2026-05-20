import { z } from "zod";

export const payoutProviderWebhookSchema = z.object({
  providerEventId: z.string().min(1).max(256),
  providerEventType: z.string().min(1).max(128),

  providerPayoutId: z.string().min(1).max(256).optional(),
  providerTransferId: z.string().min(1).max(256).optional(),
  processorReference: z.string().min(1).max(256).optional(),

  currencyCode: z.literal("USD").default("USD"),

  amountMinor: z.number().int().positive().optional(),
  feeMinor: z.number().int().nonnegative().optional(),

  normalizedStatus: z.enum([
    "submitted",
    "processing",
    "paid",
    "failed",
    "cancelled",
    "reversed",
    "unknown"
  ]),

  rawPayload: z.record(z.string(), z.unknown()).optional()
});
