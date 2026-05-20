import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  createNotificationEventSchema,
  createSubscriberSchema,
  fanoutEventSchema,
  runExpiryWarningsSchema,
  runFanoutSchema,
  syncAuditorSubscribersSchema,
  syncRoomSubscribersSchema,
  trustNotificationQuerySchema
} from "./admin-security-trust-notifications.validation";
import {
  createTrustNotificationEvent,
  createTrustSubscriber,
  fanoutTrustNotificationEvent,
  getTrustNotificationIntegrity,
  listTrustNotificationDeliveries,
  listTrustNotificationEvents,
  listTrustNotificationSubscribers,
  runExpiryWarnings,
  runTrustNotificationFanout,
  syncAuditorSubscribers,
  syncRoomSubscribers
} from "./admin-security-trust-notifications.service";

export const adminSecurityTrustNotificationsRouter = Router();

adminSecurityTrustNotificationsRouter.use(requireAdminAuth);

adminSecurityTrustNotificationsRouter.get(
  "/subscribers",
  requireAdminPermission("admin.read"),
  validateQuery(trustNotificationQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listTrustNotificationSubscribers({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustNotificationsRouter.get(
  "/events",
  requireAdminPermission("admin.read"),
  validateQuery(trustNotificationQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listTrustNotificationEvents({
        limit: query.limit,
        status: query.status,
        topicType: query.topicType
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustNotificationsRouter.get(
  "/deliveries",
  requireAdminPermission("admin.read"),
  validateQuery(trustNotificationQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listTrustNotificationDeliveries({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustNotificationsRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getTrustNotificationIntegrity();
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustNotificationsRouter.post(
  "/subscribers",
  requireAdminPermission("admin.write"),
  validateBody(createSubscriberSchema),
  async (req, res, next) => {
    try {
      const admin = (req as any).admin;
      const body = (req as any).validatedBody;

      const data = await createTrustSubscriber({
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

adminSecurityTrustNotificationsRouter.post(
  "/events",
  requireAdminPermission("admin.write"),
  validateBody(createNotificationEventSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const data = await createTrustNotificationEvent({
        ...body,
        requestId: (req as any).requestId
      });

      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustNotificationsRouter.post(
  "/events/fanout",
  requireAdminPermission("admin.write"),
  validateBody(fanoutEventSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const data = await fanoutTrustNotificationEvent({
        notificationEventId: body.notificationEventId,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustNotificationsRouter.post(
  "/fanout/run",
  requireAdminPermission("admin.write"),
  validateBody(runFanoutSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const data = await runTrustNotificationFanout({
        batchSize: body.batchSize,
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustNotificationsRouter.post(
  "/expiry-warnings/run",
  requireAdminPermission("admin.write"),
  validateBody(runExpiryWarningsSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const data = await runExpiryWarnings({
        daysBefore: body.daysBefore,
        batchSize: body.batchSize,
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustNotificationsRouter.post(
  "/sync/enterprise-room",
  requireAdminPermission("admin.write"),
  validateBody(syncRoomSubscribersSchema),
  async (req, res, next) => {
    try {
      const admin = (req as any).admin;
      const body = (req as any).validatedBody;
      const data = await syncRoomSubscribers({
        adminAuthUserId: admin.userId,
        enterpriseReviewRoomId: body.enterpriseReviewRoomId,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustNotificationsRouter.post(
  "/sync/auditor-portal",
  requireAdminPermission("admin.write"),
  validateBody(syncAuditorSubscribersSchema),
  async (req, res, next) => {
    try {
      const admin = (req as any).admin;
      const body = (req as any).validatedBody;
      const data = await syncAuditorSubscribers({
        adminAuthUserId: admin.userId,
        auditorPortalId: body.auditorPortalId,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
