import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok, fail } from "../../shared/api-response";
import { isAdminReviewError } from "@/lib/alphabet/admin-review/admin-review-errors";
import {
  adminReviewCasesQuerySchema,
  assignAdminReviewCaseBodySchema,
  createAdminReviewCaseBodySchema,
  decideAdminReviewCaseBodySchema,
  reviewCaseIdParamSchema
} from "./admin-review-cases.validation";
import {
  assignAdminReviewCaseService,
  createAdminReviewCaseService,
  decideAdminReviewCaseService,
  getAdminReviewCaseService,
  listAdminReviewCasesService
} from "./admin-review-cases.service";

export const adminReviewCasesRouter = Router();

adminReviewCasesRouter.use(requireAdminAuth);

const rid = (req: { requestId?: string }) => req.requestId ?? "unknown";

adminReviewCasesRouter.get(
  "/",
  requireAdminPermission("admin.read"),
  validateQuery(adminReviewCasesQuerySchema),
  async (req, res, next) => {
    try {
      const data = await listAdminReviewCasesService(req.validatedQuery!);
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminReviewCasesRouter.post(
  "/",
  requireAdminPermission("admin.write"),
  validateBody(createAdminReviewCaseBodySchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const result = await createAdminReviewCaseService({
        adminAuthUserId: admin.userId,
        body: req.validatedBody!
      });

      if (result.deduped) {
        return res.status(200).json(
          ok(
            {
              deduped: true,
              reviewCaseId: (result.case as { review_case_id: string }).review_case_id,
              status: (result.case as { status: string }).status,
              evaluationStatus: result.evaluation.status,
              eventIds: result.eventIds
            },
            rid(req)
          )
        );
      }

      return res.status(201).json(
        ok(
          {
            deduped: false,
            reviewCaseId: (result.case as { review_case_id: string }).review_case_id,
            status: (result.case as { status: string }).status,
            evaluationStatus: result.evaluation.status,
            eventIds: result.eventIds
          },
          rid(req)
        )
      );
    } catch (err) {
      if (isAdminReviewError(err)) {
        return res
          .status(err.statusCode)
          .json(
            fail(
              {
                code: err.code,
                category: "admin_review",
                message: err.message,
                retryable: false,
                httpStatus: err.statusCode,
                details: { reasonCodes: err.reasonCodes }
              },
              rid(req)
            )
          );
      }
      next(err);
    }
  }
);

adminReviewCasesRouter.get(
  "/:reviewCaseId",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const params = reviewCaseIdParamSchema.safeParse(req.params);
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

      const row = await getAdminReviewCaseService(params.data.reviewCaseId);
      if (!row) {
        return res
          .status(404)
          .json(
            fail(
              {
                code: "ADMIN_REVIEW_NOT_FOUND",
                category: "admin_review",
                message: "Review case not found.",
                retryable: false,
                httpStatus: 404
              },
              rid(req)
            )
          );
      }

      return res.json(ok({ reviewCase: row }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminReviewCasesRouter.post(
  "/:reviewCaseId/assign",
  requireAdminPermission("admin.write"),
  validateBody(assignAdminReviewCaseBodySchema),
  async (req, res, next) => {
    try {
      const params = reviewCaseIdParamSchema.safeParse(req.params);
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
      const data = await assignAdminReviewCaseService({
        reviewCaseId: params.data.reviewCaseId,
        adminAuthUserId: admin.userId,
        body: req.validatedBody!
      });

      return res.json(
        ok(
          {
            reviewCaseId: (data.case as { review_case_id: string }).review_case_id,
            status: (data.case as { status: string }).status,
            eventIds: data.eventIds
          },
          rid(req)
        )
      );
    } catch (err) {
      if (isAdminReviewError(err)) {
        return res
          .status(err.statusCode)
          .json(
            fail(
              {
                code: err.code,
                category: "admin_review",
                message: err.message,
                retryable: false,
                httpStatus: err.statusCode,
                details: { reasonCodes: err.reasonCodes }
              },
              rid(req)
            )
          );
      }
      next(err);
    }
  }
);

adminReviewCasesRouter.post(
  "/:reviewCaseId/decision",
  requireAdminPermission("admin.write"),
  validateBody(decideAdminReviewCaseBodySchema),
  async (req, res, next) => {
    try {
      const params = reviewCaseIdParamSchema.safeParse(req.params);
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
      const result = await decideAdminReviewCaseService({
        reviewCaseId: params.data.reviewCaseId,
        adminAuthUserId: admin.userId,
        body: req.validatedBody!
      });

      return res.json(
        ok(
          {
            reviewCaseId: (result.case as { review_case_id: string }).review_case_id,
            status: (result.case as { status: string }).status,
            decision: (result.case as { decision: string | null }).decision,
            evaluationStatus: result.evaluation.status,
            appliedActions: result.applied.appliedActions,
            eventIds: result.eventIds
          },
          rid(req)
        )
      );
    } catch (err) {
      if (isAdminReviewError(err)) {
        return res
          .status(err.statusCode)
          .json(
            fail(
              {
                code: err.code,
                category: "admin_review",
                message: err.message,
                retryable: false,
                httpStatus: err.statusCode,
                details: { reasonCodes: err.reasonCodes }
              },
              rid(req)
            )
          );
      }
      next(err);
    }
  }
);
