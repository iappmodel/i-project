import { z } from "zod";

export const publicTrustCenterKeyParamSchema = z.object({
  trustCenterKey: z.string().min(1).max(128).default("default")
});

export const publicTrustCenterQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 100))
    .pipe(z.number().int().min(1).max(250))
});

export const verifyTrustCenterManifestSchema = z.object({
  manifestKey: z.string().min(1).max(512),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/i),
  signature: z.string().min(16).max(2048)
});
