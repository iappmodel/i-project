import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import { sendValidationFailure } from "../../shared/route-helpers";
import {
  notificationChannelIdParamSchema,
  notificationChannelQuerySchema,
  notificationDeliveryQuerySchema,
  updateNotificationChannelSchema
} from "./admin-security-notifications.validation";
import {
  getNotificationIntegrity,
  listNotificationChannels,
  listNotificationDeliveries,
  updateNotificationChannel
} from "./admin-security-notifications.service";

export const adminSecurityNotificationsRouter = Router();

adminSecurityNotificationsRouter.use(requireAdminAuth);

const rid = (req: { requestId?: string }) => req.requestId ?? "unknown";

adminSecurityNotificationsRouter.get(
  "/channels",
  requireAdminPermission("admin.read"),
  validateQuery(notificationChannelQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;
      const items = await listNotificationChannels({
        status: query.status,
        channelType: query.channelType
      });
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityNotificationsRouter.patch(
  "/channels/:id",
  requireAdminPermission("admin.write"),
  validateBody(updateNotificationChannelSchema),
  async (req, res, next) => {
    try {
      const params = notificationChannelIdParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const body = req.validatedBody!;
      const data = await updateNotificationChannel({
        channelId: params.data.id,
        status: body.status,
        displayName: body.displayName,
        destination: body.destination,
        secretRef: body.secretRef,
        minSeverity: body.minSeverity,
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityNotificationsRouter.get(
  "/deliveries",
  requireAdminPermission("admin.read"),
  validateQuery(notificationDeliveryQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;
      const items = await listNotificationDeliveries({
        limit: query.limit,
        status: query.status
      });
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityNotificationsRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getNotificationIntegrity();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);
