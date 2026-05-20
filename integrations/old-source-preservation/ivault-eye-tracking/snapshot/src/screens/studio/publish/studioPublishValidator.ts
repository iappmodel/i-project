import type { MagicReveal, StudioProject } from "../studioTypes";
import {
  COPY_PENDING_SETTLEMENT,
  isMonetizedRevealType,
  paidRevealRequiresDescription,
} from "../magic/magicSafetyRules";
import type {
  PostAgeRating,
  PostDisclosure,
  PublishCheck,
  PublishValidationResult,
  PublishWalletState,
  StudioRightsReport,
  StudioSafetyReport,
} from "./studioPublishTypes";

function mk(
  id: string,
  label: string,
  description: string,
  category: PublishCheck["category"],
  status: PublishCheck["status"],
  severity: PublishCheck["severity"],
  blocking: boolean,
  reason?: string,
  fixAction?: string
): PublishCheck {
  return { id, label, description, category, status, severity, blocking, reason, fixAction };
}

function hasVideoOrImageAsset(project: StudioProject): boolean {
  return project.assets.some((a) => a.type === "video" || a.type === "image");
}

function ageRatingRank(r: PostAgeRating): number {
  const o: Record<PostAgeRating, number> = {
    everyone: 0,
    teen: 1,
    sixteen_plus: 2,
    eighteen_plus: 3,
    twentyone_plus: 4,
    restricted: 5,
  };
  return o[r] ?? 0;
}

function revealMinAge(r: MagicReveal): number | undefined {
  return r.eligibility.minAge;
}

