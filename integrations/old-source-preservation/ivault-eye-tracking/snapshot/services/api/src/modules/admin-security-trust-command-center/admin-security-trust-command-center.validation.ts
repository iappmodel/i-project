import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const trustCommandCenterQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),

  status: z.string().min(1).max(64).optional(),
  customerName: z.string().max(256).optional(),
  customerDomain: z.string().max(256).optional(),
  queueType: z.string().max(128).optional(),
  severity: z.string().max(64).optional(),
  cardGroup: z.string().max(128).optional()
});

export type TrustCommandCenterQuery = z.infer<typeof trustCommandCenterQuerySchema>;

export const refreshCommandCenterSchema = z.object({
  customerName: z.string().max(256).optional(),
  customerDomain: z.string().max(256).optional(),
  metadata: boundedMetadataSchema
});

export type RefreshCommandCenterBody = z.infer<typeof refreshCommandCenterSchema>;

export const resolveQueueItemSchema = z.object({
  resolutionNote: z.string().min(1).max(4000),
  metadata: boundedMetadataSchema
});

export const idParamSchema = z.object({
  id: uuidSchema
});
