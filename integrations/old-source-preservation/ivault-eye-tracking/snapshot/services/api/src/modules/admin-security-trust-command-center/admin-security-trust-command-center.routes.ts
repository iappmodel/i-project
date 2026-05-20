import type { Request, Response } from "express";
import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  idParamSchema,
  refreshCommandCenterSchema,
  resolveQueueItemSchema,
  trustCommandCenterQuerySchema
} from "./admin-security-trust-command-center.validation";
import {
  acknowledgeCommandQueueItem,
  getCommandCenterIntegrity,
  getLatestCommandSnapshot,
  listCommandCards,
  listCommandQueue,
  listCommandTimeline,
  processCustomerCommandCenters,
  refreshCommandCenter,
  resolveCommandQueueItem
} from "./admin-security-trust-command-center.service";

export const adminSecurityTrustCommandCenterRouter = Router();

adminSecurityTrustCommandCenterRouter.use(requireAdminAuth);

adminSecurityTrustCommandCenterRouter.get(
  "/snapshot",
  requireAdminPermission("admin.read"),
  validateQuery(trustCommandCenterQuerySchema),
  async (req: Request, res: Response, next) => {
    try {
      const data = await getLatestCommandSnapshot(req.validatedQuery!);
      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustCommandCenterRouter.get(
  "/cards",
  requireAdminPermission("admin.read"),
  validateQuery(trustCommandCenterQuerySchema),
  async (req: Request, res: Response, next) => {
    try {
      const items = await listCommandCards(req.validatedQuery!);
      return res.json(ok({ items }, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustCommandCenterRouter.get(
  "/queue",
  requireAdminPermission("admin.read"),
  validateQuery(trustCommandCenterQuerySchema),
  async (req: Request, res: Response, next) => {
    try {
      const items = await listCommandQueue(req.validatedQuery!);
      return res.json(ok({ items }, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustCommandCenterRouter.get(
  "/timeline",
  requireAdminPermission("admin.read"),
  validateQuery(trustCommandCenterQuerySchema),
  async (req: Request, res: Response, next) => {
    try {
      const items = await listCommandTimeline(req.validatedQuery!);
      return res.json(ok({ items }, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustCommandCenterRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req: Request, res: Response, next) => {
    try {
      const data = await getCommandCenterIntegrity();
      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustCommandCenterRouter.post(
  "/refresh",
  requireAdminPermission("admin.write"),
  validateBody(refreshCommandCenterSchema),
  async (req: Request, res: Response, next) => {
    try {
      const data = await refreshCommandCenter({
        ...req.validatedBody!,
        requestId: req.requestId ?? "unknown"
      });

      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustCommandCenterRouter.post(
  "/customers/process",
  requireAdminPermission("admin.write"),
  async (req: Request, res: Response, next) => {
    try {
      const data = await processCustomerCommandCenters({
        requestId: req.requestId ?? "unknown"
      });

      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustCommandCenterRouter.post(
  "/queue/:id/acknowledge",
  requireAdminPermission("admin.write"),
  async (req: Request, res: Response, next) => {
    try {
      const params = idParamSchema.parse(req.params);
      const admin = req.admin!;

      const data = await acknowledgeCommandQueueItem({
        queueItemId: params.id,
        adminAuthUserId: admin.userId,
        requestId: req.requestId ?? "unknown",
        metadata: {}
      });

      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustCommandCenterRouter.post(
  "/queue/:id/resolve",
  requireAdminPermission("admin.write"),
  validateBody(resolveQueueItemSchema),
  async (req: Request, res: Response, next) => {
    try {
      const params = idParamSchema.parse(req.params);
      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await resolveCommandQueueItem({
        queueItemId: params.id,
        adminAuthUserId: admin.userId,
        resolutionNote: body.resolutionNote,
        requestId: req.requestId ?? "unknown",
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);
