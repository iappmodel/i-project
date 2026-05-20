import { Router } from "express";
import { requireWorkerSecret } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ok } from "../../shared/api-response";
import { runWorkerJobSchema } from "./worker.validation";
import { runWorkerJob } from "./worker.service";

export const workerRouter = Router();

workerRouter.post(
  "/jobs/run",
  requireWorkerSecret,
  validateBody(runWorkerJobSchema),
  async (req, res, next) => {
    try {
      const body = req.validatedBody!;
      const data = await runWorkerJob({
        jobKey: body.jobKey,
        lockedBy: body.lockedBy ?? "api_worker",
        requestId: req.requestId ?? "unknown",
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      return next(err);
    }
  }
);
