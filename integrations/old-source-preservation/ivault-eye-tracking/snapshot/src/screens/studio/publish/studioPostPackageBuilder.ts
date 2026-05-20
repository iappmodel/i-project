/**
 * [ i ] Studio Stage 4 — immutable PostPackage snapshot from project + reports.
 */

import type { StudioProject } from "../studioTypes";
import { isMonetizedRevealType } from "../magic/magicSafetyRules";
import type {
  ExportManifest,
  PostPackage,
  PostRuntimeConfig,
  PublishedPost,
  StudioRightsReport,
  StudioSafetyReport,
} from "./studioPublishTypes";

export type BuildPostPackageInput = {
  project: StudioProject;
  safetyReport: StudioSafetyReport;
  rightsReport: StudioRightsReport;
  exportManifest: ExportManifest;
  /** Optional extra wallet snapshot; merged with monetization + sample settlement. */
  walletRules?: Record<string, unknown>;
};

function buildRuntimeConfig(project: StudioProject, pkg: Pick<PostPackage, "magicReveals" | "monetizationMode" | "ageRating">): PostRuntimeConfig {
  const active = pkg.magicReveals.filter((r) => r.status !== "deleted" && r.revealType !== "always_hidden");
  const allowMagicUnlocks = active.length > 0;
  const allowTips =
    (project.monetization.minimumTipCoins ?? 0) > 0 ||
    active.some((r) => r.revealType === "tip_to_reveal" || r.pricing?.allowCustomTip);
  const ar = pkg.ageRating;
  const requireAgeGateBeforeView =
    ar === "eighteen_plus" || ar === "twentyone_plus" || ar === "restricted";
  const requireHumanVerificationForUnlocks = active.some((r) => r.eligibility.requireVerifiedHuman);
  const monetized = active.some((r) => isMonetizedRevealType(r.revealType));
  const viewerRewarded = active.some((r) => r.reward?.viewerRewardEnabled) || project.monetization.viewerEarnsOnUnlock;
  return {
    allowMagicUnlocks,
    allowTips,
    allowComments: true,
    allowShares: project.visibility !== "private",
    allowSaves: true,
    allowDuetRemix: false,
    showWalletChip: monetized || project.monetization.postKind !== "free",
    showCreatorRevenueDisclosure: monetized,
    showViewerRewardDisclosure: viewerRewarded,
    requireAgeGateBeforeView,
    requireHumanVerificationForUnlocks,
  };
}

export function buildPostPackage(input: BuildPostPackageInput): PostPackage {
  const { project, safetyReport, rightsReport, exportManifest, walletRules } = input;
  const t = new Date().toISOString();
  const id = `pkg_${project.id}_${Date.now()}`;
  const magicReveals = JSON.parse(JSON.stringify(project.magicReveals)) as typeof project.magicReveals;
  const settlementSample = magicReveals.find((r) => r.status !== "deleted")?.settlement;
  const mergedWallet: Record<string, unknown> = {
    monetization: project.monetization,
    settlementSample,
    ...(walletRules ?? {}),
  };
  const pkg: PostPackage = {
    id,
    sourceProjectId: project.id,
    creatorUserId: project.ownerUserId,
    title: project.title,
    caption: project.caption,
    hashtags: [...project.hashtags],
    visibility: project.visibility,
    ageRating: project.ageRating,
    publishTarget: project.publishTarget,
    monetizationMode: project.monetizationMode,
    media: {
      assetIds: project.assets.map((a) => a.id),
      primaryAssetId: project.assets.find((a) => a.type === "video" || a.type === "image")?.id,
    },
    timeline: {
      clipIds: project.clips.map((c) => c.id),
      durationMs: project.durationMs,
    },
    magicReveals,
    unlockRules: { defaultDuration: "session", transferableDefault: false },
    walletRules: mergedWallet,
    safetyReport: JSON.parse(JSON.stringify(safetyReport)) as StudioSafetyReport,
    rightsReport: JSON.parse(JSON.stringify(rightsReport)) as StudioRightsReport,
    disclosures: JSON.parse(JSON.stringify(project.disclosures)) as typeof project.disclosures,
    exportManifest: JSON.parse(JSON.stringify(exportManifest)) as ExportManifest,
    runtimeConfig: buildRuntimeConfig(project, {
      magicReveals,
      monetizationMode: project.monetizationMode,
      ageRating: project.ageRating,
    }),
    createdAt: t,
  };
  return pkg;
}

export function createPublishedPost(pkg: PostPackage): PublishedPost {
  return {
    id: `published_${pkg.id}`,
    packageId: pkg.id,
    creatorUserId: pkg.creatorUserId,
    status: "live",
    visibility: pkg.visibility,
    publishedAt: new Date().toISOString(),
    postPackage: pkg,
  };
}
