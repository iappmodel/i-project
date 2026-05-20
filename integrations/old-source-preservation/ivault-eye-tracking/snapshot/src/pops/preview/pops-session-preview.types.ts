import type { PopsReasonCode } from "../constants/pops-reason-codes";

export type PopsSessionPreviewState =
  | "NOT_STARTED"
  | "ACTIVE"
  | "PAUSED"
  | "BACKGROUNDED"
  | "FRAUD_PREVIEW_HIGH"
  | "PREVIEW";

export interface PopsSessionPreview {
  sessionId: string;
  progressPct: number;
  elapsedMs: number;
  activeMs: number;
  presencePreview: number;
  attentionPreview: number;
  fraudRiskPreview: number;
  rewardProgressPct: number;
  state: PopsSessionPreviewState;
  userVisibleStatus: string;
  reasonCodes: PopsReasonCode[];
  /** Marks UI-only preview; not a persisted judgment. */
  isPreview: true;
}
