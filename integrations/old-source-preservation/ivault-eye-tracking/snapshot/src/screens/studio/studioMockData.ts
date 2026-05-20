// MOCK / DEMO STUDIO DATA
// This module is demo/mock-only and not an authoritative backend source of truth.
// Do not use as the final writer for economy, rewards, wallet, trust, fraud, or settlement decisions.
// Backend/API + DB event flows remain authoritative per ownership contract.

import type {
  AspectRatio,
  MagicReveal,
  StudioAsset,
  StudioCAFSegment,
  StudioClip,
  StudioExportSettings,
  StudioMonetizationRule,
  StudioProject,
  StudioSubtitle,
  StudioTextOverlay,
  StudioTrack,
} from "./studioTypes";
import { ensurePublishDefaults } from "./publish/studioPublishEngine";
import { mockRightsReport, mockSafetyReportForEmptyProject, mockSafetyReportFromProject, MOCK_PUBLISH_HASHTAGS } from "./publish/studioPublishMockData";

export const MOCK_OWNER_ID = "user_mock_creator_01";
export const MOCK_OWNER = MOCK_OWNER_ID;

const ts = () => new Date().toISOString();

const EXPORT_DEFAULT: StudioExportSettings = {
  target: "i_feed",
  aspectRatio: "9:16",
  quality: "high",
  includeWatermark: true,
  status: "idle",
  progress: 0,
};

function buildMagicReveals(projectId: string): MagicReveal[] {
  const t = ts();
  const settlement = {
    creatorShareBps: 8200,
    platformFeeBps: 1200,
    viewerRewardBps: 600,
    pendingHoldSeconds: 86_400,
  };
  const unlockDefault = { duration: "session" as const, transferable: false, refundable: true };

  type MagicRevealSeed = Omit<MagicReveal, "projectId" | "ownerUserId">;
  const mk = (r: MagicRevealSeed): MagicReveal => ({ ...r, projectId, ownerUserId: MOCK_OWNER_ID, updatedAt: t });

  return [
    mk({
      id: "magic_privacy_face",
      name: "Privacy Face Blur",
      description: "Face protection — always hidden",
      targetType: "region",
      timelineStartMs: 2000,
      timelineEndMs: 9000,
      geometry: { shape: "rectangle", x: 0.22, y: 0.06, width: 0.56, height: 0.32, rotation: 0 },
      tracking: { mode: "face_tracking", confidence: 0.88 },
      hiddenRender: { mode: "blur", strength: 24, overlayText: "Private", icon: "◎" },
      revealType: "always_hidden",
      eligibility: {},
      unlockPolicy: unlockDefault,
      settlement,
      safety: {
        safetyClass: "privacy_sensitive",
        requiresSafetyScan: true,
        safetyStatus: "passed",
        ageGateRequired: false,
        monetizationAllowed: false,
        publishBlocked: false,
      },
      status: "active",
      createdAt: t,
      updatedAt: t,
    }),
    mk({
      id: "magic_tip_3coin",
      name: "Tip Reveal",
      description: "Behind-the-scenes payoff",
      targetType: "region",
      timelineStartMs: 11_000,
      timelineEndMs: 17_000,
      geometry: { shape: "rectangle", x: 0.28, y: 0.34, width: 0.42, height: 0.22, rotation: 0 },
      tracking: { mode: "none" },
      hiddenRender: { mode: "frosted", strength: 18, overlayText: "Tip to unlock", icon: "✦" },
      revealType: "tip_to_reveal",
      pricing: { coin: "iCoin", amount: 3, allowCustomTip: true, minimumTip: 1 },
      eligibility: {},
      unlockPolicy: unlockDefault,
      settlement,
      safety: {
        safetyClass: "normal",
        requiresSafetyScan: true,
        safetyStatus: "passed",
        ageGateRequired: false,
        monetizationAllowed: true,
        publishBlocked: false,
      },
      status: "active",
      createdAt: t,
      updatedAt: t,
    }),
    mk({
      id: "magic_watch_segment",
      name: "Watch To Reveal",
      description: "Sponsor watch segment — verified completion required",
      targetType: "clip_segment",
      timelineStartMs: 20_000,
      timelineEndMs: 28_000,
      geometry: { shape: "rectangle", x: 0.08, y: 0.48, width: 0.62, height: 0.22, rotation: 0 },
      tracking: { mode: "none" },
      hiddenRender: { mode: "teaser_overlay", strength: 40, overlayText: "Watch to unlock", icon: "▶" },
      revealType: "watch_to_reveal",
      reward: {
        viewerRewardEnabled: true,
        viewerRewardCoin: "iCoin",
        viewerRewardAmount: 0.05,
        creatorRewardEnabled: true,
        creatorRewardCoin: "iCoin",
        creatorRewardAmount: 0.2,
      },
      eligibility: { requireVerifiedHuman: true },
      unlockPolicy: unlockDefault,
      settlement,
      safety: {
        safetyClass: "normal",
        requiresSafetyScan: true,
        safetyStatus: "passed",
        ageGateRequired: false,
        monetizationAllowed: true,
        publishBlocked: false,
      },
      status: "active",
      createdAt: t,
      updatedAt: t,
    }),
    mk({
      id: "magic_collective_100",
      name: "Collective Reveal",
      description: "Community-funded unlock when tips reach goal",
      targetType: "full_post",
      timelineStartMs: 0,
      timelineEndMs: 47_000,
      geometry: { shape: "rectangle", x: 0.05, y: 0.72, width: 0.9, height: 0.12, rotation: 0 },
      tracking: { mode: "none" },
      hiddenRender: { mode: "symbol", strength: 50, overlayText: "Community goal", icon: "◇" },
      revealType: "collective_reveal",
      pricing: { coin: "iCoin", amount: 100, allowCustomTip: true },
      eligibility: { revealAfterTotalTips: 100 },
      collectiveProgress: { current: 63, goal: 100 },
      unlockPolicy: { ...unlockDefault, duration: "permanent" },
      settlement,
      safety: {
        safetyClass: "normal",
        requiresSafetyScan: true,
        safetyStatus: "passed",
        ageGateRequired: false,
        monetizationAllowed: true,
        publishBlocked: false,
      },
      status: "active",
      createdAt: t,
      updatedAt: t,
    }),
    mk({
      id: "magic_minor_blocked",
      name: "Blocked Minor Sensitive",
      description: "Paid segment in minor-sensitive context — publish blocked",
      targetType: "region",
      timelineStartMs: 30_000,
      timelineEndMs: 34_000,
      geometry: { shape: "rectangle", x: 0.4, y: 0.22, width: 0.28, height: 0.24, rotation: 0 },
      tracking: { mode: "none" },
      hiddenRender: { mode: "blur", strength: 36, overlayText: "Blocked", icon: "⛔" },
      revealType: "pay_to_reveal",
      pricing: { coin: "iCoin", amount: 5, allowCustomTip: false },
      eligibility: {},
      unlockPolicy: unlockDefault,
      settlement,
      safety: {
        safetyClass: "minor_sensitive",
        requiresSafetyScan: true,
        safetyStatus: "blocked",
        ageGateRequired: true,
        monetizationAllowed: false,
        monetizationRestrictionReason: "Minor-sensitive: monetization blocked.",
        publishBlocked: true,
      },
      status: "blocked",
      createdAt: t,
      updatedAt: t,
    }),
  ];
}

