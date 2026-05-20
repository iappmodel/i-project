import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const requestIdSchema = z.string().min(1).max(128).optional();

export const idempotencyKeySchema = z.string().min(8).max(256);

export const metadataSchema = z.record(z.string(), z.unknown()).optional();

export const boundedMetadataSchema = z
  .record(z.string(), z.unknown())
  .optional()
  .refine(
    (value) => JSON.stringify(value ?? {}).length <= 16_384,
    "metadata must be <= 16KB"
  );

export const platformSchema = z.enum(["ios", "android", "web", "desktop", "server"]);

export const scoreSchema = z.number().min(0).max(1);

export const positiveIntSchema = z.number().int().positive();

export const nonnegativeIntSchema = z.number().int().nonnegative();

export const safeTextSchema = z.string().min(1).max(512);
