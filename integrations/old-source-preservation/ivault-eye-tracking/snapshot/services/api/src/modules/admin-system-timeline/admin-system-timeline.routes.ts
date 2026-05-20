import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateParams } from "../../middleware/validate-params";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import { getSystemTimeline } from "../../lib/alphabet/system-timeline/system-timeline-store";
import {
  systemTimelineDetailQuerySchema,
  systemTimelineParamsSchema,
  systemTimelineQuerySchema
} from "./admin-system-timeline.validation";

export const adminSystemTimelineRouter = Router();

adminSystemTimelineRouter.use(requireAdminAuth);

const rid = (req: { requestId?: string }) => req.requestId ?? "unknown";

function allowSensitivePayloads(req: { admin?: { permissions: string[] } }) {
  return req.admin?.permissions.includes("admin.write") ?? false;
}

adminSystemTimelineRouter.get(
  "/",
  requireAdminPermission("admin.read"),
  validateQuery(systemTimelineQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;
      const includeRawPayloads = Boolean(query.includeRawPayloads) && allowSensitivePayloads(req);
      const includeServiceOnly = Boolean(query.includeServiceOnly) && allowSensitivePayloads(req);

      const timeline = await getSystemTimeline({
        objectType: query.objectType,
        objectId: query.objectId,
        includeRawPayloads,
        includeServiceOnly,
        maxEntries: query.maxEntries ?? 250
      });

      return res.json(ok({ timeline }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSystemTimelineRouter.get(
  "/:objectType/:objectId",
  requireAdminPermission("admin.read"),
  validateParams(systemTimelineParamsSchema),
  validateQuery(systemTimelineDetailQuerySchema),
  async (req, res, next) => {
    try {
      const params = req.validatedParams!;
      const query = req.validatedQuery!;
      const includeRawPayloads = Boolean(query.includeRawPayloads) && allowSensitivePayloads(req);
      const includeServiceOnly = Boolean(query.includeServiceOnly) && allowSensitivePayloads(req);

      const timeline = await getSystemTimeline({
        objectType: params.objectType,
        objectId: params.objectId,
        includeRawPayloads,
        includeServiceOnly,
        maxEntries: query.maxEntries ?? 250
      });

      return res.json(ok({ timeline }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);
