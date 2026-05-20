import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  securityActorRollupQuerySchema,
  securityCenterPriorityQueueQuerySchema,
  securityCenterTimelineQuerySchema
} from "./admin-security-center.validation";
import {
  getAdminSecurityCommandCenterSummary,
  listAdminSecurityActorRollup,
  listAdminSecurityPostureChecks,
  listAdminSecurityPriorityQueue,
  listAdminSecurityTimeline
} from "./admin-security-center.service";

export const adminSecurityCenterRouter = Router();

adminSecurityCenterRouter.use(requireAdminAuth);

const rid = (req: { requestId?: string }) => req.requestId ?? "unknown";

adminSecurityCenterRouter.get(
  "/summary",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getAdminSecurityCommandCenterSummary();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityCenterRouter.get(
  "/priority-queue",
  requireAdminPermission("admin.read"),
  validateQuery(securityCenterPriorityQueueQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;
      const items = await listAdminSecurityPriorityQueue({
        limit: query.limit,
        itemType: query.itemType
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityCenterRouter.get(
  "/timeline",
  requireAdminPermission("admin.read"),
  validateQuery(securityCenterTimelineQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;
      const items = await listAdminSecurityTimeline({
        limit: query.limit,
        eventType: query.eventType,
        targetAuthUserId: query.targetAuthUserId
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityCenterRouter.get(
  "/actors",
  requireAdminPermission("admin.read"),
  validateQuery(securityActorRollupQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;
      const items = await listAdminSecurityActorRollup({
        limit: query.limit,
        postureStatus: query.postureStatus
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityCenterRouter.get(
  "/posture-checks",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const items = await listAdminSecurityPostureChecks();
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);
