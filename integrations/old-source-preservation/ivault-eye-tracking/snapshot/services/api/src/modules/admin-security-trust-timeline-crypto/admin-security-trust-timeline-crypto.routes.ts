import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  anchorSchema,
  chainEventSchema,
  checkpointSchema,
  merkleBatchSchema,
  timelineCryptoQuerySchema,
  verifyChainSchema,
  verifyMerkleBatchSchema
} from "./admin-security-trust-timeline-crypto.validation";
import {
  buildMerkleBatch,
  chainTimelineEvent,
  createTimelineAnchor,
  createTimelineCheckpoint,
  getTimelineCryptoIntegrity,
  listTimelineAnchors,
  listTimelineChainEntries,
  listTimelineChains,
  listTimelineCheckpoints,
  listTimelineMerkleBatches,
  verifyTimelineChain,
  verifyTimelineMerkleBatch
} from "./admin-security-trust-timeline-crypto.service";

export const adminSecurityTrustTimelineCryptoRouter = Router();

adminSecurityTrustTimelineCryptoRouter.use(requireAdminAuth);

adminSecurityTrustTimelineCryptoRouter.get(
  "/chains",
  requireAdminPermission("admin.read"),
  validateQuery(timelineCryptoQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;

      const items = await listTimelineChains({
        limit: query.limit,
        status: query.status,
        chainScope: query.chainScope
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTimelineCryptoRouter.get(
  "/entries",
  requireAdminPermission("admin.read"),
  validateQuery(timelineCryptoQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listTimelineChainEntries({ limit: query.limit });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTimelineCryptoRouter.get(
  "/checkpoints",
  requireAdminPermission("admin.read"),
  validateQuery(timelineCryptoQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listTimelineCheckpoints({ limit: query.limit });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTimelineCryptoRouter.get(
  "/merkle-batches",
  requireAdminPermission("admin.read"),
  validateQuery(timelineCryptoQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;

      const items = await listTimelineMerkleBatches({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTimelineCryptoRouter.get(
  "/anchors",
  requireAdminPermission("admin.read"),
  validateQuery(timelineCryptoQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listTimelineAnchors({ limit: query.limit });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTimelineCryptoRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getTimelineCryptoIntegrity();
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTimelineCryptoRouter.post(
  "/chain-event",
  requireAdminPermission("admin.write"),
  validateBody(chainEventSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;

      const data = await chainTimelineEvent({
        timelineEventId: body.timelineEventId,
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTimelineCryptoRouter.post(
  "/checkpoints",
  requireAdminPermission("admin.write"),
  validateBody(checkpointSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;

      const data = await createTimelineCheckpoint({
        chainId: body.chainId,
        checkpointType: body.checkpointType,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTimelineCryptoRouter.post(
  "/merkle-batches",
  requireAdminPermission("admin.write"),
  validateBody(merkleBatchSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;

      const data = await buildMerkleBatch({
        chainId: body.chainId,
        fromSequenceNumber: body.fromSequenceNumber,
        toSequenceNumber: body.toSequenceNumber,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTimelineCryptoRouter.post(
  "/anchors",
  requireAdminPermission("admin.write"),
  validateBody(anchorSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;

      const data = await createTimelineAnchor({
        chainId: body.chainId,
        checkpointId: body.checkpointId,
        merkleBatchId: body.merkleBatchId,
        anchorType: body.anchorType,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTimelineCryptoRouter.post(
  "/verify-chain",
  requireAdminPermission("admin.read"),
  validateBody(verifyChainSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const data = await verifyTimelineChain({ chainId: body.chainId });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustTimelineCryptoRouter.post(
  "/verify-merkle-batch",
  requireAdminPermission("admin.read"),
  validateBody(verifyMerkleBatchSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const data = await verifyTimelineMerkleBatch({
        merkleBatchId: body.merkleBatchId
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
