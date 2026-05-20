import { Router } from "express";
import { requireUserAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ok } from "../../shared/api-response";
import {
  completeDownloadSchema,
  createPrivateRoomDownloadSchema,
  resolveDownloadSchema
} from "./artifact-downloads.validation";
import {
  completeDownload,
  createPrivateRoomDownloadGrant,
  resolveDownloadGrant
} from "./artifact-downloads.service";

export const artifactDownloadsRouter = Router();

artifactDownloadsRouter.post(
  "/resolve",
  validateBody(resolveDownloadSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const auth = req.auth;

      const data = await resolveDownloadGrant({
        downloadToken: body.downloadToken,
        authUserId: auth?.userId,
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

artifactDownloadsRouter.post(
  "/complete",
  validateBody(completeDownloadSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;

      const data = await completeDownload({
        downloadGrantId: body.downloadGrantId,
        attemptId: body.attemptId,
        bytesServed: body.bytesServed,
        checksumSha256: body.checksumSha256,
        signedUrlUsed: body.signedUrlUsed,
        requestId: (req as any).requestId
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

artifactDownloadsRouter.post(
  "/private-room/:privateRoomKey/artifacts/download",
  requireUserAuth,
  validateBody(createPrivateRoomDownloadSchema),
  async (req, res, next) => {
    try {
      const auth = req.auth!;
      const body = (req as any).validatedBody;

      const data = await createPrivateRoomDownloadGrant({
        authUserId: auth.userId,
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
