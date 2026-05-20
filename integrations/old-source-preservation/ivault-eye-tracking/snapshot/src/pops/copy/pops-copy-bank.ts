export const POPS_COPY_STATE = {
  SESSION_START: "SESSION_START",
  ATTENTION_PROGRESS: "ATTENTION_PROGRESS",
  VERIFIED: "VERIFIED",
  PENDING: "PENDING",
  PARTIAL: "PARTIAL",
  HELD: "HELD",
  DENIED: "DENIED",
  DEGRADED: "DEGRADED",
  FALLBACK: "FALLBACK",
  PERMISSION: "PERMISSION",
  PRIVACY_RECEIPT: "PRIVACY_RECEIPT",
  WALLET_SENSITIVE_ACTION: "WALLET_SENSITIVE_ACTION",
  ADMIN_INTERNAL: "ADMIN_INTERNAL",
  BRAND: "BRAND",
  CREATOR: "CREATOR",
} as const;

export type PopsCopyState = (typeof POPS_COPY_STATE)[keyof typeof POPS_COPY_STATE];

export type PopsCopyAudience = "user" | "admin";

export type PopsCopyEntry = {
  audience: PopsCopyAudience;
  lines: readonly string[];
};

export type PopsCopyContext = {
  lineIndex?: number;
};

export type PopsCopySelection = {
  state: PopsCopyState;
  audience: PopsCopyAudience;
  line: string;
  lines: readonly string[];
};

export const POPS_UI_FORBIDDEN_WORDS = [
  "surveillance",
  "watching you",
  "eye tracking",
  "face tracking",
  "suspicious",
  "fraud detected",
  "biometric scan",
  "emotional analysis",
  "monitored",
  "controlled",
] as const;

export const POPS_INTERNAL_ALLOWED_WORDS = [
  "fraud risk",
  "device integrity",
  "spoof risk",
  "automation risk",
  "duplicate reward",
  "anomaly",
] as const;

export const POPS_COPY_BANK: Record<PopsCopyState, PopsCopyEntry> = {
  [POPS_COPY_STATE.SESSION_START]: {
    audience: "user",
    lines: [
      "P.O.P.S is verifying this moment.",
      "Presence forming.",
      "Keep the moment active.",
    ],
  },
  [POPS_COPY_STATE.ATTENTION_PROGRESS]: {
    audience: "user",
    lines: [
      "Moment confidence rising.",
      "Attention quality building.",
      "Stay with the moment to complete verification.",
    ],
  },
  [POPS_COPY_STATE.VERIFIED]: {
    audience: "user",
    lines: [
      "Moment verified.",
      "The humane factor was validated.",
      "Reward pending wallet release.",
    ],
  },
  [POPS_COPY_STATE.PENDING]: {
    audience: "user",
    lines: [
      "Reward pending.",
      "Verification complete. Wallet release pending.",
      "This reward will become available after review rules clear.",
    ],
  },
  [POPS_COPY_STATE.PARTIAL]: {
    audience: "user",
    lines: [
      "Partial moment verified.",
      "A reduced reward may apply.",
      "Some requirements were completed.",
    ],
  },
  [POPS_COPY_STATE.HELD]: {
    audience: "user",
    lines: [
      "Reward under review.",
      "This moment needs additional verification.",
      "The reward is held until review is complete.",
    ],
  },
  [POPS_COPY_STATE.DENIED]: {
    audience: "user",
    lines: [
      "Moment not verified.",
      "This session did not meet the offer requirements.",
      "No reward was issued for this moment.",
    ],
  },
  [POPS_COPY_STATE.DEGRADED]: {
    audience: "user",
    lines: [
      "Signal degraded.",
      "P.O.P.S needs a stronger signal to verify this moment.",
      "Keep the app open or try another verification method.",
    ],
  },
  [POPS_COPY_STATE.FALLBACK]: {
    audience: "user",
    lines: [
      "Another verification path is available.",
      "Tap to confirm you’re still here.",
      "Keep watching a little longer.",
    ],
  },
  [POPS_COPY_STATE.PERMISSION]: {
    audience: "user",
    lines: [
      "Some rewards require stronger verification.",
      "You can continue without this, but some rewards may not be available.",
      "Raw camera and audio are not stored by default.",
    ],
  },
  [POPS_COPY_STATE.PRIVACY_RECEIPT]: {
    audience: "user",
    lines: [
      "Verification receipt.",
      "Signal categories used.",
      "Raw data stored.",
      "Local processing.",
      "Retention policy.",
    ],
  },
  [POPS_COPY_STATE.WALLET_SENSITIVE_ACTION]: {
    audience: "user",
    lines: [
      "Confirm this wallet action.",
      "P.O.P.S is verifying this action.",
      "Extra confirmation required.",
      "Withdrawal under review.",
    ],
  },
  [POPS_COPY_STATE.ADMIN_INTERNAL]: {
    audience: "admin",
    lines: [
      "High fraud risk.",
      "Manual review required.",
      "Duplicate reward attempt.",
      "Device integrity warning.",
      "Background progress detected.",
    ],
  },
  [POPS_COPY_STATE.BRAND]: {
    audience: "user",
    lines: [
      "Verified human moments.",
      "Cost per verified moment.",
      "Fraud prevented.",
      "Intent proof.",
    ],
  },
  [POPS_COPY_STATE.CREATOR]: {
    audience: "user",
    lines: [
      "Verified attention quality.",
      "Human sessions confirmed.",
      "Reward approval rate.",
      "Audience quality.",
    ],
  },
};

export function getPopsCopy(state: PopsCopyState, context: PopsCopyContext = {}): PopsCopySelection {
  const entry = POPS_COPY_BANK[state];
  const safeIndex = Math.max(0, context.lineIndex ?? 0) % entry.lines.length;
  return {
    state,
    audience: entry.audience,
    line: entry.lines[safeIndex],
    lines: entry.lines,
  };
}
