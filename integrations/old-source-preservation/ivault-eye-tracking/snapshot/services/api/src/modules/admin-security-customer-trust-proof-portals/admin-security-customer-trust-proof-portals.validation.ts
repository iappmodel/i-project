import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const customerTrustProofPortalQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z.string().min(1).max(64).optional(),
  customerName: z.string().max(256).optional(),
  privateRoomId: uuidSchema.optional()
});

export const createPrivateRoomPortalSchema = z.object({
  privateRoomId: uuidSchema,
  metadata: boundedMetadataSchema
});
