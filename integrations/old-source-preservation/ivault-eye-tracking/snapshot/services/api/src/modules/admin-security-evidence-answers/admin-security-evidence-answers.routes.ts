import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import {
  createEvidenceAnswerSessionSchema,
  evidenceAnswerQuerySchema,
  generateEvidenceAnswerSchema
} from "./admin-security-evidence-answers.validation";
import {
  createEvidenceAnswerSession,
  generateEvidenceAnswer,
  getEvidenceAnswerIntegrity,
  listEvidenceAnswerCitations,
  listEvidenceAnswerRequests,
  listEvidenceAnswerSessions
} from "./admin-security-evidence-answers.service";

export const adminSecurityEvidenceAnswersRouter = Router();

adminSecurityEvidenceAnswersRouter.use(requireAdminAuth);

adminSecurityEvidenceAnswersRouter.get(
  "/sessions",
  requireAdminPermission("admin.read"),
  validateQuery(evidenceAnswerQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listEvidenceAnswerSessions({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityEvidenceAnswersRouter.get(
  "/requests",
  requireAdminPermission("admin.read"),
  validateQuery(evidenceAnswerQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listEvidenceAnswerRequests({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityEvidenceAnswersRouter.get(
  "/citations",
  requireAdminPermission("admin.read"),
  validateQuery(evidenceAnswerQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listEvidenceAnswerCitations({
        limit: query.limit
      });

      return res.json(ok({ items }, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityEvidenceAnswersRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getEvidenceAnswerIntegrity();
      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityEvidenceAnswersRouter.post(
  "/sessions",
  requireAdminPermission("admin.write"),
  validateBody(createEvidenceAnswerSessionSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;

      const data = await createEvidenceAnswerSession({
        ...body,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        requestId: (req as any).requestId
      });

      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityEvidenceAnswersRouter.post(
  "/generate",
  requireAdminPermission("admin.read"),
  validateBody(generateEvidenceAnswerSchema),
  async (req, res, next) => {
    try {
      const admin = (req as any).admin;
      const body = (req as any).validatedBody;

      const data = await generateEvidenceAnswer({
        ...body,
        authUserId: admin.userId,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        requestId: (req as any).requestId
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
