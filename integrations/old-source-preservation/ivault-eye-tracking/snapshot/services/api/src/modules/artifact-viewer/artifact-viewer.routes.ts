import { Router } from "express";
import { requireUserAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ok } from "../../shared/api-response";
import {
  createPrivateRoomViewerSessionSchema,
  resolveViewerSessionSchema
} from "./artifact-viewer.validation";
import {
  createPrivateRoomViewerSession,
  resolveViewerSession
} from "./artifact-viewer.service";

export const artifactViewerRouter = Router();

artifactViewerRouter.post(
  "/resolve",
  validateBody(resolveViewerSessionSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const authUser = (req as any).auth;

      const data = await resolveViewerSession({
        viewerToken: body.viewerToken,
        authUserId: authUser?.userId,
        pageNumber: body.pageNumber,
        itemKey: body.itemKey,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        requestId: (req as any).requestId
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

artifactViewerRouter.post(
  "/private-room/:privateRoomKey/artifacts/view",
  requireUserAuth,
  validateBody(createPrivateRoomViewerSessionSchema),
  async (req, res, next) => {
    try {
      const authUser = (req as any).auth;
      const body = (req as any).validatedBody;

      const data = await createPrivateRoomViewerSession({
        authUserId: authUser.userId,
        privateRoomKey: req.params.privateRoomKey,
        artifactKey: body.artifactKey,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        requestId: (req as any).requestId
      });

      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
