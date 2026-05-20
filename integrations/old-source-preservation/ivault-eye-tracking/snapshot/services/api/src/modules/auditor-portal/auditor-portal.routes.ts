import { Router } from "express";
import { requireUserAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ok } from "../../shared/api-response";
import { sendValidationFailure } from "../../shared/route-helpers";
import {
  acknowledgeAuditorItemSchema,
  manifestKeyParamSchema,
  packetKeyParamSchema,
  portalKeyParamSchema,
  requestPacketManifestSchema,
  submitAuditorQuestionSchema
} from "./auditor-portal.validation";
import {
  acknowledgeAuditorItem,
  getAuditorEvidencePacket,
  getAuditorPortal,
  registerAuditorPacketManifestDownload,
  requestAuditorPacketManifest,
  submitAuditorQuestionService
} from "./auditor-portal.service";

export const auditorPortalRouter = Router();

auditorPortalRouter.use(requireUserAuth);

const rid = (req: { requestId?: string }) => req.requestId ?? "unknown";

auditorPortalRouter.get("/:portalKey", async (req, res, next) => {
  try {
    const params = portalKeyParamSchema.safeParse(req.params);
    if (!params.success) return sendValidationFailure(res, rid(req));

    const authUser = req.auth!;

    const data = await getAuditorPortal({
      authUserId: authUser.userId,
      portalKey: params.data.portalKey,
      requestId: rid(req)
    });

    return res.json(ok(data, rid(req)));
  } catch (err) {
    next(err);
  }
});

auditorPortalRouter.get("/:portalKey/packets/:packetKey", async (req, res, next) => {
  try {
    const params = packetKeyParamSchema.safeParse(req.params);
    if (!params.success) return sendValidationFailure(res, rid(req));

    const authUser = req.auth!;

    const data = await getAuditorEvidencePacket({
      authUserId: authUser.userId,
      portalKey: params.data.portalKey,
      packetKey: params.data.packetKey,
      requestId: rid(req)
    });

    return res.json(ok(data, rid(req)));
  } catch (err) {
    next(err);
  }
});

auditorPortalRouter.post(
  "/:portalKey/packets/:packetKey/manifests",
  validateBody(requestPacketManifestSchema),
  async (req, res, next) => {
    try {
      const params = packetKeyParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const authUser = req.auth!;
      const body = req.validatedBody!;

      const data = await requestAuditorPacketManifest({
        authUserId: authUser.userId,
        portalKey: params.data.portalKey,
        packetKey: params.data.packetKey,
        exportFormat: body.exportFormat,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

auditorPortalRouter.post(
  "/:portalKey/manifests/:manifestKey/download",
  async (req, res, next) => {
    try {
      const params = manifestKeyParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const authUser = req.auth!;
      const data = await registerAuditorPacketManifestDownload({
        authUserId: authUser.userId,
        portalKey: params.data.portalKey,
        manifestKey: params.data.manifestKey,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        requestId: rid(req),
        metadata: {}
      });

      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

auditorPortalRouter.post(
  "/:portalKey/acknowledgements",
  validateBody(acknowledgeAuditorItemSchema),
  async (req, res, next) => {
    try {
      const params = portalKeyParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const authUser = req.auth!;
      const body = req.validatedBody!;

      const data = await acknowledgeAuditorItem({
        authUserId: authUser.userId,
        portalKey: params.data.portalKey,
        acknowledgementType: body.acknowledgementType,
        sourceType: body.sourceType,
        sourceId: body.sourceId,
        statement: body.statement,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

auditorPortalRouter.post(
  "/:portalKey/questions",
  validateBody(submitAuditorQuestionSchema),
  async (req, res, next) => {
    try {
      const params = portalKeyParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const authUser = req.auth!;
      const body = req.validatedBody!;

      const data = await submitAuditorQuestionService({
        authUserId: authUser.userId,
        portalKey: params.data.portalKey,
        ...body,
        requestId: rid(req)
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);
