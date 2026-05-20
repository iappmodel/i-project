import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const timelineCryptoQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z.string().min(1).max(64).optional(),
  chainScope: z.string().min(1).max(64).optional()
});

export const chainEventSchema = z.object({
  timelineEventId: uuidSchema,
  metadata: boundedMetadataSchema
});

export const checkpointSchema = z.object({
  chainId: uuidSchema,
  checkpointType: z
    .enum(["scheduled", "manual", "snapshot", "room_close", "audit_export", "legal_hold", "system"])
    .default("manual"),
  metadata: boundedMetadataSchema
});

export const merkleBatchSchema = z.object({
  chainId: uuidSchema,
  fromSequenceNumber: z.number().int().min(1),
  toSequenceNumber: z.number().int().min(1),
  metadata: boundedMetadataSchema
});

export const anchorSchema = z.object({
  chainId: uuidSchema.optional(),
  checkpointId: uuidSchema.optional(),
  merkleBatchId: uuidSchema.optional(),
  anchorType: z
    .enum(["internal", "object_storage", "transparency_log", "blockchain", "notary", "external_audit", "other"])
    .default("internal"),
  metadata: boundedMetadataSchema
});

export const verifyChainSchema = z.object({
  chainId: uuidSchema
});

export const verifyMerkleBatchSchema = z.object({
  merkleBatchId: uuidSchema
});
