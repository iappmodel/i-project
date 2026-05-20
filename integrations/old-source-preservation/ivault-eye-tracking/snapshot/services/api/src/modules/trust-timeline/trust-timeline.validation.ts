import { z } from "zod";

export const createPrivateRoomTimelineSnapshotSchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional()
});
