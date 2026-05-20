import { z } from "zod";

export const resolveProofLinkSchema = z.object({
  code: z.string().min(4).max(64),
  token: z.string().min(32).max(256)
});
