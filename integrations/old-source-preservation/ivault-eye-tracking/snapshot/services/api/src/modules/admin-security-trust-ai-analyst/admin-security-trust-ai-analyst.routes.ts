import type { Request, Response } from "express";
import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  idParamSchema,
  resolveFindingSchema,
  runTrustAiAnalystSchema,
  suppressFindingSchema,
  trustAiAnalystQuerySchema
} from "./admin-security-trust-ai-analyst.validation";
import {
  acknowledgeFinding,
  computeCustomerRiskScores,
  getTrustAiIntegrity,
  listCustomerRiskScores,
  listTrustAiDetectors,
  listTrustAiFindings,
  listTrustAiRecommendedActions,
  resolveFinding,
  runTrustAiAnalyst,
  suppressFinding
} from "./admin-security-trust-ai-analyst.service";

export const adminSecurityTrustAiAnalystRouter = Router();

adminSecurityTrustAiAnalystRouter.use(requireAdminAuth);

adminSecurityTrustAiAnalystRouter.get(
  "/detectors",
  requireAdminPermission("admin.read"),
  validateQuery(trustAiAnalystQuerySchema),
  async (req: Request, res: Response, next) => {
    try {
      const items = await listTrustAiDetectors(req.validatedQuery!);
      return res.json(ok({ items }, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustAiAnalystRouter.get(
  "/findings",
  requireAdminPermission("admin.read"),
  validateQuery(trustAiAnalystQuerySchema),
  async (req: Request, res: Response, next) => {
    try {
      const items = await listTrustAiFindings(req.validatedQuery!);
      return res.json(ok({ items }, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustAiAnalystRouter.get(
  "/risk-scores",
  requireAdminPermission("admin.read"),
  validateQuery(trustAiAnalystQuerySchema),
  async (req: Request, res: Response, next) => {
    try {
      const items = await listCustomerRiskScores(req.validatedQuery!);
      return res.json(ok({ items }, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustAiAnalystRouter.get(
  "/recommended-actions",
  requireAdminPermission("admin.read"),
  validateQuery(trustAiAnalystQuerySchema),
  async (req: Request, res: Response, next) => {
    try {
      const items = await listTrustAiRecommendedActions(req.validatedQuery!);
      return res.json(ok({ items }, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustAiAnalystRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req: Request, res: Response, next) => {
    try {
      const data = await getTrustAiIntegrity();
      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustAiAnalystRouter.post(
  "/run",
  requireAdminPermission("admin.write"),
  validateBody(runTrustAiAnalystSchema),
  async (req: Request, res: Response, next) => {
    try {
      const data = await runTrustAiAnalyst({
        ...req.validatedBody!,
        requestId: req.requestId ?? "unknown"
      });

      return res.status(201).json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustAiAnalystRouter.post(
  "/risk-scores/compute",
  requireAdminPermission("admin.write"),
  async (req: Request, res: Response, next) => {
    try {
      const data = await computeCustomerRiskScores({
        requestId: req.requestId ?? "unknown"
      });

      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustAiAnalystRouter.post(
  "/findings/:id/acknowledge",
  requireAdminPermission("admin.write"),
  async (req: Request, res: Response, next) => {
    try {
      const params = idParamSchema.parse(req.params);
      const admin = req.admin!;

      const data = await acknowledgeFinding({
        findingId: params.id,
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

adminSecurityTrustAiAnalystRouter.post(
  "/findings/:id/resolve",
  requireAdminPermission("admin.write"),
  validateBody(resolveFindingSchema),
  async (req: Request, res: Response, next) => {
    try {
      const params = idParamSchema.parse(req.params);
      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await resolveFinding({
        findingId: params.id,
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

adminSecurityTrustAiAnalystRouter.post(
  "/findings/:id/suppress",
  requireAdminPermission("admin.write"),
  validateBody(suppressFindingSchema),
  async (req: Request, res: Response, next) => {
    try {
      const params = idParamSchema.parse(req.params);
      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await suppressFinding({
        findingId: params.id,
        adminAuthUserId: admin.userId,
        suppressionReason: body.suppressionReason,
        requestId: req.requestId ?? "unknown",
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);
