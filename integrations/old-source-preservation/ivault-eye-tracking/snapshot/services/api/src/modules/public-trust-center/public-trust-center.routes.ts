import { Router } from "express";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  publicTrustCenterQuerySchema,
  verifyTrustCenterManifestSchema
} from "./public-trust-center.validation";
import {
  getLatestPublicTrustCenterManifest,
  getPublicTrustCenter,
  listPublicTrustCenterDisclosures,
  listPublicTrustCenterRevocations,
  verifyTrustCenterManifest
} from "./public-trust-center.service";

export const publicTrustCenterRouter = Router();

publicTrustCenterRouter.get("/:trustCenterKey", async (req, res, next) => {
  try {
    const data = await getPublicTrustCenter({
      trustCenterKey: req.params.trustCenterKey ?? "default",
      requestId: (req as any).requestId
    });

    return res.json(ok(data, (req as any).requestId));
  } catch (err) {
    next(err);
  }
});

publicTrustCenterRouter.get(
  "/:trustCenterKey/disclosures",
  validateQuery(publicTrustCenterQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;

      const data = await listPublicTrustCenterDisclosures({
        trustCenterKey: req.params.trustCenterKey ?? "default",
        limit: query.limit,
        requestId: (req as any).requestId
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

publicTrustCenterRouter.get(
  "/:trustCenterKey/revocations",
  validateQuery(publicTrustCenterQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;

      const data = await listPublicTrustCenterRevocations({
        limit: query.limit,
        requestId: (req as any).requestId
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

publicTrustCenterRouter.get("/:trustCenterKey/manifest", async (req, res, next) => {
  try {
    const data = await getLatestPublicTrustCenterManifest({
      trustCenterKey: req.params.trustCenterKey ?? "default",
      requestId: (req as any).requestId
    });

    return res.json(ok(data, (req as any).requestId));
  } catch (err) {
    next(err);
  }
});

publicTrustCenterRouter.post(
  "/verify/manifest",
  validateBody(verifyTrustCenterManifestSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;

      const data = await verifyTrustCenterManifest({
        manifestKey: body.manifestKey,
        checksumSha256: body.checksumSha256,
        signature: body.signature,
        requesterIp: req.ip,
        userAgent: req.headers["user-agent"],
        requestId: (req as any).requestId
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
