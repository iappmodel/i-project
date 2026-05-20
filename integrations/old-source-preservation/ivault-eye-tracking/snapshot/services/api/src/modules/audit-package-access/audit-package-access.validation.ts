import { z } from "zod";

export const auditPackageAccessTokenSchema = z.object({
  token: z.string().min(32).max(256)
});
