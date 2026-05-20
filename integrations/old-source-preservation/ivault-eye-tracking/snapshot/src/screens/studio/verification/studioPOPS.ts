import type { POPSChallenge, POPSMethod, VerificationGateResult } from "./studioVerificationTypes";

function id(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const PROMPTS: Record<POPSMethod, string> = {
  active_tap: "Tap the highlighted control to confirm you are present.",
  hold_gesture: "Press and hold for the required duration.",
  motion_presence: "Move the device slightly (mock motion).",
  camera_presence_mock: "Brief camera presence check (mock — no biometric storage).",
  audio_presence_mock: "Ambient presence check (mock — no raw audio stored).",
  location_presence: "Confirm you are within the campaign geofence (mock).",
  qr_presence: "Scan the campaign QR (mock).",
  nfc_presence: "Tap NFC tag (mock).",
  session_continuity: "Keep this session active while value accrues.",
  device_attestation_mock: "Device attestation (mock).",
};

export function createPOPSChallenge(
  method: POPSMethod,
  context?: { revealId?: string; campaignId?: string; viewerUserId?: string }
): POPSChallenge {
  const now = new Date().toISOString();
  const requiredWithinMs =
    method === "hold_gesture" ? 12_000 : method === "session_continuity" ? 120_000 : method === "location_presence" ? 20_000 : 8000;
  return {
    id: id("pops"),
    method,
    prompt: PROMPTS[method],
    status: "idle",
    requiredWithinMs,
    score: 0,
    createdAt: now,
    metadata: { ...(context ?? {}) },
  };
}

export type POPSEvaluateInput = {
  completedInMs: number;
  userActionQuality: number;
  locationMatch?: boolean;
  sessionContinuity?: boolean;
  cameraMockOk?: boolean;
  audioMockOk?: boolean;
};

export function evaluatePOPSChallenge(
  challenge: POPSChallenge,
  input: POPSEvaluateInput
): { challenge: POPSChallenge; gate: VerificationGateResult } {
  const now = new Date().toISOString();
  let passed = false;
  let score = 0;
  let message = "";

  switch (challenge.method) {
    case "active_tap":
      passed = input.completedInMs <= challenge.requiredWithinMs && input.userActionQuality >= 0.65;
      score = passed ? Math.min(1, input.userActionQuality) : input.userActionQuality * 0.4;
      message = passed ? "Tap verified within window" : "Tap too slow or low quality";
      break;
    case "hold_gesture":
      passed = input.completedInMs >= 1800 && input.completedInMs <= challenge.requiredWithinMs;
      score = passed ? 1 : 0.35;
      message = passed ? "Hold duration matched" : "Hold duration insufficient";
      break;
    case "session_continuity":
      passed = input.sessionContinuity !== false;
      score = passed ? 1 : 0.2;
      message = passed ? "Session continuity clean" : "Session continuity broken";
      break;
    case "location_presence":
      passed = input.locationMatch === true;
      score = passed ? 1 : 0.15;
      message = passed ? "Location matched (mock)" : "Location mismatch (mock)";
      break;
    case "camera_presence_mock":
    case "audio_presence_mock":
      passed = Boolean(challenge.method === "camera_presence_mock" ? input.cameraMockOk : input.audioMockOk);
      score = passed ? 0.9 : 0.1;
      message = passed ? "Mock presence signal OK" : "Mock presence signal failed";
      break;
    case "qr_presence":
    case "nfc_presence":
    case "device_attestation_mock":
    case "motion_presence":
      passed = input.userActionQuality >= 0.55;
      score = passed ? 0.85 : 0.25;
      message = passed ? "Proof signal accepted (mock)" : "Proof signal weak (mock)";
      break;
    default:
      passed = false;
      score = 0;
      message = "Unknown POPS method";
  }

  const next: POPSChallenge = {
    ...challenge,
    status: passed ? "passed" : "failed",
    completedInMs: input.completedInMs,
    score,
    completedAt: now,
  };

  const gate: VerificationGateResult = {
    id: id("gate_pops"),
    gateType: "pops",
    status: passed ? "passed" : "failed",
    score,
    threshold: 0.65,
    message,
    blocking: true,
    metadata: { challengeId: challenge.id, method: challenge.method },
    createdAt: now,
  };

  return { challenge: next, gate };
}

export type POPSContextSelect = {
  rewardAmount: number;
  riskScore: number;
  campaignFraudSensitivity: "low" | "medium" | "high";
  actionType: "view" | "unlock" | "campaign" | "payout";
  viewerTrustScore: number;
  campaignRequiresQr?: boolean;
  campaignRequiresGps?: boolean;
};

export function selectRequiredPOPS(ctx: POPSContextSelect): POPSMethod[] {
  if (ctx.campaignRequiresGps) return ["location_presence", "session_continuity"];
  if (ctx.campaignRequiresQr) return ["qr_presence", "session_continuity"];
  if (ctx.riskScore >= 75 || ctx.campaignFraudSensitivity === "high") {
    return ctx.rewardAmount > 0 ? ["active_tap", "session_continuity"] : ["active_tap"];
  }
  if (ctx.riskScore >= 50) {
    return ctx.rewardAmount > 15 ? ["active_tap"] : ["hold_gesture"];
  }
  if (ctx.rewardAmount > 40 || ctx.actionType === "payout") {
    return ["active_tap", "session_continuity"];
  }
  if (ctx.rewardAmount > 10 && ctx.viewerTrustScore < 55) {
    return ["active_tap"];
  }
  if (ctx.riskScore < 25 && ctx.rewardAmount < 5) {
    return [];
  }
  return ["session_continuity"];
}
