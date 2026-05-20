import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  forceExpireArtifactSchema,
  idParamSchema,
  revocationQuerySchema,
  revokeComplianceReportSchema,
  revokeDocumentGrantSchema,
  revokeQuestionnaireExportSchema,
  revokeTrustCenterReportSchema
} from "./admin-security-revocations.validation";
import {
  forceExpireArtifact,
  getRevocationIntegrity,
  listRevocationNotifications,
  listRevocations,
  revokeComplianceReport,
  revokeEnterpriseRoomDocumentGrant,
  revokeQuestionnaireExport,
  revokeTrustCenterReportPublication
} from "./admin-security-revocations.service";

export const adminSecurityRevocationsRouter = Router();

adminSecurityRevocationsRouter.use(requireAdminAuth);

adminSecurityRevocationsRouter.get(
  "/",
  requireAdminPermission("admin.read"),
  validateQuery(revocationQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;

      const items = await listRevocations({
        limit: query.limit,
        status: query.status,
        sourceType: query.sourceType
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityRevocationsRouter.get(
  "/notifications",
  requireAdminPermission("admin.read"),
  validateQuery(revocationQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;

      const items = await listRevocationNotifications({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityRevocationsRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getRevocationIntegrity();
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityRevocationsRouter.post(
  "/compliance-reports/:id/revoke",
  requireAdminPermission("admin.write"),
  validateBody(revokeComplianceReportSchema),
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

      const data = await revokeComplianceReport({
        adminAuthUserId: admin.userId,
        complianceReportId: params.data.id,
        reasonCode: body.reasonCode,
        reason: body.reason,
        publicReason: body.publicReason,
        notifyCustomers: body.notifyCustomers,
        notifyAuditors: body.notifyAuditors,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityRevocationsRouter.post(
  "/questionnaire-exports/:id/revoke",
  requireAdminPermission("admin.write"),
  validateBody(revokeQuestionnaireExportSchema),
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

      const data = await revokeQuestionnaireExport({
        adminAuthUserId: admin.userId,
        questionnaireExportId: params.data.id,
        reasonCode: body.reasonCode,
        reason: body.reason,
        publicReason: body.publicReason,
        notifyCustomers: body.notifyCustomers,
        notifyAuditors: body.notifyAuditors,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityRevocationsRouter.post(
  "/enterprise-room-document-grants/:id/revoke",
  requireAdminPermission("admin.write"),
  validateBody(revokeDocumentGrantSchema),
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

      const data = await revokeEnterpriseRoomDocumentGrant({
        adminAuthUserId: admin.userId,
        documentGrantId: params.data.id,
        reasonCode: body.reasonCode,
        reason: body.reason,
        publicReason: body.publicReason,
        notifyCustomers: body.notifyCustomers,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityRevocationsRouter.post(
  "/trust-center-reports/:id/revoke-publication",
  requireAdminPermission("admin.write"),
  validateBody(revokeTrustCenterReportSchema),
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

      const data = await revokeTrustCenterReportPublication({
        adminAuthUserId: admin.userId,
        trustCenterReportId: params.data.id,
        reasonCode: body.reasonCode,
        reason: body.reason,
        publicReason: body.publicReason,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityRevocationsRouter.post(
  "/force-expire",
  requireAdminPermission("admin.write"),
  validateBody(forceExpireArtifactSchema),
  async (req, res, next) => {
    try {
      const admin = (req as any).admin;
      const body = (req as any).validatedBody;

      const data = await forceExpireArtifact({
        adminAuthUserId: admin.userId,
        sourceType: body.sourceType,
        sourceId: body.sourceId,
        reasonCode: body.reasonCode,
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
