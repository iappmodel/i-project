import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import { sendValidationFailure } from "../../shared/route-helpers";
import {
  addEvidencePacketItemSchema,
  answerAuditorQuestionSchema,
  auditorPortalQuerySchema,
  createAuditorPortalSchema,
  createEvidencePacketSchema,
  idParamSchema,
  inviteAuditorParticipantSchema,
  publishAuditorPortalSchema,
  publishEvidencePacketSchema
} from "./admin-security-auditor-portals.validation";
import {
  addEvidencePacketItem,
  answerAuditorQuestion,
  createAuditorPortal,
  createEvidencePacket,
  getAuditorPacketDownloadIntegrity,
  getAuditorPortalIntegrity,
  inviteAuditorParticipant,
  listAuditorEvidencePackets,
  listAuditorPacketDownloads,
  listAuditorPacketManifests,
  listAuditorPortals,
  listAuditorQuestions,
  publishAuditorPortal,
  publishEvidencePacket
} from "./admin-security-auditor-portals.service";

export const adminSecurityAuditorPortalsRouter = Router();

adminSecurityAuditorPortalsRouter.use(requireAdminAuth);

const rid = (req: { requestId?: string }) => req.requestId ?? "unknown";

adminSecurityAuditorPortalsRouter.get(
  "/",
  requireAdminPermission("admin.read"),
  validateQuery(auditorPortalQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listAuditorPortals({ limit: query.limit, status: query.status });
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditorPortalsRouter.get(
  "/evidence-packets",
  requireAdminPermission("admin.read"),
  validateQuery(auditorPortalQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listAuditorEvidencePackets({
        limit: query.limit,
        status: query.status
      });
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditorPortalsRouter.get(
  "/questions",
  requireAdminPermission("admin.read"),
  validateQuery(auditorPortalQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listAuditorQuestions({ limit: query.limit, status: query.status });
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditorPortalsRouter.get(
  "/packet-manifests",
  requireAdminPermission("admin.read"),
  validateQuery(auditorPortalQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listAuditorPacketManifests({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditorPortalsRouter.get(
  "/packet-downloads",
  requireAdminPermission("admin.read"),
  validateQuery(auditorPortalQuerySchema),
  async (req, res, next) => {
    try {
      const query = (req as any).validatedQuery;
      const items = await listAuditorPacketDownloads({
        limit: query.limit,
        status: query.status
      });

      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditorPortalsRouter.get(
  "/packet-download-integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getAuditorPacketDownloadIntegrity();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditorPortalsRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getAuditorPortalIntegrity();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditorPortalsRouter.post(
  "/",
  requireAdminPermission("admin.write"),
  validateBody(createAuditorPortalSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const data = await createAuditorPortal({
        adminAuthUserId: (req as any).admin.userId,
        ...body,
        requestId: rid(req)
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditorPortalsRouter.post(
  "/:id/participants",
  requireAdminPermission("admin.write"),
  validateBody(inviteAuditorParticipantSchema),
  async (req, res, next) => {
    try {
      const params = idParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const body = (req as any).validatedBody;
      const data = await inviteAuditorParticipant({
        adminAuthUserId: (req as any).admin.userId,
        auditorPortalId: params.data.id,
        ...body,
        requestId: rid(req)
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditorPortalsRouter.post(
  "/:id/publish",
  requireAdminPermission("admin.write"),
  validateBody(publishAuditorPortalSchema),
  async (req, res, next) => {
    try {
      const params = idParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const body = (req as any).validatedBody;
      const data = await publishAuditorPortal({
        adminAuthUserId: (req as any).admin.userId,
        auditorPortalId: params.data.id,
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

adminSecurityAuditorPortalsRouter.post(
  "/:id/evidence-packets",
  requireAdminPermission("admin.write"),
  validateBody(createEvidencePacketSchema),
  async (req, res, next) => {
    try {
      const params = idParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const body = (req as any).validatedBody;
      const data = await createEvidencePacket({
        adminAuthUserId: (req as any).admin.userId,
        auditorPortalId: params.data.id,
        ...body,
        requestId: rid(req)
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditorPortalsRouter.post(
  "/evidence-packets/:id/items",
  requireAdminPermission("admin.write"),
  validateBody(addEvidencePacketItemSchema),
  async (req, res, next) => {
    try {
      const params = idParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const body = (req as any).validatedBody;
      const data = await addEvidencePacketItem({
        adminAuthUserId: (req as any).admin.userId,
        evidencePacketId: params.data.id,
        ...body
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityAuditorPortalsRouter.post(
  "/evidence-packets/:id/publish",
  requireAdminPermission("admin.write"),
  validateBody(publishEvidencePacketSchema),
  async (req, res, next) => {
    try {
      const params = idParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const body = (req as any).validatedBody;
      const data = await publishEvidencePacket({
        adminAuthUserId: (req as any).admin.userId,
        evidencePacketId: params.data.id,
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

adminSecurityAuditorPortalsRouter.post(
  "/questions/:id/answer",
  requireAdminPermission("admin.write"),
  validateBody(answerAuditorQuestionSchema),
  async (req, res, next) => {
    try {
      const params = idParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const body = (req as any).validatedBody;
      const data = await answerAuditorQuestion({
        adminAuthUserId: (req as any).admin.userId,
        auditorQuestionId: params.data.id,
        ...body,
        requestId: rid(req)
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);
