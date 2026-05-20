import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  governancePolicyQuerySchema,
  governanceRuleQuerySchema,
  policyEvaluationQuerySchema
} from "./admin-security-governance.validation";
import {
  getGovernancePolicyIntegrity,
  listGovernancePolicies,
  listGovernancePolicyRules,
  listPolicyEvaluations
} from "./admin-security-governance.service";

export const adminSecurityGovernanceRouter = Router();

adminSecurityGovernanceRouter.use(requireAdminAuth);

const rid = (req: { requestId?: string }) => req.requestId ?? "unknown";

adminSecurityGovernanceRouter.get(
  "/policies",
  requireAdminPermission("admin.read"),
  validateQuery(governancePolicyQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;

      const items = await listGovernancePolicies({
        limit: query.limit,
        category: query.category,
        status: query.status
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityGovernanceRouter.get(
  "/rules",
  requireAdminPermission("admin.read"),
  validateQuery(governanceRuleQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;

      const items = await listGovernancePolicyRules({
        limit: query.limit,
        category: query.category,
        policyKey: query.policyKey
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityGovernanceRouter.get(
  "/evaluations",
  requireAdminPermission("admin.read"),
  validateQuery(policyEvaluationQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;

      const items = await listPolicyEvaluations({
        limit: query.limit,
        policyKey: query.policyKey,
        evaluationStatus: query.evaluationStatus
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityGovernanceRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getGovernancePolicyIntegrity();

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);
