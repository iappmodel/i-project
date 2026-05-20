import { describe, expect, it } from "vitest";
import {
  POPS_VISUAL_ACTIVE_STATUS_COPY,
  POPS_VISUAL_PERMISSION_COPY,
  applyVisualPrivacyToReceipt,
} from "./pops-visual-privacy";

describe("pops-visual-privacy", () => {
  it("contains approved permission and active-status copy", () => {
    expect(POPS_VISUAL_PERMISSION_COPY.title).toBe("Verify this moment");
    expect(POPS_VISUAL_PERMISSION_COPY.enableButton).toBe("Enable presence verification");
    expect(POPS_VISUAL_PERMISSION_COPY.notNowButton).toBe("Not now");

    expect(POPS_VISUAL_ACTIVE_STATUS_COPY.signalActive).toBe("Presence signal active");
    expect(POPS_VISUAL_ACTIVE_STATUS_COPY.signalDegraded).toBe("Visual signal degraded");
    expect(POPS_VISUAL_ACTIVE_STATUS_COPY.keepSessionOpen).toBe("Keep the session open");
    expect(POPS_VISUAL_ACTIVE_STATUS_COPY.confidenceImproving).toBe("Moment confidence improving");
  });

  it("adds visual category and explicitly states raw frames were not stored by default", () => {
    const receipt = applyVisualPrivacyToReceipt(
      {
        signalCategoriesUsed: ["DEVICE", "INTERACTION"],
        rawDataTypesStored: ["TOUCH_EVENT"],
        userSummaryLines: ["Base receipt summary."],
      },
      { rawFrameStored: false },
    );

    expect(receipt.signalCategoriesUsed).toContain("VISUAL_PRESENCE");
    expect(receipt.rawDataTypesStored).not.toContain("RAW_CAMERA_FRAME");
    expect(receipt.userSummaryLines.join(" ")).toContain("Raw camera frames were not stored");
  });
});

