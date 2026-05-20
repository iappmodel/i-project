import { describe, expect, it } from "vitest";
import {
  POPS_COPY_BANK,
  POPS_COPY_STATE,
  POPS_UI_FORBIDDEN_WORDS,
  getPopsCopy,
} from "./pops-copy-bank";

describe("pops-copy-bank", () => {
  it("includes all requested states in the copy bank", () => {
    const requiredStates = [
      POPS_COPY_STATE.SESSION_START,
      POPS_COPY_STATE.ATTENTION_PROGRESS,
      POPS_COPY_STATE.VERIFIED,
      POPS_COPY_STATE.PENDING,
      POPS_COPY_STATE.PARTIAL,
      POPS_COPY_STATE.HELD,
      POPS_COPY_STATE.DENIED,
      POPS_COPY_STATE.DEGRADED,
      POPS_COPY_STATE.FALLBACK,
      POPS_COPY_STATE.PERMISSION,
      POPS_COPY_STATE.PRIVACY_RECEIPT,
      POPS_COPY_STATE.WALLET_SENSITIVE_ACTION,
      POPS_COPY_STATE.ADMIN_INTERNAL,
      POPS_COPY_STATE.BRAND,
      POPS_COPY_STATE.CREATOR,
    ] as const;

    for (const state of requiredStates) {
      expect(POPS_COPY_BANK[state]).toBeDefined();
      expect(POPS_COPY_BANK[state].lines.length).toBeGreaterThan(0);
    }
  });

  it("returns indexed copy variants and wraps index safely", () => {
    const fallback = getPopsCopy(POPS_COPY_STATE.FALLBACK, { lineIndex: 4 });
    expect(fallback.line).toBe("Tap to confirm you’re still here.");
    expect(fallback.lines).toHaveLength(3);
    expect(fallback.audience).toBe("user");
  });

  it("keeps forbidden user-ui words out of user-facing copy", () => {
    const userCopyLines = Object.values(POPS_COPY_BANK)
      .filter((entry) => entry.audience === "user")
      .flatMap((entry) => entry.lines.map((line) => line.toLowerCase()));

    for (const forbiddenWord of POPS_UI_FORBIDDEN_WORDS) {
      for (const line of userCopyLines) {
        expect(line).not.toContain(forbiddenWord);
      }
    }
  });

  it("includes explicit admin/internal risk terms in internal copy", () => {
    expect(POPS_COPY_BANK[POPS_COPY_STATE.ADMIN_INTERNAL].audience).toBe("admin");
    expect(POPS_COPY_BANK[POPS_COPY_STATE.ADMIN_INTERNAL].lines).toEqual(
      expect.arrayContaining([
        "High fraud risk.",
        "Manual review required.",
        "Duplicate reward attempt.",
        "Device integrity warning.",
        "Background progress detected.",
      ]),
    );
  });
});
