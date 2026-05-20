import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  createProofQrCodeSchema,
  createProofVerificationLinkSchema,
  idParamSchema,
  proofQrQuerySchema,
  revokeProofVerificationLinkSchema
} from "./admin-security-proof-qr.validation";
import {
  createProofQrCode,
  createProofVerificationLink,
  getProofQrIntegrity,
  listProofQrCodeJobs,
  listProofQrCodes,
  listProofVerificationLinkEvents,
  listProofVerificationLinks,
  revokeProofVerificationLink
} from "./admin-security-proof-qr.service";

export const adminSecurityProofQrRouter = Router();

adminSecurityProofQrRouter.use(requireAdminAuth);

adminSecurityProofQrRouter.get(
  "/links",
  requireAdminPermission("admin.read"),
  validateQuery(proofQrQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listProofVerificationLinks({
        limit: query.limit,
        status: query.status,
        proofType: query.proofType
      });
      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityProofQrRouter.get(
  "/qr-codes",
  requireAdminPermission("admin.read"),
  validateQuery(proofQrQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listProofQrCodes({
        limit: query.limit,
        status: query.status,
        proofType: query.proofType
      });
      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityProofQrRouter.get(
  "/jobs",
  requireAdminPermission("admin.read"),
  validateQuery(proofQrQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listProofQrCodeJobs({
        limit: query.limit,
        status: query.status
      });
      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityProofQrRouter.get(
  "/events",
  requireAdminPermission("admin.read"),
  validateQuery(proofQrQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listProofVerificationLinkEvents({ limit: query.limit });
      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityProofQrRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getProofQrIntegrity();
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityProofQrRouter.post(
  "/links",
  requireAdminPermission("admin.write"),
  validateBody(createProofVerificationLinkSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const data = await createProofVerificationLink({
        proofType: body.proofType,
        proofId: body.proofId,
        proofKey: body.proofKey,
        title: body.title,
        summary: body.summary,
        baseUrl: body.baseUrl,
        expiresAt: body.expiresAt,
        maxUses: body.maxUses,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });
      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityProofQrRouter.post(
  "/qr-codes",
  requireAdminPermission("admin.write"),
  validateBody(createProofQrCodeSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const data = await createProofQrCode({
        verificationLinkId: body.verificationLinkId,
        qrFormat: body.qrFormat,
        sizePx: body.sizePx,
        includeLogo: body.includeLogo,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });
      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityProofQrRouter.post(
  "/links/:id/revoke",
  requireAdminPermission("admin.write"),
  validateBody(revokeProofVerificationLinkSchema),
  async (req, res, next) => {
    try {
      const params = idParamSchema.safeParse(req.params);
      if (!params.success) {
        return res.status(400).json({
          ok: false,
          data: null,
          error: {
            code: "VALIDATION_FAILED",
            category: "validation",
            message: "The request is invalid.",
            retryable: false,
            httpStatus: 400
          },
          requestId: (req as any).requestId
        });
      }

      const admin = (req as any).admin;
      const body = (req as any).validatedBody;
      const data = await revokeProofVerificationLink({
        adminAuthUserId: admin.userId,
        verificationLinkId: params.data.id,
        reason: body.reason,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
