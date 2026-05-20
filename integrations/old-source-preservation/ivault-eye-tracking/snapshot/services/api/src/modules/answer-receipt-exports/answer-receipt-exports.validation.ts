import { z } from "zod";

export const createAnswerReceiptExportBundleSchema = z.object({
  answerReceiptId: z.string().uuid(),
  exportFormat: z
    .enum(["json", "zip", "pdf", "json_and_pdf", "zip_with_pdf"])
    .default("json"),
  includePdfSummary: z.boolean().default(false)
});
