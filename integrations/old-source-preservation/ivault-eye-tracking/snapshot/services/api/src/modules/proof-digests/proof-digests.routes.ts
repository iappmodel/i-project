import { Router } from "express";
import { requireUserAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ok } from "../../shared/api-response";
import { createPrivateRoomDigestSubscriptionSchema } from "./proof-digests.validation";
import { createPrivateRoomDigestSubscription } from "./proof-digests.service";

export const proofDigestsRouter = Router();

proofDigestsRouter.post(
  "/private-room/:privateRoomKey/subscriptions",
  requireUserAuth,
  validateBody(createPrivateRoomDigestSubscriptionSchema),
  async (req, res, next) => {
    try {
      const authUser = (req as any).auth;
      const body = (req as any).validatedBody;

      const data = await createPrivateRoomDigestSubscription({
        authUserId: authUser.userId,
        privateRoomKey: req.params.privateRoomKey,
        recipientEmail: body.recipientEmail,
        recipientDisplayName: body.recipientDisplayName,
        digestFrequency: body.digestFrequency,
        digestChannel: body.digestChannel,
        timezone: body.timezone,
        requestId: (req as any).requestId
      });

      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
