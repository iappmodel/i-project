import { getRemoteCommandsForSurface } from "./remoteCommands";
import { useRemote } from "./useRemote";
import type {
  RemoteCommandCategory,
  RemoteCommandDefinition,
  RemoteCommandType,
  RemoteSurface,
} from "./types";

const PRIMARY_COMMAND_BY_SURFACE: Partial<
  Record<RemoteSurface, RemoteCommandType>
> = {
  feed: "START_WATCH",
  immersive_feed: "START_WATCH",
  watch: "START_VERIFICATION",
  verification: "RELEASE_REWARD",
  wallet: "WITHDRAW",
  earn: "OPEN_OFFER",
  pending: "OPEN_PENDING",
  pay: "PAY",
  withdraw: "WITHDRAW",
  convert: "CONVERT_COINS",
  tip: "TIP",
  studio: "EXPORT_MEDIA",
  campaign_builder: "PUBLISH_CAMPAIGN",
  connect_platforms: "CONNECT_PLATFORM",
  presenter: "NEXT_ITEM",
};

const CATEGORY_ORDER: RemoteCommandCategory[] = [
  "navigation",
  "content",
  "earn",
  "wallet",
  "creator",
  "campaign",
  "connector",
  "presenter",
  "safety",
  "system",
];

const CATEGORY_LABELS: Record<RemoteCommandCategory, string> = {
  navigation: "Move",
  content: "Content",
  earn: "Earn",
  wallet: "Wallet",
  creator: "Studio",
  campaign: "Campaign",
  connector: "Connect",
  presenter: "Presenter",
  safety: "Safety",
  system: "System",
};

export function RemoteQuickPanel() {
  const {
    remoteState,
    pendingCommand,
    closeRemote,
    openCommandCenter,
    openSettings,
    lockRemote,
    unlockRemote,
    emergencyStop,
    dispatchRemoteCommand,
    confirmPendingCommand,
    cancelPendingCommand,
  } = useRemote();

  if (remoteState.mode !== "quick" && remoteState.mode !== "locked") {
    return null;
  }

  const commands = getRemoteCommandsForSurface(remoteState.surface);
  const primaryType = PRIMARY_COMMAND_BY_SURFACE[remoteState.surface];
  const primaryCommand = primaryType
    ? commands.find((command) => command.type === primaryType)
    : undefined;

  const visibleCommands = compactCommands(commands, primaryCommand?.type);

  async function run(type: RemoteCommandType) {
    if (type === "LOCK_REMOTE") {
      lockRemote();
      return;
    }

    if (type === "UNLOCK_REMOTE") {
      unlockRemote();
      return;
    }

    if (type === "EMERGENCY_STOP") {
      emergencyStop();
      return;
    }

    if (type === "OPEN_COMMAND_CENTER") {
      openCommandCenter();
      return;
    }

    if (type === "OPEN_REMOTE_SETTINGS") {
      openSettings();
      return;
    }

    await dispatchRemoteCommand(type);
  }

  if (remoteState.mode === "locked") {
    return (
      <div className="i-remote-panel i-remote-panel--locked">
        <div className="i-remote-panel__top">
          <div>
            <div className="i-remote-panel__eyebrow">iRemote</div>
            <div className="i-remote-panel__title">Locked</div>
          </div>
          <button type="button" className="i-remote-panel__ghost" onClick={closeRemote}>
            ×
          </button>
        </div>

        <p className="i-remote-panel__note">
          Remote actions are paused. Unlock to continue.
        </p>

        <button type="button" className="i-remote-panel__primary" onClick={unlockRemote}>
          Unlock Remote
        </button>

        <button type="button" className="i-remote-panel__danger" onClick={emergencyStop}>
          Emergency Stop
        </button>
      </div>
    );
  }

  return (
    <div className="i-remote-panel">
      <div className="i-remote-panel__top">
        <div>
          <div className="i-remote-panel__eyebrow">iRemote</div>
          <div className="i-remote-panel__title">{formatSurface(remoteState.surface)}</div>
        </div>

        <button type="button" className="i-remote-panel__ghost" onClick={closeRemote}>
          ×
        </button>
      </div>

      {pendingCommand ? (
        <div className="i-remote-confirm">
          <div className="i-remote-confirm__label">Confirm action</div>
          <div className="i-remote-confirm__title">{pendingCommand.label}</div>
          <div className="i-remote-confirm__meta">
            {pendingCommand.riskLevel} · {pendingCommand.inputSource}
          </div>

          <div className="i-remote-confirm__actions">
            <button type="button" onClick={cancelPendingCommand}>
              Cancel
            </button>
            <button type="button" onClick={() => void confirmPendingCommand()}>
              Confirm
            </button>
          </div>
        </div>
      ) : null}

      {primaryCommand && !pendingCommand ? (
        <button
          type="button"
          className={[
            "i-remote-panel__primary",
            primaryCommand.riskLevel === "HIGH" ? "high-risk" : "",
          ].join(" ")}
          onClick={() => void run(primaryCommand.type)}
        >
          <span>{primaryCommand.label}</span>
          <small>{primaryCommand.riskLevel}</small>
        </button>
      ) : null}

      <div className="i-remote-panel__grid">
        {visibleCommands.map((command) => (
          <CommandButton
            key={command.type}
            command={command}
            onClick={() => void run(command.type)}
          />
        ))}
      </div>

      <div className="i-remote-panel__footer">
        <button type="button" onClick={openCommandCenter}>
          Command Center
        </button>
        <button type="button" onClick={openSettings}>
          Settings
        </button>
        <button type="button" onClick={lockRemote}>
          Lock
        </button>
      </div>
    </div>
  );
}

function CommandButton({
  command,
  onClick,
}: {
  command: RemoteCommandDefinition;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        "i-remote-command",
        `cat-${command.category}`,
        command.riskLevel === "HIGH" ? "risk-high" : "",
        command.riskLevel === "MEDIUM" ? "risk-medium" : "",
      ].join(" ")}
      onClick={onClick}
      title={command.description}
    >
      <span className="i-remote-command__label">{command.label}</span>
      <span className="i-remote-command__meta">
        {CATEGORY_LABELS[command.category]} · {command.riskLevel}
      </span>
    </button>
  );
}

function compactCommands(
  commands: RemoteCommandDefinition[],
  primaryType?: RemoteCommandType
): RemoteCommandDefinition[] {
  const withoutPrimary = commands.filter((command) => command.type !== primaryType);

  const preferred: RemoteCommandType[] = [
    "GO_BACK",
    "NEXT_ITEM",
    "PREVIOUS_ITEM",
    "REVEAL_METADATA",
    "HIDE_METADATA",
    "LIKE_CONTENT",
    "SAVE_CONTENT",
    "OPEN_WALLET",
    "OPEN_PENDING",
    "GO_EARN",
    "VIEW_REQUIREMENTS",
    "PLAY_PREVIEW",
    "PAUSE_PREVIEW",
    "UNDO_EDIT",
    "REDO_EDIT",
    "OPEN_STUDIO",
    "OPEN_CAMPAIGN_BUILDER",
    "OPEN_CONNECTORS",
    "CANCEL_ACTION",
    "EMERGENCY_STOP",
  ];

  const ranked = [...withoutPrimary].sort((a, b) => {
    const ai = preferred.indexOf(a.type);
    const bi = preferred.indexOf(b.type);

    if (ai === -1 && bi === -1) {
      return CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    }

    if (ai === -1) return 1;
    if (bi === -1) return -1;

    return ai - bi;
  });

  return ranked.slice(0, 9);
}

function formatSurface(surface: string) {
  return surface
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
