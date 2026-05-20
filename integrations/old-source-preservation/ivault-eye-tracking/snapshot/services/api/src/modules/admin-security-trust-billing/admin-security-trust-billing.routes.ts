import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  createInvoiceFromPeriodSchema,
  createTrustBillingAccountSchema,
  entitlementCheckSchema,
  finalizeBillingPeriodSchema,
  recordUsageSchema,
  trustBillingQuerySchema
} from "./admin-security-trust-billing.validation";
import {
  checkTrustEntitlement,
  createInvoiceFromPeriod,
  createTrustBillingAccount,
  finalizeBillingPeriod,
  getTrustBillingIntegrity,
  listTrustBillingAccounts,
  listTrustBillingPlans,
  listTrustEntitlements,
  listTrustInvoices,
  listTrustUsageRollups,
  processBillingCycle,
  recordTrustUsage,
  refreshUsageRollups
} from "./admin-security-trust-billing.service";

export const adminSecurityTrustBillingRouter = Router();

adminSecurityTrustBillingRouter.use(requireAdminAuth);

adminSecurityTrustBillingRouter.get(
  "/plans",
  requireAdminPermission("admin.read"),
  validateQuery(trustBillingQuerySchema),
  async (req, res, next) => {
    try {
      const items = await listTrustBillingPlans(req.validatedQuery!);
      return res.json(ok({ items }, req.requestId ?? ""));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustBillingRouter.get(
  "/accounts",
  requireAdminPermission("admin.read"),
  validateQuery(trustBillingQuerySchema),
  async (req, res, next) => {
    try {
      const items = await listTrustBillingAccounts(req.validatedQuery!);
      return res.json(ok({ items }, req.requestId ?? ""));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustBillingRouter.get(
  "/entitlements",
  requireAdminPermission("admin.read"),
  validateQuery(trustBillingQuerySchema),
  async (req, res, next) => {
    try {
      const items = await listTrustEntitlements(req.validatedQuery!);
      return res.json(ok({ items }, req.requestId ?? ""));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustBillingRouter.get(
  "/usage-rollups",
  requireAdminPermission("admin.read"),
  validateQuery(trustBillingQuerySchema),
  async (req, res, next) => {
    try {
      const items = await listTrustUsageRollups(req.validatedQuery!);
      return res.json(ok({ items }, req.requestId ?? ""));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustBillingRouter.get(
  "/invoices",
  requireAdminPermission("admin.read"),
  validateQuery(trustBillingQuerySchema),
  async (req, res, next) => {
    try {
      const items = await listTrustInvoices(req.validatedQuery!);
      return res.json(ok({ items }, req.requestId ?? ""));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustBillingRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getTrustBillingIntegrity();
      return res.json(ok(data, req.requestId ?? ""));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustBillingRouter.post(
  "/accounts",
  requireAdminPermission("admin.write"),
  validateBody(createTrustBillingAccountSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await createTrustBillingAccount({
        ...body,
        adminAuthUserId: admin.userId,
        requestId: req.requestId ?? ""
      });

      return res.status(201).json(ok(data, req.requestId ?? ""));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustBillingRouter.post(
  "/entitlements/check",
  requireAdminPermission("admin.read"),
  validateBody(entitlementCheckSchema),
  async (req, res, next) => {
    try {
      const body = req.validatedBody!;

      const data = await checkTrustEntitlement({
        ...body,
        requestId: req.requestId ?? ""
      });

      return res.json(ok(data, req.requestId ?? ""));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustBillingRouter.post(
  "/usage",
  requireAdminPermission("admin.write"),
  validateBody(recordUsageSchema),
  async (req, res, next) => {
    try {
      const body = req.validatedBody!;

      const data = await recordTrustUsage({
        ...body,
        requestId: req.requestId ?? ""
      });

      return res.status(201).json(ok(data, req.requestId ?? ""));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustBillingRouter.post(
  "/usage-rollups/refresh",
  requireAdminPermission("admin.write"),
  async (req, res, next) => {
    try {
      const data = await refreshUsageRollups();
      return res.json(ok(data, req.requestId ?? ""));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustBillingRouter.post(
  "/cycle",
  requireAdminPermission("admin.write"),
  async (req, res, next) => {
    try {
      const data = await processBillingCycle({
        requestId: req.requestId ?? ""
      });

      return res.json(ok(data, req.requestId ?? ""));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustBillingRouter.post(
  "/periods/finalize",
  requireAdminPermission("admin.write"),
  validateBody(finalizeBillingPeriodSchema),
  async (req, res, next) => {
    try {
      const body = req.validatedBody!;

      const data = await finalizeBillingPeriod({
        ...body,
        requestId: req.requestId ?? ""
      });

      return res.json(ok(data, req.requestId ?? ""));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityTrustBillingRouter.post(
  "/invoices/from-period",
  requireAdminPermission("admin.write"),
  validateBody(createInvoiceFromPeriodSchema),
  async (req, res, next) => {
    try {
      const body = req.validatedBody!;

      const data = await createInvoiceFromPeriod({
        ...body,
        requestId: req.requestId ?? ""
      });

      return res.status(201).json(ok(data, req.requestId ?? ""));
    } catch (err) {
      next(err);
    }
  }
);
