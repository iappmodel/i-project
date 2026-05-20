import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  createProofHealthSignalSchema,
  proofObservabilityQuerySchema
} from "./admin-security-proof-observability.validation";
import {
  createProofHealthSignal,
  getProofCommandCenterLatest,
  getProofCommandCenterQueues,
  getProofObservabilityIntegrity,
  listCustomerTrustHealth,
  listProofCommandCenterRecentActivity,
  listProofHealthSignals,
  runProofObservabilityCycle
} from "./admin-security-proof-observability.service";

export const adminSecurityProofObservabilityRouter = Router();

adminSecurityProofObservabilityRouter.use(requireAdminAuth);

adminSecurityProofObservabilityRouter.get(
  "/latest",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getProofCommandCenterLatest();
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityProofObservabilityRouter.get(
  "/queues",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getProofCommandCenterQueues();
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityProofObservabilityRouter.get(
  "/customer-health",
  requireAdminPermission("admin.read"),
  validateQuery(proofObservabilityQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;

      const items = await listCustomerTrustHealth({
        limit: query.limit,
        healthStatus: query.healthStatus,
        riskLevel: query.riskLevel,
        customerName: query.customerName,
        privateRoomId: query.privateRoomId
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityProofObservabilityRouter.get(
  "/signals",
  requireAdminPermission("admin.read"),
  validateQuery(proofObservabilityQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;

      const items = await listProofHealthSignals({
        limit: query.limit,
        severity: query.severity,
        signalType: query.signalType,
        privateRoomId: query.privateRoomId
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityProofObservabilityRouter.get(
  "/activity",
  requireAdminPermission("admin.read"),
  validateQuery(proofObservabilityQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;

      const items = await listProofCommandCenterRecentActivity({
        limit: query.limit
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityProofObservabilityRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getProofObservabilityIntegrity();
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityProofObservabilityRouter.post(
  "/cycle",
  requireAdminPermission("admin.write"),
  async (req, res, next) => {
    try {
      const data = await runProofObservabilityCycle({
        requestId: (req as any).requestId
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityProofObservabilityRouter.post(
  "/signals",
  requireAdminPermission("admin.write"),
  validateBody(createProofHealthSignalSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;

      const data = await createProofHealthSignal({
        ...body,
        requestId: (req as any).requestId
      });

      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
