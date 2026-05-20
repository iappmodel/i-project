/**
 * [ i ] Studio Stage 4 — publish orchestration (local simulation).
 */

import type { StudioProject } from "../studioTypes";
import { isMonetizedRevealType } from "../magic/magicSafetyRules";
import type {
  ExportManifest,
  PostDisclosure,
  PostPackage,
  PublishWalletState,
  PublishedPost,
  StudioRightsReport,
  StudioSafetyReport,
} from "./studioPublishTypes";
import {
  defaultPublishWalletState,
  inferAgeRatingFromReveals,
  inferDefaultMonetizationMode,
  mockRightsReport,
  mockRightsReportUnlicensed,
  mockSafetyReportFromProject,
  MOCK_PUBLISH_CAPTION,
  MOCK_PUBLISH_HASHTAGS,
} from "./studioPublishMockData";
import { validateStudioProjectForPublish } from "./studioPublishValidator";
import { buildPostPackage, createPublishedPost } from "./studioPostPackageBuilder";

export { defaultPublishWalletState } from "./studioPublishMockData";

export function runSafetyScan(project: StudioProject): StudioSafetyReport {
  return mockSafetyReportFromProject(project);
}

export function runRightsScan(project: StudioProject, opts?: { unlicensedMusicMock?: boolean }): StudioRightsReport {
  if (opts?.unlicensedMusicMock) return mockRightsReportUnlicensed(project.id);
  return mockRightsReport(project.id);
}

export function runPublishValidation(project: StudioProject, walletState: PublishWalletState = defaultPublishWalletState()) {
  const disclosures = rebuildPublishDisclosures(project);
  return validateStudioProjectForPublish(project, walletState, {
    rights: project.rightsReport,
    safety: project.safetyReport,
    disclosures,
  });
}

function disclosure(
  id: string,
  type: PostDisclosure["type"],
  label: string,
  message: string,
  required: boolean,
  visibleToViewer = true
): PostDisclosure {
  return { id, type, label, required, visibleToViewer, message };
}

/** Builds required disclosures; merge with existing via {@link rebuildPublishDisclosures}. */
export function buildRequiredDisclosures(project: StudioProject, rights?: StudioRightsReport): PostDisclosure[] {
  const r = rights ?? project.rightsReport;
  const out: PostDisclosure[] = [];
  const sponsoredTarget =
    project.publishTarget === "i_campaign" || project.monetization.postKind === "sponsored";
  if (sponsoredTarget) {
    out.push(
      disclosure(
        "disc_sponsored",
        "sponsored",
        "Sponsored",
        "This post is sponsored or part of a paid campaign.",
        true
      )
    );
  }
  const active = project.magicReveals.filter((m) => m.status !== "deleted");
  const paidUnlocks = active.some((m) => m.revealType === "pay_to_reveal" || m.revealType === "tip_to_reveal");
  if (paidUnlocks) {
    out.push(
      disclosure(
        "disc_paid_unlock",
        "paid_unlock",
        "Paid unlock",
        "Some hidden moments require a tip or payment to unlock. Settlement is pending verification — not instant payout.",
        true
      )
    );
  }
  const viewerRewardsOn =
    active.some((m) => m.reward?.viewerRewardEnabled) || project.monetization.viewerEarnsOnUnlock;
  if (viewerRewardsOn) {
    out.push(
      disclosure(
        "disc_viewer_rewarded",
        "viewer_rewarded",
        "Viewer rewards",
        "Viewers may earn rewards; amounts settle after verification.",
        true
      )
    );
  }
  const creatorEarns = active.some((m) => isMonetizedRevealType(m.revealType));
  if (creatorEarns) {
    out.push(
      disclosure(
        "disc_creator_earns",
        "creator_earns",
        "Creator revenue",
        "Creator earnings from unlocks are pending settlement after verification — not instant cash.",
        true
      )
    );
  }
  if (project.mode === "ai") {
    out.push(
      disclosure("disc_ai", "ai_edited", "AI edited", "This project used AI-assisted editing tools.", true)
    );
  }
  if (project.beautyEditsApplied) {
    out.push(
      disclosure("disc_beauty", "beauty_edited", "Beauty / retouch", "Appearance may have been digitally enhanced.", true)
    );
  }
  if (r?.ownershipStatus === "imported_external") {
    out.push(
      disclosure("disc_imported", "imported_media", "Imported media", "Includes imported third-party media.", true)
    );
  }
  const ageRestricted =
    project.ageRating === "eighteen_plus" ||
    project.ageRating === "twentyone_plus" ||
    project.ageRating === "restricted";
  if (ageRestricted) {
    out.push(
      disclosure("disc_age", "age_restricted", "Age restricted", "This post is intended for mature audiences.", true)
    );
  }
  return out;
}

