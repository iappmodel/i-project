import { POPS_PERMISSION_TYPE, type PopsPermissionType } from "./pops-permission.types";

export type PopsPermissionCopyEntry = {
  title: string;
  reason: string;
  declineImpact: string;
};

export const POPS_PERMISSION_COPY: Record<PopsPermissionType, PopsPermissionCopyEntry> = {
  [POPS_PERMISSION_TYPE.SCREEN_ACTIVITY]: {
    title: "Screen activity",
    reason: "Used to verify that the moment stayed active.",
    declineImpact: "Some rewards may not verify."
  },
  [POPS_PERMISSION_TYPE.CONTENT_PROGRESS]: {
    title: "Content progress",
    reason: "Used to confirm how much of the moment was completed.",
    declineImpact: "Watch rewards require this."
  },
  [POPS_PERMISSION_TYPE.TOUCH_BEHAVIOR]: {
    title: "Interaction signals",
    reason: "Used to understand deliberate actions like taps, saves, follows, and confirmations.",
    declineImpact: "Intent-based rewards may need another confirmation."
  },
  [POPS_PERMISSION_TYPE.DEVICE_MOTION]: {
    title: "Device motion",
    reason: "Used as a supporting signal that the device is naturally in use.",
    declineImpact: "Usually optional."
  },
  [POPS_PERMISSION_TYPE.VISUAL_PRESENCE]: {
    title: "Visual presence",
    reason:
      "Some higher-value rewards may use temporary visual presence signals to verify that a real person is participating.",
    declineImpact: "You may need another verification method, or this reward may not be available."
  },
  [POPS_PERMISSION_TYPE.AUDIO_FEATURES]: {
    title: "Audio environment",
    reason: "Some experiences may use local audio features to detect interruptions or audio-based participation.",
    declineImpact: "Most rewards do not require this."
  },
  [POPS_PERMISSION_TYPE.LOCATION_CLASS]: {
    title: "Location class",
    reason: "Used to verify broad context like whether you are at a participating place.",
    declineImpact: "Visit rewards may require this."
  },
  [POPS_PERMISSION_TYPE.PRECISE_LOCATION]: {
    title: "Precise location",
    reason: "Required only for specific real-world check-ins or merchant rewards.",
    declineImpact: "Location-based rewards will not be available."
  },
  [POPS_PERMISSION_TYPE.DEVICE_INTEGRITY]: {
    title: "Device integrity",
    reason: "Used to protect rewards from bots, emulators, and duplicate abuse.",
    declineImpact: "Rewards may be held for review."
  },
  [POPS_PERMISSION_TYPE.ACCOUNT_CONTINUITY]: {
    title: "Account continuity",
    reason: "Used to link this moment to a stable account session for payouts and high-value rewards.",
    declineImpact: "Wallet and payout flows may require another verification step."
  },
  [POPS_PERMISSION_TYPE.NOTIFICATIONS]: {
    title: "Notifications",
    reason: "Used only when a moment needs to explain timing or verification updates while you use other apps.",
    declineImpact: "You can still complete most moments; updates may be delayed until you return."
  },
  [POPS_PERMISSION_TYPE.BACKGROUND_SYNC]: {
    title: "Background sync",
    reason: "Used only when a moment safely finishes verification if the app is briefly in the background.",
    declineImpact: "You may need to keep the app open for the full moment."
  }
};

export function getPopsPermissionCopy(permissionType: PopsPermissionType): PopsPermissionCopyEntry {
  return POPS_PERMISSION_COPY[permissionType];
}
