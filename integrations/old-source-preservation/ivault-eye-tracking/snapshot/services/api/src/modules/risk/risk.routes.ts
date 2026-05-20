import { Router } from "express";
import { requireUserAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ok } from "../../shared/api-response";
import { observeSessionContext } from "./risk.service";
import { observeSessionContextSchema } from "./risk.validation";

export const riskRouter = Router();

riskRouter.post(
  "/session/observe",
  requireUserAuth,
  validateBody(observeSessionContextSchema),
  async (req, res, next) => {
    try {
      const auth = req.auth!;
      const body = req.validatedBody!;

      const data = await observeSessionContext({
        userId: auth.userId,
        requestId: req.requestId ?? "unknown",

        deviceFingerprintHash: body.deviceFingerprintHash,
        platform: body.platform,
        appVersion: body.appVersion,
        deviceModel: body.deviceModel,
        osVersion: body.osVersion,

        appSessionId: body.appSessionId,

        ipHash: body.ipHash,
        ipCountry: body.ipCountry,
        ipRegion: body.ipRegion,
        ipCity: body.ipCity,
        asn: body.asn,

        networkType: body.networkType,

        isVpn: body.isVpn,
        isProxy: body.isProxy,
        isTor: body.isTor,
        isHosting: body.isHosting,

        metadata: body.metadata ?? {}
      });

      return res.status(202).json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      return next(err);
    }
  }
);