/** Merges required disclosures with user toggles; required rows stay on. */
export function rebuildPublishDisclosures(project: StudioProject): PostDisclosure[] {
  const required = buildRequiredDisclosures(project, project.rightsReport);
  const byId = new Map<string, PostDisclosure>();
  for (const d of project.disclosures) {
    byId.set(d.id, { ...d });
  }
  for (const r of required) {
    const prev = byId.get(r.id);
    if (!prev) {
      byId.set(r.id, r);
    } else {
      byId.set(r.id, {
        ...r,
        ...prev,
        required: r.required,
        label: r.label,
        message: r.message,
        visibleToViewer: r.required ? true : prev.visibleToViewer,
      });
    }
  }
  return Array.from(byId.values());
}

export function createMockExportManifest(project: StudioProject): ExportManifest {
  const t = new Date().toISOString();
  const renderId = `rend_${project.id}_${Date.now()}`;
  const hasMagic = project.magicReveals.some((m) => m.status !== "deleted");
  return {
    renderId,
    outputUrl: `mock://renders/${renderId}/master.mp4`,
    thumbnailUrl: `mock://renders/${renderId}/thumb.jpg`,
    durationMs: project.durationMs,
    width: project.canvasWidth,
    height: project.canvasHeight,
    aspectRatio: project.aspectRatio,
    quality: project.exportSettings.quality ?? "high",
    includesWatermark: project.exportSettings.includeWatermark,
    includesBurnedCaptions: true,
    includesMagicMaskMap: hasMagic,
    createdAt: t,
  };
}

export type PublishProjectResult =
  | { ok: true; postPackage: PostPackage; publishedPost: PublishedPost }
  | { ok: false; blockedReasons: string[]; validation: ReturnType<typeof runPublishValidation> };

export function publishProjectLocal(
  project: StudioProject,
  walletState: PublishWalletState = defaultPublishWalletState()
): PublishProjectResult {
  const disclosures = rebuildPublishDisclosures(project);
  const projectForVal: StudioProject = { ...project, disclosures };
  const validation = validateStudioProjectForPublish(projectForVal, walletState, {
    rights: projectForVal.rightsReport,
    safety: projectForVal.safetyReport,
    disclosures,
  });
  if (!validation.canPublish) {
    return { ok: false, blockedReasons: validation.blockedReasons, validation };
  }
  const manifest = projectForVal.exportManifest ?? createMockExportManifest(projectForVal);
  const pkg = buildPostPackage({
    project: { ...projectForVal, disclosures },
    safetyReport: projectForVal.safetyReport,
    rightsReport: projectForVal.rightsReport,
    exportManifest: manifest,
  });
  const publishedPost = createPublishedPost(pkg);
  return { ok: true, postPackage: pkg, publishedPost };
}

/** Seed demo publish fields when missing (mock project). */
export function ensurePublishDefaults(project: StudioProject): StudioProject {
  const monetizationMode = project.monetizationMode ?? inferDefaultMonetizationMode(project);
  const ageRating = project.ageRating ?? inferAgeRatingFromReveals(project);
  return {
    ...project,
    caption: project.caption?.trim() ? project.caption : MOCK_PUBLISH_CAPTION,
    hashtags: project.hashtags?.length ? project.hashtags : [...MOCK_PUBLISH_HASHTAGS],
    visibility: project.visibility ?? "public",
    publishTarget: project.publishTarget ?? "i_feed",
    monetizationMode,
    publishStatus: project.publishStatus ?? "idle",
    ageRating,
    disclosures: project.disclosures?.length ? project.disclosures : rebuildPublishDisclosures({ ...project, ageRating }),
    publishChecks: project.publishChecks ?? [],
  };
}
