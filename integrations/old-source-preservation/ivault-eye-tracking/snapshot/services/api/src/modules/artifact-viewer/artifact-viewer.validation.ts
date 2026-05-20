import { z } from "zod";

export const createPrivateRoomViewerSessionSchema = z.object({
  artifactKey: z.string().min(1).max(512)
});

export const resolveViewerSessionSchema = z.object({
  viewerToken: z.string().min(32).max(256),
  pageNumber: z.number().int().min(1).max(10000).optional(),
  itemKey: z.string().min(1).max(512).optional()
});
