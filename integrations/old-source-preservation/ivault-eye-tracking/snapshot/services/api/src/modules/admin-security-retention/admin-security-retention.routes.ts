import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  executeRetentionDeletionSchema,
  idParamSchema,
  placeLegalHoldSchema,
  registerRetentionSubjectSchema,
  releaseLegalHoldSchema,
  retentionQuerySchema,
  runRetentionJobSchema
} from "./admin-security-retention.validation";
import {
  discoverRetentionSubjects,
  executeRetentionDeletion,
  getRetentionIntegrity,
  listLegalHolds,
  listRetentionDecisions,
  listRetentionSubjects,
  placeLegalHold,
  registerRetentionSubject,
  releaseLegalHold,
  runRetentionLifecycle
} from "./admin-security-retention.service";

export const adminSecurityRetentionRouter = Router();

adminSecurityRetentionRouter.use(requireAdminAuth);

adminSecurityRetentionRouter.get(
  "/subjects",
  requireAdminPermission("admin.read"),
  validateQuery(retentionQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listRetentionSubjects({
        limit: query.limit,
        status: query.status,
        sourceType: query.sourceType
      });
      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityRetentionRouter.get(
  "/legal-holds",
  requireAdminPermission("admin.read"),
  validateQuery(retentionQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listLegalHolds({
        limit: query.limit,
        status: query.status
      });
      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityRetentionRouter.get(
  "/decisions",
  requireAdminPermission("admin.read"),
  validateQuery(retentionQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listRetentionDecisions({
        limit: query.limit,
        sourceType: query.sourceType
      });
      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityRetentionRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getRetentionIntegrity();
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityRetentionRouter.post(
  "/subjects",
  requireAdminPermission("admin.write"),
  validateBody(registerRetentionSubjectSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const data = await registerRetentionSubject({
        ...body,
        requestId: (req as any).requestId
      });
      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityRetentionRouter.post(
  "/discover",
  requireAdminPermission("admin.write"),
  validateBody(runRetentionJobSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const data = await discoverRetentionSubjects({
        batchSize: body.batchSize,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityRetentionRouter.post(
  "/run-lifecycle",
  requireAdminPermission("admin.write"),
  validateBody(runRetentionJobSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const data = await runRetentionLifecycle({
        batchSize: body.batchSize,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityRetentionRouter.post(
  "/legal-holds",
  requireAdminPermission("admin.write"),
  validateBody(placeLegalHoldSchema),
  async (req, res, next) => {
    try {
      const admin = (req as any).admin;
      const body = (req as any).validatedBody;
      const data = await placeLegalHold({
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

adminSecurityRetentionRouter.post(
  "/legal-holds/:id/release",
  requireAdminPermission("admin.write"),
  validateBody(releaseLegalHoldSchema),
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
      const data = await releaseLegalHold({
        adminAuthUserId: admin.userId,
        legalHoldId: params.data.id,
        releaseReason: body.releaseReason,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityRetentionRouter.post(
  "/subjects/:id/delete",
  requireAdminPermission("admin.write"),
  validateBody(executeRetentionDeletionSchema),
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
      const data = await executeRetentionDeletion({
        adminAuthUserId: admin.userId,
        retentionSubjectId: params.data.id,
        reason: body.reason,
        secondAdminApprovalRequestId: body.secondAdminApprovalRequestId,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
