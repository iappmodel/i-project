import { Router } from "express";
import { requireAdminAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ok } from "../../shared/api-response";
import {
  confirmAdminTotpEnrollment,
  disableMyAdminMfaFactor,
  enrollAdminTotpFactor,
  generateAdminRecoveryCodes,
  getMyAdminRecoveryCodeStatus,
  listMyAdminMfaFactors,
  revokeMyAdminRecoveryCodes,
  revokeMyAdminMfaFactor,
  verifyAdminRecoveryCodeChallenge,
  verifyAdminTotpChallenge
} from "./admin-mfa.service";
import {
  confirmTotpEnrollmentSchema,
  enrollTotpSchema,
  generateRecoveryCodesSchema,
  mfaFactorActionSchema,
  mfaFactorIdParamSchema,
  revokeRecoveryCodesSchema,
  verifyRecoveryCodeChallengeSchema,
  verifyTotpChallengeSchema
} from "./admin-mfa.validation";

export const adminMfaRouter = Router();

adminMfaRouter.use(requireAdminAuth);

adminMfaRouter.post("/totp/enroll", validateBody(enrollTotpSchema), async (req, res, next) => {
  try {
    const admin = req.admin!;
    const body = req.validatedBody!;

    const data = await enrollAdminTotpFactor({
      adminAuthUserId: admin.userId,
      label: body.label,
      requestId: req.requestId ?? "unknown",
      metadata: body.metadata ?? {}
    });

    return res.status(201).json(ok(data, req.requestId ?? "unknown"));
  } catch (err) {
    next(err);
  }
});

adminMfaRouter.get("/factors", async (req, res, next) => {
  try {
    const admin = req.admin!;
    const items = await listMyAdminMfaFactors({
      adminAuthUserId: admin.userId
    });

    return res.json(ok({ items }, req.requestId ?? "unknown"));
  } catch (err) {
    next(err);
  }
});

adminMfaRouter.post(
  "/totp/confirm",
  validateBody(confirmTotpEnrollmentSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await confirmAdminTotpEnrollment({
        adminAuthUserId: admin.userId,
        factorId: body.factorId,
        code: body.code,
        requestId: req.requestId ?? "unknown",
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminMfaRouter.post(
  "/totp/verify",
  validateBody(verifyTotpChallengeSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await verifyAdminTotpChallenge({
        adminAuthUserId: admin.userId,
        challengeId: body.challengeId,
        code: body.code,
        requestId: req.requestId ?? "unknown",
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminMfaRouter.post(
  "/factors/:factorId/disable",
  validateBody(mfaFactorActionSchema),
  async (req, res, next) => {
    try {
      const params = mfaFactorIdParamSchema.safeParse(req.params);

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
          requestId: req.requestId ?? "unknown"
        });
      }

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await disableMyAdminMfaFactor({
        adminAuthUserId: admin.userId,
        factorId: params.data.factorId,
        reason: body.reason,
        requestId: req.requestId ?? "unknown",
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminMfaRouter.post(
  "/factors/:factorId/revoke",
  validateBody(mfaFactorActionSchema),
  async (req, res, next) => {
    try {
      const params = mfaFactorIdParamSchema.safeParse(req.params);

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
          requestId: req.requestId ?? "unknown"
        });
      }

      const admin = req.admin!;
      const body = req.validatedBody!;

      const data = await revokeMyAdminMfaFactor({
        adminAuthUserId: admin.userId,
        factorId: params.data.factorId,
        reason: body.reason,
        requestId: req.requestId ?? "unknown",
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminMfaRouter.get("/recovery-codes/status", async (req, res, next) => {
  try {
    const admin = req.admin!;
    const data = await getMyAdminRecoveryCodeStatus({
      adminAuthUserId: admin.userId
    });

    return res.json(ok(data, req.requestId ?? "unknown"));
  } catch (err) {
    next(err);
  }
});

adminMfaRouter.post(
  "/recovery-codes/generate",
  validateBody(generateRecoveryCodesSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;
      const data = await generateAdminRecoveryCodes({
        adminAuthUserId: admin.userId,
        count: body.count,
        requestId: req.requestId ?? "unknown",
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminMfaRouter.post(
  "/recovery-codes/verify",
  validateBody(verifyRecoveryCodeChallengeSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;
      const data = await verifyAdminRecoveryCodeChallenge({
        adminAuthUserId: admin.userId,
        challengeId: body.challengeId,
        code: body.code,
        requestId: req.requestId ?? "unknown",
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

adminMfaRouter.post(
  "/recovery-codes/revoke",
  validateBody(revokeRecoveryCodesSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;
      const data = await revokeMyAdminRecoveryCodes({
        adminAuthUserId: admin.userId,
        reason: body.reason,
        requestId: req.requestId ?? "unknown",
        metadata: body.metadata ?? {}
      });

      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);
