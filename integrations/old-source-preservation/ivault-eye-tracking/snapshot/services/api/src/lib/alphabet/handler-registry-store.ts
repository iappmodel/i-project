import type {
  HandlerDefinitionRecord,
  HandlerHealth,
  HandlerPermissionLevel,
  HandlerRegistryEvaluationResult,
  HandlerRegistrySignalInput,
  HandlerRiskClass,
  HandlerRuntimeMode,
  HandlerSchemaContract,
  HandlerStatus
} from "../../types/alphabet/handler-registry.types";
import type {
  ExecutionAction,
  ExecutionTargetSystem
} from "../../types/alphabet/execution-router.types";
import { evaluateHandlerRegistry } from "./handler-registry-engine";

type HandlerRegistryStoreState = {
  definitions: Map<string, HandlerDefinitionRecord>;
  results: Map<string, HandlerRegistryEvaluationResult>;
};

const store: HandlerRegistryStoreState = {
  definitions: new Map(),
  results: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function registerHandlerDefinition(params: {
  handlerName: string;
  handlerVersion?: string;
  targetSystem: ExecutionTargetSystem;
  action: ExecutionAction;
  status?: HandlerStatus;
  health?: HandlerHealth;
  runtimeMode?: HandlerRuntimeMode;
  permissionLevel?: HandlerPermissionLevel;
  riskClass?: HandlerRiskClass;
  schema: HandlerSchemaContract;
  idempotencyRequired?: boolean;
  auditRequired?: boolean;
  retrySupported?: boolean;
  timeoutMs?: number;
  ownerTeam: string;
}): HandlerDefinitionRecord {
  const now = nowIso();
  const record: HandlerDefinitionRecord = {
    handlerDefinitionId: createId("handler_definition"),
    handlerName: params.handlerName,
    handlerVersion: params.handlerVersion ?? "v1",
    targetSystem: params.targetSystem,
    action: params.action,
    status: params.status ?? "active",
    health: params.health ?? "healthy",
    runtimeMode: params.runtimeMode ?? "queue",
    permissionLevel: params.permissionLevel ?? "internal",
    riskClass: params.riskClass ?? "medium",
    schema: params.schema,
    idempotencyRequired: params.idempotencyRequired ?? false,
    auditRequired: params.auditRequired ?? false,
    retrySupported: params.retrySupported ?? true,
    timeoutMs: params.timeoutMs ?? 30_000,
    ownerTeam: params.ownerTeam,
    createdAt: now,
    updatedAt: now,
    deprecatedAt: null,
    disabledAt: null
  };

  store.definitions.set(record.handlerDefinitionId, record);
  return record;
}

export function getHandlerDefinition(
  handlerDefinitionId: string
): HandlerDefinitionRecord | null {
  return store.definitions.get(handlerDefinitionId) ?? null;
}

export function findHandlerDefinition(params: {
  targetSystem: ExecutionTargetSystem;
  action: ExecutionAction;
  handlerVersion?: string;
}): HandlerDefinitionRecord | null {
  const candidates = Array.from(store.definitions.values()).filter(
    (handler) =>
      handler.targetSystem === params.targetSystem &&
      handler.action === params.action &&
      (!params.handlerVersion || handler.handlerVersion === params.handlerVersion)
  );

  return (
    candidates.find((handler) => handler.status === "active" && handler.health === "healthy") ??
    candidates[0] ??
    null
  );
}

export function findHandlerByName(params: {
  handlerName: string;
  handlerVersion?: string;
}): HandlerDefinitionRecord | null {
  return (
    Array.from(store.definitions.values()).find(
      (handler) =>
        handler.handlerName === params.handlerName &&
        (!params.handlerVersion || handler.handlerVersion === params.handlerVersion)
    ) ?? null
  );
}

export function updateHandlerHealth(params: {
  handlerDefinitionId: string;
  health: HandlerHealth;
}): HandlerDefinitionRecord {
  const handler = getHandlerDefinition(params.handlerDefinitionId);
  if (!handler) throw new Error("Handler definition not found.");

  const next: HandlerDefinitionRecord = {
    ...handler,
    health: params.health,
    updatedAt: nowIso()
  };
  store.definitions.set(next.handlerDefinitionId, next);
  return next;
}

export function deprecateHandler(handlerDefinitionId: string): HandlerDefinitionRecord {
  const handler = getHandlerDefinition(handlerDefinitionId);
  if (!handler) throw new Error("Handler definition not found.");

  const now = nowIso();
  const next: HandlerDefinitionRecord = {
    ...handler,
    status: "deprecated",
    deprecatedAt: now,
    updatedAt: now
  };
  store.definitions.set(next.handlerDefinitionId, next);
  return next;
}

export function disableHandler(handlerDefinitionId: string): HandlerDefinitionRecord {
  const handler = getHandlerDefinition(handlerDefinitionId);
  if (!handler) throw new Error("Handler definition not found.");

  const now = nowIso();
  const next: HandlerDefinitionRecord = {
    ...handler,
    status: "disabled",
    disabledAt: now,
    updatedAt: now
  };
  store.definitions.set(next.handlerDefinitionId, next);
  return next;
}

export function evaluateStoredHandler(
  input: Omit<
    HandlerRegistrySignalInput,
    | "handlerDefinitionId"
    | "handlerName"
    | "handlerVersion"
    | "targetSystem"
    | "action"
    | "status"
    | "health"
    | "runtimeMode"
    | "permissionLevel"
    | "riskClass"
    | "schema"
    | "idempotencyRequired"
    | "auditRequired"
    | "retrySupported"
    | "timeoutMs"
    | "ownerTeam"
  > & {
    handlerDefinitionId: string;
  }
): HandlerRegistryEvaluationResult {
  const handler = getHandlerDefinition(input.handlerDefinitionId);
  if (!handler) throw new Error("Handler definition not found.");

  const result = evaluateHandlerRegistry({
    ...input,
    handlerDefinitionId: handler.handlerDefinitionId,
    handlerName: handler.handlerName,
    handlerVersion: handler.handlerVersion,
    targetSystem: handler.targetSystem,
    action: handler.action,
    status: handler.status,
    health: handler.health,
    runtimeMode: handler.runtimeMode,
    permissionLevel: handler.permissionLevel,
    riskClass: handler.riskClass,
    schema: handler.schema,
    idempotencyRequired: handler.idempotencyRequired,
    auditRequired: handler.auditRequired,
    retrySupported: handler.retrySupported,
    timeoutMs: handler.timeoutMs,
    ownerTeam: handler.ownerTeam,
    metadata: {
      ...input.metadata
    }
  });

  store.results.set(result.handlerDefinitionId, result);
  return result;
}

export function listHandlerDefinitions(params?: {
  targetSystem?: ExecutionTargetSystem;
  action?: ExecutionAction;
  status?: HandlerStatus;
  permissionLevel?: HandlerPermissionLevel;
}): HandlerDefinitionRecord[] {
  return Array.from(store.definitions.values()).filter((handler) => {
    if (params?.targetSystem && handler.targetSystem !== params.targetSystem) return false;
    if (params?.action && handler.action !== params.action) return false;
    if (params?.status && handler.status !== params.status) return false;
    if (params?.permissionLevel && handler.permissionLevel !== params.permissionLevel) return false;
    return true;
  });
}

export function getHandlerEvaluationResult(
  handlerDefinitionId: string
): HandlerRegistryEvaluationResult | null {
  return store.results.get(handlerDefinitionId) ?? null;
}

export function resetHandlerRegistryStoreForTests(): void {
  store.definitions.clear();
  store.results.clear();
}
