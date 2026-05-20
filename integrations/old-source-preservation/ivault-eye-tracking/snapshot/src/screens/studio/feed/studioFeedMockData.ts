import type { StudioProject } from "../studioTypes";
import { MOCK_OWNER_ID } from "../studioMockData";
import type {
  ExportManifest,
  PostDisclosure,
  PostPackage,
  PostRuntimeConfig,
  StudioRightsReport,
  StudioSafetyReport,
} from "../publish/studioPublishTypes";
import type { RuntimePost } from "./studioFeedTypes";
import { emptyRuntimePostMetrics } from "./studioFeedTypes";
export const RUNTIME_STUDIO_SLOT_ID = "runtime_post_studio_slot";
export const RUNTIME_ORGANIC_POST_ID = "runtime_post_organic_001";
export const RUNTIME_SPONSORED_POST_ID = "runtime_post_sponsored_001";

export const MOCK_CREATOR_HANDLE = "@melodymae";
export const MOCK_CREATOR_NAME = "Melody Mae";
/** Wallet-aligned creator id (matches Stage 3 mock creator account). */
export const MOCK_CREATOR_USER_ID = MOCK_OWNER_ID;

function iso(): string {
  return new Date().toISOString();
}

function baseSafetyReport(projectId: string): StudioSafetyReport {
  return {
    id: `safety_${projectId}`,
    projectId,
    status: "passed",
    checks: [],
    ageRating: "teen",
    detectedIssues: [],
    blockedReasons: [],
    monetizationAllowed: true,
    requiresHumanReview: false,
    createdAt: iso(),
  };
}

function baseRightsReport(projectId: string): StudioRightsReport {
  return {
    id: `rights_${projectId}`,
    projectId,
    status: "cleared",
    ownershipStatus: "imported_self",
    musicRightsStatus: "cleared_demo",
    commercialUseAllowed: true,
    monetizationAllowed: true,
    attributionRequired: false,
    blockedAssets: [],
    warnings: [],
    createdAt: iso(),
  };
}

function defaultExportManifest(project: StudioProject): ExportManifest {
  const primary = project.assets[0];
  return {
    renderId: `rend_${project.id}`,
    outputUrl: primary?.sourceUrl ?? "mock://export/preview.mp4",
    thumbnailUrl: primary?.sourceUrl ?? "mock://thumb.jpg",
    durationMs: project.durationMs,
    width: project.canvasWidth,
    height: project.canvasHeight,
    aspectRatio: project.aspectRatio,
    quality: project.exportSettings.quality,
    includesWatermark: project.exportSettings.includeWatermark,
    includesBurnedCaptions: false,
    includesMagicMaskMap: project.magicReveals.length > 0,
    createdAt: iso(),
  };
}

function defaultRuntimeConfig(project: StudioProject): PostRuntimeConfig {
  const monetized =
    project.monetization.postKind !== "free" &&
    (project.magicReveals.some((m) => m.status !== "deleted") || project.monetization.creatorEarnsPerUnlock);
  return {
    allowMagicUnlocks: project.magicReveals.some((m) => m.status === "active"),
    allowTips: project.monetization.postKind === "tip_enabled" || project.monetization.postKind === "unlockable",
    allowComments: true,
    allowShares: true,
    allowSaves: true,
    allowDuetRemix: false,
    showWalletChip: true,
    showCreatorRevenueDisclosure: monetized,
    showViewerRewardDisclosure: project.monetization.viewerEarnsOnWatch || project.monetization.viewerEarnsOnComplete,
    requireAgeGateBeforeView: project.magicReveals.some((m) => m.safety.ageGateRequired),
    requireHumanVerificationForUnlocks: project.magicReveals.some((m) => m.eligibility.requireVerifiedHuman),
  };
}

