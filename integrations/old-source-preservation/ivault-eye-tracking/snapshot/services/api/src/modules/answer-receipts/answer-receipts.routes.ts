import { Router } from "express";
import { validateBody } from "../../middleware/validate";
import { ok } from "../../shared/api-response";
import {
  createAnswerReceiptSchema,
  verifyAnswerReceiptSchema
} from "./answer-receipts.validation";
import {
  createAnswerReceipt,
  verifyAnswerReceipt
} from "./answer-receipts.service";

export const answerReceiptsRouter = Router();

answerReceiptsRouter.post(
  "/",
  validateBody(createAnswerReceiptSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;

      const data = await createAnswerReceipt({
        answerRequestId: body.answerRequestId,
        requestId: (req as any).requestId
      });

      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

answerReceiptsRouter.post(
  "/verify",
  validateBody(verifyAnswerReceiptSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const authUser = (req as any).auth ?? (req as any).user;

      const data = await verifyAnswerReceipt({
        receiptKey: body.receiptKey,
        receiptHashSha256: body.receiptHashSha256,
        signature: body.signature,
        authUserId: authUser?.id,
        requesterIp: req.ip,
        userAgent: req.headers["user-agent"],
        requestId: (req as any).requestId
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
