import { Router } from "express";
import { validateBody } from "../../middleware/validate";
import { ok } from "../../shared/api-response";
import {
  publicAuditorPacketManifestVerificationSchema,
  publicComplianceVerificationSchema,
  publicDisclosurePackageVerificationSchema,
  publicQuestionnaireExportVerificationSchema
} from "./public-compliance-verification.validation";
import {
  verifyPublicAuditorPacketManifest,
  verifyPublicComplianceReport,
  verifyPublicDisclosurePackage,
  verifyPublicQuestionnaireExport
} from "./public-compliance-verification.service";

export const publicComplianceVerificationRouter = Router();

publicComplianceVerificationRouter.post(
  "/verify/compliance-report",
  validateBody(publicComplianceVerificationSchema),
  async (req, res, next) => {
    try {
      const body = req.validatedBody!;

      const result = await verifyPublicComplianceReport({
        reportKey: body.reportKey,
        checksumSha256: body.checksumSha256,
        signature: body.signature,
        periodSealChecksumSha256: body.periodSealChecksumSha256,
        requesterIp: req.ip,
        userAgent:
          typeof req.headers["user-agent"] === "string"
            ? req.headers["user-agent"]
            : undefined,
        requestId: req.requestId ?? "unknown"
      });

      return res.json(ok(result, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

publicComplianceVerificationRouter.post(
  "/verify/disclosure-package",
  validateBody(publicDisclosurePackageVerificationSchema),
  async (req, res, next) => {
    try {
      const body = req.validatedBody!;

      const result = await verifyPublicDisclosurePackage({
        packageKey: body.packageKey,
        checksumSha256: body.checksumSha256,
        signature: body.signature,
        requesterIp: req.ip,
        userAgent:
          typeof req.headers["user-agent"] === "string"
            ? req.headers["user-agent"]
            : undefined,
        requestId: req.requestId ?? "unknown"
      });

      return res.json(ok(result, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

publicComplianceVerificationRouter.post(
  "/verify/auditor-packet-manifest",
  validateBody(publicAuditorPacketManifestVerificationSchema),
  async (req, res, next) => {
    try {
      const body = req.validatedBody!;

      const result = await verifyPublicAuditorPacketManifest({
        manifestKey: body.manifestKey,
        checksumSha256: body.checksumSha256,
        signature: body.signature,
        requesterIp: req.ip,
        userAgent:
          typeof req.headers["user-agent"] === "string"
            ? req.headers["user-agent"]
            : undefined,
        requestId: req.requestId ?? "unknown"
      });

      return res.json(ok(result, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);

publicComplianceVerificationRouter.post(
  "/verify/questionnaire-export",
  validateBody(publicQuestionnaireExportVerificationSchema),
  async (req, res, next) => {
    try {
      const body = req.validatedBody!;

      const result = await verifyPublicQuestionnaireExport({
        exportKey: body.exportKey,
        checksumSha256: body.checksumSha256,
        signature: body.signature,
        requesterIp: req.ip,
        userAgent:
          typeof req.headers["user-agent"] === "string"
            ? req.headers["user-agent"]
            : undefined,
        requestId: req.requestId ?? "unknown"
      });

      return res.json(ok(result, req.requestId ?? "unknown"));
    } catch (err) {
      next(err);
    }
  }
);
