import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import { sendValidationFailure } from "../../shared/route-helpers";
import {
  approveDeletionRequestSchema,
  createDeletionRequestSchema,
  deletionRequestIdParamSchema,
  deletionRequestQuerySchema,
  executeDeletionRequestSchema,
  rejectDeletionRequestSchema
} from "./admin-security-deletion.validation";
import {
  approveSecurityDeletionRequest,
  createSecurityDeletionRequest,
  executeSecurityDeletionRequest,
  getSecurityDeletionIntegrity,
  listSecurityDeletionRequests,
  rejectSecurityDeletionRequest
} from "./admin-security-deletion.service";

export const adminSecurityDeletionRouter = Router();

adminSecurityDeletionRouter.use(requireAdminAuth);

const rid = (req: { requestId?: string }) => req.requestId ?? "unknown";

adminSecurityDeletionRouter.get(
  "/",
  requireAdminPermission("admin.read"),
  validateQuery(deletionRequestQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;

      const items = await listSecurityDeletionRequests({
        limit: query.limit,
        status: query.status,
        sourceType: query.sourceType
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityDeletionRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getSecurityDeletionIntegrity();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityDeletionRouter.post(
  "/",
  requireAdminPermission("admin.write"),
  validateBody(createDeletionRequestSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await createSecurityDeletionRequest({
        adminAuthUserId: admin.userId,
        sourceType: body.sourceType,
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
        reason: body.reason,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityDeletionRouter.post(
  "/:id/approve",
  requireAdminPermission("admin.write"),
  validateBody(approveDeletionRequestSchema),
  async (req, res, next) => {
    try {
      const params = deletionRequestIdParamSchema.safeParse(req.params);

      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await approveSecurityDeletionRequest({
        adminAuthUserId: admin.userId,
        deletionRequestId: params.data.id,
        approvalReason: body.approvalReason,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityDeletionRouter.post(
  "/:id/reject",
  requireAdminPermission("admin.write"),
  validateBody(rejectDeletionRequestSchema),
  async (req, res, next) => {
    try {
      const params = deletionRequestIdParamSchema.safeParse(req.params);

      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await rejectSecurityDeletionRequest({
        adminAuthUserId: admin.userId,
        deletionRequestId: params.data.id,
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

adminSecurityDeletionRouter.post(
  "/:id/execute",
  requireAdminPermission("admin.write"),
  validateBody(executeDeletionRequestSchema),
  async (req, res, next) => {
    try {
      const params = deletionRequestIdParamSchema.safeParse(req.params);

      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await executeSecurityDeletionRequest({
        adminAuthUserId: admin.userId,
        deletionRequestId: params.data.id,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);
