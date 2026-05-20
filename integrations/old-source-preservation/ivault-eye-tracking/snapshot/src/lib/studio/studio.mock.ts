import type { StudioClip, StudioMark, StudioSession, StudioTimeline } from "./studio.types";

const now = () => new Date().toISOString();
const id = (p = "") => `${p}${Math.floor(Math.random() * 1e9).toString(36)}`;

export const mockClips: StudioClip[] = [
  {
    id: id("c1-"),
    sessionId: "s1",
    title: "Beach approach",
    durationSeconds: 32,
    type: "video",
    source: "camera",
    status: "raw",
    startOffsetSeconds: 0,
    endOffsetSeconds: 32,
    thumbnailGradient: "linear-gradient(135deg,#0f172a,#1e293b)",
    qualityScore: 78,
    highlightScore: 62,
    hasFace: true,
    hasVoice: false,
    hasMusic: false,
    isBlurry: false,
    isSilent: false,
    isMarked: false,
    tags: ["walking"],
  },
  {
    id: id("c2-"),
    sessionId: "s1",
    title: "Sunset closeup",
    durationSeconds: 12,
    type: "video",
    source: "camera",
    status: "raw",
    startOffsetSeconds: 0,
    endOffsetSeconds: 12,
    thumbnailGradient: "linear-gradient(135deg,#ff7a18,#af002d)",
    qualityScore: 92,
    highlightScore: 95,
    hasFace: true,
    hasVoice: false,
    hasMusic: false,
    isBlurry: false,
    isSilent: true,
    isMarked: true,
    tags: ["sunset"],
  },
];

export const mockMarks: StudioMark[] = [
  { id: id("m1-"), clipId: mockClips[0].id, timestampSeconds: 3.2, label: "sunset moment", source: "tap", confidence: 0.92 },
  { id: id("m2-"), clipId: mockClips[1].id, timestampSeconds: 8.5, label: "good reaction", source: "ai", confidence: 0.84 },
];

export const mockTimeline: StudioTimeline = {
  durationSeconds: 60,
  playheadSeconds: 0,
  layers: [
    { id: id("lv-"), type: "video", name: "Video", items: mockClips.map((c, i) => ({ id: id("ti-"), clipId: c.id, label: c.title, startSeconds: i * 6, durationSeconds: Math.min(20, c.durationSeconds) })) },
    { id: id("la-"), type: "audio", name: "Audio", items: [] },
    { id: id("lc-"), type: "caption", name: "Captions", items: [] },
  ],
};

export const mockSession: StudioSession = {
  id: "s1",
  title: "Miami Beach Walk",
  status: "draft",
  createdAt: now(),
  updatedAt: now(),
  aspectRatio: "9:16",
  targetDurationSeconds: 45,
  rawDurationSeconds: 41 * 60 + 12,
  estimatedFinalDurationSeconds: 45,
  storageUsedMb: 3400,
  recoverableStorageMb: 2800,
  clips: mockClips,
  timeline: mockTimeline,
  marks: mockMarks,
  commands: [],
  exportTargets: ["Feed", "Stories", "Campaign", "Draft", "Proof Vault"],
  proofStatus: { originalityFingerprint: "pending", custodyLog: "pending", deletionProtected: false },
};

