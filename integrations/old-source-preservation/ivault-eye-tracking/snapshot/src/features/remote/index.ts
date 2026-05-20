export { RemoteProvider } from "./RemoteProvider";
export type { RemoteProviderProps } from "./RemoteProvider";

export { useRemote } from "./useRemote";

export { RemoteOrb } from "./RemoteOrb";
export { RemoteQuickPanel } from "./RemoteQuickPanel";
export { RemoteCommandCenter } from "./RemoteCommandCenter";
export { RemoteSettingsSheet } from "./RemoteSettingsSheet";
export { RemoteSurfaceBoundary } from "./RemoteSurfaceBoundary";

export { useRegisterRemoteHandlers } from "./useRegisterRemoteHandlers";
export type { RemoteHandlerApi } from "./useRegisterRemoteHandlers";

export {
  REMOTE_COMMANDS,
  getRemoteCommandDefinition,
  getRemoteCommandsForSurface,
  getRemoteCommandsByCategory,
  isRemoteCommandAvailableOnSurface,
} from "./remoteCommands";

export {
  DEFAULT_REMOTE_POLICY_CONTEXT,
  evaluateRemotePermission,
  getRemoteRiskLevelForInput,
  buildConfirmationCopy,
  isMoneyCommand,
  isCampaignSpendCommand,
  isConnectorMutationCommand,
} from "./remotePolicy";

export {
  createRemoteCommand,
  routeRemoteCommand,
  executeRemoteCommand,
  confirmRemoteCommand,
  commandResultToLogItem,
  buildRemoteCommandLogItem,
  clearRemoteRateLimitMemory,
} from "./remoteRouter";

export {
  emitRemoteEvent,
  subscribeToRemoteEvents,
  emitRemoteOpened,
  emitRemoteClosed,
  emitRemoteMoved,
  emitRemoteModeChanged,
  emitRemoteSurfaceChanged,
  emitRemoteLocked,
  emitRemoteUnlocked,
  emitRemoteEmergencyStop,
  emitRemoteCommandEvent,
  emitRemoteSettingsUpdated,
  emitVoiceStarted,
  emitVoiceStopped,
  emitGazeStarted,
  emitGazeStopped,
} from "./remoteEvents";

export type {
  RemoteSurface,
  RemoteMode,
  RemoteInputSource,
  RemoteRiskLevel,
  RemoteCommandStatus,
  RemoteOrbVisualState,
  RemotePositionAnchor,
  RemoteCommandCategory,
  RemoteCommandType,
  RemotePosition,
  RemoteSafetyState,
  RemoteActiveContext,
  RemoteControlState,
  RemoteCommand,
  RemoteCommandDefinition,
  RemoteCommandLogItem,
  RemoteUserPolicyContext,
  RemotePermissionResult,
  RemoteRouteResult,
  RemoteCommandHandler,
  RemoteCommandHandlerMap,
  RemotePreferences,
  RemoteProviderValue,
} from "./types";