function defaultDisclosures(project: StudioProject): PostDisclosure[] {
  const list: PostDisclosure[] = [];
  const monetized =
    project.monetization.postKind === "paid" ||
    project.monetization.postKind === "unlockable" ||
    project.monetization.creatorEarnsPerUnlock;
  if (project.monetization.postKind === "sponsored" || project.monetization.brandPaysPerVerifiedAction) {
    list.push({
      id: "d_sponsored",
      type: "sponsored",
      label: "Sponsored",
      required: true,
      visibleToViewer: true,
      message: "Brand-sponsored content.",
    });
  }
  if (monetized) {
    list.push({
      id: "d_paid",
      type: "paid_unlock",
      label: "Paid unlocks",
      required: true,
      visibleToViewer: true,
      message: "Some moments require purchase or tip to reveal.",
    });
    list.push({
      id: "d_creator_earns",
      type: "creator_earns",
      label: "Creator earns",
      required: true,
      visibleToViewer: true,
      message: "Creator receives pending earnings from unlocks; subject to verification.",
    });
  }
  if (project.monetization.viewerEarnsOnWatch || project.monetization.viewerEarnsOnComplete) {
    list.push({
      id: "d_viewer_reward",
      type: "viewer_rewarded",
      label: "Viewer rewarded",
      required: true,
      visibleToViewer: true,
      message: "Eligible viewers may earn rewards from the sponsor pool (simulated).",
    });
  }
  list.push({
    id: "d_ai",
    type: "ai_edited",
    label: "AI assisted",
    required: false,
    visibleToViewer: true,
    message: "Some edits may use on-device or assisted tooling.",
  });
  return list;
}

export function buildPostPackageFromStudioProject(project: StudioProject): PostPackage {
  const t = iso();
  const pkgId = `pkg_${project.id}_${Date.now()}`;
  const clipIds = project.clips.map((c) => c.id);
  const assetIds = project.assets.map((a) => a.id);
  const monetizationMode =
    project.monetization.postKind === "sponsored"
      ? "sponsor_funded"
      : project.magicReveals.some((m) => m.status !== "deleted" && m.revealType !== "always_hidden")
        ? "magic_unlocks"
        : project.monetization.postKind === "tip_enabled"
          ? "tips_enabled"
          : "none";

  return {
    id: pkgId,
    sourceProjectId: project.id,
    creatorUserId: project.ownerUserId ?? MOCK_OWNER_ID,
    title: project.title,
    caption: project.overlays[0]?.text ?? "Studio publish — mock caption",
    hashtags: ["#iStudio", "#mock"],
    visibility: "public",
    ageRating: "teen",
    publishTarget: project.exportSettings.target === "story" ? "i_story" : "i_feed",
    monetizationMode,
    media: { assetIds, primaryAssetId: assetIds[0] },
    timeline: { clipIds, durationMs: project.durationMs },
    magicReveals: project.magicReveals.filter((m) => m.status !== "deleted"),
    unlockRules: { engine: "studio_unlock_v1" },
    walletRules: { settlementHoldHours: 24 },
    safetyReport: baseSafetyReport(project.id),
    rightsReport: baseRightsReport(project.id),
    disclosures: defaultDisclosures(project),
    exportManifest: defaultExportManifest(project),
    runtimeConfig: defaultRuntimeConfig(project),
    createdAt: t,
  };
}

export function buildRuntimePostFromPackage(input: {
  id: string;
  postPackage: PostPackage;
  creatorHandle: string;
  creatorName: string;
  creatorAvatarUrl?: string;
  status: RuntimePost["status"];
  seedMetrics?: Partial<import("./studioFeedTypes").RuntimePostMetric>;
  viewerRewardEligible?: boolean;
  viewerRewardLabel?: string;
}): RuntimePost {
  const t = iso();
  const m = { ...emptyRuntimePostMetrics(), ...input.seedMetrics };
  return {
    id: input.id,
    packageId: input.postPackage.id,
    creatorUserId: input.postPackage.creatorUserId,
    creatorHandle: input.creatorHandle,
    creatorName: input.creatorName,
    creatorAvatarUrl: input.creatorAvatarUrl,
    status: input.status,
    visibility: input.postPackage.visibility,
    ageRating: input.postPackage.ageRating,
    caption: input.postPackage.caption,
    hashtags: input.postPackage.hashtags,
    disclosures: input.postPackage.disclosures,
    postPackage: input.postPackage,
    metrics: m,
    createdAt: input.postPackage.createdAt,
    publishedAt: t,
    updatedAt: t,
    viewerRewardEligible: input.viewerRewardEligible,
    viewerRewardLabel: input.viewerRewardLabel,
  };
}

