import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  answerReceiptExportQuerySchema,
  createAnswerReceiptExportBundleSchema,
  idParamSchema,
  revokeAnswerReceiptExportBundleSchema
} from "./admin-security-answer-receipt-exports.validation";
import {
  createAnswerReceiptExportBundle,
  getAnswerReceiptExportBundleIntegrity,
  listAnswerReceiptExportBundleFiles,
  listAnswerReceiptExportBundleItems,
  listAnswerReceiptExportBundleJobs,
  listAnswerReceiptExportBundles,
  revokeAnswerReceiptExportBundle
} from "./admin-security-answer-receipt-exports.service";

export const adminSecurityAnswerReceiptExportsRouter = Router();

adminSecurityAnswerReceiptExportsRouter.use(requireAdminAuth);

adminSecurityAnswerReceiptExportsRouter.get(
  "/bundles",
  requireAdminPermission("admin.read"),
  validateQuery(answerReceiptExportQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listAnswerReceiptExportBundles({
        limit: query.limit,
        status: query.status
      });
      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAnswerReceiptExportsRouter.get(
  "/items",
  requireAdminPermission("admin.read"),
  validateQuery(answerReceiptExportQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listAnswerReceiptExportBundleItems({
        limit: query.limit
      });
      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAnswerReceiptExportsRouter.get(
  "/files",
  requireAdminPermission("admin.read"),
  validateQuery(answerReceiptExportQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listAnswerReceiptExportBundleFiles({
        limit: query.limit
      });
      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAnswerReceiptExportsRouter.get(
  "/jobs",
  requireAdminPermission("admin.read"),
  validateQuery(answerReceiptExportQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listAnswerReceiptExportBundleJobs({
        limit: query.limit,
        status: query.status
      });
      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAnswerReceiptExportsRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getAnswerReceiptExportBundleIntegrity();
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAnswerReceiptExportsRouter.post(
  "/bundles",
  requireAdminPermission("admin.write"),
  validateBody(createAnswerReceiptExportBundleSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const data = await createAnswerReceiptExportBundle({
        answerReceiptId: body.answerReceiptId,
        bundleType: body.bundleType,
        exportFormat: body.exportFormat,
        includePdfSummary: body.includePdfSummary,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAnswerReceiptExportsRouter.post(
  "/bundles/:id/revoke",
  requireAdminPermission("admin.write"),
  validateBody(revokeAnswerReceiptExportBundleSchema),
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

      const data = await revokeAnswerReceiptExportBundle({
        adminAuthUserId: admin.userId,
        exportBundleId: params.data.id,
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
