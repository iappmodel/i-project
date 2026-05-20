import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  createDisclosureApprovalSchema,
  decideDisclosureApprovalSchema,
  disclosureApprovalQuerySchema,
  idParamSchema
} from "./admin-security-disclosure-approvals.validation";
import {
  createDisclosureApproval,
  decideDisclosureApproval,
  getDisclosureApprovalIntegrity,
  listDisclosureApprovalDecisions,
  listDisclosureApprovals
} from "./admin-security-disclosure-approvals.service";

export const adminSecurityDisclosureApprovalsRouter = Router();

adminSecurityDisclosureApprovalsRouter.use(requireAdminAuth);

adminSecurityDisclosureApprovalsRouter.get(
  "/",
  requireAdminPermission("admin.read"),
  validateQuery(disclosureApprovalQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;

      const items = await listDisclosureApprovals({
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

adminSecurityDisclosureApprovalsRouter.get(
  "/decisions",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const items = await listDisclosureApprovalDecisions({
        approvalRequestId:
          typeof req.query.approvalRequestId === "string"
            ? req.query.approvalRequestId
            : undefined,
        limit: req.query.limit ? Number(req.query.limit) : 50
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityDisclosureApprovalsRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getDisclosureApprovalIntegrity();
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityDisclosureApprovalsRouter.post(
  "/",
  requireAdminPermission("admin.write"),
  validateBody(createDisclosureApprovalSchema),
  async (req, res, next) => {
    try {
      const admin = (req as any).admin;
      const body = (req as any).validatedBody;

      const data = await createDisclosureApproval({
        adminAuthUserId: admin.userId,
        disclosureType: body.disclosureType,
        riskLevel: body.riskLevel,
        sourceType: body.sourceType,
        sourceId: body.sourceId,
        title: body.title,
        summary: body.summary,
        requestedAction: body.requestedAction,
        customerName: body.customerName,
        enterpriseReviewRoomId: body.enterpriseReviewRoomId,
        expiresAt: body.expiresAt,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityDisclosureApprovalsRouter.post(
  "/:id/decide",
  requireAdminPermission("admin.write"),
  validateBody(decideDisclosureApprovalSchema),
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

      const data = await decideDisclosureApproval({
        adminAuthUserId: admin.userId,
        approvalRequestId: params.data.id,
        decision: body.decision,
        approvalRole: body.approvalRole,
        note: body.note,
        requestId: (req as any).requestId,
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
