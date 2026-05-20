import type { PopsProofLevel } from "../types/pops.types";

export function getPopsProofLevelLabel(level: PopsProofLevel): string {
  switch (level) {
    case "LEVEL_0_NONE":
      return "No proof";
    case "LEVEL_1_SESSION":
      return "Session proof";
    case "LEVEL_2_ATTENTION":
      return "Verified attention";
    case "LEVEL_3_INTENT":
      return "Intent proof";
    case "LEVEL_4_IDENTITY_CONTINUITY":
      return "Continuity proof";
    case "LEVEL_5_HIGH_VALUE":
      return "High-value proof";
    default:
      return level;
  }
}

export function getPopsProofLevelDescription(level: PopsProofLevel): string {
  switch (level) {
    case "LEVEL_0_NONE":
      return "This moment does not require verification.";
    case "LEVEL_1_SESSION":
      return "Verifies that the app session was active.";
    case "LEVEL_2_ATTENTION":
      return "Verifies active content progress and session presence.";
    case "LEVEL_3_INTENT":
      return "Verifies deliberate action after engagement.";
    case "LEVEL_4_IDENTITY_CONTINUITY":
      return "Verifies stronger session and account continuity.";
    case "LEVEL_5_HIGH_VALUE":
      return "Requires stronger verification before release.";
    default:
      return "";
  }
}
