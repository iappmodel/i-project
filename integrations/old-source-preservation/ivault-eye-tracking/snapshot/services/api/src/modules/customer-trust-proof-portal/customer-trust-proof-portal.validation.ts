import { z } from "zod";

export const portalTokenBodySchema = z.object({
  portalToken: z.string().min(32).max(256)
});

export const portalListBodySchema = z.object({
  portalToken: z.string().min(32).max(256),
  limit: z.number().int().min(1).max(100).default(50)
});
