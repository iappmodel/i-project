import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  assignCorrectiveActionSchema,
  completeCorrectiveActionSchema,
  correctiveActionIdParamSchema,
  correctiveActionQuerySchema,
  createCorrectiveActionSchema,
  dismissCorrectiveActionSchema,
  startCorrectiveActionSchema
} from "./admin-corrective-action.validation";
import {
  assignAdminCorrectiveAction,
  completeAdminCorrectiveAction,
  createAdminCorrectiveAction,
  dismissAdminCorrectiveAction,
  getAdminCorrectiveActionIntegrity,
  listAdminCorrectiveActions,
  startAdminCorrectiveAction
} from "./admin-corrective-action.service";

export const adminCorrectiveActionRouter = Router();

adminCorrectiveActionRouter.use(requireAdminAuth);

const rid = (req: { requestId?: string }) => req.requestId ?? "unknown";

adminCorrectiveActionRouter.get(
  "/",
  requireAdminPermission("admin.read"),
  validateQuery(correctiveActionQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;
      const items = await listAdminCorrectiveActions({
        limit: query.limit,
        status: query.status,
        priority: query.priority,
        incidentReviewId: query.incidentReviewId
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminCorrectiveActionRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getAdminCorrectiveActionIntegrity();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminCorrectiveActionRouter.post(
  "/",
  requireAdminPermission("admin.write"),
  validateBody(createCorrectiveActionSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await createAdminCorrectiveAction({
        adminAuthUserId: admin.userId,
        incidentReviewId: body.incidentReviewId,
        actionKey: body.actionKey,
        priority: body.priority,
        title: body.title,
        description: body.description,
        assignedToAuthUserId: body.assignedToAuthUserId,
        dueAt: body.dueAt,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminCorrectiveActionRouter.post(
  "/:id/assign",
  requireAdminPermission("admin.write"),
  validateBody(assignCorrectiveActionSchema),
  async (req, res, next) => {
    try {
      const params = correctiveActionIdParamSchema.safeParse(req.params);
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
          requestId: rid(req)
        });
      }

      const admin = req.admin!;
      const body = req.validatedBody!;
      const data = await assignAdminCorrectiveAction({
        adminAuthUserId: admin.userId,
        correctiveActionId: params.data.id,
        assignedToAuthUserId: body.assignedToAuthUserId,
        note: body.note,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminCorrectiveActionRouter.post(
  "/:id/start",
  requireAdminPermission("admin.read"),
  validateBody(startCorrectiveActionSchema),
  async (req, res, next) => {
    try {
      const params = correctiveActionIdParamSchema.safeParse(req.params);
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
          requestId: rid(req)
        });
      }

      const admin = req.admin!;
      const body = req.validatedBody!;
      const data = await startAdminCorrectiveAction({
        adminAuthUserId: admin.userId,
        correctiveActionId: params.data.id,
        note: body.note,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminCorrectiveActionRouter.post(
  "/:id/complete",
  requireAdminPermission("admin.write"),
  validateBody(completeCorrectiveActionSchema),
  async (req, res, next) => {
    try {
      const params = correctiveActionIdParamSchema.safeParse(req.params);
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
          requestId: rid(req)
        });
      }

      const admin = req.admin!;
      const body = req.validatedBody!;
      const data = await completeAdminCorrectiveAction({
        adminAuthUserId: admin.userId,
        correctiveActionId: params.data.id,
        completionNote: body.completionNote,
        evidenceUrl: body.evidenceUrl,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminCorrectiveActionRouter.post(
  "/:id/dismiss",
  requireAdminPermission("admin.write"),
  validateBody(dismissCorrectiveActionSchema),
  async (req, res, next) => {
    try {
      const params = correctiveActionIdParamSchema.safeParse(req.params);
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
          requestId: rid(req)
        });
      }

      const admin = req.admin!;
      const body = req.validatedBody!;
      const data = await dismissAdminCorrectiveAction({
        adminAuthUserId: admin.userId,
        correctiveActionId: params.data.id,
        dismissalReason: body.dismissalReason,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);
