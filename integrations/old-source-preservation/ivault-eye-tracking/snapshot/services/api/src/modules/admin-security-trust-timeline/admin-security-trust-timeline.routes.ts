import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  buildTimelineSnapshotSchema,
  createTimelineSnapshotSchema,
  trustTimelineQuerySchema
} from "./admin-security-trust-timeline.validation";
import {
  buildTimelineSnapshot,
  createTimelineSnapshot,
  getTimelineIntegrity,
  listTimelineEvents,
  listTimelineSnapshots,
  listTimelineSubjects
} from "./admin-security-trust-timeline.service";

export const adminSecurityTrustTimelineRouter = Router();

adminSecurityTrustTimelineRouter.use(requireAdminAuth);

adminSecurityTrustTimelineRouter.get(
  "/subjects",
  requireAdminPermission("admin.read"),
  validateQuery(trustTimelineQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listTimelineSubjects({ limit: query.limit });
      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTimelineRouter.get(
  "/events",
  requireAdminPermission("admin.read"),
  validateQuery(trustTimelineQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listTimelineEvents({
        limit: query.limit,
        eventFamily: query.eventFamily,
        eventType: query.eventType,
        riskLevel: query.riskLevel,
        privateRoomId: query.privateRoomId,
        customerName: query.customerName
      });
      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTimelineRouter.get(
  "/snapshots",
  requireAdminPermission("admin.read"),
  validateQuery(trustTimelineQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listTimelineSnapshots({ limit: query.limit });
      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTimelineRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getTimelineIntegrity();
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTimelineRouter.post(
  "/snapshots",
  requireAdminPermission("admin.write"),
  validateBody(createTimelineSnapshotSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const data = await createTimelineSnapshot({
        ...body,
        requestId: (req as any).requestId
      });
      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTimelineRouter.post(
  "/snapshots/build",
  requireAdminPermission("admin.write"),
  validateBody(buildTimelineSnapshotSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const data = await buildTimelineSnapshot({
        snapshotId: body.snapshotId,
        metadata: body.metadata ?? {}
      });
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
