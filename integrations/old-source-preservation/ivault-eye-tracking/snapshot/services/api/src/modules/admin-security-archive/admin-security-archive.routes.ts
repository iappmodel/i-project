import { Router } from "express";
import { requireAdminAuth, requireAdminPermission } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import { sendValidationFailure } from "../../shared/route-helpers";
import {
  archiveExportJobQuerySchema,
  archiveManifestIdParamSchema,
  archiveManifestQuerySchema,
  archiveVerificationJobQuerySchema,
  createArchiveManifestSchema,
  enqueueArchiveExportSchema,
  enqueueArchiveVerificationSchema,
  sealArchiveManifestSchema,
  verifyArchiveManifestSchema
} from "./admin-security-archive.validation";
import {
  createArchiveManifest,
  enqueueArchiveExportJob,
  enqueueArchiveVerificationJob,
  getArchiveExportIntegrity,
  getArchiveIntegrity,
  getArchiveVerificationIntegrity,
  listArchiveCandidates,
  listArchiveExportJobs,
  listArchiveManifests,
  listArchiveVerificationJobs,
  listDeletionCandidates,
  listRetentionPolicies,
  sealArchiveManifest,
  verifyArchiveManifest
} from "./admin-security-archive.service";

export const adminSecurityArchiveRouter = Router();

adminSecurityArchiveRouter.use(requireAdminAuth);

const rid = (req: { requestId?: string }) => req.requestId ?? "unknown";

adminSecurityArchiveRouter.get(
  "/retention-policies",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const items = await listRetentionPolicies();
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityArchiveRouter.get(
  "/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getArchiveIntegrity();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityArchiveRouter.get(
  "/manifests",
  requireAdminPermission("admin.read"),
  validateQuery(archiveManifestQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;
      const items = await listArchiveManifests({
        limit: query.limit,
        sourceType: query.sourceType,
        status: query.status
      });
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityArchiveRouter.post(
  "/manifests",
  requireAdminPermission("admin.write"),
  validateBody(createArchiveManifestSchema),
  async (req, res, next) => {
    try {
      const admin = req.admin!;
      const body = req.validatedBody!;
      const data = await createArchiveManifest({
        adminAuthUserId: admin.userId,
        sourceType: body.sourceType,
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
        storageProvider: body.storageProvider,
        storageUri: body.storageUri,
        checksumSha256: body.checksumSha256,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });
      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityArchiveRouter.post(
  "/manifests/:id/seal",
  requireAdminPermission("admin.write"),
  validateBody(sealArchiveManifestSchema),
  async (req, res, next) => {
    try {
      const params = archiveManifestIdParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const admin = req.admin!;
      const body = req.validatedBody!;
      const data = await sealArchiveManifest({
        adminAuthUserId: admin.userId,
        manifestId: params.data.id,
        storageUri: body.storageUri,
        checksumSha256: body.checksumSha256,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityArchiveRouter.post(
  "/manifests/:id/verify",
  requireAdminPermission("admin.write"),
  validateBody(verifyArchiveManifestSchema),
  async (req, res, next) => {
    try {
      const params = archiveManifestIdParamSchema.safeParse(req.params);
      if (!params.success) return sendValidationFailure(res, rid(req));

      const admin = req.admin!;
      const body = req.validatedBody!;
      const data = await verifyArchiveManifest({
        adminAuthUserId: admin.userId,
        manifestId: params.data.id,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityArchiveRouter.get(
  "/candidates/archive",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const items = await listArchiveCandidates({
        limit: Number(req.query.limit ?? 100)
      });
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityArchiveRouter.get(
  "/candidates/delete",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const items = await listDeletionCandidates({
        limit: Number(req.query.limit ?? 100)
      });
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityArchiveRouter.post(
  "/manifests/:id/export-jobs",
  requireAdminPermission("admin.write"),
  validateBody(enqueueArchiveExportSchema),
  async (req, res, next) => {
    try {
      const params = archiveManifestIdParamSchema.safeParse(req.params);

      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const body = req.validatedBody!;

      const data = await enqueueArchiveExportJob({
        manifestId: params.data.id,
        storageProvider: body.storageProvider,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityArchiveRouter.get(
  "/export-jobs",
  requireAdminPermission("admin.read"),
  validateQuery(archiveExportJobQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;
      const items = await listArchiveExportJobs({
        limit: query.limit,
        status: query.status
      });
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityArchiveRouter.get(
  "/export-jobs/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getArchiveExportIntegrity();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityArchiveRouter.post(
  "/manifests/:id/verification-jobs",
  requireAdminPermission("admin.write"),
  validateBody(enqueueArchiveVerificationSchema),
  async (req, res, next) => {
    try {
      const params = archiveManifestIdParamSchema.safeParse(req.params);

      if (!params.success) {
        return sendValidationFailure(res, rid(req));
      }

      const body = req.validatedBody!;

      const data = await enqueueArchiveVerificationJob({
        manifestId: params.data.id,
        requestId: rid(req),
        metadata: body.metadata ?? {}
      });

      return res.status(201).json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityArchiveRouter.get(
  "/verification-jobs",
  requireAdminPermission("admin.read"),
  validateQuery(archiveVerificationJobQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery!;
      const items = await listArchiveVerificationJobs({
        limit: query.limit,
        status: query.status
      });
      return res.json(ok({ items }, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);

adminSecurityArchiveRouter.get(
  "/verification-jobs/integrity",
  requireAdminPermission("admin.read"),
  async (req, res, next) => {
    try {
      const data = await getArchiveVerificationIntegrity();
      return res.json(ok(data, rid(req)));
    } catch (err) {
      next(err);
    }
  }
);
