import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  commandResultToLogItem,
  confirmRemoteCommand,
  createRemoteCommand,
  routeRemoteCommand,
} from "./remoteRouter";
import { DEFAULT_REMOTE_POLICY_CONTEXT } from "./remotePolicy";
import {
  emitRemoteClosed,
  emitRemoteCommandEvent,
  emitRemoteEmergencyStop,
  emitRemoteLocked,
  emitRemoteModeChanged,
  emitRemoteMoved,
  emitRemoteOpened,
  emitRemoteSettingsUpdated,
  emitRemoteSurfaceChanged,
  emitRemoteUnlocked,
} from "./remoteEvents";
import type {
  RemoteActiveContext,
  RemoteCommand,
  RemoteCommandHandlerMap,
  RemoteCommandLogItem,
  RemoteCommandType,
  RemoteControlState,
  RemoteInputSource,
  RemoteMode,
  RemotePosition,
  RemotePreferences,
  RemoteProviderValue,
  RemoteRouteResult,
  RemoteSurface,
  RemoteUserPolicyContext,
} from "./types";

const REMOTE_POSITION_STORAGE_KEY = "i.remote.position";
const REMOTE_PREFERENCES_STORAGE_KEY = "i.remote.preferences";
const MAX_COMMAND_LOG_ITEMS = 80;

const DEFAULT_POSITION: RemotePosition = {
  x: 0.88,
  y: 0.78,
  anchor: "bottom-right",
};

const DEFAULT_REMOTE_STATE: RemoteControlState = {
  mode: "collapsed",
  surface: "unknown",
  inputSource: "touch",
  visualState: "idle",
  activeContext: {},
  isDragging: false,
  isListening: false,
  isGazeEnabled: false,
  isVoiceEnabled: false,
  isLocked: false,
  lastCommandAt: undefined,
  lastCommandType: undefined,
  position: DEFAULT_POSITION,
  safety: {
    riskLevel: "LOW",
    requiresConfirmation: false,
  },
};

const DEFAULT_PREFERENCES: RemotePreferences = {
  defaultPosition: DEFAULT_POSITION,
  size: "medium",
  opacity: 0.92,
  hapticsEnabled: true,
  voiceEnabled: false,
  gazeEnabled: false,
  reducedMotion: false,
  strictConfirmations: true,
  leftHanded: false,
};

const RemoteContext = createContext<RemoteProviderValue | null>(null);

export interface RemoteProviderProps extends PropsWithChildren {
  userPolicy?: Partial<RemoteUserPolicyContext>;
  initialSurface?: RemoteSurface;
  initialContext?: RemoteActiveContext;
}

