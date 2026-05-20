import type {
  StudioState,
  StudioPublishPlan,
  StudioPublishDestination,
  StudioPublishReadinessGate,
  StudioPublishReadinessGateStatus,
} from "./studio.types";

const gid = (): string => `pub-${Math.floor(Math.random() * 1e9).toString(36)}`;
const nowISO = (): string => new Date().toISOString();
const iso24hFromNow = (): string => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

export interface CreatePublishPlanOptions {
  destinations: StudioPublishDestination[];
  scheduleMode?: "now" | "scheduled";
  scheduledFor?: string | null;
  campaignMode?: boolean;
  ctaLabel?: string | null;
}

function gate(
  id: string,
  label: string,
  status: StudioPublishReadinessGateStatus,
  message: string,
): StudioPublishReadinessGate {
  return { id, label, status, message };
}

export function createPublishPlan(
  state: StudioState,
  options: CreatePublishPlanOptions,
): StudioPublishPlan {
  const dests: StudioPublishDestination[] =
    options.destinations.length > 0 ? options.destinations : ["draft"];

  const isCampaign = options.campaignMode === true || dests.includes("campaign");
  const isStories = dests.includes("stories");
  const isProofVault = dests.includes("proof_vault");

  const disclosureRequired = isCampaign;
  const disclosureText = isCampaign ? "Sponsored / campaign-ready post" : null;
  const proofRequired = isCampaign || isProofVault;

  const caption = `Captured with [ i ] Studio — ${state.activeSession.title}`;
  const hashtags: string[] = ["#iStudio", "#CreatedWithI"];
  if (isCampaign) hashtags.push("#CampaignReady");
  if (isStories) hashtags.push("#StoryCut");

  const ctaEnabled = isCampaign || Boolean(options.ctaLabel);
  const cta: StudioPublishPlan["cta"] = {
    label: options.ctaLabel ?? (isCampaign ? "Learn more" : ""),
    enabled: ctaEnabled,
  };

  const scheduleMode = options.scheduleMode ?? "now";
  const scheduledFor =
    scheduleMode === "scheduled" ? (options.scheduledFor ?? iso24hFromNow()) : null;
  const schedule: StudioPublishPlan["schedule"] = {
    mode: scheduleMode,
    scheduledFor,
    label:
      scheduleMode === "scheduled" && scheduledFor
        ? `Scheduled for ${new Date(scheduledFor).toLocaleString()}`
        : "Post now (mock)",
  };

  const originalityStatus: StudioPublishPlan["originalityStatus"] = proofRequired
    ? "pending"
    : "not_required";

  const hasEditPlan = state.selectedEditPlanId !== null;
  const hasCleanupPlan = state.selectedCleanupPlanId !== null;

  const readinessGates: StudioPublishReadinessGate[] = [
    gate(
      "edit-plan",
      "Edit plan",
      hasEditPlan ? "passed" : "warning",
      hasEditPlan ? "Auto-cut plan selected." : "No edit plan selected — using raw session.",
    ),
    gate(
      "cleanup",
      "Storage cleanup",
      hasCleanupPlan ? "passed" : "warning",
      hasCleanupPlan ? "Cleanup plan ready." : "No cleanup plan — storage not reviewed.",
    ),
    gate(
      "originality",
      "Originality proof",
      proofRequired ? "pending" : "passed",
      proofRequired
        ? "Proof fingerprint pending generation."
        : "Not required for this destination.",
    ),
    gate("audio-rights", "Audio rights", "passed", "Mock audio rights check passed."),
    gate("brand-safety", "Brand safety", "passed", "Mock brand safety check passed."),
    gate(
      "disclosure",
      "Disclosure",
      disclosureRequired ? "pending" : "passed",
      disclosureRequired
        ? "Campaign disclosure text required before publish."
        : "No disclosure required.",
    ),
  ];

  const warnings: string[] = ["This is a mock publish plan. No post will be published."];
  if (isCampaign) warnings.push("Campaign posts require disclosure.");
  if (proofRequired) warnings.push("Originality proof is pending.");

  const passedGates = readinessGates.filter((g) => g.status === "passed").length;
  const summary =
    `Publishing to: ${dests.join(", ")}. ` +
    `${passedGates}/${readinessGates.length} readiness gates passed. ` +
    (scheduleMode === "scheduled" && scheduledFor
      ? `Scheduled for ${scheduledFor}.`
      : "Ready to post (mock).");

  return {
    id: gid(),
    status: "previewed",
    createdAt: nowISO(),
    destinations: dests,
    title: state.activeSession.title,
    caption,
    hashtags,
    disclosureRequired,
    disclosureText,
    cta,
    schedule,
    readinessGates,
    proofRequired,
    originalityStatus,
    selectedEditPlanId: state.selectedEditPlanId,
    selectedCleanupPlanId: state.selectedCleanupPlanId,
    summary,
    warnings,
  };
}
