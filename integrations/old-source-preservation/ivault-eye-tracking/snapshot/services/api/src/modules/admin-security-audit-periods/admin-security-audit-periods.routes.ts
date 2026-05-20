import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import { sendValidationFailure } from "../../shared/route-helpers";
import {
  approveAuditPeriodExport,
  buildAuditSnapshot,
  closeAuditPeriod,
  createAuditPeriod,
  getAuditPeriodExportIntegrity,
  getAuditPeriodIntegrity,
  listAuditPeriodExportItems,
  listAuditPeriodExports,
  listAuditPeriods,
  listAuditSnapshotItems,
  listAuditSnapshots,
  openAuditPeriod,
  registerAuditPeriodExportDownload,
  requestAuditPeriodExport,
  sealAuditPeriod,
  sealAuditSnapshot
} from "./admin-security-audit-periods.service";
import {
  approveAuditPeriodExportSchema,
  auditPeriodActionSchema,
  auditPeriodExportIdParamSchema,
  auditPeriodExportQuerySchema,
  auditPeriodIdParamSchema,
  auditPeriodQuerySchema,
  auditSnapshotIdParamSchema,
  buildAuditSnapshotSchema,
  closeAuditPeriodSchema,
  createAuditPeriodSchema,
  requestAuditPeriodExportSchema,
  sealSnapshotSchema
} from "./admin-security-audit-periods.validation";

export const adminSecurityAuditPeriodsRouter = Router();
adminSecurityAuditPeriodsRouter.use(requireAdminAuth);

const rid = (req: { requestId?: string }) => req.requestId ?? "unknown";

adminSecurityAuditPeriodsRouter.get(
  "/",
  requireAdminPermission("admin.read"),
  validateQuery(auditPeriodQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;
      const items = await listAuditPeriods({
        limit: query.limit,
        status: query.status,
        auditType: query.auditType
      });
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditPeriodsRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getAuditPeriodIntegrity();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditPeriodsRouter.get(
  "/snapshots",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const items = await listAuditSnapshots({
        auditPeriodId:
          typeof req.query.auditPeriodId === "string" ? req.query.auditPeriodId : undefined,
        limit: req.query.limit ? Number(req.query.limit) : 100
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditPeriodsRouter.get(
  "/snapshot-items",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const items = await listAuditSnapshotItems({
        auditPeriodId:
          typeof req.query.auditPeriodId === "string" ? req.query.auditPeriodId : undefined,
        snapshotId: typeof req.query.snapshotId === "string" ? req.query.snapshotId : undefined,
        limit: req.query.limit ? Number(req.query.limit) : 100
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditPeriodsRouter.post(
  "/",
  requireAdminPermission("admin.write"),
  validateBody(createAuditPeriodSchema),
  async (req, res, next) => {
    try {
      const body = req.validatedBody!;
      const data = await createAuditPeriod({
        adminAuthUserId: req.admin!.userId,
        periodKey: body.periodKey,
        periodName: body.periodName,
        auditType: body.auditType,
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
        description: body.description,
        ownerTeam: body.ownerTeam,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditPeriodsRouter.post(
  "/:id/open",
  requireAdminPermission("admin.write"),
  validateBody(auditPeriodActionSchema),
  async (req, res, next) => {
    try {
      const params = auditPeriodIdParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const body = req.validatedBody!;
      const data = await openAuditPeriod({
        adminAuthUserId: req.admin!.userId,
        auditPeriodId: params.data.id,
        note: body.note,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditPeriodsRouter.post(
  "/:id/close",
  requireAdminPermission("admin.write"),
  validateBody(closeAuditPeriodSchema),
  async (req, res, next) => {
    try {
      const params = auditPeriodIdParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const body = req.validatedBody!;
      const data = await closeAuditPeriod({
        adminAuthUserId: req.admin!.userId,
        auditPeriodId: params.data.id,
        note: body.note,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditPeriodsRouter.post(
  "/:id/snapshots",
  requireAdminPermission("admin.write"),
  validateBody(buildAuditSnapshotSchema),
  async (req, res, next) => {
    try {
      const params = auditPeriodIdParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const body = req.validatedBody!;
      const data = await buildAuditSnapshot({
        adminAuthUserId: req.admin!.userId,
        auditPeriodId: params.data.id,
        snapshotType: body.snapshotType,
        snapshotKey: body.snapshotKey,
        snapshotName: body.snapshotName,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditPeriodsRouter.post(
  "/snapshots/:id/seal",
  requireAdminPermission("admin.write"),
  validateBody(sealSnapshotSchema),
  async (req, res, next) => {
    try {
      const params = auditSnapshotIdParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const body = req.validatedBody!;
      const data = await sealAuditSnapshot({
        adminAuthUserId: req.admin!.userId,
        snapshotId: params.data.id,
        note: body.note,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditPeriodsRouter.post(
  "/:id/seal",
  requireAdminPermission("admin.write"),
  validateBody(sealSnapshotSchema),
  async (req, res, next) => {
    try {
      const params = auditPeriodIdParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const body = req.validatedBody!;
      const data = await sealAuditPeriod({
        adminAuthUserId: req.admin!.userId,
        auditPeriodId: params.data.id,
        note: body.note,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditPeriodsRouter.get(
  "/exports",
  requireAdminPermission("admin.read"),
  validateQuery(auditPeriodExportQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;
      const items = await listAuditPeriodExports({
        limit: query.limit,
        status: query.status,
        auditPeriodId: query.auditPeriodId
      });
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditPeriodsRouter.get(
  "/export-items",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const items = await listAuditPeriodExportItems({
        exportRequestId:
          typeof req.query.exportRequestId === "string"
            ? req.query.exportRequestId
            : undefined,
        auditPeriodId:
          typeof req.query.auditPeriodId === "string"
            ? req.query.auditPeriodId
            : undefined,
        limit: req.query.limit ? Number(req.query.limit) : 100
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditPeriodsRouter.get(
  "/exports/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getAuditPeriodExportIntegrity();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditPeriodsRouter.post(
  "/:id/exports",
  requireAdminPermission("admin.read"),
  validateBody(requestAuditPeriodExportSchema),
  async (req, res, next) => {
    try {
      const params = auditPeriodIdParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const body = req.validatedBody!;
      const data = await requestAuditPeriodExport({
        adminAuthUserId: req.admin!.userId,
        auditPeriodId: params.data.id,
        exportType: body.exportType,
        exportFormat: body.exportFormat,
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

adminSecurityAuditPeriodsRouter.post(
  "/exports/:id/approve",
  requireAdminPermission("admin.write"),
  validateBody(approveAuditPeriodExportSchema),
  async (req, res, next) => {
    try {
      const params = auditPeriodExportIdParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const body = req.validatedBody!;
      const data = await approveAuditPeriodExport({
        adminAuthUserId: req.admin!.userId,
        exportRequestId: params.data.id,
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

adminSecurityAuditPeriodsRouter.get(
  "/exports/:id/download",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const params = auditPeriodExportIdParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const data = await registerAuditPeriodExportDownload({
        authUserId: req.admin!.userId,
        exportRequestId: params.data.id,
        requestId: rid(req),
        metadata: {
          source: "admin-security-audit-period-export-download"
        }
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);
