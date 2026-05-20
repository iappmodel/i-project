import { type PopsVisualSignal } from "./pops-visual-presence.types";

export const POPS_VISUAL_PERMISSION_COPY = {
  title: "Verify this moment",
  body:
    "Some rewards require stronger presence verification. P.O.P.S can use temporary visual presence signals to confirm that a real person is participating. Raw camera frames are not stored by default.",
  enableButton: "Enable presence verification",
  notNowButton: "Not now",
} as const;

export const POPS_VISUAL_ACTIVE_STATUS_COPY = {
  signalActive: "Presence signal active",
  signalDegraded: "Visual signal degraded",
  keepSessionOpen: "Keep the session open",
  confidenceImproving: "Moment confidence improving",
} as const;

export type PopsPrivacyReceiptSummary = {
  signalCategoriesUsed: string[];
  rawDataTypesStored: string[];
  userSummaryLines: string[];
};

const VISUAL_PRESENCE_CATEGORY = "VISUAL_PRESENCE";
const RAW_CAMERA_FRAME_TYPE = "RAW_CAMERA_FRAME";

export function applyVisualPrivacyToReceipt(
  receipt: PopsPrivacyReceiptSummary,
  visualSignal: Pick<PopsVisualSignal, "rawFrameStored"> | undefined,
): PopsPrivacyReceiptSummary {
  const categories = new Set(receipt.signalCategoriesUsed);
  categories.add(VISUAL_PRESENCE_CATEGORY);

  const rawData = new Set(receipt.rawDataTypesStored);
  if (visualSignal?.rawFrameStored) {
    rawData.add(RAW_CAMERA_FRAME_TYPE);
  } else {
    rawData.delete(RAW_CAMERA_FRAME_TYPE);
  }

  const summary = receipt.userSummaryLines.filter(
    (line) =>
      !line.toLowerCase().includes("raw camera frames") &&
      !line.toLowerCase().includes("visual presence"),
  );
  summary.push("Visual presence signals were used for this verification moment.");
  summary.push(
    visualSignal?.rawFrameStored
      ? "Raw camera frames were stored for this moment."
      : "Raw camera frames were not stored for this moment.",
  );

  return {
    signalCategoriesUsed: Array.from(categories),
    rawDataTypesStored: Array.from(rawData),
    userSummaryLines: summary,
  };
}

