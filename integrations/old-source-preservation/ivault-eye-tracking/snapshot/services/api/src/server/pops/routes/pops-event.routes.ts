import { Router } from "express";
import { validateBody } from "../../../middleware/validate";
import { ok } from "../../../shared/api-response";
import { PopsEventController } from "../controllers/pops-event.controller";
import { requirePopsAuth } from "../middleware/pops-auth.middleware";
import {
  rateLimitCheckpoint,
  rateLimitEvents,
  rateLimitSignalBatch
} from "../middleware/pops-rate-limit.middleware";
import { popsEventsIngestSchema, popsSignalBatchSchema } from "../validators/pops-event.validator";
import { popsSessionIdParamSchema } from "../validators/pops-session.validator";

export function createPopsEventRouter(controller = new PopsEventController()) {
  const router = Router();

  router.post(
  "/sessions/:sessionId/events",
  requirePopsAuth,
  rateLimitEvents,
  validateBody(popsEventsIngestSchema),
  async (req, res, next) => {
    try {
      popsSessionIdParamSchema.parse(req.params);
      const data = await controller.ingestEvents(req.params.sessionId, req.auth!.userId, req.validatedBody!);
      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (error) {
      return next(error);
    }
  }
  );

  router.post(
  "/sessions/:sessionId/signal-batch",
  requirePopsAuth,
  rateLimitSignalBatch,
  validateBody(popsSignalBatchSchema),
  async (req, res, next) => {
    try {
      popsSessionIdParamSchema.parse(req.params);
      const data = await controller.ingestSignalBatch(req.params.sessionId, req.auth!.userId, req.validatedBody!);
      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (error) {
      return next(error);
    }
  }
  );

  router.post("/sessions/:sessionId/checkpoint", requirePopsAuth, rateLimitCheckpoint, async (req, res, next) => {
    try {
      popsSessionIdParamSchema.parse(req.params);
      const data = await controller.checkpoint(req.params.sessionId, req.auth!.userId);
      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

export const popsEventRouter = createPopsEventRouter();
