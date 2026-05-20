import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  impactAnalysisSchema,
  propagationJobSchema,
  runDependencyJobSchema,
  trustDependencyQuerySchema,
  upsertTrustDependencySchema
} from "./admin-security-trust-dependencies.validation";
import {
  getTrustDependencyIntegrity,
  listImpactAnalyses,
  listPropagationEvents,
  listTrustDependencies,
  processPropagationEvents,
  runImpactAnalysis,
  runTrustDependencyDiscovery,
  upsertTrustDependency
} from "./admin-security-trust-dependencies.service";

export const adminSecurityTrustDependenciesRouter = Router();

adminSecurityTrustDependenciesRouter.use(requireAdminAuth);

adminSecurityTrustDependenciesRouter.get(
  "/",
  requireAdminPermission("admin.read"),
  validateQuery(trustDependencyQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;

      const items = await listTrustDependencies({
        limit: query.limit,
        status: query.status,
        parentSourceType: query.parentSourceType,
        childSourceType: query.childSourceType
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustDependenciesRouter.get(
  "/impact-analyses",
  requireAdminPermission("admin.read"),
  validateQuery(trustDependencyQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listImpactAnalyses({ limit: query.limit });
      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustDependenciesRouter.get(
  "/propagation-events",
  requireAdminPermission("admin.read"),
  validateQuery(trustDependencyQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listPropagationEvents({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustDependenciesRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getTrustDependencyIntegrity();
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustDependenciesRouter.post(
  "/",
  requireAdminPermission("admin.write"),
  validateBody(upsertTrustDependencySchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const data = await upsertTrustDependency({
        ...body,
        requestId: (req as any).requestId
      });
      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustDependenciesRouter.post(
  "/discover",
  requireAdminPermission("admin.write"),
  validateBody(runDependencyJobSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const data = await runTrustDependencyDiscovery({
        batchSize: body.batchSize,
        metadata: body.metadata ?? {}
      });
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustDependenciesRouter.post(
  "/impact-analyses",
  requireAdminPermission("admin.read"),
  validateBody(impactAnalysisSchema),
  async (req, res, next) => {
    try {
      const admin = (req as any).admin;
      const body = (req as any).validatedBody;

      const data = await runImpactAnalysis({
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

adminSecurityTrustDependenciesRouter.post(
  "/process-propagation",
  requireAdminPermission("admin.write"),
  validateBody(propagationJobSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const data = await processPropagationEvents({
        batchSize: body.batchSize,
        metadata: body.metadata ?? {}
      });
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
