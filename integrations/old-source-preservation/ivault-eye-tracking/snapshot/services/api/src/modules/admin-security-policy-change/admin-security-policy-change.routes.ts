import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import { sendValidationFailure } from "../../shared/route-helpers";
import {
  activatePolicyChangeSchema,
  approvePolicyChangeSchema,
  cancelPolicyChangeSchema,
  createPolicyChangeSchema,
  policySimulationItemQuerySchema,
  policySimulationQuerySchema,
  policyChangeIdParamSchema,
  policyChangeQuerySchema,
  rejectPolicyChangeSchema,
  runPolicySimulationSchema,
  reviewPolicyChangeSchema,
  submitPolicyChangeSchema
} from "./admin-security-policy-change.validation";
import {
  activatePolicyChangeRequest,
  approvePolicyChangeRequest,
  cancelPolicyChangeRequest,
  createPolicyChangeRequest,
  getPolicyChangeIntegrity,
  getPolicySimulationIntegrity,
  listPolicyChangeRequests,
  listPolicyChangeReviews,
  listPolicySimulationItems,
  listPolicySimulationRuns,
  rejectPolicyChangeRequest,
  runPolicyChangeSimulation,
  reviewPolicyChangeRequest,
  submitPolicyChangeRequest
} from "./admin-security-policy-change.service";

export const adminSecurityPolicyChangeRouter = Router();

adminSecurityPolicyChangeRouter.use(requireAdminAuth);

const rid = (req: { requestId?: string }) => req.requestId ?? "unknown";

adminSecurityPolicyChangeRouter.get(
  "/",
  requireAdminPermission("admin.read"),
  validateQuery(policyChangeQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;

      const items = await listPolicyChangeRequests({
        limit: query.limit,
        status: query.status,
        changeType: query.changeType
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityPolicyChangeRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getPolicyChangeIntegrity();

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityPolicyChangeRouter.get(
  "/reviews",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const items = await listPolicyChangeReviews({
        changeRequestId: typeof req.query.changeRequestId === "string" ? req.query.changeRequestId : undefined,
        limit: req.query.limit ? Number(req.query.limit) : 100
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityPolicyChangeRouter.post(
  "/",
  requireAdminPermission("admin.write"),
  validateBody(createPolicyChangeSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await createPolicyChangeRequest({
        adminAuthUserId: admin.userId,
        changeType: body.changeType,
        changeKey: body.changeKey,
        title: body.title,
        rationale: body.rationale,
        targetPolicyId: body.targetPolicyId,
        policyKey: body.policyKey,
        policyName: body.policyName,
        category: body.category,
        severity: body.severity,
        ownerTeam: body.ownerTeam,
        description: body.description,
        riskLevel: body.riskLevel,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityPolicyChangeRouter.post(
  "/:id/simulate",
  requireAdminPermission("admin.read"),
  validateBody(runPolicySimulationSchema),
  async (req, res, next) => {
    try {
      const params = policyChangeIdParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await runPolicyChangeSimulation({
        adminAuthUserId: admin.userId,
        changeRequestId: params.data.id,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityPolicyChangeRouter.get(
  "/simulations",
  requireAdminPermission("admin.read"),
  validateQuery(policySimulationQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;

      const items = await listPolicySimulationRuns({
        limit: query.limit,
        status: query.status,
        policyChangeRequestId: query.policyChangeRequestId
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityPolicyChangeRouter.get(
  "/simulation-items",
  requireAdminPermission("admin.read"),
  validateQuery(policySimulationItemQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;

      const items = await listPolicySimulationItems({
        limit: query.limit,
        simulationRunId: query.simulationRunId,
        resultStatus: query.resultStatus
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityPolicyChangeRouter.get(
  "/simulations/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getPolicySimulationIntegrity();

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityPolicyChangeRouter.post(
  "/:id/submit",
  requireAdminPermission("admin.write"),
  validateBody(submitPolicyChangeSchema),
  async (req, res, next) => {
    try {
      const params = policyChangeIdParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await submitPolicyChangeRequest({
        adminAuthUserId: admin.userId,
        changeRequestId: params.data.id,
        note: body.note,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityPolicyChangeRouter.post(
  "/:id/review",
  requireAdminPermission("admin.read"),
  validateBody(reviewPolicyChangeSchema),
  async (req, res, next) => {
    try {
      const params = policyChangeIdParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await reviewPolicyChangeRequest({
        adminAuthUserId: admin.userId,
        changeRequestId: params.data.id,
        reviewStatus: body.reviewStatus,
        reviewNote: body.reviewNote,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityPolicyChangeRouter.post(
  "/:id/approve",
  requireAdminPermission("admin.write"),
  validateBody(approvePolicyChangeSchema),
  async (req, res, next) => {
    try {
      const params = policyChangeIdParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await approvePolicyChangeRequest({
        adminAuthUserId: admin.userId,
        changeRequestId: params.data.id,
        approvalNote: body.approvalNote,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityPolicyChangeRouter.post(
  "/:id/reject",
  requireAdminPermission("admin.write"),
  validateBody(rejectPolicyChangeSchema),
  async (req, res, next) => {
    try {
      const params = policyChangeIdParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await rejectPolicyChangeRequest({
        adminAuthUserId: admin.userId,
        changeRequestId: params.data.id,
        rejectionReason: body.rejectionReason,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityPolicyChangeRouter.post(
  "/:id/activate",
  requireAdminPermission("admin.write"),
  validateBody(activatePolicyChangeSchema),
  async (req, res, next) => {
    try {
      const params = policyChangeIdParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await activatePolicyChangeRequest({
        adminAuthUserId: admin.userId,
        changeRequestId: params.data.id,
        activationNote: body.activationNote,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityPolicyChangeRouter.post(
  "/:id/cancel",
  requireAdminPermission("admin.write"),
  validateBody(cancelPolicyChangeSchema),
  async (req, res, next) => {
    try {
      const params = policyChangeIdParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await cancelPolicyChangeRequest({
        adminAuthUserId: admin.userId,
        changeRequestId: params.data.id,
        cancelReason: body.cancelReason,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);
