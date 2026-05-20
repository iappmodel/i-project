import {
  buildConfirmationCopy,
  evaluateRemotePermission,
  isHighRiskCommandType,
} from "./remotePolicy";
import type {
  RemoteCommand,
  RemoteCommandHandlerMap,
  RemoteCommandLogItem,
  RemoteCommandType,
  RemoteControlState,
  RemoteInputSource,
  RemoteRiskLevel,
  RemoteRouteResult,
  RemoteRouteStatus,
  RemoteUserPolicyContext,
} from "./types";

const rateHits = new Map<string, number[]>();
const RATE_WINDOW_MS = 10_000;
const RATE_MAX = 24;

function isRateLimited(commandType: RemoteCommandType): boolean {
  const now = Date.now();
  const list = rateHits.get(commandType) ?? [];
  const fresh = list.filter((t) => now - t < RATE_WINDOW_MS);
  rateHits.set(commandType, fresh);
  return fresh.length >= RATE_MAX;
}

function recordHit(commandType: RemoteCommandType): void {
  const now = Date.now();
  const list = rateHits.get(commandType) ?? [];
  list.push(now);
  rateHits.set(commandType, list);
}

function inferRiskLevel(type: RemoteCommandType): RemoteRiskLevel {
  if (isHighRiskCommandType(type)) return "HIGH";
  return "LOW";
}

function humanLabel(type: RemoteCommandType): string {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function createRemoteCommand(params: {
  type: RemoteCommandType;
  state: RemoteControlState;
  payload?: Record<string, unknown>;
  inputSource?: RemoteInputSource;
}): RemoteCommand {
  const inputSource = params.inputSource ?? params.state.inputSource;
  const riskLevel = inferRiskLevel(params.type);
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type: params.type,
    label: humanLabel(params.type),
    surface: params.state.surface,
    riskLevel,
    inputSource,
    payload: {
      ...params.state.activeContext,
      ...params.payload,
    },
    requiresConfirmation: riskLevel === "HIGH",
  };
}

export async function routeRemoteCommand(params: {
  command: RemoteCommand;
  state: RemoteControlState;
  userPolicy: RemoteUserPolicyContext;
  handlers: RemoteCommandHandlerMap;
}): Promise<RemoteRouteResult> {
  const { command, state, userPolicy, handlers } = params;

  if (command.riskLevel === "BLOCKED" || command.disabledReason) {
    return {
      status: "blocked",
      reason: command.disabledReason ?? "Command is blocked.",
      command,
    };
  }

  if (isRateLimited(command.type)) {
    return { status: "rate_limited", reason: "Too many commands. Slow down.", command };
  }

  const permission = evaluateRemotePermission(command, userPolicy, state.isLocked);
  if (!permission.allowed) {
    return { status: "blocked", reason: permission.reason, command };
  }

  const mustConfirm =
    permission.requiresConfirmation &&
    (command.riskLevel === "HIGH" || command.riskLevel === "MEDIUM");

  if (mustConfirm) {
    return {
      status: "confirmation_required",
      confirmationCopy: buildConfirmationCopy(command),
      command,
    };
  }

  const handler = handlers[command.type];
  if (!handler) {
    return {
      status: "ignored",
      reason: "No handler registered for this command.",
      command,
    };
  }

  recordHit(command.type);
  await handler(command);
  return { status: "executed", command };
}

/** Same pipeline as {@link routeRemoteCommand} (barrel / external API name). */
export const executeRemoteCommand = routeRemoteCommand;

export async function confirmRemoteCommand(params: {
  command: RemoteCommand;
  handlers: RemoteCommandHandlerMap;
}): Promise<RemoteRouteResult> {
  const handler = params.handlers[params.command.type];
  if (!handler) {
    return {
      status: "ignored",
      reason: "No handler registered for this command.",
      command: params.command,
    };
  }

  recordHit(params.command.type);
  await handler(params.command);
  return { status: "executed", command: params.command };
}

export function commandResultToLogItem(result: RemoteRouteResult): RemoteCommandLogItem {
  const cmd = result.command;
  const at = new Date().toISOString();
  return {
    id: cmd?.id ?? `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    commandType: cmd?.type ?? "UNKNOWN",
    label: cmd?.label,
    status: result.status,
    at,
    reason: result.reason,
  };
}

export function buildRemoteCommandLogItem(
  command: RemoteCommand,
  status: RemoteRouteStatus,
  reason?: string
): RemoteCommandLogItem {
  return {
    id: command.id,
    commandType: command.type,
    label: command.label,
    status,
    at: new Date().toISOString(),
    reason,
  };
}

export function clearRemoteRateLimitMemory(): void {
  rateHits.clear();
}
