import express, { Router } from "express";
import { reconcileProviderWebhook } from "../../lib/alphabet/provider-reconciliation/provider-reconciliation-store";
import type { ExternalTransferProvider } from "../../types/alphabet/external-transfer.types";

/**
 * Raw body required for HMAC verification. Mount this router before `express.json()` on the app.
 */
export const alphabetProviderReconciliationWebhookRouter = Router();

alphabetProviderReconciliationWebhookRouter.use(
  express.text({
    type: () => true,
    limit: "1mb"
  })
);

alphabetProviderReconciliationWebhookRouter.post("/:provider", async (req, res, next) => {
  try {
    const rawBody = typeof req.body === "string" ? req.body : "";
    const result = await reconcileProviderWebhook({
      provider: req.params.provider as ExternalTransferProvider,
      rawBody,
      headers: {
        "x-provider-signature": req.get("x-provider-signature") ?? null
      },
      receivedAt: new Date().toISOString(),
      reconciliationSource: "webhook"
    });

    return res.status(200).json(result.publicResponse);
  } catch (err) {
    return next(err);
  }
});
