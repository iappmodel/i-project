import type {
  RemoteCommandCategory,
  RemoteCommandDefinition,
  RemoteCommandType,
  RemoteSurface,
} from "./types";

const DEFINITIONS: RemoteCommandDefinition[] = [
  // navigation
  {
    type: "GO_HOME",
    label: "Home",
    description: "Return to the main feed.",
    category: "navigation",
    riskLevel: "LOW",
  },
  {
    type: "GO_BACK",
    label: "Back",
    category: "navigation",
    riskLevel: "LOW",
  },
  {
    type: "OPEN_SEARCH",
    label: "Search",
    category: "navigation",
    riskLevel: "LOW",
  },
  {
    type: "OPEN_PROFILE",
    label: "Profile",
    category: "navigation",
    riskLevel: "LOW",
  },
  {
    type: "OPEN_STUDIO",
    label: "Studio",
    category: "navigation",
    riskLevel: "LOW",
    surfaces: ["feed", "immersive_feed", "watch", "unknown"],
  },
  // content
  {
    type: "REVEAL_METADATA",
    label: "Reveal metadata",
    category: "content",
    riskLevel: "LOW",
    surfaces: ["feed", "immersive_feed", "watch"],
  },
  {
    type: "SAVE_ITEM",
    label: "Save",
    category: "content",
    riskLevel: "LOW",
  },
  {
    type: "SHARE_ITEM",
    label: "Share",
    category: "content",
    riskLevel: "MEDIUM",
  },
  {
    type: "REPORT_CONTENT",
    label: "Report",
    category: "content",
    riskLevel: "MEDIUM",
  },
  {
    type: "START_WATCH",
    label: "Start watch",
    category: "content",
    riskLevel: "LOW",
    surfaces: ["feed", "immersive_feed"],
  },
  {
    type: "HIDE_METADATA",
    label: "Hide metadata",
    category: "content",
    riskLevel: "LOW",
  },
  {
    type: "LIKE_CONTENT",
    label: "Like",
    category: "content",
    riskLevel: "LOW",
  },
  {
    type: "SAVE_CONTENT",
    label: "Save",
    category: "content",
    riskLevel: "LOW",
  },
  {
    type: "PLAY_PREVIEW",
    label: "Play preview",
    category: "content",
    riskLevel: "LOW",
    surfaces: ["studio", "campaign_builder"],
  },
  {
    type: "PAUSE_PREVIEW",
    label: "Pause preview",
    category: "content",
    riskLevel: "LOW",
    surfaces: ["studio", "campaign_builder"],
  },
  // earn / verification
  {
    type: "START_VERIFICATION",
    label: "Start verification",
    category: "earn",
    riskLevel: "MEDIUM",
    surfaces: ["verification", "earn", "pending"],
  },
  {
    type: "SUBMIT_PROOF",
    label: "Submit proof",
    category: "earn",
    riskLevel: "HIGH",
    surfaces: ["verification"],
  },
  {
    type: "CLAIM_REWARD",
    label: "Claim reward",
    category: "earn",
    riskLevel: "MEDIUM",
    surfaces: ["earn", "pending"],
  },
  {
    type: "OPEN_OFFER",
    label: "Open offer",
    category: "earn",
    riskLevel: "LOW",
    surfaces: ["earn"],
  },
  {
    type: "GO_EARN",
    label: "Go earn",
    category: "earn",
    riskLevel: "LOW",
  },
  {
    type: "VIEW_REQUIREMENTS",
    label: "View requirements",
    category: "earn",
    riskLevel: "LOW",
    surfaces: ["verification", "earn"],
  },
  {
    type: "RELEASE_REWARD",
    label: "Release reward",
    category: "earn",
    riskLevel: "HIGH",
    surfaces: ["verification"],
  },
  // wallet
  {
    type: "OPEN_PENDING",
    label: "Open pending",
    category: "wallet",
    riskLevel: "LOW",
    surfaces: ["wallet", "pending"],
  },
  {
    type: "OPEN_WALLET",
    label: "Open wallet",
    category: "wallet",
    riskLevel: "LOW",
  },
  {
    type: "PAY",
    label: "Pay",
    category: "wallet",
    riskLevel: "HIGH",
    surfaces: ["pay", "wallet"],
  },
  {
    type: "TIP",
    label: "Tip",
    category: "wallet",
    riskLevel: "HIGH",
    surfaces: ["tip", "watch", "feed"],
  },
  {
    type: "WITHDRAW",
    label: "Withdraw",
    category: "wallet",
    riskLevel: "HIGH",
    surfaces: ["withdraw", "wallet"],
  },
  {
    type: "CONVERT_COINS",
    label: "Convert coins",
    category: "wallet",
    riskLevel: "HIGH",
    surfaces: ["convert", "wallet"],
  },
  // creator
  {
    type: "OPEN_DRAFT",
    label: "Open draft",
    category: "creator",
    riskLevel: "LOW",
    surfaces: ["studio"],
  },
  {
    type: "PUBLISH_POST",
    label: "Publish post",
    category: "creator",
    riskLevel: "MEDIUM",
    surfaces: ["studio"],
  },
  {
    type: "EXPORT_MEDIA",
    label: "Export media",
    category: "creator",
    riskLevel: "MEDIUM",
    surfaces: ["studio"],
  },
  {
    type: "UNDO_EDIT",
    label: "Undo",
    category: "creator",
    riskLevel: "LOW",
    surfaces: ["studio", "campaign_builder"],
  },
  {
    type: "REDO_EDIT",
    label: "Redo",
    category: "creator",
    riskLevel: "LOW",
    surfaces: ["studio", "campaign_builder"],
  },
  // campaign
  {
    type: "OPEN_CAMPAIGN_BUILDER",
    label: "Campaign builder",
    category: "campaign",
    riskLevel: "LOW",
    surfaces: ["campaign_builder", "studio", "feed"],
  },
  {
    type: "PUBLISH_CAMPAIGN",
    label: "Publish campaign",
    category: "campaign",
    riskLevel: "HIGH",
    surfaces: ["campaign_builder"],
  },
  // connector
  {
    type: "CONNECT_PLATFORM",
    label: "Connect platform",
    category: "connector",
    riskLevel: "MEDIUM",
    surfaces: ["connect_platforms", "profile"],
  },
  {
    type: "DISCONNECT_PLATFORM",
    label: "Disconnect platform",
    category: "connector",
    riskLevel: "MEDIUM",
    surfaces: ["connect_platforms", "profile"],
  },
  {
    type: "OPEN_CONNECTORS",
    label: "Open connectors",
    category: "connector",
    riskLevel: "LOW",
    surfaces: ["connect_platforms", "profile"],
  },
  // presenter
  {
    type: "NEXT_ITEM",
    label: "Next item",
    category: "presenter",
    riskLevel: "LOW",
    surfaces: ["presenter", "igo"],
  },
  {
    type: "PREVIOUS_ITEM",
    label: "Previous item",
    category: "presenter",
    riskLevel: "LOW",
    surfaces: ["presenter", "igo"],
  },
  {
    type: "NEXT_SLIDE",
    label: "Next slide",
    category: "presenter",
    riskLevel: "LOW",
    surfaces: ["presenter"],
  },
  {
    type: "PREV_SLIDE",
    label: "Previous slide",
    category: "presenter",
    riskLevel: "LOW",
    surfaces: ["presenter"],
  },
  {
    type: "TOGGLE_POINTER",
    label: "Toggle pointer",
    category: "presenter",
    riskLevel: "LOW",
    surfaces: ["presenter"],
  },
  // safety
  {
    type: "PAUSE_SESSION",
    label: "Pause session",
    category: "safety",
    riskLevel: "MEDIUM",
  },
  {
    type: "REVOKE_DEVICE",
    label: "Revoke device",
    category: "safety",
    riskLevel: "HIGH",
  },
  {
    type: "CANCEL_ACTION",
    label: "Cancel action",
    category: "safety",
    riskLevel: "LOW",
  },
  {
    type: "EMERGENCY_STOP",
    label: "Emergency stop",
    category: "safety",
    riskLevel: "HIGH",
  },
  // system
  {
    type: "OPEN_COMMAND_CENTER",
    label: "Command center",
    category: "system",
    riskLevel: "LOW",
  },
  {
    type: "OPEN_SETTINGS",
    label: "Settings",
    category: "system",
    riskLevel: "LOW",
  },
  {
    type: "OPEN_REMOTE_SETTINGS",
    label: "Remote settings",
    category: "system",
    riskLevel: "LOW",
  },
  {
    type: "TOGGLE_REDUCED_MOTION",
    label: "Reduced motion",
    category: "system",
    riskLevel: "LOW",
  },
];

function matchesSurface(def: RemoteCommandDefinition, surface: RemoteSurface): boolean {
  if (!def.surfaces || def.surfaces.length === 0) {
    return true;
  }

  return def.surfaces.includes(surface);
}

export function getRemoteCommandsForSurface(surface: RemoteSurface): RemoteCommandDefinition[] {
  return DEFINITIONS.filter((def) => matchesSurface(def, surface));
}

export function getRemoteCommandsByCategory(
  surface: RemoteSurface,
  category: RemoteCommandCategory
): RemoteCommandDefinition[] {
  return getRemoteCommandsForSurface(surface).filter((def) => def.category === category);
}

export const REMOTE_COMMANDS: readonly RemoteCommandDefinition[] = DEFINITIONS;

export function getRemoteCommandDefinition(
  type: RemoteCommandType
): RemoteCommandDefinition | undefined {
  return DEFINITIONS.find((d) => d.type === type);
}

export function isRemoteCommandAvailableOnSurface(
  surface: RemoteSurface,
  type: RemoteCommandType
): boolean {
  const def = getRemoteCommandDefinition(type);
  if (!def) return false;
  return matchesSurface(def, surface);
}
