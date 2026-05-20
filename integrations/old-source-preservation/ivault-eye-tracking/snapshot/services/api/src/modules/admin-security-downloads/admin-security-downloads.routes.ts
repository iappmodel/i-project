import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  createDownloadGrantSchema,
  downloadQuerySchema,
  idParamSchema,
  revokeDownloadGrantSchema
} from "./admin-security-downloads.validation";
import {
  createDownloadGrant,
  getDownloadIntegrity,
  listDownloadAttempts,
  listDownloadGrants,
  listDownloadSubjects,
  revokeDownloadGrant
} from "./admin-security-downloads.service";

export const adminSecurityDownloadsRouter = Router();

adminSecurityDownloadsRouter.use(requireAdminAuth);

adminSecurityDownloadsRouter.get(
  "/subjects",
  requireAdminPermission("admin.read"),
  validateQuery(downloadQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listDownloadSubjects({
        limit: query.limit,
        status: query.status,
        artifactType: query.artifactType
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityDownloadsRouter.get(
  "/grants",
  requireAdminPermission("admin.read"),
  validateQuery(downloadQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listDownloadGrants({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityDownloadsRouter.get(
  "/attempts",
  requireAdminPermission("admin.read"),
  validateQuery(downloadQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listDownloadAttempts({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityDownloadsRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getDownloadIntegrity();
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityDownloadsRouter.post(
  "/grants",
  requireAdminPermission("admin.write"),
  validateBody(createDownloadGrantSchema),
  async (req, res, next) => {
    try {
      const admin = (req as any).admin;
      const body = (req as any).validatedBody;

      const data = await createDownloadGrant({
        adminAuthUserId: admin.userId,
        ...body,
        requestId: (req as any).requestId
      });

      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityDownloadsRouter.post(
  "/grants/:id/revoke",
  requireAdminPermission("admin.write"),
  validateBody(revokeDownloadGrantSchema),
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

      const data = await revokeDownloadGrant({
        adminAuthUserId: admin.userId,
        downloadGrantId: params.data.id,
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
