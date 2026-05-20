import { Router } from "express";
import { requireUserAuth } from "../../middleware/auth";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  publicTrustTimelineQuerySchema,
  roomTrustTimelineQuerySchema
} from "./public-trust-timeline.validation";
import { listPublicTrustTimeline, listRoomTrustTimeline } from "./public-trust-timeline.service";

export const publicTrustTimelineRouter = Router();

publicTrustTimelineRouter.get(
  "/trust-center/timeline",
  validateQuery(publicTrustTimelineQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const data = await listPublicTrustTimeline({
        limit: query.limit,
        scope: query.scope,
        requestId: (req as any).requestId ?? "unknown"
      });

      return res.json(ok(data, (req as any).requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

publicTrustTimelineRouter.get(
  "/enterprise-review-rooms/:roomKey/timeline",
  requireUserAuth,
  validateQuery(roomTrustTimelineQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const data = await listRoomTrustTimeline({
        authUserId: (req as any).auth.userId,
        roomKey: req.params.roomKey,
        limit: query.limit,
        requestId: (req as any).requestId ?? "unknown"
      });

      return res.json(ok(data, (req as any).requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);
