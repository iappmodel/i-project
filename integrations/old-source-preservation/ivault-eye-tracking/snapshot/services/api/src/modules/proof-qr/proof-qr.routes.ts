import { Router } from "express";
import { requireUserAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ok } from "../../shared/api-response";
import { createProofLinkForKeySchema } from "./proof-qr.validation";
import { createProofLinkForKey } from "./proof-qr.service";

export const proofQrRouter = Router();

proofQrRouter.post(
  "/links",
  requireUserAuth,
  validateBody(createProofLinkForKeySchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const data = await createProofLinkForKey({
        proofType: body.proofType,
        proofKey: body.proofKey,
        createQr: body.createQr,
        requestId: (req as any).requestId
      });
      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
