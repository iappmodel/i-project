import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  collectEvidenceSchema,
  controlCoverageQuerySchema,
  evidenceRunQuerySchema
} from "./admin-security-controls.validation";
import {
  collectControlEvidence,
  getControlMappingIntegrity,
  listControlCoverage,
  listEvidenceRuns,
  listPolicyControlMappings
} from "./admin-security-controls.service";

export const adminSecurityControlsRouter = Router();

adminSecurityControlsRouter.use(requireAdminAuth);

const rid = (req: { requestId?: string }) => req.requestId ?? "unknown";

adminSecurityControlsRouter.get(
  "/coverage",
  requireAdminPermission("admin.read"),
  validateQuery(controlCoverageQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;

      const items = await listControlCoverage({
        limit: query.limit,
        frameworkKey: query.frameworkKey,
        coverageStatus: query.coverageStatus
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityControlsRouter.get(
  "/mappings",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const items = await listPolicyControlMappings();

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityControlsRouter.get(
  "/evidence-runs",
  requireAdminPermission("admin.read"),
  validateQuery(evidenceRunQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;

      const items = await listEvidenceRuns({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityControlsRouter.post(
  "/evidence-runs",
  requireAdminPermission("admin.read"),
  validateBody(collectEvidenceSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await collectControlEvidence({
        adminAuthUserId: admin.userId,
        frameworkKey: body.frameworkKey,
        controlKey: body.controlKey,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityControlsRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getControlMappingIntegrity();

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);
