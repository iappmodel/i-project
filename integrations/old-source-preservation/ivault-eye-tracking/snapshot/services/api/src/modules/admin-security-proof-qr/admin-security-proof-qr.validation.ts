import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const proofQrQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z.string().min(1).max(64).optional(),
  proofType: z.string().min(1).max(128).optional()
});

export const createProofVerificationLinkSchema = z.object({
  proofType: z.enum([
    "answer_receipt",
    "answer_receipt_export_bundle",
    "trust_proof_report",
    "trust_timeline_snapshot",
    "timeline_chain_checkpoint",
    "timeline_merkle_batch",
    "timeline_anchor",
    "timeline_chain",
    "other"
  ]),
  proofId: uuidSchema.optional(),
  proofKey: z.string().min(1).max(2048).optional(),
  title: z.string().min(1).max(512).optional(),
  summary: z.string().max(2000).optional(),
  baseUrl: z.string().url().optional(),
  expiresAt: z.string().datetime().optional(),
  maxUses: z.number().int().min(1).max(1000000).optional(),
  metadata: boundedMetadataSchema
});

export const createProofQrCodeSchema = z.object({
  verificationLinkId: uuidSchema,
  qrFormat: z.enum(["svg", "png", "webp", "pdf", "json"]).default("svg"),
  sizePx: z.number().int().min(128).max(2048).default(512),
  includeLogo: z.boolean().default(false),
  metadata: boundedMetadataSchema
});

export const revokeProofVerificationLinkSchema = z.object({
  reason: z.string().min(1).max(5000),
  metadata: boundedMetadataSchema
});

export const idParamSchema = z.object({
  id: uuidSchema
});
