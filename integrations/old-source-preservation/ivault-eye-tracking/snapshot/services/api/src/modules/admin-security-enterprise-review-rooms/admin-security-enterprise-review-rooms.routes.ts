import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import { sendValidationFailure } from "../../shared/route-helpers";
import {
  createEnterpriseReviewRoomSchema,
  enterpriseReviewRoomIdParamSchema,
  enterpriseReviewRoomQuerySchema,
  grantEnterpriseReviewRoomDocumentSchema,
  inviteEnterpriseReviewRoomParticipantSchema,
  publishEnterpriseReviewRoomSchema,
  revokeEnterpriseReviewRoomSchema
} from "./admin-security-enterprise-review-rooms.validation";
import {
  createEnterpriseReviewRoom,
  getEnterpriseReviewRoomIntegrity,
  grantEnterpriseReviewRoomDocument,
  inviteEnterpriseReviewRoomParticipant,
  listEnterpriseReviewRoomDocuments,
  listEnterpriseReviewRoomParticipants,
  listEnterpriseReviewRooms,
  publishEnterpriseReviewRoom,
  revokeEnterpriseReviewRoom
} from "./admin-security-enterprise-review-rooms.service";

export const adminSecurityEnterpriseReviewRoomsRouter = Router();

adminSecurityEnterpriseReviewRoomsRouter.use(requireAdminAuth);

const rid = (req: { requestId?: string }) => req.requestId ?? "unknown";

adminSecurityEnterpriseReviewRoomsRouter.get(
  "/",
  requireAdminPermission("admin.read"),
  validateQuery(enterpriseReviewRoomQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;
      const items = await listEnterpriseReviewRooms({
        limit: query.limit,
        status: query.status
      });
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityEnterpriseReviewRoomsRouter.get(
  "/participants",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const items = await listEnterpriseReviewRoomParticipants({
        reviewRoomId:
          typeof req.query.reviewRoomId === "string" ? req.query.reviewRoomId : undefined,
        limit: req.query.limit ? Number(req.query.limit) : 100
      });
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityEnterpriseReviewRoomsRouter.get(
  "/documents",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const items = await listEnterpriseReviewRoomDocuments({
        reviewRoomId:
          typeof req.query.reviewRoomId === "string" ? req.query.reviewRoomId : undefined,
        limit: req.query.limit ? Number(req.query.limit) : 100
      });
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityEnterpriseReviewRoomsRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getEnterpriseReviewRoomIntegrity();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityEnterpriseReviewRoomsRouter.post(
  "/",
  requireAdminPermission("admin.write"),
  validateBody(createEnterpriseReviewRoomSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await createEnterpriseReviewRoom({
        adminAuthUserId: admin.userId,
        customerName: body.customerName,
        customerDomain: body.customerDomain,
        customerExternalId: body.customerExternalId,
        roomTitle: body.roomTitle,
        roomSummary: body.roomSummary,
        reviewType: body.reviewType,
        salesOwnerAuthUserId: body.salesOwnerAuthUserId,
        securityOwnerAuthUserId: body.securityOwnerAuthUserId,
        accessStartsAt: body.accessStartsAt,
        accessExpiresAt: body.accessExpiresAt,
        requireNda: body.requireNda,
        requireEmailDomainMatch: body.requireEmailDomainMatch,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityEnterpriseReviewRoomsRouter.post(
  "/:id/publish",
  requireAdminPermission("admin.write"),
  validateBody(publishEnterpriseReviewRoomSchema),
  async (req, res, next) => {
    try {
      const params = enterpriseReviewRoomIdParamSchema.safeParse(req.params);
      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const admin = req.admin!;
      const body = req.validatedBody!;
      const data = await publishEnterpriseReviewRoom({
        adminAuthUserId: admin.userId,
        reviewRoomId: params.data.id,
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

adminSecurityEnterpriseReviewRoomsRouter.post(
  "/:id/participants",
  requireAdminPermission("admin.write"),
  validateBody(inviteEnterpriseReviewRoomParticipantSchema),
  async (req, res, next) => {
    try {
      const params = enterpriseReviewRoomIdParamSchema.safeParse(req.params);
      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const admin = req.admin!;
      const body = req.validatedBody!;
      const data = await inviteEnterpriseReviewRoomParticipant({
        adminAuthUserId: admin.userId,
        reviewRoomId: params.data.id,
        email: body.email,
        displayName: body.displayName,
        organizationName: body.organizationName,
        participantType: body.participantType,
        roleTitle: body.roleTitle,
        authUserId: body.authUserId,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityEnterpriseReviewRoomsRouter.post(
  "/:id/documents",
  requireAdminPermission("admin.write"),
  validateBody(grantEnterpriseReviewRoomDocumentSchema),
  async (req, res, next) => {
    try {
      const params = enterpriseReviewRoomIdParamSchema.safeParse(req.params);
      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const admin = req.admin!;
      const body = req.validatedBody!;
      const data = await grantEnterpriseReviewRoomDocument({
        adminAuthUserId: admin.userId,
        reviewRoomId: params.data.id,
        documentType: body.documentType,
        displayTitle: body.displayTitle,
        displaySummary: body.displaySummary,
        complianceReportRequestId: body.complianceReportRequestId,
        auditPeriodExportRequestId: body.auditPeriodExportRequestId,
        trustCenterReportId: body.trustCenterReportId,
        visibility: body.visibility,
        allowDownload: body.allowDownload,
        allowPublicVerification: body.allowPublicVerification,
        accessStartsAt: body.accessStartsAt,
        accessExpiresAt: body.accessExpiresAt,
        sortOrder: body.sortOrder,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityEnterpriseReviewRoomsRouter.post(
  "/:id/revoke",
  requireAdminPermission("admin.write"),
  validateBody(revokeEnterpriseReviewRoomSchema),
  async (req, res, next) => {
    try {
      const params = enterpriseReviewRoomIdParamSchema.safeParse(req.params);
      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const admin = req.admin!;
      const body = req.validatedBody!;
      const data = await revokeEnterpriseReviewRoom({
        adminAuthUserId: admin.userId,
        reviewRoomId: params.data.id,
        revokeReason: body.revokeReason,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);
