import type { PopsSessionPreview } from "./pops-session-preview.types";

export function getPopsPreviewStatus(input: {
  rewardProgressPct: number;
  fraudRiskPreview: number;
  isPaused: boolean;
  isBackgrounded: boolean;
}): string {
  if (input.fraudRiskPreview >= 0.5) {
    return "This moment may need review";
  }
  if (input.isPaused) {
    return "Verification paused";
  }
  if (input.isBackgrounded) {
    return "Keep the app open to verify";
  }
  if (input.rewardProgressPct >= 100) {
    return "Ready to verify";
  }
  if (input.rewardProgressPct >= 90) {
    return "Almost verified";
  }
  if (input.rewardProgressPct >= 10) {
    return "Moment confidence rising";
  }
  return "Moment confidence rising";
}

export function getPopsPreviewStatusFromPreview(preview: PopsSessionPreview): string {
  return getPopsPreviewStatus({
    rewardProgressPct: preview.rewardProgressPct,
    fraudRiskPreview: preview.fraudRiskPreview,
    isPaused: preview.state === "PAUSED",
    isBackgrounded: preview.state === "BACKGROUNDED",
  });
}
