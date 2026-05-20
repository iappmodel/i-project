import { Router } from "express";
import { validateBody } from "../../middleware/validate";
import { ok } from "../../shared/api-response";
import { createAnswerReceiptExportBundleSchema } from "./answer-receipt-exports.validation";
import { createAnswerReceiptExportBundle } from "./answer-receipt-exports.service";

export const answerReceiptExportsRouter = Router();

answerReceiptExportsRouter.post(
  "/bundles",
  validateBody(createAnswerReceiptExportBundleSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const data = await createAnswerReceiptExportBundle({
        answerReceiptId: body.answerReceiptId,
        exportFormat: body.exportFormat,
        includePdfSummary: body.includePdfSummary,
        requestId: (req as any).requestId
      });

      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
