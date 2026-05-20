import { z } from "zod";

export const createPrivateRoomTrustProofReportSchema = z.object({
  reportFormat: z
    .enum(["html", "pdf", "json", "html_and_pdf", "zip"])
    .default("html"),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional()
});