export function RemoteProvider(props: RemoteProviderProps) {
  const {
    children,
    userPolicy,
    initialSurface = "unknown",
    initialContext = {},
  } = props;
  const handlersRef = useRef<RemoteCommandHandlerMap>({});

  const [preferences, setPreferences] = useState<RemotePreferences>(() =>
    loadRemotePreferences()
  );

  const [remoteState, setRemoteState] = useState<RemoteControlState>(() => ({
    ...DEFAULT_REMOTE_STATE,
    surface: initialSurface,
    activeContext: initialContext,
    position: loadRemotePosition() ?? preferences.defaultPosition,
    isVoiceEnabled: preferences.voiceEnabled,
    isGazeEnabled: preferences.gazeEnabled,
  }));

  const [commandLog, setCommandLog] = useState<RemoteCommandLogItem[]>([]);
  const [pendingCommand, setPendingCommand] = useState<RemoteCommand | null>(null);

  const resolvedUserPolicy: RemoteUserPolicyContext = useMemo(
    () => ({
      ...DEFAULT_REMOTE_POLICY_CONTEXT,
      ...userPolicy,
    }),
    [userPolicy]
  );

  const appendCommandLog = useCallback((item: RemoteCommandLogItem) => {
    setCommandLog((current) => [item, ...current].slice(0, MAX_COMMAND_LOG_ITEMS));
  }, []);

  const setRemoteSurface = useCallback(
    (surface: RemoteSurface, activeContext: RemoteActiveContext = {}) => {
      setRemoteState((current: RemoteControlState) => {
        emitRemoteSurfaceChanged(current.surface, surface);

        return {
          ...current,
          surface,
          activeContext,
        };
      });
    },
    []
  );

  const setRemoteMode = useCallback((mode: RemoteMode) => {
    setRemoteState((current: RemoteControlState) => {
      if (current.mode !== mode) {
        emitRemoteModeChanged(current.surface, current.mode, mode);
      }

      return {
        ...current,
        mode,
      };
    });
  }, []);

  const setRemotePosition = useCallback((position: RemotePosition) => {
    saveRemotePosition(position);

    setRemoteState((current: RemoteControlState) => {
      emitRemoteMoved(position, current.surface);

      return {
        ...current,
        position,
      };
    });
  }, []);

  const openRemote = useCallback(() => {
    setRemoteState((current: RemoteControlState) => {
      const nextMode: RemoteMode = current.isLocked ? "locked" : "quick";
      emitRemoteOpened(current.surface, nextMode);

      return {
        ...current,
        mode: nextMode,
      };
    });
  }, []);

  const closeRemote = useCallback(() => {
    setRemoteState((current: RemoteControlState) => {
      emitRemoteClosed(current.surface);

      return {
        ...current,
        mode: "collapsed",
      };
    });
  }, []);

  const openCommandCenter = useCallback(() => {
    setRemoteState((current: RemoteControlState) => {
      emitRemoteOpened(current.surface, "command_center");

      return {
        ...current,
        mode: "command_center",
      };
    });
  }, []);

  const openSettings = useCallback(() => {
    setRemoteState((current: RemoteControlState) => {
      emitRemoteOpened(current.surface, "settings");

      return {
        ...current,
        mode: "settings",
      };
    });
  }, []);

  const lockRemote = useCallback(() => {
    setRemoteState((current: RemoteControlState) => {
      emitRemoteLocked(current.surface);

      return {
        ...current,
        isLocked: true,
        mode: "locked",
        visualState: "locked",
      };
    });
  }, []);

  const unlockRemote = useCallback(() => {
    setRemoteState((current: RemoteControlState) => {
      emitRemoteUnlocked(current.surface);

      return {
        ...current,
        isLocked: false,
        mode: "quick",
        visualState: "idle",
      };
    });
  }, []);

  const emergencyStop = useCallback(() => {
    setPendingCommand(null);

    setRemoteState((current: RemoteControlState) => {
      emitRemoteEmergencyStop(current.surface);

      return {
        ...current,
        mode: "collapsed",
        visualState: "danger",
        isListening: false,
        inputSource: "touch",
        safety: {
          riskLevel: "LOW",
          requiresConfirmation: false,
          reason: "Emergency stop triggered.",
        },
      };
    });
  }, []);

  const builtinCommandHandlers = useMemo<RemoteCommandHandlerMap>(
    () => ({
      UNLOCK_REMOTE: async () => {
        setRemoteState((current: RemoteControlState) => {
          emitRemoteUnlocked(current.surface);
          return {
            ...current,
            isLocked: false,
            mode: "quick",
            visualState: "idle",
          };
        });
      },
      OPEN_COMMAND_CENTER: async () => {
        setRemoteState((current: RemoteControlState) => {
          emitRemoteOpened(current.surface, "command_center");
          return { ...current, mode: "command_center" };
        });
      },
      OPEN_REMOTE_SETTINGS: async () => {
        setRemoteState((current: RemoteControlState) => {
          emitRemoteOpened(current.surface, "settings");
          return { ...current, mode: "settings" };
        });
      },
      REVEAL_METADATA: async () => {
        setRemoteState((current: RemoteControlState) => ({
          ...current,
          activeContext: { ...current.activeContext, metadataRevealed: true },
        }));
      },
      OPEN_PENDING: async () => {
        setRemoteState((current: RemoteControlState) => ({
          ...current,
          surface: "pending",
          visualState: "pending",
        }));
      },
    }),
    []
  );

  const dispatchRemoteCommand = useCallback(
    async (
      type: RemoteCommandType,
      payload?: Record<string, unknown>,
      inputSource?: RemoteInputSource
    ): Promise<RemoteRouteResult> => {
      const command = createRemoteCommand({
        type,
        state: remoteState,
        payload,
        inputSource,
      });

      emitRemoteCommandEvent({
        command,
        status: "requested",
      });

      const mergedHandlers: RemoteCommandHandlerMap = {
        ...builtinCommandHandlers,
        ...handlersRef.current,
      };

      const result = await routeRemoteCommand({
        command,
        state: remoteState,
        userPolicy: resolvedUserPolicy,
        handlers: mergedHandlers,
      });

      emitRemoteCommandEvent({
        command,
        status: result.status,
        reason: result.reason,
        confirmationCopy: result.confirmationCopy,
      });

      appendCommandLog(commandResultToLogItem(result));

      setRemoteState((current: RemoteControlState) => ({
        ...current,
        lastCommandAt: new Date().toISOString(),
        lastCommandType: type,
        safety: {
          riskLevel: command.riskLevel,
          requiresConfirmation: result.status === "confirmation_required",
          reason: result.reason,
        },
      }));

      if (result.status === "confirmation_required") {
        setPendingCommand(command);
      }

      return result;
    },
    [appendCommandLog, builtinCommandHandlers, remoteState, resolvedUserPolicy]
  );

  const confirmPendingCommand = useCallback(async () => {
    if (!pendingCommand) {
      return null;
    }

    emitRemoteCommandEvent({
      command: pendingCommand,
      status: "confirmed",
    });

    const mergedHandlers: RemoteCommandHandlerMap = {
      ...builtinCommandHandlers,
      ...handlersRef.current,
    };

    const result = await confirmRemoteCommand({
      command: pendingCommand,
      handlers: mergedHandlers,
    });

    emitRemoteCommandEvent({
      command: pendingCommand,
      status: result.status,
      reason: result.reason,
    });

    appendCommandLog(commandResultToLogItem(result));
    setPendingCommand(null);

    setRemoteState((current: RemoteControlState) => ({
      ...current,
      lastCommandAt: new Date().toISOString(),
      lastCommandType: pendingCommand.type,
      safety: {
        riskLevel: pendingCommand.riskLevel,
        requiresConfirmation: false,
        reason: result.reason,
      },
    }));

    return result;
  }, [appendCommandLog, builtinCommandHandlers, pendingCommand]);

  const cancelPendingCommand = useCallback(() => {
    if (pendingCommand) {
      emitRemoteCommandEvent({
        command: pendingCommand,
        status: "cancelled",
      });
    }

    setPendingCommand(null);

    setRemoteState((current: RemoteControlState) => ({
      ...current,
      safety: {
        riskLevel: "LOW",
        requiresConfirmation: false,
      },
    }));
  }, [pendingCommand]);

  const registerRemoteHandlers = useCallback((handlers: RemoteCommandHandlerMap) => {
    handlersRef.current = {
      ...handlersRef.current,
      ...handlers,
    };
  }, []);

  const updatePreferences = useCallback((patch: Partial<RemotePreferences>) => {
    setPreferences((current) => {
      const next = {
        ...current,
        ...patch,
      };

      saveRemotePreferences(next);
      emitRemoteSettingsUpdated(patch as Record<string, unknown>);

      setRemoteState((state: RemoteControlState) => ({
        ...state,
        isVoiceEnabled: next.voiceEnabled,
        isGazeEnabled: next.gazeEnabled,
        position: patch.defaultPosition ?? state.position,
      }));

      return next;
    });
  }, []);

  const value: RemoteProviderValue = useMemo(
    () => ({
      remoteState,
      commandLog,
      pendingCommand,
      preferences,

      setRemoteSurface,
      setRemoteMode,
      setRemotePosition,

      openRemote,
      closeRemote,
      openCommandCenter,
      openSettings,

      lockRemote,
      unlockRemote,
      emergencyStop,

      dispatchRemoteCommand,
      confirmPendingCommand,
      cancelPendingCommand,

      registerRemoteHandlers,
      updatePreferences,
    }),
    [
      remoteState,
      commandLog,
      pendingCommand,
      preferences,
      setRemoteSurface,
      setRemoteMode,
      setRemotePosition,
      openRemote,
      closeRemote,
      openCommandCenter,
      openSettings,
      lockRemote,
      unlockRemote,
      emergencyStop,
      dispatchRemoteCommand,
      confirmPendingCommand,
      cancelPendingCommand,
      registerRemoteHandlers,
      updatePreferences,
    ]
  );

  return <RemoteContext.Provider value={value}>{children}</RemoteContext.Provider>;
}

export function useRemoteContext(): RemoteProviderValue {
  const context = useContext(RemoteContext);

  if (!context) {
    throw new Error("useRemote must be used inside <RemoteProvider>.");
  }

  return context;
}

function loadRemotePosition(): RemotePosition | null {
  try {
    const raw = window.localStorage.getItem(REMOTE_POSITION_STORAGE_KEY);
    if (!raw) return null;

    return JSON.parse(raw) as RemotePosition;
  } catch {
    return null;
  }
}

function saveRemotePosition(position: RemotePosition) {
  try {
    window.localStorage.setItem(
      REMOTE_POSITION_STORAGE_KEY,
      JSON.stringify(position)
    );
  } catch {
    // Ignore storage failure.
  }
}

function loadRemotePreferences(): RemotePreferences {
  try {
    const raw = window.localStorage.getItem(REMOTE_PREFERENCES_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;

    return {
      ...DEFAULT_PREFERENCES,
      ...(JSON.parse(raw) as Partial<RemotePreferences>),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function saveRemotePreferences(preferences: RemotePreferences) {
  try {
    window.localStorage.setItem(
      REMOTE_PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences)
    );
  } catch {
    // Ignore storage failure.
  }
}
