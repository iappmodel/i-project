import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  artifactSearchQuerySchema,
  createSearchSessionSchema,
  executeSearchSchema,
  registerSearchDocumentSchema
} from "./admin-security-artifact-search.validation";
import {
  createSearchSession,
  executeSearch,
  getSearchIntegrity,
  listSearchChunks,
  listSearchDocuments,
  listSearchQueries,
  listSearchSessions,
  registerSearchDocument
} from "./admin-security-artifact-search.service";

export const adminSecurityArtifactSearchRouter = Router();

adminSecurityArtifactSearchRouter.use(requireAdminAuth);

adminSecurityArtifactSearchRouter.get(
  "/documents",
  requireAdminPermission("admin.read"),
  validateQuery(artifactSearchQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;

      const items = await listSearchDocuments({
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

adminSecurityArtifactSearchRouter.get(
  "/chunks",
  requireAdminPermission("admin.read"),
  validateQuery(artifactSearchQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listSearchChunks({ limit: query.limit });
      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityArtifactSearchRouter.get(
  "/sessions",
  requireAdminPermission("admin.read"),
  validateQuery(artifactSearchQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;

      const items = await listSearchSessions({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityArtifactSearchRouter.get(
  "/queries",
  requireAdminPermission("admin.read"),
  validateQuery(artifactSearchQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;

      const items = await listSearchQueries({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityArtifactSearchRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getSearchIntegrity();
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityArtifactSearchRouter.post(
  "/documents",
  requireAdminPermission("admin.write"),
  validateBody(registerSearchDocumentSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;

      const data = await registerSearchDocument({
        viewerSubjectId: body.viewerSubjectId,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityArtifactSearchRouter.post(
  "/sessions",
  requireAdminPermission("admin.write"),
  validateBody(createSearchSessionSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;

      const data = await createSearchSession({
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

adminSecurityArtifactSearchRouter.post(
  "/execute",
  requireAdminPermission("admin.read"),
  validateBody(executeSearchSchema),
  async (req, res, next) => {
    try {
      const admin = (req as any).admin;
      const body = (req as any).validatedBody;

      const data = await executeSearch({
        ...body,
        authUserId: admin.userId,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        requestId: (req as any).requestId
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
