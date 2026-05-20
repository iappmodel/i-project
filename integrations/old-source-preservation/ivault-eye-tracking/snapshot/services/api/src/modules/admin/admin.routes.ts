import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateQuery } from "../../middleware/validate-query";
import { validateBody } from "../../middleware/validate";
import { fail, ok } from "../../shared/api-response";
import { COMMON_ERRORS } from "../../shared/errors";
import { sendValidationFailure } from "../../shared/route-helpers";
import {
  acknowledgeAdminSecurityAlert,
  blockAdminSecurityDevice,
  assignAdminRoleAction,
  addAdminTrustComponent,
  approvePrivilegedAction,
  dismissAdminSecurityAlert,
  createAdminMfaChallenge,
  completeAdminSessionReauth,
  resolveAdminSecurityAlert,
  approveWithdrawalReview,
  blockWithdrawalReview,
  getAdminActionRisks,
  getAdminActionAuditLog,
  getAdminAuditHashIntegrity,
  getAdminDevice,
  getAdminSecurityDevices,
  getAdminSessionRisks,
  getAdminSessionControls,
  getAdminSessionIntegrity,
  getAdminUserRiskDevices,
  getAdminMe,
  getAdminMfaStatus,
  getAdminMoneyIntegrity,
  getAdminNetworkRiskObservations,
  getAdminPrivilegedActionRequests,
  getAdminRoles,
  getAdminSecurityAlerts,
  getAdminSecurityAlertDeliveries,
  getAdminSecurityAlertEscalations,
  getAdminSecurityAlertEscalationIntegrity,
  getAdminSecurityAlertDeliveryConfigStatus,
  getAdminSecurityAlertDeliveryIntegrity,
  getAdminSchedulerDashboard,
  getAdminSessionRiskEvents,
  getAdminSystemCommandCenter,
  getAdminUsers,
  getAdminUserTrustComponents,
  getAdminUserTrustDetail,
  getWithdrawalReviewQueue,
  rejectPrivilegedAction,
  revokeAdminRoleAction,
  revokeAllAdminSessions,
  revokeAdminSession,
  revokeAdminSecurityDevice,
  markAdminSecurityDeviceSuspicious,
  forceAdminSessionReauth,
  upsertAdminUserAction,
  trustAdminSecurityDevice,
  updateAdminDeviceStatus,
  verifyAdminMfaChallenge
} from "./admin.service";
import {
  adminDeviceIdParamSchema,
  adminDeviceStatusActionSchema,
  adminActionRiskQuerySchema,
  adminSessionActionSchema,
  adminSessionControlQuerySchema,
  revokeAllAdminSessionsSchema,
  acknowledgeAdminSecurityAlertSchema,
  adminSecurityDeviceQuerySchema,
  adminSessionRiskQuerySchema,
  adminRoleActionSchema,
  adminSecurityAlertIdParamSchema,
  addTrustComponentSchema,
  dismissAdminSecurityAlertSchema,
  createAdminMfaChallengeSchema,
  completeAdminSessionReauthSchema,
  resolveAdminSecurityAlertSchema,
  approvePrivilegedActionSchema,
  adminSecurityAlertQuerySchema,
  adminSecurityAlertDeliveryQuerySchema,
  adminSecurityAlertEscalationQuerySchema,
  adminPaginationQuerySchema,
  deviceIdParamSchema,
  privilegedActionIdParamSchema,
  privilegedActionQuerySchema,
  rejectPrivilegedActionSchema,
  reviewWithdrawalSchema,
  upsertAdminUserSchema,
  verifyAdminMfaChallengeSchema,
  updateDeviceStatusSchema,
  userIdParamSchema,
  withdrawalIdParamSchema
} from "./admin.validation";

export const adminRouter = Router();

adminRouter.use(requireAdminAuth);

const rid = (req: { requestId?: string }) => req.requestId ?? "unknown";

adminRouter.get("/me", async (req, res, next) => {
  try {
    const admin = req.admin;
    if (!admin) {
      return res.status(403).json(fail(COMMON_ERRORS.permissionDenied, rid(req)));
    }

    const data = await getAdminMe(admin.userId);

    return res.json(ok(data, rid(req)));
  } catch (err) {
    return next(err);
  }
});

adminRouter.get("/mfa/status", async (req, res, next) => {
  try {
    const admin = req.admin!;
    const data = await getAdminMfaStatus(admin.userId);
    return res.json(ok(data, rid(req)));
  } catch (err) {
    next(err);
  }
});

