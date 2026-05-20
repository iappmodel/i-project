import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  queueTrustCenterManifestSchema,
  trustCenterQuerySchema
} from "./admin-security-trust-center.validation";
import {
  getTrustCenterIntegrity,
  listTrustCenterManifests,
  listTrustCenterProfiles,
  queueTrustCenterManifest
} from "./admin-security-trust-center.service";

export const adminSecurityTrustCenterRouter = Router();

adminSecurityTrustCenterRouter.use(requireAdminAuth);

adminSecurityTrustCenterRouter.get(
  "/profiles",
  requireAdminPermission("admin.read"),
  validateQuery(trustCenterQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;

      const items = await listTrustCenterProfiles({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustCenterRouter.get(
  "/manifests",
  requireAdminPermission("admin.read"),
  validateQuery(trustCenterQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;

      const items = await listTrustCenterManifests({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustCenterRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getTrustCenterIntegrity();
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustCenterRouter.post(
  "/manifests",
  requireAdminPermission("admin.write"),
  validateBody(queueTrustCenterManifestSchema),
  async (req, res, next) => {
    try {
      const admin = (req as any).admin;
      const body = (req as any).validatedBody;

      const data = await queueTrustCenterManifest({
        adminAuthUserId: admin.userId,
        trustCenterKey: body.trustCenterKey,
        visibility: body.visibility,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
