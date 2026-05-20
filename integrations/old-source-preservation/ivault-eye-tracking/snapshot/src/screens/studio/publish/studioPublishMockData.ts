// MOCK / DEMO STUDIO DATA
// This module is demo/mock-only and not an authoritative backend source of truth.
// Do not use as the final writer for economy, rewards, wallet, trust, fraud, or settlement decisions.
// Backend/API + DB event flows remain authoritative per ownership contract.

import type { PostAgeRating, PublishWalletState, StudioRightsReport, StudioSafetyReport } from "./studioPublishTypes";
import type { StudioProject } from "../studioTypes";
import { isMonetizedRevealType } from "../magic/magicSafetyRules";

export const MOCK_PUBLISH_CAPTION = "Live guitar session with a hidden reveal.";
export const MOCK_PUBLISH_HASHTAGS = ["music", "live", "creator", "magic"];

export function defaultPublishWalletState(): PublishWalletState {
  return {
    creatorAccountExists: true,
    platformFeeBpsConfigured: true,
    rewardPoolExists: true,
    settlementRulesExist: true,
    viewerRewardsEnabled: false,
  };
}

export function inferDefaultMonetizationMode(project: StudioProject): import("./studioPublishTypes").PostMonetizationMode {
  const hasMonetized = project.magicReveals.some(
    (r) => r.status !== "deleted" && isMonetizedRevealType(r.revealType) && r.safety.monetizationAllowed
  );
  return hasMonetized ? "magic_unlocks" : "none";
}

export function inferAgeRatingFromReveals(project: StudioProject): PostAgeRating {
  let max = 0;
  for (const r of project.magicReveals) {
    if (r.status === "deleted") continue;
    const a = r.eligibility.minAge;
    if (typeof a === "number") max = Math.max(max, a);
  }
  if (max >= 21) return "twentyone_plus";
  if (max >= 18) return "eighteen_plus";
  if (max >= 16) return "sixteen_plus";
  if (max >= 13) return "teen";
  const blockedMinor = project.magicReveals.some(
    (r) => r.status !== "deleted" && r.safety.safetyClass === "minor_sensitive"
  );
  if (blockedMinor) return "eighteen_plus";
  return "teen";
}

/** Seed rights report for demo — cleared owned, music mocked. */
export function mockRightsReport(projectId: string): StudioRightsReport {
  const t = new Date().toISOString();
  return {
    id: `rights_${projectId}`,
    projectId,
    status: "cleared",
    ownershipStatus: "owned",
    musicRightsStatus: "licensed_mock",
    commercialUseAllowed: true,
    monetizationAllowed: true,
    attributionRequired: false,
    blockedAssets: [],
    warnings: ["Music rights are mocked for demo."],
    exportBlocked: false,
    createdAt: t,
  };
}

export function mockRightsReportUnlicensed(projectId: string): StudioRightsReport {
  const base = mockRightsReport(projectId);
  return {
    ...base,
    id: `rights_unlicensed_${projectId}`,
    status: "warning",
    musicRightsStatus: "unlicensed_mock",
    monetizationAllowed: false,
    warnings: [...base.warnings, "Unlicensed track detected (mock) — monetization disabled."],
  };
}

/** Rights/safety seed for empty draft extension (no Magic rows). */
export function mockSafetyReportForEmptyProject(projectId: string): StudioSafetyReport {
  const t = new Date().toISOString();
  return {
    id: `safety_${projectId}`,
    projectId,
    status: "passed",
    checks: [],
    ageRating: "everyone",
    detectedIssues: [],
    blockedReasons: [],
    monetizationAllowed: true,
    requiresHumanReview: false,
    createdAt: t,
  };
}

export function mockSafetyReportFromProject(project: StudioProject): StudioSafetyReport {
  const t = new Date().toISOString();
  const projectId = project.id;
  const issues: import("./studioPublishTypes").DetectedSafetyIssue[] = [];
  const blockedReasons: string[] = [];
  let requiresHumanReview = false;
  let monetizationAllowed = true;

  const privacyReveal = project.magicReveals.find(
    (r) => r.status !== "deleted" && r.safety.safetyClass === "privacy_sensitive"
  );
  if (privacyReveal) {
    issues.push({
      id: `issue_priv_${privacyReveal.id}`,
      type: "personal_information",
      severity: "warning",
      timelineStartMs: privacyReveal.timelineStartMs,
      timelineEndMs: privacyReveal.timelineEndMs,
      relatedRevealId: privacyReveal.id,
      message: "Privacy-sensitive Magic reveal — keep blur for viewers.",
      requiredAction: "warning",
    });
  }

  const minorMonetized = project.magicReveals.find(
    (r) =>
      r.status !== "deleted" &&
      r.safety.safetyClass === "minor_sensitive" &&
      isMonetizedRevealType(r.revealType)
  );
  if (minorMonetized) {
    issues.push({
      id: `issue_minor_${minorMonetized.id}`,
      type: "minor_face",
      severity: "blocking",
      timelineStartMs: minorMonetized.timelineStartMs,
      timelineEndMs: minorMonetized.timelineEndMs,
      relatedRevealId: minorMonetized.id,
      message: "Minor-sensitive monetized reveal — publish blocked.",
      requiredAction: "publish_blocked",
    });
    blockedReasons.push("Minor-sensitive monetized Magic reveal.");
    monetizationAllowed = false;
  }

  const blockedReveal = project.magicReveals.find(
    (r) => r.status !== "deleted" && (r.safety.publishBlocked || r.safety.safetyStatus === "blocked")
  );
  if (blockedReveal && !minorMonetized) {
    issues.push({
      id: `issue_blocked_${blockedReveal.id}`,
      type: "scam_risk",
      severity: "blocking",
      relatedRevealId: blockedReveal.id,
      message: `Reveal "${blockedReveal.name}" is blocked for publishing.`,
      requiredAction: "publish_blocked",
    });
    blockedReasons.push(`Blocked reveal: ${blockedReveal.name}`);
  }

  const status =
    issues.some((i) => i.severity === "blocking") || blockedReasons.length
      ? "blocked"
      : issues.length
        ? "warning"
        : "passed";

  return {
    id: `safety_${projectId}`,
    projectId,
    status,
    checks: [],
    ageRating: inferAgeRatingFromReveals(project),
    detectedIssues: issues,
    blockedReasons,
    monetizationAllowed,
    requiresHumanReview,
    createdAt: t,
  };
}
