import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  artifactViewerQuerySchema,
  createViewerSessionSchema,
  queueViewerRenderSchema
} from "./admin-security-artifact-viewer.validation";
import {
  createViewerSession,
  getViewerIntegrity,
  listViewerAccessEvents,
  listViewerRenderJobs,
  listViewerSessions,
  listViewerSubjects,
  queueViewerRenderJob
} from "./admin-security-artifact-viewer.service";

export const adminSecurityArtifactViewerRouter = Router();

adminSecurityArtifactViewerRouter.use(requireAdminAuth);

adminSecurityArtifactViewerRouter.get(
  "/subjects",
  requireAdminPermission("admin.read"),
  validateQuery(artifactViewerQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listViewerSubjects({
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

adminSecurityArtifactViewerRouter.get(
  "/sessions",
  requireAdminPermission("admin.read"),
  validateQuery(artifactViewerQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listViewerSessions({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityArtifactViewerRouter.get(
  "/render-jobs",
  requireAdminPermission("admin.read"),
  validateQuery(artifactViewerQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listViewerRenderJobs({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityArtifactViewerRouter.get(
  "/access-events",
  requireAdminPermission("admin.read"),
  validateQuery(artifactViewerQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listViewerAccessEvents({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityArtifactViewerRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getViewerIntegrity();
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityArtifactViewerRouter.post(
  "/render-jobs",
  requireAdminPermission("admin.write"),
  validateBody(queueViewerRenderSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;

      const data = await queueViewerRenderJob({
        viewerSubjectId: body.viewerSubjectId,
        renderMode: body.renderMode,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityArtifactViewerRouter.post(
  "/sessions",
  requireAdminPermission("admin.write"),
  validateBody(createViewerSessionSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;

      const data = await createViewerSession({
        ...body,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        requestId: (req as any).requestId
      });

      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
