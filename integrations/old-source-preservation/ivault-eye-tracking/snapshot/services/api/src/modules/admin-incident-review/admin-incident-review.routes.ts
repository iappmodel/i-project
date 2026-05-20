import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  assignIncidentReviewSchema,
  closeIncidentReviewSchema,
  dismissIncidentReviewSchema,
  incidentReviewIdParamSchema,
  incidentReviewQuerySchema,
  startIncidentReviewSchema
} from "./admin-incident-review.validation";
import {
  assignAdminIncidentReview,
  closeAdminIncidentReview,
  dismissAdminIncidentReview,
  getAdminIncidentReviewIntegrity,
  listAdminIncidentReviews,
  startAdminIncidentReviewInvestigation
} from "./admin-incident-review.service";

export const adminIncidentReviewRouter = Router();

adminIncidentReviewRouter.use(requireAdminAuth);

const rid = (req: { requestId?: string }) => req.requestId ?? "unknown";

adminIncidentReviewRouter.get(
  "/",
  requireAdminPermission("admin.read"),
  validateQuery(incidentReviewQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;
      const items = await listAdminIncidentReviews({
        limit: query.limit,
        status: query.status,
        severity: query.severity
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminIncidentReviewRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getAdminIncidentReviewIntegrity();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminIncidentReviewRouter.post(
  "/:id/assign",
  requireAdminPermission("admin.write"),
  validateBody(assignIncidentReviewSchema),
  async (req, res, next) => {
    try {
      const params = incidentReviewIdParamSchema.safeParse(req.params);

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
      const data = await assignAdminIncidentReview({
        adminAuthUserId: admin.userId,
        incidentReviewId: params.data.id,
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

adminIncidentReviewRouter.post(
  "/:id/start",
  requireAdminPermission("admin.read"),
  validateBody(startIncidentReviewSchema),
  async (req, res, next) => {
    try {
      const params = incidentReviewIdParamSchema.safeParse(req.params);

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
      const data = await startAdminIncidentReviewInvestigation({
        adminAuthUserId: admin.userId,
        incidentReviewId: params.data.id,
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

adminIncidentReviewRouter.post(
  "/:id/close",
  requireAdminPermission("admin.write"),
  validateBody(closeIncidentReviewSchema),
  async (req, res, next) => {
    try {
      const params = incidentReviewIdParamSchema.safeParse(req.params);

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
      const data = await closeAdminIncidentReview({
        adminAuthUserId: admin.userId,
        incidentReviewId: params.data.id,
        closureReason: body.closureReason,
        findings: body.findings,
        correctiveActions: body.correctiveActions,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminIncidentReviewRouter.post(
  "/:id/dismiss",
  requireAdminPermission("admin.write"),
  validateBody(dismissIncidentReviewSchema),
  async (req, res, next) => {
    try {
      const params = incidentReviewIdParamSchema.safeParse(req.params);

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
      const data = await dismissAdminIncidentReview({
        adminAuthUserId: admin.userId,
        incidentReviewId: params.data.id,
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