adminRouter.post(
  "/mfa/challenges",
  validateBody(createAdminMfaChallengeSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await createAdminMfaChallenge({
        adminAuthUserId: admin.userId,
        challengeType: body.challengeType,
        purpose: body.purpose,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.post(
  "/mfa/challenges/verify",
  validateBody(verifyAdminMfaChallengeSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await verifyAdminMfaChallenge({
        adminAuthUserId: admin.userId,
        challengeId: body.challengeId,
        code: body.code,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get(
  "/users",
  requireAdminPermission("admin.read"),
  validateQuery(adminPaginationQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;
      const items = await getAdminUsers(query.limit);

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.post(
  "/security-alerts/:id/acknowledge",
  requireAdminPermission("admin.read"),
  validateBody(acknowledgeAdminSecurityAlertSchema),
  async (req, res, next) => {
    try {
      const params = adminSecurityAlertIdParamSchema.safeParse(req.params);

      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await acknowledgeAdminSecurityAlert({
        adminAuthUserId: admin.userId,
        alertId: params.data.id,
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

adminRouter.post(
  "/security-alerts/:id/resolve",
  requireAdminPermission("admin.write"),
  validateBody(resolveAdminSecurityAlertSchema),
  async (req, res, next) => {
    try {
      const params = adminSecurityAlertIdParamSchema.safeParse(req.params);

      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await resolveAdminSecurityAlert({
        adminAuthUserId: admin.userId,
        alertId: params.data.id,
        resolutionNote: body.resolutionNote,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.post(
  "/security-alerts/:id/dismiss",
  requireAdminPermission("admin.write"),
  validateBody(dismissAdminSecurityAlertSchema),
  async (req, res, next) => {
    try {
      const params = adminSecurityAlertIdParamSchema.safeParse(req.params);

      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await dismissAdminSecurityAlert({
        adminAuthUserId: admin.userId,
        alertId: params.data.id,
        dismissalReason: body.dismissalReason,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get(
  "/roles",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const items = await getAdminRoles();
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.post(
  "/users",
  requireAdminPermission("admin.write"),
  validateBody(upsertAdminUserSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await upsertAdminUserAction({
        adminAuthUserId: admin.userId,
        targetAuthUserId: body.targetAuthUserId,
        email: body.email,
        displayName: body.displayName,
        status: body.status,
        reason: body.reason,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.post(
  "/users/roles/assign",
  requireAdminPermission("admin.write"),
  validateBody(adminRoleActionSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await assignAdminRoleAction({
        adminAuthUserId: admin.userId,
        targetAuthUserId: body.targetAuthUserId,
        roleKey: body.roleKey,
        reason: body.reason,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.post(
  "/users/roles/revoke",
  requireAdminPermission("admin.write"),
  validateBody(adminRoleActionSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await revokeAdminRoleAction({
        adminAuthUserId: admin.userId,
        targetAuthUserId: body.targetAuthUserId,
        roleKey: body.roleKey,
        reason: body.reason,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get(
  "/system",
  requireAdminPermission("system.read"),
  async (req, res, next) => {
    try {
      const data = await getAdminSystemCommandCenter();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      return next(err);
    }
  }
);

adminRouter.get(
  "/money-integrity",
  requireAdminPermission("finance.read"),
  async (req, res, next) => {
    try {
      const data = await getAdminMoneyIntegrity();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      return next(err);
    }
  }
);

adminRouter.get(
  "/scheduler",
  requireAdminPermission("scheduler.read"),
  async (req, res, next) => {
    try {
      const data = await getAdminSchedulerDashboard();
      return res.json(ok({ items: data }, rid(req)));
    } catch (err) {
      return next(err);
    }
  }
);

adminRouter.get(
  "/trust/users/:userId",
  requireAdminPermission("trust.read"),
  async (req, res, next) => {
    try {
      const params = userIdParamSchema.safeParse(req.params);

      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const data = await getAdminUserTrustDetail(params.data.userId);

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get(
  "/trust/users/:userId/components",
  requireAdminPermission("trust.read"),
  validateQuery(adminPaginationQuerySchema),
  async (req, res, next) => {
    try {
      const params = userIdParamSchema.safeParse(req.params);

      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const query = req.validatedQuery!;

      const items = await getAdminUserTrustComponents(
        params.data.userId,
        query.limit
      );

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.post(
  "/trust/users/:userId/components",
  requireAdminPermission("trust.write"),
  validateBody(addTrustComponentSchema),
  async (req, res, next) => {
    try {
      const params = userIdParamSchema.safeParse(req.params);

      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const body = req.validatedBody!;
      const admin = req.admin!;

      const data = await addAdminTrustComponent({
        adminAuthUserId: admin.userId,
        userId: params.data.userId,
        componentKey: body.componentKey,
        componentCategory: body.componentCategory,
        scoreDelta: body.scoreDelta,
        riskDelta: body.riskDelta,
        weight: body.weight,
        reasonCode: body.reasonCode,
        reasonMessage: body.reasonMessage,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get(
  "/security/devices",
  requireAdminPermission("admin.read"),
  validateQuery(adminSecurityDeviceQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;
      const items = await getAdminSecurityDevices({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.post(
  "/security/devices/:deviceId/trust",
  requireAdminPermission("admin.write"),
  validateBody(adminDeviceStatusActionSchema),
  async (req, res, next) => {
    try {
      const params = adminDeviceIdParamSchema.safeParse(req.params);

      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await trustAdminSecurityDevice({
        adminAuthUserId: admin.userId,
        deviceId: params.data.deviceId,
        reasonMessage: body.reasonMessage,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.post(
  "/security/devices/:deviceId/suspicious",
  requireAdminPermission("admin.write"),
  validateBody(adminDeviceStatusActionSchema),
  async (req, res, next) => {
    try {
      const params = adminDeviceIdParamSchema.safeParse(req.params);

      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await markAdminSecurityDeviceSuspicious({
        adminAuthUserId: admin.userId,
        deviceId: params.data.deviceId,
        reasonMessage: body.reasonMessage,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.post(
  "/security/devices/:deviceId/block",
  requireAdminPermission("admin.write"),
  validateBody(adminDeviceStatusActionSchema),
  async (req, res, next) => {
    try {
      const params = adminDeviceIdParamSchema.safeParse(req.params);

      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await blockAdminSecurityDevice({
        adminAuthUserId: admin.userId,
        deviceId: params.data.deviceId,
        reasonMessage: body.reasonMessage,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.post(
  "/security/devices/:deviceId/revoke",
  requireAdminPermission("admin.write"),
  validateBody(adminDeviceStatusActionSchema),
  async (req, res, next) => {
    try {
      const params = adminDeviceIdParamSchema.safeParse(req.params);

      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await revokeAdminSecurityDevice({
        adminAuthUserId: admin.userId,
        deviceId: params.data.deviceId,
        reasonMessage: body.reasonMessage,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get(
  "/security/sessions",
  requireAdminPermission("admin.read"),
  validateQuery(adminSessionRiskQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;
      const items = await getAdminSessionRisks({
        limit: query.limit,
        decision: query.decision
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get(
  "/security/session-controls",
  requireAdminPermission("admin.read"),
  validateQuery(adminSessionControlQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;

      const items = await getAdminSessionControls({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get(
  "/security/session-controls/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getAdminSessionIntegrity();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.post(
  "/security/sessions/force-reauth",
  requireAdminPermission("admin.write"),
  validateBody(adminSessionActionSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await forceAdminSessionReauth({
        adminAuthUserId: admin.userId,
        targetAdminAuthUserId: body.targetAdminAuthUserId,
        sessionId: body.sessionId,
        reason: body.reason,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.post(
  "/security/sessions/revoke",
  requireAdminPermission("admin.write"),
  validateBody(adminSessionActionSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await revokeAdminSession({
        adminAuthUserId: admin.userId,
        targetAdminAuthUserId: body.targetAdminAuthUserId,
        sessionId: body.sessionId,
        reason: body.reason,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.post(
  "/security/sessions/revoke-all",
  requireAdminPermission("admin.write"),
  validateBody(revokeAllAdminSessionsSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await revokeAllAdminSessions({
        adminAuthUserId: admin.userId,
        targetAdminAuthUserId: body.targetAdminAuthUserId,
        reason: body.reason,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.post(
  "/security/sessions/complete-reauth",
  validateBody(completeAdminSessionReauthSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await completeAdminSessionReauth({
        adminAuthUserId: admin.userId,
        sessionId: body.sessionId,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get(
  "/security/action-risks",
  requireAdminPermission("admin.read"),
  validateQuery(adminActionRiskQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;
      const items = await getAdminActionRisks({
        limit: query.limit,
        decision: query.decision,
        actionKey: query.actionKey
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get(
  "/risk/devices",
  requireAdminPermission("device.read"),
  validateQuery(adminPaginationQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;

      const items = await getAdminUserRiskDevices({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get(
  "/risk/devices/:deviceId",
  requireAdminPermission("device.read"),
  async (req, res, next) => {
    try {
      const params = deviceIdParamSchema.safeParse(req.params);

      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const data = await getAdminDevice(params.data.deviceId);

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.post(
  "/risk/devices/:deviceId/status",
  requireAdminPermission("device.write"),
  validateBody(updateDeviceStatusSchema),
  async (req, res, next) => {
    try {
      const params = deviceIdParamSchema.safeParse(req.params);

      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const body = req.validatedBody!;
      const admin = req.admin!;

      const data = await updateAdminDeviceStatus({
        adminAuthUserId: admin.userId,
        deviceId: params.data.deviceId,
        status: body.status,
        reviewedBy: body.reviewedBy,
        reasonCode: body.reasonCode,
        reasonMessage: body.reasonMessage,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get(
  "/risk/sessions",
  requireAdminPermission("risk.read"),
  validateQuery(adminPaginationQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;

      const items = await getAdminSessionRiskEvents({
        limit: query.limit,
        userId: query.userId,
        decision: query.decision
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get(
  "/risk/networks",
  requireAdminPermission("risk.read"),
  validateQuery(adminPaginationQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;

      const items = await getAdminNetworkRiskObservations({
        limit: query.limit,
        userId: query.userId
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get(
  "/privileged-actions",
  requireAdminPermission("admin.read"),
  validateQuery(privilegedActionQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;

      const items = await getAdminPrivilegedActionRequests({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.post(
  "/privileged-actions/:id/approve",
  requireAdminPermission("admin.write"),
  validateBody(approvePrivilegedActionSchema),
  async (req, res, next) => {
    try {
      const params = privilegedActionIdParamSchema.safeParse(req.params);

      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await approvePrivilegedAction({
        adminAuthUserId: admin.userId,
        privilegedActionRequestId: params.data.id,
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

adminRouter.post(
  "/privileged-actions/:id/reject",
  requireAdminPermission("admin.write"),
  validateBody(rejectPrivilegedActionSchema),
  async (req, res, next) => {
    try {
      const params = privilegedActionIdParamSchema.safeParse(req.params);

      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await rejectPrivilegedAction({
        adminAuthUserId: admin.userId,
        privilegedActionRequestId: params.data.id,
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

adminRouter.get(
  "/security-alerts",
  requireAdminPermission("admin.read"),
  validateQuery(adminSecurityAlertQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;

      const items = await getAdminSecurityAlerts({
        limit: query.limit,
        status: query.status,
        severity: query.severity
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get(
  "/security-alert-escalations",
  requireAdminPermission("admin.read"),
  validateQuery(adminSecurityAlertEscalationQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;

      const items = await getAdminSecurityAlertEscalations({
        limit: query.limit,
        escalationKey: query.escalationKey
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get(
  "/security-alert-escalations/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getAdminSecurityAlertEscalationIntegrity();

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get(
  "/security-alert-deliveries",
  requireAdminPermission("admin.read"),
  validateQuery(adminSecurityAlertDeliveryQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;

      const items = await getAdminSecurityAlertDeliveries({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get(
  "/security-alert-deliveries/config",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getAdminSecurityAlertDeliveryConfigStatus();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get(
  "/security-alert-deliveries/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getAdminSecurityAlertDeliveryIntegrity();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get(
  "/audit/hash-integrity",
  requireAdminPermission("audit.read"),
  async (req, res, next) => {
    try {
      const data = await getAdminAuditHashIntegrity();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get(
  "/audit/actions",
  requireAdminPermission("admin.audit.read"),
  validateQuery(adminPaginationQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;
      const items = await getAdminActionAuditLog(query.limit);
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      return next(err);
    }
  }
);

adminRouter.get(
  "/withdrawals/review-queue",
  requireAdminPermission("withdrawal.read"),
  async (req, res, next) => {
    try {
      const data = await getWithdrawalReviewQueue();
      return res.json(ok({ items: data }, rid(req)));
    } catch (err) {
      return next(err);
    }
  }
);

adminRouter.post(
  "/withdrawals/:id/review/approve",
  requireAdminPermission("withdrawal.review"),
  validateBody(reviewWithdrawalSchema),
  async (req, res, next) => {
    try {
      const params = withdrawalIdParamSchema.safeParse(req.params);

      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const body = req.validatedBody!;
      const admin = req.admin!;

      const data = await approveWithdrawalReview({
        adminAuthUserId: admin.userId,
        withdrawalRequestId: params.data.id,
        reviewNote: body.reviewNote,
        requestId: rid(req)
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      return next(err);
    }
  }
);

adminRouter.post(
  "/withdrawals/:id/review/block",
  requireAdminPermission("withdrawal.review"),
  validateBody(reviewWithdrawalSchema),
  async (req, res, next) => {
    try {
      const params = withdrawalIdParamSchema.safeParse(req.params);

      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const body = req.validatedBody!;
      const admin = req.admin!;

      const data = await blockWithdrawalReview({
        adminAuthUserId: admin.userId,
        withdrawalRequestId: params.data.id,
        reviewNote: body.reviewNote,
        requestId: rid(req)
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      return next(err);
    }
  }
);
