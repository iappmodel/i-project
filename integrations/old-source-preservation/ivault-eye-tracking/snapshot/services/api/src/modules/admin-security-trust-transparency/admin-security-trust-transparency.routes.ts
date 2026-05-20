import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  createTrustTransparencyPortalSchema,
  grantTrustTransparencyAccessSchema,
  idParamSchema,
  trustTransparencyQuerySchema
} from "./admin-security-trust-transparency.validation";
import {
  createTrustTransparencyPortal,
  getTrustTransparencyIntegrity,
  grantTrustTransparencyAccess,
  listPublishedProofStatus,
  listPublishedTrustNotices,
  listTrustTransparencyAccessGrants,
  listTrustTransparencyPortals,
  listTrustTransparencySections,
  processTrustTransparencyPortals,
  publishTrustTransparencyPortal,
  syncTrustTransparencyPortal
} from "./admin-security-trust-transparency.service";

export const adminSecurityTrustTransparencyRouter = Router();

adminSecurityTrustTransparencyRouter.use(requireAdminAuth);

adminSecurityTrustTransparencyRouter.get(
  "/portals",
  requireAdminPermission("admin.read"),
  validateQuery(trustTransparencyQuerySchema),
  async (req, res, next) => {
    try {
      const items = await listTrustTransparencyPortals(req.validatedQuery!);
      return res.json(ok({ items }, req.requestId ?? ""));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTransparencyRouter.get(
  "/sections",
  requireAdminPermission("admin.read"),
  validateQuery(trustTransparencyQuerySchema),
  async (req, res, next) => {
    try {
      const items = await listTrustTransparencySections(req.validatedQuery!);
      return res.json(ok({ items }, req.requestId ?? ""));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTransparencyRouter.get(
  "/notices",
  requireAdminPermission("admin.read"),
  validateQuery(trustTransparencyQuerySchema),
  async (req, res, next) => {
    try {
      const items = await listPublishedTrustNotices(req.validatedQuery!);
      return res.json(ok({ items }, req.requestId ?? ""));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTransparencyRouter.get(
  "/proof-status",
  requireAdminPermission("admin.read"),
  validateQuery(trustTransparencyQuerySchema),
  async (req, res, next) => {
    try {
      const items = await listPublishedProofStatus(req.validatedQuery!);
      return res.json(ok({ items }, req.requestId ?? ""));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTransparencyRouter.get(
  "/access-grants",
  requireAdminPermission("admin.read"),
  validateQuery(trustTransparencyQuerySchema),
  async (req, res, next) => {
    try {
      const items = await listTrustTransparencyAccessGrants(req.validatedQuery!);
      return res.json(ok({ items }, req.requestId ?? ""));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTransparencyRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getTrustTransparencyIntegrity();
      return res.json(ok(data, req.requestId ?? ""));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTransparencyRouter.post(
  "/portals",
  requireAdminPermission("admin.write"),
  validateBody(createTrustTransparencyPortalSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await createTrustTransparencyPortal({
        ...body,
        adminAuthUserId: admin.userId,
        requestId: req.requestId ?? ""
      });

      return res.status(201).json(ok(data, req.requestId ?? ""));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTransparencyRouter.post(
  "/portals/:id/publish",
  requireAdminPermission("admin.write"),
  async (req, res, next) => {
    try {
      const params = idParamSchema.parse(req.params);
      const admin = req.admin!;

      const data = await publishTrustTransparencyPortal({
        transparencyPortalId: params.id,
        adminAuthUserId: admin.userId,
        requestId: req.requestId ?? ""
      });

      return res.json(ok(data, req.requestId ?? ""));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTransparencyRouter.post(
  "/portals/:id/sync",
  requireAdminPermission("admin.write"),
  async (req, res, next) => {
    try {
      const params = idParamSchema.parse(req.params);

      const data = await syncTrustTransparencyPortal({
        transparencyPortalId: params.id,
        requestId: req.requestId ?? ""
      });

      return res.json(ok(data, req.requestId ?? ""));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTransparencyRouter.post(
  "/process",
  requireAdminPermission("admin.write"),
  async (req, res, next) => {
    try {
      const data = await processTrustTransparencyPortals({
        requestId: req.requestId ?? ""
      });

      return res.json(ok(data, req.requestId ?? ""));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTransparencyRouter.post(
  "/portals/:id/access-grants",
  requireAdminPermission("admin.write"),
  validateBody(grantTrustTransparencyAccessSchema),
  async (req, res, next) => {
    try {
      const params = idParamSchema.parse(req.params);
      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await grantTrustTransparencyAccess({
        ...body,
        transparencyPortalId: params.id,
        adminAuthUserId: admin.userId,
        requestId: req.requestId ?? ""
      });

      return res.status(201).json(ok(data, req.requestId ?? ""));
    } catch (err) {
      next(err);
    }
  }
);
