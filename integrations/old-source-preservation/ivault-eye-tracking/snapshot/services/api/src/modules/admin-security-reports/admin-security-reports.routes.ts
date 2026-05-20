import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  createSecuritySnapshotSchema,
  generateSecurityReportSchema,
  markSecurityReportExportedSchema,
  securityReportIdParamSchema,
  securityReportQuerySchema,
  securitySnapshotQuerySchema
} from "./admin-security-reports.validation";
import {
  createSecurityDailySnapshot,
  generateSecurityReport,
  getComplianceVerificationIntegrity,
  getSecuritySnapshotIntegrity,
  listSecurityDailySnapshots,
  listSecurityReports,
  markSecurityReportExported
} from "./admin-security-reports.service";

export const adminSecurityReportsRouter = Router();

adminSecurityReportsRouter.use(requireAdminAuth);

const rid = (req: { requestId?: string }) => req.requestId ?? "unknown";

adminSecurityReportsRouter.get(
  "/snapshots",
  requireAdminPermission("admin.read"),
  validateQuery(securitySnapshotQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;

      const items = await listSecurityDailySnapshots({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityReportsRouter.post(
  "/snapshots",
  requireAdminPermission("admin.write"),
  validateBody(createSecuritySnapshotSchema),
  async (req, res, next) => {
    try {
      const body = req.validatedBody!;

      const data = await createSecurityDailySnapshot({
        snapshotDate: body.snapshotDate,
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityReportsRouter.get(
  "/verification-integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getComplianceVerificationIntegrity();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityReportsRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getSecuritySnapshotIntegrity();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityReportsRouter.get(
  "/reports",
  requireAdminPermission("admin.read"),
  validateQuery(securityReportQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;

      const items = await listSecurityReports({
        limit: query.limit,
        reportType: query.reportType,
        status: query.status
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityReportsRouter.post(
  "/reports",
  requireAdminPermission("admin.read"),
  validateBody(generateSecurityReportSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await generateSecurityReport({
        adminAuthUserId: admin.userId,
        reportType: body.reportType,
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityReportsRouter.post(
  "/reports/:id/exported",
  requireAdminPermission("admin.write"),
  validateBody(markSecurityReportExportedSchema),
  async (req, res, next) => {
    try {
      const params = securityReportIdParamSchema.safeParse(req.params);

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
          requestId: rid(req)
        });
      }

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await markSecurityReportExported({
        adminAuthUserId: admin.userId,
        reportId: params.data.id,
        exportFormat: body.exportFormat,
        exportUrl: body.exportUrl,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);
