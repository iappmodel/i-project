import { Router } from "express";
import { requireUserAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ok } from "../../shared/api-response";
import { sendValidationFailure } from "../../shared/route-helpers";
import {
  acceptEnterpriseReviewRoomNdaSchema,
  enterpriseReviewRoomDocumentDownloadParamSchema,
  enterpriseReviewRoomKeyParamSchema
} from "../admin-security-enterprise-review-rooms/admin-security-enterprise-review-rooms.validation";
import {
  acceptEnterpriseReviewRoomNda,
  downloadEnterpriseReviewRoomDocument,
  getEnterpriseReviewRoomForParticipant
} from "../admin-security-enterprise-review-rooms/admin-security-enterprise-review-rooms.service";

export const enterpriseReviewRoomRouter = Router();

enterpriseReviewRoomRouter.use(requireUserAuth);

const rid = (req: { requestId?: string }) => req.requestId ?? "unknown";

enterpriseReviewRoomRouter.post(
  "/nda/accept",
  validateBody(acceptEnterpriseReviewRoomNdaSchema),
  async (req, res, next) => {
    try {
      const auth = req.auth!;
      const body = req.validatedBody!;
      const data = await acceptEnterpriseReviewRoomNda({
        authUserId: auth.userId,
        roomKey: body.roomKey,
        email: body.email,
        ndaVersion: body.ndaVersion,
        requestIp: req.ip,
        userAgent: req.header("user-agent") ?? undefined,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

enterpriseReviewRoomRouter.get("/:roomKey", async (req, res, next) => {
  try {
    const params = enterpriseReviewRoomKeyParamSchema.safeParse(req.params);
    if (!params.success) {
      return sendValidationFailure(res, rid(req));
    }

    const auth = req.auth!;
    const data = await getEnterpriseReviewRoomForParticipant({
      authUserId: auth.userId,
      roomKey: params.data.roomKey,
      requestIp: req.ip,
      userAgent: req.header("user-agent") ?? undefined,
      requestId: rid(req)
    });

    return res.json(ok(data, rid(req)));
  } catch (err) {
    next(err);
  }
});

enterpriseReviewRoomRouter.get(
  "/:roomKey/documents/:documentGrantId/download",
  async (req, res, next) => {
    try {
      const params = enterpriseReviewRoomDocumentDownloadParamSchema.safeParse(req.params);
      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const auth = req.auth!;
      const data = await downloadEnterpriseReviewRoomDocument({
        authUserId: auth.userId,
        roomKey: params.data.roomKey,
        documentGrantId: params.data.documentGrantId,
        requestIp: req.ip,
        userAgent: req.header("user-agent") ?? undefined,
        requestId: rid(req),
        metadata: {
          source: "enterprise-review-room"
        }
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);
