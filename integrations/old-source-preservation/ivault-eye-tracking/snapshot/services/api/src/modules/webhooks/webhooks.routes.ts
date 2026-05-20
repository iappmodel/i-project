import { Router } from "express";
import { requireWorkerSecret } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ok } from "../../shared/api-response";
import { recordPayoutProviderWebhook } from "./webhooks.service";
import { payoutProviderWebhookSchema } from "./webhooks.validation";

export const webhooksRouter = Router();

webhooksRouter.post(
  "/payout/:providerKey",
  requireWorkerSecret,
  validateBody(payoutProviderWebhookSchema),
  async (req, res, next) => {
    try {
      const body = req.validatedBody;

      const data = await recordPayoutProviderWebhook({
        providerKey: req.params.providerKey,
        providerEventId: body.providerEventId,
        providerEventType: body.providerEventType,
        providerPayoutId: body.providerPayoutId,
        providerTransferId: body.providerTransferId,
        processorReference: body.processorReference,
        currencyCode: body.currencyCode,
        amountMinor: body.amountMinor,
        feeMinor: body.feeMinor,
        normalizedStatus: body.normalizedStatus,
        rawPayload: body.rawPayload,
        requestId: req.requestId ?? "unknown"
      });

      return res.status(202).json(ok(data, req.requestId ?? "unknown"));
    } catch (error) {
      return next(error);
    }
  }
);
