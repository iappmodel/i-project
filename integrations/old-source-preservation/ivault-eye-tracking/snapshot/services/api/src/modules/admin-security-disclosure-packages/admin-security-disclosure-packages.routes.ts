import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  createDisclosurePackageSchema,
  disclosurePackageQuerySchema
} from "./admin-security-disclosure-packages.validation";
import {
  createDisclosurePackage,
  getDisclosurePackageIntegrity,
  listDisclosurePackageItems,
  listDisclosurePackages
} from "./admin-security-disclosure-packages.service";

export const adminSecurityDisclosurePackagesRouter = Router();

adminSecurityDisclosurePackagesRouter.use(requireAdminAuth);

adminSecurityDisclosurePackagesRouter.get(
  "/",
  requireAdminPermission("admin.read"),
  validateQuery(disclosurePackageQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listDisclosurePackages({
        limit: query.limit,
        status: query.status,
        disclosureType: query.disclosureType,
        sourceType: query.sourceType
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityDisclosurePackagesRouter.get(
  "/items",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const items = await listDisclosurePackageItems({
        packageId:
          typeof req.query.packageId === "string" ? req.query.packageId : undefined,
        limit: req.query.limit ? Number(req.query.limit) : 100
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityDisclosurePackagesRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getDisclosurePackageIntegrity();
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityDisclosurePackagesRouter.post(
  "/",
  requireAdminPermission("admin.write"),
  validateBody(createDisclosurePackageSchema),
  async (req, res, next) => {
    try {
      const admin = (req as any).admin;
      const body = (req as any).validatedBody;

      const data = await createDisclosurePackage({
        adminAuthUserId: admin.userId,
        disclosureType: body.disclosureType,
        riskLevel: body.riskLevel,
        sourceType: body.sourceType,
        sourceId: body.sourceId,
        publicationTargetType: body.publicationTargetType,
        publicationTargetId: body.publicationTargetId,
        title: body.title,
        summary: body.summary,
        customerName: body.customerName,
        customerDomain: body.customerDomain,
        enterpriseReviewRoomId: body.enterpriseReviewRoomId,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
