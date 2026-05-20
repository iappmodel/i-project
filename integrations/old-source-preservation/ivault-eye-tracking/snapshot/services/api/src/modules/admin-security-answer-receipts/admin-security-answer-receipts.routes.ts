import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  answerReceiptQuerySchema,
  createAnswerReceiptSchema,
  idParamSchema,
  revokeAnswerReceiptSchema,
  verifyAnswerReceiptSchema
} from "./admin-security-answer-receipts.validation";
import {
  createAnswerReceipt,
  getAnswerReceiptIntegrity,
  listAnswerReceiptCitations,
  listAnswerReceipts,
  listAnswerReceiptVerifications,
  revokeAnswerReceipt,
  verifyAnswerReceipt
} from "./admin-security-answer-receipts.service";

export const adminSecurityAnswerReceiptsRouter = Router();

adminSecurityAnswerReceiptsRouter.use(requireAdminAuth);

adminSecurityAnswerReceiptsRouter.get(
  "/",
  requireAdminPermission("admin.read"),
  validateQuery(answerReceiptQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listAnswerReceipts({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAnswerReceiptsRouter.get(
  "/citations",
  requireAdminPermission("admin.read"),
  validateQuery(answerReceiptQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listAnswerReceiptCitations({
        limit: query.limit
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAnswerReceiptsRouter.get(
  "/verifications",
  requireAdminPermission("admin.read"),
  validateQuery(answerReceiptQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listAnswerReceiptVerifications({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAnswerReceiptsRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getAnswerReceiptIntegrity();
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAnswerReceiptsRouter.post(
  "/",
  requireAdminPermission("admin.write"),
  validateBody(createAnswerReceiptSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;

      const data = await createAnswerReceipt({
        answerRequestId: body.answerRequestId,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAnswerReceiptsRouter.post(
  "/verify",
  requireAdminPermission("admin.read"),
  validateBody(verifyAnswerReceiptSchema),
  async (req, res, next) => {
    try {
      const admin = (req as any).admin;
      const body = (req as any).validatedBody;

      const data = await verifyAnswerReceipt({
        receiptKey: body.receiptKey,
        receiptHashSha256: body.receiptHashSha256,
        signature: body.signature,
        authUserId: admin.userId,
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

adminSecurityAnswerReceiptsRouter.post(
  "/:id/revoke",
  requireAdminPermission("admin.write"),
  validateBody(revokeAnswerReceiptSchema),
  async (req, res, next) => {
    try {
      const params = idParamSchema.safeParse(req.params);
      if (!params.success) {
        return res.status(400).json({
          ok: false,
          data: null,
          error: {
            code: "VALIDATION_FAILED",
            category: "validation",
            message: "The request is invalid.",
            retryable: false,
            httpStatus: 400
          },
          requestId: (req as any).requestId
        });
      }

      const admin = (req as any).admin;
      const body = (req as any).validatedBody;

      const data = await revokeAnswerReceipt({
        adminAuthUserId: admin.userId,
        answerReceiptId: params.data.id,
        reason: body.reason,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
