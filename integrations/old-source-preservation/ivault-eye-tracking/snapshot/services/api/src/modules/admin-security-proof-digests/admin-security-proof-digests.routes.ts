import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  createAdminDigestSubscriptionSchema,
  proofDigestQuerySchema,
  recordNotificationEventSchema
} from "./admin-security-proof-digests.validation";
import {
  createAdminDigestSubscription,
  getProofDigestIntegrity,
  listProofDigestItems,
  listProofDigestRuns,
  listProofDigestSubscriptions,
  listProofNotificationEvents,
  processProofDigests,
  recordProofNotificationEvent
} from "./admin-security-proof-digests.service";

export const adminSecurityProofDigestsRouter = Router();

adminSecurityProofDigestsRouter.use(requireAdminAuth);

adminSecurityProofDigestsRouter.get(
  "/subscriptions",
  requireAdminPermission("admin.read"),
  validateQuery(proofDigestQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listProofDigestSubscriptions({
        limit: query.limit,
        status: query.status,
        recipientEmail: query.recipientEmail
      });
      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityProofDigestsRouter.get(
  "/events",
  requireAdminPermission("admin.read"),
  validateQuery(proofDigestQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listProofNotificationEvents({
        limit: query.limit,
        status: query.status,
        eventType: query.eventType,
        severity: query.severity
      });
      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityProofDigestsRouter.get(
  "/runs",
  requireAdminPermission("admin.read"),
  validateQuery(proofDigestQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listProofDigestRuns({
        limit: query.limit,
        status: query.status
      });
      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityProofDigestsRouter.get(
  "/items",
  requireAdminPermission("admin.read"),
  validateQuery(proofDigestQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listProofDigestItems({
        limit: query.limit,
        severity: query.severity
      });
      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityProofDigestsRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getProofDigestIntegrity();
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityProofDigestsRouter.post(
  "/subscriptions/admin",
  requireAdminPermission("admin.write"),
  validateBody(createAdminDigestSubscriptionSchema),
  async (req, res, next) => {
    try {
      const admin = (req as any).admin;
      const body = (req as any).validatedBody;
      const data = await createAdminDigestSubscription({
        adminAuthUserId: admin.userId,
        recipientEmail: body.recipientEmail,
        recipientDisplayName: body.recipientDisplayName,
        digestFrequency: body.digestFrequency,
        digestChannel: body.digestChannel,
        timezone: body.timezone,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });
      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityProofDigestsRouter.post(
  "/events",
  requireAdminPermission("admin.write"),
  validateBody(recordNotificationEventSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const data = await recordProofNotificationEvent({
        ...body,
        requestId: (req as any).requestId
      });
      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityProofDigestsRouter.post(
  "/process",
  requireAdminPermission("admin.write"),
  async (req, res, next) => {
    try {
      const data = await processProofDigests({
        requestId: (req as any).requestId
      });
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
