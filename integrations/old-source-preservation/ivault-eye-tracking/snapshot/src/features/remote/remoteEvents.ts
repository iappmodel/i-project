import type {
  RemoteCommand,
  RemoteCommandStatus,
  RemoteCommandType,
  RemoteInputSource,
  RemoteMode,
  RemotePosition,
  RemoteSurface,
} from "./types";

export type RemoteEventType =
  | "remote.opened"
  | "remote.closed"
  | "remote.moved"
  | "remote.locked"
  | "remote.unlocked"
  | "remote.mode_changed"
  | "remote.surface_changed"
  | "remote.command.requested"
  | "remote.command.confirmation_required"
  | "remote.command.confirmed"
  | "remote.command.cancelled"
  | "remote.command.executed"
  | "remote.command.blocked"
  | "remote.command.rate_limited"
  | "remote.command.failed"
  | "remote.input.voice_started"
  | "remote.input.voice_stopped"
  | "remote.input.gaze_started"
  | "remote.input.gaze_stopped"
  | "remote.emergency_stop"
  | "remote.settings.updated";

export interface RemoteEvent {
  id: string;
  type: RemoteEventType;
  userId?: string;
  sessionId?: string;
  surface?: RemoteSurface;
  mode?: RemoteMode;
  commandType?: RemoteCommandType;
  commandId?: string;
  commandStatus?: RemoteCommandStatus;
  inputSource?: RemoteInputSource;
  position?: RemotePosition;
  payload?: Record<string, unknown>;
  reason?: string;
  createdAt: string;
}

export type RemoteEventListener = (event: RemoteEvent) => void;

const listeners = new Set<RemoteEventListener>();

function newEventId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function emitRemoteEvent(event: Omit<RemoteEvent, "id" | "createdAt">): RemoteEvent {
  const fullEvent: RemoteEvent = {
    ...event,
    id: newEventId(),
    createdAt: new Date().toISOString(),
  };

  console.info("[iRemote:event]", fullEvent);

  listeners.forEach((listener) => {
    try {
      listener(fullEvent);
    } catch (error) {
      console.error("[iRemote:event-listener-error]", error);
    }
  });

  return fullEvent;
}

export function subscribeToRemoteEvents(listener: RemoteEventListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function emitRemoteOpened(surface: RemoteSurface, mode: RemoteMode) {
  return emitRemoteEvent({
    type: "remote.opened",
    surface,
    mode,
  });
}

export function emitRemoteClosed(surface: RemoteSurface) {
  return emitRemoteEvent({
    type: "remote.closed",
    surface,
  });
}

export function emitRemoteMoved(position: RemotePosition, surface: RemoteSurface) {
  return emitRemoteEvent({
    type: "remote.moved",
    surface,
    position,
  });
}

export function emitRemoteModeChanged(surface: RemoteSurface, from: RemoteMode, to: RemoteMode) {
  return emitRemoteEvent({
    type: "remote.mode_changed",
    surface,
    mode: to,
    payload: {
      from,
      to,
    },
  });
}

export function emitRemoteSurfaceChanged(from: RemoteSurface, to: RemoteSurface) {
  return emitRemoteEvent({
    type: "remote.surface_changed",
    surface: to,
    payload: {
      from,
      to,
    },
  });
}

export function emitRemoteLocked(surface: RemoteSurface) {
  return emitRemoteEvent({
    type: "remote.locked",
    surface,
  });
}

export function emitRemoteUnlocked(surface: RemoteSurface) {
  return emitRemoteEvent({
    type: "remote.unlocked",
    surface,
  });
}

export function emitRemoteEmergencyStop(surface: RemoteSurface) {
  return emitRemoteEvent({
    type: "remote.emergency_stop",
    surface,
    reason: "Emergency stop triggered.",
  });
}

export function emitRemoteCommandEvent(args: {
  command: RemoteCommand;
  status: RemoteCommandStatus;
  reason?: string;
  confirmationCopy?: string;
}) {
  const type = mapCommandStatusToEventType(args.status);

  return emitRemoteEvent({
    type,
    surface: args.command.surface,
    commandType: args.command.type,
    commandId: args.command.id,
    commandStatus: args.status,
    inputSource: args.command.inputSource,
    reason: args.reason,
    payload: {
      command: args.command,
      confirmationCopy: args.confirmationCopy,
    },
  });
}

export function emitRemoteSettingsUpdated(payload: Record<string, unknown>) {
  return emitRemoteEvent({
    type: "remote.settings.updated",
    payload,
  });
}

export function emitVoiceStarted(surface: RemoteSurface) {
  return emitRemoteEvent({
    type: "remote.input.voice_started",
    surface,
    inputSource: "voice",
  });
}

export function emitVoiceStopped(surface: RemoteSurface) {
  return emitRemoteEvent({
    type: "remote.input.voice_stopped",
    surface,
    inputSource: "voice",
  });
}

export function emitGazeStarted(surface: RemoteSurface) {
  return emitRemoteEvent({
    type: "remote.input.gaze_started",
    surface,
    inputSource: "gaze",
  });
}

export function emitGazeStopped(surface: RemoteSurface) {
  return emitRemoteEvent({
    type: "remote.input.gaze_stopped",
    surface,
    inputSource: "gaze",
  });
}

function mapCommandStatusToEventType(status: RemoteCommandStatus): RemoteEventType {
  switch (status) {
    case "requested":
      return "remote.command.requested";

    case "confirmation_required":
      return "remote.command.confirmation_required";

    case "confirmed":
      return "remote.command.confirmed";

    case "cancelled":
      return "remote.command.cancelled";

    case "executed":
      return "remote.command.executed";

    case "blocked":
      return "remote.command.blocked";

    case "rate_limited":
      return "remote.command.rate_limited";

    case "failed":
      return "remote.command.failed";

    case "ignored":
      return "remote.command.blocked";
  }
}
