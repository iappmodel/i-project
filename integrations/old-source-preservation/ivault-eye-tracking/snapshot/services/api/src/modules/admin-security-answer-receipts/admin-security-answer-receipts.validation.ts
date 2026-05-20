import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const answerReceiptQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z.string().min(1).max(64).optional()
});

export const createAnswerReceiptSchema = z.object({
  answerRequestId: uuidSchema,
  metadata: boundedMetadataSchema
});

export const verifyAnswerReceiptSchema = z.object({
  receiptKey: z.string().min(1).max(512),
  receiptHashSha256: z.string().regex(/^[a-f0-9]{64}$/i),
  signature: z.string().min(16).max(2048)
});

export const revokeAnswerReceiptSchema = z.object({
  reason: z.string().min(1).max(5000),
  metadata: boundedMetadataSchema
});

export const idParamSchema = z.object({
  id: uuidSchema
});
