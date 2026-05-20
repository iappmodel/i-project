import { z } from "zod";
import { boundedMetadataSchema, idempotencyKeySchema, uuidSchema } from "../../shared/validation";

export const createWithdrawalSchema = z.object({
  walletId: uuidSchema,
  amountMinor: z.number().int().positive().max(1_000_000),
  currencyCode: z.literal("USD"),
  providerKey: z.string().min(1).max(64).default("manual_demo"),
  idempotencyKey: idempotencyKeySchema,
  metadata: boundedMetadataSchema
});
