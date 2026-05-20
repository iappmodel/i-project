import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import { sendValidationFailure } from "../../shared/route-helpers";
import {
  approveBreakGlassRequestSchema,
  breakGlassQuerySchema,
  breakGlassRequestIdParamSchema,
  createBreakGlassRequestSchema,
  executeBreakGlassRequestSchema,
  rejectBreakGlassRequestSchema
} from "./admin-break-glass.validation";
import {
  approveAdminBreakGlassRequest,
  createAdminBreakGlassRequest,
  executeAdminBreakGlassRequest,
  getAdminBreakGlassIntegrity,
  listAdminBreakGlassRequests,
  rejectAdminBreakGlassRequest
} from "./admin-break-glass.service";

export const adminBreakGlassRouter = Router();

adminBreakGlassRouter.use(requireAdminAuth);

const rid = (req: { requestId?: string }) => req.requestId ?? "unknown";

adminBreakGlassRouter.get(
  "/",
  requireAdminPermission("admin.read"),
  validateQuery(breakGlassQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;
      const items = await listAdminBreakGlassRequests({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminBreakGlassRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getAdminBreakGlassIntegrity();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminBreakGlassRouter.post(
  "/",
  requireAdminPermission("admin.write"),
  validateBody(createBreakGlassRequestSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await createAdminBreakGlassRequest({
        requestedByAuthUserId: admin.userId,
        targetAdminAuthUserId: body.targetAdminAuthUserId,
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

adminBreakGlassRouter.post(
  "/:id/approve",
  requireAdminPermission("admin.write"),
  validateBody(approveBreakGlassRequestSchema),
  async (req, res, next) => {
    try {
      const params = breakGlassRequestIdParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await approveAdminBreakGlassRequest({
        approvedByAuthUserId: admin.userId,
        breakGlassRequestId: params.data.id,
        reason: body.reason,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminBreakGlassRouter.post(
  "/:id/reject",
  requireAdminPermission("admin.write"),
  validateBody(rejectBreakGlassRequestSchema),
  async (req, res, next) => {
    try {
      const params = breakGlassRequestIdParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await rejectAdminBreakGlassRequest({
        rejectedByAuthUserId: admin.userId,
        breakGlassRequestId: params.data.id,
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

adminBreakGlassRouter.post(
  "/:id/execute",
  validateBody(executeBreakGlassRequestSchema),
  async (req, res, next) => {
    try {
      const params = breakGlassRequestIdParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await executeAdminBreakGlassRequest({
        executedByAuthUserId: admin.userId,
        breakGlassRequestId: params.data.id,
        token: body.token,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);
