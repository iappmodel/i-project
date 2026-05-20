import { Router } from "express";
import { requireUserAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ok } from "../../shared/api-response";
import { executeArtifactSearchSchema } from "./artifact-search.validation";
import {
  createPrivateRoomSearchSession,
  executeArtifactSearch
} from "./artifact-search.service";

export const artifactSearchRouter = Router();

artifactSearchRouter.post(
  "/private-room/:privateRoomKey/session",
  requireUserAuth,
  async (req, res, next) => {
    try {
      const authUser = (req as any).auth;

      const data = await createPrivateRoomSearchSession({
        authUserId: authUser.userId,
        privateRoomKey: req.params.privateRoomKey,
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

artifactSearchRouter.post(
  "/execute",
  validateBody(executeArtifactSearchSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const authUser = (req as any).auth;

      const data = await executeArtifactSearch({
        authUserId: authUser?.userId,
        searchToken: body.searchToken,
        queryText: body.queryText,
        queryType: body.queryType,
        limit: body.limit,
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
