import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ok } from "../../shared/api-response";
import {
  acceptAiDraftSchema,
  idParamSchema,
  publishQuestionnaireExportToRoomSchema,
  requestAiDraftSchema
} from "./admin-security-questionnaires.validation";
import {
  acceptQuestionnaireAiDraft,
  publishQuestionnaireExportToEnterpriseRoom,
  getQuestionnaireAiIntegrity,
  listQuestionnaireAiDrafts,
  listQuestionnaireAiMatchCandidates,
  requestQuestionnaireAiDraft
} from "./admin-security-questionnaires.service";
import { getQuestionnaireExportVerificationIntegrity } from "../public-compliance-verification/public-compliance-verification.service";

export const adminSecurityQuestionnairesRouter = Router();

adminSecurityQuestionnairesRouter.use(requireAdminAuth);

const rid = (req: { requestId?: string }) => req.requestId ?? "unknown";

adminSecurityQuestionnairesRouter.get(
  "/ai-drafts",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const items = await listQuestionnaireAiDrafts({
        projectId: typeof req.query.projectId === "string" ? req.query.projectId : undefined,
        questionId: typeof req.query.questionId === "string" ? req.query.questionId : undefined,
        status: typeof req.query.status === "string" ? req.query.status : undefined,
        limit: req.query.limit ? Number(req.query.limit) : 100
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityQuestionnairesRouter.get(
  "/ai-match-candidates",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const items = await listQuestionnaireAiMatchCandidates({
        aiDraftRequestId:
          typeof req.query.aiDraftRequestId === "string"
            ? req.query.aiDraftRequestId
            : undefined,
        questionId: typeof req.query.questionId === "string" ? req.query.questionId : undefined,
        limit: req.query.limit ? Number(req.query.limit) : 100
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityQuestionnairesRouter.get(
  "/ai-integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getQuestionnaireAiIntegrity();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityQuestionnairesRouter.post(
  "/questions/:id/ai-draft",
  requireAdminPermission("admin.write"),
  validateBody(requestAiDraftSchema),
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
          requestId: rid(req)
        });
      }

      const admin = req.admin!;
      const body = req.validatedBody!;
      const data = await requestQuestionnaireAiDraft({
        adminAuthUserId: admin.userId,
        questionId: params.data.id,
        draftMode: body.draftMode,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityQuestionnairesRouter.post(
  "/ai-drafts/:id/accept",
  requireAdminPermission("admin.write"),
  validateBody(acceptAiDraftSchema),
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
          requestId: rid(req)
        });
      }

      const admin = req.admin!;
      const body = req.validatedBody!;
      const data = await acceptQuestionnaireAiDraft({
        adminAuthUserId: admin.userId,
        aiDraftRequestId: params.data.id,
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

adminSecurityQuestionnairesRouter.post(
  "/exports/:id/publish-to-enterprise-room",
  requireAdminPermission("admin.write"),
  validateBody(publishQuestionnaireExportToRoomSchema),
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
          requestId: rid(req)
        });
      }

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await publishQuestionnaireExportToEnterpriseRoom({
        adminAuthUserId: admin.userId,
        questionnaireExportId: params.data.id,
        enterpriseReviewRoomId: body.enterpriseReviewRoomId,
        displayTitle: body.displayTitle,
        displaySummary: body.displaySummary,
        allowDownload: body.allowDownload,
        allowPublicVerification: body.allowPublicVerification,
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

adminSecurityQuestionnairesRouter.get(
  "/export-verification-integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getQuestionnaireExportVerificationIntegrity();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);
