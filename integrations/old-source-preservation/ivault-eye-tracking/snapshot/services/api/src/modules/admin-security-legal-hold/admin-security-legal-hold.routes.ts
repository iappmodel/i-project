import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import { sendValidationFailure } from "../../shared/route-helpers";
import {
  addLegalHoldTargetSchema,
  createLegalHoldSchema,
  legalHoldIdParamSchema,
  legalHoldQuerySchema,
  releaseLegalHoldSchema
} from "./admin-security-legal-hold.validation";
import {
  addLegalHoldTarget,
  createLegalHold,
  getLegalHoldIntegrity,
  listLegalHolds,
  listLegalHoldTargets,
  releaseLegalHold
} from "./admin-security-legal-hold.service";

export const adminSecurityLegalHoldRouter = Router();

adminSecurityLegalHoldRouter.use(requireAdminAuth);

const rid = (req: { requestId?: string }) => req.requestId ?? "unknown";

adminSecurityLegalHoldRouter.get(
  "/",
  requireAdminPermission("admin.read"),
  validateQuery(legalHoldQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;
      const items = await listLegalHolds({
        limit: query.limit,
        status: query.status,
        holdType: query.holdType
      });
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityLegalHoldRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getLegalHoldIntegrity();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityLegalHoldRouter.get(
  "/targets",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const items = await listLegalHoldTargets({
        legalHoldId: typeof req.query.legalHoldId === "string" ? req.query.legalHoldId : undefined,
        limit: req.query.limit ? Number(req.query.limit) : 100
      });
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityLegalHoldRouter.post(
  "/",
  requireAdminPermission("admin.write"),
  validateBody(createLegalHoldSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;
      const data = await createLegalHold({
        adminAuthUserId: admin.userId,
        holdKey: body.holdKey,
        holdType: body.holdType,
        title: body.title,
        reason: body.reason,
        authority: body.authority,
        externalReference: body.externalReference,
        effectiveAt: body.effectiveAt,
        expiresAt: body.expiresAt,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });
      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityLegalHoldRouter.post(
  "/:id/targets",
  requireAdminPermission("admin.write"),
  validateBody(addLegalHoldTargetSchema),
  async (req, res, next) => {
    try {
      const params = legalHoldIdParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const admin = req.admin!;
      const body = req.validatedBody!;
      const data = await addLegalHoldTarget({
        adminAuthUserId: admin.userId,
        legalHoldId: params.data.id,
        targetType: body.targetType,
        sourceType: body.sourceType,
        sourceId: body.sourceId,
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
        adminTargetAuthUserId: body.adminAuthUserId,
        archiveManifestId: body.archiveManifestId,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });
      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityLegalHoldRouter.post(
  "/:id/release",
  requireAdminPermission("admin.write"),
  validateBody(releaseLegalHoldSchema),
  async (req, res, next) => {
    try {
      const params = legalHoldIdParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const admin = req.admin!;
      const body = req.validatedBody!;
      const data = await releaseLegalHold({
        adminAuthUserId: admin.userId,
        legalHoldId: params.data.id,
        releaseReason: body.releaseReason,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);
