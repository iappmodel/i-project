import { getRemoteCommandsByCategory, getRemoteCommandsForSurface } from "./remoteCommands";
import { useRemote } from "./useRemote";
import type {
  RemoteCommandCategory,
  RemoteCommandDefinition,
  RemoteCommandType,
  RemoteSurface,
} from "./types";

const CATEGORIES: RemoteCommandCategory[] = [
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
  navigation: "Navigation",
  content: "Content",
  earn: "Earn / Verification",
  wallet: "Wallet / Money",
  creator: "Studio / Creator",
  campaign: "Campaign",
  connector: "Connectors",
  presenter: "Presenter",
  safety: "Safety",
  system: "System",
};

export function RemoteCommandCenter() {
  const {
    remoteState,
    commandLog,
    pendingCommand,
    closeRemote,
    setRemoteMode,
    dispatchRemoteCommand,
    confirmPendingCommand,
    cancelPendingCommand,
    lockRemote,
    unlockRemote,
    emergencyStop,
  } = useRemote();

  if (remoteState.mode !== "command_center") {
    return null;
  }

  const allCommands = getRemoteCommandsForSurface(remoteState.surface);

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

    await dispatchRemoteCommand(type);
  }

  return (
    <div className="i-remote-center">
      <div className="i-remote-center__scrim" onClick={closeRemote} />

      <section className="i-remote-center__panel" aria-label="iRemote Command Center">
        <header className="i-remote-center__header">
          <div>
            <div className="i-remote-center__eyebrow">iRemote</div>
            <h2>Command Center</h2>
            <p>
              {formatSurface(remoteState.surface)} · {allCommands.length} commands available
            </p>
          </div>

          <button type="button" className="i-remote-center__close" onClick={closeRemote}>
            ×
          </button>
        </header>

        <div className="i-remote-center__status-grid">
          <StatusCard label="Surface" value={formatSurface(remoteState.surface)} />
          <StatusCard label="Mode" value={remoteState.mode} />
          <StatusCard label="Input" value={remoteState.inputSource} />
          <StatusCard
            label="Safety"
            value={
              remoteState.safety.requiresConfirmation
                ? "confirmation"
                : remoteState.safety.riskLevel
            }
            tone={remoteState.safety.requiresConfirmation ? "amber" : "green"}
          />
        </div>

        {remoteState.safety.reason ? (
          <div className="i-remote-center__notice">{remoteState.safety.reason}</div>
        ) : null}

        {Object.keys(remoteState.activeContext).length > 0 ? (
          <div className="i-remote-center__context">
            <div className="i-remote-center__section-title">Active Context</div>
            <pre>{JSON.stringify(remoteState.activeContext, null, 2)}</pre>
          </div>
        ) : null}

        {pendingCommand ? (
          <div className="i-remote-center__confirm">
            <div>
              <div className="i-remote-center__section-title">Confirmation Required</div>
              <h3>{pendingCommand.label}</h3>
              <p>{pendingCommand.description ?? "This command requires confirmation."}</p>
              <span>
                {pendingCommand.riskLevel} · {pendingCommand.inputSource}
              </span>
            </div>

            <div className="i-remote-center__confirm-actions">
              <button type="button" onClick={cancelPendingCommand}>
                Cancel
              </button>
              <button type="button" onClick={confirmPendingCommand}>
                Confirm
              </button>
            </div>
          </div>
        ) : null}

        <div className="i-remote-center__body">
          <main className="i-remote-center__commands">
            {CATEGORIES.map((category) => {
              const commands = getRemoteCommandsByCategory(remoteState.surface, category);

              if (commands.length === 0) return null;

              return (
                <CommandSection
                  key={category}
                  title={CATEGORY_LABELS[category]}
                  commands={commands}
                  onRun={run}
                />
              );
            })}
          </main>

          <aside className="i-remote-center__side">
            <div className="i-remote-center__section-title">Remote Safety</div>

            <div className="i-remote-center__safety-actions">
              {remoteState.isLocked ? (
                <button type="button" onClick={unlockRemote}>
                  Unlock Remote
                </button>
              ) : (
                <button type="button" onClick={lockRemote}>
                  Lock Remote
                </button>
              )}

              <button type="button" className="danger" onClick={emergencyStop}>
                Emergency Stop
              </button>

              <button type="button" onClick={() => setRemoteMode("settings")}>
                Settings
              </button>

              <button type="button" onClick={() => setRemoteMode("quick")}>
                Quick Panel
              </button>
            </div>

            <div className="i-remote-center__section-title log-title">Recent Commands</div>

            <div className="i-remote-center__log">
              {commandLog.length === 0 ? (
                <div className="i-remote-center__empty">No commands yet.</div>
              ) : (
                commandLog.slice(0, 12).map((item) => (
                  <div key={item.id} className="i-remote-log-item">
                    <div>
                      <strong>{item.label ?? formatCommandType(item.commandType)}</strong>
                      <span>{item.commandType}</span>
                    </div>
                    <em className={`status-${item.status}`}>{item.status}</em>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function StatusCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green" | "amber" | "rose";
}) {
  return (
    <div className={`i-remote-status-card ${tone ? `tone-${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CommandSection({
  title,
  commands,
  onRun,
}: {
  title: string;
  commands: RemoteCommandDefinition[];
  onRun: (type: RemoteCommandType) => void;
}) {
  return (
    <section className="i-remote-command-section">
      <div className="i-remote-center__section-title">{title}</div>

      <div className="i-remote-command-section__grid">
        {commands.map((command) => (
          <button
            key={command.type}
            type="button"
            className={[
              "i-remote-center-command",
              `risk-${command.riskLevel.toLowerCase()}`,
            ].join(" ")}
            onClick={() => onRun(command.type)}
          >
            <span>{command.label}</span>
            <small>{command.type}</small>
            <em>{command.riskLevel}</em>
          </button>
        ))}
      </div>
    </section>
  );
}

function formatSurface(surface: RemoteSurface) {
  return surface
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCommandType(commandType: RemoteCommandType) {
  return commandType
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
