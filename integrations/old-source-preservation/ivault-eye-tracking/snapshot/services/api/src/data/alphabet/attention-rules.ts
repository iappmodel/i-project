import type { AttentionRuleSet } from "../../types/alphabet/attention.types";

export const ATTENTION_RULES: AttentionRuleSet[] = [
  {
    context: "campaign",
    minWatchedRatio: 0.85,
    minVisibilityPercent: 0.8,
    minForegroundPercent: 0.85,
    minFocusStabilityScore: 0.55,
    minDeviceIntegrityScore: 0.7,
    maxRiskScore: 0.55,
    allowMuted: true,
    allowSkipped: false,
    allowReplayLoop: false,
    under13Allowed: false,
    teenAllowed: true,
    active: true
  },
  {
    context: "learning",
    minWatchedRatio: 0.75,
    minVisibilityPercent: 0.75,
    minForegroundPercent: 0.8,
    minFocusStabilityScore: 0.6,
    minDeviceIntegrityScore: 0.65,
    maxRiskScore: 0.5,
    allowMuted: false,
    allowSkipped: false,
    allowReplayLoop: false,
    under13Allowed: true,
    teenAllowed: true,
    active: true
  },
  {
    context: "creator_content",
    minWatchedRatio: 0.7,
    minVisibilityPercent: 0.7,
    minForegroundPercent: 0.75,
    minFocusStabilityScore: 0.45,
    minDeviceIntegrityScore: 0.6,
    maxRiskScore: 0.6,
    allowMuted: true,
    allowSkipped: true,
    allowReplayLoop: false,
    under13Allowed: true,
    teenAllowed: true,
    active: true
  },
  {
    context: "feed",
    minWatchedRatio: 0.65,
    minVisibilityPercent: 0.7,
    minForegroundPercent: 0.75,
    minFocusStabilityScore: 0.4,
    minDeviceIntegrityScore: 0.6,
    maxRiskScore: 0.65,
    allowMuted: true,
    allowSkipped: true,
    allowReplayLoop: false,
    under13Allowed: true,
    teenAllowed: true,
    active: true
  },
  {
    context: "igo",
    minWatchedRatio: 0.8,
    minVisibilityPercent: 0.8,
    minForegroundPercent: 0.85,
    minFocusStabilityScore: 0.5,
    minDeviceIntegrityScore: 0.7,
    maxRiskScore: 0.5,
    allowMuted: true,
    allowSkipped: false,
    allowReplayLoop: false,
    under13Allowed: false,
    teenAllowed: true,
    active: true
  }
];
