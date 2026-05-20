import { Router } from "express";
import { requireUserAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ok } from "../../shared/api-response";
import {
  portalListBodySchema,
  portalTokenBodySchema
} from "./customer-trust-proof-portal.validation";
import {
  createPrivateRoomPortalSession,
  getPortalCryptoStatus,
  getPortalDashboard,
  listPortalArtifacts,
  listPortalTimeline
} from "./customer-trust-proof-portal.service";

export const customerTrustProofPortalRouter = Router();

customerTrustProofPortalRouter.post(
  "/private-room/:privateRoomKey/session",
  requireUserAuth,
  async (req, res, next) => {
    try {
      const authUser = (req as any).auth;

      const data = await createPrivateRoomPortalSession({
        authUserId: authUser.userId,
        privateRoomKey: req.params.privateRoomKey,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        requestId: (req as any).requestId
      });

      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

customerTrustProofPortalRouter.post(
  "/dashboard",
  validateBody(portalTokenBodySchema),
  async (req, res, next) => {
    try {
      const authUser = (req as any).auth;
      const body = (req as any).validatedBody;

      const data = await getPortalDashboard({
        authUserId: authUser?.userId,
        portalToken: body.portalToken,
        requestId: (req as any).requestId
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

customerTrustProofPortalRouter.post(
  "/artifacts",
  validateBody(portalListBodySchema),
  async (req, res, next) => {
    try {
      const authUser = (req as any).auth;
      const body = (req as any).validatedBody;

      const data = await listPortalArtifacts({
        authUserId: authUser?.userId,
        portalToken: body.portalToken,
        limit: body.limit,
        requestId: (req as any).requestId
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

customerTrustProofPortalRouter.post(
  "/timeline",
  validateBody(portalListBodySchema),
  async (req, res, next) => {
    try {
      const authUser = (req as any).auth;
      const body = (req as any).validatedBody;

      const data = await listPortalTimeline({
        authUserId: authUser?.userId,
        portalToken: body.portalToken,
        limit: body.limit,
        requestId: (req as any).requestId
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

customerTrustProofPortalRouter.post(
  "/crypto-status",
  validateBody(portalTokenBodySchema),
  async (req, res, next) => {
    try {
      const authUser = (req as any).auth;
      const body = (req as any).validatedBody;

      const data = await getPortalCryptoStatus({
        authUserId: authUser?.userId,
        portalToken: body.portalToken,
        requestId: (req as any).requestId
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