const defaultMonetization: StudioMonetizationRule = {
  postKind: "earn_enabled",
  viewerEarnsOnWatch: true,
  viewerEarnsOnComplete: true,
  viewerEarnsOnUnlock: true,
  creatorEarnsPerVerifiedView: true,
  creatorEarnsPerUnlock: true,
  brandPaysPerVerifiedAction: false,
  minimumTipCoins: 1,
};

const defaultSubtitles: StudioSubtitle[] = [
  {
    id: "sub_en",
    language: "en-US",
    cues: [
      { id: "cue1", startMs: 0, endMs: 3200, text: "Hold attention — this is the programmable layer." },
      { id: "cue2", startMs: 3200, endMs: 9000, text: "Blur is control. Reveal is economics." },
      { id: "cue3", startMs: 9000, endMs: 14_000, text: "Tip / pay / watch / trust — all first-class." },
    ],
  },
];

/** Dense sample: 47s timeline, Magic reveals, CAF, captions, monetization, rights/safety. */
export function createMockStudioProject(): StudioProject {
  const t = ts();
  const projectId = "proj_studio_canonical_001";
  const aspectRatio: AspectRatio = "9:16";
  const durationMs = 47_000;

  const assets: StudioAsset[] = [
    {
      id: "asset_main_video",
      type: "video",
      name: "drop_teaser_47s.mp4",
      sourceUrl: "blob:mock-main-video",
      mimeType: "video/mp4",
      sizeBytes: 12_400_000,
      durationMs,
      width: 1080,
      height: 1920,
      status: "ready",
      createdAt: t,
    },
    {
      id: "asset_room_audio",
      type: "audio",
      name: "room_mix.aac",
      sourceUrl: "blob:mock-audio",
      mimeType: "audio/aac",
      sizeBytes: 820_000,
      durationMs: 47_000,
      status: "ready",
      createdAt: t,
    },
    {
      id: "asset_captions_en",
      type: "subtitle",
      name: "captions_en.vtt",
      sourceUrl: "blob:mock-captions",
      mimeType: "text/vtt",
      sizeBytes: 2100,
      status: "ready",
      createdAt: t,
    },
  ];

  const tracks: StudioTrack[] = [
    { id: "tr_main_video", projectId, type: "video", name: "Main Video", sortOrder: 0, locked: false, muted: false, visible: true },
    { id: "tr_audio", projectId, type: "audio", name: "Audio", sortOrder: 1, locked: false, muted: false, visible: true },
    { id: "tr_captions", projectId, type: "subtitle", name: "Captions", sortOrder: 2, locked: false, muted: false, visible: true },
    { id: "tr_text", projectId, type: "text", name: "Text", sortOrder: 3, locked: false, muted: false, visible: true },
    { id: "tr_effects", projectId, type: "effect", name: "Effects", sortOrder: 4, locked: false, muted: false, visible: true },
    { id: "tr_compliance", projectId, type: "compliance", name: "Compliance", sortOrder: 5, locked: false, muted: false, visible: true },
    { id: "tr_magic", projectId, type: "magic", name: "Magic Reveals", sortOrder: 6, locked: false, muted: false, visible: true },
  ];

  const clips: StudioClip[] = [
    {
      id: "clip_video_main",
      projectId,
      trackId: "tr_main_video",
      assetId: "asset_main_video",
      type: "video",
      name: "Main take",
      timelineStartMs: 0,
      timelineEndMs: durationMs,
      sourceStartMs: 0,
      sourceEndMs: durationMs,
      color: "#5eead4",
      locked: false,
      muted: false,
      visible: true,
      transform: {},
      effects: { filterId: "mint_lift", intensity: 0.55, playbackRate: 1 },
    },
    {
      id: "clip_audio_room",
      projectId,
      trackId: "tr_audio",
      assetId: "asset_room_audio",
      type: "audio",
      name: "Room tone",
      timelineStartMs: 0,
      timelineEndMs: 47_000,
      sourceStartMs: 0,
      sourceEndMs: 47_000,
      color: "#fbbf24",
      locked: false,
      muted: false,
      visible: true,
      transform: {},
      effects: { volume: 0.92 },
    },
    {
      id: "clip_caption_lane",
      projectId,
      trackId: "tr_captions",
      assetId: "asset_captions_en",
      type: "caption",
      name: "EN captions",
      timelineStartMs: 0,
      timelineEndMs: durationMs,
      sourceStartMs: 0,
      sourceEndMs: durationMs,
      color: "#a78bfa",
      locked: false,
      muted: false,
      visible: true,
      transform: {},
      effects: {},
    },
    {
      id: "clip_text_lower",
      projectId,
      trackId: "tr_text",
      type: "text",
      name: "TITLE · neon",
      timelineStartMs: 4000,
      timelineEndMs: 11_000,
      sourceStartMs: 0,
      sourceEndMs: 7000,
      color: "#bef264",
      locked: false,
      muted: false,
      visible: true,
      transform: { x: 0.08, y: 0.1 },
      effects: {},
    },
  ];

  const overlays: StudioTextOverlay[] = [
    {
      id: "ovr_beat",
      clipId: "clip_text_lower",
      text: "BEAT DROP",
      x: 0.1,
      y: 0.14,
      fontSize: 22,
      color: "#ecfccb",
      startMs: 8000,
      endMs: 14_000,
    },
  ];

  const cafSegments: StudioCAFSegment[] = [
    {
      id: "caf_privacy_plate",
      projectId,
      clipId: "clip_video_main",
      timelineStartMs: 3000,
      timelineEndMs: 7000,
      shape: "rectangle",
      x: 0.55,
      y: 0.62,
      width: 0.28,
      height: 0.1,
      rotation: 0,
      trackingMode: "static",
      blurStrength: 28,
      renderMode: "blur",
      accessType: "free",
      status: "active",
    },
  ];

  const magicReveals = buildMagicReveals(projectId);
  const base: StudioProject = {
    id: projectId,
    ownerUserId: MOCK_OWNER_ID,
    title: "studio_drop_magic_demo",
    status: "ready",
    mode: "hybrid",
    aspectRatio,
    durationMs,
    canvasWidth: 1080,
    canvasHeight: 1920,
    activeTool: "trim",
    selectedClipId: "clip_video_main",
    selectedTrackId: "tr_main_video",
    playheadMs: 12_400,
    isPlaying: false,
    zoom: 1,
    assets,
    tracks,
    clips,
    overlays,
    exportSettings: { ...EXPORT_DEFAULT },
    createdAt: t,
    updatedAt: t,
    magicReveals,
    cafSegments,
    monetization: { ...defaultMonetization },
    rightsReport: mockRightsReport(projectId),
    safetyReport: mockSafetyReportForEmptyProject(projectId),
    subtitles: defaultSubtitles.map((s) => ({ ...s, cues: s.cues.map((c) => ({ ...c })) })),
    exportJobs: [{ id: "exp_job_last", exportType: "feed_post", status: "completed", quality: "high" }],
    magicPanelTab: "reveal",
    selectedMagicRevealId: "magic_tip_3coin",
    magicTargetSelection: "region",
    previewUnlockSheetOpen: false,
    unlockPreviewScenario: "tip",
    caption: "",
    hashtags: [...MOCK_PUBLISH_HASHTAGS],
    visibility: "public",
    publishTarget: "i_feed",
    monetizationMode: "magic_unlocks",
    publishStatus: "idle",
    ageRating: "teen",
    disclosures: [],
    publishChecks: [],
  };
  base.safetyReport = mockSafetyReportFromProject(base);
  base.ageRating = base.safetyReport.ageRating;
  return ensurePublishDefaults(base);
}

