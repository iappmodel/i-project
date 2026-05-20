import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const trustBillingQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),

  status: z.string().min(1).max(64).optional(),
  customerName: z.string().max(256).optional(),
  planCode: z.string().max(128).optional()
});

export const createTrustBillingAccountSchema = z.object({
  customerName: z.string().min(1).max(256),
  customerDomain: z.string().max(256).optional(),
  planCode: z.string().min(1).max(128),
  billingEmail: z.string().email().optional(),
  billingContactName: z.string().max(256).optional(),
  billingCycle: z.enum(["monthly", "annual", "custom", "internal"]).default("monthly"),
  externalCustomerId: z.string().max(256).optional(),
  externalSubscriptionId: z.string().max(256).optional(),
  externalPaymentProvider: z.string().max(128).optional(),
  trialEndsAt: z.string().max(64).optional(),
  metadata: boundedMetadataSchema
});

export const entitlementCheckSchema = z.object({
  customerName: z.string().min(1).max(256),
  customerDomain: z.string().max(256).optional(),
  feature: z.string().max(128).optional(),
  meterName: z.string().max(128).optional(),
  requestedQuantity: z.number().min(0).default(1),
  metadata: boundedMetadataSchema
});

export const recordUsageSchema = z.object({
  customerName: z.string().min(1).max(256),
  customerDomain: z.string().max(256).optional(),
  meterName: z.string().min(1).max(128),
  meterCategory: z.string().min(1).max(128),
  quantity: z.number().min(0).default(1),
  sourceType: z.string().max(128).default("manual"),
  sourceId: uuidSchema.optional(),
  sourceKey: z.string().max(2048).optional(),
  privateRoomId: uuidSchema.optional(),
  proofType: z.string().max(128).optional(),
  proofKey: z.string().max(2048).optional(),
  occurredAt: z.string().max(64).optional(),
  dedupeKey: z.string().max(2048).optional(),
  metadata: boundedMetadataSchema
});

export const finalizeBillingPeriodSchema = z.object({
  billingPeriodId: uuidSchema,
  metadata: boundedMetadataSchema
});

export const createInvoiceFromPeriodSchema = z.object({
  billingPeriodId: uuidSchema,
  dueDays: z.number().int().min(0).max(365).default(30),
  metadata: boundedMetadataSchema
});

export const idParamSchema = z.object({
  id: uuidSchema
});
