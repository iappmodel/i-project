import { z } from "zod";

export const resolveDownloadSchema = z.object({
  downloadToken: z.string().min(32).max(256)
});

export const completeDownloadSchema = z.object({
  downloadGrantId: z.string().uuid(),
  attemptId: z.string().uuid(),
  bytesServed: z.number().int().min(0).optional(),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  signedUrlUsed: z.string().max(4096).optional()
});

export const createPrivateRoomDownloadSchema = z.object({
  artifactKey: z.string().min(1).max(512)
});
