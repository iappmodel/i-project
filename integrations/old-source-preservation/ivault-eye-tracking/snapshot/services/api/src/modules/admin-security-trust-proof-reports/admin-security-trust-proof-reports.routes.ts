import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  createTrustProofReportSchema,
  idParamSchema,
  revokeTrustProofReportSchema,
  trustProofReportQuerySchema
} from "./admin-security-trust-proof-reports.validation";
import {
  createTrustProofReport,
  getTrustProofReportIntegrity,
  listTrustProofReportFiles,
  listTrustProofReportItems,
  listTrustProofReportJobs,
  listTrustProofReports,
  listTrustProofReportSections,
  revokeTrustProofReport
} from "./admin-security-trust-proof-reports.service";

export const adminSecurityTrustProofReportsRouter = Router();

adminSecurityTrustProofReportsRouter.use(requireAdminAuth);

adminSecurityTrustProofReportsRouter.get(
  "/",
  requireAdminPermission("admin.read"),
  validateQuery(trustProofReportQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listTrustProofReports({
        limit: query.limit,
        status: query.status,
        reportScope: query.reportScope,
        customerName: query.customerName,
        privateRoomId: query.privateRoomId
      });
      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustProofReportsRouter.get(
  "/sections",
  requireAdminPermission("admin.read"),
  validateQuery(trustProofReportQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listTrustProofReportSections({ limit: query.limit });
      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustProofReportsRouter.get(
  "/items",
  requireAdminPermission("admin.read"),
  validateQuery(trustProofReportQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listTrustProofReportItems({ limit: query.limit });
      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustProofReportsRouter.get(
  "/files",
  requireAdminPermission("admin.read"),
  validateQuery(trustProofReportQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listTrustProofReportFiles({ limit: query.limit });
      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustProofReportsRouter.get(
  "/jobs",
  requireAdminPermission("admin.read"),
  validateQuery(trustProofReportQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listTrustProofReportJobs({
        limit: query.limit,
        status: query.status
      });
      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustProofReportsRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getTrustProofReportIntegrity();
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustProofReportsRouter.post(
  "/",
  requireAdminPermission("admin.write"),
  validateBody(createTrustProofReportSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const data = await createTrustProofReport({
        ...body,
        requestId: (req as any).requestId
      });
      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustProofReportsRouter.post(
  "/:id/revoke",
  requireAdminPermission("admin.write"),
  validateBody(revokeTrustProofReportSchema),
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
      const data = await revokeTrustProofReport({
        adminAuthUserId: admin.userId,
        reportId: params.data.id,
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
