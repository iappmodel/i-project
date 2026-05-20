import { z } from "zod";

export const trustPortalSlugSchema = z.object({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{2,120}$/)
});

export const trustTransparencyAccessTokenSchema = z.object({
  token: z.string().min(32).max(256)
});
