import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  approveAuditPackageRequestSchema,
  auditPackageQuerySchema,
  createAuditPackageRequestSchema,
  grantAuditPackageAccessSchema,
  idParamSchema,
  rejectAuditPackageRequestSchema
} from "./admin-security-audit-packages.validation";
import {
  approveAuditPackageRequest,
  createAuditPackageRequest,
  getAuditPackageIntegrity,
  grantAuditPackageAccess,
  listAuditPackageAccessGrants,
  listAuditPackageItems,
  listAuditPackageRequests,
  listAuditPackages,
  processAuditPackages,
  rejectAuditPackageRequest,
  verifyAuditPackage
} from "./admin-security-audit-packages.service";

export const adminSecurityAuditPackagesRouter = Router();

adminSecurityAuditPackagesRouter.use(requireAdminAuth);

function rid(req: { requestId?: string }): string {
  return req.requestId ?? "";
}

adminSecurityAuditPackagesRouter.get(
  "/requests",
  requireAdminPermission("admin.read"),
  validateQuery(auditPackageQuerySchema),
  async (req, res, next) => {
    try {
      const q = req.validatedQuery!;
      const items = await listAuditPackageRequests({
        limit: q.limit,
        status: q.status,
        requestType: q.requestType,
        requestScope: q.requestScope,
        customerName: q.customerName
      });
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditPackagesRouter.get(
  "/packages",
  requireAdminPermission("admin.read"),
  validateQuery(auditPackageQuerySchema),
  async (req, res, next) => {
    try {
      const q = req.validatedQuery!;
      const items = await listAuditPackages({
        limit: q.limit,
        status: q.status,
        packageType: q.packageType,
        customerName: q.customerName
      });
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditPackagesRouter.get(
  "/items",
  requireAdminPermission("admin.read"),
  validateQuery(auditPackageQuerySchema),
  async (req, res, next) => {
    try {
      const q = req.validatedQuery!;

      const items = await listAuditPackageItems({
        auditPackageId: q.auditPackageId,
        limit: q.limit
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditPackagesRouter.get(
  "/access-grants",
  requireAdminPermission("admin.read"),
  validateQuery(auditPackageQuerySchema),
  async (req, res, next) => {
    try {
      const q = req.validatedQuery!;
      const items = await listAuditPackageAccessGrants({
        limit: q.limit,
        status: q.status
      });
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditPackagesRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getAuditPackageIntegrity();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditPackagesRouter.post(
  "/requests",
  requireAdminPermission("admin.write"),
  validateBody(createAuditPackageRequestSchema),
  async (req, res, next) => {
    try {
      const admin = (req as any).admin;
      const body = req.validatedBody!;

      const data = await createAuditPackageRequest({
        ...body,
        adminAuthUserId: admin.userId,
        requestId: rid(req)
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditPackagesRouter.post(
  "/requests/:id/approve",
  requireAdminPermission("admin.write"),
  validateBody(approveAuditPackageRequestSchema),
  async (req, res, next) => {
    try {
      const params = idParamSchema.parse(req.params);
      const admin = (req as any).admin;
      const body = req.validatedBody!;

      const data = await approveAuditPackageRequest({
        auditPackageRequestId: params.id,
        adminAuthUserId: admin.userId,
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

adminSecurityAuditPackagesRouter.post(
  "/requests/:id/reject",
  requireAdminPermission("admin.write"),
  validateBody(rejectAuditPackageRequestSchema),
  async (req, res, next) => {
    try {
      const params = idParamSchema.parse(req.params);
      const admin = (req as any).admin;
      const body = req.validatedBody!;

      const data = await rejectAuditPackageRequest({
        auditPackageRequestId: params.id,
        adminAuthUserId: admin.userId,
        rejectionReason: body.rejectionReason,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditPackagesRouter.post(
  "/process",
  requireAdminPermission("admin.write"),
  async (req, res, next) => {
    try {
      const data = await processAuditPackages({
        requestId: rid(req)
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditPackagesRouter.post(
  "/packages/:id/verify",
  requireAdminPermission("admin.write"),
  async (req, res, next) => {
    try {
      const params = idParamSchema.parse(req.params);

      const data = await verifyAuditPackage({
        auditPackageId: params.id,
        requestId: rid(req)
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditPackagesRouter.post(
  "/packages/:id/access-grants",
  requireAdminPermission("admin.write"),
  validateBody(grantAuditPackageAccessSchema),
  async (req, res, next) => {
    try {
      const params = idParamSchema.parse(req.params);
      const admin = (req as any).admin;
      const body = req.validatedBody!;

      const data = await grantAuditPackageAccess({
        ...body,
        auditPackageId: params.id,
        adminAuthUserId: admin.userId,
        requestId: rid(req)
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);