/** Three-post feed: studio slot (from project), organic, sponsored. */
export function createSeedRuntimePosts(studioPackage?: PostPackage): RuntimePost[] {
  const t = iso();
  const studioPkg =
    studioPackage ??
    ({
      id: `pkg_seed_${Date.now()}`,
      sourceProjectId: "seed",
      creatorUserId: MOCK_OWNER_ID,
      title: "Seed Studio",
      caption: "Publish from Studio to replace this slot.",
      hashtags: ["#iStudio"],
      visibility: "public",
      ageRating: "everyone",
      publishTarget: "i_feed",
      monetizationMode: "magic_unlocks",
      media: { assetIds: [] },
      timeline: { clipIds: [], durationMs: 30_000 },
      magicReveals: [],
      unlockRules: {},
      walletRules: {},
      safetyReport: baseSafetyReport("seed"),
      rightsReport: baseRightsReport("seed"),
      disclosures: [],
      exportManifest: {
        renderId: "seed",
        outputUrl: "mock://placeholder",
        thumbnailUrl: "mock://thumb",
        durationMs: 30_000,
        width: 1080,
        height: 1920,
        aspectRatio: "9:16",
        quality: "preview",
        includesWatermark: false,
        includesBurnedCaptions: false,
        includesMagicMaskMap: false,
        createdAt: t,
      },
      runtimeConfig: {
        allowMagicUnlocks: true,
        allowTips: true,
        allowComments: true,
        allowShares: true,
        allowSaves: true,
        allowDuetRemix: false,
        showWalletChip: true,
        showCreatorRevenueDisclosure: true,
        showViewerRewardDisclosure: false,
        requireAgeGateBeforeView: false,
        requireHumanVerificationForUnlocks: false,
      },
      createdAt: t,
    } as PostPackage);

  const postStudio = buildRuntimePostFromPackage({
    id: RUNTIME_STUDIO_SLOT_ID,
    postPackage: studioPkg,
    creatorHandle: MOCK_CREATOR_HANDLE,
    creatorName: MOCK_CREATOR_NAME,
    status: "published",
    seedMetrics: { impressions: 1200, views: 800, verifiedViews: 210, magicTaps: 44, magicUnlocks: 18, likes: 92 },
  });

  const organicPkg: PostPackage = {
    ...studioPkg,
    id: `pkg_organic_${Date.now()}`,
    sourceProjectId: "organic_demo",
    title: "Day in the life — no Magic",
    caption: "Organic post · engagement only (mock).",
    hashtags: ["#dayinthelife"],
    monetizationMode: "none",
    magicReveals: [],
    disclosures: [
      {
        id: "d_imp",
        type: "imported_media",
        label: "Imported media",
        required: true,
        visibleToViewer: true,
        message: "Contains imported clips.",
      },
    ],
  };
  const postOrganic = buildRuntimePostFromPackage({
    id: RUNTIME_ORGANIC_POST_ID,
    postPackage: organicPkg,
    creatorHandle: MOCK_CREATOR_HANDLE,
    creatorName: MOCK_CREATOR_NAME,
    status: "published",
    seedMetrics: { impressions: 50_000, views: 12_400, verifiedViews: 6200, likes: 1800, saves: 420, comments: 96 },
  });

  const watchReveal = studioPkg.magicReveals.find((r) => r.revealType === "watch_to_reveal");
  const sponsoredPkg: PostPackage = {
    ...studioPkg,
    id: `pkg_sponsored_${Date.now()}`,
    sourceProjectId: "sponsor_demo",
    title: "Sponsored · watch & earn (mock)",
    caption: "Campaign rewarded — verify watch for payout eligibility.",
    hashtags: ["#sponsored", "#rewards"],
    monetizationMode: "campaign_rewarded",
    publishTarget: "i_campaign",
    magicReveals: watchReveal ? [watchReveal] : [],
    disclosures: [
      {
        id: "d_sp",
        type: "sponsored",
        label: "Sponsored",
        required: true,
        visibleToViewer: true,
        message: "Paid partnership.",
      },
      {
        id: "d_vr",
        type: "viewer_rewarded",
        label: "Viewer rewarded",
        required: true,
        visibleToViewer: true,
        message: "Watch requirements apply before rewards credit.",
      },
    ],
    runtimeConfig: {
      ...studioPkg.runtimeConfig,
      showViewerRewardDisclosure: true,
      requireHumanVerificationForUnlocks: true,
    },
  };

  const postSponsored = buildRuntimePostFromPackage({
    id: RUNTIME_SPONSORED_POST_ID,
    postPackage: sponsoredPkg,
    creatorHandle: MOCK_CREATOR_HANDLE,
    creatorName: MOCK_CREATOR_NAME,
    status: "published",
    seedMetrics: { impressions: 200_000, views: 44_000, verifiedViews: 18_000, likes: 2100 },
    viewerRewardEligible: true,
    viewerRewardLabel: "Earn up to 12 aCoin",
  });

  return [postStudio, postOrganic, postSponsored];
}
