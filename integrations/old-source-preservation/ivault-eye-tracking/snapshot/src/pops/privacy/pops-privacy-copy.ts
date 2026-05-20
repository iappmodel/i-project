import type { PopsRewardDecisionStatus } from "../types/pops-decisions.types";
import {
  POPS_DENIED_PRIVACY_SUMMARY,
  POPS_HELD_PRIVACY_SUMMARY,
  POPS_PRIVACY_RECEIPT_DEFAULT_SUMMARY,
} from "../constants/pops.constants";

export const POPS_PRIVACY_RECEIPT_SUMMARY = POPS_PRIVACY_RECEIPT_DEFAULT_SUMMARY;

export function getPopsPrivacySummary(decisionStatus: PopsRewardDecisionStatus): string {
  if (decisionStatus === "APPROVED_FULL" || decisionStatus === "APPROVED_PARTIAL") {
    return POPS_PRIVACY_RECEIPT_DEFAULT_SUMMARY;
  }
  if (decisionStatus === "HELD") {
    return POPS_HELD_PRIVACY_SUMMARY;
  }
  return POPS_DENIED_PRIVACY_SUMMARY;
}
