import { Router } from "express";
import { requireUserAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ok } from "../../shared/api-response";
import { createPrivateRoomTrustProofReportSchema } from "./trust-proof-reports.validation";
import { createPrivateRoomTrustProofReport } from "./trust-proof-reports.service";

export const trustProofReportsRouter = Router();

trustProofReportsRouter.post(
  "/private-room/:privateRoomKey",
  requireUserAuth,
  validateBody(createPrivateRoomTrustProofReportSchema),
  async (req, res, next) => {
    try {
      const authUser = (req as any).auth;
      const body = (req as any).validatedBody;

      const data = await createPrivateRoomTrustProofReport({
        authUserId: authUser.userId,
        privateRoomKey: req.params.privateRoomKey,
        reportFormat: body.reportFormat,
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
