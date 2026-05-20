import type { Request, Response } from "express";
import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  createAlertEventSchema,
  idParamSchema,
  notificationResultSchema,
  resolveAlertEventSchema,
  trustAlertQuerySchema
} from "./admin-security-trust-alerts.validation";
import {
  acknowledgeAlertEvent,
  buildAlertNotifications,
  createAlertEvent,
  getAlertIntegrity,
  listAlertEvents,
  listAlertNotifications,
  listAlertPolicies,
  recordAlertNotificationResult,
  resolveAlertEvent,
  syncAlertEvents
} from "./admin-security-trust-alerts.service";

export const adminSecurityTrustAlertsRouter = Router();

adminSecurityTrustAlertsRouter.use(requireAdminAuth);

adminSecurityTrustAlertsRouter.get(
  "/events",
  requireAdminPermission("admin.read"),
  validateQuery(trustAlertQuerySchema),
  async (req: Request, res: Response, next) => {
    try {
      const items = await listAlertEvents(req.validatedQuery);
      return res.json(ok({ items }, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustAlertsRouter.get(
  "/notifications",
  requireAdminPermission("admin.read"),
  validateQuery(trustAlertQuerySchema),
  async (req: Request, res: Response, next) => {
    try {
      const items = await listAlertNotifications(req.validatedQuery);
      return res.json(ok({ items }, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustAlertsRouter.get(
  "/policies",
  requireAdminPermission("admin.read"),
  validateQuery(trustAlertQuerySchema),
  async (req: Request, res: Response, next) => {
    try {
      const items = await listAlertPolicies(req.validatedQuery);
      return res.json(ok({ items }, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustAlertsRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req: Request, res: Response, next) => {
    try {
      const data = await getAlertIntegrity();
      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustAlertsRouter.post(
  "/events",
  requireAdminPermission("admin.write"),
  validateBody(createAlertEventSchema),
  async (req: Request, res: Response, next) => {
    try {
      const data = await createAlertEvent({
        ...req.validatedBody,
        requestId: req.requestId ?? "unknown"
      });

      return res.status(201).json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustAlertsRouter.post(
  "/events/sync",
  requireAdminPermission("admin.write"),
  async (req: Request, res: Response, next) => {
    try {
      const data = await syncAlertEvents({
        requestId: req.requestId ?? "unknown"
      });

      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustAlertsRouter.post(
  "/notifications/build",
  requireAdminPermission("admin.write"),
  async (req: Request, res: Response, next) => {
    try {
      const data = await buildAlertNotifications({
        requestId: req.requestId ?? "unknown"
      });

      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustAlertsRouter.post(
  "/notifications/:id/result",
  requireAdminPermission("admin.write"),
  validateBody(notificationResultSchema),
  async (req: Request, res: Response, next) => {
    try {
      const params = idParamSchema.parse(req.params);
      const body = req.validatedBody;

      const data = await recordAlertNotificationResult({
        alertNotificationId: params.id,
        ...body,
        requestId: req.requestId ?? "unknown"
      });

      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustAlertsRouter.post(
  "/events/:id/acknowledge",
  requireAdminPermission("admin.write"),
  async (req: Request, res: Response, next) => {
    try {
      const params = idParamSchema.parse(req.params);
      const admin = req.admin;

      if (!admin) {
        return res.status(403).json({ ok: false, error: { code: "FORBIDDEN" } });
      }

      const data = await acknowledgeAlertEvent({
        alertEventId: params.id,
        adminAuthUserId: admin.userId,
        requestId: req.requestId ?? "unknown",
        metadata: {}
      });

      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustAlertsRouter.post(
  "/events/:id/resolve",
  requireAdminPermission("admin.write"),
  validateBody(resolveAlertEventSchema),
  async (req: Request, res: Response, next) => {
    try {
      const params = idParamSchema.parse(req.params);
      const admin = req.admin;
      const body = req.validatedBody;

      if (!admin) {
        return res.status(403).json({ ok: false, error: { code: "FORBIDDEN" } });
      }

      const data = await resolveAlertEvent({
        alertEventId: params.id,
        adminAuthUserId: admin.userId,
        resolutionNote: body.resolutionNote,
        requestId: req.requestId ?? "unknown",
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);
