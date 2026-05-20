import { Router } from "express";
import { requireUserAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ok } from "../../shared/api-response";
import { createPrivateRoomTimelineSnapshotSchema } from "./trust-timeline.validation";
import { createPrivateRoomTimelineSnapshot } from "./trust-timeline.service";

export const trustTimelineRouter = Router();

trustTimelineRouter.post(
  "/private-room/:privateRoomKey/snapshots",
  requireUserAuth,
  validateBody(createPrivateRoomTimelineSnapshotSchema),
  async (req, res, next) => {
    try {
      const authUser = (req as any).auth;
      const body = (req as any).validatedBody;

      const data = await createPrivateRoomTimelineSnapshot({
        authUserId: authUser.userId,
        privateRoomKey: req.params.privateRoomKey,
        startTime: body.startTime,
        endTime: body.endTime,
        requestId: (req as any).requestId
      });

      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