/** Fresh upload timeline — empty Magic until creator adds reveals. */
/** Draft reveal for Magic panel — anchored to playhead (Stage 2 defaults). */
export function createDraftMagicReveal(projectId: string, ownerUserId: string, playheadMs: number): MagicReveal {
  const t = ts();
  const settlement = {
    creatorShareBps: 8200,
    platformFeeBps: 1200,
    viewerRewardBps: 400,
    pendingHoldSeconds: 86_400,
  };
  const start = Math.max(0, playheadMs);
  const end = start + 5000;
  return {
    id: `magic_${Date.now()}`,
    projectId,
    ownerUserId,
    name: "New Magic Reveal",
    description: "Describe what unlocks",
    targetType: "region",
    timelineStartMs: start,
    timelineEndMs: end,
    geometry: { shape: "rectangle", x: 0.25, y: 0.35, width: 0.5, height: 0.3, rotation: 0 },
    tracking: { mode: "none" },
    hiddenRender: { mode: "blur", strength: 20, overlayText: "Hidden", icon: "✦" },
    revealType: "free_tap_reveal",
    pricing: { coin: "iCoin", amount: 1, allowCustomTip: false },
    eligibility: {},
    unlockPolicy: { duration: "session", transferable: false, refundable: true },
    settlement,
    safety: {
      requiresSafetyScan: true,
      safetyStatus: "pending",
      safetyClass: "normal",
      ageGateRequired: false,
      monetizationAllowed: true,
      publishBlocked: false,
    },
    status: "draft",
    createdAt: t,
    updatedAt: t,
  };
}

