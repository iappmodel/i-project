import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  createPrivateRoomPortalSchema,
  customerTrustProofPortalQuerySchema
} from "./admin-security-customer-trust-proof-portals.validation";
import {
  getCustomerTrustProofPortalIntegrity,
  getOrCreatePrivateRoomPortal,
  listCustomerTrustProofPortalEvents,
  listCustomerTrustProofPortals,
  listCustomerTrustProofPortalSessions
} from "./admin-security-customer-trust-proof-portals.service";

export const adminSecurityCustomerTrustProofPortalsRouter = Router();

adminSecurityCustomerTrustProofPortalsRouter.use(requireAdminAuth);

adminSecurityCustomerTrustProofPortalsRouter.get(
  "/",
  requireAdminPermission("admin.read"),
  validateQuery(customerTrustProofPortalQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;

      const items = await listCustomerTrustProofPortals({
        limit: query.limit,
        status: query.status,
        customerName: query.customerName,
        privateRoomId: query.privateRoomId
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityCustomerTrustProofPortalsRouter.get(
  "/sessions",
  requireAdminPermission("admin.read"),
  validateQuery(customerTrustProofPortalQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;

      const items = await listCustomerTrustProofPortalSessions({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityCustomerTrustProofPortalsRouter.get(
  "/events",
  requireAdminPermission("admin.read"),
  validateQuery(customerTrustProofPortalQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listCustomerTrustProofPortalEvents({ limit: query.limit });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityCustomerTrustProofPortalsRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getCustomerTrustProofPortalIntegrity();
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityCustomerTrustProofPortalsRouter.post(
  "/private-room",
  requireAdminPermission("admin.write"),
  validateBody(createPrivateRoomPortalSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;

      const data = await getOrCreatePrivateRoomPortal({
        privateRoomId: body.privateRoomId,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
