export type RemoteSurface =
  | "feed"
  | "immersive_feed"
  | "watch"
  | "verification"
  | "wallet"
  | "earn"
  | "pending"
  | "pay"
  | "withdraw"
  | "convert"
  | "tip"
  | "studio"
  | "campaign_builder"
  | "connect_platforms"
  | "igo"
  | "profile"
  | "presenter"
  | "unknown";

export type RemoteMode =
  | "collapsed"
  | "quick"
  | "expanded"
  | "command_center"
  | "settings"
  | "locked"
  | "disabled";

export type RemoteInputSource =
  | "touch"
  | "keyboard"
  | "voice"
  | "gaze"
  | "gesture"
  | "controller"
  | "presenter"
  | "system";

export type RemoteRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "BLOCKED";

export type RemoteVisualState =
  | "idle"
  | "earning"
  | "pending"
  | "danger"
  | "listening"
  | "verifying"
  | "locked"
  | "disabled";

/** Visual palette for `RemoteOrb`; same union as `RemoteVisualState`. */
export type RemoteOrbVisualState = RemoteVisualState;

export type RemoteAnchor =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "custom";

/** Alias for anchor naming used by remote UI positioning. */
export type RemotePositionAnchor = RemoteAnchor;

export interface RemotePosition {
  x: number;
  y: number;
  anchor: RemoteAnchor;
}

export type RemoteActiveContext = Record<string, unknown>;

export interface RemoteSafetySnapshot {
  riskLevel: RemoteRiskLevel;
  requiresConfirmation: boolean;
  reason?: string;
}

/** Alias for safety snapshot (provider / control state). */
export type RemoteSafetyState = RemoteSafetySnapshot;

export interface RemoteControlState {
  mode: RemoteMode;
  surface: RemoteSurface;
  inputSource: RemoteInputSource;
  visualState: RemoteVisualState;
  activeContext: RemoteActiveContext;
  isDragging: boolean;
  isListening: boolean;
  isGazeEnabled: boolean;
  isVoiceEnabled: boolean;
  isLocked: boolean;
  lastCommandAt?: string;
  lastCommandType?: RemoteCommandType;
  position: RemotePosition;
  safety: RemoteSafetySnapshot;
}

export type RemoteCommandType = string;

export type RemoteCommandCategory =
  | "navigation"
  | "content"
  | "earn"
  | "wallet"
  | "creator"
  | "campaign"
  | "connector"
  | "presenter"
  | "safety"
  | "system";

export interface RemoteCommandDefinition {
  type: RemoteCommandType;
  label: string;
  description?: string;
  category: RemoteCommandCategory;
  riskLevel: RemoteRiskLevel;
  /** When set, command only appears on these surfaces; otherwise all surfaces. */
  surfaces?: RemoteSurface[];
}

export interface RemoteCommand {
  id: string;
  type: RemoteCommandType;
  label: string;
  description?: string;
  surface: RemoteSurface;
  riskLevel: RemoteRiskLevel;
  inputSource: RemoteInputSource;
  payload?: Record<string, unknown>;
  requiresConfirmation?: boolean;
  requiresBiometric?: boolean;
  requiresKyc?: boolean;
  requiresAdult?: boolean;
  trustTierRequired?: number;
  disabledReason?: string;
}

export type RemoteCommandHandler = (
  command: RemoteCommand
) => void | Promise<void>;

export type RemoteCommandHandlerMap = Partial<
  Record<RemoteCommandType, RemoteCommandHandler>
>;

export type RemoteRouteStatus =
  | "executed"
  | "blocked"
  | "confirmation_required"
  | "rate_limited"
  | "ignored";

/** Lifecycle status for remote command → event bus (see remoteEvents.mapCommandStatusToEventType). */
export type RemoteCommandStatus =
  | "requested"
  | "confirmation_required"
  | "confirmed"
  | "cancelled"
  | "executed"
  | "blocked"
  | "rate_limited"
  | "failed"
  | "ignored";

export interface RemoteRouteResult {
  status: RemoteRouteStatus;
  reason?: string;
  confirmationCopy?: string;
  /** Present when the router should support logging without a separate command arg. */
  command?: RemoteCommand;
}

export interface RemoteCommandLogItem {
  id: string;
  commandType: RemoteCommandType;
  /** Human label when the routed command is known; otherwise derive from `commandType`. */
  label?: string;
  status: RemoteRouteStatus;
  at: string;
  reason?: string;
}

export interface RemotePreferences {
  defaultPosition: RemotePosition;
  size: "small" | "medium" | "large";
  opacity: number;
  hapticsEnabled: boolean;
  voiceEnabled: boolean;
  gazeEnabled: boolean;
  reducedMotion: boolean;
  strictConfirmations: boolean;
  leftHanded: boolean;
}

export interface RemoteUserPolicyContext {
  ageGroup: "minor" | "adult";
  kycVerified: boolean;
  trustTier: number;
  walletLocked: boolean;
  fraudHoldActive: boolean;
  campaignBudgetAvailable: boolean;
  canPublishCampaign: boolean;
  canWithdraw: boolean;
  canPay: boolean;
  canTip: boolean;
}

/** Result of policy evaluation before routing / execution. */
export interface RemotePermissionResult {
  allowed: boolean;
  reason?: string;
  requiresConfirmation: boolean;
}

export interface RemoteProviderValue {
  remoteState: RemoteControlState;
  commandLog: RemoteCommandLogItem[];
  pendingCommand: RemoteCommand | null;
  preferences: RemotePreferences;

  setRemoteSurface: (
    surface: RemoteSurface,
    activeContext?: RemoteActiveContext
  ) => void;
  setRemoteMode: (mode: RemoteMode) => void;
  setRemotePosition: (position: RemotePosition) => void;

  openRemote: () => void;
  closeRemote: () => void;
  openCommandCenter: () => void;
  openSettings: () => void;

  lockRemote: () => void;
  unlockRemote: () => void;
  emergencyStop: () => void;

  dispatchRemoteCommand: (
    type: RemoteCommandType,
    payload?: Record<string, unknown>,
    inputSource?: RemoteInputSource
  ) => Promise<RemoteRouteResult>;

  confirmPendingCommand: () => Promise<RemoteRouteResult | null>;
  cancelPendingCommand: () => void;

  registerRemoteHandlers: (handlers: RemoteCommandHandlerMap) => void;
  updatePreferences: (patch: Partial<RemotePreferences>) => void;
}