export function validateStudioProjectForPublish(
  project: StudioProject,
  walletState: PublishWalletState,
  options: { rights?: StudioRightsReport; safety?: StudioSafetyReport; disclosures: PostDisclosure[] } = {
    disclosures: [],
  }
): PublishValidationResult {
  const checks: PublishCheck[] = [];
  const warnings: string[] = [];
  const blockedReasons: string[] = [];

  const pushBlock = (reason: string) => {
    blockedReasons.push(reason);
  };

  // --- MEDIA ---
  const mediaOk = hasVideoOrImageAsset(project);
  checks.push(
    mk(
      "media_asset",
      "Primary media",
      "At least one video or image asset.",
      "media",
      mediaOk ? "passed" : "failed",
      mediaOk ? "info" : "blocking",
      !mediaOk,
      !mediaOk ? "No video/image asset" : undefined,
      !mediaOk ? "Upload a video or image clip." : undefined
    )
  );
  if (!mediaOk) pushBlock("No video or image asset.");

  const durOk = project.durationMs > 0;
  checks.push(
    mk(
      "media_duration",
      "Duration",
      "Project duration must be positive.",
      "media",
      durOk ? "passed" : "failed",
      durOk ? "info" : "blocking",
      !durOk
    )
  );
  if (!durOk) pushBlock("Duration must be > 0.");

  const arOk = Boolean(project.aspectRatio);
  checks.push(
    mk(
      "media_aspect",
      "Aspect ratio",
      "Aspect ratio is set for export.",
      "media",
      arOk ? "passed" : "failed",
      arOk ? "info" : "blocking",
      !arOk
    )
  );

  const exp = project.exportSettings;
  const exportSettingsOk = exp.quality !== undefined && exp.status !== undefined;
  checks.push(
    mk(
      "media_export_settings",
      "Export settings",
      "Export quality and status fields are valid.",
      "media",
      exportSettingsOk ? "passed" : "warning",
      exportSettingsOk ? "info" : "warning",
      false
    )
  );

  // --- MAGIC ---
  const activeReveals = project.magicReveals.filter((r) => r.status !== "deleted");
  for (const r of activeReveals) {
    if (r.safety.publishBlocked) {
      checks.push(
        mk(
          `magic_block_${r.id}`,
          `Magic: ${r.name}`,
          "Reveal is publish-blocked.",
          "magic",
          "blocked",
          "blocking",
          true,
          "publishBlocked",
          "Disable reveal or clear safety block."
        )
      );
      pushBlock(`Magic reveal blocked: ${r.name}`);
    }
    if (r.safety.safetyClass === "minor_sensitive" && isMonetizedRevealType(r.revealType)) {
      checks.push(
        mk(
          `magic_minor_${r.id}`,
          `Magic: ${r.name}`,
          "Minor-sensitive monetized reveal.",
          "magic",
          "blocked",
          "blocking",
          true,
          undefined,
          "Remove monetization or disable reveal."
        )
      );
      pushBlock("Minor-sensitive monetized reveal.");
    }
    if (r.safety.safetyClass === "financial_sensitive" && isMonetizedRevealType(r.revealType)) {
      checks.push(
        mk(
          `magic_fin_${r.id}`,
          `Magic: ${r.name}`,
          "Financial-sensitive paid reveal.",
          "magic",
          "blocked",
          "blocking",
          true,
          undefined,
          "Change reveal type or safety class."
        )
      );
      pushBlock("Financial-sensitive paid reveal.");
    }
    if (paidRevealRequiresDescription(r)) {
      checks.push(
        mk(
          `magic_desc_${r.id}`,
          `Magic: ${r.name}`,
          "Paid/tip reveal needs description.",
          "magic",
          "failed",
          "blocking",
          true,
          undefined,
          "Add a short description."
        )
      );
      pushBlock("Paid reveal missing description.");
    }
    const minAge = revealMinAge(r);
    if (minAge && minAge >= 18 && project.ageRating) {
      const pr = ageRatingRank(project.ageRating);
      const need = minAge >= 21 ? ageRatingRank("twentyone_plus") : ageRatingRank("eighteen_plus");
      const ageOk = pr >= need;
      checks.push(
        mk(
          `magic_age_${r.id}`,
          `Magic age gate · ${r.name}`,
          "Post age rating must cover reveal minimum age.",
          "age",
          ageOk ? "passed" : "failed",
          ageOk ? "info" : "blocking",
          !ageOk,
          !ageOk ? `Reveal requires ${minAge}+` : undefined,
          "Raise post age rating."
        )
      );
      if (!ageOk) pushBlock("Age rating below reveal requirement.");
    }
    if (r.revealType === "collective_reveal") {
      const goal = r.eligibility.revealAfterTotalTips ?? 0;
      const ok = goal > 0;
      checks.push(
        mk(
          `magic_coll_${r.id}`,
          "Collective reveal",
          "Collective reveal requires tip threshold.",
          "magic",
          ok ? "passed" : "failed",
          ok ? "info" : "blocking",
          !ok
        )
      );
      if (!ok) pushBlock("Collective reveal missing threshold.");
    }
    if (r.revealType === "watch_to_reveal" && !r.eligibility.requireVerifiedHuman) {
      checks.push(
        mk(
          `magic_watch_${r.id}`,
          "Watch-to-reveal",
          "Watch-to-reveal should require verified completion flag.",
          "magic",
          "warning",
          "warning",
          false,
          undefined,
          "Enable verified human on reveal eligibility."
        )
      );
      warnings.push("Watch-to-reveal without verified-human flag.");
    }
    const rangeOk = r.timelineEndMs > r.timelineStartMs && r.timelineStartMs >= 0;
    checks.push(
      mk(
        `magic_range_${r.id}`,
        `Timeline · ${r.name}`,
        "Valid timeline range.",
        "magic",
        rangeOk ? "passed" : "failed",
        rangeOk ? "info" : "blocking",
        !rangeOk
      )
    );
    if (!rangeOk) pushBlock("Invalid Magic timeline range.");
  }

  // --- WALLET ---
  checks.push(
    mk(
      "wallet_creator",
      "Creator account",
      "Creator wallet account exists (mock).",
      "wallet",
      walletState.creatorAccountExists ? "passed" : "failed",
      walletState.creatorAccountExists ? "info" : "blocking",
      !walletState.creatorAccountExists
    )
  );
  if (!walletState.creatorAccountExists) pushBlock("Creator account missing.");

  checks.push(
    mk(
      "wallet_platform_fee",
      "Platform fee",
      "Platform fee configuration present.",
      "wallet",
      walletState.platformFeeBpsConfigured ? "passed" : "failed",
      walletState.platformFeeBpsConfigured ? "info" : "blocking",
      !walletState.platformFeeBpsConfigured
    )
  );
  if (!walletState.platformFeeBpsConfigured) pushBlock("Platform fee not configured.");

  const viewerRewards = activeReveals.some((r) => r.reward?.viewerRewardEnabled);
  const poolOk = !viewerRewards || walletState.rewardPoolExists;
  checks.push(
    mk(
      "wallet_pool",
      "Reward pool",
      "Reward pool exists if viewer rewards enabled.",
      "wallet",
      poolOk ? "passed" : "failed",
      poolOk ? "info" : "blocking",
      !poolOk
    )
  );
  if (!poolOk) pushBlock("Viewer rewards enabled but no reward pool.");

  const monetized = activeReveals.some((r) => isMonetizedRevealType(r.revealType));
  const settleOk = !monetized || walletState.settlementRulesExist;
  checks.push(
    mk(
      "wallet_settlement",
      "Settlement rules",
      "Settlement rules for monetized reveals.",
      "wallet",
      settleOk ? "passed" : "failed",
      settleOk ? "info" : "blocking",
      !settleOk
    )
  );
  if (!settleOk) pushBlock("Missing settlement rules for monetized Magic.");

  checks.push(
    mk(
      "wallet_pending_copy",
      "Pending settlement disclosure",
      "Creator pending settlement copy must be surfaced when monetized.",
      "wallet",
      monetized ? "passed" : "passed",
      "info",
      false,
      undefined,
      COPY_PENDING_SETTLEMENT
    )
  );

  // --- SAFETY ---
  const safety = options.safety;
  checks.push(
    mk(
      "safety_report",
      "Safety report",
      "Safety scan has run.",
      "safety",
      safety ? "passed" : "warning",
      safety ? "info" : "warning",
      false,
      !safety ? "Run safety scan before publish." : undefined
    )
  );
  if (!safety) warnings.push("Safety report not generated yet.");

  const safetyBlocked = safety?.status === "blocked" || (safety?.blockedReasons.length ?? 0) > 0;
  checks.push(
    mk(
      "safety_blocked",
      "Safety gate",
      "Safety report cannot be blocked for publish.",
      "safety",
      safetyBlocked ? "blocked" : "passed",
      safetyBlocked ? "blocking" : "info",
      safetyBlocked,
      safetyBlocked ? safety?.blockedReasons.join("; ") : undefined
    )
  );
  if (safetyBlocked) pushBlock("Safety report blocked.");

  const humanReview = safety?.requiresHumanReview;
  checks.push(
    mk(
      "safety_human",
      "Human review",
      "Human review blocks public publish (draft export may still be allowed).",
      "safety",
      humanReview ? "blocked" : "passed",
      humanReview ? "blocking" : "info",
      Boolean(humanReview),
      humanReview ? "Human review required" : undefined
    )
  );
  if (humanReview) pushBlock("Human review required.");

  const personalIssue = safety?.detectedIssues?.some((i) => i.type === "personal_information") ?? false;
  const privacyBlurOk = activeReveals.some((r) => r.safety.safetyClass === "privacy_sensitive" && r.hiddenRender.mode === "blur");
  checks.push(
    mk(
      "safety_pii",
      "Personal information",
      "PII-sensitive content needs blur or block.",
      "safety",
      !personalIssue || privacyBlurOk ? "passed" : "warning",
      !personalIssue || privacyBlurOk ? "info" : "warning",
      false
    )
  );
  if (personalIssue && !privacyBlurOk) warnings.push("Privacy-sensitive reveal should use blur.");

  // --- RIGHTS ---
  const rights = options.rights;
  checks.push(
    mk(
      "rights_report",
      "Rights report",
      "Rights scan has run.",
      "rights",
      rights ? "passed" : "warning",
      rights ? "info" : "warning",
      false
    )
  );
  if (!rights) warnings.push("Rights report not generated yet.");

  const unlicensed =
    rights?.ownershipStatus === "unlicensed" || Boolean(rights?.musicRightsStatus?.includes("unlicensed"));
  const monetizationMode = project.monetizationMode ?? "none";
  const monetizationWantsMoney =
    monetizationMode !== "none" && monetizationMode !== "tips_enabled";
  checks.push(
    mk(
      "rights_monetization",
      "Monetization vs rights",
      "Unlicensed media blocks monetization.",
      "rights",
      !unlicensed || !monetizationWantsMoney ? "passed" : "failed",
      !unlicensed || !monetizationWantsMoney ? "info" : "blocking",
      Boolean(unlicensed && monetizationWantsMoney)
    )
  );
  if (unlicensed && monetizationWantsMoney) pushBlock("Unlicensed media blocks monetization.");

  const rightsExportBlocked = rights?.exportBlocked;
  checks.push(
    mk(
      "rights_export",
      "Export rights",
      "Rights may block download/export.",
      "rights",
      rightsExportBlocked ? "blocked" : "passed",
      rightsExportBlocked ? "blocking" : "info",
      Boolean(rightsExportBlocked)
    )
  );
  if (rightsExportBlocked) pushBlock("Export blocked by rights.");

  const commercial = rights?.commercialUseAllowed !== false;
  const sponsoredTarget =
    project.publishTarget === "i_campaign" || project.monetization.postKind === "sponsored";
  checks.push(
    mk(
      "rights_commercial",
      "Commercial use",
      "Sponsored/campaign requires commercial use.",
      "rights",
      !sponsoredTarget || commercial ? "passed" : "failed",
      !sponsoredTarget || commercial ? "info" : "blocking",
      sponsoredTarget && !commercial
    )
  );
  if (sponsoredTarget && !commercial) pushBlock("Commercial use not allowed for sponsored/campaign.");

  // --- DISCLOSURE ---
  const hasSponsoredDisc = options.disclosures.some((d) => d.type === "sponsored" && d.required);
  checks.push(
    mk(
      "disc_sponsored",
      "Sponsored disclosure",
      "Sponsored/campaign target requires sponsored disclosure.",
      "disclosure",
      !sponsoredTarget || hasSponsoredDisc ? "passed" : "failed",
      !sponsoredTarget || hasSponsoredDisc ? "info" : "blocking",
      sponsoredTarget && !hasSponsoredDisc
    )
  );
  if (sponsoredTarget && !hasSponsoredDisc) pushBlock("Missing sponsored disclosure.");

  const paidUnlocks = activeReveals.some(
    (r) => r.revealType === "pay_to_reveal" || r.revealType === "tip_to_reveal"
  );
  const hasPaidDisc = options.disclosures.some((d) => d.type === "paid_unlock" && d.required);
  checks.push(
    mk(
      "disc_paid",
      "Paid unlock disclosure",
      "Paid Magic unlocks require disclosure.",
      "disclosure",
      !paidUnlocks || hasPaidDisc ? "passed" : "failed",
      !paidUnlocks || hasPaidDisc ? "info" : "blocking",
      paidUnlocks && !hasPaidDisc
    )
  );
  if (paidUnlocks && !hasPaidDisc) pushBlock("Missing paid unlock disclosure.");

  const viewerRewardsOn = activeReveals.some((r) => r.reward?.viewerRewardEnabled) || project.monetization.viewerEarnsOnUnlock;
  const hasViewerDisc = options.disclosures.some((d) => d.type === "viewer_rewarded" && d.required);
  checks.push(
    mk(
      "disc_viewer",
      "Viewer reward disclosure",
      "Viewer rewards require disclosure.",
      "disclosure",
      !viewerRewardsOn || hasViewerDisc ? "passed" : "failed",
      !viewerRewardsOn || hasViewerDisc ? "info" : "blocking",
      viewerRewardsOn && !hasViewerDisc
    )
  );
  if (viewerRewardsOn && !hasViewerDisc) pushBlock("Missing viewer reward disclosure.");

  const creatorEarns = activeReveals.some((r) => isMonetizedRevealType(r.revealType));
  const hasCreatorDisc = options.disclosures.some((d) => d.type === "creator_earns" && d.required);
  checks.push(
    mk(
      "disc_creator",
      "Creator earns disclosure",
      "Creator earning from unlock requires disclosure.",
      "disclosure",
      !creatorEarns || hasCreatorDisc ? "passed" : "failed",
      !creatorEarns || hasCreatorDisc ? "info" : "blocking",
      creatorEarns && !hasCreatorDisc
    )
  );
  if (creatorEarns && !hasCreatorDisc) pushBlock("Missing creator earns disclosure.");

  const aiMode = project.mode === "ai";
  const hasAiDisc = options.disclosures.some((d) => d.type === "ai_edited" && d.required);
  checks.push(
    mk(
      "disc_ai",
      "AI edited disclosure",
      "AI mode requires AI edited disclosure.",
      "disclosure",
      !aiMode || hasAiDisc ? "passed" : "failed",
      !aiMode || hasAiDisc ? "info" : "blocking",
      aiMode && !hasAiDisc
    )
  );
  if (aiMode && !hasAiDisc) pushBlock("Missing AI edited disclosure.");

  const beauty = project.beautyEditsApplied;
  const hasBeautyDisc = options.disclosures.some((d) => d.type === "beauty_edited" && d.required);
  checks.push(
    mk(
      "disc_beauty",
      "Beauty edits disclosure",
      "Beauty edits require disclosure when applied.",
      "disclosure",
      !beauty || hasBeautyDisc ? "passed" : "failed",
      !beauty || hasBeautyDisc ? "info" : "blocking",
      Boolean(beauty && !hasBeautyDisc)
    )
  );
  if (beauty && !hasBeautyDisc) pushBlock("Missing beauty edited disclosure.");

  const imported = rights?.ownershipStatus === "imported_external";
  const hasImpDisc = options.disclosures.some((d) => d.type === "imported_media" && d.required);
  checks.push(
    mk(
      "disc_import",
      "Imported media disclosure",
      "Imported external media should be disclosed.",
      "disclosure",
      !imported || hasImpDisc ? "passed" : "warning",
      !imported || hasImpDisc ? "info" : "warning",
      false
    )
  );
  if (imported && !hasImpDisc) warnings.push("Consider imported media disclosure.");

  const ageRestricted =
    project.ageRating === "eighteen_plus" ||
    project.ageRating === "twentyone_plus" ||
    project.ageRating === "restricted";
  const hasAgeDisc = options.disclosures.some((d) => d.type === "age_restricted" && d.required);
  checks.push(
    mk(
      "disc_age",
      "Age restricted disclosure",
      "18+ posts require age restricted disclosure.",
      "disclosure",
      !ageRestricted || hasAgeDisc ? "passed" : "failed",
      !ageRestricted || hasAgeDisc ? "info" : "blocking",
      ageRestricted && !hasAgeDisc
    )
  );
  if (ageRestricted && !hasAgeDisc) pushBlock("Missing age restricted disclosure.");

  // --- EXPORT ---
  const manifest = project.exportManifest;
  checks.push(
    mk(
      "export_manifest",
      "Export manifest",
      "Post package requires completed export manifest.",
      "export",
      manifest ? "passed" : "pending",
      manifest ? "info" : "warning",
      false,
      !manifest ? "Run export first." : undefined
    )
  );

  const qualityOk = Boolean(exp.quality);
  checks.push(
    mk(
      "export_quality",
      "Export quality",
      "Quality preset selected.",
      "export",
      qualityOk ? "passed" : "warning",
      qualityOk ? "info" : "warning",
      false
    )
  );

  checks.push(
    mk(
      "export_watermark",
      "Watermark policy",
      "Watermark setting recorded.",
      "export",
      "passed",
      "info",
      false
    )
  );

  const blocking = checks.filter((c) => c.blocking && (c.status === "failed" || c.status === "blocked"));
  const canPublish = blocking.length === 0 && !safetyBlocked && !humanReview && !rightsExportBlocked;

  const exportBlocking = checks.filter(
    (c) => c.category === "rights" && c.id === "rights_export" && c.status === "blocked"
  );
  const canExport =
    mediaOk &&
    durOk &&
    arOk &&
    exportBlocking.length === 0 &&
    !(safetyBlocked && (safety?.detectedIssues.some((i) => i.requiredAction === "publish_blocked") ?? false));

  return { checks, canExport, canPublish, blockedReasons: [...new Set(blockedReasons)], warnings };
}