export function studioExtensionDefaults(): Pick<
  StudioProject,
  | "magicReveals"
  | "cafSegments"
  | "monetization"
  | "rightsReport"
  | "safetyReport"
  | "subtitles"
  | "exportJobs"
  | "magicPanelTab"
  | "selectedMagicRevealId"
  | "magicTargetSelection"
  | "previewUnlockSheetOpen"
  | "unlockPreviewScenario"
  | "caption"
  | "hashtags"
  | "visibility"
  | "publishTarget"
  | "monetizationMode"
  | "publishStatus"
  | "ageRating"
  | "disclosures"
  | "publishChecks"
> {
  const draftId = "__draft_extension__";
  return {
    magicReveals: [],
    cafSegments: [],
    monetization: {
      postKind: "free",
      viewerEarnsOnWatch: false,
      viewerEarnsOnComplete: false,
      viewerEarnsOnUnlock: false,
      creatorEarnsPerVerifiedView: false,
      creatorEarnsPerUnlock: false,
      brandPaysPerVerifiedAction: false,
    },
    rightsReport: mockRightsReport(draftId),
    safetyReport: mockSafetyReportForEmptyProject(draftId),
    subtitles: [],
    exportJobs: [],
    magicPanelTab: "reveal",
    selectedMagicRevealId: undefined,
    magicTargetSelection: null,
    previewUnlockSheetOpen: false,
    unlockPreviewScenario: "free",
    caption: "",
    hashtags: [],
    visibility: "public",
    publishTarget: "i_feed",
    monetizationMode: "none",
    publishStatus: "idle",
    ageRating: "everyone",
    disclosures: [],
    publishChecks: [],
  };
}
