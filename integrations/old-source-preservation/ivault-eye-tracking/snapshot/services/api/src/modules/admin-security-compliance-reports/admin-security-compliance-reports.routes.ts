import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import { sendValidationFailure } from "../../shared/route-helpers";
import {
  approveComplianceReportSchema,
  complianceReportIdParamSchema,
  complianceReportQuerySchema,
  requestComplianceReportSchema
} from "./admin-security-compliance-reports.validation";
import {
  approveComplianceReport,
  getComplianceReportIntegrity,
  listComplianceReportEvidence,
  listComplianceReports,
  listComplianceReportSections,
  registerComplianceReportDownload,
  requestComplianceReport
} from "./admin-security-compliance-reports.service";

export const adminSecurityComplianceReportsRouter = Router();

adminSecurityComplianceReportsRouter.use(requireAdminAuth);

const rid = (req: { requestId?: string }) => req.requestId ?? "unknown";

adminSecurityComplianceReportsRouter.get(
  "/",
  requireAdminPermission("admin.read"),
  validateQuery(complianceReportQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;
      const items = await listComplianceReports({
        limit: query.limit,
        status: query.status,
        auditPeriodId: query.auditPeriodId,
        reportType: query.reportType
      });
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityComplianceReportsRouter.get(
  "/sections",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const items = await listComplianceReportSections({
        reportRequestId:
          typeof req.query.reportRequestId === "string"
            ? req.query.reportRequestId
            : undefined,
        limit: req.query.limit ? Number(req.query.limit) : 100
      });
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityComplianceReportsRouter.get(
  "/evidence",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const items = await listComplianceReportEvidence({
        reportRequestId:
          typeof req.query.reportRequestId === "string"
            ? req.query.reportRequestId
            : undefined,
        limit: req.query.limit ? Number(req.query.limit) : 100
      });
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityComplianceReportsRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getComplianceReportIntegrity();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityComplianceReportsRouter.post(
  "/",
  requireAdminPermission("admin.read"),
  validateBody(requestComplianceReportSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await requestComplianceReport({
        adminAuthUserId: admin.userId,
        auditPeriodId: body.auditPeriodId,
        auditPeriodExportRequestId: body.auditPeriodExportRequestId,
        reportType: body.reportType,
        reportFormat: body.reportFormat,
        reportTitle: body.reportTitle,
        reportAudience: body.reportAudience,
        requestedForAuditorId: body.requestedForAuditorId,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });
      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityComplianceReportsRouter.post(
  "/:id/approve",
  requireAdminPermission("admin.write"),
  validateBody(approveComplianceReportSchema),
  async (req, res, next) => {
    try {
      const params = complianceReportIdParamSchema.safeParse(req.params);
      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const admin = req.admin!;
      const body = req.validatedBody!;
      const data = await approveComplianceReport({
        adminAuthUserId: admin.userId,
        reportRequestId: params.data.id,
        approvalNote: body.approvalNote,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityComplianceReportsRouter.get(
  "/:id/download",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const params = complianceReportIdParamSchema.safeParse(req.params);
      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const admin = req.admin!;
      const data = await registerComplianceReportDownload({
        authUserId: admin.userId,
        reportRequestId: params.data.id,
        requestId: rid(req),
        metadata: {
          source: "admin-compliance-report-download"
        }
      });
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);
