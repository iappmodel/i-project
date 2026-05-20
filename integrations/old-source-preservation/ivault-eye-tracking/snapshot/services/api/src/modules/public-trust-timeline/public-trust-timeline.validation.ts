import { z } from "zod";

export const publicTrustTimelineQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 100))
    .pipe(z.number().int().min(1).max(250)),
  scope: z.string().min(1).max(128).optional()
});

export const roomTrustTimelineQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 100))
    .pipe(z.number().int().min(1).max(250))
});
