import { Router } from "express";
import { validateBody } from "../../../middleware/validate";
import { ok } from "../../../shared/api-response";
import { PopsSessionController } from "../controllers/pops-session.controller";
import { requireBodyUserMatch, requirePopsAuth } from "../middleware/pops-auth.middleware";
import { requirePopsDeviceIntegrity } from "../middleware/pops-device-integrity.middleware";
import { rateLimitClose, rateLimitComplete, rateLimitStartSession } from "../middleware/pops-rate-limit.middleware";
import {
  popsCloseSessionSchema,
  popsDecisionIdParamSchema,
  popsSessionIdParamSchema,
  popsSessionStartSchema
} from "../validators/pops-session.validator";

export function createPopsSessionRouter(controller = new PopsSessionController()) {
  const router = Router();

  router.post(
  "/sessions/start",
  requirePopsAuth,
  rateLimitStartSession,
  validateBody(popsSessionStartSchema),
  requireBodyUserMatch,
  requirePopsDeviceIntegrity,
  async (req, res, next) => {
    try {
      const data = await controller.startSession(req.validatedBody!);
      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (error) {
      return next(error);
    }
  }
  );

  router.post(
  "/sessions/:sessionId/complete",
  requirePopsAuth,
  rateLimitComplete,
  async (req, res, next) => {
    try {
      popsSessionIdParamSchema.parse(req.params);
      const data = await controller.completeSession(req.params.sessionId, req.auth!.userId);
      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (error) {
      return next(error);
    }
  }
  );

  router.post(
  "/sessions/:sessionId/close",
  requirePopsAuth,
  rateLimitClose,
  validateBody(popsCloseSessionSchema),
  async (req, res, next) => {
    try {
      popsSessionIdParamSchema.parse(req.params);
      const data = await controller.closeSession(req.params.sessionId, req.auth!.userId, req.validatedBody!);
      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (error) {
      return next(error);
    }
  }
  );

  router.get("/sessions/:sessionId/status", requirePopsAuth, async (req, res, next) => {
  try {
    popsSessionIdParamSchema.parse(req.params);
    const data = await controller.getStatus(req.params.sessionId, req.auth!.userId);
    return res.json(ok(data, req.requestId ?? "unknown"));
  } catch (error) {
    return next(error);
  }
  });

  router.get("/sessions/:sessionId/privacy-receipt", requirePopsAuth, async (req, res, next) => {
  try {
    popsSessionIdParamSchema.parse(req.params);
    const data = await controller.getPrivacyReceipt(req.params.sessionId, req.auth!.userId);
    return res.json(ok(data, req.requestId ?? "unknown"));
  } catch (error) {
    return next(error);
  }
  });

  router.get("/reward-decisions/:decisionId", requirePopsAuth, async (req, res, next) => {
  try {
    popsDecisionIdParamSchema.parse(req.params);
    const data = await controller.getRewardDecision(req.params.decisionId, req.auth!.userId);
    return res.json(ok(data, req.requestId ?? "unknown"));
  } catch (error) {
    return next(error);
  }
  });

  return router;
}

export const popsSessionRouter = createPopsSessionRouter();
