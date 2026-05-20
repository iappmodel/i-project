import { Router } from "express";
import { requireUserAuth } from "../../middleware/auth";
import { validateQuery } from "../../middleware/validate-query";
import { validateBody } from "../../middleware/validate";
import { ok } from "../../shared/api-response";
import { paginationQuerySchema } from "../../shared/pagination.validation";
import {
  completeAttentionSessionSchema,
  startAttentionSessionSchema
} from "./attention.validation";
import {
  completeAttentionSession,
  getAttentionHistory,
  startAttentionSession
} from "./attention.service";

export const attentionRouter = Router();

attentionRouter.post(
  "/session/start",
  requireUserAuth,
  validateBody(startAttentionSessionSchema),
  async (req, res, next) => {
    try {
      const auth = req.auth!;
      const body = req.validatedBody!;
      const data = await startAttentionSession({
        userId: auth.userId,
        walletId: body.walletId,
        campaignId: body.campaignId,
        creativeId: body.creativeId,
        placementId: body.placementId,
        deviceId: body.deviceId,
        appSessionId: body.appSessionId,
        appVersion: body.appVersion,
        platform: body.platform,
        metadata: {
          requestId: req.requestId ?? "unknown",
          clientMetadata: body.metadata ?? {}
        }
      });

      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      return next(err);
    }
  }
);

attentionRouter.post(
  "/session/complete",
  requireUserAuth,
  validateBody(completeAttentionSessionSchema),
  async (req, res, next) => {
    try {
      const auth = req.auth!;
      const body = req.validatedBody!;
      const data = await completeAttentionSession({
        attentionSessionId: body.attentionSessionId,
        decision: body.decision,
        decisionReason: body.decisionReason,
        attentionScore: body.attentionScore,
        confidenceScore: body.confidenceScore,
        fraudRiskScore: body.fraudRiskScore,
        qualityScore: body.qualityScore,
        gazeScore: body.gazeScore,
        fixationScore: body.fixationScore,
        livenessScore: body.livenessScore,
        completionScore: body.completionScore,
        validFrameCount: body.validFrameCount,
        invalidFrameCount: body.invalidFrameCount,
        noFaceFrameCount: body.noFaceFrameCount,
        gazeInvalidFrameCount: body.gazeInvalidFrameCount,
        rewardEligible: body.rewardEligible,
        idempotencyKey: body.idempotencyKey,
        metadata: {
          requestId: req.requestId ?? "unknown",
          userId: auth.userId,
          clientMetadata: body.metadata ?? {}
        }
      });

      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      return next(err);
    }
  }
);

attentionRouter.get(
  "/history",
  requireUserAuth,
  validateQuery(paginationQuerySchema),
  async (req, res, next) => {
    try {
      const auth = req.auth!;
      const query = req.validatedQuery!;
      const data = await getAttentionHistory(auth.accessToken, auth.userId, query.limit, query.cursor);
      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      return next(err);
    }
  }
);
